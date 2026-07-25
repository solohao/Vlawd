import { useState } from "react";
import { Card, Button, cn } from "../../design-system/index.js";
import { BrainIcon, EarIcon, SpeakerIcon, GlobeIcon, CheckIcon } from "../icons.js";
import { RemoteEndpointList, AddEndpointButton, EndpointForm, type CustomEndpoint } from "../components/RemoteEndpoint.js";
import type { LLMModel, STTModel, TTSModel } from "./model-types.js";

interface ConfigViewNewProps {
  installedLLMs: LLMModel[];
  installedSTTs: STTModel[];
  installedTTSs: TTSModel[];
  customEndpoints: CustomEndpoint[];
  selectedConfig: {
    brain: { type: 'local' | 'remote'; modelId?: string; endpointId?: string };
    hearing: { modelId?: string };
    speaking: { modelId?: string };
  };
  onConfigChange: (config: any) => void;
  onNavigateToLibrary: () => void;
  onAddEndpoint: (endpoint: Omit<CustomEndpoint, 'id'>) => void;
  onEditEndpoint: (endpoint: CustomEndpoint) => void;
  onDeleteEndpoint: (id: string) => void;
  onToggleEndpoint: (id: string) => void;
}

export function ConfigViewNew({
  installedLLMs,
  installedSTTs,
  installedTTSs,
  customEndpoints,
  selectedConfig,
  onConfigChange,
  onNavigateToLibrary,
  onAddEndpoint,
  onEditEndpoint,
  onDeleteEndpoint,
  onToggleEndpoint
}: ConfigViewNewProps) {
  const [showEndpointForm, setShowEndpointForm] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<CustomEndpoint | undefined>();

  const handleEditEndpoint = (endpoint: CustomEndpoint) => {
    setEditingEndpoint(endpoint);
    setShowEndpointForm(true);
  };

  const handleSaveEndpoint = (endpoint: Omit<CustomEndpoint, 'id'>) => {
    if (editingEndpoint) {
      onEditEndpoint({ ...endpoint, id: editingEndpoint.id });
    } else {
      onAddEndpoint(endpoint);
    }
    setShowEndpointForm(false);
    setEditingEndpoint(undefined);
  };

  const handleCancelEndpoint = () => {
    setShowEndpointForm(false);
    setEditingEndpoint(undefined);
  };

  return (
    <div className="space-y-6">
      {/* 执行大脑（思考） */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
            <BrainIcon width={16} className="text-brand-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-slate-900">执行大脑（思考）</h3>
            <p className="text-[11px] text-slate-500">选择用于理解和生成的语言模型</p>
          </div>
        </div>

        {/* 本地模型 */}
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-2">
              使用本地模型
            </label>
            {installedLLMs.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/30 px-4 py-3">
                <p className="text-[12px] text-amber-700">
                  尚未安装LLM模型
                </p>
                <button
                  onClick={onNavigateToLibrary}
                  className="mt-2 text-[11px] font-medium text-brand-600 hover:text-brand-700"
                >
                  前往模型库下载 →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {installedLLMs.map(model => (
                  <button
                    key={model.id}
                    onClick={() => onConfigChange({
                      ...selectedConfig,
                      brain: { type: 'local', modelId: model.id }
                    })}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all",
                      selectedConfig.brain.type === 'local' && selectedConfig.brain.modelId === model.id
                        ? "border-brand-400 bg-brand-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div>
                      <p className="text-[12px] font-medium text-slate-900">{model.name}</p>
                      <p className="text-[11px] text-slate-500">{model.size}</p>
                    </div>
                    {selectedConfig.brain.type === 'local' && selectedConfig.brain.modelId === model.id && (
                      <CheckIcon width={16} className="text-brand-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-[11px] text-slate-400">或</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* 远程API */}
          <div>
            <label className="block text-[12px] font-medium text-slate-700 mb-2">
              使用远程API
            </label>

            {showEndpointForm ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/30 p-4">
                <EndpointForm
                  endpoint={editingEndpoint}
                  onSave={handleSaveEndpoint}
                  onCancel={handleCancelEndpoint}
                />
              </div>
            ) : (
              <>
                <RemoteEndpointList
                  endpoints={customEndpoints}
                  onEdit={handleEditEndpoint}
                  onDelete={onDeleteEndpoint}
                  onToggle={onToggleEndpoint}
                />
                <div className="mt-2">
                  <AddEndpointButton onClick={() => setShowEndpointForm(true)} />
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* 语音识别（听） */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <EarIcon width={16} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-slate-900">语音识别（听）</h3>
            <p className="text-[11px] text-slate-500">选择用于语音转文字的模型</p>
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-slate-700 mb-2">
            选择模型
          </label>
          {installedSTTs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/30 px-4 py-3">
              <p className="text-[12px] text-amber-700">
                尚未安装STT模型
              </p>
              <button
                onClick={onNavigateToLibrary}
                className="mt-2 text-[11px] font-medium text-brand-600 hover:text-brand-700"
              >
                前往模型库下载 →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {installedSTTs.map(model => (
                <button
                  key={model.id}
                  onClick={() => onConfigChange({
                    ...selectedConfig,
                    hearing: { modelId: model.id }
                  })}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all",
                    selectedConfig.hearing.modelId === model.id
                      ? "border-brand-400 bg-brand-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div>
                    <p className="text-[12px] font-medium text-slate-900">{model.name}</p>
                    <p className="text-[11px] text-slate-500">{model.size}</p>
                  </div>
                  {selectedConfig.hearing.modelId === model.id && (
                    <CheckIcon width={16} className="text-brand-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 语音合成（说） */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
            <SpeakerIcon width={16} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-slate-900">语音合成（说）</h3>
            <p className="text-[11px] text-slate-500">选择用于文字转语音的模型</p>
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-slate-700 mb-2">
            选择模型
          </label>
          {installedTTSs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/30 px-4 py-3">
              <p className="text-[12px] text-amber-700">
                尚未安装TTS模型
              </p>
              <button
                onClick={onNavigateToLibrary}
                className="mt-2 text-[11px] font-medium text-brand-600 hover:text-brand-700"
              >
                前往模型库下载 →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {installedTTSs.map(model => (
                <button
                  key={model.id}
                  onClick={() => onConfigChange({
                    ...selectedConfig,
                    speaking: { modelId: model.id }
                  })}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all",
                    selectedConfig.speaking.modelId === model.id
                      ? "border-brand-400 bg-brand-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div>
                    <p className="text-[12px] font-medium text-slate-900">{model.name}</p>
                    <p className="text-[11px] text-slate-500">{model.size}</p>
                  </div>
                  {selectedConfig.speaking.modelId === model.id && (
                    <CheckIcon width={16} className="text-brand-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
