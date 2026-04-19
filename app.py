"""
app.py  —  ArgoBuddy Flask application.

Run:  python app.py   →  http://localhost:5000

─────────────────────────────────────────────────────────────────────────────
BRIDGE TO nori_backend.py
─────────────────────────────────────────────────────────────────────────────
All data processing and graph generation live in nori_backend.py.
This file only wires Flask routes to those functions.

To add a new graph:
  1. Write the function in nori_backend.py  →  returns fig.to_json()
  2. Add a route below that returns it
  3. Add a tab in templates/index.html that fetches it
─────────────────────────────────────────────────────────────────────────────
"""

from flask import Flask, render_template, jsonify
import nori_backend  # ← ALL data/graph logic lives here

app = Flask(__name__)


# ── Page ──────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


# ── Zone statistics  (drives game logic + slider ranges in Student Mode) ──────
# BRIDGE → nori_backend.get_zone_stats()
@app.route('/api/zones')
def api_zones():
    return jsonify(nori_backend.get_zone_stats())


# ── T-S Diagram  (Teacher Mode, Tab 1 — Water Identity) ──────────────────────
# BRIDGE → nori_backend.get_ts_diagram_json()
# Trace index 1 in the returned figure is the empty 'live-star' trace;
# index.html updates it via Plotly.restyle when sliders move.
@app.route('/api/graph/ts')
def api_graph_ts():
    payload = nori_backend.get_ts_diagram_json()
    return payload, 200, {'Content-Type': 'application/json'}


# ── Vertical Profiles  (Teacher Mode, Tab 2 — Ocean Layers) ──────────────────
# BRIDGE → nori_backend.get_salinity_profile_json()
@app.route('/api/graph/profile')
def api_graph_profile():
    payload = nori_backend.get_salinity_profile_json()
    return payload, 200, {'Content-Type': 'application/json'}


# ── Zone Distributions  (Teacher Mode, Tab 3 — Statistical Safety) ───────────
# BRIDGE → nori_backend.get_zone_distributions_json()
@app.route('/api/graph/distributions')
def api_graph_distributions():
    payload = nori_backend.get_zone_distributions_json()
    return payload, 200, {'Content-Type': 'application/json'}


if __name__ == '__main__':
    app.run(debug=True, port=5000)
