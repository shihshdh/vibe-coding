import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 320;
const LIFESPAN = 2.8;

/**
 * 翻牌粒子爆发（增强版）
 * - 粒子数增加到 320
 * - 颜色梯度：中心金白，外围粉紫
 * - 每颗粒子有独立尺寸和闪烁频率
 * - 指数阻尼运动 + 上浮力 + 扩散喘息
 */
export default function ParticleBurst({ position = [0, 0, 0.1] }) {
  const pointsRef = useRef();
  const matRef = useRef();
  const startTimeRef = useRef(null);

  const { geometry, velocities, seeds, colors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // 色谱：金 → 粉 → 紫
    const palette = [
      [1.0, 0.96, 0.85],   // 暖白
      [1.0, 0.85, 0.55],   // 金
      [1.0, 0.7, 0.8],     // 粉
      [0.85, 0.6, 1.0],    // 紫
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.05;

      // Marsaglia 球形分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1.3 + Math.random() * 2.2;
      velocities[i * 3 + 0] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i * 3 + 2] = Math.cos(phi) * speed * 0.4;

      seeds[i] = Math.random();
      sizes[i] = 0.04 + Math.random() * 0.08;

      // 按"离中心距离"分配颜色（速度越小越接近中心色调）
      const colorIdx = Math.min(
        palette.length - 1,
        Math.floor((speed - 1.3) / 2.2 * palette.length)
      );
      const c = palette[colorIdx];
      colors[i * 3 + 0] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geometry: geo, velocities, seeds, colors };
  }, []);

  useEffect(() => {
    startTimeRef.current = performance.now() / 1000;
    return () => geometry.dispose();
  }, [geometry]);

  useFrame(() => {
    if (!pointsRef.current || startTimeRef.current == null) return;

    const now = performance.now() / 1000;
    const elapsed = now - startTimeRef.current;
    const t = Math.min(elapsed / LIFESPAN, 1);

    const positions = pointsRef.current.geometry.attributes.position.array;
    const DAMPING = 2.3;
    const decayFactor = (1 - Math.exp(-DAMPING * elapsed)) / DAMPING;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // 闪烁扰动（让粒子轨迹有轻微波动）
      const wobble = Math.sin(elapsed * 6 + seeds[i] * 10) * 0.02;
      positions[i3 + 0] = velocities[i3 + 0] * decayFactor + wobble;
      const buoyancy = t * t * 1.0 * (0.4 + seeds[i]);
      positions[i3 + 1] = velocities[i3 + 1] * decayFactor + buoyancy + wobble;
      positions[i3 + 2] = velocities[i3 + 2] * decayFactor;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    if (matRef.current) {
      const fadeIn = Math.min(t / 0.1, 1);
      const fadeOut = Math.pow(1 - t, 1.6);
      matRef.current.opacity = Math.max(0, fadeIn * fadeOut);
      const sizeCurve = Math.sin(t * Math.PI) * 0.5 + 0.5;
      matRef.current.size = 0.06 + sizeCurve * 0.1;
    }
  });

  return (
    <points ref={pointsRef} position={position} geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        vertexColors
        size={0.1}
        transparent
        opacity={1}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
