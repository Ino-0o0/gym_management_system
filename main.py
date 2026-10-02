from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import psycopg2
from db import fetch_all, fetch_one, execute_commit

app = FastAPI()

# turn DB errors (duplicate email, bad FK...) into a readable message for the UI
@app.exception_handler(psycopg2.Error)
async def db_error(request, exc):
    return JSONResponse(status_code=400, content={"detail": str(exc).splitlines()[0]})

@app.get("/api/data")
def all_data():
    return {
        "plans": fetch_all('''SELECT plan_id AS id, plan_name AS name,
                              duration_months AS "durationMonths", fee::float AS price
                              FROM Membership_Plans ORDER BY plan_id'''),
        "trainers": fetch_all('''SELECT t.user_id AS id, u.first_name || ' ' || u.last_name AS name,
                                 t.specialization, u.phone, u.email
                                 FROM Trainer t JOIN Users u ON u.user_id = t.user_id
                                 ORDER BY t.user_id'''),
        "members": fetch_all('''SELECT m.user_id AS id, u.first_name || ' ' || u.last_name AS name,
                                u.email, u.phone, m.join_date AS "joinDate",
                                m.plan_id AS "planId", m.assigned_trainer_id AS "trainerId",
                                CASE WHEN m.join_date + (p.duration_months * INTERVAL '1 month') >= CURRENT_DATE
                                     THEN 'Active' ELSE 'Inactive' END AS status
                                FROM Members m
                                JOIN Users u ON u.user_id = m.user_id
                                LEFT JOIN Membership_Plans p ON p.plan_id = m.plan_id
                                ORDER BY m.user_id'''),
        "payments": fetch_all('''SELECT payment_id AS id, member_id AS "memberId", amount::float AS amount,
                                 payment_date AS "date", payment_method AS method,
                                 payment_status AS status FROM Payments ORDER BY payment_id'''),
        "attendance": fetch_all('''SELECT attendance_id AS id, member_id AS "memberId",
                                   attendance_date AS "date",
                                   left(check_in_time::text, 5) AS "checkIn",
                                   left(check_out_time::text, 5) AS "checkOut"
                                   FROM Attendance ORDER BY attendance_id'''),
        "workouts": fetch_all('''SELECT workout_plan_id AS id, member_id AS "memberId",
                                 trainer_id AS "trainerId", goal AS title, notes,
                                 start_date AS "createdDate"
                                 FROM Workout_Plans ORDER BY workout_plan_id'''),
        "equipment": fetch_all('''SELECT equipment_id AS id, equipment_name AS name, category, quantity,
                                  CASE WHEN condition_status = 'Under Maintenance' THEN 'Maintenance'
                                       ELSE condition_status END AS status,
                                  last_service AS "lastService"
                                  FROM Equipment ORDER BY equipment_id'''),
    }

# ---------- login (verified server-side with bcrypt) ----------
ROLES = {"admin": "Admin", "trainer": "Trainer", "member": "Member"}

class LoginIn(BaseModel):
    role: str
    id: Optional[str] = None
    password: str

@app.post("/api/login")
def login(r: LoginIn):
    role = ROLES.get(r.role)
    row = None
    if role == "Admin":
        row = fetch_one("SELECT 1 AS ok FROM Users WHERE role='Admin' "
                        "AND password_hash = crypt(%s, password_hash)", (r.password,))
    elif role:
        row = fetch_one("SELECT 1 AS ok FROM Users WHERE user_id=%s AND role=%s "
                        "AND password_hash = crypt(%s, password_hash)", (r.id, role, r.password))
    if not row:
        raise HTTPException(401, "Incorrect password")
    return {"ok": True}

def split_name(full: str):
    parts = full.strip().split(" ", 1)
    return parts[0], (parts[1] if len(parts) > 1 else "")

# ---------- writes (IDs like mbr_04 / trn_03 / PLN_04 / EQ_04 are generated in SQL) ----------
class MemberIn(BaseModel):
    name: str; email: str; phone: str; planId: str; trainerId: str

@app.post("/api/members")
def add_member(m: MemberIn):
    first, last = split_name(m.name)
    execute_commit("""
        WITH u AS (
          INSERT INTO Users (user_id, first_name, last_name, email, password_hash, phone, role)
          VALUES ('mbr_' || lpad((SELECT COALESCE(MAX(SUBSTRING(user_id FROM 5)::int), 0) + 1
                                  FROM Users WHERE role='Member')::text, 2, '0'),
                  %s, %s, %s, crypt('member123', gen_salt('bf')), %s, 'Member')
          RETURNING user_id)
        INSERT INTO Members (user_id, plan_id, assigned_trainer_id)
        SELECT user_id, %s, %s FROM u""",
        (first, last, m.email, m.phone, m.planId, m.trainerId))
    return {"ok": True}

class TrainerIn(BaseModel):
    name: str; specialization: str; phone: str; email: str

@app.post("/api/trainers")
def add_trainer(t: TrainerIn):
    first, last = split_name(t.name)
    execute_commit("""
        WITH u AS (
          INSERT INTO Users (user_id, first_name, last_name, email, password_hash, phone, role)
          VALUES ('trn_' || lpad((SELECT COALESCE(MAX(SUBSTRING(user_id FROM 5)::int), 0) + 1
                                  FROM Users WHERE role='Trainer')::text, 2, '0'),
                  %s, %s, %s, crypt('trainer123', gen_salt('bf')), %s, 'Trainer')
          RETURNING user_id)
        INSERT INTO Trainer (user_id, specialization) SELECT user_id, %s FROM u""",
        (first, last, t.email, t.phone, t.specialization))
    return {"ok": True}

class PlanIn(BaseModel):
    name: str; durationMonths: int; price: float

@app.post("/api/plans")
def add_plan(p: PlanIn):
    execute_commit("""INSERT INTO Membership_Plans (plan_id, plan_name, duration_months, fee)
        VALUES ('PLN_' || lpad((SELECT COALESCE(MAX(SUBSTRING(plan_id FROM 5)::int), 0) + 1
                                FROM Membership_Plans)::text, 2, '0'), %s, %s, %s)""",
        (p.name, p.durationMonths, p.price))
    return {"ok": True}

class PaymentIn(BaseModel):
    memberId: str; amount: float; method: str; date: str

@app.post("/api/payments")
def add_payment(p: PaymentIn):
    # plan_id is copied from the member's current plan
    execute_commit("""INSERT INTO Payments (member_id, plan_id, amount, payment_date, payment_method, payment_status)
        SELECT user_id, plan_id, %s::numeric, %s::date, %s, 'Paid' FROM Members WHERE user_id = %s""",
        (p.amount, p.date, p.method, p.memberId))
    return {"ok": True}

class EquipmentIn(BaseModel):
    name: str; category: str; quantity: int

@app.post("/api/equipment")
def add_equipment(e: EquipmentIn):
    execute_commit("""INSERT INTO Equipment (equipment_id, equipment_name, category, quantity, condition_status)
        VALUES ('EQ_' || lpad((SELECT COALESCE(MAX(SUBSTRING(equipment_id FROM 4)::int), 0) + 1
                               FROM Equipment)::text, 2, '0'), %s, %s, %s, 'Working')""",
        (e.name, e.category, e.quantity))
    return {"ok": True}

@app.post("/api/equipment/{eq_id}/toggle")
def toggle_equipment(eq_id: str):
    execute_commit("""UPDATE Equipment SET
          condition_status = CASE WHEN condition_status='Working' THEN 'Under Maintenance' ELSE 'Working' END,
          last_service = CASE WHEN condition_status='Working' THEN last_service ELSE CURRENT_DATE END
          WHERE equipment_id = %s""", (eq_id,))
    return {"ok": True}

class WorkoutIn(BaseModel):
    memberId: str; trainerId: str; title: str; notes: str = ""

@app.post("/api/workouts")
def add_workout(w: WorkoutIn):
    # the form's "Plan title" is stored in your `goal` column
    execute_commit("""INSERT INTO Workout_Plans (member_id, trainer_id, start_date, goal, notes)
                      VALUES (%s, %s, CURRENT_DATE, %s, %s)""",
                   (w.memberId, w.trainerId, w.title, w.notes))
    return {"ok": True}

class AttendanceIn(BaseModel):
    memberId: str; date: str; checkIn: str; checkOut: str = ""

@app.post("/api/attendance")
def add_attendance(a: AttendanceIn):
    execute_commit("""INSERT INTO Attendance (member_id, attendance_date, check_in_time, check_out_time, status)
                      VALUES (%s, %s, %s, %s, 'Present')""",
                   (a.memberId, a.date, a.checkIn, a.checkOut or None))
    return {"ok": True}

# serve the frontend from the same server, keep this LAST
app.mount("/", StaticFiles(directory="frontend", html=True), name="static")
