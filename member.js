/* ============================================================
   member.js — Member dashboard behaviour (read-only views)
   The member is identified by ?id= in the URL (set from index.html).
   ============================================================ */

const MEMBER_ID = Number(new URLSearchParams(window.location.search).get('id')) || DB.members[0].id;

document.addEventListener('DOMContentLoaded', () => {
  const member = findMember(MEMBER_ID);
  document.getElementById('who').textContent = `MEMBER: ${member ? member.name.toUpperCase() : 'UNKNOWN'}`;

  initNav();
  injectPulse(document.getElementById('pulse-holder'));

  renderMembership();
  renderWorkout();
  renderAttendance();
  renderPayments();
});

function renderMembership() {
  const m = findMember(MEMBER_ID);
  if (!m) return;
  const plan = findPlan(m.planId);
  const trainer = findTrainer(m.trainerId);

  document.getElementById('stat-grid').innerHTML = `
    <div class="stat-card"><div class="label">Plan</div><div class="value">${plan?.name || '—'}</div></div>
    <div class="stat-card"><div class="label">Status</div><div class="value accent">${m.status}</div></div>
    <div class="stat-card"><div class="label">Trainer</div><div class="value">${trainer?.name || '—'}</div></div>
  `;

  document.getElementById('tbl-membership').innerHTML = `
    <tr><td>Name</td><td>${m.name}</td></tr>
    <tr><td>Email</td><td>${m.email}</td></tr>
    <tr><td>Phone</td><td>${m.phone}</td></tr>
    <tr><td>Joined</td><td>${m.joinDate}</td></tr>
    <tr><td>Plan duration</td><td>${plan ? plan.durationMonths + ' month(s)' : '—'}</td></tr>
    <tr><td>Plan price</td><td>${plan ? fmtMoney(plan.price) : '—'}</td></tr>
    <tr><td>Assigned trainer</td><td>${trainer ? `${trainer.name} (${trainer.specialization})` : '—'}</td></tr>
  `;
}

function renderWorkout() {
  const rows = DB.workouts
    .filter(w => w.memberId === MEMBER_ID)
    .sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  renderTable(document.getElementById('tbl-workout'), rows.map(w => [
    w.title, w.notes, findTrainer(w.trainerId)?.name || '—', w.createdDate,
  ]), 4, 'No workout plan assigned yet');
}

function renderAttendance() {
  const rows = DB.attendance
    .filter(a => a.memberId === MEMBER_ID)
    .sort((a, b) => b.date.localeCompare(a.date));
  renderTable(document.getElementById('tbl-attendance'), rows.map(a => [
    a.date, a.checkIn, a.checkOut || '—',
  ]), 3, 'No attendance recorded yet');
}

function renderPayments() {
  const rows = DB.payments
    .filter(p => p.memberId === MEMBER_ID)
    .sort((a, b) => b.date.localeCompare(a.date));
  renderTable(document.getElementById('tbl-payments'), rows.map(p => [
    p.date, fmtMoney(p.amount), p.method, statusBadge(p.status),
  ]), 4, 'No payments recorded yet');
}
