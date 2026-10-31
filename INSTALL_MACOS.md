# macOS 安裝指南

這個應用程式沒有在 Mac App Store 上架，也沒有付費的 Apple Developer 憑證簽章（見下方「Gatekeeper 警告」），所以安裝方式是「自行建置」而不是下載一個現成的 .app 雙擊安裝——這在開源/個人專案的 Electron 應用很常見，步驟都很直接。

適用於 Intel Mac 與 Apple Silicon（M1/M2/M3/M4）皆可。

## 0. 前置需求

安裝以下工具（都是一次性設定）：

1. **Xcode Command Line Tools**（編譯原生模組用）：
   ```bash
   xcode-select --install
   ```
2. **Node.js 22（LTS）**，建議用 [nvm](https://github.com/nvm-sh/nvm) 安裝，或用 Homebrew：
   ```bash
   brew install node@22
   ```
   安裝後確認版本：
   ```bash
   node -v   # 應顯示 v22.x.x
   ```
3. **Git**（macOS 通常內建，或隨 Xcode Command Line Tools 一起安裝）

## 1. 取得原始碼

等 GitHub repo 設定好之後：
```bash
git clone https://github.com/PoaFang/fayin-liuchuan.git
cd fayin-liuchuan
```

（若還沒有 repo，可先用我提供的原始碼壓縮檔解壓縮，進入該資料夾即可，後續步驟相同。）

## 2. 安裝依賴套件

```bash
npm install
```

> 如果這一步因為 npm 內部的相依性解析錯誤而失敗（錯誤訊息類似 `Cannot read properties of null`），這是目前 npm 工具鏈的已知問題，與此專案無關，改用：
> ```bash
> npm install --legacy-peer-deps
> ```

在 Apple Silicon 與 Intel Mac 上，`npm install` 都會自動安裝對應的 sharp / canvas 原生二進位檔，不需要額外參數。

## 3. 快速測試（開發模式，最快確認可用）

```bash
npm run dev
```

這會直接用你本機的 Electron 執行原始碼，**不會觸發 Gatekeeper 警告**（因為沒有產生、下載任何 .app）。建議先用這個方式測試整個流程（設定 API Key、匯入圖片、跑 OCR、匯出 EPUB）沒問題後，再進行下一步「正式打包安裝」。

## 4. 正式打包成可安裝的 .app / .dmg

```bash
npm run dist:mac
```

完成後，`release/` 資料夾會出現：
- `法音流傳-0.1.0.dmg`（Intel 與 Apple Silicon 各一個，或 universal 視建置結果而定）
- `法音流傳-0.1.0-mac.zip`

把 `.dmg` 打開，將「法音流傳.app」拖進「Applications」資料夾即完成安裝。

## 5. 處理 Gatekeeper「無法驗證開發者」警告

因為沒有 Apple Developer 憑證簽章（需每年付費 99 美元，這部分由你自行決定要不要之後補上），**第一次開啟時 macOS 會阻擋**，顯示「無法打開，因為無法驗證開發者」或「檔案已損毀」。這是正常現象，不是建置錯了，解決方式三選一：

**方法 A（推薦）**：在「應用程式」資料夾中，**按住 Control 點擊**（或滑鼠右鍵）「法音流傳.app」→ 選「打開」→ 彈出的警告對話框再按一次「打開」。之後就能正常雙擊開啟。

**方法 B**：嘗試打開被擋下後，前往「系統設定」→「隱私權與安全性」，往下捲動會看到一行提到「法音流傳」被阻擋，點旁邊的「仍要打開」。

**方法 C（終端機）**：如果下載/複製過程中被標記了隔離屬性（例如透過瀏覽器下載 .dmg），可以先移除再打開：
```bash
xattr -cr "/Applications/法音流傳.app"
```

## 6. 第一次使用設定

1. 開啟 App 後，切到「設定」頁籤，貼上至少一個支援視覺 OCR 的服務商 API Key（OpenAI / Google Gemini / Anthropic Claude 三選一即可開始；DeepSeek 目前只能用於純文字翻譯，不能做 OCR）
2. 切回「製書工作台」，點「匯入圖片／PDF」選幾張書頁照片或一份 PDF 掃描檔
3. 點「執行 OCR」或「全部執行 OCR」，確認辨識出的文字只包含印刷字、沒有混入你手寫的筆記
4. 填好書名/作者，需要的話選一張封面圖
5. 點「匯出 EPUB」或「匯出 PDF」，用 Apple Books 或其他閱讀器打開確認

## 7（選用）. AZW3 / MOBI 支援

這兩種格式需要本機安裝免費開源的 Calibre：
```bash
brew install --cask calibre
```
安裝後重啟 App，「製書工作台」下方會出現「轉換為 AZW3 / MOBI」區塊（偵測到 Calibre 才會顯示轉換按鈕）。

> 提醒：Amazon 自 2022 年起 Send to Kindle 已可直接接受 EPUB，大多數情況其實不需要額外轉成 AZW3/MOBI。

## 疑難排解

| 狀況 | 解決方式 |
|---|---|
| `npm install` 卡住或報錯 | 確認 Node 版本是 22.x；試試 `npm install --legacy-peer-deps` |
| 打開 App 顯示「已損毀，應該移到垃圾桶」 | 這通常是隔離屬性造成，用上方方法 A 或方法 C |
| OCR 一直失敗、顯示「尚未設定 API Key」 | 回到「設定」頁籤確認已按「儲存」，且該服務商額度/金鑰有效 |
| 想重新打包、`dist:mac` 卡在尋找簽章身分 | 可在指令前加 `CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac` 強制跳過簽章查找 |
