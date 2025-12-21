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
      
      const tester = new CrowdStrikeService(formData);
      try {
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
      <div className="bg-cs-bg border border-cs-border w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-cs-border bg-black flex items-center justify-between">
            <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-cs-red block"></span>
                    API Configuration
                </h2>
            </div>
            <div className="text-[10px] font-mono text-cs-dim border border-cs-border px-2 py-1 bg-cs-surface rounded">SECURE_GATEWAY_V1</div>
        </div>
        
        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1 bg-cs-bg">
            
              <div className="space-y-6">
                 
                 {/* Scopes Instruction */}
                 <div className="bg-cs-surface border border-cs-border p-5 rounded-sm">
                    <h3 className="text-xs font-bold text-cs-dim mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-cs-border pb-2">
                        REQUIRED PERMISSIONS (API SCOPES)
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {['Alerts: Read', 'Detections: Read', 'Hosts: Read', 'Hosts: Write'].map((scope) => (
                             <div key={scope} className="flex items-center justify-between text-xs text-white bg-black p-3 border border-cs-border">
                                <span className="font-mono">{scope.split(':')[0]}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${scope.includes('Write') ? 'text-white bg-cs-red' : 'text-black bg-white'}`}>
                                    {scope.split(':')[1].trim().toUpperCase()}
                                </span>
                             </div>
                        ))}
                    </div>
                 </div>

                 {/* Inputs */}
                 <div className="grid gap-6">
                    <div className="group">
                        <label className="block text-xs font-bold text-cs-dim uppercase tracking-widest mb-2 group-focus-within:text-white transition-colors">Client ID</label>
                        <input 
                        type="text" 
                        value={formData.clientId}
                        onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                        className="w-full bg-black border border-cs-border text-white px-4 py-3.5 focus:outline-none focus:border-cs-red focus:ring-1 focus:ring-cs-red transition-all font-mono text-sm rounded-sm"
                        placeholder="Enter Client ID"
                        />
                    </div>
                    <div className="group">
                        <label className="block text-xs font-bold text-cs-dim uppercase tracking-widest mb-2 group-focus-within:text-white transition-colors">Client Secret</label>
                        <input 
                        type="password" 
                        value={formData.clientSecret}
                        onChange={(e) => setFormData({...formData, clientSecret: e.target.value})}
                        className="w-full bg-black border border-cs-border text-white px-4 py-3.5 focus:outline-none focus:border-cs-red focus:ring-1 focus:ring-cs-red transition-all font-mono text-sm rounded-sm"
                        placeholder="Enter Client Secret"
                        />
                    </div>
                    <div className="group">
                        <label className="block text-xs font-bold text-cs-dim uppercase tracking-widest mb-2 group-focus-within:text-white transition-colors">Cloud Environment</label>
                        <div className="relative">
                            <select
                                value={formData.baseUrl}
                                onChange={(e) => setFormData({...formData, baseUrl: e.target.value})}
                                className="w-full appearance-none bg-black border border-cs-border text-white px-4 py-3.5 focus:outline-none focus:border-cs-red focus:ring-1 focus:ring-cs-red transition-all text-sm font-mono rounded-sm"
                            >
                                <option value="https://api.crowdstrike.com">US-1 (Standard)</option>
                                <option value="https://api.us-2.crowdstrike.com">US-2 (Business)</option>
                                <option value="https://api.eu-1.crowdstrike.com">EU-1 (Europe)</option>
                                <option value="https://api.laggar.gcw.crowdstrike.com">US-GOV-1 (Federal)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-3 h-3 text-cs-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                 </div>

                 {error && (
                     <div className="bg-red-950/20 border-l-4 border-cs-red p-4 flex items-start gap-3">
                         <div className="text-xs text-red-200 font-mono leading-relaxed">{error}</div>
                     </div>
                 )}
              </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-cs-border bg-black flex justify-end gap-4">
            <button onClick={onClose} className="px-6 py-3 text-cs-dim hover:text-white text-xs font-bold uppercase tracking-wider transition-colors">Cancel</button>
            <button 
            onClick={handleSave}
            disabled={isValidating}
            className="px-8 py-3 bg-cs-red hover:bg-cs-redHover disabled:bg-cs-border disabled:text-cs-dim text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
            >
            {isValidating ? 'AUTHENTICATING...' : 'CONNECT'}
            </button>
        </div>
      </div>
    </div>
  );
};