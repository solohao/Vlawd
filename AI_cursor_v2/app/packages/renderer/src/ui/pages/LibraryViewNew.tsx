import { useState } from "react";
import { Card, Button, cn } from "../../design-system/index.js";
import { BrainIcon, EarIcon, SpeakerIcon, PlayIcon, PauseIcon, DownloadIcon, CheckIcon, TrashIcon, RefreshIcon } from "../icons.js";
import { OllamaInstallBanner, OllamaStartBanner } from "../components/OllamaBanner.js";
import { StoreTab } from "../components/StoreTab.js";
import type { ModelBackendKind, ModelBackendState, ModelPullPhase, OllamaInstallState } from "@ai-cursor-v2/shared";

export interface ModelItem {
  id: string;
  name: string;
  size: string;
  description: string;
  installed: boolean;
  phase?: ModelPullPhase;
  paused?: boolean;
  downloading?: boolean;
  progress?: number;
  recommended?: boolean;
  quality?: string;
}

interface LibraryViewNewProps {
  // Backend state
  ollamaStatus: 'not-installed' | 'stopped' | 'running';
  ollamaInstall: OllamaInstallState;
  lmStudioStatus: 'not-installed' | 'stopped' | 'running';
  activeBackend: ModelBackendKind;
  onBackendSwitch: (backend: ModelBackendKind) => void;
  onInstallOllama: () => void;
  onPauseInstallOllama?: () => void;
  onResumeInstallOllama?: () => void;
  onStartOllama: () => void;

  // Storage
  modelsDir: string;
  storageFreeGB: number;
  storageTotalGB: number;
  onChangeStorage: () => void;

  // LLM models
  availableLLMs: ModelItem[];
  installedLLMs: ModelItem[];
  onDownloadLLM: (id: string) => void;
  onDeleteLLM: (id: string) => void;
  onPauseLLM: (id: string) => void;
  onResumeLLM: (id: string) => void;

  // STT models
  availableSTTs: ModelItem[];
  installedSTTs: ModelItem[];
  onDownloadSTT: (id: string) => void;
  onDeleteSTT: (id: string) => void;
  onPauseSTT?: (id: string) => void;
  onResumeSTT?: (id: string) => void;

  // TTS models
  availableTTSs: ModelItem[];
  installedTTSs: ModelItem[];
  onDownloadTTS: (id: string) => void;
  onDeleteTTS: (id: string) => void;
  onPauseTTS?: (id: string) => void;
  onResumeTTS?: (id: string) => void;

  // Refresh
  onRefresh: () => void;
}

export function LibraryViewNew({
  ollamaStatus,
  ollamaInstall,
  lmStudioStatus,
  activeBackend,
  onBackendSwitch,
  onInstallOllama,
  onPauseInstallOllama,
  onResumeInstallOllama,
  onStartOllama,
  modelsDir,
  storageFreeGB,
  storageTotalGB,
  onChangeStorage,
  availableLLMs,
  installedLLMs,
  onDownloadLLM,
  onDeleteLLM,
  onPauseLLM,
  onResumeLLM,
  availableSTTs,
  installedSTTs,
  onDownloadSTT,
  onDeleteSTT,
  onPauseSTT,
  onResumeSTT,
  availableTTSs,
  installedTTSs,
  onDownloadTTS,
  onDeleteTTS,
  onPauseTTS,
  onResumeTTS,
  onRefresh
}: LibraryViewNewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const ollamaInstalled = ollamaStatus !== 'not-installed';
  const ollamaRunning = ollamaStatus === 'running';

  const storageUsedGB = storageTotalGB - storageFreeGB;
  const storagePercent = storageTotalGB > 0 ? Math.round((storageUsedGB / storageTotalGB) * 100) : 0;

  const filteredLLMs = availableLLMs.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* 存储空间卡片 */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-slate-900">存储空间</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              已使用 {storageUsedGB.toFixed(1)} GB / 共 {storageTotalGB.toFixed(1)} GB
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <svg className="h-12 w-12 -rotate-90 transform">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-slate-100"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - storagePercent / 100)}`}
                  className="text-brand-500 transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-slate-700">{storagePercent}%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-500">存储位置</p>
            <p className="text-[11px] font-medium text-slate-700 break-all">{modelsDir || "未设置"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onChangeStorage} className="shrink-0 text-[11px]">
            更改位置
          </Button>
        </div>
      </Card>

      {/* Ollama状态横幅 */}
      {!ollamaInstalled && (
        <OllamaInstallBanner
          phase={ollamaInstall.phase}
          message={ollamaInstall.message}
          progress={ollamaInstall.progress}
          completedBytes={ollamaInstall.completedBytes}
          totalBytes={ollamaInstall.totalBytes}
          onInstall={onInstallOllama}
          onPause={onPauseInstallOllama}
          onResume={onResumeInstallOllama}
        />
      )}
      {ollamaInstalled && !ollamaRunning && (
        <OllamaStartBanner onStart={onStartOllama} />
      )}

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

          {/* LLM的模型来源选择器 - 放在右侧 */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">模型来源:</span>
            <StoreTab
              name="Ollama"
              status={ollamaStatus}
              active={activeBackend === 'ollama'}
              modelCount={installedLLMs.length}
              onClick={() => onBackendSwitch('ollama')}
            />
            <StoreTab
              name="LM Studio"
              status={lmStudioStatus}
              active={activeBackend === 'lmstudio'}
              modelCount={0}
              onClick={() => onBackendSwitch('lmstudio')}
            />
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
        </div>

        <div className="mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索模型…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          {filteredLLMs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/30 px-4 py-8 text-center">
              <p className="text-[12px] text-slate-500">
                {activeBackend === 'ollama' ? 'Ollama未运行' : 'LM Studio未运行'}
              </p>
            </div>
          ) : (
            filteredLLMs.map(model => (
              <ModelItemRow
                key={model.id}
                model={model}
                onDownload={onDownloadLLM}
                onDelete={onDeleteLLM}
                onPause={onPauseLLM}
                onResume={onResumeLLM}
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

          {/* STT的下载方式说明 */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">下载方式:</span>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
              <span className="text-[11px] font-medium text-slate-600">直接下载</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {availableSTTs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/30 px-4 py-8 text-center">
              <p className="text-[12px] text-slate-600 font-medium">暂无可用STT模型</p>
            </div>
          ) : (
            availableSTTs.map(model => (
              <ModelItemRow
                key={model.id}
                model={model}
                onDownload={onDownloadSTT}
                onDelete={onDeleteSTT}
                onPause={onPauseSTT}
                onResume={onResumeSTT}
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

          {/* TTS的下载方式说明 */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">下载方式:</span>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
              <span className="text-[11px] font-medium text-slate-600">直接下载</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {availableTTSs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/30 px-4 py-8 text-center">
              <p className="text-[12px] text-slate-600 font-medium">暂无可用TTS模型</p>
            </div>
          ) : (
            availableTTSs.map(model => (
              <ModelItemRow
                key={model.id}
                model={model}
                onDownload={onDownloadTTS}
                onDelete={onDeleteTTS}
                onPause={onPauseTTS}
                onResume={onResumeTTS}
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
  onDelete,
  onPause,
  onResume
}: {
  model: ModelItem;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
}) {
  const hasError = model.phase === "error" || model.phase === "cancelled";

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 hover:bg-slate-50/50 transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-medium text-slate-900">{model.name}</p>
          {model.recommended && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              推荐
            </span>
          )}
          {model.quality && (
            <span className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              model.quality === "high" ? "bg-emerald-100 text-emerald-700" :
              model.quality === "medium" ? "bg-blue-100 text-blue-700" :
              "bg-slate-100 text-slate-600"
            )}>
              {model.quality === "low" ? "入门" : model.quality === "medium" ? "标准" : "高质"}
            </span>
          )}
          {model.installed && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <CheckIcon width={10} /> 已安装
            </span>
          )}
          {model.paused && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
              <PauseIcon width={10} /> 已暂停
            </span>
          )}
          {model.downloading && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-brand-600">
              下载中
            </span>
          )}
          {hasError && !model.installed && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-rose-600">
              {model.phase === "error" ? "下载失败" : "已取消"}
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

      <div className="flex items-center gap-2 ml-3 shrink-0">
        {(model.downloading || model.paused) && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  model.paused ? "bg-amber-400" : "bg-brand-500"
                )}
                style={{ width: `${model.progress || 0}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 w-10 text-right">
              {model.progress ?? 0}%
            </span>
          </div>
        )}

        {model.downloading && onPause ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPause?.(model.id)}
            className="h-7 gap-1 text-[11px] text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <PauseIcon width={12} />
            暂停
          </Button>
        ) : model.paused && onResume ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onResume?.(model.id)}
              className="h-7 gap-1 text-[11px]"
            >
              <PlayIcon width={12} />
              继续下载
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(model.id)}
              className="h-7 gap-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <TrashIcon width={12} />
              取消
            </Button>
          </>
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
        ) : hasError ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDownload(model.id)}
            className="h-7 gap-1 text-[11px]"
          >
            <DownloadIcon width={12} />
            重新下载
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
