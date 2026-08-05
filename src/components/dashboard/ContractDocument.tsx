import logo from "@/assets/studydz-logo.png.asset.json";

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  created: "🟡 تم الإنشاء",
  awaiting_institution: "🟠 بانتظار توقيع المؤسسة",
  awaiting_platform: "🟡 بانتظار توقيع Study DZ",
  approved: "🟢 عقد معتمد",
  renewed: "🔵 تم التجديد",
  expired: "🔴 منتهي",
  cancelled: "⚫ ملغى",
};

export type ContractSnapshot = {
  institution_name?: string;
  institution_type?: string;
  wilaya?: string;
  commune?: string;
  address?: string;
  commercial_register?: string;
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
  amount?: number;
  duration_months?: number;
};

export type ContractRow = {
  id: string;
  contract_number: string | null;
  status: string;
  amount: number;
  duration_months: number;
  body: string;
  snapshot: unknown;
  institution_signature: string | null;
  platform_signature: string | null;
  institution_signed_at: string | null;
  platform_signed_at: string | null;
  approved_at: string | null;
  expires_at: string | null;
  qr_payload: string | null;
  created_at: string;
};

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-2 border-b border-dashed border-border py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium break-words">{value || "—"}</span>
    </div>
  );
}

export function ContractDocument({ contract }: { contract: ContractRow }) {
  const s = (contract.snapshot ?? {}) as ContractSnapshot;
  const amount = Number(contract.amount ?? 7000).toLocaleString("en-US");

  return (
    <article id={`contract-${contract.id}`} className="space-y-5 bg-background p-1 print:p-6">
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <img src={logo.url} alt="شعار Study DZ" className="h-14 w-14 object-contain" />
        <div className="min-w-0">
          <h3 className="font-display text-xl font-extrabold">عقد اشتراك منصة Study DZ</h3>
          <p className="text-xs text-muted-foreground">
            رقم العقد: <span dir="ltr">{contract.contract_number ?? "—"}</span> · تاريخ الإنشاء:{" "}
            {new Date(contract.created_at).toLocaleDateString("fr-DZ")}
          </p>
        </div>
        <span className="ms-auto shrink-0 rounded-md bg-secondary px-2 py-1 text-xs">
          {CONTRACT_STATUS_LABEL[contract.status] ?? contract.status}
        </span>
      </header>

      <section>
        <h4 className="text-sm font-bold">الطرف الأول: إدارة منصة Study DZ</h4>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">
          منصة سحابية جزائرية لإدارة التعليم والتعلم — جميع المراسلات تتم داخل المنصة.
        </p>
      </section>

      <section>
        <h4 className="text-sm font-bold">الطرف الثاني: المؤسسة المشتركة</h4>
        <div className="mt-2">
          <Row label="🏫 اسم المؤسسة" value={s.institution_name} />
          <Row label="🏢 نوع المؤسسة" value={s.institution_type} />
          <Row label="📍 الولاية" value={s.wilaya} />
          <Row label="🏙 البلدية" value={s.commune} />
          <Row label="📌 العنوان" value={s.address} />
          <Row label="🪪 السجل التجاري" value={s.commercial_register} />
          <Row label="👤 مدير المؤسسة" value={s.manager_name} />
          <Row label="📧 البريد الإلكتروني" value={s.manager_email} />
          <Row label="📱 رقم الهاتف" value={s.manager_phone} />
        </div>
      </section>

      <section>
        <h4 className="text-sm font-bold">بنود العقد</h4>
        <ol className="mt-2 list-decimal space-y-2 ps-5 text-sm leading-7 text-muted-foreground">
          <li>
            تلتزم منصة Study DZ بتوفير حساب مؤسسة كامل يشمل لوحات تحكم للمدير والأساتذة والطلاب،
            وإدارة الأقسام والمواد والدروس والاختبارات والنتائج.
          </li>
          <li>
            مدة الاشتراك {contract.duration_months ?? 12} شهرًا ابتداءً من تاريخ اعتماد العقد وتفعيل
            الحساب.
          </li>
          <li>قيمة الاشتراك السنوي {amount} دج تُدفع عبر الحساب البريدي الجاري (CCP).</li>
          <li>
            تلتزم المؤسسة بصحة البيانات المدخلة، وبعدم مشاركة حسابات الدخول مع أطراف خارج المؤسسة.
          </li>
          <li>
            بيانات كل مؤسسة معزولة تمامًا، ولا يمكن لأي مؤسسة أخرى الاطلاع عليها؛ وتلتزم المنصة
            بالحفاظ على سرية المعطيات وإجراء نسخ احتياطية دورية.
          </li>
          <li>
            يمكن تجديد العقد بعد نهاية المدة، كما يمكن إيقافه في حال مخالفة سياسة الاستخدام أو عدم
            تسديد الاشتراك.
          </li>
          <li>يُعتبر التوقيع الإلكتروني للطرفين ملزمًا وله نفس قيمة التوقيع الخطي.</li>
        </ol>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <SignatureBlock
          title="✍ توقيع مدير المؤسسة"
          value={contract.institution_signature}
          at={contract.institution_signed_at}
        />
        <SignatureBlock
          title="✍ توقيع مدير منصة Study DZ"
          value={contract.platform_signature}
          at={contract.platform_signed_at}
        />
      </section>

      {contract.qr_payload && (
        <section className="flex items-center gap-4 rounded-lg border border-border p-3">
          <img
            alt="رمز التحقق من العقد"
            className="h-28 w-28"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(contract.qr_payload)}`}
          />
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">🔳 رمز التحقق</p>
            <p className="mt-1" dir="ltr">
              {contract.qr_payload}
            </p>
            {contract.expires_at && <p className="mt-1">صلاحية العقد إلى غاية {contract.expires_at}</p>}
          </div>
        </section>
      )}
    </article>
  );
}

function SignatureBlock({
  title,
  value,
  at,
}: {
  title: string;
  value: string | null;
  at: string | null;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-semibold">{title}</p>
      {value ? (
        <>
          <img src={value} alt={title} className="mt-2 h-24 w-full object-contain" />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {at ? new Date(at).toLocaleString("fr-DZ") : ""}
          </p>
        </>
      ) : (
        <p className="mt-6 text-center text-xs text-muted-foreground">لم يتم التوقيع بعد</p>
      )}
    </div>
  );
}
