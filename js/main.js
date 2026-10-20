/* «Не пищи!» — меню, поиск предметов, рентген, «пип» и чек-лист.
   Всё содержимое страницы доступно и без JS; скрипт только добавляет удобства. */
(() => {
  'use strict';

  const root = document.documentElement;

  /* ---------- Мобильное меню ---------- */

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');

  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      nav.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    window.matchMedia('(min-width: 1080px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* ---------- Подсветка текущего раздела в меню ---------- */

  const navLinks = [...document.querySelectorAll('.nav__link')];
  const linkById = new Map(navLinks.map((link) => [link.hash.slice(1), link]));
  const navSections = [...linkById.keys()]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if ('IntersectionObserver' in window && navSections.length) {
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      const current = navSections.find((section) => visible.has(section));
      navLinks.forEach((link) => link.removeAttribute('aria-current'));
      if (current) linkById.get(current.id).setAttribute('aria-current', 'location');
    }, { rootMargin: '-40% 0px -55% 0px' });

    navSections.forEach((section) => observer.observe(section));
  }

  /* ---------- Прогресс чтения и кнопка «наверх» ---------- */

  const progress = document.querySelector('.progress');
  const toTop = document.querySelector('.to-top');
  let ticking = false;

  const onScroll = () => {
    const max = root.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (toTop) toTop.classList.toggle('is-visible', window.scrollY > 800);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  /* ---------- Поиск «Можно ли взять…?» ---------- */

  const finder = document.getElementById('finder');

  if (finder) {
    const input = finder.querySelector('input[type="search"]');
    const chips = [...finder.querySelectorAll('.chip')];
    const rows = [...document.querySelectorAll('#items-table tbody tr')];
    const empty = document.getElementById('items-empty');
    const count = document.getElementById('items-count');
    const normalize = (text) => text.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
    let category = 'all';

    rows.forEach((row) => {
      row.dataset.search = normalize(`${row.textContent} ${row.dataset.keywords || ''}`);
    });

    const apply = () => {
      const words = normalize(input.value).split(' ').filter(Boolean);
      let shown = 0;

      rows.forEach((row) => {
        const inCategory = category === 'all' || row.dataset.category === category;
        const matches = words.every((word) => row.dataset.search.includes(word));
        row.hidden = !(inCategory && matches);
        if (!row.hidden) shown += 1;
      });

      empty.hidden = shown !== 0;
      count.textContent = `Показано ${shown} из ${rows.length}`;
    };

    input.addEventListener('input', apply);
    finder.addEventListener('submit', (event) => event.preventDefault());

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        category = chip.dataset.filter;
        chips.forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
        apply();
      });
    });

    apply();
  }

  /* ---------- Рентген-вид чемодана ---------- */

  const xray = document.querySelector('.xray');

  if (xray) {
    const button = xray.querySelector('.xray__toggle');
    const stage = xray.querySelector('.xray__stage');
    const flip = () => {
      const on = !xray.classList.contains('is-on');
      xray.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', String(on));
    };
    button.addEventListener('click', flip);
    stage.addEventListener('click', flip);
  }

  /* ---------- «Пип» на карточках ошибок ---------- */

  const soundToggle = document.querySelector('.sound-toggle');
  let soundOn = false;
  let audioContext = null;
  let beepTimer = 0;

  const playTone = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContext = audioContext || new AudioCtx();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = 1400;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch (error) {
      /* без звука — тоже нормально */
    }
  };

  const beep = () => {
    root.classList.add('is-beeping');
    clearTimeout(beepTimer);
    beepTimer = setTimeout(() => root.classList.remove('is-beeping'), 700);
    if (soundOn) playTone();
  };

  if (soundToggle) {
    const state = soundToggle.querySelector('.sound-toggle__state');
    soundToggle.addEventListener('click', () => {
      soundOn = !soundOn;
      soundToggle.setAttribute('aria-pressed', String(soundOn));
      state.textContent = soundOn ? 'вкл' : 'выкл';
      if (soundOn) beep();
    });
  }

  document.querySelectorAll('.mistake').forEach((card) => {
    card.addEventListener('mouseenter', beep);
  });

  /* ---------- Чек-лист ---------- */

  const checklist = document.getElementById('checklist-items');

  if (checklist) {
    const STORAGE_KEY = 'ne-pishchi:checklist';
    const boxes = [...checklist.querySelectorAll('input[type="checkbox"]')];
    const counter = document.getElementById('checklist-count');
    const meter = document.querySelector('.meter');
    const meterFill = meter.querySelector('.meter__fill');
    const done = document.getElementById('checklist-done');

    const load = () => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      } catch (error) {
        return [];
      }
    };

    const save = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes.filter((box) => box.checked).map((box) => box.value)));
      } catch (error) {
        /* приватный режим — просто не запоминаем */
      }
    };

    const update = (animate) => {
      const checked = boxes.filter((box) => box.checked).length;
      const complete = checked === boxes.length;
      counter.textContent = `Готово ${checked} из ${boxes.length}`;
      meterFill.style.width = `${(checked / boxes.length) * 100}%`;
      meter.setAttribute('aria-valuenow', String(checked));
      done.hidden = !complete;
      if (complete && animate) {
        done.classList.remove('is-stamped');
        void done.offsetWidth;
        done.classList.add('is-stamped');
      }
    };

    const saved = new Set(load());
    boxes.forEach((box) => { box.checked = saved.has(box.value); });

    checklist.addEventListener('change', () => {
      save();
      update(true);
    });

    document.getElementById('checklist-reset').addEventListener('click', () => {
      boxes.forEach((box) => { box.checked = false; });
      save();
      update(false);
      boxes[0].focus();
    });

    document.getElementById('checklist-print').addEventListener('click', () => {
      root.classList.add('print-checklist');
      window.print();
    });
    window.addEventListener('afterprint', () => root.classList.remove('print-checklist'));

    update(false);
  }
})();
