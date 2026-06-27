import type { ModelRuntimeState } from "@ai-cursor-v2/shared";
import { runtimeStateToken } from "../../brand/ai-employee.js";
import { AiEmployeeMascot } from "../Brand.js";
import { ChevronDown, CloseIcon, GearIcon, HandIcon, HeadphonesIcon, PauseIcon, ShieldIcon } from "../icons.js";

function Waveform({ side }: { side: "left" | "right" }) {
  const bars = [0.5, 0.85, 0.4, 1, 0.65, 0.3];
  const seq = side === "left" ? bars : [...bars].reverse();
  return (
    <div className="flex h-5 items-center gap-[3px]">
      {seq.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-brand-400"
          style={{
            height: `${h * 100}%`,
            animation: `ai-pulse 1s ease-in-out ${i * 0.12}s infinite`
          }}
        />
      ))}
    </div>
  );
}

interface VoiceControllerProps {
  runtimeState?: ModelRuntimeState;
  device?: string;
}

export function VoiceController({ runtimeState = "listening", device = "Bose QC Ultra" }: VoiceControllerProps) {
  const token = runtimeStateToken(runtimeState);
  return (
    <div className="w-[392px] select-none">
      <div className="rounded-2xl border border-ink-700 bg-ink-900/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {/* header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-400">
              <span className="h-2 w-2 rounded-full bg-ink-900" />
            </span>
            <span className="text-[13px] font-semibold text-white">AI Cursor</span>
            <span className="rounded bg-brand-400/20 px-1.5 py-0.5 text-[9px] font-bold text-brand-400">V2</span>
          </div>
          <button className="text-slate-500 hover:text-slate-300">
            <CloseIcon width={16} height={16} />
          </button>
        </div>

        {/* state row */}
        <div className="flex items-center gap-3">
          <AiEmployeeMascot size={52} variant="runtime" />
          <Waveform side="left" />
          <span className="text-[18px] font-medium text-white">{token.label}…</span>
          <div className="ml-auto flex items-center gap-3">
            <Waveform side="right" />
            <button className="text-slate-500 hover:text-slate-300">
              <GearIcon width={16} height={16} />
            </button>
          </div>
        </div>

        {/* meta row */}
        <div className="mt-3 flex items-center gap-4 text-[12px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <HeadphonesIcon className="text-slate-500" />
            {device}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldIcon width={14} height={14} className="text-brand-400" />
            Safety Engine 已开启
          </span>
        </div>

        {/* controls */}
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
          <button className="flex items-center justify-center gap-1.5 rounded-xl bg-ink-700 py-2.5 text-[13px] font-medium text-slate-200 hover:bg-ink-600">
            <PauseIcon /> 暂停
          </button>
          <button className="flex items-center justify-center gap-1.5 rounded-xl bg-ink-700 py-2.5 text-[13px] font-medium text-rose-300 hover:bg-ink-600">
            <CloseIcon width={15} height={15} /> 取消
          </button>
          <button className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-400 px-4 py-2.5 text-[13px] font-semibold text-ink-900 hover:bg-brand-300">
            <HandIcon /> 接管
            <ChevronDown width={14} height={14} />
          </button>
        </div>
      </div>

      {/* detached prompt bubble */}
      <div className="mt-2 ml-6 w-[300px] rounded-2xl rounded-tl-md border border-ink-700 bg-ink-850/95 p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-slate-200">我在听，请说出你的指令…</p>
          <Waveform side="right" />
        </div>
        <p className="mt-1.5 text-[11.5px] text-slate-500">例如：「帮我整理这份文档」、「查找上周的邮件」</p>
      </div>
    </div>
  );
}
