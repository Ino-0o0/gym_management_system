from db import fetch_all

try:
    # Try fetching rows from your Users table
    users = fetch_all("SELECT * FROM Users LIMIT 5;")
    print("SUCCESS! Successfully connected to Supabase.")
    print("Fetched Users:", users)
except Exception as e:
    print("ERROR! Connection failed:")
    print(e)
