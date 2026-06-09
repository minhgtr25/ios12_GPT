# 🤖 Gemini AI Chat - iOS 12 Compatible

Một ứng dụng chat AI hoàn toàn client-side chạy trên trình duyệt, tương thích với iOS 12 và các trình duyệt cũ.

## ⚠️ Hướng dẫn cấu hình API Key (BẮT BUỘC)

### Bước 1: Tạo file cấu hình
Sao chép file `config.js.example` thành `config.js`:
```bash
cp config.js.example config.js
```

### Bước 2: Lấy API Key Gemini
1. Truy cập [Google AI Studio](https://ai.google.dev/)
2. Nhấp vào "Get API Key"
3. Tạo API key mới
4. Copy API key

### Bước 3: Cấu hình API Key
Mở file `config.js` và thay thế:
```javascript
var API_CONFIG = {
    GEMINI_API_KEY: "your_gemini_api_key_here",  // ← Thay bằng API key của bạn
    MODEL_NAME: "gemini-3.5-flash"
};
```

### Bước 4: Chạy ứng dụng
- Mở file `index.html` trong trình duyệt
- Hoặc upload lên web server

## 🔒 Bảo mật

- ✅ **API Key KHÔNG được commit lên GitHub** - File `config.js` được thêm vào `.gitignore`
- ✅ **Chạy hoàn toàn client-side** - Không có server, dữ liệu chỉ gửi đến Google API
- ✅ **Tương thích máy cũ** - Hoạt động trên iOS 12, Android 4.4+

## ⚡ Tính năng

- 💬 Chat với AI Gemini
- 🖼️ Hỗ trợ tải ảnh (Vision)
- 📱 Responsive design
- 🔄 Lịch sử chat (tối đa 20 tin nhắn)
- ✨ Hỗ trợ Markdown trong câu trả lời

## 🛠️ Công nghệ

- HTML5 / CSS3 / Vanilla JavaScript
- Google Gemini API
- Markdown Parser (marked.js)
- Tương thích iOS 12+

## ⚠️ LƯU Ý QUAN TRỌNG

**KHÔNG bao giờ:**
- ❌ Commit file `config.js` lên GitHub
- ❌ Chia sẻ API key công khai
- ❌ Để API key trong source code
- ❌ Deploy lên production mà không che giấu API key

Nếu vô tình để lộ API key, hãy:
1. Xoá API key trong Google AI Studio
2. Tạo API key mới
3. Cập nhật `config.js` local

## 📝 Giấy phép

MIT License
