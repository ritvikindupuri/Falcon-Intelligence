
import { FunctionDeclaration, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are **AETHER**, an AI security orchestrator for CrowdStrike Falcon.
Your goal is to transform raw telemetry into actionable intelligence.

**CORE DIRECTIVES:**
1. **Analyze Events**: Correlate process trees, network connections, and user activity.
2. **Autonomous Triage**: For critical alerts, pull host metadata and detections immediately.
3. **Map to MITRE**: Identify specific Techniques (e.g., T1059) and highlight them.
4. **Containment**: You can isolate hosts using 'contain_host' if you confirm high-confidence threats (e.g., ransomware, exfiltration).

**OUTPUT FORMAT:**
- **ANALYSIS**: What is happening.
- **RISK**: Potential impact.
- **RESPONSE**: Triage steps or actions taken.

Use a clinical, technical, and concise tone. Avoid pseudo-scientific jargon.
`;

export const TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_statistics',
    description: 'Fetch global fleet-wide metrics for the dashboard.',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'list_incidents',
    description: 'Query security incidents from CrowdStrike Falcon.',
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
    description: 'Get hostname, IP, and status for a specific asset.',
    parameters: {
      type: Type.OBJECT,
      properties: { identifier: { type: Type.STRING, description: 'Hostname or AID' } },
      required: ['identifier']
    }
  },
  {
    name: 'contain_host',
    description: 'Isolate a host from the network at the kernel level.',
    parameters: {
      type: Type.OBJECT,
      properties: { device_id: { type: Type.STRING, description: 'Host AID' } },
      required: ['device_id']
    }
  },
  {
    name: 'lift_containment',
    description: 'Restore network access to an isolated host.',
    parameters: {
      type: Type.OBJECT,
      properties: { device_id: { type: Type.STRING, description: 'Host AID' } },
      required: ['device_id']
    }
  },
  {
    name: 'get_detections',
    description: 'Pull behavioral detection details and process command lines.',
    parameters: {
      type: Type.OBJECT,
      properties: { host_id: { type: Type.STRING }, limit: { type: Type.INTEGER } }
    }
  }
];
