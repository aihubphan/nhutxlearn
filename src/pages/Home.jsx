import HeroSlider from '../components/HeroSlider.jsx'
import Stats from '../components/Stats.jsx'
import Topics from '../components/Topics.jsx'
import CourseSection from '../components/CourseSection.jsx'
import LearningPaths from '../components/LearningPaths.jsx'
import Promo from '../components/Promo.jsx'
import Testimonials from '../components/Testimonials.jsx'
import Status from '../components/Status.jsx'
import { useApi } from '../api.js'
import { collectionTitles } from '../data.js'

export default function Home({ cart, onAdd }) {
  const { data, loading, error } = useApi('/home')
  // Trang chủ luôn lấy số khóa mới nhất (không dùng bản nhớ tạm như menu danh mục)
  const topics = useApi('/topics').data || []

  return (
    <>
      <HeroSlider />
      <Stats />
      <Topics topics={topics} />
      {data ? (
        <>
          {['sale', 'popular', 'new'].map((key) => (
            <CourseSection
              key={key}
              title={collectionTitles[key]}
              more={`#/khoa-hoc?loai=${key}`}
              courses={data[key]}
              tabs={key === 'sale' ? topics : null}
              onAdd={onAdd}
              cart={cart}
            />
          ))}
          <LearningPaths paths={data.paths} />
        </>
      ) : (
        <div className="container section">
          <Status loading={loading} error={error} />
        </div>
      )}
      <Promo />
      <Testimonials />
    </>
  )
}
