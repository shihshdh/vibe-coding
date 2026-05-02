import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import CardArray from './CardArray';

/**
 * 3D 场景主容器
 * - 透明背景（让 DOM 层的星空透出来）
 * - Bloom 后处理：让粒子与卡片边缘辉光更强
 */
export default function TarotCanvas() {
  return (
    <Canvas
      camera={{ position: [0, -0.2, 7], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      {/* 透明背景 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 5]} intensity={1.4} />
      <pointLight position={[-3, -2, 3]} intensity={0.5} color="#ffd8a8" />
      <pointLight position={[3, 2, 3]} intensity={0.4} color="#a8c8ff" />

      <Suspense fallback={null}>
        <CardArray />
      </Suspense>

      <EffectComposer>
        <Bloom intensity={0.8} luminanceThreshold={0.55} mipmapBlur levels={7} />
      </EffectComposer>
    </Canvas>
  );
}
