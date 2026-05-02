import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTarotStore } from '../../store/useTarotStore';
import { TAROT_DECK } from '../../data/tarotDeck';

/**
 * 分享 / 导出
 * - 生成一张包含 5 张牌 + 问题 + 解读的合成图
 * - 支持下载 PNG 或复制纯文本
 * - 仅在 phase='done' 显示入口
 */
export default function ShareButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const phase = useTarotStore((s) => s.phase);
  const isMirror = useTarotStore((s) => s.isMirror);
  const cards = useTarotStore((s) => s.cards);
  const question = useTarotStore((s) => s.question);
  const reading = useTarotStore((s) => s.reading);
  const readingStatus = useTarotStore((s) => s.readingStatus);

  if (isMirror) return null;
  if (phase !== 'done') return null;

  const toText = () => {
    const positions = ['过去', '现在', '未来', '建议', '结果'];
    const lines = [];
    lines.push(`【命运的抉择 · 塔罗占卜】`);
    lines.push(`时间：${new Date().toLocaleString('zh-CN')}`);
    lines.push(`问题：${question || '（未明确提问）'}`);
    lines.push('');
    lines.push('—— 牌阵 ——');
    cards.forEach((c, i) => {
      const t = TAROT_DECK.find((x) => x.id === c.tarotId);
      if (!t) return;
      lines.push(`${positions[i]}：${t.nameZh}（${c.reversed ? '逆位' : '正位'}）`);
    });
    lines.push('');
    lines.push('—— 解读 ——');
    lines.push(reading || '(未生成)');
    return lines.join('\n');
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(toText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      alert('复制失败：' + e.message);
    }
  };

  const downloadImage = async () => {
    setBusy(true);
    try {
      const canvas = await composeImage({ cards, question, reading });
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png', 1));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tarot-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败：' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="pointer-events-auto fixed right-4 bottom-4 z-[70] rounded-full border border-white/20 bg-white/10 backdrop-blur px-5 py-2.5 text-sm tracking-widest text-white hover:bg-white/20 transition flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        分享 / 导出
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-md mx-6 rounded-2xl border border-white/20 p-6 text-white"
              style={{ background: 'rgba(15, 15, 25, 0.96)' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-1 tracking-wider">分享 / 导出</h3>
              <p className="text-xs text-white/50 mb-5">保留这次占卜的牌阵与解读</p>

              <div className="space-y-3">
                <button
                  onClick={downloadImage}
                  disabled={busy}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white border border-white/15 bg-white/5 hover:bg-white/10 transition flex items-center justify-between disabled:opacity-50"
                >
                  <span>{busy ? '生成中...' : '下载图片 (PNG)'}</span>
                  <span className="text-white/40 text-xs">含牌阵缩略图</span>
                </button>

                <button
                  onClick={copyText}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white border border-white/15 bg-white/5 hover:bg-white/10 transition flex items-center justify-between"
                >
                  <span>{copied ? '✓ 已复制' : '复制文字'}</span>
                  <span className="text-white/40 text-xs">纯文本</span>
                </button>

                {readingStatus !== 'done' && readingStatus !== 'idle' && (
                  <div className="text-xs text-amber-300/80 pt-1">
                    ⚠ 解读尚未完成，建议等待结束后再导出
                  </div>
                )}
              </div>

              <button
                onClick={() => setOpen(false)}
                className="mt-5 w-full px-4 py-2.5 rounded-lg text-sm text-white/60 border border-white/15 hover:bg-white/5 transition"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ==================== Canvas 合成 ====================
async function composeImage({ cards, question, reading }) {
  const W = 1200;
  const CARD_W = 180;
  const CARD_H = Math.floor(CARD_W * 1.7);
  const PAD = 40;

  const imgs = await Promise.all(
    cards.map((c) => {
      const t = TAROT_DECK.find((x) => x.id === c.tarotId);
      if (!t) return Promise.resolve(null);
      return loadImage(`/textures/cards/${t.file}`).catch(() => null);
    })
  );

  // 估算解读区高度
  const approxLines = Math.ceil((reading || '').length / 48) + (reading || '').split('\n').length;
  const READING_H = Math.max(120, approxLines * 32 + 40);
  const H = 170 + 80 + (CARD_H + 100) + READING_H + 80;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0a1a');
  bg.addColorStop(0.5, '#14142a');
  bg.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 星点装饰
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 1.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 标题
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('命运的抉择 · 塔罗占卜', W / 2, 70);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '18px "PingFang SC", sans-serif';
  ctx.fillText(new Date().toLocaleString('zh-CN'), W / 2, 100);

  // 问题
  let y = 150;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '18px "PingFang SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('问：', PAD, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px "PingFang SC", sans-serif';
  wrapAndFill(ctx, question || '（未明确提问）', PAD + 50, y, W - PAD * 2 - 50, 30);
  y += 70;

  // 五张牌
  const positions = ['过去', '现在', '未来', '建议', '结果'];
  const slotsWidth = 5 * CARD_W + 4 * 30;
  const startX = (W - slotsWidth) / 2;
  cards.forEach((c, i) => {
    const t = TAROT_DECK.find((x) => x.id === c.tarotId);
    const x = startX + i * (CARD_W + 30);
    const img = imgs[i];
    if (img) {
      ctx.save();
      if (c.reversed) {
        ctx.translate(x + CARD_W / 2, y + CARD_H / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(img, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      } else {
        ctx.drawImage(img, x, y, CARD_W, CARD_H);
      }
      ctx.restore();
    }
    ctx.fillStyle = '#f472b6';
    ctx.font = '16px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(positions[i], x + CARD_W / 2, y + CARD_H + 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "PingFang SC", sans-serif';
    ctx.fillText(t?.nameZh || '', x + CARD_W / 2, y + CARD_H + 50);
    ctx.fillStyle = c.reversed ? '#fda4af' : '#6ee7b7';
    ctx.font = '14px "PingFang SC", sans-serif';
    ctx.fillText(c.reversed ? '逆位' : '正位', x + CARD_W / 2, y + CARD_H + 72);
  });
  y += CARD_H + 100;

  // 解读
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '16px "PingFang SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('—— 解读 ——', PAD, y);
  y += 30;

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '18px "PingFang SC", sans-serif';
  wrapAndFill(ctx, reading || '(未生成)', PAD, y, W - PAD * 2, 30);

  return canvas;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapAndFill(ctx, text, x, y, maxW, lh) {
  const paragraphs = (text || '').split('\n');
  let cy = y;
  for (const para of paragraphs) {
    if (!para.trim()) {
      cy += lh * 0.5;
      continue;
    }
    let line = '';
    for (const ch of para) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, cy);
        cy += lh;
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, cy);
      cy += lh;
    }
  }
}
