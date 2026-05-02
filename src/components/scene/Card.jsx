import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useTarotStore } from '../../store/useTarotStore';
import { TAROT_DECK } from '../../data/tarotDeck';
import { getCardBackTexture, getCardFrontTexture } from '../../utils/textureGenerator';
import ParticleBurst from './ParticleBurst';

const CARD_W = 1;
const CARD_H = 1.7; // 标准塔罗比例

/**
 * 单张塔罗牌
 * - 双面 Plane：正面 + 背面（背面旋转 180°）
 * - 悬停：基于虚拟光标 NDC 坐标的 Raycaster 检测
 * - 翻牌：GSAP 动画，Y 轴 180° + 逆位时 Z 轴 180°
 * - 粒子：翻牌瞬间触发 ParticleBurst
 */
export default function Card({ slotId, position, flipped, reversed, tarotId, onSelect }) {
  const groupRef = useRef();
  const raycastTargetRef = useRef(); // 用于 raycaster 的目标 mesh
  const [hovered, setHovered] = useState(false);
  const [burstActive, setBurstActive] = useState(false);
  const prevPinchRef = useRef(false);
  const prevFlippedRef = useRef(false);
  const { camera } = useThree();

  const cursor = useTarotStore((s) => s.cursor);
  const isPinching = useTarotStore((s) => s.isPinching);
  const phase = useTarotStore((s) => s.phase);

  // 纹理（程序化生成，单例缓存）
  const backTex = useMemo(() => getCardBackTexture(), []);
  const frontTex = useMemo(() => {
    const tarot = tarotId ? TAROT_DECK.find((t) => t.id === tarotId) : null;
    return tarot ? getCardFrontTexture(tarot) : backTex;
  }, [tarotId, backTex]);

  // Raycaster 工具
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  // ========== 每帧：悬停检测 ==========
  useFrame(() => {
    if (!raycastTargetRef.current || phase === 'splash') {
      if (hovered) setHovered(false);
      return;
    }
    if (!cursor.visible) {
      if (hovered) setHovered(false);
      return;
    }

    // 归一化坐标 → NDC（Y 轴翻转）
    ndc.x = cursor.x * 2 - 1;
    ndc.y = -(cursor.y * 2 - 1);
    raycaster.setFromCamera(ndc, camera);

    const hits = raycaster.intersectObject(raycastTargetRef.current, false);
    const isHovered = hits.length > 0 && !flipped;

    if (isHovered !== hovered) setHovered(isHovered);
  });

  // ========== 悬停抬升动画 ==========
  useEffect(() => {
    if (!groupRef.current) return;
    gsap.to(groupRef.current.position, {
      z: hovered && !flipped ? 0.35 : 0,
      y: hovered && !flipped ? 0.1 : 0,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: true,
    });
  }, [hovered, flipped]);

  // ========== 捏合触发翻牌 ==========
  useEffect(() => {
    // 上升沿：刚刚从未捏变成捏
    if (isPinching && !prevPinchRef.current && hovered && !flipped && phase === 'selecting') {
      onSelect();
    }
    prevPinchRef.current = isPinching;
  }, [isPinching, hovered, flipped, phase, onSelect]);

  // ========== 翻牌动画 ==========
  useEffect(() => {
    if (!groupRef.current) return;
    if (flipped && !prevFlippedRef.current) {
      // 触发粒子
      setBurstActive(true);
      // 清掉悬停状态
      setHovered(false);

      // Y 轴 180° + 逆位叠加 Z 轴 180°
      gsap.to(groupRef.current.rotation, {
        y: Math.PI,
        z: reversed ? Math.PI : 0,
        duration: 1.2,
        ease: 'power3.inOut',
      });
      // 翻牌时小幅度放大 + 回落
      gsap.fromTo(
        groupRef.current.scale,
        { x: 1, y: 1, z: 1 },
        {
          x: 1.15,
          y: 1.15,
          z: 1.15,
          duration: 0.6,
          yoyo: true,
          repeat: 1,
          ease: 'power2.inOut',
        }
      );
      // 翻牌完成后落下到 z=0
      gsap.to(groupRef.current.position, {
        z: 0,
        y: 0,
        duration: 1.2,
        ease: 'power3.inOut',
      });

      // 2.5s 后关闭粒子（给消散动画留时间）
      setTimeout(() => setBurstActive(false), 2600);
    }
    prevFlippedRef.current = flipped;
  }, [flipped, reversed]);

  // 悬停时的辉光强度
  const emissiveIntensity = hovered && !flipped ? 0.55 : 0;

  return (
    <group ref={groupRef} position={position}>
      {/* Raycaster 检测用的透明 Plane（比卡片大一点便于命中）*/}
      <mesh ref={raycastTargetRef} visible={false}>
        <planeGeometry args={[CARD_W * 1.1, CARD_H * 1.05]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* 卡片正面（朝 +Z）*/}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial
          map={frontTex}
          emissive="#ffd8a8"
          emissiveIntensity={emissiveIntensity}
          side={THREE.FrontSide}
          toneMapped={false}
        />
      </mesh>

      {/* 卡片背面（朝 -Z，旋转 180° 使其正面朝外）*/}
      <mesh position={[0, 0, -0.003]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial
          map={backTex}
          emissive="#ffd8a8"
          emissiveIntensity={emissiveIntensity}
          side={THREE.FrontSide}
          toneMapped={false}
        />
      </mesh>

      {/* 粒子爆发 */}
      {burstActive && <ParticleBurst />}
    </group>
  );
}
