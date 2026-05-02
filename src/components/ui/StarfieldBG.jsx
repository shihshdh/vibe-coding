import { useMemo } from 'react';

/**
 * 增强版星空背景
 * - 深色径向渐变底
 * - 两层星点（远近）以不同速度 drift
 * - 三道极光（purple / pink / cyan）SVG 模糊滤镜制造氤氲感
 * - 顶部 / 底部微弱雾气
 */
export default function StarfieldBG() {
  const starsFar = useMemo(() => {
    const stars = [];
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = Math.random() * 1.6 + 0.4;
      const opacity = Math.random() * 0.7 + 0.3;
      stars.push(
        `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(255,255,255,${opacity}), transparent)`
      );
    }
    return stars.join(', ');
  }, []);

  const starsNear = useMemo(() => {
    const stars = [];
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = Math.random() * 1.4 + 0.6;
      // 微黄/微蓝的星色
      const tint = Math.random() < 0.5
        ? 'rgba(220,230,255,0.7)'
        : 'rgba(255,240,220,0.7)';
      stars.push(
        `radial-gradient(${size}px ${size}px at ${x}% ${y}%, ${tint}, transparent)`
      );
    }
    return stars.join(', ');
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 底层：深空渐变 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, #0c0a1e 0%, #060515 55%, #020108 100%)',
        }}
      />

      {/* 极光层 - 三条大型色块，模糊+混合模式 */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 40% at 20% 30%, rgba(120, 80, 200, 0.35) 0%, transparent 60%),
            radial-gradient(ellipse 80% 50% at 80% 70%, rgba(220, 80, 160, 0.22) 0%, transparent 55%),
            radial-gradient(ellipse 60% 35% at 50% 90%, rgba(80, 160, 220, 0.18) 0%, transparent 60%)
          `,
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* 极光缓慢漂移层 */}
      <div
        className="absolute inset-0 starfield-layer"
        style={{
          background: `
            radial-gradient(ellipse 50% 25% at 70% 20%, rgba(200, 120, 255, 0.2) 0%, transparent 60%),
            radial-gradient(ellipse 45% 30% at 30% 80%, rgba(255, 150, 200, 0.15) 0%, transparent 60%)
          `,
          animationDuration: '90s',
          mixBlendMode: 'screen',
        }}
      />

      {/* 远星 */}
      <div
        className="absolute starfield-layer"
        style={{
          top: '-10%',
          left: '-10%',
          width: '120%',
          height: '120%',
          background: starsFar,
        }}
      />

      {/* 近星（反向漂移） */}
      <div
        className="absolute starfield-layer"
        style={{
          top: '-10%',
          left: '-10%',
          width: '120%',
          height: '120%',
          background: starsNear,
          animationDuration: '160s',
          animationDirection: 'alternate-reverse',
        }}
      />

      {/* 顶部/底部雾气 */}
      <div
        className="absolute inset-x-0 top-0 h-40"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-60"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
        }}
      />

      {/* 中心微光（拉出纵深感） */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(180,140,255,0.06) 0%, transparent 40%)',
        }}
      />
    </div>
  );
}
