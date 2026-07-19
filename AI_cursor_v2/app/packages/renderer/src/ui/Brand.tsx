import { aiEmployeeAvatarCompact, aiEmployeeAvatarWithBase } from "../app/assets.js";

interface LogoProps {
  theme: "dark" | "light";
}

export function BrandLogo({ theme }: LogoProps) {
  const text = theme === "dark" ? "text-white" : "text-ink-900";
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-brand-400 shadow-[0_4px_14px_rgba(164,209,0,0.45)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M16.5 8.2A5.4 5.4 0 1 0 17 15"
            stroke="#0e1210"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2.1" fill="#0e1210" />
        </svg>
      </span>
      <span className={`text-[15px] font-semibold tracking-tight ${text}`}>AI Cursor</span>
      <span className="rounded-md bg-brand-400/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-500">
        V2
      </span>
    </div>
  );
}

interface MascotProps {
  size?: number;
  variant?: "presence" | "runtime";
  className?: string;
}

export function AiEmployeeMascot({ size = 120, variant = "presence", className = "" }: MascotProps) {
  const src = variant === "runtime" ? aiEmployeeAvatarCompact : aiEmployeeAvatarWithBase;
  return (
    <div className={`relative grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <span
        className="absolute rounded-full bg-brand-400/30 blur-2xl"
        style={{ width: size * 0.85, height: size * 0.85, animation: "ai-glow 3.4s ease-in-out infinite" }}
      />
      <img
        src={src}
        alt="AI Employee"
        className="relative z-10 h-full w-full object-contain drop-shadow-[0_8px_24px_rgba(164,209,0,0.35)]"
      />
    </div>
  );
}
