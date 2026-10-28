export default function Promo() {
  return (
    <section className="section container promos">
      <div className="promo promo-teacher">
        <div>
          <h2>NhutX Teacher – Nơi chuyên gia trở thành người truyền lửa</h2>
          <p>
            Lan tỏa tri thức, chia sẻ kỹ năng và kinh nghiệm quý báu đến người học. Biến giá trị bản thân thành nguồn
            cảm hứng và mở rộng tầm ảnh hưởng trong cộng đồng chuyên môn.
          </p>
          <a href="#/trang/giang-vien" className="btn-light">Trở thành giảng viên</a>
          <p className="small">Giảng dạy 709.075 học viên cùng NhutX Learn</p>
        </div>
        <div className="promo-art">👩‍🏫</div>
      </div>

      <div className="promo promo-business">
        <div>
          <h2>NhutX for Business – Kiến tạo tổ chức học tập hiệu suất cao</h2>
          <p>
            Giúp tổ chức của bạn phát triển đột phá, chinh phục các mục tiêu qua con đường đào tạo và phát triển đội ngũ.
          </p>
          <a href="#/trang/doanh-nghiep" className="btn-light">Đăng ký cho doanh nghiệp</a>
          <p className="small">3.444 doanh nghiệp đã đăng ký cho nhân sự của họ</p>
        </div>
        <div className="promo-art">🏢</div>
      </div>
    </section>
  )
}
