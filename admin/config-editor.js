// admin/config-editor.js

function initializeConfigEditor(adminApiUrl, adminToken) {
    // 專門獲取此功能需要的 DOM 元素
    const configFileSelector = document.getElementById('config-file-selector');
    const configsDisplayArea = document.getElementById('game-configs-display');
    const saveConfigBtn = document.getElementById('save-config-btn');
    const configResponseEl = document.getElementById('config-response');
    const configSearchInput = document.getElementById('config-search-input');

    // 安全檢查，確保 URL 和 Token 都已傳入
    if (!adminApiUrl || !adminToken) {
        console.error("設定編輯器初始化失敗：缺少 API URL 或 Token。");
        if (configsDisplayArea) {
            configsDisplayArea.value = "錯誤：編輯器未能正確初始化。";
        }
        return;
    }

    if (!configFileSelector || !configsDisplayArea || !saveConfigBtn || !configResponseEl || !configSearchInput) {
        console.warn("Config editor DOM elements are not all present. Aborting initialization.");
        return;
    }

    async function loadAndPopulateConfigsDropdown() {
        if (configFileSelector.options.length > 1 && !configFileSelector.dataset.needsRefresh) return;
        
        configFileSelector.innerHTML = '<option value="">請選擇一個檔案...</option>';
        configFileSelector.disabled = true;
        configsDisplayArea.value = '正在獲取設定檔列表...';
        try {
            const response = await fetch(`${adminApiUrl}/admin/list_configs`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const files = await response.json();
            if (!response.ok) throw new Error(files.error || '無法獲取列表');

            files.forEach(file => {
                const option = new Option(file, file);
                configFileSelector.add(option);
            });
            configFileSelector.dataset.needsRefresh = "false";
            configsDisplayArea.value = '請從上方選擇一個設定檔以檢視或編輯。';
        } catch (err) {
            console.error('載入設定檔列表失敗:', err);
            configsDisplayArea.value = `載入設定檔列表失敗: ${err.message}`;
        } finally {
            configFileSelector.disabled = false;
        }
    }

    async function loadSelectedConfig() {
        const selectedFile = configFileSelector.value;
        configResponseEl.style.display = 'none';
        if (!selectedFile) {
            configsDisplayArea.value = '請從上方選擇一個設定檔以檢視或編輯。';
            saveConfigBtn.disabled = true;
            return;
        }
        
        configsDisplayArea.value = '正在從伺服器獲取資料...';
        saveConfigBtn.disabled = true;
        try {
             const response = await fetch(`${adminApiUrl}/admin/get_config?file=${encodeURIComponent(selectedFile)}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `伺服器錯誤: ${response.status}`);
            
            const content = (typeof result === 'object') ? JSON.stringify(result, null, 2) : result;
            configsDisplayArea.value = content;
            saveConfigBtn.disabled = false;
        } catch (err) {
            configsDisplayArea.value = `載入失敗：${err.message}`;
        }
    }

    async function handleSaveConfig() {
        const selectedFile = configFileSelector.value;
        const content = configsDisplayArea.value;

        if (!selectedFile) {
            alert('請先選擇一個要儲存的檔案。');
            return;
        }
        if (!confirm(`您確定要覆蓋伺服器上的檔案「${selectedFile}」嗎？\n\n如果 JSON 格式錯誤，可能會導致遊戲功能異常！`)) {
            return;
        }

        saveConfigBtn.disabled = true;
        saveConfigBtn.textContent = '儲存中...';
        configResponseEl.style.display = 'none';
        
        try {
            const response = await fetch(`${adminApiUrl}/admin/save_config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify({ file: selectedFile, content: content })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || '儲存失敗');
            
            configResponseEl.textContent = result.message;
            configResponseEl.className = 'admin-response-message success';
        } catch (err) {
            configResponseEl.textContent = `儲存失敗：${err.message}`;
            configResponseEl.className = 'admin-response-message error';
        } finally {
            configResponseEl.style.display = 'block';
            saveConfigBtn.disabled = false;
            saveConfigBtn.textContent = '儲存設定變更';
        }
    }
    
    // --- 核心修改處 START ---
    /**
     * 模糊搜尋函式。
     * @param {string} searchTerm - 使用者輸入的搜尋詞。
     * @param {string} text - 要被搜尋的完整文字 (此處為檔名)。
     * @returns {boolean} - 如果找到匹配則返回 true，否則返回 false。
     */
    function fuzzyMatch(searchTerm, text) {
        let searchIndex = 0;
        for (let i = 0; i < text.length && searchIndex < searchTerm.length; i++) {
            if (text[i] === searchTerm[searchIndex]) {
                searchIndex++;
            }
        }
        return searchIndex === searchTerm.length;
    }

    function filterConfigFiles() {
        const searchTerm = configSearchInput.value.toLowerCase();
        const options = configFileSelector.options;
        
        for (let i = 1; i < options.length; i++) { // 從 1 開始，跳過 "請選擇"
            const option = options[i];
            const fileName = option.text.toLowerCase();
            
            // 使用新的模糊搜尋函式
            if (fuzzyMatch(searchTerm, fileName)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        }
    }
    // --- 核心修改處 END ---

    // 事件綁定
    configFileSelector.addEventListener('change', loadSelectedConfig);
    saveConfigBtn.addEventListener('click', handleSaveConfig);
    configSearchInput.addEventListener('input', filterConfigFiles);

    // 初始載入
    loadAndPopulateConfigsDropdown();
}
