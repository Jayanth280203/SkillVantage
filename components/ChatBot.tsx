import React, { useState, useRef, useEffect } from 'react';
import { streamChatResponse } from '../services/geminiService';
import { ChatMessage, AnalysisResult } from '../types';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface ChatBotProps {
  analysisData: AnalysisResult | null;
}

export const ChatBot: React.FC<ChatBotProps> = ({ analysisData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your SkillVantage AI mentor. Ask me anything about skill gaps, industry trends, or technical concepts.', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for Gemini API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Create context string from analysis data
      let contextString = "";
      if (analysisData) {
        contextString = JSON.stringify({
          cohortSummary: analysisData.summary,
          identifiedRoles: analysisData.role,
          topSkills: analysisData.skills.slice(0, 15).map(s => s.name),
          missingSkillsGlobal: analysisData.missingSkills,
          departments: analysisData.departmentMappings.map(d => d.department)
        }, null, 2);
      }

      const stream = await streamChatResponse(history, userMsg.text, contextString);
      
      let botResponseText = '';
      
      // Optimistically add bot message placeholder
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: new Date() }]);

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          botResponseText += text;
          
          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg.role === 'model') {
              lastMsg.text = botResponseText;
            }
            return newMsgs;
          });
        }
      }

    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error connecting to the AI services. Please try again.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <div className="flex-1 overflow-y-auto p-4 pb-24 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex w-full mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mx-2 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`p-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
              }`}>
                {msg.text || (isLoading && idx === messages.length - 1 ? <span className="animate-pulse">Thinking...</span> : '')}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-4 left-4 right-4 bg-white p-2 rounded-full shadow-lg border border-gray-200 flex items-center">
        <div className="pl-3 pr-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your skills or job market..."
          className="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-transparent py-2"
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};