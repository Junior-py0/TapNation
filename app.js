// ============================================================
// TAPROUTE MVP CONFIG
// Replace these TWO values after creating your Supabase project.
// IMPORTANT: Use your public ANON key, NEVER your service_role key.
// ============================================================

const SUPABASE_URL = "https://dqyqkeqdvsidmffaanys.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iiFisqh9j9h4TJuvtcWEnw_976b5T6U";

const configured =
  !SUPABASE_URL.startsWith("PASTE_") &&
  !SUPABASE_ANON_KEY.startsWith("PASTE_");

const sb = configured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const $ = (id) => document.getElementById(id);

const state = {
  authMode: "signup",
  currentCard: null,
  destinationType: "url",
};

const els = {
  app: $("app"),
  redirectScreen: $("redirectScreen"),
  redirectTitle: $("redirectTitle"),
  redirectText: $("redirectText"),
  manualOpen: $("manualOpen"),

  hero: $("hero"),
  authSection: $("authSection"),
  dashboard: $("dashboard"),
  editorSection: $("editorSection"),
  logoutBtn: $("logoutBtn"),

  showSignupBtn: $("showSignupBtn"),
  showLoginBtn: $("showLoginBtn"),
  authTitle: $("authTitle"),
  authSubtitle: $("authSubtitle"),
  authForm: $("authForm"),
  emailInput: $("emailInput"),
  passwordInput: $("passwordInput"),
  authSubmitBtn: $("authSubmitBtn"),
  switchAuthBtn: $("switchAuthBtn"),
  authMessage: $("authMessage"),

  userEmail: $("userEmail"),
  openClaimBtn: $("openClaimBtn"),
  emptyClaimBtn: $("emptyClaimBtn"),
  claimBox: $("claimBox"),
  claimForm: $("claimForm"),
  claimCodeInput: $("claimCodeInput"),
  claimMessage: $("claimMessage"),
  emptyCards: $("emptyCards"),
  cardsGrid: $("cardsGrid"),

  backToCardsBtn: $("backToCardsBtn"),
  cardForm: $("cardForm"),
  cardNameInput: $("cardNameInput"),
  destinationInput: $("destinationInput"),
  whatsappInput: $("whatsappInput"),
  urlField: $("urlField"),
  whatsappField: $("whatsappField"),
  saveMessage: $("saveMessage"),
  editorCardTitle: $("editorCardTitle"),
  previewName: $("previewName"),
  nfcUrlText: $("nfcUrlText"),
  copyNfcBtn: $("copyNfcBtn"),
  testNfcBtn: $("testNfcBtn"),
  tapCount: $("tapCount"),

  toast: $("toast"),
};

document.addEventListener("DOMContentLoaded", boot);

async function boot() {
  wireEvents();

  const cardSlug = new URLSearchParams(window.location.search).get("c");
  if (cardSlug) {
    await resolveAndRedirect(cardSlug);
    return;
  }

  if (!configured) {
    showToast("Add your Supabase URL and anon key in app.js");
    showHero();
    return;
  }

  const { data } = await sb.auth.getSession();
  if (data.session) {
    await showDashboard(data.session.user);
  } else {
    showHero();
  }

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      await showDashboard(session.user);
    }
  });
}

function wireEvents() {
  els.showSignupBtn.addEventListener("click", () => openAuth("signup"));
  els.showLoginBtn.addEventListener("click", () => openAuth("login"));
  els.switchAuthBtn.addEventListener("click", () =>
    openAuth(state.authMode === "signup" ? "login" : "signup")
  );

  els.authForm.addEventListener("submit", handleAuth);
  els.logoutBtn.addEventListener("click", logout);

  els.openClaimBtn.addEventListener("click", toggleClaimBox);
  els.emptyClaimBtn.addEventListener("click", () => {
    els.claimBox.classList.remove("hidden");
    els.emptyCards.classList.add("hidden");
    els.claimCodeInput.focus();
  });
  els.claimForm.addEventListener("submit", claimCard);

  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.addEventListener("click", () => setDestinationType(btn.dataset.type));
  });

  els.cardForm.addEventListener("submit", saveCard);
  els.backToCardsBtn.addEventListener("click", async () => {
    const { data } = await sb.auth.getUser();
    if (data.user) await showDashboard(data.user);
  });

  els.copyNfcBtn.addEventListener("click", async () => {
    const url = els.nfcUrlText.textContent;
    if (!url || url === "â€”") return;
    await navigator.clipboard.writeText(url);
    showToast("NFC URL copied");
  });
}

function showOnly(section) {
  [els.hero, els.authSection, els.dashboard, els.editorSection].forEach((el) =>
    el.classList.add("hidden")
  );
  section.classList.remove("hidden");
}

function showHero() {
  showOnly(els.hero);
  els.logoutBtn.classList.add("hidden");
}

function openAuth(mode) {
  state.authMode = mode;
  showOnly(els.authSection);
  els.authMessage.textContent = "";

  const signup = mode === "signup";
  els.authTitle.textContent = signup ? "Create your account" : "Welcome back";
  els.authSubtitle.textContent = signup
    ? "Claim your card and decide where every tap should go."
    : "Log in to manage your TapRoute cards.";
  els.authSubmitBtn.textContent = signup ? "Create account" : "Log in";
  els.switchAuthBtn.textContent = signup
    ? "Already have an account? Log in"
    : "Need an account? Create one";
}

async function handleAuth(event) {
  event.preventDefault();

  if (!configured) {
    setMessage(els.authMessage, "Configure Supabase in app.js first.", "error");
    return;
  }

  const email = els.emailInput.value.trim();
  const password = els.passwordInput.value;
  els.authSubmitBtn.disabled = true;
  setMessage(els.authMessage, "Workingâ€¦");

  try {
    let result;
    if (state.authMode === "signup") {
      result = await sb.auth.signUp({ email, password });
    } else {
      result = await sb.auth.signInWithPassword({ email, password });
    }

    if (result.error) throw result.error;

    if (state.authMode === "signup" && !result.data.session) {
      setMessage(
        els.authMessage,
        "Account created. Check your email to confirm it, then log in.",
        "success"
      );
    } else if (result.data.user) {
      await showDashboard(result.data.user);
    }
  } catch (error) {
    setMessage(els.authMessage, friendlyError(error), "error");
  } finally {
    els.authSubmitBtn.disabled = false;
  }
}

async function logout() {
  await sb.auth.signOut();
  state.currentCard = null;
  showHero();
}

async function showDashboard(user) {
  showOnly(els.dashboard);
  els.logoutBtn.classList.remove("hidden");
  els.userEmail.textContent = user.email || "";
  els.claimBox.classList.add("hidden");
  els.claimMessage.textContent = "";
  await loadCards();
}

async function loadCards() {
  const { data, error } = await sb
    .from("cards")
    .select("id, slug, card_name, destination_type, destination_url, tap_count, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    showToast(friendlyError(error));
    return;
  }

  els.cardsGrid.innerHTML = "";

  if (!data?.length) {
    els.emptyCards.classList.remove("hidden");
    return;
  }

  els.emptyCards.classList.add("hidden");

  data.forEach((card) => {
    const tile = document.createElement("article");
    tile.className = "card-tile";
    tile.innerHTML = `
      <div class="card-icon">T</div>
      <h3>${escapeHtml(card.card_name || "TapRoute Card")}</h3>
      <p>${escapeHtml(card.destination_url || "No destination set")}</p>
      <footer>
        <span>${Number(card.tap_count || 0)} taps</span>
        <span>Edit â†’</span>
      </footer>
    `;
    tile.addEventListener("click", () => openEditor(card));
    els.cardsGrid.appendChild(tile);
  });
}

function toggleClaimBox() {
  els.claimBox.classList.toggle("hidden");
  if (!els.claimBox.classList.contains("hidden")) els.claimCodeInput.focus();
}

async function claimCard(event) {
  event.preventDefault();
  const code = els.claimCodeInput.value.trim().toUpperCase();
  if (!code) return;

  setMessage(els.claimMessage, "Claimingâ€¦");

  const { data, error } = await sb.rpc("claim_card", {
    p_claim_code: code,
  });

  if (error) {
    setMessage(els.claimMessage, friendlyError(error), "error");
    return;
  }

  if (!data?.success) {
    setMessage(els.claimMessage, data?.message || "Could not claim this card.", "error");
    return;
  }

  els.claimCodeInput.value = "";
  setMessage(els.claimMessage, "Card claimed.", "success");
  showToast("Card added to your account");
  await loadCards();
}

function openEditor(card) {
  state.currentCard = card;
  state.destinationType = card.destination_type || "url";
  showOnly(els.editorSection);

  els.editorCardTitle.textContent = card.card_name || "Edit card";
  els.cardNameInput.value = card.card_name || "";
  els.previewName.textContent = (card.card_name || "MY TAP CARD").toUpperCase();
  els.tapCount.textContent = Number(card.tap_count || 0);

  setDestinationType(state.destinationType);

  if (state.destinationType === "whatsapp") {
    els.whatsappInput.value = numberFromWhatsAppUrl(card.destination_url || "");
  } else {
    els.destinationInput.value = card.destination_url || "";
  }

  const nfcUrl = buildCardUrl(card.slug);
  els.nfcUrlText.textContent = nfcUrl;
  els.testNfcBtn.href = nfcUrl;
  els.saveMessage.textContent = "";
}

function setDestinationType(type) {
  state.destinationType = type;

  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  const whatsapp = type === "whatsapp";
  els.urlField.classList.toggle("hidden", whatsapp);
  els.whatsappField.classList.toggle("hidden", !whatsapp);
}

async function saveCard(event) {
  event.preventDefault();
  if (!state.currentCard) return;

  const cardName = els.cardNameInput.value.trim() || "TapRoute Card";
  let destinationUrl = "";

  if (state.destinationType === "whatsapp") {
    try {
      destinationUrl = makeWhatsAppUrl(els.whatsappInput.value);
    } catch (error) {
      setMessage(els.saveMessage, error.message, "error");
      return;
    }
  } else {
    destinationUrl = normaliseUrl(els.destinationInput.value);
    if (!destinationUrl) {
      setMessage(els.saveMessage, "Enter a valid destination URL.", "error");
      return;
    }
  }

  setMessage(els.saveMessage, "Savingâ€¦");

  const { data, error } = await sb.rpc("update_card", {
    p_card_id: state.currentCard.id,
    p_card_name: cardName,
    p_destination_type: state.destinationType,
    p_destination_url: destinationUrl,
  });

  if (error || !data?.success) {
    setMessage(
      els.saveMessage,
      error ? friendlyError(error) : data?.message || "Could not save card.",
      "error"
    );
    return;
  }

  state.currentCard = {
    ...state.currentCard,
    card_name: cardName,
    destination_type: state.destinationType,
    destination_url: destinationUrl,
  };

  els.editorCardTitle.textContent = cardName;
  els.previewName.textContent = cardName.toUpperCase();
  setMessage(els.saveMessage, "Saved. Your next tap uses the new destination.", "success");
  showToast("Destination updated");
}

async function resolveAndRedirect(slug) {
  els.app.classList.add("hidden");
  els.redirectScreen.classList.remove("hidden");

  if (!configured) {
    redirectError("This TapRoute site has not been connected to Supabase yet.");
    return;
  }

  try {
    const { data, error } = await sb.rpc("resolve_card", {
      p_slug: slug.trim(),
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.destination_url) {
      redirectError("This card has not been activated yet.");
      return;
    }

    const safeUrl = normaliseUrl(result.destination_url);
    if (!safeUrl) {
      redirectError("This card's destination is invalid.");
      return;
    }

    els.redirectTitle.textContent = result.card_name
      ? `Opening ${result.card_name}â€¦`
      : "Opening your linkâ€¦";

    els.manualOpen.href = safeUrl;
    els.manualOpen.classList.remove("hidden");

    setTimeout(() => window.location.replace(safeUrl), 280);
  } catch (error) {
    redirectError(friendlyError(error));
  }
}

function redirectError(message) {
  document.querySelector(".spinner")?.classList.add("hidden");
  els.redirectTitle.textContent = "This card isn't ready";
  els.redirectText.textContent = message;
  els.manualOpen.classList.add("hidden");
}

function makeWhatsAppUrl(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) throw new Error("Enter a WhatsApp number.");

  if (digits.startsWith("0") && digits.length === 10) {
    digits = "27" + digits.slice(1);
  } else if (digits.startsWith("27") && digits.length === 11) {
    // already South African international format
  } else if (digits.length < 10) {
    throw new Error("That WhatsApp number looks too short.");
  }

  return `https://wa.me/${digits}`;
}

function numberFromWhatsAppUrl(url) {
  const match = String(url).match(/wa\.me\/(\d+)/i);
  if (!match) return "";
  const digits = match[1];
  if (digits.startsWith("27") && digits.length === 11) {
    return "0" + digits.slice(2);
  }
  return digits;
}

function normaliseUrl(raw) {
  let value = String(raw || "").trim();
  if (!value) return "";

  if (!/^https?:\/\//i.test(value)) value = "https://" + value;

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function buildCardUrl(slug) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("c", slug);
  return url.toString();
}

function setMessage(el, message, type = "") {
  el.textContent = message || "";
  el.className = `message ${type}`.trim();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add("hidden"), 2600);
}

function friendlyError(error) {
  const text = error?.message || String(error || "Something went wrong.");
  if (/invalid login credentials/i.test(text)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(text)) return "Confirm your email before logging in.";
  if (/user already registered/i.test(text)) return "That email already has an account.";
  return text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

