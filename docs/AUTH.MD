end-to-end auth spec for the dashboard using Email OTP and Google Sign-In, with a cookie-based session (no JWT) and a rolling 30-day expiry that refreshes on each authorized request

⸻

	•	Auth methods: Email OTP + Google OAuth (no magic link).
	•	Session cookie (httpOnly) with rolling 30 days (sliding window).
	•	No JWTs anywhere.
	•	Cross-app domain: cookie valid for app.lynkby.com and api.lynkby.com (sameSite=Lax).
	•	Hardened security: CSRF protection, rate limiting, device/session management.

⸻

🎯 What’s changing
	•	Mailer: Use Resend for all auth emails.
	•	Auth UI: One column: Email input → separator → “Continue with Google”.
	•	OTP UX: After “Send code”, show OTP input inline below the email.
While OTP is visible, the email field is disabled for typing, but there’s a “Change email” affordance that safely resets state.

Everything else from the prior auth spec (cookie session, rolling 30 days, CSRF, rate limits) stays the same.

⸻

🔌 Mail Delivery — Resend

Environment
	•	RESEND_API_KEY (server only)
	•	RESEND_FROM=login@lynkby.com (or no-reply@lynkby.com)
	•	Optional brand: RESEND_REPLY_TO=support@lynkby.com

API call
	•	Endpoint: https://api.resend.com/emails
	•	Headers: Authorization: Bearer ${RESEND_API_KEY}, Content-Type: application/json
	•	Body (example):

{
  "from": "Lynkby <login@lynkby.com>",
  "to": ["user@example.com"],
  "subject": "Your Lynkby code: 123456",
  "html": "<!doctype html>... (see template)",
  "text": "Your Lynkby code is 123456. It expires in 10 minutes.",
  "tags": [{"name":"purpose","value":"auth-otp"}]
}

Templates (keep fast, brand-light)
	•	Subject: Your Lynkby code: {{ code }}
	•	Text (fallback):

Your Lynkby sign-in code is: {{ code }}
It expires in 10 minutes. If you didn’t request it, ignore this email.


	•	HTML (compact, accessible, system fonts; no images/external CSS). Keep under ~10KB.

Delivery/Retry
	•	Send once per request; do not auto-retry client-side.
	•	If Resend 429/5xx: backoff and return a generic 200 with “If that email exists, we sent a code.” (avoid enumeration). Log internally.

⸻

🧱 Backend endpoints (API Worker)

POST /v1/auth/otp/request
	•	Body: { email, csrfToken }
	•	Validates email, CSRF, rate limits (5/hour/email & IP; 20/day/email).
	•	Generate 6-digit code (000000–999999), store sha256(code), expiresAt = now + 10m.
	•	Send via Resend (above).
	•	Response: always 200 { ok:true } (no enumeration).

POST /v1/auth/otp/verify
	•	Body: { email, code, csrfToken }
	•	Verify against most recent unconsumed OTP within 10m; increment attempts on miss (lock after 5 wrong tries).
	•	On success:
	•	Mark consumedAt.
	•	getOrCreate User(email); set emailVerified=true.
	•	Create Session; set cookie lb_sess (httpOnly, Secure, SameSite=Lax, Domain=.lynkby.com, Max-Age=30d).
	•	Response: 200 { ok:true } or 400 { error:"INVALID_OR_EXPIRED" }.

POST /v1/auth/otp/resend
	•	Body: { email, csrfToken }
	•	Only allowed after an initial request and before verification; min interval 30s between sends per email.
	•	Enforce same rate limits; create new OTP (invalidate previous).
	•	Response: 200 { ok:true }.

(Other session endpoints unchanged.)

⸻

🖥️ Auth UI (single column)

Layout (desktop & mobile)
	•	Centered max-width 420px, 24px padding, generous spacing.
	•	Order:
	1.	Logo (small)
	2.	Headline: “Sign in to Lynkby”
	3.	Email block
	•	Email input
	•	Send code button
	•	(after request) OTP inputs appear below email
	•	Helper: “Didn’t get a code? Resend in 30s”
	4.	Separator (“or” with hairline)
	5.	Sign in with Google button
	6.	Legal: “By continuing you agree to…”

Components (suggested)
	•	EmailInput
	•	PrimaryButton
	•	OtpInput (6 cells, auto-advance, paste-to-fill)
	•	InlineNotice (errors/info)
	•	Separator
	•	GoogleButton

Email → OTP UX

States
	•	idle → requesting → code_sent → verifying → success | error
	•	Local UI store keeps: email, emailLocked, cooldownMs, otp, errors.

Behaviors
	•	Idle
	•	Email input enabled; “Send code” primary.
	•	Press Enter submits request.
	•	Requesting
	•	Disable inputs; show small spinner in button.
	•	Code Sent
	•	Show OTP input below the email; email field becomes disabled (grayed out).
	•	A small “Change email” text button appears right under the email (not in the field) → on click:
	•	Confirm: “Change email and cancel this code?”
	•	Yes → clear OTP state, unlock email, focus email.
	•	No → keep current state.
	•	Show cooldown text: “Resend code in 30s” → becomes Resend button when 0.
	•	OTP Input
	•	6 boxes; type auto-advances; Backspace moves back; paste “123456” fills all.
	•	When 6 digits present → auto-submit or enable “Verify” button.
	•	Verifying
	•	Lock OTP cells; spinner on Verify.
	•	Error
	•	Show friendly message inline above OTP:
	•	Invalid: “That code didn’t work. Try again.” (shake animation optional)
	•	Expired: “Code expired. Get a new one.” (focus “Resend”)
	•	Keep email locked; allow “Change email”.

Buttons/labels (copy)
	•	“Send code”
	•	“Enter the 6-digit code” (field label)
	•	“Verify & continue”
	•	“Change email”
	•	“Resend code” (activates when cooldown ends)
	•	Helper text (neutral): “We’ll email a one-time code to sign you in.”

Accessibility
	•	Email has autocomplete="email".
	•	OTP inputs share a group label (role="group" aria-labelledby="otp-label").
	•	Support single hidden input binding for paste if using 6 visible boxes.
	•	Live region for errors (aria-live="polite").

Edge cases
	•	Wrong email typed: “Change email” resets safely; no lingering OTP.
	•	Multiple tabs: each tab can request codes; server rate limits handle abuse.
	•	Paste with spaces/dashes: clean input to digits.

⸻

🔁 State machine (pseudo-logic)

state idle {
  on SEND_CODE(email) -> requesting
}
state requesting {
  effect: call POST /auth/otp/request
  on SUCCESS -> code_sent { emailLocked=true; startCooldown(30s) }
  on FAILURE -> idle { showGenericSent() } // still 200; UI proceeds to code_sent for consistency? Prefer: proceed to code_sent only on client success. Keep 200 true → show “Check your email”.
}
state code_sent {
  on CHANGE_EMAIL -> confirm -> idle { clearOtp(); emailLocked=false; focusEmail() }
  on RESEND when cooldown==0 -> requesting (same as SEND_CODE)
  on OTP_FILLED(6digits) -> verifying
}
state verifying {
  effect: POST /auth/otp/verify
  on SUCCESS -> success (redirect /dashboard/home)
  on INVALID -> code_sent { showError("That code didn’t work.") ; clearOtp(); focusOtp() }
  on EXPIRED -> code_sent { showError("Code expired.") ; enableResend() }
}

UX tip: when /auth/otp/request returns, always move to code_sent (show OTP UI) and surface “Check your email”. This keeps flow predictable and avoids revealing deliverability problems.

⸻

🧭 Google Sign-in (same screen)
	•	Keep in the same column under a small “or” separator.
	•	Button copy: Continue with Google
	•	On click: redirect to /v1/auth/google/start.
	•	On callback success → set session cookie → redirect to /dashboard/home.

⸻

🔒 CSRF & Cookies (recap)
	•	Set lb_csrf (non-httpOnly) when serving /login.
	•	Require X-CSRF-Token for /auth/otp/request, /auth/otp/verify, /auth/otp/resend.
	•	Session cookie lb_sess issued on verify/callback; rolling 30-day updates on each authed request.

⸻

📊 Rate limits (server)
	•	/auth/otp/request: 5/hour/email and 5/hour/IP, 20/day/email.
	•	/auth/otp/resend: min 30s between sends; shares the same bucket.
	•	/auth/otp/verify: max 5 wrong attempts per OTP, then require new OTP.

⸻

🧪 Acceptance criteria
	•	Email screen shows only one column with Email → separator → Google.
	•	After “Send code”, OTP input appears below email, email becomes disabled, and “Change email” is visible.
	•	“Change email” smoothly resets OTP state and focuses email without reload flicker.
	•	Resend is disabled for 30s, then enabled; requesting resend preserves disabled email & OTP view.
	•	Paste “123 456” into OTP fills correctly; entering 6 digits auto-submits (or enables verify).
	•	Error states are inline, human (“didn’t work”, “expired”) and accessible.
	•	Resend uses Resend API and respects rate limits.
	•	Successful verify creates cookie session; redirect to /dashboard/home.
	•	Google button works from the same page; callback sets cookie; redirect home.
	•	All mutating requests carry valid CSRF; missing/invalid → 403.
	•	No user enumeration anywhere.

⸻

🧩 Suggested UI structure (React + Tailwind)

<div className="mx-auto w-full max-w-[420px] px-6 py-10">
  <Logo className="mx-auto mb-6" />
  <h1 className="text-2xl font-semibold text-center mb-6">Sign in to Lynkby</h1>

  {/* Email block */}
  <label className="block text-sm font-medium mb-2">Email</label>
  <input type="email" autoComplete="email" disabled={emailLocked} ... />
  <button className="btn-primary mt-3 w-full" onClick={sendCode} disabled={!isValidEmail || requesting}>Send code</button>

  {phase === 'code_sent' && (
    <>
      <div className="mt-2 text-xs text-muted-foreground">
        <button className="underline" onClick={onChangeEmail}>Change email</button>
      </div>
      <div className="mt-5">
        <div id="otp-label" className="text-sm font-medium mb-2">Enter the 6-digit code</div>
        <OtpInput aria-labelledby="otp-label" value={otp} onChange={setOtp} />
        {error && <div role="status" aria-live="polite" className="mt-2 text-sm text-red-600">{error}</div>}
        <div className="mt-3 text-sm">
          {cooldown > 0
            ? <span className="text-muted-foreground">Resend code in {cooldown}s</span>
            : <button className="underline" onClick={resend}>Resend code</button>}
        </div>
        <button className="btn-primary mt-4 w-full" disabled={!otpReady || verifying} onClick={verify}>Verify & continue</button>
      </div>
    </>
  )}

  {/* Separator */}
  <div className="my-8 flex items-center gap-3">
    <div className="h-px flex-1 bg-border" />
    <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
    <div className="h-px flex-1 bg-border" />
  </div>

  {/* Google */}
  <button className="btn-outline w-full" onClick={googleStart}>
    <GoogleIcon className="mr-2" /> Continue with Google
  </button>

  <p className="mt-8 text-center text-xs text-muted-foreground">
    By continuing, you agree to our Terms and Privacy Policy.
  </p>
</div>


-------------------------

Brand style guide for Lynkby’s screen that feels professional, modern, and consistent with the TikTok-creator-first positioning. This will ensure the login flow looks trustworthy, premium, and fast.

⸻

🎨 Lynkby Auth Screen Style Guide

1. Brand Core
	•	Brand personality: clean, sharp, creator-friendly, not “startup scrappy.” Feels like a serious tool but still approachable.
	•	Tone: professional, minimal, with subtle energy (like TikTok native but calmer).
	•	Goal: convey trust (for login/security) and speed (sign-in in under 1 min).

⸻

2. Color Palette

Primary
	•	Emerald Green #34D399
→ Accent color for success states (verified, code sent).
	•	Deep Indigo #4F46E5
→ Main CTA (e.g. “Send code”, “Verify & continue”).
Strong but not aggressive, feels premium.

Secondary
	•	Warm Orange #F97316
→ Used sparingly for highlights (e.g. resend timer, warnings).

Backgrounds
	•	Light mode: #FAFAFA (soft gray-white)
	•	Dark mode: #0D0D0D (true black, TikTok-friendly)

Surfaces
	•	Light: #FFFFFF (cards, inputs)
	•	Dark: #1A1A1A

Text
	•	Light: #111827 (titles), #6B7280 (muted)
	•	Dark: #F9FAFB (titles), #9CA3AF (muted)

⸻

3. Typography
	•	Font family: Inter or Plus Jakarta Sans (system fallback: system-ui, -apple-system, Segoe UI, Roboto, Arial).
	•	Weights:
	•	Headings: SemiBold (600)
	•	Body: Regular (400)
	•	Buttons: Medium (500)
	•	Sizes:
	•	H1 (auth title): 24px / 32px
	•	Label: 14px / 20px
	•	Input text: 16px / 24px
	•	Helper/error text: 13px / 18px

⸻

4. Components

Inputs
	•	Shape: Rounded 12px radius.
	•	Border: 1px solid #E5E7EB (light) / #374151 (dark).
	•	Focus: 2px glow in Indigo #4F46E5.
	•	Disabled: background #F3F4F6 (light) / #111827 (dark).

OTP Boxes
	•	Six boxes, equal width, spaced evenly.
	•	Border changes from neutral → indigo on focus.
	•	Subtle animation when filled (scale 1.02 → 1.0).

Buttons
	•	Primary: Indigo background #4F46E5, white text, rounded-lg (12px).
Hover: darker indigo #4338CA.
Disabled: #9CA3AF.
	•	Outline: 1px solid #E5E7EB, text #111827 (light) / #F9FAFB (dark).
Hover: #F3F4F6.

Separator
	•	Thin neutral line with centered text “or” (uppercase, 12px, muted gray).

⸻

5. Layout
	•	Centered container, max-width 420px.
	•	Vertical spacing: 24–32px between major sections.
	•	Generous white space, no clutter.
	•	Always vertically centered on large screens, scrollable on small screens.

⸻

6. States & Feedback
	•	Success (e.g. OTP sent): inline message with green text/icon.
	•	Error: red #DC2626 text below input; shake animation optional.
	•	Loading: button shows spinner but preserves width.
	•	Disabled email after code: input grayed out but readable, with “Change email” link directly below in muted gray with underline.

⸻

7. Motion & Microinteractions
	•	Inputs: smooth 150ms focus glow.
	•	OTP: auto-advance animation (scale bounce).
	•	Errors: fade-in + slight shake.
	•	Separator: subtle fade when appearing after OTP step.
	•	Confetti (tiny burst) only after successful login → optional, not default.

⸻

8. Dark Mode Adjustments
	•	Background: #0D0D0D
	•	Surface (inputs, cards): #1A1A1A
	•	Text: White #F9FAFB and muted #9CA3AF
	•	Borders: #2D2D2D
	•	Indigo CTA: stays as-is (good on dark).
	•	Errors: Red #F87171
	•	Success: Emerald #34D399

⸻

9. Example Composition

Light mode

[ Lynkby logo ]
Sign in to Lynkby

[ Email input                ]
[ Send code button            ]
(change email / resend under input)
[ OTP boxes appear after code ]

────────── or ──────────

[ Continue with Google button ]

By continuing, you agree to our Terms & Privacy Policy.

Dark mode is identical but swaps background/surface/text colors.

⸻

10. Branding Touches
	•	Logo: minimal wordmark in black (light) or white (dark).
	•	Subtle gradient accents in CTA buttons (Indigo → Violet) for brand personality.
	•	Footer link to lynkby.com with muted color (12px).

⸻

👉 This guide ensures your auth screen feels consistent, professional, and premium, while being smooth and user-friendly.
