import { useState } from "react";
import { Card, Button, cn } from "../../design-system/index.js";
import { BrainIcon, EarIcon, SpeakerIcon, DownloadIcon, CheckIcon, TrashIcon, RefreshIcon } from "../icons.js";
import { OllamaInstallBanner, OllamaStartBanner } from "../components/OllamaBanner.js";
import { StoreTab } from "../components/StoreTab.js";
import type { ModelBackendKind, ModelBackendState } from "@ai-cursor-v2/shared";

export interface ModelItem {
  id: string;
  name: string;
  size: string;
  description: string;
  installed: boolean;
  downloading?: boolean;
  progress?: number;
}

interface LibraryViewNewProps {
  // Backend state
  ollamaStatus: 'not-installed' | 'stopped' | 'running';
  lmStudioStatus: 'not-installed' | 'stopped' | 'running';
  activeBackend: ModelBackendKind;
  onBackendSwitch: (backend: ModelBackendKind) => void;
  onInstallOllama: () => void;
  onStartOllama: () => void;

  // LLM models
  availableLLMs: ModelItem[];
  installedLLMs: ModelItem[];
  onDownloadLLM: (id: string) => void;
  onDeleteLLM: (id: string) => void;

  // STT models
  availableSTTs: ModelItem[];
  installedSTTs: ModelItem[];
  onDownloadSTT: (id: string) => void;
  onDeleteSTT: (id: string) => void;

  // TTS models
  availableTTSs: ModelItem[];
  installedTTSs: ModelItem[];
  onDownloadTTS: (id: string) => void;
  onDeleteTTS: (id: string) => void;

  // Refresh
  onRefresh: () => void;
}

export function LibraryViewNew({
  ollamaStatus,
  lmStudioStatus,
  activeBackend,
  onBackendSwitch,
  onInstallOllama,
  onStartOllama,
  availableLLMs,
  installedLLMs,
  onDownloadLLM,
  onDeleteLLM,
  availableSTTs,
  installedSTTs,
  onDownloadSTT,
  onDeleteSTT,
  availableTTSs,
  installedTTSs,
  onDownloadTTS,
  onDeleteTTS,
  onRefresh
}: LibraryViewNewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const ollamaInstalled = ollamaStatus !== 'not-installed';
  const ollamaRunning = ollamaStatus === 'running';

  return (
    <div className="space-y-4">
      {/* Ollama状态横幅 */}
      {!ollamaInstalled && (
        <OllamaInstallBanner onInstall={onInstallOllama} />
      )}
      {ollamaInstalled && !ollamaRunning && (
        <OllamaStartBanner onStart={onStartOllama} />
      )}

      {/* 模型来源选择器 */}
      <div className="flex items-center gap-2">
        <StoreTab
          name="Ollama"
          status={ollamaStatus}
          active={activeBackend === 'ollama'}
          modelCount={installedLLMs.filter(m => m.id.startsWith('ollama:')).length}
          onClick={() => onBackendSwitch('ollama')}
        />
        <StoreTab
          name="LM Studio"
          status={lmStudioStatus}
          active={activeBackend === 'lmstudio'}
          modelCount={installedLLMs.filter(m => m.id.startsWith('lmstudio:')).length}
          onClick={() => onBackendSwitch('lmstudio')}
        />
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-8 gap-1.5"
        >
          <RefreshIcon width={14} />
          刷新
        </Button>
      </div>

      {/* LLM商店 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <BrainIcon width={16} className="text-brand-600" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-slate-900">语言模型（LLM）</h3>
              <p className="text-[11px] text-slate-500">
                已安装 {installedLLMs.length} 个 · 可下载 {availableLLMs.length} 个
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {availableLLMs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/30 px-4 py-8 text-center">
              <p className="text-[12px] text-slate-500">
                {activeBackend === 'ollama' ? 'Ollama未运行' : 'LM Studio未运行'}
              </p>
            </div>
          ) : (
            availableLLMs.map(model => (
              <ModelItemRow
                key={model.id}
                model={model}
                onDownload={onDownloadLLM}
                onDelete={onDeleteLLM}
              />
            ))
          )}
        </div>
      </Card>

      {/* STT模型 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <EarIcon width={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-slate-900">语音识别模型（STT）</h3>
              <p className="text-[11px] text-slate-500">
                已安装 {installedSTTs.length} 个 · 可下载 {availableSTTs.length} 个
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {availableSTTs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/30 px-4 py-8 text-center">
              <p className="text-[12px] text-slate-500">暂无可用的STT模型</p>
              <p className="text-[11px] text-slate-400 mt-1">未来版本将支持本地STT模型下载</p>
            </div>
          ) : (
            availableSTTs.map(model => (
              <ModelItemRow
                key={model.id}
                model={model}
                onDownload={onDownloadSTT}
                onDelete={onDeleteSTT}
              />
            ))
          )}
        </div>
      </Card>

      {/* TTS模型 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
              <SpeakerIcon width={16} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-slate-900">语音合成模型（TTS）</h3>
              <p className="text-[11px] text-slate-500">
                已安装 {installedTTSs.length} 个 · 可下载 {availableTTSs.length} 个
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {availableTTSs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/30 px-4 py-8 text-center">
              <p className="text-[12px] text-slate-500">暂无可用的TTS模型</p>
              <p className="text-[11px] text-slate-400 mt-1">未来版本将支持本地TTS模型下载</p>
            </div>
          ) : (
            availableTTSs.map(model => (
              <ModelItemRow
                key={model.id}
                model={model}
                onDownload={onDownloadTTS}
                onDelete={onDeleteTTS}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function ModelItemRow({
  model,
  onDownload,
  onDelete
}: {
  model: ModelItem;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 hover:bg-slate-50/50 transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-medium text-slate-900">{model.name}</p>
          {model.installed && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <CheckIcon width={10} /> 已安装
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-slate-500">{model.size}</p>
          {model.description && (
            <>
              <span className="text-slate-300">·</span>
              <p className="text-[11px] text-slate-400 truncate">{model.description}</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-3">
        {model.downloading ? (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${model.progress || 0}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 w-10 text-right">
              {model.progress || 0}%
            </span>
          </div>
        ) : model.installed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(model.id)}
            className="h-7 gap-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <TrashIcon width={12} />
            删除
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDownload(model.id)}
            className="h-7 gap-1 text-[11px]"
          >
            <DownloadIcon width={12} />
            下载
          </Button>
        )}
      </div>
    </div>
  );
}
