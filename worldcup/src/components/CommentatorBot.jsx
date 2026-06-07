import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function CommentatorBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'אהלן! אני הפרשן הווירטואלי של הליגה. תשאל אותי על היסטוריית מפגשים, סטטיסטיקות, פצועים, או מי הפייבוריטית היום.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const prompt = `אתה אנליסט וסטטיסטיקאי כדורגל מקצועי ורציני, מומחה למונדיאל 2026 וטורנירים בינלאומיים.
      ענה על השאלה של המשתמש בצורה עניינית, מדויקת ומקצועית, ללא ציניות, ללא הומור וללא סלנג.
      אם השאלה נוגעת לעתיד, תחזיות או פייבוריטיות, ענה בהתבסס על דירוג פיפ"א, יחסי כוחות נוכחיים בכדורגל העולמי ודעת מומחים.
      אם השאלה היסטורית, ספק נתונים היסטוריים אמיתיים.
      תן תשובה קצרה, ברורה וקולעת (עד 3-4 משפטים).
      חשוב: אל תשתמש בשום עיצוב, ללא כוכביות וללא שבירות שורה מיותרות.
      
      השאלה: ${userMsg}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "וואלה אין לי מושג, המיקרופון שלי עושה בעיות. תשאל שוב.";

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "יש לי תקלה בשידור מהאולפן... נסה שוב עוד רגע." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 left-0 w-[calc(100vw-2rem)] max-w-[340px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[450px]"
          >
            {/* Header */}
            <div className="bg-primary p-3 flex justify-between items-center text-primary-foreground">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-full"><Bot size={18} /></div>
                <h3 className="font-black text-sm">הפרשן של הליגה</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                    {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed max-w-[80%] ${msg.role === 'user' ? 'bg-secondary text-secondary-foreground rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm text-foreground'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 flex-row">
                  <div className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center"><Bot size={14} /></div>
                  <div className="p-3 rounded-2xl bg-card border border-border rounded-tl-sm flex gap-1 items-center h-[44px]">
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-card border-t border-border flex gap-2">
              <input 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="שאל את הפרשן..."
                className="flex-1 bg-muted border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
                className="bg-primary text-primary-foreground p-2.5 rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                <Send size={18} className="rotate-180" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-primary to-fuchsia-600 rounded-full shadow-xl shadow-primary/30 flex items-center justify-center text-white hover:scale-105 transition-transform"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}