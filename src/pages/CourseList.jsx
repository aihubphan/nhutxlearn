import { useState } from 'react'
import CourseCard from '../components/CourseCard.jsx'
import Status from '../components/Status.jsx'
import { useApi, useTopics } from '../api.js'
import { collectionTitles } from '../data.js'

export default function CourseList({ query, search, cart, onAdd }) {
  const topics = useTopics()
  const collection = collectionTitles[query.loai] ? query.loai : ''
  const [topic, setTopic] = useState(query['chu-de'] || '')
  const [price, setPrice] = useState('all')
  const [sort, setSort] = useState('default')

  const params = new URLSearchParams()
  if (collection) params.set('collection', collection)
  if (topic) params.set('topic', topic)
  if (price !== 'all') params.set('price', price)
  if (sort !== 'default') params.set('sort', sort)
  if (search.trim()) params.set('q', search.trim())
  const { data: courses, loading, error } = useApi(`/courses?${params}`)

  const currentTopic = topics.find((t) => t.id === topic)
  const title = search.trim()
    ? `Kết quả tìm kiếm “${search}”`
    : collectionTitles[collection] || currentTopic?.name || 'Tất cả khóa học'

  return (
    <div className="container page">
      <nav className="breadcrumb dark">
        <a href="#/">Trang chủ</a> › <span>{title}</span>
      </nav>
      <h1 className="page-title">{title}</h1>

      <div className="list-layout">
        <aside className="filters">
          <h4>Chủ đề</h4>
          <label><input type="radio" checked={!topic} onChange={() => setTopic('')} /> Tất cả</label>
          {topics.map((t) => (
            <label key={t.id}>
              <input type="radio" checked={topic === t.id} onChange={() => setTopic(t.id)} /> {t.name}
            </label>
          ))}
          <h4>Học phí</h4>
          {[['all', 'Tất cả'], ['free', 'Miễn phí'], ['paid', 'Có phí']].map(([v, l]) => (
            <label key={v}><input type="radio" checked={price === v} onChange={() => setPrice(v)} /> {l}</label>
          ))}
        </aside>

        <div>
          <div className="list-toolbar">
            <span className="muted">{courses ? `${courses.length} khóa học` : ''}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="rating">Đánh giá cao nhất</option>
              <option value="price-asc">Giá thấp đến cao</option>
              <option value="price-desc">Giá cao đến thấp</option>
              <option value="newest">Mới nhất</option>
            </select>
          </div>
          {!courses ? (
            <Status loading={loading} error={error} />
          ) : courses.length ? (
            <div className={`grid grid-3 ${loading ? 'fading' : ''}`}>
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} onAdd={onAdd} inCart={cart.some((x) => x.id === c.id)} />
              ))}
            </div>
          ) : (
            <p className="empty muted">Không tìm thấy khóa học phù hợp.</p>
          )}
        </div>
      </div>
    </div>
  )
}
