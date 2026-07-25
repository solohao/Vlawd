import { useState } from "react";
import { Button, StatusDot, ListRow, List } from "../../design-system/index.js";
import { PlusIcon, PencilIcon, TrashIcon } from "../icons.js";

export interface CustomEndpoint {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  type: 'openai-compatible' | 'custom';
  enabled: boolean;
}

interface RemoteEndpointListProps {
  endpoints: CustomEndpoint[];
  onEdit: (endpoint: CustomEndpoint) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export function RemoteEndpointList({ endpoints, onEdit, onDelete, onToggle }: RemoteEndpointListProps) {
  if (endpoints.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/30 px-4 py-8 text-center">
        <p className="text-[12px] text-slate-500">
          尚未配置远程API端点
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          可以连接到OpenAI、Anthropic或自建服务器
        </p>
      </div>
    );
  }

  return (
    <List>
      {endpoints.map(ep => (
        <ListRow
          key={ep.id}
          leading={
            <button
              onClick={() => onToggle(ep.id)}
              className="shrink-0"
              title={ep.enabled ? '点击禁用' : '点击启用'}
            >
              <StatusDot active={ep.enabled} color={ep.enabled ? 'success' : 'neutral'} size="md" />
            </button>
          }
          title={ep.name}
          description={ep.url}
          trailing={
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(ep)}
                className="h-7 w-7 p-0"
                title="编辑"
              >
                <PencilIcon width={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(ep.id)}
                className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                title="删除"
              >
                <TrashIcon width={14} />
              </Button>
            </div>
          }
        />
      ))}
    </List>
  );
}

interface AddEndpointButtonProps {
  onClick: () => void;
}

export function AddEndpointButton({ onClick }: AddEndpointButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="w-full border-2 border-dashed border-slate-200 hover:border-slate-300"
    >
      <PlusIcon width={14} className="mr-1" />
      添加自定义端点
    </Button>
  );
}

interface EndpointFormProps {
  endpoint?: CustomEndpoint;
  onSave: (endpoint: Omit<CustomEndpoint, 'id'>) => void;
  onCancel: () => void;
}

export function EndpointForm({ endpoint, onSave, onCancel }: EndpointFormProps) {
  const [name, setName] = useState(endpoint?.name || '');
  const [url, setUrl] = useState(endpoint?.url || '');
  const [apiKey, setApiKey] = useState(endpoint?.apiKey || '');
  const [type, setType] = useState<'openai-compatible' | 'custom'>(
    endpoint?.type || 'openai-compatible'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      url,
      apiKey: apiKey || undefined,
      type,
      enabled: true
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
          名称
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：我的API服务器"
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
          地址
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:8000"
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
          API密钥（可选）
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
          类型
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'openai-compatible' | 'custom')}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="openai-compatible">OpenAI兼容</option>
          <option value="custom">自定义协议</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="primary" size="sm">
          {endpoint ? '保存' : '添加'}
        </Button>
      </div>
    </form>
  );
}
