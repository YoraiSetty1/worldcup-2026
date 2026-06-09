import { motion } from 'framer-motion';
import { BookOpen, Trophy, Zap, Swords, Clock, Star, Flame, BrainCircuit, Target, MessageSquare, Scale } from 'lucide-react';

const RuleSection = ({ icon: Icon, title, children, color }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-card rounded-2xl border border-border p-6 shadow-sm mb-6"
  >
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={24} />
      </div>
      <h2 className="text-xl font-black">{title}</h2>
    </div>
    <div className="space-y-3 text-sm font-medium text-muted-foreground leading-relaxed" dir="rtl">
      {children}
    </div>
  </motion.div>
);

export default function Rules() {
  return (
    <div className="max-w-3xl mx-auto pb-24 px-4 pt-4" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="text-primary" size={32} />
        <h1 className="text-3xl font-black">חוקי הפורמט והאפליקציה</h1>
      </div>

      {/* חלק 1: ניקוד */}
      <RuleSection icon={Trophy} title="שיטת הניקוד" color="bg-yellow-500/10 text-yellow-600">
        <div className="space-y-4">
          <div>
            <h3 className="text-foreground font-black mb-2 flex items-center gap-2">
              ⚽ שלב הבתים עד רבע הגמר:
            </h3>
            <ul className="list-disc list-inside space-y-1 pr-2">
              <li><span className="text-foreground font-bold">3 נקודות:</span> פגיעה בתוצאה המדויקת (בול פגיעה).</li>
              <li><span className="text-foreground font-bold">1 נקודה:</span> פגיעה בכיוון המשחק (ניצחון/תיקו).</li>
            </ul>
          </div>
          
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
            <h3 className="text-primary font-black mb-2 flex items-center gap-2">
              🔥 חצי גמר וגמר (ניקוד כפול):
            </h3>
            <ul className="list-disc list-inside space-y-1 pr-2">
              <li><span className="text-foreground font-bold">6 נקודות:</span> פגיעה בתוצאה המדויקת.</li>
              <li><span className="text-foreground font-bold">3 נקודות:</span> פגיעה בכיוון המשחק (ניצחון/תיקו).</li>
            </ul>
          </div>
        </div>
      </RuleSection>

      {/* חלק 2: שובר שוויון */}
      <RuleSection icon={Scale} title="שוברי שוויון בטבלה" color="bg-cyan-500/10 text-cyan-600">
        <p className="mb-2">במידה ושני שחקנים או יותר מסיימים עם אותו מספר נקודות, המערכת תכריע לפי הסדר הבא:</p>
        <ol className="list-decimal list-inside space-y-2 pr-2">
          <li><span className="text-foreground font-bold">כמות "בול פגיעה":</span> מי שפגע ביותר תוצאות מדויקות.</li>
          <li><span className="text-foreground font-bold">מאזן פנימי (ראש בראש):</span> אם יש עדיין שוויון, המערכת תבדוק את היסטוריית העימותים (Arena) בין אותם שחקנים ספציפיים. מי שניצח יותר פעמים את השני בעימותים הישירים - ידורג גבוה יותר!</li>
        </ol>
      </RuleSection>

      {/* חלק 3: זירת העימות */}
      <RuleSection icon={Swords} title="זירת העימות (The Arena)" color="bg-rose-500/10 text-rose-600">
        <p>מדי יום המערכת מגרילה לכם "יריב יומי" מהקבוצה, איתו תתמודדו ראש בראש על משחקי אותו יום.</p>
        <ul className="list-disc list-inside space-y-2 pr-2 mt-2">
          <li>מי שצובר יותר נקודות באותו יום מול היריב שלו, מנצח את העימות וזוכה ב-<span className="text-foreground font-bold">נקודת בונוס (1)</span> שמתווספת לטבלה הכללית.</li>
          <li><span className="text-foreground font-bold underline">חשוב:</span> ניתן לתקוף באמצעות קלפים אך ורק את היריב היומי שלכם באותו יום!</li>
        </ul>
      </RuleSection>

      {/* חלק 4: פיצ'רים חברתיים - רוסט וטראש טוק */}
      <RuleSection icon={Flame} title="זירת ה-Roasts והטראש-טוק" color="bg-red-500/10 text-red-600">
        <div className="space-y-4">
          <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/20">
            <h3 className="text-red-600 font-black flex items-center gap-1 mb-1">
              🔥 העלאה למוקד (Roasts)
            </h3>
            מצאתם חבר שמתנשא, מהמר מוזר או סתם מעצבן אתכם? אתם יכולים לפתוח עליו עמוד Roast בזירה. 
            <br/><span className="text-foreground font-bold">איך זה עובד?</span> ברגע שיש 5 חתימות (הצבעות) מאנשים שונים בקבוצה נגד אותו חבר, האפליקציה תשלח הודעת התראה בצ'אט הכללי כדי שכולם ידעו שהוא חוטף אש.
          </div>
          <div className="bg-muted p-3 rounded-xl border border-border">
            <h3 className="text-foreground font-black flex items-center gap-1 mb-1">
              💬 כפתורי הטראש-טוק
            </h3>
            בטבלת המובילים (ליד הניקוד של כל שחקן) תמצאו כפתור עם אייקון של אש (🔥). לחיצה עליו תאפשר לכם לשלוח לאותו שחקן עקיצה אישית שתופיע לו ולכולם בצ'אט.
          </div>
        </div>
      </RuleSection>

      {/* חלק 5: בינה מלאכותית */}
      <RuleSection icon={BrainCircuit} title="כלי בינה מלאכותית (AI) באפליקציה" color="bg-indigo-500/10 text-indigo-600">
        <p className="mb-3">האפליקציה מחוברת ל-Gemini AI שמנתח את הטורניר בזמן אמת. תמצאו באפליקציה 3 כלי AI:</p>
        <ul className="list-disc list-inside space-y-3 pr-2">
          <li>
            <span className="text-foreground font-bold">האורקל (Oracle):</span> במסך המשחקים תמצאו את האורקל. הוא מנתח יחסי כוחות נטו (בלי יתרון ביתיות) ונותן לכם את ההסתברויות לניצחון, תיקו, או הפסד לכל משחק, כולל המלצת תוצאה מדויקת.
          </li>
          <li>
            <span className="text-foreground font-bold">עיתון הבוקר (Morning Paper):</span> בכל כניסה לדשבורד, ה-AI כותב לכם עיתון יומי שובב שמסכם את הפאדיחות של אתמול, מי מוביל בטבלה, ואת המשחקים שמחכים לכם היום.
          </li>
          <li>
            <span className="text-foreground font-bold">ניתוח פרופיל (Profile Analysis):</span> לחיצה על כל שחקן בטבלת המובילים תפתח את הפרופיל שלו, שם ה-AI ינתח באכזריות את אסטרטגיית ההימורים שלו (האם הוא שמרן, מהמר על תיקו, או סתם זורק ניחושים).
          </li>
        </ul>
      </RuleSection>

      {/* חלק 6: קלפי תקיפה */}
      <RuleSection icon={Zap} title="קלפי תקיפה והגנה" color="bg-purple-500/10 text-purple-600">
        <p className="mb-4">
          הקלפים הם הנשק הסודי שלכם. ניתן להשתמש בהם פעם אחת ביום לכל סוג, 
          <span className="text-red-500 font-black underline mx-1">אך ורק עד שלב רבע הגמר (כולל)</span>.
        </p>
        
        <div className="grid gap-4">
          <div className="bg-muted/50 p-3 rounded-xl border border-border">
            <span className="text-red-600 font-black flex items-center gap-1 mb-1">
              ⚔️ היפוך תוצאה (Result Flip)
            </span>
            הופך את הניחוש של היריב. אם הוא הימר 2-0 לטובת קבוצה א', זה הופך ל-2-0 לטובת קבוצה ב'.
          </div>
          <div className="bg-muted/50 p-3 rounded-xl border border-border">
            <span className="text-purple-600 font-black flex items-center gap-1 mb-1">
              ⚔️ חסימת מדויק (Block Exact)
            </span>
            מונע מהיריב לקבל ניקוד על תוצאה מדויקת (במקרה הטוב הוא יקבל רק נקודה אחת על כיוון המשחק).
          </div>
          <div className="bg-green-500/10 text-green-700 p-3 rounded-xl border border-green-500/20">
            <span className="font-black flex items-center gap-1 mb-1">
              🛡️ מגן (Shield)
            </span>
            הקלף היחיד שמבטל תקיפה שבוצעה עליכם (מחזיר את הניחוש שלכם למקור).
          </div>
        </div>
      </RuleSection>

      {/* חלק 7: קלפי בונוס */}
      <RuleSection icon={Star} title="קלפי בונוס אישיים" color="bg-blue-500/10 text-blue-600">
        <p className="mb-4">
          גם קלפים אלו ניתנים לשימוש 
          <span className="text-red-500 font-black underline mx-1">רק עד סוף שלב רבע הגמר</span>:
        </p>
        <div className="grid gap-4">
          <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/20">
            <span className="text-blue-600 font-black flex items-center gap-1 mb-1">
              🔄 שינוי תוצאה (Score Change)
            </span>
            מאפשר לשנות את ההימור שלכם גם לאחר תחילת המשחק (עד הדקה ה-50 של המשחק).
          </div>
          <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/20">
            <span className="text-blue-600 font-black flex items-center gap-1 mb-1">
              🌍 בלי קשר לקבוצה (Team Agnostic)
            </span>
            הניחוש שלכם יתפוס לכל תוצאה זהה! אם הימרתם 2-1 לצרפת, והמשחק נגמר 2-1 אבל לטובת אנגליה, תקבלו ניקוד מלא כאילו פגעתם בול.
          </div>
        </div>
      </RuleSection>

      {/* חלק 8: זמנים */}
      <RuleSection icon={Clock} title="זמני הימורים ושימוש בקלפים" color="bg-orange-500/10 text-orange-600">
        <ul className="list-disc list-inside space-y-2 pr-2">
          <li><span className="text-foreground font-bold">נעילת הימורים:</span> 4 שעות בדיוק לפני שריקת הפתיחה של כל משחק (למעט אם השתמשתם בקלף שינוי תוצאה).</li>
          <li><span className="text-foreground font-bold">תפוגת קלפים:</span> עם שריקת הסיום של רבע הגמר האחרון, כל הקלפים (תקיפה, הגנה ובונוס) יימחקו מהמערכת. אל תשאירו אותם בכיס!</li>
        </ul>
      </RuleSection>

      <div className="text-center text-muted-foreground text-xs font-bold py-8 border-t border-dashed border-border">
        מונדיאל 2026 - מי שמתערב, משפיע! 🚜🏆
      </div>
    </div>
  );
}