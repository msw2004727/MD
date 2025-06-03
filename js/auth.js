// auth.js - 使用者驗證模組

import { auth, db, firebaseApp, __app_id } from './firebase-config.js'; // Firebase 實例和 __app_id
import * as GameState from './game-state.js'; // 遊戲狀態和 DOM 元素引用
import * as UI from './ui.js'; // UI 操作函式
import * as GameLogic from './game-logic.js'; // 遊戲邏輯函式
// 移除對 FieldValue 的直接導入，因為 Firebase v8 不會這樣導出它
// import { FieldValue } from 'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js'; 

// --- 驗證處理函式 ---

export async function handleRegister() {
    const { registerNicknameInput, registerPasswordInput, registerErrorDisplay } = GameState.elements;
    const nickname = registerNicknameInput.value.trim();
    const password = registerPasswordInput.value;
    registerErrorDisplay.textContent = '';

    if (!nickname || !password) {
        registerErrorDisplay.textContent = '暱稱和密碼不能為空。';
        return;
    }
    if (password.length < 6) {
        registerErrorDisplay.textContent = '密碼長度至少需要6位。';
        return;
    }

    const emailForAuth = `${nickname.replace(/\s+/g, '_').toLowerCase()}@game.system`;
    UI.showFeedbackModal("註冊中...", "正在為您創建帳號...", true, false); // UI 模組函式

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(emailForAuth, password);
        GameState.currentLoggedInUser = userCredential.user;
        GameState.currentPlayerNickname = nickname;

        // 在 Firestore 中創建使用者設定檔 (artifacts/__app_id/users/{uid}/data/profile)
        const userProfileDocRef = db.collection('artifacts').doc(__app_id).collection('users').doc(GameState.currentLoggedInUser.uid).collection('data').doc('profile');
        await userProfileDocRef.set({
            uid: GameState.currentLoggedInUser.uid,
            nickname: nickname,
            email: GameState.currentLoggedInUser.email,
            createdAt: db.FieldValue.serverTimestamp(), // 改為 db.FieldValue.serverTimestamp()
            lastLogin: db.FieldValue.serverTimestamp()  // 改為 db.FieldValue.serverTimestamp()
        }, { merge: true });

        // 初始化玩家遊戲資料 (users/{uid}/gameData/main)
        await GameLogic.saveInitialPlayerDataToBackendLogic(GameState.currentLoggedInUser.uid, nickname, GameState.gameSettings); // gameSettings 來自 GameState

        UI.closeModal('register-modal');
        UI.closeModal('feedback-modal');
        UI.showGameScreenAfterLogin(); // 切換畫面

        await GameLogic.loadGameDataForUserLogic(GameState.currentLoggedInUser.uid, nickname); // 載入/確認遊戲資料

        if (GameState.elements.announcementPlayerName) GameState.elements.announcementPlayerName.textContent = nickname;
        UI.openModal('official-announcement-modal'); // 顯示官方公告

    } catch (error) {
        console.error("註冊失敗:", error);
        registerErrorDisplay.textContent = `註冊失敗：${error.code === 'auth/email-already-in-use' ? '此暱稱已被使用。' : error.message}`;
        UI.closeModal('feedback-modal');
    }
}

export async function handleLogin() {
    const { loginNicknameInput, loginPasswordInput, loginErrorDisplay } = GameState.elements;
    const nickname = loginNicknameInput.value.trim();
    const password = loginPasswordInput.value;
    loginErrorDisplay.textContent = '';

    if (!nickname || !password) {
        loginErrorDisplay.textContent = '暱稱和密碼不能為空。';
        return;
    }
    const emailForAuth = `${nickname.replace(/\s+/g, '_').toLowerCase()}@game.system`;
    UI.showFeedbackModal("登入中...", "正在驗證您的身份...", true, false);

    try {
        const userCredential = await auth.signInWithEmailAndPassword(emailForAuth, password);
        GameState.currentLoggedInUser = userCredential.user;

        // 從 Firestore 獲取或確認暱稱，並更新 lastLogin
        const userProfileDocRef = db.collection('artifacts').doc(__app_id).collection('users').doc(GameState.currentLoggedInUser.uid).collection('data').doc('profile');
        const userDocSnap = await userProfileDocRef.get();

        if (userDocSnap.exists) {
            GameState.currentPlayerNickname = userDocSnap.data().nickname || nickname; // 優先使用DB中的暱稱
            await userProfileDocRef.update({ lastLogin: db.FieldValue.serverTimestamp() }); // 改為 db.FieldValue.serverTimestamp()
        } else {
            // 理論上，如果能登入成功，users 文件應該存在。這是一個備援。
            GameState.currentPlayerNickname = nickname;
            await userProfileDocRef.set({
                uid: GameState.currentLoggedInUser.uid,
                nickname: nickname,
                email: GameState.currentLoggedInUser.email,
                createdAt: db.FieldValue.serverTimestamp(), // 改為 db.FieldValue.serverTimestamp()
                lastLogin: db.FieldValue.serverTimestamp()  // 改為 db.FieldValue.serverTimestamp()
            }, { merge: true });
            // 為防意外，也為這種情況初始化遊戲資料
            await GameLogic.saveInitialPlayerDataToBackendLogic(GameState.currentLoggedInUser.uid, nickname, GameState.gameSettings);
        }

        UI.closeModal('login-modal');
        UI.closeModal('feedback-modal');
        UI.showGameScreenAfterLogin();

        await GameLogic.loadGameDataForUserLogic(GameState.currentLoggedInUser.uid, GameState.currentPlayerNickname);

        if (GameState.elements.announcementPlayerName) GameState.elements.announcementPlayerName.textContent = GameState.currentPlayerNickname;
        UI.openModal('official-announcement-modal');

    } catch (error) {
        console.error("登入失敗 (原始錯誤):", error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || (error.message && error.message.includes("INVALID_LOGIN_CREDENTIALS"))) {
            loginErrorDisplay.textContent = '查無此帳號或密碼錯誤。';
        } else {
            loginErrorDisplay.textContent = `登入失敗：${error.message}`;
        }
        UI.closeModal('feedback-modal');
    }
}

export async function handleLogout() {
    UI.showFeedbackModal("登出中...", "正在儲存您的進度並登出...", true, false);
    await GameLogic.savePlayerDataLogic(); // 確保遊戲資料已儲存

    try {
        await auth.signOut();
        // onAuthStateChanged 會處理後續的 UI 重設
        console.log("使用者已登出。");
    } catch (error) {
        console.error("登出失敗:", error);
        UI.showFeedbackModal("錯誤", `登出時發生錯誤: ${error.message}`, false, true, false);
    } finally {
        // UI.closeModal('feedback-modal'); // onAuthStateChanged 之後 feedback modal 可能已被關閉
    }
}

// --- Firebase Auth State Listener ---
export function initializeAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        const { feedbackModal, feedbackModalTitle } = GameState.elements;
        if (user) {
            GameState.currentLoggedInUser = user;
            const userProfileDocRef = db.collection('artifacts').doc(__app_id).collection('users').doc(user.uid).collection('data').doc('profile');
            const userDocSnap = await userProfileDocRef.get();

            if (userDocSnap.exists) {
                GameState.currentPlayerNickname = userDocSnap.data().nickname || user.email.split('@')[0];
            } else {
                // 如果使用者在 Firebase Auth 中存在，但在 Firestore users 集合中不存在
                // (例如，資料庫被手動刪除但 Auth 記錄仍在)，則創建基本 profile 並初始化遊戲資料
                console.warn(`使用者 ${user.uid} 在 Auth 中存在，但在 Firestore users 集合中不存在。將創建 profile 並初始化遊戲資料。`);
                GameState.currentPlayerNickname = user.email.split('@')[0]; // 使用 email 前綴作為臨時暱稱
                await userProfileDocRef.set({
                    uid: user.uid,
                    nickname: GameState.currentPlayerNickname,
                    email: user.email,
                    createdAt: db.FieldValue.serverTimestamp(),
                    lastLogin: db.FieldValue.serverTimestamp()
                }, { merge: true });
                // 為此使用者初始化遊戲資料
                await GameLogic.saveInitialPlayerDataToBackendLogic(user.uid, GameState.currentPlayerNickname, GameState.gameSettings);
                // 由於是新初始化的，直接載入這些新資料
                await GameLogic.loadGameDataForUserLogic(user.uid, GameState.currentPlayerNickname);
            }
            console.log("Firebase 使用者已登入 (onAuthStateChanged):", GameState.currentLoggedInUser.uid, GameState.currentPlayerNickname);
            // UI.updatePlayerInfoButtonState(true); // 啟用玩家資訊按鈕

            // 檢查遊戲是否已經顯示，如果沒有（例如頁面刷新時），則不自動顯示遊戲畫面，
            // 而是等待使用者明確的登入/註冊操作。
            // 如果 gameContainer 已經可見 (display !== 'none')，則表示是剛完成登入/註冊流程，不需要切回 authScreen。
            if (GameState.elements.gameContainer.style.display === 'none') {
                 UI.showAuthScreen(); // 確保在沒有明確登入操作前顯示驗證畫面
            }

        } else {
            GameState.currentLoggedInUser = null;
            GameState.currentPlayerNickname = "";
            console.log("Firebase 使用者已登出或未登入 (onAuthStateChanged)。");
            GameLogic.resetGameDataForUI(); // 重設遊戲狀態
            UI.showAuthScreen(); // 顯示驗證畫面
            // UI.updatePlayerInfoButtonState(false); // 禁用玩家資訊按鈕
        }

        // 關閉可能還在顯示的載入中/登入中彈窗
        if (feedbackModal && feedbackModal.style.display === 'flex' &&
            (feedbackModalTitle.textContent.includes("載入中") ||
             feedbackModalTitle.textContent.includes("登入中") ||
             feedbackModalTitle.textContent.includes("註冊中") ||
             feedbackModalTitle.textContent.includes("登出中"))) {
            UI.closeModal('feedback-modal');
        }
    });
}
