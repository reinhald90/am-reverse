/**
 * Temp Mail API Proxy — mail.tm
 * Route: /api/tempmail?action=xxx
 * 
 * Actions:
 *   - domains  : GET list domain aktif
 *   - create   : POST generate inbox baru
 *   - messages : GET list pesan di inbox (butuh auth)
 *   - message  : GET detail 1 pesan (butuh ?id=xxx)
 *   - delete   : DELETE account
 */

const MAILTM_API = 'https://api.mail.tm'

/* ==========================================
 *           CORS HEADERS
 * ========================================== */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

/* ==========================================
 *           OPTIONS (preflight)
 * ========================================== */

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

/* ==========================================
 *           GET — domains, messages, message
 * ========================================== */

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    /* ---------- 1. DOMAINS ---------- */
    if (action === 'domains') {
      const r = await fetch(`${MAILTM_API}/domains?page=1`)
      const data = await r.json()
      return Response.json(data, { status: r.status, headers: CORS })
    }

    /* ---------- 2. MESSAGES ---------- */
    if (action === 'messages') {
      const auth = request.headers.get('authorization')
      if (!auth) {
        return Response.json(
          { success: false, error: 'Missing auth header' },
          { status: 401, headers: CORS }
        )
      }

      const r = await fetch(`${MAILTM_API}/messages?page=1`, {
        headers: { Authorization: auth }
      })
      const data = await r.json()

      return Response.json({
        success: true,
        messages: data['hydra:member'] || [],
        total: data['hydra:totalItems'] || 0
      }, { status: r.status, headers: CORS })
    }

    /* ---------- 3. MESSAGE DETAIL ---------- */
    if (action === 'message') {
      const auth = request.headers.get('authorization')
      const id = searchParams.get('id')

      if (!auth || !id) {
        return Response.json(
          { success: false, error: 'Missing auth or id' },
          { status: 400, headers: CORS }
        )
      }

      const r = await fetch(`${MAILTM_API}/messages/${id}`, {
        headers: { Authorization: auth }
      })
      const data = await r.json()

      return Response.json({
        success: true,
        message: data
      }, { status: r.status, headers: CORS })
    }

    /* ---------- DEFAULT ---------- */
    return Response.json(
      { success: false, error: 'Invalid action' },
      { status: 400, headers: CORS }
    )

  } catch (error) {
    console.error('[tempmail GET] Error:', error)
    return Response.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500, headers: CORS }
    )
  }
}

/* ==========================================
 *           POST — create inbox
 * ========================================== */

export async function POST(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    /* ---------- CREATE INBOX ---------- */
    if (action === 'create') {
      // 1. Ambil domain aktif
      const domainsRes = await fetch(`${MAILTM_API}/domains?page=1`)
      const domainsData = await domainsRes.json()

      const domain = domainsData['hydra:member']?.[0]?.domain
      if (!domain) {
        return Response.json(
          { success: false, error: 'Tidak ada domain aktif' },
          { status: 500, headers: CORS }
        )
      }

      // 2. Generate username random
      const username = 'am' + Math.random().toString(36).slice(2, 11)
      const email = `${username}@${domain}`
      const password = Math.random().toString(36).slice(2, 15) + 'Aa1!'

      // 3. Create account
      const createRes = await fetch(`${MAILTM_API}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password })
      })

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        return Response.json({
          success: false,
          error: err.message || err['hydra:description'] || 'Gagal buat inbox'
        }, { status: createRes.status, headers: CORS })
      }

      // 4. Login untuk dapat token
      const loginRes = await fetch(`${MAILTM_API}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password })
      })

      const loginData = await loginRes.json()

      if (!loginData.token) {
        return Response.json(
          { success: false, error: 'Gagal login ke inbox' },
          { status: 500, headers: CORS }
        )
      }

      return Response.json({
        success: true,
        email,
        password,
        token: loginData.token,
        accountId: loginData.id
      }, { headers: CORS })
    }

    return Response.json(
      { success: false, error: 'Invalid POST action' },
      { status: 400, headers: CORS }
    )

  } catch (error) {
    console.error('[tempmail POST] Error:', error)
    return Response.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500, headers: CORS }
    )
  }
}

/* ==========================================
 *           DELETE — delete account
 * ========================================== */

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

    const r = await fetch(`${MAILTM_API}/accounts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: auth }
    })

    return Response.json({ success: r.ok }, { status: r.status, headers: CORS })

  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: CORS }
    )
  }
        }
