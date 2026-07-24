/**
 * 设备感知的模型解析引擎（纯函数，可单测）。
 *
 * 核心思想：方案(preset)只描述"意图"（取向权重 + 是否强制本地 + 是否允许云端兜底），
 * 不写死具体模型。实际用哪些模型，由本函数在运行时结合"设备探测出的连续参数"
 * 与"模型目录里的硬件需求元数据"，通过可行性过滤 + 打分排序 + 显存预算联合分配
 * 求解得到。同一个意图在不同电脑上会解析出不同组合。
 *
 * 同一引擎有两个出口：
 * - 自动：`resolvePreset` 为一键就绪 / 切换方案产出组合；
 * - 手动：`rankSlot` 为编辑配置里每个角色的模型下拉排序 + 标注可运行性。
 */

import type { EnvironmentProbe } from "@ai-cursor-v2/shared";

export type Capability = "hearing" | "thinking" | "speaking";

/** 模型目录条目 + 硬件需求元数据。量化档作为独立条目（同 baseId）。 */
export interface ResolverModel {
  id: string;
  name: string;
  capability: Capability;
  /** 同一底座的不同量化版共享 baseId，用于"需降量化"自动降级。 */
  baseId: string;
  quant?: string;
  sizeGB: number;
  /** 能加载到显存的最低显存(MB)。 */
  minVramMB: number;
  /** 流畅运行的推荐显存(MB)。 */
  recVramMB: number;
  /** 无显卡时纯 CPU 运行所需内存(GB)。 */
  minRamGB: number;
  /** 能力质量分 0-100。 */
  quality: number;
  /** 相对速度分 0-100。 */
  speed: number;
  /** 中文能力分 0-100。 */
  chinese: number;
  /** 是否完全本地运行（false = 需云端，受隐私方案排除）。 */
  local: boolean;
}

export interface IntentTemplate {
  id: string;
  name: string;
  description: string;
  official: boolean;
  /** 取向偏好权重（quality/speed/chinese），无需归一，内部会归一。 */
  weights: { quality: number; speed: number; chinese: number };
  /** 强制全本地（排除云端模型）。 */
  requireLocal: boolean;
  /** 本地跑不动时是否允许建议云端兜底。 */
  allowCloudFallback: boolean;
  /** 展示用描述（配置页"关于当前配置"）。 */
  perf: string;
  privacy: string;
  scene: string;
}

export interface DeviceProfile {
  vramMB: number;
  ramGB: number;
  hasGpu: boolean;
  gpuName: string | null;
}

/** 单模型在某设备上的可运行性分级。 */
export type Runnability = "smooth" | "tight" | "cpu" | "insufficient";

export interface RankedModel {
  model: ResolverModel;
  runnability: Runnability;
  /** 只能靠 CPU 跑（会明显更慢）。 */
  onCpu: boolean;
  score: number;
  annotation: string;
}

export type SlotKey = "hearing" | "executionBrain" | "recordNotebook" | "speaking";

export interface ResolvedSlot {
  key: SlotKey;
  capability: Capability;
  model: ResolverModel | null;
  runnability: Runnability;
  onCpu: boolean;
  /** 本地无解、建议走云端时为 true。 */
  needsCloud: boolean;
  annotation: string;
}

export interface ResolvedConfig {
  slots: Record<SlotKey, ResolvedSlot>;
  notes: string[];
}

const USABLE_VRAM_RATIO = 0.9;

const RUNNABILITY_RANK: Record<Runnability, number> = {
  smooth: 3,
  tight: 2,
  cpu: 1,
  insufficient: 0
};

const ANNOTATION: Record<Runnability, string> = {
  smooth: "推荐 · 本机可流畅运行",
  tight: "可运行 · 显存较紧张",
  cpu: "可运行 · 仅 CPU，速度较慢",
  insufficient: "本机资源不足"
};

const CLOUD_ANNOTATION = "云端模型 · 需联网，作为本地跑不动时的兜底";

/**
 * 排序用的有效等级。云端模型（本地优先原则下）只作兜底：排在所有可运行的本地
 * 模型之后、不可运行的本地模型之前，绝不因为"分高/更快"就抢占默认位置。
 */
function effectiveRank(ranked: RankedModel): number {
  if (!ranked.model.local) {
    return ranked.runnability === "insufficient" ? 0 : 0.5;
  }
  return RUNNABILITY_RANK[ranked.runnability];
}

/** 从环境探测结果推导连续设备参数；无探测数据时回退到一个保守的中端假设。 */
export function deviceFromProbe(env: EnvironmentProbe | null): DeviceProfile {
  if (!env) {
    return { vramMB: 8192, ramGB: 16, hasGpu: true, gpuName: null };
  }
  const topGpu = env.gpus.reduce<{ vram: number; name: string | null }>(
    (best, gpu) => (gpu.vramTotalMB > best.vram ? { vram: gpu.vramTotalMB, name: gpu.name } : best),
    { vram: 0, name: null }
  );
  const hasGpu = topGpu.vram > 0;
  return {
    vramMB: topGpu.vram,
    ramGB: env.totalRamGB,
    hasGpu,
    gpuName: hasGpu ? topGpu.name : null
  };
}

/** 判定单个模型在设备上的可运行性分级。 */
export function classify(model: ResolverModel, device: DeviceProfile): Runnability {
  const vram = device.hasGpu ? Math.floor(device.vramMB * USABLE_VRAM_RATIO) : 0;
  if (device.hasGpu) {
    if (model.minVramMB === 0) {
      return "smooth";
    }
    if (vram >= model.recVramMB) {
      return "smooth";
    }
    if (vram >= model.minVramMB) {
      return "tight";
    }
  }
  if (device.ramGB >= model.minRamGB) {
    return "cpu";
  }
  return "insufficient";
}

function normalizedWeights(w: IntentTemplate["weights"]): IntentTemplate["weights"] {
  const sum = w.quality + w.speed + w.chinese;
  if (sum <= 0) {
    return { quality: 1 / 3, speed: 1 / 3, chinese: 1 / 3 };
  }
  return { quality: w.quality / sum, speed: w.speed / sum, chinese: w.chinese / sum };
}

/** 取向权重下的偏好得分 0-100（不含设备因素）。 */
export function scoreModel(model: ResolverModel, template: IntentTemplate): number {
  const w = normalizedWeights(template.weights);
  return model.quality * w.quality + model.speed * w.speed + model.chinese * w.chinese;
}

function toRanked(model: ResolverModel, template: IntentTemplate, device: DeviceProfile): RankedModel {
  const runnability = classify(model, device);
  return {
    model,
    runnability,
    onCpu: runnability === "cpu",
    score: scoreModel(model, template),
    annotation: model.local ? ANNOTATION[runnability] : CLOUD_ANNOTATION
  };
}

/**
 * 为某能力的候选模型排序 + 标注（手动选取出口）。
 * 排序：先按可运行性分级，再按取向得分。强制本地时排除云端模型。
 */
export function rankSlot(
  capability: Capability,
  catalog: ResolverModel[],
  template: IntentTemplate,
  device: DeviceProfile
): RankedModel[] {
  return catalog
    .filter((m) => m.capability === capability)
    .filter((m) => (template.requireLocal ? m.local : true))
    .map((m) => toRanked(m, template, device))
    .sort((a, b) => {
      const tier = effectiveRank(b) - effectiveRank(a);
      return tier !== 0 ? tier : b.score - a.score;
    });
}

/** GPU 上占用的显存（CPU 档不占显存）。 */
function vramCost(ranked: RankedModel): number {
  return ranked.runnability === "smooth" || ranked.runnability === "tight" ? ranked.model.minVramMB : 0;
}

function pickWithinBudget(candidates: RankedModel[], budgetMB: number): RankedModel | null {
  const runnable = candidates.filter((c) => c.runnability !== "insufficient");
  if (runnable.length === 0) {
    return null;
  }
  // 优先在显存预算内、能真正放上 GPU 的最优项（候选已按取向排序）。
  const gpuFit = runnable.find((c) => vramCost(c) > 0 && vramCost(c) <= budgetMB);
  if (gpuFit) {
    return gpuFit;
  }
  // 显存放不下时退到不占显存的 CPU/云端项（按排序取最优）。
  const zeroCost = runnable.find((c) => vramCost(c) === 0);
  if (zeroCost) {
    return zeroCost;
  }
  // 兜底：最省显存的可运行项（通常是更低量化档）。
  return [...runnable].sort((a, b) => vramCost(a) - vramCost(b))[0];
}

function emptySlot(key: SlotKey, capability: Capability, needsCloud: boolean, allowCloud: boolean): ResolvedSlot {
  return {
    key,
    capability,
    model: null,
    runnability: "insufficient",
    onCpu: false,
    needsCloud: needsCloud && allowCloud,
    annotation: needsCloud && allowCloud ? "本地无法运行 · 建议使用云端模型" : "本机资源不足"
  };
}

function toResolvedSlot(key: SlotKey, capability: Capability, ranked: RankedModel): ResolvedSlot {
  return {
    key,
    capability,
    model: ranked.model,
    runnability: ranked.runnability,
    onCpu: ranked.onCpu,
    needsCloud: false,
    annotation: ranked.annotation
  };
}

const SLOT_ORDER: { key: SlotKey; capability: Capability }[] = [
  { key: "executionBrain", capability: "thinking" },
  { key: "recordNotebook", capability: "thinking" },
  { key: "hearing", capability: "hearing" },
  { key: "speaking", capability: "speaking" }
];

/**
 * 自动解析出口：把意图模板 + 设备解析成一套实际组合。
 *
 * - `pipeline`（分步）：各角色错峰加载，逐个只需单独放得下即可。
 * - `duplex`（端到端/共驻）：多角色抢同一块显存，在总预算下联合分配——
 *   先给执行大脑留出其余角色的最小占用，再按 执行大脑→记录笔记本→听→说 依次扣减预算。
 */
export function resolvePreset(
  template: IntentTemplate,
  catalog: ResolverModel[],
  device: DeviceProfile,
  mode: "pipeline" | "duplex"
): ResolvedConfig {
  const notes: string[] = [];
  const slots = {} as Record<SlotKey, ResolvedSlot>;
  const rankedBySlot = SLOT_ORDER.map((s) => ({
    ...s,
    // 记录笔记本偏轻量：对思考类候选临时抬高速度权重，让它倾向选更省的模型。
    ranked: rankSlot(
      s.capability,
      catalog,
      s.key === "recordNotebook"
        ? { ...template, weights: { quality: 1, speed: 3, chinese: template.weights.chinese } }
        : template,
      device
    )
  }));

  if (mode === "pipeline" || !device.hasGpu) {
    for (const slot of rankedBySlot) {
      const pick = slot.ranked.find((c) => c.runnability !== "insufficient") ?? null;
      slots[slot.key] = pick
        ? toResolvedSlot(slot.key, slot.capability, pick)
        : emptySlot(slot.key, slot.capability, true, template.allowCloudFallback);
    }
  } else {
    let remaining = Math.floor(device.vramMB * USABLE_VRAM_RATIO);
    // 为其余角色预留其各自最省可运行项的显存，避免执行大脑吃满预算。
    const others = rankedBySlot.slice(1);
    const reserve = others.reduce((sum, s) => {
      const cheapest = pickWithinBudget(s.ranked, Number.MAX_SAFE_INTEGER);
      return sum + (cheapest ? vramCost(cheapest) : 0);
    }, 0);

    for (let i = 0; i < rankedBySlot.length; i += 1) {
      const slot = rankedBySlot[i];
      const budget = i === 0 ? Math.max(0, remaining - reserve) : remaining;
      const pick = pickWithinBudget(slot.ranked, i === 0 ? budget + 0 : budget);
      if (!pick) {
        slots[slot.key] = emptySlot(slot.key, slot.capability, true, template.allowCloudFallback);
        continue;
      }
      remaining -= vramCost(pick);
      slots[slot.key] = toResolvedSlot(slot.key, slot.capability, pick);
    }
  }

  if (!device.hasGpu) {
    notes.push("未检测到独立显卡，已为你选择可在 CPU 上运行的轻量模型。");
  }
  const cpuSlots = Object.values(slots).filter((s) => s.onCpu).length;
  if (device.hasGpu && cpuSlots > 0) {
    notes.push("部分角色显存不足，已回退到 CPU 运行，速度会较慢。");
  }
  const cloudSlots = Object.values(slots).filter((s) => s.needsCloud);
  if (cloudSlots.length > 0) {
    notes.push("本机性能有限，建议为部分角色启用云端模型以获得更好体验。");
  }
  const insufficient = Object.values(slots).filter((s) => !s.model && !s.needsCloud);
  if (insufficient.length > 0) {
    notes.push("本机无法满足该方案的最低要求，请尝试更轻量的方案。");
  }

  return { slots, notes };
}
