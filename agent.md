# 妝點家網球聯盟 AI 開發助手指引 (agent.md)

本文件專門用來指導 AI 助手理解本專案的架構規範、程式碼風格、UI/UX 規格以及 Kintone 資料庫對接細節。請在開始任何開發或重構前，詳閱並遵循以下規範。

---

## 1. 專案架構與程式碼風格規範
* **開發與打包框架**：採用 Astro 打包，並建立 `netlify.toml` 檔案，專案會透過 GitHub 自動 Deploy 到 Netlify。
* **模組化設計**：必須依功能與模組進行解耦（Decoupling）與分檔管理。
* **後端架構**：使用 Netlify Serverless Functions，其 Directory 路徑為 `netlify/functions`。

---

## 2. 網頁整體風格與佈局
* **設計風格**：簡約、現代、清爽的運動風格手機網頁設計。
  * **主色調**：深綠色（`#1D5D3A`）與白色。
  * **搭配色**：活力亮橘色（`#F7941D`）和黑色文字。
* **介面結構**：採用清晰的卡片式設計（Card UI），將不同類型的資訊分塊顯示，讓畫面顯得條理分明。整體佈局需特別適合手機單手操作。
* **全域元件與資源**：
  * **登出按鈕**：需在合適的位置加上，並確保為全域可使用。
  * **圖片需求**：若開發過程中需要提供圖片，請主動向使用者告知圖片的用途及尺寸。

---

## 3. 頁面規格 (共五個頁面)

### 1. 會員驗證入口
* **標題**：🎾 網球聯盟會員登入
* **輸入欄位**：輸入手機號碼。需驗證是否為合法格式，且在手機上使用時必須僅出現數字鍵盤。
* **操作按鈕**：登入按鈕。

### 2. 個人資訊頁
* **頂部導航列 (Top Bar)**：
  * **背景色**：深綠色。
  * **左側**：顯示網球圖示及網頁標題「妝點家網球聯盟」，標題下方有副標題「一起打球，一起進步」。
* **使用者個人資訊卡 (Profile Card)**：
  * **左側**：圓形使用者大頭照占位符，下方標示 `isVerified` 狀態。
  * **右側**：顯示使用者名稱、所屬隊伍（可切換）。
  * **右上**：顯示目前排名。
  * **右中**：顯示隊伍排名及總隊伍數。
  * **右下**：顯示目前積分。
* **最近比賽結果卡 (Recent Match Card)**：
  * **左側**：日曆圖示及比賽日期。
  * **中間**：顯示對戰組合的成員名字，並以粗體顯示比分。
  * **下方**：顯示獎盃圖示與勝利的變動積分，以及火焰圖示與失利的變動積分。
  * **右側顯示 (基本規則)**：
    * 平日積分：勝方 10 分，負方 3 分。
    * 週六 (挑戰日)：勝方 15 分，負方 5 分。
    * 季賽、年終賽：勝方 30 分，負方 10 分。
    * （其餘賽制積分另行公告）

### 3. 輸入比分
* **設計基礎**：參考「比賽紀錄表」及「積分與出賽歷程」設計。
* **比分輸入**：比數採用下拉選單，範圍為 0~7。
* **賽制與人員**：可選擇雙打或單打，每個位置皆可選擇 `player` 及 `player.team`。
* **防呆檢查**：送出前需檢查比分是否合理（例如：6:6 比分不合法，0 分獲勝亦不合法）。
* **跳轉邏輯**：送出後應自動返回到首頁。

### 4. 查看排名
* **核心功能**：能查看聯盟所有 player 排名與球隊排名的頁面，並以圖表呈現。
* **切換控制**：上方可切換查看個人排名與球隊排名，下方以卡片顯示個人或球隊排名。
* **篩選功能**：球隊排名需增加切換球隊的下拉選單，讓使用者可以查看不同球隊的排名。
* **特殊標記**：
  * 若球員未驗證，右上顯示紅色 `*`。
  * 若該筆紀錄的積分中含有未驗證的比賽，積分右上顯示紅色 `*`。

### 5. 新增會員
* **設計基礎**：參考「會員表」設計頁面。
* **欄位特性**：其中代表球隊的欄位必須為「多選」。

---

## 4. 底部導航列 (Bottom Navigation Bar)
* **設計**：固定在螢幕底部。
* **四個圖示按鈕**：
  1. **首頁**：房屋圖示，下方文字「首頁」。顯示登入者的「個人資訊頁」。
  2. **對戰**：球場圖示，下方文字「對戰」。導航到「輸入比分」。
  3. **排名**：柱狀圖圖示，下方文字「排名」。導航到「查看排名」。
  4. **新增會員**：人像圖示，下方文字「新增會員」。導航到「新增會員」。

---

## 5. Kintone REST API 設定及 Record 範例
* **Kintone Endpoint**: `https://dekt.cybozu.com/k/v1/record.json`
* **重要安全提示**：雖然此處提供 API Token 供開發參考，但在實際部署與代碼提交時，請確保這些敏感資訊存放在環境變數中，切勿 Hardcode。

### A. 會員表 (AppID = 191)
* **Token**：`gArh68sHzKTy1iCJLyzS7BCLZD755YsBKqMybHx9`
* **Record 範例**：
  ```json
  {
    "record": {
      "gender": { "type": "RADIO_BUTTON", "value": "男" },
      "teams": {
        "type": "SUBTABLE",
        "value": [
          {
            "id": "8776",
            "value": {
              "teamName": { "type": "SINGLE_LINE_TEXT", "value": "綠寶石" },
              "teamID": { "type": "NUMBER", "value": "6" }
            }
          },
          {
            "id": "8777",
            "value": {
              "teamName": { "type": "SINGLE_LINE_TEXT", "value": "錦和" },
              "teamID": { "type": "NUMBER", "value": "5" }
            }
          },
          {
            "id": "8778",
            "value": {
              "teamName": { "type": "SINGLE_LINE_TEXT", "value": "國防" },
              "teamID": { "type": "NUMBER", "value": "3" }
            }
          }
        ]
      },
      "currentScore": { "type": "NUMBER", "value": "0" },
      "playerName": { "type": "SINGLE_LINE_TEXT", "value": "陳志勇" },
      "isVerified": { "type": "RADIO_BUTTON", "value": "true" },
      "playerPhone": { "type": "SINGLE_LINE_TEXT", "value": "0932028517" },
      "totalMatches": { "type": "NUMBER", "value": "0" },
      "playerID": { "type": "RECORD_NUMBER", "value": "1" }
    }
  }
  ```

### B. 球隊表 (AppID = 192)
* **Token**：`KZ7to3Y6k86SPEtmcioogRDCLvSiJnJ6wq2GUWLy`
* **Record 範例**：
  ```json
  {
    "record": {
      "teamName": { "type": "SINGLE_LINE_TEXT", "value": "妝點家" },
      "teamScore": { "type": "NUMBER", "value": "0" },
      "teamID": { "type": "RECORD_NUMBER", "value": "1" }
    }
  }
  ```

### C. 比賽紀錄表 (AppID = 194)
* **Token**：`FlU0pWNI93li3GSWBXblHJsLp90OaQUtfNR2ozPt`
* **Record 範例**：
  ```json
  {
    "record": {
      "matchDateTime": { "type": "DATETIME", "value": "2026-05-22T09:33:00Z" },
      "teamA": {
        "type": "SUBTABLE",
        "value": [
          {
            "id": "8870",
            "value": {
              "playerID_A": { "type": "NUMBER", "value": "1" },
              "teamID_A": { "type": "NUMBER", "value": "3" }
            }
          }
        ]
      },
      "teamB": {
        "type": "SUBTABLE",
        "value": [
          {
            "id": "8871",
            "value": {
              "playerID_B": { "type": "NUMBER", "value": "2" },
              "teamID_B": { "type": "NUMBER", "value": "4" }
            }
          }
        ]
      },
      "teamA_score": { "type": "NUMBER", "value": "2" },
      "teamB_score": { "type": "NUMBER", "value": "6" },
      "isVerified": { "type": "RADIO_BUTTON", "value": "true" },
      "matchID": { "type": "RECORD_NUMBER", "value": "1" }
    }
  }
  ```

### D. 積分與出賽歷程 (AppID = 195)
* **Token**：`aAv4kk2N2BJ2tsF8S9thzTAMGkfl90fHCwtg3Un7`
* **Record 範例**：
  ```json
  {
    "record": {
      "scoreChange": { "type": "NUMBER", "value": "15" },
      "historyID": { "type": "RECORD_NUMBER", "value": "1" },
      "teamID": { "type": "NUMBER", "value": "2" },
      "$revision": { "type": "__REVISION__", "value": "1" },
      "matchID": { "type": "NUMBER", "value": "1" },
      "playerID": { "type": "NUMBER", "value": "1" }
    }
  }
  ```
