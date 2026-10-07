from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
import db  # Imports connection functions from db.py

app = FastAPI(title="IronLog Gym Management System API")

# Enable CORS so browser JS can talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# PYDANTIC DATA MODELS
# -------------------------------------------------------------

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: str = "Member"  # Default role is Member

class LoginRequest(BaseModel):
    user_id: str
    password: str

class NewMember(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    plan_id: Optional[str] = None
    assigned_trainer_id: Optional[str] = None

class NewPayment(BaseModel):
    member_id: str
    plan_id: Optional[str] = None
    amount: float
    payment_method: str  # Cash, Card, UPI, NetBanking
    payment_status: str  # Paid, Pending, Failed

class AttendanceLog(BaseModel):
    member_id: str
    status: str          # Present, Absent

class NewWorkoutPlan(BaseModel):
    member_id: str
    trainer_id: str
    start_date: str
    end_date: Optional[str] = None
    goal: Optional[str] = None
    notes: Optional[str] = None


# -------------------------------------------------------------
# 1. AUTHENTICATION & USER ROUTES
# -------------------------------------------------------------

@app.get("/api/users/role/{role_name}")
def get_users_by_role(role_name: str):
    """Fetch users filtered by role for login dropdowns ('Admin', 'Trainer', 'Member')."""
    query = "SELECT user_id, first_name, last_name, email FROM Users WHERE role = %s ORDER BY user_id;"
    return db.fetch_all(query, (role_name,))

@app.post("/api/register")
def register_user(payload: RegisterRequest):
    """Register a new user in Users table and create entry in Members if role is Member."""
    # 1. Check if email already exists
    existing_user = db.fetch_one("SELECT * FROM Users WHERE email = %s;", (payload.email,))
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    # 2. Generate a unique user_id (e.g. mbr_a1b2c3 or usr_a1b2c3)
    prefix = "mbr" if payload.role == "Member" else "trn" if payload.role == "Trainer" else "adm"
    user_id = f"{prefix}_{uuid.uuid4().hex[:6]}"

    # 3. Insert into Users table
    user_query = """
        INSERT INTO Users (user_id, first_name, last_name, email, password_hash, role)
        VALUES (%s, %s, %s, %s, %s, %s);
    """
    try:
        db.execute_commit(user_query, (
            user_id, payload.first_name, payload.last_name, 
            payload.email, payload.password, payload.role
        ))

        # 4. If user is a Member, automatically create row in Members table
        if payload.role == "Member":
            member_query = "INSERT INTO Members (user_id) VALUES (%s);"
            db.execute_commit(member_query, (user_id,))

        return {
            "status": "success", 
            "message": "User registered successfully!", 
            "user_id": user_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/login")
def login_user(payload: LoginRequest):
    """Authenticate user credentials."""
    query = "SELECT user_id, role, password_hash, first_name, last_name FROM Users WHERE user_id = %s OR email = %s;"
    user = db.fetch_one(query, (payload.user_id, payload.user_id))
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user["password_hash"] == payload.password:
        return {
            "success": True, 
            "user_id": user["user_id"], 
            "role": user["role"],
            "first_name": user["first_name"],
            "last_name": user["last_name"]
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid password")


# -------------------------------------------------------------
# 2. MEMBERS & TRAINERS ROUTES
# -------------------------------------------------------------

@app.get("/api/members")
def get_all_members():
    """Fetch all members with plan and trainer details for Admin View."""
    query = """
        SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone,
               m.join_date, p.plan_name, p.fee,
               t.first_name AS trainer_first, t.last_name AS trainer_last
        FROM Users u
        JOIN Members m ON u.user_id = m.user_id
        LEFT JOIN Membership_Plans p ON m.plan_id = p.plan_id
        LEFT JOIN Users t ON m.assigned_trainer_id = t.user_id
        ORDER BY u.user_id;
    """
    return db.fetch_all(query)

@app.get("/api/members/{user_id}")
def get_member_profile(user_id: str):
    """Fetch individual member profile details."""
    query = """
        SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone,
               m.join_date, p.plan_name, p.fee,
               t.first_name AS trainer_first, t.last_name AS trainer_last
        FROM Users u
        JOIN Members m ON u.user_id = m.user_id
        LEFT JOIN Membership_Plans p ON m.plan_id = p.plan_id
        LEFT JOIN Users t ON m.assigned_trainer_id = t.user_id
        WHERE u.user_id = %s;
    """
    member = db.fetch_one(query, (user_id,))
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@app.post("/api/members")
def create_member(data: NewMember):
    """Add new member to both Users and Members tables manually."""
    user_query = """
        INSERT INTO Users (user_id, first_name, last_name, email, password_hash, phone, role)
        VALUES (%s, %s, %s, %s, %s, %s, 'Member');
    """
    member_query = """
        INSERT INTO Members (user_id, plan_id, assigned_trainer_id)
        VALUES (%s, %s, %s);
    """
    try:
        db.execute_commit(user_query, (
            data.user_id, data.first_name, data.last_name, 
            data.email, f"hash_{data.user_id}", data.phone
        ))
        db.execute_commit(member_query, (
            data.user_id, data.plan_id, data.assigned_trainer_id
        ))
        return {"status": "success", "message": "Member created successfully!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/trainers")
def get_all_trainers():
    """Fetch list of all trainers with specializations."""
    query = """
        SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone, t.specialization
        FROM Users u
        JOIN Trainer t ON u.user_id = t.user_id;
    """
    return db.fetch_all(query)

@app.get("/api/trainers/{trainer_id}/members")
def get_assigned_members_for_trainer(trainer_id: str):
    """Fetch members assigned to a specific trainer."""
    query = """
        SELECT u.user_id, u.first_name, u.last_name, u.phone, p.plan_name
        FROM Members m
        JOIN Users u ON m.user_id = u.user_id
        LEFT JOIN Membership_Plans p ON m.plan_id = p.plan_id
        WHERE m.assigned_trainer_id = %s;
    """
    return db.fetch_all(query, (trainer_id,))


# -------------------------------------------------------------
# 3. PLANS, PAYMENTS & ATTENDANCE ROUTES
# -------------------------------------------------------------

@app.get("/api/plans")
def get_membership_plans():
    """Fetch membership plan options for dropdowns and admin views."""
    query = "SELECT * FROM Membership_Plans ORDER BY fee;"
    return db.fetch_all(query)

@app.get("/api/payments")
def get_all_payments():
    """Fetch full payment history for Admin View."""
    query = """
        SELECT p.payment_id, u.first_name, u.last_name, mp.plan_name, 
               p.amount, p.payment_date, p.payment_method, p.payment_status
        FROM Payments p
        JOIN Users u ON p.member_id = u.user_id
        LEFT JOIN Membership_Plans mp ON p.plan_id = mp.plan_id
        ORDER BY p.payment_date DESC;
    """
    return db.fetch_all(query)

@app.get("/api/payments/member/{member_id}")
def get_member_payments(member_id: str):
    """Fetch payment history for a specific member dashboard."""
    query = """
        SELECT p.payment_id, mp.plan_name, p.amount, p.payment_date, p.payment_method, p.payment_status
        FROM Payments p
        LEFT JOIN Membership_Plans mp ON p.plan_id = mp.plan_id
        WHERE p.member_id = %s
        ORDER BY p.payment_date DESC;
    """
    return db.fetch_all(query, (member_id,))

@app.post("/api/payments")
def record_payment(data: NewPayment):
    """Record a payment."""
    query = """
        INSERT INTO Payments (member_id, plan_id, amount, payment_method, payment_status)
        VALUES (%s, %s, %s, %s, %s);
    """
    try:
        db.execute_commit(query, (
            data.member_id, data.plan_id, data.amount, 
            data.payment_method, data.payment_status
        ))
        return {"status": "success", "message": "Payment recorded!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/attendance")
def get_all_attendance():
    """Fetch all attendance records."""
    query = """
        SELECT a.attendance_id, u.first_name, u.last_name, a.attendance_date, 
               a.check_in_time, a.check_out_time, a.status
        FROM Attendance a
        JOIN Users u ON a.member_id = u.user_id
        ORDER BY a.attendance_date DESC;
    """
    return db.fetch_all(query)

@app.post("/api/attendance")
def log_attendance(data: AttendanceLog):
    """Log member daily check-in."""
    query = """
        INSERT INTO Attendance (member_id, attendance_date, check_in_time, status)
        VALUES (%s, CURRENT_DATE, CURRENT_TIME, %s);
    """
    try:
        db.execute_commit(query, (data.member_id, data.status))
        return {"status": "success", "message": "Attendance logged!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/workout-plans/member/{member_id}")
def get_workout_plan_by_member(member_id: str):
    """Fetch workout plan assigned to a specific member."""
    query = """
        SELECT w.workout_plan_id, w.start_date, w.end_date, w.goal, w.notes,
               t.first_name AS trainer_first, t.last_name AS trainer_last
        FROM Workout_Plans w
        JOIN Users t ON w.trainer_id = t.user_id
        WHERE w.member_id = %s;
    """
    return db.fetch_all(query, (member_id,))

@app.post("/api/workout-plans")
def create_workout_plan(data: NewWorkoutPlan):
    """Create a workout plan for a member."""
    query = """
        INSERT INTO Workout_Plans (member_id, trainer_id, start_date, end_date, goal, notes)
        VALUES (%s, %s, %s, %s, %s, %s);
    """
    try:
        db.execute_commit(query, (
            data.member_id, data.trainer_id, data.start_date, 
            data.end_date, data.goal, data.notes
        ))
        return {"status": "success", "message": "Workout plan created!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/equipment")
def get_equipment_inventory():
    """Fetch equipment list and condition status."""
    query = "SELECT * FROM Equipment ORDER BY equipment_id;"
    return db.fetch_all(query)