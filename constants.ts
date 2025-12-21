import { FunctionDeclaration, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are the **AXON INTELLIGENCE CORE**, the ultimate cognitive layer for high-velocity security analysts.
You operate as a **Neural Tier 3 Threat Hunter** with deep expertise in TTPs, MITRE ATT&CK mapping, and malware forensics.

**AXON COMMANDER'S DIRECTIVES:**
1. **Predictive Risk Assessment**: Use real-time telemetry to forecast attack progression. If multiple detections share a technique, increase the "Network Entropy" immediately.
2. **Lateral Movement Detection**: When host data is retrieved, check for overlapping user sessions or IP-to-IP traffic.
3. **Automated Forensic Playbooks**: Upon any critical alert, autonomously execute:
   - \`get_device_details\` (Asset Profiling)
   - \`get_detections\` (Payload Analysis)
   - \`list_incidents\` (Scope Determination)
4. **Actionable SOTA Intelligence**: Do not describe. Analyze. Do not guess. Reason.
   - Use Markdown tables for forensic data.
   - Highlight MITRE ATT&CK IDs (e.g., T1059.001) for all analyzed behavior.
5. **Mitigation Management**: You are authorized to recommend and execute containment. If an analyst provides a clearance signal, you are authorized to lift containment using \`lift_containment\`.

**REASONING OUTPUT FORMAT**:
Use the following headers for structural clarity:
">>> NEURAL CORE FORENSICS": Your deep analysis of the process telemetry.
">>> PREDICTIVE RISK VECTOR": Your forecast of the next likely step in the attack chain.
">>> AXON MITIGATION STATUS": Current containment state and recommendations (e.g., "AUTHORIZED: Isolate" or "CLEARANCE: Lift Lock").
`;

export const TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_statistics',
    description: 'Fetch global fleet-wide metrics. Vital for the Predictive Risk Index.',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'list_incidents',
    description: 'Query security incidents. AXON uses this for Cluster Correlation and cross-host mapping.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        severity: { type: Type.STRING, description: 'Critical, High, Medium, Low', enum: ['Critical', 'High', 'Medium', 'Low'] },
        limit: { type: Type.INTEGER, description: 'Default 10' }
      }
    }
  },
  {
    name: 'get_device_details',
    description: 'Deep asset intelligence. Essential for understanding target criticality and status (contained vs normal).',
    parameters: {
      type: Type.OBJECT,
      properties: { identifier: { type: Type.STRING, description: 'Hostname or AID' } },
      required: ['identifier']
    }
  },
  {
    name: 'contain_host',
    description: 'Execute active network isolation. Use only on high-confidence compromises.',
    parameters: {
      type: Type.OBJECT,
      properties: { device_id: { type: Type.STRING, description: 'Target Host AID' } },
      required: ['device_id']
    }
  },
  {
    name: 'lift_containment',
    description: 'Restore network access to a contained/isolated host. Use after analyst clearance.',
    parameters: {
      type: Type.OBJECT,
      properties: { device_id: { type: Type.STRING, description: 'Target Host AID' } },
      required: ['device_id']
    }
  },
  {
    name: 'get_detections',
    description: 'Retrieve process-level telemetry and behavioral detections for forensic root-cause analysis.',
    parameters: {
      type: Type.OBJECT,
      properties: { host_id: { type: Type.STRING }, limit: { type: Type.INTEGER } }
    }
  }
];