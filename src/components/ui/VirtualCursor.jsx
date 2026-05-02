import { useEffect, useRef } from 'react';
import { useTarotStore } from '../../store/useTarotStore';

/**
 * 虚拟光标：绿色发光空心圆环
 * - 用 useRef + style.transform 直接写 DOM，绕过 React 重渲染（60fps 流畅）
 * - 捏合时缩小 + 变色反馈
 */
export default function VirtualCursor() {
  const ringRef = useRef(null);
  const innerRef = useRef(null);

  // 订阅 cursor 与 pinch 状态（但不触发重渲染，只在 useEffect 里用）
  const cursor = useTarotStore((s) => s.cursor);
  const isPinching = useTarotStore((s) => s.isPinching);
  const cursorSource = useTarotStore((s) => s.cursorSource);

  useEffect(() => {
    if (!ringRef.current) return;
    const x = cursor.x * window.innerWidth;
    const y = cursor.y * window.innerHeight;
    const scale = isPinching ? 0.55 : 1;
    ringRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
    // 鼠标输入时隐藏绿色光环（系统鼠标已经够了），手势输入时显示
    const showRing = cursor.visible && cursorSource === 'gesture';
    ringRef.current.style.opacity = showRing ? '1' : '0';
  }, [cursor.x, cursor.y, cursor.visible, isPinching, cursorSource]);

  return (
    <div
      ref={ringRef}
      className="pointer-events-none fixed left-0 top-0 z-[60]"
      style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        border: '2px solid rgba(52, 211, 153, 0.9)',
        boxShadow:
          '0 0 24px rgba(52, 211, 153, 0.9), inset 0 0 12px rgba(52, 211, 153, 0.5)',
        transition: 'transform 40ms linear, opacity 300ms ease',
        willChange: 'transform, opacity',
        background: isPinching
          ? 'radial-gradient(circle, rgba(52,211,153,0.35) 0%, transparent 70%)'
          : 'transparent',
      }}
    >
      {/* 中心小点 */}
      <div
        ref={innerRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#34d399',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 10px rgba(52,211,153,1)',
        }}
      />
    </div>
  );
}
