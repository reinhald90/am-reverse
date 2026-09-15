/**
 * Temp Mail API — mail.tm Proxy
 * Route: /api/tempmail?action=xxx
 *
 * PERBAIKAN dari versi asal:
 * 1. safeFetchJson() — validasi status + content-type sebelum parse JSON,
 *    supaya gak throw "Unexpected token <" saat mail.tm balikin HTML/error page.
 * 2. Timeout per-request (AbortController) — biar gak nyangkut sampai
 *    Vercel function timeout (10s di Hobby plan).
 * 3. Validasi domain kosong sebelum lanjut create account.
 * 4. Error message lebih jelas biar gampang di-debug dari log Vercel.
 */

const MAILTM_API = 'https://api.mail.tm'
const FETCH_TIMEOUT_MS = 8000 // di bawah limit 10s Vercel Hobby

/* ══════════════════════════════════════════
   CORS HEADERS
   ══════════════════════════════════════════ */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

/* ══════════════════════════════════════════
   HELPER — fetch dengan timeout + safe JSON parse
   ══════════════════════════════════════════ */

async function safeFetchJson(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res
  try {
    res = await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw new Error(`Timeout: ${url} tidak merespons dalam ${FETCH_TIMEOUT_MS}ms`)
    }
    throw new Error(`Network error saat fetch ${url}: ${err.message}`)
  }
  clearTimeout(timer)

  const contentType = res.headers.get('content-type') || ''
  const raw = await res.text()

  // mail.tm kadang balikin HTML (error page / rate limit / cloudflare block)
  // alih-alih JSON. Tangkap ini sebelum JSON.parse supaya errornya jelas.
  if (!contentType.includes('application/json') && !contentType.includes('application/ld+json')) {
    throw new Error(
      `Response bukan JSON dari ${url} (status ${res.status}). ` +
      `Kemungkinan mail.tm memblokir IP Vercel atau sedang down. ` +
      `Cuplikan response: ${raw.slice(0, 150)}`
    )
  }

  let data
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch (err) {
    throw new Error(`Gagal parse JSON dari ${url}: ${err.message}. Raw: ${raw.slice(0, 150)}`)
  }

  return { ok: res.ok, status: res.status, data }
}

/* ══════════════════════════════════════════
   OPTIONS (CORS preflight)
   ══════════════════════════════════════════ */

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

/* ══════════════════════════════════════════
   GET — domains, messages, message
   ══════════════════════════════════════════ */

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    // --- DOMAINS ---
    if (action === 'domains') {
      const { status, data } = await safeFetchJson(`${MAILTM_API}/domains?page=1`)
      return Response.json(data, { status, headers: CORS })
    }

    // --- MESSAGES ---
    if (action === 'messages') {
      const auth = request.headers.get('authorization')
      if (!auth) {
        return Response.json(
          { success: false, error: 'Missing auth' },
          { status: 401, headers: CORS }
        )
      }
      const { status, data } = await safeFetchJson(`${MAILTM_API}/messages?page=1`, {
        headers: { Authorization: auth }
      })
      return Response.json({
        success: true,
        messages: data['hydra:member'] || [],
        total: data['hydra:totalItems'] || 0
      }, { status, headers: CORS })
    }

    // --- MESSAGE DETAIL ---
    if (action === 'message') {
      const auth = request.headers.get('authorization')
      const id = searchParams.get('id')
      if (!auth || !id) {
        return Response.json(
          { success: false, error: 'Missing auth or id' },
          { status: 400, headers: CORS }
        )
      }
      const { status, data } = await safeFetchJson(`${MAILTM_API}/messages/${id}`, {
        headers: { Authorization: auth }
      })
      return Response.json(
        { success: true, message: data },
        { status, headers: CORS }
      )
    }

    return Response.json(
      { success: false, error: 'Invalid action', available: ['domains', 'messages', 'message'] },
      { status: 400, headers: CORS }
    )

  } catch (error) {
    console.error('[tempmail GET error]', error)
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: CORS }
    )
  }
}

/* ══════════════════════════════════════════
   POST — create inbox
   ══════════════════════════════════════════ */

export async function POST(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    // --- CREATE INBOX ---
    if (action === 'create') {
      // 1. Ambil domain aktif
      const { data: domainsData } = await safeFetchJson(`${MAILTM_API}/domains?page=1`)
      const domain = domainsData['hydra:member']?.[0]?.domain

      if (!domain) {
        return Response.json(
          { success: false, error: 'Tidak ada domain aktif dari mail.tm — coba lagi beberapa saat' },
          { status: 502, headers: CORS }
        )
      }

      // 2. Generate username & password (dipastikan cukup panjang)
      const username = 'am' + Math.random().toString(36).slice(2, 11)
      const email = `${username}@${domain}`
      const password = Math.random().toString(36).slice(2, 15).padEnd(10, '0') + 'Aa1!'

      // 3. Create account
      const createResult = await safeFetchJson(`${MAILTM_API}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password })
      })

      if (!createResult.ok) {
        const err = createResult.data
        return Response.json({
          success: false,
          error: err.message || err['hydra:description'] || `Gagal buat inbox (status ${createResult.status})`
        }, { status: createResult.status, headers: CORS })
      }

      // 4. Login untuk token
      const loginResult = await safeFetchJson(`${MAILTM_API}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password })
      })

      if (!loginResult.data.token) {
        return Response.json(
          { success: false, error: 'Akun berhasil dibuat tapi gagal login untuk ambil token' },
          { status: 502, headers: CORS }
        )
      }

      return Response.json({
        success: true,
        email,
        password,
        token: loginResult.data.token,
        accountId: loginResult.data.id
      }, { headers: CORS })
    }

    return Response.json(
      { success: false, error: 'Invalid action', available: ['create'] },
      { status: 400, headers: CORS }
    )

  } catch (error) {
    console.error('[tempmail POST error]', error)
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: CORS }
    )
  }
}

/* ══════════════════════════════════════════
   DELETE — delete account
   ══════════════════════════════════════════ */

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const auth = request.headers.get('authorization')

  try {
    if (!auth || !id) {
      return Response.json(
        { success: false, error: 'Missing auth or id' },
        { status: 400, headers: CORS }
      )
    }
    const { status, ok } = await safeFetchJson(`${MAILTM_API}/accounts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: auth }
    })
    return Response.json({ success: ok }, { status, headers: CORS })
  } catch (error) {
    console.error('[tempmail DELETE error]', error)
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: CORS }
    )
  }
}
