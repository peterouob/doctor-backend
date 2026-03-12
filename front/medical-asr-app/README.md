# Medical ASR Frontend

React + Tailwind CSS + React Router DOM 前端應用。

## 快速啟動

```bash
npm install
cp .env.example .env.local   # 填入你的 API key 與後端地址
npm run dev                   # http://localhost:3000
```

## 測試帳號

| 帳號      | 密碼     |
|-----------|----------|
| dr.chen   | demo1234 |
| dr.wang   | demo1234 |

## 專案結構

```
src/
├── contexts/
│   ├── AuthContext.jsx     # 登入狀態
│   └── AgentContext.jsx    # Multi-agent 狀態與通知
├── hooks/
│   ├── useRecording.js     # 麥克風 + WebSocket + ASR
│   └── useAgentRunner.js   # AI agent 編排邏輯
├── lib/
│   └── api.js              # 所有外部 API 呼叫集中於此
├── components/
│   ├── Navbar.jsx
│   ├── NotificationBell.jsx
│   └── AgentStatusPanel.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── AgentResultPage.jsx
│   └── TranscriptionPage.jsx
└── App.jsx                 # Router 設定
```

## 頁面路由

| 路由            | 說明                         |
|-----------------|------------------------------|
| `/login`        | 登入頁                       |
| `/dashboard`    | TODO 列表 + AI Agent 啟動    |
| `/agent/:id`    | 單一 Agent 結果頁            |
| `/transcription`| 語音錄音 + 即時辨識          |

## 環境變數

| 變數                | 說明                     | 預設值                  |
|---------------------|--------------------------|-------------------------|
| `VITE_API_BASE`     | Go Gateway HTTP base URL | `http://localhost:8081` |
| `VITE_WS_BASE`      | Go Gateway WS base URL   | `ws://localhost:8081`   |
| `VITE_ANTHROPIC_KEY`| Anthropic API Key        | *(必填)*                |
