// public/js/auth.js

// 導入 Firebase Auth 相關的功能模組
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './firebase-config.js'; // 從我們的設定檔中導入 auth
import { apiClient } from './api-client.js';
import { initializeGame, showLoginScreen, showGameScreen, showLoading, hideLoading } from './ui.js';
import { gameState } from './game-state.js';
import { showToast } from './utils.js';
import { uiText } from './ui-text.js';

/**
 * 處理 Firebase Auth 錯誤碼並返回給使用者看的中文訊息
 * @param {Error} error - 從 Firebase catch 到的錯誤物件
 * @returns {string} - 本地化的中文錯誤訊息
 */
function getFirebaseAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email':
            return uiText.errorMessages.invalidEmail || '電子郵件格式不正確。';
        case 'auth/user-disabled':
            return uiText.errorMessages.userDisabled || '此帳號已被禁用。';
        case 'auth/user-not-found':
            return uiText.errorMessages.userNotFound || '找不到此帳號。';
        case 'auth/wrong-password':
            return uiText.errorMessages.wrongPassword || '密碼錯誤。';
        case 'auth/email-already-in-use':
            return uiText.errorMessages.emailInUse || '這個電子郵件已經被註冊了。';
        case 'auth/weak-password':
            return uiText.errorMessages.weakPassword || '密碼強度不足，請設定至少6個字元。';
        case 'auth/network-request-failed':
            return uiText.errorMessages.networkError || '網路連線失敗，請檢查您的網路。';
        default:
            console.error("未知的 Firebase Auth 錯誤:", error);
            return uiText.errorMessages.unknownError || '發生未知錯誤，請稍後再試。';
    }
}

/**
 * [已改造] 使用 Firebase Client SDK 直接註冊新使用者
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>}
 */
async function registerUser(email, password) {
    console.log(`[Auth] Starting registration for ${email} directly with Firebase...`);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('[Auth] Firebase registration successful:', userCredential.user);
        // 註冊成功後，後端會需要建立對應的玩家資料，這一步在後端 /register 路由完成
        // 因此我們仍然需要呼叫後端的 /register 端點來初始化玩家遊戲資料
        const backendResponse = await apiClient.register(email, password, userCredential.user.uid);
        if(backendResponse.error) {
            // 如果後端資料初始化失敗，這是一個問題
             console.error('[Auth] Backend user initialization failed after Firebase registration:', backendResponse.error);
             // 在此可以選擇是否要刪除剛剛建立的 Firebase 使用者，以保持資料一致性
             // 目前暫時只回傳錯誤
            return { error: backendResponse.error };
        }
        return backendResponse; // 返回後端創建的玩家資料
    } catch (error) {
        const errorMessage = getFirebaseAuthErrorMessage(error);
        console.error('[Auth] Firebase registration failed:', error.code, errorMessage);
        return { error: errorMessage };
    }
}

/**
 * [已改造] 使用 Firebase Client SDK 直接登入使用者
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>}
 */
async function loginUser(email, password) {
    console.log(`[Auth] Starting login for ${email} directly with Firebase...`);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('[Auth] Firebase login successful:', userCredential.user);
        // 登入成功後，onAuthStateChanged 會自動觸發來獲取玩家資料並初始化遊戲
        // 所以這裡不需要再額外呼叫 initializeGame
        return { success: true, uid: userCredential.user.uid };
    } catch (error) {
        const errorMessage = getFirebaseAuthErrorMessage(error);
        console.error('[Auth] Firebase login failed:', error.code, errorMessage);
        return { error: errorMessage };
    }
}

/**
 * [已改造] 使用 Firebase Client SDK 直接登出使用者
 */
async function logoutUser() {
    try {
        await signOut(auth);
        console.log('[Auth] User signed out successfully from Firebase.');
        // 清理本地遊戲狀態
        gameState.clear();
        // 顯示登入畫面
        showLoginScreen();
    } catch (error) {
        console.error('Error signing out: ', error);
        showToast(uiText.errorMessages.logoutFailed || '登出失敗，請稍後再試。', 'error');
    }
}

/**
 * 監聽 Firebase Auth 狀態改變
 * 這是整個驗證流程的核心，在使用者登入、登出或頁面刷新時自動觸發
 */
function checkAuthState() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // 使用者已登入
            console.log('[Auth] Auth state changed: User is logged in.', user.uid);
            showLoading(uiText.loading.authenticating || '驗證身分中...');

            // 獲取 ID token
            try {
                const idToken = await user.getIdToken(true); // true 強制刷新 token
                gameState.setCurrentUser(user, idToken);
                console.log('[Auth] ID Token obtained.');

                // 使用 token 從後端獲取完整的玩家遊戲狀態
                console.log('[Auth] Fetching player state from backend...');
                const playerState = await apiClient.getPlayerState();

                if (playerState && !playerState.error) {
                    console.log('[Auth] Player state received from backend, initializing game...');
                    initializeGame(playerState);
                    showGameScreen();
                } else {
                    console.error('[Auth] Failed to get player state from backend:', playerState.error);
                    showToast(playerState.error || uiText.errorMessages.fetchPlayerStateFailed, 'error');
                    logoutUser(); // 獲取資料失敗，登出使用者
                }
            } catch (error) {
                console.error('[Auth] Error getting ID token or player state:', error);
                showToast(uiText.errorMessages.authenticationFailed, 'error');
                logoutUser(); // 驗證失敗，登出使用者
            } finally {
                hideLoading();
            }
        } else {
            // 使用者已登出或未登入
            console.log('[Auth] Auth state changed: User is logged out.');
            gameState.clear();
            showLoginScreen();
            hideLoading();
        }
    });
}

export { registerUser, loginUser, logoutUser, checkAuthState };