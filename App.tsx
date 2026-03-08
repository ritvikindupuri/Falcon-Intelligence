
import React, { useState, useRef, useEffect } from 'react';
import { AgentController } from './services/agent';
import { Message, AppConfig, SecurityStats } from './types';
import { ChatMessage } from './components/ChatMessage';
import { SettingsModal } from './components/SettingsModal';
import { CrowdStrikeMCPServer } from './services/mcp';

const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: 'model',
  content: `### AETHER SECURITY CORE READY
MCP Infrastructure initialized. CrowdStrike Falcon server detected.

**Autonomous Threat Monitor** is now active. I will alert you to new critical detections.`,
  timestamp: new Date()
};

export const CommandLogo = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 4L34 11V29L20 36L6 29V11L20 4Z" stroke="#ff2d2d" strokeWidth="1.5" strokeLinejoin="round"/>
    <circle cx="20" cy="20" r="2.5" fill="#ff2d2d"><animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" /></circle>
  </svg>
);

export default function App() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [stats, setStats] = useState<SecurityStats>({ openIncidents: 0, criticalCount: 0, containedHosts: 0, lastUpdated: new Date() });
  const [apiState, setApiState] = useState<'IDLE' | 'STABLE' | 'ERROR'>('IDLE');

  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('aether_config');
    return saved ? JSON.parse(saved) : {
      clientId: '',
      clientSecret: '',
      baseUrl: 'https://api.crowdstrike.com',
      proxyUrl: ''
    };
  });

  const agentRef = useRef<AgentController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastCritCount = useRef<number>(0);

  // Initialize Agent
  useEffect(() => {
    if (process.env.API_KEY && config.clientId) {
      const csServer = new CrowdStrikeMCPServer(config);
      agentRef.current = new AgentController(process.env.API_KEY, [csServer]);
      setApiState('STABLE');
      updateStats(csServer);
    }
  }, [config]);

  // Autonomous Polling Loop (30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (apiState === 'STABLE' && agentRef.current) {
        const csServer = new CrowdStrikeMCPServer(config);
        updateStats(csServer);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [apiState, config]);

  const updateStats = async (server: CrowdStrikeMCPServer) => {
    try {
      const s = await server.getService().get_statistics();
      setStats(s);
      
      // Auto-Alert Logic
      if (s.criticalCount > lastCritCount.current && lastCritCount.current > 0) {
        const alertMsg: Message = {
          id: crypto.randomUUID(),
          role: 'system',
          isAlert: true,
          content: `CRITICAL THREAT DETECTED: ${s.criticalCount - lastCritCount.current} new incident(s) since last check.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, alertMsg]);
      }
      lastCritCount.current = s.criticalCount;
    } catch (e) { setApiState('ERROR'); }
  };

  const processUserMessage = async (msgText: string) => {
    if (!msgText.trim() || isProcessing || !agentRef.current) return;
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: msgText, timestamp: new Date() }]);
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
    } finally { setIsProcessing(false); }
  };

  const handleToolApproval = async (turnId: string, approved: boolean) => {
    if (!agentRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      await agentRef.current.resumeWithApproval(turnId, approved, (updatedMsg) => {
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      });
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="flex h-screen bg-cs-bg text-zinc-100 overflow-hidden font-sans relative">
      <div className="absolute inset-0 pointer-events-none bg-grid opacity-10"></div>
      
      {/* Sidebar */}
      <aside className="hidden xl:flex flex-col w-80 border-r border-cs-border glass z-30">
        <div className="p-8 border-b border-cs-border bg-black/40">
           <div className="flex items-center gap-4">
              <CommandLogo size={32} />
              <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">AETHER</h1>
           </div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-3">
            <div className={`p-4 border border-white/5 rounded transition-colors ${stats.criticalCount > 0 ? 'bg-cs-red/10' : 'bg-zinc-800/40'}`}>
                <div className="text-[8px] text-zinc-500 uppercase font-black mb-1">CRITICAL</div>
                <div className={`text-xl font-display font-black ${stats.criticalCount > 0 ? 'text-cs-red animate-pulse' : 'text-zinc-500'}`}>{stats.criticalCount}</div>
            </div>
            <div className="bg-zinc-800/40 p-4 border border-white/5 rounded">
                <div className="text-[8px] text-zinc-500 uppercase font-black mb-1">OPEN</div>
                <div className="text-xl font-display font-black text-white">{stats.openIncidents}</div>
            </div>
        </div>
        <div className="flex-1 p-6 space-y-2 overflow-y-auto">
           <p className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-4">TACTICAL SHORTCUTS</p>
           <button onClick={() => processUserMessage("Analyze the most recent critical incident")} className="w-full text-left p-3 text-[10px] font-bold uppercase tracking-widest bg-zinc-900 border border-white/5 hover:border-cs-red/40 transition-all">Start Triage</button>
           <button onClick={() => processUserMessage("Run a health check across the fleet")} className="w-full text-left p-3 text-[10px] font-bold uppercase tracking-widest bg-zinc-900 border border-white/5 hover:border-cs-red/40 transition-all">Host Audit</button>
        </div>
        <div className="p-6 border-t border-cs-border">
            <button onClick={() => setIsSettingsOpen(true)} className="w-full py-3 text-[10px] font-black uppercase tracking-widest border border-zinc-700 hover:text-white transition-all">Settings</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative h-screen bg-[#050507]">
        <header className="px-8 py-4 border-b border-cs-border flex justify-between items-center bg-black/80 backdrop-blur-xl z-20">
            <span className="text-[10px] font-mono font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${apiState === 'STABLE' ? 'bg-emerald-500 animate-pulse' : 'bg-cs-red'}`}></span>
                {apiState === 'STABLE' ? 'MONITOR_ACTIVE' : 'MCP_OFFLINE'}
            </span>
            <div className="flex gap-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Last Updated: {stats.lastUpdated.toLocaleTimeString()}
              </span>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative">
           <div className="max-w-4xl mx-auto w-full pb-40">
               {messages.map((msg) => (
                 <ChatMessage 
                    key={msg.id} 
                    message={msg} 
                    onToolApproval={(approved) => handleToolApproval(msg.id, approved)}
                 />
               ))}
               <div ref={messagesEndRef} />
           </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/90 to-transparent z-40">
           <div className="max-w-4xl mx-auto">
              <form onSubmit={(e) => { e.preventDefault(); processUserMessage(input); }} className="relative">
                  <div className="relative bg-zinc-900/90 border border-zinc-700 focus-within:border-cs-red/40 flex items-center shadow-2xl rounded-lg overflow-hidden transition-all">
                      <div className="pl-6 text-cs-red font-black text-xl select-none">◈</div>
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isProcessing || apiState !== 'STABLE'}
                        placeholder={apiState !== 'STABLE' ? "CONFIGURE API SETTINGS TO CONNECT..." : "ENTER COMMAND..."}
                        className="w-full bg-transparent text-white py-6 px-4 focus:outline-none font-mono text-sm placeholder:text-zinc-600 font-bold tracking-wider"
                      />
                  </div>
              </form>
           </div>
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={config} onSave={(c) => { setConfig(c); localStorage.setItem('aether_config', JSON.stringify(c)); }} />
    </div>
  );
}
