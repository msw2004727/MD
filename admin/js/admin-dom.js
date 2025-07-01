// admin/js/admin-dom.js
// 統一管理所有後台儀表板的 DOM 元素獲取

function initializeDOMElements() {
    const DOMElements = {
        navItems: document.querySelectorAll('.nav-item'),
        contentPanels: document.querySelectorAll('.content-panel'),
        logoutBtn: document.getElementById('logout-btn'),
        currentTimeEl: document.getElementById('current-time'),
        
        // 總覽
        generateReportBtn: document.getElementById('generate-report-btn'),
        overviewReportContainer: document.getElementById('overview-report-container'),
        wipeAllDataBtn: document.getElementById('wipe-all-data-btn'),
        
        // 玩家管理
        searchInput: document.getElementById('player-search-input'),
        searchBtn: document.getElementById('player-search-btn'),
        searchResultsContainer: document.getElementById('player-search-results'),
        dataDisplay: document.getElementById('player-data-display'),
        playerLogSection: document.getElementById('player-log-section'),
        playerLogFilters: document.getElementById('player-log-filters'),
        playerLogDisplay: document.getElementById('player-log-display'),
        
        // 廣播
        broadcastSenderNameInput: document.getElementById('broadcast-sender-name'),
        broadcastSenderPresetsSelect: document.getElementById('broadcast-sender-presets'),
        saveSenderNameBtn: document.getElementById('save-sender-name-btn'),
        broadcastBtn: document.getElementById('broadcast-mail-btn'),
        broadcastResponseEl: document.getElementById('broadcast-response'),
        refreshLogBtn: document.getElementById('refresh-log-btn'),
        broadcastLogContainer: document.getElementById('broadcast-log-container'),
        
        csMailContainer: document.getElementById('cs-mail-container'),
        refreshCsMailBtn: document.getElementById('refresh-cs-mail-btn'),
        
        // 冒險島設定
        advSettings: {
            bossMultiplierInput: document.getElementById('boss-difficulty-multiplier'),
            facilitiesContainer: document.getElementById('adventure-facilities-container'),
            saveBtn: document.getElementById('save-adventure-settings-btn'),
            responseEl: document.getElementById('adventure-settings-response'),
            growthFacilitiesContainer: document.getElementById('adventure-growth-facilities-container'),
            growthStatsContainer: document.getElementById('adventure-growth-stats-container'),
            saveGrowthBtn: document.getElementById('save-adventure-growth-settings-btn'),
            growthResponseEl: document.getElementById('adventure-growth-settings-response'),
        },

        // 冠軍守衛設定
        guardianSettings: {
            container: document.getElementById('champion-guardians-container'),
            saveBtn: document.getElementById('save-champion-guardians-btn'),
            responseEl: document.getElementById('champion-guardians-response'),
        },

        // 修煉設定
        cultivationSettings: {
            dnaFindChanceInput: document.getElementById('cult-dna-find-chance'),
            dnaFindDivisorInput: document.getElementById('cult-dna-find-divisor'),
            lootTableContainer: document.getElementById('cultivation-loot-table-container'),
            statGrowthContainer: document.getElementById('cultivation-stat-growth-container'),
            saveBtn: document.getElementById('save-cultivation-settings-btn'),
            responseEl: document.getElementById('cultivation-settings-response'),
        },

        // 遊戲機制
        mechanics: {
            critMultiplier: document.getElementById('mech-crit-multiplier'),
            dmgFormulaBase: document.getElementById('mech-dmg-formula-base'),
            dmgFormulaScaling: document.getElementById('mech-dmg-formula-scaling'),
            cultDiminishBase: document.getElementById('mech-cult-diminish-base'),
            cultDiminishWindow: document.getElementById('mech-cult-diminish-window'),
            cultBondGain: document.getElementById('mech-cult-bond-gain'),
            expGainDivisor: document.getElementById('mech-exp-gain-divisor'),
            statPointsMin: document.getElementById('mech-stat-points-min'),
            statPointsMax: document.getElementById('mech-stat-points-max'),
            elementBias: document.getElementById('mech-element-bias'),
            saveBtn: document.getElementById('save-mechanics-btn'),
            responseEl: document.getElementById('mechanics-response'),
        },
        
        // 屬性相剋面板的元素
        elementalAdvantage: {
            container: document.getElementById('elemental-advantage-table-container'),
            saveBtn: document.getElementById('save-elemental-chart-btn'),
            responseEl: document.getElementById('elemental-chart-response'),
        }
    };
    return DOMElements;
}
