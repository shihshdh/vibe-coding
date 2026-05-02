import { useEffect, useState } from 'react';
import { useTarotStore } from '../../store/useTarotStore';
import { fetchAvailableModels, PROVIDER_META } from '../../utils/aiClient';

const LS_KEY = 'tarot-preferred-model';

/**
 * 用户模型选择器
 * - 从服务端拉所有可用模型（各 provider 聚合后的扁平列表）
 * - 用户点选，存 store + localStorage
 * - 如果只有一个可用，不让选，仅显示名称
 * - 一个都没有则不显示
 */
export default function ModelPicker() {
  const [models, setModels] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const selectedModelId = useTarotStore((s) => s.selectedModelId);
  const setSelectedModelId = useTarotStore((s) => s.setSelectedModelId);

  useEffect(() => {
    fetchAvailableModels().then((list) => {
      setModels(list);
      setLoaded(true);
      // 恢复上次选择（仍可用时）
      try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved && list.some((m) => m.id === saved)) {
          setSelectedModelId(saved);
          return;
        }
      } catch (_) {}
      if (!selectedModelId && list.length > 0) {
        setSelectedModelId(list[0].id);
      }
    });
  }, []);

  const handleSelect = (id) => {
    setSelectedModelId(id);
    try {
      localStorage.setItem(LS_KEY, id);
    } catch (_) {}
  };

  if (!loaded) return null;
  if (models.length === 0) return null;

  if (models.length === 1) {
    const m = models[0];
    const meta = PROVIDER_META[m.provider];
    return (
      <div className="mt-6 text-[10px] tracking-widest text-white/35">
        将由 {meta?.icon || ''} {m.label} 为你解读
      </div>
    );
  }

  const current = selectedModelId || models[0].id;

  return (
    <div className="mt-6 flex flex-col items-center gap-2 max-w-full">
      <div className="text-[10px] tracking-[0.25em] text-white/40">选择解读模型</div>
      <div className="flex gap-2 flex-wrap justify-center px-4">
        {models.map((m) => {
          const meta = PROVIDER_META[m.provider];
          const active = m.id === current;
          return (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className={`px-3 py-1.5 rounded-full text-xs tracking-wider transition border ${
                active
                  ? 'bg-pink-400/20 border-pink-400 text-white shadow-[0_0_16px_rgba(244,114,182,0.4)]'
                  : 'bg-white/5 border-white/15 text-white/60 hover:bg-white/10 hover:text-white/90'
              }`}
              title={m.id}
            >
              <span className="mr-1">{meta?.icon}</span>
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
