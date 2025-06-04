// js/loadApiKey.js

// --- API 基本 URL ---
// 這個 URL 是您後端 API 的進入點。
// 請確保這個 URL 是正確的，並且指向您部署的後端服務。
const API_BASE_URL = 'https://md-server-5wre.onrender.com';

// 如果您有其他的 API 金鑰需要從某處載入（例如，一個非 Firebase 的服務），
// 相關的邏輯可以放在這裡。
// 例如，從一個安全的環境變數或設定檔載入。
// const ANOTHER_SERVICE_API_KEY = "YOUR_OTHER_API_KEY";

// 注意：
// 1. 安全性：直接在前端 JavaScript 檔案中硬編碼敏感的 API 金鑰通常不建議，
//    除非該金鑰本身設計為公開的（例如某些地圖服務的用戶端金鑰）。
//    對於需要保密的金鑰，應該由後端處理相關的 API 請求。
// 2. Firebase API 金鑰：Firebase 的 Web API 金鑰已經在 firebase-config.js 中設定，
//    並且 Firebase SDK 會自動處理它。
// 3. API_BASE_URL：這個 URL 是公開的，因為前端需要知道向哪個伺服器發送請求。

// 如果您不使用 ES6 模組 (import/export)，API_BASE_URL 將自動成為全域變數，
// 只要此檔案在其他使用它的 JS 檔案之前被載入。
// 例如，在 HTML 中：
// <script src="js/loadApiKey.js"></script>
// <script src="js/api-client.js"></script> 
