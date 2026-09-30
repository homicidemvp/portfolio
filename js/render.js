/* Рендер контента портфолио из js/data.js (редактируется через admin.html) */
(() => {
  'use strict';

  let data = window.PORTFOLIO_DATA;

  // index.html?preview — показывает несохранённый черновик из админки (только в этом браузере)
  if (new URLSearchParams(location.search).has('preview')) {
    try {
      const draft = JSON.parse(localStorage.getItem('hd_draft'));
      if (draft) data = draft;
    } catch (e) { /* нет доступа к storage — показываем data.js */ }
  }
  window.PORTFOLIO = data;
  if (!data) return;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // **жирный** → <strong>
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const safeUrl = (u) => (/^(https?:|mailto:|tg:|#|\/|\.)/i.test(u || '') ? u : '#');
  const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#2f6bff');
  const $ = (id) => document.getElementById(id);

  /* Hero */
  $('heroBadge').textContent = data.hero.badge;
  $('heroSubtitle').textContent = data.hero.subtitle;

  /* Marquee (дважды — для бесшовной ленты) */
  const marqueeHtml = data.marquee.map((t) => `<span>${esc(t)}</span><i>✦</i>`).join('');
  $('marqueeTrack').innerHTML = marqueeHtml + marqueeHtml;

  /* About */
  $('aboutText').innerHTML = data.about.paragraphs.map((p) => `<p>${rich(p)}</p>`).join('');
  $('aboutStats').innerHTML = data.about.stats.map((s) => `
    <div class="stat">
      <div class="stat__num"><span class="counter" data-target="${Number(s.value) || 0}">0</span>${esc(s.suffix)}</div>
      <div class="stat__label">${esc(s.label)}</div>
    </div>`).join('');

  /* Skills */
  $('skillsList').innerHTML = data.skills.map((s, i) => `
    <div class="skill reveal tilt" style="--d: ${(i * 0.1).toFixed(1)}s">
      <div class="skill__icon">${esc(s.icon)}</div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.text)}</p>
      <div class="skill__bar"><span style="--w: ${Math.min(Math.max(Number(s.level) || 0, 0), 100)}%"></span></div>
    </div>`).join('');

  /* Works */
  const link = (url, label, cls) => (url
    ? `<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener" class="btn btn--small ${cls}">${label}</a>`
    : '');
  $('worksList').innerHTML = data.works.map((w) => `
    <article class="work reveal tilt" data-cat="${esc(w.cat)}">
      <div class="work__preview" style="--a: ${safeColor(w.colorA)}; --b: ${safeColor(w.colorB)}">
        <span class="work__glyph" style="--len: ${Math.max([...String(w.glyph || '')].length, 3)}">${esc(w.glyph)}</span>
        ${w.demo || w.code ? `<div class="work__overlay">${link(w.demo, 'Демо', 'btn--primary')}${link(w.code, 'Код', 'btn--ghost')}</div>` : ''}
      </div>
      <div class="work__info">
        <h3>${esc(w.title)}</h3>
        <p>${esc(w.desc)}</p>
        <div class="tags">${(w.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
      </div>
    </article>`).join('');

  /* Process */
  $('timeline').insertAdjacentHTML('beforeend', data.process.map((s, i) => `
    <div class="step reveal">
      <div class="step__num">${String(i + 1).padStart(2, '0')}</div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.text)}</p>
    </div>`).join(''));

  /* Contacts */
  const c = data.contacts;
  $('contactText').textContent = c.text;
  const tg = $('linkTelegram'), mail = $('linkEmail'), gh = $('linkGithub');
  tg.href = safeUrl(c.telegram); tg.hidden = !c.telegram;
  mail.href = `mailto:${c.email}`; mail.hidden = !c.email;
  gh.href = safeUrl(c.github); gh.hidden = !c.github;
})();
