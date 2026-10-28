import jwt from 'jsonwebtoken'
import { db } from './db.js'

export { hashPassword, verifyPassword } from './password.js'

const isDev = process.env.NODE_ENV === 'development'
const SECRET = process.env.JWT_SECRET || (isDev ? 'dev-secret-change-me' : '')
if (!isDev && SECRET.length < 32) {
  throw new Error('JWT_SECRET phải được đặt trong .env và dài ít nhất 32 ký tự khi chạy production (xem .env.example)')
}
if (isDev && !process.env.JWT_SECRET) console.warn('⚠ Đang dùng JWT_SECRET mặc định cho môi trường phát triển')

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const signToken = (user) => jwt.sign({ sub: user.id }, SECRET, { algorithm: 'HS256', expiresIn: '7d' })

const findUser = db.prepare('SELECT id, name, email, role, created_at AS createdAt FROM users WHERE id = ?')

// Gắn req.user nếu có token hợp lệ; không bắt buộc đăng nhập
export function optionalAuth(req, _res, next) {
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    try {
      const { sub } = jwt.verify(token, SECRET, { algorithms: ['HS256'] })
      req.user = findUser.get(sub) || null
    } catch {
      req.user = null
    }
  }
  next()
}

export function requireAuth(req, _res, next) {
  if (!req.user) throw new HttpError(401, 'Vui lòng đăng nhập')
  next()
}

export function requireAdmin(req, _res, next) {
  if (!req.user) throw new HttpError(401, 'Vui lòng đăng nhập')
  if (req.user.role !== 'admin') throw new HttpError(403, 'Bạn không có quyền quản trị')
  next()
}
