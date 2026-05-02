import { AnimatePresence, motion } from 'framer-motion';
import { useTarotStore } from '../../store/useTarotStore';

/**
 * 右上角重置按钮
 * - 只有在所有牌都翻开（phase === 'done'）时才显示
 * - 副屏不显示（由主屏控制）
 */
export default function ResetButton() {
  const phase = useTarotStore((s) => s.phase);
  const reset = useTarotStore((s) => s.reset);
  const isMirror = useTarotStore((s) => s.isMirror);

  if (isMirror) return null;

  return (
    <AnimatePresence>
      {phase === 'done' && (
        <motion.button
          onClick={reset}
          className="glass-btn pointer-events-auto fixed right-4 top-4 z-[70]"
          style={{
            padding: '8px 18px',
            fontSize: 12,
            letterSpacing: '0.15em',
            borderRadius: 999,
            color: 'rgba(220,200,255,0.85)',
          }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
        >
          ↺ 重新占卜
        </motion.button>
      )}
    </AnimatePresence>
  );
}
