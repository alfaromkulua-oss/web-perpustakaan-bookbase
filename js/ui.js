/**
 * Utilitas UI bersama: escape HTML, toast, sampul, ikon.
 */
const UI = (() => {
  const FORMAT_LABEL = {
    ebook: 'Baca Online',
    physical: 'Pinjam Fisik',
    both: 'Tersedia Keduanya',
  };

  const ICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5v-13Z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function coverHTML(book) {
    const style = `--c-bg:${esc(book.coverColor)};--c-ink:${esc(book.coverAccent)}`;
    // Memakai <span> agar valid saat diletakkan di dalam <button>.
    if (book.coverUrl) {
      return `<span class="cover" style="${style}"><img src="${esc(book.coverUrl)}" alt="" loading="lazy"></span>`;
    }
    return `
      <span class="cover" style="${style}" aria-hidden="true">
        <span class="cover__inner">
          <span class="cover__cat">${esc(book.category)}</span>
          <span class="cover__title">${esc(book.title)}</span>
          <span class="cover__rule"></span>
          <span class="cover__author">${esc(book.author)}</span>
        </span>
      </span>`;
  }

  function badgeHTML(format) {
    return `<span class="badge badge--${esc(format)}">${esc(FORMAT_LABEL[format] || format)}</span>`;
  }

  function isReadable(book) {
    return (book.format === 'ebook' || book.format === 'both') && book.chapterCount > 0;
  }

  let toastRegion;
  function toast(message, duration = 3800) {
    if (!toastRegion) {
      toastRegion = document.createElement('div');
      toastRegion.className = 'toast-region';
      toastRegion.setAttribute('role', 'status');
      toastRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastRegion);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    toastRegion.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  function debounce(fn, wait = 150) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  return { FORMAT_LABEL, ICONS, esc, coverHTML, badgeHTML, isReadable, toast, debounce };
})();
