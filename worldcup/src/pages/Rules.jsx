import { motion } from 'framer-motion';
import { BookOpen, Trophy, Zap, Swords, Clock, ShieldCheck } from 'lucide-react';

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
        <p>על כל משחק שתהמרו עליו, תוכלו לצבור נקודות לפי הדיוק שלכם:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><span className="text-foreground font-bold">3 נקודות:</span> פגיעה בתוצאה המדויקת (בול פגיעה!).</li>
          <li><span className="text-foreground font-bold">1 נקודה:</span> פגיעה בכיוון המשחק (ניצחון/תיקו) אך לא בתוצאה המדויקת.</li>
          <li><span className="text-foreground font-bold">0 נקודות:</span> טעות מוחלטת בניחוש.</li>
        </ul>
      </RuleSection>

      <RuleSection icon={Zap} title="קלפי תקיפה והגנה" color="bg-purple-500/10 text-purple-600">
        <p>הקלפים הם הנשק הסודי שלכם. ניתן להשתמש בהם פעם אחת ביום לכל סוג:</p>
        <div className="grid gap-4 mt-4">
          <div className="bg-muted/50 p-3 rounded-xl border border-border">
            <span className="text-red-600 font-black flex items-center gap-1 mb-1">
              <Zap size={14} /> היפוך תוצאה (Result Flip)
            </span>
            הופך את הניחוש של היריב. אם הוא הימר 2-0 לבית, זה הופך ל-2-0 לחוץ.
          </div>
          <div className="bg-muted/50 p-3 rounded-xl border border-border">
            <span className="text-purple-600 font-black flex items-center gap-1 mb-1">
              <Zap size={14} /> חסימת מדויק (Block Exact)
            </span>
            גם אם היריב פגע בתוצאה המדויקת, הוא יקבל רק נקודה אחת (של כיוון).
          </div>
          <div className="bg-green-500/10 text-green-700 p-3 rounded-xl border border-green-500/20">
            <span className="font-black flex items-center gap-1 mb-1">
              <ShieldCheck size={14} /> מגן (Shield)
            </span>
            הקלף היחיד שיכול לבטל תקיפה שבוצעה עליכם. זרקו אותו על המשחק שבו הותקפתם כדי לחזור לניחוש המקורי.
          </div>
        </div>
      </RuleSection>

      <RuleSection icon={Swords} title="זירת העימות (Arena)" color="bg-red-500/10 text-red-600">
        <p>מדי יום המערכת מגרילה לכם "יריב יומי" מהקבוצה. העימות נמשך מ-10:00 בבוקר ועד 10:00 בבוקר למחרת.</p>
        <ul className="list-disc list-inside space-y-2">
          <li>מי שצובר יותר נקודות באותו יום מול היריב שלו, זוכה ב-<span className="text-foreground font-bold">2 נקודות בונוס</span> בטבלה הכללית.</li>
          <li>ניתן לתקוף בקלפים רק את היריב שמוגרל לכם באותו יום.</li>
        </ul>
      </RuleSection>

      <RuleSection icon={Clock} title="זמני הימורים" color="bg-blue-500/10 text-blue-600">
        <ul className="list-disc list-inside space-y-2">
          <li><span className="text-foreground font-bold">נעילת הימורים:</span> לא ניתן לשנות או להזין הימור פחות מ-4 שעות לפני שריקת הפתיחה.</li>
          <li><span className="text-foreground font-bold">שינוי תוצאה חי:</span> אם יש לכם קלף "שינוי תוצאה", תוכלו להשתמש בו עד לדקה ה-50 של המשחק (למקרה שקלטתם לאן נושבת הרוח).</li>
        </ul>
      </RuleSection>

      <div className="text-center text-muted-foreground text-xs font-bold py-8 border-t border-dashed border-border">
        מונדיאל 2026 - מי שמתערב, משפיע! 🚜🏆
      </div>
    </div>
  );
}