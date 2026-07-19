# Grammar MVP — External source verification

**Actual database status, unchanged by this document: `PARTIALLY_VERIFIED`
for all 12 MVP rules.** Nothing in this document changes
`sourceVerificationStatus` in production — every status change discussed
below is a **proposal for later human action**, not something this
document or the session that wrote it performed.

**As of 2026-07-18 (second pass), an external independent reviewer
directly accessed a set of authoritative Cambridge Dictionary Grammar
pages** — see "External independent direct-source verification" below —
and this document proposed `VERIFIED_DIRECTLY` for 7 of the 12 rules on
that basis, while identifying precisely which material claims in the
remaining 5 rules that evidence pack did **not** cover.

**As of 2026-07-19 (third pass), additional external reviewer evidence
for the same "A/an and the" page closed the specific gap previously
identified for `ARTICLE_A_AN`** (the sound-vs-letter mechanism and its
two named exceptions, `university`/`hour`, are now explicitly
confirmed) — see rule 1's section below. `ARTICLE_A_AN` is now proposed
`VERIFIED_DIRECTLY`, bringing the total to **8 of 12 rules proposed
`VERIFIED_DIRECTLY`, 4 of 12 remaining `PARTIALLY_VERIFIED`**.
Additional third-pass evidence for `BASIC_WORD_ORDER` was also recorded
(see rule 9 below) but, per explicit instruction, was **not** used to
upgrade that rule — two precisely-named claims remain uncovered even
after this additional evidence. No rule was proposed for
`VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`: every citation in both
passes' packs is Cambridge itself (the project's designated primary
source), directly reached, so the "primary source was unreachable, an
alternate was used instead" condition that tier describes does not
apply anywhere in this document.

See `grammar-mvp-publication-readiness-2026-07-18.md` for the proposed
first-launch set this reassessment now supports.

## Evidence-class taxonomy (introduced 2026-07-18, second pass)

Three, and only three, evidence classes appear anywhere in this
document. They are never conflated:

| Class | Meaning | Used in this document? |
| --- | --- | --- |
| **A — directly accessed by this Claude session** | This session's own `WebFetch`/`curl` opened the page and read it. | **Never** — `WebFetch` has been blocked (proxy `CONNECT` 403) every time it was tried, across three separate rounds (2026-07-17, 2026-07-18 first pass, 2026-07-18 second pass). No Class A evidence exists anywhere in this document. |
| **B — externally/directly verified by independent reviewer** | A human reviewer outside this session, not subject to this session's egress block, directly opened the authoritative page themselves and reported back which claims it supports. | Used in the "External independent direct-source verification" section below and in the per-rule entries dated 2026-07-18 (second pass). Always labeled "external reviewer" or "Class B," never described as this session's own access. |
| **C — search-index/snippet corroboration only** | `WebSearch` (this session's own tool) returned an indexed snippet, short quote, or paraphrase of a page, without the page itself being opened. | The evidence basis for the entire 2026-07-17 round and the 2026-07-18 first-pass round below — every "Publisher/Page/section" entry predating the second-pass update is Class C. |

Class B is not Class A. This document was not able to open any page
itself; a separate, external, independent reviewer did, and reported
results back for this document to record accurately.

## External independent direct-source verification (2026-07-18, second pass)

**Primary authoritative source organization: Cambridge Dictionary —
English Grammar Today.** An external independent reviewer — not this
Claude session, not subject to this session's `WebFetch` egress block —
reported directly accessing the following Cambridge Dictionary Grammar
pages and verifying the claims listed against each. This is **Class B**
evidence throughout: externally/directly verified by an independent
reviewer, recorded here, never described as accessed by this session.

| # | Page title | URL | Rules it was reported to support |
| --- | --- | --- | --- |
| 1 | A/an and the | `https://dictionary.cambridge.org/grammar/british-grammar/a-an-and-the` | `ARTICLE_A_AN` (fully covered as of 2026-07-19, third pass — see rule 1 below), `ARTICLE_THE_SPECIFIC`, `ARTICLE_ZERO_GENERAL`, `SINGULAR_PLURAL_ARTICLE_AGREEMENT` (baseline only) |
| 2 | Present simple (I work) | `https://dictionary.cambridge.org/grammar/british-grammar/present-simple-i-work` | `PRESENT_SIMPLE_THIRD_PERSON` |
| 3 | Past simple (I worked) | `https://dictionary.cambridge.org/grammar/british-grammar/past-simple-i-worked` | `PAST_SIMPLE_FORM` |
| 4a | Past simple or present perfect? | `https://dictionary.cambridge.org/grammar/british-grammar/past-simple-or-present-perfect` | `PAST_SIMPLE_VS_PRESENT_PERFECT` |
| 4b | Present perfect simple (I have worked) | `https://dictionary.cambridge.org/grammar/british-grammar/present-perfect-simple-i-have-worked` | `PAST_SIMPLE_VS_PRESENT_PERFECT` |
| 5 | Modality: forms | `https://dictionary.cambridge.org/grammar/british-grammar/modality-forms` | `MODAL_BASE_VERB` |
| 6a | At, in and to (movement) | `https://dictionary.cambridge.org/grammar/british-grammar/at-in-and-to-movement` | `BASIC_PREPOSITION_PATTERNS` (arrive at/in only) |
| 6b | To | `https://dictionary.cambridge.org/grammar/british-grammar/to` | `BASIC_PREPOSITION_PATTERNS` (listen to only) |
| 6c | Phrasal verbs and multi-word verbs | `https://dictionary.cambridge.org/grammar/british-grammar/phrasal-verbs-and-multi-word-verbs` | `BASIC_PREPOSITION_PATTERNS` (general "these are lexical, fixed constructions" framing only) |
| 7a | Word order and focus | `https://dictionary.cambridge.org/grammar/british-grammar/word-order-and-focus_2` | `BASIC_WORD_ORDER` (SVO + flexibility framing only) |
| 7b | Word order: structures | `https://dictionary.cambridge.org/grammar/british-grammar/word-order-structures` | `BASIC_WORD_ORDER` (SVO + flexibility framing only) |
| 8a | Do | `https://dictionary.cambridge.org/grammar/british-grammar/do` | `DO_DOES_DID_QUESTIONS_NEGATIVES` |
| 8b | Not | `https://dictionary.cambridge.org/grammar/british-grammar/not` | `DO_DOES_DID_QUESTIONS_NEGATIVES` |
| 9 | Countable (dictionary entry) | `https://dictionary.cambridge.org/dictionary/english/countable` | `COUNTABLE_UNCOUNTABLE` (general countable/uncountable framework only, not individual nouns) |
| 10 | Adverbs and adverb phrases: position (2026-07-19, third pass) | `https://dictionary.cambridge.org/grammar/british-grammar/adverbs-and-adverb-phrases-position` | `BASIC_WORD_ORDER` (core mid-position/after-`be` mechanism only — recorded but explicitly not used to upgrade this rule, per instruction; see rule 9 below for the two claims that remain uncovered) |

### Methodology applied to this pack: material-claim coverage, not automatic upgrade

Per the explicit instruction this round, a rule is **not** upgraded
merely because a URL exists against it. Each rule's actual content in
`grammar-rules.data.ts` was re-read and broken into its distinct,
separately-taught material claims (the mechanism the `formula` field
encodes; any named exceptions with their own worked example; any
curated list of individually-taught items). A rule is proposed
`VERIFIED_DIRECTLY` only when the reported reviewer coverage explicitly
addresses that rule's **primary, most-tested mechanism** — the thing
most of its `INCORRECT`/`CORRECT` examples actually test. Where a rule
is built around several **co-equal, independently-taught items**
(a curated list of prepositions, a curated list of uncountable nouns, a
closed list of exception nouns) and the reported coverage names only
some of them, the rule stays `PARTIALLY_VERIFIED` and the uncovered
items are named precisely — the same standard already applied to the
`BASIC_PREPOSITION_PATTERNS`/`COUNTABLE_UNCOUNTABLE` per-item tables
below.

**Result after the second pass: 7 of 12 rules proposed
`VERIFIED_DIRECTLY`; 5 of 12 remain `PARTIALLY_VERIFIED`, each with the
specific uncovered claim named. After the 2026-07-19 third pass
(additional evidence for `ARTICLE_A_AN` and `BASIC_WORD_ORDER`, see
their sections below): 8 of 12 proposed `VERIFIED_DIRECTLY`, 4 of 12
remain `PARTIALLY_VERIFIED`.** See each rule's own section below for the
reasoning, and
`grammar-mvp-publication-readiness-2026-07-18.md` for the consolidated
12-row matrix. **This is a proposal only — no `sourceVerificationStatus`
value in production has been changed.**

## 2026-07-18 re-verification round (first pass, `WebSearch`-only) — summary

A fresh, independent re-verification pass was run today against all 12
rules (see per-rule sections below for what was re-checked). Findings:

- **`WebFetch` direct-page access retested and reconfirmed blocked**,
  identically to 2026-07-17: `dictionary.cambridge.org`,
  `learnenglish.britishcouncil.org`, `en.wikipedia.org` (control), and
  `web.archive.org` (control, tried as an alternate route to a cached
  copy of a blocked page — also blocked, not attempted as a policy
  workaround, only as a further characterization of the block) all
  failed today, the same as the five domains tested on 2026-07-17. This
  is a stable, repeated finding across two independent sessions on two
  different days, not a one-off. `VERIFIED_DIRECTLY` and
  `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE` remain categorically
  unreachable in this environment.
- **No factual contradiction found** in any of the 12 rules' content
  (`grammar-rules.data.ts`) against any authoritative source consulted
  today. No content edit was made as a result of this round.
- **Both evidence gaps explicitly flagged in the prior round are now
  resolved at the `PARTIALLY_VERIFIED` tier** (still snippet-based, not
  a direct read, so the *tier* is unchanged, but the evidence backing it
  is now materially stronger):
  - `good at` (rule 8, `BASIC_PREPOSITION_PATTERNS`) — a dedicated
    British Council page, "Adjectives and prepositions," was surfaced
    this round by `WebSearch`, and its returned snippet confirms the
    adjective+`at` skill/ability pattern with the source's own quoted
    example "I was never very good at sports." The page itself was
    **not** opened directly (`WebFetch` remains blocked); this is
    snippet evidence, not a direct read. Previously this pattern had no
    dedicated-page citation at all.
  - `listen to` (rule 8) — a dedicated Cambridge Grammar page, "Hear or
    listen (to)?", was surfaced this round by `WebSearch`, and its
    returned snippet confirms `to` is mandatory before an object ("you
    cannot 'listen something'"). Again, snippet evidence only, not a
    direct read. Previously only the page's existence (not its content)
    was known.
  - `feedback` (rule 11, `COUNTABLE_UNCOUNTABLE`) — this round's search
    surfaced Oxford Learner's Dictionaries' own `[no plural]` label on
    the word, plus British Council/Cambridge's general uncountable-noun
    framework explicitly listing it. Previously no page confirmed this
    specific noun individually.
- **This does not change the production publication decision.** Per
  `decisions.md` item #2, source verification reaching
  `VERIFIED_DIRECTLY` or `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`
  is a **hard, non-overridable publication gate** — `PARTIALLY_VERIFIED`
  "forbids publish outright, no override," regardless of how many
  independent snippets corroborate a claim. Stronger `PARTIALLY_VERIFIED`
  evidence is still `PARTIALLY_VERIFIED`. See
  `grammar-mvp-publication-readiness-2026-07-18.md` for the full
  publication-readiness report this round produced.
- **No database change, publication, deployment, resolver activation, or
  content edit was made this round** — this is a read-only
  re-verification pass; see the report above for the explicit
  confirmation.

## Verification status tiers (this round's correction)

| Status | Meaning |
| --- | --- |
| `VERIFIED_DIRECTLY` | The official page itself was opened and its content read directly, and it directly confirms the claim. |
| `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE` | The primary publisher's page could not be opened, but an available official page from another established source (Cambridge/Oxford/etc.) was opened directly and confirms the claim. |
| `PARTIALLY_VERIFIED` | Only a search-engine-indexed snippet, a secondary retelling, or a source that confirms part but not all of the claim. |
| `NOT_VERIFIED` | No source found that confirms the claim at all. |

**Every one of the 12 rules is `PARTIALLY_VERIFIED` in this pass** — see
below for why `VERIFIED_DIRECTLY`/`VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`
were attempted and found unreachable, not skipped.

## Why the status is `PARTIAL`, not `DONE`

The previous version of this document marked overall status `DONE` and
attributed the earlier round's snippet-only sourcing to British Council's
site specifically returning HTTP 403 to the fetch tool. **That
explanation was incomplete and has been corrected.** This round attempted
direct page reads again, this time also against Cambridge Dictionary,
Oxford Learner's Dictionaries, and — as a control — Wikipedia and
Google, none of which have any known bot-protection reputation like
British Council's. All of them failed identically:

```
$ curl --cacert /root/.ccr/ca-bundle.crt -x $HTTPS_PROXY \
    https://dictionary.cambridge.org/grammar/british-grammar/present-simple-i-work
curl: (56) CONNECT tunnel failed, response 403

$ curl --cacert /root/.ccr/ca-bundle.crt -x $HTTPS_PROXY \
    https://en.wikipedia.org/wiki/English_verbs
curl: (56) CONNECT tunnel failed, response 403

$ curl --cacert /root/.ccr/ca-bundle.crt -x $HTTPS_PROXY \
    https://www.google.com
curl: (56) CONNECT tunnel failed, response 403
```

Per this session's own proxy documentation (`/root/.ccr/README.md`):
*"403 / 407 from the proxy: The destination host is not allowed by your
organization's egress policy for this session. Do not retry or route
around it."* This is a **session-level egress policy block on direct
page fetches to external hosts generally**, confirmed host-agnostic by
testing five unrelated domains, not a British-Council-specific
bot-protection issue as previously stated. `WebFetch` (and raw `curl`
through the same proxy) cannot reach *any* external page in this
session — so `VERIFIED_DIRECTLY` and `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`
are categorically unreachable here for every rule, not just the ones
citing British Council.

`WebSearch` is a separate, non-proxied channel and does still return
indexed content — sometimes multiple independent dedicated pages per
topic, occasionally close paraphrase or short quotes of the source page.
That is the ceiling of what this session can produce: `PARTIALLY_VERIFIED`,
never better, until either the egress policy changes or a different tool
with fetch access is available. **This is reported as a real, named
limitation, not hidden or worked around** — per the proxy documentation's
own instruction not to retry or route around a policy block.

Retrieved via `WebSearch` on **2026-07-17**, restricted primarily to
`learnenglish.britishcouncil.org`, `dictionary.cambridge.org`, and (new
this round) `oxfordlearnersdictionaries.com`/`elt.oup.com`, per the
requested source priority. No blog or non-established source used as a
primary citation.

## External URL accessibility

All 29 external URLs cited below share two domains
(`dictionary.cambridge.org`, `learnenglish.britishcouncil.org`), plus 2
new URLs on `oxfordlearnersdictionaries.com`/`elt.oup.com` this round.
Representative URLs from **both** of the original domains, **plus**
Oxford Learner's Dictionaries, Wikipedia, and Google as controls, were
tested directly this round; all failed at the network `CONNECT` stage
before reaching any web server:

| Domain tested | Representative URL | Result |
| --- | --- | --- |
| `dictionary.cambridge.org` | `/grammar/british-grammar/present-simple-i-work` | **BLOCKED** — proxy `CONNECT` 403 |
| `dictionary.cambridge.org` | `/grammar/british-grammar/modality-forms` | **BLOCKED** — proxy `CONNECT` 403 |
| `dictionary.cambridge.org` | `/grammar/british-grammar/nouns-countable-and-uncountable` | **BLOCKED** — proxy `CONNECT` 403 |
| `dictionary.cambridge.org` | `/grammar/british-grammar/nouns-singular-and-plural` | **BLOCKED** — proxy `CONNECT` 403 |
| `learnenglish.britishcouncil.org` | `/grammar/english-grammar-reference/articles-the-or-no-article` | **BLOCKED** — proxy `CONNECT` 403 |
| `oxfordlearnersdictionaries.com` | `/us/definition/english/news_1` | **BLOCKED** — proxy `CONNECT` 403 |
| `en.wikipedia.org` (control, no known bot protection) | `/wiki/English_verbs` | **BLOCKED** — proxy `CONNECT` 403 |
| `www.google.com` (control) | `/` | **BLOCKED** — proxy `CONNECT` 403 |

**All classified as `BLOCKED` — session egress policy, not per-site
`403`/bot-protection, and not `NOT FOUND`.** Because the block occurs at
the `CONNECT` tunnel stage (before any TLS handshake or HTTP request
reaches the destination), it is impossible from inside this session to
distinguish "page exists and would return 200" from "page doesn't
exist" for any specific URL — the block is uniform and host-agnostic,
confirmed by the five domains above. Re-testing each of the remaining
~23 individual URLs would return the identical `CONNECT` failure and add
no new information, so they are not each re-tested; they carry the same
classification by the confirmed general policy, not by individual
inspection. **No `REDIRECTED` or `NOT FOUND` result is reported for any
URL in this document** — the session cannot currently produce either
finding, only the uniform `BLOCKED` one. All URLs below are otherwise
syntactically well-formed and match real search-result links returned
by `WebSearch` for their respective topics (a weaker signal than an HTTP
status, but not fabricated — each URL is copied from an actual
`WebSearch` result, not guessed).

---

## 1. `ARTICLE_A_AN`

- **Publisher:** British Council LearnEnglish
- **Page/section:** "Articles: 'a', 'an', 'the'" (A1-A2 grammar) — `https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2-grammar/articles-a-an-the`; "The indefinite article: 'a' and 'an'" — `https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/the-indefinite-article-a-and-an`
- **Topic confirmed:** a/an for first mention or one-of-a-group; choice between a/an depends on the **sound**, not the letter, that follows; a/an typically used when stating someone's job.
- **Exact claim supported:** shortExplanationRu/explanationRu's core claim ("consonant sound → a, vowel sound → an") and the "she's a scientist" job-statement usage.
- **Retrieval date:** 2026-07-17
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED`
- **Citation note:** search-engine indexed snippet, not a direct page fetch — see "Why the status is PARTIAL" above; the direct-fetch attempt against this domain failed at the proxy `CONNECT` stage, not a site-specific block. Content is standard, uncontroversial A1 grammar, cross-checked against the phrasing pattern British Council uses elsewhere.
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): `PARTIALLY_VERIFIED`.** The reviewer's reported coverage of "A/an and the" (`https://dictionary.cambridge.org/grammar/british-grammar/a-an-and-the`) confirms only that a/an are indefinite articles/determiners used with singular countable noun phrases for indefinite reference. It does **not** report confirming this rule's primary, most-tested mechanism — **the choice between `a` and `an` is governed by the following sound, not the following letter** — nor the two specific worked exceptions the rule teaches (`university`, consonant /j/ sound → `a`; `hour`, silent `h` → `an`). Since the sound-vs-letter mechanism is literally what the rule's `formula` field states and what most of its examples test, this was not a minor ancillary detail — held at `PARTIALLY_VERIFIED` pending that specific mechanism being directly confirmed. **Superseded by the 2026-07-19 update below.**
- **Updated status per additional external reviewer evidence, Class B (2026-07-19, third pass): `VERIFIED_DIRECTLY`.** The same page, "A/an and the," was reported with additional specific detail this pass, directly closing the exact gap identified above:
  - *"a is used before a consonant sound"* / *"an is used before a vowel sound"* — directly confirms the rule's core mechanism: **sound, not letter, governs the choice.**
  - *"some vowel-letter words begin with a consonant sound," explicit example "a university"* — directly confirms the rule's own `university` exception (consonant /j/ sound despite the vowel letter `u`) — this is the exact worked example the rule's own `explanationRu` already uses ("a university (звук согласной /j/, хотя u — гласная буква)").
  - *"some consonant-letter words begin with a vowel sound," explicit example "an hour"* — directly confirms the rule's own `hour` exception (silent `h`, vowel sound) — again the exact worked example the rule's own `explanationRu` already uses ("an hour (звук гласной, хотя h — согласная буква)").
  - *"a/an are used only with singular countable nouns"* — directly confirms the singular-countable-noun scope, consistent with and extending the 2026-07-18 pack's general indefinite-reference confirmation from the same page.
  - **All material claims in this rule's final reviewed content are now covered**: indefinite/singular-countable usage (general, already confirmed 2026-07-18), the sound-vs-letter selection mechanism (newly confirmed), and both of the rule's two specific named exceptions, `university` and `hour` (newly confirmed, word-for-word matching the rule's own worked examples). No unsupported material claim remains. Proposed `VERIFIED_DIRECTLY`, not `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE` (Cambridge, the primary source, was directly reached).

## 2. `ARTICLE_THE_SPECIFIC`

- **Publisher:** British Council LearnEnglish + (new this round) Oxford Learner's Dictionaries
- **Page/section:** British Council "Articles: 'a', 'an', 'the'"; "The definite article: 'the'" — `https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/definite-article`; Oxford "definite article" usage note — `https://www.oxfordlearnersdictionaries.com/definition/english/definite-article`
- **Topic confirmed:** *the* is used when the listener already knows which thing is meant — because it was mentioned before, is easily understood from context, or is the only one of its kind; Oxford's search snippet additionally distinguishes this **specific/identifiable** use from *the*'s separate general-class use ("The dolphin is an intelligent animal") — confirming this rule is **not** reducible to "already mentioned → always *the*"; shared/identifiable reference is the operative condition, not mere prior mention.
- **Exact claim supported:** the "already mentioned / unique / obvious from context" explanation in `explanationRu`, and specifically the requirement that the reference be **shared/identifiable to both speakers**, not just previously said aloud once.
- **Retrieval date:** 2026-07-17
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED`
- **Citation note:** two independent publishers' indexed snippets converge on the same shared-reference condition, which is a stronger within-tier signal than a single-publisher snippet, but neither page was opened directly (same proxy block as above) — still `PARTIALLY_VERIFIED`, not `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`, since that tier requires an actual direct read, not just a second snippet.
- **Content re-check this round:** confirmed the current draft in `grammar-mvp-decision-pack.md` already states three explicit conditions (previously mentioned / unique / clear from context) and does not assert "mentioned once → always *the*" as a standalone rule — no wording change needed, only the source status above.
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): `VERIFIED_DIRECTLY`.** The reviewer's reported coverage of "A/an and the" (`https://dictionary.cambridge.org/grammar/british-grammar/a-an-and-the`) explicitly confirms *the*'s use "for identifiable/specific/shared-known reference in the relevant beginner-level cases" — this is the rule's entire primary claim; the three specific routes to identifiability (previously mentioned / unique / specified by a following phrase) are different instances of that one shared/identifiable-reference condition, not separately-taught sub-claims requiring independent citation. No material claim in this rule is left uncovered.

## 3. `ARTICLE_ZERO_GENERAL`

- **Publisher:** British Council LearnEnglish + (new this round, second independent source as required) Oxford Learner's Dictionaries / Oxford University Press ELT
- **Page/section:** British Council "Articles: 'the' or no article" — `https://learnenglish.britishcouncil.org/grammar/a1-a2-grammar/articles-the-or-no-article`; Oxford "definite article" note (general-class use) — `https://www.oxfordlearnersdictionaries.com/definition/english/definite-article`; OUP ELT grammar exercise reference (articles: a/an, the, no article) — `https://elt.oup.com/student/englishfile/intermediate3/grammar/file03/nef_int_grammar03_b03`
- **Topic confirmed:** when talking about things in general, plural or uncountable nouns take **no article** ("We have to protect wild animals," "I love Japanese food"); *the* is reserved for a specific subset within the general class, not the general class itself.
- **Exact claim supported:** the core zero-article-for-generalization rule, now cross-checked by a second independent publisher rather than resting on British Council alone.
- **Retrieval date:** 2026-07-17
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED` (upgraded from the earlier single-source citation — now two independent publishers, still snippet-based, not a direct read)
- **Content re-check this round:** the three worked examples in `grammar-mvp-decision-pack.md` (`Compliance is important...`, `We need evidence...`, `Regulators usually check...`) already carry explicit `(context: ...)` annotations distinguishing the general reading from a specific one — this satisfies the requirement that examples "unambiguously signal general meaning," no wording change needed.
- **`grammar-rules-human-review.md` decision note:** this rule's second-source gap (the original reviewer concern) is now addressed; see that document for whether the `REVISE` recommendation is lifted.
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): `VERIFIED_DIRECTLY`.** The reviewer's reported coverage of "A/an and the" explicitly confirms both zero-article-for-general-meaning conditions (plural nouns, and uncountable nouns) **and** explicitly names the exact four-way comparison this rule's `explanationRu` is built around ("a report / the report / reports / the reports") as supported. Since that comparison already encodes, by construction, that a singular countable noun takes `a` (not a bare form) even in general use, the rule's "singular countable cannot drop its determiner just because the meaning is general" constraint is covered as a direct consequence of the confirmed four-way table, not asserted as a separately-sourced claim beyond it.

## 4. `PRESENT_SIMPLE_THIRD_PERSON`

- **Publisher:** British Council LearnEnglish + Cambridge Dictionary Grammar
- **Page/section:** British Council "Present simple" — `https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/present-simple`; Cambridge "Present simple (I work)" — `https://dictionary.cambridge.org/grammar/british-grammar/present-simple-i-work`; Cambridge "Have" — `https://dictionary.cambridge.org/us/grammar/british-grammar/have`; Cambridge "Do" — `https://dictionary.cambridge.org/us/grammar/british-grammar/do`
- **Topic confirmed:** -s added for he/she/it; -es added after verbs ending in -ch, -s, -ss, -sh, -x, -z, and when a verb ends in -s or -z the letter is doubled before -es (e.g. quiz → quizzes — a more precise version of the spelling rule than the earlier draft stated); `have → has`, `do → does` as irregular third-person forms, explicitly confirmed ("Have is an irregular verb... The present simple third person singular is has"; same pattern for do/does).
- **Exact claim supported:** the -es-after-sibilants detail (now including the quiz→quizzes doubling nuance) and the have→has/do→does irregulars in `explanationRu`.
- **Retrieval date:** 2026-07-17
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED`
- **Citation note:** two independent publishers converge, and this round's search surfaced a more precise spelling detail (consonant-doubling before -es for verbs already ending in -s/-z) than the previous pass found — added to the sourceRefs note; still snippet-based, no direct read achieved.
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): `VERIFIED_DIRECTLY`.** The reviewer's reported coverage of "Present simple (I work)" (the same URL already cited above) explicitly confirms this rule's primary mechanism: base verb generally, third-person singular takes `-s`/`-es` per spelling rules. Caveat: the reported coverage describes this only as "spelling rules" and does not itself separately name the `have → has`/`do → does` irregular forms (which are lexical suppletion, not a spelling rule) — those two irregulars are not re-confirmed by name in this pack, though this session's own Class C snippet from the identical URL (above) already quotes Cambridge's own text stating them explicitly ("Have is an irregular verb... has"). Given the rule's central, most-tested mechanism is explicitly confirmed and the two irregulars are independently corroborated at Class C from the same page, this rule is proposed `VERIFIED_DIRECTLY` rather than held back for a caveat this minor — but the caveat is recorded here rather than silently dropped.

## 5. `PAST_SIMPLE_FORM`

- **Publisher:** British Council LearnEnglish
- **Page/section:** "Past simple" — `https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/past-simple`; "Irregular verbs" — `https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/irregular-verbs`
- **Topic confirmed:** regular verbs add -ed/-d; irregular verbs have unpredictable forms that must be learned individually (example given: wake → woke, break → broke).
- **Exact claim supported:** the regular/irregular split in `explanationRu`; informed the decision to drop the previously-stated "~150 irregular verbs" figure (not stated by this source, and not needed for a learner-facing explanation).
- **Retrieval date:** 2026-07-17
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED`
- **Citation note:** single-publisher snippet, not cross-checked by a second source this round (not one of the items the current review round required a second source for) — noted as a residual gap, same class as the pre-correction `ARTICLE_ZERO_GENERAL` gap, but not separately flagged since the content risk is lower (regular/irregular split is uncontroversial, widely-taught A1 content).
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): `VERIFIED_DIRECTLY`.** The reviewer's reported coverage of "Past simple (I worked)" (`https://dictionary.cambridge.org/grammar/british-grammar/past-simple-i-worked`) explicitly confirms affirmative Past Simple verb forms and the regular/irregular split — this rule's primary mechanism. Caveat: the specific spelling sub-rules (`-e` → `+d`; consonant+`y` → `-ied`; single-vowel+consonant → doubled+`-ed`) and the curated frequent-irregular-verb list are not individually itemized in the reported coverage; those remain corroborated only at Class C (British Council "Irregular verbs" page, cited above). This does not block `VERIFIED_DIRECTLY` here since the primary regular/irregular mechanism itself is explicitly confirmed and the sub-rules are standard elaborations of it, not separately-taught exceptions.

## 6. `PAST_SIMPLE_VS_PRESENT_PERFECT`

- **Publisher:** British Council LearnEnglish
- **Page/section:** "Present perfect" — `https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/present-perfect`; "Talking about the past" — `https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/talking-about-past`
- **Topic confirmed:** **"You cannot use present perfect with a fixed time (e.g. yesterday, last Thursday, 3.00) but you can use it with *since* + a fixed past time"**; *since* creates an open time frame from a past point to now; present perfect links a past event to a present consequence, whereas past simple presents a completed action as historical fact.
- **Exact claim supported:** the strongest single citation in the set — directly and explicitly supports "Present Perfect does not combine with finished-time markers like yesterday."
- **Retrieval date:** 2026-07-17
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED`
- **Content re-check this round:** confirmed the current draft's wording — "signal words... надёжные, но не абсолютные ориентиры" / "итоговое решение всегда зависит от контекста" — does **not** present signal words as an infallible classifier and keeps the context caveat intact; no wording change needed. The since/for explanation stays framed around whether the situation continues now, not the word alone.
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): `VERIFIED_DIRECTLY`.** The reviewer's reported coverage of "Past simple or present perfect?" and "Present perfect simple (I have worked)" is the most thorough and explicit in the entire pack: Present Perfect covers past situations/events connected with the present or time up to now; Past Simple covers completed past-time framing; the four Present Perfect use-categories (current result, life experience, unfinished period, continuing-to-present) are explicitly named as legitimate categories; fixed finished-past-time reference is explicitly stated as incompatible with ordinary Present Perfect use; and — matching this rule's own explicit caveat word-for-word — signal words are explicitly reported as **not** a universal classifier, with an explicit instruction against the "date = Past Simple / no date = Present Perfect" oversimplification this rule's own `explanationRu` already guards against (the "I lost my passport during the trip" no-date-but-Past-Simple example). Every material claim and every caveat in this rule is covered.

## 7. `MODAL_BASE_VERB`

- **Publisher:** Cambridge Dictionary Grammar
- **Page/section:** "Modality: forms" — `https://dictionary.cambridge.org/us/grammar/british-grammar/modality-forms`; "Modal verbs and modality" — `https://dictionary.cambridge.org/us/grammar/british-grammar/modal-verbs-and-modality`; "Ought to" — `https://dictionary.cambridge.org/grammar/british-grammar/ought-to`
- **Topic confirmed:** core modal verbs (can, could, may, might, will, shall, would, should, must) are followed directly by the base form, with **no to-infinitive form, -s form, past form, or -ed form**; explicit incorrect examples given by the source itself: *"I'd love to can see..."* and *"They musted sell..."*; `ought to` is a semi-modal that, unlike core modals, **is** followed by `to`.
- **Exact claim supported:** the entire rule pattern, and specifically the `ought to` exception.
- **Retrieval date:** 2026-07-17
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED`
- **Citation note:** search-engine indexed snippet directly quoting Cambridge's own incorrect-usage examples (reused as inspiration for two incorrect/correct pairs, rewritten in our own compliance-flavoured examples, not copied verbatim) — no direct page read achieved.
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): `VERIFIED_DIRECTLY`.** The reviewer's reported coverage of "Modality: forms" (`https://dictionary.cambridge.org/grammar/british-grammar/modality-forms`) explicitly confirms this rule's primary, most-tested mechanism: modal verbs are followed by the base form. Caveat: the reported coverage does not itself separately name the `ought to` exception (a single, specifically-taught EXCEPTION with its own worked example in the rule content) — that exception remains corroborated only at Class C, from this session's earlier snippet quote of the identical URL (above: "the exceptions being ought to, have to and used to"). Given the primary mechanism — which 3 of the rule's 4 non-exception examples test — is explicitly confirmed, and the one named exception is independently corroborated (if not re-stated) from the same page, this rule is proposed `VERIFIED_DIRECTLY` with the caveat recorded rather than silently dropped.

## 8. `BASIC_PREPOSITION_PATTERNS`

Each of the 7 curated patterns checked **individually** this round, per
the explicit instruction not to treat one general citation as covering
all seven if it only covers part of them.

| Pattern | Verification status (Class C, current DB-aligned value) | Evidence (Class C) | External reviewer coverage (Class B, 2026-07-18 second pass) |
| --- | --- | --- | --- |
| `comply with` | `PARTIALLY_VERIFIED` | Confirmed via Cambridge Dictionary's "COMPLY" entry (`https://dictionary.cambridge.org/dictionary/english/comply`) — general-use dictionary entry, not a dedicated grammar-pattern page; weaker within-tier evidence than the others below. | Not reported covered by the reviewer pack — remains Class C only. |
| `depend on` | `PARTIALLY_VERIFIED` | Confirmed via a **dedicated** Cambridge Grammar page, "Word patterns: depend on something" (`https://dictionary.cambridge.org/grammar/british-grammar/word-patterns-depend-on-something`) — a dedicated pattern page is stronger within-tier evidence than a general dictionary entry. | Not reported covered by the reviewer pack — remains Class C only. |
| `responsible for` | `PARTIALLY_VERIFIED` | Confirmed via a dedicated Cambridge Grammar page, "Prepositions: responsible" (`https://dictionary.cambridge.org/grammar/british-grammar/prepositions-responsible`). | Not reported covered by the reviewer pack — remains Class C only. |
| `interested in` | `PARTIALLY_VERIFIED` | Confirmed via two dedicated Cambridge Grammar pages, "Word patterns: interested" and "Prepositions: interest" (`.../word-patterns-interested`, `.../prepositions-interest`) — this round's search surfaced a second dedicated page beyond what the original pass cited. | Not reported covered by the reviewer pack — remains Class C only. |
| `good at` | `PARTIALLY_VERIFIED` — **evidence gap closed 2026-07-18 (first pass, Class C)** | **2026-07-18:** confirmed via a dedicated British Council page, "Adjectives and prepositions" (`https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/adjectives-prepositions`) — its own text: "We use adjective + at to talk about things that we do well or badly," with the source's own example "I was never very good at sports." Previously (2026-07-17) this pattern had no dedicated-page citation and was the weakest-evidenced item in this set; that gap is now closed at the `PARTIALLY_VERIFIED` tier (still snippet-based, not a direct read). | Not reported covered by the reviewer pack — remains Class C only (this British Council page is outside the pack's all-Cambridge citation set). |
| `listen to` | `PARTIALLY_VERIFIED` — **evidence gap closed 2026-07-18 (first pass, Class C)** | **2026-07-18:** confirmed via a dedicated Cambridge Grammar page, "Hear or listen (to)?" (`https://dictionary.cambridge.org/us/grammar/british-grammar/hear-or-listen-to`) — its own text: "you cannot 'listen something' (without 'to')... the preposition is mandatory for the direct object form." Previously (2026-07-17) only the page's existence was known, not its content; that gap is now closed at the `PARTIALLY_VERIFIED` tier. | **Reported covered** — the reviewer's "To" page (`https://dictionary.cambridge.org/grammar/british-grammar/to`) is reported to support `listen to` specifically. |
| `arrive at/in` | `PARTIALLY_VERIFIED` | Confirmed via a dedicated Cambridge Grammar page, "Word patterns: arrive somewhere" (`https://dictionary.cambridge.org/grammar/british-grammar/word-patterns-arrive-somewhere`), plus "At, in and to (movement)" — explicitly confirms **arrive at** a point/building vs. **arrive in** a city/country, and confirms **arrive home/here/there takes no preposition at all**, the nuance added to the draft's edge cases. Re-confirmed 2026-07-18 with the same finding, plus a direct quote for the arrive-home no-preposition case. Strongest-evidenced pattern in this set across both rounds. | **Reported covered** — the reviewer's "At, in and to (movement)" page (`https://dictionary.cambridge.org/grammar/british-grammar/at-in-and-to-movement`) is reported to confirm arrive at (point) vs. arrive in (city/country), matching the Class C finding exactly. |

- **Retrieval date:** 2026-07-17; re-verified 2026-07-18 first pass (`WebSearch`, Class C); external reviewer pack received 2026-07-18 second pass (Class B)
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED` — as of the first pass, all seven patterns have dedicated-page Class C evidence (none rest only on general/indirect confirmation).
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): remains `PARTIALLY_VERIFIED`.** This rule is explicitly built around **7 co-equal, independently-taught curated patterns** (the rule's own content states it is "не претендует на охват всех предлогов... curated набор"), not one central mechanism with minor variants. The reviewer pack reports direct coverage of only **2 of the 7** (`arrive at/in`, `listen to`) plus a general "prepositional verbs are lexical/fixed constructions" framing (from "Phrasal verbs and multi-word verbs") that supports the rule's own "learn as a whole unit, not by formula" framing but does not itself confirm any individual pattern's specific preposition. The remaining 5 patterns (`comply with`, `depend on`, `responsible for`, `interested in`, `good at`) are not reported covered by this pack and stay Class C only. Per the material-claim-coverage standard applied throughout this round, a rule built on several co-equal curated items is not upgraded on partial coverage — this rule stays `PARTIALLY_VERIFIED`, with the uncovered patterns named precisely above. The `grammar-rules-human-review.md` residual-concern note about `good at`/`listen to` is addressed at the evidence level for `listen to` (now Class B) but `good at` remains Class C only.

## 9. `BASIC_WORD_ORDER`

- **Publisher:** British Council LearnEnglish
- **Page/section:** "How often" — `https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/how-often`; "Where adverbials go in a sentence" — `https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/where-adverbials-go-sentence`
- **Topic confirmed:** adverbs of frequency usually go before the main verb, or between auxiliary and main verb; **"always"** is the exception among negatives, going *after* be/do + not; **"Adverb position in English is very flexible and you can put adverbs of frequency at the start of the sentence."**
- **Exact claim supported:** directly grounds the correction that fronted time/place adverbials are a legitimate stylistic option, not an automatic error; the *always*-in-negatives exception.
- **Retrieval date:** 2026-07-17
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED`
- **Citation note:** single-publisher snippet quoting the "very flexible" phrase closely (short quote, attributed); no direct page read achieved.
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): remains `PARTIALLY_VERIFIED`.** The reviewer's reported coverage of "Word order and focus" and "Word order: structures" confirms typical declarative subject-verb-object order and that deviations exist for information-structure/emphasis (supporting the rule's "stay explicitly basic, don't claim SVO is universal" framing). It does **not** report confirming this rule's actual most-tested content — **adverb-of-frequency placement** (before the main verb / after `to be`) and the `always`-in-negatives exception — which is what 3 of the rule's 3 `INCORRECT` examples test ("Always I check the documents," "I check always the documents," "She always is late for meetings" are all adverb-placement errors, not SVO-order errors). Since the rule's actual pedagogical substance is adverb placement, not bare SVO, this rule stays `PARTIALLY_VERIFIED` — the adverb-placement claim remains Class C only (British Council "How often"/"Where adverbials go in a sentence," cited above).
- **Additional external reviewer evidence recorded, Class B (2026-07-19, third pass) — explicitly NOT auto-upgraded, per instruction.** Cambridge Dictionary Grammar, "Adverbs and adverb phrases: position" (`https://dictionary.cambridge.org/grammar/british-grammar/adverbs-and-adverb-phrases-position`), reported to state: mid position is between subject and main verb; with multiple verbs, mid position is after the first auxiliary or modal; adverbs usually follow main verb `be`; frequency adverbs usually occur in mid position. Compared against this rule's exact final content:
  - **Now covered:** the core mid-position mechanism this rule's `formula` describes — adverb of frequency before the main verb, after `to be` — is directly supported. This maps onto all 3 of the rule's `INCORRECT` examples (all are mid-position placement errors, e.g. "She always is late" → "She is always late," and "with multiple verbs, mid position is after the first auxiliary" directly supports the negative-construction case "She doesn't usually eat lunch here").
  - **Still NOT covered, precisely — two distinct uncovered claims remain:**
    1. **The `always`-in-negatives claim** — this rule's `explanationRu` states `always` is placed differently from most other frequency adverbs in negative constructions ("«always» в отрицаниях — ещё одно исключение, стоит после be/do + not, тогда как большинство других наречий частоты — перед"). The new evidence's bullets are generic mid-position/after-auxiliary statements and do not single out `always` as behaving differently from other frequency adverbs in negatives at all — this specific claim is not named or supported by the new pack.
    2. **The fronted-adverbial-is-not-an-error claim** — this rule's `EXCEPTION` example ("Yesterday, I finished the report") and its explanatory text assert that fronting a time/place adverbial for emphasis is a legitimate stylistic option, not an automatic error. The new pack is entirely about frequency-adverb position *categories* (front/mid/end for adverbs generally) and does not address whether sentence-initial fronting of a time/place adverbial is acceptable or an error — this claim remains unsupported by the new pack.
  - **Per explicit instruction, this rule is not automatically upgraded on this evidence.** Even setting that instruction aside, the two claims above would independently keep this rule below full coverage under the material-claim-coverage standard applied throughout this document — the new evidence closes one real gap (core mid-position/after-`be` mechanism) but leaves two more, precisely named, open. **Verification status remains `PARTIALLY_VERIFIED`.**

## 10. `DO_DOES_DID_QUESTIONS_NEGATIVES`

- **Publisher:** Cambridge Dictionary Grammar
- **Page/section:** "Do — English Grammar Today" — `https://dictionary.cambridge.org/us/grammar/british-grammar/do`; "Forming negative statements, questions and imperatives" — `https://dictionary.cambridge.org/grammar/british-grammar/forming-negative-statements-questions-and-imperatives`
- **Topic confirmed:** `do`/`does`/`did` form questions and negatives for main verbs (except `be` and some uses of `have`); the main verb after `do`-support stays in its **base (uninflected) form** — Cambridge's own examples: "do go," "does work," "did say."
- **Exact claim supported:** the entire rule pattern and the double-marking prohibition.
- **Retrieval date:** 2026-07-17
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED`
- **Citation note:** single-publisher snippet, no direct page read achieved.
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): `VERIFIED_DIRECTLY`.** The reviewer's reported coverage of "Do" and "Not" (both cited above, same URLs) explicitly confirms `do`/`does`/`did` functioning as auxiliaries in simple-tense questions and negatives, and that the lexical verb remains in base form after the auxiliary — this is the rule's entire claim set (the double-marking prohibition is the same fact stated the other way round). No separately-taught sub-exception exists in this rule beyond that single mechanism. Full coverage.

## 11. `COUNTABLE_UNCOUNTABLE`

Each curated noun checked **individually** this round against Cambridge
Dictionary, per the explicit instruction not to rely on one general
"uncountable nouns" citation for the whole list.

| Noun | Verification status | Evidence |
| --- | --- | --- |
| information | `PARTIALLY_VERIFIED` | Confirmed uncountable; "piece(s) of information" given as the counting workaround. Dedicated Cambridge Grammar page. |
| advice | `PARTIALLY_VERIFIED` | Confirmed uncountable; "piece(s) of advice" counting workaround. Dedicated page. |
| evidence | `PARTIALLY_VERIFIED` | Confirmed uncountable, grouped by Cambridge with behavior/damage/equipment/furniture/knowledge as nouns "uncountable in English but may be countable in other languages" — directly relevant to RU-speaker interference, reused in the draft's rationale. |
| research | `PARTIALLY_VERIFIED` | Confirmed uncountable via a **dedicated** Cambridge "Countability: research" page. |
| equipment | `PARTIALLY_VERIFIED` | Confirmed uncountable via a dedicated "Countability: equipment" page; "a piece of equipment" for the singular-item workaround; cannot say "an equipment"/"equipments." |
| knowledge | `PARTIALLY_VERIFIED` | Confirmed uncountable via a dedicated "Countability: knowledge" page. |
| feedback | `PARTIALLY_VERIFIED` — **evidence gap closed 2026-07-18** | **2026-07-18:** confirmed via Oxford Learner's Dictionaries' own entry, which marks the word `[no plural]` (`https://www.oxfordlearnersdictionaries.com/definition/english/feedback`), corroborated by Cambridge's general uncountable-noun framework example set including "feedback" alongside "I'd appreciate some feedback on my work" (not "a feedback"/"feedbacks"). Previously (2026-07-17) no dedicated page had surfaced for this specific noun and it was the weakest-evidenced item in the list; that gap is now closed at the `PARTIALLY_VERIFIED` tier (dictionary-entry-sourced, not a dedicated Cambridge Grammar page, so still not the strongest possible citation within the tier — but no longer merely a search-tool paraphrase). |
| furniture | `PARTIALLY_VERIFIED` | Confirmed uncountable via a dedicated "Countability: furniture" page. |
| software | `PARTIALLY_VERIFIED` | Confirmed uncountable via a dedicated "Countability: software" page. |
| news | `PARTIALLY_VERIFIED` | Confirmed uncountable, singular-verb-taking ("The news is good") via a dedicated "News" grammar page — directly grounds the `SINGULAR_PLURAL_ARTICLE_AGREEMENT` resolver-safety correction too. |
| progress | `PARTIALLY_VERIFIED` | Confirmed uncountable via a dedicated "Countability: progress" page; typically used with "make." |
| work | `PARTIALLY_VERIFIED` — **dual-use, correctly flagged, not hidden** | Confirmed **uncountable** when it means effort/labor/study ("a lot of work to do") — no a/an, no plural — but **countable** in the distinct sense "a created piece" (painting/book/sculpture/composition), where "a work of art" and "works of art" are both correct. The draft's edge case already notes this dual behavior; this round's search confirms it is Cambridge's own stated distinction, not an invented nuance. |

- **Retrieval date:** 2026-07-17; re-verified 2026-07-18 first pass (all 12 nouns re-checked, `feedback` upgraded — see cell above; `work`'s dual-use distinction re-confirmed unchanged); external reviewer pack received 2026-07-18 second pass
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED` — as of the first pass, all 12 nouns are individually confirmed via dedicated/general Cambridge or Oxford pages; no noun in this list rests only on an unsourced search-tool paraphrase.
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): remains `PARTIALLY_VERIFIED`.** The reviewer's reported coverage of Cambridge's "Countable" dictionary entry (`https://dictionary.cambridge.org/dictionary/english/countable`) confirms the rule's general framework — countable nouns permit singular/plural + a/an, uncountable nouns behave differently, countability can depend on meaning/context — and explicitly supports the rule's own "usually uncountable in this meaning" caveat and its instruction not to overgeneralize a noun as globally uncountable. This is a general-framework claim, not an itemized one: the pack does not report the external reviewer separately confirming each of this rule's 11 individually-curated nouns (information, advice, evidence, research, equipment, knowledge, feedback, furniture, software, news, progress) or `work`'s specific dual-use behavior. Per the material-claim-coverage standard, a rule built around a curated list of co-equal specific items is not upgraded on general-framework coverage alone — this rule stays `PARTIALLY_VERIFIED`; each individual noun's uncountable status remains Class C only, per the per-noun table above.

## 12. `SINGULAR_PLURAL_ARTICLE_AGREEMENT`

- **Publisher:** Cambridge Dictionary Grammar
- **Page/section:** "Nouns: singular and plural" — `https://dictionary.cambridge.org/us/grammar/british-grammar/nouns-singular-and-plural`; "News" — `https://dictionary.cambridge.org/grammar/british-grammar/news`; "Species" — `https://dictionary.cambridge.org/dictionary/english/species`
- **Topic confirmed:** a/an marks a singular countable noun; a closed set of nouns end in -s but are grammatically singular — **academic subjects (economics, mathematics/maths, physics), physical activities (gymnastics, aerobics), diseases (measles, mumps), and "news"** all take a singular verb; "species"/"series" use the identical form for singular and plural.
- **Exact claim supported:** directly grounds the resolver-safety correction — a bare `-s`/`-es` suffix is not, by itself, reliable evidence of plurality; `business`, `class`, `analysis` (from the brief) belong to the same general caution even though they were not each individually confirmed by a dedicated Cambridge page in this pass — applied conservatively, not asserted as individually sourced.
- **Retrieval date:** 2026-07-17; re-verified 2026-07-18 first pass; external reviewer pack received 2026-07-18 second pass
- **Verification status (Class C, unchanged, current DB value):** `PARTIALLY_VERIFIED`
- **Citation note:** single-publisher snippet, no direct page read achieved; the specific `news`/`species` examples are dedicated-page-sourced (stronger within-tier), `business`/`class`/`analysis` are not (weaker, flagged explicitly rather than presented at equal confidence).
- **2026-07-18 first-pass re-check (Class C):** re-confirmed via Cambridge Grammar's "Nouns: singular and plural" page, which explicitly lists "classics, economics, mathematics/maths, physics" (academic subjects), "gymnastics and aerobics" (physical activities), "measles and mumps" (diseases), and "news" as the closed set of -s-ending-but-singular nouns — this matches the rule's list word-for-word. Also re-confirmed `species`/`series` as identical singular/plural forms (Cambridge + Oxford), and the "one of the + plural noun" construction taking a singular verb (Cambridge "One and one's" page: "One of the students **is** waiting," not "are"). No new source found for `business`/`class`/`analysis` specifically — that residual gap is unchanged from 2026-07-17, still applied conservatively rather than presented as individually sourced.
- **Proposed status per external reviewer pack, Class B (2026-07-18, second pass): remains `PARTIALLY_VERIFIED`.** The reviewer's reported coverage of "A/an and the" confirms a/an-only-with-singular, zero-article-for-general-plural, and singular-countable-normally-requires-a-determiner — the rule's baseline mechanism. It does **not** report confirming the rule's own explicitly-flagged, separately-taught claim: the closed list of -s-ending-but-grammatically-singular exception nouns (news, mathematics/maths, physics, economics, gymnastics, aerobics, measles, mumps, species, series) and the "one of the + plural noun" construction. That claim has its own dedicated `EXCEPTION` example in the rule content ("The news is good") and is not a minor detail of the baseline a/an-singular mechanism — it is the rule's own explicit resolver-safety warning that a bare `-s` suffix is not reliable evidence of plurality. The pack cited for this rule is "A/an and the" only, not the "Nouns: singular and plural"/"News"/"Species" pages the first-pass Class C citation already used for that specific claim (above). This rule stays `PARTIALLY_VERIFIED`; the exception-list and "one of the" claims remain Class C only.

---

## Consolidated matrix — proposed status per external reviewer evidence (2026-07-18 second pass + 2026-07-19 third pass)

**Proposals only — no `sourceVerificationStatus` value in production has
been changed.** Current, unchanged, actual DB value for all 12 rules
remains `PARTIALLY_VERIFIED`.

| `ruleCode` | Current DB value (Class C basis) | Proposed status (Class B external reviewer evidence) | Uncovered claim, if any |
| --- | --- | --- | --- |
| `ARTICLE_A_AN` | `PARTIALLY_VERIFIED` | `VERIFIED_DIRECTLY` (upgraded 2026-07-19, third pass) | None — sound-vs-letter mechanism and both `university`/`hour` exceptions now explicitly confirmed |
| `ARTICLE_THE_SPECIFIC` | `PARTIALLY_VERIFIED` | `VERIFIED_DIRECTLY` | None |
| `ARTICLE_ZERO_GENERAL` | `PARTIALLY_VERIFIED` | `VERIFIED_DIRECTLY` | None (four-way table explicitly covered) |
| `PRESENT_SIMPLE_THIRD_PERSON` | `PARTIALLY_VERIFIED` | `VERIFIED_DIRECTLY` | Minor: `have→has`/`do→does` not itemized by name (Class C corroborated, same URL) |
| `PAST_SIMPLE_FORM` | `PARTIALLY_VERIFIED` | `VERIFIED_DIRECTLY` | Minor: specific spelling sub-rules and irregular-verb list not itemized (standard elaboration of confirmed regular/irregular split) |
| `PAST_SIMPLE_VS_PRESENT_PERFECT` | `PARTIALLY_VERIFIED` | `VERIFIED_DIRECTLY` | None — most thorough coverage in the pack |
| `MODAL_BASE_VERB` | `PARTIALLY_VERIFIED` | `VERIFIED_DIRECTLY` | Minor: `ought to` exception not itemized by name (Class C corroborated, same URL) |
| `BASIC_PREPOSITION_PATTERNS` | `PARTIALLY_VERIFIED` | `PARTIALLY_VERIFIED` (no change) | 5 of 7 curated patterns not covered: `comply with`, `depend on`, `responsible for`, `interested in`, `good at` |
| `BASIC_WORD_ORDER` | `PARTIALLY_VERIFIED` | `PARTIALLY_VERIFIED` (no change — additional 2026-07-19 evidence recorded but not auto-upgraded, per instruction) | `always`-in-negatives claim and the fronted-adverbial-is-not-an-error claim — neither covered even by the additional third-pass evidence |
| `DO_DOES_DID_QUESTIONS_NEGATIVES` | `PARTIALLY_VERIFIED` | `VERIFIED_DIRECTLY` | None |
| `COUNTABLE_UNCOUNTABLE` | `PARTIALLY_VERIFIED` | `PARTIALLY_VERIFIED` (no change) | All 11 individually-curated nouns + `work`'s dual-use behavior — only the general framework is covered |
| `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | `PARTIALLY_VERIFIED` | `PARTIALLY_VERIFIED` (no change) | The closed -s-ending-but-singular exception list (news, mathematics, etc.) and "one of the + plural" construction |

**8 of 12 proposed `VERIFIED_DIRECTLY`; 0 proposed
`VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`; 4 of 12 proposed to
remain `PARTIALLY_VERIFIED`.** See
`grammar-mvp-publication-readiness-2026-07-18.md` for the proposed
first-launch set this supports (it does not, by itself, authorize
publishing even the 8 — see that document's gate discussion).

## Where sources disagreed or left ambiguity

No two consulted sources contradicted each other on any of the 12 rules
in this pass. Two areas of genuine internal nuance were surfaced (not a
disagreement between publishers, but a register/context distinction
within a single publisher's own guidance) and are reflected as
conservative, learner-facing caveats rather than hidden:

- **`much` vs. `a lot of`** (rule 11): Cambridge's own material notes
  `much`/`many` in affirmative clauses read as formal/literary (its own
  example: *"There is much concern about drug addiction"* flagged
  formal), while `a lot of`/`lots of` are the standard informal default
  for affirmatives — the revised draft picks the more common,
  conservative learner-facing framing (`a lot of` as the safe affirmative
  default) rather than asserting one register is simply "correct."
- **Fronted adverbials** (rule 9): British Council explicitly calls
  adverb position "very flexible," while also giving a strong default
  order — the revised draft states the default as a guideline and names
  the flexibility explicitly, rather than presenting the default as an
  absolute rule.

## What would move this from `PARTIAL` to `DONE`

A future pass with either (a) a relaxed egress policy for this session
allowing direct fetch of `dictionary.cambridge.org`,
`learnenglish.britishcouncil.org`, and `oxfordlearnersdictionaries.com`,
or (b) an alternative tool/connector with its own fetch access to those
domains, could upgrade each entry above from `PARTIALLY_VERIFIED` to
`VERIFIED_DIRECTLY` (or `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`
for the British-Council-only entries, using the already-identified
Cambridge/Oxford alternates).

**2026-07-18 first-pass update:** the three previously-weakest links
(`feedback` in rule 11, `good at`/`listen to` in rule 8) got
dedicated-page or dictionary-entry evidence at the `PARTIALLY_VERIFIED`
tier — no longer the priority items for a future direct-fetch pass.

**2026-07-18 second-pass update (external reviewer pack):** this
session's own `WebFetch` block is unchanged (still fully blocked, see
above) — this document cannot itself open any page directly. However,
an external independent reviewer directly opened a set of Cambridge
Dictionary Grammar pages and reported which claims they confirm (Class
B evidence, see "External independent direct-source verification"
above). Applying the project's material-claim-coverage standard, 7 of
12 rules are now proposed `VERIFIED_DIRECTLY` on that basis — see the
consolidated matrix above. **This changes what "would move this from
PARTIAL to DONE" means for the remaining 5 rules**: rather than a
generic "any direct fetch would help," the specific uncovered claims are
now named precisely per rule (see the matrix), and a future direct-fetch
pass (by this session, once/if the egress block is resolved, or by
another external reviewer) should prioritize exactly those named gaps:
the `BASIC_PREPOSITION_PATTERNS` patterns not yet covered (`comply
with`, `depend on`, `responsible for`, `interested in`, `good at`), the
`COUNTABLE_UNCOUNTABLE` per-noun list, `BASIC_WORD_ORDER`'s
adverb-of-frequency placement, `SINGULAR_PLURAL_ARTICLE_AGREEMENT`'s
exception-noun list, and `ARTICLE_A_AN`'s sound-vs-letter mechanism.
**No `sourceVerificationStatus` value has actually been changed in
production as a result of either pass** — both are proposals recorded
here for later human action.
