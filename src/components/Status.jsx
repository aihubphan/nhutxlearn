// Hiển thị trạng thái đang tải / lỗi khi gọi API
export default function Status({ loading, error }) {
  if (loading) {
    return (
      <div className="status">
        <span className="spinner" /> Đang tải...
      </div>
    )
  }
  if (error) {
    return (
      <div className="status error-box">
        ⚠ {error.message}
        <button className="link-btn" onClick={() => window.location.reload()}>Thử lại</button>
      </div>
    )
  }
  return null
}
