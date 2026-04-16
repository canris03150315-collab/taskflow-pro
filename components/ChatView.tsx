import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, DepartmentDef } from '../types';

interface ChatViewProps {
  currentUser: User;
  messages: ChatMessage[];
  departments: DepartmentDef[];
  onSendMessage: (content: string, channel: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ currentUser, messages, departments, onSendMessage }) => {
  const [currentChannel, setCurrentChannel] = useState('GENERAL'); // 'GENERAL' or Department Enum
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  const channels = [
    { id: 'GENERAL', name: '📢 全公司大廳' },
    { id: currentUser.department, name: `🔒 ${getDeptName(currentUser.department)} (內部)` },
  ];

  const filteredMessages = messages.filter(m => (m as any).channelId === currentChannel || (m as any).channel === currentChannel);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue, currentChannel);
    setInputValue('');
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
      
      {/* Sidebar (Channels) */}
      <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-slate-200">
           <h3 className="font-bold text-slate-800">💬 聊天頻道</h3>
        </div>
        <div className="p-2 space-y-1 overflow-y-auto flex-1">
           {channels.map(channel => (
               <button
                 key={channel.id}
                 onClick={() => setCurrentChannel(channel.id)}
                 className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition flex items-center justify-between ${currentChannel === channel.id ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
               >
                 <span>{channel.name}</span>
                 {currentChannel === channel.id && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
               </button>
           ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
           {filteredMessages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
               <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
               <p className="text-sm font-bold">尚無訊息，開始聊天吧！</p>
             </div>
           )}

           {filteredMessages.map((msg, index) => {
             const isMe = String(msg.userId || (msg as any).user_id || '') === String(currentUser?.id || '');
             if (index === 0) {
               console.log('DEBUG (ChatView): msgUserId:', String(msg.userId || (msg as any).user_id || ''), 'currentUserId:', String(currentUser?.id || ''), 'isMe:', isMe);
             }
             return (
               <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                 <div className="flex-shrink-0">
                    <img src={msg.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(msg.userName || 'default')}`} alt={msg.userName} className="w-8 h-8 rounded-full bg-slate-200" />
                 </div>
                 <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="text-xs font-bold text-slate-600">{msg.userName}</span>
                       <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                       {msg.content}
                    </div>
                 </div>
               </div>
             );
           })}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form onSubmit={handleSend} className="flex gap-2">
             <input
               type="text"
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 placeholder-slate-400"
               placeholder={`傳送訊息到 ${channels.find(c => c.id === currentChannel)?.name}...`}
             />
             <button 
               type="submit"
               disabled={!inputValue.trim()}
               className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
             </button>
          </form>
        </div>

      </div>
    </div>
  );
};