// js/firebase-config.js

// --- Firebase 設定 ---
// 重要：請將下面的 apiKey 替換成您自己的 Firebase Web API 金鑰。
// 這是您在 Firebase 控制台中為您的專案設定 Web 應用程式時取得的金鑰。
// 保持其他欄位不變，除非您確定它們也需要更改以匹配您的 Firebase 專案。
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // 請替換成您自己的金鑰 (例如 "AIzaSy...")
    authDomain: "aigame-fb578.firebaseapp.com",
    projectId: "aigame-fb578",
    storageBucket: "aigame-fb578.appspot.com",
    messagingSenderId: "932095431807",
    appId: "1:932095431807:web:28aab493c770166102db4a"
};

// 初始化 Firebase
// firebase.initializeApp(firebaseConfig); // 這行會在 main.js 或 auth.js 中更合適地調用，以確保 DOM 完全載入
// const auth = firebase.auth();
// const db = firebase.firestore();

// 為了讓其他 JS 檔案可以存取 firebaseConfig，我們將其匯出 (如果使用模組系統)
// 或者使其成為全域變數 (如果未使用模組系統，則此檔案載入後 firebaseConfig 即為全域)

// 在這個拆分結構中，firebaseConfig 變數會被其他檔案（如 auth.js 或 main.js）
// 在初始化 Firebase App 時使用。
// 初始化 Firebase App (firebase.initializeApp) 和獲取 auth、db 實例的動作，
// 通常會在主腳本 (main.js) 或身份驗證相關的腳本 (auth.js) 中進行，
// 以確保在嘗試使用 Firebase 服務之前，相關的 HTML 結構和 Firebase SDK 已載入。
// 此處僅定義設定物件。

// 如果您不使用 ES6 模組 (import/export)，firebaseConfig 將自動成為全域變數，
// 只要此檔案在其他使用它的 JS 檔案之前被載入。
// 例如，在 HTML 中：
// <script src="js/firebase-config.js"></script>
// <script src="js/auth.js"></script> 
// <script src="js/main.js"></script>
