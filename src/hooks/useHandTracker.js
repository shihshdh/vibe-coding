import { useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useTarotStore } from '../store/useTarotStore';
import { OneEuroFilter } from '../utils/oneEuroFilter';

/**
 * MediaPipe 手势识别 Hook（精度增强版）
 *
 * 关键改进：
 * 1. One-Euro Filter 参数更激进的稳定性：minCutoff 从 1.2 → 0.8（静止更稳）
 * 2. 扩大可用区：把摄像头中央 60% 映射到屏幕 100%，边缘不再需要把手伸很远
 * 3. Pinch 迟滞 + 持续确认：必须连续 2 帧确认才触发，消除误触
 * 4. 死区处理：小于 1px 的位移视为静止，锁定光标
 * 5. 运动预测：快速移动时提前 1 帧，补偿识别延迟
 */

// 映射参数：把摄像头中央部分 [0.2, 0.8] 放大到屏幕 [0, 1]
// 这样手不用伸到边缘也能触达屏幕角落
const MAP_MIN = 0.15;
const MAP_MAX = 0.85;
function remapToScreen(v) {
  const clamped = Math.max(MAP_MIN, Math.min(MAP_MAX, v));
  return (clamped - MAP_MIN) / (MAP_MAX - MAP_MIN);
}

export function useHandTracker(videoRef, enabled = true) {
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const pinchStateRef = useRef(false);
  const pinchConfirmCountRef = useRef(0);
  const pinchEmaRef = useRef(0.2);

  // 手掌打开检测（用于牌河加速）
  const palmStateRef = useRef(false);
  const palmConfirmCountRef = useRef(0);

  // 双通道 One-Euro Filter（更强的静止稳定性）
  // minCutoff 更低 → 静止时更不抖
  // beta 稍大 → 快动时依然跟手
  const xFilterRef = useRef(
    new OneEuroFilter({ minCutoff: 0.8, beta: 0.02, dCutoff: 1.0 })
  );
  const yFilterRef = useRef(
    new OneEuroFilter({ minCutoff: 0.8, beta: 0.02, dCutoff: 1.0 })
  );
  const lastCursorRef = useRef({ x: 0.5, y: 0.5 });
  const lastVelRef = useRef({ vx: 0, vy: 0, t: 0 });

  const setCursor = useTarotStore((s) => s.setCursor);
  const setPinching = useTarotStore((s) => s.setPinching);
  const setRiverAccelerate = useTarotStore((s) => s.setRiverAccelerate);

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;
    let stream = null;

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm'
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          // 提高置信度阈值 → 更稳，但需要手更清晰
          minHandDetectionConfidence: 0.65,
          minHandPresenceConfidence: 0.65,
          minTrackingConfidence: 0.7,
        });
        landmarkerRef.current = landmarker;

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60, max: 60 },
            facingMode: 'user',
          },
          audio: false,
        });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const detect = () => {
          if (!isMounted || !landmarkerRef.current || !video) return;
          if (video.readyState < 2) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }

          const now = performance.now();
          let result;
          try {
            result = landmarkerRef.current.detectForVideo(video, now);
          } catch (_) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }

          if (result && result.landmarks && result.landmarks.length > 0) {
            const lm = result.landmarks[0];
            const indexTip = lm[8];
            const thumbTip = lm[4];

            // 镜像翻转（自拍模式）
            const rawX = 1 - indexTip.x;
            const rawY = indexTip.y;

            // One-Euro 滤波
            const fx = xFilterRef.current.filter(rawX, now);
            const fy = yFilterRef.current.filter(rawY, now);

            // 重映射到屏幕：中央 70% 区域 → 屏幕 100%
            const mappedX = remapToScreen(fx);
            const mappedY = remapToScreen(fy);

            // 计算速度
            const last = lastVelRef.current;
            const dt = Math.max(1, now - last.t);
            const vx = (mappedX - lastCursorRef.current.x) / dt;
            const vy = (mappedY - lastCursorRef.current.y) / dt;

            // 死区：变化小于 0.0015（约 2px @ 1080p宽）视为静止
            const delta = Math.hypot(
              mappedX - lastCursorRef.current.x,
              mappedY - lastCursorRef.current.y
            );
            let finalX = mappedX;
            let finalY = mappedY;
            if (delta < 0.0015) {
              finalX = lastCursorRef.current.x;
              finalY = lastCursorRef.current.y;
            } else {
              // 运动预测：轻微前瞻（补偿识别 + 渲染延迟约 16ms）
              const speed = Math.hypot(vx, vy);
              if (speed > 0.0005) {
                const lookAhead = 8; // ms
                finalX = mappedX + vx * lookAhead;
                finalY = mappedY + vy * lookAhead;
                finalX = Math.max(0, Math.min(1, finalX));
                finalY = Math.max(0, Math.min(1, finalY));
              }
            }

            lastCursorRef.current.x = finalX;
            lastCursorRef.current.y = finalY;
            lastVelRef.current = { vx, vy, t: now };
            setCursor(finalX, finalY, true);

            // ===== Pinch 检测 =====
            const pdx = indexTip.x - thumbTip.x;
            const pdy = indexTip.y - thumbTip.y;
            const pdz = (indexTip.z || 0) - (thumbTip.z || 0);
            const rawDist = Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz);
            pinchEmaRef.current = pinchEmaRef.current * 0.55 + rawDist * 0.45;
            const dist = pinchEmaRef.current;

            // 迟滞 + 连续 2 帧确认
            const ENTER = 0.05;
            const EXIT = 0.075;
            let wantPinch = pinchStateRef.current;
            if (!pinchStateRef.current && dist < ENTER) wantPinch = true;
            else if (pinchStateRef.current && dist > EXIT) wantPinch = false;

            if (wantPinch !== pinchStateRef.current) {
              pinchConfirmCountRef.current++;
              if (pinchConfirmCountRef.current >= 2) {
                setPinching(wantPinch);
                pinchStateRef.current = wantPinch;
                pinchConfirmCountRef.current = 0;
              }
            } else {
              pinchConfirmCountRef.current = 0;
            }

            // ===== 手掌打开检测（牌河加速）=====
            // 手掌中心取 landmark 0（腕关节）
            // 对每根手指：TIP 到 wrist 的距离 应 > PIP 到 wrist 的距离
            //            （即手指伸直，不是蜷曲）
            // 且 4 根非拇指指尖两两之间有一定距离（张开不是合拢）
            const wrist = lm[0];
            const distToWrist = (p) => {
              const dx = p.x - wrist.x;
              const dy = p.y - wrist.y;
              return Math.hypot(dx, dy);
            };
            // 4 根手指的 TIP / PIP 索引对
            // index: tip=8 pip=6, middle: tip=12 pip=10, ring: tip=16 pip=14, pinky: tip=20 pip=18
            const fingerPairs = [[8, 6], [12, 10], [16, 14], [20, 18]];
            let extendedCount = 0;
            for (const [tip, pip] of fingerPairs) {
              if (distToWrist(lm[tip]) > distToWrist(lm[pip]) * 1.1) {
                extendedCount++;
              }
            }
            // 拇指单独看：拇指 tip(4) 到 wrist 距离 > IP(3) 到 wrist 距离
            const thumbExtended =
              distToWrist(lm[4]) > distToWrist(lm[3]) * 1.05;
            // 食指尖与小指尖分开足够远（张开而非合拢）
            const spread = Math.hypot(
              lm[8].x - lm[20].x,
              lm[8].y - lm[20].y
            );
            // 且 pinch 不能同时成立（捏合时手指也可能都伸着）
            const palmOpen =
              !pinchStateRef.current &&
              extendedCount === 4 &&
              thumbExtended &&
              spread > 0.15;

            if (palmOpen !== palmStateRef.current) {
              palmConfirmCountRef.current++;
              if (palmConfirmCountRef.current >= 3) {
                setRiverAccelerate(palmOpen);
                palmStateRef.current = palmOpen;
                palmConfirmCountRef.current = 0;
              }
            } else {
              palmConfirmCountRef.current = 0;
            }
          } else {
            setCursor(lastCursorRef.current.x, lastCursorRef.current.y, false);
            if (pinchStateRef.current) {
              setPinching(false);
              pinchStateRef.current = false;
              pinchConfirmCountRef.current = 0;
            }
            if (palmStateRef.current) {
              setRiverAccelerate(false);
              palmStateRef.current = false;
              palmConfirmCountRef.current = 0;
            }
          }

          rafRef.current = requestAnimationFrame(detect);
        };
        detect();
      } catch (err) {
        console.error('[HandTracker] 初始化失败:', err);
      }
    };

    init();
    return () => {
      isMounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch (_) {}
      }
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, videoRef, setCursor, setPinching]);
}
