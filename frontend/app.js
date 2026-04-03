// =================== Constants ===================
// Empty string = relative URL → works on localhost AND any deployment host
const API = "";

// =================== Page Switching ===================
function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("page-" + page);
  if (target) target.classList.add("active");
  if (page === "dashboard") loadDashboard();
}

// =================== Alerts ===================
// FIX: original CSS uses .alert.success / .alert.error (not .alert-success)
function showAlert(id, message, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = "alert " + (type === "success" ? "success" : "error");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// =================== Toast ===================
// FIX: original CSS uses .toast.success / .toast.error (not .toast-success)
function showToast(message, type) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast " + (type === "error" ? "error" : "success");
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// =================== Auth Helpers ===================
function getToken() { return localStorage.getItem("token"); }

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")); }
  catch { return null; }
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getToken()
  };
}

// =================== Login ===================
async function doLogin() {
  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showAlert("loginAlert", "Please enter email and password.", "error");
    return;
  }

  try {
    const res  = await fetch(API + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      updateNav(data.user);
      showPage("dashboard");
    } else {
      showAlert("loginAlert", data.message || "Login failed.", "error");
    }
  } catch (err) {
    console.error(err);
    showAlert("loginAlert", "Cannot reach server. Is it running?", "error");
  }
}

// =================== Register ===================
async function doRegister() {
  const name     = document.getElementById("regName").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const city     = document.getElementById("regCity").value.trim();
  const role     = document.querySelector('input[name="regRole"]:checked')?.value;

  if (!name || !email || !password || !city || !role) {
    showAlert("registerAlert", "Please fill all fields and select a role.", "error");
    return;
  }

  try {
    const res  = await fetch(API + "/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, city, role })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      updateNav(data.user);
      showPage("dashboard");
    } else {
      showAlert("registerAlert", data.message || "Registration failed.", "error");
    }
  } catch (err) {
    console.error(err);
    showAlert("registerAlert", "Cannot reach server. Is it running?", "error");
  }
}

// =================== Navbar ===================
function updateNav(user) {
  document.getElementById("navLogin").classList.add("hidden");
  document.getElementById("navRegister").classList.add("hidden");
  document.getElementById("navDashboard").classList.remove("hidden");
  document.getElementById("navLogout").classList.remove("hidden");
  document.getElementById("navUser").classList.remove("hidden");
  document.getElementById("navUser").textContent = user.name;
}

// =================== Logout ===================
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  document.getElementById("navLogin").classList.remove("hidden");
  document.getElementById("navRegister").classList.remove("hidden");
  document.getElementById("navDashboard").classList.add("hidden");
  document.getElementById("navLogout").classList.add("hidden");
  document.getElementById("navUser").classList.add("hidden");
  showPage("home");
}

// =================== Modals ===================
function openModal(id)  { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

// =================== Tab Switching ===================
// FIX: pass event explicitly from onclick rather than relying on bare global `event`
function switchTab(role, tab, btn) {
  document.querySelectorAll(`[id^="${role}-tab-"]`).forEach(el => el.classList.add("hidden"));
  const target = document.getElementById(`${role}-tab-${tab}`);
  if (target) target.classList.remove("hidden");

  const tabBar = document.querySelector(`#${role}-dashboard .tab-bar`);
  if (tabBar) {
    tabBar.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }
}

// =================== Dashboard Loader ===================
function loadDashboard() {
  const user = getUser();
  if (!user) { showPage("login"); return; }

  document.querySelectorAll(".dashboard").forEach(d => d.classList.add("hidden"));

  if (user.role === "ngo") {
    document.getElementById("ngo-dashboard").classList.remove("hidden");
    document.getElementById("ngoGreeting").textContent = `Welcome, ${user.name}!`;
    loadNgoRequests();
    loadNgoDonations();
  } else if (user.role === "donor") {
    document.getElementById("donor-dashboard").classList.remove("hidden");
    document.getElementById("donorGreeting").textContent = `Welcome, ${user.name}!`;
    loadAllRequestsForDonor();
    loadDonorDonations();
  } else if (user.role === "admin") {
    document.getElementById("admin-dashboard").classList.remove("hidden");
    document.getElementById("adminGreeting").textContent = `Welcome, ${user.name}!`;
    loadAdminDonations();
    loadAdminRequests();
  }
}

// =================== Badge Helpers ===================
function urgencyBadge(urgency) {
  const map = {
    low:      { cls: "badge-requested", label: "🟢 Low" },
    medium:   { cls: "badge-pending",   label: "🟡 Medium" },
    high:     { cls: "badge-donated",   label: "🟠 High" },
    critical: { cls: "badge-rejected",  label: "🔴 Critical" }
  };
  const u = map[urgency] || { cls: "", label: urgency };
  return `<span class="badge ${u.cls}">${u.label}</span>`;
}

function statusBadge(status) {
  const map = {
    requested: "badge-requested",
    pending:   "badge-pending",
    approved:  "badge-approved",
    rejected:  "badge-rejected",
    completed: "badge-completed",
    fulfilled: "badge-approved",
    donated:   "badge-donated"
  };
  const cls = map[status] || "";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return `<span class="badge ${cls}">${label}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

// FIX: escape strings used inside onclick="..." attributes to prevent
// JS injection when medicine names contain quotes or apostrophes
function esc(str) {
  if (!str) return "";
  return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// =================== NGO: My Requests ===================
async function loadNgoRequests() {
  const user = getUser();
  const container = document.getElementById("ngoRequestsList");
  container.innerHTML = '<p class="loading-text">Loading requests…</p>';

  try {
    const res  = await fetch(API + "/api/requests", { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) { container.innerHTML = `<p class="empty-text">${data.message}</p>`; return; }

    const mine = data.requests.filter(r => String(r.ngo_id) === String(user._id));

    if (!mine.length) {
      container.innerHTML = '<p class="empty-text">No requests yet. Click "+ New Request" to post one.</p>';
      return;
    }

    container.innerHTML = mine.map(r => `
      <div class="card">
        <div class="card-top">
          <span class="card-title">${r.medicine_name}</span>
          ${urgencyBadge(r.urgency)}
        </div>
        <div class="card-meta">
          <span>📦 ${r.quantity} units</span>
          <span>📍 ${r.city}</span>
          <span>🗓 ${formatDate(r.createdAt)}</span>
        </div>
        <div class="card-footer">${statusBadge(r.status)}</div>
      </div>`).join("");
  } catch (err) {
    container.innerHTML = '<p class="empty-text">Failed to load requests.</p>';
    console.error(err);
  }
}

// =================== NGO: Incoming Donations ===================
async function loadNgoDonations() {
  const container = document.getElementById("ngoDonationsList");
  container.innerHTML = '<p class="loading-text">Loading donations…</p>';

  try {
    const res  = await fetch(API + "/api/donations", { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) { container.innerHTML = `<p class="empty-text">${data.message}</p>`; return; }

    if (!data.donations.length) {
      container.innerHTML = '<p class="empty-text">No incoming donations yet.</p>';
      return;
    }

    container.innerHTML = data.donations.map(d => `
      <div class="card">
        <div class="card-top">
          <span class="card-title">${d.medicine_name}</span>
          ${statusBadge(d.status)}
        </div>
        <div class="card-meta">
          <span>📦 ${d.quantity} units</span>
          <span>👤 ${d.donor_name || "Unknown donor"}</span>
          <span>🗓 ${formatDate(d.createdAt)}</span>
        </div>
        ${d.admin_note ? `<p class="card-note">📝 ${d.admin_note}</p>` : ""}
        ${d.status === "approved" ? `
          <div class="card-footer">
            <button class="btn-success btn-sm" onclick="confirmReceipt('${esc(String(d._id))}')">✅ Confirm Receipt</button>
          </div>` : ""}
      </div>`).join("");
  } catch (err) {
    container.innerHTML = '<p class="empty-text">Failed to load donations.</p>';
    console.error(err);
  }
}

// NGO confirms receipt
async function confirmReceipt(donationId) {
  try {
    const res  = await fetch(API + `/api/confirm/${donationId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (data.success) {
      showToast("Receipt confirmed!", "success");
      loadNgoDonations();
      loadNgoRequests();
    } else {
      showToast(data.message || "Failed to confirm.", "error");
    }
  } catch (err) {
    showToast("Failed to confirm receipt.", "error");
  }
}

// =================== DONOR: Browse Requests ===================
let selectedRequestId = null;

async function loadAllRequestsForDonor() {
  const container = document.getElementById("donorRequestsList");
  container.innerHTML = '<p class="loading-text">Loading requests…</p>';

  try {
    const res  = await fetch(API + "/api/requests", { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) { container.innerHTML = `<p class="empty-text">${data.message}</p>`; return; }

    const open = data.requests.filter(r => r.status === "requested" || r.status === "pending");

    if (!open.length) {
      container.innerHTML = '<p class="empty-text">No open requests at the moment.</p>';
      return;
    }

    // FIX: use esc() so medicine names with ' or " don't break onclick attributes
    container.innerHTML = open.map(r => `
      <div class="card">
        <div class="card-top">
          <span class="card-title">${r.medicine_name}</span>
          ${urgencyBadge(r.urgency)}
        </div>
        <div class="card-meta">
          <span>📦 ${r.quantity} units needed</span>
          <span>📍 ${r.city}</span>
          <span>🏥 ${r.ngo_name || "NGO"}</span>
          <span>🗓 ${formatDate(r.createdAt)}</span>
        </div>
        <div class="card-footer">
          ${statusBadge(r.status)}
          <button class="btn-primary btn-sm"
            onclick="openDonateModal('${esc(String(r._id))}','${esc(r.medicine_name)}','${esc(r.city)}','${r.quantity}')">
            Donate
          </button>
        </div>
      </div>`).join("");
  } catch (err) {
    container.innerHTML = '<p class="empty-text">Failed to load requests.</p>';
    console.error(err);
  }
}

function openDonateModal(requestId, medicine, city, quantity) {
  selectedRequestId = requestId;
  document.getElementById("donateRequestContext").innerHTML = `
    <div class="context-info">
      <strong>Responding to:</strong> ${medicine} &nbsp;|&nbsp; 📍 ${city} &nbsp;|&nbsp; 📦 ${quantity} units needed
    </div>`;
  document.getElementById("donMedicine").value = medicine;
  openModal("donateModal");
}

async function submitDonation() {
  const medicine_name = document.getElementById("donMedicine").value.trim();
  const quantity      = document.getElementById("donQuantity").value;
  const expiry_date   = document.getElementById("donExpiry").value;
  const condition     = document.getElementById("donCondition").value;
  const note          = document.getElementById("donNote").value.trim();

  if (!medicine_name || !quantity) {
    showAlert("donateModalAlert", "Medicine name and quantity are required.", "error");
    return;
  }

  try {
    const res  = await fetch(API + "/api/donate", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ request_id: selectedRequestId, medicine_name, quantity, expiry_date, condition, note })
    });
    const data = await res.json();

    if (data.success) {
      closeModal("donateModal");
      // reset donate form
      ["donMedicine","donQuantity","donExpiry","donNote"].forEach(id => document.getElementById(id).value = "");
      document.getElementById("donCondition").value = "";
      showToast("Donation submitted! Awaiting admin review.", "success");
      loadAllRequestsForDonor();
      loadDonorDonations();
    } else {
      showAlert("donateModalAlert", data.message || "Submission failed.", "error");
    }
  } catch (err) {
    showAlert("donateModalAlert", "Server error. Try again.", "error");
    console.error(err);
  }
}

// =================== DONOR: My Donations ===================
async function loadDonorDonations() {
  const container = document.getElementById("donorDonationsList");
  container.innerHTML = '<p class="loading-text">Loading your donations…</p>';

  try {
    const res  = await fetch(API + "/api/donations", { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) { container.innerHTML = `<p class="empty-text">${data.message}</p>`; return; }

    if (!data.donations.length) {
      container.innerHTML = '<p class="empty-text">You haven\'t donated yet.</p>';
      return;
    }

    container.innerHTML = data.donations.map(d => `
      <div class="card">
        <div class="card-top">
          <span class="card-title">${d.medicine_name}</span>
          ${statusBadge(d.status)}
        </div>
        <div class="card-meta">
          <span>📦 ${d.quantity} units</span>
          <span>🏥 ${d.ngo_name || "NGO"}</span>
          <span>🗓 ${formatDate(d.createdAt)}</span>
        </div>
        ${d.admin_note ? `<p class="card-note">📝 Admin note: ${d.admin_note}</p>` : ""}
      </div>`).join("");
  } catch (err) {
    container.innerHTML = '<p class="empty-text">Failed to load donations.</p>';
    console.error(err);
  }
}

// =================== NGO: Submit Request ===================
async function submitRequest() {
  const medicine_name = document.getElementById("reqMedicine").value.trim();
  const quantity      = document.getElementById("reqQuantity").value;
  const city          = document.getElementById("reqCity").value.trim();
  const urgency       = document.getElementById("reqUrgency").value;

  if (!medicine_name || !quantity || !city || !urgency) {
    showAlert("requestModalAlert", "Please fill all fields.", "error");
    return;
  }

  try {
    const res  = await fetch(API + "/api/request", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ medicine_name, quantity, city, urgency })
    });
    const data = await res.json();

    if (data.success) {
      closeModal("createRequestModal");
      ["reqMedicine","reqQuantity","reqCity"].forEach(id => document.getElementById(id).value = "");
      document.getElementById("reqUrgency").value = "";
      showToast("Request posted successfully!", "success");
      loadNgoRequests();
    } else {
      showAlert("requestModalAlert", data.message || "Failed to submit request.", "error");
    }
  } catch (err) {
    showAlert("requestModalAlert", "Server error. Try again.", "error");
    console.error(err);
  }
}

// =================== ADMIN: Donations ===================
let currentDonationId = null;

async function loadAdminDonations() {
  try {
    const res  = await fetch(API + "/api/donations", { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) return;

    const pending = data.donations.filter(d => d.status === "pending");
    renderAdminDonations("adminPendingList", pending, true);
    renderAdminDonations("adminAllList", data.donations, false);
  } catch (err) {
    console.error("Admin donations error:", err);
  }
}

function renderAdminDonations(containerId, donations, showActions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!donations.length) {
    container.innerHTML = '<p class="empty-text">No donations to show.</p>';
    return;
  }

  // FIX: esc() prevents broken onclick when donor name has apostrophe
  container.innerHTML = donations.map(d => `
    <div class="card">
      <div class="card-top">
        <span class="card-title">${d.medicine_name}</span>
        ${statusBadge(d.status)}
      </div>
      <div class="card-meta">
        <span>📦 ${d.quantity} units</span>
        <span>👤 ${d.donor_name || "Donor"}</span>
        <span>🏥 ${d.ngo_name || "NGO"}</span>
        <span>🗓 ${formatDate(d.createdAt)}</span>
      </div>
      ${d.condition  ? `<p class="card-note">Condition: ${d.condition}</p>` : ""}
      ${d.note       ? `<p class="card-note">Note: ${d.note}</p>` : ""}
      ${d.admin_note ? `<p class="card-note">Admin note: ${d.admin_note}</p>` : ""}
      ${showActions && d.status === "pending" ? `
        <div class="card-footer">
          <button class="btn-success btn-sm"
            onclick="openApproveModal('${esc(String(d._id))}','${esc(d.medicine_name)}','${esc(d.donor_name || "")}',${d.quantity})">
            ✓ Approve
          </button>
          <button class="btn-danger btn-sm"
            onclick="openRejectModal('${esc(String(d._id))}')">
            ✕ Reject
          </button>
        </div>` : ""}
    </div>`).join("");
}

async function loadAdminRequests() {
  const container = document.getElementById("adminRequestsList");
  container.innerHTML = '<p class="loading-text">Loading…</p>';

  try {
    const res  = await fetch(API + "/api/requests", { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) { container.innerHTML = `<p class="empty-text">${data.message}</p>`; return; }

    if (!data.requests.length) {
      container.innerHTML = '<p class="empty-text">No requests posted yet.</p>';
      return;
    }

    container.innerHTML = data.requests.map(r => `
      <div class="card">
        <div class="card-top">
          <span class="card-title">${r.medicine_name}</span>
          ${urgencyBadge(r.urgency)}
        </div>
        <div class="card-meta">
          <span>📦 ${r.quantity} units</span>
          <span>📍 ${r.city}</span>
          <span>🏥 ${r.ngo_name || "NGO"}</span>
          <span>🗓 ${formatDate(r.createdAt)}</span>
        </div>
        <div class="card-footer">${statusBadge(r.status)}</div>
      </div>`).join("");
  } catch (err) {
    container.innerHTML = '<p class="empty-text">Failed to load requests.</p>';
  }
}

// =================== Approve Modal ===================
function openApproveModal(id, medicine, donor, qty) {
  currentDonationId = id;
  document.getElementById("approveDonationDetail").innerHTML = `
    <p><strong>Medicine:</strong> ${medicine}</p>
    <p><strong>Donor:</strong> ${donor}</p>
    <p><strong>Quantity:</strong> ${qty} units</p>`;
  document.getElementById("approveNote").value = "";
  openModal("approveModal");
}

async function confirmApprove() {
  const admin_note = document.getElementById("approveNote").value.trim();
  try {
    const res  = await fetch(API + `/api/approve/${currentDonationId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ admin_note })
    });
    const data = await res.json();
    if (data.success) {
      closeModal("approveModal");
      showToast("Donation approved!", "success");
      loadAdminDonations();
    } else {
      showAlert("approveModalAlert", data.message || "Failed to approve.", "error");
    }
  } catch (err) {
    showAlert("approveModalAlert", "Server error.", "error");
  }
}

// =================== Reject Modal ===================
function openRejectModal(id) {
  currentDonationId = id;
  document.getElementById("rejectReason").value = "";
  openModal("rejectModal");
}

async function confirmReject() {
  const reason = document.getElementById("rejectReason").value.trim();
  if (!reason) {
    showAlert("rejectModalAlert", "Please provide a reason for rejection.", "error");
    return;
  }
  try {
    const res  = await fetch(API + `/api/reject/${currentDonationId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (data.success) {
      closeModal("rejectModal");
      showToast("Donation rejected.", "error");
      loadAdminDonations();
    } else {
      showAlert("rejectModalAlert", data.message || "Failed to reject.", "error");
    }
  } catch (err) {
    showAlert("rejectModalAlert", "Server error.", "error");
  }
}

// =================== On Page Load ===================
window.addEventListener("DOMContentLoaded", () => {
  const user  = getUser();
  const token = getToken();
  if (user && token) {
    updateNav(user);
    showPage("dashboard");
  } else {
    showPage("home");
  }
});
