import { FunctionDeclaration, Schema, Type } from "@google/genai";

// --- Chat Types ---

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  toolCalls?: ToolCallDetails[];
  isAlert?: boolean; // New: visual distinction for automated alerts
}

export interface ToolCallDetails {
  functionName: string;
  args: Record<string, any>;
  result?: any;
  status?: 'pending' | 'success' | 'error';
}

// --- CrowdStrike Domain Types ---

export interface Incident {
  incident_id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'New' | 'In Progress' | 'Closed';
  created_timestamp: string;
  host_id: string;
  host_name: string;
}

export interface Device {
  device_id: string;
  hostname: string;
  platform_name: string;
  os_version: string;
  status: 'normal' | 'contained' | 'compromised';
  last_seen: string;
  external_ip: string;
}

export interface Detection {
  detection_id: string;
  tactic: string;
  technique: string;
  severity: string;
  timestamp: string;
  cmd_line: string;
}

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
}