import { testimonials } from '../data.js'

export default function Testimonials() {
  return (
    <section className="section container">
      <div className="section-head">
        <h2>Học viên nói gì về chúng tôi</h2>
      </div>
      <div className="testimonials">
        {testimonials.map((t) => (
          <figure key={t.name} className="quote">
            <blockquote>“{t.text}”</blockquote>
            <figcaption>
              <span className="avatar">{t.name.split(' ').pop()[0]}</span>
              <span>
                <b>{t.name}</b>
                <small className="muted">{t.role}</small>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
