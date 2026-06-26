import { mkdir, appendFile, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SessionChunk } from "@ai-cursor-v2/shared";

export class JsonlSessionStorage {
  constructor(private readonly filePath: string) {}

  async append(chunk: SessionChunk): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(chunk)}\n`, "utf8");
  }

  async readAll(): Promise<SessionChunk[]> {
    try {
      const content = await readFile(this.filePath, "utf8");
      return content
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as SessionChunk);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
}
