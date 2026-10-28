import { useState } from 'react'
import { useApi } from '../api.js'
import { formatPrice, formatDate } from '../utils.js'
import Status from '../components/Status.jsx'

const compact = (n) =>
  n >= 1e6 ? `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n)

function RevenueChart({ data }) {
  const [hover, setHover] = useState(null)
  if (!data.some((d) => d.revenue)) return <p className="empty muted">Chưa có doanh thu trong 14 ngày qua.</p>

  const max = Math.max(...data.map((d) => d.revenue))
  const W = 640
  const H = 200
  const pad = { top: 12, bottom: 24, left: 44 }
  const plotH = H - pad.top - pad.bottom
  const slot = (W - pad.left) / data.length
  const barW = Math.min(28, slot - 6)
  const y = (v) => pad.top + plotH - (v / max) * plotH
  const ticks = [0, max / 2, max]

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ doanh thu 14 ngày gần nhất">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.left - 6} y={y(t) + 4} textAnchor="end" className="chart-axis">{compact(Math.round(t))}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + i * slot + (slot - barW) / 2
          const h = Math.max((d.revenue / max) * plotH, d.revenue ? 2 : 0)
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* Vùng nhận chuột rộng hơn cột để dễ rê */}
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={plotH} fill="transparent" />
              <path
                className={`chart-bar ${hover === i ? 'on' : ''}`}
                d={h ? `M${x},${y(0)} v${-(h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} z` : ''}
              />
              {i % 2 === 0 && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="chart-axis">
                  {d.day.slice(8, 10)}/{d.day.slice(5, 7)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((pad.left + (hover + 0.5) * slot) / W) * 100}%` }}>
          <b>{formatDate(data[hover].day, false)}</b>
          <span>{formatPrice(data[hover].revenue)}</span>
          <span className="muted">{data[hover].orders} đơn</span>
        </div>
      )}
      <table className="sr-only">
        <caption>Doanh thu theo ngày</caption>
        <tbody>
          {data.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.revenue}</td><td>{d.orders}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}

export default function Dashboard() {
  const { data, loading, error } = useApi('/admin/stats')
  if (!data) return <Status loading={loading} error={error} />
  const { totals } = data

  const tiles = [
    { label: 'Doanh thu thực', value: formatPrice(totals.revenue), note: totals.refunded ? `đã hoàn ${formatPrice(totals.refunded)}` : null },
    { label: 'Đơn đã thanh toán', value: totals.orders, note: totals.pendingOrders ? `${totals.pendingOrders} đơn chờ thanh toán` : null },
    { label: 'Chờ duyệt hoàn tiền', value: totals.refundRequests, href: '#/admin/don-hang', alert: totals.refundRequests > 0 },
    { label: 'Người dùng', value: totals.users },
    { label: 'Lượt ghi danh', value: totals.enrollments },
    { label: 'Khóa học', value: totals.courses, note: totals.hiddenCourses ? `${totals.hiddenCourses} đang ẩn` : null },
    { label: 'Liên hệ mới', value: totals.newLeads, href: '#/admin/lien-he' },
  ]

  return (
    <>
      <h1 className="admin-title">Tổng quan</h1>
      <div className="tiles">
        {tiles.map((t) => {
          const body = (
            <>
              <span className="tile-label">{t.label}</span>
              <b className="tile-value">{t.value}</b>
              {t.note && <small className="muted">{t.note}</small>}
            </>
          )
          const cls = `tile ${t.alert ? 'tile-alert' : ''}`
          return t.href ? <a key={t.label} href={t.href} className={cls}>{body}</a> : <div key={t.label} className={cls}>{body}</div>
        })}
      </div>

      <section className="box admin-box">
        <h2>Doanh thu 14 ngày gần nhất</h2>
        <RevenueChart data={data.revenueByDay} />
      </section>

      <div className="admin-cols">
        <section className="box admin-box">
          <h2>Khóa học bán chạy</h2>
          {data.topCourses.length ? (
            <table className="table">
              <thead><tr><th>Khóa học</th><th className="num">Đã bán</th><th className="num">Doanh thu</th></tr></thead>
              <tbody>
                {data.topCourses.map((c) => (
                  <tr key={c.id}>
                    <td><a href={`#/admin/khoa-hoc/${c.id}`}>{c.emoji} {c.title}</a></td>
                    <td className="num">{c.sold}</td>
                    <td className="num">{formatPrice(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">Chưa có đơn hàng.</p>}
        </section>

        <section className="box admin-box">
          <h2>Đơn hàng gần đây</h2>
          {data.recentOrders.length ? (
            <table className="table">
              <thead><tr><th>Đơn</th><th>Khách hàng</th><th className="num">Tổng</th></tr></thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td><a href={`#/admin/don-hang/${o.id}`}>#{o.id}</a><br /><small className="muted">{formatDate(o.createdAt)}</small></td>
                    <td>{o.name}<br /><small className="muted">{o.email}</small></td>
                    <td className="num">{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">Chưa có đơn hàng.</p>}
          <a href="#/admin/don-hang" className="see-more">Xem tất cả →</a>
        </section>
      </div>
    </>
  )
}
