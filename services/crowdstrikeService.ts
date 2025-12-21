import { AppConfig, Incident, Device, Detection, SecurityStats } from '../types';

export class CrowdStrikeService {
  private config: AppConfig;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AppConfig) {
    this.config = config;
  }

  // --- Auth Helper ---

  async testConnection(): Promise<boolean> {
      try {
          await this.getAccessToken();
          return true;
      } catch (e) {
          throw e;
      }
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error("Missing Credentials");
    }

    const body = new URLSearchParams();
    body.append('client_id', this.config.clientId);
    body.append('client_secret', this.config.clientSecret);

    try {
      const response = await fetch(`${this.config.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Auth Failed (${response.status}). Check credentials.`);
      }

      const data = await response.json();
      this.token = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
      return this.token!;
    } catch (e: any) {
      if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))) {
        throw new Error(`Connection Failed: Unable to reach ${this.config.baseUrl}. WARNING: This is likely a Cross-Origin (CORS) restriction by your browser. This app works best in a non-browser environment or with a CORS proxy.`);
      }
      throw e;
    }
  }

  private async fetchAPI(endpoint: string, method: string = 'GET', body?: any) {
    const token = await this.getAccessToken();
    
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        // Handle 404/410 specifically for decommissioned endpoints
        if (response.status === 404 || response.status === 410) {
            throw new Error(`Endpoint Decommissioned or Not Found (${response.status})`);
        }
        if (response.status === 403) {
            throw new Error(`Access Denied (403). Missing Scope for ${endpoint}`);
        }
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
      }

      return response.json();
    } catch (e: any) {
      throw e;
    }
  }

  // --- Helpers ---

  private async resolveDeviceNames(deviceIds: string[]): Promise<Record<string, string>> {
      if (!deviceIds || deviceIds.length === 0) return {};
      try {
          const uniqueIds = Array.from(new Set(deviceIds));
          const response = await this.fetchAPI(`/devices/entities/devices/v2`, 'POST', { ids: uniqueIds });
          
          const lookup: Record<string, string> = {};
          if (response.resources) {
              response.resources.forEach((d: any) => {
                  lookup[d.device_id] = d.hostname || d.device_id;
              });
          }
          return lookup;
      } catch (e) {
          console.warn("Device name resolution failed:", e);
          return {}; 
      }
  }

  // --- Tool Implementations ---

  async get_statistics(): Promise<SecurityStats> {
      // Gracefully return empty stats if credentials are not configured yet
      if (!this.config.clientId || !this.config.clientSecret) {
          return { criticalCount: 0, openIncidents: 0, containedHosts: 0, lastUpdated: new Date() };
      }

      try {
          // Get Critical Count
          const critRes = await this.fetchAPI('/incidents/queries/incidents/v1?filter=severity_code:>=80&limit=1');
          const criticalCount = critRes.meta?.pagination?.total || 0;

          // Get Total Open
          const totalRes = await this.fetchAPI('/incidents/queries/incidents/v1?filter=status:[20,30]&limit=1');
          const openIncidents = totalRes.meta?.pagination?.total || 0;

          // Get Contained Hosts (Approximate via filter if possible, otherwise 0 for now as it requires complex query)
          let containedHosts = 0;
          try {
             const containRes = await this.fetchAPI("/devices/queries/devices/v1?filter=status:'contained'&limit=1");
             containedHosts = containRes.meta?.pagination?.total || 0;
          } catch(e) { /* ignore */ }

          return {
              criticalCount,
              openIncidents,
              containedHosts,
              lastUpdated: new Date()
          };
      } catch (e) {
          console.error("Stats failed", e);
          // Return zeroed stats rather than crashing the dash
          return { criticalCount: 0, openIncidents: 0, containedHosts: 0, lastUpdated: new Date() };
      }
  }

  async list_incidents(args: { severity?: string; limit?: number }) {
    const getSeverityCode = (sev?: string) => sev === 'Critical' ? 80 : sev === 'High' ? 60 : sev === 'Medium' ? 40 : 20;

    try {
      let filter = "";
      if (args.severity) {
         filter = `&filter=severity_code:>=${getSeverityCode(args.severity)}`;
      }
      
      const queryUrl = `/incidents/queries/incidents/v1?limit=${args.limit || 5}&sort=created_timestamp.desc${filter}`;
      const queryRes = await this.fetchAPI(queryUrl);
      const ids = queryRes.resources;

      if (!ids || ids.length === 0) return [];

      const detailsRes = await this.fetchAPI(`/incidents/entities/incidents/GET/v1`, 'POST', { ids });
      const rawIncidents = detailsRes.resources || [];

      // Collect Host IDs safely
      const hostIds: string[] = [];
      rawIncidents.forEach((inc: any) => {
          if (inc.hosts && Array.isArray(inc.hosts)) {
             inc.hosts.forEach((h: any) => {
                 if (h.device_id) hostIds.push(h.device_id);
             });
          }
      });

      // Attempt Resolution
      const hostLookup = await this.resolveDeviceNames(hostIds);

      // Map Results with Fallback
      const mappedIncidents = rawIncidents.map((inc: any) => {
         const hostId = inc.hosts?.[0]?.device_id || 'Unknown';
         // Fallback Logic: Lookup Name -> Host ID -> "Unknown Host"
         const finalHostName = hostLookup[hostId] || (hostId !== 'Unknown' ? hostId : 'Unknown Host');

         return {
            incident_id: inc.incident_id,
            title: inc.name || `Incident ${inc.incident_id}`,
            description: inc.description || "No description provided",
            severity: inc.severity_code >= 80 ? 'Critical' : inc.severity_code >= 60 ? 'High' : inc.severity_code >= 40 ? 'Medium' : 'Low',
            status: inc.status === 20 ? 'New' : inc.status === 30 ? 'In Progress' : 'Closed',
            created_timestamp: inc.created_timestamp,
            host_id: hostId,
            host_name: finalHostName
         };
      });

      // Sort by Hostname to group related incidents in the output
      return mappedIncidents.sort((a: any, b: any) => 
        (a.host_name || "").localeCompare(b.host_name || "")
      );

    } catch (e: any) {
        if (e.message.includes("403")) {
            return { error: `Permission Denied. Missing 'Incidents: READ' scope.` };
        }
        return { error: `Failed to list incidents: ${e.message}` };
    }
  }

  async get_device_details(args: { identifier: string }) {
    try {
      let id = args.identifier;
      if (!id.startsWith('aid-') && !id.match(/^[0-9a-f]{32}$/i)) {
         const searchRes = await this.fetchAPI(`/devices/queries/devices/v1?filter=hostname:'${args.identifier}'`);
         if (searchRes.resources && searchRes.resources.length > 0) {
            id = searchRes.resources[0];
         } else {
            return { error: `Device with hostname '${args.identifier}' not found.` };
         }
      }

      const detailsRes = await this.fetchAPI(`/devices/entities/devices/v2`, 'POST', { ids: [id] });
      if (!detailsRes.resources || detailsRes.resources.length === 0) {
          return { error: `Device details not found for ID: ${id}` };
      }

      const d = detailsRes.resources[0];
      return {
          device_id: d.device_id,
          hostname: d.hostname,
          platform_name: d.platform_name,
          os_version: d.os_version,
          status: d.status,
          last_seen: d.last_seen,
          external_ip: d.external_ip
      };
    } catch (e: any) {
        return { error: e.message };
    }
  }

  async contain_host(args: { device_id: string }) {
    try {
        const res = await this.fetchAPI(`/devices/entities/devices-actions/v2?action_name=contain`, 'POST', { ids: [args.device_id] });
        // CrowdStrike API returns "errors" array even on 200 OK sometimes if action fails for specific host
        if (res.errors && res.errors.length > 0) {
            return { error: res.errors[0].message };
        }
        // Also check resources for errors
        if (res.resources && res.resources[0] && !res.resources[0].success) {
             // Try to extract error message from resource
             return { error: "Action failed for host. Check permissions or host status." };
        }
        return { success: true, message: `Command sent. Host ${args.device_id} is being contained.` };
    } catch (e: any) {
        return { error: e.message };
    }
  }

  async lift_containment(args: { device_id: string }) {
    try {
        const res = await this.fetchAPI(`/devices/entities/devices-actions/v2?action_name=lift_containment`, 'POST', { ids: [args.device_id] });
        if (res.errors && res.errors.length > 0) {
            return { error: res.errors[0].message };
        }
        return { success: true, message: `Command sent. Containment is being lifted for host ${args.device_id}.` };
    } catch (e: any) {
        return { error: e.message };
    }
  }

  async get_detections(args: { host_id?: string; limit?: number }) {
    try {
        let filter = "";
        if (args.host_id) {
            filter = `&filter=device.device_id:'${args.host_id}'`;
        }
        
        const queryRes = await this.fetchAPI(`/detects/queries/detects/v1?limit=${args.limit || 5}&sort=created_timestamp.desc${filter}`);
        const ids = queryRes.resources;

        if (!ids || ids.length === 0) return [];

        const detailsRes = await this.fetchAPI(`/detects/entities/summaries/GET/v1`, 'POST', { ids });
        
        return detailsRes.resources.map((d: any) => ({
            detection_id: d.detection_id,
            tactic: d.tactic || 'Unknown',
            technique: d.technique || 'Unknown',
            severity: d.max_severity >= 80 ? 'Critical' : d.max_severity >= 60 ? 'High' : 'Medium',
            timestamp: d.created_timestamp,
            cmd_line: d.behaviors?.[0]?.cmdline || 'N/A'
        }));
    } catch (e: any) {
        if (e.message.toLowerCase().includes('decommissioned') || e.message.includes('410') || e.message.includes('404')) {
             return { error: "Detections endpoint unavailable. Check 'Detections: Read' and 'Alerts: Read' scopes." };
        }
        if (e.message.includes("403")) {
            return { error: "Permission Denied. Missing 'Detections: READ' scope." };
        }
        return { error: e.message };
    }
  }
}