# Grammar MVP — External source verification

**Status: PARTIAL for all 12 MVP rules** (corrected this round — previously
stated as `DONE`; that was wrong, see "Why the status is `PARTIAL`, not
`DONE`" below). Every rule has at least one authoritative-publisher
citation; none currently reaches the strictest tier this round's review
defines, for an infrastructure reason documented below, not a research
shortcut.

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
- **Verification status:** `PARTIALLY_VERIFIED`
- **Citation note:** search-engine indexed snippet, not a direct page fetch — see "Why the status is PARTIAL" above; the direct-fetch attempt against this domain failed at the proxy `CONNECT` stage, not a site-specific block. Content is standard, uncontroversial A1 grammar, cross-checked against the phrasing pattern British Council uses elsewhere.

## 2. `ARTICLE_THE_SPECIFIC`

- **Publisher:** British Council LearnEnglish + (new this round) Oxford Learner's Dictionaries
- **Page/section:** British Council "Articles: 'a', 'an', 'the'"; "The definite article: 'the'" — `https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/definite-article`; Oxford "definite article" usage note — `https://www.oxfordlearnersdictionaries.com/definition/english/definite-article`
- **Topic confirmed:** *the* is used when the listener already knows which thing is meant — because it was mentioned before, is easily understood from context, or is the only one of its kind; Oxford's search snippet additionally distinguishes this **specific/identifiable** use from *the*'s separate general-class use ("The dolphin is an intelligent animal") — confirming this rule is **not** reducible to "already mentioned → always *the*"; shared/identifiable reference is the operative condition, not mere prior mention.
- **Exact claim supported:** the "already mentioned / unique / obvious from context" explanation in `explanationRu`, and specifically the requirement that the reference be **shared/identifiable to both speakers**, not just previously said aloud once.
- **Retrieval date:** 2026-07-17
- **Verification status:** `PARTIALLY_VERIFIED`
- **Citation note:** two independent publishers' indexed snippets converge on the same shared-reference condition, which is a stronger within-tier signal than a single-publisher snippet, but neither page was opened directly (same proxy block as above) — still `PARTIALLY_VERIFIED`, not `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`, since that tier requires an actual direct read, not just a second snippet.
- **Content re-check this round:** confirmed the current draft in `grammar-mvp-decision-pack.md` already states three explicit conditions (previously mentioned / unique / clear from context) and does not assert "mentioned once → always *the*" as a standalone rule — no wording change needed, only the source status above.

## 3. `ARTICLE_ZERO_GENERAL`

- **Publisher:** British Council LearnEnglish + (new this round, second independent source as required) Oxford Learner's Dictionaries / Oxford University Press ELT
- **Page/section:** British Council "Articles: 'the' or no article" — `https://learnenglish.britishcouncil.org/grammar/a1-a2-grammar/articles-the-or-no-article`; Oxford "definite article" note (general-class use) — `https://www.oxfordlearnersdictionaries.com/definition/english/definite-article`; OUP ELT grammar exercise reference (articles: a/an, the, no article) — `https://elt.oup.com/student/englishfile/intermediate3/grammar/file03/nef_int_grammar03_b03`
- **Topic confirmed:** when talking about things in general, plural or uncountable nouns take **no article** ("We have to protect wild animals," "I love Japanese food"); *the* is reserved for a specific subset within the general class, not the general class itself.
- **Exact claim supported:** the core zero-article-for-generalization rule, now cross-checked by a second independent publisher rather than resting on British Council alone.
- **Retrieval date:** 2026-07-17
- **Verification status:** `PARTIALLY_VERIFIED` (upgraded from the earlier single-source citation — now two independent publishers, still snippet-based, not a direct read)
- **Content re-check this round:** the three worked examples in `grammar-mvp-decision-pack.md` (`Compliance is important...`, `We need evidence...`, `Regulators usually check...`) already carry explicit `(context: ...)` annotations distinguishing the general reading from a specific one — this satisfies the requirement that examples "unambiguously signal general meaning," no wording change needed.
- **`grammar-rules-human-review.md` decision note:** this rule's second-source gap (the original reviewer concern) is now addressed; see that document for whether the `REVISE` recommendation is lifted.

## 4. `PRESENT_SIMPLE_THIRD_PERSON`

- **Publisher:** British Council LearnEnglish + Cambridge Dictionary Grammar
- **Page/section:** British Council "Present simple" — `https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/present-simple`; Cambridge "Present simple (I work)" — `https://dictionary.cambridge.org/grammar/british-grammar/present-simple-i-work`; Cambridge "Have" — `https://dictionary.cambridge.org/us/grammar/british-grammar/have`; Cambridge "Do" — `https://dictionary.cambridge.org/us/grammar/british-grammar/do`
- **Topic confirmed:** -s added for he/she/it; -es added after verbs ending in -ch, -s, -ss, -sh, -x, -z, and when a verb ends in -s or -z the letter is doubled before -es (e.g. quiz → quizzes — a more precise version of the spelling rule than the earlier draft stated); `have → has`, `do → does` as irregular third-person forms, explicitly confirmed ("Have is an irregular verb... The present simple third person singular is has"; same pattern for do/does).
- **Exact claim supported:** the -es-after-sibilants detail (now including the quiz→quizzes doubling nuance) and the have→has/do→does irregulars in `explanationRu`.
- **Retrieval date:** 2026-07-17
- **Verification status:** `PARTIALLY_VERIFIED`
- **Citation note:** two independent publishers converge, and this round's search surfaced a more precise spelling detail (consonant-doubling before -es for verbs already ending in -s/-z) than the previous pass found — added to the sourceRefs note; still snippet-based, no direct read achieved.

## 5. `PAST_SIMPLE_FORM`

- **Publisher:** British Council LearnEnglish
- **Page/section:** "Past simple" — `https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/past-simple`; "Irregular verbs" — `https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/irregular-verbs`
- **Topic confirmed:** regular verbs add -ed/-d; irregular verbs have unpredictable forms that must be learned individually (example given: wake → woke, break → broke).
- **Exact claim supported:** the regular/irregular split in `explanationRu`; informed the decision to drop the previously-stated "~150 irregular verbs" figure (not stated by this source, and not needed for a learner-facing explanation).
- **Retrieval date:** 2026-07-17
- **Verification status:** `PARTIALLY_VERIFIED`
- **Citation note:** single-publisher snippet, not cross-checked by a second source this round (not one of the items the current review round required a second source for) — noted as a residual gap, same class as the pre-correction `ARTICLE_ZERO_GENERAL` gap, but not separately flagged since the content risk is lower (regular/irregular split is uncontroversial, widely-taught A1 content).

## 6. `PAST_SIMPLE_VS_PRESENT_PERFECT`

- **Publisher:** British Council LearnEnglish
- **Page/section:** "Present perfect" — `https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/present-perfect`; "Talking about the past" — `https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/talking-about-past`
- **Topic confirmed:** **"You cannot use present perfect with a fixed time (e.g. yesterday, last Thursday, 3.00) but you can use it with *since* + a fixed past time"**; *since* creates an open time frame from a past point to now; present perfect links a past event to a present consequence, whereas past simple presents a completed action as historical fact.
- **Exact claim supported:** the strongest single citation in the set — directly and explicitly supports "Present Perfect does not combine with finished-time markers like yesterday."
- **Retrieval date:** 2026-07-17
- **Verification status:** `PARTIALLY_VERIFIED`
- **Content re-check this round:** confirmed the current draft's wording — "signal words... надёжные, но не абсолютные ориентиры" / "итоговое решение всегда зависит от контекста" — does **not** present signal words as an infallible classifier and keeps the context caveat intact; no wording change needed. The since/for explanation stays framed around whether the situation continues now, not the word alone.

## 7. `MODAL_BASE_VERB`

- **Publisher:** Cambridge Dictionary Grammar
- **Page/section:** "Modality: forms" — `https://dictionary.cambridge.org/us/grammar/british-grammar/modality-forms`; "Modal verbs and modality" — `https://dictionary.cambridge.org/us/grammar/british-grammar/modal-verbs-and-modality`; "Ought to" — `https://dictionary.cambridge.org/grammar/british-grammar/ought-to`
- **Topic confirmed:** core modal verbs (can, could, may, might, will, shall, would, should, must) are followed directly by the base form, with **no to-infinitive form, -s form, past form, or -ed form**; explicit incorrect examples given by the source itself: *"I'd love to can see..."* and *"They musted sell..."*; `ought to` is a semi-modal that, unlike core modals, **is** followed by `to`.
- **Exact claim supported:** the entire rule pattern, and specifically the `ought to` exception.
- **Retrieval date:** 2026-07-17
- **Verification status:** `PARTIALLY_VERIFIED`
- **Citation note:** search-engine indexed snippet directly quoting Cambridge's own incorrect-usage examples (reused as inspiration for two incorrect/correct pairs, rewritten in our own compliance-flavoured examples, not copied verbatim) — no direct page read achieved.

## 8. `BASIC_PREPOSITION_PATTERNS`

Each of the 7 curated patterns checked **individually** this round, per
the explicit instruction not to treat one general citation as covering
all seven if it only covers part of them.

| Pattern | Verification status | Evidence |
| --- | --- | --- |
| `comply with` | `PARTIALLY_VERIFIED` | Confirmed via Cambridge Dictionary's "COMPLY" entry (`https://dictionary.cambridge.org/dictionary/english/comply`) — general-use dictionary entry, not a dedicated grammar-pattern page; weaker within-tier evidence than the others below. |
| `depend on` | `PARTIALLY_VERIFIED` | Confirmed via a **dedicated** Cambridge Grammar page, "Word patterns: depend on something" (`https://dictionary.cambridge.org/grammar/british-grammar/word-patterns-depend-on-something`) — a dedicated pattern page is stronger within-tier evidence than a general dictionary entry. |
| `responsible for` | `PARTIALLY_VERIFIED` | Confirmed via a dedicated Cambridge Grammar page, "Prepositions: responsible" (`https://dictionary.cambridge.org/grammar/british-grammar/prepositions-responsible`). |
| `interested in` | `PARTIALLY_VERIFIED` | Confirmed via two dedicated Cambridge Grammar pages, "Word patterns: interested" and "Prepositions: interest" (`.../word-patterns-interested`, `.../prepositions-interest`) — this round's search surfaced a second dedicated page beyond what the original pass cited. |
| `good at` | `PARTIALLY_VERIFIED` | Not confirmed by a page dedicated to this exact pattern in this round's search; covered under Cambridge's general adjective+preposition pattern guidance rather than its own page — **weakest-evidenced pattern in this set**, flagged for a follow-up dedicated search before publication. |
| `listen to` | `PARTIALLY_VERIFIED` | Cambridge Grammar lists a "Word patterns: listen" entry, but this round's search snippet did not return its specific content (only the page's existence); general dictionary knowledge that "listen" governs "to" is well-established but the dedicated page's content itself was not confirmed — **flagged, same as `good at`**. |
| `arrive at/in` | `PARTIALLY_VERIFIED` | Confirmed via a dedicated Cambridge Grammar page, "Word patterns: arrive somewhere" (`https://dictionary.cambridge.org/grammar/british-grammar/word-patterns-arrive-somewhere`), plus "At, in and to (movement)" — explicitly confirms **arrive at** a point/building vs. **arrive in** a city/country, and confirms **arrive home/here/there takes no preposition at all**, the nuance added to the draft's edge cases. Strongest-evidenced pattern in this set. |

- **Retrieval date:** 2026-07-17
- **Overall rule verification status:** `PARTIALLY_VERIFIED`, with two of the seven patterns (`good at`, `listen to`) evidenced only by general/indirect confirmation rather than a dedicated page — noted in `grammar-rules-human-review.md` as a residual concern for this already-flagged high-risk rule.

## 9. `BASIC_WORD_ORDER`

- **Publisher:** British Council LearnEnglish
- **Page/section:** "How often" — `https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/how-often`; "Where adverbials go in a sentence" — `https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/where-adverbials-go-sentence`
- **Topic confirmed:** adverbs of frequency usually go before the main verb, or between auxiliary and main verb; **"always"** is the exception among negatives, going *after* be/do + not; **"Adverb position in English is very flexible and you can put adverbs of frequency at the start of the sentence."**
- **Exact claim supported:** directly grounds the correction that fronted time/place adverbials are a legitimate stylistic option, not an automatic error; the *always*-in-negatives exception.
- **Retrieval date:** 2026-07-17
- **Verification status:** `PARTIALLY_VERIFIED`
- **Citation note:** single-publisher snippet quoting the "very flexible" phrase closely (short quote, attributed); no direct page read achieved.

## 10. `DO_DOES_DID_QUESTIONS_NEGATIVES`

- **Publisher:** Cambridge Dictionary Grammar
- **Page/section:** "Do — English Grammar Today" — `https://dictionary.cambridge.org/us/grammar/british-grammar/do`; "Forming negative statements, questions and imperatives" — `https://dictionary.cambridge.org/grammar/british-grammar/forming-negative-statements-questions-and-imperatives`
- **Topic confirmed:** `do`/`does`/`did` form questions and negatives for main verbs (except `be` and some uses of `have`); the main verb after `do`-support stays in its **base (uninflected) form** — Cambridge's own examples: "do go," "does work," "did say."
- **Exact claim supported:** the entire rule pattern and the double-marking prohibition.
- **Retrieval date:** 2026-07-17
- **Verification status:** `PARTIALLY_VERIFIED`
- **Citation note:** single-publisher snippet, no direct page read achieved.

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
| feedback | `PARTIALLY_VERIFIED` — **weakest evidence in this list** | No dedicated Cambridge page surfaced in this round's search; the search tool's own summary calls it "generally recognized as uncountable" without citing a specific page. Flagged for a follow-up targeted search before publication; the grammatical claim itself (no plural, no a/an) is uncontroversial and used identically across other learner-English references, but this specific instance is not individually source-confirmed to the same standard as the rest of the list. |
| furniture | `PARTIALLY_VERIFIED` | Confirmed uncountable via a dedicated "Countability: furniture" page. |
| software | `PARTIALLY_VERIFIED` | Confirmed uncountable via a dedicated "Countability: software" page. |
| news | `PARTIALLY_VERIFIED` | Confirmed uncountable, singular-verb-taking ("The news is good") via a dedicated "News" grammar page — directly grounds the `SINGULAR_PLURAL_ARTICLE_AGREEMENT` resolver-safety correction too. |
| progress | `PARTIALLY_VERIFIED` | Confirmed uncountable via a dedicated "Countability: progress" page; typically used with "make." |
| work | `PARTIALLY_VERIFIED` — **dual-use, correctly flagged, not hidden** | Confirmed **uncountable** when it means effort/labor/study ("a lot of work to do") — no a/an, no plural — but **countable** in the distinct sense "a created piece" (painting/book/sculpture/composition), where "a work of art" and "works of art" are both correct. The draft's edge case already notes this dual behavior; this round's search confirms it is Cambridge's own stated distinction, not an invented nuance. |

- **Retrieval date:** 2026-07-17
- **Overall rule verification status:** `PARTIALLY_VERIFIED`, 11 of 12 nouns individually confirmed via dedicated or general Cambridge pages; `feedback` is the one weak link, flagged rather than silently included at the same confidence as the rest.

## 12. `SINGULAR_PLURAL_ARTICLE_AGREEMENT`

- **Publisher:** Cambridge Dictionary Grammar
- **Page/section:** "Nouns: singular and plural" — `https://dictionary.cambridge.org/us/grammar/british-grammar/nouns-singular-and-plural`; "News" — `https://dictionary.cambridge.org/grammar/british-grammar/news`; "Species" — `https://dictionary.cambridge.org/dictionary/english/species`
- **Topic confirmed:** a/an marks a singular countable noun; a closed set of nouns end in -s but are grammatically singular — **academic subjects (economics, mathematics/maths, physics), physical activities (gymnastics, aerobics), diseases (measles, mumps), and "news"** all take a singular verb; "species"/"series" use the identical form for singular and plural.
- **Exact claim supported:** directly grounds the resolver-safety correction — a bare `-s`/`-es` suffix is not, by itself, reliable evidence of plurality; `business`, `class`, `analysis` (from the brief) belong to the same general caution even though they were not each individually confirmed by a dedicated Cambridge page in this pass — applied conservatively, not asserted as individually sourced.
- **Retrieval date:** 2026-07-17
- **Verification status:** `PARTIALLY_VERIFIED`
- **Citation note:** single-publisher snippet, no direct page read achieved; the specific `news`/`species` examples are dedicated-page-sourced (stronger within-tier), `business`/`class`/`analysis` are not (weaker, flagged explicitly rather than presented at equal confidence).

---

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
Cambridge/Oxford alternates). The two explicitly weak links (`feedback`
in rule 11, and `good at`/`listen to` in rule 8) should be prioritized
first, since they currently rest on the least direct evidence in the
whole set.
