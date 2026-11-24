# PETLOXTUS — EmDash CMS Website (`petloxtus.com`)

Trang web chính thức của **Petloxtus Co., Ltd** được chuyển đổi hoàn toàn từ WordPress sang nền tảng **EmDash CMS (Astro + Cloudflare Workers + D1 + R2)** với bố cục B2B xuất khẩu chuẩn chỉnh theo phong cách `delamcoffee.com` và bảng màu hài hòa theo logo Petloxtus (Cam đất Terracotta `#DF7A27`, Đen than `#161412`, Kem yến mạch tự nhiên `#F7F2EA`).

---

## Tính năng & Nội dung đã chuyển đổi

- **Toàn bộ 71 sản phẩm thật từ `petloxtus.com`** thuộc đầy đủ **9 danh mục** (`Wood`, `Cat Tree`, `Bed`, `Clothing`, `Metal Cage`, `Silicone`, `Toys`, `Reed And Water Hyacinth`, `Plastic`), đã tối ưu toàn bộ ảnh thành định dạng WebP lưu trực tiếp trong repo (không bị lỗi ảnh khi tắt WordPress cũ).
- **Quản trị động qua EmDash CMS (`/_emdash/admin`)**: Thêm/sửa/ẩn sản phẩm, tải ảnh mới lên Cloudflare R2, viết bài blog/tin tức (`/posts`), chỉnh sửa trang chính sách (`/privacy-policy`, `/terms-of-service`).
- **Cổng B2B Lead Gate + Form Yêu Cầu Báo Giá (không hiển thị giá bán lẻ)** tích hợp Webhook (`PUBLIC_LEAD_WEBHOOK_URL` cho Make.com / Zapier / n8n / Google Sheets).
- **Hỗ trợ 7 ngôn ngữ**: English, Tiếng Việt, 中文, 日本語, 한국어, Deutsch, Français.
- **Giữ nguyên 100% nội dung gốc**: Giới thiệu nhà máy 2.000 m², 50 công nhân + đội sourcing 20 người, chứng nhận (BSCI, IEPT, CVS, Walmart FCCA & SCS, Sedex, FSC, ISO9001, GSV), 6 dịch vụ OEM/ODM, quy trình sản xuất 6 bước, 10 câu hỏi thường gặp (FAQs), Chính sách bảo mật, Điều khoản dịch vụ và nút WhatsApp (`+84 977-654-455`).
- **Tự động chuyển hướng link WordPress cũ**: `/about-us`, `/faqs`, `/product`, `/blog` đều có redirect 301 giúp giữ nguyên SEO.

---

## Cách vận hành trên NHIỀU MÁY TÍNH (giống `delamcoffee.com`)

Kiến trúc EmDash + Cloudflare + GitHub cho phép bạn và đội ngũ vận hành linh hoạt trên mọi máy tính / điện thoại mà không bị phụ thuộc vào 1 máy cố định:

### 1. Quản lý nội dung (Sản phẩm, Bài viết, Hình ảnh) từ bất kỳ máy nào
- Sau khi deploy lên Cloudflare Workers, truy cập: **`https://petloxtus.com/_emdash/admin`**
- **Lần đầu tiên**: Hoàn tất thiết lập chủ sở hữu bằng Passkey (Touch ID / Face ID / Windows Hello / iCloud Keychain / Google Password Manager).
- **Dùng trên nhiều máy tính**:
  - Đăng nhập cùng tài khoản **iCloud Keychain** (Mac/iPhone) hoặc **Google Password Manager / 1Password** (Windows/Mac) để Passkey tự đồng bộ qua mọi máy, **HOẶC**
  - Trong `/_emdash/admin` → **Users**, tạo thêm tài khoản Editor/Admin cho từng máy tính hoặc từng nhân viên!
- Toàn bộ dữ liệu sản phẩm và ảnh nằm trên **Cloudflare D1 & R2**, sửa trên máy A là máy B và khách hàng thấy ngay lập tức.

### 2. Chỉnh sửa giao diện / mã nguồn từ nhiều máy tính (qua GitHub + Cloudflare)
Toàn bộ mã nguồn nằm trên GitHub repository `lamduong9/lamduong95`:

#### Cách A — Tự động Deploy qua Cloudflare Dashboard (Khuyên dùng)
1. Vào **Cloudflare Dashboard → Workers & Pages → Create → Import a repository**.
2. Chọn repository **`lamduong9/lamduong95`**.
3. Cấu hình:
   - Build command: `pnpm run build`
   - Deploy command: `npx wrangler deploy`
4. Vào **Settings → Variables and Secrets**, thêm:
   - `EMDASH_ENCRYPTION_KEY`: tạo ngẫu nhiên bằng lệnh `pnpm dlx emdash secrets generate`
   - `PUBLIC_LEAD_WEBHOOK_URL`: dán link Webhook Make.com / Zapier / n8n của bạn (để nhận data khách hàng từ Lead Gate và Form Báo Giá)
5. Gắn tên miền **`petloxtus.com`** và **`www.petloxtus.com`** trong mục **Domains & Routes**.
6. Từ đó về sau, trên bất kỳ máy tính nào bạn chỉ cần `git pull`, chỉnh sửa và `git push` — Cloudflare sẽ tự động build và cập nhật website!

#### Cách B — Deploy thủ công bằng lệnh từ bất kỳ máy tính nào
```bash
# Trên máy tính mới:
git clone https://github.com/lamduong9/lamduong95.git
cd lamduong95
pnpm install

# Đăng nhập Cloudflare (chỉ cần 1 lần trên mỗi máy)
npx wrangler login

# Chạy xem thử trên máy (http://localhost:4321)
pnpm dev

# Deploy lên Cloudflare Workers
pnpm run deploy
```

> Lưu ý: Ở lần deploy đầu tiên, Wrangler tự động tạo Cloudflare D1 database (`petloxtus-emdash`) và R2 bucket (`petloxtus-media`) theo cấu hình trong `wrangler.jsonc`. Khi bạn mở website lần đầu tiên, EmDash sẽ tự động nạp toàn bộ 71 sản phẩm, 3 bài viết mẫu và các trang chính sách từ `seed/seed.json` vào cơ sở dữ liệu D1.
