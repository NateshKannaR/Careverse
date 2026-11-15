import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { useA11y } from '../../context/A11yContext.js';
import { Bot, Send, Sparkles, X, Volume2, ShieldCheck, ChevronDown } from 'lucide-react';

interface CareBuddyWidgetProps {
  patientId?: string;
  embedded?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggestedFollowUps?: string[];
  disclaimer?: string;
  timestamp: string;
}

export const CareBuddyWidget: React.FC<CareBuddyWidgetProps> = ({ patientId, embedded = false }) => {
  const { t } = useLanguage();
  const { speakAnnouncement } = useA11y();
  const [isOpen, setIsOpen] = useState(embedded);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am **CareBuddy**, your personal healthcare assistant in CAREVERSE. I can help review your medication schedules, summarize your daily routine, suggest questions for your doctor, and explain health terminology in plain English.',
      suggestedFollowUps: [
        'Summarize today’s care routine',
        'What pills do I have left today?',
        'Suggest questions for my doctor',
        'What should I do if I miss a dose?'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (messageText: string) => {
    const textToSend = messageText.trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.careBuddy.chat(textToSend, patientId);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        suggestedFollowUps: response.suggestedFollowUps,
        disclaimer: response.disclaimer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: 'I apologize, but I encountered an error retrieving your care context. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const widgetContent = (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-teal-700 to-teal-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-base leading-tight">CareBuddy</h3>
              <span className="text-[10px] font-bold bg-teal-500/40 text-teal-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                AI Companion
              </span>
            </div>
            <p className="text-xs text-teal-100/90">Elderly Routine & Healthcare Assistant</p>
          </div>
        </div>
        {!embedded && (
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-xl transition text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Safety Disclaimer Banner */}
      <div className="bg-amber-50 border-b border-amber-200/80 px-3 py-2 flex items-start gap-2 text-[11px] text-amber-900 leading-tight">
        <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Medical Notice:</strong> CareBuddy explains routines and schedules. Never alter medication doses without consulting your doctor.
        </span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-teal-700 text-white rounded-br-none shadow-sm'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-card'
              }`}
            >
              <div className="whitespace-pre-line">{m.text}</div>

              {m.sender === 'assistant' && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{m.timestamp}</span>
                  <button
                    onClick={() => speakAnnouncement(m.text.replace(/[*_#]/g, ''))}
                    className="flex items-center gap-1 text-teal-700 hover:text-teal-900 font-medium px-2 py-0.5 rounded hover:bg-teal-50"
                    title="Read response aloud (Accessibility)"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Read Aloud</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Follow-up chips */}
            {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                {m.suggestedFollowUps.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold px-2.5 py-1 rounded-full border border-teal-200 transition text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 w-28 text-slate-500 text-xs shadow-sm">
            <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.careBuddy.placeholder}
          className="flex-1 px-4 py-2.5 bg-slate-100 rounded-2xl text-xs sm:text-sm text-slate-800 border-none focus:ring-2 focus:ring-teal-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-2xl shadow-sm transition"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );

  if (embedded) {
    return <div className="h-[520px]">{widgetContent}</div>;
  }

  return (
    <>
      {/* Floating launcher button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-full shadow-2xl transition-all transform hover:scale-105 border-2 border-white focus:outline-none"
          aria-label="Open CareBuddy AI Assistant"
        >
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="font-bold text-sm hidden sm:inline">Ask CareBuddy</span>
        </button>
      )}

      {/* Floating window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md h-[540px] animate-fade-in">
          {widgetContent}
        </div>
      )}
    </>
  );
};
