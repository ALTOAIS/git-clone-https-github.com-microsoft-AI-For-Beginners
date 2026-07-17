# Phase 2A — Metrics and observability

## Reading this table

"Already measurable" means: the data this metric needs already exists in
the schema today, with no Phase 2 change required — the only missing
piece is aggregation/logging, which is Phase 1 backlog work, not Phase 2
content work. "Needs new field" means: the concept this metric measures
does not exist anywhere in the schema yet.

| Metric | Data source | Formula | Already measurable today? | Needs new field? | Minimal logging plan |
| --- | --- | --- | --- | --- | --- |
| Verified rule usage rate | `GrammarRuleResolver` resolution log | `matched / (matched + fallback)` | No | No — logging only | One structured log line per resolution: `{ errorRecordId, microCategory, matchedRuleCode|null, fallbackUsed }` |
| Fallback-to-static-rule rate | Same log | `1 − verified_rate` | No | No | Same log line, different aggregation |
| Error recurrence after a specific rule's explanation | `ErrorRecord.occurrenceCount` trend, joined on `grammarRuleId` | Compare `occurrenceCount` trend before/after a `grammarRuleId` match | Partially — `occurrenceCount` exists today | Yes — needs `ErrorRecord.grammarRuleId` (Grammar MVP scope) | SQL query once the field exists |
| Error recurrence after MicroLesson | `MicroLesson.completedAt` + subsequent `ErrorRecord` in the same category | Count same-category errors in the N days after `completedAt` | **Yes — computable today, no Phase 2 change needed** | No | SQL query against existing fields |
| Time to mastery | `ErrorRecord.createdAt` → `practiceStatus = MASTERED`; `UserPhrase.createdAt` → `status = MASTERED` | Date difference | **Yes, already computable** | No | SQL query |
| Transfer to new contexts | `ErrorRecord.contextsPassed` | Direct read | **Yes, already computable** | No | SQL query |
| Active phrase recall | New `UserPhrase.activeRecallScore`/`productionSuccessCount` | Ratio of successful active-production attempts | No — the active/passive distinction doesn't exist yet | Yes (Phrase MVP) | Arrives with Phrase MVP |
| Reading comprehension pass rate | `UserReadingProgress.comprehensionScore` | Average over completed sessions | No — Reading doesn't exist yet | Yes (Reading MVP) | Arrives with Reading MVP |
| Predicted lexical coverage vs. reported difficulty | Computed coverage vs. a post-reading learner self-report | Correlation/delta | No | Yes (Reading MVP) | Arrives with Reading MVP; also needs a small "was this too easy/hard?" prompt in the new UI |
| Content duplicate rate | `content:validate` CLI log | `duplicates_caught / total_submissions` | No | No — logging only | Log every CLI validation run |
| Human-review rejection rate | `content:review --reject` CLI log | `rejected / (rejected + approved)` | No | No | Same |
| Missing source/license rate | SQL against `ReadingContent` | `COUNT(*) WHERE source IS NULL OR license IS NULL` | N/A once the schema has these as required fields — this is a schema constraint, not a runtime metric | No | Not a dashboard metric — a publish-time constraint (`editorial-workflow.md`) |
| AI retry/fallback/latency/cost | `ai.service.ts`/`llm.client.ts` per-call metadata (`aiMode`, `fallbackReason`, `retryCount`, `providerStatus`) | Aggregate counts/averages | **Data already exists on every call today** — this is Phase 1 backlog (aggregation), not Phase 2 | No | Structured log on every `withFallback()` call → simple aggregation; not new to Phase 2A, referenced here because Grammar/Phrase/Reading retrieval reuse the same `withFallback()` pattern and should log through the same pipeline once it exists |
| Content rollback frequency | `content:archive`/republish CLI log | `archived_and_republished / published` over a period | No | No | Log every CLI archive/publish operation |

## Categorization (per the roadmap's existing metric categories)

- **Product:** verified rule usage rate, fallback-to-static-rule rate, active phrase recall, reading comprehension pass rate.
- **Learning:** error recurrence (both variants), time to mastery, transfer to new contexts, predicted coverage vs. reported difficulty.
- **Content quality:** duplicate rate, human-review rejection rate, missing source/license rate (as a constraint), content rollback frequency.
- **AI/operational:** AI retry/fallback/latency/cost — shared with the existing Phase 1 AI backlog, not duplicated as a separate Phase 2 metric system.

## Baseline plan for Phase 2A (documentation only — no logging code written in this phase)

1. Grammar MVP ships its resolution log line (`{ errorRecordId,
   microCategory, matchedRuleCode|null, fallbackUsed }`) from day one of
   implementation — this is cheap and is the direct input to two of the
   metrics above.
2. Phrase MVP and Reading MVP each ship their new fields
   (`activeRecallScore` etc., `comprehensionScore` etc.) populated from
   day one, even before any dashboard exists to display them — the point
   is not losing the first weeks of data by deferring instrumentation
   until "later."
3. No dashboard is built in Phase 2A or in any of the three MVP slices
   themselves — aggregation/dashboard is Phase 1's "production
   monitoring and error aggregation" / "AI fallback/error-rate
   aggregation" backlog items, extended to also read these new log lines
   once that work happens. This avoids building a second, parallel
   observability system for content metrics.
