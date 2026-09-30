(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Header + scroll progress ---------- */
  const header = document.getElementById('header');
  const progress = document.getElementById('scrollProgress');

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 30);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };

  /* ---------- Burger menu ---------- */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');

  const setMenu = (open) => {
    burger.classList.toggle('open', open);
    nav.classList.toggle('open', open);
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Active nav link ---------- */
  const navLinks = [...document.querySelectorAll('.nav__link')];
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('section[id]').forEach((s) => sectionObserver.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');
      revealObserver.unobserve(el);
      // после появления убираем задержку, чтобы hover-эффекты были мгновенными
      setTimeout(() => el.style.setProperty('--d', '0s'), 1400);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  /* ---------- Counters ---------- */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = +el.dataset.target;
      const duration = 1800;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.counter').forEach((el) => counterObserver.observe(el));

  /* ---------- Typewriter ---------- */
  const typedEl = document.getElementById('typed');
  const phrases = (window.PORTFOLIO && window.PORTFOLIO.hero.typed.length) ? window.PORTFOLIO.hero.typed : ['сайты'];
  let pi = 0, ci = 0, deleting = false;

  const type = () => {
    const word = phrases[pi];
    typedEl.textContent = word.slice(0, ci);
    let delay = deleting ? 40 : 85;
    if (!deleting && ci === word.length) { deleting = true; delay = 1600; }
    else if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; delay = 350; }
    ci += deleting ? -1 : 1;
    setTimeout(type, delay);
  };
  if (reduceMotion) typedEl.textContent = phrases[0];
  else setTimeout(type, 1600);

  /* ---------- Works filter ---------- */
  const works = [...document.querySelectorAll('.work')];
  document.querySelectorAll('.filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      works.forEach((w) => {
        const show = f === 'all' || w.dataset.cat === f;
        if (show) {
          w.classList.remove('hide');
          w.classList.remove('visible');
          w.style.setProperty('--d', '0s');
          requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('visible')));
        } else {
          w.classList.add('hide');
        }
      });
    });
  });

  /* ---------- Timeline progress ---------- */
  const timeline = document.getElementById('timeline');
  const timelineFill = document.getElementById('timelineFill');
  const steps = [...document.querySelectorAll('.step')];

  // При появлении на экране линия один раз плавно проходит от первого шага до последнего,
  // а кружки загораются в момент, когда линия до них доходит
  function playTimeline() {
    const line = timelineFill.parentElement.getBoundingClientRect();
    // доля длины линии, на которой находится левый край кружка каждого шага
    const marks = steps.map((s, i) => (line.width
      ? (s.getBoundingClientRect().left - line.left) / line.width
      : i / steps.length)); // на мобиле линия скрыта — просто по очереди
    const duration = reduceMotion ? 0 : 2600;
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const start = performance.now();

    const tick = (now) => {
      const t = duration ? Math.min((now - start) / duration, 1) : 1;
      const p = ease(t);
      timelineFill.style.setProperty('--p', p);
      steps.forEach((s, i) => { if (p >= marks[i]) s.classList.add('active'); });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if (timeline) {
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      setTimeout(playTimeline, 400); // даём шагам проявиться
    }, { threshold: 0.5 }).observe(timeline);
  }

  /* ---------- Contact form ---------- */
  const form = document.getElementById('contactForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const subject = encodeURIComponent(`Проект от ${data.get('name')}`);
    const body = encodeURIComponent(`Имя: ${data.get('name')}\nКонтакт: ${data.get('contact')}\n\n${data.get('message')}`);
    const email = (window.PORTFOLIO && window.PORTFOLIO.contacts.email) || '';
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    form.classList.add('sent');
    form.querySelector('button span').textContent = 'Готово! Жду письма ✓';
  });

  /* ---------- Скрытый вход в админку ----------
     1) 5 быстрых кликов по 🧠 в футере
     2) набрать на клавиатуре «homiadmin» (вне полей ввода) */
  const goAdmin = () => { window.location.href = 'admin.html'; };
  let brainClicks = 0, brainTimer;
  document.getElementById('brain').addEventListener('click', () => {
    brainClicks++;
    clearTimeout(brainTimer);
    brainTimer = setTimeout(() => { brainClicks = 0; }, 1500);
    if (brainClicks >= 5) goAdmin();
  });
  const secret = 'homiadmin';
  let typedKeys = '';
  document.addEventListener('keydown', (e) => {
    // e.code не зависит от раскладки (работает и на русской)
    if (e.target.closest('input, textarea') || !/^Key[A-Z]$/.test(e.code)) return;
    typedKeys = (typedKeys + e.code.slice(3).toLowerCase()).slice(-secret.length);
    if (typedKeys === secret) goAdmin();
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (reduceMotion) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    return;
  }

  /* ---------- Particles (hero) ---------- */
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  const hero = document.querySelector('.hero');
  let particles = [];
  let w = 0, h = 0, dpr = 1;
  let heroVisible = true;
  const mouse = { x: -9999, y: -9999 };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.offsetWidth; h = hero.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(Math.floor((w * h) / 14000), 110);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.8 + 0.6,
      c: Math.random() > 0.5 ? '47,107,255' : '255,46,77',
    }));
  };

  const draw = () => {
    if (heroVisible) {
      ctx.clearRect(0, 0, w, h);
      const linkDist = 130;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // отталкивание от курсора
        const dxm = p.x - mouse.x, dym = p.y - mouse.y;
        const dm = Math.hypot(dxm, dym);
        if (dm < 140 && dm > 0) {
          const f = (140 - dm) / 140 * 0.6;
          p.x += (dxm / dm) * f; p.y += (dym / dm) * f;
        }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},0.85)`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = dx * dx + dy * dy;
          if (d < linkDist * linkDist) {
            const a = (1 - Math.sqrt(d) / linkDist) * 0.25;
            const grad = ctx.createLinearGradient(p.x, p.y, q.x, q.y);
            grad.addColorStop(0, `rgba(${p.c},${a})`);
            grad.addColorStop(1, `rgba(${q.c},${a})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
    }
    requestAnimationFrame(draw);
  };

  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
  window.addEventListener('resize', resize);
  resize();
  draw();

  if (!finePointer) return;

  /* ---------- Custom cursor ---------- */
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    document.body.classList.add('has-cursor');
  });
  document.addEventListener('mouseleave', () => document.body.classList.remove('has-cursor'));

  const followRing = () => {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(followRing);
  };
  followRing();

  document.querySelectorAll('a, button, .work, input, textarea').forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });

  /* ---------- Magnetic buttons ---------- */
  document.querySelectorAll('.magnetic').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });

  /* ---------- 3D tilt ---------- */
  document.querySelectorAll('.tilt').forEach((card) => {
    const max = card.classList.contains('code-card') ? 6 : 8;
    card.addEventListener('mousemove', (e) => {
      if (!card.classList.contains('visible')) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.transition = 'transform 0.15s ease-out, border-color 0.4s, background 0.4s, box-shadow 0.4s';
      card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateY(-6px)`;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.4s, background 0.4s, box-shadow 0.4s';
      card.style.transform = '';
      setTimeout(() => { if (!card.matches(':hover')) card.style.transition = ''; }, 650);
    });
  });
})();
