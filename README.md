# AETHER: AI Security Automation
### Next-Gen Agentic Security Orchestration & Autonomous Forensics

AETHER is an elite agentic AI platform designed to sit atop the CrowdStrike Falcon infrastructure. It acts as a "Cognitive Layer," transforming raw security telemetry into high-fidelity forensic intelligence and autonomous response actions.

---

## WHAT IS AETHER?
Modern Security Operations Centers (SOC) are drowning in data but starving for time. EDR tools like CrowdStrike provide world-class sensory input (logs, process trees, network flows), but an analyst still has to manually piece the puzzle together.

Aether changes the paradigm. By leveraging the Gemini 3 Pro Neural Core, Aether doesn't just show you alerts—it thinks through them. It autonomously queries the API, reconstructs attack timelines, and can execute containment protocols without human intervention.

---

## KEY FEATURES

### 1. Autonomous Forensic Investigation
When a high-severity alert triggers, Aether immediately initiates a "Thinking Loop." It uses the Falcon API to pull process command lines, host metadata, and related detections to build a comprehensive forensic report before an analyst even opens the ticket.

### 2. Neural Load Index (NLI)
A real-time pressure metric calculated at the kernel level.
*   Low NLI (<30%): Baseline operations; standard background noise.
*   High NLI (>70%): Active campaign detected; the environment is under significant pressure.
*   Calculation: NLI = min(100, (Critical_Incidents * 20) + (Open_Incidents * 4))

### 3. Tactical Heuristics (Playbooks)
Aether comes pre-loaded with specialized "Neural Playbooks" that target specific attack vectors:
*   Root Cause Reconstruction: Rebuilds the entire process lineage from kernel events.
*   Lateral Movement Sweep: Correlates incidents to identify shared credentials across your fleet.
*   Ransomware Audit: Scans for Shadow Copy deletion and mass encryption signatures.

### 4. Autonomous Response & Containment
Aether is authorized to execute Kernel-Level Host Isolation. If the AI confirms a high-confidence threat (e.g., active data exfiltration or credential dumping), it can trigger contain_host via the API to stop the adversary in milliseconds.

### 5. MITRE ATT&CK Mapping
Every analysis produced by the core is automatically cross-referenced with the MITRE ATT&CK Framework, providing Tier-3 analysts with immediate TTP (Tactics, Techniques, and Procedures) identification.

---

## THE NEURAL CORE (How it Works)

Aether utilizes Gemini 3 Pro with a specific 32k Token Thinking Budget. This allows the AI to "reason" through thousands of lines of JSON telemetry.

1.  Ingestion: Receives raw JSON from CrowdStrike Falcon.
2.  Reasoning: The model enters a "Thinking" state, identifying patterns like obfuscated PowerShell or abnormal WMI calls.
3.  Action: If information is missing, the agent autonomously decides which Falcon API tool to call next.
4.  Synthesis: Outputs a human-readable "Strategic Intelligence" report with actionable recommendations.

---

## INSTALLATION AND LOCAL SETUP

### Step 1: Prepare Environment (Prerequisites)
1.  Node.js (v18.0+): Required to run the React engine.
2.  Modern Browser: Chrome/Edge is required for Gemini API support.

### Step 2: Local Initialization
1.  Download: Clone or download this repository.
2.  Install: Navigate to the folder and run:
    ```bash
    npm install
    ```

### Step 3: Secure API Credentials
*   Google Gemini API: Get a key from Google AI Studio (aistudio.google.com).
*   CrowdStrike API: In your Falcon Console, create a Client with Read access to Alerts/Detections/Incidents/Hosts and Write access to Hosts (for containment).

### Step 4: Launch
1.  Expose your Gemini key:
    ```bash
    export API_KEY='your_key_here'
    ```
2.  Run the app:
    ```bash
    npm run dev
    ```
3.  Navigate to http://localhost:3000 and use the Core Config button to link your CrowdStrike account.

---
**AETHER: NEURAL DEFENSE. COGNITIVE SUPERIORITY.**
