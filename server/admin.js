import { Router } from 'express'
import { randomInt } from 'node:crypto'
import { db, transaction } from './db.js'
import { HttpError, requireAdmin } from './auth.js'
import { ORDER_STATUSES, getOrderDetail, refundOrder, rejectRefundRequest, cancelPendingOrder, clientIp } from './orders.js'
import { receiveLessonVideo, deleteLessonVideo, removeVideoFiles } from './learning.js'

const router = Router()
router.use(requireAdmin)

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const int = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : NaN)
const idParam = (req) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) throw new HttpError(400, 'ID không hợp lệ')
  return id
}

// ---------- Tổng quan ----------
router.get('/stats', (_req, res) => {
  const one = (sql) => db.prepare(sql).get()
  const totals = {
    // Doanh thu thực = đã thu - đã hoàn (chỉ tính đơn đã thanh toán)
    revenue: one('SELECT COALESCE(SUM(total - refunded_amount), 0) AS v FROM orders WHERE paid_at IS NOT NULL').v,
    refunded: one('SELECT COALESCE(SUM(refunded_amount), 0) AS v FROM orders').v,
    orders: one("SELECT COUNT(*) AS v FROM orders WHERE paid_at IS NOT NULL AND status != 'cancelled'").v,
    pendingOrders: one("SELECT COUNT(*) AS v FROM orders WHERE status = 'pending'").v,
    refundRequests: one('SELECT COUNT(*) AS v FROM orders WHERE refund_requested_at IS NOT NULL').v,
    users: one('SELECT COUNT(*) AS v FROM users').v,
    enrollments: one('SELECT COUNT(*) AS v FROM enrollments').v,
    courses: one('SELECT COUNT(*) AS v FROM courses').v,
    hiddenCourses: one('SELECT COUNT(*) AS v FROM courses WHERE published = 0').v,
    newLeads: one("SELECT COUNT(*) AS v FROM leads WHERE status = 'new'").v,
    subscribers: one('SELECT COUNT(*) AS v FROM newsletter').v,
  }

  // Doanh thu 14 ngày gần nhất, điền 0 cho ngày không có đơn
  const rows = db.prepare(`SELECT date(paid_at) AS day, SUM(total - refunded_amount) AS revenue,
      SUM(status != 'cancelled') AS orders
    FROM orders WHERE paid_at >= date('now', '-13 days') GROUP BY day`).all()
  const byDay = Object.fromEntries(rows.map((r) => [r.day, r]))
  const revenueByDay = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 13 + i)
    const day = d.toISOString().slice(0, 10)
    return { day, revenue: byDay[day]?.revenue ?? 0, orders: byDay[day]?.orders ?? 0 }
  })

  const topCourses = db.prepare(`SELECT c.id, c.title, c.emoji, COUNT(oi.course_id) AS sold, COALESCE(SUM(oi.price), 0) AS revenue
    FROM order_items oi JOIN courses c ON c.id = oi.course_id JOIN orders o ON o.id = oi.order_id
    WHERE oi.refunded = 0 AND o.paid_at IS NOT NULL
    GROUP BY c.id ORDER BY sold DESC, revenue DESC LIMIT 5`).all()

  const recentOrders = db.prepare(`SELECT o.id, o.total, o.status, o.created_at AS createdAt, u.name, u.email
    FROM orders o JOIN users u ON u.id = o.user_id WHERE o.paid_at IS NOT NULL ORDER BY o.paid_at DESC LIMIT 5`).all()

  res.json({ totals, revenueByDay, topCourses, recentOrders })
})

// ---------- Khóa học ----------
router.get('/courses', (_req, res) => {
  res.json(db.prepare(`SELECT c.id, c.title, c.teacher, c.topic_id AS topic, t.name AS topicName, c.collection,
      c.price, c.old_price AS oldPrice, c.emoji, c.color, c.published,
      (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE oi.course_id = c.id AND oi.refunded = 0 AND o.paid_at IS NOT NULL) AS sold,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS students
    FROM courses c JOIN topics t ON t.id = c.topic_id ORDER BY c.id DESC`).all()
    .map((c) => ({ ...c, published: !!c.published })))
})

router.get('/courses/:id', (req, res) => {
  const c = db.prepare(`SELECT id, title, teacher, teacher_bio AS teacherBio, topic_id AS topic, collection, rating, reviews,
    price, old_price AS oldPrice, emoji, color, level, hours, description, outcomes, published
    FROM courses WHERE id = ?`).get(idParam(req))
  if (!c) throw new HttpError(404, 'Không tìm thấy khóa học')

  const curriculum = []
  for (const l of db.prepare(`SELECT id, chapter_no, chapter, title, duration, preview, content, video_file, video_size
    FROM lessons WHERE course_id = ? ORDER BY chapter_no, position`).all(c.id)) {
    const ch = (curriculum[l.chapter_no - 1] ??= { name: l.chapter, lessons: [] })
    ch.lessons.push({
      id: l.id, title: l.title, duration: l.duration, preview: !!l.preview, content: l.content || '',
      hasVideo: !!l.video_file, videoSize: l.video_size,
    })
  }
  res.json({ ...c, published: !!c.published, outcomes: JSON.parse(c.outcomes), curriculum })
})

const LEVELS = ['Cơ bản', 'Trung cấp', 'Nâng cao']

function parseCourse(b = {}) {
  const course = {
    title: str(b.title, 200),
    teacher: str(b.teacher, 100),
    teacherBio: str(b.teacherBio, 1000),
    topic: str(b.topic, 40),
    collection: ['sale', 'popular', 'new'].includes(b.collection) ? b.collection : null,
    price: int(b.price),
    oldPrice: int(b.oldPrice || 0),
    emoji: str(b.emoji, 8) || '📘',
    color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#1fa855',
    level: LEVELS.includes(b.level) ? b.level : LEVELS[0],
    hours: Number(b.hours) || 0,
    description: str(b.description, 5000),
    outcomes: (Array.isArray(b.outcomes) ? b.outcomes : []).map((o) => str(o, 200)).filter(Boolean).slice(0, 12),
    published: b.published !== false,
    curriculum: (Array.isArray(b.curriculum) ? b.curriculum : []).slice(0, 50).map((ch) => ({
      name: str(ch?.name, 200),
      lessons: (Array.isArray(ch?.lessons) ? ch.lessons : []).slice(0, 100).map((l) => ({
        id: Number.isInteger(l?.id) ? l.id : null,
        title: str(l?.title, 200),
        duration: str(l?.duration, 10),
        preview: !!l?.preview,
        content: str(l?.content, 20000),
      })).filter((l) => l.title),
    })).filter((ch) => ch.name),
  }

  if (!course.title) throw new HttpError(400, 'Vui lòng nhập tên khóa học')
  if (!course.teacher) throw new HttpError(400, 'Vui lòng nhập tên giảng viên')
  if (!db.prepare('SELECT 1 FROM topics WHERE id = ?').get(course.topic)) throw new HttpError(400, 'Chủ đề không hợp lệ')
  if (!(course.price >= 0)) throw new HttpError(400, 'Giá bán không hợp lệ')
  if (!(course.oldPrice >= 0)) throw new HttpError(400, 'Giá gốc không hợp lệ')
  if (course.oldPrice && course.oldPrice < course.price) throw new HttpError(400, 'Giá gốc phải lớn hơn hoặc bằng giá bán')
  return course
}

function saveCourse(id, c) {
  const values = [c.title, c.teacher, c.teacherBio, c.topic, c.collection, c.price, c.oldPrice, c.emoji, c.color,
    c.level, c.hours, c.description, JSON.stringify(c.outcomes), c.published ? 1 : 0]

  return transaction(() => {
    if (id) {
      db.prepare(`UPDATE courses SET title = ?, teacher = ?, teacher_bio = ?, topic_id = ?, collection = ?, price = ?,
        old_price = ?, emoji = ?, color = ?, level = ?, hours = ?, description = ?, outcomes = ?, published = ? WHERE id = ?`)
        .run(...values, id)
    } else {
      id = Number(db.prepare(`INSERT INTO courses (title, teacher, teacher_bio, topic_id, collection, price, old_price,
        emoji, color, level, hours, description, outcomes, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(...values).lastInsertRowid)
    }
    // Cập nhật bài học theo id (giữ video + tiến độ học), thêm bài mới, xóa bài bị bỏ đi
    const existing = new Map(db.prepare('SELECT id, video_file FROM lessons WHERE course_id = ?').all(id).map((l) => [l.id, l]))
    const kept = new Set()
    const upd = db.prepare(`UPDATE lessons SET chapter_no = ?, chapter = ?, position = ?, title = ?, duration = ?, preview = ?, content = ?
      WHERE id = ? AND course_id = ?`)
    const ins = db.prepare(`INSERT INTO lessons (course_id, chapter_no, chapter, position, title, duration, preview, content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    c.curriculum.forEach((ch, ci) => ch.lessons.forEach((l, li) => {
      const values = [ci + 1, ch.name, li + 1, l.title, l.duration, l.preview ? 1 : 0, l.content]
      if (l.id && existing.has(l.id) && !kept.has(l.id)) {
        upd.run(...values, l.id, id)
        kept.add(l.id)
      } else {
        ins.run(id, ...values)
      }
    }))
    const removed = [...existing.values()].filter((l) => !kept.has(l.id))
    const del = db.prepare('DELETE FROM lessons WHERE id = ?')
    removed.forEach((l) => del.run(l.id))
    return { id, removedVideos: removed.map((l) => l.video_file) }
  })
}

router.post('/courses', async (req, res) => {
  const { id } = saveCourse(null, parseCourse(req.body))
  res.status(201).json({ id })
})

router.put('/courses/:id', async (req, res) => {
  const id = idParam(req)
  if (!db.prepare('SELECT 1 FROM courses WHERE id = ?').get(id)) throw new HttpError(404, 'Không tìm thấy khóa học')
  const { removedVideos } = saveCourse(id, parseCourse(req.body))
  await removeVideoFiles(removedVideos)
  res.json({ id })
})

// Tải video cho một bài học: thân request là file video (không dùng multipart)
router.post('/lessons/:id/video', async (req, res) => {
  res.json(await receiveLessonVideo(req, idParam(req)))
})

router.delete('/lessons/:id/video', async (req, res) => {
  res.json(await deleteLessonVideo(idParam(req)))
})

router.patch('/courses/:id', (req, res) => {
  const id = idParam(req)
  if (typeof req.body?.published !== 'boolean') throw new HttpError(400, 'Thiếu trạng thái hiển thị')
  const { changes } = db.prepare('UPDATE courses SET published = ? WHERE id = ?').run(req.body.published ? 1 : 0, id)
  if (!changes) throw new HttpError(404, 'Không tìm thấy khóa học')
  res.json({ id, published: req.body.published })
})

router.delete('/courses/:id', async (req, res) => {
  const id = idParam(req)
  const videos = db.prepare('SELECT video_file FROM lessons WHERE course_id = ?').all(id).map((l) => l.video_file)
  const used = db.prepare(`SELECT
    (SELECT COUNT(*) FROM order_items WHERE course_id = ?) + (SELECT COUNT(*) FROM enrollments WHERE course_id = ?) +
    (SELECT COUNT(*) FROM activation_codes WHERE course_id = ?) AS n`).get(id, id, id).n
  if (used) throw new HttpError(409, 'Khóa học đã có học viên, đơn hàng hoặc mã kích hoạt. Hãy ẩn khóa học thay vì xóa.')
  transaction(() => {
    db.prepare('DELETE FROM path_courses WHERE course_id = ?').run(id)
    db.prepare('DELETE FROM lessons WHERE course_id = ?').run(id)
    const { changes } = db.prepare('DELETE FROM courses WHERE id = ?').run(id)
    if (!changes) throw new HttpError(404, 'Không tìm thấy khóa học')
  })
  await removeVideoFiles(videos)
  res.json({ ok: true })
})

// ---------- Đơn hàng ----------
// ?status=paid|partially_refunded|refunded|cancelled|requested
router.get('/orders', (req, res) => {
  const q = str(req.query.q, 100).toLowerCase()
  const { status } = req.query
  const where = status === 'requested' ? 'WHERE o.refund_requested_at IS NOT NULL'
    : ORDER_STATUSES.includes(status) ? 'WHERE o.status = ?' : ''
  const orders = db.prepare(`SELECT o.id, o.subtotal, o.discount, o.total, o.coupon, o.status, o.created_at AS createdAt,
      o.refunded_amount AS refundedAmount, o.refund_requested_at AS refundRequestedAt, u.name, u.email,
      (SELECT GROUP_CONCAT(c.title, ' | ') FROM order_items oi JOIN courses c ON c.id = oi.course_id WHERE oi.order_id = o.id) AS items
    FROM orders o JOIN users u ON u.id = o.user_id ${where} ORDER BY o.refund_requested_at IS NULL, o.id DESC`)
    .all(...(ORDER_STATUSES.includes(status) ? [status] : []))
  res.json(q ? orders.filter((o) => `#${o.id} ${o.name} ${o.email} ${o.items}`.toLowerCase().includes(q)) : orders)
})

router.get('/orders/:id', (req, res) => {
  const order = getOrderDetail(idParam(req))
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng')
  res.json(order)
})

router.post('/orders/:id/refund', async (req, res) => {
  res.json(await refundOrder(idParam(req), {
    courseIds: req.body?.courseIds, reason: req.body?.reason, actor: req.user, ip: clientIp(req),
  }))
})

// Đơn chờ thanh toán: chỉ hủy. Đơn đã thanh toán: hoàn toàn bộ tiền rồi hủy.
router.post('/orders/:id/cancel', async (req, res) => {
  const id = idParam(req)
  const order = getOrderDetail(id)
  if (order?.status === 'pending') {
    return res.json(cancelPendingOrder(id, { actorId: req.user.id, reason: str(req.body?.reason, 1000) }))
  }
  res.json(await refundOrder(id, { reason: req.body?.reason, actor: req.user, ip: clientIp(req), cancel: true }))
})

router.post('/orders/:id/reject-request', (req, res) => {
  res.json(rejectRefundRequest(idParam(req), { reason: req.body?.reason, actorId: req.user.id }))
})

// ---------- Người dùng ----------
router.get('/users', (_req, res) => {
  res.json(db.prepare(`SELECT u.id, u.name, u.email, u.role, u.created_at AS createdAt,
      (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS courses,
      (SELECT COALESCE(SUM(total - refunded_amount), 0) FROM orders o WHERE o.user_id = u.id AND o.paid_at IS NOT NULL) AS spent
    FROM users u ORDER BY u.id DESC`).all())
})

router.patch('/users/:id', (req, res) => {
  const id = idParam(req)
  const role = req.body?.role
  if (!['user', 'admin'].includes(role)) throw new HttpError(400, 'Vai trò không hợp lệ')
  if (id === req.user.id && role !== 'admin') throw new HttpError(400, 'Không thể tự bỏ quyền quản trị của chính mình')
  const { changes } = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
  if (!changes) throw new HttpError(404, 'Không tìm thấy người dùng')
  res.json({ id, role })
})

// ---------- Liên hệ & bản tin ----------
const LEAD_STATUSES = ['new', 'contacted', 'done']

router.get('/leads', (req, res) => {
  const status = LEAD_STATUSES.includes(req.query.status) ? req.query.status : null
  res.json(db.prepare(`SELECT id, type, page, name, email, phone, company, message, status, created_at AS createdAt
    FROM leads ${status ? 'WHERE status = ?' : ''} ORDER BY id DESC`).all(...(status ? [status] : [])))
})

router.patch('/leads/:id', (req, res) => {
  if (!LEAD_STATUSES.includes(req.body?.status)) throw new HttpError(400, 'Trạng thái không hợp lệ')
  const { changes } = db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(req.body.status, idParam(req))
  if (!changes) throw new HttpError(404, 'Không tìm thấy liên hệ')
  res.json({ ok: true })
})

router.delete('/leads/:id', (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(idParam(req))
  res.json({ ok: true })
})

router.get('/newsletter', (_req, res) => {
  res.json(db.prepare('SELECT email, created_at AS createdAt FROM newsletter ORDER BY created_at DESC').all())
})

router.delete('/newsletter/:email', (req, res) => {
  db.prepare('DELETE FROM newsletter WHERE email = ?').run(req.params.email.toLowerCase())
  res.json({ ok: true })
})

// ---------- Mã giảm giá ----------
router.get('/coupons', (_req, res) => {
  res.json(db.prepare(`SELECT c.code, c.percent, c.active,
      (SELECT COUNT(*) FROM orders o WHERE o.coupon = c.code) AS used
    FROM coupons c ORDER BY c.code`).all().map((c) => ({ ...c, active: !!c.active })))
})

const parsePercent = (v) => {
  const p = int(v)
  if (!(p >= 1 && p <= 100)) throw new HttpError(400, 'Phần trăm giảm phải từ 1 đến 100')
  return p
}

router.post('/coupons', (req, res) => {
  const code = str(req.body?.code, 30).toUpperCase()
  if (!/^[A-Z0-9]{3,30}$/.test(code)) throw new HttpError(400, 'Mã chỉ gồm chữ và số, 3–30 ký tự')
  const percent = parsePercent(req.body?.percent)
  if (db.prepare('SELECT 1 FROM coupons WHERE code = ?').get(code)) throw new HttpError(409, 'Mã đã tồn tại')
  db.prepare('INSERT INTO coupons (code, percent) VALUES (?, ?)').run(code, percent)
  res.status(201).json({ code, percent, active: true, used: 0 })
})

router.patch('/coupons/:code', (req, res) => {
  const code = req.params.code.toUpperCase()
  const row = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code)
  if (!row) throw new HttpError(404, 'Không tìm thấy mã')
  const active = typeof req.body?.active === 'boolean' ? req.body.active : !!row.active
  const percent = req.body?.percent !== undefined ? parsePercent(req.body.percent) : row.percent
  db.prepare('UPDATE coupons SET active = ?, percent = ? WHERE code = ?').run(active ? 1 : 0, percent, code)
  res.json({ code, active, percent })
})

router.delete('/coupons/:code', (req, res) => {
  db.prepare('DELETE FROM coupons WHERE code = ?').run(req.params.code.toUpperCase())
  res.json({ ok: true })
})

// ---------- Mã kích hoạt ----------
router.get('/activation-codes', (_req, res) => {
  res.json(db.prepare(`SELECT a.code, a.course_id AS courseId, c.title AS courseTitle, a.used_at AS usedAt, u.email AS usedBy
    FROM activation_codes a JOIN courses c ON c.id = a.course_id LEFT JOIN users u ON u.id = a.used_by
    ORDER BY a.used_at IS NOT NULL, a.rowid DESC`).all())
})

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // bỏ các ký tự dễ nhầm: O/0, I/1
const newCode = () => Array.from({ length: 12 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('')

router.post('/activation-codes', (req, res) => {
  const courseId = int(req.body?.courseId)
  const quantity = int(req.body?.quantity || 1)
  if (!db.prepare('SELECT 1 FROM courses WHERE id = ?').get(courseId)) throw new HttpError(400, 'Khóa học không hợp lệ')
  if (!(quantity >= 1 && quantity <= 100)) throw new HttpError(400, 'Số lượng từ 1 đến 100')

  const codes = transaction(() => {
    const ins = db.prepare('INSERT OR IGNORE INTO activation_codes (code, course_id) VALUES (?, ?)')
    const out = []
    while (out.length < quantity) {
      const code = newCode()
      if (ins.run(code, courseId).changes) out.push(code)
    }
    return out
  })
  res.status(201).json({ codes })
})

router.delete('/activation-codes/:code', (req, res) => {
  const row = db.prepare('SELECT used_by FROM activation_codes WHERE code = ?').get(req.params.code.toUpperCase())
  if (!row) throw new HttpError(404, 'Không tìm thấy mã')
  if (row.used_by) throw new HttpError(409, 'Không thể xóa mã đã được sử dụng')
  db.prepare('DELETE FROM activation_codes WHERE code = ?').run(req.params.code.toUpperCase())
  res.json({ ok: true })
})

export default router
