/* ============================================================
   data.js — in-memory mock data layer

   This stands in for the real database while the UI is being
   demoed on its own. Every array here corresponds to one entity
   from the abstract (Members, Trainers, Membership Plans,
   Payments, Attendance, Workout Plans, Equipment). Field names
   match what would become table columns. Nothing here persists
   across a page refresh — see the note in README.md about
   wiring this up to the real backend.
   ============================================================ */

const DB = {
  /* Mock login only — see README's "Authentication" section before this
     goes anywhere near a real deployment. Plaintext passwords here are a
     placeholder for the demo; the real backend must hash them. */
  admin: { username: 'admin', password: 'admin123' },

  plans: [
    { id: 1, name: 'Basic Monthly',   durationMonths: 1,  price: 1200 },
    { id: 2, name: 'Quarterly',       durationMonths: 3,  price: 3200 },
    { id: 3, name: 'Annual Premium',  durationMonths: 12, price: 11000 },
  ],

  trainers: [
    { id: 1, name: 'Arjun Menon',    specialization: 'Strength & Conditioning', phone: '9812340001', email: 'arjun.menon@ironlog.gym', password: 'trainer123' },
    { id: 2, name: 'Priya Suresh',   specialization: 'Yoga & Mobility',         phone: '9812340002', email: 'priya.suresh@ironlog.gym', password: 'trainer123' },
    { id: 3, name: 'Farhan Ali',     specialization: 'CrossFit',                phone: '9812340003', email: 'farhan.ali@ironlog.gym', password: 'trainer123' },
  ],

  members: [
    { id: 1, name: 'Devika Nair',     email: 'devika.n@mail.com',  phone: '9900011001', joinDate: '2025-11-02', planId: 3, trainerId: 1, status: 'Active', password: 'member123' },
    { id: 2, name: 'Rohit Bhaskaran', email: 'rohit.b@mail.com',   phone: '9900011002', joinDate: '2026-01-14', planId: 1, trainerId: 2, status: 'Active', password: 'member123' },
    { id: 3, name: 'Sneha Kurup',     email: 'sneha.k@mail.com',   phone: '9900011003', joinDate: '2025-08-20', planId: 2, trainerId: 1, status: 'Active', password: 'member123' },
    { id: 4, name: 'Aditya Varma',    email: 'aditya.v@mail.com',  phone: '9900011004', joinDate: '2026-03-05', planId: 1, trainerId: 3, status: 'Inactive', password: 'member123' },
    { id: 5, name: 'Meera Pillai',    email: 'meera.p@mail.com',   phone: '9900011005', joinDate: '2025-12-19', planId: 2, trainerId: 2, status: 'Active', password: 'member123' },
  ],

  payments: [
    { id: 1, memberId: 1, amount: 11000, date: '2025-11-02', method: 'UPI',        status: 'Paid' },
    { id: 2, memberId: 2, amount: 1200,  date: '2026-07-14', method: 'Card',       status: 'Paid' },
    { id: 3, memberId: 3, amount: 3200,  date: '2026-06-20', method: 'Cash',       status: 'Paid' },
    { id: 4, memberId: 4, amount: 1200,  date: '2026-03-05', method: 'UPI',        status: 'Pending' },
    { id: 5, memberId: 5, amount: 3200,  date: '2026-07-19', method: 'Bank Transfer', status: 'Paid' },
  ],

  attendance: [
    { id: 1, memberId: 1, date: '2026-07-30', checkIn: '06:15', checkOut: '07:30' },
    { id: 2, memberId: 2, date: '2026-07-30', checkIn: '17:00', checkOut: '18:10' },
    { id: 3, memberId: 3, date: '2026-07-31', checkIn: '06:30', checkOut: '07:45' },
    { id: 4, memberId: 1, date: '2026-07-31', checkIn: '06:20', checkOut: '07:35' },
    { id: 5, memberId: 5, date: '2026-07-31', checkIn: '18:00', checkOut: '19:05' },
  ],

  workouts: [
    { id: 1, memberId: 1, trainerId: 1, title: 'Strength Phase 2', notes: 'Squat 4x6, bench 4x6, deadlift 3x5. Progress load weekly.', createdDate: '2026-07-01' },
    { id: 2, memberId: 3, trainerId: 1, title: 'Hypertrophy Block', notes: 'Push/pull/legs split, 3 sets of 10-12 reps per lift.', createdDate: '2026-06-25' },
    { id: 3, memberId: 2, trainerId: 2, title: 'Mobility & Core', notes: '20 min mobility flow + core circuit, 3x/week.', createdDate: '2026-07-20' },
    { id: 4, memberId: 5, trainerId: 2, title: 'Beginner Yoga Flow', notes: 'Sun salutations + breathing work, low intensity.', createdDate: '2026-07-10' },
  ],

  equipment: [
    { id: 1, name: 'Treadmill (x4)',      category: 'Cardio',  quantity: 4, status: 'Working',     lastService: '2026-06-01' },
    { id: 2, name: 'Olympic Barbell Set', category: 'Strength', quantity: 10, status: 'Working',    lastService: '2026-05-15' },
    { id: 3, name: 'Cable Crossover',     category: 'Strength', quantity: 1, status: 'Maintenance', lastService: '2026-04-10' },
    { id: 4, name: 'Rowing Machine',      category: 'Cardio',  quantity: 3, status: 'Working',      lastService: '2026-06-20' },
    { id: 5, name: 'Yoga Mats',           category: 'Studio',  quantity: 20, status: 'Working',     lastService: '2026-03-01' },
  ],
};

/* Auto-incrementing id helpers, one per entity */
const nextId = (arr) => (arr.length ? Math.max(...arr.map(r => r.id)) + 1 : 1);

/* ---------- small lookup helpers used across pages ---------- */
const findPlan    = (id) => DB.plans.find(p => p.id === Number(id));
const findTrainer = (id) => DB.trainers.find(t => t.id === Number(id));
const findMember  = (id) => DB.members.find(m => m.id === Number(id));

const fmtMoney = (n) => '\u20b9' + Number(n).toLocaleString('en-IN');
