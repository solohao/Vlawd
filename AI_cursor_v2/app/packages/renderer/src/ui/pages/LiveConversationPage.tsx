import { useState } from "react";
import type { DuplexLatencySample, ModelRuntimeState } from "@ai-cursor-v2/shared";
import { PageHeader, ToneBadge } from "../UiPrimitives.js";
import { HeadphonesIcon, MicIcon, PauseIcon, RefreshIcon, ShieldIcon } from "../icons.js";
import { useConversation } from "../../runtime/useConversation.js";

const STATE_LABELS: Record<ModelRuntimeState, { label: string; tone: "brand" | "warning" | "danger" | "neutral" }> = {
  listening: { label: "正在聆听", tone: "brand" },
  thinking: { label: "正在思考", tone: "warning" },
  speaking: { label: "正在回答", tone: "brand" },
  acting: { label: "正在执行", tone: "brand" },
  waiting_confirm: { label: "等待确认", tone: "warning" },
  paused: { label: "已暂停", tone: "neutral" },
  interrupted: { label: "已打断", tone: "danger" },
  complete: { label: "已完成", tone: "brand" }
};

const LATENCY_LABELS: Record<DuplexLatencySample["kind"], { label: string; target: string }> = {
  utterance_to_first_speech: { label: "首包延迟（说完→AI 开口）", target: "越低越好" },
  barge_in_to_output_stop: { label: "插话→AI 停止", target: "目标 < 200ms" },
  stop_signal_to_paused: { label: "本地停止→暂停", target: "目标 < 50ms" }
};

const PROVIDER_LABELS: Record<string, string> = {
  pipeline: "方案 B · 流式管线 (Qwen2.5)",
  "bayling-duplex": "方案 A · 原生全双工 (BayLing)",
  personaplex: "方案 A · PersonaPlex",
  moshi: "方案 A · Moshi",
  mock: "Mock（开发）"
};

function providerLabel(kind: string): string {
  return PROVIDER_LABELS[kind] ?? kind;
}

export function LiveConversationPage() {
  const convo = useConversation();
  const [draft, setDraft] = useState("");
  const { snapshot } = convo;
  const stateToken = STATE_LABELS[snapshot.runtimeState];

  const send = async () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    setDraft("");
    await convo.submit(text);
  };

  const latestByKind = new Map<string, DuplexLatencySample>();
  for (const sample of snapshot.latency) {
    latestByKind.set(sample.kind, sample);
  }

  return (
    <div className="min-h-full px-8 py-7">
      <PageHeader
        dark
        title="Cycle 1 · 实时全双工入口"
        subtitle="真实语音对话、自然插话、本地抢占。先跑方案 B 流式管线，可随时切换方案 A。"
        action={
          <div className="flex items-center gap-2">
            <ToneBadge dark tone={snapshot.usingRealInference ? "brand" : "warning"}>
              {snapshot.usingRealInference ? "真实推理" : "离线回退"}
            </ToneBadge>
            <ToneBadge dark tone={snapshot.providerConnected ? "brand" : "danger"}>
              {snapshot.providerConnected ? "Provider 已连接" : "Provider 未连接"}
            </ToneBadge>
          </div>
        }
      />

      {!convo.available && (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[12.5px] text-amber-200">
          未检测到桌面 Runtime（当前可能在浏览器预览模式）。请通过 Electron 启动应用体验实时对话。
        </div>
      )}

      {convo.available && !snapshot.usingRealInference && (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[12.5px] leading-relaxed text-amber-200">
          当前使用<strong>离线回退</strong>语气（非真实推理，不能作为 Cycle 1 通过证据）。要接入真实 Qwen2.5：在本机安装 Ollama 并运行
          <code className="mx-1 rounded bg-black/30 px-1">ollama pull qwen2.5:7b-instruct</code>
          后，到「模型中心」点击运行/健康检查。
        </div>
      )}

      <div className="mx-auto grid max-w-[1160px] grid-cols-[1fr_340px] gap-5">
        <section className="flex min-h-[520px] flex-col rounded-[22px] border border-ink-700 bg-ink-850/80 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-semibold text-white">对话</span>
              <ToneBadge dark tone={stateToken.tone}>
                {stateToken.label}
              </ToneBadge>
              {snapshot.paused && <ToneBadge dark tone="neutral">已暂停</ToneBadge>}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={snapshot.activeProviderKind}
                onChange={(event) => void convo.setProvider(event.target.value as never)}
                className="rounded-lg border border-ink-600 bg-ink-900 px-2.5 py-1.5 text-[12px] text-slate-200"
              >
                <option value={snapshot.activeProviderKind}>{providerLabel(snapshot.activeProviderKind)}</option>
                {snapshot.candidateProviderKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {providerLabel(kind)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void convo.checkHealth()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink-700 px-2.5 py-1.5 text-[12px] text-slate-200 hover:bg-ink-600"
              >
                <RefreshIcon width={13} height={13} /> 健康检查
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto rounded-xl bg-ink-900/60 p-4">
            {snapshot.turns.length === 0 && (
              <p className="text-[12.5px] text-slate-500">
                点击「连接对话入口」后，用麦克风或文字说出你的目标。AI 说话时你可以随时插话改需求，或说「停」。
              </p>
            )}
            {snapshot.turns.map((turn) => (
              <div key={turn.id} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    turn.role === "user"
                      ? "bg-brand-400 text-ink-900"
                      : "border border-ink-700 bg-ink-850 text-slate-200"
                  }`}
                >
                  {turn.text || <span className="text-slate-500">…</span>}
                  {turn.interrupted && (
                    <span className="mt-1 block text-[10.5px] text-rose-300">（已被打断）</span>
                  )}
                </div>
              </div>
            ))}
            {convo.interimTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl border border-dashed border-brand-400/40 px-3.5 py-2.5 text-[13px] text-slate-400">
                  {convo.interimTranscript}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => void convo.toggleMic()}
              disabled={!convo.micSupported || !convo.available}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-medium disabled:opacity-40 ${
                convo.micActive ? "bg-rose-500/90 text-white" : "bg-ink-700 text-slate-200 hover:bg-ink-600"
              }`}
              title={convo.micSupported ? "" : "当前环境不支持麦克风"}
            >
              <MicIcon width={15} height={15} /> {convo.micActive ? "停止麦克风" : "麦克风"}
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void send();
                }
              }}
              placeholder="输入指令并回车（AI 说话时输入即为自然插话）…"
              className="flex-1 rounded-xl border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-[13px] text-slate-200 outline-none focus:border-brand-400"
            />
            <button
              onClick={() => void send()}
              className="rounded-xl bg-brand-400 px-4 py-2.5 text-[13px] font-semibold text-ink-900 hover:bg-brand-300"
            >
              发送
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[22px] border border-ink-700 bg-ink-850/80 p-5">
            <h2 className="text-[14px] font-semibold text-white">连接与控制</h2>
            <button
              onClick={() => void convo.connect()}
              disabled={!convo.available}
              className="mt-3 w-full rounded-xl bg-brand-400 py-2.5 text-[13px] font-semibold text-ink-900 hover:bg-brand-300 disabled:opacity-40"
            >
              <span className="inline-flex items-center gap-1.5">
                <HeadphonesIcon /> 连接对话入口
              </span>
            </button>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={() => void convo.preempt("pause")}
                className="rounded-xl bg-ink-700 py-2 text-[12.5px] text-slate-200 hover:bg-ink-600"
              >
                <span className="inline-flex items-center gap-1">
                  <PauseIcon /> 停
                </span>
              </button>
              <button
                onClick={() => void convo.preempt("cancel")}
                className="rounded-xl bg-ink-700 py-2 text-[12.5px] text-rose-300 hover:bg-ink-600"
              >
                取消
              </button>
              <button
                onClick={() => void convo.resume()}
                className="rounded-xl bg-ink-700 py-2 text-[12.5px] text-slate-200 hover:bg-ink-600"
              >
                继续
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              「停/暂停/取消/退回」由本地规则引擎直接抢占，不经过 Provider。说「继续」可恢复。
            </p>
          </section>

          <section className="rounded-[22px] border border-ink-700 bg-ink-850/80 p-5">
            <div className="flex items-center gap-2">
              <ShieldIcon width={16} height={16} className="text-brand-400" />
              <h2 className="text-[14px] font-semibold text-white">延迟指标</h2>
            </div>
            <div className="mt-3 space-y-2">
              {(Object.keys(LATENCY_LABELS) as Array<DuplexLatencySample["kind"]>).map((kind) => {
                const sample = latestByKind.get(kind);
                return (
                  <div key={kind} className="rounded-xl bg-ink-900 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] text-slate-300">{LATENCY_LABELS[kind].label}</span>
                      <span className="text-[13px] font-semibold text-white">
                        {sample ? `${sample.ms}ms` : "—"}
                      </span>
                    </div>
                    <span className="text-[10.5px] text-slate-500">{LATENCY_LABELS[kind].target}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[22px] border border-ink-700 bg-ink-850/80 p-5">
            <h2 className="text-[14px] font-semibold text-white">音频能力</h2>
            <div className="mt-3 space-y-2 text-[12px]">
              <Capability label="麦克风 (getUserMedia + VAD)" ok={convo.micSupported} />
              <Capability label="浏览器语音识别 (ASR)" ok={convo.sttSupported} fallback="缺失时用文字输入" />
              <Capability label="系统语音合成 (TTS)" ok={convo.ttsSupported} />
            </div>
            {convo.micActive && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full bg-brand-400 transition-[width]"
                  style={{ width: `${Math.min(100, Math.round(convo.micLevel * 400))}%` }}
                />
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Capability({ label, ok, fallback }: { label: string; ok: boolean; fallback?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-ink-900 px-3 py-2">
      <span className="text-slate-300">{label}</span>
      <ToneBadge dark tone={ok ? "brand" : "warning"}>
        {ok ? "可用" : fallback ?? "不可用"}
      </ToneBadge>
    </div>
  );
}
