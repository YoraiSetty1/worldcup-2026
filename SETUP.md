# 🏆 מונדיאל 2026 - מדריך הגדרה

## מה קיבלת?
אפליקציה מלאה עם:
- ✅ כניסה / הרשמה
- ✅ ניחוש תוצאות משחקים
- ✅ טבלת דירוג
- ✅ זירת עימות יומי
- ✅ קלפי כוח
- ✅ צ'אט קבוצתי
- ✅ פאנל ניהול (passkey: 0000)
- ✅ Push Notifications אמיתיות
- ✅ ניווט תחתון למובייל
- ✅ PWA (ניתן להוסיף למסך הבית)

---

## שלב 1 — הגדרת Supabase (בסיס הנתונים)

1. כנס ל־ **https://supabase.com** והירשם (חינמי)
2. לחץ **"New Project"** → תן שם → בחר סיסמה → **Create Project**
3. המתן ~2 דקות עד שהפרויקט מוכן
4. לחץ על **SQL Editor** (בסרגל שמאל)
5. לחץ **"New query"** → **העתק את כל התוכן מקובץ `supabase/schema.sql`** → לחץ **Run**
6. כנס ל־ **Settings → API**:
   - העתק את **Project URL** → זה `VITE_SUPABASE_URL`
   - העתק את **anon public key** → זה `VITE_SUPABASE_ANON_KEY`

---

## שלב 2 — העלאה ל-GitHub

1. צור חשבון ב־ **https://github.com** אם אין לך
2. צור repository חדש: **"worldcup-2026"**
3. פתח טרמינל בתיקיית הפרויקט:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAME/worldcup-2026.git
git push -u origin main
```

---

## שלב 3 — פריסה ב-Vercel (האתר החי)

1. כנס ל־ **https://vercel.com** והירשם עם GitHub
2. לחץ **"New Project"** → בחר את ה-repository שיצרת
3. לחץ **"Environment Variables"** והוסף:

| שם | ערך |
|----|-----|
| `VITE_SUPABASE_URL` | ה-URL מ-Supabase |
| `VITE_SUPABASE_ANON_KEY` | ה-anon key מ-Supabase |

4. לחץ **Deploy** → המתן ~1 דקה
5. Vercel ייתן לך כתובת כמו: `https://worldcup-2026.vercel.app`

**זו הכתובת שתשלח לחברים!** 🎉

---

## שלב 4 — הגדרת Admin

1. כנס לאפליקציה → הירשם עם המייל שלך
2. כנס ל-Supabase → **Table Editor → profiles**
3. מצא את השורה שלך → ערוך → שנה `is_admin` ל-`true`
4. עכשיו תראה כפתור "ניהול" בתפריט

---

## Push Notifications (אופציונלי)

1. כנס ל: **https://web-push-codelab.glitch.me**
2. לחץ **"Generate"** → העתק את **Public Key**
3. הוסף ל-Vercel Environment Variables:
   - `VITE_VAPID_PUBLIC_KEY` = המפתח הציבורי

---

## שאלות נפוצות

**כמה אנשים יכולים להשתמש?**
עד ~500 משתמשים בחינמי (Supabase free tier).

**האם הנתונים נשמרים?**
כן! הכל ב-Supabase - מאובטח ומגובה.

**איך מעדכן תוצאות?**
דרך פאנל הניהול (קוד: 0000) → "משחקים" → "סיים משחק".

**אפליקציה למובייל?**
כנס לאתר מהנייד → "הוסף למסך הבית" → נראה כמו אפליקציה!
