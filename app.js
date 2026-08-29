// Cardence public Supabase configuration.
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
  batches: [],
  selectedBatch: null,
  selectedBatchCards: [],
  selectedArtworkCard: null,
  selectedLogoFile: null,
  selectedLogoDataUrl: "",
  logoDataCache: {},
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
    showToast("Cardence has not been connected to Supabase yet.");
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
    "inventoryBatchName", "inventoryPrefix", "inventoryDesignMode", "inventorySkin", "inventoryBrandName",
    "inventoryTagline", "inventoryLogo", "logoUploadHint", "generateCardsBtn", "inventoryMessage", "inventoryResults",
    "inventoryResultTitle", "inventoryResultMeta", "inventoryTableBody", "downloadInventoryBtn", "printInventoryBtn",
    "adminCardsLabel", "adminCardsBody", "adminMessage", "adminBatchList", "adminBatchDetail", "selectedBatchName",
    "selectedBatchMeta", "downloadSelectedCsvBtn", "printSelectedPackBtn", "instructionCopies", "adminBatchCardsBody",
    "designPreviewTitle", "designPreviewMeta", "downloadCardArtworkBtn", "downloadBatchArtworkBtn", "cardDesignCanvas", "toast",
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
  els.printInventoryBtn.addEventListener("click", () => printActivationPack(state.inventory, state.selectedBatch));
  els.downloadSelectedCsvBtn.addEventListener("click", () => downloadBatchCsv(state.selectedBatchCards, state.selectedBatch));
  els.printSelectedPackBtn.addEventListener("click", () => printActivationPack(state.selectedBatchCards, state.selectedBatch));
  els.downloadCardArtworkBtn.addEventListener("click", () => downloadCardArtwork(state.selectedArtworkCard, state.selectedBatch));
  els.downloadBatchArtworkBtn.addEventListener("click", () => downloadBatchArtwork(state.selectedBatchCards, state.selectedBatch));
  els.inventoryLogo.addEventListener("change", handleLogoSelection);
  els.inventoryDesignMode.addEventListener("change", updateDesignFormState);
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
  els.switchAuthBtn.innerHTML = signup ? "Already have an account? <b>Log in</b>" : "New to Cardence? <b>Create an account</b>";
  els.passwordInput.autocomplete = signup ? "new-password" : "current-password";
  window.setTimeout(() => els.emailInput.focus(), 50);
}

async function handleAuth(event) {
  event.preventDefault();
  if (!sb) return setMessage(els.authMessage, "Cardence is not connected to Supabase.", "error");
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
  state.inventory = [];
  state.batches = [];
  state.selectedBatch = null;
  state.selectedBatchCards = [];
  state.selectedArtworkCard = null;
  state.selectedLogoFile = null;
  state.selectedLogoDataUrl = "";
  state.logoDataCache = {};
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
    const routeText = isProfile ? (state.profile.display_name || "Your Cardence profile") : (card.destination_url || "No link set");
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "card-tile";
    tile.innerHTML = `<div class="card-tile-head"><span class="card-tile-icon">C</span><span class="destination-label">${isProfile ? "◉" : "↗"} ${routeLabel}</span></div><div class="card-tile-body"><h3>${escapeHtml(card.card_name || "Cardence Card")}</h3><p>${escapeHtml(routeText)}</p></div><div class="card-tile-footer"><span>${formatNumber(card.tap_count || 0)} taps</span><b>Edit route ↗</b></div>`;
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
  els.cardNameInput.value = card.card_name || "Cardence Card";
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
  const cardName = els.cardNameInput.value.trim() || "Cardence Card";
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
  if (!url || url === "Not available") return;
  await copyText(url);
  showToast("Permanent NFC and QR link copied.");
}

async function resolveCard(slug) {
  els.app.classList.add("hidden");
  els.publicProfileScreen.classList.add("hidden");
  els.redirectScreen.classList.remove("hidden");
  if (!sb) return redirectError("Cardence has not been connected yet.");
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
  document.title = `${data.display_name || "Cardence profile"} | Cardence`;
  els.redirectScreen.classList.add("hidden");
  els.publicProfileScreen.classList.remove("hidden");
  els.publicInitials.textContent = initials(data.display_name);
  els.publicName.textContent = data.display_name || "Cardence profile";
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
  return `<a class="public-action" href="${href}" download="${escapeAttribute((profile.display_name || "cardence-contact").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase())}.vcf"><b>+</b><span>Save contact</span></a>`;
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
    state.batches = [{ id: "preview-batch", batch_name: "Launch sample", quantity: 2, design_mode: "generic", skin: "aubergine", brand_name: "Cardence", tagline: "Tap to connect", created_at: new Date().toISOString(), activated_count: 1, encoded_count: 1, printed_count: 1, tap_count: 1766 }];
    renderAdminOverview({ totals: { total_cards: 24, linked_cards: 16, activated_cards: 18, unclaimed_cards: 6 }, cards: state.cards });
    renderBatchList();
    await selectBatch(state.batches[0]);
    return setMessage(els.adminMessage, "");
  }
  const [overviewResult, batchesResult] = await Promise.all([
    sb.rpc("admin_dashboard_overview"),
    sb.rpc("admin_get_batches"),
  ]);
  if (overviewResult.error) return setMessage(els.adminMessage, friendlyError(overviewResult.error), "error");
  renderAdminOverview(overviewResult.data || {});
  if (batchesResult.error) {
    state.batches = [];
    renderBatchList();
    if (/function.*does not exist|schema cache/i.test(batchesResult.error.message || "")) {
      setMessage(els.adminMessage, "The new batch library needs the latest database migration before it can sync across devices.", "error");
    } else setMessage(els.adminMessage, friendlyError(batchesResult.error), "error");
    return;
  }
  try { state.batches = typeof batchesResult.data === "string" ? JSON.parse(batchesResult.data) : (batchesResult.data || []); }
  catch { state.batches = []; }
  renderBatchList();
  if (state.selectedBatch) {
    const refreshed = state.batches.find((batch) => batch.id === state.selectedBatch.id);
    if (refreshed) await selectBatch(refreshed, false);
  }
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
  if (els.adminCardsBody) els.adminCardsBody.innerHTML = cards.length ? cards.map((card) => {
    const activated = Boolean(card.owner_id);
    const routed = card.destination_type === "profile" ? activated : Boolean(card.destination_url);
    const route = card.destination_type === "profile" ? "Contact profile" : routed ? "Other link" : "No route";
    return `<tr><td>${escapeHtml(card.card_name || "Cardence Card")}</td><td><code>${escapeHtml(card.slug || "")}</code></td><td><span class="admin-status ${routed ? "good" : "waiting"}">${escapeHtml(route)}</span></td><td><span class="admin-status ${activated ? "good" : "waiting"}">${activated ? "Claimed" : "Ready"}</span></td><td>${formatNumber(card.tap_count || 0)}</td></tr>`;
  }).join("") : '<tr><td colspan="5">No cards have been created yet.</td></tr>';
}

async function generateInventory(event) {
  event.preventDefault();
  const quantity = Math.max(1, Math.min(500, Number(els.inventoryQuantity.value || 1)));
  const prefix = els.inventoryPrefix.value.trim() || "Cardence Card";
  if (state.preview) return setMessage(els.inventoryMessage, "Inventory generation is disabled in preview mode.");
  const designMode = els.inventoryDesignMode.value === "custom" ? "custom" : "generic";
  const logoFile = els.inventoryLogo.files?.[0] || null;
  if (designMode === "custom" && !logoFile && !state.selectedLogoDataUrl) return setMessage(els.inventoryMessage, "Upload a logo for a custom brand batch.", "error");
  els.generateCardsBtn.disabled = true;
  setMessage(els.inventoryMessage, `Generating ${quantity} secure cards…`);
  try {
    let logoPath = null;
    if (logoFile) {
      const upload = await uploadAdminLogo(logoFile);
      if (upload.error) throw upload.error;
      logoPath = upload.path;
    }
    const requestedSkin = els.inventorySkin.value || "auto";
    const resolvedSkin = requestedSkin === "auto" ? await resolveBatchSkin(state.selectedLogoDataUrl, designMode) : requestedSkin;
    const params = {
      p_quantity: quantity,
      p_batch_name: els.inventoryBatchName.value.trim() || "Cardence batch",
      p_name_prefix: prefix,
      p_design_mode: designMode,
      p_skin: resolvedSkin,
      p_brand_name: els.inventoryBrandName.value.trim() || null,
      p_tagline: els.inventoryTagline.value.trim() || null,
      p_logo_path: logoPath,
      p_base_url: getBaseUrl(),
    };
    let result = await sb.rpc("admin_create_card_batch", params);
    if (result.error && /function.*does not exist|schema cache/i.test(result.error.message || "")) {
      const legacy = await sb.rpc("admin_create_cards", { p_quantity: quantity, p_name_prefix: prefix, p_base_url: getBaseUrl() });
      if (legacy.error) throw legacy.error;
      state.inventory = legacy.data || [];
      state.selectedBatch = { id: `legacy-${Date.now()}`, batch_name: params.p_batch_name, quantity: state.inventory.length, design_mode: designMode, skin: resolvedSkin, brand_name: params.p_brand_name, tagline: params.p_tagline, logo_path: logoPath, base_url: getBaseUrl() };
      state.selectedBatchCards = state.inventory;
    } else {
      if (result.error) throw result.error;
      const payload = typeof result.data === "string" ? JSON.parse(result.data) : (result.data || {});
      state.selectedBatch = payload.batch || null;
      state.inventory = Array.isArray(payload.cards) ? payload.cards : [];
      state.selectedBatchCards = state.inventory;
    }
    els.inventoryResults.classList.toggle("hidden", !state.inventory.length);
    await renderInventoryResults();
    if (state.selectedBatch) await renderSelectedBatch();
    setMessage(els.inventoryMessage, `${state.inventory.length} cards created. Your access codes and activation pack are ready on every signed-in device.`, "success");
    await loadAdminOverview();
  } catch (error) {
    setMessage(els.inventoryMessage, friendlyError(error), "error");
  } finally {
    els.generateCardsBtn.disabled = false;
  }
}

function downloadInventoryCsv() {
  downloadBatchCsv(state.inventory, state.selectedBatch);
}

function renderBatchList() {
  const batches = Array.isArray(state.batches) ? state.batches : [];
  els.adminBatchList.innerHTML = batches.length ? batches.map((batch) => `<button class="admin-batch-row ${state.selectedBatch?.id === batch.id ? "active" : ""}" type="button" data-batch-id="${escapeAttribute(batch.id)}"><span><strong>${escapeHtml(batch.batch_name || "Cardence batch")}</strong><small>${escapeHtml(formatBatchDate(batch.created_at))} · ${formatNumber(batch.quantity || 0)} cards · ${escapeHtml(batch.design_mode === "custom" ? "Custom brand" : "Generic Cardence")}</small></span><span class="admin-batch-stat">${formatNumber(batch.activated_count || 0)} activated</span><span class="admin-batch-stat">${formatNumber(batch.tap_count || 0)} taps</span></button>`).join("") : '<p class="empty-inline">No saved batches yet. Generate your first batch above.</p>';
  els.adminBatchList.querySelectorAll("[data-batch-id]").forEach((button) => button.addEventListener("click", () => {
    const batch = batches.find((item) => item.id === button.dataset.batchId);
    if (batch) selectBatch(batch);
  }));
}

async function selectBatch(batch, updateList = true) {
  state.selectedBatch = batch;
  if (updateList) renderBatchList();
  if (state.preview) {
    state.selectedBatchCards = state.cards.map((card, index) => ({ ...card, batch_position: index + 1, claim_code: index ? "F6G7H8J9" : "A1B2C3D4", nfc_url: cardUrl(card.slug), production_status: index ? "created" : "encoded" }));
  } else {
    const { data, error } = await sb.rpc("admin_get_batch_cards", { p_batch_id: batch.id });
    if (error) return setMessage(els.adminMessage, friendlyError(error), "error");
    try { state.selectedBatchCards = typeof data === "string" ? JSON.parse(data) : (data || []); }
    catch { state.selectedBatchCards = []; }
  }
  await renderSelectedBatch();
}

async function renderSelectedBatch() {
  const batch = state.selectedBatch;
  if (!batch) return;
  els.adminBatchDetail.classList.remove("hidden");
  els.selectedBatchName.textContent = batch.batch_name || "Cardence batch";
  els.selectedBatchMeta.textContent = `${formatNumber(batch.quantity || state.selectedBatchCards.length)} cards · ${batch.design_mode === "custom" ? "Custom brand" : "Generic Cardence"} · ${skinLabel(batch.skin)}`;
  await renderBatchCardRows(state.selectedBatchCards);
  state.selectedArtworkCard = state.selectedBatchCards[0] || null;
  await renderDesignPreview();
}

async function renderInventoryResults() {
  const batch = state.selectedBatch;
  els.inventoryResultTitle.textContent = batch?.batch_name || "New card batch";
  els.inventoryResultMeta.textContent = batch ? `${formatNumber(state.inventory.length)} cards · ${skinLabel(batch.skin)}` : "";
  await renderCardRows(state.inventory, els.inventoryTableBody, "inventory");
}

async function renderCardRows(cards, tbody, mode) {
  const rows = await Promise.all((cards || []).map(async (card, index) => {
    const url = card.nfc_url || cardUrl(card.slug);
    const qr = await getQrDataUrl(url);
    const tools = `<div class="batch-tools"><button class="mini-tool" type="button" data-copy-url="${index}">Copy URL</button><button class="mini-tool" type="button" data-copy-code="${index}">Copy code</button><button class="mini-tool" type="button" data-show-qr="${index}">Open QR</button>${mode === "inventory" ? "" : `<button class="mini-tool" type="button" data-select-art="${index}">Artwork</button>`}</div>`;
    const status = mode === "inventory" ? "<span class=\"admin-status waiting\">Created</span>" : `<select class="status-select" data-status-card="${index}" aria-label="Production status for ${escapeAttribute(card.card_name || "card")}">${productionStatuses.map(([value, label]) => `<option value="${value}" ${card.production_status === value ? "selected" : ""}>${label}</option>`).join("")}</select>`;
    return `<tr><td><strong>${escapeHtml(card.card_name || "Cardence Card")}</strong><small class="table-subline">Card ${String(card.batch_position || index + 1).padStart(2, "0")}</small></td><td><code>${escapeHtml(card.claim_code || "")}</code></td><td><code class="admin-url-cell">${escapeHtml(url)}</code></td><td class="batch-qr-cell"><button class="qr-thumb-button" type="button" data-show-qr="${index}" aria-label="Open QR for ${escapeAttribute(card.card_name || "card")}">${qr ? `<img src="${qr}" alt="QR code" />` : "Unavailable"}</button></td><td>${mode === "inventory" ? tools : status}</td>${mode === "inventory" ? "" : `<td>${tools}</td>`}</tr>`;
  }));
  tbody.innerHTML = rows.length ? rows.join("") : `<tr><td colspan="${mode === "inventory" ? 5 : 6}">No cards found.</td></tr>`;
  tbody.querySelectorAll("[data-copy-url]").forEach((button) => button.addEventListener("click", () => copyBatchValue(cards, button.dataset.copyUrl, "nfc_url")));
  tbody.querySelectorAll("[data-copy-code]").forEach((button) => button.addEventListener("click", () => copyBatchValue(cards, button.dataset.copyCode, "claim_code")));
  tbody.querySelectorAll("[data-show-qr]").forEach((button) => button.addEventListener("click", () => openQrWindow(cards[Number(button.dataset.showQr)])));
  tbody.querySelectorAll("[data-select-art]").forEach((button) => button.addEventListener("click", async () => { state.selectedArtworkCard = cards[Number(button.dataset.selectArt)]; await renderDesignPreview(); }));
  tbody.querySelectorAll("[data-status-card]").forEach((select) => select.addEventListener("change", () => updateProductionStatus(cards[Number(select.dataset.statusCard)], select.value)));
}

async function renderBatchCardRows(cards) {
  await renderCardRows(cards, els.adminBatchCardsBody, "batch");
}

const productionStatuses = [["created", "Created"], ["encoded", "Encoded"], ["printed", "Printed"], ["packed", "Packed"], ["shipped", "Shipped"], ["retired", "Retired"]];

async function updateProductionStatus(card, status) {
  if (!card || state.preview) { if (card) card.production_status = status; return; }
  const { data, error } = await sb.rpc("admin_update_card_production_status", { p_card_id: card.id, p_status: status });
  if (error || data?.success === false) return showToast(friendlyError(error || new Error(data?.message || "Status could not be updated.")));
  card.production_status = status;
  showToast("Production status updated.");
  await loadAdminOverview();
}

async function copyBatchValue(cards, index, field) {
  const card = cards[Number(index)];
  if (!card) return;
  const value = field === "nfc_url" ? (card.nfc_url || cardUrl(card.slug)) : card[field];
  await copyText(value);
  showToast(field === "claim_code" ? "Access code copied." : "Permanent NFC and QR link copied.");
}

function downloadBatchCsv(cards, batch) {
  if (!cards?.length) return;
  const rows = [["Batch", "Card number", "Card name", "Slug", "Access code", "Permanent NFC/QR URL", "Production status"], ...cards.map((card, index) => [batch?.batch_name || "Cardence batch", card.batch_position || index + 1, card.card_name || "Cardence Card", card.slug, card.claim_code, card.nfc_url || cardUrl(card.slug), card.production_status || "created"])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadBlob(csv, `cardence-${safeDownloadName(batch?.batch_name || "batch")}.csv`, "text/csv;charset=utf-8");
}

function downloadBlob(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function handleLogoSelection() {
  const file = els.inventoryLogo.files?.[0] || null;
  state.selectedLogoFile = file;
  state.selectedLogoDataUrl = "";
  if (!file) return updateDesignFormState();
  if (file.size > 3 * 1024 * 1024) {
    els.inventoryLogo.value = "";
    return setMessage(els.inventoryMessage, "That logo is larger than 3 MB.", "error");
  }
  try { state.selectedLogoDataUrl = await readFileAsDataUrl(file); }
  catch { return setMessage(els.inventoryMessage, "That logo could not be read.", "error"); }
  updateDesignFormState();
}

function updateDesignFormState() {
  const custom = els.inventoryDesignMode.value === "custom";
  els.inventoryLogo.required = custom;
  els.logoUploadHint.textContent = custom ? (state.selectedLogoFile ? `${state.selectedLogoFile.name} ready. It will be stored privately with this batch.` : "Upload a logo to generate your branded artwork.") : "Optional for generic cards. The Cardence mark is used by default.";
}

async function uploadAdminLogo(file) {
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const id = globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `admin/${state.user.id}/${id}.${ext}`;
  const result = await sb.storage.from("card-design-logos").upload(path, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
  return { ...result, path };
}

async function resolveBatchSkin(dataUrl, designMode) {
  if (!dataUrl || designMode !== "custom") return "aubergine";
  try {
    const image = await loadImage(dataUrl);
    const sample = document.createElement("canvas");
    sample.width = 1; sample.height = 1;
    const ctx = sample.getContext("2d");
    ctx.drawImage(image, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    if (Math.max(r, g, b) > 205 && Math.min(r, g, b) > 150) return "porcelain";
    if (b > r * 1.15 && b > g * 1.05) return "cobalt";
    if (r > b * 1.18 && r > g * 1.08) return "coral";
    if (r + g + b < 175) return "monochrome";
  } catch { /* Use the launch skin when sampling is unavailable. */ }
  return "aubergine";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
}

function formatBatchDate(value) {
  if (!value) return "Recently created";
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
  catch { return "Recently created"; }
}

function skinLabel(value) {
  return ({ aubergine: "Aubergine", porcelain: "Porcelain", coral: "Coral", cobalt: "Cobalt", monochrome: "Monochrome", auto: "Adaptive" }[value] || "Aubergine");
}

function safeDownloadName(value) {
  return String(value || "batch").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 55) || "batch";
}

function getQrDataUrl(url) {
  if (!url || !globalThis.QRCode?.toDataURL) return Promise.resolve("");
  return new Promise((resolve) => QRCode.toDataURL(url, { errorCorrectionLevel: "H", margin: 3, width: 440, color: { dark: "#211a38", light: "#ffffff" } }, (error, dataUrl) => resolve(error ? "" : dataUrl)));
}

function openQrWindow(card) {
  if (!card) return;
  const url = card.nfc_url || cardUrl(card.slug);
  getQrDataUrl(url).then((qr) => {
    if (!qr) return showToast("QR generation is still loading. Try again in a moment.");
    const popup = window.open("", "_blank");
    if (!popup) return showToast("Allow popups to open the full QR code.");
    popup.document.write(`<!doctype html><title>Cardence QR ${escapeHtml(card.card_name || "card")}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f2ec;font-family:Arial,sans-serif;color:#211a38}.wrap{padding:28px;text-align:center;background:#fffaf5;border-radius:20px;box-shadow:0 20px 60px #211a3826}.wrap img{width:min(72vw,420px);height:auto;display:block;margin:0 auto 18px}.wrap strong{display:block;margin-bottom:7px}.wrap code{font-size:12px;word-break:break-all}</style><main class="wrap"><img src="${qr}" alt="QR code"><strong>${escapeHtml(card.card_name || "Cardence card")}</strong><code>${escapeHtml(url)}</code></main>`);
    popup.document.close();
  });
}

async function renderDesignPreview() {
  const card = state.selectedArtworkCard;
  const batch = state.selectedBatch;
  if (!card || !batch || !els.cardDesignCanvas) return;
  els.designPreviewTitle.textContent = card.card_name || "Cardence card";
  els.designPreviewMeta.textContent = `${skinLabel(batch.skin)} skin · QR and NFC use ${card.nfc_url || cardUrl(card.slug)}`;
  try { await drawCardArtwork(card, batch, els.cardDesignCanvas); }
  catch { showToast("The artwork preview could not be rendered."); }
}

const artworkPalettes = {
  aubergine: { background: "#211a38", secondary: "#302548", accent: "#ff8f70", text: "#fffaf5", quiet: "#d9cfe3" },
  porcelain: { background: "#f7f2ec", secondary: "#eee6df", accent: "#211a38", text: "#211a38", quiet: "#756d7d" },
  coral: { background: "#ff8f70", secondary: "#f7795d", accent: "#fffaf5", text: "#211a38", quiet: "#4e3246" },
  cobalt: { background: "#6179ff", secondary: "#465dd4", accent: "#ff8f70", text: "#fffaf5", quiet: "#dce2ff" },
  monochrome: { background: "#111111", secondary: "#272727", accent: "#fffaf5", text: "#fffaf5", quiet: "#c9c9c9" },
};

async function drawCardArtwork(card, batch, canvas) {
  const qr = await getQrDataUrl(card.nfc_url || cardUrl(card.slug));
  const logoUrl = await getBatchLogoDataUrl(batch);
  const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;
  const qrImage = qr ? await loadImage(qr).catch(() => null) : null;
  const ctx = canvas.getContext("2d");
  const width = 1082;
  const height = 709;
  canvas.width = width * 2;
  canvas.height = height;
  drawCardFace(ctx, 0, 0, width, height, batch, card, "front", logo, null);
  drawCardFace(ctx, width, 0, width, height, batch, card, "back", logo, qrImage);
}

async function getBatchLogoDataUrl(batch) {
  if (state.selectedLogoDataUrl && state.selectedBatch?.id === batch?.id) return state.selectedLogoDataUrl;
  if (!batch?.logo_path || !sb || state.preview) return "";
  state.logoDataCache = state.logoDataCache || {};
  if (state.logoDataCache[batch.id]) return state.logoDataCache[batch.id];
  const { data, error } = await sb.storage.from("card-design-logos").createSignedUrl(batch.logo_path, 3600);
  if (error || !data?.signedUrl) return "";
  state.logoDataCache[batch.id] = data.signedUrl;
  return data.signedUrl;
}

function drawCardFace(ctx, x, y, width, height, batch, card, side, logo, qr) {
  const palette = artworkPalettes[batch.skin] || artworkPalettes.aubergine;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * .9, height * .08, 15, width * .9, height * .08, width * .65);
  glow.addColorStop(0, `${palette.accent}55`);
  glow.addColorStop(1, `${palette.accent}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = palette.text;
  ctx.textBaseline = "top";
  if (side === "front") {
    drawArtworkLogo(ctx, logo, 72, 62, 160, 86, palette.text, batch);
    ctx.font = "800 25px Arial";
    ctx.fillText("CARDENCE", 72, 170);
    ctx.font = "800 92px Arial";
    ctx.fillStyle = palette.accent;
    ctx.fillText("TAP HERE", 72, 300);
    ctx.fillStyle = palette.text;
    ctx.font = "500 31px Arial";
    ctx.fillText(batch.tagline || "One tap. Every connection.", 76, 420);
    ctx.font = "700 22px Arial";
    ctx.fillStyle = palette.quiet;
    ctx.fillText(batch.brand_name || "Your living contact profile", 76, 610);
    drawContactlessGlyph(ctx, width - 170, 92, palette.accent);
  } else {
    ctx.font = "800 25px Arial";
    ctx.fillStyle = palette.text;
    ctx.fillText(batch.brand_name || "CARDENCE", 72, 58);
    ctx.font = "700 24px Arial";
    ctx.fillStyle = palette.quiet;
    ctx.fillText("SCAN TO CONNECT", 72, 110);
    if (qr) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(width - 400, 106, 300, 300);
      ctx.drawImage(qr, width - 390, 116, 280, 280);
    }
    ctx.font = "500 27px Arial";
    ctx.fillStyle = palette.text;
    ctx.fillText("Hold your phone near the card", 72, 270);
    ctx.fillText("or scan the QR code.", 72, 310);
    ctx.font = "700 22px monospace";
    ctx.fillStyle = palette.quiet;
    ctx.fillText(`CARD ${String(card.batch_position || "").padStart(2, "0")} · ${card.slug || ""}`, 72, 610);
  }
  ctx.restore();
}

function drawArtworkLogo(ctx, logo, x, y, maxWidth, maxHeight, fallbackColor, batch) {
  if (logo) {
    const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height, 1);
    const width = logo.width * scale;
    const height = logo.height * scale;
    ctx.drawImage(logo, x, y, width, height);
    return;
  }
  ctx.fillStyle = fallbackColor;
  ctx.font = "800 70px Arial";
  ctx.fillText((batch.brand_name || "C").slice(0, 1).toUpperCase(), x, y);
}

function drawContactlessGlyph(ctx, x, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  [0, 27, 54].forEach((offset) => { ctx.beginPath(); ctx.arc(x, y, 36 + offset, -Math.PI * .75, Math.PI * .75); ctx.stroke(); });
  ctx.restore();
}

function loadImage(src) {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.crossOrigin = "anonymous"; image.src = src; });
}

async function downloadCardArtwork(card = state.selectedArtworkCard, batch = state.selectedBatch) {
  if (!card || !batch) return showToast("Select a batch card first.");
  const canvas = document.createElement("canvas");
  await drawCardArtwork(card, batch, canvas);
  canvas.toBlob((blob) => { if (blob) downloadBlob(blob, `cardence-card-${String(card.batch_position || 1).padStart(2, "0")}.png`, "image/png"); }, "image/png");
}

async function downloadBatchArtwork(cards = state.selectedBatchCards, batch = state.selectedBatch) {
  if (!cards?.length || !batch) return showToast("Select a batch first.");
  if (!globalThis.JSZip) return showToast("Artwork pack support is still loading. Try again in a moment.");
  if (cards.length > 100) return showToast("For a large batch, download artwork in groups of 100 or fewer.");
  const zip = new JSZip();
  setMessage(els.adminMessage, `Preparing artwork for ${cards.length} cards…`);
  for (const card of cards) {
    const canvas = document.createElement("canvas");
    await drawCardArtwork(card, batch, canvas);
    const data = canvas.toDataURL("image/png").split(",")[1];
    zip.file(`card-${String(card.batch_position || 1).padStart(3, "0")}.png`, data, { base64: true });
  }
  zip.file("artwork-manifest.csv", [["Card", "Slug", "NFC URL"], ...cards.map((card, index) => [card.batch_position || index + 1, card.slug, card.nfc_url || cardUrl(card.slug)])].map((row) => row.map(csvCell).join(",")).join("\r\n"));
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `cardence-${safeDownloadName(batch.batch_name)}-artwork.zip`, "application/zip");
  setMessage(els.adminMessage, "Artwork pack ready.", "success");
}

async function printActivationPack(cards, batch) {
  if (!cards?.length || !batch) return showToast("Select a batch first.");
  const copies = Math.max(1, Math.min(50, Number(els.instructionCopies?.value || 1)));
  const JsPDF = globalThis.jspdf?.jsPDF;
  if (JsPDF) {
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let first = true;
    for (let page = 0; page < copies; page += 1) {
      if (!first) doc.addPage();
      first = false;
      drawInstructionPage(doc, batch, page + 1, copies);
    }
    for (let start = 0; start < cards.length; start += 36) {
      doc.addPage();
      drawCodeLabelsPage(doc, cards.slice(start, start + 36), batch, start);
    }
    doc.save(`cardence-${safeDownloadName(batch.batch_name)}-activation-pack.pdf`);
    showToast("Activation pack PDF downloaded.");
    return;
  }
  await openActivationPackPrintWindow(cards, batch, copies);
}

function drawInstructionPage(doc, batch, pageNumber, pageTotal) {
  const cardWidth = 90;
  const cardHeight = 62;
  const gapX = 10;
  const gapY = 8;
  const left = 15;
  const top = 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(33, 26, 56);
  doc.text(`${batch.brand_name || "Cardence"} activation guide`, 15, 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text(`Instruction card ${pageNumber} of ${pageTotal}`, 195, 7, { align: "right" });
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 2; col += 1) drawInstructionCard(doc, left + col * (cardWidth + gapX), top + row * (cardHeight + gapY), cardWidth, cardHeight, batch);
}

function drawInstructionCard(doc, x, y, width, height, batch) {
  doc.setDrawColor(247, 121, 93);
  doc.setLineDashPattern([1, 1], 0);
  doc.roundedRect(x, y, width, height, 3, 3, "S");
  doc.setLineDashPattern([], 0);
  doc.setFillColor(33, 26, 56);
  doc.roundedRect(x + 3, y + 3, 22, 10, 2, 2, "F");
  doc.setTextColor(255, 250, 245);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text("CARDENCE", x + 6, y + 9.4);
  doc.setTextColor(33, 26, 56);
  doc.setFontSize(7.2);
  doc.text("Set up your card", x + 29, y + 9.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.25);
  const steps = ["1. Scan the QR code or tap the card.", "2. Create an account and confirm your email.", "3. Log in, then choose Add a card.", "4. Enter the access code on the label.", "5. Save your profile or choose another link."];
  steps.forEach((step, index) => doc.text(step, x + 5, y + 19 + index * 5.4));
  drawPdfSensor(doc, x + 9, y + 47, "iPhone");
  drawPdfSensor(doc, x + 53, y + 47, "Android");
  doc.setFontSize(4.25);
  doc.text("Hold the top edge", x + 5, y + 59);
  doc.text("Hold the back", x + 52, y + 59);
}

function drawPdfSensor(doc, x, y, type) {
  doc.setDrawColor(33, 26, 56);
  doc.setFillColor(type === "iPhone" ? 235 : 226, type === "iPhone" ? 231 : 236, type === "iPhone" ? 245 : 252);
  doc.roundedRect(x, y, 25, 12, 2, 2, "FD");
  doc.setDrawColor(247, 121, 93);
  doc.setLineWidth(.7);
  doc.circle(x + 12.5, y + 5.3, 3.4, "S");
  doc.setFillColor(255, 143, 112);
  doc.circle(x + 12.5, y + 5.3, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.2);
  doc.setTextColor(33, 26, 56);
  doc.text(type, x + 12.5, y + 10, { align: "center" });
}

function drawCodeLabelsPage(doc, cards, batch, offset) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(33, 26, 56);
  doc.text(`${batch.brand_name || "Cardence"} access labels`, 15, 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.text("Cut each label and tape it to the matching card. Keep codes private.", 195, 7, { align: "right" });
  const labelWidth = 60;
  const labelHeight = 20;
  cards.forEach((card, index) => {
    const local = index;
    const col = local % 3;
    const row = Math.floor(local / 3);
    const x = 10 + col * 65;
    const y = 10 + row * 23;
    doc.setDrawColor(247, 121, 93);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(x, y, labelWidth, labelHeight, "S");
    doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(33, 26, 56);
    doc.text(`CARD ${String(card.batch_position || offset + index + 1).padStart(2, "0")}`, x + 4, y + 6);
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text(card.claim_code || "--------", x + 4, y + 14.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.2);
    doc.text("Private setup code", x + labelWidth - 4, y + 6, { align: "right" });
  });
}

async function openActivationPackPrintWindow(cards, batch, copies) {
  const popup = window.open("", "_blank");
  if (!popup) return showToast("Allow popups to print the activation pack.");
  const qrRows = cards.map((card) => `<div class="label"><strong>CARD ${String(card.batch_position || "").padStart(2, "0")}</strong><b>${escapeHtml(card.claim_code || "")}</b><small>Private setup code</small></div>`).join("");
  const instructions = Array.from({ length: copies }, () => `<article class="instruction"><header><b>CARDENCE</b><strong>Set up your card</strong></header><ol><li>Scan the QR code or tap the card.</li><li>Create an account and confirm your email.</li><li>Log in, then choose Add a card.</li><li>Enter the access code on the label.</li><li>Save your profile or choose another link.</li></ol><div class="mini-sensors"><span>iPhone<br><i>Top edge</i></span><span>Android<br><i>Back</i></span></div></article>`).join("");
  popup.document.write(`<!doctype html><title>Cardence activation pack</title><style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#211a38}.page{page-break-after:always;display:grid;grid-template-columns:repeat(2,90mm);grid-auto-rows:62mm;gap:8mm 10mm}.instruction,.label{position:relative;border:1px dashed #f7795d;border-radius:3mm;padding:4mm}.instruction header{display:flex;gap:4mm;align-items:center;margin-bottom:3mm}.instruction header b{padding:2mm;color:#fff;background:#211a38;border-radius:2mm;font-size:9px}.instruction header strong{font-size:11px}.instruction ol{margin:0;padding-left:5mm;font-size:8px;line-height:1.35}.mini-sensors{display:flex;justify-content:space-around;margin-top:3mm;text-align:center;font-size:8px}.mini-sensors span{display:grid;place-items:center;width:22mm;height:12mm;border:1px solid #211a38;border-radius:2mm}.mini-sensors i{color:#bd3d4d;font-size:6px;font-style:normal}.labels{page-break-after:always;display:grid;grid-template-columns:repeat(3,60mm);grid-auto-rows:20mm;gap:3mm 5mm}.label{border-radius:0;padding:3mm}.label strong{font-size:8px;display:block}.label b{font:700 14px monospace;display:block;margin-top:2mm}.label small{font-size:6px;position:absolute;right:3mm;top:3mm}</style><h1 style="font-size:12px">${escapeHtml(batch.brand_name || "Cardence")} activation pack</h1><div class="page">${instructions}</div><div class="labels">${qrRows}</div><script>window.onload=()=>window.print()<\/script>`);
  popup.document.close();
}

function showPreviewDashboard() {
  state.preview = true;
  state.user = { id: "preview-user", email: "alex@cardence.co.za" };
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
  if (!parts.length) return "C";
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
  if (/admin_create_card_batch|admin_get_batches|admin_get_batch_cards|admin_update_card_production_status/i.test(text)) return "The latest Cardence admin batch migration still needs to be applied.";
  if (/update_contact_profile|function.*does not exist|schema cache|destination_type_check/i.test(text)) return "The Cardence contact-profile database upgrade still needs to be applied.";
  if (/invalid login credentials/i.test(text)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(text)) return "Confirm your email before logging in.";
  if (/user already registered/i.test(text)) return "That email already has an account.";
  if (/failed to fetch|network/i.test(text)) return "Could not reach Cardence. Check your connection and try again.";
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
