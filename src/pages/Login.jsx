import { useState } from 'react'
import { navigate } from '../router.js'
import { api } from '../api.js'

export default function Login({ query, onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const switchMode = (m) => {
    setMode(m)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.email.includes('@')) return setError('Email không hợp lệ')
    if (form.password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự')
    if (mode === 'register' && !form.name.trim()) return setError('Vui lòng nhập họ tên')

    setBusy(true)
    setError('')
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form
      onLogin(await api(`/auth/${mode}`, { method: 'POST', body }))
      navigate(query.tiep ? `#/${query.tiep}` : '#/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page">
      <div className="auth box">
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'on' : ''} onClick={() => switchMode('login')}>Đăng nhập</button>
          <button className={mode === 'register' ? 'on' : ''} onClick={() => switchMode('register')}>Đăng ký</button>
        </div>
        <form onSubmit={submit} className="form">
          {mode === 'register' && (
            <label>Họ và tên<input value={form.name} onChange={set('name')} placeholder="Nguyễn Văn A" /></label>
          )}
          <label>Email<input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" /></label>
          <label>Mật khẩu<input type="password" value={form.password} onChange={set('password')} placeholder="Tối thiểu 6 ký tự" /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn-primary full" disabled={busy}>
            {busy ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>
        <p className="muted center-text small-gap">
          {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button className="link-btn" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  )
}
