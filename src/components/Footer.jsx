import { useState } from 'react'
import { api } from '../api.js'

const columns = [
  { title: 'Về NhutX Learn', links: [['Giới thiệu', 'gioi-thieu'], ['Tuyển dụng', 'tuyen-dung'], ['Đào tạo doanh nghiệp', 'doanh-nghiep'], ['Blog', 'blog']] },
  { title: 'Hỗ trợ', links: [['Câu hỏi thường gặp', 'faq'], ['Hướng dẫn thanh toán', 'thanh-toan'], ['Chính sách hoàn tiền', 'hoan-tien'], ['Điều khoản sử dụng', 'dieu-khoan']] },
  { title: 'Hợp tác', links: [['Trở thành giảng viên', 'giang-vien'], ['Tạo LMS doanh nghiệp', 'lms'], ['Tiếp thị liên kết', 'tiep-thi-lien-ket'], ['Liên hệ', 'lien-he']] },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const subscribe = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api('/newsletter', { method: 'POST', body: { email } })
      setDone(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <a href="#/" className="logo light">
            <span className="logo-mark">N</span>
            <span>NHUTX<b>LEARN</b></span>
          </a>
          <p>Nền tảng học kỹ năng ứng dụng cho người đi làm và doanh nghiệp Việt Nam.</p>
          <p>📍 TP. Hồ Chí Minh<br />📞 1900 0000<br />✉️ hotro@nhutxlearn.vn</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4>{col.title}</h4>
            <ul>
              {col.links.map(([label, slug]) => (
                <li key={slug}><a href={`#/trang/${slug}`}>{label}</a></li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4>Nhận bản tin</h4>
          {done ? (
            <p>🎉 Cảm ơn bạn đã đăng ký!</p>
          ) : (
            <form className="newsletter" onSubmit={subscribe}>
              <input type="email" required placeholder="Email của bạn" value={email} onChange={(e) => setEmail(e.target.value)} />
              {error && <p className="error">{error}</p>}
              <button className="btn-primary">Đăng ký</button>
            </form>
          )}
        </div>
      </div>
      <div className="copyright">© 2026 NhutX Learn. All rights reserved.</div>
    </footer>
  )
}
