import { useState } from 'react'
import { formatPrice } from '../utils.js'
import { navigate } from '../router.js'
import { api, useApi } from '../api.js'
import Status from '../components/Status.jsx'
import CourseThumb from '../components/CourseThumb.jsx'
import NotFound from './NotFound.jsx'

export default function PathDetail({ id, user, onPaid }) {
  // Tải lại khi đăng nhập / đăng xuất để giá phản ánh các khóa khách đã sở hữu
  const { data: path, loading, error } = useApi(`/paths/${encodeURIComponent(id)}`, { deps: [user?.id] })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  if (error?.status === 404) return <NotFound />
  if (!path) return <div className="container page"><Status loading={loading} error={error} /></div>

  const ownsAll = path.ownedCount === path.courses

  const buy = async () => {
    if (!user) return navigate(`#/dang-nhap?tiep=lo-trinh/${path.id}`)
    setBusy(true)
    setActionError('')
    try {
      const order = await api('/orders', { method: 'POST', body: { pathId: path.id } })
      if (order.paymentUrl) {
        window.location.assign(order.paymentUrl)
        return
      }
      onPaid(order)
      navigate(`#/thanh-toan/ket-qua?don=${order.id}&kq=xong`)
    } catch (err) {
      setActionError(err.message)
    }
    setBusy(false)
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
            {path.oldPrice > path.price && <s>{formatPrice(path.oldPrice)}</s>}
            <span className="tag">-{path.discountPercent}%</span>
          </div>
          {ownsAll ? (
            <a href="#/khoa-hoc-cua-toi" className="btn-light">✓ Bạn đã sở hữu cả lộ trình — Vào học</a>
          ) : (
            <>
              {path.ownedCount > 0 && (
                <p className="path-owned">
                  Bạn đã có {path.ownedCount}/{path.courses} khóa — chỉ cần trả <b>{formatPrice(path.priceForYou)}</b> cho các khóa còn lại.
                </p>
              )}
              <button className="btn-light" onClick={buy} disabled={busy}>
                {busy ? 'Đang xử lý...' : user ? `Mua lộ trình · ${formatPrice(path.priceForYou)}` : 'Đăng nhập để mua lộ trình'}
              </button>
              {actionError && <p className="path-error">{actionError}</p>}
            </>
          )}
        </div>
      </section>

      <div className="container page">
        <h2 className="page-subtitle">Các bước trong lộ trình</h2>
        <ol className="timeline">
          {path.courseList.map((c, i) => (
            <li key={c.id}>
              <span className="step" style={{ background: path.color }}>{i + 1}</span>
              <a href={`#/khoa-hoc/${c.id}`} className="timeline-card">
                <CourseThumb course={c} className="timeline-emoji" />
                <span>
                  <b>{c.title}</b>
                  <small className="muted">{c.teacher} · {c.lessonCount} bài · {c.hours} giờ</small>
                </span>
                <span className="timeline-price">
                  {c.owned ? <span className="pill pill-on">Đã có</span> : <s className="muted">{c.price ? formatPrice(c.price) : 'Miễn phí'}</s>}
                </span>
              </a>
            </li>
          ))}
        </ol>
        <p className="muted small">Giá lộ trình = tổng giá các khóa, giảm {path.discountPercent}%. Ưu đãi lộ trình không cộng thêm mã giảm giá.</p>
      </div>
    </>
  )
}
