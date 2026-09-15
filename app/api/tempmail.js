/**
 * Temp Mail API Proxy — mail.tm
 * Route: /api/tempmail?action=xxx
 */

const MAILTM_API = 'https://api.mail.tm'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action } = req.query

  try {
    /* ============ 1. LIST DOMAIN ============ */
    if (action === 'domains') {
      const r = await fetch(`${MAILTM_API}/domains?page=1`)
      const data = await r.json()
      return res.status(r.status).json(data)
    }

    /* ============ 2. CREATE INBOX ============ */
    if (action === 'create') {
      // Ambil domain aktif
      const domainsRes = await fetch(`${MAILTM_API}/domains?page=1`)
      const domainsData = await domainsRes.json()
      const domain = domainsData['hydra:member']?.[0]?.domain || 'mail.tm'

      // Generate random username
      const username = 'am' + Math.random().toString(36).slice(2, 11)
      const email = `${username}@${domain}`
      const password = Math.random().toString(36).slice(2, 15) + 'Aa1!'

      // Buat akun
      const createRes = await fetch(`${MAILTM_API}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password })
      })

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        return res.status(createRes.status).json({
          success: false,
          error: err.message || 'Gagal membuat inbox'
        })
      }

      // Login untuk dapat token
      const loginRes = await fetch(`${MAILTM_API}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password })
      })

      const loginData = await loginRes.json()
      if (!loginData.token) {
        return res.status(500).json({
          success: false,
          error: 'Gagal login ke inbox'
        })
      }

      return res.json({
        success: true,
        email,
        password,
        token: loginData.token,
        accountId: loginData.id
      })
    }

    /* ============ 3. GET MESSAGES ============ */
    if (action === 'messages') {
      const auth = req.headers.authorization
      if (!auth) {
        return res.status(401).json({ success: false, error: 'No auth' })
      }

      const r = await fetch(`${MAILTM_API}/messages?page=1`, {
        headers: { Authorization: auth }
      })
      const data = await r.json()

      return res.status(r.status).json({
        success: true,
        messages: data['hydra:member'] || [],
        total: data['hydra:totalItems'] || 0
      })
    }

    /* ============ 4. GET MESSAGE DETAIL ============ */
    if (action === 'message') {
      const auth = req.headers.authorization
      const { id } = req.query
      if (!auth || !id) {
        return res.status(400).json({ success: false, error: 'Missing params' })
      }

      const r = await fetch(`${MAILTM_API}/messages/${id}`, {
        headers: { Authorization: auth }
      })
      const data = await r.json()

      return res.status(r.status).json({
        success: true,
        message: data
      })
    }

    /* ============ DEFAULT ============ */
    return res.status(400).json({
      success: false,
      error: 'Invalid action. Use: domains, create, messages, message'
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    })
  }
}
