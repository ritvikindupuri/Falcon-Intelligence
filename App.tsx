import React, { useState, useRef, useEffect } from 'react';
import { AgentController } from './services/agent';
import { Message, AppConfig, SecurityStats, Incident, Device } from './types';
import { ChatMessage } from './components/ChatMessage';
import { SettingsModal } from './components/SettingsModal';

const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: 'model',
  content: `### AETHER COGNITIVE CORE ONLINE
Neural synchronization complete. Investigative heuristics loaded.

Standing by for telemetry ingestion or tactical command input.`,
  timestamp: new Date()
};

const PLAYBOOKS = [
  { id: 'PB-ROOT', name: 'PROCESS_RECONSTRUCTION', cmd: 'Execute Root Cause Analysis: Analyze the process tree and behavioral detections for the most recent critical incident.', desc: 'Rebuild attack lineage from kernel events.' },
  { id: 'PB-LAT', name: 'LATERAL_CORRELATION', cmd: 'Perform a Lateral Movement Sweep: Correlate active incidents to find shared user accounts and network hop-points.', desc: 'Identify movement across subnet boundaries.' },
  { id: 'PB-EXFIL', name: 'VECTOR_AUDIT', cmd: 'Data Exfiltration Audit: Scan for outbound network spikes and unauthorized cloud storage connections.', desc: 'Detect evidence of data staging or exfiltration.' },
  { id: 'PB-IDEN', name: 'IDENTITY_SURVEILLANCE', cmd: 'Verify Identity Integrity: Flag MFA bypasses, abnormal login hours, and local admin modifications.', desc: 'Audit for compromised credentials.' },
  { id: 'PB-LIFT', name: 'LIFT_RESTRICTION', cmd: 'Lift Network Containment: Restore network access for a previously isolated host after forensic clearance.', desc: 'Reconnect verified assets.' },
  { id: 'PB-RANS', name: 'RANSOMWARE_TRIAGE', cmd: 'Ransomware Audit: Check for Shadow Copy deletion and mass encryption/archiving signatures.', desc: 'Detect early-stage ransomware activity.' },
  { id: 'PB-SCRIPT', name: 'HEURISTIC_SWEEP', cmd: 'Script Analysis: Audit all PowerShell, WMI, and BITS execution logs for suspicious obfuscation.', desc: 'Hunt for fileless attack techniques.' },
  { id: 'PB-ZERO', name: 'TRUST_AUDIT', cmd: 'Conditional Access Review: Verify failed MFA attempts and abnormal login geography for high-value targets.', desc: 'Audit trust boundary failures.' },
];

export const CommandLogo = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 4L34 11V29L20 36L6 29V11L20 4Z" stroke="#ff2d2d" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M20 12L28 16V24L20 28L12 24V16L20 12Z" fill="#ff2d2d" fillOpacity="0.15" stroke="#ff2d2d" strokeWidth="1"/>
    <circle cx="20" cy="20" r="2.5" fill="#ff2d2d">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
    </circle>
    <path d="M20 4V12M34 11L28 16M34 29L28 24M20 36V28M6 29L12 24M6 11L12 16" stroke="#ff2d2d" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
  </svg>
);

export default function App() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [stats, setStats] = useState<SecurityStats>({ openIncidents: 0, criticalCount: 0, containedHosts: 0, lastUpdated: new Date() });
  const [riskScore, setRiskScore] = useState(0);

  const [config, setConfig] = useState<AppConfig>({
    clientId: '',
    clientSecret: '',
    baseUrl: 'https://api.us-2.crowdstrike.com',
  });

  const agentRef = useRef<AgentController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastCheckedIncidentRef = useRef<string | null>(null);

  useEffect(() => {
    if (process.env.API_KEY) {
      agentRef.current = new AgentController(process.env.API_KEY, config);
    }
  }, [config]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
      let interval: ReturnType<typeof setInterval> | undefined;
      if (monitoringEnabled && agentRef.current) {
          updateStats();
          interval = setInterval(() => {
              updateStats();
              checkForNewCriticals();
          }, 15000); 
      }
      return () => { if (interval) clearInterval(interval); };
  }, [monitoringEnabled, config]); 

  const updateStats = async () => {
      if (!agentRef.current) return;
      try {
          const s = await agentRef.current.csService.get_statistics();
          setStats(s);
          const calculatedRisk = Math.min(100, (s.criticalCount * 20) + (s.openIncidents * 4));
          setRiskScore(calculatedRisk);
      } catch (e) { console.error(e); }
  };

  const checkForNewCriticals = async () => {
      if (!agentRef.current) return;
      try {
          const incidents = await agentRef.current.csService.list_incidents({ severity: 'Critical', limit: 1 });
          if (Array.isArray(incidents) && incidents.length > 0) {
              const latest = incidents[0];
              if (lastCheckedIncidentRef.current !== latest.incident_id && latest.status !== 'Closed') {
                  lastCheckedIncidentRef.current = latest.incident_id;
                  processUserMessage(`NEURAL ALERT: High-severity incident detected (${latest.incident_id}) on ${latest.host_name}. Initiating autonomous investigation.`, true);
              }
          }
      } catch (e) { }
  };

  const processUserMessage = async (msgText: string, isAutomated: boolean = false) => {
      if (!msgText.trim() || isProcessing || !agentRef.current) return;
      
      const userMsg: Message = { 
        id: crypto.randomUUID(), 
        role: isAutomated ? 'system' : 'user', 
        content: msgText, 
        timestamp: new Date(),
        isAlert: isAutomated
      };
      
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsProcessing(true);
      
      try {
        await agentRef.current.processMessage(msgText, (updatedMsg) => {
          setMessages(prev => {
              const exists = prev.find(m => m.id === updatedMsg.id);
              if (exists) return prev.map(m => m.id === updatedMsg.id ? updatedMsg : m);
              return [...prev, updatedMsg];
          });
        });
        updateStats();
      } catch (err) { console.error(err); } finally { setIsProcessing(false); }
  }

  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      processUserMessage(input);
  };

  const handleLiftContainment = (deviceId: string) => {
    processUserMessage(`AUTHORIZE: Lift restrictions for asset ID: ${deviceId}`);
  }

  return (
    <div className="flex h-screen bg-cs-bg text-zinc-100 overflow-hidden font-sans relative selection:bg-cs-red selection:text-white">
      
      <div className="absolute inset-0 pointer-events-none bg-grid opacity-10 z-0"></div>

      {/* --- SIDEBAR --- */}
      <aside className="hidden xl:flex flex-col w-[24rem] border-r border-cs-border glass z-30 shadow-2xl relative overflow-hidden">
        
        <div className="p-6 border-b border-cs-border bg-black/40 relative">
           <div className="flex flex-col gap-4">
             <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-zinc-950 flex items-center justify-center border border-cs-border rounded-lg shadow-[0_0_20px_rgba(255,45,45,0.15)] overflow-hidden">
                    <CommandLogo size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-display font-black tracking-tighter leading-none text-white uppercase italic">AETHER</h1>
                    <p className="text-[9px] text-cs-red font-black tracking-[0.4em] uppercase mt-1 pl-2 border-l-2 border-cs-red">Cognitive Response</p>
                </div>
             </div>

             <div className="bg-zinc-900/80 p-3 border border-white/10 rounded">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Neural Load Index</span>
                    <span className={`text-base font-mono font-black ${riskScore > 60 ? 'text-cs-red animate-pulse' : 'text-emerald-400'}`}>{riskScore.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/5">
                    <div 
                        className={`h-full transition-all duration-1000 ease-out ${riskScore > 70 ? 'bg-cs-red shadow-[0_0_15px_#ff2d2d]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`}
                        style={{ width: `${riskScore}%` }}
                    ></div>
                </div>
             </div>
           </div>
        </div>

        <div className="px-6 py-4 grid grid-cols-3 gap-3">
            {[
              { label: 'CRITICAL', val: stats.criticalCount, color: 'text-cs-red' },
              { label: 'ACTIVE', val: stats.openIncidents, color: 'text-white' },
              { label: 'RESTRICTED', val: stats.containedHosts, color: 'text-emerald-400' }
            ].map(m => (
              <div key={m.label} className="bg-zinc-800/40 p-3 border border-white/5 rounded-sm backdrop-blur-md">
                  <div className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1">{m.label}</div>
                  <div className={`text-xl font-display font-black ${m.color}`}>{m.val}</div>
              </div>
            ))}
        </div>

        <div className="flex-1 flex flex-col min-h-0 pt-2">
          <div className="px-6 flex justify-between items-center mb-3">
            <h3 className="text-[9px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
               <span className="w-2 h-4 bg-cs-red rounded-sm"></span> TACTICAL HEURISTICS
            </h3>
          </div>
          
          <div className="flex-1 px-6 pb-4 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 gap-2.5">
                {PLAYBOOKS.map((pb) => (
                    <button 
                      key={pb.id} 
                      onClick={() => processUserMessage(pb.cmd, true)}
                      disabled={isProcessing}
                      className={`text-left p-4 bg-zinc-900 border transition-all duration-300 rounded hover:bg-zinc-800 group ${
                        isProcessing ? 'opacity-40 cursor-not-allowed' : 'border-white/5 hover:border-cs-red/40'
                      }`}
                    >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-mono font-black text-white group-hover:text-cs-red transition-colors">{pb.name}</span>
                        </div>
                        <p className="text-[8px] text-zinc-500 font-medium leading-relaxed group-hover:text-zinc-300 transition-colors">{pb.desc}</p>
                    </button>
                ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-cs-border space-y-3 bg-black/40">
            <button 
                onClick={() => setMonitoringEnabled(!monitoringEnabled)}
                className={`w-full py-4 flex flex-col items-center justify-center gap-1 text-[9px] font-black tracking-widest uppercase transition-all duration-500 border rounded ${
                    monitoringEnabled ? 'bg-cs-red border-cs-red text-white shadow-[0_0_15px_rgba(255,45,45,0.2)]' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${monitoringEnabled ? 'bg-white animate-pulse' : 'bg-current'}`}></div>
                    {monitoringEnabled ? 'NEURAL MONITORING: ACTIVE' : 'ENGAGE NEURAL CORE'}
                </div>
            </button>
            <div className="flex gap-2">
                <button onClick={() => setIsSettingsOpen(true)} className="flex-1 text-center text-[9px] font-black text-zinc-400 hover:text-white border border-zinc-700 py-3 transition-all uppercase tracking-widest rounded bg-zinc-900/50">Core Config</button>
                <button onClick={() => window.location.reload()} className="flex-1 text-center text-[9px] font-black text-zinc-400 hover:text-cs-red border border-zinc-700 py-3 transition-all uppercase tracking-widest rounded bg-zinc-900/50">Resync</button>
            </div>
        </div>
      </aside>

      {/* --- MAIN STREAM --- */}
      <main className="flex-1 flex flex-col relative h-screen bg-[#050507]">
        
        <header className="px-8 py-4 border-b border-cs-border flex justify-between items-center bg-black/80 backdrop-blur-xl z-20">
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Neural Telemetry Pipeline</span>
                <span className="text-xs font-mono font-bold text-white tracking-widest uppercase flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    CORE_UPLINK_STABLE
                </span>
            </div>
            <div className="text-right">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Heuristic Precision</span>
                <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-tighter">99.9% Synchronized</div>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative">
           <div className="max-w-4xl mx-auto w-full pb-40">
               {messages.map((msg) => (
                 <ChatMessage key={msg.id} message={msg} onLiftContainment={handleLiftContainment} />
               ))}
               <div ref={messagesEndRef} />
           </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/90 to-transparent z-40">
           <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSendMessage} className="relative group">
                  <div className="relative bg-zinc-900/90 border border-zinc-700 group-hover:border-cs-red/40 transition-all duration-300 flex items-center shadow-2xl rounded-lg overflow-hidden">
                      <div className="pl-6 pr-4 text-cs-red font-mono font-black text-xl select-none animate-neural-pulse">◈</div>
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isProcessing}
                        placeholder={isProcessing ? "PROCESSING NEURAL HEURISTICS..." : "INPUT TACTICAL COMMAND (e.g. 'Ingest host telemetry' or 'Perform root cause analysis')"}
                        className="w-full bg-transparent text-white py-6 px-1 focus:outline-none font-mono text-sm placeholder:text-zinc-600 font-bold tracking-wider"
                        autoFocus
                      />
                      <div className="px-6">
                         <button 
                            type="submit" 
                            disabled={!input.trim() || isProcessing} 
                            className="text-zinc-500 hover:text-cs-red transition-all transform hover:scale-110"
                          >
                             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                          </button>
                      </div>
                  </div>
              </form>
              <div className="mt-4 flex justify-between items-center px-4">
                  <div className="text-[9px] text-zinc-600 font-mono tracking-[0.4em] uppercase font-black italic">AETHER_CORE_SYST_4.0_NEXTGEN</div>
                  <div className="flex gap-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-700 font-black uppercase tracking-widest">Cognitive State</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      </div>
                  </div>
              </div>
           </div>
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={config} onSave={(newConfig) => setConfig(newConfig)} />
    </div>
  );
}