// auth.js - 使用者驗證模組

/**
 * 偽導入 - 在一個真正的模組化系統中，您會像這樣導入：
 * import { auth, db, firebase } from './firebase-config.js'; // Firebase 實例
 * import * as GameState from './game-state.js'; // 遊戲狀態和 DOM 元素引用
 * import { openModal, closeModal, showFeedbackModal, showAuthScreen, showGameScreenAfterLogin, updatePlayerInfoButtonState } from './ui.js'; // UI 操作函式
 * import { loadGameDataForUserLogic, saveInitialPlayerDataToBackendLogic, resetGameDataForUI, savePlayerDataLogic } from './game-logic.js'; // 遊戲邏輯函式
 */

// --- DOM 元素引用 (理想情況下由 GameState.elements 提供) ---
// const {
//     authScreen, gameContainer,
//     registerNicknameInput, registerPasswordInput, registerErrorDiv,
//     loginNicknameInput, loginPasswordInput, loginErrorDiv,
//     announcementPlayerName, playerInfoButton // playerInfoButton for enabling/disabling
// } = GameState.elements;


// --- 驗證處理函式 ---

export async function handleRegister() {
    const { registerNicknameInput, registerPasswordInput, registerErrorDiv } = GameState.elements;
    const nickname = registerNicknameInput.value.trim();
    const password = registerPasswordInput.value;
    registerErrorDiv.textContent = '';

    if (!nickname || !password) {
        registerErrorDiv.textContent = '暱稱和密碼不能為空。';
        return;
    }
    if (password.length < 6) {
        registerErrorDiv.textContent = '密碼長度至少需要6位。';
        return;
    }

    const emailForAuth = `${nickname.replace(/\s+/g, '_').toLowerCase()}@game.system`;
    UI.showFeedbackModal("註冊中...", "正在為您創建帳號...", true, false); // UI 模組函式

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(emailForAuth, password); // auth 來自 firebase-config.js
        GameState.currentLoggedInUser = userCredential.user;
        GameState.currentPlayerNickname = nickname;

        // 在 Firestore 中創建使用者設定檔 (users/{uid})
        const userDocRef = db.collection('users').doc(GameState.currentLoggedInUser.uid); // db 來自 firebase-config.js
        await userDocRef.set({
            uid: GameState.currentLoggedInUser.uid,
            nickname: nickname,
            email: GameState.currentLoggedInUser.email, // Firebase auth 提供的 email
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), // firebase 來自 firebase-config.js
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 初始化玩家遊戲資料 (users/{uid}/gameData/main)
        // GameState.playerStats 會在 saveInitialPlayerDataToBackendLogic 中被設定
        await GameLogic.saveInitialPlayerDataToBackendLogic(GameState.currentLoggedInUser.uid, nickname, GameState.gameSettings); // gameSettings 來自 GameState

        UI.closeModal('register-modal');
        UI.closeModal('feedback-modal');
        UI.showGameScreenAfterLogin(); // 切換畫面

        await GameLogic.loadGameDataForUserLogic(GameState.currentLoggedInUser.uid, nickname); // 載入/確認遊戲資料

        if (GameState.elements.announcementPlayerName) GameState.elements.announcementPlayerName.textContent = nickname;
        UI.openModal('official-announcement-modal'); // 顯示官方公告

    } catch (error) {
        console.error("註冊失敗:", error);
        registerErrorDiv.textContent = `註冊失敗：${error.code === 'auth/email-already-in-use' ? '此暱稱已被使用。' : error.message}`;
        UI.closeModal('feedback-modal');
    }
}

export async function handleLogin() {
    const { loginNicknameInput, loginPasswordInput, loginErrorDiv } = GameState.elements;
    const nickname = loginNicknameInput.value.trim();
    const password = loginPasswordInput.value;
    loginErrorDiv.textContent = '';

    if (!nickname || !password) {
        loginErrorDiv.textContent = '暱稱和密碼不能為空。';
        return;
    }
    const emailForAuth = `${nickname.replace(/\s+/g, '_').toLowerCase()}@game.system`;
    UI.showFeedbackModal("登入中...", "正在驗證您的身份...", true, false);

    try {
        const userCredential = await auth.signInWithEmailAndPassword(emailForAuth, password); // auth 來自 firebase-config.js
        GameState.currentLoggedInUser = userCredential.user;

        // 從 Firestore 獲取或確認暱稱，並更新 lastLogin
        const userDocRef = db.collection('users').doc(GameState.currentLoggedInUser.uid); // db 來自 firebase-config.js
        const userDocSnap = await userDocRef.get();

        if (userDocSnap.exists) {
            GameState.currentPlayerNickname = userDocSnap.data().nickname || nickname; // 優先使用DB中的暱稱
            await userDocRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
        } else {
            // 理論上，如果能登入成功，users 文件應該存在。這是一個備援。
            GameState.currentPlayerNickname = nickname;
            await userDocRef.set({
                uid: GameState.currentLoggedInUser.uid,
                nickname: nickname,
                email: GameState.currentLoggedInUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(), // 首次登入也記錄創建時間
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
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
            loginErrorDiv.textContent = '查無此帳號或密碼錯誤。';
        } else {
            loginErrorDiv.textContent = `登入失敗：${error.message}`;
        }
        UI.closeModal('feedback-modal');
    }
}

export async function handleLogout() {
    UI.showFeedbackModal("登出中...", "正在儲存您的進度並登出...", true, false);
    await GameLogic.savePlayerDataLogic(); // 確保遊戲資料已儲存

    try {
        await auth.signOut(); // auth 來自 firebase-config.js
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
    auth.onAuthStateChanged(async (user) => { // auth 來自 firebase-config.js
        const { feedbackModal, feedbackModalTitle } = GameState.elements;
        if (user) {
            GameState.currentLoggedInUser = user;
            const userDocRef = db.collection('users').doc(user.uid); // db 來自 firebase-config.js
            const userDocSnap = await userDocRef.get();

            if (userDocSnap.exists) {
                GameState.currentPlayerNickname = userDocSnap.data().nickname || user.email.split('@')[0];
            } else {
                // 如果使用者在 Firebase Auth 中存在，但在 Firestore users 集合中不存在
                // (例如，資料庫被手動刪除但 Auth 記錄仍在)，則創建基本 profile 並初始化遊戲資料
                console.warn(`使用者 ${user.uid} 在 Auth 中存在，但在 Firestore users 集合中不存在。將創建 profile 並初始化遊戲資料。`);
                GameState.currentPlayerNickname = user.email.split('@')[0]; // 使用 email 前綴作為臨時暱稱
                await userDocRef.set({
                    uid: user.uid,
                    nickname: GameState.currentPlayerNickname,
                    email: user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
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

// --- 偽 GameState, UI, GameLogic, ApiClient, firebase, auth, db ---
// 這些是為了讓此檔案在概念上能獨立運行，實際應從各模組導入
const GameState = {
    elements: { /* DOM 元素引用會在此處 */
        registerNicknameInput: { value: '' }, registerPasswordInput: { value: '' }, registerErrorDiv: { textContent: '' },
        loginNicknameInput: { value: '' }, loginPasswordInput: { value: '' }, loginErrorDiv: { textContent: '' },
        announcementPlayerName: { textContent: '' }, playerInfoButton: { disabled: true },
        authScreen: { style: { display: '' } }, gameContainer: { style: { display: 'none' } },
        feedbackModal: { style: { display: '' } }, feedbackModalTitle: { textContent: '' },
    },
    currentLoggedInUser: null,
    currentPlayerNickname: "",
    playerStats: {}, // 初始為空物件
    gameSettings: {}, // 初始為空物件
    // ... 其他需要的 game state 屬性
};

const UI = {
    showFeedbackModal: (title, msg, spinner, closeX) => console.log(`UI.showFeedbackModal: ${title}, ${msg}`),
    closeModal: (id) => console.log(`UI.closeModal: ${id}`),
    openModal: (id) => console.log(`UI.openModal: ${id}`),
    showAuthScreen: () => { GameState.elements.authScreen.style.display = 'flex'; GameState.elements.gameContainer.style.display = 'none'; console.log("UI.showAuthScreen called"); },
    showGameScreenAfterLogin: () => { GameState.elements.authScreen.style.display = 'none'; GameState.elements.gameContainer.style.display = 'flex'; console.log("UI.showGameScreenAfterLogin called"); },
    updatePlayerInfoButtonState: (enable) => { GameState.elements.playerInfoButton.disabled = !enable; console.log(`UI.updatePlayerInfoButtonState: ${enable}`);}
};

const GameLogic = {
    loadGameDataForUserLogic: async (uid, nickname) => console.log(`GameLogic.loadGameDataForUserLogic for ${uid}, ${nickname}`),
    saveInitialPlayerDataToBackendLogic: async (uid, nickname, gs) => console.log(`GameLogic.saveInitialPlayerDataToBackendLogic for ${uid}, ${nickname}`),
    resetGameDataForUI: () => console.log("GameLogic.resetGameDataForUI called"),
    savePlayerDataLogic: async () => console.log("GameLogic.savePlayerDataLogic called")
};

// 模擬 Firebase 實例 (實際應從 firebase-config.js 導入)
const firebase = {
    initializeApp: () => {},
    auth: () => ({
        createUserWithEmailAndPassword: async (email, pass) => ({ user: { uid: 'test-uid-' + Date.now(), email: email } }),
        signInWithEmailAndPassword: async (email, pass) => ({ user: { uid: 'test-uid-' + Date.now(), email: email } }),
        signOut: async () => {},
        onAuthStateChanged: (callback) => {
            // 模擬一個初始未登入狀態
            // setTimeout(() => callback(null), 100);
        },
        currentUser: null // 初始為 null
    }),
    firestore: {
        FieldValue: {
            serverTimestamp: () => new Date() // 模擬伺服器時間戳
        }
    }
};
// 初始化模擬的 Firebase auth 和 db
const auth = firebase.auth();
const db = {
    collection: (collectionName) => ({
        doc: (docId) => ({
            get: async () => ({
                exists: false, // 模擬文件不存在
                data: () => null
            }),
            set: async (data, options) => console.log(`Firestore SET: ${collectionName}/${docId}`, data, options),
            update: async (data) => console.log(`Firestore UPDATE: ${collectionName}/${docId}`, data)
        })
    })
};
