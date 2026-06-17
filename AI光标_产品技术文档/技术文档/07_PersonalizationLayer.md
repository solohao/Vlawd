# 07 · Personalization Layer

## 核心职责

Personalization Layer 负责把用户的自然语言习惯转成可解释、可确认、可撤销的本地配置。

它不是普通记忆库，而是 AI 光标的行为配置层：

```text
User Utterance
→ Preference Proposal
→ Risk Classification
→ User Confirmation
→ Local Config Store
→ Runtime Policy
→ Trace
```

---

## 设计原则

### 1. AI 只能提出配置变更

AI 不应直接静默写入高影响规则。

动作应命名为：

```text
preference.propose_update
```

而不是：

```text
preference.update
```

真正写入必须经过确认策略。

### 2. 配置默认本地保存

偏好、习惯用语、安全规则和工作流快捷语都应默认保存在本地。

### 3. 所有变更可追踪

每次配置变更记录：

- 谁触发
- 原始语音
- AI 如何理解
- 修改了什么
- 风险等级
- 用户如何确认
- 何时生效
- 如何撤销

---

## 核心对象

### Preference

通用偏好：

```json
{
  "id": "pref_summary_style",
  "type": "preference",
  "key": "output.summary_style",
  "value": "three_bullets",
  "scope": "global",
  "risk": "low"
}
```

### PhraseAlias

习惯用语：

```json
{
  "id": "alias_apply_this",
  "type": "phrase_alias",
  "phrase": "投这个",
  "meaning": "save_job_and_generate_tailored_resume",
  "scope": "job_search_workspace",
  "requires_confirmation": true,
  "risk": "medium"
}
```

### BehaviorRule

行为规则：

```json
{
  "id": "rule_login_required",
  "type": "behavior_rule",
  "condition": "when_login_required",
  "behavior": "pause_and_ask_user",
  "scope": "all_websites",
  "risk": "medium"
}
```

### WorkflowShortcut

工作流快捷语：

```json
{
  "id": "shortcut_job_analyze",
  "type": "workflow_shortcut",
  "phrase": "按老规矩分析这个岗位",
  "workflow_id": "workflow_job_analysis",
  "scope": "job_search_workspace",
  "risk": "medium"
}
```

### SafetyPolicyOverride

安全策略覆盖。

这类对象风险最高，默认必须显式确认：

```json
{
  "id": "safety_submit_policy",
  "type": "safety_policy_override",
  "action": "form.submit",
  "policy": "always_confirm",
  "scope": "global",
  "risk": "high"
}
```

### WorkspacePreset

工作区预设：

```json
{
  "id": "preset_research_layout",
  "type": "workspace_preset",
  "layout": "left_browser_right_notes",
  "default_for": "research_workspace",
  "risk": "low"
}
```

### InteractionStyle

耳机交互风格：

```json
{
  "id": "style_quiet_updates",
  "type": "interaction_style",
  "tts_verbosity": "brief",
  "progress_update_frequency": "phase_only",
  "scope": "global",
  "risk": "low"
}
```

---

## 配置变更协议

### propose_update

```json
{
  "action": "preference.propose_update",
  "proposal": {
    "type": "phrase_alias",
    "phrase": "投这个",
    "meaning": "save_job_and_generate_tailored_resume",
    "scope": "job_search_workspace",
    "risk": "medium"
  },
  "source": {
    "utterance_id": "utt_123",
    "task_id": "task_job_search",
    "workspace_id": "workspace_job"
  },
  "requires_user_confirmation": true
}
```

### confirm_update

```json
{
  "action": "preference.confirm_update",
  "proposal_id": "proposal_123",
  "confirmed_by": "user",
  "confirmation_mode": "voice | card | settings_panel"
}
```

### apply_update

```json
{
  "action": "preference.apply_update",
  "proposal_id": "proposal_123",
  "effective_at": "2026-06-16T00:00:00Z"
}
```

### revoke_update

```json
{
  "action": "preference.revoke",
  "preference_id": "alias_apply_this",
  "reason": "user_requested"
}
```

---

## 风险分级与确认策略

| 风险 | 示例 | 确认方式 |
|---|---|---|
| low | 播报风格、输出格式、布局偏好 | 语音确认 |
| medium | 工作流快捷语、网站默认规则、保存位置 | 配置卡片确认 |
| high | 自动提交、发送、删除、付款、权限变化 | 设置面板可视化确认 |

高风险规则不允许只通过一句“好”完成。

---

## Runtime 查询方式

执行前，Task Runtime 应查询 Personalization Layer：

```text
user_command
→ phrase_alias_lookup
→ behavior_rule_match
→ safety_policy_check
→ workflow_shortcut_resolve
→ action_plan
```

示例：

```text
用户说：“投这个”
↓
PhraseAlias 命中 alias_apply_this
↓
绑定 workflow_job_analysis
↓
SafetyPolicy 要求提交前确认
↓
执行岗位分析流程
```

---

## 与 Safety Policy 的关系

Personalization Layer 可以增强安全策略，但不能静默降低安全策略。

允许：

```text
把某类动作从 safe 提升为 confirmation_required
把某个网站设为更保守
把“保守一点”映射为 always_confirm
```

不允许静默：

```text
把提交从 confirmation_required 降为 safe
把删除确认关闭
给 AI 增加新权限
允许访问隐私目录
```

---

## 配置面板

桌面端应提供配置面板：

- 习惯用语
- 工作流快捷语
- 网站规则
- 工作区预设
- 安全策略
- 交互风格
- 最近学习
- 待确认建议
- 变更历史

AI 可以操作该面板，但用户拥有最终确认权。

---

## 多屏配置流

多屏场景建议：

```text
主屏：用户任务
AI 工作区：执行/分析
设置屏：偏好与规则
```

AI 提出配置时，可以在设置屏生成卡片：

```text
新增规则建议
来源：用户刚才说“以后这个先放一边就是加入稍后处理”
类型：PhraseAlias
范围：当前工作区
风险：低
```

---

## Trace 事件

建议新增事件：

```text
PreferenceProposalCreated
PreferenceProposalConfirmed
PreferenceApplied
PreferenceRevoked
PreferenceMatched
PreferenceConflictDetected
```

当某条偏好影响任务执行时，也要写入任务日志：

```json
{
  "event": "preference_matched",
  "preference_id": "alias_apply_this",
  "effect": "resolved_user_phrase_to_workflow",
  "task_id": "task_job_search"
}
```

---

## 冲突处理

可能冲突：

- 同一句短语绑定多个动作
- 全局规则和工作区规则冲突
- 用户新偏好与安全策略冲突
- 工作流快捷语引用已删除工作流

处理原则：

```text
safety_policy > explicit_recent_user_command > workspace_rule > global_preference > AI suggestion
```

冲突时必须询问用户。

---

## 一句话总结

**Personalization Layer 让 AI 光标能够学习用户的口头暗号、操作偏好和安全边界，但所有配置都必须通过 propose → confirm → apply → trace 的可监督路径，不能允许 AI 静默自我改造。**
