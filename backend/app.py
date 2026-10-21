
from flask import Flask, jsonify, request
import os
import psycopg2

app = Flask(__name__)

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "terraform-postgres"),
        database=os.getenv("DB_NAME", "appdb"),
        user=os.getenv("DB_USER", "appuser"),
        password=os.getenv("DB_PASSWORD"),
        port=5432
    )

@app.route("/")
def home():
    return jsonify({"message": "Backend Flask opérationnel !"})

@app.route("/data", methods=["GET"])
def get_data():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS test_persistence (
            id SERIAL PRIMARY KEY,
            message TEXT
        )
    """)

    cur.execute("SELECT id, message FROM test_persistence ORDER BY id")
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify([
        {"id": row[0], "message": row[1]}
        for row in rows
    ])

@app.route("/data", methods=["POST"])
def add_data():
    body = request.get_json(silent=True) or {}
    message = body.get("message")

    if not isinstance(message, str) or not message.strip():
        return jsonify({"error": "Le champ message est obligatoire"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO test_persistence (message)
        VALUES (%s)
        RETURNING id, message
    """, (message.strip(),))

    row = cur.fetchone()
    conn.commit()

    cur.close()
    conn.close()

    return jsonify({"id": row[0], "message": row[1]}), 201

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
