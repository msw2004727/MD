// admin/js/admin-config-editor.js

function initializeConfigEditor(adminApiUrl, adminToken) {
    const DOMElements = {
        configFileSelector: document.getElementById('config-file-selector'),
        configDisplayArea: document.getElementById('game-configs-display'),
        saveConfigBtn: document.getElementById('save-config-btn'),
        exportConfigBtn: document.getElementById('export-config-btn'),
        configResponseEl: document.getElementById('config-response'),
        configSearchInput: document.getElementById('config-search-input')
    };

    if (!adminApiUrl || !adminToken) {
        console.error("設定編輯器初始化失敗：缺少 API URL 或 Token。");
        if (DOMElements.configDisplayArea) {
            DOMElements.configDisplayArea.value = "錯誤：編輯器未能正確初始化。";
        }
        return;
    }

    if (Object.values(DOMElements).some(el => !el)) {
        console.warn("Config editor DOM elements are not all present. Aborting initialization.");
        return;
    }

    async function loadAndPopulateConfigsDropdown() {
        if (DOMElements.configFileSelector.options.length > 1 && !DOMElements.configFileSelector.dataset.needsRefresh) return;
        
        DOMElements.configFileSelector.innerHTML = '<option value="">請選擇一個檔案...</option>';
        DOMElements.configFileSelector.disabled = true;
        DOMElements.configDisplayArea.value = '正在獲取設定檔列表...';
        try {
            const files = await window.fetchAdminAPI('/list_configs');
            files.forEach(file => {
                const option = new Option(file, file);
                DOMElements.configFileSelector.add(option);
            });
            DOMElements.configFileSelector.dataset.needsRefresh = "false";
            DOMElements.configDisplayArea.value = '請從上方選擇一個設定檔以檢視或編輯。';
        } catch (err) {
            console.error('載入設定檔列表失敗:', err);
            DOMElements.configDisplayArea.value = `載入設定檔列表失敗: ${err.message}`;
        } finally {
            DOMElements.configFileSelector.disabled = false;
        }
    }

    async function loadSelectedConfig() {
        const selectedFile = DOMElements.configFileSelector.value;
        DOMElements.configResponseEl.style.display = 'none';
        DOMElements.saveConfigBtn.disabled = true;
        DOMElements.exportConfigBtn.disabled = true;

        if (!selectedFile) {
            DOMElements.configDisplayArea.value = '請從上方選擇一個設定檔以檢視或編輯。';
            return;
        }
        
        DOMElements.configDisplayArea.value = '正在從伺服器獲取資料...';
        try {
             const result = await window.fetchAdminAPI(`/get_config?file=${encodeURIComponent(selectedFile)}`);
            const content = (typeof result === 'object') ? JSON.stringify(result, null, 2) : result;
            DOMElements.configDisplayArea.value = content;
            DOMElements.saveConfigBtn.disabled = false;
            DOMElements.exportConfigBtn.disabled = false;
        } catch (err) {
            DOMElements.configDisplayArea.value = `載入失敗：${err.message}`;
        }
    }

    async function handleSaveConfig() {
        const selectedFile = DOMElements.configFileSelector.value;
        const content = DOMElements.configDisplayArea.value;

        if (!selectedFile) {
            alert('請先選擇一個要儲存的檔案。');
            return;
        }
        if (!confirm(`您確定要覆蓋伺服器上的檔案「${selectedFile}」嗎？\n\n如果 JSON 格式錯誤，可能會導致遊戲功能異常！`)) {
            return;
        }

        DOMElements.saveConfigBtn.disabled = true;
        DOMElements.saveConfigBtn.textContent = '儲存中...';
        DOMElements.configResponseEl.style.display = 'none';
        
        try {
            const result = await window.fetchAdminAPI('/save_config', {
                method: 'POST',
                body: JSON.stringify({ file: selectedFile, content: content })
            });
            DOMElements.configResponseEl.textContent = result.message;
            DOMElements.configResponseEl.className = 'admin-response-message success';
        } catch (err) {
            DOMElements.configResponseEl.textContent = `儲存失敗：${err.message}`;
            DOMElements.configResponseEl.className = 'admin-response-message error';
        } finally {
            DOMElements.configResponseEl.style.display = 'block';
            DOMElements.saveConfigBtn.disabled = false;
            DOMElements.saveConfigBtn.textContent = '儲存設定變更';
        }
    }
    
    function handleExportConfig() {
        const { configFileSelector, configDisplayArea } = DOMElements;
        const selectedFileOption = configFileSelector.options[configFileSelector.selectedIndex];
        const fullFileNameStr = selectedFileOption.text;
        const content = configDisplayArea.value;

        if (!content || content.startsWith('請從上方選擇') || content.startsWith('正在從伺服器')) {
            alert('沒有可匯出的內容。請先選擇並載入一個設定檔。');
            return;
        }

        const match = fullFileNameStr.match(/([^ (]+)/);
        if (!match) {
            alert('無法從選項中解析出有效的檔案名稱。');
            return;
        }
        const cleanPath = match[1];
        const filename = cleanPath.split('/').pop();

        try {
            JSON.parse(content);
            const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            alert('匯出失敗：目前的內容不是有效的 JSON 格式，請修正後再試。');
        }
    }

    function fuzzyMatch(searchTerm, text) {
        let searchIndex = 0;
        for (let i = 0; i < text.length && searchIndex < searchTerm.length; i++) {
            if (text[i].toLowerCase() === searchTerm[searchIndex].toLowerCase()) {
                searchIndex++;
            }
        }
        return searchIndex === searchTerm.length;
    }

    function filterConfigFiles() {
        const searchTerm = DOMElements.configSearchInput.value;
        const options = DOMElements.configFileSelector.options;
        
        for (let i = 1; i < options.length; i++) {
            const option = options[i];
            if (fuzzyMatch(searchTerm, option.text)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        }
    }

    // 事件綁定
    DOMElements.configFileSelector.addEventListener('change', loadSelectedConfig);
    DOMElements.saveConfigBtn.addEventListener('click', handleSaveConfig);
    DOMElements.exportConfigBtn.addEventListener('click', handleExportConfig);
    DOMElements.configSearchInput.addEventListener('input', filterConfigFiles);

    // 初始載入
    loadAndPopulateConfigsDropdown();
}
