/* =============================================
   UK CREATIONS — CLIENT MANAGER
   js/app.js
============================================= */
/* global supabase */
/* eslint-disable */

const STORAGE_KEY = 'ukcreations_clients';
let clients      = [];
let viewMode     = 'cards';
let pendingClient = null;

/* =============================================
   STORAGE
============================================= */
function loadClients() {
  try {
    clients = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    clients = [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

/* =============================================
   LANDING → APP
============================================= */
function enterApp() {
  document.getElementById('page-landing').classList.remove('active');
  document.getElementById('page-app').classList.add('active');
}

/* =============================================
   HELPER FUNCTIONS
============================================= */
function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(day) + ' ' + months[parseInt(m) - 1] + ' ' + y;
}

function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return (hr % 12 || 12) + ':' + m + ' ' + (hr >= 12 ? 'PM' : 'AM');
}

function shootStatus(shoot) {
  if (!shoot) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(shoot);
  s.setHours(0, 0, 0, 0);
  if (s.getTime() === today.getTime()) return 'today';
  return s > today ? 'upcoming' : 'done';
}

/* =============================================
   CONFLICT DETECTION
============================================= */
function getDateConflicts(shootDate, excludeUid) {
  if (!shootDate) return [];
  return clients.filter(c => c.shoot === shootDate && c.uid !== excludeUid);
}

function getTimingConflicts(shootDate, timing, excludeUid) {
  if (!shootDate || !timing) return [];
  const [h1, m1] = timing.split(':').map(Number);
  const total1   = h1 * 60 + m1;
  return clients.filter(c => {
    if (c.shoot !== shootDate || c.uid === excludeUid || !c.timing) return false;
    const [h2, m2] = c.timing.split(':').map(Number);
    return Math.abs(total1 - (h2 * 60 + m2)) < 60;
  });
}

/* Inline warnings while filling the form */
function checkDateConflict() {
  const shoot = document.getElementById('f-shoot').value;
  const el    = document.getElementById('conflict-date-warn');
  const cf    = getDateConflicts(shoot, null);
  if (cf.length > 0) {
    el.textContent = '⚠️ Date conflict: ' + fmtDate(shoot) + ' already booked — ' +
      cf.map(c => c.name + ' at ' + fmtTime(c.timing)).join(', ');
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
  checkTimingConflict(); // re-check timing too when date changes
}

function checkTimingConflict() {
  const shoot  = document.getElementById('f-shoot').value;
  const timing = document.getElementById('f-timing').value;
  const el     = document.getElementById('conflict-time-warn');
  if (!shoot || !timing) { el.style.display = 'none'; return; }
  const cf = getTimingConflicts(shoot, timing, null);
  if (cf.length > 0) {
    el.textContent = '⏰ Timing conflict: Another shoot within 1 hour — ' +
      cf.map(c => c.name + ' at ' + fmtTime(c.timing)).join(', ');
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

/* =============================================
   TAB SWITCHING
============================================= */
function switchTab(tab) {
  document.getElementById('tab-add').style.display       = tab === 'add'       ? 'block' : 'none';
  document.getElementById('tab-dashboard').style.display = tab === 'dashboard' ? 'block' : 'none';
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'add' && i === 0) || (tab === 'dashboard' && i === 1));
  });
  if (tab === 'dashboard') renderDashboard();
}

function setView(v) {
  viewMode = v;
  document.getElementById('btn-cards').className = 'view-btn' + (v === 'cards' ? ' active' : '');
  document.getElementById('btn-sheet').className = 'view-btn' + (v === 'sheet' ? ' active' : '');
  document.getElementById('cards-view').style.display = v === 'cards' ? 'block' : 'none';
  document.getElementById('sheet-view').style.display = v === 'sheet' ? 'block' : 'none';
  renderDashboard();
}

/* =============================================
   DASHBOARD RENDER
============================================= */
/* =============================================
   UK CREATIONS — CLIENT MANAGER
   js/app.js  |  Supabase + Google Auth Edition
============================================= */
 
/* ── Supabase Setup ── */
const SUPABASE_URL  = 'https://lgdbtfjryuakqpwkkris.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZGJ0ZmpyeXVha3Fwd2trcmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Mzk2ODcsImV4cCI6MjA5MTAxNTY4N30.AAsjHxlSw5EpUiwMedWUgIOPuKZT5g5CBPSBPkSdWI0';
const ALLOWED_EMAIL = 'tanveeralamsab0007@gmail.com';
 
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
 
/* ── State ── */

let clients      = [];
let viewMode     = 'cards';
let pendingClient = null;
let currentUser   = null;
 
/* =============================================
   AUTH — Google Login
============================================= */
async function initAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    handleUser(session.user);
  } else {
    showLoginPage();
  }
 
  db.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      handleUser(session.user);
    } else {
      showLoginPage();
    }
  });
}
 
function handleUser(user) {
  if (user.email !== ALLOWED_EMAIL) {
    db.auth.signOut();
    showAccessDenied();
    return;
  }
  currentUser = user;
  document.getElementById('page-login').classList.remove('active');
  document.getElementById('page-landing').classList.add('active');
  document.getElementById('user-email-display').textContent = user.email;
}
 
async function signInWithGoogle() {
  await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
}
 
async function signOut() {
  await db.auth.signOut();
  clients = [];
  showLoginPage();
}
 
function showLoginPage() {
  document.getElementById('page-login').classList.add('active');
  document.getElementById('page-landing').classList.remove('active');
  document.getElementById('page-app').classList.remove('active');
}
 
function showAccessDenied() {
  document.getElementById('login-error').style.display = 'block';
}
 
/* =============================================
   LANDING → APP
============================================= */
function enterApp() {
  document.getElementById('page-landing').classList.remove('active');
  document.getElementById('page-app').classList.add('active');
  loadClients();
}
 
/* =============================================
   SUPABASE — CRUD
============================================= */
async function loadClients() {
  const { data, error } = await db.from('clients').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  clients = data || [];
  renderDashboard();
}
 
async function saveToSupabase(client) {
  const { error } = await db.from('clients').insert([client]);
  if (error) { console.error(error); alert('Error saving client. Please try again.'); return false; }
  return true;
}
 
async function updateInSupabase(uid, client) {
  const { error } = await db.from('clients').update(client).eq('uid', uid);
  if (error) { console.error(error); alert('Error updating client. Please try again.'); return false; }
  return true;
}
 
async function deleteFromSupabase(uid) {
  const { error } = await db.from('clients').delete().eq('uid', uid);
  if (error) { console.error(error); alert('Error deleting client.'); return false; }
  return true;
}
 
/* =============================================
   HELPER FUNCTIONS
============================================= */
function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
 
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(day) + ' ' + months[parseInt(m) - 1] + ' ' + y;
}
 
function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return (hr % 12 || 12) + ':' + m + ' ' + (hr >= 12 ? 'PM' : 'AM');
}
 
function shootStatus(shoot) {
  if (!shoot) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(shoot);
  s.setHours(0, 0, 0, 0);
  if (s.getTime() === today.getTime()) return 'today';
  return s > today ? 'upcoming' : 'done';
}
 
/* =============================================
   CONFLICT DETECTION
============================================= */
function getDateConflicts(shootDate, excludeUid) {
  if (!shootDate) return [];
  return clients.filter(c => c.shoot === shootDate && c.uid !== excludeUid);
}
 
function getTimingConflicts(shootDate, timing, excludeUid) {
  if (!shootDate || !timing) return [];
  const [h1, m1] = timing.split(':').map(Number);
  const total1   = h1 * 60 + m1;
  return clients.filter(c => {
    if (c.shoot !== shootDate || c.uid === excludeUid || !c.timing) return false;
    const [h2, m2] = c.timing.split(':').map(Number);
    return Math.abs(total1 - (h2 * 60 + m2)) < 60;
  });
}
 
function checkDateConflict() {
  const shoot = document.getElementById('f-shoot').value;
  const editUid = document.getElementById('f-edit-uid').value || null;
  const el    = document.getElementById('conflict-date-warn');
  const cf    = getDateConflicts(shoot, editUid);
  if (cf.length > 0) {
    el.textContent = '⚠️ Date conflict: ' + fmtDate(shoot) + ' already booked — ' +
      cf.map(c => c.name + ' at ' + fmtTime(c.timing)).join(', ');
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
  checkTimingConflict();
}
 
function checkTimingConflict() {
  const shoot  = document.getElementById('f-shoot').value;
  const timing = document.getElementById('f-timing').value;
  const editUid = document.getElementById('f-edit-uid').value || null;
  const el     = document.getElementById('conflict-time-warn');
  if (!shoot || !timing) { el.style.display = 'none'; return; }
  const cf = getTimingConflicts(shoot, timing, editUid);
  if (cf.length > 0) {
    el.textContent = '⏰ Timing conflict: Another shoot within 1 hour — ' +
      cf.map(c => c.name + ' at ' + fmtTime(c.timing)).join(', ');
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}
 
/* =============================================
   TAB SWITCHING
============================================= */
function switchTab(tab) {
  document.getElementById('tab-add').style.display       = tab === 'add'       ? 'block' : 'none';
  document.getElementById('tab-dashboard').style.display = tab === 'dashboard' ? 'block' : 'none';
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'add' && i === 0) || (tab === 'dashboard' && i === 1));
  });
  if (tab === 'dashboard') renderDashboard();
}
 
function setView(v) {
  viewMode = v;
  document.getElementById('btn-cards').className = 'view-btn' + (v === 'cards' ? ' active' : '');
  document.getElementById('btn-sheet').className = 'view-btn' + (v === 'sheet' ? ' active' : '');
  document.getElementById('cards-view').style.display = v === 'cards' ? 'block' : 'none';
  document.getElementById('sheet-view').style.display = v === 'sheet' ? 'block' : 'none';
  renderDashboard();
}
 
/* =============================================
   DASHBOARD RENDER
============================================= */
function renderDashboard() {
  const q = (document.getElementById('search')?.value || '').toLowerCase();
  const filtered = clients.filter(c =>
    (c.name     || '').toLowerCase().includes(q) ||
    (c.cid      || '').toLowerCase().includes(q) ||
    (c.category || '').toLowerCase().includes(q)
  );
 
  const totalAdv  = clients.reduce((s, c) => s + (parseFloat(c.advance)  || 0), 0);
  const totalDeal = clients.reduce((s, c) => s + (parseFloat(c.deal_amt) || 0), 0);
  const upcoming  = clients.filter(c => ['upcoming', 'today'].includes(shootStatus(c.shoot))).length;
  const totalBalance = totalDeal - totalAdv;
 
  document.getElementById('m-total').textContent    = clients.length;
  document.getElementById('m-upcoming').textContent = upcoming;
  document.getElementById('m-adv').textContent      = '₹' + totalAdv.toLocaleString('en-IN');
  document.getElementById('m-deal').textContent     = '₹' + totalDeal.toLocaleString('en-IN');
  document.getElementById('m-balance').textContent  = '₹' + totalBalance.toLocaleString('en-IN');
 
  const sl = { today: 'Today!', upcoming: 'Upcoming', done: 'Done' };
  const cardsEl = document.getElementById('cards-view');
  const sheetEl = document.getElementById('sheet-view');
 
  if (filtered.length === 0) {
    const msg  = clients.length === 0 ? 'No clients yet. Add your first one!' : 'No results found.';
    const html = '<div class="empty"><div class="empty-icon">📸</div><h3>Nothing here</h3><p>' + msg + '</p></div>';
    cardsEl.innerHTML = html;
    sheetEl.innerHTML = html;
    return;
  }
 
  /* --- Cards --- */
  cardsEl.innerHTML = '<div class="cards-grid">' +
    filtered.map(c => {
      const st = shootStatus(c.shoot);
      return '<div class="client-card" onclick="openDetail(\'' + c.uid + '\')">' +
        '<div class="card-top">' +
          '<div class="avatar">' + initials(c.name) + '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="card-name">' + (c.name || '—') + '</div>' +
            '<div class="card-id">'   + (c.cid  || '—') + '</div>' +
          '</div>' +
          (st ? '<span class="badge ' + st + '">' + sl[st] + '</span>' : '') +
        '</div>' +
        (c.category ? '<div><span class="card-category-tag">' + c.category + '</span></div>' : '') +
        '<div class="card-meta">' +
          '<div class="meta-item"><div class="lbl">Advance</div><div class="val orange">₹' + parseFloat(c.advance || 0).toLocaleString('en-IN') + '</div></div>' +
          '<div class="meta-item"><div class="lbl">Deal Amount</div><div class="val blue">₹' + parseFloat(c.deal_amt || 0).toLocaleString('en-IN') + '</div></div>' +
          '<div class="meta-item"><div class="lbl">Shoot Date</div><div class="val">'  + fmtDate(c.shoot) + '</div></div>' +
          '<div class="meta-item"><div class="lbl">Timing</div><div class="val">'      + fmtTime(c.timing) + '</div></div>' +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
 
  /* --- Sheet --- */
  sheetEl.innerHTML = '<div class="table-wrap"><table>' +
    '<thead><tr>' +
      '<th>ID</th><th>Name</th><th>Phone</th><th>Category</th><th>Location</th>' +
      '<th>Advance</th><th>Deal Amt</th><th>Shoot Date</th><th>Timing</th><th>Status</th>' +
    '</tr></thead><tbody>' +
    filtered.map(c => {
      const st = shootStatus(c.shoot);
      return '<tr onclick="openDetail(\'' + c.uid + '\')">' +
        '<td class="id-col">' + (c.cid || '—') + '</td>' +
        '<td><strong>' + (c.name || '—') + '</strong></td>' +
        '<td>' + (c.phone    || '—') + '</td>' +
        '<td>' + (c.category || '—') + '</td>' +
        '<td>' + (c.location || '—') + '</td>' +
        '<td class="money-o">₹' + parseFloat(c.advance || 0).toLocaleString('en-IN') + '</td>' +
        '<td class="money-b">₹' + parseFloat(c.deal_amt || 0).toLocaleString('en-IN') + '</td>' +
        '<td>' + fmtDate(c.shoot)  + '</td>' +
        '<td>' + fmtTime(c.timing) + '</td>' +
        '<td>' + (st ? '<span class="badge ' + st + '" style="font-size:10px;">' + sl[st] + '</span>' : '—') + '</td>' +
      '</tr>';
    }).join('') +
  '</tbody></table></div>';
}
 
/* =============================================
   DETAIL PANEL
============================================= */
function openDetail(uid) {
  const c = clients.find(x => x.uid === uid);
  if (!c) return;
 
  const st = shootStatus(c.shoot);
  const sl = { today: 'Today!', upcoming: 'Upcoming', done: 'Done' };
  const dc = getDateConflicts(c.shoot, uid);
  const tc = getTimingConflicts(c.shoot, c.timing, uid);
 
  let banner = '';
  if (tc.length > 0) {
    banner = '<div style="background:var(--amber-bg);border:1.5px solid #EAC060;border-radius:var(--radius);padding:10px 14px;font-size:13px;color:var(--amber);font-weight:600;margin-bottom:1rem;">' +
      '⏰ Timing conflict: ' + tc.map(x => x.name + ' at ' + fmtTime(x.timing)).join(', ') + '</div>';
  } else if (dc.length > 0) {
    banner = '<div style="background:var(--amber-bg);border:1.5px solid #EAC060;border-radius:var(--radius);padding:10px 14px;font-size:13px;color:var(--amber);font-weight:600;margin-bottom:1rem;">' +
      '⚠️ ' + dc.length + ' other shoot(s) on this date: ' + dc.map(x => x.name).join(', ') + '</div>';
  }
 
  document.getElementById('detail-content').innerHTML =
    '<div class="detail-avatar">' + initials(c.name) + '</div>' +
    '<div class="detail-name">' + (c.name || '—') +
      (st ? '&nbsp;<span class="badge ' + st + '" style="font-size:12px;margin-left:8px;">' + sl[st] + '</span>' : '') +
    '</div>' +
    '<div class="detail-sub">ID: <strong>' + (c.cid || '—') + '</strong>' +
      (c.category ? ' &nbsp;·&nbsp; <span style="color:var(--orange);font-weight:700;">' + c.category + '</span>' : '') +
    '</div>' +
    banner +
    '<div class="detail-section">' +
      '<div class="detail-row"><span class="dlbl">Contact</span><span class="dval">'  + (c.phone    || '—') + '</span></div>' +
      '<div class="detail-row"><span class="dlbl">Location</span><span class="dval">' + (c.location || '—') + '</span></div>' +
    '</div>' +
    '<div class="detail-section">' +
      '<div class="detail-row"><span class="dlbl">Advance Taken</span><span class="dval orange">₹' + parseFloat(c.advance || 0).toLocaleString('en-IN') + '</span></div>' +
      '<div class="detail-row"><span class="dlbl">Deal Finalization</span><span class="dval blue">₹' + parseFloat(c.deal_amt || 0).toLocaleString('en-IN') + '</span></div>' +
      '<div class="detail-row"><span class="dlbl">Deal Fixed Date</span><span class="dval">' + fmtDate(c.deal) + '</span></div>' +
    '</div>' +
    '<div class="detail-section">' +
      '<div class="detail-row"><span class="dlbl">Shoot Date</span><span class="dval">'   + fmtDate(c.shoot)    + '</span></div>' +
      '<div class="detail-row"><span class="dlbl">Shoot Timing</span><span class="dval">' + fmtTime(c.timing)   + '</span></div>' +
      '<div class="detail-row"><span class="dlbl">Category</span><span class="dval">'     + (c.category || '—') + '</span></div>' +
    '</div>' +
    '<div class="detail-section">' +
      '<div class="detail-row"><span class="dlbl">Added On</span><span class="dval">' + fmtDate(c.created) + '</span></div>' +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:1rem;">' +
      '<button class="btn-edit" onclick="editClient(\'' + uid + '\')">✏️ Edit Client</button>' +
      '<button class="btn-delete" onclick="deleteClient(\'' + uid + '\')">Delete</button>' +
    '</div>';
 
  document.getElementById('backdrop').style.display     = 'block';
  document.getElementById('detail-panel').style.display = 'block';
}
 
function closeDetail() {
  document.getElementById('backdrop').style.display     = 'none';
  document.getElementById('detail-panel').style.display = 'none';
}
 
async function deleteClient(uid) {
  if (!confirm('Delete this client? This cannot be undone.')) return;
  const ok = await deleteFromSupabase(uid);
  if (ok) {
    clients = clients.filter(c => c.uid !== uid);
    closeDetail();
    renderDashboard();
  }
}
 
/* =============================================
   EDIT CLIENT
============================================= */
function editClient(uid) {
  const c = clients.find(x => x.uid === uid);
  if (!c) return;
  closeDetail();
  switchTab('add');
 
  document.getElementById('f-edit-uid').value    = c.uid;
  document.getElementById('f-id').value          = c.cid      || '';
  document.getElementById('f-name').value        = c.name     || '';
  document.getElementById('f-phone').value       = c.phone    || '';
  document.getElementById('f-loc').value         = c.location || '';
  document.getElementById('f-category').value    = c.category || '';
  document.getElementById('f-timing').value      = c.timing   || '';
  document.getElementById('f-adv').value         = c.advance  || '';
  document.getElementById('f-deal-amt').value    = c.deal_amt || '';
  document.getElementById('f-deal').value        = c.deal     || '';
  document.getElementById('f-shoot').value       = c.shoot    || '';
 
  document.getElementById('form-section-title').textContent = 'Edit Client Entry';
  document.getElementById('btn-save-client').textContent    = 'Update Client';
}
 
function resetForm() {
  document.getElementById('f-edit-uid').value = '';
  ['f-id','f-name','f-phone','f-loc','f-timing','f-adv','f-deal-amt','f-deal','f-shoot'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f-category').value = '';
  document.getElementById('conflict-date-warn').style.display = 'none';
  document.getElementById('conflict-time-warn').style.display = 'none';
  document.getElementById('form-section-title').textContent = 'New Client Entry';
  document.getElementById('btn-save-client').textContent    = 'Save Client';
}
 
/* =============================================
   SAVE / UPDATE CLIENT
============================================= */
function buildClientObj() {
  return {
    uid:      document.getElementById('f-edit-uid').value || Date.now().toString(),
    cid:      document.getElementById('f-id').value.trim(),
    name:     document.getElementById('f-name').value.trim(),
    phone:    document.getElementById('f-phone').value.trim(),
    location: document.getElementById('f-loc').value.trim(),
    category: document.getElementById('f-category').value,
    timing:   document.getElementById('f-timing').value,
    advance:  document.getElementById('f-adv').value.trim(),
    deal_amt: document.getElementById('f-deal-amt').value.trim(),
    deal:     document.getElementById('f-deal').value,
    shoot:    document.getElementById('f-shoot').value,
    created:  new Date().toISOString().split('T')[0]
  };
}
 
async function saveClient() {
  const cid  = document.getElementById('f-id').value.trim();
  const name = document.getElementById('f-name').value.trim();
  if (!cid || !name) {
    alert('Please enter at least a Client ID and Name.');
    return;
  }
 
  const editUid = document.getElementById('f-edit-uid').value || null;
  const shoot   = document.getElementById('f-shoot').value;
  const timing  = document.getElementById('f-timing').value;
 
  const tc = getTimingConflicts(shoot, timing, editUid);
  if (tc.length > 0) {
    pendingClient = buildClientObj();
    document.getElementById('modal-title').textContent = 'Timing Conflict Detected!';
    document.getElementById('modal-body').textContent  = 'Another shoot is within 1 hour on ' + fmtDate(shoot) + ':';
    document.getElementById('modal-conflict-list').innerHTML = tc.map(c =>
      '<div class="modal-conflict-card">' +
        '<div class="modal-conflict-name">' + c.name + '</div>' +
        '<div class="modal-conflict-detail">' + (c.category || 'Shoot') + ' · ' + fmtTime(c.timing) + ' · ' + (c.location || '—') + '</div>' +
      '</div>'
    ).join('');
    document.getElementById('conflict-modal').classList.add('show');
    return;
  }
 
  const dc = getDateConflicts(shoot, editUid);
  if (dc.length > 0) {
    pendingClient = buildClientObj();
    document.getElementById('modal-title').textContent = 'Date Conflict!';
    document.getElementById('modal-body').textContent  = 'Already have a shoot booked on ' + fmtDate(shoot) + ':';
    document.getElementById('modal-conflict-list').innerHTML = dc.map(c =>
      '<div class="modal-conflict-card">' +
        '<div class="modal-conflict-name">' + c.name + '</div>' +
        '<div class="modal-conflict-detail">' + (c.category || 'Shoot') + ' · ' + fmtTime(c.timing) + ' · ' + (c.location || '—') + '</div>' +
      '</div>'
    ).join('');
    document.getElementById('conflict-modal').classList.add('show');
    return;
  }
 
  await doSave(buildClientObj());
}
 
function closeConflictModal() {
  document.getElementById('conflict-modal').classList.remove('show');
  pendingClient = null;
}
 
async function proceedSave() {
  if (pendingClient) { await doSave(pendingClient); pendingClient = null; }
  document.getElementById('conflict-modal').classList.remove('show');
}
 
async function doSave(client) {
  const isEdit = !!document.getElementById('f-edit-uid').value;
  let ok = false;
 
  if (isEdit) {
    const uid = client.uid;
    ok = await updateInSupabase(uid, client);
    if (ok) {
      const idx = clients.findIndex(c => c.uid === uid);
      if (idx !== -1) clients[idx] = client;
    }
  } else {
    ok = await saveToSupabase(client);
    if (ok) clients.unshift(client);
  }
 
  if (!ok) return;
 
  resetForm();
 
  const toast = document.getElementById('toast');
  toast.textContent = isEdit ? '✓  Client updated successfully!' : '✓  Client saved successfully!';
  toast.style.display = 'flex';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
 
  renderDashboard();
}
 
/* =============================================
   INIT
============================================= */
initAuth();