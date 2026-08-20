import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getAllStudents, getStudentsByRomBel, getStudentsPaginated, getStudentsExport, getRombelList, getDistinctValues } from './database.js';
import { requireAuth, generateToken } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

let initPromise = null
function ensureInit() {
  if (!initPromise) {
    initPromise = initDb().catch((err) => {
      initPromise = null
      throw err
    })
  }
  return initPromise
}

app.use(async (req, res, next) => {
  if (req.path === '/api/login') return next()
  try {
    await ensureInit()
    next()
  } catch (err) {
    console.error('Database init failed:', err)
    res.status(500).json({ error: 'Database initialization failed' })
  }
})

// Public routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = generateToken(username);
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Username atau password salah' });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

// Protected routes - require authentication
app.use('/api', requireAuth);

app.get('/api/students', async (req, res) => {
  try {
    const { rombel, kabupaten, kecamatan, tingkat, nama_sekolah, page, pageSize, q } = req.query
    const pageNum = parseInt(page, 10)
    const pageSizeNum = parseInt(pageSize, 10)
    const usePagination = !Number.isNaN(pageNum) || !Number.isNaN(pageSizeNum)

    if (usePagination) {
      const result = await getStudentsPaginated({
        rombel: rombel || undefined,
        kabupaten: kabupaten || undefined,
        kecamatan: kecamatan || undefined,
        tingkat: tingkat || undefined,
        nama_sekolah: nama_sekolah || undefined,
        q: q || undefined,
        page: Number.isNaN(pageNum) ? 1 : pageNum,
        pageSize: Number.isNaN(pageSizeNum) ? 20 : pageSizeNum
      })
      return res.json({ ...result, page: Number.isNaN(pageNum) ? 1 : pageNum, pageSize: Number.isNaN(pageSizeNum) ? 20 : pageSizeNum })
    }

    if (rombel) {
      const students = await getStudentsByRomBel(rombel)
      return res.json(students)
    }
    const students = await getAllStudents()
    res.json(students)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/api/rombels', async (req, res) => {
  try {
    const rombels = await getRombelList()
    res.json(rombels)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/api/options', async (req, res) => {
  try {
    const { field, kabupaten, kecamatan } = req.query
    if (!field) {
      return res.status(400).json({ error: 'field is required' })
    }
    const values = await getDistinctValues(field, {
      kabupaten: kabupaten || undefined,
      kecamatan: kecamatan || undefined
    })
    res.json(values)
  } catch (error) {
    console.error(error)
    res.status(400).json({ error: error.message || 'Invalid request' })
  }
})

app.get('/api/students/export', async (req, res) => {
  try {
    const { rombel, kabupaten, kecamatan, tingkat, nama_sekolah, q } = req.query
    const students = await getStudentsExport({
      rombel: rombel || undefined,
      kabupaten: kabupaten || undefined,
      kecamatan: kecamatan || undefined,
      tingkat: tingkat || undefined,
      nama_sekolah: nama_sekolah || undefined,
      q: q || undefined
    })
    res.json(students)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Database error' })
  }
})

app.get('/api/students/:rombel', async (req, res) => {
  try {
    const { rombel } = req.params
    const students = await getStudentsByRomBel(rombel)
    res.json(students)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Database error' })
  }
})

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

const distDir = path.join(__dirname, '../frontend/dist')
app.use(express.static(distDir))
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

export default app