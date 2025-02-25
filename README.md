# Gemini AI Translator v3.2

![Version](https://img.shields.io/badge/version-3.2-blue)
![Status](https://img.shields.io/badge/status-stable-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 📑 Mục lục
- [Tính năng nổi bật](#tính-năng-mới-nổi-bật)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt & Sử dụng](#-cài-đặt--sử-dụng)
- [So sánh với v3.1](#-so-sánh-với-v31)
- [Thông số kỹ thuật](#-thông-số-kỹ-thuật)
- [Lưu ý quan trọng](#️-lưu-ý-quan-trọng)
- [Liên hệ & Đóng góp](#-liên-hệ--đóng-góp)

## ✨ Tính năng mới nổi bật

### 🎮 Phương thức kích hoạt đa dạng

#### ⌨️ Phím tắt
- Alt + T: Dịch nhanh
- Alt + Q: Dịch popup
- Alt + A: Dịch nâng cao
- Alt + S: Mở cài đặt

#### 🖱️ Nút dịch
- Nhấp đơn: Tùy chọn (mặc định: Dịch popup)
- Nhấp đúp: Tùy chọn (mặc định: Dịch nhanh)
- Giữ chuột: Tùy chọn (mặc định: Dịch nâng cao)

#### 📱 Cảm ứng đa điểm
- Hai ngón tay: Tùy chọn (mặc định: Dịch popup)
- Ba ngón tay: Tùy chọn (mặc định: Dịch nâng cao)
- Bốn ngón tay: Tùy chọn (mặc định: Dịch nhanh)
- Độ nhạy có thể điều chỉnh (mặc định: 100ms)

### 🎵 Dịch Media - Tính năng mới

#### 🔊 Audio Support
- Hỗ trợ định dạng: mp3, wav, ogg, m4a, aac, flac, wma, opus, amr, midi
- Giới hạn file: 100MB
- Chất lượng dịch tối ưu

#### 🎥 Video Support
- Định dạng: mp4, webm, ogg, avi, mov, wmv, flv, 3gp, mkv
- Giới hạn file: 200MB
- Phân tích ngữ cảnh thông minh

### 📷 OCR Nâng cao

#### 🖼️ Định dạng đa dạng
- Hỗ trợ: jpeg, png, webp, heic, heif
- Giới hạn: 15MB
- Độ chính xác cao

#### 🔍 Xử lý thông minh
- Tự động nhận diện text
- Phân tích bố cục
- Tối ưu kết quả

### ⚙️ Quản lý Cài đặt Nâng cao

#### 💾 Xuất/Nhập Cài đặt
- Xuất cài đặt dạng JSON
- Nhập cài đặt từ file

#### 🎨 Giao diện Cài đặt Mới
- Giao diện Dark/Light mode
- Phân nhóm chức năng:
  - Giao diện
  - API Provider (Gemini/OpenAI)
  - API Key
  - Phím tắt
  - Nút dịch
  - Cảm ứng đa điểm
  - Rate limit
  - Cache

### 🤖 Model AI cải tiến

#### 🧠 Gemini Models
- Fast: gemini-2.0-flash-lite/flash/flash-exp
- Pro: gemini-2.0-pro-exp-02-05/pro-exp
- Vision: gemini-2.0-flash-thinking-exp-01-21/exp
- Custom: Tùy chọn model

#### ⚡ Cấu hình linh hoạt
- Temperature: 0.2-1.0
- Top P: 0-1
- Top K: 1-100

## 💻 Yêu cầu hệ thống
- Trình duyệt: Chrome 80+, Firefox 72+, Edge 80+
- Extension: Violentmonkey/Tampermonkey
- API Key: Gemini/OpenAI
- RAM: 4GB+
- Ổ cứng trống: 500MB+

## 📥 Cài đặt & Sử dụng
1. Cài đặt Violentmonkey từ store trình duyệt
2. [Cài đặt script](https://github.com/king1x32/UserScripts/raw/refs/heads/main/Gemini_AI_Translator_(Inline-Popup).user.js)
3. Đăng ký và lấy API Key (Gemini/OpenAI)
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

## 📈 So sánh với v3.1

### ✨ Tính năng mới
- Thêm dịch media (audio/video)
- OCR dịch nâng cao đa định dạng
- Xuất/Nhập cài đặt
- Cache system đa lớp
- Model AI mới
- UI/UX cải tiến

### 🔄 Cải tiến
- Giao diện cài đặt trực quan
- Tùy biến model AI linh hoạt
- Tăng độ ổn định
- Tối ưu hiệu suất
- Xử lý lỗi tốt hơn

## 📞 Liên hệ & Đóng góp
- 🐛 Báo lỗi: [Voz](https://voz.vn/t/script-dung-ai-%C4%91e-dich-moi-thu-text-anh-audio-video.1072947/) [GitHub Issues](https://github.com/king1x32/UserScripts/issues)
- 💡 Góp ý: [Voz](https://voz.vn/t/script-dung-ai-%C4%91e-dich-moi-thu-text-anh-audio-video.1072947/) [GitHub Discussions](https://github.com/king1x32/UserScripts/discussions)
- 📧 Email: nhvnhvnhv07@mail.com
- 💬 Discord: [Join](https://discord.gg/CywqJTph)

---

> 💡 **Tip**: Sử dụng phím tắt để truy cập nhanh các tính năng thường dùng và tùy chỉnh cài đặt theo nhu cầu để có trải nghiệm tốt nhất.

Script v3.2 mang đến trải nghiệm dịch thuật toàn diện với nhiều phương thức kích hoạt, tính năng mới và khả năng tùy biến cao thông qua hệ thống cài đặt nâng cấp.
