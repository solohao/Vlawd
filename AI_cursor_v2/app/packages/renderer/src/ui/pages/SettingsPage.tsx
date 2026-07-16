import { useState } from "react";
import { DemoBadge, PageHeader, ToneBadge } from "../UiPrimitives.js";
import { FileIcon, ShieldIcon } from "../icons.js";

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-brand-500" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-1" : "-translate-x-4"
        }`}
      />
    </button>
  );
}

export function SettingsPage() {
  const [telemetry, setTelemetry] = useState(false);
  const [retention, setRetention] = useState(true);

  return (
    <div className="min-h-full px-8 py-7">
      <PageHeader
        title="设置与隐私"
        subtitle="控制本地数据、Session 保留、权限和界面主题。"
        action={<DemoBadge />}
      />
      <div className="grid grid-cols-[220px_minmax(520px,1fr)] gap-5">
        <aside className="rounded-[22px] border border-slate-200 bg-white p-3">
          {["通用", "隐私与数据", "Session 存储", "权限", "外观", "关于"].map((item, index) => (
            <button
              key={item}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-[12px] ${
                index === 1 ? "bg-brand-100 font-semibold text-brand-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          ))}
        </aside>
        <div className="space-y-4">
          <section className="rounded-[22px] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                <ShieldIcon width={19} height={19} />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900">隐私与数据</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">默认本地优先，敏感信息不进入设计示例。</p>
              </div>
            </div>
            <div className="mt-5 divide-y divide-slate-100">
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-[12.5px] font-medium text-slate-800">匿名体验数据</p>
                  <p className="mt-1 text-[10.5px] text-slate-400">帮助改进稳定性；默认关闭。</p>
                </div>
                <Toggle enabled={telemetry} onChange={() => setTelemetry(!telemetry)} />
              </div>
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-[12.5px] font-medium text-slate-800">保留 Session 审计记录</p>
                  <p className="mt-1 text-[10.5px] text-slate-400">保留事件、Evidence 和恢复锚点，不保存原始音频。</p>
                </div>
                <Toggle enabled={retention} onChange={() => setRetention(!retention)} />
              </div>
            </div>
          </section>
          <section className="rounded-[22px] border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900">Session 存储</h2>
                <p className="mt-1 text-[11px] text-slate-500">本地加密目录 · 等待真实路径注入</p>
              </div>
              <ToneBadge tone="neutral">未配置</ToneBadge>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <FileIcon width={17} height={17} className="text-slate-400" />
              <span className="flex-1 text-[11.5px] text-slate-500">选择 Session 存储目录</span>
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600">浏览</button>
            </div>
          </section>
          <section className="rounded-[22px] border border-rose-200 bg-rose-50 p-5">
            <h2 className="text-[14px] font-semibold text-rose-800">危险操作</h2>
            <p className="mt-1 text-[11px] text-rose-600">清除本地 Session 与缓存必须二次确认，且不会设计成自动倒计时通过。</p>
            <button className="mt-4 rounded-xl border border-rose-300 bg-white px-4 py-2 text-[11.5px] font-semibold text-rose-700">
              清除本地数据…
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
