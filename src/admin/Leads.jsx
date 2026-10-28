import { useState } from 'react'
import { api, useApi } from '../api.js'
import { formatDate } from '../utils.js'
import { useAction } from './useAction.js'
import Status from '../components/Status.jsx'

const typeLabels = { contact: 'Liên hệ', business: 'Doanh nghiệp', teacher: 'Giảng viên' }
const statusLabels = { new: 'Mới', contacted: 'Đã liên hệ', done: 'Hoàn tất' }

function Newsletter() {
  const { data: subs, loading, error, reload } = useApi('/admin/newsletter')
  const { run } = useAction()
  if (!subs) return <Status loading={loading} error={error} />

  const remove = (email) => {
    if (!window.confirm(`Xóa ${email} khỏi danh sách bản tin?`)) return
    run(async () => {
      await api(`/admin/newsletter/${encodeURIComponent(email)}`, { method: 'DELETE' })
      reload()
    })
  }

  return (
    <section className="box admin-box">
      <div className="admin-head">
        <h2>Đăng ký bản tin ({subs.length})</h2>
        {subs.length > 0 && (
          <button className="link-btn" onClick={() => navigator.clipboard?.writeText(subs.map((s) => s.email).join('\n'))}>
            Sao chép danh sách email
          </button>
        )}
      </div>
      {subs.length ? (
        <table className="table">
          <tbody>
            {subs.map((s) => (
              <tr key={s.email}>
                <td>{s.email}</td>
                <td className="muted">{formatDate(s.createdAt)}</td>
                <td className="actions"><button className="link-btn danger" onClick={() => remove(s.email)}>Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="muted">Chưa có ai đăng ký.</p>}
    </section>
  )
}

export default function Leads() {
  const [status, setStatus] = useState('')
  const { data: leads, loading, error, reload } = useApi(`/admin/leads${status ? `?status=${status}` : ''}`)
  const { run, error: actionError } = useAction()

  const setLeadStatus = (lead, value) =>
    run(async () => {
      await api(`/admin/leads/${lead.id}`, { method: 'PATCH', body: { status: value } })
      reload()
    })

  const remove = (lead) => {
    if (!window.confirm(`Xóa liên hệ của ${lead.name}?`)) return
    run(async () => {
      await api(`/admin/leads/${lead.id}`, { method: 'DELETE' })
      reload()
    })
  }

  return (
    <>
      <h1 className="admin-title">Liên hệ & bản tin</h1>
      <div className="tabs">
        {[['', 'Tất cả'], ...Object.entries(statusLabels)].map(([v, l]) => (
          <button key={v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>
      {actionError && <p className="error box">{actionError}</p>}

      {!leads ? (
        <Status loading={loading} error={error} />
      ) : leads.length ? (
        <div className="lead-list">
          {leads.map((l) => (
            <article key={l.id} className={`box lead lead-${l.status}`}>
              <div className="lead-head">
                <div>
                  <b>{l.name}</b> <span className="pill">{typeLabels[l.type] || l.type}</span>
                  {l.company && <span className="muted"> · {l.company}</span>}
                  <br />
                  <small className="muted">
                    <a href={`mailto:${l.email}`}>{l.email}</a> · <a href={`tel:${l.phone}`}>{l.phone}</a> · {formatDate(l.createdAt)}
                    {l.page && <> · từ trang “{l.page}”</>}
                  </small>
                </div>
                <div className="lead-actions">
                  <select value={l.status} onChange={(e) => setLeadStatus(l, e.target.value)}>
                    {Object.entries(statusLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                  <button className="link-btn danger" onClick={() => remove(l)}>Xóa</button>
                </div>
              </div>
              {l.message && <p className="lead-msg">{l.message}</p>}
            </article>
          ))}
        </div>
      ) : (
        <p className="empty muted">Không có liên hệ nào.</p>
      )}

      <Newsletter />
    </>
  )
}
