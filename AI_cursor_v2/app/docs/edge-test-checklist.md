# Vlawd 全双工对话边缘测试清单

本清单覆盖 Cycle 1 真实全双工入口在「首句输出、中途打断/插话、控制词抢占」等边界场景下的预期行为与延迟阈值。

> 运行方式：
> - 单元/脚本测试：`npx tsx scripts/duplex-edge-tests.ts`
> - 真实 LLM 集成测试：`npx tsx scripts/duplex-real-edge-test.ts`（需先启动 Ollama 并加载 qwen2.5:3b）

## 阈值

| 指标 | 目标值 | 说明 |
|---|---|---|
| `utterance_to_first_speech` | < 1200 ms | 用户说完/说完判定 → AI 开始发出声音 |
| `barge_in_to_output_stop` | < 200 ms | VAD 检测到用户插话 → AI 语音输出停止 |
| `correction_to_output_stop` | < 200 ms | 用户说完一句新 utterance 打断 AI → 旧输出取消信号发出 |
| `stop_signal_to_paused` | < 50 ms | 控制词触发 → Runtime 进入 paused/interrupted |
| 首句被截断后 History 精度 | 100% | 传给下一轮 LLM 的 assistant 内容必须等于用户实际听到的文本 |

## 测试用例

### 1. 正常完整一轮
- **动作**：用户说完一句完整请求，AI 正常生成并结束。
- **预期**：
  - RuntimeState 最终为 `listening`。
  - 产生 1 个 user turn + 1 个 assistant turn。
  - Assistant turn 无 `interrupted` 标记。
  - `utterance_to_first_speech` 不超过阈值。

### 2. 首句中途自然插话（新 utterance）
- **动作**：AI 正在说首句时，用户说完一句新请求。
- **预期**：
  - 立即发出 `correction` 事件，取消旧生成。
  - 旧 assistant turn 标记 `interrupted`。
  - 新请求的 history 中包含被打断的 assistant turn（内容 = 已生成文本）。
  - `correction_to_output_stop` 不超过阈值。

### 3. VAD bargeIn 带 heardText
- **动作**：AI 首句说到一半，VAD 触发 `bargeIn("只听到了这一句")`。
- **预期**：
  - 旧 assistant turn 被截断为 `heardText`。
  - 旧 assistant turn 标记 `interrupted`。
  - 下一轮 LLM history 中该 assistant 内容 = `heardText`。
  - `barge_in_to_output_stop` 不超过阈值。

### 4. 思考阶段被打断
- **动作**：用户 utterance 后，AI 还在 `thinking` 未开口时，用户又说新请求。
- **预期**：
  - 旧 generation 被取消。
  - 可能留下空/被打断的 assistant turn，但不影响新请求正常生成。
  - 最终 state 回到 `listening`。

### 5. AI 说话时控制词“停/暂停/取消/退回”
- **动作**：AI 正在说话时，用户说出控制词。
- **预期**：
  - 立即触发 `preemption` 事件，不进 Provider。
  - `pause` → state=`paused`，`paused=true`。
  - `cancel` → state=`interrupted`，`paused=true`。
  - `rollback` → state=`paused`，`paused=true`。
  - `stop_signal_to_paused` 不超过阈值。

### 6. 控制词“继续”恢复
- **动作**：处于 paused 状态时，用户说“继续”。
- **预期**：
  - state 恢复为 `listening`。
  - `paused=false`。

### 7. 800ms 内重复 utterance 去重
- **动作**：连续两次提交完全相同的话语（< 800 ms）。
- **预期**：
  - Provider 只被调用 1 次。
  - 只产生 1 个 user turn。

### 8. 空/纯空格输入
- **动作**：提交空字符串或仅空格。
- **预期**：
  - 不调用 Provider。
  - 不产生新 turn。

### 9. Provider 切换时取消当前生成
- **动作**：AI 正在生成时调用 `setActiveProvider`。
- **预期**：
  - 当前生成被取消。
  - 热路径 Provider 切换成功。
  - 最终 state 回到 `listening`。

### 10. 多轮反复打断后的上下文截断
- **动作**：多轮对话中反复 bargeIn，每次给出不同 `heardText`。
- **预期**：
  - 每个被 bargeIn 的 assistant turn 都标记 `interrupted`。
  - 每个 assistant turn 的文本 = 对应 `heardText`。
  - 后续 LLM history 中按顺序保留所有截断后的 assistant 内容。

### 11. 无 active generation 时调用 bargeIn
- **动作**：Runtime 处于 `listening` 且没有生成任务时调用 `bargeIn()`。
- **预期**：
  - 无任何事件/state 变化。
  - 不报错。

### 12. 首句说完前被新的 VAD 连续触发两次
- **动作**：短时间内连续调用两次 `bargeIn()`。
- **预期**：
  - 不崩溃。
  - 只保留第一次有效的 heardText。

### 13. 说完控制词后立刻说正常请求
- **动作**：用户先说“停”，立刻再说“帮我查一下”。
- **预期**：
  - 先进入 paused。
  - 新请求若不在 paused .resume 流程中，则按正常请求处理（或取决于 UI 是否先 resume）。

## 当前状态

- 脚本 `scripts/duplex-edge-tests.ts` 中 1-10 已通过（Mock Provider）。
- 脚本 `scripts/duplex-real-edge-test.ts` 中 1-4 已通过（Ollama qwen2.5:3b，CPU-only）。

## 注意

- 真实 LLM 首 token 延迟会显著影响「首句被截断的精度」：如果模型在 bargeIn 前已经生成更多 token，截断后仍会按 `heardText` 覆盖，需渲染层准确上报。
- 真实 TTS 在渲染层，bargeIn 的延迟取决于 UI 对 `correction`/`state` 事件的响应，Runtime 层面仅保证事件发出 < 200 ms。
