// game-state.js
// 全域狀態集中管理，給所有模組匯入用

import { __app_id } from './firebase-config.js'; 

const GameState = {
    // --- DOM 元素引用 ---
    elements: {}, 

    // **修正：在 GameState 頂層明確定義 npcMonsters**
    npcMonsters: [], // 確保這個屬性在 GameState 物件上是可寫的

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
            element_value_factors: {},
            dna_recharge_conversion_factor: 0.15
        },
        absorption_config: {},
        cultivation_config: {},
        elemental_advantage_chart: {},
        monster_achievements_list: [],
        element_nicknames: {},
        naming_constraints: {},
    },

    // --- 玩家數據 ---
    currentLoggedInUser: null,
    playerData: {
        uid: null,
        nickname: null,
        email: null, 
        wins: 0,
        losses: 0,
        gold: 0,
        diamond: 10,
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

    // 庫存和組合槽的顯示數據
    inventoryDisplaySlots: new Array(10).fill(null), 
    temporaryBackpackSlots: new Array(18).fill(null), 
    combinationSlotsData: new Array(5).fill(null), 

    // 模態框相關狀態
    itemToDeleteInfo: null, 

    // Firebase 實例
    auth: null,
    db: null,   
    firebaseApp: null,

    // 常量
    MAX_FARM_SLOTS: 10,
    NUM_TEMP_BACKPACK_SLOTS: 18,
    NUM_INVENTORY_SLOTS: 10,
    NUM_COMBINATION_SLOTS: 5,
    MAX_CULTIVATION_SECONDS: 999, 
    newbieGuideData: [], 

    allPublicMonsters: [],
    allPublicPlayers: [],

    async loadUserData(uid) {
        console.log(`GameState: 載入使用者數據 for UID: ${uid}`);
        try {
            if (!GameState.db) {
                console.error("GameState: Firestore DB 實例未初始化。無法載入數據。");
                return;
            }

            const playerDocRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data').doc('profile');
            const playerDoc = await playerDocRef.get();
            if (playerDoc.exists) {
                GameState.playerData = { uid: uid, ...playerDoc.data() };
            } else {
                console.warn(`GameState: 找不到使用者 ${uid} 的個人資料，將使用預設值。`);
                GameState.playerData = {
                    uid: uid,
                    nickname: `玩家_${uid.substring(0, 5)}`,
                    wins: 0,
                    losses: 0,
                    gold: 100,
                    diamond: 10,
                    achievements: [],
                    ownedMonsters: [],
                    playerOwnedDNA: new Array(GameState.NUM_INVENTORY_SLOTS).fill(null),
                    temporaryBackpackSlots: new Array(GameState.NUM_TEMP_BACKPACK_SLOTS).fill(null),
                    combinationSlotsData: new Array(GameState.NUM_COMBINATION_SLOTS).fill(null),
                };
                await playerDocRef.set(GameState.playerData);
            }

            const monstersCollectionRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data').doc('monsters');
            const monstersDoc = await monstersCollectionRef.get();
            if (monstersDoc.exists && monstersDoc.data().list) {
                GameState.farmedMonsters = monstersDoc.data().list;
            } else {
                GameState.farmedMonsters = [];
            }

            const dnaCollectionRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data').doc('dna');
            const dnaDoc = await dnaCollectionRef.get();
            if (dnaDoc.exists && dnaDoc.data().list) {
                GameState.playerOwnedDNA = dnaDoc.data().list;
            } else {
                GameState.playerOwnedDNA = [];
            }

            const tempBackpackRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data').doc('tempBackpack');
            const tempBackpackDoc = await tempBackpackRef.get();
            if (tempBackpackDoc.exists && tempBackpackDoc.data().list) {
                GameState.temporaryBackpackSlots = tempBackpackDoc.data().list;
            } else {
                GameState.temporaryBackpackSlots = new Array(GameState.NUM_TEMP_BACKPACK_SLOTS).fill(null);
            }

            const comboSlotsRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data').doc('combinationSlots');
            const comboSlotsDoc = await comboSlotsRef.get();
            if (comboSlotsDoc.exists && comboSlotsDoc.data().list) {
                GameState.combinationSlotsData = comboSlotsDoc.data().list;
            } else {
                GameState.combinationSlotsData = new Array(GameState.NUM_COMBINATION_SLOTS).fill(null);
            }

            GameState.currentMonster = GameState.farmedMonsters.length > 0 ? GameState.farmedMonsters[0] : null;

            console.log("GameState: 使用者數據載入完成。", GameState.playerData);
        } catch (error) {
            console.error("GameState: 載入使用者數據失敗：", error);
        }
    },

    async saveUserData() {
        if (!GameState.auth || !GameState.auth.currentUser || !GameState.db) {
            console.warn("GameState: 無使用者登入或 DB 實例未初始化，無法保存數據。");
            return;
        }
        const uid = GameState.auth.currentUser.uid;
        console.log(`GameState: 保存使用者數據 for UID: ${uid}`);
        try {
            const userDocRef = GameState.db.collection('artifacts').doc(__app_id).collection('users').doc(uid).collection('data');

            await userDocRef.doc('profile').set(GameState.playerData, { merge: true });
            await userDocRef.doc('monsters').set({ list: GameState.farmedMonsters }, { merge: true });
            await userDocRef.doc('dna').set({ list: GameState.playerOwnedDNA }, { merge: true });
            await userDocRef.doc('tempBackpack').set({ list: GameState.temporaryBackpackSlots }, { merge: true });
            await userDocRef.doc('combinationSlots').set({ list: GameState.combinationSlotsData }, { merge: true });

            console.log("GameState: 使用者數據保存成功。");
        } catch (error) {
            console.error("GameState: 保存使用者數據失敗：", error);
        }
    },
};

export { GameState };
