import { useCallback, useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import CourseList from './pages/CourseList.jsx'
import CourseDetail from './pages/CourseDetail.jsx'
import PathDetail from './pages/PathDetail.jsx'
import Cart from './pages/Cart.jsx'
import Login from './pages/Login.jsx'
import Membership from './pages/Membership.jsx'
import MyCourses from './pages/MyCourses.jsx'
import InfoPage from './pages/InfoPage.jsx'
import NotFound from './pages/NotFound.jsx'
import AdminApp from './admin/AdminApp.jsx'
import PaymentResult from './pages/PaymentResult.jsx'
import Learn from './pages/Learn.jsx'
import { useRoute, navigate } from './router.js'
import { api, getToken, setToken } from './api.js'

// Giỏ hàng của khách lưu trong trình duyệt; giá được server tính lại khi thanh toán
function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])
  return [value, setValue]
}

export default function App() {
  const { parts, query } = useRoute()
  const [cart, setCart] = useStored('cart-v2', [])
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(() => !getToken())
  const [myCourses, setMyCourses] = useState([])
  const [search, setSearch] = useState('')
  const [showTop, setShowTop] = useState(false)

  const enrolledIds = myCourses.map((c) => c.id)

  const refreshMine = useCallback(() => {
    api('/me/courses').then(setMyCourses).catch(() => setMyCourses([]))
  }, [])

  // Khôi phục phiên đăng nhập từ token đã lưu
  useEffect(() => {
    if (!getToken()) return
    api('/auth/me')
      .then((u) => {
        setUser(u)
        refreshMine()
      })
      .catch(() => setToken(null))
      .finally(() => setAuthChecked(true))
  }, [refreshMine])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const addToCart = (course) => setCart((prev) => (prev.some((c) => c.id === course.id) ? prev : [...prev, course]))
  const removeFromCart = (id) => setCart((prev) => prev.filter((c) => c.id !== id))

  const onLogin = ({ token, user }) => {
    setToken(token)
    setUser(user)
    refreshMine()
  }
  const onLogout = () => {
    setToken(null)
    setUser(null)
    setMyCourses([])
    navigate('#/')
  }
  const onPaid = useCallback((order) => {
    setCart((prev) => prev.filter((c) => !order.courseIds.includes(c.id)))
    refreshMine()
  }, [setCart, refreshMine])

  const onSearch = (value) => {
    setSearch(value)
    if (parts[0] !== 'khoa-hoc' || parts[1]) navigate('#/khoa-hoc')
  }

  // Mở "Khóa học của tôi" thì tải lại để tiến độ học luôn mới
  useEffect(() => {
    if (parts[0] === 'khoa-hoc-cua-toi' && user) refreshMine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts[0], user?.id])

  const [section, param, sub] = parts
  let page
  if (!section) page = <Home cart={cart} onAdd={addToCart} />
  else if (section === 'khoa-hoc' && param)
    page = <CourseDetail key={param} id={param} cart={cart} onAdd={addToCart} user={user} enrolledIds={enrolledIds} onEnrolled={refreshMine} />
  else if (section === 'khoa-hoc')
    page = <CourseList key={JSON.stringify(query)} query={query} search={search} cart={cart} onAdd={addToCart} />
  else if (section === 'lo-trinh') page = <PathDetail id={param} user={user} onPaid={onPaid} />
  else if (section === 'gio-hang')
    page = <Cart cart={cart} user={user} enrolledIds={enrolledIds} onRemove={removeFromCart} onPaid={onPaid} />
  else if (section === 'dang-nhap') page = <Login query={query} onLogin={onLogin} />
  else if (section === 'hoi-vien') page = <Membership />
  else if (section === 'khoa-hoc-cua-toi') page = <MyCourses user={user} courses={myCourses} />
  else if (section === 'trang') page = <InfoPage key={param} slug={param} user={user} onActivated={refreshMine} />
  else if (section === 'hoc' && param) page = <Learn key={param} courseId={param} lessonId={sub} user={user} />
  else if (section === 'thanh-toan') page = <PaymentResult query={query} user={user} onPaid={onPaid} />
  else if (section === 'admin') page = <AdminApp parts={parts.slice(1)} user={user} authChecked={authChecked} />
  else page = <NotFound />

  return (
    <>
      <Header cart={cart} search={search} onSearch={onSearch} user={user} onLogout={onLogout} />
      <main>{page}</main>
      {section !== 'admin' && <Footer />}
      {showTop && (
        <button className="to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Lên đầu trang">
          ↑<span>TOP</span>
        </button>
      )}
    </>
  )
}
