import { useState } from 'react'
import { api, useApi } from '../api.js'
import Status from '../components/Status.jsx'
import NotFound from './NotFound.jsx'

const formTitles = {
  contact: 'Gửi thông tin cho chúng tôi',
  business: 'Đăng ký tư vấn cho doanh nghiệp',
  teacher: 'Đăng ký trở thành giảng viên',
  activate: 'Nhập mã kích hoạt',
}

function PageForm({ type, slug, user, onActivated }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '', code: '' })
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (type === 'activate' && !user) {
    return (
      <div className="box">
        <h3>{formTitles.activate}</h3>
        <p className="muted small-gap">Bạn cần đăng nhập để kích hoạt khóa học.</p>
        <a href="#/dang-nhap?tiep=trang/kich-hoat" className="btn-primary full center-text">Đăng nhập</a>
      </div>
    )
  }

  if (done) return <div className="box success">✅ {done}</div>

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (type === 'activate') {
        const { course } = await api('/activate', { method: 'POST', body: { code: form.code } })
        onActivated()
        setDone(`Kích hoạt thành công khóa “${course.title}”. Xem tại mục Khóa học của tôi.`)
      } else {
        const { code, ...lead } = form
        await api('/leads', { method: 'POST', body: { ...lead, type, page: slug } })
        setDone('Cảm ơn bạn! Chúng tôi sẽ liên hệ trong vòng 24 giờ.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="box form" onSubmit={submit}>
      <h3>{formTitles[type]}</h3>
      {type === 'activate' ? (
        <label>Mã kích hoạt<input required value={form.code} onChange={set('code')} placeholder="XXXX XXXX XXXX" /></label>
      ) : (
        <>
          <label>Họ và tên<input required value={form.name} onChange={set('name')} placeholder="Nguyễn Văn A" /></label>
          <label>Email<input required type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" /></label>
          <label>Số điện thoại<input required value={form.phone} onChange={set('phone')} placeholder="09xx xxx xxx" /></label>
          {type === 'business' && (
            <label>Tên doanh nghiệp<input required value={form.company} onChange={set('company')} placeholder="Công ty ABC" /></label>
          )}
          <label>
            Lời nhắn
            <textarea rows="3" value={form.message} onChange={set('message')}
              placeholder={type === 'teacher' ? 'Chuyên môn và ý tưởng khóa học của bạn' : 'Nội dung cần hỗ trợ'} />
          </label>
        </>
      )}
      {error && <p className="error">{error}</p>}
      <button className="btn-primary full" disabled={busy}>
        {busy ? 'Đang gửi...' : type === 'activate' ? 'Kích hoạt' : 'Gửi đăng ký'}
      </button>
    </form>
  )
}

export default function InfoPage({ slug, user, onActivated }) {
  const { data: page, loading, error } = useApi(`/pages/${encodeURIComponent(slug)}`, { cached: true })

  if (error?.status === 404) return <NotFound />
  if (!page) return <div className="container page"><Status loading={loading} error={error} /></div>

  return (
    <div className="container page">
      <nav className="breadcrumb dark">
        <a href="#/">Trang chủ</a> › <span>{page.title}</span>
      </nav>
      <div className={`info-layout ${page.form ? '' : 'single'}`}>
        <div>
          <div className="big-icon left">{page.icon}</div>
          <h1 className="page-title">{page.title}</h1>
          <p className="lead">{page.intro}</p>
          <div className="info-sections">
            {page.sections.map((s) => (
              <section key={s.h} className="box">
                <h3>{s.h}</h3>
                <p className="muted">{s.p}</p>
              </section>
            ))}
          </div>
        </div>
        {page.form && <PageForm type={page.form} slug={slug} user={user} onActivated={onActivated} />}
      </div>
    </div>
  )
}
