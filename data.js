/* ============================================================
   data.js — data layer (loads from FastAPI + PostgreSQL)

   DB starts empty. Each page calls `await loadDB()` on load,
   which fills these arrays from GET /api/data.
   ============================================================ */

const DB = {
  plans: [],
  trainers: [],
  members: [],
  payments: [],
  attendance: [],
  workouts: [],
  equipment: [],
};

/* Fetch everything from the server and copy it into DB */
async function loadDB() {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error('Could not load data from server');
  Object.assign(DB, await res.json());
}

/* POST helper for all writes and login: api('/members', {...}) */
async function api(path, body) {
  const res = await fetch('/api' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { msg = (await res.json()).detail || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

/* ---------- small lookup helpers used across pages ---------- */
/* IDs are strings now ('mbr_01', 'trn_01', 'PLN_01'), so no Number() */
const findPlan    = (id) => DB.plans.find(p => p.id === id);
const findTrainer = (id) => DB.trainers.find(t => t.id === id);
const findMember  = (id) => DB.members.find(m => m.id === id);

const fmtMoney = (n) => '\u20b9' + Number(n).toLocaleString('en-IN');
