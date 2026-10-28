import { useState } from 'react'
import CourseCard from './CourseCard.jsx'

export default function CourseSection({ title, more, courses, tabs, onAdd, cart }) {
  const [active, setActive] = useState('all')
  const shown = active === 'all' ? courses : courses.filter((c) => c.topic === active)

  return (
    <section className="section container">
      <div className="section-head">
        <h2>{title}</h2>
        <a href={more} className="see-more">Xem thêm →</a>
      </div>

      {tabs && (
        <div className="tabs">
          <button className={active === 'all' ? 'on' : ''} onClick={() => setActive('all')}>Tất cả</button>
          {tabs.map((t) => (
            <button key={t.id} className={active === t.id ? 'on' : ''} onClick={() => setActive(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      {shown.length ? (
        <div className="grid">
          {shown.map((c) => (
            <CourseCard key={c.id} course={c} onAdd={onAdd} inCart={cart.some((x) => x.id === c.id)} />
          ))}
        </div>
      ) : (
        <p className="empty muted">Không có khóa học phù hợp.</p>
      )}
    </section>
  )
}
