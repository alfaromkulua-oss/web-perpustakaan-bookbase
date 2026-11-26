/**
 * Logika filter katalog — dipakai bersama oleh browser dan server (mode memori).
 */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.PustakaFilter = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Semantik filter jenis:
   *  - ebook    -> semua yang bisa dibaca online (ebook + both)
   *  - physical -> semua yang bisa dipinjam fisik (physical + both)
   *  - both     -> hanya yang tersedia keduanya
   */
  function matchesFormat(book, format) {
    if (!format || format === 'all') return true;
    if (format === 'ebook') return book.format === 'ebook' || book.format === 'both';
    if (format === 'physical') return book.format === 'physical' || book.format === 'both';
    if (format === 'both') return book.format === 'both';
    return true;
  }

  function filterBooks(books, filters) {
    const { q = '', category = 'all', format = 'all' } = filters || {};
    const terms = normalize(q).split(/\s+/).filter(Boolean);

    return books.filter((book) => {
      if (category && category !== 'all' && book.category !== category) return false;
      if (!matchesFormat(book, format)) return false;
      if (!terms.length) return true;
      const haystack = normalize(
        [book.title, book.subtitle, book.author, book.category, (book.topics || []).join(' ')].join(' ')
      );
      return terms.every((term) => haystack.includes(term));
    });
  }

  return { normalize, matchesFormat, filterBooks };
});
