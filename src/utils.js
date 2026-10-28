export const formatPrice = (n) => n.toLocaleString('vi-VN') + 'đ'

// SQLite lưu thời gian dạng UTC "YYYY-MM-DD HH:MM:SS"
export const formatDate = (s, withTime = true) => {
  if (!s) return ''
  const d = new Date(s.replace(' ', 'T') + (s.length > 10 ? 'Z' : ''))
  return withTime ? d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : d.toLocaleDateString('vi-VN')
}

export const discount = (price, oldPrice) =>
  oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0
