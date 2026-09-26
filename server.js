
const express = require('express')
const path = require('path')
const apiRoutes = require('./app/api/route')

const app = express()
const PORT = process.env.PORT || 3300

// Middleware
app.use(require('cors')())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static files (public folder)
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate')
    }
  }
}))

// API routes
app.use('/api', apiRoutes)

// Fallback: serve index.html for SPA-style routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ⚠️ Conditional listen — hanya jalan di lokal, bukan di Vercel
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 server jalan di http://localhost:${PORT}`)
  })
}

// ⚠️ WAJIB untuk Vercel serverless
module.exports = app
