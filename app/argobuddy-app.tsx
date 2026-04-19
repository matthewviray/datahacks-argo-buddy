import { useState, useEffect, useRef, useMemo } from 'react';
import { Thermometer, Droplet, Activity, Waves, Sun, Sunset, Moon, Info, BookOpen, Play, Sparkles, TrendingUp, BarChart3, Palette, Home, Compass, Zap, AlertTriangle, ChevronRight, LayoutDashboard, Heart, Lightbulb, Shell } from 'lucide-react';

// ============ CONSTANTS ============
const HISTORICAL_MEAN = 11.536;
const TOLERANCE = 1.0;

const ZONE_CONFIG = {
  sunlight: {
    id: 'sunlight', name: 'Sunlight Zone', icon: Sun,
    depthRange: '0–200m',
    baseline: 14.8, tempStd: 2.9,
    sliderMin: 8.5, sliderMax: 18.0, sliderDefault: 14.8,
    salBaseline: 33.4,
    pctWarm: 34.2, pctHappy: 18.5, pctCold: 47.3,
    skyTop: '#87CEEB', skyMid: '#4A90C2', skyBottom: '#2E6DA8',
    accentLight: '#FFE082',
    description: 'Where sunlight fuels phytoplankton blooms and weather shapes the water.',
    fact: 'Surface waters have the widest temperature variance (±2.9°C std) — most affected by climate and weather.',
    funFacts: [
      'Phytoplankton in this zone produce 50% of Earth\'s oxygen — more than all rainforests combined.',
      'A single drop of ocean surface water can contain millions of microscopic organisms.',
      'Sunlight only penetrates about 200m deep before it fades to darkness.',
    ],
    risks: [
      { title: 'Marine heatwaves', body: 'Surface warming events kill coral and disrupt fish migration. Intensity has tripled since 1980.' },
      { title: 'Plastic accumulation', body: '80% of ocean plastic floats in the top 200m, affecting plankton and everything that eats them.' },
      { title: 'Acidification', body: 'CO₂ dissolves fastest at the surface, lowering pH and harming shell-forming life.' },
    ],
  },
  twilight: {
    id: 'twilight', name: 'Twilight Zone', icon: Sunset,
    depthRange: '200–1000m',
    baseline: 7.2, tempStd: 2.1,
    sliderMin: 3.5, sliderMax: 12.0, sliderDefault: 7.2,
    salBaseline: 34.1,
    pctWarm: 8.1, pctHappy: 12.4, pctCold: 79.5,
    skyTop: '#4A4B7A', skyMid: '#2E2F5B', skyBottom: '#1A1B3D',
    accentLight: '#9B8EF0',
    description: 'The thermocline — where temperature plummets and light fades to nothing.',
    fact: 'Temperature drops ~9°C between surface and 200m. This sharp boundary is the thermocline.',
    funFacts: [
      'The largest daily migration on Earth happens here — billions of animals rise to feed at night.',
      '90% of fish in this zone produce their own bioluminescent light.',
      'This layer stores more carbon than all land plants combined.',
    ],
    risks: [
      { title: 'Deep-sea mining', body: 'New mining permits threaten to disturb habitats we don\'t fully understand yet.' },
      { title: 'Oxygen loss', body: 'Warming oceans hold less oxygen. Midwater "dead zones" are expanding globally.' },
      { title: 'Overfishing', body: 'Commercial fisheries are moving deeper as surface stocks decline.' },
    ],
  },
  midnight: {
    id: 'midnight', name: 'Midnight Zone', icon: Moon,
    depthRange: '1000–2000m',
    baseline: 3.2, tempStd: 0.4,
    sliderMin: 2.0, sliderMax: 5.5, sliderDefault: 3.2,
    salBaseline: 34.5,
    pctWarm: 0.1, pctHappy: 2.8, pctCold: 97.1,
    skyTop: '#0A0F1F', skyMid: '#05080F', skyBottom: '#010204',
    accentLight: '#42C5E0',
    description: 'Thermally stable, eternally dark. Any change here is alarming.',
    fact: 'Deep ocean stays near 3°C regardless of season. Warming at depth is a global climate alarm.',
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

// ============ PROFILE DATA (from notebooks) ============
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

// ============ MOOD ENGINE ============
function computeMood(temp) {
  const anomaly = temp - HISTORICAL_MEAN;
  const absAnomaly = Math.abs(anomaly);
  let mood;
  if (absAnomaly <= TOLERANCE) mood = 'happy';
  else if (anomaly > TOLERANCE) mood = 'sweating';
  else mood = 'shivering';
  const intensity = Math.min(1, absAnomaly / 6);
  return { mood, anomaly, absAnomaly, intensity };
}

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

// ============ CUSTOMIZATION OPTIONS ============
const HAT_OPTIONS = [
  { id: 'none', name: 'None' },
  { id: 'captain', name: 'Captain' },
  { id: 'party', name: 'Party' },
  { id: 'beanie', name: 'Beanie' },
  { id: 'crown', name: 'Crown' },
  { id: 'snorkel', name: 'Snorkel' },
];
const ACCESSORY_OPTIONS = [
  { id: 'none', name: 'None' },
  { id: 'glasses', name: 'Glasses' },
  { id: 'shades', name: 'Shades' },
  { id: 'scarf', name: 'Scarf' },
  { id: 'bowtie', name: 'Bowtie' },
  { id: 'flowers', name: 'Flowers' },
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

  if (mood === 'happy') {
    bobY = Math.sin(t * 1.3) * 5;
    rotate = Math.sin(t) * 4;
    mouthPath = 'M 128 172 Q 150 192 172 172';
    blush = true;
  } else if (mood === 'sweating') {
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
  } else if (mood === 'shivering') {
    const cold = Math.min(1, intensity * 1.5);
    shiverShake = cold * 2;
    bobY = Math.sin(t * 0.5) * 2;
    bodyFill = lerpColor(baseColors.color, '#A8D4F0', cold);
    bodyAccent = lerpColor(baseColors.accent, '#D4E8F5', cold);
    bodyDark = lerpColor(baseColors.dark, '#6B8FB5', cold);
    eyeSquish = 0.7;
    mouthPath = `M 138 180 Q 150 ${180 + Math.sin(t * 8) * 1.5} 162 180`;
    iceCrystals = cold > 0.5;
  }

  const shakeX = shiverShake > 0 ? Math.sin(t * 15) * shiverShake : 0;

  return (
    <svg viewBox="0 0 300 340" width={size} height={size * 340 / 300} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id={`bodyMain-${bodyColor}`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={bodyAccent} />
          <stop offset="60%" stopColor={bodyFill} />
          <stop offset="100%" stopColor={bodyDark} />
        </radialGradient>
        <radialGradient id={`bodyTop-${bodyColor}`} cx="50%" cy="50%" r="70%">
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
      </defs>

      {mood === 'happy' && (
        <ellipse cx="150" cy="180" rx="125" ry="135" fill="url(#happyGlow)">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
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
          stroke="#FFD4B0" strokeWidth="3" fill="none" strokeLinecap="round" opacity={opacity} />;
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
            <circle cx="0" cy="-98" r="5" fill="#FFD770" />
            <circle cx="0" cy="-98" r="3" fill="#FFF4C9">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        <ellipse cx="0" cy="-58" rx="44" ry="16" fill={`url(#bodyTop-${bodyColor})`} />
        <path d="M -44 -58 L -44 42 Q -44 52 -38 56 L 38 56 Q 44 52 44 42 L 44 -58 Z" fill={`url(#bodyMain-${bodyColor})`} />
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

        <ellipse cx="-16" cy="-12" rx="10" ry={10 * eyeSquish} fill="url(#eyeGrad)" />
        <ellipse cx="16" cy="-12" rx="10" ry={10 * eyeSquish} fill="url(#eyeGrad)" />

        {eyeSquish > 0.4 && <>
          <circle cx={-16 + Math.sin(t * 0.4) * 2.5} cy={-12 + Math.cos(t * 0.4) * 2} r="5" fill="#0A1628" />
          <circle cx={16 + Math.sin(t * 0.4) * 2.5} cy={-12 + Math.cos(t * 0.4) * 2} r="5" fill="#0A1628" />
          <circle cx={-13.5 + Math.sin(t * 0.4) * 2.5} cy={-14 + Math.cos(t * 0.4) * 2} r="2" fill="#FFFFFF" />
          <circle cx={18.5 + Math.sin(t * 0.4) * 2.5} cy={-14 + Math.cos(t * 0.4) * 2} r="2" fill="#FFFFFF" />
        </>}

        {accessory === 'glasses' && (
          <g fill="none" stroke="#0A1628" strokeWidth="1.5">
            <circle cx="-16" cy="-12" r="12" />
            <circle cx="16" cy="-12" r="12" />
            <line x1="-4" y1="-12" x2="4" y2="-12" />
          </g>
        )}
        {accessory === 'shades' && (
          <g>
            <ellipse cx="-16" cy="-12" rx="12" ry="9" fill="#0A1628" />
            <ellipse cx="16" cy="-12" rx="12" ry="9" fill="#0A1628" />
            <rect x="-4" y="-13" width="8" height="2" fill="#0A1628" />
            <ellipse cx="-19" cy="-15" rx="4" ry="2" fill="#FFFFFF" opacity="0.3" />
            <ellipse cx="13" cy="-15" rx="4" ry="2" fill="#FFFFFF" opacity="0.3" />
          </g>
        )}

        {blush && <>
          <ellipse cx="-27" cy="4" rx="7" ry="4" fill={mood === 'sweating' ? '#FF6B42' : '#FF8FB5'} opacity="0.65" />
          <ellipse cx="27" cy="4" rx="7" ry="4" fill={mood === 'sweating' ? '#FF6B42' : '#FF8FB5'} opacity="0.65" />
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
        <g key={s}>
          <text x={xScale(s)} y={H - 12} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)">{s}</text>
        </g>
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

// ============ MAIN APP ============
export default function NoriApp() {
  // ==== APP-LEVEL FLOW ====
  // 'meet' → 'home' → 'explore'
  const [screen, setScreen] = useState('meet');
  const [meetStep, setMeetStep] = useState('name'); // name | customize
  const [noriName, setNoriName] = useState('');
  const [customization, setCustomization] = useState({ hat: 'none', accessory: 'none', bodyColor: 'ocean' });

  // ==== EXPLORE TABS ====
  // 'play' | 'learn' | 'facts' | 'risks' | 'dashboard' | 'customize'
  const [exploreTab, setExploreTab] = useState('play');

  // ==== ZONE STATE ====
  const [activeZone, setActiveZone] = useState('sunlight');
  const [zoneTemps, setZoneTemps] = useState({
    sunlight: ZONE_CONFIG.sunlight.sliderDefault,
    twilight: ZONE_CONFIG.twilight.sliderDefault,
    midnight: ZONE_CONFIG.midnight.sliderDefault,
  });

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

  const zone = ZONE_CONFIG[activeZone];
  const currentTemp = zoneTemps[activeZone];
  const moodState = useMemo(() => computeMood(currentTemp), [currentTemp]);

  const moodLabels = {
    happy: { label: 'Happy', emoji: '😊', color: '#2FE09F', bg: 'rgba(47,224,159,0.18)', border: 'rgba(47,224,159,0.4)' },
    sweating: { label: 'Sweating', emoji: '🥵', color: '#FF8A5C', bg: 'rgba(255,138,92,0.18)', border: 'rgba(255,138,92,0.4)' },
    shivering: { label: 'Shivering', emoji: '🥶', color: '#8ED4FF', bg: 'rgba(142,212,255,0.18)', border: 'rgba(142,212,255,0.4)' },
  };
  const moodInfo = moodLabels[moodState.mood];
  const zoneDepth = activeZone === 'sunlight' ? 100 : activeZone === 'twilight' ? 600 : 1500;

  const backdropZone = screen === 'meet' ? 0 : screen === 'home' ? 0.3 : (exploreTab === 'play' ? zoneTransition : exploreTab === 'learn' ? 1 : exploreTab === 'risks' ? 0.8 : 0.3);

  // ==== SCREEN: MEET ====
  if (screen === 'meet') {
    return (
      <div style={{
        padding: 0, fontFamily: 'var(--font-sans)',
        position: 'relative', borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden', minHeight: 720,
      }}>
        <h2 className="sr-only">Meet your Nori</h2>
        <OceanBackdrop zoneTransition={backdropZone} />

        <div style={{ position: 'relative', padding: '1.5rem 1.1rem', zIndex: 1 }}>
          {/* Meet — Name step */}
          {meetStep === 'name' && (
            <div style={{ textAlign: 'center', paddingTop: 20 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '5px 13px', background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.25)',
                color: '#FFFFFF', borderRadius: 999, fontSize: 11,
                fontWeight: 500, marginBottom: 14, letterSpacing: '1px',
              }}>
                <Waves size={12} /> ARGO FLOAT 3901161
              </div>
              <h1 style={{
                fontSize: 34, fontWeight: 500, color: '#FFFFFF',
                margin: '0 0 10px', lineHeight: 1.1, letterSpacing: '-0.5px',
                textShadow: '0 2px 20px rgba(0,0,0,0.3)',
              }}>
                Meet your <span style={{ fontStyle: 'italic', color: '#FFD770' }}>buddy</span>
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.85)', fontSize: 14, margin: '0 0 24px',
                maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6,
              }}>
                A real scientific sensor drifting in the Pacific Ocean. She dives 2,000m deep every ten days — and she's about to be yours.
              </p>

              <div style={{ marginBottom: 24 }}>
                <NoriAvatar moodState={{ mood: 'happy', intensity: 0 }} size={230} customization={customization} />
              </div>

              <div style={{
                maxWidth: 340, margin: '0 auto 14px',
                fontSize: 11, color: 'rgba(255,255,255,0.6)',
                letterSpacing: '1.5px', fontWeight: 500,
              }}>
                GIVE HER A NAME
              </div>

              <div style={{ maxWidth: 340, margin: '0 auto', display: 'flex', gap: 8 }}>
                <input
                  type="text" value={noriName}
                  onChange={e => setNoriName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && noriName.trim() && setMeetStep('customize')}
                  placeholder="Nori, Splash, Wavelet..."
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(10px)',
                    border: '0.5px solid rgba(255,255,255,0.4)',
                    color: '#FFFFFF', padding: '0 14px', height: 44,
                    fontSize: 15, borderRadius: 'var(--border-radius-md)',
                  }}
                  maxLength={20} autoFocus
                />
                <button
                  onClick={() => noriName.trim() && setMeetStep('customize')}
                  disabled={!noriName.trim()}
                  style={{
                    background: noriName.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                    color: noriName.trim() ? '#0A1628' : 'rgba(255,255,255,0.5)',
                    border: 'none', padding: '0 20px', height: 44,
                    borderRadius: 'var(--border-radius-md)',
                    cursor: noriName.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 500, fontSize: 14,
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Meet — Customize step */}
          {meetStep === 'customize' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <button onClick={() => setMeetStep('name')} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                  border: '0.5px solid rgba(255,255,255,0.3)', color: '#FFFFFF',
                  cursor: 'pointer', fontSize: 11, padding: '5px 11px', borderRadius: 999, marginBottom: 12,
                }}>
                  ← Back
                </button>
                <h1 style={{
                  fontSize: 24, fontWeight: 500, color: '#FFFFFF',
                  margin: '0 0 4px', letterSpacing: '-0.3px',
                }}>
                  Dress up <span style={{ fontStyle: 'italic', color: '#FFD770' }}>{noriName}</span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, margin: 0 }}>
                  Make her uniquely yours before the journey begins.
                </p>
              </div>

              <Glass style={{ padding: '0.5rem 1rem 0.5rem', textAlign: 'center', marginBottom: 10 }}>
                <NoriAvatar moodState={{ mood: 'happy', intensity: 0 }} size={210} customization={customization} />
              </Glass>

              <Glass style={{ padding: '0.85rem 1rem', marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 9 }}>BODY COLOR</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {BODY_COLORS.map(c => {
                    const active = customization.bodyColor === c.id;
                    return (
                      <button key={c.id} onClick={() => setCustomization({ ...customization, bodyColor: c.id })} style={{
                        padding: '7px 6px',
                        background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)',
                        color: active ? '#0A1628' : '#FFFFFF',
                        border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: 'var(--border-radius-md)',
                        cursor: 'pointer', fontSize: 11, fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <span style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${c.accent}, ${c.color}, ${c.dark})`,
                          border: '0.5px solid rgba(0,0,0,0.2)',
                        }} />
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
                    return (
                      <button key={h.id} onClick={() => setCustomization({ ...customization, hat: h.id })} style={{
                        padding: '9px 6px',
                        background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)',
                        color: active ? '#0A1628' : '#FFFFFF',
                        border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: 'var(--border-radius-md)',
                        cursor: 'pointer', fontSize: 11, fontWeight: 500,
                      }}>
                        {h.name}
                      </button>
                    );
                  })}
                </div>
              </Glass>

              <Glass style={{ padding: '0.85rem 1rem', marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 9 }}>ACCESSORY</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {ACCESSORY_OPTIONS.map(a => {
                    const active = customization.accessory === a.id;
                    return (
                      <button key={a.id} onClick={() => setCustomization({ ...customization, accessory: a.id })} style={{
                        padding: '9px 6px',
                        background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)',
                        color: active ? '#0A1628' : '#FFFFFF',
                        border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: 'var(--border-radius-md)',
                        cursor: 'pointer', fontSize: 11, fontWeight: 500,
                      }}>
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </Glass>

              <button onClick={() => setScreen('home')} style={{
                width: '100%', padding: '14px',
                background: '#FFFFFF', color: '#0A1628',
                border: 'none', borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer', fontSize: 15, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
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
      <div style={{
        padding: 0, fontFamily: 'var(--font-sans)',
        position: 'relative', borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden', minHeight: 720,
      }}>
        <h2 className="sr-only">Home — your adventure with {noriName}</h2>
        <OceanBackdrop zoneTransition={backdropZone} />

        {/* Centered floating Nori */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1, pointerEvents: 'none',
          animation: 'homeFloat 4s ease-in-out infinite',
        }}>
          <NoriAvatar moodState={{ mood: 'happy', intensity: 0 }} size={240} customization={customization} />
        </div>

        <style>{`
          @keyframes homeFloat {
            0%, 100% { transform: translate(-50%, -50%); }
            50% { transform: translate(-50%, calc(-50% - 10px)); }
          }
        `}</style>

        <div style={{ position: 'relative', padding: '1.75rem 1.1rem 1rem', zIndex: 2, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 13px', background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.25)',
            color: '#FFFFFF', borderRadius: 999, fontSize: 11,
            fontWeight: 500, marginBottom: 10, letterSpacing: '1px',
          }}>
            <Heart size={12} fill="#FF8FB5" stroke="#FF8FB5" /> ADOPTED
          </div>

          <h1 style={{
            fontSize: 32, fontWeight: 500, color: '#FFFFFF',
            margin: '0 0 6px', lineHeight: 1.1, letterSpacing: '-0.5px',
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
          }}>
            Say hi to <span style={{ fontStyle: 'italic', color: '#FFD770' }}>{noriName}</span>
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.85)', fontSize: 13.5, margin: '0 auto',
            maxWidth: 440, lineHeight: 1.55,
            textShadow: '0 1px 10px rgba(0,0,0,0.3)',
          }}>
            She's ready to share everything she's learned from <span style={{ color: '#FFD770', fontWeight: 500 }}>14,264 ocean measurements</span> across 168 dive cycles.
          </p>
        </div>

        {/* Spacer for centered Nori */}
        <div style={{ height: 300 }} />

        <div style={{ position: 'relative', padding: '0 1.1rem 1.5rem', zIndex: 2 }}>
          <Glass style={{ padding: '1rem 1.1rem', marginBottom: 12, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Compass size={14} color="#FFD770" />
              <div style={{ fontSize: 13.5, fontWeight: 500, color: '#FFFFFF' }}>Your Adventure</div>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', marginBottom: 10 }}>
              Dive with {noriName} through three ocean zones. Feel how temperature shapes her mood. Learn what the real data reveals about our changing planet.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {ZONE_ORDER.map(zid => {
                const z = ZONE_CONFIG[zid];
                const Icon = z.icon;
                return (
                  <div key={zid} style={{
                    padding: '8px 6px', background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.15)',
                    borderRadius: 'var(--border-radius-md)', textAlign: 'center',
                  }}>
                    <Icon size={14} color={z.accentLight} style={{ marginBottom: 3 }} />
                    <div style={{ fontSize: 10.5, fontWeight: 500, color: '#FFFFFF' }}>{z.name.replace(' Zone', '')}</div>
                    <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>{z.depthRange}</div>
                  </div>
                );
              })}
            </div>
          </Glass>

          <Glass style={{ padding: '0.9rem 1.1rem', marginBottom: 14, textAlign: 'left' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 6 }}>
              WHAT YOU'LL UNLOCK
            </div>
            {[
              { icon: Play, text: 'Play — change the temperature and watch her react' },
              { icon: BookOpen, text: 'Learn — real EDA charts from the data' },
              { icon: Lightbulb, text: 'Fun Facts — weird and wonderful ocean trivia' },
              { icon: AlertTriangle, text: 'Risks — the real threats each zone faces' },
              { icon: LayoutDashboard, text: 'Dashboard — her live vital signs' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                <item.icon size={12} color="#FFD770" style={{ flexShrink: 0 }} />
                {item.text}
              </div>
            ))}
          </Glass>

          <button onClick={() => setScreen('explore')} style={{
            width: '100%', padding: '14px',
            background: '#FFFFFF', color: '#0A1628',
            border: 'none', borderRadius: 'var(--border-radius-md)',
            cursor: 'pointer', fontSize: 15, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 8,
          }}>
            Start your adventure <ChevronRight size={16} />
          </button>
          <button onClick={() => { setScreen('meet'); setMeetStep('customize'); }} style={{
            width: '100%', padding: '10px',
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)',
            border: '0.5px solid rgba(255,255,255,0.2)',
            borderRadius: 'var(--border-radius-md)',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>
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
    { id: 'facts', label: 'Facts', icon: Lightbulb },
    { id: 'risks', label: 'Risks', icon: AlertTriangle },
    { id: 'customize', label: 'Style', icon: Palette },
  ];

  return (
    <div style={{
      padding: 0, fontFamily: 'var(--font-sans)',
      position: 'relative', borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden', minHeight: 720,
    }}>
      <h2 className="sr-only">Explore with {noriName}</h2>
      <OceanBackdrop zoneTransition={backdropZone} />

      <div style={{ position: 'relative', padding: '1.1rem 1rem', zIndex: 1 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => setScreen('home')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)',
            border: '0.5px solid rgba(255,255,255,0.25)', color: '#FFFFFF',
            cursor: 'pointer', fontSize: 11.5, padding: '6px 11px',
            borderRadius: 999, fontWeight: 500,
          }}>
            <Home size={12} /> Home
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: '#FFFFFF', lineHeight: 1 }}>{noriName}</div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>#3901161</div>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', background: moodInfo.bg,
            border: `0.5px solid ${moodInfo.border}`, color: moodInfo.color,
            borderRadius: 999, fontSize: 11, fontWeight: 500,
          }}>
            <span>{moodInfo.emoji}</span> {moodInfo.label}
          </div>
        </div>

        {/* Tab bar — scrollable */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(20px)',
          border: '0.5px solid rgba(255,255,255,0.15)',
          padding: 3, borderRadius: 'var(--border-radius-md)',
          marginBottom: 12, overflowX: 'auto',
        }}>
          {tabs.map(t => {
            const active = exploreTab === t.id;
            return (
              <button key={t.id} onClick={() => setExploreTab(t.id)} style={{
                padding: '8px 10px', border: 'none',
                background: active ? 'rgba(255,255,255,0.95)' : 'transparent',
                color: active ? '#0A1628' : 'rgba(255,255,255,0.8)',
                borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer', fontSize: 11.5, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 5,
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                <t.icon size={12} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ===== PLAY TAB ===== */}
        {exploreTab === 'play' && (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
              background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(20px)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              padding: 3, borderRadius: 'var(--border-radius-md)', marginBottom: 10,
            }}>
              {ZONE_ORDER.map(zid => {
                const z = ZONE_CONFIG[zid];
                const Icon = z.icon;
                const active = activeZone === zid;
                return (
                  <button key={zid} onClick={() => setActiveZone(zid)} style={{
                    padding: '7px 5px', border: 'none',
                    background: active ? 'rgba(255,255,255,0.9)' : 'transparent',
                    color: active ? '#0A1628' : 'rgba(255,255,255,0.75)',
                    borderRadius: 'var(--border-radius-md)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                    <Icon size={11} /> {z.name.replace(' Zone', '')}
                  </button>
                );
              })}
            </div>

            <Glass style={{
              padding: 0, marginBottom: 10, position: 'relative',
              height: 380, overflow: 'hidden',
            }}>
              {/* SCROLLING DEPTH COLUMN — water moves up as Nori "descends" */}
              {/* The entire water column is 3x tall; we translate it upward based on zoneTransition */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: '300%',
                transform: `translateY(-${(zoneTransition / 2) * 66.67}%)`,
                transition: 'transform 0.1s linear',
                zIndex: 0,
              }}>
                {/* Three stacked zone bands */}
                {ZONE_ORDER.map((zid, idx) => {
                  const z = ZONE_CONFIG[zid];
                  return (
                    <div key={zid} style={{
                      position: 'absolute',
                      top: `${idx * 33.33}%`,
                      left: 0, right: 0, height: '33.33%',
                      background: `linear-gradient(to bottom, ${z.skyTop}, ${z.skyMid}, ${z.skyBottom})`,
                    }}>
                      {/* Floating particles within this zone band */}
                      {Array.from({ length: 15 }).map((_, i) => {
                        const seed = (idx * 50 + i * 37) % 100;
                        const depthOpacity = idx === 0 ? 0.35 : idx === 1 ? 0.25 : 0.15;
                        return (
                          <div key={i} style={{
                            position: 'absolute',
                            left: `${(seed * 1.3) % 95 + 2}%`,
                            top: `${(seed * 2.7) % 95 + 2}%`,
                            width: 2 + (i % 3),
                            height: 2 + (i % 3),
                            borderRadius: '50%',
                            background: idx === 2 && i % 3 === 0 ? '#42E0B3' : '#FFFFFF',
                            opacity: depthOpacity,
                            animation: `particleDrift${idx}-${i} ${4 + (i % 4)}s ease-in-out infinite`,
                          }} />
                        );
                      })}

                      {/* Caustic rays — only in sunlight zone */}
                      {idx === 0 && [0, 1, 2, 3].map(i => (
                        <div key={i} style={{
                          position: 'absolute',
                          top: 0, height: '100%',
                          left: `${i * 28 + 5}%`, width: '10%',
                          background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)',
                          transform: 'skewX(-5deg)',
                        }} />
                      ))}

                      {/* Bioluminescence in midnight zone */}
                      {idx === 2 && Array.from({ length: 8 }).map((_, i) => {
                        const seed = (i * 41) % 100;
                        return (
                          <div key={`bio-${i}`} style={{
                            position: 'absolute',
                            left: `${(seed * 1.7) % 90 + 5}%`,
                            top: `${(seed * 2.3) % 90 + 5}%`,
                            width: 3, height: 3, borderRadius: '50%',
                            background: '#42E0B3',
                            boxShadow: '0 0 6px #42E0B3',
                            animation: `bioPulse 2s ease-in-out infinite`,
                            animationDelay: `${i * 0.3}s`,
                          }} />
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Rising bubbles — continuous flow upward to sell the descent illusion */}
              <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden',
                zIndex: 1, pointerEvents: 'none',
              }}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const left = 10 + (i * 7.5) % 80;
                  const size = 3 + (i % 4);
                  const speed = 3 + (i % 4) * 1.5;
                  return (
                    <div key={i} style={{
                      position: 'absolute',
                      left: `${left}%`,
                      bottom: '-10px',
                      width: size, height: size, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.35)',
                      animation: `bubbleRise${i} ${speed}s linear infinite`,
                      animationDelay: `${i * 0.4}s`,
                    }} />
                  );
                })}
              </div>

              <style>{`
                ${ZONE_ORDER.map((_, idx) =>
                  Array.from({ length: 15 }).map((_, i) => `
                    @keyframes particleDrift${idx}-${i} {
                      0%, 100% { transform: translate(0, 0); }
                      50% { transform: translate(${(i % 2 ? 1 : -1) * 8}px, ${((i % 3) - 1) * 6}px); }
                    }
                  `).join('')
                ).join('')}
                @keyframes bioPulse {
                  0%, 100% { opacity: 0.3; transform: scale(0.8); }
                  50% { opacity: 1; transform: scale(1.3); }
                }
                ${Array.from({ length: 12 }).map((_, i) => `
                  @keyframes bubbleRise${i} {
                    0% { bottom: -10px; opacity: 0; transform: translateX(0); }
                    10% { opacity: 0.6; }
                    90% { opacity: 0.6; }
                    100% { bottom: 110%; opacity: 0; transform: translateX(${(i % 2 ? 1 : -1) * 10}px); }
                  }
                `).join('')}
              `}</style>

              {/* Depth ruler — left edge, static so you can see Nori's current depth relative to scale */}
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0, width: 42,
                pointerEvents: 'none', zIndex: 3,
                background: 'linear-gradient(to right, rgba(0,0,0,0.25), transparent)',
              }}>
                {[
                  { label: '0m', pct: 0 },
                  { label: '200m', pct: 10 },
                  { label: '1000m', pct: 50 },
                  { label: '2000m', pct: 100 },
                ].map((m, i) => (
                  <div key={i} style={{
                    position: 'absolute', top: `${m.pct}%`,
                    left: 0, right: 0,
                    transform: m.pct === 100 ? 'translateY(-100%)' : m.pct === 0 ? 'translateY(0)' : 'translateY(-50%)',
                    fontSize: 9, color: 'rgba(255,255,255,0.65)',
                    fontFamily: 'var(--font-mono)', paddingLeft: 8,
                    borderLeft: '0.5px solid rgba(255,255,255,0.3)',
                    paddingTop: 2, paddingBottom: 2,
                  }}>
                    {m.label}
                  </div>
                ))}
                {/* Current depth indicator — little arrow that slides down the ruler */}
                <div style={{
                  position: 'absolute',
                  top: `${(zoneTransition / 2) * 100}%`,
                  left: 0,
                  transform: 'translateY(-50%)',
                  transition: 'top 0.1s linear',
                  width: 0, height: 0,
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderLeft: '7px solid #FFD770',
                  filter: 'drop-shadow(0 0 4px rgba(255,215,112,0.7))',
                }} />
              </div>

              {/* Zone label — top (fades based on which zone you're near) */}
              <div style={{
                position: 'absolute', top: 12, left: 50, zIndex: 3,
                fontSize: 10, color: 'rgba(255,255,255,0.8)',
                letterSpacing: '1px', fontWeight: 500,
                background: 'rgba(0,0,0,0.35)',
                padding: '4px 9px',
                borderRadius: 999,
                backdropFilter: 'blur(10px)',
                border: '0.5px solid rgba(255,255,255,0.2)',
              }}>
                {zone.name.toUpperCase()}
              </div>

              {/* Live depth readout — right */}
              <div style={{
                position: 'absolute', top: 12, right: 14, zIndex: 3,
                fontSize: 10, color: 'rgba(255,255,255,0.8)',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(0,0,0,0.35)',
                padding: '4px 9px',
                borderRadius: 999,
                backdropFilter: 'blur(10px)',
                border: '0.5px solid rgba(255,255,255,0.2)',
              }}>
                ~{zoneDepth}m
              </div>

              {/* NORI — STAYS CENTERED, world moves past her */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
              }}>
                <NoriAvatar moodState={moodState} size={200} customization={customization} />
              </div>

              {/* Zone description — bottom */}
              <div style={{
                position: 'absolute', bottom: 12, left: 50, right: 14, zIndex: 3,
                fontSize: 11.5, color: 'rgba(255,255,255,0.9)',
                fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4,
                background: 'rgba(0,0,0,0.3)',
                padding: '6px 12px',
                borderRadius: 'var(--border-radius-md)',
                backdropFilter: 'blur(10px)',
                border: '0.5px solid rgba(255,255,255,0.15)',
              }}>
                {zone.description}
              </div>
            </Glass>

            <Glass style={{ padding: '0.8rem 1rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', fontWeight: 500 }}>
                  <Thermometer size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />
                  TEMPERATURE
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 500, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{currentTemp.toFixed(1)}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>°C</span>
                </div>
              </div>
              <div style={{ position: 'relative', marginBottom: 5 }}>
                {(() => {
                  const total = zone.sliderMax - zone.sliderMin;
                  const cs = Math.max(zone.sliderMin, HISTORICAL_MEAN - TOLERANCE);
                  const ce = Math.min(zone.sliderMax, HISTORICAL_MEAN + TOLERANCE);
                  if (ce <= zone.sliderMin || cs >= zone.sliderMax) return null;
                  return (
                    <div style={{
                      position: 'absolute', top: 13,
                      left: `${((cs - zone.sliderMin) / total) * 100}%`,
                      width: `${((ce - cs) / total) * 100}%`,
                      height: 8, background: 'rgba(47,224,159,0.3)',
                      border: '0.5px solid rgba(47,224,159,0.5)',
                      borderRadius: 4, pointerEvents: 'none',
                    }} />
                  );
                })()}
                <input type="range" min={zone.sliderMin} max={zone.sliderMax} step="0.1"
                  value={currentTemp}
                  onChange={e => setZoneTemps({ ...zoneTemps, [activeZone]: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: moodInfo.color }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>
                <span>{zone.sliderMin.toFixed(1)}° min</span>
                <span style={{ color: '#9FE9C4' }}>■ comfort ±1° of {HISTORICAL_MEAN}°</span>
                <span>{zone.sliderMax.toFixed(1)}° max</span>
              </div>
            </Glass>

            <Glass style={{ padding: '11px 13px', borderLeft: `2px solid ${zone.accentLight}`, borderRadius: '0 var(--border-radius-md) var(--border-radius-md) 0', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
              <Info size={13} style={{ color: zone.accentLight, flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic' }}>
                {zone.fact}
              </div>
            </Glass>
          </>
        )}

        {/* ===== DASHBOARD TAB ===== */}
        {exploreTab === 'dashboard' && (
          <div>
            {/* Hero mini avatar */}
            <Glass style={{ padding: '0.7rem 1rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flexShrink: 0 }}>
                <NoriAvatar moodState={moodState} size={90} customization={customization} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '1px', fontWeight: 500 }}>LIVE STATUS</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#FFFFFF', marginTop: 2 }}>{noriName} is {moodInfo.label.toLowerCase()}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                  In the {zone.name.toLowerCase()} at {currentTemp.toFixed(1)}°C
                </div>
              </div>
            </Glass>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
              {[
                { label: 'TOTAL READINGS', value: '14,264', sub: 'across 168 cycles', color: '#FFD770', icon: Activity },
                { label: 'ANOMALY', value: `${moodState.anomaly > 0 ? '+' : ''}${moodState.anomaly.toFixed(2)}°C`, sub: `vs ${HISTORICAL_MEAN}°C baseline`, color: moodInfo.color, icon: TrendingUp },
                { label: 'WARMING RATE', value: `+${TREND_SLOPE}°/cycle`, sub: 'surface temp trend', color: '#FF8A5C', icon: TrendingUp },
                { label: 'DEPTH RECORD', value: '2,000m', sub: 'max dive depth', color: '#42C5E0', icon: Droplet },
              ].map((s, i) => (
                <Glass key={i} style={{ padding: '10px 11px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: s.color, opacity: 0.7 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <s.icon size={10} color="rgba(255,255,255,0.6)" />
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px' }}>{s.label}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{s.sub}</div>
                </Glass>
              ))}
            </div>

            {/* Mood distribution by zone */}
            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', fontWeight: 500, marginBottom: 10 }}>
                MOOD BREAKDOWN · ALL ZONES
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

            {/* Live vitals */}
            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', fontWeight: 500, marginBottom: 10 }}>
                LIVE VITALS
              </div>
              {[
                { label: 'Temperature', value: currentTemp, min: 0, max: 20, unit: '°C', color: '#FFAB42' },
                { label: 'Salinity', value: zone.salBaseline, min: 33, max: 35, unit: 'PSU', color: '#5FB3F0' },
                { label: 'Depth', value: zoneDepth, min: 0, max: 2000, unit: 'm', color: '#9B8EF0' },
              ].map((v, i) => {
                const pct = ((v.value - v.min) / (v.max - v.min)) * 100;
                return (
                  <div key={i} style={{ marginBottom: i < 2 ? 9 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{v.label}</span>
                      <span style={{ fontSize: 11, color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{typeof v.value === 'number' ? v.value.toFixed(1) : v.value} {v.unit}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: `linear-gradient(90deg, ${v.color}80, ${v.color})`,
                        boxShadow: `0 0 8px ${v.color}80`,
                        transition: 'width 0.5s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </Glass>

            {/* Achievements */}
            <Glass style={{ padding: '0.9rem 1rem' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', fontWeight: 500, marginBottom: 10 }}>
                ACHIEVEMENTS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[
                  { emoji: '🌊', label: 'First Dive', unlocked: true },
                  { emoji: '🔥', label: 'Felt the Heat', unlocked: moodState.mood === 'sweating' },
                  { emoji: '❄️', label: 'Deep Chill', unlocked: moodState.mood === 'shivering' },
                  { emoji: '😊', label: 'Comfort Found', unlocked: moodState.mood === 'happy' },
                  { emoji: '🌞', label: 'Surface Dweller', unlocked: activeZone === 'sunlight' },
                  { emoji: '🌑', label: 'Abyss Explorer', unlocked: activeZone === 'midnight' },
                ].map((a, i) => (
                  <div key={i} style={{
                    padding: '9px 5px', textAlign: 'center',
                    background: a.unlocked ? 'rgba(255,215,112,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${a.unlocked ? 'rgba(255,215,112,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 'var(--border-radius-md)',
                    opacity: a.unlocked ? 1 : 0.45,
                  }}>
                    <div style={{ fontSize: 22 }}>{a.emoji}</div>
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
                {noriName} measured <span style={{ color: '#FFD770', fontWeight: 500 }}>14,264 data points</span> across 168 cycles. Here's what she discovered.
              </div>
            </Glass>

            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Thermometer size={14} color="#FFD770" />
                <div style={{ fontSize: 13.5, fontWeight: 500, color: '#FFFFFF' }}>The Thermocline</div>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginBottom: 10, lineHeight: 1.5 }}>
                Temperature plummets ~9°C in the top 200m, then stabilizes near 3°C. This boundary separates warm sunlit water from the cold deep.
              </div>
              <ThermoclineChart highlightDepth={zoneDepth} />
            </Glass>

            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <TrendingUp size={14} color="#FF8A5C" />
                <div style={{ fontSize: 13.5, fontWeight: 500, color: '#FFFFFF' }}>Is the Ocean Warming?</div>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginBottom: 10, lineHeight: 1.5 }}>
                Surface temps across 168 cycles trend <span style={{ color: '#FF8A5C', fontWeight: 500 }}>+0.0042°C per cycle</span>. Small numbers, compounding.
              </div>
              <CycleTrendChart />
            </Glass>

            <Glass style={{ padding: '0.9rem 1rem', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Droplet size={14} color="#42E0B3" />
                <div style={{ fontSize: 13.5, fontWeight: 500, color: '#FFFFFF' }}>Salinity Sinks</div>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginBottom: 10, lineHeight: 1.5 }}>
                Fresher surface water (33.4 PSU) floats above denser deep water (34.5 PSU). This density gradient drives global circulation.
              </div>
              <SalinityChart />
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
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        padding: '8px 10px', marginBottom: 5,
                        background: 'rgba(255,255,255,0.05)',
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        borderRadius: 'var(--border-radius-md)',
                      }}>
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
                    There are over 4,000 Argo floats like {noriName} drifting in the world's oceans right now, all collecting data to help us understand climate change.
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
                Every zone {noriName} visits is under pressure. Here's what's at stake.
              </div>
            </Glass>

            {ZONE_ORDER.map(zid => {
              const z = ZONE_CONFIG[zid];
              const Icon = z.icon;
              return (
                <Glass key={zid} style={{ padding: '0.95rem 1rem', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                    <Icon size={14} color={z.accentLight} />
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>{z.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>{z.depthRange}</div>
                  </div>
                  {z.risks.map((r, i) => (
                    <div key={i} style={{
                      padding: '9px 11px', marginBottom: 5,
                      background: 'rgba(255,138,92,0.08)',
                      borderLeft: '2px solid rgba(255,138,92,0.5)',
                      borderRadius: '0 var(--border-radius-md) var(--border-radius-md) 0',
                    }}>
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: '#FFB299', marginBottom: 3 }}>⚠  {r.title}</div>
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
                    <button key={c.id} onClick={() => setCustomization({ ...customization, bodyColor: c.id })} style={{
                      padding: '7px 6px',
                      background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)',
                      color: active ? '#0A1628' : '#FFFFFF',
                      border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: 'var(--border-radius-md)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${c.accent}, ${c.color}, ${c.dark})`,
                        border: '0.5px solid rgba(0,0,0,0.2)',
                      }} />
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
                  return (
                    <button key={h.id} onClick={() => setCustomization({ ...customization, hat: h.id })} style={{
                      padding: '9px 6px',
                      background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)',
                      color: active ? '#0A1628' : '#FFFFFF',
                      border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: 'var(--border-radius-md)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 500,
                    }}>{h.name}</button>
                  );
                })}
              </div>
            </Glass>

            <Glass style={{ padding: '0.85rem 1rem', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', fontWeight: 500, marginBottom: 9 }}>ACCESSORY</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {ACCESSORY_OPTIONS.map(a => {
                  const active = customization.accessory === a.id;
                  return (
                    <button key={a.id} onClick={() => setCustomization({ ...customization, accessory: a.id })} style={{
                      padding: '9px 6px',
                      background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)',
                      color: active ? '#0A1628' : '#FFFFFF',
                      border: `0.5px solid ${active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: 'var(--border-radius-md)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 500,
                    }}>{a.name}</button>
                  );
                })}
              </div>
            </Glass>

            <button onClick={() => setCustomization({ hat: 'none', accessory: 'none', bodyColor: 'ocean' })} style={{
              width: '100%', padding: '10px',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.85)',
              border: '0.5px solid rgba(255,255,255,0.2)',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
            }}>
              Reset
            </button>
          </div>
        )}

        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 12, letterSpacing: '0.5px' }}>
          {noriName.toUpperCase()} · 14,264 READINGS · 168 CYCLES · CALCOFI {HISTORICAL_MEAN}°C
        </div>
      </div>
    </div>
  );
}
