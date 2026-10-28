import { useState } from 'react'
import { formatPrice, discount } from '../utils.js'
import { navigate } from '../router.js'
import { api, useApi } from '../api.js'
import CourseCard from '../components/CourseCard.jsx'
import Status from '../components/Status.jsx'
import NotFound from './NotFound.jsx'

export default function CourseDetail({ id, cart, onAdd, user, enrolledIds, onEnrolled }) {
  const { data: course, loading, error } = useApi(`/courses/${encodeURIComponent(id)}`)
  const [open, setOpen] = useState(0)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  if (error?.status === 404) return <NotFound />
  if (!course) return <div className="container page"><Status loading={loading} error={error} /></div>

  const inCart = cart.some((c) => c.id === course.id)
  const isEnrolled = enrolledIds.includes(course.id)
  const off = discount(course.price, course.oldPrice)

  const buyNow = () => {
    onAdd(course)
    navigate('#/gio-hang')
  }

  const enrollFree = async () => {
    if (!user) return navigate(`#/dang-nhap?tiep=khoa-hoc/${course.id}`)
    setBusy(true)
    setActionError('')
    try {
      await api(`/courses/${course.id}/enroll`, { method: 'POST' })
      onEnrolled()
      navigate(`#/hoc/${course.id}`)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="detail-hero">
        <div className="container detail-hero-inner">
          <div className="detail-info">
            <nav className="breadcrumb">
              <a href="#/">Trang chủ</a> › <a href={`#/khoa-hoc?chu-de=${course.topic}`}>{course.topicName}</a>
            </nav>
            <h1>{course.title}</h1>
            <p className="detail-desc">{course.description}</p>
            <p className="detail-meta">
              <span className="stars">★ {course.rating || 'Mới'}</span>
              <span>({course.reviews} đánh giá)</span>
              <span>👥 {course.students.toLocaleString('vi-VN')} học viên</span>
            </p>
            <p className="detail-meta">
              <span>👤 Giảng viên: <b>{course.teacher}</b></span>
              <span>📶 {course.level}</span>
              <span>⏱ {course.hours} giờ</span>
              <span>📚 {course.lessonCount} bài học</span>
            </p>
          </div>
        </div>
      </section>

      <div className="container detail-layout">
        <div className="detail-main">
          <section className="box">
            <h2>Bạn sẽ học được gì?</h2>
            <ul className="outcomes">
              {course.outcomes.map((o) => <li key={o}>✔ {o}</li>)}
            </ul>
          </section>

          <section className="box">
            <h2>Nội dung khóa học</h2>
            <p className="muted small-gap">{course.curriculum.length} chương · {course.lessonCount} bài học · {course.hours} giờ</p>
            {course.curriculum.map((ch, i) => (
              <div key={ch.name} className={`chapter ${open === i ? 'open' : ''}`}>
                <button className="chapter-head" onClick={() => setOpen(open === i ? -1 : i)}>
                  <span>{open === i ? '▾' : '▸'} {ch.name}</span>
                  <span className="muted">{ch.lessons.length} bài</span>
                </button>
                {open === i && (
                  <ul className="lessons">
                    {ch.lessons.map((l) => (
                      <li key={l.id}>
                        <span>{l.hasVideo ? '▶' : '📄'} {l.title}</span>
                        <span>
                          {(l.preview || isEnrolled) && (
                            <a href={`#/hoc/${course.id}/${l.id}`} className="link-btn">{isEnrolled ? 'Học' : 'Học thử'}</a>
                          )}
                          <span className="muted">{l.duration}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <section className="box">
            <h2>Giảng viên</h2>
            <div className="teacher-box">
              <span className="avatar big">{course.teacher.split(' ').pop()[0]}</span>
              <div>
                <h3>{course.teacher}</h3>
                <p className="muted">{course.teacherBio}</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="buy-box">
          <div className="buy-thumb" style={{ background: `linear-gradient(135deg, ${course.color}, ${course.color}aa)` }}>
            <span>{course.emoji}</span>
          </div>
          <div className="buy-body">
            <div className="price big">
              <b>{course.price ? formatPrice(course.price) : 'Miễn phí'}</b>
              {course.oldPrice > course.price && <s>{formatPrice(course.oldPrice)}</s>}
              {off > 0 && <span className="tag">-{off}%</span>}
            </div>
            {isEnrolled ? (
              <a href={`#/hoc/${course.id}`} className="btn-primary full center-text">✓ Đã sở hữu – Vào học</a>
            ) : course.price === 0 ? (
              <button className="btn-primary full" onClick={enrollFree} disabled={busy}>
                {busy ? 'Đang ghi danh...' : 'Ghi danh miễn phí'}
              </button>
            ) : (
              <>
                <button className="btn-primary full" onClick={buyNow}>Mua ngay</button>
                <button className="btn-outline full" onClick={() => onAdd(course)} disabled={inCart}>
                  {inCart ? '✓ Đã có trong giỏ' : 'Thêm vào giỏ hàng'}
                </button>
              </>
            )}
            {actionError && <p className="error">{actionError}</p>}
            <ul className="buy-perks">
              <li>♾ Sở hữu khóa học trọn đời</li>
              <li>📱 Học trên mọi thiết bị</li>
              <li>🎓 Cấp chứng nhận hoàn thành</li>
              <li>↩️ Hoàn tiền trong 365 ngày</li>
            </ul>
          </div>
        </aside>
      </div>

      {course.related.length > 0 && (
        <section className="section container">
          <div className="section-head"><h2>Khóa học liên quan</h2></div>
          <div className="grid">
            {course.related.map((c) => (
              <CourseCard key={c.id} course={c} onAdd={onAdd} inCart={cart.some((x) => x.id === c.id)} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
