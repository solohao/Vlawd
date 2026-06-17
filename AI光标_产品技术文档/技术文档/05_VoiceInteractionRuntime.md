# 05 · Voice Interaction Runtime

## 核心定位

Voice Interaction Runtime 不是一个简单的 ASR + TTS 插件。

它是 AI 光标的耳机协作中枢，负责：

```text
听见用户
识别打断
理解短命令
组织语音反馈
控制 TTS 播放
绑定任务状态
协调光标执行
```

如果没有这一层，AI 光标会退化成“语音鼠标”。

---

## 目标交互形态

AI 光标需要的不是普通 voice chatbot，而是：

> **任务型准全双工耳机协作系统。**

核心要求：

```text
用户可以随时说话
AI 正在播报时可以被打断
AI 必须快速停止 TTS
用户短命令必须低延迟生效
AI 只汇报关键任务状态
```

---

## 模块结构

```text
Audio I/O
↓
VAD / Interrupt Detector
↓
ASR / Command Recognizer
↓
Command Router
↓
Interaction Policy
↓
Task Runtime / Action Scheduler
↓
TTS Controller
↓
Headset Output
```

---

## Audio I/O

负责：

- 麦克风输入
- 耳机输出
- 音频设备选择
- 回声抑制
- 降噪
- 音量控制
- 播放中断

桌面 MVP 可以直接使用本机音频 API。

不建议第一版就引入 WebRTC，因为本地链路是：

```text
本机耳机 / 麦克风
→ 本机桌面 App
→ 本机执行器
```

---

## VAD / Interrupt Detector

负责判断用户是否在说话，以及是否打断 AI。

关键场景：

```text
AI 正在说：“我找到了 5 个结果……”
用户说：“等下。”
系统立即停止 TTS
```

VAD 不只是录音分段工具，它直接影响“员工是否听话”。

### 必须本地处理的抢占词

```text
停
暂停
等下
不是这个
错了
继续
我来
取消
```

这些不能等云端 LLM 返回。

---

## ASR / Command Recognizer

语音识别应分两条路径：

### 快速命令路径

本地识别，低延迟：

```text
点 3
右键
往下
继续
停
打开第二个
```

### 复杂任务路径

完整转写后交给 LLM：

```text
帮我把这些岗位按和我简历的匹配度排序，然后把前三个放到右侧工作区。
```

---

## Command Router

把语音输入路由到不同处理器：

```text
interrupt_command
cursor_command
workspace_command
task_goal
confirmation_response
conversation_feedback
```

例如：

- “停” → interrupt_command
- “点 3” → cursor_command
- “这个也加进去” → workspace_command
- “帮我找远程岗位” → task_goal
- “确认” → confirmation_response
- “嗯” → conversation_feedback

---

## Interaction Policy

这是 Voice Interaction Runtime 最关键的模块。

它决定：

- AI 什么时候说话
- AI 说多长
- AI 是否需要播报
- AI 是否只在屏幕显示
- AI 是否必须请求确认
- 用户是否正在专注，不应打扰

### 必须播报

```text
task_started
phase_changed
uncertain_target
risk_confirmation_required
blocked
error_recovered
task_completed
```

### 可静默

```text
mouse_moved
safe_click_done
scroll_done
normal_waiting
```

### 播报风格

短、确定、任务化：

```text
“我打开第二个。”
“这里需要登录，我暂停。”
“已保存到求职工作区。”
```

避免长篇解释。

---

## TTS Controller

TTS 不只是把文本转语音，还要支持：

- 短句播报
- 流式播放
- 可中断
- 队列管理
- 优先级
- 多任务前缀
- 情绪/语气标签

优先级建议：

```text
user_interrupt_ack
> risk_confirmation
> blocked/error
> task_completed
> progress_update
> low_priority_summary
```

---

## 任务型准全双工状态机

```text
idle
listening
thinking
speaking
executing
interrupted
waiting_confirmation
```

核心转移：

```text
speaking + user_speech_detected → interrupted
interrupted → stop_tts → listen
executing + stop_command → pause_executor
waiting_confirmation + confirm → resume_execution
```

---

## 与 Task Runtime 的绑定

每一句语音都应绑定任务上下文：

```json
{
  "utterance_id": "utt_001",
  "task_id": "task_job_search",
  "workspace_id": "workspace_1",
  "role": "user",
  "text": "先看第二个",
  "intent": "cursor_command",
  "timestamp": "2026-06-16T00:00:00Z"
}
```

AI 的语音反馈也要留痕：

```json
{
  "utterance_id": "utt_002",
  "task_id": "task_job_search",
  "role": "assistant",
  "text": "好的，我打开第二个。",
  "trigger": "command_ack"
}
```

---

## 一句话总结

**Voice Interaction Runtime 是 AI 光标从“语音鼠标”升级为“耳机里的 AI 员工”的关键：它管理听、说、打断、汇报、确认和任务上下文绑定。**
