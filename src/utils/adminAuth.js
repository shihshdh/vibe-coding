/**
 * 管理员模式
 * - 密码：xuyujie071122
 * - 登录状态存 localStorage（sessionStorage 会每次新窗口都登录）
 * - 只有管理员可以配置 AI / 查看历史记录等敏感操作
 */

const ADMIN_PASSWORD = 'xuyujie071122';
const ADMIN_KEY = 'tarot-admin-session';

// 简单混淆（不是加密，但避免明文 localStorage）
function obfuscate(s) {
  return btoa(unescape(encodeURIComponent(s))).split('').reverse().join('');
}
function deobfuscate(s) {
  try {
    return decodeURIComponent(escape(atob(s.split('').reverse().join(''))));
  } catch (_) {
    return '';
  }
}

export function isAdminLoggedIn() {
  const v = localStorage.getItem(ADMIN_KEY);
  if (!v) return false;
  return deobfuscate(v) === ADMIN_PASSWORD;
}

/**
 * 尝试登录
 * @returns {{ok: boolean, message: string}}
 */
export function tryAdminLogin(password) {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(ADMIN_KEY, obfuscate(password));
    return { ok: true, message: '已进入管理员模式' };
  }
  return { ok: false, message: '密码错误' };
}

export function adminLogout() {
  localStorage.removeItem(ADMIN_KEY);
}
