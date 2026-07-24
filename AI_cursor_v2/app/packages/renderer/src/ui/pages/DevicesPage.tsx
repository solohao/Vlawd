import { DemoBadge, PageHeader, ToneBadge } from "../UiPrimitives.js";
import { HeadphonesIcon, MicIcon, MonitorIcon, RefreshIcon, ShieldIcon } from "../icons.js";
import { Button, Card } from "../../design-system/index.js";
import { useDesktopRuntime } from "../../runtime/useDesktopRuntime.js";
import { FeatureSection } from "../../app/feature-status.js";

const kindLabels: Record<string, string> = {
  "bluetooth-headset": "蓝牙耳机",
  "wired-headset": "有线耳机",
  "built-in-mic": "内置麦克风",
  "built-in-speaker": "内置扬声器",
  virtual: "虚拟设备"
};

function DeviceCard({
  icon: Icon,
  title,
  value,
  connected,
  onAction,
  busy,
  actionLabel
}: {
  icon: typeof MicIcon;
  title: string;
  value: string;
  connected: boolean;
  onAction: () => void;
  busy: boolean;
  actionLabel: string;
}): JSX.Element {
  return (
    <Card variant="default" padding="lg">
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-100 text-brand-700 shadow-sm">
          <Icon width={20} height={20} />
        </span>
        <ToneBadge tone={connected ? "brand" : "warning"}>{connected ? "已连接" : "未连接"}</ToneBadge>
      </div>
      <h2 className="mt-5 text-[13px] font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-[11.5px] text-slate-500">{value || "未选择设备"}</p>
      <div className="mt-4 flex h-7 items-center gap-1 rounded-xl bg-slate-50 px-3 shadow-inner">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} className="h-1 w-full rounded-full bg-slate-200" />
        ))}
      </div>
      <Button variant="secondary" size="default" className="mt-4 w-full gap-2" onClick={() => void onAction()} disabled={busy}>
        <RefreshIcon width={14} height={14} /> {actionLabel}
      </Button>
    </Card>
  );
}

export function DevicesPage(): JSX.Element {
  const desktop = useDesktopRuntime();
  const { snapshot, busy, connectAudio, refresh } = desktop;
  const { audio, runtimeState } = snapshot;

  const inputLabel = audio.route?.config?.input?.label || "";
  const outputLabel = audio.route?.config?.output?.label || "";

  const permissionItems = [
    { name: "麦克风", ok: audio.connected },
    { name: "扬声器", ok: audio.connected },
    { name: "屏幕读取", ok: false },
    { name: "辅助功能", ok: false }
  ];

  return (
    <FeatureSection id="ui.devices" title="设备中心" className="h-full">
    <div className="min-h-full px-8 py-7">
      <PageHeader
        title="设备中心"
        subtitle="管理对话输入、输出和桌面权限；连接音频后启用语音入口。"
        action={<DemoBadge />}
      />
      <div className="grid grid-cols-3 gap-4">
        <DeviceCard
          icon={MicIcon}
          title="输入设备"
          value={inputLabel}
          connected={audio.connected}
          onAction={connectAudio}
          busy={busy}
          actionLabel={audio.connected ? "重新连接音频" : "连接音频"}
        />
        <DeviceCard
          icon={HeadphonesIcon}
          title="输出设备"
          value={outputLabel}
          connected={audio.connected}
          onAction={connectAudio}
          busy={busy}
          actionLabel={audio.connected ? "重新连接音频" : "连接音频"}
        />
        <DeviceCard
          icon={MonitorIcon}
          title="桌面环境"
          value={`${runtimeState} · ${audio.message}`}
          connected={false}
          onAction={refresh}
          busy={busy}
          actionLabel="刷新状态"
        />
      </div>

      <Card variant="default" padding="lg" className="mt-5 grid grid-cols-[1fr_300px] gap-5">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-900">本地停止通道</h2>
          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500">
            Provider 或网络异常时，暂停、取消和接管仍需要在本地立即生效。当前页面已接入 runtime 快照。
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "暂停调度", onClick: () => void desktop.pauseSession() },
              { label: "Flush 输出", onClick: () => void desktop.cancelSession() },
              { label: "用户接管", onClick: () => void desktop.executeRuntimeAction() }
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                disabled={busy}
                className="rounded-xl bg-slate-50 px-3 py-3 text-left shadow-sm hover:bg-slate-100 disabled:opacity-50"
              >
                <ShieldIcon width={16} height={16} className="text-brand-700" />
                <p className="mt-2 text-[11.5px] font-medium text-slate-700">{item.label}</p>
                <p className="mt-1 text-[10px] text-slate-400">点击触发</p>
              </button>
            ))}
          </div>
          {audio.devices.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-[11.5px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">设备</th>
                    <th className="px-3 py-2 font-medium">类型</th>
                    <th className="px-3 py-2 font-medium text-right">方向</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audio.devices.map((device) => (
                    <tr key={device.id}>
                      <td className="px-3 py-2 text-slate-700">{device.label || device.id}</td>
                      <td className="px-3 py-2 text-slate-500">{kindLabels[device.kind] || device.kind}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{device.directions.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <p className="text-[12px] font-semibold">权限摘要</p>
          <div className="mt-3 space-y-2">
            {permissionItems.map((permission) => (
              <div key={permission.name} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 backdrop-blur-sm">
                <span className="text-[11px] text-slate-300">{permission.name}</span>
                <ToneBadge dark tone={permission.ok ? "brand" : "neutral"}>
                  {permission.ok ? "已授权" : "未检查"}
                </ToneBadge>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
    </FeatureSection>
  );
}
