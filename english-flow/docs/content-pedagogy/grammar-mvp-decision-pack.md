# Grammar MVP — Decision pack

**Status: working draft content, DOCUMENTATION ONLY.** Every rule below
is `DRAFT`, subject to the three-gate review in
`grammar-rules-human-review.md`. Nothing here has been seeded, migrated,
or implemented. See `english-flow/docs/content-pedagogy/README.md` for
the overall Phase 2A status.

This is the **single place** the full 12-rule text lives — other
documents in this folder reference rules by `ruleCode`, they do not
repeat the prose.

## Linkage decisions (recap — full rationale in `decisions.md`)

- **`ErrorRecord.grammarRuleId`**: nullable, `onDelete: SetNull`, no
  backfill for legacy rows — accepted, unchanged this round.
- **`MicroLesson.sourceRuleCodes`**: string array, server-validated,
  matching the existing `sourceErrorIds: String[]` pattern — accepted,
  renamed from an earlier `sourceRuleIds` draft for consistency with
  `ruleCode` as the stable identifier used everywhere else.
- **Multiple rules per error**: single primary `grammarRuleId`; secondary
  candidates are logged by the resolver (`candidateRuleCodes[]`) but not
  persisted as a formal relation — accepted, unchanged this round (see
  `decisions.md` for the rejected join-table/JSON-array alternatives).

## CEFR levels — schema-verified, but **the level itself is a product proposal, not an externally verified fact**

Direct read of `backend/prisma/schema.prisma` confirms `CefrLevel`
contains: `A1`, `A1_PLUS`, `A2`, `A2_PLUS`, `B1`, `B1_PLUS`, `B2`, `C1`.
**These are real enum values**, not invented ones — an earlier
instruction in this review round to avoid `A1_PLUS`/`A2_PLUS` was based
on an incorrect premise about the schema; see `decisions.md` for the
correction. That fixes only which *enum values exist* — it says nothing
about which level is *correct for a given rule*.

**These two are separate questions, and this round keeps them
separate:**

1. **Rule content verification** (`grammar-source-verification.md`) —
   is the grammar explanation itself accurate? This is
   source-cited per rule.
2. **CEFR level assignment** (this table) — is *this specific level*
   the correct pedagogical placement for *this specific rule*? **No
   source consulted anywhere in this review grades individual grammar
   points against the official CEFR framework** (the Council of
   Europe's own CEFR companion volume, or English Profile's
   grammar-specific CEFR mapping — neither was consulted). British
   Council and Cambridge group their own course content into broad
   informal bands ("A1-A2 grammar," "B1-B2 grammar") for their own
   pedagogical navigation, not as a certified CEFR grading of each
   grammar point. **For every one of the 12 rules below: CEFR level is
   a product proposal, not externally verified.** `cefrEvidence` below
   is circumstantial (which page/band a publisher happened to file the
   topic under), not a CEFR certification. `cefrConfidence` measures
   how well that circumstantial evidence supports the *specific level
   chosen* — it does **not** mean "this level is CEFR-verified." No
   rule in this table reaches CEFR-verified status.

| `ruleCode` | `proposedCefrLevel` | `cefrEvidence` (circumstantial — not a CEFR grading) | `cefrConfidence` |
| --- | --- | --- | --- |
| `ARTICLE_A_AN` | `A1` | British Council files it on its "A1-A2 grammar" page, at the front of article instruction | `HIGH` (circumstantial evidence is as strong as this dataset gets) — CEFR level is a product proposal, not externally verified |
| `ARTICLE_THE_SPECIFIC` | `A1_PLUS` | Same British Council A1-A2 page as `ARTICLE_A_AN`, no finer split given by the publisher; placed one notch later in our own proposed teaching order because it requires tracking discourse context | `MEDIUM` — teaching-order estimate, not source-graded; CEFR level is a product proposal, not externally verified |
| `ARTICLE_ZERO_GENERAL` | `A2` | British Council + Oxford both discuss it without a specific CEFR sub-level attached; placed after the two more basic article rules because it needs the countable/uncountable distinction as a prerequisite | `MEDIUM` — teaching-order estimate; CEFR level is a product proposal, not externally verified |
| `PRESENT_SIMPLE_THIRD_PERSON` | `A1` | Both British Council and Cambridge file this under their earliest grammar tier | `HIGH` (circumstantial) — CEFR level is a product proposal, not externally verified |
| `PAST_SIMPLE_FORM` | `A1_PLUS` | British Council's past-simple content is grouped under its A1-A2 band, placed after present simple in standard course sequencing (our own ordering choice, not the publisher's) | `MEDIUM` — teaching-order estimate; CEFR level is a product proposal, not externally verified |
| `PAST_SIMPLE_VS_PRESENT_PERFECT` | `B1` | British Council groups the more advanced present-perfect-*simple-and-continuous* contrast under B1-B2; the simpler past-vs-perfect contrast here is placed at B1 by our own course-sequencing judgment, not stated directly by the source | `MEDIUM` — teaching-order estimate only; CEFR level is a product proposal, not externally verified |
| `MODAL_BASE_VERB` | `A2` | No CEFR-level source consulted for this point at all; `A2` reflects a common modal-verb introduction point in general ESL practice, not a citation | `LOW` — no source graded this against CEFR or even against a course band; CEFR level is a product proposal, not externally verified |
| `BASIC_PREPOSITION_PATTERNS` | `A2_PLUS` | No band-level source consulted; curated MVP list is professional/compliance-skewed, not matched to any standard course sequence point | `LOW` — teaching-order estimate only; CEFR level is a product proposal, not externally verified |
| `BASIC_WORD_ORDER` | `A1` | British Council files core word-order content under its earliest grammar tier | `HIGH` (circumstantial) — CEFR level is a product proposal, not externally verified |
| `DO_DOES_DID_QUESTIONS_NEGATIVES` | `A1_PLUS` | No band-level source consulted directly; placed immediately after present/past simple statement forms by our own course-sequencing judgment | `MEDIUM` — teaching-order estimate; CEFR level is a product proposal, not externally verified |
| `COUNTABLE_UNCOUNTABLE` | `A2` | Cambridge treats it as a dedicated grammar topic without attaching any CEFR sub-level | `MEDIUM` — teaching-order estimate; CEFR level is a product proposal, not externally verified |
| `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | `A1_PLUS` | No dedicated source for this composite rule; placed directly after `ARTICLE_A_AN` by our own course-sequencing judgment | `MEDIUM` — teaching-order estimate; CEFR level is a product proposal, not externally verified |

**Reviewer note (unchanged conclusion, restated more precisely this
round):** none of the 12 `cefrConfidence` values means "CEFR-verified."
`HIGH` means the circumstantial page-placement evidence is as strong as
this source set provides, not that an authoritative CEFR grading body
confirmed it. If precise, externally-verified CEFR placement matters
before publication, a dedicated CEFR-alignment source (Council of
Europe's CEFR companion volume, or English Profile's grammar-specific
CEFR mapping) must be consulted — neither exists in this document set
yet, and this remains an open item, not resolved here.

---

## 1. `ARTICLE_A_AN`

- **CEFR:** `A1`
- **titleRu:** Артикли a/an · **titleEn:** Articles a/an
- **shortExplanationRu:** Перед исчисляемым существительным в единственном числе при первом/общем упоминании нужен артикль a или an. A — перед согласным звуком, an — перед гласным звуком (важен звук, а не буква).
- **explanationRu:** Артикли a/an ставятся перед исчисляемым существительным в единственном числе, когда вы упоминаете предмет впервые, говорите о нём как об одном из многих, или классифицируете что-то («She is a lawyer»). Выбор между a и an определяется **звуком**, с которого начинается следующее слово, а не буквой: an hour (звук гласной, хотя h — согласная буква), a university (звук согласной /j/, хотя u — гласная буква).
- **pattern/formula:** `a/an + singular countable noun` (по звуку: согласный звук → a, гласный звук → an)
- **whenToUse:** первое упоминание; классификация («He is a doctor»); «один из многих».
- **whenNotToUse:** множественное число; неисчисляемые существительные; предмет уже известен собеседнику (нужен the).
- **signalWords/structural signals:** конструкции «is a/an ___», «one of», «a certain».
- **prerequisites:** нет строгих.
- **typical mistakes (RU-спикеры):** (1) пропуск артикля вообще; (2) выбор по букве, а не звуку (a hour вместо an hour); (3) использование a/an с неисчисляемым/множественным числом.
- **incorrect/correct pairs:**
  1. `She is compliance officer.` → `She is a compliance officer.`
  2. `He needs a hour to finish.` → `He needs an hour to finish.`
  3. `I saw a elephant at the zoo.` → `I saw an elephant at the zoo.`
  4. `It's an united approach to risk.` → `It's a united approach to risk.` (united начинается со звука /j/)
- **everyday example:** `I bought a book yesterday.`
- **professional/compliance example:** `She is a compliance officer at an international bank.`
- **contrast example:** `a apple` → `an apple`
- **edge cases:** an hour, an MBA, an FBI agent (буква/аббревиатура произносится как имя буквы, начинающееся с гласного звука); a university, a European, a one-way street (написание с гласной, но звук согласный /j/ или /w/). **Reviewer note (this round):** the rule identifies singular by the noun's grammatical number, not by the absence of `-s`/`-es` — see `SINGULAR_PLURAL_ARTICLE_AGREEMENT` and `grammar-resolver-test-cases.md` for why suffix alone is not a safe signal, either pedagogically or in the resolver.
- **resolver hints:** see `grammar-resolver-test-cases.md` row `ARTICLE_A_AN`.
- **related ErrorType:** `ARTICLE` · **related MicroCategory:** `ARTICLES`
- **exercise templates:**
  1. `fill_blank`: «She works as ___ auditor.» → `an`
  2. `choice`: «He bought ___ car.» [a/an/the] → `a`
  3. `correct_sentence`: «I need a hour to review this.» → «I need an hour to review this.»
- **sourceRefs:** `CATEGORY_SIMPLIFIED_RULE.ARTICLES` (a/an portion only, narrowed); `CATEGORY_RULE_FORMULA.ARTICLES` (narrowed); `MICRO_LESSON_GENERIC_EXERCISES.ARTICLES.choice` (adapted); British Council LearnEnglish — "Articles: 'a', 'an', 'the'" and "The indefinite article: 'a' and 'an'" (`grammar-source-verification.md` #1) — confirms the sound-not-spelling rule and the job-statement usage.
- **Documentation review status:** see `grammar-rules-human-review.md`.

## 2. `ARTICLE_THE_SPECIFIC`

- **CEFR:** `A1_PLUS`
- **titleRu:** Артикль the для конкретного предмета · **titleEn:** Article "the" for specific reference
- **shortExplanationRu:** The используется, когда и говорящий, и слушающий понимают, о каком именно предмете речь — потому что он уже упоминался, единственный в своём роде, или ясен из ситуации.
- **explanationRu:** The ставится перед существительным, когда объект **конкретен для обоих собеседников** — не любой из многих, а тот самый. Это происходит в трёх основных случаях: (1) предмет уже упоминался раньше в разговоре («I read a report. The report was long.»); (2) предмет единственный в своём роде или очевиден из контекста («the sun», «the CEO of our company»); (3) уточнён следующим словом/фразой («the report you sent me»). **Важно:** the не означает автоматически «любое существительное, упомянутое раньше» — если контекст неоднозначен или речь о новом, ещё не уточнённом предмете, снова нужен a/an, а не the.
- **pattern/formula:** `the + noun` (конкретный/уже известный обеим сторонам объект)
- **whenToUse:** повторное упоминание; уникальные объекты; уточнено контекстом/следующей фразой; превосходная степень («the best»).
- **whenNotToUse:** первое упоминание неконкретного предмета; общие утверждения о классе предметов (см. `ARTICLE_ZERO_GENERAL`); когда предмет не уникален и не уточнён.
- **signalWords/structural signals:** «the same», «the first/last», превосходная степень, придаточные определительные («the report that…»).
- **prerequisites:** `ARTICLE_A_AN`.
- **typical mistakes (RU-спикеры):** (1) пропуск the там, где предмет уже известен; (2) избыточное использование the при первом упоминании нового предмета; (3) the с уникальными географическими именами по неправильной аналогии.
- **incorrect/correct pairs:**
  1. `I read report. Report was very detailed.` → `I read a report. The report was very detailed.` (context: второе упоминание того же отчёта)
  2. `Please send me a document we discussed yesterday.` → `Please send me the document we discussed yesterday.` (context: «we discussed yesterday» уточняет, какой именно документ — не любой)
  3. `CEO of our company is on vacation.` → `The CEO of our company is on vacation.` (context: единственный в своей компании, уточнён «of our company»)
- **everyday example:** `I found the keys under the sofa.` (context: свои ключи, уже известные из ситуации — не любые ключи)
- **professional/compliance example:** `The regulator reviewed the report we submitted last week.` (context: конкретный регулятор и конкретный отчёт, оба уточнены)
- **contrast example:** `a report` (context: пользователь ещё не рассказывал ни о каком отчёте — любой) vs `the report` (context: тот самый, упомянутый раньше или уточнённый «that we submitted»)
- **edge cases:** уникальные объекты (the sun, the internet); большинство названий стран — без the (Kazakhstan, France), но составные/с «of»/множественные — с the (the United States, the Netherlands, the Republic of Kazakhstan); превосходная степень всегда с the.
- **resolver hints:** see `grammar-resolver-test-cases.md` row `ARTICLE_THE_SPECIFIC`.
- **related ErrorType:** `ARTICLE` · **related MicroCategory:** `ARTICLES`
- **exercise templates:**
  1. `fill_blank`: «The company must comply with ___ new regulation (the one we discussed).» → `the`
  2. `choice`: «I read a report yesterday. ___ report was 40 pages.» [A/An/The] → `The`
  3. `correct_sentence`: «CEO signed the document this morning.» → «The CEO signed the document this morning.»
- **sourceRefs:** `CATEGORY_SIMPLIFIED_RULE.ARTICLES` (the portion); `MICRO_LESSON_GENERIC_EXERCISES.ARTICLES.fillBlank`; British Council LearnEnglish — "The definite article: 'the'" and "Articles: 'a', 'an', 'the'" (`grammar-source-verification.md` #2) — confirms the three-case explanation. Status remains `PARTIALLY_VERIFIED`, unchanged by human review.
- **Documentation review status:** **Human documentation decision: `APPROVE`** (product owner, learner perspective, 2026-07-17) — see `grammar-rules-human-review.md`. Reviewer confirmed the draft already satisfies the required constraints: *the* is used for a specific/identifiable object; the object may be understood from prior mention, situation, a qualifying phrase, or shared reference between speakers; **prior mention alone does not automatically trigger *the*** — shared/identifiable reference remains required (this draft's three-case explanation and the explicit "important" caveat in `explanationRu` already state this; no content revision needed). **Flagged high-risk** (pre-existing flag retained — country-name exception list must stay narrow). **Production publication decision: `NOT APPROVED`** — human documentation approval does not authorize seed, publication, activation, or deployment.

## 3. `ARTICLE_ZERO_GENERAL`

- **CEFR:** `A2`
- **titleRu:** Отсутствие артикля в общем значении · **titleEn:** Zero article for general reference
- **shortExplanationRu:** Перед существительными во множественном числе и перед неисчисляемыми существительными в общем значении артикль не нужен. **Но это не универсальная формула «general = no article»** — исчисляемое существительное в единственном числе почти всегда требует a/an, даже когда речь идёт о нём в общем смысле.
- **explanationRu (переработано по итогам human review — Approved after documentation revision):** Выбор артикля в общем значении зависит от **двух признаков одновременно**, а не только от того, «общее это утверждение или нет»: (1) general meaning или specific meaning, и (2) singular countable, plural countable или uncountable noun. Формула «general → no article» **верна только для plural countable и uncountable существительных**. Для singular countable существительного общее значение **не отменяет** необходимость a/an — так работает `a/an + singular countable noun` независимо от того, конкретен предмет или нет (сравните с `ARTICLE_A_AN`).

  **Сопоставление четырёх форм (a report / the report / reports / the reports):**

  | Форма | Значение |
  | --- | --- |
  | `a report` | один какой-то отчёт (singular countable, любой из многих) |
  | `the report` | конкретный, идентифицируемый отчёт (singular countable, specific — см. `ARTICLE_THE_SPECIFIC`) |
  | `reports` | отчёты вообще, как класс (plural countable, general) |
  | `the reports` | конкретные, идентифицируемые отчёты (plural countable, specific) |

  Тот же принцип для uncountable: `information` (общее понятие) vs `the information in this report` (конкретная информация, уточнённая придаточным/контекстом) — но здесь нет формы вроде `an information`, поскольку information неисчисляемо (см. `COUNTABLE_UNCOUNTABLE`).

  **Обязательное ограничение:** singular countable существительное обычно нельзя оставлять без determiner только потому, что значение общее — `Report is important` неверно именно потому, что report здесь singular countable без артикля, а не потому, что смысл не общий. Общий смысл для report выражается либо через `A report is important` (любой отчёт как представитель класса), либо через множественное число `Reports are important` (отчёты как класс) — не через голое единственное число.
- **pattern/formula:** `∅ + plural noun` или `∅ + uncountable noun` **только для general meaning**; `a/an + singular countable noun` работает независимо от general/specific (см. `ARTICLE_A_AN`); `the + noun (любого числа/исчисляемости)` для specific meaning (см. `ARTICLE_THE_SPECIFIC`).
- **whenToUse:** обобщения — но только для plural countable или uncountable существительных.
- **whenNotToUse:** singular countable существительное в общем значении (нужен a/an, не голая форма — см. «обязательное ограничение» выше); когда существительное уточнено/конкретно (тогда the); когда это единственный экземпляр в единственном числе (тогда a/an или the).
- **signalWords/structural signals:** «in general», «usually», обобщающие подлежащие в начале предложения — но сигнал сам по себе не отменяет проверку числа/исчисляемости существительного.
- **prerequisites:** `COUNTABLE_UNCOUNTABLE`, `ARTICLE_A_AN` (для singular countable в общем значении), `ARTICLE_THE_SPECIFIC` (для контраста).
- **typical mistakes (RU-спикеры):** (1) добавление the к общим утверждениям («The compliance is important» вместо «Compliance is important»); (2) добавление a/an к множественному числу («a regulators»); (3) обратная ошибка — убирание the там, где предмет уже конкретен; (4) **(новое, по итогам review)** пропуск a/an перед singular countable существительным в общем значении по аналогии с plural/uncountable случаем («Report is important» вместо «A report is important»).
- **incorrect/correct pairs:**
  1. `The compliance is important for every company.` → `Compliance is important for every company.` (context: uncountable, general meaning — утверждение общего характера, ни о какой конкретной компании речи нет)
  2. `We need a evidences to proceed.` → `We need evidence to proceed.` (context: uncountable, general meaning — evidence в общем смысле, не конкретный набор улик)
  3. `The regulators usually check documents twice a year.` → `Regulators usually check documents twice a year.` (context: plural countable, general meaning — «usually» сигнализирует обобщение, регуляторы вообще, не конкретная группа)
  4. `Report is important.` → `A report is important.` **или** `Reports are important.` (context: singular countable в общем значении — голая форма без артикля здесь неверна независимо от «общности» смысла)
- **everyday example:** `Employees need training.` (context: plural countable, general meaning — люди этой категории вообще, не конкретная группа)
- **contrast example (specific vs. general, required by review):** `Employees need training.` (general — сотрудники вообще) vs `The employees in our department need training.` (specific — конкретная группа, уточнённая «in our department»); `Information is important.` (general, uncountable) vs `The information in this report is important.` (specific, uточнена «in this report»)
- **professional/compliance example:** `Regulators expect full transparency from financial institutions.` (context: regulators — plural countable general; financial institutions — plural countable general)
- **edge cases:** обобщение через единственное число с the тоже возможно в формальном стиле («The whale is a mammal») — не входит в MVP-объяснение, чтобы не перегружать A2; singular countable в общем значении **всегда** требует a/an (`A whale is a mammal` тоже корректно и проще для A2, чем формальный the-generic).
- **resolver hints:** see `grammar-resolver-test-cases.md` row `ARTICLE_ZERO_GENERAL`.
- **related ErrorType:** `ARTICLE` · **related MicroCategory:** `ARTICLES`
- **exercise templates:**
  1. `fill_blank`: «___ compliance is a shared responsibility.» (no article, uncountable general) → `""` (пустой пропуск)
  2. `choice`: «We need ___ evidence before we act.» [a / the / (no article)] → `(no article)` (uncountable general)
  3. `correct_sentence`: «Report is important for every decision.» → «A report is important for every decision.» (singular countable general — новое упражнение по итогам review, проверяет именно ограничение из «обязательного ограничения» выше)
- **sourceRefs:** British Council LearnEnglish — "Articles: 'the' or no article" and the general-things note from "Articles: 'a', 'an', 'the'"; a second independent source — Oxford Learner's Dictionaries / OUP ELT (`grammar-source-verification.md` #3) — no legacy repo table covers zero-article at all, this content is newly authored against these sources. Both remain `PARTIALLY_VERIFIED` (snippet-based), not a direct page read — see `grammar-source-verification.md` for why. **Human documentation review does not change this source-verification status** — see `grammar-rules-human-review.md`.
- **Documentation review status:** **Human documentation decision: `APPROVE AFTER REVISION`** (product owner, learner perspective, 2026-07-17) — see `grammar-rules-human-review.md`. Approval applies to this revised version (four-way comparison table, two-dimension framework, singular-countable constraint) — the pre-revision draft did not have these. **Flagged high-risk** (pre-existing flag retained). **Production publication decision: `NOT APPROVED`** — human documentation approval does not authorize seed, publication, activation, or deployment.

## 4. `PRESENT_SIMPLE_THIRD_PERSON`

- **CEFR:** `A1`
- **titleRu:** Present Simple: he/she/it · **titleEn:** Present Simple third-person singular
- **shortExplanationRu:** В обычных утвердительных предложениях Present Simple именно форма he/she/it требует окончания -s/-es у смыслового глагола. У have и do — особые формы: has, does.
- **explanationRu:** Когда подлежащее — he, she, it (или существительное в единственном числе, которое можно заменить на одно из них), глагол в утвердительном предложении Present Simple получает окончание: обычно -s («works»), после глаголов, оканчивающихся на -ch, -s, -ss, -sh, -x, -z — -es («watches», «goes», «fixes»), после согласной + y окончание меняется на -ies («study» → «studies», но «play» → «plays», т.к. перед y гласная). Два глагола меняют форму полностью: have → has, do → does. **Уточнение (эта формулировка исправлена по итогам ревью):** это не «единственное время, где форма глагола вообще меняется» — глагол to be тоже меняется по лицам (I am / he is), и в других временах есть свои особенности. Точнее: это единственное **простое утвердительное** время, где окончание смыслового глагола зависит именно от подлежащего he/she/it — в русском языке такого нет, поэтому легко забыть.
- **pattern/formula:** `he/she/it + verb-s/-es/-ies` · `have→has` · `do→does`
- **whenToUse:** утвердительное предложение в Present Simple с подлежащим he/she/it/единственное число.
- **whenNotToUse:** I/you/we/they (базовая форма без -s); вопросы и отрицания — там форма переходит на does/doesn't, а смысловой глагол возвращается к базовой форме (см. `DO_DOES_DID_QUESTIONS_NEGATIVES`); после модального глагола смысловой глагол тоже не меняется (см. `MODAL_BASE_VERB`).
- **signalWords/structural signals:** every day/week/Monday, usually, always, often — обычно в предложениях с he/she/it.
- **prerequisites:** нет.
- **typical mistakes (RU-спикеры):** (1) пропуск -s/-es полностью («she work», «he go»); (2) неверная замена have→haves вместо has; (3) неверная замена do→dos вместо does; (4) неправильное -y→-ies («she studys» вместо «studies»).
- **incorrect/correct pairs:**
  1. `He work in compliance.` → `He works in compliance.`
  2. `She have two reports to review.` → `She has two reports to review.`
  3. `The department do not follow this policy.` → `The department does not follow this policy.`
  4. `He studys the new regulation every week.` → `He studies the new regulation every week.`
- **everyday example:** `She checks her email every morning.`
- **professional/compliance example:** `The department follows this policy.`
- **contrast example:** `He check` → `He checks`
- **edge cases:** go/do/watch/wash/catch/fix — все получают -es, не только -s; have — не «haves», а «has»; глаголы на согласную+y (study/try/carry) → -ies, но на гласную+y (play/stay/enjoy) → просто -s.
- **resolver hints:** see `grammar-resolver-test-cases.md` row `PRESENT_SIMPLE_THIRD_PERSON` — note the precedence against `MODAL_BASE_VERB` when a modal verb is present.
- **related ErrorType:** `VERB_FORM` · **related MicroCategory:** `THIRD_PERSON_SINGULAR`, `PRESENT_SIMPLE`
- **exercise templates:**
  1. `fill_blank`: «The manager usually ___ (check) reports on Monday.» → `checks`
  2. `choice`: «The department ___ this policy.» [follow/follows/following] → `follows`
  3. `fill_blank`: «She ___ (study) the new regulation every week.» → `studies`
- **sourceRefs:** `CATEGORY_RULE_DETAILS.THIRD_PERSON_SINGULAR` (≡ `MICRO_LESSON_RULES.THIRD_PERSON_SINGULAR`, one object — see `phase-2a-audit.md`); `CATEGORY_SIMPLIFIED_RULE.THIRD_PERSON_SINGULAR`; `MICRO_LESSON_GENERIC_EXERCISES.THIRD_PERSON_SINGULAR`+`.PRESENT_SIMPLE`; Cambridge Dictionary Grammar — "Present simple (I work)", "Have", "Do" (`grammar-source-verification.md` #4) — confirms the -es-after-sibilants rule and have→has/do→does explicitly, more precisely than any legacy source.
- **Documentation review status:** see `grammar-rules-human-review.md`.

## 5. `PAST_SIMPLE_FORM`

- **CEFR:** `A1_PLUS`
- **titleRu:** Past Simple: форма глагола · **titleEn:** Past Simple verb form
- **shortExplanationRu:** Правильные глаголы в Past Simple получают окончание -ed (worked). Неправильные глаголы меняют форму полностью и их нужно запоминать (go → went).
- **explanationRu:** Past Simple образуется двумя способами. **Правильные глаголы** («regular verbs») получают окончание -ed: work → worked, check → checked. Есть предсказуемые изменения написания: если глагол оканчивается на -e, добавляется только -d (live → lived); если на согласную+y — -y меняется на -ied (study → studied); если на одну гласную+согласную в ударном слоге — согласная удваивается (stop → stopped). **Неправильные глаголы** («irregular verbs») меняют форму не по правилу, а произвольно — их нужно запоминать по одному. Наиболее частые в деловом/повседневном английском: go→went, see→saw, have→had, do→did, take→took, make→made, come→came, get→got, be→was/were. **Уточнение (эта формулировка исправлена по итогам ревью):** точное общее количество неправильных глаголов в языке не указывается — для практики важен не подсчёт, а сам список частотных форм. **Это правило только про утвердительные предложения** — в вопросах и отрицаниях используется did + базовая форма глагола без -ed (см. `DO_DOES_DID_QUESTIONS_NEGATIVES`).
- **pattern/formula:** regular: `verb + -ed` (spelling: -e→+d, consonant+y→-ied, single-vowel+consonant→doubled+ed) · irregular: запоминаемая форма (go→went)
- **whenToUse:** утвердительные предложения о завершённом действии в прошлом.
- **whenNotToUse:** вопросы/отрицания (там did + базовая форма — см. `DO_DOES_DID_QUESTIONS_NEGATIVES`); действие, связанное с настоящим (см. `PAST_SIMPLE_VS_PRESENT_PERFECT`).
- **signalWords/structural signals:** yesterday, last week/year, ago, in 2020, when I was….
- **prerequisites:** нет строгих.
- **typical mistakes (RU-спикеры):** (1) добавление -ed к неправильным глаголам («goed» вместо «went»); (2) использование базовой формы вместо прошедшей («Yesterday I go to work»); (3) двойная маркировка в вопросах/отрицаниях (см. `DO_DOES_DID_QUESTIONS_NEGATIVES`, не дублируется здесь).
- **incorrect/correct pairs:**
  1. `Yesterday I go to work.` → `Yesterday I went to work.`
  2. `We submit the report last week.` → `We submitted the report last week.`
  3. `She goed to the meeting.` → `She went to the meeting.`
- **everyday example:** `Yesterday I went to work.`
- **professional/compliance example:** `We submitted the report last week.`
- **contrast example:** `goed` → `went`
- **edge cases:** be — самый неправильный глагол (was/were, меняется по лицу — единственный past-tense verb с этим свойством).
- **resolver hints:** see `grammar-resolver-test-cases.md` row `PAST_SIMPLE_FORM` — note precedence below `DO_DOES_DID_QUESTIONS_NEGATIVES` and `PAST_SIMPLE_VS_PRESENT_PERFECT`.
- **related ErrorType:** `VERB_TENSE`, `VERB_FORM` · **related MicroCategory:** `PAST_SIMPLE`
- **exercise templates:**
  1. `fill_blank`: «We ___ (submit) the report last week.» → `submitted`
  2. `choice`: «Choose the correct past form of "go".» [goed/went/gone] → `went`
  3. `correct_sentence`: «She goed to the meeting yesterday.» → «She went to the meeting yesterday.»
- **sourceRefs:** `CATEGORY_RULE_DETAILS.PAST_SIMPLE`; `CATEGORY_SIMPLIFIED_RULE.PAST_SIMPLE`; `CATEGORY_ADDITIONAL_EXAMPLE.PAST_SIMPLE`; `MICRO_LESSON_GENERIC_EXERCISES.PAST_SIMPLE`; British Council LearnEnglish — "Past simple", "Irregular verbs" (`grammar-source-verification.md` #5) — confirms the regular/irregular split; the "~150 irregular verbs" figure from an earlier draft was **not** sourced from this or any consulted reference and has been removed, replaced by a short curated list of the most frequent forms.
- **Documentation review status:** see `grammar-rules-human-review.md`.

## 6. `PAST_SIMPLE_VS_PRESENT_PERFECT`

- **CEFR:** `B1`
- **titleRu:** Past Simple или Present Perfect · **titleEn:** Past Simple vs. Present Perfect
- **shortExplanationRu:** Оба времени говорят о прошлом, но по-разному организуют временную перспективу: Past Simple — законченное событие в прошлом, часто часть рассказа; Present Perfect — прошлое, рассматриваемое из настоящего момента (результат, опыт, незаконченный период).
- **explanationRu (переработано по итогам human review — Approved after documentation revision):** Основная рамка: оба времени описывают прошлое, но различаются тем, **как говорящий организует временную перспективу**, а не просто наличием/отсутствием даты.

  **Past Simple** используется, когда событие: (1) относится к завершённому прошлому периоду; (2) представлено как законченное событие; (3) является частью последовательного рассказа о прошлом. Примеры: «I finished the report yesterday.», «We completed the audit last month.», «She worked for this company from 2020 to 2023.», «I opened the file, read the report and called my manager.» (последовательность событий — типичный контекст Past Simple). **Важно:** Past Simple может использоваться **без явной даты**, когда контекст уже помещает события в завершённое прошлое — например, «I lost my passport during the trip.» не называет точную календарную дату, но «during the trip» уже устанавливает законченный прошлый эпизод.

  **Present Perfect** используется, когда прошлое рассматривается из настоящего момента, включая четыре основные ситуации: (1) текущий результат («I have finished the report. You can review it now.»); (2) жизненный опыт («I have worked with international clients.»); (3) ещё не завершившийся период («I have completed three tasks today.» — день ещё не закончился); (4) действие или состояние, начавшееся раньше и продолжающееся сейчас («I have worked here since 2022.»).

  **Обязательный контраст:** «I worked here for five years.» (завершённый период в прошлом — уже не работаю) vs «I have worked here for five years.» (период продолжается сейчас — всё ещё работаю); разница не в самом слове «for», а в том, продолжается ли ситуация сейчас.

  **Уточнение (сохранено из предыдущего ревью, подтверждено этим раундом):** signal words — это не безошибочный автоматический классификатор, а полезный, но не абсолютный ориентир. Дополнительные ограничения по итогам review: (1) отсутствие точного времени **не означает автоматически** Present Perfect — см. «I lost my passport during the trip.» выше, где Past Simple использован без даты; (2) наличие «важного результата» само по себе недостаточно для выбора Present Perfect — нужен ещё и правильный временной фокус; (3) yesterday/last week/in 2024 — сильные признаки завершённого прошлого времени, но resolver не должен использовать их как единственный самостоятельный classifier; (4) смысл и временной контекст важнее одного signal word.
- **pattern/formula:** Present Perfect: `have/has + V3` (result now / life experience / unfinished period / started-in-past-continuing-now) · Past Simple: `V-ed/irregular` (finished event, часть narrative, дата не обязательна если контекст уже завершённый)
- **whenToUse (Present Perfect):** текущий результат; жизненный опыт; ещё не завершившийся период (today, this week — если период не закончен); действие, начавшееся раньше и продолжающееся сейчас (since/for).
- **whenNotToUse (Present Perfect):** как правило, не сочетается с finished-time выражениями (yesterday, last year, in 2024, two days ago, when + прошедшее время); отсутствие даты — недостаточное основание сменить на Present Perfect, если контекст уже подразумевает завершённый эпизод.
- **signalWords/structural signals:** Present Perfect → already, yet, ever, never, just, since, for, so far, today/this week (если период не закончен) — надёжные, но не абсолютные ориентиры, не единственный самостоятельный classifier; Past Simple → yesterday, last week/year/month, in [конкретный год], ago, when I was…, а также **отсутствие явной даты при уже установленном завершённом контексте** (см. «during the trip» пример).
- **prerequisites:** `PAST_SIMPLE_FORM`.
- **typical mistakes (RU-спикеры):** (1) Present Perfect с finished-time markers («I have seen this policy yesterday» — прямая калька с русского прошедшего вида); (2) Past Simple там, где нужен результат-Present Perfect без указания времени; (3) путаница since (точка отсчёта) и for (длительность); (4) **(уточнено ревью)** ошибочное предположение, что отсутствие даты автоматически требует Present Perfect — игнорирование случаев вроде «I lost my passport during the trip.»
- **incorrect/correct pairs:**
  1. `I have seen this policy yesterday.` → `I saw this policy yesterday.`
  2. `I have see this policy yesterday.` → `I saw this policy yesterday.`
  3. `We work here since 2020.` → `We have worked here since 2020.`
  4. `Have you finished the report last week?` → `Did you finish the report last week?`
- **everyday example:** `I have already finished the risk assessment.`
- **professional/compliance example:** `The regulator has not responded to our request yet.`
- **narrative example (без даты, всё равно Past Simple):** `I opened the file, read the report and called my manager.` (последовательность завершённых событий)
- **no-explicit-date example (required by review):** `I lost my passport during the trip.` — показывает, что Past Simple возможен без точной календарной даты, если контекст уже завершённый.
- **contrast example:** `I worked here for five years.` (завершённый период — уже не работаю) vs `I have worked here for five years.` (период продолжается сейчас — всё ещё работаю)
- **edge cases:** «for three years» может стоять и с Present Perfect (незаконченный период — «I have lived here for three years», всё ещё здесь живу), и с Past Simple (законченный период — «I lived there for three years», уже не живу); различается контекстом, не самим словом «for».
- **resolver hints:** see `grammar-resolver-test-cases.md` row `PAST_SIMPLE_VS_PRESENT_PERFECT` — note this is a `HIGH`/`MEDIUM` split (direct have/has signal vs. compensating finished-time-marker heuristic), never treated as a deterministic classifier on its own; the no-explicit-date-but-Past-Simple case (`I lost my passport during the trip.`) is exactly why a bare "no date found" signal must not auto-select Present Perfect.
- **related ErrorType:** `VERB_TENSE` · **related MicroCategory:** `PRESENT_PERFECT`, `PAST_SIMPLE`
- **exercise templates:**
  1. `fill_blank`: «I ___ (already / finish) the risk assessment.» → `have already finished`
  2. `choice`: «Choose the correct sentence.» [I have seen this policy yesterday. / I saw this policy yesterday. / I have see this policy yesterday.] → `I saw this policy yesterday.`
  3. `correct_sentence`: «We work here since 2020.» → «We have worked here since 2020.»
  4. `choice` **(new, per review)**: «I ___ my passport during the trip.» [lost/have lost] → `lost` (Past Simple without an explicit date, context already finished)
- **sourceRefs:** `CATEGORY_RULE_DETAILS.PRESENT_PERFECT`; `CATEGORY_SIMPLIFIED_RULE.PRESENT_PERFECT`; `MICRO_LESSON_GENERIC_EXERCISES.PRESENT_PERFECT`; British Council LearnEnglish — "Present perfect", "Talking about the past" (`grammar-source-verification.md` #6) — directly confirms the finished-time-marker incompatibility and the since/for distinction; this is the single strongest citation in the set. Status remains `PARTIALLY_VERIFIED`, unchanged by human review.
- **Documentation review status:** **Human documentation decision: `APPROVE AFTER REVISION`** (product owner, learner perspective, 2026-07-17) — see `grammar-rules-human-review.md`. Approval applies to this revised version (four-situation Present Perfect framework, narrative/no-date Past Simple examples, explicit "no date ≠ automatically Present Perfect" constraint) — the pre-revision draft did not have these. **Flagged highest-risk** (pre-existing flag retained) — most linguistically demanding rule in the set (B1, only non-A-level rule). **Production publication decision: `NOT APPROVED`** — human documentation approval does not authorize seed, publication, activation, or deployment.

## 7. `MODAL_BASE_VERB`

- **CEFR:** `A2`
- **titleRu:** Модальные глаголы + база · **titleEn:** Modal + base verb
- **shortExplanationRu:** После модальных глаголов (can, must, should, may, might, could, would) всегда идёт базовая форма глагола — без to, без -s и без окончания прошедшего времени.
- **explanationRu:** Модальные глаголы (can, must, should, may, might, could, would и другие) не меняют форму по лицам и не берут -to/-s/-ed сами — и требуют, чтобы следующий за ними глагол тоже стоял в базовой форме, без изменений. Три частые ошибки, которых стоит избегать: (1) не добавляйте to («must to comply» неверно, нужно «must comply»); (2) не добавляйте -s даже после he/she/it («she can works» неверно, нужно «she can work»); (3) не используйте форму прошедшего времени, даже если предложение о прошлом («could went» неверно) — для прошлого нужна отдельная конструкция modal + have + V3 («could have gone»), которая не входит в это MVP-правило.
- **pattern/formula:** `modal (can/must/should/may/might/could/would) + base verb` (без to, без -s, без -ed)
- **whenToUse:** возможность/способность (can), обязательность (must, should), вежливая просьба/предположение (would, might).
- **whenNotToUse:** после обычных (не модальных) глаголов to не убирается («want to go» — здесь to нужен, want не модальный глагол).
- **signalWords/structural signals:** can/could/must/should/may/might/would + сразу глагол.
- **prerequisites:** нет строгих.
- **typical mistakes (RU-спикеры):** (1) добавление to по аналогии с другими конструкциями («must to submit»); (2) добавление -s после he/she/it («she should works»); (3) использование прошедшей формы смыслового глагола («must went» вместо «had to go»).
- **incorrect/correct pairs:**
  1. `The company must to comply with this regulation.` → `The company must comply with this regulation.`
  2. `She can works from home on Fridays.` → `She can work from home on Fridays.`
  3. `We should reported the incident immediately.` → `We should report the incident immediately.`
- **everyday example:** `You should call her before you visit.`
- **professional/compliance example:** `Employees must report any conflict of interest immediately.`
- **contrast example:** `must to comply` → `must comply`
- **edge cases:** **ought to** — единственный распространённый модальный глагол (точнее, "semi-modal"), который, наоборот, требует to (ought **to** go) — прямо противоречит основному паттерну, отмечен отдельно, не в shortExplanationRu. Прошедшее сожаление/предположение — «could have gone», «should have told» (modal + have + V3) — за пределами MVP-scope этого правила.
- **resolver hints:** see `grammar-resolver-test-cases.md` row `MODAL_BASE_VERB` and the "Diff-specific precedence" section — this rule has explicit precedence relative to `DO_DOES_DID_QUESTIONS_NEGATIVES`, not one global ranking.
- **related ErrorType:** `VERB_FORM` · **related MicroCategory:** нет прямого соответствия — см. `decisions.md` "Open" #2.
- **exercise templates:**
  1. `fill_blank`: «Employees must ___ (report) any conflict of interest.» → `report`
  2. `choice`: «Choose the correct sentence.» [She can works from home. / She can work from home. / She can to work from home.] → `She can work from home.`
  3. `correct_sentence`: «We should reported the incident.» → «We should report the incident.»
- **sourceRefs:** no legacy repo table covers modal verbs at all (confirmed by grep, `phase-2a-audit.md`); Cambridge Dictionary Grammar — "Modality: forms", "Modal verbs and modality", "Ought to" (`grammar-source-verification.md` #7) — confirms the entire pattern and the `ought to` exception, including Cambridge's own incorrect-usage examples.
- **Documentation review status:** see `grammar-rules-human-review.md`.

## 8. `BASIC_PREPOSITION_PATTERNS`

- **CEFR:** `A2_PLUS`
- **titleRu:** Устойчивые предложные конструкции · **titleEn:** Fixed preposition patterns
- **shortExplanationRu:** Предлог после многих глаголов и прилагательных не переводится дословно с русского — он часть устойчивой конструкции, которую нужно запоминать целиком.
- **explanationRu:** Это правило **не претендует на охват всех предлогов английского языка единым принципом** — вместо этого это curated набор самых частых устойчивых конструкций «глагол/прилагательное + предлог» для делового и повседневного английского: comply **with**, depend **on**, responsible **for**, interested **in**, good **at**, listen **to**, arrive **at**(здание/точка)/**in**(город, страна). Предлог здесь не выбирается по логике, а является фиксированной частью словосочетания, как в русском «отвечать **за** что-то». Основной способ выучить эти конструкции — запоминать их целиком.
- **pattern/formula:** `verb/adjective + fixed preposition` (запоминается как единое целое)
- **whenToUse:** при использовании любой из curated-конструкций выше.
- **whenNotToUse:** правило не универсально — не пытайтесь применить эти предлоги к другим глаголам по аналогии.
- **signalWords/structural signals:** список конструкций MVP: comply with, depend on, responsible for, interested in, good at, listen to, arrive at/in.
- **prerequisites:** нет.
- **typical mistakes (RU-спикеры):** (1) дословный перевод предлога из русского («responsible of» вместо «responsible for»); (2) использование одного предлога универсально («arrive to» вместо «arrive at/in»); (3) путаница comply with / comply to.
- **incorrect/correct pairs:**
  1. `The company must comply to the regulation.` → `The company must comply with the regulation.`
  2. `She is responsible of this project.` → `She is responsible for this project.`
  3. `This depends of the outcome of the audit.` → `This depends on the outcome of the audit.`
  4. `We arrived to the office at 9 AM.` → `We arrived at the office at 9 AM.`
- **everyday example:** `I'm interested in learning English.`
- **professional/compliance example:** `She is responsible for compliance.`
- **contrast example:** `comply to` → `comply with`
- **required arrive at/in examples (per human review, 2026-07-17):** `We arrived in London.` (город); `She arrived in Kazakhstan.` (страна); `We arrived at the office.` (конкретное место/точка); `He arrived at the airport.` (конкретное место/точка) — **arrive in** для города, страны или крупной территории; **arrive at** для конкретного места или точки.
- **edge cases:** arrive at (здание/точка) vs arrive in (город/страна) — оба верны для разных по масштабу мест, см. четыре обязательных примера выше; **arrive home/here/there не требует предлога вообще** («We arrived home yesterday», не «arrived at home») — уточнение, добавленное по итогам source verification, отсутствовало в исходном черновике.
- **resolver hints:** see `grammar-resolver-test-cases.md` row `BASIC_PREPOSITION_PATTERNS`.
- **related ErrorType:** `PREPOSITION` · **related MicroCategory:** `PREPOSITIONS`
- **exercise templates:**
  1. `fill_blank`: «The company must comply ___ the regulation.» → `with`
  2. `choice`: «She is responsible ___ this project.» [for/of/at] → `for`
  3. `correct_sentence`: «This depends of the audit outcome.» → «This depends on the audit outcome.»
  4. `choice` **(new, per review)**: «We ___ Kazakhstan on Monday, then we ___ the office at 9 AM.» [arrived in / arrived at] → `arrived in` / `arrived at`
- **sourceRefs:** `CATEGORY_RULE_DETAILS.PREPOSITIONS`; `CATEGORY_SIMPLIFIED_RULE.PREPOSITIONS`; `CATEGORY_ADDITIONAL_EXAMPLE.PREPOSITIONS`; `MICRO_LESSON_GENERIC_EXERCISES.PREPOSITIONS`; Cambridge Dictionary Grammar — "Prepositions: responsible", "Word patterns: depend on something", "Word patterns: arrive somewhere", "Comply" (`grammar-source-verification.md` #8) — confirms each curated pattern individually and the arrive-home no-preposition nuance. **Status remains `PARTIALLY_VERIFIED`; `good at` and `listen to` still rest on weaker evidence than the other patterns (see `grammar-source-verification.md` #8) — human review approval does not upgrade this to direct verification.**
- **Documentation review status:** **Human documentation decision: `APPROVE`** (product owner, learner perspective, 2026-07-17) — see `grammar-rules-human-review.md`. Reviewer confirmed the "learn each construction as a whole, not by literal translation" principle is preserved, and that no single formula is claimed to cover every verb/adjective/preposition combination — each curated construction is taught individually with its own natural example, per the arrive at/in examples added above. **Flagged high-risk** (pre-existing flag retained — `good at`/`listen to` evidence gap). **Production publication decision: `NOT APPROVED`** — human documentation approval does not authorize seed, publication, activation, or deployment, and does not resolve the existing source-evidence flags.

## 9. `BASIC_WORD_ORDER`

- **CEFR:** `A1`
- **titleRu:** Базовый порядок слов · **titleEn:** Basic word order
- **shortExplanationRu:** В английском предложении обычно порядок: подлежащее → сказуемое → дополнение. Наречия частоты (always, usually) обычно ставятся перед смысловым глаголом, но после to be.
- **explanationRu:** В отличие от русского, где порядок слов гибкий, английский язык **в основном опирается на порядок слов**, чтобы показать, кто выполняет действие: subject (подлежащее) → verb (сказуемое) → object/complement (дополнение). Наречия частоты (always, usually, often, never) — частый источник ошибок: они обычно ставятся **перед** смысловым глаголом («I always check the documents»), но **после** глагола to be («She is always late»); «always» в отрицаниях — ещё одно исключение, стоит **после** be/do + not, тогда как большинство других наречий частоты — перед («She isn't always late», но «She doesn't usually eat lunch here»). **Уточнение (эта формулировка исправлена по итогам ревью):** позиция обстоятельств времени/места в конце предложения — это базовый ориентир для A1, а не абсолютное правило: порядок слов в английском достаточно гибкий, и вынесение обстоятельства в начало предложения («Yesterday, I finished the report») — это стилистически нормальный вариант, а не ошибка, особенно для акцента.
- **pattern/formula:** `Subject + Verb + Object` (+ Adverb of frequency перед verb / после to be) (+ Time/Place — часто в конце, но не обязательно)
- **whenToUse:** базовые утвердительные предложения.
- **whenNotToUse:** вопросы (инверсия — вне scope этого правила).
- **signalWords/structural signals:** always/usually/often/never/sometimes — сигнал проверить их позицию.
- **prerequisites:** нет.
- **typical mistakes (RU-спикеры):** (1) наречие частоты в начале предложения по аналогии с русским («Always I check the documents»); (2) обстоятельство времени/места посередине предложения («I yesterday finished the report»), что действительно нетипично, в отличие от вынесения в начало; (3) неверная позиция относительно to be.
- **incorrect/correct pairs:**
  1. `Always I check the documents.` → `I always check the documents.`
  2. `I check always the documents.` → `I always check the documents.`
  3. `She always is late for meetings.` → `She is always late for meetings.`
- **everyday example:** `I always check the documents.`
- **professional/compliance example:** `The auditor usually reviews the reports on Fridays.`
- **contrast example:** `Yesterday I the report finished` (обстоятельство посередине — нетипично) → `I finished the report yesterday` **или** `Yesterday, I finished the report` (оба варианта корректны)
- **edge cases:** вынесение обстоятельства времени в начало для акцента («Yesterday, I finished the report») — это нормальный, не ошибочный вариант, подтверждено источником (British Council: позиция наречий «очень гибкая»).
- **resolver hints:** see `grammar-resolver-test-cases.md` row `BASIC_WORD_ORDER`.
- **related ErrorType:** `WORD_ORDER` · **related MicroCategory:** `WORD_ORDER`
- **exercise templates:**
  1. reorder: «yesterday / the report / I / finished» → `I finished the report yesterday`
  2. `choice`: «Choose the correctly ordered sentence.» [Always I check the documents. / I always check the documents. / I check always the documents.] → `I always check the documents.`
  3. `correct_sentence`: «She always is late for meetings.» → «She is always late for meetings.»
- **sourceRefs:** `CATEGORY_RULE_DETAILS.WORD_ORDER`; `CATEGORY_SIMPLIFIED_RULE.WORD_ORDER`; `CATEGORY_ADDITIONAL_EXAMPLE.WORD_ORDER`; `MICRO_LESSON_GENERIC_EXERCISES.WORD_ORDER`; British Council LearnEnglish — "How often", "Where adverbials go in a sentence" (`grammar-source-verification.md` #9) — directly confirms the "very flexible" framing used to correct the earlier absolute-rule wording, plus the `always`-in-negatives exception (new, not in legacy content).
- **Documentation review status:** see `grammar-rules-human-review.md`.

## 10. `DO_DOES_DID_QUESTIONS_NEGATIVES`

- **CEFR:** `A1_PLUS`
- **titleRu:** Вопросы и отрицания с do/does/did · **titleEn:** Do-support in questions and negatives
- **shortExplanationRu:** В вопросах и отрицаниях Present/Past Simple используется do/does/did, а смысловой глагол остаётся в базовой форме — без -s и без -ed.
- **explanationRu:** Когда вы задаёте вопрос или строите отрицание в Present Simple или Past Simple (кроме глагола to be), появляется вспомогательный глагол do/does (настоящее время) или did (прошедшее время), а смысловой глагол возвращается к **базовой форме**, теряя любые окончания. Present Simple: do/does + subject + base verb («Does she work here?», «I do not agree»). Past Simple: did + subject + base verb («Did you finish the report?», «We did not submit it»). **Главная ошибка — двойная маркировка**: нельзя пометить и вспомогательный, и смысловой глагол одновременно («did went» неверно — did уже показывает прошедшее время; нужно «did go»). Та же логика для -s: «does she works» неверно (does уже показывает 3-е лицо; нужно «does she work»).
- **pattern/formula:** `Do/Does + subject + base verb` (present) · `Did + subject + base verb` (past) · `do/does/did + not + base verb` (negative)
- **whenToUse:** вопросы и отрицания в Present Simple/Past Simple, кроме глагола to be и модальных глаголов.
- **whenNotToUse:** с to be («Is she here?», не «Does she is here?»); с модальными глаголами (см. `MODAL_BASE_VERB` — «Can she work?», не «Does she can work?»).
- **signalWords/structural signals:** вопросительный знак + отсутствие to be/модального глагола в начале; not после do/does/did.
- **prerequisites:** `PRESENT_SIMPLE_THIRD_PERSON`, `PAST_SIMPLE_FORM`.
- **typical mistakes (RU-спикеры):** (1) двойная маркировка прошедшего времени («did went», «did finished»); (2) двойная маркировка 3-го лица («does she works»); (3) отсутствие do/does/did вообще, вопрос через интонацию по аналогии с русским.
- **incorrect/correct pairs:**
  1. `Did you went to the meeting?` → `Did you go to the meeting?`
  2. `She doesn't works on Fridays.` → `She doesn't work on Fridays.`
  3. `Does she has the report?` → `Does she have the report?`
- **everyday example:** `Did you call your mother yesterday?`
- **professional/compliance example:** `Did the regulator approve the new policy?`
- **contrast example:** `did went` → `did go`
- **edge cases:** вопросы через интонацию без do-support («You finished the report?») грамматически допустимы в разговорной речи, но не рекомендуются для делового письменного английского.
- **resolver hints:** see `grammar-resolver-test-cases.md` row `DO_DOES_DID_QUESTIONS_NEGATIVES` and the "Diff-specific precedence" section — this rule's precedence relative to `MODAL_BASE_VERB` is diff-specific (three distinct cases), not one fixed global ranking.
- **related ErrorType:** `VERB_FORM`, `VERB_TENSE` · **related MicroCategory:** нет прямого соответствия — см. `decisions.md` "Open" #2.
- **exercise templates:**
  1. `fill_blank`: «___ you ___ (finish) the report yesterday?» → `Did / finish`
  2. `choice`: «Choose the correct question.» [Does she works on Fridays? / Does she work on Fridays? / Do she works on Fridays?] → `Does she work on Fridays?`
  3. `correct_sentence`: «Did you went to the meeting?» → «Did you go to the meeting?»
- **sourceRefs:** no legacy repo table covers do-support at all (confirmed by grep, `phase-2a-audit.md`); Cambridge Dictionary Grammar — "Do — English Grammar Today", "Forming negative statements, questions and imperatives" (`grammar-source-verification.md` #10) — confirms the entire pattern including Cambridge's own base-form examples.
- **Documentation review status:** see `grammar-rules-human-review.md`.

## 11. `COUNTABLE_UNCOUNTABLE`

- **CEFR:** `A2`
- **titleRu:** Исчисляемые и неисчисляемые существительные · **titleEn:** Countable vs. uncountable nouns
- **shortExplanationRu:** Неисчисляемые существительные (information, advice, evidence, equipment) обычно не имеют множественного числа и не берут a/an **в значении, которое описывает это правило** — это не универсальное лингвистическое свойство слова навсегда. В обычной речи для количества чаще используется a lot of, а much — в вопросах, отрицаниях и более формальном стиле.
- **explanationRu (дополнено по итогам human review — Approved with contextual-countability caveat):** Некоторые английские существительные, которые в русском кажутся «счётными», в английском грамматически **обычно неисчисляемы в том значении, которое описывает это правило** — у них нет формы множественного числа в этом значении (нельзя «informations», «advices», «evidences»), и они не берут артикль a/an. Частые проблемные слова: information, advice, evidence, research, equipment, knowledge, feedback, furniture, software, news, progress.

  **Обязательная оговорка (по итогам review):** «неисчисляемое» здесь не означает «слово никогда не бывает исчисляемым» — это описание конкретного, самого частого значения слова, а не универсальное лингвистическое определение. Интуиция «слово не обозначает отдельные единицы» полезна для запоминания, но это учебное упрощение, а не строгое правило: у отдельных слов есть countable senses в другом контексте, регистре или профессиональном значении. В частности: **evidence** — как юридический термин может встречаться в форме «evidences» в некоторых специализированных/устаревших контекстах, но в стандартном современном употреблении неисчисляемо; **research** — обычно неисчисляемо («research shows»), но «a research» иногда встречается в некоторых научных/институциональных контекстах как «исследовательский проект» (не рекомендуется для MVP-уровня, отмечено как edge case); **feedback** — стандартно неисчисляемо, встречается счётным реже, чем остальные в списке (наименее подтверждено источниками — см. `grammar-source-verification.md` #11); **software** — неисчисляемо как обозначение ПО в целом, но профессионалы иногда говорят «a software» неформально для «программа/приложение» (не рекомендуется как учебная норма); **work** — неисчисляемо в значении «работа/усилие», но исчисляемо в значении «произведение» («a work of art», «works of art»); **knowledge** — стандартно неисчисляемо, устойчиво во всех проверенных источниках; **experience** — не входит в основной curated список этого правила, но если упоминается в примерах: неисчисляемо в значении «опыт вообще» («She has experience in compliance»), но исчисляемо в значении «отдельный случай/событие» («a frightening experience»).

  Для количества неисчисляемых в обычных утвердительных предложениях чаще звучит естественно **a lot of** («We collected a lot of evidence» / «substantial evidence» в более формальном/деловом контексте) — **much** тоже грамматически верно, но в утвердительных предложениях воспринимается более формально/книжно; much типичен в вопросах и отрицаниях («Is there much evidence?», «There isn't much evidence»). Many/few — только для исчисляемого множественного числа («many reports», «few documents»), не для неисчисляемых. Some/any работают с обоими типами одинаково.
- **pattern/formula:** uncountable (в описанном значении), affirmative: `a lot of / substantial + noun (no plural, no a/an)`; uncountable, question/negative/formal: `much + noun` also natural · countable plural: `many/few + noun-s`
- **whenToUse:** a lot of — количество неисчисляемого в обычной речи; much — в вопросах/отрицаниях/формальном стиле; many/few — для исчисляемого множественного числа.
- **whenNotToUse:** не добавляйте -s к неисчисляемым **в этом значении**; не используйте a/an с неисчисляемыми в общем значении (см. также `ARTICLE_ZERO_GENERAL`); не утверждайте, что слово никогда не бывает исчисляемым в принципе — см. countable senses выше.
- **signalWords/structural signals:** much/many, little/few, a lot of, some/any — сигнал проверить исчисляемость следующего существительного **в контексте конкретного предложения**, не по слову изолированно.
- **prerequisites:** полезно связать с `ARTICLE_ZERO_GENERAL`.
- **typical mistakes (RU-спикеры):** (1) множественное число у неисчисляемых **в стандартном значении** («informations», «evidences», «advices»); (2) many/few вместо much/a lot of («many information»); (3) a/an перед неисчисляемым («an information»).
- **incorrect/correct pairs (learner-error examples, сохранены по итогам review):**
  1. `We collected many evidences.` → `We collected a lot of evidence.`
  2. `We do not have many information about this case.` → `We do not have much information about this case.` (context: отрицание — much здесь звучит естественно)
  3. `Please give me an advice.` → `Please give me some advice.`
  4. `We need more equipments for this project.` → `We need more equipment for this project.` **или** `We need more pieces of equipment for this project.` (context: single-item workaround через «a piece of»)
- **piece-of workaround examples (required by review):** `some information` / `a piece of information`; `some advice` / `a piece of advice`; `equipment` / `pieces of equipment`.
- **everyday example:** `Can you give me some advice?`
- **professional/compliance example:** `We collected substantial evidence during the investigation.` (уточнено по итогам source verification — заменяет исходный пример с «much evidence» как ведущий пример утвердительного предложения)
- **contrast example:** `many evidences` → `a lot of evidence`
- **edge cases (contextual-countability, expanded по итогам review — не скрывать вариативность):** work — неисчисляемо в значении «работа вообще», но «a work of art»/«works of art» — исчисляемо в значении «произведение»; evidence/research/feedback/software — обычно неисчисляемы в curated MVP-значении, но у каждого есть менее частые countable senses в специализированных/неформальных контекстах, описанные выше — учебное правило намеренно упрощено до самого частого значения, это упрощение явно называется упрощением, а не абсолютным фактом о слове.
- **resolver hints:** see `grammar-resolver-test-cases.md` row `COUNTABLE_UNCOUNTABLE`.
- **related ErrorType:** `VOCABULARY` · **related MicroCategory:** `COUNTABLE_VS_UNCOUNTABLE`
- **exercise templates:**
  1. `fill_blank`: «We do not have ___ (many/much) information about this case.» → `much` (context: отрицание)
  2. `choice`: «Choose the correct sentence.» [We collected many evidences. / We collected a lot of evidence. / We collected a evidence.] → `We collected a lot of evidence.`
  3. `correct_sentence`: «Please give me an advice.» → «Please give me some advice.»
  4. `choice` **(new, per review)**: «Can you give me some ___?» [advice / a advice / a piece of advice] → `advice` **или** `a piece of advice` (both correct, both accepted)
- **sourceRefs:** `CATEGORY_RULE_DETAILS.COUNTABLE_VS_UNCOUNTABLE`; `CATEGORY_SIMPLIFIED_RULE`; `CATEGORY_ADDITIONAL_EXAMPLE`; `MICRO_LESSON_GENERIC_EXERCISES`; Cambridge Dictionary Grammar — "Nouns: countable and uncountable", "Much, many, a lot of, lots of: quantifiers", "Determiners: many, much, or a lot of?" (`grammar-source-verification.md` #11) — directly grounds the correction away from `much evidence` as the lead affirmative example. **Status remains `PARTIALLY_VERIFIED`; `feedback` still rests on weaker evidence than the other 11 nouns (see `grammar-source-verification.md` #11) — human review approval does not upgrade this to direct verification.**
- **Documentation review status:** **Human documentation decision: `APPROVE WITH CAVEAT`** (product owner, learner perspective, 2026-07-17) — see `grammar-rules-human-review.md`. Approval conditioned on adding the contextual-countability caveat above (evidence/research/feedback/software/work/knowledge/experience) — the pre-revision draft's edge-case note only covered `work`; the other six nouns' countable senses are now explicitly named rather than silently generalized away. **Flagged high-risk** (pre-existing flag retained — `feedback` source-evidence gap). **Production publication decision: `NOT APPROVED`** — human documentation approval does not authorize seed, publication, activation, or deployment, and does not resolve the existing source-evidence flag.

## 12. `SINGULAR_PLURAL_ARTICLE_AGREEMENT`

- **CEFR:** `A1_PLUS`
- **titleRu:** Согласование числа и артикля · **titleEn:** Number/article agreement
- **shortExplanationRu:** A/an ставится только перед существительным в единственном числе. Перед множественным числом a/an не ставится вообще.
- **explanationRu:** A/an всегда сочетается только с существительным в единственном числе: «a books», «an apples» — неверные сочетания. Если существительное во множественном числе и речь идёт об общем количестве — артикль не нужен вообще (см. `ARTICLE_ZERO_GENERAL`). Отдельная полезная конструкция — «one of the + существительное во множественном числе» («one of the reports» — «один из отчётов»): the здесь относится не к самому множественному числу напрямую, а к уточнённой группе, из которой выбирается один. **Уточнение (эта формулировка исправлена по итогам ревью):** правило — просто прямое соответствие числа: `a/an` только с единственным числом. Важно: **не каждое слово, оканчивающееся на -s, стоит во множественном числе** — news, mathematics/maths, physics, economics, gymnastics, aerobics, measles, mumps грамматически единственные, несмотря на окончание -s; species и series имеют одну и ту же форму для единственного и множественного числа. Поэтому определять число «по -s на конце» ненадёжно — надо смотреть на реальное значение и согласование с глаголом (news is, не news are).
- **pattern/formula:** `a/an + singular noun` (никогда + plural) · `one of the + plural noun`
- **whenToUse:** проверка перед a/an — единственное ли число у следующего существительного (по значению, не только по окончанию).
- **whenNotToUse:** a/an не сочетается с явно множественным числом; но помните про news/mathematics/species-класс слов — они не подчиняются этому исключению, т.к. грамматически не множественные.
- **signalWords/structural signals:** «one of the», «each of the», «every» (every всегда с единственным числом, даже если смысл общий).
- **prerequisites:** `ARTICLE_A_AN`, `ARTICLE_ZERO_GENERAL`.
- **typical mistakes (RU-спикеры):** (1) a/an перед явно множественным числом по невнимательности («a documents»); (2) отсутствие the в конструкции «one of the ___»; (3) путаница «every» (ед. число) и «all» (мн. число).
- **incorrect/correct pairs:**
  1. `We received a documents from the regulator.` → `We received documents from the regulator.`
  2. `She is a one of the best auditors.` → `She is one of the best auditors.`
  3. `An employees must comply with this policy.` → `Employees must comply with this policy.`
- **everyday example:** `One of the books on the shelf is mine.`
- **professional/compliance example:** `One of the reports contained an error.`
- **contrast example:** `a documents` → `documents`
- **edge cases:** news — оканчивается на -s, но грамматически единственное («The news is good», не «are»); mathematics/physics/economics — та же категория; species/series — одна форма для обоих чисел; every + единственное число даже при обобщающем смысле («Every employee must comply», не «employees»).
- **resolver hints:** see `grammar-resolver-test-cases.md` row `SINGULAR_PLURAL_ARTICLE_AGREEMENT` — **this rule's resolver hints were specifically corrected this round**: a bare `-s`/`-es` suffix is no longer sufficient for `HIGH` confidence given the news/mathematics/species counterexamples confirmed by source verification.
- **related ErrorType:** `ARTICLE` · **related MicroCategory:** `ARTICLES`
- **exercise templates:**
  1. `fill_blank`: «We received ___ documents from the regulator.» (no article) → `""`
  2. `choice`: «Choose the correct sentence.» [She is a one of the best auditors. / She is one of the best auditors. / She is an one of the best auditors.] → `She is one of the best auditors.`
  3. `correct_sentence`: «An employees must comply with this policy.» → «Employees must comply with this policy.»
- **sourceRefs:** no legacy repo table covers number/article agreement specifically; Cambridge Dictionary Grammar — "Nouns: singular and plural", "News", "Species" (`grammar-source-verification.md` #12) — confirms the singular-despite-`-s` word class, directly grounding the resolver-safety correction.
- **Documentation review status:** see `grammar-rules-human-review.md`.

---

## Deployment/rollback proposal (summary — full dry-run detail in `grammar-migration-dry-run-plan.md`)

Unchanged from the previously-accepted proposal, restated briefly:
migration (additive only) → backend compatibility code with empty-table
fallback → editorial CLI → import 12 `DRAFT` rules → human review (this
document's twin, `grammar-rules-human-review.md`) → publish approved
rules individually → resolver activates automatically per `PUBLISHED`
row (no separate feature flag — content-level `ARCHIVED` is the
rollback mechanism, chosen over an env-flag given Render's non-instant
redeploy characteristics) → smoke test → metrics monitoring → gradual
expansion only after all mandatory MVP slices validate (`decisions.md`).
Rollback: application rollback (revert commit, additive schema stays,
old backend ignores it), content rollback (`PUBLISHED → ARCHIVED`, no
redeploy needed), migration rollback (never `DROP` in production as a
routine step — see `grammar-migration-dry-run-plan.md`), incident
rollback (archive all `PUBLISHED` rows, verify fallback via smoke test
and resolver logs). **None of this has been executed or scheduled — it
remains a proposal pending the separate approvals in
`grammar-rules-human-review.md`.**
