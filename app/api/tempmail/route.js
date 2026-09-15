/**
 * Temp Mail API — Maildrop.cc GraphQL Proxy
 * Route: /api/tempmail?action=xxx
 *
 * Maildrop tidak butuh akun/password/token seperti mail.tm.
 * Semua mailbox pakai domain tetap "maildrop.cc", dan kamu bebas
 * pilih nama mailbox sendiri (mis. random string) — begitu ada yang
 * kirim email ke <mailbox>@maildrop.cc, otomatis bisa langsung dibaca
 * lewat query GraphQL di bawah, tanpa perlu "create" akun dulu.
 *
 * Referensi: https://maildrop.cc/api.html
 */

const MAILDROP_API = 'https://api.maildrop.cc/graphql'
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
   HELPER — GraphQL request dengan timeout + safe JSON parse
   ══════════════════════════════════════════ */

async function graphql(query, variables = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res
  try {
    res = await fetch(MAILDROP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal
    })
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw new Error(`Timeout: maildrop.cc tidak merespons dalam ${FETCH_TIMEOUT_MS}ms`)
    }
    throw new Error(`Network error saat menghubungi maildrop.cc: ${err.message}`)
  }
  clearTimeout(timer)

  const contentType = res.headers.get('content-type') || ''
  const raw = await res.text()

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Response bukan JSON dari maildrop.cc (status ${res.status}). ` +
      `Cuplikan response: ${raw.slice(0, 150)}`
    )
  }

  let body
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch (err) {
    throw new Error(`Gagal parse JSON dari maildrop.cc: ${err.message}. Raw: ${raw.slice(0, 150)}`)
  }

  // GraphQL selalu balas 200 walau ada error — errornya ada di body.errors
  if (body.errors && body.errors.length > 0) {
    throw new Error(`GraphQL error: ${body.errors.map(e => e.message).join('; ')}`)
  }

  return body.data
}

/* ══════════════════════════════════════════
   OPTIONS (CORS preflight)
   ══════════════════════════════════════════ */

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

/* ══════════════════════════════════════════
   GET — messages (inbox), message (detail)
   ══════════════════════════════════════════ */

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    // --- LIST INBOX ---
    if (action === 'messages') {
      const mailbox = searchParams.get('mailbox')
      if (!mailbox) {
        return Response.json(
          { success: false, error: 'Missing mailbox' },
          { status: 400, headers: CORS }
        )
      }

      const data = await graphql(
        `query Inbox($mailbox: String!) {
          inbox(mailbox: $mailbox) {
            id
            mailfrom
            headerfrom
            subject
            date
          }
        }`,
        { mailbox }
      )

      return Response.json({
        success: true,
        messages: data.inbox || [],
        total: (data.inbox || []).length
      }, { headers: CORS })
    }

    // --- MESSAGE DETAIL ---
    if (action === 'message') {
      const mailbox = searchParams.get('mailbox')
      const id = searchParams.get('id')
      if (!mailbox || !id) {
        return Response.json(
          { success: false, error: 'Missing mailbox or id' },
          { status: 400, headers: CORS }
        )
      }

      const data = await graphql(
        `query Message($mailbox: String!, $id: String!) {
          message(mailbox: $mailbox, id: $id) {
            id
            mailfrom
            headerfrom
            subject
            date
            html
            text
          }
        }`,
        { mailbox, id }
      )

      return Response.json(
        { success: true, message: data.message },
        { headers: CORS }
      )
    }

    return Response.json(
      { success: false, error: 'Invalid action', available: ['messages', 'message'] },
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
   POST — create mailbox (tidak butuh akun beneran,
   cukup "pilih" nama mailbox baru & pastikan domain hidup)
   ══════════════════════════════════════════ */

export async function POST(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    // --- CREATE MAILBOX ---
    if (action === 'create') {
      // Maildrop gak punya endpoint "buat akun" — mailbox otomatis aktif
      // begitu ada yang kirim email. Kita cukup generate nama random dan
      // pastikan API-nya hidup lewat query "ping".
      const pingData = await graphql(
        `query Ping($msg: String!) { ping(message: $msg) }`,
        { msg: 'health-check' }
      )

      if (!pingData || pingData.ping === undefined) {
        return Response.json(
          { success: false, error: 'Maildrop API tidak merespons dengan benar' },
          { status: 502, headers: CORS }
        )
      }

      const mailbox = 'am' + Math.random().toString(36).slice(2, 11)
      const email = `${mailbox}@maildrop.cc`

      return Response.json({
        success: true,
        email,
        mailbox // simpan ini di client — dipakai untuk query messages/message/delete
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
   DELETE — hapus satu pesan dari mailbox
   (Maildrop tidak punya konsep "hapus akun" seperti mail.tm,
   yang ada cuma hapus pesan individual)
   ══════════════════════════════════════════ */

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const mailbox = searchParams.get('mailbox')
  const id = searchParams.get('id')

  try {
    if (!mailbox || !id) {
      return Response.json(
        { success: false, error: 'Missing mailbox or id' },
        { status: 400, headers: CORS }
      )
    }

    const data = await graphql(
      `mutation DeleteMessage($mailbox: String!, $id: String!) {
        deleteMessage(mailbox: $mailbox, id: $id) {
          id
        }
      }`,
      { mailbox, id }
    )

    return Response.json({ success: !!data.deleteMessage }, { headers: CORS })
  } catch (error) {
    console.error('[tempmail DELETE error]', error)
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: CORS }
    )
  }
}
