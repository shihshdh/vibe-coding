import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useTarotStore } from '../../store/useTarotStore';
import { TAROT_DECK } from '../../data/tarotDeck';
import { getCardBackTexture, getCardFrontTexture } from '../../utils/textureLoader';
import ParticleBurst from './ParticleBurst';

const CARD_W = 0.9;
const CARD_H = 1.53;

/**
 * 下方的 5 个卡位
 * - tarotId 为 null 时：显示半透明占位符虚框
 * - tarotId 有值但 !flipped：显示背面（牌刚落位）
 * - flipped：翻转显示正面
 */
export default function SlotCard({ slotId, position, flipped, reversed, tarotId }) {
  const groupRef = useRef();
  const [burstActive, setBurstActive] = useState(false);
  const prevFlippedRef = useRef(false);
  const prevTarotIdRef = useRef(null);

  const backTex = useMemo(() => getCardBackTexture(), []);
  const phase = useTarotStore((s) => s.phase);
  const frontTex = useMemo(() => {
    const tarot = tarotId ? TAROT_DECK.find((t) => t.id === tarotId) : null;
    return tarot ? getCardFrontTexture(tarot) : backTex;
  }, [tarotId, backTex]);

  // 牌刚到位：从上方掉落进入动画
  useEffect(() => {
    if (!groupRef.current) return;
    if (tarotId && !prevTarotIdRef.current) {
      // 刚被赋值 tarotId：从上方落入
      groupRef.current.position.y = position[1] + 0.5;
      groupRef.current.scale.setScalar(0.85);
      gsap.to(groupRef.current.position, {
        y: position[1],
        duration: 0.4,
        ease: 'back.out(1.6)',
      });
      gsap.to(groupRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.4,
        ease: 'back.out(1.6)',
      });
    }
    prevTarotIdRef.current = tarotId;
  }, [tarotId, position]);

  // 翻牌动画
  useEffect(() => {
    if (!groupRef.current) return;
    if (flipped && !prevFlippedRef.current) {
      setBurstActive(true);
      gsap.to(groupRef.current.rotation, {
        y: Math.PI,
        z: reversed ? Math.PI : 0,
        duration: 1.0,
        ease: 'power3.inOut',
      });
      gsap.fromTo(
        groupRef.current.scale,
        { x: 1, y: 1, z: 1 },
        {
          x: 1.15,
          y: 1.15,
          z: 1.15,
          duration: 0.5,
          yoyo: true,
          repeat: 1,
          ease: 'power2.inOut',
        }
      );
      setTimeout(() => setBurstActive(false), 2600);
    } else if (!flipped && prevFlippedRef.current) {
      // 重置时恢复
      gsap.set(groupRef.current.rotation, { y: 0, z: 0 });
    }
    prevFlippedRef.current = flipped;
  }, [flipped, reversed]);

  // 空位：仅在选牌/完成阶段显示虚线框占位
  if (!tarotId) {
    if (phase !== 'selecting' && phase !== 'revealing' && phase !== 'done') {
      return null;
    }
    return (
      <group position={position}>
        <mesh>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.04}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* 虚线框效果用四条细边表示 */}
        <mesh>
          <ringGeometry args={[0.08, 0.1, 16]} />
          <meshBasicMaterial color="#ffd8a8" transparent opacity={0.3} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={position}>
      {/* 正面 */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial
          map={frontTex}
          side={THREE.FrontSide}
          toneMapped={false}
        />
      </mesh>
      {/* 背面 */}
      <mesh position={[0, 0, -0.003]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial
          map={backTex}
          side={THREE.FrontSide}
          toneMapped={false}
        />
      </mesh>

      {burstActive && <ParticleBurst />}
    </group>
  );
}
