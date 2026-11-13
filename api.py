from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2

app = Flask(__name__)
CORS(app)

# connect to the database
def connect_db():
    return psycopg2.connect(
        dbname="murree_hotels",
        user="postgres",
        password="1234",
        host="localhost",
        port="5433"
    )

# GET /hotels = send all hotels
@app.route("/hotels")
def get_hotels():
    db = connect_db()
    cursor = db.cursor()

    cursor.execute("""
        SELECT id, name, type, phone, website,
               ST_Y(geom) AS lat,
               ST_X(geom) AS lon
        FROM hotels
        ORDER BY id
    """)
    rows = cursor.fetchall()

    hotels = []
    for row in rows:
        hotels.append({
            "id": row[0],
            "name": row[1],
            "type": row[2],
            "phone": row[3],
            "website": row[4],
            "lat": row[5],
            "lon": row[6]
        })

    cursor.close()
    db.close()
    return jsonify(hotels)

# POST /add_hotel = save one new hotel
@app.route("/add_hotel", methods=["POST"])
def add_hotel():
    new = request.get_json()

    name = new.get("name")
    kind = new.get("type")
    phone = new.get("phone")
    website = new.get("website")
    lat = new.get("lat")
    lon = new.get("lon")

    # name and location are must
    if not name or lat is None or lon is None:
        return jsonify({"error": "Name and location are needed"}), 400

    db = connect_db()
    cursor = db.cursor()

    cursor.execute("""
        INSERT INTO hotels (name, type, phone, website, geom)
        VALUES (%s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
        RETURNING id
    """, (name, kind, phone, website, lon, lat))

    new_id = cursor.fetchone()[0]
    db.commit()

    cursor.close()
    db.close()
    return jsonify({"message": "Hotel saved", "id": new_id})

app.run(debug=True)