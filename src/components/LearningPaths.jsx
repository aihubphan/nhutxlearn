import { formatPrice } from '../utils.js'

export default function LearningPaths({ paths: learningPaths }) {
  return (
    <section className="section container">
      <div className="section-head">
        <h2>Lộ trình học tập</h2>
      </div>
      <div className="paths">
        {learningPaths.map((p) => (
          <a href={`#/lo-trinh/${p.id}`} key={p.id} className="path" style={{ '--c': p.color }}>
            <div className="path-count">
              <b>{p.courses}</b>
              <span>khóa học</span>
            </div>
            <h3>Chương trình {p.title}</h3>
            <p className="muted">👥 {p.learners.toLocaleString('vi-VN')} học viên quan tâm</p>
            <div className="price">
              <b>{formatPrice(p.price)}</b>
              <s>{formatPrice(p.oldPrice)}</s>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
