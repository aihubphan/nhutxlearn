import { useEffect, useState } from 'react'
import { slides } from '../data.js'

export default function HeroSlider() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [])

  const go = (d) => setIndex((i) => (i + d + slides.length) % slides.length)

  return (
    <section className="hero container">
      <div className="slider">
        {slides.map((s, i) => (
          <div key={s.title} className={`slide ${i === index ? 'active' : ''}`} style={{ background: s.bg }}>
            <div className="slide-text">
              <p className="eyebrow">{s.eyebrow}</p>
              <h1>{s.title}</h1>
              <h2>{s.subtitle}</h2>
              <p>{s.desc}</p>
              <a href={s.to} className="btn-light">Học ngay</a>
            </div>
            <div className="slide-card">
              <div className="slide-art">{s.art}</div>
              <ul>
                <li>✅ Học online mọi lúc trên mọi thiết bị</li>
                <li>✅ Đầu tư một lần, học trọn đời</li>
                <li>✅ Giảng viên hỗ trợ trong giờ hành chính</li>
              </ul>
            </div>
          </div>
        ))}
        <button className="slider-arrow left" onClick={() => go(-1)} aria-label="Trước">‹</button>
        <button className="slider-arrow right" onClick={() => go(1)} aria-label="Sau">›</button>
        <div className="dots">
          {slides.map((_, i) => (
            <button key={i} className={i === index ? 'on' : ''} onClick={() => setIndex(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      </div>
    </section>
  )
}
