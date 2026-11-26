/**
 * Klien API. Bila server/MySQL belum jalan (atau halaman dibuka via file://),
 * otomatis memakai data contoh di window.PUSTAKA_SEED supaya tetap bisa dicoba.
 */
const PustakaAPI = (() => {
  const seed = window.PUSTAKA_SEED;
  const Filter = window.PustakaFilter;
  let offline = location.protocol === 'file:';

  async function get(path) {
    if (offline) throw Object.assign(new Error('offline'), { offline: true });
    const res = await fetch(path, { headers: { Accept: 'application/json' } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(body.error || res.statusText), { status: res.status });
    return body;
  }

  async function withFallback(remote, local) {
    try {
      return await remote();
    } catch (err) {
      if (err.status === 404) return null;
      if (!offline) console.info('[Pustaka] API belum tersedia, memakai data contoh lokal.');
      offline = true;
      return local();
    }
  }

  /* ---------- Implementasi lokal (sama bentuknya dengan respons API) ---------- */
  const words = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
  const summarize = (c) => {
    const wordCount = words(c.content);
    return { number: c.number, title: c.title, wordCount, estimatedMinutes: Math.max(1, Math.round(wordCount / 200)) };
  };
  const strip = (b) => {
    const { chapters, ...rest } = b;
    return { coverUrl: '', ...rest, chapterCount: (chapters || []).length };
  };
  const findLocal = (slug) => seed.books.find((b) => b.slug === slug);

  return {
    isOffline: () => offline,

    listBooks(filters = {}) {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.category && filters.category !== 'all') params.set('kategori', filters.category);
      if (filters.format && filters.format !== 'all') params.set('jenis', filters.format);
      return withFallback(
        async () => (await get(`/api/books?${params}`)).books,
        () => Filter.filterBooks(seed.books, filters).map(strip)
      );
    },

    getBook(slug) {
      return withFallback(
        async () => (await get(`/api/books/${encodeURIComponent(slug)}`)).book,
        () => {
          const b = findLocal(slug);
          return b ? { ...strip(b), toc: (b.chapters || []).map(summarize) } : null;
        }
      );
    },

    getChapters(slug) {
      return withFallback(
        () => get(`/api/books/${encodeURIComponent(slug)}/chapters`),
        () => {
          const b = findLocal(slug);
          if (!b || !(b.chapters || []).length) return null;
          return {
            book: strip(b),
            chapters: b.chapters.map((c) => ({ ...summarize(c), content: c.content, contentFormat: 'plain' })),
          };
        }
      );
    },
  };
})();
