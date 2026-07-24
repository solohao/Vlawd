import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appRoot = join(__dirname, "..");
const vadPackageDir = join(appRoot, "node_modules", "@ricky0123", "vad-web", "dist");
const onnxPackageDir = join(appRoot, "node_modules", "onnxruntime-web", "dist");
const targetDir = join(appRoot, "packages", "renderer", "assets", "vad");

const vadFiles = [
  "silero_vad_v5.onnx",
  "silero_vad_legacy.onnx",
  "vad.worklet.bundle.min.js",
  "vad.worklet.bundle.dev.js"
];

const onnxFiles = [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.asyncify.wasm",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jspi.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jspi.mjs"
];

export function copyVadAssets() {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  for (const file of vadFiles) {
    const source = join(vadPackageDir, file);
    const target = join(targetDir, file);
    if (existsSync(source) && !existsSync(target)) {
      cpSync(source, target);
    }
  }

  for (const file of onnxFiles) {
    const source = join(onnxPackageDir, file);
    const target = join(targetDir, file);
    if (existsSync(source) && !existsSync(target)) {
      cpSync(source, target);
    }
  }
}

if (resolve(process.argv[1] ?? "") === __filename) {
  copyVadAssets();
}
