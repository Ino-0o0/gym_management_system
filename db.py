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

def fetch_all(query, params=None):
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows