import { useState } from "react";
import { DemoBadge, PageHeader, ToneBadge } from "../UiPrimitives.js";
import { HeadphonesIcon, MicIcon, MonitorIcon, ShieldIcon } from "../icons.js";

const options = [
  {
    id: "headset",
    title: "耳机全双工",
    description: "适合自然对话与插话；麦克风和输出均使用同一耳机。",
    device: "未选择耳机",
    icon: HeadphonesIcon
  },
  {
    id: "computer",
    title: "电脑麦克风与扬声器",
    description: "适合桌面环境；开始前会检查回声与系统权限。",
    device: "系统默认设备",
    icon: MonitorIcon
  },
  {
    id: "manual",
    title: "文字监督模式",
    description: "不启用音频，仅使用文字输入验证 Workspace 和状态流。",
    device: "无需音频设备",
    icon: MicIcon
  }
] as const;

export function ConversationEntryPage({ onContinue }: { onContinue: () => void }) {
  const [selected, setSelected] = useState<(typeof options)[number]["id"]>("headset");

  return (
    <div className="min-h-full px-8 py-7">
      <PageHeader
        dark
        title="选择对话入口"
        subtitle="先明确输入与输出设备，再进入受监督任务空间。"
        action={<DemoBadge dark />}
      />
      <div className="mx-auto grid max-w-[1120px] grid-cols-[1fr_340px] gap-5">
        <section className="rounded-[22px] border border-ink-700 bg-ink-850/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-white">对话方式</h2>
              <p className="mt-1 text-[12px] text-slate-500">真实设备枚举接入前，选项只用于 UI 演示。</p>
            </div>
            <ToneBadge dark tone="warning">权限尚未检查</ToneBadge>
          </div>
          <div className="space-y-3">
            {options.map((option) => {
              const Icon = option.icon;
              const active = option.id === selected;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelected(option.id)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                    active
                      ? "border-brand-400 bg-brand-400/8"
                      : "border-ink-700 bg-ink-900/60 hover:border-ink-600"
                  }`}
                >
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                      active ? "bg-brand-400 text-ink-900" : "bg-ink-700 text-slate-400"
                    }`}
                  >
                    <Icon width={21} height={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-white">{option.title}</span>
                    <span className="mt-1 block text-[12px] text-slate-500">{option.description}</span>
                    <span className="mt-2 block text-[11px] text-slate-400">{option.device}</span>
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 ${
                      active ? "border-brand-400 bg-brand-400 shadow-[inset_0_0_0_3px_#141916]" : "border-ink-600"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <button
            onClick={onContinue}
            className="mt-5 w-full rounded-xl bg-brand-400 py-3 text-[13px] font-semibold text-ink-900 hover:bg-brand-300"
          >
            进入任务空间预览
          </button>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[22px] border border-ink-700 bg-ink-850/80 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-400/12 text-brand-400">
              <ShieldIcon width={20} height={20} />
            </span>
            <h2 className="mt-4 text-[14px] font-semibold text-white">本地控制始终优先</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
              暂停、取消、停止和接管不会被设计成 Provider 侧动作。真实 Runtime 接入后，这些控制仍需通过本地安全通道生效。
            </p>
          </section>
          <section className="rounded-[22px] border border-ink-700 bg-ink-850/80 p-5">
            <h2 className="text-[14px] font-semibold text-white">开始前检查</h2>
            <div className="mt-3 space-y-2">
              {["麦克风权限", "输出设备", "本地停止通道", "Session 存储"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-xl bg-ink-900 px-3 py-2.5">
                  <span className="text-[12px] text-slate-300">{item}</span>
                  <ToneBadge dark tone="neutral">待接入</ToneBadge>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
