import * as THREE from 'three';

/**
 * 程序化生成卡背纹理：白色背景 + 金色麦达昶立方体
 * 返回 THREE.CanvasTexture，无需外部图片资源
 */
export function generateCardBackTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = Math.floor(size * 1.7); // 1:1.7 塔罗比例
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // 1. 白色渐变背景
  const bg = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, H * 0.7);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.6, '#f5f3ee');
  bg.addColorStop(1, '#e8e4d8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 2. 边框（金色）
  ctx.strokeStyle = '#b8935a';
  ctx.lineWidth = 8;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, W - 100, H - 100);

  // 3. 麦达昶立方体（Metatron's Cube）
  const cx = W / 2;
  const cy = H / 2;
  const R = W * 0.32; // 主半径
  ctx.strokeStyle = '#c9a44a';
  ctx.lineWidth = 1.8;
  ctx.fillStyle = '#d4af37';

  // 13 个中心点：1 中心 + 6 内环 + 6 外环
  const centers = [{ x: cx, y: cy }];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    centers.push({
      x: cx + Math.cos(a) * R * 0.5,
      y: cy + Math.sin(a) * R * 0.5,
    });
  }
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    centers.push({
      x: cx + Math.cos(a) * R,
      y: cy + Math.sin(a) * R,
    });
  }

  // 连接所有点（麦达昶立方体的核心）
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      ctx.beginPath();
      ctx.moveTo(centers[i].x, centers[i].y);
      ctx.lineTo(centers[j].x, centers[j].y);
      ctx.stroke();
    }
  }

  // 外部 13 个圆
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#b8935a';
  ctx.lineWidth = 2.2;
  const circleR = R * 0.28;
  centers.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, circleR, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 中心点高光
  ctx.globalAlpha = 1;
  centers.forEach((p) => {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
    g.addColorStop(0, '#ffe8a8');
    g.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  // 四角小星饰
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#b8935a';
  [[120, 120], [W - 120, 120], [120, H - 120], [W - 120, H - 120]].forEach(
    ([x, y]) => {
      drawStar(ctx, x, y, 5, 14, 6);
    }
  );

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 程序化生成卡面纹理
 * 用塔罗牌元数据驱动（名称、英文名、关键词、色调）
 */
export function generateCardFrontTexture(tarot) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = Math.floor(size * 1.7);
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // 背景渐变（使用该牌的 accent 色）
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, shade(tarot.accent, -0.5));
  bg.addColorStop(0.5, shade(tarot.accent, -0.2));
  bg.addColorStop(1, shade(tarot.accent, -0.6));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 边框
  ctx.strokeStyle = '#f5e6b8';
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.strokeRect(55, 55, W - 110, H - 110);

  // 上方罗马数字/标题区域
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5e6b8';
  ctx.font = 'bold 64px "Times New Roman", serif';
  ctx.fillText(tarot.nameEn.toUpperCase(), W / 2, 180);

  // 中心符号：用该牌的 accent 色绘制一个象征性圆环图腾
  const cx = W / 2;
  const cy = H * 0.48;
  drawSigil(ctx, cx, cy, W * 0.32, tarot);

  // 底部中文名（大字）
  ctx.fillStyle = '#fff4d6';
  ctx.font = 'bold 110px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(tarot.nameZh, W / 2, H - 280);

  // 意义文字
  ctx.fillStyle = 'rgba(255, 244, 214, 0.8)';
  ctx.font = '42px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(tarot.meaning, W / 2, H - 180);

  // 关键词
  ctx.fillStyle = 'rgba(255, 244, 214, 0.6)';
  ctx.font = '32px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText(tarot.keywords.join(' · '), W / 2, H - 110);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// ============ 辅助函数 ============

function drawStar(ctx, x, y, points, outer, inner) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSigil(ctx, cx, cy, R, tarot) {
  ctx.save();

  // 外环
  ctx.strokeStyle = '#f5e6b8';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // 内环
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // 六芒/八芒星（根据 id 哈希决定点数）
  const hash = tarot.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const points = 5 + (hash % 4); // 5-8 角
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#fff4d6';
  drawStar(ctx, cx, cy, points, R * 0.7, R * 0.3);

  // 中心点
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // 辐射线
  ctx.strokeStyle = 'rgba(245, 230, 184, 0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 / 12) * i;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.85, cy + Math.sin(a) * R * 0.85);
    ctx.lineTo(cx + Math.cos(a) * R * 1.05, cy + Math.sin(a) * R * 1.05);
    ctx.stroke();
  }

  ctx.restore();
}

/** 调整颜色明度：amount 为 -1(黑) ~ 1(白) */
function shade(hex, amount) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const mix = (ch) => {
    const v =
      amount < 0
        ? Math.round(ch * (1 + amount))
        : Math.round(ch + (255 - ch) * amount);
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  };
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

// 单例缓存：卡背 + 每张卡面只生成一次
let _backTexCache = null;
const _frontTexCache = new Map();

export function getCardBackTexture() {
  if (!_backTexCache) _backTexCache = generateCardBackTexture();
  return _backTexCache;
}

export function getCardFrontTexture(tarot) {
  if (!tarot) return getCardBackTexture();
  if (!_frontTexCache.has(tarot.id)) {
    _frontTexCache.set(tarot.id, generateCardFrontTexture(tarot));
  }
  return _frontTexCache.get(tarot.id);
}
