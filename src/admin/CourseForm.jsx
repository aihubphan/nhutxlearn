import { useEffect, useState } from 'react'
import { api, useTopics } from '../api.js'
import { navigate } from '../router.js'
import { useAction } from './useAction.js'
import Status from '../components/Status.jsx'
import LessonVideo from './LessonVideo.jsx'

const empty = {
  title: '', teacher: '', teacherBio: '', topic: 'tech', collection: '', price: 0, oldPrice: 0,
  emoji: '📘', color: '#1fa855', level: 'Cơ bản', hours: 0, description: '', outcomes: [''], published: true,
  curriculum: [{ name: 'Giới thiệu', lessons: [{ title: 'Bài mở đầu', duration: '5:00', preview: true }] }],
}

// Giữ thông báo "Đã lưu" khi chuyển từ trang tạo mới sang trang sửa
let justCreatedId = null

export default function CourseForm({ id }) {
  const topics = useTopics()
  const [form, setForm] = useState(id ? null : empty)
  const [loadError, setLoadError] = useState(null)
  const [saved, setSaved] = useState(() => {
    const created = id && String(justCreatedId) === String(id)
    justCreatedId = null
    return created
  })
  const { run, busy, error } = useAction()

  const load = () =>
    api(`/admin/courses/${encodeURIComponent(id)}`)
      .then((c) => setForm({ ...c, collection: c.collection || '', outcomes: c.outcomes.length ? c.outcomes : [''] }))
      .catch(setLoadError)

  useEffect(() => {
    if (id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!form) return <Status loading={!loadError} error={loadError} />

  const set = (k) => (e) => {
    setSaved(false)
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  }
  const update = (fn) => {
    setSaved(false)
    setForm((f) => fn(structuredClone(f)))
  }

  const submit = (e) => {
    e.preventDefault()
    run(async () => {
      const body = { ...form, price: Number(form.price), oldPrice: Number(form.oldPrice), hours: Number(form.hours) }
      const res = await api(id ? `/admin/courses/${id}` : '/admin/courses', { method: id ? 'PUT' : 'POST', body })
      if (!id) {
        justCreatedId = res.id
        navigate(`#/admin/khoa-hoc/${res.id}`)
        return
      }
      // Tải lại để bài học mới có id (cần id mới tải được video)
      await load()
      setSaved(true)
    })
  }

  return (
    <form onSubmit={submit} className="course-form">
      <div className="admin-head">
        <h1 className="admin-title">{id ? `Sửa khóa học #${id}` : 'Thêm khóa học'}</h1>
        <a href="#/admin/khoa-hoc" className="link-btn">← Danh sách</a>
      </div>

      <div className="admin-cols wide-left">
        <div className="form-stack">
          <section className="box form">
            <h3>Thông tin chung</h3>
            <label>Tên khóa học *<input required value={form.title} onChange={set('title')} /></label>
            <label>Mô tả<textarea rows="4" value={form.description} onChange={set('description')} /></label>
            <div className="form-row">
              <label>Giảng viên *<input required value={form.teacher} onChange={set('teacher')} /></label>
              <label>Trình độ
                <select value={form.level} onChange={set('level')}>
                  {['Cơ bản', 'Trung cấp', 'Nâng cao'].map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
            </div>
            <label>Giới thiệu giảng viên<textarea rows="2" value={form.teacherBio} onChange={set('teacherBio')} /></label>
          </section>

          <section className="box form">
            <h3>Bạn sẽ học được gì</h3>
            {form.outcomes.map((o, i) => (
              <div key={i} className="inline-row">
                <input value={o} placeholder={`Kết quả ${i + 1}`} onChange={(e) => update((f) => { f.outcomes[i] = e.target.value; return f })} />
                <button type="button" className="icon-btn" onClick={() => update((f) => { f.outcomes.splice(i, 1); return f })} aria-label="Xóa">✕</button>
              </div>
            ))}
            <button type="button" className="link-btn left" onClick={() => update((f) => { f.outcomes.push(''); return f })}>+ Thêm dòng</button>
          </section>

          <section className="box form">
            <h3>Giáo trình</h3>
            {form.curriculum.map((ch, ci) => (
              <div key={ci} className="chapter-edit">
                <div className="inline-row">
                  <b className="muted">Chương {ci + 1}</b>
                  <input value={ch.name} placeholder="Tên chương" onChange={(e) => update((f) => { f.curriculum[ci].name = e.target.value; return f })} />
                  <button type="button" className="icon-btn" onClick={() => update((f) => { f.curriculum.splice(ci, 1); return f })} aria-label="Xóa chương">✕</button>
                </div>
                {ch.lessons.map((l, li) => (
                  <div key={l.id ?? `new-${ci}-${li}`} className="lesson-block">
                    <div className="inline-row lesson-edit">
                      <input value={l.title} placeholder="Tên bài học" onChange={(e) => update((f) => { f.curriculum[ci].lessons[li].title = e.target.value; return f })} />
                      <input className="short" value={l.duration} placeholder="mm:ss" onChange={(e) => update((f) => { f.curriculum[ci].lessons[li].duration = e.target.value; return f })} />
                      <label className="check">
                        <input type="checkbox" checked={l.preview} onChange={(e) => update((f) => { f.curriculum[ci].lessons[li].preview = e.target.checked; return f })} />
                        Học thử
                      </label>
                      <button type="button" className="icon-btn" aria-label="Xóa bài"
                        onClick={() => (!l.hasVideo || window.confirm(`Bài “${l.title}” có video. Video sẽ bị xóa khi bạn lưu khóa học. Tiếp tục?`)) && update((f) => { f.curriculum[ci].lessons.splice(li, 1); return f })}>✕</button>
                    </div>
                    <div className="lesson-extra">
                      {/* Video lưu ngay trên server nên không đánh dấu form là "chưa lưu" */}
                      <LessonVideo lesson={l} onChange={(patch) => setForm((f) => {
                        const next = structuredClone(f)
                        Object.assign(next.curriculum[ci].lessons[li], patch)
                        return next
                      })} />
                      <details>
                        <summary className="muted small">📝 Ghi chú / tài liệu bài học{l.content ? ' (có)' : ''}</summary>
                        <textarea rows="4" value={l.content || ''} placeholder="Tóm tắt, link tài liệu, bài tập… (hiện dưới video, chỉ người đã mua mới xem được)"
                          onChange={(e) => update((f) => { f.curriculum[ci].lessons[li].content = e.target.value; return f })} />
                      </details>
                    </div>
                  </div>
                ))}
                <button type="button" className="link-btn left" onClick={() => update((f) => { f.curriculum[ci].lessons.push({ title: '', duration: '', preview: false }); return f })}>
                  + Thêm bài học
                </button>
              </div>
            ))}
            <button type="button" className="btn-outline" onClick={() => update((f) => { f.curriculum.push({ name: '', lessons: [] }); return f })}>
              + Thêm chương
            </button>
          </section>
        </div>

        <div className="form-stack">
          <section className="box form">
            <h3>Xuất bản</h3>
            <label className="check">
              <input type="checkbox" checked={form.published} onChange={set('published')} /> Hiển thị trên trang web
            </label>
            {error && <p className="error">{error}</p>}
            {saved && <p className="green">✓ Đã lưu</p>}
            <button className="btn-primary full" disabled={busy}>{busy ? 'Đang lưu...' : id ? 'Lưu thay đổi' : 'Tạo khóa học'}</button>
            {id && <a href={`#/khoa-hoc/${id}`} target="_blank" rel="noreferrer" className="link-btn center-text">Xem trên trang web ↗</a>}
          </section>

          <section className="box form">
            <h3>Giá</h3>
            <label>Giá bán (đ) — 0 là miễn phí<input type="number" min="0" step="1000" value={form.price} onChange={set('price')} /></label>
            <label>Giá gốc (đ)<input type="number" min="0" step="1000" value={form.oldPrice} onChange={set('oldPrice')} /></label>
          </section>

          <section className="box form">
            <h3>Phân loại</h3>
            <label>Chủ đề
              <select value={form.topic} onChange={set('topic')}>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label>Nhóm trên trang chủ
              <select value={form.collection} onChange={set('collection')}>
                <option value="">Không</option>
                <option value="sale">Ưu đãi nhiều</option>
                <option value="popular">Được học nhiều</option>
                <option value="new">Mới xuất bản</option>
              </select>
            </label>
            <label>Tổng thời lượng (giờ)<input type="number" min="0" step="0.1" value={form.hours} onChange={set('hours')} /></label>
          </section>

          <section className="box form">
            <h3>Ảnh đại diện</h3>
            <div className="form-row">
              <label>Biểu tượng<input value={form.emoji} onChange={set('emoji')} maxLength="8" /></label>
              <label>Màu nền<input type="color" value={form.color} onChange={set('color')} /></label>
            </div>
            <div className="mini-preview" style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}aa)` }}>{form.emoji}</div>
          </section>
        </div>
      </div>
    </form>
  )
}
