// Profile.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { User, Camera, Loader2 } from 'lucide-react';
import { supabase, auth } from '../lib/supabase.js';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

// רשימת 48 הנבחרות והשחקנים המלאה לפי הבתים שלך
export const PLAYERS_BY_TEAM = {
  // בית A
  'מקסיקו': ['סנטיאגו חימנס', 'הירבינג לוסאנו', 'הנרי מרטין', 'חוליאן קיניונס'],
  'דרום אפריקה': ['פרסי טאו', 'לייל פוסטר', 'זאקלה לפאסה'],
  'דרום קוריאה': ['יונג מין סון', 'וואנג הי-צ׳אן', 'קאנג אין לי'],
  'צ׳כיה': ['פטריק שיק', 'אדם הלוז׳ק', 'תומאש צ׳באנצ׳ארה'],
  
  // בית B
  'קנדה': ['ג׳ונתן דייוויד', 'קייל לארין', 'טייג׳ון ביוקנן'],
  'בוסניה והרצגובינה': ['אדין דז׳קו', 'ארמדין דמירוביץ׳', 'מיראלם פיאניץ׳'],
  'קטאר': ['אכרם עפיף', 'אלמועז עלי', 'חסן אל-היידוס'],
  'שוויץ': ['בריל אמבולו', 'נואה אוקאפור', 'רובן ורגאס', 'שרדאן שאקירי'],

  // בית C
  'ברזיל': ['ויניסיוס ג׳וניור', 'רודריגו', 'ראפיניה', 'אנדריק'],
  'מרוקו': ['יוסף א-נסירי', 'בראהים דיאס', 'חכים זייש'],
  'האיטי': ['פרנצדי פיירו', 'דוקנס נאזון', 'קרנג׳י אנטואן'],
  'סקוטלנד': ['צ׳ה אדאמס', 'לינדון דייקס', 'ג׳ון מקגין'],

  // בית D
  'ארה״ב': ['כריסטיאן פוליסיק', 'פולארין באלוגון', 'טימותי וואה'],
  'פרגוואי': ['מיגל אלמירון', 'אנטוניו סנאבריה', 'חוליו אנסיסו'],
  'אוסטרליה': ['מיצ׳ל דיוק', 'קרייג גודווין', 'מרטין בויל'],
  'טורקיה': ['הקאן צ׳להאנולו', 'קנאן יילדיז', 'ארדה גולר', 'ג׳נק טוסון'],

  // בית E
  'גרמניה': ['ג׳מאל מוסיאלה', 'פלוריאן וירץ', 'קאי האברץ', 'לירוי סאנה'],
  'קוראסאו': ['יורגן לוקאדיה', 'ראנגלו יאנגה', 'קנג׳י גורה'],
  'חוף השנהב': ['סבסטיאן האלר', 'ניקולא פפה', 'וילפריד זאהה'],
  'אקוודור': ['אנר ולנסיה', 'קווין רודריגס', 'ג׳ורדי קאיסדו'],

  // בית F
  'הולנד': ['קודי גאקפו', 'צ׳אבי סימונס', 'ממפיס דפאי', 'דונייל מאלן'],
  'יפן': ['קאורו מיטומה', 'טאקפוסה קובו', 'טאקומי מינאמינו'],
  'שבדיה': ['אלכסנדר איסאק', 'דיאן קולוסבסקי', 'ויקטור גיוקרס'],
  'תוניסיה': ['יוסף אל-מסאכני', 'אליאס עאשור', 'סיפדין ג׳זירי'],

  // בית G
  'בלגיה': ['קווין דה בראונה', 'ז׳רמי דוקו', 'רומלו לוקאקו', 'לאנדרו טרוסאר'],
  'מצרים': ['מוחמד סלאח', 'מוסטפא מוחמד', 'מחמוד טרזגה'],
  'איראן': ['מהדי טארמי', 'סרדאר אזמון', 'עלירזה ג׳האנבח׳ש'],
  'ניו זילנד': ['כריס ווד', 'קוסטה ברברוסס', 'אלייז׳ה ג׳אסט'],

  // בית H
  'ספרד': ['לאמין ימאל', 'אלברו מוראטה', 'ניקו וויליאמס', 'דני אולמו'],
  'כף ורדה': ['בבה', 'ריאן מנדס', 'גארי רודריגס'],
  'ערב הסעודית': ['סאלם א-דאווסרי', 'סאלח א-שהרי', 'פיראס אל-בורייכאן'],
  'אורוגוואי': ['דרווין נונייס', 'פדריקו ואלוורדה', 'פקונדו פליסטרי'],

  // בית I
  'צרפת': ['קיליאן אמבפה', 'אנטואן גריזמן', 'מרקוס תוראם', 'עוסמאן דמבלה'],
  'סנגל': ['סאדיו מאנה', 'ניקולס ג׳קסון', 'איסמעילה סאר'],
  'עיראק': ['איימן חוסיין', 'עלי ג׳אסם', 'מוהנד עלי'],
  'נורבגיה': ['ארלינג האלנד', 'מרטין אודגור', 'אלכסנדר סורלות'],

  // בית J
  'ארגנטינה': ['ליונל מסי', 'חוליאן אלברס', 'לאוטרו מרטינס', 'פאולו דיבאלה'],
  'אלג׳יריה': ['ריאד מחרז', 'בגדאד בונג׳אח', 'איסלאם סלימאני'],
  'אוסטריה': ['מרקו ארנאוטוביץ׳', 'מרסל זביצר', 'כריסטוף באומגרטנר'],
  'ירדן': ['מוסא א-תעמרי', 'יזן א-נעימאת', 'עלי עלואן'],

  // בית K
  'פורטוגל': ['כריסטיאנו רונאלדו', 'רפאל ליאו', 'ז׳ואאו פליקס', 'ברונו פרננדס'],
  'קונגו DR': ['יוהאן וויסה', 'סדריק בקאמבו', 'משאק אליה'],
  'אוזבקיסטן': ['אלדור שומורודוב', 'ג׳לאלודין משריפוב', 'אוסטון אורונוב'],
  'קולומביה': ['לואיס דיאס', 'ג׳ון דוראן', 'חאמס רודריגס'],

  // בית L
  'אנגליה': ['הארי קיין', 'ג׳וד בלינגהאם', 'בוקאיו סאקה', 'פיל פודן'],
  'קרואטיה': ['אנדריי קרמאריץ׳', 'ברונו פטקוביץ׳', 'איבן פרישיץ׳'],
  'גאנה': ['מוחמד קודוס', 'ג׳ורדן איו', 'איניאקי וויליאמס'],
  'פנמה': ['חוסה פחארדו', 'אסמאעל דיאס', 'ססיליו ווטרמן']
};

export const TEAMS = Object.keys(PLAYERS_BY_TEAM).sort();

export function Profile() {
  const { user } = useOutletContext();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ 
    nickname: user?.nickname || '', 
    favorite_team: user?.favorite_team || '',
    predicted_winner: user?.predicted_winner || '',
    predicted_top_scorer: user?.predicted_top_scorer || '',
    avatar_url: user?.avatar_url || ''
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.email.split('@')[0]}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setForm(f => ({ ...f, avatar_url: data.publicUrl }));
      toast.success('התמונה הועלתה! לחץ שמור לעדכון סופי.');
    } catch (error) {
      toast.error('שגיאה בהעלאת התמונה');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        email: user?.email,
        nickname: form.nickname,
        favorite_team: form.favorite_team,
        predicted_winner: form.predicted_winner,
        predicted_top_scorer: form.predicted_top_scorer,
        avatar_url: form.avatar_url
      });

      if (error) throw error;

      setUser(prev => ({ ...prev, ...form }));
      toast.success('הפרופיל עודכן בהצלחה!');
    } catch (err) {
      toast.error('שגיאה בשמירת הפרופיל');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-sm mx-auto pb-12 px-4 pt-6">
      <h1 className="text-2xl font-black flex items-center gap-2"><User size={24} className="text-primary" />הפרופיל שלי</h1>
      
      <div className="relative w-24 h-24 mx-auto">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-black text-primary overflow-hidden border-2 border-primary/20">
          {uploading ? (
            <Loader2 className="animate-spin text-primary" />
          ) : form.avatar_url ? (
            <img src={form.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            (form.nickname || user?.email || '?')[0].toUpperCase()
          )}
        </div>
        <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
          <Camera size={16} />
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
        </label>
      </div>

      <form onSubmit={save} className="space-y-5 bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div>
          <label className="text-sm font-medium block mb-1 font-bold">כינוי</label>
          <input value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
            className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="הכינוי שלך" required />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1 font-bold">נבחרת אהובה</label>
          <select value={form.favorite_team} onChange={e => setForm(f => ({ ...f, favorite_team: e.target.value }))}
            className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">-- בחר נבחרת --</option>
            {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
          </select>
        </div>

        <div className="pt-4 border-t border-dashed border-border">
          <h3 className="text-sm font-black text-primary mb-3 uppercase tracking-wider">הימורי בונוס (10 נק׳ כל אחד)</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">הנבחרת שתזכה במונדיאל</label>
              <select value={form.predicted_winner} onChange={e => setForm(f => ({ ...f, predicted_winner: e.target.value }))}
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">-- מי תניף את הגביע? --</option>
                {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">מלך השערים</label>
              <select value={form.predicted_top_scorer} onChange={e => setForm(f => ({ ...f, predicted_top_scorer: e.target.value }))}
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">-- בחר שחקן --</option>
                {Object.entries(PLAYERS_BY_TEAM).map(([team, players]) => (
                  <optgroup key={team} label={team}>
                    {players.map(player => <option key={player} value={player}>{player}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <label className="text-[10px] font-bold text-muted-foreground block mb-1">אימייל (מזהה ייחודי)</label>
          <input value={user?.email || ''} disabled className="w-full border border-input rounded-lg px-3 py-2 text-xs bg-muted text-muted-foreground opacity-70" />
        </div>

        <button type="submit" disabled={saving || uploading}
          className="w-full bg-primary text-white rounded-lg py-3 font-black text-sm disabled:opacity-60 hover:shadow-lg transition-all active:scale-[0.98]">
          {saving ? 'מעדכן פרופיל...' : 'שמור שינויים'}
        </button>
      </form>
    </div>
  );
}

export default Profile;