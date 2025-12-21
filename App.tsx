import React, { useState, useRef, useEffect } from 'react';
import { AgentController } from './services/agent';
import { Message, AppConfig, SecurityStats, Incident, Device } from './types';
import { ChatMessage } from './components/ChatMessage';
import { SettingsModal } from './components/SettingsModal';

const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: 'model',
  content: `### AXON CORE ONLINE
Select a Tactical Playbook or enter a command to begin neural analysis.`,
  timestamp: new Date()
};

const PLAYBOOKS = [
  { id: 'PB-INFO', name: 'HOST_INFO', cmd: 'Get Host Intelligence: Retrieve full system profile, network interfaces, and last logged-on user for a specific asset.', desc: 'Full asset discovery.' },
  { id: 'PB-LAT', name: 'LATERAL_SWEEP', cmd: 'Perform a Lateral Movement Sweep: Correlate active incidents to find shared user accounts and IP hop-points.', desc: 'Map attack progression.' },
  { id: 'PB-ROOT', name: 'ROOT_CAUSE_AI', cmd: 'Execute Root Cause Analysis: Analyze the process tree and behavioral detections for the most recent critical incident.', desc: 'ML process reconstruction.' },
  { id: 'PB-EXFIL', name: 'EXFIL_HUNTER', cmd: 'Data Exfiltration Hunt: Scan for large network outbound spikes and cloud storage connections.', desc: 'Identify data theft.' },
  { id: 'PB-IDEN', name: 'IDENTITY_AUDIT', cmd: 'Check Identity Integrity: Flag MFA bypasses, abnormal login hours, and new local admin creations.', desc: 'Verify user credentials.' },
  { id: 'PB-LIFT', name: 'LIFT_LOCK', cmd: 'Lift Containment Protocol: Restore network access for a previously isolated host after forensic clearance.', desc: 'Restore asset access.' },
  { id: 'PB-RANS', name: 'RANSOM_WATCH', cmd: 'Ransomware Defense: Check for Shadow Copy deletion and unusual encryption/archiving activity.', desc: 'Prevent encryption.' },
  { id: 'PB-VULN', name: 'VULN_MAPPER', cmd: 'CVE Mapping: Cross-reference active alerts with known critical vulnerabilities (CVEs) on affected hosts.', desc: 'Asset vulnerability link.' },
  { id: 'PB-SCRIPT', name: 'SCRIPT_SCAN', cmd: 'Script Audit: Analyze all PowerShell, WMI, and BITSAdmin execution logs for suspicious obfuscation.', desc: 'Check living-off-the-land.' },
  { id: 'PB-ZERO', name: 'ZERO_TRUST', cmd: 'Zero-Trust Review: Verify conditional access failures and failed MFA attempts for high-value targets.', desc: 'Access integrity.' },
  { id: 'PB-DLP', name: 'DLP_CHECK', cmd: 'Data Loss Audit: Monitor for sensitive file access and removable media usage on flagged assets.', desc: 'Monitor sensitive data.' },
  { id: 'PB-INJECT', name: 'INJECT_HUNT', cmd: 'Code Injection Scan: Search for process hollowing and reflective DLL injection signatures.', desc: 'Find memory-only threats.' },
];

const AxonLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.5 8.5L22 12L15.5 15.5L12 22L8.5 15.5L2 12L8.5 8.5L12 2Z" stroke="#ff2d2d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2.5" fill="#ff2d2d" />
    <path d="M12 7V5M12 19V17M7 12H5M19 12H17" stroke="#ff2d2d" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

export default function App() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [stats, setStats] = useState<SecurityStats>({ openIncidents: 0, criticalCount: 0, containedHosts: 0, lastUpdated: new Date() });
  const [criticalAlert, setCriticalAlert] = useState<Incident | null>(null);
  
  const [riskScore, setRiskScore] = useState(0);
  const [activePlaybookId, setActivePlaybookId] = useState<string | null>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  useEffect(() => {
      let interval: ReturnType<typeof setInterval> | undefined;
      if (monitoringEnabled && agentRef.current) {
          updateStats();
          interval = setInterval(async () => {
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
          const calculatedRisk = Math.min(100, (s.criticalCount * 15) + (s.openIncidents * 2));
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
                  setCriticalAlert(latest);
                  
                  setActivePlaybookId('PB-ROOT');
                  const command = `AUTOMATED PLAYBOOK: Perform forensic analysis on critical incident ${latest.incident_id} for host ${latest.host_name}.`;
                  processUserMessage(command, true);
                  setTimeout(() => setActivePlaybookId(null), 5000);
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
        timestamp: new Date() 
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

  const runPlaybook = (pb: typeof PLAYBOOKS[0]) => {
      if (isProcessing) return;
      setActivePlaybookId(pb.id);
      processUserMessage(pb.cmd, true);
      setTimeout(() => setActivePlaybookId(null), 3000);
  }

  const handleLiftContainment = (deviceId: string) => {
    const cmd = `AUTHORIZE: Restore network access for host ID: ${deviceId}`;
    processUserMessage(cmd);
  }

  return (
    <div className="flex h-screen bg-cs-bg text-zinc-100 overflow-hidden font-sans bg-grid relative selection:bg-cs-red selection:text-white">
      
      {/* --- CRITICAL OVERLAY --- */}
      {criticalAlert && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4">
            <div className="bg-zinc-800 border-2 border-cs-red shadow-[0_0_100px_rgba(255,45,45,0.4)] max-w-2xl w-full p-8 relative overflow-hidden rounded-lg">
               <div className="absolute top-0 left-0 w-full h-[1px] bg-cs-red animate-scanline"></div>
               <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                  <div className="w-16 h-16 border border-cs-red rounded-full flex items-center justify-center">
                     <svg className="w-8 h-8 text-cs-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-black tracking-tighter uppercase mb-2 text-white text-wrap px-4 text-center">NEURAL_THREAT_LOCK</h2>
                    <p className="text-cs-red font-mono text-xs tracking-widest uppercase font-bold">AXON_REF: {criticalAlert.incident_id}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 w-full text-left">
                     <div className="bg-zinc-700/30 p-3 border border-white/5"><div className="text-[8px] text-zinc-400 uppercase tracking-widest mb-1 font-black">Asset</div><div className="text-xs font-mono font-bold text-white truncate">{criticalAlert.host_name}</div></div>
                     <div className="bg-zinc-700/30 p-3 border border-white/5"><div className="text-[8px] text-zinc-400 uppercase tracking-widest mb-1 font-black">Velocity</div><div className="text-xs font-mono font-bold text-cs-red">CRITICAL</div></div>
                     <div className="bg-zinc-700/30 p-3 border border-white/5"><div className="text-[8px] text-zinc-400 uppercase tracking-widest mb-1 font-black">Tactic</div><div className="text-xs font-mono font-bold text-white">LAT_MOV</div></div>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button 
                        onClick={() => {
                            const command = `AUTHORIZE containment protocols for ${criticalAlert.host_name} (${criticalAlert.host_id})`;
                            setCriticalAlert(null);
                            processUserMessage(command);
                        }}
                        className="flex-1 py-3.5 bg-cs-red hover:bg-white hover:text-cs-red text-white font-black text-xs tracking-widest uppercase transition-all"
                    >
                        Axon Contain
                    </button>
                    <button onClick={() => setCriticalAlert(null)} className="px-6 py-3.5 glass text-[9px] font-black uppercase tracking-widest">Acknowledge</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className="hidden xl:flex flex-col w-[22rem] border-r border-cs-border glass z-30 shadow-2xl relative overflow-hidden">
        
        {/* AXON Branding Header */}
        <div className="p-5 border-b border-cs-border bg-zinc-800">
           <div className="flex flex-col gap-3">
             <div className="flex items-center gap-3 group cursor-default">
                <div className="flex-shrink-0 w-10 h-10 bg-zinc-900 flex items-center justify-center border border-cs-border relative rounded-sm shadow-[0_0_15px_rgba(255,45,45,0.1)] group-hover:border-cs-red transition-all duration-500">
                    <AxonLogo />
                </div>
                <div>
                    <h1 className="text-xl font-display font-black tracking-tighter leading-none text-white overflow-visible uppercase">Axon Core</h1>
                    <p className="text-[8px] text-cs-red font-black tracking-[0.4em] uppercase mt-1 pl-1.5 border-l border-cs-red whitespace-nowrap">Neural Intelligence</p>
                </div>
             </div>

             {/* Risk Index */}
             <div>
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Network Entropy</span>
                    <span className={`text-sm font-mono font-black ${riskScore > 50 ? 'text-cs-red' : 'text-emerald-400'}`}>{riskScore}%</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ease-out ${riskScore > 70 ? 'bg-cs-red shadow-[0_0_10px_#ff2d2d]' : riskScore > 30 ? 'bg-amber-400' : 'bg-emerald-400 shadow-[0_0_10px_#34d399]'}`}
                        style={{ width: `${riskScore}%` }}
                    ></div>
                </div>
             </div>
           </div>
        </div>

        {/* Compact Metrics */}
        <div className="px-5 py-3 grid grid-cols-3 gap-2">
            <div className="bg-zinc-700/40 p-2.5 border border-white/5 rounded-sm">
                <div className="text-[7px] text-zinc-400 uppercase font-black tracking-widest mb-0.5">Crit</div>
                <div className="text-lg font-display font-black text-white">{stats.criticalCount}</div>
            </div>
            <div className="bg-zinc-700/40 p-2.5 border border-white/5 rounded-sm">
                <div className="text-[7px] text-zinc-400 uppercase font-black tracking-widest mb-0.5">Active</div>
                <div className="text-lg font-display font-black text-white">{stats.openIncidents}</div>
            </div>
            <div className="bg-zinc-700/40 p-2.5 border border-white/5 rounded-sm">
                <div className="text-[7px] text-zinc-400 uppercase font-black tracking-widest mb-0.5">Isolated</div>
                <div className="text-lg font-display font-black text-emerald-400">{stats.containedHosts}</div>
            </div>
        </div>

        {/* Playbook Area */}
        <div className="flex-1 flex flex-col min-h-0 pt-1">
          <div className="px-5 flex justify-between items-center mb-1.5">
            <h3 className="text-[8px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-1.5">
               <span className="w-1.5 h-3 bg-cs-red rounded-sm"></span> PLAYBOOKS
            </h3>
          </div>
          
          <div className="flex-1 px-5 pb-3 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-2 pb-2">
                {PLAYBOOKS.map((pb) => (
                    <button 
                      key={pb.id} 
                      onClick={() => runPlaybook(pb)}
                      disabled={isProcessing}
                      className={`text-left p-3 bg-zinc-800 border transition-all duration-200 cursor-pointer rounded-sm group relative flex flex-col justify-between h-[60px] ${
                        activePlaybookId === pb.id ? 'border-cs-red bg-cs-red/20 shadow-[inset_0_0_10px_rgba(255,45,45,0.1)]' : 'border-white/5 hover:border-cs-red/40 hover:bg-zinc-700'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className="text-[8px] font-mono font-black text-white group-hover:text-cs-red transition-colors truncate">{pb.name}</span>
                        <p className="text-[7.5px] text-zinc-500 font-medium leading-tight group-hover:text-zinc-400 transition-colors line-clamp-2">{pb.desc}</p>
                    </button>
                ))}
            </div>
            
            {/* Quick Action: Isolated Assets List if stats.containedHosts > 0 */}
            {stats.containedHosts > 0 && (
              <div className="mt-4 border-t border-white/5 pt-4">
                 <h3 className="text-[8px] font-black text-cs-red uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-cs-red rounded-full animate-pulse"></span> QUARANTINED_ASSETS
                 </h3>
                 <div className="space-y-1">
                    <button 
                       onClick={() => processUserMessage("List all contained hosts.")}
                       className="w-full text-left p-2 bg-zinc-900 border border-cs-red/20 rounded-sm hover:bg-cs-red/10 transition-colors"
                    >
                       <div className="flex justify-between items-center">
                          <span className="text-[8px] font-mono text-zinc-300">Total Contained:</span>
                          <span className="text-[10px] font-mono font-black text-cs-red">{stats.containedHosts}</span>
                       </div>
                       <div className="mt-1 text-[7px] text-zinc-500 uppercase font-bold tracking-tighter">Click to inspect and lift locks</div>
                    </button>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Controls */}
        <div className="p-5 border-t border-cs-border space-y-2 bg-zinc-800">
            <button 
                onClick={() => setMonitoringEnabled(!monitoringEnabled)}
                className={`w-full py-3 flex flex-col items-center justify-center gap-0.5 text-[8px] font-black tracking-widest uppercase transition-all duration-300 border rounded-sm ${
                    monitoringEnabled ? 'bg-cs-red border-cs-red text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                }`}
            >
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${monitoringEnabled ? 'bg-white animate-pulse' : 'bg-current'}`}></div>
                    {monitoringEnabled ? 'NEURAL_WATCH: ON' : 'ACTIVATE NEURAL_WATCH'}
                </div>
            </button>
            <div className="flex gap-2">
                <button onClick={() => setIsSettingsOpen(true)} className="flex-1 text-center text-[8px] font-black text-zinc-300 hover:text-white border border-zinc-700 py-2.5 transition-colors uppercase tracking-widest rounded-sm bg-zinc-900">Config</button>
                <button onClick={() => window.location.reload()} className="flex-1 text-center text-[8px] font-black text-zinc-300 hover:text-cs-red border border-zinc-700 py-2.5 transition-colors uppercase tracking-widest rounded-sm bg-zinc-900">Reset</button>
            </div>
        </div>
      </aside>

      {/* --- MAIN COMMAND STREAM --- */}
      <main className="flex-1 flex flex-col relative h-screen bg-zinc-950">
        
        {/* Stream Header */}
        <header className="px-5 py-3 border-b border-cs-border flex justify-between items-center bg-zinc-800 z-20">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Neural Stream</span>
                    <span className="text-xs font-mono font-bold text-white tracking-tighter uppercase">AXON_UPLINK_01</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Logic_Link</span>
                    <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase">Synchronized</span>
                </div>
            </div>
        </header>

        {/* Forensic Output */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-black/30">
           <div className="max-w-4xl mx-auto w-full pb-32">
               {messages.map((msg) => (
                 <ChatMessage key={msg.id} message={msg} onLiftContainment={handleLiftContainment} />
               ))}
               <div ref={messagesEndRef} />
           </div>
        </div>

        {/* Input Interface */}
        <div className="p-5 pt-0 w-full relative z-20">
           <div className="max-w-4xl mx-auto relative group">
              <form onSubmit={handleSendMessage} className="relative bg-zinc-800 border border-zinc-700 hover:border-cs-red/40 transition-all duration-300 flex flex-col shadow-2xl rounded-sm">
                  <div className="flex items-center pr-4">
                      <div className="pl-5 pr-4 text-cs-red font-mono font-black text-lg select-none">λ</div>
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isProcessing}
                        placeholder={isProcessing ? "THINKING..." : "ENTER NEURAL COMMAND..."}
                        className="w-full bg-transparent text-white py-3.5 px-1 focus:outline-none font-mono text-sm placeholder:text-zinc-600 font-bold tracking-wider"
                        autoFocus
                      />
                      <button 
                        type="submit" 
                        disabled={!input.trim() || isProcessing} 
                        className="p-2 text-zinc-400 hover:text-cs-red transition-all disabled:opacity-0"
                      >
                         <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                      </button>
                  </div>
                  {isProcessing && <div className="h-[1.5px] w-full bg-cs-red shadow-[0_0_10px_#ff2d2d]"></div>}
              </form>
              <div className="mt-2.5 flex justify-between items-center px-2">
                  <div className="flex gap-4 items-center">
                    <div className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase font-bold">AXON_NEURAL_V1</div>
                    <div className="text-[8px] text-zinc-600 font-mono tracking-widest uppercase font-bold">Link: 24ms</div>
                  </div>
                  <div className="flex gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Cognition</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]"></div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Telemetry</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-cs-red shadow-[0_0_5px_#ff2d2d]"></div>
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