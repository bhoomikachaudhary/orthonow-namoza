# OrthoNow — Developer Assignment
**Namoza · Developer Position 1 (Client Web + Martech)**

---

## Loom Walkthrough
🎥 [Watch the walkthrough](#) ← replace with your Loom link

---

## The Brief
OrthoNow is a chain of 9 orthopaedic clinics across Bengaluru, Hyderabad, and Chennai.
They onboarded with Namoza with no event tracking, GA4 configured with only pageviews,
no GTM, and a landing page converting at 2.1% against an industry benchmark of 6–8%.

Three deliverables were scoped for the first month.

---

## Task 01 — GTM Event Schema

📄 [`task-01/task-01-gtm-schema.md`](task-01/task-01-gtm-schema.md)

A complete GTM event schema covering all 6 key interactions on the OrthoNow website:

| Interaction | Event Name |
|---|---|
| Appointment booking form (3-step) | `booking_step_complete` + `booking_confirmed` |
| Call Now buttons (homepage, clinic pages, landing page) | `click_call_now` |
| WhatsApp chat widget | `click_whatsapp_chat` |
| Gated Patient Guide download | `download_patient_guide_form_submit` |
| Clinic location page views (9 pages) | `view_clinic_page` |
| Blog scroll depth | `blog_scroll_depth` |

The schema includes for each event: trigger type, minimum 3 key parameters, GA4
report/audience mapping, and the actual JSON dataLayer pushes for the booking form
funnel — not pseudocode.

### Working Demo
The schema is backed by a fully working demo site in
[`task-01/booking-form-demo/`](task-01/booking-form-demo/).

Open `index.html` in a browser (or run `npx serve .` inside the folder).
Every tracked interaction fires a real `window.dataLayer.push()` — visible in
DevTools console on each page:

| Page | Event fired |
|---|---|
| `index.html` | `click_call_now` on Call Now button |
| `clinic-*.html` | `view_clinic_page` on load (with clinic_id + city) |
| `blog.html` | `blog_scroll_depth` at 25 / 50 / 75 / 90% scroll |
| `guide.html` | `download_patient_guide_form_submit` on form submit |
| `booking.html` | `booking_step_complete` (steps 1+2) + `booking_confirmed` |
| Any page | `click_whatsapp_chat` on the floating WhatsApp widget |

---

## Task 02 — Landing Page Build

📄 [`task-02/landing-page.html`](task-02/landing-page.html)
📸 [`task-02/pagespeed-screenshot.png`](task-02/pagespeed-screenshot.png)

A single self-contained HTML file replacement for OrthoNow's 'Book a Consultation'
landing page. No frameworks, no external requests, runs in a browser with no server.

**Key decisions:**
- Headline is specific to the audience — knee/back pain, Bengaluru, same-week
  appointments. Not generic healthcare copy.
- 2-field form only (Name + Phone) — every extra field reduces conversion rate
  in healthcare lead gen.
- Trust element uses real numbers (4.8/5, 2,300+ patients, 9 clinics) — specific
  figures convert better than vague reassurance.
- `consultation_form_submitted` dataLayer push fires on successful submit only —
  never on page load, never on failed validation. No PII in the push.
- Zero external requests (no web fonts, no images, inline CSS, JS at end of body)
  → PageSpeed Mobile score: **[your score]+**

**To test the dataLayer push:**
1. Open `landing-page.html` in Chrome
2. Open DevTools → Console
3. Fill in a valid name and 10-digit phone number
4. Click "Book My Consultation"
5. `consultation_form_submitted` push appears in console

---

## Task 03 — Integration Design

📄 [`task-03/task-03-integration-design.md`](task-03/task-03-integration-design.md)

Written architecture (300-400 words) for connecting the landing page form to:
- **HubSpot** — contact created/updated via custom phone-based deduplication
  (HubSpot's default email dedup does not apply here since no email is collected)
- **Karix WhatsApp Business API** — confirmation message within 2 minutes
- **Google Ads** — server-side conversion firing via Enhanced Conversions API

Key decisions covered: why a direct serverless function over Zapier/Make, how
phone deduplication is handled when the same number submits twice, the single
biggest failure point and its fallback, and how the 2-minute WhatsApp SLA is
monitored.

---

## Repo Structure

```
orthonow-namoza/
│
├── README.md
│
├── task-01/
│   ├── task-01-gtm-schema.md
│   └── booking-form-demo/
│       ├── index.html
│       ├── clinic.html
│       ├── clinic-blr-indiranagar.html
│       ├── clinic-blr-whitefield.html
│       ├── clinic-blr-jayanagar.html
│       ├── clinic-hyd-banjarahills.html
│       ├── clinic-hyd-gachibowli.html
│       ├── clinic-hyd-secunderabad.html
│       ├── clinic-chn-adyar.html
│       ├── clinic-chn-annanagar.html
│       ├── clinic-chn-velachery.html
│       ├── blog.html
│       ├── guide.html
│       ├── booking.html
│       ├── tracking.js
│       └── styles.css
│
├── task-02/
│   ├── landing-page.html
│   └── pagespeed-screenshot.png
│
└── task-03/
    └── task-03-integration-design.md
```

---

*Submission by Bhoomika Chaudhary · Developer Assignment · Namoza*
