# Beautiful Reminders

Goals, deadlines and daily habits, in one calm place. A mobile-first React + Supabase PWA.

Live: https://balakondaveeti.github.io/beautiful-reminders/

## Kinds of goal

| Kind | Shows |
|---|---|
| Deadline | Days left, time used, sub-goal progress |
| Habit | Done today, streak, best streak, completion rate, month calendar |
| Long-term | A checklist of steps, no due date |
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

Supabase tables are prefixed `br_`, with row-level security limiting every row to its owner. SQL is kept out of this repo and run by hand in the Supabase SQL Editor. The app only uses the publishable key.

## Design

Native-feeling and plain: the system font, neutral greys, one blue for anything you can tap, green for done, red for overdue. All colors, sizes, spacing and radii are CSS variables in `src/theme.css`, with a separate dark palette.
