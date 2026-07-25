import { useEffect, useState } from "react";
import { cn } from "../design-system/index.js";
import detector, { type AnomalyStatus } from "./feature-anomaly-detector.js";

interface PatternSummary {
  featureId: string;
  status: AnomalyStatus;
  clicks: number;
  rapidClicks: number;
}

export function AnomalyMonitor(): JSX.Element {
  const [patterns, setPatterns] = useState<PatternSummary[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const unsubscribe = detector.subscribe((allPatterns) => {
      const summary: PatternSummary[] = [];
      for (const [featureId, pattern] of allPatterns.entries()) {
        summary.push({
          featureId,
          status: pattern.status,
          clicks: pattern.clicks,
          rapidClicks: pattern.rapidClicks
        });
      }
      // 按状态排序：broken > suspicious > normal
      summary.sort((a, b) => {
        const order = { broken: 0, suspicious: 1, normal: 2 };
        return order[a.status] - order[b.status];
      });
      setPatterns(summary);
    });

    return unsubscribe;
  }, []);

  const brokenCount = patterns.filter(p => p.status === 'broken').length;
  const suspiciousCount = patterns.filter(p => p.status === 'suspicious').length;

  const handleExport = () => {
    const json = detector.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broken-features-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (confirm('确定要重置所有异常检测数据吗？')) {
      detector.resetAll();
    }
  };

  const handleCopyToClipboard = () => {
    const json = detector.exportToJSON();
    navigator.clipboard.writeText(json).then(() => {
      alert('已复制到剪贴板，可以直接粘贴给AI模型');
    });
  };

  if (!isVisible) return <></>;

  const getStatusColor = (status: AnomalyStatus) => {
    switch (status) {
      case 'broken': return 'bg-red-500';
      case 'suspicious': return 'bg-orange-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusLabel = (status: AnomalyStatus) => {
    switch (status) {
      case 'broken': return '损坏';
      case 'suspicious': return '可疑';
      default: return '正常';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-md">
      {/* 收起状态：小徽章 */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "rounded-lg px-4 py-2 shadow-lg transition-all hover:shadow-xl",
            brokenCount > 0 ? "bg-red-600 text-white" :
            suspiciousCount > 0 ? "bg-orange-500 text-white" :
            "bg-slate-800 text-slate-200"
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>🔍 异常检测</span>
            {brokenCount > 0 && (
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-red-600">
                {brokenCount}
              </span>
            )}
            {suspiciousCount > 0 && brokenCount === 0 && (
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-orange-600">
                {suspiciousCount}
              </span>
            )}
          </div>
        </button>
      )}

      {/* 展开状态：详细面板 */}
      {isExpanded && (
        <div className="rounded-lg bg-slate-900 text-slate-100 shadow-2xl">
          {/* 标题栏 */}
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <h3 className="text-sm font-semibold">🔍 异常行为检测</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-slate-200"
                title="收起"
              >
                ▼
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-slate-400 hover:text-slate-200"
                title="隐藏（刷新页面恢复）"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 统计概览 */}
          <div className="grid grid-cols-3 gap-2 border-b border-slate-700 px-4 py-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{brokenCount}</div>
              <div className="text-xs text-slate-400">已损坏</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{suspiciousCount}</div>
              <div className="text-xs text-slate-400">可疑</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-400">{patterns.length}</div>
              <div className="text-xs text-slate-400">总计</div>
            </div>
          </div>

          {/* 功能列表 */}
          <div className="max-h-64 overflow-y-auto px-4 py-2">
            {patterns.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                暂无检测数据<br />
                点击页面功能开始测试
              </div>
            ) : (
              <div className="space-y-1">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.featureId}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", getStatusColor(pattern.status))} />
                      <span className="truncate font-medium text-slate-300">{pattern.featureId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 shrink-0">
                      <span>{pattern.clicks}次</span>
                      {pattern.rapidClicks > 0 && (
                        <span className="text-orange-400">⚡{pattern.rapidClicks}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 border-t border-slate-700 px-4 py-3">
            <button
              onClick={handleCopyToClipboard}
              disabled={patterns.length === 0}
              className="flex-1 rounded bg-brand-500 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📋 复制报告
            </button>
            <button
              onClick={handleExport}
              disabled={patterns.length === 0}
              className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              💾 下载JSON
            </button>
            <button
              onClick={handleReset}
              className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600"
            >
              🔄
            </button>
          </div>

          {/* 使用提示 */}
          <div className="border-t border-slate-700 px-4 py-2 text-[10px] text-slate-500">
            💡 提示：短时间内重复点击5次标记为可疑，10次标记为损坏
          </div>
        </div>
      )}
    </div>
  );
}
