import { useTarotStore } from '../../store/useTarotStore';

/**
 * 左上角角色徽章 + 打开副屏按钮
 */
export default function RoleBadge() {
  const role = useTarotStore((s) => s.role);
  const isMirror = role === 'mirror';

  const openMirror = () => {
    const url = `${window.location.origin}${window.location.pathname}?role=mirror`;
    window.open(url, '_blank', 'width=1280,height=800');
  };

  return (
    <div className="pointer-events-auto fixed left-4 top-4 z-[70] flex items-center gap-2">
      <div
        className="flex items-center gap-2"
        style={{
          padding: '6px 14px',
          fontSize: 12,
          letterSpacing: '0.08em',
          background: isMirror
            ? 'rgba(30, 80, 130, 0.35)'
            : 'rgba(20, 60, 55, 0.35)',
          border: isMirror
            ? '1px solid rgba(120, 200, 255, 0.28)'
            : '1px solid rgba(110, 220, 180, 0.28)',
          borderRadius: 999,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: isMirror ? 'rgba(180,220,255,0.85)' : 'rgba(180,235,210,0.9)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: isMirror ? '#60a5fa' : '#34d399',
            boxShadow: `0 0 8px ${isMirror ? '#60a5fa' : '#34d399'}`,
          }}
        />
        {isMirror ? '副屏 · 镜像' : '主屏 · 控制'}
      </div>
      {!isMirror && (
        <button
          onClick={openMirror}
          className="glass-btn"
          style={{
            padding: '6px 14px',
            fontSize: 12,
            letterSpacing: '0.06em',
            borderRadius: 999,
            color: 'rgba(200,180,240,0.75)',
          }}
        >
          打开副屏 ↗
        </button>
      )}
    </div>
  );
}
