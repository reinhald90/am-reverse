<div align="center">

# ⚡ Omni Azure Asahiro

**AlightMotion Premium Activator · CapCut Templates · Web to APK Builder**

*reverse engineered — CLI & Web, no ads, no tracking, no bullshit*

**live:** [am.neonode.my.id](https://am.neonode.my.id)

<br>

<img src="https://img.shields.io/badge/status-unofficial-orange?style=flat-square" alt="">
<img src="https://img.shields.io/badge/reverse--engineering-deep-red?style=flat-square" alt="">
<img src="https://img.shields.io/badge/node-18%2B-green?style=flat-square" alt="">
<img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="">
<img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="">

<br><br>

**team reverse — neo:** ansari • zenno

<a href="https://whatsapp.com/channel/0029VbDz1xsEQIau8FQEtF16">
  <img src="https://img.shields.io/badge/Join-WhatsApp_Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp Channel">
</a>

</div>

---

> ⚠️ **UNOFFICIAL — bukan alat resmi dari Alight Creative.**
>
> Dibuat murni dari **reverse engineering mendalam** terhadap aplikasi Android Alight Motion: trafik di-sniff, protokol Firebase Auth & endpoint `verifyPurchase` dibedah, lalu di-reimplement jadi CLI + web dengan UI premium modern.
>
> Kalau kelakuanmu kena ban, **tanggung sendiri**.

---

## 📖 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Fitur Bonus (Tools Tambahan)](#-fitur-bonus-tools-tambahan)
- [Cara Pakai](#-cara-pakai)
- [Struktur Proyek](#-struktur-proyek)
- [API Endpoints](#-api-endpoints)
- [Environment & Requirements](#-environment--requirements)
- [Deployment](#-deployment)
- [Disclaimer](#-disclaimer)

---

## ✨ Fitur Utama

### 🔐 Alight Motion Premium Activator
Inti dari aplikasi ini — aktivasi premium Alight Motion secara gratis.

| Fitur | Deskripsi |
|-------|-----------|
| **Magic Link Login** | Masuk pake email doang, tanpa password, tanpa akun Google |
| **Premium Auto-Activate** | Langsung nempel ke akun setelah verifikasi magic link |
| **Auto Refresh Token** | Aktivasi ulang kapan aja dari sesi tersimpan (ID token di-cache) |
| **Dual Mode** | CLI buat yang mager, Web UI buat yang mau tampilan cakep |
| **Stealth Headers** | Nyamar 100% sebagai app Android asli (`x-android-package` + `x-android-cert`) |
| **Multi Email Mode** | Email pribadi atau generate random dari 4+ domain duckzmail |
| **Inbox Viewer** | Cek email masuk langsung di web — tanpa buka Gmail |
| **Auto-Verify** | 1 klik langsung verifikasi magic link dari inbox |
| **Auto-Copy Link** | Magic link auto-copy ke clipboard begitu masuk |
| **Terminal Log** | Proses aktivasi real-time dengan log terminal keren |
| **Riwayat Aktivasi** | History 10 aktivasi terakhir (localStorage) |

---

## 🎁 Fitur Bonus (Tools Tambahan)

### 🎬 CapCut Templates Search
Cari template CapCut viral (video & image) langsung dari web.

- ✅ Search by keyword — video & image tabs
- ✅ Preview cover, duration, use count, like count
- ✅ Klik "Use" → langsung buka di CapCut
- ✅ Copy link template 1 klik
- ✅ Proxy rotation otomatis (5x retry) — anti rate-limit
- ✅ Backend fallback ke CORS proxy publik

### 📦 Web to APK Builder
Convert website apa pun jadi aplikasi Android (.apk) secara gratis.

- ✅ Custom app name + package name (validated)
- ✅ Custom icon (URL) — fallback dummy PNG
- ✅ Version name & code
- ✅ Orientation: Auto / Portrait / Landscape
- ✅ Splash type: Image / Text
- ✅ Live progress bar (4-step)
- ✅ Proxy rotation + stealth headers (Chrome 123-125 Android)
- ✅ 5x auto-retry, download link otomatis

### 💬 Community & Support
- 📢 **Channel WhatsApp Resmi** — [join di sini](https://whatsapp.com/channel/0029VbDz1xsEQIau8FQEtF16)
- Info update terbaru
- Support & bug report

### 🎨 UI/UX Premium
- Glassmorphism dark theme
- Aurora background animation
- Particle system + confetti
- Sound FX (Web Audio API)
- Toast notifications
- Keyboard shortcuts (Ctrl+K, Ctrl+G, Ctrl+M, dll)
- Responsive mobile-first

---

## 🚀 Cara Pakai

### Prerequisites

- **Node.js** v18 atau lebih baru
- **npm** atau **yarn**
- Koneksi internet (buat hit proxy API)

### CLI Mode

```bash
# Clone repo
git clone https://github.com/username/am-neo.git
cd am-neo

# Install dependencies
npm install

# Jalankan CLI
node am.js
