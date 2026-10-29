import { mediaUrl } from '../api.js'

// Ảnh bìa khóa học: ảnh từ thư viện nếu có, nếu không thì biểu tượng trên nền màu
export default function CourseThumb({ course, className = '', children }) {
  const style = course.imageUrl ? undefined : { background: `linear-gradient(135deg, ${course.color}, ${course.color}aa)` }
  return (
    <div className={`course-thumb ${className}`} style={style}>
      {course.imageUrl
        ? <img src={mediaUrl(course.imageUrl)} alt="" loading="lazy" />
        : <span className="course-thumb-emoji">{course.emoji}</span>}
      {children}
    </div>
  )
}
