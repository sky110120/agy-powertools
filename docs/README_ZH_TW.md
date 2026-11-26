<div align="center">
  <img src="../assets/logo.svg" width="72" height="72" alt="Agy Powertools Logo" />
  <h1>Agy Powertools</h1>
  <p><strong>Antigravity 2.0 原生增強外掛</strong></p>
  <p>繁體中文介面、上下文與用量統計、緊湊排版、會話分支與編輯、多帳號切換、免 TUN 代理、SSH 與 WSL2 支援</p>
  <!-- plugin-badges:start -->
  <p>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/releases"><img src="https://img.shields.io/github/v/release/WhiteBr1ck/agy-powertools?label=Release&color=2563eb" height="20" alt="Release" /></a>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/WhiteBr1ck/agy-powertools/ci.yml?label=CI" height="20" alt="CI" /></a>
    <a href="../LICENSE"><img src="https://img.shields.io/github/license/WhiteBr1ck/agy-powertools?label=License&color=16a34a" height="20" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Antigravity-2.35.0-0f172a" height="20" alt="Antigravity 2.35.0" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22.13-339933" height="20" alt="Node.js >= 22.13" />
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20WSL2-475569" height="20" alt="Platform" />
  </p>
  <!-- plugin-badges:end -->
  <p><a href="../README.md">简体中文</a> | <strong>繁體中文</strong> | <a href="../README_EN.md">English</a> | <a href="README_FR.md">Français</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_ES.md">Español</a> | <a href="README_RU.md">Русский</a></p>
  <p>
    <a href="#介面預覽">介面預覽</a> |
    <a href="#主要功能">主要功能</a> |
    <a href="#安裝與解除安裝">安裝與解除安裝</a> |
    <a href="#設定說明">設定說明</a> |
    <a href="#更新日誌">更新日誌</a>
  </p>
</div>

<p align="center">
  <img src="./images/hero-workspace.png" alt="Agy Powertools 使用介面" width="100%" />
</p>

> 透過本機除錯介面掛載於 Antigravity 2.0 內部，以唯讀方式解析本機 SQLite 與 JSONL 會話檔案，不修改用戶端安裝檔案，也不開啟外部網頁。

---

## 介面預覽

<table>
  <tr>
    <th width="50%">上下文視窗與生成速度</th>
    <th width="50%">右側任務進度與目前額度</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-composer.png" alt="上下文視窗與生成速度" width="100%" />
      <p>在輸入框旁檢視上下文佔用、快取複用與即時生成速度；外框可選顯示目前模型的剩餘額度。</p>
    </td>
    <td>
      <img src="./images/card-overview-panel.png" alt="右側任務進度與目前額度" width="100%" />
      <p>在右側概覽檢視目前執行階段、每步耗時與各模型組剩餘額度，點擊標題即可折疊收合。</p>
    </td>
  </tr>
  <tr>
    <th>用量概覽（淺色）</th>
    <th>用量概覽（深色）</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-dashboard-light.png" alt="用量概覽淺色主題" width="100%" />
      <p>預設依本輪週限額週期統計請求次數、Token、快取命中率、參考費用、53 週熱力圖與模型健康狀態。</p>
    </td>
    <td>
      <img src="./images/card-dashboard-dark.png" alt="用量概覽深色主題" width="100%" />
      <p>隨用戶端自動切換淺色與深色主題，比較各模型的 Token 與費用佔比、快取命中率與平均速度。</p>
    </td>
  </tr>
  <tr>
    <th>請求記錄與快取異常</th>
    <th>多帳號切換與額度（預設關閉）</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-requests.png" alt="請求記錄與快取異常" width="100%" />
      <p>依帳號、模型、會話與狀態篩選單次請求，標記短間隔內異常掉快取的記錄，排除冷啟動與上下文壓縮誤報。</p>
    </td>
    <td>
      <img src="./images/card-accounts.png" alt="多帳號切換與額度管理" width="100%" />
      <p>透過作業系統原生憑證管理員在本機儲存與切換多個 Google 帳號，集中檢視 5 小時與週限額。</p>
    </td>
  </tr>
  <tr>
    <th>多語言與顯示設定</th>
    <th>免 TUN 獨立代理（預設關閉）</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-settings.png" alt="多語言與顯示設定" width="100%" />
      <p>支援九種介面語言切換，包含緊湊排版、使用者訊息底色與額度光環週期等選項。</p>
    </td>
    <td>
      <img src="./images/card-proxy.png" alt="免 TUN 獨立代理設定" width="100%" />
      <p>單獨為 Antigravity 設定 HTTP 或 SOCKS5 代理伺服器，內建連通性測試、強制 HTTP/1.1 與應用內檢查更新。</p>
    </td>
  </tr>
</table>

---

## 主要功能

- **九種介面語言**：翻譯 Antigravity 常用側邊欄、選單、權限彈窗、模型說明、設定頁與 Swarm 面板，不改動聊天正文與程式碼區塊。
- **上下文與速度統計**：在輸入框旁檢視上下文視窗佔用（含快取複用、壓縮次數與 Orchestrator 規劃/執行分模型進度）以及生成速度（`tok/s`、首字延遲、模型/工具耗時與本會話參考費用），支援子智能體統計。
- **本機用量與請求看板**：左側邊欄新增 `Powertools` 頁面，合併統計桌面端與 `agy` CLI 用量，包含用量概覽（熱力圖、模型分布、參考費用）、請求記錄、短間隔快取異常標紅、錯誤一鍵複製、配額估算與官方參考單價更新。
- **緊湊排版與階段回報**：保留用戶端字體大小，收緊正文行高與段落間距；Agent 連續呼叫工具時先簡要回報進度，整輪完成後自動收合進頂部耗時列。
- **會話分支與訊息編輯**：可從任意歷史回覆或會話選單建立分支新會話（完整保留歷史，支援含子智能體的會話）；點擊已傳送訊息旁的編輯按鈕即可於原位修改並重新傳送。
- **多帳號切換（預設關閉）**：透過 Windows 認證管理員、macOS 鑰匙圈或 Linux Secret Service 在本機隔離多個 Google 帳號，不儲存明文權杖；側邊欄底部可直接檢視額度與切換帳號，支援耗盡自動切號。
- **免 TUN 獨立代理（預設關閉）**：無須開啟系統全域代理，單獨為 Antigravity 注入代理參數與環境變數；內建連通性測試、冷啟動未啟用提醒，以及可選 `GODEBUG=http2client=0` 緩解 `EOF` 斷線。
- **SSH 遠端與 WSL2 支援**：桌面端連線 `SSH` 遠端視窗時直接讀取遠端會話與用量統計，無須在伺服器安裝外掛；Windows 版 Antigravity 開啟內建 WSL2 模式時，自動處理跨系統 CDP 連線（相容 NAT 與 Mirrored）、多帳號憑證與重啟。
- **檔案右鍵與其他實用工具**：於訊息中的檔案連結或右側檔案樹按右鍵可引用到輸入框、開啟、在資料夾中顯示、複製檔案或複製路徑（Windows 支援區網 NAS 共享路徑）；右側概覽支援可折疊的任務進度與目前額度，另提供視窗標題未讀數、可選輸入框額度光環與使用者氣泡底色。

---

## 無用但好玩

<p align="center">
  <img src="./images/card-border-beam.webp" alt="工作時輸入框流光預覽" width="100%" />
</p>

- **工作時輸入框流光（預設關閉）**：靈感源自 [border-beam-ios](https://github.com/ismnoiet/border-beam-ios)，基於圓角矩形 SDF 的輕量 WebGL 著色器。Agent 執行期間沿輸入框邊緣等速滑動流光與柔和內暈，結束後平順淡出且閒置零 CPU/GPU 記憶體與運算消耗；與額度光環同時開啟時無縫切換，內建 `Gemini`、`極光`、`炫彩`、`霓虹`、`主題色`、`額度色` 6 套配色與「試用預覽」按鈕。

---

## 安裝與解除安裝

> 環境需求：請先安裝並啟動過一次 Antigravity。優先使用本機 Node.js `>= 22.13`，若未安裝則自動使用用戶端內建的 `agy-node`，無須執行 `npm install` 或系統管理員權限。

### 方式一：交給 Agent 自動安裝（推薦）

將下面這段指令直接傳送給 Antigravity 或其他可執行本機指令的 Agent：

> 請幫我安裝 Agy Powertools：https://github.com/WhiteBr1ck/agy-powertools 。先閱讀 README 與 docs/INSTALL_AGENT.md，使用專案提供的統一安裝程式，優先使用本機 Node.js 或 Antigravity 內建執行環境。保留其他外掛、帳號設定與聊天記錄，不要強制關閉目前用戶端。安裝後確認版本並回報結果；若需要重啟請於最後提醒我。

詳細步驟請見 [Agent 安裝指南](./INSTALL_AGENT.md)。

### 方式二：命令列安裝

從 [Releases](https://github.com/WhiteBr1ck/agy-powertools/releases) 下載最新 ZIP 並解壓縮（或 clone 本儲存庫），於專案目錄執行：

```powershell
# Windows (PowerShell)
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

```sh
# macOS / Linux / WSL2
sh ./install.sh
```

覆蓋安裝會保留既有設定，不會強制關閉用戶端。完成目前任務後重啟 Antigravity，左側邊欄出現 **Powertools** 即可使用。macOS 無須建立第二個 `.app` 圖示，正常開啟原版 Antigravity 時若未偵測到除錯連接埠，外掛會自動帶參數重啟一次生效（內建防迴圈保護，亦可於設定或右側「外掛 -> Powertools」關閉自動重啟並改為手動點擊重啟）。

### 更新與解除安裝

- **應用內更新**：開啟 **Powertools -> 設定 -> 關於 -> 檢查更新**，點擊 **立即更新** 自動完成 SHA-256 校驗與替換，啟動失敗會自動回滾舊版。
- **解除安裝**：執行 `powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1`（Windows）或 `sh ./uninstall.sh`（macOS / Linux / WSL2）。於指令末尾加上 `--keep-settings` 可保留個人設定。解除安裝不會影響原有聊天記錄、帳號與其他外掛。

---

## 設定說明

所有選項皆在 **Powertools -> 設定** 中即時生效並自動儲存（頁面底部支援恢復預設設定）。

<details>
<summary><strong>展開檢視全部設定項、環境變數與資料目錄</strong></summary>

### 介面與顯示

| 設定項 | 預設值 | 說明 |
| --- | --- | --- |
| 啟用 Powertools | 開啟 | 外掛總開關；關閉後暫停所有介面增強，保留已儲存設定 |
| 語言 | `简体中文` | 可選擇九種介面語言 |
| 本機字體與字重 | 跟隨用戶端 | 依中文名稱或字體族名稱搜尋，選取後立即生效。字重可獨立設定，恢復預設會同時清除兩項設定。內建終端機沿用用戶端字體 |
| 緊湊排版 | 開啟 | 收緊行高至 `1.4`、段落間距與工具列高，字體大小跟隨用戶端設定 |
| 使用者訊息氣泡著色 | 關閉 | 為使用者傳送的訊息加上底色與細邊框，支援強調色、5 套預設、自訂顏色與 10%-100% 混合強度滑桿 |
| 始終顯示會話目錄 | 開啟 | 在多輪對話左側常駐顯示輪次快速跳轉目錄 |
| 切換會話時保持概覽 | 開啟 | 切換會話時保留右側概覽面板的展開狀態 |
| 專案預設顯示會話數 | `預設 (6)` | 控制側邊欄每個專案預設顯示條數（`預設 (6)` / `1-10` / `全部展開`） |
| 拖入資料夾建立專案 | 開啟 | 將本機資料夾拖曳至側邊欄即可建立或開啟專案（僅限本機視窗） |
| 拖入專案自動置頂 | 關閉 | 自動置頂透過拖放建立或開啟的專案 |
| 側邊欄執行中會話流光 | 關閉 | 於側邊欄執行中會話列顯示沿邊緣平滑移動的流光（預設跟隨輸入框配色，亦可獨立選色、隱藏原生四圓點動畫或試用預覽；等待確認時自動切換為琥珀提示色） |
| 側邊欄進行中會話監控分組 | 關閉 | 在側邊欄頂部置頂集中顯示所有進行中的會話、所屬專案、活躍子任務與等待確認提醒，支援折疊，無執行中會話時自動隱藏 |
| 工作列未讀提醒 | 開啟 | 背景對話完成時於視窗與工作列標題前顯示 `(N)` 未讀數，切回後自動清除 |

### 統計與進度

| 設定項 | 預設值 | 說明 |
| --- | --- | --- |
| 概覽預設時間範圍 | `本輪週限額內用量` | 可選本輪週限額內用量、今天、24 小時、昨天、本週、本月、30 天或全部時間 |
| 上下文圓環 | 開啟 | 在輸入框旁顯示上下文佔用圓環、快取複用與 Orchestrator 分模型拆解 |
| 速度與統計 | 開啟 | 顯示生成速度儀表，點擊檢視會話統計與參考費用 |
| 任務進度 | 開啟 | 在右側概覽顯示可折疊的任務清單、執行階段與步驟耗時 |
| 概覽顯示帳號額度 | 關閉 | 在右側概覽底部以可折疊區塊顯示各模型組的 5 小時與週剩餘額度 |
| 標題列快捷概覽 | 關閉 | 開啟後在視窗右上角標題列顯示 Powertools 快捷浮動視窗入口，無須離開目前會話即可檢視與管理全部面板 |
| 輸入框額度光環 | 關閉 | 沿輸入框外框順時針顯示目前所選模型的剩餘額度（青綠 / 琥珀 / 紅） |
| 光環額度週期 | `自動（較低項）` | 開啟光環後可選 `自動（較低項）`、`週限額` 或 `5 小時限額` |
| 工作時輸入框流光 | 關閉 | Agent 執行時沿輸入框邊框平滑旋轉流光（閒置淡出零佔用）；與額度光環同時開啟時自動無縫切換，內建 6 套色板與「試用預覽」按鈕 |
| 子智能體上下文與統計 | 開啟 | 在概覽子智能體清單、子智能體輸入框與主會話浮動視窗顯示子智能體統計 |
| 每輪耗時 / 點擊展開工具 | 開啟 | 在已完成回覆頂部顯示總耗時，點擊展開工具呼叫與階段回報 |
| 每輪底欄統計 | 關閉 | 在已完成回覆底部顯示當輪模型、快取命中率、輸入/輸出 Token 與預估費用，懸停檢視完整明細 |

### 會話增強、帳號、代理與實驗性上下文

| 設定項 | 預設值 | 說明 |
| --- | --- | --- |
| 階段回報 | 開啟 | 執行期間回報目前進度，整輪完成後收合進頂部耗時列 |
| 並行檢索與讀取 | 關閉 | 引導 Agent 在同一輪合併搜尋與讀取檔案，減少往返輪次 |
| 原生搜尋支援全文檢索 | 開啟 | 增強頂部原生搜尋框，搜尋標題的同時檢索歷史對話正文、程式碼區塊與終端機指令，點擊直達對應輪次 |
| 分支會話 / 訊息編輯 / 檔案右鍵 | 開啟 | 原生會話分支、原位訊息編輯與本機 / NAS / 檔案樹右鍵選單（含「開啟方式 >」本機應用與 `#L:C` 跳轉） |
| 辨識貼上的 SSH 指令 | 開啟 | 在「新增專案 -> SSH Host」貼上 `ssh -p 連接埠 使用者@主機` 時自動填入 `使用者@主機:連接埠`（自動忽略密碼） |
| 啟用多帳號切換 | 關閉 | 須確認風險提示；含側邊欄切換器、清單/卡片檢視、5H/週限額切換與耗盡自動切號 |
| 啟用獨立代理（免 TUN） | 關閉 | 協定 / 主機 / 連接埠輸入、連通性測試、冷啟動提醒與強制 HTTP/1.1 |
| 上下文目標（實驗性） | `預設` | 可選 `預設`、`256K`、`500K`、`1M`；`預設` 不更動用戶端原生設定 |

### 環境變數與檔案路徑

| 名稱 / 路徑 | 說明 |
| --- | --- |
| `ANTIGRAVITY_USER_DATA_DIR` | 使用獨立用戶端設定目錄時指定自訂使用者資料目錄 |
| `ANTIGRAVITY_CLI_DATA_DIR` | 自訂 `agy` CLI 資料目錄路徑（預設自動合併 `~/.gemini/antigravity-cli`） |
| `ANTIGRAVITY_CDP_PORT_FILE` | 明確指定 `DevToolsActivePort` 絕對路徑（相容 `AGY_BROWSER_ACTIVE_PORT_FILE`） |
| `~/.gemini/config/plugins/agy-powertools/` | 外掛程式與執行腳本安裝目錄 |
| `~/.gemini/antigravity/plugin_data/agy-powertools/` | 個人設定、帳號記錄、配額採樣與參考單價快取目錄 |

</details>

---

## 更新日誌

### v2.16.8
- **輸入框拖入超過 20 MB 大檔案自動轉為原生檔案引用（#46）**：保留 Antigravity 原生 20 MB 附件限制；超限本機檔案不讀取位元組，直接透過原生 Mention 管道插入為檔案引用標籤，混合拖曳時正常保留一般附件，並隔離側邊欄與 SSH 遠端視窗。
- **側邊欄顯示選單翻譯作用域保護（整合 PR #82，感謝 `@statertly-pixel`）**：將 `Project`、`Sort Conversations`、`Sort Projects`、`Auto Pin`、`Archived Only`、`Subtitles`、`Decorations` 限定於選單上下文內生效，避免同名會話或專案標題被誤翻。

### v2.16.7
- **新增六語種原生在地化（共九種介面語言，整合法語 PR #80，感謝 `@oxibys`）**：新增法語、日語、韓語、德語、西班牙語與俄語，採模組化按需載入架構（`lib/locales/` 與 `i18n.pack` RPC），涵蓋外掛面板、原生介面、Swarm、伴生輔助頁與日曆，並同步補齊九語種說明文件。
- **補齊側邊欄排序與篩選選單翻譯（#79）**：補上 `Sort Conversations`、`Sort Projects`、`Auto Pin`、`Archived Only`、`Subtitles`、`Decorations` 與選單內 `Project` 詞條。
- **徹底修正 Windows 11 重啟後 Windows Terminal 殘留與關窗連帶退出客戶端（#61 後續，感謝 `@poneisme`）**：透過無視窗 CUI `-LaunchOnly` 子程序搭配 `Start-Process` 徹底切斷 ConPTY 控制碼繼承與控制台附著，同時維持殺毒軟體相容性。

### v2.16.6
- **修正側邊欄執行中會話開啟流光後無法點擊的問題**：移除覆蓋原生側邊欄列子元素 `position` 的樣式規則，恢復整列 `<a href>` 連結與懸停操作按鈕的正常點擊。
- **最佳化側邊欄底部流光層級與邊緣漸隱**：將 `pointer-events: none` 的流光層提升至懸停操作列上方（`z-index: 20`），消除右側圖示背景區塊對光暈的生硬裁切；新增左右兩端漸隱遮罩（`.agy-sb-fade`），使流光進出底邊更加平滑。

### v2.16.5
- **修正週額度與歷史統計偏差（#63）**：
  - `lib/quota.mjs`：攔截歸零或回退掃描寫入異常檢查點，並於本機歷史回退時保留已測進度。
  - `lib/dashboard.mjs`：依請求所屬配額池（Gemini / Claude / Argon）獨立比對各自週重置週期的上下界，避免多池重置時間不同造成跨週期多算。
  - `lib/analytics.mjs`：新增依設定檔隔離的原子請求封存（保留 90 天、最多 20,000 筆），清理舊 `.db` 檔案後週統計不再驟降。
- **介面精簡與原生設定補齊翻譯**：
  - 移除輸入框上下文視窗圓環、子智能體圓環與速度統計按鈕上的冗餘懸停提示（保留 `aria-label`），避免展開彈窗時遮擋內容。
  - 精簡概覽「費用」卡片與模型統計表頭：移除冗長懸停提示、估算口徑副標題與表頭虛線，僅保留總費用與單次均價。
  - 補齊 5 處 Antigravity 2.35.2 原生設定詞條（`Search shortcuts...`、`Settings for conversations outside of projects`、`Hide breakdown`、`Notification settings`、`Automatic check for updates`）與輸入框 `placeholder` 還原。
- **社群 PR 合併與精進**：
  - **本機字體與字重選擇（PR #78，感謝 `@awei84`）**：採用單列原生下拉選單選擇本機字體與字重，透過 OpenType `name` 表與內建對照自動顯示中文字體名稱並支援中英文混合搜尋；僅顯示所選字體實際具備的字重（不支援時灰顯停用），並排除圖示字體與終端機。
  - **側邊欄執行中底部流光與「進行中」置頂監控分組（PR #76，感謝 `@whitzard0421`）**：皆預設關閉；流光採用純 CSS 底部由左至右柔光滑動與 1px 微光邊線（零 WebGL 佔用，遵循減少動態效果偏好），「進行中」分組沿用原生側邊欄排版。
  - **拖曳資料夾到側邊欄建立專案（PR #73，感謝 `@niuanhua-ydy`）**：支援將本機資料夾直接拖放至側邊欄建立專案，包含目錄與符號連結檢查及 SSH 遠端視窗隔離。
  - **每輪回覆底部統計（PR #65，感謝 `@wwwsideexiecom-boop`）**：預設關閉；開啟後於回覆底部與懸停明細顯示模型、快取命中率、輸入/輸出 Token 與當輪估算費用。

### v2.16.4
- **修正 Windows 重啟閃現黑框與程序工作階段繼承（#61）**：重啟腳本改用 `ProcessStartInfo`（`UseShellExecute = $false`、`CreateNoWindow = $true`）啟動 `Antigravity.exe`，避免新執行個體繼承 PowerShell 主控台工作階段。
- **修正 macOS 大型 OAuth 憑證寫入超限並避免密文進入命令列（#75）**：當 `/usr/bin/security -i` 的十六進位指令接近 4096 位元組上限時，改以 `/usr/bin/osascript -l JavaScript` 透過標準輸入呼叫 `Security.framework`（`SecItemUpdate` / `SecItemAdd` 並設定 `/usr/bin/security` 存取控制清單），任意大小憑證均不會出現在 `argv` 中。
- **降低長會話輪詢的解析與傳輸開銷（#62）**：伴生程序依檔案指紋（含 `task.md`）、完整執行狀態、費率與設定快取解析結果，前端攜帶 `knownRev` 且狀態未變動時直接回傳 `{ unchanged: true, stateRev }`，並由前端依 `phaseStartedAtMs` 本機推進階段計時。
- **修正 macOS 冷啟動自動重啟冷卻殘留與並行競態（#64）**、**修正原位編輯快速鍵與草稿復原（#70）**、**消除切換會話時備用目錄閃爍（#74）**，以及**支援自訂翻譯字典 `custom-i18n.json`、補齊 2.35 斜線指令說明並依作業系統語系初始化預設語言（#68、#69）**。
- **社群 PR 合併**：SSH 遠端視窗早期啟動復原（PR #67，感謝 `@qimengdunjia`）、合併 Antigravity CLI 統計與 Argon 獨立額度池（PR #71，感謝 `@zhangyu-ch`）、管理頁頂列與篩選列捲動吸頂（PR #72，感謝 `@niuanhua-ydy`）。

檢視完整歷史版本請見 [README.md](../README.md#更新日志)。

---

## 授權與連結

- **開源授權**：[MIT License](../LICENSE)（日期範圍日曆互動改編自 HextaUI，基於 `react-day-picker` 與 `date-fns`，授權聲明見 [lib/vendor/NOTICE.txt](../lib/vendor/NOTICE.txt)）
- **問題回報**：[GitHub Issues](https://github.com/WhiteBr1ck/agy-powertools/issues)（提交時請附上作業系統、Antigravity 版本與外掛版本）
- **社群連結**：[LINUX DO](https://linux.do/)
