import { useState, useMemo, type ReactNode } from "react";
import { useModelCenter } from "../../runtime/useModelCenter.js";
import { FeatureSection } from "../../app/feature-status.js";
import { PlusIcon } from "../icons.js";
import { Button, cn, DensityProvider } from "../../design-system/index.js";
import { ConfigViewNew } from "./ConfigViewNew.js";
import { LibraryViewNew, type ModelItem } from "./LibraryViewNew.js";
import type { LLMModel, STTModel, TTSModel, CustomEndpoint } from "./model-types.js";
import type { ModelBackendKind } from "@ai-cursor-v2/shared";

type Tab = "config" | "library";

export function ModelCenterPage() {
  const model = useModelCenter();
  const [tab, setTab] = useState<Tab>("config");
  const snapshot = model.snapshot;

  // 转换数据格式：从catalog到分类模型列表
  const installedLLMs: LLMModel[] = useMemo(() => {
    return snapshot.catalog
      .filter(m => m.installed && m.role === "duplex_execution_brain")
      .map(m => ({
        id: m.id,
        name: m.displayName,
        size: `${m.approxSizeGB}GB`,
        backend: snapshot.activeBackend
      }));
  }, [snapshot.catalog, snapshot.activeBackend]);

  const installedSTTs: STTModel[] = useMemo(() => {
    // 当前版本：STT使用固定的Whisper，未来扩展
    return [];
  }, []);

  const installedTTSs: TTSModel[] = useMemo(() => {
    // 当前版本：TTS使用固定的Edge TTS，未来扩展
    return [];
  }, []);

  // Library view 数据
  const availableLLMs: ModelItem[] = useMemo(() => {
    return snapshot.catalog
      .filter(m => m.role === "duplex_execution_brain")
      .map(m => {
        const isPulling = snapshot.activePull?.model === m.id;
        const phase = isPulling ? snapshot.activePull!.phase : undefined;
        return {
          id: m.id,
          name: m.displayName,
          size: `${m.approxSizeGB}GB`,
          description: m.description,
          installed: m.installed,
          phase,
          paused: phase === "paused",
          downloading: isPulling && (phase === "downloading" || phase === "resolving" || phase === "verifying"),
          progress: isPulling ? snapshot.activePull!.percent : undefined
        };
      });
  }, [snapshot.catalog, snapshot.activePull]);

  const availableSTTs: ModelItem[] = [];
  const availableTTSs: ModelItem[] = [];

  // 自定义端点（占位数据）
  const [customEndpoints, setCustomEndpoints] = useState<CustomEndpoint[]>([]);

  // 配置状态
  const [selectedConfig, setSelectedConfig] = useState({
    brain: { type: 'local' as 'local' | 'remote', modelId: snapshot.activeBrainModel },
    hearing: { modelId: undefined as string | undefined },
    speaking: { modelId: undefined as string | undefined }
  });

  // Ollama状态映射
  const ollamaStatus = useMemo(() => {
    const backend = snapshot.backends.find(b => b.backend === 'ollama');
    if (!backend) return 'not-installed';
    if (backend.status === 'not_installed') return 'not-installed';
    if (backend.status === 'installed_not_running') return 'stopped';
    if (backend.status === 'running') return 'running';
    return 'not-installed';
  }, [snapshot.backends]);

  const lmStudioStatus = useMemo(() => {
    const backend = snapshot.backends.find(b => b.backend === 'lmstudio');
    if (!backend) return 'not-installed';
    if (backend.status === 'not_installed') return 'not-installed';
    if (backend.status === 'installed_not_running') return 'stopped';
    if (backend.status === 'running') return 'running';
    return 'not-installed';
  }, [snapshot.backends]);

  // 事件处理
  const handleConfigChange = (config: typeof selectedConfig) => {
    setSelectedConfig(config);
    if (config.brain.type === 'local' && config.brain.modelId) {
      void model.useAsBrain(config.brain.modelId);
    }
  };

  const handleBackendSwitch = (backend: ModelBackendKind) => {
    void model.setBackend(backend);
  };

  const handleDownloadLLM = (id: string) => {
    void model.pull(id);
  };

  const handleDeleteLLM = (id: string) => {
    void model.removeModel(id);
  };

  const handlePauseLLM = (id: string) => {
    void model.pausePull(id);
  };

  const handleResumeLLM = (id: string) => {
    void model.resumePull(id);
  };

  const handleRefresh = () => {
    void model.refreshBackend();
  };

  const handleInstallOllama = () => {
    void model.installOllama();
  };

  const handleStartOllama = () => {
    // Ollama会自动启动，刷新后端状态即可
    void model.refreshBackend();
  };

  const handleAddEndpoint = (endpoint: Omit<CustomEndpoint, 'id'>) => {
    const newEndpoint = {
      ...endpoint,
      id: `endpoint-${Date.now()}`
    };
    setCustomEndpoints(prev => [...prev, newEndpoint]);
  };

  const handleEditEndpoint = (endpoint: CustomEndpoint) => {
    setCustomEndpoints(prev => prev.map(e => e.id === endpoint.id ? endpoint : e));
  };

  const handleDeleteEndpoint = (id: string) => {
    setCustomEndpoints(prev => prev.filter(e => e.id !== id));
  };

  const handleToggleEndpoint = (id: string) => {
    setCustomEndpoints(prev => prev.map(e =>
      e.id === id ? { ...e, enabled: !e.enabled } : e
    ));
  };

  const handleChangeStorage = () => {
    void model.chooseStorageRoot();
  };

  // 存储信息
  const modelsDir = snapshot.modelsDir || "未设置";
  const disk = snapshot.environment?.disk;
  const storageFreeGB = disk?.freeGB || 0;
  const storageTotalGB = disk?.totalGB || 0;

  return (
    <DensityProvider density="compact">
      <div className="flex h-screen flex-col overflow-hidden bg-white">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-4">
            {/* 头部 */}
            <FeatureSection id="model-center.header" title="模型中心头部">
              <header className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h1 className="text-[20px] font-semibold text-slate-900">模型中心</h1>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    配置AI能力和管理本地模型
                  </p>
                </div>
              </header>
            </FeatureSection>

            {/* 标签页切换 */}
            <FeatureSection id="model-center.tabs" title="配置/模型库切换">
              <div className="mt-3 flex items-center gap-6 border-b border-slate-100">
                <TabButton active={tab === "config"} onClick={() => setTab("config")}>
                  配置
                </TabButton>
                <TabButton active={tab === "library"} onClick={() => setTab("library")}>
                  模型库
                </TabButton>
              </div>
            </FeatureSection>

            {/* 内容区域 */}
            <div className="pt-4">
              {tab === "config" ? (
                <FeatureSection id="model-center.config" title="运行配置">
                  <ConfigViewNew
                    installedLLMs={installedLLMs}
                    installedSTTs={installedSTTs}
                    installedTTSs={installedTTSs}
                    customEndpoints={customEndpoints}
                    selectedConfig={selectedConfig}
                    onConfigChange={handleConfigChange}
                    onNavigateToLibrary={() => setTab("library")}
                    onAddEndpoint={handleAddEndpoint}
                    onEditEndpoint={handleEditEndpoint}
                    onDeleteEndpoint={handleDeleteEndpoint}
                    onToggleEndpoint={handleToggleEndpoint}
                  />
                </FeatureSection>
              ) : (
                <FeatureSection id="model-center.library" title="模型库">
                  <LibraryViewNew
                    ollamaStatus={ollamaStatus}
                    lmStudioStatus={lmStudioStatus}
                    activeBackend={snapshot.activeBackend}
                    onBackendSwitch={handleBackendSwitch}
                    onInstallOllama={handleInstallOllama}
                    onStartOllama={handleStartOllama}
                    modelsDir={modelsDir}
                    storageFreeGB={storageFreeGB}
                    storageTotalGB={storageTotalGB}
                    onChangeStorage={handleChangeStorage}
                    availableLLMs={availableLLMs}
                    installedLLMs={installedLLMs.map(m => ({
                      ...m,
                      description: '',
                      installed: true
                    }))}
                    onDownloadLLM={handleDownloadLLM}
                    onDeleteLLM={handleDeleteLLM}
                    onPauseLLM={handlePauseLLM}
                    onResumeLLM={handleResumeLLM}
                    availableSTTs={availableSTTs}
                    installedSTTs={[]}
                    onDownloadSTT={(id) => console.log('Download STT:', id)}
                    onDeleteSTT={(id) => console.log('Delete STT:', id)}
                    availableTTSs={availableTTSs}
                    installedTTSs={[]}
                    onDownloadTTS={(id) => console.log('Download TTS:', id)}
                    onDeleteTTS={(id) => console.log('Delete TTS:', id)}
                    onRefresh={handleRefresh}
                  />
                </FeatureSection>
              )}
            </div>
          </div>
        </div>
      </div>
    </DensityProvider>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative -mb-px pb-2.5 text-[14px] font-medium transition-colors",
        active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
      )}
    >
      {children}
      {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-500" />}
    </button>
  );
}
