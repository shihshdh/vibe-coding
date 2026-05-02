import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useTarotStore } from '../../store/useTarotStore';
import FluidOrb from './FluidOrb';

export default function SplashScreen() {
  const phase = useTarotStore((s) => s.phase);
  const setPhase = useTarotStore((s) => s.setPhase);
  const isPinching = useTarotStore((s) => s.isPinching);
  const cursor = useTarotStore((s) => s.cursor);
  const isMirror = useTarotStore((s) => s.isMirror);

  const btnRef = useRef(null);
  const prevPinchRef = useRef(false);

  const handleStart = () => {
    if (isMirror) return;
    setPhase('question');
  };

  useEffect(() => {
    if (phase !== 'splash') return;
    if (!isPinching || prevPinchRef.current) {
      prevPinchRef.current = isPinching;
      return;
    }
    prevPinchRef.current = isPinching;

    if (!btnRef.current || !cursor.visible) return;
    const rect = btnRef.current.getBoundingClientRect();
    const px = cursor.x * window.innerWidth;
    const py = cursor.y * window.innerHeight;
    if (px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom) {
      handleStart();
    }
  }, [isPinching]);

  return (
    <AnimatePresence>
      {phase === 'splash' && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center text-center pointer-events-none"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* 流体月亮 */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          >
            <FluidOrb size={140} />
          </motion.div>

          <motion.h1
            className="font-cinzel"
            style={{
              fontSize: 'clamp(28px, 5vw, 52px)',
              letterSpacing: '0.25em',
              color: '#e8d9ff',
              textShadow:
                '0 0 40px rgba(180,120,255,0.6), 0 0 80px rgba(120,60,200,0.3)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1.2, ease: 'easeOut' }}
          >
            ORACULUM
          </motion.h1>

          <motion.p
            className="mt-2 mb-10 font-serif-sc"
            style={{
              fontSize: 13,
              letterSpacing: '0.3em',
              color: 'rgba(180,160,220,0.65)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 1 }}
          >
            命运的抉择是命运的先知
          </motion.p>

          <motion.p
            className="mb-10 max-w-md px-6"
            style={{
              fontSize: 14,
              lineHeight: 1.9,
              color: 'rgba(200,180,240,0.55)',
              letterSpacing: '0.05em',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 1 }}
          >
            凝神默问，让星辰在你心中铺开一条回应之路。
          </motion.p>

          <motion.button
            ref={btnRef}
            onClick={handleStart}
            className="glass-btn font-cinzel pointer-events-auto"
            style={{
              padding: '14px 48px',
              fontSize: 15,
              letterSpacing: '0.2em',
              color: '#e8d9ff',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.8, duration: 1 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            BEGIN · 开始抉择
          </motion.button>

          <motion.p
            className="mt-10 text-xs"
            style={{
              color: 'rgba(200,170,255,0.35)',
              letterSpacing: '0.25em',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4, duration: 1.2 }}
          >
            手势捏合 · 或 轻触屏幕
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
