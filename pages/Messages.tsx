import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseService, ChatMessage } from '../services/supabaseService';
import { UserProfile } from '../types';
import { 
  PaperAirplaneIcon, 
  UserCircleIcon, 
  ChatBubbleLeftRightIcon,
  InformationCircleIcon,
  MicrophoneIcon,
  SparklesIcon,
  HeartIcon,
  BellAlertIcon,
  CheckBadgeIcon,
  MapPinIcon,
  PhoneIcon,
  VideoCameraIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  EllipsisHorizontalIcon,
  CheckIcon,
  CheckBadgeIcon as CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';
import { GoogleGenAI, Type } from "@google/genai";

const Messages: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [linkedUser, setLinkedUser] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const CARE_TAPS = [
    { label: "I'm OK", icon: <CheckBadgeIcon className="w-5 h-5" />, text: "I'm doing okay right now! Just wanted to let you know.", color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { label: "Love You", icon: <HeartIcon className="w-5 h-5" />, text: "Just sending some love your way! ❤️", color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { label: "Call Me", icon: <BellAlertIcon className="w-5 h-5" />, text: "Can you give me a call when you're free?", color: 'bg-amber-50 text-amber-600 border-amber-100' },
  ];

  useEffect(() => {
    let messageSub: any = null;
    let typingSub: any = null;

    const initChat = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = await supabaseService.getCurrentUser();
        setCurrentUser(user);
        
        if (!user) {
          setError("User session not found.");
          setLoading(false);
          return;
        }

        const linked = await supabaseService.getLinkedUser();
        setLinkedUser(linked);

        if (linked && user) {
          const historyData = await supabaseService.getMessages(linked.id);
          setMessages(historyData);
          
          await supabaseService.markMessagesAsRead(linked.id);

          messageSub = supabaseService.subscribeToMessages(user.id, linked.id, async (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as ChatMessage;
              setMessages(prev => {
                if (prev.find(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
              
              if (newMessage.sender_id === linked.id && !isMinimized) {
                await supabaseService.markMessagesAsRead(linked.id);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedMessage = payload.new as ChatMessage;
              setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
            }
          });

          const channelId = [user.id, linked.id].sort().join(':').replace(/[^a-zA-Z0-9]/g, '_');
          typingSub = supabaseService.supabase.channel(`typing_${channelId}`)
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
              if (payload.userId === linked.id) {
                setRemoteTyping(payload.isTyping);
              }
            })
            .subscribe();
        }
      } catch (err) {
        console.error("Chat init error:", err);
        setError("Failed to load chat. Check your connection.");
      } finally {
        setLoading(false);
      }
    };

    initChat();

    return () => {
      if (messageSub) supabaseService.supabase.removeChannel(messageSub);
      if (typingSub) supabaseService.supabase.removeChannel(typingSub);
    };
  }, [isMinimized]);

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender_id !== currentUser?.id && !isMinimized) {
      getAiSuggestions(lastMsg.text);
    }
  }, [messages, currentUser, isMinimized]);

  const getAiSuggestions = async (lastMsgText: string) => {
    if (loadingSuggestions || isMinimized) return;
    setLoadingSuggestions(true);
    try {
      // Guideline: Initialize GoogleGenAI right before making an API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `The user just received this message: "${lastMsgText}". Suggest 3 short, helpful, elder-friendly quick replies. Return as JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      const text = response.text;
      if (text) {
        const suggestions = JSON.parse(text);
        setAiSuggestions(suggestions);
      }
    } catch (err) {
      console.error("AI Suggestions error:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (currentUser && linkedUser) {
      supabaseService.broadcastTyping(currentUser.id, linkedUser.id, val.length > 0);
    }
  };

  const handleSend = async (e?: React.FormEvent, manualText?: string) => {
    if (e) e.preventDefault();
    const textToSend = manualText || input;
    if (!textToSend.trim() || !linkedUser || !currentUser) return;

    setInput('');
    setAiSuggestions([]);
    supabaseService.broadcastTyping(currentUser.id, linkedUser.id, false);
    
    const { error: sendError } = await supabaseService.sendMessage(linkedUser.id, textToSend);
    if (sendError) {
      setError("Failed to send message.");
      if (!manualText) setInput(textToSend);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();
    setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  if (loading) return <div className="h-[70vh] flex items-center justify-center"><ArrowPathIcon className="w-10 h-10 animate-spin text-indigo-500" /></div>;

  if (!linkedUser) return <div className="p-10 text-center space-y-4 opacity-50"><ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto"/><h2 className="text-xl font-black">No Link Found</h2><p className="text-sm">Connect with a family member in Profile to start chatting.</p></div>;

  const lastMessage = messages[messages.length - 1];
  const unreadCount = messages.filter(m => m.sender_id === linkedUser.id && !m.read).length;

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 left-4 right-4 z-[100] bg-white rounded-[28px] p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] border border-slate-100 flex items-center gap-4 animate-in slide-in-from-bottom-6 cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98]"
      >
        <div className="relative shrink-0">
          <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-inner ring-4 ring-slate-50">
            {linkedUser.name.charAt(0)}
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-0.5">
            <h3 className="font-black text-slate-900 truncate text-[15px]">{linkedUser.name}</h3>
            {lastMessage && (
              <span className={`text-[10px] font-bold uppercase tracking-tight ${unreadCount > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                {new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center gap-2">
            <p className="text-[13px] text-slate-500 truncate flex-1 font-semibold leading-none">
              {remoteTyping ? (
                <span className="text-emerald-500 font-bold italic flex items-center gap-1">
                  Typing
                  <span className="flex gap-0.5">
                    <span className="w-0.5 h-0.5 bg-current rounded-full animate-bounce"></span>
                    <span className="w-0.5 h-0.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  {lastMessage?.sender_id === currentUser?.id && (
                    <div className="flex items-center -space-x-1 shrink-0">
                       <CheckIcon className={`w-3.5 h-3.5 ${lastMessage.read ? 'text-indigo-500' : 'text-slate-300'}`} />
                       <CheckIcon className={`w-3.5 h-3.5 ${lastMessage.read ? 'text-indigo-500' : 'text-slate-300'}`} />
                    </div>
                  )}
                  <span className="truncate">{lastMessage?.text || "Start a conversation"}</span>
                </span>
              )}
            </p>
            {unreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-black h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full shadow-lg shadow-indigo-100">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
        <div className="p-2 text-slate-300">
           <ArrowsPointingOutIcon className="w-5 h-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] -mt-2 animate-in fade-in duration-300">
      {/* HEADER */}
      <header className="flex items-center gap-4 py-3 px-4 bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm rounded-[28px] mb-2 sticky top-0 z-20">
        <div className="relative shrink-0">
          <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md border-2 border-white">
            <span className="font-black text-xs">{linkedUser.name.charAt(0)}</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-900 text-base leading-tight truncate">{linkedUser.name}</h3>
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{remoteTyping ? 'Typing...' : 'Online'}</p>
        </div>
        <div className="flex items-center gap-1">
           <button onClick={() => setIsMinimized(true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <ArrowsPointingInIcon className="w-5 h-5" />
           </button>
           <button className="p-2 text-indigo-600"><PhoneIcon className="w-5 h-5" /></button>
           <button className="p-2 text-indigo-600"><VideoCameraIcon className="w-5 h-5" /></button>
        </div>
      </header>

      {/* MESSAGES */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto space-y-4 px-3 py-4 scroll-smooth bg-white/30 backdrop-blur-sm"
      >
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUser?.id;
          const showTime = idx === 0 || new Date(msg.created_at).getTime() - new Date(messages[idx-1].created_at).getTime() > 300000;
          
          return (
            <div key={msg.id} className="space-y-1.5 animate-in slide-in-from-bottom-1 duration-300">
              {showTime && (
                <div className="flex justify-center my-4">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0 mb-1 border border-slate-200">
                    {linkedUser.name.charAt(0)}
                  </div>
                )}
                
                <div className={`max-w-[85%] px-5 py-3.5 shadow-sm relative group ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-[24px] rounded-br-none' 
                    : 'bg-white text-slate-800 rounded-[24px] rounded-bl-none border border-slate-100'
                }`}>
                  <p className="text-[15px] font-semibold leading-relaxed">{msg.text}</p>
                  
                  {isMe && idx === messages.length - 1 && (
                    <div className="absolute -bottom-5 right-1 flex items-center gap-1">
                       <span className="text-[8px] font-black text-slate-300 uppercase">{msg.read ? 'Seen' : 'Delivered'}</span>
                       <div className="flex items-center -space-x-1">
                         <CheckIcon className={`w-2.5 h-2.5 ${msg.read ? 'text-indigo-500' : 'text-slate-300'}`} />
                         <CheckIcon className={`w-2.5 h-2.5 ${msg.read ? 'text-indigo-500' : 'text-slate-300'}`} />
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {remoteTyping && (
          <div className="flex items-center gap-2 animate-in fade-in duration-300">
            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0 border border-slate-200">
              {linkedUser.name.charAt(0)}
            </div>
            <div className="bg-slate-100 px-4 py-2.5 rounded-[24px] rounded-bl-none flex gap-1 items-center border border-slate-200">
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="space-y-3 pt-2 pb-4 bg-white/70 backdrop-blur-xl border-t border-slate-100 rounded-b-[40px]">
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-4 scrollbar-hide">
           {CARE_TAPS.map((tap, i) => (
             <button key={i} onClick={() => handleSend(undefined, tap.text)} className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-tight border shadow-sm transition-all active:scale-95 ${tap.color}`}>
                {tap.icon} {tap.label}
             </button>
           ))}
        </div>

        <form onSubmit={handleSend} className="px-4 flex items-center gap-3">
          <div className="flex-1 bg-slate-100 rounded-[32px] p-1 flex items-center shadow-inner border border-slate-200">
            <button type="button" onClick={startVoiceInput} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-indigo-600 shadow-sm'}`}>
              <MicrophoneIcon className="w-5 h-5" />
            </button>
            <input 
              type="text" value={input}
              onChange={handleInputChange}
              placeholder="Message..."
              className="flex-1 bg-transparent px-3 py-3 text-[15px] font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button type="submit" disabled={!input.trim()} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${input.trim() ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-400'}`}>
              <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Messages;