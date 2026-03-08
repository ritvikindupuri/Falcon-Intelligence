
import { AppConfig, SecurityStats } from '../types';

export class CrowdStrikeService {
  private config: AppConfig;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AppConfig) {
    this.config = config;
  }

  private getRequestUrl(endpoint: string): string {
    const fullUrl = `${this.config.baseUrl}${endpoint}`;
    if (this.config.proxyUrl) {
      // Logic for common proxies like local-cors-proxy or cloudflare workers
      return `${this.config.proxyUrl.replace(/\/$/, '')}/${fullUrl.replace(/^https?:\/\//, '')}`;
    }
    return fullUrl;
  }

  async testConnection(): Promise<boolean> {
    await this.getAccessToken();
    return true;
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

    const url = this.getRequestUrl('/oauth2/token');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      });

      if (!response.ok) {
        throw new Error(`Auth Failed (${response.status})`);
      }

      const data = await response.json();
      this.token = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
      return this.token!;
    } catch (e: any) {
      if (!this.config.proxyUrl) {
        throw new Error("Direct API access blocked by CORS. Please configure a Proxy URL in Settings.");
      }
      throw e;
    }
  }

  private async fetchAPI(endpoint: string, method: string = 'GET', body?: any) {
    const token = await this.getAccessToken();
    const url = this.getRequestUrl(endpoint);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      if (response.status === 403) throw new Error(`Access Denied: Check API Scopes for ${endpoint}`);
      throw new Error(`API Error ${response.status}`);
    }

    return response.json();
  }

  async get_statistics(): Promise<SecurityStats> {
    if (!this.config.clientId) return { criticalCount: 0, openIncidents: 0, containedHosts: 0, lastUpdated: new Date() };
    try {
      const critRes = await this.fetchAPI('/incidents/queries/incidents/v1?filter=severity_code:>=80&limit=1');
      const totalRes = await this.fetchAPI('/incidents/queries/incidents/v1?filter=status:[20,30]&limit=1');
      return {
        criticalCount: critRes.meta?.pagination?.total || 0,
        openIncidents: totalRes.meta?.pagination?.total || 0,
        containedHosts: 0,
        lastUpdated: new Date()
      };
    } catch (e) {
      return { criticalCount: 0, openIncidents: 0, containedHosts: 0, lastUpdated: new Date() };
    }
  }

  async list_incidents(args: any) {
    const queryUrl = `/incidents/queries/incidents/v1?limit=${args.limit || 5}&sort=created_timestamp.desc`;
    const queryRes = await this.fetchAPI(queryUrl);
    if (!queryRes.resources?.length) return [];
    const detailsRes = await this.fetchAPI(`/incidents/entities/incidents/GET/v1`, 'POST', { ids: queryRes.resources });
    return detailsRes.resources || [];
  }

  async get_device_details(args: { identifier: string }) {
    const detailsRes = await this.fetchAPI(`/devices/entities/devices/v2`, 'POST', { ids: [args.identifier] });
    return detailsRes.resources?.[0] || { error: "Host not found" };
  }

  async contain_host(args: { device_id: string }) {
    return await this.fetchAPI(`/devices/entities/devices-actions/v2?action_name=contain`, 'POST', { ids: [args.device_id] });
  }

  async lift_containment(args: { device_id: string }) {
    return await this.fetchAPI(`/devices/entities/devices-actions/v2?action_name=lift_containment`, 'POST', { ids: [args.device_id] });
  }

  async get_detections(args: { host_id?: string; limit?: number }) {
    let filter = args.host_id ? `&filter=device.device_id:'${args.host_id}'` : "";
    const queryRes = await this.fetchAPI(`/detects/queries/detects/v1?limit=${args.limit || 5}${filter}`);
    if (!queryRes.resources?.length) return [];
    const detailsRes = await this.fetchAPI(`/detects/entities/summaries/GET/v1`, 'POST', { ids: queryRes.resources });
    return detailsRes.resources || [];
  }
}
