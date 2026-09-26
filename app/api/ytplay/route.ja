const express = require('express');
const axios = require('axios');
const router = express.Router();

const API_BASE = 'https://api.ikyyxd.my.id';

router.post('/', async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Query wajib diisi' });
    }

    const { data } = await axios.get(
      `${API_BASE}/search/ytplayv2?q=${encodeURIComponent(query.trim())}`,
      { timeout: 30000 }
    );

    if (!data.status) {
      return res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
    }

    const r = data.result;
    return res.json({
      success: true,
      data: {
        title: r.title,
        thumbnail: r.thumbnail,
        duration: r.duration,
        duration_formatted: `${Math.floor(r.duration / 60)}:${String(r.duration % 60).padStart(2, '0')}`,
        source: r.source,
        audio_url: r.audio?.url || r.audio,
        video_url: r.video?.url || null
      }
    });
  } catch (e) {
    console.error('[YTPlay]', e.message);
    res.status(500).json({ success: false, message: 'Gagal memproses: ' + e.message });
  }
});

router.get('/', (req, res) => {
  res.json({ success: true, message: 'YouTube Play API — POST { query }' });
});

module.exports = router;
