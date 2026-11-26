/**
 * Halaman Katalog: pencarian instan, filter, rak kurasi, detail buku.
 */
(() => {
  const { esc, coverHTML, badgeHTML, isReadable, toast, debounce, ICONS } = UI;
  const SEED = window.PUSTAKA_SEED;

  const state = { books: [], q: '', category: 'all', format: 'all' };

  const $ = (sel) => document.querySelector(sel);
  const els = {
    heroSearch: $('#heroSearch'),
    catalogSearch: $('#catalogSearch'),
    formatFilter: $('#formatFilter'),
    categoryFilter: $('#categoryFilter'),
    grid: $('#bookGrid'),
    count: $('#resultCount'),
    empty: $('#emptyState'),
    emptyText: $('#emptyText'),
    curator: $('#curatorNote'),
    shelfList: $('#shelfList'),
    continueSection: $('#continueSection'),
    continueList: $('#continueList'),
    dialog: $('#bookDialog'),
    dialogBody: $('#dialogBody'),
    dataNote: $('#dataNote'),
  };

  /* ------------------------------------------------------------ */
  /* Inisialisasi                                                  */
  /* ------------------------------------------------------------ */
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon] || ''; });

  function readUrl() {
    const p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.category = p.get('kategori') || 'all';
    state.format = ['ebook', 'physical', 'both'].includes(p.get('jenis')) ? p.get('jenis') : 'all';
  }

  function writeUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.category !== 'all') p.set('kategori', state.category);
    if (state.format !== 'all') p.set('jenis', state.format);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}${location.hash}` : location.pathname + location.hash);
  }

  function renderSkeleton() {
    els.grid.innerHTML = Array.from({ length: 8 }, () => `
      <div class="book-card skeleton" aria-hidden="true">
        <div class="cover"></div>
        <div class="skeleton__line"></div>
        <div class="skeleton__line skeleton__line--short"></div>
      </div>`).join('');
  }

  async function init() {
    readUrl();
    els.heroSearch.value = els.catalogSearch.value = state.q;
    renderSkeleton();

    state.books = (await PustakaAPI.listBooks()) || [];

    els.dataNote.textContent = PustakaAPI.isOffline()
      ? 'Mode pratinjau: katalog memakai data contoh karena server belum tersambung.'
      : 'Katalog diperbarui langsung dari meja sirkulasi.';

    renderCurator();
    renderContinue();
    renderShelves();
    renderCategories();
    syncFormatButtons();
    renderGrid();
    bindEvents();

    const openSlug = new URLSearchParams(location.search).get('buku');
    if (openSlug) openBook(openSlug);
  }

  /* ------------------------------------------------------------ */
  /* Catatan kurator                                              */
  /* ------------------------------------------------------------ */
  function renderCurator() {
    const note = SEED.curatorNote;
    const pick = state.books.find((b) => b.slug === note.bookSlug);
    els.curator.innerHTML = `
      <div class="curator__head">
        <p class="eyebrow">${esc(note.eyebrow)}</p>
      </div>
      <p class="curator__text">${esc(note.text)}</p>
      <p class="curator__sign">— <strong>${esc(note.author)}</strong>, ${esc(note.role)}</p>
      ${pick ? `
        <button type="button" class="curator__pick" data-open="${esc(pick.slug)}">
          ${coverHTML(pick)}
          <span>
            <span class="curator__pick-label">Rekomendasi minggu ini</span>
            <span class="curator__pick-title">${esc(pick.title)}</span>
            <span class="curator__pick-meta">${esc(pick.author)} · ${pick.chapterCount} bab pendek</span>
          </span>
        </button>` : ''}`;
  }

  /* ------------------------------------------------------------ */
  /* Lanjutkan membaca (dari localStorage)                        */
  /* ------------------------------------------------------------ */
  function renderContinue() {
    const items = ProgressStore.all()
      .map((p) => ({ progress: p, book: state.books.find((b) => b.slug === p.slug) }))
      .filter((x) => x.book && isReadable(x.book) && x.progress.percent < 100)
      .slice(0, 3);

    els.continueSection.hidden = items.length === 0;
    els.continueList.innerHTML = items.map(({ book, progress }) => {
      const pct = Math.round(progress.percent || 0);
      return `
        <a class="continue-card" href="baca.html?buku=${encodeURIComponent(book.slug)}">
          ${coverHTML(book)}
          <span>
            <span class="continue-card__title">${esc(book.title)}</span>
            <span class="continue-card__meta" style="display:block">Bab ${progress.chapterIndex + 1} dari ${book.chapterCount} · ${pct}% selesai</span>
            <span class="meter" style="display:block"><span style="width:${pct}%"></span></span>
          </span>
        </a>`;
    }).join('');
  }

  /* ------------------------------------------------------------ */
  /* Rak kurasi                                                   */
  /* ------------------------------------------------------------ */
  function renderShelves() {
    els.shelfList.innerHTML = SEED.shelves.map((shelf, i) => {
      const books = state.books.filter((b) => (b.shelves || []).includes(shelf.slug));
      if (!books.length) return '';
      return `
        <article class="shelf" aria-labelledby="shelf-${esc(shelf.slug)}">
          <div class="shelf__intro">
            <span class="shelf__num">Rak ${String(i + 1).padStart(2, '0')}</span>
            <h2 class="shelf__title" id="shelf-${esc(shelf.slug)}">${esc(shelf.title)}</h2>
            <p class="shelf__blurb">${esc(shelf.blurb)}</p>
          </div>
          <ol class="shelf__books">
            ${books.map((b) => `
              <li>
                <button type="button" class="shelf-book" data-open="${esc(b.slug)}">
                  ${coverHTML(b)}
                  <span class="shelf-book__title">${esc(b.title)}</span>
                  <span class="shelf-book__author">${esc(b.author)}</span>
                </button>
              </li>`).join('')}
          </ol>
        </article>`;
    }).join('');
  }

  /* ------------------------------------------------------------ */
  /* Filter                                                       */
  /* ------------------------------------------------------------ */
  function renderCategories() {
    const counts = state.books.reduce((acc, b) => ((acc[b.category] = (acc[b.category] || 0) + 1), acc), {});
    const cats = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'id'));
    if (state.category !== 'all' && !counts[state.category]) state.category = 'all';

    els.categoryFilter.innerHTML = [
      `<button type="button" class="chip" data-category="all" aria-pressed="${state.category === 'all'}">Semua kategori</button>`,
      ...cats.map((c) => `
        <button type="button" class="chip" data-category="${esc(c)}" aria-pressed="${state.category === c}">
          ${esc(c)}<span class="chip__count">${counts[c]}</span>
        </button>`),
    ].join('');
  }

  function syncFormatButtons() {
    els.formatFilter.querySelectorAll('[data-format]').forEach((btn) => {
      btn.setAttribute('aria-checked', String(btn.dataset.format === state.format));
    });
  }

  function availabilityHTML(book) {
    const progress = ProgressStore.get(book.slug);
    if (isReadable(book) && progress && progress.percent > 0) {
      const pct = Math.round(progress.percent);
      return `<span class="book-card__avail book-card__avail--progress">${pct >= 100 ? 'Sudah selesai kamu baca' : `Sedang kamu baca · ${pct}%`}</span>`;
    }
    if (book.format === 'ebook') {
      return `<span class="book-card__avail">${book.chapterCount} bab · bisa dibaca sekarang</span>`;
    }
    if (book.stockAvailable > 0) {
      return `<span class="book-card__avail">${book.stockAvailable} dari ${book.stockTotal} eksemplar ada di rak</span>`;
    }
    return '<span class="book-card__avail book-card__avail--out">Semua eksemplar sedang dipinjam</span>';
  }

  function renderGrid() {
    const results = PustakaFilter.filterBooks(state.books, state);
    els.grid.removeAttribute('aria-busy');

    els.count.textContent = results.length === state.books.length
      ? `${results.length} buku di katalog`
      : `${results.length} dari ${state.books.length} buku`;

    if (!results.length) {
      els.grid.innerHTML = '';
      els.empty.hidden = false;
      els.emptyText.textContent = state.q
        ? `Kami belum punya buku yang cocok dengan “${state.q}”. Coba kata yang lebih umum, atau sapa pustakawan di meja depan—siapa tahu bukunya masih di gudang.`
        : 'Kombinasi filter ini belum ada isinya. Coba longgarkan sedikit pilihannya.';
      return;
    }

    els.empty.hidden = true;
    els.grid.innerHTML = results.map((b, i) => `
      <button type="button" class="book-card" data-open="${esc(b.slug)}" style="animation-delay:${Math.min(i, 12) * 30}ms">
        ${coverHTML(b)}
        <span class="book-card__body">
          <span>${badgeHTML(b.format)}</span>
          <span class="book-card__title">${esc(b.title)}</span>
          <span class="book-card__author">${esc(b.author)}</span>
          ${availabilityHTML(b)}
        </span>
      </button>`).join('');
  }

  const applySearch = debounce(() => { renderGrid(); writeUrl(); }, 120);

  function setQuery(value, source) {
    state.q = value;
    if (source !== els.heroSearch) els.heroSearch.value = value;
    if (source !== els.catalogSearch) els.catalogSearch.value = value;
    applySearch();
  }

  function resetFilters() {
    state.category = 'all';
    state.format = 'all';
    setQuery('', null);
    renderCategories();
    syncFormatButtons();
  }

  /* ------------------------------------------------------------ */
  /* Detail buku                                                  */
  /* ------------------------------------------------------------ */
  async function openBook(slug) {
    const summary = state.books.find((b) => b.slug === slug);
    if (!summary) return;
    renderDetail(summary, null);
    if (!els.dialog.open) els.dialog.showModal();

    const full = await PustakaAPI.getBook(slug);
    if (full && els.dialog.open) renderDetail(full, full.toc || []);
  }

  function renderDetail(book, toc) {
    const readable = isReadable(book);
    const borrowable = book.format === 'physical' || book.format === 'both';
    const progress = ProgressStore.get(book.slug);
    const hasProgress = readable && progress && progress.percent > 0 && progress.percent < 100;

    const facts = [
      ['Penerbit', book.publisher],
      ['Tahun', book.year],
      ['Tebal', book.pageCount ? `${book.pageCount} halaman` : ''],
      ['ISBN', book.isbn],
      ['Topik', (book.topics || []).join(', ')],
    ].filter(([, v]) => v);

    const tocHTML = readable && toc && toc.length ? `
      <div class="detail__toc">
        <h3>Daftar isi</h3>
        <ol>${toc.map((c) => `<li><span>${esc(c.title)}</span><span>± ${c.estimatedMinutes} menit</span></li>`).join('')}</ol>
      </div>` : '';

    let actions = '';
    if (readable) {
      actions += `
        <a class="btn btn--primary" href="baca.html?buku=${encodeURIComponent(book.slug)}">
          ${ICONS.book} ${hasProgress ? `Lanjutkan Baca · ${Math.round(progress.percent)}%` : 'Mulai Baca'}
        </a>`;
    }
    if (borrowable) {
      actions += book.stockAvailable > 0
        ? `<button type="button" class="btn btn--outline" data-borrow="${esc(book.slug)}">${ICONS.bag} Ajukan Pinjam</button>`
        : `<button type="button" class="btn btn--outline" data-notify="${esc(book.slug)}">${ICONS.bell} Kabari Saya Saat Tersedia</button>`;
    }
    const note = borrowable
      ? (book.stockAvailable > 0
        ? `Setelah diajukan, kamu dapat kode booking. Ambil bukunya di meja sirkulasi paling lambat 2 hari.`
        : `Semua ${book.stockTotal} eksemplar sedang dibawa pulang pembaca lain.`)
      : 'Versi digital saja—bisa langsung dibaca kapan pun, tanpa antre.';

    els.dialogBody.innerHTML = `
      <div class="detail__aside">
        ${coverHTML(book)}
        <dl class="detail__facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      </div>
      <div class="detail__main">
        ${badgeHTML(book.format)}
        <h2 class="detail__title" id="dialogTitle">${esc(book.title)}</h2>
        ${book.subtitle ? `<p class="detail__subtitle">${esc(book.subtitle)}</p>` : ''}
        <p class="detail__author">oleh <strong>${esc(book.author)}</strong> · ${esc(book.category)}</p>
        <p class="detail__desc">${esc(book.description)}</p>
        ${book.curatorNote ? `<p class="detail__note"><b>Kata pustakawan</b>${esc(book.curatorNote)}</p>` : ''}
        ${tocHTML}
        <div class="detail__actions">
          ${actions}
          <p class="detail__actions-note">${esc(note)}</p>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------ */
  /* Event                                                         */
  /* ------------------------------------------------------------ */
  function bindEvents() {
    els.heroSearch.addEventListener('input', (e) => setQuery(e.target.value, e.target));
    els.catalogSearch.addEventListener('input', (e) => setQuery(e.target.value, e.target));
    els.heroSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('katalog').scrollIntoView({ behavior: 'smooth' });
    });

    document.querySelectorAll('[data-q]').forEach((btn) => btn.addEventListener('click', () => {
      setQuery(btn.dataset.q, null);
      document.getElementById('katalog').scrollIntoView({ behavior: 'smooth' });
    }));

    els.formatFilter.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-format]');
      if (!btn) return;
      state.format = btn.dataset.format;
      syncFormatButtons();
      renderGrid();
      writeUrl();
    });

    els.formatFilter.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const btns = [...els.formatFilter.querySelectorAll('[data-format]')];
      const i = btns.findIndex((b) => b.dataset.format === state.format);
      const next = btns[(i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length];
      next.focus();
      next.click();
    });

    els.categoryFilter.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-category]');
      if (!btn) return;
      state.category = btn.dataset.category;
      els.categoryFilter.querySelectorAll('[data-category]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      renderGrid();
      writeUrl();
    });

    $('#resetFilters').addEventListener('click', resetFilters);

    document.addEventListener('click', (e) => {
      const open = e.target.closest('[data-open]');
      if (open) return openBook(open.dataset.open);

      if (e.target.closest('[data-borrow]')) {
        return toast('Masuk dulu sebagai anggota, ya—supaya kami bisa menyiapkan bukunya atas namamu.');
      }
      if (e.target.closest('[data-notify]')) {
        return toast('Siap! Begitu ada eksemplar yang kembali, kami kabari lewat email.');
      }
      const soon = e.target.closest('[data-soon]');
      if (soon) {
        return toast(soon.dataset.soon === 'masuk'
          ? 'Halaman masuk anggota sedang kami rapikan. Sementara itu, silakan jelajahi dan baca dulu.'
          : 'Daftar pinjamanmu akan muncul di sini setelah kamu masuk sebagai anggota.');
      }
    });

    els.dialog.addEventListener('click', (e) => {
      if (e.target === els.dialog || e.target.closest('[data-close]')) els.dialog.close();
    });

    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (e.key === '/' && !typing && !els.dialog.open) {
        e.preventDefault();
        els.heroSearch.focus();
        els.heroSearch.select();
      }
    });

    // Saat kembali dari halaman baca (bfcache), segarkan progres.
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) { renderContinue(); renderGrid(); }
    });
  }

  init();
})();
