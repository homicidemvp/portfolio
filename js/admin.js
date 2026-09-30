/* Админ-панель HOMIDEV. Редактирует объект из js/data.js и сохраняет его обратно в файл. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage недоступен */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage недоступен */ } },
  };

  const DRAFT_KEY = 'hd_draft';
  const SESSION_KEY = 'hd_admin_session';

  let data = clone(window.PORTFOLIO_DATA);

  /* ================= Авторизация ================= */
  // Хэш = SHA-256("homidev:" + логин + ":" + пароль). В коде хранится только он.
  async function hashCreds(login, pass) {
    const bytes = new TextEncoder().encode(`homidev:${login.trim()}:${pass}`);
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const isAuthed = () => { try { return sessionStorage.getItem(SESSION_KEY) === data.auth.hash; } catch (e) { return false; } };

  function showPanel() {
    $('#loginView').hidden = true;
    $('#panelView').hidden = false;
    initPanel();
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#loginError');
    const btn = e.target.querySelector('button');
    if (!window.crypto || !crypto.subtle) {
      err.textContent = 'Браузер не поддерживает проверку пароля. Откройте через Chrome/Edge/Firefox.';
      return;
    }
    btn.disabled = true;
    err.textContent = '';
    const hash = await hashCreds($('#login').value, $('#password').value);
    if (hash === window.PORTFOLIO_DATA.auth.hash) {
      try { sessionStorage.setItem(SESSION_KEY, hash); } catch (e2) { /* без сессии */ }
      showPanel();
    } else {
      // небольшая задержка против перебора
      setTimeout(() => { err.textContent = 'Неверный логин или пароль'; btn.disabled = false; }, 1200);
    }
  });

  $('#logoutBtn').addEventListener('click', () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    location.reload();
  });

  /* ================= Доступ к полям по пути "a.b.c" ================= */
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const setPath = (obj, path, val) => {
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((o, k) => o[k], obj)[last] = val;
  };

  /* Преобразования значений для простых полей */
  const codecs = {
    text: { toInput: (v) => v ?? '', fromInput: (v) => v },
    lines: { toInput: (v) => (v || []).join('\n'), fromInput: (v) => v.split('\n').map((s) => s.trim()).filter(Boolean) },
    csv: { toInput: (v) => (v || []).join(', '), fromInput: (v) => v.split(',').map((s) => s.trim()).filter(Boolean) },
    paragraphs: { toInput: (v) => (v || []).join('\n\n'), fromInput: (v) => v.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) },
    number: { toInput: (v) => v ?? 0, fromInput: (v) => Number(v) || 0 },
  };

  /* ================= Схемы списков ================= */
  const CATS = [['web', 'Сайт'], ['app', 'Веб-приложение'], ['bot', 'Бот']];
  const lists = {
    'about.stats': {
      title: (s) => s.label || 'Счётчик',
      blank: { value: 0, suffix: '+', label: '' },
      fields: [
        { key: 'value', label: 'Число', type: 'number' },
        { key: 'suffix', label: 'Знак после числа (+, %)' },
        { key: 'label', label: 'Подпись' },
      ],
      layout: 'grid3',
      addLabel: '+ Добавить счётчик',
    },
    skills: {
      title: (s) => s.title || 'Новый навык',
      blank: { icon: '★', title: '', text: '', level: 80 },
      fields: [
        { key: 'title', label: 'Название' },
        { key: 'icon', label: 'Иконка (символ или 1–3 знака)' },
        { key: 'level', label: 'Уровень, %', type: 'number' },
        { key: 'text', label: 'Описание', type: 'textarea', full: true },
      ],
      layout: 'grid3',
      addLabel: '+ Добавить навык',
    },
    works: {
      title: (w) => w.title || 'Новый проект',
      blank: { title: '', desc: '', glyph: 'NEW', cat: 'web', colorA: '#2f6bff', colorB: '#ff2e4d', demo: '', code: '', tags: [] },
      fields: [
        { key: 'title', label: 'Название' },
        { key: 'glyph', label: 'Надпись на превью' },
        { key: 'cat', label: 'Категория', type: 'select', options: CATS },
        { key: 'desc', label: 'Описание', type: 'textarea', full: true },
        { key: 'demo', label: 'Ссылка на демо' },
        { key: 'code', label: 'Ссылка на код' },
        { key: 'tags', label: 'Теги (через запятую)', type: 'csv' },
        { key: 'colorA', label: 'Цвет превью 1', type: 'color' },
        { key: 'colorB', label: 'Цвет превью 2', type: 'color' },
      ],
      layout: 'grid3',
      addLabel: '+ Добавить проект',
    },
    process: {
      title: (s, i) => `${String(i + 1).padStart(2, '0')} · ${s.title || 'Шаг'}`,
      blank: { title: '', text: '' },
      fields: [
        { key: 'title', label: 'Название шага' },
        { key: 'text', label: 'Описание', type: 'textarea', full: true },
      ],
      layout: 'grid2',
      addLabel: '+ Добавить шаг',
    },
  };

  function fieldHtml(f, value) {
    const v = String(f.type === 'csv' ? (value || []).join(', ') : (value ?? ''))
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const attrs = `data-key="${f.key}" data-type="${f.type || 'text'}"`;
    let input;
    if (f.type === 'textarea') input = `<textarea ${attrs} rows="3">${v}</textarea>`;
    else if (f.type === 'select') input = `<select ${attrs}>${f.options.map(([val, lbl]) => `<option value="${val}"${val === value ? ' selected' : ''}>${lbl}</option>`).join('')}</select>`;
    else if (f.type === 'number') input = `<input type="number" ${attrs} value="${v}">`;
    else if (f.type === 'color') input = `<input type="color" ${attrs} value="${v}">`;
    else input = `<input ${attrs} value="${v}">`;
    return `<div class="field"${f.full ? ' style="grid-column: 1 / -1"' : ''}><label>${f.label}</label>${input}</div>`;
  }

  function renderList(path) {
    const box = $(`[data-list="${path}"]`);
    const schema = lists[path];
    const arr = getPath(data, path);
    box.innerHTML = arr.map((item, i) => `
      <div class="card" data-index="${i}">
        <div class="item-head">
          <strong>${schema.title(item, i).replace(/</g, '&lt;')}</strong>
          <button class="small" data-act="up" ${i === 0 ? 'disabled' : ''} title="Выше">↑</button>
          <button class="small" data-act="down" ${i === arr.length - 1 ? 'disabled' : ''} title="Ниже">↓</button>
          <button class="small danger" data-act="del">Удалить</button>
        </div>
        <div class="${schema.layout}">${schema.fields.map((f) => fieldHtml(f, item[f.key])).join('')}</div>
      </div>`).join('') + `<button data-act="add">${schema.addLabel}</button>`;
  }

  function bindList(path) {
    const box = $(`[data-list="${path}"]`);
    const schema = lists[path];

    box.addEventListener('input', (e) => {
      const el = e.target.closest('[data-key]');
      if (!el) return;
      const i = +el.closest('[data-index]').dataset.index;
      const arr = getPath(data, path);
      const f = schema.fields.find((x) => x.key === el.dataset.key);
      const codec = codecs[f.type] || codecs.text;
      arr[i][f.key] = codec.fromInput(el.value);
      // обновить заголовок карточки без перерисовки (чтобы не терять фокус)
      el.closest('.card').querySelector('.item-head strong').textContent = schema.title(arr[i], i);
      changed();
    });

    box.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const arr = getPath(data, path);
      const card = btn.closest('[data-index]');
      const i = card ? +card.dataset.index : -1;
      const act = btn.dataset.act;
      if (act === 'add') arr.push(clone(schema.blank));
      if (act === 'del') {
        if (!confirm(`Удалить «${schema.title(arr[i], i)}»?`)) return;
        arr.splice(i, 1);
      }
      if (act === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (act === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      renderList(path);
      changed();
      if (act === 'add') box.lastElementChild.previousElementSibling.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ================= Простые поля ================= */
  function fillBinds() {
    $$('[data-bind]').forEach((el) => {
      const codec = codecs[el.dataset.type || 'text'];
      el.value = codec.toInput(getPath(data, el.dataset.bind));
    });
  }

  function renderAll() {
    fillBinds();
    Object.keys(lists).forEach(renderList);
  }

  /* ================= Черновик / статус ================= */
  const status = $('#status');
  let saveTimer;
  function changed() {
    status.textContent = 'Есть несохранённые изменения';
    status.className = 'status dirty';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set(DRAFT_KEY, JSON.stringify(data)), 300);
  }

  /* ================= Сохранение data.js ================= */
  let fileHandle = null;
  const serialize = () => `window.PORTFOLIO_DATA = ${JSON.stringify(data, null, 2)};\n`;

  async function saveFile() {
    const content = serialize();
    try {
      if (window.showSaveFilePicker) {
        if (!fileHandle) {
          fileHandle = await window.showSaveFilePicker({
            suggestedName: 'data.js',
            types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
          });
        }
        const w = await fileHandle.createWritable();
        await w.write(content);
        await w.close();
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: 'text/javascript' }));
        a.download = 'data.js';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
      store.del(DRAFT_KEY);
      status.textContent = 'Сохранено ✓';
      status.className = 'status ok';
    } catch (err) {
      if (err.name !== 'AbortError') alert('Не удалось сохранить файл: ' + err.message);
    }
  }

  /* ================= Инициализация панели ================= */
  let initialized = false;
  function initPanel() {
    if (initialized) return;
    initialized = true;

    // Вкладки
    $('#tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      $$('#tabs button').forEach((b) => b.classList.toggle('active', b === btn));
      $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === btn.dataset.tab));
    });

    // Простые поля
    $$('[data-bind]').forEach((el) => {
      el.addEventListener('input', () => {
        setPath(data, el.dataset.bind, codecs[el.dataset.type || 'text'].fromInput(el.value));
        changed();
      });
    });

    Object.keys(lists).forEach(bindList);
    renderAll();

    // Черновик из прошлого сеанса
    const draft = store.get(DRAFT_KEY);
    if (draft && draft !== JSON.stringify(data)) {
      $('#draftBanner').hidden = false;
      $('#restoreDraft').onclick = () => {
        data = JSON.parse(draft);
        renderAll();
        $('#draftBanner').hidden = true;
        status.textContent = 'Черновик восстановлен — не забудьте сохранить';
        status.className = 'status dirty';
      };
      $('#dropDraft').onclick = () => { store.del(DRAFT_KEY); $('#draftBanner').hidden = true; };
    }

    $('#saveBtn').addEventListener('click', saveFile);
    $('#previewBtn').addEventListener('click', () => {
      store.set(DRAFT_KEY, JSON.stringify(data));
      window.open('index.html?preview', '_blank');
    });

    // Смена логина/пароля
    $('#credsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#credsMsg');
      if ($('#newPass').value !== $('#newPass2').value) {
        msg.textContent = 'Пароли не совпадают';
        msg.style.color = 'var(--red)';
        return;
      }
      data.auth.hash = await hashCreds($('#newLogin').value, $('#newPass').value);
      e.target.reset();
      changed();
      msg.textContent = 'Готово. Новые данные начнут работать после «Сохранить data.js» и замены файла.';
      msg.style.color = 'var(--green)';
    });

    window.addEventListener('beforeunload', (e) => {
      if (status.classList.contains('dirty')) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  if (isAuthed()) showPanel();
})();
