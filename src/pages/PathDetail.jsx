import { formatPrice, discount } from '../utils.js'
import { navigate } from '../router.js'
import { useApi } from '../api.js'
import Status from '../components/Status.jsx'
import NotFound from './NotFound.jsx'

export default function PathDetail({ id, onAdd }) {
  const { data: path, loading, error } = useApi(`/paths/${encodeURIComponent(id)}`)

  if (error?.status === 404) return <NotFound />
  if (!path) return <div className="container page"><Status loading={loading} error={error} /></div>

  const courses = path.courseList

  const enrollAll = () => {
    courses.forEach(onAdd)
    navigate('#/gio-hang')
  }

  return (
    <>
      <section className="detail-hero" style={{ background: `linear-gradient(120deg, #1c1f26, ${path.color})` }}>
        <div className="container detail-info">
          <nav className="breadcrumb">
            <a href="#/">Trang chủ</a> › <span>Lộ trình học tập</span>
          </nav>
          <h1>Chương trình {path.title}</h1>
          <p className="detail-desc">{path.desc}</p>
          <p className="detail-meta">
            <span>📚 {path.courses} khóa học</span>
            <span>👥 {path.learners.toLocaleString('vi-VN')} học viên quan tâm</span>
          </p>
          <div className="price big light">
            <b>{formatPrice(path.price)}</b>
            <s>{formatPrice(path.oldPrice)}</s>
            <span className="tag">-{discount(path.price, path.oldPrice)}%</span>
          </div>
          <button className="btn-light" onClick={enrollAll}>Đăng ký lộ trình</button>
        </div>
      </section>

      <div className="container page">
        <h2 className="page-subtitle">Các bước trong lộ trình</h2>
        <ol className="timeline">
          {courses.map((c, i) => (
            <li key={c.id}>
              <span className="step" style={{ background: path.color }}>{i + 1}</span>
              <a href={`#/khoa-hoc/${c.id}`} className="timeline-card">
                <span className="timeline-emoji" style={{ background: c.color }}>{c.emoji}</span>
                <span>
                  <b>{c.title}</b>
                  <small className="muted">{c.teacher} · {c.lessonCount} bài · {c.hours} giờ</small>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </>
  )
}
