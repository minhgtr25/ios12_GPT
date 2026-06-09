// --- CẤU HÌNH API GOOGLE GEMINI ---
// ⚠️ HƯỚNG DẪN: Tạo file 'config.js' từ 'config.js.example' và thêm API key của bạn
// Lấy API key từ: https://ai.google.dev/

// Constants cho localStorage (define trước để dùng trong API key check)
var STORAGE_PREFIX = "ios12_gpt_";
var STORAGE_HISTORY = STORAGE_PREFIX + "history";
var STORAGE_MODEL = STORAGE_PREFIX + "model";

var GEMINI_API_KEY;
var MODEL_NAME;

// Try loading from config.js (localhost)
if (typeof API_CONFIG !== 'undefined') {
    GEMINI_API_KEY = API_CONFIG.GEMINI_API_KEY;
    MODEL_NAME = API_CONFIG.MODEL_NAME || "gemini-3.5-flash";
} else {
    // Try loading from localStorage (Vercel deployment)
    GEMINI_API_KEY = localStorage.getItem(STORAGE_PREFIX + "api_key");
    MODEL_NAME = localStorage.getItem(STORAGE_PREFIX + "model") || "gemini-3.5-flash";
}

// If still no key, ask user to input
if (!GEMINI_API_KEY) {
    var userKey = prompt('⚠️ API key chưa được cấu hình!\n\nPaste Gemini API key từ https://ai.google.dev/\n\nVD: AIza...');
    if (userKey && userKey.trim()) {
        GEMINI_API_KEY = userKey.trim();
        localStorage.setItem(STORAGE_PREFIX + "api_key", GEMINI_API_KEY);
    } else {
        alert('❌ API key required. Cannot continue.');
        throw new Error('API_CONFIG missing and user cancelled input.');
    }
}

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
var modelSelector;
var exportBtn;
var importBtn;
var clearBtn;

// ===== LOCAL STORAGE FUNCTIONS =====

// Lưu history vào localStorage
function saveHistoryToStorage() {
    try {
        var historyStr = JSON.stringify(chatHistory);
        localStorage.setItem(STORAGE_HISTORY, historyStr);
    } catch (e) {
        // Quota exceeded hoặc disabled
        console.warn("Cannot save to localStorage:", e);
    }
}

// Load history từ localStorage
function loadHistoryFromStorage() {
    try {
        var historyStr = localStorage.getItem(STORAGE_HISTORY);
        if (historyStr) {
            chatHistory = JSON.parse(historyStr);
            return true;
        }
    } catch (e) {
        console.warn("Cannot load from localStorage:", e);
    }
    return false;
}

// Lưu model choice vào localStorage
function saveModelToStorage(modelName) {
    try {
        localStorage.setItem(STORAGE_MODEL, modelName);
    } catch (e) {
        console.warn("Cannot save model to localStorage:", e);
    }
}

// Load model choice từ localStorage
function loadModelFromStorage() {
    try {
        return localStorage.getItem(STORAGE_MODEL);
    } catch (e) {
        console.warn("Cannot load model from localStorage:", e);
    }
    return null;
}

// Export history as JSON file
function exportHistory() {
    try {
        var data = {
            timestamp: new Date().toISOString(),
            model: MODEL_NAME,
            history: chatHistory
        };
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        
        // Create download link
        var a = document.createElement('a');
        a.href = url;
        a.download = 'chat_history_' + new Date().getTime() + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        appendMessage("✅ Đã xuất lịch sử chat", 'bot');
    } catch (e) {
        appendMessage("❌ Lỗi xuất file: " + e.message, 'bot');
    }
}

// Import history from JSON file
function importHistory() {
    var importInput = document.getElementById('import-file-input');
    if (importInput) {
        importInput.click();
    }
}

// Clear all history
function clearHistory() {
    if (confirm('Bạn chắc chắn muốn xóa toàn bộ lịch sử chat? Hành động này không thể hoàn tác.')) {
        chatHistory = [];
        localStorage.removeItem(STORAGE_HISTORY);
        
        // Clear chat display
        while (chatContainer.firstChild) {
            chatContainer.removeChild(chatContainer.firstChild);
        }
        
        appendMessage("✅ Đã xóa lịch sử chat", 'bot');
    }
}

// Change model
function changeModel(newModel) {
    MODEL_NAME = newModel;
    saveModelToStorage(newModel);
    appendMessage("✅ Đã chuyển model sang: " + newModel, 'bot');
}

// Hàm khởi tạo ứng dụng - gọi sau khi DOM load xong
function initializeApp() {
    // Lấy các phần tử giao diện
    chatContainer = document.getElementById('chat-container');
    userInput = document.getElementById('user-input');
    sendBtn = document.getElementById('send-btn');
    fileInput = document.getElementById('file-input');
    previewContainer = document.getElementById('preview-container');
    modelSelector = document.getElementById('model-selector');
    exportBtn = document.getElementById('export-btn');
    importBtn = document.getElementById('import-btn');
    clearBtn = document.getElementById('clear-btn');

    // Load saved model or use default
    var savedModel = loadModelFromStorage();
    if (savedModel) {
        MODEL_NAME = savedModel;
        if (modelSelector) {
            modelSelector.value = savedModel;
        }
    } else if (modelSelector) {
        modelSelector.value = MODEL_NAME;
    }

    // Load chat history from localStorage
    var loaded = loadHistoryFromStorage();
    if (loaded && chatHistory.length > 0) {
        // Replay history to display
        for (var i = 0; i < chatHistory.length; i++) {
            var msg = chatHistory[i];
            if (msg.parts && msg.parts.length > 0) {
                var text = msg.parts[0].text || "(image)";
                var side = msg.role === "user" ? "user" : "bot";
                appendMessage(text, side);
            }
        }
    }

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

    // Model selector handler
    if (modelSelector) {
        modelSelector.onchange = function (e) {
            changeModel(e.target.value);
        };
    }

    // Export button handler
    if (exportBtn) {
        exportBtn.onclick = exportHistory;
    }

    // Import button handler
    if (importBtn) {
        importBtn.onclick = importHistory;
    }

    // Clear button handler
    if (clearBtn) {
        clearBtn.onclick = clearHistory;
    }

    // Import file input handler
    var importInput = document.getElementById('import-file-input');
    if (importInput) {
        importInput.onchange = function (e) {
            var file = e.target.files[0];
            if (!file) return;
            
            var reader = new FileReader();
            reader.onload = function (event) {
                try {
                    var data = JSON.parse(event.target.result);
                    chatHistory = data.history || [];
                    saveHistoryToStorage();
                    
                    // Clear and reload display
                    while (chatContainer.firstChild) {
                        chatContainer.removeChild(chatContainer.firstChild);
                    }
                    
                    // Replay history
                    for (var i = 0; i < chatHistory.length; i++) {
                        var msg = chatHistory[i];
                        if (msg.parts && msg.parts.length > 0) {
                            var text = msg.parts[0].text || "(image)";
                            var side = msg.role === "user" ? "user" : "bot";
                            appendMessage(text, side);
                        }
                    }
                    
                    appendMessage("✅ Đã nhập lịch sử chat (" + chatHistory.length + " tin nhắn)", 'bot');
                } catch (err) {
                    appendMessage("❌ Lỗi nhập file: " + err.message, 'bot');
                }
            };
            reader.readAsText(file);
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
    saveHistoryToStorage(); // Auto-save history
    
    // Tiến hành gọi API
    callGeminiAPI();
    clearSelectedImage();
}

// Biến kiểm soát retry (tránh gọi API liên tục)
var apiRetryCount = 0;
var maxRetries = 2;
var lastAPICallTime = 0;
var minTimeBetweenCalls = 2000; // 2 giây giữa các call

function callGeminiAPI() {
    // Rate limiting: chờ tối thiểu 2 giây giữa các calls
    var timeSinceLastCall = Date.now() - lastAPICallTime;
    if (timeSinceLastCall < minTimeBetweenCalls) {
        var waitTime = Math.ceil((minTimeBetweenCalls - timeSinceLastCall) / 1000);
        appendMessage("⏳ Chờ " + waitTime + "s để tránh quá tải...", 'bot');
        setTimeout(callGeminiAPI, minTimeBetweenCalls - timeSinceLastCall);
        return;
    }
    
    lastAPICallTime = Date.now();
    
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
                apiRetryCount = 0; // Reset retry counter on success
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
                
                saveHistoryToStorage(); // Auto-save history after bot response
            } else if (xhr.status === 429) {
                // Rate limit - retry sau 5 giây
                if (apiRetryCount < maxRetries) {
                    apiRetryCount++;
                    var waitSeconds = 5 * apiRetryCount; // 5s, 10s, 15s
                    appendMessage("⚠️ API quá tải (429). Thử lại sau " + waitSeconds + "s...", 'bot');
                    setTimeout(function() {
                        // Xóa tin nhắn thử lại và gọi lại
                        var retryMsg = document.querySelectorAll('.message.bot');
                        if (retryMsg.length > 0) {
                            retryMsg[retryMsg.length - 1].remove();
                        }
                        callGeminiAPI();
                    }, waitSeconds * 1000);
                } else {
                    appendMessage("❌ Lỗi 429: API quá tải. Hãy chờ 10 phút rồi thử lại.", 'bot');
                    apiRetryCount = 0;
                    chatHistory.pop();
                }
            } else {
                // Báo lỗi chi tiết thẳng lên màn hình iPad nếu có sự cố
                var errorText = "❌ Lỗi kết nối.\n" +
                                "Mã: " + xhr.status + "\n";
                if (xhr.status === 0) {
                    errorText += "(Firewall chặn hoặc HTTPS issue)";
                } else if (xhr.status === 403) {
                    errorText += "(API key không hợp lệ)";
                } else if (xhr.status === 500) {
                    errorText += "(Lỗi server Google)";
                }
                appendMessage(errorText, 'bot');
                chatHistory.pop();
            }
        }
    };

    var body = JSON.stringify({
        contents: chatHistory,
        systemInstruction: {
            parts: [{
                text: "You are a helpful AI assistant. Provide complete, well-structured answers. If your response would be very long, organize it with clear sections and bullet points. Always end responses naturally - never leave incomplete sentences or abrupt endings."
            }]
        },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096 // Increased for longer, more detailed responses
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
    
    // === CODE BLOCKS (must be before line breaks) ===
    text = text.replace(/```(.*?)\n([\s\S]*?)```/g, function(match, lang, code) {
        var langClass = lang ? ' class="lang-' + lang.trim() + '"' : '';
        return '<pre><code' + langClass + '>' + code.trim() + '</code></pre>';
    });
    
    // === HORIZONTAL DIVIDERS ===
    text = text.replace(/^\*\*\*\s*$/gm, '<div class="divider"></div>');
    text = text.replace(/^---\s*$/gm, '<div class="divider"></div>');
    
    // === LINE BREAKS ===
    text = text.replace(/\n/g, '<br>');
    
    // === BLOCKQUOTES (> text) ===
    text = text.replace(/^&gt;\s+(.+?)$/gm, '<blockquote>$1</blockquote>');
    
    // === BOLD: **text** hoặc __text__ ===
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // === ITALIC: *text* hoặc _text_ ===
    // Note: Cẩn thận không match ** hoặc __ được match lại
    text = text.replace(/\*([^\*]+?)\*/g, function(match, content) {
        if (match.includes('**')) return match;
        return '<em>' + content + '</em>';
    });
    text = text.replace(/_([^_]+?)_/g, function(match, content) {
        if (match.includes('__')) return match;
        return '<em>' + content + '</em>';
    });
    
    // === INLINE CODE: `code` ===
    text = text.replace(/`([^`]+?)`/g, '<code>$1</code>');
    
    // === HEADINGS ===
    text = text.replace(/^### (.+?)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+?)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+?)$/gm, '<h1>$1</h1>');
    
    // === NUMBERED LISTS (1. item, 2. item) ===
    text = text.replace(/^\d+\.\s+(.+?)$/gm, '<li class="numbered">$1</li>');
    
    // === BULLET LISTS (- item hoặc * item) ===
    text = text.replace(/^\s*[-*]\s+(.+?)$/gm, '<li>$1</li>');
    
    // === WRAP LISTS IN UL/OL ===
    text = text.replace(/(<li[^>]*>.+?<\/li>)/s, function(match) {
        if (match.includes('class="numbered"')) {
            return '<ol>' + match + '</ol>';
        } else {
            return '<ul>' + match + '</ul>';
        }
    });
    
    // === LINKS [text](url) ===
    text = text.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    return text;
}