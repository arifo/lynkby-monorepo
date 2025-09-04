scope is the “real” Dashboard Home plus a tight post-save setup so users know what to do next (and don’t bounce).

Below is a full, dev-ready spec covering UX, flows, API, data, and acceptance criteria.

⸻

🎯 Objective

After a user edits their default page and taps Save, they:
	1.	get a quick “Launch Confirmation” moment (copy/open link),
	2.	land on a Dashboard Home that feels useful immediately,
	3.	see a tiny, finite checklist that guides them to a great first version without overwhelm,
	4.	have clear Quick Actions to continue editing.

⸻

1) Post-Save Flow (First Session Only)

Trigger
	•	User is on the Setup Page Editor (profile + links), they press Save (you already call /v1/me/page, /v1/me/links/bulk-upsert, optionally /v1/me/publish).

1.1 Success Mini-Modal (10–15 sec max)
	•	Title: “Your page is live!”
	•	Subtitle: https://{username}.lynkby.com (tap to copy)
	•	Buttons:
	•	Copy Link (primary)
	•	Open Live Page (secondary; opens new tab)
	•	Go to Dashboard (ghost; default focus after Copy)
	•	Behavior: If user does nothing for 10s, auto-route to Dashboard Home (don’t trap them).

1.2 Routing
	•	After modal, route to /dashboard/home (new screen below).
	•	Set a “first_save_completed” flag so this modal doesn’t show again.

⸻

2) Dashboard Home (New Screen)

Route: app.lynkby.com/dashboard/home
Goal: Give users a confident overview + one-tap next steps. No dead ends, no blank states.

2.1 Layout (desktop first; responsive down to 360px)
	•	Top Bar: Logo, “Your live link” chip (copy), Plan badge (FREE/PRO), User menu.
	•	Hero Strip (sticky at top on first visit):
	•	“Your page is live → https://{username}.lynkby.com” + Copy + Open
	•	Right side: “View as TikTok” (opens a 375×667 preview overlay)
	•	Main Grid (2 columns on ≥1024px; 1 column on mobile):
	1.	Next Steps Checklist (Card)
	2.	Quick Actions (Card)
	3.	At-a-Glance (Card) — small analytics stub
	4.	Theme & Branding (Card) — quick pick (FREE presets)
	5.	Coming Soon (Card) — gentle teasers locked: TikTok Auto-Sync, Tip Jar, Analytics

Keep cards short, tappable, and preview what a click will do.

2.2 Next Steps Checklist (Card)

A finite list (3–5 items max) so users feel close to done.

Items (MVP):
	1.	✅ Set Display Name & Avatar (link to Editor → Profile section)
	2.	✅ Add 3–5 Links (link to Editor → Links)
	3.	✅ Pick a Theme (radio: classic / contrast / warm)
	4.	⏳ Add a short bio (280 chars)
	5.	🎉 Copy your link to TikTok bio (Copy action + mini tooltip “Done?” → mark complete)

Behavior
	•	Each item is auto-checked based on user data (e.g., avatarUrl present, links count ≥3).
	•	Items can be manually marked done (persisted).
	•	Completion % shown as a progress bar; when 80–100% → subtle confetti for 1s.

API
	•	Store this as a JSON blob on user (see Data section).

2.3 Quick Actions (Card)
	•	Edit Page → /dashboard/editor (your current screen)
	•	View Live → opens https://{username}.lynkby.com
	•	Copy Link → copies live URL
	•	Preview in TikTok Frame → overlay (375×667) that loads lynkby.com/u/{username}

2.4 At-a-Glance (Card)

Show value without full analytics yet.
	•	All-time views (from Page.viewsAllTime)
	•	Links on your page (count)
	•	Last updated (relative time; uses Page.updatedAt)
	•	Note: “Detailed analytics coming soon” (Week 5)

2.5 Theme & Branding (Card)
	•	Radio buttons for presets: classic, contrast, warm
	•	“Apply” → calls PUT /v1/me/page with theme
	•	3 tiny preview chips (no full editor yet)
	•	Hint: “Full customization in Pro (Week 6)” (disabled pill/button)

2.6 Coming Soon (Card) — soft teasers (do not block)
	•	TikTok Auto-Sync (Week 3) — “Connect TikTok → auto import last posts” (disabled; show tooltip “Coming soon”)
	•	Tip Jar (Week 4) — “Accept tips with lowest fees” (disabled; “Coming soon”)
	•	Link Analytics (Week 5) — “See your top links” (disabled; “Coming soon”)
	•	These are purely informational now, seeded for future activation.

⸻

3) Setup State & Data Model

Add a simple structure to track first-time success + checklist:

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  username      String   @unique
  displayName   String?
  avatarUrl     String?
  bio           String?  @db.VarChar(280)
  plan          Plan     @default(FREE)
  page          Page?
  setup         SetupState?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model SetupState {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  firstSaveCompleted    Boolean  @default(false)
  checklist             Json     @default("{}") // see structure below
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

Checklist JSON shape (example):

{
  "displayNameAvatar": { "done": false, "ts": null },
  "addLinks3Plus": { "done": false, "ts": null },
  "chooseTheme": { "done": false, "ts": null },
  "addBio": { "done": false, "ts": null },
  "copyLinkToTikTok": { "done": false, "ts": null }
}


⸻

4) API Additions

Base: https://api.lynkby.com/v1 (auth required unless stated)

4.1 GET /me/summary

Returns everything needed for Dashboard Home.

Response:

{
  "username": "bobo",
  "liveUrl": "https://bobo.lynkby.com",
  "fallbackUrl": "https://lynkby.com/u/bobo",
  "profile": {
    "displayName": "Bobo",
    "avatarUrl": "https://...",
    "bio": "..."
  },
  "page": {
    "theme": "classic",
    "published": true,
    "viewsAllTime": 0,
    "updatedAt": "2025-09-04T12:00:00Z"
  },
  "links": { "count": 2 },
  "setup": {
    "firstSaveCompleted": true,
    "checklist": {
      "displayNameAvatar": { "done": true, "ts": "..." },
      "addLinks3Plus": { "done": false, "ts": null },
      "chooseTheme": { "done": false, "ts": null },
      "addBio": { "done": true, "ts": "..." },
      "copyLinkToTikTok": { "done": false, "ts": null }
    }
  },
  "plan": "FREE"
}

4.2 POST /setup/first-save

Idempotent. Sets firstSaveCompleted=true.
Req: {} → Res: { "ok": true }

Call this right after a successful Save on the Editor (and before showing the success mini-modal).

4.3 POST /me/setup/checklist

Upsert toggles for items.
Req:

{ "key": "copyLinkToTikTok", "done": true }

Res: { "ok": true, "checklist": { ...updated... } }

Server stamps ts when done=true, and removes ts if set false.

⸻

5) Dashboard Home UI Spec (detailed)

5.1 Top Bar
	•	Live link chip: shows bobo.lynkby.com → clicking copies full URL; tooltip “Copied”.
	•	Plan badge: FREE (neutral grey). Later: “Upgrade to Pro” button here.

5.2 Hero Strip
	•	Left: “Your page is live” + link; buttons: Copy, Open.
	•	Right: Preview in TikTok → overlay (iframe to /u/{username}), 375×667, close with ESC.

5.3 Next Steps Checklist
	•	Each item: left icon + title + tiny description + action link (navigates to editor with hash).
	•	Right end: status check (checked/unchecked). Clicking updates checklist via API.
	•	Auto-check logic on load:
	•	displayNameAvatar → if displayName OR avatarUrl exists.
	•	addLinks3Plus → if links.count >= 3.
	•	chooseTheme → if page.theme !== "classic".
	•	addBio → if bio && bio.length >= 20 (or any non-empty in MVP).
	•	copyLinkToTikTok → user clicks the Copy action here (set true).
	•	Complete state: If ≥4/5 done → small confetti burst (once per session).

5.4 Quick Actions

Buttons (large, 2 columns on mobile):
	•	Edit Page
	•	View Live
	•	Copy Link
	•	TikTok Preview

5.5 At-a-Glance
	•	Views All-Time: numeric (from Page.viewsAllTime).
	•	Links: integer.
	•	Last updated: humanized (e.g., “2 mins ago”).
	•	Empty states handle 0 cleanly (“—”).

5.6 Theme & Branding
	•	3 radio tiles; selecting one activates Apply button.
	•	On Apply → PUT /v1/me/page ({ theme }), toast “Theme applied”.

5.7 Coming Soon
	•	Disabled CTA tiles with short copy.
	•	Tooltip: “Available soon—stay tuned!”
(No modal, no forms now.)

⸻

6) Events (optional but recommended)

Emit light client events (to your existing analytics):
	•	dashboard_opened
	•	setup_checklist_marked { key, done }
	•	copy_live_link_clicked
	•	preview_tiktok_opened
	•	theme_applied { theme }

Keep names stable and low-cardinality.

⸻

7) Worker/Backend Notes
	•	No new routing in Edge Worker is required for this scope (public pages unchanged).
	•	API Worker adds the three endpoints above.
	•	Caching: /me/summary is not cached (user-specific).
	•	Rate limits: same as private API defaults.
	•	Security: checklist updates require auth; validate keys against an allowlist:
["displayNameAvatar","addLinks3Plus","chooseTheme","addBio","copyLinkToTikTok"].

⸻

8) Acceptance Criteria
	•	After Editor Save, a success mini-modal appears with Copy/Open/Go to Dashboard.
	•	User is routed to /dashboard/home (first time) and not re-prompted on later saves.
	•	/me/summary returns live link, counts, and setup state.
	•	Next Steps Checklist renders with correct auto-checks based on data.
	•	Checklist items can be toggled and persist via /setup/checklist.
	•	Quick Actions work: Edit Page, View Live, Copy Link, TikTok Preview overlay.
	•	Theme apply updates page and shows on live page within cache window (≤60s).
	•	No blank states; all cards show helpful defaults even with 0 views/2 links.
	•	Mobile: layout stacks cleanly; CTA hit targets ≥44px; text readable (≥14px).

⸻

9) Nice-to-Have (Queue for later)
	•	“Share to TikTok” deep-link helper with clipboard instructions.
	•	Success-state animation on hitting 100% checklist.
	•	“Invite a friend” referral nudge (track referrals).
	•	Basic “link click” counters on Dashboard Home once Week 5 is live.
	•	A/B: show “Pick a Theme” first vs “Add 3+ links” first; track completion.

