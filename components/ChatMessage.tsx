import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, ToolCallDetails } from '../types';

interface ChatMessageProps {
  message: Message;
  onLiftContainment?: (deviceId: string) => void;
}

const ToolStream: React.FC<{ tools: ToolCallDetails[], onLift?: (id: string) => void }> = ({ tools, onLift }) => (
  <div className="mb-4 space-y-2 font-mono text-[9px]">
    {tools.map((t, idx) => {
      // Check if the result contains a contained device
      const isContained = t.result?.status === 'contained' || (Array.isArray(t.result) && t.result.some((r: any) => r.status === 'contained'));
      const deviceId = t.result?.device_id || (Array.isArray(t.result) ? t.result.find((r: any) => r.status === 'contained')?.device_id : null);

      return (
        <div key={idx} className="bg-black/40 border border-white/5 p-3 relative overflow-hidden rounded-sm">
          <div className="absolute top-0 left-0 w-[1.5px] h-full bg-cs-red"></div>
          <div className="flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'pending' ? 'bg-cs-red animate-pulse' : t.status === 'error' ? 'bg-red-500' : 'bg-emerald-400'}`}></div>
            <div className="flex-1 flex justify-between items-center">
               <div className="flex gap-2">
                  <span className="text-zinc-600 uppercase tracking-widest font-black">Call:</span>
                  <span className="text-white font-bold">{t.functionName}</span>
               </div>
               <div className="flex gap-2">
                  <span className="text-zinc-600 uppercase tracking-widest">Args:</span>
                  <span className="text-zinc-500 truncate max-w-[120px]">{JSON.stringify(t.args)}</span>
               </div>
            </div>
          </div>
          {t.result && (
              <div className="mt-2 pt-2 border-t border-white/5 text-[8px] text-zinc-500 overflow-hidden">
                  <div className="max-h-32 overflow-y-auto custom-scrollbar">
                    <pre>{JSON.stringify(t.result, null, 2)}</pre>
                  </div>
                  {isContained && deviceId && onLift && (
                    <button 
                      onClick={() => onLift(deviceId)}
                      className="mt-2 w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 py-1.5 rounded-sm font-black uppercase tracking-widest text-[7px] transition-all"
                    >
                      Lift Network Containment
                    </button>
                  )}
              </div>
          )}
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
      <div className="flex justify-center my-6">
        <div className="bg-red-600 text-white px-6 py-2 text-[9px] font-black uppercase tracking-[0.3em] shadow-lg">
           {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[90%] flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Compact Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 glass flex items-center justify-center border rounded-sm ${
            isUser ? 'border-cs-border' : 
            isAlert ? 'border-cs-red shadow-[0_0_10px_rgba(255,0,0,0.2)]' : 'border-cs-border'
        }`}>
          {isUser ? (
             <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          ) : (
            <div className={`font-display font-black text-sm ${isAlert ? 'text-cs-red' : 'text-white'}`}>A</div>
          )}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
          <div className="flex items-center gap-3 mb-1.5 text-[8px] font-mono tracking-widest uppercase opacity-40 group-hover:opacity-100 transition-opacity">
             <span className={`font-black ${isAlert ? 'text-cs-red' : 'text-white'}`}>
               {isUser ? 'Operator' : isAlert ? 'Alert_Core' : 'AXON_NEURAL'}
             </span>
             <span className="text-zinc-600">
               {message.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
             </span>
          </div>

          <div className={`p-5 glass rounded-sm relative overflow-hidden ${
            isUser 
              ? 'border-white/5' 
              : isAlert 
                ? 'border-cs-red/40 bg-cs-red/5' 
                : 'border-white/5'
          }`}>
            {message.toolCalls && <ToolStream tools={message.toolCalls} onLift={onLiftContainment} />}

            {message.isThinking && !message.content ? (
                 <div className="flex items-center gap-3 py-1 font-mono text-[8px] text-cs-red font-black tracking-widest uppercase">
                    <span className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-cs-red animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-cs-red animate-pulse delay-75"></div>
                    </span>
                    ANALYZING...
                 </div>
            ) : (
              <ReactMarkdown 
                className="markdown-content font-sans text-xs text-zinc-300 space-y-4 leading-relaxed"
                components={{
                  h3: ({node, ...props}) => <h3 className="text-[10px] font-black text-white mt-6 mb-2 tracking-widest uppercase flex items-center gap-2 border-l-2 border-cs-red pl-3" {...props} />,
                  ul: ({node, ...props}) => <ul className="space-y-3 my-3" {...props} />,
                  li: ({node, ...props}) => <li className="flex items-start gap-3 text-zinc-400" {...props}><div className="mt-1.5 w-1 h-1 bg-cs-red flex-shrink-0" /> <span className="flex-1">{props.children}</span></li>,
                  code: ({node, ...props}) => <code className="bg-white/5 text-white px-1.5 py-0.5 font-mono text-[10px] border border-white/10 rounded-sm" {...props} />,
                  pre: ({node, ...props}) => <pre className="bg-black/60 p-4 overflow-x-auto text-[10px] font-mono border border-white/5 my-4 text-zinc-400 rounded-sm" {...props} />,
                  p: ({node, ...props}) => <p className="leading-6" {...props} />
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};