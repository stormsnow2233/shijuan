/**
 * 拾卷 (Shijuan) 官网落地页前端交互脚本
 * 纯原生 Vanilla ES6 JavaScript，零外部第三方依赖
 */

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 1. 交互式多标签切换 (Interactive Tabbed Preview) ──
  const tabButtons = document.querySelectorAll('.tab-btn');
  const previewPanels = document.querySelectorAll('.preview-panel');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      if (!targetId) return;

      // 更新按钮激活状态
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');

      // 切换对应展示面板
      previewPanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add('active');
          panel.removeAttribute('hidden');
        } else {
          panel.classList.remove('active');
          panel.setAttribute('hidden', 'true');
        }
      });
    });
  });

  // ── 2. 阅读器主题实时切换预览 (Reader Theme Swapper) ──
  const readerWindow = document.querySelector('.reader-window');
  const themeDots = document.querySelectorAll('.theme-dot');

  const themePalettes = {
    green: { bg: '#cce8cf', ink: '#23301f', name: '护眼绿模式' },
    white: { bg: '#f8f3ea', ink: '#2b241c', name: '纸白模式' },
    beige: { bg: '#f5e6c8', ink: '#3a2f22', name: '米黄模式' },
    night: { bg: '#171512', ink: '#a8a296', name: '夜间模式' },
    black: { bg: '#000000', ink: '#8c8c8c', name: '纯黑模式' }
  };

  function applyTheme(dot) {
    const themeKey = dot.getAttribute('data-theme');
    const palette = themePalettes[themeKey];
    if (!palette || !readerWindow) return;

    themeDots.forEach(d => {
      d.classList.remove('active');
      d.setAttribute('aria-pressed', 'false');
    });
    dot.classList.add('active');
    dot.setAttribute('aria-pressed', 'true');

    readerWindow.style.backgroundColor = palette.bg;
    readerWindow.style.color = palette.ink;

    const batteryLabel = readerWindow.querySelector('.reader-battery');
    if (batteryLabel) {
      batteryLabel.textContent = `98% · ${palette.name}`;
    }
  }

  themeDots.forEach(dot => {
    dot.setAttribute('aria-pressed', dot.classList.contains('active') ? 'true' : 'false');

    dot.addEventListener('click', () => {
      applyTheme(dot);
    });

    dot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        applyTheme(dot);
      }
    });
  });

  // ── 3. 移动端抽屉导航折叠切换 (Mobile Hamburger Menu) ──
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileDrawer = document.querySelector('.mobile-nav-drawer');

  if (menuToggle && mobileDrawer) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.toggle('open');
      menuToggle.classList.toggle('active', isOpen);
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // 点击抽屉内任意锚点链接后自动收起
    mobileDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ── 4. 常见问题 (FAQ) 平滑高度展开/折叠与单选互斥 ──
  const faqItems = document.querySelectorAll('.faq-item');

  class FAQAccordion {
    static instances = [];

    constructor(el) {
      this.el = el;
      this.summary = el.querySelector('summary');
      this.content = el.querySelector('.faq-answer');
      this.animation = null;
      this.contentAnimation = null;
      this.isClosing = false;
      this.isExpanding = false;

      FAQAccordion.instances.push(this);

      if (this.summary && this.content) {
        this.summary.addEventListener('click', (e) => this.onClick(e));
      }

      // 监听原生 toggle 事件以维持 DOM 级单选互斥约束 (openCount <= 1)
      this.el.addEventListener('toggle', () => {
        if (this.el.open) {
          FAQAccordion.instances.forEach(other => {
            if (other !== this && other.el.open) {
              other.forceClose();
            }
          });
        }
      });
    }

    forceClose() {
      if (this.animation) {
        this.animation.onfinish = null;
        this.animation.oncancel = null;
        this.animation.cancel();
        this.animation = null;
      }
      if (this.contentAnimation) {
        this.contentAnimation.onfinish = null;
        this.contentAnimation.oncancel = null;
        this.contentAnimation.cancel();
        this.contentAnimation = null;
      }
      this.isClosing = false;
      this.isExpanding = false;
      this.el.open = false;
      this.el.classList.remove('is-closing');
      this.el.style.height = '';
      this.el.style.overflow = '';
      if (this.content) {
        this.content.style.opacity = '';
        this.content.style.transform = '';
      }
    }

    onClick(e) {
      e.preventDefault();
      this.el.style.overflow = 'hidden';

      if (this.el.open && !this.isClosing) {
        this.shrink();
      } else {
        this.open();
      }
    }

    shrink() {
      if (!this.el.open && !this.isExpanding && !this.el.classList.contains('is-closing')) return;

      this.isClosing = true;
      this.isExpanding = false;
      this.el.classList.add('is-closing');
      this.el.style.overflow = 'hidden';
      const startHeight = `${this.el.offsetHeight}px`;
      const endHeight = `${this.summary.offsetHeight}px`;

      if (this.animation) {
        this.animation.onfinish = null;
        this.animation.oncancel = null;
        this.animation.cancel();
        this.animation = null;
      }
      if (this.contentAnimation) {
        this.contentAnimation.onfinish = null;
        this.contentAnimation.oncancel = null;
        this.contentAnimation.cancel();
        this.contentAnimation = null;
      }

      if (!prefersReducedMotion) {
        this.contentAnimation = this.content.animate(
          { opacity: [1, 0], transform: ['translateY(0)', 'translateY(-6px)'] },
          { duration: 180, easing: 'ease' }
        );

        this.animation = this.el.animate(
          { height: [startHeight, endHeight] },
          { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );

        this.animation.onfinish = () => this.onAnimationFinish(false);
        this.animation.oncancel = () => {
          this.isClosing = false;
          this.el.open = false;
          this.el.style.height = '';
          this.el.style.overflow = '';
          this.onAnimationFinish(false);
        };
      } else {
        this.onAnimationFinish(false);
      }
    }

    open() {
      // 当某个 accordion 打开时，同步收起其他所有 accordions：
      FAQAccordion.instances.forEach(other => {
        if (other !== this) {
          if (other.animation) {
            other.animation.onfinish = null;
            other.animation.oncancel = null;
            other.animation.cancel();
            other.animation = null;
          }
          if (other.contentAnimation) {
            other.contentAnimation.onfinish = null;
            other.contentAnimation.oncancel = null;
            other.contentAnimation.cancel();
            other.contentAnimation = null;
          }
          other.isClosing = false;
          other.isExpanding = false;
          other.el.open = false;
          other.el.classList.remove('is-closing');
          other.el.style.height = '';
          other.el.style.overflow = '';
          if (other.content) {
            other.content.style.opacity = '';
            other.content.style.transform = '';
          }
        }
      });

      if (this.animation) {
        this.animation.onfinish = null;
        this.animation.oncancel = null;
        this.animation.cancel();
        this.animation = null;
      }
      if (this.contentAnimation) {
        this.contentAnimation.onfinish = null;
        this.contentAnimation.oncancel = null;
        this.contentAnimation.cancel();
        this.contentAnimation = null;
      }

      this.isClosing = false;
      this.el.classList.remove('is-closing');
      this.el.style.overflow = 'hidden';

      const startHeight = `${this.el.offsetHeight}px`;
      this.el.open = true;
      const endHeight = `${this.el.scrollHeight}px`;

      if (!prefersReducedMotion) {
        this.isExpanding = true;
        this.contentAnimation = this.content.animate(
          { opacity: [0, 1], transform: ['translateY(-6px)', 'translateY(0)'] },
          { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );

        this.animation = this.el.animate(
          { height: [startHeight, endHeight] },
          { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );

        this.animation.onfinish = () => this.onAnimationFinish(true);
        this.animation.oncancel = () => {
          this.isExpanding = false;
          this.animation = null;
          this.el.style.height = '';
          this.el.style.overflow = '';
        };
      } else {
        this.onAnimationFinish(true);
      }
    }

    onAnimationFinish(open) {
      this.el.open = open;
      this.el.classList.remove('is-closing');
      this.animation = null;
      this.contentAnimation = null;
      this.isClosing = false;
      this.isExpanding = false;
      this.el.style.height = '';
      this.el.style.overflow = '';
      if (this.content) {
        this.content.style.opacity = '';
        this.content.style.transform = '';
      }
    }
  }

  const faqAccordions = Array.from(faqItems).map(item => new FAQAccordion(item));

  // ── 5. 一键复制 SHA-256 哈希值 (Copy Hash to Clipboard) ──
  const copyBtn = document.querySelector('.copy-btn');
  const hashCode = document.querySelector('.hash-code');
  let copyTimer = null;

  if (copyBtn && hashCode) {
    const originalText = copyBtn.getAttribute('data-original-text') || copyBtn.textContent.trim();
    if (!copyBtn.getAttribute('data-original-text')) {
      copyBtn.setAttribute('data-original-text', originalText);
    }

    copyBtn.addEventListener('click', async () => {
      const textToCopy = hashCode.textContent.trim();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          // 降级使用传统输入框复制
          const textarea = document.createElement('textarea');
          textarea.value = textToCopy;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }

        if (copyTimer) {
          clearTimeout(copyTimer);
          copyTimer = null;
        }

        copyBtn.textContent = '已复制!';
        copyBtn.style.backgroundColor = 'var(--color-primary)';
        copyBtn.style.color = '#ffffff';

        copyTimer = setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.backgroundColor = '';
          copyBtn.style.color = '';
          copyTimer = null;
        }, 2000);
      } catch (err) {
        console.warn('复制到剪贴板失败:', err);
      }
    });
  }

  // ── 6. 锚点平滑滚动与顶栏偏移量补偿 ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 70;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ── 7. 动态设置当前版权年份 ──
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear().toString();
  }

  // ── 8. 滚动入场动画 (Scroll Reveal via IntersectionObserver) ──
  if (!prefersReducedMotion) {
    // 为各板块元素标记 scroll-reveal 类
    const revealSelectors = [
      '.features-section .section-header',
      '.wenku-card',
      '.preview-section .section-header',
      '.preview-tabs-nav',
      '.preview-panel.active',
      '.faq-section .section-header',
      '.faq-item',
      '.download-card',
      '.footer-grid',
    ];

    revealSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.classList.add('scroll-reveal');
      });
    });

    // 使用 IntersectionObserver 触发入场
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.scroll-reveal').forEach(el => {
      revealObserver.observe(el);
    });
  }

  // ── 9. 导航栏滚动毛玻璃加深效果 ──
  const header = document.querySelector('.header');
  if (header) {
    let lastScrollY = 0;
    let ticking = false;

    const updateHeader = () => {
      if (window.scrollY > 20) {
        header.classList.add('header-scrolled');
      } else {
        header.classList.remove('header-scrolled');
      }
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      lastScrollY = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });

    // 初始化时也检测一次
    updateHeader();
  }

  // ── 10. 标签切换面板重新触发入场动画 ──
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      if (!targetId) return;
      const panel = document.getElementById(targetId);
      if (panel) {
        // 强制重新触发动画
        panel.style.animation = 'none';
        // Force reflow
        void panel.offsetHeight;
        panel.style.animation = '';
      }
    });
  });

  // ── 12. 英雄区竹叶/护眼青粒子飘浮系统 (Hero Bamboo/Emerald Particles) ──
  const canvas = document.getElementById('particles-canvas');
  if (canvas && !prefersReducedMotion) {
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const onResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', onResize, { passive: true });

    const particles = [];
    const PARTICLE_COUNT = 24;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 5 + 3,
        speedY: Math.random() * 0.4 + 0.2,
        speedX: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        opacity: Math.random() * 0.35 + 0.15,
        color: Math.random() > 0.4 ? 'rgba(46, 125, 78, ' : 'rgba(104, 180, 115, '
      });
    }

    let mouseX = -1000;
    let mouseY = -1000;
    const heroSection = document.getElementById('hero');
    if (heroSection) {
      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      }, { passive: true });
      heroSection.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
      });
    }

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.angle) * 0.3;
        p.angle += p.rotationSpeed;

        // 鼠标排斥微扰
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          p.x += (dx / dist) * 1.5;
          p.y += (dy / dist) * 1.5;
        }

        // 边界循环
        if (p.y > height + 20) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 10;
        if (p.x > width + 20) p.x = -10;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color + p.opacity + ')';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(render);
      }
    });

    render();
  }

  // ── 13. 特性卡片鼠标聚光灯与 3D 悬停微倾 (Card Spotlight & 3D Tilt) ──
  const cards = document.querySelectorAll('.wenku-card');
  if (!prefersReducedMotion) {
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;
        card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ── 14. 手机模型 3D 视差交互与实时时钟、进度条动效 ──
  const phoneMockup = document.querySelector('.phone-frame');
  const heroMockupWrapper = document.querySelector('.hero-mockup-wrapper');
  if (phoneMockup && heroMockupWrapper && !prefersReducedMotion) {
    heroMockupWrapper.addEventListener('mousemove', (e) => {
      const rect = heroMockupWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 8;
      const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -8;
      phoneMockup.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    });
    heroMockupWrapper.addEventListener('mouseleave', () => {
      phoneMockup.style.transform = '';
    });
  }

  // 手机状态栏当前时间
  const statusBarTime = document.querySelector('.mock-status-bar span:first-child');
  if (statusBarTime) {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      statusBarTime.textContent = `${hours}:${mins}`;
    };
    updateTime();
    setInterval(updateTime, 30000);
  }

  // 手机内书籍进度条滚动进入时依次填充动画
  const progressBars = document.querySelectorAll('.mock-progress-inner');
  if (progressBars.length) {
    const targets = Array.from(progressBars).map(bar => bar.style.width || '50%');
    progressBars.forEach(bar => { bar.style.width = '0%'; });
    setTimeout(() => {
      progressBars.forEach((bar, idx) => {
        setTimeout(() => {
          bar.style.width = targets[idx];
        }, idx * 180 + 200);
      });
    }, 600);
  }

  // ── 15. 搜索预览区自动循环打字模拟效果 (Search Tab Typing Simulation) ──
  const searchTab = document.getElementById('tab-search');
  const searchQueryEl = document.querySelector('.search-query-text');
  if (searchTab && searchQueryEl) {
    const searchPhrases = [
      '关于邻家的天使大人不知不觉把我做成废人这档子事',
      '狼与香辛料 (Spring Log)',
      '葬送的芙莉莲 (拷贝漫画)',
      '无职转生 ~到了异世界就拿出真本事~',
      '刀剑神域 (进击篇)'
    ];
    let phraseIdx = 0;
    let charIdx = searchPhrases[0].length;
    let isDeleting = false;
    let typingTimer = null;

    const typeLoop = () => {
      const currentPhrase = searchPhrases[phraseIdx];

      if (isDeleting) {
        charIdx--;
        searchQueryEl.textContent = currentPhrase.substring(0, charIdx);
        if (charIdx <= 0) {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % searchPhrases.length;
          typingTimer = setTimeout(typeLoop, 500);
          return;
        }
        typingTimer = setTimeout(typeLoop, 35);
      } else {
        charIdx++;
        searchQueryEl.textContent = currentPhrase.substring(0, charIdx);
        if (charIdx >= currentPhrase.length) {
          isDeleting = true;
          typingTimer = setTimeout(typeLoop, 2500);
          return;
        }
        typingTimer = setTimeout(typeLoop, 65);
      }
    };

    const checkSearchTabActive = () => {
      if (searchTab.classList.contains('active')) {
        if (!typingTimer) {
          typingTimer = setTimeout(typeLoop, 1000);
        }
      } else {
        if (typingTimer) {
          clearTimeout(typingTimer);
          typingTimer = null;
        }
      }
    };

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        setTimeout(checkSearchTabActive, 100);
      });
    });
  }

  // ── 16. 统计数字滚动累加效果 (Number Counter Animation) ──
  const statNumbers = document.querySelectorAll('.shelf-stat-num');
  if (statNumbers.length) {
    let statsAnimated = false;
    const animateStats = () => {
      if (statsAnimated) return;
      statsAnimated = true;

      const statData = [
        { el: statNumbers[0], target: 16, suffix: ' 本' },
        { el: statNumbers[1], target: 100, suffix: '%' },
        { el: statNumbers[2], target: 0, suffix: ' 字节' }
      ];

      statData.forEach(item => {
        if (!item.el) return;
        const duration = 1200;
        const start = performance.now();
        const startVal = 0;

        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          const currentVal = Math.round(startVal + (item.target - startVal) * easeProgress);
          item.el.textContent = `${currentVal}${item.suffix}`;
          if (progress < 1) {
            requestAnimationFrame(step);
          }
        };
        requestAnimationFrame(step);
      });
    };

    const shelfTabBtn = document.querySelector('[data-target="tab-shelf"]');
    if (shelfTabBtn) {
      shelfTabBtn.addEventListener('click', () => {
        setTimeout(animateStats, 150);
      });
    }
  }

  // ── 17. 按钮点击水波纹效果 (Button Click Ripple Wave) ──
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

      this.appendChild(ripple);
      setTimeout(() => {
        if (ripple.parentElement) {
          ripple.remove();
        }
      }, 600);
    });
  });
});
