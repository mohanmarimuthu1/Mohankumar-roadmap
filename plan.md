Build a personal roadmap tracker app called "Mohan Roadmap".

STACK:
- React 18 + Vite
- Supabase for auth + database (I'll provide keys)
- Tailwind CSS (via CDN in index.html, no PostCSS setup)
- lucide-react for icons
- @dnd-kit/core for drag-drop
- Deploy target: Vercel

DESIGN PRINCIPLES:
- Dark theme, single accent color (amber #F2A93B), everything else grayscale
- Font: Space Grotesk for headings, Inter for body (Google Fonts)
- Clean, minimal, mobile-first responsive
- No decorative gradients, no rainbow colors

FEATURES:

1. AUTH
   - Google sign-in via Supabase
   - Protected routes — must login to see app
   - Logout button in header

2. TABS (bottom nav on mobile, top nav on desktop)
   - Today
   - Roadmap
   - Live (AI news, models, papers)
   - Gym
   - Habits
   - NEU
   - Resources
   - Settings

3. TODAY TAB
   - Overall progress ring (% of all tasks done)
   - Streak counter (consecutive days all daily habits done)
   - Current phase card
   - Daily habits checklist (tap to check, saves to habit_log)
   - "Today in AI" live feed (top 5 from news_articles)
   - This week's weekly habits list

4. ROADMAP TAB
   - 7 phases as collapsible cards (current phase expanded by default)
   - Each phase shows: task groups → tasks with checkboxes
   - Progress bar per phase
   - Tap task to check/uncheck
   - Long-press or edit-icon → notes textarea for that task

5. LIVE TAB
   - Sub-tabs: News | Models | Papers | Repos | HN
   - Pulls from news_articles table filtered by category
   - Refresh button (calls Supabase edge function to trigger refetch)
   - Auto-refresh every 5 min
   - Each item: source, title, timestamp, opens link in new tab

6. GYM TAB
   - Days as cards (Push, Pull, Legs, etc)
   - Each day: exercises with sets × reps × rest × form notes
   - Tap an exercise → log weight/reps for today
   - Show last session's weights inline (progression tracking)
   - Week view: which days done this week

7. HABITS TAB
   - Three sections: Daily / Weekly / Monthly
   - Each habit editable (name, order)
   - "Rules" section at bottom (hard rules, non-negotiables)

8. NEU TAB
   - Sections as cards (Visa, Housing, Travel, Packing, TA/RA, Networking, Groceries, etc)
   - Each section: checklist of items
   - Check off as you complete pre-arrival tasks
   - Progress tracker per section

9. RESOURCES TAB
   - Grouped by category
   - Each: name + external link + delete/edit
   - Add new resource button

10. SETTINGS TAB
    - Edit mode toggle (enables edit/delete/add on all tabs)
    - Export all data as JSON
    - Import JSON
    - Reset to defaults (with confirmation)
    - Sign out

11. EDIT MODE (when toggled in Settings)
    - Every list item shows: drag handle, edit pencil, delete trash
    - + button at end of each list to add new item
    - Inline editing (click text → input)
    - Drag to reorder (updates order_idx in DB)
    - Save/Cancel per edit

12. DATA SEEDING
    - On first login, seed user's DB with default template
    - I'll provide the seed data as a JSON file called `seed.json`
    - After seeding, user can customize everything

FILE STRUCTURE:

src/ ├── App.jsx (router, auth wrapper) ├── main.jsx ├── index.css (Tailwind imports) ├── lib/ │ ├── supabase.js (client init) │ ├── seed.js (initial data seeder) │ └── hooks.js (useAuth, useTasks, etc) ├── components/ │ ├── Auth.jsx (login page) │ ├── Layout.jsx (nav, header, tabs) │ ├── EditableList.jsx (reusable editable list) │ └── Ring.jsx (progress ring) └── pages/ ├── Today.jsx ├── Roadmap.jsx ├── Live.jsx ├── Gym.jsx ├── Habits.jsx ├── NEU.jsx ├── Resources.jsx └── Settings.jsx


REQUIREMENTS:
- All data operations go through Supabase client (no separate backend)
- Use Supabase realtime subscriptions where useful (e.g., live news updates)
- PWA-ready (add manifest.json, service worker via vite-plugin-pwa)
- Mobile responsive breakpoints: 640px, 1024px
- Loading skeletons for all async data
- Toast notifications for actions (add, delete, save)
- Confirm modals for destructive actions

START BY:
1. Create Vite React project structure
2. Install dependencies
3. Set up Tailwind
4. Configure Supabase client
5. Build auth flow
6. Build Layout with nav
7. Build one tab at a time in this order: Today, Roadmap, Habits, Gym, NEU, Resources, Live, Settings
8. Add edit mode last
9. Add PWA config
10. Give me deployment instructions for Vercel

Ask me for the Supabase URL and anon key when you need them.
Ask me for `seed.json` after you've set up the Supabase client.

Let's begin.