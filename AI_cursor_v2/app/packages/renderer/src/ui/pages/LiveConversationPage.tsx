import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { DuplexLatencySample, ModelRuntimeState } from "@ai-cursor-v2/shared";
import { AiEmployeeMascot } from "../Brand.js";
import {
  ArrowRight,
  CheckIcon,
  ChevronDown,
  CloseIcon,
  HandIcon,
  HeadphonesIcon,
  MicIcon,
  MonitorIcon,
  NodesIcon,
  PauseIcon,
  RefreshIcon,
  ShieldIcon
} from "../icons.js";
import { useConversation } from "../../runtime/useConversation.js";
import { useMarkFeature } from "../../app/feature-status.js";

const STATE_LABELS: Record<ModelRuntimeState, string> = {
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  acting: "Acting",
  waiting_confirm: "Waiting",
  paused: "Paused",
  interrupted: "Interrupted",
  complete: "Ready"
};

const LATENCY_LABELS: Record<DuplexLatencySample["kind"], { label: string; target: string }> = {
  utterance_to_first_speech: { label: "首包延迟（说完→AI 开口）", target: "越低越好" },
  barge_in_to_output_stop: { label: "插话→AI 停止", target: "目标 < 200ms" },
  stop_signal_to_paused: { label: "本地停止→暂停", target: "目标 < 50ms" }
};

const PROVIDER_LABELS: Record<string, string> = {
  pipeline: "方案 B · Qwen2.5 流式管线",
  "bayling-duplex": "方案 A · BayLing 原生全双工",
  personaplex: "方案 A · PersonaPlex",
  moshi: "方案 A · Moshi",
  "glm-4-voice": "GLM-4-Voice",
  "cloud-planner": "云端 Planner",
  mock: "Mock（开发验证）"
};

function providerLabel(kind: string): string {
  return PROVIDER_LABELS[kind] ?? kind;
}

function Waveform({ reverse = false, muted = false }: { reverse?: boolean; muted?: boolean }) {
  const bars = [0.4, 0.7, 0.35, 0.9, 0.55, 0.3, 0.75, 0.45];
  const seq = reverse ? [...bars].reverse() : bars;
  return (
    <div className="flex h-5 items-center gap-[3px]">
      {seq.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full ${muted ? "bg-slate-300" : "bg-brand-500"}`}
          style={{
            height: `${h * 100}%`,
            animation: muted ? undefined : `ai-pulse 1s ease-in-out ${i * 0.1}s infinite`
          }}
        />
      ))}
    </div>
  );
}

const card = "rounded-2xl border border-slate-200 bg-white";

export function LiveConversationPage({
  onBack,
  onOpenModels
}: {
  onBack?: () => void;
  onOpenModels?: () => void;
}) {
  const convo = useConversation();
  const { snapshot } = convo;
  const mark = useMarkFeature();
  const markedRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<"all" | "headset" | "mic" | "speaker">("all");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState<string | undefined>(undefined);
  const [selectedOutput, setSelectedOutput] = useState<string | undefined>(undefined);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (snapshot.turns.some((turn) => turn.role === "assistant" && turn.text.trim()) && !markedRef.current) {
      markedRef.current = true;
      mark("ui.conversation", "done");
    }
  }, [snapshot.turns, mark]);

  const connected = entered && convo.available && !!snapshot.sessionId;
  const active = connected && (snapshot.runtimeState === "speaking" || snapshot.runtimeState === "listening" || snapshot.runtimeState === "thinking");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    navigator.mediaDevices
      .enumerateDevices()
      .then((list) => {
        const audio = list.filter((d) => d.kind === "audioinput" || d.kind === "audiooutput");
        setDevices(audio);
        setSelectedInput((prev) => prev ?? audio.find((d) => d.kind === "audioinput")?.deviceId);
        setSelectedOutput((prev) => prev ?? audio.find((d) => d.kind === "audiooutput")?.deviceId);
      })
      .catch(() => undefined);
  }, [convo.micActive]);

  const realInference = snapshot.providerConnected && snapshot.usingRealInference;
  const readyLabel = !convo.available
    ? { text: "未连接 Runtime（浏览器预览）", tone: "idle" as const }
    : realInference
      ? { text: "AI 员工已就绪", tone: "ready" as const }
      : { text: "离线回退模式", tone: "warn" as const };

  const startVoice = async () => {
    setEntered(true);
    const afterConnect = await convo.connect();
    const realInferenceNow = afterConnect.providerConnected && afterConnect.usingRealInference;
    // Cycle 1 必须真实 Provider；未就绪时引导到模型中心。
    if (convo.available && !realInferenceNow) {
      onOpenModels?.();
      return;
    }
    if (convo.micSupported && !convo.micActive) {
      if (selectedInput) convo.selectInputDevice(selectedInput);
      if (selectedOutput) convo.selectOutputDevice(selectedOutput);
      await convo.toggleMic();
    }
  };

  const startManual = async () => {
    const afterConnect = await convo.connect();
    // 没有真实 Provider 时引导到模型中心，不再自动切 mock。
    const realInference = afterConnect.providerConnected && afterConnect.usingRealInference;
    if (convo.available && !realInference) {
      onOpenModels?.();
      return;
    }
    setEntered(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setEntered(true);
    if (!connected) await convo.connect();
    await convo.submit(text);
  };

  const latestByKind = new Map<string, DuplexLatencySample>();
  for (const sample of convo.latency) latestByKind.set(sample.kind, sample);

  return (
    <div className="px-8 py-7">
      {/* header */}
      <header className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="back"
              >
                <ArrowRight width={18} height={18} className="rotate-180" />
              </button>
            )}
            <h1 className="text-[24px] font-bold text-slate-900">对话入口选择</h1>
            <MicIcon width={20} height={20} className="text-brand-500" />
          </div>
          <p className="mt-1.5 pl-11 text-[13.5px] text-slate-500">
            选择与你对话的输入 / 输出设备，开始通过语音监督 AI 执行任务。
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              readyLabel.tone === "ready" ? "bg-brand-500" : readyLabel.tone === "warn" ? "bg-amber-500" : "bg-slate-400"
            }`}
          />
          {readyLabel.text}
        </span>
      </header>

      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          {/* hero — presence + live runtime state */}
          <section className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-brand-50/40 to-white px-6 pb-6 pt-4">
            <svg
              className="pointer-events-none absolute left-0 right-0 top-[118px] w-full text-brand-400/50"
              height="40"
              viewBox="0 0 1200 40"
              preserveAspectRatio="none"
            >
              <path
                d="M0 20 Q 60 6 120 20 T 240 20 T 360 20 T 480 20 T 600 20 T 720 20 T 840 20 T 960 20 T 1080 20 T 1200 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="3 4"
              />
            </svg>
            <div className="relative flex flex-col items-center">
              <AiEmployeeMascot size={128} />
              <div className="mt-1 flex items-center gap-3">
                <Waveform muted={!active && !convo.ttsSpeaking} />
                <span className="text-[16px] font-medium text-slate-700">
                  {convo.whisperLoading
                    ? `加载模型：${convo.whisperLoading.status}${convo.whisperLoading.progress != null ? ` ${Math.round(convo.whisperLoading.progress * 100)}%` : ""}`
                    : connected
                      ? `${STATE_LABELS[snapshot.runtimeState]}…`
                      : "待命中"}
                </span>
                <Waveform reverse muted={!active && !convo.ttsSpeaking} />
              </div>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-[12px] font-medium text-brand-700">
                <ShieldIcon width={13} height={13} /> 安全抢占已启用
              </span>
              <p className="mt-2 text-center text-[12.5px] text-slate-500">
                你可以随时说：「暂停」、「取消」、「停止」，AI 将立即响应。
              </p>
            </div>
          </section>

          {connected ? (
            <LiveConversationPanel convo={convo} draft={draft} setDraft={setDraft} send={send} latestByKind={latestByKind} />
          ) : (
            <>
              {/* 推荐配置 */}
              <h2 className="mb-3 text-[14px] font-semibold text-slate-800">推荐配置（为你优化的最佳体验）</h2>
              <div className="mb-6 flex items-stretch gap-3">
                <ConfigCard
                  icon={<MicIcon width={18} height={18} />}
                  label="输入设备"
                  device={devices.find((d) => d.deviceId === selectedInput)?.label || devices.find((d) => d.kind === "audioinput")?.label || "系统默认麦克风"}
                  status={selectedInput ? "已选择" : "默认"}
                />
                <div className="flex flex-col items-center justify-center text-slate-300">
                  <ArrowRight width={16} height={16} />
                  <ArrowRight width={16} height={16} className="rotate-180" />
                </div>
                <ConfigCard
                  icon={<HeadphonesIcon width={18} height={18} />}
                  label="输出设备"
                  device={devices.find((d) => d.deviceId === selectedOutput)?.label || devices.find((d) => d.kind === "audiooutput")?.label || "系统默认扬声器"}
                  status={selectedOutput ? "已选择" : "默认"}
                />
                <button
                  onClick={() => void startVoice()}
                  disabled={!convo.available}
                  className="flex-1 rounded-2xl border border-brand-400 bg-brand-50/60 p-4 text-left transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] text-slate-500">对话体验</span>
                    <span className="rounded-md bg-brand-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                      推荐
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-400/15 text-brand-600">
                      <Waveform muted />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-slate-900">语音对话</p>
                      <p className="text-[11px] text-slate-500">自然语音输入与 AI 回复</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* 可用设备 */}
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-slate-800">可用设备</h2>
              </div>
              <div className="mb-3 flex gap-2">
                {(
                  [
                    ["all", "全部设备"],
                    ["headset", "耳机设备"],
                    ["mic", "麦克风"],
                    ["speaker", "扬声器"]
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setDeviceFilter(id)}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${
                      deviceFilter === id
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className={`${card} divide-y divide-slate-100`}>
                {devices
                  .filter((device) => {
                    if (deviceFilter === "all") return true;
                    if (deviceFilter === "mic") return device.kind === "audioinput";
                    if (deviceFilter === "speaker") return device.kind === "audiooutput";
                    const label = device.label.toLowerCase();
                    return (
                      device.kind === "audioinput" &&
                      (label.includes("bluetooth") || label.includes("headset") || label.includes("耳机"))
                    );
                  })
                  .map((device) => {
                    const isInput = device.kind === "audioinput";
                    const isSelected = isInput
                      ? device.deviceId === selectedInput
                      : device.deviceId === selectedOutput;
                    return (
                      <DeviceRow
                        key={device.deviceId}
                        icon={isInput ? <MicIcon width={18} height={18} /> : <HeadphonesIcon width={18} height={18} />}
                        name={device.label || (isInput ? "麦克风" : "扬声器")}
                        badge={isSelected ? "已选" : undefined}
                        sub={isInput ? "音频输入" : "音频输出"}
                        action={
                          <button
                            onClick={() => {
                              if (isInput) {
                                setSelectedInput(device.deviceId);
                                convo.selectInputDevice(device.deviceId);
                              } else {
                                setSelectedOutput(device.deviceId);
                                convo.selectOutputDevice(device.deviceId);
                              }
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50"
                          >
                            选择
                          </button>
                        }
                      />
                    );
                  })}
                <DeviceRow
                  icon={<MonitorIcon width={18} height={18} />}
                  name="手动输入"
                  sub="通过键盘手动指令"
                  action={<button onClick={() => void startManual()} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50">选择</button>}
                />
              </div>
              <div className="mt-3 text-center text-[12px] text-slate-400">
                未找到设备？
                <button className="ml-1 inline-flex items-center gap-1 text-brand-600">
                  <RefreshIcon width={12} height={12} /> 重新扫描
                </button>
              </div>
            </>
          )}
        </div>

        {/* right rail */}
        <aside className="w-[300px] shrink-0 space-y-4">
          <section className={`${card} p-4`}>
            <p className="mb-3 text-[13px] font-semibold text-slate-800">如何使用语音监督 AI</p>
            <div className="space-y-3.5">
              <Step icon={<MicIcon width={15} height={15} />} title="1. 选择对话入口" desc="选择适合你的麦克风和扬声器设备" />
              <Step icon={<NodesIcon width={15} height={15} />} title="2. 开始对话" desc="清晰表达你的目标和需求" />
              <Step icon={<MonitorIcon width={15} height={15} />} title="3. 监督 AI 执行" desc="AI 提出步骤，你进行确认或调整" />
              <Step icon={<CheckIcon width={15} height={15} />} title="4. 完成任务" desc="AI 执行完成，生成结果和记录" />
            </div>
          </section>

          <section className={`${card} p-4`}>
            <p className="mb-3 text-[13px] font-semibold text-slate-800">安全抢占能力（始终开启）</p>
            <div className="space-y-1">
              <PreemptRow
                icon={<PauseIcon />}
                tone="text-amber-600"
                title="暂停"
                desc="暂停当前执行"
                onClick={() => void convo.preempt("pause")}
                disabled={!convo.available}
              />
              <PreemptRow
                icon={<CloseIcon width={15} height={15} />}
                tone="text-rose-600"
                title="取消"
                desc="取消当前任务"
                onClick={() => void convo.preempt("cancel")}
                disabled={!convo.available}
              />
              <PreemptRow
                icon={<span className="block h-3 w-3 rounded-[3px] bg-current" />}
                tone="text-rose-600"
                title="停止"
                desc="立即停止所有操作"
                onClick={() => void convo.preempt("cancel")}
                disabled={!convo.available}
              />
              <PreemptRow
                icon={<HandIcon />}
                tone="text-slate-600"
                title="继续 / 接管"
                desc="说「继续」恢复，或手动接管"
                onClick={() => void convo.resume()}
                disabled={!convo.available}
              />
            </div>
          </section>

          <section className={`${card} bg-slate-50/60 p-4`}>
            <div className="mb-1.5 flex items-center gap-2">
              <ShieldIcon width={16} height={16} className="text-brand-600" />
              <span className="text-[13px] font-semibold text-slate-800">本地安全防护已激活</span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-slate-500">
              Safety Engine 实时监控风险操作，「停/暂停/取消」由本地规则引擎直接抢占，不经过 Provider。
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function LiveConversationPanel({
  convo,
  draft,
  setDraft,
  send,
  latestByKind
}: {
  convo: ReturnType<typeof useConversation>;
  draft: string;
  setDraft: (v: string) => void;
  send: () => Promise<void>;
  latestByKind: Map<string, DuplexLatencySample>;
}) {
  const { snapshot } = convo;
  const realInference = snapshot.providerConnected && snapshot.usingRealInference;
  return (
    <div className="space-y-4">
      <section className={`${card} flex min-h-[360px] flex-col p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-slate-800">实时对话</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                realInference ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {realInference ? "真实推理" : "离线回退"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={snapshot.activeProviderKind}
                onChange={(event) => void convo.setProvider(event.target.value as never)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-7 text-[12px] text-slate-700"
              >
                <option value={snapshot.activeProviderKind}>{providerLabel(snapshot.activeProviderKind)}</option>
                {snapshot.candidateProviderKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {providerLabel(kind)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <button
              onClick={() => void convo.checkHealth()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-slate-50"
            >
              <RefreshIcon width={13} height={13} /> 健康检查
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-xl bg-slate-50/70 p-4">
          {snapshot.turns.length === 0 && (
            <p className="text-[12.5px] text-slate-500">
              用麦克风或文字说出你的目标。AI 说话时你可以随时插话改需求，或说「停」。
            </p>
          )}
          {snapshot.turns.map((turn) => (
            <div key={turn.id} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  turn.role === "user" ? "bg-brand-400 text-ink-900" : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {turn.text || <span className="text-slate-400">…</span>}
                {turn.interrupted && <span className="mt-1 block text-[10.5px] text-rose-500">（已被打断）</span>}
              </div>
            </div>
          ))}
          {convo.interimTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl border border-dashed border-brand-400/50 px-3.5 py-2.5 text-[13px] text-slate-400">
                {convo.interimTranscript}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => void convo.toggleMic()}
            disabled={!convo.micSupported}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-medium disabled:opacity-40 ${
              convo.micActive ? "bg-rose-500 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title={convo.micSupported ? "" : "当前环境不支持麦克风"}
          >
            <MicIcon width={15} height={15} /> {convo.micActive ? "停止麦克风" : "麦克风"}
          </button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void send();
            }}
            placeholder="输入指令并回车（AI 说话时输入即为自然插话）…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-700 outline-none focus:border-brand-400"
          />
          <button
            onClick={() => void send()}
            className="rounded-xl bg-brand-400 px-4 py-2.5 text-[13px] font-semibold text-ink-900 hover:bg-brand-300"
          >
            发送
          </button>
        </div>
      </section>

      <section className={`${card} p-4`}>
        <div className="mb-3 flex items-center gap-2">
          <ShieldIcon width={16} height={16} className="text-brand-600" />
          <span className="text-[14px] font-semibold text-slate-800">延迟指标</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(LATENCY_LABELS) as Array<DuplexLatencySample["kind"]>).map((kind) => {
            const sample = latestByKind.get(kind);
            return (
              <div key={kind} className="rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="text-[16px] font-semibold text-slate-900">{sample ? `${sample.ms}ms` : "—"}</div>
                <div className="mt-1 text-[10.5px] leading-tight text-slate-500">{LATENCY_LABELS[kind].label}</div>
                <div className="mt-0.5 text-[10px] text-slate-400">{LATENCY_LABELS[kind].target}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ConfigCard({
  icon,
  label,
  device,
  status
}: {
  icon: ReactNode;
  label: string;
  device: string;
  status: string;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-slate-500">{label}</span>
        <ChevronDown className="text-slate-400" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-400/15 text-brand-600">{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-slate-900">{device}</p>
          <span className="inline-flex items-center gap-1 text-[11px] text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

function DeviceRow({
  icon,
  name,
  badge,
  sub,
  action
}: {
  icon: ReactNode;
  name: string;
  badge?: string;
  sub: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-medium text-slate-800">{name}</span>
          {badge && (
            <span className="rounded-md bg-brand-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">{badge}</span>
          )}
        </div>
        <p className="mt-0.5 text-[11.5px] text-slate-400">{sub}</p>
      </div>
      {action}
    </div>
  );
}

function Step({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-400/15 text-brand-600">
        {icon}
      </span>
      <div>
        <p className="text-[12.5px] font-medium text-slate-700">{title}</p>
        <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function PreemptRow({
  icon,
  tone,
  title,
  desc,
  onClick,
  disabled
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 disabled:opacity-50"
    >
      <span className={`grid h-7 w-7 shrink-0 place-items-center ${tone}`}>{icon}</span>
      <span className="leading-tight">
        <span className={`block text-[12.5px] font-medium ${tone}`}>{title}</span>
        <span className="block text-[11px] text-slate-400">{desc}</span>
      </span>
    </button>
  );
}
