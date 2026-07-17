# Content & Pedagogy Engine — Phase 2A documentation

**Status: Phase 2A (Architecture, Governance and Editorial Foundation) — architecture accepted with corrections, DOCUMENTED ONLY.**

> ⚠️ **Implementation has not started.** No Prisma schema was changed, no
> migration exists, no `GrammarRule`/`PhraseEntry`/`ReadingContent` records
> exist in any database, no application code was changed, no AI prompt was
> changed. Everything in this directory is a design document, not a
> description of running code. Where a document shows a data shape, it is
> a **proposed** shape for a future migration, not Prisma schema syntax —
> see the note at the top of `domain-model.md`.

## What Phase 2A is

Phase 2A is the architecture/governance/editorial-foundation sub-phase of
`english-flow/README.md` → Roadmap → **Phase 2 §A** ("Architecture,
governance and editorial foundation"). Its job is to answer, before a
single line of Grammar/Phrase/Reading content is created: what to reuse,
what new models are actually needed, where verified content lives, where
personal user progress lives, how content moves `draft → reviewed →
published → archived`, how duplicates/CEFR errors/unlicensed content are
prevented, how legacy content migrates without losing user progress, and
which vertical slice goes first.

## Documents in this folder

| File | Contents |
| --- | --- |
| [`phase-2a-audit.md`](./phase-2a-audit.md) | Factual audit of the current codebase — content inventory, data models, AI layer, learning logic, with exact file references. Includes the confirmed divergence between the two existing legacy grammar-explanation sources. |
| [`domain-model.md`](./domain-model.md) | Proposed data model for `GrammarRule`/`GrammarRuleExample`/`ReadingContent`/`PhraseScope`, alternatives considered, and the accepted recommendation for each. No Prisma syntax. |
| [`retrieval-architecture.md`](./retrieval-architecture.md) | `GrammarRuleResolver` design, the three MVP retrieval flows (Grammar/Phrase/Reading), deterministic/AI boundary, fallback, source validation, observability. |
| [`editorial-workflow.md`](./editorial-workflow.md) | Content lifecycle (`DRAFT → REVIEWED → PUBLISHED → ARCHIVED`), CLI-only workflow for MVP, validation rules, Git-backed versioning, archive/rollback. |
| [`migration-plan.md`](./migration-plan.md) | Legacy data migration plan — what migrates, what stays legacy, explicit guarantee that `UserPhrase`/`ReviewAttempt` history is never rewritten, no destructive migration anywhere. |
| [`mvp-slices.md`](./mvp-slices.md) | Full specifications for the three MVP vertical slices, in build order: Grammar MVP (12 named rules) → Phrase MVP → Reading MVP. |
| [`metrics-observability.md`](./metrics-observability.md) | Metric formulas, what's measurable today vs. what needs a new field, minimal baseline logging plan. |
| [`risk-register.md`](./risk-register.md) | Phase 2A risk register with probability/impact/mitigation/owner/blocking status. |
| [`decisions.md`](./decisions.md) | ADR-style decision log: accepted / deferred / rejected / open / blocking. |

## Relationship to the main roadmap

`english-flow/README.md` remains the single source of truth for
product-level roadmap phases and statuses. This folder does not replace
or duplicate it — it is the detailed backing documentation for **Phase 2
§A** specifically. `english-flow/README.md` links here from the Phase 2
§A entry; it does not repeat this level of detail inline.

## Next step (not part of this commit)

After this documentation is reviewed and separately approved, the next
step is implementing Grammar MVP: a real Prisma migration, a CLI-based
seed of the 12 named rules (as `draft`), human review to `reviewed` and
`published`, wiring `errors`/`micro-lessons` to read from
`GrammarRule`/`GrammarRuleResolver` for the categories it covers, and
tests. None of that is part of Phase 2A.
