// game-state.js
// 全域狀態集中管理，給所有模組匯入用

// 導入 Firebase 實例和應用程式 ID
// 注意：GameState.auth, GameState.db, GameState.firebaseApp 將由 main.js 注入
// 因此這裡不需要直接導入 auth, db, firebaseApp。
// 但 __app_id 仍然需要導入，因為它被用於 Firestore 路徑。
import { __app_id } from './firebase-config.js'; 

const GameState = {
    // --- DOM 元素引用 ---
    // 移除 elements 物件的初始化。
    // GameState.elements 將在 main.js 的 initializeDOMReferences 函數中被明確地創建和填充。
    elements: {}, // 將其初始化為一個空物件，但實際填充由 main.js 負責

    // --- 遊戲設定 ---
    gameSettings: {
        dna_fragments: [],
        rarities: {},
        skills: {},
        personalities: {},
        titles: [],
        health_conditions: [],
        newbie_guide: [], 
        value_settings: {
            max_farm_slots: 10,
            max_monster_skills: 3,
            max_battle_turns: 30,
            max_temp_backpack_slots: 18, 
            max_inventory_slots: 10,    
            max_combination_slots: 5,   
            // 確保這些預設值存在，以防後端載入失敗
            element_value_factors: {},
            dna_recharge_conversion_factor: 0.15
        },
        npc_monsters: [], // **確保 npc_monsters 始終為陣列**
        absorption_config: {},
        cultivation_config: {},
        elemental_advantage_chart: {},
        monster_achievements_list: [],
        element_nicknames: {},
        naming_constraints: {},
    },

    // --- 玩家數據 ---
    currentLoggedInUser: null, // 當前登入的使用者 Firebase Auth 物件
    playerData: { // 玩家的遊戲數據，從 Firestore 載入
        uid: null,
        nickname: null,
        email: null, 
        wins: 0,
        losses: 0,
        gold: 0,
        diamond: 0,
        achievements: [],
        ownedMonsters: [], 
        playerOwnedDNA: [], 
        temporaryBackpackSlots: [], 
        combinationSlotsData: [], 
    },

    // --- 遊戲狀態數據 ---
    currentMonster: null, 
    farmedMonsters: [], 
    battlingMonsterId: null, 
    itemsFromCurrentTraining: [], 
    monsterToReleaseInfo: null, 
    monsterToChallengeInfo: null, 
    currentCultivationMonster: null, 

    // 庫存和組合槽的顯示數據 (與 playerOwnedDNA 和 combinationSlotsData 同步)
    inventoryDisplaySlots: new Array(10).fill(null), 
    temporaryBackpackSlots: new Array(18).fill(null), 
    combinationSlotsData: new Array(5).fill(null), 

    // 模態框相關狀態
    itemToDeleteInfo: null, 

    // Firebase 實例 (由 main.js 注入)
    auth: null, // 將由 main.js 注入
    db: null,   // 將由 main.js 注入
    firebaseApp: null, // 將由 main.js 注入

    // 常量 (如果它們是固定不變的)
    MAX_FARM_SLOTS: 10,
    NUM_TEMP_BACKPACK_SLOTS: 18,
    NUM_INVENTORY_SLOTS: 10,
    NUM_COMBINATION_SLOTS: 5,
    MAX_CULTIVATION_SECONDS: 999, 
    newbieGuideData: [], 

    // **新增：用於排行榜的公開數據**
    allPublicMonsters: [],
    allPublicPlayers: [],

    // --- 數據載入函式 (應該在 auth.js 登入成功後呼叫) ---
    async loadUserData(uid) {
        console.log(`GameState: 載入使用者數據 for UID: ${uid}`);
        try {
            // 確保 auth 和 db 實例已在 GameState 中被注入
            if (!GameState.db) {
                console.error("GameState: Firestore DB 實例未初始化。無法載入數據。");
                return;
            }

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
                    playerOwnedDNA: new Array(GameState.NUM_INVENTORY_SLOTS).fill(null), // 使用常量
                    temporaryBackpackSlots: new Array(GameState.NUM_TEMP_BACKPACK_SLOTS).fill(null), // 使用常量
                    combinationSlotsData: new Array(GameState.NUM_COMBINATION_SLOTS).fill(null), // 使用常量
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
        }
    },

    // --- 數據保存函式 (用於將 GameState 中的數據保存到 Firestore) ---
    async saveUserData() {
        // 確保 auth 和 db 實例已在 GameState 中被注入
        if (!GameState.auth || !GameState.auth.currentUser || !GameState.db) {
            console.warn("GameState: 無使用者登入或 DB 實例未初始化，無法保存數據。");
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
        }
    },
};

// 導出 GameState 物件，供其他模組導入和使用
export { GameState };
