import { motion } from 'framer-motion';
import { BookOpen, Trophy, Zap, Swords, Clock, ShieldCheck, Star } from 'lucide-react';

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
    <div className="space-y-3 text-sm font-medium text-muted-foreground leading-relaxed">
      {children}
    </div>
  </motion.div>
);

export default function Rules() {
  return (
    <div className="max-w-3xl mx-auto pb-24 px-4 pt-4">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="text-primary" size={32} />
        <h1 className="text-3xl font-black">חוקי הפורמט</h1>
      </div>

      <RuleSection icon={Trophy} title="שיטת הניקוד" color="bg-yellow-500/10 text-yellow-600">
        <div className="space-y-4">
          <div>
            <h3 className="text-foreground font-black mb-2 flex items-center gap-2">
              ⚽ שלב הבתים עד רבע הגמר:
            </h3>
            <ul className="list-disc list-inside space-y-1 pr-2">
              <li><span className="text-foreground font-bold">3 נקודות:</span> פגיעה בתוצאה המדויקת.</li>
              <li><span className="text-foreground font-bold">1 נקודה:</span> פגיעה בכיוון (ניצחון/תיקו).</li>
            </ul>
          </div>
          
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
            <h3 className="text-primary font-black mb-2 flex items-center gap-2">
              🔥 חצי גמר וגמר (ניקוד כפול!):
            </h3>
            <ul className="list-disc list-inside space-y-1 pr-2">
              <li><span className="text-foreground font-bold">6 נקודות:</span> פגיעה בתוצאה המדויקת.</li>
              <li><span className="text-foreground font-bold">3 נקודות:</span> פגיעה בכיוון (ניצחון/תיקו).</li>
            </ul>
          </div>
        </div>
      </RuleSection>

      <RuleSection icon={Zap} title="קלפי תקיפה והגנה" color="bg-purple-500/10 text-purple-600">
        <p className="mb-4">הקלפים הם הנשק שלכם. ניתן להשתמש בהם פעם אחת ביום לכל סוג, <span className="text-red-500 font-black underline">אך ורק עד שלב רבע הגמר (כולל)</span>. בחצי הגמר והגמר לא ניתן להשתמש בקלפים!</p>
        
        <div className="grid gap-4">
          <div className="bg-muted/50 p-3 rounded-xl border border-border">
            <span className="text-red-600 font-black flex items-center gap-1 mb-1">
              ⚔️ היפוך תוצאה (Result Flip) - תקיפה
            </span>
            הופך את הניחוש של היריב. אם הוא הימר 2-0 לבית, זה הופך ל-2-0 לחוץ.
          </div>
          <div className="bg-muted/50 p-3 rounded-xl border border-border">
            <span className="text-purple-600 font-black flex items-center gap-1 mb-1">
              ⚔️ חסימת מדויק (Block Exact) - תקיפה
            </span>
            מונע מהיריב לקבל ניקוד על תוצאה מדויקת (יקבל רק על כיוון).
          </div>
          <div className="bg-green-500/10 text-green-700 p-3 rounded-xl border border-green-500/20">
            <span className="font-black flex items-center gap-1 mb-1">
              🛡️ מגן (Shield) - הגנה
            </span>
            הקלף היחיד שמבטל תקיפה שבוצעה עליכם. מחזיר את הניחוש שלכם למקור.
          </div>
        </div>
      </RuleSection>

      <RuleSection icon={Star} title="קלפי בונוס אישיים" color="bg-blue-500/10 text-blue-600">
        <p>קלפים אלו משפיעים על הניחוש שלכם בלבד ועוזרים לכם למקסם נקודות:</p>
        <div className="grid gap-4 mt-4">
          <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/20">
            <span className="text-blue-600 font-black flex items-center gap-1 mb-1">
              🔄 שינוי תוצאה (Score Change)
            </span>
            מאפשר לשנות את ההימור שלכם גם לאחר תחילת המשחק (עד הדקה ה-50).
          </div>
          <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/20">
            <span className="text-blue-600 font-black flex items-center gap-1 mb-1">
              🌍 בלי קשר לקבוצה (Team Agnostic)
            </span>
            הניחוש שלכם יתפוס לכל תוצאה! הימרתם 2-1 והמשחק נגמר 2-1 לכל צד? קיבלתם את הניקוד המלא.
          </div>
        </div>
      </RuleSection>

      <RuleSection icon={Swords} title="זירת העימות (Arena)" color="bg-red-500/10 text-red-600">
        <p>מדי יום המערכת מגרילה לכם "יריב יומי" מהקבוצה.</p>
        <ul className="list-disc list-inside space-y-2">
          <li>מי שצובר יותר נקודות באותו יום מול היריב שלו, זוכה ב-<span className="text-foreground font-bold">2 נקודות בונוס</span> בטבלה.</li>
          <li>התקיפות (היפוך וחסימה) ניתנות לביצוע <span className="font-bold">רק נגד היריב היומי שלכם</span>.</li>
        </ul>
      </RuleSection>

      <RuleSection icon={Clock} title="זמני הימורים" color="bg-orange-500/10 text-orange-600">
        <ul className="list-disc list-inside space-y-2">
          <li><span className="text-foreground font-bold">נעילת הימורים:</span> 4 שעות לפני שריקת הפתיחה (מלבד שימוש בקלף שינוי תוצאה).</li>
          <li><span className="text-foreground font-bold">סיום קלפים:</span> עם שריקת הסיום של רבע הגמר האחרון, כל הקלפים שנותרו לכם בתיק יימחקו. השתמשו בהם בחוכמה!</li>
        </ul>
      </RuleSection>

      <div className="text-center text-muted-foreground text-xs font-bold py-8 border-t border-dashed border-border">
        מונדיאל 2026 - מי שמתערב, משפיע! 🚜🏆
      </div>
    </div>
  );
}