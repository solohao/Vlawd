/**
 * 功能异常行为检测器
 *
 * 通过检测短时间内的重复点击来识别无响应的UI元素，
 * 自动标记问题功能并生成AI可读的问题报告。
 */

export type AnomalyStatus = 'normal' | 'suspicious' | 'broken';

interface ClickPattern {
  featureId: string;
  clicks: number;
  rapidClicks: number;
  lastClickTime: number;
  clickTimestamps: number[];
  status: AnomalyStatus;
  element?: ElementSnapshot;
}

interface ElementSnapshot {
  tagName: string;
  className: string;
  textContent: string;
  attributes: Record<string, string>;
  position: { x: number; y: number; width: number; height: number };
}

export interface BrokenFeatureReport {
  featureId: string;
  severity: AnomalyStatus;
  userBehavior: string;
  element: {
    selector: string;
    text: string;
    tagName: string;
    className: string;
    position: { x: number; y: number; width: number; height: number };
  };
  clickPattern: {
    totalClicks: number;
    rapidClickCount: number;
    burstClickCount: number;
    timeWindow: string;
    clickTimestamps: string[];
  };
  context: {
    expectedBehavior: string;
    actualBehavior: string;
    timestamp: string;
  };
  aiPromptSuggestion: string;
}

interface AnomalyReport {
  reportType: 'broken-features';
  generatedAt: string;
  summary: {
    totalBroken: number;
    totalSuspicious: number;
    totalNormal: number;
    testDuration: string;
  };
  issues: BrokenFeatureReport[];
}

// 配置常量
const RAPID_CLICK_WINDOW = 1000;    // 1秒内
const BURST_CLICK_WINDOW = 3000;    // 3秒内
const SUSPICIOUS_THRESHOLD = 5;      // 1秒内点击5次 → 可疑
const BROKEN_THRESHOLD = 10;         // 3秒内点击10次 → 已坏
const STORAGE_KEY = 'aiCursorAnomalyPatterns';
const MAX_TIMESTAMP_RECORDS = 20;    // 保留最近20次点击记录

class FeatureAnomalyDetector {
  private patterns = new Map<string, ClickPattern>();
  private startTime = Date.now();
  private listeners = new Set<(patterns: Map<string, ClickPattern>) => void>();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * 检测点击事件，判断是否异常
   */
  detectClick(featureId: string, element: HTMLElement): AnomalyStatus {
    const now = Date.now();
    const pattern = this.patterns.get(featureId) || this.createPattern(featureId);

    // 记录点击
    pattern.clicks++;
    pattern.clickTimestamps.push(now);
    pattern.lastClickTime = now;

    // 只保留最近的点击记录
    if (pattern.clickTimestamps.length > MAX_TIMESTAMP_RECORDS) {
      pattern.clickTimestamps.shift();
    }

    // 计算快速点击次数
    const rapidClicks = pattern.clickTimestamps.filter(
      (t) => now - t < RAPID_CLICK_WINDOW
    ).length;

    const burstClicks = pattern.clickTimestamps.filter(
      (t) => now - t < BURST_CLICK_WINDOW
    ).length;

    pattern.rapidClicks = rapidClicks;

    // 获取元素快照（首次或状态变化时）
    if (!pattern.element || pattern.status === 'normal') {
      pattern.element = this.captureElementSnapshot(element);
    }

    // 判断状态
    const oldStatus = pattern.status;
    if (burstClicks >= BROKEN_THRESHOLD) {
      pattern.status = 'broken';
      if (oldStatus !== 'broken') {
        console.error(`❌ [异常检测] ${featureId} 被点击 ${burstClicks} 次无响应，已标记为损坏`);
      }
    } else if (rapidClicks >= SUSPICIOUS_THRESHOLD) {
      pattern.status = 'suspicious';
      if (oldStatus === 'normal') {
        console.warn(`⚠️ [异常检测] ${featureId} 被快速点击 ${rapidClicks} 次，可能有问题`);
      }
    } else {
      pattern.status = 'normal';
    }

    this.patterns.set(featureId, pattern);
    this.saveToStorage();
    this.notifyListeners();

    return pattern.status;
  }

  /**
   * 捕获元素快照信息
   */
  private captureElementSnapshot(element: HTMLElement): ElementSnapshot {
    const rect = element.getBoundingClientRect();
    return {
      tagName: element.tagName,
      className: element.className,
      textContent: (element.textContent || '').trim().substring(0, 100),
      attributes: this.getRelevantAttributes(element),
      position: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };
  }

  /**
   * 获取元素相关属性
   */
  private getRelevantAttributes(element: HTMLElement): Record<string, string> {
    const attrs: Record<string, string> = {};
    const relevantAttrs = ['id', 'data-feature-action', 'aria-label', 'title', 'type', 'role'];

    for (const attr of relevantAttrs) {
      const value = element.getAttribute(attr);
      if (value) {
        attrs[attr] = value;
      }
    }

    return attrs;
  }

  /**
   * 创建新的点击模式记录
   */
  private createPattern(featureId: string): ClickPattern {
    return {
      featureId,
      clicks: 0,
      rapidClicks: 0,
      lastClickTime: 0,
      clickTimestamps: [],
      status: 'normal'
    };
  }

  /**
   * 生成CSS选择器
   */
  private generateSelector(element: ElementSnapshot): string {
    const parts: string[] = [element.tagName.toLowerCase()];

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        parts.push('.' + classes.slice(0, 3).join('.'));
      }
    }

    if (element.attributes.id) {
      return `#${element.attributes.id}`;
    }

    return parts.join('');
  }

  /**
   * 格式化时间窗口
   */
  private formatTimeWindow(timestamps: number[]): string {
    if (timestamps.length === 0) return '无记录';
    const start = new Date(timestamps[0]);
    const end = new Date(timestamps[timestamps.length - 1]);
    const duration = timestamps[timestamps.length - 1] - timestamps[0];
    return `${start.toLocaleTimeString()} - ${end.toLocaleTimeString()} (${duration}ms)`;
  }

  /**
   * 生成单个问题报告
   */
  private generateReport(featureId: string, pattern: ClickPattern): BrokenFeatureReport {
    const element = pattern.element;
    if (!element) {
      throw new Error(`No element snapshot for ${featureId}`);
    }

    const now = Date.now();
    const rapidClicks = pattern.clickTimestamps.filter((t) => now - t < RAPID_CLICK_WINDOW).length;
    const burstClicks = pattern.clickTimestamps.filter((t) => now - t < BURST_CLICK_WINDOW).length;

    // 生成AI提示建议
    const aiSuggestion = this.generateAISuggestion(featureId, pattern);

    return {
      featureId,
      severity: pattern.status,
      userBehavior: this.generateUserBehaviorDescription(pattern),
      element: {
        selector: this.generateSelector(element),
        text: element.textContent,
        tagName: element.tagName,
        className: element.className,
        position: element.position
      },
      clickPattern: {
        totalClicks: pattern.clicks,
        rapidClickCount: rapidClicks,
        burstClickCount: burstClicks,
        timeWindow: this.formatTimeWindow(pattern.clickTimestamps),
        clickTimestamps: pattern.clickTimestamps.map(t => new Date(t).toISOString())
      },
      context: {
        expectedBehavior: this.inferExpectedBehavior(featureId, element),
        actualBehavior: '点击后无任何反应，无loading状态，无错误提示',
        timestamp: new Date().toISOString()
      },
      aiPromptSuggestion: aiSuggestion
    };
  }

  /**
   * 生成用户行为描述
   */
  private generateUserBehaviorDescription(pattern: ClickPattern): string {
    const burstClicks = pattern.clickTimestamps.filter(
      (t) => Date.now() - t < BURST_CLICK_WINDOW
    ).length;

    if (pattern.status === 'broken') {
      return `用户在3秒内点击${burstClicks}次，无任何响应`;
    } else if (pattern.status === 'suspicious') {
      return `用户在1秒内点击${pattern.rapidClicks}次，响应可能延迟或不明显`;
    }
    return `正常点击 ${pattern.clicks} 次`;
  }

  /**
   * 推断预期行为
   */
  private inferExpectedBehavior(featureId: string, element: ElementSnapshot): string {
    const text = element.textContent.toLowerCase();

    // 根据文本内容推断预期行为
    if (text.includes('开始') || text.includes('启动') || text.includes('space')) {
      return '应该启动语音输入或打开对话界面';
    }
    if (text.includes('配置') || text.includes('设置')) {
      return '应该打开配置或设置面板';
    }
    if (text.includes('查看') || text.includes('详情')) {
      return '应该显示详细信息或跳转到详情页';
    }
    if (text.includes('任务') || text.includes('会议') || text.includes('分析')) {
      return '应该创建新任务或打开任务工作区';
    }

    // 根据featureId推断
    if (featureId.includes('voice') || featureId.includes('mic')) {
      return '应该启动语音输入';
    }
    if (featureId.includes('model') || featureId.includes('backend')) {
      return '应该选择或配置模型';
    }
    if (featureId.includes('task')) {
      return '应该打开任务管理界面';
    }

    return '应该有明确的视觉反馈或状态变化';
  }

  /**
   * 生成AI修复建议
   */
  private generateAISuggestion(featureId: string, pattern: ClickPattern): string {
    const suggestions: string[] = [];

    suggestions.push(`请检查 ${featureId} 功能的点击事件处理`);

    if (pattern.status === 'broken') {
      suggestions.push('确认onClick/onClickCapture事件是否正确绑定');
      suggestions.push('检查是否有异步错误未捕获（try-catch或Promise rejection）');
      suggestions.push('验证事件处理函数是否被正确调用（添加console.log）');
    }

    if (pattern.status === 'suspicious') {
      suggestions.push('添加立即的视觉反馈（disabled状态、loading spinner或颜色变化）');
      suggestions.push('优化事件处理函数的响应速度');
      suggestions.push('检查是否有防抖/节流导致响应延迟');
    }

    suggestions.push('添加错误边界和用户友好的错误提示');

    return suggestions.join('；');
  }

  /**
   * 导出完整报告
   */
  exportReport(): AnomalyReport {
    const issues: BrokenFeatureReport[] = [];
    let brokenCount = 0;
    let suspiciousCount = 0;
    let normalCount = 0;

    for (const [featureId, pattern] of this.patterns.entries()) {
      if (pattern.status === 'broken') {
        brokenCount++;
        issues.push(this.generateReport(featureId, pattern));
      } else if (pattern.status === 'suspicious') {
        suspiciousCount++;
        issues.push(this.generateReport(featureId, pattern));
      } else {
        normalCount++;
      }
    }

    // 按严重程度排序
    issues.sort((a, b) => {
      const severityOrder = { broken: 0, suspicious: 1, normal: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const testDuration = this.formatDuration(Date.now() - this.startTime);

    return {
      reportType: 'broken-features',
      generatedAt: new Date().toISOString(),
      summary: {
        totalBroken: brokenCount,
        totalSuspicious: suspiciousCount,
        totalNormal: normalCount,
        testDuration
      },
      issues
    };
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 导出为JSON文件
   */
  exportToJSON(): string {
    const report = this.exportReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * 获取所有模式
   */
  getAllPatterns(): Map<string, ClickPattern> {
    return new Map(this.patterns);
  }

  /**
   * 获取特定功能的状态
   */
  getStatus(featureId: string): AnomalyStatus {
    return this.patterns.get(featureId)?.status || 'normal';
  }

  /**
   * 重置特定功能
   */
  reset(featureId: string): void {
    this.patterns.delete(featureId);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * 重置所有
   */
  resetAll(): void {
    this.patterns.clear();
    this.startTime = Date.now();
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener: (patterns: Map<string, ClickPattern>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(new Map(this.patterns));
    }
  }

  /**
   * 保存到localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        patterns: Array.from(this.patterns.entries()),
        startTime: this.startTime
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[异常检测] 保存失败:', error);
    }
  }

  /**
   * 从localStorage加载
   */
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.patterns = new Map(data.patterns || []);
        this.startTime = data.startTime || Date.now();
      }
    } catch (error) {
      console.warn('[异常检测] 加载失败:', error);
    }
  }
}

// 单例实例
const detector = new FeatureAnomalyDetector();

// 暴露到window用于DevTools访问
if (typeof window !== 'undefined') {
  (window as any).__anomaly = {
    export: () => detector.exportToJSON(),
    download: () => {
      const json = detector.exportToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `broken-features-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    reset: () => detector.resetAll(),
    list: () => {
      const report = detector.exportReport();
      console.table(report.issues.map(i => ({
        功能: i.featureId,
        状态: i.severity,
        点击次数: i.clickPattern.totalClicks,
        快速点击: i.clickPattern.rapidClickCount
      })));
      return report;
    }
  };
}

export default detector;
