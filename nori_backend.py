"""
nori_backend.py  —  Data & graph engine for ArgoBuddy.
Extracted from nori_backend.ipynb.  All functions return Plotly JSON strings
so Flask routes can forward them directly to the browser.

HOOK POINTS (called by app.py routes):
  get_zone_stats()              →  dict   used by /api/zones
  get_ts_diagram_json()         →  str    used by /api/graph/ts
  get_salinity_profile_json()   →  str    used by /api/graph/profile
  get_zone_distributions_json() →  str    used by /api/graph/distributions

Data source: single_argo.csv  (168 Argo float cycles, Nov 2015 – Jan 2017)
"""

import os
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# ── CSV path ──────────────────────────────────────────────────────────────────
_CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'single_argo.csv')

_df_cache: pd.DataFrame | None = None


def _load_data() -> pd.DataFrame:
    """Load and cache the Argo CSV.  Zone column added on first call."""
    global _df_cache
    if _df_cache is not None:
        return _df_cache

    df = pd.read_csv(_CSV_PATH, usecols=[
        'pressure (decibar)',
        'temperature (degree_celsius)',
        'salinity (dimensionless)',
        'meta_cycle_number',
    ])
    df = df.dropna(subset=['temperature (degree_celsius)', 'salinity (dimensionless)'])

    def _zone(p: float) -> str:
        if p < 200:   return 'sunlight'
        if p < 1000:  return 'twilight'
        return 'midnight'

    df['zone'] = df['pressure (decibar)'].apply(_zone)
    df['pressure_bin'] = (df['pressure (decibar)'] // 50) * 50
    _df_cache = df
    return df


# ── Zone statistics — derived from nori_backend.ipynb cell-zones/cell-config ──
# If you re-run the notebook, paste the updated ZONE_CONFIG output here.
ZONE_STATS: dict = {
    'sunlight': {
        'name': 'Sunlight Zone', 'emoji': '🌞', 'depth': '0–200m',
        'depth_lo': 0, 'depth_hi': 200,
        'temp_mean': 12.215, 'temp_std': 2.900, 'temp_tolerance': 1.450,
        'temp_slider_min': 5.0, 'temp_slider_max': 20.0,
        'sal_mean': 33.359, 'sal_std': 0.285, 'sal_tolerance': 0.142,
        'sal_slider_min': 32.5, 'sal_slider_max': 34.2,
        'pct_warm': 38.8, 'pct_cold': 44.4, 'pct_happy': 16.7,
        'fact': ('🌍 The ocean absorbs 90 % of Earth\'s excess heat — '
                 'mostly right here in the Sunlight Zone!'),
    },
    'twilight': {
        'name': 'Twilight Zone', 'emoji': '🌅', 'depth': '200–1000m',
        'depth_lo': 200, 'depth_hi': 1000,
        'temp_mean': 6.820, 'temp_std': 1.405, 'temp_tolerance': 0.702,
        'temp_slider_min': 2.0, 'temp_slider_max': 14.0,
        'sal_mean': 34.122, 'sal_std': 0.167, 'sal_tolerance': 0.084,
        'sal_slider_min': 33.6, 'sal_slider_max': 34.6,
        'pct_warm': 39.4, 'pct_cold': 31.8, 'pct_happy': 28.8,
        'fact': ('💡 Every creature in this zone makes its own light. '
                 'Zero sunlight reaches this deep.'),
    },
    'midnight': {
        'name': 'Midnight Zone', 'emoji': '🌑', 'depth': '1000m+',
        'depth_lo': 1000, 'depth_hi': 2000,
        'temp_mean': 2.967, 'temp_std': 0.570, 'temp_tolerance': 0.285,
        'temp_slider_min': 1.0, 'temp_slider_max': 6.0,
        'sal_mean': 34.547, 'sal_std': 0.045, 'sal_tolerance': 0.022,
        'sal_slider_min': 34.3, 'sal_slider_max': 34.8,
        'pct_warm': 32.2, 'pct_cold': 36.9, 'pct_happy': 30.9,
        'fact': ('⏳ The water Nori is measuring right now may be '
                 '1,000+ years old — it sank from the surface centuries ago.'),
    },
}


def get_zone_stats() -> dict:
    """Return ZONE_STATS — serialised to JSON by /api/zones."""
    return ZONE_STATS


# ── Graph 1: T-S Diagram  (Tab 1 — Water Identity) ───────────────────────────
def get_ts_diagram_json() -> str:
    """
    T-S scatter: x = Salinity, y = Temperature, colour = depth.
    Trace index 0 = historical scatter.
    Trace index 1 = 'live-star' (empty; JS updates it via Plotly.restyle).
    """
    df = _load_data()
    sample = df.sample(min(3000, len(df)), random_state=42)

    fig = go.Figure()

    # ── Trace 0: historical scatter (from nori_backend.ipynb cell-sal) ──
    fig.add_trace(go.Scattergl(
        x=sample['salinity (dimensionless)'],
        y=sample['temperature (degree_celsius)'],
        mode='markers',
        marker=dict(
            color=sample['pressure (decibar)'],
            colorscale='Viridis_r', size=4, opacity=0.45,
            colorbar=dict(title='Depth (dbar)', thickness=14),
        ),
        name='Historical data',
        hovertemplate='Sal: %{x:.3f} PSU<br>Temp: %{y:.2f} °C<extra></extra>',
    ))

    # ── Trace 1: live red star — JS hooks into this trace ──
    fig.add_trace(go.Scatter(
        x=[None], y=[None],
        mode='markers',
        marker=dict(symbol='star', size=20, color='red',
                    line=dict(color='white', width=1.5)),
        name='Current reading',
        hovertemplate='Sal: %{x:.3f} PSU<br>Temp: %{y:.2f} °C<extra></extra>',
    ))

    fig.update_layout(
        title='T-S Diagram — Water Mass Fingerprint',
        xaxis_title='Salinity (PSU)',
        yaxis_title='Temperature (°C)',
        template='plotly_white',
        legend=dict(x=0.01, y=0.99),
        height=500,
        margin=dict(l=55, r=20, t=55, b=50),
    )
    return fig.to_json()


# ── Graph 2: Vertical Profiles  (Tab 2 — Ocean Layers) ───────────────────────
def get_salinity_profile_json() -> str:
    """
    Two-panel subplot: Temperature vs Depth (left) and Salinity vs Depth (right).
    Both y-axes are inverted so depth increases downward.
    Matches the chart produced in nori_backend.ipynb cell-sal / cell-thermo.
    """
    df = _load_data()

    profile = df.groupby('pressure_bin').agg(
        temp_mean=('temperature (degree_celsius)', 'mean'),
        temp_std= ('temperature (degree_celsius)', 'std'),
        sal_mean= ('salinity (dimensionless)',      'mean'),
        sal_std=  ('salinity (dimensionless)',      'std'),
    ).reset_index().dropna()

    fig = make_subplots(rows=1, cols=2,
                        subplot_titles=['Temperature vs Depth', 'Salinity vs Depth'],
                        shared_yaxes=True)

    zone_bands = [
        (0,    200,  'rgba(243,156,18,0.09)',   '🌞 Sunlight'),
        (200,  1000, 'rgba(142,68,173,0.09)',   '🌅 Twilight'),
        (1000, 2100, 'rgba(44,62,80,0.13)',     '🌑 Midnight'),
    ]
    for lo, hi, color, _ in zone_bands:
        for col in (1, 2):
            fig.add_hrect(y0=lo, y1=hi, fillcolor=color, line_width=0, row=1, col=col)

    # Temperature ±1 std band
    x_band_t = (list(profile['temp_mean'] + profile['temp_std']) +
                list((profile['temp_mean'] - profile['temp_std'])[::-1]))
    y_band   = list(profile['pressure_bin']) + list(profile['pressure_bin'][::-1])
    fig.add_trace(go.Scatter(x=x_band_t, y=y_band,
                             fill='toself', fillcolor='rgba(70,130,180,0.18)',
                             line=dict(color='rgba(0,0,0,0)'),
                             showlegend=False, hoverinfo='skip'), row=1, col=1)
    fig.add_trace(go.Scatter(x=profile['temp_mean'], y=profile['pressure_bin'],
                             mode='lines', line=dict(color='steelblue', width=2.5),
                             name='Temperature',
                             hovertemplate='%{y} dbar → %{x:.2f} °C<extra></extra>'),
                  row=1, col=1)

    # Salinity ±1 std band
    x_band_s = (list(profile['sal_mean'] + profile['sal_std']) +
                list((profile['sal_mean'] - profile['sal_std'])[::-1]))
    fig.add_trace(go.Scatter(x=x_band_s, y=y_band,
                             fill='toself', fillcolor='rgba(0,180,150,0.18)',
                             line=dict(color='rgba(0,0,0,0)'),
                             showlegend=False, hoverinfo='skip'), row=1, col=2)
    fig.add_trace(go.Scatter(x=profile['sal_mean'], y=profile['pressure_bin'],
                             mode='lines', line=dict(color='teal', width=2.5),
                             name='Salinity',
                             hovertemplate='%{y} dbar → %{x:.3f} PSU<extra></extra>'),
                  row=1, col=2)

    fig.update_yaxes(autorange='reversed', title_text='Depth (decibar) ↓', row=1, col=1)
    fig.update_xaxes(title_text='Temperature (°C)', row=1, col=1)
    fig.update_xaxes(title_text='Salinity (PSU)', row=1, col=2)
    fig.update_layout(
        title="Nori's Vertical Profiles — Thermocline & Halocline",
        template='plotly_white', height=520,
        margin=dict(l=60, r=20, t=60, b=50),
    )
    return fig.to_json()


# ── Graph 3: Zone Temperature Distributions  (Tab 3 — Statistical Safety) ─────
def get_zone_distributions_json() -> str:
    """
    Three-panel histogram: one per zone.
    Dashed black line = baseline mean.  Green band = comfort zone (±tolerance).
    Matches nori_backend.ipynb cell-dist.
    """
    df = _load_data()

    cols   = ['sunlight', 'twilight', 'midnight']
    titles = [
        'Sunlight Zone 🌞  (0–200 m)',
        'Twilight Zone 🌅  (200–1000 m)',
        'Midnight Zone 🌑  (1000 m+)',
    ]
    colors = {'sunlight': '#f39c12', 'twilight': '#8e44ad', 'midnight': '#4a6278'}

    fig = make_subplots(rows=1, cols=3, subplot_titles=titles)

    for idx, zkey in enumerate(cols, 1):
        s = ZONE_STATS[zkey]
        zone_data = df[df['zone'] == zkey]['temperature (degree_celsius)']

        fig.add_trace(go.Histogram(
            x=zone_data, nbinsx=35,
            marker_color=colors[zkey], opacity=0.72,
            name=s['name'],
            hovertemplate='Temp: %{x:.1f} °C  Count: %{y}<extra></extra>',
        ), row=1, col=idx)

        # Baseline vertical line
        fig.add_vline(x=s['temp_mean'], line_dash='dash',
                      line_color='black', line_width=2, row=1, col=idx)

        # Comfort zone shading
        fig.add_vrect(
            x0=s['temp_mean'] - s['temp_tolerance'],
            x1=s['temp_mean'] + s['temp_tolerance'],
            fillcolor='rgba(46,204,113,0.16)', line_width=0,
            row=1, col=idx,
        )

        fig.update_xaxes(title_text='Temperature (°C)', row=1, col=idx)

    fig.update_yaxes(title_text='Reading count', row=1, col=1)
    fig.update_layout(
        title='Temperature Distribution Per Zone  —  dashed = baseline · green = comfort zone',
        template='plotly_white', height=460, showlegend=False,
        margin=dict(l=60, r=20, t=70, b=50),
    )
    return fig.to_json()
