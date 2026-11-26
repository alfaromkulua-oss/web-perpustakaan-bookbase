/**
 * Data contoh Pustaka Teduh.
 * File ini dipakai bersama oleh:
 *  - browser (fallback saat API/MySQL belum jalan) -> window.PUSTAKA_SEED
 *  - server (mode memori + skrip `npm run db:setup`)  -> module.exports
 *
 * Format konten bab: teks biasa. Paragraf dipisah satu baris kosong.
 * `*teks*` = miring, baris berisi `***` = jeda adegan.
 */
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.PUSTAKA_SEED = data;
})(typeof self !== 'undefined' ? self : this, function () {
  const curatorNote = {
    eyebrow: 'Catatan Pustakawan · November',
    text:
      'Bulan ini hujan datang hampir setiap sore, jadi rak depan kami tata ulang untuk bacaan yang pelan dan hangat. ' +
      'Kalau kamu cuma punya dua puluh menit, mulailah dari Kedai di Ujung Hujan. Bab pertamanya pendek, ' +
      'dan rasanya seperti duduk di meja dekat jendela sambil menunggu reda.',
    author: 'Sari Andayani',
    role: 'Pustakawan Kepala',
    bookSlug: 'kedai-di-ujung-hujan',
  };

  const shelves = [
    {
      slug: 'sore-hujan',
      title: 'Bacaan untuk Sore yang Hujan',
      blurb: 'Cerita-cerita yang tidak terburu-buru. Cocok ditemani teh panas dan suara talang air.',
    },
    {
      slug: 'pilihan-pustakawan',
      title: 'Pilihan Pustakawan Bulan Ini',
      blurb: 'Buku yang diam-diam kami pinjamkan ke teman sendiri. Sekarang giliranmu.',
    },
  ];

  const books = [
    {
      id: 1,
      slug: 'kedai-di-ujung-hujan',
      title: 'Kedai di Ujung Hujan',
      subtitle: 'Sebuah Novelet',
      author: 'Laras Prameswari',
      publisher: 'Penerbit Serambi Teduh',
      year: 2024,
      isbn: '978-623-00-1201-7',
      category: 'Fiksi',
      topics: ['persahabatan', 'kehilangan', 'kopi', 'bogor'],
      format: 'both',
      pageCount: 96,
      stockTotal: 4,
      stockAvailable: 2,
      coverColor: '#3E2A1E',
      coverAccent: '#E8C9A0',
      shelves: ['sore-hujan', 'pilihan-pustakawan'],
      isFeatured: true,
      description:
        'Di sebuah gang sempit dekat stasiun lama Bogor, ada kedai kopi dengan tujuh meja dan satu lonceng kuningan yang konon tak pernah berbunyi dengan nada yang sama dua kali. Suatu sore, seorang pelanggan lama kembali setelah sebelas tahun—dan meninggalkan surat di bawah gelasnya.',
      curatorNote: 'Pendek, hangat, dan sedikit getir. Kami sarankan dibaca sekali duduk.',
      chapters: [
        {
          number: 1,
          title: 'Lonceng di Atas Pintu',
          content: `Lonceng kuningan di atas pintu kedai itu sudah berbunyi sejak 1987, dan menurut Bu Ratmi, ia tak pernah berbunyi dengan nada yang sama dua kali.

"Setiap orang membukanya dengan cara berbeda," katanya suatu sore, sambil mengelap gelas yang sebenarnya sudah kering. "Ada yang buru-buru, ada yang ragu-ragu. Ada yang masuk cuma karena hujan. Lonceng itu tahu semuanya."

Nadia tidak percaya pada lonceng yang tahu. Ia baru tiga minggu bekerja di Kedai Ujung, kedai kopi kecil di gang sempit dekat stasiun lama Bogor. Mejanya cuma tujuh, dan kursinya tak ada yang kembar. Ia melamar karena butuh uang untuk semester depan, dan karena papan kecil di jendela bertuliskan: *Dicari: orang yang sabar mendengarkan. Bisa bikin kopi itu bonus.*

Sore itu hujan turun seperti biasa. Bogor memang tidak pernah benar-benar minta izin untuk hujan. Air mengalir di talang, menetes dari ujung kanopi, lalu membentuk genangan kecil di depan pintu yang selalu lupa Nadia keringkan.

Lonceng berbunyi. Seorang lelaki tua masuk, payungnya terlipat rapi meski bahu kemejanya basah. Ia mengangguk pada Bu Ratmi seolah mereka baru bertemu kemarin, lalu duduk di meja dekat jendela—meja nomor empat, yang taplaknya bergambar burung kutilang pudar.

"Pak Harun," bisik Bu Ratmi tanpa menoleh. "Kopi tubruk, gula sedikit, gelas belimbing. Jangan pakai cangkir."

"Ibu kenal?"

"Dulu tiap Kamis dia ke sini. Lalu berhenti." Bu Ratmi menuang air panas pelan-pelan, membiarkan bubuk kopi naik dan berputar. "Sebelas tahun dia nggak datang."

Nadia mengantarkan gelas itu. Pak Harun menerimanya dengan dua tangan, seperti menerima sesuatu yang jauh lebih berat dari segelas kopi. Ia menghirup uapnya lama sekali, lalu tersenyum kecil—senyum orang yang baru menemukan barang lama yang hilang di saku jaketnya sendiri.

"Masih sama," gumamnya. "Syukurlah ada yang masih sama."

Nadia ingin bertanya, tapi papan di jendela itu bilang *sabar mendengarkan*, bukan *pandai bertanya*. Jadi ia kembali ke balik meja, pura-pura menyusun toples gula aren, dan diam-diam memperhatikan.

Pak Harun mengeluarkan buku catatan bersampul kain cokelat dari tasnya. Ia membukanya di tengah, di halaman yang ditandai sehelai daun kering. Ia menulis, berhenti, menatap hujan, lalu menulis lagi.

***

Ketika hujan reda, ia membayar dengan uang pas, mengucapkan terima kasih, dan pergi. Lonceng berbunyi lagi—kali ini pelan, hampir seperti ucapan sampai jumpa.

Di meja nomor empat, di bawah gelas belimbing yang sudah kosong, tertinggal selembar kertas terlipat. Di atasnya tertulis dengan tinta biru yang agak luntur:

*Untuk Ratmi. Kalau aku tidak sempat kembali Kamis depan.*`,
        },
        {
          number: 2,
          title: 'Resep yang Tidak Ditulis',
          content: `Bu Ratmi tidak langsung membuka surat itu. Ia menyelipkannya di balik bingkai foto di dinding—foto hitam-putih seorang lelaki berkumis tipis yang sedang tertawa di depan pintu kedai, dengan lonceng yang sama tergantung di atas kepalanya.

"Itu Mas Darto," katanya, ketika menyadari Nadia memperhatikan. "Yang bikin kedai ini. Yang bikin resep kopinya juga."

Besok paginya, sebelum kedai buka, Bu Ratmi memanggil Nadia ke dapur belakang. Di atas meja kayu sudah ada lesung batu, sekarung kecil biji kopi dari Garut, dan sebuah kendi tanah liat.

"Selama ini kamu bikin kopi pakai takaran di kertas yang Ibu tempel di dinding, kan?"

Nadia mengangguk. Lima belas gram kopi, dua ratus mililiter air, suhu sembilan puluh dua derajat. Ia sudah hafal di luar kepala.

"Itu bohong," kata Bu Ratmi, tenang sekali. "Itu cuma supaya pegawai baru nggak panik. Resep yang asli nggak pernah ditulis."

Ia mengambil segenggam biji kopi, menciumnya, lalu memilah beberapa yang warnanya terlalu pucat. "Mas Darto bilang, resep yang ditulis gampang dilupakan. Orang merasa aman karena ada catatannya, jadi mereka berhenti memperhatikan. Resep yang diajarkan, yang dilihat dan dicium dan dicoba berkali-kali, itu yang susah hilang."

Selama dua jam pagi itu, Nadia belajar bahwa kopi tubruk yang baik dimulai dari telinga, bukan dari timbangan. Bunyi biji yang ditumbuk harus berubah dari *tak-tak* yang nyaring menjadi *duk-duk* yang berat. Air tidak dituang begitu mendidih, tapi setelah kendi didiamkan sebanyak satu tarikan napas panjang. Gelas belimbing harus dibilas air panas dulu, "supaya kopinya nggak kaget."

"Kaget, Bu?"

"Kamu juga kaget kan, kalau habis dari tempat hangat langsung masuk ruangan ber-AC?"

Nadia tertawa. Untuk pertama kalinya, ia merasa sedang belajar sesuatu yang tidak ada di silabus kampusnya.

***

Sore harinya, ketika kedai sepi, Bu Ratmi akhirnya mengambil surat itu dari balik bingkai. Ia membacanya sambil berdiri di dekat jendela, di samping meja nomor empat. Nadia pura-pura sibuk mencuci saringan.

Lama sekali Bu Ratmi diam. Lalu ia melipat kertas itu dan berkata tanpa menoleh, "Pak Harun itu sahabat Mas Darto. Tiap Kamis mereka main catur di meja itu, dari jam empat sampai azan Isya. Yang kalah bayar kopi. Padahal kopinya punya kami sendiri."

Ia tersenyum, tapi matanya basah.

"Waktu Mas Darto meninggal, Pak Harun berhenti datang. Ibu kira dia marah. Atau lupa." Ia membuka lagi lipatan kertas itu, membaca satu baris dengan suara pelan: "*Sebelas tahun aku berdiri di ujung gang setiap Kamis, mendengar lonceng berbunyi untuk orang lain. Aku tidak sanggup masuk dan melihat kursi Darto kosong.*"

Nadia mematikan keran.

"Dia mau pindah ke Makassar, ikut anaknya. Kamis depan dia mau datang sekali lagi. Yang terakhir." Bu Ratmi menyimpan surat itu di saku celemeknya. "Kamu masuk Kamis, kan?"

"Masuk, Bu."

"Bagus. Kita siapkan papan caturnya."`,
        },
        {
          number: 3,
          title: 'Hujan Terakhir Bulan November',
          content: `Kamis itu langit sudah mendung sejak pukul satu siang. Nadia datang lebih awal dan menemukan Bu Ratmi sedang mengelap papan catur kayu yang sudut-sudutnya sudah membulat karena terlalu sering disentuh.

Bidaknya disimpan di kaleng biskuit bekas. Satu bidak menteri putih sudah diganti tutup botol kecap yang dicat putih. "Yang asli hilang tahun sembilan puluhan," kata Bu Ratmi. "Mas Darto bilang, tutup botol itu lebih berwibawa."

Mereka menata meja nomor empat. Taplak kutilang dicuci dan disetrika. Dua kursi—yang satu bercat hijau, yang satu tidak dicat sama sekali—diletakkan berhadapan. Di tengahnya, papan catur, dan di samping papan, satu gelas belimbing yang sudah dibilas air panas.

Pukul empat, hujan turun. Pukul setengah lima, Pak Harun belum datang.

Pukul lima, Bu Ratmi mulai mengelap gelas yang sama untuk ketiga kalinya. Nadia memperhatikan pintu, memperhatikan lonceng, dan untuk pertama kalinya berharap lonceng itu benar-benar bisa tahu sesuatu.

***

Lonceng berbunyi pukul lima lewat dua puluh.

Pak Harun berdiri di ambang pintu, basah dari ujung rambut sampai sepatu. Payungnya entah di mana. Ia tertawa—tertawa betulan, bukan senyum kecil seperti minggu lalu.

"Angkotnya mogok di Jalan Suryakencana," katanya, sambil mengibaskan air dari lengan kemeja. "Aku jalan kaki. Sudah lama aku nggak jalan kaki di bawah hujan. Ternyata menyenangkan, kalau tahu ada tempat yang menunggu."

Bu Ratmi tidak berkata apa-apa. Ia hanya mengambil handuk dari dapur, menyerahkannya, lalu menunjuk meja nomor empat. "Duduk. Kamu putih. Aku main pakai cara Mas Darto."

Mereka bermain sampai azan Isya. Nadia menyeduh tiga gelas kopi tubruk dengan cara yang diajarkan Bu Ratmi—menunggu bunyi *duk-duk*, menunggu satu tarikan napas panjang, membilas gelas supaya kopinya tidak kaget. Pak Harun menghirup gelas pertama, lalu menatap Nadia lama.

"Siapa yang bikin ini?"

"Saya, Pak."

"Hm." Ia menyesap lagi. "Darto pasti senang. Resepnya nggak hilang."

Bu Ratmi menang dengan langkah menteri tutup botol kecap. Pak Harun mengangkat kedua tangannya, menyerah dengan gembira, lalu membayar kopi yang sebenarnya tidak perlu dibayar.

Sebelum pergi, ia mengeluarkan buku catatan bersampul kain cokelat itu dan menyerahkannya—bukan kepada Bu Ratmi, tapi kepada Nadia.

"Isinya cerita-cerita Darto. Semua yang dia omongkan selama main catur, dua puluh tahun lebih. Aku tulis waktu berdiri di ujung gang, supaya nggak lupa." Ia menepuk sampul buku itu pelan. "Resep boleh nggak ditulis. Tapi cerita harus ada yang menyimpan. Kamu yang muda. Kamu yang akan mendengarkan pelanggan berikutnya."

Nadia memeluk buku itu di dadanya dan tidak bisa berkata apa-apa.

Pak Harun membuka pintu. Hujan sudah tinggal gerimis tipis, dan lampu-lampu gang memantul di genangan yang, lagi-lagi, lupa dikeringkan Nadia.

Lonceng berbunyi.

Dan Nadia, yang tidak percaya pada lonceng yang tahu, mendengarnya dengan jelas: bunyinya memang berbeda. Lebih panjang, lebih rendah, seperti seseorang yang akhirnya berani pamit dengan benar.`,
        },
      ],
    },
    {
      id: 2,
      slug: 'merawat-ingatan',
      title: 'Merawat Ingatan',
      subtitle: 'Esai-Esai Kecil tentang Membaca',
      author: 'Bima Aditya Nugraha',
      publisher: 'Lentera Kata',
      year: 2025,
      isbn: '978-623-00-3318-0',
      category: 'Esai',
      topics: ['membaca', 'perpustakaan', 'literasi', 'catatan'],
      format: 'ebook',
      pageCount: 64,
      stockTotal: 0,
      stockAvailable: 0,
      coverColor: '#1B4332',
      coverAccent: '#F1E6CF',
      shelves: ['pilihan-pustakawan'],
      isFeatured: false,
      description:
        'Tiga esai pendek tentang kebiasaan yang kita kira sederhana: membaca. Tentang perhatian yang makin mahal, catatan pensil orang asing di pinggir halaman, dan perpustakaan kecil yang diam-diam membesarkan banyak anak.',
      curatorNote: 'Bacaan yang pas untuk mengingatkan kenapa kita jatuh cinta pada buku sejak awal.',
      chapters: [
        {
          number: 1,
          title: 'Mengapa Kita Masih Membaca',
          content: `Ponsel di saku saya bergetar empat kali selama saya menulis kalimat pertama esai ini. Satu dari grup keluarga, satu promo ongkos kirim, dua lagi entah apa. Saya tidak membukanya, dan itu terasa seperti kemenangan kecil yang aneh.

Kita hidup di zaman ketika perhatian adalah barang dagangan. Setiap aplikasi dirancang oleh orang-orang pintar yang dibayar mahal untuk satu tujuan: membuat kita tidak berhenti menggulir. Dalam keadaan begitu, membuka buku dan membaca dua puluh halaman tanpa jeda hampir seperti tindakan pembangkangan.

Tapi saya tidak ingin membela buku dengan nada marah. Buku tidak butuh dibela. Ia hanya butuh diberi waktu.

***

Ada satu hal yang hanya bisa diberikan oleh membaca panjang: kesempatan untuk tinggal di dalam pikiran orang lain cukup lama sampai kita lupa bahwa itu bukan pikiran kita sendiri. Penulis yang sudah meninggal seratus tahun lalu bisa berbisik di telinga kita di dalam angkot yang macet. Seorang nelayan di Flores, seorang dokter di Lisbon, seorang anak perempuan di Kabul—semuanya bisa kita dengarkan, kalau kita mau duduk diam sebentar.

Membaca juga mengajarkan kesabaran yang tidak diajarkan oleh hal lain. Sebuah novel tidak memberikan kepuasannya di halaman pertama. Kadang tokohnya menyebalkan, kadang alurnya lambat, kadang kita baru mengerti maksud bab tiga ketika sudah sampai bab sembilan. Hidup juga seperti itu, sebenarnya. Banyak hal baru masuk akal setelah kita bertahan cukup lama.

Saya pernah bertanya pada ibu saya, yang setiap malam membaca sebelum tidur sejak saya kecil, kenapa ia tidak pernah bosan. Jawabannya sederhana: "Karena di buku, Ibu boleh jadi siapa saja. Di rumah, Ibu cuma jadi ibu."

Saya baru paham kalimat itu bertahun-tahun kemudian. Membaca bukan pelarian dari hidup. Ia adalah cara meminjam hidup lain sebentar, supaya kita bisa pulang ke hidup sendiri dengan mata yang sedikit lebih terbuka.

***

Jadi mengapa kita masih membaca? Mungkin karena di tengah semua yang meminta perhatian kita dengan suara keras, buku adalah satu-satunya yang menunggu dengan sabar. Ia tidak bergetar. Ia tidak mengirim notifikasi. Ia hanya diam di rak, di tas, di layar, menunggu kita siap.

Dan ketika kita siap, ia selalu ada.`,
        },
        {
          number: 2,
          title: 'Pinggiran Halaman',
          content: `Buku pinjaman perpustakaan punya satu kelebihan yang tidak dimiliki buku baru: jejak orang lain.

Saya menemukannya pertama kali di sebuah novel yang saya pinjam waktu kuliah. Di halaman 142, di bawah paragraf tentang seorang perempuan yang memutuskan meninggalkan kota kelahirannya, seseorang menulis dengan pensil, kecil sekali: *aku juga pernah merasa begini.*

Tidak ada nama, tidak ada tanggal. Hanya lima kata, dan tulisan tangan yang agak miring ke kanan.

Saya ingat duduk lama di kursi perpustakaan itu, menatap lima kata tersebut. Siapa dia? Apakah akhirnya ia pergi? Apakah ia baik-baik saja? Saya tidak akan pernah tahu. Tapi untuk sesaat, saya merasa ditemani oleh orang asing yang pernah duduk di tempat yang sama, membaca kalimat yang sama, dan merasakan getaran yang sama.

***

Para pustakawan mungkin akan mengernyit membaca esai ini. Mencoret-coret buku pinjaman jelas bukan perilaku yang patut dicontoh, dan saya tidak sedang menyarankannya. Buku milik bersama harus dijaga bersama.

Tapi saya ingin mengakui bahwa catatan pinggir—*marginalia*, istilah kerennya—adalah salah satu bentuk percakapan tertua dalam sejarah membaca. Para biarawan abad pertengahan menulis keluhan di pinggir naskah yang mereka salin: "Tinta ini jelek," atau "Tanganku dingin sekali." Para filsuf menulis bantahan untuk penulis yang sudah lama meninggal. Ayah saya menggarisbawahi kalimat di buku-bukunya dengan pulpen merah, dan sampai sekarang, membaca bukunya terasa seperti membaca bersama dia.

Membaca, pada dasarnya, adalah percakapan. Penulis bicara, kita mendengarkan. Catatan di pinggir halaman adalah cara kita menjawab.

***

Sekarang saya punya kebiasaan kecil. Di buku-buku milik saya sendiri, saya menulis catatan dengan pensil, tipis, di pinggir halaman. Kadang pertanyaan, kadang tanggal saya membaca bagian itu, kadang cuma tanda seru.

Siapa tahu, suatu hari buku-buku ini akan berpindah tangan. Disumbangkan, diwariskan, dijual di lapak buku bekas di Kwitang. Dan mungkin seseorang, di kota lain, di tahun yang lain, akan menemukan catatan saya dan merasa sedikit kurang sendirian.

Untuk buku perpustakaan, saya punya cara lain: pembatas buku dari kertas, yang saya tulisi lalu saya tinggalkan di dalamnya. Tidak merusak apa pun, dan bisa dibuang kalau pembaca berikutnya tidak suka.

Kalau suatu hari kamu meminjam buku dari rak kami dan menemukan secarik kertas bertuliskan *kamu nggak sendirian*, mungkin itu dari saya. Atau dari orang lain yang punya kebiasaan sama. Tidak penting siapa. Yang penting, pesannya sampai.`,
        },
        {
          number: 3,
          title: 'Perpustakaan sebagai Rumah Kedua',
          content: `Perpustakaan pertama dalam hidup saya adalah sebuah ruangan berukuran enam kali delapan meter di samping kantor kecamatan. Dindingnya hijau muda yang mulai mengelupas, kipas anginnya berderit, dan raknya terbuat dari kayu yang dipernis terlalu tebal sehingga lengket kalau cuaca panas.

Penjaganya bernama Pak Yusuf. Ia selalu memakai kemeja batik lengan pendek dan kacamata yang diikat tali supaya tidak jatuh. Ia tidak pernah menyuruh kami diam. Ia hanya menatap, lalu tersenyum, dan entah kenapa kami langsung diam sendiri.

Saya pergi ke sana hampir setiap hari sepulang sekolah, dari kelas empat sampai kelas sembilan. Bukan karena saya anak yang rajin. Rumah saya sempit dan ramai, dan perpustakaan itu adalah satu-satunya tempat di mana tidak ada yang menyuruh saya melakukan sesuatu.

***

Kita jarang membicarakan ini, tapi perpustakaan adalah salah satu dari sedikit tempat umum yang tidak meminta kita membeli apa pun. Di mal, kita harus belanja. Di kafe, kita harus pesan minum. Di perpustakaan, kita cukup datang. Duduk. Membaca. Atau sekadar berteduh dari panas siang.

Bagi banyak anak—dan banyak orang dewasa—itu bukan hal kecil. Itu adalah ruang aman. Tempat di mana rasa ingin tahu tidak dihitung dengan uang.

Pak Yusuf tahu ini lebih baik dari siapa pun. Ia menyimpan buku-buku tertentu di bawah mejanya untuk anak-anak tertentu. Untuk saya, ia menyimpan novel-novel petualangan dan ensiklopedia bergambar tentang luar angkasa. Untuk teman saya, Rini, yang ayahnya sakit, ia menyimpan buku tentang tanaman obat. Ia tidak pernah bilang kenapa. Ia hanya menyerahkan buku itu dan berkata, "Kayaknya kamu bakal suka."

Ia hampir selalu benar.

***

Bertahun-tahun kemudian, saya kembali ke kecamatan itu. Ruangan hijau muda itu sudah jadi gudang arsip. Pak Yusuf sudah pensiun dan pindah ke rumah anaknya di Semarang. Buku-bukunya, kata petugas di sana, sebagian dipindahkan ke perpustakaan daerah, sebagian lagi entah ke mana.

Saya berdiri lama di depan pintu yang terkunci, dan sadar bahwa sebagian besar diri saya dibentuk di ruangan itu. Kosakata saya, cara saya bertanya, keyakinan saya bahwa dunia ini jauh lebih luas dari gang tempat saya tumbuh—semuanya berawal dari rak kayu yang lengket dan seorang lelaki berkacamata yang tahu buku apa yang kami butuhkan sebelum kami sendiri tahu.

Kini perpustakaan bisa hadir di layar, seperti yang sedang kamu baca sekarang. Saya tidak keberatan. Rumah tidak harus berdinding. Yang penting, selalu ada pintu yang terbuka, dan selalu ada seseorang—atau sesuatu—yang berkata pelan: *kayaknya kamu bakal suka.*

Terima kasih sudah membaca sampai sini. Semoga kamu menemukan rumah keduamu sendiri.`,
        },
      ],
    },
    {
      id: 3,
      slug: 'peta-rempah-nusantara',
      title: 'Peta Rempah Nusantara',
      subtitle: 'Jalur Dagang yang Mengubah Dunia',
      author: 'Ratna Wulandari',
      publisher: 'Arsip Kota',
      year: 2022,
      isbn: '978-602-11-4471-2',
      category: 'Sejarah',
      topics: ['rempah', 'maritim', 'kolonialisme', 'maluku'],
      format: 'physical',
      pageCount: 312,
      stockTotal: 3,
      stockAvailable: 1,
      coverColor: '#BC4749',
      coverAccent: '#F6E7CF',
      shelves: ['pilihan-pustakawan'],
      isFeatured: false,
      description:
        'Dari pala Banda sampai cengkih Ternate, buku ini menelusuri bagaimana biji-biji kecil dari timur Nusantara memicu pelayaran, perang, dan perjanjian yang membentuk peta dunia modern.',
      curatorNote: 'Penuh peta lipat dan ilustrasi. Versi cetaknya terlalu indah untuk dijadikan PDF.',
      chapters: [],
    },
    {
      id: 4,
      slug: 'menanam-di-balkon',
      title: 'Menanam di Balkon',
      subtitle: 'Kebun Kecil untuk Rumah Sempit',
      author: 'Dewi Kirana',
      publisher: 'Rumah Hijau',
      year: 2023,
      isbn: '978-623-90-2210-5',
      category: 'Gaya Hidup',
      topics: ['berkebun', 'urban', 'tanaman', 'rumah'],
      format: 'physical',
      pageCount: 148,
      stockTotal: 2,
      stockAvailable: 0,
      coverColor: '#5B7553',
      coverAccent: '#F3EBDD',
      shelves: [],
      isFeatured: false,
      description:
        'Panduan ramah pemula untuk menanam cabai, kemangi, dan tomat ceri di balkon apartemen atau teras sempit, lengkap dengan kalender tanam dan cara membuat kompos dari sisa dapur.',
      curatorNote: 'Lagi populer. Semua eksemplar sedang dipinjam—biasanya kembali dalam seminggu.',
      chapters: [],
    },
    {
      id: 5,
      slug: 'sungai-yang-mengingat-namamu',
      title: 'Sungai yang Mengingat Namamu',
      subtitle: 'Kumpulan Puisi',
      author: 'Arif Senoaji',
      publisher: 'Penerbit Serambi Teduh',
      year: 2021,
      isbn: '978-602-50-8812-3',
      category: 'Puisi',
      topics: ['puisi', 'alam', 'rindu', 'kampung halaman'],
      format: 'physical',
      pageCount: 88,
      stockTotal: 2,
      stockAvailable: 2,
      coverColor: '#2F3E46',
      coverAccent: '#D9C7A7',
      shelves: ['sore-hujan'],
      isFeatured: false,
      description:
        'Enam puluh puisi pendek tentang sungai, ibu, dan jarak. Ditulis selama dua puluh tahun merantau, dibaca paling enak dengan suara pelan.',
      curatorNote: 'Bacalah satu puisi sehari. Jangan dihabiskan sekaligus.',
      chapters: [],
    },
    {
      id: 6,
      slug: 'anak-anak-mercusuar',
      title: 'Anak-Anak Mercusuar',
      subtitle: '',
      author: 'Maya Larasati',
      publisher: 'Kancil Pustaka',
      year: 2023,
      isbn: '978-623-77-0145-9',
      category: 'Anak & Remaja',
      topics: ['petualangan', 'laut', 'persahabatan', 'anak'],
      format: 'physical',
      pageCount: 176,
      stockTotal: 5,
      stockAvailable: 4,
      coverColor: '#B5793A',
      coverAccent: '#FFF4E0',
      shelves: ['sore-hujan'],
      isFeatured: false,
      description:
        'Tiga bersaudara menghabiskan liburan di pulau kecil bersama kakek mereka, penjaga mercusuar terakhir di pesisir selatan. Lalu suatu malam, lampu mercusuar padam sendiri.',
      curatorNote: 'Favorit pengunjung cilik kami. Orang tuanya juga diam-diam ikut membaca.',
      chapters: [],
    },
    {
      id: 7,
      slug: 'rumah-tropis',
      title: 'Rumah Tropis',
      subtitle: 'Arsitektur yang Bernapas',
      author: 'Galih Pratama',
      publisher: 'Arsip Kota',
      year: 2020,
      isbn: '978-602-03-9921-8',
      category: 'Desain',
      topics: ['arsitektur', 'desain', 'iklim', 'rumah'],
      format: 'physical',
      pageCount: 240,
      stockTotal: 1,
      stockAvailable: 1,
      coverColor: '#6B5E4F',
      coverAccent: '#EDE4D3',
      shelves: [],
      isFeatured: false,
      description:
        'Tentang atap lebar, ventilasi silang, dan teritisan yang dalam. Bagaimana rumah tradisional Nusantara menjawab panas dan hujan jauh sebelum ada pendingin ruangan.',
      curatorNote: 'Hanya satu eksemplar dan hanya bisa dibaca di tempat setiap Sabtu.',
      chapters: [],
    },
    {
      id: 8,
      slug: 'belajar-logika-pemrograman',
      title: 'Belajar Logika Pemrograman',
      subtitle: 'Berpikir Seperti Komputer, Tetap Seperti Manusia',
      author: 'Yoga Pramudita',
      publisher: 'Kode Kita',
      year: 2024,
      isbn: '978-623-88-1032-4',
      category: 'Teknologi',
      topics: ['pemrograman', 'logika', 'algoritma', 'pemula'],
      format: 'physical',
      pageCount: 204,
      stockTotal: 3,
      stockAvailable: 3,
      coverColor: '#E9DFC9',
      coverAccent: '#1E1E1E',
      shelves: [],
      isFeatured: false,
      description:
        'Pengantar logika pemrograman tanpa harus langsung menghafal sintaks. Pakai contoh sehari-hari: antre di bank, memasak nasi goreng, dan menyusun jadwal ronda.',
      curatorNote: 'Cocok untuk siswa SMA atau siapa pun yang pernah merasa "aku bukan orang teknik".',
      chapters: [],
    },
  ];

  return { curatorNote, shelves, books };
});
