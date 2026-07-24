import { useState } from "react";
import { DemoBadge, PageHeader, ToneBadge } from "../UiPrimitives.js";
import { FileIcon, ShieldIcon } from "../icons.js";
import { Button, Card } from "../../design-system/index.js";
import { FeatureSection, FeatureStatusInspector } from "../../app/feature-status.js";

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-all duration-200 ${
        enabled
          ? "bg-gradient-to-r from-brand-500 to-brand-600 shadow-[0_0_8px_rgba(163,209,0,0.3)]"
          : "bg-slate-200 shadow-inner"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function SettingsPage() {
  const [telemetry, setTelemetry] = useState(false);
  const [retention, setRetention] = useState(true);

  return (
    <FeatureSection id="ui.settings" title="设置与隐私" autoReady={false} className="h-full">
    <div className="min-h-full px-8 py-7">
      <PageHeader
        title="设置与隐私"
        subtitle="控制本地数据、Session 保留、权限和界面主题。"
        action={<DemoBadge />}
      />
      <div className="grid grid-cols-[220px_minmax(520px,1fr)] gap-5">
        <Card variant="default" padding="sm" className="h-fit">
          {["通用", "隐私与数据", "Session 存储", "权限", "外观", "关于"].map((item, index) => (
            <Button
              key={item}
              variant={index === 1 ? "brandGhost" : "ghost"}
              size="sm"
              className={`w-full justify-start ${index === 1 ? "bg-brand-50 font-semibold" : ""}`}
            >
              {item}
            </Button>
          ))}
        </Card>

        <div className="space-y-4">
          <Card variant="default" padding="lg">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700 shadow-sm">
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
          </Card>

          <Card variant="default" padding="lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900">Session 存储</h2>
                <p className="mt-1 text-[11px] text-slate-500">本地加密目录 · 等待真实路径注入</p>
              </div>
              <ToneBadge tone="neutral">未配置</ToneBadge>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 shadow-sm">
              <FileIcon width={17} height={17} className="text-slate-400" />
              <span className="flex-1 text-[11.5px] text-slate-500">选择 Session 存储目录</span>
              <Button variant="secondary" size="sm">
                浏览
              </Button>
            </div>
          </Card>

          <Card variant="outline" padding="lg" className="border-rose-200 bg-rose-50/60">
            <h2 className="text-[14px] font-semibold text-rose-800">危险操作</h2>
            <p className="mt-1 text-[11px] text-rose-600">清除本地 Session 与缓存必须二次确认，且不会设计成自动倒计时通过。</p>
            <Button variant="destructive" size="default" className="mt-4">
              清除本地数据…
            </Button>
          </Card>
        </div>
      </div>
      <Card variant="default" padding="lg" className="mt-5">
        <h2 className="text-[14px] font-semibold text-slate-900">功能填色与使用频率</h2>
        <p className="mt-1 text-[11px] text-slate-500">手动确认功能是否真正可用，并按交互次数决定 UI 去留。</p>
        <FeatureStatusInspector className="mt-4" />
      </Card>
    </div>
    </FeatureSection>
  );
}
