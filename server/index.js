// ============================================================
// 塔罗占卜应用 · 生产环境服务器
//
// - 托管 dist/ 前端静态资源（需先 npm run build）
// - AI 代理逻辑复用 aiConfigPlugin.js
// - 基于 IP 的限流（防止 API Key 被白嫖）
//
// 启动：node server/index.js
// 自定义端口：PORT=8080 node server/index.js
// ============================================================

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAIService } from './aiConfigPlugin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const PORT = parseInt(process.env.PORT || '3000', 10);
const RATE_MAX = parseInt(process.env.RATE_LIMIT || '30', 10);
const RATE_WINDOW_MS = 60 * 60 * 1000;

// ==================== 限流（滑动窗口 / IP） ====================
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, ts] of rateLimitMap.entries()) {
    const recent = ts.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, recent);
  }
}, 10 * 60 * 1000);

// ==================== App ====================
const app = express();
app.use(express.json({ limit: '2mb' }));
app.set('trust proxy', true);

const { handlers } = createAIService({
  configFile: path.join(ROOT, '.ai-config.json'),
});

// 配置接口
app.get('/api/_config', (req, res) => handlers.configGet(req, res));
app.post('/api/_config', (req, res) => handlers.configPost(req, res, req.body));
app.get('/api/_models', (req, res) => handlers.modelsGet(req, res));

// AI 对话接口（带限流）
app.post('/api/ai/chat', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: '请求过于频繁，每小时最多 ' + RATE_MAX + ' 次，请稍后再试',
    });
  }
  return handlers.chatPost(req, res, req.body);
});

// 静态资源
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  // SPA fallback（除 /api/* 外都返回 index.html）
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  console.warn('[server] dist/ 目录不存在，请先运行 npm run build');
  app.get('/', (req, res) => {
    res.status(503).send('请先运行 npm run build 生成前端资源');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`塔罗占卜服务已启动 · 端口 ${PORT} · 限流 ${RATE_MAX}/h`);
});
