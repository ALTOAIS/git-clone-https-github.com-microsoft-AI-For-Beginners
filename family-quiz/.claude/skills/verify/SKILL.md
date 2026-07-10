---
name: verify
description: Build and drive the family-quiz app end to end in a headless browser.
---

# Verify family-quiz

Build & serve:

```bash
cd family-quiz
npm install
npm run build            # tsc --noEmit && vite build
npm run preview -- --port 4173   # serves dist/ (run in background)
```

Drive with playwright-core (`npm i playwright-core` in a scratch dir) using the
pre-installed browser: `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`
(the path is a symlink to the real binary — do not append `chrome-linux/chrome`).

Flows worth driving (all button labels are Russian):
- Home «Начать игру» → per-round intro «Начать тур».
- Round 1/4 question blocks: «Следующий вопрос» → «Показать ответы» → «Следующий ответ» → «Завершить».
- Score entry steppers use aria-labels «Плюс»/«Минус»; totals live in `.standings-total`.
- Round 5 bets: buttons in `.bet-boys` / `.bet-girls`; «Показать вопрос» must stay disabled until both bets are placed.
- Persistence probe: `page.reload()` mid-game → home shows «Продолжить игру» and resumes the same screen (LocalStorage key `family-quiz-state-v1`).

Gotcha: the timer does not auto-advance questions — click «Следующий вопрос» yourself.
