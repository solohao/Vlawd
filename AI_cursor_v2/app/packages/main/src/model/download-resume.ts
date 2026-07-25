import { createWriteStream } from "node:fs";
import { existsSync, rmSync, statSync } from "node:fs";

export interface DownloadProgress {
  downloadedBytes: number;
  totalBytes?: number;
}

function parseContentRangeTotal(header: string | null): number | undefined {
  if (!header) return undefined;
  const match = header.match(/\/([0-9]+)$/);
  if (!match) return undefined;
  const value = parseInt(match[1], 10);
  return isNaN(value) ? undefined : value;
}

async function pipeResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  destPath: string,
  flags: "w" | "a",
  startBytes: number,
  totalBytes: number | undefined,
  onProgress?: (p: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<number> {
  const stream = createWriteStream(destPath, { flags });
  let downloaded = startBytes;
  try {
    while (true) {
      if (signal?.aborted) {
        throw new Error("下载已中止");
      }
      const { done, value } = await reader.read();
      if (done) break;
      stream.write(value);
      downloaded += value.length;
      onProgress?.({ downloadedBytes: downloaded, totalBytes });
    }
  } finally {
    reader.releaseLock();
    stream.end();
    await new Promise<void>((resolve, reject) => {
      stream.on("finish", () => resolve());
      stream.on("error", (err) => reject(err));
    });
  }
  return downloaded;
}

/**
 * 支持断点续传的下载工具。
 *
 * - 目标文件已存在时，会先尝试用 HTTP Range 续传；
 * - 服务端不支持 Range 或返回 200 时，会删除已存在部分并重新下载；
 * - 通过 `expectedTotal` 传入已知大小，可减少一次 HEAD 请求。
 */
export async function downloadWithResume(
  url: string,
  destPath: string,
  onProgress?: (p: DownloadProgress) => void,
  signal?: AbortSignal,
  expectedTotal?: number
): Promise<void> {
  let startBytes = 0;
  if (existsSync(destPath)) {
    try {
      startBytes = statSync(destPath).size;
    } catch {
      startBytes = 0;
    }
  }

  let totalBytes = expectedTotal;

  // 如果已有文件大小已经等于或超过目标大小，直接认为已完成。
  if (startBytes > 0 && expectedTotal !== undefined && startBytes >= expectedTotal) {
    onProgress?.({ downloadedBytes: startBytes, totalBytes });
    return;
  }

  // 尝试用 Range 续传。
  let response: Response | undefined;
  if (startBytes > 0) {
    response = await fetch(url, {
      signal,
      headers: { Range: `bytes=${startBytes}-` }
    });

    if (response.ok && response.status === 206 && response.body) {
      const contentRange = response.headers.get("content-range");
      const rangeTotal = parseContentRangeTotal(contentRange);
      if (rangeTotal !== undefined) {
        totalBytes = rangeTotal;
      } else if (response.headers.get("content-length")) {
        const remaining = parseInt(response.headers.get("content-length")!, 10);
        totalBytes = startBytes + remaining;
      }
      await pipeResponse(response.body.getReader(), destPath, "a", startBytes, totalBytes, onProgress, signal);
      return;
    }

    if (response.ok && response.status === 200 && response.body) {
      // 服务端忽略了 Range 头，直接返回完整内容；删除旧文件并用这次响应从头写入。
      rmSync(destPath, { force: true });
      startBytes = 0;
      const len = response.headers.get("content-length");
      if (len) totalBytes = parseInt(len, 10);
      await pipeResponse(response.body.getReader(), destPath, "w", 0, totalBytes, onProgress, signal);
      return;
    }

    // Range 不被支持或请求失败，删除旧文件并重新下载。
    rmSync(destPath, { force: true });
    startBytes = 0;
    response = undefined;
  }

  if (!response) {
    response = await fetch(url, { signal });
  }

  if (!response.ok || !response.body) {
    throw new Error(`下载失败：HTTP ${response.status}`);
  }

  if (totalBytes === undefined) {
    const len = response.headers.get("content-length");
    if (len) totalBytes = parseInt(len, 10);
  }

  const downloaded = await pipeResponse(response.body.getReader(), destPath, "w", 0, totalBytes, onProgress, signal);
  if (totalBytes !== undefined && downloaded < totalBytes) {
    throw new Error("下载未完成");
  }
}
