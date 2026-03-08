
import { MCPServer, MCPTool, MCPResponse, AppConfig } from '../types';
import { CrowdStrikeService } from './crowdstrikeService';

/**
 * CrowdStrikeMCPServer
 * Implements the Model Context Protocol (MCP) interface for CrowdStrike Falcon operations.
 */
export class CrowdStrikeMCPServer implements MCPServer {
  private csService: CrowdStrikeService;
  public readonly name = "crowdstrike-falcon-mcp";

  constructor(config: AppConfig) {
    this.csService = new CrowdStrikeService(config);
  }

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'get_statistics',
        description: 'Fetch global fleet-wide metrics (Critical count, Open incidents, Contained hosts) for the dashboard.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'list_incidents',
        description: 'Query security incidents from CrowdStrike Falcon with optional severity filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'], description: 'Minimum severity code to return.' },
            limit: { type: 'integer', description: 'Maximum number of incidents (default 5).' }
          }
        }
      },
      {
        name: 'get_device_details',
        description: 'Get deep metadata (OS, IP, status) for a specific asset by AID or Hostname.',
        inputSchema: {
          type: 'object',
          properties: { identifier: { type: 'string', description: 'Hostname or Agent ID (AID)' } },
          required: ['identifier']
        }
      },
      {
        name: 'contain_host',
        description: 'Isolate a host from the network at the kernel level. Use only for verified high-threat scenarios.',
        inputSchema: {
          type: 'object',
          properties: { device_id: { type: 'string', description: 'The Host Agent ID (AID)' } },
          required: ['device_id']
        }
      },
      {
        name: 'lift_containment',
        description: 'Restore network access to an isolated host after forensic clearance.',
        inputSchema: {
          type: 'object',
          properties: { device_id: { type: 'string', description: 'The Host Agent ID (AID)' } },
          required: ['device_id']
        }
      },
      {
        name: 'get_detections',
        description: 'Retrieve behavioral detection details, including process command lines and MITRE TTPs.',
        inputSchema: {
          type: 'object',
          properties: { 
            host_id: { type: 'string', description: 'Filter detections by Host AID' },
            limit: { type: 'integer', description: 'Default is 5' }
          }
        }
      }
    ];
  }

  async callTool(name: string, args: any): Promise<MCPResponse> {
    try {
      let result;
      switch (name) {
        case 'get_statistics':
          result = await this.csService.get_statistics();
          break;
        case 'list_incidents':
          result = await this.csService.list_incidents(args);
          break;
        case 'get_device_details':
          result = await this.csService.get_device_details(args);
          break;
        case 'contain_host':
          result = await this.csService.contain_host(args);
          break;
        case 'lift_containment':
          result = await this.csService.lift_containment(args);
          break;
        case 'get_detections':
          result = await this.csService.get_detections(args);
          break;
        default:
          throw new Error(`Tool '${name}' not found on server '${this.name}'`);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: error.message || 'Unknown tool execution error' }],
        isError: true
      };
    }
  }

  // Exposure for App.tsx to use the service directly for background polling
  public getService() {
    return this.csService;
  }
}
