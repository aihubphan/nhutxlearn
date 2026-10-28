// Dữ liệu khởi tạo cho cơ sở dữ liệu. Chỉ chạy một lần khi DB còn trống.

export const topics = [
  { id: 'sales', name: 'Bán hàng & Khách hàng', icon: '🤝', count: 93 },
  { id: 'people', name: 'Con người & Lãnh đạo', icon: '🧭', count: 338 },
  { id: 'tech', name: 'Công nghệ & Dữ liệu', icon: '💻', count: 287 },
  { id: 'marketing', name: 'Marketing & Truyền thông', icon: '📣', count: 133 },
  { id: 'ops', name: 'Quản trị & Vận hành', icon: '⚙️', count: 109 },
  { id: 'product', name: 'Sản phẩm & Chiến lược', icon: '🎯', count: 71 },
  { id: 'finance', name: 'Tài chính & Pháp lý', icon: '💰', count: 101 },
  { id: 'brand', name: 'Thương hiệu & Văn hóa', icon: '🏷️', count: 52 },
]

export const outcomesByTopic = {
  sales: ['Hiểu tâm lý và hành vi mua hàng của khách', 'Xây dựng kịch bản tư vấn, chốt đơn hiệu quả', 'Xử lý từ chối và chăm sóc sau bán', 'Đo lường và tối ưu tỷ lệ chuyển đổi'],
  people: ['Quản lý bản thân và thời gian hiệu quả', 'Giao tiếp, thuyết phục và tạo ảnh hưởng', 'Dẫn dắt, phân quyền và tạo động lực cho đội nhóm', 'Phản hồi và đánh giá hiệu suất công bằng'],
  tech: ['Làm chủ công cụ từ cơ bản đến nâng cao', 'Xử lý, phân tích và trực quan hóa dữ liệu', 'Tự động hóa công việc lặp lại', 'Áp dụng ngay vào báo cáo và công việc thực tế'],
  marketing: ['Xây dựng chiến lược nội dung đa kênh', 'Thiết lập và tối ưu chiến dịch quảng cáo', 'Đo lường hiệu quả bằng số liệu', 'Tối ưu chi phí trên mỗi khách hàng'],
  ops: ['Chuẩn hóa quy trình vận hành', 'Thiết lập KPI và hệ thống báo cáo', 'Phối hợp liên phòng ban hiệu quả', 'Ứng dụng công cụ số vào quản trị'],
  product: ['Nghiên cứu thị trường và khách hàng', 'Xây dựng chiến lược sản phẩm', 'Ưu tiên tính năng theo giá trị', 'Đo lường tăng trưởng sản phẩm'],
  finance: ['Nắm vững nguyên lý kế toán – tài chính', 'Lập và đọc hiểu báo cáo tài chính', 'Cập nhật quy định thuế mới nhất', 'Thực hành trên Excel và phần mềm'],
  brand: ['Định vị thương hiệu rõ ràng', 'Xây dựng bộ giá trị cốt lõi', 'Lan tỏa văn hóa trong tổ chức', 'Đo lường sức khỏe thương hiệu'],
}

export const chapterNames = [
  ['Tổng quan và tư duy nền tảng', ['Giới thiệu khóa học', 'Tại sao kỹ năng này quan trọng', 'Các khái niệm cốt lõi']],
  ['Kiến thức trọng tâm', ['Nguyên tắc và phương pháp', 'Công cụ cần thiết', 'Những lỗi thường gặp', 'Mẹo áp dụng nhanh']],
  ['Thực hành qua tình huống thực tế', ['Case study 1: Doanh nghiệp nhỏ', 'Case study 2: Tập đoàn lớn', 'Bài tập thực hành có hướng dẫn']],
  ['Dự án cuối khóa và tổng kết', ['Hướng dẫn dự án cuối khóa', 'Chữa bài và nhận xét', 'Tổng kết và lộ trình tiếp theo']],
]

export const palette = ['#1fa855', '#e5293f', '#2f6fed', '#f29d1b', '#6a3de8', '#0aa3a3', '#d94f9c', '#4a5568']

// [tiêu đề, giảng viên, chủ đề, điểm, số đánh giá, giá, giá gốc, emoji]
export const courses = {
  sale: [
    ['Quản lý thời gian trọng yếu: Ưu tiên và hoàn thành công việc', 'Trần Minh Khoa', 'people', 4.86, 36, 0, 299000, '⏱️'],
    ['Giao tiếp chuyên nghiệp: Tạo ảnh hưởng và niềm tin', 'Lê Thu Hà', 'people', 4.47, 15, 299000, 1990000, '🗣️'],
    ['Cẩm nang đầu tư chứng khoán từ A đến Z', 'Nguyễn Tâm', 'finance', 5, 12, 99000, 1000000, '📈'],
    ['Nắm bắt tâm lý khách hàng trong bán hàng', 'Phạm Quốc Thắng', 'sales', 4.9, 22, 99000, 999000, '🧠'],
    ['Facebook Ads thực chiến cho người mới bắt đầu', 'Minh Dương', 'marketing', 4.7, 58, 199000, 899000, '📣'],
    ['Quy trình vận hành chuẩn SOP cho SME', 'Đỗ Hoàng Long', 'ops', 4.8, 41, 249000, 799000, '⚙️'],
    ['Xây dựng văn hóa doanh nghiệp bền vững', 'Vũ Thanh Mai', 'brand', 4.75, 19, 199000, 699000, '🏷️'],
    ['Phân tích dữ liệu với Power BI cơ bản', 'Hoàng Đức Anh', 'tech', 4.88, 77, 149000, 799000, '📊'],
  ],
  popular: [
    ['Thủ thuật Excel cập nhật hàng tuần cho dân văn phòng', 'NX Learning', 'tech', 4.81, 101, 249000, 499000, '📗'],
    ['Ebook: 10 kỹ thuật Excel mà đại học không dạy bạn', 'NX Learning', 'tech', 4.88, 8, 49000, 99000, '📘'],
    ['Excel online từ cơ bản đến nâng cao', 'NX Learning', 'tech', 4.86, 187, 499000, 799000, '📊'],
    ['Kế toán giá thành theo phương pháp giản đơn', 'Nông Thị Huệ', 'finance', 4.75, 36, 299000, 399000, '🧾'],
    ['Kế toán tổng hợp: Từ kỹ năng đến năng lực', 'Nông Thị Huệ', 'finance', 4.75, 212, 599000, 999000, '💼'],
    ['Tự động hóa Excel với lập trình VBA', 'NX Learning', 'tech', 4.88, 96, 499000, 799000, '🧩'],
    ['PowerPoint: Chinh phục mọi ánh nhìn trong 9 bước', 'NX Learning', 'marketing', 4.86, 133, 499000, 799000, '🎞️'],
    ['Nhập môn Excel cho người mới', 'NX Learning', 'tech', 4.85, 94, 49000, 499000, '🟩'],
  ],
  new: [
    ['Copilot bảo mật trong doanh nghiệp', 'Lương Thanh', 'tech', 0, 0, 549000, 599000, '🛡️'],
    ['Ứng dụng AI tối ưu công việc xuất nhập khẩu', 'Lâm Quốc Vệ', 'ops', 0, 0, 299000, 399000, '🚢'],
    ['Nghiệp vụ nhân sự thực chiến A–Z', 'Tạ Văn Bình', 'people', 0, 0, 599000, 898500, '👥'],
    ['Claude AI toàn diện cho người làm văn phòng', 'Nguyễn Hữu Đạt', 'tech', 0, 0, 799000, 0, '✨'],
    ['Gemini nhập môn dành cho doanh nghiệp', 'Lương Thanh', 'tech', 5, 5, 0, 0, '💎'],
    ['Ứng dụng KPIs nâng cao hiệu suất tổ chức', 'Nguyễn Xuân Bách', 'ops', 0, 0, 499000, 599000, '🎯'],
    ['Affiliate Marketing Foundation', 'Đinh Thu Trang', 'marketing', 0, 0, 99000, 499000, '🔗'],
    ['Logistics thực hành – Từ chứng từ đến vận hành', 'Thái Hồng Ngọc', 'ops', 0, 0, 799000, 0, '📦'],
  ],
}

export const learningPaths = [
  // Giá lộ trình = tổng giá các khóa bên trong, giảm discountPercent
  { id: 'ke-toan', title: 'Chuyên viên kế toán toàn diện', courseIds: [12, 13, 3, 9, 11, 14], discountPercent: 25, courses: 18, learners: 1588, price: 11327000, oldPrice: 12584000, color: '#1fa855',
    desc: 'Toàn bộ kiến thức kế toán tài chính mà kế toán viên cần trang bị, thực hành trên Excel và phần mềm kế toán, cập nhật chính sách thuế hàng tuần.' },
  { id: 'phan-tich-du-lieu', title: 'Chuyên viên phân tích dữ liệu toàn diện', courseIds: [16, 11, 8, 14, 9], discountPercent: 30, courses: 17, learners: 957, price: 3717000, oldPrice: 20514000, color: '#2f6fed',
    desc: 'Từ Excel, VBA đến Power BI: thu thập, làm sạch, phân tích và trực quan hóa dữ liệu để ra quyết định kinh doanh.' },
  { id: 'tin-hoc-van-phong', title: 'Kỹ năng tin học văn phòng toàn diện', courseIds: [16, 11, 15, 9, 10], discountPercent: 20, courses: 8, learners: 684, price: 1698000, oldPrice: 5192000, color: '#f29d1b',
    desc: 'Thành thạo Excel, PowerPoint và các thủ thuật văn phòng giúp tăng năng suất làm việc mỗi ngày.' },
  { id: 'ky-su-xay-dung', title: 'Kỹ sư xây dựng', courseIds: [11, 14, 6, 1], discountPercent: 15, courses: 6, learners: 442, price: 2498000, oldPrice: 7094000, color: '#e5293f',
    desc: 'Bộ kỹ năng bổ trợ cho kỹ sư: bóc tách khối lượng bằng Excel, tự động hóa với VBA, quản lý dự án và thời gian.' },
]

export const plans = [
  { name: 'Hội viên Cơ bản', price: 990000, period: 'năm', color: '#2f6fed', hot: false,
    perks: ['Truy cập 300+ khóa học kỹ năng', 'Học trên mọi thiết bị', 'Chứng nhận hoàn thành'] },
  { name: 'Hội viên Pro', price: 1990000, period: 'năm', color: '#e5293f', hot: true,
    perks: ['Truy cập toàn bộ 1.200+ khóa học', 'Khóa học mới cập nhật hằng tháng', 'Hỏi đáp trực tiếp với giảng viên', 'Ưu đãi 30% lộ trình chuyên sâu'] },
  { name: 'Doanh nghiệp', price: 0, period: 'liên hệ', color: '#1c1f26', hot: false,
    perks: ['LMS riêng cho doanh nghiệp', 'Báo cáo tiến độ học tập nhân sự', 'Khóa học nội bộ theo yêu cầu', 'Tư vấn lộ trình đào tạo'] },
]

export const coupons = [
  { code: 'NHUTX10', percent: 10 },
  { code: 'HOCVUI20', percent: 20 },
]

// Mã kích hoạt mẫu (12 ký tự) để thử chức năng "Kích hoạt"
export const activationCodes = [
  { code: 'NHUTX2026001', courseId: 11 },
  { code: 'NHUTX2026002', courseId: 14 },
  { code: 'NHUTX2026003', courseId: 20 },
]

export const pages = {
  lms: { title: 'Tạo LMS doanh nghiệp miễn phí', icon: '🔥', form: 'business',
    intro: 'Xây dựng hệ thống đào tạo nội bộ (LMS) cho doanh nghiệp chỉ trong 5 phút, hoàn toàn miễn phí.',
    sections: [
      { h: 'Tải lên khóa học nội bộ', p: 'Đưa video, tài liệu, bài kiểm tra của doanh nghiệp lên một nơi duy nhất.' },
      { h: 'Giao khóa học cho nhân sự', p: 'Phân lộ trình theo phòng ban, vị trí và theo dõi tiến độ theo thời gian thực.' },
      { h: 'Báo cáo hiệu quả đào tạo', p: 'Thống kê tỷ lệ hoàn thành, điểm kiểm tra và mức độ tham gia của từng nhân viên.' },
    ] },
  'doanh-nghiep': { title: 'NhutX for Business', icon: '🏢', form: 'business',
    intro: 'Nền tảng kiến tạo tổ chức học tập theo đuổi hiệu suất cao, đã đồng hành cùng 3.444 doanh nghiệp.',
    sections: [
      { h: 'Thư viện khóa học sẵn có', p: 'Hơn 1.200 khóa học kỹ năng mềm, chuyên môn và công nghệ dành cho người đi làm.' },
      { h: 'Đào tạo theo yêu cầu', p: 'Thiết kế chương trình riêng phù hợp mục tiêu chiến lược của doanh nghiệp.' },
      { h: 'Đo lường hiệu quả', p: 'Bảng điều khiển giúp phòng nhân sự theo dõi năng lực đội ngũ.' },
    ] },
  'giang-vien': { title: 'Trở thành giảng viên NhutX', icon: '👩‍🏫', form: 'teacher',
    intro: 'Lan tỏa tri thức, chia sẻ kinh nghiệm và tạo thu nhập bền vững cùng hơn 700.000 học viên.',
    sections: [
      { h: '1. Đăng ký hồ sơ', p: 'Gửi thông tin chuyên môn và ý tưởng khóa học của bạn.' },
      { h: '2. Xây dựng khóa học', p: 'Đội ngũ sản xuất hỗ trợ kịch bản, quay dựng và thiết kế bài giảng.' },
      { h: '3. Xuất bản và nhận doanh thu', p: 'Khóa học được quảng bá trên toàn hệ thống, chia sẻ doanh thu minh bạch hằng tháng.' },
    ] },
  'kich-hoat': { title: 'Kích hoạt khóa học', icon: '🔑', form: 'activate',
    intro: 'Nhập mã kích hoạt in trên thẻ hoặc được gửi qua email để mở khóa khóa học.',
    sections: [
      { h: 'Mã kích hoạt ở đâu?', p: 'Mã gồm 12 ký tự, có trên thẻ học hoặc trong email xác nhận đơn hàng.' },
      { h: 'Gặp sự cố?', p: 'Liên hệ hotline 1900 0000 hoặc email hotro@nhutxlearn.vn để được hỗ trợ.' },
    ] },
  'gioi-thieu': { title: 'Giới thiệu NhutX Learn', icon: '🏫',
    intro: 'NhutX Learn là nền tảng học kỹ năng ứng dụng dành cho người đi làm và doanh nghiệp Việt Nam.',
    sections: [
      { h: 'Sứ mệnh', p: 'Chuyển hóa tri thức thành sức mạnh cá nhân, hiệu suất tổ chức và sức bật quốc gia.' },
      { h: 'Con số', p: '709.075 học viên, 3.444 doanh nghiệp, hơn 1.200 khóa học và 300 giảng viên chuyên gia.' },
    ] },
  'tuyen-dung': { title: 'Tuyển dụng', icon: '💼', form: 'contact',
    intro: 'Gia nhập đội ngũ trẻ, năng động để cùng xây dựng nền tảng học tập hàng đầu.',
    sections: [
      { h: 'Chuyên viên sản xuất nội dung', p: 'Toàn thời gian · TP. Hồ Chí Minh · 12–18 triệu' },
      { h: 'Frontend Developer (React)', p: 'Toàn thời gian · Hybrid · Thỏa thuận' },
      { h: 'Chuyên viên tư vấn doanh nghiệp', p: 'Toàn thời gian · Hà Nội · Lương + hoa hồng' },
    ] },
  blog: { title: 'Blog kiến thức', icon: '📰',
    intro: 'Bài viết, thủ thuật và kinh nghiệm thực tế được cập nhật mỗi tuần.',
    sections: [
      { h: '10 hàm Excel dân văn phòng nhất định phải biết', p: 'VLOOKUP, XLOOKUP, SUMIFS, FILTER… kèm ví dụ dễ hiểu.' },
      { h: 'Cách viết prompt hiệu quả cho ChatGPT và Claude', p: 'Công thức 5 bước giúp AI trả lời đúng ý bạn.' },
      { h: 'Quản lý thời gian bằng ma trận Eisenhower', p: 'Phân loại việc gấp – quan trọng để làm đúng việc.' },
    ] },
  faq: { title: 'Câu hỏi thường gặp', icon: '❓',
    intro: 'Giải đáp những thắc mắc phổ biến khi học tại NhutX Learn.',
    sections: [
      { h: 'Mua khóa học một lần có được học mãi không?', p: 'Có. Bạn được truy cập trọn đời và nhận các bản cập nhật miễn phí.' },
      { h: 'Tôi có thể học trên điện thoại không?', p: 'Có, trang web hiển thị tốt trên mọi thiết bị.' },
      { h: 'Có được cấp chứng nhận không?', p: 'Bạn nhận chứng nhận hoàn thành sau khi học xong và đạt bài kiểm tra cuối khóa.' },
    ] },
  'thanh-toan': { title: 'Hướng dẫn thanh toán', icon: '💳',
    intro: 'Hỗ trợ nhiều hình thức thanh toán an toàn và tiện lợi.',
    sections: [
      { h: 'Chuyển khoản ngân hàng', p: 'Quét mã QR tại bước thanh toán, khóa học được kích hoạt tự động.' },
      { h: 'Ví điện tử', p: 'Hỗ trợ các ví điện tử phổ biến tại Việt Nam.' },
      { h: 'Thẻ quốc tế', p: 'Visa, Mastercard, JCB.' },
    ] },
  'hoan-tien': { title: 'Chính sách hoàn tiền', icon: '↩️',
    intro: 'Hoàn tiền 100% trong 365 ngày nếu bạn không hài lòng về khóa học hoặc dịch vụ.',
    sections: [
      { h: 'Điều kiện', p: 'Gửi yêu cầu kèm lý do qua email hỗ trợ trong vòng 365 ngày kể từ ngày mua.' },
      { h: 'Thời gian xử lý', p: 'Tiền được hoàn trong 3–7 ngày làm việc.' },
    ] },
  'dieu-khoan': { title: 'Điều khoản sử dụng', icon: '📄',
    intro: 'Khi sử dụng NhutX Learn, bạn đồng ý với các điều khoản dưới đây.',
    sections: [
      { h: 'Tài khoản', p: 'Mỗi tài khoản dành cho một cá nhân, không chia sẻ cho người khác.' },
      { h: 'Bản quyền', p: 'Nội dung khóa học thuộc bản quyền của giảng viên và NhutX Learn.' },
    ] },
  'tiep-thi-lien-ket': { title: 'Tiếp thị liên kết', icon: '🔗', form: 'contact',
    intro: 'Giới thiệu khóa học và nhận hoa hồng lên đến 40% cho mỗi đơn hàng thành công.',
    sections: [
      { h: 'Đăng ký miễn phí', p: 'Nhận đường link giới thiệu riêng ngay sau khi đăng ký.' },
      { h: 'Thanh toán hằng tháng', p: 'Hoa hồng được đối soát và chuyển khoản vào ngày 15 hằng tháng.' },
    ] },
  'lien-he': { title: 'Liên hệ', icon: '📞', form: 'contact',
    intro: 'Chúng tôi luôn sẵn sàng hỗ trợ bạn.',
    sections: [
      { h: 'Hotline', p: '1900 0000 (8:00 – 21:00 mỗi ngày)' },
      { h: 'Email', p: 'hotro@nhutxlearn.vn' },
      { h: 'Địa chỉ', p: 'TP. Hồ Chí Minh' },
    ] },
}
