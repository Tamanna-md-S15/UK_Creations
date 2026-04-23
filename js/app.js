const SUPABASE_URL = window.SUPABASE_CONFIG?.supabaseUrl;
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.supabaseAnonKey;
const ALLOWED_EMAILS = (window.SUPABASE_CONFIG?.allowedEmails || []).map((email) =>
  String(email || "").trim().toLowerCase()
).filter(Boolean);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase config in js/supabase.js");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let clients = [];
let currentUser = null;
let currentView = "cards";
let pendingSavePayload = null;
let authMode = "login";

// ================= UI =================
function showLoginError(message) {
  const el = document.getElementById("login-error");
  if (el) {
    el.textContent = message;
    el.style.display = "block";
  }
}

function hideLoginError() {
  const el = document.getElementById("login-error");
  if (el) el.style.display = "none";
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.style.display = "flex";
  toast.style.background = isError ? "var(--red)" : "var(--green)";
  toast.innerHTML = `${isError ? "✖" : "✔"} ${message}`;
  setTimeout(() => (toast.style.display = "none"), 2400);
}

function showLoginPage() {
  document.getElementById("page-login").classList.add("active");
  document.getElementById("page-landing").classList.remove("active");
  document.getElementById("page-app").classList.remove("active");
}

function showLandingPage() {
  document.getElementById("page-login").classList.remove("active");
  document.getElementById("page-landing").classList.add("active");
  document.getElementById("page-app").classList.remove("active");
}

function showAppPage() {
  document.getElementById("page-login").classList.remove("active");
  document.getElementById("page-landing").classList.remove("active");
  document.getElementById("page-app").classList.add("active");
}

// ================= AUTH =================
function isAllowedEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  if (!ALLOWED_EMAILS.length) return true;
  return ALLOWED_EMAILS.includes(normalized);
}

// 🔥 FIXED LOGIN
async function submitAuth(event) {
  event.preventDefault();

  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  hideLoginError();

  if (!email || !password) {
    showToast("Enter email & password", true);
    showLoginError("Please enter both email and password.");
    return;
  }

  if (!isAllowedEmail(email)) {
    showToast("Access denied", true);
    showLoginError("This email is not authorized.");
    return;
  }

  let result;
  if (authMode === "signup") {
    result = await db.auth.signUp({ email, password });
    if (!result.error) {
      result = await db.auth.signInWithPassword({ email, password });
    }
  } else {
    result = await db.auth.signInWithPassword({ email, password });
  }

  if (result.error) {
    showToast(result.error.message, true);
    showLoginError(result.error.message);
    return;
  }

  // 🔥 IMPORTANT FIX
  const { data } = await db.auth.getSession();

  if (data?.session?.user) {
    currentUser = data.session.user;

    document.getElementById("user-email-display").textContent =
      currentUser.email || "";

    showToast("Login successful");
    showAppPage();
    await loadClients();
    switchTab("dashboard");

    // Fix UI delay (Vercel)
    setTimeout(() => {
      showAppPage();
      switchTab("dashboard");
    }, 100);
  }
}

async function signOut() {
  await db.auth.signOut();
  currentUser = null;
  showLoginPage();
}

// 🔥 AUTO LOGIN FIX
async function initAuth() {
  const { data } = await db.auth.getSession();

  if (data?.session?.user) {
    currentUser = data.session.user;

    document.getElementById("user-email-display").textContent =
      currentUser.email || "";

    showAppPage();
    await loadClients();
    switchTab("dashboard");
  } else {
    showLoginPage();
  }

  db.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      currentUser = session.user;

      document.getElementById("user-email-display").textContent =
        currentUser.email || "";

      showAppPage();
      await loadClients();
      switchTab("dashboard");
    } else {
      currentUser = null;
      showLoginPage();
    }
  });
}

// ================= CLIENT LOGIC (UNCHANGED) =================
async function loadClients() {
  const { data, error } = await db
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showToast("Failed to load clients", true);
    return;
  }

  clients = data || [];
  renderDashboard();
}

function renderDashboard() {
  console.log("Dashboard Loaded", clients);
}

function switchTab(tab) {
  console.log("Switching to:", tab);
}

function signInWithGoogle() {
  showLandingPage();
  openAuthCard();
}

function openAuthCard() {
  const card = document.getElementById("auth-card");
  if (card) card.style.display = "block";
}
async function sendPasswordLink() {
  const email = document.getElementById("auth-email").value.trim();

  if (!email) {
    showToast("Enter your email first", true);
    return;
  }

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });

  if (error) {
    showToast(error.message, true);
  } else {
    showToast("Password setup link sent to your email ✅");
  }
}

// ================= INIT =================
initAuth();