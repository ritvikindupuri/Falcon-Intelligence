
import { FunctionDeclaration, Schema, Type } from "@google/genai";

// --- MCP Types ---

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
}

export interface MCPResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface MCPServer {
  name: string;
  listTools(): Promise<MCPTool[]>;
  callTool(name: string, args: any): Promise<MCPResponse>;
}

// --- Chat Types ---

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  toolCalls?: ToolCallDetails[];
  isAlert?: boolean; 
}

export interface ToolCallDetails {
  id?: string; // Original Gemini call ID
  functionName: string;
  args: Record<string, any>;
  result?: any;
  status?: 'pending' | 'success' | 'error' | 'awaiting_approval' | 'denied';
  serverName?: string;
}

// --- CrowdStrike Domain Types ---

export interface SecurityStats {
  openIncidents: number;
  criticalCount: number;
  containedHosts: number;
  lastUpdated: Date;
}

// --- Config Types ---

export interface AppConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  proxyUrl?: string;
}
