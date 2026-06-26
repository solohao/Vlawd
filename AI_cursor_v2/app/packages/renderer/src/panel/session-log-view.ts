import type { SessionChunk } from "@ai-cursor-v2/shared";

export interface SessionLogRow {
  time: string;
  type: SessionChunk["type"];
  summary: string;
}

export function toSessionLogRows(chunks: SessionChunk[]): SessionLogRow[] {
  return chunks.map((chunk) => ({
    time: chunk.created_at,
    type: chunk.type,
    summary: chunk.summary
  }));
}
