import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lifeflow_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function registerDonor(data) {
  return api.post("/auth/register/donor", data);
}

export function registerHospital(data) {
  return api.post("/auth/register/hospital", data);
}

export function registerReceiver(data) {
  return api.post("/auth/register/receiver", data);
}

export function loginDonor(email, password) {
  return api.post("/auth/login/donor", { email, password });
}

export function loginHospital(email, password) {
  return api.post("/auth/login/hospital", { email, password });
}

export function loginReceiver(email, password) {
  return api.post("/auth/login/receiver", { email, password });
}

export function loginAdmin(email, password) {
  return api.post("/auth/login/admin", { email, password });
}
export function getMyAdminProfile() {
  return api.get("/admin/me");
}
export function changeAdminCredentials(currentPassword, newEmail, newFullName, newPassword) {
  return api.post("/admin/change-credentials", {
    current_password: currentPassword,
    new_email: newEmail,
    new_full_name: newFullName || null,
    new_password: newPassword,
  });
}

export function loginStaff(email, password) {
  return api.post("/auth/login/staff", { email, password });
}

export function getMyDonorProfile() {
  return api.get("/donors/me");
}

export function getMyHospitalProfile() {
  return api.get("/hospitals/me");
}

export function getMyReceiverProfile() {
  return api.get("/receivers/me");
}

export function createHospitalRequest(data) {
  return api.post("/requests/hospital", data);
}

export function createReceiverRequest(data) {
  return api.post("/requests/receiver", data);
}

export function listBloodRequests() {
  return api.get("/requests");
}

export function getHospitalRequestHistory() {
  return api.get("/requests/hospital/history");
}

export function getReceiverRequestHistory() {
  return api.get("/requests/receiver/history");
}

export function getMatches(requestId) {
  return api.get(`/matching/${requestId}`);
}

export function acceptRequest(requestId, unitsDonated = 1) {
  return api.post(`/matching/${requestId}/accept`, { units_donated: unitsDonated });
}

export function logout() {
  localStorage.removeItem("lifeflow_token");
  localStorage.removeItem("lifeflow_role");
}

// ---- Donation history (full details of the other side, for every role) ----
export function getDonorDonationHistory() {
  return api.get("/donations/donor/history");
}
export function getHospitalDonationHistory() {
  return api.get("/donations/hospital/history");
}
export function getReceiverDonationHistory() {
  return api.get("/donations/receiver/history");
}

// ---- Notifications ----
export function getDonorNotifications() {
  return api.get("/notifications/donor");
}
export function getHospitalNotifications() {
  return api.get("/notifications/hospital");
}
export function getReceiverNotifications() {
  return api.get("/notifications/receiver");
}
export function markAllNotificationsRead(role) {
  return api.post(`/notifications/${role}/read-all`);
}

// ---- Ratings ----
export function rateDonor(donationId, stars, comment) {
  return api.post(`/ratings/${donationId}/rate-donor`, { stars, comment });
}
export function rateRequester(donationId, stars, comment) {
  return api.post(`/ratings/${donationId}/rate-requester`, { stars, comment });
}
export function getDonorRatings(donorId) {
  return api.get(`/ratings/donor/${donorId}`);
}
export function getRequesterRatings(role, requesterId) {
  return api.get(`/ratings/requester/${role}/${requesterId}`);
}

// ---- Blood inventory (hospital blood bank stock) ----
export function getMyInventory() {
  return api.get("/inventory/me");
}
export function updateMyInventory(item) {
  return api.put("/inventory/me", item);
}
export function getAllHospitalInventories() {
  return api.get("/inventory");
}

// ---- Donation camps / drives ----
export function createCamp(data) {
  return api.post("/camps", data);
}
export function listUpcomingCamps() {
  return api.get("/camps");
}
export function listMyCamps() {
  return api.get("/camps/mine");
}
export function listCampRsvps(campId) {
  return api.get(`/camps/${campId}/rsvps`);
}
export function rsvpToCamp(campId) {
  return api.post(`/camps/${campId}/rsvp`);
}
export function listMyRsvps() {
  return api.get("/camps/mine/rsvps");
}

// ---- Stats, badges, leaderboard ----
export function getDonorStats() {
  return api.get("/donors/me/stats");
}
export function getHospitalStats() {
  return api.get("/hospitals/me/stats");
}
export function getReceiverStats() {
  return api.get("/receivers/me/stats");
}
export function getDonorLeaderboard() {
  return api.get("/leaderboard/donors");
}

export function getPlatformStats() {
  return api.get("/stats/platform");
}

// ---- Admin: full visibility across every donor, hospital, and patient ----
export function getAllDonorsAdmin() {
  return api.get("/admin/donors");
}
export function getAllHospitalsAdmin() {
  return api.get("/admin/hospitals");
}
export function getAllReceiversAdmin() {
  return api.get("/admin/receivers");
}
export function getAllRequestsAdmin() {
  return api.get("/admin/requests");
}
export function getAllDonationsAdmin() {
  return api.get("/admin/donations");
}
export function getAllNotificationsAdmin() {
  return api.get("/admin/notifications");
}
export function getDonorHistoryAdmin(donorId) {
  return api.get(`/admin/donor/${donorId}/history`);
}
export function getHospitalHistoryAdmin(hospitalId) {
  return api.get(`/admin/hospital/${hospitalId}/history`);
}
export function getReceiverHistoryAdmin(receiverId) {
  return api.get(`/admin/receiver/${receiverId}/history`);
}
export function getAllStaffAdmin() {
  return api.get("/admin/staff");
}
export function getStaffHistoryAdmin(staffId) {
  return api.get(`/admin/staff/${staffId}/visitors`);
}

// ---- Hospital staff & shifts ----
export function createStaff(data) {
  return api.post("/staff", data);
}
export function listMyStaff() {
  return api.get("/staff");
}
export function removeStaff(staffId) {
  return api.delete(`/staff/${staffId}`);
}
export function getHospitalAllVisitors() {
  return api.get("/staff/hospital/visitors");
}
export function getMyStaffProfile() {
  return api.get("/staff/me");
}
export function logVisitor(data) {
  return api.post("/staff/visitors", data);
}
export function getMyVisitorEntries() {
  return api.get("/staff/visitors/mine");
}

// ---- AI features ----
export function getAiStatus() {
  return api.get("/ai/status");
}
export function parseRequestText(text, latitude, longitude) {
  return api.post("/ai/parse-request", { text, latitude, longitude });
}
export function transcribeAudio(blob) {
  const form = new FormData();
  form.append("file", blob, "recording.webm");
  return api.post("/ai/transcribe", form);
}
export function askDonorAssistant(message) {
  return api.post("/ai/assistant/donor", { message });
}
export function askGuestAssistant(message) {
  return api.post("/ai/assistant/guest", { message });
}
export function askReceiverAssistant(message) {
  return api.post("/ai/assistant/receiver", { message });
}
export function askHospitalAssistant(message) {
  return api.post("/ai/assistant/hospital", { message });
}
export function askAdminAssistant(message) {
  return api.post("/ai/assistant/admin", { message });
}
export function askStaffAssistant(message) {
  return api.post("/ai/assistant/staff", { message });
}
export function getHospitalForecast() {
  return api.get("/ai/forecast/hospital");
}
export function getPlatformForecast() {
  return api.get("/ai/forecast/platform");
}

// ---- Admin verification + audit + delivery status ----
export function getPendingHospitals() { return api.get("/admin/verification/hospitals/pending"); }
export function approveHospital(id) { return api.post(`/admin/verification/hospitals/${id}/approve`); }
export function rejectHospital(id) { return api.post(`/admin/verification/hospitals/${id}/reject`); }
export function getPendingDonors() { return api.get("/admin/verification/donors/pending"); }
export function clearDonor(id, notes = "") { return api.post(`/admin/verification/donors/${id}/clear`, null, { params: { notes } }); }
export function flagDonor(id, notes = "") { return api.post(`/admin/verification/donors/${id}/flag`, null, { params: { notes } }); }
export function verifyAuditChain() { return api.get("/admin/audit/verify"); }
export function getAuditLog() { return api.get("/admin/audit/log"); }
export function getDeliveryStatus() { return api.get("/admin/delivery-status"); }

// ---- AI decision support ----
export function getNoShowPlan(requestId) { return api.get(`/ai/no-show-plan/${requestId}`); }
export function getAllocation() { return api.get("/ai/allocation"); }
export function getForecastAccuracy() { return api.get("/ai/forecast-accuracy"); }
export function getImpact() { return api.get("/ai/impact"); }
export function askDataAssistant(message) { return api.post("/ai/data-assistant", { message }); }
export function verifyDocument(docType, claimedNumber, file) {
  const form = new FormData();
  form.append("doc_type", docType);
  form.append("claimed_number", claimedNumber);
  form.append("file", file);
  return api.post("/ai/verify-document", form);
}

// ---- Push notifications ----
export function getPushStatus() { return api.get("/push/status"); }
export function subscribePush(subscription) { return api.post("/push/subscribe", subscription); }

// ---- Sentiment / flagged ratings ----
export function getFlaggedRatings() { return api.get("/ratings/flagged"); }

// ---- Donor re-engagement ----
export function getReengagementCandidates(hospitalId) {
  return api.get("/ai/re-engagement/candidates", { params: hospitalId ? { hospital_id: hospitalId } : {} });
}
export function draftReengagementMessage(donorId) { return api.get(`/ai/re-engagement/draft/${donorId}`); }
export function sendReengagementMessage(donorId, message) {
  return api.post("/ai/re-engagement/send", { donor_id: donorId, message });
}

// ---- Camp location suggestions ----
export function getCampSuggestions(days = 60) { return api.get("/ai/camp-suggestions", { params: { days } }); }

// ---- Reporting export ----
export function getReportSummary(params) { return api.get("/admin/reports/summary", { params }); }
export async function downloadReportCsv(params) {
  // A plain <a href> can't carry the auth token, so fetch as a blob and trigger the download manually.
  const response = await api.get("/admin/reports/export.csv", { params, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `lifeflow_report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---- Two-factor authentication ----
export function get2FAStatus(role) { return api.get(`/2fa/${role}/status`); }
export function setup2FA(role) { return api.post(`/2fa/${role}/setup`); }
export function enable2FA(role, code) { return api.post(`/2fa/${role}/enable`, { code }); }
export function disable2FA(role, password) { return api.post(`/2fa/${role}/disable`, { password }); }
export function verify2FALogin(tempToken, code) { return api.post("/auth/login/2fa-verify", { temp_token: tempToken, code }); }

export default api;
