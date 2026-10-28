// Nhãn và màu trạng thái đơn hàng, dùng chung cho trang khách hàng và trang quản trị
export const orderStatusLabels = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  partially_refunded: 'Hoàn tiền một phần',
  refunded: 'Đã hoàn tiền',
  cancelled: 'Đã hủy',
}

const pillClass = {
  pending: 'pill-warn',
  paid: 'pill-on',
  partially_refunded: 'pill-warn',
  refunded: 'pill-muted',
  cancelled: 'pill-muted',
}

export const eventLabels = {
  created: '🧾 Tạo đơn',
  paid: '💳 Thanh toán thành công',
  payment_failed: '❌ Thanh toán không thành công',
  payment_duplicate: '⚠️ Khách thanh toán trùng',
  refund_requested: '🙋 Khách yêu cầu hoàn tiền',
  refund_rejected: '✋ Từ chối yêu cầu hoàn tiền',
  refunded: '↩️ Hoàn tiền',
  cancelled: '⛔ Hủy đơn',
}

export const paymentMethodLabels = {
  vnpay: 'VNPay',
  mock: 'VNPay (giả lập)',
  free: 'Miễn phí',
  legacy: 'Trước khi có cổng thanh toán',
}

export function OrderStatus({ order }) {
  return (
    <span className="status-group">
      <span className={`pill ${pillClass[order.status] || ''}`}>{orderStatusLabels[order.status] || order.status}</span>
      {order.refundRequestedAt && <span className="pill pill-alert">Chờ duyệt hoàn tiền</span>}
    </span>
  )
}
