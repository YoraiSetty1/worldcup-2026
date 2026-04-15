import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Send, MessageCircle } from 'lucide-react';
import { chatApi } from '../api/supabase';
import moment from 'moment';

export default function Chat() {
  const { user } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    chatApi.list().then(setMessages);
    const channel = chatApi.subscribe(payload => {
      setMessages(prev => [...prev, payload.new]);
    });
    return () => channel.unsubscribe();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    await chatApi.send(user.email, user.nickname || user.full_name || user.email, input.trim());
    setInput('');
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <h1 className="text-2xl font-black flex items-center gap-2 mb-4"><MessageCircle size={24} className="text-primary" />צ'אט</h1>
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map(m => {
          const isMe = m.user_email === user?.email;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm'}`}>
                {!isMe && <div className="text-xs font-bold mb-1 text-muted-foreground">{m.user_nickname || m.user_email}</div>}
                <p className="text-sm">{m.message}</p>
                <div className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {moment(m.created_at).format('HH:mm')}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 pt-3 border-t border-border">
        <input value={input} onChange={e => setInput(e.target.value)}
          className="flex-1 border border-input rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="כתוב הודעה..." />
        <button type="submit" disabled={sending || !input.trim()}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 disabled:opacity-50">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
