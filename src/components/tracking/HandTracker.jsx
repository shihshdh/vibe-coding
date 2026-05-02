import { useRef } from 'react';
import { useHandTracker } from '../../hooks/useHandTracker';
import { useTarotStore } from '../../store/useTarotStore';

/**
 * 摄像头容器：视频元素隐藏，仅供 MediaPipe 分析使用
 * 副屏不启用摄像头，仅通过 BroadcastChannel 镜像主屏
 */
export default function HandTracker() {
  const videoRef = useRef(null);
  const isMirror = useTarotStore((s) => s.isMirror);

  useHandTracker(videoRef, !isMirror);

  return (
    <video
      ref={videoRef}
      className="hidden"
      playsInline
      muted
      autoPlay
    />
  );
}
