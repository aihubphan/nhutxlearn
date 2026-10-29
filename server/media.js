// Thư viện ảnh: tải ảnh lên, phát ảnh công khai, xóa ảnh không còn dùng.
import { Router } from 'express'
import { createWriteStream } from 'node:fs'
import { rename, unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { db, IMAGE_DIR } from './db.js'
import { HttpError } from './auth.js'

const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB) || 5
const FILE_RE = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/

// Nhận diện loại ảnh từ các byte đầu file (không tin Content-Type / đuôi file do trình duyệt gửi)
function detectImage(head) {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpg'
  if (head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png'
  if (head.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif'
  if (head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
  return null
}

export const imageUrl = (file) => (file ? `/api/images/${file}` : null)

const router = Router()

// Ảnh bìa là nội dung công khai; tên file ngẫu nhiên nên được phép lưu đệm lâu
router.get('/images/:file', (req, res) => {
  if (!FILE_RE.test(req.params.file)) throw new HttpError(404, 'Không tìm thấy ảnh')
  res.sendFile(req.params.file, {
    root: IMAGE_DIR,
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  }, (err) => err && !res.headersSent && res.status(404).json({ error: 'Không tìm thấy ảnh' }))
})

export default router

// ---------- Dùng cho trang quản trị ----------

export function listImages() {
  return db.prepare(`SELECT m.id, m.file, m.name, m.size, m.created_at AS createdAt,
      (SELECT COUNT(*) FROM courses c WHERE c.image = m.file) AS usedBy
    FROM media_images m ORDER BY m.id DESC`).all()
    .map((m) => ({ ...m, url: imageUrl(m.file) }))
}

export const imageExists = (file) => !!db.prepare('SELECT 1 FROM media_images WHERE file = ?').get(file)

/** Nhận ảnh gửi thẳng trong thân request; header X-Filename (encodeURIComponent) là tên gốc để hiển thị. */
export async function receiveImage(req) {
  const max = MAX_IMAGE_MB * 1024 * 1024
  if (Number(req.get('content-length')) > max) throw new HttpError(413, `Ảnh vượt quá ${MAX_IMAGE_MB} MB`)

  const tmp = join(IMAGE_DIR, `${randomUUID()}.part`)
  let size = 0
  let head = Buffer.alloc(0)
  try {
    await new Promise((resolveUpload, rejectUpload) => {
      const out = createWriteStream(tmp)
      req.on('data', (chunk) => {
        if (head.length < 12) head = Buffer.concat([head, chunk]).subarray(0, 12)
        size += chunk.length
        if (size > max) {
          req.unpipe(out)
          out.destroy()
          rejectUpload(new HttpError(413, `Ảnh vượt quá ${MAX_IMAGE_MB} MB`))
        }
      })
      req.on('aborted', () => rejectUpload(new HttpError(400, 'Tải lên bị gián đoạn')))
      req.on('error', rejectUpload)
      out.on('error', rejectUpload)
      out.on('finish', resolveUpload)
      req.pipe(out)
    })
    const ext = detectImage(head)
    if (!ext) throw new HttpError(415, 'Chỉ nhận ảnh JPG, PNG, WebP hoặc GIF')
    const file = `${randomUUID()}.${ext}`
    await rename(tmp, join(IMAGE_DIR, file))

    let name = ''
    try { name = decodeURIComponent(req.get('x-filename') || '') } catch {}
    const { lastInsertRowid } = db.prepare('INSERT INTO media_images (file, name, size) VALUES (?, ?, ?)')
      .run(file, name.slice(0, 200) || file, size)
    return { id: Number(lastInsertRowid), file, name: name || file, size, url: imageUrl(file), usedBy: 0 }
  } catch (err) {
    await unlink(tmp).catch(() => {})
    throw err
  }
}

export async function deleteImage(id) {
  const img = db.prepare('SELECT id, file FROM media_images WHERE id = ?').get(id)
  if (!img) throw new HttpError(404, 'Không tìm thấy ảnh')
  const used = db.prepare('SELECT title FROM courses WHERE image = ?').all(img.file)
  if (used.length) {
    throw new HttpError(409, `Ảnh đang dùng cho: ${used.map((c) => c.title).join(', ')}. Hãy đổi ảnh của các khóa này trước.`)
  }
  db.prepare('DELETE FROM media_images WHERE id = ?').run(img.id)
  await unlink(join(IMAGE_DIR, img.file)).catch(() => {})
  return { ok: true }
}
