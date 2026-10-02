/* ============================================================
   admin.js — Admin dashboard behaviour
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  injectPulse(document.getElementById('pulse-holder'));

  populateSelects();
  renderOverview();
  renderMembers();
  renderTrainers();
  renderPlans();
  renderPayments();
  renderEquipment();
  renderReports();

  document.getElementById('form-member').addEventListener('submit', onAddMember);
  document.getElementById('form-trainer').addEventListener('submit', onAddTrainer);
  document.getElementById('form-plan').addEventListener('submit', onAddPlan);
  document.getElementById('form-payment').addEventListener('submit', onAddPayment);
  document.getElementById('form-equipment').addEventListener('submit', onAddEquipment);
});

/* ---------- populate <select> dropdowns from mock DB ---------- */
function populateSelects() {
  const planSel = document.getElementById('m-plan');
  DB.plans.forEach(p => planSel.add(new Option(`${p.name} (${fmtMoney(p.price)})`, p.id)));

  const trainerSel = document.getElementById('m-trainer');
  DB.trainers.forEach(t => trainerSel.add(new Option(t.name, t.id)));

  const paySel = document.getElementById('pay-member');
  DB.members.forEach(m => paySel.add(new Option(m.name, m.id)));

  document.getElementById('pay-date').valueAsDate = new Date();
}

function refreshAll() {
  populateSelectsRefresh();
  renderOverview();
  renderMembers();
  renderTrainers();
  renderPlans();
  renderPayments();
  renderEquipment();
  renderReports();
}

/* re-fill selects that depend on data which may have grown (members/trainers) */
function populateSelectsRefresh() {
  const trainerSel = document.getElementById('m-trainer');
  trainerSel.innerHTML = '';
  DB.trainers.forEach(t => trainerSel.add(new Option(t.name, t.id)));

  const paySel = document.getElementById('pay-member');
  paySel.innerHTML = '';
  DB.members.forEach(m => paySel.add(new Option(m.name, m.id)));
}

/* ---------- OVERVIEW ---------- */
function renderOverview() {
  const activeMembers = DB.members.filter(m => m.status === 'Active').length;
  const ym = new Date().toISOString().slice(0, 7);   // e.g. "2026-10"
  const monthlyRevenue = DB.payments
    .filter(p => p.status === 'Paid' && p.date.startsWith(ym))
    .reduce((sum, p) => sum + p.amount, 0);
  const maintenanceCount = DB.equipment.filter(e => e.status === 'Maintenance').length;

  document.getElementById('stat-grid').innerHTML = `
    <div class="stat-card"><div class="label">Total members</div><div class="value">${DB.members.length}</div></div>
    <div class="stat-card"><div class="label">Active members</div><div class="value accent">${activeMembers}</div></div>
    <div class="stat-card"><div class="label">Trainers on staff</div><div class="value">${DB.trainers.length}</div></div>
    <div class="stat-card"><div class="label">Revenue this month</div><div class="value">${fmtMoney(monthlyRevenue)}</div></div>
    <div class="stat-card"><div class="label">Equipment needing service</div><div class="value ${maintenanceCount ? 'warn' : ''}">${maintenanceCount}</div></div>
  `;

  const recent = [...DB.members].sort((a, b) => b.joinDate.localeCompare(a.joinDate)).slice(0, 5);
  renderTable(document.getElementById('tbl-recent-members'), recent.map(m => [
    m.name,
    findPlan(m.planId)?.name || '—',
    findTrainer(m.trainerId)?.name || '—',
    m.joinDate,
    statusBadge(m.status),
  ]), 5);
}

/* ---------- MEMBERS ---------- */
function renderMembers() {
  renderTable(document.getElementById('tbl-members'), DB.members.map(m => [
    m.name, m.email,
    findPlan(m.planId)?.name || '—',
    findTrainer(m.trainerId)?.name || '—',
    m.joinDate,
    statusBadge(m.status),
  ]), 6);
}

function onAddMember(e) {
  e.preventDefault();
  DB.members.push({
    id: nextId(DB.members),
    name: document.getElementById('m-name').value.trim(),
    email: document.getElementById('m-email').value.trim(),
    phone: document.getElementById('m-phone').value.trim(),
    joinDate: new Date().toISOString().slice(0, 10),
    planId: document.getElementById('m-plan').value,
    trainerId: document.getElementById('m-trainer').value,
    status: 'Active',
  });
  e.target.reset();
  refreshAll();
}

/* ---------- TRAINERS ---------- */
function renderTrainers() {
  renderTable(document.getElementById('tbl-trainers'), DB.trainers.map(t => [
    t.name, t.specialization, t.phone, t.email,
    DB.members.filter(m => m.trainerId === t.id).length,
  ]), 5);
}

function onAddTrainer(e) {
  e.preventDefault();
  DB.trainers.push({
    id: nextId(DB.trainers),
    name: document.getElementById('t-name').value.trim(),
    specialization: document.getElementById('t-spec').value.trim(),
    phone: document.getElementById('t-phone').value.trim(),
    email: document.getElementById('t-email').value.trim(),
  });
  e.target.reset();
  refreshAll();
}

/* ---------- PLANS ---------- */
function renderPlans() {
  renderTable(document.getElementById('tbl-plans'), DB.plans.map(p => [
    p.name, `${p.durationMonths} mo`, fmtMoney(p.price),
    DB.members.filter(m => m.planId === p.id && m.status === 'Active').length,
  ]), 4);
}

function onAddPlan(e) {
  e.preventDefault();
  DB.plans.push({
    id: nextId(DB.plans),
    name: document.getElementById('p-name').value.trim(),
    durationMonths: Number(document.getElementById('p-duration').value),
    price: Number(document.getElementById('p-price').value),
  });
  e.target.reset();
  refreshAll();
}

/* ---------- PAYMENTS ---------- */
function renderPayments() {
  const sorted = [...DB.payments].sort((a, b) => b.date.localeCompare(a.date));
  renderTable(document.getElementById('tbl-payments'), sorted.map(p => [
    findMember(p.memberId)?.name || '—',
    fmtMoney(p.amount), p.method, p.date, statusBadge(p.status),
  ]), 5);
}

function onAddPayment(e) {
  e.preventDefault();
  DB.payments.push({
    id: nextId(DB.payments),
    memberId: document.getElementById('pay-member').value,
    amount: Number(document.getElementById('pay-amount').value),
    method: document.getElementById('pay-method').value,
    date: document.getElementById('pay-date').value,
    status: 'Paid',
  });
  e.target.reset();
  document.getElementById('pay-date').valueAsDate = new Date();
  refreshAll();
}

/* ---------- EQUIPMENT ---------- */
function renderEquipment() {
  renderTable(document.getElementById('tbl-equipment'), DB.equipment.map(eq => [
    eq.name, eq.category, eq.quantity, statusBadge(eq.status), eq.lastService,
    eq.status === 'Working'
      ? `<button class="btn small danger" onclick="toggleEquipment('${eq.id}')">Flag for service</button>`
      : `<button class="btn small secondary" onclick="toggleEquipment('${eq.id}')">Mark fixed</button>`,
  ]), 6);
}

function toggleEquipment(id) {
  const eq = DB.equipment.find(e => e.id === id);
  if (!eq) return;
  if (eq.status === 'Working') {
    eq.status = 'Maintenance';
  } else {
    eq.status = 'Working';
    eq.lastService = new Date().toISOString().slice(0, 10);
  }
  refreshAll();
}

function onAddEquipment(e) {
  e.preventDefault();
  DB.equipment.push({
    id: nextId(DB.equipment),
    name: document.getElementById('eq-name').value.trim(),
    category: document.getElementById('eq-category').value,
    quantity: Number(document.getElementById('eq-qty').value),
    status: 'Working',
    lastService: new Date().toISOString().slice(0, 10),
  });
  e.target.reset();
  refreshAll();
}

/* ---------- REPORTS ---------- */
function renderReports() {
  renderTable(document.getElementById('tbl-report-plans'), DB.plans.map(p => {
    const onPlan = DB.members.filter(m => m.planId === p.id);
    const revenue = DB.payments
      .filter(pay => pay.status === 'Paid' && onPlan.some(m => m.id === pay.memberId))
      .reduce((s, pay) => s + pay.amount, 0);
    return [p.name, onPlan.length, fmtMoney(revenue)];
  }), 3);

  const byDate = {};
  DB.attendance.forEach(a => { byDate[a.date] = (byDate[a.date] || 0) + 1; });
  const dateRows = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  renderTable(document.getElementById('tbl-report-attendance'), dateRows.map(([d, c]) => [d, c]), 2);

  const pending = DB.payments.filter(p => p.status === 'Pending');
  renderTable(document.getElementById('tbl-report-pending'), pending.map(p => [
    findMember(p.memberId)?.name || '—', fmtMoney(p.amount), p.date,
  ]), 3, 'No pending payments');
}
