import { formatPrice } from '../utils.js'
import { useApi } from '../api.js'
import Status from '../components/Status.jsx'

export default function Membership() {
  const { data: plans, loading, error } = useApi('/plans', { cached: true })

  return (
    <div className="container page">
      <div className="center">
        <div className="big-icon">👑</div>
        <h1 className="page-title">Gói hội viên NhutX Learn</h1>
        <p className="muted">Một lần đăng ký – học không giới hạn hàng nghìn khóa học kỹ năng.</p>
      </div>
      {!plans ? (
        <Status loading={loading} error={error} />
      ) : (
        <div className="plans">
          {plans.map((p) => (
            <article key={p.id} className={`plan box ${p.hot ? 'hot' : ''}`} style={{ '--c': p.color }}>
              {p.hot && <span className="plan-badge">Phổ biến nhất</span>}
              <h3>{p.name}</h3>
              <p className="plan-price">
                {p.price ? <><b>{formatPrice(p.price)}</b> / {p.period}</> : <b>Liên hệ</b>}
              </p>
              <ul>
                {p.perks.map((perk) => <li key={perk}>✔ {perk}</li>)}
              </ul>
              <a href={p.price ? '#/trang/lien-he' : '#/trang/doanh-nghiep'} className="btn-primary full center-text">
                {p.price ? 'Đăng ký ngay' : 'Nhận tư vấn'}
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
