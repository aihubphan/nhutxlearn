// Nghiệp vụ đơn hàng: tạo đơn, thanh toán qua VNPay, hoàn tiền (toàn phần / từng khóa), hủy đơn,
// yêu cầu hoàn tiền của khách.
import { randomInt } from 'node:crypto'
import { db, transaction } from './db.js'
import { HttpError } from './auth.js'
import * as vnpay from './vnpay.js'

export const ORDER_STATUSES = ['pending', 'paid', 'partially_refunded', 'refunded', 'cancelled']
export const REFUND_WINDOW_DAYS = 365

// Phần tiền khách thực trả cho một khóa (đã chia đều mã giảm giá theo tỷ lệ giá)
const share = (order, price) => (order.subtotal ? Math.round((price * order.total) / order.subtotal) : 0)

export const clientIp = (req) => {
  const ip = (req.ip || '').replace(/^::ffff:/, '')
  return !ip || ip === '::1' ? '127.0.0.1' : ip
}

export const logEvent = (orderId, type, { amount = 0, note = null, actorId = null } = {}) =>
  db.prepare('INSERT INTO order_events (order_id, type, amount, note, actor_id) VALUES (?, ?, ?, ?, ?)')
    .run(orderId, type, amount, note, actorId)

export function getOrderDetail(id) {
  const order = db.prepare(`SELECT o.id, o.user_id AS userId, o.subtotal, o.discount, o.total, o.coupon, o.status,
      o.refunded_amount AS refundedAmount, o.refund_request AS refundRequest, o.refund_requested_at AS refundRequestedAt,
      o.payment_method AS paymentMethod, o.paid_at AS paidAt, o.created_at AS createdAt, u.name, u.email,
      CAST(julianday('now') - julianday(COALESCE(o.paid_at, o.created_at)) AS INTEGER) AS ageDays
    FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`).get(id)
  if (!order) return null

  const items = db.prepare(`SELECT oi.course_id AS id, c.title, c.emoji, c.color, oi.price, oi.refunded
    FROM order_items oi JOIN courses c ON c.id = oi.course_id WHERE oi.order_id = ?`).all(id)
    .map((i) => ({ ...i, refunded: !!i.refunded, paid: share(order, i.price) }))

  const events = db.prepare(`SELECT e.id, e.type, e.amount, e.note, e.created_at AS createdAt, u.name AS actor
    FROM order_events e LEFT JOIN users u ON u.id = e.actor_id WHERE e.order_id = ? ORDER BY e.id`).all(id)

  const payments = db.prepare(`SELECT id, provider, txn_ref AS txnRef, amount, status, response_code AS responseCode,
      transaction_no AS transactionNo, bank_code AS bankCode, pay_date AS payDate, created_at AS createdAt
    FROM payments WHERE order_id = ? ORDER BY id`).all(id)
    .map((p) => ({ ...p, message: p.responseCode ? vnpay.responseMessage(p.responseCode) : null }))

  const canRequestRefund = ['paid', 'partially_refunded'].includes(order.status) &&
    !order.refundRequestedAt && order.ageDays <= REFUND_WINDOW_DAYS

  return { ...order, items, events, payments, canRequestRefund }
}

const requireReason = (reason) => {
  const text = typeof reason === 'string' ? reason.trim().slice(0, 1000) : ''
  if (text.length < 3) throw new HttpError(400, 'Vui lòng nhập lý do')
  return text
}

const enroll = db.prepare("INSERT OR IGNORE INTO enrollments (user_id, course_id, source) VALUES (?, ?, 'order')")

// Chuyển đơn sang "đã thanh toán" và mở khóa học. Gọi bên trong transaction.
function markOrderPaid(orderId, method, note) {
  const order = db.prepare('SELECT id, user_id, total FROM orders WHERE id = ?').get(orderId)
  db.prepare("UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payment_method = ? WHERE id = ?").run(method, orderId)
  for (const { course_id } of db.prepare('SELECT course_id FROM order_items WHERE order_id = ?').all(orderId)) {
    enroll.run(order.user_id, course_id)
  }
  logEvent(orderId, 'paid', { amount: order.total, note })
}

// ---------- Tạo đơn & thanh toán ----------

/** Tạo đơn hàng. Đơn 0đ được kích hoạt ngay; đơn có phí ở trạng thái "pending" chờ VNPay xác nhận. */
export function createOrder(user, { courses, coupon, subtotal, discount, total }) {
  if (total > 0 && vnpay.mode === 'disabled') {
    throw new HttpError(503, 'Cổng thanh toán chưa được cấu hình. Vui lòng liên hệ hỗ trợ.')
  }
  return transaction(() => {
    const { lastInsertRowid } = db.prepare(`INSERT INTO orders (user_id, subtotal, discount, total, coupon, status, payment_method)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)`).run(user.id, subtotal, discount, total, coupon?.code ?? null, total > 0 ? vnpay.mode : 'free')
    const orderId = Number(lastInsertRowid)
    const insItem = db.prepare('INSERT INTO order_items (order_id, course_id, price) VALUES (?, ?, ?)')
    for (const c of courses) insItem.run(orderId, c.id, c.price)
    logEvent(orderId, 'created', { amount: total, actorId: user.id, note: coupon ? `Mã ${coupon.code}` : null })
    if (total === 0) markOrderPaid(orderId, 'free', 'Đơn 0đ, kích hoạt ngay')
    return orderId
  })
}

/** Tạo một lượt thanh toán VNPay mới cho đơn đang chờ, trả về URL chuyển khách sang cổng thanh toán. */
export function startPayment(orderId, req, ownerId = null) {
  const order = db.prepare('SELECT id, user_id, total, status FROM orders WHERE id = ?').get(orderId)
  if (!order || (ownerId && order.user_id !== ownerId)) throw new HttpError(404, 'Không tìm thấy đơn hàng')
  if (order.status !== 'pending') throw new HttpError(409, 'Đơn hàng không ở trạng thái chờ thanh toán')
  if (vnpay.mode === 'disabled') throw new HttpError(503, 'Cổng thanh toán chưa được cấu hình. Vui lòng liên hệ hỗ trợ.')

  // Mã giao dịch phải duy nhất với VNPay, kể cả khi database bị tạo lại
  const txnRef = `NX${order.id}T${Date.now()}${randomInt(100, 999)}`
  db.prepare('INSERT INTO payments (order_id, provider, txn_ref, amount) VALUES (?, ?, ?, ?)').run(order.id, vnpay.mode, txnRef, order.total)
  return vnpay.buildPaymentUrl({ txnRef, amount: order.total, orderInfo: `Thanh toan don hang ${order.id}`, ipAddr: clientIp(req) })
}

/**
 * Xử lý kết quả VNPay gửi về (dùng chung cho IPN và Return URL).
 * Luôn kiểm tra chữ ký, số tiền và chỉ xử lý mỗi giao dịch một lần.
 * Trả về mã phản hồi IPN theo quy định của VNPay.
 */
export function confirmPayment(query) {
  if (!vnpay.verifySignature(query)) return { rspCode: '97', message: 'Invalid signature' }

  const payment = db.prepare('SELECT * FROM payments WHERE txn_ref = ?').get(String(query.vnp_TxnRef))
  if (!payment) return { rspCode: '01', message: 'Order not found' }
  const result = { orderId: payment.order_id }
  if (Number(query.vnp_Amount) !== payment.amount * 100) return { ...result, rspCode: '04', message: 'Invalid amount' }
  if (payment.status !== 'pending') {
    return { ...result, rspCode: '02', message: 'Order already confirmed', success: payment.status === 'success' }
  }

  const code = String(query.vnp_ResponseCode ?? '')
  const success = code === '00' && query.vnp_TransactionStatus === '00'
  transaction(() => {
    db.prepare(`UPDATE payments SET status = ?, response_code = ?, transaction_no = ?, bank_code = ?, pay_date = ?,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(success ? 'success' : 'failed', code, query.vnp_TransactionNo ?? null, query.vnp_BankCode ?? null, query.vnp_PayDate ?? null, payment.id)

    const order = db.prepare('SELECT status, paid_at FROM orders WHERE id = ?').get(payment.order_id)
    if (!success) {
      logEvent(payment.order_id, 'payment_failed', { note: `${vnpay.responseMessage(code)} (mã ${code})` })
    } else if (order.paid_at) {
      // Khách thanh toán lần thứ hai cho cùng đơn (VD: mở 2 tab) → cần hoàn giao dịch này thủ công
      logEvent(payment.order_id, 'payment_duplicate', {
        amount: payment.amount,
        note: `Giao dịch ${query.vnp_TransactionNo} (${payment.txn_ref}) bị trùng — cần hoàn tiền trên cổng VNPay`,
      })
    } else {
      // Đơn "pending" hoặc khách đã bấm hủy nhưng tiền vẫn về → ghi nhận đã thanh toán
      markOrderPaid(payment.order_id, payment.provider, `VNPay GD ${query.vnp_TransactionNo} · ${query.vnp_BankCode || ''}`)
    }
  })
  return { ...result, rspCode: '00', message: 'Confirm Success', success }
}

/** Hủy đơn chưa thanh toán (khách hoặc quản trị viên). Không có tiền để hoàn. */
export function cancelPendingOrder(id, { actorId, ownerId = null, reason = '' }) {
  const order = db.prepare('SELECT id, user_id, status FROM orders WHERE id = ?').get(id)
  if (!order || (ownerId && order.user_id !== ownerId)) throw new HttpError(404, 'Không tìm thấy đơn hàng')
  if (order.status !== 'pending') throw new HttpError(409, 'Chỉ hủy được đơn đang chờ thanh toán')
  transaction(() => {
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id)
    logEvent(id, 'cancelled', { actorId, note: reason.trim().slice(0, 1000) || 'Hủy đơn chưa thanh toán' })
  })
  return getOrderDetail(id)
}

// ---------- Hoàn tiền ----------

const processing = new Set() // chống hai quản trị viên hoàn tiền cùng một đơn cùng lúc

function planRefund(id, { courseIds, cancel }) {
  const order = getOrderDetail(id)
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng')
  if (order.status === 'pending') throw new HttpError(409, 'Đơn chưa thanh toán — dùng "Hủy đơn" thay vì hoàn tiền')
  if (['refunded', 'cancelled'].includes(order.status)) throw new HttpError(409, 'Đơn hàng đã được hoàn tiền hoặc đã hủy')
  if (cancel && order.status !== 'paid') throw new HttpError(409, 'Đơn đã hoàn tiền một phần, hãy dùng "Hoàn tiền" cho các khóa còn lại')

  const remaining = order.items.filter((i) => !i.refunded)
  const ids = Array.isArray(courseIds) ? courseIds.map(Number) : null
  const targets = cancel || !ids ? remaining : remaining.filter((i) => ids.includes(i.id))
  if (!targets.length) throw new HttpError(400, 'Hãy chọn ít nhất một khóa học chưa được hoàn tiền')

  const isAll = targets.length === remaining.length
  // Hoàn hết phần còn lại thì lấy đúng số dư để không lệch do làm tròn
  const amount = isAll ? order.total - order.refundedAmount : targets.reduce((s, i) => s + i.paid, 0)
  const status = cancel ? 'cancelled' : isAll ? 'refunded' : 'partially_refunded'
  return { order, targets, amount, status }
}

/**
 * Hoàn tiền các khóa trong đơn (mặc định: tất cả khóa chưa hoàn) hoặc hủy cả đơn đã thanh toán.
 * Với đơn thanh toán qua VNPay: gọi API hoàn tiền của VNPay trước, thành công mới ghi vào hệ thống.
 */
export async function refundOrder(id, { courseIds, reason, actor, ip, cancel = false }) {
  const note = requireReason(reason)
  if (processing.has(id)) throw new HttpError(409, 'Đơn hàng đang được xử lý, vui lòng thử lại sau giây lát')
  processing.add(id)
  try {
    const { order, targets, amount, status } = planRefund(id, { courseIds, cancel })

    let gatewayNote = ''
    const payment = order.payments.find((p) => p.status === 'success')
    if (payment && amount > 0 && ['vnpay', 'mock'].includes(payment.provider)) {
      const result = await vnpay.refund({
        txnRef: payment.txnRef,
        amount,
        full: amount === payment.amount && order.refundedAmount === 0,
        transactionNo: payment.transactionNo,
        transactionDate: payment.payDate,
        createBy: actor.email,
        ipAddr: ip,
        orderInfo: `Hoan tien don hang ${order.id}`,
      })
      if (!result.ok) throw new HttpError(502, `VNPay chưa hoàn tiền: ${result.message || 'lỗi không xác định'}`)
      gatewayNote = ` · VNPay GD hoàn ${result.transactionNo}`
    }

    return transaction(() => {
      const markItem = db.prepare('UPDATE order_items SET refunded = 1 WHERE order_id = ? AND course_id = ?')
      const revoke = db.prepare("DELETE FROM enrollments WHERE user_id = ? AND course_id = ? AND source = 'order'")
      for (const item of targets) {
        markItem.run(id, item.id)
        revoke.run(order.userId, item.id)
      }
      db.prepare(`UPDATE orders SET status = ?, refunded_amount = refunded_amount + ?, refund_request = NULL,
        refund_requested_at = NULL WHERE id = ?`).run(status, amount, id)
      logEvent(id, cancel ? 'cancelled' : 'refunded', {
        amount,
        actorId: actor.id,
        note: `${note} — ${targets.map((i) => i.title).join(', ')}${gatewayNote}`,
      })
      return getOrderDetail(id)
    })
  } finally {
    processing.delete(id)
  }
}

export function requestRefund(userId, id, reason) {
  const note = requireReason(reason)
  return transaction(() => {
    const order = getOrderDetail(id)
    if (!order || order.userId !== userId) throw new HttpError(404, 'Không tìm thấy đơn hàng')
    if (order.refundRequestedAt) throw new HttpError(409, 'Đơn hàng đang có yêu cầu hoàn tiền chờ xử lý')
    if (!['paid', 'partially_refunded'].includes(order.status)) throw new HttpError(409, 'Đơn hàng không thể yêu cầu hoàn tiền')
    if (order.ageDays > REFUND_WINDOW_DAYS) throw new HttpError(409, `Đã quá ${REFUND_WINDOW_DAYS} ngày kể từ ngày mua`)

    db.prepare('UPDATE orders SET refund_request = ?, refund_requested_at = CURRENT_TIMESTAMP WHERE id = ?').run(note, id)
    logEvent(id, 'refund_requested', { note, actorId: userId })
    return getOrderDetail(id)
  })
}

export function rejectRefundRequest(id, { reason, actorId }) {
  const note = requireReason(reason)
  return transaction(() => {
    const order = getOrderDetail(id)
    if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng')
    if (!order.refundRequestedAt) throw new HttpError(409, 'Đơn hàng không có yêu cầu hoàn tiền')
    db.prepare('UPDATE orders SET refund_request = NULL, refund_requested_at = NULL WHERE id = ?').run(id)
    logEvent(id, 'refund_rejected', { note, actorId })
    return getOrderDetail(id)
  })
}
