// firebase-config.js - 最終修正版

// 在 Firebase v8 中，這些 SDK 會在全局範圍內創建 'firebase' 物件
// 確保這些 CDN 已在 index.html 載入：
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>

// 檢查全局的 firebase 物件是否已載入
if (typeof firebase === 'undefined') {
    throw new Error("❌ Firebase SDK 未載入。請確認 index.html 已正確引入 CDN。");
}

// 初始化設定
const firebaseConfig = {
    apiKey: "AIzaSyCACjjC1S-9gj6hKCyfAedzH9kTf_JZwDE",
    authDomain: "aigame-fb578.firebaseapp.com",
    projectId: "aigame-fb578",
    storageBucket: "aigame-fb578.appspot.com",
    messagingSenderId: "932095431807",
    appId: "1:932095431807:web:28aab493c770166102db4a"
};

// 初始化 Firebase App（只執行一次）
// 使用一個全局變數來檢查是否已初始化，以防止在某些環境下重複初始化
let firebaseAppInstance;
if (!window._firebaseAppInstance) {
    firebaseAppInstance = firebase.initializeApp(firebaseConfig);
    window._firebaseAppInstance = firebaseAppInstance; // 儲存實例
    console.log("✅ Firebase 初始化完成");
} else {
    firebaseAppInstance = window._firebaseAppInstance;
    console.log("ℹ️ Firebase 已初始化，略過重複初始化");
}

// 獲取並匯出 auth 與 db 實例，以及 firebaseApp 實例
// 在 Firebase v8 中，是通過全局的 firebase 物件來訪問這些服務
const auth = firebase.auth();
const db = firebase.firestore();
const firebaseApp = firebaseAppInstance; // 導出初始化後的 app 實例

export { firebaseApp, auth, db };
