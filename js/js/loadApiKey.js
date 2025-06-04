// loadApiKey.js
let deepseekApiKey = "";

export async function loadDeepSeekApiKey() {
    if (deepseekApiKey) return deepseekApiKey; // 已經載入過就不重複載入

    try {
        const response = await fetch('/api_key.txt');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const match = text.match(/deepseek api key\s+(\S+)/i);
        if (match && match[1]) {
            deepseekApiKey = match[1];
            console.log("✅ DeepSeek API Key 載入成功");
            return deepseekApiKey;
        } else {
            throw new Error("找不到符合格式的 DeepSeek API Key");
        }
    } catch (error) {
        console.error("❌ 無法載入 DeepSeek API Key:", error);
        return null;
    }
}
