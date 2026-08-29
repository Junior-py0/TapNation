// TapNation public Supabase configuration.
// The publishable/anon key is designed for browser use. Never add a service_role key here.
const SUPABASE_URL = "https://dqyqkeqdvsidmffaanys.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iiFisqh9j9h4TJuvtcWEnw_976b5T6U";

const configured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_ANON_KEY.includes("PASTE_");

const sb = configured && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORE_PRODUCTS = {
  original: { name: "TapNation Original", typeLabel: "Original", description: "A ready-to-tap card with your own changeable destination.", minimum: 1 },
  custom: { name: "Custom Branded", typeLabel: "Custom branded", description: "Your logo, your colours and a design proof before we print.", minimum: 1 },
  bulk: { name: "Teams & Bulk", typeLabel: "Bulk / team", description: "Volume-priced cards for staff, venues, events and campaigns.", minimum: 10 },
};

const DESTINATIONS = {
  url: {
    name: "Any URL",
    icon: "↗",
    label: "Destination URL",
    tag: "FULL LINK",
    placeholder: "https://yourwebsite.com",
    hint: "Paste the complete address from your browser.",
    title: "How to get the right link",
    steps: "Open the page you want to share, copy the full address from your browser, then paste it above.",
    example: "https://yourwebsite.com",
  },
  instagram: {
    name: "Instagram",
    icon: "◎",
    label: "Instagram profile or post",
    tag: "LINK OR @HANDLE",
    placeholder: "@yourname or https://instagram.com/yourname",
    hint: "Enter your @handle, profile link, reel or post link.",
    title: "Copy an Instagram link",
    steps: "In Instagram, open your profile or post, tap Share, then tap Copy link. You can also enter your @username.",
    example: "https://www.instagram.com/yourname/",
  },
  tiktok: {
    name: "TikTok",
    icon: "♪",
    label: "TikTok profile or video",
    tag: "LINK OR @HANDLE",
    placeholder: "@yourname or a TikTok video link",
    hint: "Enter your @handle, profile link or video link.",
    title: "Copy a TikTok link",
    steps: "Open your profile or video in TikTok, tap Share, then Copy link. A profile @username also works.",
    example: "https://www.tiktok.com/@yourname",
  },
  youtube: {
    name: "YouTube",
    icon: "▶",
    label: "YouTube video or channel URL",
    tag: "YOUTUBE LINK",
    placeholder: "https://youtu.be/VIDEO_ID",
    hint: "Videos, Shorts, playlists and channel links are supported.",
    title: "Copy a YouTube video link",
    steps: "Open the video, Short, playlist or channel, choose Share, then Copy link. Paste the complete youtu.be or youtube.com link here.",
    example: "https://youtu.be/dQw4w9WgXcQ",
  },
  whatsapp: {
    name: "WhatsApp",
    icon: "◉",
    label: "WhatsApp number",
    tag: "PHONE NUMBER",
    placeholder: "072 123 4567",
    hint: "South African numbers are automatically converted to +27 format.",
    title: "Use the number on WhatsApp",
    steps: "Enter the mobile number customers should message. Include the country code for numbers outside South Africa.",
    example: "+27 72 123 4567",
  },
  google_review: {
    name: "Google Review",
    icon: "★",
    label: "Google review link",
    tag: "REVIEW LINK",
    placeholder: "https://g.page/r/.../review",
    hint: "Use the direct review form link, not only your business website.",
    title: "Get your Google review link",
    steps: "Open your Google Business Profile, choose Ask for reviews, and copy the review link. Paste that exact link here.",
    example: "https://g.page/r/YOUR_PLACE_ID/review",
  },
  linkedin: {
    name: "LinkedIn",
    icon: "in",
    label: "LinkedIn profile or company",
    tag: "LINK OR HANDLE",
    placeholder: "https://linkedin.com/in/yourname",
    hint: "Personal profiles, company pages and posts are supported.",
    title: "Copy a LinkedIn link",
    steps: "Open your profile or company page, choose More or Share, then Copy link. Paste the full linkedin.com address.",
    example: "https://www.linkedin.com/in/yourname/",
  },
  facebook: {
    name: "Facebook",
    icon: "f",
    label: "Facebook profile or page",
    tag: "LINK OR USERNAME",
    placeholder: "https://facebook.com/yourpage",
    hint: "Profiles, business pages, events and posts are supported.",
    title: "Copy a Facebook link",
    steps: "Open the profile, page, event or post, tap Share, then Copy link. Paste the full facebook.com address.",
    example: "https://www.facebook.com/yourpage",
  },
  email: {
    name: "Email",
    icon: "@",
    label: "Email address",
    tag: "EMAIL",
    placeholder: "hello@yourbusiness.co.za",
    hint: "A tap opens a new message in the visitor’s email app.",
    title: "Choose the right inbox",
    steps: "Enter the inbox that should receive new enquiries. Use a monitored address such as sales@ or hello@.",
    example: "hello@yourbusiness.co.za",
  },
  phone: {
    name: "Phone",
    icon: "☎",
    label: "Phone number",
    tag: "PHONE NUMBER",
    placeholder: "+27 11 123 4567",
    hint: "A tap opens the phone dialler with this number ready.",
    title: "Use a callable number",
    steps: "Enter a mobile or landline number. Include the country code when the card may be used internationally.",
    example: "+27 11 123 4567",
  },
  maps: {
    name: "Maps",
    icon: "⌖",
    label: "Google Maps location URL",
    tag: "MAPS LINK",
    placeholder: "https://maps.app.goo.gl/...",
    hint: "Send visitors straight to your pinned location or directions.",
    title: "Copy a location link",
    steps: "Open your place in Google Maps, tap Share, then Copy link. A maps.app.goo.gl or google.com/maps link works.",
    example: "https://maps.app.goo.gl/YOUR_LOCATION",
  },
};

const state = {
  authMode: "signup",
  user: null,
  cards: [],
  currentCard: null,
  destinationType: "url",
  cardTheme: "midnight",
  plan: "starter",
  isAdmin: false,
  inventory: [],
  adminOverview: null,
  storeProduct: "original",
  shippingQuote: null,
  requestedAdmin: false,
  preview: false,
  paymentReference: "",
};

const els = {
  app: $("app"), redirectScreen: $("redirectScreen"), redirectTitle: $("redirectTitle"), redirectText: $("redirectText"), manualOpen: $("manualOpen"),
  landingPage: $("landingPage"), authSection: $("authSection"), dashboard: $("dashboard"), editorSection: $("editorSection"), adminPage: $("adminPage"), landingNav: $("landingNav"), headerCtas: $("headerCtas"), accountActions: $("accountActions"),
  homeBtn: $("homeBtn"), backHomeBtn: $("backHomeBtn"), showSignupBtn: $("showSignupBtn"), showLoginBtn: $("showLoginBtn"), heroStartBtn: $("heroStartBtn"), closingStartBtn: $("closingStartBtn"), businessCtaBtn: $("businessCtaBtn"), logoutBtn: $("logoutBtn"), shopNavBtn: $("shopNavBtn"), dashboardShopBtn: $("dashboardShopBtn"), accountBtn: $("accountBtn"), adminNavBtn: $("adminNavBtn"), footerAccountBtn: $("footerAccountBtn"),
  planBadge: $("planBadge"), footerYear: $("footerYear"), heroDestination: $("heroDestination"),
  authTitle: $("authTitle"), authSubtitle: $("authSubtitle"), authForm: $("authForm"), emailInput: $("emailInput"), passwordInput: $("passwordInput"), authSubmitBtn: $("authSubmitBtn"), switchAuthBtn: $("switchAuthBtn"), authMessage: $("authMessage"),
  userEmail: $("userEmail"), dashboardTapTotal: $("dashboardTapTotal"), dashboardCardTotal: $("dashboardCardTotal"), dashboardPlan: $("dashboardPlan"), openClaimBtn: $("openClaimBtn"), emptyClaimBtn: $("emptyClaimBtn"), claimBox: $("claimBox"), claimForm: $("claimForm"), claimCodeInput: $("claimCodeInput"), claimMessage: $("claimMessage"), emptyCards: $("emptyCards"), cardsGrid: $("cardsGrid"), cardCountLabel: $("cardCountLabel"),
  analyticsRange: $("analyticsRange"), analyticsLocked: $("analyticsLocked"), analyticsContent: $("analyticsContent"), analyticsMessage: $("analyticsMessage"), periodTapTotal: $("periodTapTotal"), bestTapDay: $("bestTapDay"), topTapCard: $("topTapCard"), analyticsChart: $("analyticsChart"), cardRanking: $("cardRanking"),
  adminInventory: $("adminInventory"), inventoryForm: $("inventoryForm"), inventoryQuantity: $("inventoryQuantity"), inventoryPrefix: $("inventoryPrefix"), generateCardsBtn: $("generateCardsBtn"), inventoryMessage: $("inventoryMessage"), inventoryResults: $("inventoryResults"), inventoryTableBody: $("inventoryTableBody"), downloadInventoryBtn: $("downloadInventoryBtn"),
  adminBackBtn: $("adminBackBtn"), refreshAdminBtn: $("refreshAdminBtn"), adminTotalCards: $("adminTotalCards"), adminLinkedCards: $("adminLinkedCards"), adminActivatedCards: $("adminActivatedCards"), adminUnclaimedCards: $("adminUnclaimedCards"), adminCardsLabel: $("adminCardsLabel"), adminCardsBody: $("adminCardsBody"), adminOrdersLabel: $("adminOrdersLabel"), adminOrdersBody: $("adminOrdersBody"), adminMessage: $("adminMessage"),
  backToCardsBtn: $("backToCardsBtn"), cardForm: $("cardForm"), cardNameInput: $("cardNameInput"), destinationInput: $("destinationInput"), destinationLabel: $("destinationLabel"), destinationTag: $("destinationTag"), destinationHint: $("destinationHint"), howToTitle: $("howToTitle"), howToSteps: $("howToSteps"), destinationExample: $("destinationExample"), saveMessage: $("saveMessage"), saveStatusBadge: $("saveStatusBadge"), editorCardTitle: $("editorCardTitle"), physicalCardPreview: $("physicalCardPreview"), previewName: $("previewName"), previewDestination: $("previewDestination"), nfcUrlText: $("nfcUrlText"), copyNfcBtn: $("copyNfcBtn"), testNfcBtn: $("testNfcBtn"), tapCount: $("tapCount"),
  upgradeModal: $("upgradeModal"), closeUpgradeBtn: $("closeUpgradeBtn"), monthlyUpgradeBtn: $("monthlyUpgradeBtn"), annualUpgradeBtn: $("annualUpgradeBtn"), upgradeMessage: $("upgradeMessage"), toast: $("toast"),
  storeModal: $("storeModal"), closeStoreBtn: $("closeStoreBtn"), storeFormView: $("storeFormView"), storeSuccess: $("storeSuccess"), storeDoneBtn: $("storeDoneBtn"), storeOrderForm: $("storeOrderForm"), storeProductName: $("storeProductName"), storeProductText: $("storeProductText"), storeTypeLabel: $("storeTypeLabel"), storeQuantity: $("storeQuantity"), logoField: $("logoField"), storeLogo: $("storeLogo"), storeMerchandiseTotal: $("storeMerchandiseTotal"), storeDeliveryTotal: $("storeDeliveryTotal"), storeGrandTotal: $("storeGrandTotal"), quoteDeliveryBtn: $("quoteDeliveryBtn"), shippingResult: $("shippingResult"), placeOrderBtn: $("placeOrderBtn"), storeMessage: $("storeMessage"), storeOrderReference: $("storeOrderReference"),
};

document.addEventListener("DOMContentLoaded", boot);

async function boot() {
  wireEvents();
  els.footerYear.textContent = new Date().getFullYear();
  cycleHeroDestination();
  state.requestedAdmin = /^\/admin\/?$/i.test(window.location.pathname);

  const pageParams = new URLSearchParams(window.location.search);
  const cardSlug = pageParams.get("c");
  if (pageParams.get("payment") === "business") {
    state.paymentReference = pageParams.get("reference") || "";
  }
  if (cardSlug) {
    await resolveAndRedirect(cardSlug);
    return;
  }

  const previewMode = pageParams.get("preview");
  if (["localhost", "127.0.0.1"].includes(window.location.hostname) && previewMode === "store") {
    showLanding();
    return;
  }
  if (["localhost", "127.0.0.1"].includes(window.location.hostname) && previewMode === "dashboard") {
    showPreviewDashboard();
    return;
  }
  if (["localhost", "127.0.0.1"].includes(window.location.hostname) && previewMode === "admin") {
    showPreviewAdmin();
    return;
  }

  if (!configured) {
    showLanding();
    showToast("Add your Supabase URL and publishable key in app.js.");
    return;
  }

  const { data, error } = await sb.auth.getSession();
  if (error) showToast(friendlyError(error));
  if (data?.session?.user) {
    await showDashboard(data.session.user, false);
    if (state.requestedAdmin) await showAdminPage(false);
    if (state.paymentReference) await verifyBusinessReturn();
  }
  else if (state.requestedAdmin) openAuth("login");
  else showLanding();

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      state.user = null;
      state.currentCard = null;
      showLanding();
    }
  });
}

function wireEvents() {
  [els.showSignupBtn, els.heroStartBtn, els.closingStartBtn, ...$$(".pricingStarterBtn")].forEach((button) => button?.addEventListener("click", () => openAuth("signup")));
  els.showLoginBtn.addEventListener("click", () => openAuth("login"));
  els.homeBtn.addEventListener("click", () => state.user ? showDashboard(state.user) : showLanding(true));
  els.backHomeBtn.addEventListener("click", () => showLanding(true));
  els.shopNavBtn.addEventListener("click", openShop);
  els.dashboardShopBtn.addEventListener("click", openShop);
  els.accountBtn.addEventListener("click", () => state.user && showDashboard(state.user));
  els.footerAccountBtn.addEventListener("click", () => state.user ? showDashboard(state.user) : openAuth("login"));
  els.adminNavBtn.addEventListener("click", () => showAdminPage());
  els.adminBackBtn.addEventListener("click", () => state.user && showDashboard(state.user));
  els.refreshAdminBtn.addEventListener("click", loadAdminOverview);
  els.switchAuthBtn.addEventListener("click", () => openAuth(state.authMode === "signup" ? "login" : "signup"));
  els.authForm.addEventListener("submit", handleAuth);
  els.logoutBtn.addEventListener("click", logout);

  els.openClaimBtn.addEventListener("click", toggleClaimBox);
  els.emptyClaimBtn.addEventListener("click", openClaimBox);
  els.claimForm.addEventListener("submit", claimCard);
  els.backToCardsBtn.addEventListener("click", () => state.user && showDashboard(state.user));

  $$(".type-btn").forEach((button) => button.addEventListener("click", () => setDestinationType(button.dataset.type, false)));
  $$(".theme-btn").forEach((button) => button.addEventListener("click", () => setCardTheme(button.dataset.theme)));
  els.cardForm.addEventListener("submit", saveCard);
  els.cardForm.addEventListener("input", markEditorDirty);
  els.copyNfcBtn.addEventListener("click", async () => {
    const url = els.nfcUrlText.textContent;
    if (!url || url === "—") return;
    await copyText(url);
    showToast("Permanent NFC link copied.");
  });

  els.analyticsRange.addEventListener("change", loadAnalytics);
  els.inventoryForm.addEventListener("submit", generateInventory);
  els.downloadInventoryBtn.addEventListener("click", downloadInventoryCsv);

  [els.businessCtaBtn, ...$$(".businessUpgradeBtn")].forEach((button) => button?.addEventListener("click", openUpgradeModal));
  els.closeUpgradeBtn.addEventListener("click", closeUpgradeModal);
  els.upgradeModal.addEventListener("click", (event) => { if (event.target === els.upgradeModal) closeUpgradeModal(); });
  els.monthlyUpgradeBtn.addEventListener("click", () => startBusinessCheckout("monthly"));
  els.annualUpgradeBtn.addEventListener("click", () => startBusinessCheckout("annual"));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeUpgradeModal(); closeStore(); } });
  $$(".shopBuyBtn").forEach((button) => button.addEventListener("click", () => openStore(button.dataset.product)));
  els.closeStoreBtn.addEventListener("click", closeStore);
  els.storeDoneBtn.addEventListener("click", closeStore);
  els.storeModal.addEventListener("click", (event) => { if (event.target === els.storeModal) closeStore(); });
  els.storeQuantity.addEventListener("input", invalidateShippingQuote);
  els.storeOrderForm.addEventListener("input", (event) => { if (event.target.name && event.target.name !== "notes") invalidateShippingQuote(); });
  els.quoteDeliveryBtn.addEventListener("click", quoteStoreDelivery);
  els.storeOrderForm.addEventListener("submit", submitStoreOrder);
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
  showSection(els.landingPage);
  updateHeader(Boolean(state.user));
  if (updatePath) setAppPath("/");
}

function openShop() {
  showLanding(true);
  window.requestAnimationFrame(() => $("shop")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function openAuth(mode) {
  state.authMode = mode;
  showSection(els.authSection);
  updateHeader(false);
  els.landingNav.classList.add("hidden");
  els.headerCtas.classList.add("hidden");
  setMessage(els.authMessage, "");
  const signup = mode === "signup";
  els.authTitle.textContent = signup ? "Create your account" : "Welcome back";
  els.authSubtitle.textContent = signup ? "Set up your dashboard in under a minute." : "Log in to manage your TapNation cards.";
  els.authSubmitBtn.innerHTML = signup ? "Create account <span>↗</span>" : "Log in <span>↗</span>";
  els.switchAuthBtn.innerHTML = signup ? "Already have an account? <b>Log in</b>" : "New to TapNation? <b>Create an account</b>";
  setTimeout(() => els.emailInput.focus(), 50);
}

async function handleAuth(event) {
  event.preventDefault();
  if (!sb) return setMessage(els.authMessage, "Connect Supabase first.", "error");
  const email = els.emailInput.value.trim();
  const password = els.passwordInput.value;
  els.authSubmitBtn.disabled = true;
  setMessage(els.authMessage, "Working…");
  try {
    const result = state.authMode === "signup"
      ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: getBaseUrl() } })
      : await sb.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (state.authMode === "signup" && !result.data.session) {
      setMessage(els.authMessage, "Account created. Confirm the email we sent you, then log in.", "success");
    } else if (result.data.user) {
      await showDashboard(result.data.user, !state.requestedAdmin);
      if (state.requestedAdmin) await showAdminPage(false);
      if (state.paymentReference) await verifyBusinessReturn();
    }
  } catch (error) {
    setMessage(els.authMessage, friendlyError(error), "error");
  } finally {
    els.authSubmitBtn.disabled = false;
  }
}

async function logout() {
  if (sb) await sb.auth.signOut();
  state.user = null;
  state.cards = [];
  state.currentCard = null;
  state.plan = "starter";
  state.isAdmin = false;
  state.preview = false;
  state.requestedAdmin = false;
  showLanding(true);
}

async function showDashboard(user, updatePath = true) {
  if (state.preview) {
    showPreviewDashboard();
    return;
  }
  state.user = user;
  showSection(els.dashboard);
  updateHeader(true);
  els.userEmail.textContent = user.email || "";
  els.claimBox.classList.add("hidden");
  setMessage(els.claimMessage, "");
  await Promise.all([loadAccess(user), loadCards()]);
  if (state.plan === "business") await loadAnalytics();
  if (updatePath) {
    state.requestedAdmin = false;
    setAppPath("/");
  }
}

function showPreviewDashboard() {
  state.preview = true;
  state.user = { id: "local-preview", email: "owner@tapnation.co.za" };
  state.plan = "business";
  state.isAdmin = true;
  state.cards = [
    { id: "preview-1", slug: "A1B2C3D4E5", card_name: "Main networking card", destination_type: "linkedin", destination_url: "https://www.linkedin.com/in/yourname/", tap_count: 1284, card_theme: "midnight", created_at: new Date().toISOString() },
    { id: "preview-2", slug: "F6G7H8J9K0", card_name: "Reception reviews", destination_type: "google_review", destination_url: "https://g.page/r/example/review", tap_count: 482, card_theme: "citrus", created_at: new Date().toISOString() },
    { id: "preview-3", slug: "M1N2P3Q4R5", card_name: "YouTube launch", destination_type: "youtube", destination_url: "https://youtu.be/dQw4w9WgXcQ", tap_count: 391, card_theme: "cobalt", created_at: new Date().toISOString() },
  ];
  showSection(els.dashboard);
  updateHeader(true);
  els.userEmail.textContent = state.user.email;
  els.planBadge.textContent = "Business";
  els.dashboardPlan.textContent = "Business";
  els.analyticsLocked.classList.add("hidden");
  els.analyticsContent.classList.remove("hidden");
  els.analyticsRange.classList.remove("hidden");
  els.adminInventory.classList.remove("hidden");
  renderCards();
  const days = 30;
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return { date: date.toISOString().slice(0, 10), taps: [18, 25, 21, 34, 29, 42, 37][index % 7] + index };
  });
  renderAnalytics({ period_taps: daily.reduce((sum, day) => sum + day.taps, 0), daily, cards: [{ card_name: "Reception reviews", taps: 482 }, { card_name: "YouTube launch", taps: 391 }, { card_name: "Main networking card", taps: 274 }] });
}

function showPreviewAdmin() {
  state.preview = true;
  state.user = { id: "local-preview", email: "owner@tapnation.co.za" };
  state.isAdmin = true;
  state.adminOverview = {
    totals: { total_cards: 64, linked_cards: 31, activated_cards: 38, unclaimed_cards: 26, open_orders: 4 },
    cards: [
      { slug: "TN84A3PX10", card_name: "Launch Batch 01", owner_id: "preview-owner", destination_type: "whatsapp", destination_url: "https://wa.me/27721234567", tap_count: 84, created_at: new Date().toISOString() },
      { slug: "TN84A3PX11", card_name: "Launch Batch 02", owner_id: null, destination_type: "url", destination_url: null, tap_count: 0, created_at: new Date().toISOString() },
    ],
    orders: [
      { public_reference: "TN-20260829-A1B2C3", customer_name: "Naledi Mokoena", customer_email: "naledi@example.com", customer_phone: "072 555 0101", product_type: "custom", quantity: 2, total_cents: 99700, payment_status: "pending", fulfilment_status: "new", created_at: new Date().toISOString() },
    ],
  };
  showSection(els.adminPage);
  updateHeader(true);
  renderAdminOverview();
  setMessage(els.adminMessage, "Preview data only.");
}

async function loadAccess(user) {
  state.plan = "starter";
  state.isAdmin = false;
  const profileResult = await sb.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  if (!profileResult.error && profileResult.data?.plan === "business") state.plan = "business";
  const adminResult = await sb.rpc("is_app_admin");
  if (!adminResult.error) state.isAdmin = Boolean(adminResult.data);

  const planName = titleCase(state.plan);
  els.planBadge.textContent = planName;
  els.dashboardPlan.textContent = planName;
  els.analyticsLocked.classList.toggle("hidden", state.plan === "business");
  els.analyticsContent.classList.toggle("hidden", state.plan !== "business");
  els.analyticsRange.classList.toggle("hidden", state.plan !== "business");
  els.adminInventory.classList.toggle("hidden", !state.isAdmin);
  els.adminNavBtn.classList.toggle("hidden", !state.isAdmin);
}

async function loadCards() {
  let result = await sb.from("cards").select("id, slug, card_name, destination_type, destination_url, tap_count, card_theme, created_at").order("created_at", { ascending: true });
  if (result.error && /card_theme/i.test(result.error.message || "")) {
    result = await sb.from("cards").select("id, slug, card_name, destination_type, destination_url, tap_count, created_at").order("created_at", { ascending: true });
  }
  if (result.error) {
    showToast(friendlyError(result.error));
    return;
  }
  state.cards = result.data || [];
  renderCards();
}

function renderCards() {
  const cards = state.cards;
  const totalTaps = cards.reduce((sum, card) => sum + Number(card.tap_count || 0), 0);
  els.dashboardTapTotal.textContent = formatNumber(totalTaps);
  els.dashboardCardTotal.textContent = formatNumber(cards.length);
  els.cardCountLabel.textContent = `${cards.length} ${cards.length === 1 ? "card" : "cards"}`;
  els.cardsGrid.innerHTML = "";
  els.emptyCards.classList.toggle("hidden", cards.length > 0);

  cards.forEach((card) => {
    const meta = DESTINATIONS[card.destination_type] || DESTINATIONS.url;
    const tile = document.createElement("article");
    tile.className = "card-tile";
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    tile.setAttribute("aria-label", `Edit ${card.card_name || "TapNation card"}`);
    tile.innerHTML = `
      <div class="card-tile-head"><span class="card-tile-icon">TN</span><span class="destination-label">${escapeHtml(meta.name)}</span></div>
      <div class="card-tile-body"><h3>${escapeHtml(card.card_name || "TapNation Card")}</h3><p>${escapeHtml(card.destination_url || "No destination set")}</p></div>
      <footer><span><b>${formatNumber(card.tap_count || 0)}</b> total taps</span><span>Edit route ↗</span></footer>`;
    tile.addEventListener("click", () => openEditor(card));
    tile.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) openEditor(card); });
    els.cardsGrid.appendChild(tile);
  });
}

function toggleClaimBox() {
  els.claimBox.classList.toggle("hidden");
  if (!els.claimBox.classList.contains("hidden")) els.claimCodeInput.focus();
}

function openClaimBox() {
  els.claimBox.classList.remove("hidden");
  els.emptyCards.classList.add("hidden");
  els.claimCodeInput.focus();
}

async function claimCard(event) {
  event.preventDefault();
  const code = els.claimCodeInput.value.trim().toUpperCase();
  if (!code) return;
  setMessage(els.claimMessage, "Claiming card…");
  const { data, error } = await sb.rpc("claim_card", { p_claim_code: code });
  if (error || !data?.success) {
    setMessage(els.claimMessage, error ? friendlyError(error) : data?.message || "Could not claim this card.", "error");
    return;
  }
  els.claimCodeInput.value = "";
  setMessage(els.claimMessage, "Card claimed. It is ready to route.", "success");
  showToast("Card added to your dashboard.");
  await loadCards();
}

function openEditor(card) {
  state.currentCard = card;
  state.destinationType = DESTINATIONS[card.destination_type] ? card.destination_type : "url";
  state.cardTheme = card.card_theme || "midnight";
  showSection(els.editorSection);
  updateHeader(true);
  els.editorCardTitle.textContent = card.card_name || "Edit card";
  els.cardNameInput.value = card.card_name || "";
  els.previewName.textContent = (card.card_name || "MY TAP CARD").toUpperCase();
  els.tapCount.textContent = formatNumber(card.tap_count || 0);
  setDestinationType(state.destinationType, true);
  els.destinationInput.value = displayDestinationValue(state.destinationType, card.destination_url || "");
  setCardTheme(state.cardTheme);
  const nfcUrl = buildCardUrl(card.slug);
  els.nfcUrlText.textContent = nfcUrl;
  els.testNfcBtn.href = nfcUrl;
  setMessage(els.saveMessage, "");
  els.saveStatusBadge.textContent = "All changes saved";
  els.saveStatusBadge.classList.remove("dirty");
}

function setDestinationType(type, preserveValue) {
  const nextType = DESTINATIONS[type] ? type : "url";
  const changed = state.destinationType !== nextType;
  state.destinationType = nextType;
  const meta = DESTINATIONS[nextType];
  $$(".type-btn").forEach((button) => button.classList.toggle("active", button.dataset.type === nextType));
  els.destinationLabel.textContent = meta.label;
  els.destinationTag.textContent = meta.tag;
  els.destinationInput.placeholder = meta.placeholder;
  els.destinationHint.textContent = meta.hint;
  els.howToTitle.textContent = meta.title;
  els.howToSteps.textContent = meta.steps;
  els.destinationExample.textContent = meta.example;
  els.previewDestination.textContent = `${meta.name.toUpperCase()} ↗`;
  if (changed && !preserveValue) els.destinationInput.value = "";
  if (!preserveValue) {
    markEditorDirty();
    els.destinationInput.focus();
  }
}

function setCardTheme(theme) {
  const validTheme = ["midnight", "citrus", "cobalt", "pearl"].includes(theme) ? theme : "midnight";
  const changed = state.cardTheme !== validTheme;
  state.cardTheme = validTheme;
  $$(".theme-btn").forEach((button) => button.classList.toggle("active", button.dataset.theme === validTheme));
  els.physicalCardPreview.className = `physical-card-preview theme-${validTheme}-card`;
  if (changed && state.currentCard) markEditorDirty();
}

function markEditorDirty() {
  els.saveStatusBadge.textContent = "Unsaved changes";
  els.saveStatusBadge.classList.add("dirty");
  els.previewName.textContent = (els.cardNameInput.value.trim() || "MY TAP CARD").toUpperCase();
}

async function saveCard(event) {
  event.preventDefault();
  if (!state.currentCard) return;
  const cardName = els.cardNameInput.value.trim() || "TapNation Card";
  let destinationUrl;
  try {
    destinationUrl = buildDestination(state.destinationType, els.destinationInput.value);
  } catch (error) {
    setMessage(els.saveMessage, error.message, "error");
    return;
  }
  const submitButton = els.cardForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  setMessage(els.saveMessage, "Saving your new route…");

  let result = await sb.rpc("update_card_v2", {
    p_card_id: state.currentCard.id,
    p_card_name: cardName,
    p_destination_type: state.destinationType,
    p_destination_url: destinationUrl,
    p_card_theme: state.cardTheme,
  });
  if (result.error && /update_card_v2|schema cache|function/i.test(result.error.message || "")) {
    result = await sb.rpc("update_card", {
      p_card_id: state.currentCard.id,
      p_card_name: cardName,
      p_destination_type: state.destinationType,
      p_destination_url: destinationUrl,
    });
  }
  submitButton.disabled = false;

  if (result.error || !result.data?.success) {
    setMessage(els.saveMessage, result.error ? migrationAwareError(result.error) : result.data?.message || "Could not save this card.", "error");
    return;
  }

  Object.assign(state.currentCard, { card_name: cardName, destination_type: state.destinationType, destination_url: destinationUrl, card_theme: state.cardTheme });
  const index = state.cards.findIndex((card) => card.id === state.currentCard.id);
  if (index >= 0) state.cards[index] = { ...state.currentCard };
  els.editorCardTitle.textContent = cardName;
  els.previewName.textContent = cardName.toUpperCase();
  els.saveStatusBadge.textContent = "All changes saved";
  els.saveStatusBadge.classList.remove("dirty");
  setMessage(els.saveMessage, "Saved. The very next tap uses this destination.", "success");
  showToast("Destination updated live.");
}

function buildDestination(type, raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error(`Enter ${DESTINATIONS[type]?.label.toLowerCase() || "a destination"}.`);
  if (type === "whatsapp") return makeWhatsAppUrl(value);
  if (type === "email") {
    const email = value.replace(/^mailto:/i, "").split("?")[0].trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    return `mailto:${email}`;
  }
  if (type === "phone") return makePhoneUrl(value);
  if (type === "instagram" && /^@?[a-z0-9._]+$/i.test(value)) return `https://www.instagram.com/${value.replace(/^@/, "")}/`;
  if (type === "tiktok" && /^@?[a-z0-9._]+$/i.test(value)) return `https://www.tiktok.com/@${value.replace(/^@/, "")}`;
  if (type === "facebook" && /^@?[a-z0-9.]+$/i.test(value)) return `https://www.facebook.com/${value.replace(/^@/, "")}`;
  const url = normaliseWebUrl(value);
  if (!url) throw new Error("Enter a valid http or https link.");
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  if (type === "youtube" && !hostname.endsWith("youtube.com") && hostname !== "youtu.be") throw new Error("Paste a YouTube or youtu.be link.");
  if (type === "instagram" && !hostname.endsWith("instagram.com")) throw new Error("Paste an Instagram link or enter the @handle.");
  if (type === "tiktok" && !hostname.endsWith("tiktok.com")) throw new Error("Paste a TikTok link or enter the @handle.");
  if (type === "linkedin" && !hostname.endsWith("linkedin.com")) throw new Error("Paste a LinkedIn link.");
  if (type === "facebook" && !hostname.endsWith("facebook.com") && hostname !== "fb.com") throw new Error("Paste a Facebook link or username.");
  if (type === "maps" && !["google.com", "goo.gl"].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) throw new Error("Paste a Google Maps link.");
  if (type === "google_review" && !["google.com", "goo.gl", "g.page"].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) throw new Error("Paste the review link from your Google Business Profile.");
  return url;
}

function displayDestinationValue(type, url) {
  if (type === "whatsapp") return numberFromWhatsAppUrl(url);
  if (type === "email") return String(url).replace(/^mailto:/i, "").split("?")[0];
  if (type === "phone") return String(url).replace(/^tel:/i, "");
  return url;
}

async function resolveAndRedirect(slug) {
  els.app.classList.add("hidden");
  els.redirectScreen.classList.remove("hidden");
  if (!sb) return redirectError("This TapNation site has not been connected to Supabase yet.");
  try {
    const { data, error } = await sb.rpc("resolve_card", { p_slug: String(slug).trim() });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.destination_url) return redirectError("This card has not been activated yet.");
    const destination = safeDestination(result.destination_url);
    if (!destination) return redirectError("This card’s destination is invalid.");
    els.redirectTitle.textContent = result.card_name ? `Opening ${result.card_name}…` : "Opening your destination…";
    els.manualOpen.href = destination;
    els.manualOpen.classList.remove("hidden");
    window.setTimeout(() => window.location.replace(destination), 320);
  } catch (error) {
    redirectError(friendlyError(error));
  }
}

function redirectError(message) {
  document.querySelector(".spinner")?.classList.add("hidden");
  els.redirectTitle.textContent = "This card isn’t ready";
  els.redirectText.textContent = message;
  els.manualOpen.classList.add("hidden");
}

async function loadAnalytics() {
  if (state.plan !== "business") return;
  setMessage(els.analyticsMessage, "Loading analytics…");
  const days = Number(els.analyticsRange.value || 30);
  const { data, error } = await sb.rpc("get_dashboard_analytics", { p_days: days });
  if (error) {
    setMessage(els.analyticsMessage, migrationAwareError(error), "error");
    return;
  }
  setMessage(els.analyticsMessage, "");
  renderAnalytics(data || {});
}

function renderAnalytics(data) {
  const daily = Array.isArray(data.daily) ? data.daily : [];
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const total = Number(data.period_taps || daily.reduce((sum, item) => sum + Number(item.taps || 0), 0));
  const bestDay = [...daily].sort((a, b) => Number(b.taps) - Number(a.taps))[0];
  const topCard = cards[0];
  els.periodTapTotal.textContent = formatNumber(total);
  els.bestTapDay.textContent = bestDay && Number(bestDay.taps) > 0 ? formatDate(bestDay.date) : "No taps yet";
  els.topTapCard.textContent = topCard && Number(topCard.taps) > 0 ? topCard.card_name : "No taps yet";
  els.analyticsChart.style.setProperty("--days", Math.max(daily.length, 1));
  els.analyticsChart.innerHTML = "";
  const max = Math.max(1, ...daily.map((item) => Number(item.taps || 0)));
  daily.forEach((item, index) => {
    const wrap = document.createElement("div");
    wrap.className = "live-bar-wrap";
    const showLabel = daily.length <= 7 || index === 0 || index === daily.length - 1 || index % 7 === 0;
    wrap.innerHTML = `<div class="live-bar" style="--height:${Math.max(2, Number(item.taps || 0) / max * 100)}%" data-value="${Number(item.taps || 0)} taps"></div><span class="live-bar-label">${showLabel ? escapeHtml(shortDate(item.date)) : ""}</span>`;
    els.analyticsChart.appendChild(wrap);
  });
  els.cardRanking.innerHTML = "";
  const cardMax = Math.max(1, ...cards.map((item) => Number(item.taps || 0)));
  cards.forEach((card) => {
    const row = document.createElement("div");
    row.className = "rank-row";
    row.innerHTML = `<span>${escapeHtml(card.card_name || "TapNation Card")}</span><div class="rank-track"><i style="--width:${Number(card.taps || 0) / cardMax * 100}%"></i></div><b>${formatNumber(card.taps || 0)} taps</b>`;
    els.cardRanking.appendChild(row);
  });
}

async function generateInventory(event) {
  event.preventDefault();
  if (!state.isAdmin) return;
  const quantity = Math.min(100, Math.max(1, Number(els.inventoryQuantity.value || 1)));
  const prefix = els.inventoryPrefix.value.trim() || "TapNation Card";
  els.generateCardsBtn.disabled = true;
  setMessage(els.inventoryMessage, `Generating ${quantity} secure cards…`);
  const { data, error } = await sb.rpc("admin_create_cards", { p_quantity: quantity, p_name_prefix: prefix, p_base_url: getBaseUrl() });
  els.generateCardsBtn.disabled = false;
  if (error) {
    setMessage(els.inventoryMessage, migrationAwareError(error), "error");
    return;
  }
  state.inventory = data || [];
  els.inventoryTableBody.innerHTML = state.inventory.map((card, index) => `<tr><td>${escapeHtml(card.card_name || `${prefix} ${index + 1}`)}</td><td><code>${escapeHtml(card.slug)}</code></td><td><code>${escapeHtml(card.claim_code)}</code></td><td><code>${escapeHtml(card.nfc_url)}</code></td></tr>`).join("");
  els.inventoryResults.classList.remove("hidden");
  setMessage(els.inventoryMessage, `${state.inventory.length} cards created. Download the CSV before making another batch.`, "success");
  await loadAdminOverview();
}

function downloadInventoryCsv() {
  if (!state.inventory.length) return;
  const rows = [["card_name", "slug", "claim_code", "nfc_url"], ...state.inventory.map((card) => [card.card_name, card.slug, card.claim_code, card.nfc_url])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `tapnation-card-batch-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function showAdminPage(updatePath = true) {
  if (!state.user) {
    state.requestedAdmin = true;
    openAuth("login");
    return;
  }
  if (!state.isAdmin) {
    state.requestedAdmin = false;
    await showDashboard(state.user);
    showToast("This page is restricted to TapNation administrators.");
    return;
  }
  state.requestedAdmin = true;
  showSection(els.adminPage);
  updateHeader(true);
  if (updatePath) setAppPath("/admin");
  await loadAdminOverview();
}

async function loadAdminOverview() {
  if (!state.user || !state.isAdmin || !sb) return;
  els.refreshAdminBtn.disabled = true;
  setMessage(els.adminMessage, "Refreshing operations data…");
  const { data, error } = await sb.rpc("admin_dashboard_overview");
  els.refreshAdminBtn.disabled = false;
  if (error) {
    setMessage(els.adminMessage, migrationAwareError(error), "error");
    return;
  }
  state.adminOverview = data || {};
  renderAdminOverview();
  setMessage(els.adminMessage, `Updated ${new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit" }).format(new Date())}.`, "success");
}

function renderAdminOverview() {
  const overview = state.adminOverview || {};
  const totals = overview.totals || {};
  const cards = Array.isArray(overview.cards) ? overview.cards : [];
  const orders = Array.isArray(overview.orders) ? overview.orders : [];
  els.adminTotalCards.textContent = formatNumber(totals.total_cards);
  els.adminLinkedCards.textContent = formatNumber(totals.linked_cards);
  els.adminActivatedCards.textContent = formatNumber(totals.activated_cards);
  els.adminUnclaimedCards.textContent = formatNumber(totals.unclaimed_cards);
  els.adminCardsLabel.textContent = `${formatNumber(totals.total_cards)} total`;
  els.adminOrdersLabel.textContent = `${formatNumber(totals.open_orders)} open`;
  els.adminCardsBody.innerHTML = cards.length ? cards.map((card) => {
    const linked = Boolean(card.destination_url);
    const activated = Boolean(card.owner_id);
    return `<tr><td>${escapeHtml(card.card_name || "TapNation Card")}</td><td><code>${escapeHtml(card.slug)}</code></td><td><span class="admin-status ${linked ? "good" : "waiting"}">${linked ? escapeHtml(titleCase(card.destination_type || "Link")) : "No link"}</span></td><td><span class="admin-status ${activated ? "good" : "waiting"}">${activated ? "Claimed" : "Ready"}</span></td><td>${formatNumber(card.tap_count)}</td></tr>`;
  }).join("") : `<tr><td colspan="5">No cards have been created yet.</td></tr>`;
  els.adminOrdersBody.innerHTML = orders.length ? orders.map((order) => {
    const quantity = Number(order.quantity || 0);
    const email = escapeHtml(order.customer_email || "");
    const phone = escapeHtml(order.customer_phone || "");
    const status = order.payment_status === "paid" ? "good" : "waiting";
    return `<tr><td><code>${escapeHtml(order.public_reference)}</code><br><small>${escapeHtml(formatDateTime(order.created_at))}</small></td><td><b>${escapeHtml(order.customer_name)}</b><br><a href="mailto:${email}">${email}</a> · ${phone}</td><td>${quantity} × ${escapeHtml(productName(order.product_type))}</td><td>${formatMoney(order.total_cents)}</td><td><span class="admin-status ${status}">${escapeHtml(titleCase(order.payment_status || "pending"))}</span><br><small>${escapeHtml(titleCase(order.fulfilment_status || "new"))}</small></td></tr>`;
  }).join("") : `<tr><td colspan="5">No store orders yet.</td></tr>`;
}

function openStore(productType) {
  const product = STORE_PRODUCTS[productType] || STORE_PRODUCTS.original;
  state.storeProduct = STORE_PRODUCTS[productType] ? productType : "original";
  state.shippingQuote = null;
  els.storeOrderForm.reset();
  els.storeQuantity.min = String(product.minimum);
  els.storeQuantity.value = String(product.minimum);
  els.storeProductName.textContent = product.name;
  els.storeProductText.textContent = product.description;
  els.storeTypeLabel.value = product.typeLabel;
  els.logoField.classList.toggle("hidden", state.storeProduct === "original");
  els.storeLogo.required = state.storeProduct === "custom";
  if (state.user?.email) els.storeOrderForm.elements.email.value = state.user.email;
  els.storeFormView.classList.remove("hidden");
  els.storeSuccess.classList.add("hidden");
  els.shippingResult.classList.add("hidden");
  els.placeOrderBtn.disabled = true;
  setMessage(els.storeMessage, "");
  updateStoreTotals();
  els.storeModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  setTimeout(() => els.storeQuantity.focus(), 30);
}

function closeStore() {
  els.storeModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function invalidateShippingQuote() {
  state.shippingQuote = null;
  els.shippingResult.classList.add("hidden");
  els.placeOrderBtn.disabled = true;
  els.storeDeliveryTotal.textContent = "Calculate quote";
  updateStoreTotals();
}

function storeUnitPrice(productType, quantity) {
  if (productType === "custom") return 44900;
  if (productType === "bulk") {
    if (quantity >= 50) return 19900;
    if (quantity >= 25) return 22900;
    return 24900;
  }
  return 29900;
}

function updateStoreTotals() {
  const product = STORE_PRODUCTS[state.storeProduct] || STORE_PRODUCTS.original;
  const quantity = Math.min(100, Math.max(product.minimum, Number(els.storeQuantity.value || product.minimum)));
  const merchandise = storeUnitPrice(state.storeProduct, quantity) * quantity;
  const delivery = Number(state.shippingQuote?.amountCents || 0);
  els.storeMerchandiseTotal.textContent = formatMoney(merchandise);
  els.storeDeliveryTotal.textContent = state.shippingQuote ? formatMoney(delivery) : "Calculate quote";
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
    customer: {
      fullName: fields.fullName.value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.trim(),
      company: fields.company.value.trim(),
    },
    address: {
      streetAddress: fields.streetAddress.value.trim(),
      localArea: fields.localArea.value.trim(),
      city: fields.city.value.trim(),
      province: fields.province.value,
      postalCode: fields.postalCode.value.trim(),
      country: "ZA",
    },
    notes: fields.notes.value.trim(),
  };
}

async function quoteStoreDelivery() {
  if (!els.storeOrderForm.reportValidity()) return;
  const product = STORE_PRODUCTS[state.storeProduct];
  if (Number(els.storeQuantity.value) < product.minimum) {
    setMessage(els.storeMessage, `The minimum for ${product.name} is ${product.minimum} cards.`, "error");
    return;
  }
  els.quoteDeliveryBtn.disabled = true;
  els.placeOrderBtn.disabled = true;
  setMessage(els.storeMessage, "Checking courier delivery to your address…");
  try {
    const { data, error } = await sb.functions.invoke("tapnation-store-order", { body: storePayload("quote") });
    if (error) throw error;
    if (!data?.quote?.amountCents) throw new Error("No delivery service is available for this address yet.");
    state.shippingQuote = data.quote;
    const liveLabel = data.quote.live ? "Live courier quote" : "Launch delivery estimate";
    els.shippingResult.innerHTML = `<span><b>${escapeHtml(data.quote.courierName || "Nationwide courier")}</b><small>${escapeHtml(data.quote.serviceName || liveLabel)} · ${escapeHtml(liveLabel)}</small></span><strong>${formatMoney(data.quote.amountCents)}</strong>`;
    els.shippingResult.classList.remove("hidden");
    els.placeOrderBtn.disabled = false;
    setMessage(els.storeMessage, data.quote.live ? "Delivery confirmed. You can place the order." : "Delivery is estimated at launch and will be confirmed before payment.", "success");
    updateStoreTotals();
  } catch (error) {
    setMessage(els.storeMessage, friendlyError(await unwrapFunctionError(error)), "error");
  } finally {
    els.quoteDeliveryBtn.disabled = false;
  }
}

async function submitStoreOrder(event) {
  event.preventDefault();
  if (!state.shippingQuote || !els.storeOrderForm.reportValidity()) return;
  const logo = els.storeLogo.files?.[0] || null;
  if (state.storeProduct === "custom" && !logo) {
    setMessage(els.storeMessage, "Upload the business logo for a custom branded card.", "error");
    return;
  }
  if (logo && logo.size > 3 * 1024 * 1024) {
    setMessage(els.storeMessage, "The logo file must be 3 MB or smaller.", "error");
    return;
  }
  els.placeOrderBtn.disabled = true;
  els.quoteDeliveryBtn.disabled = true;
  setMessage(els.storeMessage, "Securing your order…");
  try {
    const payload = storePayload("order");
    payload.quote = state.shippingQuote;
    if (logo) payload.logo = await filePayload(logo);
    const { data, error } = await sb.functions.invoke("tapnation-store-order", { body: payload });
    if (error) throw error;
    if (!data?.reference) throw new Error("The order was not created. Please try again.");
    els.storeOrderReference.textContent = data.reference;
    els.storeFormView.classList.add("hidden");
    els.storeSuccess.classList.remove("hidden");
    if (state.isAdmin) loadAdminOverview();
  } catch (error) {
    setMessage(els.storeMessage, friendlyError(await unwrapFunctionError(error)), "error");
    els.placeOrderBtn.disabled = false;
  } finally {
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

function handleRouteChange() {
  const adminRoute = /^\/admin\/?$/i.test(window.location.pathname);
  state.requestedAdmin = adminRoute;
  if (adminRoute) showAdminPage(false);
  else if (state.user) showDashboard(state.user, false);
  else showLanding();
}

function setAppPath(path, replace = false) {
  if (window.location.pathname === path) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", path);
}

function openUpgradeModal() {
  if (state.plan === "business") {
    if (state.user) showDashboard(state.user);
    else openAuth("login");
    return;
  }
  els.upgradeModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  setMessage(els.upgradeMessage, "");
  els.closeUpgradeBtn.focus();
}

function closeUpgradeModal() {
  els.upgradeModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

async function startBusinessCheckout(interval) {
  if (!state.user) {
    closeUpgradeModal();
    openAuth("login");
    setMessage(els.authMessage, "Log in first, then choose your Business plan.");
    return;
  }

  const button = interval === "annual" ? els.annualUpgradeBtn : els.monthlyUpgradeBtn;
  els.monthlyUpgradeBtn.disabled = true;
  els.annualUpgradeBtn.disabled = true;
  setMessage(els.upgradeMessage, "Opening secure Paystack checkout…");

  try {
    const { data, error } = await sb.functions.invoke("tapnation-business-checkout", {
      body: { interval },
    });
    if (error) throw error;
    const authorizationUrl = String(data?.authorizationUrl || "");
    const parsed = new URL(authorizationUrl);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith("paystack.com")) {
      throw new Error("Paystack returned an invalid checkout address.");
    }
    button.textContent = "Redirecting…";
    window.location.assign(authorizationUrl);
  } catch (error) {
    els.monthlyUpgradeBtn.disabled = false;
    els.annualUpgradeBtn.disabled = false;
    setMessage(els.upgradeMessage, friendlyError(await unwrapFunctionError(error)), "error");
  }
}

async function verifyBusinessReturn() {
  const reference = state.paymentReference;
  if (!reference || !state.user) return;
  state.paymentReference = "";
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("payment");
  cleanUrl.searchParams.delete("reference");
  window.history.replaceState({}, "", cleanUrl);
  showToast("Verifying your Business payment…");

  const { data, error } = await sb.functions.invoke("tapnation-business-verify", {
    body: { reference },
  });
  if (error || !data?.ok) {
    showToast("Payment is still processing. Your dashboard will unlock after Paystack confirms it.");
    return;
  }

  await loadAccess(state.user);
  if (state.plan === "business") await loadAnalytics();
  showToast("TapNation Business is now unlocked.");
}

function cycleHeroDestination() {
  const names = ["YouTube", "WhatsApp", "Google Reviews", "Instagram", "your website"];
  let index = 0;
  window.setInterval(() => {
    index = (index + 1) % names.length;
    els.heroDestination.animate([{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 350 });
    els.heroDestination.textContent = names[index];
  }, 2600);
}

function normaliseWebUrl(raw) {
  let value = String(raw || "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function safeDestination(raw) {
  const value = String(raw || "").trim();
  try {
    const parsed = new URL(value);
    if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function makeWhatsAppUrl(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) throw new Error("Enter a WhatsApp number.");
  if (digits.startsWith("0") && digits.length === 10) digits = `27${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15) throw new Error("That WhatsApp number does not look valid.");
  return `https://wa.me/${digits}`;
}

function numberFromWhatsAppUrl(url) {
  const match = String(url).match(/wa\.me\/(\d+)/i);
  if (!match) return "";
  const digits = match[1];
  return digits.startsWith("27") && digits.length === 11 ? `0${digits.slice(2)}` : `+${digits}`;
}

function makePhoneUrl(raw) {
  let value = String(raw || "").trim();
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) digits = `27${digits.slice(1)}`;
  if (digits.length < 8 || digits.length > 15) throw new Error("Enter a valid phone number.");
  return `tel:+${digits}`;
}

function getBaseUrl() {
  return window.location.origin;
}

function buildCardUrl(slug) {
  const url = new URL(getBaseUrl());
  url.searchParams.set("c", slug);
  return url.toString();
}

function setMessage(element, message, type = "") {
  element.textContent = message || "";
  element.className = `message ${type}`.trim();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.add("hidden"), 3000);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}

function migrationAwareError(error) {
  const text = error?.message || String(error || "Something went wrong.");
  if (/function.*does not exist|schema cache|card_theme|destination_type_check/i.test(text)) return "Run supabase.sql in the Supabase SQL Editor to enable this upgraded feature.";
  return friendlyError(error);
}

function friendlyError(error) {
  const text = error?.message || String(error || "Something went wrong.");
  if (/invalid login credentials/i.test(text)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(text)) return "Confirm your email before logging in.";
  if (/user already registered/i.test(text)) return "That email already has an account.";
  if (/rate limit|too many requests|over_email_send_rate_limit/i.test(text)) return "Too many emails were requested. Wait a few minutes, then try again.";
  if (/failed to fetch/i.test(text)) return "Could not reach TapNation right now. Check your connection and try again.";
  return text;
}

async function unwrapFunctionError(error) {
  try {
    const payload = await error?.context?.clone?.().json();
    if (payload?.error) return new Error(payload.error);
  } catch {
    // Keep the original SDK error when an Edge Function returned no JSON body.
  }
  return error;
}

function formatNumber(value) { return new Intl.NumberFormat("en-ZA").format(Number(value || 0)); }
function formatMoney(value) { return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number(value || 0) / 100); }
function titleCase(value) { return String(value || "").replace(/(^|_)([a-z])/g, (_, space, letter) => `${space ? " " : ""}${letter.toUpperCase()}`); }
function productName(value) { return STORE_PRODUCTS[value]?.name || titleCase(value || "Card"); }
function formatDate(value) { return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00`)); }
function formatDateTime(value) { return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function shortDate(value) { return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00`)); }
function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
