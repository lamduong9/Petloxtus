/* ==========================================================================
   PETLOXTUS — Lead Gate, Silent Webhook Fetch & Interactive B2B Controls
   Domain: petloxtus.com | Platform: EmDash CMS on Cloudflare Workers
   ========================================================================== */

/**
 * Configure PUBLIC_LEAD_WEBHOOK_URL in Cloudflare Workers (or wrangler.jsonc)
 * to forward B2B leads & quote requests directly to Make.com, Zapier, n8n, or Google Sheets.
 */
const DEFAULT_WEBHOOK_URL = "";

function getWebhookUrl() {
  const fromBody = document.body && document.body.getAttribute("data-webhook-url");
  if (fromBody && fromBody.trim() && !fromBody.includes("YOUR_WEBHOOK_URL_HERE")) {
    return fromBody.trim();
  }
  return DEFAULT_WEBHOOK_URL;
}

const STORAGE_KEYS = {
  UNLOCKED: "petloxtus_gate_unlocked_v1",
  PROFILE: "petloxtus_partner_profile_v1"
};

async function sendLeadToWebhook(payload) {
  const webhookUrl = getWebhookUrl();
  const enrichedPayload = {
    brand: "Petloxtus Co., Ltd",
    domain: "petloxtus.com",
    timestamp: new Date().toISOString(),
    pageUrl: window.location.href,
    language: document.documentElement.lang || "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    userAgent: navigator.userAgent,
    ...payload
  };

  if (!webhookUrl) {
    console.info("[Petloxtus Lead Webhook] Ready (set PUBLIC_LEAD_WEBHOOK_URL to enable POST):", enrichedPayload);
    return { ok: true, demo: true };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(enrichedPayload),
      keepalive: true
    });
    return { ok: response.ok, status: response.status };
  } catch (err) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(enrichedPayload),
        keepalive: true
      });
      return { ok: true, opaque: true };
    } catch (fallbackErr) {
      console.warn("[Petloxtus Webhook] Network error (non-blocking):", fallbackErr);
      return { ok: false, error: fallbackErr };
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Multi-language i18n initialization
  if (window.PetloxtusI18n) {
    const detectedLang = window.PetloxtusI18n.detectPreferredLanguage();
    window.PetloxtusI18n.applyLanguage(detectedLang);

    document.querySelectorAll(".js-lang-switcher").forEach((selectEl) => {
      selectEl.addEventListener("change", (e) => {
        window.PetloxtusI18n.applyLanguage(e.target.value);
      });
    });
  }

  const tr = (key, fb) =>
    window.PetloxtusI18n && window.PetloxtusI18n.t ? window.PetloxtusI18n.t(key, fb) : fb;

  // 2. B2B Lead Gate Overlay (on Homepage)
  const leadGate = document.getElementById("lead-gate");
  const leadGateForm = document.getElementById("lead-gate-form");
  const leadGateStatus = document.getElementById("lead-gate-status");

  function loadSavedProfile() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE) || "null");
    } catch (_) {
      return null;
    }
  }

  function unlockSite(profile) {
    document.body.classList.remove("gate-locked");
    if (leadGate) leadGate.classList.add("is-hidden");
    localStorage.setItem(STORAGE_KEYS.UNLOCKED, "true");
    if (profile) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      prefillQuoteForm(profile);
    }
  }

  function lockSite() {
    localStorage.removeItem(STORAGE_KEYS.UNLOCKED);
    document.body.classList.add("gate-locked");
    if (leadGate) leadGate.classList.remove("is-hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const isInternalReferrer =
    typeof document.referrer === "string" &&
    document.referrer.startsWith(window.location.origin);

  if (leadGate) {
    const hasHash = Boolean(window.location.hash && window.location.hash.length > 1);
    if (
      localStorage.getItem(STORAGE_KEYS.UNLOCKED) === "true" ||
      hasHash ||
      isInternalReferrer
    ) {
      unlockSite(loadSavedProfile());
      if (hasHash) {
        const target = document.getElementById(window.location.hash.slice(1));
        if (target) {
          requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: "auto", block: "start" });
          });
        }
      }
    } else {
      document.body.classList.add("gate-locked");
    }
  } else {
    // Visitor already browsing an internal page (/products, /services, etc.)
    localStorage.setItem(STORAGE_KEYS.UNLOCKED, "true");
  }

  const skipGateBtn = document.getElementById("skip-gate-btn");
  if (skipGateBtn) {
    skipGateBtn.addEventListener("click", () => {
      unlockSite(null);
    });
  }

  if (leadGateForm) {
    leadGateForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const company = document.getElementById("gate-company").value.trim();
      const email = document.getElementById("gate-email").value.trim();
      const phone = document.getElementById("gate-phone").value.trim();
      const country = document.getElementById("gate-country").value.trim();
      const submitBtn = leadGateForm.querySelector('button[type="submit"]');

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (company.length < 2) {
        leadGateStatus.textContent = tr("err_company", "Please enter your valid Company Name.");
        leadGateStatus.className = "form-status is-error";
        return;
      }
      if (!emailRegex.test(email)) {
        leadGateStatus.textContent = tr("err_email", "Please enter a valid Business Email address.");
        leadGateStatus.className = "form-status is-error";
        return;
      }
      if (phone.replace(/[^0-9+]/g, "").length < 7) {
        leadGateStatus.textContent = tr("err_phone", "Please enter a valid Phone / WhatsApp number.");
        leadGateStatus.className = "form-status is-error";
        return;
      }

      submitBtn.disabled = true;
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = tr("msg_unlocking", "Unlocking...");
      leadGateStatus.textContent = "";

      const profile = { company, email, phone, country };

      await sendLeadToWebhook({
        event: "lead_gate_unlock",
        ...profile
      });

      leadGateStatus.textContent = tr("msg_verified", "Verified! Welcome to Petloxtus B2B Manufacturing Portal.");
      leadGateStatus.className = "form-status is-success";

      setTimeout(() => {
        unlockSite(profile);
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }, 360);
    });
  }

  const resetGateBtn = document.getElementById("reset-gate-btn");
  if (resetGateBtn) {
    resetGateBtn.addEventListener("click", () => {
      if (leadGate) {
        lockSite();
      } else {
        localStorage.removeItem(STORAGE_KEYS.UNLOCKED);
        window.location.href = "/";
      }
    });
  }

  // 3. B2B Quotation Request Modal
  const quoteModal = document.getElementById("quote-modal");
  const quoteForm = document.getElementById("quote-form");
  const quoteStatus = document.getElementById("quote-status");
  const quoteProductSelect = document.getElementById("quote-product");
  const quoteCustomItem = document.getElementById("quote-custom-item");

  function prefillQuoteForm(profile) {
    if (!profile) return;
    const c = document.getElementById("quote-company");
    const em = document.getElementById("quote-email");
    const ph = document.getElementById("quote-phone");
    const po = document.getElementById("quote-port");
    if (c && !c.value) c.value = profile.company || "";
    if (em && !em.value) em.value = profile.email || "";
    if (ph && !ph.value) ph.value = profile.phone || "";
    if (po && !po.value && profile.country) po.value = profile.country;
  }

  function openQuoteModal(selectedProduct) {
    if (!quoteModal) return;
    prefillQuoteForm(loadSavedProfile());
    if (selectedProduct && quoteProductSelect) {
      let match = Array.from(quoteProductSelect.options).find(
        (opt) => opt.value === selectedProduct
      );
      if (!match && selectedProduct) {
        const dynOpt = document.createElement("option");
        dynOpt.value = selectedProduct;
        dynOpt.textContent = selectedProduct;
        dynOpt.setAttribute("data-dynamic", "true");
        // Remove previous dynamic option if present
        const prevDyn = quoteProductSelect.querySelector('option[data-dynamic="true"]');
        if (prevDyn) prevDyn.remove();
        quoteProductSelect.insertBefore(dynOpt, quoteProductSelect.firstChild);
        match = dynOpt;
      }
      if (match) quoteProductSelect.value = selectedProduct;
    }
    if (quoteCustomItem && selectedProduct) {
      quoteCustomItem.value = selectedProduct;
    }
    if (quoteStatus) quoteStatus.textContent = "";
    quoteModal.classList.add("is-open");
    document.body.classList.add("modal-open");
  }

  function closeQuoteModal() {
    if (!quoteModal) return;
    quoteModal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
  }

  document.querySelectorAll(".js-open-quote").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = btn.getAttribute("data-product") || "";
      openQuoteModal(product);
    });
  });

  document.querySelectorAll(".js-close-quote").forEach((btn) => {
    btn.addEventListener("click", closeQuoteModal);
  });

  if (quoteModal) {
    quoteModal.addEventListener("click", (e) => {
      if (e.target === quoteModal) closeQuoteModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeQuoteModal();
  });

  if (quoteForm) {
    quoteForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = quoteForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;

      const quotePayload = {
        event: "b2b_quote_request",
        company: document.getElementById("quote-company").value.trim(),
        email: document.getElementById("quote-email").value.trim(),
        phone: document.getElementById("quote-phone").value.trim(),
        product: quoteProductSelect ? quoteProductSelect.value : "",
        volume: document.getElementById("quote-volume").value.trim(),
        destinationPort: document.getElementById("quote-port").value.trim(),
        notes: document.getElementById("quote-notes").value.trim()
      };

      submitBtn.disabled = true;
      submitBtn.textContent = tr("msg_sending", "Sending Request...");

      await sendLeadToWebhook(quotePayload);

      quoteStatus.textContent = tr(
        "msg_quote_ok",
        "Thank you! Your inquiry has been received. Petloxtus responds within 24 hours and provides detailed quotations within 72 hours."
      );
      quoteStatus.className = "form-status is-success";
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;

      setTimeout(() => {
        quoteForm.reset();
        prefillQuoteForm(loadSavedProfile());
        closeQuoteModal();
      }, 2100);
    });
  }

  // 4. Mobile Menu Drawer
  const mobileToggle = document.getElementById("mobile-menu-btn");
  const mobileDrawer = document.getElementById("mobile-drawer");
  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener("click", () => {
      mobileDrawer.classList.toggle("is-open");
    });
    mobileDrawer.querySelectorAll("a, button").forEach((el) => {
      el.addEventListener("click", () => mobileDrawer.classList.remove("is-open"));
    });
  }

  // 5. FAQ Accordion
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const answer = item.querySelector(".faq-answer");
      const isOpen = item.classList.contains("is-open");

      document.querySelectorAll(".faq-item.is-open").forEach((openItem) => {
        openItem.classList.remove("is-open");
        openItem.querySelector(".faq-answer").style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add("is-open");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });

  // 6. Product Detail Image Gallery Switcher
  const mainImg = document.getElementById("detail-main-img");
  document.querySelectorAll(".detail-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const src = thumb.getAttribute("data-src");
      if (mainImg && src) {
        mainImg.src = src;
        document.querySelectorAll(".detail-thumb").forEach((t) => t.classList.remove("is-active"));
        thumb.classList.add("is-active");
      }
    });
  });

  // 7. Scroll Reveal Observer
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }
});
