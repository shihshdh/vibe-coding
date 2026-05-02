/**
 * AI 服务端插件（多 Provider 版本）
 *
 * 这个模块同时被 Vite dev server（开发）和 Express（生产）复用。
 *
 * 数据结构（.ai-config.json）：
 * {
 *   "providers": {
 *     "deepseek": { "apiKey": "sk-...", "enabled": true },
 *     "doubao": {
 *       "apiKey": "ark-...",
 *       "endpoints": [
 *         { "id": "ep-xxx", "label": "豆包 1.6 pro" },
 *         { "id": "ep-yyy", "label": "豆包 lite" }
 *       ],
 *       "enabled": true
 *     },
 *     "gemini": { "apiKey": "AIza...", "enabled": false }
 *   }
 * }
 *
 * 对外暴露的 HTTP 接口：
 *   GET  /api/_config           查看哪些 provider 已配置（不返回 Key）
 *   GET  /api/_models           查看所有可选模型（聚合自各 provider）
 *   POST /api/_config           管理员保存配置（需密码）
 *   POST /api/ai/chat           统一对话入口，body 里传 modelId 选择具体模型
 */

import fs from 'node:fs';
import path from 'node:path';

// 可选：通过 HTTPS_PROXY / HTTP_PROXY 环境变量启用代理（Gemini 等被墙服务必需）
// 例如：HTTPS_PROXY=http://127.0.0.1:7890 npm run dev
let proxyDispatcher = null;
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  '';
if (proxyUrl) {
  try {
    const { ProxyAgent } = await import('undici');
    proxyDispatcher = new ProxyAgent(proxyUrl);
    console.log(`[ai-proxy] 已启用 HTTP 代理: ${proxyUrl}`);
  } catch (e) {
    console.warn('[ai-proxy] 检测到 HTTPS_PROXY 但 undici 加载失败:', e.message);
  }
}

const ADMIN_PASSWORD = 'xuyujie071122';

// DeepSeek 和 Gemini 的可选模型（写死）
const DEEPSEEK_MODELS = [
  { id: 'deepseek-chat', label: 'DeepSeek Chat（快速）' },
  { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner（深度思考）' },
];
const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash（快速）' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro（强）' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash（快）' },
];

export function createAIService({ configFile = './.ai-config.json' } = {}) {
  const CONFIG_PATH = path.resolve(configFile);

  function readConfig() {
    try {
      if (!fs.existsSync(CONFIG_PATH)) return { providers: {} };
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (e) {
      console.warn('[ai-config] 读取失败:', e.message);
      return { providers: {} };
    }
  }

  function writeConfig(cfg) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  }

  // 查出所有已启用且有 Key 的 provider，聚合成可选模型列表
  function getAvailableModels() {
    const cfg = readConfig();
    const models = [];
    const p = cfg.providers || {};

    if (p.deepseek?.apiKey && p.deepseek.enabled !== false) {
      for (const m of DEEPSEEK_MODELS) {
        models.push({ provider: 'deepseek', id: m.id, label: m.label });
      }
    }
    if (p.doubao?.apiKey && p.doubao.enabled !== false) {
      for (const ep of p.doubao.endpoints || []) {
        if (ep.id) {
          models.push({
            provider: 'doubao',
            id: ep.id, // Endpoint ID 就作为 model id
            label: ep.label || ep.id,
          });
        }
      }
    }
    if (p.gemini?.apiKey && p.gemini.enabled !== false) {
      for (const m of GEMINI_MODELS) {
        models.push({ provider: 'gemini', id: m.id, label: m.label });
      }
    }
    return models;
  }

  // 根据 modelId 找到它归属的 provider
  function resolveProvider(modelId) {
    const models = getAvailableModels();
    return models.find((m) => m.id === modelId);
  }

  // ==================== 各 provider 的转发实现 ====================
  async function forwardDeepseek({ apiKey, model, body, res }) {
    const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ...body, model }),
    });
    return pipeUpstream(upstream, res);
  }

  async function forwardDoubao({ apiKey, model, body, res }) {
    // 豆包深度思考模型默认会返回 reasoning_content（思考过程）。
    // 显式设置 thinking.type=disabled 以减少不必要的 token 消耗和延迟。
    const requestBody = {
      ...body,
      model,
      thinking: { type: 'disabled' },
    };
    const upstream = await fetch(
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }
    );
    return pipeUpstream(upstream, res);
  }

  async function forwardGemini({ apiKey, model, body, res }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    // Gemini 需要不同的 body 格式（OpenAI → Gemini 转换）
    const contents = [];
    let systemText = '';
    for (const m of body.messages || []) {
      if (m.role === 'system') {
        systemText += (systemText ? '\n\n' : '') + m.content;
        continue;
      }
      const role = m.role === 'assistant' ? 'model' : 'user';
      let text = m.content;
      if (contents.length === 0 && role === 'user' && systemText) {
        text = systemText + '\n\n' + text;
        systemText = '';
      }
      contents.push({ role, parts: [{ text }] });
    }
    const fetchOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: body.temperature ?? 0.8 },
      }),
    };
    if (proxyDispatcher) fetchOpts.dispatcher = proxyDispatcher;
    const upstream = await fetch(url, fetchOpts);
    return pipeUpstream(upstream, res);
  }

  async function pipeUpstream(upstream, res) {
    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (['content-encoding', 'transfer-encoding', 'connection'].includes(k)) return;
      res.setHeader(key, value);
    });
    if (upstream.body) {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  }

  // ==================== HTTP handlers（框架无关） ====================
  /**
   * 注册到框架的核心：4 个路由处理器
   */
  const handlers = {
    // GET /api/_config — 配置状态（不含敏感字段）
    async configGet(req, res) {
      const cfg = readConfig();
      const p = cfg.providers || {};
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          deepseek: {
            configured: !!p.deepseek?.apiKey,
            enabled: p.deepseek?.enabled !== false,
          },
          doubao: {
            configured: !!p.doubao?.apiKey,
            enabled: p.doubao?.enabled !== false,
            endpoints: (p.doubao?.endpoints || []).map((e) => ({
              id: e.id,
              label: e.label,
            })),
          },
          gemini: {
            configured: !!p.gemini?.apiKey,
            enabled: p.gemini?.enabled !== false,
          },
        })
      );
    },

    // POST /api/_config — 保存配置（需管理员密码）
    async configPost(req, res, body) {
      if (body.password !== ADMIN_PASSWORD) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: '密码错误' }));
        return;
      }

      if (body.action === 'clearAll') {
        if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
        res.end(JSON.stringify({ ok: true, cleared: true }));
        return;
      }

      // body.providers = { deepseek: {...}, doubao: {...}, gemini: {...} }
      const cfg = readConfig();
      cfg.providers = cfg.providers || {};
      for (const [key, data] of Object.entries(body.providers || {})) {
        const existing = cfg.providers[key] || {};
        cfg.providers[key] = {
          ...existing,
          // apiKey 空字符串 → 删除 Key；undefined → 保持原有
          ...(data.apiKey !== undefined && data.apiKey !== ''
            ? { apiKey: data.apiKey }
            : data.apiKey === ''
            ? { apiKey: undefined }
            : {}),
          ...(data.endpoints !== undefined ? { endpoints: data.endpoints } : {}),
          ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        };
      }
      cfg.savedAt = new Date().toISOString();
      writeConfig(cfg);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    },

    // GET /api/_models — 所有可选模型（前端下拉用）
    async modelsGet(req, res) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ models: getAvailableModels() }));
    },

    // POST /api/ai/chat — 统一对话接口，body 含 modelId
    async chatPost(req, res, body) {
      const modelId = body.modelId;
      if (!modelId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: '缺少 modelId' }));
        return;
      }
      const resolved = resolveProvider(modelId);
      if (!resolved) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({ error: `模型 ${modelId} 不可用（未配置或已禁用）` })
        );
        return;
      }

      const cfg = readConfig();
      const providerCfg = cfg.providers[resolved.provider];
      if (!providerCfg?.apiKey) {
        res.statusCode = 503;
        res.end(JSON.stringify({ error: '该 provider 缺少 API Key' }));
        return;
      }

      // 剥离客户端专用字段
      const upstreamBody = {
        messages: body.messages,
        stream: body.stream !== false,
        temperature: body.temperature ?? 0.8,
      };

      try {
        if (resolved.provider === 'deepseek') {
          await forwardDeepseek({
            apiKey: providerCfg.apiKey,
            model: modelId,
            body: upstreamBody,
            res,
          });
        } else if (resolved.provider === 'doubao') {
          await forwardDoubao({
            apiKey: providerCfg.apiKey,
            model: modelId,
            body: upstreamBody,
            res,
          });
        } else if (resolved.provider === 'gemini') {
          await forwardGemini({
            apiKey: providerCfg.apiKey,
            model: modelId,
            body: upstreamBody,
            res,
          });
        }
      } catch (err) {
        console.error('[ai-proxy] 转发失败:', err);
        if (!res.headersSent) {
          res.statusCode = 502;
          // Gemini 网络错误特别提示
          let hint = '';
          const isGeminiNet =
            (resolved.provider === 'gemini') &&
            (err.cause?.code === 'ENOTFOUND' ||
              err.cause?.code === 'ECONNRESET' ||
              err.cause?.code === 'ETIMEDOUT' ||
              err.message === 'fetch failed');
          if (isGeminiNet) {
            hint = proxyDispatcher
              ? '（Gemini 走代理仍连接失败，请检查代理是否能访问 generativelanguage.googleapis.com）'
              : '（Gemini 在国内无法直连，请用 HTTPS_PROXY 环境变量配置代理后重启服务，或改用 DeepSeek/豆包）';
          }
          res.end(
            JSON.stringify({
              error: '上游请求失败: ' + err.message + (hint ? ' ' + hint : ''),
            })
          );
        }
      }
    },
  };

  return { handlers, readConfig, getAvailableModels };
}

// ==================== Vite 插件包装器 ====================
export function aiConfigPlugin(options = {}) {
  const service = createAIService(options);
  const { handlers } = service;

  return {
    name: 'ai-config-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // GET /api/_config
        if (url === '/api/_config' && req.method === 'GET') {
          return handlers.configGet(req, res);
        }
        // POST /api/_config
        if (url === '/api/_config' && req.method === 'POST') {
          const body = await readJsonBody(req);
          return handlers.configPost(req, res, body);
        }
        // GET /api/_models
        if (url === '/api/_models' && req.method === 'GET') {
          return handlers.modelsGet(req, res);
        }
        // POST /api/ai/chat
        if (url.startsWith('/api/ai/chat') && req.method === 'POST') {
          const body = await readJsonBody(req);
          return handlers.chatPost(req, res, body);
        }

        next();
      });
    },
  };
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8');
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}
