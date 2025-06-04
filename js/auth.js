// js/auth.js

// 注意：這個檔案依賴於 js/firebase-config.js 中定義的 firebaseConfig
// 以及在 main.js 中進行的 firebase.initializeApp(firebaseConfig);

/**
 * 監聽 Firebase Auth 狀態變化。
 * @param {function} onAuthStateChangedCallback 當身份驗證狀態改變時調用的回調函數，接收 user 對象作為參數。
 */
function RosterAuthListener(onAuthStateChangedCallback) {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.error("Firebase Auth SDK 尚未載入或初始化。");
        // 可以在此處添加一個延遲重試機制或更明確的錯誤處理
        setTimeout(() => RosterAuthListener(onAuthStateChangedCallback), 1000);
        return;
    }
    firebase.auth().onAuthStateChanged(onAuthStateChangedCallback);
}

/**
 * 使用暱稱和密碼（實際上是電子郵件和密碼）註冊新用戶。
 * Firebase 的 createUserWithEmailAndPassword 需要 email 格式。
 * 我們將使用 "nickname@yourdomain.com" 的形式來適應，或者後端可以處理自定義聲明。
 * 為了簡化前端，我們假設 nickname 直接作為 email 的用戶名部分。
 * @param {string} nickname 玩家選擇的暱稱
 * @param {string} password 玩家設定的密碼
 * @returns {Promise<firebase.User>} 成功註冊後的 Firebase User 對象
 * @throws {Error} 如果註冊失敗
 */
async function registerUser(nickname, password) {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        throw new Error("Firebase Auth SDK 尚未載入或初始化。");
    }
    // 為了符合 Firebase email 格式，我們將 nickname 轉換
    // 實際應用中，後端可能需要更複雜的處理來支持純暱稱登入
    const email = `${nickname.trim().toLowerCase()}@monstergame.dev`; // 使用一個虛構的域名

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        // 更新用戶的 displayName (如果需要，但我們主要依賴後端存儲的 nickname)
        await userCredential.user.updateProfile({
            displayName: nickname 
        });
        console.log("用戶註冊成功:", userCredential.user.uid, "暱稱:", nickname);
        return userCredential.user;
    } catch (error) {
        console.error("註冊錯誤:", error.code, error.message);
        throw mapAuthError(error);
    }
}

/**
 * 使用暱稱和密碼（轉換為 email 和密碼）登入用戶。
 * @param {string} nickname 玩家的暱稱
 * @param {string} password 玩家的密碼
 * @returns {Promise<firebase.User>} 成功登入後的 Firebase User 對象
 * @throws {Error} 如果登入失敗
 */
async function loginUser(nickname, password) {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        throw new Error("Firebase Auth SDK 尚未載入或初始化。");
    }
    const email = `${nickname.trim().toLowerCase()}@monstergame.dev`;

    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log("用戶登入成功:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("登入錯誤:", error.code, error.message);
        throw mapAuthError(error);
    }
}

/**
 * 登出當前用戶。
 * @returns {Promise<void>}
 */
async function logoutUser() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.warn("Firebase Auth SDK 尚未載入或初始化，無法登出。");
        return;
    }
    try {
        await firebase.auth().signOut();
        console.log("用戶已登出。");
    } catch (error) {
        console.error("登出錯誤:", error);
        throw error; // 可以選擇是否向上拋出
    }
}

/**
 * 獲取當前登入用戶的 ID Token。
 * @param {boolean} forceRefresh 是否強制刷新 token (預設為 false)
 * @returns {Promise<string|null>} ID Token 字串，如果沒有用戶登入則為 null。
 */
async function getCurrentUserToken(forceRefresh = false) {
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.auth().currentUser) {
        // console.log("獲取 Token 失敗：無當前用戶或 Firebase 未初始化。");
        return null;
    }
    try {
        const token = await firebase.auth().currentUser.getIdToken(forceRefresh);
        return token;
    } catch (error) {
        console.error("獲取 ID Token 錯誤:", error);
        // 如果是 token 過期等問題，可能需要引導用戶重新登入
        if (error.code === 'auth/user-token-expired' || error.code === 'auth/invalid-user-token') {
            // 可以觸發一個事件或調用一個函數來處理重新登入邏
            console.warn("用戶 Token 已過期或無效，可能需要重新登入。");
        }
        return null;
    }
}

/**
 * 獲取當前 Firebase Auth 用戶對象。
 * @returns {firebase.User | null} 當前用戶對象，或 null。
 */
function getCurrentAuthUser() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        return null;
    }
    return firebase.auth().currentUser;
}


/**
 * 將 Firebase Auth 錯誤映射為更友好的中文提示。
 * @param {Error & {code?: string}} error Firebase Auth 拋出的錯誤對象
 * @returns {Error} 包含中文訊息的新錯誤對象
 */
function mapAuthError(error) {
    let message = "發生未知錯誤，請稍後再試。";
    switch (error.code) {
        case "auth/email-already-in-use":
            message = "此暱稱已被註冊。請嘗試其他暱稱。";
            break;
        case "auth/invalid-email":
            message = "暱稱格式無效 (可能包含不允許的字符)。";
            break;
        case "auth/operation-not-allowed":
            message = "此操作未被允許。請聯繫管理員。";
            break;
        case "auth/weak-password":
            message = "密碼強度不足，請設定更複雜的密碼 (至少6位)。";
            break;
        case "auth/user-disabled":
            message = "此帳號已被禁用。";
            break;
        case "auth/user-not-found":
            message = "找不到此暱稱對應的帳號。";
            break;
        case "auth/wrong-password":
            message = "密碼錯誤，請重新輸入。";
            break;
        case "auth/network-request-failed":
            message = "網路請求失敗，請檢查您的網路連線。";
            break;
        case "auth/too-many-requests":
            message = "操作過於頻繁，請稍後再試。";
            break;
        default:
            if (error.message) { // 如果有原始錯誤訊息，也附加上
                message = `操作失敗: ${error.message}`;
            }
    }
    const newError = new Error(message);
    newError.code = error.code; // 保留原始錯誤碼
    return newError;
}

console.log("Auth module loaded.");

// 導出 (如果使用 ES6 模塊)
// export { RosterAuthListener, registerUser, loginUser, logoutUser, getCurrentUserToken, getCurrentAuthUser, mapAuthError };
