import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || ''
const TOKEN_EXPIRY = '8h'

export function generateToken(username) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET tidak dikonfigurasi di .env')
  }
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyToken(token) {
  if (!token) {
    throw new Error('Token tidak ditemukan')
  }
  return jwt.verify(token, JWT_SECRET)
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: token tidak ada' })
  }

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized: token tidak valid atau kedaluwarsa' })
  }
}
