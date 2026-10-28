// Học trực tuyến: xem bài học, phát video có bảo vệ, lưu tiến độ; tải video lên (dùng trong admin.js).
import { Router } from 'express'
import { createWriteStream } from 'node:fs'
import { rename, unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { db, VIDEO_DIR } from './db.js'
import { HttpError, requireAuth, signMediaToken, verifyMediaToken } from './auth.js'

const router = Router()

const MAX_VIDEO_MB = Number(process.env.MAX_VIDEO_MB) || 2048
const VIDEO_TYPES = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' }

const isEnrolled = (userId, courseId) =>
  !!db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId)

// Quản trị viên xem được mọi khóa; học viên chỉ khóa mình sở hữu
export const canAccessCourse = (user, courseId) => !!user && (user.role === 'admin' || isEnrolled(user.id, courseId))

const getLesson = (id) => db.prepare(`SELECT l.id, l.course_id AS courseId, l.title, l.preview, l.video_file AS videoFile
  FROM lessons l WHERE l.id = ?`).get(Number(id))

/** Tiến độ của học viên trên một khóa: số bài xong / tổng và bài học gần nhất. */
export function courseProgress(userId, courseId) {
  const row = db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(p.completed), 0) AS done
    FROM lessons l LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.user_id = ?
    WHERE l.course_id = ?`).get(userId, courseId)
  const last = db.prepare(`SELECT p.lesson_id AS id FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
    WHERE p.user_id = ? AND l.course_id = ? ORDER BY p.updated_at DESC, p.rowid DESC LIMIT 1`).get(userId, courseId)
  return {
    done: row.done,
    total: row.total,
    percent: row.total ? Math.round((row.done / row.total) * 100) : 0,
    lastLessonId: last?.id ?? null,
  }
}

// Toàn bộ nội dung một khóa cho trang học: ai cũng xem được danh sách bài,
// nhưng ghi chú bài học và video chỉ mở cho người có quyền (hoặc bài học thử).
router.get('/learn/:courseId', (req, res) => {
  const course = db.prepare(`SELECT id, title, emoji, color, teacher, published FROM courses WHERE id = ?`).get(Number(req.params.courseId))
  const access = course ? canAccessCourse(req.user, course.id) : false
  if (!course || (!course.published && !access)) throw new HttpError(404, 'Không tìm thấy khóa học')

  const progress = new Map(
    req.user
      ? db.prepare('SELECT lesson_id, position, completed FROM lesson_progress WHERE user_id = ?').all(req.user.id).map((p) => [p.lesson_id, p])
      : [],
  )
  const chapters = []
  for (const l of db.prepare(`SELECT id, chapter_no, chapter, title, duration, preview, content, video_file
    FROM lessons WHERE course_id = ? ORDER BY chapter_no, position`).all(course.id)) {
    const ch = (chapters[l.chapter_no - 1] ??= { name: `Chương ${l.chapter_no}: ${l.chapter}`, lessons: [] })
    const open = access || !!l.preview
    const p = progress.get(l.id)
    ch.lessons.push({
      id: l.id,
      title: l.title,
      duration: l.duration,
      preview: !!l.preview,
      hasVideo: !!l.video_file,
      locked: !open,
      content: open ? l.content || '' : null,
      position: p?.position ?? 0,
      completed: !!p?.completed,
    })
  }

  const { published, ...info } = course
  res.json({
    course: info,
    access,
    chapters: chapters.filter(Boolean),
    progress: req.user && access ? courseProgress(req.user.id, course.id) : null,
  })
})

// Cấp đường dẫn xem video (hết hạn sau 6 giờ)
router.post('/lessons/:id/play', (req, res) => {
  const lesson = getLesson(req.params.id)
  if (!lesson) throw new HttpError(404, 'Không tìm thấy bài học')
  if (!lesson.preview && !canAccessCourse(req.user, lesson.courseId)) {
    throw new HttpError(req.user ? 403 : 401, req.user ? 'Bạn cần mua khóa học để xem bài này' : 'Vui lòng đăng nhập')
  }
  if (!lesson.videoFile) throw new HttpError(404, 'Bài học chưa có video')
  res.json({ url: `/api/media/${signMediaToken(lesson.id)}` })
})

// Phát video: hỗ trợ tua (HTTP Range) nhờ res.sendFile
router.get('/media/:token', (req, res) => {
  const lessonId = verifyMediaToken(req.params.token)
  if (!lessonId) throw new HttpError(403, 'Đường dẫn video không hợp lệ hoặc đã hết hạn')
  const lesson = getLesson(lessonId)
  if (!lesson?.videoFile) throw new HttpError(404, 'Không tìm thấy video')
  res.sendFile(join(VIDEO_DIR, lesson.videoFile), { headers: { 'Cache-Control': 'private, max-age=3600' } })
})

// Lưu vị trí đang xem / đánh dấu đã học xong
router.post('/lessons/:id/progress', requireAuth, (req, res) => {
  const lesson = getLesson(req.params.id)
  if (!lesson) throw new HttpError(404, 'Không tìm thấy bài học')
  if (!canAccessCourse(req.user, lesson.courseId)) throw new HttpError(403, 'Bạn cần mua khóa học để lưu tiến độ')

  const prev = db.prepare('SELECT position, completed FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lesson.id)
  const position = Number.isFinite(Number(req.body?.position)) ? Math.max(0, Number(req.body.position)) : prev?.position ?? 0
  const completed = typeof req.body?.completed === 'boolean' ? req.body.completed : !!prev?.completed
  db.prepare(`INSERT INTO lesson_progress (user_id, lesson_id, position, completed, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET position = excluded.position, completed = excluded.completed, updated_at = CURRENT_TIMESTAMP`)
    .run(req.user.id, lesson.id, position, completed ? 1 : 0)
  res.json({ position, completed, progress: courseProgress(req.user.id, lesson.courseId) })
})

export default router

// ---------- Dùng cho trang quản trị ----------

export async function removeVideoFiles(files) {
  for (const f of files.filter(Boolean)) {
    await unlink(join(VIDEO_DIR, f)).catch(() => {})
  }
}

/**
 * Nhận video gửi thẳng trong thân request (Content-Type: video/mp4 | webm | quicktime),
 * ghi ra file tạm rồi đổi tên khi đủ dữ liệu. Header X-Duration (giây) cập nhật thời lượng bài.
 */
export async function receiveLessonVideo(req, lessonId) {
  const lesson = getLesson(lessonId)
  if (!lesson) throw new HttpError(404, 'Không tìm thấy bài học')
  const ext = VIDEO_TYPES[(req.get('content-type') || '').split(';')[0].trim()]
  if (!ext) throw new HttpError(415, 'Chỉ nhận video MP4, WebM hoặc MOV')
  const max = MAX_VIDEO_MB * 1024 * 1024
  if (Number(req.get('content-length')) > max) throw new HttpError(413, `Video vượt quá ${MAX_VIDEO_MB} MB`)

  const name = `${lesson.id}-${randomUUID()}${ext}`
  const tmp = join(VIDEO_DIR, `${name}.part`)
  let size = 0
  try {
    await new Promise((resolveUpload, rejectUpload) => {
      const out = createWriteStream(tmp)
      req.on('data', (chunk) => {
        size += chunk.length
        if (size > max) {
          req.unpipe(out)
          out.destroy()
          rejectUpload(new HttpError(413, `Video vượt quá ${MAX_VIDEO_MB} MB`))
        }
      })
      req.on('aborted', () => rejectUpload(new HttpError(400, 'Tải lên bị gián đoạn')))
      req.on('error', rejectUpload)
      out.on('error', rejectUpload)
      out.on('finish', resolveUpload)
      req.pipe(out)
    })
    if (!size) throw new HttpError(400, 'File video trống')
    await rename(tmp, join(VIDEO_DIR, name))
  } catch (err) {
    await unlink(tmp).catch(() => {})
    throw err
  }

  const seconds = Number(req.get('x-duration'))
  const duration = Number.isFinite(seconds) && seconds > 0
    ? `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
    : null
  db.prepare('UPDATE lessons SET video_file = ?, video_size = ?, duration = COALESCE(?, duration) WHERE id = ?')
    .run(name, size, duration, lesson.id)
  await removeVideoFiles([lesson.videoFile])
  return { id: lesson.id, hasVideo: true, videoSize: size, duration: duration ?? undefined }
}

export async function deleteLessonVideo(lessonId) {
  const lesson = getLesson(lessonId)
  if (!lesson) throw new HttpError(404, 'Không tìm thấy bài học')
  db.prepare('UPDATE lessons SET video_file = NULL, video_size = NULL WHERE id = ?').run(lesson.id)
  await removeVideoFiles([lesson.videoFile])
  return { id: lesson.id, hasVideo: false }
}
