# Task 03 — Integration Design (OrthoNow → HubSpot → WhatsApp → Google Ads)

## Architecture

I'd use a **direct server-side API call**, not Zapier/Make and not HubSpot's
native embed form.

On submit, the landing page's JS does two things: fires the
`dataLayer.push()` from Task 02 for analytics, and sends a `fetch()` POST to
a small serverless function (Cloudflare Worker / Vercel function) — not
directly to HubSpot from the browser, since that would expose the HubSpot
private app token client-side. That function is the orchestrator:

1. **HubSpot Contacts API** (`PATCH /crm/v3/objects/contacts`, upsert by a
   custom unique property — see dedup note below) — creates/updates the
   contact with Name, Phone, Clinic Preference, Source, Lead Status.
2. **Karix WhatsApp Business API** — fires the confirmation template message,
   called directly from the same function, in parallel with step 1 (not
   chained after it), so a slow HubSpot response doesn't eat into the WhatsApp
   SLA.
3. **Google Ads Conversion** — server-side via Google Ads API (Enhanced
   Conversions) rather than relying solely on the client-side GTM tag, so the
   conversion still fires even if the user closes the tab right after
   submitting, before GTM's tag finishes firing.

I'd skip Zapier/Make here specifically because the WhatsApp SLA is 2 minutes —
multi-step Zaps add unpredictable queue latency and are harder to monitor
precisely. A direct call gives sub-second control and proper error handling.

## The dedup trap

**HubSpot deduplicates contacts by email by default — not phone.** Since this
form only collects Name + Phone, two submissions create two separate contacts
unless I build phone-based dedup myself: a custom unique contact property on
`phone`, with the upsert call matching on that property before create.

If two patients submit with the **same phone, different names** — likely a
shared family phone, common in Indian healthcare lead gen — my setup updates
the existing contact's name rather than duplicating, and logs the previous
name in a `previous_enquiry_name` property so clinic staff see both names
were tied to that number, instead of silently overwriting and losing context.

## Biggest failure point & SLA monitoring

The biggest single point of failure is the **Karix API call itself** — if it
fails or times out, there's no automatic indication beyond a server log.
Fallback: queue failed WhatsApp sends into a retry table with exponential
backoff, and alert the team via Slack webhook if any message exceeds 90
seconds unsent — giving a 30-second buffer before breaching the 2-minute SLA.
A daily dashboard tracks delivery latency p50/p95 against the SLA.
