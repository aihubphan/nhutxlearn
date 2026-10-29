import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

if (existsSync('.env')) process.loadEnvFile('.env')

// Mặc định luôn là production (an toàn). Chỉ bật chế độ phát triển khi chạy với cờ --dev
// (script "npm run dev" đã có sẵn), để không bao giờ lỡ dùng cấu hình mặc định khi chạy thật.
const isDev = process.argv.includes('--dev')
process.env.NODE_ENV = isDev ? 'development' : 'production'

const express = (await import('express')).default
const { default: helmet } = await import('helmet')
const { rateLimit } = await import('express-rate-limit')
const { db, transaction } = await import('./db.js')
const { HttpError, hashPassword, verifyPassword, signToken, optionalAuth, requireAuth } = await import('./auth.js')
const { default: adminRouter } = await import('./admin.js')
const { default: learningRouter, courseProgress } = await import('./learning.js')
const { default: mediaRouter } = await import('./media.js')
const { getOrderDetail, requestRefund, createOrder, startPayment, confirmPayment, cancelPendingOrder } = await import('./orders.js')
const { mode: paymentMode, verifySignature: verifyVnpaySignature, signParams: signVnpayParams, vnTime } = await import('./vnpay.js')

const app = express()

// Khi chạy sau Nginx / Cloudflare… đặt TRUST_PROXY=1 để lấy đúng IP người dùng cho giới hạn tần suất
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)

// Giao diện đặt ở nơi khác (VD Vercel) → liệt kê địa chỉ của nó trong ALLOWED_ORIGINS, cách nhau dấu phẩy
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)

app.use('/api', (req, res, next) => {
  if (!allowedOrigins.length) return next()
  // Luôn báo bộ nhớ đệm rằng phản hồi phụ thuộc Origin (ảnh được cả <img> lẫn fetch tải về)
  res.vary('Origin')
  const origin = req.get('origin')
  if (origin && allowedOrigins.includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Duration, X-Filename',
      'Access-Control-Max-Age': '600',
    })
    if (req.method === 'OPTIONS') return res.status(204).end()
  }
  next()
})

// Header bảo mật (CSP, chống nhúng iframe, chống đoán kiểu nội dung...)
app.use(helmet({
  // Cho phép trang ở địa chỉ khác (Vercel) hiển thị ảnh bìa và phát video từ API
  crossOriginResourcePolicy: { policy: allowedOrigins.length ? 'cross-origin' : 'same-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      // HTTPS do máy chủ / proxy phía trước đảm nhận; bật ở đây sẽ làm hỏng khi thử trên http://localhost
      upgradeInsecureRequests: null,
    },
  },
}))

// Giới hạn số lần gọi theo IP để chống dò mật khẩu, dò mã và spam form
const limit = (minutes, max, options = {}) => rateLimit({
  windowMs: minutes * 60_000,
  limit: max,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: `Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.` },
  ...options,
})
const limits = {
  login: limit(15, 10, { skipSuccessfulRequests: true }), // chỉ tính lần đăng nhập sai
  register: limit(60, 5),
  coupon: limit(15, 20),
  activate: limit(15, 10, { skipSuccessfulRequests: true }),
  lead: limit(60, 5),
  newsletter: limit(60, 5),
  refundRequest: limit(60, 5),
  order: limit(15, 30),
}
// Video bị tua sẽ sinh nhiều request Range, nên đường dẫn phát video không tính vào giới hạn chung
app.use('/api', limit(1, 300, { skip: (req) => req.path.startsWith('/media/') }))

app.use(express.json({ limit: '100kb' }))
app.use(optionalAuth)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AI_RE = /\bAI\b|Copilot|ChatGPT|Claude|Gemini/i

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// ---------- Truy vấn dùng chung ----------
const COURSE_FIELDS = `
  c.id, c.title, c.teacher, c.topic_id AS topic, c.collection, c.rating, c.reviews, c.price,
  c.old_price AS oldPrice, c.emoji, c.color, c.level, c.hours, c.students,
  CASE WHEN c.image IS NULL THEN NULL ELSE '/api/images/' || c.image END AS imageUrl,
  (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lessonCount`

// Trang công khai chỉ thấy khóa học đang hiển thị (published = 1)
const coursesBy = (where = '1=1', params = [], order = 'c.id') =>
  db.prepare(`SELECT ${COURSE_FIELDS} FROM courses c WHERE c.published = 1 AND ${where} ORDER BY ${order}`).all(...params)

const getCourse = (id) => db.prepare(`SELECT ${COURSE_FIELDS} FROM courses c WHERE c.id = ? AND c.published = 1`).get(id)
const getAnyCourse = (id) => db.prepare(`SELECT ${COURSE_FIELDS} FROM courses c WHERE c.id = ?`).get(id)

const enrolledIds = (userId) =>
  db.prepare('SELECT course_id AS id FROM enrollments WHERE user_id = ?').all(userId).map((r) => r.id)

const enroll = db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id, source) VALUES (?, ?, ?)')

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })

// ---------- Danh mục & nội dung ----------
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Số khóa của mỗi chủ đề = số khóa đang hiển thị thật, tự cập nhật khi thêm / ẩn / xóa khóa học
app.get('/api/topics', (_req, res) => {
  res.json(db.prepare(`SELECT t.id, t.name, t.icon,
      (SELECT COUNT(*) FROM courses c WHERE c.topic_id = t.id AND c.published = 1) AS count
    FROM topics t ORDER BY t.sort`).all())
})

// ---------- Lộ trình ----------
// Giá lộ trình không lưu cố định: = tổng giá các khóa đang bán trong lộ trình, giảm discount_percent.
// Khách đã sở hữu khóa nào thì không phải trả phần của khóa đó.
const pathRow = (id) => db.prepare(`SELECT id, title, description AS "desc", learners, color,
  discount_percent AS discountPercent FROM paths WHERE id = ?`).get(id)

const pathCourses = (pathId) => db.prepare(`SELECT ${COURSE_FIELDS} FROM path_courses pc JOIN courses c ON c.id = pc.course_id
  WHERE pc.path_id = ? AND c.published = 1 ORDER BY pc.position`).all(pathId)

const pathPrice = (course, percent) => Math.round((course.price * (100 - percent)) / 100)

function pathPricing(path, userId = null) {
  const courses = pathCourses(path.id)
  const owned = new Set(userId ? enrolledIds(userId) : [])
  const remaining = courses.filter((c) => !owned.has(c.id))
  return {
    courses: courses.length,
    oldPrice: courses.reduce((s, c) => s + c.price, 0),
    price: courses.reduce((s, c) => s + pathPrice(c, path.discountPercent), 0),
    ownedCount: courses.length - remaining.length,
    priceForYou: remaining.reduce((s, c) => s + pathPrice(c, path.discountPercent), 0),
    courseList: courses.map((c) => ({ ...c, owned: owned.has(c.id) })),
  }
}

app.get('/api/home', (_req, res) => {
  const paths = db.prepare('SELECT id FROM paths ORDER BY sort').all().map(({ id }) => {
    const path = pathRow(id)
    const { courseList, ownedCount, priceForYou, ...pricing } = pathPricing(path)
    return { ...path, ...pricing }
  })
  res.json({
    sale: coursesBy("c.collection = 'sale'"),
    popular: coursesBy("c.collection = 'popular'"),
    new: coursesBy("c.collection = 'new'"),
    paths,
  })
})

const SORTS = {
  default: 'c.id',
  rating: 'c.rating DESC, c.reviews DESC',
  'price-asc': 'c.price ASC',
  'price-desc': 'c.price DESC',
  newest: 'c.created_at DESC, c.id DESC',
}

// GET /api/courses?topic=tech&collection=sale|popular|new|free|ai&price=free|paid&q=excel&sort=rating
app.get('/api/courses', (req, res) => {
  const { topic, collection, price, q, sort } = req.query
  const where = ['1=1']
  const params = []

  if (topic) { where.push('c.topic_id = ?'); params.push(String(topic)) }
  if (['sale', 'popular', 'new'].includes(collection)) { where.push('c.collection = ?'); params.push(collection) }
  if (collection === 'free' || price === 'free') where.push('c.price = 0')
  if (price === 'paid') where.push('c.price > 0')

  let list = coursesBy(where.join(' AND '), params, SORTS[sort] || SORTS.default)

  if (collection === 'ai') list = list.filter((c) => AI_RE.test(c.title))
  // Lọc từ khóa trong JS vì LIKE của SQLite không phân biệt hoa/thường với chữ có dấu
  const keyword = str(q, 100).toLowerCase()
  if (keyword) list = list.filter((c) => `${c.title} ${c.teacher}`.toLowerCase().includes(keyword))

  res.json(list)
})

app.get('/api/courses/:id', (req, res) => {
  const course = getCourse(Number(req.params.id))
  if (!course) throw new HttpError(404, 'Không tìm thấy khóa học')

  const extra = db.prepare(`SELECT c.description, c.outcomes, c.teacher_bio AS teacherBio, t.name AS topicName
    FROM courses c JOIN topics t ON t.id = c.topic_id WHERE c.id = ?`).get(course.id)

  const lessons = db.prepare(`SELECT id, chapter_no, chapter, title, duration, preview, video_file
    FROM lessons WHERE course_id = ? ORDER BY chapter_no, position`).all(course.id)
  const curriculum = []
  for (const l of lessons) {
    let ch = curriculum[l.chapter_no - 1]
    if (!ch) ch = curriculum[l.chapter_no - 1] = { name: `Chương ${l.chapter_no}: ${l.chapter}`, lessons: [] }
    ch.lessons.push({ id: l.id, title: l.title, duration: l.duration, preview: !!l.preview, hasVideo: !!l.video_file })
  }

  res.json({
    ...course,
    ...extra,
    outcomes: JSON.parse(extra.outcomes),
    curriculum,
    related: coursesBy('c.topic_id = ? AND c.id != ?', [course.topic, course.id]).slice(0, 4),
    enrolled: req.user ? enrolledIds(req.user.id).includes(course.id) : false,
  })
})

app.get('/api/paths/:id', (req, res) => {
  const path = pathRow(req.params.id)
  if (!path) throw new HttpError(404, 'Không tìm thấy lộ trình')
  res.json({ ...path, ...pathPricing(path, req.user?.id) })
})

app.get('/api/plans', (_req, res) => {
  const plans = db.prepare('SELECT id, name, price, period, color, hot, perks FROM plans ORDER BY id').all()
  res.json(plans.map((p) => ({ ...p, hot: !!p.hot, perks: JSON.parse(p.perks) })))
})

app.get('/api/pages/:slug', (req, res) => {
  const page = db.prepare('SELECT slug, title, icon, intro, form, sections FROM pages WHERE slug = ?').get(req.params.slug)
  if (!page) throw new HttpError(404, 'Không tìm thấy trang')
  res.json({ ...page, sections: JSON.parse(page.sections) })
})

// ---------- Tài khoản ----------
app.post('/api/auth/register', limits.register, (req, res) => {
  const name = str(req.body?.name, 80)
  const email = str(req.body?.email, 120).toLowerCase()
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  if (!name) throw new HttpError(400, 'Vui lòng nhập họ tên')
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Email không hợp lệ')
  if (password.length < 6) throw new HttpError(400, 'Mật khẩu tối thiểu 6 ký tự')
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'Email đã được đăng ký')

  const { lastInsertRowid } = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, hashPassword(password))
  const user = { id: Number(lastInsertRowid), name, email, role: 'user' }
  res.status(201).json({ token: signToken(user), user })
})

app.post('/api/auth/login', limits.login, (req, res) => {
  const email = str(req.body?.email, 120).toLowerCase()
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !verifyPassword(password, user.password_hash)) throw new HttpError(401, 'Email hoặc mật khẩu không đúng')
  res.json({ token: signToken(user), user: publicUser(user) })
})

app.get('/api/auth/me', requireAuth, (req, res) => res.json(publicUser(req.user)))

app.get('/api/me/courses', requireAuth, (req, res) => {
  const courses = db.prepare(`SELECT ${COURSE_FIELDS}, e.created_at AS enrolledAt FROM enrollments e
    JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? ORDER BY e.created_at DESC`).all(req.user.id)
  res.json(courses.map((c) => ({ ...c, progress: courseProgress(req.user.id, c.id) })))
})

app.get('/api/me/orders', requireAuth, (req, res) => {
  const ids = db.prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id)
  res.json(ids.map((o) => getOrderDetail(o.id)))
})

app.post('/api/me/orders/:id/refund-request', limits.refundRequest, requireAuth, (req, res) => {
  res.json(requestRefund(req.user.id, Number(req.params.id), req.body?.reason))
})

// ---------- Mua hàng ----------
const findCoupon = (code) =>
  db.prepare('SELECT code, percent FROM coupons WHERE code = ? AND active = 1').get(str(code, 40).toUpperCase())

app.post('/api/coupons/validate', limits.coupon, (req, res) => {
  const coupon = findCoupon(req.body?.code)
  if (!coupon) throw new HttpError(404, 'Mã giảm giá không hợp lệ')
  res.json(coupon)
})

// Tạo đơn hàng: giá luôn tính lại ở server, không tin giá gửi từ client.
// Đơn có phí ở trạng thái "pending" và trả về paymentUrl để chuyển khách sang VNPay;
// khóa học chỉ được mở khi VNPay xác nhận thanh toán (IPN / Return URL).
// Body: { courseIds, coupon } khi mua từ giỏ hàng, hoặc { pathId } khi mua cả lộ trình.
app.post('/api/orders', limits.order, requireAuth, (req, res) => {
  const owned = new Set(enrolledIds(req.user.id))
  let courses, coupon = null, subtotal, total, note = null

  if (req.body?.pathId) {
    // Mua lộ trình: giá ưu đãi của lộ trình, không cộng thêm mã giảm giá
    const path = pathRow(String(req.body.pathId))
    if (!path) throw new HttpError(404, 'Không tìm thấy lộ trình')
    if (req.body.coupon) throw new HttpError(400, 'Mã giảm giá không áp dụng cho lộ trình')
    courses = pathCourses(path.id).filter((c) => !owned.has(c.id))
    if (!courses.length) throw new HttpError(400, 'Bạn đã sở hữu toàn bộ khóa học trong lộ trình')
    subtotal = courses.reduce((s, c) => s + c.price, 0)
    total = courses.reduce((s, c) => s + pathPrice(c, path.discountPercent), 0)
    note = `Lộ trình: ${path.title} (-${path.discountPercent}%)`
  } else {
    const ids = [...new Set((Array.isArray(req.body?.courseIds) ? req.body.courseIds : []).map(Number))].filter(Number.isInteger)
    if (!ids.length) throw new HttpError(400, 'Giỏ hàng trống')
    courses = ids.map(getCourse).filter(Boolean).filter((c) => !owned.has(c.id))
    if (!courses.length) throw new HttpError(400, 'Bạn đã sở hữu tất cả khóa học trong giỏ')
    if (req.body?.coupon) {
      coupon = findCoupon(req.body.coupon)
      if (!coupon) throw new HttpError(400, 'Mã giảm giá không hợp lệ')
    }
    subtotal = courses.reduce((s, c) => s + c.price, 0)
    total = subtotal - (coupon ? Math.round((subtotal * coupon.percent) / 100) : 0)
  }
  const discount = subtotal - total

  const orderId = createOrder(req.user, { courses, coupon, subtotal, discount, total, note })
  const paymentUrl = total > 0 ? startPayment(orderId, req) : null

  res.status(201).json({
    id: orderId, subtotal, discount, total, coupon: coupon?.code ?? null,
    courseIds: courses.map((c) => c.id), status: paymentUrl ? 'pending' : 'paid', paymentUrl,
  })
})

app.get('/api/me/orders/:id', requireAuth, (req, res) => {
  const order = getOrderDetail(Number(req.params.id))
  if (!order || order.userId !== req.user.id) throw new HttpError(404, 'Không tìm thấy đơn hàng')
  res.json(order)
})

// Thanh toán lại đơn đang chờ (VD: lần trước khách hủy hoặc thẻ bị từ chối)
app.post('/api/me/orders/:id/pay', limits.order, requireAuth, (req, res) => {
  res.json({ paymentUrl: startPayment(Number(req.params.id), req, req.user.id) })
})

app.post('/api/me/orders/:id/cancel', requireAuth, (req, res) => {
  res.json(cancelPendingOrder(Number(req.params.id), { actorId: req.user.id, ownerId: req.user.id, reason: 'Khách hủy đơn chưa thanh toán' }))
})

// ---------- VNPay ----------
// IPN: VNPay gọi trực tiếp server-to-server (cấu hình URL này trên cổng quản lý merchant của VNPay)
app.get('/api/payments/vnpay/ipn', (req, res) => {
  try {
    const { rspCode, message } = confirmPayment(req.query)
    res.json({ RspCode: rspCode, Message: message })
  } catch (err) {
    console.error('Lỗi xử lý IPN VNPay', err)
    res.json({ RspCode: '99', Message: 'Unknown error' })
  }
})

// Return URL: trình duyệt của khách được VNPay chuyển về đây. Xử lý giống IPN (an toàn vì đã kiểm tra
// chữ ký và chỉ xử lý mỗi giao dịch một lần) để khách thấy kết quả ngay cả khi IPN đến chậm.
app.get('/api/payments/vnpay/return', (req, res) => {
  const { rspCode, orderId } = confirmPayment(req.query)
  const status = rspCode === '97' ? 'loi-chu-ky' : rspCode === '04' ? 'sai-so-tien' : 'xong'
  // FRONTEND_URL: địa chỉ giao diện khi giao diện và API ở hai nơi khác nhau (VD Vercel + Render)
  const frontend = (process.env.FRONTEND_URL || '').replace(/\/$/, '')
  res.redirect(`${frontend}/#/thanh-toan/ket-qua?don=${orderId ?? ''}&kq=${status}`)
})

// Cổng VNPay giả lập — chỉ có khi chạy dev mà chưa cấu hình VNPay thật
if (paymentMode === 'mock') {
  app.get('/api/payments/mock-vnpay', (req, res) => {
    if (!verifyVnpaySignature(req.query)) return res.status(400).send('Chữ ký không hợp lệ')
    const q = req.query
    const result = (code) => signVnpayParams({
      vnp_Amount: q.vnp_Amount, vnp_BankCode: 'NCB', vnp_OrderInfo: q.vnp_OrderInfo, vnp_PayDate: vnTime(),
      vnp_ResponseCode: code, vnp_TmnCode: q.vnp_TmnCode, vnp_TransactionNo: String(Date.now()).slice(-8),
      vnp_TransactionStatus: code === '00' ? '00' : '02', vnp_TxnRef: q.vnp_TxnRef,
    })
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
    res.send(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VNPay giả lập</title><style>
body{font-family:system-ui,sans-serif;background:#f1f4f9;margin:0;display:grid;place-items:center;min-height:100vh}
.box{background:#fff;border-radius:14px;padding:28px;width:min(420px,92vw);box-shadow:0 8px 30px #0001}
.tag{background:#fff4d6;color:#8a5a00;padding:6px 10px;border-radius:8px;font-size:13px;margin-bottom:16px}
h1{font-size:20px;color:#005baa;margin:0 0 12px}dl{display:grid;grid-template-columns:auto 1fr;gap:8px 12px;font-size:14px}
dd{margin:0;font-weight:600;text-align:right}a{display:block;text-align:center;padding:12px;border-radius:999px;margin-top:10px;text-decoration:none;font-weight:700}
.ok{background:#005baa;color:#fff}.no{border:1.5px solid #ccd;color:#445}</style></head><body><div class="box">
<div class="tag">⚠ Cổng thanh toán GIẢ LẬP để thử khi phát triển — không có giao dịch thật</div>
<h1>VNPay (giả lập)</h1><dl><dt>Đơn hàng</dt><dd>${esc(q.vnp_OrderInfo)}</dd><dt>Mã giao dịch</dt><dd>${esc(q.vnp_TxnRef)}</dd>
<dt>Số tiền</dt><dd>${(Number(q.vnp_Amount) / 100).toLocaleString('vi-VN')}đ</dd></dl>
<a class="ok" href="/api/payments/vnpay/return?${result('00')}">Thanh toán thành công</a>
<a class="no" href="/api/payments/vnpay/return?${result('51')}">Thẻ không đủ số dư</a>
<a class="no" href="/api/payments/vnpay/return?${result('24')}">Hủy giao dịch</a>
</div></body></html>`)
  })
}

app.post('/api/courses/:id/enroll', requireAuth, (req, res) => {
  const course = getCourse(Number(req.params.id))
  if (!course) throw new HttpError(404, 'Không tìm thấy khóa học')
  if (course.price > 0 && !enrolledIds(req.user.id).includes(course.id)) {
    throw new HttpError(402, 'Khóa học có phí, vui lòng mua để ghi danh')
  }
  enroll.run(req.user.id, course.id, 'free')
  res.json({ ok: true, courseId: course.id })
})

app.post('/api/activate', limits.activate, requireAuth, (req, res) => {
  const code = str(req.body?.code, 40).replace(/[\s-]/g, '').toUpperCase()
  const row = db.prepare('SELECT * FROM activation_codes WHERE code = ?').get(code)
  if (!row) throw new HttpError(404, 'Mã kích hoạt không tồn tại')
  if (row.used_by) throw new HttpError(409, 'Mã kích hoạt đã được sử dụng')

  transaction(() => {
    db.prepare("UPDATE activation_codes SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?").run(req.user.id, code)
    enroll.run(req.user.id, row.course_id, 'activation')
  })
  res.json({ ok: true, course: getAnyCourse(row.course_id) })
})

// ---------- Form liên hệ ----------
app.post('/api/leads', limits.lead, (req, res) => {
  const b = req.body || {}
  const lead = {
    type: ['contact', 'business', 'teacher'].includes(b.type) ? b.type : 'contact',
    page: str(b.page, 60),
    name: str(b.name, 80),
    email: str(b.email, 120).toLowerCase(),
    phone: str(b.phone, 20),
    company: str(b.company, 120),
    message: str(b.message, 2000),
  }
  if (!lead.name) throw new HttpError(400, 'Vui lòng nhập họ tên')
  if (!EMAIL_RE.test(lead.email)) throw new HttpError(400, 'Email không hợp lệ')
  if (!/^[0-9+\s.]{8,20}$/.test(lead.phone)) throw new HttpError(400, 'Số điện thoại không hợp lệ')
  if (lead.type === 'business' && !lead.company) throw new HttpError(400, 'Vui lòng nhập tên doanh nghiệp')

  db.prepare(`INSERT INTO leads (type, page, name, email, phone, company, message) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(lead.type, lead.page, lead.name, lead.email, lead.phone, lead.company, lead.message)
  res.status(201).json({ ok: true })
})

app.post('/api/newsletter', limits.newsletter, (req, res) => {
  const email = str(req.body?.email, 120).toLowerCase()
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Email không hợp lệ')
  db.prepare('INSERT OR IGNORE INTO newsletter (email) VALUES (?)').run(email)
  res.status(201).json({ ok: true })
})

app.use('/api/admin', adminRouter)
app.use('/api', learningRouter)
app.use('/api', mediaRouter)

app.use('/api', (_req, _res) => {
  throw new HttpError(404, 'API không tồn tại')
})

// ---------- Phục vụ bản build React khi chạy production ----------
const dist = resolve('dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')))
}

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu gửi lên không hợp lệ' })
  // Lỗi do code chủ động báo (HttpError) thì hiện đúng thông báo, kể cả 502/503;
  // lỗi bất ngờ thì ẩn chi tiết để không lộ thông tin nội bộ
  const known = err instanceof HttpError
  const status = err.status || 500
  if (!known && status >= 500) console.error(err)
  res.status(status).json({ error: known || status < 500 ? err.message : 'Lỗi máy chủ, vui lòng thử lại' })
})

// Dùng API_PORT (không dùng PORT) để không đụng cổng của Vite khi chạy dev
const PORT = Number(process.env.API_PORT) || 4000
app.listen(PORT, (err) => {
  if (err) {
    console.error(`✗ Không mở được cổng ${PORT}: ${err.code === 'EADDRINUSE' ? 'cổng đang được dùng bởi chương trình khác' : err.message}`)
    process.exit(1)
  }
  console.log(`✓ API đang chạy tại http://localhost:${PORT}`)
})
