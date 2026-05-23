Berikut isi file `TESTING.md` untuk proyek **UMKM ERP Lite** yang bisa langsung Anda tempelkan di root folder `ERP-UMKM-STATIS`.

```markdown
# 🧪 Panduan Pengujian UMKM ERP Lite

Dokumen ini menjelaskan pendekatan, alat, dan langkah-langkah pengujian untuk memastikan kualitas dan keandalan aplikasi UMKM ERP Lite.

## 📌 Tujuan

- Memastikan seluruh fungsi perhitungan bisnis (`calc.js`) menghasilkan output yang benar.
- Memastikan fungsi utilitas (`utils.js`) bekerja sesuai spesifikasi.
- Menjaga stabilitas aplikasi saat dilakukan perubahan kode (regression).
- Memudahkan identifikasi bug lebih awal.

## 🧰 Alat yang Digunakan

- **[Jest](https://jestjs.io/)** – Framework pengujian unit untuk JavaScript.
- **Babel** – Transpilasi modul ES6 agar kompatibel dengan Jest.

## 📁 Struktur Pengujian

```
ERP-UMKM-STATIS/
├── assets/
│   └── js/
│       ├── core/
│       │   └── utils.js              # file sumber
│       ├── services/
│       │   └── calc.js               # file sumber
│       └── __tests__/                # direktori test
│           ├── calc.test.js
│           └── utils.test.js
├── package.json
├── babel.config.json
└── TESTING.md
```

## ⚙️ Persiapan Lingkungan Test

1. **Inisialisasi proyek Node.js** (jika belum ada `package.json`):
   ```bash
   npm init -y
   ```

2. **Instal dependensi pengujian**:
   ```bash
   npm install --save-dev jest @babel/core @babel/preset-env babel-jest
   ```

3. **Buat file konfigurasi Babel** (`babel.config.json`):
   ```json
   {
     "presets": ["@babel/preset-env"]
   }
   ```

4. **Tambahkan script test di `package.json`**:
   ```json
   "scripts": {
     "test": "jest"
   }
   ```

## 🚀 Menjalankan Test

- **Semua test**:
  ```bash
  npm test
  ```
- **Test spesifik**:
  ```bash
  npm test -- calc.test.js
  ```
- **Watch mode** (untuk pengembangan):
  ```bash
  npm test -- --watch
  ```

## 📋 Cakupan Unit Test

### 1. `calc.test.js` – Fungsi Perhitungan Bisnis

Semua fungsi dalam `services/calc.js` diuji dengan kasus normal dan kasus batas.

| Fungsi | Skenario yang Diuji |
|--------|----------------------|
| `hpp()` | Tanpa overhead, dengan overhead 20%, dengan wasteFactor |
| `hppWithOverhead()` | Overhead ditambahkan langsung |
| `sellPrice()` | Harga jual dari margin target |
| `grossMargin()` | Normal, jual rugi (negatif) |
| `netMargin()` | Laba bersih setelah OPEX |
| `markup()` | Markup dari HPP |
| `bepUnit()` | Normal, margin kontribusi negatif → Infinity |
| `bepRevenue()` | BEP dalam rupiah |
| `clv()` | Customer Lifetime Value |
| `cac()` | Normal, newCustomers = 0 → Infinity |
| `inventoryTurnover()` | Perputaran stok |
| `daysInventory()` | Hari persediaan |
| `reorderPoint()` | Titik reorder (ROP) |
| `roi()` | Normal, investment = 0 → Infinity |
| `currentRatio()` | Rasio lancar |
| `quickRatio()` | Rasio cepat |
| `depreciationStraightLine()` | Penyusutan garis lurus |
| `ebitda()` | EBITDA |
| `roas()` | Normal, adSpend = 0 → Infinity |
| `ctr()` | Click-through rate |
| `conversionRate()` | Conversion rate |
| `growthRate()` | Normal, previous = 0 → Infinity |

### 2. `utils.test.js` – Fungsi Utilitas

| Fungsi | Skenario yang Diuji |
|--------|----------------------|
| `formatIDR()` | Format mata uang Rupiah |
| `formatDate()` | Berbagai format tanggal (`dd/mm/yyyy`, `yyyy-mm-dd`) |
| `escapeHtml()` | Mencegah injeksi XSS |
| `sanitizeNumber()` | Membersihkan input string menjadi angka |
| `generateDocumentNumber()` | Format dokumen `INV/YYYYMMDD/NNNN` |

## ✍️ Menulis Test Baru

1. Letakkan file test di `assets/js/__tests__/` dengan nama `*.test.js`.
2. Gunakan sintaks **ESM** (`import`/`export`).
3. Struktur dasar:
   ```javascript
   import { namaFungsi } from '../path/ke/module.js';

   describe('namaFungsi', () => {
     test('deskripsi kasus', () => {
       expect(namaFungsi(...)).toBe(expectedValue);
     });
   });
   ```
4. Pastikan semua fungsi yang diuji sudah di-export dari modul sumber.

## 🔮 Rencana Pengujian Lanjutan

- **Integration Test** – Belum diimplementasikan, akan mencakup alur pengguna (user flow) seperti POS dan manajemen stok.
- **Manual Testing Checklist** – Untuk modul berbasis DOM (Dashboard, POS, dll), pengujian dilakukan secara manual dengan checklist yang disediakan (akan dilampirkan terpisah).
- **Automated UI Test** – Setelah proyek stabil, dapat menggunakan **Cypress** atau **Playwright** untuk tes end-to-end.

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT**. Silakan gunakan, modifikasi, dan distribusikan secara bebas. Lihat [LICENSE](LICENSE.md) untuk detail.