import { useRef, useState } from 'react'
import { api, uploadFile } from '../api.js'

const formatSize = (bytes) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
    : bytes >= 1024 ** 2 ? `${Math.round(bytes / 1024 ** 2)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`

// Đọc thời lượng video ngay trên trình duyệt để điền sẵn cho bài học
const readDuration = (file) =>
  new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    const done = (value) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    video.preload = 'metadata'
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null)
    video.onerror = () => done(null)
    video.src = url
  })

// Ô tải / thay / xóa video của một bài học. Video được lưu ngay khi tải xong, không cần bấm "Lưu".
export default function LessonVideo({ lesson, onChange }) {
  const input = useRef(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  if (!lesson.id) return <small className="muted">Lưu khóa học trước để tải video cho bài này.</small>

  const upload = async (file) => {
    if (!file) return
    setError('')
    setProgress(0)
    try {
      const seconds = await readDuration(file)
      const result = await uploadFile(`/admin/lessons/${lesson.id}/video`, file, {
        headers: seconds ? { 'X-Duration': String(seconds) } : {},
        onProgress: setProgress,
      })
      onChange({ hasVideo: true, videoSize: result.videoSize, ...(result.duration ? { duration: result.duration } : {}) })
    } catch (err) {
      setError(err.message)
    }
    setProgress(null)
    if (input.current) input.current.value = ''
  }

  const remove = async () => {
    if (!window.confirm(`Xóa video của bài “${lesson.title}”?`)) return
    setError('')
    try {
      await api(`/admin/lessons/${lesson.id}/video`, { method: 'DELETE' })
      onChange({ hasVideo: false, videoSize: null })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="lesson-video">
      <input ref={input} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => upload(e.target.files[0])} />
      {progress !== null ? (
        <span className="upload-progress">
          <span className="bar"><span style={{ width: `${progress}%` }} /></span>
          Đang tải lên {progress}%
        </span>
      ) : lesson.hasVideo ? (
        <>
          <span className="pill pill-on">🎬 Có video{lesson.videoSize ? ` · ${formatSize(lesson.videoSize)}` : ''}</span>
          <button type="button" className="link-btn" onClick={() => input.current.click()}>Thay video</button>
          <button type="button" className="link-btn danger" onClick={remove}>Xóa video</button>
        </>
      ) : (
        <button type="button" className="btn-outline small-btn" onClick={() => input.current.click()}>⬆ Tải video lên</button>
      )}
      {error && <small className="error">{error}</small>}
    </div>
  )
}
