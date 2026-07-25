import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ModelPullPhase,
  ModelPullProgress,
  OllamaModelInfo
} from "@ai-cursor-v2/shared";
import type { BackendDetectResult, ModelBackend } from "./model-backend.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const INSTALL_GUIDANCE_URL = "https://ollama.com/download";

/** 从一批文件名中挑出 Ollama 的 Windows 安装器（大小写不敏感）。纯逻辑，便于单测。 */
export function pickOllamaInstaller(fileNames: string[]): string | null {
  const lower = fileNames.map((name) => ({ name, key: name.toLowerCase() }));
  const exact = lower.find((f) => f.key === "ollamasetup.exe");
  if (exact) {
    return exact.name;
  }
  const fuzzy = lower.find((f) => f.key.startsWith("ollama") && f.key.endsWith(".exe"));
  return fuzzy ? fuzzy.name : null;
}

/**
 * 构造 Ollama（Inno Setup）安装器的静默安装参数。
 * `/DIR` 指定程序安装目录；`/VERYSILENT` 无界面；其余抑制弹窗与重启。
 *
 * 保留作兼容与历史测试使用；Vlawd 现在优先走「核心二进制」方案。
 */
export function buildOllamaInstallArgs(installDir?: string): string[] {
  const args = ["/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART"];
  if (installDir && installDir.trim()) {
    args.unshift(`/DIR=${installDir}`);
  }
  return args;
}

/** 代管安装 Ollama 时搜索安装器的常见目录（Windows）。 */
export function ollamaInstallerSearchDirs(extraDirs: string[] = []): string[] {
  const home = homedir();
  return [
    ...extraDirs,
    join(home, "Downloads"),
    join(home, "Desktop"),
    home
  ].filter((dir) => dir.trim().length > 0);
}

interface OllamaTagsResponse {
  models?: Array<{ name?: string; size?: number; modified_at?: string }>;
}

interface OllamaVersionResponse {
  version?: string;
}

interface OllamaPullChunk {
  status?: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

export function parseOllamaTags(body: OllamaTagsResponse): OllamaModelInfo[] {
  if (!Array.isArray(body.models)) {
    return [];
  }
  const models: OllamaModelInfo[] = [];
  for (const entry of body.models) {
    if (!entry?.name) {
      continue;
    }
    models.push({
      name: entry.name,
      sizeBytes: typeof entry.size === "number" ? entry.size : 0,
      modifiedAt: entry.modified_at
    });
  }
  return models;
}

function phaseFromStatus(status: string): ModelPullPhase {
  const normalized = status.toLowerCase();
  if (normalized.includes("success")) {
    return "success";
  }
  if (normalized.includes("verifying") || normalized.includes("writing manifest")) {
    return "verifying";
  }
  if (normalized.includes("pulling manifest") || normalized.includes("resolv")) {
    return "resolving";
  }
  if (normalized.includes("pulling") || normalized.includes("downloading")) {
    return "downloading";
  }
  return "downloading";
}

/**
 * 聚合 Ollama `/api/pull` 的流式 NDJSON 进度。
 *
 * Ollama 按"层(digest)"逐层报告 total/completed，因此需要跨层累加得到总进度。
 * 该累加器保持纯逻辑，便于单测。
 */
export class PullProgressAccumulator {
  private readonly layers = new Map<string, { total: number; completed: number }>();
  private lastStatus = "";

  constructor(private readonly model: string) {}

  ingest(chunk: OllamaPullChunk): ModelPullProgress {
    if (chunk.error) {
      return this.snapshot({ phase: "error", status: chunk.error, message: chunk.error });
    }
    const status = chunk.status ?? this.lastStatus;
    this.lastStatus = status;

    if (chunk.digest && typeof chunk.total === "number") {
      this.layers.set(chunk.digest, {
        total: chunk.total,
        completed: typeof chunk.completed === "number" ? chunk.completed : 0
      });
    }

    return this.snapshot({ phase: phaseFromStatus(status), status });
  }

  private snapshot(partial: { phase: ModelPullPhase; status: string; message?: string }): ModelPullProgress {
    let totalBytes = 0;
    let completedBytes = 0;
    for (const layer of this.layers.values()) {
      totalBytes += layer.total;
      completedBytes += Math.min(layer.completed, layer.total);
    }
    const percent =
      partial.phase === "success"
        ? 100
        : totalBytes > 0
          ? Math.min(100, Math.round((completedBytes / totalBytes) * 100))
          : 0;
    return {
      model: this.model,
      phase: partial.phase,
      status: partial.status,
      completedBytes,
      totalBytes,
      percent,
      message: partial.message,
      updatedAt: new Date().toISOString()
    };
  }
}

export interface OllamaDetectResult extends BackendDetectResult {
  status: "running" | "installed_not_running" | "not_installed";
}

export interface OllamaBackendOptions {
  /** App 托管 Ollama 核心二进制（bin/ollama 或 ollama.exe）的根目录。 */
  managedBinaryDir?: string;
}

/**
 * 包装版 Ollama 后端：环境探测 / 流式 pull / list / remove / health / serve。
 *
 * 与之前不同，Vlawd 不再要求用户下载完整的 Ollama 安装包，而是：
 * 1. 自动从 Ollama 官方发布页拉取对应平台的核心二进制压缩包；
 * 2. 解压到 App 可写目录（managedBinaryDir）；
 * 3. 通过 `OLLAMA_MODELS` 环境变量把模型缓存指到用户选择的目录；
 * 4. 模型下载、缓存、运行仍交给 Ollama 自己处理。
 */
export class OllamaBackend implements ModelBackend {
  readonly id = "ollama" as const;
  readonly kind = "ollama" as const;
  readonly supportsPull = true;
  readonly baseUrl = DEFAULT_BASE_URL;
  readonly openaiEndpoint = `${DEFAULT_BASE_URL}/v1`;
  readonly installGuidanceUrl = INSTALL_GUIDANCE_URL;

  private readonly managedBinaryDir: string;

  constructor(options?: OllamaBackendOptions) {
    this.managedBinaryDir =
      options?.managedBinaryDir ?? join(homedir(), ".vlawd", "ollama-bin");
  }

  /** Ollama 可执行文件的绝对路径。 */
  binaryPath(): string {
    if (process.platform === "win32") {
      return join(this.managedBinaryDir, "ollama.exe");
    }
    return join(this.managedBinaryDir, "bin", "ollama");
  }

  async detect(signal?: AbortSignal): Promise<OllamaDetectResult> {
    const version = await this.version(signal);
    if (version !== null) {
      const installedModels = await this.listModels(signal).catch(() => []);
      return {
        status: "running",
        version,
        installedModels,
        message: `Ollama 运行中（v${version}），已安装 ${installedModels.length} 个模型。`
      };
    }
    const binaryPresent = await this.binaryInstalled();
    return {
      status: binaryPresent ? "installed_not_running" : "not_installed",
      installedModels: [],
      message: binaryPresent
        ? "Ollama 核心服务已就绪但未运行，选择下载目录后可由本 App 启动。"
        : "未检测到 Ollama，请点击下载核心服务。"
    };
  }

  async version(signal?: AbortSignal): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, { signal });
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as OllamaVersionResponse;
      return body.version ?? "unknown";
    } catch {
      return null;
    }
  }

  async listModels(signal?: AbortSignal): Promise<OllamaModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`, { signal });
    if (!response.ok) {
      throw new Error(`Ollama /api/tags responded ${response.status}`);
    }
    return parseOllamaTags((await response.json()) as OllamaTagsResponse);
  }

  async health(signal?: AbortSignal): Promise<boolean> {
    return (await this.version(signal)) !== null;
  }

  async remove(model: string, signal?: AbortSignal): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: "DELETE",
      signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: model })
    });
    if (!response.ok) {
      throw new Error(`删除模型失败：Ollama 返回 ${response.status}`);
    }
  }

  async pull(
    model: string,
    onProgress: (progress: ModelPullProgress) => void,
    signal?: AbortSignal
  ): Promise<ModelPullProgress> {
    const accumulator = new PullProgressAccumulator(model);
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: model, stream: true })
    });
    if (!response.ok || !response.body) {
      throw new Error(`拉取模型失败：Ollama 返回 ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let last: ModelPullProgress = {
      model,
      phase: "resolving",
      status: "pulling manifest",
      completedBytes: 0,
      totalBytes: 0,
      percent: 0,
      updatedAt: new Date().toISOString()
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) {
            continue;
          }
          let chunk: OllamaPullChunk;
          try {
            chunk = JSON.parse(line) as OllamaPullChunk;
          } catch {
            continue;
          }
          last = accumulator.ingest(chunk);
          onProgress(last);
          if (chunk.error) {
            throw new Error(chunk.error);
          }
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }

    if (last.phase !== "success") {
      last = { ...last, phase: "success", percent: 100, updatedAt: new Date().toISOString() };
      onProgress(last);
    }
    return last;
  }

  /** 检测本机是否安装 Ollama 可执行文件（优先 App 托管二进制，再回退 PATH）。 */
  async binaryInstalled(): Promise<boolean> {
    const managed = this.binaryPath();
    if (existsSync(managed)) {
      return true;
    }
    const command = process.platform === "win32" ? "where" : "which";
    try {
      const found = await new Promise<boolean>((resolve) => {
        const child = spawn(command, ["ollama"]);
        child.on("error", () => resolve(false));
        child.on("close", (code) => resolve(code === 0));
      });
      return found;
    } catch {
      return false;
    }
  }

  /**
   * 若 Ollama 已安装但未运行，用指定的模型目录启动后台 serve 进程。
   * 优先使用 App 托管的核心二进制；如不存在则尝试系统 PATH 中的 `ollama`。
   * 通过 `OLLAMA_MODELS` 把模型缓存指到用户选择的目录。
   */
  async ensureServing(modelsDir: string | undefined, signal?: AbortSignal): Promise<boolean> {
    if ((await this.version(signal)) !== null) {
      // 已有进程在跑（可能是用户自己启动的），不重复启动。
      return false;
    }
    const managed = this.binaryPath();
    const hasManaged = existsSync(managed);
    const hasSystem = await this.binaryInstalled();
    if (!hasManaged && !hasSystem) {
      return false;
    }
    const env = { ...process.env };
    if (modelsDir && modelsDir.trim()) {
      env.OLLAMA_MODELS = modelsDir;
    }
    const executable = hasManaged ? managed : "ollama";
    const child = spawn(executable, ["serve"], {
      env,
      detached: true,
      stdio: "ignore",
      cwd: this.managedBinaryDir
    });
    child.unref();

    // 轮询等待 API 就绪（最多约 6 秒）。
    for (let attempt = 0; attempt < 20; attempt++) {
      await delay(300);
      if ((await this.version(signal)) !== null) {
        return true;
      }
    }
    return false;
  }

  /**
   * 下载并解压 Ollama 核心二进制到 `managedBinaryDir`。
   * 平台对应包：
   * - Linux: `ollama-linux-<arch>.tar.zst`
   * - macOS: `ollama-darwin.tgz`
   * - Windows: `ollama-windows-<arch>.zip`
   */
  async downloadCoreBinary(signal?: AbortSignal): Promise<void> {
    const arch = process.arch === "arm64" ? "arm64" : "amd64";
    let url: string;
    let needsPowerShell = false;

    if (process.platform === "win32") {
      url = `https://ollama.com/download/ollama-windows-${arch}.zip`;
      needsPowerShell = true;
    } else if (process.platform === "darwin") {
      url = "https://ollama.com/download/ollama-darwin.tgz";
    } else {
      url = `https://ollama.com/download/ollama-linux-${arch}.tar.zst`;
    }

    // 清理旧二进制，确保解压后是一份干净的副本。
    try {
      rmSync(this.managedBinaryDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    mkdirSync(this.managedBinaryDir, { recursive: true });

    if (needsPowerShell) {
      await this.downloadAndExtractWindowsZip(url, signal);
    } else {
      await this.downloadAndExtractUnixTar(url, signal);
    }

    const binary = this.binaryPath();
    if (!existsSync(binary)) {
      throw new Error(`解压后未找到 Ollama 可执行文件：${binary}`);
    }
    if (process.platform !== "win32") {
      chmodSync(binary, 0o755);
    }
  }

  private downloadAndExtractUnixTar(url: string, signal?: AbortSignal): Promise<void> {
    const dest = this.managedBinaryDir;
    const shellCommand =
      process.platform === "darwin"
        ? `curl -fsSL --location "${url}" | tar -xzf - -C "${dest}"`
        : `set -euo pipefail; curl -fsSL --location "${url}" | zstd -d | tar -xf - -C "${dest}"`;

    return new Promise((resolve, reject) => {
      const child = spawn("bash", ["-c", shellCommand], { detached: false });
      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => reject(error));
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Ollama 核心服务下载失败（退出码 ${code ?? "未知"}）：${stderr.trim() || shellCommand}`));
        }
      });
      signal?.addEventListener("abort", () => {
        child.kill("SIGTERM");
      });
    });
  }

  private async downloadAndExtractWindowsZip(url: string, signal?: AbortSignal): Promise<void> {
    const dest = this.managedBinaryDir;
    const tempDir = join(tmpdir(), `vlawd-ollama-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    const archivePath = join(tempDir, "ollama.zip");

    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn("curl.exe", ["-L", "-o", archivePath, url], { detached: false });
        let stderr = "";
        child.stderr?.on("data", (chunk) => {
          stderr += chunk.toString();
        });
        child.on("error", (error) => reject(error));
        child.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`下载 Ollama 核心服务失败（退出码 ${code ?? "未知"}）：${stderr.trim()}`));
          }
        });
        signal?.addEventListener("abort", () => {
          child.kill("SIGTERM");
        });
      });

      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          "powershell.exe",
          [
            "-NoProfile",
            "-Command",
            `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${dest}' -Force`
          ],
          { detached: false }
        );
        let stderr = "";
        child.stderr?.on("data", (chunk) => {
          stderr += chunk.toString();
        });
        child.on("error", (error) => reject(error));
        child.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`解压 Ollama 核心服务失败（退出码 ${code ?? "未知"}）：${stderr.trim()}`));
          }
        });
      });
    } finally {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }

  /**
   * 在常见目录里查找已下载的 Ollama 安装器（`OllamaSetup.exe`）。
   * 保留方法以保持兼容，但新流程已改用 `downloadCoreBinary`。
   */
  findInstaller(extraDirs: string[] = []): string | null {
    for (const dir of ollamaInstallerSearchDirs(extraDirs)) {
      let entries: string[];
      try {
        if (!existsSync(dir)) {
          continue;
        }
        entries = readdirSync(dir);
      } catch {
        continue;
      }
      const match = pickOllamaInstaller(entries);
      if (match) {
        return join(dir, match);
      }
    }
    return null;
  }

  /**
   * 用已下载的安装器把 Ollama 静默安装到指定目录（Windows / Inno Setup）。
   * 保留方法以保持兼容，但新流程已改用 `downloadCoreBinary`。
   */
  async installSilently(installerPath: string, installDir?: string): Promise<void> {
    if (process.platform !== "win32") {
      throw new Error("代管安装当前仅支持 Windows。");
    }
    if (!existsSync(installerPath)) {
      throw new Error(`未找到安装器：${installerPath}`);
    }
    const args = buildOllamaInstallArgs(installDir);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(installerPath, args, { windowsHide: true });
      child.on("error", (error) => reject(error));
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`安装器退出码 ${code ?? "未知"}。`));
        }
      });
    });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
