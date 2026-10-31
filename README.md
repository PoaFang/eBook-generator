# 法音流傳 (Fǎyīn Liúchuán)

將印刷書頁的影像（拍照或掃描），透過 AI 視覺 OCR 轉換為電子書，自動跳過讀者手寫的筆記與標註，只保留原始印刷文字。

## 功能特色

- **只抓印刷字，跳過手寫標註**：OCR 指令明確要求 AI 忽略鋼筆/鉛筆的筆記、底線、圈畫、眉批
- **多家主流 AI 服務商**：OpenAI、Google Gemini、Anthropic Claude（視覺 OCR）；DeepSeek（純文字翻譯）
- **多語言輸出**：可選擇保留原文，或翻譯成繁體中文／簡體中文／English／Bahasa Malaysia／Bahasa Indonesia／日本語
- **多語言介面**：UI 支援上述語言切換
- **隱私優先**：API Key 加密儲存在本機（優先使用作業系統金鑰庫，如 macOS Keychain / Windows DPAPI / Linux libsecret；若系統環境不支援則使用本機產生的 AES-256-GCM 金鑰加密），不會上傳到任何伺服器
- **多格式輸出**：EPUB（自建標準格式）、PDF、AZW3/MOBI（透過本機已安裝的 Calibre 轉換）

## 重要：資料流向說明

API Key 僅留在本機，但要完成 OCR／翻譯，**影像內容與文字內容本身**必須以 HTTPS 送到你所填 Key 對應的官方 AI 服務端點（OpenAI / Google / Anthropic / DeepSeek）進行處理，這是雲端 AI 服務運作的必然結果，受該服務商的隱私政策規範。本應用程式沒有自己的伺服器，不會另外收集、轉傳或記錄你的資料。

## 開發

```bash
npm install
npm run dev        # 啟動開發模式
npm run typecheck  # TypeScript 型別檢查
npm run test       # 執行自動化測試
npm run build      # 建置

# 無頭環境（CI/雲端容器）下驗證完整流程是否正常啟動：
# 會確認 preload/contextBridge/IPC 串接、金鑰加密後端選擇、sharp 影像處理皆正常運作
FAYIN_SMOKE_TEST=1 xvfb-run -a npx electron --no-sandbox --disable-gpu .
```

## 開發進度

- [x] Phase 1：核心流程打通（OpenAI OCR、EPUB 匯出、API Key 加密儲存、中英介面）
- [ ] Phase 2：多 AI 服務商（Gemini、Claude、DeepSeek）與翻譯功能、補完繁簡馬印日介面
- [ ] Phase 3：PDF 輸入拆頁、PDF 匯出、章節/封面/書籍資訊編輯
- [ ] Phase 4：Calibre 整合（AZW3/MOBI）、跨平台安裝包打包與發佈
