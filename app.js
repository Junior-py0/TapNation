// TapNation public Supabase configuration.
// The publishable key is safe for browser use. Never place a service-role key here.
const SUPABASE_URL = "https://dqyqkeqdvsidmffaanys.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iiFisqh9j9h4TJuvtcWEnw_976b5T6U";

const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const sb = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const PROFILE_COLUMNS = [
  "display_name", "phone", "public_email", "headline", "bio", "company", "location",
  "instagram_url", "facebook_url", "whatsapp_number", "linkedin_url", "tiktok_url",
  "youtube_url", "x_url", "website_url",
];

const PROFILE_INPUTS = {
  display_name: "profileName",
  phone: "profilePhone",
  public_email: "profileEmail",
  headline: "profileHeadline",
  bio: "profileBio",
  company: "profileCompany",
  location: "profileLocation",
  instagram_url: "profileInstagram",
  facebook_url: "profileFacebook",
  whatsapp_number: "profileWhatsapp",
  linkedin_url: "profileLinkedin",
  tiktok_url: "profileTiktok",
  youtube_url: "profileYoutube",
  x_url: "profileX",
  website_url: "profileWebsite",
};

const SOCIAL_META = [
  ["instagram_url", "Instagram", "◎"],
  ["facebook_url", "Facebook", "f"],
  ["linkedin_url", "LinkedIn", "in"],
  ["tiktok_url", "TikTok", "♪"],
  ["youtube_url", "YouTube", "▶"],
  ["x_url", "X / Twitter", "𝕏"],
  ["website_url", "Website", "↗"],
];

const state = {
  user: null,
  profile: emptyProfile(),
  cards: [],
  currentCard: null,
  destinationType: "profile",
  isAdmin: false,
  requestedAdmin: false,
  inventory: [],
  preview: false,
};

const els = {};

document.addEventListener("DOMContentLoaded", boot);

async function boot() {
  cacheElements();
  wireEvents();
  els.footerYear.textContent = new Date().getFullYear();
  state.requestedAdmin = /^\/admin\/?$/i.test(window.location.pathname);

  const params = new URLSearchParams(window.location.search);
  const cardSlug = params.get("c");
  if (cardSlug) {
    await resolveCard(cardSlug);
    return;
  }

  if (["localhost", "127.0.0.1"].includes(window.location.hostname) && params.get("preview") === "dashboard") {
    showPreviewDashboard();
    return;
  }

  if (!sb) {
    showLanding();
    showToast("TapNation has not been connected to Supabase yet.");
    return;
  }

  const { data, error } = await sb.auth.getSession();
  if (error) showToast(friendlyError(error));
  if (data?.session?.user) {
    await showDashboard(data.session.user, false);
    if (state.requestedAdmin) await showAdminPage(false);
  } else if (state.requestedAdmin) {
    openAuth("login");
  } else {
    showLanding();
  }

  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") resetToLanding();
  });
}

function cacheElements() {
  [
    "app", "redirectScreen", "redirectTitle", "redirectText", "manualOpen", "publicProfileScreen",
    "publicInitials", "publicName", "publicHeadline", "publicBio", "publicPrimaryActions",
    "publicSocialLinks", "publicDetails", "publicShareBtn", "landingPage", "authSection", "dashboard",
    "editorSection", "adminPage", "landingNav", "headerCtas", "accountActions", "homeBtn", "accountsNavBtn",
    "showLoginBtn", "showSignupBtn", "heroStartBtn", "heroLoginBtn", "footerLoginBtn", "footerSignupBtn",
    "accountBtn", "adminNavBtn", "logoutBtn", "backHomeBtn", "footerYear", "authTitle", "authSubtitle",
    "authForm", "emailInput", "passwordInput", "authSubmitBtn", "switchAuthBtn", "authMessage", "userEmail",
    "dashboardTapTotal", "dashboardCardTotal", "dashboardProfileStatus", "profileCompletionBadge", "profileForm",
    "profileBioCount", "saveProfileBtn", "profileMessage", "previewProfileInitials", "previewProfileName",
    "previewProfileHeadline", "previewProfileActions", "previewProfileSocials", "openClaimBtn", "emptyClaimBtn",
    "claimBox", "claimForm", "claimCodeInput", "claimMessage", "emptyCards", "cardsGrid", "cardCountLabel",
    "backToCardsBtn", "cardForm", "cardNameInput", "profileRouteNotice", "otherRouteField", "destinationInput",
    "saveMessage", "saveStatusBadge", "editorCardTitle", "previewName", "previewDestination", "nfcUrlText",
    "copyNfcBtn", "testNfcBtn", "tapCount", "adminBackBtn", "refreshAdminBtn", "adminTotalCards",
    "adminLinkedCards", "adminActivatedCards", "adminUnclaimedCards", "inventoryForm", "inventoryQuantity",
    "inventoryPrefix", "generateCardsBtn", "inventoryMessage", "inventoryResults", "inventoryTableBody",
    "downloadInventoryBtn", "adminCardsLabel", "adminCardsBody", "adminMessage", "toast",
  ].forEach((id) => { els[id] = $(id); });

  Object.values(PROFILE_INPUTS).forEach((id) => { els[id] = $(id); });
}

function wireEvents() {
  [els.showSignupBtn, els.heroStartBtn, els.footerSignupBtn].forEach((button) => button.addEventListener("click", () => openAuth("signup")));
  [els.showLoginBtn, els.heroLoginBtn, els.footerLoginBtn, els.accountsNavBtn].forEach((button) => button.addEventListener("click", () => state.user ? showDashboard(state.user) : openAuth("login")));
  els.homeBtn.addEventListener("click", () => state.user ? showDashboard(state.user) : showLanding(true));
  els.backHomeBtn.addEventListener("click", () => showLanding(true));
  els.accountBtn.addEventListener("click", () => state.user && showDashboard(state.user));
  els.adminNavBtn.addEventListener("click", () => showAdminPage());
  els.logoutBtn.addEventListener("click", logout);
  els.authForm.addEventListener("submit", handleAuth);
  els.switchAuthBtn.addEventListener("click", () => openAuth(els.authForm.dataset.mode === "signup" ? "login" : "signup"));

  els.profileForm.addEventListener("input", renderProfilePreviewFromForm);
  els.profileForm.addEventListener("submit", saveProfile);
  els.openClaimBtn.addEventListener("click", toggleClaimBox);
  els.emptyClaimBtn.addEventListener("click", openClaimBox);
  els.claimForm.addEventListener("submit", claimCard);

  $$(".type-btn").forEach((button) => button.addEventListener("click", () => setDestinationType(button.dataset.type)));
  els.cardForm.addEventListener("input", markEditorDirty);
  els.cardForm.addEventListener("submit", saveCard);
  els.backToCardsBtn.addEventListener("click", () => state.user && showDashboard(state.user));
  els.copyNfcBtn.addEventListener("click", copyNfcUrl);

  els.adminBackBtn.addEventListener("click", () => state.user && showDashboard(state.user));
  els.refreshAdminBtn.addEventListener("click", loadAdminOverview);
  els.inventoryForm.addEventListener("submit", generateInventory);
  els.downloadInventoryBtn.addEventListener("click", downloadInventoryCsv);
  els.publicShareBtn.addEventListener("click", sharePublicProfile);
  window.addEventListener("popstate", handleRouteChange);
}

function showSection(section) {
  [els.landingPage, els.authSection, els.dashboard, els.editorSection, els.adminPage].forEach((item) => item.classList.add("hidden"));
  section.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function updateHeader(authenticated) {
  els.landingNav.classList.toggle("hidden", authenticated);
  els.headerCtas.classList.toggle("hidden", authenticated);
  els.accountActions.classList.toggle("hidden", !authenticated);
  els.adminNavBtn.classList.toggle("hidden", !authenticated || !state.isAdmin);
}

function showLanding(updatePath = false) {
  els.app.classList.remove("hidden");
  els.publicProfileScreen.classList.add("hidden");
  els.redirectScreen.classList.add("hidden");
  showSection(els.landingPage);
  updateHeader(Boolean(state.user));
  if (updatePath) setAppPath("/");
}

function openAuth(mode) {
  els.authForm.dataset.mode = mode;
  showSection(els.authSection);
  updateHeader(false);
  els.landingNav.classList.add("hidden");
  els.headerCtas.classList.add("hidden");
  setMessage(els.authMessage, "");
  const signup = mode === "signup";
  els.authTitle.textContent = signup ? "Create your account" : "Welcome back";
  els.authSubtitle.textContent = signup ? "Your default contact template is waiting." : "Log in to update your profile and card routes.";
  els.authSubmitBtn.innerHTML = signup ? "Create account <span>↗</span>" : "Log in <span>↗</span>";
  els.switchAuthBtn.innerHTML = signup ? "Already have an account? <b>Log in</b>" : "New to TapNation? <b>Create an account</b>";
  els.passwordInput.autocomplete = signup ? "new-password" : "current-password";
  window.setTimeout(() => els.emailInput.focus(), 50);
}

async function handleAuth(event) {
  event.preventDefault();
  if (!sb) return setMessage(els.authMessage, "TapNation is not connected to Supabase.", "error");
  const email = els.emailInput.value.trim();
  const password = els.passwordInput.value;
  const signup = els.authForm.dataset.mode === "signup";
  els.authSubmitBtn.disabled = true;
  setMessage(els.authMessage, signup ? "Creating your account…" : "Logging you in…");
  try {
    const result = signup
      ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: getBaseUrl() } })
      : await sb.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (signup && !result.data.session) {
      setMessage(els.authMessage, "Account created. Confirm the email we sent, then log in.", "success");
    } else if (result.data.user) {
      await showDashboard(result.data.user, !state.requestedAdmin);
      if (state.requestedAdmin) await showAdminPage(false);
    }
  } catch (error) {
    setMessage(els.authMessage, friendlyError(error), "error");
  } finally {
    els.authSubmitBtn.disabled = false;
  }
}

async function logout() {
  if (sb && !state.preview) await sb.auth.signOut();
  resetToLanding();
}

function resetToLanding() {
  state.user = null;
  state.cards = [];
  state.currentCard = null;
  state.profile = emptyProfile();
  state.isAdmin = false;
  state.preview = false;
  state.requestedAdmin = false;
  showLanding(true);
}

async function showDashboard(user, updatePath = true) {
  state.user = user;
  showSection(els.dashboard);
  updateHeader(true);
  els.userEmail.textContent = user.email || "";
  els.claimBox.classList.add("hidden");
  setMessage(els.claimMessage, "");
  if (!state.preview) await Promise.all([loadProfile(), loadCards(), loadAccess()]);
  populateProfileForm(state.profile);
  renderCards();
  updateHeader(true);
  if (updatePath) setAppPath("/account");
}

async function loadAccess() {
  state.isAdmin = false;
  if (!sb) return;
  const { data, error } = await sb.rpc("is_app_admin");
  if (!error) state.isAdmin = Boolean(data);
}

async function loadProfile() {
  const columns = ["plan", ...PROFILE_COLUMNS].join(", ");
  const { data, error } = await sb.from("profiles").select(columns).eq("id", state.user.id).maybeSingle();
  if (error) {
    state.profile = emptyProfile();
    if (/column|schema cache/i.test(error.message || "")) setMessage(els.profileMessage, "The contact-profile database upgrade still needs to be applied.", "error");
    else setMessage(els.profileMessage, friendlyError(error), "error");
    return;
  }
  state.profile = { ...emptyProfile(), ...(data || {}) };
}

async function loadCards() {
  let result = await sb.from("cards").select("id, slug, card_name, destination_type, destination_url, tap_count, card_theme, created_at").order("created_at", { ascending: true });
  if (result.error && /card_theme|column/i.test(result.error.message || "")) {
    result = await sb.from("cards").select("id, slug, card_name, destination_type, destination_url, tap_count, created_at").order("created_at", { ascending: true });
  }
  if (result.error) {
    state.cards = [];
    showToast(friendlyError(result.error));
    return;
  }
  state.cards = result.data || [];
}

function populateProfileForm(profile) {
  PROFILE_COLUMNS.forEach((field) => {
    const inputId = PROFILE_INPUTS[field];
    if (inputId && els[inputId]) els[inputId].value = profile[field] || "";
  });
  setMessage(els.profileMessage, "");
  renderProfilePreviewFromForm();
}

function getProfileFormData({ normalize = false } = {}) {
  const data = {};
  PROFILE_COLUMNS.forEach((field) => {
    const inputId = PROFILE_INPUTS[field];
    data[field] = inputId ? els[inputId].value.trim() : "";
  });
  if (!normalize) return data;
  data.instagram_url = normalizeSocialUrl(data.instagram_url, "instagram");
  data.facebook_url = normalizeSocialUrl(data.facebook_url, "facebook");
  data.linkedin_url = normalizeSocialUrl(data.linkedin_url, "linkedin");
  data.tiktok_url = normalizeSocialUrl(data.tiktok_url, "tiktok");
  data.youtube_url = normalizeSocialUrl(data.youtube_url, "youtube");
  data.x_url = normalizeSocialUrl(data.x_url, "x");
  data.website_url = normalizeWebUrl(data.website_url);
  data.phone = normalizePhoneDisplay(data.phone);
  data.whatsapp_number = normalizePhoneDisplay(data.whatsapp_number);
  return data;
}

function renderProfilePreviewFromForm() {
  const profile = getProfileFormData();
  const name = profile.display_name || "Your name";
  els.previewProfileInitials.textContent = initials(profile.display_name);
  els.previewProfileName.textContent = name;
  els.previewProfileHeadline.textContent = profile.headline || [profile.company, profile.location].filter(Boolean).join(" · ") || "Your role or headline";
  els.profileBioCount.textContent = String(profile.bio.length);

  const actions = [];
  if (profile.phone) actions.push("Call");
  if (profile.whatsapp_number) actions.push("WhatsApp");
  if (profile.public_email) actions.push("Email");
  if (profile.display_name || profile.phone || profile.public_email) actions.push("Save contact");
  els.previewProfileActions.innerHTML = actions.length ? actions.map((label) => `<b>${escapeHtml(label)}</b>`).join("") : "<span>Add a phone number to activate contact actions</span>";

  const socials = SOCIAL_META.filter(([field]) => profile[field]).map(([, label]) => label);
  els.previewProfileSocials.innerHTML = socials.map((label) => `<span>${escapeHtml(label)}</span>`).join("");
  const filled = PROFILE_COLUMNS.filter((field) => profile[field]).length;
  const completion = Math.round((filled / PROFILE_COLUMNS.length) * 100);
  els.profileCompletionBadge.textContent = `${completion}% complete`;
  els.dashboardProfileStatus.textContent = profile.display_name && (profile.phone || profile.public_email || profile.whatsapp_number) ? "Ready" : profile.display_name ? "In progress" : "Not started";
}

async function saveProfile(event) {
  event.preventDefault();
  if (state.preview) {
    state.profile = getProfileFormData();
    return setMessage(els.profileMessage, "Preview saved.", "success");
  }
  const profile = getProfileFormData({ normalize: true });
  if (!profile.display_name) return setMessage(els.profileMessage, "Add your name before saving the profile.", "error");
  els.saveProfileBtn.disabled = true;
  setMessage(els.profileMessage, "Saving your live profile…");
  try {
    const params = {};
    PROFILE_COLUMNS.forEach((field) => { params[`p_${field}`] = profile[field] || null; });
    const { data, error } = await sb.rpc("update_contact_profile", params);
    if (error) throw error;
    if (data?.success === false) throw new Error(data.message || "Profile could not be saved.");
    state.profile = { ...emptyProfile(), ...profile };
    populateProfileForm(state.profile);
    setMessage(els.profileMessage, "Saved. Every contact-profile tap now shows these latest details.", "success");
  } catch (error) {
    setMessage(els.profileMessage, friendlyError(error), "error");
  } finally {
    els.saveProfileBtn.disabled = false;
  }
}

function renderCards() {
  const totalTaps = state.cards.reduce((sum, card) => sum + Number(card.tap_count || 0), 0);
  els.dashboardTapTotal.textContent = formatNumber(totalTaps);
  els.dashboardCardTotal.textContent = formatNumber(state.cards.length);
  els.cardCountLabel.textContent = `${state.cards.length} ${state.cards.length === 1 ? "card" : "cards"}`;
  els.cardsGrid.innerHTML = "";
  els.emptyCards.classList.toggle("hidden", state.cards.length > 0);

  state.cards.forEach((card) => {
    const isProfile = card.destination_type === "profile";
    const routeLabel = isProfile ? "Contact profile" : "Other link";
    const routeText = isProfile ? (state.profile.display_name || "Your TapNation profile") : (card.destination_url || "No link set");
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "card-tile";
    tile.innerHTML = `<div class="card-tile-head"><span class="card-tile-icon">TN</span><span class="destination-label">${isProfile ? "◉" : "↗"} ${routeLabel}</span></div><div class="card-tile-body"><h3>${escapeHtml(card.card_name || "TapNation Card")}</h3><p>${escapeHtml(routeText)}</p></div><div class="card-tile-footer"><span>${formatNumber(card.tap_count || 0)} taps</span><b>Edit route ↗</b></div>`;
    tile.addEventListener("click", () => openCardEditor(card));
    els.cardsGrid.appendChild(tile);
  });
}

function toggleClaimBox() {
  const willOpen = els.claimBox.classList.contains("hidden");
  els.claimBox.classList.toggle("hidden", !willOpen);
  if (willOpen) window.setTimeout(() => els.claimCodeInput.focus(), 50);
}

function openClaimBox() {
  els.claimBox.classList.remove("hidden");
  els.claimBox.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => els.claimCodeInput.focus(), 350);
}

async function claimCard(event) {
  event.preventDefault();
  if (state.preview) return setMessage(els.claimMessage, "Card claiming is disabled in preview mode.");
  const code = els.claimCodeInput.value.trim().toUpperCase();
  if (!code) return;
  setMessage(els.claimMessage, "Claiming card…");
  const { data, error } = await sb.rpc("claim_card", { p_claim_code: code });
  if (error) return setMessage(els.claimMessage, friendlyError(error), "error");
  if (!data?.success) return setMessage(els.claimMessage, data?.message || "Card could not be claimed.", "error");
  els.claimCodeInput.value = "";
  await loadCards();
  renderCards();
  setMessage(els.claimMessage, "Card claimed. It is ready for your contact profile.", "success");
}

function openCardEditor(card) {
  state.currentCard = card;
  state.destinationType = card.destination_type === "profile" ? "profile" : "url";
  showSection(els.editorSection);
  updateHeader(true);
  els.cardNameInput.value = card.card_name || "TapNation Card";
  els.destinationInput.value = state.destinationType === "url" ? (card.destination_url || "") : "";
  els.editorCardTitle.textContent = card.card_name || "Edit card";
  els.previewName.textContent = (card.card_name || "My Tap Card").toUpperCase();
  els.nfcUrlText.textContent = cardUrl(card.slug);
  els.testNfcBtn.href = cardUrl(card.slug);
  els.tapCount.textContent = formatNumber(card.tap_count || 0);
  setDestinationType(state.destinationType, true);
  setMessage(els.saveMessage, "");
  els.saveStatusBadge.textContent = "All changes saved";
  els.saveStatusBadge.classList.remove("dirty");
  setAppPath(`/card/${encodeURIComponent(card.slug)}`);
}

function setDestinationType(type, preserve = false) {
  state.destinationType = type === "url" ? "url" : "profile";
  $$(".type-btn").forEach((button) => button.classList.toggle("active", button.dataset.type === state.destinationType));
  const isProfile = state.destinationType === "profile";
  els.profileRouteNotice.classList.toggle("hidden", !isProfile);
  els.otherRouteField.classList.toggle("hidden", isProfile);
  els.previewDestination.textContent = isProfile ? "CONTACT PROFILE ↗" : "OTHER LINK ↗";
  if (!preserve && isProfile) els.destinationInput.value = "";
  markEditorDirty();
}

function markEditorDirty() {
  if (!state.currentCard) return;
  els.previewName.textContent = (els.cardNameInput.value.trim() || "My Tap Card").toUpperCase();
  els.saveStatusBadge.textContent = "Unsaved changes";
  els.saveStatusBadge.classList.add("dirty");
}

async function saveCard(event) {
  event.preventDefault();
  if (!state.currentCard) return;
  const cardName = els.cardNameInput.value.trim() || "TapNation Card";
  let destinationUrl = null;
  if (state.destinationType === "url") {
    try {
      destinationUrl = normalizeWebUrl(els.destinationInput.value, true);
    } catch (error) {
      return setMessage(els.saveMessage, error.message, "error");
    }
  }
  if (state.preview) {
    Object.assign(state.currentCard, { card_name: cardName, destination_type: state.destinationType, destination_url: destinationUrl });
    els.saveStatusBadge.textContent = "All changes saved";
    els.saveStatusBadge.classList.remove("dirty");
    return setMessage(els.saveMessage, "Preview saved.", "success");
  }

  setMessage(els.saveMessage, "Saving route…");
  const params = {
    p_card_id: state.currentCard.id,
    p_card_name: cardName,
    p_destination_type: state.destinationType,
    p_destination_url: destinationUrl,
    p_card_theme: state.currentCard.card_theme || "midnight",
  };
  let result = await sb.rpc("update_card_v2", params);
  if (result.error && /function.*does not exist|schema cache/i.test(result.error.message || "")) {
    delete params.p_card_theme;
    result = await sb.rpc("update_card", params);
  }
  if (result.error) return setMessage(els.saveMessage, friendlyError(result.error), "error");
  if (!result.data?.success) return setMessage(els.saveMessage, result.data?.message || "Card could not be updated.", "error");
  Object.assign(state.currentCard, { card_name: cardName, destination_type: state.destinationType, destination_url: destinationUrl });
  els.editorCardTitle.textContent = cardName;
  els.saveStatusBadge.textContent = "All changes saved";
  els.saveStatusBadge.classList.remove("dirty");
  setMessage(els.saveMessage, state.destinationType === "profile" ? "Saved. Future taps open your latest contact profile." : "Saved. Future taps open this other link.", "success");
}

async function copyNfcUrl() {
  const url = els.nfcUrlText.textContent;
  if (!url || url === "—") return;
  await copyText(url);
  showToast("Permanent NFC and QR link copied.");
}

async function resolveCard(slug) {
  els.app.classList.add("hidden");
  els.publicProfileScreen.classList.add("hidden");
  els.redirectScreen.classList.remove("hidden");
  if (!sb) return redirectError("TapNation has not been connected yet.");
  try {
    const { data, error } = await sb.rpc("resolve_card", { p_slug: slug });
    if (error) throw error;
    const resolved = Array.isArray(data) ? data[0] : data;
    if (!resolved) return redirectError("This card has not been activated yet.");

    // Compatibility with the previous resolver while the database migration rolls out.
    if (!resolved.route && resolved.destination_url) {
      const legacyDestination = safeDestination(resolved.destination_url);
      if (!legacyDestination) return redirectError("This card’s destination is invalid.");
      return redirectToOther(legacyDestination, resolved.card_name);
    }

    if (resolved.route === "profile" && resolved.profile) {
      renderPublicProfile(resolved.profile);
      return;
    }
    if (resolved.route === "other" && resolved.destination_url) {
      const destination = safeDestination(resolved.destination_url);
      if (!destination) return redirectError("This card’s destination is invalid.");
      return redirectToOther(destination, resolved.card_name);
    }
    redirectError("This card is not ready yet.");
  } catch (error) {
    redirectError(friendlyError(error));
  }
}

function redirectToOther(destination, cardName) {
  els.redirectTitle.textContent = cardName ? `Opening ${cardName}…` : "Opening your destination…";
  els.redirectText.textContent = "You can also use the button below if the page does not open.";
  els.manualOpen.href = destination;
  els.manualOpen.classList.remove("hidden");
  window.setTimeout(() => window.location.replace(destination), 320);
}

function redirectError(message) {
  els.redirectScreen.querySelector(".spinner")?.classList.add("error-spinner");
  els.redirectTitle.textContent = "This card isn’t ready";
  els.redirectText.textContent = message;
  els.manualOpen.classList.add("hidden");
}

function renderPublicProfile(profile) {
  const data = { ...emptyProfile(), ...profile };
  document.title = `${data.display_name || "TapNation profile"} — TapNation`;
  els.redirectScreen.classList.add("hidden");
  els.publicProfileScreen.classList.remove("hidden");
  els.publicInitials.textContent = initials(data.display_name);
  els.publicName.textContent = data.display_name || "TapNation profile";
  setOptionalText(els.publicHeadline, data.headline || [data.company, data.location].filter(Boolean).join(" · "));
  setOptionalText(els.publicBio, data.bio);

  const actions = [];
  if (data.phone) actions.push(actionLink(`tel:${phoneHref(data.phone)}`, "☎", "Call"));
  if (data.whatsapp_number) actions.push(actionLink(`https://wa.me/${digitsForWhatsapp(data.whatsapp_number)}`, "◉", "WhatsApp", true));
  if (data.public_email) actions.push(actionLink(`mailto:${data.public_email}`, "@", "Email"));
  if (data.display_name || data.phone || data.public_email) actions.push(vcardLink(data));
  els.publicPrimaryActions.innerHTML = actions.join("");

  els.publicSocialLinks.innerHTML = SOCIAL_META.filter(([field]) => data[field]).map(([field, label, icon]) => actionLink(data[field], icon, label, true, "social-link")).join("");
  const details = [];
  if (data.company) details.push(["Company", data.company]);
  if (data.location) details.push(["Based in", data.location]);
  if (data.phone) details.push(["Phone", `<a href="tel:${escapeAttribute(phoneHref(data.phone))}">${escapeHtml(data.phone)}</a>`]);
  if (data.public_email) details.push(["Email", `<a href="mailto:${escapeAttribute(data.public_email)}">${escapeHtml(data.public_email)}</a>`]);
  els.publicDetails.innerHTML = details.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`).join("");
}

function actionLink(href, icon, label, external = false, extraClass = "") {
  const attrs = external ? ' target="_blank" rel="noopener"' : "";
  return `<a class="public-action ${extraClass}" href="${escapeAttribute(href)}"${attrs}><b>${escapeHtml(icon)}</b><span>${escapeHtml(label)}</span></a>`;
}

function vcardLink(profile) {
  const vcard = buildVCard(profile);
  const href = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
  return `<a class="public-action" href="${href}" download="${escapeAttribute((profile.display_name || "tapnation-contact").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase())}.vcf"><b>+</b><span>Save contact</span></a>`;
}

function buildVCard(profile) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  if (profile.display_name) lines.push(`FN:${vcardEscape(profile.display_name)}`);
  if (profile.company) lines.push(`ORG:${vcardEscape(profile.company)}`);
  if (profile.headline) lines.push(`TITLE:${vcardEscape(profile.headline)}`);
  if (profile.phone) lines.push(`TEL;TYPE=CELL:${vcardEscape(profile.phone)}`);
  if (profile.public_email) lines.push(`EMAIL:${vcardEscape(profile.public_email)}`);
  if (profile.website_url) lines.push(`URL:${vcardEscape(profile.website_url)}`);
  if (profile.location) lines.push(`ADR:;;;;${vcardEscape(profile.location)};;;`);
  if (profile.bio) lines.push(`NOTE:${vcardEscape(profile.bio)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

async function sharePublicProfile() {
  try {
    if (navigator.share) await navigator.share({ title: document.title, url: window.location.href });
    else {
      await copyText(window.location.href);
      showToast("Profile link copied.");
    }
  } catch (error) {
    if (error?.name !== "AbortError") showToast("Could not share this profile.");
  }
}

async function showAdminPage(updatePath = true) {
  if (!state.user) return openAuth("login");
  if (!state.isAdmin && !state.preview) await loadAccess();
  if (!state.isAdmin && !state.preview) {
    showToast("This account does not have admin access.");
    return showDashboard(state.user);
  }
  showSection(els.adminPage);
  updateHeader(true);
  if (updatePath) setAppPath("/admin");
  await loadAdminOverview();
}

async function loadAdminOverview() {
  setMessage(els.adminMessage, "Loading…");
  if (state.preview) {
    renderAdminOverview({ totals: { total_cards: 24, linked_cards: 16, activated_cards: 18, unclaimed_cards: 6 }, cards: state.cards });
    return setMessage(els.adminMessage, "");
  }
  const { data, error } = await sb.rpc("admin_dashboard_overview");
  if (error) return setMessage(els.adminMessage, friendlyError(error), "error");
  renderAdminOverview(data || {});
  setMessage(els.adminMessage, "");
}

function renderAdminOverview(data) {
  const totals = data.totals || {};
  const cards = Array.isArray(data.cards) ? data.cards : [];
  els.adminTotalCards.textContent = formatNumber(totals.total_cards || 0);
  els.adminLinkedCards.textContent = formatNumber(totals.linked_cards || 0);
  els.adminActivatedCards.textContent = formatNumber(totals.activated_cards || 0);
  els.adminUnclaimedCards.textContent = formatNumber(totals.unclaimed_cards || 0);
  els.adminCardsLabel.textContent = `${formatNumber(totals.total_cards || 0)} total`;
  els.adminCardsBody.innerHTML = cards.length ? cards.map((card) => {
    const activated = Boolean(card.owner_id);
    const routed = card.destination_type === "profile" ? activated : Boolean(card.destination_url);
    const route = card.destination_type === "profile" ? "Contact profile" : routed ? "Other link" : "No route";
    return `<tr><td>${escapeHtml(card.card_name || "TapNation Card")}</td><td><code>${escapeHtml(card.slug || "")}</code></td><td><span class="admin-status ${routed ? "good" : "waiting"}">${escapeHtml(route)}</span></td><td><span class="admin-status ${activated ? "good" : "waiting"}">${activated ? "Claimed" : "Ready"}</span></td><td>${formatNumber(card.tap_count || 0)}</td></tr>`;
  }).join("") : '<tr><td colspan="5">No cards have been created yet.</td></tr>';
}

async function generateInventory(event) {
  event.preventDefault();
  const quantity = Math.max(1, Math.min(100, Number(els.inventoryQuantity.value || 1)));
  const prefix = els.inventoryPrefix.value.trim() || "TapNation Card";
  if (state.preview) return setMessage(els.inventoryMessage, "Inventory generation is disabled in preview mode.");
  els.generateCardsBtn.disabled = true;
  setMessage(els.inventoryMessage, `Generating ${quantity} secure cards…`);
  const { data, error } = await sb.rpc("admin_create_cards", { p_quantity: quantity, p_name_prefix: prefix, p_base_url: getBaseUrl() });
  els.generateCardsBtn.disabled = false;
  if (error) return setMessage(els.inventoryMessage, friendlyError(error), "error");
  state.inventory = data || [];
  els.inventoryResults.classList.toggle("hidden", !state.inventory.length);
  els.inventoryTableBody.innerHTML = state.inventory.map((item) => `<tr><td>${escapeHtml(item.card_name)}</td><td><code>${escapeHtml(item.slug)}</code></td><td><code>${escapeHtml(item.claim_code)}</code></td><td><code>${escapeHtml(item.nfc_url)}</code></td></tr>`).join("");
  setMessage(els.inventoryMessage, `${state.inventory.length} cards created. Download the CSV before starting another batch.`, "success");
  await loadAdminOverview();
}

function downloadInventoryCsv() {
  if (!state.inventory.length) return;
  const rows = [["Card name", "Slug", "Access code", "Permanent NFC/QR URL"], ...state.inventory.map((item) => [item.card_name, item.slug, item.claim_code, item.nfc_url])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tapnation-card-batch-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function showPreviewDashboard() {
  state.preview = true;
  state.user = { id: "preview-user", email: "alex@tapnation.co.za" };
  state.isAdmin = true;
  state.profile = {
    ...emptyProfile(), display_name: "Alex Morgan", phone: "+27 72 123 4567", public_email: "hello@alexmorgan.co.za",
    headline: "Creative director", bio: "I help ambitious brands turn clear ideas into memorable experiences.", company: "Morgan Studio",
    location: "Johannesburg, South Africa", instagram_url: "https://instagram.com/alexmorgan", whatsapp_number: "+27 72 123 4567",
    linkedin_url: "https://linkedin.com/in/alexmorgan", website_url: "https://example.com",
  };
  state.cards = [
    { id: "preview-1", slug: "A1B2C3D4E5", card_name: "Main contact card", destination_type: "profile", destination_url: null, tap_count: 1284, card_theme: "midnight" },
    { id: "preview-2", slug: "F6G7H8J9K0", card_name: "Portfolio link", destination_type: "url", destination_url: "https://example.com/portfolio", tap_count: 482, card_theme: "midnight" },
  ];
  showDashboard(state.user);
}

function handleRouteChange() {
  if (window.location.pathname === "/admin" && state.user) showAdminPage(false);
  else if (state.user) showDashboard(state.user, false);
  else showLanding(false);
}

function emptyProfile() {
  return Object.fromEntries(PROFILE_COLUMNS.map((field) => [field, ""]));
}

function normalizeSocialUrl(value, network) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return assertHttpUrl(raw);
  const handle = raw.replace(/^@/, "").replace(/^www\./i, "");
  if (handle.includes(".")) return assertHttpUrl(`https://${handle}`);
  const bases = { instagram: "instagram.com/", facebook: "facebook.com/", linkedin: "linkedin.com/in/", tiktok: "tiktok.com/@", youtube: "youtube.com/@", x: "x.com/" };
  return assertHttpUrl(`https://${bases[network]}${handle}`);
}

function normalizeWebUrl(value, required = false) {
  const raw = String(value || "").trim();
  if (!raw) {
    if (required) throw new Error("Paste the full link you want this card to open.");
    return "";
  }
  return assertHttpUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
}

function assertHttpUrl(value) {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Use a secure website link beginning with https://.");
  return parsed.toString();
}

function normalizePhoneDisplay(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/[0-9]/.test(raw)) throw new Error("Enter a valid phone number.");
  return raw.replace(/[^0-9+()\-\s]/g, "").slice(0, 32).trim();
}

function digitsForWhatsapp(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) digits = `27${digits.slice(1)}`;
  return digits;
}

function phoneHref(value) {
  const raw = String(value || "").trim();
  const plus = raw.startsWith("+") ? "+" : "";
  return plus + raw.replace(/\D/g, "");
}

function safeDestination(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "TN";
  return `${parts[0][0] || ""}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toUpperCase();
}

function setOptionalText(element, value) {
  const text = String(value || "").trim();
  element.textContent = text;
  element.classList.toggle("hidden", !text);
}

function cardUrl(slug) {
  return `${getBaseUrl()}/?c=${encodeURIComponent(slug)}`;
}

function getBaseUrl() {
  return `${window.location.origin}${window.location.pathname.replace(/\/?(?:admin|account|card\/[^/]+)?\/?$/, "")}`.replace(/\/$/, "");
}

function setAppPath(path) {
  if (window.location.pathname !== path || window.location.search) window.history.pushState({}, "", path);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const input = document.createElement("textarea");
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message${type ? ` ${type}` : ""}`;
}

let toastTimer;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.add("hidden"), 3200);
}

function friendlyError(error) {
  const text = String(error?.message || error || "Something went wrong.");
  if (/update_contact_profile|function.*does not exist|schema cache|destination_type_check/i.test(text)) return "The TapNation contact-profile database upgrade still needs to be applied.";
  if (/invalid login credentials/i.test(text)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(text)) return "Confirm your email before logging in.";
  if (/user already registered/i.test(text)) return "That email already has an account.";
  if (/failed to fetch|network/i.test(text)) return "Could not reach TapNation. Check your connection and try again.";
  return text.replace(/^Error:\s*/i, "");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-ZA").format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function vcardEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
