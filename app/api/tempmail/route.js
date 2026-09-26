const express = require('express')
const router = express.Router()

const MAILDROP_API = 'https://api.maildrop.cc/graphql'
const FETCH_TIMEOUT_MS = 8000

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
    if (err.name === 'AbortError') throw new Error(`Timeout: maildrop.cc tidak merespons dalam ${FETCH_TIMEOUT_MS}ms`)
    throw new Error(`Network error: ${err.message}`)
  }
  clearTimeout(timer)

  const contentType = res.headers.get('content-type') || ''
  const raw = await res.text()

  if (!contentType.includes('application/json')) {
    throw new Error(`Response bukan JSON (status ${res.status}). Preview: ${raw.slice(0, 150)}`)
  }

  let body
  try { body = raw ? JSON.parse(raw) : {} }
  catch (err) { throw new Error(`Gagal parse JSON: ${err.message}. Raw: ${raw.slice(0, 150)}`) }

  if (body.errors && body.errors.length > 0) {
    throw new Error(`GraphQL error: ${body.errors.map(e => e.message).join('; ')}`)
  }

  return body.data
}

router.options('/', (req, res) => res.sendStatus(204))

/* ══════ GET ══════ */
router.get('/', async (req, res) => {
  const action = req.query.action

  try {
    if (action === 'messages') {
      const mailbox = req.query.mailbox
      if (!mailbox) return res.status(400).json({ success: false, error: 'Missing mailbox' })

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

      return res.json({
        success: true,
        messages: data.inbox || [],
        total: (data.inbox || []).length
      })
    }

    if (action === 'message') {
      const mailbox = req.query.mailbox
      const id = req.query.id
      if (!mailbox || !id) return res.status(400).json({ success: false, error: 'Missing mailbox or id' })

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

      return res.json({ success: true, message: data.message })
    }

    return res.status(400).json({ success: false, error: 'Invalid action', available: ['messages', 'message'] })

  } catch (error) {
    console.error('[tempmail GET]', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

/* ══════ POST ══════ */
router.post('/', async (req, res) => {
  const action = req.query.action

  try {
    if (action === 'create') {
      const pingData = await graphql(
        `query Ping($msg: String!) { ping(message: $msg) }`,
        { msg: 'health-check' }
      )

      if (!pingData || pingData.ping === undefined) {
        return res.status(502).json({ success: false, error: 'Maildrop API tidak merespons' })
      }

      const mailbox = 'am' + Math.random().toString(36).slice(2, 11)
      const email = `${mailbox}@maildrop.cc`

      return res.json({ success: true, email, mailbox })
    }

    return res.status(400).json({ success: false, error: 'Invalid action' })

  } catch (error) {
    console.error('[tempmail POST]', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

/* ══════ DELETE ══════ */
router.delete('/', async (req, res) => {
  const mailbox = req.query.mailbox
  const id = req.query.id

  try {
    if (!mailbox || !id) return res.status(400).json({ success: false, error: 'Missing mailbox or id' })

    const data = await graphql(
      `mutation DeleteMessage($mailbox: String!, $id: String!) {
        deleteMessage(mailbox: $mailbox, id: $id) { id }
      }`,
      { mailbox, id }
    )

    return res.json({ success: !!data.deleteMessage })
  } catch (error) {
    console.error('[tempmail DELETE]', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
