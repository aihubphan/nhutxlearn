import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { formatPrice, formatDate } from '../utils.js'
import { OrderStatus, eventLabels, paymentMethodLabels } from '../orderStatus.jsx'
import { useAction } from './useAction.js'
import Status from '../components/Status.jsx'
import CourseThumb from '../components/CourseThumb.jsx'

export default function OrderDetail({ id }) {
  const [order, setOrder] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [selected, setSelected] = useState([])
  const [reason, setReason] = useState('')
  const [done, setDone] = useState('')
  const { run, busy, error } = useAction()

  useEffect(() => {
    api(`/admin/orders/${encodeURIComponent(id)}`).then(setOrder).catch(setLoadError)
  }, [id])

  if (!order) return <Status loading={!loadError} error={loadError} />

  const open = ['paid', 'partially_refunded'].includes(order.status)
  const paidPayment = order.payments.find((p) => p.status === 'success')
  const viaGateway = paidPayment && ['vnpay', 'mock'].includes(paidPayment.provider)
  const remaining = order.items.filter((i) => !i.refunded)
  const chosen = remaining.filter((i) => selected.includes(i.id))
  const refundsAll = chosen.length === remaining.length
  const preview = refundsAll ? order.total - order.refundedAmount : chosen.reduce((s, i) => s + i.paid, 0)

  const toggle = (itemId) => setSelected((s) => (s.includes(itemId) ? s.filter((x) => x !== itemId) : [...s, itemId]))

  // Gọi một thao tác, cập nhật đơn và xóa form
  const act = (path, body, confirmText, message) => {
    if (!window.confirm(confirmText)) return
    run(async () => {
      const updated = await api(`/admin/orders/${order.id}/${path}`, { method: 'POST', body: { ...body, reason } })
      setOrder(updated)
      setSelected([])
      setReason('')
      setDone(message)
    })
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">Đơn hàng #{order.id}</h1>
        <a href="#/admin/don-hang" className="link-btn">← Danh sách</a>
      </div>

      {order.refundRequestedAt && (
        <div className="box notice">
          <b>🙋 Khách yêu cầu hoàn tiền</b> <small className="muted">· {formatDate(order.refundRequestedAt)}</small>
          <p>“{order.refundRequest}”</p>
          <small className="muted">Chọn khóa học bên dưới để hoàn tiền, hoặc nhập lý do và bấm “Từ chối yêu cầu”.</small>
        </div>
      )}
      {done && <p className="box success-box">✓ {done}</p>}

      <div className="admin-cols wide-left">
        <div className="form-stack">
          <section className="box">
            <div className="admin-head">
              <h3>Khóa học trong đơn</h3>
              <OrderStatus order={order} />
            </div>
            <table className="table">
              <thead>
                <tr>{open && <th></th>}<th>Khóa học</th><th className="num">Giá</th><th className="num">Khách trả</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className={i.refunded ? 'dimmed' : ''}>
                    {open && (
                      <td>
                        {!i.refunded && (
                          <input type="checkbox" checked={selected.includes(i.id)} onChange={() => toggle(i.id)} aria-label={`Chọn ${i.title}`} />
                        )}
                      </td>
                    )}
                    <td>
                      <span className="course-cell">
                        <CourseThumb course={i} className="mini-thumb" />
                        <b>{i.title}</b>
                      </span>
                    </td>
                    <td className="num">{formatPrice(i.price)}</td>
                    <td className="num">{formatPrice(i.paid)}</td>
                    <td>{i.refunded ? <span className="pill pill-muted">Đã hoàn</span> : <span className="pill pill-on">Đang học</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="order-sum">
              <dt>Tạm tính</dt><dd>{formatPrice(order.subtotal)}</dd>
              {order.discount > 0 && <><dt>Giảm giá {order.coupon && `(${order.coupon})`}</dt><dd>-{formatPrice(order.discount)}</dd></>}
              <dt>Khách đã trả</dt><dd><b>{formatPrice(order.total)}</b></dd>
              {order.refundedAmount > 0 && <><dt>Đã hoàn</dt><dd className="danger-text">-{formatPrice(order.refundedAmount)}</dd></>}
              <dt>Thực thu</dt><dd><b>{formatPrice(order.total - order.refundedAmount)}</b></dd>
            </dl>
          </section>

          <section className="box">
            <h3>Lịch sử</h3>
            <ol className="events">
              {order.events.map((e) => (
                <li key={e.id}>
                  <b>{eventLabels[e.type] || e.type}</b>
                  {e.amount > 0 && <span> · {formatPrice(e.amount)}</span>}
                  <small className="muted"> · {formatDate(e.createdAt)}{e.actor && ` · ${e.actor}`}</small>
                  {e.note && <p className="muted">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="form-stack">
          <section className="box">
            <h3>Khách hàng</h3>
            <p><b>{order.name}</b><br /><a href={`mailto:${order.email}`} className="muted">{order.email}</a></p>
            <p className="muted small-gap">Đặt lúc {formatDate(order.createdAt)}</p>
          </section>

          <section className="box">
            <h3>Thanh toán</h3>
            <dl className="pay-info">
              <dt>Phương thức</dt><dd>{paymentMethodLabels[order.paymentMethod] || order.paymentMethod}</dd>
              <dt>Thanh toán lúc</dt><dd>{order.paidAt ? formatDate(order.paidAt) : '—'}</dd>
              {paidPayment && (
                <>
                  <dt>Mã GD VNPay</dt><dd>{paidPayment.transactionNo}</dd>
                  <dt>Ngân hàng</dt><dd>{paidPayment.bankCode}</dd>
                  <dt>Mã tham chiếu</dt><dd><code>{paidPayment.txnRef}</code></dd>
                </>
              )}
            </dl>
            {order.payments.length > 0 && (
              <details className="small-gap">
                <summary className="muted small">{order.payments.length} lượt thanh toán</summary>
                {order.payments.map((p) => (
                  <div key={p.id} className="pay-attempt">
                    <b>{p.status === 'success' ? '✓ Thành công' : p.status === 'failed' ? '✗ Thất bại' : '… Đang chờ'}</b>
                    <span className="muted"> · {formatDate(p.createdAt)}</span>
                    {p.message && <div className="muted">{p.message}</div>}
                  </div>
                ))}
              </details>
            )}
          </section>

          {order.status === 'pending' ? (
            <section className="box form">
              <h3>Xử lý đơn</h3>
              <p className="muted small">Đơn chưa được thanh toán, khách chưa có quyền học. Có thể hủy nếu khách không thanh toán nữa.</p>
              <label>Ghi chú (không bắt buộc)
                <textarea rows="2" value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="button" className="btn-danger full" disabled={busy}
                onClick={() => act('cancel', {}, `Hủy đơn #${order.id} chưa thanh toán?`, 'Đã hủy đơn hàng.')}>
                Hủy đơn chưa thanh toán
              </button>
            </section>
          ) : open ? (
            <section className="box form">
              <h3>Xử lý đơn</h3>
              <label>Lý do (bắt buộc, khách sẽ thấy)
                <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Khách mua nhầm khóa học" />
              </label>
              {error && <p className="error">{error}</p>}

              <button
                type="button" className="btn-primary full" disabled={busy || !chosen.length}
                onClick={() => act('refund', { courseIds: chosen.map((i) => i.id) },
                  `Hoàn ${formatPrice(preview)} cho ${chosen.length} khóa học? Khách sẽ mất quyền học các khóa này.`,
                  `Đã hoàn ${formatPrice(preview)}.`)}
              >
                {chosen.length ? `Hoàn tiền ${formatPrice(preview)} (${chosen.length} khóa)` : 'Chọn khóa học để hoàn tiền'}
              </button>
              <p className="muted small">
                {viaGateway
                  ? '💳 Tiền sẽ được hoàn về tài khoản / thẻ của khách qua VNPay.'
                  : 'Đơn không thanh toán qua cổng, hệ thống chỉ ghi nhận hoàn tiền và thu hồi khóa học.'}
              </p>
              {remaining.length > 1 && (
                <button type="button" className="link-btn left" onClick={() => setSelected(remaining.map((i) => i.id))}>
                  Chọn tất cả khóa chưa hoàn
                </button>
              )}

              {order.refundRequestedAt && (
                <button type="button" className="btn-outline full" disabled={busy}
                  onClick={() => act('reject-request', {}, 'Từ chối yêu cầu hoàn tiền của khách?', 'Đã từ chối yêu cầu hoàn tiền.')}>
                  Từ chối yêu cầu
                </button>
              )}

              {order.status === 'paid' && (
                <>
                  <hr />
                  <p className="muted small">Hủy đơn: dùng khi thanh toán lỗi hoặc đơn gian lận. Hoàn toàn bộ {formatPrice(order.total)} và thu hồi mọi khóa học.</p>
                  <button type="button" className="btn-danger full" disabled={busy}
                    onClick={() => act('cancel', {}, `Hủy đơn #${order.id} và hoàn ${formatPrice(order.total)}?`, 'Đã hủy đơn hàng.')}>
                    Hủy đơn hàng
                  </button>
                </>
              )}
            </section>
          ) : (
            <section className="box">
              <h3>Xử lý đơn</h3>
              <p className="muted">
                {order.status === 'cancelled' ? 'Đơn hàng đã bị hủy' : 'Đơn hàng đã được hoàn tiền toàn bộ'}, không còn thao tác nào.
              </p>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
