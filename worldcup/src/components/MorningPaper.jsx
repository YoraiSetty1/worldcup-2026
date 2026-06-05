import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { Newspaper, Coffee } from 'lucide-react';
import moment from 'moment';
import ReactMarkdown from 'react-markdown';

export default function MorningPaper() {
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaper = async () => {
      const todayStr = moment().format('YYYY-MM-DD');
      
      const { data } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('date', todayStr)
        .single();
        
      if (data) {
        setPaper(data);
      }
      setLoading(false);
    };
    fetchPaper();
  }, []);

  if (loading || !paper) return null;

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 p-5 rounded-2xl shadow-sm relative overflow-hidden mb-6" dir="rtl">
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="bg-yellow-100 p-2 rounded-xl text-yellow-600">
          <Newspaper size={24} />
        </div>
        <div>
          <h2 className="font-black text-gray-800 flex items-center gap-2">
            עיתון הבוקר <Coffee size={14} className="text-yellow-600" />
          </h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            נכתב ע"י ה-AI של הטורניר
          </p>
        </div>
      </div>

      <div className="prose prose-sm prose-yellow max-w-none text-gray-700 leading-relaxed relative z-10">
        <ReactMarkdown>{paper.summary_text}</ReactMarkdown>
      </div>
    </div>
  );
}