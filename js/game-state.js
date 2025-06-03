// game-state.js
// 全域狀態集中管理，給所有模組匯入用

const GameState = {
    // --- DOM 元素引用 ---
    // 所有在 HTML 中有 ID 且需要被 JavaScript 頻繁訪問的元素都應該在這裡被引用
    elements: {
        // 主題切換
        themeSwitcherBtn: null,
        themeIcon: null, // 用於顯示月亮/太陽圖標

        // 認證畫面
        authScreen: null,
        gameContainer: null, // 遊戲主內容容器
        showLoginFormBtn: null,
        showRegisterFormBtn: null,
        registerNicknameInput: null,
        registerPasswordInput: null,
        registerErrorDisplay: null,
        registerSubmitBtn: null,
        loginNicknameInput: null,
        loginPasswordInput: null,
        loginErrorDisplay: null,
        loginSubmitBtn: null,
        logoutBtn: null,

        // 頂部導航
        monsterInfoButton: null,
        playerInfoButton: null,
        showMonsterLeaderboardBtn: null,
        showPlayerLeaderboardBtn: null,
        friendsListBtn: null,
        newbieGuideBtn: null,

        // 怪獸快照面板
        monsterSnapshotArea: null,
        monsterImageElement: null, // 快照中的怪獸圖片
        snapshotAchievementTitle: null,
        snapshotNickname: null,
        snapshotWinLoss: null,
        snapshotMainContent: null, // 快照中的屬性/等級/戰力/技能顯示區
        snapshotEvaluation: null,

        // DNA管理頁籤
        dnaCombinationSlotsContainer: null, // DNA組合槽的父容器
        combineButton: null,
        inventoryItemsContainer: null, // DNA碎片庫存區
        drawDnaBtn: null, // 抽DNA按鈕
        inventoryDeleteSlot: null, // 刪除區
        temporaryBackpackItemsContainer: null, // 臨時背包區

        // 怪物農場頁籤
        farmedMonstersList: null, // 怪物農場列表容器
        farmEmptyMessage: null, // 農場空訊息

        // 模態框通用元素 (feedbackModal, confirmationModal, etc. 應該在各自的 UI 函式中獲取或傳遞)
        // 這裡只列出需要全域引用的模態框相關元素
        feedbackModal: null,
        feedbackModalTitle: null,
        feedbackModalSpinner: null,
        feedbackModalCloseX: null,
        feedbackModalMessage: null,
        feedbackMonsterDetailsDiv: null,

        // 確認模態框
        confirmationModal: null,
        confirmationModalTitle: null,
        confirmationModalBody: null,
        confirmationMessage: null,
        confirmActionBtn: null,
        cancelActionBtn: null,
        releaseMonsterImagePlaceholder: null, // 放生怪獸圖片預覽區
        releaseMonsterImgPreview: null, // 放生怪獸圖片

        // 修煉設定模態框
        cultivationSetupModal: null,
        cultivationSetupModalTitle: null,
        cultivationMonsterName: null,
        startCultivationBtn: null,
        maxCultivationTime: null,

        // 修煉成果模態框
        trainingResultsModal: null,
        trainingResultsModalTitle: null,
        trainingStoryResult: null,
        trainingGrowthResult: null,
        trainingItemsResult: null,
        addAllToTempBackpackBtn: null,
        trainingResultsModalFinalCloseBtn: null, // 修煉成果模態框最終關閉按鈕

        // 新手指南模態框
        newbieGuideModal: null,
        newbieGuideSearchInput: null,
        newbieGuideContentArea: null,

        // 提醒模態框 (修煉拾獲物品未領取)
        reminderModal: null,
        reminderModalTitle: null,
        reminderModalBody: null,
        reminderConfirmCloseBtn: null,
        reminderCancelBtn: null,

        // 好友名單模態框
        friendsListModal: null,
        friendsListSearchInput: null,
        friendsListContainer: null, // 顯示好友列表的容器

        // 戰鬥記錄模態框
        battleLogModal: null,
        battleLogArea: null,
        battleLogEmptyMessage: null,

        // DNA 抽取結果模態框
        dnaDrawModal: null,
        dnaDrawResultsGrid: null,

        // 排行榜模態框
        monsterLeaderboardModal: null,
        monsterLeaderboardElementTabs: null, // 怪獸排行榜元素篩選頁籤容器
        monsterLeaderboardTable: null,
        monsterLeaderboardEmptyMessage: null,
        playerLeaderboardModal: null,
        playerLeaderboardTable: null,
        playerLeaderboardEmptyMessage: null,

        // 怪獸資訊模態框
        monsterInfoModal: null,
        monsterInfoModalHeaderContent: null,
        monsterInfoTabs: null,
        monsterDetailsTab: null,
        monsterActivityLogs: null,
        monsterPersonalityText: null,
        monsterIntroductionText: null,
        monsterEvaluationText: null,

        // 玩家資訊模態框
        playerInfoModal: null,
        playerInfoNickname: null,
        playerInfoUid: null,
        playerInfoWins: null,
        playerInfoLosses: null,
        playerInfoGold: null,
        playerInfoDiamond: null,
        playerInfoAchievements: null,
        playerInfoAchievementsEmptyMessage: null,
        playerInfoOwnedMonsters: null,
        playerInfoOwnedMonstersEmptyMessage: null,

        // 頁籤按鈕 (用於初始選擇)
        firstDnaFarmTab: null, // 初始 DNA/農場頁籤
    },

    // --- 遊戲設定 ---
    gameSettings: {
        dnaFragments: [],
        rarities: {},
        skills: {},
        personalities: {},
        titles: [],
        healthConditions: [],
        newbie_guide: [], // 這裡應該是 newbie_guide，與 API 返回的鍵名一致
        value_settings: {
            max_farm_slots: 10,
            max_monster_skills: 3,
            max_battle_turns: 30,
            max_temp_backpack_slots: 18, // 確保這裡有定義
            max_inventory_slots: 10,    // 確保這裡有定義
            max_combination_slots: 5,   // 確保這裡有定義
        },
        npc_monsters: [],
        // ... 其他必要的預設設定鍵
    },

    // --- 玩家數據 ---
    currentLoggedInUser: null, // 當前登入的使用者 Firebase Auth 物件
    playerData: { // 玩家的遊戲數據，從 Firestore 載入
        uid: null,
        nickname: null,
        email: null, // 如果使用 email 登入
        wins: 0,
        losses: 0,
        gold: 0,
        diamond: 0,
        achievements: [],
        ownedMonsters: [], // 玩家擁有的怪獸列表
        playerOwnedDNA: [], // 玩家擁有的 DNA 碎片列表
        temporaryBackpackSlots: [], // 臨時背包物品列表
        combinationSlotsData: [], // DNA組合槽的數據
        // ... 其他玩家相關數據
    },

    // --- 遊戲狀態數據 ---
    currentMonster: null, // 當前在快照面板上顯示的怪獸
    farmedMonsters: [], // 玩家農場中的怪獸列表
    battlingMonsterId: null, // 當前出戰的怪獸 ID
    itemsFromCurrentTraining: [], // 最近一次修煉獲得的物品
    monsterToReleaseInfo: null, // 準備放生的怪獸資訊
    monsterToChallengeInfo: null, // 準備挑戰的怪獸資訊
    currentCultivationMonster: null, // 當前正在修煉的怪獸

    // 庫存和組合槽的顯示數據 (與 playerOwnedDNA 和 combinationSlotsData 同步)
    // 這些是 UI 層次的數據，用於填充槽位
    inventoryDisplaySlots: new Array(10).fill(null), // 庫存顯示槽位
    temporaryBackpackSlots: new Array(18).fill(null), // 臨時背包顯示槽位
    combinationSlotsData: new Array(5).fill(null), // DNA組合槽數據

    // 模態框相關狀態
    itemToDeleteInfo: null, // 準備刪除的物品資訊

    // Firebase 實例 (由 main.js 注入)
    auth: null,
    db: null,
    firebaseApp: null, // Firebase App 實例

    // 常量 (如果它們是固定不變的)
    MAX_FARM_SLOTS: 10,
    NUM_TEMP_BACKPACK_SLOTS: 18,
    NUM_INVENTORY_SLOTS: 10,
    NUM_COMBINATION_SLOTS: 5,
    MAX_CULTIVATION_SECONDS: 999, // 修煉時長上限
    newbieGuideData: [], // 新手指南數據 (從 gameSettings.newbie_guide 填充)

    // --- 數據載入函式 (應該在 auth.js 登入成功後呼叫) ---
    async loadUserData(uid) {
        console.log(`GameState: 載入使用者數據 for UID: ${uid}`);
        try {
            // 從 Firestore 載入玩家基本資料
            const playerDocRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data').doc('profile');
            const playerDoc = await playerDocRef.get();
            if (playerDoc.exists) {
                GameState.playerData = { uid: uid, ...playerDoc.data() };
            } else {
                console.warn(`GameState: 找不到使用者 ${uid} 的個人資料，將使用預設值。`);
                // 如果沒有資料，創建一個新的預設玩家資料
                GameState.playerData = {
                    uid: uid,
                    nickname: `玩家_${uid.substring(0, 5)}`,
                    wins: 0,
                    losses: 0,
                    gold: 100,
                    diamond: 10,
                    achievements: [],
                    ownedMonsters: [],
                    playerOwnedDNA: [],
                    temporaryBackpackSlots: new Array(GameState.NUM_TEMP_BACKPACK_SLOTS).fill(null),
                    combinationSlotsData: new Array(GameState.NUM_COMBINATION_SLOTS).fill(null),
                };
                await playerDocRef.set(GameState.playerData); // 保存預設資料
            }

            // 載入玩家擁有的怪獸
            const monstersCollectionRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data').doc('monsters');
            const monstersDoc = await monstersCollectionRef.get();
            if (monstersDoc.exists && monstersDoc.data().list) {
                GameState.farmedMonsters = monstersDoc.data().list;
            } else {
                GameState.farmedMonsters = [];
            }

            // 載入玩家擁有的 DNA 碎片
            const dnaCollectionRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data').doc('dna');
            const dnaDoc = await dnaCollectionRef.get();
            if (dnaDoc.exists && dnaDoc.data().list) {
                GameState.playerOwnedDNA = dnaDoc.data().list;
            } else {
                GameState.playerOwnedDNA = [];
            }

            // 載入臨時背包
            const tempBackpackRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data').doc('tempBackpack');
            const tempBackpackDoc = await tempBackpackRef.get();
            if (tempBackpackDoc.exists && tempBackpackDoc.data().list) {
                GameState.temporaryBackpackSlots = tempBackpackDoc.data().list;
            } else {
                GameState.temporaryBackpackSlots = new Array(GameState.NUM_TEMP_BACKPACK_SLOTS).fill(null);
            }

            // 載入組合槽數據
            const comboSlotsRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data').doc('combinationSlots');
            const comboSlotsDoc = await comboSlotsRef.get();
            if (comboSlotsDoc.exists && comboSlotsDoc.data().list) {
                GameState.combinationSlotsData = comboSlotsDoc.data().list;
            } else {
                GameState.combinationSlotsData = new Array(GameState.NUM_COMBINATION_SLOTS).fill(null);
            }


            // 設定當前顯示的怪獸 (例如，第一隻怪獸或預設怪獸)
            GameState.currentMonster = GameState.farmedMonsters.length > 0 ? GameState.farmedMonsters[0] : null;

            console.log("GameState: 使用者數據載入完成。", GameState.playerData);
        } catch (error) {
            console.error("GameState: 載入使用者數據失敗：", error);
            // 可以在這裡顯示一個錯誤訊息給使用者
        }
    },

    // --- 數據保存函式 (用於將 GameState 中的數據保存到 Firestore) ---
    async saveUserData() {
        if (!GameState.auth || !GameState.auth.currentUser) {
            console.warn("GameState: 無使用者登入，無法保存數據。");
            return;
        }
        const uid = GameState.auth.currentUser.uid;
        console.log(`GameState: 保存使用者數據 for UID: ${uid}`);
        try {
            const userDocRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data');

            // 保存玩家基本資料
            await userDocRef.doc('profile').set(GameState.playerData, { merge: true });

            // 保存玩家擁有的怪獸
            await userDocRef.doc('monsters').set({ list: GameState.farmedMonsters }, { merge: true });

            // 保存玩家擁有的 DNA 碎片
            await userDocRef.doc('dna').set({ list: GameState.playerOwnedDNA }, { merge: true });

            // 保存臨時背包
            await userDocRef.doc('tempBackpack').set({ list: GameState.temporaryBackpackSlots }, { merge: true });

            // 保存組合槽數據
            await userDocRef.doc('combinationSlots').set({ list: GameState.combinationSlotsData }, { merge: true });

            console.log("GameState: 使用者數據保存成功。");
        } catch (error) {
            console.error("GameState: 保存使用者數據失敗：", error);
            // 可以在這裡顯示一個錯誤訊息給使用者
        }
    },

    // --- 監聽數據變化並保存 (可選，但建議在 Firestore 應用中實現) ---
    // 這部分通常會在 game-logic.js 或專門的 data-sync.js 中實現
    // 例如，當 GameState.playerData 或 GameState.farmedMonsters 改變時觸發保存
};

// 導出 GameState 物件，供其他模組導入和使用
export { GameState };
