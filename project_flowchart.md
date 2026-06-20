# RESILIO: System Architecture & Workflows Flowchart

This flowchart outlines how the **RESILIO** municipal traffic command center operates. It diagrams the path from user login, role assignment, and localized data filtering, to real-time simulation repaints, machine learning ETA predictions, and interactive Llama 3 command dispatches.

---

## 🗺️ System-Wide Flowchart

```mermaid
graph TD
    classDef planner fill:#7c3aed,stroke:#a78bfa,stroke-width:2px,color:#fff;
    classDef commissioner fill:#e11d48,stroke:#fda4af,stroke-width:2px,color:#fff;
    classDef inspector fill:#2563eb,stroke:#93c5fd,stroke-width:2px,color:#fff;
    classDef backend fill:#059669,stroke:#34d399,stroke-width:2px,color:#fff;
    classDef common fill:#1f2937,stroke:#4b5563,stroke-width:1px,color:#fff;

    Start([User Logs In / Auth Endpoint]) --> SwitchRole{Role Swapper}

    %% Role 1: Transit Planner
    SwitchRole -->|Transit Planner| TP["1. Transit Planner console"]:::planner
    TP -->|Toggle Transit Overlay| TPOverlay[Show 7 corridor bus lanes on map]:::planner
    TP -->|Input Sandbox Surges| TPSimulate[Digital Twin Sandbox: Footfall/Vehicles]:::planner
    TPSimulate -->|POST /api/simulate| BE_Sim[FastAPI Sandbox Simulator]:::backend
    BE_Sim -->|Return Bottleneck Nodes| TPMap[Render bottleneck points & alert banner]:::planner
    TPSimulate -->|GET /api/transit/multi-modal| BE_Rec[FastAPI Router suggestions]:::backend
    BE_Rec -->|Generate detours| TPOpt[Show reroute cards in bottom deck]:::planner
    TPOpt -->|Click Deploy Reroute| TPDeploy[Lock thick neon Cyan-Blue line on Map]:::planner

    %% Role 2: Field Inspector
    SwitchRole -->|Field Inspector| FI["2. Field Inspector console"]:::inspector
    FI -->|Switch Jurisdiction| FI_RLS[Filter telemetry list by Police Station]:::inspector
    FI_RLS -->|Select Local Incident| FISelect[Select active incident]:::inspector
    FISelect -->|Fetch incident diagnostics| BE_Diag:::backend

    %% Role 3: Command Commissioner
    SwitchRole -->|Command Commissioner| CC["3. Command Commissioner console"]:::commissioner
    CC -->|Global Read| CC_Global[Inspect all live incident cards]:::commissioner
    CC_Global -->|Select Incident| CCSelect[Select active incident]:::commissioner
    CCSelect -->|Fetch incident diagnostics| BE_Diag[FastAPI ML / LLM engines]:::backend

    %% Backend engines
    BE_Diag -->|1. Run LightGBM Predictor| ML_ETA[Predict clearance time - minutes]:::backend
    BE_Diag -->|2. Compute SHAP Values| ML_SHAP[Calculate feature contribution indicators]:::backend
    BE_Diag -->|3. Llama 3 SOP Generator| LLM_SOP[Generate standard tactical checklists]:::backend

    %% Incident Details Cards Rendering
    ML_ETA --> RenderDetails[Display detailed cards in bottom deck]:::common
    ML_SHAP --> RenderDetails
    LLM_SOP --> RenderDetails

    %% Role-Specific details card actions
    RenderDetails -->|Inspector / Commissioner| FI_Loop[Verify Ground Deployment Loop]:::inspector
    FI_Loop -->|Input deployed officers/barricades| BE_Feedback[Compute speed drops & detours]:::backend
    BE_Feedback --> DisplayFeedback[Update local speed indicators]:::common
    
    RenderDetails -->|Commissioner Only| CC_Llama[Llama 3 Interactive AI Console]:::commissioner
    CC_Llama -->|Type Dispatch Directive| BE_LlamaCommand[POST /api/incidents/llama-command]:::backend
    BE_LlamaCommand -->|Llama 3 inference| CC_LlamaRes[Directive checklist & AI Decision Rationale]:::commissioner
    CC_LlamaRes -->|Click Broadcast| CC_Toast[Trigger custom success dispatch toast]:::commissioner

    RenderDetails -->|Commissioner / Inspector RLS| CC_Resolve[Toggle Status: Active / Clear Incident]:::commissioner
```

---

## 📝 Flow Explanation

### 1. Authentication & Role Switcher
* The platform starts at the login page. Based on the selected profile, users are allocated separate security contexts:
  * **Transit Planner**: Macro transit routing.
  * **Command Commissioner**: Global administrative oversight.
  * **Field Inspector**: Localized jurisdiction response.

### 2. Transit Planner pipeline (Macro Flow)
* **Goal**: Optimize bus lanes and traffic flow corridors.
* **Input**: Surges (vehicles and footfall) are entered into the sandbox.
* **Processing**: FastAPI simulates bottlenecks and computes suggestions.
* **Output**: The map displays bottleneck points and suggestions card deck appears. Clicking **Deploy** locks in a cyan priority route on the GIS map.

### 3. Incident Diagnostics pipeline (Micro Flow)
* **Goal**: Predict incident clearance time and outline tactical SOPs.
* **Process**: Selecting an active incident pulls logs.
  * **LightGBM Model**: Predicts the clearance time in minutes.
  * **SHAP Model**: Explains variable weight impacts (e.g. why the ETA is high or low).
  * **Llama 3 Engine**: Generates context-based Standard Operating Procedures (SOPs).

### 4. Interactive Command Console & RLS (Action Flow)
* **Command Commissioner**: Accesses the Llama 3 AI command console to request customized dispatches. The backend returns both the dispatch checklist and the **AI Decision Rationale** ("Why this is taken").
* **Field Inspector**: Limited to their police station jurisdiction (Row-Level Security). They submit feedback (deployed units) to calculate localized speed drops.
