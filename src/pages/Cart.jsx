import { useState } from 'react'
import { formatPrice } from '../utils.js'
import { api } from '../api.js'

export default function Cart({ cart, user, enrolledIds, onRemove, onPaid }) {
  const [code, setCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [paid, setPaid] = useState(null)

  const payable = cart.filter((c) => !enrolledIds.includes(c.id))
  const subtotal = payable.reduce((s, c) => s + c.price, 0)
  const saved = payable.reduce((s, c) => s + Math.max(c.oldPrice - c.price, 0), 0)
  const couponOff = coupon ? Math.round((subtotal * coupon.percent) / 100) : 0
  const total = subtotal - couponOff

  const applyCoupon = async (e) => {
    e.preventDefault()
    setError('')
    try {
      setCoupon(await api('/coupons/validate', { method: 'POST', body: { code } }))
    } catch (err) {
      setCoupon(null)
      setError(err.message)
    }
  }

  const checkout = async () => {
    setBusy(true)
    setError('')
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: { courseIds: payable.map((c) => c.id), coupon: coupon?.code },
      })
      // Đơn có phí: chuyển sang VNPay. Giỏ hàng được giữ lại cho tới khi thanh toán thành công.
      if (order.paymentUrl) {
        window.location.assign(order.paymentUrl)
        return
      }
      setPaid(order)
      onPaid(order)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  if (paid) {
    return (
      <div className="container page center">
        <div className="big-icon">🎉</div>
        <h1 className="page-title">Thanh toán thành công!</h1>
        <p className="muted">
          Đơn hàng #{paid.id}: {paid.courseIds.length} khóa học, tổng {formatPrice(paid.total)}. Khóa học đã sẵn sàng trong tài khoản của bạn.
        </p>
        <a href="#/khoa-hoc-cua-toi" className="btn-primary inline">Vào khóa học của tôi</a>
      </div>
    )
  }

  if (!cart.length) {
    return (
      <div className="container page center">
        <div className="big-icon">🛒</div>
        <h1 className="page-title">Giỏ hàng trống</h1>
        <p className="muted">Hãy chọn những khóa học phù hợp với bạn.</p>
        <a href="#/khoa-hoc" className="btn-primary inline">Xem khóa học</a>
      </div>
    )
  }

  return (
    <div className="container page">
      <h1 className="page-title">Giỏ hàng ({cart.length})</h1>
      <div className="cart-layout">
        <div className="box">
          {cart.map((c) => (
            <div key={c.id} className="cart-row">
              <a href={`#/khoa-hoc/${c.id}`} className="cart-thumb" style={{ background: c.color }}>{c.emoji}</a>
              <div className="cart-row-info">
                <a href={`#/khoa-hoc/${c.id}`}><b>{c.title}</b></a>
                <small className="muted">{c.teacher}</small>
                {enrolledIds.includes(c.id) && <small className="green">✓ Bạn đã sở hữu khóa học này</small>}
              </div>
              <div className="price col">
                <b>{c.price ? formatPrice(c.price) : 'Miễn phí'}</b>
                {c.oldPrice > c.price && <s>{formatPrice(c.oldPrice)}</s>}
              </div>
              <button className="link-btn" onClick={() => onRemove(c.id)}>Xóa</button>
            </div>
          ))}
        </div>

        <aside className="box summary">
          <h3>Thanh toán</h3>
          <form className="coupon" onSubmit={applyCoupon}>
            <input placeholder="Mã giảm giá (VD: NHUTX10)" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn-outline">Áp dụng</button>
          </form>
          <dl>
            <dt>Tạm tính</dt><dd>{formatPrice(subtotal)}</dd>
            <dt>Đã tiết kiệm</dt><dd className="green">-{formatPrice(saved)}</dd>
            {coupon && <><dt>Mã {coupon.code} (-{coupon.percent}%)</dt><dd className="green">-{formatPrice(couponOff)}</dd></>}
            <dt className="total">Tổng cộng</dt><dd className="total">{formatPrice(total)}</dd>
          </dl>
          {error && <p className="error">{error}</p>}
          {user ? (
            <>
              <button className="btn-primary full" onClick={checkout} disabled={busy || !payable.length}>
                {busy ? 'Đang chuyển sang VNPay...' : total > 0 ? 'Thanh toán qua VNPay' : 'Nhận khóa học miễn phí'}
              </button>
              {total > 0 && <p className="muted small center-text pay-note">🔒 Thanh toán an toàn bằng thẻ ATM, Visa/Master, QR qua cổng VNPay</p>}
            </>
          ) : (
            <a href="#/dang-nhap?tiep=gio-hang" className="btn-primary full center-text">Đăng nhập để thanh toán</a>
          )}
        </aside>
      </div>
    </div>
  )
}
