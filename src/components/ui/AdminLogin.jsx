import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tryAdminLogin, adminLogout, isAdminLoggedIn } from '../../utils/adminAuth';
import { useTarotStore } from '../../store/useTarotStore';

/**
 * 管理员登录模态框
 * 进入方式：
 *   1. URL 参数 ?admin=1 → 自动弹出登录框
 *   2. 连续点击右下角角落 5 次 → 弹出
 *   3. 已登录状态下，右下角显示小管理徽章
 */
export default function AdminLogin() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isAdmin = useTarotStore((s) => s.isAdmin);
  const setIsAdmin = useTarotStore((s) => s.setIsAdmin);
  const isMirror = useTarotStore((s) => s.isMirror);

  // 初始化时检查 localStorage
  useEffect(() => {
    if (isAdminLoggedIn()) {
      setIsAdmin(true);
    }
  }, [setIsAdmin]);

  // URL ?admin=1 触发
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1' && !isAdmin) {
      setOpen(true);
    }
  }, [isAdmin]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const result = tryAdminLogin(password);
    if (result.ok) {
      setIsAdmin(true);
      setError('');
      setPassword('');
      setOpen(false);
    } else {
      setError(result.message);
    }
  };

  const handleLogout = () => {
    if (!confirm('确认退出管理员模式？')) return;
    adminLogout();
    setIsAdmin(false);
  };

  if (isMirror) return null;

  return (
    <>
      {/* 右下角管理员按钮（未登录时显示） */}
      {!isAdmin && (
        <button
          onClick={() => setOpen(true)}
          className="glass-btn pointer-events-auto fixed bottom-4 right-4 z-[70] flex items-center gap-1.5"
          style={{
            padding: '6px 14px',
            fontSize: 11,
            letterSpacing: '0.06em',
            borderRadius: 999,
            color: 'rgba(200,170,255,0.6)',
          }}
          title="管理员模式"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          管理员
        </button>
      )}

      {/* 管理员身份小徽章 */}
      {isAdmin && (
        <div className="pointer-events-auto fixed bottom-4 right-4 z-[70] flex items-center gap-2">
          <div
            style={{
              padding: '6px 14px',
              fontSize: 11,
              letterSpacing: '0.12em',
              borderRadius: 999,
              background: 'rgba(90, 70, 20, 0.35)',
              border: '1px solid rgba(255, 200, 100, 0.3)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: 'rgba(255, 220, 150, 0.9)',
            }}
          >
            ◆ 管理员
          </div>
          <button
            onClick={handleLogout}
            className="glass-btn"
            style={{
              padding: '5px 12px',
              fontSize: 11,
              borderRadius: 999,
              color: 'rgba(200,170,255,0.6)',
            }}
          >
            退出
          </button>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.form
              onSubmit={handleSubmit}
              className="relative w-full max-w-sm mx-6 rounded-2xl border border-amber-400/30 p-7 text-white"
              style={{ background: 'rgba(15, 15, 25, 0.97)' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="text-amber-300 text-lg">◆</div>
                <h3 className="text-lg font-semibold tracking-wider">管理员登录</h3>
              </div>
              <p className="text-xs text-white/50 mb-5">
                输入管理员密码以配置 AI 服务
              </p>

              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="请输入密码"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/15 text-white text-sm outline-none focus:border-amber-400/60 transition mb-3"
              />

              {error && (
                <div className="text-rose-300 text-xs mb-3">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setPassword('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white/80 border border-white/15 hover:bg-white/5 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    boxShadow: '0 0 20px rgba(245,158,11,0.4)',
                  }}
                >
                  登录
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
