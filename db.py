import os
import psycopg2
from psycopg2.extras import RealDictCursor

DSN = os.getenv("DATABASE_URL", "dbname=gym_management user=postgres password=postgres host=localhost port=5432")

def _conn():
    return psycopg2.connect(DSN)

def fetch_all(sql, params=None):
    with _conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        return cur.fetchall()

def fetch_one(sql, params=None):
    with _conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        return cur.fetchone()

def execute_commit(sql, params=None):
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)   # `with conn` commits on success, rolls back on error
