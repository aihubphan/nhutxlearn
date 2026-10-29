import { formatPrice, discount } from '../utils.js'

export default function CourseCard({ course, onAdd, inCart }) {
  const { id, title, teacher, rating, reviews, price, oldPrice, emoji, color } = course
  const off = discount(price, oldPrice)
  const href = `#/khoa-hoc/${id}`

  return (
    <article className="card">
      <div className="card-thumb" style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>
        <a href={href} className="card-link" aria-label={title}><span className="card-emoji">{emoji}</span></a>
        {off > 0 && <span className="card-off">-{off}%</span>}
        <button className={`card-add ${inCart ? 'added' : ''}`} onClick={() => onAdd(course)}>
          {inCart ? '✓ Đã thêm' : '+ Giỏ hàng'}
        </button>
      </div>
      <div className="card-body">
        <h3 title={title}><a href={href}>{title}</a></h3>
        <p className="teacher">{teacher}</p>
        <p className="rating">
          <b>{rating}</b> <span className="stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
          <span className="muted"> ({reviews} đánh giá)</span>
        </p>
        <div className="price">
          <b>{price ? formatPrice(price) : 'Miễn phí'}</b>
          {oldPrice > price && <s>{formatPrice(oldPrice)}</s>}
        </div>
      </div>
    </article>
  )
}
