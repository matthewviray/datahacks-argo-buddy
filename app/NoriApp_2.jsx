import { useState, useEffect, useRef, useMemo } from 'react';
import { Thermometer, Droplet, Activity, Waves, Sun, Sunset, Moon, Info, BookOpen, Play, Sparkles, TrendingUp, BarChart3, Palette, Home, Compass, Zap, AlertTriangle, ChevronRight, LayoutDashboard, Heart, Lightbulb, Shell, Users, Flame, Snowflake, Skull, ArrowUp, ArrowDown, Clock, Ruler, Database, GraduationCap, HelpCircle, MessageSquare, Target, FileText, CheckCircle2, Globe, X } from 'lucide-react';

// ============ ZONE CONFIG (merged from nori_app.py + notebooks) ============
const HISTORICAL_MEAN = 11.536;
const TOTAL_READINGS = 14264;
const TOTAL_CYCLES = 168;
const FLOAT_ID = '3901161';

const ZONE_CONFIG = {
  sunlight: {
    id: 'sunlight', name: 'Sunlight Zone', icon: Sun, emoji: '🌞',
    depthRange: '0–200m',
    baseline: 12.215, tolerance: 1.45, tempStd: 2.9,
    sliderMin: 5.0, sliderMax: 20.0, sliderDefault: 12.2,
    salBaseline: 33.359, salTolerance: 0.143,
    tippingPoint: 19.5,
    pctWarm: 34.2, pctHappy: 47.7, pctCold: 18.1,
    skyTop: '#87CEEB', skyMid: '#4A90C2', skyBottom: '#2E6DA8',
    accentLight: '#FFE082',
    residents: ['🪸 Coral', '🐠 Tropical fish', '🐢 Sea turtles', '🐬 Dolphins'],
    climateStory: 'The Crisis Zone',
    climateTag: 'Climate change hits here first and hardest',
    description: 'The sunlit surface where 90% of marine life lives. Powered by sunlight, warm, and full of life — but the most vulnerable to rising temperatures.',
    fact: "The ocean absorbs 90% of Earth's excess heat — mostly right here in the sunlight zone.",
    funFacts: [
      'Phytoplankton here produce 50% of Earth\'s oxygen — more than all rainforests combined.',
      'A single drop of surface water can hold millions of microscopic organisms.',
      'Sunlight fades to blackness after only ~200m of depth.',
    ],
    risks: [
      { title: 'Marine heatwaves', body: 'Surface warming events kill coral and disrupt fish migration. Intensity has tripled since 1980.' },
      { title: 'Plastic accumulation', body: '80% of ocean plastic floats in the top 200m, affecting plankton and everything that eats them.' },
      { title: 'Acidification', body: 'CO₂ dissolves fastest at the surface, lowering pH and harming shell-forming life.' },
    ],
  },
  twilight: {
    id: 'twilight', name: 'Twilight Zone', icon: Sunset, emoji: '🌅',
    depthRange: '200–1000m',
    baseline: 6.82, tolerance: 0.703, tempStd: 1.405,
    sliderMin: 2.0, sliderMax: 14.0, sliderDefault: 6.8,
    salBaseline: 34.122, salTolerance: 0.084,
    tippingPoint: 10.3,
    pctWarm: 28.5, pctHappy: 49.2, pctCold: 22.3,
    skyTop: '#4A4B7A', skyMid: '#2E2F5B', skyBottom: '#1A1B3D',
    accentLight: '#9B8EF0',
    residents: ['💡 Bioluminescent', '🦑 Squid', '🐟 Lanternfish', '🪼 Jellyfish'],
    climateStory: 'The Warning Zone',
    climateTag: 'Heat penetrating here means the crisis is deepening',
    description: 'Barely any sunlight reaches here. The thermocline lives in this zone. When heat breaks through, the oxygen minimum zone expands and deep creatures have nowhere to go.',
    fact: 'Every creature in this zone makes its own light. Zero sunlight reaches this deep.',
    funFacts: [
      'The largest daily migration on Earth happens here — billions of animals rise to feed at night.',
      '90% of fish in this zone produce their own bioluminescence.',
      'This layer stores more carbon than all land plants combined.',
    ],
    risks: [
      { title: 'Deep-sea mining', body: 'New mining permits threaten to disturb habitats we don\'t fully understand yet.' },
      { title: 'Oxygen loss', body: 'Warming oceans hold less oxygen. Midwater "dead zones" are expanding globally.' },
      { title: 'Overfishing', body: 'Commercial fisheries are moving deeper as surface stocks decline.' },
    ],
  },
  midnight: {
    id: 'midnight', name: 'Midnight Zone', icon: Moon, emoji: '🌑',
    depthRange: '1000–2000m',
    baseline: 2.967, tolerance: 0.285, tempStd: 0.57,
    sliderMin: 1.0, sliderMax: 6.0, sliderDefault: 3.0,
    salBaseline: 34.547, salTolerance: 0.023,
    tippingPoint: 4.4,
    pctWarm: 15.2, pctHappy: 53.0, pctCold: 31.8,
    skyTop: '#0A0F1F', skyMid: '#05080F', skyBottom: '#010204',
    accentLight: '#42C5E0',
    residents: ['🦐 Deep shrimp', '🐙 Giant squid', '🐟 Anglerfish', '🦠 Extremophiles'],
    climateStory: 'The Memory Zone',
    climateTag: 'Warming here takes centuries to reverse',
    description: 'Pitch black. Crushing pressure. Near-freezing temperatures. Nothing changes here naturally for hundreds of years. Any anomaly is a long-term climate alarm.',
    fact: 'The water Nori is measuring right now may be 1,000+ years old — it sank from the surface centuries ago.',
    funFacts: [
      'Pressure here is 100x surface pressure — enough to crush a submarine.',
      'Some species here live over 200 years because cold slows their metabolism.',
      'We\'ve mapped more of the Moon\'s surface than this part of Earth\'s ocean.',
    ],
    risks: [
      { title: 'Climate alarm', body: 'Warming detected here is decades in the making. It means surface heat has reached the abyss.' },
      { title: 'Circulation collapse', body: 'The deep currents that regulate Earth\'s climate start here. Disruption would reshape the planet.' },
      { title: 'Unknown unknowns', body: 'We barely understand this ecosystem. Damage could be irreversible before we know it happened.' },
    ],
  },
};
const ZONE_ORDER = ['sunlight', 'twilight', 'midnight'];

// ============ ZONE MOOD DATA (from nori_app.py ZONE_MOODS) ============
const ZONE_MOODS = {
  sunlight: {
    warm: {
      emoji: '🥵', color: '#FF8A5C', bg: 'rgba(255,138,92,0.15)', border: 'rgba(255,138,92,0.4)',
      headline: 'Too Hot — Nori is Sweating',
      consequence: 'Water is warmer than normal. Coral reefs are bleaching, fish are fleeing, sea turtles are disoriented.',
      risks: ['🪸 Coral bleaching', '🐠 Fish migrating away', '🐢 Turtle nesting disrupted', '🦠 Algae blooms forming'],
      climateLink: 'This is what climate change looks like from inside the ocean — absorbing excess atmospheric heat.',
    },
    cold: {
      emoji: '🥶', color: '#8ED4FF', bg: 'rgba(142,212,255,0.15)', border: 'rgba(142,212,255,0.4)',
      headline: 'Too Cold — Nori is Shivering',
      consequence: 'Cold upwelling pushing nutrients to the surface. Great for plankton — stressful for warm-water species.',
      risks: ['🌊 Cold upwelling event', '🐟 Warm fish displaced', '🪸 Coral cold-stressed', '🦅 Seabird food chain disrupted'],
      climateLink: 'Cold anomalies can signal disrupted circulation — a side effect of melting polar ice.',
    },
    happy: {
      emoji: '🐠', color: '#2FE09F', bg: 'rgba(47,224,159,0.15)', border: 'rgba(47,224,159,0.4)',
      headline: 'Perfect — Nori is Thriving',
      consequence: "Temperature is right in Nori's comfort zone. The surface ecosystem is healthy and balanced.",
      risks: ['✅ Coral reefs healthy', '✅ Fish populations stable', '✅ Food chain intact', '✅ Plankton thriving'],
      climateLink: "This is what healthy baselines look like — what we're working to protect.",
    },
  },
  twilight: {
    warm: {
      emoji: '😰', color: '#FF8A5C', bg: 'rgba(255,138,92,0.15)', border: 'rgba(255,138,92,0.4)',
      headline: 'Heat Invading — Nori is Stressed',
      consequence: 'Warm water penetrating deeper than it should. The oxygen minimum zone is expanding — creatures are suffocating.',
      risks: ['🫧 Oxygen zone expanding', '🦑 Squid habitat shrinking', '💡 Bioluminescence disrupted', '🌡️ Thermocline shifting'],
      climateLink: 'Heat reaching the twilight zone means the crisis is no longer just a surface problem.',
    },
    cold: {
      emoji: '🫧', color: '#B294E8', bg: 'rgba(178,148,232,0.15)', border: 'rgba(178,148,232,0.4)',
      headline: 'Too Cold — Nori is Hiding',
      consequence: 'Cold layer thickening, pushing twilight creatures upward into unfamiliar territory.',
      risks: ['🐟 Species pushed upward', '🌊 Thermocline sharpening', '🦈 Predator balance broken', '🪼 Jelly blooms forming'],
      climateLink: 'Cold intrusions can signal disrupted deep circulation patterns.',
    },
    happy: {
      emoji: '🔦', color: '#2FE09F', bg: 'rgba(47,224,159,0.15)', border: 'rgba(47,224,159,0.4)',
      headline: 'All Good — Nori is Exploring',
      consequence: 'Thermocline is stable. Bioluminescent creatures glow undisturbed in the dark.',
      risks: ['✅ Thermocline steady', '✅ Oxygen normal', '✅ Deep creatures calm', '✅ Pressure balanced'],
      climateLink: "A stable twilight zone means the surface crisis hasn't penetrated this deep.",
    },
  },
  midnight: {
    warm: {
      emoji: '🚨', color: '#E24B4A', bg: 'rgba(226,75,74,0.18)', border: 'rgba(226,75,74,0.5)',
      headline: 'ALARM — Deep Ocean Warming',
      consequence: 'This is a major long-term climate signal. The deep ocean takes centuries to warm naturally.',
      risks: ['🚨 Century-scale alarm', '🦐 Deep ecosystem collapsing', '🌊 Thermohaline disrupted', '⏳ Effects for 300+ years'],
      climateLink: 'If the midnight zone is warming, we have crossed a threshold that will take generations to reverse.',
    },
    cold: {
      emoji: '🧊', color: '#8ED4FF', bg: 'rgba(142,212,255,0.15)', border: 'rgba(142,212,255,0.4)',
      headline: 'Very Cold — Nori is Dormant',
      consequence: 'Dense cold polar water sinking through the deep. Thermohaline circulation is active and healthy.',
      risks: ['🧊 Cold deep water forming', '🌊 Ocean conveyor active', '🐟 Cold species stable', '🌍 Deep circulation working'],
      climateLink: 'Cold deep water is healthy — it drives the global circulation that regulates Earth\'s climate.',
    },
    happy: {
      emoji: '🌑', color: '#B8C2CC', bg: 'rgba(184,194,204,0.12)', border: 'rgba(184,194,204,0.4)',
      headline: 'Stable — Nori is Resting',
      consequence: "The deep ocean is in its ancient stable state. Conditions here haven't changed in decades.",
      risks: ['✅ Ecosystem undisturbed', '✅ Ancient conditions preserved', '✅ Temp balanced', '✅ Circulation normal'],
      climateLink: "A stable midnight zone means the crisis hasn't reached its deepest, most serious stage.",
    },
  },
};

// ============ PROFILE DATA ============
const THERMOCLINE_PROFILE = [
  { depth: 0, mean: 15.2, std: 2.9 }, { depth: 50, mean: 14.8, std: 2.8 },
  { depth: 100, mean: 13.5, std: 3.1 }, { depth: 150, mean: 11.2, std: 2.8 },
  { depth: 200, mean: 9.4, std: 2.4 }, { depth: 300, mean: 7.8, std: 2.1 },
  { depth: 400, mean: 6.8, std: 1.8 }, { depth: 500, mean: 6.1, std: 1.5 },
  { depth: 600, mean: 5.5, std: 1.2 }, { depth: 700, mean: 4.9, std: 1.0 },
  { depth: 800, mean: 4.4, std: 0.8 }, { depth: 900, mean: 4.0, std: 0.6 },
  { depth: 1000, mean: 3.7, std: 0.5 }, { depth: 1200, mean: 3.4, std: 0.4 },
  { depth: 1400, mean: 3.2, std: 0.4 }, { depth: 1600, mean: 3.1, std: 0.3 },
  { depth: 1800, mean: 3.0, std: 0.3 }, { depth: 2000, mean: 3.0, std: 0.3 },
];
const CYCLE_TREND = Array.from({ length: 42 }, (_, i) => {
  const cycle = Math.round(i * 4);
  const base = 14.6 + 0.004 * cycle;
  const noise = Math.sin(cycle * 0.7) * 0.8 + Math.cos(cycle * 0.3) * 0.4;
  return { cycle, temp: base + noise };
});
const TREND_SLOPE = 0.0042;
const SALINITY_PROFILE = [
  { depth: 0, sal: 33.2 }, { depth: 100, sal: 33.4 }, { depth: 200, sal: 33.8 },
  { depth: 400, sal: 34.0 }, { depth: 600, sal: 34.15 }, { depth: 800, sal: 34.25 },
  { depth: 1000, sal: 34.35 }, { depth: 1500, sal: 34.5 }, { depth: 2000, sal: 34.55 },
];

// ============ HISTOGRAM SAMPLES per zone (synthetic representative) ============
function generateHistogram(zoneCfg) {
  const mean = zoneCfg.baseline;
  const std = zoneCfg.tempStd;
  const bins = 20;
  const min = zoneCfg.sliderMin;
  const max = zoneCfg.sliderMax;
  const step = (max - min) / bins;
  const hist = [];
  for (let i = 0; i < bins; i++) {
    const x = min + i * step + step / 2;
    const z = (x - mean) / std;
    const y = Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
    hist.push({ x, y: y * 1000 });
  }
  return hist;
}

// ============ MOOD ENGINE — ZONE AWARE ============
function computeMood(temp, zoneId) {
  const cfg = ZONE_CONFIG[zoneId];
  const anomaly = temp - cfg.baseline;
  const absAnomaly = Math.abs(anomaly);
  const atTippingPoint = temp >= cfg.tippingPoint;
  let mood;
  if (atTippingPoint) mood = 'tipping';
  else if (absAnomaly <= cfg.tolerance) mood = 'happy';
  else if (anomaly > cfg.tolerance) mood = 'warm';
  else mood = 'cold';
  const intensity = Math.min(1, absAnomaly / 6);
  return { mood, anomaly, absAnomaly, intensity, atTippingPoint };
}

// Salinity signal
function computeSalSignal(sal, zoneId) {
  const cfg = ZONE_CONFIG[zoneId];
  const delta = sal - cfg.salBaseline;
  if (Math.abs(delta) <= cfg.salTolerance) return { status: 'normal', delta, msg: 'Normal salinity', color: '#2FE09F', detail: null };
  if (delta < 0) return {
    status: 'fresh', delta, msg: 'Too fresh — possible glacial melt',
    color: '#8ED4FF',
    detail: 'Freshwater diluting salinity is a signature of melting glaciers. As polar ice melts, it disrupts the density-driven circulation that moves heat around the planet.',
  };
  return {
    status: 'salty', delta, msg: 'Too salty — evaporation anomaly',
    color: '#FFAB42',
    detail: 'Unusually high salinity suggests elevated evaporation or reduced freshwater input — both linked to climate shifts.',
  };
}

// ============ METRIC EXPLAINERS (hover tooltips) ============
// Each metric has a why-it-matters and what-it-reveals, keyed by zone where relevant.
const METRIC_INFO = {
  temperature: {
    title: 'Temperature',
    icon: '🌡️',
    why: 'Temperature is the single most powerful climate indicator in the ocean. It controls where species can live, how much oxygen water holds, and how fast global currents move.',
    learn: 'A shift of even 1–2°C can bleach coral, push fish toward the poles, and fuel stronger hurricanes. What looks like a small number has enormous consequences.',
    climate: 'The ocean has absorbed ~90% of the excess heat from greenhouse gases since 1970. Every reading adds a data point to that story.',
    zoneSpecific: {
      sunlight: 'Here, temperature is the frontline: coral, fisheries, and coastal weather all respond first.',
      twilight: 'When heat reaches the thermocline, the oxygen minimum zone expands — species suffocate in place.',
      midnight: 'Change at this depth is a century-scale alarm. It means surface warming has already penetrated the abyss.',
    },
  },
  salinity: {
    title: 'Salinity',
    icon: '🧂',
    why: 'Salinity drives the density of seawater, which drives the global circulation "conveyor belt" that moves heat from the tropics to the poles.',
    learn: 'Fresher surface water signals melting ice and increased rainfall; saltier water signals evaporation and drought. Together, they reveal the hydrological cycle in action.',
    climate: 'Melting Greenland and Antarctic ice is freshening the North Atlantic, threatening to slow the AMOC — the current that keeps Europe warm.',
    zoneSpecific: {
      sunlight: 'Fresher surface water here suggests meltwater or heavy rainfall — a direct climate fingerprint.',
      twilight: 'Salinity at this depth tells us about water masses from distant parts of the world mixing slowly.',
      midnight: 'Deep salinity barely changes — so when it does, something fundamental in the climate system has shifted.',
    },
  },
  stress: {
    title: 'Historical Stress',
    icon: '📊',
    why: 'Every Argo reading falls into one of three buckets — too warm, too cold, or within healthy range. The proportions reveal how stable (or strained) an ecosystem is.',
    learn: 'A zone that\'s "happy" 50%+ of the time is baseline-healthy. When "too warm" starts dominating, you\'re watching a climate signal emerge in real time.',
    climate: 'Rising % of warm anomalies year-over-year is how oceanographers detect marine heatwaves — events that have tripled in frequency since 1980.',
    zoneSpecific: {
      sunlight: 'The sunlight zone shows the highest variability because weather directly shapes it. Heatwave years spike the warm bar.',
      twilight: 'Relatively balanced — but a growing warm bar here would mean the crisis is moving deeper.',
      midnight: 'Should be nearly all-stable. Any sustained warm reading here is an emergency signal.',
    },
  },
  thermocline: {
    title: 'The Thermocline',
    icon: '📐',
    why: 'The thermocline is the sharp temperature cliff separating warm surface water from cold deep water. It\'s a physical wall that governs ocean biology and chemistry.',
    learn: 'Its depth, sharpness, and stability control fish habitat, oxygen distribution, and how much heat the ocean can store before it starts mixing downward.',
    climate: 'A warming surface makes the thermocline steeper and pushes it deeper — shrinking the habitable layer and trapping heat away from where it can escape to the atmosphere.',
  },
  cycleTrend: {
    title: 'Warming Trend',
    icon: '📈',
    why: 'A trendline across many dive cycles filters out daily and seasonal noise, revealing the underlying direction of change.',
    learn: 'Even a slope of +0.004°C per cycle compounds: across hundreds of cycles and millions of floats, that\'s the observable signal of global warming.',
    climate: 'Global sea surface temperature has risen ~1.5°C since 1880. That trendline is the most-cited piece of evidence in climate science.',
  },
  salinityProfile: {
    title: 'Salinity Profile',
    icon: '💧',
    why: 'Salinity increases with depth because denser (saltier) water sinks. This vertical structure is what powers the global overturning circulation.',
    learn: 'When the profile flattens or inverts, something is disrupting the density gradient — often freshwater intrusion from melting ice.',
    climate: 'A weakening salinity gradient is one of the earliest warning signs of slowing deep-ocean circulation, which would reshape global climate.',
  },
  histogram: {
    title: 'Temperature Distribution',
    icon: '📊',
    why: 'A distribution tells you how frequently different temperatures actually occur — not just the average.',
    learn: 'The spread (standard deviation) shows variability. A shift in the mean is warming; a wider spread means more extremes in both directions.',
    climate: 'Climate change doesn\'t just raise averages — it fattens the tails, making previously-rare heatwaves commonplace.',
  },
  anomaly: {
    title: 'Anomaly',
    icon: '⚡',
    why: 'An anomaly is how far the current reading is from the historical baseline. It\'s the core unit of climate monitoring.',
    learn: 'Small persistent anomalies compound into trends. Large sudden ones are marine heatwaves or cold snaps.',
    climate: 'Climate scientists track anomalies rather than absolute temperatures because they remove seasonal noise and expose the real signal.',
  },
  tippingPoint: {
    title: 'Tipping Point',
    icon: '💀',
    why: 'A tipping point is a threshold beyond which an ecosystem can\'t recover on human timescales. Think coral death, circulation collapse, or ice sheet loss.',
    learn: 'Tipping points are often invisible until they\'re crossed. That\'s why scientists model them — so we don\'t find them by accident.',
    climate: 'The IPCC has identified 16 known climate tipping points. Several (coral, Arctic ice) are already very close or crossed.',
  },
  residents: {
    title: 'Ecosystem Residents',
    icon: '🐠',
    why: 'Species distribution is the most visible sign of ocean change. When creatures move, something has made their home uninhabitable.',
    learn: 'Tropical fish now appear off Alaska. Squid are expanding into polar seas. Every species is essentially a living thermometer.',
    climate: 'Marine species are moving poleward at an average rate of 72 km per decade — faster than land species — because water moves heat quickly.',
  },
};

// ============ TEACHER CONTENT (pedagogical notes per plot / feature) ============
const TEACHER_CONTENT = {
  thermocline: {
    title: 'The Thermocline Profile',
    gradeLevel: 'Grades 6–12 · Earth Science, Biology, Physics',
    duration: '15–30 min',
    whyTeach: 'This chart is the single best intro to ocean physics. It makes an abstract concept (vertical temperature structure) immediately visual and intuitive.',
    keyConcepts: [
      'Density-driven stratification',
      'Solar absorption and depth',
      'Why most marine life lives in the top 200m',
      'How heat is trapped in upper layers',
    ],
    howToExplain: 'Start with a simple analogy: "Imagine a swimming pool where the top is warm from the sun and the bottom is cold. The ocean works the same way — but on a massive scale." Then show the chart. Point to the steep drop between 100–300m and call it "the wall." Ask students: why does life cluster above this wall?',
    discussionQuestions: [
      'Why does the curve bend so sharply between 100m and 300m?',
      'What would happen to marine life if that wall moved up 50m? Down 50m?',
      'How does the thermocline relate to why hurricanes weaken over cold water?',
    ],
    climateConnection: 'As the surface warms, the thermocline deepens AND sharpens. This traps heat in the surface layer (worsening marine heatwaves) and reduces nutrient mixing from below (starving surface ecosystems). Students can literally see the consequence of warming in one graph.',
    activity: 'Have students predict where the thermocline will be in 2050 if surface warming continues at current rates. Compare their predictions to published IPCC projections.',
  },
  cycleTrend: {
    title: 'Cycle-by-Cycle Warming Trend',
    gradeLevel: 'Grades 7–12 · Statistics, Environmental Science',
    duration: '20–40 min',
    whyTeach: 'This chart teaches one of the most important skills in science: distinguishing signal from noise. Individual cycles are noisy, but the trendline reveals the underlying pattern.',
    keyConcepts: [
      'Linear regression and trend analysis',
      'Signal vs. noise',
      'How climate scientists detect warming',
      'Why averaging matters in data science',
    ],
    howToExplain: 'Ask students to trace the orange dots with their finger. "Is it going up or down? It\'s hard to tell from day to day — but over many cycles, the dashed line emerges." Introduce the idea that a single data point can lie, but a trend cannot.',
    discussionQuestions: [
      'Why can\'t we tell if the ocean is warming from just one reading?',
      'If the slope is +0.0042°C per cycle, what does that mean over 1,000 cycles?',
      'Why do climate deniers often cherry-pick single cold years? What does this chart teach us about that tactic?',
    ],
    climateConnection: 'This is the chart climate scientists build their careers on. Small per-year warming (~0.02°C/year globally) looks trivial but compounds to multiple degrees over a century — enough to reshape the planet. Students see firsthand why "it was cold last week" is not evidence against climate change.',
    activity: 'Give students a printed version with the trendline removed. Have them draw their own best-fit line. Then reveal the computed slope and discuss how their eyeball estimate compares.',
  },
  salinityProfile: {
    title: 'Salinity vs. Depth Profile',
    gradeLevel: 'Grades 8–12 · Chemistry, Oceanography',
    duration: '15–25 min',
    whyTeach: 'Salinity is often overlooked but drives the global ocean conveyor belt. Without this chart, students can\'t understand why melting ice is a circulation problem, not just a sea-level problem.',
    keyConcepts: [
      'Density gradients in fluids',
      'Thermohaline circulation',
      'Why saltier water sinks',
      'The global ocean conveyor',
    ],
    howToExplain: 'Use a kitchen demo before showing the chart: float fresh water dyed one color on top of salt water dyed another. The layers don\'t mix. Then show students how the ocean does this on a planetary scale. The chart shows it: surface is fresh, deep is salty.',
    discussionQuestions: [
      'Why does salinity increase with depth?',
      'If Greenland\'s ice cap melted, where on this chart would the change appear first?',
      'How does this profile connect to weather in Europe?',
    ],
    climateConnection: 'Melting polar ice is freshening the North Atlantic surface, weakening the AMOC (the current that warms Europe). A shutdown would cool Europe dramatically even as the rest of the planet warms — a paradox students find fascinating and scary.',
    activity: 'Have students research one ocean current (Gulf Stream, Kuroshio, Antarctic Circumpolar) and report how it would change if surface salinity dropped by 1 PSU.',
  },
  histogram: {
    title: 'Zone Temperature Distribution',
    gradeLevel: 'Grades 9–12 · Statistics, Data Science',
    duration: '20–30 min',
    whyTeach: 'Distributions teach students that averages hide the story. A 1°C shift in the mean doubles the frequency of extreme heat events — but only the histogram reveals that.',
    keyConcepts: [
      'Normal distribution',
      'Standard deviation and variability',
      'Percentile rank',
      'How means mislead without context',
    ],
    howToExplain: 'Show students the shape. Ask: "Where would the coldest 10% of readings be? The warmest 10%?" Then drag the slider to show how their input compares to thousands of real readings. The percentile readout is the "aha" moment.',
    discussionQuestions: [
      'If the mean goes up by 1°C but the shape stays the same, what happens to the top 5% of readings?',
      'Is a single hot day climate change? Is a shifted distribution?',
      'Why do scientists care about the tails of the distribution?',
    ],
    climateConnection: 'Climate change shifts the mean AND fattens the tails. Events that used to happen once a century (marine heatwaves, coral-killing temperatures) become annual. This chart makes that statistical reality visible.',
    activity: 'Give each student a different zone. Have them identify the "1-in-100-year" temperature based on the distribution. Then discuss how that threshold changes under +2°C warming.',
  },
  stressBars: {
    title: 'Historical Stress Level Bars',
    gradeLevel: 'Grades 5–10 · Earth Science, Data Literacy',
    duration: '10–20 min',
    whyTeach: 'These simple bars communicate ecosystem health in a way numbers can\'t. Students immediately grasp "this zone is mostly happy" vs "this zone is stressed."',
    keyConcepts: [
      'Categorical vs. continuous data',
      'Ecosystem baselines',
      'Stress indicators',
      'Visual data communication',
    ],
    howToExplain: 'Point to the green bar. "This is how often Nori is comfortable here." Then the orange. "This is how often she\'s too hot." Ask students what they\'d expect these numbers to look like in a healthy vs. unhealthy ocean.',
    discussionQuestions: [
      'Which zone has the most stable conditions? Why?',
      'If the orange bar doubled over 20 years, what would that mean?',
      'How would you explain these bars to a third-grader?',
    ],
    climateConnection: 'Oceanographers track this exact metric across regions and decades. Warming bars (orange) are growing in nearly every ocean basin. Students can imagine themselves as scientists watching this change.',
    activity: 'Have students design what these bars would look like in 2100 under "business as usual" vs. "aggressive climate action" scenarios. Compare with published projections.',
  },
  moodAvatar: {
    title: 'Nori\'s Mood Simulator',
    gradeLevel: 'Grades 3–8 · Introductory Science, Empathy-Based Learning',
    duration: '10–15 min',
    whyTeach: 'Anthropomorphizing data is controversial in science — but it\'s how children first learn to care. Nori gives students an emotional stake in an abstract topic.',
    keyConcepts: [
      'Cause and effect',
      'Ecosystem sensitivity',
      'Temperature tolerance ranges',
      'Climate empathy',
    ],
    howToExplain: 'Let students drag the slider freely. Don\'t explain first — let them discover that Nori changes. Then ask: "What made her sweat? What made her shiver?" Build the science vocabulary after the intuition is in place.',
    discussionQuestions: [
      'Why does Nori have a "comfort zone" instead of one perfect temperature?',
      'Do real ocean creatures have comfort zones like this? Can you name some?',
      'What do you think happens to fish when the water is outside their comfort zone?',
    ],
    climateConnection: 'Every marine species has a temperature window. Climate change is pushing water outside those windows faster than species can adapt or migrate. Nori\'s mood represents, in a simplified way, the lived experience of millions of ocean creatures.',
    activity: 'Have younger students draw their own "Nori" for a land animal (polar bear, frog, bee) and define that animal\'s comfort zone. Discuss what happens when climate pushes conditions outside it.',
  },
  tippingPoint: {
    title: 'Tipping Point Threshold',
    gradeLevel: 'Grades 8–12 · Systems Science, Ethics',
    duration: '25–45 min',
    whyTeach: 'Tipping points are the scariest and most misunderstood concept in climate science. This feature lets students experience one — feel the moment recovery stops being possible.',
    keyConcepts: [
      'Nonlinear systems',
      'Hysteresis (why reversals don\'t just run backward)',
      'Irreversibility on human timescales',
      'Precautionary principle',
    ],
    howToExplain: 'Have students slowly raise the slider toward the red line. The shift from "Nori looks uncomfortable" to "💀" is jarring on purpose. Explain: nature actually works like this. Coral reefs don\'t gradually degrade — they collapse.',
    discussionQuestions: [
      'Why don\'t tipping points reverse when you lower the slider back down?',
      'Can you name other tipping points in nature? In society?',
      'How should we act in the presence of tipping points we might not see coming?',
    ],
    climateConnection: 'The IPCC identifies 16 known climate tipping points. 9 are considered "more likely than not" by 2100 under current emissions. Once crossed, the Greenland ice sheet loss is irreversible for ~10,000 years. This visualization makes that abstract horror viscerally clear.',
    activity: 'Research project: each student picks one known climate tipping point (Amazon dieback, AMOC shutdown, West Antarctic ice sheet, etc.) and presents how close we are, what the consequences would be, and what would prevent it.',
  },
};

// ============ COLOR UTILS ============
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
function lerpColor(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

// ============ CUSTOMIZATION ============
const HAT_OPTIONS = [
  { id: 'none', name: 'None' }, { id: 'captain', name: 'Captain' },
  { id: 'party', name: 'Party' }, { id: 'beanie', name: 'Beanie' },
  { id: 'crown', name: 'Crown' }, { id: 'snorkel', name: 'Snorkel' },
];
const ACCESSORY_OPTIONS = [
  { id: 'none', name: 'None' }, { id: 'glasses', name: 'Glasses' },
  { id: 'shades', name: 'Shades' }, { id: 'scarf', name: 'Scarf' },
  { id: 'bowtie', name: 'Bowtie' }, { id: 'flowers', name: 'Flowers' },
];
const BODY_COLORS = [
  { id: 'ocean', name: 'Ocean', color: '#4FA3E8', dark: '#1A5FA8', accent: '#7FC4ED' },
  { id: 'coral', name: 'Coral', color: '#FF8A70', dark: '#B04530', accent: '#FFB5A0' },
  { id: 'mint', name: 'Mint', color: '#5FD4A0', dark: '#1F7F5C', accent: '#8FE8C2' },
  { id: 'lavender', name: 'Lavender', color: '#B294E8', dark: '#6B4FA8', accent: '#D4C2F0' },
  { id: 'sunshine', name: 'Sunshine', color: '#FFC947', dark: '#B07A00', accent: '#FFE089' },
  { id: 'bubblegum', name: 'Bubblegum', color: '#FF94C2', dark: '#B04580', accent: '#FFB5D4' },
];

// ============ OCEAN BACKDROP ============
function OceanBackdrop({ zoneTransition }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(v => v + 1), 70);
    return () => clearInterval(id);
  }, []);

  const getZoneColor = (key) => {
    const zones = ZONE_ORDER.map(id => ZONE_CONFIG[id][key]);
    const clamped = Math.max(0, Math.min(2, zoneTransition));
    const lower = Math.floor(clamped);
    const upper = Math.min(2, lower + 1);
    const local = clamped - lower;
    return lerpColor(zones[lower], zones[upper], local);
  };

  const skyTop = getZoneColor('skyTop');
  const skyMid = getZoneColor('skyMid');
  const skyBottom = getZoneColor('skyBottom');
  const depthFactor = zoneTransition / 2;
  const lightIntensity = Math.max(0, 1 - depthFactor * 1.2);
  const particleCount = Math.round(25 - depthFactor * 15);

  return (
    <svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 'inherit' }}>
      <defs>
        <linearGradient id="oceanDepth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="50%" stopColor={skyMid} />
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>
        <radialGradient id="surfaceLight" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#FFF4C9" stopOpacity={0.35 * lightIntensity} />
          <stop offset="60%" stopColor="#FFF4C9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="600" fill="url(#oceanDepth)" />
      <rect width="400" height="600" fill="url(#surfaceLight)" />
      {lightIntensity > 0.1 && [0, 1, 2, 3, 4].map(i => {
        const x = (i * 85 + Math.sin(t * 0.02 + i) * 25) % 400;
        return <polygon key={i}
          points={`${x},0 ${x+3},0 ${x+50+Math.sin(t*0.03+i)*20},600 ${x+35+Math.sin(t*0.03+i)*20},600`}
          fill="#FFFFFF" opacity={0.06 * lightIntensity} />;
      })}
      {Array.from({ length: particleCount }).map((_, i) => {
        const seed = i * 37;
        const x = (seed * 13 + t * 0.3) % 400;
        const y = (seed * 7 + t * 0.5 + Math.sin(t * 0.02 + i) * 30) % 600;
        const size = 1 + (i % 3) * 0.8;
        return <circle key={i} cx={x} cy={y} r={size} fill="#FFFFFF" opacity={(0.15 + (i % 3) * 0.08) * (0.4 + lightIntensity * 0.6)} />;
      })}
      {[0, 1, 2].map(col => (
        Array.from({ length: 4 }).map((_, i) => {
          const by = (600 - ((t * 2 + i * 120 + col * 40) % 700));
          const bx = 60 + col * 140 + Math.sin((t + i * 20) * 0.03) * 15;
          return <circle key={`${col}-${i}`} cx={bx} cy={by} r={2 + (i % 3) * 1.5} fill="#E6F1FB" opacity={0.25 * (0.3 + lightIntensity * 0.7)} />;
        })
      ))}
      {depthFactor > 0.5 && Array.from({ length: 8 }).map((_, i) => {
        const seed = i * 53;
        const x = (seed * 19 + t * 0.1) % 400;
        const y = (seed * 11 + t * 0.2) % 600;
        const pulse = (Math.sin(t * 0.05 + i) + 1) / 2;
        return <circle key={`bio-${i}`} cx={x} cy={y} r={1.5 + pulse * 1} fill="#42E0B3" opacity={pulse * (depthFactor - 0.5) * 0.8} />;
      })}
    </svg>
  );
}

// ============ NORI AVATAR ============
function NoriAvatar({ moodState, size = 260, customization }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60);
    return () => clearInterval(id);
  }, []);

  const t = tick * 0.1;
  const { mood, intensity } = moodState;
  const { hat = 'none', accessory = 'none', bodyColor = 'ocean' } = customization || {};
  const baseColors = BODY_COLORS.find(c => c.id === bodyColor) || BODY_COLORS[0];

  let bobY = Math.sin(t) * 4;
  let rotate = Math.sin(t * 0.5) * 2;
  let eyeSquish = 1;
  let bodyFill = baseColors.color;
  let bodyDark = baseColors.dark;
  let bodyAccent = baseColors.accent;
  let mouthPath = 'M 135 178 Q 150 183 165 178';
  let blush = false;
  let sweatDrops = false;
  let shiverShake = 0;
  let steamRising = false;
  let iceCrystals = false;
  let xEyes = false;

  if (mood === 'happy') {
    bobY = Math.sin(t * 1.3) * 5;
    rotate = Math.sin(t) * 4;
    mouthPath = 'M 128 172 Q 150 192 172 172';
    blush = true;
  } else if (mood === 'warm') {
    bobY = Math.sin(t * 2.2) * 6;
    rotate = Math.sin(t * 1.5) * 5;
    const warmth = Math.min(1, intensity * 1.5);
    bodyFill = lerpColor(baseColors.color, '#FF6B42', warmth);
    bodyAccent = lerpColor(baseColors.accent, '#FFB299', warmth);
    bodyDark = lerpColor(baseColors.dark, '#A03818', warmth);
    mouthPath = 'M 135 182 Q 150 175 165 182';
    sweatDrops = true;
    steamRising = warmth > 0.4;
    blush = true;
  } else if (mood === 'cold') {
    const cold = Math.min(1, intensity * 1.5);
    shiverShake = cold * 2;
    bobY = Math.sin(t * 0.5) * 2;
    bodyFill = lerpColor(baseColors.color, '#A8D4F0', cold);
    bodyAccent = lerpColor(baseColors.accent, '#D4E8F5', cold);
    bodyDark = lerpColor(baseColors.dark, '#6B8FB5', cold);
    eyeSquish = 0.7;
    mouthPath = `M 138 180 Q 150 ${180 + Math.sin(t * 8) * 1.5} 162 180`;
    iceCrystals = cold > 0.5;
  } else if (mood === 'tipping') {
    bobY = Math.sin(t * 4) * 8;
    rotate = Math.sin(t * 3) * 12;
    bodyFill = '#8B0000';
    bodyAccent = '#B22222';
    bodyDark = '#4A0000';
    mouthPath = 'M 135 185 Q 150 175 165 185';
    shiverShake = 3;
    steamRising = true;
    xEyes = true;
  }

  const shakeX = shiverShake > 0 ? Math.sin(t * 15) * shiverShake : 0;

  return (
    <svg viewBox="0 0 300 340" width={size} height={size * 340 / 300} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id={`bodyMain-${bodyColor}-${mood}`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={bodyAccent} />
          <stop offset="60%" stopColor={bodyFill} />
          <stop offset="100%" stopColor={bodyDark} />
        </radialGradient>
        <radialGradient id={`bodyTop-${bodyColor}-${mood}`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor={bodyAccent} />
          <stop offset="100%" stopColor={bodyDark} />
        </radialGradient>
        <radialGradient id="eyeGrad" cx="30%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F0F4F8" />
          <stop offset="100%" stopColor="#D8DFE6" />
        </radialGradient>
        <radialGradient id="happyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE9A8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFD770" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dangerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF3B30" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FF3B30" stopOpacity="0" />
        </radialGradient>
      </defs>

      {mood === 'happy' && (
        <ellipse cx="150" cy="180" rx="125" ry="135" fill="url(#happyGlow)">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
        </ellipse>
      )}
      {mood === 'tipping' && (
        <ellipse cx="150" cy="180" rx="130" ry="140" fill="url(#dangerGlow)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="0.8s" repeatCount="indefinite" />
        </ellipse>
      )}

      {mood === 'happy' && [0, 1, 2, 3, 4].map(i => {
        const px = 150 + Math.cos(t * 0.8 + i * 1.25) * (75 + i * 6);
        const py = 175 + Math.sin(t * 0.6 + i * 1.25) * (65 + i * 5);
        const scale = 0.4 + (Math.sin(t * 2 + i) + 1) / 3;
        return <g key={`spark-${i}`} transform={`translate(${px} ${py}) scale(${scale}) rotate(${t * 30 + i * 60})`}>
          <path d="M 0 -7 L 2 -2 L 7 0 L 2 2 L 0 7 L -2 2 L -7 0 L -2 -2 Z" fill="#FFD770" opacity="0.9" />
        </g>;
      })}

      {steamRising && [0, 1, 2].map(i => {
        const off = (t * 1.2 + i * 2) % 6;
        const opacity = Math.max(0, 0.6 - off / 6);
        const y = 80 - off * 10;
        const x = 130 + i * 20 + Math.sin(t * 2 + i) * 5;
        return <path key={`steam-${i}`} d={`M ${x} ${y} Q ${x+4} ${y-5} ${x} ${y-10} T ${x} ${y-20}`}
          stroke={mood === 'tipping' ? '#FF6B42' : '#FFD4B0'} strokeWidth="3" fill="none" strokeLinecap="round" opacity={opacity} />;
      })}

      {iceCrystals && [0, 1, 2, 3, 4, 5].map(i => {
        const seed = i * 31;
        const px = 100 + (seed % 120);
        const py = 100 + ((t * 8 + seed * 2) % 220);
        const sz = 3 + (i % 3);
        return <g key={`ice-${i}`} transform={`translate(${px} ${py}) rotate(${t * 20 + i * 60})`} opacity="0.85">
          <line x1="0" y1={-sz} x2="0" y2={sz} stroke="#CEEEFF" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={-sz} y1="0" x2={sz} y2="0" stroke="#CEEEFF" strokeWidth="1.5" strokeLinecap="round" />
        </g>;
      })}

      <ellipse cx={150 + shakeX} cy="295" rx="45" ry="6" fill="#000000" opacity="0.2" />

      <g transform={`translate(${150 + shakeX} ${175 + bobY}) rotate(${rotate})`}>
        {hat === 'none' && (
          <>
            <line x1="0" y1="-72" x2="0" y2="-95" stroke={bodyDark} strokeWidth="3" strokeLinecap="round" />
            <circle cx="0" cy="-98" r="5" fill={mood === 'tipping' ? '#FF3B30' : '#FFD770'} />
            <circle cx="0" cy="-98" r="3" fill="#FFF4C9">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={mood === 'tipping' ? '0.5s' : '1.5s'} repeatCount="indefinite" />
            </circle>
          </>
        )}

        <ellipse cx="0" cy="-58" rx="44" ry="16" fill={`url(#bodyTop-${bodyColor}-${mood})`} />
        <path d="M -44 -58 L -44 42 Q -44 52 -38 56 L 38 56 Q 44 52 44 42 L 44 -58 Z" fill={`url(#bodyMain-${bodyColor}-${mood})`} />
        <path d="M -36 -50 Q -40 -10 -36 30 L -28 30 Q -32 -10 -28 -50 Z" fill="#FFFFFF" opacity="0.25" />
        <path d="M -20 -50 Q -22 -20 -20 10 L -17 10 Q -19 -20 -17 -50 Z" fill="#FFFFFF" opacity="0.12" />

        <ellipse cx="0" cy="44" rx="42" ry="14" fill={bodyDark} />
        <ellipse cx="0" cy="43" rx="38" ry="10" fill={bodyFill} opacity="0.6" />

        <rect x="-44" y="-22" width="88" height="3" fill={bodyDark} opacity="0.45" />
        <rect x="-44" y="12" width="88" height="3" fill={bodyDark} opacity="0.45" />

        {accessory === 'scarf' && (
          <g>
            <path d="M -38 -35 Q -40 -25 -38 -18 L 38 -18 Q 40 -25 38 -35 Z" fill="#E24B4A" />
            <path d="M 28 -18 L 32 -5 L 38 -18 Z" fill="#A32D2D" />
          </g>
        )}

        {/* X eyes for tipping point */}
        {xEyes ? (
          <g stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round">
            <line x1="-22" y1="-18" x2="-10" y2="-6" />
            <line x1="-10" y1="-18" x2="-22" y2="-6" />
            <line x1="10" y1="-18" x2="22" y2="-6" />
            <line x1="22" y1="-18" x2="10" y2="-6" />
          </g>
        ) : (
          <>
            <ellipse cx="-16" cy="-12" rx="10" ry={10 * eyeSquish} fill="url(#eyeGrad)" />
            <ellipse cx="16" cy="-12" rx="10" ry={10 * eyeSquish} fill="url(#eyeGrad)" />
            {eyeSquish > 0.4 && <>
              <circle cx={-16 + Math.sin(t * 0.4) * 2.5} cy={-12 + Math.cos(t * 0.4) * 2} r="5" fill="#0A1628" />
              <circle cx={16 + Math.sin(t * 0.4) * 2.5} cy={-12 + Math.cos(t * 0.4) * 2} r="5" fill="#0A1628" />
              <circle cx={-13.5 + Math.sin(t * 0.4) * 2.5} cy={-14 + Math.cos(t * 0.4) * 2} r="2" fill="#FFFFFF" />
              <circle cx={18.5 + Math.sin(t * 0.4) * 2.5} cy={-14 + Math.cos(t * 0.4) * 2} r="2" fill="#FFFFFF" />
            </>}
          </>
        )}

        {accessory === 'glasses' && !xEyes && (
          <g fill="none" stroke="#0A1628" strokeWidth="1.5">
            <circle cx="-16" cy="-12" r="12" />
            <circle cx="16" cy="-12" r="12" />
            <line x1="-4" y1="-12" x2="4" y2="-12" />
          </g>
        )}
        {accessory === 'shades' && !xEyes && (
          <g>
            <ellipse cx="-16" cy="-12" rx="12" ry="9" fill="#0A1628" />
            <ellipse cx="16" cy="-12" rx="12" ry="9" fill="#0A1628" />
            <rect x="-4" y="-13" width="8" height="2" fill="#0A1628" />
            <ellipse cx="-19" cy="-15" rx="4" ry="2" fill="#FFFFFF" opacity="0.3" />
            <ellipse cx="13" cy="-15" rx="4" ry="2" fill="#FFFFFF" opacity="0.3" />
          </g>
        )}

        {blush && <>
          <ellipse cx="-27" cy="4" rx="7" ry="4" fill={mood === 'warm' ? '#FF6B42' : '#FF8FB5'} opacity="0.65" />
          <ellipse cx="27" cy="4" rx="7" ry="4" fill={mood === 'warm' ? '#FF6B42' : '#FF8FB5'} opacity="0.65" />
        </>}

        <path d={mouthPath} stroke="#0A1628" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {accessory === 'bowtie' && (
          <g transform="translate(0 28)">
            <path d="M -14 -6 L -4 0 L -14 6 Z" fill="#E24B4A" />
            <path d="M 14 -6 L 4 0 L 14 6 Z" fill="#E24B4A" />
            <rect x="-4" y="-4" width="8" height="8" rx="1" fill="#A32D2D" />
          </g>
        )}
        {accessory === 'flowers' && (
          <g transform="translate(-30 -50)">
            {[0, 1, 2].map(i => {
              const angle = i * 72;
              return <circle key={i} cx={Math.cos(angle * Math.PI / 180) * 4} cy={Math.sin(angle * Math.PI / 180) * 4} r="3.5" fill={['#FF94C2', '#FFC947', '#B294E8'][i]} />;
            })}
            <circle r="2" fill="#FFE089" />
          </g>
        )}

        {sweatDrops && [0, 1].map(i => {
          const dropY = -20 + ((t * 12 + i * 30) % 40);
          const dropX = i === 0 ? -35 : 35;
          return <path key={`drop-${i}`} d={`M ${dropX} ${dropY - 4} Q ${dropX - 3} ${dropY} ${dropX} ${dropY + 4} Q ${dropX + 3} ${dropY} ${dropX} ${dropY - 4} Z`} fill="#6BB6E8" opacity="0.9" />;
        })}

        <g transform={`rotate(${Math.sin(t * 1.8) * 18} -48 12)`}>
          <ellipse cx="-50" cy="12" rx="12" ry="20" fill={bodyDark} />
          <ellipse cx="-50" cy="12" rx="8" ry="16" fill={bodyFill} opacity="0.7" />
        </g>
        <g transform={`rotate(${-Math.sin(t * 1.8) * 18} 48 12)`}>
          <ellipse cx="50" cy="12" rx="12" ry="20" fill={bodyDark} />
          <ellipse cx="50" cy="12" rx="8" ry="16" fill={bodyFill} opacity="0.7" />
        </g>

        {hat === 'captain' && (
          <g transform="translate(0 -70)">
            <rect x="-40" y="-2" width="80" height="5" fill="#1A1B3D" />
            <path d="M -36 -2 Q -36 -22 0 -22 Q 36 -22 36 -2 Z" fill="#0A1628" />
            <circle r="6" cy="-14" fill="#FFD770" />
          </g>
        )}
        {hat === 'party' && (
          <g transform="translate(0 -70)">
            <path d="M -15 0 L 15 0 L 0 -30 Z" fill="#FF94C2" />
            <circle cx="0" cy="-30" r="4" fill="#FFD770" />
            <circle cx="-8" cy="-12" r="1.5" fill="#FFFFFF" />
            <circle cx="6" cy="-20" r="1.5" fill="#FFE089" />
          </g>
        )}
        {hat === 'beanie' && (
          <g transform="translate(0 -70)">
            <path d="M -34 0 Q -34 -24 0 -24 Q 34 -24 34 0 Z" fill="#E24B4A" />
            <rect x="-34" y="-2" width="68" height="6" fill="#A32D2D" />
            <circle cx="0" cy="-28" r="6" fill="#F5F5F0" />
          </g>
        )}
        {hat === 'crown' && (
          <g transform="translate(0 -70)">
            <path d="M -30 0 L -30 -10 L -20 -4 L -10 -16 L 0 -6 L 10 -16 L 20 -4 L 30 -10 L 30 0 Z" fill="#FFD770" stroke="#B07A00" strokeWidth="1" />
            <circle cx="-20" cy="-8" r="2" fill="#E24B4A" />
            <circle cx="0" cy="-10" r="2" fill="#42E0B3" />
            <circle cx="20" cy="-8" r="2" fill="#B294E8" />
          </g>
        )}
        {hat === 'snorkel' && (
          <g transform="translate(0 -70)">
            <ellipse cx="0" cy="0" rx="36" ry="8" fill="#42E0B3" opacity="0.4" stroke="#1F7F5C" strokeWidth="1" />
            <rect x="28" y="-20" width="5" height="22" fill="#FF8A5C" />
          </g>
        )}
      </g>
    </svg>
  );
}

// ============ EDA CHARTS ============
function ThermoclineChart({ highlightDepth }) {
  const W = 340, H = 260, padL = 40, padR = 20, padT = 20, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xScale = (temp) => padL + (temp / 20) * plotW;
  const yScale = (depth) => padT + (depth / 2000) * plotH;
  const meanPath = THERMOCLINE_PROFILE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.mean)} ${yScale(p.depth)}`).join(' ');
  const stdAreaPath = THERMOCLINE_PROFILE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.mean - p.std)} ${yScale(p.depth)}`).join(' ') +
    ' ' + [...THERMOCLINE_PROFILE].reverse().map(p => `L ${xScale(p.mean + p.std)} ${yScale(p.depth)}`).join(' ') + ' Z';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      <rect x={padL} y={yScale(0)} width={plotW} height={yScale(200) - yScale(0)} fill="#FFD770" opacity="0.08" />
      <rect x={padL} y={yScale(200)} width={plotW} height={yScale(1000) - yScale(200)} fill="#9B8EF0" opacity="0.1" />
      <rect x={padL} y={yScale(1000)} width={plotW} height={yScale(2000) - yScale(1000)} fill="#0A1628" opacity="0.3" />
      <text x={padL + 4} y={yScale(100) + 3} fontSize="9" fill="rgba(255,255,255,0.7)" fontWeight="500">SUNLIGHT</text>
      <text x={padL + 4} y={yScale(550) + 3} fontSize="9" fill="rgba(255,255,255,0.7)" fontWeight="500">TWILIGHT</text>
      <text x={padL + 4} y={yScale(1500) + 3} fontSize="9" fill="rgba(255,255,255,0.7)" fontWeight="500">MIDNIGHT</text>
      {[0, 5, 10, 15, 20].map(t => (
        <g key={t}>
          <line x1={xScale(t)} y1={padT} x2={xScale(t)} y2={padT + plotH} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 3" />
          <text x={xScale(t)} y={H - 12} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)">{t}°</text>
        </g>
      ))}
      {[0, 500, 1000, 1500, 2000].map(d => (
        <text key={d} x={padL - 5} y={yScale(d) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.6)">{d}m</text>
      ))}
      <path d={stdAreaPath} fill="#5FB3F0" opacity="0.25" />
      <path d={meanPath} fill="none" stroke="#5FB3F0" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={xScale(9.4)} cy={yScale(200)} r="4" fill="#FF8A5C" />
      <text x={xScale(16)} y={yScale(400) - 4} fontSize="9" fill="#FF8A5C" fontWeight="500">THERMOCLINE</text>
      {highlightDepth != null && (
        <g>
          <line x1={padL} y1={yScale(highlightDepth)} x2={padL + plotW} y2={yScale(highlightDepth)}
            stroke="#FFD770" strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx={xScale(THERMOCLINE_PROFILE.reduce((acc, p) => Math.abs(p.depth - highlightDepth) < Math.abs(acc.depth - highlightDepth) ? p : acc).mean)}
            cy={yScale(highlightDepth)} r="5" fill="#FFD770" stroke="#FFFFFF" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

function CycleTrendChart() {
  const W = 340, H = 170, padL = 40, padR = 20, padT = 20, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xScale = (c) => padL + (c / 170) * plotW;
  const yScale = (t) => padT + (1 - (t - 12) / 5) * plotH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {[12, 14, 16].map(t => (
        <g key={t}>
          <line x1={padL} y1={yScale(t)} x2={padL + plotW} y2={yScale(t)} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 3" />
          <text x={padL - 5} y={yScale(t) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.6)">{t}°</text>
        </g>
      ))}
      <line x1={padL} y1={yScale(14.8)} x2={padL + plotW} y2={yScale(14.8)} stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
      {CYCLE_TREND.map((p, i) => (
        <circle key={i} cx={xScale(p.cycle)} cy={yScale(p.temp)} r="2.5" fill="#FFAB42" opacity="0.7" />
      ))}
      <line x1={xScale(0)} y1={yScale(14.6)} x2={xScale(170)} y2={yScale(14.6 + TREND_SLOPE * 170)}
        stroke="#FF6B42" strokeWidth="2" strokeDasharray="4 2" />
      <text x={xScale(165)} y={yScale(14.6 + TREND_SLOPE * 170) - 6} textAnchor="end" fontSize="10" fill="#FF6B42" fontWeight="500">+{TREND_SLOPE}°/cycle</text>
    </svg>
  );
}

function SalinityChart() {
  const W = 340, H = 180, padL = 40, padR = 20, padT = 20, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xScale = (s) => padL + ((s - 33) / 2) * plotW;
  const yScale = (d) => padT + (d / 2000) * plotH;
  const path = SALINITY_PROFILE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.sal)} ${yScale(p.depth)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      <rect x={padL} y={yScale(0)} width={plotW} height={yScale(200)} fill="#FFD770" opacity="0.08" />
      <rect x={padL} y={yScale(200)} width={plotW} height={yScale(1000) - yScale(200)} fill="#9B8EF0" opacity="0.1" />
      <rect x={padL} y={yScale(1000)} width={plotW} height={yScale(2000) - yScale(1000)} fill="#0A1628" opacity="0.3" />
      {[33, 34, 35].map(s => (
        <text key={s} x={xScale(s)} y={H - 12} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)">{s}</text>
      ))}
      {[0, 1000, 2000].map(d => (
        <text key={d} x={padL - 5} y={yScale(d) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.6)">{d}m</text>
      ))}
      <path d={path} fill="none" stroke="#42E0B3" strokeWidth="2.5" strokeLinecap="round" />
      {SALINITY_PROFILE.map((p, i) => (
        <circle key={i} cx={xScale(p.sal)} cy={yScale(p.depth)} r="3" fill="#42E0B3" />
      ))}
    </svg>
  );
}

// Histogram of temp distribution for current zone, with live cursor
function ZoneHistogramChart({ zoneId, currentTemp }) {
  const cfg = ZONE_CONFIG[zoneId];
  const hist = useMemo(() => generateHistogram(cfg), [zoneId]);
  const maxY = Math.max(...hist.map(p => p.y));
  const W = 340, H = 160, padL = 30, padR = 15, padT = 15, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xScale = (v) => padL + ((v - cfg.sliderMin) / (cfg.sliderMax - cfg.sliderMin)) * plotW;
  const yScale = (v) => padT + (1 - v / maxY) * plotH;

  // Percentile rank
  const pctRank = Math.round(hist.reduce((sum, p, i) => sum + (p.x < currentTemp ? hist[i].y : 0), 0) / hist.reduce((s, p) => s + p.y, 0) * 100);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {/* Comfort zone band */}
        <rect
          x={xScale(cfg.baseline - cfg.tolerance)} y={padT}
          width={xScale(cfg.baseline + cfg.tolerance) - xScale(cfg.baseline - cfg.tolerance)}
          height={plotH}
          fill="#2FE09F" opacity="0.15"
        />
        {/* Histogram bars */}
        {hist.map((p, i) => {
          const barW = plotW / hist.length - 1;
          const barH = plotH - (yScale(p.y) - padT);
          return <rect key={i} x={xScale(p.x) - barW / 2} y={yScale(p.y)} width={barW} height={barH} fill={cfg.accentLight} opacity="0.7" />;
        })}
        {/* Baseline line */}
        <line x1={xScale(cfg.baseline)} y1={padT} x2={xScale(cfg.baseline)} y2={padT + plotH}
          stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
        {/* Tipping point */}
        <line x1={xScale(cfg.tippingPoint)} y1={padT} x2={xScale(cfg.tippingPoint)} y2={padT + plotH}
          stroke="#FF3B30" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.8" />
        <text x={xScale(cfg.tippingPoint)} y={padT - 3} fontSize="9" fill="#FF3B30" textAnchor="middle" fontWeight="600">⚠ tip</text>
        {/* Current temp marker */}
        <line x1={xScale(currentTemp)} y1={padT} x2={xScale(currentTemp)} y2={padT + plotH}
          stroke="#FFD770" strokeWidth="2" />
        <circle cx={xScale(currentTemp)} cy={padT + 4} r="4" fill="#FFD770" />
        {/* X axis labels */}
        {[cfg.sliderMin, (cfg.sliderMin + cfg.sliderMax) / 2, cfg.sliderMax].map((v, i) => (
          <text key={i} x={xScale(v)} y={H - 10} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)">{v.toFixed(1)}°</text>
        ))}
        <text x={W / 2} y={H - 1} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)">TEMPERATURE DISTRIBUTION</text>
      </svg>
      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Your temp is warmer than</span>
        <span style={{ color: '#FFD770', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{pctRank}% of readings</span>
      </div>
    </div>
  );
}

// NEW — Horizontal mood-frequency bar (historical stress), inspired by Streamlit version
function MoodFrequencyChart({ zoneId }) {
  const cfg = ZONE_CONFIG[zoneId];
  const rows = [
    { label: 'Happy',    pct: cfg.pctHappy, color: '#2FE09F' },
    { label: 'Too Warm', pct: cfg.pctWarm,  color: '#FF8A5C' },
    { label: 'Too Cold', pct: cfg.pctCold,  color: '#8ED4FF' },
  ];
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} style={{ marginBottom: i < 2 ? 9 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{r.label}</span>
            <span style={{ fontSize: 11, color: r.color, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{r.pct.toFixed(1)}%</span>
          </div>
          <div style={{ height: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 5, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ GLASS CARD ============
function Glass({ children, style, ...rest }) {
  return (
    <div {...rest} style={{
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      border: '0.5px solid rgba(255,255,255,0.18)',
      borderRadius: 'var(--border-radius-lg)',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ============ METRIC LABEL with tooltip ============
// Click (or hover) to reveal a popup explaining why this metric matters, what it reveals, and the climate link.
function MetricLabel({ metricKey, zoneId, children, style, iconSize = 10 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const info = METRIC_INFO[metricKey];
  if (!info) return <span style={style}>{children}</span>;

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [open]);

  const zoneNote = zoneId && info.zoneSpecific ? info.zoneSpecific[zoneId] : null;

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        style={{
          ...style,
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'help',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: style?.color || 'inherit',
          fontFamily: 'inherit',
          fontSize: style?.fontSize || 'inherit',
          fontWeight: style?.fontWeight || 'inherit',
          letterSpacing: style?.letterSpacing || 'inherit',
          textDecoration: open ? 'none' : 'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: 'rgba(255,215,112,0.5)',
          textUnderlineOffset: 2,
          transition: 'color 0.15s',
        }}
      >
        {children}
        <HelpCircle size={iconSize} style={{ opacity: 0.55, flexShrink: 0 }} />
      </button>

      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: 280,
            maxWidth: 'calc(100vw - 40px)',
            background: 'linear-gradient(135deg, rgba(15,25,45,0.98), rgba(10,22,40,0.98))',
            backdropFilter: 'blur(30px)',
            border: '0.5px solid rgba(255,215,112,0.4)',
            borderRadius: 'var(--border-radius-md)',
            padding: '13px 14px',
            zIndex: 100,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(255,215,112,0.15)',
            cursor: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 18 }}>{info.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#FFD770', letterSpacing: '0.3px' }}>{info.title}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, padding: 2, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex' }}
              aria-label="Close"
            >
              <X size={11} />
            </button>
          </div>

          <div style={{ marginBottom: 9 }}>
            <div style={{ fontSize: 9.5, color: '#FFD770', fontWeight: 600, letterSpacing: '1px', marginBottom: 3 }}>WHY IT MATTERS</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>{info.why}</div>
          </div>

          <div style={{ marginBottom: 9 }}>
            <div style={{ fontSize: 9.5, color: '#42E0B3', fontWeight: 600, letterSpacing: '1px', marginBottom: 3 }}>WHAT YOU CAN LEARN</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>{info.learn}</div>
          </div>

          {zoneNote && (
            <div style={{ marginBottom: 9, padding: '7px 9px', background: 'rgba(155,142,240,0.12)', border: '0.5px solid rgba(155,142,240,0.3)', borderRadius: 6 }}>
              <div style={{ fontSize: 9.5, color: '#B294E8', fontWeight: 600, letterSpacing: '1px', marginBottom: 3 }}>IN THIS ZONE</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>{zoneNote}</div>
            </div>
          )}

          <div style={{ padding: '8px 10px', background: 'linear-gradient(135deg, rgba(226,75,74,0.15), rgba(255,138,92,0.15))', border: '0.5px solid rgba(255,138,92,0.35)', borderRadius: 6 }}>
            <div style={{ fontSize: 9.5, color: '#FF8A5C', fontWeight: 600, letterSpacing: '1px', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Globe size={9} /> CLIMATE CONNECTION
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5 }}>{info.climate}</div>
          </div>
        </div>
      )}
    </span>
  );
}

// ============ MAIN APP ============
export default function NoriApp() {
  const [screen, setScreen] = useState('meet');
  const [meetStep, setMeetStep] = useState('name');
  const [noriName, setNoriName] = useState('');
  const [customization, setCustomization] = useState({ hat: 'none', accessory: 'none', bodyColor: 'ocean' });

  const [exploreTab, setExploreTab] = useState('play');
  const [activeZone, setActiveZone] = useState('sunlight');
  const [zoneTemps, setZoneTemps] = useState({
    sunlight: ZONE_CONFIG.sunlight.sliderDefault,
    twilight: ZONE_CONFIG.twilight.sliderDefault,
    midnight: ZONE_CONFIG.midnight.sliderDefault,
  });
  const [zoneSals, setZoneSals] = useState({
    sunlight: ZONE_CONFIG.sunlight.salBaseline,
    twilight: ZONE_CONFIG.twilight.salBaseline,
    midnight: ZONE_CONFIG.midnight.salBaseline,
  });
  const [visitedZones, setVisitedZones] = useState(new Set(['sunlight']));
  const [userRole, setUserRole] = useState('explorer'); // 'explorer' | 'teacher'

  const [zoneTransition, setZoneTransition] = useState(0);
  useEffect(() => {
    const target = ZONE_ORDER.indexOf(activeZone);
    const start = zoneTransition;
    const duration = 700;
    const startTime = performance.now();
    let raf;
    const animate = (now) => {
      const tv = Math.min(1, (now - startTime) / duration);
      const eased = tv < 0.5 ? 2 * tv * tv : -1 + (4 - 2 * tv) * tv;
      setZoneTransition(start + (target - start) * eased);
      if (tv < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [activeZone]);

  useEffect(() => {
    setVisitedZones(prev => new Set([...prev, activeZone]));
  }, [activeZone]);

  const zone = ZONE_CONFIG[activeZone];
  const currentTemp = zoneTemps[activeZone];
  const currentSal = zoneSals[activeZone];
  const moodState = useMemo(() => computeMood(currentTemp, activeZone), [currentTemp, activeZone]);
  const salSignal = useMemo(() => computeSalSignal(currentSal, activeZone), [currentSal, activeZone]);
  const moodInfo = moodState.mood === 'tipping' ? {
    emoji: '💀', color: '#E24B4A', bg: 'rgba(226,75,74,0.2)', border: 'rgba(226,75,74,0.5)',
    headline: 'TIPPING POINT CROSSED',
    consequence: `Beyond ${zone.tippingPoint.toFixed(1)}°C in this zone, recovery becomes nearly impossible on human timescales.`,
    risks: ['💀 Ecosystem collapse imminent', '⏳ Centuries to recover', '🌊 Cascading climate failures', '🚨 Global alarm signal'],
    climateLink: 'This is a tipping point — a threshold in Earth\'s climate system that cannot be easily undone.',
  } : ZONE_MOODS[activeZone][moodState.mood];

  const zoneDepth = activeZone === 'sunlight' ? 100 : activeZone === 'twilight' ? 600 : 1500;
  const backdropZone = screen === 'meet' ? 0 : screen === 'home' ? 0.3 : (exploreTab === 'play' ? zoneTransition : exploreTab === 'learn' ? 1 : exploreTab === 'risks' ? 0.8 : 0.3);

  // Percentile rank within zone
  const pctRank = Math.round(Math.min(100, Math.max(0, ((currentTemp - zone.sliderMin) / (zone.sliderMax - zone.sliderMin)) * 100)));

  // ==== SCREEN: MEET ====
  if (screen === 'meet') {
    return (
      <div style={{ padding: 0, fontFamily: 'var(--font-sans)', position: 'relative', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', minHeight: 720 }}>
        <h2 className="sr-only">Meet your Nori</h2>
        <OceanBackdrop zoneTransition={backdropZone} />

        <div style={{ position: 'relative', padding: '1.5rem 1.1rem', zIndex: 1 }}>
          {meetStep === 'name' && (
            <div style={{ textAlign: 'center', paddingTop: 20 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.25)', color: '#FFFFFF', borderRadius: 999, fontSize: 11, fontWeight: 500, marginBottom: 14, letterSpacing: '1px' }}>
                <Waves size={12} /> ARGO FLOAT {FLOAT_ID}
              </div>
              <h1 style={{ fontSize: 34, fontWeight: 500, color: '#FFFFFF', margin: '0 0 10px', lineHeight: 1.1, letterSpacing: '-0.5px', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
                Meet your <span style={{ fontStyle: 'italic', color: '#FFD770' }}>buddy</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, margin: '0 0 24px', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                A real autonomous robot drifting in the Pacific Ocean. She dives 2,000m deep every ten days — and she's about to be yours.
              </p>
              <div style={{ marginBottom: 24 }}>
                <NoriAvatar moodState={{ mood: 'happy', intensity: 0 }} size={230} customization={customization} />
              </div>

              {/* NEW — Powered by Real Ocean Data (from Streamlit landing) */}
              <div style={{ maxWidth: 420, margin: '0 auto 18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[
                  { icon: Database, label: 'READINGS', value: TOTAL_READINGS.toLocaleString() },
                  { icon: Activity, label: 'CYCLES', value: TOTAL_CYCLES },
                  { icon: Ruler,    label: 'MAX DEPTH', value: '2000m' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 'var(--border-radius-md)', padding: '7px 6px' }}>
                    <s.icon size={10} color="rgba(255,255,255,0.6)" style={{ margin: '0 auto', display: 'block' }} />
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.8px', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 13, color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ maxWidth: 340, margin: '0 auto 14px', fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500 }}>GIVE HER A NAME</div>
              <div style={{ maxWidth: 340, margin: '0 auto', display: 'flex', gap: 8 }}>
                <input type="text" value={noriName} onChange={e => setNoriName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && noriName.trim() && setMeetStep('customize')}
                  placeholder="Nori, Splash, Wavelet..."
                  style={{ flex: 1, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,0.4)', color: '#FFFFFF', padding: '0 14px', height: 44, fontSize: 15, borderRadius: 'var(--border-radius-md)' }}
                  maxLength={20} autoFocus
                />
                <button onClick={() => noriName.trim() && setMeetStep('customize')} disabled={!noriName.trim()}
                  style={{ background: noriName.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.2)', color: noriName.trim() ? '#0A1628' : 'rgba(255,255,255,0.5)', border: 'none', padding: '0 20px', height: 44, borderRadius: 'var(--border-radius-md)', cursor: noriName.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontSize: 14 }}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {meetStep === 'customize' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <button onClick={() => setMeetStep('name')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,0.3)', color: '#FFFFFF', cursor: 'pointer', fontSize: 11, padding: '5px 11px', borderRadius: 999, marginBottom: 12 }}>← Back</button>
                <h1 style={{ fontSize: 24, fontWeight: 500, color: '#FFFFFF', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                  Dress up <span style={{ fontStyle: 'italic', color: '#FFD770' }}>{noriName}</span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, margin: 0 }}>Make her uniquely yours.</p>
              </div>

              <Glass style={{ padding: '0.5rem 1rem', textAlign: 'center', marginBottom: 10 }}>
                <NoriAvatar moodState={{ mood: 'happy', intensity: 0 }} size={210} customization={customization} />
              </Glass>

              <Glass style={{ padding: '0.85rem 1rem', marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 9 }}>BODY COLOR</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {BODY_COLORS.map(c => {
                    const active = customization.bodyColor === c.id;
                    return (
                      <button key={c.id} onClick={() => setCustomization({ ...customization, bodyColor: c.id })} style={{ padding: '7px 6px', background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)', color: active ? '#0A1628' : '#FFFFFF', border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: `linear-gradient(135deg, ${c.accent}, ${c.color}, ${c.dark})`, border: '0.5px solid rgba(0,0,0,0.2)' }} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </Glass>

              <Glass style={{ padding: '0.85rem 1rem', marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 9 }}>HAT</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {HAT_OPTIONS.map(h => {
                    const active = customization.hat === h.id;
                    return <button key={h.id} onClick={() => setCustomization({ ...customization, hat: h.id })} style={{ padding: '9px 6px', background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)', color: active ? '#0A1628' : '#FFFFFF', border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>{h.name}</button>;
                  })}
                </div>
              </Glass>

              <Glass style={{ padding: '0.85rem 1rem', marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 9 }}>ACCESSORY</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {ACCESSORY_OPTIONS.map(a => {
                    const active = customization.accessory === a.id;
                    return <button key={a.id} onClick={() => setCustomization({ ...customization, accessory: a.id })} style={{ padding: '9px 6px', background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)', color: active ? '#0A1628' : '#FFFFFF', border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>{a.name}</button>;
                  })}
                </div>
              </Glass>

              <button onClick={() => setScreen('home')} style={{ width: '100%', padding: '14px', background: '#FFFFFF', color: '#0A1628', border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Adopt {noriName} <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==== SCREEN: HOME ====
  if (screen === 'home') {
    return (
      <div style={{ padding: 0, fontFamily: 'var(--font-sans)', position: 'relative', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', minHeight: 720 }}>
        <h2 className="sr-only">Home — your adventure with {noriName}</h2>
        <OceanBackdrop zoneTransition={backdropZone} />

        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, pointerEvents: 'none', animation: 'homeFloat 4s ease-in-out infinite' }}>
          <NoriAvatar moodState={{ mood: 'happy', intensity: 0 }} size={240} customization={customization} />
        </div>
        <style>{`@keyframes homeFloat { 0%, 100% { transform: translate(-50%, -50%); } 50% { transform: translate(-50%, calc(-50% - 10px)); } }`}</style>

        <div style={{ position: 'relative', padding: '1.75rem 1.1rem 1rem', zIndex: 2, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.25)', color: '#FFFFFF', borderRadius: 999, fontSize: 11, fontWeight: 500, marginBottom: 10, letterSpacing: '1px' }}>
            <Heart size={12} fill="#FF8FB5" stroke="#FF8FB5" /> ADOPTED
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 500, color: '#FFFFFF', margin: '0 0 6px', lineHeight: 1.1, letterSpacing: '-0.5px', textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
            Say hi to <span style={{ fontStyle: 'italic', color: '#FFD770' }}>{noriName}</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13.5, margin: '0 auto', maxWidth: 440, lineHeight: 1.55, textShadow: '0 1px 10px rgba(0,0,0,0.3)' }}>
            Dive into the real ocean with her. Control temperature. Watch her mood change. Discover what climate change <em>actually feels like</em> to ocean life.
          </p>
        </div>
        <div style={{ height: 300 }} />

        <div style={{ position: 'relative', padding: '0 1.1rem 1.5rem', zIndex: 2 }}>
          <Glass style={{ padding: '1rem 1.1rem', marginBottom: 12, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Compass size={14} color="#FFD770" />
              <div style={{ fontSize: 13.5, fontWeight: 500, color: '#FFFFFF' }}>Three zones. Three climate stories.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {ZONE_ORDER.map(zid => {
                const z = ZONE_CONFIG[zid];
                const Icon = z.icon;
                return (
                  <div key={zid} style={{ padding: '9px 6px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                    <Icon size={14} color={z.accentLight} style={{ marginBottom: 3 }} />
                    <div style={{ fontSize: 10.5, fontWeight: 500, color: '#FFFFFF' }}>{z.name.replace(' Zone', '')}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>{z.depthRange}</div>
                    <div style={{ fontSize: 9.5, color: z.accentLight, fontWeight: 500, marginTop: 3 }}>{z.climateStory}</div>
                  </div>
                );
              })}
            </div>
          </Glass>

          <Glass style={{ padding: '0.9rem 1.1rem', marginBottom: 14, textAlign: 'left' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 6 }}>WHAT YOU'LL DO</div>
            {[
              { icon: Play, text: 'Play — tune temperature & salinity, watch the consequences' },
              { icon: AlertTriangle, text: 'Tipping Points — find the breaking point for each zone' },
              { icon: BookOpen, text: `Learn — real EDA charts from ${TOTAL_READINGS.toLocaleString()} measurements` },
              { icon: Lightbulb, text: 'Facts — wild ocean trivia you never knew' },
              { icon: LayoutDashboard, text: 'Dashboard — live vitals + achievements' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                <item.icon size={12} color="#FFD770" style={{ flexShrink: 0 }} />
                {item.text}
              </div>
            ))}
          </Glass>

          {/* NEW — Role picker (Explorer vs Teacher) */}
          <Glass style={{ padding: '0.85rem 1rem', marginBottom: 12, textAlign: 'left' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 8 }}>WHO'S DIVING TODAY?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button
                onClick={() => setUserRole('explorer')}
                style={{
                  padding: '11px 8px',
                  background: userRole === 'explorer' ? 'rgba(255,215,112,0.2)' : 'rgba(255,255,255,0.05)',
                  color: userRole === 'explorer' ? '#FFD770' : 'rgba(255,255,255,0.8)',
                  border: `0.5px solid ${userRole === 'explorer' ? 'rgba(255,215,112,0.5)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 'var(--border-radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Compass size={13} />
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>Explorer</span>
                  {userRole === 'explorer' && <CheckCircle2 size={12} style={{ marginLeft: 'auto' }} />}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>Dive in, play with the data, discover on your own.</div>
              </button>
              <button
                onClick={() => setUserRole('teacher')}
                style={{
                  padding: '11px 8px',
                  background: userRole === 'teacher' ? 'rgba(178,148,232,0.2)' : 'rgba(255,255,255,0.05)',
                  color: userRole === 'teacher' ? '#B294E8' : 'rgba(255,255,255,0.8)',
                  border: `0.5px solid ${userRole === 'teacher' ? 'rgba(178,148,232,0.5)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 'var(--border-radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <GraduationCap size={13} />
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>Teacher</span>
                  {userRole === 'teacher' && <CheckCircle2 size={12} style={{ marginLeft: 'auto' }} />}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>Unlocks lesson plans, discussion Qs, and classroom guides.</div>
              </button>
            </div>
            {userRole === 'teacher' && (
              <div style={{ marginTop: 8, padding: '7px 9px', background: 'rgba(178,148,232,0.1)', borderLeft: '2px solid #B294E8', borderRadius: '0 6px 6px 0', fontSize: 10.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
                ✨ Teacher Mode unlocks the <strong style={{ color: '#B294E8' }}>Teach</strong> tab — a full curriculum dashboard with every plot explained and ready-to-use discussion questions.
              </div>
            )}
          </Glass>

          <button onClick={() => setScreen('explore')} style={{ width: '100%', padding: '14px', background: '#FFFFFF', color: '#0A1628', border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            Start your adventure <ChevronRight size={16} />
          </button>
          <button onClick={() => { setScreen('meet'); setMeetStep('customize'); }} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
            Restyle {noriName}
          </button>
        </div>
      </div>
    );
  }

  // ==== SCREEN: EXPLORE ====
  const tabs = [
    { id: 'play', label: 'Play', icon: Play },
    { id: 'dashboard', label: 'Stats', icon: LayoutDashboard },
    { id: 'learn', label: 'Learn', icon: BookOpen },
    ...(userRole === 'teacher' ? [{ id: 'teach', label: 'Teach', icon: GraduationCap }] : []),
    { id: 'facts', label: 'Facts', icon: Lightbulb },
    { id: 'risks', label: 'Risks', icon: AlertTriangle },
    { id: 'customize', label: 'Style', icon: Palette },
  ];

  return (
    <div style={{ padding: 0, fontFamily: 'var(--font-sans)', position: 'relative', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', minHeight: 720 }}>
      <h2 className="sr-only">Explore with {noriName}</h2>
      <OceanBackdrop zoneTransition={backdropZone} />

      <div style={{ position: 'relative', padding: '1.1rem 1rem', zIndex: 1 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => setScreen('home')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,0.25)', color: '#FFFFFF', cursor: 'pointer', fontSize: 11.5, padding: '6px 11px', borderRadius: 999, fontWeight: 500 }}>
            <Home size={12} /> Home
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: '#FFFFFF', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {noriName}
              {userRole === 'teacher' && (
                <span style={{ fontSize: 8.5, padding: '2px 6px', background: 'rgba(178,148,232,0.25)', color: '#B294E8', border: '0.5px solid rgba(178,148,232,0.4)', borderRadius: 999, fontWeight: 600, letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <GraduationCap size={9} /> TEACHER
                </span>
              )}
            </div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>#{FLOAT_ID} · {zone.name}</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: moodInfo.bg, border: `0.5px solid ${moodInfo.border}`, color: moodInfo.color, borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
            <span>{moodInfo.emoji}</span>
          </div>
        </div>

        {/* Zone progress pills */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {ZONE_ORDER.map((zid, i) => {
            const z = ZONE_CONFIG[zid];
            const isActive = zid === activeZone;
            const isVisited = visitedZones.has(zid);
            return (
              <div key={zid} style={{
                padding: '4px 11px',
                background: isActive ? '#FFD770' : isVisited ? 'rgba(47,224,159,0.2)' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#0A1628' : isVisited ? '#2FE09F' : 'rgba(255,255,255,0.4)',
                border: isVisited && !isActive ? '0.5px solid rgba(47,224,159,0.4)' : '0.5px solid transparent',
                borderRadius: 999, fontSize: 10.5, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>{z.emoji}</span>
                <span>{z.name.replace(' Zone', '')}</span>
                {isVisited && !isActive && <span>✓</span>}
              </div>
            );
          })}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.15)', padding: 3, borderRadius: 'var(--border-radius-md)', marginBottom: 12, overflowX: 'auto' }}>
          {tabs.map(t => {
            const active = exploreTab === t.id;
            return (
              <button key={t.id} onClick={() => setExploreTab(t.id)} style={{ padding: '8px 10px', border: 'none', background: active ? 'rgba(255,255,255,0.95)' : 'transparent', color: active ? '#0A1628' : 'rgba(255,255,255,0.8)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, transition: 'all 0.15s' }}>
                <t.icon size={12} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ===== PLAY TAB ===== */}
        {exploreTab === 'play' && (
          <>
            {/* Climate-emphasis reminder banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 11px', marginBottom: 10,
              background: 'linear-gradient(135deg, rgba(226,75,74,0.12), rgba(255,138,92,0.08))',
              border: '0.5px solid rgba(255,138,92,0.3)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 10.5,
              color: 'rgba(255,255,255,0.88)',
              lineHeight: 1.4,
            }}>
              <Globe size={12} color="#FF8A5C" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#FF8A5C', letterSpacing: '0.3px' }}>Every reading tells a climate story.</strong> Tap any underlined label to see what each metric reveals about our changing planet.
              </div>
            </div>

            {/* Zone selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.15)', padding: 3, borderRadius: 'var(--border-radius-md)', marginBottom: 10 }}>
              {ZONE_ORDER.map(zid => {
                const z = ZONE_CONFIG[zid];
                const Icon = z.icon;
                const active = activeZone === zid;
                return (
                  <button key={zid} onClick={() => setActiveZone(zid)} style={{ padding: '7px 5px', border: 'none', background: active ? 'rgba(255,255,255,0.9)' : 'transparent', color: active ? '#0A1628' : 'rgba(255,255,255,0.75)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Icon size={11} /> {z.name.replace(' Zone', '')}
                  </button>
                );
              })}
            </div>

            {/* Descent column with Nori centered */}
            <Glass style={{ padding: 0, marginBottom: 10, position: 'relative', height: 380, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '300%', transform: `translateY(-${(zoneTransition / 2) * 66.67}%)`, transition: 'transform 0.1s linear', zIndex: 0 }}>
                {ZONE_ORDER.map((zid, idx) => {
                  const z = ZONE_CONFIG[zid];
                  return (
                    <div key={zid} style={{ position: 'absolute', top: `${idx * 33.33}%`, left: 0, right: 0, height: '33.33%', background: `linear-gradient(to bottom, ${z.skyTop}, ${z.skyMid}, ${z.skyBottom})` }}>
                      {Array.from({ length: 15 }).map((_, i) => {
                        const seed = (idx * 50 + i * 37) % 100;
                        const depthOpacity = idx === 0 ? 0.35 : idx === 1 ? 0.25 : 0.15;
                        return (
                          <div key={i} style={{ position: 'absolute', left: `${(seed * 1.3) % 95 + 2}%`, top: `${(seed * 2.7) % 95 + 2}%`, width: 2 + (i % 3), height: 2 + (i % 3), borderRadius: '50%', background: idx === 2 && i % 3 === 0 ? '#42E0B3' : '#FFFFFF', opacity: depthOpacity, animation: `particleDrift${idx}-${i} ${4 + (i % 4)}s ease-in-out infinite` }} />
                        );
                      })}
                      {idx === 0 && [0, 1, 2, 3].map(i => (
                        <div key={i} style={{ position: 'absolute', top: 0, height: '100%', left: `${i * 28 + 5}%`, width: '10%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)', transform: 'skewX(-5deg)' }} />
                      ))}
                      {idx === 2 && Array.from({ length: 8 }).map((_, i) => {
                        const seed = (i * 41) % 100;
                        return <div key={`bio-${i}`} style={{ position: 'absolute', left: `${(seed * 1.7) % 90 + 5}%`, top: `${(seed * 2.3) % 90 + 5}%`, width: 3, height: 3, borderRadius: '50%', background: '#42E0B3', boxShadow: '0 0 6px #42E0B3', animation: `bioPulse 2s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }} />;
                      })}
                    </div>
                  );
                })}
              </div>

              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, pointerEvents: 'none' }}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const left = 10 + (i * 7.5) % 80;
                  const size = 3 + (i % 4);
                  const speed = 3 + (i % 4) * 1.5;
                  return <div key={i} style={{ position: 'absolute', left: `${left}%`, bottom: '-10px', width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,0.35)', animation: `bubbleRise${i} ${speed}s linear infinite`, animationDelay: `${i * 0.4}s` }} />;
                })}
              </div>

              <style>{`
                ${ZONE_ORDER.map((_, idx) => Array.from({ length: 15 }).map((_, i) => `@keyframes particleDrift${idx}-${i} { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(${(i % 2 ? 1 : -1) * 8}px, ${((i % 3) - 1) * 6}px); } }`).join('')).join('')}
                @keyframes bioPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.3); } }
                ${Array.from({ length: 12 }).map((_, i) => `@keyframes bubbleRise${i} { 0% { bottom: -10px; opacity: 0; } 10% { opacity: 0.6; } 90% { opacity: 0.6; } 100% { bottom: 110%; opacity: 0; } }`).join('')}
                @keyframes tippingPulse { 0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 rgba(226,75,74,0.6); } 50% { opacity: 0.9; transform: scale(1.01); box-shadow: 0 0 40px rgba(226,75,74,0.6); } }
              `}</style>

              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 42, pointerEvents: 'none', zIndex: 3, background: 'linear-gradient(to right, rgba(0,0,0,0.25), transparent)' }}>
                {[{ label: '0m', pct: 0 }, { label: '200m', pct: 10 }, { label: '1000m', pct: 50 }, { label: '2000m', pct: 100 }].map((m, i) => (
                  <div key={i} style={{ position: 'absolute', top: `${m.pct}%`, left: 0, right: 0, transform: m.pct === 100 ? 'translateY(-100%)' : m.pct === 0 ? 'translateY(0)' : 'translateY(-50%)', fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)', paddingLeft: 8, borderLeft: '0.5px solid rgba(255,255,255,0.3)', paddingTop: 2, paddingBottom: 2 }}>{m.label}</div>
                ))}
                <div style={{ position: 'absolute', top: `${(zoneTransition / 2) * 100}%`, left: 0, transform: 'translateY(-50%)', transition: 'top 0.1s linear', width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '7px solid #FFD770', filter: 'drop-shadow(0 0 4px rgba(255,215,112,0.7))' }} />
              </div>

              <div style={{ position: 'absolute', top: 12, left: 50, zIndex: 3, fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: '1px', fontWeight: 500, background: 'rgba(0,0,0,0.4)', padding: '4px 9px', borderRadius: 999, backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,0.2)' }}>
                {zone.emoji} {zone.climateStory.toUpperCase()}
              </div>
              <div style={{ position: 'absolute', top: 12, right: 14, zIndex: 3, fontSize: 10, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.35)', padding: '4px 9px', borderRadius: 999, backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,0.2)' }}>~{zoneDepth}m</div>

              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                <NoriAvatar moodState={moodState} size={200} customization={customization} />
              </div>

              <div style={{ position: 'absolute', bottom: 12, left: 50, right: 14, zIndex: 3, fontSize: 11, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4, background: 'rgba(0,0,0,0.3)', padding: '7px 12px', borderRadius: 'var(--border-radius-md)', backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,0.15)' }}>
                <div style={{ fontSize: 10, color: zone.accentLight, fontStyle: 'normal', fontWeight: 500, letterSpacing: '0.5px', marginBottom: 2 }}>
                  {zone.climateTag.toUpperCase()}
                </div>
                {zone.description}
              </div>
            </Glass>

            {/* NEW — Prominent Tipping Point Warning (from Streamlit pulse card) */}
            {moodState.atTippingPoint && (
              <div style={{
                padding: '1.1rem 1rem',
                marginBottom: 10,
                background: 'linear-gradient(135deg, #7B0000, #C0392B)',
                border: '2px solid #E74C3C',
                borderRadius: 'var(--border-radius-lg)',
                textAlign: 'center',
                animation: 'tippingPulse 1.2s ease-in-out infinite',
              }}>
                <div style={{ fontSize: 36, marginBottom: 4 }}>💀</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: '1px', marginBottom: 6 }}>
                  TIPPING POINT CROSSED
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.95)', lineHeight: 1.5 }}>
                  Beyond <strong style={{ color: '#FFD770' }}>{zone.tippingPoint.toFixed(1)}°C</strong> in this zone, recovery becomes nearly impossible on human timescales.
                </div>
              </div>
            )}

            {/* MOOD CARD — the consequence is the star */}
            <Glass style={{ padding: '0.85rem 1rem', marginBottom: 10, background: moodInfo.bg, border: `0.5px solid ${moodInfo.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 28 }}>{moodInfo.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: moodInfo.color, lineHeight: 1.2 }}>{moodInfo.headline}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {moodState.anomaly > 0 ? '+' : ''}{moodState.anomaly.toFixed(2)}°C from baseline
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5, marginBottom: 10 }}>
                {moodInfo.consequence}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '1px', fontWeight: 500, marginBottom: 6 }}>WHAT'S AT RISK</div>
              {moodInfo.risks.map((r, i) => (
                <div key={i} style={{ padding: '6px 10px', marginBottom: 4, background: 'rgba(255,255,255,0.05)', borderLeft: `2px solid ${moodInfo.color}`, borderRadius: '0 var(--border-radius-md) var(--border-radius-md) 0', fontSize: 11.5, color: 'rgba(255,255,255,0.88)' }}>
                  {r}
                </div>
              ))}
              <div style={{ marginTop: 10, padding: '9px 11px', background: 'rgba(52,152,219,0.12)', border: '0.5px solid rgba(52,152,219,0.3)', borderRadius: 'var(--border-radius-md)' }}>
                <div style={{ fontSize: 10, color: '#5FB3F0', letterSpacing: '0.5px', fontWeight: 500, marginBottom: 3 }}>🌍 CLIMATE CONNECTION</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>{moodInfo.climateLink}</div>
              </div>
            </Glass>

            {/* NEW — Thermocline callout inside twilight zone (from Streamlit) */}
            {activeZone === 'twilight' && (
              <Glass style={{
                padding: '0.9rem 1rem', marginBottom: 10,
                background: 'linear-gradient(135deg, rgba(155,142,240,0.15), rgba(52,152,219,0.15))',
                border: '0.5px solid rgba(155,142,240,0.35)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <Ruler size={14} color="#9B8EF0" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#B8AEEF', marginBottom: 4, letterSpacing: '0.3px' }}>
                      📐 THE THERMOCLINE
                    </div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                      You are inside the thermocline — the boundary where temperature drops sharply from the warm surface to the cold deep. Climate change is pushing this boundary <em>deeper</em>, shrinking the sunlit zone where most life exists.
                    </div>
                  </div>
                </div>
              </Glass>
            )}

            {/* NEW — Century Clock callout when midnight is warming (from Streamlit) */}
            {activeZone === 'midnight' && moodState.mood === 'warm' && !moodState.atTippingPoint && (
              <Glass style={{
                padding: '0.9rem 1rem', marginBottom: 10,
                background: 'rgba(192,57,43,0.2)',
                border: '0.5px solid #C0392B',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <Clock size={14} color="#E24B4A" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#FF8A5C', marginBottom: 4, letterSpacing: '0.3px' }}>
                      ⏳ CENTURY CLOCK
                    </div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                      The deep ocean takes <strong style={{ color: '#FFD770' }}>200–1,000 years</strong> to exchange water with the surface. Warming detected here today will persist long after anyone alive now is gone.
                    </div>
                  </div>
                </div>
              </Glass>
            )}

            {/* TEMPERATURE SLIDER with heat meter */}
            <Glass style={{ padding: '0.85rem 1rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                <MetricLabel metricKey="temperature" zoneId={activeZone}
                  style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', fontWeight: 500 }}>
                  <Thermometer size={10} style={{ marginRight: 3 }} />
                  TEMPERATURE
                </MetricLabel>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 500, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{currentTemp.toFixed(1)}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>°C</span>
                </div>
              </div>

              {/* Heat meter gradient bar */}
              <div style={{ height: 10, background: 'linear-gradient(90deg, #5FB3F0, #2FE09F, #FFAB42, #FF3B30)', borderRadius: 5, position: 'relative', marginBottom: 14 }}>
                {/* baseline marker */}
                <div style={{ position: 'absolute', top: -3, left: `${((zone.baseline - zone.sliderMin) / (zone.sliderMax - zone.sliderMin)) * 100}%`, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid #FFFFFF' }} />
                <div style={{ position: 'absolute', top: -16, left: `${((zone.baseline - zone.sliderMin) / (zone.sliderMax - zone.sliderMin)) * 100}%`, transform: 'translateX(-50%)', fontSize: 8, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>baseline</div>
                {/* tipping marker */}
                <div style={{ position: 'absolute', top: -3, left: `${((zone.tippingPoint - zone.sliderMin) / (zone.sliderMax - zone.sliderMin)) * 100}%`, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid #FF3B30' }} />
                <div style={{ position: 'absolute', top: -16, left: `${((zone.tippingPoint - zone.sliderMin) / (zone.sliderMax - zone.sliderMin)) * 100}%`, transform: 'translateX(-50%)', fontSize: 8, color: '#FF3B30', whiteSpace: 'nowrap', fontWeight: 600 }}>⚠ tip</div>
                {/* current marker */}
                <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${((currentTemp - zone.sliderMin) / (zone.sliderMax - zone.sliderMin)) * 100}%`, transform: 'translateX(-50%)', width: 3, background: '#FFFFFF', borderRadius: 2, boxShadow: '0 0 6px rgba(255,255,255,0.8)' }} />
              </div>

              <input type="range" min={zone.sliderMin} max={zone.sliderMax} step="0.1"
                value={currentTemp}
                onChange={e => setZoneTemps({ ...zoneTemps, [activeZone]: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: moodInfo.color }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                <span>❄️ {zone.sliderMin.toFixed(1)}°</span>
                <span style={{ color: '#9FE9C4' }}>comfort ±{zone.tolerance}°</span>
                <span>🔥 {zone.sliderMax.toFixed(1)}°</span>
              </div>
            </Glass>

            {/* SALINITY SLIDER */}
            <Glass style={{ padding: '0.85rem 1rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                <MetricLabel metricKey="salinity" zoneId={activeZone}
                  style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', fontWeight: 500 }}>
                  <Droplet size={10} style={{ marginRight: 3 }} />
                  SALINITY
                </MetricLabel>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 500, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{currentSal.toFixed(2)}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>PSU</span>
                </div>
              </div>
              <input type="range" min={zone.salBaseline - 0.8} max={zone.salBaseline + 0.8} step="0.01"
                value={currentSal}
                onChange={e => setZoneSals({ ...zoneSals, [activeZone]: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: salSignal.color }} />
              <div style={{ marginTop: 6, fontSize: 12, color: salSignal.color, fontWeight: 500 }}>
                {salSignal.status === 'normal' ? '✅' : salSignal.status === 'fresh' ? '💧' : '🧂'} {salSignal.msg}
              </div>
              {salSignal.detail && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(142,212,255,0.1)', border: '0.5px solid rgba(142,212,255,0.3)', borderRadius: 'var(--border-radius-md)', fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                  <div style={{ fontSize: 10, color: '#8ED4FF', fontWeight: 500, marginBottom: 3, letterSpacing: '0.5px' }}>🧊 GLACIAL MELT SIGNAL</div>
                  {salSignal.detail}
                </div>
              )}
            </Glass>

            {/* NEW — Historical stress level (from Streamlit bar chart) */}
            <Glass style={{ padding: '0.85rem 1rem', marginBottom: 10 }}>
              <div style={{ marginBottom: 9 }}>
                <MetricLabel metricKey="stress" zoneId={activeZone}
                  style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', fontWeight: 500 }}>
                  <BarChart3 size={10} style={{ marginRight: 3 }} />
                  HOW STRESSED IS NORI HERE HISTORICALLY?
                </MetricLabel>
              </div>
              <MoodFrequencyChart zoneId={activeZone} />
              {/* Climate connection footer */}
              <div style={{ marginTop: 9, padding: '7px 9px', background: 'linear-gradient(135deg, rgba(226,75,74,0.12), rgba(255,138,92,0.12))', border: '0.5px solid rgba(255,138,92,0.3)', borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: '#FF8A5C', fontWeight: 600, letterSpacing: '1px', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={8} /> CLIMATE SIGNAL
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45 }}>
                  Marine heatwaves have tripled since 1980 — you'd see that by watching this warm bar grow.
                </div>
              </div>
            </Glass>

            {/* RESIDENTS — who lives here */}
            <Glass style={{ padding: '0.85rem 1rem', marginBottom: 10 }}>
              <div style={{ marginBottom: 8 }}>
                <MetricLabel metricKey="residents" zoneId={activeZone}
                  style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', fontWeight: 500 }}>
                  <Users size={10} style={{ marginRight: 3 }} />
                  WHO LIVES HERE
                </MetricLabel>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {zone.residents.map((r, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--border-radius-md)', fontSize: 11.5, color: 'rgba(255,255,255,0.9)' }}>
                    {r}
                  </div>
                ))}
              </div>
            </Glass>

            {/* Did you know */}
            <Glass style={{ padding: '11px 13px', borderLeft: `2px solid ${zone.accentLight}`, borderRadius: '0 var(--border-radius-md) var(--border-radius-md) 0', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
              <Info size={13} style={{ color: zone.accentLight, flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)' }}>
                <span style={{ fontWeight: 500, color: zone.accentLight }}>Did you know?</span> {zone.fact}
              </div>
            </Glass>
          </>
        )}

        {/* ===== DASHBOARD TAB ===== */}
        {exploreTab === 'dashboard' && (
          <div>
            <Glass style={{ padding: '0.7rem 1rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flexShrink: 0 }}>
                <NoriAvatar moodState={moodState} size={90} customization={customization} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '1px', fontWeight: 500 }}>LIVE STATUS</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#FFFFFF', marginTop: 2, lineHeight: 1.2 }}>{moodInfo.headline}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                  {zone.name} · {currentTemp.toFixed(1)}°C · {currentSal.toFixed(2)} PSU
                </div>
              </div>
            </Glass>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
              {[
                { label: 'TOTAL READINGS', value: TOTAL_READINGS.toLocaleString(), sub: `across ${TOTAL_CYCLES} cycles`, color: '#FFD770', icon: Activity },
                { label: 'ANOMALY', value: `${moodState.anomaly > 0 ? '+' : ''}${moodState.anomaly.toFixed(2)}°C`, sub: `vs ${zone.baseline}°C baseline`, color: moodInfo.color, icon: TrendingUp },
                { label: 'WARMING RATE', value: `+${TREND_SLOPE}°/cycle`, sub: 'surface trend', color: '#FF8A5C', icon: Flame },
                { label: 'TIPPING POINT', value: `${zone.tippingPoint}°C`, sub: `${(zone.tippingPoint - currentTemp).toFixed(1)}°C away`, color: '#E24B4A', icon: AlertTriangle },
              ].map((s, i) => (
                <Glass key={i} style={{ padding: '10px 11px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: s.color, opacity: 0.7 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <s.icon size={10} color="rgba(255,255,255,0.6)" />
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px' }}>{s.label}</div>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 500, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{s.sub}</div>
                </Glass>
              ))}
            </div>

            {/* Your temp in the zone distribution */}
            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ marginBottom: 8 }}>
                <MetricLabel metricKey="histogram" zoneId={activeZone}
                  style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', fontWeight: 500 }}>
                  YOUR TEMP vs REAL {zone.name.toUpperCase()} READINGS
                </MetricLabel>
              </div>
              <ZoneHistogramChart zoneId={activeZone} currentTemp={currentTemp} />
              <div style={{ marginTop: 9, padding: '7px 9px', background: 'linear-gradient(135deg, rgba(226,75,74,0.12), rgba(255,138,92,0.12))', border: '0.5px solid rgba(255,138,92,0.3)', borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: '#FF8A5C', fontWeight: 600, letterSpacing: '1px', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={8} /> CLIMATE SIGNAL
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45 }}>
                  Climate change shifts this whole distribution to the right — rare heatwaves become common.
                </div>
              </div>
            </Glass>

            {/* Mood distribution by zone */}
            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ marginBottom: 10 }}>
                <MetricLabel metricKey="stress"
                  style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', fontWeight: 500 }}>
                  HISTORICAL STRESS LEVEL · ALL ZONES
                </MetricLabel>
              </div>
              {ZONE_ORDER.map(zid => {
                const z = ZONE_CONFIG[zid];
                const Icon = z.icon;
                return (
                  <div key={zid} style={{ marginBottom: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <Icon size={11} color="rgba(255,255,255,0.8)" />
                      <span style={{ fontSize: 11, color: '#FFFFFF', fontWeight: 500, flex: 1 }}>{z.name.replace(' Zone', '')}</span>
                      <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>{z.depthRange}</span>
                    </div>
                    <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', background: 'rgba(0,0,0,0.25)' }}>
                      <div style={{ width: `${z.pctWarm}%`, background: '#FF8A5C' }} />
                      <div style={{ width: `${z.pctHappy}%`, background: '#2FE09F' }} />
                      <div style={{ width: `${z.pctCold}%`, background: '#8ED4FF' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
                      <span>🥵 {z.pctWarm}%</span>
                      <span>😊 {z.pctHappy}%</span>
                      <span>🥶 {z.pctCold}%</span>
                    </div>
                  </div>
                );
              })}
            </Glass>

            {/* Achievements */}
            <Glass style={{ padding: '0.9rem 1rem' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', fontWeight: 500, marginBottom: 10 }}>ACHIEVEMENTS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[
                  { emoji: '🌊', label: 'First Dive', unlocked: true },
                  { emoji: '🔥', label: 'Felt the Heat', unlocked: moodState.mood === 'warm' },
                  { emoji: '❄️', label: 'Deep Chill', unlocked: moodState.mood === 'cold' },
                  { emoji: '😊', label: 'Comfort Found', unlocked: moodState.mood === 'happy' },
                  { emoji: '💀', label: 'Tipping Point', unlocked: moodState.atTippingPoint },
                  { emoji: '🌑', label: 'Abyss Explorer', unlocked: visitedZones.has('midnight') },
                  { emoji: '🌅', label: 'Thermocline', unlocked: visitedZones.has('twilight') },
                  { emoji: '🧊', label: 'Glacial Melt', unlocked: salSignal.status === 'fresh' },
                  { emoji: '🏆', label: 'All Zones', unlocked: visitedZones.size === 3 },
                ].map((a, i) => (
                  <div key={i} style={{ padding: '9px 5px', textAlign: 'center', background: a.unlocked ? 'rgba(255,215,112,0.15)' : 'rgba(255,255,255,0.04)', border: `0.5px solid ${a.unlocked ? 'rgba(255,215,112,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 'var(--border-radius-md)', opacity: a.unlocked ? 1 : 0.45 }}>
                    <div style={{ fontSize: 20 }}>{a.emoji}</div>
                    <div style={{ fontSize: 9.5, color: a.unlocked ? '#FFD770' : 'rgba(255,255,255,0.6)', fontWeight: 500, marginTop: 2 }}>{a.label}</div>
                  </div>
                ))}
              </div>
            </Glass>
          </div>
        )}

        {/* ===== LEARN TAB ===== */}
        {exploreTab === 'learn' && (
          <div>
            <Glass style={{ padding: '1rem 1.1rem', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 6 }}>THE STORY IN THE DATA</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.9)' }}>
                {noriName} measured <span style={{ color: '#FFD770', fontWeight: 500 }}>{TOTAL_READINGS.toLocaleString()} data points</span> across {TOTAL_CYCLES} dive cycles. Here's what she discovered.
              </div>
            </Glass>

            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Thermometer size={14} color="#FFD770" />
                <MetricLabel metricKey="thermocline" style={{ fontSize: 13.5, fontWeight: 500, color: '#FFFFFF' }} iconSize={12}>
                  The Thermocline
                </MetricLabel>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginBottom: 10, lineHeight: 1.5 }}>
                Temperature plummets ~9°C in the top 200m, then stabilizes near 3°C. This boundary separates warm sunlit water from the cold deep.
              </div>
              <ThermoclineChart highlightDepth={zoneDepth} />
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'linear-gradient(135deg, rgba(226,75,74,0.12), rgba(255,138,92,0.12))', border: '0.5px solid rgba(255,138,92,0.3)', borderRadius: 6 }}>
                <div style={{ fontSize: 9.5, color: '#FF8A5C', fontWeight: 600, letterSpacing: '1px', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={9} /> CLIMATE CONNECTION
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                  As the surface warms, the thermocline deepens and sharpens — trapping heat near the top and starving ecosystems of mixed nutrients.
                </div>
              </div>
            </Glass>

            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <TrendingUp size={14} color="#FF8A5C" />
                <MetricLabel metricKey="cycleTrend" style={{ fontSize: 13.5, fontWeight: 500, color: '#FFFFFF' }} iconSize={12}>
                  Is the Ocean Warming?
                </MetricLabel>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginBottom: 10, lineHeight: 1.5 }}>
                Surface temps across {TOTAL_CYCLES} cycles trend <span style={{ color: '#FF8A5C', fontWeight: 500 }}>+{TREND_SLOPE}°C per cycle</span>. Small numbers, compounding.
              </div>
              <CycleTrendChart />
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'linear-gradient(135deg, rgba(226,75,74,0.12), rgba(255,138,92,0.12))', border: '0.5px solid rgba(255,138,92,0.3)', borderRadius: 6 }}>
                <div style={{ fontSize: 9.5, color: '#FF8A5C', fontWeight: 600, letterSpacing: '1px', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={9} /> CLIMATE CONNECTION
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                  Global sea-surface temperature has risen ~1.5°C since 1880. This trendline is the central piece of evidence in climate science.
                </div>
              </div>
            </Glass>

            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Droplet size={14} color="#42E0B3" />
                <MetricLabel metricKey="salinityProfile" style={{ fontSize: 13.5, fontWeight: 500, color: '#FFFFFF' }} iconSize={12}>
                  Salinity Sinks
                </MetricLabel>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginBottom: 10, lineHeight: 1.5 }}>
                Fresher surface water (33.4 PSU) floats above denser deep water (34.5 PSU). This density gradient drives global circulation.
              </div>
              <SalinityChart />
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'linear-gradient(135deg, rgba(226,75,74,0.12), rgba(255,138,92,0.12))', border: '0.5px solid rgba(255,138,92,0.3)', borderRadius: 6 }}>
                <div style={{ fontSize: 9.5, color: '#FF8A5C', fontWeight: 600, letterSpacing: '1px', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={9} /> CLIMATE CONNECTION
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                  Melting ice freshens the surface, weakening the density gradient that powers the AMOC — the current that keeps Europe warm.
                </div>
              </div>
            </Glass>

            <Glass style={{ padding: '1rem 1.1rem' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 10 }}>KEY TAKEAWAYS</div>
              {[
                ['Thermocline is real', 'The sharp temperature drop in the top 200m is a physical barrier.'],
                ['Deep ocean is stable', 'Midnight zone stays near 3°C — any warming there is alarming.'],
                ['Surface reflects climate', 'Sunlight zone has the widest variance because weather acts on it directly.'],
                ['Density drives currents', 'Cold salty water sinks — the engine of global ocean circulation.'],
              ].map(([title, body], i) => (
                <div key={i} style={{ marginBottom: i < 3 ? 10 : 0, paddingLeft: 10, borderLeft: '2px solid rgba(255,215,112,0.5)' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#FFD770', marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{body}</div>
                </div>
              ))}
            </Glass>
          </div>
        )}

        {/* ===== TEACH TAB (teacher-only) ===== */}
        {exploreTab === 'teach' && userRole === 'teacher' && (
          <div>
            {/* Hero */}
            <Glass style={{
              padding: '1.1rem 1.1rem', marginBottom: 10,
              background: 'linear-gradient(135deg, rgba(178,148,232,0.18), rgba(95,179,240,0.12))',
              border: '0.5px solid rgba(178,148,232,0.35)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(178,148,232,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GraduationCap size={20} color="#B294E8" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#B294E8', letterSpacing: '1.5px', fontWeight: 600 }}>EDUCATOR DASHBOARD</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: '#FFFFFF', marginTop: 2 }}>Teach with {noriName}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.88)', lineHeight: 1.55 }}>
                Every plot in this app is a teachable moment. Below: the pedagogical story behind each one — why it matters, what concepts it unlocks, how to explain it, discussion questions, and ready-to-run classroom activities.
              </div>
            </Glass>

            {/* Quick nav */}
            <Glass style={{ padding: '0.8rem 1rem', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 8 }}>LESSON CATALOG · 7 PLOTS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
                {Object.entries(TEACHER_CONTENT).map(([key, lesson]) => (
                  <a key={key} href={`#lesson-${key}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(`lesson-${key}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    style={{ padding: '7px 9px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 10.5, color: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                    <FileText size={10} color="#B294E8" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</span>
                  </a>
                ))}
              </div>
            </Glass>

            {/* Curriculum goals */}
            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 9 }}>
                <Target size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                CURRICULUM GOALS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                {[
                  { icon: '🌊', label: 'Ocean literacy', body: 'Students learn the physical, chemical, and biological structure of the ocean.' },
                  { icon: '📊', label: 'Data literacy', body: 'Reading distributions, trendlines, and anomalies — skills for every scientific domain.' },
                  { icon: '🌍', label: 'Climate understanding', body: 'Every plot has a climate connection — the signal, the consequence, and the action.' },
                  { icon: '🤔', label: 'Critical thinking', body: 'Signal vs. noise, correlation vs. causation, extrapolation — built into every chart.' },
                ].map((g, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, padding: '7px 9px', background: 'rgba(255,255,255,0.04)', borderRadius: 7 }}>
                    <div style={{ fontSize: 16, flexShrink: 0 }}>{g.icon}</div>
                    <div>
                      <div style={{ fontSize: 11.5, color: '#FFD770', fontWeight: 500 }}>{g.label}</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.45, marginTop: 1 }}>{g.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Glass>

            {/* LESSON CARDS — one per plot */}
            {Object.entries(TEACHER_CONTENT).map(([key, lesson], idx) => (
              <Glass key={key} id={`lesson-${key}`} style={{ padding: '1rem 1.1rem', marginBottom: 10, scrollMarginTop: 12 }}>
                {/* Lesson header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, paddingBottom: 9, borderBottom: '0.5px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(178,148,232,0.2)', border: '0.5px solid rgba(178,148,232,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: '#B294E8', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: '#FFFFFF', fontWeight: 500, lineHeight: 1.2 }}>{lesson.title}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, color: '#B294E8', background: 'rgba(178,148,232,0.15)', padding: '2px 6px', borderRadius: 999, fontWeight: 500 }}>
                        {lesson.gradeLevel}
                      </span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 999, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={9} /> {lesson.duration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mini preview of the actual plot */}
                <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', fontWeight: 500, marginBottom: 5 }}>THE PLOT</div>
                  {key === 'thermocline' && <ThermoclineChart highlightDepth={zoneDepth} />}
                  {key === 'cycleTrend' && <CycleTrendChart />}
                  {key === 'salinityProfile' && <SalinityChart />}
                  {key === 'histogram' && <ZoneHistogramChart zoneId={activeZone} currentTemp={currentTemp} />}
                  {key === 'stressBars' && <MoodFrequencyChart zoneId={activeZone} />}
                  {key === 'moodAvatar' && (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                      <NoriAvatar moodState={moodState} size={120} customization={customization} />
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Live mood from current zone settings</div>
                    </div>
                  )}
                  {key === 'tippingPoint' && (
                    <div style={{ textAlign: 'center', padding: '14px 10px', background: 'linear-gradient(135deg, #7B0000, #C0392B)', borderRadius: 8, border: '1px solid #E74C3C' }}>
                      <div style={{ fontSize: 28 }}>💀</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', letterSpacing: '1px', marginTop: 2 }}>TIPPING POINT CROSSED</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.92)', marginTop: 4 }}>Beyond {zone.tippingPoint.toFixed(1)}°C: recovery becomes impossible on human timescales.</div>
                    </div>
                  )}
                </div>

                {/* Why teach this */}
                <div style={{ marginBottom: 10, padding: '10px 11px', background: 'rgba(255,215,112,0.08)', border: '0.5px solid rgba(255,215,112,0.25)', borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, color: '#FFD770', letterSpacing: '1px', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Lightbulb size={10} /> WHY TEACH THIS
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>{lesson.whyTeach}</div>
                </div>

                {/* Key concepts */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', fontWeight: 600, marginBottom: 6 }}>KEY CONCEPTS COVERED</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {lesson.keyConcepts.map((c, i) => (
                      <span key={i} style={{ fontSize: 10.5, padding: '4px 9px', background: 'rgba(95,179,240,0.15)', border: '0.5px solid rgba(95,179,240,0.35)', color: '#8FC7F0', borderRadius: 999, fontWeight: 500 }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* How to explain */}
                <div style={{ marginBottom: 10, padding: '10px 11px', background: 'rgba(47,224,159,0.08)', borderLeft: '3px solid #2FE09F', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontSize: 9.5, color: '#2FE09F', letterSpacing: '1px', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MessageSquare size={10} /> HOW TO EXPLAIN IT
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55 }}>{lesson.howToExplain}</div>
                </div>

                {/* Discussion questions */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <HelpCircle size={10} /> DISCUSSION QUESTIONS
                  </div>
                  {lesson.discussionQuestions.map((q, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 10px', marginBottom: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                      <span style={{ fontSize: 11, color: '#B294E8', fontWeight: 600, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>Q{i + 1}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5 }}>{q}</span>
                    </div>
                  ))}
                </div>

                {/* Climate connection — emphasized */}
                <div style={{ marginBottom: 10, padding: '11px 12px', background: 'linear-gradient(135deg, rgba(226,75,74,0.18), rgba(255,138,92,0.14))', border: '0.5px solid rgba(255,138,92,0.45)', borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, color: '#FF8A5C', letterSpacing: '1px', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Globe size={10} /> CLIMATE CONNECTION
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.92)', lineHeight: 1.55 }}>{lesson.climateConnection}</div>
                </div>

                {/* Classroom activity */}
                <div style={{ padding: '10px 11px', background: 'rgba(178,148,232,0.1)', border: '0.5px solid rgba(178,148,232,0.3)', borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, color: '#B294E8', letterSpacing: '1px', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={10} /> CLASSROOM ACTIVITY
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55 }}>{lesson.activity}</div>
                </div>
              </Glass>
            ))}

            {/* Teaching tips footer */}
            <Glass style={{ padding: '0.95rem 1rem', marginBottom: 10, background: 'rgba(47,224,159,0.06)', border: '0.5px solid rgba(47,224,159,0.25)' }}>
              <div style={{ fontSize: 10, color: '#2FE09F', letterSpacing: '1.5px', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Heart size={11} /> TEACHING WITH NORI — GENERAL TIPS
              </div>
              {[
                { n: '01', t: 'Let students play first', b: 'Give them 5–10 minutes to drag sliders freely before you explain anything. Curiosity beats instruction.' },
                { n: '02', t: 'Name the emotion', b: 'When Nori sweats, ask: "How would you feel if your home got 5°C hotter overnight?" Empathy builds understanding.' },
                { n: '03', t: 'Connect to the local', b: 'Ask what happens to local seafood, beach trips, or hurricane seasons when these numbers shift. Make it personal.' },
                { n: '04', t: 'Climate is never an aside', b: 'Every plot has a "CLIMATE CONNECTION" panel. Don\'t skip them — they\'re the reason the data matters.' },
                { n: '05', t: 'End with action', b: 'Finish lessons with "what could we do?" not "how bad is it?" Hope is a pedagogical tool.' },
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, marginBottom: i < 4 ? 8 : 0, padding: '7px 9px', background: 'rgba(255,255,255,0.04)', borderRadius: 7 }}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#2FE09F', fontWeight: 600, flexShrink: 0, paddingTop: 1 }}>{tip.n}</div>
                  <div>
                    <div style={{ fontSize: 11.5, color: '#FFFFFF', fontWeight: 500 }}>{tip.t}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.45, marginTop: 2 }}>{tip.b}</div>
                  </div>
                </div>
              ))}
            </Glass>

            {/* Exit teacher mode */}
            <button
              onClick={() => { setUserRole('explorer'); setExploreTab('play'); }}
              style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Compass size={12} /> Exit teacher mode
            </button>
          </div>
        )}

        {/* ===== FACTS TAB ===== */}
        {exploreTab === 'facts' && (
          <div>
            <Glass style={{ padding: '1rem 1.1rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Sparkles size={14} color="#FFD770" />
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500 }}>WEIRD & WONDERFUL</div>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.9)' }}>
                Surprising things {noriName} sees every day in the deep.
              </div>
            </Glass>

            {ZONE_ORDER.map(zid => {
              const z = ZONE_CONFIG[zid];
              const Icon = z.icon;
              return (
                <Glass key={zid} style={{ padding: '0.95rem 1rem', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Icon size={14} color={z.accentLight} />
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>{z.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>{z.depthRange}</div>
                  </div>
                  <div style={{ marginTop: 9 }}>
                    {z.funFacts.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', marginBottom: 5, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 'var(--border-radius-md)' }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>{['💡', '🌊', '✨'][i]}</span>
                        <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)' }}>{f}</div>
                      </div>
                    ))}
                  </div>
                </Glass>
              );
            })}

            <Glass style={{ padding: '0.95rem 1rem', background: 'rgba(255,215,112,0.08)', border: '0.5px solid rgba(255,215,112,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <Shell size={14} color="#FFD770" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#FFD770', marginBottom: 3 }}>Did you know?</div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)' }}>
                    Over 4,000 Argo floats like {noriName} are drifting in the world's oceans right now, all collecting data to help us understand climate change.
                  </div>
                </div>
              </div>
            </Glass>
          </div>
        )}

        {/* ===== RISKS TAB ===== */}
        {exploreTab === 'risks' && (
          <div>
            <Glass style={{ padding: '1rem 1.1rem', marginBottom: 10, background: 'rgba(255,138,92,0.1)', borderLeft: '3px solid rgba(255,138,92,0.6)', borderRadius: '0 var(--border-radius-lg) var(--border-radius-lg) 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <AlertTriangle size={14} color="#FF8A5C" />
                <div style={{ fontSize: 10, color: '#FF8A5C', letterSpacing: '1.5px', fontWeight: 500 }}>THREATS TO THE OCEAN</div>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.9)' }}>
                Every zone {noriName} visits is under pressure. Here's what's at stake — and the tipping points where recovery becomes impossible.
              </div>
            </Glass>

            {ZONE_ORDER.map(zid => {
              const z = ZONE_CONFIG[zid];
              const Icon = z.icon;
              return (
                <Glass key={zid} style={{ padding: '0.95rem 1rem', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <Icon size={14} color={z.accentLight} />
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>{z.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>{z.depthRange}</div>
                  </div>
                  <div style={{ fontSize: 11, color: z.accentLight, fontWeight: 500, marginBottom: 9, letterSpacing: '0.3px' }}>
                    {z.climateTag}
                  </div>

                  {/* Tipping point banner */}
                  <div style={{ padding: '8px 11px', marginBottom: 8, background: 'rgba(226,75,74,0.12)', border: '0.5px solid rgba(226,75,74,0.35)', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Skull size={13} color="#E24B4A" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>
                      <span style={{ color: '#FF8A5C', fontWeight: 500 }}>Tipping point: {z.tippingPoint}°C</span> — past this threshold recovery takes centuries.
                    </div>
                  </div>

                  {z.risks.map((r, i) => (
                    <div key={i} style={{ padding: '9px 11px', marginBottom: 5, background: 'rgba(255,138,92,0.08)', borderLeft: '2px solid rgba(255,138,92,0.5)', borderRadius: '0 var(--border-radius-md) var(--border-radius-md) 0' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: '#FFB299', marginBottom: 3 }}>⚠ {r.title}</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>{r.body}</div>
                    </div>
                  ))}
                </Glass>
              );
            })}

            <Glass style={{ padding: '0.95rem 1rem', background: 'rgba(47,224,159,0.08)', border: '0.5px solid rgba(47,224,159,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <Heart size={14} color="#2FE09F" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#2FE09F', marginBottom: 3 }}>There's still hope</div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)' }}>
                    Every Argo float is part of a global effort to understand and protect the ocean. The more we measure, the better we can protect what's left.
                  </div>
                </div>
              </div>
            </Glass>
          </div>
        )}

        {/* ===== CUSTOMIZE TAB ===== */}
        {exploreTab === 'customize' && (
          <div>
            <Glass style={{ padding: '0.6rem 1rem 0.4rem', textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 2 }}>LIVE PREVIEW</div>
              <NoriAvatar moodState={{ mood: 'happy', intensity: 0 }} size={200} customization={customization} />
            </Glass>

            <Glass style={{ padding: '0.85rem 1rem', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 9 }}>BODY COLOR</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {BODY_COLORS.map(c => {
                  const active = customization.bodyColor === c.id;
                  return (
                    <button key={c.id} onClick={() => setCustomization({ ...customization, bodyColor: c.id })} style={{ padding: '7px 6px', background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)', color: active ? '#0A1628' : '#FFFFFF', border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: `linear-gradient(135deg, ${c.accent}, ${c.color}, ${c.dark})`, border: '0.5px solid rgba(0,0,0,0.2)' }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </Glass>

            <Glass style={{ padding: '0.85rem 1rem', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 9 }}>HAT</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {HAT_OPTIONS.map(h => {
                  const active = customization.hat === h.id;
                  return <button key={h.id} onClick={() => setCustomization({ ...customization, hat: h.id })} style={{ padding: '9px 6px', background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)', color: active ? '#0A1628' : '#FFFFFF', border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>{h.name}</button>;
                })}
              </div>
            </Glass>

            <Glass style={{ padding: '0.85rem 1rem', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 9 }}>ACCESSORY</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {ACCESSORY_OPTIONS.map(a => {
                  const active = customization.accessory === a.id;
                  return <button key={a.id} onClick={() => setCustomization({ ...customization, accessory: a.id })} style={{ padding: '9px 6px', background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)', color: active ? '#0A1628' : '#FFFFFF', border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>{a.name}</button>;
                })}
              </div>
            </Glass>

            <button onClick={() => setCustomization({ hat: 'none', accessory: 'none', bodyColor: 'ocean' })} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Reset</button>
          </div>
        )}

        {/* Navigation between zones */}
        {exploreTab === 'play' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button
              onClick={() => {
                const idx = ZONE_ORDER.indexOf(activeZone);
                if (idx > 0) setActiveZone(ZONE_ORDER[idx - 1]);
              }}
              disabled={ZONE_ORDER.indexOf(activeZone) === 0}
              style={{ flex: 1, padding: '10px', background: ZONE_ORDER.indexOf(activeZone) === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)', color: ZONE_ORDER.indexOf(activeZone) === 0 ? 'rgba(255,255,255,0.3)' : '#FFFFFF', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 'var(--border-radius-md)', cursor: ZONE_ORDER.indexOf(activeZone) === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <ArrowUp size={12} /> Surface up
            </button>
            <button
              onClick={() => {
                const idx = ZONE_ORDER.indexOf(activeZone);
                if (idx < 2) setActiveZone(ZONE_ORDER[idx + 1]);
              }}
              disabled={ZONE_ORDER.indexOf(activeZone) === 2}
              style={{ flex: 2, padding: '10px', background: ZONE_ORDER.indexOf(activeZone) === 2 ? 'rgba(47,224,159,0.15)' : 'linear-gradient(135deg, #FFD770, #FF8A5C)', color: ZONE_ORDER.indexOf(activeZone) === 2 ? '#2FE09F' : '#0A1628', border: ZONE_ORDER.indexOf(activeZone) === 2 ? '0.5px solid rgba(47,224,159,0.4)' : 'none', borderRadius: 'var(--border-radius-md)', cursor: ZONE_ORDER.indexOf(activeZone) === 2 ? 'default' : 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {ZONE_ORDER.indexOf(activeZone) === 2 ? (
                <>🎉 All zones explored</>
              ) : (
                <>Dive to {ZONE_CONFIG[ZONE_ORDER[ZONE_ORDER.indexOf(activeZone) + 1]].name} <ArrowDown size={12} /></>
              )}
            </button>
          </div>
        )}

        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 12, letterSpacing: '0.5px' }}>
          {noriName.toUpperCase()} · {TOTAL_READINGS.toLocaleString()} READINGS · {TOTAL_CYCLES} CYCLES · BASELINE {HISTORICAL_MEAN}°C
        </div>
      </div>
    </div>
  );
}
