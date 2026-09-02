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

const STORE_PRODUCTS = {
  original: { name: "Unbranded Card", description: "A clean Cardence design with encoded NFC, matching QR and a private activation code.", typeLabel: "Unbranded", minimum: 1 },
  custom: { name: "Branded Card", description: "Your logo and colour direction on a fully encoded Cardence card.", typeLabel: "Branded", minimum: 1 },
  bulk: { name: "Legacy Bulk Order", description: "Individually claimable cards for teams and events.", typeLabel: "Bulk", minimum: 10 },
};

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
  storeProduct: "original",
  shippingQuote: null,
  storeLogoUrl: "",
  adminOverview: {},
  pickupCodes: [],
  orderLogoUrls: {},
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

  showPaymentReturn(params);

  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") resetToLanding();
  });
}

function cacheElements() {
  [
    "app", "redirectScreen", "redirectTitle", "redirectText", "manualOpen", "publicProfileScreen",
    "publicInitials", "publicName", "publicHeadline", "publicBio", "publicPrimaryActions",
    "publicSocialLinks", "publicDetails", "publicShareBtn", "landingPage", "authSection", "dashboard",
    "editorSection", "adminPage", "landingNav", "headerCtas", "accountActions", "homeBtn", "shopNavBtn", "accountsNavBtn",
    "showLoginBtn", "showSignupBtn", "heroStartBtn", "heroLoginBtn", "footerLoginBtn", "footerSignupBtn",
    "accountShopBtn", "accountBtn", "adminNavBtn", "logoutBtn", "backHomeBtn", "footerYear", "authTitle", "authSubtitle",
    "authForm", "emailInput", "passwordInput", "authSubmitBtn", "switchAuthBtn", "authMessage", "userEmail",
    "dashboardTapTotal", "dashboardCardTotal", "dashboardProfileStatus", "profileCompletionBadge", "profileForm",
    "profileBioCount", "saveProfileBtn", "profileMessage", "previewProfileInitials", "previewProfileName",
    "previewProfileHeadline", "previewProfileActions", "previewProfileSocials", "dashboardShopBtn", "openClaimBtn", "emptyClaimBtn",
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
    "designPreviewTitle", "designPreviewMeta", "downloadCardArtworkBtn", "downloadBatchArtworkBtn", "downloadBatchPdfBtn", "cardDesignCanvas",
    "adminOrdersLabel", "adminOpenOrdersLabel", "adminYocoReceived", "adminCardSales", "adminShippingReceived",
    "adminPaidOrders", "adminRefunded", "adminOrdersList", "pickupCodeForm", "pickupCodeLabel", "pickupCodeMinutes",
    "pickupCodeUses", "createPickupCodeBtn", "pickupCodeResult", "pickupCodeValue", "copyPickupCodeBtn", "pickupCodesList", "pickupCodeMessage",
    "storeModal", "closeStoreBtn", "storeCardPreview", "storePreviewLogoStage", "storePreviewLogoPlaceholder", "storePreviewLogo", "storePreviewBrand", "storePreviewName", "storePreviewTagline",
    "storeProductName", "storeProductText", "storeMerchandiseTotal", "storeBulkDiscount", "storeDeliveryTotal", "storeGrandTotal",
    "storeOrderForm", "storeQuantity", "storeTypeLabel", "customDesignFields", "storeLogo", "storeBrandName", "storeTagline",
    "storeSkin", "courierFields", "pickupFields", "quoteDeliveryBtn", "shippingResult", "placeOrderBtn", "storeMessage", "toast",
  ].forEach((id) => { els[id] = $(id); });

  Object.values(PROFILE_INPUTS).forEach((id) => { els[id] = $(id); });
}

function wireEvents() {
  [els.showSignupBtn, els.footerSignupBtn].forEach((button) => button.addEventListener("click", () => openAuth("signup")));
  [els.showLoginBtn, els.heroLoginBtn, els.footerLoginBtn, els.accountsNavBtn].forEach((button) => button.addEventListener("click", () => state.user ? showDashboard(state.user) : openAuth("login")));
  els.homeBtn.addEventListener("click", () => state.user ? showDashboard(state.user) : showLanding(true));
  els.backHomeBtn.addEventListener("click", () => showLanding(true));
  els.accountBtn.addEventListener("click", () => state.user && showDashboard(state.user));
  [els.shopNavBtn, els.accountShopBtn, els.dashboardShopBtn, els.heroStartBtn].forEach((button) => button.addEventListener("click", goToShop));
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
  els.downloadBatchPdfBtn.addEventListener("click", () => downloadBatchPrintPdf(state.selectedBatchCards, state.selectedBatch));
  els.inventoryLogo.addEventListener("change", handleLogoSelection);
  els.inventoryDesignMode.addEventListener("change", updateDesignFormState);
  els.publicShareBtn.addEventListener("click", sharePublicProfile);
  $$(".shopBuyBtn").forEach((button) => button.addEventListener("click", () => openStore(button.dataset.product, Number(button.dataset.quantity || 1))));
  els.closeStoreBtn.addEventListener("click", closeStore);
  els.storeModal.addEventListener("click", (event) => { if (event.target === els.storeModal) closeStore(); });
  els.storeOrderForm.addEventListener("input", handleStoreInput);
  els.storeOrderForm.addEventListener("change", handleStoreInput);
  els.storeLogo.addEventListener("change", updateStoreLogoPreview);
  els.quoteDeliveryBtn.addEventListener("click", quoteStoreDelivery);
  els.storeOrderForm.addEventListener("submit", submitStoreOrder);
  els.pickupCodeForm.addEventListener("submit", createPickupCode);
  els.copyPickupCodeBtn.addEventListener("click", async () => { await copyText(els.pickupCodeValue.textContent); showToast("Handover code copied."); });
  els.adminOrdersList.addEventListener("click", handleAdminOrderAction);
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
    renderAdminOverview({ totals: { total_cards: 24, linked_cards: 16, activated_cards: 18, unclaimed_cards: 6, open_orders: 1 }, revenue: { yoco_received_cents: 59800, card_sales_cents: 59800, shipping_collected_cents: 0, paid_orders: 2, refunded_cents: 0 }, cards: state.cards, orders: [] });
    renderPickupCodes();
    renderBatchList();
    await selectBatch(state.batches[0]);
    return setMessage(els.adminMessage, "");
  }
  const [overviewResult, batchesResult, pickupResult] = await Promise.all([
    sb.rpc("admin_dashboard_overview"),
    sb.rpc("admin_get_batches"),
    sb.rpc("admin_get_store_pickup_codes"),
  ]);
  if (overviewResult.error) return setMessage(els.adminMessage, friendlyError(overviewResult.error), "error");
  state.adminOverview = overviewResult.data || {};
  await loadOrderLogoUrls(state.adminOverview.orders || []);
  renderAdminOverview(state.adminOverview);
  state.pickupCodes = pickupResult.error ? [] : (typeof pickupResult.data === "string" ? JSON.parse(pickupResult.data) : (pickupResult.data || []));
  renderPickupCodes();
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
  const revenue = data.revenue || {};
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const orders = Array.isArray(data.orders) ? data.orders : [];
  els.adminTotalCards.textContent = formatNumber(totals.total_cards || 0);
  els.adminLinkedCards.textContent = formatNumber(totals.linked_cards || 0);
  els.adminActivatedCards.textContent = formatNumber(totals.activated_cards || 0);
  els.adminUnclaimedCards.textContent = formatNumber(totals.unclaimed_cards || 0);
  els.adminCardsLabel.textContent = `${formatNumber(totals.total_cards || 0)} total`;
  els.adminYocoReceived.textContent = formatMoney(revenue.yoco_received_cents || 0);
  els.adminCardSales.textContent = formatMoney(revenue.card_sales_cents || 0);
  els.adminShippingReceived.textContent = formatMoney(revenue.shipping_collected_cents || 0);
  els.adminPaidOrders.textContent = formatNumber(revenue.paid_orders || 0);
  els.adminRefunded.textContent = formatMoney(revenue.refunded_cents || 0);
  els.adminOrdersLabel.textContent = `${formatNumber(revenue.paid_orders || 0)} paid`;
  els.adminOpenOrdersLabel.textContent = `${formatNumber(totals.open_orders || 0)} open`;
  if (els.adminCardsBody) els.adminCardsBody.innerHTML = cards.length ? cards.map((card) => {
    const activated = Boolean(card.owner_id);
    const routed = card.destination_type === "profile" ? activated : Boolean(card.destination_url);
    const route = card.destination_type === "profile" ? "Contact profile" : routed ? "Other link" : "No route";
    return `<tr><td>${escapeHtml(card.card_name || "Cardence Card")}</td><td><code>${escapeHtml(card.slug || "")}</code></td><td><span class="admin-status ${routed ? "good" : "waiting"}">${escapeHtml(route)}</span></td><td><span class="admin-status ${activated ? "good" : "waiting"}">${activated ? "Claimed" : "Ready"}</span></td><td>${formatNumber(card.tap_count || 0)}</td></tr>`;
  }).join("") : '<tr><td colspan="5">No cards have been created yet.</td></tr>';
  renderAdminOrders(orders);
}

async function loadOrderLogoUrls(orders) {
  state.orderLogoUrls = {};
  await Promise.all(orders.filter((order) => order.logo_path).map(async (order) => {
    const { data } = await sb.storage.from("order-logos").createSignedUrl(order.logo_path, 3600);
    if (data?.signedUrl) state.orderLogoUrls[order.id] = data.signedUrl;
  }));
}

function renderAdminOrders(orders) {
  if (!orders.length) {
    els.adminOrdersList.innerHTML = '<p class="empty-inline">No Cardence store orders yet.</p>';
    return;
  }
  els.adminOrdersList.innerHTML = orders.map((order) => {
    const address = order.delivery_address || {};
    const addressText = order.delivery_method === "pickup"
      ? "Protected in-person handover"
      : [address.streetAddress, address.localArea, address.city, address.province, address.postalCode].filter(Boolean).join(", ");
    const logo = state.orderLogoUrls[order.id]
      ? `<img class="admin-order-logo" src="${escapeAttribute(state.orderLogoUrls[order.id])}" alt="Logo for ${escapeAttribute(order.brand_name || order.customer_name)}" />`
      : `<div class="admin-order-logo logo-placeholder">${escapeHtml((order.brand_name || "C").slice(0, 1).toUpperCase())}</div>`;
    const fulfilOptions = ["new", "designing", "awaiting_approval", "production", "ready_to_ship", "shipped", "delivered", "cancelled"]
      .map((value) => `<option value="${value}"${order.fulfilment_status === value ? " selected" : ""}>${escapeHtml(titleCase(value))}</option>`).join("");
    const paymentOptions = ["pending", "paid", "failed", "review", "refunded", "cancelled"]
      .map((value) => `<option value="${value}"${order.payment_status === value ? " selected" : ""}>${escapeHtml(titleCase(value))}</option>`).join("");
    const bookButton = order.delivery_method === "courier" && order.payment_status === "paid" && order.fulfilment_status === "ready_to_ship"
      ? `<button class="button primary compact" data-order-action="book" data-order-id="${escapeAttribute(order.id)}">Book Bob Go</button>` : "";
    const tracking = order.tracking_url
      ? `<a class="order-tracking" href="${escapeAttribute(order.tracking_url)}" target="_blank" rel="noopener">Track ${escapeHtml(order.tracking_reference || "shipment")} ↗</a>`
      : order.tracking_reference ? `<span class="order-tracking">Tracking: ${escapeHtml(order.tracking_reference)}</span>` : "";
    return `<article class="admin-order-card"><div class="admin-order-top"><div><code>${escapeHtml(order.public_reference)}</code><small>${escapeHtml(formatDateTime(order.created_at))}</small></div><span class="admin-status ${order.payment_status === "paid" ? "good" : "waiting"}">${escapeHtml(titleCase(order.payment_status))}</span></div><div class="admin-order-body">${logo}<div class="admin-order-details"><h3>${escapeHtml(order.quantity)} x ${escapeHtml(productName(order.product_type))}</h3><p><b>${escapeHtml(order.brand_name || order.customer_name)}</b>${order.tagline ? ` · ${escapeHtml(order.tagline)}` : ""}</p><dl><div><dt>Customer</dt><dd>${escapeHtml(order.customer_name)} · ${escapeHtml(order.customer_email)} · ${escapeHtml(order.customer_phone)}</dd></div><div><dt>Colour</dt><dd>${escapeHtml(titleCase(order.card_skin || "aubergine"))}</dd></div><div><dt>Delivery</dt><dd>${escapeHtml(addressText || "Address unavailable")}</dd></div><div><dt>Order value</dt><dd>${formatMoney(order.merchandise_total_cents)} cards + ${formatMoney(order.shipping_amount_cents)} delivery = <b>${formatMoney(order.total_cents)}</b></dd></div>${order.order_notes ? `<div><dt>Notes</dt><dd>${escapeHtml(order.order_notes)}</dd></div>` : ""}</dl>${tracking}</div></div><div class="admin-order-actions"><label>Payment<select data-payment-for="${escapeAttribute(order.id)}">${paymentOptions}</select></label><label>Fulfilment<select data-fulfilment-for="${escapeAttribute(order.id)}">${fulfilOptions}</select></label><button class="button secondary compact" data-order-action="save" data-order-id="${escapeAttribute(order.id)}">Save status</button>${bookButton}</div></article>`;
  }).join("");
}

function renderPickupCodes() {
  const now = Date.now();
  const codes = Array.isArray(state.pickupCodes) ? state.pickupCodes : [];
  els.pickupCodesList.innerHTML = codes.length ? codes.map((code) => {
    const available = code.active && new Date(code.expires_at).getTime() > now && Number(code.used_count) < Number(code.max_uses);
    return `<span class="pickup-code-chip ${available ? "active" : "expired"}"><b>${escapeHtml(code.label)}</b><small>${available ? `Active until ${escapeHtml(formatDateTime(code.expires_at))}` : "Used or expired"} · ${formatNumber(code.used_count)}/${formatNumber(code.max_uses)} used</small></span>`;
  }).join("") : '<span class="empty-inline">No handover codes created yet.</span>';
}

async function createPickupCode(event) {
  event.preventDefault();
  if (state.preview) return setMessage(els.pickupCodeMessage, "Code generation is disabled in preview mode.");
  els.createPickupCodeBtn.disabled = true;
  setMessage(els.pickupCodeMessage, "Generating a private handover code…");
  const { data, error } = await sb.rpc("admin_create_store_pickup_code", {
    p_label: els.pickupCodeLabel.value.trim() || "In-person handover",
    p_valid_minutes: Number(els.pickupCodeMinutes.value || 60),
    p_max_uses: Number(els.pickupCodeUses.value || 1),
  });
  els.createPickupCodeBtn.disabled = false;
  if (error) return setMessage(els.pickupCodeMessage, friendlyError(error), "error");
  const result = typeof data === "string" ? JSON.parse(data) : data;
  els.pickupCodeValue.textContent = result.code;
  els.pickupCodeResult.classList.remove("hidden");
  setMessage(els.pickupCodeMessage, `Code expires ${formatDateTime(result.expires_at)}. It is only shown here once.`, "success");
  const { data: codes } = await sb.rpc("admin_get_store_pickup_codes");
  state.pickupCodes = typeof codes === "string" ? JSON.parse(codes) : (codes || []);
  renderPickupCodes();
}

async function handleAdminOrderAction(event) {
  const button = event.target.closest("[data-order-action]");
  if (!button) return;
  const orderId = button.dataset.orderId;
  button.disabled = true;
  try {
    if (button.dataset.orderAction === "book") {
      setMessage(els.adminMessage, "Booking Bob Go collection…");
      const { data, error } = await sb.functions.invoke("cardence-book-shipment", { body: { orderId } });
      if (error) throw await unwrapFunctionError(error);
      showToast(data?.alreadyBooked ? "Shipment was already booked." : "Bob Go shipment booked.");
    } else {
      const payment = els.adminOrdersList.querySelector(`[data-payment-for="${CSS.escape(orderId)}"]`).value;
      const fulfilment = els.adminOrdersList.querySelector(`[data-fulfilment-for="${CSS.escape(orderId)}"]`).value;
      const { error } = await sb.rpc("admin_update_store_order", { p_order_id: orderId, p_payment_status: payment, p_fulfilment_status: fulfilment });
      if (error) throw error;
      showToast("Order status saved.");
    }
    await loadAdminOverview();
  } catch (error) {
    setMessage(els.adminMessage, friendlyError(error), "error");
    button.disabled = false;
  }
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
  aubergine: { background: "#25212b", secondary: "#302b36", accent: "#c9b5aa", text: "#f7f4f0", quiet: "#b8b1ba" },
  porcelain: { background: "#f4f1ec", secondary: "#e8e3dc", accent: "#4c4353", text: "#211d27", quiet: "#78717a" },
  coral: { background: "#a96f62", secondary: "#966156", accent: "#f2e6df", text: "#fbf7f4", quiet: "#e2cec7" },
  cobalt: { background: "#46556a", secondary: "#39475a", accent: "#d8cabc", text: "#f6f3ef", quiet: "#c8cdd4" },
  monochrome: { background: "#171717", secondary: "#242424", accent: "#d8d2ca", text: "#f7f6f2", quiet: "#b8b8b8" },
};

async function renderCardSideCanvas(card, batch, side, resources = {}) {
  const width = 1082;
  const height = 709;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const logo = resources.logo || null;
  let qrImage = resources.qrImage || null;
  if (side === "back" && !qrImage) {
    const qr = await getQrDataUrl(card.nfc_url || cardUrl(card.slug));
    qrImage = qr ? await loadImage(qr).catch(() => null) : null;
  }
  drawCardFace(canvas.getContext("2d"), 0, 0, width, height, batch, card, side, logo, qrImage);
  return canvas;
}

async function drawCardArtwork(card, batch, canvas) {
  const logoUrl = await getBatchLogoDataUrl(batch);
  const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;
  const front = await renderCardSideCanvas(card, batch, "front", { logo });
  const back = await renderCardSideCanvas(card, batch, "back", { logo });
  const width = 1082;
  const height = 709;
  const ctx = canvas.getContext("2d");
  canvas.width = width * 2;
  canvas.height = height;
  ctx.drawImage(front, 0, 0);
  ctx.drawImage(back, width, 0);
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
  const glow = ctx.createRadialGradient(width * .88, height * .12, 15, width * .88, height * .12, width * .7);
  glow.addColorStop(0, `${palette.accent}24`);
  glow.addColorStop(1, `${palette.accent}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = palette.text;
  ctx.textBaseline = "top";
  if (side === "front") {
    drawArtworkLogo(ctx, logo, 72, 60, 138, 78, palette.text, batch);
    ctx.font = "700 22px Arial";
    ctx.fillText("CARDENCE", 72, 170);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(72, 244);
    ctx.lineTo(190, 244);
    ctx.stroke();
    ctx.font = "600 44px Arial";
    ctx.fillStyle = palette.accent;
    ctx.fillText(batch.tagline || "Connect instantly.", 72, 304);
    ctx.font = "500 22px Arial";
    ctx.fillStyle = palette.quiet;
    ctx.fillText(batch.brand_name || "Your digital contact card", 72, 372);
    ctx.font = "600 18px Arial";
    ctx.fillText("NFC + QR", 72, 620);
    drawNfcSymbolMarker(ctx, width - 180, 440, palette.accent, palette.quiet, "NFC TAP ZONE");
  } else {
    ctx.font = "700 23px Arial";
    ctx.fillStyle = palette.text;
    ctx.fillText(batch.brand_name || "CARDENCE", 72, 58);
    ctx.font = "600 20px Arial";
    ctx.fillStyle = palette.quiet;
    ctx.fillText("SCAN OR TAP TO CONNECT", 72, 108);
    if (qr) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(width - 400, 106, 300, 300);
      ctx.drawImage(qr, width - 390, 116, 280, 280);
    }
    ctx.font = "500 24px Arial";
    ctx.fillStyle = palette.text;
    ctx.fillText("Hold your phone near the card", 72, 270);
    ctx.fillText("or scan the QR code.", 72, 310);
    ctx.font = "600 19px monospace";
    ctx.fillStyle = palette.quiet;
    ctx.fillText(`CARD ${String(card.batch_position || "").padStart(2, "0")} · ${card.slug || ""}`, 72, 610);
    drawNfcSymbolMarker(ctx, 180, 440, palette.accent, palette.quiet, "ALIGN · NFC TAP ZONE");
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

function drawNfcSymbolMarker(ctx, x, y, color, labelColor, label = "NFC TAP ZONE") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  [0, 27, 54].forEach((offset) => {
    ctx.beginPath();
    ctx.arc(x, y, 30 + offset, -Math.PI * .72, Math.PI * .72);
    ctx.stroke();
  });
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = labelColor || color;
  ctx.font = "700 20px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(label, x, y + 92);
  ctx.restore();
}

function drawContactlessGlyph(ctx, x, y, color) {
  drawNfcSymbolMarker(ctx, x, y, color, color, "NFC TAP ZONE");
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

async function downloadBatchPrintPdf(cards = state.selectedBatchCards, batch = state.selectedBatch) {
  if (!cards?.length || !batch) return showToast("Select a batch first.");
  const JsPDF = globalThis.jspdf?.jsPDF;
  if (!JsPDF) return showToast("Print PDF support is still loading. Try again in a moment.");

  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  doc.setProperties({
    title: `${batch.brand_name || "Cardence"} card production`,
    subject: "Double-sided card artwork with NFC alignment markers",
    author: "Cardence",
  });
  const pageWidth = 210;
  const cardWidth = 91.6;
  const cardHeight = 60;
  const gapX = 4;
  const gapY = 4;
  const marginX = (pageWidth - (cardWidth * 2 + gapX)) / 2;
  const top = 22;
  const perSheet = 8;
  const totalSheets = Math.ceil(cards.length / perSheet);
  const logoUrl = await getBatchLogoDataUrl(batch);
  const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;

  setMessage(els.adminMessage, `Preparing double-sided print PDF for ${cards.length} cards…`);
  for (let start = 0; start < cards.length; start += perSheet) {
    const sheetCards = cards.slice(start, start + perSheet);
    if (start > 0) doc.addPage();
    drawProductionPageHeader(doc, batch, "FRONT", Math.floor(start / perSheet) + 1, totalSheets);
    for (let index = 0; index < sheetCards.length; index += 1) {
      const card = sheetCards[index];
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = marginX + col * (cardWidth + gapX);
      const y = top + row * (cardHeight + gapY);
      const front = await renderCardSideCanvas(card, batch, "front", { logo });
      doc.addImage(front.toDataURL("image/png"), "PNG", x, y, cardWidth, cardHeight, `front-${start + index}`, "FAST");
      drawPdfCardMarks(doc, x, y, "front", card, cardWidth, cardHeight);
    }

    doc.addPage();
    drawProductionPageHeader(doc, batch, "BACK", Math.floor(start / perSheet) + 1, totalSheets);
    for (let index = 0; index < sheetCards.length; index += 1) {
      const card = sheetCards[index];
      const col = index % 2;
      const row = Math.floor(index / 2);
      // Mirror the columns for long-edge duplex so the back artwork lands behind its front card.
      const x = pageWidth - marginX - cardWidth - col * (cardWidth + gapX);
      const y = top + row * (cardHeight + gapY);
      const back = await renderCardSideCanvas(card, batch, "back", { logo });
      doc.addImage(back.toDataURL("image/png"), "PNG", x, y, cardWidth, cardHeight, `back-${start + index}`, "FAST");
      drawPdfCardMarks(doc, x, y, "back", card, cardWidth, cardHeight);
    }
  }
  doc.save(`cardence-${safeDownloadName(batch.batch_name)}-print-production.pdf`);
  setMessage(els.adminMessage, "Double-sided production PDF ready.", "success");
  showToast("Production PDF downloaded.");
}

function drawProductionPageHeader(doc, batch, side, sheetNumber, sheetTotal) {
  const ink = [33, 26, 56];
  const coral = [247, 121, 93];
  doc.setFillColor(252, 249, 246);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${batch.brand_name || "Cardence"} card production`, 12, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(117, 109, 125);
  doc.text(`${side} SIDE · Sheet ${sheetNumber} of ${sheetTotal}`, 198, 9.5, { align: "right" });
  doc.text(side === "BACK" ? "Mirror columns · print at 100% · flip on the long edge" : "8 cards per A4 · print at 100% · trim on the inner contour", 198, 15, { align: "right" });
  doc.setDrawColor(...coral);
  doc.setLineWidth(.35);
  doc.line(12, 18, 198, 18);
  doc.setTextColor(117, 109, 125);
  doc.setFontSize(5.2);
  doc.text("Bleed is included in each artwork tile. The inner dashed contour is the finished card edge.", 12, 288);
  doc.text("Keep the back sheet in the same orientation as the front sheet.", 198, 288, { align: "right" });
}

function drawPdfCardMarks(doc, x, y, side, card, cardWidth, cardHeight) {
  const ink = [33, 26, 56];
  const coral = [247, 121, 93];
  const trimX = x + 3;
  const trimY = y + 3;
  const trimWidth = cardWidth - 6;
  const trimHeight = cardHeight - 6;
  doc.setDrawColor(...coral);
  doc.setLineWidth(.32);
  doc.setLineDashPattern([1.2, 1], 0);
  doc.roundedRect(trimX, trimY, trimWidth, trimHeight, 3.2, 3.2, "S");
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(...ink);
  doc.setLineWidth(.35);
  const mark = 2.6;
  const gap = .8;
  doc.line(trimX - gap - mark, trimY, trimX - gap, trimY);
  doc.line(trimX, trimY - gap - mark, trimX, trimY - gap);
  doc.line(trimX + trimWidth + gap, trimY, trimX + trimWidth + gap + mark, trimY);
  doc.line(trimX + trimWidth, trimY - gap - mark, trimX + trimWidth, trimY - gap);
  doc.line(trimX - gap - mark, trimY + trimHeight, trimX - gap, trimY + trimHeight);
  doc.line(trimX, trimY + trimHeight + gap, trimX, trimY + trimHeight + gap + mark);
  doc.line(trimX + trimWidth + gap, trimY + trimHeight, trimX + trimWidth + gap + mark, trimY + trimHeight);
  doc.line(trimX + trimWidth, trimY + trimHeight + gap, trimX + trimWidth, trimY + trimHeight + gap + mark);
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
  const ink = [33, 26, 56];
  const coral = [247, 121, 93];
  doc.setFillColor(252, 249, 246);
  doc.rect(0, 0, 210, 297, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...ink);
  doc.text(`${batch.brand_name || "Cardence"} activation guide`, 15, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(117, 109, 125);
  doc.text(`Instruction card ${pageNumber} of ${pageTotal}`, 195, 11, { align: "right" });
  doc.setDrawColor(...coral);
  doc.setLineWidth(.35);
  doc.line(15, 15, 195, 15);
  drawInstructionCard(doc, 15, 22, 180, 190, batch);

  doc.setFillColor(232, 239, 255);
  doc.setDrawColor(218, 226, 247);
  doc.roundedRect(15, 222, 180, 40, 5, 5, "FD");
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text("PACKING NOTE", 23, 233);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(88, 91, 119);
  doc.text("Include one guide with multi-card orders. Tape each private access-code label", 23, 243);
  doc.text("to its matching card, and keep codes off the public card artwork.", 23, 251);
  doc.setFontSize(5.6);
  doc.setTextColor(117, 109, 125);
  doc.text("Cardence cards use one permanent link for both NFC taps and QR scans.", 15, 278);
}

function drawInstructionCard(doc, x, y, width, height, batch) {
  const ink = [33, 26, 56];
  const coral = [247, 121, 93];
  const lime = [201, 255, 74];
  doc.setDrawColor(...coral);
  doc.setLineWidth(.65);
  doc.setLineDashPattern([1, 1], 0);
  doc.roundedRect(x, y, width, height, 5, 5, "S");
  doc.setLineDashPattern([], 0);
  doc.setFillColor(...ink);
  doc.roundedRect(x + 10, y + 10, 48, 16, 3, 3, "F");
  doc.setTextColor(255, 250, 245);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text("CARDENCE", x + 16, y + 20.5);
  doc.setTextColor(...ink);
  doc.setFontSize(14);
  doc.text("Activate your card", x + 68, y + 20.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(117, 109, 125);
  doc.text("Keep this guide with your card order", x + width - 10, y + 20.5, { align: "right" });
  doc.setDrawColor(225, 219, 227);
  doc.setLineWidth(.3);
  doc.line(x + 10, y + 34, x + width - 10, y + 34);

  doc.setFillColor(250, 247, 244);
  doc.setDrawColor(238, 231, 227);
  doc.roundedRect(x + 10, y + 44, 101, 108, 4, 4, "FD");
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Five quick steps", x + 19, y + 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const steps = ["Scan the QR code or tap the card.", "Create an account and confirm your email.", "Log in, then choose Add a card.", "Enter the private access code on the label.", "Save your profile or choose another link."];
  steps.forEach((step, index) => {
    const stepY = y + 70 + index * 15;
    doc.setFillColor(...coral);
    doc.circle(x + 22, stepY - 2, 4.4, "F");
    doc.setTextColor(255, 250, 245);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(String(index + 1), x + 22, stepY, { align: "center" });
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.text(step, x + 31, stepY);
  });

  doc.setFillColor(242, 240, 250);
  doc.setDrawColor(225, 219, 227);
  doc.roundedRect(x + 119, y + 44, 51, 108, 4, 4, "FD");
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("Tap or scan", x + 144.5, y + 56, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.setTextColor(117, 109, 125);
  doc.text("Where to hold your phone", x + 144.5, y + 63, { align: "center" });

  const placementGuides = [
    { title: "iPhone", text: "Unlock it, then hold the top edge against the card." },
    { title: "Android", text: "Turn NFC on, then hold the upper back against the card." },
  ];
  placementGuides.forEach((guide, index) => {
    const guideY = y + 70 + index * 31;
    doc.setFillColor(255, 252, 249);
    doc.setDrawColor(225, 219, 227);
    doc.roundedRect(x + 124, guideY, 41, 26, 3, 3, "FD");
    doc.setFillColor(...coral);
    doc.circle(x + 130, guideY + 7, 2.2, "F");
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.text(guide.title, x + 135, guideY + 8.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(88, 81, 103);
    doc.text(doc.splitTextToSize(guide.text, 33), x + 128, guideY + 15, { lineHeightFactor: 1.25 });
  });
  doc.setFontSize(5.1);
  doc.setTextColor(117, 109, 125);
  doc.text("If tapping fails, scan the QR code.", x + 144.5, y + 142, { align: "center" });

  doc.setFillColor(...ink);
  doc.roundedRect(x + 10, y + 162, width - 20, 18, 4, 4, "F");
  doc.setTextColor(...lime);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.text("YOUR ACCESS CODE", x + 19, y + 173);
  doc.setTextColor(255, 250, 245);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.text("Use the removable label in your pack after email confirmation.", x + 76, y + 173);
  doc.setFontSize(5.6);
  doc.setTextColor(117, 109, 125);
  doc.text("Keep each code private and tape it to the matching card.", x + 10, y + 186);
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
  const instructions = Array.from({ length: copies }, (_, index) => `<section class="instruction-page"><div class="guide-meta"><strong>${escapeHtml(batch.brand_name || "Cardence")} activation guide</strong><span>Instruction card ${index + 1} of ${copies}</span></div><article class="instruction"><header><b>CARDENCE</b><div><strong>Activate your card</strong><small>Keep this guide with the order</small></div></header><div class="guide-grid"><div class="steps"><h2>Five quick steps</h2><ol><li>Scan the QR code or tap the card.</li><li>Create an account and confirm your email.</li><li>Log in, then choose Add a card.</li><li>Enter the private access code on the label.</li><li>Save your profile or choose another link.</li></ol></div><div class="sensor-panel"><h2>Tap or scan</h2><p>Where to hold your phone</p><div class="placement-copy"><div><strong>iPhone</strong><span>Unlock it, then hold the top edge against the card.</span></div><div><strong>Android</strong><span>Turn NFC on, then hold the upper back against the card.</span></div></div><em>If tapping fails, scan the QR code.</em></div></div><div class="access"><strong>YOUR ACCESS CODE</strong><span>Use the removable label after email confirmation.</span></div><footer>Keep each code private and tape it to the matching card.</footer></article><div class="packing"><strong>PACKING NOTE</strong><span>Include one guide with multi-card orders. Tape each private access-code label to its matching card.</span></div></section>`).join("");
  popup.document.write(`<!doctype html><title>Cardence activation pack</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#fcf9f6;font-family:Arial,sans-serif;color:#211a38}.instruction-page{width:210mm;min-height:297mm;padding:11mm 15mm 9mm;page-break-after:always}.guide-meta{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f7795d;padding-bottom:4mm;font-size:9px}.guide-meta span{font-size:7px;color:#756d7d}.instruction{height:190mm;margin-top:7mm;padding:10mm;border:1px dashed #f7795d;border-radius:5mm;background:#fffaf5}.instruction header{display:flex;align-items:center;gap:7mm;border-bottom:1px solid #e1dbe3;padding-bottom:7mm}.instruction header b{padding:5mm 7mm;color:#fff;background:#211a38;border-radius:3mm;font-size:11px}.instruction header strong{font-size:19px;display:block}.instruction header small{font-size:8px;color:#756d7d;display:block;margin-top:1.5mm}.guide-grid{display:grid;grid-template-columns:1fr 51mm;gap:8mm;margin-top:9mm}.steps,.sensor-panel{border:1px solid #eee7e3;border-radius:4mm;padding:7mm;background:#faf7f4}.steps h2,.sensor-panel h2{font-size:11px;margin:0 0 6mm}.steps ol{padding-left:7mm;margin:0;font-size:10px;line-height:2}.sensor-panel{text-align:center;background:#f2f0fa}.sensor-panel p{font-size:8px;color:#756d7d;margin:0 0 5mm}.placement-copy{display:grid;gap:4mm;text-align:left}.placement-copy div{padding:4mm;border:1px solid #e1dbe3;border-radius:3mm;background:#fffaf9}.placement-copy strong{display:block;font-size:9px;margin-bottom:1.5mm}.placement-copy span{display:block;color:#585167;font-size:7.5px;line-height:1.45}.sensor-panel em{display:block;color:#756d7d;font-size:7px;margin-top:5mm}.access{display:flex;align-items:center;gap:7mm;padding:6mm 7mm;background:#211a38;border-radius:4mm;margin-top:9mm;color:#fffaf5}.access strong{color:#c9ff4a;font-size:9px}.access span{font-size:8px}.instruction footer{font-size:8px;color:#756d7d;margin-top:4mm}.packing{display:flex;gap:6mm;align-items:center;background:#e8efff;border:1px solid #dae2f7;border-radius:4mm;padding:6mm;margin-top:9mm;font-size:8px}.packing strong{font-size:9px}.labels{padding:10mm 15mm;display:grid;grid-template-columns:repeat(3,60mm);grid-auto-rows:20mm;gap:3mm 5mm}.label{position:relative;border:1px dashed #f7795d;padding:3mm;background:#fffaf5}.label strong{font-size:8px;display:block}.label b{font:700 14px monospace;display:block;margin-top:2mm}.label small{font-size:6px;position:absolute;right:3mm;top:3mm;color:#756d7d}</style><h1 style="font-size:12px;padding:8mm 15mm 0">${escapeHtml(batch.brand_name || "Cardence")} activation pack</h1>${instructions}<section class="labels">${qrRows}</section><script>window.onload=()=>window.print()<\/script>`);
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

function goToShop() {
  showLanding(true);
  window.setTimeout(() => $("shop").scrollIntoView({ behavior: "smooth", block: "start" }), 40);
}

function openStore(productType, initialQuantity = 1) {
  const product = STORE_PRODUCTS[productType] || STORE_PRODUCTS.original;
  state.storeProduct = STORE_PRODUCTS[productType] ? productType : "original";
  state.shippingQuote = null;
  if (state.storeLogoUrl) URL.revokeObjectURL(state.storeLogoUrl);
  state.storeLogoUrl = "";
  els.storeOrderForm.reset();
  els.storeQuantity.min = String(product.minimum);
  els.storeQuantity.value = String(Math.max(product.minimum, Math.min(100, initialQuantity)));
  els.storeProductName.textContent = product.name;
  els.storeProductText.textContent = product.description;
  els.storeTypeLabel.value = product.typeLabel;
  els.customDesignFields.classList.toggle("hidden", state.storeProduct !== "custom");
  els.storeLogo.required = state.storeProduct === "custom";
  els.storeBrandName.required = state.storeProduct === "custom";
  if (state.user?.email) els.storeOrderForm.elements.email.value = state.user.email;
  els.storeSkin.value = state.storeProduct === "custom" ? "porcelain" : "aubergine";
  els.storeOrderForm.elements.deliveryMethod.value = "courier";
  updateDeliveryFields();
  invalidateShippingQuote();
  updateStorePreview();
  setMessage(els.storeMessage, "");
  els.storeModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  window.setTimeout(() => els.storeQuantity.focus(), 30);
}

function closeStore() {
  els.storeModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function handleStoreInput(event) {
  if (event.target?.name === "deliveryMethod") updateDeliveryFields();
  updateStorePreview();
  invalidateShippingQuote();
}

function updateDeliveryFields() {
  const pickup = els.storeOrderForm.elements.deliveryMethod.value === "pickup";
  els.courierFields.classList.toggle("hidden", pickup);
  els.pickupFields.classList.toggle("hidden", !pickup);
  ["streetAddress", "localArea", "city", "province", "postalCode"].forEach((name) => {
    els.storeOrderForm.elements[name].required = !pickup;
  });
  els.storeOrderForm.elements.pickupCode.required = pickup;
}

async function updateStoreLogoPreview() {
  if (state.storeLogoUrl) URL.revokeObjectURL(state.storeLogoUrl);
  const file = els.storeLogo.files?.[0];
  state.storeLogoUrl = "";
  if (file) {
    try {
      state.storeLogoUrl = await trimmedLogoPreview(file);
    } catch {
      state.storeLogoUrl = URL.createObjectURL(file);
    }
  }
  updateStorePreview();
  invalidateShippingQuote();
}

async function trimmedLogoPreview(file) {
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = reject;
      candidate.src = source;
    });
    const maximum = 1000;
    const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
    const samples = corners.map(([x, y]) => {
      const offset = (y * width + x) * 4;
      return [pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3]];
    });
    const background = samples.reduce((total, sample) => total.map((value, index) => value + sample[index]), [0, 0, 0, 0]).map((value) => value / samples.length);
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const alpha = pixels[offset + 3];
        if (alpha < 18) continue;
        const difference = Math.abs(pixels[offset] - background[0]) + Math.abs(pixels[offset + 1] - background[1]) + Math.abs(pixels[offset + 2] - background[2]) + Math.abs(alpha - background[3]);
        if (background[3] > 220 && difference < 52) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < left || bottom < top) return canvas.toDataURL("image/png");
    const pad = Math.max(4, Math.round(Math.max(right - left, bottom - top) * 0.06));
    left = Math.max(0, left - pad);
    top = Math.max(0, top - pad);
    right = Math.min(width - 1, right + pad);
    bottom = Math.min(height - 1, bottom + pad);
    const output = document.createElement("canvas");
    output.width = right - left + 1;
    output.height = bottom - top + 1;
    output.getContext("2d").drawImage(canvas, left, top, output.width, output.height, 0, 0, output.width, output.height);
    return output.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(source);
  }
}

function updateStorePreview() {
  const skin = els.storeSkin.value || "aubergine";
  els.storeCardPreview.className = `order-mini-card skin-${skin}`;
  const custom = state.storeProduct === "custom";
  els.storePreviewLogoStage.classList.toggle("hidden", !custom);
  els.storePreviewLogo.classList.toggle("hidden", !custom || !state.storeLogoUrl);
  els.storePreviewLogoPlaceholder.classList.toggle("hidden", !custom || Boolean(state.storeLogoUrl));
  if (custom && state.storeLogoUrl) els.storePreviewLogo.src = state.storeLogoUrl;
  els.storePreviewBrand.textContent = "C";
  els.storePreviewName.textContent = custom ? (els.storeBrandName.value.trim() || "YOUR BUSINESS") : "CARDENCE";
  els.storePreviewTagline.textContent = custom
    ? (els.storeTagline.value.trim() || "YOUR BRAND. ONE TAP.")
    : "YOUR DETAILS. ONE TAP.";
}

function invalidateShippingQuote() {
  state.shippingQuote = null;
  els.shippingResult.classList.add("hidden");
  els.placeOrderBtn.disabled = true;
  els.storeDeliveryTotal.textContent = els.storeOrderForm.elements.deliveryMethod.value === "pickup" ? "Verify code" : "Calculate quote";
  updateStoreTotals();
}

function storeUnitPrice(productType, quantity) {
  const branded = productType === "custom";
  if (quantity >= 50) return branded ? 11000 : 7500;
  if (quantity >= 25) return branded ? 12500 : 8500;
  if (quantity >= 10) return branded ? 13500 : 9000;
  if (productType === "bulk") return 9000;
  return branded ? 15000 : 10000;
}

function updateStoreTotals() {
  const product = STORE_PRODUCTS[state.storeProduct] || STORE_PRODUCTS.original;
  const quantity = Math.min(100, Math.max(product.minimum, Number(els.storeQuantity.value || product.minimum)));
  const merchandise = storeUnitPrice(state.storeProduct, quantity) * quantity;
  const baseUnit = state.storeProduct === "custom" ? 15000 : 10000;
  const saving = Math.max(0, (baseUnit - storeUnitPrice(state.storeProduct, quantity)) * quantity);
  const delivery = Number(state.shippingQuote?.amountCents || 0);
  els.storeMerchandiseTotal.textContent = formatMoney(merchandise);
  els.storeBulkDiscount.classList.toggle("hidden", saving <= 0);
  els.storeBulkDiscount.querySelector("b").textContent = saving > 0 ? `-${formatMoney(saving)}` : "Applied";
  if (state.shippingQuote) els.storeDeliveryTotal.textContent = delivery ? formatMoney(delivery) : "Free handover";
  els.storeGrandTotal.textContent = formatMoney(merchandise + delivery);
}

function storePayload(action) {
  const fields = els.storeOrderForm.elements;
  const product = STORE_PRODUCTS[state.storeProduct] || STORE_PRODUCTS.original;
  const quantity = Math.min(100, Math.max(product.minimum, Number(fields.quantity.value || product.minimum)));
  return {
    action,
    productType: state.storeProduct,
    quantity,
    deliveryMethod: fields.deliveryMethod.value,
    pickupCode: fields.pickupCode.value.trim(),
    cardSkin: fields.cardSkin.value,
    brandName: fields.brandName.value.trim(),
    tagline: fields.tagline.value.trim(),
    customer: {
      fullName: fields.fullName.value.trim(), email: fields.email.value.trim(),
      phone: fields.phone.value.trim(), company: fields.company.value.trim(),
    },
    address: {
      streetAddress: fields.streetAddress.value.trim(), localArea: fields.localArea.value.trim(),
      city: fields.city.value.trim(), province: fields.province.value, postalCode: fields.postalCode.value.trim(), country: "ZA",
    },
    notes: fields.notes.value.trim(),
  };
}

async function quoteStoreDelivery() {
  if (!els.storeOrderForm.reportValidity()) return;
  const product = STORE_PRODUCTS[state.storeProduct];
  if (Number(els.storeQuantity.value) < product.minimum) return setMessage(els.storeMessage, `The minimum for ${product.name} is ${product.minimum} cards.`, "error");
  if (state.storeProduct === "custom" && !els.storeLogo.files?.[0]) return setMessage(els.storeMessage, "Upload your logo to preview and order a custom card.", "error");
  els.quoteDeliveryBtn.disabled = true;
  els.placeOrderBtn.disabled = true;
  const pickup = els.storeOrderForm.elements.deliveryMethod.value === "pickup";
  setMessage(els.storeMessage, pickup ? "Checking your handover code…" : "Getting a live Bob Go delivery price…");
  try {
    const { data, error } = await sb.functions.invoke("tapnation-store-order", { body: storePayload("quote") });
    if (error) throw await unwrapFunctionError(error);
    if (!data?.quote || !Number.isInteger(Number(data.quote.amountCents))) throw new Error("No delivery option is available.");
    state.shippingQuote = data.quote;
    els.shippingResult.innerHTML = `<span><b>${escapeHtml(data.quote.courierName || "Delivery")}</b><small>${escapeHtml(data.quote.serviceName || "Confirmed")}</small></span><strong>${Number(data.quote.amountCents) ? formatMoney(data.quote.amountCents) : "FREE"}</strong>`;
    els.shippingResult.classList.remove("hidden");
    els.placeOrderBtn.disabled = false;
    setMessage(els.storeMessage, pickup ? "Handover unlocked. Continue to Yoco while the code is valid." : "Live delivery confirmed. Continue to secure payment.", "success");
    updateStoreTotals();
  } catch (error) {
    setMessage(els.storeMessage, friendlyError(error), "error");
  } finally {
    els.quoteDeliveryBtn.disabled = false;
  }
}

async function submitStoreOrder(event) {
  event.preventDefault();
  if (!state.shippingQuote || !els.storeOrderForm.reportValidity()) return;
  const logo = els.storeLogo.files?.[0] || null;
  if (state.storeProduct === "custom" && !logo) return setMessage(els.storeMessage, "Upload the business logo for this custom card.", "error");
  if (logo && logo.size > 3 * 1024 * 1024) return setMessage(els.storeMessage, "The logo file must be 3 MB or smaller.", "error");
  els.placeOrderBtn.disabled = true;
  els.quoteDeliveryBtn.disabled = true;
  setMessage(els.storeMessage, "Creating your Cardence order and opening Yoco…");
  try {
    const payload = storePayload("checkout");
    if (logo) payload.logo = await filePayload(logo);
    const { data, error } = await sb.functions.invoke("tapnation-store-order", { body: payload });
    if (error) throw await unwrapFunctionError(error);
    const checkoutUrl = new URL(String(data?.authorizationUrl || ""));
    if (checkoutUrl.protocol !== "https:" || !(checkoutUrl.hostname === "yoco.com" || checkoutUrl.hostname.endsWith(".yoco.com"))) throw new Error("Yoco returned an invalid checkout address.");
    window.location.assign(checkoutUrl.toString());
  } catch (error) {
    setMessage(els.storeMessage, friendlyError(error), "error");
    els.placeOrderBtn.disabled = false;
    els.quoteDeliveryBtn.disabled = false;
  }
}

async function filePayload(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("The logo file could not be read."));
    reader.readAsDataURL(file);
  });
  return { name: file.name, type: file.type, dataUrl };
}

function showPaymentReturn(params) {
  const status = params.get("payment");
  const reference = params.get("reference");
  if (!status || !reference) return;
  if (status === "success") showToast(`Yoco received payment for ${reference}. The signed confirmation will update your order shortly.`);
  else if (status === "cancelled") showToast(`Payment for ${reference} was cancelled. No confirmed sale was recorded.`);
  else showToast(`Payment for ${reference} was not completed. You can place the order again.`);
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("payment");
  cleanUrl.searchParams.delete("reference");
  window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
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
  const withoutProtocol = raw.replace(/^\/\//, "").replace(/^www\./i, "");
  if (/^(?:instagram\.com|tiktok\.com)\//i.test(withoutProtocol)) return assertHttpUrl(`https://${withoutProtocol}`);
  const handle = raw.replace(/^@/, "").replace(/^www\./i, "").replace(/\/+$/, "");
  if (!handle) return "";
  if ((network === "instagram" || network === "tiktok") && !/^[a-z0-9._]{1,80}$/i.test(handle)) {
    throw new Error(`Enter an ${network === "instagram" ? "Instagram" : "TikTok"} @username or paste its profile share link.`);
  }
  if (network === "instagram") return assertHttpUrl(`https://www.instagram.com/${encodeURIComponent(handle)}/`);
  if (network === "tiktok") return assertHttpUrl(`https://www.tiktok.com/@${encodeURIComponent(handle)}`);
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
  if (/admin_create_card_batch|admin_get_batches|admin_get_batch_cards|admin_update_card_production_status|card_batches|production_status/i.test(text)) return "The latest Cardence admin batch migration still needs to be applied.";
  if (/update_contact_profile|destination_type_check/i.test(text)) return "The Cardence contact-profile database upgrade still needs to be applied.";
  if (/function.*does not exist|schema cache/i.test(text)) return "The latest Cardence database migration still needs to be applied.";
  if (/invalid login credentials/i.test(text)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(text)) return "Confirm your email before logging in.";
  if (/user already registered/i.test(text)) return "That email already has an account.";
  if (/failed to fetch|network/i.test(text)) return "Could not reach Cardence. Check your connection and try again.";
  return text.replace(/^Error:\s*/i, "");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-ZA").format(Number(value || 0));
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(Number(cents || 0) / 100);
}

function titleCase(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function productName(value) {
  return STORE_PRODUCTS[value]?.name || "Cardence card";
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function unwrapFunctionError(error) {
  const context = error?.context;
  if (context && typeof context.clone === "function") {
    try {
      const payload = await context.clone().json();
      if (payload?.error || payload?.message) return new Error(payload.error || payload.message);
    } catch {}
  }
  return error;
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
