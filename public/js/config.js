// public/js/config.js

// --- API Base URL ---
// 這個變數決定了前端要向哪個後端發送請求

// 部署到 Firebase 時，請使用這行。
// 它會自動指向您的 Firebase Hosting 網址，並透過上面的 rewrite 規則轉發給 Cloud Function。
const API_BASE_URL = '/api/MD';

// --- 本地端測試（未來使用）---
// 當我們使用 Firebase 模擬器在本地測試時，可以切換到下面這行。
// const API_BASE_URL = 'http://127.0.0.1:5001/aigame-fb578/us-central1/api/api/MD';


console.log(`API Base URL set to: ${API_BASE_URL}`);

// 如果將來有前端直接調用的 AI API 金鑰 (例如 DeepSeek)，可以在此處添加
// const DEEPSEEK_API_KEY = "sk-your-deepseek-api-key";

// 導出配置 (如果使用模塊系統)
// export { API_BASE_URL };