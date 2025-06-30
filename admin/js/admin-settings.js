// admin/js/admin-settings.js

function initializeAdventureSettings() {
    const DOMElements = window.DOMElements || initializeDOMElements();
    const { advSettings } = DOMElements;

    async function loadAdventureSettings() {
        const { bossMultiplierInput, facilitiesContainer, growthFacilitiesContainer, growthStatsContainer } = advSettings;
        if (!bossMultiplierInput || !growthFacilitiesContainer) return;

        bossMultiplierInput.value = '';
        facilitiesContainer.innerHTML = '<p class="placeholder-text">載入中...</p>';
        growthFacilitiesContainer.innerHTML = '<p class="placeholder-text">載入中...</p>';
        growthStatsContainer.innerHTML = '';

        try {
            const [advSettingsData, islandsData, growthSettings] = await Promise.all([
                window.fetchAdminAPI('/get_config?file=adventure/adventure_settings.json'),
                window.fetchAdminAPI('/get_config?file=adventure/adventure_islands.json'),
                window.fetchAdminAPI('/get_config?file=adventure/adventure_growth_settings.json')
            ]);

            bossMultiplierInput.value = advSettingsData.boss_difficulty_multiplier_per_floor || 1.1;

            if (islandsData && Array.isArray(islandsData) && islandsData.length > 0) {
                const facilities = islandsData[0].facilities || [];
                let facilitiesHtml = '<div class="four-column-grid">';
                facilities.forEach(facility => {
                    facilitiesHtml += `
                        <div class="facility-column-card">
                            <h4>${facility.name}</h4>
                            <div class="form-group">
                                <label for="facility-cost-${facility.facilityId}">入場費</label>
                                <input type="number" id="facility-cost-${facility.facilityId}" data-facility-id="${facility.facilityId}" class="admin-input" value="${facility.cost || 0}">
                            </div>
                            <div class="form-group">
                                <label for="facility-base-gold-${facility.facilityId}">通關基礎金幣</label>
                                <input type="number" id="facility-base-gold-${facility.facilityId}" data-facility-id="${facility.facilityId}" class="admin-input" value="${facility.floor_clear_base_gold || 0}">
                            </div>
                            <div class="form-group">
                                <label for="facility-bonus-gold-${facility.facilityId}">通關額外獎勵</label>
                                <input type="number" id="facility-bonus-gold-${facility.facilityId}" data-facility-id="${facility.facilityId}" class="admin-input" value="${facility.floor_clear_bonus_gold_per_floor || 0}">
                            </div>
                        </div>
                    `;
                });
                facilitiesHtml += '</div>';
                facilitiesContainer.innerHTML = facilitiesHtml;
            } else {
                facilitiesContainer.innerHTML = '<p class="placeholder-text">找不到設施資料。</p>';
            }

            if (growthSettings && growthSettings.facilities) {
                const facilityNames = {};
                islandsData.forEach(island => island.facilities.forEach(f => { facilityNames[f.facilityId] = f.name; }));

                growthFacilitiesContainer.innerHTML = Object.entries(growthSettings.facilities).map(([id, settings]) => `
                    <div class="facility-settings-card">
                        <h4>${facilityNames[id] || id}</h4>
                        <div class="form-group">
                            <label for="growth-chance-${id}">成長觸發機率 (%)</label>
                            <input type="number" id="growth-chance-${id}" data-facility-id="${id}" data-setting="growth_chance" class="admin-input" value="${((settings.growth_chance || 0) * 100).toFixed(1)}" step="0.1" min="0" max="100">
                        </div>
                         <div class="form-group">
                            <label for="growth-points-${id}">成長點數</label>
                            <input type="number" id="growth-points-${id}" data-facility-id="${id}" data-setting="growth_points" class="admin-input" value="${settings.growth_points || 0}" step="1" min="0">
                        </div>
                    </div>
                `).join('');
            } else {
                 growthFacilitiesContainer.innerHTML = '<p class="placeholder-text">找不到成長設定資料。</p>';
            }
            
            if (growthSettings && growthSettings.stat_weights) {
                let statsHtml = `<div class="facility-settings-card"><h4>各項能力成長權重 (數字越大，越容易成長)</h4>`;
                statsHtml += Object.entries(growthSettings.stat_weights).map(([stat, weight]) => `
                    <div class="form-group">
                        <label for="stat-weight-${stat}">${stat.toUpperCase()}</label>
                        <input type="number" id="stat-weight-${stat}" data-stat-name="${stat}" class="admin-input" value="${weight || 0}" step="1" min="0">
                    </div>
                `).join('');
                statsHtml += `</div>`;
                growthStatsContainer.innerHTML = statsHtml;
            }

        } catch (err) {
             facilitiesContainer.innerHTML = `<p style="color: var(--danger-color);">載入冒險島設定失敗：${err.message}</p>`;
             growthFacilitiesContainer.innerHTML = `<p style="color: var(--danger-color);">載入成長設定失敗：${err.message}</p>`;
        }
    }

    async function handleSaveAdventureSettings() {
        const { bossMultiplierInput, facilitiesContainer, saveBtn, responseEl } = advSettings;
        const globalSettings = { boss_difficulty_multiplier_per_floor: parseFloat(bossMultiplierInput.value) || 1.1 };
        const facilitiesSettings = [];
        facilitiesContainer.querySelectorAll('input[data-facility-id]').forEach(input => {
            const facilityId = input.dataset.facilityId;
            if (!facilitiesSettings.some(f => f.id === facilityId)) {
                facilitiesSettings.push({
                    id: facilityId,
                    cost: parseInt(document.getElementById(`facility-cost-${facilityId}`).value, 10) || 0,
                    floor_clear_base_gold: parseInt(document.getElementById(`facility-base-gold-${facilityId}`).value, 10) || 0,
                    floor_clear_bonus_gold_per_floor: parseInt(document.getElementById(`facility-bonus-gold-${facilityId}`).value, 10) || 0,
                });
            }
        });

        saveBtn.disabled = true;
        saveBtn.textContent = '儲存中...';
        responseEl.style.display = 'none';

        try {
            const result = await window.fetchAdminAPI('/save_adventure_settings', {
                method: 'POST', body: JSON.stringify({ global_settings: globalSettings, facilities_settings: facilitiesSettings })
            });
            responseEl.textContent = result.message;
            responseEl.className = 'admin-response-message success';
        } catch (err) {
            responseEl.textContent = `儲存失敗：${err.message}`;
            responseEl.className = 'admin-response-message error';
        } finally {
            responseEl.style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.textContent = '儲存冒險島設定變更';
        }
    }

    async function handleSaveAdventureGrowthSettings() {
        const { growthFacilitiesContainer, growthStatsContainer, saveGrowthBtn, growthResponseEl } = advSettings;
        const newGrowthSettings = { facilities: {}, stat_weights: {} };

        growthFacilitiesContainer.querySelectorAll('input[data-facility-id]').forEach(input => {
            const id = input.dataset.facilityId;
            if (!newGrowthSettings.facilities[id]) newGrowthSettings.facilities[id] = {};
            if (input.dataset.setting === 'growth_chance') {
                newGrowthSettings.facilities[id].growth_chance = parseFloat(input.value) / 100.0;
            } else if (input.dataset.setting === 'growth_points') {
                newGrowthSettings.facilities[id].growth_points = parseInt(input.value, 10);
            }
        });
        growthStatsContainer.querySelectorAll('input[data-stat-name]').forEach(input => {
            newGrowthSettings.stat_weights[input.dataset.statName] = parseInt(input.value, 10);
        });
        
        saveGrowthBtn.disabled = true;
        saveGrowthBtn.textContent = '儲存中...';
        growthResponseEl.style.display = 'none';

        try {
            const result = await window.fetchAdminAPI('/save_adventure_growth_settings', {
                method: 'POST', body: JSON.stringify(newGrowthSettings)
            });
            growthResponseEl.textContent = result.message;
            growthResponseEl.className = 'admin-response-message success';
        } catch (err) {
            growthResponseEl.textContent = `儲存失敗：${err.message}`;
            growthResponseEl.className = 'admin-response-message error';
        } finally {
            growthResponseEl.style.display = 'block';
            saveGrowthBtn.disabled = false;
            saveGrowthBtn.textContent = '儲存隨機成長設定';
        }
    }

    if (advSettings.saveBtn) advSettings.saveBtn.addEventListener('click', handleSaveAdventureSettings);
    if (advSettings.saveGrowthBtn) advSettings.saveGrowthBtn.addEventListener('click', handleSaveAdventureGrowthSettings);

    loadAdventureSettings();
}

function initializeGuardianSettings() {
    const { container, saveBtn, responseEl } = (window.DOMElements || initializeDOMElements()).guardianSettings;

    async function loadChampionGuardians() {
        container.innerHTML = '<p class="placeholder-text">載入中...</p>';
        try {
            const guardians = await window.fetchAdminAPI('/get_config?file=system/champion_guardians.json');
            let html = '';
            for (const rank in guardians) {
                const guardian = guardians[rank];
                html += `
                    <div class="facility-settings-card">
                        <h4>${guardian.nickname} (Rank ${rank.replace('rank','')})</h4>
                        <div class="form-grid">
                            <div class="form-group"><label>HP</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="initial_max_hp" value="${guardian.initial_max_hp}"></div>
                            <div class="form-group"><label>MP</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="initial_max_mp" value="${guardian.initial_max_mp}"></div>
                            <div class="form-group"><label>攻擊</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="attack" value="${guardian.attack}"></div>
                            <div class="form-group"><label>防禦</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="defense" value="${guardian.defense}"></div>
                            <div class="form-group"><label>速度</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="speed" value="${guardian.speed}"></div>
                            <div class="form-group"><label>爆擊</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="crit" value="${guardian.crit}"></div>
                        </div>
                    </div>`;
            }
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<p style="color: var(--danger-color);">載入冠軍守衛設定失敗：${err.message}</p>`;
        }
    }

    async function handleSaveChampionGuardians() {
        const newGuardianData = {};
        container.querySelectorAll('.guardian-stat').forEach(input => {
            const rank = input.dataset.rank;
            const stat = input.dataset.stat;
            if (!newGuardianData[rank]) newGuardianData[rank] = {};
            newGuardianData[rank][stat] = parseInt(input.value, 10);
        });
        saveBtn.disabled = true;
        saveBtn.textContent = '儲存中...';
        responseEl.style.display = 'none';
        try {
            const result = await window.fetchAdminAPI('/save_champion_guardians', { method: 'POST', body: JSON.stringify(newGuardianData) });
            responseEl.textContent = result.message;
            responseEl.className = 'admin-response-message success';
        } catch (err) {
            responseEl.textContent = `儲存失敗：${err.message}`;
            responseEl.className = 'admin-response-message error';
        } finally {
            responseEl.style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.textContent = '儲存守衛設定變更';
        }
    }
    
    if (saveBtn) saveBtn.addEventListener('click', handleSaveChampionGuardians);
    loadChampionGuardians();
}

function initializeCultivationSettings() {
    const { dnaFindChanceInput, dnaFindDivisorInput, lootTableContainer, statGrowthContainer, saveBtn, responseEl } = (window.DOMElements || initializeDOMElements()).cultivationSettings;

    async function loadCultivationSettings() {
        lootTableContainer.innerHTML = '<p class="placeholder-text">載入中...</p>';
        statGrowthContainer.innerHTML = '<p class="placeholder-text">載入中...</p>';
        try {
            const settings = await window.fetchAdminAPI('/get_config?file=system/CultivationSettings.json');
            
            dnaFindChanceInput.value = (settings.dna_find_chance * 100).toFixed(1);
            dnaFindDivisorInput.value = settings.dna_find_duration_divisor;

            const rarities = ["普通", "稀有", "菁英", "傳奇", "神話"];
            let lootTableHtml = '<h4>拾獲DNA稀有度機率 (總和需為100)</h4><div class="form-grid">';
            for (const rarity of rarities) {
                lootTableHtml += `<div class="facility-settings-card" data-monster-rarity="${rarity}"><h5>怪獸稀有度: ${rarity}</h5>`;
                const table = settings.dna_find_loot_table[rarity] || {};
                for (const lootRarity of rarities) {
                    lootTableHtml += `<div class="form-group"><label>${lootRarity} (%)</label><input type="number" class="admin-input cult-loot-chance" data-loot-rarity="${lootRarity}" value="${(table[lootRarity] || 0) * 100}"></div>`;
                }
                lootTableHtml += '</div>';
            }
            lootTableHtml += '</div>';
            lootTableContainer.innerHTML = lootTableHtml;

            let statGrowthHtml = '<h4>各修煉地點數值成長權重</h4>';
            for (const locId in settings.location_biases) {
                const loc = settings.location_biases[locId];
                statGrowthHtml += `<div class="facility-settings-card" data-location-id="${locId}"><h5>${loc.name}</h5><div class="form-grid">`;
                for (const stat in loc.stat_growth_weights) {
                    statGrowthHtml += `<div class="form-group"><label>${stat.toUpperCase()}</label><input type="number" class="admin-input cult-stat-weight" data-stat="${stat}" value="${loc.stat_growth_weights[stat]}"></div>`;
                }
                statGrowthHtml += '</div></div>';
            }
            statGrowthContainer.innerHTML = statGrowthHtml;
        } catch (err) {
            lootTableContainer.innerHTML = `<p style="color: var(--danger-color);">載入失敗：${err.message}</p>`;
            statGrowthContainer.innerHTML = '';
        }
    }

    async function handleSaveCultivationSettings() {
        const newSettings = {
            dna_find_chance: parseFloat(dnaFindChanceInput.value) / 100,
            dna_find_duration_divisor: parseInt(dnaFindDivisorInput.value, 10),
            dna_find_loot_table: {},
            location_biases: {}
        };
        lootTableContainer.querySelectorAll('.facility-settings-card').forEach(card => {
            const monsterRarity = card.dataset.monsterRarity;
            newSettings.dna_find_loot_table[monsterRarity] = {};
            card.querySelectorAll('.cult-loot-chance').forEach(input => {
                newSettings.dna_find_loot_table[monsterRarity][input.dataset.lootRarity] = parseFloat(input.value) / 100;
            });
        });
        statGrowthContainer.querySelectorAll('.facility-settings-card').forEach(card => {
            const locId = card.dataset.locationId;
            newSettings.location_biases[locId] = { name: card.querySelector('h5').textContent, stat_growth_weights: {}, element_bias: [] };
            card.querySelectorAll('.cult-stat-weight').forEach(input => {
                newSettings.location_biases[locId].stat_growth_weights[input.dataset.stat] = parseInt(input.value, 10);
            });
        });

        saveBtn.disabled = true;
        saveBtn.textContent = '儲存中...';
        responseEl.style.display = 'none';
        try {
            const result = await window.fetchAdminAPI('/save_cultivation_settings', { method: 'POST', body: JSON.stringify(newSettings) });
            responseEl.textContent = result.message;
            responseEl.className = 'admin-response-message success';
        } catch (err) {
            responseEl.textContent = `儲存失敗：${err.message}`;
            responseEl.className = 'admin-response-message error';
        } finally {
            responseEl.style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.textContent = '儲存修煉設定';
        }
    }
    
    if (saveBtn) saveBtn.addEventListener('click', handleSaveCultivationSettings);
    loadCultivationSettings();
}

function initializeMechanicsSettings() {
    const { responseEl, saveBtn, ...mechInputs } = (window.DOMElements || initializeDOMElements()).mechanics;

    async function loadGameMechanics() {
        Object.values(mechInputs).forEach(input => input.disabled = true);
        responseEl.style.display = 'none';
        try {
            const data = await window.fetchAdminAPI('/get_config?file=game_mechanics.json');
            mechInputs.critMultiplier.value = data.battle_formulas.crit_multiplier;
            mechInputs.dmgFormulaBase.value = data.battle_formulas.damage_formula_base_multiplier;
            mechInputs.dmgFormulaScaling.value = data.battle_formulas.damage_formula_attack_scaling;
            mechInputs.cultDiminishBase.value = data.cultivation_rules.diminishing_returns_base;
            mechInputs.cultDiminishWindow.value = data.cultivation_rules.diminishing_returns_time_window_seconds;
            mechInputs.cultBondGain.value = data.cultivation_rules.base_bond_gain_on_completion;
            mechInputs.expGainDivisor.value = data.cultivation_rules.exp_gain_duration_divisor;
            mechInputs.statPointsMin.value = data.cultivation_rules.stat_growth_points_per_chance[0];
            mechInputs.statPointsMax.value = data.cultivation_rules.stat_growth_points_per_chance[1];
            mechInputs.elementBias.value = data.cultivation_rules.elemental_bias_multiplier;
            Object.values(mechInputs).forEach(input => input.disabled = false);
        } catch (err) {
            responseEl.textContent = `載入遊戲機制設定失敗：${err.message}`;
            responseEl.className = 'admin-response-message error';
            responseEl.style.display = 'block';
        }
    }
    
    async function handleSaveGameMechanics() {
        const newData = {
            battle_formulas: { crit_multiplier: parseFloat(mechInputs.critMultiplier.value), damage_formula_base_multiplier: parseFloat(mechInputs.dmgFormulaBase.value), damage_formula_attack_scaling: parseFloat(mechInputs.dmgFormulaScaling.value) },
            cultivation_rules: { diminishing_returns_base: parseFloat(mechInputs.cultDiminishBase.value), diminishing_returns_time_window_seconds: parseInt(mechInputs.cultDiminishWindow.value, 10), base_bond_gain_on_completion: parseInt(mechInputs.cultBondGain.value, 10), exp_gain_duration_divisor: parseInt(mechInputs.expGainDivisor.value, 10), stat_growth_points_per_chance: [parseInt(mechInputs.statPointsMin.value, 10), parseInt(mechInputs.statPointsMax.value, 10)], elemental_bias_multiplier: parseFloat(mechInputs.elementBias.value) },
            absorption_rules: { comment: "戰後吸收系統規則 (目前停用)", score_ratio_min_cap: 0.5, score_ratio_max_cap: 2.0, stat_gain_variance: [0.8, 1.2], max_gain_multiplier_for_non_hpmp: 2.0, max_hpmp_stat_growth_on_absorb: 1.05, bonus_hpmp_stat_growth_on_absorb: 0.5 }
        };
        saveBtn.disabled = true;
        saveBtn.textContent = '儲存中...';
        responseEl.style.display = 'none';
        try {
            const result = await window.fetchAdminAPI('/save_game_mechanics', { method: 'POST', body: JSON.stringify(newData) });
            responseEl.textContent = result.message;
            responseEl.className = 'admin-response-message success';
        } catch (err) {
            responseEl.textContent = `儲存失敗：${err.message}`;
            responseEl.className = 'admin-response-message error';
        } finally {
            responseEl.style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.textContent = '儲存機制設定';
        }
    }
    if (saveBtn) saveBtn.addEventListener('click', handleSaveGameMechanics);
    loadGameMechanics();
}

function initializeElementalSettings() {
    const { container, saveBtn, responseEl } = (window.DOMElements || initializeDOMElements()).elementalAdvantage;

    async function loadAndRenderElementalChart() {
        if (!container) return;
        container.innerHTML = '<p class="placeholder-text">正在載入屬性克制表...</p>';
        try {
            const chartData = await window.fetchAdminAPI('/get_config?file=battle/elemental_advantage_chart.json');
            const elements = ["火", "水", "木", "金", "土", "光", "暗", "毒", "風", "無", "混"];
            let tableHTML = '<div class="table-wrapper"><table class="elemental-chart-table"><thead><tr><th>攻擊方 ↓</th>';
            elements.forEach(def => { tableHTML += `<th>${def} (防)</th>`; });
            tableHTML += '</tr></thead><tbody>';
            elements.forEach(atk => {
                tableHTML += `<tr><td>${atk} (攻)</td>`;
                elements.forEach(def => {
                    const value = chartData[atk]?.[def] ?? 1.0;
                    tableHTML += `<td><input type="number" class="admin-input elemental-input" data-atk="${atk}" data-def="${def}" value="${value}" step="0.1"></td>`;
                });
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table></div>';
            container.innerHTML = tableHTML;
        } catch (err) {
            container.innerHTML = `<p class="placeholder-text" style="color:var(--danger-color);">載入克制表失敗：${err.message}</p>`;
        }
    }

    async function handleSaveElementalChart() {
        const newChartData = {};
        container.querySelectorAll('.elemental-input').forEach(input => {
            const atk = input.dataset.atk;
            const def = input.dataset.def;
            if (!newChartData[atk]) newChartData[atk] = {};
            newChartData[atk][def] = parseFloat(input.value) || 1.0;
        });
        saveBtn.disabled = true;
        saveBtn.textContent = '儲存中...';
        responseEl.style.display = 'none';
        try {
            const result = await window.fetchAdminAPI('/save_elemental_advantage', { method: 'POST', body: JSON.stringify(newChartData) });
            responseEl.textContent = result.message;
            responseEl.className = 'admin-response-message success';
        } catch (err) {
            responseEl.textContent = `儲存失敗：${err.message}`;
            responseEl.className = 'admin-response-message error';
        } finally {
            responseEl.style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.textContent = '儲存屬性克制表';
        }
    }
    
    if (saveBtn) saveBtn.addEventListener('click', handleSaveElementalChart);
    loadAndRenderElementalChart();
}
