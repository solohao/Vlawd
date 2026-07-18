import type { ActionProposal, DuplexModelEvent, DuplexModelInput, DuplexModelProvider } from "@ai-cursor-v2/shared";

export class MockDuplexModelProvider implements DuplexModelProvider {
  readonly kind = "mock" as const;
  readonly usingRealInference = false;

  async *generate(input: DuplexModelInput, signal?: AbortSignal): AsyncIterable<DuplexModelEvent> {
    if (signal?.aborted) {
      return;
    }
    yield { type: "state", state: "listening" };
    yield { type: "speech", text: "我会先可见地执行，并在高风险动作前停下来确认。" };
    yield { type: "state", state: "thinking" };

    const proposal = buildProposal(input.user_utterance);
    yield { type: "action_proposal", proposal };
    yield { type: "state", state: "complete" };
  }
}

function buildProposal(utterance: string): ActionProposal {
  if (/表单|填写|填/.test(utterance)) {
    return {
      proposal_id: "mock_form_fill",
      type: "sequence",
      visibility: "visible_system",
      target_view: "system",
      safety: "confirmation_required",
      confidence: 0.86,
      expected_result: "在虚拟表单中填写姓名和邮箱，提交前等待确认。",
      actions: [
        {
          action: "pointer.click",
          target: { ref: "field_name", description: "姓名输入框", coordinates: { x: 240, y: 160 } }
        },
        { action: "keyboard.type", params: { text: "张三" } },
        {
          action: "pointer.click",
          target: { ref: "field_email", description: "邮箱输入框", coordinates: { x: 240, y: 210 } }
        },
        { action: "keyboard.type", params: { text: "demo@example.com" } },
        { action: "form.fill", params: { name: "张三", email: "demo@example.com" } }
      ],
      rollback: [{ action: "keyboard.shortcut", params: { keys: "Ctrl+Z" } }]
    };
  }

  if (/求职|岗位|招聘|筛选/.test(utterance)) {
    return {
      proposal_id: "mock_job_filter",
      type: "sequence",
      visibility: "visible_virtual",
      target_view: "browser_view_main",
      safety: "safe",
      confidence: 0.78,
      expected_result: "打开招聘搜索页并输入筛选条件。",
      actions: [
        { action: "tab.open", params: { url: "https://example.com/jobs?q=AI+agent" } },
        { action: "text.input", params: { text: "远程 / AI 产品 / 初创公司" } },
        {
          action: "overlay.label",
          target: { ref: "job_filter_remote", description: "远程筛选按钮" }
        }
      ]
    };
  }

  return {
    proposal_id: "mock_web_search",
    type: "sequence",
    visibility: "visible_virtual",
    target_view: "browser_view_main",
    safety: "safe",
    confidence: 0.82,
    expected_result: "打开搜索页并输入查询词。",
    actions: [
      { action: "tab.open", params: { url: "https://www.bing.com/search?q=AI+Cursor" } },
      { action: "text.input", params: { text: "AI Cursor 全双工语音监督" } },
      {
        action: "overlay.label",
        target: { ref: "result_1", description: "第一个搜索结果" }
      }
    ]
  };
}
