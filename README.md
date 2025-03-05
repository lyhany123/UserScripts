# Gemini AI Translator v4.1

![Version](https://img.shields.io/badge/version-4.1-blue)
![Status](https://img.shields.io/badge/status-updated-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 📑 Mục lục
- [Tính năng nổi bật](#tính-năng-mới-và-nổi-bật)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt & Sử dụng](#-cài-đặt--sử-dụng)
- [So sánh với v3.2](#-so-sánh-với-v32)
- [Thông số kỹ thuật](#-thông-số-kỹ-thuật)
- [Lưu ý quan trọng](#️-lưu-ý-quan-trọng)
- [Liên hệ & Đóng góp](#-liên-hệ--đóng-góp)

## ✨ Tính năng mới và nổi bật

### 🎮 Phương thức kích hoạt đa dạng

#### ⌨️ Phím  tắt
- Alt + F: Dịch toàn bộ trang
- Alt + Q: Dịch nhanh
- Alt + E: Dịch popup
- Alt + A: Dịch nâng cao
- Alt + S: Mở cài đặt

#### 🖱️ Nút dịch
- Nhấp đơn: Tùy chọn (mặc định: Dịch popup)
- Nhấp đúp: Tùy chọn (mặc định: Dịch nhanh)
- Giữ chuột: Tùy chọn (mặc định: Dịch nâng cao)

#### 📱 Cảm ứng đa điểm
- Hai ngón tay: Tùy chọn (mặc định: Dịch popup)
- Ba ngón tay: Tùy chọn (mặc định: Dịch nâng cao)
- Bốn ngón tay: Mở cài đặt giao diện người dùng
- Năm ngón tay: Bật/tắt Tools dịch (nút quản lý tất cả chế độ dịch)
- Độ nhạy có thể điều chỉnh (mặc định: 100ms)

#### 💻 Context Menu dịch:
   - Khi người dùng chuột phải vào một đoạn văn bản đã chọn, sẽ hiện ra menu ngữ cảnh để dịch.
   - Menu ngữ cảnh cung cấp 3 tùy chọn: Dịch nhanh, Dịch popup và Dịch nâng cao.
   - Khi chọn một tùy chọn, Translator sẽ thực hiện dịch đoạn văn bản đã chọn theo tùy chọn đó.


### 🌐 Dịch trang web nâng cao
- Tự động phát hiện ngôn ngữ của trang web và dịch toàn bộ nội dung sang tiếng Việt.
- Cho phép loại trừ các phần tử không cần dịch.
- Hiển thị nút dịch trang tạm thời.

### 🎵 Dịch Media (Audio/Video)
- Hỗ trợ dịch nội dung audio và video.
- Hỗ trợ nhiều định dạng phổ biến.
- Giới hạn kích thước file media tối đa.

### 📷 Dịch OCR Nâng cao
- Hỗ trợ nhiều định dạng ảnh phổ biến.
- Tự động chụp màn hình và dịch.
- Độ chính xác cao nhờ phân tích bố cục và xử lý thông minh.

### Dịch file PDF

### Dịch file HTML

### ⚙️ Quản lý Cài đặt Nâng Cao
- Giao diện cài đặt mới với Dark/Light mode.
- Hỗ trợ xuất/nhập cài đặt dạng JSON.
- Phân nhóm các tùy chỉnh theo chức năng.

### 🤖 Model AI Cải Tiến
- Hỗ trợ nhiều model Gemini khác nhau: Fast, Pro, Vision, Custom.
- Tùy chỉnh linh hoạt các thông số như Temperature, Top P, Top K.

### 🔍 Phím tắt và Tương tác
- Phím tắt để truy cập nhanh các tính năng thường dùng.
- Tùy chỉnh hành động của nút dịch (nhấp đơn, nhấp đúp, giữ).
- Hỗ trợ cảm ứng đa điểm trên thiết bị di động.

### 🔍 Tối ưu Hiệu Suất
- Sử dụng đa luồng API để xử lý nhiều yêu cầu đồng thời.
- Quản lý rate limit để tránh vượt quá giới hạn API.
- Hệ thống cache mạnh mẽ cho văn bản, ảnh và media.

## 💻 Yêu cầu hệ thống
- Trình duyệt: Chrome 80+, Firefox 72+, Edge 80+
- Extension: Violentmonkey/Tampermonkey
- API Key: Gemini/OpenAI
- RAM: 2GB+
- Ổ cứng trống: 500MB+

## 📥 Cài đặt & Sử dụng
1. Cài đặt Violentmonkey từ store trình duyệt
2. Cài đặt script: [Github](https://github.com/king1x32/UserScripts/raw/refs/heads/main/Gemini_AI_Translator_(Inline&Popup).user.js) or [Greasyfork](https://greasyfork.org/vi/scripts/529348-gemini-ai-translator-inline-popup?locale_override=1)
     Cài phiên bản mã hoá (nhẹ hơn, mượt hơn): [Github](https://raw.githubusercontent.com/king1x32/compiledUserscripts/release/release/Gemini20AI20Translator2028Inline2020Popup29.user.js)
3. Đăng ký và lấy API Key của Gemini
4. Cấu hình API Key trong phần cài đặt (Alt + S)
5. Khởi động lại trình duyệt

## 📊 Thông số kỹ thuật
| Tính năng | Thông số |
|-----------|----------|
| Cache Text | 100 entries/5m |
| Cache Image | 50 entries/30m |
| Cache Media | 50 entries/30m |
| Audio Limit | 100MB |
| Video Limit | 200MB |
| OCR Limit | 15MB |
| Rate Limit | 5 req/10s |

## ⚠️ Lưu ý quan trọng
- Backup cài đặt thường xuyên
- Không chia sẻ API key
- Cache tự động clear sau mỗi phiên
- Kiểm tra rate limit khi dịch nhiều
- Tối ưu cấu hình cho hiệu suất tốt nhất

## 📈 So sánh với v3.2

### ✨ Tính năng mới
- Hỗ trợ OpenAI API, cùng với Gemini API
- Quản lý API key linh hoạt, có thể thêm/xóa nhiều key, đa luồng xử lý
- Tính năng dịch trang web nâng cao
- Hỗ trợ dịch media (audio/video)
- Giao diện cài đặt mới với Dark/Light mode
- Tùy chỉnh model Gemini (Fast, Pro, Vision, Custom)
- Phím tắt và tương tác nâng cao (nút dịch, cảm ứng đa điểm)
- Tối ưu hóa hiệu suất và khả năng mở rộng

### 🔄 Cải tiến
- Giao diện cài đặt trực quan và dễ sử dụng hơn
- Tùy biến model AI linh hoạt hơn
- Tăng độ ổn định và xử lý lỗi tốt hơn
- Hệ thống cache mạnh mẽ hơn

## 📞 Liên hệ & Đóng góp
- 🐛 Báo lỗi: [Voz](https://voz.vn/t/script-dung-ai-%C4%91e-dich-moi-thu-text-anh-audio-video.1072947/) hoặc [GitHub Issues](https://github.com/king1x32/UserScripts/issues)
- 💡 Góp ý: [Voz](https://voz.vn/t/script-dung-ai-%C4%91e-dich-moi-thu-text-anh-audio-video.1072947/) hoặc [GitHub Discussions](https://github.com/king1x32/UserScripts/discussions)
- 📧 Email: nguyenhuuvuong12@mail.com
- 💬 Discord: [Join](https://discord.gg/CywqJTph)

---

> 💡 **Tip**: Sử dụng phím tắt để truy cập nhanh các tính năng thường dùng và tùy chỉnh cài đặt theo nhu cầu để có trải nghiệm tốt nhất.

Phiên bản 4.1 của Gemini AI Translator mang đến nhiều tính năng mới và cải tiến, như hỗ trợ OpenAI API, dịch trang web nâng cao, dịch media, giao diện cài đặt mới, tùy chỉnh model AI, phím tắt và tương tác nâng cao, cũng như tối ưu hóa hiệu suất. Đây là một bản nâng cấp đáng giá cho người dùng cần trải nghiệm dịch thuật toàn diện và hiệu quả.
