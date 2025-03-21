# King Translator AI - Công cụ dịch thuật đa năng tích hợp AI

Link có ảnh tool/ extension: https://voz.vn/t/script-dung-ai-%C4%91e-dich-moi-thu-text-anh-audio-video.1072947/

![Version](https://img.shields.io/badge/version-4.2-blue)
![Status](https://img.shields.io/badge/status-updated-green)
![License](https://img.shields.io/badge/license-GPL3-orange)

<div align="center">
  <img src="kings.jpg" alt="Translator AI Logo" width="200"/>
  <br>
  <i>Công cụ dịch thuật thông minh tích hợp AI (Google Gemini) cho trình duyệt</i>
</div>

## 📖 Mục lục
- [Giới thiệu](#-giới-thiệu)
- [Tính năng](#-tính-năng)
- [Cài đặt](#-cài-đặt)
- [Hướng dẫn sử dụng](#-hướng-dẫn-sử-dụng)
- [Cấu hình](#-cấu-hình)
- [Phím tắt](#-phím-tắt)
- [Lưu ý](#-lưu-ý)
- [Đóng góp](#-đóng-góp)
- [Giấy phép](#-giấy-phép)

## 🌟 Giới thiệu

Translator AI là userscript dịch thuật tích hợp AI, cho phép dịch văn bản, hình ảnh, media và trang web trực tiếp trên trình duyệt. Sử dụng Google Gemini API để mang lại kết quả dịch chất lượng cao.

## ✨ Tính năng

### 📝 Dịch Văn Bản
- Dịch nhanh khi bôi đen văn bản
- Dịch popup với giao diện đẹp
- Dịch nâng cao với phân tích từ vựng
- Tự động dịch trong ô nhập liệu

### 🖼️ Dịch Hình Ảnh (OCR)
- Dịch file ảnh từ máy tính
- Chụp và dịch màn hình
- Dịch ảnh trên web
- Dịch manga với overlay text

### 🎵 Dịch Media
- Hỗ trợ file audio (MP3, WAV, OGG,...)
- Hỗ trợ file video (MP4, WEBM,...)
- Tự động tạo phụ đề SRT

### 🌐 Dịch Trang Web
- Dịch toàn bộ trang web
- Tự động nhận diện ngôn ngữ
- Dịch file HTML và PDF
- Tùy chọn loại trừ elements

## 🔧 Cài đặt

### Yêu cầu
- Trình duyệt: Chrome, Firefox, Edge,...
- Extension: [Violentmonkey](https://violentmonkey.github.io/) hoặc [Tampermonkey](https://www.tampermonkey.net/)
- API Key: [Google Gemini](https://makersuite.google.com/app/apikey)

### Các bước cài đặt

1. **Cài đặt Extension**
   - Cài đặt Violentmonkey hoặc Tampermonkey từ store của trình duyệt

2. **Cài đặt Script**
   - Phiên bản bình thường: [Github](https://github.com/king1x32/UserScripts/raw/main/King_Translator_AI.user.js) hoặc [Greasyfork](https://greasyfork.org/vi/scripts/529348-king-translator-ai)
   - Phiên bản nén (nhẹ hơn, mượt hơn): [Github](https://raw.githubusercontent.com/king1x32/compiledUserscripts/release/release/King20Translator20AI.user.js)

3. **Cấu hình API**
   - Mở cài đặt (menu ở biểu tượng Violentmonkey, Alt + S, chạm 4 ngón)
   - Chọn provider: Gemini
   - Nhập API key
   - Lưu cài đặt

## 📚 Hướng dẫn sử dụng

### Dịch Văn Bản
1. Bôi đen văn bản cần dịch
2. Chọn kiểu dịch:
   - Click đơn: Dịch nhanh
   - Click đúp: Dịch popup
   - Giữ click: Dịch nâng cao

### Dịch Trong Input
- 🌐 : Dịch sang ngôn ngữ đích
- 🔄 : Dịch sang ngôn ngữ nguồn
- Alt + T: Dịch nhanh

### Tools Dịch
Click "Tools Dịch" góc phải màn hình:
- Dịch Trang
- Dịch Ảnh/OCR
- Dịch Media
- Dịch File

## ⌨️ Phím tắt

| Phím tắt | Chức năng |
|----------|-----------|
| Alt + F | Dịch trang |
| Alt + Q | Dịch nhanh |
| Alt + E | Dịch popup |
| Alt + A | Dịch nâng cao |
| Alt + T | Dịch input |
| Alt + S | Mở cài đặt |

## 📱 Cảm ứng (Mobile)

| Thao tác | Chức năng |
|----------|-----------|
| 2 ngón | Dịch popup |
| 3 ngón | Dịch nâng cao |
| 4 ngón | Mở cài đặt |
| 5 ngón | Bật/tắt Tools |

## ⚙️ Cấu hình

### Giao diện
- Theme sáng/tối
- Font size
- Vị trí nút dịch

### API & Models
- Provider: Gemini AI
- API Keys
- Lựa chọn model

### Tùy chỉnh
- Prompt dịch
- Phím tắt
- Cache
- Sao lưu/Khôi phục

## ❗ Lưu ý

- Cần API key Gemini
- Giới hạn 5 request/10s
- Cache tăng tốc độ dịch
- Hỗ trợ dịch offline với cache
- Tự động phát hiện ngôn ngữ
- Hỗ trợ nhiều ngôn ngữ

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy:
1. Fork project
2. Tạo branch mới
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## Donate? Muốn hỗ trợ mình 1 ly cà phê
  > Hãy truy cập liên kết chứa thông tin Donate sau: https://kingsmanvn.pages.dev

## 📄 Giấy phép

Dự án này được phân phối dưới giấy phép GNU General Public License v3.0. Xem `LICENSE` để biết thêm chi tiết.

---

<div align="center">
  Made with ❤️ by King1x32
  <br>
  <a href="https://github.com/king1x32">GitHub</a> •
  <a href="https://discord.gg/v2DsBW6d">Discord</a> •
  <a href="https://t.me/king1x32">Telegram</a>
</div>
