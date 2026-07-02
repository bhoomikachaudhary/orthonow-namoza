# Task 01 — GTM Event Schema (OrthoNow)

Full event tracking schema for OrthoNow's website, covering the 6 key interaction
types called out in the brief: the 3-step booking form, Call Now buttons, the
WhatsApp widget, the gated Patient Guide download, the 9 clinic location pages,
and blog scroll depth.

## 1. Complete Event Schema

| Event Name | Trigger Type | Key Parameters (min. 3) | GA4 Report / Audience |
|---|---|---|---|
| `view_clinic_page` | Custom Event (dataLayer push), fired on page load when the page is identified as a clinic location template | `clinic_id`, `clinic_name`, `city` | Engagement → Pages and screens (clinic dimension); feeds a "Clinic Page Viewers by City" remarketing audience |
| `click_call_now` | Custom Event (dataLayer push) on click, via delegated listener on any `[data-track="call_now"]` element | `page_type` (homepage / clinic_location / landing_page), `clinic_id` (null off clinic pages), `phone_number` | Engagement → Events; marked as a GA4 "Calls" conversion |
| `click_whatsapp_chat` | Custom Event (dataLayer push) on click of the floating WhatsApp widget, fired before the `wa.me` link opens | `page_location`, `page_type`, `widget_state: "opened"` | Engagement → Events; secondary/micro-conversion audience ("WhatsApp Intent Users") |
| `download_patient_guide_form_submit` | Custom Event (dataLayer push), fired on successful client-side validation of the gated name+phone form — **not** a File Download click trigger (see note below) | `lead_source: "patient_guide"`, `name_provided` (boolean), `phone_provided` (boolean) | Engagement → Events; feeds "Guide Downloaders" remarketing audience and a lead-gen conversion |
| `blog_scroll_depth` | Native GTM Scroll Depth trigger (Vertical, Percentages, thresholds 25/50/75/90) | `scroll_percentage`, `article_title`, `page_path` | Engagement → Pages and screens, scroll % as secondary dimension; feeds "Engaged Readers" content remarketing audience |
| `view_booking_form` | Custom Event (dataLayer push) on booking page load | `form_name: "orthonow_consultation_booking"` | Engagement → Events; top of booking funnel reference point |
| `booking_step_complete` (step 1) | Custom Event (dataLayer push), filtered on `step_number = 1` | `step_number`, `step_name`, `clinic_location`, `specialty` | Funnel Exploration (step 1); Events report |
| `booking_step_complete` (step 2) | Custom Event (dataLayer push), filtered on `step_number = 2` | `step_number`, `step_name`, `clinic_location`, `preferred_date` | Funnel Exploration (step 2); Events report |
| `booking_confirmed` | Custom Event (dataLayer push) on final confirm click | `booking_id`, `clinic_location`, `specialty`, `preferred_date`, `value` | Funnel Exploration (step 3, conversion); **primary GA4 conversion event**; imported into Google Ads |

**Note on `download_patient_guide_form_submit`:** GTM's built-in File Download
auto-event trigger fires on any click of a link pointing to a PDF, which would
also fire on repeat clicks, right-click-copy-link, or re-downloads by the same
lead — none of which represent a new lead. The form validating successfully is
the only signal that's actually once-per-lead, so that's what's pushed, not a
click on the PDF link itself.

**Note on `click_call_now` / `click_whatsapp_chat`:** both could technically be
done as pure native GTM "Just Links" triggers (matching `tel:` or `wa.me` hrefs)
with zero custom code. I'm using manual pushes instead because we also want
`clinic_id` and `page_type` as parameters on the event — pulling those from a
native Click trigger means stacking multiple Auto-Event Variables (URL parsing,
DOM traversal to a parent element's `data-*` attribute), which is more fragile
to maintain than one explicit push that already carries the parameters.

## 2. Booking Form Funnel Drop-off Tracking

Three distinct pushes, fired by the front-end developer at the exact moment
each step's primary action completes — **never** on render, and never on a
failed validation attempt (a push on every click attempt, including failures,
would inflate step counts and corrupt the funnel numbers).

**Step 1 — clinic + specialty selected:**
```json
{
  "event": "booking_step_complete",
  "step_number": 1,
  "step_name": "location_specialty_selected",
  "clinic_location": "Bengaluru - Indiranagar",
  "specialty": "Sports Medicine"
}
```

**Step 2 — contact details entered:**
```json
{
  "event": "booking_step_complete",
  "step_number": 2,
  "step_name": "contact_details_entered",
  "clinic_location": "Bengaluru - Indiranagar",
  "preferred_date": "2026-07-04"
}
```
Note: `name` and `phone` are deliberately **not** included — no PII goes into
`dataLayer`. If the CRM needs the actual values, that's a separate server-side
form submission (see Task 03), unrelated to this analytics push.

**Step 3 — booking confirmed:**
```json
{
  "event": "booking_confirmed",
  "step_number": 3,
  "step_name": "booking_confirmed",
  "booking_id": "BK-90213",
  "clinic_location": "Bengaluru - Indiranagar",
  "specialty": "Sports Medicine",
  "preferred_date": "2026-07-04",
  "value": 1
}
```

Step 3 is deliberately named `booking_confirmed` rather than reusing
`booking_step_complete` with `step_number: 3`. It's the conversion event, so
giving it its own event name keeps it cleanly separable in GTM — one trigger,
one tag — and means it can be marked as a GA4 conversion and imported into
Google Ads without needing to filter out step 1/2 firings of a shared event name.

### GTM trigger configuration

- **Trigger 1:** Custom Event, Event name = `booking_step_complete`, filter
  `{{DLV - step_number}} equals 1`
- **Trigger 2:** Custom Event, Event name = `booking_step_complete`, filter
  `{{DLV - step_number}} equals 2`
- **Trigger 3:** Custom Event, Event name = `booking_confirmed` (no filter
  needed — distinct event name)

Each fires a GA4 Event tag mapping `step_number`, `step_name`,
`clinic_location`, `specialty`/`preferred_date` (and `value` on confirm) as
event parameters, registered as custom dimensions in GA4 Admin → Custom
definitions so they're queryable in Funnel Exploration.

### Surfacing drop-off in GA4 Funnel Exploration

Build an **open funnel** with three steps:
- Step 1: `booking_step_complete` AND `step_number = 1`
- Step 2: `booking_step_complete` AND `step_number = 2`
- Step 3: `booking_confirmed`

GA4 computes the absolute and percentage drop-off between each step
automatically once these events exist. Add `clinic_location` as a
breakdown dimension on the funnel to see whether drop-off concentrates in
specific clinics — useful given OrthoNow has 9 locations with presumably
uneven page quality, staffing, or load times across them.

## 3. Conversion Action to Import into Google Ads

**`booking_confirmed`** — not `click_call_now`, not
`download_patient_guide_form_submit`.

Google Ads conversion import should optimize Smart Bidding toward the action
closest to actual revenue, not toward a proxy signal. Calls are noisy: clicking
a `tel:` link doesn't mean the call connected, was answered, or led to
anything — especially on mobile, where mis-taps are common — so bidding
against it risks pulling in low-intent clicks. The Patient Guide download is
further still from revenue; it's top-of-funnel research behavior, not booking
intent.

`booking_confirmed` is the one event where a real person with a real phone
number selected a real clinic and specialty and completed the funnel — it's
the closest proxy OrthoNow has to a sale, and it's the only one of the three
with a clean `value` field to hand Smart Bidding for value-based optimization.

## 4. Who writes the dataLayer push — GTM or the developer?

**The front-end developer writes every push in this schema. GTM cannot
generate any of them on its own.**

GTM listens to the DOM (clicks, page loads) and to `window.dataLayer` — it has
no native concept of "step 2 of a multi-step form," "this is clinic #6 of 9,"
or "the user scrolled 50% of this specific article." All of that is
application-level state that only exists inside JavaScript, and it stays
invisible to GTM unless the front-end code explicitly serializes it into a
`dataLayer.push()` call at the right moment.

Concretely, for the booking form: the step 2 push lives inside the "Continue"
button's click handler, fired only after client-side validation passes, right
before the UI transitions to step 3. There's no second `<form>` tag, no page
reload, no URL change — nothing in the DOM for GTM to bind a "step 2 reached"
listener to. The line of code calling `pushEvent({...})` *is* the entire
mechanism. If that line didn't exist, no GTM trigger configuration, however
clever, would make step 2 visible.

### How I'd brief the front-end dev to implement step 2 specifically

1. Locate the click handler for the "Continue" button on step 2 of the form.
2. Place the push **after** client-side validation succeeds and **before**
   the UI transitions to step 3 — never on render, never on a failed
   validation attempt (a push on every attempt would inflate step counts and
   break the funnel numbers in GA4).
3. Use this exact shape, with these exact key names and types — GA4 custom
   dimensions are mapped to these keys, so a typo or a type mismatch
   (`step_number` as a string `"2"` instead of a number `2`) breaks the
   funnel report silently, not loudly:
   ```json
   {
     "event": "booking_step_complete",
     "step_number": 2,
     "step_name": "contact_details_entered",
     "clinic_location": "Bengaluru - Indiranagar",
     "preferred_date": "2026-07-04"
   }
   ```
4. Do not include `name` or `phone` — no PII into `dataLayer`. If HubSpot
   needs the actual values, that's a separate server-side submission.
5. Confirm in GTM Preview mode that it fires exactly once per genuine step
   completion — watch for accidental double-fires (duplicate event listeners,
   or a framework re-render triggering the handler twice).
