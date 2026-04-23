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

function showLoginError(message) {
  const el = document.getElementById("login-error");
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
}

function hideLoginError() {
  const el = document.getElementById("login-error");
  if (!el) return;
  el.style.display = "none";
}

function isAllowedEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  if (!ALLOWED_EMAILS.length) return true;
  return ALLOWED_EMAILS.includes(normalized);
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.style.display = "flex";
  toast.style.background = isError ? "var(--red)" : "var(--green)";
  toast.innerHTML = `${isError ? "&#10005;" : "&#10003;"}&nbsp; ${message}`;
  setTimeout(() => {
    toast.style.display = "none";
  }, 2400);
}

function showLoginPage() {
  document.getElementById("page-login").classList.add("active");
  document.getElementById("page-landing").classList.remove("active");
  document.getElementById("page-app").classList.remove("active");
  closeAuthCard();
  hideLoginError();
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

function openAuthCard() {
  const card = document.getElementById("auth-card");
  if (card) card.style.display = "block";
  setAuthMode("login");
}

function closeAuthCard() {
  const card = document.getElementById("auth-card");
  if (card) card.style.display = "none";
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  if (emailInput) emailInput.value = "";
  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.type = "password";
  }
  const eyeBtn = document.getElementById("auth-password-toggle");
  if (eyeBtn) {
    eyeBtn.setAttribute("aria-label", "Show password");
    eyeBtn.textContent = "👁";
  }
  hideLoginError();
  showLoginPage();
}

function setAuthMode(mode) {
  authMode = mode === "signup" ? "signup" : "login";
  const isSignup = authMode === "signup";
  const loginBtn = document.getElementById("auth-mode-login-btn");
  const signupBtn = document.getElementById("auth-mode-signup-btn");
  const title = document.getElementById("auth-title");
  const sub = document.getElementById("auth-sub");
  const submit = document.getElementById("auth-submit-btn");
  if (loginBtn) loginBtn.classList.toggle("active", !isSignup);
  if (signupBtn) signupBtn.classList.toggle("active", isSignup);
  if (title) title.textContent = isSignup ? "Create Password" : "Secure Login";
  if (sub) sub.textContent = isSignup
    ? "First-time setup: choose your password"
    : "Continue with your allowed email";
  if (submit) submit.textContent = isSignup ? "Sign Up" : "Continue";
  hideLoginError();
}

function toggleAuthPassword() {
  const input = document.getElementById("auth-password");
  const btn = document.getElementById("auth-password-toggle");
  if (!input || !btn) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  btn.textContent = show ? "🙈" : "👁";
}

function money(n) {
  const val = Number(n || 0);
  return `₹${val.toLocaleString("en-IN")}`;
}

function avatar(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function getExtraFields() {
  return {
    cid: document.getElementById("f-id").value.trim(),
    location: document.getElementById("f-loc").value.trim(),
    timing: document.getElementById("f-timing").value,
    advance: Number(document.getElementById("f-adv").value || 0),
    dealAmount: Number(document.getElementById("f-deal-amt").value || 0),
    dealDate: document.getElementById("f-deal").value
  };
}

function parseNotes(notes) {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch (_e) {
    return { raw: notes };
  }
}

function buildPayload() {
  const name = document.getElementById("f-name").value.trim();
  const shootDate = document.getElementById("f-shoot").value || null;
  const category = document.getElementById("f-category").value.trim();
  const phone = document.getElementById("f-phone").value.trim();
  const extras = getExtraFields();
  return {
    name,
    phone: phone || null,
    email: null,
    shoot_date: shootDate,
    shoot_type: category || null,
    status: "Pending",
    notes: JSON.stringify(extras)
  };
}

function resetForm() {
  document.getElementById("f-edit-uid").value = "";
  document.getElementById("f-id").value = "";
  document.getElementById("f-name").value = "";
  document.getElementById("f-phone").value = "";
  document.getElementById("f-loc").value = "";
  document.getElementById("f-category").value = "";
  document.getElementById("f-timing").value = "";
  document.getElementById("f-adv").value = "";
  document.getElementById("f-deal-amt").value = "";
  document.getElementById("f-deal").value = "";
  document.getElementById("f-shoot").value = "";
  document.getElementById("form-section-title").textContent = "New Client Entry";
  document.getElementById("btn-save-client").textContent = "Save Client";
}

function switchTab(tab) {
  const add = document.getElementById("tab-add");
  const dashboard = document.getElementById("tab-dashboard");
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((t) => t.classList.remove("active"));
  if (tab === "dashboard") {
    add.style.display = "none";
    dashboard.style.display = "block";
    tabs[1]?.classList.add("active");
  } else {
    add.style.display = "block";
    dashboard.style.display = "none";
    tabs[0]?.classList.add("active");
  }
}

function setView(view) {
  currentView = view;
  document.getElementById("cards-view").style.display = view === "cards" ? "block" : "none";
  document.getElementById("sheet-view").style.display = view === "sheet" ? "block" : "none";
  document.getElementById("btn-cards").classList.toggle("active", view === "cards");
  document.getElementById("btn-sheet").classList.toggle("active", view === "sheet");
}

function checkDateConflict() {
  const shootDate = document.getElementById("f-shoot").value;
  const warn = document.getElementById("conflict-date-warn");
  if (!shootDate) {
    warn.style.display = "none";
    return;
  }
  const editId = document.getElementById("f-edit-uid").value;
  const sameDate = clients.filter((c) => c.shoot_date === shootDate && c.id !== editId);
  if (!sameDate.length) {
    warn.style.display = "none";
    return;
  }
  warn.style.display = "block";
  warn.textContent = `${sameDate.length} shoot(s) already scheduled on this date.`;
}

function checkTimingConflict() {
  const timing = document.getElementById("f-timing").value;
  const shootDate = document.getElementById("f-shoot").value;
  const warn = document.getElementById("conflict-time-warn");
  if (!timing || !shootDate) {
    warn.style.display = "none";
    return;
  }
  const editId = document.getElementById("f-edit-uid").value;
  const conflicts = clients.filter((c) => {
    if (c.id === editId || c.shoot_date !== shootDate) return false;
    const ex = parseNotes(c.notes);
    return ex.timing && ex.timing === timing;
  });
  if (!conflicts.length) {
    warn.style.display = "none";
    return;
  }
  warn.style.display = "block";
  warn.textContent = `Timing conflict with ${conflicts.length} client(s).`;
}

function closeConflictModal() {
  document.getElementById("conflict-modal").classList.remove("show");
  pendingSavePayload = null;
}

function openConflictModal(conflicts, payload) {
  pendingSavePayload = payload;
  document.getElementById("modal-body").textContent =
    "There are potential shoot conflicts. You can go back or save anyway.";
  document.getElementById("modal-conflict-list").innerHTML = conflicts
    .map((c) => {
      const ex = parseNotes(c.notes);
      return `
      <div class="modal-conflict-card">
        <div class="modal-conflict-name">${c.name}</div>
        <div class="modal-conflict-detail">${c.shoot_date || "-"} ${ex.timing || ""}</div>
      </div>`;
    })
    .join("");
  document.getElementById("conflict-modal").classList.add("show");
}

async function proceedSave() {
  if (!pendingSavePayload) return;
  await persistClient(pendingSavePayload);
  closeConflictModal();
}

async function persistClient(payload) {
  const editId = document.getElementById("f-edit-uid").value;
  const saveBtn = document.getElementById("btn-save-client");
  saveBtn.disabled = true;
  saveBtn.textContent = editId ? "Updating..." : "Saving...";

  let error = null;
  if (editId) {
    ({ error } = await db
      .from("clients")
      .update(payload)
      .eq("id", editId)
      .eq("user_id", currentUser.id));
  } else {
    ({ error } = await db.from("clients").insert([{ ...payload, user_id: currentUser.id }]));
  }

  saveBtn.disabled = false;
  saveBtn.textContent = editId ? "Update Client" : "Save Client";

  if (error) {
    showToast(error.message || "Unable to save client", true);
    return;
  }

  showToast(editId ? "Client updated successfully!" : "Client saved successfully!");
  resetForm();
  await loadClients();
  switchTab("dashboard");
}

async function saveClient() {
  if (!currentUser) {
    showToast("Please login first.", true);
    showLoginPage();
    return;
  }
  const name = document.getElementById("f-name").value.trim();
  const cid = document.getElementById("f-id").value.trim();
  if (!name || !cid) {
    showToast("Name and Client Unique ID are required.", true);
    return;
  }

  const payload = buildPayload();
  const editId = document.getElementById("f-edit-uid").value;
  const sameDateConflicts = clients.filter((c) => c.shoot_date === payload.shoot_date && c.id !== editId);
  if (sameDateConflicts.length) {
    openConflictModal(sameDateConflicts, payload);
    return;
  }
  await persistClient(payload);
}

async function loadClients() {
  const { data, error } = await db.from("clients").select("*").order("created_at", { ascending: false });
  if (error) {
    showToast(error.message || "Failed to load clients", true);
    return;
  }
  clients = data || [];
  renderDashboard();
}

function getFilteredClients() {
  const query = document.getElementById("search").value.trim().toLowerCase();
  if (!query) return clients;
  return clients.filter((c) => {
    const ex = parseNotes(c.notes);
    return (
      (c.name || "").toLowerCase().includes(query) ||
      (c.shoot_type || "").toLowerCase().includes(query) ||
      (ex.cid || "").toLowerCase().includes(query)
    );
  });
}

function updateMetrics(list) {
  const total = list.length;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = list.filter((c) => c.shoot_date && c.shoot_date >= today).length;
  let totalAdv = 0;
  let totalDeal = 0;
  list.forEach((c) => {
    const ex = parseNotes(c.notes);
    totalAdv += Number(ex.advance || 0);
    totalDeal += Number(ex.dealAmount || 0);
  });
  document.getElementById("m-total").textContent = String(total);
  document.getElementById("m-upcoming").textContent = String(upcoming);
  document.getElementById("m-adv").innerHTML = money(totalAdv);
  document.getElementById("m-deal").innerHTML = money(totalDeal);
  document.getElementById("m-balance").innerHTML = money(totalDeal - totalAdv);
}

function renderCards(list) {
  const el = document.getElementById("cards-view");
  if (!list.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📂</div><h3>No clients yet</h3><p>Add a client to get started.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="cards-grid">${list
    .map((c) => {
      const ex = parseNotes(c.notes);
      return `
      <div class="client-card" onclick="openDetail('${c.id}')">
        <div class="card-top">
          <div class="avatar">${avatar(c.name)}</div>
          <div>
            <div class="card-name">${c.name || "-"}</div>
            <div class="card-id">${ex.cid || "-"}</div>
          </div>
          <span class="badge upcoming">${c.status || "Pending"}</span>
        </div>
        <div class="card-category-tag">${c.shoot_type || "Uncategorized"}</div>
        <div class="card-meta">
          <div class="meta-item"><div class="lbl">Shoot Date</div><div class="val">${c.shoot_date || "-"}</div></div>
          <div class="meta-item"><div class="lbl">Advance</div><div class="val orange">${money(ex.advance)}</div></div>
        </div>
      </div>`;
    })
    .join("")}</div>`;
}

function renderSheet(list) {
  const el = document.getElementById("sheet-view");
  if (!list.length) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `<div class="table-wrap">
  <table>
    <thead><tr><th>Name</th><th>ID</th><th>Category</th><th>Shoot Date</th><th>Advance</th><th>Deal</th></tr></thead>
    <tbody>
      ${list
        .map((c) => {
          const ex = parseNotes(c.notes);
          return `<tr onclick="openDetail('${c.id}')">
          <td>${c.name || "-"}</td>
          <td class="id-col">${ex.cid || "-"}</td>
          <td>${c.shoot_type || "-"}</td>
          <td>${c.shoot_date || "-"}</td>
          <td class="money-o">${money(ex.advance)}</td>
          <td class="money-b">${money(ex.dealAmount)}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table></div>`;
}

function renderDashboard() {
  const list = getFilteredClients();
  updateMetrics(list);
  renderCards(list);
  renderSheet(list);
}

function closeDetail() {
  document.getElementById("backdrop").style.display = "none";
  document.getElementById("detail-panel").style.display = "none";
}

function editClient(id) {
  const c = clients.find((x) => x.id === id);
  if (!c) return;
  const ex = parseNotes(c.notes);
  document.getElementById("f-edit-uid").value = c.id;
  document.getElementById("f-id").value = ex.cid || "";
  document.getElementById("f-name").value = c.name || "";
  document.getElementById("f-phone").value = c.phone || "";
  document.getElementById("f-loc").value = ex.location || "";
  document.getElementById("f-category").value = c.shoot_type || "";
  document.getElementById("f-timing").value = ex.timing || "";
  document.getElementById("f-adv").value = ex.advance || "";
  document.getElementById("f-deal-amt").value = ex.dealAmount || "";
  document.getElementById("f-deal").value = ex.dealDate || "";
  document.getElementById("f-shoot").value = c.shoot_date || "";
  document.getElementById("form-section-title").textContent = "Edit Client Entry";
  document.getElementById("btn-save-client").textContent = "Update Client";
  switchTab("add");
  closeDetail();
}

async function deleteClient(id) {
  if (!confirm("Delete this client?")) return;
  const { error } = await db.from("clients").delete().eq("id", id).eq("user_id", currentUser.id);
  if (error) {
    showToast(error.message || "Delete failed", true);
    return;
  }
  showToast("Client deleted successfully!");
  closeDetail();
  await loadClients();
}

function openDetail(id) {
  const c = clients.find((x) => x.id === id);
  if (!c) return;
  const ex = parseNotes(c.notes);
  document.getElementById("detail-content").innerHTML = `
    <div class="detail-avatar">${avatar(c.name)}</div>
    <div class="detail-name">${c.name || "-"}</div>
    <div class="detail-sub">${c.shoot_type || "-"}</div>
    <div class="detail-section">
      <div class="detail-row"><span class="dlbl">Client ID</span><span class="dval">${ex.cid || "-"}</span></div>
      <div class="detail-row"><span class="dlbl">Phone</span><span class="dval">${c.phone || "-"}</span></div>
      <div class="detail-row"><span class="dlbl">Location</span><span class="dval">${ex.location || "-"}</span></div>
      <div class="detail-row"><span class="dlbl">Shoot Date</span><span class="dval">${c.shoot_date || "-"}</span></div>
      <div class="detail-row"><span class="dlbl">Timing</span><span class="dval">${ex.timing || "-"}</span></div>
      <div class="detail-row"><span class="dlbl">Advance</span><span class="dval orange">${money(ex.advance)}</span></div>
      <div class="detail-row"><span class="dlbl">Deal Amount</span><span class="dval blue">${money(ex.dealAmount)}</span></div>
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn-edit" onclick="editClient('${c.id}')">Edit</button>
      <button class="btn-delete" onclick="deleteClient('${c.id}')">Delete</button>
    </div>
  `;
  document.getElementById("backdrop").style.display = "block";
  document.getElementById("detail-panel").style.display = "block";
}

async function signInWithGoogle() {
  showLandingPage();
  openAuthCard();
}

async function submitAuth(event) {
  event.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  hideLoginError();

  if (!email || !password) {
    showToast("Please enter email and password.", true);
    showLoginError("Please enter both email and password.");
    return;
  }
  if (!isAllowedEmail(email)) {
    showToast("Access denied for this email.", true);
    showLoginError("This email is not authorized for this app.");
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
    const msg = /invalid login credentials/i.test(result.error.message || "")
      ? "Wrong email or password. Please try again."
      : (result.error.message || "Authentication failed.");
    showToast(msg, true);
    showLoginError(msg);
    return;
  }

  closeAuthCard();
  showToast("Authentication successful.");
  if (result.data?.session?.user) {
    currentUser = result.data.session.user;
    document.getElementById("user-email-display").textContent = currentUser.email || "";
    showAppPage();
    await loadClients();
    switchTab("dashboard");
  }
}

async function signOut() {
  const { error } = await db.auth.signOut();
  if (error) {
    showToast(error.message || "Sign out failed", true);
    return;
  }
  currentUser = null;
  showLoginPage();
}

async function enterApp() {
  if (!currentUser) {
    showToast("Please login first.", true);
    showLoginPage();
    return;
  }
  showAppPage();
  await loadClients();
  switchTab("dashboard");
}

async function initAuth() {
  const { data, error } = await db.auth.getSession();
  if (error) {
    showToast(error.message, true);
    showLoginPage();
    return;
  }
  const session = data?.session;
  if (session?.user) {
    if (!isAllowedEmail(session.user.email)) {
      await db.auth.signOut();
      showToast("This email is not authorized for this app.", true);
      showLoginPage();
      return;
    }
    currentUser = session.user;
    document.getElementById("user-email-display").textContent = currentUser.email || "";
    showAppPage();
    await loadClients();
    switchTab("dashboard");
  } else {
    showLoginPage();
  }

  db.auth.onAuthStateChange(async (_event, nextSession) => {
    currentUser = nextSession?.user || null;
    if (currentUser) {
      if (!isAllowedEmail(currentUser.email)) {
        await db.auth.signOut();
        showToast("This email is not authorized for this app.", true);
        showLoginPage();
        return;
      }
      document.getElementById("user-email-display").textContent = currentUser.email || "";
      showAppPage();
      await loadClients();
      switchTab("dashboard");
    } else {
      showLoginPage();
    }
  });
}

initAuth();