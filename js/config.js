// js/config.js

// 後端 API 的基本 URL
// 請根據您的後端部署情況修改此 URL

// 當您要連接到部署在 Render.com 上的後端時，請使用下面這行：
const API_BASE_URL = 'https://md-server-5wre.onrender.com/api/MD';

// 當您要在本地測試，連接到本地運行的後端時，可以註解掉上面那行，並取消註解下面這行：
// const API_BASE_URL = 'http://127.0.0.1:5000/api/MD'; // 指向本地後端
// 或者如果您習慣用 localhost:
// const API_BASE_URL = 'http://localhost:5000/api/MD';

console.log(`API Base URL set to: ${API_BASE_URL}`);

// 如果將來有前端直接調用的 AI API 金鑰 (例如 DeepSeek)，可以在此處添加
// const DEEPSEEK_API_KEY = "sk-your-deepseek-api-key";

// 導出配置 (如果使用模塊系統)
// export { API_BASE_URL }; // 如果使用 ES6 模塊
