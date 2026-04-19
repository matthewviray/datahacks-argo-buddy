import streamlit as st
import requests
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# ── Page Config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Nori's Ocean Adventure 🌊",
    page_icon="🌊",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ── CSS Theme ─────────────────────────────────────────────────────────────────
def load_css(accent='#f39c12'):
    st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

    html, body, [class*="css"] {{
        font-family: 'Nunito', sans-serif;
    }}
    .stApp {{
        background: linear-gradient(180deg, #0a1628 0%, #0d2137 60%, #0a1628 100%);
        color: white;
    }}
    .main-header {{
        background: linear-gradient(135deg, #0d2137, #1a3a5c);
        border-bottom: 3px solid {accent};
        padding: 1.5rem 2rem;
        border-radius: 0 0 20px 20px;
        text-align: center;
        margin-bottom: 1.5rem;
    }}
    .zone-card {{
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-left: 4px solid {accent};
        border-radius: 15px;
        padding: 1.5rem;
        margin: 0.5rem 0;
    }}
    .mood-card {{
        border-radius: 20px;
        padding: 2rem;
        text-align: center;
        margin: 1rem 0;
    }}
    .risk-item {{
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        padding: 0.5rem 1rem;
        margin: 0.3rem 0;
        border-left: 3px solid {accent};
        color: rgba(255,255,255,0.85);
    }}
    .tipping-warning {{
        background: linear-gradient(135deg, #7b0000, #c0392b);
        border-radius: 15px;
        padding: 1.5rem;
        text-align: center;
        border: 2px solid #e74c3c;
        animation: pulse 1.2s infinite;
    }}
    @keyframes pulse {{
        0%   {{ opacity: 1.0; transform: scale(1.00); }}
        50%  {{ opacity: 0.85; transform: scale(1.01); }}
        100% {{ opacity: 1.0; transform: scale(1.00); }}
    }}
    .zone-progress {{
        display: flex;
        justify-content: center;
        gap: 0.8rem;
        margin: 0.8rem 0 1.2rem 0;
        flex-wrap: wrap;
    }}
    .zone-pill {{
        padding: 0.35rem 1rem;
        border-radius: 20px;
        font-size: 0.82rem;
        font-weight: 700;
    }}
    .zone-pill-active  {{ background: {accent}; color: #0a1628; }}
    .zone-pill-done    {{ background: rgba(46,204,113,0.25); color: #2ecc71; border: 1px solid #2ecc71; }}
    .zone-pill-locked  {{ background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.35); }}
    .climate-fact {{
        background: linear-gradient(135deg, rgba(52,152,219,0.15), rgba(155,89,182,0.15));
        border: 1px solid rgba(52,152,219,0.35);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        margin: 0.8rem 0;
    }}
    .landing-card {{
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 18px;
        padding: 2rem;
        text-align: center;
        height: 100%;
    }}
    div[data-testid="metric-container"] {{
        background: rgba(255,255,255,0.06);
        border-radius: 12px;
        padding: 0.8rem;
        border: 1px solid rgba(255,255,255,0.1);
    }}
    .stButton > button {{
        background: linear-gradient(135deg, {accent}, #e67e22);
        color: #0a1628 !important;
        font-weight: 800;
        font-size: 1rem;
        padding: 0.65rem 1.5rem;
        border: none !important;
        border-radius: 25px;
        width: 100%;
        transition: transform 0.15s, box-shadow 0.15s;
    }}
    .stButton > button:hover {{
        transform: scale(1.03);
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }}
    h1, h2, h3 {{ color: white !important; }}
    label, .stSlider p {{ color: rgba(255,255,255,0.85) !important; }}
    </style>
    """, unsafe_allow_html=True)


# ── ZONE CONFIG — derived from nori_backend.ipynb ─────────────────────────────
ZONE_CONFIG = {
    'Sunlight Zone 🌞': {
        'baseline': 12.215, 'tolerance': 1.45,  'temp_std': 2.900,
        'slider_min': 5.0,  'slider_max': 20.0, 'slider_default': 12.2,
        'sal_baseline': 33.359, 'sal_tolerance': 0.143,
        'tipping_point': 19.5,
        'pct_warm': 34.2, 'pct_cold': 18.1, 'pct_happy': 47.7,
        'depth_range': '0 – 200m',
        'accent':    '#f39c12',
        'residents': '🪸 Coral  🐠 Tropical fish  🐢 Sea turtles  🐬 Dolphins',
        'climate_story': '🌡️ The Crisis Zone — Climate change hits here first and hardest.',
        'zone_desc': (
            'The sunlit surface where 90% of marine life lives. '
            'Powered by sunlight, warm, and full of life — but the most '
            'vulnerable to rising temperatures.'
        ),
        'dive_label': '🤿 Dive to Twilight Zone 🌅',
    },
    'Twilight Zone 🌅': {
        'baseline': 6.820,  'tolerance': 0.703, 'temp_std': 1.405,
        'slider_min': 2.0,  'slider_max': 14.0, 'slider_default': 6.8,
        'sal_baseline': 34.122, 'sal_tolerance': 0.084,
        'tipping_point': 10.3,
        'pct_warm': 28.5, 'pct_cold': 22.3, 'pct_happy': 49.2,
        'depth_range': '200 – 1000m',
        'accent':    '#8e44ad',
        'residents': '💡 Bioluminescent creatures  🦑 Squid  🐟 Lanternfish  🪼 Jellyfish',
        'climate_story': '⚠️ The Warning Zone — Heat penetrating here means the crisis is deepening.',
        'zone_desc': (
            'Barely any sunlight reaches here. The thermocline — the sharp '
            'temperature boundary — lives in this zone. When heat breaks '
            'through, the oxygen minimum zone expands and deep creatures '
            'have nowhere to go.'
        ),
        'dive_label': '🤿 Dive to Midnight Zone 🌑',
    },
    'Midnight Zone 🌑': {
        'baseline': 2.967,  'tolerance': 0.285, 'temp_std': 0.570,
        'slider_min': 1.0,  'slider_max': 6.0,  'slider_default': 3.0,
        'sal_baseline': 34.547, 'sal_tolerance': 0.023,
        'tipping_point': 4.4,
        'pct_warm': 15.2, 'pct_cold': 31.8, 'pct_happy': 53.0,
        'depth_range': '1000 – 2000m',
        'accent':    '#85c1e9',
        'residents': '🦐 Deep sea shrimp  🐙 Giant squid  🐟 Anglerfish  🦠 Extremophiles',
        'climate_story': '🕰️ The Memory Zone — Warming here takes centuries to reverse.',
        'zone_desc': (
            'Pitch black. Crushing pressure. Near-freezing temperatures. '
            'Nothing changes here naturally for hundreds of years. Any '
            'anomaly Nori detects is a long-term climate alarm with '
            'consequences felt for generations.'
        ),
        'dive_label': None,
    },
}

# ── Mood Definitions ──────────────────────────────────────────────────────────
ZONE_MOODS = {
    'Sunlight Zone 🌞': {
        'warm': {
            'emoji': '🥵', 'color': '#e74c3c', 'bg': 'rgba(231,76,60,0.2)',
            'headline': 'Too Hot! Nori is Sweating 🥵',
            'consequence': 'Water is warmer than normal. Coral reefs are bleaching, fish are fleeing, sea turtles are disoriented.',
            'risks': ['🪸 Coral bleaching beginning', '🐠 Fish migrating away', '🐢 Sea turtle nesting disrupted', '🦠 Harmful algae blooms forming'],
            'climate_link': 'This is what climate change looks like from inside the ocean — absorbing excess heat from the atmosphere.',
        },
        'cold': {
            'emoji': '🥶', 'color': '#3498db', 'bg': 'rgba(52,152,219,0.2)',
            'headline': 'Too Cold! Nori is Shivering 🥶',
            'consequence': 'Cold upwelling pushing nutrients to the surface. Great for plankton — stressful for warm-water species.',
            'risks': ['🌊 Cold upwelling event', '🐟 Warm-water fish displaced', '🪸 Coral cold-stressed', '🦅 Seabird food chain disrupted'],
            'climate_link': 'Cold anomalies can signal disrupted ocean circulation — a side effect of melting polar ice.',
        },
        'happy': {
            'emoji': '🐠', 'color': '#2ecc71', 'bg': 'rgba(46,204,113,0.2)',
            'headline': 'Perfect! Nori is Thriving 🐠',
            'consequence': "Temperature is right in Nori's comfort zone. The surface ecosystem is healthy and in balance.",
            'risks': ['✅ Coral reefs healthy', '✅ Fish populations stable', '✅ Marine food chain intact', '✅ Plankton thriving'],
            'climate_link': "This is what healthy baselines look like — what we're working to protect.",
        },
    },
    'Twilight Zone 🌅': {
        'warm': {
            'emoji': '😰', 'color': '#e67e22', 'bg': 'rgba(230,126,34,0.2)',
            'headline': 'Heat Invading! Nori is Stressed 😰',
            'consequence': 'Warm water penetrating deeper than it should. The oxygen minimum zone is expanding — creatures are suffocating.',
            'risks': ['🫧 Oxygen minimum zone expanding', '🦑 Squid habitat shrinking', '💡 Bioluminescence disrupted', '🌡️ Thermocline shifting deeper'],
            'climate_link': 'Heat reaching the twilight zone means the crisis is no longer just a surface problem.',
        },
        'cold': {
            'emoji': '🫧', 'color': '#9b59b6', 'bg': 'rgba(155,89,182,0.2)',
            'headline': 'Too Cold! Nori is Hiding 🫧',
            'consequence': 'Cold layer thickening, pushing twilight creatures upward into unfamiliar territory.',
            'risks': ['🐟 Deep species pushed toward surface', '🌊 Thermocline sharpening', '🦈 Predator-prey balance broken', '🪼 Jellyfish blooms forming'],
            'climate_link': 'Cold intrusions in the twilight zone can signal disrupted deep circulation patterns.',
        },
        'happy': {
            'emoji': '🔦', 'color': '#1abc9c', 'bg': 'rgba(26,188,156,0.2)',
            'headline': 'All Good! Nori is Exploring 🔦',
            'consequence': 'Thermocline is stable. Bioluminescent creatures glow undisturbed in the dark.',
            'risks': ['✅ Thermocline holding steady', '✅ Oxygen levels normal', '✅ Deep creatures undisturbed', '✅ Pressure balanced'],
            'climate_link': "A stable twilight zone means the surface crisis hasn't yet penetrated this deep.",
        },
    },
    'Midnight Zone 🌑': {
        'warm': {
            'emoji': '🚨', 'color': '#c0392b', 'bg': 'rgba(192,57,43,0.25)',
            'headline': '🚨 ALARM — Deep Ocean Warming!',
            'consequence': 'This is a major long-term climate signal. The deep ocean takes centuries to warm naturally.',
            'risks': ['🚨 Century-scale climate alarm', '🦐 Deep sea ecosystem collapsing', '🌊 Thermohaline circulation disrupted', '❌ No escape route for deep species', '⏳ Effects felt for 300+ years'],
            'climate_link': '⚠️ If the midnight zone is warming we have crossed a threshold that will take generations to reverse.',
        },
        'cold': {
            'emoji': '🧊', 'color': '#85c1e9', 'bg': 'rgba(133,193,233,0.15)',
            'headline': 'Very Cold! Nori is Dormant 🧊',
            'consequence': 'Dense cold polar water sinking and pushing through the deep. Thermohaline circulation is active and healthy.',
            'risks': ['🧊 Cold deep water formation normal', '🌊 Global ocean conveyor active', '🐟 Cold-adapted species stable', '🌍 Deep circulation working'],
            'climate_link': 'Cold deep water is healthy — it drives global ocean circulation that regulates Earth\'s climate.',
        },
        'happy': {
            'emoji': '🌑', 'color': '#566573', 'bg': 'rgba(86,101,115,0.2)',
            'headline': 'Stable! Nori is Resting 🌑',
            'consequence': "The deep ocean is in its ancient stable state. Conditions here haven't changed in decades.",
            'risks': ['✅ Deep ecosystem undisturbed', '✅ Ancient water conditions preserved', '✅ Pressure and temp balanced', '✅ Thermohaline circulation normal'],
            'climate_link': "A stable midnight zone means the climate crisis hasn't yet reached its deepest and most serious stage.",
        },
    },
}

ZONE_FACTS = {
    'Sunlight Zone 🌞': "🌍 The ocean absorbs **90% of Earth's excess heat** — mostly right here in the sunlight zone.",
    'Twilight Zone 🌅': "💡 Every creature in this zone **makes its own light**. Zero sunlight reaches this deep.",
    'Midnight Zone 🌑': "⏳ The water Nori is measuring right now **may be 1,000+ years old** — it sank from the surface centuries ago.",
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def get_mood(zone_name, temperature):
    cfg     = ZONE_CONFIG[zone_name]
    anomaly = temperature - cfg['baseline']
    if abs(anomaly) <= cfg['tolerance']:
        return 'happy', anomaly
    return ('warm' if anomaly > 0 else 'cold'), anomaly


def heat_meter(temperature, cfg):
    lo, hi  = cfg['slider_min'], cfg['slider_max']
    pct     = min(100, max(0, (temperature - lo) / (hi - lo) * 100))
    base_pct= (cfg['baseline'] - lo) / (hi - lo) * 100
    return f"""
    <div style="margin:0.6rem 0 1rem 0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:0.78rem;color:rgba(255,255,255,0.5);">Cold ❄️</span>
        <span style="font-size:0.78rem;color:rgba(255,255,255,0.7);font-weight:700;">🌡️ Ocean Heat Level</span>
        <span style="font-size:0.78rem;color:rgba(255,255,255,0.5);">🔥 Hot</span>
      </div>
      <div style="background:rgba(255,255,255,0.1);border-radius:10px;height:24px;width:100%;position:relative;overflow:visible;">
        <div style="background:linear-gradient(90deg,#3498db,#f39c12,#e74c3c);border-radius:10px;height:100%;width:{pct}%;transition:width 0.3s;"></div>
        <div style="position:absolute;top:-18px;left:{base_pct}%;transform:translateX(-50%);color:white;font-size:0.68rem;white-space:nowrap;">▼ baseline</div>
      </div>
    </div>
    """


@st.cache_data
def load_data():
    try:
        df = pd.read_csv('single_argo.csv', usecols=[
            'pressure (decibar)', 'temperature (degree_celsius)',
            'salinity (dimensionless)', 'meta_cycle_number'
        ])
        df = df.dropna(subset=['temperature (degree_celsius)'])
        def zone(p):
            if p < 200:   return 'Sunlight Zone 🌞'
            elif p < 1000: return 'Twilight Zone 🌅'
            return 'Midnight Zone 🌑'
        df['Zone'] = df['pressure (decibar)'].apply(zone)
        return df
    except Exception:
        return None


def dark_chart():
    fig, ax = plt.subplots(figsize=(5, 2.8))
    fig.patch.set_facecolor('none')
    ax.set_facecolor('none')
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.tick_params(colors='white', labelsize=8)
    return fig, ax


# ── Session State ─────────────────────────────────────────────────────────────
for key, val in [('zone_idx', 0), ('show_landing', True), ('visited', set())]:
    if key not in st.session_state:
        st.session_state[key] = val

zone_names = list(ZONE_CONFIG.keys())
df         = load_data()

# ══════════════════════════════════════════════════════════════════════════════
# LANDING PAGE
# ══════════════════════════════════════════════════════════════════════════════
if st.session_state.show_landing:
    load_css('#f39c12')

    st.markdown("""
    <div style="text-align:center;padding:3rem 1rem 1.5rem;">
        <div style="font-size:5rem;">🌊</div>
        <h1 style="font-size:2.8rem;font-weight:800;
            background:linear-gradient(135deg,#f39c12,#3498db);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            Nori's Ocean Adventure
        </h1>
        <p style="font-size:1.2rem;color:rgba(255,255,255,0.8);max-width:620px;margin:1rem auto;">
            Dive into the real ocean with <strong>Nori</strong> — an autonomous robot exploring
            the Pacific. Control the temperature. Watch her mood change.
            Discover what climate change <em>actually feels like</em> to ocean life.
        </p>
    </div>
    """, unsafe_allow_html=True)

    c1, c2, c3 = st.columns(3)
    cards = [
        ('🌞', 'Sunlight Zone', '0–200m', 'The Crisis Zone', 'Where coral, fish & turtles live — the most vulnerable to warming.', '#f39c12'),
        ('🌅', 'Twilight Zone', '200–1000m', 'The Warning Zone', 'Bioluminescent creatures in the dark — heat invading here is serious.', '#8e44ad'),
        ('🌑', 'Midnight Zone', '1000–2000m', 'The Memory Zone', 'Ancient, stable deep water — any warming is a century-scale alarm.', '#85c1e9'),
    ]
    for col, (emoji, name, depth, story, desc, accent) in zip([c1, c2, c3], cards):
        with col:
            st.markdown(f"""
            <div class="landing-card">
                <div style="font-size:3.5rem;">{emoji}</div>
                <h3 style="color:{accent};">{name}</h3>
                <div style="font-size:0.8rem;color:rgba(255,255,255,0.5);margin-bottom:0.5rem;">{depth}</div>
                <div style="font-weight:700;color:{accent};margin-bottom:0.5rem;">{story}</div>
                <p style="font-size:0.88rem;color:rgba(255,255,255,0.75);">{desc}</p>
            </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    _, mid, _ = st.columns([1, 2, 1])
    with mid:
        if st.button("🚀 Start Nori's Adventure!", use_container_width=True):
            st.session_state.show_landing = False
            st.rerun()

    # Real data stats
    st.markdown("---")
    st.markdown("### 📡 Powered by Real Ocean Data")
    if df is not None:
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Total Readings", f"{len(df):,}")
        m2.metric("Dive Cycles",    f"{df['meta_cycle_number'].nunique()}")
        m3.metric("Max Depth",      "2,000m")
        m4.metric("Float ID",       "4901639")

        # Quick thermocline teaser chart
        st.markdown("#### 🌡️ Preview: Nori's real temperature profile (the thermocline)")
        profile = df.groupby((df['pressure (decibar)'] // 50) * 50)['temperature (degree_celsius)'].mean().reset_index()
        fig, ax = dark_chart()
        ax.plot(profile['temperature (degree_celsius)'], profile['pressure (decibar)'],
                color='#f39c12', linewidth=2.5)
        ax.axhspan(0,    200,  alpha=0.1, color='#f39c12')
        ax.axhspan(200,  1000, alpha=0.1, color='#8e44ad')
        ax.axhspan(1000, 2100, alpha=0.1, color='#85c1e9')
        ax.invert_yaxis()
        ax.set_xlabel('Temperature (°C)', color='white', fontsize=9)
        ax.set_ylabel('Depth (decibar)', color='white', fontsize=9)
        plt.tight_layout()
        st.pyplot(fig, transparent=True)
        plt.close()
    st.stop()

# ══════════════════════════════════════════════════════════════════════════════
# MAIN ZONE EXPLORER
# ══════════════════════════════════════════════════════════════════════════════
current  = zone_names[st.session_state.zone_idx]
cfg      = ZONE_CONFIG[current]
load_css(cfg['accent'])

# Header
st.markdown(f"""
<div class="main-header">
    <div style="font-size:0.85rem;color:rgba(255,255,255,0.55);margin-bottom:0.3rem;">
        {cfg['climate_story']}
    </div>
    <h1 style="margin:0;font-size:2rem;">🤖 Nori is in the {current}</h1>
    <div style="font-size:0.9rem;color:rgba(255,255,255,0.65);">
        Depth: {cfg['depth_range']} &nbsp;·&nbsp; Historical baseline: {cfg['baseline']}°C
    </div>
</div>
""", unsafe_allow_html=True)

# Zone progress pills
pills = ''
for i, z in enumerate(zone_names):
    if i < st.session_state.zone_idx:
        cls, label = 'zone-pill zone-pill-done',   f'✅ {z}'
    elif i == st.session_state.zone_idx:
        cls, label = 'zone-pill zone-pill-active', f'➤ {z}'
    else:
        cls, label = 'zone-pill zone-pill-locked', f'🔒 {z}'
    pills += f'<span class="{cls}">{label}</span>'
st.markdown(f'<div class="zone-progress">{pills}</div>', unsafe_allow_html=True)

# ── 3-column layout ───────────────────────────────────────────────────────────
left, mid, right = st.columns([1.2, 1.1, 1])

# ── LEFT — Controls ───────────────────────────────────────────────────────────
with left:
    st.markdown(f"""
    <div class="zone-card">
        <h3 style="color:{cfg['accent']};margin-top:0;">{current}</h3>
        <p style="color:rgba(255,255,255,0.8);">{cfg['zone_desc']}</p>
        <p><strong>Who lives here:</strong><br>
           <span style="color:rgba(255,255,255,0.7);">{cfg['residents']}</span></p>
    </div>""", unsafe_allow_html=True)

    st.markdown("### 🌡️ Adjust Water Temperature")
    temperature = st.slider(
        "Temperature (°C)",
        min_value=float(cfg['slider_min']),
        max_value=float(cfg['slider_max']),
        value=float(cfg['slider_default']),
        step=0.1,
        help=f"Comfort zone: {cfg['baseline'] - cfg['tolerance']:.1f}°C – "
             f"{cfg['baseline'] + cfg['tolerance']:.1f}°C  |  "
             f"Tipping point: {cfg['tipping_point']:.1f}°C"
    )

    temp_status, anomaly = get_mood(current, temperature)
    mood_info = ZONE_MOODS[current][temp_status]

    st.markdown(heat_meter(temperature, cfg), unsafe_allow_html=True)

    m1, m2 = st.columns(2)
    m1.metric("Your Temp",  f"{temperature:.1f}°C", f"{anomaly:+.1f}°C vs baseline")
    m2.metric("Baseline",   f"{cfg['baseline']:.1f}°C", f"±{cfg['tolerance']:.1f}°C zone")

    st.markdown("### 🧂 Adjust Salinity")
    salinity    = st.slider(
        "Salinity (PSU)",
        min_value=round(cfg['sal_baseline'] - 0.8, 2),
        max_value=round(cfg['sal_baseline'] + 0.8, 2),
        value=round(cfg['sal_baseline'], 2),
        step=0.01
    )
    sal_delta = salinity - cfg['sal_baseline']
    if abs(sal_delta) <= cfg['sal_tolerance']:
        sal_msg, sal_col = '✅ Normal Salinity',                    '#2ecc71'
    elif sal_delta < 0:
        sal_msg, sal_col = '💧 Too Fresh — possible glacial melt!', '#3498db'
    else:
        sal_msg, sal_col = '🧂 Too Salty — evaporation anomaly',   '#e67e22'

    st.markdown(f'<p style="color:{sal_col};font-weight:700;margin:0;">{sal_msg}</p>',
                unsafe_allow_html=True)
    if sal_delta < -cfg['sal_tolerance']:
        st.markdown("""
        <div class="climate-fact">
            <strong>🧊 Glacial Melt Signal</strong><br>
            <span style="color:rgba(255,255,255,0.8);">
            Freshwater diluting ocean salinity is a measurable signature of
            melting ice sheets and glaciers. As polar ice melts, it disrupts
            the density-driven circulation that moves heat and nutrients
            around the entire planet.
            </span>
        </div>""", unsafe_allow_html=True)

# ── MIDDLE — Mood + Consequences ──────────────────────────────────────────────
with mid:
    if temperature >= cfg['tipping_point']:
        st.markdown(f"""
        <div class="tipping-warning">
            <div style="font-size:3rem;">💀</div>
            <h2 style="color:white;margin:0.3rem 0;">TIPPING POINT CROSSED</h2>
            <p style="color:rgba(255,255,255,0.9);font-size:1rem;">
                Beyond <strong>{cfg['tipping_point']:.1f}°C</strong> in this zone,
                recovery becomes nearly impossible on human timescales.
            </p>
        </div>""", unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div class="mood-card" style="background:{mood_info['bg']};
                border:2px solid {mood_info['color']};">
            <div style="font-size:5rem;margin-bottom:0.4rem;">{mood_info['emoji']}</div>
            <h2 style="color:{mood_info['color']};margin:0;">{mood_info['headline']}</h2>
            <p style="margin-top:1rem;color:rgba(255,255,255,0.85);">
                {mood_info['consequence']}
            </p>
        </div>""", unsafe_allow_html=True)

    st.markdown("### 🌊 What's at risk?")
    for risk in mood_info['risks']:
        st.markdown(f'<div class="risk-item">{risk}</div>', unsafe_allow_html=True)

    st.markdown(f"""
    <div class="climate-fact" style="margin-top:1rem;">
        <strong>🌍 Climate Connection</strong><br>
        <span style="color:rgba(255,255,255,0.85);">{mood_info['climate_link']}</span>
    </div>""", unsafe_allow_html=True)

    # Thermocline education in twilight zone
    if current == 'Twilight Zone 🌅':
        st.markdown("""
        <div class="climate-fact">
            <strong>📐 The Thermocline</strong><br>
            <span style="color:rgba(255,255,255,0.8);">
            You are inside the thermocline — the boundary where temperature
            drops sharply from the warm surface to the cold deep. Climate change
            is pushing this boundary <em>deeper</em>, shrinking the sunlit zone
            where most life exists.
            </span>
        </div>""", unsafe_allow_html=True)

    if current == 'Midnight Zone 🌑' and temp_status == 'warm':
        st.markdown("""
        <div style="background:rgba(192,57,43,0.2);border:1px solid #c0392b;
                    border-radius:12px;padding:1rem;margin-top:1rem;">
            <strong>⏳ Century Clock</strong><br>
            <span style="color:rgba(255,255,255,0.8);">
            The deep ocean takes <strong>200–1000 years</strong> to exchange
            water with the surface. Warming detected here today will persist
            long after anyone alive now is gone.
            </span>
        </div>""", unsafe_allow_html=True)

# ── RIGHT — Data Analytics ─────────────────────────────────────────────────────
with right:
    st.markdown("### 📊 Real Data Insights")

    # Mood frequency bar chart
    st.markdown(f"**How stressed is Nori here historically?**")
    fig, ax = dark_chart()
    labels  = ['Happy', 'Too Warm', 'Too Cold']
    values  = [cfg['pct_happy'], cfg['pct_warm'], cfg['pct_cold']]
    colors  = ['#2ecc71', '#e74c3c', '#3498db']
    bars    = ax.barh(labels, values, color=colors, alpha=0.85, edgecolor='none', height=0.5)
    ax.bar_label(bars, fmt='%.1f%%', color='white', padding=4, fontsize=9)
    ax.set_xlim(0, 105)
    ax.set_xlabel('% of real readings', color='white', fontsize=8)
    plt.tight_layout()
    st.pyplot(fig, transparent=True)
    plt.close()

    # Historical temperature distribution
    if df is not None:
        zone_temps = df[df['Zone'] == current]['temperature (degree_celsius)']
        if len(zone_temps) > 0:
            st.markdown("**Your temp vs Nori's history:**")
            fig2, ax2 = dark_chart()
            ax2.hist(zone_temps, bins=30, color=cfg['accent'],
                     alpha=0.65, edgecolor='none', label='Historical readings')
            ax2.axvline(cfg['baseline'],  color='white',   lw=2, ls='--', label='Baseline')
            ax2.axvline(temperature,      color='#e74c3c',  lw=2, ls='-',  label='Your temp')
            ax2.axvspan(cfg['baseline'] - cfg['tolerance'],
                        cfg['baseline'] + cfg['tolerance'],
                        alpha=0.2, color='#2ecc71', label='Comfort zone')
            ax2.set_xlabel('Temperature (°C)', color='white', fontsize=8)
            ax2.set_ylabel('Count', color='white', fontsize=8)
            ax2.legend(fontsize=7, facecolor='#0d2137', labelcolor='white',
                       edgecolor='none')
            plt.tight_layout()
            st.pyplot(fig2, transparent=True)
            plt.close()

    # Did you know
    st.markdown(f"""
    <div class="climate-fact">
        <strong>🧠 Did you know?</strong><br>
        <span style="color:rgba(255,255,255,0.82);">{ZONE_FACTS[current]}</span>
    </div>""", unsafe_allow_html=True)

    # Percentile of current temp vs real data
    if df is not None:
        zone_temps = df[df['Zone'] == current]['temperature (degree_celsius)']
        if len(zone_temps) > 0:
            pct_rank = (zone_temps < temperature).mean() * 100
            st.metric(
                "Your temp is warmer than",
                f"{pct_rank:.0f}% of real readings",
                help="Based on Nori's actual historical data in this zone"
            )

# ── Navigation ────────────────────────────────────────────────────────────────
st.markdown("---")
b1, b2, b3 = st.columns([1, 2, 1])

with b1:
    if st.session_state.zone_idx > 0:
        if st.button("🆙 Surface Up", use_container_width=True):
            st.session_state.zone_idx -= 1
            st.rerun()

with b2:
    if cfg['dive_label']:
        if st.button(cfg['dive_label'], use_container_width=True):
            st.session_state.visited.add(current)
            st.session_state.zone_idx += 1
            st.rerun()
    else:
        st.markdown("""
        <div style="text-align:center;padding:0.7rem;">
            <span style="color:#f39c12;font-weight:800;font-size:1rem;">
                🎉 You've explored all 3 zones with Nori!
            </span>
        </div>""", unsafe_allow_html=True)

with b3:
    if st.button("🏠 Back to Start", use_container_width=True):
        st.session_state.zone_idx    = 0
        st.session_state.show_landing = True
        st.rerun()
