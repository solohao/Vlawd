export type PreemptionIntent = "pause" | "cancel" | "rollback" | "resume";

export interface PreemptionSignal {
  intent: PreemptionIntent;
  matched: string;
}

const PREEMPTION_PATTERNS: Array<[PreemptionIntent, RegExp]> = [
  ["pause", /(停|暂停|别动|先别|stop|pause)/i],
  ["cancel", /(取消|算了|不要执行|cancel|abort)/i],
  ["rollback", /(退回|撤回|撤销|回滚|undo|rollback)/i],
  ["resume", /(继续|接着|可以了|resume|continue)/i]
];

export function detectSafetyPreemption(utterance: string): PreemptionSignal | undefined {
  for (const [intent, pattern] of PREEMPTION_PATTERNS) {
    const matched = pattern.exec(utterance);
    if (matched?.[0]) {
      return {
        intent,
        matched: matched[0]
      };
    }
  }
  return undefined;
}
