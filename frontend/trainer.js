/* ============================================================
   trainer.js — Trainer dashboard behaviour (API + PostgreSQL)
   The trainer is identified by ?id= in the URL (set from index.html).
   IDs are strings like 'trn_01'.
   ============================================================ */

let TRAINER_ID = new URLSearchParams(window.location.search).get('id');

document.addEventListener('DOMContentLoaded', async () => {
  await loadDB();
  if (!TRAINER_ID) TRAINER_ID = DB.trainers[0].id;

  const trainer = findTrainer(TRAINER_ID);
  document.getElementById('who').textContent = `TRAINER: ${trainer ? trainer.name.toUpperCase() : 'UNKNOWN'}`;

  initNav();
  injectPulse(document.getElementById('pulse-holder'));

  populateSelects();
  renderMyMembers();
  renderWorkouts();
  renderAttendance();

  document.getElementById('form-workout').addEventListener('submit', onAddWorkout);
  document.getElementById('form-attendance').addEventListener('submit', onAddAttendance);
});

function myMembers() {
  return DB.members.filter(m => m.trainerId === TRAINER_ID);
}

function populateSelects() {
  const wSel = document.getElementById('w-member');
  const aSel = document.getElementById('a-member');
  myMembers().forEach(m => {
    wSel.add(new Option(m.name, m.id));
    aSel.add(new Option(m.name, m.id));
  });
  document.getElementById('a-date').valueAsDate = new Date();
}

function renderMyMembers() {
  renderTable(document.getElementById('tbl-my-members'), myMembers().map(m => [
    m.name, findPlan(m.planId)?.name || '—', statusBadge(m.status), m.joinDate,
  ]), 4, 'No members assigned yet');
}

function renderWorkouts() {
  const ids = myMembers().map(m => m.id);
  const rows = DB.workouts
    .filter(w => ids.includes(w.memberId))
    .sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  renderTable(document.getElementById('tbl-workouts'), rows.map(w => [
    findMember(w.memberId)?.name || '—', w.title, w.notes, w.createdDate,
  ]), 4, 'No workout plans created yet');
}

async function onAddWorkout(e) {
  e.preventDefault();
  try {
    await api('/workouts', {
      memberId: document.getElementById('w-member').value,
      trainerId: TRAINER_ID,
      title: document.getElementById('w-title').value.trim(),
      notes: document.getElementById('w-notes').value.trim(),
    });
    e.target.reset();
    await loadDB();
    renderWorkouts();
  } catch (err) {
    alert(err.message);
  }
}

function renderAttendance() {
  const ids = myMembers().map(m => m.id);
  const rows = DB.attendance
    .filter(a => ids.includes(a.memberId))
    .sort((a, b) => b.date.localeCompare(a.date));
  renderTable(document.getElementById('tbl-attendance'), rows.map(a => [
    findMember(a.memberId)?.name || '—', a.date, a.checkIn || '—', a.checkOut || '—',
  ]), 4, 'No attendance logged yet');
}

async function onAddAttendance(e) {
  e.preventDefault();
  try {
    await api('/attendance', {
      memberId: document.getElementById('a-member').value,
      date: document.getElementById('a-date').value,
      checkIn: document.getElementById('a-checkin').value,
      checkOut: document.getElementById('a-checkout').value,
    });
    e.target.reset();
    document.getElementById('a-date').valueAsDate = new Date();
    await loadDB();
    renderAttendance();
  } catch (err) {
    alert(err.message);
  }
}