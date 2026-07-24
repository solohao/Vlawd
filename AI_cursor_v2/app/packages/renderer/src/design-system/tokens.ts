/**
 * Design Tokens - 设计系统的核心变量
 * 所有颜色、间距、字体、阴影等统一在此定义
 */

export const tokens = {
  // 颜色系统
  colors: {
    // 品牌色 - 绿色系
    brand: {
      50: 'rgba(245, 251, 227, 1)',    // #F5FBE3
      100: 'rgba(234, 247, 192, 1)',   // #EAF7C0
      200: 'rgba(220, 242, 156, 1)',   // #DCF29C
      300: 'rgba(198, 235, 115, 1)',   // #C6EB73
      400: 'rgba(177, 227, 74, 1)',    // #B1E34A
      500: 'rgba(163, 209, 0, 1)',     // #A3D100 - 主品牌色
      600: 'rgba(130, 167, 0, 1)',     // #82A700
      700: 'rgba(101, 127, 18, 1)',    // #657F12
      800: 'rgba(75, 95, 25, 1)',      // #4B5F19
      900: 'rgba(50, 63, 20, 1)',      // #323F14
    },

    // 中性色 - 灰色系
    slate: {
      50: 'rgba(248, 250, 252, 1)',    // #F8FAFC
      100: 'rgba(241, 245, 249, 1)',   // #F1F5F9
      200: 'rgba(226, 232, 240, 1)',   // #E2E8F0
      300: 'rgba(203, 213, 225, 1)',   // #CBD5E1
      400: 'rgba(148, 163, 184, 1)',   // #94A3B8
      500: 'rgba(100, 116, 139, 1)',   // #64748B
      600: 'rgba(71, 85, 105, 1)',     // #475569
      700: 'rgba(51, 65, 85, 1)',      // #334155
      800: 'rgba(30, 41, 59, 1)',      // #1E293B
      900: 'rgba(15, 23, 42, 1)',      // #0F172A
      950: 'rgba(2, 6, 23, 1)',        // #020617
    },

    // 语义色
    semantic: {
      success: {
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
        text: 'rgba(5, 150, 105, 1)',
      },
      warning: {
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.3)',
        text: 'rgba(217, 119, 6, 1)',
      },
      error: {
        bg: 'rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.3)',
        text: 'rgba(220, 38, 38, 1)',
      },
      info: {
        bg: 'rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.3)',
        text: 'rgba(37, 99, 235, 1)',
      },
    },

    // 深色模式（暂存，未来可能用到）
    ink: {
      900: 'rgba(13, 17, 23, 1)',
      800: 'rgba(22, 27, 34, 1)',
      700: 'rgba(33, 38, 45, 1)',
    }
  },

  // 间距系统（基于 4px 网格）
  spacing: {
    0: '0',
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
  },

  // 字体系统
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft YaHei", sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    },
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // 圆角系统
  borderRadius: {
    none: '0',
    sm: '0.375rem',     // 6px
    DEFAULT: '0.5rem',  // 8px
    md: '0.75rem',      // 12px
    lg: '1rem',         // 16px
    xl: '1.5rem',       // 24px
    '2xl': '2rem',      // 32px
    full: '9999px',
  },

  // 阴影系统
  shadows: {
    sm: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
    DEFAULT: '0 2px 12px rgba(15, 23, 42, 0.04)',
    md: '0 4px 20px rgba(15, 23, 42, 0.08)',
    lg: '0 6px 32px rgba(15, 23, 42, 0.12)',
    xl: '0 8px 40px rgba(15, 23, 42, 0.16)',
    brand: {
      sm: '0 4px 24px rgba(163, 209, 0, 0.15)',
      DEFAULT: '0 6px 32px rgba(163, 209, 0, 0.25)',
      lg: '0 8px 40px rgba(163, 209, 0, 0.35)',
    },
    inner: 'inset 0 2px 4px 0 rgba(15, 23, 42, 0.06)',
  },

  // 过渡和动画
  transitions: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    timing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },

  // 密度模式：内容密度、间距、字号
  density: {
    compact: {
      padding: '0.625rem',   // 10px
      gap: '0.5rem',         // 8px
      fontSize: '0.75rem',   // 12px
      lineHeight: '1.25rem',
    },
    default: {
      padding: '0.875rem',   // 14px
      gap: '0.625rem',       // 10px
      fontSize: '0.8125rem', // 13px
      lineHeight: '1.375rem',
    },
    comfortable: {
      padding: '1.125rem',   // 18px
      gap: '0.875rem',       // 14px
      fontSize: '0.9375rem', // 15px
      lineHeight: '1.5rem',
    },
  },

  // Z-index 层级
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
  },
} as const;

// 导出类型
export type Tokens = typeof tokens;
export type ColorScale = keyof typeof tokens.colors.brand;
export type Density = keyof typeof tokens.density;
