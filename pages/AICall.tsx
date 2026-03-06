
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Modality } from '@google/genai';
import { liveService } from '../services/liveService';
import { 
  PhoneXMarkIcon, 
  MicrophoneIcon, 
  SpeakerWaveIcon,
  FaceSmileIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';

const AICall: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'connecting' | 'active' | 'ending'>('connecting');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            },
            systemInstruction: "You are a friendly, patient, and cheerful Virtual Companion for a senior citizen. Your name is 'Puck'. Speak clearly, use simple language, and be encouraging. You are here to chat, listen to their stories, or just offer company. Always start the call by greeting them warmly.",
            inputAudioTranscription: {},
            outputAudioTranscription: {}
          },
          callbacks: {
            onopen: () => {
              setStatus('active');
              const source = audioContextInRef.current!.createMediaStreamSource(stream);
              const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = liveService.createAudioBlob(inputData);
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextInRef.current!.destination);
            },
            onmessage: async (message) => {
              // Handle Transcriptions
              if (message.serverContent?.outputTranscription) {
                setTranscription(prev => (prev + ' ' + message.serverContent?.outputTranscription?.text).slice(-100));
              }

              // Handle Audio Output
              const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioBase64 && audioContextOutRef.current) {
                setIsSpeaking(true);
                const ctx = audioContextOutRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await liveService.decodeAudioData(
                  liveService.decode(audioBase64),
                  ctx,
                  24000,
                  1
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                source.onended = () => {
                  activeSourcesRef.current.delete(source);
                  if (activeSourcesRef.current.size === 0) setIsSpeaking(false);
                };

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                activeSourcesRef.current.add(source);
              }

              // Handle Interruption
              if (message.serverContent?.interrupted) {
                activeSourcesRef.current.forEach(s => {
                  try { s.stop(); } catch(e) {}
                });
                activeSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsSpeaking(false);
              }
            },
            onclose: () => setStatus('ending'),
            onerror: () => setStatus('ending')
          }
        });

        sessionRef.current = await sessionPromise;

      } catch (err) {
        console.error("Call failed:", err);
        navigate(-1);
      }
    };

    startCall();

    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextInRef.current) audioContextInRef.current.close();
      if (audioContextOutRef.current) audioContextOutRef.current.close();
    };
  }, [navigate]);

  const endCall = () => {
    setStatus('ending');
    setTimeout(() => navigate(-1), 500);
  };

  return (
    <div className="fixed inset-0 bg-indigo-950 z-[1000] flex flex-col items-center justify-between p-10 text-white animate-in fade-in duration-500">
      <div className="text-center space-y-2 mt-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <SparklesIcon className="w-5 h-5 text-indigo-400 animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Virtual Companion</p>
        </div>
        <h2 className="text-4xl font-black tracking-tight">Puck is here</h2>
        <p className="text-indigo-300 font-bold opacity-60">
          {status === 'connecting' ? 'Establishing secure link...' : 'Listening to you...'}
        </p>
      </div>

      <div className="relative flex items-center justify-center w-full max-w-xs aspect-square">
        {/* Animated Orb */}
        <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-1000 ${isSpeaking ? 'bg-indigo-500/40 scale-125' : 'bg-sky-500/20 scale-100'}`}></div>
        <div className={`relative w-48 h-48 rounded-full border-4 border-white/20 flex items-center justify-center transition-all duration-500 shadow-2xl ${isSpeaking ? 'bg-indigo-600 scale-110' : 'bg-sky-600'}`}>
           {isSpeaking ? (
             <SpeakerWaveIcon className="w-20 h-20 text-white animate-pulse" />
           ) : (
             <FaceSmileIcon className="w-20 h-20 text-white" />
           )}
           
           {/* Visualizer Rings */}
           <div className={`absolute -inset-4 border-2 border-white/10 rounded-full animate-ping ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}></div>
           <div className={`absolute -inset-8 border border-white/5 rounded-full animate-ping [animation-delay:0.5s] ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}></div>
        </div>
      </div>

      <div className="w-full space-y-10 mb-10">
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-[32px] border border-white/10 text-center h-20 flex items-center justify-center">
           <p className="text-sm font-bold text-indigo-100 italic opacity-80 leading-relaxed">
             {transcription || "Say 'Hello' to start chatting..."}
           </p>
        </div>

        <div className="flex flex-col items-center gap-6">
           <button 
             onClick={endCall}
             className="w-24 h-24 bg-rose-600 rounded-full flex items-center justify-center shadow-2xl shadow-rose-900/50 active:scale-90 transition-all border-8 border-rose-500/30"
           >
             <PhoneXMarkIcon className="w-10 h-10 text-white" />
           </button>
           <p className="text-[10px] font-black uppercase tracking-widest opacity-40">End Conversation</p>
        </div>
      </div>
    </div>
  );
};

export default AICall;
