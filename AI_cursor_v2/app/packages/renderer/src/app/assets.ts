/// <reference types="vite/client" />

// 头像等图片资源放在 publicDir（assets/），打包后随 index.html 复制到 dist/renderer 根目录。
// 通过 BASE_URL（vite 配置为 "./"）拼接引用，同时兼容 dev 服务器与打包后的 file:// 加载；
// 避免根绝对路径 "/xxx.png" 在 file:// 下解析到文件系统根，导致图标破图/消失。
const base = import.meta.env.BASE_URL;

export const aiEmployeeAvatarWithBase = `${base}ai-employee-avatar-with-base.png`;
export const aiEmployeeAvatarCompact = `${base}ai-employee-avatar-compact.png`;
export const aiEmployeeSpriteTransparent = `${base}ai-employee-sprite-transparent.png`;
