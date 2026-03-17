# 🩺 醫療 ASR 與 AI 醫師助手系統 (Medical ASR & Doctor Assistance System)

## 一、 系統簡介
本系統為醫療場景設計的即時語音轉錄與 AI 助手，旨在幫助醫師在診療過程中自動記錄病歷，並透過 AI 生成結構化的 SOAP 報告。系統採用 Go 語言開發後端，並結合 NVIDIA Triton Inference Server 進行高效能 AI 推理。

---

## 二、 系統架構與資料流 (Architecture & Data Flow)

### 1. 系統邏輯架構
系統採用微服務化與異步處理架構，確保語音轉錄的高可用性與低延遲。
**目前先以單體服務為主**

```mermaid
graph TD
    subgraph "前端介面 (User Interface)"
        UI[醫師工作台 / React]
    end

    subgraph "核心服務 (Go Backend)"
        GW[Router / Gin]
        ASR[ASR Service / WebSocket]
        K_Prod[Kafka Producer]
        Scribe[Scribe Agent / Consumer]
        Synth[Synthesizer Agent]
        Orch[Orchestrator / Eino Graph]
    end

    subgraph "AI 推理層 (Triton Server)"
        Wisp[Whisper Model]
        LLM[Medical LLM]
    end

    UI -- "音訊串流" --> ASR
    ASR -- "gRPC 推理" --> Wisp
    ASR -- "原始文字" --> K_Prod
    K_Prod -- "事件" --> Scribe
    Scribe -- "語意優化" --> LLM
    UI -- "生成 SOAP" --> Synth
    UI -- "觸發任務編排" --> Orch
    Orch -- "批次處理" --> LLM
    Orch -- "持久化" --> DB[(MySQL)]
    Synth -- "摘要分析" --> LLM
```

### 2. 即時處理流程
描述從醫師錄音到系統生成正式病歷與任務處理的完整路徑：

```mermaid
sequenceDiagram
    participant Dr as 醫生 (前端)
    participant BE as 後端服務 (Go)
    participant Eino as Eino Graph
    participant AI as Triton AI
    participant DB as 資料庫

    Dr->>BE: 1. 開啟 WebSocket 並傳送音訊
    loop 每 100ms
        BE->>AI: 2. 呼叫 Whisper 識別
        AI-->>BE: 3. 回傳文字片段
        BE-->>Dr: 4. 即時回顯轉錄文字
    end
    BE->>AI: 5. Scribe Agent 自動修復語法錯誤
    Dr->>BE: 6. 請求生成 SOAP 醫療報告
    BE->>AI: 7. LLM 根據對話生成專業摘要
    AI->>HIS: 8. 藉由agent同時摘要病患的病例重點
    HIS-->>BE: 8. 由歷史病例重點以及LLM推理返回結構化報告
    BE->>DB: 9. 儲存病歷紀錄以供檢閱修改
    BE-->>Dr: 10. 顯示最終病歷報告
    
    Note over Dr, DB: 任務編排流程 (Orchestration)
    Dr->>BE: 11. 執行後端 Eino 編排
    BE->>Eino: 12. 啟動 Graph 工作流
    Eino->>DB: 13. Fetch Pending Todos
    Eino->>AI: 14. 分流至專家 Agent (摘要/診斷/排程)
    AI-->>Eino: 15. 返回處理結果
    Eino->>DB: 16. 更新狀態為 Done
    BE-->>Dr: 17. 回傳批次處理報告
```

---

## 三、 功能實現狀態 (Feature Status)

| 模組 | 功能點 | 狀態    | 技術棧 |
| :--- | :--- |:------| :--- |
| **基礎架構** | 資料庫/緩存/Kafka 環境搭建 | ✅ 已完成 | MySQL, Redis, Kafka |
| **語音服務** | WebSocket 串流接收與 ASR 推理 | ✅ 已完成 | Whisper (目前有年包問題) |
| **認證系統** | 醫師註冊/登入 (JWT) | ✅ 已完成 | Gin, JWT |
| **AI Agents** | **Scribe Agent** (文字修正) | ✅ 已完成 | LLM, Kafka Consumer |
| **AI Agents** | **Synthesizer Agent** (SOAP 生成) | ✅ 已完成 | LLM, Agentic Workflow |
| **AI Agents** | **Orchestrator** (TODO 事項編排) | 未完成   | Eino Graph, Multi-Agent |
| **前端介面** | 錄音/即時轉錄/Dashboard | ✅ 已完成 | React, Vite, Tailwind |
| **AI 模型** | LLM 醫療微調與 Triton 配置 | ✅ 已完成 | NVIDIA Triton |

---

## 四、 技術棧總覽 (Technology Stack)

- **Backend**: Go (Gin)
- **Frontend**: React, Transformer js
- **AI Orchestration**: CloudWeGo Eino (Graph, Chain, Lambda)
- **AI Inference**: NVIDIA Triton Inference Server (gRPC)
- **AI Models**: Whisper, Medical-specific LLM(本機上使用Qwen2-5-0.5b)
- **Database**: MySQL (GORM), Redis
- **Message Queue**: Apache Kafka
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
- **DevOps**: Docker, Docker Compose

---

## 五、 後續規劃 (Roadmap)

1. **RAG** 模組開發：整合外部醫療知識庫，提升 AI 回答的專業性與準確性。

2. **歷史病例分析**：利用 AI 分析過往病歷，提供診療建議與預測，增加模型病例分析準確性，以及當收到病患預約時能夠自動分析病患過往病歷，讓醫師不需要翻閱之前的資料。

3. **Stream**: 改善目前語音系統，使用streaming的方式即時產出SOAP