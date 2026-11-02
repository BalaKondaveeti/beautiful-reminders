# Beautiful Reminders

Goals, deadlines and daily habits, in one calm place. A mobile-first React + Supabase PWA.

Live: https://balakondaveeti.github.io/beautiful-reminders/

## Kinds of goal

| Kind | Shows |
|---|---|
| Deadline | Days left, time used, sub-goal progress |
| Habit | Done today, streak, best streak, completion rate, month calendar |
| Passive | A calm checklist of steps, no date |
| Collection | Items grouped as Doing / Want to / Done, each with its own tracker |
| Task | A tick, plus optional steps |

Anything can contain sub-goals of any kind.

## Develop

```sh
npm ci
npm run dev     # local dev server
npm run build   # type-check + production build
```

Every push to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Database

Supabase tables are prefixed `br_`. The schema is in [`supabase/schema.sql`](supabase/schema.sql): idempotent, run it in the Supabase SQL Editor. Row-level security limits every row to its owner. The app only uses the publishable key.

## Design

All colors, fonts, sizes, spacing and radii are CSS variables in `src/theme.css`, with a separate dark palette.
