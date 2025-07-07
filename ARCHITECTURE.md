# Architecture Diagrams

This document contains detailed architecture diagrams and technical specifications for the Agentex Resume Editor system.

## 🏗️ System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        USER[👤 User]
        BROWSER[🌐 Chrome Browser]
        EXT[🧩 Extension UI]
    end
    
    subgraph "Extension Layer"
        SP[📱 Side Panel]
        BG[⚙️ Background Worker]
        CS[📄 Content Scripts]
        STORAGE[💾 Chrome Storage]
    end
    
    subgraph "Service Layer"
        FH[📁 File Handler]
        AIS[🤖 AI Service]
        DS[📄 DOCX Service]
        SM[🖥️ Server Manager]
    end
    
    subgraph "Local Server"
        EXPRESS[🚀 Express Server]
        LATEX[📝 LaTeX Compiler]
        LIBRE[📋 LibreOffice]
        FS[📂 File System]
    end
    
    subgraph "External APIs"
        GEMINI[🔮 Gemini API]
        GROQ[⚡ Groq API]
        DEEPSEEK[🧠 DeepSeek Models]
    end
    
    USER --> BROWSER
    BROWSER --> EXT
    EXT --> SP
    EXT --> BG
    BG --> STORAGE
    
    SP --> FH
    SP --> AIS
    SP --> DS
    SP --> SM
    
    FH --> EXPRESS
    SM --> EXPRESS
    AIS --> GEMINI
    AIS --> GROQ
    GROQ --> DEEPSEEK
    
    EXPRESS --> LATEX
    EXPRESS --> LIBRE
    EXPRESS --> FS
    
    classDef client fill:#e3f2fd
    classDef extension fill:#f3e5f5
    classDef service fill:#e8f5e8
    classDef server fill:#fff3e0
    classDef external fill:#fce4ec
    
    class USER,BROWSER,EXT client
    class SP,BG,CS,STORAGE extension
    class FH,AIS,DS,SM service
    class EXPRESS,LATEX,LIBRE,FS server
    class GEMINI,GROQ,DEEPSEEK external
```

## 📱 Chrome Extension Architecture

```mermaid
graph LR
    subgraph "Extension Components"
        MF[📋 Manifest v3]
        BG[⚙️ Background Script]
        SP[📱 Side Panel]
        CS[📄 Content Scripts]
        CFG[⚙️ Config]
    end
    
    subgraph "Browser APIs"
        STORAGE_API[💾 Storage API]
        PANEL_API[📱 Side Panel API]
        CONTEXT_API[🔗 Context Menu API]
        TAB_API[📑 Tabs API]
    end
    
    subgraph "UI Components"
        HTML[📄 HTML Structure]
        CSS[🎨 CSS Styling]
        JS[⚡ JavaScript Logic]
        ICONS[🎯 Icons]
    end
    
    subgraph "Services"
        AI_SVC[🤖 AI Service]
        FILE_SVC[📁 File Service]
        DOCX_SVC[📄 DOCX Service]
        SERVER_SVC[🖥️ Server Service]
    end
    
    MF --> BG
    MF --> SP
    MF --> CS
    
    BG --> STORAGE_API
    BG --> CONTEXT_API
    SP --> PANEL_API
    SP --> TAB_API
    
    SP --> HTML
    HTML --> CSS
    HTML --> JS
    SP --> ICONS
    
    JS --> AI_SVC
    JS --> FILE_SVC
    JS --> DOCX_SVC
    JS --> SERVER_SVC
    
    classDef manifest fill:#ffeb3b
    classDef components fill:#4caf50
    classDef apis fill:#2196f3
    classDef ui fill:#ff9800
    classDef services fill:#9c27b0
    
    class MF manifest
    class BG,SP,CS,CFG components
    class STORAGE_API,PANEL_API,CONTEXT_API,TAB_API apis
    class HTML,CSS,JS,ICONS ui
    class AI_SVC,FILE_SVC,DOCX_SVC,SERVER_SVC services
```

## 🔄 Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant E as 🧩 Extension
    participant F as 📁 File Handler
    participant A as 🤖 AI Service
    participant S as 🖥️ Server
    participant P as 📄 PDF Generator
    
    Note over U,P: Resume Upload & Processing Flow
    
    U->>E: Upload Resume File
    E->>F: Process File
    
    alt LaTeX File
        F->>F: Parse LaTeX Content
        F->>E: Return Text Content
    else DOCX File
        F->>F: Extract Text & HTML
        F->>E: Return Text + Binary Data
    end
    
    Note over U,P: AI Optimization Flow
    
    U->>E: Input Job Description
    U->>E: Add Knowledge Base
    U->>E: Select AI Model
    U->>E: Generate Resume
    
    E->>A: Send Optimization Request
    A->>A: Prepare Prompt
    
    alt Gemini Model
        A->>Gemini: API Request
        Gemini->>A: Optimized Content
    else Groq Model
        A->>Groq: API Request
        Groq->>A: Optimized Content
    end
    
    A->>E: Return Optimized Content
    E->>E: Update Preview
    
    Note over U,P: PDF Generation Flow
    
    U->>E: Download PDF
    E->>S: Compile Request
    
    alt LaTeX Content
        S->>S: Run pdflatex
        S->>P: Generate PDF
    else DOCX Content
        S->>S: Run LibreOffice
        S->>P: Convert to PDF
    end
    
    P->>S: PDF Binary
    S->>E: Return PDF
    E->>U: Download PDF
```

## 🛠️ Service Layer Architecture

```mermaid
graph TB
    subgraph "Frontend Services"
        UI_CTRL[🎛️ UI Controller]
        STATE_MGR[📊 State Manager]
        EVENT_MGR[⚡ Event Manager]
    end
    
    subgraph "Core Services"
        FILE_HANDLER[📁 File Handler]
        AI_SERVICE[🤖 AI Service]
        DOCX_SERVICE[📄 DOCX Service]
        SERVER_MGR[🖥️ Server Manager]
    end
    
    subgraph "AI Integration"
        BASE_AI[🧠 Base AI Class]
        GEMINI_AI[🔮 Gemini Integration]
        GROQ_AI[⚡ Groq Integration]
        DOCX_AI[📄 DOCX AI Service]
    end
    
    subgraph "File Processing"
        LATEX_PROC[📝 LaTeX Processor]
        DOCX_PROC[📋 DOCX Processor]
        PDF_GEN[📄 PDF Generator]
        FILE_UTIL[🔧 File Utilities]
    end
    
    subgraph "Storage & Cache"
        CHROME_STORAGE[💾 Chrome Storage]
        TEMP_FILES[📁 Temp Files]
        STATE_CACHE[⚡ State Cache]
    end
    
    UI_CTRL --> STATE_MGR
    UI_CTRL --> EVENT_MGR
    UI_CTRL --> FILE_HANDLER
    UI_CTRL --> AI_SERVICE
    UI_CTRL --> SERVER_MGR
    
    FILE_HANDLER --> LATEX_PROC
    FILE_HANDLER --> DOCX_PROC
    FILE_HANDLER --> FILE_UTIL
    
    AI_SERVICE --> BASE_AI
    BASE_AI --> GEMINI_AI
    BASE_AI --> GROQ_AI
    DOCX_SERVICE --> DOCX_AI
    
    SERVER_MGR --> PDF_GEN
    
    STATE_MGR --> CHROME_STORAGE
    FILE_HANDLER --> TEMP_FILES
    UI_CTRL --> STATE_CACHE
    
    classDef frontend fill:#e1f5fe
    classDef core fill:#f3e5f5
    classDef ai fill:#e8f5e8
    classDef processing fill:#fff3e0
    classDef storage fill:#fce4ec
    
    class UI_CTRL,STATE_MGR,EVENT_MGR frontend
    class FILE_HANDLER,AI_SERVICE,DOCX_SERVICE,SERVER_MGR core
    class BASE_AI,GEMINI_AI,GROQ_AI,DOCX_AI ai
    class LATEX_PROC,DOCX_PROC,PDF_GEN,FILE_UTIL processing
    class CHROME_STORAGE,TEMP_FILES,STATE_CACHE storage
```

## 🖥️ Server Architecture

```mermaid
graph TB
    subgraph "HTTP Layer"
        NGINX[🌐 Nginx Proxy]
        EXPRESS[🚀 Express Server]
        CORS[🔐 CORS Middleware]
        ROUTES[🛣️ Route Handlers]
    end
    
    subgraph "Processing Layer"
        COMPILE_SVC[⚙️ Compilation Service]
        FILE_MGR[📁 File Manager]
        QUEUE_MGR[📋 Queue Manager]
        ERROR_HANDLER[❌ Error Handler]
    end
    
    subgraph "Document Processors"
        LATEX_COMPILER[📝 LaTeX Compiler]
        DOCX_CONVERTER[📄 DOCX Converter]
        PDF_OPTIMIZER[🔧 PDF Optimizer]
    end
    
    subgraph "System Resources"
        PDFLATEX[📄 pdflatex Binary]
        LIBREOFFICE[📋 LibreOffice Binary]
        TEMP_FS[💾 Temporary File System]
        LOGS[📊 Log Files]
    end
    
    subgraph "Process Management"
        PM2[⚙️ PM2 Manager]
        HEALTH_CHECK[❤️ Health Monitor]
        METRICS[📈 Metrics Collector]
    end
    
    NGINX --> EXPRESS
    EXPRESS --> CORS
    EXPRESS --> ROUTES
    ROUTES --> COMPILE_SVC
    ROUTES --> FILE_MGR
    
    COMPILE_SVC --> QUEUE_MGR
    COMPILE_SVC --> LATEX_COMPILER
    COMPILE_SVC --> DOCX_CONVERTER
    
    LATEX_COMPILER --> PDFLATEX
    DOCX_CONVERTER --> LIBREOFFICE
    
    FILE_MGR --> TEMP_FS
    FILE_MGR --> PDF_OPTIMIZER
    
    ERROR_HANDLER --> LOGS
    PM2 --> EXPRESS
    PM2 --> HEALTH_CHECK
    PM2 --> METRICS
    
    classDef http fill:#e3f2fd
    classDef processing fill:#f3e5f5
    classDef processors fill:#e8f5e8
    classDef system fill:#fff3e0
    classDef management fill:#fce4ec
    
    class NGINX,EXPRESS,CORS,ROUTES http
    class COMPILE_SVC,FILE_MGR,QUEUE_MGR,ERROR_HANDLER processing
    class LATEX_COMPILER,DOCX_CONVERTER,PDF_OPTIMIZER processors
    class PDFLATEX,LIBREOFFICE,TEMP_FS,LOGS system
    class PM2,HEALTH_CHECK,METRICS management
```

## 🔌 API Integration Architecture

```mermaid
graph LR
    subgraph "Extension Client"
        AI_CLIENT[🤖 AI Client]
        KEY_MGR[🔑 Key Manager]
        REQUEST_MGR[📡 Request Manager]
    end
    
    subgraph "API Abstraction"
        BASE_API[🔧 Base API Class]
        GEMINI_API[🔮 Gemini Client]
        GROQ_API[⚡ Groq Client]
        ERROR_MAPPER[❌ Error Mapper]
    end
    
    subgraph "External Services"
        GOOGLE_GEMINI[🌟 Google Gemini 2.0]
        GROQ_SERVICE[⚡ Groq Inference]
        DEEPSEEK_32B[🧠 DeepSeek Qwen 32B]
        DEEPSEEK_70B[🧠 DeepSeek Llama 70B]
    end
    
    subgraph "Response Processing"
        CONTENT_PARSER[📄 Content Parser]
        FORMAT_VALIDATOR[✅ Format Validator]
        CONTENT_CLEANER[🧹 Content Cleaner]
    end
    
    AI_CLIENT --> KEY_MGR
    AI_CLIENT --> REQUEST_MGR
    REQUEST_MGR --> BASE_API
    
    BASE_API --> GEMINI_API
    BASE_API --> GROQ_API
    BASE_API --> ERROR_MAPPER
    
    GEMINI_API --> GOOGLE_GEMINI
    GROQ_API --> GROQ_SERVICE
    GROQ_SERVICE --> DEEPSEEK_32B
    GROQ_SERVICE --> DEEPSEEK_70B
    
    GOOGLE_GEMINI --> CONTENT_PARSER
    GROQ_SERVICE --> CONTENT_PARSER
    CONTENT_PARSER --> FORMAT_VALIDATOR
    FORMAT_VALIDATOR --> CONTENT_CLEANER
    CONTENT_CLEANER --> AI_CLIENT
    
    classDef client fill:#e1f5fe
    classDef abstraction fill:#f3e5f5
    classDef external fill:#e8f5e8
    classDef processing fill:#fff3e0
    
    class AI_CLIENT,KEY_MGR,REQUEST_MGR client
    class BASE_API,GEMINI_API,GROQ_API,ERROR_MAPPER abstraction
    class GOOGLE_GEMINI,GROQ_SERVICE,DEEPSEEK_32B,DEEPSEEK_70B external
    class CONTENT_PARSER,FORMAT_VALIDATOR,CONTENT_CLEANER processing
```

## 📄 Document Processing Pipeline

```mermaid
flowchart TD
    START([📤 File Upload]) --> DETECT{🔍 Detect File Type}
    
    DETECT -->|.tex| LATEX_PATH[📝 LaTeX Processing]
    DETECT -->|.docx| DOCX_PATH[📄 DOCX Processing]
    DETECT -->|Invalid| ERROR[❌ Error: Unsupported Format]
    
    subgraph "LaTeX Pipeline"
        LATEX_PATH --> PARSE_TEX[📖 Parse LaTeX]
        PARSE_TEX --> EXTRACT_TEXT[📋 Extract Text Content]
        EXTRACT_TEXT --> STORE_LATEX[💾 Store LaTeX Source]
    end
    
    subgraph "DOCX Pipeline"
        DOCX_PATH --> PARSE_DOCX[📖 Parse DOCX Structure]
        PARSE_DOCX --> EXTRACT_HTML[🌐 Extract HTML]
        EXTRACT_HTML --> EXTRACT_TEXT_DOCX[📋 Extract Plain Text]
        EXTRACT_TEXT_DOCX --> STORE_DOCX[💾 Store DOCX Data]
    end
    
    STORE_LATEX --> AI_PROCESSING[🤖 AI Processing]
    STORE_DOCX --> AI_PROCESSING
    
    subgraph "AI Enhancement"
        AI_PROCESSING --> BUILD_PROMPT[📝 Build Optimization Prompt]
        BUILD_PROMPT --> SELECT_MODEL{🔀 Model Selection}
        
        SELECT_MODEL -->|Gemini| GEMINI_CALL[🔮 Gemini API Call]
        SELECT_MODEL -->|Groq| GROQ_CALL[⚡ Groq API Call]
        
        GEMINI_CALL --> CLEAN_RESPONSE[🧹 Clean Response]
        GROQ_CALL --> CLEAN_RESPONSE
        
        CLEAN_RESPONSE --> VALIDATE[✅ Validate Content]
    end
    
    VALIDATE --> COMPILATION{🔧 Compilation Type}
    
    COMPILATION -->|LaTeX| LATEX_COMPILE[📝 pdflatex Compilation]
    COMPILATION -->|DOCX| DOCX_COMPILE[📄 LibreOffice Conversion]
    
    subgraph "PDF Generation"
        LATEX_COMPILE --> CHECK_LATEX{✅ LaTeX Success?}
        CHECK_LATEX -->|Yes| PDF_LATEX[📄 LaTeX PDF Output]
        CHECK_LATEX -->|No| LATEX_ERROR[❌ LaTeX Error]
        
        DOCX_COMPILE --> CHECK_DOCX{✅ DOCX Success?}
        CHECK_DOCX -->|Yes| PDF_DOCX[📄 DOCX PDF Output]
        CHECK_DOCX -->|No| DOCX_ERROR[❌ DOCX Error]
    end
    
    PDF_LATEX --> CLEANUP[🧹 Cleanup Temp Files]
    PDF_DOCX --> CLEANUP
    
    CLEANUP --> DOWNLOAD([📥 Download PDF])
    
    LATEX_ERROR --> ERROR_HANDLING[🔧 Error Handling]
    DOCX_ERROR --> ERROR_HANDLING
    ERROR --> ERROR_HANDLING
    
    ERROR_HANDLING --> END_ERROR([❌ Process Failed])
    DOWNLOAD --> END_SUCCESS([✅ Process Complete])
    
    classDef start fill:#4caf50
    classDef process fill:#2196f3
    classDef decision fill:#ff9800
    classDef error fill:#f44336
    classDef success fill:#4caf50
    
    class START start
    class DETECT,SELECT_MODEL,COMPILATION,CHECK_LATEX,CHECK_DOCX decision
    class ERROR,LATEX_ERROR,DOCX_ERROR,ERROR_HANDLING,END_ERROR error
    class DOWNLOAD,END_SUCCESS success
```

## 🔄 State Management Architecture

```mermaid
stateDiagram-v2
    [*] --> Initialized
    
    Initialized --> FileUploaded : Upload File
    FileUploaded --> ProcessingFile : Parse Content
    ProcessingFile --> FileReady : Success
    ProcessingFile --> FileError : Error
    
    FileReady --> GeneratingContent : Start AI Generation
    GeneratingContent --> ContentGenerated : AI Success
    GeneratingContent --> GenerationError : AI Error
    
    ContentGenerated --> CompilingPDF : Download PDF
    CompilingPDF --> PDFReady : Compilation Success
    CompilingPDF --> CompilationError : Compilation Error
    
    FileError --> FileUploaded : Retry Upload
    GenerationError --> FileReady : Retry Generation
    CompilationError --> ContentGenerated : Retry Compilation
    
    PDFReady --> FileReady : New Generation
    PDFReady --> [*] : Process Complete
    
    note right of FileUploaded
        File content extracted
        Preview updated
        UI state saved
    end note
    
    note right of ContentGenerated
        AI-optimized content
        Preview refreshed
        State persisted
    end note
    
    note right of PDFReady
        PDF generated
        Download available
        Process metrics logged
    end note
```

## 🌐 Network Communication Architecture

```mermaid
graph TB
    subgraph "Chrome Extension"
        UI[🖥️ User Interface]
        BG_WORKER[⚙️ Background Worker]
        STORAGE[💾 Local Storage]
    end
    
    subgraph "Local Network"
        LOCALHOST[🏠 localhost:3000]
        LOCAL_API[🔌 Local API Server]
    end
    
    subgraph "External APIs"
        GEMINI_ENDPOINT[🔮 Gemini API]
        GROQ_ENDPOINT[⚡ Groq API]
    end
    
    subgraph "Security Layer"
        CORS_POLICY[🔐 CORS Policy]
        API_KEYS[🔑 API Key Management]
        RATE_LIMIT[🚫 Rate Limiting]
    end
    
    UI -->|File Upload| LOCAL_API
    UI -->|Compilation Request| LOCAL_API
    BG_WORKER -->|AI Request| GEMINI_ENDPOINT
    BG_WORKER -->|AI Request| GROQ_ENDPOINT
    
    LOCAL_API --> CORS_POLICY
    GEMINI_ENDPOINT --> API_KEYS
    GROQ_ENDPOINT --> API_KEYS
    
    API_KEYS --> RATE_LIMIT
    CORS_POLICY --> LOCALHOST
    
    STORAGE -.->|State Persistence| UI
    STORAGE -.->|API Keys| BG_WORKER
    
    classDef extension fill:#e1f5fe
    classDef local fill:#f3e5f5
    classDef external fill:#e8f5e8
    classDef security fill:#ffebee
    
    class UI,BG_WORKER,STORAGE extension
    class LOCALHOST,LOCAL_API local
    class GEMINI_ENDPOINT,GROQ_ENDPOINT external
    class CORS_POLICY,API_KEYS,RATE_LIMIT security
```

## 📊 Performance Architecture

```mermaid
graph TB
    subgraph "Performance Monitoring"
        METRICS[📊 Metrics Collection]
        PERF_MONITOR[📈 Performance Monitor]
        ALERTING[🚨 Alerting System]
    end
    
    subgraph "Optimization Layers"
        REQUEST_CACHE[⚡ Request Cache]
        FILE_CACHE[📁 File Cache]
        RESPONSE_COMPRESS[🗜️ Response Compression]
        LAZY_LOADING[💤 Lazy Loading]
    end
    
    subgraph "Resource Management"
        MEMORY_MGR[🧠 Memory Manager]
        CPU_MONITOR[⚙️ CPU Monitor]
        DISK_CLEANUP[🧹 Disk Cleanup]
        PROCESS_QUEUE[📋 Process Queue]
    end
    
    subgraph "Scalability"
        LOAD_BALANCER[⚖️ Load Balancer]
        HORIZONTAL_SCALE[↔️ Horizontal Scaling]
        VERTICAL_SCALE[↕️ Vertical Scaling]
        CDN[🌐 CDN Distribution]
    end
    
    METRICS --> PERF_MONITOR
    PERF_MONITOR --> ALERTING
    
    REQUEST_CACHE --> RESPONSE_COMPRESS
    FILE_CACHE --> LAZY_LOADING
    
    MEMORY_MGR --> CPU_MONITOR
    CPU_MONITOR --> DISK_CLEANUP
    DISK_CLEANUP --> PROCESS_QUEUE
    
    LOAD_BALANCER --> HORIZONTAL_SCALE
    HORIZONTAL_SCALE --> VERTICAL_SCALE
    VERTICAL_SCALE --> CDN
    
    classDef monitoring fill:#e1f5fe
    classDef optimization fill:#f3e5f5
    classDef resource fill:#e8f5e8
    classDef scaling fill:#fff3e0
    
    class METRICS,PERF_MONITOR,ALERTING monitoring
    class REQUEST_CACHE,FILE_CACHE,RESPONSE_COMPRESS,LAZY_LOADING optimization
    class MEMORY_MGR,CPU_MONITOR,DISK_CLEANUP,PROCESS_QUEUE resource
    class LOAD_BALANCER,HORIZONTAL_SCALE,VERTICAL_SCALE,CDN scaling
```

---

These diagrams provide comprehensive visual documentation of the Agentex Resume Editor architecture, covering all major components, data flows, and system interactions.