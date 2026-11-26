/**
 * BookBase Digital Library — Frontend Logic
 * Terhubung 100% dengan Backend Node.js & Database MySQL (`db_perpustakaan`)
 */

const state = {
  csrfToken: '',
  user: null,
  currentView: 'beranda',
  categories: [],
  years: [],
  books: [],
  newestBooks: [],
  popularBooks: [],
  selectedBook: null,
  homeCategorySlug: 'all',
  adminLoanFilter: 'all',
  currentReportType: 'buku',
  currentReportData: { title: '', generatedAt: '', rows: [] },
  charts: {
    category: null,
    status: null,
  },
};

/* ==========================================================================
   1. UTILITAS & KOMUNIKASI API (DENGAN PROTEKSI CSRF)
   ========================================================================== */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRupiah(num) {
  return `Rp ${Number(num || 0).toLocaleString('id-ID')}`;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const bgClass =
    type === 'error'
      ? 'bg-rose-600 text-white'
      : type === 'warning'
      ? 'bg-amber-500 text-white'
      : 'bg-navy-900 text-white border border-blue-500/40';

  const el = document.createElement('div');
  el.className = `pointer-events-auto px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center justify-between gap-3 transition-all duration-300 ${bgClass}`;
  el.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button type="button" class="text-white/80 hover:text-white font-bold text-sm">&times;</button>
  `;
  el.querySelector('button').addEventListener('click', () => el.remove());
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : '';
}

const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
const IS_LIVE_SERVER = !IS_FILE_PROTOCOL && ['5500', '5501', '5173'].includes(window.location.port);
const API_BASE = IS_FILE_PROTOCOL || IS_LIVE_SERVER ? 'http://localhost:3000' : '';

// Jika pengguna membuka index.html langsung dari File Explorer (file:///) atau Live Server (port 5500),
// otomatis alihkan ke server Node.js http://localhost:3000.
// Akses melalui Domain Publik / Tunnel (https://...) atau IP LAN WiFi (http://192.168.x.x:3000) tetap diizinkan penuh!
if (IS_FILE_PROTOCOL || IS_LIVE_SERVER) {
  window.location.replace('http://localhost:3000');
}

async function apiFetch(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const csrf = state.csrfToken || getCookie('bb_csrf');
  const headers = {
    'Content-Type': 'application/json',
    ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(fullUrl, {
    credentials: IS_FILE_PROTOCOL ? 'include' : 'same-origin',
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (data.csrfToken) {
    state.csrfToken = data.csrfToken;
  }

  if (!response.ok) {
    throw new Error(data.error || `Permintaan gagal (${response.status})`);
  }
  return data;
}

/* ==========================================================================
   2. NAVIGASI HALAMAN & ROLE-BASED ACCESS CONTROL
   ========================================================================== */

function switchView(viewName) {
  if (viewName === 'login') {
    window.location.href = 'login.html';
    return;
  }

  const adminViews = [
    'admin-dashboard',
    'admin-buku',
    'admin-anggota',
    'admin-transaksi',
    'admin-laporan',
  ];

  if (adminViews.includes(viewName)) {
    if (!state.user || state.user.role !== 'admin') {
      showToast('Halaman tersebut khusus untuk Administrator. Mengalihkan ke halaman Login...', 'error');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 600);
      return;
    }
  }

  if (viewName === 'riwayat-anggota' && !state.user) {
    showToast('Silakan login terlebih dahulu untuk melihat riwayat peminjaman.', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 600);
    return;
  }

  state.currentView = viewName;

  document.querySelectorAll('.view-section').forEach((sec) => {
    sec.classList.add('hidden');
  });
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.remove('hidden');

  // Update active state di sidebar & top navbar
  document.querySelectorAll('.sidebar-link').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === viewName);
  });

  document.querySelectorAll('.top-nav-btn').forEach((btn) => {
    const isActive = btn.dataset.nav === viewName;
    btn.className = isActive
      ? 'top-nav-btn px-3.5 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 transition'
      : 'top-nav-btn px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-navy-900 hover:bg-slate-100 transition';
  });

  // Tutup sidebar mobile jika terbuka
  const sidebar = document.getElementById('app-sidebar');
  if (window.innerWidth < 1024 && sidebar) {
    sidebar.classList.add('-translate-x-full');
  }

  // Muat data sesuai view
  if (viewName === 'beranda') loadHomeMeta();
  if (viewName === 'katalog') loadCatalogBooks();
  if (viewName === 'riwayat-anggota') loadMemberLoans();
  if (viewName === 'admin-dashboard') loadAdminDashboard();
  if (viewName === 'admin-buku') loadAdminBooks();
  if (viewName === 'admin-anggota') loadAdminMembers();
  if (viewName === 'admin-transaksi') loadAdminLoans();
  if (viewName === 'admin-laporan') loadAdminReport(state.currentReportType);
}

function updateAuthUI() {
  const btnTopLogin = document.getElementById('nav-btn-login');
  const userMenu = document.getElementById('nav-user-menu');
  const sidebarAdmin = document.getElementById('sidebar-admin-group');
  const menuRiwayat = document.getElementById('menu-item-riwayat');
  const sidebarLogin = document.getElementById('sidebar-btn-login');
  const sidebarLogout = document.getElementById('sidebar-btn-logout');

  if (state.user) {
    btnTopLogin.classList.add('hidden');
    userMenu.classList.remove('hidden');
    userMenu.classList.add('flex');
    sidebarLogin.classList.add('hidden');
    sidebarLogout.classList.remove('hidden');
    menuRiwayat.classList.remove('hidden');

    const initials = state.user.nama
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    document.getElementById('user-avatar-initials').textContent = initials || 'US';
    document.getElementById('user-display-name').textContent = state.user.nama;
    document.getElementById('user-display-role').textContent =
      state.user.role === 'admin' ? 'ADMINISTRATOR' : state.user.kode_anggota || 'ANGGOTA';

    if (state.user.role === 'admin') {
      sidebarAdmin.classList.remove('hidden');
    } else {
      sidebarAdmin.classList.add('hidden');
    }
  } else {
    btnTopLogin.classList.remove('hidden');
    userMenu.classList.add('hidden');
    userMenu.classList.remove('flex');
    sidebarAdmin.classList.add('hidden');
    menuRiwayat.classList.add('hidden');
    sidebarLogin.classList.remove('hidden');
    sidebarLogout.classList.add('hidden');
  }
}

/* ==========================================================================
   3. KOMPONEN KARTU BUKU & PANEL INSPEKTOR KANAN (GAYA BOOKBASE)
   ========================================================================== */

function fixCoverUrl(url) {
  if (!url) return 'uploads/covers/book-1.svg';
  if (url.startsWith('/uploads/')) return url.slice(1);
  return url;
}

function renderBookCard(book) {
  const available = Number(book.jumlah_stok) > 0;
  const stockBadge = available
    ? `<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">Tersedia (${book.jumlah_stok})</span>`
    : `<span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">Stok Habis</span>`;

  return `
    <div class="book-card group bg-slate-50/70 hover:bg-white rounded-2xl p-3.5 border border-slate-200/80 flex flex-col justify-between cursor-pointer" data-book-id="${book.id_buku}">
      <div>
        <div class="relative rounded-xl bg-slate-200/70 p-3 flex justify-center items-center mb-3 overflow-hidden">
          <img
            src="${escapeHtml(fixCoverUrl(book.cover_buku))}"
            alt="${escapeHtml(book.judul_buku)}"
            class="book-cover-shadow w-28 h-40 object-cover rounded-lg"
            loading="lazy"
          />
          <span class="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-navy-900/90 text-amber-300 text-[10px] font-bold shadow">
            ★ ${Number(book.rating || 4.8).toFixed(1)}
          </span>
        </div>
        <div class="flex items-center justify-between gap-1 mb-1">
          <span class="text-[10px] font-bold text-blue-600 truncate">${escapeHtml(book.nama_kategori || '')}</span>
          ${stockBadge}
        </div>
        <h3 class="font-extrabold text-sm text-navy-900 line-clamp-1 group-hover:text-blue-600 transition" title="${escapeHtml(book.judul_buku)}">
          ${escapeHtml(book.judul_buku)}
        </h3>
        <p class="text-xs text-slate-500 truncate">${escapeHtml(book.penulis)} • ${escapeHtml(book.tahun_terbit)}</p>
      </div>

      <div class="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-slate-200/70">
        <a
          href="baca.html?id=${book.id_buku}"
          data-action="read"
          class="py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition text-center flex items-center justify-center gap-1"
          title="Baca isi buku online"
        >
          <span>📖 Baca</span>
        </a>
        <button
          type="button"
          data-action="detail"
          data-id="${book.id_buku}"
          class="py-1.5 px-2 rounded-xl bg-slate-200/70 hover:bg-slate-300/70 text-slate-700 font-bold text-[11px] transition"
        >
          Detail
        </button>
        <button
          type="button"
          data-action="borrow"
          data-id="${book.id_buku}"
          ${!available ? 'disabled' : ''}
          class="py-1.5 px-2 rounded-xl ${
            available
              ? 'bg-navy-900 hover:bg-blue-600 text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          } font-bold text-[11px] transition"
        >
          Pinjam
        </button>
      </div>
    </div>
  `;
}

function updateRightInspector(book) {
  if (!book) return;
  state.selectedBook = book;

  document.getElementById('insp-rak-badge').textContent = book.lokasi_rak || 'RAK-A1';
  document.getElementById('insp-cover').src = fixCoverUrl(book.cover_buku);
  document.getElementById('insp-category').textContent = book.nama_kategori || 'Umum';
  document.getElementById('insp-title').textContent = book.judul_buku;
  document.getElementById('insp-author').textContent = book.penulis;
  document.getElementById('insp-rating').textContent = Number(book.rating || 4.8).toFixed(1);
  document.getElementById('insp-pages').textContent = book.halaman || 250;
  document.getElementById('insp-stock').textContent = `${book.jumlah_stok} / ${book.total_koleksi}`;
  document.getElementById('insp-loans').textContent = `${book.jumlah_pinjam || 0}x`;
  document.getElementById('insp-isbn').textContent = book.isbn;
  document.getElementById('insp-publisher').textContent = book.penerbit;
  document.getElementById('insp-year').textContent = book.tahun_terbit;
  document.getElementById('insp-desc').textContent = book.deskripsi;

  const btnReadNow = document.getElementById('insp-btn-read');
  if (btnReadNow) {
    btnReadNow.href = `baca.html?id=${book.id_buku}`;
  }

  const btnBorrow = document.getElementById('insp-btn-borrow');
  if (Number(book.jumlah_stok) > 0) {
    btnBorrow.disabled = false;
    btnBorrow.className =
      'w-full py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition flex items-center justify-center gap-2';
    btnBorrow.querySelector('span').textContent = 'Pinjam Buku Fisik';
  } else {
    btnBorrow.disabled = true;
    btnBorrow.className =
      'w-full py-2.5 px-4 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-2';
    btnBorrow.querySelector('span').textContent = 'Stok Fisik Habis';
  }
}

/* ==========================================================================
   4. BERANDA & KATALOG BUKU
   ========================================================================== */

async function loadHomeMeta() {
  try {
    const data = await apiFetch('/api/books/meta');
    state.categories = data.categories || [];
    state.years = data.years || [];
    state.newestBooks = data.newest || [];
    state.popularBooks = data.popular || [];

    // Update Statistik Banner & Sidebar
    if (data.summary) {
      document.getElementById('stat-hero-judul').textContent = data.summary.total_judul;
      document.getElementById('stat-hero-eksemplar').textContent = data.summary.total_eksemplar;
      document.getElementById('stat-hero-tersedia').textContent = data.summary.stok_tersedia;
      document.getElementById('stat-hero-anggota').textContent = data.summary.total_anggota;

      document.getElementById('sidebar-total-books').textContent = `${data.summary.total_judul} Judul`;
      document.getElementById('sidebar-available-stock').textContent = `${data.summary.stok_tersedia} Eksemplar Tersedia`;
    }

    // Isi dropdown filter kategori & tahun di Katalog dan Form Modal Buku
    const catSelect = document.getElementById('catalog-filter-category');
    const bfKategori = document.getElementById('bf-kategori');
    if (catSelect) {
      catSelect.innerHTML =
        `<option value="all">Semua Kategori</option>` +
        state.categories
          .map((c) => `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.nama_kategori)} (${c.jumlah_judul})</option>`)
          .join('');
    }
    if (bfKategori) {
      bfKategori.innerHTML = state.categories
        .map((c) => `<option value="${c.id_kategori}">${escapeHtml(c.nama_kategori)}</option>`)
        .join('');
    }

    const yearSelect = document.getElementById('catalog-filter-year');
    if (yearSelect) {
      yearSelect.innerHTML =
        `<option value="all">Semua Tahun Terbit</option>` +
        state.years.map((y) => `<option value="${y}">${y}</option>`).join('');
    }

    // Render Buku Populer
    const popGrid = document.getElementById('home-popular-grid');
    if (popGrid) {
      popGrid.innerHTML = state.popularBooks.slice(0, 4).map(renderBookCard).join('');
    }

    // Render Pill Kategori di Beranda
    renderHomeCategoryPills();
    renderHomeNewestGrid();

    if (!state.selectedBook && state.popularBooks.length > 0) {
      updateRightInspector(state.popularBooks[0]);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderHomeCategoryPills() {
  const wrap = document.getElementById('home-category-pills');
  if (!wrap) return;

  const pills = [
    { slug: 'all', nama_kategori: 'Semua' },
    ...state.categories,
  ];

  wrap.innerHTML = pills
    .map(
      (c) => `
      <button
        type="button"
        data-home-cat="${escapeHtml(c.slug)}"
        class="cat-pill shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold ${
          state.homeCategorySlug === c.slug
            ? 'active'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }"
      >
        ${escapeHtml(c.nama_kategori)}
      </button>
    `
    )
    .join('');
}

async function renderHomeNewestGrid() {
  const grid = document.getElementById('home-newest-grid');
  if (!grid) return;

  try {
    const url =
      state.homeCategorySlug === 'all'
        ? '/api/books?sort=terbaru'
        : `/api/books?kategori=${encodeURIComponent(state.homeCategorySlug)}&sort=terbaru`;
    const data = await apiFetch(url);
    state.books = data.books || [];
    grid.innerHTML = state.books.slice(0, 8).map(renderBookCard).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadCatalogBooks() {
  try {
    const q = document.getElementById('catalog-search').value.trim();
    const kategori = document.getElementById('catalog-filter-category').value;
    const tahun = document.getElementById('catalog-filter-year').value;
    const sort = document.getElementById('catalog-filter-sort').value;

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (kategori && kategori !== 'all') params.set('kategori', kategori);
    if (tahun && tahun !== 'all') params.set('tahun', tahun);
    if (sort) params.set('sort', sort);

    const data = await apiFetch(`/api/books?${params.toString()}`);
    state.books = data.books || [];

    document.getElementById('catalog-count-badge').textContent = `Menampilkan ${state.books.length} Buku`;
    const grid = document.getElementById('catalog-books-grid');

    if (!state.books.length) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-500">
          <p class="font-bold text-base text-navy-900">Tidak ada buku yang cocok dengan pencarian Anda</p>
          <p class="text-xs mt-1">Coba gunakan kata kunci atau filter tahun/kategori yang berbeda.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = state.books.map(renderBookCard).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openBookDetailModal(bookId) {
  try {
    const data = await apiFetch(`/api/books/${bookId}`);
    const book = data.book;
    if (!book) return;

    updateRightInspector(book);

    document.getElementById('md-book-cover').src = fixCoverUrl(book.cover_buku);
    document.getElementById('md-book-category').textContent = book.nama_kategori;
    document.getElementById('md-book-rak').textContent = book.lokasi_rak;
    document.getElementById('md-book-title').textContent = book.judul_buku;
    document.getElementById('md-book-author').textContent = `${book.penulis} (${book.tahun_terbit})`;
    document.getElementById('md-book-code').textContent = book.kode_buku;
    document.getElementById('md-book-isbn').textContent = book.isbn;
    document.getElementById('md-book-publisher').textContent = book.penerbit;
    document.getElementById('md-book-year').textContent = book.tahun_terbit;
    document.getElementById('md-book-desc').textContent = book.deskripsi;
    document.getElementById('borrow-book-id').value = book.id_buku;
    const mdReadBtn = document.getElementById('md-btn-read-now');
    if (mdReadBtn) mdReadBtn.href = `baca.html?id=${book.id_buku}`;

    const stockBadge = document.getElementById('md-book-stock-badge');
    const btnSubmit = document.getElementById('btn-submit-borrow');
    if (Number(book.jumlah_stok) > 0) {
      stockBadge.textContent = `Tersedia (${book.jumlah_stok} dari ${book.total_koleksi})`;
      stockBadge.className = 'px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold';
      btnSubmit.disabled = false;
      btnSubmit.className = 'px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow';
    } else {
      stockBadge.textContent = 'Stok Habis (0)';
      stockBadge.className = 'px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold';
      btnSubmit.disabled = true;
      btnSubmit.className = 'px-5 py-2.5 rounded-xl bg-slate-300 text-slate-500 text-xs font-bold cursor-not-allowed';
    }

    // Jika Admin yang membuka modal pinjam, tampilkan pilihan nama anggota
    const adminMemberWrap = document.getElementById('borrow-admin-member-wrap');
    if (state.user && state.user.role === 'admin') {
      adminMemberWrap.classList.remove('hidden');
      const mData = await apiFetch('/api/members');
      const select = document.getElementById('borrow-member-select');
      select.innerHTML = (mData.members || [])
        .map((m) => `<option value="${m.id_anggota}">${escapeHtml(m.kode_anggota)} — ${escapeHtml(m.nama_lengkap)} (${escapeHtml(m.nis_nim)})</option>`)
        .join('');
    } else {
      adminMemberWrap.classList.add('hidden');
    }

    document.getElementById('modal-book-detail').classList.remove('hidden');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   5. RIWAYAT PEMINJAMAN ANGGOTA
   ========================================================================== */

function statusBadgeHtml(status) {
  const map = {
    Menunggu: 'bg-amber-50 text-amber-700 border-amber-200',
    Dipinjam: 'bg-blue-50 text-blue-700 border-blue-200',
    Dikembalikan: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Terlambat: 'bg-rose-50 text-rose-700 border-rose-200',
    Ditolak: 'bg-slate-100 text-slate-600 border-slate-300',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-700';
  return `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold border ${cls}">${escapeHtml(status)}</span>`;
}

async function loadMemberLoans() {
  try {
    const data = await apiFetch('/api/loans');
    const tbody = document.getElementById('member-loans-tbody');
    const loans = data.loans || [];

    if (!loans.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400">Belum ada riwayat peminjaman buku.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = loans
      .map(
        (l) => `
        <tr class="hover:bg-slate-50">
          <td class="py-3.5 px-4 font-bold text-navy-900">${escapeHtml(l.kode_peminjaman)}</td>
          <td class="py-3.5 px-4">
            <p class="font-bold text-slate-900">${escapeHtml(l.judul_buku)}</p>
            <p class="text-xs text-slate-500">${escapeHtml(l.penulis)} • Rak: ${escapeHtml(l.lokasi_rak)}</p>
          </td>
          <td class="py-3.5 px-4 text-xs text-slate-600">${escapeHtml(l.tanggal_pinjam || 'Menunggu Persetujuan')}</td>
          <td class="py-3.5 px-4 text-xs font-semibold text-slate-800">${escapeHtml(l.batas_pengembalian)}</td>
          <td class="py-3.5 px-4">${statusBadgeHtml(l.status)}</td>
          <td class="py-3.5 px-4 text-xs font-bold ${l.estimasi_denda > 0 ? 'text-rose-600' : 'text-emerald-600'}">
            ${l.estimasi_denda > 0 ? `${formatRupiah(l.estimasi_denda)} (${l.estimasi_terlambat} hr)` : 'Rp 0'}
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   6. DASHBOARD ADMIN & GRAFIK STATISTIK
   ========================================================================== */

async function loadAdminDashboard() {
  try {
    const data = await apiFetch('/api/admin/dashboard');
    const c = data.counts || {};

    document.getElementById('adm-stat-buku').textContent = `${c.total_judul_buku || 0} Judul`;
    document.getElementById('adm-stat-stok-sub').textContent = `${c.total_stok_tersedia || 0} dari ${c.total_eksemplar_buku || 0} eksemplar tersedia`;
    document.getElementById('adm-stat-anggota').textContent = c.total_anggota || 0;
    document.getElementById('adm-stat-peminjaman').textContent = c.total_peminjaman || 0;
    document.getElementById('adm-stat-pengembalian').textContent = c.total_pengembalian || 0;
    document.getElementById('adm-stat-dipinjam').textContent = c.sedang_dipinjam || 0;
    document.getElementById('adm-stat-pending-sub').textContent = `${c.menunggu_persetujuan || 0} menunggu persetujuan`;

    const badgePending = document.getElementById('badge-pending-loans');
    if (c.menunggu_persetujuan > 0) {
      badgePending.textContent = c.menunggu_persetujuan;
      badgePending.classList.remove('hidden');
    } else {
      badgePending.classList.add('hidden');
    }

    // Tabel Buku yang Sedang Dipinjam
    const activeTbody = document.getElementById('adm-active-loans-tbody');
    const activeList = data.activeBorrowedBooks || [];
    if (!activeList.length) {
      activeTbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400">Tidak ada buku yang sedang dipinjam saat ini.</td></tr>`;
    } else {
      activeTbody.innerHTML = activeList
        .map(
          (item) => `
          <tr class="hover:bg-slate-50">
            <td class="py-3 px-3 font-bold text-navy-900">${escapeHtml(item.kode_peminjaman)}</td>
            <td class="py-3 px-3">
              <p class="font-bold text-slate-800">${escapeHtml(item.judul_buku)}</p>
              <p class="text-[11px] text-slate-400">${escapeHtml(item.lokasi_rak)}</p>
            </td>
            <td class="py-3 px-3">
              <p class="font-semibold text-slate-800">${escapeHtml(item.nama_lengkap)}</p>
              <p class="text-[11px] text-slate-400">${escapeHtml(item.nis_nim)}</p>
            </td>
            <td class="py-3 px-3 font-semibold text-slate-700">${escapeHtml(item.batas_pengembalian)}</td>
            <td class="py-3 px-3">${statusBadgeHtml(item.status)}</td>
            <td class="py-3 px-3 text-right space-x-1">
              ${
                item.status === 'Menunggu'
                  ? `<button type="button" data-quick-approve="${item.id_peminjaman}" class="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">Setujui</button>`
                  : `<button type="button" data-quick-return="${item.id_peminjaman}" class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">Kembalikan</button>`
              }
            </td>
          </tr>
        `
        )
        .join('');
    }

    // Aktivitas Terbaru
    const actWrap = document.getElementById('adm-activity-list');
    const acts = data.recentActivities || [];
    actWrap.innerHTML = acts
      .map(
        (a) => `
        <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-bold text-navy-900">${escapeHtml(a.aksi)}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              a.peran === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
            }">${escapeHtml(a.peran)}</span>
          </div>
          <p class="text-slate-600 leading-snug">${escapeHtml(a.keterangan)}</p>
          <p class="text-[10px] text-slate-400">${escapeHtml(a.created_at)}</p>
        </div>
      `
      )
      .join('');

    renderAdminCharts(data.chartByCategory || [], data.chartByStatus || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAdminCharts(byCategory, byStatus) {
  if (typeof Chart === 'undefined') return;

  const ctxCat = document.getElementById('chart-loans-category');
  if (ctxCat) {
    if (state.charts.category) state.charts.category.destroy();
    state.charts.category = new Chart(ctxCat, {
      type: 'bar',
      data: {
        labels: byCategory.map((c) => c.nama_kategori),
        datasets: [
          {
            label: 'Frekuensi Peminjaman Buku',
            data: byCategory.map((c) => Number(c.histori_pinjam || 0)),
            backgroundColor: '#1d4ed8',
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  const ctxStat = document.getElementById('chart-loans-status');
  if (ctxStat) {
    if (state.charts.status) state.charts.status.destroy();
    state.charts.status = new Chart(ctxStat, {
      type: 'doughnut',
      data: {
        labels: byStatus.map((s) => s.status),
        datasets: [
          {
            data: byStatus.map((s) => Number(s.jumlah || 0)),
            backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#64748b'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        },
      },
    });
  }
}

/* ==========================================================================
   7. MANAJEMEN DATA BUKU (ADMIN CRUD)
   ========================================================================== */

async function loadAdminBooks() {
  try {
    const q = document.getElementById('adm-book-search').value.trim();
    const data = await apiFetch(`/api/books${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    const books = data.books || [];
    const tbody = document.getElementById('adm-books-tbody');

    tbody.innerHTML = books
      .map(
        (b) => `
        <tr class="hover:bg-slate-50">
          <td class="py-3 px-3">
            <img src="${escapeHtml(fixCoverUrl(b.cover_buku))}" alt="Cover" class="w-10 h-14 object-cover rounded-lg shadow-sm" />
          </td>
          <td class="py-3 px-3">
            <p class="font-bold text-navy-900">${escapeHtml(b.kode_buku)}</p>
            <p class="text-[11px] text-slate-500">${escapeHtml(b.isbn)}</p>
          </td>
          <td class="py-3 px-3">
            <p class="font-bold text-slate-900">${escapeHtml(b.judul_buku)}</p>
            <p class="text-[11px] text-slate-500">${escapeHtml(b.penulis)}</p>
          </td>
          <td class="py-3 px-3">
            <p class="font-semibold text-slate-700">${escapeHtml(b.penerbit)}</p>
            <p class="text-[11px] text-slate-500">${escapeHtml(b.tahun_terbit)}</p>
          </td>
          <td class="py-3 px-3">
            <span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">${escapeHtml(b.nama_kategori)}</span>
            <p class="text-[11px] font-semibold text-slate-600 mt-1">${escapeHtml(b.lokasi_rak)}</p>
          </td>
          <td class="py-3 px-3">
            <span class="font-extrabold ${b.jumlah_stok > 0 ? 'text-emerald-600' : 'text-rose-600'}">${b.jumlah_stok}</span>
            <span class="text-slate-400">/ ${b.total_koleksi}</span>
          </td>
          <td class="py-3 px-3 text-right space-x-1 whitespace-nowrap">
            <a href="baca.html?id=${b.id_buku}" class="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold">📖 Baca</a>
            <button type="button" data-book-view="${b.id_buku}" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold">Detail</button>
            <button type="button" data-book-edit="${b.id_buku}" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold">Edit</button>
            <button type="button" data-book-delete="${b.id_buku}" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold">Hapus</button>
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/* ==========================================================================
   8. MANAJEMEN DATA ANGGOTA (ADMIN CRUD)
   ========================================================================== */

async function loadAdminMembers() {
  try {
    const q = document.getElementById('adm-member-search').value.trim();
    const data = await apiFetch(`/api/members${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    const members = data.members || [];
    const tbody = document.getElementById('adm-members-tbody');

    tbody.innerHTML = members
      .map(
        (m) => `
        <tr class="hover:bg-slate-50">
          <td class="py-3.5 px-3 font-bold text-navy-900">${escapeHtml(m.kode_anggota)}</td>
          <td class="py-3.5 px-3 font-bold text-slate-900">${escapeHtml(m.nama_lengkap)}</td>
          <td class="py-3.5 px-3 font-semibold text-slate-700">${escapeHtml(m.nis_nim)}</td>
          <td class="py-3.5 px-3">
            <p class="text-slate-800">${escapeHtml(m.email)}</p>
            <p class="text-[11px] text-slate-500">${escapeHtml(m.no_telepon)}</p>
          </td>
          <td class="py-3.5 px-3 max-w-xs truncate" title="${escapeHtml(m.alamat)}">${escapeHtml(m.alamat)}</td>
          <td class="py-3.5 px-3 text-slate-600">${escapeHtml(m.tanggal_pendaftaran)}</td>
          <td class="py-3.5 px-3 text-right space-x-1 whitespace-nowrap">
            <button type="button" data-member-edit='${JSON.stringify(m).replace(/'/g, '&#39;')}' class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold">Edit</button>
            <button type="button" data-member-delete="${m.id_anggota}" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold">Hapus</button>
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   9. TRANSAKSI PEMINJAMAN, PENGEMBALIAN & DENDA (ADMIN)
   ========================================================================== */

let cachedAdminLoans = [];

async function loadAdminLoans() {
  try {
    const q = document.getElementById('adm-loan-search').value.trim();
    const params = new URLSearchParams();
    if (state.adminLoanFilter !== 'all') params.set('status', state.adminLoanFilter);
    if (q) params.set('q', q);

    const data = await apiFetch(`/api/loans?${params.toString()}`);
    cachedAdminLoans = data.loans || [];
    const tbody = document.getElementById('adm-loans-tbody');

    if (!cachedAdminLoans.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-400">Tidak ada data transaksi peminjaman.</td></tr>`;
      return;
    }

    tbody.innerHTML = cachedAdminLoans
      .map((l) => {
        const dendaText =
          l.estimasi_denda > 0
            ? `<p class="font-bold text-rose-600">${formatRupiah(l.estimasi_denda)}</p><p class="text-[10px] text-slate-500">${l.estimasi_terlambat} hari • ${escapeHtml(l.status_bayar || 'Berjalan')}</p>`
            : `<span class="text-emerald-600 font-semibold">Rp 0</span>`;

        let actionBtns = '';
        if (l.status === 'Menunggu') {
          actionBtns = `
            <button type="button" data-loan-approve="${l.id_peminjaman}" class="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">Setujui</button>
            <button type="button" data-loan-reject="${l.id_peminjaman}" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold">Tolak</button>
          `;
        } else if (['Dipinjam', 'Terlambat'].includes(l.status)) {
          actionBtns = `
            <button type="button" data-loan-return="${l.id_peminjaman}" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Proses Kembali</button>
          `;
        } else if (l.id_denda && l.status_bayar === 'Belum Dibayar') {
          actionBtns = `
            <button type="button" data-fine-pay="${l.id_denda}" class="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold">Lunasi Denda</button>
          `;
        } else {
          actionBtns = `<span class="text-slate-400 text-[11px]">Selesai</span>`;
        }

        return `
          <tr class="hover:bg-slate-50">
            <td class="py-3.5 px-3 font-bold text-navy-900">${escapeHtml(l.kode_peminjaman)}</td>
            <td class="py-3.5 px-3">
              <p class="font-bold text-slate-900">${escapeHtml(l.nama_lengkap)}</p>
              <p class="text-[11px] text-slate-500">${escapeHtml(l.kode_anggota)} • ${escapeHtml(l.nis_nim)}</p>
            </td>
            <td class="py-3.5 px-3">
              <p class="font-bold text-slate-800">${escapeHtml(l.judul_buku)}</p>
              <p class="text-[11px] text-slate-500">${escapeHtml(l.kode_buku)} (${escapeHtml(l.lokasi_rak)})</p>
            </td>
            <td class="py-3.5 px-3">
              <p class="text-slate-700">Pinjam: <strong>${escapeHtml(l.tanggal_pinjam || '-')}</strong></p>
              <p class="text-slate-700">Batas: <strong>${escapeHtml(l.batas_pengembalian)}</strong></p>
            </td>
            <td class="py-3.5 px-3">${escapeHtml(l.tanggal_kembali || '-')}</td>
            <td class="py-3.5 px-3">${statusBadgeHtml(l.status)}</td>
            <td class="py-3.5 px-3">${dendaText}</td>
            <td class="py-3.5 px-3 text-right space-x-1 whitespace-nowrap">${actionBtns}</td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openReturnLoanModal(loanId) {
  const loan = cachedAdminLoans.find((l) => Number(l.id_peminjaman) === Number(loanId));
  const today = new Date().toISOString().slice(0, 10);

  document.getElementById('return-loan-id').value = loanId;
  document.getElementById('return-due-date').value = loan ? loan.batas_pengembalian : today;
  document.getElementById('ret-info-kode').textContent = loan ? loan.kode_peminjaman : `#${loanId}`;
  document.getElementById('ret-info-judul').textContent = loan ? loan.judul_buku : '-';
  document.getElementById('ret-info-anggota').textContent = loan ? loan.nama_lengkap : '-';
  document.getElementById('ret-info-batas').textContent = loan ? loan.batas_pengembalian : '-';
  document.getElementById('ret-tanggal-kembali').value = today;

  updateReturnFinePreview();
  document.getElementById('modal-return-loan').classList.remove('hidden');
}

function updateReturnFinePreview() {
  const dueStr = document.getElementById('return-due-date').value;
  const retStr = document.getElementById('ret-tanggal-kembali').value;
  const box = document.getElementById('ret-fine-box');
  const summary = document.getElementById('ret-fine-summary');

  if (!dueStr || !retStr) return;
  const due = new Date(`${dueStr}T00:00:00Z`);
  const ret = new Date(`${retStr}T00:00:00Z`);
  const days = Math.max(0, Math.floor((ret - due) / (1000 * 60 * 60 * 24)));
  const fine = days * 2000;

  if (days > 0) {
    box.className = 'p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1';
    summary.className = 'font-bold text-rose-700';
    summary.textContent = `Terlambat ${days} Hari — Total Denda Otomatis: ${formatRupiah(fine)}`;
  } else {
    box.className = 'p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1';
    summary.className = 'font-bold text-emerald-800';
    summary.textContent = 'Pengembalian Tepat Waktu — Denda Rp 0';
  }
}

/* ==========================================================================
   10. PUSAT LAPORAN & EKSPOR PDF / EXCEL
   ========================================================================== */

const REPORT_COLUMNS = {
  buku: [
    { key: 'kode_buku', label: 'Kode Buku' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'judul_buku', label: 'Judul Buku' },
    { key: 'penulis', label: 'Penulis' },
    { key: 'penerbit', label: 'Penerbit' },
    { key: 'tahun_terbit', label: 'Tahun' },
    { key: 'nama_kategori', label: 'Kategori' },
    { key: 'lokasi_rak', label: 'Rak' },
    { key: 'jumlah_stok', label: 'Stok Tersedia' },
    { key: 'total_koleksi', label: 'Total Koleksi' },
  ],
  anggota: [
    { key: 'kode_anggota', label: 'ID Anggota' },
    { key: 'nama_lengkap', label: 'Nama Lengkap' },
    { key: 'nis_nim', label: 'NIS / NIM' },
    { key: 'email', label: 'Email' },
    { key: 'no_telepon', label: 'No. Telepon' },
    { key: 'alamat', label: 'Alamat' },
    { key: 'tanggal_pendaftaran', label: 'Tgl Daftar' },
    { key: 'total_pinjam', label: 'Total Pinjam' },
  ],
  peminjaman: [
    { key: 'kode_peminjaman', label: 'Kode Transaksi' },
    { key: 'kode_anggota', label: 'ID Anggota' },
    { key: 'nama_lengkap', label: 'Nama Peminjam' },
    { key: 'judul_buku', label: 'Judul Buku' },
    { key: 'tanggal_pinjam', label: 'Tgl Pinjam' },
    { key: 'batas_pengembalian', label: 'Batas Kembali' },
    { key: 'status', label: 'Status' },
  ],
  pengembalian: [
    { key: 'kode_peminjaman', label: 'Kode Transaksi' },
    { key: 'nama_lengkap', label: 'Nama Anggota' },
    { key: 'judul_buku', label: 'Judul Buku' },
    { key: 'tanggal_pinjam', label: 'Tgl Pinjam' },
    { key: 'batas_pengembalian', label: 'Batas Kembali' },
    { key: 'tanggal_kembali', label: 'Tgl Dikembalikan' },
    { key: 'terlambat_hari', label: 'Terlambat (Hari)' },
    { key: 'total_denda', label: 'Denda (Rp)' },
  ],
  keterlambatan: [
    { key: 'kode_peminjaman', label: 'Kode Transaksi' },
    { key: 'kode_anggota', label: 'ID Anggota' },
    { key: 'nama_lengkap', label: 'Nama Anggota' },
    { key: 'no_telepon', label: 'Telepon' },
    { key: 'judul_buku', label: 'Judul Buku' },
    { key: 'batas_pengembalian', label: 'Batas Kembali' },
    { key: 'hari_terlambat', label: 'Terlambat (Hari)' },
    { key: 'nominal_denda', label: 'Denda (Rp)' },
  ],
  denda: [
    { key: 'kode_peminjaman', label: 'Kode Transaksi' },
    { key: 'nama_lengkap', label: 'Nama Anggota' },
    { key: 'judul_buku', label: 'Judul Buku' },
    { key: 'tanggal_kembali', label: 'Tgl Kembali' },
    { key: 'jumlah_hari', label: 'Terlambat (Hari)' },
    { key: 'tarif_per_hari', label: 'Tarif / Hari' },
    { key: 'total_denda', label: 'Total Denda (Rp)' },
    { key: 'status_bayar', label: 'Status Bayar' },
  ],
};

async function loadAdminReport(type = 'buku') {
  try {
    state.currentReportType = type;
    document.querySelectorAll('.report-tab-btn').forEach((btn) => {
      const active = btn.dataset.reportType === type;
      btn.className = active
        ? 'report-tab-btn py-2.5 px-3 rounded-xl text-xs font-bold bg-navy-900 text-white'
        : 'report-tab-btn py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200';
    });

    const data = await apiFetch(`/api/admin/reports/${type}`);
    state.currentReportData = data;

    document.getElementById('report-title-heading').textContent = data.title;
    document.getElementById('report-date-label').textContent = data.generatedAt;

    const cols = REPORT_COLUMNS[type] || [];
    const thead = document.getElementById('report-thead');
    const tbody = document.getElementById('report-tbody');

    thead.innerHTML = `
      <tr>
        <th class="py-3 px-3">No</th>
        ${cols.map((c) => `<th class="py-3 px-3">${escapeHtml(c.label)}</th>`).join('')}
      </tr>
    `;

    const rows = data.rows || [];
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${cols.length + 1}" class="py-8 text-center text-slate-400">Belum ada data pada laporan ini.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map(
        (r, idx) => `
        <tr class="hover:bg-slate-50">
          <td class="py-2.5 px-3 font-semibold">${idx + 1}</td>
          ${cols.map((c) => `<td class="py-2.5 px-3">${escapeHtml(r[c.key] ?? '-')}</td>`).join('')}
        </tr>
      `
      )
      .join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function exportReportToPDF() {
  const { title, generatedAt, rows } = state.currentReportData;
  const cols = REPORT_COLUMNS[state.currentReportType] || [];

  if (!window.jspdf || !window.jspdf.jsPDF) {
    window.print();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(15);
  doc.text(`BookBase Digital Library — ${title}`, 40, 40);
  doc.setFontSize(10);
  doc.text(`Database: db_perpustakaan | Tanggal Cetak: ${generatedAt}`, 40, 58);

  const head = [['No', ...cols.map((c) => c.label)]];
  const body = (rows || []).map((r, i) => [i + 1, ...cols.map((c) => String(r[c.key] ?? '-'))]);

  doc.autoTable({
    startY: 75,
    head,
    body,
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [7, 19, 48], textColor: 255 },
  });

  doc.save(`Laporan_${state.currentReportType}_${generatedAt}.pdf`);
  showToast('File laporan PDF berhasil diunduh!');
}

function exportReportToExcel() {
  const { title, generatedAt, rows } = state.currentReportData;
  const cols = REPORT_COLUMNS[state.currentReportType] || [];

  const formatted = (rows || []).map((r, idx) => {
    const obj = { No: idx + 1 };
    cols.forEach((c) => {
      obj[c.label] = r[c.key] ?? '-';
    });
    return obj;
  });

  if (typeof XLSX !== 'undefined') {
    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `Laporan_${state.currentReportType}_${generatedAt}.xlsx`);
    showToast(`File Excel (${title}) berhasil diunduh!`);
    return;
  }

  // Fallback CSV apabila CDN diblokir
  const headers = ['No', ...cols.map((c) => c.label)].join(',');
  const csvRows = formatted.map((row) =>
    Object.values(row)
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[headers, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Laporan_${state.currentReportType}_${generatedAt}.csv`;
  link.click();
}

/* ==========================================================================
   11. EVENT LISTENERS & INISIALISASI APLIKASI
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cek sesi user saat ini + ambil CSRF token
  try {
    const authData = await apiFetch('/api/auth/me');
    state.csrfToken = authData.csrfToken || getCookie('bb_csrf');
    state.user = authData.user || null;
    updateAuthUI();
  } catch {
    // Abaikan jika belum login
  }

  // 2. Muat data Beranda & buka tab sesuai hash URL (misal: #admin-dashboard setelah login dari login.html)
  await loadHomeMeta();
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && document.getElementById(`view-${initialHash}`)) {
    switchView(initialHash);
  }

  // 3. Klik tombol navigasi (Sidebar & Topbar)
  document.body.addEventListener('click', async (e) => {
    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) {
      e.preventDefault();
      switchView(navBtn.dataset.nav);
      return;
    }

    // Klik tutup modal
    const closeBtn = e.target.closest('[data-close-modal]');
    if (closeBtn) {
      document.getElementById(closeBtn.dataset.closeModal)?.classList.add('hidden');
      return;
    }

    // Klik pill kategori di Beranda
    const homeCatBtn = e.target.closest('[data-home-cat]');
    if (homeCatBtn) {
      state.homeCategorySlug = homeCatBtn.dataset.homeCat;
      renderHomeCategoryPills();
      renderHomeNewestGrid();
      return;
    }

    // Klik kartu buku atau tombol Baca / Detail / Pinjam
    const bookActionBtn = e.target.closest('[data-action]');
    if (bookActionBtn) {
      if (bookActionBtn.dataset.action === 'read') {
        e.stopPropagation();
        return; // Biarkan link <a href="baca.html?id=..."> berjalan normal
      }
      e.stopPropagation();
      const id = Number(bookActionBtn.dataset.id);
      if (bookActionBtn.dataset.action === 'borrow' && !state.user) {
        showToast('Silakan login terlebih dahulu untuk mengajukan peminjaman buku.', 'warning');
        switchView('login');
        return;
      }
      openBookDetailModal(id);
      return;
    }

    const bookCard = e.target.closest('.book-card');
    if (bookCard) {
      const id = Number(bookCard.dataset.bookId);
      const found =
        state.books.find((b) => Number(b.id_buku) === id) ||
        state.popularBooks.find((b) => Number(b.id_buku) === id) ||
        state.newestBooks.find((b) => Number(b.id_buku) === id);
      if (found) updateRightInspector(found);
      return;
    }

    // Aksi CRUD Buku Admin
    const viewBookBtn = e.target.closest('[data-book-view]');
    if (viewBookBtn) {
      openBookDetailModal(Number(viewBookBtn.dataset.bookView));
      return;
    }

    const editBookBtn = e.target.closest('[data-book-edit]');
    if (editBookBtn) {
      const id = Number(editBookBtn.dataset.bookEdit);
      const data = await apiFetch(`/api/books/${id}`);
      const b = data.book;
      if (!b) return;
      document.getElementById('modal-book-form-title').textContent = `Edit Data Buku (${b.kode_buku})`;
      document.getElementById('book-form-id').value = b.id_buku;
      document.getElementById('bf-judul').value = b.judul_buku;
      document.getElementById('bf-isbn').value = b.isbn;
      document.getElementById('bf-penulis').value = b.penulis;
      document.getElementById('bf-penerbit').value = b.penerbit;
      document.getElementById('bf-tahun').value = b.tahun_terbit;
      document.getElementById('bf-kategori').value = b.id_kategori;
      document.getElementById('bf-rak').value = b.lokasi_rak;
      document.getElementById('bf-stok').value = b.jumlah_stok;
      document.getElementById('bf-halaman').value = b.halaman || 250;
      document.getElementById('bf-deskripsi').value = b.deskripsi;
      document.getElementById('bf-cover-file').value = '';
      document.getElementById('modal-crud-book').classList.remove('hidden');
      return;
    }

    const delBookBtn = e.target.closest('[data-book-delete]');
    if (delBookBtn) {
      const id = Number(delBookBtn.dataset.bookDelete);
      if (!confirm('Apakah Anda yakin ingin menghapus buku ini dari database?')) return;
      try {
        const res = await apiFetch(`/api/books/${id}`, { method: 'DELETE' });
        showToast(res.message);
        loadAdminBooks();
        loadHomeMeta();
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    // Aksi CRUD Anggota Admin
    const editMemberBtn = e.target.closest('[data-member-edit]');
    if (editMemberBtn) {
      const m = JSON.parse(editMemberBtn.dataset.memberEdit);
      document.getElementById('modal-member-form-title').textContent = `Edit Anggota (${m.kode_anggota})`;
      document.getElementById('member-form-id').value = m.id_anggota;
      document.getElementById('mf-nama').value = m.nama_lengkap;
      document.getElementById('mf-nis').value = m.nis_nim;
      document.getElementById('mf-telepon').value = m.no_telepon;
      document.getElementById('mf-email').value = m.email;
      document.getElementById('mf-tanggal').value = m.tanggal_pendaftaran;
      document.getElementById('mf-alamat').value = m.alamat;
      document.getElementById('mf-password').value = '';
      document.getElementById('modal-crud-member').classList.remove('hidden');
      return;
    }

    const delMemberBtn = e.target.closest('[data-member-delete]');
    if (delMemberBtn) {
      const id = Number(delMemberBtn.dataset.memberDelete);
      if (!confirm('Hapus data anggota ini dari database?')) return;
      try {
        const res = await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
        showToast(res.message);
        loadAdminMembers();
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    // Aksi Persetujuan, Penolakan, Pengembalian & Pelunasan Denda
    const approveBtn = e.target.closest('[data-loan-approve], [data-quick-approve]');
    if (approveBtn) {
      const id = Number(approveBtn.dataset.loanApprove || approveBtn.dataset.quickApprove);
      try {
        const res = await apiFetch(`/api/loans/${id}/approve`, { method: 'POST', body: JSON.stringify({}) });
        showToast(res.message);
        if (state.currentView === 'admin-dashboard') loadAdminDashboard();
        if (state.currentView === 'admin-transaksi') loadAdminLoans();
        loadHomeMeta();
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    const rejectBtn = e.target.closest('[data-loan-reject]');
    if (rejectBtn) {
      const id = Number(rejectBtn.dataset.loanReject);
      const alasan = prompt('Masukkan alasan penolakan peminjaman:', 'Stok buku sedang dialokasikan untuk reservasi lain');
      if (alasan === null) return;
      try {
        const res = await apiFetch(`/api/loans/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ alasan }),
        });
        showToast(res.message);
        loadAdminLoans();
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    const returnBtn = e.target.closest('[data-loan-return], [data-quick-return]');
    if (returnBtn) {
      const id = Number(returnBtn.dataset.loanReturn || returnBtn.dataset.quickReturn);
      if (!cachedAdminLoans.length) {
        const d = await apiFetch('/api/loans');
        cachedAdminLoans = d.loans || [];
      }
      openReturnLoanModal(id);
      return;
    }

    const payFineBtn = e.target.closest('[data-fine-pay]');
    if (payFineBtn) {
      const id = Number(payFineBtn.dataset.finePay);
      try {
        const res = await apiFetch(`/api/fines/${id}/pay`, { method: 'POST', body: JSON.stringify({}) });
        showToast(res.message);
        loadAdminLoans();
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    // Filter status transaksi peminjaman
    const loanFilterBtn = e.target.closest('[data-loan-filter]');
    if (loanFilterBtn) {
      state.adminLoanFilter = loanFilterBtn.dataset.loanFilter;
      document.querySelectorAll('.loan-filter-btn').forEach((b) => {
        const active = b.dataset.loanFilter === state.adminLoanFilter;
        b.className = active
          ? 'loan-filter-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-navy-900 text-white'
          : 'loan-filter-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200';
      });
      loadAdminLoans();
      return;
    }

    // Tab Laporan
    const reportTabBtn = e.target.closest('[data-report-type]');
    if (reportTabBtn) {
      loadAdminReport(reportTabBtn.dataset.reportType);
      return;
    }
  });

  // Toggle Sidebar di Mobile
  document.getElementById('btn-mobile-sidebar')?.addEventListener('click', () => {
    document.getElementById('app-sidebar')?.classList.toggle('-translate-x-full');
  });

  // Tombol di Panel Inspektor Kanan
  document.getElementById('insp-btn-borrow')?.addEventListener('click', () => {
    if (!state.selectedBook) return;
    if (!state.user) {
      showToast('Silakan login sebagai Anggota terlebih dahulu untuk meminjam buku.', 'warning');
      switchView('login');
      return;
    }
    openBookDetailModal(state.selectedBook.id_buku);
  });

  document.getElementById('insp-btn-detail-modal')?.addEventListener('click', () => {
    if (state.selectedBook) openBookDetailModal(state.selectedBook.id_buku);
  });

  // Pencarian Cepat dari Header & Hero Banner
  document.getElementById('hero-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('hero-search-input').value.trim();
    document.getElementById('catalog-search').value = q;
    switchView('katalog');
  });

  document.getElementById('global-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('catalog-search').value = e.target.value.trim();
      switchView('katalog');
    }
  });

  // Filter Katalog Real-Time
  ['catalog-search', 'catalog-filter-category', 'catalog-filter-year', 'catalog-filter-sort'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => loadCatalogBooks());
    el.addEventListener('change', () => loadCatalogBooks());
  });

  // Pencarian Admin Buku, Anggota, Transaksi
  document.getElementById('adm-book-search')?.addEventListener('input', () => loadAdminBooks());
  document.getElementById('adm-member-search')?.addEventListener('input', () => loadAdminMembers());
  document.getElementById('adm-loan-search')?.addEventListener('input', () => loadAdminLoans());

  // Tab Login / Registrasi / Lupa Password
  document.querySelectorAll('.auth-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.authTab;
      document.querySelectorAll('.auth-tab-btn').forEach((b) => {
        const active = b.dataset.authTab === tab;
        b.className = active
          ? 'auth-tab-btn pb-3 px-3 text-sm font-bold border-b-2 border-blue-600 text-blue-600'
          : 'auth-tab-btn pb-3 px-3 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800';
      });
      document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
      document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
      document.getElementById('form-forgot').classList.toggle('hidden', tab !== 'forgot');
    });
  });

  // Tombol Isi Cepat Akun Demo Admin & Anggota
  document.getElementById('btn-fill-admin')?.addEventListener('click', () => {
    document.querySelector('[data-auth-tab="login"]').click();
    document.getElementById('login-email').value = 'admin@perpustakaan.id';
    document.getElementById('login-password').value = 'admin123';
    showToast('Kredensial Admin diisi. Klik "Masuk ke Sistem".');
  });

  document.getElementById('btn-fill-member')?.addEventListener('click', () => {
    document.querySelector('[data-auth-tab="login"]').click();
    document.getElementById('login-email').value = 'anggota@perpustakaan.id';
    document.getElementById('login-password').value = 'anggota123';
    showToast('Kredensial Anggota diisi. Klik "Masuk ke Sistem".');
  });

  // Submit Login
  document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      state.user = res.user;
      updateAuthUI();
      showToast(res.message);
      switchView(state.user.role === 'admin' ? 'admin-dashboard' : 'beranda');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Submit Registrasi Anggota
  document.getElementById('form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nama_lengkap: document.getElementById('reg-nama').value.trim(),
        nis_nim: document.getElementById('reg-nis').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        no_telepon: document.getElementById('reg-telepon').value.trim(),
        alamat: document.getElementById('reg-alamat').value.trim(),
        password: document.getElementById('reg-password').value,
      };
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      state.user = res.user;
      updateAuthUI();
      showToast(res.message);
      switchView('beranda');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Submit Lupa Password
  document.getElementById('form-forgot')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        email: document.getElementById('forgot-email').value.trim(),
        nis_nim: document.getElementById('forgot-nis').value.trim(),
        new_password: document.getElementById('forgot-new-password').value,
      };
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast(res.message);
      document.querySelector('[data-auth-tab="login"]').click();
      document.getElementById('login-email').value = payload.email;
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Tombol Logout
  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
      state.user = null;
      updateAuthUI();
      showToast('Anda telah keluar dari sesi aplikasi.');
      switchView('beranda');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  document.getElementById('btn-top-logout')?.addEventListener('click', handleLogout);
  document.getElementById('sidebar-btn-logout')?.addEventListener('click', handleLogout);

  // Klik profil user di kanan atas
  document.getElementById('btn-user-dashboard')?.addEventListener('click', () => {
    if (!state.user) return switchView('login');
    switchView(state.user.role === 'admin' ? 'admin-dashboard' : 'riwayat-anggota');
  });

  // Submit Form Pengajuan Peminjaman Buku
  document.getElementById('form-borrow-book')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.user) {
      document.getElementById('modal-book-detail').classList.add('hidden');
      showToast('Silakan login terlebih dahulu untuk meminjam buku.', 'warning');
      return switchView('login');
    }
    try {
      const payload = {
        id_buku: Number(document.getElementById('borrow-book-id').value),
        durasi_hari: Number(document.getElementById('borrow-duration').value),
        catatan: document.getElementById('borrow-notes').value.trim(),
      };
      if (state.user.role === 'admin') {
        payload.id_anggota = Number(document.getElementById('borrow-member-select').value);
        payload.langsung_setujui = true;
      }
      const res = await apiFetch('/api/loans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast(res.message);
      document.getElementById('modal-book-detail').classList.add('hidden');
      await loadHomeMeta();
      if (state.user.role === 'admin') {
        switchView('admin-transaksi');
      } else {
        switchView('riwayat-anggota');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Buka Modal Tambah Buku Baru
  document.getElementById('btn-open-add-book')?.addEventListener('click', () => {
    document.getElementById('modal-book-form-title').textContent = 'Tambah Data Buku Baru';
    document.getElementById('form-crud-book').reset();
    document.getElementById('book-form-id').value = '';
    document.getElementById('modal-crud-book').classList.remove('hidden');
  });

  // Submit Tambah / Edit Buku (Dengan Upload Cover Base64)
  document.getElementById('form-crud-book')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const id = document.getElementById('book-form-id').value;
      const fileInput = document.getElementById('bf-cover-file');
      let cover_base64 = null;
      if (fileInput.files && fileInput.files[0]) {
        cover_base64 = await fileToBase64(fileInput.files[0]);
      }

      const payload = {
        judul_buku: document.getElementById('bf-judul').value.trim(),
        isbn: document.getElementById('bf-isbn').value.trim(),
        penulis: document.getElementById('bf-penulis').value.trim(),
        penerbit: document.getElementById('bf-penerbit').value.trim(),
        tahun_terbit: Number(document.getElementById('bf-tahun').value),
        id_kategori: Number(document.getElementById('bf-kategori').value),
        lokasi_rak: document.getElementById('bf-rak').value.trim(),
        jumlah_stok: Number(document.getElementById('bf-stok').value),
        halaman: Number(document.getElementById('bf-halaman').value || 250),
        deskripsi: document.getElementById('bf-deskripsi').value.trim(),
        ...(cover_base64 ? { cover_base64 } : {}),
      };

      const res = await apiFetch(id ? `/api/books/${id}` : '/api/books', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      showToast(res.message);
      document.getElementById('modal-crud-book').classList.add('hidden');
      loadAdminBooks();
      loadHomeMeta();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Buka Modal Tambah Anggota Baru
  document.getElementById('btn-open-add-member')?.addEventListener('click', () => {
    document.getElementById('modal-member-form-title').textContent = 'Tambah Anggota Perpustakaan';
    document.getElementById('form-crud-member').reset();
    document.getElementById('member-form-id').value = '';
    document.getElementById('mf-tanggal').value = new Date().toISOString().slice(0, 10);
    document.getElementById('modal-crud-member').classList.remove('hidden');
  });

  // Submit Tambah / Edit Anggota
  document.getElementById('form-crud-member')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const id = document.getElementById('member-form-id').value;
      const payload = {
        nama_lengkap: document.getElementById('mf-nama').value.trim(),
        nis_nim: document.getElementById('mf-nis').value.trim(),
        no_telepon: document.getElementById('mf-telepon').value.trim(),
        email: document.getElementById('mf-email').value.trim(),
        tanggal_pendaftaran: document.getElementById('mf-tanggal').value,
        alamat: document.getElementById('mf-alamat').value.trim(),
        password: document.getElementById('mf-password').value,
      };

      const res = await apiFetch(id ? `/api/members/${id}` : '/api/members', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      showToast(res.message);
      document.getElementById('modal-crud-member').classList.add('hidden');
      loadAdminMembers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Tombol Buat Transaksi Peminjaman dari Halaman Sirkulasi Admin
  document.getElementById('btn-open-admin-loan')?.addEventListener('click', () => {
    if (state.popularBooks.length > 0) {
      openBookDetailModal(state.popularBooks[0].id_buku);
    } else {
      switchView('katalog');
    }
  });

  // Kalkulasi Denda Saat Tanggal Kembali Diubah di Modal Pengembalian
  document.getElementById('ret-tanggal-kembali')?.addEventListener('change', updateReturnFinePreview);

  // Submit Proses Pengembalian Buku
  document.getElementById('form-return-loan')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const id = Number(document.getElementById('return-loan-id').value);
      const payload = {
        tanggal_kembali: document.getElementById('ret-tanggal-kembali').value,
        kondisi_kembali: document.getElementById('ret-kondisi').value,
        bayar_lunas: document.getElementById('ret-bayar-lunas').checked,
      };
      const res = await apiFetch(`/api/loans/${id}/return`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast(res.message);
      document.getElementById('modal-return-loan').classList.add('hidden');
      if (state.currentView === 'admin-dashboard') loadAdminDashboard();
      if (state.currentView === 'admin-transaksi') loadAdminLoans();
      loadHomeMeta();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Tombol Ekspor Laporan PDF, Excel & Cetak
  document.getElementById('btn-export-pdf')?.addEventListener('click', exportReportToPDF);
  document.getElementById('btn-export-excel')?.addEventListener('click', exportReportToExcel);
  document.getElementById('btn-print-report')?.addEventListener('click', () => window.print());
});
