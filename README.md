# UMKM ERP Lite

**Sistem Perencanaan Sumber Daya Perusahaan untuk Usaha Mikro, Kecil, dan Menengah**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat&logo=javascript&logoColor=black)
![IndexedDB](https://img.shields.io/badge/IndexedDB-Offline--first-4A90D9?style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

**UMKM ERP Lite** adalah aplikasi manajemen bisnis lengkap yang berjalan sepenuhnya di browser. Tanpa backend, tanpa framework, cukup buka file `index.html` dan semua fitur siap digunakan. Data tersimpan aman di **IndexedDB** browser Anda, mendukung operasional **offline** penuh.

---

## 🚀 Fitur Utama

| Modul | Deskripsi |
|---|---|
| **Dashboard** | KPI keuangan, penjualan, pelanggan, stok, BEP, ROI, grafik omzet & produk terlaris |
| **Penjualan (POS)** | Transaksi lengkap: diskon, pajak, multi-pembayaran, cetak nota, update stok otomatis |
| **Pembelian** | Purchase order, penerimaan barang, utang supplier, update stok otomatis |
| **Produk** | Manajemen produk, SKU auto-generate, kategori, satuan, varian & bundling |
| **Persediaan** | Stok real-time, mutasi stok, penyesuaian manual, alert stok menipis |
| **Pelanggan** | Data pelanggan, segmentasi (retail, reseller, VIP), riwayat pembelian |
| **Supplier** | Data supplier, rating, info bank, ketentuan pembayaran |
| **Keuangan** | Pengeluaran (COGS/OPEX/CAPEX), pemasukan non-penjualan, laba rugi, arus kas, neraca, aset & penyusutan |
| **Marketing** | Kampanye, leads, metrik (CAC, ROAS, conversion rate) |
| **SDM** | Karyawan, absensi, penggajian (slip gaji) |
| **Produksi** | Bahan baku, Bill of Materials (BOM), Work Order (WO), penyelesaian produksi otomatis |
| **Operasional** | Tugas harian, Quality Control (QC) |
| **Analitik** | Profitabilitas produk, tren penjualan, breakdown biaya, forecasting |
| **Backup & Restore** | Export/import JSON, CSV, Excel (XLSX), reset database |
| **Pengaturan** | Profil usaha, pajak, tema (light/dark/auto), warna primer kustom |
| **Dokumen** | Riwayat & cetak ulang Invoice, Purchase Order, Work Order |

---

## 💯 Prinsip Desain

- **Offline-first** – Semua data tersimpan di IndexedDB, tidak perlu internet.
- **Zero-dependency** – Murni HTML, CSS, JavaScript native. Tidak perlu npm, Node.js, atau framework.
- **SPA Architecture** – Satu halaman `index.html`, navigasi hash-based yang cepat.
- **Responsive** – Nyaman digunakan di HP, tablet, maupun desktop.
- **Portabel** – Backup & restore data dalam JSON/CSV/Excel, bebas dipindahkan antar perangkat.
- **Keamanan** – Seluruh input di-escape untuk mencegah XSS, validasi ketat, snapshot harga di setiap transaksi.

---

## 📦 Instalasi & Menjalankan

### Prasyarat
- Browser modern: **Chrome 120+**, **Firefox 120+**, **Safari 17+**, atau **Edge 120+**

### Cara Menjalankan
1. **Clone repositori ini** atau download ZIP dan ekstrak.
   ```bash
   git clone https://github.com/faizabdillahh/umkm-erp-lite.git
   ```
2. Buka folder `umkm-erp-lite/`.
3. **Klik dua kali `index.html`** atau drag & drop ke browser.
4. Aplikasi langsung berjalan! Tidak ada proses build.

> ⚠️ **Penting**: Untuk fitur Export Excel (XLSX), pastikan Anda terkoneksi internet saat pertama kali membuka (CDN SheetJS akan di-cache browser). Setelahnya bisa offline.

### Opsional: Jalankan dengan Local Server
Beberapa browser membatasi IndexedDB jika diakses via `file://`. Jika mengalami masalah, jalankan dengan server lokal:
```bash
# Python 3
python -m http.server 8080

# atau dengan Node.js (npx)
npx serve .
```

---

## 📁 Struktur Proyek

```
umkm-erp-lite/
├── index.html                    # Entry point SPA
├── assets/
│   ├── css/
│   │   ├── main.css              # Variabel, reset, layout utama
│   │   ├── components.css        # Tombol, form, tabel, card, modal
│   │   ├── dashboard.css         # Grid KPI, chart
│   │   └── print.css             # Styling cetak invoice/laporan
│   ├── js/
│   │   ├── core/
│   │   │   ├── app.js            # Bootstrap & inisialisasi DB
│   │   │   ├── router.js         # Hash-based SPA router
│   │   │   ├── state.js          # Global state & cache
│   │   │   ├── db.js             # IndexedDB wrapper (Promise-based)
│   │   │   ├── eventbus.js       # Pub/sub event system
│   │   │   └── utils.js          # Format IDR, tanggal, escape HTML
│   │   ├── modules/
│   │   │   ├── dashboard.js      # Dashboard & KPI cards
│   │   │   ├── penjualan.js      # Point of Sale (POS)
│   │   │   ├── pembelian.js      # Purchase Order
│   │   │   ├── produk.js         # Manajemen produk
│   │   │   ├── persediaan.js     # Stok & mutasi
│   │   │   ├── pelanggan.js      # Manajemen pelanggan
│   │   │   ├── supplier.js       # Manajemen supplier
│   │   │   ├── master-data.js    # Kategori & satuan
│   │   │   ├── keuangan.js       # Pengeluaran, pemasukan, laporan keuangan
│   │   │   ├── marketing.js      # Kampanye & leads
│   │   │   ├── sdm.js            # Karyawan, absensi, penggajian
│   │   │   ├── produksi.js       # Bahan baku, BOM, Work Order
│   │   │   ├── operasional.js    # Tugas & QC
│   │   │   ├── analitik.js       # Profitabilitas, tren, forecasting
│   │   │   ├── backup.js         # Export/import data
│   │   │   ├── pengaturan.js     # Konfigurasi & tema
│   │   │   └── dokumen.js        # Riwayat & cetak ulang dokumen
│   │   └── services/
│   │       └── calc.js           # Formula bisnis (HPP, BEP, ROI, dll)
│   └── icons/
│       └── icons.svg             # SVG icons
├── README.md                     # Dokumen ini
└── .gitignore
```

---

## 🧪 Testing

Proyek ini dilengkapi dengan **daftar pengujian 128 test case** yang mencakup:

- Unit test untuk fungsi kalkulasi (`calc.js`) & utilitas (`utils.js`)
- Integration test alur bisnis utama (penjualan, pembelian, produksi)
- UI/UX & navigasi
- Dark mode & tema
- Aksesibilitas (keyboard navigation, ARIA, kontras)
- Keamanan (XSS, sanitasi input, snapshot harga)
- Performa (rendering 100+ item, debounce, cache)
- Cross-browser (Chrome, Firefox, Safari, Edge, Android, iOS)
- Data integrity & edge cases

Lihat file [TESTING.md](TESTING.md) atau bagian **Testing Checklist** di dokumentasi untuk detail lengkap.

---

## 📈 Dashboard Preview

![Dashboard Preview](assets/screenshots/dashboard.png)

*Dashboard menampilkan KPI keuangan, penjualan, stok, dan grafik omzet interaktif.*

---

## 🔧 Kustomisasi

1. **Profil Usaha**: Ubah nama usaha, logo, alamat di menu **Pengaturan**.
2. **Tema**: Pilih Light / Dark / Auto, dan warna primer sesuka Anda.
3. **Pajak Default**: Atur tarif PPN di Pengaturan → Konfigurasi Keuangan.
4. **Backup Rutin**: Aplikasi mengingatkan Anda jika belum backup lebih dari 7 hari.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT**. Silakan gunakan, modifikasi, dan distribusikan secara bebas. Lihat [LICENSE](LICENSE) untuk detail.

---

## 💬 Umpan Balik & Kontribusi

Punya ide, bug, atau ingin berkontribusi? Silakan buka [Issues](https://github.com/username/umkm-erp-lite/issues) atau kirim Pull Request. Semua masukan sangat dihargai!

---

**Dibangun dengan ❤️ untuk UMKM Indonesia.**