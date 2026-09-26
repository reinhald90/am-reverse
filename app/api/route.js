/**
 * ═══════════════════════════════════════════════════════════════════════
 *  OMNI AZURE ASAHIRO · API ROUTER
 *  Auto-load routes dengan safe fallback — tidak crash kalau file hilang
 * ═══════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/* ─────────────────────────────────────────────────────────────────────────
   ROUTE REGISTRY
   Tambah route baru di sini, auto-detect kalau file-nya ada
   ───────────────────────────────────────────────────────────────────────── */
const ROUTES = [
  // ── Core (wajib ada) ────────────────────────────────────────
  { mount: '/status',        dir: 'status',        label: 'Status',         required: true  },
  { mount: '/send-link',     dir: 'send-link',     label: 'Send Link',      required: true  },
  { mount: '/verify-link',   dir: 'verify-link',   label: 'Verify Link',    required: true  },
  { mount: '/stats',         dir: 'stats',         label: 'Stats',          required: true  },

  // ── Optional (auto-skip kalau belum ada) ────────────────────
  { mount: '/tempmail',      dir: 'tempmail',      label: 'Temp Mail',      required: false },
  { mount: '/capcut-search', dir: 'capcut-search', label: 'CapCut Search',  required: false },
  { mount: '/web2apk',       dir: 'web2apk',       label: 'Web to APK',     required: false },
  { mount: '/ytplay',        dir: 'ytplay',        label: 'YouTube Play',   required: false },
  { mount: '/ai-image',      dir: 'ai-image',      label: 'AI Image',       required: false },
];

/* ─────────────────────────────────────────────────────────────────────────
   SAFE ROUTE LOADER
   Return `null` kalau file tidak ada / error — tidak crash
   ───────────────────────────────────────────────────────────────────────── */
function safeRequire(dirName) {
  const routePath = path.join(__dirname, dirName, 'route.js');

  // 1. Cek file exist
  if (!fs.existsSync(routePath)) {
    return { ok: false, reason: 'missing', error: null };
  }

  // 2. Try load module
  try {
    const mod = require(`./${dirName}/route`);
    if (typeof mod !== 'function' && typeof mod !== 'object') {
      return { ok: false, reason: 'invalid-export', error: null };
    }
    return { ok: true, module: mod, error: null };
  } catch (err) {
    return { ok: false, reason: 'load-error', error: err.message };
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   REGISTER ROUTES
   ───────────────────────────────────────────────────────────────────────── */
const loaded = [];
const skipped = [];
const failed = [];

for (const { mount, dir, label, required } of ROUTES) {
  const result = safeRequire(dir);

  // ── Success ──────────────────────────────────────────────
  if (result.ok) {
    router.use(mount, result.module);
    loaded.push({ mount, label });
    console.log(`✅ [API] ${mount.padEnd(16)} → ${label}`);
    continue;
  }

  // ── File tidak ada ───────────────────────────────────────
  if (result.reason === 'missing') {
    if (required) {
      console.error(`❌ [API] ${mount.padEnd(16)} → MISSING (required!)`);
      // Register fallback route biar tidak 404 sembarangan
      router.all(mount, (req, res) => {
        res.status(503).json({
          success: false,
          message: `${label} belum tersedia di server ini`,
          hint: 'Cek konfigurasi deployment'
        });
      });
    } else {
      skipped.push({ mount, label, reason: 'file belum ada' });
      console.log(`⏭️  [API] ${mount.padEnd(16)} → SKIP (belum ada)`);
    }
    continue;
  }

  // ── Load error (syntax error, missing dep, dll) ──────────
  failed.push({ mount, label, error: result.error });
  console.error(`⚠️  [API] ${mount.padEnd(16)} → ERROR: ${result.error}`);

  // Register error route — biar user tau apa yang rusak
  router.all(mount, (req, res) => {
    res.status(500).json({
      success: false,
      message: `Route "${mount}" error saat load`,
      error: result.error
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   SUMMARY (muncul di Vercel logs)
   ───────────────────────────────────────────────────────────────────────── */
console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  🚀 OMNI AZURE ASAHIRO · API ROUTER');
console.log('═══════════════════════════════════════════════');
console.log(`  ✅ Loaded   : ${loaded.length} route`);
console.log(`  ⏭️  Skipped  : ${skipped.length} route`);
console.log(`  ❌ Failed   : ${failed.length} route`);
if (skipped.length) console.log(`     ↳ Skip: ${skipped.map(s => s.mount).join(', ')}`);
if (failed.length)  console.log(`     ↳ Fail: ${failed.map(s => s.mount).join(', ')}`);
console.log('═══════════════════════════════════════════════');
console.log('');

/* ─────────────────────────────────────────────────────────────────────────
   META ENDPOINT
   GET /api → lihat status semua route
   ───────────────────────────────────────────────────────────────────────── */
router.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Omni Azure Asahiro API',
    version: '7.3.0',
    channel: 'https://whatsapp.com/channel/0029VbDz1xsEQIau8FQEtF16',
    timestamp: new Date().toISOString(),
    routes: {
      loaded: loaded.map(r => ({ path: `/api${r.mount}`, label: r.label, status: 'active' })),
      skipped: skipped.map(r => ({ path: `/api${r.mount}`, label: r.label, status: 'skipped', reason: r.reason })),
      failed: failed.map(r => ({ path: `/api${r.mount}`, label: r.label, status: 'error', error: r.error })),
    },
    summary: {
      loaded: loaded.length,
      skipped: skipped.length,
      failed: failed.length,
      total: ROUTES.length
    }
  });
});

module.exports = router;
