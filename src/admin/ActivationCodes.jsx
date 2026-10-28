import { useState } from 'react'
import { api, useApi } from '../api.js'
import { formatDate } from '../utils.js'
import { useAction } from './useAction.js'
import Status from '../components/Status.jsx'

export default function ActivationCodes() {
  const { data: codes, loading, error, reload } = useApi('/admin/activation-codes')
  const { data: courses } = useApi('/admin/courses')
  const { run, busy, error: actionError } = useAction()
  const [form, setForm] = useState({ courseId: '', quantity: 5 })
  const [created, setCreated] = useState([])

  if (!codes) return <Status loading={loading} error={error} />

  const generate = (e) => {
    e.preventDefault()
    run(async () => {
      const res = await api('/admin/activation-codes', {
        method: 'POST',
        body: { courseId: Number(form.courseId), quantity: Number(form.quantity) },
      })
      setCreated(res.codes)
      reload()
    })
  }

  const remove = (c) => {
    if (!window.confirm(`Xóa mã ${c.code}?`)) return
    run(async () => {
      await api(`/admin/activation-codes/${c.code}`, { method: 'DELETE' })
      reload()
    })
  }

  const unused = codes.filter((c) => !c.usedBy).length

  return (
    <>
      <h1 className="admin-title">Mã kích hoạt</h1>
      <form className="box admin-inline-form" onSubmit={generate}>
        <label className="grow">Khóa học
          <select required value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
            <option value="">— Chọn khóa học —</option>
            {courses?.map((c) => <option key={c.id} value={c.id}>#{c.id} {c.title}</option>)}
          </select>
        </label>
        <label>Số lượng<input type="number" min="1" max="100" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
        <button className="btn-primary" disabled={busy}>Tạo mã</button>
      </form>
      {actionError && <p className="error box">{actionError}</p>}

      {created.length > 0 && (
        <div className="box success-box">
          <div className="admin-head">
            <b>✓ Đã tạo {created.length} mã mới</b>
            <button className="link-btn" onClick={() => navigator.clipboard?.writeText(created.join('\n'))}>Sao chép tất cả</button>
          </div>
          <div className="code-list">{created.map((c) => <code key={c}>{c}</code>)}</div>
        </div>
      )}

      <div className="box table-wrap">
        <p className="muted small-gap">{codes.length} mã · {unused} chưa dùng</p>
        <table className="table">
          <thead><tr><th>Mã</th><th>Khóa học</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.code} className={c.usedBy ? 'dimmed' : ''}>
                <td><code>{c.code}</code></td>
                <td>{c.courseTitle}</td>
                <td>
                  {c.usedBy
                    ? <small>Đã dùng bởi {c.usedBy}<br /><span className="muted">{formatDate(c.usedAt)}</span></small>
                    : <span className="pill pill-on">Chưa dùng</span>}
                </td>
                <td className="actions">{!c.usedBy && <button className="link-btn danger" onClick={() => remove(c)}>Xóa</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
