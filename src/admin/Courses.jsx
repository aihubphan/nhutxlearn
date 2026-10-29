import { useState } from 'react'
import { api, useApi } from '../api.js'
import { formatPrice } from '../utils.js'
import { useAction } from './useAction.js'
import Status from '../components/Status.jsx'
import CourseThumb from '../components/CourseThumb.jsx'

export default function Courses() {
  const { data: courses, loading, error, reload } = useApi('/admin/courses')
  const { run, error: actionError } = useAction()
  const [q, setQ] = useState('')

  if (!courses) return <Status loading={loading} error={error} />

  const keyword = q.trim().toLowerCase()
  const shown = keyword ? courses.filter((c) => `${c.title} ${c.teacher}`.toLowerCase().includes(keyword)) : courses

  const togglePublish = (c) =>
    run(async () => {
      await api(`/admin/courses/${c.id}`, { method: 'PATCH', body: { published: !c.published } })
      reload()
    })

  const remove = (c) => {
    if (!window.confirm(`Xóa vĩnh viễn khóa học “${c.title}”?`)) return
    run(async () => {
      await api(`/admin/courses/${c.id}`, { method: 'DELETE' })
      reload()
    })
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">Khóa học ({courses.length})</h1>
        <a href="#/admin/khoa-hoc/moi" className="btn-primary">+ Thêm khóa học</a>
      </div>
      <input className="admin-search" placeholder="Tìm theo tên khóa học, giảng viên..." value={q} onChange={(e) => setQ(e.target.value)} />
      {actionError && <p className="error box">{actionError}</p>}

      <div className="box table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Khóa học</th><th>Chủ đề</th><th className="num">Giá bán</th>
              <th className="num">Đã bán</th><th className="num">Học viên</th><th>Trạng thái</th><th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className={c.published ? '' : 'dimmed'}>
                <td>
                  <a href={`#/admin/khoa-hoc/${c.id}`} className="course-cell">
                    <CourseThumb course={c} className="mini-thumb" />
                    <span><b>{c.title}</b><small className="muted">#{c.id} · {c.teacher}</small></span>
                  </a>
                </td>
                <td>{c.topicName}</td>
                <td className="num">
                  {c.price ? formatPrice(c.price) : 'Miễn phí'}
                  {c.oldPrice > c.price && <><br /><s className="muted">{formatPrice(c.oldPrice)}</s></>}
                </td>
                <td className="num">{c.sold}</td>
                <td className="num">{c.students}</td>
                <td>
                  <button className={`pill ${c.published ? 'pill-on' : ''}`} onClick={() => togglePublish(c)} title="Bấm để đổi">
                    {c.published ? '● Hiển thị' : '○ Đang ẩn'}
                  </button>
                </td>
                <td className="actions">
                  <a href={`#/admin/khoa-hoc/${c.id}`} className="link-btn">Sửa</a>
                  <a href={`#/khoa-hoc/${c.id}`} className="link-btn" target="_blank" rel="noreferrer">Xem</a>
                  <button className="link-btn danger" onClick={() => remove(c)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="empty muted">Không có khóa học phù hợp.</p>}
      </div>
    </>
  )
}
