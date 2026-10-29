import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as seed from './seed-data.js'
import { hashPassword, verifyPassword } from './password.js'

const isDev = process.env.NODE_ENV === 'development'

const file = resolve(process.env.DB_FILE || 'server/data/app.db')
mkdirSync(dirname(file), { recursive: true })

export const db = new DatabaseSync(file)
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')

db.exec(`
  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, count INTEGER DEFAULT 0, sort INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    teacher TEXT NOT NULL,
    teacher_bio TEXT,
    topic_id TEXT NOT NULL REFERENCES topics(id),
    collection TEXT,
    rating REAL DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    price INTEGER NOT NULL DEFAULT 0,
    old_price INTEGER NOT NULL DEFAULT 0,
    emoji TEXT, color TEXT, level TEXT,
    hours REAL DEFAULT 0,
    students INTEGER DEFAULT 0,
    description TEXT,
    outcomes TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chapter_no INTEGER NOT NULL,
    chapter TEXT NOT NULL,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    duration TEXT,
    preview INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS paths (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, total_courses INTEGER,
    learners INTEGER DEFAULT 0, price INTEGER, old_price INTEGER, color TEXT, sort INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS path_courses (
    path_id TEXT NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id),
    position INTEGER NOT NULL,
    PRIMARY KEY (path_id, course_id)
  );
  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price INTEGER, period TEXT, color TEXT, hot INTEGER DEFAULT 0, perks TEXT
  );
  CREATE TABLE IF NOT EXISTS pages (
    slug TEXT PRIMARY KEY, title TEXT, icon TEXT, intro TEXT, form TEXT, sections TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS coupons (
    code TEXT PRIMARY KEY, percent INTEGER NOT NULL, active INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subtotal INTEGER NOT NULL, discount INTEGER NOT NULL, total INTEGER NOT NULL,
    coupon TEXT, status TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS order_items (
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id),
    price INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS enrollments (
    user_id INTEGER NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    source TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, course_id)
  );
  CREATE TABLE IF NOT EXISTS activation_codes (
    code TEXT PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id),
    used_by INTEGER REFERENCES users(id),
    used_at TEXT
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT, page TEXT, name TEXT, email TEXT, phone TEXT, company TEXT, message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS newsletter (
    email TEXT PRIMARY KEY, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`)

// Thêm cột mới cho database đã tồn tại (migration đơn giản)
function addColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)
  if (columns.includes(column)) return false
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  return true
}
addColumn('users', 'role', "TEXT NOT NULL DEFAULT 'user'")
addColumn('courses', 'published', 'INTEGER NOT NULL DEFAULT 1')
addColumn('leads', 'status', "TEXT NOT NULL DEFAULT 'new'")
// Hoàn tiền / hủy đơn
addColumn('orders', 'refunded_amount', 'INTEGER NOT NULL DEFAULT 0')
addColumn('orders', 'refund_request', 'TEXT')
addColumn('orders', 'refund_requested_at', 'TEXT')
addColumn('order_items', 'refunded', 'INTEGER NOT NULL DEFAULT 0')
db.exec(`CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  actor_id INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`)

// Thanh toán qua cổng (VNPay): đơn chỉ được coi là đã thanh toán khi có paid_at
if (addColumn('orders', 'paid_at', 'TEXT')) {
  // Đơn tạo trước khi có cổng thanh toán: coi như đã thanh toán lúc tạo
  db.exec("UPDATE orders SET paid_at = created_at WHERE status != 'pending'")
}
addColumn('orders', 'payment_method', "TEXT NOT NULL DEFAULT 'legacy'")
db.exec(`CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  txn_ref TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_code TEXT,
  transaction_no TEXT,
  bank_code TEXT,
  pay_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
)`)
db.exec('CREATE INDEX IF NOT EXISTS payments_order ON payments(order_id)')

// Nội dung học: video + ghi chú từng bài, tiến độ học của từng học viên
addColumn('lessons', 'video_file', 'TEXT')
addColumn('lessons', 'video_size', 'INTEGER')
addColumn('lessons', 'content', 'TEXT')
db.exec(`CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position REAL NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, lesson_id)
)`)

// Video lưu ngoài thư mục public, chỉ phát qua đường dẫn có chữ ký (server/learning.js)
export const VIDEO_DIR = resolve(process.env.UPLOAD_DIR || resolve(dirname(file), 'uploads'), 'videos')
mkdirSync(VIDEO_DIR, { recursive: true })

// Thư viện ảnh: ảnh bìa khóa học (công khai), chọn lại được cho nhiều khóa
db.exec(`CREATE TABLE IF NOT EXISTS media_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file TEXT NOT NULL UNIQUE,
  name TEXT,
  size INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`)
addColumn('courses', 'image', 'TEXT')
export const IMAGE_DIR = resolve(process.env.UPLOAD_DIR || resolve(dirname(file), 'uploads'), 'images')
mkdirSync(IMAGE_DIR, { recursive: true })

// Lộ trình: giá tính từ các khóa bên trong, giảm theo %
if (addColumn('paths', 'discount_percent', 'INTEGER NOT NULL DEFAULT 20')) {
  const set = db.prepare('UPDATE paths SET discount_percent = ? WHERE id = ?')
  seed.learningPaths.forEach((p) => set.run(p.discountPercent, p.id))
}

export function transaction(fn) {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

function seedIfEmpty() {
  if (db.prepare('SELECT COUNT(*) AS n FROM topics').get().n > 0) return

  transaction(() => {
    const insTopic = db.prepare('INSERT INTO topics (id, name, icon, count, sort) VALUES (?, ?, ?, ?, ?)')
    seed.topics.forEach((t, i) => insTopic.run(t.id, t.name, t.icon, t.count, i))

    const insCourse = db.prepare(`INSERT INTO courses
      (id, title, teacher, teacher_bio, topic_id, collection, rating, reviews, price, old_price, emoji, color, level, hours, students, description, outcomes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const insLesson = db.prepare(`INSERT INTO lessons (course_id, chapter_no, chapter, position, title, duration, preview)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)

    const lessonCount = seed.chapterNames.reduce((s, [, lessons]) => s + lessons.length, 0)
    let id = 0
    for (const [collection, list] of Object.entries(seed.courses)) {
      for (const [title, teacher, topic, rating, reviews, price, oldPrice, emoji] of list) {
        id++
        insCourse.run(
          id, title, teacher,
          `${teacher} là chuyên gia với hơn ${5 + (id % 10)} năm kinh nghiệm thực chiến, đã đào tạo cho hàng nghìn học viên và nhiều doanh nghiệp trong nước.`,
          topic, collection, rating, reviews, price, oldPrice, emoji,
          seed.palette[id % seed.palette.length],
          ['Cơ bản', 'Trung cấp', 'Nâng cao'][id % 3],
          Number((lessonCount * 0.6 + (id % 5)).toFixed(1)),
          reviews * 37 + id * 53,
          `Khóa học "${title}" được thiết kế dành cho người đi làm muốn nâng cao năng lực một cách bài bản và thực tế. Nội dung đi từ nền tảng đến ứng dụng, kèm bài tập và tình huống thực tế giúp bạn áp dụng ngay vào công việc.`,
          JSON.stringify(seed.outcomesByTopic[topic]),
        )
        seed.chapterNames.forEach(([chapter, lessons], ci) => {
          lessons.forEach((lesson, li) => {
            const duration = `${((id * 3 + ci * 5 + li * 7) % 15) + 4}:${String((id * 11 + li * 13) % 60).padStart(2, '0')}`
            insLesson.run(id, ci + 1, chapter, li + 1, lesson, duration, ci === 0 && li < 2 ? 1 : 0)
          })
        })
      }
    }

    const insPath = db.prepare(`INSERT INTO paths (id, title, description, total_courses, learners, price, old_price, color, sort, discount_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const insPathCourse = db.prepare('INSERT INTO path_courses (path_id, course_id, position) VALUES (?, ?, ?)')
    seed.learningPaths.forEach((p, i) => {
      insPath.run(p.id, p.title, p.desc, p.courses, p.learners, p.price, p.oldPrice, p.color, i, p.discountPercent)
      p.courseIds.forEach((cid, pos) => insPathCourse.run(p.id, cid, pos))
    })

    const insPlan = db.prepare('INSERT INTO plans (name, price, period, color, hot, perks) VALUES (?, ?, ?, ?, ?, ?)')
    seed.plans.forEach((p) => insPlan.run(p.name, p.price, p.period, p.color, p.hot ? 1 : 0, JSON.stringify(p.perks)))

    const insPage = db.prepare('INSERT INTO pages (slug, title, icon, intro, form, sections) VALUES (?, ?, ?, ?, ?, ?)')
    for (const [slug, p] of Object.entries(seed.pages)) {
      insPage.run(slug, p.title, p.icon, p.intro, p.form ?? null, JSON.stringify(p.sections))
    }

    // Mã giảm giá / mã kích hoạt mẫu dễ đoán nên chỉ tạo khi phát triển
    if (isDev) {
      const insCoupon = db.prepare('INSERT INTO coupons (code, percent) VALUES (?, ?)')
      seed.coupons.forEach((c) => insCoupon.run(c.code, c.percent))

      const insCode = db.prepare('INSERT INTO activation_codes (code, course_id) VALUES (?, ?)')
      seed.activationCodes.forEach((c) => insCode.run(c.code, c.courseId))
    }
  })

  console.log('✓ Đã khởi tạo dữ liệu mẫu vào', file)
}

seedIfEmpty()

// Database từng chạy ở chế độ phát triển rồi đem lên production: vô hiệu các mã mẫu dễ đoán
function disableDemoCodes() {
  if (isDev) return
  const coupons = seed.coupons.map((c) => c.code)
  const codes = seed.activationCodes.map((c) => c.code)
  const off = db.prepare(`UPDATE coupons SET active = 0 WHERE active = 1 AND code IN (${coupons.map(() => '?').join(',')})`).run(...coupons)
  const del = db.prepare(`DELETE FROM activation_codes WHERE used_by IS NULL AND code IN (${codes.map(() => '?').join(',')})`).run(...codes)
  if (off.changes || del.changes) console.warn('⚠ Đã vô hiệu các mã giảm giá / mã kích hoạt mẫu')
}

disableDemoCodes()

const WEAK_PASSWORDS = ['admin123', 'doi-mat-khau-nay', 'password', '12345678', '123456789', 'admin@123']

// Tài khoản quản trị: lấy từ ADMIN_EMAIL / ADMIN_PASSWORD.
// Khi phát triển mà chưa đặt biến môi trường thì dùng tài khoản mặc định ghi trong README.
function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || (isDev ? 'admin@nhutx.local' : '')).trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || (isDev ? 'admin123' : '')
  if (!email || !password) {
    if (!db.prepare("SELECT 1 FROM users WHERE role = 'admin'").get()) {
      console.warn('⚠ Chưa có tài khoản quản trị: đặt ADMIN_EMAIL và ADMIN_PASSWORD trong .env rồi khởi động lại')
    }
    return
  }
  if (!isDev && (password.length < 10 || WEAK_PASSWORDS.includes(password.toLowerCase()))) {
    throw new Error('ADMIN_PASSWORD quá yếu: cần ít nhất 10 ký tự và không dùng mật khẩu mẫu')
  }

  const user = db.prepare('SELECT id, role, password_hash FROM users WHERE email = ?').get(email)
  if (user) {
    if (user.role === 'admin') return
    // Chỉ cấp quyền khi mật khẩu khớp ADMIN_PASSWORD — nếu ai đó đã đăng ký trước email này
    // bằng mật khẩu khác thì không được tự động trở thành quản trị viên.
    if (verifyPassword(password, user.password_hash)) {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id)
      console.log(`✓ Đã cấp quyền quản trị cho ${email}`)
    } else {
      console.error(`⚠ Email ${email} đã có tài khoản với mật khẩu khác ADMIN_PASSWORD — KHÔNG cấp quyền quản trị. Hãy dùng email khác.`)
    }
    return
  }
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
    .run('Quản trị viên', email, hashPassword(password))
  console.log(`✓ Đã tạo tài khoản quản trị ${email}`)
}

ensureAdmin()
