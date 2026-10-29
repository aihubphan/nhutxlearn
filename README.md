# NhutX Learn

Website học trực tuyến: giao diện React (Vite) + API Node.js (Express) + cơ sở dữ liệu SQLite có sẵn trong Node.

## Chạy khi phát triển

```bash
npm install
npm run dev
```

- Giao diện: http://localhost:5173
- API: http://localhost:4000 (Vite tự chuyển các request `/api` sang đây)
- Lần chạy đầu, server tự tạo database `server/data/app.db` và nạp dữ liệu mẫu.
  Muốn làm lại từ đầu: tắt server, xóa thư mục `server/data`, chạy lại.

Yêu cầu Node.js 22.13 trở lên (dùng module `node:sqlite`).

## Thanh toán VNPay

Luồng mua hàng:

1. Khách bấm **Thanh toán qua VNPay**. Server tạo đơn ở trạng thái `pending` (chưa mở khóa học) và chuyển khách sang VNPay.
2. Khách thanh toán xong, VNPay gọi **IPN** (`/api/payments/vnpay/ipn`) và chuyển trình duyệt về **Return URL** (`/api/payments/vnpay/return`).
3. Server kiểm tra **chữ ký HMAC-SHA512**, **số tiền** và **mã giao dịch**; mỗi giao dịch chỉ xử lý một lần. Hợp lệ thì đơn chuyển sang `paid` và khóa học được mở.
4. Thanh toán thất bại hoặc khách hủy trên VNPay: đơn vẫn `pending`. Khách có thể **thanh toán lại** hoặc **hủy đơn** ở trang kết quả / lịch sử đơn hàng.

Hoàn tiền trong trang quản trị gọi **API hoàn tiền của VNPay** (toàn phần `02` / một phần `03`). VNPay xác nhận thì hệ thống mới ghi nhận và thu hồi khóa học.

### Ba chế độ

| Chế độ | Khi nào | Hành vi |
|---|---|---|
| VNPay thật | Đã đặt `VNPAY_TMN_CODE` + `VNPAY_HASH_SECRET` | Chuyển sang VNPay (mặc định sandbox) |
| Giả lập | `npm run dev` mà chưa có thông tin VNPay | Trang **VNPay giả lập** nội bộ để thử thành công / thất bại / hủy, ký bằng khóa thử |
| Tắt | `npm start` mà chưa có thông tin VNPay | Đơn có phí bị từ chối (503), đơn 0đ vẫn hoạt động |

### Cài đặt VNPay sandbox

1. Đăng ký tại https://sandbox.vnpayment.vn/devreg/ để nhận `TmnCode` và `HashSecret` qua email.
2. Điền `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `PUBLIC_URL` vào `.env`.
3. Trên trang quản lý merchant của VNPay, khai báo **IPN URL**: `PUBLIC_URL/api/payments/vnpay/ipn`.
   IPN cần địa chỉ public. Khi thử trên máy cá nhân, IPN không gọi tới được localhost; Return URL vẫn xử lý đầy đủ kết quả, nên vẫn thử được.
4. Thẻ test của sandbox có trong email / tài liệu VNPay gửi kèm.
5. Khi chạy thật: ký hợp đồng với VNPay, đổi `VNPAY_TMN_CODE` / `VNPAY_HASH_SECRET` sang thông tin production, và đặt `VNPAY_URL`, `VNPAY_API_URL` theo URL production VNPay cung cấp.

Logic nằm trong [server/vnpay.js](server/vnpay.js) (ký, kiểm tra chữ ký, gọi API hoàn tiền) và [server/orders.js](server/orders.js) (tạo đơn, xác nhận thanh toán, hoàn tiền).

## Học trực tuyến

- Quản trị viên tải video cho từng bài trong trình soạn khóa học (MP4 / WebM / MOV, tối đa `MAX_VIDEO_MB`, mặc định 2048 MB). Video được gửi thẳng trong thân request (`POST /api/admin/lessons/:id/video`), ghi ra file tạm rồi đổi tên, nên không bị giới hạn bởi bộ nhớ.
- Video lưu ở `UPLOAD_DIR/videos` (mặc định `server/data/uploads/videos`), **không** có đường dẫn công khai. Trình phát xin một đường dẫn có chữ ký HMAC, hết hạn sau 6 giờ (`POST /api/lessons/:id/play`), và chỉ được cấp cho người đã mua khóa, quản trị viên, hoặc bài học thử. Có hỗ trợ tua (HTTP Range).
- Tiến độ (vị trí đang xem, bài đã xong) lưu ở bảng `lesson_progress`. Lưu khóa học trong trang quản trị sẽ cập nhật bài học theo id, nên không làm mất video hay tiến độ.
- Hoàn tiền một khóa sẽ xóa quyền học, nên học viên mất quyền xem video ngay.
- **Sao lưu**: cần sao lưu cả `server/data/app.db` lẫn thư mục `server/data/uploads` (video và ảnh).
- Chạy sau Nginx: tăng `client_max_body_size` (ví dụ `2g`) và `proxy_request_buffering off` cho `/api/admin/lessons/`, nếu không Nginx sẽ chặn video lớn.

Logic nằm trong [server/learning.js](server/learning.js); trang học là [src/pages/Learn.jsx](src/pages/Learn.jsx).

## Thư viện ảnh

Ảnh bìa khóa học chọn từ **thư viện ảnh** trong trình soạn khóa học (JPG / PNG / WebP / GIF, tối đa `MAX_IMAGE_MB`, mặc định 5 MB). Loại ảnh được nhận diện từ nội dung file, không tin đuôi file. Ảnh lưu ở `UPLOAD_DIR/images` và phát công khai qua `/api/images/<tên ngẫu nhiên>`, được lưu đệm lâu dài. Ảnh đang dùng cho khóa học thì không xóa được.

Số khóa của mỗi chủ đề trên trang chủ được đếm trực tiếp từ các khóa đang hiển thị, nên tự cập nhật khi thêm, ẩn hoặc xóa khóa học.

## Lộ trình

Giá lộ trình không lưu cố định: bằng tổng giá các khóa đang bán trong lộ trình, giảm `paths.discount_percent`. Khách đã có sẵn khóa nào thì không phải trả phần của khóa đó. Mua lộ trình qua `POST /api/orders` với `{ pathId }`, không cộng thêm mã giảm giá.

## Trang quản trị

Mở http://localhost:5173/#/admin (hoặc bấm **⚙️ Quản trị** trên thanh menu sau khi đăng nhập bằng tài khoản quản trị).

- **Chỉ khi phát triển** (`npm run dev`), nếu chưa đặt `ADMIN_EMAIL` / `ADMIN_PASSWORD`, server tự tạo tài khoản quản trị mặc định:
  `admin@nhutx.local` / `admin123`. Tài khoản này **không bao giờ** được tạo khi chạy `npm start`.
- **Khi chạy production** bắt buộc đặt `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `.env`.
  Nếu email đó đã có tài khoản, server chỉ cấp quyền quản trị khi mật khẩu trùng khớp.
- Quản trị viên có thể cấp / bỏ quyền quản trị cho người khác ở mục **Người dùng**.

Các mục quản trị:

| Mục | Chức năng |
|---|---|
| Tổng quan | Doanh thu, số đơn, người dùng, biểu đồ 14 ngày, khóa bán chạy, đơn gần đây |
| Khóa học | Thêm / sửa (thông tin, giá, giáo trình, kết quả học tập), ẩn / hiện, xóa |
| Đơn hàng | Danh sách đơn, tìm theo khách hàng / khóa học |
| Người dùng | Danh sách, số khóa học, số tiền đã chi, cấp quyền quản trị |
| Liên hệ & bản tin | Form liên hệ / doanh nghiệp / giảng viên, đánh dấu trạng thái; danh sách email bản tin |
| Mã giảm giá | Tạo, bật / tắt, đổi % giảm, xóa |
| Mã kích hoạt | Tạo hàng loạt mã cho một khóa học, xem mã đã dùng |

Khóa học đã có đơn hàng hoặc học viên thì không xóa được, chỉ có thể **ẩn** để giữ lịch sử mua hàng.

### Hoàn tiền & hủy đơn

- **Khách hàng** gửi yêu cầu hoàn tiền ở trang *Khóa học của tôi → Lịch sử đơn hàng* (trong 365 ngày, mỗi lần một yêu cầu).
- **Quản trị viên** mở *Đơn hàng → Chi tiết* để:
  - **Hoàn tiền** một hoặc nhiều khóa trong đơn. Số tiền hoàn là phần khách thực trả cho khóa đó, đã chia đều mã giảm giá theo tỷ lệ giá.
  - **Hủy đơn**: hoàn toàn bộ, dùng khi thanh toán lỗi hoặc đơn gian lận. Chỉ áp dụng cho đơn chưa hoàn tiền phần nào.
  - **Từ chối yêu cầu** hoàn tiền của khách, kèm lý do (khách sẽ thấy).
- Mọi thao tác đều bắt buộc nhập lý do và được ghi vào **lịch sử đơn hàng** (ai làm, lúc nào, bao nhiêu tiền).
- Khóa được hoàn sẽ bị thu hồi quyền học. Khách có thể mua lại sau này.
- Doanh thu trên trang Tổng quan là **doanh thu thực** = đã thu − đã hoàn.

Trạng thái đơn: `pending` (chờ thanh toán) → `paid` (đã thanh toán) → `partially_refunded` (hoàn một phần) → `refunded` (hoàn toàn bộ), hoặc `cancelled` (đã hủy).
Đơn thanh toán qua VNPay được hoàn tiền thật qua API của VNPay (xem mục Thanh toán VNPay).

## Triển khai (đưa lên mạng)

Trang gồm hai phần: **giao diện** (file tĩnh trong `dist/`) và **máy chủ API** (Express + SQLite + thư mục video/ảnh). Máy chủ API cần chạy liên tục và cần **ổ đĩa lưu lâu dài**.

> **Vì sao deploy lên Vercel báo "Lỗi máy chủ (404)"?** Vercel chỉ đăng phần giao diện; máy chủ API không chạy trên đó, nên mọi lời gọi `/api/...` nhận trang 404 của Vercel. API này cũng không chạy được dạng serverless của Vercel: Vercel không có ổ đĩa lâu dài cho SQLite / video, và giới hạn mỗi request khoảng 4,5 MB (không tải được video).

### Cách 1 (khuyên dùng): cả trang trên một máy chủ

Render (Web Service + Persistent Disk), Railway (có Volume), Fly.io, hoặc VPS bất kỳ có Node ≥ 22.13:

- Build: `npm install && npm run build` · Start: `npm start`
- Gắn ổ đĩa (VD `/var/data`) và đặt `DB_FILE=/var/data/app.db` (video, ảnh tự lưu ở `/var/data/uploads`)
- Đặt các biến trong `.env.example`: `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PUBLIC_URL` (địa chỉ trang), VNPay, `TRUST_PROXY=1`
- Không cần `VITE_API_URL`, `ALLOWED_ORIGINS`, `FRONTEND_URL`

### Cách 2: giao diện trên Vercel, API ở nơi khác

1. Triển khai API như Cách 1 (VD `https://api-nhutx.onrender.com`), thêm:
   - `ALLOWED_ORIGINS=https://ten-du-an.vercel.app` (địa chỉ Vercel, nhiều địa chỉ cách nhau dấu phẩy)
   - `FRONTEND_URL=https://ten-du-an.vercel.app` (để VNPay đưa khách về giao diện)
   - `PUBLIC_URL=https://api-nhutx.onrender.com` (địa chỉ API, dùng cho VNPay)
2. Trên Vercel → Project → Settings → **Environment Variables**: `VITE_API_URL=https://api-nhutx.onrender.com`, rồi **Redeploy** (biến này được gắn vào lúc build).
3. `vercel.json` đã có sẵn trong dự án (build Vite, thư mục `dist`).

Giao diện tải ảnh và video thẳng từ API, không đi vòng qua Vercel, nên không bị giới hạn dung lượng của Vercel.

## Chạy production

```bash
npm run build
npm start
```

Server Express phục vụ cả API lẫn bản build trong `dist/` tại cổng `API_PORT` (mặc định 4000).

Server **mặc định chạy ở chế độ production**. Chế độ phát triển chỉ bật khi có cờ `--dev`, và `npm run dev` đã tự thêm cờ này.
Trước khi chạy `npm start`, sao chép `.env.example` thành `.env` rồi điền:

- `JWT_SECRET`: chuỗi ngẫu nhiên ≥ 32 ký tự. Thiếu thì server từ chối khởi động.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: tài khoản quản trị, mật khẩu ≥ 10 ký tự.
- `TRUST_PROXY=1` nếu chạy sau Nginx / Cloudflare.

### Bảo mật đã có

- Chế độ production không tạo tài khoản quản trị mặc định, không có khóa JWT mặc định, không nạp mã giảm giá / mã kích hoạt mẫu. Nếu database từng chạy dev, các mã mẫu sẽ tự bị vô hiệu.
- Chỉ cấp quyền quản trị cho email trong `ADMIN_EMAIL` khi mật khẩu trùng khớp, nên người đăng ký trước email đó không chiếm được quyền.
- Giới hạn tần suất theo IP: đăng nhập sai 10 lần / 15 phút, đăng ký 5 / giờ, mã giảm giá 20 / 15 phút, kích hoạt sai 10 / 15 phút, mỗi loại form 5 / giờ, toàn bộ API 300 / phút.
- Header bảo mật qua `helmet`: CSP, chống nhúng iframe, HSTS, `nosniff`.
- Mật khẩu băm bằng scrypt. Truy vấn SQL đều dùng tham số. Giá luôn được server tính lại. Quyền quản trị được kiểm tra từ database ở mỗi request.

### Chưa có — cần làm trước khi bán thật

- Điền thông tin VNPay production (xem mục Thanh toán VNPay) và thử một giao dịch thật trên sandbox.
- Đổi mật khẩu / quên mật khẩu, thu hồi token khi đăng xuất.
- Chạy HTTPS (đặt sau Nginx / Cloudflare), sao lưu file database định kỳ.

## Cấu trúc

```
server/
  index.js       Các route API công khai
  admin.js       Các route API quản trị
  orders.js      Nghiệp vụ đơn hàng: tạo đơn, xác nhận thanh toán, hoàn tiền
  learning.js    Trang học: video có bảo vệ, tiến độ, tải video lên
  media.js       Thư viện ảnh: tải lên, phát ảnh, xóa
  vnpay.js       Cổng thanh toán VNPay: ký, kiểm tra chữ ký, API hoàn tiền
  db.js          Tạo bảng + nạp dữ liệu mẫu
  auth.js        Băm mật khẩu (scrypt), JWT, middleware đăng nhập
  seed-data.js   Dữ liệu mẫu: khóa học, lộ trình, trang thông tin, mã giảm giá...
src/
  api.js         Hàm gọi API + hook useApi
  pages/         Mỗi trang một file
  admin/         Trang quản trị
  components/    Thành phần giao diện dùng chung
```

## API

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/topics` | Danh sách chủ đề |
| GET | `/api/home` | Dữ liệu trang chủ |
| GET | `/api/courses?topic=&collection=&price=&q=&sort=` | Tìm / lọc khóa học |
| GET | `/api/courses/:id` | Chi tiết khóa học + giáo trình |
| GET | `/api/paths/:id` | Chi tiết lộ trình |
| GET | `/api/plans` | Gói hội viên |
| GET | `/api/pages/:slug` | Trang thông tin |
| POST | `/api/auth/register`, `/api/auth/login` | Đăng ký / đăng nhập, trả về JWT |
| GET | `/api/auth/me` 🔒 | Thông tin tài khoản |
| GET | `/api/me/courses`, `/api/me/orders` 🔒 | Khóa học đã sở hữu, lịch sử đơn |
| POST | `/api/coupons/validate` | Kiểm tra mã giảm giá |
| POST | `/api/orders` 🔒 | Tạo đơn hàng (giá tính lại ở server) |
| POST | `/api/me/orders/:id/refund-request` 🔒 | Khách gửi yêu cầu hoàn tiền |
| POST | `/api/me/orders/:id/pay`, `/cancel` 🔒 | Thanh toán lại / hủy đơn đang chờ thanh toán |
| GET | `/api/learn/:courseId` | Giáo trình + tiến độ cho trang học (bài bị khóa không kèm nội dung) |
| POST | `/api/lessons/:id/play` | Cấp đường dẫn video có chữ ký (người đã mua / bài học thử) |
| GET | `/api/media/:token` | Phát video (hỗ trợ Range) |
| POST | `/api/lessons/:id/progress` 🔒 | Lưu vị trí xem / đánh dấu đã học xong |
| GET | `/api/payments/vnpay/ipn`, `/return` | VNPay gọi về sau khi khách thanh toán |
| POST | `/api/courses/:id/enroll` 🔒 | Ghi danh khóa miễn phí |
| POST | `/api/activate` 🔒 | Kích hoạt bằng mã |
| POST | `/api/leads`, `/api/newsletter` | Form liên hệ, đăng ký bản tin |

🔒 = cần header `Authorization: Bearer <token>`.

API quản trị nằm dưới `/api/admin/*` (stats, courses, orders, users, leads, newsletter, coupons, activation-codes) và yêu cầu tài khoản có vai trò `admin` — xem [server/admin.js](server/admin.js).

## Dữ liệu thử (chỉ có khi chạy `npm run dev`)

- Mã giảm giá: `NHUTX10` (-10%), `HOCVUI20` (-20%)
- Mã kích hoạt: `NHUTX2026001`, `NHUTX2026002`, `NHUTX2026003`

## Chưa có

- Đối soát tự động với VNPay (API `querydr`) cho các giao dịch mà IPN không đến.
- Gửi email (xác nhận đơn, quên mật khẩu).
- Test tự động.
