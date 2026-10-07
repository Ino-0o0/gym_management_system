import psycopg2
from psycopg2.extras import RealDictCursor

DB_CONFIG = {
    "host": "aws-0-ap-southeast-1.pooler.supabase.com", 
    "database": "postgres",
    "user": "postgres.mjtywlkumdtpqnnzxzol",        
    "password": "HELLOkitty*231975",
    "port": 6543                                   
}

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

# 1. Fetch multiple rows (SELECT)
def fetch_all(query, params=None):
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

# 2. Fetch a single row (SELECT for login/user profile)
def fetch_one(query, params=None):
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(query, params)
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row

# 3. Write data to database (INSERT, UPDATE, DELETE)
def execute_commit(query, params=None):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()  # Saves changes permanently in Supabase
    cur.close()
    conn.close()