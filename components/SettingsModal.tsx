
import React, { useState } from 'react';
import { AppConfig } from '../types';
import { CrowdStrikeService } from '../services/crowdstrikeService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [formData, setFormData] = useState<AppConfig>(config);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
      setError(null);
      setIsValidating(true);
      try {
          const tester = new CrowdStrikeService(formData);
          await tester.testConnection();
          onSave(formData);
          onClose();
      } catch (e: any) {
          setError(e.message);
      } finally {
          setIsValidating(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-cs-bg border border-cs-border w-full max-w-2xl shadow-2xl flex flex-col">
        <div className="p-6 border-b border-cs-border bg-black flex items-center justify-between">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">MCP CONFIGURATION</h2>
        </div>
        
        <div className="p-8 space-y-6 bg-cs-bg">
            <div className="grid gap-6">
                <div>
                    <label className="block text-[10px] font-black text-cs-dim uppercase mb-2">CORS Proxy URL (Optional)</label>
                    <input type="text" value={formData.proxyUrl || ''} onChange={(e) => setFormData({...formData, proxyUrl: e.target.value})} className="w-full bg-black border border-cs-border text-white px-4 py-3 font-mono text-xs rounded" placeholder="https://your-cors-proxy.workers.dev" />
                    <p className="text-[8px] text-zinc-600 mt-2">Route API calls through a proxy to avoid CORS blocks in the browser.</p>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-cs-dim uppercase mb-2">Client ID</label>
                    <input type="text" value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})} className="w-full bg-black border border-cs-border text-white px-4 py-3 font-mono text-xs rounded" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-cs-dim uppercase mb-2">Client Secret</label>
                    <input type="password" value={formData.clientSecret} onChange={(e) => setFormData({...formData, clientSecret: e.target.value})} className="w-full bg-black border border-cs-border text-white px-4 py-3 font-mono text-xs rounded" />
                </div>
                
                <div className="p-4 bg-zinc-900/50 border border-white/5 rounded">
                    <h3 className="text-[10px] font-black text-cs-red uppercase mb-3 tracking-widest">Required API Scopes</h3>
                    <div className="grid grid-cols-2 gap-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-cs-red rounded-full"></span>
                            <span className="text-[9px] font-bold text-zinc-400">Alerts: <span className="text-white">Read</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-cs-red rounded-full"></span>
                            <span className="text-[9px] font-bold text-zinc-400">Detections: <span className="text-white">Read</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-cs-red rounded-full"></span>
                            <span className="text-[9px] font-bold text-zinc-400">Incidents: <span className="text-white">Read</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-cs-red rounded-full"></span>
                            <span className="text-[9px] font-bold text-zinc-400">Hosts: <span className="text-white">Read/Write</span></span>
                        </div>
                    </div>
                    <p className="text-[8px] text-zinc-600 mt-3 italic">* Write scope for Hosts is required for network containment features.</p>
                </div>
            </div>
            {error && <div className="text-xs text-cs-red font-mono bg-cs-red/10 p-4 border border-cs-red/20">{error}</div>}
        </div>

        <div className="p-6 border-t border-cs-border flex justify-end gap-4">
            <button onClick={onClose} className="px-6 py-3 text-xs font-bold uppercase">Cancel</button>
            <button onClick={handleSave} disabled={isValidating} className="px-8 py-3 bg-cs-red text-white text-xs font-bold uppercase tracking-widest">
                {isValidating ? 'CONNECTING...' : 'SAVE & CONNECT'}
            </button>
        </div>
      </div>
    </div>
  );
};
