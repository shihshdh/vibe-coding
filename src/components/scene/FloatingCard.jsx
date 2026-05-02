import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTarotStore } from '../../store/useTarotStore';
import { getCardBackTexture } from '../../utils/textureLoader';

const CARD_W = 1;
const CARD_H = 1.7;
// Raycast 命中盒：比卡片大 1.5 倍，降低手势选择难度
const HITBOX_W = CARD_W * 1.45;
const HITBOX_H = CARD_H * 1.2;

const VIEW_HALF = 9;
const FADE_MARGIN = 2;

// Sticky hover：一旦悬停，即使光标短暂偏离也保持 N 毫秒
const STICKY_MS = 180;

/**
 * 漂浮牌河单张牌（精度增强版）
 *
 * 精度改进：
 * 1. 扩大命中盒：HITBOX_W/H 比卡片本身大 45%/20%，容错更宽
 * 2. Sticky hover：悬停后 180ms 内即使光标偏离也不丢失，避免颤抖取消
 * 3. 悬停时牌相对于相邻牌前进更多（Z 抬升 + 放大 1.18），视觉对比更强
 * 4. 悬停时旁边的牌轻微降低发光强度，进一步突出当前选中
 */
export default function FloatingCard({
  tarot,
  baseIndex,
  totalCount,
  spacing,
  yPosition,
  offsetRef,
}) {
  const groupRef = useRef();
  const hitRef = useRef();
  const visualMeshRef = useRef();
  const matRef = useRef();
  const [hovered, setHovered] = useState(false);
  const lastHoverTimeRef = useRef(0);
  const { camera } = useThree();

  const cursor = useTarotStore((s) => s.cursor);
  const setHoveredRiverId = useTarotStore((s) => s.setHoveredRiverId);
  const hoveredRiverId = useTarotStore((s) => s.hoveredRiverId);
  const phase = useTarotStore((s) => s.phase);
  const isMirror = useTarotStore((s) => s.isMirror);

  const backTex = useMemo(() => getCardBackTexture(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useFrame(() => {
    if (!groupRef.current || !hitRef.current) return;

    const totalLen = totalCount * spacing;
    const offset = offsetRef.current || 0;

    // 1. 循环定位
    let norm = (baseIndex * spacing - offset) % totalLen;
    if (norm < 0) norm += totalLen;
    let x = norm - totalLen / 2;
    const halfView = VIEW_HALF + FADE_MARGIN;
    if (x > halfView && totalLen > halfView * 2) x -= totalLen;
    else if (x < -halfView && totalLen > halfView * 2) x += totalLen;

    // 2. 弧形路径
    const normX = Math.max(-1, Math.min(1, x / VIEW_HALF));
    const arcOffset = -Math.cos((normX * Math.PI) / 2) * 0.35 + 0.35;

    // 3. 漂浮
    const time = performance.now() / 1000;
    const bob = Math.sin(time * 1.2 + baseIndex * 0.5) * 0.06;
    const tilt = Math.sin(time * 0.5 + baseIndex) * 0.04;
    const pathTilt = normX * 0.08;

    // 4. 可见性
    const absX = Math.abs(x);
    let visibility = 1;
    if (absX > VIEW_HALF) {
      visibility = Math.max(0, 1 - (absX - VIEW_HALF) / FADE_MARGIN);
    }
    if (matRef.current) {
      matRef.current.opacity = visibility;
      matRef.current.visible = visibility > 0.02;
    }

    // 5. 更新位置（用于 raycast 和渲染）
    groupRef.current.position.x = x;
    groupRef.current.position.y = yPosition + bob + arcOffset;
    groupRef.current.rotation.z = tilt + pathTilt;
    groupRef.current.rotation.y = -pathTilt * 2;

    // 6. 悬停检测（用扩大的命中盒）
    let isHoveredNow = false;
    if (
      phase === 'selecting' &&
      cursor.visible &&
      !isMirror &&
      visibility > 0.5
    ) {
      ndc.x = cursor.x * 2 - 1;
      ndc.y = -(cursor.y * 2 - 1);
      raycaster.setFromCamera(ndc, camera);
      groupRef.current.updateMatrixWorld(true);

      const hits = raycaster.intersectObject(hitRef.current, false);
      isHoveredNow = hits.length > 0;
    }

    // 7. Sticky hover：如果刚刚悬停过，短期内保持
    const now = performance.now();
    if (isHoveredNow) {
      lastHoverTimeRef.current = now;
    } else if (hovered && now - lastHoverTimeRef.current < STICKY_MS) {
      // 粘性阶段：仍视为悬停
      isHoveredNow = true;
    }

    // 8. 写入全局 hovered（带节流）
    if (isHoveredNow) {
      const state = useTarotStore.getState();
      if (state.hoveredRiverId !== tarot.id) {
        setHoveredRiverId(tarot.id);
      } else if (!state._lastHoverWrite || now - state._lastHoverWrite > 80) {
        setHoveredRiverId(tarot.id);
      }
    }

    if (isHoveredNow !== hovered) setHovered(isHoveredNow);

    // 9. 悬停视觉反馈：抬升 + 放大
    const liftY = hovered ? 0.5 : 0;
    const liftZ = hovered ? 0.85 : 0;
    groupRef.current.position.y += liftY;
    groupRef.current.position.z = liftZ;

    const targetScale = hovered ? 1.18 : 1.0;
    const curScale = groupRef.current.scale.x;
    const newScale = curScale + (targetScale - curScale) * 0.22;
    groupRef.current.scale.setScalar(newScale);
  });

  // 非选中牌在有人悬停时稍暗，增强对比
  const othersHovered = hoveredRiverId && hoveredRiverId !== tarot.id;
  const emissive = hovered ? 0.95 : othersHovered ? 0.05 : 0.15;

  return (
    <group ref={groupRef}>
      {/* 扩大的透明命中盒（不可见） */}
      <mesh ref={hitRef} visible={false}>
        <planeGeometry args={[HITBOX_W, HITBOX_H]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* 可见卡面 */}
      <mesh ref={visualMeshRef}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial
          ref={matRef}
          map={backTex}
          emissive="#ffd8a8"
          emissiveIntensity={emissive}
          side={THREE.FrontSide}
          toneMapped={false}
          transparent
          opacity={1}
        />
      </mesh>
    </group>
  );
}
