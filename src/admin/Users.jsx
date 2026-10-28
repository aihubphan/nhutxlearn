import { useState } from 'react'
import { api, useApi } from '../api.js'
import { formatPrice, formatDate } from '../utils.js'
import { useAction } from './useAction.js'
import Status from '../components/Status.jsx'

export default function Users({ currentUser }) {
  const { data: users, loading, error, reload } = useApi('/admin/users')
  const { run, error: actionError } = useAction()
  const [q, setQ] = useState('')

  if (!users) return <Status loading={loading} error={error} />

  const keyword = q.trim().toLowerCase()
  const shown = keyword ? users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(keyword)) : users

  const setRole = (u, role) => {
    const msg = role === 'admin' ? `Cấp quyền quản trị cho ${u.email}?` : `Bỏ quyền quản trị của ${u.email}?`
    if (!window.confirm(msg)) return
    run(async () => {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { role } })
      reload()
    })
  }

  return (
    <>
      <h1 className="admin-title">Người dùng ({users.length})</h1>
      <input className="admin-search" placeholder="Tìm theo tên, email..." value={q} onChange={(e) => setQ(e.target.value)} />
      {actionError && <p className="error box">{actionError}</p>}
      <div className="box table-wrap">
        <table className="table">
          <thead>
            <tr><th>Người dùng</th><th>Ngày tham gia</th><th className="num">Khóa học</th><th className="num">Đã chi</th><th>Vai trò</th><th></th></tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id}>
                <td><b>{u.name}</b><br /><small className="muted">{u.email}</small></td>
                <td>{formatDate(u.createdAt, false)}</td>
                <td className="num">{u.courses}</td>
                <td className="num">{formatPrice(u.spent)}</td>
                <td><span className={`pill ${u.role === 'admin' ? 'pill-admin' : ''}`}>{u.role === 'admin' ? 'Quản trị' : 'Học viên'}</span></td>
                <td className="actions">
                  {u.id === currentUser.id ? (
                    <small className="muted">Bạn</small>
                  ) : u.role === 'admin' ? (
                    <button className="link-btn danger" onClick={() => setRole(u, 'user')}>Bỏ quyền</button>
                  ) : (
                    <button className="link-btn" onClick={() => setRole(u, 'admin')}>Cấp quyền QT</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
