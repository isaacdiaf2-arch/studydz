# خطة استقلال Study DZ عن Supabase (تخطيط فقط)

## 1. حصر الاعتماد الحالي (من الكود الفعلي)

| المجال | أين | الحجم |
|---|---|---|
| SDK | `@supabase/supabase-js`، عملاء `src/integrations/supabase/*` (client, client.server, auth-middleware, auth-attacher, previewAuthStorage, types) | 52 ملفًا تستورد supabase |
| Auth (متصفح) | `signInWithPassword` في `auth.tsx`, `register.tsx`, `trial.tsx`؛ `getUser()` في `_authenticated/route.tsx`, `DashboardShell.tsx`, `account.ts`, `institution.tsx`, `SchedulesManager.tsx`, `TeacherAssessmentsPanel.tsx` | جلسة في localStorage |
| Auth (خادم/admin) | `auth.admin.createUser/updateUserById/deleteUser/listUsers` في `signup`, `platform`, `demo`, `vault`, `auth.functions.ts`؛ إعادة تحقق كلمة المرور في `official-contract.functions.ts` | 19 ملف server fn يستخدم `requireSupabaseAuth` |
| قاعدة البيانات عبر PostgREST | `.from()/.rpc()` في كل `src/lib/*.functions.ts` (أكبرها assessment 42، platform 25، official-contract 24) | استدعاءات مباشرة من المتصفح أيضًا: SchedulesManager (8)، institution (4)، teacher (3)، student/AssessmentsPanel (2)، admin/Licenses/TeacherAssessments (1) |
| RLS + دوال SQL | ~45 جدولًا بسياسات تعتمد `auth.uid()`؛ دوال `has_role`, `manages_institution`, `teaches_*`, `is_group_member`, `transition_official_contract` (تقرأ `auth.uid()` أو `_actor`) ومشغلات `log_table_activity`, `guard_*` | العزل بين المؤسسات قائم أساسًا على RLS |
| مشغّل auth.users | `on_auth_user_created → handle_new_user` | ينشئ profiles |
| Storage | دلوان خاصان `institution-media`, `payment-proofs` (register, subscribe, institution, admin) | روابط موقّعة |
| Edge Functions | `supabase/functions/expire-subscriptions` (يستدعي `expire_subscriptions()`) | مهمة مجدولة |
| Realtime | لا استخدام | — |
| Migrations | مزدوجة: `supabase/migrations/*` (21) و`drizzle/migrations/0000–0012`؛ `drizzle/schema.ts` فارغ عمليًا (سطر واحد) | لا مخطط Drizzle حقيقي |
| Types | `src/integrations/supabase/types.ts` مولّد | مستخدم في كل مكان |
| Env | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_*`, `LOVABLE_DB_MIGRATION_URL` | |
| أخرى | MCP OAuth (`src/lib/mcp/supabase.ts`, صفحة consent) مبني على Supabase OAuth server | سيتطلب بديلًا أو إيقافًا |
| Adapter | `src/server/db/adapter.ts` يعيد `supabaseAdmin` (شريحة الاختبارات فقط) | نقطة البداية |

## 2. التدفق الحالي

```text
المتصفح ──signInWithPassword──> Supabase Auth ──JWT──> localStorage
   │                                         
   ├─ supabase.from(...) مباشرة ──> PostgREST ──RLS(auth.uid())──> Postgres
   └─ server fn + Bearer (attachSupabaseAuth)
          └─ requireSupabaseAuth ──> context.supabase (RLS كمستخدم)
                                └─> supabaseAdmin (يتجاوز RLS) للعمليات المميزة
الأدوار: public.user_roles + has_role(); 2FA: user_mfa/totp.functions (خاص بالتطبيق)
```

## 3. البنية المستقلة المقترحة

| الوظيفة | الخيار A (موصى به) | الخيار B |
|---|---|---|
| PostgreSQL | Neon (منطقة Frankfurt) — مجاني محدود (~0.5GB، توقف عند الخمول)، المدفوع من ~19$/شهر | Railway Postgres (~5$+ استهلاكي، لا مجاني دائم) |
| API/runtime | Cloudflare Workers (القالب الحالي يستهدفه أصلًا) — مجاني 100k طلب/يوم، مدفوع 5$/شهر | Railway/Render خادم Node (~7$/شهر) |
| Auth/sessions | Better Auth داخل التطبيق + Drizzle adapter، جلسات cookie httpOnly، يدعم bcrypt و2FA | Lucia-style يدوي أو Clerk (تكلفة لكل مستخدم + بيانات خارج سيطرتك) |
| Object storage | Cloudflare R2 — مجاني 10GB، بلا رسوم خروج | Backblaze B2 / S3 |
| Email | Resend (مجاني 3000/شهر، يتطلب نطاقًا موثقًا) | Brevo |
| Jobs/backups | Cloudflare Cron Triggers + GitHub Actions يومي `pg_dump` مشفّر إلى R2 | Railway cron |

التوصية: الخيار A. السبب: لا تغيير في runtime (Workers)، Drizzle + `postgres`/Neon serverless driver يعملان على Workers، Better Auth مكتبة TypeScript داخل الكود (لا مزود هوية خارجي جديد)، R2 متوافق S3 ورخيص لأوروبا القريبة من الجزائر. المخاطر: لا شيء مجاني للأبد؛ Neon المجاني يتوقف عند الخمول (يُنصح بالمدفوع للإنتاج)، والكمون من الجزائر إلى Frankfurt ~40–60ms مقبول.

قيد مهم يجب معرفته: Lovable Cloud لا يمكن فصله عن المشروع، ومعاينة المحرر والنشر على lovable.app ستبقى مرتبطة به؛ الاستقلال الحقيقي يعني نشر الإنتاج على Cloudflare بحسابك (نطاق خاص) وتصدير الكود عبر GitHub، مع بقاء Cloud احتياطيًا حتى ينتهي rollback.

## 4. المراحل

**المرحلة 0 — يمكن تنفيذها الآن (بلا حسابات):**
- توليد `drizzle/schema.ts` كامل من القاعدة الحالية (introspect) ليصبح مصدر الحقيقة؛ دمج سجلي migrations في خط Drizzle واحد.
- توسيع `src/server/db/adapter.ts` إلى واجهة Drizzle (`getDb()`) مع بقاء التنفيذ الحالي.
- نقل استدعاءات `.from()` المباشرة من المتصفح (SchedulesManager, institution, teacher, student, AssessmentsPanel, Licenses, admin, TeacherAssessmentsPanel) إلى server functions.
- كتابة اختبارات RBAC/tenant isolation على مستوى الخدمات (Vitest) تعمل على أي مزود.
- استبدال `getUser()` المتفرق بـ hook واحد `useSession()`.
ملفات: drizzle/*, src/server/**, src/lib/*.functions.ts, المكونات المذكورة، src/hooks.

**المرحلة 1 — تجهيز البنية (يتطلب منك إنشاء حسابات):** Neon, Cloudflare (Workers + R2), Resend + نطاق، GitHub. تضع المفاتيح في حقول الأسرار لدى كل مزود فقط، لا في المحادثة.

**المرحلة 2 — نقل طبقة البيانات إلى Drizzle:** إعادة كتابة كل `*.functions.ts` و`quiz.repository.ts` لاستخدام Drizzle عبر adapter، مع حارس خادمي إلزامي `requireTenant(ctx, institutionId)` و`requireRole()` في كل خدمة بدل RLS. تحويل الدوال التي تقرأ `auth.uid()` لتأخذ `_actor` صريحًا (مثل `transition_official_contract`). الإبقاء على المشغلات والقيود في Postgres كدفاع ثانٍ.

**المرحلة 3 — Auth:** Better Auth بجداول `user/session/account` مرتبطة بـ `profiles.id` نفسه. كلمات المرور: تُصدّر تجزئات bcrypt من `auth.users.encrypted_password` بخادم آمن وتُستورد كما هي (لا تُكشف ولا تُفك)؛ إن تعذر، إرسال رابط إعادة تعيين لكل مستخدم. نقل `user_mfa`، تسجيل الدخول برقم الهاتف لمدير المنصة، إعادة التحقق قبل توقيع العقد. ملفات: auth.tsx, register.tsx, trial.tsx, _authenticated/route.tsx, start.ts, signup/platform/demo/vault/auth/official-contract functions, DashboardShell.

**المرحلة 4 — Storage والمهام:** نسخ الدلوين إلى R2 بسكربت مع مقارنة عدد الملفات وSHA-256، روابط موقعة من الخادم؛ استبدال edge function بـ Cron Trigger؛ نسخ احتياطي يومي.

**المرحلة 5 — نقل البيانات والتحقق:** `pg_dump --schema=public` → Neon؛ مقارنة `count(*)` و`md5(string_agg(...))` لكل جدول؛ تجربة كاملة على بيئة staging.

**المرحلة 6 — Cutover/rollback:** تجميد الكتابة (وضع صيانة قصير)، مزامنة نهائية، تبديل DNS للنطاق، مراقبة 72 ساعة. Rollback: إعادة DNS إلى النسخة الحالية التي تبقى سليمة دون حذف؛ الإيقاف النهائي لـ Supabase SDK وحذف `src/integrations/supabase` والحزمة فقط بعد 30 يومًا مستقرة.

## 5. اختبارات القبول لكل مرحلة
- طالب لا يرى فوجًا آخر، أستاذ لا يصل لمادة أخرى، مدير مؤسسة لا يصل لمؤسسة أخرى ← 403.
- تسجيل دخول كل دور بكلمة المرور القديمة نفسها + 2FA.
- العقود: الهاش وPDF المحفوظ يطابقان قبل/بعد النقل.
- أعداد الصفوف والملفات وchecksums متطابقة 100%.
- TypeScript/build نظيف، لا استيراد لـ `@supabase` بعد المرحلة 6.

## 6. ما هو متاح الآن مقابل ما يحتاجك
- الآن: المرحلة 0 كاملة (تقلل الاعتماد دون أي تغيير مزود)، وأقترح البدء بها على دفعات صغيرة.
- يحتاجك: إنشاء حسابات Neon/Cloudflare/Resend/GitHub، شراء نطاق، قرار مصير ميزة MCP (تعتمد على OAuth الحالي)، وتحمل التكلفة الشهرية المتوقعة (~25–35$ للإنتاج).

## ترتيب التنفيذ المقترح
0 → 1 → 2 (حسب الجداول: الاختبارات، الحضور، الأكاديمي، العقود، المنصة) → 3 → 4 → 5 → 6.
