import { useState } from 'react'
import { quickLinks } from '../data.js'
import { formatPrice } from '../utils.js'
import { useTopics } from '../api.js'

export default function Header({ cart, search, onSearch, user, onLogout }) {
  const topics = useTopics()
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const total = cart.reduce((s, c) => s + c.price, 0)

  return (
    <header className="header">
      <div className="header-top container">
        <a href="#/" className="logo">
          <span className="logo-mark">N</span>
          <span>NHUTX<b>LEARN</b></span>
        </a>

        <div className="dropdown" onMouseLeave={() => setMenuOpen(false)}>
          <button className="btn-category" onClick={() => setMenuOpen((v) => !v)} onMouseEnter={() => setMenuOpen(true)}>
            <span className="grid-icon">▦</span> DANH MỤC
          </button>
          {menuOpen && (
            <ul className="dropdown-menu" onClick={() => setMenuOpen(false)}>
              <li><a href="#/khoa-hoc"><span>📚</span>Tất cả khóa học</a></li>
              {topics.map((t) => (
                <li key={t.id}>
                  <a href={`#/khoa-hoc?chu-de=${t.id}`}><span>{t.icon}</span>{t.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="search" onSubmit={(e) => e.preventDefault()}>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Tìm kiếm khóa học, giảng viên"
          />
          <button aria-label="Tìm kiếm" onClick={() => onSearch(search)}>🔍</button>
        </form>

        <a href="#/trang/kich-hoat" className="btn-activate">🔑 Kích hoạt</a>

        <div className="cart" onMouseLeave={() => setCartOpen(false)}>
          <button className="cart-btn" onClick={() => setCartOpen((v) => !v)} onMouseEnter={() => setCartOpen(true)} aria-label="Giỏ hàng">
            🛒{cart.length > 0 && <span className="badge">{cart.length}</span>}
          </button>
          {cartOpen && (
            <div className="cart-panel" onClick={() => setCartOpen(false)}>
              {cart.length === 0 ? (
                <p className="muted">Giỏ hàng trống</p>
              ) : (
                <>
                  {cart.map((c) => (
                    <a href={`#/khoa-hoc/${c.id}`} key={c.id} className="cart-item">
                      <span>{c.emoji}</span>
                      <p>{c.title}</p>
                      <b>{c.price ? formatPrice(c.price) : 'Miễn phí'}</b>
                    </a>
                  ))}
                  <div className="cart-total">Tổng: <b>{formatPrice(total)}</b></div>
                  <a href="#/gio-hang" className="btn-primary full center-text">Xem giỏ hàng & thanh toán</a>
                </>
              )}
            </div>
          )}
        </div>

        {user ? (
          <span className="login">
            {user.role === 'admin' && <><a href="#/admin" className="admin-link">⚙ Quản trị</a> · </>}
            <a href="#/khoa-hoc-cua-toi">👋 {user.name}</a> · <button className="link-btn" onClick={onLogout}>Đăng xuất</button>
          </span>
        ) : (
          <a href="#/dang-nhap" className="login">Đăng ký / Đăng nhập</a>
        )}
      </div>

      <nav className="quick-nav">
        <div className="container quick-nav-inner">
          {quickLinks.map((l) => (
            <a href={l.to} key={l.label}><span>{l.icon}</span>{l.label}</a>
          ))}
          {user?.role === 'admin' && <a href="#/admin"><span>⚙️</span>Quản trị</a>}
        </div>
      </nav>
    </header>
  )
}
