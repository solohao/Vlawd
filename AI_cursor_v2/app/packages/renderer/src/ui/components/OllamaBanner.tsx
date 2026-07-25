import { Button } from "../../design-system/index.js";
import { CubeIcon, RefreshIcon } from "../icons.js";
import { cn } from "../../design-system/index.js";
import type { OllamaInstallPhase } from "@ai-cursor-v2/shared";

interface OllamaInstallBannerProps {
  phase?: OllamaInstallPhase;
  message?: string;
  onInstall: () => void;
}

export function OllamaInstallBanner({ phase, message, onInstall }: OllamaInstallBannerProps) {
  const isInstalling = phase === "installing";
  const isError = phase === "error";

  return (
    <div className={cn(
      "rounded-lg border-2 p-4",
      isError ? "border-rose-200 bg-rose-50/30" : "border-brand-200 bg-brand-50/30"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          isError ? "bg-rose-100" : "bg-brand-100"
        )}>
          <CubeIcon width={20} className={isError ? "text-rose-700" : "text-brand-700"} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-slate-900">
            {isInstalling ? "正在下载 Ollama 核心服务" : isError ? "Ollama 核心服务下载失败" : "需要下载 Ollama 核心服务"}
          </h4>
          <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">
            {isInstalling
              ? "正在从 Ollama 官方发布页下载核心二进制（约 1.4GB）并解压，请保持网络连接。"
              : isError
                ? message || "下载过程出错，请检查网络后重试。"
                : "Ollama 是本地大语言模型运行引擎。Vlawd 会自动下载它的核心二进制（不含完整安装包），并把它放到 App 目录中管理。"}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant={isError ? "secondary" : "primary"}
              size="sm"
              onClick={onInstall}
              disabled={isInstalling}
              className="h-7 gap-1 text-[11px]"
            >
              {isInstalling ? (
                <>
                  <RefreshIcon width={12} className="animate-spin" />
                  下载中…
                </>
              ) : isError ? (
                "重新下载"
              ) : (
                <>
                  📥 下载 Ollama 核心服务
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            💡 提示：也可以使用LM Studio或配置自定义API端点
          </p>
        </div>
      </div>
    </div>
  );
}

interface OllamaStartBannerProps {
  onStart: () => void;
}

export function OllamaStartBanner({ onStart }: OllamaStartBannerProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/30 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-amber-800">
            🧊 Ollama 未启动
          </span>
          <span className="text-[11px] text-amber-600">
            请启动Ollama后刷新
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onStart}>
            刷新
          </Button>
        </div>
      </div>
    </div>
  );
}
