// js/firebase-config.js

// Firebase App (auto-initialized by the SDK script in index.html)
// This file is primarily to confirm and potentially export the firebase app instance if needed by other modules.
// However, since firebase is globally available after SDK load, direct usage is also common.

// Your web app's Firebase configuration (來自 index.html)
const firebaseConfig = {
  apiKey: "AIzaSyCACjjC1S-9gj6hKCyfAedzH9kTf_JZwDE", // 請確認這是您正確的 API 金鑰
  authDomain: "aigame-fb578.firebaseapp.com",
  projectId: "aigame-fb578",
  storageBucket: "aigame-fb578.firebasestorage.app",
  messagingSenderId: "932095431807",
  appId: "1:932095431807:web:28aab493c770166102db4a"
};

// Initialize Firebase
// firebase.initializeApp(firebaseConfig); // 這行通常由 index.html 中的 SDK 自動處理或在 main.js 中明確調用

// 方便起見，導出 firebase 實例 (如果其他模組需要 import)
// 雖然 firebase SDK 會將 firebase 掛載到 window 對象，但顯式導入/導出是良好的模塊化實踐。
// 注意：如果 index.html 中的 SDK 已經初始化，這裡再次調用 initializeApp 可能會出錯或被忽略。
// 最好是在一個地方統一初始化，例如 main.js。
// 此處僅定義配置，實際初始化在 main.js 中處理。

console.log("Firebase config loaded.");
// 實際的 firebase.initializeApp(firebaseConfig); 建議放在 main.js 的最前面。
