import { partners } from '../data.js'

export default function Stats() {
  return (
    <section className="stats container">
      <h2>
        <span className="accent">3.444</span> doanh nghiệp & <span className="accent">709.075</span> người học đã lựa chọn
      </h2>
      <p className="muted">Để chuyển hóa tri thức thành sức mạnh cá nhân, hiệu suất tổ chức và sức bật quốc gia.</p>
      <div className="partners">
        <div className="partners-track">
          {[...partners, ...partners].map((p, i) => (
            <span key={i} className="partner">{p}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
