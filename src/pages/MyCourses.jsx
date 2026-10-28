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
          {courses.map((c) => {
            const p = c.progress
            const href = `#/hoc/${c.id}${p?.lastLessonId ? `/${p.lastLessonId}` : ''}`
            return (
              <div key={c.id} className="timeline-card my-course">
                <a href={href} className="timeline-emoji" style={{ background: c.color }}>{c.emoji}</a>
                <span className="my-course-info">
                  <a href={href}><b>{c.title}</b></a>
                  <small className="muted">{c.teacher} · {c.lessonCount} bài · {c.hours} giờ</small>
                  {p && (
                    <span className="my-progress">
                      <span className="bar"><span style={{ width: `${p.percent}%` }} /></span>
                      <small className="muted">{p.percent === 100 ? '✓ Đã hoàn thành' : `${p.done}/${p.total} bài · ${p.percent}%`}</small>
                    </span>
                  )}
                </span>
                <a href={href} className="btn-outline">{!p?.lastLessonId ? 'Bắt đầu học' : p.percent === 100 ? 'Học lại' : 'Tiếp tục học'}</a>
              </div>
            )
          })}
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
