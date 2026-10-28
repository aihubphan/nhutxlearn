import { useEffect, useRef, useState } from 'react'
import { api, useApi } from '../api.js'
import { formatPrice } from '../utils.js'
import Status from '../components/Status.jsx'

// Trang khách được đưa về sau khi thanh toán trên VNPay: #/thanh-toan/ket-qua?don=12&kq=xong
export default function PaymentResult({ query, user, onPaid }) {
  const orderId = Number(query.don)
  const { data: order, loading, error, reload } = useApi(user && orderId ? `/me/orders/${orderId}` : null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const handled = useRef(false)

  // Thanh toán thành công: bỏ các khóa đã mua khỏi giỏ và tải lại danh sách khóa học của tôi
  useEffect(() => {
    if (order?.paidAt && !handled.current) {
      handled.current = true
      onPaid({ courseIds: order.items.map((i) => i.id) })
    }
  }, [order, onPaid])

  if (query.kq === 'loi-chu-ky' || query.kq === 'sai-so-tien' || !orderId) {
    return (
      <div className="container page center">
        <div className="big-icon">⚠️</div>
        <h1 className="page-title">Không xác thực được kết quả thanh toán</h1>
        <p className="muted">Dữ liệu trả về từ cổng thanh toán không hợp lệ. Nếu tài khoản của bạn đã bị trừ tiền, vui lòng liên hệ hỗ trợ.</p>
        <a href="#/trang/lien-he" className="btn-primary inline">Liên hệ hỗ trợ</a>
      </div>
    )
  }
  if (!user) return <div className="container page"><Status loading /></div>
  if (!order) return <div className="container page"><Status loading={loading} error={error} /></div>

  const retry = async () => {
    setBusy(true)
    setActionError('')
    try {
      const { paymentUrl } = await api(`/me/orders/${order.id}/pay`, { method: 'POST' })
      window.location.assign(paymentUrl)
    } catch (err) {
      setActionError(err.message)
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!window.confirm('Hủy đơn hàng này?')) return
    setBusy(true)
    try {
      await api(`/me/orders/${order.id}/cancel`, { method: 'POST' })
      reload()
    } catch (err) {
      setActionError(err.message)
    }
    setBusy(false)
  }

  if (order.paidAt) {
    return (
      <div className="container page center">
        <div className="big-icon">🎉</div>
        <h1 className="page-title">Thanh toán thành công!</h1>
        <p className="muted">
          Đơn hàng #{order.id}: {order.items.length} khóa học, {formatPrice(order.total)}. Khóa học đã sẵn sàng trong tài khoản của bạn.
        </p>
        <a href="#/khoa-hoc-cua-toi" className="btn-primary inline">Vào khóa học của tôi</a>
      </div>
    )
  }

  const lastPayment = order.payments[order.payments.length - 1]
  return (
    <div className="container page center">
      <div className="big-icon">{order.status === 'cancelled' ? '🗑️' : '😕'}</div>
      <h1 className="page-title">{order.status === 'cancelled' ? 'Đơn hàng đã được hủy' : 'Thanh toán chưa thành công'}</h1>
      {lastPayment?.message && order.status === 'pending' && <p className="muted">{lastPayment.message}.</p>}
      <p className="muted">Đơn hàng #{order.id} · {formatPrice(order.total)}</p>
      {actionError && <p className="error">{actionError}</p>}
      {order.status === 'pending' ? (
        <div className="result-actions">
          <button className="btn-primary" onClick={retry} disabled={busy}>Thanh toán lại</button>
          <button className="btn-outline" onClick={cancel} disabled={busy}>Hủy đơn</button>
        </div>
      ) : (
        <a href="#/gio-hang" className="btn-primary inline">Về giỏ hàng</a>
      )}
    </div>
  )
}
