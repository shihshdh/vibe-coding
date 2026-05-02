import { useMemo } from 'react';

/**
 * FluidOrb - 流体呼吸光晕
 *
 * 原理：
 * 1. SVG turbulence 滤镜 + displacement 制造流体扭曲（永远随机）
 * 2. 3 层径向渐变：核心 / 中层 / 外层光晕
 *    每层独立的呼吸频率，错位叠加产生"流动呼吸"感
 * 3. size 参数可变，既用于 splash 的大月亮（140px），也用于 AI 消息的小头像（36px）
 *
 * Props:
 *   size       - 直径 px
 *   state      - 'idle' | 'thinking' | 'speaking'
 *                  idle:     慢节奏呼吸
 *                  thinking: 快节奏脉冲（AI 在思考/回复）
 *                  speaking: 额外轻微抖动
 *   hue        - 色相主色 (0-360)，默认 270（紫）
 */
export default function FluidOrb({ size = 120, state = 'idle', hue = 270 }) {
  // 每个实例用一个稳定的随机种子，让不同 orb 的扭曲图案互不重复
  const seed = useMemo(() => Math.floor(Math.random() * 1000), []);
  const id = useMemo(() => `orb-${Math.random().toString(36).slice(2, 9)}`, []);

  // 根据状态调整动画节奏
  const breathDur = state === 'thinking' ? '1.4s' : '3.8s';
  const turbDur = state === 'thinking' ? '6s' : '14s';

  const c1 = `hsl(${hue}, 85%, 78%)`;     // 核心亮点
  const c2 = `hsl(${hue}, 65%, 55%)`;     // 中层
  const c3 = `hsl(${hue - 10}, 80%, 45%)`; // 外晕（略偏红紫）
  const c4 = `hsl(${hue + 30}, 70%, 55%)`; // 点缀（蓝紫）

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
      }}
    >
      {/* 外层光晕（柔和呼吸） */}
      <div
        style={{
          position: 'absolute',
          inset: -size * 0.35,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${c3} 0%, transparent 60%)`,
          filter: `blur(${size * 0.2}px)`,
          opacity: 0.5,
          animation: `orb-breath-slow ${breathDur} ease-in-out infinite`,
        }}
      />

      {/* 核心球体 */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          inset: 0,
          filter: `drop-shadow(0 0 ${size * 0.15}px ${c2})`,
          animation: `orb-pulse ${breathDur} ease-in-out infinite`,
        }}
      >
        <defs>
          {/* 流体扭曲滤镜 */}
          <filter id={`f-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="2"
              seed={seed}
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur={turbDur}
                values="0.010;0.018;0.010"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={size * 0.08}
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation="0.4" />
          </filter>

          {/* 主渐变：从左上亮点到右下阴影 */}
          <radialGradient
            id={`g-main-${id}`}
            cx="35%"
            cy="30%"
            r="75%"
          >
            <stop offset="0%" stopColor={c1} stopOpacity="1" />
            <stop offset="35%" stopColor={c2} stopOpacity="0.9" />
            <stop offset="75%" stopColor={c3} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1a0830" stopOpacity="0.7" />
          </radialGradient>

          {/* 辅助渐变：蓝紫色斑（流动） */}
          <radialGradient
            id={`g-accent-${id}`}
            cx="70%"
            cy="65%"
            r="40%"
          >
            <stop offset="0%" stopColor={c4} stopOpacity="0.9" />
            <stop offset="100%" stopColor={c4} stopOpacity="0" />
          </radialGradient>

          {/* 高光 */}
          <radialGradient
            id={`g-highlight-${id}`}
            cx="28%"
            cy="22%"
            r="28%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 球体主体（扭曲） */}
        <g filter={`url(#f-${id})`}>
          <circle cx="50" cy="50" r="48" fill={`url(#g-main-${id})`} />
          <circle cx="50" cy="50" r="48" fill={`url(#g-accent-${id})`} />
        </g>

        {/* 高光（不扭曲，保持球感） */}
        <circle cx="50" cy="50" r="48" fill={`url(#g-highlight-${id})`} />

        {/* 边缘光晕 */}
        <circle
          cx="50"
          cy="50"
          r="47.5"
          fill="none"
          stroke={c1}
          strokeWidth="0.5"
          opacity="0.3"
        />
      </svg>
    </div>
  );
}
