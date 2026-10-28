import { useState } from 'react'
import { api, useApi } from '../api.js'
import { formatPrice, formatDate } from '../utils.js'
import { OrderStatus } from '../orderStatus.jsx'
import Status from '../components/Status.jsx'

function RefundRequestForm({ order, onDone, onCancel }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api(`/me/orders/${order.id}/refund-request`, { method: 'POST', body: { reason } })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form refund-form" onSubmit={submit}>
      <label>Lý do yêu cầu hoàn tiền
        <textarea rows="3" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cho chúng tôi biết vì sao bạn chưa hài lòng" />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="inline-row">
        <button className="btn-primary" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
        <button type="button" className="link-btn" onClick={onCancel}>Hủy</button>
      </div>
    </form>
  )
}

function PendingActions({ order, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lastPayment = order.payments[order.payments.length - 1]

  const pay = async () => {
    setBusy(true)
    setError('')
    try {
      const { paymentUrl } = await api(`/me/orders/${order.id}/pay`, { method: 'POST' })
      window.location.assign(paymentUrl)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!window.confirm(`Hủy đơn #${order.id}?`)) return
    setBusy(true)
    try {
      await api(`/me/orders/${order.id}/cancel`, { method: 'POST' })
      onChange()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <>
      {lastPayment?.status === 'failed' && <p className="notice small">Lần thanh toán trước: {lastPayment.message}.</p>}
      {error && <p className="error">{error}</p>}
      <div className="inline-row pending-actions">
        <button className="btn-primary" onClick={pay} disabled={busy}>Thanh toán {formatPrice(order.total)}</button>
        <button className="link-btn" onClick={cancel} disabled={busy}>Hủy đơn</button>
      </div>
    </>
  )
}

export default function OrderHistory() {
  const { data: orders, loading, error, reload } = useApi('/me/orders')
  const [requesting, setRequesting] = useState(null)

  if (!orders) return <Status loading={loading} error={error} />
  if (!orders.length) return null

  return (
    <section className="section">
      <h2 className="page-subtitle">Lịch sử đơn hàng</h2>
      <div className="order-list">
        {orders.map((o) => {
          const rejected = [...o.events].reverse().find((e) => e.type === 'refund_rejected' || e.type === 'refund_requested')
          return (
            <article key={o.id} className="box order-card">
              <div className="admin-head">
                <div>
                  <b>Đơn #{o.id}</b> <small className="muted">· {formatDate(o.createdAt)}</small>
                </div>
                <OrderStatus order={o} />
              </div>
              <ul className="order-items">
                {o.items.map((i) => (
                  <li key={i.id} className={i.refunded ? 'dimmed' : ''}>
                    <span>{i.emoji} {i.title}</span>
                    <span>{i.refunded && o.paidAt ? <small className="muted">Đã hoàn · </small> : null}{formatPrice(i.paid)}</span>
                  </li>
                ))}
              </ul>
              <p className="order-total">
                Tổng thanh toán <b>{formatPrice(o.total)}</b>
                {o.refundedAmount > 0 && <span className="green"> · đã hoàn {formatPrice(o.refundedAmount)}</span>}
                {o.payments.some((p) => p.status === 'success') && (
                  <><br /><small className="muted">Thanh toán qua VNPay · mã GD {o.payments.find((p) => p.status === 'success').transactionNo}</small></>
                )}
              </p>

              {o.refundRequestedAt && (
                <p className="notice small">⏳ Yêu cầu hoàn tiền đang chờ xử lý (gửi lúc {formatDate(o.refundRequestedAt)}).</p>
              )}
              {!o.refundRequestedAt && rejected?.type === 'refund_rejected' && (
                <p className="notice small">Yêu cầu hoàn tiền trước đó đã bị từ chối: “{rejected.note}”</p>
              )}

              {o.status === 'pending' && <PendingActions order={o} onChange={reload} />}

              {requesting === o.id ? (
                <RefundRequestForm order={o} onCancel={() => setRequesting(null)} onDone={() => { setRequesting(null); reload() }} />
              ) : (
                o.canRequestRefund && (
                  <button className="link-btn left" onClick={() => setRequesting(o.id)}>Yêu cầu hoàn tiền</button>
                )
              )}
            </article>
          )
        })}
      </div>
      <p className="muted small">Bạn có thể yêu cầu hoàn tiền trong vòng 365 ngày kể từ ngày mua. <a href="#/trang/hoan-tien" className="link-btn">Xem chính sách</a></p>
    </section>
  )
}
