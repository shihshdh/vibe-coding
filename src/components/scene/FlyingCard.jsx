import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCardBackTexture } from '../../utils/textureLoader';

/**
 * 飞行中的牌：从牌河中被抽走，沿弧线飞到下方卡位
 * - 始终显示背面（到达卡位后由 SlotCard 的翻牌动画接管）
 * - ease-in-out 三次缓动
 * - 中途 Z 轴抬起形成弧线（看起来像抛物线飞行）
 * - 飞行中轻微旋转 + 缩小
 */
export default function FlyingCard({ startY, targetPos, startedAt, duration = 850 }) {
  const groupRef = useRef();
  const backTex = useMemo(() => getCardBackTexture(), []);

  useFrame(() => {
    if (!groupRef.current) return;
    const elapsed = performance.now() - startedAt;
    const t = Math.min(elapsed / duration, 1);
    // ease-in-out cubic
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // 起始位置：牌河中心（X=0 近似），目标位置 = targetPos
    const sx = 0;
    const sy = startY;
    const sz = 0.6;
    const [tx, ty, tz] = targetPos;

    const x = sx + (tx - sx) * eased;
    const y = sy + (ty - sy) * eased;
    // 弧线：中途 Z 抬高
    const arc = Math.sin(eased * Math.PI) * 1.5;
    const z = sz + (tz - sz) * eased + arc;

    groupRef.current.position.set(x, y, z);
    // 飞行旋转
    groupRef.current.rotation.z = (1 - eased) * 0.5;
    // 缩放（从牌河的 1.0 → 卡位的 0.9）
    const scale = 1 - eased * 0.1;
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[1, 1.7]} />
        <meshStandardMaterial
          map={backTex}
          emissive="#ffd8a8"
          emissiveIntensity={0.6}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
