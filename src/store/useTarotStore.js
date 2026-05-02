import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const params = new URLSearchParams(window.location.search);
const ROLE = params.get('role') || 'main';
const IS_MIRROR = ROLE === 'mirror';

const stateChannel = new BroadcastChannel('tarot-state');
const cursorChannel = new BroadcastChannel('tarot-cursor');
let lastCursorSend = 0;

const broadcastMiddleware = (config) => (set, get, api) =>
  config(
    (partial, replace) => {
      const fromRemote = partial && partial.__fromRemote;
      if (fromRemote) delete partial.__fromRemote;
      set(partial, replace);
      if (IS_MIRROR || fromRemote) return;

      const state = get();
      const now = performance.now();

      // 光标高频节流
      if (now - lastCursorSend > 33) {
        cursorChannel.postMessage({
          cursor: state.cursor,
          isPinching: state.isPinching,
          hoveredRiverId: state.hoveredRiverId,
        });
        lastCursorSend = now;
      }

      // 状态广播
      stateChannel.postMessage({
        phase: state.phase,
        cards: state.cards,
        pickedTarotIds: state.pickedTarotIds,
        question: state.question,
        reading: state.reading,
        readingStatus: state.readingStatus,
        chatMessages: state.chatMessages,
        chatStatus: state.chatStatus,
        riverAccelerate: state.riverAccelerate,
      });
    },
    get,
    api
  );

export const useTarotStore = create(
  subscribeWithSelector(
    broadcastMiddleware((set, get) => ({
      role: ROLE,
      isMirror: IS_MIRROR,

      // 管理员模式（仅管理员可配置 AI / 查看历史）
      isAdmin: false,

      phase: 'splash',
      cursor: { x: 0.5, y: 0.5, visible: false },
      // 光标输入源：'gesture' | 'mouse'，用于避免两种输入互相冲突
      cursorSource: 'mouse',
      lastGestureUpdate: 0,
      isPinching: false,

      // 牌河当前悬停的 tarotId（触发减速 + 抬升）
      hoveredRiverId: null,

      // 已从牌河抽走的 tarotId 列表（从牌河中移除显示）
      pickedTarotIds: [],

      // 5 个卡位
      cards: Array.from({ length: 5 }, (_, i) => ({
        slotId: i,
        flipped: false,
        tarotId: null,
        reversed: false,
      })),

      question: '',
      reading: '',
      readingStatus: 'idle',
      readingError: '',

      // 用户当次占卜选用的 modelId（null = 用服务端第一个可用模型）
      selectedModelId: null,

      // 用户与 AI 的后续对话（初始占卜解读完成后才可发）
      // 每条：{ role: 'user' | 'assistant', content: string, streaming?: boolean }
      chatMessages: [],
      chatStatus: 'idle', // idle | streaming | error
      chatError: '',

      // 牌河加速：手势手掌打开 或 鼠标/触摸长按 → 牌向右快速滚动
      riverAccelerate: false,

      // ==================== Actions ====================
      setPhase: (phase) => set({ phase }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      setCursor: (x, y, visible = true, source = 'gesture') => {
        const now = performance.now();
        const patch = { cursor: { x, y, visible }, cursorSource: source };
        if (source === 'gesture') patch.lastGestureUpdate = now;
        set(patch);
      },
      setPinching: (isPinching) => set({ isPinching }),

      // 鼠标点击：手动触发 pinch 上升沿（60ms 后自动释放）
      triggerMouseClick: () => {
        set({ isPinching: false });
        requestAnimationFrame(() => {
          set({ isPinching: true });
          setTimeout(() => set({ isPinching: false }), 80);
        });
      },

      setHoveredRiverId: (hoveredRiverId) =>
        set({ hoveredRiverId, _lastHoverWrite: performance.now() }),

      addPickedTarot: (tarotId) =>
        set((state) => ({
          pickedTarotIds: [...state.pickedTarotIds, tarotId],
        })),

      setQuestion: (question) => set({ question }),
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),

      flipCard: (slotId, tarotId, reversed) =>
        set((state) => {
          const newCards = state.cards.map((c) =>
            c.slotId === slotId
              ? { ...c, flipped: true, tarotId, reversed }
              : c
          );
          const allFlipped = newCards.every((c) => c.flipped);
          return {
            cards: newCards,
            phase: allFlipped ? 'done' : state.phase,
          };
        }),

      setReadingStatus: (readingStatus) => set({ readingStatus }),
      appendReading: (chunk) =>
        set((state) => ({ reading: state.reading + chunk })),
      setReading: (reading) => set({ reading }),
      setReadingError: (readingError) =>
        set({ readingError, readingStatus: 'error' }),

      // ===== Chat actions =====
      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      appendLastChatContent: (chunk) =>
        set((state) => {
          if (state.chatMessages.length === 0) return {};
          const last = state.chatMessages[state.chatMessages.length - 1];
          const updated = { ...last, content: (last.content || '') + chunk };
          return {
            chatMessages: [...state.chatMessages.slice(0, -1), updated],
          };
        }),
      setLastChatStreaming: (streaming) =>
        set((state) => {
          if (state.chatMessages.length === 0) return {};
          const last = state.chatMessages[state.chatMessages.length - 1];
          return {
            chatMessages: [
              ...state.chatMessages.slice(0, -1),
              { ...last, streaming },
            ],
          };
        }),
      clearChat: () => set({ chatMessages: [], chatStatus: 'idle', chatError: '' }),
      setChatStatus: (chatStatus) => set({ chatStatus }),
      setChatError: (chatError) =>
        set({ chatError, chatStatus: 'error' }),

      // ===== River acceleration =====
      setRiverAccelerate: (riverAccelerate) => set({ riverAccelerate }),

      reset: () =>
        set({
          phase: 'splash',
          question: '',
          reading: '',
          readingStatus: 'idle',
          readingError: '',
          hoveredRiverId: null,
          pickedTarotIds: [],
          chatMessages: [],
          chatStatus: 'idle',
          chatError: '',
          riverAccelerate: false,
          cards: Array.from({ length: 5 }, (_, i) => ({
            slotId: i,
            flipped: false,
            tarotId: null,
            reversed: false,
          })),
        }),

      _applyRemoteState: (payload) =>
        set({ ...payload, __fromRemote: true }),
    }))
  )
);

if (IS_MIRROR) {
  stateChannel.onmessage = (e) => {
    useTarotStore.getState()._applyRemoteState(e.data);
  };
  cursorChannel.onmessage = (e) => {
    useTarotStore.getState()._applyRemoteState(e.data);
  };
}
