import { DemoBadge, PageHeader, ToneBadge } from "../UiPrimitives.js";
import { HeadphonesIcon, MicIcon, MonitorIcon, RefreshIcon, ShieldIcon } from "../icons.js";
import { Button, Card } from "../../design-system/index.js";

const devices = [
  { title: "输入设备", value: "未选择麦克风", icon: MicIcon, tone: "warning", level: 0 },
  { title: "输出设备", value: "未选择扬声器", icon: HeadphonesIcon, tone: "warning", level: 0 },
  { title: "桌面环境", value: "等待权限检查", icon: MonitorIcon, tone: "neutral", level: 0 }
] as const;

export function DevicesPage() {
  return (
    <div className="min-h-full px-8 py-7">
      <PageHeader
        title="设备中心"
        subtitle="管理对话输入、输出和桌面权限；真实枚举结果接入后替换 Demo 状态。"
        action={<DemoBadge />}
      />
      <div className="grid grid-cols-3 gap-4">
        {devices.map((device) => {
          const Icon = device.icon;
          return (
            <Card key={device.title} variant="default" padding="lg">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-100 text-brand-700 shadow-sm">
                  <Icon width={20} height={20} />
                </span>
                <ToneBadge tone={device.tone}>未连接</ToneBadge>
              </div>
              <h2 className="mt-5 text-[13px] font-semibold text-slate-900">{device.title}</h2>
              <p className="mt-1 text-[11.5px] text-slate-500">{device.value}</p>
              <div className="mt-4 flex h-7 items-center gap-1 rounded-xl bg-slate-50 px-3 shadow-inner">
                {Array.from({ length: 18 }, (_, index) => (
                  <span key={index} className="h-1 w-full rounded-full bg-slate-200" />
                ))}
              </div>
              <Button variant="secondary" size="default" className="mt-4 w-full gap-2">
                <RefreshIcon width={14} height={14} /> 检查设备
              </Button>
            </Card>
          );
        })}
      </div>
      <Card variant="default" padding="lg" className="mt-5 grid grid-cols-[1fr_300px] gap-5">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-900">本地停止通道</h2>
          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500">
            Provider 或网络异常时，暂停、取消和接管仍需要在本地立即生效。当前页面只展示目标交互，不声称音频抢占已接通。
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {["暂停调度", "Flush 输出", "用户接管"].map((item) => (
              <div key={item} className="rounded-xl bg-slate-50 px-3 py-3 shadow-sm">
                <ShieldIcon width={16} height={16} className="text-brand-700" />
                <p className="mt-2 text-[11.5px] font-medium text-slate-700">{item}</p>
                <p className="mt-1 text-[10px] text-slate-400">等待 Runtime 实现</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <p className="text-[12px] font-semibold">权限摘要</p>
          <div className="mt-3 space-y-2">
            {["麦克风", "扬声器", "屏幕读取", "辅助功能"].map((permission) => (
              <div key={permission} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 backdrop-blur-sm">
                <span className="text-[11px] text-slate-300">{permission}</span>
                <ToneBadge dark tone="neutral">未检查</ToneBadge>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
