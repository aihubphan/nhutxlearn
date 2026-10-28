// Tích hợp cổng thanh toán VNPay (API v2.1.0).
// Tài liệu: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
//
// Chế độ hoạt động:
//  - 'vnpay'    : đã đặt VNPAY_TMN_CODE + VNPAY_HASH_SECRET → dùng VNPay thật (sandbox hoặc production)
//  - 'mock'     : chạy dev mà chưa có thông tin VNPay → cổng giả lập nội bộ, ký bằng khóa thử
//  - 'disabled' : production mà chưa cấu hình → không nhận thanh toán đơn có phí
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const isDev = process.env.NODE_ENV === 'development'
const TMN_CODE = process.env.VNPAY_TMN_CODE || ''
const HASH_SECRET = process.env.VNPAY_HASH_SECRET || ''

export const mode = TMN_CODE && HASH_SECRET ? 'vnpay' : isDev ? 'mock' : 'disabled'

const tmnCode = mode === 'vnpay' ? TMN_CODE : 'MOCKDEV1'
const secret = mode === 'vnpay' ? HASH_SECRET : 'dev-mock-vnpay-secret'
const PAY_URL = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
const API_URL = process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
export const publicUrl = (process.env.PUBLIC_URL || (isDev ? 'http://localhost:5173' : '')).replace(/\/$/, '')

if (mode === 'vnpay' && !publicUrl) {
  throw new Error('Cần đặt PUBLIC_URL (VD: https://nhutxlearn.vn) để VNPay chuyển khách về sau khi thanh toán')
}
if (mode === 'disabled') console.warn('⚠ Chưa cấu hình VNPay: khách sẽ không thanh toán được đơn có phí')
if (mode === 'mock') console.warn('⚠ Chưa cấu hình VNPay: dùng cổng thanh toán GIẢ LẬP (chỉ khi chạy dev)')

// Thời gian theo múi giờ GMT+7, định dạng yyyyMMddHHmmss
export const vnTime = (d = new Date()) => new Date(d.getTime() + 7 * 3600e3).toISOString().replace(/[-:T]/g, '').slice(0, 14)

const hmac = (data) => createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex')

// Giống mã mẫu Node.js của VNPay: sắp xếp khóa, encodeURIComponent giá trị, thay %20 bằng +
const signData = (params) =>
  Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
    .join('&')

export const signParams = (params) => {
  const query = signData(params)
  return `${query}&vnp_SecureHash=${hmac(query)}`
}

export function buildPaymentUrl({ txnRef, amount, orderInfo, ipAddr }) {
  const now = new Date()
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: `${publicUrl}/api/payments/vnpay/return`,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: vnTime(now),
    vnp_ExpireDate: vnTime(new Date(now.getTime() + 15 * 60e3)),
  }
  const base = mode === 'vnpay' ? PAY_URL : `${publicUrl}/api/payments/mock-vnpay`
  return `${base}?${signParams(params)}`
}

// Kiểm tra chữ ký của dữ liệu VNPay gửi về (Return URL / IPN)
export function verifySignature(query) {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query
  if (typeof vnp_SecureHash !== 'string') return false
  const params = Object.fromEntries(Object.entries(rest).filter(([k, v]) => k.startsWith('vnp_') && typeof v === 'string'))
  const expected = Buffer.from(hmac(signData(params)))
  const actual = Buffer.from(vnp_SecureHash.toLowerCase())
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

const RESPONSE_MESSAGES = {
  '00': 'Giao dịch thành công',
  '07': 'Giao dịch bị nghi ngờ gian lận',
  '09': 'Thẻ/Tài khoản chưa đăng ký Internet Banking',
  '10': 'Xác thực thông tin thẻ/tài khoản sai quá 3 lần',
  '11': 'Đã hết hạn chờ thanh toán',
  '12': 'Thẻ/Tài khoản bị khóa',
  '13': 'Nhập sai mật khẩu xác thực (OTP)',
  '24': 'Khách hàng đã hủy giao dịch',
  '51': 'Tài khoản không đủ số dư',
  '65': 'Tài khoản vượt quá hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng thanh toán đang bảo trì',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
}
export const responseMessage = (code) => RESPONSE_MESSAGES[code] || `Giao dịch không thành công (mã ${code || '?'})`

// Hoàn tiền qua API merchant_webapi của VNPay
export async function refund({ txnRef, amount, full, transactionNo, transactionDate, createBy, ipAddr, orderInfo }) {
  if (mode === 'mock') return { ok: true, transactionNo: `MOCK${Date.now()}`, message: 'Hoàn tiền giả lập' }
  if (mode !== 'vnpay') return { ok: false, message: 'VNPay chưa được cấu hình' }

  const body = {
    vnp_RequestId: randomUUID().replace(/-/g, ''),
    vnp_Version: '2.1.0',
    vnp_Command: 'refund',
    vnp_TmnCode: tmnCode,
    vnp_TransactionType: full ? '02' : '03',
    vnp_TxnRef: txnRef,
    vnp_Amount: amount * 100,
    vnp_TransactionNo: transactionNo || '',
    vnp_TransactionDate: transactionDate,
    vnp_CreateBy: createBy,
    vnp_CreateDate: vnTime(),
    vnp_IpAddr: ipAddr,
    vnp_OrderInfo: orderInfo,
  }
  // Thứ tự trường theo tài liệu API hoàn tiền của VNPay
  body.vnp_SecureHash = hmac([
    body.vnp_RequestId, body.vnp_Version, body.vnp_Command, body.vnp_TmnCode, body.vnp_TransactionType,
    body.vnp_TxnRef, body.vnp_Amount, body.vnp_TransactionNo, body.vnp_TransactionDate, body.vnp_CreateBy,
    body.vnp_CreateDate, body.vnp_IpAddr, body.vnp_OrderInfo,
  ].join('|'))

  let r
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })
    r = await res.json()
  } catch (err) {
    return { ok: false, message: `Không kết nối được VNPay (${err.message})` }
  }

  const responseData = [
    r.vnp_ResponseId, r.vnp_Command, r.vnp_ResponseCode, r.vnp_Message, r.vnp_TmnCode, r.vnp_TxnRef, r.vnp_Amount,
    r.vnp_BankCode, r.vnp_PayDate, r.vnp_TransactionNo, r.vnp_TransactionType, r.vnp_TransactionStatus, r.vnp_OrderInfo,
  ].map((v) => v ?? '').join('|')
  const validSignature = typeof r.vnp_SecureHash === 'string' && hmac(responseData) === r.vnp_SecureHash.toLowerCase()
  if (!validSignature) console.warn('⚠ Chữ ký phản hồi hoàn tiền của VNPay không hợp lệ', r)

  return {
    ok: r.vnp_ResponseCode === '00' && validSignature,
    code: r.vnp_ResponseCode,
    message: validSignature ? r.vnp_Message : 'Chữ ký phản hồi của VNPay không hợp lệ — kiểm tra lại trên cổng quản lý VNPay',
    transactionNo: r.vnp_TransactionNo,
  }
}
