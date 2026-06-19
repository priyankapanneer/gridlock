# RESILIO: Tactical Traffic Command Platform
## Setup, Execution & Interactive Demo Guide

RESILIO is an enterprise-tier municipal traffic command dashboard featuring real-time telemetry, LightGBM Time-to-Clear predictions, SHAP explainability charts, Llama 3 tactical SOP checklists, and a dynamic Digital Twin Sandbox.

---

## 1. Prerequisites

Before running the application, make sure you have the following installed on your machine:
* **Python**: Version 3.11 or higher.
* **Node.js**: Version 18.0 or higher.
* **npm**: Installed automatically with Node.js.

---

## 2. Quick Start: Automated Execution

The project includes an automated PowerShell script that sets up virtual environments, installs requirements, and runs both servers simultaneously.

1. Open PowerShell inside the project root directory (`d:\gridlock`).
2. Run the startup script:
   ```powershell
   powershell -File start_all.ps1
   ```
3. Once completed:
   * The backend will run on `http://localhost:8080`.
   * The frontend Vite dev server will start and output the local URL (usually `http://localhost:5173`). Open this URL in your web browser.

---

## 3. Manual Step-by-Step Setup

If you prefer to run the components separately or diagnose issues, follow these manual setup steps:

### A. Python Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd d:\gridlock\backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   * **Windows PowerShell**: `.\venv\Scripts\Activate.ps1`
   * **macOS/Linux**: `source venv/bin/activate`
4. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8080
   ```
   *Note: On startup, the backend automatically reads the 4.5MB historical traffic CSV file (`Astram event data`) and seeds the SQLite database (`resilio_traffic.db`) if empty.*

### B. Vite Frontend Setup
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd d:\gridlock\frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Run the frontend dev server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173` in your web browser.

---

## 4. Default Credentials (System Roles)

You can log into the platform using any of the following default credentials to inspect role-specific tactical command capabilities:

| Role Name | Username | Password | Access Capabilities |
|---|---|---|---|
| **Transit Planner** | `planner1` | `password` | Digital Twin Sandbox, Transit Overlays, BMTC suggestions |
| **Command Commissioner** | `commissioner1` | `password` | Global incident view, status resolution overrides |
| **Field Inspector** | `inspector1` | `password` | Station RLS (filters to HAL Old Airport PS), Ground feedback loop |

*Note: You can switch roles dynamically at any time using the role selector dropdown located inside the top header center.*

---

## 5. Step-by-Step Interactive Demo Walkthrough

### Scenario 1: Digital Twin Sandbox & Route Shifting
1. Log in as the **Transit Planner** (`planner1` / `password`).
2. Toggle the **Transit Overlay** checkbox inside the global header's center panel. You will see green lines tracing the 7 major traffic corridors across Bengaluru.
3. Locate the **Digital Twin Sandbox** panel inside the left sidebar.
4. Drag/type parameters and observe the map:
   * **Vehicles Surge** (`>= 5000`): The outer highway loops (Outer Ring Road, Bellary Road, Tumkur Road) immediately turn **Neon Cyan-Blue** and expand to **18px** width.
   * **Footfall Surge** (`>= 10000`): The inner city routes (HAL Airport Road, Hosur Road, Mysore Road, Old Madras Road) immediately turn **Amber-Orange** and expand to **18px** width.
   * **Compound Surge** (Both met): The entire city grid illuminates in Cyan-Blue and **Crimson Red** to signify a coordinated override.
5. Set `Footfall Surge: 15000` and `Vehicles Surge: 6000`, then click **Run Scenario Simulation**.
6. A premium, desaturated **mint-green Simulation Alert Banner** slides open at the top center of the map.
7. The split-pane deck at the bottom slides open, displaying active BMTC Transit routing suggestion cards.
8. Look at the routes: notice that the paths for Route 500A and Route G-4 have physically shifted/morphed on the map to show detour paths (Outer Bypass link and Wind Tunnel link).
9. Click **Deploy Priority Reroute** on Route 500A.
10. The corresponding line on the map instantly transitions to a **thick (`24px`), glowing neon Cyan-Blue line**, confirming prioritize signals are locked.

### Scenario 2: Master-Detail Telemetry & AI Explainability
1. Click any anomaly card inside the left sidebar's **Live Telemetry** stream.
2. The bottom split-pane panel slides open:
   * **Card 1**: Incident Overview and RLS-enforced "Clear Incident" controls.
   * **Card 2**: LightGBM v4 ETA predicting the Time-to-Clear.
   * **Card 3**: SHAP contribution metrics showing which parameters increased (red) or decreased (green) the ETA in real-time.
   * **Card 4**: Prescriptive allocations (officers and barricades needed) and network flow bypasses.
   * **Card 5**: Llama 3 Tactical SOP Checklist.
   * **Card 6**: Ground feedback loop (enter Officers/Barricades deployed to compute speed drops).
3. Click the close (**X**) button on Card 1 to close the detail pane and return to the map viewport.
