
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, ToolCallDetails } from '../types';
import { CommandLogo } from '../App';

interface ChatMessageProps {
  message: Message;
  onLiftContainment?: (deviceId: string) => void;
}

const ToolStream: React.FC<{ tools: ToolCallDetails[], onLift?: (id: string) => void }> = ({ tools, onLift }) => (
  <div className="mb-6 space-y-3 font-mono">
    {tools.map((t, idx) => {
      const isContained = t.result?.status === 'contained' || (Array.isArray(t.result) && t.result.some((r: any) => r.status === 'contained'));
      const deviceId = t.result?.device_id || (Array.isArray(t.result) ? t.result.find((r: any) => r.status === 'contained')?.device_id : null);
      const isError = t.status === 'error';

      return (
        <div key={idx} className="bg-black/60 border border-white/5 rounded relative overflow-hidden group shadow-2xl">
          <div className={`absolute top-0 left-0 w-[3px] h-full ${isError ? 'bg-red-600' : 'bg-cs-red'}`}></div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-4 mb-2">
               <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${t.status === 'pending' ? 'bg-cs-red animate-ping' : isError ? 'bg-red-600' : 'bg-emerald-500'}`}></div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Executing Falcon Tool</span>
               </div>
               <span className="text-[10px] text-white font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">{t.functionName}</span>
            </div>
            
            <div className="text-[9px] text-zinc-600 uppercase flex gap-2 overflow-hidden mb-3">
               <span className="flex-shrink-0">Params:</span>
               <span className="truncate text-zinc-500">{JSON.stringify(t.args)}</span>
            </div>

            {t.result && (
                <div className="mt-2 bg-zinc-950/80 p-4 border border-white/5 rounded-sm">
                   <div className="max-h-60 overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed text-zinc-300">
                      {isError ? (
                        <div className="text-red-400 font-black uppercase">ERROR: {t.result.error}</div>
                      ) : (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(t.result, null, 2)}</pre>
                      )}
                   </div>
                   
                   {isContained && deviceId && onLift && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <button 
                          onClick={() => onLift(deviceId)}
                          className="w-full bg-emerald-500/10 hover:bg-emerald-500 hover:text-black border border-emerald-500/40 text-emerald-400 py-3 rounded-sm font-black uppercase tracking-[0.3em] text-[9px] transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                        >
                          Lift Isolation
                        </button>
                    </div>
                  )}
                </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onLiftContainment }) => {
  const isUser = message.role === 'user';
  const isAlert = message.isAlert;

  if (message.role === 'system') {
    return (
      <div className="flex justify-center my-10 relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-cs-red/20 border-dashed"></div></div>
        <div className="bg-cs-red text-white px-8 py-2.5 text-[10px] font-black uppercase tracking-[0.4em] shadow-[0_0_30px_rgba(255,45,45,0.3)] rounded-sm relative z-10 italic">
           {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      <div className={`max-w-[95%] xl:max-w-[85%] flex gap-6 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className={`w-10 h-10 glass flex items-center justify-center border-2 rounded transition-all duration-500 ${
              isUser ? 'border-cs-border hover:border-white' : 
              isAlert ? 'border-cs-red shadow-[0_0_20px_rgba(255,45,45,0.4)] animate-pulse' : 'border-cs-border'
          }`}>
            {isUser ? (
               <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            ) : (
              <CommandLogo size={20} />
            )}
          </div>
        </div>

        {/* Message Content Section */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
          <div className="flex items-center gap-4 mb-2 text-[10px] font-mono tracking-widest uppercase opacity-60">
             <span className={`font-black ${isAlert ? 'text-cs-red' : 'text-white'}`}>
               {isUser ? 'ANALYST' : isAlert ? 'SYSTEM ALERT' : 'AETHER INTEL'}
             </span>
             <span className="text-zinc-600 font-bold">
               {message.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
             </span>
          </div>

          <div className={`p-6 glass rounded relative overflow-hidden shadow-2xl ${
            isUser 
              ? 'border-white/5 bg-white/5' 
              : isAlert 
                ? 'border-cs-red/40 bg-cs-red/5' 
                : 'border-white/5 bg-zinc-900/40'
          }`}>
            {message.toolCalls && <ToolStream tools={message.toolCalls} onLift={onLiftContainment} />}

            {message.isThinking && !message.content ? (
                 <div className="flex items-center gap-4 py-2 font-mono text-[10px] text-cs-red font-black tracking-[0.3em] uppercase">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-cs-red animate-pulse"></div>
                      <div className="w-2 h-2 bg-cs-red animate-pulse delay-75"></div>
                      <div className="w-2 h-2 bg-cs-red animate-pulse delay-150"></div>
                    </div>
                    Processing Forensic Data...
                 </div>
            ) : (
              <div className="markdown-content font-sans text-[13px] text-zinc-300 space-y-5 leading-relaxed">
                <ReactMarkdown 
                  components={{
                    h3: ({node, ...props}) => <h3 className="text-[11px] font-black text-white mt-8 mb-3 tracking-[0.2em] uppercase flex items-center gap-3 border-l-4 border-cs-red pl-4 py-0.5 bg-gradient-to-r from-cs-red/10 to-transparent" {...props} />,
                    ul: ({node, ...props}) => <ul className="space-y-4 my-4" {...props} />,
                    li: ({node, ...props}) => <li className="flex items-start gap-4 text-zinc-400" {...props}><div className="mt-2 w-1.5 h-1.5 bg-cs-red rotate-45 flex-shrink-0" /> <span className="flex-1">{props.children}</span></li>,
                    code: ({node, ...props}) => {
                      const content = String(props.children);
                      const isTTP = /T\d{4}/.test(content);
                      return (
                        <code className={`${isTTP ? 'bg-cs-red/20 text-cs-red font-black border-cs-red/40 px-2' : 'bg-white/5 text-white px-1.5'} py-0.5 font-mono text-[11px] border rounded-sm`} {...props} />
                      );
                    },
                    pre: ({node, ...props}) => <pre className="bg-black/80 p-5 overflow-x-auto text-[11px] font-mono border border-white/5 my-6 text-zinc-400 rounded-sm shadow-inner" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-500 bg-emerald-500/5 p-4 my-4 text-emerald-400 font-mono text-[11px] uppercase tracking-widest" {...props} />,
                    p: ({node, ...props}) => <p className="leading-7" {...props} />
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
