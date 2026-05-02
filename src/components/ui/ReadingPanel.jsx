import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTarotStore } from '../../store/useTarotStore';
import { useAIReading } from '../../hooks/useAIReading';
import { chatStream, fetchAvailableModels } from '../../utils/aiClient';
import { buildTarotReadingMessages } from '../../utils/promptBuilder';
import FluidOrb from './FluidOrb';

/**
 * 塔罗解读面板（全新 UI）
 *
 * 结构（从上到下）：
 *   Header:     · 塔罗解读   [状态]                   [清空对话]
 *   Question:   问：xxx
 *   Initial:    ✦ AI 解读     （流式吐字的初始解读）
 *   Chat:       用户消息 / AI 回复气泡
 *   Composer:   [输入框] [发送]
 *
 * 功能：
 * - phase==='done' 时弹出
 * - useAIReading 自动触发初始解读
 * - 初始解读完成后，用户可继续发消息和 AI 对话
 */
export default function ReadingPanel() {
  useAIReading();

  const phase = useTarotStore((s) => s.phase);
  const question = useTarotStore((s) => s.question);
  const reading = useTarotStore((s) => s.reading);
  const readingStatus = useTarotStore((s) => s.readingStatus);
  const readingError = useTarotStore((s) => s.readingError);
  const cards = useTarotStore((s) => s.cards);
  const selectedModelId = useTarotStore((s) => s.selectedModelId);
  const isMirror = useTarotStore((s) => s.isMirror);

  const chatMessages = useTarotStore((s) => s.chatMessages);
  const chatStatus = useTarotStore((s) => s.chatStatus);
  const chatError = useTarotStore((s) => s.chatError);
  const addChatMessage = useTarotStore((s) => s.addChatMessage);
  const appendLastChatContent = useTarotStore((s) => s.appendLastChatContent);
  const setLastChatStreaming = useTarotStore((s) => s.setLastChatStreaming);
  const setChatStatus = useTarotStore((s) => s.setChatStatus);
  const setChatError = useTarotStore((s) => s.setChatError);
  const clearChat = useTarotStore((s) => s.clearChat);

  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const [input, setInput] = useState('');

  // 自动滚到底
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [reading, chatMessages, chatStatus]);

  const canChat = readingStatus === 'done' && !isMirror && chatStatus !== 'streaming';

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !canChat) return;
    setInput('');

    // 推入用户消息 + 占位 AI 消息
    addChatMessage({ role: 'user', content: text });
    addChatMessage({ role: 'assistant', content: '', streaming: true });
    setChatStatus('streaming');

    try {
      const models = await fetchAvailableModels();
      if (models.length === 0) {
        setChatError('AI 服务已关闭');
        setLastChatStreaming(false);
        return;
      }
      let modelId = selectedModelId;
      if (!modelId || !models.some((m) => m.id === modelId)) {
        modelId = models[0].id;
      }

      // 构造完整对话历史：初始系统消息 + 原始解读 + 之前的 chat + 当前用户输入
      const systemMsgs = buildTarotReadingMessages(question, cards);
      const fullMessages = [
        ...systemMsgs,
        { role: 'assistant', content: reading },
        // 已累计的对话（去掉最后那个占位的流式消息）
        ...chatMessages
          .slice(0, -0) // 全部
          .map(({ role, content }) => ({ role, content })),
        { role: 'user', content: text },
      ];

      const controller = new AbortController();
      abortRef.current = controller;
      const stream = chatStream(modelId, fullMessages, { signal: controller.signal });
      for await (const chunk of stream) {
        appendLastChatContent(chunk);
      }
      setLastChatStreaming(false);
      setChatStatus('idle');
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[Chat] 失败:', err);
      setChatError(err.message || '对话失败');
      setLastChatStreaming(false);
    }
  };

  const visible = phase === 'done';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-auto fixed right-4 top-20 bottom-4 w-full max-w-md z-[55]"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div
            className="h-full rounded-2xl flex flex-col overflow-hidden"
            style={{
              background: 'rgba(8, 4, 24, 0.82)',
              border: '1px solid rgba(140,100,255,0.22)',
              backdropFilter: 'blur(22px) saturate(160%)',
              WebkitBackdropFilter: 'blur(22px) saturate(160%)',
              boxShadow:
                '0 0 50px rgba(140,80,255,0.15), inset 0 0 30px rgba(160,100,255,0.04)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 px-5 py-4"
              style={{ borderBottom: '1px solid rgba(140,100,255,0.14)' }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: '#a78bfa',
                  boxShadow: '0 0 8px #a78bfa',
                  animation: 'dotPulse 2.4s ease-in-out infinite',
                }}
              />
              <span
                className="font-cinzel text-sm"
                style={{
                  color: 'rgba(220,190,255,0.85)',
                  letterSpacing: '0.12em',
                }}
              >
                TAROT READING
              </span>
              <StatusBadge status={readingStatus} chatStatus={chatStatus} />
              <button
                onClick={clearChat}
                disabled={chatMessages.length === 0}
                className="ml-auto text-[10px] transition disabled:opacity-30"
                style={{
                  color: 'rgba(180,150,220,0.55)',
                  letterSpacing: '0.1em',
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(180,120,255,0.12)',
                }}
                title="清空对话（保留解读）"
              >
                清空对话
              </button>
            </div>

            {/* 问题 */}
            {question && (
              <div
                className="px-5 pt-3 pb-2 text-xs leading-relaxed"
                style={{ color: 'rgba(200,180,240,0.65)' }}
              >
                <span style={{ color: 'rgba(180,150,220,0.45)' }}>问：</span>
                {question}
              </div>
            )}

            {/* 内容区：初始解读 + chat */}
            <div
              ref={scrollRef}
              className="reading-scroll flex-1 overflow-y-auto px-5 py-3"
              style={{
                scrollBehavior: 'smooth',
              }}
            >
              {readingStatus === 'error' ? (
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: '#fda4af' }}
                >
                  <div className="mb-2 font-semibold">⚠ 解读失败</div>
                  <div style={{ color: 'rgba(253,164,175,0.75)' }}>{readingError}</div>
                </div>
              ) : readingStatus === 'loading' ? (
                <div className="flex gap-3 mb-5 items-start">
                  <div className="flex-shrink-0 pt-1">
                    <FluidOrb size={32} state="thinking" hue={270} />
                  </div>
                  <div
                    className="flex-1 min-w-0 px-4 py-3 rounded-2xl"
                    style={{
                      background: 'rgba(140,100,255,0.06)',
                      border: '1px solid rgba(140,100,255,0.15)',
                      borderTopLeftRadius: 4,
                      color: 'rgba(200,180,240,0.65)',
                      fontSize: 12,
                      letterSpacing: '0.12em',
                      fontStyle: 'italic',
                    }}
                  >
                    正在凝视星图
                    <ThinkingDots />
                  </div>
                </div>
              ) : (
                <>
                  {/* 初始 AI 解读（带头像 + 气泡） */}
                  <div className="flex gap-3 mb-5">
                    {/* 头像 - 流体月亮 */}
                    <div className="flex-shrink-0 pt-1">
                      <FluidOrb
                        size={32}
                        state={readingStatus === 'streaming' ? 'thinking' : 'idle'}
                        hue={270}
                      />
                    </div>
                    <div
                      className="flex-1 min-w-0 p-4 rounded-2xl relative"
                      style={{
                        background: 'rgba(140,100,255,0.06)',
                        border: '1px solid rgba(140,100,255,0.15)',
                        borderTopLeftRadius: 4,
                      }}
                    >
                      <div
                        className="font-cinzel text-[10px] mb-2"
                        style={{
                          color: 'rgba(200,160,255,0.5)',
                          letterSpacing: '0.18em',
                        }}
                      >
                        ORACLE
                      </div>
                      <div
                        className="whitespace-pre-wrap"
                        style={{
                          fontSize: 13,
                          lineHeight: 1.95,
                          color: 'rgba(220,205,245,0.85)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {reading}
                        {readingStatus === 'streaming' && <BlinkCursor />}
                      </div>
                    </div>
                  </div>

                  {/* 用户与 AI 的后续对话 */}
                  {chatMessages.map((msg, i) => (
                    <ChatBubble
                      key={i}
                      role={msg.role}
                      content={msg.content}
                      streaming={msg.streaming}
                    />
                  ))}

                  {chatError && (
                    <div
                      className="text-xs my-2 px-3 py-2 rounded"
                      style={{
                        color: '#fda4af',
                        background: 'rgba(255,80,120,0.08)',
                        border: '1px solid rgba(255,80,120,0.2)',
                      }}
                    >
                      {chatError}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Composer */}
            {!isMirror && readingStatus === 'done' && (
              <div
                className="p-3"
                style={{ borderTop: '1px solid rgba(140,100,255,0.14)' }}
              >
                <div
                  className="flex items-end gap-2 rounded-2xl transition-all"
                  style={{
                    padding: '8px 8px 8px 14px',
                    background: 'rgba(20,10,40,0.55)',
                    border: '1px solid rgba(140,100,255,0.18)',
                  }}
                >
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      canChat
                        ? '继续问 AI · Shift+Enter 换行'
                        : 'AI 回复中…'
                    }
                    disabled={!canChat}
                    rows={1}
                    className="flex-1 bg-transparent outline-none resize-none"
                    style={{
                      color: 'rgba(220,205,245,0.92)',
                      fontSize: 13,
                      lineHeight: 1.6,
                      maxHeight: 120,
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!canChat || !input.trim()}
                    className="flex items-center justify-center flex-shrink-0 transition"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: canChat && input.trim()
                        ? 'linear-gradient(135deg, #a78bfa, #7c6dfa)'
                        : 'rgba(140,100,255,0.18)',
                      border: 'none',
                      color: '#fff',
                      cursor: canChat && input.trim() ? 'pointer' : 'default',
                      opacity: canChat && input.trim() ? 1 : 0.35,
                    }}
                    title="发送"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13" />
                      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </div>
                <div
                  className="text-center mt-2 text-[10px]"
                  style={{
                    color: 'rgba(180,150,220,0.3)',
                    letterSpacing: '0.08em',
                  }}
                >
                  让 AI 帮你深入解读每张牌 · Enter 发送
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========== Sub-components ========== */

function ChatBubble({ role, content, streaming }) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div className="flex flex-col mb-4 items-end">
        <div
          className="text-[10px] mb-1 px-1"
          style={{
            color: 'rgba(180,150,220,0.42)',
            letterSpacing: '0.12em',
            fontFamily: 'monospace',
            fontStyle: 'italic',
          }}
        >
          YOU
        </div>
        <div
          className="whitespace-pre-wrap"
          style={{
            maxWidth: '88%',
            padding: '10px 14px',
            fontSize: 13,
            lineHeight: 1.75,
            borderRadius: 14,
            borderBottomRightRadius: 5,
            color: 'rgba(220,205,245,0.9)',
            background: 'rgba(80,60,180,0.22)',
            border: '1px solid rgba(160,120,255,0.28)',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  // AI 消息：带流体头像（思考时呼吸加快）
  return (
    <div className="flex gap-3 mb-5 items-start">
      <div className="flex-shrink-0 pt-1">
        <FluidOrb
          size={32}
          state={streaming ? 'thinking' : 'idle'}
          hue={270}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] mb-1.5 px-0.5 font-cinzel"
          style={{
            color: 'rgba(200,160,255,0.5)',
            letterSpacing: '0.18em',
          }}
        >
          ORACLE
        </div>
        <div
          className="whitespace-pre-wrap"
          style={{
            padding: '10px 14px',
            fontSize: 13,
            lineHeight: 1.85,
            borderRadius: 14,
            borderTopLeftRadius: 4,
            color: 'rgba(220,205,245,0.9)',
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.08)',
            wordBreak: 'break-word',
          }}
        >
          {content}
          {streaming && <BlinkCursor />}
          {streaming && !content && (
            <span style={{ color: 'rgba(180,150,220,0.45)', fontStyle: 'italic', fontSize: 12 }}>
              凝视中…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, chatStatus }) {
  if (chatStatus === 'streaming') {
    return (
      <span
        className="text-[10px]"
        style={{ color: '#6ee7b7', letterSpacing: '0.08em' }}
      >
        · 回复中
      </span>
    );
  }
  const map = {
    idle: null,
    loading: { text: '凝视中', color: '#fcd34d' },
    streaming: { text: '解读中', color: '#6ee7b7' },
    done: null,
    error: { text: '错误', color: '#fda4af' },
  };
  const v = map[status];
  if (!v) return null;
  return (
    <span
      className="text-[10px]"
      style={{ color: v.color, letterSpacing: '0.08em' }}
    >
      · {v.text}
    </span>
  );
}

function BlinkCursor() {
  return (
    <span
      className="inline-block align-middle ml-0.5"
      style={{
        width: 2,
        height: 14,
        background: 'rgba(180,120,255,0.85)',
        animation: 'blink 0.7s step-end infinite',
      }}
    />
  );
}

function ThinkingDots({ inline }) {
  return (
    <span style={{ animation: 'thinking 1.4s ease-in-out infinite' }}>
      {inline ? '...' : '...'}
    </span>
  );
}
