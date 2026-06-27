/**
 * 1:1 内容数据(取自产品文档/概念设计图)。
 * 仅承载界面文案与展示数值;运行时真实状态仍由 DesktopUiSnapshot 注入。
 */

export interface SessionRow {
  id: string;
  icon: "mail" | "globe" | "table" | "doc" | "file";
  title: string;
  desc: string;
  category: string;
  time: string;
  status: "completed" | "cancelled";
}

export interface WorkflowCard {
  id: string;
  title: string;
  enabled: boolean;
}

export interface AuditLegend {
  label: string;
  value: number;
  tone: "brand" | "soft" | "muted";
}

export const dashboardData = {
  userName: "Lin",
  greeting: "下午好，Lin",
  subtitle: "AI Cursor · 你的桌面 AI 员工，随时待命，按指令执行任务。",
  readiness: "AI 员工已就绪",
  endpoint: { device: "Bose QC Ultra", state: "已连接" },
  mode: { name: "受监督执行模式", hint: "AI 将在监督下执行任务" },
  capsuleCaption: "理解目标 · 规划步骤 · 执行操作",
  steps: [
    { label: "理解目标", state: "done" },
    { label: "规划步骤", state: "current" },
    { label: "执行中", state: "todo" },
    { label: "获得确认", state: "todo" },
    { label: "完成记录", state: "todo" }
  ] as { label: string; state: "done" | "current" | "todo" }[],
  monitorApps: ["monitor", "chrome", "excel", "gmail", "file"],
  quickActions: [
    { title: "开始新任务", desc: "受监督的 AI 工作", icon: "spark" },
    { title: "导入任务", desc: "从文件或链接导入", icon: "import" },
    { title: "新建工作流", desc: "定制你的流程", icon: "workflow" },
    { title: "语音设置", desc: "管理麦克风和设备", icon: "mic" }
  ],
  sessions: [
    {
      id: "s1",
      icon: "mail",
      title: "处理客户反馈邮件并生成总结",
      desc: "AI 帮助浏览了 12 封邮件，提取关键信息并生成了回复草稿…",
      category: "邮件处理",
      time: "今天 14:32",
      status: "completed"
    },
    {
      id: "s2",
      icon: "globe",
      title: "调研竞品定价策略",
      desc: "浏览了 6 个网站，整理对比表格，生成分析报告…",
      category: "网页测览",
      time: "今天 11:08",
      status: "completed"
    },
    {
      id: "s3",
      icon: "table",
      title: "填写供应商信息表单",
      desc: "在内部系统中填写并提交了供应商信息表单…",
      category: "表单填写",
      time: "昨天 16:45",
      status: "completed"
    },
    {
      id: "s4",
      icon: "doc",
      title: "整理会议记录并生成行动项",
      desc: "整理会议录音内容，生成结构化记录和行动项…",
      category: "文档处理",
      time: "昨天 10:22",
      status: "completed"
    },
    {
      id: "s5",
      icon: "file",
      title: "下载财务报告（已取消）",
      desc: "用户在下载前取消了任务",
      category: "文件操作",
      time: "5月26日 09:15",
      status: "cancelled"
    }
  ] as SessionRow[],
  statusCards: {
    safety: {
      title: "Safety Engine",
      state: "运行中",
      heading: "本地安全防护已激活",
      items: [
        { label: "风险检测", value: "已启用" },
        { label: "敏感数据保护", value: "已启用" },
        { label: "高风险拦截", value: "已启用" }
      ]
    },
    brain: {
      title: "Execution Brain",
      state: "就绪",
      rows: [
        { label: "模型", value: "Claude 3.5 Sonnet" },
        { label: "上下文窗口", value: "200K" }
      ]
    },
    notebook: {
      title: "Record Notebook",
      state: "同步中",
      rows: [
        { label: "存储位置", value: "本地加密存储" },
        { label: "记录状态", value: "正常" }
      ]
    }
  },
  audit: {
    total: 128,
    totalLabel: "条操作记录",
    sub: "今日新增",
    bars: [40, 62, 30, 78, 52, 88, 46, 70, 36, 60, 82, 50, 92, 44, 66, 38, 74, 56, 84, 48],
    legend: [
      { label: "指令", value: 28, tone: "brand" },
      { label: "AI 回复", value: 28, tone: "brand" },
      { label: "动作执行", value: 56, tone: "soft" },
      { label: "用户确认", value: 10, tone: "soft" },
      { label: "中断/取消", value: 6, tone: "muted" }
    ] as AuditLegend[]
  },
  workflows: [
    { id: "w1", title: "市场调研助手", enabled: true },
    { id: "w2", title: "邮件处理助手", enabled: true },
    { id: "w3", title: "表单填写助手", enabled: false },
    { id: "w4", title: "会议记录助手", enabled: false }
  ] as WorkflowCard[]
};

export interface RoleModelCard {
  role: "brain" | "notebook" | "safety";
  title: string;
  state: string;
  stateTone: "running" | "available" | "always";
  desc: string;
  tag: string;
  model: string;
  meta: string[];
  usage?: { cpu: string; ram: string; gpu: string };
  locked?: boolean;
  strip: { text: string; time: string };
}

export interface RecommendCard {
  badge: "推荐" | "可选";
  name: string;
  feature: string;
  desc: string;
  size: string;
  ram: string;
  selected: boolean;
}

export const modelCenterData = {
  title: "模型中心",
  subtitle: "配置 AI 模型，驱动 AI Cursor 的理解、执行与记录能力。",
  tabs: ["模型配置", "下载管理", "运行日志"],
  roleModels: [
    {
      role: "brain",
      title: "Execution Brain",
      state: "运行中",
      stateTone: "running",
      desc: "负责实时对话、理解目标、提出动作并执行任务。",
      tag: "对话与执行",
      model: "Claude 3.5 Sonnet",
      meta: [],
      usage: { cpu: "23%", ram: "5.2 GB", gpu: "18%" },
      strip: { text: "模型运行正常，响应延迟 320ms", time: "上次测试：今天 14:32" }
    },
    {
      role: "notebook",
      title: "Record Notebook",
      state: "可用",
      stateTone: "available",
      desc: "负责记录 Session、生成摘要、沉淀工作流与知识。",
      tag: "记录与沉淀",
      model: "Qwen 2.5 7B Instruct",
      meta: [],
      usage: { cpu: "12%", ram: "3.1 GB", gpu: "0%" },
      strip: { text: "模型已就绪，可随时记录与生成内容", time: "上次测试：今天 13:08" }
    },
    {
      role: "safety",
      title: "Safety Engine",
      state: "始终开启",
      stateTone: "always",
      desc: "本地安全引擎，实时拦截高风险操作，保护你的设备安全。",
      tag: "安全防护",
      model: "本地安全引擎 v1.2.0",
      meta: ["内置规则集", "自动更新"],
      locked: true,
      strip: { text: "安全防护已激活，规则库已是最新版本", time: "上次更新：今天 09:15" }
    }
  ] as RoleModelCard[],
  recommends: [
    {
      badge: "推荐",
      name: "Claude 3.5 Sonnet",
      feature: "最佳对话体验",
      desc: "强大的推理与对话能力，适合复杂任务理解与执行",
      size: "7.8 GB",
      ram: "建议 16GB+ RAM",
      selected: true
    },
    {
      badge: "推荐",
      name: "Qwen 2.5 7B Instruct",
      feature: "高性价比",
      desc: "优秀的中文理解与生成能力，适合记录与总结",
      size: "4.7 GB",
      ram: "建议 8GB+ RAM",
      selected: false
    },
    {
      badge: "可选",
      name: "Llama 3.1 8B Instruct",
      feature: "开源可控",
      desc: "开源模型，可本地化部署，数据更私密",
      size: "4.9 GB",
      ram: "建议 8GB+ RAM",
      selected: false
    }
  ] as RecommendCard[],
  footerNote: "模型运行所需资源会因任务复杂度而变化，建议预留充足的系统资源以获得最佳体验。",
  overview: [
    { label: "Execution Brain", state: "运行中", tone: "running" },
    { label: "Record Notebook", state: "可用", tone: "available" },
    { label: "Safety Engine", state: "始终开启", tone: "always" }
  ],
  storage: {
    note: "为模型文件选择合适的存储位置，避免占用系统盘空间。",
    path: "D:\\AI Cursor\\Models",
    used: "38.6 GB",
    total: "200 GB",
    usedPct: 19
  },
  quickActions: [
    { title: "检查模型更新", desc: "获取最新的模型版本与优化", icon: "refresh" },
    { title: "导入模型", desc: "从本地文件导入 GGUF/ONNX 模型", icon: "import" },
    { title: "模型兼容性检测", desc: "检测当前设备可运行的模型", icon: "compat" }
  ]
};

export const navItems = [
  { id: "dashboard", label: "首页 / 工作台", icon: "home" },
  { id: "workflows", label: "工作流", icon: "workflow" },
  { id: "sessions", label: "Session 记录", icon: "list" },
  { id: "knowledge", label: "知识库", icon: "grid" },
  { id: "integrations", label: "集成中心", icon: "nodes" },
  { id: "settings", label: "设置", icon: "settings" }
] as const;
