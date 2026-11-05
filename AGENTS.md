<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Versioned official contracts use separate immutable records and a service-only atomic transition RPC; legacy contracts remain historical and cannot substitute for the official signing workflow.
- Final contract PDF bytes are stored once in an append-only database artifact record, shared by both authorized parties and checked with SHA-256 on download; never regenerate a signed document.
- The uploaded source is embedded unchanged in the final PDF as the authoritative annex; editable fields and authenticated consent evidence are separate from fixed legal clauses.
- Server data access migrates incrementally to UI → hooks (src/hooks) → service (src/server/<area>/*.service.ts) → repository → adapter (src/server/db/adapter.ts); only the adapter imports the database provider. Started with student quizzes.
- Student quizzes are assessments of kind `quiz`; `assessments.exam_id` points to the legacy exams/questions/options table used only as the question bank, and the student path never reads `exams` directly.
