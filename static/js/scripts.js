const content_dir = 'contents/';
const config_file = 'config.yml';
const section_names = ['home', 'publications', 'awards'];

window.addEventListener('DOMContentLoaded', () => {
  // ---- ScrollSpy ----
  const mainNav = document.querySelector('#mainNav');
  if (mainNav && window.bootstrap?.ScrollSpy) {
    new bootstrap.ScrollSpy(document.body, { target: '#mainNav', offset: 74 });
  }

  // ---- Collapse navbar on item click (mobile) ----
  const navbarToggler = document.querySelector('.navbar-toggler');
  const responsiveNavItems = document.querySelectorAll('#navbarResponsive .nav-link');
  responsiveNavItems.forEach((item) => {
    item.addEventListener('click', () => {
      if (navbarToggler && window.getComputedStyle(navbarToggler).display !== 'none') {
        navbarToggler.click();
      }
    });
  });

  // ---- Load config.yml and inject ----
  fetch(content_dir + config_file)
    .then((res) => res.text())
    .then((text) => {
      const yml = (window.jsyaml ? jsyaml.load(text) : {}) || {};
      Object.keys(yml).forEach((key) => {
        const val = yml[key];
        if (key === 'title') document.title = String(val);
        const el = document.getElementById(key);
        if (el) el.innerHTML = val;
      });
    })
    .catch((err) => console.log(err));

  // ---- Markdown rendering ----
  if (window.marked) {
    marked.use({ mangle: false, headerIds: false });
  }

  const tasks = section_names.map((name) =>
    fetch(content_dir + name + '.md')
      .then((res) => res.text())
      .then((md) => {
        const html = window.marked ? marked.parse(md) : md;
        const container = document.getElementById(name + '-md');
        if (container) container.innerHTML = html;
      })
      .catch((err) => console.log(err))
  );

  Promise.all(tasks).then(() => {
    // ---- MathJax once ----
    if (window.MathJax) {
      if (typeof MathJax.typesetPromise === 'function') {
        MathJax.typesetPromise().catch((e) => console.error(e));
      } else if (typeof MathJax.typeset === 'function') {
        try { MathJax.typeset(); } catch (e) { console.error(e); }
      }
    }
    // ---- Enable image lightbox ----
    enableImageZoom();
  });
});

// ================== Image Lightbox ==================
function enableImageZoom() {
  // 兼容 #publications 或 #projects
  const selector = '#publications .main-body p > img, #projects .main-body p > img';
  const imgs = document.querySelectorAll(selector);
  if (!imgs.length) return;

  // 遮罩
  let backdrop = document.getElementById('img-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'img-backdrop';
    document.body.appendChild(backdrop);
  }

  // 右上角关闭按钮
  let closeBtn = document.getElementById('img-close');
  if (!closeBtn) {
    closeBtn = document.createElement('button');
    closeBtn.id = 'img-close';
    closeBtn.setAttribute('aria-label', 'Close image');
    closeBtn.innerHTML = '&times;';
    document.body.appendChild(closeBtn);
  }

  let globalCloser = null;

  function closeZoom() {
    const z = document.querySelector('img.zoomed');
    if (z) z.classList.remove('zoomed');
    document.body.classList.remove('lightbox-open');
    if (globalCloser) {
      document.removeEventListener('click', globalCloser, true);
      globalCloser = null;
    }
  }

  function openZoom(img) {
    document.querySelectorAll('img.zoomed').forEach(el => el.classList.remove('zoomed'));
    img.classList.add('zoomed');
    document.body.classList.add('lightbox-open');

    // 任意点击关闭（捕获阶段，延迟装上以避开当前点击）
    globalCloser = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeZoom();
    };
    setTimeout(() => document.addEventListener('click', globalCloser, true), 0);
  }

  imgs.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
      if (!img.classList.contains('zoomed')) {
        e.preventDefault();
        e.stopPropagation();
        openZoom(img);
      }
    });
  });

  backdrop.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeZoom(); });
  closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeZoom(); });
}

Promise.all(tasks).then(() => {
  // MathJax 一次性排版
  if (window.MathJax) {
    if (typeof MathJax.typesetPromise === 'function') MathJax.typesetPromise().catch(console.error);
    else if (typeof MathJax.typeset === 'function') try { MathJax.typeset(); } catch (e) { console.error(e); }
  }
  // 图片放大
  enableImageZoom();

  // === 新增：同步 CTI 两张缩略图的高度（让 screenshot2.webp 和第一张一样高） ===
  syncCTIThumbHeights();
  window.addEventListener('resize', debounce(syncCTIThumbHeights, 150));
});

// 让 CTI 项目的第二张图（screenshot2.webp）在缩略图状态下与第一张等高
function syncCTIThumbHeights() {
  // 兼容 #publications 和 #projects
  const scope = document.querySelector('#projects .main-body, #publications .main-body');
  if (!scope) return;

  // 按文件名匹配：请确认第一张图名包含 "Flow_Figure-3"（或改成你实际的关键字）
  const img1 = scope.querySelector('img[src*="Flow_Figure-3"], img[src*="Flow_Figure%203"]');
  // 第二张图名明确为 screenshot2.webp
  const img2 = scope.querySelector('img[src$="screenshot2.webp"], img[src*="screenshot2"]');
  if (!img1 || !img2) return;

  const isMobile = window.matchMedia('(max-width: 640px)').matches;

  // 移动端：恢复自适应高度
  if (isMobile) {
    img2.style.height = '';
    img2.style.objectFit = '';
    img2.style.cursor = img2.classList.contains('zoomed') ? 'zoom-out' : 'zoom-in';
    return;
  }

  // 确保两图已完成布局再取高度
  const apply = () => {
    const h = img1.clientHeight;
    if (h > 0) {
      img2.style.height = h + 'px';     // 与第一张等高
      img2.style.objectFit = 'contain'; // 不裁剪，按比例缩放
      img2.style.cursor = 'zoom-in';
    }
  };

  if (img1.complete) apply();
  else img1.addEventListener('load', apply, { once: true });

  // 第二张未加载时也监听一下
  if (!img2.complete) img2.addEventListener('load', apply, { once: true });
}

// 小型防抖
function debounce(fn, wait = 100) {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), wait); };
}
