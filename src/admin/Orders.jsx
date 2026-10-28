import { useState } from 'react'
import { useApi } from '../api.js'
import { formatPrice, formatDate } from '../utils.js'
import { OrderStatus, orderStatusLabels } from '../orderStatus.jsx'
import Status from '../components/Status.jsx'

const filters = [['', 'Tất cả'], ['requested', 'Chờ duyệt hoàn tiền'], ...Object.entries(orderStatusLabels)]

export default function Orders() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const params = new URLSearchParams({ q: q.trim(), status })
  const { data: orders, loading, error } = useApi(`/admin/orders?${params}`)

  const net = orders?.reduce((s, o) => s + o.total - o.refundedAmount, 0) ?? 0

  return (
    <>
      <h1 className="admin-title">Đơn hàng</h1>
      <input className="admin-search" placeholder="Tìm theo mã đơn, khách hàng, email, khóa học..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="tabs">
        {filters.map(([v, l]) => (
          <button key={v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>
      {!orders ? (
        <Status loading={loading} error={error} />
      ) : (
        <div className="box table-wrap">
          <p className="muted small-gap">{orders.length} đơn · thực thu {formatPrice(net)}</p>
          <table className="table">
            <thead>
              <tr><th>Đơn</th><th>Khách hàng</th><th>Khóa học</th><th className="num">Tổng</th><th className="num">Đã hoàn</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className={o.status === 'cancelled' ? 'dimmed' : ''}>
                  <td><a href={`#/admin/don-hang/${o.id}`}><b>#{o.id}</b></a><br /><small className="muted">{formatDate(o.createdAt)}</small></td>
                  <td>{o.name}<br /><small className="muted">{o.email}</small></td>
                  <td className="wrap">{o.items}</td>
                  <td className="num"><b>{formatPrice(o.total)}</b>{o.coupon && <><br /><small className="muted">{o.coupon}</small></>}</td>
                  <td className="num">{o.refundedAmount ? `-${formatPrice(o.refundedAmount)}` : '—'}</td>
                  <td><OrderStatus order={o} /></td>
                  <td className="actions"><a href={`#/admin/don-hang/${o.id}`} className="link-btn">Chi tiết</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && <p className="empty muted">Không có đơn hàng phù hợp.</p>}
        </div>
      )}
    </>
  )
}
