/**
 * 前端 AI 客户端（与 server/aiConfigPlugin.js 对接）
 *
 * 接口：
 *   GET  /api/_config    → { deepseek:{configured,enabled}, doubao:{..., endpoints:[]}, gemini:{...} }
 *   POST /api/_config    → 管理员保存
 *   GET  /api/_models    → { models: [{provider, id, label}] }
 *   POST /api/ai/chat    → 流式对话，body: {modelId, messages, temperature, stream}
 *
 * 所有 API Key 存服务端，浏览器不接触。
 */

// ==================== 管理员配置面板展示用的元信息 ====================
export const PROVIDER_META = {
  deepseek: {
    name: 'DeepSeek',
    shortName: 'DeepSeek',
    icon: '🧠',
    docUrl: 'https://platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-...',
    description: '国内速度快，价格便宜',
    kind: 'simple', // 仅需 apiKey
  },
  doubao: {
    name: '豆包 (Doubao)',
    shortName: '豆包',
    icon: '🫘',
    docUrl: 'https://console.volcengine.com/ark',
    keyPlaceholder: 'ark-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxxx',
    description: '字节跳动出品，中文优秀',
    kind: 'endpoints', // apiKey + 多个 endpoint
    endpointPlaceholder: 'ep-xxxxxxxx-xxxxx',
  },
  gemini: {
    name: 'Google Gemini',
    shortName: 'Gemini',
    icon: '✦',
    docUrl: 'https://aistudio.google.com/apikey',
    keyPlaceholder: 'AIza...',
    description: '谷歌模型，推理与文笔俱佳',
    kind: 'simple',
  },
};

const ADMIN_PASSWORD = 'xuyujie071122';

// ==================== 查询 ====================
export async function fetchConfigStatus() {
  try {
    const res = await fetch('/api/_config');
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

export async function fetchAvailableModels() {
  try {
    const res = await fetch('/api/_models');
    if (!res.ok) return [];
    const data = await res.json();
    return data.models || [];
  } catch (_) {
    return [];
  }
}

// ==================== 管理员保存 ====================
/**
 * @param {object} payload - 例如:
 *   { providers: {
 *       deepseek: { apiKey: 'sk-xxx', enabled: true },
 *       doubao: { apiKey: 'ark-xxx', endpoints: [{id,label}], enabled: true }
 *   }}
 */
export async function saveConfig(providersPayload) {
  const res = await fetch('/api/_config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: ADMIN_PASSWORD,
      providers: providersPayload,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || '保存失败');
  return data;
}

export async function clearAllConfig() {
  const res = await fetch('/api/_config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: ADMIN_PASSWORD,
      action: 'clearAll',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || '清空失败');
  return data;
}

// ==================== 对话流 ====================
/**
 * @param {string} modelId - 模型 id（DeepSeek 的模型名 / 豆包的 Endpoint ID / Gemini 的模型名）
 * @param {Array} messages
 * @param {{signal?: AbortSignal}} opts
 */
export async function* chatStream(modelId, messages, { signal } = {}) {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelId,
      messages,
      stream: true,
      temperature: 0.8,
    }),
    signal,
  });

  if (!res.ok) {
    let errText;
    try {
      const data = await res.json();
      errText = data.error || JSON.stringify(data);
    } catch (_) {
      errText = await res.text();
    }
    throw new Error(`API 请求失败 (${res.status}): ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        // 仅取最终回答内容，跳过思考过程（reasoning_content）
        const delta =
          json.choices?.[0]?.delta?.content ||
          json.candidates?.[0]?.content?.parts?.[0]?.text ||
          '';
        if (delta) yield delta;
      } catch (_) {}
    }
  }
}
