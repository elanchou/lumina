
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Asset, DashboardWidget } from '../types';
import { generateFinancialResponse } from '../services/geminiService';

interface ChatInterfaceProps {
    assets?: Asset[];
    onAddWidget?: (widget: DashboardWidget) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ assets = [], onAddWidget }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'Lumina AI online. I can help monitor your portfolio or add custom widgets to your dashboard. Try saying "Add a widget for Tesla stock".',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const history = messages.map(m => ({ role: m.role, text: m.text }));
    
    // Prepare context
    const portfolioContext = assets.length > 0 
        ? JSON.stringify(assets.map(a => ({ symbol: a.symbol, name: a.name, value: a.value, allocation: a.allocation, type: a.type })))
        : "User has no assets in portfolio yet.";

    try {
      const response = await generateFinancialResponse(history, userMsg.text, portfolioContext);
      
      if (response) {
        // 1. Handle Text Response
        if (response.text) {
            const modelMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, modelMsg]);
        }

        // 2. Handle Function Calls (Dashboard Widget)
        const toolCalls = response.functionCalls;
        if (toolCalls && toolCalls.length > 0 && onAddWidget) {
             toolCalls.forEach(toolCall => {
                 if (toolCall.name === 'createDashboardWidget') {
                     const args = toolCall.args as any;
                     
                     // Prepare data structure based on type
                     let widgetData: any = { value: args.dataValue };
                     
                     if (args.type === 'chart') {
                         // convert string string list to numbers
                         const nums = (args.dataValue as string).split(',').map(Number);
                         widgetData = { values: nums };
                     }

                     const newWidget: DashboardWidget = {
                         id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                         type: args.type,
                         title: args.title,
                         subTitle: args.subTitle,
                         data: widgetData,
                         size: 'small',
                         visualStyle: args.visualStyle || 'default'
                     };
                     
                     onAddWidget(newWidget);

                     // Add a system confirmation if the model didn't explicitly say it
                     if (!response.text) {
                        const sysMsg: ChatMessage = {
                            id: (Date.now() + 2).toString(),
                            role: 'model',
                            text: `I've added a new ${args.type} widget for "${args.title}" to your dashboard.`,
                            timestamp: new Date()
                        };
                        setMessages(prev => [...prev, sysMsg]);
                     }
                 }
             });
        }
      } else {
         // Fallback error
         const errMsg: ChatMessage = {
            id: (Date.now() + 3).toString(),
            role: 'model',
            text: "I'm having trouble connecting to the service right now.",
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errMsg]);
      }

    } catch (error) {
        console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-lumina-accent text-white rounded-tr-sm shadow-lg shadow-blue-900/20'
                  : 'bg-white/5 border border-white/5 text-gray-200 rounded-tl-sm backdrop-blur-sm'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
            </div>
            <span className="text-[10px] text-gray-600 mt-1 px-1">
                {msg.role === 'model' ? 'Lumina • ' : 'You • '} 
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        ))}
        
        {isTyping && (
            <div className="flex items-start">
                <div className="px-4 py-3 bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-lumina-accent/60 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-lumina-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-lumina-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-glass-border bg-lumina-bg/30 backdrop-blur-sm">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your portfolio or markets..."
            className="w-full bg-glass-100 border border-glass-border rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lumina-accent/50 focus:ring-1 focus:ring-lumina-accent/50 transition-all resize-none h-12 overflow-hidden"
            style={{ minHeight: '48px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1.5 p-1.5 bg-lumina-accent hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
        <div className="flex gap-2 mt-2 justify-center">
            <button onClick={() => setInput("Add a widget for Apple Stock")} className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition">Monitor AAPL</button>
            <button onClick={() => setInput("Show me a volatility card")} className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition">Risk Widget</button>
            <button onClick={() => setInput("Create a chart for Bitcoin trend")} className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition">BTC Chart</button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
