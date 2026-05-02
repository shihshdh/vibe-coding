import { useEffect, useRef } from 'react';
import { useTarotStore } from '../store/useTarotStore';
import { chatStream, fetchAvailableModels } from '../utils/aiClient';
import { buildTarotReadingMessages } from '../utils/promptBuilder';
import { saveHistoryEntry } from '../utils/history';

export function useAIReading() {
  const phase = useTarotStore((s) => s.phase);
  const cards = useTarotStore((s) => s.cards);
  const question = useTarotStore((s) => s.question);
  const selectedModelId = useTarotStore((s) => s.selectedModelId);
  const isMirror = useTarotStore((s) => s.isMirror);
  const setReadingStatus = useTarotStore((s) => s.setReadingStatus);
  const appendReading = useTarotStore((s) => s.appendReading);
  const setReading = useTarotStore((s) => s.setReading);
  const setReadingError = useTarotStore((s) => s.setReadingError);

  const triggeredRef = useRef(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (isMirror) return;
    if (phase === 'splash') {
      triggeredRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      return;
    }
    if (phase !== 'done' || triggeredRef.current) return;
    triggeredRef.current = true;

    const run = async () => {
      try {
        const models = await fetchAvailableModels();
        if (models.length === 0) {
          setReading('');
          setReadingStatus('idle');
          setReadingError('AI 解读服务暂未开启。请稍后再试，或联系管理员配置。');
          return;
        }

        // 决定使用哪个 modelId
        let modelId = selectedModelId;
        if (!modelId || !models.some((m) => m.id === modelId)) {
          modelId = models[0].id;
        }

        setReading('');
        setReadingStatus('loading');
        const messages = buildTarotReadingMessages(question, cards);

        const controller = new AbortController();
        abortRef.current = controller;

        setReadingStatus('streaming');
        const stream = chatStream(modelId, messages, { signal: controller.signal });
        let fullText = '';
        for await (const chunk of stream) {
          fullText += chunk;
          appendReading(chunk);
        }
        setReadingStatus('done');

        try {
          const modelInfo = models.find((m) => m.id === modelId);
          saveHistoryEntry({
            question,
            cards: cards.map((c) => ({
              slotId: c.slotId,
              tarotId: c.tarotId,
              reversed: c.reversed,
            })),
            reading: fullText,
            modelId,
            modelLabel: modelInfo?.label,
          });
        } catch (e) {
          console.warn('保存历史失败', e);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('[AI Reading] 失败:', err);
        setReadingError(err.message || '解读失败');
      }
    };

    run();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [phase]);
}
