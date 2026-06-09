// --- CẤU HÌNH API GOOGLE GEMINI ---
// ⚠️ HƯỚNG DẪN: Tạo file 'config.js' từ 'config.js.example' và thêm API key của bạn
// Lấy API key từ: https://ai.google.dev/

// Kiểm tra xem config.js đã được cấu hình chưa
if (typeof API_CONFIG === 'undefined') {
    alert('⚠️ Lỗi: Bạn chưa cấu hình API key!\n\n' +
          'Hướng dẫn:\n' +
          '1. Copy file "config.js.example" thành "config.js"\n' +
          '2. Mở "config.js" và thay thế "your_gemini_api_key_here" bằng API key thực của bạn\n' +
          '3. Lấy API key tại: https://ai.google.dev/\n' +
          '4. Tải lại trang này');
    throw new Error('API_CONFIG chưa được cấu hình. Xem hướng dẫn trong console.');
}

var GEMINI_API_KEY = API_CONFIG.GEMINI_API_KEY;
var MODEL_NAME = API_CONFIG.MODEL_NAME || "gemini-2.0-flash"; // Gemini 2.0: Knowledge 2026, faster response

// Hệ thống lưu trữ lịch sử cuộc hội thoại (Mảng thuần túy tương thích máy cũ)
var chatHistory = [];
var selectedImageBase64 = null;
var selectedImageMimeType = "";

// Khai báo các phần tử giao diện (khởi tạo sau khi DOM load)
var chatContainer;
var userInput;
var sendBtn;
var fileInput;
var previewContainer;

// Hàm khởi tạo ứng dụng - gọi sau khi DOM load xong
function initializeApp() {
    // Lấy các phần tử giao diện
    chatContainer = document.getElementById('chat-container');
    userInput = document.getElementById('user-input');
    sendBtn = document.getElementById('send-btn');
    fileInput = document.getElementById('file-input');
    previewContainer = document.getElementById('preview-container');

    // Xử lý khi chọn ảnh để upload
    if (fileInput) {
        fileInput.onchange = function (e) {
            var file = e.target.files[0];
            if (!file) return;
            
            selectedImageMimeType = file.type;
            var reader = new FileReader();
            reader.onload = function (event) {
                // Cắt bỏ phần đầu định dạng chuỗi base64 bọc ngoài
                selectedImageBase64 = event.target.result.split(',')[1];
                previewContainer.style.display = "flex";
            };
            reader.readAsDataURL(file);
        };
    }

    // Gán sự kiện click cho nút gửi
    if (sendBtn) {
        sendBtn.onclick = sendMessage;
    }

    // Gán sự kiện enter cho input
    if (userInput) {
        userInput.onkeypress = function (e) {
            if (e.key === 'Enter') sendMessage();
        };
    }
}

// Chờ DOM load xong rồi khởi tạo ứng dụng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // Nếu DOM đã load rồi (ít xảy ra) thì khởi tạo ngay
    initializeApp();
}

// Hàm hủy chọn ảnh
function clearSelectedImage() {
    selectedImageBase64 = null;
    selectedImageMimeType = "";
    fileInput.value = "";
    previewContainer.style.display = "none";
}

// Hàm xử lý khi nhấn gửi tin nhắn
function sendMessage() {
    var text = userInput.value;
    // Sử dụng hàm trim truyền thống phòng trường hợp trình duyệt cũ không hiểu .trim()
    if (text) {
        text = text.replace(/^\s+|\s+$/g, '');
    }
    
    if (text === "" && !selectedImageBase64) return;

    // Hiển thị tin nhắn của bạn lên màn hình
    appendMessage(text || "Đã gửi một hình ảnh", 'user');
    userInput.value = "";

    // Đóng gói dữ liệu gửi đi theo cấu trúc của Google
    var currentParts = [];
    if (text) {
        currentParts.push({ text: text });
    }
    if (selectedImageBase64) {
        currentParts.push({
            inlineData: { mimeType: selectedImageMimeType, data: selectedImageBase64 }
        });
    }

    chatHistory.push({ role: "user", parts: currentParts });
    
    // Tiến hành gọi API
    callGeminiAPI();
    clearSelectedImage();
}

function callGeminiAPI() {
    var xhr = new XMLHttpRequest();
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL_NAME + ":generateContent?key=" + GEMINI_API_KEY;

    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");

    // Hiển thị trạng thái chờ phản hồi và lưu lại ID của tin nhắn đó
    var loadingId = appendMessage("Đang suy nghĩ...", 'bot');

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            // Xóa dòng chữ trạng thái chờ bằng cách kiểm tra phần tử DOM thủ công
            var loadingDiv = document.getElementById(loadingId);
            if (loadingDiv && loadingDiv.parentNode) {
                loadingDiv.parentNode.removeChild(loadingDiv);
            }

            if (xhr.status === 200) {
                var response = JSON.parse(xhr.responseText);
                var aiResponseText = response.candidates[0].content.parts[0].text;
                
                // Hiển thị câu trả lời chính thức của AI
                appendMessage(aiResponseText, 'bot');

                // Lưu vào lịch sử để AI giữ trí nhớ ngữ cảnh
                chatHistory.push({
                    role: "model",
                    parts: [{ text: aiResponseText }]
                });

                // Khống chế số lượt hội thoại không vượt quá 20 để bảo vệ bộ nhớ RAM 1GB của iPad Air 1
                if (chatHistory.length > 20) {
                    chatHistory.shift();
                }
            } else {
                // Báo lỗi chi tiết thẳng lên màn hình iPad nếu có sự cố
                var errorText = "Lỗi kết nối.\n" +
                                "- Mã Status: " + xhr.status + "\n" +
                                "(Nếu Status bằng 0: Do Firewall chặn hoặc do Safari chặn đẩy dữ liệu từ http sang https. Hãy đưa lên Vercel để sửa dứt điểm lỗi này).";
                appendMessage(errorText, 'bot');
                chatHistory.pop(); // Gỡ lượt gửi lỗi khỏi hàng đợi lịch sử
            }
        }
    };

    var body = JSON.stringify({
        contents: chatHistory,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024 // Giới hạn token đầu ra ngắn hơn một chút để máy cũ xử lý chuỗi nhanh hơn
        }
    });
    
    xhr.send(body);
}

// HÀM HIỂN THỊ TIN NHẮN TƯƠNG THÍCH HOÀN TOÀN VỚI SAFARI ĐỜI CŨ
function appendMessage(text, side) {
    var msgDiv = document.createElement('div');
    
    // Tạo mã ID ngẫu nhiên bằng cách nối chuỗi an toàn kiểu cũ
    var randomNumber = Math.floor(Math.random() * 10000);
    var uniqueId = "msg-" + randomNumber;
    
    msgDiv.id = uniqueId;
    msgDiv.className = 'message ' + side;
    
    if (side === 'bot') {
        // Trên iOS 12 + iPad cũ, chỉ dùng simple markdown formatting thay vì thư viện ngoài
        // Tránh vấn đề innerHTML rendering trên Safari cũ
        msgDiv.innerHTML = parseSimpleMarkdown(text);
    } else {
        msgDiv.innerText = text;
    }
    
    chatContainer.appendChild(msgDiv);
    
    // Cuộn màn hình xuống tin nhắn mới nhất
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return uniqueId;
}

// Hàm parse markdown đơn giản - tương thích iOS 12
function parseSimpleMarkdown(text) {
    // Escape HTML để tránh injection
    text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
    // Chuyển dòng mới thành <br>
    text = text.replace(/\n/g, '<br>');
    
    // Bold: **text** hoặc __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* hoặc _text_
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Code inline: `code`
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Headings: # Heading, ## Heading, etc
    text = text.replace(/^### (.+?)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+?)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+?)$/gm, '<h1>$1</h1>');
    
    // Lists: - item hoặc * item
    text = text.replace(/^\s*[-*]\s+(.+?)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.+?<\/li>)/s, '<ul>$1</ul>');
    
    return text;
}