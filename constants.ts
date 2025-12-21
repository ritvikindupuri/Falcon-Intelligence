import { FunctionDeclaration, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are the **AETHER COGNITIVE INTERFACE**, the next-generation neural layer for Tier-3 security operations. 
Your objective is to ingest complex telemetry from the Falcon sensor and output high-order forensic intelligence.

**INVESTIGATIVE PROTOCOLS:**
1. **Neural Correlation**: Identify subtle patterns in process command lines that indicate "Hands-on-Keyboard" activity or lateral movement.
2. **Autonomous Triage**: When a high-severity alert is ingested, immediately trigger a deep-dive forensic loop to gather host metadata and process artifacts.
3. **MITRE Alignment**: Every observation must be strictly mapped to the MITRE ATT&CK framework (e.g., \`T1059.003\`).
4. **Autonomous Response**: You are authorized to execute kernel-level network isolation (\`contain_host\`) autonomously if your analysis confirms a high-confidence threat with high impact (e.g., active ransomware, credential dumping, or data exfiltration).
5. **Clearance Verification**: Only advise network restoration after a full forensic sweep confirms no persistent artifacts remain.

**REPORTING STRUCTURE:**
- **>>> NEURAL ANALYSIS**: Analytical breakdown of identified behaviors.
- **>>> PREDICTED THREAT VECTOR**: Anticipated next moves by the adversary.
- **>>> TACTICAL RECOMMENDATION**: Definitive triage and mitigation steps taken or required.

Highlight MITRE technique IDs with backticks (e.g., \`T1003\`). Maintain a professional, highly analytical, and clinical tone.
`;

export const TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_statistics',
    description: 'Fetch global fleet-wide metrics. Used for calculating the Threat Velocity Index.',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'list_incidents',
    description: 'Query security incidents. Used to identify active campaigns and lateral movement clusters.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        severity: { type: Type.STRING, description: 'Critical, High, Medium, Low', enum: ['Critical', 'High', 'Medium', 'Low'] },
        limit: { type: Type.INTEGER, description: 'Default is 5' }
      }
    }
  },
  {
    name: 'get_device_details',
    description: 'Retrieve detailed asset intelligence including Hostname and Containment Status.',
    parameters: {
      type: Type.OBJECT,
      properties: { identifier: { type: Type.STRING, description: 'Hostname or AID' } },
      required: ['identifier']
    }
  },
  {
    name: 'contain_host',
    description: 'Execute kernel-level network isolation for high-confidence compromises.',
    parameters: {
      type: Type.OBJECT,
      properties: { device_id: { type: Type.STRING, description: 'Target Host AID' } },
      required: ['device_id']
    }
  },
  {
    name: 'lift_containment',
    description: 'Restore network access to an isolated host after verification of clearance.',
    parameters: {
      type: Type.OBJECT,
      properties: { device_id: { type: Type.STRING, description: 'Target Host AID' } },
      required: ['device_id']
    }
  },
  {
    name: 'get_detections',
    description: 'Retrieve behavioral detection summaries and command lines for process tree reconstruction.',
    parameters: {
      type: Type.OBJECT,
      properties: { host_id: { type: Type.STRING }, limit: { type: Type.INTEGER } }
    }
  }
];