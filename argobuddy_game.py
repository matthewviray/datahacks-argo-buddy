#!/usr/bin/env python3
"""
ArgoBuddy – gamified ocean exploration app for middle schoolers.
Run: python3 argobuddy_game.py  →  http://localhost:5050
"""
from flask import Flask, jsonify, request
import pandas as pd
import numpy as np
from scipy import stats as _stats
import json, os
from datetime import datetime

app = Flask(__name__, static_folder=None)
_HERE = os.path.dirname(os.path.abspath(__file__))
_CSV  = os.path.join(_HERE, 'single_argo.csv')

# ── Zone data ─────────────────────────────────────────────────────────────────
ZONES = {
    'sunlight': {
        'name':'Sunlight Zone','emoji':'🌞','order':0,
        'baseline':12.215,'tolerance':1.45,
        'slider_min':5.0,'slider_max':20.0,'slider_default':12.2,
        'sal_baseline':33.359,'sal_tolerance':0.143,
        'tipping_point':19.5,
        'pct_warm':34.2,'pct_cold':18.1,'pct_happy':47.7,
        'temp_std':2.900,
        'depth':'0 – 200m','accent':'#ff9f1c',
        'residents':'🪸 Coral  🐠 Tropical fish  🐢 Sea turtles  🐬 Dolphins',
        'story':'🌡️ Crisis Zone — Climate change hits here first and hardest!',
        'desc':'The sunlit surface where 90% of marine life lives. Warm, colorful, and full of life — but the most vulnerable to rising temperatures.',
        'actions':[
            {'id':'document','label':'📡 Document & transmit data','correct':True,'why':None},
            {'id':'heat','label':'🔥 Activate surface heater','correct':False,
             'why':'Artificially heating the surface speeds up coral bleaching. Water above 19.5°C causes mass coral die-off — a tipping point that can\'t be reversed for decades. Coral reefs support 25% of ALL ocean life!'},
            {'id':'stir','label':'🌀 Stir the mixed layer','correct':False,
             'why':'Stirring the mixed layer wrecks the stable temperature layers that coral polyps need. Even a tiny 1–2°C increase above baseline triggers bleaching. This destroys the foundation of the whole ocean food web!'},
            {'id':'vent','label':'💨 Push warm water down','correct':False,
             'why':'Forcing warm surface water downward pushes heat into the thermocline, expanding the "dead zone" where most marine life can\'t survive. This is a key way climate change suffocates the deep ocean.'},
        ]
    },
    'twilight': {
        'name':'Twilight Zone','emoji':'🌅','order':1,
        'baseline':6.820,'tolerance':0.703,
        'slider_min':2.0,'slider_max':14.0,'slider_default':6.8,
        'sal_baseline':34.122,'sal_tolerance':0.084,
        'tipping_point':10.3,
        'pct_warm':28.5,'pct_cold':22.3,'pct_happy':49.2,
        'temp_std':1.405,
        'depth':'200 – 1000m','accent':'#c77dff',
        'residents':'💡 Bioluminescent creatures  🦑 Squid  🐟 Lanternfish  🪼 Jellyfish',
        'story':'⚠️ Warning Zone — Heat getting here means BIG trouble!',
        'desc':'Almost no sunlight reaches here. The thermocline — the sharp temperature boundary — lives in this zone. When heat breaks through, oxygen runs out and deep creatures have nowhere to go!',
        'actions':[
            {'id':'stabilize','label':'⚖️ Hold depth & record','correct':True,'why':None},
            {'id':'surface','label':'⬆️ Rush back to surface','correct':False,
             'why':'Rushing upward from the twilight zone drags cold water up, breaking the thermocline barrier. This lets warm surface water sink deeper — exactly what climate change is already doing! It suffocates deep-sea creatures.'},
            {'id':'mix','label':'🔀 Mix warm and cold layers','correct':False,
             'why':'Mixing the thermocline destroys the density barrier that keeps the ocean layers separate. This is the exact mechanism by which climate change is eroding ocean structure — and making it worse is irreversible on human timescales!'},
            {'id':'lights','label':'💡 Flash bioluminescent lights','correct':False,
             'why':'Even mild light pollution here disrupts the daily vertical migration of millions of creatures — a movement that drives the "biological carbon pump" which helps absorb CO₂ from the atmosphere. Disrupting it weakens Earth\'s climate defense!'},
        ]
    },
    'midnight': {
        'name':'Midnight Zone','emoji':'🌑','order':2,
        'baseline':2.967,'tolerance':0.285,
        'slider_min':1.0,'slider_max':6.0,'slider_default':3.0,
        'sal_baseline':34.547,'sal_tolerance':0.023,
        'tipping_point':4.4,
        'pct_warm':15.2,'pct_cold':31.8,'pct_happy':53.0,
        'temp_std':0.570,
        'depth':'1000 – 2000m','accent':'#4cc9f0',
        'residents':'🦐 Deep sea shrimp  🐙 Giant squid  🐟 Anglerfish  🦠 Extremophiles',
        'story':'🕰️ Memory Zone — Warming here takes CENTURIES to undo!',
        'desc':'Pitch black. Crushing pressure. Near-freezing temperatures. Nothing changes here naturally for hundreds of years. Any anomaly here is a long-term climate alarm — effects felt for generations!',
        'actions':[
            {'id':'transmit','label':'🚨 Transmit emergency data','correct':True,'why':None},
            {'id':'warm_sensor','label':'🌡️ Deploy heat probe burst','correct':False,
             'why':'The midnight zone\'s stability has lasted for centuries. Even a tiny artificial heat input can trigger permanent changes — the deep ocean takes 200–1,000 YEARS to exchange water with the surface. Any warming we cause today will outlast every living person!'},
            {'id':'ascent','label':'🚀 Emergency rapid ascent','correct':False,
             'why':'A rapid ascent from 2,000m drags dense cold water upward too fast, disrupting thermohaline circulation — the global ocean conveyor belt that regulates Earth\'s climate and determines weather patterns across entire continents!'},
            {'id':'anchor','label':'⚓ Drop anchor weight','correct':False,
             'why':'Dropping weights disturbs ancient seafloor sediment that has locked away carbon for millennia. Disturbing it can release CO₂ and methane — accelerating the very climate change we\'re trying to study and stop!'},
        ]
    }
}

MOODS = {
    'sunlight':{
        'warm':{'emoji':'🥵','color':'#ff6b6b','headline':'Too Hot! Argo is Sweating! 🥵',
                'consequence':'Water is warmer than normal. Coral reefs are bleaching and fish are fleeing!',
                'risks':['🪸 Coral bleaching starting!','🐠 Fish swimming away','🐢 Sea turtle nesting disrupted','🦠 Harmful algae blooms growing'],
                'climate':'This is what climate change looks like from inside the ocean — it\'s absorbing way too much heat from our atmosphere!'},
        'cold':{'emoji':'🥶','color':'#74b9ff','headline':'Too Cold! Argo is Shivering! 🥶',
                'consequence':'Cold water is pushing up from below — great for plankton, but stressful for warm-water creatures!',
                'risks':['🌊 Cold upwelling event','🐟 Warm-water fish displaced','🪸 Coral getting cold-stressed','🦅 Seabird food chain disrupted'],
                'climate':'Cold anomalies can signal disrupted ocean circulation — often a side effect of melting polar ice!'},
        'happy':{'emoji':'🐠','color':'#00f5c3','headline':'Perfect! Argo is Thriving! 🐠',
                 'consequence':'Temperature is right in the sweet spot. The surface ecosystem is healthy and balanced!',
                 'risks':['✅ Coral reefs healthy','✅ Fish populations stable','✅ Marine food chain intact','✅ Plankton thriving'],
                 'climate':'This is what healthy baselines look like — exactly what we\'re working to protect for the future!'},
    },
    'twilight':{
        'warm':{'emoji':'😰','color':'#fdcb6e','headline':'Heat Invading! Argo is Stressed! 😰',
                'consequence':'Warm water is pushing deeper than it should. The oxygen dead zone is getting bigger!',
                'risks':['🫧 Oxygen dead zone expanding!','🦑 Squid habitat shrinking','💡 Bioluminescence disrupted','🌡️ Thermocline shifting deeper'],
                'climate':'Heat reaching the twilight zone means the climate crisis is no longer just a surface problem — it\'s going deep!'},
        'cold':{'emoji':'🫧','color':'#a29bfe','headline':'Too Cold! Argo is Hiding! 🫧',
                'consequence':'Cold layer thickening — pushing twilight creatures upward into totally unfamiliar territory!',
                'risks':['🐟 Deep species pushed toward surface','🌊 Thermocline getting sharper','🦈 Predator-prey balance broken','🪼 Jellyfish blooms forming'],
                'climate':'Cold intrusions in the twilight zone can signal disrupted deep ocean circulation patterns!'},
        'happy':{'emoji':'🔦','color':'#55efc4','headline':'All Good! Argo is Exploring! 🔦',
                 'consequence':'Thermocline is stable. Bioluminescent creatures are glowing undisturbed in the dark!',
                 'risks':['✅ Thermocline holding steady','✅ Oxygen levels normal','✅ Deep creatures undisturbed','✅ Pressure balanced'],
                 'climate':'A stable twilight zone means the surface climate crisis hasn\'t yet broken through this deep — great news!'},
    },
    'midnight':{
        'warm':{'emoji':'🚨','color':'#ff7675','headline':'🚨 ALARM — Deep Ocean Warming!',
                'consequence':'MAJOR long-term climate signal! The deep ocean should NEVER warm this fast!',
                'risks':['🚨 Century-scale climate alarm!','🦐 Deep sea ecosystem collapsing','🌊 Thermohaline circulation disrupted','❌ No escape for deep species','⏳ Effects last 300+ years'],
                'climate':'If the midnight zone is warming, we may have crossed a threshold that will take GENERATIONS to reverse!'},
        'cold':{'emoji':'🧊','color':'#74b9ff','headline':'Very Cold! Argo is Dormant! 🧊',
                'consequence':'Dense cold polar water is circulating through the deep — this is actually healthy!',
                'risks':['🧊 Cold deep water formation normal','🌊 Global ocean conveyor active','🐟 Cold-adapted species stable','🌍 Deep circulation working'],
                'climate':'Cold deep water is healthy! It drives global ocean circulation that regulates Earth\'s entire climate system!'},
        'happy':{'emoji':'🌑','color':'#b2bec3','headline':'Stable! Argo is Resting! 🌑',
                 'consequence':'Deep ocean is in its ancient stable state. These conditions haven\'t changed in decades!',
                 'risks':['✅ Deep ecosystem undisturbed','✅ Ancient water conditions preserved','✅ Pressure and temp balanced','✅ Thermohaline circulation normal'],
                 'climate':'A stable midnight zone means the climate crisis hasn\'t reached its deepest — and most serious — stage yet!'},
    }
}

FACTS = {
    'sunlight':"The ocean absorbs 90% of Earth's excess heat — and most of that happens right here in the sunlight zone! 🌡️",
    'twilight':"Every single creature in this zone makes its own light! Not a single ray of sunlight reaches this deep! 💡",
    'midnight':"The water here may be over 1,000 years old — it sank from the surface back before Columbus sailed! ⏳",
}

ZONE_EDU = {
    'sunlight': {
        'science_facts': [
            'The ocean has absorbed 90% of Earth\'s excess heat since industrialization — most in this surface zone.',
            'Phytoplankton here produce 50% of ALL the oxygen on Earth through photosynthesis.',
            'El Niño events can warm this zone by 2–3°C, triggering mass coral bleaching events.',
            'Over 25% of ALL marine species depend on coral reefs found in this zone.',
            'This zone extends from the surface to 200m — about as deep as the Eiffel Tower is tall.',
        ],
        'tipping_text': 'Above 19.5°C, coral bleaching becomes irreversible. Coral reefs take 10–30 years to recover — if they recover at all. Once 50% of a reef is bleached, the entire ecosystem can collapse within months.',
        'key_numbers': [('Depth range','0–200 m'),('Avg temp','12.2°C'),('Avg salinity','33.36 PSU'),('Tipping point','19.5°C'),('Light level','Full sunlight')],
        'animal_spotlight': ('🐠', 'Clownfish', 'Lives inside sea anemone tentacles that would sting any other fish. It has a special mucus coating. If the coral bleaches, the anemone dies — and so does the clownfish home.'),
    },
    'twilight': {
        'science_facts': [
            '100% of creatures here make their own light (bioluminescence) — no photon from the sun reaches this depth.',
            'Millions of creatures perform a daily "vertical migration" — rising at night to feed, sinking at dawn to hide.',
            'The "twilight zone pump" moves carbon from surface to deep, locking away 6 billion tons of CO₂ per year.',
            'The giant squid lives here — the largest invertebrate on Earth, reaching 13 meters long.',
            'The oxygen minimum zone overlaps this depth — some parts have almost no breathable oxygen at all.',
        ],
        'tipping_text': 'When heat breaks through the thermocline above 10.3°C, the oxygen minimum zone expands. Deep-sea creatures have nowhere to go — they can\'t migrate to a different ocean. Species loss here is permanent on human timescales.',
        'key_numbers': [('Depth range','200–1000 m'),('Avg temp','6.8°C'),('Avg salinity','34.12 PSU'),('Tipping point','10.3°C'),('Light level','< 1% sunlight')],
        'animal_spotlight': ('💡', 'Lanternfish', 'Has rows of photophores (light organs) on its belly to camouflage against faint surface light from below — called counterillumination. There are more lanternfish on Earth than any other vertebrate.'),
    },
    'midnight': {
        'science_facts': [
            'The water here is 200–1,000 years old — it last touched the surface before Columbus reached the Americas.',
            'The midnight zone drives the Global Ocean Conveyor Belt — regulating climate on every continent.',
            'Over 200,000 species live here; scientists estimate 90% are still undiscovered.',
            'Pressure here is 200× the surface — equivalent to 50 jumbo jets standing on your head.',
            'Temperature barely changes year-to-year. A 0.1°C change is a major scientific alarm.',
        ],
        'tipping_text': 'The midnight zone has been stable for centuries. Any warming triggers thermohaline circulation collapse. Effects last 300–1,000 years — longer than all of recorded human history. There is NO recovery on human timescales.',
        'key_numbers': [('Depth range','1000–2000 m'),('Avg temp','3.0°C'),('Avg salinity','34.55 PSU'),('Tipping point','4.4°C'),('Light level','0% — total darkness')],
        'animal_spotlight': ('🐟', 'Anglerfish', 'Uses a bioluminescent lure to attract prey in total darkness. The female is 10× larger than the male — who permanently fuses to her body and shares her bloodstream. Nature\'s most extreme partnership.'),
    },
}

# ── Data loading ──────────────────────────────────────────────────────────────
_df = None
def get_df():
    global _df
    if _df is None:
        try:
            df = pd.read_csv(_CSV, usecols=[
                'pressure (decibar)', 'temperature (degree_celsius)',
                'salinity (dimensionless)', 'meta_cycle_number',
                'meta_profile_latitude', 'meta_profile_longitude', 'meta_profile_date'
            ])
            df = df.dropna(subset=['temperature (degree_celsius)'])
            df['zone'] = df['pressure (decibar)'].apply(
                lambda p: 'sunlight' if p < 200 else ('twilight' if p < 1000 else 'midnight'))
            _df = df
        except Exception as e:
            print(f'CSV error: {e}')
            _df = pd.DataFrame()
    return _df

def get_track():
    df = get_df()
    if not len(df): return []
    needed = ['meta_cycle_number', 'meta_profile_latitude', 'meta_profile_longitude']
    if not all(c in df.columns for c in needed): return []
    tc = 'temperature (degree_celsius)'
    sc = 'salinity (dimensionless)'
    pc = 'pressure (decibar)'
    agg = {'tm': (tc, 'mean'), 'tn': (tc, 'min'), 'tx': (tc, 'max'),
           'nr': (tc, 'count'), 'md': (pc, 'max')}
    if sc in df.columns:
        agg.update({'sm': (sc, 'mean'), 'sn': (sc, 'min'), 'sx': (sc, 'max')})
    per_stats = df.groupby('meta_cycle_number').agg(**agg)
    all_tm = per_stats['tm'].dropna().values
    all_sm = per_stats['sm'].dropna().values if 'sm' in per_stats.columns else []
    t = (df[needed + (['meta_profile_date'] if 'meta_profile_date' in df.columns else [])]
         .drop_duplicates('meta_cycle_number')
         .sort_values('meta_cycle_number')
         .dropna(subset=['meta_profile_latitude', 'meta_profile_longitude']))
    out = []
    for _, r in t.iterrows():
        c = int(r['meta_cycle_number'])
        item = {'cycle': c,
                'lat': round(float(r['meta_profile_latitude']), 4),
                'lon': round(float(r['meta_profile_longitude']), 4),
                'date': str(r.get('meta_profile_date', ''))[:10]}
        if c in per_stats.index:
            cs = per_stats.loc[c]
            item['tm'] = round(float(cs['tm']), 2)
            item['tn'] = round(float(cs['tn']), 2)
            item['tx'] = round(float(cs['tx']), 2)
            item['nr'] = int(cs['nr'])
            item['md'] = round(float(cs['md']), 0)
            if 'sm' in cs.index and not pd.isna(cs['sm']):
                item['sm'] = round(float(cs['sm']), 3)
                item['sn'] = round(float(cs['sn']), 3)
                item['sx'] = round(float(cs['sx']), 3)
                if len(all_sm):
                    item['sp'] = round(float((all_sm < cs['sm']).mean() * 100), 1)
            if len(all_tm):
                item['tp'] = round(float((all_tm < cs['tm']).mean() * 100), 1)
        out.append(item)
    return out

def get_sal_profile():
    df = get_df()
    if not len(df): return []
    sc, pc, tc = 'salinity (dimensionless)', 'pressure (decibar)', 'temperature (degree_celsius)'
    if sc not in df.columns: return []
    d = df[[pc, sc, tc]].dropna().copy()
    bins = list(range(0, 2100, 50))
    centers = [b + 25 for b in bins[:-1]]
    d['bin'] = pd.cut(d[pc], bins=bins, labels=centers)
    grp = d.groupby('bin', observed=True).agg(sm=(sc, 'mean'), ss=(sc, 'std'), tm=(tc, 'mean')).reset_index()
    grp = grp.dropna(subset=['sm'])
    return [{'d': int(row['bin']), 'sm': round(float(row['sm']), 3),
             'ss': round(float(row['ss']), 3) if not pd.isna(row['ss']) else 0,
             'tm': round(float(row['tm']), 2)} for _, row in grp.iterrows()]

def get_sal_hist():
    df = get_df()
    sc = 'salinity (dimensionless)'
    if not len(df) or sc not in df.columns:
        return {'sunlight': [], 'twilight': [], 'midnight': []}
    out = {}
    for z in ('sunlight', 'twilight', 'midnight'):
        col = df[df['zone'] == z][sc].dropna()
        out[z] = col.sample(min(400, len(col)), random_state=42).tolist() if len(col) else []
    return out

def get_ts_data():
    df = get_df()
    sc, tc = 'salinity (dimensionless)', 'temperature (degree_celsius)'
    if not len(df) or sc not in df.columns:
        return {'sunlight': [], 'twilight': [], 'midnight': []}
    d = df[[tc, sc, 'zone']].dropna()
    out = {}
    for z in ('sunlight', 'twilight', 'midnight'):
        sub = d[d['zone'] == z]
        samp = sub.sample(min(250, len(sub)), random_state=42) if len(sub) else sub
        out[z] = [{'x': round(float(r[sc]), 3), 'y': round(float(r[tc]), 2)}
                  for _, r in samp.iterrows()]
    return out

def safe_json(obj):
    return json.dumps(obj).replace('</script>', r'<\/script>')

# ── Teacher data functions ─────────────────────────────────────────────────────
def get_teacher_ts_data():
    df = get_df()
    sc, tc = 'salinity (dimensionless)', 'temperature (degree_celsius)'
    if not len(df) or sc not in df.columns:
        return {'zones': {}, 'track': []}
    d = df[[tc, sc, 'zone']].dropna()
    zones_out = {}
    for z in ('sunlight', 'twilight', 'midnight'):
        sub = d[d['zone'] == z]
        samp = sub.sample(min(500, len(sub)), random_state=42) if len(sub) else sub
        zones_out[z] = [{'x': round(float(r[sc]), 3), 'y': round(float(r[tc]), 2)}
                        for _, r in samp.iterrows()]
    track = get_track()
    ts_track = [{'x': t['sm'], 'y': t['tm'], 'cycle': t['cycle'], 'date': t.get('date', '')}
                for t in track if 'sm' in t and 'tm' in t]
    return {'zones': zones_out, 'track': ts_track}


def get_teacher_profiles_data():
    df = get_df()
    if not len(df): return []
    tc, sc, pc = 'temperature (degree_celsius)', 'salinity (dimensionless)', 'pressure (decibar)'
    bins    = list(range(0, 2100, 50))
    centers = [b + 25 for b in bins[:-1]]
    d = df[[pc, tc]].copy()
    d['bin'] = pd.cut(d[pc], bins=bins, labels=centers)
    tgrp = (d.groupby('bin', observed=True)
             .agg(tm=(tc, 'mean'), ts=(tc, 'std'))
             .reset_index().dropna(subset=['tm']))
    s_dict = {}
    if sc in df.columns:
        ds = df[[pc, sc]].dropna().copy()
        ds['bin'] = pd.cut(ds[pc], bins=bins, labels=centers)
        sgrp = (ds.groupby('bin', observed=True)
                  .agg(sm=(sc, 'mean'), ss=(sc, 'std'))
                  .reset_index().dropna(subset=['sm']))
        s_dict = {int(r['bin']): {'sm': round(float(r['sm']), 3),
                                   'ss': round(float(r['ss']), 3) if not pd.isna(r['ss']) else 0}
                  for _, r in sgrp.iterrows()}
    out = []
    for _, r in tgrp.iterrows():
        dv = int(r['bin'])
        item = {'d': dv, 'tm': round(float(r['tm']), 2),
                'ts': round(float(r['ts']), 2) if not pd.isna(r['ts']) else 0}
        if dv in s_dict:
            item.update(s_dict[dv])
        out.append(item)
    return out


def get_teacher_distributions_data():
    df = get_df()
    tc = 'temperature (degree_celsius)'
    if not len(df): return {}
    out = {}
    for z in ('sunlight', 'twilight', 'midnight'):
        col = df[df['zone'] == z][tc].dropna()
        if not len(col):
            continue
        lo, hi = float(col.min()), float(col.max())
        nbins = 30
        step  = (hi - lo) / nbins
        labels = [round(lo + i * step, 2) for i in range(nbins)]
        counts = [0] * nbins
        for v in col:
            b = min(nbins - 1, max(0, int((v - lo) / step)))
            counts[b] += 1
        zd = ZONES[z]
        out[z] = {'labels': labels, 'counts': counts,
                  'baseline': zd['baseline'], 'tolerance': zd['tolerance'],
                  'lo': round(lo, 2), 'hi': round(hi, 2)}
    return out


_CCE1_CACHE = None

def get_cce1_data():
    global _CCE1_CACHE
    if _CCE1_CACHE is not None:
        return _CCE1_CACHE
    cce1_url  = 'https://dods.ndbc.noaa.gov/thredds/fileServer/oceansites/DATA/CCE1/OS_CCE1_17_D_CTD.nc'
    cce1_file = os.path.join(_HERE, 'cce1_cache.nc')
    if not os.path.exists(cce1_file):
        try:
            import urllib.request
            print('Downloading CCE1 mooring data (~may take a moment)…')
            urllib.request.urlretrieve(cce1_url, cce1_file)
            print('CCE1 download complete.')
        except Exception as e:
            print(f'CCE1 download failed: {e}')
            _CCE1_CACHE = {'time': [], 'temp': [], 'sal': [], 'error': str(e)}
            return _CCE1_CACHE
    try:
        import netCDF4 as nc4
        with nc4.Dataset(cce1_file) as ds:
            tv = next((ds.variables[k] for k in ('TIME','time','JULD','juld') if k in ds.variables), None)
            if tv is None:
                raise ValueError('No time variable in CCE1 file')
            try:
                dates = nc4.num2date(tv[:], tv.units, calendar=getattr(tv,'calendar','standard'))
                time_strs = [d.strftime('%Y-%m-%dT%H:%M:%SZ') if hasattr(d,'strftime') else str(d) for d in dates]
            except Exception:
                time_strs = [str(i) for i in range(len(tv[:]))]
            def _extract(names, ndim_slice):
                for vn in names:
                    if vn in ds.variables:
                        raw = ds.variables[vn][:]
                        raw = raw[ndim_slice] if raw.ndim > 1 else raw
                        arr = np.ma.filled(raw.flatten(), fill_value=np.nan)
                        return [round(float(v), 3) if not np.isnan(v) else None for v in arr]
                return []
            temp_out = _extract(('TEMP','temperature','TEMP_ADJUSTED','temp'), (slice(None), 0))
            sal_out  = _extract(('PSAL','salinity','PSAL_ADJUSTED','sal','SALT'), (slice(None), 0))
            _CCE1_CACHE = {'time': time_strs, 'temp': temp_out, 'sal': sal_out}
    except Exception as e:
        print(f'CCE1 read failed: {e}')
        _CCE1_CACHE = {'time': [], 'temp': [], 'sal': [], 'error': str(e)}
    return _CCE1_CACHE


def get_teacher_cce1_overlay():
    cce1  = get_cce1_data()
    track = get_track()
    nori  = [{'date': t['date'], 'temp': t['tm'], 'sal': t.get('sm'), 'cycle': t['cycle']}
             for t in track if 'tm' in t and t.get('date')]
    return {'cce1': cce1, 'nori': nori}

# ══════════════════════════════════════════════════════════════════════════════
# LIVE STATE  (shared between student ↔ teacher in real-time)
# ══════════════════════════════════════════════════════════════════════════════
_live = {
    'zone': 'sunlight', 'depth': 50,
    'temperature': 12.2, 'salinity': 33.359,
    'mood': 'happy', 'anomaly_t': 0.0, 'anomaly_s': 0.0,
    'p_value': 1.0, 'significant': False,
    'health': 100.0, 'battery': 100.0,
    'discoveries': [],
    'ts': datetime.now().isoformat(),
}

# NGSS standard map (keyed by zone_mood)
_NGSS = {
    'sunlight_warm': {'code':'MS-ESS3-5','desc':'Factors causing rise in global temperatures',
                      'alert':'Coral Bleaching Risk'},
    'sunlight_cold': {'code':'MS-LS2-4', 'desc':'Disruptions to ecosystem functioning',
                      'alert':'Cold Upwelling Detected'},
    'twilight_warm': {'code':'MS-ESS2-6','desc':'Ocean circulation and climate connections',
                      'alert':'Oxygen Minimum Expanding'},
    'twilight_cold': {'code':'MS-LS2-1', 'desc':'Food web dynamics and matter cycling',
                      'alert':'Thermocline Sharpening'},
    'midnight_warm': {'code':'ESS2.D',   'desc':'Weather and climate — long-term ocean cycles',
                      'alert':'Century-Scale Climate Signal'},
    'midnight_cold': {'code':'ESS2.C',   'desc':'Ocean circulation and its role in climate',
                      'alert':'Deep Water Formation — Normal'},
}

# ── Backend helpers ───────────────────────────────────────────────────────────
def _p_for_temp(temp, zone_key):
    z  = ZONES[zone_key]
    se = z['temp_std'] / np.sqrt(30)
    zs = abs(temp - z['baseline']) / se
    return float(2 * (1 - _stats.norm.cdf(zs)))

def _compute_loo(n_per_zone=30):
    df = get_df()
    if df is None or not len(df):
        return []
    rows = []
    for zk in ('sunlight','twilight','midnight'):
        zdf   = df[df['zone'] == zk]
        tc    = 'temperature (degree_celsius)'
        g_sum = zdf[tc].sum()
        g_n   = len(zdf)
        for cyc, grp in list(zdf.groupby('meta_cycle_number'))[:n_per_zone]:
            temps = grp[tc].dropna()
            if len(temps) < 2:
                continue
            loo_b = (g_sum - temps.sum()) / (g_n - len(temps))
            anom  = float(temps.mean() - loo_b)
            _, p  = _stats.ttest_1samp(temps, loo_b)
            rows.append({
                'zone': zk, 'cycle': int(cyc),
                'loo_baseline': round(float(loo_b), 3),
                'mean_temp':    round(float(temps.mean()), 3),
                'anomaly':      round(anom, 3),
                'p_value':      round(float(p), 4),
                'significant':  bool(p < 0.05),
            })
    return rows

# Pre-compute LOO at startup (cached)
_loo_cache = _compute_loo()

# ── New API routes ────────────────────────────────────────────────────────────
@app.route('/api/live', methods=['POST'])
def api_live():
    """Student page calls this on every slider change."""
    d    = request.get_json(force=True) or {}
    zone = d.get('zone', _live['zone'])
    temp = float(d.get('temperature', _live['temperature']))
    sal  = float(d.get('salinity',    _live['salinity']))
    dep  = int(d.get('depth',         _live['depth']))

    z         = ZONES.get(zone, ZONES['sunlight'])
    anom_t    = round(temp - z['baseline'], 3)
    anom_s    = round(sal  - z['sal_baseline'], 4)
    bad_t     = abs(anom_t) > z['tolerance']
    bad_s     = abs(anom_s) > z['sal_tolerance']
    stressed  = bad_t or bad_s
    mood      = ('warm' if anom_t >= 0 else 'cold') if stressed else 'happy'
    p_val     = round(_p_for_temp(temp, zone), 4)
    sig       = p_val < 0.05

    # Health update
    if stressed:
        _live['health'] = max(0.0, _live['health'] - 10.0)
    else:
        _live['health'] = min(100.0, _live['health'] + 2.0)

    # Battery drains on zone change
    if zone != _live['zone']:
        _live['battery'] = max(0.0, _live['battery'] - 15.0)

    # Discovery logging
    if sig and mood != 'happy':
        key   = f'{zone}_{mood}'
        ngss  = _NGSS.get(key, {})
        entry = {
            'time': datetime.now().strftime('%H:%M:%S'),
            'zone': zone, 'temp': round(temp, 2), 'sal': round(sal, 3),
            'anomaly_t': round(anom_t, 3), 'p_value': p_val, 'mood': mood,
            'ngss_code':  ngss.get('code', ''),
            'ngss_desc':  ngss.get('desc', ''),
            'alert':      ngss.get('alert', ''),
        }
        last = _live['discoveries'][-1] if _live['discoveries'] else None
        if not last or last['zone'] != zone or abs(last['temp'] - temp) > 0.3:
            _live['discoveries'].append(entry)

    _live.update({
        'zone': zone, 'depth': dep,
        'temperature': round(temp, 2), 'salinity': round(sal, 3),
        'mood': mood, 'anomaly_t': anom_t, 'anomaly_s': anom_s,
        'p_value': p_val, 'significant': sig,
        'ts': datetime.now().isoformat(),
    })
    return jsonify({'ok': True, 'mood': mood, 'p_value': p_val, 'significant': sig,
                    'health': _live['health'], 'battery': _live['battery']})

@app.route('/api/state')
def api_state():
    """Teacher page polls this every 1.5 s."""
    return jsonify(_live)

@app.route('/api/loo')
def api_loo():
    return jsonify(_loo_cache)

@app.route('/api/reset', methods=['POST'])
def api_reset():
    _live['health']      = 100.0
    _live['battery']     = 100.0
    _live['discoveries'] = []
    return jsonify({'ok': True})

@app.route('/api/teacher/ts')
def api_teacher_ts():
    return jsonify(get_teacher_ts_data())

@app.route('/api/teacher/profiles')
def api_teacher_profiles():
    return jsonify(get_teacher_profiles_data())

@app.route('/api/teacher/distributions')
def api_teacher_distributions():
    return jsonify(get_teacher_distributions_data())

@app.route('/api/teacher/cce1')
def api_teacher_cce1():
    return jsonify(get_teacher_cce1_overlay())

# ── Teacher route ─────────────────────────────────────────────────────────────
@app.route('/teacher')
def teacher():
    ts_data  = get_ts_data()
    z_config = {zk: {k: v for k, v in zv.items()
                     if k not in ('story','desc','actions','residents','emoji')}
                for zk, zv in ZONES.items()}
    return (PAGE_TEACHER
            .replace('__TS_DATA__',  safe_json(ts_data))
            .replace('__ZONES__',    safe_json(z_config))
            .replace('__LOO__',      safe_json(_loo_cache)))

@app.route('/')
def index():
    df    = get_df()
    stats = {'total': len(df), 'cycles': int(df['meta_cycle_number'].nunique()) if len(df) else 0}
    track = get_track()
    return (PAGE
            .replace('__ZONES__',    safe_json(ZONES))
            .replace('__MOODS__',    safe_json(MOODS))
            .replace('__FACTS__',    safe_json(FACTS))
            .replace('__ZONE_EDU__', safe_json(ZONE_EDU))
            .replace('__STATS__',    safe_json(stats))
            .replace('__TRACK__',    safe_json(track)))


# ═════════════════════════════════════════════════════════════════════════════
PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ArgoBuddy 🌊</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;min-height:100%;overflow-x:hidden;font-family:'Nunito',sans-serif}
body{background:linear-gradient(170deg,#020c1e 0%,#041830 40%,#071f3d 70%,#030d1e 100%);background-attachment:fixed;color:#fff;min-height:100vh}

/* Screens */
.screen{display:none;min-height:100vh;padding-bottom:85px;position:relative;z-index:1}
.screen.active{display:block;animation:fadeUp .42s cubic-bezier(.34,1.56,.64,1)}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.88;transform:scale(1.018)}}
@keyframes swim{from{transform:translateX(0)}to{transform:translateX(115vw)}}
@keyframes sparkle{0%{opacity:0;transform:scale(0) rotate(0deg)}50%{opacity:1;transform:scale(1.3) rotate(180deg)}100%{opacity:0;transform:scale(0) rotate(360deg)}}
@keyframes rise{0%{transform:translateY(0);opacity:.7}100%{transform:translateY(-110vh);opacity:0}}
@keyframes glow-pulse{0%,100%{box-shadow:0 0 8px var(--glow,#00d4ff)}50%{box-shadow:0 0 22px var(--glow,#00d4ff),0 0 40px var(--glow,#00d4ff)88}}

/* Ambient background layers */
.bubbles,.fish-layer{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:hidden}
.bubble{position:absolute;bottom:-60px;border-radius:50%;background:rgba(0,212,255,.06);animation:rise linear infinite}
.fish-el{position:fixed;pointer-events:none;z-index:0;opacity:.13}
/* Shimmer rays */
.rays{position:fixed;top:-10%;left:-20%;width:140%;height:130%;background:conic-gradient(from 200deg at 30% 20%,transparent 68%,rgba(0,212,255,.025) 70%,rgba(0,212,255,.025) 72%,transparent 74%,transparent 88%,rgba(100,220,255,.02) 90%,rgba(100,220,255,.02) 92%,transparent 94%);animation:rotate-rays 35s linear infinite;transform-origin:center;pointer-events:none;z-index:0}
@keyframes rotate-rays{from{transform:rotate(0)}to{transform:rotate(360deg)}}

/* Buttons */
.btn{display:inline-block;padding:.65rem 1.8rem;border:none;border-radius:30px;font-family:'Nunito',sans-serif;font-weight:800;font-size:.95rem;cursor:pointer;transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s;text-align:center}
.btn:hover{transform:scale(1.08) translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.5)}
.btn:active{transform:scale(.97)}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important}
.btn-primary{background:linear-gradient(135deg,#ff9f1c,#ff6b35);color:#fff;box-shadow:0 4px 18px rgba(255,159,28,.35)}
.btn-ocean{background:linear-gradient(135deg,#00b4d8,#0077b6);color:#fff;box-shadow:0 4px 18px rgba(0,180,216,.35)}
.btn-ghost{background:rgba(255,255,255,.1);color:rgba(255,255,255,.85);border:1.5px solid rgba(255,255,255,.2)}
.btn-success{background:linear-gradient(135deg,#00f5c3,#00b894);color:#030d1e;box-shadow:0 4px 18px rgba(0,245,195,.3)}
.btn-sm{padding:.38rem 1.15rem;font-size:.82rem}
.btn-lg{padding:1rem 2.8rem;font-size:1.12rem}
.btn-full{width:100%;display:block}

/* Cards */
.card{background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.13);border-radius:20px;padding:1.4rem}
.card-glow{background:rgba(255,255,255,.07);border:1.5px solid var(--gc,rgba(0,212,255,.35));border-radius:20px;padding:1.4rem;box-shadow:0 0 18px var(--gc,rgba(0,212,255,.12)),inset 0 1px 0 rgba(255,255,255,.1)}
.glass{background:rgba(255,255,255,.08);backdrop-filter:blur(16px);border:1.5px solid rgba(255,255,255,.14);border-radius:20px}

/* Stat bars */
.stat-bar{margin:.6rem 0}
.sbar-head{display:flex;justify-content:space-between;font-size:.83rem;font-weight:800;margin-bottom:.28rem;color:rgba(255,255,255,.85)}
.sbar-track{background:rgba(255,255,255,.1);border-radius:10px;height:14px;overflow:hidden;box-shadow:inset 0 2px 4px rgba(0,0,0,.3)}
.sbar-fill{height:100%;border-radius:10px;transition:width 1s cubic-bezier(.34,1.56,.64,1)}

/* Wave divider */
.wave-divider{width:100%;overflow:hidden;line-height:0;margin:0}
.wave-divider svg{display:block;width:100%}

/* ══ BOTTOM NAV ══════════════════════════════════════════════════════ */
#bottom-nav{
  position:fixed;bottom:0;left:0;width:100%;
  background:rgba(2,8,22,.88);backdrop-filter:blur(20px);
  border-top:1.5px solid rgba(0,212,255,.18);
  display:none;z-index:200;
  padding:.3rem 0 max(.3rem, env(safe-area-inset-bottom));
}
#bottom-nav.show{display:flex}
.nav-item{flex:1;display:flex;flex-direction:column;align-items:center;padding:.4rem .2rem;cursor:pointer;color:rgba(255,255,255,.42);transition:color .2s,transform .18s cubic-bezier(.34,1.56,.64,1)}
.nav-item:hover,.nav-item.active{color:#00d4ff}
.nav-item.active{transform:translateY(-3px)}
.nav-icon{font-size:1.45rem;line-height:1}
.nav-lbl{font-size:.62rem;font-weight:800;margin-top:.12rem;text-transform:uppercase;letter-spacing:.04em}
.nav-pip{width:5px;height:5px;border-radius:50%;background:#00d4ff;margin:.1rem auto 0;opacity:0;transition:opacity .2s}
.nav-item.active .nav-pip{opacity:1}

/* ══ HOME ════════════════════════════════════════════════════════════ */
#screen-home{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem 1.5rem;padding-bottom:2rem}
.home-title{font-size:clamp(3rem,10vw,6rem);font-weight:900;margin:.8rem 0 .4rem;background:linear-gradient(135deg,#ffd60a,#ff9f1c,#00d4ff,#00f5c3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.1}
.home-sub{font-size:1.05rem;color:rgba(255,255,255,.72);max-width:500px;line-height:1.7;margin:.5rem auto 2rem}
.home-bot{animation:bob 3s ease-in-out infinite;display:inline-block;margin-bottom:.6rem;filter:drop-shadow(0 0 25px rgba(0,212,255,.5))}
.home-stats{display:flex;gap:1.5rem;justify-content:center;flex-wrap:wrap;margin-top:2.5rem}
.hs-item{background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.12);border-radius:16px;padding:.8rem 1.2rem;text-align:center;min-width:90px}
.hs-n{font-size:1.5rem;font-weight:900}
.hs-l{font-size:.72rem;color:rgba(255,255,255,.5);margin-top:.1rem;font-weight:700}

/* ══ CREATOR ═════════════════════════════════════════════════════════ */
#screen-creator{padding:1.5rem 1rem 2rem}
.creator-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.8rem;max-width:860px;margin:0 auto}
@media(max-width:640px){.creator-grid{grid-template-columns:1fr}}
.creator-preview{position:sticky;top:1.5rem;text-align:center;padding:1.8rem}
.creator-preview svg{filter:drop-shadow(0 0 26px rgba(0,212,255,.6))}
.swatches{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.5rem}
.swatch{width:38px;height:38px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:transform .2s cubic-bezier(.34,1.56,.64,1),border-color .15s;flex-shrink:0}
.swatch.active{border-color:#fff;transform:scale(1.25);box-shadow:0 0 14px rgba(255,255,255,.4)}
.opt-row{display:flex;gap:.55rem;flex-wrap:wrap;margin-top:.5rem}
.opt{padding:.38rem .9rem;border-radius:20px;background:rgba(255,255,255,.09);border:2px solid rgba(255,255,255,.15);color:#fff;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:700;font-size:.82rem;transition:all .18s cubic-bezier(.34,1.56,.64,1)}
.opt:hover{transform:translateY(-2px)}
.opt.active{background:rgba(0,180,216,.3);border-color:#00b4d8;box-shadow:0 0 12px rgba(0,180,216,.3)}
.name-in{width:100%;padding:.65rem 1.1rem;border-radius:14px;background:rgba(255,255,255,.09);border:2px solid rgba(255,255,255,.18);color:#fff;font-family:'Nunito',sans-serif;font-size:.97rem;font-weight:700;margin-top:.4rem;transition:border-color .2s}
.name-in:focus{outline:none;border-color:#00d4ff;box-shadow:0 0 12px rgba(0,212,255,.25)}
.name-in::placeholder{color:rgba(255,255,255,.3)}
.sec-lbl{font-size:.72rem;font-weight:800;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.25rem}

/* ══ OCEAN MAP ═══════════════════════════════════════════════════════ */
#screen-map{padding:1.5rem 1rem}
.map-wrap{max-width:680px;margin:0 auto}
.map-head{text-align:center;margin-bottom:2rem}
.map-head h2{font-size:1.65rem;font-weight:900;margin:.4rem 0;background:linear-gradient(135deg,#00d4ff,#00f5c3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.zone-layer{padding:1.3rem 1.6rem;cursor:default;transition:all .25s cubic-bezier(.34,1.56,.64,1);border-left:5px solid var(--zc,#ff9f1c);border-radius:0 16px 16px 0;margin:.4rem 0;background:rgba(255,255,255,.04)}
.zone-layer.open{cursor:pointer}
.zone-layer.open:hover{background:rgba(255,255,255,.08);transform:translateX(6px);box-shadow:0 4px 20px rgba(0,0,0,.3)}
.zone-row{display:flex;align-items:center;gap:1rem}
.z-icon{font-size:2.5rem;flex-shrink:0;filter:drop-shadow(0 0 8px rgba(255,255,255,.2))}
.z-info h3{font-size:1.05rem;font-weight:800;margin-bottom:.16rem}
.z-info p{font-size:.8rem;color:rgba(255,255,255,.55)}
.zbadge{margin-left:auto;padding:.26rem .8rem;border-radius:20px;font-size:.73rem;font-weight:800;white-space:nowrap;flex-shrink:0}
.zbadge-locked{background:rgba(255,255,255,.07);color:rgba(255,255,255,.3)}
.zbadge-open{background:rgba(255,159,28,.18);color:#ff9f1c;border:1px solid rgba(255,159,28,.5)}
.zbadge-done{background:rgba(0,245,195,.15);color:#00f5c3;border:1px solid rgba(0,245,195,.4)}

/* ══ ZONE EXPLORER ═══════════════════════════════════════════════════ */
#screen-zone{min-height:100vh}
.zone-hdr{text-align:center;padding:1.5rem 1rem 0;position:relative;overflow:hidden}
.zone-hdr-bg{position:absolute;inset:0;opacity:.12;z-index:0}
.zone-hdr-content{position:relative;z-index:1}
.zone-hdr h1{font-size:clamp(1.3rem,4vw,1.75rem);font-weight:900;margin:.25rem 0;text-shadow:0 0 20px rgba(0,0,0,.5)}
.zh-story{font-size:.82rem;color:rgba(255,255,255,.6);margin-bottom:.25rem}
.zh-depth{font-size:.8rem;color:rgba(255,255,255,.5)}
.pills{display:flex;justify-content:center;gap:.5rem;padding:.7rem 1rem;flex-wrap:wrap}
.pill{padding:.25rem .8rem;border-radius:20px;font-size:.73rem;font-weight:700}
.pill-active{color:#030d1e;font-weight:900}
.pill-done{background:rgba(0,245,195,.15);color:#00f5c3;border:1px solid rgba(0,245,195,.35)}
.pill-lock{background:rgba(255,255,255,.06);color:rgba(255,255,255,.27)}

.zone-grid{display:grid;grid-template-columns:1.15fr 1fr 1.1fr;gap:1rem;padding:1rem;max-width:1300px;margin:0 auto}
@media(max-width:920px){.zone-grid{grid-template-columns:1fr}}

/* ── Educational cards (zone right column) ───────────────────────────────── */
.edu-card{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);border-radius:18px;padding:1.1rem;margin-bottom:.7rem}
.edu-card-title{font-size:.73rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.48);margin-bottom:.55rem}
.edu-fact-list{list-style:none;padding:0;margin:0}
.edu-fact-list li{font-size:.8rem;color:rgba(255,255,255,.82);line-height:1.55;padding:.28rem 0;border-bottom:1px solid rgba(255,255,255,.05)}
.edu-fact-list li:last-child{border-bottom:none}
.edu-fact-list li::before{content:"✦ ";color:var(--za,#ff9f1c);font-size:.65rem}
.edu-num-grid{display:grid;grid-template-columns:1fr 1fr;gap:.35rem}
.edu-num-item{background:rgba(255,255,255,.05);border-radius:10px;padding:.5rem .7rem;text-align:center}
.edu-num-label{font-size:.65rem;color:rgba(255,255,255,.38);font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.1rem}
.edu-num-value{font-size:.88rem;font-weight:900;color:var(--za,#ff9f1c)}
.edu-animal{display:flex;align-items:flex-start;gap:.7rem}
.edu-animal-icon{font-size:2.4rem;flex-shrink:0;line-height:1}
.edu-animal-text{font-size:.78rem;color:rgba(255,255,255,.78);line-height:1.5}
.edu-tipping{background:linear-gradient(135deg,rgba(192,57,43,.12),rgba(231,76,60,.08));border:1.5px solid rgba(231,76,60,.35);border-radius:14px;padding:.85rem;font-size:.79rem;color:rgba(255,255,255,.8);line-height:1.55}
.edu-tipping strong{color:#ff6b6b}

/* ══ TEACHER SCREEN ═══════════════════════════════════════════════════ */
#screen-teacher{padding:0;background:rgba(2,8,22,.6)}
.teacher-hdr{padding:1.2rem 1.4rem .8rem;text-align:center;background:rgba(0,0,0,.3);border-bottom:1.5px solid rgba(0,212,255,.18)}
.teacher-hdr h2{font-size:1.5rem;font-weight:900;background:linear-gradient(135deg,#ffd60a,#00f5c3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.teacher-hdr p{font-size:.83rem;color:rgba(255,255,255,.5);margin-top:.25rem}
.teacher-tabs{display:flex;gap:0;padding:0 1rem;background:rgba(0,0,0,.2);border-bottom:1.5px solid rgba(255,255,255,.08);overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}
.teacher-tabs::-webkit-scrollbar{display:none}
.ttab{padding:.6rem 1.1rem;border:none;background:transparent;color:rgba(255,255,255,.42);font-family:'Nunito',sans-serif;font-weight:800;font-size:.78rem;cursor:pointer;white-space:nowrap;border-bottom:3px solid transparent;transition:all .2s;flex-shrink:0}
.ttab:hover{color:rgba(255,255,255,.7)}
.ttab.active{color:#ffd60a;border-bottom-color:#ffd60a}
.teacher-tab-content{display:none}
.teacher-tab-content.active{display:grid;grid-template-columns:1fr 420px;gap:0;min-height:calc(100vh - 240px)}
@media(max-width:860px){.teacher-tab-content.active{grid-template-columns:1fr}}
.teacher-chart-panel{padding:1.2rem 1.4rem;border-right:1.5px solid rgba(255,255,255,.08)}
.teacher-chart-title{font-size:.95rem;font-weight:900;margin-bottom:.7rem;color:#ffd60a}
.teacher-chart-wrap{background:rgba(255,255,255,.04);border-radius:14px;padding:.8rem;margin-bottom:.7rem;border:1px solid rgba(255,255,255,.07)}
.teacher-chart-wrap .plotly-graph-div{background:transparent!important}
.chart-interp{background:rgba(0,212,255,.07);border:1.5px solid rgba(0,212,255,.2);border-radius:12px;padding:.85rem;font-size:.8rem;color:rgba(255,255,255,.8);line-height:1.6;margin-top:.5rem}
.chart-interp strong{color:#00d4ff}
.teacher-lesson-panel{padding:1.2rem 1.4rem;overflow-y:auto;max-height:calc(100vh - 240px);background:rgba(255,255,255,.025)}
.lesson-card{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);border-radius:16px;padding:1.1rem;margin-bottom:.8rem}
.lesson-tag{display:inline-block;padding:.2rem .65rem;border-radius:8px;font-size:.68rem;font-weight:800;background:rgba(255,214,10,.18);color:#ffd60a;margin-bottom:.5rem}
.lesson-card h4{font-size:.9rem;font-weight:900;margin-bottom:.55rem;color:rgba(255,255,255,.92)}
.lesson-section{font-size:.78rem;font-weight:800;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;margin:.65rem 0 .3rem}
.lesson-list{list-style:none;padding:0;margin:0}
.lesson-list li{font-size:.8rem;color:rgba(255,255,255,.75);line-height:1.55;padding:.2rem 0}
.lesson-list li::before{content:"→ ";color:#00f5c3;font-weight:900}
.ngss-badge{display:inline-block;padding:.22rem .7rem;border-radius:8px;font-size:.7rem;font-weight:800;background:rgba(0,212,255,.15);color:#00d4ff;border:1px solid rgba(0,212,255,.3);margin-top:.4rem}
.teacher-loading{text-align:center;padding:3rem 1rem;color:rgba(255,255,255,.4);font-size:.9rem}
.teacher-loading .spin{font-size:2rem;animation:bob 1s ease-in-out infinite;display:block;margin-bottom:.5rem}

.slabel{display:flex;justify-content:space-between;font-size:.8rem;font-weight:800;color:rgba(255,255,255,.8);margin-bottom:.22rem}
input[type=range]{width:100%;-webkit-appearance:none;appearance:none;height:9px;border-radius:5px;background:rgba(255,255,255,.15);outline:none;margin:.35rem 0;cursor:pointer}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:var(--za,#ff9f1c);cursor:pointer;box-shadow:0 0 10px rgba(0,0,0,.5),0 0 8px var(--za,#ff9f1c);transition:transform .15s cubic-bezier(.34,1.56,.64,1)}
input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.25)}
.heatbar{background:rgba(255,255,255,.08);border-radius:8px;height:20px;overflow:hidden;margin:.3rem 0;box-shadow:inset 0 2px 4px rgba(0,0,0,.3)}
.heatfill{height:100%;border-radius:8px;background:linear-gradient(90deg,#4cc9f0,#ffd60a,#ff6b6b);transition:width .28s}
.heatlbls{display:flex;justify-content:space-between;font-size:.68rem;color:rgba(255,255,255,.38)}
.mmetrics{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;margin-top:.7rem}
.mbox{background:rgba(255,255,255,.07);border-radius:12px;padding:.65rem;text-align:center;border:1px solid rgba(255,255,255,.1)}
.mbox .val{font-size:1.1rem;font-weight:900}
.mbox .lbl{font-size:.68rem;color:rgba(255,255,255,.45);margin-top:.06rem;font-weight:700}
.sal-msg{font-size:.8rem;font-weight:800;margin:.35rem 0}

.tipping-card{background:linear-gradient(135deg,#5c0000,#c0392b);border:2px solid #ff6b6b;border-radius:20px;padding:1.4rem;text-align:center;animation:pulse 1.1s infinite;box-shadow:0 0 30px rgba(255,107,107,.3)}
.mood-card{border-radius:20px;padding:1.4rem;text-align:center;border:2px solid;margin-bottom:.7rem}
.mood-emoji{font-size:4rem;display:block;margin-bottom:.35rem;filter:drop-shadow(0 0 10px rgba(255,255,255,.2))}
.mood-head{font-size:1rem;font-weight:900;margin-bottom:.38rem}
.mood-cons{font-size:.82rem;color:rgba(255,255,255,.8);line-height:1.5}
.risk-list{list-style:none;margin:.5rem 0}
.risk-list li{background:rgba(255,255,255,.06);border-left:3px solid var(--za,#ff9f1c);border-radius:8px;padding:.38rem .8rem;margin:.22rem 0;font-size:.8rem;color:rgba(255,255,255,.8);font-weight:600}
.clim-box{background:linear-gradient(135deg,rgba(0,180,216,.1),rgba(156,39,176,.1));border:1.5px solid rgba(0,180,216,.28);border-radius:14px;padding:.9rem;margin-top:.7rem;font-size:.8rem;color:rgba(255,255,255,.8);line-height:1.5}
.clim-box strong{color:#00d4ff}

.chart-wrap{background:rgba(255,255,255,.04);border-radius:14px;padding:.7rem;margin-bottom:.7rem;position:relative;height:170px;border:1px solid rgba(255,255,255,.07)}
.ctitle{font-size:.76rem;font-weight:800;color:rgba(255,255,255,.5);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em}
.fact-box{background:linear-gradient(135deg,rgba(255,214,10,.09),rgba(0,245,195,.09));border:1.5px solid rgba(255,214,10,.28);border-radius:14px;padding:.9rem;font-size:.8rem;color:rgba(255,255,255,.85);line-height:1.5}
.fact-box strong{color:#ffd60a}
.pct-box{background:rgba(255,255,255,.07);border-radius:12px;padding:.75rem;text-align:center;margin-top:.55rem;border:1.5px solid rgba(255,255,255,.1)}
.pct-box .big{font-size:1.75rem;font-weight:900;color:var(--za,#ff9f1c)}
.pct-box .small{font-size:.74rem;color:rgba(255,255,255,.5);font-weight:700}


.zone-nav{display:flex;justify-content:space-between;align-items:center;padding:.9rem 1.3rem;border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.25);gap:.7rem;flex-wrap:wrap}

/* ══ WORLD MAP ═══════════════════════════════════════════════════════ */
#screen-world{padding:0}
.world-header{padding:1.4rem 1.4rem .8rem;text-align:center;background:rgba(0,0,0,.25);border-bottom:1.5px solid rgba(0,212,255,.18)}
.world-header h2{font-size:1.5rem;font-weight:900;background:linear-gradient(135deg,#00d4ff,#00f5c3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
#world-map{width:100%;height:calc(100vh - 220px);min-height:380px}
.world-info{padding:1rem 1.4rem;background:rgba(0,0,0,.25)}
.world-stats{display:flex;gap:1rem;flex-wrap:wrap;justify-content:center}
.wstat{background:rgba(0,212,255,.1);border:1.5px solid rgba(0,212,255,.22);border-radius:12px;padding:.6rem 1rem;text-align:center;font-size:.82rem}
.wstat strong{color:#00d4ff;font-size:1.1rem;display:block;font-weight:900}

/* ══ PET SCREEN ══════════════════════════════════════════════════════ */
#screen-pet{padding:1.5rem 1rem}
.pet-layout{display:grid;grid-template-columns:1fr 1.5fr;gap:1.8rem;max-width:900px;margin:0 auto;align-items:start}
@media(max-width:680px){.pet-layout{grid-template-columns:1fr}}
.pet-char{text-align:center;position:sticky;top:1.5rem;padding:1.8rem}
.pet-char svg{filter:drop-shadow(0 0 30px rgba(0,212,255,.55));animation:bob 3.2s ease-in-out infinite}
.pet-name{font-size:1.4rem;font-weight:900;margin:.4rem 0 .15rem}
.pet-mood{font-size:.88rem;color:rgba(255,255,255,.6)}
.ch-card{background:linear-gradient(135deg,rgba(0,180,216,.1),rgba(156,39,176,.08));border:1.5px solid rgba(0,180,216,.3);border-radius:16px;padding:1.1rem;margin-bottom:.8rem;box-shadow:0 4px 20px rgba(0,0,0,.2)}
.ch-zone-lbl{font-size:.72rem;font-weight:800;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.26rem}
.ch-text{font-size:.92rem;color:rgba(255,255,255,.92);font-weight:700;line-height:1.45}
.action-grid{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin:.9rem 0}
.act-btn{padding:.85rem .75rem;border-radius:16px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.15);color:#fff;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:700;font-size:.85rem;text-align:center;transition:all .2s cubic-bezier(.34,1.56,.64,1);line-height:1.35}
.act-btn:hover{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,.3)}
.act-btn.correct-reveal{background:rgba(0,245,195,.15);border-color:#00f5c3;box-shadow:0 0 16px rgba(0,245,195,.25)}
.act-btn.wrong-reveal{background:rgba(255,107,107,.12);border-color:#ff6b6b;opacity:.6}
.act-btn:disabled{cursor:default;transform:none}
.result-panel{border-radius:18px;padding:1.4rem;margin-top:.9rem;display:none}
.result-panel.show{display:block;animation:fadeUp .38s ease}
.res-wrong{background:rgba(192,57,43,.18);border:2px solid #c0392b;box-shadow:0 0 20px rgba(192,57,43,.2)}
.res-right{background:rgba(0,245,195,.12);border:2px solid #00f5c3;box-shadow:0 0 20px rgba(0,245,195,.2)}
.decay-bar{background:linear-gradient(135deg,rgba(255,159,28,.12),rgba(255,107,107,.08));border:1.5px solid rgba(255,159,28,.35);border-radius:14px;padding:.85rem 1.1rem;font-size:.83rem;color:rgba(255,255,255,.8);margin-bottom:.9rem;display:none}
.decay-bar.show{display:block}
.sec-head{font-size:1rem;font-weight:900;margin:1rem 0 .42rem;color:rgba(255,255,255,.9)}
.sparkle{position:fixed;pointer-events:none;z-index:999;font-size:1.5rem;animation:sparkle .8s ease forwards}

/* Util */
.mt1{margin-top:.5rem}.mt2{margin-top:1rem}.mt3{margin-top:1.5rem}
.tc{text-align:center}.muted{color:rgba(255,255,255,.48)}
h2{font-size:1.45rem;font-weight:900}h3{font-size:1.1rem;font-weight:800}
.page-title{text-align:center;padding:1.5rem 1rem .8rem}
.page-title h2{background:linear-gradient(135deg,#ffd60a,#ff9f1c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.page-title p{color:rgba(255,255,255,.55);font-size:.9rem;margin-top:.3rem}
</style>
</head>
<body>

<!-- Ambient layers -->
<div class="rays"></div>
<div class="bubbles" id="bubbles"></div>
<div class="fish-layer" id="fish-layer"></div>

<!-- ══ HOME ═══════════════════════════════════════════════════════════ -->
<div id="screen-home" class="screen active">
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem 1.5rem">
    <div class="home-bot" style="font-size:5.5rem">🤖</div>
    <div class="home-title">ArgoBuddy</div>
    <p class="home-sub">Adopt your own <strong>Argo ocean robot</strong> 🌊 Dive through 3 layers of the real Pacific Ocean, meet amazing creatures, and discover what climate change <em>actually feels like</em> from inside the sea!</p>
    <button class="btn btn-primary btn-lg" onclick="goTo('creator')" style="font-size:1.2rem;padding:1.1rem 3rem">🎨 Create Your ArgoBuddy!</button>
    <div class="home-stats" id="home-stats">
      <div class="hs-item"><div class="hs-n" id="stat-r" style="color:#ffd60a">—</div><div class="hs-l">real readings</div></div>
      <div class="hs-item"><div class="hs-n" id="stat-c" style="color:#00d4ff">—</div><div class="hs-l">dive cycles</div></div>
      <div class="hs-item"><div class="hs-n" style="color:#00f5c3">3</div><div class="hs-l">ocean zones</div></div>
      <div class="hs-item"><div class="hs-n" style="color:#c77dff">2000m</div><div class="hs-l">max depth</div></div>
    </div>
  </div>
</div>

<!-- ══ CREATOR ════════════════════════════════════════════════════════ -->
<div id="screen-creator" class="screen">
  <div class="page-title"><h2>🎨 Create Your ArgoBuddy</h2><p>Customize your ocean robot!</p></div>
  <div class="creator-grid">
    <div class="creator-preview glass">
      <div id="char-prev" style="display:flex;justify-content:center"></div>
      <div id="prev-name" style="font-size:1.25rem;font-weight:900;margin-top:.9rem;color:#ffd60a">Argo</div>
      <p class="muted" style="font-size:.78rem;margin-top:.2rem">Your ocean explorer! 🌊</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:1rem">
      <div class="card">
        <div class="sec-lbl">✏️ Name Your Buddy</div>
        <input class="name-in" id="buddy-name" placeholder="Enter a name…" maxlength="20" value="Argo" oninput="updatePreview()">
      </div>
      <div class="card">
        <div class="sec-lbl">🎨 Body Color</div>
        <div class="swatches">
          <div class="swatch active" data-c="#00b4d8" style="background:#00b4d8" onclick="pickColor(this)" title="Ocean Blue"></div>
          <div class="swatch" data-c="#ff6b6b" style="background:#ff6b6b" onclick="pickColor(this)" title="Coral Red"></div>
          <div class="swatch" data-c="#00f5c3" style="background:#00f5c3" onclick="pickColor(this)" title="Seafoam"></div>
          <div class="swatch" data-c="#c77dff" style="background:#c77dff" onclick="pickColor(this)" title="Deep Purple"></div>
          <div class="swatch" data-c="#ffd60a" style="background:#ffd60a" onclick="pickColor(this)" title="Sun Yellow"></div>
        </div>
      </div>
      <div class="card">
        <div class="sec-lbl">👀 Eye Style</div>
        <div class="opt-row">
          <button class="opt active" data-e="normal"  onclick="pickEye(this)">😐 Normal</button>
          <button class="opt"        data-e="wide"    onclick="pickEye(this)">😳 Wide</button>
          <button class="opt"        data-e="sleepy"  onclick="pickEye(this)">😴 Sleepy</button>
        </div>
      </div>
      <div class="card">
        <div class="sec-lbl">✨ Accessory</div>
        <div class="opt-row">
          <button class="opt active" data-a="none"    onclick="pickAcc(this)">🚫 None</button>
          <button class="opt"        data-a="star"    onclick="pickAcc(this)">⭐ Star</button>
          <button class="opt"        data-a="crown"   onclick="pickAcc(this)">👑 Crown</button>
          <button class="opt"        data-a="antenna" onclick="pickAcc(this)">📡 Antenna</button>
        </div>
      </div>
      <button class="btn btn-primary btn-full btn-lg" onclick="finishCreator()" style="margin-top:.5rem">🌊 Let's Dive In!</button>
    </div>
  </div>
</div>

<!-- ══ OCEAN MAP ══════════════════════════════════════════════════════ -->
<div id="screen-map" class="screen">
  <div class="map-wrap">
    <div class="map-head">
      <div id="map-buddy" style="display:inline-block;animation:bob 3s ease-in-out infinite"></div>
      <h2>Your Ocean Adventure! 🌊</h2>
      <p class="muted" style="font-size:.88rem">Three secret zones to explore — each one deeper and colder!</p>
    </div>
    <div class="glass" style="overflow:hidden;padding:.5rem" id="zone-layers"></div>
    <div class="tc mt3">
      <button class="btn btn-primary btn-lg" onclick="startAdventure()">🚀 Start Exploring!</button>
      <p class="muted" style="font-size:.78rem;margin-top:.6rem">Zones unlock as you explore them in order</p>
    </div>
  </div>
</div>

<!-- ══ ZONE EXPLORER ══════════════════════════════════════════════════ -->
<div id="screen-zone" class="screen">
  <div class="zone-hdr" id="zone-hdr">
    <div class="zone-hdr-bg" id="zhdr-bg"></div>
    <div class="zone-hdr-content">
      <div class="zh-story" id="zh-story"></div>
      <h1 id="zh-title"></h1>
      <div class="zh-depth" id="zh-depth"></div>
    </div>
  </div>
  <div class="wave-divider" id="zone-wave"></div>
  <div class="pills" id="pills"></div>
  <div class="zone-grid">
    <!-- Left -->
    <div>
      <div class="card-glow" id="zinfo" style="--gc:rgba(255,159,28,.3)">
        <h3 id="zi-name"></h3>
        <p style="font-size:.83rem;color:rgba(255,255,255,.72);margin:.45rem 0 .7rem;line-height:1.5" id="zi-desc"></p>
        <div style="font-size:.8rem;color:rgba(255,255,255,.55)"><strong>🐠 Who lives here:</strong><br><span id="zi-res"></span></div>
      </div>
      <div class="card mt2">
        <div class="slabel"><span>🌡️ Water Temperature</span><span id="tv" style="font-size:.9rem;font-weight:900"></span></div>
        <input type="range" id="tslider" oninput="onTC()">
        <div class="heatbar"><div class="heatfill" id="hf"></div></div>
        <div class="heatlbls"><span>❄️ Cold</span><span>🔥 Hot</span></div>
        <div class="mmetrics">
          <div class="mbox"><div class="val" id="mt"></div><div class="lbl">Your temp</div></div>
          <div class="mbox"><div class="val" id="mb"></div><div class="lbl">Baseline</div></div>
        </div>
        <div class="mt2">
          <div class="slabel"><span>🧂 Salinity (PSU)</span><span id="sv" style="font-size:.9rem;font-weight:900"></span></div>
          <input type="range" id="sslider" step="0.01" oninput="onSC()">
          <div class="sal-msg" id="smsg"></div>
        </div>
      </div>
    </div>
    <!-- Center -->
    <div>
      <div id="buddy-zone" style="font-size:3rem;text-align:center;animation:bob 3s ease-in-out infinite;margin-bottom:.4rem"></div>
      <div id="mood-disp"></div>
      <h3 style="margin:.85rem 0 .35rem">🌊 What's at risk?</h3>
      <ul class="risk-list" id="risk-list"></ul>
      <div class="clim-box" id="clim-box"></div>
    </div>
    <!-- Right — Educational Facts Hub -->
    <div>
      <div class="edu-card">
        <div class="edu-card-title">🔬 Zone Science</div>
        <ul class="edu-fact-list" id="zone-science-list"></ul>
      </div>
      <div class="edu-card">
        <div class="edu-card-title">📊 Key Numbers</div>
        <div class="edu-num-grid" id="zone-key-numbers"></div>
      </div>
      <div id="zone-tipping-card" class="edu-tipping">
        <strong>⚠️ Climate Tipping Point:</strong><br>
        <span id="zone-tipping-text"></span>
      </div>
      <div class="edu-card mt2">
        <div class="edu-card-title">🐠 Animal Spotlight</div>
        <div class="edu-animal" id="zone-animal">
          <span class="edu-animal-icon" id="zone-animal-icon"></span>
          <div>
            <div style="font-size:.85rem;font-weight:900;color:rgba(255,255,255,.9);margin-bottom:.22rem" id="zone-animal-name"></div>
            <div class="edu-animal-text" id="zone-animal-text"></div>
          </div>
        </div>
      </div>
      <div class="fact-box mt2"><strong>🧠 Did you know?</strong><br><span id="zone-fact"></span></div>
    </div>
  </div>
  <div class="zone-nav">
    <button class="btn btn-ghost btn-sm" id="nav-up" onclick="navUp()">⬆️ Surface Up</button>
    <button class="btn btn-ghost btn-sm" onclick="goTo('map')">🗺️ Zone Map</button>
    <button class="btn btn-primary" id="nav-down" onclick="navDown()">Next Zone ⬇️</button>
  </div>
</div>

<!-- ══ WORLD MAP ══════════════════════════════════════════════════════ -->
<div id="screen-world" class="screen">
  <div class="world-header">
    <h2>🌍 Where Is Argo Right Now?</h2>
    <p class="muted" style="font-size:.85rem;margin-top:.3rem">Real GPS track of your buddy's float in the Pacific Ocean</p>
  </div>
  <div id="world-map"></div>
  <div class="world-info">
    <div class="world-stats" id="world-stats"></div>
  </div>
</div>

<!-- ══ PET SCREEN ═════════════════════════════════════════════════════ -->
<div id="screen-pet" class="screen">
  <div class="page-title"><h2>🤖 Your ArgoBuddy Needs You!</h2><p>Check in on your buddy based on what you discovered!</p></div>
  <div class="decay-bar" id="decay-bar">⏰ <strong>It's been a while!</strong> Your buddy's health dropped while you were away — take care of them now!</div>
  <div class="pet-layout">
    <!-- Left -->
    <div class="pet-char glass">
      <div id="pet-svg" style="display:flex;justify-content:center"></div>
      <div class="pet-name" id="pet-name">Argo</div>
      <div class="pet-mood" id="pet-mood">Feeling okay…</div>
      <div class="mt2">
        <div class="stat-bar"><div class="sbar-head"><span>❤️ Health</span><span id="sh">100%</span></div><div class="sbar-track"><div class="sbar-fill" id="sfh" style="background:linear-gradient(90deg,#ff6b6b,#ff9f1c);width:100%"></div></div></div>
        <div class="stat-bar"><div class="sbar-head"><span>😊 Happiness</span><span id="sn">50%</span></div><div class="sbar-track"><div class="sbar-fill" id="sfn" style="background:linear-gradient(90deg,#ffd60a,#ff9f1c);width:50%"></div></div></div>
        <div class="stat-bar"><div class="sbar-head"><span>🌍 Climate Awareness</span><span id="sa">0%</span></div><div class="sbar-track"><div class="sbar-fill" id="sfa" style="background:linear-gradient(90deg,#00f5c3,#00b4d8);width:0%"></div></div></div>
      </div>
      <div class="mt2">
        <button class="btn btn-ocean btn-full btn-sm" onclick="goTo('map')">🗺️ Re-explore Ocean</button>
        <button class="btn btn-ghost btn-full btn-sm mt1" onclick="goTo('world')">🌍 World Map</button>
      </div>
    </div>
    <!-- Right -->
    <div>
      <div id="all-good" style="display:none" class="card tc mt2" style="border:1.5px solid #00f5c3">
        <div style="font-size:2.8rem">🎉</div>
        <h3 style="margin:.4rem 0;color:#00f5c3">All Zones Healthy!</h3>
        <p class="muted">Your ArgoBuddy is thriving! Come back tomorrow to keep them happy!</p>
      </div>
      <div id="challenge-sec">
        <div class="sec-head">⚠️ Today's Ocean Challenge</div>
        <div class="ch-card" id="ch-card">
          <div class="ch-zone-lbl" id="ch-zl"></div>
          <div class="ch-text" id="ch-txt"></div>
        </div>
        <div class="sec-head">🎮 What should <span id="buddy-name-q">Argo</span> do?</div>
        <div class="action-grid" id="act-grid"></div>
        <div class="result-panel" id="res-panel">
          <div id="res-content"></div>
          <button class="btn btn-sm mt2" id="res-next" onclick="nextChallenge()">Next Challenge →</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══ TEACHER SCREEN ═══════════════════════════════════════════════ -->
<div id="screen-teacher" class="screen">
  <div class="teacher-hdr">
    <h2>🎓 Teacher Lesson Plans</h2>
    <p>Real Argo Float Data · Ocean Science · NGSS Aligned</p>
  </div>
  <div class="teacher-tabs">
    <button class="ttab active" onclick="switchTeacherTab('ts')">🌊 T-S Diagram</button>
    <button class="ttab" onclick="switchTeacherTab('profiles')">📉 Ocean Profiles</button>
    <button class="ttab" onclick="switchTeacherTab('distributions')">📊 Zone Stats</button>
    <button class="ttab" onclick="switchTeacherTab('cce1temp')">🌡️ CCE1 Temperature</button>
    <button class="ttab" onclick="switchTeacherTab('cce1sal')">🧂 CCE1 Salinity</button>
  </div>

  <!-- T-S Diagram Tab -->
  <div id="ttab-ts" class="teacher-tab-content active">
    <div class="teacher-chart-panel">
      <div class="teacher-chart-title">Temperature–Salinity Diagram — Water Mass Identity</div>
      <div class="teacher-chart-wrap" style="height:420px"><div id="tc-ts" style="width:100%;height:100%"></div></div>
      <div class="chart-interp">
        <strong>How to read this chart:</strong> Each dot is a real measurement from Argo float 4901639 in the Pacific Ocean.
        The three distinct <em>clusters</em> are the three ocean zones — each has a unique temperature-salinity fingerprint called a <em>water mass</em>.
        Notice how the Sunlight Zone has lower salinity and higher variability (surface mixing), while the Midnight Zone is cold, dense, and tightly packed.
        The red star shows where the student's current slider settings would place Nori in the ocean — when it leaves its cluster, a statistically significant anomaly is detected.
      </div>
    </div>
    <div class="teacher-lesson-panel">
      <div class="lesson-card">
        <span class="lesson-tag">NGSS MS-ESS2-6</span>
        <h4>Water Mass Identification</h4>
        <p style="font-size:.8rem;color:rgba(255,255,255,.65);line-height:1.55;margin-bottom:.5rem">Students use temperature-salinity data to identify distinct ocean water masses and understand how scientists classify ocean layers.</p>
        <div class="lesson-section">Learning Objectives</div>
        <ul class="lesson-list">
          <li>Explain why different ocean depths have different T-S "fingerprints"</li>
          <li>Identify when a measurement is anomalous by comparing to the cluster</li>
          <li>Connect T-S fingerprints to climate change impacts</li>
        </ul>
        <div class="lesson-section">Discussion Questions</div>
        <ul class="lesson-list">
          <li>Why do the three zones form separate clusters instead of one big blob?</li>
          <li>What happens to the sunlight zone cluster if the ocean warms by 2°C?</li>
          <li>Why is the midnight zone cluster so much tighter than the others?</li>
          <li>If you saw a measurement between zones, what might that tell you?</li>
        </ul>
        <div class="lesson-section">Activity Steps</div>
        <ul class="lesson-list">
          <li>Open the student app and show the three zone clusters</li>
          <li>Have students predict what zone a reading of 8°C / 34.1 PSU belongs to</li>
          <li>Drag the student star outside its cluster — watch the anomaly trigger</li>
          <li>Compare to historical coral bleaching events (match T anomalies)</li>
        </ul>
        <span class="ngss-badge">MS-ESS2-6 — Ocean Circulation &amp; Climate</span>
      </div>
    </div>
  </div>

  <!-- Profiles Tab -->
  <div id="ttab-profiles" class="teacher-tab-content">
    <div class="teacher-chart-panel">
      <div class="teacher-chart-title">Vertical Ocean Profiles — Temperature &amp; Salinity with Depth</div>
      <div class="teacher-chart-wrap" style="height:460px"><div id="tc-profiles" style="width:100%;height:100%"></div></div>
      <div class="chart-interp">
        <strong>How to read this chart:</strong> The x-axis is temperature (or salinity) and the y-axis is depth — so deeper ocean is at the <em>bottom</em> of the chart.
        The solid line is the historical mean; the shaded band is ±1 standard deviation of real Argo readings.
        The sharp drop in temperature around 200–1000m is the <em>thermocline</em> — the boundary between warm surface water and cold deep water.
        In a warming climate, this thermocline shifts deeper and the shaded band widens, meaning more variation and less stability.
      </div>
    </div>
    <div class="teacher-lesson-panel">
      <div class="lesson-card">
        <span class="lesson-tag">NGSS MS-ESS2-5</span>
        <h4>The Thermocline: Ocean's Climate Barrier</h4>
        <p style="font-size:.8rem;color:rgba(255,255,255,.65);line-height:1.55;margin-bottom:.5rem">Students analyze temperature and salinity profiles to understand how ocean stratification works and why the thermocline is critical to marine ecosystems.</p>
        <div class="lesson-section">Learning Objectives</div>
        <ul class="lesson-list">
          <li>Identify the thermocline from a temperature-depth profile</li>
          <li>Explain how density stratification keeps ocean layers separate</li>
          <li>Predict how climate warming would shift the thermocline</li>
        </ul>
        <div class="lesson-section">Discussion Questions</div>
        <ul class="lesson-list">
          <li>At what depth does temperature drop most sharply? What is that called?</li>
          <li>Why does salinity increase slightly with depth?</li>
          <li>Why do deep-sea creatures struggle if the thermocline shifts?</li>
          <li>How does the ±1σ band change between shallow and deep water? Why?</li>
        </ul>
        <div class="lesson-section">Activity Steps</div>
        <ul class="lesson-list">
          <li>Identify the thermocline on the temperature profile together as a class</li>
          <li>Mark the three zone boundaries (200m and 1000m) on the chart</li>
          <li>Discuss: what would happen to marine life if the thermocline moved 100m deeper?</li>
          <li>Have students sketch what a "worst case" warming profile might look like</li>
        </ul>
        <span class="ngss-badge">MS-ESS2-5 — Earth's Systems &amp; Cycles</span>
      </div>
    </div>
  </div>

  <!-- Distributions Tab -->
  <div id="ttab-distributions" class="teacher-tab-content">
    <div class="teacher-chart-panel">
      <div class="teacher-chart-title">Temperature Distributions by Zone — Statistical Safety Analysis</div>
      <div class="teacher-chart-wrap" style="height:420px"><div id="tc-distributions" style="width:100%;height:100%"></div></div>
      <div class="chart-interp">
        <strong>How to read this chart:</strong> Each histogram shows the <em>frequency</em> of temperature readings in that zone across all 168 dive cycles.
        The green shaded band is the "comfort zone" (mean ± tolerance) — conditions that keep marine life healthy.
        The black vertical line is the historical mean baseline.
        Notice how the midnight zone has a very <em>narrow</em> distribution (things almost never change there) while the sunlight zone is wider (much more variable).
        A climate anomaly shows up as a shift: the histogram moves outside the green zone.
      </div>
    </div>
    <div class="teacher-lesson-panel">
      <div class="lesson-card">
        <span class="lesson-tag">NGSS MS-ESS3-5</span>
        <h4>Statistical Safety: Is It Normal?</h4>
        <p style="font-size:.8rem;color:rgba(255,255,255,.65);line-height:1.55;margin-bottom:.5rem">Students use frequency distributions to understand what "normal" looks like in each ocean zone, and practice identifying when data falls outside the expected range.</p>
        <div class="lesson-section">Learning Objectives</div>
        <ul class="lesson-list">
          <li>Read and interpret a frequency histogram</li>
          <li>Understand what mean and standard deviation look like visually</li>
          <li>Identify anomalous readings using the comfort zone band</li>
          <li>Explain why the midnight zone has a narrower distribution</li>
        </ul>
        <div class="lesson-section">Discussion Questions</div>
        <ul class="lesson-list">
          <li>Which zone has the widest distribution? What causes that variability?</li>
          <li>If climate change adds 2°C to the sunlight zone, what % of readings would be outside the green zone?</li>
          <li>Why is a narrow midnight zone distribution a sign of stability AND fragility?</li>
          <li>How many readings in the midnight zone are currently in the "warm" category?</li>
        </ul>
        <div class="lesson-section">Activity Steps</div>
        <ul class="lesson-list">
          <li>Estimate visually what % of readings fall in the green zone for each zone</li>
          <li>Calculate: if the average shifted right by one tolerance width, what would change?</li>
          <li>Compare sunlight vs midnight variance — calculate approximate standard deviations from the histograms</li>
          <li>Connect to real data: have students look up what year had the most coral bleaching events</li>
        </ul>
        <span class="ngss-badge">MS-ESS3-5 — Human Impacts on Earth's Systems</span>
      </div>
    </div>
  </div>

  <!-- CCE1 Temperature Tab -->
  <div id="ttab-cce1temp" class="teacher-tab-content">
    <div class="teacher-chart-panel">
      <div class="teacher-chart-title">CCE1 Mooring — Surface Temperature Time Series with Nori's Dives</div>
      <div class="teacher-chart-wrap" style="height:420px"><div id="tc-cce1temp" style="width:100%;height:100%"></div></div>
      <div class="chart-interp">
        <strong>How to read this chart:</strong> The blue line is the continuous temperature record from the <strong>CCE1 mooring</strong> — a fixed sensor station anchored to the seafloor off Southern California, recording data 24/7.
        The orange dots are Nori's surface measurements during each dive cycle. By overlaying them, students see how a <em>profiling float</em> (Nori) samples the same water as a fixed mooring (CCE1).
        Seasonal cycles, El Niño warmings, and upwelling cold events are all visible. Where Nori's dots match the mooring line confirms the float is measuring accurately.
      </div>
    </div>
    <div class="teacher-lesson-panel">
      <div class="lesson-card">
        <span class="lesson-tag">NGSS MS-ESS2-6</span>
        <h4>Mooring vs. Float: Two Ways to Measure the Ocean</h4>
        <p style="font-size:.8rem;color:rgba(255,255,255,.65);line-height:1.55;margin-bottom:.5rem">Students compare data from two different ocean observing instruments to understand why scientists use multiple data sources and how they validate measurements.</p>
        <div class="lesson-section">Learning Objectives</div>
        <ul class="lesson-list">
          <li>Distinguish between a fixed mooring and a drifting profiling float</li>
          <li>Identify seasonal temperature patterns from a time-series chart</li>
          <li>Explain why having two independent data sources increases scientific confidence</li>
        </ul>
        <div class="lesson-section">Discussion Questions</div>
        <ul class="lesson-list">
          <li>What season do the warm peaks correspond to? What about the cold troughs?</li>
          <li>Do Nori's orange dots closely match the CCE1 blue line? What does that tell us?</li>
          <li>Why can't scientists just use moorings everywhere instead of Argo floats?</li>
          <li>What events could cause Nori's dots to be much hotter or cooler than the mooring line?</li>
        </ul>
        <div class="lesson-section">Activity Steps</div>
        <ul class="lesson-list">
          <li>Identify at least 2 warm peaks and 2 cold troughs on the mooring data</li>
          <li>Mark the months that correspond to those peaks using the x-axis dates</li>
          <li>Find a Nori dive (orange dot) that is far from the mooring line — discuss why</li>
          <li>Discuss: what would a 2°C shift upward mean for a species that spawns only when T &lt; 14°C?</li>
        </ul>
        <span class="ngss-badge">MS-ESS2-6 — Ocean Circulation &amp; Climate</span>
      </div>
      <div class="lesson-card" style="margin-top:.5rem">
        <span class="lesson-tag">NGSS MS-PS1-5</span>
        <h4>Ocean as Heat Reservoir</h4>
        <div class="lesson-section">Key Concept</div>
        <p style="font-size:.8rem;color:rgba(255,255,255,.7);line-height:1.55">Water has a very high <em>specific heat</em> — it takes a lot of energy to change its temperature. That's why ocean temperature changes happen slowly compared to air temperature changes. This is why the ocean is our planet's main climate buffer, absorbing 90% of excess atmospheric heat.</p>
        <span class="ngss-badge">MS-PS1-5 — Properties of Matter</span>
      </div>
    </div>
  </div>

  <!-- CCE1 Salinity Tab -->
  <div id="ttab-cce1sal" class="teacher-tab-content">
    <div class="teacher-chart-panel">
      <div class="teacher-chart-title">CCE1 Mooring — Surface Salinity Time Series with Nori's Dives</div>
      <div class="teacher-chart-wrap" style="height:420px"><div id="tc-cce1sal" style="width:100%;height:100%"></div></div>
      <div class="chart-interp">
        <strong>How to read this chart:</strong> The teal line is continuous salinity from the CCE1 mooring; the green dots are Nori's surface salinity measurements per dive cycle.
        Salinity changes are driven by <em>evaporation</em> (increases salinity) and <em>precipitation or freshwater runoff</em> (decreases salinity).
        In a warming climate, evaporation rates increase, making salty areas saltier and fresh areas fresher — a process called <em>halocline amplification</em>.
        Sudden drops in salinity near the California coast often indicate cold, fresh upwelling water reaching the surface.
      </div>
    </div>
    <div class="teacher-lesson-panel">
      <div class="lesson-card">
        <span class="lesson-tag">NGSS MS-ESS2-5</span>
        <h4>Salinity &amp; the Water Cycle</h4>
        <p style="font-size:.8rem;color:rgba(255,255,255,.65);line-height:1.55;margin-bottom:.5rem">Students explore how salinity varies over time and what drives those changes, connecting ocean salinity to the global water cycle and climate change.</p>
        <div class="lesson-section">Learning Objectives</div>
        <ul class="lesson-list">
          <li>Identify what causes salinity to increase or decrease at the surface</li>
          <li>Explain how salinity and temperature together determine water density</li>
          <li>Connect salinity changes to climate-driven shifts in the water cycle</li>
        </ul>
        <div class="lesson-section">Discussion Questions</div>
        <ul class="lesson-list">
          <li>When does salinity tend to be highest — summer or winter? Why?</li>
          <li>What could cause the sharp drops in salinity you see in the data?</li>
          <li>If the Pacific warms and evaporation increases, how would you expect this chart to shift?</li>
          <li>Why does salinity matter to marine life? Give two specific examples.</li>
        </ul>
        <div class="lesson-section">Activity Steps</div>
        <ul class="lesson-list">
          <li>Compare peaks in the temperature chart vs. peaks in the salinity chart — are they in sync?</li>
          <li>Find the largest salinity drop — what might have caused it (El Niño? Upwelling? Storm runoff?)?</li>
          <li>Calculate the range (max − min) of salinity over the recording period</li>
          <li>Discuss: why would a 0.5 PSU change in salinity stress a coral polyp?</li>
        </ul>
        <span class="ngss-badge">MS-ESS2-5 — Earth's Systems &amp; Cycles</span>
      </div>
    </div>
  </div>
</div>

<!-- ══ BOTTOM NAV ═════════════════════════════════════════════════════ -->
<nav id="bottom-nav">
  <div class="nav-item" id="nav-ocean" onclick="goTo('map')">
    <div class="nav-icon">🌊</div>
    <div class="nav-lbl">Ocean</div>
    <div class="nav-pip"></div>
  </div>
  <div class="nav-item" id="nav-world" onclick="goTo('world')">
    <div class="nav-icon">🌍</div>
    <div class="nav-lbl">World</div>
    <div class="nav-pip"></div>
  </div>
  <div class="nav-item" id="nav-buddy" onclick="goTo('pet')">
    <div class="nav-icon">🤖</div>
    <div class="nav-lbl">Buddy</div>
    <div class="nav-pip"></div>
  </div>
  <div class="nav-item" id="nav-edit" onclick="goTo('creator')">
    <div class="nav-icon">✏️</div>
    <div class="nav-lbl">Edit</div>
    <div class="nav-pip"></div>
  </div>
  <div class="nav-item" id="nav-teacher" onclick="goTo('teacher')">
    <div class="nav-icon">🎓</div>
    <div class="nav-lbl">Teach</div>
    <div class="nav-pip"></div>
  </div>
</nav>

<script>
// ── Injected data ─────────────────────────────────────────────────────────────
const ZONES    = __ZONES__;
const MOODS    = __MOODS__;
const FACTS    = __FACTS__;
const ZONE_EDU = __ZONE_EDU__;
const STATS    = __STATS__;
const TRACK    = __TRACK__;
const ZORDER   = ['sunlight','twilight','midnight'];

// ── Game state ────────────────────────────────────────────────────────────────
let G = {
  buddy:{ name:'Argo', color:'#00b4d8', eyes:'normal', acc:'none' },
  zones:{
    sunlight:{ explored:false, temp:12.2, sal:33.359 },
    twilight:{ explored:false, temp:6.8,  sal:34.122 },
    midnight:{ explored:false, temp:3.0,  sal:34.547 },
  },
  cur:'sunlight',
  pet:{ health:100, happiness:50, awareness:0, lastVisit:Date.now() },
  czk:null,
  cIdx:0,       // challenge rotation index
  created:false // has buddy been created?
};

function saveG(){
  G.pet.lastVisit=Date.now();
  try{ localStorage.setItem('ab_g2',JSON.stringify({buddy:G.buddy,zones:G.zones,pet:G.pet,created:G.created})); }catch(e){}
}
function loadG(){
  try{
    const s=localStorage.getItem('ab_g2');
    if(!s) return;
    const d=JSON.parse(s);
    if(d.buddy)   G.buddy=d.buddy;
    if(d.zones)   G.zones=d.zones;
    if(d.created) G.created=d.created;
    if(d.pet){
      G.pet=d.pet;
      const hrs=(Date.now()-(G.pet.lastVisit||Date.now()))/3600000;
      if(hrs>1){
        const dec=Math.min(40,Math.floor(hrs*2));
        G.pet.health   =Math.max(10,G.pet.health-dec);
        G.pet.happiness=Math.max(10,G.pet.happiness-Math.floor(dec/2));
        if(dec>4) document.getElementById('decay-bar').classList.add('show');
      }
    }
  }catch(e){}
}

// ── Bubbles ───────────────────────────────────────────────────────────────────
(function(){
  const el=document.getElementById('bubbles');
  for(let i=0;i<22;i++){
    const b=document.createElement('div'); b.className='bubble';
    const s=6+Math.random()*26;
    b.style.cssText=`width:${s}px;height:${s}px;left:${Math.random()*100}%;animation-duration:${9+Math.random()*24}s;animation-delay:${-Math.random()*24}s`;
    el.appendChild(b);
  }
})();

// ── Fish ──────────────────────────────────────────────────────────────────────
(function spawnFish(){
  const fishes=['🐠','🐟','🐡','🦑','🐙','🪸','🐬','🐋'];
  function addFish(){
    const f=document.createElement('div'); f.className='fish-el';
    const sz=1.1+Math.random()*1.3;
    const dir=Math.random()>.5;
    const top=8+Math.random()*78;
    const dur=14+Math.random()*20;
    f.textContent=fishes[Math.floor(Math.random()*fishes.length)];
    f.style.cssText=`font-size:${sz}rem;top:${top}vh;${dir?'left:-6vw':'right:-6vw;transform:scaleX(-1)'};animation:swim ${dur}s linear forwards`;
    document.getElementById('fish-layer').appendChild(f);
    setTimeout(()=>f.remove(),(dur+1)*1000);
  }
  addFish(); setInterval(addFish,5000);
})();

// ── SVG character ─────────────────────────────────────────────────────────────
function buildChar(color,eyes,acc,size){
  size=size||130;
  const c=color||'#00b4d8', dk='rgba(0,0,0,.3)';
  let eyeSVG='',accSVG='';
  if(eyes==='wide'){
    eyeSVG=`<circle cx="44" cy="72" r="9.5" fill="white"/><circle cx="44" cy="72" r="4.5" fill="#0a1628"/>
             <circle cx="76" cy="72" r="9.5" fill="white"/><circle cx="76" cy="72" r="4.5" fill="#0a1628"/>
             <circle cx="46" cy="70" r="2.2" fill="white"/><circle cx="78" cy="70" r="2.2" fill="white"/>`;
  }else if(eyes==='sleepy'){
    eyeSVG=`<path d="M35 73 Q44 66 53 73" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
             <path d="M67 73 Q76 66 85 73" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }else{
    eyeSVG=`<circle cx="44" cy="72" r="7.5" fill="white"/><circle cx="44" cy="74" r="3.5" fill="#0a1628"/>
             <circle cx="76" cy="72" r="7.5" fill="white"/><circle cx="76" cy="74" r="3.5" fill="#0a1628"/>
             <circle cx="45.5" cy="71" r="1.8" fill="white"/><circle cx="77.5" cy="71" r="1.8" fill="white"/>`;
  }
  if(acc==='star'){
    accSVG=`<polygon points="60,1 64,12 75,12 66,19 70,30 60,23 50,30 54,19 45,12 56,12" fill="#ffd60a" stroke="#ff9f1c" stroke-width="1.2"/>`;
  }else if(acc==='crown'){
    accSVG=`<path d="M43 17 L43 5 L53 13 L60 1 L67 13 L77 5 L77 17 Z" fill="#ffd60a" stroke="#ff9f1c" stroke-width="1.5"/>
             <rect x="42" y="16" width="36" height="6" rx="3" fill="#ffd60a"/>
             <circle cx="60" cy="4" r="2.8" fill="#ff6b6b"/>
             <circle cx="43" cy="9" r="2.2" fill="#ff6b6b"/>
             <circle cx="77" cy="9" r="2.2" fill="#ff6b6b"/>`;
  }else if(acc==='antenna'){
    accSVG=`<line x1="73" y1="24" x2="90" y2="6" stroke="rgba(255,255,255,.65)" stroke-width="2.5" stroke-linecap="round"/>
             <circle cx="91" cy="5" r="5" fill="#ff6b6b" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>
             <circle cx="91" cy="5" r="2.5" fill="white" opacity=".7"/>`;
  }
  return `<svg viewBox="0 0 120 162" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="bg${size}" cx="40%" cy="35%"><stop offset="0%" stop-color="rgba(255,255,255,.25)"/><stop offset="100%" stop-color="rgba(0,0,0,.1)"/></radialGradient></defs>
    <ellipse cx="10" cy="96" rx="14" ry="8" fill="${c}" opacity=".7" transform="rotate(-22,10,96)"/>
    <ellipse cx="110" cy="96" rx="14" ry="8" fill="${c}" opacity=".7" transform="rotate(22,110,96)"/>
    <rect x="19" y="27" width="82" height="108" rx="37" fill="${c}"/>
    <rect x="19" y="27" width="82" height="108" rx="37" fill="url(#bg${size})"/>
    <rect x="19" y="27" width="82" height="108" rx="37" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
    <circle cx="60" cy="72" r="29" fill="${dk}" stroke="rgba(255,255,255,.3)" stroke-width="2.5"/>
    ${eyeSVG}
    <path d="M46 93 Q60 106 74 93" stroke="rgba(255,255,255,.82)" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    <rect x="41" y="128" width="38" height="11" rx="5.5" fill="${dk}" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>
    <line x1="60" y1="27" x2="60" y2="10" stroke="rgba(255,255,255,.6)" stroke-width="2.8" stroke-linecap="round"/>
    <circle cx="60" cy="8" r="5.5" fill="${c}" stroke="rgba(255,255,255,.5)" stroke-width="1.8"/>
    ${accSVG}
  </svg>`;
}

// ── Creator ───────────────────────────────────────────────────────────────────
function updatePreview(){
  const name=document.getElementById('buddy-name').value||'Argo';
  document.getElementById('prev-name').textContent=name;
  document.getElementById('char-prev').innerHTML=buildChar(G.buddy.color,G.buddy.eyes,G.buddy.acc,165);
}
function pickColor(el){
  document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('active'));
  el.classList.add('active'); G.buddy.color=el.dataset.c; updatePreview();
}
function pickEye(el){
  document.querySelectorAll('[data-e]').forEach(b=>b.classList.remove('active'));
  el.classList.add('active'); G.buddy.eyes=el.dataset.e; updatePreview();
}
function pickAcc(el){
  document.querySelectorAll('[data-a]').forEach(b=>b.classList.remove('active'));
  el.classList.add('active'); G.buddy.acc=el.dataset.a; updatePreview();
}
function finishCreator(){
  G.buddy.name=(document.getElementById('buddy-name').value||'Argo').trim();
  G.created=true; saveG();
  showNav(true);
  goTo('map');
}

// ── Navigation ────────────────────────────────────────────────────────────────
const NAV_MAP={map:'nav-ocean',world:'nav-world',pet:'nav-buddy',creator:'nav-edit',teacher:'nav-teacher'};
function showNav(show){
  const nav=document.getElementById('bottom-nav');
  if(show) nav.classList.add('show'); else nav.classList.remove('show');
}
function goTo(scr){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+scr).classList.add('active');
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(NAV_MAP[scr]) document.getElementById(NAV_MAP[scr]).classList.add('active');
  if(scr==='map')     renderMap();
  if(scr==='zone')    renderZone();
  if(scr==='pet')     renderPet();
  if(scr==='world')   initWorldMap();
  if(scr==='teacher') initTeacherScreen();
  if(scr==='creator'){ updatePreview(); syncCreatorUI(); }
  window.scrollTo(0,0);
}
function syncCreatorUI(){
  document.querySelectorAll('.swatch').forEach(s=>{ s.classList.toggle('active',s.dataset.c===G.buddy.color); });
  document.querySelectorAll('[data-e]').forEach(b=>{ b.classList.toggle('active',b.dataset.e===G.buddy.eyes); });
  document.querySelectorAll('[data-a]').forEach(b=>{ b.classList.toggle('active',b.dataset.a===G.buddy.acc); });
  if(document.getElementById('buddy-name')) document.getElementById('buddy-name').value=G.buddy.name;
}

// ── Ocean Map ─────────────────────────────────────────────────────────────────
function renderMap(){
  document.getElementById('map-buddy').innerHTML=buildChar(G.buddy.color,G.buddy.eyes,G.buddy.acc,80);
  const zc={sunlight:'#ff9f1c',twilight:'#c77dff',midnight:'#4cc9f0'};
  document.getElementById('zone-layers').innerHTML=ZORDER.map((zk,i)=>{
    const z=ZONES[zk], explored=G.zones[zk].explored;
    const prevOk=i===0||G.zones[ZORDER[i-1]].explored;
    const fog=!prevOk?'opacity:.4;filter:blur(1.5px)':'';
    const oc=prevOk?`onclick="enterZone('${zk}')"`:'';
    let bcls,btxt;
    if(explored){bcls='zbadge-done';btxt='✅ Done!';}
    else if(prevOk){bcls='zbadge-open';btxt='🔓 Explore!';}
    else{bcls='zbadge-locked';btxt='🔒 Locked';}
    return `<div class="zone-layer ${prevOk?'open':''}" style="--zc:${zc[zk]};${fog}" ${oc}>
      <div class="zone-row">
        <div class="z-icon" style="filter:drop-shadow(0 0 10px ${zc[zk]}88)">${z.emoji}</div>
        <div class="z-info"><h3 style="color:${zc[zk]}">${z.name}</h3><p>${z.depth} · ${z.story}</p></div>
        <div class="zbadge ${bcls}">${btxt}</div>
      </div>
    </div>`;
  }).join('<div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent);margin:.3rem 0"></div>');
}
function enterZone(zk){ G.cur=zk; goTo('zone'); }
function startAdventure(){ G.cur='sunlight'; goTo('zone'); }

// ── Zone Explorer ─────────────────────────────────────────────────────────────
const ZONE_GRADS={sunlight:'linear-gradient(135deg,#ff6b35,#ff9f1c)',twilight:'linear-gradient(135deg,#6a0dad,#c77dff)',midnight:'linear-gradient(135deg,#0077b6,#4cc9f0)'};
function renderZone(){
  const zk=G.cur,z=ZONES[zk],gz=G.zones[zk],ac=z.accent;
  document.documentElement.style.setProperty('--za',ac);
  document.getElementById('zhdr-bg').style.background=ZONE_GRADS[zk];
  document.getElementById('zh-story').textContent=z.story;
  document.getElementById('zh-title').textContent=`🤖 ${G.buddy.name} is in the ${z.name} ${z.emoji}`;
  document.getElementById('zh-depth').textContent=`Depth: ${z.depth}  ·  Baseline: ${z.baseline}°C`;
  // Wave SVG with zone color
  document.getElementById('zone-wave').innerHTML=`<svg viewBox="0 0 1440 36" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" height="36"><path d="M0,18 C180,36 360,0 540,18 C720,36 900,0 1080,18 C1260,36 1380,12 1440,18 L1440,36 L0,36 Z" fill="${ac}22"/></svg>`;

  document.getElementById('pills').innerHTML=ZORDER.map(pk=>{
    const pz=ZONES[pk];
    if(pk===zk) return `<span class="pill pill-active" style="background:${ac};color:#030d1e">${pz.emoji} ${pz.name}</span>`;
    if(G.zones[pk].explored) return `<span class="pill pill-done">✅ ${pz.name}</span>`;
    return `<span class="pill pill-lock">🔒 ${pz.name}</span>`;
  }).join('');

  document.getElementById('zinfo').style.setProperty('--gc',`${ac}44`);
  document.getElementById('zi-name').textContent=`${z.emoji} ${z.name}`;
  document.getElementById('zi-desc').textContent=z.desc;
  document.getElementById('zi-res').textContent=z.residents;
  document.getElementById('buddy-zone').innerHTML=buildChar(G.buddy.color,G.buddy.eyes,G.buddy.acc,76);
  document.getElementById('zone-fact').textContent=FACTS[zk];
  // Populate educational right column
  const edu=ZONE_EDU[zk]||{};
  document.getElementById('zone-science-list').innerHTML=
    (edu.science_facts||[]).map(f=>`<li>${f}</li>`).join('');
  document.getElementById('zone-key-numbers').innerHTML=
    (edu.key_numbers||[]).map(([l,v])=>`<div class="edu-num-item"><div class="edu-num-label">${l}</div><div class="edu-num-value">${v}</div></div>`).join('');
  document.getElementById('zone-tipping-text').textContent=edu.tipping_text||'';
  const [aIcon,aName,aTxt]=edu.animal_spotlight||['','',''];
  document.getElementById('zone-animal-icon').textContent=aIcon;
  document.getElementById('zone-animal-name').textContent=aName;
  document.getElementById('zone-animal-text').textContent=aTxt;

  const ts=document.getElementById('tslider');
  ts.min=z.slider_min; ts.max=z.slider_max; ts.step=0.1; ts.value=gz.temp;
  const ss=document.getElementById('sslider');
  ss.min=(z.sal_baseline-0.8).toFixed(2); ss.max=(z.sal_baseline+0.8).toFixed(2); ss.value=gz.sal;

  const idx=ZORDER.indexOf(zk);
  document.getElementById('nav-up').style.visibility=idx>0?'visible':'hidden';
  const dn=document.getElementById('nav-down');
  if(idx<ZORDER.length-1){
    const nz=ZONES[ZORDER[idx+1]];
    dn.textContent=`🤿 Dive to ${nz.name} ${nz.emoji}`;
    dn.className='btn btn-primary';
  }else{
    dn.textContent=`🐟 Check ${G.buddy.name}'s Status!`;
    dn.className='btn btn-success';
  }
  refreshZone();
}
function refreshZone(){
  const zk=G.cur,z=ZONES[zk];
  const temp=parseFloat(document.getElementById('tslider').value);
  const sal =parseFloat(document.getElementById('sslider').value);
  G.zones[zk].temp=temp; G.zones[zk].sal=sal;
  document.getElementById('tv').textContent=`${temp.toFixed(1)}°C`;
  const anom=temp-z.baseline;
  const mkey=Math.abs(anom)<=z.tolerance?'happy':(anom>0?'warm':'cold');
  const mood=MOODS[zk][mkey];
  document.getElementById('mt').textContent=`${temp.toFixed(1)}°C`;
  document.getElementById('mt').style.color=mkey==='happy'?'#00f5c3':(mkey==='warm'?'#ff6b6b':'#74b9ff');
  document.getElementById('mb').textContent=`${z.baseline}°C ±${z.tolerance}°C`;
  const lo=z.slider_min,hi=z.slider_max;
  document.getElementById('hf').style.width=((temp-lo)/(hi-lo)*100).toFixed(1)+'%';
  const tip=temp>=z.tipping_point;
  if(tip){
    document.getElementById('mood-disp').innerHTML=`<div class="tipping-card">
      <div style="font-size:2.8rem">💀</div>
      <div style="font-size:1rem;font-weight:900;margin:.3rem 0">⚠️ TIPPING POINT CROSSED!</div>
      <p style="font-size:.82rem;color:rgba(255,255,255,.88)">Beyond ${z.tipping_point}°C here, recovery is nearly impossible for decades or centuries!</p>
    </div>`;
  }else{
    document.getElementById('mood-disp').innerHTML=`<div class="mood-card" style="background:${mood.color}20;border-color:${mood.color};box-shadow:0 0 20px ${mood.color}22">
      <span class="mood-emoji">${mood.emoji}</span>
      <div class="mood-head" style="color:${mood.color}">${mood.headline}</div>
      <div class="mood-cons">${mood.consequence}</div>
    </div>`;
  }
  document.getElementById('risk-list').innerHTML=(mood.risks||[]).map(r=>
    `<li style="border-left-color:${z.accent}">${r}</li>`).join('');
  document.getElementById('clim-box').innerHTML=`<strong>🌍 Climate Connection</strong><br>${mood.climate}`;
  const sd=sal-z.sal_baseline;
  let sm,sc;
  if(Math.abs(sd)<=z.sal_tolerance){sm='✅ Normal Salinity!';sc='#00f5c3';}
  else if(sd<0){sm='💧 Too Fresh — possible glacial melt! 🧊';sc='#74b9ff';}
  else{sm='🧂 Too Salty — evaporation anomaly!';sc='#fdcb6e';}
  document.getElementById('sv').textContent=sal.toFixed(2);
  document.getElementById('smsg').textContent=sm;
  document.getElementById('smsg').style.color=sc;
}
function onTC(){ refreshZone(); pushLiveState(); }
function onSC(){ refreshZone(); pushLiveState(); }

// ── Teacher bridge ────────────────────────────────────────────────────────────
let _pushTimer=null;
function pushLiveState(){
  clearTimeout(_pushTimer);
  _pushTimer=setTimeout(()=>{
    const zk=G.cur;
    const temp=parseFloat(document.getElementById('tslider').value)||G.zones[zk].temp;
    const sal =parseFloat(document.getElementById('sslider').value)||G.zones[zk].sal;
    fetch('/api/live',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({zone:zk,temperature:temp,salinity:sal,depth:G.zones[zk].depth||50})
    }).catch(()=>{});
  },180);
}

function navUp(){ const i=ZORDER.indexOf(G.cur); if(i>0){ G.cur=ZORDER[i-1]; renderZone(); } }
function navDown(){
  G.zones[G.cur].explored=true; saveG();
  const i=ZORDER.indexOf(G.cur);
  if(i<ZORDER.length-1){ G.cur=ZORDER[i+1]; goTo('zone'); }
  else { computePet(); goTo('pet'); }
}

// ── World Map ─────────────────────────────────────────────────────────────────
let leafMap=null;
function buildPopup(p,isLast){
  const bar=(pct,col)=>`<div style="background:rgba(0,0,0,.15);border-radius:3px;height:5px;margin:.15rem 0 .35rem"><div style="background:${col};width:${Math.min(100,Math.round(pct||50))}%;height:100%;border-radius:3px"></div></div>`;
  const zCol={sunlight:'#ff9f1c',twilight:'#c77dff',midnight:'#4cc9f0'};
  const title=isLast?`&#x1F916; <b>${G.buddy.name} is HERE!</b>`:`<b>Dive #${p.cycle}</b>`;
  let h=`<div style="font-size:12px;min-width:200px;line-height:1.5">`;
  h+=`<div style="margin-bottom:2px">${title}</div>`;
  h+=`<div style="color:#888;font-size:11px;margin-bottom:7px">${p.date||''}</div>`;
  if(p.tm!=null){
    h+=`<div><b>Temp:</b> ${p.tm.toFixed(1)}&deg;C`;
    if(p.tn!=null) h+=` <span style="color:#999;font-size:11px">(${p.tn.toFixed(1)}&ndash;${p.tx.toFixed(1)})</span>`;
    h+=`</div>${bar(p.tp,'#ff9f1c')}`;
    h+=`<div style="font-size:10px;color:#888;margin-bottom:5px">warmer than ${Math.round(p.tp||50)}% of all dives</div>`;
  }
  if(p.sm!=null){
    h+=`<div><b>Salinity:</b> ${p.sm.toFixed(3)} PSU`;
    if(p.sn!=null) h+=` <span style="color:#999;font-size:11px">(${p.sn.toFixed(3)}&ndash;${p.sx.toFixed(3)})</span>`;
    h+=`</div>${bar(p.sp,'#00d4ff')}`;
    h+=`<div style="font-size:10px;color:#888;margin-bottom:5px">saltier than ${Math.round(p.sp||50)}% of all dives</div>`;
  }
  if(p.md!=null){
    const zk2=p.md>=1000?'midnight':(p.md>=200?'twilight':'sunlight');
    h+=`<div><b>Max depth:</b> ${p.md}m <span style="background:${zCol[zk2]}33;color:${zCol[zk2]};padding:1px 5px;border-radius:6px;font-size:10px">${ZONES[zk2].name}</span></div>`;
  }
  if(p.nr!=null) h+=`<div style="color:#888;font-size:10px;margin-top:4px">${p.nr} sensor readings</div>`;
  h+=`</div>`;
  return h;
}
function initWorldMap(){
  const ws=document.getElementById('world-stats');
  ws.innerHTML=`
    <div class="wstat"><strong>${TRACK.length}</strong>dive locations</div>
    <div class="wstat"><strong>${TRACK[0]&&TRACK[0].date?TRACK[0].date:'—'}</strong>first dive</div>
    <div class="wstat"><strong>${TRACK[TRACK.length-1]&&TRACK[TRACK.length-1].date?TRACK[TRACK.length-1].date:'—'}</strong>latest dive</div>
    <div class="wstat"><strong>${STATS.total.toLocaleString()}</strong>total readings</div>`;
  if(leafMap){ setTimeout(()=>leafMap.invalidateSize(),120); return; }
  const el=document.getElementById('world-map');
  leafMap=L.map(el,{zoomControl:true,attributionControl:true});
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',{
    attribution:'Tiles &copy; Esri',maxZoom:13
  }).addTo(leafMap);
  if(!TRACK.length) return;
  const latlngs=TRACK.map(p=>[p.lat,p.lon]);
  leafMap.fitBounds(L.latLngBounds(latlngs),{padding:[40,40]});
  L.polyline(latlngs,{color:'#ffd60a',weight:2.5,opacity:.75,dashArray:'6,4'}).addTo(leafMap);
  TRACK.forEach((p,i)=>{
    const isLast=i===TRACK.length-1;
    const maxD=p.md||0;
    const radius=isLast?11:(maxD>=1000?8:(maxD>=200?6:4));
    const fillColor=isLast?'#ff6b6b':(maxD>=1000?'#4cc9f0':(maxD>=200?'#c77dff':'#ff9f1c'));
    const m=L.circleMarker([p.lat,p.lon],{radius,fillColor,color:'white',weight:isLast?2:1,opacity:1,fillOpacity:.88}).addTo(leafMap);
    m.bindPopup(buildPopup(p,isLast),{maxWidth:260});
    if(isLast) setTimeout(()=>m.openPopup(),600);
  });
  // Depth legend
  const legend=L.control({position:'bottomright'});
  legend.onAdd=function(){
    const div=L.DomUtil.create('div');
    div.style.cssText='background:rgba(2,8,22,.9);color:#fff;padding:8px 12px;border-radius:10px;font-size:11px;font-family:sans-serif;border:1px solid rgba(0,212,255,.3);line-height:1.7';
    div.innerHTML='<b style="font-size:12px">Dive Depth</b><br>'+
      '<span style="color:#ff9f1c">&#9679;</span> Sunlight (0&ndash;200m)<br>'+
      '<span style="color:#c77dff">&#9679;</span> Twilight (200&ndash;1000m)<br>'+
      '<span style="color:#4cc9f0">&#9679;</span> Midnight (1000&ndash;2000m)<br>'+
      '<span style="color:#ff6b6b">&#9679;</span> Latest dive';
    return div;
  };
  legend.addTo(leafMap);
}

// ── Pet Screen ────────────────────────────────────────────────────────────────
function computePet(){
  let tot=0;
  ZORDER.forEach(zk=>{
    const z=ZONES[zk];
    const anom=Math.abs(G.zones[zk].temp-z.baseline);
    tot+=Math.min(1,anom/(z.tipping_point-z.baseline));
  });
  G.pet.health=Math.round(Math.max(10,100-tot/3*72));
  if(ZORDER.every(zk=>G.zones[zk].explored)&&G.pet.awareness<30) G.pet.awareness=30;
}
function renderPet(){
  computePet();
  document.getElementById('pet-name').textContent=G.buddy.name;
  document.getElementById('buddy-name-q').textContent=G.buddy.name;
  document.getElementById('pet-svg').innerHTML=buildChar(G.buddy.color,G.buddy.eyes,G.buddy.acc,155);
  updatePetUI();
  pickChallenge();
}
function updatePetUI(){
  const h=G.pet.health,n=G.pet.happiness,a=G.pet.awareness;
  document.getElementById('sh').textContent=h+'%'; document.getElementById('sfh').style.width=h+'%';
  document.getElementById('sn').textContent=n+'%'; document.getElementById('sfn').style.width=n+'%';
  document.getElementById('sa').textContent=a+'%'; document.getElementById('sfa').style.width=a+'%';
  let mt;
  if(h>=80) mt='😊 Thriving and happy!';
  else if(h>=60) mt='😐 Doing okay…';
  else if(h>=40) mt='😟 Feeling a bit stressed…';
  else mt='🤒 Really struggling! Help me!';
  document.getElementById('pet-mood').textContent=mt;
}

// Challenge rotation: cycles through all 3 zones in order
function pickChallenge(){
  document.getElementById('res-panel').classList.remove('show');
  const allOk=ZORDER.every(zk=>{
    const z=ZONES[zk],s=Math.abs(G.zones[zk].temp-z.baseline)/(z.tipping_point-z.baseline);
    return s<0.04;
  });
  if(allOk){
    document.getElementById('all-good').style.display='block';
    document.getElementById('challenge-sec').style.display='none'; return;
  }
  document.getElementById('all-good').style.display='none';
  document.getElementById('challenge-sec').style.display='block';

  // Pick zone by rotating through ZORDER (skip perfectly healthy zones)
  let tries=0, zk;
  do{
    zk=ZORDER[G.cIdx % ZORDER.length];
    G.cIdx++;
    tries++;
    const z=ZONES[zk],s=Math.abs(G.zones[zk].temp-z.baseline)/(z.tipping_point-z.baseline);
    if(s>0.04) break;
  }while(tries<ZORDER.length);
  G.czk=zk;

  const z=ZONES[zk],temp=G.zones[zk].temp,anom=temp-z.baseline;
  let ct;
  if(temp>=z.tipping_point) ct=`🚨 CRITICAL! ${z.name} hit the tipping point at ${temp.toFixed(1)}°C! Something must be done!`;
  else if(Math.abs(anom)<=z.tolerance) ct=`${z.name} looks stable. Help ${G.buddy.name} keep things in balance!`;
  else if(anom>0) ct=`${z.name} is ${anom.toFixed(1)}°C warmer than normal. ${G.buddy.name} needs help!`;
  else ct=`${z.name} is ${Math.abs(anom).toFixed(1)}°C cooler than normal. ${G.buddy.name} is struggling!`;
  document.getElementById('ch-zl').textContent=`${z.emoji} ${z.name} · ${z.depth}`;
  document.getElementById('ch-txt').textContent=ct;

  // Shuffle actions for display, track original index in onclick
  const acts=z.actions;
  const order=[...Array(acts.length).keys()].sort(()=>Math.random()-.5);
  document.getElementById('act-grid').innerHTML=order.map(oi=>
    `<button class="act-btn" onclick="doAction(${oi})">${acts[oi].label}</button>`
  ).join('');
}

function doAction(idx){
  const z=ZONES[G.czk],a=z.actions[idx],acts=z.actions;
  document.getElementById('act-grid').querySelectorAll('.act-btn').forEach(b=>{
    b.disabled=true;
    const oi=parseInt(b.getAttribute('onclick').match(/\\d+/)[0]);
    b.classList.add(acts[oi].correct?'correct-reveal':'wrong-reveal');
  });
  const panel=document.getElementById('res-panel');
  panel.classList.remove('res-right','res-wrong','show');
  if(a.correct){
    G.pet.health   =Math.min(100,G.pet.health+8);
    G.pet.happiness=Math.min(100,G.pet.happiness+15);
    G.pet.awareness=Math.min(100,G.pet.awareness+20);
    saveG(); spawnSparkles();
    panel.classList.add('res-right','show');
    document.getElementById('res-content').innerHTML=`<div style="font-size:2rem;margin-bottom:.35rem">🎉</div>
      <strong style="color:#00f5c3;font-size:1rem">Amazing! Great choice!</strong>
      <p style="margin-top:.5rem;font-size:.88rem;color:rgba(255,255,255,.85)">
        ${G.buddy.name}'s real job is to <strong>observe and transmit data</strong> — not to interfere.
        Real Argo floats are passive ocean sensors. By recording conditions accurately, scientists can
        understand climate change and help us protect the ocean!
      </p>
      <p style="margin-top:.42rem;font-size:.8rem;color:rgba(255,255,255,.55)">❤️ +8 Health &nbsp;·&nbsp; 😊 +15 Happiness &nbsp;·&nbsp; 🌍 +20 Awareness</p>`;
    document.getElementById('res-next').textContent='Next Challenge! →';
  }else{
    G.pet.health   =Math.max(10,G.pet.health-15);
    G.pet.happiness=Math.max(10,G.pet.happiness-10);
    saveG();
    panel.classList.add('res-wrong','show');
    document.getElementById('res-content').innerHTML=`<div style="font-size:2rem;margin-bottom:.35rem">😬</div>
      <strong style="color:#ff6b6b;font-size:1rem">Oops! That made things worse!</strong>
      <p style="margin-top:.5rem;font-size:.88rem;color:rgba(255,255,255,.85)">${a.why}</p>
      <p style="margin-top:.42rem;font-size:.8rem;color:rgba(255,255,255,.55)">❤️ −15 Health &nbsp;·&nbsp; 😊 −10 Happiness</p>
      <button class="btn btn-ocean btn-sm" style="margin-top:.75rem" onclick="reExplore('${G.czk}')">
        🔍 Go Re-explore the ${z.name}!
      </button>`;
    document.getElementById('res-next').textContent='Try Again →';
  }
  updatePetUI();
}
function nextChallenge(){ pickChallenge(); }
function reExplore(zk){ G.cur=zk; goTo('zone'); }

// ── Sparkle effect ────────────────────────────────────────────────────────────
function spawnSparkles(){
  const emojis=['⭐','✨','🌟','💫','🎉'];
  for(let i=0;i<6;i++){
    setTimeout(()=>{
      const s=document.createElement('div'); s.className='sparkle';
      s.textContent=emojis[Math.floor(Math.random()*emojis.length)];
      s.style.cssText=`left:${20+Math.random()*60}vw;top:${30+Math.random()*40}vh;animation-delay:${Math.random()*.3}s`;
      document.body.appendChild(s);
      setTimeout(()=>s.remove(),900);
    },i*80);
  }
}

// ── Teacher Screen ────────────────────────────────────────────────────────────
const _teacherLoaded = {ts:false, profiles:false, distributions:false, cce1:false};
let   _cce1Data      = null;
const _PLOTLY_LAYOUT = {
  paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(255,255,255,.04)',
  font:{family:'Nunito, sans-serif', size:11, color:'rgba(255,255,255,.75)'},
  margin:{t:30,b:60,l:60,r:20},
  legend:{bgcolor:'rgba(0,0,0,.3)', bordercolor:'rgba(255,255,255,.15)', borderwidth:1},
};
const _PLOTLY_CFG = {responsive:true, displayModeBar:false};

function switchTeacherTab(name){
  document.querySelectorAll('.teacher-tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.ttab').forEach(t=>t.classList.remove('active'));
  const el = document.getElementById('ttab-'+name);
  if(el) el.classList.add('active');
  event.target.classList.add('active');
  loadTeacherTab(name);
}

function initTeacherScreen(){
  if(!_teacherLoaded.ts) loadTeacherTab('ts');
}

async function loadTeacherTab(name){
  if(name==='ts'       && !_teacherLoaded.ts)            { _teacherLoaded.ts=true;            await _loadTS(); }
  if(name==='profiles' && !_teacherLoaded.profiles)       { _teacherLoaded.profiles=true;       await _loadProfiles(); }
  if(name==='distributions' && !_teacherLoaded.distributions){ _teacherLoaded.distributions=true; await _loadDistributions(); }
  if((name==='cce1temp'||name==='cce1sal') && !_teacherLoaded.cce1){ _teacherLoaded.cce1=true; await _loadCCE1(); }
  if(name==='cce1temp' && _cce1Data) _drawCCE1Temp();
  if(name==='cce1sal'  && _cce1Data) _drawCCE1Sal();
}

async function _loadTS(){
  const el=document.getElementById('tc-ts');
  el.innerHTML='<div class="teacher-loading"><span class="spin">🔄</span>Loading T-S data…</div>';
  try{
    const d=await fetch('/api/teacher/ts').then(r=>r.json());
    const zColors={sunlight:'rgba(255,159,28,.45)',twilight:'rgba(199,125,255,.45)',midnight:'rgba(76,201,240,.45)'};
    const zNames ={sunlight:'🌞 Sunlight',twilight:'🌅 Twilight',midnight:'🌑 Midnight'};
    const traces=ZORDER.map(zk=>({
      type:'scatter', mode:'markers', name:zNames[zk],
      x:(d.zones[zk]||[]).map(p=>p.x),
      y:(d.zones[zk]||[]).map(p=>p.y),
      marker:{color:zColors[zk],size:3,opacity:.55},
      hovertemplate:'S: %{x:.3f} PSU<br>T: %{y:.2f}°C<extra>'+zNames[zk]+'</extra>',
    }));
    if(d.track&&d.track.length){
      traces.push({type:'scatter',mode:'markers',name:'🔴 Nori Cycles',
        x:d.track.map(p=>p.x), y:d.track.map(p=>p.y),
        text:d.track.map(p=>`Cycle ${p.cycle} — ${p.date}`),
        marker:{color:'#ff6b6b',size:10,symbol:'star',line:{color:'white',width:1.5}},
        hovertemplate:'%{text}<br>S: %{x:.3f} PSU<br>T: %{y:.2f}°C<extra>Nori</extra>',
      });
    }
    el.innerHTML='';
    Plotly.newPlot(el, traces, {
      ...JSON.parse(JSON.stringify(_PLOTLY_LAYOUT)),
      xaxis:{title:{text:'Salinity (PSU)',font:{size:12}},gridcolor:'rgba(255,255,255,.07)',zerolinecolor:'rgba(255,255,255,.1)'},
      yaxis:{title:{text:'Temperature (°C)',font:{size:12}},gridcolor:'rgba(255,255,255,.07)',zerolinecolor:'rgba(255,255,255,.1)'},
    }, _PLOTLY_CFG);
  }catch(e){ el.innerHTML=`<div class="teacher-loading">⚠️ Failed to load T-S data: ${e.message}</div>`; }
}

async function _loadProfiles(){
  const el=document.getElementById('tc-profiles');
  el.innerHTML='<div class="teacher-loading"><span class="spin">🔄</span>Loading profiles…</div>';
  try{
    const d=await fetch('/api/teacher/profiles').then(r=>r.json());
    const depths=d.map(p=>p.d);
    const traces=[
      {type:'scatter',mode:'lines',name:'±1σ Temp',
       x:[...d.map(p=>p.tm+p.ts),...d.map(p=>p.tm-p.ts).reverse()],
       y:[...depths,...depths.slice().reverse()],
       fill:'toself',fillcolor:'rgba(52,152,219,.15)',line:{color:'rgba(0,0,0,0)'},showlegend:false,hoverinfo:'skip'},
      {type:'scatter',mode:'lines',name:'Mean Temp (°C)',
       x:d.map(p=>p.tm), y:depths,
       line:{color:'#4cc9f0',width:2.5},
       hovertemplate:'Depth: %{y} dbar<br>Temp: %{x:.2f}°C<extra></extra>'},
    ];
    if(d[0]&&d[0].sm!=null){
      traces.push(
        {type:'scatter',mode:'lines',name:'±1σ Sal',
         x:[...d.filter(p=>p.sm!=null).map(p=>p.sm+(p.ss||0)),...d.filter(p=>p.sm!=null).map(p=>p.sm-(p.ss||0)).reverse()],
         y:[...d.filter(p=>p.sm!=null).map(p=>p.d),...d.filter(p=>p.sm!=null).map(p=>p.d).reverse()],
         fill:'toself',fillcolor:'rgba(22,160,133,.15)',line:{color:'rgba(0,0,0,0)'},showlegend:false,hoverinfo:'skip',xaxis:'x2'},
        {type:'scatter',mode:'lines',name:'Mean Salinity (PSU)',
         x:d.filter(p=>p.sm!=null).map(p=>p.sm),
         y:d.filter(p=>p.sm!=null).map(p=>p.d),
         line:{color:'#00f5c3',width:2.5},xaxis:'x2',
         hovertemplate:'Depth: %{y} dbar<br>Sal: %{x:.3f} PSU<extra></extra>'},
      );
    }
    el.innerHTML='';
    Plotly.newPlot(el, traces, {
      ...JSON.parse(JSON.stringify(_PLOTLY_LAYOUT)),
      grid:{rows:1,columns:d[0]&&d[0].sm!=null?2:1,pattern:'independent'},
      yaxis:{autorange:'reversed',title:{text:'Depth (dbar)',font:{size:12}},gridcolor:'rgba(255,255,255,.07)'},
      xaxis:{title:{text:'Temperature (°C)',font:{size:12}},gridcolor:'rgba(255,255,255,.07)'},
      xaxis2:{title:{text:'Salinity (PSU)',font:{size:12}},gridcolor:'rgba(255,255,255,.07)'},
      shapes:[
        {type:'rect',xref:'paper',x0:0,x1:1,yref:'y',y0:0,y1:200,fillcolor:'rgba(255,159,28,.06)',line:{width:0},layer:'below'},
        {type:'rect',xref:'paper',x0:0,x1:1,yref:'y',y0:200,y1:1000,fillcolor:'rgba(199,125,255,.06)',line:{width:0},layer:'below'},
        {type:'rect',xref:'paper',x0:0,x1:1,yref:'y',y0:1000,y1:2200,fillcolor:'rgba(76,201,240,.06)',line:{width:0},layer:'below'},
      ],
    }, _PLOTLY_CFG);
  }catch(e){ el.innerHTML=`<div class="teacher-loading">⚠️ ${e.message}</div>`; }
}

async function _loadDistributions(){
  const el=document.getElementById('tc-distributions');
  el.innerHTML='<div class="teacher-loading"><span class="spin">🔄</span>Loading distributions…</div>';
  try{
    const d=await fetch('/api/teacher/distributions').then(r=>r.json());
    const zColors={sunlight:'rgba(255,159,28,.7)',twilight:'rgba(199,125,255,.7)',midnight:'rgba(76,201,240,.7)'};
    const zNames={sunlight:'🌞 Sunlight',twilight:'🌅 Twilight',midnight:'🌑 Midnight'};
    const traces=[];
    const shapes=[];
    let col=1;
    for(const zk of ZORDER){
      const z=d[zk]; if(!z) continue;
      const xref=`x${col>1?col:''}`, yref=`y${col>1?col:''}`;
      traces.push({type:'bar',name:zNames[zk],x:z.labels,y:z.counts,
        marker:{color:zColors[zk],line:{color:'rgba(255,255,255,.1)',width:.5}},
        xaxis:`x${col>1?col:''}`, yaxis:`y${col>1?col:''}`,
        hovertemplate:'T: %{x:.1f}°C<br>Count: %{y}<extra>'+zNames[zk]+'</extra>'});
      shapes.push({type:'rect',xref,yref:'paper',x0:z.baseline-z.tolerance,x1:z.baseline+z.tolerance,
        y0:0,y1:1,fillcolor:'rgba(46,204,113,.15)',line:{color:'rgba(46,204,113,.6)',width:1.5,dash:'dot'},layer:'above'});
      shapes.push({type:'line',xref,yref:'paper',x0:z.baseline,x1:z.baseline,y0:0,y1:1,
        line:{color:'rgba(255,255,255,.8)',width:2}});
      col++;
    }
    el.innerHTML='';
    Plotly.newPlot(el, traces, {
      ...JSON.parse(JSON.stringify(_PLOTLY_LAYOUT)),
      grid:{rows:1,columns:ZORDER.length,pattern:'independent'},
      shapes,
      annotations:ZORDER.map((zk,i)=>({xref:`x${i>0?i+1:''}`,yref:'paper',x:d[zk]&&d[zk].baseline,y:1.04,
        text:zNames[zk],showarrow:false,font:{size:11,color:'rgba(255,255,255,.7)'}})),
      xaxis:{title:{text:'Temperature (°C)',font:{size:11}},gridcolor:'rgba(255,255,255,.05)'},
      xaxis2:{title:{text:'Temperature (°C)',font:{size:11}},gridcolor:'rgba(255,255,255,.05)'},
      xaxis3:{title:{text:'Temperature (°C)',font:{size:11}},gridcolor:'rgba(255,255,255,.05)'},
      yaxis:{title:{text:'Count',font:{size:11}},gridcolor:'rgba(255,255,255,.05)'},
      bargap:0.06,
    }, _PLOTLY_CFG);
  }catch(e){ el.innerHTML=`<div class="teacher-loading">⚠️ ${e.message}</div>`; }
}

async function _loadCCE1(){
  document.getElementById('tc-cce1temp').innerHTML='<div class="teacher-loading"><span class="spin">🔄</span>Loading CCE1 mooring data… (first load may take a moment)</div>';
  document.getElementById('tc-cce1sal').innerHTML= '<div class="teacher-loading"><span class="spin">🔄</span>Loading CCE1 mooring data…</div>';
  try{
    _cce1Data=await fetch('/api/teacher/cce1').then(r=>r.json());
    if(_cce1Data.cce1&&_cce1Data.cce1.error){
      const msg=`<div class="teacher-loading">⚠️ CCE1 data unavailable: ${_cce1Data.cce1.error}<br><small style="opacity:.6">CCE1 mooring data requires a network connection to NOAA THREDDS on first run.</small></div>`;
      document.getElementById('tc-cce1temp').innerHTML=msg;
      document.getElementById('tc-cce1sal').innerHTML=msg;
    }else{
      _drawCCE1Temp();
      _drawCCE1Sal();
    }
  }catch(e){
    const msg=`<div class="teacher-loading">⚠️ ${e.message}</div>`;
    document.getElementById('tc-cce1temp').innerHTML=msg;
    document.getElementById('tc-cce1sal').innerHTML=msg;
  }
}

function _drawCCE1Temp(){
  if(!_cce1Data) return;
  const el=document.getElementById('tc-cce1temp');
  const {cce1,nori}=_cce1Data;
  const traces=[];
  if(cce1.time&&cce1.time.length){
    traces.push({type:'scatter',mode:'lines',name:'CCE1 Mooring',
      x:cce1.time, y:cce1.temp,
      line:{color:'rgba(76,201,240,.8)',width:1.5},
      hovertemplate:'%{x}<br>T: %{y:.2f}°C<extra>CCE1 Mooring</extra>'});
  }
  if(nori&&nori.length){
    traces.push({type:'scatter',mode:'markers',name:'Nori Dive (surface mean)',
      x:nori.map(p=>p.date), y:nori.map(p=>p.temp),
      text:nori.map(p=>`Cycle ${p.cycle}`),
      marker:{color:'#ff9f1c',size:8,symbol:'circle',line:{color:'white',width:1.5}},
      hovertemplate:'%{text} — %{x}<br>T: %{y:.2f}°C<extra>Nori Float</extra>'});
  }
  el.innerHTML='';
  Plotly.newPlot(el, traces, {
    ...JSON.parse(JSON.stringify(_PLOTLY_LAYOUT)),
    title:{text:'',font:{size:12}},
    xaxis:{title:{text:'Date',font:{size:12}},gridcolor:'rgba(255,255,255,.07)'},
    yaxis:{title:{text:'Temperature (°C)',font:{size:12}},gridcolor:'rgba(255,255,255,.07)'},
  }, _PLOTLY_CFG);
}

function _drawCCE1Sal(){
  if(!_cce1Data) return;
  const el=document.getElementById('tc-cce1sal');
  const {cce1,nori}=_cce1Data;
  const traces=[];
  if(cce1.time&&cce1.sal&&cce1.sal.some(v=>v!=null)){
    traces.push({type:'scatter',mode:'lines',name:'CCE1 Mooring',
      x:cce1.time, y:cce1.sal,
      line:{color:'rgba(0,245,195,.8)',width:1.5},
      hovertemplate:'%{x}<br>S: %{y:.3f} PSU<extra>CCE1 Mooring</extra>'});
  }
  const noriSal=nori&&nori.filter(p=>p.sal!=null);
  if(noriSal&&noriSal.length){
    traces.push({type:'scatter',mode:'markers',name:'Nori Dive (surface mean)',
      x:noriSal.map(p=>p.date), y:noriSal.map(p=>p.sal),
      text:noriSal.map(p=>`Cycle ${p.cycle}`),
      marker:{color:'#ffd60a',size:8,symbol:'circle',line:{color:'white',width:1.5}},
      hovertemplate:'%{text} — %{x}<br>S: %{y:.3f} PSU<extra>Nori Float</extra>'});
  }
  el.innerHTML='';
  Plotly.newPlot(el, traces, {
    ...JSON.parse(JSON.stringify(_PLOTLY_LAYOUT)),
    xaxis:{title:{text:'Date',font:{size:12}},gridcolor:'rgba(255,255,255,.07)'},
    yaxis:{title:{text:'Salinity (PSU)',font:{size:12}},gridcolor:'rgba(255,255,255,.07)'},
  }, _PLOTLY_CFG);
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  loadG();
  if(STATS.total){
    document.getElementById('stat-r').textContent=STATS.total.toLocaleString();
    document.getElementById('stat-c').textContent=STATS.cycles.toLocaleString();
  }
  // If buddy already created, skip home screen
  if(G.created){
    showNav(true);
    goTo('map');
  } else {
    // Still on home screen, no nav
    updatePreview();
    syncCreatorUI();
  }
});
</script>
</body>
</html>"""

# ══════════════════════════════════════════════════════════════════════════════
# TEACHER DASHBOARD PAGE
# ══════════════════════════════════════════════════════════════════════════════
PAGE_TEACHER = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ArgoBuddy — Teacher Command Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:'Segoe UI',system-ui,sans-serif;background:#f0f4f8;color:#1a2332;min-height:100vh}

/* ── Header ── */
.dash-header{
  background:linear-gradient(135deg,#1a2332 0%,#2c3e50 100%);
  color:white;padding:.9rem 2rem;
  display:flex;align-items:center;justify-content:space-between;
  border-bottom:3px solid #00b4d8;box-shadow:0 2px 12px rgba(0,0,0,.25)
}
.dash-logo{font-size:1.15rem;font-weight:800;letter-spacing:-.01em}
.dash-logo span{color:#00d4ff}
.dash-meta{display:flex;align-items:center;gap:1.5rem;font-size:.8rem;color:rgba(255,255,255,.6)}
.live-dot{width:9px;height:9px;border-radius:50%;background:#2ecc71;
          animation:blink 1.4s ease-in-out infinite;display:inline-block;margin-right:.35rem}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.btn-back{padding:.38rem 1rem;border-radius:20px;background:rgba(255,255,255,.12);
          border:1.5px solid rgba(255,255,255,.22);color:rgba(255,255,255,.8);
          font-size:.78rem;font-weight:700;text-decoration:none;
          transition:background .2s;white-space:nowrap}
.btn-back:hover{background:rgba(255,255,255,.2)}

/* ── Zone indicator strip ── */
.zone-strip{display:flex;gap:0;border-bottom:1px solid #dde3ea}
.zone-pill{flex:1;padding:.5rem 1rem;text-align:center;font-size:.72rem;font-weight:800;
           text-transform:uppercase;letter-spacing:.06em;cursor:default;
           border-bottom:3px solid transparent;transition:all .2s;color:#6b7c93}
.zone-pill.active-sunlight{border-color:#ff9f1c;color:#b8730a;background:#fffbf0}
.zone-pill.active-twilight{border-color:#c77dff;color:#7b3fa3;background:#faf5ff}
.zone-pill.active-midnight{border-color:#4cc9f0;color:#0d7fa3;background:#f0faff}

/* ── Main grid ── */
.dash-body{display:grid;grid-template-columns:300px 1fr 280px;gap:0;height:calc(100vh - 115px);overflow:hidden}

/* ── Panel base ── */
.panel{padding:1.1rem 1.2rem;overflow-y:auto;border-right:1px solid #dde3ea}
.panel:last-child{border-right:none}
.panel-title{font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;
             color:#8a99ab;margin-bottom:.75rem;padding-bottom:.4rem;
             border-bottom:2px solid #e8ecf0}
.panel-title span{float:right;font-size:.65rem;font-weight:600;color:#b0bec5;text-transform:none;letter-spacing:0}

/* ── Evidence table (left panel) ── */
.evidence-table{width:100%;border-collapse:collapse;font-size:.82rem}
.evidence-table th{font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
                   color:#8a99ab;padding:.5rem .6rem;text-align:left;background:#f7f9fb;
                   border-bottom:2px solid #e0e7ef}
.evidence-table td{padding:.55rem .6rem;border-bottom:1px solid #eef1f5;vertical-align:middle}
.evidence-table tr:hover td{background:#f7f9fb}
.ev-val{font-weight:800;font-size:.95rem}
.ev-base{font-size:.72rem;color:#8a99ab;margin-top:.1rem}
.ev-delta{display:inline-block;padding:.1rem .45rem;border-radius:6px;
          font-size:.72rem;font-weight:800;margin-top:.15rem}
.ev-delta.pos{background:#fff0e6;color:#c0392b}
.ev-delta.neg{background:#e8f4fd;color:#2980b9}
.ev-delta.ok {background:#eafaf1;color:#27ae60}

.stat-row{display:flex;justify-content:space-between;align-items:center;
          padding:.6rem .8rem;background:white;border-radius:8px;
          margin:.35rem 0;border:1px solid #eef1f5;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.stat-row .label{font-size:.72rem;font-weight:700;color:#6b7c93;text-transform:uppercase;letter-spacing:.04em}
.stat-row .value{font-size:1rem;font-weight:800;color:#1a2332}

.p-badge{display:inline-block;padding:.2rem .6rem;border-radius:6px;
         font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
.p-badge.proven{background:#d4efdf;color:#1e8449}
.p-badge.inconc {background:#fdebd0;color:#a04000}

.health-bar-wrap{margin:.5rem 0 .9rem}
.hbar-label{display:flex;justify-content:space-between;font-size:.72rem;
            font-weight:700;color:#6b7c93;margin-bottom:.25rem}
.hbar-track{background:#e8ecf0;border-radius:6px;height:10px;overflow:hidden}
.hbar-fill{height:100%;border-radius:6px;transition:width .6s ease}

/* ── Center panel — T-S chart ── */
.chart-panel{padding:1.1rem 1.4rem;overflow:hidden;display:flex;flex-direction:column;border-right:1px solid #dde3ea}
.chart-container{flex:1;position:relative;min-height:0}
.ts-legend{display:flex;gap:1rem;margin-top:.7rem;flex-wrap:wrap}
.ts-leg-item{display:flex;align-items:center;gap:.35rem;font-size:.73rem;color:#6b7c93;font-weight:600}
.ts-leg-dot{width:10px;height:10px;border-radius:50%}

.chart-explain{background:#f7f9fb;border:1px solid #e0e7ef;border-radius:8px;
               padding:.7rem .9rem;margin-top:.7rem;font-size:.77rem;
               color:#4a5568;line-height:1.5}
.chart-explain strong{color:#1a2332}

/* ── Right panel — NGSS log ── */
.disc-item{background:white;border:1px solid #e0e7ef;border-left:4px solid #27ae60;
           border-radius:8px;padding:.7rem .9rem;margin:.4rem 0;font-size:.8rem;
           box-shadow:0 1px 3px rgba(0,0,0,.04);animation:slideIn .3s ease}
.disc-item.warm{border-left-color:#e74c3c}
.disc-item.cold{border-left-color:#2980b9}
@keyframes slideIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}
.disc-zone{font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#8a99ab}
.disc-vals{font-weight:700;color:#1a2332;margin:.15rem 0}
.disc-ngss{display:inline-block;padding:.1rem .45rem;background:#e8f4fd;
           color:#1565c0;border-radius:5px;font-size:.65rem;font-weight:800;margin-top:.2rem}
.disc-std{font-size:.7rem;color:#6b7c93;margin-top:.15rem}
.disc-time{font-size:.65rem;color:#b0bec5;float:right}
.empty-disc{text-align:center;padding:2.5rem 1rem;color:#b0bec5}
.empty-disc .icon{font-size:2.5rem;margin-bottom:.5rem}

/* ── LOO table at bottom ── */
.loo-section{grid-column:1/-1;border-top:1px solid #dde3ea;
             padding:.8rem 1.4rem;overflow-x:auto;background:white}
.loo-section .panel-title{margin-bottom:.6rem}
.loo-table{width:100%;border-collapse:collapse;font-size:.78rem}
.loo-table th{font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
              color:#8a99ab;padding:.45rem .7rem;text-align:left;background:#f7f9fb;
              border-bottom:2px solid #e0e7ef;white-space:nowrap}
.loo-table td{padding:.45rem .7rem;border-bottom:1px solid #eef1f5;vertical-align:middle}
.loo-table tr:hover td{background:#f7f9fb}
.sig-yes{background:#d4efdf;color:#1e8449;padding:.15rem .5rem;border-radius:5px;
         font-size:.68rem;font-weight:800}
.sig-no {background:#fdebd0;color:#a04000;padding:.15rem .5rem;border-radius:5px;
         font-size:.68rem;font-weight:800}
.ztag-s{background:#fff3cd;color:#856404;padding:.15rem .5rem;border-radius:5px;font-size:.68rem;font-weight:800}
.ztag-t{background:#f3e5f5;color:#6a1b9a;padding:.15rem .5rem;border-radius:5px;font-size:.68rem;font-weight:800}
.ztag-m{background:#e3f2fd;color:#0d47a1;padding:.15rem .5rem;border-radius:5px;font-size:.68rem;font-weight:800}

.dash-body-grid{display:grid;grid-template-rows:1fr auto;height:calc(100vh - 115px)}
.top-grid{display:grid;grid-template-columns:300px 1fr 280px;overflow:hidden}
</style>
</head>
<body>

<!-- Header -->
<div class="dash-header">
  <div>
    <div class="dash-logo">ArgoBuddy <span>Command</span> — Teacher Dashboard</div>
    <div style="font-size:.72rem;color:rgba(255,255,255,.45);margin-top:.15rem">
      Real-time telemetry · Argo Float 4901639 · Pacific Ocean, Nov 2015 – Jan 2017
    </div>
  </div>
  <div class="dash-meta">
    <div><span class="live-dot"></span>Live Student Feed</div>
    <div id="last-update" style="color:rgba(255,255,255,.35)">Waiting…</div>
    <a href="/" target="_blank" class="btn-back">← Student View</a>
    <button class="btn-back" onclick="resetSession()" style="border-color:rgba(231,76,60,.5);color:rgba(231,76,60,.8)">Reset Session</button>
  </div>
</div>

<!-- Zone strip -->
<div class="zone-strip">
  <div class="zone-pill" id="zpill-sunlight">Sunlight Zone · 0–200 m · Baseline 12.2°C</div>
  <div class="zone-pill" id="zpill-twilight">Twilight Zone · 200–1000 m · Baseline 6.8°C</div>
  <div class="zone-pill" id="zpill-midnight">Midnight Zone · 1000–2000 m · Baseline 3.0°C</div>
</div>

<!-- Dashboard body -->
<div class="dash-body-grid">
  <div class="top-grid">

    <!-- LEFT — Evidence Panel -->
    <div class="panel">
      <div class="panel-title">Evidence <span>Student Input vs 50-yr Historical Mean</span></div>

      <!-- Key metrics -->
      <div class="stat-row">
        <div class="label">Current Zone</div>
        <div class="value" id="ev-zone">—</div>
      </div>
      <div class="stat-row">
        <div class="label">Depth</div>
        <div class="value" id="ev-depth">—</div>
      </div>
      <div class="stat-row">
        <div class="label">Mood / Status</div>
        <div class="value" id="ev-mood">—</div>
      </div>

      <!-- Evidence table -->
      <table class="evidence-table" style="margin-top:.6rem">
        <thead>
          <tr>
            <th>Parameter</th><th>Student Input</th><th>Historical Mean</th><th>Delta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:700;color:#4a5568">Temperature</td>
            <td><div class="ev-val" id="ev-temp">—</div></td>
            <td><div class="ev-val" id="ev-tbase">—</div><div class="ev-base">zone baseline</div></td>
            <td><div id="ev-tdelta"></div></td>
          </tr>
          <tr>
            <td style="font-weight:700;color:#4a5568">Salinity</td>
            <td><div class="ev-val" id="ev-sal">—</div></td>
            <td><div class="ev-val" id="ev-sbase">—</div><div class="ev-base">PSU baseline</div></td>
            <td><div id="ev-sdelta"></div></td>
          </tr>
          <tr>
            <td style="font-weight:700;color:#4a5568">p-value</td>
            <td colspan="2"><div class="ev-val" id="ev-pval">—</div></td>
            <td><div id="ev-pbadge"></div></td>
          </tr>
          <tr>
            <td style="font-weight:700;color:#4a5568">T-Anomaly</td>
            <td colspan="3"><div class="ev-val" id="ev-tanom">—</div></td>
          </tr>
        </tbody>
      </table>

      <!-- Health / Battery -->
      <div style="margin-top:1rem">
        <div class="health-bar-wrap">
          <div class="hbar-label"><span>Nori Health</span><span id="hb-val">100%</span></div>
          <div class="hbar-track"><div class="hbar-fill" id="hbar" style="width:100%;background:linear-gradient(90deg,#e74c3c,#f39c12,#27ae60)"></div></div>
        </div>
        <div class="health-bar-wrap">
          <div class="hbar-label"><span>Battery</span><span id="bb-val">100%</span></div>
          <div class="hbar-track"><div class="hbar-fill" id="bbar" style="width:100%;background:linear-gradient(90deg,#2980b9,#2ecc71)"></div></div>
        </div>
      </div>

      <!-- LOO formula callout -->
      <div style="background:#f7f9fb;border:1px solid #e0e7ef;border-radius:8px;
                  padding:.7rem .9rem;margin-top:.8rem;font-size:.74rem;color:#4a5568;line-height:1.55">
        <strong style="color:#1a2332;display:block;margin-bottom:.25rem">LOO Baseline Formula</strong>
        <code style="font-size:.7rem;color:#1565c0">
          B_loo = (Σ_all − Σ_cycle) / (N_all − N_cycle)<br>
          p = ttest_1samp(cycle_temps, B_loo)<br>
          Significant if p &lt; 0.05
        </code>
      </div>
    </div>

    <!-- CENTER — T-S Diagram -->
    <div class="chart-panel">
      <div class="panel-title" style="border-bottom:2px solid #e8ecf0;padding-bottom:.4rem;margin-bottom:.6rem">
        T–S Relationship Diagram
        <span style="font-size:.65rem;color:#8a99ab">Temperature–Salinity water mass fingerprint</span>
      </div>
      <div class="chart-container">
        <canvas id="ts-chart"></canvas>
      </div>
      <div class="ts-legend">
        <div class="ts-leg-item"><div class="ts-leg-dot" style="background:rgba(255,159,28,.6)"></div>Sunlight Zone</div>
        <div class="ts-leg-item"><div class="ts-leg-dot" style="background:rgba(199,125,255,.6)"></div>Twilight Zone</div>
        <div class="ts-leg-item"><div class="ts-leg-dot" style="background:rgba(76,201,240,.6)"></div>Midnight Zone</div>
        <div class="ts-leg-item"><div class="ts-leg-dot" style="background:#e74c3c;width:14px;height:14px"></div>Student Live</div>
      </div>
      <div class="chart-explain">
        <strong>Reading this chart:</strong> Each dot is a real Argo measurement.
        The three clusters show how temperature and salinity co-vary by depth zone —
        a water mass "fingerprint." The <strong style="color:#e74c3c">★ red star</strong>
        is the student's current slider position. When it moves outside its cluster,
        the math triggers a statistically significant anomaly.
      </div>
    </div>

    <!-- RIGHT — NGSS Discovery Log -->
    <div class="panel">
      <div class="panel-title">
        NGSS Discovery Log
        <span id="disc-count">0 discoveries</span>
      </div>
      <div id="disc-list">
        <div class="empty-disc">
          <div class="icon">🔬</div>
          <div>No anomalies detected yet.<br>Have the student adjust the sliders beyond the tolerance band to trigger discoveries.</div>
        </div>
      </div>
    </div>

  </div><!-- /top-grid -->

  <!-- BOTTOM — LOO Statistics table -->
  <div class="loo-section">
    <div class="panel-title">
      Leave-One-Out Statistical Proof
      <span>First 30 cycles × 3 zones — the engine behind the student game's Truth Meter</span>
    </div>
    <div style="overflow-x:auto;max-height:180px">
      <table class="loo-table" id="loo-table">
        <thead>
          <tr>
            <th>Zone</th><th>Cycle</th><th>LOO Baseline (°C)</th>
            <th>Cycle Mean Temp (°C)</th><th>Anomaly (°C)</th>
            <th>p-value</th><th>Significant (p&lt;0.05)</th>
          </tr>
        </thead>
        <tbody id="loo-tbody"></tbody>
      </table>
    </div>
  </div>

</div><!-- /dash-body-grid -->

<script>
const TS_DATA  = __TS_DATA__;
const ZONES_CF = __ZONES__;
const LOO_DATA = __LOO__;

// ── Build T-S chart ───────────────────────────────────────────────────────────
const ctx = document.getElementById('ts-chart').getContext('2d');
const tsChart = new Chart(ctx, {
  type:'scatter',
  data:{datasets:[
    {label:'Sunlight',data:TS_DATA.sunlight||[],
     backgroundColor:'rgba(255,159,28,.35)',pointRadius:2.5,borderWidth:0},
    {label:'Twilight',data:TS_DATA.twilight||[],
     backgroundColor:'rgba(199,125,255,.35)',pointRadius:2.5,borderWidth:0},
    {label:'Midnight',data:TS_DATA.midnight||[],
     backgroundColor:'rgba(76,201,240,.35)',pointRadius:2.5,borderWidth:0},
    {label:'Student ★',data:[{x:33.36,y:12.2}],
     backgroundColor:'#e74c3c',pointRadius:14,pointHoverRadius:16,
     pointStyle:'star',borderColor:'white',borderWidth:1.5},
  ]},
  options:{
    responsive:true,maintainAspectRatio:false,
    animation:{duration:200},
    plugins:{
      legend:{display:false},
      tooltip:{callbacks:{
        label:c=>`${c.dataset.label}: T=${c.parsed.y.toFixed(2)}°C  S=${c.parsed.x.toFixed(3)} PSU`
      }}
    },
    scales:{
      x:{title:{display:true,text:'Salinity (PSU)',color:'#6b7c93',font:{size:11,weight:'600'}},
         ticks:{color:'#8a99ab',font:{size:10}},
         grid:{color:'rgba(0,0,0,.05)'}},
      y:{title:{display:true,text:'Temperature (°C)',color:'#6b7c93',font:{size:11,weight:'600'}},
         ticks:{color:'#8a99ab',font:{size:10}},
         grid:{color:'rgba(0,0,0,.05)'}}
    }
  }
});

// ── Build LOO table ───────────────────────────────────────────────────────────
(function(){
  const zTags={sunlight:'ztag-s',twilight:'ztag-t',midnight:'ztag-m'};
  const zLabels={sunlight:'Sunlight',twilight:'Twilight',midnight:'Midnight'};
  const tbody=document.getElementById('loo-tbody');
  LOO_DATA.forEach(r=>{
    const tr=document.createElement('tr');
    const sc=r.significant?'sig-yes':'sig-no';
    const zt=zTags[r.zone]||'ztag-s';
    const aSign=r.anomaly>=0?'+':'';
    tr.innerHTML=
      `<td><span class="${zt}">${zLabels[r.zone]}</span></td>`+
      `<td style="color:#6b7c93">${r.cycle}</td>`+
      `<td style="font-weight:700">${r.loo_baseline.toFixed(3)}</td>`+
      `<td>${r.mean_temp.toFixed(3)}</td>`+
      `<td style="color:${r.anomaly>0?'#c0392b':'#2980b9'};font-weight:700">${aSign}${r.anomaly.toFixed(3)}</td>`+
      `<td style="font-family:monospace">${r.p_value.toFixed(4)}</td>`+
      `<td><span class="${sc}">${r.significant?'YES — p<0.05':'No'}</span></td>`;
    tbody.appendChild(tr);
  });
})();

// ── Poll /api/state ───────────────────────────────────────────────────────────
const ZONE_LABELS={sunlight:'Sunlight Zone',twilight:'Twilight Zone',midnight:'Midnight Zone'};
const MOOD_LABELS={happy:'Nominal ✓',warm:'Overheating ⚠',cold:'Too Cold ⚠'};

function formatDelta(val, cls){
  const sign=val>=0?'+':'';
  return `<span class="ev-delta ${cls}">${sign}${val.toFixed(3)}</span>`;
}

function updateDashboard(d){
  // Zone pill
  document.querySelectorAll('.zone-pill').forEach(p=>p.className='zone-pill');
  const zp=document.getElementById('zpill-'+d.zone);
  if(zp) zp.className=`zone-pill active-${d.zone}`;

  // Evidence panel
  const zc=ZONES_CF[d.zone]||{};
  document.getElementById('ev-zone').textContent  = ZONE_LABELS[d.zone]||d.zone;
  document.getElementById('ev-depth').textContent = `${d.depth} m`;
  const moodEl=document.getElementById('ev-mood');
  moodEl.textContent=MOOD_LABELS[d.mood]||d.mood;
  moodEl.style.color=d.mood==='happy'?'#27ae60':(d.mood==='warm'?'#e74c3c':'#2980b9');

  document.getElementById('ev-temp').textContent  = `${d.temperature}°C`;
  document.getElementById('ev-tbase').textContent = `${(zc.baseline||0).toFixed(1)}°C`;
  document.getElementById('ev-sal').textContent   = `${d.salinity} PSU`;
  document.getElementById('ev-sbase').textContent = `${(zc.sal_baseline||0).toFixed(3)} PSU`;
  document.getElementById('ev-pval').textContent  = d.p_value.toFixed(4);
  document.getElementById('ev-tanom').textContent = `${d.anomaly_t>=0?'+':''}${d.anomaly_t.toFixed(3)}°C`;

  const tCls = d.anomaly_t>0.1?'pos':(d.anomaly_t<-0.1?'neg':'ok');
  const sCls = d.anomaly_s>0.01?'pos':(d.anomaly_s<-0.01?'neg':'ok');
  document.getElementById('ev-tdelta').innerHTML = formatDelta(d.anomaly_t, tCls);
  document.getElementById('ev-sdelta').innerHTML = formatDelta(d.anomaly_s, sCls);

  const pHtml = d.significant
    ? '<span class="p-badge proven">✓ Proved by Science</span>'
    : '<span class="p-badge inconc">Inconclusive</span>';
  document.getElementById('ev-pbadge').innerHTML = pHtml;

  // Health / battery bars
  const h=Math.max(0,Math.min(100,d.health));
  const b=Math.max(0,Math.min(100,d.battery));
  document.getElementById('hbar').style.width=h+'%';
  document.getElementById('hb-val').textContent=h.toFixed(0)+'%';
  document.getElementById('bbar').style.width=b+'%';
  document.getElementById('bb-val').textContent=b.toFixed(0)+'%';

  // T-S live point
  tsChart.data.datasets[3].data=[{x:d.salinity, y:d.temperature}];
  tsChart.update('none');

  // Last update time
  const ts=new Date(d.ts);
  document.getElementById('last-update').textContent=
    'Updated '+ts.toLocaleTimeString();

  // Discovery log
  renderDiscoveries(d.discoveries||[]);
}

function renderDiscoveries(list){
  const el=document.getElementById('disc-list');
  document.getElementById('disc-count').textContent=
    list.length+' discover'+(list.length===1?'y':'ies');
  if(!list.length){
    el.innerHTML='<div class="empty-disc"><div class="icon">🔬</div><div>No anomalies detected yet.<br>Have the student adjust the sliders beyond the tolerance band.</div></div>';
    return;
  }
  el.innerHTML=[...list].reverse().map(d=>{
    const cls=d.mood==='warm'?'warm':'cold';
    const aSign=d.anomaly_t>=0?'+':'';
    return `<div class="disc-item ${cls}">
      <div class="disc-time">${d.time}</div>
      <div class="disc-zone">${ZONE_LABELS[d.zone]||d.zone} · ${d.mood.toUpperCase()}</div>
      <div class="disc-vals">T=${d.temp}°C · S=${d.sal} PSU · Δ=${aSign}${d.anomaly_t}°C</div>
      <div>p = <strong>${d.p_value.toFixed(4)}</strong>
           <span style="color:${d.mood==='warm'?'#e74c3c':'#2980b9'};font-weight:800;font-size:.72rem;margin-left:.3rem">
             ${d.mood==='warm'?'HEAT ANOMALY':'COLD ANOMALY'}</span></div>
      ${d.ngss_code?`<div class="disc-ngss">${d.ngss_code}</div>
        <div class="disc-std">${d.ngss_desc}</div>`:''}
    </div>`;
  }).join('');
}

async function poll(){
  try{
    const r=await fetch('/api/state');
    const d=await r.json();
    updateDashboard(d);
  }catch(e){}
}

async function resetSession(){
  await fetch('/api/reset',{method:'POST'});
  poll();
}

// Initial render with server-side state, then poll
poll();
setInterval(poll, 1500);
</script>
</body>
</html>"""


if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--port', type=int, default=5050)
    args = p.parse_args()
    print(f'\nArgoBuddy  -->  http://localhost:{args.port}')
    print(f'Teacher   -->  http://localhost:{args.port}/teacher\n')
    app.run(debug=True, port=args.port, use_reloader=False)
