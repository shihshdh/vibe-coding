import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTarotStore } from '../../store/useTarotStore';
import ModelPicker from './ModelPicker';

const SAMPLE_QUESTIONS = [
  '我最近的事业方向如何？',
  '这段感情会走向何处？',
  '我应该如何面对当下的困境？',
  '近期最需要关注的人生议题是什么？',
];

export default function QuestionScreen() {
  const phase = useTarotStore((s) => s.phase);
  const setPhase = useTarotStore((s) => s.setPhase);
  const question = useTarotStore((s) => s.question);
  const setQuestion = useTarotStore((s) => s.setQuestion);
  const isMirror = useTarotStore((s) => s.isMirror);
  const isPinching = useTarotStore((s) => s.isPinching);
  const cursor = useTarotStore((s) => s.cursor);

  const confirmRef = useRef(null);
  const skipRef = useRef(null);
  const textareaRef = useRef(null);
  const prevPinchRef = useRef(false);
  const [focused, setFocused] = useState(false);

  const handleConfirm = () => {
    if (isMirror) return;
    setPhase('selecting');
  };

  useEffect(() => {
    if (phase === 'question' && !isMirror) {
      setTimeout(() => textareaRef.current?.focus(), 400);
    }
  }, [phase, isMirror]);

  useEffect(() => {
    if (phase !== 'question') return;
    if (!isPinching || prevPinchRef.current) {
      prevPinchRef.current = isPinching;
      return;
    }
    prevPinchRef.current = isPinching;

    if (!cursor.visible) return;
    const px = cursor.x * window.innerWidth;
    const py = cursor.y * window.innerHeight;

    const hit = (ref) => {
      if (!ref.current) return false;
      const r = ref.current.getBoundingClientRect();
      return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
    };

    if (hit(confirmRef) || hit(skipRef)) {
      handleConfirm();
    }
  }, [isPinching]);

  return (
    <AnimatePresence>
      {phase === 'question' && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 标题区 */}
          <motion.h2
            className="font-cinzel"
            style={{
              fontSize: 22,
              color: 'rgba(220,190,255,0.9)',
              letterSpacing: '0.18em',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
          >
            ASK THE STARS
          </motion.h2>
          <motion.p
            className="mt-1 mb-10"
            style={{
              fontSize: 12,
              color: 'rgba(180,160,220,0.55)',
              letterSpacing: '0.22em',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.9 }}
          >
            在心中明确你的疑问，让宇宙回应你
          </motion.p>

          {/* 输入框 - 渐变边框包裹 */}
          <motion.div
            className="w-full max-w-2xl pointer-events-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.8 }}
          >
            <div
              className="relative rounded-[16px] p-[1.5px] transition-all"
              style={{
                background: focused
                  ? 'linear-gradient(135deg, rgba(180,120,255,0.45), rgba(100,80,200,0.25))'
                  : 'linear-gradient(135deg, rgba(180,120,255,0.2), rgba(80,60,160,0.1))',
              }}
            >
              <div
                className="rounded-[14px] transition-all"
                style={{
                  background: 'rgba(10,5,30,0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: focused
                    ? '1px solid rgba(180,120,255,0.4)'
                    : '1px solid rgba(140,100,255,0.2)',
                  boxShadow: focused
                    ? '0 0 30px rgba(140,80,255,0.2), inset 0 0 20px rgba(180,120,255,0.05)'
                    : 'none',
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleConfirm();
                    }
                  }}
                  readOnly={isMirror}
                  placeholder="此刻你心中在寻求什么答案？&#10;（例如：我该接受这个工作机会吗？）"
                  rows={4}
                  className="w-full bg-transparent outline-none resize-none p-4 placeholder:text-[rgba(180,150,220,0.35)]"
                  maxLength={200}
                  style={{
                    color: 'rgba(220,200,255,0.92)',
                    fontSize: 14,
                    lineHeight: 1.85,
                    letterSpacing: '0.05em',
                    fontFamily: 'inherit',
                    cursor: isMirror ? 'default' : 'text',
                  }}
                />
                <div
                  className="flex justify-between items-center px-4 pb-3 text-[11px]"
                  style={{ color: 'rgba(180,150,220,0.4)', letterSpacing: '0.08em' }}
                >
                  <span>Ctrl/⌘ + Enter 确认</span>
                  <span>{question.length} / 200</span>
                </div>
              </div>
            </div>

            {/* 示例问题 */}
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => !isMirror && setQuestion(q)}
                  disabled={isMirror}
                  className="transition"
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(200,180,240,0.65)',
                    border: '1px solid rgba(180,120,255,0.18)',
                    letterSpacing: '0.03em',
                  }}
                  onMouseOver={(e) => {
                    if (isMirror) return;
                    e.currentTarget.style.background = 'rgba(140,80,255,0.18)';
                    e.currentTarget.style.borderColor = 'rgba(180,120,255,0.4)';
                    e.currentTarget.style.color = 'rgba(230,210,255,0.95)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(180,120,255,0.18)';
                    e.currentTarget.style.color = 'rgba(200,180,240,0.65)';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* 模型选择 */}
            <ModelPicker />
          </motion.div>

          {/* 按钮组 */}
          <motion.div
            className="mt-10 flex gap-3 pointer-events-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.7 }}
          >
            <button
              ref={skipRef}
              onClick={handleConfirm}
              disabled={isMirror}
              className="glass-btn"
              style={{
                padding: '12px 22px',
                fontSize: 13,
                letterSpacing: '0.1em',
                color: 'rgba(200,180,240,0.7)',
              }}
            >
              跳过 · 随心抽牌
            </button>
            <button
              ref={confirmRef}
              onClick={handleConfirm}
              disabled={isMirror}
              className="glass-btn font-cinzel"
              style={{
                padding: '12px 32px',
                fontSize: 14,
                letterSpacing: '0.15em',
                color: '#e8d9ff',
                background:
                  'linear-gradient(135deg, rgba(180,120,255,0.25), rgba(140,80,255,0.15))',
                borderColor: 'rgba(180,120,255,0.45)',
                boxShadow: '0 0 24px rgba(140,80,255,0.25)',
              }}
            >
              DRAW · 进入牌阵 →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
