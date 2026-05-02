import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  loadHistory,
  deleteHistoryEntry,
  clearAllHistory,
  formatTimestamp,
} from '../../utils/history';
import { TAROT_DECK } from '../../data/tarotDeck';
import { useTarotStore } from '../../store/useTarotStore';

/**
 * 历史记录面板
 * - 左下角按钮打开（仅在 splash 阶段显示入口）
 * - 两栏：列表 + 详情
 */
export default function HistoryPanel() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const isMirror = useTarotStore((s) => s.isMirror);
  const phase = useTarotStore((s) => s.phase);

  useEffect(() => {
    if (open) {
      const list = loadHistory();
      setEntries(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
    }
  }, [open]);

  const selected = entries.find((e) => e.id === selectedId);

  const handleDelete = (id) => {
    if (!confirm('确认删除这条记录？')) return;
    deleteHistoryEntry(id);
    const newList = loadHistory();
    setEntries(newList);
    if (selectedId === id) setSelectedId(newList[0]?.id || null);
  };

  const handleClear = () => {
    if (!confirm('确认清空所有历史记录？此操作无法撤销。')) return;
    clearAllHistory();
    setEntries([]);
    setSelectedId(null);
  };

  if (isMirror) return null;
  const showButton = phase === 'splash';

  return (
    <>
      <AnimatePresence>
        {showButton && (
          <motion.button
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="glass-btn pointer-events-auto fixed left-4 bottom-4 z-[70] flex items-center gap-2"
            style={{
              padding: '8px 16px',
              fontSize: 12,
              letterSpacing: '0.15em',
              borderRadius: 999,
              color: 'rgba(220,200,255,0.7)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            占卜史
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-5xl h-[80vh] rounded-2xl border border-white/20 overflow-hidden flex"
              style={{ background: 'rgba(15, 15, 25, 0.96)' }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-72 border-r border-white/10 flex flex-col">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="text-sm tracking-widest text-white/90">
                    历史记录 <span className="text-white/40 text-xs">({entries.length})</span>
                  </div>
                  {entries.length > 0 && (
                    <button onClick={handleClear} className="text-[10px] text-rose-300/70 hover:text-rose-300 tracking-widest">
                      清空
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {entries.length === 0 ? (
                    <div className="px-4 py-8 text-center text-white/40 text-xs">暂无占卜记录</div>
                  ) : (
                    entries.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setSelectedId(e.id)}
                        className={`w-full text-left px-4 py-3 border-b border-white/5 transition ${
                          selectedId === e.id ? 'bg-pink-400/10 border-l-2 border-l-pink-400' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="text-xs text-white/85 line-clamp-2 mb-1">
                          {e.question || '（未明确提问）'}
                        </div>
                        <div className="text-[10px] text-white/40 tracking-widest">
                          {formatTimestamp(e.timestamp)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="text-sm tracking-widest text-white/90">详情</div>
                  <div className="flex gap-2">
                    {selected && (
                      <button onClick={() => handleDelete(selected.id)} className="text-xs text-rose-300/70 hover:text-rose-300 px-2 py-1 rounded">
                        删除
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="text-xs text-white/60 hover:text-white px-2 py-1 rounded">
                      关闭
                    </button>
                  </div>
                </div>

                {selected ? (
                  <div className="flex-1 overflow-y-auto p-5">
                    <HistoryDetail entry={selected} />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
                    选择左侧记录查看详情
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function HistoryDetail({ entry }) {
  const positions = ['过去', '现在', '未来', '建议', '结果'];
  return (
    <div className="text-white/85 text-sm leading-relaxed">
      <div className="mb-5">
        <div className="text-xs text-white/40 tracking-widest mb-1">{formatTimestamp(entry.timestamp)}</div>
        <div className="text-base">
          <span className="text-white/40">问：</span>
          {entry.question || '（未明确提问）'}
        </div>
      </div>

      <div className="mb-5">
        <div className="text-xs text-white/40 tracking-widest mb-2">牌阵</div>
        <div className="grid grid-cols-5 gap-2">
          {entry.cards.map((c, i) => {
            const tarot = TAROT_DECK.find((t) => t.id === c.tarotId);
            return (
              <div key={i} className="text-center">
                <div
                  className="aspect-[1/1.7] rounded-md overflow-hidden border border-white/10 mb-1 bg-center bg-cover"
                  style={{
                    backgroundImage: tarot ? `url(/textures/cards/${tarot.file})` : 'none',
                    transform: c.reversed ? 'rotate(180deg)' : 'none',
                  }}
                />
                <div className="text-[10px] text-pink-300/70">{positions[i]}</div>
                <div className="text-xs text-white/80 mt-0.5">{tarot?.nameZh}</div>
                <div className={`text-[10px] ${c.reversed ? 'text-rose-300/70' : 'text-emerald-300/70'}`}>
                  {c.reversed ? '逆位' : '正位'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs text-white/40 tracking-widest mb-2">解读</div>
        <div className="text-white/85 leading-[1.9]" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {entry.reading}
        </div>
      </div>
    </div>
  );
}
