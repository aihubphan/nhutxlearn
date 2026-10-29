import { formatPrice, discount } from '../utils.js'
import CourseThumb from './CourseThumb.jsx'

export default function CourseCard({ course, onAdd, inCart }) {
  const { id, title, teacher, rating, reviews, price, oldPrice } = course
  const off = discount(price, oldPrice)
  const href = `#/khoa-hoc/${id}`

  return (
    <article className="card">
      <CourseThumb course={course} className="card-thumb">
        <a href={href} className="card-link" aria-label={title} />
        {off > 0 && <span className="card-off">-{off}%</span>}
        <button className={`card-add ${inCart ? 'added' : ''}`} onClick={() => onAdd(course)}>
          {inCart ? '✓ Đã thêm' : '+ Giỏ hàng'}
        </button>
      </CourseThumb>
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
