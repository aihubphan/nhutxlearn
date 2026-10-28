import Dashboard from './Dashboard.jsx'
import Courses from './Courses.jsx'
import CourseForm from './CourseForm.jsx'
import Orders from './Orders.jsx'
import OrderDetail from './OrderDetail.jsx'
import Users from './Users.jsx'
import Leads from './Leads.jsx'
import Coupons from './Coupons.jsx'
import ActivationCodes from './ActivationCodes.jsx'
import Status from '../components/Status.jsx'

const tabs = [
  { slug: '', label: 'Tổng quan', icon: '📊' },
  { slug: 'khoa-hoc', label: 'Khóa học', icon: '📚' },
  { slug: 'don-hang', label: 'Đơn hàng', icon: '🧾' },
  { slug: 'nguoi-dung', label: 'Người dùng', icon: '👥' },
  { slug: 'lien-he', label: 'Liên hệ & bản tin', icon: '✉️' },
  { slug: 'ma-giam-gia', label: 'Mã giảm giá', icon: '🏷️' },
  { slug: 'ma-kich-hoat', label: 'Mã kích hoạt', icon: '🔑' },
]

export default function AdminApp({ parts, user, authChecked }) {
  if (!authChecked) return <div className="container page"><Status loading /></div>

  if (!user || user.role !== 'admin') {
    return (
      <div className="container page center">
        <div className="big-icon">🔒</div>
        <h1 className="page-title">Khu vực quản trị</h1>
        <p className="muted">
          {user ? 'Tài khoản của bạn không có quyền quản trị.' : 'Vui lòng đăng nhập bằng tài khoản quản trị.'}
        </p>
        {!user && <a href="#/dang-nhap?tiep=admin" className="btn-primary inline">Đăng nhập</a>}
      </div>
    )
  }

  const [tab = '', sub] = parts
  let content
  if (tab === '') content = <Dashboard />
  else if (tab === 'khoa-hoc' && sub) content = <CourseForm key={sub} id={sub === 'moi' ? null : sub} />
  else if (tab === 'khoa-hoc') content = <Courses />
  else if (tab === 'don-hang' && sub) content = <OrderDetail key={sub} id={sub} />
  else if (tab === 'don-hang') content = <Orders />
  else if (tab === 'nguoi-dung') content = <Users currentUser={user} />
  else if (tab === 'lien-he') content = <Leads />
  else if (tab === 'ma-giam-gia') content = <Coupons />
  else if (tab === 'ma-kich-hoat') content = <ActivationCodes />
  else content = <p className="empty muted">Không tìm thấy mục quản trị.</p>

  return (
    <div className="admin">
      <aside className="admin-nav">
        <p className="admin-nav-title">Quản trị</p>
        {tabs.map((t) => (
          <a key={t.slug} href={`#/admin${t.slug ? '/' + t.slug : ''}`} className={tab === t.slug ? 'on' : ''}>
            <span>{t.icon}</span>{t.label}
          </a>
        ))}
        <a href="#/" className="admin-back">← Về trang web</a>
      </aside>
      <section className="admin-main">{content}</section>
    </div>
  )
}
