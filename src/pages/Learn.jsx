import { useCallback, useEffect, useRef, useState } from 'react'
import { api, mediaUrl, useApi } from '../api.js'
import Status from '../components/Status.jsx'
import NotFound from './NotFound.jsx'

const SAVE_EVERY_SECONDS = 15

// Khung phát video của một bài. Đường dẫn video có chữ ký, xin mới mỗi lần mở bài.
function Player({ lesson, courseId, user, track, onEnded }) {
  const [src, setSrc] = useState(null)
  const [error, setError] = useState('')
  const video = useRef(null)
  const lastSaved = useRef(0)

  useEffect(() => {
    if (lesson.locked || !lesson.hasVideo) return
    let alive = true
    api(`/lessons/${lesson.id}/play`, { method: 'POST' })
      .then((r) => alive && setSrc(mediaUrl(r.url)))
      .catch((err) => alive && setError(err.message))
    return () => {
      alive = false
    }
  }, [lesson.id, lesson.locked, lesson.hasVideo])

  // Rời bài giữa chừng: lưu vị trí đang xem
  useEffect(() => () => {
    const v = video.current
    if (v && v.currentTime > 1 && !v.ended) track({ position: v.currentTime })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (lesson.locked) {
    return (
      <div className="player player-message">
        <div className="big-icon">🔒</div>
        <p>Bài học này dành cho học viên đã mua khóa học.</p>
        {user
          ? <a href={`#/khoa-hoc/${courseId}`} className="btn-primary inline">Xem khóa học và mua</a>
          : <a href={`#/dang-nhap?tiep=hoc/${courseId}/${lesson.id}`} className="btn-primary inline">Đăng nhập</a>}
      </div>
    )
  }
  if (!lesson.hasVideo) {
    return (
      <div className="player player-message">
        <div className="big-icon">📄</div>
        <p>Bài học này không có video — xem nội dung bên dưới.</p>
      </div>
    )
  }
  if (error) return <div className="player player-message"><p>⚠ {error}</p></div>
  if (!src) return <div className="player player-message"><Status loading /></div>

  return (
    <div className="player">
      <video
        ref={video}
        src={src}
        controls
        playsInline
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onLoadedMetadata={(e) => {
          // Tiếp tục từ chỗ đang xem dở
          const v = e.currentTarget
          if (!lesson.completed && lesson.position > 5 && lesson.position < v.duration - 5) v.currentTime = lesson.position
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime
          if (Math.abs(t - lastSaved.current) >= SAVE_EVERY_SECONDS) {
            lastSaved.current = t
            track({ position: t })
          }
        }}
        onPause={(e) => !e.currentTarget.ended && track({ position: e.currentTarget.currentTime })}
        onEnded={() => {
          track({ position: 0, completed: true })
          onEnded()
        }}
      />
    </div>
  )
}

export default function Learn({ courseId, lessonId, user }) {
  const { data, loading, error } = useApi(`/learn/${encodeURIComponent(courseId)}`, { deps: [user?.id] })
  const [state, setState] = useState(null)
  const [justFinished, setJustFinished] = useState(false)

  useEffect(() => {
    if (data) setState(data)
  }, [data])
  useEffect(() => setJustFinished(false), [lessonId])

  const canTrack = !!(user && state?.access)

  // Lưu tiến độ lên server rồi cập nhật giao diện
  const track = useCallback(async (id, body) => {
    if (!canTrack) return
    try {
      const r = await api(`/lessons/${id}/progress`, { method: 'POST', body })
      setState((s) => ({
        ...s,
        progress: r.progress,
        chapters: s.chapters.map((ch) => ({
          ...ch,
          lessons: ch.lessons.map((l) => (l.id === id ? { ...l, position: r.position, completed: r.completed } : l)),
        })),
      }))
    } catch {
      // Lưu tiến độ thất bại không làm gián đoạn việc học
    }
  }, [canTrack])

  if (error?.status === 404) return <NotFound />
  if (!state) return <div className="container page"><Status loading={loading} error={error} /></div>

  const lessons = state.chapters.flatMap((ch) => ch.lessons)
  if (!lessons.length) {
    return <div className="container page center"><h1 className="page-title">Khóa học chưa có bài học</h1></div>
  }
  const current =
    lessons.find((l) => String(l.id) === String(lessonId)) ??
    lessons.find((l) => l.id === state.progress?.lastLessonId) ??
    lessons.find((l) => !l.locked) ??
    lessons[0]
  const index = lessons.indexOf(current)
  const prev = lessons[index - 1]
  const next = lessons[index + 1]
  const link = (l) => `#/hoc/${state.course.id}/${l.id}`

  return (
    <div className="learn">
      <div className="learn-main">
        <nav className="breadcrumb dark">
          <a href={`#/khoa-hoc/${state.course.id}`}>{state.course.emoji} {state.course.title}</a>
          {state.access && <> · <a href="#/khoa-hoc-cua-toi">Khóa học của tôi</a></>}
        </nav>

        <Player key={current.id} lesson={current} courseId={state.course.id} user={user}
          track={(body) => track(current.id, body)} onEnded={() => setJustFinished(true)} />

        {justFinished && next && !next.locked && (
          <div className="next-banner">
            🎉 Bạn đã học xong bài này. <a href={link(next)} className="btn-primary">Bài tiếp theo →</a>
          </div>
        )}

        <div className="learn-head">
          <div>
            <h1>{current.title}</h1>
            <p className="muted small">Bài {index + 1}/{lessons.length}{current.duration ? ` · ${current.duration}` : ''}{current.preview && !state.access ? ' · Học thử miễn phí' : ''}</p>
          </div>
          {canTrack && !current.locked && (
            <button className={current.completed ? 'btn-primary' : 'btn-outline'} onClick={() => track(current.id, { completed: !current.completed })}>
              {current.completed ? '✓ Đã học xong' : 'Đánh dấu đã học xong'}
            </button>
          )}
        </div>

        {current.content && <div className="lesson-content box">{current.content}</div>}

        <div className="learn-nav">
          {prev ? <a href={link(prev)} className="btn-outline">← {prev.title}</a> : <span />}
          {next && <a href={link(next)} className="btn-outline">{next.title} →</a>}
        </div>
      </div>

      <aside className="learn-side">
        {state.progress && (
          <div className="learn-progress">
            <div className="admin-head"><b>Tiến độ</b><span className="muted small">{state.progress.done}/{state.progress.total} bài · {state.progress.percent}%</span></div>
            <span className="bar"><span style={{ width: `${state.progress.percent}%` }} /></span>
          </div>
        )}
        {!state.access && (
          <div className="learn-buy">
            <p className="small">Bạn đang xem bản học thử.</p>
            <a href={`#/khoa-hoc/${state.course.id}`} className="btn-primary full center-text">Mua khóa học để học tất cả</a>
          </div>
        )}
        {state.chapters.map((ch) => (
          <div key={ch.name} className="learn-chapter">
            <p className="learn-chapter-name">{ch.name}</p>
            {ch.lessons.map((l) => (
              <a key={l.id} href={link(l)} className={`learn-item ${l.id === current.id ? 'on' : ''} ${l.locked ? 'locked' : ''}`}>
                <span className="learn-icon">{l.locked ? '🔒' : l.completed ? '✅' : l.hasVideo ? '▶' : '📄'}</span>
                <span className="learn-title">{l.title}</span>
                <span className="muted small">{l.duration}</span>
              </a>
            ))}
          </div>
        ))}
      </aside>
    </div>
  )
}
