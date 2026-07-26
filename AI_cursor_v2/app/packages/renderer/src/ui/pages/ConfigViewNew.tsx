import { useState, useMemo } from "react";
import { Card, Button, cn, StatusDot, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "../../design-system/index.js";
import { BrainIcon, EarIcon, SpeakerIcon, CheckIcon, ArrowRight } from "../icons.js";
import { RemoteProviderTable, type CustomEndpoint } from "../components/RemoteEndpoint.js";
import type { LLMModel, STTModel, TTSModel } from "./model-types.js";
import { intentTemplates } from "./model-catalog.js";

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
  onDeleteEndpoint: (id: string) => void;
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
  onDeleteEndpoint
}: ConfigViewNewProps) {
  const [currentPreset, setCurrentPreset] = useState('balanced');

  const presetTemplate = useMemo(
    () => intentTemplates.find(t => t.id === currentPreset) ?? intentTemplates[0],
    [currentPreset]
  );

  return (
    <div className="space-y-4">
      {/* 预设模式选择 */}
      <Card variant="default" padding="md">
        <div className="mb-3">
          <h3 className="text-[13px] font-semibold text-slate-900">配置模式</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            选择适合你使用场景的预设配置
          </p>
        </div>

        {/* 预设模式标签 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {intentTemplates.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setCurrentPreset(preset.id)}
              className={cn(
                "shrink-0 px-3 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all",
                currentPreset === preset.id
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
              )}
            >
              {preset.name.replace(/^推荐\s*·\s*/, "")}
            </button>
          ))}
        </div>

        {/* 预设详情 */}
        <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <div>
            <p className="text-[10px] text-slate-500 mb-1">性能特点</p>
            <p className="text-[11px] font-medium text-slate-900 line-clamp-2">{presetTemplate.perf}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1">隐私保护</p>
            <p className="text-[11px] font-medium text-slate-900 line-clamp-2">{presetTemplate.privacy}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1">适用场景</p>
            <p className="text-[11px] font-medium text-slate-900 line-clamp-2">{presetTemplate.scene}</p>
          </div>
        </div>
      </Card>

      {/* AI处理流水线 - 使用 Table 组件 */}
      <Card variant="default" padding="lg">
        <div className="mb-4">
          <h3 className="text-[14px] font-semibold text-slate-900">AI处理流水线</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            配置从语音输入到语音输出的完整处理流程
          </p>
        </div>

        {/* 流程指示器 */}
        <div className="mb-4 flex items-center justify-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[11px] font-semibold">1</span>
            听见你
          </span>
          <ArrowRight width={16} className="text-slate-300" />
          <span className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-[11px] font-semibold">2</span>
            理解与思考
          </span>
          <ArrowRight width={16} className="text-slate-300" />
          <span className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-600 text-[11px] font-semibold">3</span>
            回应你
          </span>
        </div>

        {/* 使用 Table 组件 - 横向表格 */}
        <Table variant="container">
          <TableHead>
            <TableRow>
              <TableHeader className="w-1/3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
                    <EarIcon width={14} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-900">语音识别</div>
                    <div className="text-[10px] text-slate-500 font-normal">STT</div>
                  </div>
                </div>
              </TableHeader>
              <TableHeader className="w-1/3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100">
                    <BrainIcon width={14} className="text-brand-600" />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-900">执行大脑</div>
                    <div className="text-[10px] text-slate-500 font-normal">LLM</div>
                  </div>
                </div>
              </TableHeader>
              <TableHeader className="w-1/3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100">
                    <SpeakerIcon width={14} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-900">语音合成</div>
                    <div className="text-[10px] text-slate-500 font-normal">TTS</div>
                  </div>
                </div>
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {/* STT 单元格 */}
              <TableCell className="align-top p-4">
                {installedSTTs.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/50 px-3 py-6 text-center">
                    <p className="text-[11px] text-amber-700 mb-2">
                      尚未安装STT模型
                    </p>
                    <button
                      onClick={onNavigateToLibrary}
                      className="text-[10px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      前往模型库 →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedConfig.hearing.modelId || ''}
                      onChange={(e) => onConfigChange({
                        ...selectedConfig,
                        hearing: { modelId: e.target.value }
                      })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                    >
                      {installedSTTs.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>

                    {selectedConfig.hearing.modelId && (
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <StatusDot active color="success" size="sm" />
                          <span className="text-slate-600">已就绪</span>
                        </div>
                        <span className="text-slate-500">
                          {installedSTTs.find(m => m.id === selectedConfig.hearing.modelId)?.size}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </TableCell>

              {/* LLM 单元格 */}
              <TableCell className="align-top p-4 bg-brand-50/20">
                {installedLLMs.length === 0 && selectedConfig.brain.type !== 'remote' ? (
                  <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/50 px-3 py-6 text-center">
                    <p className="text-[11px] text-amber-700 mb-2">
                      尚未安装LLM模型
                    </p>
                    <button
                      onClick={onNavigateToLibrary}
                      className="text-[10px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      前往模型库 →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onConfigChange({
                          ...selectedConfig,
                          brain: { type: 'local', modelId: selectedConfig.brain.modelId || installedLLMs[0]?.id }
                        })}
                        className={cn(
                          "flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all",
                          selectedConfig.brain.type === 'local'
                            ? "bg-brand-500 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                        )}
                      >
                        本地模型
                      </button>
                      <button
                        onClick={() => onConfigChange({
                          ...selectedConfig,
                          brain: { type: 'remote' }
                        })}
                        className={cn(
                          "flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all",
                          selectedConfig.brain.type === 'remote'
                            ? "bg-brand-500 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                        )}
                      >
                        远程API
                      </button>
                    </div>

                    {selectedConfig.brain.type === 'local' ? (
                      <>
                        <select
                          value={selectedConfig.brain.modelId || ''}
                          onChange={(e) => onConfigChange({
                            ...selectedConfig,
                            brain: { type: 'local', modelId: e.target.value }
                          })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                        >
                          {installedLLMs.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>

                        {selectedConfig.brain.modelId && (
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <StatusDot active color="success" size="sm" />
                              <span className="text-slate-600">已应用</span>
                            </div>
                            <span className="text-slate-500">
                              {installedLLMs.find(m => m.id === selectedConfig.brain.modelId)?.size}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <RemoteProviderTable
                        endpoints={customEndpoints}
                        onAddEndpoint={onAddEndpoint}
                        onDeleteEndpoint={onDeleteEndpoint}
                      />
                    )}
                  </div>
                )}
              </TableCell>

              {/* TTS 单元格 */}
              <TableCell className="align-top p-4">
                {installedTTSs.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/50 px-3 py-6 text-center">
                    <p className="text-[11px] text-amber-700 mb-2">
                      尚未安装TTS模型
                    </p>
                    <button
                      onClick={onNavigateToLibrary}
                      className="text-[10px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      前往模型库 →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedConfig.speaking.modelId || ''}
                      onChange={(e) => onConfigChange({
                        ...selectedConfig,
                        speaking: { modelId: e.target.value }
                      })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                    >
                      {installedTTSs.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>

                    {selectedConfig.speaking.modelId && (
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <StatusDot active color="success" size="sm" />
                          <span className="text-slate-600">已就绪</span>
                        </div>
                        <span className="text-slate-500">
                          {installedTTSs.find(m => m.id === selectedConfig.speaking.modelId)?.size}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
