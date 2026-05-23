這是一個基於 Netlify 前端託管與 Kintone 雲端資料庫（或後台管理系統）所建構的 Web App，請在設計上考慮這兩者的整合特性。

專案結構與程式碼風格規範：
	- 採用 astro 打包 + vue3, 並建立 netlify.toml 檔案, 專案會透過 github 自動 deploy 到 netlify, 
	- 須依功能與模組進行解耦（Decoupling）與分檔管理。
	- netlify function directory 的路徑為: netlify/functions

網頁整體風格與佈局：
	設計風格：簡約、現代、清爽的運動風格手機網頁設計，主色調採用深綠色（ #1D5D3A）與白色，並搭配活力亮橘色（ #F7941D）和黑色文字。
	介面結構：採用清晰的卡片式設計（Card UI），將不同類型的資訊分塊顯示，讓畫面顯得條理分明。整體佈局適合手機單手操作。
    登出按鈕：在合適位置加上，需要全域可使用。
    圖片：如果有需要我提供圖片的部分請跟我講用途及尺寸。

共五個頁面:
	1. "會員驗證入口":
		標題: 🎾 網球聯盟會員登入
		輸入框: 輸入手機號碼, 並要驗證是否為合法格式, 在手機上使用時僅出現數字鍵盤
		登入按鈕
		
	2. "個人資訊頁":
        - 頂部導航列(Top Bar)：
            背景色： 深綠色。
            左側： 顯示一顆網球圖示，以及網頁標題「妝點家網球聯盟」，標題下方有副標題「一起打球，一起進步」。
        
        - 使用者個人資訊卡(Profile Card)：
            左側： 圓形的使用者大頭照占位符，下方標示isVerified。右側顯示使用者名稱、所屬隊伍(可切換)。
            右側（上）： 顯示目前排名。
            右側（中）： 顯示隊伍排名及共幾隊。
            右側（下）： 顯示目前積分。

        - 最近比賽結果卡(Recent Match Card)：
            左側： 日曆圖示，以及比賽日期。中間顯示對戰組合的成員名字，中間有粗體比分。
                下方顯示獎盃圖示，以及勝利的變動積分。火焰圖示，以及失利的變動積分。
            右側顯示：
                基本規則
                平日積分 勝方 10 分 負方 3 分
                週六(挑戰日) 勝方 15 分 負方 5 分
                季賽、年終賽 勝方 30 分 負方 10 分
                (其餘賽制積分另行公告)

	3. "輸入比分":
        參考比賽紀錄表及積分與出賽歷程來設計, 比數為下拉選單0~7
        可選擇雙打或單打, 每個位置都要可以選擇 player 及 player.team。
        送出前檢查比分是否合理。比如6:6比分不合法，或是0分獲勝也不合法。
        送出後應返回到首頁。

    4. "查看排名":
        能查看聯盟所有player排名與球隊排名的頁面，並以圖表呈現。
        上方可以切換查看個人排名與球隊排名，下方以卡片顯示個人或球隊的排名
        球隊排名需增加切換球隊的下拉選單，讓使用者可以查看不同球隊的排名。
        未驗證的球員右上顯示紅色*
        該筆紀錄的積分含有未驗證的比賽時, 積分右上顯示紅色*

	5. "新增會員":
        參考會員表來設計頁面, 其中代表球隊可以多選

底部導航列 (Bottom Navigation Bar)：
	設計： 固定在螢幕底部。

	四個圖示按鈕：
	首頁： 房屋圖示，下方有文字「首頁」。顯示登入者的"個人資訊頁"。
	對戰： 球場圖示，下方有文字「對戰」。導航到"輸入比分"。
	排名： 柱狀圖圖示，下方有文字「排名」。導航到"查看排名"。
	新增會員： 人像圖示，下方有文字「新增會員」。導航到"新增會員"。

Kintone REST API 設定及 record 範例:
    domain: https://dekt.cybozu.com/k/v1/record.json

	- 會員表, appid=191, token=gArh68sHzKTy1iCJLyzS7BCLZD755YsBKqMybHx9
		{"record": {"gender": {"type": "RADIO_BUTTON","value": "男"},"teams": {"type": "SUBTABLE","value": [{"id": "8776","value": {"teamName": {"type": "SINGLE_LINE_TEXT","value": "綠寶石"},"teamID": {"type": "NUMBER","value": "6"}}},{"id": "8777","value": {"teamName": {"type": "SINGLE_LINE_TEXT","value": "錦和"},"teamID": {"type": "NUMBER","value": "5"}}},{"id": "8778","value": {"teamName": {"type": "SINGLE_LINE_TEXT","value": "國防"},"teamID": {"type": "NUMBER","value": "3"}}}]},"currentScore": {"type": "NUMBER","value": "0"},"playerName": {"type": "SINGLE_LINE_TEXT","value": "陳志勇"},"isVerified": {"type": "RADIO_BUTTON","value": "true"},"playerPhone": {"type": "SINGLE_LINE_TEXT","value": "0932028517"},"totalMatches": {"type": "NUMBER","value": "0"},"playerID": {"type": "RECORD_NUMBER","value": "1"}}}

	- 球隊表, appid=192, token=KZ7to3Y6k86SPEtmcioogRDCLvSiJnJ6wq2GUWLy
		{"record": {"teamName": {"type": "SINGLE_LINE_TEXT","value": "妝點家"},"teamScore": {"type": "NUMBER","value": "0"},"teamID": {"type": "RECORD_NUMBER","value": "1"}}}

	- 比賽紀錄表, appid=194, token=FlU0pWNI93li3GSWBXblHJsLp90OaQUtfNR2ozPt
		{"record": {"matchDateTime": {"type": "DATETIME","value": "2026-05-22T09:33:00Z"},"teamA": {"type": "SUBTABLE","value": [{"id": "8870","value": {"playerID_A": {"type": "NUMBER","value": "1"},"teamID_A": {"type": "NUMBER","value": "3"}}}]},"teamB": {"type": "SUBTABLE","value": [{"id": "8871","value": {"playerID_B": {"type": "NUMBER","value": "2"},"teamID_B": {"type": "NUMBER","value": "4"}}}]},"teamA_score": {"type": "NUMBER","value": "2"},"teamB_score": {"type": "NUMBER","value": "6"}, "isVerified": {"type": "RADIO_BUTTON","value": "true"}, "winnerPoints": {"type": "NUMBER", "value": "10"}, "loserPoints": {"type": "NUMBER", "value": "3"}, "matchID": {"type": "RECORD_NUMBER","value": "1"}}}

	- 積分與出賽歷程, appid=195, token=aAv4kk2N2BJ2tsF8S9thzTAMGkfl90fHCwtg3Un7
		{"record": {"pointChange": {"type": "NUMBER","value": "15"},"historyID": {"type": "RECORD_NUMBER","value": "1"},"teamID": {"type": "NUMBER","value": "2"},"$revision": {"type": "__REVISION__","value": "1"},"matchID": {"type": "NUMBER","value": "1"},"playerID": {"type": "NUMBER","value": "1"}}}


