# 法音流傳 (Fǎyīn Liúchuán)

將印刷書頁的影像（拍照或掃描），透過 AI 視覺 OCR 轉換為電子書，自動跳過讀者手寫的筆記與標註，只保留原始印刷文字。

## 功能特色

- **只抓印刷字，跳過手寫標註**：OCR 指令明確要求 AI 忽略鋼筆/鉛筆的筆記、底線、圈畫、眉批
- **多家主流 AI 服務商**：OpenAI、Google Gemini、Anthropic Claude（視覺 OCR）；DeepSeek（純文字翻譯，目前無穩定可用的視覺模型）
- **圖片與 PDF 輸入**：可匯入多張圖片，也可匯入多頁 PDF 掃描檔（自動拆頁為各頁影像）
- **章節、封面、書籍資訊編輯**：可將數頁合併為一章、調整頁面順序、設定書名/作者/封面圖
- **多語言輸出**：可選擇保留原文，或翻譯成繁體中文／簡體中文／English／Bahasa Malaysia／Bahasa Indonesia／日本語
- **多語言介面**：UI 支援上述語言切換
- **隱私優先**：API Key 加密儲存在本機（優先使用作業系統金鑰庫，如 macOS Keychain / Windows DPAPI / Linux libsecret 等「真正」的金鑰庫；若偵測到系統環境退回到不安全的替代方案，或完全沒有金鑰庫，則改用本機產生的 AES-256-GCM 金鑰加密），不會上傳到任何伺服器
- **多格式輸出**：EPUB（自建標準格式）、PDF（Electron 內建 Chromium 列印）、AZW3/MOBI（透過本機已安裝的 Calibre 轉換）

## 重要：資料流向說明

API Key 僅留在本機，但要完成 OCR／翻譯，**影像內容與文字內容本身**必須以 HTTPS 送到你所填 Key 對應的官方 AI 服務端點（OpenAI / Google / Anthropic / DeepSeek）進行處理，這是雲端 AI 服務運作的必然結果，受該服務商的隱私政策規範。本應用程式沒有自己的伺服器，不會另外收集、轉傳或記錄你的資料。

## 已知限制

- **AZW3/MOBI 需要本機安裝 Calibre**：免費開源（calibre-ebook.com）。若沒有安裝，應用程式會提示並建議改用 EPUB（Amazon 自 2022 年起 Send to Kindle 已可直接接受 EPUB）。
- **macOS / Windows 安裝包目前未簽章**：macOS Gatekeeper 會要求使用者在「系統設定 > 隱私權與安全性」允許，或右鍵「打開」才能執行；Windows SmartScreen 會顯示警告但仍可選擇「仍要執行」。要完全消除這些警告，需要付費的 Apple Developer 憑證（每年約 99 美元）與 Windows 程式碼簽章憑證，這部分需要你自行決定是否購買、設定。
- 本開發環境僅為 Linux 容器，因此只實際建置並驗證過 Linux 版安裝包（AppImage、.deb）；Windows / macOS 安裝包由 `.github/workflows/release.yml` 的 CI 在對應平台上建置（這是業界標準做法，原生依賴如 sharp 的平台專屬二進位檔無法可靠地跨平台編譯）。

## 開發

```bash
npm install
npm run dev        # 啟動開發模式
npm run typecheck  # TypeScript 型別檢查
npm run test       # 執行自動化測試
npm run build      # 建置
npm run dist:linux # 打包 Linux 安裝檔（AppImage + .deb）
npm run dist:mac   # 打包 macOS 安裝檔（需在 macOS 上執行）
npm run dist:win   # 打包 Windows 安裝檔（需在 Windows 上執行，或有對應交叉編譯工具）

# 無頭環境（CI/雲端容器）下驗證完整流程是否正常啟動：
# 會確認 preload/contextBridge/IPC 串接、金鑰加密後端選擇、sharp 影像處理、
# EPUB/PDF 匯出、Calibre 偵測皆正常運作
FAYIN_SMOKE_TEST=1 xvfb-run -a npx electron --no-sandbox --disable-gpu .
```

## 發佈

推送 `v*.*.*` 格式的 git tag（例如 `v0.1.0`）會觸發 `.github/workflows/release.yml`：先跑測試，再於 Ubuntu/Windows/macOS 三個平台各自建置安裝包，最後建立一個草稿版的 GitHub Release 並附上所有安裝檔供你檢查、編輯後發佈。

## 開發進度

- [x] Phase 1：核心流程打通（OpenAI OCR、EPUB 匯出、API Key 加密儲存、中英介面）
- [x] Phase 2：多 AI 服務商（Gemini、Claude、DeepSeek）與翻譯功能、補完繁簡馬印日介面
- [x] Phase 3：PDF 輸入拆頁、PDF 匯出、章節/封面/書籍資訊編輯
- [x] Phase 4：Calibre 整合（AZW3/MOBI）、跨平台安裝包打包與發佈
