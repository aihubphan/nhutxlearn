export default function Topics({ topics }) {
  return (
    <section id="topics" className="section container">
      <div className="section-head">
        <h2>Các chủ đề chuyên môn</h2>
      </div>
      <div className="topics">
        {topics.map((t) => (
          <a href={`#/khoa-hoc?chu-de=${t.id}`} key={t.id} className="topic">
            <span className="topic-icon">{t.icon}</span>
            <span className="topic-name">{t.name}</span>
            <span className="topic-count">{t.count ? `${t.count} khóa học` : 'Sắp ra mắt'}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
