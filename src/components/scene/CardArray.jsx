import { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTarotStore } from '../../store/useTarotStore';
import { TAROT_DECK } from '../../data/tarotDeck';
import FloatingCard from './FloatingCard';
import SlotCard from './SlotCard';
import FlyingCard from './FlyingCard';

/**
 * D 方案：漂浮牌河 + 下方卡位
 *
 * 流程：
 *   1. 牌河循环漂浮（22 张）
 *   2. 光标悬停 → 该张牌减速、抬升、发光
 *   3. 捏合 → 该牌从河里"飞出"到下一个空卡位（保持背面）
 *   4. 重复 5 次 → 5 个卡位都有牌（背面朝上）
 *   5. 所有 5 张一起翻开（有小间隔的波浪式翻开）+ 触发 AI 解读
 */

const RIVER_Y = 1.3;
const RIVER_SPEED = 0.4;
const RIVER_SPACING = 1.2;
const SLOT_Y = -1.5;
const SLOT_SPACING = 1.3;
const FLY_DURATION = 850; // 飞行动画时长

export default function CardArray() {
  const cards = useTarotStore((s) => s.cards);
  const flipCard = useTarotStore((s) => s.flipCard);
  const isMirror = useTarotStore((s) => s.isMirror);
  const phase = useTarotStore((s) => s.phase);
  const isPinching = useTarotStore((s) => s.isPinching);
  const hoveredRiverId = useTarotStore((s) => s.hoveredRiverId);
  const riverAccelerate = useTarotStore((s) => s.riverAccelerate);
  const setHoveredRiverId = useTarotStore((s) => s.setHoveredRiverId);
  const pickedTarotIds = useTarotStore((s) => s.pickedTarotIds);
  const addPickedTarot = useTarotStore((s) => s.addPickedTarot);

  // 牌河偏移量
  const offsetRef = useRef(0);

  // 牌河中剩余的牌
  const riverDeck = useMemo(
    () => TAROT_DECK.filter((t) => !pickedTarotIds.includes(t.id)),
    [pickedTarotIds]
  );

  // 下方 5 个卡位的世界坐标
  const slotPositions = useMemo(
    () => cards.map((_, i) => [(i - 2) * SLOT_SPACING, SLOT_Y, 0]),
    [cards.length]
  );

  // 漂浮推进 + 每帧重置 hoveredRiverId（由 FloatingCard 们来覆盖写入）
  const frameHoverWitnessRef = useRef(0);
  useFrame((_, dt) => {
    if (phase !== 'selecting' && phase !== 'revealing') return;
    // 悬停时牌河几乎停止（0.06x），让用户有充分时间捏合选中
    // 加速时乘 3.5x（但悬停优先 — 悬停时忽略加速）
    let multiplier = 1.0;
    if (hoveredRiverId && phase === 'selecting') {
      multiplier = 0.06;
    } else if (riverAccelerate && phase === 'selecting') {
      multiplier = 3.5;
    }
    offsetRef.current += RIVER_SPEED * multiplier * dt;
    const totalLen = riverDeck.length * RIVER_SPACING;
    if (totalLen > 0) {
      offsetRef.current = offsetRef.current % totalLen;
    }

    // 每 4 帧检查一次：如果上一轮没有卡片写入 hover，就清空
    frameHoverWitnessRef.current++;
    if (frameHoverWitnessRef.current >= 4) {
      frameHoverWitnessRef.current = 0;
      // 由 React state "hoveredRiverId" 自己是被 FloatingCard 写入的；
      // 这里做一次"超时清理"：如果 100ms 内无人更新，则认为已经离开
      const state = useTarotStore.getState();
      const now = performance.now();
      if (state._lastHoverWrite && now - state._lastHoverWrite > 120 && state.hoveredRiverId) {
        useTarotStore.setState({ hoveredRiverId: null });
      }
    }
  });

  // ========== 飞行中的牌（暂存数组） ==========
  // 一条飞行条目：{ id, tarotId, targetPos, targetSlotId, reversed, startedAt }
  const [flyingCards, setFlyingCards] = useState([]);
  // 已预订的卡位集合（飞行中也算占用）
  const reservedSlotsRef = useRef(new Set());

  // ========== 捏合：把悬停的牌送上天（从牌河到卡位） ==========
  const prevPinchRef = useRef(false);
  useEffect(() => {
    if (isMirror) return;
    if (phase !== 'selecting') return;
    const justPinched = isPinching && !prevPinchRef.current;
    prevPinchRef.current = isPinching;
    if (!justPinched) return;
    if (!hoveredRiverId) return;

    // 找第一个未占用（不在 reservedSlots 里）的卡位
    const nextSlot = cards.find(
      (c) => !c.tarotId && !reservedSlotsRef.current.has(c.slotId)
    );
    if (!nextSlot) return;

    const tarot = TAROT_DECK.find((t) => t.id === hoveredRiverId);
    if (!tarot) return;

    const reversed = Math.random() < 0.5;

    // 立即从牌河移除（store 更新）
    addPickedTarot(tarot.id);
    reservedSlotsRef.current.add(nextSlot.slotId);

    // 启动飞行动画
    const flyId = `fly-${tarot.id}-${Date.now()}`;
    const entry = {
      id: flyId,
      tarotId: tarot.id,
      targetPos: slotPositions[nextSlot.slotId],
      targetSlotId: nextSlot.slotId,
      reversed,
      startedAt: performance.now(),
    };
    setFlyingCards((prev) => [...prev, entry]);

    // 飞行完成后：把牌"放"进卡位（保持背面，不翻开）
    setTimeout(() => {
      setFlyingCards((prev) => prev.filter((f) => f.id !== flyId));
      // 给卡位赋值 tarotId 但不翻开：flipped=false, tarotId=xxx
      // 这里用 flipCard 的变体：直接 set cards
      const current = useTarotStore.getState();
      const updatedCards = current.cards.map((c) =>
        c.slotId === nextSlot.slotId
          ? { ...c, tarotId: tarot.id, reversed, flipped: false }
          : c
      );
      // 用一个下划线私有 setter 会更好，这里直接复用 set 语义
      useTarotStore.setState({ cards: updatedCards });
      reservedSlotsRef.current.delete(nextSlot.slotId);

      // 检查是否已收齐 5 张：全部开始翻牌
      const allPlaced = updatedCards.every((c) => c.tarotId);
      if (allPlaced) {
        // 波浪式翻牌：每张间隔 250ms
        updatedCards.forEach((c, i) => {
          setTimeout(() => {
            flipCard(c.slotId, c.tarotId, c.reversed);
          }, i * 280);
        });
      }
    }, FLY_DURATION);

    setHoveredRiverId(null);
  }, [isPinching, hoveredRiverId]);

  // phase 重置时清空飞行列表
  useEffect(() => {
    if (phase === 'splash') {
      setFlyingCards([]);
      reservedSlotsRef.current.clear();
    }
  }, [phase]);

  return (
    <>
      {/* 上方漂浮牌河 */}
      {(phase === 'selecting' || phase === 'revealing') &&
        riverDeck.map((tarot, i) => (
          <FloatingCard
            key={tarot.id}
            tarot={tarot}
            baseIndex={i}
            totalCount={riverDeck.length}
            spacing={RIVER_SPACING}
            yPosition={RIVER_Y}
            offsetRef={offsetRef}
          />
        ))}

      {/* 飞行中的牌 */}
      {flyingCards.map((fly) => (
        <FlyingCard
          key={fly.id}
          startY={RIVER_Y}
          targetPos={fly.targetPos}
          startedAt={fly.startedAt}
          duration={FLY_DURATION}
        />
      ))}

      {/* 下方 5 个卡位 */}
      {cards.map((card, i) => (
        <SlotCard
          key={card.slotId}
          slotId={card.slotId}
          position={slotPositions[i]}
          flipped={card.flipped}
          reversed={card.reversed}
          tarotId={card.tarotId}
        />
      ))}
    </>
  );
}
