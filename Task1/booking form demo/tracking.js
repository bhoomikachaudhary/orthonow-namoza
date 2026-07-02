/* ============================================================
   ORTHONOW — SHARED TRACKING LAYER
   Loaded on every page. This is the ONE file a front-end dev
   would own and that GTM has zero visibility into the internals
   of. GTM only ever sees what gets pushed to window.dataLayer
   below — it cannot independently detect scroll depth on a custom
   layout, a gated download form submit, or a multi-step form
   transition. Every one of those requires an explicit push from
   here.
   ============================================================ */

/* ----------------------------------------------------------
   1. DATALAYER INIT
   Must run before GTM's container snippet loads, in <head>,
   on every page. Using `|| []` avoids wiping out anything GTM
   itself may have already initialized.
   ---------------------------------------------------------- */
window.dataLayer = window.dataLayer || [];

/* ----------------------------------------------------------
   2. pushEvent()
   Single chokepoint for every dataLayer.push() in this site.
   Also logs to console for QA/debugging purposes.
   panel (injected below) so events are visible without opening
   GTM Preview mode — purely a demo/QA convenience, not something
   you'd ship to production as-is.
   ---------------------------------------------------------- */
function pushEvent(eventObj) {
  window.dataLayer.push(eventObj);
  console.log('%cdataLayer.push', 'color:#0e7c66;font-weight:bold', eventObj);
}



/* ============================================================
   4. CALL NOW TRACKING
   Brief requirement: "'Call Now' buttons — present on homepage,
   each clinic location page, and the landing page."

   Implementation: any element with [data-track="call_now"] is
   auto-wired here via event delegation, so adding a new Call Now
   button anywhere on the site (a 10th clinic page, a new landing
   page) requires zero extra JS — just the right data attributes
   on the element.

   GTM equivalent note: this COULD be done as a native GTM "Just
   Links" click trigger matching the tel: href, without any custom
   push at all. I'm pushing manually here instead because we also
   want clinic_id/page_type as parameters, which a plain Click
   trigger can't infer on its own without extra Auto-Event
   Variables — a single dataLayer push is more reliable and easier
   to audit than stacking multiple click-trigger variable lookups.
   ============================================================ */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-track="call_now"]');
  if (!btn) return;

  pushEvent({
    event: 'click_call_now',
    page_type: btn.dataset.pageType || 'unknown',
    clinic_id: btn.dataset.clinicId || null,
    phone_number: btn.dataset.phone || btn.getAttribute('href')
  });
});

/* ============================================================
   5. WHATSAPP WIDGET TRACKING
   Brief requirement: "WhatsApp chat widget — floating button,
   opens wa.me link."

   The widget itself is injected here so it's present on every
   page that loads this script, mirroring how a real floating
   widget (often itself injected by a third-party snippet) would
   need its click tracked regardless of which page it's on.
   ============================================================ */
(function injectWhatsAppWidget() {
  document.addEventListener('DOMContentLoaded', () => {
    const wa = document.createElement('a');
    wa.href = 'https://wa.me/919999999999?text=Hi%2C%20I%27d%20like%20to%20book%20a%20consultation';
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.id = 'whatsapp-widget';
    wa.setAttribute('aria-label', 'Chat on WhatsApp');
    wa.innerHTML = '💬';
    wa.style.cssText = `
      position:fixed; bottom:24px; left:24px; width:54px; height:54px; border-radius:50%;
      background:#25D366; display:flex; align-items:center; justify-content:center;
      font-size:26px; text-decoration:none; box-shadow:0 4px 14px rgba(0,0,0,0.25); z-index:9998;
    `;
    wa.addEventListener('click', function () {
      pushEvent({
        event: 'click_whatsapp_chat',
        page_location: window.location.pathname,
        page_type: document.body.dataset.pageType || 'unknown',
        widget_state: 'opened'
      });
      // Real implementation: do NOT preventDefault — let wa.me open normally.
      // The push fires synchronously before the new tab opens.
    });
    document.body.appendChild(wa);
  });
})();

/* ============================================================
   6. CLINIC LOCATION PAGE VIEW
   Brief requirement: "Clinic location page views — 9 pages, one
   per clinic."

   Rather than relying on GTM's built-in Page View trigger (which
   only tells you a URL loaded, not which clinic, unless you parse
   the URL with a regex every time), the page itself declares its
   own identity via data attributes on <body>, and pushes a single
   structured event GTM can read directly as a Data Layer Variable.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  const body = document.body;
  if (body.dataset.pageType === 'clinic_location') {
    pushEvent({
      event: 'view_clinic_page',
      clinic_id: body.dataset.clinicId,
      clinic_name: body.dataset.clinicName,
      city: body.dataset.city
    });
  }
});

/* ============================================================
   7. BLOG SCROLL DEPTH
   Brief requirement: "Blog article reads — scroll depth matters
   here."

   GTM has a built-in Scroll Depth trigger, which is the preferred
   production approach (zero custom JS needed — GTM injects its
   own listener and fires a native gtm.scrollDepth event at
   configured thresholds). I'm reimplementing the same logic
   manually here ONLY so this demo is fully self-contained and
   doesn't depend on a live GTM container to prove the concept.
   In the real build, this block would be deleted and replaced
   with a GTM Scroll Depth trigger at 25/50/75/90%, Vertical
   Scroll Depths enabled, "Percentages" mode.
   ============================================================ */
(function trackBlogScrollDepth() {
  const thresholds = [25, 50, 75, 90];
  const fired = new Set();

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.pageType !== 'blog_article') return;

    const articleTitle = document.body.dataset.articleTitle || document.title;
    const startTime = Date.now();

    window.addEventListener('scroll', function () {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const scrolled = Math.round((scrollTop / docHeight) * 100);

      thresholds.forEach(t => {
        if (scrolled >= t && !fired.has(t)) {
          fired.add(t);
          pushEvent({
            event: 'blog_scroll_depth',
            scroll_percentage: t,
            article_title: articleTitle,
            time_on_page_seconds: Math.round((Date.now() - startTime) / 1000)
          });
        }
      });
    }, { passive: true });
  });
})();
