// --- CẤU HÌNH API GOOGLE FREE ---
var GEMINI_API_KEY = "AIzaSyB_V4o2dnQ8eUITYEq63O2p0RoKetK2-os";
var MODEL_NAME = "gemini-3.5-flash"; // Bản ổn định, miễn phí, hỗ trợ Vision và Context lớn

// Hệ thống lưu trữ lịch sử cuộc hội thoại
var chatHistory = [];
var selectedImageBase64 = null;
var selectedImageMimeType = "";

// Lấy các phần tử giao diện (DOM Elements)
var chatContainer = document.getElementById('chat-container');
var userInput = document.getElementById('user-input');
var sendBtn = document.getElementById('send-btn');
var fileInput = document.getElementById('file-input');
var previewContainer = document.getElementById('preview-container');

// Xử lý khi chọn ảnh để upload
fileInput.onchange = function (e) {
    var file = e.target.files[0];
    if (!file) return;
    
    selectedImageMimeType = file.type;
    var reader = new FileReader();
    reader.onload = function (event) {
        selectedImageBase64 = event.target.result.split(',')[1];
        previewContainer.style.display = "flex";
    };
    reader.readAsDataURL(file);
};

// Hàm hủy chọn ảnh
function clearSelectedImage() {
    selectedImageBase64 = null;
    selectedImageMimeType = "";
    fileInput.value = "";
    previewContainer.style.display = "none";
}

// Hàm xử lý khi nhấn gửi tin nhắn
function sendMessage() {
    var text = userInput.value.trim();
    if (text === "" && !selectedImageBase64) return;

    // Hiển thị tin nhắn của bạn lên màn hình
    appendMessage(text || "Đã gửi một hình ảnh", 'user');
    userInput.value = "";

    // Đóng gói dữ liệu gửi đi theo chuẩn cấu trúc của Google
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
    // Endpoint kết nối trực tiếp đến hệ thống Google AI Studio
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL_NAME + ":generateContent?key=" + GEMINI_API_KEY;

    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");

    // Hiển thị trạng thái chờ phản hồi
    var loadingId = appendMessage("Đang suy nghĩ...", 'bot');

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            // Xóa dòng chữ trạng thái chờ sau khi nhận được kết quả
            var loadingDiv = document.getElementById(loadingId);
            if (loadingDiv) loadingDiv.parentNode.removeChild(loadingDiv);

            if (xhr.status === 200) {
                var response = JSON.parse(xhr.responseText);
                var aiResponseText = response.candidates[0].content.parts[0].text;
                
                // Biên dịch tự động Markdown (Đầu mục, Code, Danh sách) và hiển thị
                appendMessage(aiResponseText, 'bot');

                // Lưu vào lịch sử để AI giữ ngữ cảnh (trí nhớ)
                chatHistory.push({
                    role: "model",
                    parts: [{ text: aiResponseText }]
                });

                // Khống chế số lượt hội thoại tránh quá tải bộ nhớ RAM 1GB của iPad Air 1
                if (chatHistory.length > 20) chatHistory.shift();
            } else {
                // Báo lỗi chi tiết trực tiếp lên màn hình iPad để dễ debug local
                var errorText = "Lỗi kết nối mạng.\n" +
                                "- Mã Status: " + xhr.status + " (Nếu là 0: Do Tường lửa PC hoặc Safari chặn kết nối HTTP)\n" +
                                "- ReadyState: " + xhr.readyState;
                appendMessage(errorText, 'bot');
                chatHistory.pop(); // Xóa tin nhắn lỗi khỏi lịch sử
            }
        }
    };

    var body = JSON.stringify({
        contents: chatHistory,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
        }
    });
    
    xhr.send(body);
}

// Hàm hiển thị tin nhắn lên màn hình (Hỗ trợ thư viện xử lý Markdown)
function appendMessage(text, side) {
    var msgDiv = document.createElement('div');
    var uniqueId = "msg-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
    msgDiv.id = uniqueId;
    msgDiv.className = 'message ' + side;
    
    if (side === 'bot') {
        // Tự động dịch các ký tự định dạng sang cấu trúc HTML đẹp mắt nhờ Marked.js
        msgDiv.innerHTML = marked.parse(text);
    } else {
        msgDiv.innerText = text;
    }
    
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return uniqueId;
}

// Bắt các sự kiện click nút và nhấn Enter
userInput.onkeypress = function (e) {
    if (e.keyCode === 13) sendMessage();
};
sendBtn.onclick = sendMessage;