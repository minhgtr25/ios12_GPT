// --- CẤU HÌNH API GOOGLE FREE ---
var GEMINI_API_KEY = "AIzaSyB_V4o2dnQ8eUITYEq63O2p0RoKetK2-os";
var MODEL_NAME = "gemini-3.5-flash"; // Bản ổn định, miễn phí, hỗ trợ Vision và Context lớn

// Hệ thống lưu trữ lịch sử cuộc hội thoại (Mảng thuần túy tương thích máy cũ)
var chatHistory = [];
var selectedImageBase64 = null;
var selectedImageMimeType = "";

// Lấy các phần tử giao diện
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
        // Cắt bỏ phần đầu định dạng chuỗi base64 bọc ngoài
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
        // Đặt trong khối try-catch để phòng trường hợp thư viện Marked bị lỗi cú pháp trên iOS 12
        try {
            if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
                msgDiv.innerHTML = marked.parse(text);
            } else {
                msgDiv.innerText = text;
            }
        } catch (e) {
            // Nếu thư viện Marked crash, tự động hiển thị dạng chữ thô để giữ ứng dụng hoạt động ổn định
            msgDiv.innerText = text;
        }
    } else {
        msgDiv.innerText = text;
    }
    
    chatContainer.appendChild(msgDiv);
    
    // Cuộn màn hình xuống tin nhắn mới nhất
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return uniqueId;
}

// Bắt các sự kiện click nút và nhấn nút Enter trên bàn phím iPad
userInput.onkeypress = function (e) {
    if (e.keyCode === 13) sendMessage();
};
sendBtn.onclick = sendMessage;