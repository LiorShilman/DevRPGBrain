export default function HelpPage() {
  return (
    <div className="page help-page" dir="rtl">
      <div className="page-header">
        <div>
          <h1 className="page-title">מדריך השימוש</h1>
          <p className="page-subtitle">כל הפיצ׳רים של DevRPG Brain במקום אחד</p>
        </div>
      </div>

      <div className="help-intro">
        <p className="help-intro-text">
          <strong>DevRPG Brain</strong> הוא מוח שני דיגיטלי למפתחים — הוא זוכר מה עשית, מנתח את הפרויקטים שלך,
          ועוזר לך לחזור לקוד בדיוק מהנקודה שעצרת. בנוסף, כל עבודה אמיתית מתורגמת לנקודות XP, רמות, והישגים.
        </p>
      </div>

      <div className="help-grid">

        <div className="help-card">
          <div className="help-card-icon">◫</div>
          <div className="help-card-body">
            <h2 className="help-card-title">ניהול פרויקטים</h2>
            <p className="help-card-desc">
              הוסף תיקיות מקומיות מהמחשב שלך כפרויקטים. המערכת מזהה אוטומטית את שפת התכנות,
              הפריימוורק, וסטטוס Git.
            </p>
            <ul className="help-list">
              <li><span className="help-key">+ Add Project</span> — הוסף תיקיית פרויקט קיימת</li>
              <li><span className="help-key">⎇</span> — סרוק Git: branch, commits, שינויים</li>
              <li><span className="help-key">⊞</span> — סרוק קבצים: זיהוי stack, ספירת TODO/FIXME</li>
              <li><span className="help-key">✕</span> — העבר פרויקט לארכיון</li>
            </ul>
          </div>
        </div>

        <div className="help-card">
          <div className="help-card-icon">▶</div>
          <div className="help-card-body">
            <h2 className="help-card-title">סשן עבודה</h2>
            <p className="help-card-desc">
              תעד כל ישיבת עבודה — מתי התחלת, כמה זמן עבדת, ומה עשית. בסוף כל סשן המערכת שואלת
              אותך 3 שאלות ומייצרת סיכום AI.
            </p>
            <ul className="help-list">
              <li><span className="help-key">▶ Session</span> — התחל סשן עבודה חדש</li>
              <li>טיימר פועל בזמן אמת על הקארד</li>
              <li><span className="help-key">■ End</span> — סיים סשן + ענה על 3 שאלות</li>
              <li>הסשן נשמר עם משך זמן, הערות, חסמים, וצעדים הבאים</li>
            </ul>
          </div>
        </div>

        <div className="help-card">
          <div className="help-card-icon">▶ Continue</div>
          <div className="help-card-body">
            <h2 className="help-card-title">כרטיס המשך</h2>
            <p className="help-card-desc">
              כשחוזרים לפרויקט אחרי הפסקה, מוצג כרטיס כחול עם הסיכום מהסשן הקודם — כך
              לא מאבדים קונטקסט.
            </p>
            <ul className="help-list">
              <li>מציג מתי הסשן האחרון התרחש</li>
              <li>סיכום AI של מה שנעשה</li>
              <li>הצעד הבא שרשמת בסוף הסשן</li>
              <li><span className="help-key">▶ Continue</span> — פותח סשן חדש מיד</li>
            </ul>
          </div>
        </div>

        <div className="help-card">
          <div className="help-card-icon">◈</div>
          <div className="help-card-body">
            <h2 className="help-card-title">Project Brain — שאל את ה-AI</h2>
            <p className="help-card-desc">
              לחץ על <strong>◈</strong> בכל פרויקט כדי לפתוח צ׳אט עם AI שיודע הכל על הפרויקט שלך —
              היסטוריית הסשנים, חסמים, צעדים הבאים, ובריאות הפרויקט.
            </p>
            <ul className="help-list">
              <li>שאל "על מה עבדתי בפעם האחרונה?"</li>
              <li>שאל "מה הצעד הבא שהמלצתי לעצמי?"</li>
              <li>שאל "מה הסיכונים בפרויקט הזה?"</li>
              <li>הצ׳אט שומר היסטוריה בתוך המודאל</li>
            </ul>
          </div>
        </div>

        <div className="help-card">
          <div className="help-card-icon">⚔</div>
          <div className="help-card-body">
            <h2 className="help-card-title">מערכת ה-RPG</h2>
            <p className="help-card-desc">
              כל פעולה אמיתית מתורגמת לנקודות XP. XP צובר רמות, ורמות מפתחות הישגים.
              הפרופיל שלך מוצג בתחתית הסיידבר ובעמוד ה-RPG.
            </p>
            <ul className="help-list">
              <li><strong>XP בסיסי:</strong> 5 נקודות לכל סשן</li>
              <li><strong>זמן:</strong> +1 XP לכל דקה (עד 60)</li>
              <li><strong>הערות:</strong> +5 XP אם כתבת מה עשית</li>
              <li><strong>חסמים:</strong> +3 XP לכל חסם (עד 15)</li>
              <li><strong>צעדים הבאים:</strong> +2 XP לכל אחד (עד 10)</li>
              <li><strong>נוסחת רמה:</strong> <code>√(XP ÷ 100) + 1</code></li>
            </ul>
          </div>
        </div>

        <div className="help-card">
          <div className="help-card-icon">🏆</div>
          <div className="help-card-body">
            <h2 className="help-card-title">הישגים</h2>
            <p className="help-card-desc">
              הישגים נפתחים אוטומטית בסוף כל סשן כשמתקיים תנאי מסוים. הודעה על הישג חדש
              מוצגת בחלון הסיכום.
            </p>
            <ul className="help-list">
              <li><strong>First Blood</strong> — סשן ראשון</li>
              <li><strong>Marathon</strong> — סשן של 2+ שעות</li>
              <li><strong>Night Owl</strong> — עבודה אחרי חצות</li>
              <li><strong>Early Bird</strong> — עבודה לפני 7 בבוקר</li>
              <li><strong>Streak Master</strong> — 3 ימים ברצף</li>
              <li><strong>Blocker Slayer</strong> — 5 חסמים בסשן אחד</li>
              <li>ועוד 4 הישגים נוספים…</li>
            </ul>
          </div>
        </div>

        <div className="help-card">
          <div className="help-card-icon">●</div>
          <div className="help-card-body">
            <h2 className="help-card-title">Health Score — בריאות הפרויקט</h2>
            <p className="help-card-desc">
              כל פרויקט מקבל ציון בריאות 0–100 על בסיס 4 פרמטרים. הציון מחושב מחדש בסוף כל סשן.
            </p>
            <div className="help-health-grid">
              <div className="help-health-item">
                <span className="help-health-dot healthy" />
                <div>
                  <strong>Healthy</strong> ≥ 80
                  <p>פרויקט פעיל ומנוהל היטב</p>
                </div>
              </div>
              <div className="help-health-item">
                <span className="help-health-dot stalled" />
                <div>
                  <strong>Stalled</strong> 60–79
                  <p>פעיל אך עם עצירות</p>
                </div>
              </div>
              <div className="help-health-item">
                <span className="help-health-dot risky" />
                <div>
                  <strong>Risky</strong> 35–59
                  <p>לא עבדו עליו זמן רב</p>
                </div>
              </div>
              <div className="help-health-item">
                <span className="help-health-dot abandoned" />
                <div>
                  <strong>Abandoned</strong> &lt; 35
                  <p>פרויקט שננטש</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="help-card">
          <div className="help-card-icon">⊞</div>
          <div className="help-card-body">
            <h2 className="help-card-title">Daily Briefing — בריפינג בוקר</h2>
            <p className="help-card-desc">
              עמוד ה-Dashboard מציג כרטיס בריפינג יומי שנוצר על ידי AI — עם המלצה על הפרויקט
              שהכי צריך תשומת לב היום.
            </p>
            <ul className="help-list">
              <li><strong>Today's Focus</strong> — הפרויקט המומלץ</li>
              <li><strong>Why</strong> — למה דווקא הוא?</li>
              <li><strong>Risk</strong> — מה יקרה אם תתעלם ממנו</li>
              <li><strong>Suggested Action</strong> — מה לעשות קודם</li>
              <li><strong>XP Opportunity</strong> — כמה XP אפשר לצבור היום</li>
            </ul>
          </div>
        </div>

        <div className="help-card">
          <div className="help-card-icon">⚙</div>
          <div className="help-card-body">
            <h2 className="help-card-title">הגדרות — AI Provider</h2>
            <p className="help-card-desc">
              בחר איזה AI מפעיל את הסיכומים, הבריפינג, וצ׳אט ה-Brain. המפתח נשמר מקומית בלבד.
            </p>
            <ul className="help-list">
              <li><strong>Mock</strong> — ללא AI, מיועד לפיתוח ובדיקות</li>
              <li><strong>OpenAI:</strong> gpt-5.5 · gpt-5.4 · gpt-5.4-mini · gpt-5.4-nano</li>
              <li><strong>Claude:</strong> claude-opus-4-7 · claude-sonnet-4-6 · claude-haiku-4-5</li>
              <li>לוחצים על שם המודל בהגדרות כדי לבחור אותו מיד</li>
              <li>המפתח נשמר <strong>מקומית בלבד</strong> — לא נשלח לשרת חיצוני</li>
            </ul>
          </div>
        </div>

      </div>

      <div className="help-footer">
        <p>DevRPG Brain v0.1 · נבנה עם Electron + React + Prisma + Express</p>
      </div>
    </div>
  )
}
