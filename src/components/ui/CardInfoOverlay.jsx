import { motion, AnimatePresence } from 'framer-motion';
import { useTarotStore } from '../../store/useTarotStore';
import { TAROT_DECK } from '../../data/tarotDeck';

/**
 * DOM 信息层：位于 3D 场景之上，pointer-events-none
 * - 5 列 flex 布局对应 5 张卡牌位槽
 * - 卡牌翻开后 0.9s 延迟淡入信息（配合翻牌动画节奏）
 */
export default function CardInfoOverlay() {
  const cards = useTarotStore((s) => s.cards);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-8 md:pb-12">
      <div className="mx-auto flex w-full max-w-6xl px-4">
        {cards.map((c) => {
          const tarot = c.tarotId
            ? TAROT_DECK.find((t) => t.id === c.tarotId)
            : null;
          return (
            <div
              key={c.slotId}
              className="flex flex-1 justify-center"
              style={{ minWidth: 0 }}
            >
              <AnimatePresence>
                {c.flipped && tarot && (
                  <motion.div
                    className="text-center text-white max-w-[180px]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.9, duration: 0.7, ease: 'easeOut' }}
                  >
                    <div className="text-xl md:text-2xl font-semibold tracking-wider" style={{ textShadow: '0 0 20px rgba(255,215,170,0.6)' }}>
                      {tarot.nameZh}
                    </div>
                    <div
                      className={`mt-1 text-xs md:text-sm tracking-widest ${
                        c.reversed ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {c.reversed ? '◊ 逆位 ◊' : '◈ 正位 ◈'}
                    </div>
                    <div className="mt-2 text-[10px] md:text-xs text-white/60 leading-relaxed">
                      关键词：
                      {(c.reversed ? tarot.keywordsReversed : tarot.keywords).join(
                        '、'
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
