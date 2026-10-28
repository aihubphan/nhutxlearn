import { useState } from 'react'
import { api, useApi } from '../api.js'
import { useAction } from './useAction.js'
import Status from '../components/Status.jsx'

export default function Coupons() {
  const { data: coupons, loading, error, reload } = useApi('/admin/coupons')
  const { run, busy, error: actionError } = useAction()
  const [form, setForm] = useState({ code: '', percent: 10 })

  if (!coupons) return <Status loading={loading} error={error} />

  const create = (e) => {
    e.preventDefault()
    run(async () => {
      await api('/admin/coupons', { method: 'POST', body: { code: form.code, percent: Number(form.percent) } })
      setForm({ code: '', percent: 10 })
      reload()
    })
  }

  const update = (c, body) =>
    run(async () => {
      await api(`/admin/coupons/${c.code}`, { method: 'PATCH', body })
      reload()
    })

  const remove = (c) => {
    if (!window.confirm(`Xóa mã ${c.code}?`)) return
    run(async () => {
      await api(`/admin/coupons/${c.code}`, { method: 'DELETE' })
      reload()
    })
  }

  return (
    <>
      <h1 className="admin-title">Mã giảm giá</h1>
      <form className="box admin-inline-form" onSubmit={create}>
        <label>Mã mới<input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VD: TET2027" /></label>
        <label>Giảm (%)<input required type="number" min="1" max="100" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} /></label>
        <button className="btn-primary" disabled={busy}>+ Tạo mã</button>
      </form>
      {actionError && <p className="error box">{actionError}</p>}

      <div className="box table-wrap">
        <table className="table">
          <thead><tr><th>Mã</th><th className="num">Giảm</th><th className="num">Đã dùng</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.code} className={c.active ? '' : 'dimmed'}>
                <td><code>{c.code}</code></td>
                <td className="num">
                  <input className="percent-input" type="number" min="1" max="100" defaultValue={c.percent}
                    onBlur={(e) => Number(e.target.value) !== c.percent && update(c, { percent: Number(e.target.value) })} />%
                </td>
                <td className="num">{c.used} đơn</td>
                <td>
                  <button className={`pill ${c.active ? 'pill-on' : ''}`} onClick={() => update(c, { active: !c.active })}>
                    {c.active ? '● Đang bật' : '○ Đã tắt'}
                  </button>
                </td>
                <td className="actions"><button className="link-btn danger" onClick={() => remove(c)}>Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!coupons.length && <p className="empty muted">Chưa có mã giảm giá.</p>}
      </div>
    </>
  )
}
