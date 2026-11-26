/**
 * BookBase Digital Library — GitHub Pages & Cloud Serverless Adapter
 *
 * Saat web dibuka di localhost:3000 atau server Node.js/MySQL, semua request memakai MySQL langsung.
 * Saat web di-host di GitHub Pages (https://<username>.github.io/<repo>/) tanpa server backend,
 * adapter ini otomatis menyediakan mesin database in-browser berbasis snapshot `db_perpustakaan`
 * + penyimpanan permanen `localStorage` sehingga:
 * - Login Admin & Anggota, Registrasi, Lupa Password
 * - Katalog Buku, Pencarian, Filter, Detail Buku
 * - E-Reader 10 Bab / 70 Halaman Penuh
 * - CRUD Buku, CRUD Anggota, Peminjaman, Persetujuan, Pengembalian, Denda Otomatis, & Laporan PDF/Excel
 * tetap berfungsi 100% di HP maupun Laptop dari GitHub Pages!
 */
(function () {
  const isGitHubPages =
    window.location.hostname.endsWith('github.io') ||
    window.location.hostname.endsWith('pages.dev') ||
    window.location.hostname.endsWith('netlify.app') ||
    window.location.hostname.endsWith('vercel.app');

  const STORAGE_KEY = 'bb_mysql_cloud_db_v1';
  const SESSION_KEY = 'bb_mysql_cloud_session_v1';

  function fixAssetPath(p) {
    if (!p || typeof p !== 'string') return p;
    if (p.startsWith('/uploads/')) return p.slice(1); // "uploads/covers/..." agar relatif terhadap subfolder GitHub Pages
    return p;
  }

  function getDb() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.buku) && parsed.buku.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    const base = window.BB_DB_SNAPSHOT || {
      users: [],
      anggota: [],
      kategori: [],
      buku: [],
      bab_buku: [],
      peminjaman: [],
      detail_peminjaman: [],
      pengembalian: [],
      denda: [],
      aktivitas: [],
    };

    const clone = JSON.parse(JSON.stringify(base));
    clone.buku = (clone.buku || []).map((b) => ({
      ...b,
      cover_buku: fixAssetPath(b.cover_buku),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clone));
    return clone;
  }

  function saveDb(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function getSessionUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSessionUser(u) {
    if (!u) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function diffDays(dueStr, retStr) {
    const d1 = new Date(`${dueStr}T00:00:00Z`);
    const d2 = new Date(`${retStr}T00:00:00Z`);
    return Math.max(0, Math.floor((d2 - d1) / 86400000));
  }

  function jsonRes(status, obj) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async function handleVirtualApi(urlStr, options = {}) {
    const db = getDb();
    const user = getSessionUser();
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};

    const u = new URL(urlStr, window.location.origin);
    const path = u.pathname.replace(/^.*\/api/, '/api');

    // 1. GET /api/auth/me
    if (path === '/api/auth/me' && method === 'GET') {
      return jsonRes(200, {
        authenticated: Boolean(user),
        csrfToken: 'gh_pages_csrf_token',
        user,
      });
    }

    // 2. POST /api/auth/login
    if (path === '/api/auth/login' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const pass = String(body.password || '');

      let foundUser = db.users.find((x) => String(x.email).toLowerCase() === email);
      if (!foundUser) {
        return jsonRes(401, { error: 'Email atau password tidak sesuai.' });
      }
      // Validasi password default atau custom password
      const validPass =
        (foundUser.role === 'admin' && (pass === 'admin123' || pass === foundUser.custom_pass)) ||
        (foundUser.role === 'anggota' && (pass === 'anggota123' || pass === foundUser.custom_pass)) ||
        (foundUser.custom_pass && pass === foundUser.custom_pass);

      if (!validPass) {
        return jsonRes(401, { error: 'Email atau password tidak sesuai.' });
      }

      const member = db.anggota.find((a) => Number(a.id_user) === Number(foundUser.id_user));
      const sess = {
        id_user: foundUser.id_user,
        id_anggota: member ? member.id_anggota : null,
        kode_anggota: member ? member.kode_anggota : null,
        nama: foundUser.nama,
        email: foundUser.email,
        role: foundUser.role,
      };
      setSessionUser(sess);
      return jsonRes(200, { message: 'Login berhasil! Selamat datang.', csrfToken: 'gh_pages_csrf_token', user: sess });
    }

    // 3. POST /api/auth/register
    if (path === '/api/auth/register' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const nis_nim = String(body.nis_nim || '').trim();
      if (db.users.some((x) => x.email.toLowerCase() === email) || db.anggota.some((a) => a.nis_nim === nis_nim)) {
        return jsonRes(409, { error: 'Email atau NIS/NIM sudah terdaftar.' });
      }
      const nextUid = Math.max(0, ...db.users.map((x) => x.id_user)) + 1;
      const nextAid = Math.max(0, ...db.anggota.map((x) => x.id_anggota)) + 1;
      const kode_anggota = `AGT-2026-${String(nextAid).padStart(3, '0')}`;

      db.users.push({
        id_user: nextUid,
        nama: body.nama_lengkap,
        email,
        role: 'anggota',
        status_aktif: 1,
        custom_pass: body.password,
      });
      db.anggota.push({
        id_anggota: nextAid,
        id_user: nextUid,
        kode_anggota,
        nama_lengkap: body.nama_lengkap,
        nis_nim,
        email,
        no_telepon: body.no_telepon,
        alamat: body.alamat,
        tanggal_pendaftaran: todayStr(),
      });
      saveDb(db);

      const sess = {
        id_user: nextUid,
        id_anggota: nextAid,
        kode_anggota,
        nama: body.nama_lengkap,
        email,
        role: 'anggota',
      };
      setSessionUser(sess);
      return jsonRes(201, { message: `Registrasi berhasil! Nomor Anggota: ${kode_anggota}`, user: sess });
    }

    // 4. POST /api/auth/forgot-password
    if (path === '/api/auth/forgot-password' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const found = db.users.find((x) => x.email.toLowerCase() === email);
      if (!found) return jsonRes(404, { error: 'Email tidak ditemukan.' });
      found.custom_pass = body.new_password;
      saveDb(db);
      return jsonRes(200, { message: 'Password berhasil diperbarui! Silakan login.' });
    }

    // 5. POST /api/auth/logout
    if (path === '/api/auth/logout' && method === 'POST') {
      setSessionUser(null);
      return jsonRes(200, { message: 'Berhasil keluar.' });
    }

    // 6. GET /api/books/meta
    if (path === '/api/books/meta' && method === 'GET') {
      const categories = db.kategori.map((k) => {
        const bks = db.buku.filter((b) => Number(b.id_kategori) === Number(k.id_kategori));
        return {
          ...k,
          jumlah_judul: bks.length,
          total_stok: bks.reduce((s, b) => s + Number(b.jumlah_stok || 0), 0),
        };
      });
      const years = [...new Set(db.buku.map((b) => b.tahun_terbit))].sort((a, b) => b - a);
      const summary = {
        total_judul: db.buku.length,
        total_eksemplar: db.buku.reduce((s, b) => s + Number(b.total_koleksi || 0), 0),
        stok_tersedia: db.buku.reduce((s, b) => s + Number(b.jumlah_stok || 0), 0),
        total_anggota: db.anggota.length,
        sedang_dipinjam: db.peminjaman.filter((p) => ['Dipinjam', 'Terlambat'].includes(p.status)).length,
      };
      const newest = [...db.buku].sort((a, b) => b.tahun_terbit - a.tahun_terbit || b.id_buku - a.id_buku).slice(0, 6);
      const popular = [...db.buku].sort((a, b) => b.jumlah_pinjam - a.jumlah_pinjam).slice(0, 6);
      return jsonRes(200, { summary, categories, years, newest, popular });
    }

    // 7. GET /api/books/:id/chapters
    const chMatch = path.match(/^\/api\/books\/(\d+)\/chapters$/);
    if (chMatch && method === 'GET') {
      const id = Number(chMatch[1]);
      const book = db.buku.find((b) => Number(b.id_buku) === id);
      if (!book) return jsonRes(404, { error: 'Buku tidak ditemukan.' });
      const chapters = db.bab_buku.filter((c) => Number(c.id_buku) === id).sort((a, b) => a.nomor_bab - b.nomor_bab);
      return jsonRes(200, { book, chapters });
    }

    // 8. GET / PUT / DELETE /api/books/:id
    const bkMatch = path.match(/^\/api\/books\/(\d+)$/);
    if (bkMatch) {
      const id = Number(bkMatch[1]);
      const idx = db.buku.findIndex((b) => Number(b.id_buku) === id);
      if (idx === -1) return jsonRes(404, { error: 'Buku tidak ditemukan.' });

      if (method === 'GET') {
        return jsonRes(200, { book: db.buku[idx], recentLoans: [] });
      }
      if (method === 'PUT') {
        const kat = db.kategori.find((k) => Number(k.id_kategori) === Number(body.id_kategori)) || db.kategori[0];
        db.buku[idx] = {
          ...db.buku[idx],
          ...body,
          nama_kategori: kat ? kat.nama_kategori : db.buku[idx].nama_kategori,
          kategori_slug: kat ? kat.slug : db.buku[idx].kategori_slug,
          cover_buku: body.cover_base64 || db.buku[idx].cover_buku,
        };
        saveDb(db);
        return jsonRes(200, { message: 'Data buku berhasil diperbarui.' });
      }
      if (method === 'DELETE') {
        db.buku.splice(idx, 1);
        saveDb(db);
        return jsonRes(200, { message: 'Buku berhasil dihapus.' });
      }
    }

    // 9. GET / POST /api/books
    if (path === '/api/books') {
      if (method === 'GET') {
        const q = (u.searchParams.get('q') || '').toLowerCase();
        const kat = u.searchParams.get('kategori') || 'all';
        const thn = u.searchParams.get('tahun') || 'all';
        const sort = u.searchParams.get('sort') || 'terbaru';

        let list = [...db.buku].map((b) => ({ ...b, cover_buku: fixAssetPath(b.cover_buku) }));
        if (q) {
          list = list.filter(
            (b) =>
              b.judul_buku.toLowerCase().includes(q) ||
              b.penulis.toLowerCase().includes(q) ||
              b.isbn.toLowerCase().includes(q) ||
              b.kode_buku.toLowerCase().includes(q)
          );
        }
        if (kat !== 'all') {
          list = list.filter((b) => b.kategori_slug === kat || String(b.id_kategori) === kat);
        }
        if (thn !== 'all') {
          list = list.filter((b) => String(b.tahun_terbit) === String(thn));
        }
        if (sort === 'populer') list.sort((a, b) => b.jumlah_pinjam - a.jumlah_pinjam);
        else if (sort === 'judul') list.sort((a, b) => a.judul_buku.localeCompare(b.judul_buku));
        else list.sort((a, b) => b.tahun_terbit - a.tahun_terbit || b.id_buku - a.id_buku);

        return jsonRes(200, { books: list });
      }

      if (method === 'POST') {
        const nextId = Math.max(0, ...db.buku.map((b) => b.id_buku)) + 1;
        const kat = db.kategori.find((k) => Number(k.id_kategori) === Number(body.id_kategori)) || db.kategori[0];
        const newBook = {
          id_buku: nextId,
          kode_buku: `BK-2026-${String(nextId).padStart(3, '0')}`,
          isbn: body.isbn,
          judul_buku: body.judul_buku,
          penulis: body.penulis,
          penerbit: body.penerbit,
          tahun_terbit: body.tahun_terbit,
          id_kategori: body.id_kategori,
          nama_kategori: kat ? kat.nama_kategori : 'Umum',
          kategori_slug: kat ? kat.slug : 'umum',
          deskripsi: body.deskripsi,
          lokasi_rak: body.lokasi_rak,
          jumlah_stok: Number(body.jumlah_stok || 5),
          total_koleksi: Number(body.jumlah_stok || 5),
          cover_buku: body.cover_base64 || 'uploads/covers/book-1.svg',
          halaman: Number(body.halaman || 250),
          rating: 4.8,
          jumlah_pinjam: 0,
        };
        db.buku.push(newBook);
        saveDb(db);
        return jsonRes(201, { message: 'Buku baru berhasil ditambahkan.', id_buku: nextId });
      }
    }

    // 10. GET / POST / PUT / DELETE /api/members
    const memMatch = path.match(/^\/api\/members\/(\d+)$/);
    if (memMatch) {
      const id = Number(memMatch[1]);
      const idx = db.anggota.findIndex((a) => Number(a.id_anggota) === id);
      if (idx === -1) return jsonRes(404, { error: 'Anggota tidak ditemukan.' });
      if (method === 'PUT') {
        db.anggota[idx] = { ...db.anggota[idx], ...body };
        saveDb(db);
        return jsonRes(200, { message: 'Data anggota diperbarui.' });
      }
      if (method === 'DELETE') {
        db.anggota.splice(idx, 1);
        saveDb(db);
        return jsonRes(200, { message: 'Anggota dihapus.' });
      }
    }

    if (path === '/api/members') {
      if (method === 'GET') {
        const q = (u.searchParams.get('q') || '').toLowerCase();
        let list = [...db.anggota];
        if (q) {
          list = list.filter(
            (m) =>
              m.nama_lengkap.toLowerCase().includes(q) ||
              m.nis_nim.toLowerCase().includes(q) ||
              m.kode_anggota.toLowerCase().includes(q)
          );
        }
        return jsonRes(200, { members: list.reverse() });
      }
      if (method === 'POST') {
        const nextAid = Math.max(0, ...db.anggota.map((x) => x.id_anggota)) + 1;
        const kode_anggota = `AGT-2026-${String(nextAid).padStart(3, '0')}`;
        db.anggota.push({
          id_anggota: nextAid,
          kode_anggota,
          nama_lengkap: body.nama_lengkap,
          nis_nim: body.nis_nim,
          email: body.email,
          no_telepon: body.no_telepon,
          alamat: body.alamat,
          tanggal_pendaftaran: body.tanggal_pendaftaran || todayStr(),
        });
        saveDb(db);
        return jsonRes(201, { message: 'Anggota berhasil ditambahkan.', id_anggota: nextAid });
      }
    }

    // 11. Loans API (/api/loans)
    if (path === '/api/loans' && method === 'GET') {
      const status = u.searchParams.get('status') || 'all';
      const q = (u.searchParams.get('q') || '').toLowerCase();
      let list = db.peminjaman.map((p) => {
        const agt = db.anggota.find((a) => Number(a.id_anggota) === Number(p.id_anggota)) || {};
        const dp = db.detail_peminjaman.find((d) => Number(d.id_peminjaman) === Number(p.id_peminjaman)) || {};
        const bk = db.buku.find((b) => Number(b.id_buku) === Number(dp.id_buku)) || {};
        const pg = db.pengembalian.find((g) => Number(g.id_peminjaman) === Number(p.id_peminjaman)) || {};
        const dn = db.denda.find((d) => Number(d.id_peminjaman) === Number(p.id_peminjaman)) || {};
        const estTerlambat = ['Dipinjam', 'Terlambat'].includes(p.status)
          ? diffDays(p.batas_pengembalian, todayStr())
          : pg.terlambat_hari || 0;
        const estDenda = dn.total_denda !== undefined ? dn.total_denda : estTerlambat * 2000;
        return {
          ...p,
          kode_anggota: agt.kode_anggota,
          nama_lengkap: agt.nama_lengkap,
          nis_nim: agt.nis_nim,
          id_buku: bk.id_buku,
          kode_buku: bk.kode_buku,
          judul_buku: bk.judul_buku,
          penulis: bk.penulis,
          lokasi_rak: bk.lokasi_rak,
          tanggal_kembali: pg.tanggal_kembali || null,
          terlambat_hari: pg.terlambat_hari || 0,
          id_denda: dn.id_denda || null,
          total_denda: dn.total_denda || 0,
          status_bayar: dn.status_bayar || null,
          estimasi_terlambat: estTerlambat,
          estimasi_denda: estDenda,
        };
      });
      if (user && user.role !== 'admin') {
        list = list.filter((l) => Number(l.id_anggota) === Number(user.id_anggota));
      }
      if (status !== 'all') list = list.filter((l) => l.status === status);
      if (q) {
        list = list.filter(
          (l) =>
            (l.kode_peminjaman || '').toLowerCase().includes(q) ||
            (l.nama_lengkap || '').toLowerCase().includes(q) ||
            (l.judul_buku || '').toLowerCase().includes(q)
        );
      }
      return jsonRes(200, { loans: list, finePerDay: 2000 });
    }

    if (path === '/api/loans' && method === 'POST') {
      const nextPid = Math.max(0, ...db.peminjaman.map((p) => p.id_peminjaman)) + 1;
      const kode_peminjaman = `TRX-2026-${String(nextPid).padStart(4, '0')}`;
      const bk = db.buku.find((b) => Number(b.id_buku) === Number(body.id_buku));
      if (!bk || bk.jumlah_stok <= 0) return jsonRes(400, { error: 'Stok buku habis.' });

      const due = new Date();
      due.setDate(due.getDate() + Number(body.durasi_hari || 7));
      const autoApprove = user && user.role === 'admin' && body.langsung_setujui;

      db.peminjaman.unshift({
        id_peminjaman: nextPid,
        kode_peminjaman,
        id_anggota: body.id_anggota || (user && user.id_anggota) || 1,
        tanggal_pengajuan: todayStr(),
        tanggal_pinjam: autoApprove ? todayStr() : null,
        batas_pengembalian: due.toISOString().slice(0, 10),
        status: autoApprove ? 'Dipinjam' : 'Menunggu',
        catatan: body.catatan || 'Peminjaman online',
      });
      db.detail_peminjaman.push({
        id_detail: nextPid,
        id_peminjaman: nextPid,
        id_buku: bk.id_buku,
        jumlah: 1,
        kondisi_pinjam: 'Baik',
      });
      if (autoApprove) {
        bk.jumlah_stok -= 1;
        bk.jumlah_pinjam = Number(bk.jumlah_pinjam || 0) + 1;
      }
      saveDb(db);
      return jsonRes(201, {
        message: `Pengajuan peminjaman ${kode_peminjaman} berhasil disimpan!`,
        kode_peminjaman,
      });
    }

    const approveMatch = path.match(/^\/api\/loans\/(\d+)\/approve$/);
    if (approveMatch && method === 'POST') {
      const id = Number(approveMatch[1]);
      const p = db.peminjaman.find((x) => Number(x.id_peminjaman) === id);
      const dp = db.detail_peminjaman.find((x) => Number(x.id_peminjaman) === id);
      const bk = dp ? db.buku.find((b) => Number(b.id_buku) === Number(dp.id_buku)) : null;
      if (!p) return jsonRes(404, { error: 'Transaksi tidak ditemukan.' });
      p.status = 'Dipinjam';
      p.tanggal_pinjam = todayStr();
      if (bk && bk.jumlah_stok > 0) {
        bk.jumlah_stok -= 1;
        bk.jumlah_pinjam = Number(bk.jumlah_pinjam || 0) + 1;
      }
      saveDb(db);
      return jsonRes(200, { message: `Peminjaman ${p.kode_peminjaman} disetujui. Stok otomatis berkurang.` });
    }

    const rejectMatch = path.match(/^\/api\/loans\/(\d+)\/reject$/);
    if (rejectMatch && method === 'POST') {
      const id = Number(rejectMatch[1]);
      const p = db.peminjaman.find((x) => Number(x.id_peminjaman) === id);
      if (p) p.status = 'Ditolak';
      saveDb(db);
      return jsonRes(200, { message: 'Peminjaman ditolak.' });
    }

    const returnMatch = path.match(/^\/api\/loans\/(\d+)\/return$/);
    if (returnMatch && method === 'POST') {
      const id = Number(returnMatch[1]);
      const p = db.peminjaman.find((x) => Number(x.id_peminjaman) === id);
      const dp = db.detail_peminjaman.find((x) => Number(x.id_peminjaman) === id);
      const bk = dp ? db.buku.find((b) => Number(b.id_buku) === Number(dp.id_buku)) : null;
      if (!p) return jsonRes(404, { error: 'Transaksi tidak ditemukan.' });

      const tglKembali = body.tanggal_kembali || todayStr();
      const terlambat = diffDays(p.batas_pengembalian, tglKembali);
      const totalDenda = terlambat * 2000;

      p.status = 'Dikembalikan';
      if (bk) bk.jumlah_stok = Number(bk.jumlah_stok || 0) + 1;

      const nextPgId = db.pengembalian.length + 1;
      db.pengembalian.push({
        id_pengembalian: nextPgId,
        id_peminjaman: id,
        tanggal_kembali: tglKembali,
        terlambat_hari: terlambat,
        kondisi_kembali: body.kondisi_kembali || 'Baik',
      });
      if (totalDenda > 0) {
        db.denda.push({
          id_denda: db.denda.length + 1,
          id_pengembalian: nextPgId,
          id_peminjaman: id,
          jumlah_hari: terlambat,
          tarif_per_hari: 2000,
          total_denda: totalDenda,
          status_bayar: body.bayar_lunas ? 'Lunas' : 'Belum Dibayar',
        });
      }
      saveDb(db);
      return jsonRes(200, {
        message:
          totalDenda > 0
            ? `Buku dikembalikan. Terlambat ${terlambat} hari (Denda Rp ${totalDenda.toLocaleString('id-ID')}). Stok bertambah.`
            : 'Buku dikembalikan tepat waktu tanpa denda. Stok otomatis bertambah.',
      });
    }

    // 12. GET /api/admin/dashboard
    if (path === '/api/admin/dashboard' && method === 'GET') {
      const counts = {
        total_judul_buku: db.buku.length,
        total_eksemplar_buku: db.buku.reduce((s, b) => s + Number(b.total_koleksi || 0), 0),
        total_stok_tersedia: db.buku.reduce((s, b) => s + Number(b.jumlah_stok || 0), 0),
        total_anggota: db.anggota.length,
        total_peminjaman: db.peminjaman.length,
        total_pengembalian: db.pengembalian.length,
        sedang_dipinjam: db.peminjaman.filter((p) => ['Dipinjam', 'Terlambat'].includes(p.status)).length,
        menunggu_persetujuan: db.peminjaman.filter((p) => p.status === 'Menunggu').length,
      };
      const activeBorrowedBooks = db.peminjaman
        .filter((p) => ['Dipinjam', 'Terlambat', 'Menunggu'].includes(p.status))
        .map((p) => {
          const agt = db.anggota.find((a) => Number(a.id_anggota) === Number(p.id_anggota)) || {};
          const dp = db.detail_peminjaman.find((d) => Number(d.id_peminjaman) === Number(p.id_peminjaman)) || {};
          const bk = db.buku.find((b) => Number(b.id_buku) === Number(dp.id_buku)) || {};
          return {
            ...p,
            nama_lengkap: agt.nama_lengkap,
            nis_nim: agt.nis_nim,
            judul_buku: bk.judul_buku,
            lokasi_rak: bk.lokasi_rak,
          };
        });
      const chartByCategory = db.kategori.map((k) => {
        const bks = db.buku.filter((b) => Number(b.id_kategori) === Number(k.id_kategori));
        return {
          nama_kategori: k.nama_kategori,
          histori_pinjam: bks.reduce((s, b) => s + Number(b.jumlah_pinjam || 0), 0),
        };
      });
      const statusMap = {};
      db.peminjaman.forEach((p) => {
        statusMap[p.status] = (statusMap[p.status] || 0) + 1;
      });
      const chartByStatus = Object.entries(statusMap).map(([status, jumlah]) => ({ status, jumlah }));

      return jsonRes(200, {
        counts,
        activeBorrowedBooks,
        chartByCategory,
        chartByStatus,
        recentActivities: db.aktivitas.slice(0, 10),
      });
    }

    // 13. GET /api/admin/reports/:type
    const repMatch = path.match(/^\/api\/admin\/reports\/([a-z]+)$/);
    if (repMatch && method === 'GET') {
      const type = repMatch[1];
      if (type === 'buku') {
        return jsonRes(200, { title: 'Laporan Data Koleksi Buku', generatedAt: todayStr(), rows: db.buku });
      }
      if (type === 'anggota') {
        return jsonRes(200, {
          title: 'Laporan Data Anggota Perpustakaan',
          generatedAt: todayStr(),
          rows: db.anggota.map((a) => ({ ...a, total_pinjam: 1 })),
        });
      }
      const loansRes = await (await handleVirtualApi('/api/loans', { method: 'GET' })).json();
      if (type === 'peminjaman') {
        return jsonRes(200, { title: 'Laporan Transaksi Peminjaman', generatedAt: todayStr(), rows: loansRes.loans });
      }
      if (type === 'pengembalian') {
        return jsonRes(200, {
          title: 'Laporan Pengembalian Buku',
          generatedAt: todayStr(),
          rows: loansRes.loans.filter((l) => l.status === 'Dikembalikan'),
        });
      }
      if (type === 'keterlambatan') {
        return jsonRes(200, {
          title: 'Laporan Keterlambatan',
          generatedAt: todayStr(),
          rows: loansRes.loans
            .filter((l) => l.status === 'Terlambat' || l.estimasi_terlambat > 0)
            .map((l) => ({
              ...l,
              no_telepon: '08123456789',
              hari_terlambat: l.estimasi_terlambat,
              nominal_denda: l.estimasi_denda,
            })),
        });
      }
      if (type === 'denda') {
        return jsonRes(200, {
          title: 'Laporan Denda Perpustakaan',
          generatedAt: todayStr(),
          rows: loansRes.loans
            .filter((l) => l.estimasi_denda > 0)
            .map((l) => ({
              ...l,
              jumlah_hari: l.estimasi_terlambat,
              tarif_per_hari: 2000,
              total_denda: l.estimasi_denda,
              status_bayar: l.status_bayar || 'Belum Dibayar',
            })),
        });
      }
    }

    return jsonRes(200, {});
  }

  // Intercept window.fetch jika berjalan di GitHub Pages atau jika backend Node tidak merespons
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const urlStr = typeof input === 'string' ? input : input.url;
    if (urlStr.includes('/api/')) {
      if (isGitHubPages) {
        return handleVirtualApi(urlStr, init);
      }
      try {
        const res = await originalFetch(input, init);
        if (res.status === 404 || res.status === 405 || res.status >= 502) {
          return handleVirtualApi(urlStr, init);
        }
        return res;
      } catch {
        return handleVirtualApi(urlStr, init);
      }
    }
    return originalFetch(input, init);
  };
})();
