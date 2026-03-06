
import React, { useState, useRef, useEffect } from 'react';
import { geminiService, playGeminiAudio } from '../services/geminiService';
import { supabaseService } from '../services/supabaseService';
import { 
  FaceSmileIcon, 
  SparklesIcon, 
  ChatBubbleBottomCenterTextIcon,
  MusicalNoteIcon,
  PuzzlePieceIcon,
  XMarkIcon,
  TrophyIcon,
  SpeakerWaveIcon,
  ArrowPathIcon,
  StopIcon
} from '@heroicons/react/24/solid';

type GameState = 'lobby' | 'playing' | 'won';
type MemoryCard = { id: string; content: string; name: string; isFlipped: boolean; isMatched: boolean; uniqueId: number };

const Wellness: React.FC = () => {
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Feature States
  const [activeFeature, setActiveFeature] = useState<'chat' | 'game' | 'music'>('chat');
  
  // Game States
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameState>('lobby');

  // Music/Meditation States
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const initWellness = async () => {
      const user = await supabaseService.getCurrentUser();
      if (user) {
        const profile = await supabaseService.getProfile(user.id);
        const firstName = profile?.name?.split(' ')[0] || 'there';
        setChatLog([
          { role: 'ai', text: `Hello ${firstName}! I'm your Wellness Assistant. We can chat, play a memory game, or try a guided relaxation session.` }
        ]);
      }
    };
    initWellness();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatLog]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatLog(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);
    const aiResponse = await geminiService.getHealthAdvice(userMsg);
    setChatLog(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setIsTyping(false);
  };

  // --- Memory Game Logic ---
  const startGame = async (theme: string = "Classic Items") => {
    setGameLoading(true);
    setGameStatus('playing');
    const pairs = await geminiService.generateMemoryGamePairs(theme);
    
    // Duplicate and shuffle
    const gameCards: MemoryCard[] = [...pairs, ...pairs]
      .map((p, idx) => ({ ...p, uniqueId: idx, isFlipped: false, isMatched: false }))
      .sort(() => Math.random() - 0.5);
    
    setCards(gameCards);
    setFlippedIndices([]);
    setGameLoading(false);
  };

  const handleCardClick = (index: number) => {
    if (cards[index].isFlipped || cards[index].isMatched || flippedIndices.length === 2) return;

    const newFlipped = [...flippedIndices, index];
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const [idx1, idx2] = newFlipped;
      if (cards[idx1].id === cards[idx2].id) {
        // Match!
        setTimeout(() => {
          setCards(prev => {
            const updated = prev.map((c, i) => (i === idx1 || i === idx2) ? { ...c, isMatched: true } : c);
            // Check if this was the last match
            if (updated.every(c => c.isMatched)) {
              setGameStatus('won');
            }
            return updated;
          });
          setFlippedIndices([]);
        }, 600);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === idx1 || i === idx2) ? { ...c, isFlipped: false } : c));
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // --- Music Therapy Logic ---
  const handleMeditationToggle = async (mood: string) => {
    // If the clicked mood is already playing, stop it
    if (isPlaying && activeMood === mood) {
      stopMeditation();
      return;
    }

    // If something else is playing, stop it first
    if (isPlaying) {
      stopMeditation();
    }

    // Start new meditation
    setAudioLoading(true);
    setActiveMood(mood);
    
    const audioB64 = await geminiService.generateMeditationAudio(mood);
    if (audioB64) {
      try {
        const source = await playGeminiAudio(audioB64);
        audioSourceRef.current = source;
        setIsPlaying(true);
        source.onended = () => {
          setIsPlaying(false);
          setActiveMood(null);
          audioSourceRef.current = null;
        };
      } catch (err) {
        console.error("Audio playback failed", err);
        setIsPlaying(false);
        setActiveMood(null);
      }
    } else {
      setActiveMood(null);
    }
    setAudioLoading(false);
  };

  const stopMeditation = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Already stopped or finished
      }
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
    setActiveMood(null);
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] space-y-4">
      <header className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <FaceSmileIcon className="w-8 h-8 text-amber-500" />
          Mind & Joy
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveFeature('chat')}
            className={`p-3 rounded-2xl transition-all ${activeFeature === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
          >
            <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveFeature('game')}
            className={`p-3 rounded-2xl transition-all ${activeFeature === 'game' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
          >
            <PuzzlePieceIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveFeature('music')}
            className={`p-3 rounded-2xl transition-all ${activeFeature === 'music' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
          >
            <MusicalNoteIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 flex-1 overflow-hidden relative flex flex-col">
        
        {/* CHAT INTERFACE */}
        {activeFeature === 'chat' && (
          <>
            <div className="px-5 py-3 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-4 h-4" />
                <h3 className="font-black text-[10px] uppercase tracking-[2px]">AI Wellbeing Chat</h3>
              </div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatLog.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-base font-bold leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-slate-50 text-slate-800 rounded-bl-none border border-slate-100'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="bg-slate-50 p-4 rounded-2xl rounded-bl-none max-w-[100px] flex justify-center gap-1 border border-slate-100">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              )}
            </div>

            <form onSubmit={handleChat} className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                className="flex-1 p-4 rounded-xl border-2 border-slate-200 bg-white text-base font-bold text-black outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                placeholder="Talk to me..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button className="bg-indigo-600 text-white w-14 h-14 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0">
                <ChatBubbleBottomCenterTextIcon className="w-7 h-7" />
              </button>
            </form>
          </>
        )}

        {/* MEMORY GAME INTERFACE */}
        {activeFeature === 'game' && (
          <div className="h-full flex flex-col p-6 overflow-y-auto">
            {gameStatus === 'lobby' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[28px] flex items-center justify-center shadow-xl">
                  <PuzzlePieceIcon className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Brain Trainer</h3>
                  <p className="text-sm font-bold text-slate-400 max-w-[200px]">Keep your mind sharp with a daily matching game.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 w-full">
                  {['Garden', 'Kitchen', 'History'].map(theme => (
                    <button 
                      key={theme}
                      onClick={() => startGame(theme)}
                      className="bg-emerald-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-all"
                    >
                      PLAY {theme.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gameStatus === 'playing' && (
              <div className="space-y-6 h-full flex flex-col">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[2px]">Matching Pairs</p>
                  <button onClick={() => setGameStatus('lobby')} className="text-slate-400"><XMarkIcon className="w-6 h-6"/></button>
                </div>
                
                {gameLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <ArrowPathIcon className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">AI is choosing pairs...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {cards.map((card, idx) => (
                      <button
                        key={card.uniqueId}
                        onClick={() => handleCardClick(idx)}
                        className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 transform ${
                          card.isMatched ? 'bg-emerald-50 opacity-0 scale-75 pointer-events-none' :
                          card.isFlipped ? 'bg-white border-2 border-emerald-500 rotate-y-180 shadow-lg' :
                          'bg-emerald-600 text-emerald-600 shadow-md active:scale-90'
                        }`}
                      >
                        {(card.isFlipped || card.isMatched) ? card.content : '?'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {gameStatus === 'won' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                  <TrophyIcon className="w-14 h-14" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-800">Excellent!</h3>
                  <p className="text-lg font-bold text-slate-500">Your memory is sharp today.</p>
                </div>
                <button 
                  onClick={() => setGameStatus('lobby')}
                  className="bg-emerald-600 text-white px-10 py-5 rounded-[24px] font-black text-xl shadow-xl active:scale-95 transition-all"
                >
                  PLAY AGAIN
                </button>
              </div>
            )}
          </div>
        )}

        {/* MUSIC THERAPY INTERFACE */}
        {activeFeature === 'music' && (
          <div className="h-full flex flex-col p-6 overflow-y-auto bg-gradient-to-b from-sky-50 to-white">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10">
              
              <div className="relative">
                <div className={`w-40 h-40 bg-sky-200 rounded-full flex items-center justify-center transition-all duration-[3000ms] ${isPlaying ? 'scale-[1.8] blur-xl opacity-20' : 'scale-100'}`}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-32 h-32 bg-sky-600 text-white rounded-full flex items-center justify-center shadow-2xl relative z-10 transition-transform ${isPlaying ? 'animate-pulse scale-110' : ''}`}>
                    <MusicalNoteIcon className="w-16 h-16" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Guided Calm</h3>
                <p className="text-sm font-bold text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                  Listen to a customized meditation guide generated just for you.
                </p>
              </div>

              {audioLoading ? (
                <div className="space-y-4">
                  <ArrowPathIcon className="w-10 h-10 text-sky-500 animate-spin mx-auto" />
                  <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Generating relaxing voice...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 w-full">
                  {['Peace', 'Morning', 'Sleep', 'Joy'].map(mood => {
                    const isMoodActive = activeMood === mood;
                    return (
                      <button 
                        key={mood}
                        onClick={() => handleMeditationToggle(mood)}
                        className={`p-5 rounded-[24px] font-black text-xs uppercase tracking-widest flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg ${
                          isMoodActive 
                            ? 'bg-rose-100 text-rose-600 shadow-rose-50 border-2 border-rose-200' 
                            : 'bg-white text-sky-600 border border-sky-100'
                        }`}
                      >
                        {isMoodActive ? <StopIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
                        {isMoodActive ? 'STOP' : mood}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {isPlaying && (
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-[3px] animate-pulse">Now Breathing...</p>
              )}
            </div>
          </div>
        )}

      </div>

      <style>{`
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default Wellness;
