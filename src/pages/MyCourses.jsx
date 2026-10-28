import OrderHistory from './OrderHistory.jsx'

export default function MyCourses({ user, courses }) {
  if (!user) {
    return (
      <div className="container page center">
        <div className="big-icon">🔒</div>
        <h1 className="page-title">Vui lòng đăng nhập</h1>
        <p className="muted">Đăng nhập để xem các khóa học bạn đã sở hữu.</p>
        <a href="#/dang-nhap?tiep=khoa-hoc-cua-toi" className="btn-primary inline">Đăng nhập</a>
      </div>
    )
  }

  return (
    <div className="container page">
      <h1 className="page-title">Khóa học của tôi</h1>
      <p className="muted small-gap">Xin chào {user.name} · {user.email}</p>
      {courses.length ? (
        <div className="my-courses">
          {courses.map((c) => (
            <a key={c.id} href={`#/khoa-hoc/${c.id}`} className="timeline-card">
              <span className="timeline-emoji" style={{ background: c.color }}>{c.emoji}</span>
              <span>
                <b>{c.title}</b>
                <small className="muted">{c.teacher} · {c.lessonCount} bài · {c.hours} giờ</small>
              </span>
              <span className="btn-outline">Vào học</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="box center">
          <p className="muted">Bạn chưa có khóa học nào.</p>
          <a href="#/khoa-hoc" className="btn-primary inline">Khám phá khóa học</a>
        </div>
      )}
      <OrderHistory />
    </div>
  )
}
