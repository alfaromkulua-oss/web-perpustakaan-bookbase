/**
 * BookBase Digital Library — Full Multi-Page & Full-Book E-Reader (baca.html)
 * Mendukung 3 Mode Baca Lengkap dari Database MySQL (`bab_buku`):
 * 1. Mode "Per Halaman" (Halaman 1 s/d Halaman Terakhir, ~40 halaman penuh per buku)
 * 2. Mode "Per Bab" (Bab 1 s/d Bab 10 lengkap)
 * 3. Mode "Full 1 Buku" (Menampilkan seluruh isi buku dari Bab 1 sampai Bab 10 sekaligus tanpa terputus)
 */

const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
const IS_LIVE_SERVER = !IS_FILE_PROTOCOL && ['5500', '5501', '5173'].includes(window.location.port);
const API_BASE = IS_FILE_PROTOCOL || IS_LIVE_SERVER ? 'http://localhost:3000' : '';

if (IS_FILE_PROTOCOL || IS_LIVE_SERVER) {
  window.location.replace(`http://localhost:3000/baca.html${window.location.search}`);
}

const readerState = {
  bookId: 1,
  book: null,
  chapters: [],
  pages: [], // Setiap bab dipecah menjadi halaman-halaman nyata sehingga buku memiliki ~40 halaman penuh
  currentPageIndex: 0, // 0-based page index
  currentChapterIndex: 0, // 0-based chapter index
  readMode: localStorage.getItem('bb_reader_mode') || 'page', // 'page' | 'chapter' | 'all'
  theme: localStorage.getItem('bb_reader_theme') || 'cream',
  size: localStorage.getItem('bb_reader_size') || 'm',
};

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderBlocksToHtml(blocks, { withDropcap = true } = {}) {
  let isFirstParagraph = withDropcap;
  return blocks
    .map((block) => {
      if (block === '***') {
        return `<div class="py-3 text-center text-blue-500 font-bold tracking-widest">⁂ ⁂ ⁂</div>`;
      }
      if (block.startsWith('>')) {
        const clean = block.replace(/^>\s?/gm, '');
        return `<blockquote class="my-5 pl-5 pr-4 py-3.5 border-l-4 border-blue-600 bg-blue-50/70 rounded-r-2xl italic text-slate-700">${formatInlineMarkdown(
          clean
        )}</blockquote>`;
      }
      if (/^\d+\.\s/.test(block)) {
        const items = block
          .split('\n')
          .map((line) => line.replace(/^\d+\.\s+/, '').trim())
          .filter(Boolean);
        return `<ol class="list-decimal pl-6 space-y-2 my-4">${items
          .map((it) => `<li>${formatInlineMarkdown(it)}</li>`)
          .join('')}</ol>`;
      }

      const dropClass = isFirstParagraph ? ' class="dropcap"' : '';
      isFirstParagraph = false;
      return `<p${dropClass}>${formatInlineMarkdown(block)}</p>`;
    })
    .join('');
}

/**
 * Memecah seluruh bab buku menjadi daftar Halaman Buku yang berurutan (Halaman 1 s/d N)
 * Setiap bab dibagi berdasarkan sub-bagian (`***`) atau setiap 3-4 paragraf menjadi halaman tersendiri.
 */
function buildBookPages(chapters) {
  const pages = [];
  let pageNumber = 1;

  chapters.forEach((ch, chIdx) => {
    const rawBlocks = String(ch.isi_bab || '')
      .replace(/\r\n/g, '\n')
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);

    // Pisahkan per tanda '***' (seksi bab) agar setiap halaman memiliki struktur bacaan yang utuh
    const sections = [];
    let currentSection = [];

    rawBlocks.forEach((block) => {
      if (block === '***') {
        if (currentSection.length) {
          sections.push(currentSection);
          currentSection = [];
        }
      } else {
        currentSection.push(block);
        if (currentSection.length >= 4) {
          sections.push(currentSection);
          currentSection = [];
        }
      }
    });
    if (currentSection.length) {
      sections.push(currentSection);
    }

    sections.forEach((secBlocks, secIdx) => {
      pages.push({
        pageNumber,
        chapterIndex: chIdx,
        nomor_bab: ch.nomor_bab,
        judul_bab: ch.judul_bab,
        sectionIndex: secIdx + 1,
        totalSectionsInChapter: sections.length,
        blocks: secBlocks,
        isFirstPageOfChapter: secIdx === 0,
      });
      pageNumber++;
    });
  });

  return pages;
}

function applyReaderPreferences() {
  document.body.setAttribute('data-theme', readerState.theme);
  const prose = document.getElementById('chapter-body-content');
  if (prose) prose.setAttribute('data-size', readerState.size);

  document.querySelectorAll('[data-set-theme]').forEach((btn) => {
    const active = btn.dataset.setTheme === readerState.theme;
    if (btn.classList.contains('theme-btn')) {
      btn.className = active
        ? 'theme-btn px-2 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white'
        : 'theme-btn px-2 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white';
    }
  });

  document.querySelectorAll('[data-set-size]').forEach((btn) => {
    const active = btn.dataset.setSize === readerState.size;
    btn.className = active
      ? 'size-btn px-2 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white'
      : 'size-btn px-2 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white';
  });

  // Active state tombol mode baca
  document.querySelectorAll('[data-read-mode]').forEach((btn) => {
    const active = btn.dataset.readMode === readerState.readMode;
    if (btn.classList.contains('mode-btn')) {
      btn.className = active
        ? 'mode-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white'
        : 'mode-btn px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white';
    } else {
      btn.className = active
        ? 'mode-btn-side py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white shadow'
        : 'mode-btn-side py-1.5 rounded-lg text-[11px] font-bold opacity-75 hover:opacity-100';
    }
  });
}

function renderCurrentView() {
  applyReaderPreferences();

  const totalPages = readerState.pages.length || 1;
  const totalChapters = readerState.chapters.length || 1;

  document.getElementById('label-total-pages').textContent = `/ ${totalPages}`;
  document.getElementById('input-jump-page').max = String(totalPages);
  document.getElementById('toc-book-stats').textContent = `${totalChapters} Bab Lengkap • ${totalPages} Halaman`;

  if (readerState.readMode === 'page') {
    renderPageMode();
  } else if (readerState.readMode === 'chapter') {
    renderChapterMode();
  } else {
    renderFullBookMode();
  }

  renderTocSidebar();
  renderBottomPagination();
}

/* ==========================================================================
   MODE 1: BACA PER HALAMAN (Halaman 1 s/d Halaman Terakhir)
   ========================================================================== */
function renderPageMode() {
  const totalPages = readerState.pages.length;
  const idx = Math.max(0, Math.min(readerState.currentPageIndex, totalPages - 1));
  readerState.currentPageIndex = idx;

  const pageObj = readerState.pages[idx];
  readerState.currentChapterIndex = pageObj.chapterIndex;

  document.getElementById('input-jump-page').value = String(pageObj.pageNumber);
  document.getElementById('sidebar-current-page-label').textContent = `Hlm ${pageObj.pageNumber} / ${totalPages}`;
  document.getElementById('chapter-badge-number').textContent = `BAB ${pageObj.nomor_bab} (Bagian ${pageObj.sectionIndex}/${pageObj.totalSectionsInChapter})`;
  document.getElementById('chapter-read-time').textContent = `Halaman ${pageObj.pageNumber} dari ${totalPages}`;
  document.getElementById('chapter-heading-title').textContent = pageObj.judul_bab;
  document.getElementById('page-pill-indicator').textContent = `Halaman ${pageObj.pageNumber} / ${totalPages}`;

  document.getElementById('chapter-body-content').innerHTML = renderBlocksToHtml(pageObj.blocks, {
    withDropcap: pageObj.isFirstPageOfChapter,
  });

  const pct = Math.round((pageObj.pageNumber / totalPages) * 100);
  document.getElementById('reader-progress-bar').style.width = `${pct}%`;

  document.getElementById('chapter-footer-indicator').textContent = `Halaman ${pageObj.pageNumber} dari ${totalPages} • Bab ${pageObj.nomor_bab} dari ${readerState.chapters.length}`;

  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');
  btnPrev.classList.remove('hidden');
  btnNext.classList.remove('hidden');
  btnPrev.disabled = idx === 0;
  btnPrev.innerHTML = '<span>← Halaman Sebelumnya</span>';
  btnNext.innerHTML =
    idx === totalPages - 1
      ? '<span>Selesai Membaca (Kembali ke Katalog) ✓</span>'
      : `<span>Halaman Selanjutnya (${pageObj.pageNumber + 1}/${totalPages}) →</span>`;

  localStorage.setItem(`bb_last_page_${readerState.bookId}`, String(idx));
}

/* ==========================================================================
   MODE 2: BACA PER BAB UTUH (Bab 1 s/d Bab 10)
   ========================================================================== */
function renderChapterMode() {
  const totalChapters = readerState.chapters.length;
  const chIdx = Math.max(0, Math.min(readerState.currentChapterIndex, totalChapters - 1));
  readerState.currentChapterIndex = chIdx;
  const ch = readerState.chapters[chIdx];

  // Sinkronkan currentPageIndex ke halaman pertama dari bab ini
  const firstPageIdx = readerState.pages.findIndex((p) => p.chapterIndex === chIdx);
  if (firstPageIdx >= 0) readerState.currentPageIndex = firstPageIdx;

  const rawBlocks = String(ch.isi_bab || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  document.getElementById('chapter-badge-number').textContent = `BAB ${ch.nomor_bab} LENGKAP`;
  document.getElementById('chapter-read-time').textContent = `± ${ch.estimasi_menit || 6} Menit Baca`;
  document.getElementById('chapter-heading-title').textContent = ch.judul_bab;
  document.getElementById('page-pill-indicator').textContent = `Bab ${chIdx + 1} / ${totalChapters}`;

  document.getElementById('chapter-body-content').innerHTML = renderBlocksToHtml(rawBlocks, {
    withDropcap: true,
  });

  const pct = Math.round(((chIdx + 1) / totalChapters) * 100);
  document.getElementById('reader-progress-bar').style.width = `${pct}%`;
  document.getElementById('chapter-footer-indicator').textContent = `Bab ${chIdx + 1} dari ${totalChapters} (${readerState.pages.length} Total Halaman)`;

  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');
  btnPrev.classList.remove('hidden');
  btnNext.classList.remove('hidden');
  btnPrev.disabled = chIdx === 0;
  btnPrev.innerHTML = '<span>← Bab Sebelumnya</span>';
  btnNext.innerHTML =
    chIdx === totalChapters - 1
      ? '<span>Selesai Membaca (Kembali ke Katalog) ✓</span>'
      : `<span>Bab Selanjutnya (Bab ${chIdx + 2}) →</span>`;
}

/* ==========================================================================
   MODE 3: BACA FULL 1 BUKU PENUH (Seluruh Bab 1 s/d 10 Tanpa Terputus)
   ========================================================================== */
function renderFullBookMode() {
  const b = readerState.book;
  const totalChapters = readerState.chapters.length;
  const totalPages = readerState.pages.length;

  document.getElementById('chapter-badge-number').textContent = `EDISI LENGKAP FULL 1 BUKU (${totalChapters} BAB • ${totalPages} HALAMAN)`;
  document.getElementById('chapter-read-time').textContent = `Seluruh Isi Buku Ditampilkan`;
  document.getElementById('chapter-heading-title').textContent = `${b.judul_buku} — ${b.penulis}`;
  document.getElementById('page-pill-indicator').textContent = `Full ${totalPages} Halaman`;
  document.getElementById('reader-progress-bar').style.width = `100%`;

  const allChaptersHtml = readerState.chapters
    .map((ch, idx) => {
      const rawBlocks = String(ch.isi_bab || '')
        .replace(/\r\n/g, '\n')
        .split(/\n\s*\n/)
        .map((blk) => blk.trim())
        .filter(Boolean);

      return `
        <section id="full-chapter-${idx}" class="${idx > 0 ? 'pt-12 mt-12 border-t-2 border-slate-300/60' : ''}">
          <div class="mb-6">
            <span class="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-extrabold uppercase tracking-wider">
              Bab ${ch.nomor_bab} dari ${totalChapters}
            </span>
            <h3 class="reader-serif text-2xl font-bold mt-3">${escapeHtml(ch.judul_bab)}</h3>
          </div>
          ${renderBlocksToHtml(rawBlocks, { withDropcap: true })}
        </section>
      `;
    })
    .join('');

  document.getElementById('chapter-body-content').innerHTML = allChaptersHtml;
  document.getElementById('chapter-footer-indicator').textContent = `Menampilkan Seluruh ${totalChapters} Bab (${totalPages} Halaman Lengkap)`;

  document.getElementById('btn-prev-page').classList.add('hidden');
  const btnNext = document.getElementById('btn-next-page');
  btnNext.classList.remove('hidden');
  btnNext.innerHTML = '<span>Kembali ke Katalog Perpustakaan ✓</span>';
}

/* ==========================================================================
   SIDEBAR DAFTAR HALAMAN & DAFTAR ISI 10 BAB
   ========================================================================== */
function renderTocSidebar() {
  // 1. Grid Nomor Halaman (1 s/d N)
  const pagesGrid = document.getElementById('toc-pages-grid');
  if (pagesGrid) {
    pagesGrid.innerHTML = readerState.pages
      .map((p, idx) => {
        const active = readerState.readMode === 'page' && idx === readerState.currentPageIndex;
        return `
          <button
            type="button"
            data-goto-page="${idx}"
            class="py-1.5 rounded-lg text-[11px] font-bold transition ${
              active
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-500/10 hover:bg-blue-600/20'
            }"
            title="Halaman ${p.pageNumber} (Bab ${p.nomor_bab})"
          >
            ${p.pageNumber}
          </button>
        `;
      })
      .join('');
  }

  // 2. Daftar Isi Bab (Bab 1 s/d Bab 10)
  const chList = document.getElementById('toc-chapters-list');
  if (chList) {
    chList.innerHTML = readerState.chapters
      .map((ch, idx) => {
        const active = idx === readerState.currentChapterIndex;
        const firstPage = readerState.pages.find((p) => p.chapterIndex === idx);
        const pageStart = firstPage ? firstPage.pageNumber : idx + 1;

        return `
          <button
            type="button"
            data-goto-chapter="${idx}"
            class="w-full text-left p-2.5 rounded-2xl text-xs transition flex items-start justify-between gap-2 ${
              active
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'hover:bg-blue-500/10 font-semibold opacity-85'
            }"
          >
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-wider ${active ? 'text-blue-200' : 'text-blue-600'}">
                Bab ${ch.nomor_bab} • Mulai Hlm. ${pageStart}
              </p>
              <p class="line-clamp-2 mt-0.5">${escapeHtml(ch.judul_bab)}</p>
            </div>
            <span class="text-[10px] shrink-0 ${active ? 'text-blue-100' : 'opacity-60'}">${ch.estimasi_menit || 6}m</span>
          </button>
        `;
      })
      .join('');
  }
}

function renderBottomPagination() {
  const bar = document.getElementById('bottom-pagination-bar');
  if (!bar) return;

  if (readerState.readMode !== 'page') {
    bar.innerHTML = '';
    return;
  }

  const total = readerState.pages.length;
  const curr = readerState.currentPageIndex;

  // Tampilkan semua nomor halaman agar pembaca bisa langsung melompat ke halaman mana saja
  bar.innerHTML = readerState.pages
    .map((p, idx) => {
      const active = idx === curr;
      return `
        <button
          type="button"
          data-goto-page="${idx}"
          class="w-8 h-8 rounded-xl text-xs font-bold transition ${
            active
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-500/10 hover:bg-blue-600/20'
          }"
        >
          ${p.pageNumber}
        </button>
      `;
    })
    .join('');
}

function goPrev() {
  if (readerState.readMode === 'page') {
    if (readerState.currentPageIndex > 0) {
      readerState.currentPageIndex--;
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } else if (readerState.readMode === 'chapter') {
    if (readerState.currentChapterIndex > 0) {
      readerState.currentChapterIndex--;
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

function goNext() {
  if (readerState.readMode === 'page') {
    if (readerState.currentPageIndex < readerState.pages.length - 1) {
      readerState.currentPageIndex++;
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = 'index.html#katalog';
    }
  } else if (readerState.readMode === 'chapter') {
    if (readerState.currentChapterIndex < readerState.chapters.length - 1) {
      readerState.currentChapterIndex++;
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = 'index.html#katalog';
    }
  } else {
    window.location.href = 'index.html#katalog';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const idParam = Number(params.get('id') || params.get('buku') || 1);
  readerState.bookId = idParam > 0 ? idParam : 1;

  try {
    const res = await fetch(`${API_BASE}/api/books/${readerState.bookId}/chapters`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat isi buku.');

    readerState.book = data.book;
    readerState.chapters = data.chapters || [];
    readerState.pages = buildBookPages(readerState.chapters);

    const b = readerState.book;
    document.title = `Membaca: ${b.judul_buku} (${readerState.pages.length} Halaman) — BookBase`;
    document.getElementById('reader-book-title').textContent = b.judul_buku;
    document.getElementById('reader-book-meta').textContent = `${b.penulis} • ${b.penerbit} (${b.tahun_terbit}) • ${readerState.chapters.length} Bab (${readerState.pages.length} Halaman)`;

    const cleanCover = (b.cover_buku || 'uploads/covers/book-1.svg').replace(/^\/uploads\//, 'uploads/');
    document.getElementById('toc-book-cover').src = cleanCover;
    document.getElementById('toc-book-category').textContent = b.nama_kategori || 'Koleksi Digital';
    document.getElementById('toc-book-title').textContent = b.judul_buku;
    document.getElementById('toc-book-author').textContent = b.penulis;

    const savedPage = Number(localStorage.getItem(`bb_last_page_${readerState.bookId}`) || 0);
    readerState.currentPageIndex =
      savedPage >= 0 && savedPage < readerState.pages.length ? savedPage : 0;

    renderCurrentView();
  } catch (err) {
    document.getElementById('chapter-heading-title').textContent = 'Gagal Memuat Buku';
    document.getElementById('chapter-body-content').innerHTML = `<p>${escapeHtml(err.message)}</p>`;
  }

  // Event delegasi untuk seluruh tombol kontrol E-Reader
  document.body.addEventListener('click', (e) => {
    // Klik Nomor Halaman
    const pageBtn = e.target.closest('[data-goto-page]');
    if (pageBtn) {
      readerState.readMode = 'page';
      localStorage.setItem('bb_reader_mode', 'page');
      readerState.currentPageIndex = Number(pageBtn.dataset.gotoPage);
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Klik Bab di Daftar Isi
    const chBtn = e.target.closest('[data-goto-chapter]');
    if (chBtn) {
      const chIdx = Number(chBtn.dataset.gotoChapter);
      readerState.currentChapterIndex = chIdx;

      if (readerState.readMode === 'all') {
        document.getElementById(`full-chapter-${chIdx}`)?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      const firstPageIdx = readerState.pages.findIndex((p) => p.chapterIndex === chIdx);
      if (firstPageIdx >= 0) readerState.currentPageIndex = firstPageIdx;
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Ganti Mode Baca (Per Halaman | Per Bab | Full 1 Buku)
    const modeBtn = e.target.closest('[data-read-mode]');
    if (modeBtn) {
      readerState.readMode = modeBtn.dataset.readMode;
      localStorage.setItem('bb_reader_mode', readerState.readMode);
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Ganti Tema Kertas
    const themeBtn = e.target.closest('[data-set-theme]');
    if (themeBtn) {
      readerState.theme = themeBtn.dataset.setTheme;
      localStorage.setItem('bb_reader_theme', readerState.theme);
      applyReaderPreferences();
      return;
    }

    // Ganti Ukuran Huruf
    const sizeBtn = e.target.closest('[data-set-size]');
    if (sizeBtn) {
      readerState.size = sizeBtn.dataset.setSize;
      localStorage.setItem('bb_reader_size', readerState.size);
      applyReaderPreferences();
    }
  });

  // Form Input Lompat ke Nomor Halaman
  document.getElementById('form-jump-page')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = Number(document.getElementById('input-jump-page').value);
    if (val >= 1 && val <= readerState.pages.length) {
      readerState.readMode = 'page';
      readerState.currentPageIndex = val - 1;
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  document.getElementById('input-jump-page')?.addEventListener('change', (e) => {
    const val = Number(e.target.value);
    if (val >= 1 && val <= readerState.pages.length) {
      readerState.readMode = 'page';
      readerState.currentPageIndex = val - 1;
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Tombol Sebelumnya & Selanjutnya
  document.getElementById('btn-prev-page')?.addEventListener('click', goPrev);
  document.getElementById('btn-next-page')?.addEventListener('click', goNext);

  // Navigasi Keyboard Panah Kiri / Kanan
  document.addEventListener('keydown', (e) => {
    if (document.activeElement?.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  });

  // Toggle Daftar Isi Sidebar
  document.getElementById('btn-toggle-toc')?.addEventListener('click', () => {
    document.getElementById('reader-toc-sidebar')?.classList.toggle('hidden');
  });

  // Layar Penuh
  document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });
});
