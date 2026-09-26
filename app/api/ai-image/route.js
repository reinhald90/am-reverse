/*
 * AI Image Generator (Text to Image)
 * Reverse engineered dari live3d.io dengan RSA + AES crypto headers
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const router = express.Router();

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`;

const APP_ID = 'aifaceswap';
const U_ID = '1H5tRtzsBkqXcaJ';
const FN_NAME = 'demo-ai-body-v1';
const BRAND_KEY = '8f3f0c7387123ae0';
const THEME_VERSION = '83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q';

function generateRandomString(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
}

function aesenc(data, key) {
  const k = CryptoJS.enc.Utf8.parse(key);
  return CryptoJS.AES.encrypt(data, k, {
    iv: k, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
  }).toString();
}

function rsaenc(data) {
  const buffer = Buffer.from(data, 'utf8');
  return crypto.publicEncrypt(
    { key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
    buffer
  ).toString('base64');
}

function genCryptoHeaders(type, fp = null) {
  const now = new Date();
  const n = Math.floor(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()
  ) / 1000);
  const r = crypto.randomUUID();
  const i = generateRandomString(16);
  const fingerPrint = fp || crypto.randomBytes(16).toString('hex');
  const s = rsaenc(i);

  const signStr = (type === 'upload')
    ? `${APP_ID}:${r}:${s}`
    : `${APP_ID}:${U_ID}:${n}:${r}:${s}`;

  return {
    fp: fingerPrint,
    fp1: aesenc(`${APP_ID}:${fingerPrint}`, i),
    'x-guide': s,
    'x-sign': aesenc(signStr, i),
    'x-code': Date.now().toString()
  };
}

async function createJob(prompt, negativePrompt, model = 'AbsoluteReality_v1.8.1.safetensors', cfg = 7) {
  const cryptoHeaders = genCryptoHeaders('create');
  const payload = {
    fn_name: FN_NAME,
    call_type: 3,
    data: '',
    input: {
      cfg,
      lora: [],
      model,
      negative_prompt: negativePrompt || '(worst quality, low quality:1.4), deformed, ugly, bad anatomy, extra limbs',
      prompt,
      request_from: 9
    },
    origin_from: BRAND_KEY,
    request_from: 9
  };

  const res = await axios.post('https://app-v1.live3d.io/aitools/of/create', payload, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      'theme-version': THEME_VERSION,
      ...cryptoHeaders
    },
    timeout: 30000
  });

  if (res.data.code !== 200) throw new Error(res.data.message || 'Failed to create job');
  return { taskId: res.data.data.task_id, fp: cryptoHeaders.fp };
}

async function checkJob(taskId, fp) {
  const cryptoHeaders = genCryptoHeaders('check', fp);
  const payload = {
    task_id: taskId,
    fn_name: FN_NAME,
    call_type: 3,
    request_from: 9,
    origin_from: BRAND_KEY
  };

  const res = await axios.post('https://app-v1.live3d.io/aitools/of/check-status', payload, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
      'theme-version': THEME_VERSION,
      ...cryptoHeaders
    },
    timeout: 30000
  });
  return res.data.data;
}

router.post('/', async (req, res) => {
  try {
    const { prompt, negative_prompt, model, cfg } = req.body || {};
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Prompt wajib diisi' });
    }

    const start = Date.now();
    const { taskId, fp } = await createJob(
      prompt.trim(),
      negative_prompt,
      model,
      cfg ? Number(cfg) : 7
    );

    let result;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));
      result = await checkJob(taskId, fp);

      if (result.status === 2) break;
      if (result.status === 3) throw new Error('Task failed / blocked by safety filter');
      attempts++;
    }

    if (!result || result.status !== 2) throw new Error('Polling timeout, coba lagi');

    return res.json({
      success: true,
      data: {
        task_id: taskId,
        prompt,
        negative_prompt: negative_prompt || '',
        image_url: 'https://temp.live3d.io/' + result.result_image,
        runtime_ms: Date.now() - start
      }
    });
  } catch (e) {
    console.error('[AI-Image]', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/', (req, res) => {
  res.json({ success: true, message: 'AI Image Generator — POST { prompt, negative_prompt }' });
});

module.exports = router;
