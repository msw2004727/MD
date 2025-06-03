// main.js - 正式模組版本

import * as ApiClient from './api-client.js';
import * as GameState from './game-state.js';
import * as UI from './ui.js';
import * as Auth from './auth.js';
import * as EventHandlers from './event-handlers.js';

function initializeDOMReferences() {
    GameState.elements = {
        themeSwitcherBtn: document.getElementById('theme-switcher-btn'),
        authScreen: document.getElementById('auth-screen'),
        gameContainer: document.getElementById('game-container'),
        dnaCombinationSlotsContainer: document.getElementById('dna-combination-slots'),
        firstDnaFarmTab: document.getElementById('dna-farm-tab-1'),
        // ... 可依照 UI 結構擴充
    };
    console.log("main.js: DOM 元素引用已初始化到 GameState.elements");
}

async function initializeApp() {
    console.log("main.js: Initializing application...");

    initializeDOMReferences();

    try {
        const gameConfigs = await ApiClient.fetchGameConfigsAPI();
        GameState.gameSettings = gameConfigs;
        console.log("main.js: Game configs fetched and stored in GameState.", gameConfigs);

        UI.renderUIBasedOnConfigs(gameConfigs);
        EventHandlers.bindAllEventListeners();
    } catch (error) {
        console.error("main.js: 初始化失敗", error);
        UI.showError("初始化失敗，請稍後再試。");
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
