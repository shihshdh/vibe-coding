// ============================================================
//  BGM 跨页连续播放
//  - 第一页打开后用户点击「🔊」按钮解锁声音
//  - 翻页前保存当前播放进度
//  - 新页面读取进度，从那里继续
// ============================================================
(function() {
  const STORAGE_KEY_TIME    = 'bgm_time';
  const STORAGE_KEY_ENABLED = 'bgm_enabled'; // 用户是否已经手动开过声音
  const BGM_SRC = 'assets/audio/bgm.mp3';

  // 创建 audio 元素
  const audio = new Audio(BGM_SRC);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.55; // 不要盖住朋友说话的能量

  // 读取上次进度
  const savedTime = parseFloat(sessionStorage.getItem(STORAGE_KEY_TIME) || '0');
  if (savedTime > 0 && isFinite(savedTime)) {
    // metadata 加载好后再 seek，否则会被忽略
    audio.addEventListener('loadedmetadata', () => {
      try {
        if (savedTime < audio.duration) audio.currentTime = savedTime;
      } catch (e) {}
    }, { once: true });
  }

  // 翻页时保存进度（pagehide 比 beforeunload 更可靠，尤其 Safari）
  function saveProgress() {
    try {
      sessionStorage.setItem(STORAGE_KEY_TIME, String(audio.currentTime || 0));
    } catch (e) {}
  }
  window.addEventListener('pagehide', saveProgress);
  window.addEventListener('beforeunload', saveProgress);

  // 解锁声音 —— 只能由用户手势触发
  let unlocked = false;
  function tryPlay() {
    return audio.play().then(() => {
      unlocked = true;
      sessionStorage.setItem(STORAGE_KEY_ENABLED, '1');
      try { localStorage.setItem(STORAGE_KEY_ENABLED, '1'); } catch (e) {}
      updateBtnUI();
    }).catch(() => {
      unlocked = false;
      updateBtnUI();
    });
  }

  // 创建浮标按钮
  function createBtn() {
    // 添加全局样式（呼吸动画 + tooltip）
    const style = document.createElement('style');
    style.textContent = `
      #bgm-toggle.pulse {
        animation: bgmPulse 2s ease-in-out infinite;
      }
      @keyframes bgmPulse {
        0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 0 rgba(255,255,255,0.5); }
        50%      { box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 12px rgba(255,255,255,0); }
      }
      #bgm-tooltip {
        position: fixed;
        right: 68px;
        bottom: 24px;
        padding: 8px 14px;
        background: rgba(255,255,255,0.95);
        color: #2a2a2a;
        font-family: "LXGW WenKai","Noto Serif SC",serif;
        font-size: 13px;
        letter-spacing: 0.08em;
        border-radius: 22px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        z-index: 500;
        white-space: nowrap;
        opacity: 0;
        transform: translateX(8px);
        transition: opacity 0.4s ease, transform 0.4s ease;
        pointer-events: none;
      }
      #bgm-tooltip.show { opacity: 1; transform: translateX(0); }
      #bgm-tooltip::after {
        content: '';
        position: absolute;
        right: -5px; top: 50%;
        transform: translateY(-50%);
        border: 6px solid transparent;
        border-left-color: rgba(255,255,255,0.95);
        border-right: 0;
      }
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'bgm-toggle';
    btn.setAttribute('aria-label', '开启 / 关闭背景音乐');
    btn.innerHTML = `
      <svg class="bgm-icon-on" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M3 10v4a1 1 0 0 0 1 1h3l4 4V5L7 9H4a1 1 0 0 0-1 1z"/>
        <path d="M16 8.5a4 4 0 0 1 0 7" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M18.5 6a7 7 0 0 1 0 12" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      </svg>
      <svg class="bgm-icon-off" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" style="display:none">
        <path d="M3 10v4a1 1 0 0 0 1 1h3l4 4V5L7 9H4a1 1 0 0 0-1 1z"/>
        <path d="M15 9l6 6m0-6l-6 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      </svg>`;
    Object.assign(btn.style, {
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.18)',
      border: '1px solid rgba(255,255,255,0.4)',
      color: 'rgba(255,255,255,1)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      cursor: 'pointer',
      zIndex: '500',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      transition: 'transform 0.2s cubic-bezier(.5,1.6,.4,1), background 0.3s, opacity 0.4s',
      WebkitTapHighlightColor: 'transparent',
      userSelect: 'none',
      opacity: '0',
    });
    document.body.appendChild(btn);

    // 提示气泡：仅当用户从未解锁过 BGM 时显示
    const everEnabled = sessionStorage.getItem(STORAGE_KEY_ENABLED) === '1' ||
                        localStorage.getItem(STORAGE_KEY_ENABLED) === '1';
    let tooltip = null;
    if (!everEnabled) {
      tooltip = document.createElement('div');
      tooltip.id = 'bgm-tooltip';
      tooltip.textContent = '点这里开启背景音乐 ♪';
      document.body.appendChild(tooltip);
    }

    requestAnimationFrame(() => {
      btn.style.opacity = '1';
      if (!everEnabled) {
        btn.classList.add('pulse'); // 呼吸提示
        if (tooltip) {
          setTimeout(() => tooltip.classList.add('show'), 1200);
          setTimeout(() => tooltip.classList.remove('show'), 6000);
        }
      }
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255,255,255,0.28)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255,255,255,0.18)';
    });
    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.92)'; });
    btn.addEventListener('mouseup',   () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('mouseleave',() => { btn.style.transform = 'scale(1)'; });

    btn.addEventListener('click', () => {
      if (audio.paused) {
        tryPlay();
      } else {
        audio.pause();
        sessionStorage.removeItem(STORAGE_KEY_ENABLED);
        updateBtnUI();
      }
      // 移除呼吸动画 + tooltip
      btn.classList.remove('pulse');
      if (tooltip) tooltip.classList.remove('show');
      if (navigator.vibrate) navigator.vibrate(8);
    });

    return btn;
  }

  let btn;
  function updateBtnUI() {
    if (!btn) return;
    const on = !audio.paused;
    btn.querySelector('.bgm-icon-on').style.display  = on ? 'block' : 'none';
    btn.querySelector('.bgm-icon-off').style.display = on ? 'none' : 'block';
    btn.style.opacity = on ? '0.7' : '1';
    btn.title = on ? '点击静音' : '点击开启背景音乐';
  }

  // 入口
  function init() {
    btn = createBtn();
    updateBtnUI();

    // 如果之前页面用户已经解锁过，尝试自动续播
    const wasEnabled = sessionStorage.getItem(STORAGE_KEY_ENABLED) === '1';
    if (wasEnabled) {
      // 部分浏览器即使是同 session 也要再次手势触发
      // 试一下，失败就等用户手动点
      tryPlay();
    }

    // 用户首次和页面交互时（点击/滚动/键盘），如果还没开就尝试一次
    function tryUnlockOnGesture() {
      if (!unlocked && audio.paused && sessionStorage.getItem(STORAGE_KEY_ENABLED) === '1') {
        tryPlay();
      }
      // 不解除监听，因为 sessionStorage 状态可能变
    }
    ['click', 'touchstart', 'keydown'].forEach(ev => {
      document.addEventListener(ev, tryUnlockOnGesture, { passive: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
