/**
 * BookBase Digital Library — Dedicated Login, Registration & Forgot Password Page
 * Terhubung langsung ke Backend Node.js & Database MySQL (`db_perpustakaan`)
 */

const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
const IS_LIVE_SERVER = !IS_FILE_PROTOCOL && ['5500', '5501', '5173'].includes(window.location.port);
const API_BASE = IS_FILE_PROTOCOL || IS_LIVE_SERVER ? 'http://localhost:3000' : '';

if (IS_FILE_PROTOCOL || IS_LIVE_SERVER) {
  window.location.replace('http://localhost:3000/login.html');
}

let csrfToken = '';

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : '';
}

function showAlert(message, type = 'error') {
  const box = document.getElementById('auth-alert');
  if (!box) return;
  box.classList.remove('hidden');

  if (type === 'success') {
    box.className = 'mb-5 p-4 rounded-2xl text-xs font-bold border bg-emerald-50 border-emerald-200 text-emerald-800';
  } else if (type === 'info') {
    box.className = 'mb-5 p-4 rounded-2xl text-xs font-bold border bg-blue-50 border-blue-200 text-blue-800';
  } else {
    box.className = 'mb-5 p-4 rounded-2xl text-xs font-bold border bg-rose-50 border-rose-200 text-rose-700';
  }
  box.textContent = message;
}

function hideAlert() {
  document.getElementById('auth-alert')?.classList.add('hidden');
}

async function apiRequest(url, options = {}) {
  const token = csrfToken || getCookie('bb_csrf');
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-CSRF-Token': token } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (data.csrfToken) csrfToken = data.csrfToken;
  if (!res.ok) {
    throw new Error(data.error || `Terjadi kesalahan (${res.status})`);
  }
  return data;
}

function switchAuthTab(tabName) {
  hideAlert();
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.className = active
      ? 'tab-btn pb-3 px-3 text-sm font-extrabold border-b-2 border-blue-600 text-blue-600 transition'
      : 'tab-btn pb-3 px-3 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition';
  });

  document.getElementById('form-page-login').classList.toggle('hidden', tabName !== 'login');
  document.getElementById('form-page-register').classList.toggle('hidden', tabName !== 'register');
  document.getElementById('form-page-forgot').classList.toggle('hidden', tabName !== 'forgot');
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Ambil CSRF token & cek apakah pengguna sudah login
  try {
    const me = await apiRequest('/api/auth/me');
    csrfToken = me.csrfToken || getCookie('bb_csrf');

    // Mendukung parameter URL ?tab=register atau ?tab=forgot
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'register') switchAuthTab('register');
    if (params.get('tab') === 'forgot') switchAuthTab('forgot');

    if (me.authenticated && me.user) {
      showAlert(
        `Anda sudah login sebagai ${me.user.nama} (${me.user.role.toUpperCase()}). Mengalihkan ke halaman utama...`,
        'success'
      );
      setTimeout(() => {
        window.location.href =
          me.user.role === 'admin' ? 'index.html#admin-dashboard' : 'index.html#beranda';
      }, 900);
    }
  } catch {
    // Belum login
  }

  // 2. Navigasi Tab (Login / Registrasi / Lupa Password)
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });

  document.getElementById('link-to-register')?.addEventListener('click', () => switchAuthTab('register'));
  document.getElementById('link-to-forgot')?.addEventListener('click', () => switchAuthTab('forgot'));

  // 3. Tombol Lihat / Sembunyikan Password
  document.getElementById('btn-toggle-pass')?.addEventListener('click', (e) => {
    const input = document.getElementById('login-password');
    if (input.type === 'password') {
      input.type = 'text';
      e.target.textContent = 'Sembunyikan';
    } else {
      input.type = 'password';
      e.target.textContent = 'Lihat';
    }
  });

  // 4. Tombol Pengujian Cepat (Isi Otomatis Admin & Anggota)
  document.getElementById('btn-quick-admin')?.addEventListener('click', () => {
    switchAuthTab('login');
    document.getElementById('login-email').value = 'admin@perpustakaan.id';
    document.getElementById('login-password').value = 'admin123';
    showAlert('Akun Administrator berhasil diisi. Klik tombol "Masuk Sekarang".', 'info');
  });

  document.getElementById('btn-quick-member')?.addEventListener('click', () => {
    switchAuthTab('login');
    document.getElementById('login-email').value = 'anggota@perpustakaan.id';
    document.getElementById('login-password').value = 'anggota123';
    showAlert('Akun Anggota berhasil diisi. Klik tombol "Masuk Sekarang".', 'info');
  });

  // 5. Submit Form Login
  document.getElementById('form-page-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    const btn = document.getElementById('btn-submit-login');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>Memverifikasi...</span>';

    try {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      showAlert(`${res.message} Mengalihkan ke dashboard...`, 'success');
      setTimeout(() => {
        window.location.href =
          res.user.role === 'admin' ? 'index.html#admin-dashboard' : 'index.html#beranda';
      }, 600);
    } catch (err) {
      showAlert(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });

  // 6. Submit Form Registrasi Anggota
  document.getElementById('form-page-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    try {
      const payload = {
        nama_lengkap: document.getElementById('reg-nama').value.trim(),
        nis_nim: document.getElementById('reg-nis').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        no_telepon: document.getElementById('reg-telepon').value.trim(),
        alamat: document.getElementById('reg-alamat').value.trim(),
        password: document.getElementById('reg-password').value,
      };

      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showAlert(`${res.message} Mengalihkan ke Beranda Perpustakaan...`, 'success');
      setTimeout(() => {
        window.location.href = 'index.html#beranda';
      }, 800);
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  // 7. Submit Form Lupa Password
  document.getElementById('form-page-forgot')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    try {
      const payload = {
        email: document.getElementById('forgot-email').value.trim(),
        nis_nim: document.getElementById('forgot-nis').value.trim(),
        new_password: document.getElementById('forgot-new-password').value,
      };

      const res = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      switchAuthTab('login');
      document.getElementById('login-email').value = payload.email;
      showAlert(res.message, 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });
});
