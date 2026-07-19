import { spawn } from "node:child_process";
import { statfs } from "node:fs/promises";
import os from "node:os";
import type { DiskInfo, EnvironmentProbe, GpuInfo } from "@ai-cursor-v2/shared";
import { recommendFromResources } from "./ollama-catalog.js";

const BYTES_PER_GB = 1024 ** 3;

/**
 * 解析 `nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits`
 * 的输出（纯函数，便于单测）。示例行："NVIDIA GeForce RTX 4060, 8188, 7900"。
 */
export function parseNvidiaSmi(stdout: string): GpuInfo[] {
  const gpus: GpuInfo[] = [];
  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const parts = line.split(",").map((part) => part.trim());
    if (parts.length < 2) {
      continue;
    }
    const name = parts[0];
    const vramTotalMB = Number.parseInt(parts[1], 10);
    const vramFreeMB = parts.length >= 3 ? Number.parseInt(parts[2], 10) : Number.NaN;
    if (!name || Number.isNaN(vramTotalMB)) {
      continue;
    }
    gpus.push({
      name,
      vramTotalMB,
      vramFreeMB: Number.isNaN(vramFreeMB) ? 0 : vramFreeMB
    });
  }
  return gpus;
}

async function runCommand(
  command: string,
  args: string[],
  signal?: AbortSignal,
  timeoutMs = 4000
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let child;
    try {
      child = spawn(command, args, { signal });
    } catch (error) {
      reject(error);
      return;
    }
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout?.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr?.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

export async function detectGpus(signal?: AbortSignal): Promise<GpuInfo[]> {
  try {
    const { code, stdout } = await runCommand(
      "nvidia-smi",
      ["--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"],
      signal
    );
    if (code !== 0) {
      return [];
    }
    return parseNvidiaSmi(stdout);
  } catch {
    // 无 NVIDIA 驱动 / 命令不存在 / Apple Silicon 等：不视为错误，返回空列表。
    return [];
  }
}

export async function probeDisk(dirPath: string): Promise<DiskInfo | null> {
  try {
    const stats = await statfs(dirPath);
    const freeGB = (stats.bsize * stats.bavail) / BYTES_PER_GB;
    const totalGB = (stats.bsize * stats.blocks) / BYTES_PER_GB;
    return {
      path: dirPath,
      freeGB: Math.round(freeGB * 10) / 10,
      totalGB: Math.round(totalGB * 10) / 10
    };
  } catch {
    return null;
  }
}

export async function probeEnvironment(modelDir?: string, signal?: AbortSignal): Promise<EnvironmentProbe> {
  const totalRamGB = Math.round((os.totalmem() / BYTES_PER_GB) * 10) / 10;
  const freeRamGB = Math.round((os.freemem() / BYTES_PER_GB) * 10) / 10;
  const gpus = await detectGpus(signal);
  const disk = await probeDisk(modelDir && modelDir.trim() ? modelDir : os.homedir());
  const recommendation = recommendFromResources(gpus, totalRamGB);

  return {
    probedAt: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    cpuCores: os.cpus().length,
    totalRamGB,
    freeRamGB,
    gpus,
    disk,
    recommendedPresetId: recommendation.presetId,
    recommendedBrainModel: recommendation.brainModel,
    recommendationReason: recommendation.reason,
    canRunRealModel: recommendation.canRunRealModel
  };
}
