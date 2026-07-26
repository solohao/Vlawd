import { useMemo, useState, useEffect } from "react";
import { Button, StatusDot } from "../../design-system/index.js";

export interface CustomEndpoint {
  id: string;
  name: string;
  url: string;
  model: string;
  apiKey?: string;
  protocol?: 'openai' | 'anthropic';
  type: 'openai-compatible' | 'custom';
  enabled: boolean;
}

interface Preset {
  id: 'openai' | 'claude' | 'custom';
  name: string;
  description: string;
  url: string;
  protocol: 'openai' | 'anthropic';
  type: 'openai-compatible' | 'custom';
  modelOptions: string[];
  defaultModel: string;
}

const PRESETS: Preset[] = [
  {
    id: 'openai',
    name: 'OpenAI Cloud',
    description: '官方 OpenAI API（gpt-4o / gpt-4o-mini 等）',
    url: 'https://api.openai.com/v1',
    protocol: 'openai',
    type: 'openai-compatible',
    modelOptions: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini'
  },
  {
    id: 'claude',
    name: 'Claude Cloud',
    description: 'Anthropic Claude API（claude-3-5-sonnet 等）',
    url: 'https://api.anthropic.com/v1',
    protocol: 'anthropic',
    type: 'openai-compatible',
    modelOptions: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-3-5-sonnet-20241022'
  },
  {
    id: 'custom',
    name: '自定义 OpenAI 兼容端点',
    description: 'vLLM、llama.cpp server、one-api、litellm 等',
    url: '',
    protocol: 'openai',
    type: 'custom',
    modelOptions: [],
    defaultModel: ''
  }
];

interface RemoteProviderTableProps {
  endpoints: CustomEndpoint[];
  onAddEndpoint: (endpoint: Omit<CustomEndpoint, 'id'>) => void;
  onDeleteEndpoint: (id: string) => void;
}

export function RemoteProviderTable({
  endpoints,
  onAddEndpoint,
  onDeleteEndpoint
}: RemoteProviderTableProps) {
  const matches = useMemo(() => {
    const map = new Map<Preset['id'], CustomEndpoint | undefined>();
    for (const preset of PRESETS) {
      map.set(
        preset.id,
        endpoints.find((ep) =>
          preset.id === 'custom'
            ? ep.type === 'custom' || !PRESETS.some((p) => p.url === ep.url && p.protocol === ep.protocol)
            : ep.url === preset.url && ep.protocol === preset.protocol
        )
      );
    }
    return map;
  }, [endpoints]);

  const initialSelected = useMemo(() => {
    for (const preset of PRESETS) {
      if (matches.get(preset.id)) return preset.id;
    }
    return 'openai' as const;
  }, [matches]);

  const [selected, setSelected] = useState<Preset['id']>(initialSelected);

  useEffect(() => {
    const active = endpoints.find((e) => e.enabled) ?? endpoints[0];
    if (active) {
      const preset = PRESETS.find((p) =>
        p.id === 'custom'
          ? active.type === 'custom' || !PRESETS.some((pre) => pre.url === active.url && pre.protocol === active.protocol)
          : active.url === p.url && active.protocol === p.protocol
      );
      if (preset) setSelected(preset.id);
    }
  }, [endpoints]);

  const [form, setForm] = useState<Record<Preset['id'], { apiKey: string; model: string; url: string; protocol: 'openai' | 'anthropic' }>>(() => ({
    openai: { apiKey: '', model: PRESETS[0].defaultModel, url: PRESETS[0].url, protocol: 'openai' },
    claude: { apiKey: '', model: PRESETS[1].defaultModel, url: PRESETS[1].url, protocol: 'anthropic' },
    custom: { apiKey: '', model: '', url: '', protocol: 'openai' }
  }));

  useEffect(() => {
    const next = { ...form };
    for (const preset of PRESETS) {
      const ep = matches.get(preset.id);
      if (ep) {
        next[preset.id] = {
          apiKey: ep.apiKey ?? '',
          model: ep.model || preset.defaultModel,
          url: ep.url || preset.url,
          protocol: ep.protocol || preset.protocol
        };
      } else {
        next[preset.id] = {
          apiKey: '',
          model: preset.defaultModel,
          url: preset.url,
          protocol: preset.protocol
        };
      }
    }
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const handleApply = (preset: Preset) => {
    const state = form[preset.id];
    onAddEndpoint({
      name: preset.name,
      url: state.url.trim() || preset.url,
      model: state.model.trim(),
      apiKey: state.apiKey.trim() || undefined,
      protocol: preset.id === 'custom' ? state.protocol : preset.protocol,
      type: preset.type,
      enabled: true
    });
  };

  const handleDelete = (preset: Preset) => {
    const ep = matches.get(preset.id);
    if (ep) {
      onDeleteEndpoint(ep.id);
    }
  };

  return (
    <div className="space-y-2">
      {PRESETS.map((preset) => {
        const ep = matches.get(preset.id);
        const isSelected = selected === preset.id;
        const isConfigured = !!ep;
        const state = form[preset.id];

        return (
          <div
            key={preset.id}
            className={`rounded-lg border transition-all ${
              isSelected ? 'border-brand-500 bg-brand-50/30' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              onClick={() => setSelected(preset.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <StatusDot active={isConfigured} color={isConfigured ? 'success' : 'neutral'} size="md" />
                <div>
                  <div className="text-[13px] font-medium text-slate-900">{preset.name}</div>
                  <div className="text-[11px] text-slate-500">{preset.description}</div>
                </div>
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {isConfigured ? '已配置' : '未配置'}
              </div>
            </button>

            {isSelected && (
              <div className="border-t border-slate-100 px-4 py-3">
                <div className="space-y-3">
                  {preset.id === 'custom' && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">Base URL</label>
                      <input
                        type="url"
                        value={state.url}
                        onChange={(e) => setForm((prev) => ({ ...prev, [preset.id]: { ...prev[preset.id], url: e.target.value } }))}
                        placeholder="https://api.example.com/v1"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">API Key</label>
                    <input
                      type="password"
                      value={state.apiKey}
                      onChange={(e) => setForm((prev) => ({ ...prev, [preset.id]: { ...prev[preset.id], apiKey: e.target.value } }))}
                      placeholder={preset.id === 'openai' ? 'sk-...' : preset.id === 'claude' ? 'sk-ant-...' : 'API Key'}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">模型</label>
                    <input
                      type="text"
                      list={`models-${preset.id}`}
                      value={state.model}
                      onChange={(e) => setForm((prev) => ({ ...prev, [preset.id]: { ...prev[preset.id], model: e.target.value } }))}
                      placeholder={preset.defaultModel}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                    {preset.modelOptions.length > 0 && (
                      <datalist id={`models-${preset.id}`}>
                        {preset.modelOptions.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    )}
                  </div>

                  {preset.id === 'custom' && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">协议</label>
                      <select
                        value={state.protocol}
                        onChange={(e) => setForm((prev) => ({ ...prev, [preset.id]: { ...prev[preset.id], protocol: e.target.value as 'openai' | 'anthropic' } }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                      >
                        <option value="openai">OpenAI 兼容</option>
                        <option value="anthropic">Anthropic (Claude) 原生</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApply(preset)}
                      disabled={!state.model.trim() || (preset.id === 'custom' && !state.url.trim())}
                    >
                      应用
                    </Button>
                    {isConfigured && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(preset)}>
                        删除
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
