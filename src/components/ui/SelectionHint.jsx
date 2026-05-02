import { motion, AnimatePresence } from 'framer-motion';
import { useTarotStore } from '../../store/useTarotStore';

/**
 * 选牌阶段的进度提示
 * - 显示在屏幕顶部（牌河上方）
 * - 告诉用户还需要选几张
 */
export default function SelectionHint() {
  const phase = useTarotStore((s) => s.phase);
  const cards = useTarotStore((s) => s.cards);
  const pickedCount = cards.filter((c) => c.tarotId).length;

  if (phase !== 'selecting') return null;

  return (
    <AnimatePresence>
      <motion.div
        className="pointer-events-none fixed left-1/2 top-8 -translate-x-1/2 z-30 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="text-xs tracking-[0.3em] text-white/50 mb-2">
          从流光中拾取命运之牌
        </div>
        <div className="flex gap-2 justify-center">
          {cards.map((c) => (
            <div
              key={c.slotId}
              className="w-8 h-1 rounded-full transition-all duration-500"
              style={{
                background: c.tarotId
                  ? 'linear-gradient(90deg, #f472b6, #ec4899)'
                  : 'rgba(255,255,255,0.15)',
                boxShadow: c.tarotId ? '0 0 8px rgba(244,114,182,0.6)' : 'none',
              }}
            />
          ))}
        </div>
        <div className="mt-2 text-[10px] tracking-widest text-white/40">
          {pickedCount} / 5
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
