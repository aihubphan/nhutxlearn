// Nội dung trang trí cố định của giao diện. Dữ liệu khóa học, lộ trình,
// gói hội viên và các trang thông tin được lấy từ API (thư mục server/).

export const quickLinks = [
  { label: 'Tạo LMS doanh nghiệp (Free)', icon: '🔥', to: '#/trang/lms' },
  { label: 'Khóa học tuyển chọn', icon: '⚡', to: '#/khoa-hoc?loai=popular' },
  { label: 'Tuyển tập khóa học free', icon: '🎁', to: '#/khoa-hoc?loai=free' },
  { label: 'Chuyển đổi sang AI', icon: '🤖', to: '#/khoa-hoc?loai=ai' },
  { label: 'Hội viên', icon: '👑', to: '#/hoi-vien' },
]

export const slides = [
  {
    eyebrow: 'Học trọn bộ',
    title: 'Excel & VBA',
    subtitle: 'Thành thạo dữ liệu văn phòng',
    desc: 'Tự động hóa công việc, tăng hiệu suất gấp 10 lần chỉ sau 30 giờ học online.',
    bg: 'linear-gradient(120deg,#0f7a3a 0%,#1fa855 55%,#5fd38a 100%)',
    art: '📊',
    to: '#/khoa-hoc/11',
  },
  {
    eyebrow: 'Mới ra mắt',
    title: 'AI cho người đi làm',
    subtitle: 'ChatGPT · Claude · Gemini',
    desc: 'Ứng dụng AI vào công việc hằng ngày: viết, phân tích, tự động hóa quy trình.',
    bg: 'linear-gradient(120deg,#3b1d8f 0%,#6a3de8 55%,#a487ff 100%)',
    art: '🤖',
    to: '#/khoa-hoc?loai=ai',
  },
  {
    eyebrow: 'Lộ trình',
    title: 'Kế toán thực chiến',
    subtitle: 'Từ cơ bản đến chuyên sâu',
    desc: 'Thực hành trên Excel và phần mềm kế toán, cập nhật chính sách thuế mới nhất.',
    bg: 'linear-gradient(120deg,#b3122a 0%,#e5293f 55%,#ff7a6b 100%)',
    art: '🧾',
    to: '#/lo-trinh/ke-toan',
  },
]

export const partners = ['VinaTech', 'Jupiter', 'Delta', 'SaiGon Bank', 'MetroCo', 'Scots English', 'GreenLog', 'AsiaPack']

export const collectionTitles = {
  sale: 'Khóa học ưu đãi nhiều',
  popular: 'Khóa học được học nhiều',
  new: 'Khóa học mới xuất bản',
  free: 'Tuyển tập khóa học miễn phí',
  ai: 'Chuyển đổi sang AI',
}

export const testimonials = [
  { name: 'Nguyễn Thị Lan', role: 'Kế toán trưởng', text: 'Các khóa Excel giúp mình rút ngắn thời gian làm báo cáo cuối tháng từ 3 ngày xuống còn nửa ngày.' },
  { name: 'Trần Văn Hùng', role: 'Trưởng phòng kinh doanh', text: 'Nội dung thực tế, dễ áp dụng. Cả team mình học chung và tiến bộ rõ rệt sau 2 tháng.' },
  { name: 'Lê Minh Châu', role: 'Chuyên viên Marketing', text: 'Học mọi lúc mọi nơi trên điện thoại, giảng viên hỗ trợ trả lời câu hỏi rất nhanh.' },
]
