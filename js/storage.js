/**
 * Penyimpanan lokal: posisi baca per buku & preferensi tampilan pembaca.
 * (Saat fitur login aktif, data yang sama akan disinkronkan ke tabel reading_progress.)
 */
const ProgressStore = (() => {
  const PREFIX = 'pustaka:progress:';

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }

  return {
    get(slug) {
      return safeParse(localStorage.getItem(PREFIX + slug));
    },
    set(slug, data) {
      try {
        localStorage.setItem(PREFIX + slug, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
      } catch { /* penyimpanan penuh / mode privat — abaikan dengan tenang */ }
    },
    clear(slug) {
      localStorage.removeItem(PREFIX + slug);
    },
    all() {
      const items = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) {
          const data = safeParse(localStorage.getItem(key));
          if (data) items.push({ slug: key.slice(PREFIX.length), ...data });
        }
      }
      return items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    },
  };
})();

const ReaderPrefs = (() => {
  const KEY = 'pustaka:reader-prefs';
  const DEFAULTS = { theme: 'cream', size: 'm', leading: 'normal' };
  return {
    DEFAULTS,
    get() {
      try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
      catch { return { ...DEFAULTS }; }
    },
    set(prefs) {
      try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* abaikan */ }
    },
  };
})();
