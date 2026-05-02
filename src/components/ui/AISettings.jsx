import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PROVIDER_META,
  fetchConfigStatus,
  saveConfig,
  clearAllConfig,
} from '../../utils/aiClient';
import { useTarotStore } from '../../store/useTarotStore';

/**
 * AI 配置面板（服务端版本，支持多 provider + 豆包多 endpoint）
 */
export default function AISettings() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null); // { deepseek: {...}, doubao: {...}, gemini: {...} }
  const [editing, setEditing] = useState(null); // 'deepseek' | 'doubao' | 'gemini'
  const [apiKey, setApiKey] = useState('');
  const [endpoints, setEndpoints] = useState([]); // 豆包用：[{id, label}]
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState('');

  const isMirror = useTarotStore((s) => s.isMirror);
  const isAdmin = useTarotStore((s) => s.isAdmin);

  const reload = async () => {
    const s = await fetchConfigStatus();
    setStatus(s);
  };

  useEffect(() => {
    if (open) reload();
  }, [open]);

  if (isMirror) return null;
  if (!isAdmin) return null;

  const startEdit = (providerKey) => {
    setEditing(providerKey);
    const s = status?.[providerKey] || {};
    setApiKey('');
    setEndpoints(providerKey === 'doubao' ? s.endpoints || [] : []);
    setEnabled(s.enabled !== false);
    setHint('');
  };

  const addEndpoint = () => {
    setEndpoints([...endpoints, { id: '', label: '' }]);
  };
  const updateEndpoint = (i, field, val) => {
    const next = [...endpoints];
    next[i] = { ...next[i], [field]: val };
    setEndpoints(next);
  };
  const removeEndpoint = (i) => {
    setEndpoints(endpoints.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    const meta = PROVIDER_META[editing];
    const payload = {};

    // 对于修改场景：apiKey 留空表示保持原有，不发送
    if (apiKey.trim()) {
      payload.apiKey = apiKey.trim();
    } else if (!status?.[editing]?.configured) {
      setHint('首次配置必须填写 API Key');
      return;
    }
    payload.enabled = enabled;

    if (meta.kind === 'endpoints') {
      // 校验 endpoints
      const valid = endpoints.filter((e) => e.id.trim());
      if (valid.length === 0) {
        setHint('至少配置一个推理接入点');
        return;
      }
      payload.endpoints = valid.map((e) => ({
        id: e.id.trim(),
        label: (e.label || '').trim() || e.id.trim(),
      }));
    }

    setSaving(true);
    setHint('');
    try {
      await saveConfig({ [editing]: payload });
      await reload();
      setHint('✓ 已保存');
      setTimeout(() => {
        setEditing(null);
        setHint('');
      }, 800);
    } catch (err) {
      setHint('保存失败：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (providerKey, currentEnabled) => {
    try {
      await saveConfig({
        [providerKey]: { enabled: !currentEnabled },
      });
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClearKey = async (providerKey) => {
    if (!confirm(`清除 ${PROVIDER_META[providerKey].name} 的配置？`)) return;
    try {
      await saveConfig({ [providerKey]: { apiKey: '' } });
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('清空所有 AI 配置？所有设备的解读都会停止。')) return;
    try {
      await clearAllConfig();
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-btn pointer-events-auto fixed right-4 top-16 z-[70]"
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          color: 'rgba(220,200,255,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="AI 解读设置（管理员）"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto overflow-y-auto py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !editing && setOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-xl mx-6 my-auto rounded-2xl border border-white/20 p-6 text-white"
              style={{ background: 'rgba(15, 15, 25, 0.97)' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-1 tracking-wider">AI 解读设置</h3>
              <p className="text-xs text-white/50 mb-5">
                配置保存在服务端，所有设备共用。每家可独立开关。
              </p>

              {!editing && status && (
                <>
                  <div className="space-y-2 mb-4">
                    {Object.keys(PROVIDER_META).map((key) => {
                      const meta = PROVIDER_META[key];
                      const s = status[key] || {};
                      return (
                        <div
                          key={key}
                          className={`rounded-lg border p-3 transition ${
                            s.configured
                              ? s.enabled
                                ? 'border-emerald-400/40 bg-emerald-900/10'
                                : 'border-white/15 bg-white/5 opacity-60'
                              : 'border-white/10 bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-xl">{meta.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{meta.name}</span>
                                {s.configured && s.enabled && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                    已启用
                                  </span>
                                )}
                                {s.configured && !s.enabled && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 border border-white/20">
                                    已配置，已关闭
                                  </span>
                                )}
                                {key === 'doubao' && s.endpoints?.length > 0 && (
                                  <span className="text-[10px] text-white/50">
                                    · {s.endpoints.length} 个接入点
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-white/50 mt-0.5">
                                {meta.description}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {s.configured && (
                                <button
                                  onClick={() => handleToggleEnabled(key, s.enabled)}
                                  className="text-xs px-2.5 py-1 rounded border border-white/15 text-white/70 hover:bg-white/10"
                                >
                                  {s.enabled ? '关闭' : '启用'}
                                </button>
                              )}
                              <button
                                onClick={() => startEdit(key)}
                                className="text-xs px-2.5 py-1 rounded border border-pink-400/40 text-pink-300 hover:bg-pink-500/10"
                              >
                                {s.configured ? '修改' : '配置'}
                              </button>
                              {s.configured && (
                                <button
                                  onClick={() => handleClearKey(key)}
                                  className="text-xs px-2.5 py-1 rounded border border-rose-400/30 text-rose-300 hover:bg-rose-500/10"
                                >
                                  清除
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleClearAll}
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white/60 border border-white/15 hover:bg-white/5"
                    >
                      清空全部
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white/80 border border-white/15 hover:bg-white/5"
                    >
                      关闭
                    </button>
                  </div>
                </>
              )}

              {editing && (
                <>
                  <div className="mb-4 flex items-center gap-2">
                    <button
                      onClick={() => setEditing(null)}
                      className="text-xs text-white/50 hover:text-white"
                    >
                      ← 返回
                    </button>
                    <span className="text-sm tracking-wider">
                      配置 {PROVIDER_META[editing].name}
                    </span>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-white/70 tracking-wider mb-2 flex justify-between">
                      <span>API Key</span>
                      <a
                        href={PROVIDER_META[editing].docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pink-300/80 hover:text-pink-300 underline"
                      >
                        获取 Key ↗
                      </a>
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        status?.[editing]?.configured
                          ? '（已保存，留空保持不变；填写则覆盖）'
                          : PROVIDER_META[editing].keyPlaceholder
                      }
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white text-sm outline-none focus:border-pink-400/60"
                    />
                  </div>

                  {PROVIDER_META[editing].kind === 'endpoints' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-white/70 tracking-wider">
                          推理接入点列表
                          <span className="text-white/40 ml-2 text-[10px]">
                            在火山方舟控制台创建
                          </span>
                        </label>
                        <button
                          onClick={addEndpoint}
                          className="text-xs px-2 py-0.5 rounded border border-pink-400/40 text-pink-300 hover:bg-pink-500/10"
                        >
                          + 添加
                        </button>
                      </div>

                      {endpoints.length === 0 ? (
                        <div className="text-xs text-white/40 py-3 text-center border border-dashed border-white/10 rounded-lg">
                          暂无，点"+ 添加"创建
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {endpoints.map((ep, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={ep.id}
                                onChange={(e) => updateEndpoint(i, 'id', e.target.value)}
                                placeholder="ep-xxxxxxxx-xxxxx"
                                className="flex-1 px-2.5 py-2 rounded bg-white/5 border border-white/15 text-white text-xs outline-none focus:border-pink-400/60 font-mono"
                              />
                              <input
                                type="text"
                                value={ep.label}
                                onChange={(e) => updateEndpoint(i, 'label', e.target.value)}
                                placeholder="显示名（如：豆包 pro）"
                                className="flex-1 px-2.5 py-2 rounded bg-white/5 border border-white/15 text-white text-xs outline-none focus:border-pink-400/60"
                              />
                              <button
                                onClick={() => removeEndpoint(i)}
                                className="px-2 py-2 text-rose-300/80 hover:text-rose-300 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="provider-enabled"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="provider-enabled" className="text-xs text-white/70">
                      保存后立即启用
                    </label>
                  </div>

                  {hint && (
                    <div
                      className={`text-xs mb-3 ${
                        hint.startsWith('✓') ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {hint}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditing(null)}
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white/80 border border-white/15 hover:bg-white/5"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #f472b6, #ec4899)',
                        boxShadow: '0 0 20px rgba(244,114,182,0.4)',
                      }}
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
