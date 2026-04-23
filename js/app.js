// ================== SUPABASE INIT ==================
const SUPABASE_URL = window.SUPABASE_CONFIG?.supabaseUrl;
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.supabaseAnonKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase config");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let authMode = "login";

// ================== UI HELPERS ==================
function showLoginPage() {
  document.getElementById("page-login").classList.add("active");
  document.getElementById("page-app").classList.remove("active");
}

function showAppPage() {
  document.getElementById("page-login").classList.remove("active");
  document.getElementById("page-app").classList.add("active");
}

function showToast(msg, err = false) {
  console.log(err ? "❌" : "✅", msg);
}

// ================== AUTH ==================
function isAllowedEmail(email) {
  const allowed = (window.SUPABASE_CONFIG?.allowedEmails || []).map(e =>
    e.toLowerCase()
  );
  if (!allowed.length) return true;
  return allowed.includes(email.toLowerCase());
}

// 🔥 CENTRAL LOGIN SUCCESS HANDLER
async function handleLoginSuccess(user) {
  currentUser = user;

  const el = document.getElementById("user-email-display");
  if (el) el.textContent = user.email;

  showAppPage();
  showToast("Login successful");

  // 🔥 IMPORTANT: force UI update (fix for Vercel delay)
  setTimeout(() => {
    showAppPage();
  }, 100);
}

// 🔥 LOGIN FUNCTION
async function submitAuth(event) {
  event.preventDefault();

  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  if (!email || !password) {
    showToast("Enter email & password", true);
    return;
  }

  if (!isAllowedEmail(email)) {
    showToast("Access denied", true);
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
    return;
  }

  // 🔥 FORCE SESSION FETCH (important fix)
  const { data } = await db.auth.getSession();

  if (data?.session?.user) {
    handleLoginSuccess(data.session.user);
  }
}

// 🔥 LOGOUT
async function signOut() {
  await db.auth.signOut();
  currentUser = null;
  showLoginPage();
}

// 🔥 INIT AUTH (AUTO LOGIN)
async function initAuth() {
  const { data } = await db.auth.getSession();

  if (data?.session?.user) {
    handleLoginSuccess(data.session.user);
  } else {
    showLoginPage();
  }

  // 🔥 Listen for auth changes
  db.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      handleLoginSuccess(session.user);
    } else {
      currentUser = null;
      showLoginPage();
    }
  });
}

// ================== INIT ==================
initAuth();