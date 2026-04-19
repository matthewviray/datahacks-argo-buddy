# ArgoBuddy 🌊🤖

A gamified ocean science web app for students — powered by real data from Argo float **4901639** in the Pacific Ocean off Southern California.

Students adopt an Argo robot named **Nori**, dive through three ocean zones, adjust temperature and salinity sliders, and watch in real time how changes in ocean conditions affect the ecosystem. Teachers get a dedicated dashboard with interactive data visualizations and NGSS-aligned lesson plans.

---

## What It Does

### Student Mode
- **Create your ArgoBuddy** — customize a robot with colors, eyes, and accessories
- **Explore 3 ocean zones** — Sunlight (0–200m), Twilight (200–1000m), Midnight (1000–2000m)
- **Adjust sliders** to set temperature and salinity in each zone; Nori's mood responds based on real statistical baselines
- **Take on challenges** — choose the right action to keep Nori healthy
- **World Map** — see Nori's real GPS track across 168 dive cycles from Nov 2015 to Jan 2017
- **Zone Education Hub** — science facts, key numbers, climate tipping points, and animal spotlights per zone (no charts, just learning)

### Teacher Mode (`/teacher`)
- **Live student feed** — real-time view of the student's current zone, temperature, salinity, and anomaly status
- **T-S Diagram** — temperature-salinity water mass fingerprints with Nori's 168-cycle track overlaid
- **Ocean Profiles** — temperature and salinity vs. depth with ±1σ bands and zone shading
- **Zone Distributions** — temperature histograms per zone showing comfort bands and baselines
- **CCE1 Temperature** — CalCOFI Current Ecosystem mooring time series with Nori's dives overlaid
- **CCE1 Salinity** — same for salinity
- Each chart includes an **interpretation guide** and a full **lesson plan** with NGSS standard, learning objectives, discussion questions, and classroom activity steps

---

## The Data

All baselines, tolerances, and statistical thresholds are derived directly from real Argo float observations — not hand-tuned.

| Source | Description |
|--------|-------------|
| `single_argo.csv` | 17,816 readings from Argo float 4901639, 168 dive cycles, Nov 2015–Jan 2017, Pacific off Southern California (~33°N, 122°W), max depth ~2000m |
| `3901161/` | 1,396 archived CSV profiles from a second Argo float used during data exploration |
| `calcofi_baseline.csv` | Historical CalCOFI surface temperature baseline (11.536°C) used in mood engine testing |
| CCE1 mooring (fetched at runtime) | Fixed mooring sensor off Southern California — downloaded from NOAA THREDDS on first teacher tab load and cached as `cce1_cache.nc` |

**Columns in `single_argo.csv`**: `pressure (decibar)`, `temperature (degree_celsius)`, `salinity (dimensionless)`, `meta_cycle_number`, `meta_profile_date`, `meta_profile_latitude`, `meta_profile_longitude`

---

## Setup

### Requirements

```
Python 3.9+
flask
pandas
numpy
scipy
netCDF4       # for CCE1 mooring data (optional — teacher tab only)
```

Install dependencies:

```bash
pip install flask pandas numpy scipy netCDF4
```

Frontend libraries are loaded via CDN — no build step required:
- [Plotly.js 2.27](https://plotly.com/javascript/) — teacher chart visualizations
- [Chart.js 4.4](https://www.chartjs.org/) — teacher dashboard charts
- [Leaflet.js 1.9](https://leafletjs.com/) — world map
- [Nunito](https://fonts.google.com/specimen/Nunito) — typography

### Run

```bash
python3 argobuddy_game.py
```

Opens at **http://localhost:5050**

```bash
python3 argobuddy_game.py --port 8080   # custom port
```

| URL | Interface |
|-----|-----------|
| `http://localhost:5050/` | Student app |
| `http://localhost:5050/teacher` | Legacy teacher command dashboard |
| `http://localhost:5050/api/teacher/ts` | T-S diagram data (JSON) |
| `http://localhost:5050/api/teacher/profiles` | Depth profiles (JSON) |
| `http://localhost:5050/api/teacher/distributions` | Zone histograms (JSON) |
| `http://localhost:5050/api/teacher/cce1` | CCE1 mooring + Nori overlay (JSON) |

> **Note:** The CCE1 mooring tab downloads a NetCDF file (~MB) from NOAA THREDDS on first load and caches it locally as `cce1_cache.nc`. Requires internet on first run.

---

## Repository Structure

```
datahacks-argo-buddy/
│
├── argobuddy_game.py          # Main Flask app — all routes, data logic, HTML/JS/CSS
│
├── app.py                     # Alternate Flask app (dual-mode: Student + Teacher toggle)
├── backend.py                 # Data backend for app.py — Plotly graph functions
├── templates/
│   └── index.html             # Frontend template for app.py
│
├── Data Files/
│   ├── single_argo.csv        # Primary dataset (17,816 rows, Argo float 4901639)
│   ├── calcofi_baseline.csv   # CalCOFI reference baseline
│   ├── 3901161_1386_EasyTSLite.csv  # Example single-profile CSV
│   └── 3901161_1386_EasyTSLite.md   # EasyOneArgoTSLite format documentation
│
├── 3901161/                   # 1,396 archived Argo profiles (exploration data)
│
├── EDA/
│   ├── EDA.ipynb              # Exploratory data analysis
│   ├── nori_backend.ipynb     # Core analysis — derives all ZONE_CONFIG values
│   └── data.ipynb             # Data loading & multi-float combination pipeline
│
├── Tests/Logic/
│   ├── refined_mood_engine.ipynb    # Mood classification against CalCOFI baseline
│   ├── nori_mood_engine_v2.ipynb    # Version 2 mood engine
│   └── historical_baseline.ipynb   # Baseline computation experiments
│
└── Generated Graphs/
    ├── thermocline.png              # Temperature vs. depth profile
    ├── zone_distributions.png       # Per-zone temperature histograms
    ├── cycle_trend.png              # Temperature trend across dive cycles
    ├── anomaly_frequency.png        # Mood distribution (% happy/warm/cold) per zone
    ├── salinity_profile.png         # Salinity depth profile + T-S diagram
    └── nori_mood_vs_depth.png       # Mood classification scatter plot
```

---

## How the Science Works

### Zone Classification
Each Argo reading is classified by pressure (≈ depth):

| Zone | Pressure | Temp Baseline | Temp Tolerance |
|------|----------|---------------|----------------|
| Sunlight 🌞 | 0–200 dbar | 12.2°C | ±1.45°C |
| Twilight 🌅 | 200–1000 dbar | 6.8°C | ±0.703°C |
| Midnight 🌑 | 1000–2000 dbar | 3.0°C | ±0.285°C |

### Mood Engine
Nori's mood is determined by comparing the student's temperature slider to the zone baseline:

```
anomaly = student_temp - zone_baseline

if |anomaly| ≤ tolerance  →  Happy 😊
if anomaly > tolerance    →  Too Warm 🥵
if anomaly < -tolerance   →  Too Cold 🥶
```

### Statistical Significance
The app runs a one-sample t-test to detect statistically significant anomalies:

```
z_score = |temp - baseline| / (std / √30)
p_value = 2 × (1 − Φ(z_score))
significant = p_value < 0.05
```

When `significant = True` and the mood is stressed, a discovery is logged in the teacher dashboard.

### Leave-One-Out Baseline
The teacher dashboard also shows a leave-one-out (LOO) analysis across 30 cycles × 3 zones — computing a per-cycle baseline by holding that cycle out of the global mean, then testing whether it's statistically anomalous.

---

## NGSS Alignment

| Standard | Concept Covered |
|----------|-----------------|
| MS-ESS2-5 | Earth's oceans, stratification, thermocline |
| MS-ESS2-6 | Ocean circulation and climate connections |
| MS-ESS3-5 | Human impacts — rising global temperatures |
| MS-LS2-1 | Food web dynamics and matter cycling |
| MS-LS2-4 | Ecosystem disruption |

---

## Analysis Notebooks

**`EDA/nori_backend.ipynb`** is the source of truth for all game parameters. It:
1. Loads `single_argo.csv` and classifies readings into the three zones
2. Computes per-zone statistics (mean, std, min, max temperature and salinity)
3. Derives mood frequency distributions (% of real readings that are warm/cold/happy)
4. Detects a warming trend in the sunlight zone surface layer across 168 cycles
5. Generates all graphs exported to `Generated Graphs/`

**`EDA/data.ipynb`** documents how the dataset was assembled — parsing Argo metadata headers, selecting float 4901639 from 10 Southern California coastal platforms, and exporting `single_argo.csv`.

**`Tests/Logic/refined_mood_engine.ipynb`** validates the mood classification logic against the CalCOFI historical baseline (11.536°C) and tests t-test-based anomaly detection.
