import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, Cell, ReferenceLine, PieChart, Pie } from 'recharts';

// ============================================================================
// TABLEAU DE BORD ÉCONOMIQUE CFTC - STYLE "BULLE" MODERNISÉ
// ============================================================================

// CSS pour masquer la scrollbar tout en gardant le scroll
const scrollbarHideStyle = `
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  @keyframes pulseAlerte {
    0%, 100% { border-left-color: #ef4444; opacity: 1; }
    50%       { border-left-color: #fca5a5; opacity: 0.75; }
  }
  .carte-alerte { animation: pulseAlerte 1.2s ease-in-out infinite; }
  .group-hover-opacity:hover .show-on-hover { opacity: 1 !important; }
`;

// Palette de couleurs modernisée (style bulle)
const C = { 
  primary: '#3b82f6',   // Bleu plus vif
  secondary: '#ef4444', // Rouge vif
  tertiary: '#22c55e',  // Vert vif
  quaternary: '#f59e0b', // Orange/Ambre
  pink: '#ec4899', 
  purple: '#8b5cf6', 
  cyan: '#06b6d4', 
  gray: '#6b7280' 
};

// Configuration des couleurs pour les graphiques selon le mode
const getChartColors = (darkMode) => ({
  grid: darkMode ? '#374151' : '#e5e7eb',
  axis: darkMode ? '#9ca3af' : '#6b7280',
  text: darkMode ? '#e5e7eb' : '#374151',
  tooltipBg: darkMode ? '#1f2937' : '#ffffff',
  tooltipBorder: darkMode ? '#374151' : '#e5e7eb',
});

// ==================== COMPOSANT SPARKLINE ====================
// Sparkline barres verticales — Style B
function SparklineBars({ data, color }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => typeof d === 'object' ? d.value : d).filter(v => v != null && !isNaN(v));
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // On étire les hauteurs entre 8% et 100% pour maximiser la lisibilité
  // même quand les variations sont faibles (ex: chômage 7.1 → 7.7)
  const toH = (v) => Math.round(8 + ((v - min) / range) * 92);

  const bars = values.slice(-12);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '32px', width: '100%' }}>
      {bars.map((v, i) => {
        const isLast = i === bars.length - 1;
        return (
          <div key={i} style={{
            flex: 1,
            height: `${toH(v)}%`,
            borderRadius: '2px 2px 0 0',
            background: color,
            opacity: isLast ? 1 : 0.35 + (i / bars.length) * 0.45,
            transition: 'height 0.3s ease',
          }} />
        );
      })}
    </div>
  );
}

// ==================== COMPOSANT KPI STYLE B ====================
function BubbleKpi({ label, value, status, darkMode, tooltip, sparklineData, invertTrend = false, alerte = false, note = '' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  let trend = 'stable';
  if (sparklineData && sparklineData.length >= 2) {
    const vals = sparklineData.filter(v => v != null && !isNaN(v));
    if (vals.length >= 2) {
      const last = vals[vals.length - 1];
      const prev = vals[vals.length - 2];
      if (last > prev) trend = invertTrend ? 'down' : 'up';
      else if (last < prev) trend = invertTrend ? 'up' : 'down';
    }
  }

  const palette = {
    good:    { accent: '#22c55e', badgeBg: '#dcfce7', badgeText: '#15803d', bar: '#22c55e' },
    neutral: { accent: '#3b82f6', badgeBg: '#dbeafe', badgeText: '#1d4ed8', bar: '#3b82f6' },
    warning: { accent: '#f97316', badgeBg: '#ffedd5', badgeText: '#c2410c', bar: '#f97316' },
    bad:     { accent: '#ef4444', badgeBg: '#fee2e2', badgeText: '#b91c1c', bar: '#ef4444' },
  };
  const p = alerte ? { accent: '#ef4444', badgeBg: '#fee2e2', badgeText: '#b91c1c', bar: '#ef4444' } : (palette[status] || palette.neutral);

  const trendLabel = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—';
  const trendBg   = trend === 'up' ? '#dcfce7' : trend === 'down' ? '#fee2e2' : darkMode ? '#374151' : '#f3f4f6';
  const trendText = trend === 'up' ? '#15803d' : trend === 'down' ? '#b91c1c' : darkMode ? '#9ca3af' : '#6b7280';

  return (
    <div
      className={alerte ? 'carte-alerte' : ''}
      style={{
        background: darkMode ? '#1f2937' : '#ffffff',
        border: `0.5px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
        borderLeft: `3px solid ${p.accent}`,
        borderRadius: '12px',
        padding: '10px 12px 8px',
        position: 'relative',
        cursor: 'help',
        transition: 'transform 0.15s, box-shadow 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='scale(1.02)'; setShowTooltip(true); }}
      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; setShowTooltip(false); }}
    >
      {/* Badge alerte */}
      {alerte && (
        <span style={{
          position: 'absolute', top: '6px', right: '8px',
          fontSize: '9px', fontWeight: 700,
          background: '#ef4444', color: '#fff',
          padding: '1px 5px', borderRadius: '99px',
          letterSpacing: '0.04em',
        }}>⚠ SEUIL</span>
      )}

      {/* Label */}
      <span style={{ fontSize: '11px', color: darkMode ? '#9ca3af' : '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: alerte ? '50px' : '0' }}>
        {label}
      </span>

      {/* Valeur + badge tendance */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '20px', fontWeight: 600, color: alerte ? '#ef4444' : darkMode ? '#f9fafb' : '#111827', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value}
        </span>
        <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '99px', background: trendBg, color: trendText, flexShrink: 0 }}>
          {trendLabel}
        </span>
      </div>

      {/* Note personnelle */}
      {note && (
        <span style={{
          fontSize: '10px', color: darkMode ? '#6b7280' : '#9ca3af',
          fontStyle: 'italic', lineHeight: 1.4,
          borderTop: `0.5px solid ${darkMode ? '#374151' : '#f3f4f6'}`,
          paddingTop: '4px', marginTop: '2px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          📝 {note}
        </span>
      )}

      {/* Barres sparkline */}
      {sparklineData && sparklineData.length >= 2 && (
        <div style={{ marginTop: '2px' }}>
          <SparklineBars data={sparklineData} color={p.bar} />
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div style={{
          position: 'absolute', zIndex: 50, bottom: 'calc(100% + 6px)',
          left: '50%', transform: 'translateX(-50%)',
          background: darkMode ? '#374151' : '#1f2937', color: '#f9fafb',
          fontSize: '11px', padding: '6px 10px', borderRadius: '8px',
          whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          {tooltip}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: '4px', borderStyle: 'solid',
            borderColor: `${darkMode ? '#374151' : '#1f2937'} transparent transparent transparent`,
          }} />
        </div>
      )}
    </div>
  );
}

// ==================== COMPOSANT NAVIGATION STYLE BULLE ====================
function BubbleNavTabs({ tabs, activeTab, setActiveTab, darkMode }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (ref) ref.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  return (
    <div className={`relative rounded-2xl p-1.5 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className={`hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-xl shadow transition-all ${
            darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          ◀
        </button>
      )}

      <div 
        ref={scrollRef}
        className={`flex gap-1 overflow-x-auto scrollbar-hide ${showLeft ? 'md:ml-10' : ''} ${showRight ? 'md:mr-10' : ''}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === id
                ? 'bg-blue-600 text-white shadow-lg'
                : darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showRight && (
        <button
          onClick={() => scroll('right')}
          className={`hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-xl shadow transition-all ${
            darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          ▶
        </button>
      )}
    </div>
  );
}

// ==================== COMPOSANT CARD STYLE BULLE ====================
function Card({ title, children, darkMode, noPadding = false, favoriId, isFavori, toggleFavori }) {
  return (
    <div className={`rounded-2xl overflow-hidden shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`px-4 py-3 border-b flex items-center gap-3 ${
        darkMode ? 'border-gray-700' : 'border-gray-100 bg-gray-50'
      }`}>
        <h3 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {title}
        </h3>
        {favoriId && toggleFavori && (
          <FavoriButton id={favoriId} isFavori={!!isFavori} toggleFavori={toggleFavori} darkMode={darkMode} />
        )}
      </div>
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
}

// ==================== HOOK FAVORIS ====================
function useFavoris() {
  const [favoris, setFavoris] = useState(() => {
    try { const s = localStorage.getItem('cftc_favoris'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [seuils, setSeuils] = useState(() => {
    try { const s = localStorage.getItem('cftc_seuils'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [notes, setNotes] = useState(() => {
    try { const s = localStorage.getItem('cftc_notes'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  const toggleFavori = (id) => {
    setFavoris(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('cftc_favoris', JSON.stringify(next));
      return next;
    });
  };

  const setSeuil = (id, valeur, direction) => {
    setSeuils(prev => {
      const next = valeur === '' ? { ...prev } : { ...prev, [id]: { valeur: parseFloat(valeur), direction } };
      if (valeur === '') delete next[id];
      localStorage.setItem('cftc_seuils', JSON.stringify(next));
      return next;
    });
  };

  const setNote = (id, texte) => {
    setNotes(prev => {
      const next = texte.trim() === '' ? { ...prev } : { ...prev, [id]: texte };
      if (texte.trim() === '') delete next[id];
      localStorage.setItem('cftc_notes', JSON.stringify(next));
      return next;
    });
  };

  const isFavori = (id) => favoris.includes(id);
  const getSeuil = (id) => seuils[id] || null;
  const getNote  = (id) => notes[id]  || '';

  // Vérifie si la valeur numérique déclenche le seuil
  const isEnAlerte = (id, rawValue) => {
    const s = seuils[id];
    if (!s) return false;
    const num = parseFloat(String(rawValue).replace(/[^0-9.,\-]/g, '').replace(',', '.'));
    if (isNaN(num)) return false;
    return s.direction === 'sup' ? num > s.valeur : num < s.valeur;
  };

  return { favoris, toggleFavori, isFavori, setSeuil, getSeuil, setNote, getNote, isEnAlerte };
}

// ==================== HOOK HEADER KPIs PERSONNALISABLES ====================
const HEADER_KPIS_DEFAULT = ['pib_trim', 'climat_affaires', 'chomage', 'inflation', 'smic_net', 'defaillances'];
const HEADER_KPIS_MAX = 6;

function useHeaderKpis() {
  const [headerKpis, setHeaderKpis] = useState(() => {
    try {
      const s = localStorage.getItem('cftc_header_kpis');
      const parsed = s ? JSON.parse(s) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : HEADER_KPIS_DEFAULT;
    } catch { return HEADER_KPIS_DEFAULT; }
  });

  const setAndSave = (ids) => {
    const next = ids.slice(0, HEADER_KPIS_MAX);
    setHeaderKpis(next);
    localStorage.setItem('cftc_header_kpis', JSON.stringify(next));
  };

  const toggleHeaderKpi = (id) => {
    setAndSave(
      headerKpis.includes(id)
        ? headerKpis.filter(k => k !== id)
        : headerKpis.length < HEADER_KPIS_MAX ? [...headerKpis, id] : headerKpis
    );
  };

  return { headerKpis, toggleHeaderKpi };
}
function buildCatalogue(d) {
  if (!d) return [];

  // Construit une série en combinant historique statique + valeur actuelle
  const serie = (hist, current) => {
    const s = [...hist];
    if (current != null && !isNaN(parseFloat(current)) && s[s.length-1] !== parseFloat(current))
      s.push(parseFloat(current));
    return s;
  };

  return [
    // === CONJONCTURE ===
    { id: 'pib_trim', categorie: '📈 Conjoncture', label: 'PIB trimestriel',
      getValue: d => d.pib?.croissance_trim_actuel != null ? `+${d.pib.croissance_trim_actuel}%` : '—',
      getSparkline: d => { const h = d.pib?.evolution?.map(e=>e.croissance)||[]; return h.length>=4 ? h.slice(-12) : serie([-0.1,0.2,0.4,0.5,0.2,0.1,0.5,0.3,0.4,0.1,0.3], d.pib?.croissance_trim_actuel); },
      getStatus: d => (d.pib?.croissance_trim_actuel||0) >= 0 ? 'good' : 'bad',
      tooltip: 'Croissance T/T-1 du PIB volume' },
    { id: 'climat_affaires', categorie: '📈 Conjoncture', label: 'Climat affaires',
      getValue: d => d.indicateurs_cles?.climat_affaires ?? d.climat_affaires?.valeur_actuelle ?? '—',
      getSparkline: d => {
        const h = (d.climat_affaires?.evolution || d.conjoncture?.climat_affaires?.evolution || []).map(e => e.climat);
        return h.length >= 4 ? h.slice(-12) : serie([100,99,97,94,97,95,100,97,96,99,97], d.indicateurs_cles?.climat_affaires);
      },
      getStatus: () => 'neutral',
      tooltip: 'Indice INSEE (100 = moyenne long terme)' },
    { id: 'confiance_menages', categorie: '📈 Conjoncture', label: 'Confiance ménages',
      getValue: d => d.climat_affaires?.confiance_menages ?? d.conjoncture?.climat_affaires?.confiance_menages ?? '—',
      getSparkline: d => {
        const h = (d.climat_affaires?.evolution || d.conjoncture?.climat_affaires?.evolution || []).map(e => e.menages);
        return h.length >= 4 ? h.slice(-12) : serie([91,90,91,93,92,91,89,90,90,91,91], d.climat_affaires?.confiance_menages);
      },
      getStatus: d => ((d.climat_affaires?.confiance_menages || d.conjoncture?.climat_affaires?.confiance_menages || 0)) >= 100 ? 'good' : 'warning',
      tooltip: 'Indicateur de confiance des ménages INSEE' },
    { id: 'defaillances', categorie: '📈 Conjoncture', label: 'Défaillances',
      getValue: d => d.indicateurs_cles?.defaillances_12m ? `${(d.indicateurs_cles.defaillances_12m/1000).toFixed(1)}k` : '—',
      getSparkline: d => { const h = d.conjoncture?.defaillances?.evolution?.map(e=>e.cumul)||[]; const actuel=d.indicateurs_cles?.defaillances_12m; return h.length>=4 ? h.slice(-12) : serie([42000,47000,51000,55000,57500,60000,63500,66000,66500,67000,67600], actuel); },
      getStatus: () => 'bad',
      tooltip: 'Défaillances d\'entreprises sur 12 mois', invertTrend: true },

    // === EMPLOI ===
    { id: 'chomage', categorie: '👥 Emploi', label: 'Chômage',
      getValue: d => d.indicateurs_cles?.taux_chomage_actuel != null ? `${d.indicateurs_cles.taux_chomage_actuel}%` : '—',
      getSparkline: d => { const h = d.chomage?.map(c=>c.taux)||[]; return h.length>=4 ? h.slice(-12) : serie([7.1,7.2,7.4,7.5,7.5,7.3,7.4,7.3,7.4,7.5,7.7], d.indicateurs_cles?.taux_chomage_actuel); },
      getStatus: d => (d.indicateurs_cles?.taux_chomage_actuel||10) < 7.5 ? 'good' : 'warning',
      tooltip: 'Taux de chômage BIT France métropolitaine', invertTrend: true },
    { id: 'chomage_jeunes', categorie: '👥 Emploi', label: 'Chômage jeunes',
      getValue: d => { const last = d.chomage?.slice(-1)[0]; return last ? `${last.jeunes}%` : '—'; },
      getSparkline: d => { const h = d.chomage?.map(c=>c.jeunes)||[]; return h.length>=4 ? h.slice(-12) : serie([17.5,17.0,17.6,17.6,18.1,17.7,18.3,19.0,18.5,18.8,19.2], null); },
      getStatus: () => 'bad',
      tooltip: 'Taux de chômage des moins de 25 ans', invertTrend: true },
    { id: 'emploi_seniors', categorie: '👥 Emploi', label: 'Emploi seniors',
      getValue: d => { const last = d.emploi_seniors?.slice(-1)[0]; return last ? `${last.taux}%` : '—'; },
      getSparkline: d => { const h = d.emploi_seniors?.map(e=>e.taux)||[]; return h.length>=4 ? h.slice(-12) : serie([56.5,57.0,57.5,58.4,59.0,59.6,60.2,60.4,60.8,61.1,61.5], null); },
      getStatus: () => 'neutral',
      tooltip: 'Taux d\'emploi des 55-64 ans' },

    // === SALAIRES ===
    { id: 'smic_net', categorie: '💵 Salaires', label: 'SMIC net',
      getValue: d => d.indicateurs_cles?.smic_net ? `${d.indicateurs_cles.smic_net}€` : '—',
      getSparkline: d => serie([1185,1204,1219,1231,1258,1302,1329,1353,1383,1399,1427,1437], d.indicateurs_cles?.smic_net),
      getStatus: () => 'neutral',
      tooltip: 'SMIC mensuel net en vigueur' },
    { id: 'inflation', categorie: '💵 Salaires', label: 'Inflation',
      getValue: d => d.indicateurs_cles?.inflation_annuelle != null ? `${d.indicateurs_cles.inflation_annuelle}%` : '—',
      getSparkline: d => { const h = d.inflation_annuelle?.map(e=>e.inflation)||[]; return h.length>=4 ? h.slice(-12) : serie([0.5,1.6,5.2,4.9,4.0,2.3,1.8,1.5,1.2,1.0,0.9], d.indicateurs_cles?.inflation_annuelle); },
      getStatus: d => (d.indicateurs_cles?.inflation_annuelle||5) < 2 ? 'good' : 'warning',
      tooltip: 'Glissement annuel de l\'IPC', invertTrend: true },
    { id: 'ecart_hf', categorie: '💵 Salaires', label: 'Écart H/F',
      getValue: d => d.ecart_hf?.ecart_global ? `${d.ecart_hf.ecart_global}%` : '—',
      getSparkline: d => { const h = d.ecart_hf?.evolution?.map(e=>e.ecart)||[]; return h.length>=4 ? h : serie([18.4,16.6,16.1,15.5,14.9,14.2,14.0,14.0], d.ecart_hf?.ecart_eqtp); },
      getStatus: () => 'bad',
      tooltip: 'Écart salarial global hommes/femmes', invertTrend: true },
    { id: 'salaire_median', categorie: '💵 Salaires', label: 'Salaire médian',
      getValue: d => d.salaire_median?.montant_2024 ? `${d.salaire_median.montant_2024}€` : '—',
      getSparkline: d => { const h = d.salaire_median?.evolution?.map(e=>e.montant)||[]; return h.length>=4 ? h : serie([1800,1850,1900,1940,1960,2010,2090,2091], d.salaire_median?.montant_2024); },
      getStatus: () => 'neutral',
      tooltip: 'Salaire médian net mensuel' },

    // === CONDITIONS DE VIE ===
    { id: 'irl', categorie: '🏠 Conditions de vie', label: 'IRL (loyers)',
      getValue: d => d.irl?.glissement_annuel != null ? `+${d.irl.glissement_annuel}%` : '—',
      getSparkline: d => { const h = d.irl?.evolution?.map(e=>e.glissement)||[]; return h.length>=4 ? h.slice(-12) : serie([0.9,2.48,3.60,3.49,3.50,3.49,3.50,3.26,2.47,1.82,1.40], d.irl?.glissement_annuel); },
      getStatus: d => (d.irl?.glissement_annuel||5) < 2 ? 'good' : 'warning',
      tooltip: 'Glissement annuel de l\'Indice de Référence des Loyers', invertTrend: true },
    { id: 'gazole', categorie: '🏠 Conditions de vie', label: 'Gazole',
      getValue: d => d.carburants?.gazole?.prix ? `${d.carburants.gazole.prix}€/L` : '—',
      getSparkline: d => { const h = d.carburants?.evolution?.map(e=>e.gazole)||[]; return h.length>=4 ? h : serie([1.85,1.78,1.72,1.88,1.72,1.75,1.68,1.62,1.65,1.60,1.58], d.carburants?.gazole?.prix); },
      getStatus: d => (d.carburants?.gazole?.variation_an||0) < 0 ? 'good' : 'warning',
      tooltip: 'Prix moyen du gazole en France', invertTrend: true },
    { id: 'sp95', categorie: '🏠 Conditions de vie', label: 'SP95',
      getValue: d => d.carburants?.sp95?.prix ? `${d.carburants.sp95.prix}€/L` : '—',
      getSparkline: d => { const h = d.carburants?.evolution?.map(e=>e.sp95)||[]; return h.length>=4 ? h : serie([1.82,1.88,1.85,1.92,1.78,1.82,1.75,1.72,1.78,1.74,1.70], d.carburants?.sp95?.prix); },
      getStatus: d => (d.carburants?.sp95?.variation_an||0) < 0 ? 'good' : 'warning',
      tooltip: 'Prix moyen du SP95 en France', invertTrend: true },

    // === MARCHÉS FINANCIERS ===
    { id: 'oat_10ans', categorie: '💹 Marchés financiers', label: 'OAT 10 ans',
      getValue: d => d.marches_financiers?.oat_10ans?.valeur != null ? `${d.marches_financiers.oat_10ans.valeur}%` : '—',
      getSparkline: d => d.marches_financiers?.oat_10ans?.historique?.slice(-20)?.map(p=>p.valeur) || serie([0.13,-0.15,0.04,1.73,3.12,2.98,3.10,3.025], d.marches_financiers?.oat_10ans?.valeur),
      getStatus: () => 'neutral',
      tooltip: 'Taux de l\'OAT française à 10 ans' },
    { id: 'cac40', categorie: '💹 Marchés financiers', label: 'CAC 40',
      getValue: d => d.marches_financiers?.cac40?.valeur != null ? d.marches_financiers.cac40.valeur.toLocaleString('fr-FR') : '—',
      getSparkline: d => d.marches_financiers?.cac40?.historique?.slice(-20)?.map(p => p.valeur),
      getStatus: d => (d.marches_financiers?.cac40?.variations?.jour||0) >= 0 ? 'good' : 'bad',
      tooltip: 'Indice CAC 40 (clôture)' },
    { id: 'eurusd', categorie: '💹 Marchés financiers', label: 'EUR/USD',
      getValue: d => d.marches_financiers?.eurusd?.valeur ?? '—',
      getSparkline: d => d.marches_financiers?.eurusd?.historique?.slice(-20)?.map(p => p.valeur),
      getStatus: () => 'neutral',
      tooltip: 'Taux de change Euro / Dollar' },
    { id: 'brent', categorie: '💹 Marchés financiers', label: 'Brent',
      getValue: d => d.marches_financiers?.petrole_brent?.valeur != null ? `${d.marches_financiers.petrole_brent.valeur}$` : '—',
      getSparkline: d => d.marches_financiers?.petrole_brent?.historique?.slice(-20)?.map(p => p.valeur),
      getStatus: d => (d.marches_financiers?.petrole_brent?.variations?.jour||0) < 0 ? 'good' : 'warning',
      tooltip: 'Prix du Brent en USD/baril', invertTrend: true },
    { id: 'or', categorie: '💹 Marchés financiers', label: 'Or',
      getValue: d => d.marches_financiers?.or?.valeur != null ? `${d.marches_financiers.or.valeur.toLocaleString('fr-FR')}$` : '—',
      getSparkline: d => d.marches_financiers?.or?.historique?.slice(-20)?.map(p => p.valeur),
      getStatus: () => 'neutral',
      tooltip: 'Prix de l\'or en USD/once' },
    { id: 'gaz_naturel', categorie: '💹 Marchés financiers', label: 'Gaz TTF',
      getValue: d => d.marches_financiers?.gaz_naturel?.valeur != null ? `${d.marches_financiers.gaz_naturel.valeur}` : '—',
      getSparkline: d => d.marches_financiers?.gaz_naturel?.historique?.slice(-20)?.map(p => p.valeur),
      getStatus: d => (d.marches_financiers?.gaz_naturel?.variations?.jour||0) < 0 ? 'good' : 'warning',
      tooltip: 'Prix du gaz naturel TTF européen', invertTrend: true },
    { id: 'ble', categorie: '💹 Marchés financiers', label: 'Blé',
      getValue: d => d.marches_financiers?.ble?.valeur != null ? `${d.marches_financiers.ble.valeur}` : '—',
      getSparkline: d => d.marches_financiers?.ble?.historique?.slice(-20)?.map(p => p.valeur),
      getStatus: () => 'neutral',
      tooltip: 'Prix du blé en cents/boisseau' },
    { id: 'lme_cuivre', categorie: '💹 Marchés financiers', label: 'Cuivre LME',
      getValue: d => d.marches_financiers?.lme_cuivre?.valeur != null ? `${d.marches_financiers.lme_cuivre.valeur}` : '—',
      getSparkline: d => d.marches_financiers?.lme_cuivre?.historique?.slice(-20)?.map(p => p.valeur),
      getStatus: () => 'neutral',
      tooltip: 'Prix du cuivre LME en cts/lb' },
    { id: 'lme_aluminium', categorie: '💹 Marchés financiers', label: 'Aluminium LME',
      getValue: d => d.marches_financiers?.lme_aluminium?.valeur != null ? `${d.marches_financiers.lme_aluminium.valeur}` : '—',
      getSparkline: d => d.marches_financiers?.lme_aluminium?.historique?.slice(-20)?.map(p => p.valeur),
      getStatus: () => 'neutral',
      tooltip: 'Prix de l\'aluminium LME en cts/lb' },
    { id: 'lme_zinc', categorie: '💹 Marchés financiers', label: 'Zinc LME',
      getValue: d => d.marches_financiers?.lme_zinc?.valeur != null ? `${d.marches_financiers.lme_zinc.valeur.toLocaleString('fr-FR')}` : '—',
      getSparkline: d => d.marches_financiers?.lme_zinc?.historique?.slice(-20)?.map(p => p.valeur),
      getStatus: () => 'neutral',
      tooltip: 'Prix du zinc LME en $/t' },
    { id: 'lme_nickel', categorie: '💹 Marchés financiers', label: 'Nickel LME',
      getValue: d => d.marches_financiers?.lme_nickel?.valeur != null ? `${d.marches_financiers.lme_nickel.valeur.toLocaleString('fr-FR')}` : '—',
      getSparkline: d => d.marches_financiers?.lme_nickel?.historique?.slice(-20)?.map(p => p.valeur),
      getStatus: () => 'neutral',
      tooltip: 'Prix du nickel LME en $/t' },

    // === TRAVAIL ===
    { id: 'teletravail', categorie: '⚙️ Travail', label: 'Télétravail',
      getValue: d => d.temps_travail?.teletravail?.taux_salaries != null ? `${d.temps_travail.teletravail.taux_salaries}%` : '—',
      getSparkline: d => serie([8,10,12,15,28,27,26,26,26,26], d.temps_travail?.teletravail?.taux_salaries),
      getStatus: () => 'neutral',
      tooltip: '% de salariés pratiquant le télétravail' },
    { id: 'temps_partiel', categorie: '⚙️ Travail', label: 'Temps partiel',
      getValue: d => d.temps_travail?.temps_partiel?.taux_global_pct != null ? `${d.temps_travail.temps_partiel.taux_global_pct}%` : '—',
      getSparkline: d => serie([18.6,18.5,18.4,18.2,18.1,17.9,17.8,17.5,17.4,17.3], d.temps_travail?.temps_partiel?.taux_global_pct),
      getStatus: () => 'neutral',
      tooltip: 'Taux de temps partiel global' },

    // === POUVOIR D'ACHAT ===
    { id: 'taux_effort_logement', categorie: '💰 Pouvoir d\'achat', label: 'Effort logement',
      getValue: d => d.taux_effort?.par_statut?.[0]?.taux_median != null ? `${d.taux_effort.par_statut[0].taux_median}%` : '—',
      getSparkline: d => { const h = d.taux_effort?.evolution?.map(e=>e.locataires_libre)||[]; return h.length>=4 ? h : serie([23.8,25.2,27.0,28.6,28.6,29.0,29.6], d.taux_effort?.par_statut?.[0]?.taux_median); },
      getStatus: () => 'warning',
      tooltip: 'Taux d\'effort médian locataires secteur libre', invertTrend: true },
    { id: 'taux_immo', categorie: '💰 Pouvoir d\'achat', label: 'Taux immo',
      getValue: d => d.marches_financiers?.taux_immobilier?.valeur != null ? `${d.marches_financiers.taux_immobilier.valeur}%` : '—',
      getSparkline: d => { const h = d.marches_financiers?.taux_immobilier?.historique?.map(p=>p.valeur)||[]; return h.length>=4 ? h.slice(-12) : serie([1.12,1.52,2.25,3.04,3.83,4.22,4.17,3.66,3.30,3.17,3.10], d.marches_financiers?.taux_immobilier?.valeur); },
      getStatus: d => (d.marches_financiers?.taux_immobilier?.valeur||4) < 3 ? 'good' : 'warning',
      tooltip: 'Taux moyen des crédits immobiliers', invertTrend: true },
  ];
}

// ==================== MODAL CONFIG HEADER KPIs ====================
function HeaderKpiConfigModal({ d, darkMode, headerKpis, toggleHeaderKpi, onClose }) {
  const catalogue = buildCatalogue(d);
  const categories = [...new Set(catalogue.map(ind => ind.categorie))];
  const [filterCat, setFilterCat] = useState('Tous');

  const catalogueFiltré = filterCat === 'Tous' ? catalogue : catalogue.filter(ind => ind.categorie === filterCat);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto" onClick={onClose}>
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div>
            <h2 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              ⚡ Personnaliser les indicateurs clés
            </h2>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {headerKpis.length}/{HEADER_KPIS_MAX} sélectionnés · Toujours visibles en haut de page
            </p>
          </div>
          <button onClick={onClose}
            className={`p-2 rounded-xl transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            ✕
          </button>
        </div>

        {/* Filtres catégorie */}
        <div className={`px-5 py-3 border-b flex flex-wrap gap-2 ${darkMode ? 'border-gray-700' : 'border-gray-100 bg-gray-50'}`}>
          {['Tous', ...categories].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                filterCat === cat
                  ? 'bg-blue-600 text-white shadow'
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Grille indicateurs */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
          {catalogueFiltré.map(ind => {
            const actif = headerKpis.includes(ind.id);
            const plein = headerKpis.length >= HEADER_KPIS_MAX && !actif;
            return (
              <button key={ind.id} onClick={() => !plein && toggleHeaderKpi(ind.id)}
                disabled={plein}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  actif
                    ? darkMode ? 'bg-blue-900/40 border-blue-600' : 'bg-blue-50 border-blue-400'
                    : plein
                      ? darkMode ? 'bg-gray-800 border-gray-700 opacity-40 cursor-not-allowed' : 'bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed'
                      : darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-100 hover:border-gray-300'
                }`}>
                {/* Checkbox visuelle */}
                <div style={{
                  width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                  background: actif ? '#2563eb' : darkMode ? '#374151' : '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {actif && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{ind.label}</p>
                  <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{ind.categorie}</p>
                </div>

                <span className={`text-xs font-bold tabular-nums ${actif ? (darkMode ? 'text-blue-400' : 'text-blue-600') : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {ind.getValue(d)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-100 bg-gray-50'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {headerKpis.length < HEADER_KPIS_MAX
              ? `Vous pouvez encore sélectionner ${HEADER_KPIS_MAX - headerKpis.length} indicateur${HEADER_KPIS_MAX - headerKpis.length > 1 ? 's' : ''}`
              : 'Maximum atteint — retirez-en un pour en ajouter un autre'}
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            ✓ Valider
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== COMPOSANT BOUTON FAVORI ====================
function FavoriButton({ id, isFavori, toggleFavori, darkMode }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); toggleFavori(id); }}
      title={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`ml-auto p-1 rounded-lg transition-all text-sm leading-none ${
        isFavori
          ? 'text-yellow-400 hover:text-yellow-300'
          : darkMode ? 'text-gray-600 hover:text-yellow-400' : 'text-gray-300 hover:text-yellow-400'
      }`}
    >
      {isFavori ? '★' : '☆'}
    </button>
  );
}

// ==================== ONGLET FAVORIS ====================
function FavorisTab({ d, darkMode, favoris, toggleFavori, isFavori, setSeuil, getSeuil, setNote, getNote, isEnAlerte }) {
  const [modeConfig, setModeConfig] = useState(false);
  const [filterCat, setFilterCat] = useState('Tous');
  const [popover, setPopover] = useState(null); // id de la carte dont le popover est ouvert
  const [seuilInput, setSeuilInput] = useState('');
  const [seuilDir, setSeuilDir] = useState('sup');
  const [noteInput, setNoteInput] = useState('');

  const [ordre, setOrdre] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cftc_favoris_ordre') || '[]'); } catch { return []; }
  });
  const dragId = React.useRef(null);
  const dragOverId = React.useRef(null);

  const catalogue = buildCatalogue(d);
  const categories = [...new Set(catalogue.map(ind => ind.categorie))];

  const ordreEffectif = React.useMemo(() => {
    const inOrdre = ordre.filter(id => favoris.includes(id));
    const nouveaux = favoris.filter(id => !ordre.includes(id));
    return [...inOrdre, ...nouveaux];
  }, [favoris, ordre]);

  const sauvegarderOrdre = (nouvelOrdre) => {
    setOrdre(nouvelOrdre);
    localStorage.setItem('cftc_favoris_ordre', JSON.stringify(nouvelOrdre));
  };

  const onDragStart = (id) => { dragId.current = id; };
  const onDragOver  = (e, id) => { e.preventDefault(); dragOverId.current = id; };
  const onDrop      = () => {
    if (!dragId.current || dragId.current === dragOverId.current) return;
    const next = [...ordreEffectif];
    const from = next.indexOf(dragId.current);
    const to   = next.indexOf(dragOverId.current);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, dragId.current);
    sauvegarderOrdre(next);
    dragId.current = null; dragOverId.current = null;
  };

  const indicsFavoris = ordreEffectif.map(id => catalogue.find(ind => ind.id === id)).filter(Boolean);
  const catalogueFiltré = filterCat === 'Tous' ? catalogue : catalogue.filter(ind => ind.categorie === filterCat);

  // Résumé
  const nbHausse  = indicsFavoris.filter(ind => { const sp = ind.getSparkline?.(d); if (!sp || sp.length < 2) return false; const v = sp.filter(x => x != null); return v.length >= 2 && v[v.length-1] > v[v.length-2]; }).length;
  const nbBaisse  = indicsFavoris.filter(ind => { const sp = ind.getSparkline?.(d); if (!sp || sp.length < 2) return false; const v = sp.filter(x => x != null); return v.length >= 2 && v[v.length-1] < v[v.length-2]; }).length;
  const nbAlertes = indicsFavoris.filter(ind => isEnAlerte(ind.id, ind.getValue(d))).length;

  // Ouvrir le popover d'une carte
  const ouvrirPopover = (ind) => {
    const s = getSeuil(ind.id);
    setSeuilInput(s ? String(s.valeur) : '');
    setSeuilDir(s ? s.direction : 'sup');
    setNoteInput(getNote(ind.id));
    setPopover(ind.id);
  };

  const fermerPopover = () => setPopover(null);

  const sauvegarderPopover = (id) => {
    setSeuil(id, seuilInput, seuilDir);
    setNote(id, noteInput);
    fermerPopover();
  };

  // ── Mode config ──
  if (modeConfig) {
    return (
      <div className="space-y-4">
        <div className={`flex items-center justify-between p-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
          <div>
            <h2 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-800'}`}>✏️ Configurer mes favoris</h2>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{favoris.length} indicateur{favoris.length !== 1 ? 's' : ''} sélectionné{favoris.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setModeConfig(false)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">✓ Terminer</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Tous', ...categories].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterCat === cat ? 'bg-blue-600 text-white shadow' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {catalogueFiltré.map(ind => {
            const actif = favoris.includes(ind.id);
            return (
              <button key={ind.id} onClick={() => toggleFavori(ind.id)}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${actif ? darkMode ? 'bg-blue-900/40 border-blue-700 shadow-lg' : 'bg-blue-50 border-blue-300 shadow' : darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'}`}>
                <span className={`text-lg ${actif ? 'text-yellow-400' : darkMode ? 'text-gray-600' : 'text-gray-300'}`}>{actif ? '★' : '☆'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{ind.label}</p>
                  <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{ind.categorie}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{ind.getValue(d)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Mode affichage cockpit ──
  return (
    <div className="space-y-3" onClick={() => popover && fermerPopover()}>

      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>⭐ Mon tableau de bord</h2>
            <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{indicsFavoris.length} indicateur{indicsFavoris.length !== 1 ? 's' : ''}</p>
          </div>
          {indicsFavoris.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {nbHausse  > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{background:'#dcfce7',color:'#15803d'}}>▲ {nbHausse} en hausse</span>}
              {nbBaisse  > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{background:'#fee2e2',color:'#b91c1c'}}>▼ {nbBaisse} en baisse</span>}
              {nbAlertes > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{background:'#fef3c7',color:'#92400e'}}>⚠ {nbAlertes} alerte{nbAlertes !== 1 ? 's' : ''}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {indicsFavoris.length > 1 && <span className={`text-[10px] hidden sm:block ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>⠿ Glisser pour réordonner · ⚙ Clic pour configurer</span>}
          <button onClick={() => setModeConfig(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            ✏️ Indicateurs
          </button>
        </div>
      </div>

      {/* Vide */}
      {indicsFavoris.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-16 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
          <div className="text-5xl mb-4">⭐</div>
          <h3 className={`font-semibold text-base mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Votre tableau de bord est vide</h3>
          <p className={`text-sm mb-6 text-center max-w-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sélectionnez les indicateurs que vous souhaitez suivre au quotidien.</p>
          <button onClick={() => setModeConfig(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">✏️ Choisir mes indicateurs</button>
        </div>
      )}

      {/* Grille cockpit */}
      {indicsFavoris.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
          {indicsFavoris.map(ind => {
            const enAlerte = isEnAlerte(ind.id, ind.getValue(d));
            const note = getNote(ind.id);
            const seuil = getSeuil(ind.id);
            const isOpen = popover === ind.id;

            return (
              <div key={ind.id} draggable
                onDragStart={() => onDragStart(ind.id)}
                onDragOver={e => onDragOver(e, ind.id)}
                onDrop={onDrop}
                style={{ position: 'relative' }}
              >
                {/* Carte principale */}
                <BubbleKpi
                  label={ind.label}
                  value={ind.getValue(d)}
                  status={ind.getStatus(d)}
                  darkMode={darkMode}
                  tooltip={ind.tooltip}
                  sparklineData={ind.getSparkline ? ind.getSparkline(d) : undefined}
                  invertTrend={!!ind.invertTrend}
                  alerte={enAlerte}
                  note={note}
                />

                {/* ✕ Supprimer — coin haut droit, toujours visible */}
                <button
                  onClick={e => { e.stopPropagation(); toggleFavori(ind.id); }}
                  title="Retirer des favoris"
                  style={{
                    position: 'absolute', top: '5px', right: '5px', zIndex: 10,
                    width: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: darkMode ? '#374151' : '#f3f4f6',
                    border: 'none', borderRadius: '4px',
                    cursor: 'pointer', fontSize: '9px', fontWeight: 700,
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='#ef4444'; e.currentTarget.style.color='#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background=darkMode?'#374151':'#f3f4f6'; e.currentTarget.style.color=darkMode?'#9ca3af':'#6b7280'; }}
                >✕</button>

                {/* ✏ Note — coin bas droit, toujours visible */}
                <button
                  onClick={e => { e.stopPropagation(); ouvrirPopover(ind); }}
                  title={note ? `Note : ${note}` : 'Ajouter une note ou un seuil'}
                  style={{
                    position: 'absolute', bottom: '5px', right: '5px', zIndex: 10,
                    width: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: note || getSeuil(ind.id)
                      ? (darkMode ? '#1e3a5f' : '#dbeafe')
                      : (darkMode ? '#374151' : '#f3f4f6'),
                    border: 'none', borderRadius: '4px',
                    cursor: 'pointer', fontSize: '9px',
                    color: note || getSeuil(ind.id)
                      ? (darkMode ? '#60a5fa' : '#2563eb')
                      : (darkMode ? '#9ca3af' : '#6b7280'),
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='#2563eb'; e.currentTarget.style.color='#fff'; }}
                  onMouseLeave={e => {
                    const hasData = note || getSeuil(ind.id);
                    e.currentTarget.style.background = hasData ? (darkMode?'#1e3a5f':'#dbeafe') : (darkMode?'#374151':'#f3f4f6');
                    e.currentTarget.style.color = hasData ? (darkMode?'#60a5fa':'#2563eb') : (darkMode?'#9ca3af':'#6b7280');
                  }}
                >✏</button>

                {/* Badge seuil configuré mais pas déclenché */}
                {seuil && !enAlerte && (
                  <div style={{ position:'absolute', bottom:'6px', left:'6px', fontSize:'9px', color: darkMode?'#4b5563':'#d1d5db' }}>
                    {seuil.direction === 'sup' ? '▲' : '▼'}{seuil.valeur}
                  </div>
                )}

                {/* Popover config seuil + note */}
                {isOpen && (
                  <div onClick={e => e.stopPropagation()}
                    style={{
                      position:'absolute', top:'calc(100% + 8px)', left:0, zIndex:100,
                      width:'220px',
                      background: darkMode?'#1f2937':'#ffffff',
                      border:`1px solid ${darkMode?'#374151':'#e5e7eb'}`,
                      borderRadius:'12px', padding:'12px',
                      boxShadow:'0 8px 24px rgba(0,0,0,0.15)',
                    }}>
                    <p style={{ fontSize:'11px', fontWeight:600, color: darkMode?'#f9fafb':'#111827', marginBottom:'10px' }}>
                      ✏ {ind.label}
                    </p>

                    {/* Seuil */}
                    <p style={{ fontSize:'10px', color: darkMode?'#9ca3af':'#6b7280', marginBottom:'4px' }}>Alerte si la valeur est</p>
                    <div style={{ display:'flex', gap:'4px', marginBottom:'8px' }}>
                      <select value={seuilDir} onChange={e => setSeuilDir(e.target.value)}
                        style={{ fontSize:'11px', padding:'4px 6px', borderRadius:'6px', border:`0.5px solid ${darkMode?'#374151':'#e5e7eb'}`, background: darkMode?'#374151':'#f9fafb', color: darkMode?'#f9fafb':'#111827', flex:'0 0 auto' }}>
                        <option value="sup">supérieure à</option>
                        <option value="inf">inférieure à</option>
                      </select>
                      <input type="number" value={seuilInput} onChange={e => setSeuilInput(e.target.value)}
                        placeholder="valeur"
                        style={{ fontSize:'11px', padding:'4px 8px', borderRadius:'6px', border:`0.5px solid ${darkMode?'#374151':'#e5e7eb'}`, background: darkMode?'#374151':'#f9fafb', color: darkMode?'#f9fafb':'#111827', width:'72px' }} />
                    </div>

                    {/* Note */}
                    <p style={{ fontSize:'10px', color: darkMode?'#9ca3af':'#6b7280', marginBottom:'4px' }}>Note personnelle</p>
                    <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                      placeholder="Ex : à surveiller pour NAO oct."
                      rows={2}
                      style={{ fontSize:'11px', padding:'6px 8px', borderRadius:'6px', border:`0.5px solid ${darkMode?'#374151':'#e5e7eb'}`, background: darkMode?'#374151':'#f9fafb', color: darkMode?'#f9fafb':'#111827', width:'100%', resize:'none', marginBottom:'8px', lineHeight:1.5 }} />

                    {/* Boutons */}
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={() => sauvegarderPopover(ind.id)}
                        style={{ flex:1, fontSize:'11px', padding:'5px', background:'#2563eb', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:600 }}>
                        ✓ Enregistrer
                      </button>
                      <button onClick={() => { setSeuil(ind.id, '', 'sup'); setNote(ind.id, ''); setSeuilInput(''); setNoteInput(''); fermerPopover(); }}
                        style={{ fontSize:'11px', padding:'5px 8px', background:'none', color: darkMode?'#6b7280':'#9ca3af', border:`0.5px solid ${darkMode?'#374151':'#e5e7eb'}`, borderRadius:'6px', cursor:'pointer' }}>
                        Effacer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== COMPOSANT SUB-TABS STYLE BULLE ====================
function BubbleSubTabs({ tabs, activeTab, setActiveTab, darkMode, color = 'indigo' }) {
  const colorClasses = {
    indigo: 'bg-indigo-600',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
    cyan: 'bg-cyan-600',
    green: 'bg-green-600'
  };
  
  return (
    <div className={`flex flex-wrap gap-2`}>
      {tabs.map(([id, label]) => (
        <button 
          key={id} 
          onClick={() => setActiveTab(id)} 
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === id 
              ? `${colorClasses[color]} text-white shadow-lg` 
              : darkMode 
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ==================== COMPOSANT NOTE DE LECTURE STYLE BULLE ====================
function BubbleNote({ type = 'info', title, children, darkMode }) {
  const types = {
    info: {
      border: 'border-blue-500',
      bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      title: darkMode ? 'text-blue-300' : 'text-blue-800',
      text: darkMode ? 'text-blue-200' : 'text-blue-700'
    },
    warning: {
      border: 'border-orange-500',
      bg: darkMode ? 'bg-orange-900/20' : 'bg-orange-50',
      title: darkMode ? 'text-orange-300' : 'text-orange-800',
      text: darkMode ? 'text-orange-200' : 'text-orange-700'
    },
    success: {
      border: 'border-green-500',
      bg: darkMode ? 'bg-green-900/20' : 'bg-green-50',
      title: darkMode ? 'text-green-300' : 'text-green-800',
      text: darkMode ? 'text-green-200' : 'text-green-700'
    },
    danger: {
      border: 'border-red-500',
      bg: darkMode ? 'bg-red-900/20' : 'bg-red-50',
      title: darkMode ? 'text-red-300' : 'text-red-800',
      text: darkMode ? 'text-red-200' : 'text-red-700'
    }
  };
  
  const style = types[type];
  
  return (
    <div className={`p-4 rounded-2xl border-l-4 ${style.border} ${style.bg}`}>
      {title && <h4 className={`font-semibold mb-2 ${style.title}`}>{title}</h4>}
      <div className={`text-sm ${style.text}`}>{children}</div>
    </div>
  );
}

// ==================== COMPOSANT STAT BLOCK STYLE BULLE ====================
function BubbleStatBlock({ label, value, status = 'neutral', darkMode, subtitle }) {
  const statusColors = {
    good: darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600',
    neutral: darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600',
    warning: darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600',
    bad: darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600',
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
      <div>
        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
        {subtitle && <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>}
      </div>
      <span className={`text-xl font-bold px-3 py-1 rounded-xl ${statusColors[status]}`}>{value}</span>
    </div>
  );
}

// ==================== COMPOSANT PROGRESS BAR STYLE BULLE ====================
function BubbleProgressBar({ label, value, max = 100, darkMode, showPercent = true, color }) {
  const percentage = (Math.abs(value) / max) * 100;
  const isPositive = value >= 0;
  const barColor = color || (isPositive ? 'bg-green-500' : 'bg-red-500');

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs w-32 sm:w-36 truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className={`h-3 rounded-full flex-1 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div 
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        {showPercent && (
          <span className={`text-xs font-bold w-12 text-right ${
            isPositive ? 'text-green-500' : 'text-red-500'
          }`}>
            {typeof value === 'number' && value >= 0 ? '+' : ''}{value}{typeof value === 'number' ? '%' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// Props communes pour tous les graphiques - STYLE BULLE
const useChartProps = (darkMode) => {
  const colors = getChartColors(darkMode);
  return {
    cartesianGrid: { 
      strokeDasharray: "3 3", 
      stroke: colors.grid,
      vertical: false  // Grille horizontale uniquement = plus clean
    },
    xAxis: { 
      tick: { fill: colors.axis, fontSize: 11 }, 
      axisLine: { stroke: colors.grid }, 
      tickLine: false 
    },
    yAxis: { 
      tick: { fill: colors.axis, fontSize: 11 }, 
      axisLine: false, 
      tickLine: false,
      width: 40
    },
    legend: { 
      wrapperStyle: { fontSize: 11, color: colors.text, paddingTop: '10px' } 
    },
    tooltip: { 
      contentStyle: { 
        backgroundColor: colors.tooltipBg, 
        border: 'none',
        borderRadius: '12px',
        boxShadow: darkMode ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.12)',
        color: colors.text,
        padding: '10px 14px'
      },
      labelStyle: { color: colors.text, fontWeight: 600, marginBottom: '4px' },
      itemStyle: { color: colors.text, padding: '2px 0' },
      cursor: { fill: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
    }
  };
};

// ==================== COMPOSANT PRINCIPAL APP ====================
export default function App() {
  const [data, setData] = useState(null);
  const [modalTab, setModalTab] = useState('miseajour'); // 'nouveautes' ou 'miseajour'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('favoris');
  const [subTab, setSubTab] = useState('chomage');
  const [subTabVie, setSubTabVie] = useState('loyers');
  const [subTabConj, setSubTabConj] = useState('pib');
  const [showAlertes, setShowAlertes] = useState(false);
  const [showPresse, setShowPresse] = useState(false);
  const [alertesNonLues, setAlertesNonLues] = useState([]);
  const { favoris, toggleFavori, isFavori, setSeuil, getSeuil, setNote, getNote, isEnAlerte } = useFavoris();
  const { headerKpis, toggleHeaderKpi } = useHeaderKpis();
  const [showHeaderConfig, setShowHeaderConfig] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    let premierChargement = true;
    const loadData = () => {
      fetch('./data.json')
        .then(r => { if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`); return r.json(); })
        .then(d => { 
          setData(d); 
          setLoading(false);
          if (d.alertes && d.alertes.length > 0) {
            const alertesLues = JSON.parse(localStorage.getItem('alertesLues') || '[]');
            const nonLues = d.alertes.filter(a => !alertesLues.includes(a.id));
            setAlertesNonLues(nonLues);
            // N'ouvrir le pop-up automatiquement qu'au premier chargement,
            // pas lors des refreshs automatiques toutes les 5 minutes
            if (nonLues.length > 0 && premierChargement) {
              setShowAlertes(true);
            }
          }
          premierChargement = false;
        })
        .catch(e => { setError(e.message); setLoading(false); });
    };
    loadData();
    // Rafraîchissement automatique toutes les 5 minutes
    const refreshInterval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Écran de chargement style bulle
  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`text-center p-8 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Chargement des données...</h2>
      </div>
    </div>
  );

  // Écran d'erreur style bulle
  if (error || !data) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`text-center p-8 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Erreur de chargement</h2>
        <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error || "Données non disponibles"}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
        >
          Réessayer
        </button>
      </div>
    </div>
  );

  const d = data;

  const marquerAlertesLues = () => {
    if (d.alertes) {
      const toutesLesIds = d.alertes.map(a => a.id);
      localStorage.setItem('alertesLues', JSON.stringify(toutesLesIds));
      setAlertesNonLues([]);
    }
    setShowAlertes(false);
  };

  const allerVersOnglet = (onglet) => {
    setTab(onglet);
    setShowAlertes(false);
  };

  const tabs = [
    ['favoris','⭐ Mon tableau de bord'],
    ['conjoncture','📈 Conjoncture'],
    ['previsions','🔮 Prévisions'],
    ['evolutions','📉 Évolutions'],
    ['pouvoir_achat','💰 Pouvoir d\'achat'],
    ['salaires','💵 Salaires'],
    ['emploi','👥 Emploi'],
    ['travail','⚙️ Travail'],
    ['territoires','🗺️ Territoires'],
    ['conditions_vie','🏠 Conditions'],
    ['inflation','📊 Inflation'],
    ['conventions','📋 Conventions'],
    ['comparaison_ue','🇪🇺 Europe'],
    ['simulateur','🧮 Simulateur'],
    ['aide','📖 Aide']
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <style>{scrollbarHideStyle}</style>
      
      {/* ==================== MODAL ALERTES AVEC ONGLETS ==================== */}
      {showAlertes && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAlertes(false)}>
          <div 
            className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-5 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                    🔔
                  </div>
                  <div>
                    <h2 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Quoi de neuf ?</h2>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {modalTab === 'nouveautes' 
                        ? `${alertesNonLues.length} notification${alertesNonLues.length > 1 ? 's' : ''}` 
                        : 'Historique des versions'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAlertes(false)}
                  className={`p-2 rounded-xl transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Onglets */}
            <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setModalTab('nouveautes')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  modalTab === 'nouveautes'
                    ? darkMode ? 'text-blue-400' : 'text-blue-600'
                    : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  📢 Nouveautés
                  {alertesNonLues.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {alertesNonLues.length}
                    </span>
                  )}
                </span>
                {modalTab === 'nouveautes' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
                )}
              </button>
              <button
                onClick={() => setModalTab('miseajour')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  modalTab === 'miseajour'
                    ? darkMode ? 'text-blue-400' : 'text-blue-600'
                    : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  🔄 Mises à jour
                </span>
                {modalTab === 'miseajour' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
                )}
              </button>
            </div>
            
            {/* Contenu - Onglet Nouveautés */}
            {modalTab === 'nouveautes' && (
              <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                {alertesNonLues.length > 0 ? (
                  alertesNonLues.map(alerte => {
                    const typeConfig = {
                      success: {
                        bg: darkMode ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200',
                        icon: '✅'
                      },
                      warning: {
                        bg: darkMode ? 'bg-orange-900/30 border-orange-800' : 'bg-orange-50 border-orange-200',
                        icon: '⚠️'
                      },
                      danger: {
                        bg: darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200',
                        icon: '🔴'
                      },
                      info: {
                        bg: darkMode ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200',
                        icon: 'ℹ️'
                      }
                    };
                    const config = typeConfig[alerte.type] || typeConfig.info;
                    
                    return (
                      <div 
                        key={alerte.id}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${config.bg}`}
                        onClick={() => allerVersOnglet(alerte.onglet)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {config.icon} {alerte.titre}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                            {alerte.date}
                          </span>
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {alerte.message}
                        </p>
                        <p className="text-xs text-blue-500 mt-2">👆 Cliquer pour voir les détails</p>
                      </div>
                    );
                  })
                ) : (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="font-medium">Vous êtes à jour !</p>
                    <p className="text-sm mt-1">Aucune nouvelle notification</p>
                  </div>
                )}
              </div>
            )}

            {/* Contenu - Onglet Mises à jour (Changelog) */}
            {modalTab === 'miseajour' && (
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {d.changelog && d.changelog.length > 0 ? (
                  <div className="space-y-4">
                    {d.changelog.map((release, idx) => (
                      <div key={idx} className={`${idx !== 0 ? 'pt-4 border-t ' + (darkMode ? 'border-gray-700' : 'border-gray-200') : ''}`}>
                        {/* En-tête version */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${
                            idx === 0 
                              ? 'bg-blue-600 text-white' 
                              : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            v{release.version}
                          </span>
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(release.date).toLocaleDateString('fr-FR', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          {idx === 0 && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] rounded-full font-medium">
                              ACTUELLE
                            </span>
                          )}
                        </div>
                        
                        {/* Liste des modifications */}
                        <div className="space-y-2 pl-2">
                          {release.modifications.map((mod, modIdx) => {
                            const typeEmoji = {
                              feature: '✨',
                              fix: '🔧',
                              data: '📊',
                              breaking: '⚠️'
                            };
                            
                            return (
                              <div key={modIdx} className="flex items-start gap-2">
                                <span>{typeEmoji[mod.type] || '•'}</span>
                                <div>
                                  <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    {mod.titre}
                                  </span>
                                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {' — '}{mod.description}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="text-4xl mb-2">📝</div>
                    <p>Aucun historique disponible</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Footer */}
            <div className={`px-4 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              {modalTab === 'nouveautes' && alertesNonLues.length > 0 ? (
                <button 
                  onClick={marquerAlertesLues}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
                >
                  ✓ Tout marquer comme lu
                </button>
              ) : (
                <button 
                  onClick={() => setShowAlertes(false)}
                  className={`w-full py-3 rounded-xl font-medium transition ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== PANNEAU LATÉRAL REVUE DE PRESSE ==================== */}
      {showPresse && (
        <>
          {/* Fond semi-transparent cliquable */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowPresse(false)}
          />
          {/* Panneau glissant depuis la droite */}
          <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 flex flex-col shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
            style={{ animation: 'slideInRight 0.25s ease-out' }}>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

            {/* Header panneau */}
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div>
                <h2 className={`font-black text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>📰 Revue de presse</h2>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {d?.revue_presse?.derniere_maj ? `Màj ${d.revue_presse.derniere_maj}` : 'Relancez fetch_data.py'}
                </p>
              </div>
              <button onClick={() => setShowPresse(false)}
                className={`p-2 rounded-xl text-lg leading-none ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                ✕
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {!d?.revue_presse ? (
                <div className={`rounded-2xl p-8 text-center ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                  <div className="text-4xl mb-3">📡</div>
                  <p className="text-sm font-medium mb-1">Données non disponibles</p>
                  <p className="text-xs">Relancez <code className={`px-1 py-0.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>fetch_data.py</code> pour récupérer les flux RSS.</p>
                </div>
              ) : (
                <PanneauPresseContenu rp={d.revue_presse} darkMode={darkMode} />
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== HEADER STYLE BULLE ==================== */}
      <header className={`px-4 py-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className={`flex justify-between items-center p-4 rounded-2xl shadow-lg ${
            darkMode 
              ? 'bg-gradient-to-r from-blue-900/80 to-blue-800/80' 
              : 'bg-gradient-to-r from-blue-600 to-blue-700'
          }`}>
            <div className="flex items-center gap-3">
              <img
                src="/CFTC-Logo-Blanc@4x_sans fond.png"
                alt="Logo CFTC"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
              />
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white">
                  Tableau de Bord Économique CFTC
                </h1>
                <p className={`text-xs sm:text-sm ${darkMode ? 'text-blue-300' : 'text-blue-100'}`}>
                  Màj : {d.last_updated} • <a href={`mailto:${d.contact}`} className="underline hover:text-white">{d.contact}</a>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <SearchBar d={d} darkMode={darkMode} onNavigate={(newTab) => setTab(newTab)} />
              <button 
                onClick={() => setShowAlertes(true)}
                className={`relative p-2.5 sm:p-3 rounded-xl transition-all duration-200 ${
                  darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                🔔
                {alertesNonLues.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
                    {alertesNonLues.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowPresse(true)}
                className={`relative p-2.5 sm:p-3 rounded-xl transition-all duration-200 ${
                  darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30'
                }`}
                title="Revue de presse"
              >
                📰
                {d?.revue_presse?.a_la_une?.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {d.revue_presse.a_la_une.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2.5 sm:p-3 rounded-xl transition-all duration-200 ${
                  darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ==================== CONTENU PRINCIPAL ==================== */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        
        {/* ==================== KPIs STYLE BULLE PERSONNALISABLES ==================== */}
        {showHeaderConfig && (
          <HeaderKpiConfigModal
            d={d} darkMode={darkMode}
            headerKpis={headerKpis}
            toggleHeaderKpi={toggleHeaderKpi}
            onClose={() => setShowHeaderConfig(false)}
          />
        )}
        <div className="mb-4 sm:mb-6">
          <div className={`grid gap-2 sm:gap-3`} style={{ gridTemplateColumns: `repeat(${headerKpis.length}, minmax(0, 1fr))` }}>
            {(() => {
              const catalogue = buildCatalogue(d);
              return headerKpis.map(id => {
                const ind = catalogue.find(i => i.id === id);
                if (!ind) return null;
                return (
                  <BubbleKpi
                    key={id}
                    label={ind.label}
                    value={ind.getValue(d)}
                    status={ind.getStatus(d)}
                    darkMode={darkMode}
                    tooltip={ind.tooltip}
                    sparklineData={ind.getSparkline ? ind.getSparkline(d) : undefined}
                    invertTrend={!!ind.invertTrend}
                  />
                );
              });
            })()}
          </div>
          {/* Bouton config discret */}
          <div className="flex justify-end mt-1.5">
            <button
              onClick={() => setShowHeaderConfig(true)}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg transition-all ${
                darkMode ? 'text-gray-600 hover:text-gray-400 hover:bg-gray-800' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
              }`}
            >
              ⚡ Personnaliser ces indicateurs
            </button>
          </div>
        </div>

        {/* ==================== NAVIGATION STYLE BULLE ==================== */}
        <BubbleNavTabs 
          tabs={tabs}
          activeTab={tab}
          setActiveTab={setTab}
          darkMode={darkMode}
        />

        {/* ==================== CONTENU DES ONGLETS ==================== */}
        <div className="mt-4 sm:mt-6">
          {(() => {
            const fp = { toggleFavori, isFavori };
            return <>
              {tab === 'favoris' && <FavorisTab d={d} darkMode={darkMode} favoris={favoris} toggleFavori={toggleFavori} isFavori={isFavori} setSeuil={setSeuil} getSeuil={getSeuil} setNote={setNote} getNote={getNote} isEnAlerte={isEnAlerte} />}
              {tab === 'conjoncture' && <ConjonctureTab d={d} subTab={subTabConj} setSubTab={setSubTabConj} darkMode={darkMode} fp={fp} />}
              {tab === 'previsions' && <PrevisionsTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'evolutions' && <EvolutionsTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'comparaison_ue' && <ComparaisonUETab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'simulateur' && <SimulateurNAOTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'pouvoir_achat' && <PouvoirAchatTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'salaires' && <SalairesTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'emploi' && <EmploiTab d={d} subTab={subTab} setSubTab={setSubTab} darkMode={darkMode} fp={fp} />}
              {tab === 'travail' && <TravailTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'territoires' && <TerritoiresTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'conditions_vie' && <ConditionsVieTab d={d} subTab={subTabVie} setSubTab={setSubTabVie} darkMode={darkMode} fp={fp} />}
              {tab === 'inflation' && <InflationTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'conventions' && <ConventionsTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'aide' && <AideTab darkMode={darkMode} />}
            </>;
          })()}
        </div>

        {/* ==================== FOOTER ==================== */}
        <footer className={`mt-8 text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <p>Tableau de bord développé pour la CFTC • Données publiques • Open source</p>
          <p className="mt-1">💡 Suggestion ? Bug ? <a href={`mailto:${d.contact}`} className="underline">{d.contact}</a></p>
        </footer>
      </main>
    </div>
  );
}

// NOUVEL ONGLET CONJONCTURE
function ConjonctureTab({d, subTab, setSubTab, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  
  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-2`}>
        {[['pib','📈 Croissance PIB'],['partage_va','⚖️ Partage VA'],['climat','🌡️ Climat affaires'],['defaillances','🏭 Défaillances'],['investissement','📉 Investissement'],['marches','💹 Marchés financiers'],['globe','🌍 Globe économique']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${subTab===id?'bg-indigo-600 text-white shadow-lg': darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'pib' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📈 Croissance trimestrielle du PIB (%)" darkMode={darkMode} favoriId="pib_trim" isFavori={fp.isFavori?.("pib_trim")} toggleFavori={fp.toggleFavori}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={d.pib.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} />
              <YAxis domain={[-0.5, 1]} {...chartProps.yAxis} />
              <Tooltip {...chartProps.tooltip} formatter={v => {
                const val = Math.abs(v) < 0.05 ? 0 : v;
                return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
              }} />
              <ReferenceLine y={0} stroke={darkMode ? '#6b7280' : C.gray} />
              <Bar radius={[6, 6, 0, 0]} dataKey="croissance" name="Croissance T/T-1">
                {d.pib.evolution.map((e, i) => <Cell key={i} fill={e.croissance > -0.05 ? C.tertiary : C.secondary} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Situation actuelle" darkMode={darkMode}>
          <div className="space-y-3 p-2">
            <div className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <span className={darkMode ? 'text-gray-300' : ''}>Croissance T3 2025</span>
              <span className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>+{d.pib.croissance_trim_actuel}%</span>
            </div>
            <div className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <span className={darkMode ? 'text-gray-300' : ''}>Croissance annuelle 2024</span>
              <span className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>+{d.pib.croissance_annuelle}%</span>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`font-semibold text-sm mb-2 ${darkMode ? 'text-gray-200' : ''}`}>Contributions T3 2025 :</p>
              <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-300' : ''}`}>
                <div className="flex justify-between"><span>Demande intérieure</span><span className={darkMode ? 'text-green-400' : 'text-green-600'}>+{d.pib.contributions.demande_interieure} pt</span></div>
                <div className="flex justify-between"><span>Commerce extérieur</span><span className={darkMode ? 'text-green-400' : 'text-green-600'}>+{d.pib.contributions.commerce_exterieur} pt</span></div>
                <div className="flex justify-between"><span>Stocks</span><span className={darkMode ? 'text-red-400' : 'text-red-600'}>{d.pib.contributions.stocks} pt</span></div>
              </div>
            </div>
          </div>
        </Card>
        <Card title="📈 Croissance annuelle" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.pib.annuel}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartProps.xAxis} />
              <YAxis domain={[-10, 8]} {...chartProps.yAxis} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke={darkMode ? '#6b7280' : C.gray} />
              <Bar radius={[6, 6, 0, 0]} dataKey="croissance">
                {d.pib.annuel.map((e, i) => <Cell key={i} fill={e.croissance >= 0 ? C.tertiary : C.secondary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {/* PARTAGE DE LA VALEUR AJOUTÉE */}
      {subTab === 'partage_va' && <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="⚖️ Partage de la VA des SNF (%)" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={d.partage_va.evolution}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="annee" {...chartProps.xAxis} />
                <YAxis domain={[20, 70]} {...chartProps.yAxis} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Legend {...chartProps.legend} />
                <Area dataKey="salaires" name="Part salaires" fill={C.primary} fillOpacity={0.3} stroke={C.primary} strokeWidth={2.5} />
                <Line strokeLinecap="round" strokeLinejoin="round" dataKey="ebe" name="Part profits (EBE)" stroke={C.secondary} strokeWidth={2.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="📊 Répartition actuelle (2024)" darkMode={darkMode}>
            <div className="space-y-3 p-2">
              <div className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <span className={`font-medium ${darkMode ? 'text-gray-300' : ''}`}>Rémunération salariés</span>
                <span className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{d.partage_va.part_salaires_snf}%</span>
              </div>
              <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}>
                <span className="font-medium">Excédent Brut Exploitation</span>
                <span className="text-2xl font-bold text-red-600">{d.partage_va.part_ebe_snf}%</span>
              </div>
              <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                <span className="font-medium">Impôts sur production</span>
                <span className="text-xl font-bold text-gray-600">{d.partage_va.part_impots_snf}%</span>
              </div>
            </div>
          </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="📉 Taux de marge des SNF" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.partage_va.taux_marge_snf}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} />
                <YAxis {...chartProps.yAxis} domain={[28, 35]} fontSize={11} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Bar radius={[6, 6, 0, 0]} dataKey="taux" name="Taux de marge">
                  {d.partage_va.taux_marge_snf.map((e, i) => <Cell key={i} fill={e.taux > 32 ? C.secondary : C.quaternary} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="🏭 Par secteur (% VA)" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.partage_va.par_secteur} layout="vertical">
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis {...chartProps.xAxis} type="number" domain={[0, 70]} fontSize={10} />
                <YAxis {...chartProps.yAxis} dataKey="secteur" type="category" width={90} fontSize={9} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Legend {...chartProps.legend} />
                <Bar radius={[6, 6, 0, 0]} dataKey="salaires" name="Salaires" fill={C.primary} />
                <Bar radius={[6, 6, 0, 0]} dataKey="ebe" name="Profits" fill={C.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div className={`${darkMode ? 'bg-red-900/30' : 'bg-red-50'} border-l-4 border-red-400 p-4 rounded`}>
          <h3 className="font-semibold text-red-800">💡 Note de lecture</h3>
          <ul className="mt-2 text-sm text-red-700 space-y-1">
            <li>• La part des salaires a baissé de <b>10 points</b> depuis 1980 (de 68% à 58%)</li>
            <li>• Le taux de marge des entreprises reste élevé : <b>32.5%</b> en 2024</li>
            <li>• Il y a des marges de manœuvre pour augmenter les salaires !</li>
          </ul>
        </div>
      </div>}

      {subTab === 'climat' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="🌡️ Climat des affaires et confiance des ménages" darkMode={darkMode} favoriId="climat_affaires" isFavori={fp.isFavori?.("climat_affaires")} toggleFavori={fp.toggleFavori}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={d.climat_affaires.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="mois" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} domain={[85, 105]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} />
              <Legend {...chartProps.legend} />
              <ReferenceLine y={100} stroke={C.gray} strokeDasharray="5 5" label={{value:"Moyenne", fontSize:9}} />
              <Line strokeLinecap="round" strokeLinejoin="round" dataKey="climat" name="Climat affaires" stroke={C.primary} strokeWidth={2.5} />
              <Line strokeLinecap="round" strokeLinejoin="round" dataKey="menages" name="Confiance ménages" stroke={C.quaternary} strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Par secteur (Nov 2025)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.climat_affaires.par_secteur} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[90, 105]} fontSize={11} />
              <YAxis {...chartProps.yAxis} dataKey="secteur" type="category" width={80} fontSize={10} />
              <Tooltip {...chartProps.tooltip} />
              <ReferenceLine x={100} stroke={C.gray} strokeDasharray="5 5" />
              <Bar radius={[6, 6, 0, 0]} dataKey="climat" fill={C.primary}>
                {d.climat_affaires.par_secteur.map((e, i) => <Cell key={i} fill={e.climat >= 100 ? C.tertiary : C.quaternary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className={`text-center p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}>
              <p className="text-xs">Climat affaires</p>
              <p className="text-xl font-bold text-blue-600">{d.climat_affaires.valeur_actuelle}</p>
            </div>
            <div className={`text-center p-2 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}>
              <p className="text-xs">Confiance ménages</p>
              <p className="text-xl font-bold text-orange-600">{d.climat_affaires.confiance_menages}</p>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">Moyenne long terme = 100</p>
        </Card>
      </div>}

      {subTab === 'defaillances' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="⚠️ Défaillances d'entreprises (cumul 12 mois)" darkMode={darkMode} favoriId="defaillances" isFavori={fp.isFavori?.("defaillances")} toggleFavori={fp.toggleFavori}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={d.defaillances.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="mois" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} domain={[40000, 70000]} fontSize={10} tickFormatter={v => `${v/1000}k`} />
              <Tooltip {...chartProps.tooltip} formatter={v => v.toLocaleString()} />
              <ReferenceLine y={d.defaillances.moyenne_2010_2019} stroke={C.quaternary} strokeDasharray="5 5" label={{value:"Moy. 2010-19", fontSize:8, fill:C.quaternary}} />
              <Area dataKey="cumul" fill={C.secondary} fillOpacity={0.2} stroke="none" />
              <Line strokeLinecap="round" strokeLinejoin="round" dataKey="cumul" stroke={C.secondary} strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Situation actuelle" darkMode={darkMode}>
          <div className="space-y-3 p-2">
            <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}>
              <span>Cumul 12 mois</span>
              <span className="text-2xl font-bold text-red-600">{d.defaillances.cumul_12_mois.toLocaleString()}</span>
            </div>
            <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}>
              <span>vs moyenne 2010-2019</span>
              <span className="text-lg font-bold text-orange-600">+{Math.round((d.defaillances.cumul_12_mois / d.defaillances.moyenne_2010_2019 - 1) * 100)}%</span>
            </div>
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded-xl text-xs`}>
              <p className="font-semibold mb-2">Par secteur :</p>
              {d.defaillances.par_secteur.slice(0,4).map((s,i) => (
                <div key={i} className="flex justify-between py-1 border-b border-gray-200">
                  <span>{s.secteur}</span>
                  <span>{s.part}% <span className={s.evolution > 5 ? 'text-red-500' : 'text-gray-500'}>(+{s.evolution}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div className="md:col-span-2">
          <div className={`${darkMode ? 'bg-red-900/30' : 'bg-red-50'} border-l-4 border-red-400 p-4 rounded`}>
            <h3 className="font-semibold text-red-800">⚠️ Alerte conjoncturelle</h3>
            <ul className="mt-2 text-sm text-red-700 space-y-1">
              <li>• Défaillances au plus haut depuis 2015 (hors Covid)</li>
              <li>• Secteurs les plus touchés : Hébergement-restauration (+12%), Commerce (+8%)</li>
              <li>• Rattrapage post-Covid (PGE, reports charges) + conjoncture difficile</li>
            </ul>
          </div>
        </div>
      </div>}

      {subTab === 'investissement' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📉 Investissement des entreprises (FBCF)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.investissement.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} />
              <YAxis {...chartProps.yAxis} domain={[-1, 1.5]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke={C.gray} />
              <Bar radius={[6, 6, 0, 0]} dataKey="variation" name="Variation T/T-1">
                {d.investissement.evolution.map((e, i) => <Cell key={i} fill={e.variation >= 0 ? C.tertiary : C.secondary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Par type d'investissement" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.investissement.par_type} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[-5, 6]} fontSize={11} />
              <YAxis {...chartProps.yAxis} dataKey="type" type="category" width={100} fontSize={9} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine x={0} stroke={C.gray} />
              <Bar radius={[6, 6, 0, 0]} dataKey="variation_an" name="Évolution annuelle">
                {d.investissement.par_type.map((e, i) => <Cell key={i} fill={e.variation_an >= 0 ? C.tertiary : C.secondary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className={`text-center p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}>
              <p className="text-xs">Taux invest.</p>
              <p className="text-xl font-bold text-blue-600">{d.investissement.taux_investissement}%</p>
            </div>
            <div className={`text-center p-2 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}>
              <p className="text-xs">Évolution an.</p>
              <p className="text-xl font-bold text-orange-600">{d.investissement.fbcf_variation_an}%</p>
            </div>
          </div>
        </Card>
        <div className="md:col-span-2">
          <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} border-l-4 border-yellow-400 p-4 rounded`}>
            <h3 className="font-semibold text-yellow-800">💡 Points clés investissement</h3>
            <ul className="mt-2 text-sm text-yellow-700 space-y-1">
              <li>• Rebond de l'investissement au T3 2025 (+0.4%) après plusieurs trimestres de baisse</li>
              <li>• Construction toujours en recul (-2.5% sur l'année)</li>
              <li>• Investissement numérique (info-comm) reste dynamique (+5%)</li>
            </ul>
          </div>
        </div>
      </div>}
      

      {/* MARCHES FINANCIERS - 8 indicateurs, analyse quotidienne */}
      {subTab === 'marches' && d.marches_financiers && (() => {
        const mf = d.marches_financiers;
        const VariationBadge = ({val}) => {
          if (val === undefined || val === null) return null;
          const color = val >= 0 ? 'text-green-600' : 'text-red-600';
          const bg = val >= 0 ? 'bg-green-50' : 'bg-red-50';
          const darkColor = val >= 0 ? 'text-green-400' : 'text-red-400';
          const darkBg = val >= 0 ? 'bg-green-900/30' : 'bg-red-900/30';
          return <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? `${darkBg} ${darkColor}` : `${bg} ${color}`} font-medium`}>{val >= 0 ? '+' : ''}{val}%</span>;
        };
        const VariationsRow = ({variations, label}) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</span>
            <div className="flex gap-1.5 items-center">
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>1J</span><VariationBadge val={variations?.jour} />
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>1S</span><VariationBadge val={variations?.semaine} />
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>1M</span><VariationBadge val={variations?.mois} />
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>YTD</span><VariationBadge val={variations?.ytd} />
            </div>
          </div>
        );
        const ImmoVariationsRow = ({variations}) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Var.</span>
            <div className="flex gap-1.5 items-center">
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>1M</span><VariationBadge val={variations?.mois ? variations.mois * 100 : null} />
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>3M</span><VariationBadge val={variations?.trimestre ? variations.trimestre * 100 : null} />
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>1A</span><VariationBadge val={variations?.an ? variations.an * 100 : null} />
            </div>
          </div>
        );
        const MinMaxBar = ({minMax, unite}) => {
          if (!minMax) return null;
          return (
            <div className={`flex items-center gap-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
              <span className="text-red-500 font-medium">Min: {minMax.min}{unite}</span>
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>({minMax.min_date})</span>
              <span className="mx-1">|</span>
              <span className="text-green-500 font-medium">Max: {minMax.max}{unite}</span>
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>({minMax.max_date})</span>
            </div>
          );
        };
        const CorrBadge = ({val, label}) => {
          if (val === null || val === undefined) return <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{label}: N/A</span>;
          const absVal = Math.abs(val);
          const strength = absVal > 0.7 ? 'Forte' : absVal > 0.4 ? 'Mod.' : 'Faible';
          const dir = val > 0 ? '+' : '-';
          const color = absVal > 0.7 ? (val > 0 ? 'text-green-600' : 'text-red-600') : 'text-yellow-600';
          return <span className={`text-[10px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}: <span className={color}>{dir}{absVal} ({strength})</span></span>;
        };
        const thin = (arr, maxPts=250) => {
          if (!arr || arr.length <= maxPts) return arr || [];
          const step = Math.ceil(arr.length / maxPts);
          const result = arr.filter((_, i) => i % step === 0);
          if (result[result.length-1] !== arr[arr.length-1]) result.push(arr[arr.length-1]);
          return result;
        };
        const KpiCard = ({data, label, unite, color, bgClass, borderClass, badgeClass, textClass, format}) => {
          if (!data) return null;
          const val = format ? format(data.valeur) : data.valeur;
          return (
            <div className={`p-2.5 rounded-2xl border overflow-hidden ${darkMode ? bgClass : bgClass.replace('/20','/10')} ${darkMode ? borderClass : borderClass}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
                <span className={`text-[8px] px-1 py-0.5 rounded-lg truncate max-w-[70px] ${badgeClass}`}>{data.source?.split('(')[0]?.trim()?.slice(0,15)}</span>
              </div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className={`text-lg font-bold leading-tight ${textClass}`}>{val}</span>
                {unite && <span className={`text-[10px] font-medium ${textClass} opacity-70`}>{unite}</span>}
              </div>
              <span className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{data.date}</span>
              {data.variations && <VariationsRow variations={data.variations} label="" />}
              <MinMaxBar minMax={data.min_max} unite={unite ? ` ${unite.replace('USD/','').replace('EUR/','').replace('cents/','')}` : ''} />
            </div>
          );
        };
        const MiniChart = ({title, data, color, unite, yDomain}) => (
          <Card title={title} darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={thin(data)}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="date" {...chartProps.xAxis} tickFormatter={v => v?.slice(5)} interval={Math.floor((data?.length||50)/5)} />
                <YAxis {...chartProps.yAxis} domain={yDomain || ['auto', 'auto']} />
                <Tooltip {...chartProps.tooltip} labelFormatter={v => `Date: ${v}`} formatter={(v,n) => [v != null ? `${typeof v==='number' ? v.toLocaleString('fr-FR') : v}${n==='valeur' && unite ? ' '+unite : ''}` : '-', n==='valeur'?title.split(' -')[0]:n==='ma50'?'MA50':'MA200']} />
                <Area dataKey="valeur" fill={color} fillOpacity={0.08} stroke="none" />
                <Line dataKey="valeur" stroke={color} strokeWidth={1.5} dot={false} name="valeur" />
                <Line dataKey="ma50" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="4 2" name="ma50" />
                <Line dataKey="ma200" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="8 3" name="ma200" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        );
        return <div className="space-y-4">

        {/* Section 1: Indices & Taux */}
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Indices & Taux</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'oat_10ans', favId: 'oat_10ans', data: mf.oat_10ans, label: 'OAT 10 ans', unite: '%', bgClass: 'bg-purple-900/20', borderClass: 'border-purple-800/50', badgeClass: darkMode ? 'bg-purple-800/50 text-purple-300' : 'bg-purple-100 text-purple-600', textClass: darkMode ? 'text-purple-400' : 'text-purple-700' },
            { key: 'cac40', favId: 'cac40', data: mf.cac40, label: 'CAC 40', unite: 'pts', bgClass: 'bg-blue-900/20', borderClass: 'border-blue-800/50', badgeClass: darkMode ? 'bg-blue-800/50 text-blue-300' : 'bg-blue-100 text-blue-600', textClass: darkMode ? 'text-blue-400' : 'text-blue-700', format: v => v?.toLocaleString('fr-FR') },
            { key: 'eurusd', favId: 'eurusd', data: mf.eurusd, label: 'EUR/USD', unite: '', bgClass: 'bg-cyan-900/20', borderClass: 'border-cyan-800/50', badgeClass: darkMode ? 'bg-cyan-800/50 text-cyan-300' : 'bg-cyan-100 text-cyan-600', textClass: darkMode ? 'text-cyan-400' : 'text-cyan-700' },
          ].map(({ key, favId, data, label, unite, bgClass, borderClass, badgeClass, textClass, format }) => (
            <div key={key} className="relative group">
              <KpiCard data={data} label={label} unite={unite} color="" bgClass={bgClass} borderClass={borderClass} badgeClass={badgeClass} textClass={textClass} format={format} />
              <button onClick={() => fp.toggleFavori?.(favId)} title={fp.isFavori?.(favId) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={`absolute top-1.5 right-1.5 text-xs rounded p-0.5 transition-all ${fp.isFavori?.(favId) ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400'}`}>
                {fp.isFavori?.(favId) ? '★' : '☆'}
              </button>
            </div>
          ))}
          {mf.taux_immobilier && <div className="relative group">
            <div className={`p-2.5 rounded-2xl border overflow-hidden ${darkMode ? 'bg-pink-900/20 border-pink-800/50' : 'bg-pink-50/50 border-pink-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux immo.</span>
                <span className={`text-[8px] px-1 py-0.5 rounded-lg ${darkMode ? 'bg-pink-800/50 text-pink-300' : 'bg-pink-100 text-pink-600'}`}>BdF/OCL</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-lg font-bold leading-tight ${darkMode ? 'text-pink-400' : 'text-pink-700'}`}>{mf.taux_immobilier.valeur}%</span>
              </div>
              <span className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{mf.taux_immobilier.date}</span>
              {mf.taux_immobilier.variations && <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {mf.taux_immobilier.variations.mois != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${mf.taux_immobilier.variations.mois <= 0 ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')} font-medium`}>1M: {mf.taux_immobilier.variations.mois > 0 ? '+' : ''}{mf.taux_immobilier.variations.mois} pts</span>}
                {mf.taux_immobilier.variations.an != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${mf.taux_immobilier.variations.an <= 0 ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')} font-medium`}>1A: {mf.taux_immobilier.variations.an > 0 ? '+' : ''}{mf.taux_immobilier.variations.an} pts</span>}
              </div>}
              <MinMaxBar minMax={mf.taux_immobilier.min_max} unite="%" />
            </div>
            <button onClick={() => fp.toggleFavori?.('taux_immo')} title={fp.isFavori?.('taux_immo') ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className={`absolute top-1.5 right-1.5 text-xs rounded p-0.5 transition-all ${fp.isFavori?.('taux_immo') ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400'}`}>
              {fp.isFavori?.('taux_immo') ? '★' : '☆'}
            </button>
          </div>}
        </div>

        {/* Section 2: Matieres premieres & Energie */}
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mati&egrave;res premi&egrave;res & &Eacute;nergie</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'brent', favId: 'brent', data: mf.petrole_brent, label: 'Brent', unite: '$/b', bgClass: 'bg-amber-900/20', borderClass: 'border-amber-800/50', badgeClass: darkMode ? 'bg-amber-800/50 text-amber-300' : 'bg-amber-100 text-amber-600', textClass: darkMode ? 'text-amber-400' : 'text-amber-700' },
            { key: 'gaz', favId: 'gaz_naturel', data: mf.gaz_naturel, label: 'Gaz (TTF)', unite: '', bgClass: 'bg-orange-900/20', borderClass: 'border-orange-800/50', badgeClass: darkMode ? 'bg-orange-800/50 text-orange-300' : 'bg-orange-100 text-orange-600', textClass: darkMode ? 'text-orange-400' : 'text-orange-700' },
            { key: 'or', favId: 'or', data: mf.or, label: 'Or', unite: '$/oz', bgClass: 'bg-yellow-900/20', borderClass: 'border-yellow-800/50', badgeClass: darkMode ? 'bg-yellow-800/50 text-yellow-300' : 'bg-yellow-100 text-yellow-600', textClass: darkMode ? 'text-yellow-400' : 'text-yellow-700', format: v => v?.toLocaleString('fr-FR') },
            { key: 'ble', favId: 'ble', data: mf.ble, label: 'Blé', unite: 'cts/bu', bgClass: 'bg-lime-900/20', borderClass: 'border-lime-800/50', badgeClass: darkMode ? 'bg-lime-800/50 text-lime-300' : 'bg-lime-100 text-lime-600', textClass: darkMode ? 'text-lime-400' : 'text-lime-700' },
          ].map(({ key, favId, data, label, unite, bgClass, borderClass, badgeClass, textClass, format }) => (
            <div key={key} className="relative group">
              <KpiCard data={data} label={label} unite={unite} color="" bgClass={bgClass} borderClass={borderClass} badgeClass={badgeClass} textClass={textClass} format={format} />
              <button onClick={() => fp.toggleFavori?.(favId)} title={fp.isFavori?.(favId) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={`absolute top-1.5 right-1.5 text-xs rounded p-0.5 transition-all ${fp.isFavori?.(favId) ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400'}`}>
                {fp.isFavori?.(favId) ? '★' : '☆'}
              </button>
            </div>
          ))}
        </div>

        {/* Section 2b: Métaux LME */}
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>M&eacute;taux LME</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'cuivre', favId: 'lme_cuivre', data: mf.lme_cuivre, label: 'Cuivre', unite: 'cts/lb', bgClass: 'bg-orange-900/20', borderClass: 'border-orange-800/50', badgeClass: darkMode ? 'bg-orange-800/50 text-orange-300' : 'bg-orange-100 text-orange-600', textClass: darkMode ? 'text-orange-400' : 'text-orange-700' },
            { key: 'alu', favId: 'lme_aluminium', data: mf.lme_aluminium, label: 'Aluminium', unite: 'cts/lb', bgClass: 'bg-slate-900/20', borderClass: 'border-slate-800/50', badgeClass: darkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-slate-100 text-slate-600', textClass: darkMode ? 'text-slate-400' : 'text-slate-600' },
            { key: 'zinc', favId: 'lme_zinc', data: mf.lme_zinc, label: 'Zinc', unite: '$/t', bgClass: 'bg-teal-900/20', borderClass: 'border-teal-800/50', badgeClass: darkMode ? 'bg-teal-800/50 text-teal-300' : 'bg-teal-100 text-teal-600', textClass: darkMode ? 'text-teal-400' : 'text-teal-700', format: v => v?.toLocaleString('fr-FR') },
            { key: 'nickel', favId: 'lme_nickel', data: mf.lme_nickel, label: 'Nickel', unite: '$/t', bgClass: 'bg-emerald-900/20', borderClass: 'border-emerald-800/50', badgeClass: darkMode ? 'bg-emerald-800/50 text-emerald-300' : 'bg-emerald-100 text-emerald-600', textClass: darkMode ? 'text-emerald-400' : 'text-emerald-700', format: v => v?.toLocaleString('fr-FR') },
          ].map(({ key, favId, data, label, unite, bgClass, borderClass, badgeClass, textClass, format }) => (
            <div key={key} className="relative group">
              <KpiCard data={data} label={label} unite={unite} color="" bgClass={bgClass} borderClass={borderClass} badgeClass={badgeClass} textClass={textClass} format={format} />
              <button onClick={() => fp.toggleFavori?.(favId)} title={fp.isFavori?.(favId) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={`absolute top-1.5 right-1.5 text-xs rounded p-0.5 transition-all ${fp.isFavori?.(favId) ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400'}`}>
                {fp.isFavori?.(favId) ? '★' : '☆'}
              </button>
            </div>
          ))}
        </div>

        {/* Graphiques principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MiniChart title="OAT 10 ans - Quotidien" data={mf.oat_10ans?.historique} color={C.purple} unite="%" />
          <MiniChart title="CAC 40 - Quotidien" data={mf.cac40?.historique} color={C.primary} unite="pts" />
          <MiniChart title="Brent - Quotidien" data={mf.petrole_brent?.historique} color={C.quaternary} unite="$/b" />
          <MiniChart title="EUR/USD - Quotidien" data={mf.eurusd?.historique} color="#06b6d4" unite="" />
          <MiniChart title="Or - Quotidien" data={mf.or?.historique} color="#eab308" unite="$/oz" />
          <MiniChart title="Gaz naturel - Quotidien" data={mf.gaz_naturel?.historique} color="#f97316" unite="" />
          <MiniChart title="Bl&eacute; - Quotidien" data={mf.ble?.historique} color="#84cc16" unite="cts/bu" />
          <MiniChart title="Cuivre LME - Quotidien" data={mf.lme_cuivre?.historique} color="#f97316" unite="cts/lb" />
          <MiniChart title="Aluminium LME - Quotidien" data={mf.lme_aluminium?.historique} color="#94a3b8" unite="cts/lb" />
          <MiniChart title="Zinc LME - Quotidien" data={mf.lme_zinc?.historique} color="#14b8a6" unite="$/t" />
          <MiniChart title="Nickel LME - Quotidien" data={mf.lme_nickel?.historique} color="#10b981" unite="$/t" />

          {/* Taux immobilier - mensuel */}
          {mf.taux_immobilier?.historique && <Card title="Taux immobilier moyen - Mensuel" darkMode={darkMode} favoriId="taux_immo" isFavori={fp.isFavori?.("taux_immo")} toggleFavori={fp.toggleFavori}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={mf.taux_immobilier.historique}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="date" {...chartProps.xAxis} interval={Math.floor(mf.taux_immobilier.historique.length / 6)} />
                <YAxis {...chartProps.yAxis} domain={[0, 5]} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Area dataKey="valeur" fill="#ec4899" fillOpacity={0.1} stroke="none" />
                <Line dataKey="valeur" stroke="#ec4899" strokeWidth={2} dot={{ r: 2, fill: '#ec4899' }} name="Taux moyen" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>}
        </div>

        {/* Correlations & Analyses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card title="Corr&eacute;lations march&eacute;s / inflation" darkMode={darkMode}>
            <div className="space-y-2 p-1">
              {mf.correlations && <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Coefficient de Pearson (mensuel)</p>
                <div className="grid grid-cols-2 gap-1">
                  <CorrBadge val={mf.correlations.oat_inflation} label="OAT vs IPC" />
                  <CorrBadge val={mf.correlations.brent_inflation} label="Brent vs IPC" />
                  <CorrBadge val={mf.correlations.cac_inflation} label="CAC vs IPC" />
                  <CorrBadge val={mf.correlations.eurusd_inflation} label="EUR/USD vs IPC" />
                  <CorrBadge val={mf.correlations.or_inflation} label="Or vs IPC" />
                  <CorrBadge val={mf.correlations.gaz_inflation} label="Gaz vs IPC" />
                  <CorrBadge val={mf.correlations.ble_inflation} label="Bl&eacute; vs IPC" />
                </div>
                <p className={`text-[9px] mt-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'} italic`}>{mf.correlations.note}</p>
              </div>}
            </div>
          </Card>

          <Card title="Notes de lecture" darkMode={darkMode}>
            <div className="space-y-2 p-1 max-h-80 overflow-y-auto">
              {[
                {key: 'oat_10ans', label: 'OAT 10 ans', bgLight: 'bg-purple-50', bgDark: 'bg-purple-900/20', txtLight: 'text-purple-700', txtDark: 'text-purple-300'},
                {key: 'petrole_brent', label: 'Brent', bgLight: 'bg-amber-50', bgDark: 'bg-amber-900/20', txtLight: 'text-amber-700', txtDark: 'text-amber-300'},
                {key: 'cac40', label: 'CAC 40', bgLight: 'bg-blue-50', bgDark: 'bg-blue-900/20', txtLight: 'text-blue-700', txtDark: 'text-blue-300'},
                {key: 'eurusd', label: 'EUR/USD', bgLight: 'bg-cyan-50', bgDark: 'bg-cyan-900/20', txtLight: 'text-cyan-700', txtDark: 'text-cyan-300'},
                {key: 'or', label: 'Or', bgLight: 'bg-yellow-50', bgDark: 'bg-yellow-900/20', txtLight: 'text-yellow-700', txtDark: 'text-yellow-300'},
                {key: 'gaz_naturel', label: 'Gaz naturel', bgLight: 'bg-orange-50', bgDark: 'bg-orange-900/20', txtLight: 'text-orange-700', txtDark: 'text-orange-300'},
                {key: 'ble', label: 'Bl\u00e9', bgLight: 'bg-lime-50', bgDark: 'bg-lime-900/20', txtLight: 'text-lime-700', txtDark: 'text-lime-300'},
                {key: 'taux_immobilier', label: 'Taux immobilier', bgLight: 'bg-pink-50', bgDark: 'bg-pink-900/20', txtLight: 'text-pink-700', txtDark: 'text-pink-300'},
                {key: 'lme_cuivre', label: 'Cuivre LME', bgLight: 'bg-orange-50', bgDark: 'bg-orange-900/20', txtLight: 'text-orange-700', txtDark: 'text-orange-300'},
                {key: 'lme_aluminium', label: 'Aluminium LME', bgLight: 'bg-slate-50', bgDark: 'bg-slate-900/20', txtLight: 'text-slate-700', txtDark: 'text-slate-300'},
                {key: 'lme_zinc', label: 'Zinc LME', bgLight: 'bg-teal-50', bgDark: 'bg-teal-900/20', txtLight: 'text-teal-700', txtDark: 'text-teal-300'},
                {key: 'lme_nickel', label: 'Nickel LME', bgLight: 'bg-emerald-50', bgDark: 'bg-emerald-900/20', txtLight: 'text-emerald-700', txtDark: 'text-emerald-300'},
              ].map(({key, label, bgLight, bgDark, txtLight, txtDark}) => mf[key]?.note_lecture && (
                <div key={key} className={`p-2 rounded-lg ${darkMode ? bgDark : bgLight}`}>
                  <p className={`text-[11px] font-semibold ${darkMode ? txtDark : txtLight}`}>{label}</p>
                  <p className={`text-[11px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{mf[key].note_lecture}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* OAT long terme */}
        {mf.oat_10ans?.evolution_annuelle && <Card title="OAT 10 ans - Taux moyen annuel (contexte long terme)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={mf.oat_10ans.evolution_annuelle}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartProps.xAxis} />
              <YAxis {...chartProps.yAxis} domain={[-0.5, 4]} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke={darkMode ? '#6b7280' : C.gray} />
              <Area dataKey="valeur" fill={C.purple} fillOpacity={0.15} stroke="none" />
              <Line dataKey="valeur" stroke={C.purple} strokeWidth={2.5} dot={{ r: 3, fill: C.purple }} name="OAT 10 ans" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>}

        {/* Guide de lecture */}
        <div className={`${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'} border-l-4 border-indigo-400 p-4 rounded`}>
          <h3 className={`font-semibold text-sm ${darkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>Guide de lecture</h3>
          <div className={`mt-2 text-xs ${darkMode ? 'text-indigo-200' : 'text-indigo-700'} space-y-1`}>
            <p><b>Courbes :</b> trait plein = cours, <span className="text-yellow-500">tirets jaunes</span> = MA50 (tendance court terme), <span className="text-red-500">tirets rouges</span> = MA200 (tendance long terme)</p>
            <p><b>Signaux :</b> MA50 croise MA200 vers le haut = signal haussier ("golden cross"), vers le bas = signal baissier ("death cross")</p>
            <p><b>Variations :</b> 1J = 1 jour, 1S = 1 semaine, 1M = 1 mois, YTD = depuis le 1er janvier</p>
            <p><b>12 indicateurs suivis :</b> OAT, CAC 40, EUR/USD, Taux immobilier, Brent, Gaz TTF, Or, Bl&eacute; + <b>4 m&eacute;taux LME :</b> Cuivre, Aluminium, Zinc, Nickel</p>
            {mf.analyse?.periode && <p><b>P&eacute;riode :</b> {mf.analyse.periode}</p>}
          </div>
        </div>
      </div>;
      })()}


      {subTab === 'globe' && <GlobeTab darkMode={darkMode} />}

      {d.sources_par_onglet?.conjoncture && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.conjoncture}</p>
      )}
    </div>
  );
}

// ONGLET COMPARAISON UE
function ComparaisonUETab({d, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  const [subTab, setSubTab] = useState('smic');
  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-2`}>
        {[['smic','💰 SMIC'],['chomage','👥 Chômage'],['partage_va','⚖️ Part salaires VA']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${subTab===id?'bg-blue-600 text-white shadow-lg': darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'smic' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="💰 Salaire minimum brut mensuel (€)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.comparaison_ue.smic_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 3000]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v.toLocaleString()}€`} />
              <Bar radius={[6, 6, 0, 0]} dataKey="smic" name="SMIC brut">
                {d.comparaison_ue.smic_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.primary : C.gray} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 En pouvoir d'achat (SPA)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.comparaison_ue.smic_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 2200]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v.toLocaleString()} SPA`} />
              <Bar radius={[6, 6, 0, 0]} dataKey="spa" name="Pouvoir d'achat réel">
                {d.comparaison_ue.smic_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.tertiary : C.cyan} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <div className={`md:col-span-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} border-l-4 border-blue-400 p-4 rounded`}>
          <h3 className="font-semibold text-blue-800">💡 À retenir</h3>
          <ul className="mt-2 text-sm text-blue-700 space-y-1">
            <li>• France <b>6ᵉ rang UE</b> en SMIC brut (1 802€)</li>
            <li>• SMIC français <b>20% inférieur</b> au SMIC allemand</li>
            <li>• En pouvoir d'achat réel, l'Allemagne dépasse le Luxembourg</li>
          </ul>
        </div>
      </div>}

      {subTab === 'chomage' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="👥 Taux de chômage (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.chomage_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 12]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
              <Bar radius={[6, 6, 0, 0]} dataKey="taux" name="Chômage total">
                {d.comparaison_ue.chomage_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.secondary : (e.taux > 7 ? C.quaternary : C.tertiary)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="👶 Chômage des jeunes (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.chomage_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 28]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
              <Bar radius={[6, 6, 0, 0]} dataKey="jeunes" name="-25 ans">
                {d.comparaison_ue.chomage_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.secondary : (e.jeunes > 15 ? C.quaternary : C.tertiary)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {subTab === 'partage_va' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="⚖️ Part des salaires dans la VA (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.part_salaires_va_ue} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[50, 65]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
              <ReferenceLine x={56.8} stroke={C.gray} strokeDasharray="5 5" />
              <Bar radius={[6, 6, 0, 0]} dataKey="part" name="Part salaires">
                {d.comparaison_ue.part_salaires_va_ue.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.primary : (e.part > 56.8 ? C.tertiary : C.secondary)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Analyse" darkMode={darkMode}>
          <div className="space-y-3 p-2">
            <div className={`p-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}>
              <p className="text-sm">France</p>
              <p className="text-2xl font-bold text-blue-600">57.8%</p>
            </div>
            <div className={`p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}>
              <p className="text-sm">Allemagne</p>
              <p className="text-2xl font-bold text-green-600">61.2%</p>
              <p className="text-xs text-gray-600">+3.4 pts vs France</p>
            </div>
            <div className={`p-3 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded-lg text-sm`}>
              <p className="font-medium text-red-800">📖 Note de lecture</p>
              <p className="text-red-700">En Allemagne, les salariés représentent <b>61.2%</b> de la valeur ajoutée contre 57.8% en France</p>
            </div>
          </div>
        </Card>
      </div>}
      
      {d.sources_par_onglet?.comparaison_ue && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.comparaison_ue}</p>
      )}
    </div>
  );
}

// ONGLET SIMULATEUR NAO
function SimulateurNAOTab({d, darkMode, fp={}}) {
  const [salaireBrut, setSalaireBrut] = useState(2000);
  const [augmentation, setAugmentation] = useState(3);
  const [situation, setSituation] = useState('seul');
  const [enfants, setEnfants] = useState(0);
  const [statut, setStatut] = useState('non_cadre');
  const [inflation, setInflation] = useState(d.indicateurs_cles.inflation_annuelle);
  const [effectif, setEffectif] = useState('moins50');
  const [regime, setRegime] = useState('2026');
  
  // ========== PARAMÈTRES COMMUNS ==========
  const SMIC_2025 = 1801.80;
  const SMIC_2026 = 1823.03;
  const SMIC = regime === '2026' ? SMIC_2026 : SMIC_2025;
  const SMIC_ANNUEL = SMIC * 12;
  
  // ========== PARAMÈTRES 2025 (RGCP) ==========
  const PLAFOND_2025 = 1.6;
  const T_2025 = effectif === 'moins50' ? 0.3193 : 0.3233;
  
  // ========== PARAMÈTRES 2026 (RGDU) ==========
  const PLAFOND_2026 = 3.0;
  const T_MIN = 0.0200;
  const T_DELTA = effectif === 'moins50' ? 0.3781 : 0.3821;
  const P = 1.75;
  const COEF_MAX = T_MIN + T_DELTA;
  
  const tauxCotisations = { 'non_cadre': 0.23, 'cadre': 0.25, 'fonctionnaire': 0.17 };
  
  // ========== CALCULS SALAIRE ==========
  const tauxNet = 1 - tauxCotisations[statut];
  const salaireNet = salaireBrut * tauxNet;
  const nouveauBrut = salaireBrut * (1 + augmentation / 100);
  const nouveauNet = nouveauBrut * tauxNet;
  const gainNetMensuel = nouveauNet - salaireNet;
  const gainNetAnnuel = gainNetMensuel * 12;
  const augReelle = augmentation - inflation;
  const pouvoirAchatPreserve = augmentation >= inflation;
  
  // ========== RÉDUCTION 2025 (RGCP) ==========
  const calcul2025 = (brut) => {
    const annuel = brut * 12;
    const smicAn = SMIC_2025 * 12;
    const ratio = annuel / smicAn;
    if (ratio > PLAFOND_2025) return { ok: false, coef: 0, mens: 0, an: 0, ratio };
    let coef = (T_2025 / 0.6) * (PLAFOND_2025 * smicAn / annuel - 1);
    coef = Math.max(0, Math.min(coef, T_2025));
    return { ok: true, coef, mens: Math.round(annuel * coef / 12), an: Math.round(annuel * coef), ratio };
  };
  
  // ========== RÉDUCTION 2026 (RGDU) ==========
  const calcul2026 = (brut) => {
    const annuel = brut * 12;
    const smicAn = SMIC_2026 * 12;
    const ratio = annuel / smicAn;
    if (ratio >= PLAFOND_2026) return { ok: false, coef: 0, mens: 0, an: 0, ratio, min: false };
    const base = (1/2) * (PLAFOND_2026 * smicAn / annuel - 1);
    let coef = base <= 0 ? T_MIN : T_MIN + (T_DELTA * Math.pow(base, P));
    coef = Math.min(coef, COEF_MAX);
    coef = Math.round(coef * 10000) / 10000;
    return { ok: true, coef, mens: Math.round(annuel * coef / 12), an: Math.round(annuel * coef), ratio, min: base <= 0 };
  };
  
  // ========== TAUX RÉDUITS 2025 ==========
  const calcTauxReduits = (brut) => {
    const ratio = brut / SMIC_2025;
    const mal = ratio <= 2.25 ? Math.round(brut * 0.06) : 0;
    const fam = ratio <= 3.3 ? Math.round(brut * 0.018) : 0;
    return { mal, fam, total: mal + fam, okMal: ratio <= 2.25, okFam: ratio <= 3.3 };
  };
  
  const calcul = regime === '2026' ? calcul2026 : calcul2025;
  const redActuelle = calcul(salaireBrut);
  const redNouvelle = calcul(nouveauBrut);
  const txRedAct = regime === '2025' ? calcTauxReduits(salaireBrut) : null;
  const txRedNouv = regime === '2025' ? calcTauxReduits(nouveauBrut) : null;
  
  // ========== COÛT EMPLOYEUR (SUPERBRUT) ==========
  // Taux charges patronales 2026 détaillés (hors AT/MP variable)
  // Maladie: 13% | Vieillesse plaf: 8.55% | Vieillesse déplaf: 2.02% | AF: 5.25%
  // Chômage: 4.05% | AGS: 0.20% | Retraite compl T1: 4.72% | CEG: 1.29%
  // FNAL: 0.50% | Formation: 1% | CSA: 0.30% | Dialogue social: 0.016%
  // Total approximatif: ~41% + AT/MP (~2%) = ~43%
  const coutEmpl = (brut) => {
    // Taux de charges patronales brutes (avant réduction)
    // 2025: ~45% avec taux réduits possibles | 2026: ~43% (taux réduits supprimés, base un peu plus basse)
    const PMSS = 4005; // Plafond mensuel SS 2026
    
    // Cotisations sur totalité du brut
    const maladie = brut * 0.13;
    const vieillesseDeplaf = brut * 0.0202;
    const allocFam = brut * 0.0525;
    const chomage = brut * 0.0405;
    const ags = brut * 0.002;
    const fnal = brut * 0.005;
    const formation = brut * 0.01;
    const csa = brut * 0.003;
    const atmp = brut * 0.02; // Moyenne AT/MP
    
    // Cotisations plafonnées (sur min(brut, PMSS))
    const assiettePlaf = Math.min(brut, PMSS);
    const vieillessePlaf = assiettePlaf * 0.0855;
    const retraiteT1 = assiettePlaf * 0.0472;
    const ceg = assiettePlaf * 0.0129;
    
    const chargesBrutes = maladie + vieillesseDeplaf + vieillessePlaf + allocFam + 
                          chomage + ags + retraiteT1 + ceg + fnal + formation + csa + atmp;
    
    const red = calcul(brut);
    const txRed = regime === '2025' ? calcTauxReduits(brut) : { total: 0 };
    const reductions = red.mens + txRed.total;
    const chargesNettes = Math.max(0, chargesBrutes - reductions);
    const superbrut = brut + chargesNettes;
    const txEffectif = ((chargesNettes / brut) * 100).toFixed(1);
    const txBrut = ((chargesBrutes / brut) * 100).toFixed(1);
    
    return { 
      brut, 
      chargesBrutes: Math.round(chargesBrutes), 
      redPrinc: red.mens, 
      redTx: txRed.total, 
      chargesNettes: Math.round(chargesNettes), 
      total: Math.round(superbrut),
      txEff: txEffectif,
      txBrut: txBrut
    };
  };
  
  const coutAct = coutEmpl(salaireBrut);
  const coutNouv = coutEmpl(nouveauBrut);
  const surcout = coutNouv.total - coutAct.total;
  const perteRed = redActuelle.an - redNouvelle.an;
  
  // ========== PRIME D'ACTIVITÉ ==========
  const calcPrime = (net, sit, enf) => {
    const base = 633.21;
    let forfait = sit === 'couple' ? base * 1.5 : base;
    forfait += enf * base * 0.3;
    let bonif = net >= 1416 ? 184.27 : (net >= 700.92 ? ((net - 700.92) / 715.08) * 184.27 : 0);
    let prime = forfait + net * 0.61 + bonif - net - (sit === 'seul' ? 76.04 : 152.08);
    if (net < 595 || prime < 15) return 0;
    if (sit === 'seul' && enf === 0 && net > 1900) return 0;
    if (sit === 'couple' && enf === 0 && net > 2500) return 0;
    return Math.max(0, Math.round(prime));
  };
  
  const primeAct = calcPrime(salaireNet, situation, enfants);
  const primeNouv = calcPrime(nouveauNet, situation, enfants);
  const pertePrime = Math.max(0, primeAct - primeNouv);
  const gainReel = gainNetMensuel - pertePrime;
  const gainReelAn = gainReel * 12;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-2xl">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold">🧮 Simulateur NAO Complet</h2>
            <p className="text-sm opacity-80">Impact salarié + employeur avec exonérations</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRegime('2025')} className={`px-3 py-1 rounded-lg text-sm ${regime === '2025' ? 'bg-white text-indigo-600 font-bold' : 'bg-indigo-500'}`}>2025 RGCP</button>
            <button onClick={() => setRegime('2026')} className={`px-3 py-1 rounded-lg text-sm ${regime === '2026' ? 'bg-white text-indigo-600 font-bold' : 'bg-indigo-500'}`}>2026 RGDU</button>
          </div>
        </div>
      </div>

      <div className={`p-3 rounded-xl text-sm ${regime === '2026' ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
        {regime === '2026' ? (
          <span className="text-blue-700"><b>🆕 RGDU 2026</b> • Seuil <b>3 SMIC</b> • Minimum <b>2%</b> • Formule P=1.75</span>
        ) : (
          <span className="text-amber-700"><b>📜 RGCP 2025</b> • Seuil <b>1.6 SMIC</b> + Taux réduits maladie/famille</span>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Card title="👤 Salarié" darkMode={darkMode}>
          <div className="space-y-2">
            <select value={statut} onChange={e => setStatut(e.target.value)} className="w-full border rounded-lg p-1.5 text-sm">
              <option value="non_cadre">🏢 Non-cadre (23%)</option>
              <option value="cadre">👔 Cadre (25%)</option>
              <option value="fonctionnaire">🏛️ Fonctionnaire (17%)</option>
            </select>
            <div>
              <input type="range" min="1200" max="6000" step="50" value={salaireBrut} onChange={e => setSalaireBrut(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-sm"><span className="font-bold text-blue-600">{salaireBrut}€</span><span className={darkMode ? "text-gray-400" : "text-gray-500"}>{(salaireBrut / SMIC).toFixed(2)} SMIC</span></div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <select value={situation} onChange={e => setSituation(e.target.value)} className="border rounded-lg p-1 text-xs"><option value="seul">Seul</option><option value="couple">Couple</option></select>
              <select value={enfants} onChange={e => setEnfants(Number(e.target.value))} className="border rounded-lg p-1 text-xs"><option value={0}>0 enf.</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3+</option></select>
            </div>
          </div>
        </Card>

        <Card title="🏭 Entreprise" darkMode={darkMode}>
          <div className="space-y-2">
            <select value={effectif} onChange={e => setEffectif(e.target.value)} className="w-full border rounded-lg p-1.5 text-sm">
              <option value="moins50">&lt; 50 sal.</option><option value="plus50">≥ 50 sal.</option>
            </select>
            <div className={`p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-xs space-y-1`}>
              {regime === '2026' ? (<><div className="flex justify-between"><span>Tmin</span><span>{T_MIN}</span></div><div className="flex justify-between"><span>Tdelta</span><span>{T_DELTA}</span></div><div className="flex justify-between"><span>Max</span><span className="font-bold">{COEF_MAX}</span></div></>) : (<div className="flex justify-between"><span>Param T</span><span className="font-bold">{T_2025}</span></div>)}
            </div>
          </div>
        </Card>

        <Card title="📈 Négociation" darkMode={darkMode}>
          <div className="space-y-2">
            <div><input type="range" min="0" max="10" step="0.5" value={augmentation} onChange={e => setAugmentation(Number(e.target.value))} className="w-full" /><div className="text-center font-bold text-green-600 text-xl">+{augmentation}%</div></div>
            <div><input type="range" min="0" max="8" step="0.1" value={inflation} onChange={e => setInflation(Number(e.target.value))} className="w-full" /><div className="text-center text-orange-600 text-sm">Inflation: {inflation}%</div></div>
          </div>
        </Card>

        <Card title="⚡ Réel" darkMode={darkMode}>
          <div className={`h-full flex flex-col justify-center items-center p-2 rounded-lg ${pouvoirAchatPreserve ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-3xl font-bold ${augReelle >= 0 ? 'text-green-600' : 'text-red-600'}`}>{augReelle >= 0 ? '+' : ''}{augReelle.toFixed(1)}%</p>
            <p className="text-xs">{pouvoirAchatPreserve ? '✅ OK' : '❌ Perte'}</p>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card title="💰 Salaire" darkMode={darkMode}>
          <table className="w-full text-sm"><tbody>
            <tr><td>Brut</td><td className="text-right">{salaireBrut}€</td><td className="text-right text-green-600">{Math.round(nouveauBrut)}€</td><td className="text-right text-green-600">+{Math.round(nouveauBrut - salaireBrut)}€</td></tr>
            <tr><td>Net</td><td className="text-right">{Math.round(salaireNet)}€</td><td className="text-right text-green-600">{Math.round(nouveauNet)}€</td><td className="text-right text-green-600">+{Math.round(gainNetMensuel)}€</td></tr>
          </tbody></table>
          <div className={`p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-lg text-center mt-2`}><span className="text-xs">Gain annuel</span><p className="text-lg font-bold text-blue-600">+{Math.round(gainNetAnnuel).toLocaleString()}€</p></div>
        </Card>

        <Card title="🏛️ Prime activité" darkMode={darkMode}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className={`p-2 ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'} rounded-lg text-center`}><p className="text-xs">Avant</p><p className="font-bold text-purple-600">{primeAct}€</p></div>
            <div className={`p-2 ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'} rounded-lg text-center`}><p className="text-xs">Après</p><p className="font-bold text-purple-600">{primeNouv}€</p></div>
          </div>
          {pertePrime > 0 && <div className={`p-2 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded-lg text-center mt-2 text-red-700 text-sm`}>⚠️ Perte: -{pertePrime}€/mois</div>}
        </Card>

        <Card title="✅ Bilan salarié" darkMode={darkMode}>
          <div className="p-3 bg-green-100 rounded-lg text-center">
            <p className="text-xs">GAIN RÉEL</p>
            <p className="text-3xl font-bold text-green-600">+{Math.round(gainReel)}€/m</p>
            <p className="text-sm">+{Math.round(gainReelAn).toLocaleString()}€/an</p>
          </div>
        </Card>
      </div>

      <div className={`rounded-xl p-4 ${regime === '2026' ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
        <h3 className={`font-bold mb-3 ${regime === '2026' ? 'text-blue-800' : 'text-amber-800'}`}>🏭 Exonérations employeur - {regime === '2026' ? 'RGDU 2026' : 'RGCP 2025'}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-xl p-3`}>
            <h4 className="font-semibold text-sm mb-2"><span className={`inline-block w-3 h-3 rounded-full mr-2 ${redActuelle.ok ? 'bg-green-500' : 'bg-red-500'}`}></span>{regime === '2026' ? 'RGDU' : 'Fillon'}</h4>
            <div className="text-xs space-y-1">
              <p>Seuil: ≤ <b>{regime === '2026' ? '3' : '1.6'} SMIC</b> ({Math.round(SMIC * (regime === '2026' ? 3 : 1.6))}€)</p>
              <p>Ratio: <b>{redActuelle.ratio.toFixed(2)} SMIC</b> {redActuelle.ok ? '✅' : '❌'}</p>
              <p>Coefficient: <b>{(redActuelle.coef * 100).toFixed(2)}%</b>{regime === '2026' && redActuelle.min && <span className="text-blue-600 ml-1">(min 2%)</span>}</p>
            </div>
            {regime === '2026' && <div className={`text-xs p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-lg my-2 font-mono`}>C = {T_MIN} + ({T_DELTA} × [(½)(3×SMIC/rém - 1)]^{P})</div>}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className={`p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}><p className="text-xs text-gray-500">Actuel</p><p className="font-bold text-green-600">{redActuelle.mens}€/m</p><p className="text-xs">{redActuelle.an.toLocaleString()}€/an</p></div>
              <div className={`p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl text-center`}><p className="text-xs text-gray-500">Après</p><p className={`font-bold ${redNouvelle.ok ? 'text-green-600' : 'text-red-600'}`}>{redNouvelle.mens}€/m</p><p className="text-xs">{redNouvelle.an.toLocaleString()}€/an</p></div>
            </div>
            {perteRed > 0 && <p className="text-xs text-orange-600 mt-2 text-center">⚠️ Perte employeur: -{perteRed.toLocaleString()}€/an</p>}
          </div>

          <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-xl p-3`}>
            {regime === '2025' ? (
              <>
                <h4 className="font-semibold text-sm mb-2">Taux réduits maladie & famille</h4>
                <div className="text-xs space-y-2">
                  <div className={`flex justify-between items-center p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                    <div><p className="font-medium">Maladie (7% vs 13%)</p><p className={darkMode ? "text-gray-400" : "text-gray-500"}>≤ 2.25 SMIC</p></div>
                    <span className={`px-2 py-1 rounded-lg ${txRedAct?.okMal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{txRedAct?.okMal ? `✅ -${txRedAct.mal}€` : '❌'}</span>
                  </div>
                  <div className={`flex justify-between items-center p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                    <div><p className="font-medium">Famille (3.45% vs 5.25%)</p><p className={darkMode ? "text-gray-400" : "text-gray-500"}>≤ 3.3 SMIC</p></div>
                    <span className={`px-2 py-1 rounded-lg ${txRedAct?.okFam ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{txRedAct?.okFam ? `✅ -${txRedAct.fam}€` : '❌'}</span>
                  </div>
                </div>
                <div className={`mt-2 p-2 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded-lg text-xs text-red-700`}>⚠️ Supprimés au 01/01/2026</div>
              </>
            ) : (
              <>
                <h4 className="font-semibold text-sm mb-2">🆕 Nouveautés RGDU 2026</h4>
                <div className="text-xs space-y-2">
                  <div className={`p-2 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}><p className="font-medium text-green-700">✅ Seuil étendu à 3 SMIC</p><p className="text-gray-600">Plus de salariés éligibles</p></div>
                  <div className={`p-2 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}><p className="font-medium text-green-700">✅ Minimum garanti 2%</p><p className="text-gray-600">Toujours au moins 2% si &lt; 3 SMIC</p></div>
                  <div className={`p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><p className="font-medium text-blue-700">📐 Dégressivité lissée (P=1.75)</p><p className="text-gray-600">Moins de trappe à bas salaires</p></div>
                  <div className="p-2 bg-amber-50 rounded"><p className="font-medium text-amber-700">⚠️ Taux réduits supprimés</p><p className="text-gray-600">Maladie 7% et AF 3.45% n'existent plus</p></div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={`mt-4 ${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-xl p-3`}>
          <h4 className="font-semibold text-sm mb-2">📊 Coût employeur (Superbrut)</h4>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b"><th className="text-left py-1"></th><th className="text-right">Avant</th><th className="text-right">Après</th><th className="text-right">Δ</th></tr></thead>
            <tbody>
              <tr><td>Salaire brut</td><td className="text-right">{coutAct.brut.toLocaleString()}€</td><td className="text-right">{coutNouv.brut.toLocaleString()}€</td><td className="text-right text-orange-600">+{coutNouv.brut - coutAct.brut}€</td></tr>
              <tr><td>Charges patronales brutes (~{coutAct.txBrut}%)</td><td className="text-right">{coutAct.chargesBrutes.toLocaleString()}€</td><td className="text-right">{coutNouv.chargesBrutes.toLocaleString()}€</td><td></td></tr>
              <tr className="text-green-600"><td>- {regime === '2026' ? 'RGDU' : 'Fillon'}</td><td className="text-right">-{coutAct.redPrinc}€</td><td className="text-right">-{coutNouv.redPrinc}€</td><td></td></tr>
              {regime === '2025' && <tr className="text-green-600"><td>- Taux réduits (maladie/AF)</td><td className="text-right">-{coutAct.redTx}€</td><td className="text-right">-{coutNouv.redTx}€</td><td></td></tr>}
              <tr className="border-t"><td>= Charges nettes</td><td className="text-right">{coutAct.chargesNettes.toLocaleString()}€</td><td className="text-right">{coutNouv.chargesNettes.toLocaleString()}€</td><td className="text-right text-gray-500">{coutAct.txEff}%→{coutNouv.txEff}%</td></tr>
              <tr className={`border-t ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} font-bold`}><td className="py-2">SUPERBRUT (coût total)</td><td className="text-right">{coutAct.total.toLocaleString()}€</td><td className="text-right">{coutNouv.total.toLocaleString()}€</td><td className="text-right text-orange-600">+{surcout}€/m</td></tr>
            </tbody>
          </table>
          <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-2">
            <p>Surcoût mensuel: <b className="text-orange-600">+{surcout.toLocaleString()}€</b></p>
            <p className="text-right">Surcoût annuel: <b className="text-orange-600">+{(surcout * 12).toLocaleString()}€</b></p>
          </div>
          <p className="text-xs text-gray-400 mt-1">Charges: maladie, vieillesse, AF, chômage, retraite complémentaire, FNAL, formation, AT/MP (~2%)</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className={`p-3 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}><p className="font-semibold text-red-800 text-sm">📈 Inflation cumulée</p><p className="text-2xl font-bold text-red-600">+12%</p><p className="text-xs text-red-700">2022-2024</p></div>
        <div className={`p-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><p className="font-semibold text-blue-800 text-sm">⚖️ Partage VA</p><p className="text-2xl font-bold text-blue-600">32.5%</p><p className="text-xs text-blue-700">taux de marge</p></div>
        <div className={`p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}><p className="font-semibold text-green-800 text-sm">🇪🇺 vs Allemagne</p><p className="text-2xl font-bold text-green-600">-20%</p><p className="text-xs text-green-700">SMIC français</p></div>
        <div className={`p-3 ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'} rounded`}><p className="font-semibold text-purple-800 text-sm">💰 Cette demande</p><p className="text-2xl font-bold text-purple-600">+{Math.round(gainReel)}€</p><p className="text-xs text-purple-700">net réel/mois</p></div>
      </div>

      <p className="text-xs text-gray-400 text-center">⚠️ Simulation indicative - {regime === '2026' ? 'RGDU décret n°2025-1446' : 'RGCP 2025'}. Prime activité: caf.fr</p>
    </div>
  );
}

function PouvoirAchatTab({d, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  const [subTab, setSubTab] = useState('general');
  const [familleType, setFamilleType] = useState('coupleA');
  const [zoneGeo, setZoneGeo] = useState('horsIdf');
  const [produitSelect, setProduitSelect] = useState(null);

  // ========== BUDGETS-TYPES UNAF (Source officielle) ==========
  // https://www.unaf.fr/expert-des-familles/budgets-types/
  // Données Août 2025 - Mises à jour mensuellement par l'UNAF
  const budgetsUNAF = {
    lastUpdate: "Août 2025",
    source: "UNAF - Union Nationale des Associations Familiales",
    sourceUrl: "https://www.unaf.fr/expert-des-familles/budgets-types/",
    description: "Budget nécessaire pour vivre décemment, sans privation",
    
    categories: [
      { id: "alimentation", nom: "Alimentation", icon: "🍽️", color: "#ef4444" },
      { id: "transport", nom: "Transport", icon: "🚗", color: "#f97316" },
      { id: "logement", nom: "Logement", icon: "🏠", color: "#eab308" },
      { id: "education", nom: "Éducation", icon: "📚", color: "#22c55e" },
      { id: "entretien", nom: "Entretien & Soins", icon: "🧴", color: "#14b8a6" },
      { id: "equipements", nom: "Équipements", icon: "🛋️", color: "#3b82f6" },
      { id: "habillement", nom: "Habillement", icon: "👕", color: "#8b5cf6" },
      { id: "communication", nom: "Communication", icon: "📱", color: "#ec4899" },
      { id: "loisirs", nom: "Loisirs & Culture", icon: "🎭", color: "#06b6d4" },
      { id: "sante", nom: "Santé", icon: "🏥", color: "#10b981" },
    ],
    
    familles: {
      coupleA: { nom: "Couple + 2 enfants (6-13 ans)", icon: "👨‍👩‍👧‍👦" },
      coupleE: { nom: "Couple + 1 ado (14+ ans)", icon: "👨‍👩‍👦" },
      monoH: { nom: "Parent solo + 1 ado", icon: "👩‍👦" },
    },
    
    // Données UNAF Août 2025 par famille et zone géographique
    donnees: {
      coupleA: {
        france: { alimentation: 1111, transport: 435, logement: 893, education: 94, entretien: 67, equipements: 78, habillement: 182, communication: 77, loisirs: 560, sante: 307 },
        idf: { alimentation: 1111, transport: 491, logement: 1124, education: 94, entretien: 67, equipements: 78, habillement: 182, communication: 77, loisirs: 560, sante: 307 },
        horsIdf: { alimentation: 1111, transport: 435, logement: 893, education: 94, entretien: 67, equipements: 78, habillement: 182, communication: 77, loisirs: 560, sante: 307 }
      },
      coupleE: {
        france: { alimentation: 850, transport: 380, logement: 750, education: 85, entretien: 55, equipements: 65, habillement: 150, communication: 70, loisirs: 420, sante: 280 },
        idf: { alimentation: 850, transport: 430, logement: 950, education: 85, entretien: 55, equipements: 65, habillement: 150, communication: 70, loisirs: 420, sante: 280 },
        horsIdf: { alimentation: 850, transport: 380, logement: 720, education: 85, entretien: 55, equipements: 65, habillement: 150, communication: 70, loisirs: 420, sante: 280 }
      },
      monoH: {
        france: { alimentation: 520, transport: 280, logement: 620, education: 65, entretien: 40, equipements: 45, habillement: 95, communication: 55, loisirs: 280, sante: 200 },
        idf: { alimentation: 520, transport: 320, logement: 780, education: 65, entretien: 40, equipements: 45, habillement: 95, communication: 55, loisirs: 280, sante: 200 },
        horsIdf: { alimentation: 520, transport: 270, logement: 580, education: 65, entretien: 40, equipements: 45, habillement: 95, communication: 55, loisirs: 280, sante: 200 }
      }
    },
    
    // Historique UNAF pour calcul évolution
    historique: {
      coupleA: { "2020": 2950, "2021": 3050, "2022": 3280, "2023": 3520, "2024": 3680, "2025": 3806 },
      coupleE: { "2020": 2400, "2021": 2480, "2022": 2670, "2023": 2860, "2024": 2990, "2025": 3105 },
      monoH: { "2020": 1750, "2021": 1820, "2022": 1950, "2023": 2080, "2024": 2150, "2025": 2200 }
    }
  };

  // Calcul du total pour une famille/zone
  const calculerTotal = (famille, zone) => {
    const data = budgetsUNAF.donnees[famille]?.[zone];
    return data ? Object.values(data).reduce((sum, val) => sum + val, 0) : 0;
  };

  const donneesActuelles = budgetsUNAF.donnees[familleType]?.[zoneGeo] || {};
  const totalActuel = calculerTotal(familleType, zoneGeo);
  
  const repartitionData = budgetsUNAF.categories.map(cat => ({
    categorie: cat.nom, montant: donneesActuelles[cat.id] || 0, icon: cat.icon, color: cat.color
  })).filter(d => d.montant > 0).sort((a, b) => b.montant - a.montant);

  const historiqueData = Object.entries(budgetsUNAF.historique[familleType] || {}).map(([annee, total]) => ({
    annee: parseInt(annee), total
  }));

  const smicNetMensuel = d.indicateurs_cles?.smic_net || 1426;
  const partSmic = totalActuel > 0 ? ((totalActuel / smicNetMensuel) * 100).toFixed(0) : 0;
  const total2020 = budgetsUNAF.historique[familleType]?.["2020"] || totalActuel;
  const evolution2020 = total2020 > 0 ? (((totalActuel - total2020) / total2020) * 100).toFixed(0) : 0;

  // ========== HEURES DE TRAVAIL ==========
  const smicHoraireNet = {2010: 6.96, 2012: 7.26, 2015: 7.58, 2018: 7.83, 2020: 8.03, 2022: 8.58, 2024: 9.22, 2025: 9.40, 2026: 9.65};
  const produitsEmblematiques = [
    {id: "iphone", nom: "iPhone", categorie: "High-Tech", icon: "📱", prix: {2010: 629, 2012: 679, 2015: 749, 2018: 859, 2020: 909, 2022: 1019, 2024: 969, 2025: 1019, 2026: 1069}},
    {id: "tv", nom: "TV 55\" 4K", categorie: "High-Tech", icon: "📺", prix: {2010: 2500, 2012: 1800, 2015: 900, 2018: 600, 2020: 500, 2022: 480, 2024: 450, 2025: 420, 2026: 400}},
    {id: "console", nom: "Console jeux", categorie: "High-Tech", icon: "🎮", prix: {2010: 299, 2012: 299, 2015: 399, 2018: 299, 2020: 499, 2022: 549, 2024: 449, 2025: 479, 2026: 499}},
    {id: "plein", nom: "Plein essence 50L", categorie: "Transport", icon: "⛽", prix: {2010: 65, 2012: 80, 2015: 62, 2018: 72, 2020: 65, 2022: 92, 2024: 89, 2025: 86, 2026: 88}},
    {id: "voiture", nom: "Voiture citadine", categorie: "Transport", icon: "🚗", prix: {2010: 12000, 2012: 13000, 2015: 14000, 2018: 15500, 2020: 17000, 2022: 20000, 2024: 22000, 2025: 23000, 2026: 24000}},
    {id: "loyer", nom: "Loyer T3/mois", categorie: "Logement", icon: "🏠", prix: {2010: 620, 2012: 660, 2015: 700, 2018: 750, 2020: 800, 2022: 850, 2024: 920, 2025: 980, 2026: 1020}},
    {id: "vacances", nom: "Vacances 1 sem.", categorie: "Famille", icon: "🏖️", prix: {2010: 1200, 2012: 1300, 2015: 1400, 2018: 1550, 2020: 1600, 2022: 1850, 2024: 2100, 2025: 2200, 2026: 2300}},
    {id: "caddie", nom: "Caddie hebdo", categorie: "Alimentation", icon: "🛒", prix: {2010: 120, 2012: 130, 2015: 135, 2018: 145, 2020: 155, 2022: 180, 2024: 195, 2025: 200, 2026: 210}},
    {id: "resto", nom: "Restaurant 2p.", categorie: "Alimentation", icon: "🍽️", prix: {2010: 45, 2012: 50, 2015: 55, 2018: 60, 2020: 65, 2022: 75, 2024: 85, 2025: 90, 2026: 95}},
    {id: "concert", nom: "Concert", categorie: "Loisirs", icon: "🎤", prix: {2010: 45, 2012: 50, 2015: 55, 2018: 65, 2020: 70, 2022: 80, 2024: 95, 2025: 100, 2026: 110}},
    {id: "lunettes", nom: "Lunettes", categorie: "Santé", icon: "👓", prix: {2010: 350, 2012: 380, 2015: 400, 2018: 350, 2020: 300, 2022: 280, 2024: 250, 2025: 230, 2026: 220}},
  ];
  const anneeActuelle = 2026;

  const calculerHeures = (produit, annee) => {
    const prix = produit.prix?.[annee], smic = smicHoraireNet[annee];
    return (prix && smic) ? (prix / smic).toFixed(1) : null;
  };

  const evolutionProduit = produitSelect ? Object.keys(smicHoraireNet).map(a => ({
    annee: parseInt(a), heures: parseFloat(calculerHeures(produitSelect, parseInt(a))) || 0, prix: produitSelect.prix?.[parseInt(a)] || 0
  })).filter(x => x.heures > 0 && x.prix > 0).sort((a, b) => a.annee - b.annee) : [];

  const variationDepuis2010 = (p) => {
    const h2010 = calculerHeures(p, 2010), hAct = calculerHeures(p, anneeActuelle);
    return (h2010 && hAct) ? (((parseFloat(hAct) - parseFloat(h2010)) / parseFloat(h2010)) * 100).toFixed(0) : null;
  };

  return (
    <div className="space-y-4">
      {/* Navigation sous-onglets */}
      <div className={`flex flex-wrap gap-2`}>
        {[['general','📊 Général'],['budget','🧺 Budget UNAF'],['heures','⏱️ Heures de travail']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${subTab===id?'bg-orange-600 text-white shadow-lg': darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {/* ONGLET GÉNÉRAL */}
      {subTab === 'general' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📊 Inflation vs Salaires (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><BarChart data={d.inflation_salaires}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} /><YAxis {...chartProps.yAxis} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar radius={[6, 6, 0, 0]} dataKey="inflation" name="Inflation" fill={C.secondary} /><Bar radius={[6, 6, 0, 0]} dataKey="smic" name="SMIC" fill={C.primary} /><Bar radius={[6, 6, 0, 0]} dataKey="salaires_base" name="Salaires" fill={C.tertiary} /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Évolution cumulée (base 100)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><LineChart data={d.pouvoir_achat_cumule}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="periode" {...chartProps.xAxis} /><YAxis {...chartProps.yAxis} domain={[98,120]} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="prix" name="Prix" stroke={C.secondary} strokeWidth={2.5} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="smic" name="SMIC" stroke={C.primary} strokeWidth={2.5} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="salaires" name="Salaires" stroke={C.tertiary} strokeWidth={2.5} /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="📋 Part salariés au SMIC" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><BarChart data={d.smic?.part_salaries || []}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} /><YAxis {...chartProps.yAxis} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} /><Bar radius={[6, 6, 0, 0]} dataKey="part" fill={C.quaternary}>{(d.smic?.part_salaries || []).map((e,i)=><Cell key={i} fill={e.part>15?C.secondary:C.quaternary}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
      </div>}

      {/* ONGLET BUDGET UNAF */}
      {subTab === 'budget' && <div className="space-y-4">
        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-orange-900 to-amber-900' : 'bg-gradient-to-r from-orange-500 to-amber-500'} text-white`}>
          <h2 className="text-lg font-bold">🧺 Budget-Type Familial (UNAF)</h2>
          <p className="text-sm opacity-90">Source officielle : <a href={budgetsUNAF.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">UNAF</a> • Données {budgetsUNAF.lastUpdate}</p>
          <p className="text-xs opacity-75 mt-1">{budgetsUNAF.description}</p>
        </div>

        {/* Sélecteurs */}
        <div className={`p-3 rounded-xl flex flex-wrap gap-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div>
            <label className={`text-xs font-medium block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Type de famille</label>
            <div className="flex gap-1">
              {Object.entries(budgetsUNAF.familles).map(([id, f]) => (
                <button key={id} onClick={() => setFamilleType(id)} className={`px-2 py-1.5 rounded-lg text-xs ${familleType === id ? 'bg-orange-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {f.icon} {f.nom.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-xs font-medium block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Zone géographique</label>
            <div className="flex gap-1">
              {[['horsIdf', '🌳 Province'], ['idf', '🏙️ Île-de-France'], ['france', '🇫🇷 Moyenne France']].map(([id, label]) => (
                <button key={id} onClick={() => setZoneGeo(id)} className={`px-2 py-1.5 rounded-lg text-xs ${zoneGeo === id ? 'bg-blue-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-orange-900/30 border border-orange-700' : 'bg-orange-50 border border-orange-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>Budget mensuel</p>
            <p className="text-3xl font-bold text-orange-500">{totalActuel.toLocaleString('fr-FR')}€</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{budgetsUNAF.familles[familleType]?.nom}</p>
          </div>
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-600'}`}>Équivalent SMIC</p>
            <p className={`text-3xl font-bold ${parseInt(partSmic) > 200 ? 'text-red-500' : 'text-orange-500'}`}>{partSmic}%</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>≈ {(totalActuel / smicNetMensuel).toFixed(1)} SMIC nets</p>
          </div>
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Évolution 2020→2025</p>
            <p className="text-3xl font-bold text-blue-500">+{evolution2020}%</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>+{(totalActuel - total2020).toLocaleString('fr-FR')}€/mois</p>
          </div>
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-purple-900/30 border border-purple-700' : 'bg-purple-50 border border-purple-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>Catégories UNAF</p>
            <p className="text-3xl font-bold text-purple-500">10</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>postes budgétaires</p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="📈 Évolution du budget 2020-2025" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={historiqueData}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="annee" {...chartProps.xAxis} />
                <YAxis {...chartProps.yAxis} domain={['dataMin - 300', 'dataMax + 200']} tickFormatter={v => `${v}€`} />
                <Tooltip {...chartProps.tooltip} formatter={(v) => [`${v.toLocaleString('fr-FR')}€`, 'Budget']} />
                <Bar radius={[6, 6, 0, 0]} dataKey="total" fill={C.primary}>
                  {historiqueData.map((e, i) => <Cell key={i} fill={e.annee === 2025 ? C.secondary : C.primary} />)}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="🥧 Répartition par poste" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={repartitionData} layout="vertical">
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis {...chartProps.xAxis} type="number" tickFormatter={v => `${v}€`} />
                <YAxis {...chartProps.yAxis} dataKey="categorie" type="category" width={90} fontSize={10} />
                <Tooltip {...chartProps.tooltip} formatter={(v) => [`${v}€/mois`, '']} />
                <Bar radius={[6, 6, 0, 0]} dataKey="montant">
                  {repartitionData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Détail par catégorie */}
        <Card title="📋 Détail du budget mensuel" darkMode={darkMode}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {budgetsUNAF.categories.map(cat => {
              const montant = donneesActuelles[cat.id] || 0;
              const pct = totalActuel > 0 ? ((montant / totalActuel) * 100).toFixed(0) : 0;
              return (
                <div key={cat.id} className={`p-3 rounded-xl border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{cat.icon}</span>
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{cat.nom}</span>
                  </div>
                  <p className="text-xl font-bold" style={{color: cat.color}}>{montant}€</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{pct}% du budget</p>
                </div>
              );
            })}
          </div>
          <div className={`mt-4 p-3 rounded-xl ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              💡 <strong>Source officielle :</strong> Ces données proviennent des <a href={budgetsUNAF.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">budgets-types UNAF</a>, 
              qui évaluent les dépenses nécessaires pour vivre décemment. Mis à jour mensuellement.
            </p>
          </div>
        </Card>
      </div>}

      {/* ONGLET HEURES DE TRAVAIL */}
      {subTab === 'heures' && <div className="space-y-4">
        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-blue-900 to-indigo-900' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white`}>
          <h2 className="text-lg font-bold">⏱️ Heures de travail au SMIC</h2>
          <p className="text-sm opacity-90">Combien d'heures de travail au SMIC pour acheter... ?</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {produitsEmblematiques.map(p => {
            const heures = calculerHeures(p, anneeActuelle);
            const variation = variationDepuis2010(p);
            const isSelected = produitSelect?.id === p.id;
            return (
              <div key={p.id} onClick={() => setProduitSelect(isSelected ? null : p)} 
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 ' + (darkMode ? 'bg-blue-900/30 border-blue-500' : 'bg-blue-50 border-blue-300') : darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow'}`}>
                <div className="flex justify-between items-start">
                  <span className="text-2xl">{p.icon}</span>
                  {variation && <span className={`text-xs px-1.5 py-0.5 rounded-lg font-medium ${parseInt(variation) > 0 ? (darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-600') : (darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-600')}`}>{parseInt(variation) > 0 ? '+' : ''}{variation}%</span>}
                </div>
                <p className={`text-xs font-medium mt-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{p.nom}</p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{p.prix?.[anneeActuelle]?.toLocaleString('fr-FR')}€</p>
                <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <p className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{heures}h</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>au SMIC en {anneeActuelle}</p>
                </div>
              </div>
            );
          })}
        </div>

        {produitSelect && evolutionProduit.length > 0 && (
          <Card title={`📈 Évolution : ${produitSelect.icon} ${produitSelect.nom}`} darkMode={darkMode}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Heures de travail nécessaires</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={evolutionProduit}>
                    <CartesianGrid {...chartProps.cartesianGrid} />
                    <XAxis dataKey="annee" {...chartProps.xAxis} />
                    <YAxis {...chartProps.yAxis} />
                    <Tooltip {...chartProps.tooltip} formatter={v=>[`${v}h`, 'Heures']} />
                    <Bar radius={[6, 6, 0, 0]} dataKey="heures" fill={C.primary}>
                      {evolutionProduit.map((e,i)=><Cell key={i} fill={e.annee===anneeActuelle?C.secondary:C.primary}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Évolution du prix</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={evolutionProduit}>
                    <CartesianGrid {...chartProps.cartesianGrid} />
                    <XAxis dataKey="annee" {...chartProps.xAxis} />
                    <YAxis {...chartProps.yAxis} tickFormatter={v => `${v}€`} />
                    <Tooltip {...chartProps.tooltip} formatter={v=>[`${v.toLocaleString('fr-FR')}€`, 'Prix']} />
                    <Line strokeLinecap="round" strokeLinejoin="round" dataKey="prix" stroke={C.tertiary} strokeWidth={3} dot={{ fill: C.tertiary, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )}

        {!produitSelect && (
          <div className={`text-center p-8 rounded-2xl border-2 border-dashed ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
            <p className="text-4xl mb-2">👆</p>
            <p>Cliquez sur un produit pour voir son évolution depuis 2010</p>
          </div>
        )}

        <div className={`p-3 rounded-xl text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
          <p><strong>📊 Méthodologie :</strong> Heures = Prix du produit ÷ SMIC horaire net de l'année. 
          La variation indique si le produit est devenu plus accessible (vert, -%) ou moins accessible (rouge, +%) pour un salarié au SMIC depuis 2010.</p>
        </div>
      </div>}
      
      {d.sources_par_onglet?.pouvoir_achat && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.pouvoir_achat}</p>
      )}
    </div>
  );
}

function SalairesTab({d, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      <Card title="💰 Salaire médian net" darkMode={darkMode} favoriId="salaire_median" isFavori={fp.isFavori?.("salaire_median")} toggleFavori={fp.toggleFavori}>
        <ResponsiveContainer width="100%" height={200}><BarChart data={d.salaire_median.evolution}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} /><YAxis {...chartProps.yAxis} domain={[1800,2300]} fontSize={11} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}€`} /><Bar radius={[6, 6, 0, 0]} dataKey="montant" fill={C.primary} /></BarChart></ResponsiveContainer>
        <p className="text-center text-xl font-bold text-green-600 mt-2">{d.salaire_median.montant_2024}€</p>
      </Card>
      <Card title="👫 Écart H/F (EQTP)" darkMode={darkMode}>
        <ResponsiveContainer width="100%" height={200}><LineChart data={d.ecart_hommes_femmes.evolution}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} /><YAxis {...chartProps.yAxis} domain={[10,20]} fontSize={11} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="ecart" stroke={C.pink} strokeWidth={3} /></LineChart></ResponsiveContainer>
        <div className="flex justify-around text-xs mt-2"><div className="text-center"><span className={darkMode ? "text-gray-400" : "text-gray-500"}>Global</span><br/><b>{d.ecart_hommes_femmes.ecart_global}%</b></div><div className="text-center"><span className={darkMode ? "text-gray-400" : "text-gray-500"}>EQTP</span><br/><b className="text-pink-600">{d.ecart_hommes_femmes.ecart_eqtp}%</b></div><div className="text-center"><span className={darkMode ? "text-gray-400" : "text-gray-500"}>Poste égal</span><br/><b className="text-green-600">{d.ecart_hommes_femmes.ecart_poste_comparable}%</b></div></div>
      </Card>
      <Card title="🏭 Salaires par secteur" darkMode={darkMode} favoriId="ecart_hf" isFavori={fp.isFavori?.("ecart_hf")} toggleFavori={fp.toggleFavori}>
        <ResponsiveContainer width="100%" height={200}><BarChart data={d.salaires_secteur} layout="vertical"><CartesianGrid {...chartProps.cartesianGrid} /><XAxis {...chartProps.xAxis} type="number" fontSize={11} /><YAxis {...chartProps.yAxis} dataKey="secteur" type="category" width={70} fontSize={10} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}€`} /><Bar radius={[6, 6, 0, 0]} dataKey="salaire" fill={C.primary} /></BarChart></ResponsiveContainer>
      </Card>
      <Card title="🎁 PPV" darkMode={darkMode}>
        <div className="grid grid-cols-2 gap-2 p-2">
          <div className={`text-center p-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><p className="text-xs">Bénéf. 2023</p><p className="text-xl font-bold text-blue-600">{d.ppv.beneficiaires_2023}%</p></div>
          <div className={`text-center p-3 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}><p className="text-xs">Bénéf. 2024</p><p className="text-xl font-bold text-orange-600">{d.ppv.beneficiaires_2024}%</p></div>
          <div className={`text-center p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}><p className="text-xs">Montant moy.</p><p className="text-xl font-bold text-green-600">{d.ppv.montant_moyen}€</p></div>
          <div className={`text-center p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}><p className="text-xs">Total 2024</p><p className="text-xl font-bold">{d.ppv.montant_total_2024}Md€</p></div>
        </div>
      </Card>
      
      {d.sources_par_onglet?.salaires && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200 col-span-2">📚 Sources : {d.sources_par_onglet.salaires}</p>
      )}
    </div>
  );
}

function EmploiTab({d, subTab, setSubTab, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-2`}>
        {[['chomage','👥 Chômage'],['seniors','👴 Seniors'],['vacants','📋 Vacants'],['contrats','📝 Contrats'],['secteurs','🏢 Secteurs'],['recrutement','🎯 Recrutement'],['dynamique','📊 Dynamique']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${subTab===id?'bg-purple-600 text-white shadow-lg': darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'chomage' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📉 Taux de chômage (%)" darkMode={darkMode} favoriId="chomage" isFavori={fp.isFavori?.("chomage")} toggleFavori={fp.toggleFavori}>
          <ResponsiveContainer width="100%" height={180}><LineChart data={d.chomage}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} /><YAxis {...chartProps.yAxis} domain={[0,22]} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="taux" name="Ensemble" stroke={C.primary} strokeWidth={3} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="jeunes" name="15-24 ans" stroke={C.secondary} strokeWidth={2.5} strokeDasharray="5 5" /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="📊 Dernières données" darkMode={darkMode}>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div className={`text-center p-4 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><p className="text-sm text-gray-600">Global</p><p className="text-3xl font-bold text-blue-600">{d.indicateurs_cles.taux_chomage_actuel}%</p></div>
            <div className={`text-center p-4 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}><p className="text-sm text-gray-600">Jeunes</p><p className="text-3xl font-bold text-red-600">{d.indicateurs_cles.taux_chomage_jeunes}%</p></div>
          </div>
        </Card>
      </div>}

      {subTab === 'seniors' && <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Graphique taux d'emploi 55-64 (données statiques) */}
          <Card title="👴 Taux d'emploi 55-64 ans (%)" darkMode={darkMode} favoriId="emploi_seniors" isFavori={fp.isFavori?.("emploi_seniors")} toggleFavori={fp.toggleFavori}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={d.emploi_seniors}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                <YAxis {...chartProps.yAxis} domain={[50, 65]} fontSize={11} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Area dataKey="taux" fill={C.tertiary} fillOpacity={0.2} stroke="none" />
                <Line strokeLinecap="round" strokeLinejoin="round" dataKey="taux" stroke={C.tertiary} strokeWidth={3} dot={{ fill: C.tertiary, strokeWidth: 2 }} />
                <ReferenceLine y={65.2} stroke={C.quaternary} strokeDasharray="5 5" label={{ value: 'Moy. UE', position: 'right', fontSize: 10, fill: C.quaternary }} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Source : INSEE Enquête Emploi (données statiques)</p>
          </Card>
          
          {/* Graphique taux de chômage 50+ (données API) */}
          <Card title="📉 Taux de chômage 50+ (%)" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={d.chomage_seniors}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                <YAxis {...chartProps.yAxis} domain={[3, 8]} fontSize={11} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Area dataKey="taux" fill={C.secondary} fillOpacity={0.2} stroke="none" />
                <Line strokeLinecap="round" strokeLinejoin="round" dataKey="taux" stroke={C.secondary} strokeWidth={3} dot={{ fill: C.secondary, strokeWidth: 2 }} />
                <ReferenceLine y={7.4} stroke={C.quaternary} strokeDasharray="5 5" label={{ value: 'Moy. nationale', position: 'right', fontSize: 10, fill: C.quaternary }} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Source : INSEE série 001688530 (API automatique)</p>
          </Card>
        </div>
        
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux d'emploi 55-64</p>
            <p className="text-2xl font-bold text-green-600">{d.emploi_seniors?.[d.emploi_seniors.length-1]?.taux || 60.4}%</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux d'emploi 60-64</p>
            <p className="text-2xl font-bold text-blue-600">{d.emploi_seniors_detail?.taux_60_64 || 38.9}%</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chômage 50+ (API)</p>
            <p className="text-2xl font-bold text-orange-600">{d.chomage_seniors?.[d.chomage_seniors.length-1]?.taux || 5.2}%</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Évolution emploi /1 an</p>
            <p className="text-2xl font-bold text-purple-600">+{d.emploi_seniors_detail?.evolution_1an || 1.9} pts</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="🇪🇺 Comparaison européenne - Taux d'emploi 55-64 ans" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[
                {pays: '🇸🇪 Suède', taux: 77.0},
                {pays: '🇩🇪 Allemagne', taux: 72.3},
                {pays: '🇳🇱 Pays-Bas', taux: 71.2},
                {pays: '🇪🇺 Moy. UE', taux: 65.2},
                {pays: '🇫🇷 France', taux: d.emploi_seniors?.[d.emploi_seniors.length-1]?.taux || 60.4},
                {pays: '🇮🇹 Italie', taux: 57.3},
                {pays: '🇪🇸 Espagne', taux: 55.8},
              ]} layout="vertical">
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis {...chartProps.xAxis} type="number" domain={[0, 85]} fontSize={11} />
                <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={90} fontSize={10} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Bar radius={[6, 6, 0, 0]} dataKey="taux" fill={C.primary}>
                  {[0,1,2,3,4,5,6].map(i => (
                    <Cell key={i} fill={i === 4 ? C.tertiary : i === 3 ? C.quaternary : C.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          
          <Card title="📈 Évolution historique" darkMode={darkMode}>
            <div className="space-y-2 p-2">
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p className="font-semibold mb-2">Progression du taux d'emploi 55-64 ans :</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className="text-xs opacity-75">2010</span>
                    <p className="font-bold">39.7%</p>
                  </div>
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className="text-xs opacity-75">2015</span>
                    <p className="font-bold">48.7%</p>
                  </div>
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className="text-xs opacity-75">2020</span>
                    <p className="font-bold">53.8%</p>
                  </div>
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                    <span className="text-xs opacity-75">2025</span>
                    <p className="font-bold text-green-600">{d.indicateurs_cles.taux_emploi_seniors || 58.4}%</p>
                  </div>
                </div>
                <p className="text-xs mt-2 opacity-75">
                  📈 +{((d.emploi_seniors?.[d.emploi_seniors.length-1]?.taux || 60.4) - 39.7).toFixed(1)} points en 15 ans
                </p>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Note de lecture */}
        <div className={`p-4 rounded-xl border-l-4 border-green-500 ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
          <h4 className={`font-semibold mb-2 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>📖 Note de lecture</h4>
          <ul className={`text-sm space-y-1 ${darkMode ? 'text-green-200' : 'text-green-700'}`}>
            <li>• Le <b>taux d'emploi des 55-64 ans</b> mesure la part des personnes en emploi parmi cette tranche d'âge (données statiques INSEE)</li>
            <li>• Le <b>taux de chômage des 50+</b> est récupéré automatiquement via l'API INSEE (série 001688530)</li>
            <li>• La France a progressé de +21 pts depuis 2010 grâce aux réformes des retraites successives</li>
            <li>• Mais reste en-dessous de la moyenne européenne (65.2%) et loin de l'Allemagne (72%)</li>
            <li>• Le taux d'emploi chute fortement après 60 ans ({d.emploi_seniors_detail?.taux_60_64 || 38.9}%) : effet de l'âge légal de départ</li>
            <li>• Le chômage des 50+ ({d.chomage_seniors?.[d.chomage_seniors.length-1]?.taux || 5.2}%) est plus faible que la moyenne nationale (7.4%) mais la durée de chômage est plus longue (18 mois en moyenne)</li>
          </ul>
        </div>
      </div>}
      {subTab === 'vacants' && d.emplois_vacants && (
        <div className="space-y-4">
          {/* KPIs principaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Emplois vacants</p>
              <p className="text-2xl font-bold text-blue-600">
                {d.emplois_vacants.emplois_vacants?.length > 0 
                  ? `${(d.emplois_vacants.emplois_vacants[d.emplois_vacants.emplois_vacants.length-1].valeur / 1000).toFixed(0)}k`
                  : 'N/A'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {d.emplois_vacants.emplois_vacants?.[d.emplois_vacants.emplois_vacants.length-1]?.trimestre}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Emplois occupés</p>
              <p className="text-2xl font-bold text-green-600">
                {d.emplois_vacants.emplois_occupes?.length > 0 
                  ? `${(d.emplois_vacants.emplois_occupes[d.emplois_vacants.emplois_occupes.length-1].valeur / 1000000).toFixed(1)}M`
                  : 'N/A'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {d.emplois_vacants.emplois_occupes?.[d.emplois_vacants.emplois_occupes.length-1]?.trimestre}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux de vacance</p>
              <p className="text-2xl font-bold text-orange-600">
                {d.emplois_vacants.taux_vacance?.length > 0 
                  ? `${d.emplois_vacants.taux_vacance[d.emplois_vacants.taux_vacance.length-1].taux}%`
                  : 'N/A'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {d.emplois_vacants.taux_vacance?.[d.emplois_vacants.taux_vacance.length-1]?.trimestre}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source</p>
              <p className="text-sm font-bold text-purple-600">{d.emplois_vacants.source || 'DARES'}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Màj : {d.emplois_vacants.derniere_maj}
              </p>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Graphique Emplois vacants */}
            <Card title="📋 Nombre d'emplois vacants" darkMode={darkMode}>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={d.emplois_vacants.emplois_vacants}>
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                  <YAxis 
                    {...chartProps.yAxis} 
                    fontSize={11}
                    tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    {...chartProps.tooltip} 
                    formatter={(v) => [`${v.toLocaleString()} postes`, 'Emplois vacants']}
                  />
                  <Area dataKey="valeur" fill={C.primary} fillOpacity={0.2} stroke="none" />
                  <Line 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    dataKey="valeur" 
                    stroke={C.primary} 
                    strokeWidth={3} 
                    dot={{ fill: C.primary, strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Postes à pourvoir avec recherche active de candidat
              </p>
            </Card>

            {/* Graphique Taux de vacance */}
            <Card title="📊 Taux d'emplois vacants (%)" darkMode={darkMode}>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={d.emplois_vacants.taux_vacance}>
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                  <YAxis 
                    {...chartProps.yAxis} 
                    domain={[0, 2.5]} 
                    fontSize={11}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    {...chartProps.tooltip} 
                    formatter={(v) => [`${v}%`, 'Taux de vacance']}
                  />
                  <ReferenceLine 
                    y={1.5} 
                    stroke={C.quaternary} 
                    strokeDasharray="5 5" 
                    label={{ value: 'Seuil tension', position: 'right', fontSize: 10, fill: C.quaternary }} 
                  />
                  <Area dataKey="taux" fill={C.secondary} fillOpacity={0.2} stroke="none" />
                  <Line 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    dataKey="taux" 
                    stroke={C.secondary} 
                    strokeWidth={3} 
                    dot={{ fill: C.secondary, strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Ratio emplois vacants / (vacants + occupés)
              </p>
            </Card>
          </div>

          {/* Graphique Emplois occupés */}
          <Card title="👥 Évolution des emplois occupés" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={d.emplois_vacants.emplois_occupes}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                <YAxis 
                  {...chartProps.yAxis} 
                  fontSize={11}
                  tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`}
                  domain={['dataMin - 500000', 'dataMax + 500000']}
                />
                <Tooltip 
                  {...chartProps.tooltip} 
                  formatter={(v) => [`${(v/1000000).toFixed(2)} millions`, 'Emplois occupés']}
                />
                <Area dataKey="valeur" fill={C.tertiary} fillOpacity={0.2} stroke="none" />
                <Line 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  dataKey="valeur" 
                  stroke={C.tertiary} 
                  strokeWidth={3} 
                  dot={{ fill: C.tertiary, strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Par secteur si disponible */}
          {d.emplois_vacants.par_secteur && d.emplois_vacants.par_secteur.length > 0 && (
            <Card title="🏢 Emplois vacants par secteur" darkMode={darkMode}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.emplois_vacants.par_secteur} layout="vertical">
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis 
                    {...chartProps.xAxis} 
                    type="number" 
                    fontSize={11}
                    tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    {...chartProps.yAxis} 
                    dataKey="secteur" 
                    type="category" 
                    width={140} 
                    fontSize={10} 
                  />
                  <Tooltip 
                    {...chartProps.tooltip} 
                    formatter={(v, name) => {
                      if (name === 'vacants') return [`${v.toLocaleString()} postes`, 'Emplois vacants'];
                      if (name === 'taux') return [`${v}%`, 'Taux de vacance'];
                      return [v, name];
                    }}
                  />
                  <Bar 
                    radius={[0, 6, 6, 0]} 
                    dataKey="vacants" 
                    fill={C.primary}
                  >
                    {d.emplois_vacants.par_secteur.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.taux > 2.5 ? C.secondary : entry.taux > 1.5 ? C.quaternary : C.primary} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                🔴 Taux &gt; 2.5% | 🟠 Taux &gt; 1.5% | 🔵 Taux normal
              </p>
            </Card>
          )}

          {/* Notes de lecture */}
          {d.emplois_vacants.notes_lecture && (
            <BubbleNote type="info" title="💡 Notes de lecture" darkMode={darkMode}>
              <ul className="space-y-1">
                {d.emplois_vacants.notes_lecture.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </BubbleNote>
          )}

          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} text-center`}>
            📚 Source : {d.emplois_vacants.source || 'DARES - Enquête ACEMO'}
          </p>
        </div>
      )}
      {subTab === 'contrats' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📋 Répartition contrats" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><BarChart data={d.types_contrats}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar radius={[6, 6, 0, 0]} dataKey="cdi" name="CDI" stackId="a" fill={C.primary} /><Bar radius={[6, 6, 0, 0]} dataKey="cdd" name="CDD" stackId="a" fill={C.quaternary} /><Bar radius={[6, 6, 0, 0]} dataKey="interim" name="Intérim" stackId="a" fill={C.secondary} /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="📊 T3 2025" darkMode={darkMode}><div className="p-4 space-y-2">{(()=>{const l=d.types_contrats[d.types_contrats.length-1];return<><div className={`flex justify-between p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><span>CDI</span><b className="text-blue-600">{l.cdi}%</b></div><div className={`flex justify-between p-2 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}><span>CDD</span><b className="text-orange-600">{l.cdd}%</b></div><div className={`flex justify-between p-2 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}><span>Intérim</span><b className="text-red-600">{l.interim}%</b></div></>})()}</div></Card>
      </div>}

      {subTab === 'secteurs' && <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="🏭 Emploi par secteur (k)" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}><BarChart data={d.emploi_secteur.secteurs} layout="vertical"><CartesianGrid {...chartProps.cartesianGrid} /><XAxis {...chartProps.xAxis} type="number" fontSize={11} /><YAxis {...chartProps.yAxis} dataKey="secteur" type="category" width={130} fontSize={9} /><Tooltip {...chartProps.tooltip} formatter={(v) => [`${v.toLocaleString('fr-FR')} k`, 'Emplois salariés']} /><Bar radius={[0, 6, 6, 0]} dataKey="emploi" fill={C.primary}>{d.emploi_secteur.secteurs.map((e,i)=><Cell key={i} fill={e.evolution_trim<0?C.secondary:C.tertiary}/>)}</Bar></BarChart></ResponsiveContainer>
          </Card>
          <Card title="📈 Évolutions annuelles" darkMode={darkMode}>
            <div className="p-2 space-y-2">
              {d.emploi_secteur.secteurs.map((s,i)=>(
                <div key={i} className={`flex justify-between items-center text-xs p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{s.secteur}</span>
                  <div className="flex gap-2 text-right">
                    <span className={`font-mono ${s.evolution_trim>=0?'text-green-600':'text-red-500'}`}>{s.evolution_trim>=0?'+':''}{s.evolution_trim}%/trim</span>
                    <span className={`font-mono font-bold ${s.evolution_an>=0?'text-green-600':'text-red-500'}`}>{s.evolution_an>=0?'+':''}{s.evolution_an}%/an</span>
                  </div>
                </div>
              ))}
              <p className={`text-xs pt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Màj : {d.emploi_secteur.derniere_mise_a_jour || 'N/A'} · {d.emploi_secteur.source || 'INSEE CVS'}
              </p>
            </div>
          </Card>
        </div>
        {d.emploi_secteur.evolution_trimestrielle?.length > 0 && (
          <Card title={`📊 Évolution trimestrielle de l'emploi salarié (k) — jusqu'au ${d.emploi_secteur.derniere_mise_a_jour || ''}`} darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.emploi_secteur.evolution_trimestrielle}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                <YAxis {...chartProps.yAxis} fontSize={10} domain={['auto','auto']} />
                <Tooltip {...chartProps.tooltip} formatter={(v) => v ? [`${v.toLocaleString('fr-FR')} k`, ''] : ['N/A','']} />
                <Legend {...chartProps.legend} />
                <Line strokeLinecap="round" strokeLinejoin="round" dataKey="industrie" name="Industrie" stroke={C.primary} strokeWidth={2} dot={false} />
                <Line strokeLinecap="round" strokeLinejoin="round" dataKey="construction" name="Construction" stroke={C.quaternary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>}

      {subTab === 'recrutement' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="🔴 Difficultés recrutement (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={200}><LineChart data={d.difficultes_recrutement}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} /><YAxis {...chartProps.yAxis} domain={[20,70]} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="construction" name="BTP" stroke={C.quaternary} strokeWidth={2.5} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="industrie" name="Industrie" stroke={C.primary} strokeWidth={2.5} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="services" name="Services" stroke={C.tertiary} strokeWidth={2.5} /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="⚠️ Métiers en tension" darkMode={darkMode}>
          <div className="overflow-x-auto max-h-48"><table className="w-full text-xs"><thead><tr className="bg-gray-100"><th className="text-left p-1">Métier</th><th className="p-1">%</th></tr></thead><tbody>{d.tensions_metiers.metiers_plus_tendus.slice(0,6).map((m,i)=><tr key={i} className="border-b"><td className="p-1">{m.metier}</td><td className="p-1 text-center"><span className={`px-1 py-0.5 rounded-lg text-white text-xs ${m.difficulte>=80?'bg-red-600':'bg-orange-500'}`}>{m.difficulte}%</span></td></tr>)}</tbody></table></div>
        </Card>
      </div>}

      {subTab === 'dynamique' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📊 Créations/Destructions (k)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><ComposedChart data={d.creations_destructions.donnees}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar radius={[6, 6, 0, 0]} dataKey="creations" name="Créations" fill={C.tertiary} /><Bar radius={[6, 6, 0, 0]} dataKey="destructions" name="Destructions" fill={C.secondary} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="solde" name="Solde" stroke={C.primary} strokeWidth={3} /></ComposedChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Solde net" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><BarChart data={d.creations_destructions.donnees}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v>=0?'+':''}${v}k`} /><Bar radius={[6, 6, 0, 0]} dataKey="solde">{d.creations_destructions.donnees.map((e,i)=><Cell key={i} fill={e.solde>=0?C.tertiary:C.secondary}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
      </div>}
      
      {d.sources_par_onglet?.emploi && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.emploi}</p>
      )}
    </div>
  );
}

function ConditionsVieTab({d, subTab, setSubTab, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-2`}>
        {[['loyers','🏠 Loyers (IRL)'],['immobilier','🏗️ Prix immobilier'],['carburants','⛽ Carburants'],['effort','💸 Taux d\'effort']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${subTab===id?'bg-cyan-600 text-white shadow-lg': darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'loyers' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📈 Indice de Référence des Loyers (IRL)" darkMode={darkMode} favoriId="irl" isFavori={fp.isFavori?.("irl")} toggleFavori={fp.toggleFavori}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={d.irl.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} yAxisId="left" domain={[130,150]} fontSize={11} />
              <YAxis {...chartProps.yAxis} yAxisId="right" orientation="right" domain={[0,4]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} />
              <Legend {...chartProps.legend} />
              <Bar yAxisId="right" dataKey="glissement" name="Glissement %" fill={C.quaternary} />
              <Line yAxisId="left" dataKey="indice" name="Indice" stroke={C.primary} strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Situation actuelle" darkMode={darkMode}>
          <div className="p-4 space-y-3">
            <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}>
              <span>IRL actuel</span><span className="text-2xl font-bold text-blue-600">{d.irl.valeur_actuelle}</span>
            </div>
            <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}>
              <span>Glissement annuel</span><span className="text-2xl font-bold text-green-600">+{d.irl.glissement_annuel}%</span>
            </div>
            <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} p-3 rounded-lg text-xs`}>
              <p className="font-semibold">💡 Impact loyer 800€</p>
              <p>Hausse max = <b>+{(800 * d.irl.glissement_annuel / 100).toFixed(0)}€/mois</b></p>
            </div>
          </div>
        </Card>
      </div>}

      {subTab === 'immobilier' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="🏠 Prix logements anciens" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={d.prix_immobilier.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} domain={[110,130]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} />
              <Area dataKey="indice" fill={C.primary} fillOpacity={0.2} stroke="none" />
              <Line strokeLinecap="round" strokeLinejoin="round" dataKey="indice" stroke={C.primary} strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="💰 Prix/m² par zone" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.prix_immobilier.par_zone} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" fontSize={11} />
              <YAxis {...chartProps.yAxis} dataKey="zone" type="category" width={80} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v=>`${v.toLocaleString()}€/m²`} />
              <Bar radius={[6, 6, 0, 0]} dataKey="prix_m2" fill={C.primary}>
                {d.prix_immobilier.par_zone.map((e,i)=><Cell key={i} fill={e.variation<0?C.secondary:C.tertiary}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {subTab === 'carburants' && (() => {
        const carb = d.carburants;
        const granularite = carb.granularite || 'mensuel';
        const estQuotidien = granularite === 'quotidien';
        // Formater la date pour l'axe X : quotidien → JJ/MM, mensuel → label existant
        const formatXAxis = (val) => {
          if (!val) return '';
          if (estQuotidien && val.includes('-')) {
            const [y, m, j] = val.split('-');
            return `${j}/${m}`;
          }
          return val.length > 8 ? val.slice(0, 6) : val;
        };
        const varColor = (v) => v != null && v < 0 ? 'text-green-600' : 'text-red-600';
        const CarburantRow = ({ label, data, color, bgLight, bgDark }) => (
          <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? bgDark : bgLight}`}>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
            <div className="text-right">
              <span className={`text-xl font-bold`} style={{color}}>{data?.prix}€/L</span>
              <div className="flex gap-2 justify-end mt-0.5">
                {data?.variation_sem != null && (
                  <span className={`text-[10px] font-medium ${varColor(data.variation_sem)}`}>
                    sem. {data.variation_sem > 0 ? '+' : ''}{data.variation_sem}%
                  </span>
                )}
                {data?.variation_an != null && (
                  <span className={`text-[10px] font-medium ${varColor(data.variation_an)}`}>
                    an {data.variation_an > 0 ? '+' : ''}{data.variation_an}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Graphique */}
            <Card title={`⛽ Prix carburants — ${estQuotidien ? 'Historique quotidien' : 'Historique mensuel'}`} darkMode={darkMode} favoriId="gazole" isFavori={fp.isFavori?.("gazole")} toggleFavori={fp.toggleFavori}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={carb.evolution}>
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis
                    dataKey={estQuotidien ? 'date' : 'mois'}
                    {...chartProps.xAxis}
                    fontSize={8}
                    tickFormatter={formatXAxis}
                    interval={estQuotidien ? Math.floor((carb.evolution?.length || 30) / 6) : 'preserveStartEnd'}
                  />
                  <YAxis {...chartProps.yAxis} domain={['auto', 'auto']} fontSize={11} tickFormatter={v => `${v}€`} />
                  <Tooltip
                    {...chartProps.tooltip}
                    labelFormatter={v => estQuotidien ? v : v}
                    formatter={(v, n) => [`${v}€/L`, n]}
                  />
                  <Legend {...chartProps.legend} />
                  <Line strokeLinecap="round" strokeLinejoin="round" dataKey="gazole" name="Gazole" stroke={C.quaternary} strokeWidth={2} dot={false} />
                  <Line strokeLinecap="round" strokeLinejoin="round" dataKey="sp95" name="SP95" stroke={C.tertiary} strokeWidth={2} dot={false} />
                  {carb.evolution?.some(e => e.e10) && (
                    <Line strokeLinecap="round" strokeLinejoin="round" dataKey="e10" name="E10" stroke={C.primary} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <p className={`text-[10px] px-4 pb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                {carb.source} · Dernière donnée : {carb.derniere_donnee}
              </p>
            </Card>

            {/* Prix actuels */}
            <Card title={`💰 Prix du ${estQuotidien ? carb.derniere_donnee?.slice(0,10) || 'jour' : carb.derniere_donnee || 'mois'}`} darkMode={darkMode}>
              <div className="p-3 space-y-2">
                <CarburantRow label="Gazole" data={carb.gazole} color="#d97706" bgLight="bg-orange-50" bgDark="bg-orange-900/30" />
                <CarburantRow label="SP95" data={carb.sp95} color="#16a34a" bgLight="bg-green-50" bgDark="bg-green-900/30" />
                <CarburantRow label="SP98" data={carb.sp98} color="#2563eb" bgLight="bg-blue-50" bgDark="bg-blue-900/30" />
                {carb.e10?.prix && (
                  <CarburantRow label="E10" data={carb.e10} color="#7c3aed" bgLight="bg-purple-50" bgDark="bg-purple-900/30" />
                )}
                <p className={`text-[10px] pt-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  {estQuotidien
                    ? '📡 Données temps réel · Moyenne nationale toutes stations'
                    : '📅 Données mensuelles INSEE · Fallback'}
                </p>
              </div>
            </Card>
          </div>
        );
      })()}

      {subTab === 'effort' && <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="🏠 Taux d'effort par statut" darkMode={darkMode} favoriId="taux_effort_logement" isFavori={fp.isFavori?.("taux_effort_logement")} toggleFavori={fp.toggleFavori}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.taux_effort.par_statut} layout="vertical">
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis {...chartProps.xAxis} type="number" domain={[0,50]} fontSize={11} />
                <YAxis {...chartProps.yAxis} dataKey="statut" type="category" width={120} fontSize={9} />
                <Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} />
                <Legend {...chartProps.legend} />
                <Bar radius={[6, 6, 0, 0]} dataKey="taux_median" name="Médian" fill={C.primary} />
                <Bar radius={[6, 6, 0, 0]} dataKey="taux_q1" name="25% + modestes" fill={C.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="📊 Par revenu" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.taux_effort.par_revenu}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="quartile" {...chartProps.xAxis} fontSize={9} />
                <YAxis {...chartProps.yAxis} domain={[0,35]} fontSize={11} />
                <Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} />
                <Bar radius={[6, 6, 0, 0]} dataKey="taux" fill={C.quaternary}>
                  {d.taux_effort.par_revenu.map((e,i)=><Cell key={i} fill={e.taux>25?C.secondary:C.quaternary}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>}
      
      {d.sources_par_onglet?.conditions_vie && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.conditions_vie}</p>
      )}
    </div>
  );
}

function InflationTab({d, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="space-y-4">
      <Card title="📊 Inflation par poste (%)" darkMode={darkMode} favoriId="inflation" isFavori={fp.isFavori?.("inflation")} toggleFavori={fp.toggleFavori}>
        <ResponsiveContainer width="100%" height={220}><BarChart data={d.inflation_detail}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="poste" {...chartProps.xAxis} fontSize={11} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar radius={[6, 6, 0, 0]} dataKey="val2022" name="2022" fill={C.secondary} /><Bar radius={[6, 6, 0, 0]} dataKey="val2023" name="2023" fill={C.quaternary} /><Bar radius={[6, 6, 0, 0]} dataKey="val2024" name="2024" fill={C.tertiary} /></BarChart></ResponsiveContainer>
      </Card>
      <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} border-l-4 border-yellow-400 p-4 rounded`}><h3 className="font-semibold text-yellow-800">📖 Note de lecture</h3><ul className="mt-2 text-sm text-yellow-700 space-y-1"><li>• Alimentation : pic en 2023 (+11.8%), retour à la normale en 2024</li><li>• Services : hausse régulière (~2.7% par an)</li><li>• Loyers : progression continue (+2.8%)</li></ul></div>
      
      {d.sources_par_onglet?.inflation && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.inflation}</p>
      )}
    </div>
  );
}

// ONGLET CONVENTIONS COLLECTIVES
// ==================== ONGLET CONVENTIONS COLLECTIVES - VERSION ENRICHIE ====================
// Remplacer la fonction ConventionsTab dans App.jsx par celle-ci

function ConventionsTab({d, darkMode}) {
  const [selectedBranche, setSelectedBranche] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('effectif'); // 'effectif' | 'idcc' | 'nom' | 'statut'
  const [sortDir, setSortDir] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTop, setShowTop] = useState(50); // 30 | 50 | 'all'
  
  const cc = d.conventions_collectives;
  
  if (!cc || !cc.branches || !cc.smic_reference) {
    return (
      <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} border border-yellow-200 rounded-xl p-6 text-center`}>
        <p className="text-yellow-800 text-lg">⚠️ Données des conventions collectives non disponibles</p>
        <p className="text-sm text-yellow-600 mt-2">Vérifiez que data.json contient la section "conventions_collectives"</p>
      </div>
    );
  }
  
  const SMIC = cc.smic_reference.mensuel;
  
  // ── Tri ──────────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir(col === 'idcc' || col === 'nom' ? 'asc' : 'desc');
    }
    setSelectedBranche(null);
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // ── Filtrage + tri ────────────────────────────────────────────────────────
  const branchesFiltrees = cc.branches
    .filter(b => {
      if (filter === 'conforme') return b.statut === 'conforme';
      if (filter === 'non_conforme') return b.statut !== 'conforme';
      return true;
    })
    .filter(b => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.nom.toLowerCase().includes(q) ||
        b.idcc.includes(q) ||
        String(b.effectif || '').includes(q)
      );
    })
    .sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case 'idcc':
          va = parseInt(a.idcc || '0');
          vb = parseInt(b.idcc || '0');
          break;
        case 'nom':
          va = a.nom.toLowerCase();
          vb = b.nom.toLowerCase();
          return sortDir === 'asc'
            ? va.localeCompare(vb, 'fr')
            : vb.localeCompare(va, 'fr');
        case 'effectif':
          va = a.effectif || 0;
          vb = b.effectif || 0;
          break;
        case 'statut':
          va = a.statut === 'conforme' ? 1 : 0;
          vb = b.statut === 'conforme' ? 1 : 0;
          break;
        default:
          va = a.effectif || 0;
          vb = b.effectif || 0;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

  const branchesAffichees = showTop === 'all'
    ? branchesFiltrees
    : branchesFiltrees.slice(0, showTop);

  const countNonConformes = cc.branches.filter(b => b.statut !== 'conforme').length;
  
  const getNiveauxSousSmic = (branche) =>
    (branche.grille || []).filter(n => n.minimum_mensuel < SMIC).length;
  
  const getEcartSmic = (minimum) =>
    ((minimum - SMIC) / SMIC * 100).toFixed(1);

  const formatEffectif = (n) => {
    if (!n) return '—';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return n.toLocaleString('fr-FR');
  };

  const totalEffectifFiltre = branchesFiltrees
    .reduce((s, b) => s + (b.effectif || 0), 0);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4 rounded-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">📋 Conventions Collectives</h2>
            <p className="text-sm opacity-80 mt-0.5">
              Top {cc.statistiques_branches?.branches_affichees || cc.branches.length} branches classées par effectif
              {cc.meta?.source_effectifs && (
                <span className="opacity-70"> · {cc.meta.source_effectifs}</span>
              )}
            </p>
          </div>
          <div className={`text-right text-sm ${darkMode ? 'opacity-90' : 'opacity-90'}`}>
            <div className="font-semibold">SMIC référence : {SMIC.toLocaleString('fr-FR')}€ net</div>
            <div className="opacity-75 text-xs">Brut : {cc.smic_reference.mensuel_brut?.toLocaleString('fr-FR') || '1 823'}€ · {cc.smic_reference.date}</div>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Branches suivies', val: cc.statistiques_branches?.total_branches || cc.branches.length, color: 'blue' },
          { label: 'Affichées ici', val: cc.statistiques_branches?.branches_affichees || cc.branches.length, color: 'indigo' },
          { label: '✅ Conformes SMIC', val: cc.statistiques_branches?.branches_conformes, color: 'green' },
          { label: '❌ Non conformes', val: countNonConformes, color: 'red' },
        ].map((kpi, i) => (
          <div key={i} className={`p-4 rounded-xl text-center ${darkMode ? `bg-${kpi.color}-900/30` : `bg-${kpi.color}-50`}`}>
            <p className={`text-3xl font-bold text-${kpi.color}-${darkMode ? '300' : '600'}`}>{kpi.val ?? '—'}</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── Alerte non conformes ── */}
      {countNonConformes > 0 && (
        <div className={`${darkMode ? 'bg-red-900/30' : 'bg-red-50'} border-l-4 border-red-500 p-4 rounded`}>
          <h3 className="font-semibold text-red-800">
            ⚠️ {countNonConformes} branche(s) avec minima &lt; SMIC ({SMIC.toLocaleString('fr-FR')}€)
          </h3>
          <p className="text-sm text-red-700 mt-1">
            Loi du 16 août 2022 : les branches ont <b>45 jours</b> après une revalorisation du SMIC pour ouvrir des négociations.
            Risque de <b>fusion administrative</b> en cas de carence persistante.
          </p>
        </div>
      )}

      {/* ── Barre de recherche + filtres + tri ── */}
      <div className={`p-3 rounded-2xl space-y-3 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
        {/* Recherche */}
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="🔍 Rechercher par nom, IDCC ou effectif..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSelectedBranche(null); }}
            className={`flex-1 min-w-[220px] px-3 py-2 rounded-xl border text-sm ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-200'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`px-3 py-2 rounded-xl text-sm ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              ✕ Effacer
            </button>
          )}
        </div>

        {/* Filtres statut + nombre affiché */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs font-medium self-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Statut :</span>
            {[
              ['all', `Toutes (${cc.branches.length})`],
              ['conforme', `✅ Conformes (${cc.branches.length - countNonConformes})`],
              ['non_conforme', `❌ Non conformes (${countNonConformes})`],
            ].map(([id, label]) => (
              <button key={id} onClick={() => { setFilter(id); setSelectedBranche(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  filter === id
                    ? id === 'non_conforme' ? 'bg-red-600 text-white' : id === 'conforme' ? 'bg-green-600 text-white' : 'bg-amber-600 text-white shadow'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Afficher :</span>
            {[30, 50, 'all'].map(n => (
              <button key={n} onClick={() => setShowTop(n)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  showTop === n
                    ? 'bg-indigo-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {n === 'all' ? 'Tout' : `Top ${n}`}
              </button>
            ))}
          </div>
        </div>

        {/* Info résultats */}
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {branchesAffichees.length} branche{branchesAffichees.length > 1 ? 's' : ''} affichée{branchesAffichees.length > 1 ? 's' : ''}
          {branchesFiltrees.length !== branchesAffichees.length && ` (sur ${branchesFiltrees.length} filtrées)`}
          {totalEffectifFiltre > 0 && ` · ~${formatEffectif(totalEffectifFiltre)} salariés couverts`}
        </div>
      </div>

      {/* ── En-têtes de colonnes cliquables pour le tri ── */}
      <div className={`rounded-2xl overflow-hidden shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header du tableau */}
        <div className={`grid grid-cols-12 gap-0 text-xs font-bold uppercase tracking-wide px-3 py-2 border-b ${
          darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
        }`}>
          {[
            { col: 'idcc', label: 'IDCC', span: 1 },
            { col: 'nom', label: 'Branche', span: 5 },
            { col: 'effectif', label: 'Salariés', span: 2 },
            { col: 'statut', label: 'Conformité', span: 2 },
            { col: null, label: 'Minima', span: 2 },
          ].map(({ col, label, span }) => (
            <div
              key={label}
              className={`col-span-${span} flex items-center gap-1 ${col ? 'cursor-pointer hover:text-current select-none' : ''} ${
                sortBy === col ? (darkMode ? 'text-amber-400' : 'text-amber-600') : ''
              }`}
              onClick={() => col && handleSort(col)}
            >
              {label}
              {col && <SortIcon col={col} />}
            </div>
          ))}
        </div>

        {/* Lignes */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
          {branchesAffichees.length === 0 && (
            <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Aucune branche trouvée
            </div>
          )}
          {branchesAffichees.map((branche, idx) => {
            const niveauxSousSmic = getNiveauxSousSmic(branche);
            const isSelected = selectedBranche === idx;
            const isConforme = branche.statut === 'conforme';
            
            // Rang par effectif dans la liste non filtrée
            const rang = cc.branches
              .sort((a, b) => (b.effectif || 0) - (a.effectif || 0))
              .findIndex(b => b.idcc === branche.idcc) + 1;

            return (
              <div key={branche.idcc || idx}>
                {/* Ligne principale */}
                <div
                  className={`grid grid-cols-12 gap-0 px-3 py-2.5 cursor-pointer transition-colors text-sm ${
                    isSelected
                      ? darkMode ? 'bg-amber-900/30' : 'bg-amber-50'
                      : darkMode
                        ? idx % 2 === 0 ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800/60 hover:bg-gray-700'
                        : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedBranche(isSelected ? null : idx)}
                >
                  {/* IDCC */}
                  <div className="col-span-1 flex items-center">
                    <span className={`font-mono text-xs font-bold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                      {branche.idcc}
                    </span>
                  </div>

                  {/* Nom */}
                  <div className="col-span-5 flex items-center gap-2 min-w-0 pr-2">
                    {rang <= 10 && (
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        darkMode ? 'bg-amber-800/60 text-amber-300' : 'bg-amber-100 text-amber-700'
                      }`}>
                        #{rang}
                      </span>
                    )}
                    <span className={`truncate font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {branche.nom}
                    </span>
                  </div>

                  {/* Effectif */}
                  <div className="col-span-2 flex items-center">
                    <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {formatEffectif(branche.effectif)}
                    </span>
                  </div>

                  {/* Statut */}
                  <div className="col-span-2 flex items-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isConforme
                        ? darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                        : darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {isConforme ? '✅ OK' : `❌ ${niveauxSousSmic}niv.`}
                    </span>
                  </div>

                  {/* Minima (premier niveau de grille) */}
                  <div className="col-span-2 flex items-center">
                    {branche.grille && branche.grille.length > 0 ? (
                      <span className={`text-xs ${
                        branche.grille[0].minimum_mensuel < SMIC
                          ? 'text-red-500 font-bold'
                          : darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {branche.grille[0].minimum_mensuel.toLocaleString('fr-FR')}€
                        {branche.grille.length > 1 && (
                          <span className="opacity-60"> → {branche.grille[branche.grille.length-1].minimum_mensuel.toLocaleString('fr-FR')}€</span>
                        )}
                      </span>
                    ) : (
                      <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>—</span>
                    )}
                  </div>
                </div>

                {/* Détail déplié */}
                {isSelected && (
                  <div className={`px-4 py-4 border-t ${
                    darkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-amber-50/50 border-amber-100'
                  }`}>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {/* Info branche */}
                      <div className="flex gap-4 text-sm flex-wrap">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                          <b>IDCC :</b> <span className="font-mono">{branche.idcc}</span>
                        </span>
                        {branche.effectif && (
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                            <b>Effectif :</b> {branche.effectif.toLocaleString('fr-FR')} salariés
                          </span>
                        )}
                        {branche.derniere_revalorisation && (
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                            <b>Dernière reva :</b> {branche.derniere_revalorisation}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Grille de salaires */}
                    {branche.grille && branche.grille.length > 1 ? (
                      <div className="overflow-x-auto">
                        <table className={`w-full text-xs rounded-xl overflow-hidden`}>
                          <thead>
                            <tr className={darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}>
                              <th className="text-left py-2 px-3">Niveau</th>
                              <th className="text-right py-2 px-3">Coef.</th>
                              <th className="text-right py-2 px-3">Mensuel net</th>
                              <th className="text-right py-2 px-3">vs SMIC</th>
                              <th className="text-right py-2 px-3">Annuel</th>
                            </tr>
                          </thead>
                          <tbody>
                            {branche.grille.map((niveau, i) => {
                              const sousSmic = niveau.minimum_mensuel < SMIC;
                              const ecart = getEcartSmic(niveau.minimum_mensuel);
                              return (
                                <tr key={i} className={`border-t ${
                                  sousSmic
                                    ? darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-100'
                                    : darkMode ? 'border-gray-700' : 'border-gray-100'
                                }`}>
                                  <td className={`py-1.5 px-3 font-mono font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {niveau.niveau}
                                    {sousSmic && <span className="ml-1 text-red-500">⚠</span>}
                                  </td>
                                  <td className={`py-1.5 px-3 text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {niveau.coefficient || '—'}
                                  </td>
                                  <td className={`py-1.5 px-3 text-right font-semibold ${
                                    sousSmic ? 'text-red-500' : darkMode ? 'text-gray-200' : 'text-gray-800'
                                  }`}>
                                    {niveau.minimum_mensuel.toLocaleString('fr-FR')}€
                                  </td>
                                  <td className={`py-1.5 px-3 text-right font-medium ${
                                    parseFloat(ecart) >= 0 ? 'text-green-500' : 'text-red-500'
                                  }`}>
                                    {parseFloat(ecart) >= 0 ? '+' : ''}{ecart}%
                                  </td>
                                  <td className={`py-1.5 px-3 text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {(niveau.minimum_annuel || niveau.minimum_mensuel * 12).toLocaleString('fr-FR')}€
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className={`text-xs italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Grille détaillée non disponible pour cette convention.
                        {branche.source && (
                          <> <a href={branche.source} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline ml-1">
                            Consulter sur Légifrance ↗
                          </a></>
                        )}
                      </p>
                    )}

                    {branche.source && branche.grille && branche.grille.length > 1 && (
                      <div className="mt-2 text-right">
                        <a href={branche.source} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline">
                          🔗 Voir sur Légifrance
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Note pédagogique ── */}
      <div className={`${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} border border-blue-200 rounded-xl p-4`}>
        <h3 className="font-semibold text-blue-800 mb-2">📚 Comment utiliser ce comparateur ?</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <b>Cliquez sur l'en-tête IDCC</b> pour trier par numéro de convention (ordre croissant ou décroissant)</p>
          <p>• <b>Cliquez sur Salariés</b> pour voir les branches les plus importantes en premier</p>
          <p>• <b>Cherchez votre branche</b> par nom ou numéro IDCC dans la barre de recherche</p>
          <p>• <b>Dépliez une branche</b> pour comparer sa grille de salaires avec le SMIC</p>
        </div>
      </div>

      {/* ── Métadonnées ── */}
      {cc.meta && (
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mise à jour :</span>
              <span className={`ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{cc.meta.derniere_mise_a_jour}</span>
            </div>
            <div>
              <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Source effectifs :</span>
              <span className={`ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{cc.meta.source_effectifs}</span>
            </div>
            <div className="flex gap-2">
              <a href="https://www.legifrance.gouv.fr/liste/idcc" target="_blank" rel="noopener noreferrer"
                className="text-blue-500 hover:underline">Légifrance</a>
              <span className={darkMode ? 'text-gray-600' : 'text-gray-300'}>·</span>
              <a href="https://code.travail.gouv.fr/outils/convention-collective" target="_blank" rel="noopener noreferrer"
                className="text-blue-500 hover:underline">Code du Travail Numérique</a>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        SMIC référence : {SMIC.toLocaleString('fr-FR')}€ net mensuel · {cc.smic_reference.date}
        {cc.statistiques_branches?.source_statistiques && ` · ${cc.statistiques_branches.source_statistiques}`}
      </p>
    </div>
  );
}


function TimelineEvolutions({ d, darkMode }) {
  const ANNEES = [2020, 2021, 2022, 2023, 2024, 2025];

  // Données historiques
  const hist = {
    inflation:   [0.5,  1.6,  5.2,  4.9,  2.0,  0.9],
    smic_net:    [1219, 1231, 1329, 1383, 1399, 1426],
    smic_evol:   [0,    1.0,  9.1,  13.5, 14.8, 17.1],
    infcum:      [0.5,  2.1,  7.4,  12.7, 14.9, 15.9],
    chomage:     [8.0,  7.9,  7.3,  7.3,  7.4,  7.7],
    defaillances:[32,   28,   42,   57,   66,   68  ],
    taux_marge:  [29.5, 33.8, 32.8, 32.2, 32.5, 32.0],
    salaires_base:[0,   1.4,  3.5,  4.2,  2.8,  2.0],
  };

  // Surcharge avec les vraies données si disponibles
  const infSal = d.inflation_salaires || [];
  infSal.forEach((pt, i) => {
    const idx = ANNEES.indexOf(Number(pt.annee));
    if (idx >= 0) {
      hist.inflation[idx]    = pt.inflation;
      hist.smic_evol[idx]    = pt.smic     ?? hist.smic_evol[idx];
      hist.salaires_base[idx]= pt.salaires_base ?? hist.salaires_base[idx];
    }
  });
  (d.partage_va?.taux_marge_snf || []).forEach(pt => {
    const idx = ANNEES.indexOf(Number(pt.annee));
    if (idx >= 0) hist.taux_marge[idx] = pt.taux;
  });

  // Annotations contextuelles par année
  const EVENTS = {
    2020: { label: 'Covid-19',          couleur: '#ef4444', emoji: '🦠', desc: 'Récession historique -7.5% du PIB. Chômage partiel massif. SMIC quasi-stable.' },
    2021: { label: 'Rebond post-Covid', couleur: '#22c55e', emoji: '🚀', desc: 'PIB +6.4%, reprise forte. Inflation encore faible (+1.6%). Taux de marge au plus haut : 33.8%.' },
    2022: { label: 'Choc inflationniste',couleur: '#f97316', emoji: '🔥', desc: 'Inflation +5.2% (énergie +23%). SMIC revalorisé 3× dans l\'année (+5.6%). Début de la crise.' },
    2023: { label: 'Pic inflation',      couleur: '#ef4444', emoji: '📈', desc: 'Alimentation +11.8%. Inflation cumulée dépasse 12%. SMIC +6.6% mais pouvoir d\'achat érodé.' },
    2024: { label: 'Désinflation',       couleur: '#3b82f6', emoji: '📉', desc: 'Retour à 2% d\'inflation. Défaillances au plus haut depuis 2015. Marché du travail sous pression.' },
    2025: { label: 'Stabilisation',      couleur: '#8b5cf6', emoji: '⚖️', desc: 'Inflation < 1%. SMIC +17% depuis 2020. Mais inflation cumulée = +15.9% : pouvoir d\'achat fragilisé.' },
  };

  // Indicateurs à afficher
  const INDICATEURS = [
    { id: 'inflation_smic', label: '🔥 Inflation vs Salaires', actif: true  },
    { id: 'chomage',        label: '👥 Chômage',               actif: true  },
    { id: 'smic_net',       label: '💰 SMIC net',              actif: true  },
    { id: 'defaillances',   label: '🏭 Défaillances',          actif: true  },
    { id: 'taux_marge',     label: '📊 Taux de marge EBE',     actif: true  },
  ];

  const [anneeIdx, setAnneeIdx]           = React.useState(0);
  const [playing, setPlaying]             = React.useState(false);
  const [indicateursActifs, setIndicateursActifs] = React.useState(
    INDICATEURS.reduce((acc, i) => ({ ...acc, [i.id]: true }), {})
  );
  const intervalRef = React.useRef(null);

  // Lecture automatique
  React.useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setAnneeIdx(prev => {
          if (prev >= ANNEES.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1400);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing]);

  const annee    = ANNEES[anneeIdx];
  const event    = EVENTS[annee];
  const prevIdx  = Math.max(0, anneeIdx - 1);

  // Calcul des deltas vs année précédente
  const delta = (arr) => anneeIdx === 0 ? null : (arr[anneeIdx] - arr[prevIdx]);
  const pct   = (arr) => anneeIdx === 0 ? null : ((arr[anneeIdx] - arr[prevIdx]) / Math.abs(arr[prevIdx]) * 100);

  // KPIs de l'année sélectionnée
  const kpis = [
    {
      id:    'inflation_smic',
      label: 'Inflation annuelle',
      val:   `${hist.inflation[anneeIdx]}%`,
      sous:  `SMIC +${hist.smic_evol[anneeIdx].toFixed(1)}% depuis 2020`,
      delta: delta(hist.inflation),
      unite: 'pt',
      bad_if_high: true,
      color: '#f97316',
    },
    {
      id:    'chomage',
      label: 'Taux de chômage',
      val:   `${hist.chomage[anneeIdx]}%`,
      sous:  anneeIdx > 0 ? `${delta(hist.chomage) >= 0 ? '+' : ''}${delta(hist.chomage)?.toFixed(1)} pt vs ${ANNEES[prevIdx]}` : 'Base 2020',
      delta: delta(hist.chomage),
      unite: 'pt',
      bad_if_high: true,
      color: '#3b82f6',
    },
    {
      id:    'smic_net',
      label: 'SMIC net mensuel',
      val:   `${hist.smic_net[anneeIdx].toLocaleString('fr-FR')}€`,
      sous:  `+${hist.smic_evol[anneeIdx].toFixed(1)}% depuis 2020 · Inflation cum. +${hist.infcum[anneeIdx]}%`,
      delta: delta(hist.smic_net),
      unite: '€',
      bad_if_high: false,
      color: '#22c55e',
    },
    {
      id:    'defaillances',
      label: 'Défaillances (k)',
      val:   `${hist.defaillances[anneeIdx]}k`,
      sous:  anneeIdx > 0 ? `${delta(hist.defaillances) >= 0 ? '+' : ''}${delta(hist.defaillances)?.toFixed(0)}k vs ${ANNEES[prevIdx]}` : 'Base 2020',
      delta: delta(hist.defaillances),
      unite: 'k',
      bad_if_high: true,
      color: '#ef4444',
    },
    {
      id:    'taux_marge',
      label: 'Taux de marge EBE',
      val:   `${hist.taux_marge[anneeIdx]}%`,
      sous:  `Part salaires : ~${(100 - hist.taux_marge[anneeIdx] - 9.7).toFixed(1)}% de la VA`,
      delta: delta(hist.taux_marge),
      unite: 'pt',
      bad_if_high: false,
      color: '#8b5cf6',
    },
  ].filter(k => indicateursActifs[k.id]);

  // Barre de progression mini-graphique par indicateur
  const MiniBar = ({ values, idx, color, invert = false }) => {
    const max = Math.max(...values), min = Math.min(...values);
    return (
      <div className="flex items-end gap-0.5 h-8">
        {values.map((v, i) => {
          const pct = ((v - min) / (max - min || 1)) * 100;
          const isActive = i === idx;
          return (
            <div key={i} className="flex-1 rounded-sm transition-all duration-300"
              style={{
                height: `${Math.max(10, invert ? 100 - pct : pct)}%`,
                backgroundColor: isActive ? color : darkMode ? '#374151' : '#e5e7eb',
                opacity: isActive ? 1 : 0.5,
              }} />
          );
        })}
      </div>
    );
  };

  // Calcul du "bilan pouvoir d'achat" cumulé
  const bilanPA = hist.smic_evol[anneeIdx] - hist.infcum[anneeIdx];

  return (
    <div className="space-y-4">

      {/* ── Curseur temporel ── */}
      <div className={`rounded-2xl p-5 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>

        {/* Contrôles */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setPlaying(false); setAnneeIdx(0); }}
            className={`p-2 rounded-xl transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
            title="Revenir au début">⏮</button>
          <button
            onClick={() => setAnneeIdx(i => Math.max(0, i - 1))}
            className={`p-2 rounded-xl transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>◀</button>
          <button
            onClick={() => { if (anneeIdx >= ANNEES.length - 1) setAnneeIdx(0); setPlaying(p => !p); }}
            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${playing ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
            {playing ? '⏸ Pause' : anneeIdx >= ANNEES.length - 1 ? '↺ Rejouer' : '▶ Play'}
          </button>
          <button
            onClick={() => setAnneeIdx(i => Math.min(ANNEES.length - 1, i + 1))}
            className={`p-2 rounded-xl transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>▶</button>
          <div className="flex-1" />
          <span className={`text-3xl font-black tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>{annee}</span>
        </div>

        {/* Slider années */}
        <div className="relative mb-2">
          <input type="range" min={0} max={ANNEES.length - 1} value={anneeIdx}
            onChange={e => { setPlaying(false); setAnneeIdx(Number(e.target.value)); }}
            className="w-full accent-indigo-600 cursor-pointer" />
          <div className="flex justify-between mt-1">
            {ANNEES.map((a, i) => (
              <button key={a} onClick={() => { setPlaying(false); setAnneeIdx(i); }}
                className={`text-xs font-medium transition-all px-1 rounded ${i === anneeIdx ? 'text-indigo-600 font-bold' : darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Annotation événement */}
        <div
          className="rounded-xl p-3 flex items-start gap-3 transition-all duration-500"
          style={{ backgroundColor: event.couleur + (darkMode ? '25' : '15'), borderLeft: `4px solid ${event.couleur}` }}>
          <span className="text-2xl shrink-0">{event.emoji}</span>
          <div>
            <p className="font-bold text-sm" style={{ color: event.couleur }}>{event.label}</p>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{event.desc}</p>
          </div>
        </div>
      </div>

      {/* ── Filtre indicateurs ── */}
      <div className="flex flex-wrap gap-2">
        {INDICATEURS.map(ind => (
          <button key={ind.id}
            onClick={() => setIndicateursActifs(prev => ({ ...prev, [ind.id]: !prev[ind.id] }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              indicateursActifs[ind.id]
                ? 'bg-indigo-600 text-white border-indigo-600'
                : darkMode ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-white text-gray-400 border-gray-200'
            }`}>
            {ind.label}
          </button>
        ))}
      </div>

      {/* ── KPI Cards animées ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map(kpi => {
          const dVal     = kpi.delta;
          const isBetter = dVal == null ? null : kpi.bad_if_high ? dVal < 0 : dVal > 0;
          const arrowColor = dVal == null ? '' : isBetter ? 'text-green-500' : 'text-red-500';
          const arrowIcon  = dVal == null ? '' : dVal > 0 ? '↑' : dVal < 0 ? '↓' : '→';
          const miniVals = hist[kpi.id === 'inflation_smic' ? 'inflation' : kpi.id === 'smic_net' ? 'smic_net' : kpi.id];

          return (
            <div key={kpi.id}
              className={`rounded-2xl p-4 transition-all duration-500 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}
              style={{ borderTop: `3px solid ${kpi.color}` }}>
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{kpi.label}</span>
                {dVal != null && (
                  <span className={`text-xs font-bold ${arrowColor}`}>
                    {arrowIcon} {Math.abs(dVal).toFixed(dVal < 10 ? 1 : 0)}{kpi.unite}
                  </span>
                )}
              </div>
              <div className="text-2xl font-black mb-1" style={{ color: kpi.color }}>
                {kpi.val}
              </div>
              <div className={`text-[10px] mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{kpi.sous}</div>
              {miniVals && (
                <MiniBar values={miniVals} idx={anneeIdx} color={kpi.color} invert={kpi.bad_if_high} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bilan pouvoir d'achat cumulé ── */}
      <div className={`rounded-2xl p-5 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h4 className={`font-bold text-sm mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          ⚖️ Bilan pouvoir d'achat SMIC — depuis 2020
        </h4>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
            <div className="text-xl font-black text-green-500">+{hist.smic_evol[anneeIdx].toFixed(1)}%</div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SMIC +</div>
          </div>
          <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
            <div className="text-xl font-black text-red-500">+{hist.infcum[anneeIdx]}%</div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inflation +</div>
          </div>
          <div className={`text-center p-3 rounded-xl ${bilanPA >= 0 ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50') : (darkMode ? 'bg-orange-900/30' : 'bg-orange-50')}`}>
            <div className={`text-xl font-black ${bilanPA >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>
              {bilanPA >= 0 ? '+' : ''}{bilanPA.toFixed(1)} pt
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Écart net</div>
          </div>
        </div>

        {/* Barre comparative animée */}
        <div className="space-y-2">
          {[
            { label: 'SMIC',      val: hist.smic_evol[anneeIdx], color: '#22c55e', max: 20 },
            { label: 'Inflation', val: hist.infcum[anneeIdx],    color: '#ef4444', max: 20 },
            { label: 'Salaires base', val: hist.salaires_base.slice(1, anneeIdx+1).reduce((a,b) => a+b, 0), color: '#3b82f6', max: 20 },
          ].map(bar => (
            <div key={bar.label} className="flex items-center gap-3">
              <span className={`text-xs w-24 shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{bar.label}</span>
              <div className={`flex-1 h-5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                  style={{ width: `${Math.min(100, (bar.val / bar.max) * 100)}%`, backgroundColor: bar.color }}>
                  <span className="text-white text-[9px] font-bold">+{bar.val.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className={`text-xs mt-3 ${bilanPA >= 0 ? 'text-blue-500' : 'text-orange-500'} font-medium`}>
          {annee === 2020 ? '📌 Point de départ — base 100' :
           bilanPA >= 0
            ? `✅ En ${annee}, le SMIC a progressé de ${bilanPA.toFixed(1)} point de plus que l'inflation depuis 2020.`
            : `⚠️ En ${annee}, l'inflation a effacé ${Math.abs(bilanPA).toFixed(1)} point de la revalorisation du SMIC depuis 2020.`}
        </p>
      </div>

      {/* ── Conseil de lecture contextuel ── */}
      <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
        <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          📖 Conseil de lecture — {annee}
        </p>
        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {annee === 2020 && `Le choc Covid provoque une récession historique (-7.5% de PIB) mais le taux de marge ne s'effondre qu'à ${hist.taux_marge[0]}% grâce aux aides publiques massives. Le chômage monte peu (8%) grâce au chômage partiel. Le SMIC progresse à peine.`}
          {annee === 2021 && `Le rebond est fort (+6.4% de PIB) et le taux de marge bondit à ${hist.taux_marge[1]}%, son plus haut niveau sur la période. L'inflation reste contenue à ${hist.inflation[1]}%. Les défaillances sont artificiellement basses : les PGE et moratoires maintiennent les entreprises fragiles en vie.`}
          {annee === 2022 && `Le choc inflationniste s'installe : ${hist.inflation[2]}% sur l'année, dont +23% pour l'énergie. Le SMIC est revalorisé trois fois. Les défaillances repartent à ${hist.defaillances[2]}k, le rattrapage post-Covid commence. L'inflation cumulée atteint déjà +${hist.infcum[2]}% depuis 2020.`}
          {annee === 2023 && `L'alimentation flambe à +11.8%. L'inflation cumulée dépasse ${hist.infcum[3]}% depuis 2020. Les défaillances accélèrent fortement (${hist.defaillances[3]}k). Le taux de marge résiste à ${hist.taux_marge[3]}% malgré le contexte difficile.`}
          {annee === 2024 && `La désinflation s'engage (${hist.inflation[4]}%), mais les prix restent ${hist.infcum[4]}% au-dessus de leur niveau de 2020. Les défaillances atteignent ${hist.defaillances[4]}k, au plus haut depuis 2015 hors Covid. Le taux de marge se stabilise à ${hist.taux_marge[4]}%.`}
          {annee === 2025 && `L'inflation revient sous 1% (${hist.inflation[5]}%). Depuis 2020, le SMIC a progressé de +${hist.smic_evol[5].toFixed(1)}% face à une inflation cumulée de +${hist.infcum[5]}% — l'écart est de ${bilanPA.toFixed(1)} point. Les défaillances restent élevées à ${hist.defaillances[5]}k.`}
        </p>
      </div>

      <p className={`text-xs text-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        📚 Sources : INSEE (IPC, comptes nationaux) · Ministère du Travail (SMIC) · Banque de France (défaillances)
      </p>
    </div>
  );
}

// ==================== MÉMOIRE DES CRISES ====================
function MemoireCrises({ darkMode }) {

  const CRISES = [
    {
      id: 'c1929', annee: 1929, label: 'Grande Dépression', emoji: '💀',
      couleur: '#7c2d12', couleurLight: '#fed7aa',
      periode: '1929 – 1939',
      accroche: 'Le système bancaire mondial s\'effondre en 3 ans.',
      contexte: 'Le krach boursier d\'octobre 1929 ("Jeudi Noir") déclenche une spirale déflationniste mondiale. Les banques ferment en cascade, la production industrielle chute de 50%, un tiers des Américains se retrouvent sans emploi.',
      vecu: 'Des millions de familles font la queue devant les soupes populaires. Les agriculteurs brûlent leurs récoltes faute d\'acheteurs. Des villes de baraquements ("Hoovervilles") poussent dans les parcs. Le salaire moyen s\'effondre de 40%.',
      tournant: 'Le New Deal de Roosevelt (1933) et la Seconde Guerre mondiale relancent l\'économie.',
      indicateurs: {
        chomage: [3, 8, 15, 23, 25, 22, 17, 14, 19, 17],
        pib:     [0, -8, -6, -13, -1, 11, 9, 5, -3, 8],
        inflation:[-1,-6,-9,-10, 0, 1, 3, 1,-2, 0],
        bourses: [100, 66, 45, 28, 35, 55, 70, 80, 65, 85],
        defaillances:[100,130,180,240,200,160,140,130,150,120],
      },
      annees: ['1929','1930','1931','1932','1933','1934','1935','1936','1937','1938'],
    },
    {
      id: 'c1973', annee: 1973, label: 'Choc pétrolier', emoji: '🛢️',
      couleur: '#713f12', couleurLight: '#fef08a',
      periode: '1973 – 1979',
      accroche: 'Le prix du pétrole quadruple en 3 mois.',
      contexte: 'L\'embargo pétrolier de l\'OPEP (octobre 1973) en représailles à la guerre du Kippour fait passer le baril de 3$ à 12$ en quelques semaines. Les économies occidentales découvrent leur dépendance au pétrole.',
      vecu: 'Dimanches sans voiture imposés en France et en Allemagne. Stations-service à sec. Les factures d\'énergie doublent. Les industries énergivores licencient massivement. La stagflation — inflation + chômage simultanés — brise les certitudes keynésiennes.',
      tournant: 'Le second choc pétrolier de 1979 (révolution iranienne) enfonce les économies. La déréglementation thatcherienne et reaganienne émerge en réponse.',
      indicateurs: {
        chomage: [2.8, 3.1, 2.9, 4.0, 4.5, 4.2, 4.8, 5.1, 5.3, 5.0],
        pib:     [5.4, 5.2, 4.8, -0.5, 2.1, 3.0, 2.8, 4.0, 3.1, 3.8],
        inflation:[5.9, 7.5, 9.1, 13.4, 11.0, 9.1, 7.0, 6.5, 7.6, 9.0],
        bourses: [100, 85, 72, 58, 70, 82, 90, 100, 95, 88],
        defaillances:[100,105,110,135,140,130,125,120,118,115],
      },
      annees: ['1972','1973','1974','1975','1976','1977','1978','1979','1980','1981'],
    },
    {
      id: 'c1987', annee: 1987, label: 'Krach boursier', emoji: '📉',
      couleur: '#1e3a8a', couleurLight: '#bfdbfe',
      periode: 'Octobre 1987',
      accroche: 'En un seul jour, Wall Street perd 22%.',
      contexte: 'Le "Lundi Noir" du 19 octobre 1987 voit le Dow Jones s\'effondrer de 22,6% — la plus forte chute en un jour de l\'histoire. Les marchés mondiaux suivent. La panique se diffuse à la vitesse des ordinateurs de trading.',
      vecu: 'Les traders pleurent sur les parquets boursiers. Des fortunes s\'évaporent en heures. Pourtant, l\'économie réelle résiste mieux qu\'en 1929 : la Fed injecte massivement des liquidités. La récession est évitée. Le "krach éclair" préfigure l\'ère des krachs algorithmiques.',
      tournant: 'La reprise est rapide — dès 1988 les marchés rebondissent. Mais la leçon sur le risque systémique est ignorée.',
      indicateurs: {
        chomage: [7.0, 6.2, 5.5, 5.3, 5.5, 5.6, 5.4, 5.2, 5.0, 4.9],
        pib:     [3.5, 3.5, 4.1, 3.6, 3.5, 2.5, 1.9, 3.7, 4.2, 3.7],
        inflation:[3.2, 3.6, 1.9, 3.6, 4.1, 4.8, 5.4, 4.2, 3.0, 3.0],
        bourses: [100, 120, 145, 115, 120, 135, 155, 165, 180, 200],
        defaillances:[100, 95, 90, 95, 100, 98, 95, 90, 85, 80],
      },
      annees: ['1985','1986','1987','1988','1989','1990','1991','1992','1993','1994'],
    },
    {
      id: 'c2000', annee: 2000, label: 'Bulle internet', emoji: '💻',
      couleur: '#5b21b6', couleurLight: '#ddd6fe',
      periode: '2000 – 2002',
      accroche: 'Des milliards s\'évaporent sur des entreprises sans revenus.',
      contexte: 'Le Nasdaq avait été multiplié par 5 en 5 ans. En mars 2000, la bulle éclate. Des centaines d\'entreprises ".com" valorisées à des milliards font faillite. L\'indice Nasdaq perd 78% de sa valeur en 2 ans.',
      vecu: 'Des ingénieurs en informatique licenciés par dizaines de milliers. Des actionnaires qui avaient misé leurs économies sur Webvan, Pets.com, Boo.com se retrouvent ruinés. Silicon Valley connaît sa première récession sévère. Les plans stock-options ne valent plus rien.',
      tournant: 'Les attentats du 11 septembre 2001 aggravent le choc. La Fed baisse massivement ses taux — semant les graines de la crise de 2008.',
      indicateurs: {
        chomage: [4.0, 3.9, 4.0, 4.5, 5.7, 6.0, 5.8, 5.5, 5.1, 4.6],
        pib:     [4.1, 4.7, 4.1, 1.0, 1.8, 2.8, 3.8, 3.5, 3.1, 2.9],
        inflation:[2.2, 2.0, 3.4, 2.8, 1.6, 2.3, 2.7, 3.4, 3.2, 2.5],
        bourses: [150, 200, 180, 115, 85, 75, 90, 105, 130, 150],
        defaillances:[100, 95, 105, 130, 150, 140, 125, 110, 100, 90],
      },
      annees: ['1998','1999','2000','2001','2002','2003','2004','2005','2006','2007'],
    },
    {
      id: 'c2008', annee: 2008, label: 'Crise financière', emoji: '🏦',
      couleur: '#7f1d1d', couleurLight: '#fecaca',
      periode: '2008 – 2012',
      accroche: 'La faillite de Lehman Brothers paralyse le système financier mondial.',
      contexte: 'La crise des subprimes américains contamine les banques mondiales via des produits financiers toxiques. Le 15 septembre 2008, Lehman Brothers s\'effondre. Le crédit mondial se fige. Les gouvernements injectent des milliers de milliards pour éviter l\'effondrement du système.',
      vecu: 'Des millions de familles américaines perdent leur maison. En Europe, les plans d\'austérité dévastent la Grèce, l\'Espagne, le Portugal. Le chômage des jeunes dépasse 50% en Grèce. En France, les défaillances d\'entreprises explosent. Le mot "bail-out" (sauvetage bancaire) entre dans le vocabulaire commun.',
      tournant: 'La crise de la dette souveraine européenne (2011-2012) prolonge les souffrances. La BCE de Draghi ("whatever it takes", 2012) stoppe la spirale.',
      indicateurs: {
        chomage: [4.6, 4.4, 5.8, 9.3, 9.6, 8.9, 8.1, 7.4, 6.7, 5.3],
        pib:     [2.9, 1.9, -0.1, -2.5, 2.6, 1.6, 2.2, 1.7, 2.5, 2.9],
        inflation:[4.1, 0.1, 2.7, 1.5, 3.0, 2.1, 1.5, 1.6, 0.1, 1.3],
        bourses: [160, 145, 80, 65, 90, 105, 120, 130, 140, 165],
        defaillances:[100, 120, 165, 200, 180, 155, 130, 110, 100, 85],
      },
      annees: ['2006','2007','2008','2009','2010','2011','2012','2013','2014','2015'],
    },
    {
      id: 'c2020', annee: 2020, label: 'Covid-19', emoji: '🦠',
      couleur: '#064e3b', couleurLight: '#a7f3d0',
      periode: '2020 – 2022',
      accroche: 'L\'économie mondiale mise à l\'arrêt en 3 semaines.',
      contexte: 'La pandémie de Covid-19 provoque les confinements simultanés de 4 milliards de personnes. Le PIB mondial chute de 3,1% en 2020 — pire récession depuis 1929. Les gouvernements injectent des sommes inédites : 14 000 milliards de dollars en aides mondiales.',
      vecu: 'Des millions de salariés en chômage partiel. Des secteurs entiers à l\'arrêt : tourisme, restauration, aviation, spectacle. En France, 85% des salariés en télétravail forcé du jour au lendemain. Les soignants en première ligne sans équipements. Puis l\'inflation post-Covid (chaînes d\'approvisionnement brisées, demande refoulée, guerre en Ukraine) dévore le pouvoir d\'achat.',
      tournant: 'Le rebond de 2021 (+5.9% mondial) est historique. Mais l\'inflation déclenche la plus forte hausse des taux depuis 40 ans (BCE : de 0% à 4.5% en 18 mois).',
      indicateurs: {
        chomage: [3.5, 3.5, 8.1, 5.4, 3.9, 3.7, 3.6, 3.7, 4.0, 4.2],
        pib:     [2.3, 2.5, -3.1, 5.9, 3.5, 3.1, 2.4, 1.5, 0.9, 1.1],
        inflation:[2.3, 2.5, 0.8, 4.7, 8.8, 6.8, 4.2, 2.8, 2.0, 1.5],
        bourses: [120, 135, 115, 155, 175, 160, 150, 145, 155, 165],
        defaillances:[90, 85, 65, 90, 110, 130, 150, 160, 155, 140],
      },
      annees: ['2018','2019','2020','2021','2022','2023','2024','2025','2026p','2027p'],
    },
  ];

  const INDICATEURS_DEF = [
    { id: 'chomage',     label: 'Chômage (%)',              color: '#3b82f6', unite: '%'  },
    { id: 'pib',         label: 'Croissance PIB (%)',        color: '#22c55e', unite: '%'  },
    { id: 'inflation',   label: 'Inflation (%)',             color: '#f97316', unite: '%'  },
    { id: 'bourses',     label: 'Marchés (base 100)',        color: '#a855f7', unite: ''   },
    { id: 'defaillances',label: 'Défaillances (base 100)',   color: '#ef4444', unite: ''   },
  ];

  const [criseActive, setCriseActive] = useState(CRISES[4]); // 2008 par défaut
  const [indActifs, setIndActifs] = useState({ chomage:true, pib:true, inflation:false, bourses:false, defaillances:false });
  const [animStep, setAnimStep] = useState(9);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = React.useRef(null);

  // Lancer l'animation quand on change de crise
  useEffect(() => {
    setAnimStep(0);
    setIsPlaying(true);
  }, [criseActive.id]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setAnimStep(s => {
          if (s >= criseActive.annees.length - 1) {
            setIsPlaying(false);
            clearInterval(intervalRef.current);
            return s;
          }
          return s + 1;
        });
      }, 300);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, criseActive]);

  // Calcul du min/max pour l'axe Y par indicateur
  const getRange = (indId) => {
    const vals = criseActive.indicateurs[indId];
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 5;
    return [min - pad, max + pad];
  };

  // Composant mini sparkline animé via SVG inline
  const AnimChart = ({ indId, color, label, unite }) => {
    const vals = criseActive.indicateurs[indId];
    const annees = criseActive.annees;
    const [yMin, yMax] = getRange(indId);
    const W = 280, H = 90, PAD = { t:12, r:8, b:24, l:36 };
    const cW = W - PAD.l - PAD.r;
    const cH = H - PAD.t - PAD.b;

    const xScale = i => PAD.l + (i / (vals.length - 1)) * cW;
    const yScale = v => PAD.t + cH - ((v - yMin) / (yMax - yMin)) * cH;

    const visibleVals = vals.slice(0, animStep + 1);
    const points = visibleVals.map((v, i) => `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');
    const lastX = xScale(animStep);
    const lastY = yScale(vals[animStep]);

    // Zone de remplissage
    const areaPoints = visibleVals.length > 1
      ? `${xScale(0)},${PAD.t + cH} ${points} ${lastX},${PAD.t + cH}`
      : '';

    const crisisX = xScale(2); // 3ème année = sommet/creux de crise

    return (
      <div className={`rounded-xl p-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold" style={{ color }}>{label}</span>
          <span className="text-sm font-black" style={{ color }}>
            {vals[animStep]?.toFixed(1)}{unite}
          </span>
        </div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* Ligne zéro si pertinent */}
          {yMin < 0 && yMax > 0 && (
            <line x1={PAD.l} y1={yScale(0)} x2={PAD.l + cW} y2={yScale(0)}
              stroke={darkMode ? '#374151' : '#e5e7eb'} strokeWidth="1" strokeDasharray="3,3" />
          )}
          {/* Marqueur année de crise */}
          <line x1={crisisX} y1={PAD.t} x2={crisisX} y2={PAD.t + cH}
            stroke={criseActive.couleur} strokeWidth="1.5" strokeDasharray="4,2" opacity="0.6" />

          {/* Aire */}
          {areaPoints && (
            <polygon points={areaPoints} fill={color} opacity="0.08" />
          )}

          {/* Courbe */}
          {visibleVals.length > 1 && (
            <polyline fill="none" stroke={color} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" points={points} />
          )}

          {/* Point actuel */}
          <circle cx={lastX} cy={lastY} r="4" fill={color} stroke={darkMode ? '#111827' : '#fff'} strokeWidth="2" />

          {/* Axe X — années */}
          {annees.filter((_, i) => i % 3 === 0 || i === 0 || i === annees.length - 1).map((a, _, arr) => {
            const origIdx = annees.indexOf(a);
            return (
              <text key={a} x={xScale(origIdx)} y={H - 4}
                textAnchor="middle" fontSize="8"
                fill={darkMode ? '#4b5563' : '#9ca3af'}>
                {a}
              </text>
            );
          })}

          {/* Axe Y — min/max */}
          <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fontSize="8" fill={darkMode ? '#4b5563' : '#9ca3af'}>{yMax.toFixed(0)}</text>
          <text x={PAD.l - 2} y={PAD.t + cH} textAnchor="end" fontSize="8" fill={darkMode ? '#4b5563' : '#9ca3af'}>{yMin.toFixed(0)}</text>
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-4">

      {/* ── Frise chronologique ── */}
      <div className={`rounded-2xl p-5 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h3 className={`text-sm font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          🕯️ Grandes crises économiques — cliquez pour explorer
        </h3>
        <div className="relative">
          {/* Ligne du temps */}
          <div className={`absolute top-5 left-0 right-0 h-0.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          <div className="flex justify-between relative">
            {CRISES.map((c) => (
              <button key={c.id}
                onClick={() => { setCriseActive(c); }}
                className="flex flex-col items-center gap-1 group relative"
                style={{ minWidth: '60px' }}>

                {/* Bulle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 border-2 z-10 ${
                  criseActive.id === c.id
                    ? 'scale-125 shadow-lg border-white'
                    : 'scale-100 border-transparent opacity-70 hover:opacity-100 hover:scale-110'
                }`}
                  style={{ backgroundColor: criseActive.id === c.id ? c.couleur : (darkMode ? '#374151' : '#f3f4f6') }}>
                  {c.emoji}
                </div>

                {/* Année */}
                <span className={`text-xs font-bold transition-colors ${
                  criseActive.id === c.id ? '' : (darkMode ? 'text-gray-400' : 'text-gray-500')
                }`} style={{ color: criseActive.id === c.id ? c.couleur : undefined }}>
                  {c.annee}
                </span>

                {/* Label */}
                <span className={`text-[10px] text-center leading-tight max-w-[60px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panneau principal de la crise ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Contexte narratif */}
        <div className="space-y-3">
          {/* En-tête crise */}
          <div className="rounded-2xl p-5 text-white"
            style={{ background: `linear-gradient(135deg, ${criseActive.couleur}, ${criseActive.couleur}cc)` }}>
            <div className="flex items-start gap-3">
              <span className="text-4xl">{criseActive.emoji}</span>
              <div>
                <div className="text-xs opacity-70 mb-0.5">{criseActive.periode}</div>
                <h3 className="text-xl font-black">{criseActive.label}</h3>
                <p className="text-sm opacity-90 mt-1 font-medium italic">"{criseActive.accroche}"</p>
              </div>
            </div>
          </div>

          {/* Ce qui s'est passé */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              📋 Ce qui s'est passé
            </p>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {criseActive.contexte}
            </p>
          </div>

          {/* Ce que vivaient les gens */}
          <div className="rounded-2xl p-4"
            style={{ backgroundColor: criseActive.couleur + (darkMode ? '30' : '15'), borderLeft: `4px solid ${criseActive.couleur}` }}>
            <p className="text-xs font-bold mb-2" style={{ color: criseActive.couleur }}>
              👥 Ce que vivaient les gens
            </p>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {criseActive.vecu}
            </p>
          </div>

          {/* Tournant */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              🔄 Le tournant
            </p>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {criseActive.tournant}
            </p>
          </div>
        </div>

        {/* Graphiques animés */}
        <div className="space-y-3">

          {/* Contrôles animation */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                📈 Évolution des indicateurs — {criseActive.annees[animStep]}
              </span>
              <div className="flex gap-2">
                <button onClick={() => { setAnimStep(0); setIsPlaying(true); }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isPlaying ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}>
                  {isPlaying ? '⏸ Pause' : animStep === criseActive.annees.length - 1 ? '↺ Rejouer' : '▶ Play'}
                </button>
              </div>
            </div>

            {/* Barre de progression */}
            <div className={`h-1.5 rounded-full mb-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((animStep) / (criseActive.annees.length - 1)) * 100}%`,
                  backgroundColor: criseActive.couleur,
                }} />
            </div>

            {/* Toggle indicateurs */}
            <div className="flex flex-wrap gap-1.5">
              {INDICATEURS_DEF.map(ind => (
                <button key={ind.id}
                  onClick={() => setIndActifs(prev => ({ ...prev, [ind.id]: !prev[ind.id] }))}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                    indActifs[ind.id] ? 'text-white border-transparent' : (darkMode ? 'bg-gray-700 text-gray-500 border-gray-600' : 'bg-white text-gray-400 border-gray-200')
                  }`}
                  style={{ backgroundColor: indActifs[ind.id] ? ind.color : undefined }}>
                  {ind.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 gap-2">
            {INDICATEURS_DEF.filter(ind => indActifs[ind.id]).map(ind => (
              <AnimChart key={`${criseActive.id}-${ind.id}`}
                indId={ind.id} color={ind.color} label={ind.label} unite={ind.unite} />
            ))}
            {Object.values(indActifs).every(v => !v) && (
              <div className={`rounded-xl p-6 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Sélectionnez au moins un indicateur
              </div>
            )}
          </div>
        </div>
      </div>

      <p className={`text-xs text-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        📚 Sources : FMI, Banque mondiale, OCDE, INSEE — Données historiques reconstituées · Certaines séries sont des estimations
      </p>
    </div>
  );
}

// ==================== ONGLET ÉVOLUTIONS 5 ANS ====================
function EvolutionsTab({d, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  const [subView, setSubView] = useState('graphiques');
  const [graphType, setGraphType] = useState('inflation_smic');
  
  // Données historiques (fallback si pas dans data.json)
  const hist = d.historique_5ans || {
    annees: [2020, 2021, 2022, 2023, 2024, 2025],
    inflation: { valeurs: [0.5, 1.6, 5.2, 4.9, 2.0, 0.9] },
    chomage: { valeurs: [8.0, 7.9, 7.3, 7.3, 7.4, 7.7] },
    smic_brut_mensuel: { valeurs: [1539, 1555, 1679, 1747, 1767, 1802] },
    smic_net_mensuel: { valeurs: [1219, 1231, 1329, 1383, 1399, 1426] },
    salaire_median: { valeurs: [1940, 1980, 2012, 2091, 2183, 2250] },
    pib_croissance: { valeurs: [-7.5, 6.4, 2.6, 1.1, 1.1, 0.8] },
    taux_marge: { valeurs: [28.9, 34.2, 32.0, 32.8, 32.5, 32.0] },
    inflation_cumulee: { valeurs: [0.5, 2.1, 7.4, 12.7, 14.9, 15.9] },
    smic_evolution: { valeurs: [0, 1.0, 9.1, 13.5, 14.8, 17.1] },
    pouvoir_achat_smic: { valeurs: [0, -1.1, 1.6, 0.7, -0.1, 1.1] },
    emploi_salarie: { valeurs: [19.8, 20.3, 20.8, 21.0, 21.1, 21.0] },
    defaillances: { valeurs: [32000, 28000, 42000, 57000, 66000, 68000] }
  };

  // Construction des données pour les graphiques
  const dataInflationSmic = hist.annees.map((an, i) => ({
    annee: an,
    inflation: hist.inflation.valeurs[i],
    smic_evol: hist.smic_evolution?.valeurs?.[i] || 0,
    inflation_cum: hist.inflation_cumulee?.valeurs?.[i] || 0
  }));

  const dataChomage = hist.annees.map((an, i) => ({
    annee: an,
    chomage: hist.chomage.valeurs[i]
  }));

  const dataSalaires = hist.annees.map((an, i) => ({
    annee: an,
    smic_net: hist.smic_net_mensuel.valeurs[i],
    median: hist.salaire_median.valeurs[i]
  }));

  const dataPIB = hist.annees.map((an, i) => ({
    annee: an,
    pib: hist.pib_croissance.valeurs[i],
    taux_marge: hist.taux_marge.valeurs[i]
  }));

  const dataPouvoirAchat = hist.annees.map((an, i) => ({
    annee: an,
    pa_smic: hist.pouvoir_achat_smic?.valeurs?.[i] || 0
  }));

  const dataDefaillances = hist.annees.map((an, i) => ({
    annee: an,
    defaillances: hist.defaillances?.valeurs?.[i] / 1000 || 0
  }));

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-indigo-900 to-purple-900' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white`}>
        <h2 className="text-lg font-bold">📉 Évolutions sur 5 ans (2020-2025)</h2>
        <p className="text-sm opacity-80">Visualisez les tendances économiques pour comprendre la conjoncture</p>
      </div>

      {/* Sous-navigation Graphiques / Timeline */}
      <div className="flex gap-2">
        {[['graphiques','📊 Graphiques'],['timeline','⏳ Timeline interactive'],['crises','🕯️ Mémoire des crises']].map(([id,label]) => (
          <button key={id} onClick={() => setSubView(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${subView===id ? 'bg-indigo-600 text-white shadow-lg' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Vue Timeline */}
      {subView === 'timeline' && <TimelineEvolutions d={d} darkMode={darkMode} />}
      {subView === 'crises'   && <MemoireCrises darkMode={darkMode} />}

      {/* Vue Graphiques (existante) */}
      {subView === 'graphiques' && <>

      {/* Sélecteur de graphique */}
      <div className={`flex flex-wrap gap-2`}>
        {[
          ['inflation_smic', '📈 Inflation vs SMIC'],
          ['chomage', '👥 Chômage'],
          ['salaires', '💵 Salaires'],
          ['pib', '📊 PIB & Marge'],
          ['pouvoir_achat', '💰 Pouvoir d\'achat'],
          ['defaillances', '🏭 Défaillances']
        ].map(([id, label]) => (
          <button 
            key={id}
            onClick={() => setGraphType(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${graphType === id ? 'bg-indigo-600 text-white shadow-lg' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Graphiques */}
      <Card title={
        graphType === 'inflation_smic' ? '📈 Inflation annuelle vs Évolution SMIC (%)' :
        graphType === 'chomage' ? '👥 Taux de chômage BIT (%)' :
        graphType === 'salaires' ? '💵 SMIC net et Salaire médian (€)' :
        graphType === 'pib' ? '📊 Croissance PIB (%) et Taux de marge SNF (%)' :
        graphType === 'pouvoir_achat' ? '💰 Évolution pouvoir d\'achat SMIC (% cumulé)' :
        '🏭 Défaillances d\'entreprises (milliers)'
      } darkMode={darkMode}>
        <ResponsiveContainer width="100%" height={220}>
          {graphType === 'inflation_smic' && (
            <ComposedChart data={dataInflationSmic}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" {...chartProps.xAxis} />
              <YAxis {...chartProps.yAxis} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend {...chartProps.legend} />
              <Bar radius={[6, 6, 0, 0]} dataKey="inflation" name="Inflation annuelle" fill="#ef4444" />
              <Line type="monotone" dataKey="inflation_cum" name="Inflation cumulée" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="smic_evol" name="SMIC évolution" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          )}
          {graphType === 'chomage' && (
            <LineChart data={dataChomage}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" {...chartProps.xAxis} />
              <YAxis {...chartProps.yAxis} domain={[6, 9]} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend {...chartProps.legend} />
              <Line type="monotone" dataKey="chomage" name="Taux de chômage (%)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} />
              <ReferenceLine y={7.3} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Plus bas 2022-23', fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
            </LineChart>
          )}
          {graphType === 'salaires' && (
            <LineChart data={dataSalaires}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" {...chartProps.xAxis} />
              <YAxis {...chartProps.yAxis} domain={[1100, 2400]} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} formatter={(v) => `${v}€`} />
              <Legend {...chartProps.legend} />
              <Line type="monotone" dataKey="smic_net" name="SMIC net" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="median" name="Salaire médian" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          )}
          {graphType === 'pib' && (
            <ComposedChart data={dataPIB}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" {...chartProps.xAxis} />
              <YAxis {...chartProps.yAxis} yAxisId="left" domain={[-10, 10]} />
              <YAxis {...chartProps.yAxis} yAxisId="right" orientation="right" domain={[25, 40]} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend {...chartProps.legend} />
              <Bar yAxisId="left" dataKey="pib" name="Croissance PIB (%)" fill="#22c55e" />
              <Line yAxisId="right" type="monotone" dataKey="taux_marge" name="Taux de marge SNF (%)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
              <ReferenceLine yAxisId="left" y={0} stroke="#6b7280" />
            </ComposedChart>
          )}
          {graphType === 'pouvoir_achat' && (
            <BarChart data={dataPouvoirAchat}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" {...chartProps.xAxis} />
              <YAxis {...chartProps.yAxis} domain={[-3, 3]} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} formatter={(v) => `${v > 0 ? '+' : ''}${v}%`} />
              <Legend {...chartProps.legend} />
              <Bar radius={[6, 6, 0, 0]} dataKey="pa_smic" name="Pouvoir d'achat SMIC">
                {dataPouvoirAchat.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pa_smic >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
              <ReferenceLine y={0} stroke="#6b7280" />
            </BarChart>
          )}
          {graphType === 'defaillances' && (
            <BarChart data={dataDefaillances}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" {...chartProps.xAxis} />
              <YAxis {...chartProps.yAxis} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} formatter={(v) => `${v.toFixed(0)}k`} />
              <Legend {...chartProps.legend} />
              <Bar radius={[6, 6, 0, 0]} dataKey="defaillances" name="Défaillances (milliers)" fill="#ef4444" />
              <ReferenceLine y={42} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Niveau 2022', fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Card>

      {/* Encadré d'analyse */}
      <div className={`p-4 rounded-xl border ${darkMode ? 'bg-indigo-900/30 border-indigo-700' : 'bg-indigo-50 border-indigo-200'}`}>
        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>💡 Points clés</h3>
        <div className={`text-sm space-y-2 ${darkMode ? 'text-indigo-200' : 'text-indigo-700'}`}>
          {graphType === 'inflation_smic' && (
            <>
              <p>• <b>Inflation cumulée 2020-2025 : +15.9%</b> - Les prix ont fortement augmenté</p>
              <p>• <b>SMIC +17.1%</b> sur la même période - Le SMIC a compensé l'inflation</p>
              <p>• <b>Constat</b> : "Les salaires hors SMIC n'ont pas suivi la même dynamique"</p>
            </>
          )}
          {graphType === 'chomage' && (
            <>
              <p>• <b>Chômage stable autour de 7.3-7.7%</b> depuis 2022</p>
              <p>• <b>Plus bas historique depuis 1982</b> atteint fin 2022 (7.1%)</p>
              <p>• <b>Constat</b> : "Le marché du travail reste tendu, les entreprises doivent fidéliser"</p>
            </>
          )}
          {graphType === 'salaires' && (
            <>
              <p>• <b>SMIC net : +17%</b> en 5 ans (1219€ → 1426€)</p>
              <p>• <b>Salaire médian : +16%</b> en 5 ans (1940€ → 2250€)</p>
              <p>• <b>Constat</b> : "L'écart SMIC-médian s'est réduit, les salariés qualifiés rattrapent leur retard"</p>
            </>
          )}
          {graphType === 'pib' && (
            <>
              <p>• <b>Rebond 2021 (+6.4%)</b> après la chute COVID de 2020 (-7.5%)</p>
              <p>• <b>Taux de marge SNF ~32%</b> - reste élevé historiquement</p>
              <p>• <b>Constat</b> : "Les marges des entreprises permettent des hausses de salaires"</p>
            </>
          )}
          {graphType === 'pouvoir_achat' && (
            <>
              <p>• <b>Pouvoir d'achat SMIC préservé</b> grâce aux revalorisations automatiques</p>
              <p>• <b>2021 et 2024 légèrement négatifs</b> - rattrapage l'année suivante</p>
              <p>• <b>Constat</b> : "Les salariés au-dessus du SMIC ont perdu en pouvoir d'achat"</p>
            </>
          )}
          {graphType === 'defaillances' && (
            <>
              <p>• <b>Explosion des défaillances</b> : 32k (2020) → 68k (2025)</p>
              <p>• <b>Rattrapage post-COVID</b> des entreprises "zombies" maintenues artificiellement</p>
              <p>• <b>Constat</b> : "Contexte économique difficile, mais les entreprises saines peuvent augmenter"</p>
            </>
          )}
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <Card title="📊 Tableau récapitulatif 2020-2025" darkMode={darkMode}>
        <div className="overflow-x-auto">
          <table className={`w-full text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <thead>
              <tr className={darkMode ? 'border-b border-gray-700' : 'border-b'}>
                <th className="text-left py-2 font-semibold">Indicateur</th>
                {hist.annees.map(an => <th key={an} className="text-center py-2 font-semibold">{an}</th>)}
                <th className="text-center py-2 font-semibold">Δ 5 ans</th>
              </tr>
            </thead>
            <tbody>
              <tr className={darkMode ? 'border-b border-gray-700' : 'border-b'}>
                <td className="py-1.5">Inflation (%)</td>
                {hist.inflation.valeurs.map((v, i) => <td key={i} className="text-center">{v}</td>)}
                <td className="text-center font-semibold text-red-500">+{hist.inflation_cumulee?.valeurs?.[5] || 15.9}%</td>
              </tr>
              <tr className={darkMode ? 'border-b border-gray-700' : 'border-b'}>
                <td className="py-1.5">Chômage (%)</td>
                {hist.chomage.valeurs.map((v, i) => <td key={i} className="text-center">{v}</td>)}
                <td className="text-center font-semibold text-green-500">-0.3 pt</td>
              </tr>
              <tr className={darkMode ? 'border-b border-gray-700' : 'border-b'}>
                <td className="py-1.5">SMIC net (€)</td>
                {hist.smic_net_mensuel.valeurs.map((v, i) => <td key={i} className="text-center">{v}</td>)}
                <td className="text-center font-semibold text-green-500">+17%</td>
              </tr>
              <tr className={darkMode ? 'border-b border-gray-700' : 'border-b'}>
                <td className="py-1.5">PIB (%)</td>
                {hist.pib_croissance.valeurs.map((v, i) => <td key={i} className={`text-center ${v < 0 ? 'text-red-500' : ''}`}>{v}</td>)}
                <td className="text-center font-semibold">-</td>
              </tr>
              <tr>
                <td className="py-1.5">Défaillances (k)</td>
                {(hist.defaillances?.valeurs || [32000, 28000, 42000, 57000, 66000, 68000]).map((v, i) => <td key={i} className="text-center">{(v/1000).toFixed(0)}</td>)}
                <td className="text-center font-semibold text-red-500">+113%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <p className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        📚 Sources : INSEE - Comptes nationaux, IPC, Enquête Emploi • Données 2025 : estimations/provisoires
      </p>
      
      {d.sources_par_onglet?.evolutions && (
        <p className="text-xs text-gray-400 text-center mt-2">📚 Sources : {d.sources_par_onglet.evolutions}</p>
      )}
      </>}
    </div>
  );
}

// ==================== ONGLET TRAVAIL (Égalité, AT, Formation, Épargne, Temps) ====================
function TravailTab({d, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  const [activeSection, setActiveSection] = useState('egalite');
  
  const sections = [
    {id: 'egalite', label: '⚖️ Égalité pro', icon: '⚖️'},
    {id: 'accidents', label: '🚧 Accidents', icon: '🚧'},
    {id: 'maladies', label: '🏥 Maladies pro', icon: '🏥'},
    {id: 'formation', label: '📚 Formation', icon: '📚'},
    {id: 'epargne', label: '💰 Épargne', icon: '💰'},
    {id: 'temps', label: '⏰ Temps', icon: '⏰'}
  ];
  
  const egapro = d.egalite_professionnelle || {};
  const accidents = d.accidents_travail || {};
  const maladies_pro = d.maladies_professionnelles || {};
  const formation = d.formation || {};
  const epargne = d.epargne_salariale || {};
  const temps = d.temps_travail || {};
  
  return (
    <div className="space-y-4">
      {/* Sous-navigation */}
      <div className={`flex flex-wrap gap-2 ${darkMode ? 'border-gray-700' : ''}`}>
        {sections.map(s => (
          <button 
            key={s.id} 
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              activeSection === s.id 
                ? 'bg-purple-600 text-white' 
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      
      {/* ÉGALITÉ PROFESSIONNELLE */}
      {activeSection === 'egalite' && egapro && (
        <div className="space-y-4">
          <Card title="⚖️ Index Égalité Professionnelle (Egapro)" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{egapro.index_moyen_national || 88}/100</div>
                <div className="text-sm text-gray-500">Index moyen national</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{egapro.entreprises_conformes_pct || 77}%</div>
                <div className="text-sm text-gray-500">Entreprises ≥75 pts</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{((egapro.nombre_declarations || 31000)/1000).toFixed(0)}k</div>
                <div className="text-sm text-gray-500">Déclarations</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-red-300' : 'text-red-600'}`}>{egapro.repartition_notes?.moins_de_75 || 23}%</div>
                <div className="text-sm text-gray-500">En-dessous du seuil</div>
              </div>
            </div>
            
            {egapro.par_taille && (
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : ''}`}>
                  <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                    <tr>
                      <th className="text-left p-2">Taille entreprise</th>
                      <th className="text-center p-2">Index moyen</th>
                      <th className="text-center p-2">% conformes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {egapro.par_taille.map((t, i) => (
                      <tr key={i} className={darkMode ? 'border-gray-700' : 'border-gray-200'}>
                        <td className="p-2">{t.taille}</td>
                        <td className="text-center p-2 font-semibold">{t.index_moyen}/100</td>
                        <td className="text-center p-2">{t.part_conformes}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>📖 Note de lecture</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-purple-200' : 'text-purple-800'}`}>
              {(egapro.notes_lecture || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
            {egapro.sources && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">📚 Sources : {egapro.sources}</p>}
          </div>
        </div>
      )}
      
      {/* ACCIDENTS DU TRAVAIL - Données 2024 CNAM */}
      {activeSection === 'accidents' && accidents && accidents.total_national && (
        <div className="space-y-4">
          {/* En-tête avec source */}
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                🚧 Accidents du Travail {accidents.annee || 2024}
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {accidents.source || 'CNAM - Risques professionnels'}
              </span>
            </div>
          </div>

          {/* KPIs principaux */}
          <Card title="📊 Chiffres clés nationaux" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                  {accidents.total_national.accidents_avec_arret?.toLocaleString() || '549 614'}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>AT avec arrêt</div>
                {accidents.total_national.tendance_accidents && (
                  <div className="text-xs text-green-500 mt-1">📉 Tendance : {accidents.total_national.tendance_accidents}</div>
                )}
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                  {accidents.total_national.indice_frequence}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>IF / 1 000 salariés</div>
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {accidents.total_national.accidents_mortels}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Décès reconnus</div>
                {accidents.total_national.evolution_mortels_pct && (
                  <div className="text-xs text-red-500 mt-1">⚠️ +{accidents.total_national.evolution_mortels_pct}% vs 2023</div>
                )}
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  {accidents.causes?.manutention_manuelle_pct || 50}%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manutention manuelle</div>
                <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>Cause n°1</div>
              </div>
            </div>

            {/* Démographie */}
            {accidents.demographie && (
              <div className={`p-3 rounded-xl mb-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                  <span>👨 <b>{accidents.demographie.hommes_pct}%</b> hommes</span>
                  <span>👩 <b>{accidents.demographie.femmes_pct}%</b> femmes</span>
                  <span>📊 Pic : <b>{accidents.demographie.tranche_pic}</b></span>
                </div>
              </div>
            )}
          </Card>

          {/* Tableau par CTN */}
          {accidents.par_ctn && (
            <Card title="📋 Détail par secteur (CTN) - 2024" darkMode={darkMode}>
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : ''}`}>
                  <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                    <tr>
                      <th className="text-left p-2">CTN</th>
                      <th className="text-left p-2">Secteur</th>
                      <th className="text-center p-2">Accidents</th>
                      <th className="text-center p-2">Évolution</th>
                      <th className="text-center p-2">IF*</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {accidents.par_ctn.map((s, i) => (
                      <tr key={i} className={`${s.if >= 38 ? (darkMode ? 'bg-red-900/20' : 'bg-red-50') : ''}`}>
                        <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{s.ctn}</td>
                        <td className="p-2">
                          <div className="font-medium">{s.secteur}</div>
                          {s.commentaire && (
                            <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{s.commentaire}</div>
                          )}
                        </td>
                        <td className="text-center p-2 font-medium">{s.accidents?.toLocaleString()}</td>
                        <td className={`text-center p-2 font-semibold ${s.evolution_pct > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {s.evolution_pct > 0 ? '+' : ''}{s.evolution_pct}%
                        </td>
                        <td className={`text-center p-2 font-bold ${s.if >= 38 ? (darkMode ? 'text-red-400' : 'text-red-600') : ''}`}>
                          {s.if}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                * IF = Indice de Fréquence (nombre d'accidents avec arrêt pour 1 000 salariés)
              </p>
            </Card>
          )}

          {/* Tableau simplifié si pas de CTN */}
          {!accidents.par_ctn && accidents.par_secteur && (
            <Card title="📋 Répartition par secteur" darkMode={darkMode}>
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : ''}`}>
                  <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                    <tr>
                      <th className="text-left p-2">Secteur</th>
                      <th className="text-center p-2">Accidents</th>
                      <th className="text-center p-2">Part %</th>
                      <th className="text-center p-2">IF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accidents.par_secteur.map((s, i) => (
                      <tr key={i} className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} ${s.if > 38 ? (darkMode ? 'bg-red-900/20' : 'bg-red-50') : ''}`}>
                        <td className="p-2">{s.secteur}</td>
                        <td className="text-center p-2">{s.accidents?.toLocaleString()}</td>
                        <td className="text-center p-2">{s.part_pct}%</td>
                        <td className={`text-center p-2 font-semibold ${s.if > 38 ? (darkMode ? 'text-red-400' : 'text-red-600') : ''}`}>{s.if}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          
          {/* Notes de lecture */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>📖 Notes de lecture</h4>
            <ul className={`text-sm space-y-2 ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
              {(accidents.notes_lecture || []).map((note, i) => (
                <li key={i} className={`p-2 rounded-lg ${darkMode ? 'bg-red-900/30' : 'bg-red-100/50'}`}>{note}</li>
              ))}
            </ul>
            <p className={`text-xs mt-3 pt-2 border-t ${darkMode ? 'border-red-800 text-gray-400' : 'border-red-200 text-gray-500'}`}>
              📚 Source : {accidents.source || 'CNAM - Risques professionnels, Rapport annuel 2024'}
            </p>
          </div>
        </div>
      )}

      {/* MALADIES PROFESSIONNELLES - Données 2024 CNAM */}
      {activeSection === 'maladies' && (
        <div className="space-y-4">
          {/* En-tête avec source */}
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-purple-900/20 border border-purple-800/50' : 'bg-purple-50 border border-purple-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                🏥 Maladies Professionnelles 2024
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                CNAM - Risques professionnels, Rapport annuel 2024
              </span>
            </div>
          </div>

          {/* KPIs principaux */}
          <Card title="📊 Chiffres clés nationaux" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                  {maladies_pro.total?.toLocaleString() || '50 598'}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>MP reconnues</div>
                <div className="text-xs text-red-500 mt-1">📈 +6.7% vs 2023</div>
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}>
                  52%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Femmes</div>
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  48%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hommes</div>
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                  87%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>TMS (tableau 57)</div>
                <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>Cause n°1</div>
              </div>
            </div>

            {/* Alerte sur la répartition H/F */}
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-pink-900/20 border border-pink-800/50' : 'bg-pink-50 border border-pink-200'}`}>
              <p className={`text-sm ${darkMode ? 'text-pink-200' : 'text-pink-800'}`}>
                <b>👩 Majorité féminine :</b> Les secteurs à forte prédominance féminine (grande distribution CTN D, santé/nettoyage CTN I) 
                et exposés aux gestes répétitifs contribuent fortement à la majorité féminine dans les MP.
              </p>
            </div>
          </Card>

          {/* Tableau par CTN */}
          <Card title="📋 Maladies Professionnelles par secteur (CTN) - 2024" darkMode={darkMode}>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : ''}`}>
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className="text-left p-2">CTN</th>
                    <th className="text-left p-2">Secteur</th>
                    <th className="text-center p-2">MP (1er règlement)</th>
                    <th className="text-center p-2">Évolution</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  <tr className={darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>D</td>
                    <td className="p-2">
                      <div className="font-medium">Services, Commerces, Alimentation</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Grande distribution, gestes répétitifs</div>
                    </td>
                    <td className="text-center p-2 font-bold">10 557</td>
                    <td className="text-center p-2 font-semibold text-red-500">+5.8%</td>
                  </tr>
                  <tr className={darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>I</td>
                    <td className="p-2">
                      <div className="font-medium">Santé, Nettoyage, Intérim</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Forte prédominance féminine</div>
                    </td>
                    <td className="text-center p-2 font-bold">10 383</td>
                    <td className="text-center p-2 font-semibold text-red-500">+6.1%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>B</td>
                    <td className="p-2">
                      <div className="font-medium">Bâtiment et Travaux Publics</div>
                    </td>
                    <td className="text-center p-2 font-medium">7 238</td>
                    <td className="text-center p-2 font-semibold text-red-500">+4.5%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>A</td>
                    <td className="p-2">
                      <div className="font-medium">Métallurgie</div>
                    </td>
                    <td className="text-center p-2 font-medium">6 237</td>
                    <td className="text-center p-2 font-semibold text-red-500">+8.1%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>C</td>
                    <td className="p-2">
                      <div className="font-medium">Transports, Eau, Gaz, Électricité</div>
                    </td>
                    <td className="text-center p-2 font-medium">3 968</td>
                    <td className="text-center p-2 font-semibold text-red-500">+9.6%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>G</td>
                    <td className="p-2">
                      <div className="font-medium">Commerce non alimentaire</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Plus forte hausse</div>
                    </td>
                    <td className="text-center p-2 font-medium">3 169</td>
                    <td className="text-center p-2 font-semibold text-red-500">+12.7%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>F</td>
                    <td className="p-2">
                      <div className="font-medium">Bois, Ameublement, Papier-Carton</div>
                    </td>
                    <td className="text-center p-2 font-medium">2 569</td>
                    <td className="text-center p-2 font-semibold text-red-500">+3.8%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>H</td>
                    <td className="p-2">
                      <div className="font-medium">Banques, Assurances, Services I</div>
                    </td>
                    <td className="text-center p-2 font-medium">2 250</td>
                    <td className="text-center p-2 font-semibold text-red-500">+12.3%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>E</td>
                    <td className="p-2">
                      <div className="font-medium">Chimie, Caoutchouc, Plasturgie</div>
                    </td>
                    <td className="text-center p-2 font-medium">1 671</td>
                    <td className="text-center p-2 font-semibold text-red-500">+8.9%</td>
                  </tr>
                </tbody>
                <tfoot className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                  <tr className="font-bold">
                    <td className="p-2" colSpan="2">Total Régime Général</td>
                    <td className="text-center p-2">50 598</td>
                    <td className="text-center p-2 text-red-500">+6.7%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
          
          {/* Notes de lecture */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>📖 Notes de lecture</h4>
            <ul className={`text-sm space-y-2 ${darkMode ? 'text-purple-200' : 'text-purple-800'}`}>
              <li className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100/50'}`}>
                📈 En 2024, le nombre total de MP augmente dans <b>presque tous les secteurs</b> (+6.7% global)
              </li>
              <li className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100/50'}`}>
                🏥 Les secteurs des services (CTN D et I) et du BTP (CTN B) sont les plus impactés en <b>volume</b>
              </li>
              <li className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100/50'}`}>
                📊 Les CTN G (Commerce non alim.) et H (Banques/Assurances) affichent les plus fortes <b>hausses</b> (+12%)
              </li>
              <li className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100/50'}`}>
                👩 Les TMS (troubles musculo-squelettiques) représentent <b>87%</b> des MP — touchant majoritairement les femmes
              </li>
            </ul>
            <p className={`text-xs mt-3 pt-2 border-t ${darkMode ? 'border-purple-800 text-gray-400' : 'border-purple-200 text-gray-500'}`}>
              📚 Source : CNAM - Risques professionnels, Rapport annuel 2024 (édition novembre 2025)
            </p>
          </div>
        </div>
      )}
      
      {/* FORMATION PROFESSIONNELLE - VERSION ENRICHIE CDC */}
      {activeSection === 'formation' && formation && (
        <div className="space-y-4">
          
          {/* CHIFFRES CLÉS CPF - Timeline et KPIs */}
          <Card title="📊 MonCompteFormation - Chiffres Clés 2025" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  {formation.cpf?.cumul?.dossiers_millions || '9.89'}M
                </div>
                <div className="text-xs text-gray-500">Dossiers depuis 2019</div>
              </div>
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                  {formation.cpf?.cumul?.cout_total_mds || '14.59'}Md€
                </div>
                <div className="text-xs text-gray-500">Coût pédagogique cumulé</div>
              </div>
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                  {formation.cpf?.prix_moyen_2025 || '1 776'}€
                </div>
                <div className="text-xs text-gray-500">Prix moyen 2025</div>
              </div>
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                  {formation.cpf?.dossiers_2025 ? (formation.cpf.dossiers_2025/1000000).toFixed(2) + 'M' : '1.33M'}
                </div>
                <div className="text-xs text-gray-500">Dossiers validés 2025</div>
              </div>
            </div>
            
            {/* Timeline historique */}
            {formation.cpf?.historique_dossiers && (
              <div className="mt-4">
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>📈 Évolution annuelle des dossiers CPF</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={formation.cpf.historique_dossiers}>
                    <CartesianGrid {...chartProps.cartesianGrid} />
                    <XAxis dataKey="annee" {...chartProps.xAxis} />
                    <YAxis yAxisId="left" {...chartProps.yAxis} tickFormatter={(v) => `${v}M`} />
                    <YAxis yAxisId="right" orientation="right" {...chartProps.yAxis} tickFormatter={(v) => `${v}€`} />
                    <Tooltip {...chartProps.tooltip} formatter={(value, name) => {
                      if (name === 'dossiers_millions') return [`${value}M dossiers`, 'Dossiers'];
                      if (name === 'prix_moyen') return [`${value}€`, 'Prix moyen'];
                      return [value, name];
                    }} />
                    <Bar yAxisId="left" dataKey="dossiers_millions" fill={C.primary} radius={[4, 4, 0, 0]} name="Dossiers (M)" />
                    <Line yAxisId="right" type="monotone" dataKey="prix_moyen" stroke={C.secondary} strokeWidth={2} dot={{ r: 4 }} name="Prix moyen (€)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* PROFIL DES STAGIAIRES - Salariés vs DE */}
          <Card title="👥 Qui utilise le CPF en 2025 ?" darkMode={darkMode}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Répartition Salariés / DE */}
              <div>
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Statut des bénéficiaires</h4>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={darkMode ? 'text-blue-300' : 'text-blue-600'}>Salariés</span>
                      <span className="font-bold">{formation.profil_stagiaires?.statut?.salaries_pct || 57}%</span>
                    </div>
                    <div className={`h-4 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div className="h-full bg-blue-500 rounded-full" style={{width: `${formation.profil_stagiaires?.statut?.salaries_pct || 57}%`}}></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={darkMode ? 'text-orange-300' : 'text-orange-600'}>Demandeurs d'emploi</span>
                      <span className="font-bold">{formation.profil_stagiaires?.statut?.demandeurs_emploi_pct || 43}%</span>
                    </div>
                    <div className={`h-4 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div className="h-full bg-orange-500 rounded-full" style={{width: `${formation.profil_stagiaires?.statut?.demandeurs_emploi_pct || 43}%`}}></div>
                    </div>
                  </div>
                </div>
                <p className={`text-xs mt-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  ⚠️ Part des DE en forte hausse : 31% en 2023 → 43% en 2025
                </p>
              </div>
              
              {/* Répartition par âge */}
              <div>
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Répartition par âge</h4>
                {formation.profil_stagiaires?.tranches_age?.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs w-20 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.tranche}</span>
                    <div className={`flex-1 h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full ${i === 1 ? 'bg-green-500' : i === 2 ? 'bg-blue-500' : 'bg-gray-400'}`}
                        style={{width: `${t.pct * 3}%`}}
                      ></div>
                    </div>
                    <span className={`text-xs font-bold w-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* CSP et Diplômes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-300/30">
              <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                  {formation.profil_stagiaires?.csp_salaries?.non_cadres_pct || 79}%
                </div>
                <div className="text-xs text-gray-500">Non-cadres</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formation.profil_stagiaires?.csp_salaries?.cadres_pct || 21}%
                </div>
                <div className="text-xs text-gray-500">Cadres</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}>
                  {formation.profil_stagiaires?.genre?.femmes_pct || 47}%
                </div>
                <div className="text-xs text-gray-500">Femmes</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>
                  {formation.profil_stagiaires?.genre?.hommes_pct || 53}%
                </div>
                <div className="text-xs text-gray-500">Hommes</div>
              </div>
            </div>
          </Card>

          {/* TOP FORMATIONS DEMANDÉES */}
          <Card title="🎯 Top des formations demandées en 2025" darkMode={darkMode}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Top domaines */}
              <div>
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Par domaine</h4>
                {formation.cpf?.top_domaines?.slice(0, 5).map((d, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'} title={d.domaine}>
                        {d.domaine.length > 30 ? d.domaine.substring(0, 30) + '...' : d.domaine}
                      </span>
                      <span className="font-bold">{d.part_pct}%</span>
                    </div>
                    <div className={`h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full ${
                          i === 0 ? 'bg-blue-500' : 
                          i === 1 ? 'bg-green-500' : 
                          i === 2 ? 'bg-purple-500' : 
                          i === 3 ? 'bg-orange-500' : 'bg-pink-500'
                        }`}
                        style={{width: `${d.part_pct * 2.5}%`}}
                      ></div>
                    </div>
                  </div>
                ))}
                <p className={`text-xs mt-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  🚗 Transport/Permis = 40% des formations !
                </p>
              </div>
              
              {/* Top certifications */}
              <div>
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Top certifications</h4>
                <div className="space-y-2">
                  {formation.cpf?.top_certifications?.slice(0, 5).map((c, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? 'bg-yellow-500 text-white' : 
                          i === 1 ? 'bg-gray-400 text-white' : 
                          i === 2 ? 'bg-orange-600 text-white' : 
                          `${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`
                        }`}>{i + 1}</span>
                        <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {c.nom.length > 25 ? c.nom.substring(0, 25) + '...' : c.nom}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{c.dossiers_k}k</div>
                        <div className="text-[10px] text-gray-500">{c.cout_m}M€</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* CPF SUR TEMPS DE TRAVAIL - Argument NAO */}
          <Card title="⏰ Formation sur temps de travail - Argument NAO !" darkMode={darkMode}>
            <div className={`p-3 rounded-xl mb-4 ${darkMode ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                  {formation.temps_travail?.formations_sur_temps_travail_2025_pct || 20}%
                </div>
                <div>
                  <div className={`font-semibold ${darkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>
                    des formations CPF sur temps de travail
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    vs {formation.temps_travail?.formations_sur_temps_travail_2024_pct || 17.4}% en 2024 → Tendance à la hausse !
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  {(formation.temps_travail?.nb_formations_salaries_2025 / 1000).toFixed(0) || 144}k
                </div>
                <div className="text-xs text-gray-500">Formations salariés</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                  {formation.temps_travail?.cout_formations_salaries_2025_m || 278}M€
                </div>
                <div className="text-xs text-gray-500">Coût pédagogique</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                  {formation.temps_travail?.dotation_entreprise_pct || 4.7}%
                </div>
                <div className="text-xs text-gray-500">Avec dotation entreprise</div>
              </div>
            </div>
            
            <div className={`mt-3 p-2 rounded-lg text-xs ${darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              💡 <strong>Argument NAO :</strong> "Seulement 20% des formations CPF se font sur le temps de travail. 
              L'entreprise peut abonder le CPF et accorder du temps de formation pour faciliter la montée en compétences."
            </div>
          </Card>

          {/* FINANCEMENT CPF */}
          <Card title="💰 Financement du CPF - Qui paie ?" darkMode={darkMode}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Répartition */}
              <div>
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Répartition des financeurs</h4>
                {formation.financement?.repartition?.map((f, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                        {f.financeur.length > 35 ? f.financeur.substring(0, 35) + '...' : f.financeur}
                      </span>
                      <span className="font-bold">{f.part_pct}%</span>
                    </div>
                    <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full ${
                          i === 0 ? 'bg-blue-500' : 
                          i === 1 ? 'bg-red-500' : 
                          i === 2 ? 'bg-green-500' : 
                          i === 3 ? 'bg-purple-500' : 'bg-orange-500'
                        }`}
                        style={{width: `${f.part_pct}%`}}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Participation forfaitaire */}
              <div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-300'}`}>
                  <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    ⚠️ Participation forfaitaire obligatoire
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                      {formation.financement?.participation_forfaitaire?.montant_euros || 102.23}€
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                      <p>Depuis janv. 2026</p>
                      <p>Indexé sur l'inflation</p>
                    </div>
                  </div>
                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    100€ en mai 2024 → 102,23€ en 2026. 
                  </p>
                </div>
                
                <div className={`mt-3 p-2 rounded-lg text-xs ${darkMode ? 'bg-green-900/20 text-green-300' : 'bg-green-50 text-green-700'}`}>
                  💡 <strong>Conseil :</strong> L'employeur peut prendre en charge cette participation via une dotation CPF !
                </div>
              </div>
            </div>
          </Card>

          {/* OFFRE DE FORMATION */}
          <Card title="🏫 L'offre de formation disponible" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  {(formation.offre?.organismes_actifs / 1000).toFixed(1) || 14.1}k
                </div>
                <div className="text-xs text-gray-500">Organismes actifs</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>
                  {(formation.offre?.certifications_disponibles / 1000).toFixed(1) || 3.7}k
                </div>
                <div className="text-xs text-gray-500">Certifications</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                  {(formation.offre?.sessions_disponibles / 1000).toFixed(0) || 878}k
                </div>
                <div className="text-xs text-gray-500">Sessions disponibles</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                  {formation.offre?.part_sessions_distance_pct || 10.9}%
                </div>
                <div className="text-xs text-gray-500">À distance</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Prix moyen au catalogue : <span className="font-bold">{formation.offre?.prix_moyen_catalogue || 2435}€</span>
              </div>
              <div className={`flex items-center gap-1 text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                ⭐ Note moyenne : <span className="font-bold">{formation.qualite?.note_moyenne_formations_actives || 4.7}/5</span>
              </div>
            </div>
          </Card>

          {/* ALTERNANCE & APPRENTISSAGE */}
          <Card title="🎓 Alternance & Apprentissage" darkMode={darkMode}>
            {formation.alternance && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{(formation.alternance.contrats_apprentissage_2024/1000).toFixed(0)}k</div>
                  <div className="text-sm text-gray-500">Apprentis 2024</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>{(formation.alternance.total_alternants/1000).toFixed(0)}k</div>
                  <div className="text-sm text-gray-500">Total alternants</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{formation.alternance.taux_insertion_6mois}%</div>
                  <div className="text-sm text-gray-500">Insertion 6 mois</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>+{formation.alternance.evolution_vs_2023}%</div>
                  <div className="text-sm text-gray-500">vs 2023</div>
                </div>
              </div>
            )}
          </Card>
          
          {/* ACCÈS À LA FORMATION - Inégalités */}
          {formation.taux_acces && (
            <Card title="📋 Inégalités d'accès à la formation" darkMode={darkMode}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Taux d'accès par CSP</h4>
                  {formation.taux_acces.par_csp?.map((c, i) => (
                    <div key={i} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{c.csp}</span>
                        <span className={`font-bold ${c.taux >= 50 ? 'text-green-500' : c.taux >= 35 ? 'text-yellow-500' : 'text-red-500'}`}>{c.taux}%</span>
                      </div>
                      <div className={`h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className={`h-full rounded-full ${c.taux >= 50 ? 'bg-green-500' : c.taux >= 35 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{width: `${c.taux}%`}}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                  <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>⚠️ Écart persistant</h4>
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>62%</div>
                      <div className="text-xs text-gray-500">Cadres</div>
                    </div>
                    <div className={`text-2xl ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>vs</div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>28%</div>
                      <div className="text-xs text-gray-500">Ouvriers</div>
                    </div>
                  </div>
                  <p className={`text-xs mt-2 ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                    💡 Argument NAO : Demandez un plan de formation ciblé pour réduire ces inégalités !
                  </p>
                </div>
              </div>
            </Card>
          )}
          
          {/* NOTES DE LECTURE */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>📖 Note de lecture</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
              {(formation.notes_lecture || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
            {formation.sources && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">📚 Sources : {formation.sources}</p>}
            {formation.source_cdc && <p className="text-xs text-gray-500">📅 Données CDC : {formation.date_mise_a_jour}</p>}
          </div>
        </div>
      )}


            {/* ÉPARGNE SALARIALE */}
      {activeSection === 'epargne' && epargne && (
        <div className="space-y-4">
          <Card title="💰 Épargne Salariale (Participation, Intéressement, PEE)" darkMode={darkMode}>
            {epargne.couverture && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{epargne.couverture.salaries_couverts_pct}%</div>
                  <div className="text-sm text-gray-500">Salariés couverts</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{epargne.couverture.salaries_couverts_millions}M</div>
                  <div className="text-sm text-gray-500">Bénéficiaires</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>{epargne.montants_totaux?.primes_brutes_mds}Md€</div>
                  <div className="text-sm text-gray-500">Total distribué</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{epargne.montants_totaux?.montant_moyen_beneficiaire}€</div>
                  <div className="text-sm text-gray-500">Moyenne/bénéficiaire</div>
                </div>
              </div>
            )}
            
            {epargne.dispositifs && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">Participation</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{epargne.dispositifs.participation?.montant_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.participation?.salaries_couverts_pct}% couverts</div>
                </div>
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">Intéressement</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{epargne.dispositifs.interessement?.montant_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.interessement?.salaries_couverts_pct}% couverts</div>
                </div>
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">PEE (abondement)</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{epargne.dispositifs.pee?.abondement_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.pee?.salaries_couverts_pct}% couverts</div>
                </div>
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">PERCO/PERCOL</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{epargne.dispositifs.perco_percol?.abondement_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.perco_percol?.salaries_couverts_pct}% couverts</div>
                </div>
              </div>
            )}
          </Card>
          
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>📖 Note de lecture</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
              {(epargne.notes_lecture || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
            {epargne.sources && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">📚 Sources : {epargne.sources}</p>}
          </div>
        </div>
      )}
      
      {/* TEMPS DE TRAVAIL */}
      {activeSection === 'temps' && temps && (
        <div className="space-y-4">
          <Card title="⏰ Durée et Organisation du Temps de Travail" darkMode={darkMode}>
            {temps.duree_travail && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{temps.duree_travail.duree_hebdo_habituelle}h</div>
                  <div className="text-sm text-gray-500">Durée hebdo moyenne</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{temps.duree_travail.duree_legale}h</div>
                  <div className="text-sm text-gray-500">Durée légale</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{temps.duree_travail.duree_annuelle_effective}h</div>
                  <div className="text-sm text-gray-500">Durée annuelle</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{temps.temps_partiel?.taux_global_pct}%</div>
                  <div className="text-sm text-gray-500">Temps partiel</div>
                </div>
              </div>
            )}
            
            {temps.horaires_atypiques && (
              <div className="mb-4">
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : ''}`}>Horaires atypiques</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="font-bold">{temps.horaires_atypiques.travail_samedi_pct}%</div>
                    <div className="text-xs text-gray-500">Samedi</div>
                  </div>
                  <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="font-bold">{temps.horaires_atypiques.travail_dimanche_pct}%</div>
                    <div className="text-xs text-gray-500">Dimanche</div>
                  </div>
                  <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="font-bold">{temps.horaires_atypiques.travail_soir_pct}%</div>
                    <div className="text-xs text-gray-500">Soir</div>
                  </div>
                  <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="font-bold">{temps.horaires_atypiques.travail_nuit_pct}%</div>
                    <div className="text-xs text-gray-500">Nuit</div>
                  </div>
                </div>
              </div>
            )}
            
            {temps.par_csp && (
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : ''}`}>
                  <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                    <tr>
                      <th className="text-left p-2">CSP</th>
                      <th className="text-center p-2">Heures/semaine</th>
                      <th className="text-center p-2">Heures/an</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(temps.par_csp).map(([csp, data], i) => (
                      <tr key={i} className={darkMode ? 'border-gray-700' : 'border-gray-200'}>
                        <td className="p-2 capitalize">{csp.replace('_', ' ')}</td>
                        <td className="text-center p-2">{data.heures_hebdo}h</td>
                        <td className="text-center p-2 font-semibold">{data.annuelles}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-cyan-900/20 border border-cyan-800' : 'bg-cyan-50 border border-cyan-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>📖 Note de lecture</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-cyan-200' : 'text-cyan-800'}`}>
              {(temps.notes_lecture || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
            {temps.sources && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">📚 Sources : {temps.sources}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== ONGLET PRÉVISIONS ÉCONOMIQUES v4.0 ====================
// Avec Monte Carlo, probabilités, fan charts et scénarios what-if
// À copier dans App.jsx pour remplacer l'ancien PrevisionsTab

function PrevisionsTab({d, darkMode, fp={}}) {
  const [activeSubTab, setActiveSubTab] = useState('vue_ensemble');
  const chartProps = useChartProps(darkMode);
  
  // Données Banque de France / INSEE
  const prev = d.previsions || {};
  const bdf = prev.banque_de_france || {};
  
  // Prévisions CFTC v4
  const cftc = d.previsions_cftc || {};
  const inflationCftc = cftc.inflation || {};
  const smicCftc = cftc.smic || {};
  const chomageCftc = cftc.chomage || {};
  const scenarios = cftc.scenarios || {};
  const whatifScenarios = cftc.whatif_scenarios || {};
  const notesLecture = cftc.notes_lecture || [];
  const methodology = cftc.methodology || {};

  const subTabs = [
    ['vue_ensemble', '📊 Vue d\'ensemble'],
    ['inflation', '📈 Inflation'],
    ['smic', '💰 SMIC'],
    ['chomage', '👥 Chômage'],
    ['scenarios', '🎯 Scénarios'],
    ['whatif', '🎲 What-if'],
    ['notes', '📝 Notes']
  ];

  // === COMPOSANT JAUGE DE PROBABILITÉ ===
  const ProbabilityGauge = ({ value, label, color = 'blue', size = 'md' }) => {
    const sizeClasses = {
      sm: 'w-16 h-16 text-lg',
      md: 'w-24 h-24 text-2xl',
      lg: 'w-32 h-32 text-3xl'
    };
    const radius = size === 'sm' ? 28 : size === 'md' ? 42 : 56;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;
    
    return (
      <div className="flex flex-col items-center">
        <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
          <svg className="transform -rotate-90 w-full h-full">
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              stroke={darkMode ? '#374151' : '#e5e7eb'}
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              stroke={color === 'green' ? '#22c55e' : color === 'orange' ? '#f59e0b' : color === 'red' ? '#ef4444' : '#3b82f6'}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <span className={`absolute font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {value}%
          </span>
        </div>
        <span className={`text-xs mt-2 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      </div>
    );
  };

  // === COMPOSANT FAN CHART (graphique avec zones de confiance) ===
  const FanChart = ({ data, color, height = 250, title }) => {
    if (!data?.predictions || !data?.periods) {
      return (
        <div className={`flex items-center justify-center h-48 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <p>Données non disponibles</p>
        </div>
      );
    }
    
    const chartData = data.periods.map((period, i) => ({
      period: period.replace(/^\d{4}-/, ''),
      p10: data.lower_bound?.[i],
      p25: data.p25?.[i],
      p50: data.predictions[i],
      p75: data.p75?.[i],
      p90: data.upper_bound?.[i]
    }));

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="100%" stopColor={color} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid {...chartProps.cartesianGrid} />
          <XAxis dataKey="period" {...chartProps.xAxis} />
          <YAxis {...chartProps.yAxis} tickFormatter={(v) => `${v}%`} />
          <Tooltip 
            {...chartProps.tooltip}
            formatter={(value, name) => {
              const labels = { 
                p50: 'Médiane', 
                p10: 'Percentile 10', 
                p25: 'Percentile 25',
                p75: 'Percentile 75',
                p90: 'Percentile 90'
              };
              return [`${value?.toFixed(1)}%`, labels[name] || name];
            }}
          />
          
          {/* Zone p10-p90 (80% de confiance) */}
          <Area type="monotone" dataKey="p90" stroke="none" fill={`url(#gradient-${color})`} />
          <Area type="monotone" dataKey="p10" stroke="none" fill={darkMode ? '#1f2937' : '#ffffff'} />
          
          {/* Zone p25-p75 (50% de confiance) */}
          <Area type="monotone" dataKey="p75" stroke="none" fill={color} fillOpacity={0.25} />
          <Area type="monotone" dataKey="p25" stroke="none" fill={darkMode ? '#1f2937' : '#ffffff'} />
          
          {/* Ligne médiane */}
          <Line type="monotone" dataKey="p50" stroke={color} strokeWidth={3} dot={{ fill: color, r: 4 }} />
          
          {/* Lignes p10/p90 */}
          <Line type="monotone" dataKey="p90" stroke={color} strokeWidth={1} strokeDasharray="4 4" dot={false} opacity={0.4} />
          <Line type="monotone" dataKey="p10" stroke={color} strokeWidth={1} strokeDasharray="4 4" dot={false} opacity={0.4} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // === COMPOSANT TIMELINE SMIC ===
  const SmicTimeline = ({ events }) => {
    if (!events || events.length === 0) {
      return (
        <div className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="text-3xl">📅</span>
          <p className="mt-2">Aucune revalorisation prévue</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {events.map((event, idx) => {
          const isJanuary = event.type === 'janvier';
          const fourchette = event.fourchette;
          
          return (
            <div key={idx} className={`relative pl-6 border-l-4 ${
              isJanuary ? 'border-green-500' : 'border-yellow-500'
            }`}>
              <div className={`absolute -left-2.5 top-2 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                isJanuary ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
              }`}>
                {isJanuary ? '✓' : '?'}
              </div>
              
              <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                      isJanuary 
                        ? (darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800')
                        : (darkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800')
                    }`}>
                      {isJanuary ? '📅 Obligatoire' : '⚡ Automatique'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Probabilité</span>
                    <div className={`text-xl font-bold ${
                      event.probability >= 0.9 ? 'text-green-500' : 'text-yellow-500'
                    }`}>
                      {Math.round(event.probability * 100)}%
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hausse estimée</span>
                    <p className="text-xl font-bold text-green-500">+{event.estimated_increase_pct}%</p>
                    {fourchette && (
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        [{fourchette.min}% - {fourchette.max}%]
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SMIC brut</span>
                    <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {event.estimated_new_smic_brut?.toFixed(0)}€
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SMIC net</span>
                    <p className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {event.estimated_new_smic_net?.toFixed(0)}€
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // === COMPOSANT CARTE SCÉNARIO WHAT-IF ===
  const WhatIfCard = ({ scenario, id }) => {
    const colorMap = {
      'choc_petrolier': 'orange',
      'recession_ue': 'red',
      'hausse_taux': 'purple',
      'reprise_forte': 'green',
      'crise_energie': 'red'
    };
    const color = colorMap[id] || 'blue';
    
    const bgColor = {
      orange: darkMode ? 'bg-orange-900/30 border-orange-700/50' : 'bg-orange-50 border-orange-200',
      red: darkMode ? 'bg-red-900/30 border-red-700/50' : 'bg-red-50 border-red-200',
      purple: darkMode ? 'bg-purple-900/30 border-purple-700/50' : 'bg-purple-50 border-purple-200',
      green: darkMode ? 'bg-green-900/30 border-green-700/50' : 'bg-green-50 border-green-200',
      blue: darkMode ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-50 border-blue-200'
    };

    return (
      <div className={`rounded-xl p-4 border ${bgColor[color]}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{scenario.nom}</h4>
          <span className={`text-xs px-2 py-1 rounded-full ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600'
          }`}>
            P = {scenario.probabilite}
          </span>
        </div>
        
        <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {scenario.description}
        </p>
        
        <div className={`text-xs mb-3 p-2 rounded-lg ${darkMode ? 'bg-gray-800/50' : 'bg-white/50'}`}>
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Hypothèses : </span>
          {Object.entries(scenario.hypotheses || {}).map(([k, v], i) => (
            <span key={k} className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              {i > 0 && ', '}{k}: <b>{v}</b>
            </span>
          ))}
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inflation</span>
            <p className={`font-bold ${scenario.impact?.inflation_12m > 2 ? 'text-orange-500' : 'text-green-500'}`}>
              {scenario.impact?.inflation_12m}%
            </p>
          </div>
          <div>
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chômage</span>
            <p className={`font-bold ${scenario.impact?.chomage_q4 > 8 ? 'text-red-500' : 'text-blue-500'}`}>
              {scenario.impact?.chomage_q4}%
            </p>
          </div>
          <div>
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SMIC supp.</span>
            <p className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {scenario.impact?.smic_supp}
            </p>
          </div>
        </div>
        
        <p className={`text-xs mt-3 pt-2 border-t ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          🎯 Déclencheur : {scenario.declencheur}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Badge version */}
      <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border border-purple-200'}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔮</span>
          <div>
            <span className={`font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
              {cftc.model_version || 'CFTC Prévisions'}
            </span>
            {methodology.simulations && (
              <span className={`ml-2 text-xs ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                ({methodology.simulations} simulations)
              </span>
            )}
          </div>
        </div>
        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Mis à jour : {cftc.generated_at ? new Date(cftc.generated_at).toLocaleDateString('fr-FR') : '—'}
        </span>
      </div>

      {/* Navigation sous-onglets */}
      <BubbleSubTabs 
        tabs={subTabs} 
        activeTab={activeSubTab} 
        setActiveTab={setActiveSubTab} 
        darkMode={darkMode}
        color="purple"
      />

      {/* ==================== VUE D'ENSEMBLE ==================== */}
      {activeSubTab === 'vue_ensemble' && (
        <>
          {/* KPIs avec probabilités */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-orange-900/30 border border-orange-800/50' : 'bg-orange-50 border border-orange-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                    {inflationCftc.prevision_12m ?? '—'}%
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inflation 12m</div>
                </div>
                {inflationCftc.probabilites && (
                  <ProbabilityGauge 
                    value={inflationCftc.probabilites.inflation_sous_2pct || 0} 
                    label="P(< 2%)" 
                    color="green"
                    size="sm"
                  />
                )}
              </div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                IC 80% : [{inflationCftc.mensuel?.lower_bound?.slice(-1)[0] || '—'}% - {inflationCftc.mensuel?.upper_bound?.slice(-1)[0] || '—'}%]
              </div>
            </div>
            
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-green-900/30 border border-green-800/50' : 'bg-green-50 border border-green-200'}`}>
              <div className={`text-3xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                +{smicCftc.events?.[0]?.estimated_increase_pct ?? '—'}%
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SMIC janvier</div>
              {smicCftc.events?.[0]?.fourchette && (
                <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Fourchette : [{smicCftc.events[0].fourchette.min}% - {smicCftc.events[0].fourchette.max}%]
                </div>
              )}
              <div className="text-xs text-green-500 mt-1">✓ Certain (loi)</div>
            </div>
            
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-red-900/30 border border-red-800/50' : 'bg-red-50 border border-red-200'}`}>
              <div className={`text-3xl font-bold ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                {chomageCftc.prevision_q4 ?? '—'}%
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chômage Q4</div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                IC 80% : [{chomageCftc.trimestriel?.lower_bound?.slice(-1)[0] || '—'}% - {chomageCftc.trimestriel?.upper_bound?.slice(-1)[0] || '—'}%]
              </div>
            </div>
            
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'}`}>
              <div className={`text-3xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                +{bdf.pib_croissance?.['2026'] ?? '—'}%
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PIB 2026</div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Source : Banque de France
              </div>
            </div>
          </div>

          {/* Graphiques Fan Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="📈 Prévision d'inflation (Monte Carlo)" darkMode={darkMode}>
              <FanChart data={inflationCftc.mensuel} color="#f59e0b" height={220} />
              <div className={`flex items-center justify-between text-xs mt-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>Zone foncée = 50% de probabilité</span>
                <span>Zone claire = 80% de probabilité</span>
              </div>
            </Card>
            
            <Card title="👥 Prévision de chômage (Monte Carlo)" darkMode={darkMode}>
              <FanChart data={chomageCftc.trimestriel} color="#ef4444" height={220} />
              <div className={`flex items-center justify-between text-xs mt-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>Médiane (p50)</span>
                <span>IC 80% (p10-p90)</span>
              </div>
            </Card>
          </div>

          {/* Probabilités clés */}
          {inflationCftc.probabilites && (
            <Card title="🎲 Probabilités clés" darkMode={darkMode}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ProbabilityGauge 
                  value={inflationCftc.probabilites.inflation_sous_2pct || 0} 
                  label="Inflation < 2% (cible BCE)"
                  color="green"
                />
                <ProbabilityGauge 
                  value={inflationCftc.probabilites.inflation_au_dessus_3pct || 0} 
                  label="Inflation > 3% (risque)"
                  color="red"
                />
                <ProbabilityGauge 
                  value={chomageCftc.probabilites?.chomage_sous_7pct || 0} 
                  label="Chômage < 7%"
                  color="green"
                />
                <ProbabilityGauge 
                  value={100 - (chomageCftc.probabilites?.chomage_au_dessus_8pct || 0)} 
                  label="Chômage < 8%"
                  color="blue"
                />
              </div>
            </Card>
          )}
        </>
      )}

      {/* ==================== INFLATION ==================== */}
      {activeSubTab === 'inflation' && (
        <>
          <Card title="📈 Prévision d'inflation mensuelle (Fan Chart)" darkMode={darkMode}>
            <FanChart data={inflationCftc.mensuel} color="#f59e0b" height={300} />
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <BubbleStatBlock label="Actuelle" value={`${inflationCftc.actuel ?? '—'}%`} status="neutral" darkMode={darkMode} />
            <BubbleStatBlock label="Médiane 6m" value={`${inflationCftc.prevision_6m ?? '—'}%`} status={inflationCftc.prevision_6m > 2 ? 'warning' : 'good'} darkMode={darkMode} />
            <BubbleStatBlock label="Médiane 12m" value={`${inflationCftc.prevision_12m ?? '—'}%`} status={inflationCftc.prevision_12m > 2 ? 'warning' : 'good'} darkMode={darkMode} />
          </div>

          {inflationCftc.facteurs && (
            <Card title="🔧 Facteurs du modèle" darkMode={darkMode}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Cible BDF</span>
                  <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{inflationCftc.facteurs.cible_bdf}%</p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Ajust. climat</span>
                  <p className={`font-bold ${inflationCftc.facteurs.ajustement_climat >= 0 ? 'text-orange-500' : 'text-green-500'}`}>
                    {inflationCftc.facteurs.ajustement_climat >= 0 ? '+' : ''}{inflationCftc.facteurs.ajustement_climat}pt
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Ajust. énergie</span>
                  <p className={`font-bold ${inflationCftc.facteurs.ajustement_energie >= 0 ? 'text-orange-500' : 'text-green-500'}`}>
                    {inflationCftc.facteurs.ajustement_energie >= 0 ? '+' : ''}{inflationCftc.facteurs.ajustement_energie}pt
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Cible ajustée</span>
                  <p className={`font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{inflationCftc.facteurs.cible_ajustee}%</p>
                </div>
              </div>
            </Card>
          )}
          
          <BubbleNote type="info" title="📊 Méthodologie Monte Carlo" darkMode={darkMode}>
            <p>Le modèle simule <b>{methodology.simulations || 1000} trajectoires</b> possibles d'inflation avec :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Convergence vers la cible Banque de France (mean reversion)</li>
              <li>Saisonnalité mensuelle (rentrée, soldes, etc.)</li>
              <li>Ajustement selon le climat des affaires</li>
            </ul>
            <p className="mt-2">Les zones colorées représentent les intervalles de confiance à 50% et 80%.</p>
          </BubbleNote>
        </>
      )}

      {/* ==================== SMIC ==================== */}
      {activeSubTab === 'smic' && (
        <>
          <Card title="💰 Prochaines revalorisations du SMIC" darkMode={darkMode}>
            <SmicTimeline events={smicCftc.events} />
          </Card>
          
          {smicCftc.forecast_12m && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="📊 SMIC actuel" darkMode={darkMode}>
                <div className="space-y-3">
                  <BubbleStatBlock label="Brut mensuel" value={`${smicCftc.current?.brut?.toFixed(2) ?? '—'}€`} status="neutral" darkMode={darkMode} />
                  <BubbleStatBlock label="Net mensuel" value={`${smicCftc.current?.net?.toFixed(2) ?? '—'}€`} status="neutral" darkMode={darkMode} />
                  <BubbleStatBlock label="Horaire brut" value={`${smicCftc.current?.horaire_brut?.toFixed(2) ?? '—'}€`} status="neutral" darkMode={darkMode} />
                </div>
              </Card>
              
              <Card title="🔮 SMIC prévu (12 mois)" darkMode={darkMode}>
                <div className="space-y-3">
                  <BubbleStatBlock label="Brut prévu" value={`${smicCftc.forecast_12m.final_smic_brut?.toFixed(2) ?? '—'}€`} status="good" darkMode={darkMode} />
                  <BubbleStatBlock label="Net prévu" value={`${smicCftc.forecast_12m.final_smic_net?.toFixed(2) ?? '—'}€`} status="good" darkMode={darkMode} />
                  <BubbleStatBlock label="Hausse totale" value={`+${smicCftc.forecast_12m.total_increase_pct ?? '—'}%`} status="good" darkMode={darkMode} />
                  {smicCftc.forecast_12m.fourchette && (
                    <div className={`text-xs text-center p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      Fourchette : [{smicCftc.forecast_12m.fourchette.min}% - {smicCftc.forecast_12m.fourchette.max}%]
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
          
          <BubbleNote type="info" title="⚖️ Règles légales du SMIC" darkMode={darkMode}>
            <p><b>1. Revalorisation obligatoire au 1er janvier</b> — Inflation + gain pouvoir d'achat SHBOE</p>
            <p className="mt-2"><b>2. Revalorisation automatique</b> — Si inflation cumulée &gt; 2% depuis dernière reva</p>
            <p className="mt-2"><b>3. Coup de pouce</b> — Possible mais non prévisible (décision politique)</p>
          </BubbleNote>
        </>
      )}

      {/* ==================== CHÔMAGE ==================== */}
      {activeSubTab === 'chomage' && (
        <>
          <Card title="👥 Prévision de chômage trimestrielle (Fan Chart)" darkMode={darkMode}>
            <FanChart data={chomageCftc.trimestriel} color="#ef4444" height={300} />
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <BubbleStatBlock label="Actuel" value={`${chomageCftc.actuel ?? '—'}%`} status="neutral" darkMode={darkMode} />
            <BubbleStatBlock label="Prévu Q4" value={`${chomageCftc.prevision_q4 ?? '—'}%`} status={chomageCftc.prevision_q4 > 8 ? 'danger' : 'neutral'} darkMode={darkMode} />
            <BubbleStatBlock label="Tendance" value={chomageCftc.tendance || '—'} status={chomageCftc.tendance === 'baisse' ? 'good' : chomageCftc.tendance === 'hausse' ? 'warning' : 'neutral'} darkMode={darkMode} />
          </div>

          {chomageCftc.facteurs && (
            <Card title="🔧 Facteurs du modèle" darkMode={darkMode}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Cible BDF</span>
                  <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{chomageCftc.facteurs.cible_bdf}%</p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Ajust. climat</span>
                  <p className={`font-bold ${chomageCftc.facteurs.ajustement_climat >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {chomageCftc.facteurs.ajustement_climat >= 0 ? '+' : ''}{chomageCftc.facteurs.ajustement_climat}pt
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Ajust. recrutement</span>
                  <p className={`font-bold ${chomageCftc.facteurs.ajustement_recrutement >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {chomageCftc.facteurs.ajustement_recrutement >= 0 ? '+' : ''}{chomageCftc.facteurs.ajustement_recrutement}pt
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Cible ajustée</span>
                  <p className={`font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{chomageCftc.facteurs.cible_ajustee}%</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ==================== SCÉNARIOS ==================== */}
      {activeSubTab === 'scenarios' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['optimiste', 'central', 'pessimiste'].map((key) => {
              const scenario = scenarios[key] || {};
              const config = {
                optimiste: { icon: '🌟', color: 'green', label: 'Optimiste (p25)' },
                central: { icon: '📊', color: 'blue', label: 'Central (médiane)', highlight: true },
                pessimiste: { icon: '⚠️', color: 'red', label: 'Pessimiste (p75)' }
              }[key];
              
              return (
                <div 
                  key={key}
                  className={`rounded-2xl p-5 relative ${
                    config.highlight 
                      ? (darkMode ? 'bg-blue-900/30 border-2 border-blue-500' : 'bg-blue-50 border-2 border-blue-500')
                      : (darkMode ? 'bg-gray-800' : 'bg-gray-50')
                  }`}
                >
                  {config.highlight && (
                    <span className="absolute -top-3 right-4 text-xs px-3 py-1 bg-blue-500 text-white rounded-full">
                      Probable
                    </span>
                  )}
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{config.icon}</span>
                    <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{config.label}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inflation</span>
                      <span className={`font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{scenario.inflation_12m}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SMIC</span>
                      <span className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{scenario.smic_increase}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chômage</span>
                      <span className={`font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{scenario.chomage_q4}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PIB</span>
                      <span className={`font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{scenario.pib}</span>
                    </div>
                  </div>
                  
                  <p className={`text-xs mt-4 pt-3 border-t ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                    {scenario.hypotheses}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ==================== WHAT-IF ==================== */}
      {activeSubTab === 'whatif' && (
        <>
          <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border border-purple-200'}`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎲</span>
              <div>
                <h3 className={`font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Scénarios What-If</h3>
                <p className={`text-sm ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  Impact de chocs économiques sur les prévisions
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(whatifScenarios).map(([id, scenario]) => (
              <WhatIfCard key={id} id={id} scenario={scenario} />
            ))}
          </div>
          
          {Object.keys(whatifScenarios).length === 0 && (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="text-4xl">🎲</span>
              <p className="mt-2">Scénarios what-if non disponibles</p>
              <p className="text-sm">Mettez à jour vers le modèle v4</p>
            </div>
          )}
        </>
      )}

      {/* ==================== NOTES DE LECTURE ==================== */}
      {activeSubTab === 'notes' && (
        <>
          <Card title="📝 Notes de lecture — Prévisions économiques" darkMode={darkMode}>
            <div className="space-y-3">
              {notesLecture.length > 0 ? (
                notesLecture.map((note, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl border-l-4 ${
                      note.includes('⚠️') 
                        ? (darkMode ? 'bg-orange-900/20 border-orange-500' : 'bg-orange-50 border-orange-500')
                        : note.includes('💡')
                          ? (darkMode ? 'bg-green-900/20 border-green-500' : 'bg-green-50 border-green-500')
                          : note.includes('🎲')
                            ? (darkMode ? 'bg-purple-900/20 border-purple-500' : 'bg-purple-50 border-purple-500')
                            : (darkMode ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50 border-blue-500')
                    }`}
                  >
                    <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      {note}
                    </p>
                  </div>
                ))
              ) : (
                <p className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Notes de lecture non disponibles.
                </p>
              )}
            </div>
          </Card>
          
          <Card title="🏦 Prévisions Banque de France (décembre 2025)" darkMode={darkMode}>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : ''}`}>
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className="text-left p-2">Indicateur</th>
                    <th className="text-center p-2">2024</th>
                    <th className={`text-center p-2 ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>2025</th>
                    <th className={`text-center p-2 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>2026</th>
                    <th className="text-center p-2">2027</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  <tr>
                    <td className="p-2 font-medium">PIB (%)</td>
                    <td className="text-center p-2">{bdf.pib_croissance?.['2024']}</td>
                    <td className={`text-center p-2 ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>{bdf.pib_croissance?.['2025']}</td>
                    <td className={`text-center p-2 font-bold ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>{bdf.pib_croissance?.['2026']}</td>
                    <td className="text-center p-2">{bdf.pib_croissance?.['2027']}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Inflation IPCH (%)</td>
                    <td className="text-center p-2">{bdf.inflation_ipch?.['2024']}</td>
                    <td className={`text-center p-2 ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>{bdf.inflation_ipch?.['2025']}</td>
                    <td className={`text-center p-2 font-bold ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>{bdf.inflation_ipch?.['2026']}</td>
                    <td className="text-center p-2">{bdf.inflation_ipch?.['2027']}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Chômage (%)</td>
                    <td className="text-center p-2">{bdf.taux_chomage?.['2024']}</td>
                    <td className={`text-center p-2 ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>{bdf.taux_chomage?.['2025']}</td>
                    <td className={`text-center p-2 font-bold ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>{bdf.taux_chomage?.['2026']}</td>
                    <td className="text-center p-2">{bdf.taux_chomage?.['2027']}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Salaires nominaux (%)</td>
                    <td className="text-center p-2">{bdf.salaires_nominaux?.['2024']}</td>
                    <td className={`text-center p-2 ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>{bdf.salaires_nominaux?.['2025']}</td>
                    <td className={`text-center p-2 font-bold ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>{bdf.salaires_nominaux?.['2026']}</td>
                    <td className="text-center p-2">{bdf.salaires_nominaux?.['2027']}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
          
          {cftc.sources && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>📚 Sources</h4>
              <ul className={`text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {cftc.sources.map((source, idx) => (
                  <li key={idx}>• {source}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Disclaimer */}
      <div className={`text-center text-xs p-3 rounded-xl ${darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
        ⚠️ {cftc.disclaimer || "Prévisions probabilistes basées sur simulations Monte Carlo. Les probabilités indiquées reflètent l'incertitude du modèle."}
      </div>
    </div>
  );
}
// ==================== ONGLET TERRITOIRES ====================

// ==================== NOUVEAU COMPOSANT TERRITOIRES ====================
// Remplacer le composant TerritoiresTab existant par celui-ci

function TerritoiresTab({d, darkMode}) {
  const [subMapTab, setSubMapTab] = useState('carte');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [metric, setMetric] = useState('chomage');
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [mapPaths, setMapPaths] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const reg = d.donnees_regionales || {};
  const regions = reg.regions || [];
  const france = reg.france_metro || {};

  // Mapping des codes INSEE vers nos codes
  const codeMapping = {
    '11': 'IDF', '24': 'CVL', '27': 'BFC', '28': 'NOR', '32': 'HDF',
    '44': 'GES', '52': 'PDL', '53': 'BRE', '75': 'NAQ', '76': 'OCC',
    '84': 'ARA', '93': 'PAC', '94': 'COR'
  };

  // Charger les données GeoJSON au montage
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        // Charger depuis le CDN jsdelivr (miroir de GitHub)
        const response = await fetch('https://cdn.jsdelivr.net/gh/gregoiredavid/france-geojson@master/regions-version-simplifiee.geojson');
        const geojson = await response.json();
        
        // Projection simple pour convertir lat/lon en coordonnées SVG
        const width = 300;
        const height = 340;
        const centerLon = 2.5;
        const centerLat = 46.5;
        const scale = 2400;
        
        const project = (lon, lat) => {
          const x = (lon - centerLon) * Math.cos(centerLat * Math.PI / 180) * scale / 100 + width / 2;
          const y = -(lat - centerLat) * scale / 100 + height / 2 - 20;
          return [x, y];
        };
        
        // Convertir les coordonnées en path SVG
        const coordsToPath = (coords) => {
          if (!coords || coords.length === 0) return '';
          
          // Gérer les MultiPolygon et Polygon
          const rings = coords[0][0] && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0]) 
            ? coords.flat() // MultiPolygon
            : coords; // Polygon
          
          return rings.map(ring => {
            if (!Array.isArray(ring)) return '';
            return ring.map((coord, i) => {
              if (!Array.isArray(coord) || coord.length < 2) return '';
              const [x, y] = project(coord[0], coord[1]);
              return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            }).join(' ') + ' Z';
          }).join(' ');
        };
        
        // Calculer le centroïde
        const getCentroid = (coords) => {
          const rings = coords[0][0] && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])
            ? coords[0] // Premier polygone du MultiPolygon
            : coords;
          
          const ring = rings[0];
          if (!ring) return { x: 150, y: 170 };
          
          let sumX = 0, sumY = 0, count = 0;
          ring.forEach(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
              const [x, y] = project(coord[0], coord[1]);
              sumX += x;
              sumY += y;
              count++;
            }
          });
          
          return count > 0 ? { x: sumX / count, y: sumY / count } : { x: 150, y: 170 };
        };
        
        // Générer les paths pour chaque région
        const paths = {};
        geojson.features.forEach(feature => {
          const inseeCode = feature.properties.code;
          const ourCode = codeMapping[inseeCode];
          if (ourCode && feature.geometry && feature.geometry.coordinates) {
            paths[ourCode] = {
              path: coordsToPath(feature.geometry.coordinates),
              centroid: getCentroid(feature.geometry.coordinates),
              nom: feature.properties.nom
            };
          }
        });
        
        setMapPaths(paths);
        setLoading(false);
      } catch (error) {
        console.error('Erreur chargement GeoJSON:', error);
        setLoading(false);
      }
    };
    
    loadGeoJSON();
  }, []);
  
  // Couleurs pour les métriques
  const getColor = (region, metricType, isDark) => {
    const val = metricType === 'chomage' ? region.chomage :
                metricType === 'salaire' ? region.salaire_median :
                region.tensions;
    
    if (metricType === 'chomage') {
      if (val < 6.5) return isDark ? '#22c55e' : '#16a34a';
      if (val < 7.5) return isDark ? '#eab308' : '#ca8a04';
      if (val < 8.5) return isDark ? '#f97316' : '#ea580c';
      return isDark ? '#ef4444' : '#dc2626';
    } else if (metricType === 'salaire') {
      if (val >= 2200) return isDark ? '#22c55e' : '#16a34a';
      if (val >= 2050) return isDark ? '#3b82f6' : '#2563eb';
      if (val >= 1980) return isDark ? '#eab308' : '#ca8a04';
      return isDark ? '#f97316' : '#ea580c';
    } else {
      if (val >= 68) return isDark ? '#f97316' : '#ea580c';
      if (val >= 60) return isDark ? '#eab308' : '#ca8a04';
      return isDark ? '#3b82f6' : '#2563eb';
    }
  };
  
  const getMetricLabel = (type) => {
    switch(type) {
      case 'chomage': return 'Taux de chômage';
      case 'salaire': return 'Salaire médian';
      case 'tensions': return 'Tensions recrutement';
      default: return '';
    }
  };
  
  const getMetricValue = (region, type) => {
    switch(type) {
      case 'chomage': return `${region.chomage}%`;
      case 'salaire': return `${region.salaire_median}€`;
      case 'tensions': return `${region.tensions}%`;
      default: return '';
    }
  };
  
  const sortedByMetric = [...regions].sort((a, b) => {
    const va = metric === 'chomage' ? a.chomage : metric === 'salaire' ? a.salaire_median : a.tensions;
    const vb = metric === 'chomage' ? b.chomage : metric === 'salaire' ? b.salaire_median : b.tensions;
    return va - vb;
  });
  
  const displayRegion = selectedRegion || hoveredRegion;
  const getRegionByCode = (code) => regions.find(r => r.code === code);
  
  return (
    <div className="space-y-4">
      {/* Sous-navigation */}
      <div className="flex gap-2 flex-wrap">
        {[['carte', '🗺️ Carte régionale'], ['chaleur', '🌡️ Inégalités']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubMapTab(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              subMapTab === id
                ? 'bg-cyan-600 text-white shadow-lg'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* Vue Inégalités */}
      {subMapTab === 'chaleur' && <HeatmapRegionSecteur d={d} darkMode={darkMode} />}

      {/* Vue Carte régionale (existante) */}
      {subMapTab === 'carte' && <>

      {/* En-tête avec KPIs France */}
      <div className="grid grid-cols-3 gap-3">
        <div 
          className={`relative overflow-hidden text-center p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
            metric === 'chomage' 
              ? (darkMode ? 'bg-blue-600/40 ring-2 ring-blue-400' : 'bg-blue-100 ring-2 ring-blue-500') 
              : (darkMode ? 'bg-gray-800/60 hover:bg-gray-700/60' : 'bg-white/80 hover:bg-gray-50')
          } backdrop-blur-sm shadow-lg`}
          onClick={() => setMetric('chomage')}
        >
          <div className="absolute inset-0 opacity-10">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></div>
          </div>
          <div className={`relative text-3xl font-black ${
            metric === 'chomage' 
              ? (darkMode ? 'text-blue-300' : 'text-blue-700')
              : (darkMode ? 'text-gray-300' : 'text-gray-700')
          }`}>
            {france.taux_chomage}%
          </div>
          <div className={`relative text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Chômage France
          </div>
          {metric === 'chomage' && (
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${darkMode ? 'bg-blue-400' : 'bg-blue-600'}`}></div>
          )}
        </div>
        
        <div 
          className={`relative overflow-hidden text-center p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
            metric === 'salaire' 
              ? (darkMode ? 'bg-emerald-600/40 ring-2 ring-emerald-400' : 'bg-emerald-100 ring-2 ring-emerald-500') 
              : (darkMode ? 'bg-gray-800/60 hover:bg-gray-700/60' : 'bg-white/80 hover:bg-gray-50')
          } backdrop-blur-sm shadow-lg`}
          onClick={() => setMetric('salaire')}
        >
          <div className="absolute inset-0 opacity-10">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${darkMode ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
          </div>
          <div className={`relative text-3xl font-black ${
            metric === 'salaire' 
              ? (darkMode ? 'text-emerald-300' : 'text-emerald-700')
              : (darkMode ? 'text-gray-300' : 'text-gray-700')
          }`}>
            {france.salaire_median_net}€
          </div>
          <div className={`relative text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Salaire médian
          </div>
          {metric === 'salaire' && (
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${darkMode ? 'bg-emerald-400' : 'bg-emerald-600'}`}></div>
          )}
        </div>
        
        <div 
          className={`relative overflow-hidden text-center p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
            metric === 'tensions' 
              ? (darkMode ? 'bg-amber-600/40 ring-2 ring-amber-400' : 'bg-amber-100 ring-2 ring-amber-500') 
              : (darkMode ? 'bg-gray-800/60 hover:bg-gray-700/60' : 'bg-white/80 hover:bg-gray-50')
          } backdrop-blur-sm shadow-lg`}
          onClick={() => setMetric('tensions')}
        >
          <div className="absolute inset-0 opacity-10">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${darkMode ? 'bg-amber-400' : 'bg-amber-500'}`}></div>
          </div>
          <div className={`relative text-3xl font-black ${
            metric === 'tensions' 
              ? (darkMode ? 'text-amber-300' : 'text-amber-700')
              : (darkMode ? 'text-gray-300' : 'text-gray-700')
          }`}>
            {france.tensions_recrutement_pct}%
          </div>
          <div className={`relative text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Tensions recrutement
          </div>
          {metric === 'tensions' && (
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${darkMode ? 'bg-amber-400' : 'bg-amber-600'}`}></div>
          )}
        </div>
      </div>
      
      {/* Carte interactive + Détails région */}
      <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-800/80' : 'bg-white'} shadow-xl`}>
        <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <span className="text-xl">🗺️</span>
            <span>{getMetricLabel(metric)} par région</span>
          </h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Cliquez sur une région pour voir les détails
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row">
          {/* Carte SVG */}
          <div className="flex-1 p-4">
            <div className="relative w-full max-w-xl mx-auto">
              {loading ? (
                <div className={`flex items-center justify-center h-80 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p>Chargement de la carte...</p>
                  </div>
                </div>
              ) : (
              <svg 
                viewBox="0 0 300 340" 
                className="w-full h-auto"
                style={{ filter: darkMode ? 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' : 'drop-shadow(0 4px 20px rgba(0,0,0,0.15))' }}
              >
                {/* Définitions pour les effets */}
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
                  </filter>
                </defs>
                
                {/* Fond de la carte */}
                <rect 
                  x="0" y="0" width="300" height="340" 
                  fill={darkMode ? '#1f2937' : '#f8fafc'} 
                  rx="12"
                />
                
                {/* Mer/Océan autour de la France */}
                <rect 
                  x="5" y="5" width="290" height="330" 
                  fill={darkMode ? '#1e3a5f' : '#dbeafe'} 
                  rx="8"
                  opacity="0.3"
                />
                
                {/* Régions */}
                {mapPaths && Object.entries(mapPaths).map(([code, data]) => {
                  const region = getRegionByCode(code);
                  if (!region || !data.path) return null;
                  
                  const isSelected = selectedRegion?.code === code;
                  const isHovered = hoveredRegion?.code === code;
                  const color = getColor(region, metric, darkMode);
                  
                  return (
                    <g key={code}>
                      <path
                        d={data.path}
                        fill={color}
                        stroke={darkMode ? '#1f2937' : '#ffffff'}
                        strokeWidth={isSelected || isHovered ? 2 : 1}
                        filter={isSelected ? 'url(#glow)' : isHovered ? 'url(#shadow)' : 'none'}
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: (selectedRegion && !isSelected && !isHovered) ? 0.6 : 1
                        }}
                        onClick={() => setSelectedRegion(isSelected ? null : region)}
                        onMouseEnter={() => setHoveredRegion(region)}
                        onMouseLeave={() => setHoveredRegion(null)}
                      />
                      
                      {/* Valeur affichée sur la région */}
                      <text
                        x={data.centroid.x}
                        y={data.centroid.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize={code === 'IDF' || code === 'COR' ? '7' : '8'}
                        fontWeight="bold"
                        style={{ 
                          pointerEvents: 'none',
                          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                        }}
                      >
                        {getMetricValue(region, metric)}
                      </text>
                    </g>
                  );
                })}
                
                {/* Tooltip au survol */}
                {hoveredRegion && !selectedRegion && mapPaths?.[hoveredRegion.code] && (
                  <g>
                    <rect
                      x={(mapPaths[hoveredRegion.code]?.centroid?.x || 0) - 45}
                      y={(mapPaths[hoveredRegion.code]?.centroid?.y || 0) - 26}
                      width="90"
                      height="16"
                      rx="4"
                      fill={darkMode ? '#374151' : '#1f2937'}
                      opacity="0.95"
                    />
                    <text
                      x={mapPaths[hoveredRegion.code]?.centroid?.x || 0}
                      y={(mapPaths[hoveredRegion.code]?.centroid?.y || 0) - 15}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="7"
                      fontWeight="600"
                    >
                      {hoveredRegion.nom}
                    </text>
                  </g>
                )}
                
                {/* Titre de la carte */}
                <text
                  x="150"
                  y="332"
                  textAnchor="middle"
                  fill={darkMode ? '#6b7280' : '#9ca3af'}
                  fontSize="8"
                >
                  France métropolitaine
                </text>
              </svg>
              )}
            </div>
            
            {/* Légende */}
            <div className={`flex flex-wrap justify-center gap-3 mt-4 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {metric === 'chomage' && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#22c55e' : '#16a34a'}}></span> &lt;6.5%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#facc15' : '#ca8a04'}}></span> 6.5-7.5%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#f97316' : '#ea580c'}}></span> 7.5-8.5%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#ef4444' : '#dc2626'}}></span> &gt;8.5%
                  </span>
                </>
              )}
              {metric === 'salaire' && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#22c55e' : '#16a34a'}}></span> ≥2200€
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#3b82f6' : '#2563eb'}}></span> 2050-2200€
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#facc15' : '#ca8a04'}}></span> 1980-2050€
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#f97316' : '#ea580c'}}></span> &lt;1980€
                  </span>
                </>
              )}
              {metric === 'tensions' && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#3b82f6' : '#2563eb'}}></span> &lt;60%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#facc15' : '#ca8a04'}}></span> 60-68%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#f97316' : '#ea580c'}}></span> &gt;68%
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Panel détails */}
          <div className={`lg:w-80 p-4 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
            {displayRegion ? (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {displayRegion.nom}
                  </h4>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Population: {displayRegion.population}M habitants
                  </p>
                </div>
                
                {/* Métriques détaillées */}
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chômage</span>
                      <span className={`text-xl font-bold ${
                        displayRegion.chomage < 6.5 ? 'text-green-500' :
                        displayRegion.chomage < 7.5 ? 'text-yellow-500' :
                        displayRegion.chomage < 8.5 ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {displayRegion.chomage}%
                      </span>
                    </div>
                    <div className={`mt-2 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          displayRegion.chomage < 6.5 ? 'bg-green-500' :
                          displayRegion.chomage < 7.5 ? 'bg-yellow-500' :
                          displayRegion.chomage < 8.5 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(displayRegion.chomage / 12) * 100}%` }}
                      ></div>
                    </div>
                    <div className={`text-xs mt-1 ${displayRegion.evol_chomage > 0 ? 'text-red-400' : displayRegion.evol_chomage < 0 ? 'text-green-400' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                      {displayRegion.evol_chomage > 0 ? '↗' : displayRegion.evol_chomage < 0 ? '↘' : '→'} {displayRegion.evol_chomage > 0 ? '+' : ''}{displayRegion.evol_chomage} pts vs trim. préc.
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Salaire médian</span>
                      <span className={`text-xl font-bold ${
                        displayRegion.salaire_median >= 2200 ? 'text-green-500' :
                        displayRegion.salaire_median >= 2050 ? 'text-blue-500' :
                        displayRegion.salaire_median >= 1980 ? 'text-yellow-500' : 'text-orange-500'
                      }`}>
                        {displayRegion.salaire_median}€
                      </span>
                    </div>
                    <div className={`mt-2 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          displayRegion.salaire_median >= 2200 ? 'bg-green-500' :
                          displayRegion.salaire_median >= 2050 ? 'bg-blue-500' :
                          displayRegion.salaire_median >= 1980 ? 'bg-yellow-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${((displayRegion.salaire_median - 1800) / 800) * 100}%` }}
                      ></div>
                    </div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {displayRegion.salaire_median > france.salaire_median_net 
                        ? `+${displayRegion.salaire_median - france.salaire_median_net}€ vs France` 
                        : displayRegion.salaire_median < france.salaire_median_net 
                          ? `${displayRegion.salaire_median - france.salaire_median_net}€ vs France`
                          : '= moyenne France'}
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tensions recrutement</span>
                      <span className={`text-xl font-bold ${
                        displayRegion.tensions >= 68 ? 'text-orange-500' :
                        displayRegion.tensions >= 60 ? 'text-yellow-500' : 'text-blue-500'
                      }`}>
                        {displayRegion.tensions}%
                      </span>
                    </div>
                    <div className={`mt-2 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          displayRegion.tensions >= 68 ? 'bg-orange-500' :
                          displayRegion.tensions >= 60 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${displayRegion.tensions}%` }}
                      ></div>
                    </div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {displayRegion.tensions}% des recrutements difficiles
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux d'emploi</span>
                      <span className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        {displayRegion.emploi}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <div className="text-4xl mb-3">👆</div>
                <p className="text-sm">Sélectionnez une région sur la carte pour voir ses détails</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Classement horizontal */}
      <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-800/80' : 'bg-white'} shadow-xl p-4`}>
        <h3 className={`font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          📊 Classement {getMetricLabel(metric)}
        </h3>
        <div className="space-y-2">
          {sortedByMetric.map((region, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedByMetric.length - 1;
            const color = getColor(region, metric, darkMode);
            const val = metric === 'chomage' ? region.chomage : 
                       metric === 'salaire' ? region.salaire_median : region.tensions;
            const maxVal = metric === 'chomage' ? 10 : metric === 'salaire' ? 2600 : 75;
            const minVal = metric === 'chomage' ? 5 : metric === 'salaire' ? 1900 : 50;
            const width = ((val - minVal) / (maxVal - minVal)) * 100;
            
            return (
              <div 
                key={region.code}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${
                  darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                } ${selectedRegion?.code === region.code ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
                onClick={() => setSelectedRegion(selectedRegion?.code === region.code ? null : region)}
              >
                <div className={`w-6 text-center font-bold text-sm ${
                  (metric === 'chomage' && isFirst) || (metric !== 'chomage' && isLast) 
                    ? 'text-green-500' 
                    : (metric === 'chomage' && isLast) || (metric !== 'chomage' && isFirst)
                      ? 'text-red-500'
                      : (darkMode ? 'text-gray-500' : 'text-gray-400')
                }`}>
                  {index + 1}
                </div>
                <div className={`w-32 truncate text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {region.nom}
                </div>
                <div className="flex-1">
                  <div className={`h-6 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div 
                      className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, Math.max(10, width))}%`,
                        backgroundColor: color
                      }}
                    >
                      <span className="text-white text-xs font-bold drop-shadow">
                        {getMetricValue(region, metric)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* DROM-COM section */}
      {reg.dom && reg.dom.length > 0 && (
        <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-800/80' : 'bg-white'} shadow-xl`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50'}`}>
            <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <span className="text-xl">🌴</span>
              <span>Outre-Mer (DROM)</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-normal ${darkMode ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
                {reg.dom.length} territoires
              </span>
            </h3>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Guadeloupe • Martinique • Guyane • La Réunion • Mayotte
            </p>
          </div>

          {/* Bandeau comparatif métropole */}
          <div className={`px-4 py-2 ${darkMode ? 'bg-gray-900/40' : 'bg-gray-50'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className={`font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>🇫🇷 France métro :</span>
              <span className={darkMode ? 'text-blue-300' : 'text-blue-600'}>Chômage : <b>{france.taux_chomage}%</b></span>
              <span className={darkMode ? 'text-green-300' : 'text-green-600'}>Salaire médian : <b>{france.salaire_median_net}€</b></span>
              <span className={darkMode ? 'text-purple-300' : 'text-purple-600'}>Taux emploi : <b>{france.taux_emploi}%</b></span>
            </div>
          </div>

          {/* Cartes DROM */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {reg.dom.map((r, i) => {
              const chomageColor = r.chomage > 20 ? 'text-red-500' : r.chomage > 15 ? 'text-orange-500' : 'text-yellow-500';
              const chomageBarColor = r.chomage > 20 ? 'bg-red-500' : r.chomage > 15 ? 'bg-orange-500' : 'bg-yellow-500';
              const ecartSalaire = r.salaire_median - france.salaire_median_net;
              const ecartEmploi = (r.emploi - france.taux_emploi).toFixed(1);
              
              return (
                <div 
                  key={i} 
                  className={`rounded-2xl overflow-hidden border transition-all hover:scale-[1.02] hover:shadow-lg ${
                    darkMode ? 'bg-gray-900/60 border-gray-700 hover:border-cyan-700' : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100 hover:border-cyan-300'
                  }`}
                >
                  {/* En-tête territoire */}
                  <div className={`px-3 py-2 border-b ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white/60 border-cyan-100'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{r.emoji || '🌴'}</span>
                      <div>
                        <div className={`font-bold text-sm leading-tight ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{r.nom}</div>
                        <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{r.population}M hab.</div>
                      </div>
                    </div>
                  </div>

                  {/* Métriques */}
                  <div className="p-3 space-y-2">
                    {/* Chômage */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chômage</span>
                        <span className={`text-base font-black ${chomageColor}`}>{r.chomage}%</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div className={`h-full rounded-full ${chomageBarColor}`} style={{width: `${Math.min(100,(r.chomage/35)*100)}%`}}></div>
                      </div>
                      <div className={`text-[10px] mt-0.5 ${r.evol_chomage > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {r.evol_chomage > 0 ? '↗' : '↘'} {r.evol_chomage > 0 ? '+' : ''}{r.evol_chomage} pts vs trim. préc. · <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>+{(r.chomage - france.taux_chomage).toFixed(1)} pts vs métropole</span>
                      </div>
                    </div>

                    {/* Salaire médian */}
                    <div className={`flex justify-between items-center p-2 rounded-lg ${darkMode ? 'bg-gray-800/60' : 'bg-white/70'}`}>
                      <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Salaire médian</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${ecartSalaire >= 0 ? 'text-green-500' : 'text-orange-500'}`}>{r.salaire_median}€</span>
                        <div className={`text-[10px] ${ecartSalaire >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                          {ecartSalaire >= 0 ? '+' : ''}{ecartSalaire}€ vs métro
                        </div>
                      </div>
                    </div>

                    {/* Taux d'emploi */}
                    <div className={`flex justify-between items-center p-2 rounded-lg ${darkMode ? 'bg-gray-800/60' : 'bg-white/70'}`}>
                      <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux d'emploi</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{r.emploi}%</span>
                        <div className={`text-[10px] ${parseFloat(ecartEmploi) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {parseFloat(ecartEmploi) >= 0 ? '+' : ''}{ecartEmploi} pts vs métro
                        </div>
                      </div>
                    </div>

                    {/* Tensions recrutement */}
                    <div className={`flex justify-between items-center p-2 rounded-lg ${darkMode ? 'bg-gray-800/60' : 'bg-white/70'}`}>
                      <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tensions recruit.</span>
                      <span className={`text-sm font-bold ${r.tensions < 40 ? 'text-blue-500' : r.tensions < 55 ? 'text-yellow-500' : 'text-orange-500'}`}>{r.tensions}%</span>
                    </div>

                    {/* Note contextuelle */}
                    {r.note && (
                      <div className={`text-[10px] italic px-2 py-1.5 rounded-lg ${darkMode ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
                        💡 {r.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Note de bas */}
          <div className={`px-4 pb-3 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            📚 Sources : INSEE – Taux de chômage localisés (T3 2025), Estimations d'emploi localisées 2024
          </div>
        </div>
      )}
      
      <div className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        📚 Sources : INSEE (chômage T3 2025), INSEE (salaires 2024), DARES-BMO (tensions 2025)
      </div>
      </>}
    </div>
  );
}

// ==================== BARRE DE RECHERCHE HEADER ====================
function SearchBar({ d, darkMode, onNavigate }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = React.useRef(null);
  const containerRef = React.useRef(null);

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Index ──────────────────────────────────────────────────────────────────
  const index = React.useMemo(() => {
    if (!d) return [];
    const ic = d.indicateurs_cles || {};
    const items = [];
    const add = (label, valeur, onglet, keywords = [], sparkline = null) =>
      items.push({ label, valeur, onglet, keywords: [label.toLowerCase(), ...keywords], sparkline });

    add('Taux de chômage', `${ic.taux_chomage_actuel}%`, 'emploi', ['chomage','unemployment','bit'], d.sparklines?.chomage);
    add('Chômage des jeunes', `${ic.taux_chomage_jeunes}%`, 'emploi', ['jeunes','youth','15-24'], d.sparklines?.chomage);
    add('Taux emploi seniors', `${ic.taux_emploi_seniors}%`, 'emploi', ['seniors','55-64']);
    add('Inflation annuelle', `${ic.inflation_annuelle}%`, 'inflation', ['inflation','ipc','prix'], d.sparklines?.inflation);
    add('SMIC brut mensuel', `${ic.smic_brut}€`, 'simulateur', ['smic','minimum','smig'], d.sparklines?.smic);
    add('SMIC net mensuel', `${ic.smic_net}€`, 'simulateur', ['smic net','minimum net'], d.sparklines?.smic);
    add('Salaire médian', `${ic.salaire_median}€`, 'salaires', ['median','médian','rémunération']);
    add('Salaire moyen', `${ic.salaire_moyen}€`, 'salaires', ['moyen','rémunération moyenne']);
    add('Écart salarial H/F', `${ic.ecart_hf_eqtp}%`, 'salaires', ['inégalité','femmes','hommes','égalité','hf']);
    add('Difficultés recrutement', `${ic.difficultes_recrutement}%`, 'emploi', ['recrutement','tension','recruter']);
    add('IRL (glissement)', `+${ic.irl_glissement}%`, 'conditions_vie', ['irl','loyer','indice loyer']);
    add('Prix du gazole', `${ic.prix_gazole}€/L`, 'conditions_vie', ['gazole','diesel','carburant']);
    add('Taux effort locataires', `${ic.taux_effort_locataires}%`, 'conditions_vie', ['effort','logement','loyer']);
    add('Croissance PIB', `+${ic.croissance_pib}%`, 'conjoncture', ['pib','croissance','gdp']);
    add('Climat des affaires', `${ic.climat_affaires}`, 'conjoncture', ['climat','confiance','insee']);
    add('Défaillances entreprises', `${(ic.defaillances_12m/1000).toFixed(1)}k`, 'conjoncture', ['défaillances','faillites','liquidation']);

    const pva = d.partage_va || {};
    add('Part salaires dans la VA', `${pva.part_salaires_snf}%`, 'conjoncture', ['valeur ajoutée','va','partage']);
    add('Taux de marge EBE', `${pva.part_ebe_snf}%`, 'conjoncture', ['marge','ebe','profits','bénéfices']);

    (d.salaires_secteur || []).forEach(s =>
      add(`Salaire — ${s.secteur}`, `${s.salaire.toLocaleString('fr-FR')}€`, 'salaires',
        ['salaire', s.secteur.toLowerCase(), 'secteur']));

    (d.comparaison_ue?.smic_europe || []).forEach(p =>
      add(`SMIC ${p.pays}`, `${p.smic.toLocaleString('fr-FR')}€`, 'comparaison_ue',
        ['europe','ue', p.pays.toLowerCase(), 'smic europe']));

    const cc = d.conventions_collectives || {};
    add('Branches non conformes SMIC',
      `${cc.statistiques_branches?.branches_non_conformes}/${cc.statistiques_branches?.total_branches}`,
      'conventions', ['convention','branche','smic','conformité','minima']);
    (cc.branches || []).forEach(b =>
      add(`CCN — ${b.nom}`, b.statut === 'conforme' ? '✅' : '❌', 'conventions',
        ['convention','ccn', b.nom.toLowerCase(), `idcc ${b.idcc}`]));

    const carb = d.carburants || {};
    if (carb.sp95) add('SP95', `${carb.sp95.prix}€/L`, 'conditions_vie', ['sp95','essence','carburant']);
    add('PPV (montant moyen)', `${(d.ppv||{}).montant_moyen}€`, 'salaires', ['ppv','prime macron','partage valeur']);

    return items;
  }, [d]);

  // ── Recherche fuzzy ────────────────────────────────────────────────────────
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return [];
    return index.map(item => {
      const hay = item.keywords.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const lab = item.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let score = 0;
      if (lab.startsWith(q)) score = 100;
      else if (lab.includes(q)) score = 60;
      else if (hay.includes(q)) score = 30;
      else if (q.split(' ').filter(Boolean).every(w => hay.includes(w))) score = 10;
      return { ...item, score };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
  }, [query, index]);

  useEffect(() => { setSelected(0); }, [results]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, results.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)); }
    if (e.key === 'Enter' && results[selected]) { onNavigate(results[selected].onglet); setOpen(false); setQuery(''); }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
  };

  const LABELS = {
    conjoncture:'📈 Conjoncture', previsions:'🔮 Prévisions', evolutions:'📉 Évolutions',
    pouvoir_achat:"💰 Pouvoir d'achat", salaires:'💵 Salaires', emploi:'👥 Emploi',
    travail:'⚙️ Travail', territoires:'🗺️ Territoires', conditions_vie:'🏠 Conditions',
    inflation:'📊 Inflation', conventions:'📋 Conventions', comparaison_ue:'🇪🇺 Europe',
    simulateur:'🧮 Simulateur',
  };

  // Sparkline SVG
  const Spark = ({ data, active }) => {
    if (!data || data.length < 2) return null;
    const vals = data.map(v => typeof v === 'object' ? v.value : v);
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const w = 44, h = 16, p = 1;
    const pts = vals.map((v, i) => {
      const x = p + (i/(vals.length-1))*(w-2*p);
      const y = h - p - ((v-min)/range)*(h-2*p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const color = active ? '#60a5fa' : '#6b7280';
    return (
      <svg width={w} height={h}>
        <polyline fill="none" stroke={color} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" points={pts} />
      </svg>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
        open
          ? darkMode ? 'bg-white/20 ring-2 ring-white/30' : 'bg-white/30 ring-2 ring-white/50'
          : darkMode ? 'bg-white/10 hover:bg-white/15' : 'bg-white/20 hover:bg-white/25'
      }`}>
        <span className="text-white/70 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Rechercher..."
          className="bg-transparent outline-none text-white placeholder-white/50 text-xs w-32 sm:w-44"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }}
            className="text-white/50 hover:text-white text-sm leading-none">✕</button>
        )}
      </div>

      {/* Dropdown résultats */}
      {open && results.length > 0 && (
        <div className={`absolute top-full mt-2 right-0 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden z-50 ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          {results.map((r, i) => (
            <button key={i}
              onClick={() => { onNavigate(r.onglet); setOpen(false); setQuery(''); }}
              onMouseEnter={() => setSelected(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selected
                  ? darkMode ? 'bg-blue-900/60' : 'bg-blue-50'
                  : darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
              } ${i > 0 ? (darkMode ? 'border-t border-gray-800' : 'border-t border-gray-100') : ''}`}>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {r.label}
                  </span>
                  <span className={`text-sm font-black shrink-0 ${
                    i === selected ? (darkMode ? 'text-blue-300' : 'text-blue-600') : (darkMode ? 'text-white' : 'text-gray-900')
                  }`}>
                    {r.valeur}
                  </span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 inline-block ${
                  darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                }`}>
                  {LABELS[r.onglet] || r.onglet}
                </span>
              </div>

              {r.sparkline && <Spark data={r.sparkline} active={i === selected} />}
            </button>
          ))}

          <div className={`px-4 py-1.5 text-[10px] flex justify-between ${
            darkMode ? 'border-t border-gray-800 text-gray-600' : 'border-t border-gray-100 text-gray-400'
          }`}>
            <span>↑↓ naviguer · ↵ ouvrir</span>
            <span>{index.length} indicateurs</span>
          </div>
        </div>
      )}
    </div>
  );
}


// ==================== CONTENU PANNEAU PRESSE ====================
function PanneauPresseContenu({ rp, darkMode }) {
  const [filtre, setFiltre] = useState('tous');
  const [sourceFiltre, setSourceFiltre] = useState('Toutes');

  const sources = ['Toutes', ...(rp.sources_noms || [])];
  const articles = filtre === 'une' ? (rp.a_la_une || []) : (rp.tous || []);
  const articlesFiltres = articles.filter(a =>
    sourceFiltre === 'Toutes' || a.source === sourceFiltre
  );

  return (
    <>
      {/* Filtres */}
      <div className="flex gap-1.5 flex-wrap">
        {[['une','⭐ À la une'],['tous','📋 Tous']].map(([id, label]) => (
          <button key={id} onClick={() => setFiltre(id)}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
              filtre === id
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
        <select value={sourceFiltre} onChange={e => setSourceFiltre(e.target.value)}
          className={`ml-auto px-2 py-1 rounded-xl text-xs border ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}>
          {sources.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Articles */}
      {articlesFiltres.length === 0 ? (
        <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Aucun article disponible
        </div>
      ) : articlesFiltres.map((a, i) => (
        <a key={i} href={a.lien} target="_blank" rel="noopener noreferrer"
          className={`flex gap-3 p-3.5 rounded-2xl border transition-all hover:shadow-md group ${
            darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
          <div className="w-1 shrink-0 rounded-full self-stretch" style={{ backgroundColor: a.couleur }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-sm">{a.emoji}</span>
              <span className="text-[11px] font-bold" style={{ color: a.couleur }}>{a.source}</span>
              <span className={`text-[10px] ml-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{a.date_fr}</span>
            </div>
            <p className={`text-xs font-semibold leading-snug mb-1 group-hover:underline ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              {a.titre}
            </p>
            {a.resume && (
              <p className={`text-[11px] leading-relaxed line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {a.resume}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className={`w-1.5 h-1.5 rounded-full ${
                    j < Math.ceil(a.pertinence / 2) ? 'bg-blue-500' : darkMode ? 'bg-gray-600' : 'bg-gray-200'
                  }`} />
                ))}
              </div>
              <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>pertinence NAO</span>
              <span className={`text-[10px] ml-auto ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}>Lire →</span>
            </div>
          </div>
        </a>
      ))}

      <p className={`text-[10px] text-center pb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        📡 Flux RSS officiels · {rp.nb_sources} sources · {rp.tous?.length || 0} articles
      </p>
    </>
  );
}

// ==================== HEATMAP RÉGION × SECTEUR ====================
function HeatmapRegionSecteur({ d, darkMode }) {

  const [metrique, setMetrique] = React.useState('precarite');
  const [cellActive, setCellActive] = React.useState(null);
  const [regionFocus, setRegionFocus] = React.useState(null);
  const [secteurFocus, setSecteurFocus] = React.useState(null);

  const regions = d.donnees_regionales?.regions ?? [];
  const SMIC_NET = d.indicateurs_cles?.smic_net ?? 1443;
  const INFLATION_CUM = 15.9;

  const secteursBase = d.salaires_secteur ?? [];
  const emploiSecteurs = d.emploi_secteur?.secteurs ?? [];
  const vaParSecteur = d.partage_va?.par_secteur ?? [];
  const defaillancesParSecteur = d.defaillances?.par_secteur ?? [];

  const matchEmploi = (nom) => {
    if (nom.includes('Industrie'))    return emploiSecteurs.find(e => e.secteur === 'Industrie');
    if (nom.includes('Construction')) return emploiSecteurs.find(e => e.secteur === 'Construction');
    return emploiSecteurs.find(e => e.secteur === 'Tertiaire marchand');
  };
  const matchVA = (nom) => {
    if (nom.includes('Industrie'))    return vaParSecteur.find(v => v.secteur === 'Industrie');
    if (nom.includes('Construction')) return vaParSecteur.find(v => v.secteur === 'Construction');
    if (nom.includes('Info'))         return vaParSecteur.find(v => v.secteur === 'Info-comm');
    if (nom.includes('financier'))    return vaParSecteur.find(v => v.secteur === 'Services march.');
    return vaParSecteur.find(v => v.secteur === 'Commerce');
  };
  const matchDef = (nom) => {
    if (nom.includes('Industrie'))    return defaillancesParSecteur.find(v => v.secteur === 'Industrie');
    if (nom.includes('Construction')) return defaillancesParSecteur.find(v => v.secteur === 'Construction');
    if (nom.includes('Héberg'))       return defaillancesParSecteur.find(v => v.secteur === 'Héberg-resto');
    return defaillancesParSecteur.find(v => v.secteur === 'Services');
  };

  const secteurs = secteursBase.map(s => ({
    nom: s.secteur, salaire: s.salaire, evolSal: s.evolution,
    evolEmploi: matchEmploi(s.secteur)?.evolution_an ?? null,
    partSalVA:  matchVA(s.secteur)?.salaires ?? null,
    ebe:        matchVA(s.secteur)?.ebe ?? null,
    defEvol:    matchDef(s.secteur)?.evolution ?? null,
  }));

  const metriques = [
    {
      id: 'precarite', label: '🔴 Risque précarité',
      desc: 'Combine chômage régional élevé et salaire sectoriel bas — identifie les situations cumulant les difficultés.',
      score: (r, s) => {
        const chomNorm = (r.chomage - 5.8) / (9.2 - 5.8);
        const salNorm  = 1 - (s.salaire - 1979) / (4123 - 1979);
        return chomNorm * 0.55 + salNorm * 0.45;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Faible', '30–55 Modéré', '55–75 Élevé', '> 75 Critique'],
    },
    {
      id: 'pouvoir_achat', label: '💰 Pression pouvoir d\'achat',
      desc: `Salaire sectoriel rapporté à l'inflation cumulée ${INFLATION_CUM}% depuis 2020 et au SMIC. Plus c'est rouge, plus le salarié est sous pression.`,
      score: (r, s) => {
        const proxSmic  = Math.max(0, Math.min(1, 1 - (s.salaire - SMIC_NET) / (4123 - SMIC_NET)));
        const chomFaible = 1 - (r.chomage - 5.8) / (9.2 - 5.8);
        return proxSmic * 0.7 + chomFaible * 0.3;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Confortable', '30–55 Tendu', '55–75 Sous pression', '> 75 Critique'],
    },
    {
      id: 'levier_nego', label: '🎯 Levier de négociation',
      desc: 'Tensions de recrutement × taux de marge EBE — zones où l\'employeur a les moyens d\'augmenter ET en a besoin pour recruter.',
      invertColor: true,
      score: (r, s) => {
        const tensionsNorm = (r.tensions - 52) / (72 - 52);
        const ebeNorm      = s.ebe != null ? (s.ebe - 22) / (38 - 22) : 0.5;
        return tensionsNorm * 0.5 + ebeNorm * 0.5;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Faible levier', '30–55 Modéré', '55–75 Bon levier', '> 75 Fort levier'],
    },
    {
      id: 'fragilite_eco', label: '⚠️ Fragilité économique',
      desc: 'Chômage régional + emploi en recul sectoriel + défaillances en hausse — zones à risque de licenciements.',
      score: (r, s) => {
        const chomNorm   = (r.chomage - 5.8) / (9.2 - 5.8);
        const evolEmploi = s.evolEmploi != null ? Math.max(0, -s.evolEmploi) / 3 : 0.3;
        const defScore   = s.defEvol != null ? Math.min(1, s.defEvol / 15) : 0.3;
        return chomNorm * 0.4 + evolEmploi * 0.35 + defScore * 0.25;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Stable', '30–55 Vigilance', '55–75 Fragile', '> 75 Très fragile'],
    },
  ];

  const metriqueActive = metriques.find(m => m.id === metrique);

  const scoreToColor = (score, invert = false, alpha = 0.88) => {
    const palettes = [
      [[34,197,94],[234,179,8],[249,115,22],[239,68,68]],
      [[239,68,68],[249,115,22],[234,179,8],[34,197,94]],
    ];
    const pal = invert ? palettes[1] : palettes[0];
    const idx = score < 0.35 ? 0 : score < 0.6 ? 1 : score < 0.8 ? 2 : 3;
    const [r, g, b] = pal[idx];
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const scoreToLabel = (score, invert = false) => {
    const eff = invert ? 1 - score : score;
    if (eff < 0.35) return { txt: 'Faible',   emoji: '🟢' };
    if (eff < 0.6)  return { txt: 'Modéré',   emoji: '🟡' };
    if (eff < 0.8)  return { txt: 'Élevé',    emoji: '🟠' };
    return                  { txt: 'Critique', emoji: '🔴' };
  };

  const matrice = regions.map(r => secteurs.map(s => metriqueActive.score(r, s)));
  const moyRegion  = regions.map((_, ri) => matrice[ri].reduce((a, b) => a + b, 0) / secteurs.length);
  const moySecteur = secteurs.map((_, si) => matrice.reduce((sum, row) => sum + row[si], 0) / regions.length);
  const regionsTriees = [...regions].map((r, ri) => ({ ...r, _ri: ri, moy: moyRegion[ri] })).sort((a, b) => b.moy - a.moy);

  const cellInfo = cellActive != null ? (() => {
    const { ri, si } = cellActive;
    const r = regions[ri], s = secteurs[si];
    const score = matrice[ri][si];
    const label = scoreToLabel(score, metriqueActive.invertColor);
    const args = [];
    if (metrique === 'precarite') {
      args.push(`Chômage de ${r.chomage}% dans ${r.nom} — parmi les ${r.chomage > 7.5 ? 'plus élevés' : 'plus faibles'} de France`);
      args.push(`Salaire médian de ${s.salaire.toLocaleString('fr-FR')}€ dans ${s.nom} — seulement +${s.salaire - SMIC_NET}€ au-dessus du SMIC net`);
      if (r.chomage > 7.5 && s.salaire < 2500) args.push(`Situation cumulée : insécurité de l'emploi ET salaires bas → priorité syndicale`);
    } else if (metrique === 'pouvoir_achat') {
      args.push(`Avec ${INFLATION_CUM}% d'inflation cumulée depuis 2020, un salaire de ${s.salaire.toLocaleString('fr-FR')}€ perd réellement en pouvoir d'achat`);
      args.push(`Marge au-dessus du SMIC net : +${s.salaire - SMIC_NET}€ — ${s.salaire - SMIC_NET < 400 ? 'très faible, argument fort pour revalorisation' : 'marge existante mais insuffisante'}`);
    } else if (metrique === 'levier_nego') {
      args.push(`Tensions de recrutement : ${r.tensions}% dans ${r.nom} — l'employeur a besoin de fidéliser`);
      if (s.ebe) args.push(`Taux de marge EBE : ${s.ebe}% de la VA — les marges existent pour augmenter les salaires`);
      args.push(`Argument clé : "Vous ne trouvez pas à recruter à ces salaires, c'est le marché qui parle"`);
    } else if (metrique === 'fragilite_eco') {
      args.push(`Chômage régional : ${r.chomage}% — ${r.chomage > 8 ? 'contexte difficile, vigilance sur les emplois' : 'marché relativement sain'}`);
      if (s.evolEmploi != null) args.push(`Emploi sectoriel : ${s.evolEmploi >= 0 ? '+' : ''}${s.evolEmploi}%/an — ${s.evolEmploi < 0 ? 'recul préoccupant' : 'dynamique positive'}`);
      if (s.defEvol != null) args.push(`Défaillances dans ce secteur : +${s.defEvol}% — ${s.defEvol > 8 ? 'signal d\'alarme' : 'évolution contenue'}`);
    }
    return { r, s, score, label, args };
  })() : null;

  return (
    <div className="space-y-5 mt-2">

      {/* Sélecteur de métrique */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {metriques.map(m => (
          <button key={m.id} onClick={() => { setMetrique(m.id); setCellActive(null); }}
            className={`text-left p-3 rounded-2xl border text-xs transition-all duration-200 ${
              metrique === m.id
                ? 'ring-2 ring-rose-500 ' + (darkMode ? 'bg-rose-900/40 border-rose-700 text-white' : 'bg-rose-50 border-rose-300 text-rose-900')
                : darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}>
            <div className="font-semibold mb-0.5">{m.label}</div>
            <div className={`leading-tight ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} style={{fontSize:'10px'}}>
              {m.desc.slice(0, 62)}…
            </div>
          </button>
        ))}
      </div>

      {/* Description + légende */}
      <div className={`p-3 rounded-xl text-xs ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
        <strong>{metriqueActive.label} :</strong> {metriqueActive.desc}
      </div>
      <div className="flex flex-wrap gap-3 items-center text-xs">
        <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Légende :</span>
        {metriqueActive.legende.map((l, i) => {
          const scores = [0.15, 0.47, 0.68, 0.9];
          return (
            <span key={i} className="flex items-center gap-1 font-medium" style={{color: scoreToColor(scores[i], metriqueActive.invertColor, 1)}}>
              <span className="w-3 h-3 rounded" style={{backgroundColor: scoreToColor(scores[i], metriqueActive.invertColor, 0.85)}}></span>
              {l}
            </span>
          );
        })}
        <span className={`ml-auto italic ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} style={{fontSize:'10px'}}>
          Cliquez sur une cellule pour les arguments de négociation
        </span>
      </div>

      {/* Heatmap */}
      <div className={`rounded-2xl overflow-hidden shadow-xl ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{minWidth:560}}>
            <thead>
              <tr>
                <th className={`sticky left-0 z-20 p-3 text-left border-b border-r text-xs font-semibold ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  Région ↓ / Secteur →
                </th>
                {secteurs.map((s, si) => (
                  <th key={si}
                    onClick={() => setSecteurFocus(secteurFocus === si ? null : si)}
                    className={`p-2 text-center border-b cursor-pointer transition-colors ${
                      secteurFocus === si
                        ? darkMode ? 'bg-indigo-900/50 border-indigo-700' : 'bg-indigo-50 border-indigo-300'
                        : darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className={`text-[10px] font-semibold leading-tight ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {s.nom.length > 12 ? s.nom.slice(0,11)+'…' : s.nom}
                    </div>
                    <div className={`text-[9px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {s.salaire.toLocaleString('fr-FR')}€
                    </div>
                    <div className="mt-1 mx-auto h-1.5 rounded-full overflow-hidden w-10" style={{backgroundColor: darkMode ? '#374151' : '#e5e7eb'}}>
                      <div className="h-full rounded-full" style={{width:`${moySecteur[si]*100}%`, backgroundColor: scoreToColor(moySecteur[si], metriqueActive.invertColor, 1)}}/>
                    </div>
                  </th>
                ))}
                <th className={`p-2 text-center border-b border-l text-[10px] font-semibold ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  Score moy.
                </th>
              </tr>
            </thead>
            <tbody>
              {regionsTriees.map(({ _ri: ri, ...region }, rowIdx) => {
                const isRegFocus = regionFocus === ri;
                const rowBg = darkMode
                  ? isRegFocus ? 'bg-indigo-900/30' : rowIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/40'
                  : isRegFocus ? 'bg-indigo-50' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
                return (
                  <tr key={ri} className={`${rowBg} transition-colors`}>
                    <td
                      onClick={() => setRegionFocus(regionFocus === ri ? null : ri)}
                      className={`sticky left-0 z-10 p-2 border-r cursor-pointer ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${rowBg}`}>
                      <div className={`text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {region.nom.length > 20 ? region.nom.slice(0,19)+'…' : region.nom}
                      </div>
                      <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Chôm. {region.chomage}% · {region.salaire_median?.toLocaleString('fr-FR')}€
                      </div>
                    </td>
                    {secteurs.map((s, si) => {
                      const score = matrice[ri][si];
                      const isActive = cellActive?.ri === ri && cellActive?.si === si;
                      const isFaded  = (regionFocus != null && regionFocus !== ri) || (secteurFocus != null && secteurFocus !== si);
                      return (
                        <td key={si} className="p-1">
                          <div
                            onClick={() => setCellActive(isActive ? null : { ri, si })}
                            className={`flex items-center justify-center rounded-xl cursor-pointer font-bold text-white transition-all duration-150 select-none ${
                              isActive ? 'ring-2 ring-white ring-offset-1 scale-110 z-10 relative shadow-lg' : 'hover:scale-105'
                            } ${isFaded ? 'opacity-25' : ''}`}
                            style={{height:44, backgroundColor: scoreToColor(score, metriqueActive.invertColor), fontSize:11}}>
                            {metriqueActive.format(score)}
                          </div>
                        </td>
                      );
                    })}
                    <td className={`p-1 border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="mx-auto rounded-xl flex items-center justify-center font-bold text-white text-xs"
                        style={{height:44, width:52, backgroundColor: scoreToColor(moyRegion[ri], metriqueActive.invertColor, 0.75)}}>
                        {(moyRegion[ri]*100).toFixed(0)}
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className={`border-t ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'}`}>
                <td className={`sticky left-0 z-10 p-2 text-xs font-semibold ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  Moy. secteur
                </td>
                {secteurs.map((_, si) => (
                  <td key={si} className="p-1">
                    <div className="mx-auto rounded-xl flex items-center justify-center font-bold text-white text-xs"
                      style={{height:32, backgroundColor: scoreToColor(moySecteur[si], metriqueActive.invertColor, 0.65)}}>
                      {(moySecteur[si]*100).toFixed(0)}
                    </div>
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Panneau détail cellule */}
      {cellInfo && (
        <div className={`rounded-2xl p-5 border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} shadow-xl`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className={`font-black text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {cellInfo.r.nom} <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>×</span> {cellInfo.s.nom}
              </h4>
              <p className="text-sm mt-0.5" style={{color: scoreToColor(cellInfo.score, metriqueActive.invertColor, 1)}}>
                {cellInfo.label.emoji} {cellInfo.label.txt} — Score {metriqueActive.format(cellInfo.score)}
              </p>
            </div>
            <button onClick={() => setCellActive(null)}
              className={`p-2 rounded-xl text-lg leading-none ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>✕</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Chômage',        val: `${cellInfo.r.chomage}%`,                              icon: '📉' },
              { label: 'Salaire sect.',  val: `${cellInfo.s.salaire.toLocaleString('fr-FR')}€`,     icon: '💰' },
              { label: 'Tensions recrut.', val: `${cellInfo.r.tensions}%`,                           icon: '🎯' },
              { label: 'Taux marge EBE', val: cellInfo.s.ebe != null ? `${cellInfo.s.ebe}%` : '—', icon: '📊' },
            ].map((kpi, i) => (
              <div key={i} className={`p-3 rounded-xl text-center ${darkMode ? 'bg-gray-700/60' : 'bg-gray-100'}`}>
                <div className="text-lg">{kpi.icon}</div>
                <div className={`text-sm font-bold mt-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{kpi.val}</div>
                <div className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{kpi.label}</div>
              </div>
            ))}
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              💬 Arguments pour la négociation — {cellInfo.r.nom} / {cellInfo.s.nom}
            </p>
            <ul className={`text-xs space-y-2 ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
              {cellInfo.args.map((arg, i) => (
                <li key={i} className="flex gap-2"><span className="shrink-0 opacity-60">▸</span><span>{arg}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Top 5 priorités */}
      <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h4 className={`font-bold text-sm mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          🔴 Top 5 situations à traiter en priorité
        </h4>
        <div className="space-y-2">
          {(() => {
            const all = [];
            regions.forEach((r, ri) => secteurs.forEach((s, si) => { all.push({ r, s, score: matrice[ri][si] }); }));
            return all.sort((a, b) => b.score - a.score).slice(0, 5).map((item, i) => (
              <div key={i} className={`flex items-center justify-between gap-3 p-2.5 rounded-xl text-xs ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{backgroundColor: scoreToColor(item.score, metriqueActive.invertColor)}}>
                    {i+1}
                  </span>
                  <span className={`font-semibold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.r.nom}</span>
                  <span className={`shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>×</span>
                  <span className={`truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.s.nom}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`hidden sm:inline ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chôm. {item.r.chomage}% · {item.s.salaire.toLocaleString('fr-FR')}€
                  </span>
                  <span className="font-bold px-2 py-0.5 rounded-lg text-white text-[11px]"
                    style={{backgroundColor: scoreToColor(item.score, metriqueActive.invertColor)}}>
                    {metriqueActive.format(item.score)}
                  </span>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Guide formateur */}
      <div className={`p-4 rounded-xl text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
        <strong className={darkMode ? 'text-gray-300' : 'text-gray-700'}>🎓 Guide formateur :</strong>
        {' '}Commencez par <em>Risque précarité</em> pour une vue d'ensemble. Utilisez <em>Levier de négociation</em> pour cibler où l'employeur a les moyens d'augmenter. Cliquez sur une région ou un secteur pour filtrer. Cliquez sur une cellule pour les arguments prêts à l'emploi.
      </div>

      <p className={`text-xs text-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        📚 Sources : INSEE (chômage, salaires T3 2025) · DARES-BMO (tensions 2025) · Banque de France (défaillances) · INSEE comptes nationaux (partage VA)
      </p>
    </div>
  );
}

// ==================== ONGLET GLOBE ÉCONOMIQUE ====================
function GlobeTab({ darkMode }) {
  const canvasRef = React.useRef(null);
  const [indicateur, setIndicateur] = React.useState('chomage');
  const [pays, setPays] = React.useState(null);
  const [rotation, setRotation] = React.useState([0, 0]);
  const [geoData, setGeoData] = React.useState(null);
  const isDragging = React.useRef(false);
  const lastPos = React.useRef([0, 0]);
  const rotRef = React.useRef([0, 0]);
  const velRef = React.useRef([0, 0]);
  const rafRef = React.useRef(null);
  const dRef = React.useRef(null);
  const projRef = React.useRef(null);

  const PAYS_DATA = {
    'France':{'iso':'FRA',chomage:7.7,inflation:0.9,pib:1.1,smic:1802,gini:31.5},
    'Germany':{'iso':'DEU',chomage:3.4,inflation:2.2,pib:-0.2,smic:2054,gini:31.7},
    'Spain':{'iso':'ESP',chomage:11.6,inflation:2.8,pib:3.2,smic:1323,gini:33.0},
    'Italy':{'iso':'ITA',chomage:6.2,inflation:1.1,pib:0.7,smic:null,gini:34.8},
    'Netherlands':{'iso':'NLD',chomage:3.7,inflation:2.7,pib:0.9,smic:2070,gini:28.2},
    'Belgium':{'iso':'BEL',chomage:5.5,inflation:3.1,pib:1.4,smic:2070,gini:27.2},
    'Sweden':{'iso':'SWE',chomage:8.5,inflation:1.7,pib:0.5,smic:null,gini:27.6},
    'Poland':{'iso':'POL',chomage:2.9,inflation:4.7,pib:2.9,smic:925,gini:30.2},
    'Portugal':{'iso':'PRT',chomage:6.4,inflation:2.3,pib:2.1,smic:1020,gini:33.5},
    'Greece':{'iso':'GRC',chomage:11.0,inflation:3.0,pib:2.3,smic:910,gini:32.9},
    'Austria':{'iso':'AUT',chomage:5.3,inflation:2.9,pib:-1.0,smic:null,gini:30.8},
    'Switzerland':{'iso':'CHE',chomage:2.6,inflation:1.1,pib:1.3,smic:null,gini:33.5},
    'Norway':{'iso':'NOR',chomage:3.9,inflation:3.1,pib:0.8,smic:null,gini:26.1},
    'Denmark':{'iso':'DNK',chomage:2.6,inflation:2.4,pib:1.5,smic:null,gini:28.3},
    'Finland':{'iso':'FIN',chomage:7.5,inflation:0.5,pib:-1.0,smic:null,gini:27.7},
    'Romania':{'iso':'ROU',chomage:5.6,inflation:5.6,pib:2.0,smic:760,gini:34.8},
    'Hungary':{'iso':'HUN',chomage:4.1,inflation:3.7,pib:0.6,smic:701,gini:28.0},
    'Czechia':{'iso':'CZE',chomage:2.6,inflation:2.0,pib:1.2,smic:870,gini:25.3},
    'United States of America':{'iso':'USA',chomage:4.1,inflation:2.9,pib:2.8,smic:1160,gini:41.5},
    'Canada':{'iso':'CAN',chomage:6.8,inflation:1.8,pib:1.3,smic:1580,gini:33.3},
    'Brazil':{'iso':'BRA',chomage:6.2,inflation:4.8,pib:3.1,smic:325,gini:52.0},
    'Mexico':{'iso':'MEX',chomage:2.8,inflation:4.2,pib:1.5,smic:270,gini:45.4},
    'Argentina':{'iso':'ARG',chomage:7.0,inflation:118.0,pib:-1.7,smic:320,gini:42.0},
    'Chile':{'iso':'CHL',chomage:8.6,inflation:4.5,pib:2.3,smic:540,gini:44.9},
    'Colombia':{'iso':'COL',chomage:9.5,inflation:5.2,pib:1.7,smic:310,gini:54.8},
    'China':{'iso':'CHN',chomage:5.0,inflation:0.3,pib:5.0,smic:360,gini:38.2},
    'Japan':{'iso':'JPN',chomage:2.5,inflation:2.8,pib:0.1,smic:1020,gini:32.9},
    'South Korea':{'iso':'KOR',chomage:3.0,inflation:2.3,pib:2.1,smic:1480,gini:31.4},
    'India':{'iso':'IND',chomage:7.8,inflation:4.9,pib:6.8,smic:120,gini:35.7},
    'Indonesia':{'iso':'IDN',chomage:4.8,inflation:2.8,pib:5.1,smic:230,gini:38.2},
    'Turkey':{'iso':'TUR',chomage:8.5,inflation:47.0,pib:3.2,smic:630,gini:41.9},
    'Vietnam':{'iso':'VNM',chomage:2.1,inflation:3.6,pib:7.1,smic:200,gini:36.1},
    'Thailand':{'iso':'THA',chomage:1.1,inflation:0.4,pib:2.7,smic:310,gini:36.4},
    'South Africa':{'iso':'ZAF',chomage:33.5,inflation:4.4,pib:0.8,smic:310,gini:63.0},
    'Nigeria':{'iso':'NGA',chomage:5.0,inflation:28.0,pib:3.2,smic:55,gini:35.1},
    'Morocco':{'iso':'MAR',chomage:13.0,inflation:0.9,pib:3.6,smic:310,gini:39.5},
    'Egypt':{'iso':'EGY',chomage:6.7,inflation:26.0,pib:4.2,smic:115,gini:31.5},
    'Australia':{'iso':'AUS',chomage:4.0,inflation:2.4,pib:1.5,smic:2070,gini:34.3},
    'New Zealand':{'iso':'NZL',chomage:4.7,inflation:2.2,pib:0.5,smic:1790,gini:33.9},
    'Russia':{'iso':'RUS',chomage:2.4,inflation:8.5,pib:3.6,smic:220,gini:36.0},
    'Ukraine':{'iso':'UKR',chomage:18.0,inflation:12.0,pib:4.5,smic:210,gini:26.6},
    'Saudi Arabia':{'iso':'SAU',chomage:7.7,inflation:1.5,pib:0.8,smic:null,gini:null},
  };

  const INDICATEURS = [
    {id:'chomage',  label:'Taux de chômage (%)',    unite:'%',  lowGood:true,  pal:['#22c55e','#86efac','#fde68a','#f97316','#dc2626']},
    {id:'inflation',label:'Inflation (%)',           unite:'%',  lowGood:true,  pal:['#22c55e','#86efac','#fde68a','#f97316','#dc2626']},
    {id:'pib',      label:'Croissance PIB (%)',      unite:'%',  lowGood:false, pal:['#dc2626','#f97316','#fde68a','#86efac','#22c55e']},
    {id:'smic',     label:'Salaire minimum (€)',     unite:'€',  lowGood:false, pal:['#dc2626','#f97316','#fde68a','#86efac','#22c55e']},
    {id:'gini',     label:'Inégalités (Gini)',       unite:'',   lowGood:true,  pal:['#22c55e','#86efac','#fde68a','#f97316','#dc2626']},
  ];
  const indDef = INDICATEURS.find(i => i.id === indicateur);

  const getColor = React.useCallback((val, indId) => {
    if (val === null || val === undefined) return darkMode ? '#374151' : '#d1d5db';
    const def = INDICATEURS.find(i => i.id === indId);
    const vals = Object.values(PAYS_DATA).map(p => p[indId]).filter(v => v != null);
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const t = Math.max(0, Math.min(1, (val - min) / range));
    const p = def.pal;
    const idx = t * (p.length - 1);
    const i0 = Math.floor(idx), i1 = Math.min(i0+1, p.length-1);
    const frac = idx - i0;
    const h = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
    const c0 = h(p[i0]), c1 = h(p[i1]);
    const r = Math.round(c0[0]+(c1[0]-c0[0])*frac);
    const g = Math.round(c0[1]+(c1[1]-c0[1])*frac);
    const b = Math.round(c0[2]+(c1[2]-c0[2])*frac);
    return `rgb(${r},${g},${b})`;
  }, [indicateur, darkMode]);

  const [loadError, setLoadError] = React.useState(null);

  // Charger D3 + topojson + GeoJSON
  useEffect(() => {
    const loadAll = async () => {
      // 1. Charger D3
      if (!window.d3) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
          s.onload = res;
          s.onerror = () => rej(new Error('D3 non chargé'));
          document.head.appendChild(s);
        });
      }

      // 2. Charger topojson-client (nécessaire pour d3.feature → topo.feature)
      if (!window.topojson) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js';
          s.onload = res;
          s.onerror = () => rej(new Error('topojson non chargé'));
          document.head.appendChild(s);
        });
      }

      // 3. Charger le GeoJSON — essayer plusieurs URLs
      const URLS = [
        'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
        'https://unpkg.com/world-atlas@2/countries-110m.json',
        'https://raw.githubusercontent.com/topojson/world-atlas/master/countries-110m.json',
      ];

      let topo = null;
      for (const url of URLS) {
        try {
          const res = await fetch(url);
          if (res.ok) { topo = await res.json(); break; }
        } catch { continue; }
      }

      if (!topo) throw new Error('Impossible de charger les données cartographiques');

      // Convertir TopoJSON → GeoJSON avec topojson-client
      const geo = window.topojson.feature(topo, topo.objects.countries);

      // Injecter les noms via la map ISO numérique → nom
      // (world-atlas utilise des IDs ISO 3166-1 numérique)
      const ID_TO_NAME = {
        '004':'Afghanistan','008':'Albania','012':'Algeria','024':'Angola','032':'Argentina',
        '036':'Australia','040':'Austria','050':'Bangladesh','056':'Belgium','064':'Bhutan',
        '068':'Bolivia','076':'Brazil','100':'Bulgaria','116':'Cambodia','120':'Cameroon',
        '124':'Canada','144':'Sri Lanka','152':'Chile','156':'China','170':'Colombia',
        '180':'Dem. Rep. Congo','188':'Costa Rica','191':'Croatia','192':'Cuba','203':'Czechia',
        '208':'Denmark','218':'Ecuador','818':'Egypt','231':'Ethiopia','246':'Finland',
        '250':'France','276':'Germany','288':'Ghana','300':'Greece','320':'Guatemala',
        '332':'Haiti','340':'Honduras','348':'Hungary','356':'India','360':'Indonesia',
        '364':'Iran','368':'Iraq','372':'Ireland','376':'Israel','380':'Italy',
        '388':'Jamaica','392':'Japan','400':'Jordan','398':'Kazakhstan','404':'Kenya',
        '410':'South Korea','408':'North Korea','414':'Kuwait','418':'Laos','422':'Lebanon',
        '434':'Libya','442':'Luxembourg','484':'Mexico','504':'Morocco','508':'Mozambique',
        '524':'Nepal','528':'Netherlands','554':'New Zealand','566':'Nigeria','578':'Norway',
        '586':'Pakistan','591':'Panama','600':'Paraguay','604':'Peru','608':'Philippines',
        '616':'Poland','620':'Portugal','630':'Puerto Rico','642':'Romania','643':'Russia',
        '682':'Saudi Arabia','686':'Senegal','694':'Sierra Leone','703':'Slovakia','706':'Somalia',
        '710':'South Africa','724':'Spain','729':'Sudan','752':'Sweden','756':'Switzerland',
        '760':'Syria','764':'Thailand','792':'Turkey','800':'Uganda','804':'Ukraine',
        '784':'United Arab Emirates','826':'United Kingdom','840':'United States of America',
        '858':'Uruguay','860':'Uzbekistan','862':'Venezuela','704':'Vietnam','887':'Yemen',
        '894':'Zambia','716':'Zimbabwe',
      };
      geo.features.forEach(f => {
        if (!f.properties) f.properties = {};
        f.properties.name = ID_TO_NAME[String(f.id).padStart(3,'0')] || String(f.id);
      });

      setGeoData(geo);
    };

    loadAll().catch(e => {
      console.error('Globe:', e);
      setLoadError(e.message);
    });
  }, []);

  // Dessiner le globe
  const draw = React.useCallback(() => {
    if (!canvasRef.current || !geoData || !window.d3) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const R = Math.min(W, H) / 2 - 10;
    const d3 = window.d3;
    dRef.current = d3;

    const [rx, ry] = rotRef.current;
    const proj = d3.geoOrthographic()
      .scale(R)
      .translate([W/2, H/2])
      .rotate([rx, ry, 0])
      .clipAngle(90);
    projRef.current = proj;
    const path = d3.geoPath(proj, ctx);

    ctx.clearRect(0, 0, W, H);

    // Océan
    ctx.beginPath();
    ctx.arc(W/2, H/2, R, 0, 2*Math.PI);
    ctx.fillStyle = darkMode ? '#0f172a' : '#1e40af';
    ctx.fill();

    // Halo (atmosphère)
    const grad = ctx.createRadialGradient(W/2, H/2, R*0.92, W/2, H/2, R*1.05);
    grad.addColorStop(0, 'rgba(100,160,255,0.0)');
    grad.addColorStop(1, 'rgba(100,160,255,0.18)');
    ctx.beginPath();
    ctx.arc(W/2, H/2, R*1.05, 0, 2*Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();

    // Pays
    const nameById = {};
    geoData.features.forEach(f => {
      nameById[f.id] = f.properties?.name || f.id;
    });

    // Construire lookup par nom GeoJSON → données
    geoData.features.forEach(f => {
      const nomGeo = f.properties?.name || '';
      const data = PAYS_DATA[nomGeo];
      const val = data ? data[indicateur] : null;
      const color = getColor(val, indicateur);

      ctx.beginPath();
      path(f);
      ctx.fillStyle = color;
      ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.5;
      ctx.fill();
      ctx.stroke();
    });

    // Graticule (lignes de latitude/longitude)
    const graticule = d3.geoGraticule()();
    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Bordure du globe
    ctx.beginPath();
    ctx.arc(W/2, H/2, R, 0, 2*Math.PI);
    ctx.strokeStyle = darkMode ? 'rgba(100,160,255,0.3)' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

  }, [geoData, indicateur, darkMode, getColor]);

  useEffect(() => { draw(); }, [draw]);

  // Resize canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const el = canvasRef.current.parentElement;
    const resize = () => {
      canvasRef.current.width  = el.clientWidth;
      canvasRef.current.height = el.clientHeight;
      draw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  // Animation inertie
  useEffect(() => {
    const animate = () => {
      if (!isDragging.current) {
        velRef.current[0] *= 0.96;
        velRef.current[1] *= 0.96;
        // Rotation automatique douce
        velRef.current[0] += 0.08;
        rotRef.current[0] += velRef.current[0] * 0.1;
        rotRef.current[1] += velRef.current[1] * 0.1;
        draw();
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Drag
  const onMouseDown = e => {
    isDragging.current = true;
    velRef.current = [0, 0];
    lastPos.current = [e.clientX, e.clientY];
  };
  const onMouseMove = e => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current[0];
    const dy = e.clientY - lastPos.current[1];
    lastPos.current = [e.clientX, e.clientY];
    velRef.current = [dx, dy];
    rotRef.current[0] += dx * 0.3;
    rotRef.current[1] -= dy * 0.3;
    rotRef.current[1] = Math.max(-90, Math.min(90, rotRef.current[1]));
    draw();
  };
  const onMouseUp = e => {
    isDragging.current = false;
    // Détecter clic sur un pays
    if (!projRef.current || !geoData || !window.d3) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const coords = projRef.current.invert([px, py]);
    if (!coords) return;
    const d3 = window.d3;
    const found = geoData.features.find(f => d3.geoContains(f, coords));
    if (found) {
      const nom = found.properties?.name || '';
      const data = PAYS_DATA[nom];
      if (data) setPays({ nom, data });
    }
  };

  // Touch support
  const onTouchStart = e => { const t = e.touches[0]; onMouseDown({clientX:t.clientX,clientY:t.clientY}); };
  const onTouchMove  = e => { e.preventDefault(); const t = e.touches[0]; onMouseMove({clientX:t.clientX,clientY:t.clientY}); };
  const onTouchEnd   = e => { const t = e.changedTouches[0]; onMouseUp({clientX:t.clientX,clientY:t.clientY}); };

  return (
    <div className="space-y-4">
      <div className={`p-5 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-blue-900 to-indigo-900' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white`}>
        <h2 className="text-xl font-black">🌍 Globe économique mondial</h2>
        <p className="text-sm opacity-80 mt-1">Visualisez les indicateurs économiques pays par pays · Faites tourner le globe</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {INDICATEURS.map(ind => (
          <button key={ind.id} onClick={() => { setIndicateur(ind.id); setPays(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              indicateur === ind.id
                ? 'bg-blue-600 text-white shadow-lg'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}>
            {ind.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Globe */}
        <div className={`lg:col-span-2 rounded-2xl overflow-hidden relative ${darkMode ? 'bg-gray-950' : 'bg-slate-800'}`}
          style={{height:'480px'}}>
          {!geoData && !loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 text-sm gap-2">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
              Chargement de la carte…
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <div className="text-3xl">🌐</div>
              <p className="text-white/60 text-sm">Carte indisponible — vérifiez votre connexion</p>
              <button onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700">
                Réessayer
              </button>
            </div>
          )}
          <canvas ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={() => { isDragging.current = false; }}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          />
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-white/30 text-xs">🖱️ Glisser pour tourner · Cliquer sur un pays</span>
          </div>
        </div>

        {/* Panneau */}
        <div className="space-y-3">
          {/* Légende */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{indDef.label}</p>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{indDef.lowGood ? '✅' : '❌'}</span>
              <div className="flex-1 h-3 rounded-full" style={{background:`linear-gradient(to right,${indDef.pal.join(',')})`}} />
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{indDef.lowGood ? '❌' : '✅'}</span>
            </div>
            <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Gris = données non disponibles
            </div>
          </div>

          {/* Fiche pays */}
          {pays ? (
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <h3 className={`font-black text-lg mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pays.nom}</h3>
              <div className="space-y-2">
                {INDICATEURS.map(ind => {
                  const val = pays.data[ind.id];
                  if (val == null) return null;
                  const color = getColor(val, ind.id);
                  return (
                    <div key={ind.id} className={`flex justify-between py-1 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{ind.label.split(' (')[0]}</span>
                      <span className="text-sm font-bold" style={{color}}>{val}{ind.unite}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl p-6 text-center ${darkMode ? 'bg-gray-800 text-gray-500' : 'bg-white text-gray-400'} shadow`}>
              <div className="text-3xl mb-2">🌍</div>
              <p className="text-sm">Cliquez sur un pays pour ses données</p>
            </div>
          )}

          {/* Top 5 */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>🏆 Top 5 — {indDef.label.split(' (')[0]}</p>
            {Object.entries(PAYS_DATA)
              .filter(([,d]) => d[indicateur] != null)
              .sort(([,a],[,b]) => indDef.lowGood ? a[indicateur]-b[indicateur] : b[indicateur]-a[indicateur])
              .slice(0,5)
              .map(([nom,data],i) => (
                <div key={nom} className={`flex justify-between items-center py-1 ${i<4?(darkMode?'border-b border-gray-700':'border-b border-gray-100'):''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-4 ${darkMode?'text-gray-500':'text-gray-400'}`}>{i+1}</span>
                    <span className={`text-xs ${darkMode?'text-gray-300':'text-gray-600'}`}>{nom}</span>
                  </div>
                  <span className="text-xs font-bold" style={{color:getColor(data[indicateur],indicateur)}}>
                    {data[indicateur]}{indDef.unite}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <p className={`text-xs text-center ${darkMode?'text-gray-600':'text-gray-400'}`}>
        📚 Sources : FMI, OCDE, Eurostat, Banque mondiale — Données 2024-2025 · {Object.keys(PAYS_DATA).length} pays · Carte GeoJSON Natural Earth
      </p>
    </div>
  );
}


// ==================== ONGLET AIDE / GLOSSAIRE ====================
function AideTab({darkMode}) {
  const [openSection, setOpenSection] = useState('glossaire');
  
  // GLOSSAIRE ENRICHI - 100+ termes organisés par catégories
  const glossaire = [
    // ===== SALAIRES ET RÉMUNÉRATION =====
    { terme: "SMIC", definition: "Salaire Minimum Interprofessionnel de Croissance. Salaire horaire minimum légal en France (11,88€ brut/h en 2026), revalorisé au 1er janvier. Peut être augmenté en cours d'année si l'inflation dépasse 2%.", categorie: "Salaires", importance: "haute" },
    { terme: "SMH", definition: "Salaire Minimum Hiérarchique. Salaire minimum fixé par une convention collective pour chaque niveau/coefficient. Doit toujours être ≥ au SMIC, sinon la grille est dite 'non conforme'.", categorie: "Salaires", importance: "haute" },
    { terme: "Salaire brut", definition: "Rémunération avant déduction des cotisations salariales. C'est le montant inscrit sur le contrat de travail.", categorie: "Salaires", importance: "haute" },
    { terme: "Salaire net", definition: "Montant effectivement perçu par le salarié après déduction de toutes les cotisations salariales (environ 22-25% du brut).", categorie: "Salaires", importance: "haute" },
    { terme: "Salaire net imposable", definition: "Salaire net + CSG/CRDS non déductibles + part patronale mutuelle. C'est la base de calcul de l'impôt sur le revenu.", categorie: "Salaires", importance: "moyenne" },
    { terme: "Superbrut", definition: "Coût total employeur = Salaire brut + Cotisations patronales (~43% du brut avant réductions). Représente le vrai coût d'un salarié pour l'entreprise.", categorie: "Salaires", importance: "haute" },
    { terme: "Salaire médian", definition: "Salaire qui partage la population en deux : 50% gagnent moins, 50% gagnent plus. En France : ~2 100€ net/mois (2024). Plus représentatif que la moyenne.", categorie: "Salaires", importance: "moyenne" },
    { terme: "Salaire moyen", definition: "Total des salaires divisé par le nombre de salariés. Tiré vers le haut par les hauts salaires (~2 600€ net en France).", categorie: "Salaires", importance: "moyenne" },
    { terme: "Décile (D1, D9)", definition: "D1 = seuil sous lequel gagnent les 10% les moins payés. D9 = seuil au-dessus duquel gagnent les 10% les mieux payés. Rapport D9/D1 = mesure des inégalités.", categorie: "Salaires", importance: "moyenne" },
    { terme: "SHBOE", definition: "Salaire Horaire de Base des Ouvriers et Employés. Indicateur INSEE mesurant l'évolution des salaires hors primes.", categorie: "Salaires", importance: "basse" },
    { terme: "SMB", definition: "Salaire Mensuel de Base. Salaire brut mensuel hors primes, heures supplémentaires et avantages.", categorie: "Salaires", importance: "basse" },
    { terme: "Masse salariale", definition: "Total des rémunérations brutes versées par une entreprise sur une période. Base de calcul de nombreuses cotisations.", categorie: "Salaires", importance: "moyenne" },
    { terme: "Ancienneté (prime)", definition: "Majoration de salaire liée à l'ancienneté dans l'entreprise. Souvent prévue par les conventions collectives (ex: +3% par tranche de 3 ans).", categorie: "Salaires", importance: "moyenne" },
    { terme: "13ème mois", definition: "Prime annuelle équivalente à un mois de salaire, versée en fin d'année. Prévue par certaines conventions ou accords d'entreprise.", categorie: "Salaires", importance: "moyenne" },
    
    // ===== PRIMES ET ÉPARGNE SALARIALE =====
    { terme: "PPV", definition: "Prime de Partage de la Valeur (ex-Prime Macron). Prime facultative exonérée de cotisations jusqu'à 3 000€ (6 000€ si intéressement). Conditions: ne pas substituer à un élément de salaire.", categorie: "Primes", importance: "haute" },
    { terme: "Intéressement", definition: "Prime collective liée aux performances de l'entreprise (CA, productivité, qualité...). Définie par accord pour 3 ans. Exonérée de cotisations, imposable (sauf placement PEE).", categorie: "Primes", importance: "haute" },
    { terme: "Participation", definition: "Part des bénéfices redistribuée aux salariés. Obligatoire si +50 salariés. Formule légale: RSP = ½ × (B - 5%C) × S/VA. Bloquée 5 ans sauf cas de déblocage.", categorie: "Primes", importance: "haute" },
    { terme: "PEE", definition: "Plan d'Épargne Entreprise. Système d'épargne collectif avec abondement possible de l'employeur. Sommes bloquées 5 ans. Exonéré d'impôt à la sortie.", categorie: "Primes", importance: "moyenne" },
    { terme: "PERCO/PERECO", definition: "Plan d'Épargne Retraite Collectif. Épargne bloquée jusqu'à la retraite (sauf cas exceptionnels). Abondement employeur possible.", categorie: "Primes", importance: "moyenne" },
    { terme: "Abondement", definition: "Versement complémentaire de l'employeur sur l'épargne salariale. Maximum 8% du PASS pour le PEE, 16% pour le PERCO.", categorie: "Primes", importance: "moyenne" },
    { terme: "Prime transport", definition: "Participation obligatoire de l'employeur (50%) aux frais de transports en commun. Prime forfaitaire possible pour les autres modes.", categorie: "Primes", importance: "moyenne" },
    { terme: "Prime panier", definition: "Indemnité de repas pour les salariés contraints de se restaurer sur leur lieu de travail. Montant fixé par convention ou usage.", categorie: "Primes", importance: "basse" },
    { terme: "Prime exceptionnelle", definition: "Prime ponctuelle versée à l'occasion d'un événement particulier (résultats, fusion...). Soumise à cotisations sauf PPV.", categorie: "Primes", importance: "moyenne" },
    
    // ===== COTISATIONS SOCIALES =====
    { terme: "RGDU", definition: "Réduction Générale Dégressive Unifiée. Nouveau dispositif 2026 remplaçant Fillon + bandeau maladie. Exonération dégressive des cotisations patronales jusqu'à 3 SMIC, avec paramètre P=1,75.", categorie: "Cotisations", importance: "haute" },
    { terme: "Réduction Fillon", definition: "Ancien dispositif (avant 2026) d'exonération de cotisations patronales pour les salaires ≤ 1,6 SMIC. Remplacé par le RGDU.", categorie: "Cotisations", importance: "moyenne" },
    { terme: "PMSS", definition: "Plafond Mensuel de la Sécurité Sociale. Seuil de référence pour le calcul de certaines cotisations (4 005€ en 2026). PASS = Plafond Annuel = 12 × PMSS.", categorie: "Cotisations", importance: "haute" },
    { terme: "CSG", definition: "Contribution Sociale Généralisée. Prélèvement de 9,2% sur les salaires (6,8% déductible, 2,4% non déductible) finançant la Sécurité sociale.", categorie: "Cotisations", importance: "haute" },
    { terme: "CRDS", definition: "Contribution au Remboursement de la Dette Sociale. Prélèvement de 0,5% sur les revenus finançant le remboursement de la dette de la Sécu. Non déductible.", categorie: "Cotisations", importance: "moyenne" },
    { terme: "URSSAF", definition: "Union de Recouvrement des cotisations de Sécurité Sociale et d'Allocations Familiales. Organisme collectant les cotisations sociales.", categorie: "Cotisations", importance: "moyenne" },
    { terme: "Cotisations patronales", definition: "Part des cotisations sociales à la charge de l'employeur (~43% du brut avant réductions): maladie, vieillesse, famille, chômage, retraite complémentaire, AT/MP...", categorie: "Cotisations", importance: "haute" },
    { terme: "Cotisations salariales", definition: "Part des cotisations à la charge du salarié (~22% du brut): vieillesse, retraite complémentaire, CSG, CRDS. Prélevées sur le brut.", categorie: "Cotisations", importance: "haute" },
    { terme: "AGIRC-ARRCO", definition: "Régime de retraite complémentaire obligatoire des salariés du privé. Cotisation: 7,87% (salarié + employeur) jusqu'au PMSS, 21,59% au-delà.", categorie: "Cotisations", importance: "moyenne" },
    { terme: "Taux AT/MP", definition: "Taux Accident du Travail / Maladie Professionnelle. Variable selon le secteur d'activité et la sinistralité de l'entreprise (0,9% à 6%+).", categorie: "Cotisations", importance: "basse" },
    { terme: "Forfait social", definition: "Contribution patronale de 20% sur certains revenus (intéressement, participation dans les grandes entreprises, abondement...).", categorie: "Cotisations", importance: "moyenne" },
    { terme: "Versement mobilité", definition: "Contribution patronale finançant les transports en commun. Taux variable selon les zones (jusqu'à 2,95% en Île-de-France).", categorie: "Cotisations", importance: "basse" },
    
    // ===== NÉGOCIATION COLLECTIVE =====
    { terme: "NAO", definition: "Négociation Annuelle Obligatoire. Obligation pour les entreprises avec délégué syndical de négocier chaque année sur: 1) salaires et temps de travail, 2) égalité pro, 3) QVCT.", categorie: "Négociation", importance: "haute" },
    { terme: "Accord d'entreprise", definition: "Accord collectif négocié entre l'employeur et les syndicats (ou élus/salariés mandatés). Peut déroger à la convention de branche sur certains sujets.", categorie: "Négociation", importance: "haute" },
    { terme: "Accord de branche", definition: "Accord négocié au niveau d'un secteur d'activité entre organisations patronales et syndicales. Étendu par arrêté, il s'applique à toutes les entreprises du secteur.", categorie: "Négociation", importance: "haute" },
    { terme: "Extension (arrêté)", definition: "Décision ministérielle rendant obligatoire un accord de branche pour toutes les entreprises du secteur, même non adhérentes aux organisations signataires.", categorie: "Négociation", importance: "moyenne" },
    { terme: "Dénonciation", definition: "Procédure par laquelle une partie met fin à un accord collectif. Préavis de 3 mois, puis survie de l'accord 12 mois minimum.", categorie: "Négociation", importance: "basse" },
    { terme: "Avenant", definition: "Accord modifiant ou complétant un accord existant. Même procédure de négociation et de validation que l'accord initial.", categorie: "Négociation", importance: "basse" },
    { terme: "Représentativité", definition: "Critères permettant à un syndicat de négocier et signer des accords: 10% des voix aux élections CSE au niveau où l'accord est négocié.", categorie: "Négociation", importance: "moyenne" },
    { terme: "Accord majoritaire", definition: "Depuis 2017, un accord d'entreprise doit être signé par des syndicats ayant obtenu >50% des voix aux élections CSE pour être valide.", categorie: "Négociation", importance: "moyenne" },
    { terme: "Droit d'opposition", definition: "Possibilité pour des syndicats majoritaires de s'opposer à un accord de branche dans les 15 jours suivant sa notification.", categorie: "Négociation", importance: "basse" },
    
    // ===== CONVENTIONS COLLECTIVES =====
    { terme: "CCN", definition: "Convention Collective Nationale. Accord de branche fixant les règles applicables aux salariés d'un secteur: grilles de salaires, classifications, congés, primes...", categorie: "Conventions", importance: "haute" },
    { terme: "IDCC", definition: "Identifiant de Convention Collective. Code à 4 chiffres identifiant chaque convention (ex: 3248 = Métallurgie, 2511 = Sport, 1486 = Bureaux d'études).", categorie: "Conventions", importance: "haute" },
    { terme: "Classification", definition: "Système hiérarchique organisant les emplois par niveaux/coefficients selon les compétences requises. Base du calcul des minima salariaux.", categorie: "Conventions", importance: "haute" },
    { terme: "Coefficient", definition: "Nombre attribué à chaque niveau de classification, multiplié par une valeur de point pour obtenir le salaire minimum. Ex: coef 200 × 5€ = 1 000€.", categorie: "Conventions", importance: "moyenne" },
    { terme: "Valeur du point", definition: "Montant en euros multiplié par le coefficient pour calculer le SMH. Négociée dans les accords de branche.", categorie: "Conventions", importance: "moyenne" },
    { terme: "Grille de salaires", definition: "Tableau fixant les salaires minima conventionnels pour chaque niveau de classification. Doit être ≥ SMIC à tous les niveaux.", categorie: "Conventions", importance: "haute" },
    { terme: "Branche professionnelle", definition: "Regroupement d'entreprises d'un même secteur d'activité couvertes par une même convention collective.", categorie: "Conventions", importance: "moyenne" },
    { terme: "Restructuration des branches", definition: "Politique de réduction du nombre de branches professionnelles (de 700+ à ~200 cibles) par fusion des petites branches.", categorie: "Conventions", importance: "basse" },
    { terme: "Hiérarchie des normes", definition: "Ordre d'application des règles: loi > accord de branche > accord d'entreprise > contrat. Mais certains sujets peuvent être négociés au niveau entreprise.", categorie: "Conventions", importance: "moyenne" },
    
    // ===== EMPLOI ET CHÔMAGE =====
    { terme: "Taux de chômage BIT", definition: "% de la population active sans emploi, disponible et en recherche active. Définition du Bureau International du Travail, comparable internationalement.", categorie: "Emploi", importance: "haute" },
    { terme: "Taux d'emploi", definition: "% des 15-64 ans occupant un emploi. France: ~69% (2024). Indicateur de dynamisme du marché du travail.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Population active", definition: "Ensemble des personnes en emploi ou au chômage (au sens BIT). Environ 30 millions de personnes en France.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Halo du chômage", definition: "Personnes sans emploi souhaitant travailler mais ne remplissant pas tous les critères BIT (non disponibles ou non en recherche active). ~2 millions de personnes.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Sous-emploi", definition: "Personnes en temps partiel subi ou au chômage technique. Indicateur de la qualité de l'emploi.", categorie: "Emploi", importance: "moyenne" },
    { terme: "DEFM", definition: "Demandeurs d'Emploi en Fin de Mois. Statistique France Travail des inscrits par catégorie (A: sans emploi, B/C: activité réduite...).", categorie: "Emploi", importance: "moyenne" },
    { terme: "Catégorie A", definition: "Demandeurs d'emploi sans aucune activité, tenus de faire des actes positifs de recherche d'emploi.", categorie: "Emploi", importance: "moyenne" },
    { terme: "France Travail", definition: "Service public de l'emploi (ex-Pôle Emploi depuis 2024). Inscription, indemnisation, accompagnement des demandeurs d'emploi.", categorie: "Emploi", importance: "haute" },
    { terme: "Tensions de recrutement", definition: "Indicateur DARES mesurant la difficulté des entreprises à recruter. Ratio offres/demandes par métier. >60% = forte tension.", categorie: "Emploi", importance: "haute" },
    { terme: "BMO", definition: "Besoins en Main-d'Œuvre. Enquête annuelle France Travail sur les intentions d'embauche des entreprises et les difficultés anticipées.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Offres d'emploi durables", definition: "CDI ou CDD de plus de 6 mois. Indicateur de la qualité des offres disponibles.", categorie: "Emploi", importance: "basse" },
    
    // ===== CONTRATS DE TRAVAIL =====
    { terme: "CDI", definition: "Contrat à Durée Indéterminée. Forme normale du contrat de travail. Peut être rompu par démission, licenciement ou rupture conventionnelle.", categorie: "Contrats", importance: "haute" },
    { terme: "CDD", definition: "Contrat à Durée Déterminée. Limité à 18 mois (renouvellements compris). Motifs légaux: remplacement, surcroît d'activité, saisonnier...", categorie: "Contrats", importance: "haute" },
    { terme: "CTT / Intérim", definition: "Contrat de Travail Temporaire. Le salarié est employé par l'agence d'intérim et mis à disposition de l'entreprise utilisatrice.", categorie: "Contrats", importance: "moyenne" },
    { terme: "Temps partiel", definition: "Durée de travail inférieure à la durée légale (35h) ou conventionnelle. Minimum 24h/semaine sauf dérogations.", categorie: "Contrats", importance: "moyenne" },
    { terme: "Forfait jours", definition: "Mode d'organisation du temps de travail pour les cadres autonomes. 218 jours/an maximum. Pas de décompte horaire.", categorie: "Contrats", importance: "moyenne" },
    { terme: "Période d'essai", definition: "Période initiale permettant à chaque partie de rompre librement le contrat. Durée max: 2 mois (ouvriers/employés) à 4 mois (cadres), renouvelable une fois.", categorie: "Contrats", importance: "moyenne" },
    { terme: "Rupture conventionnelle", definition: "Mode de rupture amiable du CDI, ouvrant droit aux allocations chômage. Homologation par la DREETS obligatoire.", categorie: "Contrats", importance: "haute" },
    { terme: "Licenciement économique", definition: "Licenciement pour motif non inhérent au salarié (difficultés économiques, mutations technologiques...). Procédure spécifique, PSE si +10 salariés.", categorie: "Contrats", importance: "moyenne" },
    
    // ===== TEMPS DE TRAVAIL =====
    { terme: "Durée légale", definition: "35 heures par semaine. Au-delà: heures supplémentaires majorées. Peut être modulée par accord (annualisation).", categorie: "Temps de travail", importance: "haute" },
    { terme: "Heures supplémentaires", definition: "Heures au-delà de 35h/semaine. Majorées de 25% (8 premières) puis 50%. Contingent annuel: 220h sauf accord.", categorie: "Temps de travail", importance: "haute" },
    { terme: "RTT", definition: "Réduction du Temps de Travail. Jours de repos compensant les heures au-delà de 35h dans les entreprises à 39h ou en forfait jours.", categorie: "Temps de travail", importance: "haute" },
    { terme: "Annualisation", definition: "Répartition du temps de travail sur l'année (1 607h) permettant de moduler les horaires selon l'activité.", categorie: "Temps de travail", importance: "moyenne" },
    { terme: "Repos compensateur", definition: "Temps de repos accordé en compensation d'heures supplémentaires, au lieu ou en plus de la majoration salariale.", categorie: "Temps de travail", importance: "basse" },
    { terme: "Astreinte", definition: "Période où le salarié doit rester joignable pour intervenir si nécessaire. Compensée financièrement ou en repos.", categorie: "Temps de travail", importance: "basse" },
    { terme: "Travail de nuit", definition: "Travail entre 21h et 6h (ou plage définie par accord). Compensations obligatoires (repos, majoration). Suivi médical renforcé.", categorie: "Temps de travail", importance: "moyenne" },
    { terme: "Compte Épargne Temps", definition: "Dispositif permettant d'accumuler des jours de congés ou des heures pour une utilisation ultérieure (congé, formation, retraite...).", categorie: "Temps de travail", importance: "moyenne" },
    
    // ===== INDICATEURS ÉCONOMIQUES =====
    { terme: "PIB", definition: "Produit Intérieur Brut. Valeur totale de la production de biens et services d'un pays sur une période. France: ~2 800 Mds€/an.", categorie: "Indicateurs", importance: "haute" },
    { terme: "Croissance", definition: "Variation du PIB en volume (hors inflation). Positive = création de richesse. France: ~1% par an en moyenne.", categorie: "Indicateurs", importance: "haute" },
    { terme: "Inflation", definition: "Hausse générale et durable des prix. Mesurée par l'IPC (INSEE). Cible BCE: 2%. Érode le pouvoir d'achat si > hausses de salaires.", categorie: "Indicateurs", importance: "haute" },
    { terme: "IPC", definition: "Indice des Prix à la Consommation. Mesure l'évolution moyenne des prix d'un panier de biens et services représentatif.", categorie: "Indicateurs", importance: "haute" },
    { terme: "IPCH", definition: "Indice des Prix à la Consommation Harmonisé. Version européenne de l'IPC, comparable entre pays de l'UE.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Inflation sous-jacente", definition: "Inflation hors éléments volatils (énergie, alimentation fraîche). Reflète les tendances de fond des prix.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Déflateur", definition: "Indice permettant de passer des valeurs nominales aux valeurs réelles (corrigées de l'inflation).", categorie: "Indicateurs", importance: "basse" },
    { terme: "IRL", definition: "Indice de Référence des Loyers. Calculé par l'INSEE, sert de base à la révision annuelle des loyers d'habitation.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "ICC", definition: "Indice du Coût de la Construction. Utilisé pour indexer les loyers commerciaux et certains contrats.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Climat des affaires", definition: "Indicateur INSEE synthétique de confiance des chefs d'entreprise. 100 = moyenne long terme. >100 = optimisme.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "PMI", definition: "Purchasing Managers Index. Indice d'activité basé sur une enquête auprès des directeurs d'achat. >50 = expansion.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Défaillances d'entreprises", definition: "Entreprises en cessation de paiements (redressement ou liquidation judiciaire). Indicateur de santé économique.", categorie: "Indicateurs", importance: "moyenne" },
    
    // ===== PARTAGE DE LA VALEUR =====
    { terme: "Valeur Ajoutée", definition: "Richesse créée par l'entreprise = Production - Consommations intermédiaires. Se répartit entre salaires, profits, impôts.", categorie: "Partage VA", importance: "haute" },
    { terme: "Partage de la VA", definition: "Répartition de la valeur ajoutée entre salaires (~60%), EBE/profits (~32%) et impôts (~8%). Indicateur clé des NAO.", categorie: "Partage VA", importance: "haute" },
    { terme: "EBE", definition: "Excédent Brut d'Exploitation. Profit de l'entreprise avant impôts, intérêts et amortissements. EBE = VA - Salaires - Impôts production.", categorie: "Partage VA", importance: "haute" },
    { terme: "Taux de marge", definition: "EBE / Valeur Ajoutée. Part des profits dans la richesse créée. France: ~32% (SNF). Niveau historiquement élevé = indicateur économique.", categorie: "Partage VA", importance: "haute" },
    { terme: "Résultat net", definition: "Bénéfice ou perte après toutes les charges (exploitation, financières, exceptionnelles, impôts). Base de la participation.", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Dividendes", definition: "Part des bénéfices distribuée aux actionnaires. Record en France: 67 Mds€ en 2023. Argument syndical sur le partage de la valeur.", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Rachats d'actions", definition: "Opération par laquelle une entreprise rachète ses propres actions, augmentant la valeur pour les actionnaires restants.", categorie: "Partage VA", importance: "basse" },
    { terme: "Investissement", definition: "Dépenses d'équipement, R&D, formation... Argument patronal pour modérer les hausses de salaires.", categorie: "Partage VA", importance: "moyenne" },
    
    // ===== PROTECTION SOCIALE =====
    { terme: "Sécurité sociale", definition: "Système de protection couvrant maladie, vieillesse, famille, accidents du travail. Financé par les cotisations et la CSG.", categorie: "Protection sociale", importance: "haute" },
    { terme: "Assurance chômage", definition: "Régime d'indemnisation des demandeurs d'emploi (ARE). Géré par l'UNEDIC, versé par France Travail. Financé par cotisations patronales.", categorie: "Protection sociale", importance: "haute" },
    { terme: "ARE", definition: "Allocation d'aide au Retour à l'Emploi. Indemnité chômage = 57% du salaire journalier de référence (plafonné). Durée variable selon l'âge et la durée cotisée.", categorie: "Protection sociale", importance: "haute" },
    { terme: "RSA", definition: "Revenu de Solidarité Active. Minimum social pour les personnes sans ressources (635€/mois pour une personne seule en 2026).", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "Prime d'activité", definition: "Complément de revenus pour les travailleurs modestes. Versée par la CAF. Dépend des revenus et de la composition du foyer.", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "UNEDIC", definition: "Organisme paritaire gérant l'assurance chômage. Négocie les règles d'indemnisation avec les partenaires sociaux.", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "Complémentaire santé", definition: "Mutuelle ou assurance complétant les remboursements de la Sécu. Obligatoire en entreprise avec participation employeur ≥50%.", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "Prévoyance", definition: "Garanties couvrant les risques lourds: décès, invalidité, incapacité. Souvent obligatoire pour les cadres, selon conventions.", categorie: "Protection sociale", importance: "moyenne" },
    
    // ===== INSTANCES REPRÉSENTATIVES =====
    { terme: "CSE", definition: "Comité Social et Économique. Instance unique de représentation du personnel depuis 2018 (fusion CE/DP/CHSCT). Obligatoire dès 11 salariés.", categorie: "IRP", importance: "haute" },
    { terme: "Délégué syndical", definition: "Représentant d'un syndicat représentatif dans l'entreprise. Seul habilité à négocier et signer des accords collectifs.", categorie: "IRP", importance: "haute" },
    { terme: "RSS", definition: "Représentant de Section Syndicale. Désigné par un syndicat non représentatif pour se faire connaître et préparer les élections.", categorie: "IRP", importance: "basse" },
    { terme: "Heures de délégation", definition: "Crédit d'heures rémunérées pour exercer les mandats de représentant du personnel. Variable selon les mandats et l'effectif.", categorie: "IRP", importance: "moyenne" },
    { terme: "CSSCT", definition: "Commission Santé, Sécurité et Conditions de Travail. Commission du CSE obligatoire dans les entreprises ≥300 salariés.", categorie: "IRP", importance: "moyenne" },
    { terme: "Base de Données Économiques et Sociales", definition: "BDES. Document regroupant les informations économiques et sociales que l'employeur doit mettre à disposition du CSE.", categorie: "IRP", importance: "moyenne" },
    
    // ===== SANTÉ ET SÉCURITÉ =====
    { terme: "AT/MP", definition: "Accident du Travail / Maladie Professionnelle. Accident survenu au travail ou maladie liée à l'activité professionnelle. Indemnisation spécifique.", categorie: "Santé-Sécurité", importance: "haute" },
    { terme: "Accident de trajet", definition: "Accident survenu sur le trajet domicile-travail. Régime proche de l'AT mais cotisation séparée.", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "Maladie professionnelle", definition: "Maladie figurant dans un tableau officiel ou reconnue comme liée au travail. TMS, amiante, troubles psychiques...", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "TMS", definition: "Troubles Musculo-Squelettiques. 1ère cause de maladie professionnelle (87%). Dos, épaules, coudes, poignets...", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "RPS", definition: "Risques Psycho-Sociaux. Stress, harcèlement, burn-out, violences... L'employeur doit les prévenir dans le DUERP.", categorie: "Santé-Sécurité", importance: "haute" },
    { terme: "DUERP", definition: "Document Unique d'Évaluation des Risques Professionnels. Obligatoire, liste les risques par unité de travail et les actions de prévention.", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "QVCT", definition: "Qualité de Vie et Conditions de Travail (ex-QVT). Thème de négociation obligatoire: organisation, équilibre vie pro/perso, santé...", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "Pénibilité", definition: "Exposition à des facteurs de risques professionnels (travail de nuit, bruit, postures, températures...). Compte C2P pour retraite anticipée.", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "C2P", definition: "Compte Professionnel de Prévention. Points acquis en cas d'exposition à des facteurs de pénibilité, utilisables pour formation, temps partiel ou retraite anticipée.", categorie: "Santé-Sécurité", importance: "basse" },
    
    // ===== ÉGALITÉ PROFESSIONNELLE =====
    { terme: "Index égalité F/H", definition: "Note sur 100 mesurant les écarts de rémunération et de carrière entre femmes et hommes. Publication obligatoire. <75 = pénalités possibles.", categorie: "Égalité", importance: "haute" },
    { terme: "Écart salarial F/H", definition: "Différence de salaire entre femmes et hommes. France: ~16% tous temps confondus, ~4% à poste et temps égal.", categorie: "Égalité", importance: "haute" },
    { terme: "Congé maternité", definition: "16 semaines minimum (6 avant + 10 après l'accouchement). Indemnisé à 100% du salaire (plafonné) par la Sécu.", categorie: "Égalité", importance: "moyenne" },
    { terme: "Congé paternité", definition: "28 jours (dont 7 obligatoires) à la naissance d'un enfant. Indemnisé comme le congé maternité.", categorie: "Égalité", importance: "moyenne" },
    { terme: "Congé parental", definition: "Congé pour élever un enfant (jusqu'à 3 ans). Non rémunéré mais possibilité de PreParE (CAF).", categorie: "Égalité", importance: "basse" },
    
    // ===== FORMATION =====
    { terme: "CPF", definition: "Compte Personnel de Formation. Crédit en euros (500€/an, max 5 000€) pour financer des formations certifiantes. Portable tout au long de la carrière.", categorie: "Formation", importance: "haute" },
    { terme: "Plan de développement des compétences", definition: "Programme de formation décidé par l'employeur pour adapter les compétences des salariés. Remplace le plan de formation.", categorie: "Formation", importance: "moyenne" },
    { terme: "VAE", definition: "Validation des Acquis de l'Expérience. Obtention d'un diplôme par la reconnaissance de l'expérience professionnelle (1 an minimum).", categorie: "Formation", importance: "moyenne" },
    { terme: "Bilan de compétences", definition: "Analyse des compétences et motivations pour définir un projet professionnel. Finançable par le CPF.", categorie: "Formation", importance: "basse" },
    { terme: "Pro-A", definition: "Reconversion ou Promotion par l'Alternance. Formation en alternance pour les salariés en CDI souhaitant évoluer ou se reconvertir.", categorie: "Formation", importance: "basse" },
    { terme: "OPCO", definition: "Opérateur de Compétences. Organisme collectant les contributions formation des entreprises et finançant les formations de branche.", categorie: "Formation", importance: "moyenne" },
    { terme: "Contribution formation", definition: "Obligation des employeurs: 0,55% (< 11 salariés) ou 1% (≥ 11) de la masse salariale pour financer la formation professionnelle.", categorie: "Formation", importance: "moyenne" },
    
    // ===== SOURCES ET ORGANISMES =====
    { terme: "INSEE", definition: "Institut National de la Statistique et des Études Économiques. Produit les données officielles sur l'économie, l'emploi, les prix, la démographie.", categorie: "Sources", importance: "haute" },
    { terme: "DARES", definition: "Direction de l'Animation de la Recherche, des Études et des Statistiques. Service statistique du Ministère du Travail.", categorie: "Sources", importance: "haute" },
    { terme: "Banque de France", definition: "Institution produisant des études économiques, les prévisions macroéconomiques et le suivi des défaillances d'entreprises.", categorie: "Sources", importance: "moyenne" },
    { terme: "DGT", definition: "Direction Générale du Travail. Administration centrale du Ministère du Travail, élabore la réglementation.", categorie: "Sources", importance: "basse" },
    { terme: "DREETS", definition: "Direction Régionale de l'Économie, de l'Emploi, du Travail et des Solidarités (ex-DIRECCTE). Administration déconcentrée, homologue les ruptures conventionnelles.", categorie: "Sources", importance: "basse" },
    { terme: "Eurostat", definition: "Office statistique de l'Union Européenne. Données harmonisées permettant les comparaisons entre pays.", categorie: "Sources", importance: "moyenne" },
    { terme: "OCDE", definition: "Organisation de Coopération et de Développement Économiques. Études et données sur les pays développés.", categorie: "Sources", importance: "moyenne" },
    { terme: "OIT/BIT", definition: "Organisation Internationale du Travail / Bureau International du Travail. Définit les normes internationales du travail.", categorie: "Sources", importance: "basse" },
    
    // ===== CLASSIFICATION =====
    { terme: "Cadre", definition: "Salarié exerçant des fonctions de direction, d'encadrement ou d'expertise. Cotise à l'AGIRC-ARRCO au taux supérieur. Souvent au forfait jours.", categorie: "Classification", importance: "haute" },
    { terme: "ETAM", definition: "Employés, Techniciens et Agents de Maîtrise. Catégorie intermédiaire entre ouvriers et cadres.", categorie: "Classification", importance: "moyenne" },
    { terme: "Ouvrier", definition: "Salarié effectuant un travail manuel. Sous-catégories: OS (ouvrier spécialisé), OQ (ouvrier qualifié), OHQ (ouvrier hautement qualifié).", categorie: "Classification", importance: "moyenne" },
    { terme: "Employé", definition: "Salarié effectuant des tâches administratives ou commerciales sans responsabilité d'encadrement.", categorie: "Classification", importance: "basse" },
    { terme: "Agent de maîtrise", definition: "Salarié encadrant une équipe d'ouvriers ou d'employés sans avoir le statut cadre.", categorie: "Classification", importance: "basse" },
    { terme: "Position / Niveau", definition: "Échelon dans la grille de classification conventionnelle, déterminant le salaire minimum applicable.", categorie: "Classification", importance: "moyenne" },
    
    // ===== EUROPE =====
    { terme: "Directive européenne", definition: "Texte fixant des objectifs aux États membres qui doivent le transposer en droit national. Ex: directive sur les salaires minimaux.", categorie: "Europe", importance: "moyenne" },
    { terme: "Salaire minimum UE", definition: "Directive 2022/2041 demandant des salaires minimums 'adéquats'. Seuil indicatif: 60% du salaire médian ou 50% du salaire moyen.", categorie: "Europe", importance: "moyenne" },
    { terme: "Socle européen des droits sociaux", definition: "20 principes adoptés en 2017: emploi équitable, protection sociale, inclusion. Non contraignant mais influence les directives.", categorie: "Europe", importance: "basse" },
    { terme: "BCE", definition: "Banque Centrale Européenne. Fixe les taux d'intérêt de la zone euro. Objectif: inflation proche de 2%.", categorie: "Europe", importance: "moyenne" },
    { terme: "Zone euro", definition: "20 pays de l'UE ayant adopté l'euro comme monnaie. Politique monétaire commune (BCE).", categorie: "Europe", importance: "basse" },

    // ===== MACROÉCONOMIE =====
    { terme: "PIB", definition: "Produit Intérieur Brut. Valeur totale des biens et services produits sur le territoire en un an. Principal indicateur de la taille d'une économie.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "PNB", definition: "Produit National Brut. Comme le PIB mais mesure la production des résidents français, y compris à l'étranger. Peu utilisé aujourd'hui.", categorie: "Macroéconomie", importance: "basse" },
    { terme: "Croissance économique", definition: "Variation du PIB en volume sur une période. Une croissance positive signifie une hausse de la production. Négative = récession.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Récession", definition: "Deux trimestres consécutifs de croissance négative. Entraîne généralement hausse du chômage et baisse de l'investissement.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Stagflation", definition: "Situation rare combinant stagnation économique (chômage élevé) et inflation forte. Vécu en France lors du choc pétrolier de 1973.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Déflation", definition: "Baisse généralisée et durable des prix. Paradoxalement néfaste: les ménages reportent leurs achats, l'économie se contracte (spirale déflationniste).", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Désinflation", definition: "Ralentissement de l'inflation: les prix continuent d'augmenter mais moins vite. Différent de la déflation.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Productivité", definition: "Rapport entre la production et les facteurs utilisés (travail, capital). Productivité du travail = PIB / heures travaillées. Clé pour la compétitivité.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Cycle économique", definition: "Alternance de phases d'expansion (croissance) et de contraction (récession). Durée moyenne : 7-10 ans. Théorisé par Juglar, Kondratiev.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Politique monétaire", definition: "Action de la banque centrale sur la masse monétaire et les taux d'intérêt pour influencer l'activité économique et l'inflation.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Politique budgétaire", definition: "Action de l'État via ses dépenses et ses recettes fiscales pour influencer l'activité économique. Peut être expansive ou restrictive.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Politique d'austérité", definition: "Réduction des dépenses publiques et/ou hausse des impôts pour réduire le déficit. Controversée: peut aggraver la récession.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Déficit public", definition: "Excédent des dépenses de l'État sur ses recettes. Exprimé en % du PIB. Critère de Maastricht: < 3% du PIB.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Dette publique", definition: "Cumul des déficits passés. France: ~110% du PIB en 2025. Critère de Maastricht: < 60% du PIB.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Taux directeur", definition: "Taux d'intérêt fixé par la banque centrale auquel les banques commerciales empruntent. Influence tous les autres taux de l'économie.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Quantitative Easing (QE)", definition: "Politique non-conventionnelle: la banque centrale achète des actifs (obligations) pour injecter des liquidités dans l'économie. Utilisé massivement post-2008.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Balance commerciale", definition: "Différence entre exportations et importations. Excédentaire si on exporte plus qu'on importe. France: déficitaire depuis 2004.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Compétitivité", definition: "Capacité d'une entreprise ou d'un pays à maintenir ou accroître ses parts de marché. Compétitivité-prix (coûts) vs compétitivité hors-prix (qualité, innovation).", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Indicateur avancé", definition: "Indicateur qui prédit l'évolution économique future: commandes industrielles, confiance des ménages, prix des matières premières.", categorie: "Macroéconomie", importance: "basse" },
    { terme: "Pouvoir d'achat", definition: "Quantité de biens et services qu'un revenu permet d'acheter. Évolue selon l'écart entre hausse des revenus et inflation.", categorie: "Macroéconomie", importance: "haute" },

    // ===== FINANCE ET MARCHÉS =====
    { terme: "CAC 40", definition: "Principal indice boursier français: les 40 plus grandes capitalisations de la Bourse de Paris. Créé en 1987, base 1000.", categorie: "Finance", importance: "moyenne" },
    { terme: "Obligations", definition: "Titres de dette émis par l'État ou les entreprises. L'acheteur prête de l'argent et reçoit des intérêts (coupon). Moins risqués que les actions.", categorie: "Finance", importance: "moyenne" },
    { terme: "Taux d'intérêt", definition: "Prix de l'argent emprunté, exprimé en %. Taux directeur (BCE), taux d'emprunt immobilier, taux de rémunération de l'épargne.", categorie: "Finance", importance: "haute" },
    { terme: "Spread", definition: "Écart entre deux taux d'intérêt. Ex: spread OAT-Bund = différence entre taux d'emprunt français et allemand. Mesure la confiance des marchés.", categorie: "Finance", importance: "basse" },
    { terme: "OAT", definition: "Obligation Assimilable du Trésor. Titre de dette émis par l'État français pour financer son déficit. Référence pour les taux longs en France.", categorie: "Finance", importance: "basse" },
    { terme: "Livret A", definition: "Compte d'épargne réglementé, défiscalisé, garanti par l'État. Taux fixé par la Banque de France (2,4% en 2025). Plafond: 22 950€.", categorie: "Finance", importance: "moyenne" },
    { terme: "PEA", definition: "Plan d'Épargne en Actions. Enveloppe fiscalement avantageuse pour investir en actions européennes. Exonération d'impôt après 5 ans.", categorie: "Finance", importance: "basse" },
    { terme: "Assurance-vie", definition: "Premier produit d'épargne français (1 900 Mds€). Fiscalité avantageuse après 8 ans. Fonds euros (garanti) + unités de compte (risqués).", categorie: "Finance", importance: "moyenne" },
    { terme: "Capital-risque", definition: "Investissement dans des jeunes entreprises innovantes à fort potentiel mais risque élevé. Moteur de la création de startups.", categorie: "Finance", importance: "basse" },
    { terme: "Hedge fund", definition: "Fonds d'investissement spéculatif utilisant des stratégies complexes (vente à découvert, effet de levier). Peu régulés, réservés aux investisseurs institutionnels.", categorie: "Finance", importance: "basse" },
    { terme: "Krach boursier", definition: "Chute brutale et massive des cours boursiers (-20% en peu de temps). Exemples: 1929, 1987, 2000, 2008. Souvent déclenchés par une panique collective.", categorie: "Finance", importance: "moyenne" },
    { terme: "Bulle spéculative", definition: "Hausse excessive des prix d'un actif déconnectée des fondamentaux économiques. Finit toujours par éclater. Ex: tulipes (1637), immobilier US (2006).", categorie: "Finance", importance: "moyenne" },
    { terme: "Dividende", definition: "Part des bénéfices d'une entreprise distribuée à ses actionnaires. Controversé: certains jugent qu'il capte de la valeur au détriment des salariés.", categorie: "Finance", importance: "moyenne" },
    { terme: "Rachat d'actions", definition: "L'entreprise rachète ses propres actions pour les annuler, augmentant la valeur des actions restantes. Alternative au dividende, fiscal plus avantageux.", categorie: "Finance", importance: "basse" },

    // ===== IMMOBILIER =====
    { terme: "IRL", definition: "Indice de Référence des Loyers. Calculé par l'INSEE chaque trimestre sur base de l'inflation. Plafonne les révisions de loyers en France.", categorie: "Immobilier", importance: "haute" },
    { terme: "ICC", definition: "Indice du Coût de la Construction. Publié par l'INSEE, sert à réviser certains baux commerciaux.", categorie: "Immobilier", importance: "basse" },
    { terme: "PTZ", definition: "Prêt à Taux Zéro. Aide de l'État pour les primo-accédants sous conditions de ressources. Ne finance qu'une partie du bien.", categorie: "Immobilier", importance: "moyenne" },
    { terme: "Taux d'effort", definition: "Part du revenu consacrée au logement. Seuil critique: 33% (banques) ou 40% (réalité pour les ménages modestes). En hausse depuis 2000.", categorie: "Immobilier", importance: "haute" },
    { terme: "Bulle immobilière", definition: "Hausse des prix de l'immobilier déconnectée des revenus et des fondamentaux. France: prix/revenus au plus haut historique dans les grandes villes.", categorie: "Immobilier", importance: "moyenne" },
    { terme: "DALO", definition: "Droit Au Logement Opposable. Permet aux mal-logés de faire valoir leur droit à un logement devant les tribunaux si l'État ne le leur fournit pas.", categorie: "Immobilier", importance: "basse" },
    { terme: "HLM/HJS", definition: "Habitation à Loyer Modéré. Logement social dont le loyer est plafonné en fonction des ressources. 5,4 millions de logements en France, 2,5M sur liste d'attente.", categorie: "Immobilier", importance: "moyenne" },
    { terme: "Encadrement des loyers", definition: "Dispositif limitant les loyers à un plafond dans certaines zones tendues (Paris, Lyon, Bordeaux...). Contesté par les propriétaires.", categorie: "Immobilier", importance: "moyenne" },

    // ===== DROIT DU TRAVAIL =====
    { terme: "Licenciement économique", definition: "Rupture du contrat de travail pour motif économique: difficultés économiques, mutations technologiques, cessation d'activité. Procédure stricte.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Licenciement pour faute", definition: "Rupture du contrat pour faute simple (insuffisance professionnelle), faute grave (pas de préavis), ou faute lourde (intention de nuire).", categorie: "Droit du travail", importance: "haute" },
    { terme: "Rupture conventionnelle", definition: "Rupture du contrat d'un commun accord. Salarié touche les allocations chômage. +500 000 par an en France. Contestée car peut dissimuler un licenciement.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Préavis", definition: "Délai entre notification de la rupture et fin effective du contrat. Varie selon l'ancienneté et la catégorie. Peut être inexécuté (indemnité compensatrice).", categorie: "Droit du travail", importance: "haute" },
    { terme: "Indemnité de licenciement", definition: "Indemnité légale minimum: 1/4 de mois de salaire par année d'ancienneté (jusqu'à 10 ans), 1/3 au-delà. La convention peut prévoir plus.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Barème Macron", definition: "Plafonnement des dommages-intérêts en cas de licenciement sans cause réelle (1 mois/an d'ancienneté, max 20 mois). Critiqué pour son effet dissuasif sur les recours.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Période d'essai", definition: "Période initiale du contrat permettant à chacun d'évaluer l'autre. CDI: 2 mois ouvriers, 3 mois agents de maîtrise, 4 mois cadres. Renouvelable une fois.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Clause de non-concurrence", definition: "Clause interdisant au salarié de travailler chez un concurrent après son départ. Doit être limitée en zone, durée et activité, et être compensée financièrement.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Harcèlement moral", definition: "Agissements répétés dégradant les conditions de travail, portant atteinte aux droits et à la dignité, altérant la santé. Définition: L.1152-1 Code du travail.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Discrimination au travail", definition: "Traitement défavorable basé sur un critère prohibé (sexe, âge, origine, syndicat, grossesse...). 25 critères protégés. Sanction pénale + civile.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Obligation de sécurité", definition: "L'employeur a une obligation de résultat sur la sécurité physique et mentale des salariés. La faute inexcusable engage sa responsabilité aggravée.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Document unique (DUERP)", definition: "Document Unique d'Évaluation des Risques Professionnels. Obligatoire pour tout employeur, mis à jour annuellement et après tout accident.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Inaptitude professionnelle", definition: "Constat médical du médecin du travail qu'un salarié ne peut plus occuper son poste. L'employeur doit rechercher un reclassement avant de licencier.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Plan de Sauvegarde de l'Emploi (PSE)", definition: "Obligatoire pour les licenciements collectifs de +10 salariés dans une entreprise de +50 salariés. Doit inclure des mesures de reclassement.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Accord de performance collective", definition: "Accord permettant de modifier durée du travail ou rémunération pour préserver l'emploi. Le salarié refusant peut être licencié (motif sui generis).", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Télétravail", definition: "Travail effectué hors des locaux de l'employeur, via les technologies. Droit ouvert depuis 2017, généralisé par le Covid. Accord ou charte nécessaire.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Droit à la déconnexion", definition: "Droit pour le salarié de ne pas être connecté aux outils numériques professionnels en dehors de ses horaires. Doit faire l'objet d'une charte ou d'un accord.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Forfait jours", definition: "Convention individuelle de forfait pour cadres autonomes: 218 jours/an max. Pas d'heures supplémentaires mais repos obligatoires. Fait l'objet de contentieux.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Astreinte", definition: "Période où le salarié doit rester disponible sans être sur son lieu de travail. Compensée financièrement même si aucune intervention n'a lieu.", categorie: "Droit du travail", importance: "basse" },
    { terme: "Portabilité des droits", definition: "Conservation des droits à la prévoyance et mutuelle pendant 12 mois max après rupture du contrat. Financée par les anciens collègues via la mutualisation.", categorie: "Droit du travail", importance: "basse" },

    // ===== PROTECTION SOCIALE ÉLARGIE =====
    { terme: "APA", definition: "Allocation Personnalisée d'Autonomie. Aide aux personnes âgées dépendantes (GIR 1 à 4) pour financer les soins à domicile ou en établissement.", categorie: "Protection sociale", importance: "basse" },
    { terme: "MDPH", definition: "Maison Départementale des Personnes Handicapées. Attribue les droits liés au handicap: AAH, RQTH, PCH, carte mobilité inclusion.", categorie: "Protection sociale", importance: "basse" },
    { terme: "AAH", definition: "Allocation aux Adultes Handicapés. Revenu de substitution pour les personnes handicapées ne pouvant pas travailler. ~1 000€/mois.", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "RSA", definition: "Revenu de Solidarité Active. Minimum social garantissant un revenu aux personnes sans ressources ou à faibles ressources (~635€/mois personne seule). Géré par les départements.", categorie: "Protection sociale", importance: "haute" },
    { terme: "Prime d'activité", definition: "Complément de revenu pour les travailleurs modestes. Versée par la CAF, cumulable avec un salaire. Environ 4 millions de bénéficiaires.", categorie: "Protection sociale", importance: "haute" },
    { terme: "APL", definition: "Aide Personnalisée au Logement. Aide de la CAF pour réduire le loyer ou les mensualités. Versée directement au bailleur dans la plupart des cas.", categorie: "Protection sociale", importance: "haute" },
    { terme: "Minimum vieillesse (ASPA)", definition: "Allocation de Solidarité aux Personnes Agées. Revenu minimum garanti aux retraités ayant une retraite insuffisante (~916€/mois en 2025).", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "Complémentaire santé obligatoire", definition: "Depuis 2016, l'employeur doit proposer une mutuelle à tous ses salariés et financer 50% de la cotisation.", categorie: "Protection sociale", importance: "haute" },

    // ===== EMPLOI ÉLARGI =====
    { terme: "NEET", definition: "Not in Education, Employment or Training. Jeunes ni en emploi, ni en études, ni en formation. En France: ~12% des 15-29 ans.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Halo du chômage", definition: "Personnes proches du chômage mais non comptées dans le taux BIT: découragés, disponibles mais ne cherchant plus, cherchant mais pas disponibles.", categorie: "Emploi", importance: "moyenne" },
    { terme: "SAS (Travail saisonnier)", definition: "Contrat de travail pour des activités saisonnières (agriculture, tourisme). Permet les CDD successifs sans délai de carence.", categorie: "Emploi", importance: "basse" },
    { terme: "Portage salarial", definition: "Forme hybride entre salariat et indépendance. Une entreprise de portage emploie le consultant qui facture ses clients. Il bénéficie de la protection salariale.", categorie: "Emploi", importance: "basse" },
    { terme: "Groupement d'employeurs", definition: "Structure permettant à plusieurs PME de partager des salariés à temps partiel. Évite le travail précaire tout en offrant de la flexibilité aux employeurs.", categorie: "Emploi", importance: "basse" },
    { terme: "Emplois francs", definition: "Aide à l'embauche pour les personnes résidant dans les quartiers prioritaires de la politique de la ville (QPV). 5 000€/an sur 3 ans pour un CDI.", categorie: "Emploi", importance: "basse" },
    { terme: "Contrat de professionnalisation", definition: "Alternance combinant formation et travail en entreprise pour adultes (+ de 26 ans) ou jeunes. Salaire: 55 à 100% du SMIC selon l'âge et le diplôme.", categorie: "Emploi", importance: "moyenne" },
    { terme: "CEJ", definition: "Contrat d'Engagement Jeune. Accompagnement intensif des jeunes NEET vers l'emploi (15h+ activités/semaine). Allocation allant jusqu'à 528€/mois.", categorie: "Emploi", importance: "basse" },

    // ===== INDICATEURS ÉCONOMIQUES =====
    { terme: "Taux d'épargne", definition: "Part du revenu disponible non consommée. Élevé en France (~17%). Monte en période d'incertitude (épargne de précaution).", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Confiance des ménages", definition: "Indicateur INSEE mensuel mesurant l'optimisme/pessimisme des ménages sur leur situation financière et l'économie. Prédit la consommation.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "PMI", definition: "Purchasing Managers Index. Enquête mensuelle auprès des directeurs achats. Au-dessus de 50 = expansion, en dessous = contraction. Indicateur avancé.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "ISM", definition: "Institute for Supply Management. Équivalent américain du PMI, très suivi par les marchés financiers.", categorie: "Indicateurs", importance: "basse" },
    { terme: "IPC", definition: "Indice des Prix à la Consommation. Mesure l'inflation ressentie par les ménages. Panier de référence de ~300 produits et services mis à jour annuellement.", categorie: "Indicateurs", importance: "haute" },
    { terme: "IPCH", definition: "Indice des Prix à la Consommation Harmonisé. Version européenne de l'IPC, permettant des comparaisons entre pays de la zone euro.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Déflateur du PIB", definition: "Mesure de l'inflation basée sur l'ensemble de la production (vs panier de consommation pour l'IPC). Utilisé pour calculer le PIB en volume.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Taux de marge", definition: "Excédent Brut d'Exploitation (EBE) / Valeur Ajoutée. Mesure la part de la richesse produite captée par le capital. France: ~32,5% en 2024.", categorie: "Indicateurs", importance: "haute" },
    { terme: "GFCF", definition: "Formation Brute de Capital Fixe. Mesure l'investissement des entreprises, ménages et administrations. Indicateur de la capacité productive future.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Taux d'emploi", definition: "Part de la population en âge de travailler (15-64 ans) ayant un emploi. Objectif UE: 78% en 2030. France: ~69%.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Enquête ACEMO", definition: "Enquête sur l'Activité et les Conditions d'EMploi de la main-d'Œuvre. Source DARES pour les statistiques sur les salaires et le temps de travail.", categorie: "Indicateurs", importance: "basse" },

    // ===== PARTAGE DE LA VALEUR =====
    { terme: "Valeur ajoutée (VA)", definition: "Richesse créée par une entreprise = Production - Consommations intermédiaires. Se partage entre salaires, cotisations, impôts, amortissements et profits.", categorie: "Partage VA", importance: "haute" },
    { terme: "EBE (Excédent Brut d'Exploitation)", definition: "Part de la VA restant à l'entreprise après paiement des salaires et impôts de production. Finance l'investissement, la dette et les dividendes.", categorie: "Partage VA", importance: "haute" },
    { terme: "Taux de profit", definition: "Rapport entre le profit et le capital investi. Indicateur de la rentabilité du capital. En hausse depuis les années 1980.", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Coût du travail", definition: "Total des dépenses liées à l'emploi: salaire brut + cotisations patronales - aides de l'État. France: parmi les plus élevés d'Europe mais compensé par la productivité.", categorie: "Partage VA", importance: "haute" },
    { terme: "Part salariale", definition: "Part des salaires (+ cotisations) dans la valeur ajoutée. En France: ~58%. En baisse de ~10 points depuis 1980 au profit du capital.", categorie: "Partage VA", importance: "haute" },
    { terme: "Coefficient de Gini", definition: "Mesure les inégalités de revenus: 0 = égalité parfaite, 1 = inégalité maximale. France: 0,29 (relativement égalitaire vs 0,41 aux USA).", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Rapport D9/D1", definition: "Rapport entre le 9ème décile et le 1er décile de salaires. Mesure l'écart entre hauts et bas salaires. France: D9/D1 ≈ 2,9 (relativement faible).", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Top 1%", definition: "Les 1% les plus riches. En France, leur part dans les revenus est passée de ~7% (1980) à ~10-11% (2024). Moins extrême qu'aux USA (~20%).", categorie: "Partage VA", importance: "moyenne" },

    // ===== IRP ET REPRÉSENTATION =====
    { terme: "Procès-verbal de carence", definition: "Document constatant qu'aucun candidat ne s'est présenté aux élections CSE. L'employeur est dispensé d'organiser de nouvelles élections pendant 4 ans.", categorie: "IRP", importance: "basse" },
    { terme: "Base de données économiques (BDES/BDESE)", definition: "Base de Données Économiques Sociales et Environnementales. Mise à disposition du CSE pour l'exercice de ses missions. Contenu défini par accord ou décret.", categorie: "IRP", importance: "haute" },
    { terme: "Consultation récurrente", definition: "3 consultations annuelles obligatoires du CSE: orientations stratégiques, situation économique et financière, politique sociale.", categorie: "IRP", importance: "haute" },
    { terme: "Droit d'alerte économique", definition: "Possibilité pour le CSE de demander des informations à l'employeur en cas de préoccupation sur la situation économique de l'entreprise.", categorie: "IRP", importance: "haute" },
    { terme: "Droit d'alerte sociale", definition: "Le CSE peut alerter l'employeur et l'inspecteur du travail sur toute atteinte aux droits des personnes ou tout fait contraire aux réglementations.", categorie: "IRP", importance: "haute" },
    { terme: "Commission de suivi", definition: "Instance paritaire créée par un accord pour surveiller son application. Obligatoire pour certains accords collectifs (participation, intéressement...).", categorie: "IRP", importance: "basse" },
    { terme: "RSS", definition: "Représentant Syndical au Comité Social et Économique. Désigné par les OS dans les entreprises >500 salariés. Assiste aux séances du CSE sans voix délibérative.", categorie: "IRP", importance: "basse" },

    // ===== EUROPE ÉLARGI =====
    { terme: "Fonds structurels (FSE+)", definition: "Fonds Social Européen Plus. Finance la formation, l'emploi et l'inclusion en Europe. La France bénéficie de ~5 Mds€ sur 2021-2027.", categorie: "Europe", importance: "basse" },
    { terme: "Semestre européen", definition: "Cycle annuel de coordination des politiques économiques entre les États membres. La Commission émet des recommandations sur les budgets nationaux.", categorie: "Europe", importance: "basse" },
    { terme: "Mécanisme Européen de Stabilité (MES)", definition: "Fonds de secours pour les États de la zone euro en difficulté financière. A aidé Grèce, Irlande, Portugal, Espagne, Chypre post-2010.", categorie: "Europe", importance: "basse" },
    { terme: "Pacte de stabilité et de croissance", definition: "Règles budgétaires de l'UE: déficit <3% du PIB, dette <60%. Suspendu pendant le Covid, réformé en 2024 pour plus de flexibilité.", categorie: "Europe", importance: "moyenne" },
    { terme: "ETUI", definition: "European Trade Union Institute. Centre de recherche de la CES (Confédération Européenne des Syndicats). Produit des études sur le droit social européen.", categorie: "Europe", importance: "basse" },
    { terme: "Comité d'entreprise européen (CEE)", definition: "Instance de représentation des salariés dans les multinationales opérant dans 2+ pays de l'UE avec >1000 salariés au total.", categorie: "Europe", importance: "moyenne" },

    // ===== ENVIRONNEMENT ET TRANSITION =====
    { terme: "Taxe carbone", definition: "Prélèvement sur les émissions de CO₂. En France via la contribution énergie-climat. Objectif: inciter à réduire les émissions et financer la transition.", categorie: "Environnement", importance: "moyenne" },
    { terme: "Marché carbone (ETS)", definition: "Système d'échange de quotas d'émissions européen. Les entreprises polluantes doivent acheter des droits à polluer. Prix: ~60-90€/tonne CO₂.", categorie: "Environnement", importance: "basse" },
    { terme: "Emplois verts", definition: "Emplois contribuant à réduire l'impact environnemental. En forte croissance: énergies renouvelables, rénovation thermique, transports durables.", categorie: "Environnement", importance: "basse" },
    { terme: "Devoir de vigilance", definition: "Loi 2017 obligeant les grandes entreprises françaises à identifier et prévenir les risques sociaux et environnementaux de leurs filiales et sous-traitants.", categorie: "Environnement", importance: "moyenne" },
    { terme: "Bilan carbone (bilan GES)", definition: "Inventaire des émissions de gaz à effet de serre d'une organisation. Obligatoire pour les entreprises >500 salariés tous les 4 ans.", categorie: "Environnement", importance: "basse" },

    // ===== NUMÉRIQUE ET FUTUR DU TRAVAIL =====
    { terme: "Plateforme (travail)", definition: "Modèle d'entreprise utilisant une application pour mettre en relation des travailleurs indépendants avec des clients (Uber, Deliveroo). Statut juridique contesté.", categorie: "Numérique", importance: "haute" },
    { terme: "Ubérisation", definition: "Transformation d'un secteur par des plateformes numériques remplaçant des emplois salariés par du travail indépendant. Désintermédie et flexibilise.", categorie: "Numérique", importance: "haute" },
    { terme: "IA et emploi", definition: "Les études divergent: l'IA détruirait 30% des emplois actuels (McKinsey) mais en créerait autant. Les emplois routiniers (bureau, logistique) sont les plus exposés.", categorie: "Numérique", importance: "haute" },
    { terme: "Revenu universel de base (RUB)", definition: "Allocation versée à tous les citoyens sans condition. Expérimenté en Finlande (2017-2018), Écosse, Espagne. Débat sur son financement et ses effets sur l'offre de travail.", categorie: "Numérique", importance: "basse" },
    { terme: "Semaine de 4 jours", definition: "Organisation du travail sur 4 jours au lieu de 5, sans réduction de salaire. Expérimentée dans plusieurs pays (Islande, Belgique, UK). Résultats positifs sur le bien-être.", categorie: "Numérique", importance: "moyenne" },
  ];

  const categories = [...new Set(glossaire.map(g => g.categorie))].sort();
  const [filtreCategorie, setFiltreCategorie] = useState('all');
  const [recherche, setRecherche] = useState('');
  const [filtreImportance, setFiltreImportance] = useState('all');

  const glossaireFiltre = glossaire.filter(g => {
    const matchCategorie = filtreCategorie === 'all' || g.categorie === filtreCategorie;
    const matchRecherche = recherche === '' || 
      g.terme.toLowerCase().includes(recherche.toLowerCase()) || 
      g.definition.toLowerCase().includes(recherche.toLowerCase());
    const matchImportance = filtreImportance === 'all' || g.importance === filtreImportance;
    return matchCategorie && matchRecherche && matchImportance;
  });

  // Grouper par catégorie pour l'affichage
  const glossaireParCategorie = glossaireFiltre.reduce((acc, item) => {
    if (!acc[item.categorie]) acc[item.categorie] = [];
    acc[item.categorie].push(item);
    return acc;
  }, {});

  const importanceColors = {
    haute: darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200',
    moyenne: darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200',
    basse: darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
  };

  const importanceBadge = {
    haute: { bg: darkMode ? 'bg-red-700' : 'bg-red-500', text: '⭐ Essentiel' },
    moyenne: { bg: darkMode ? 'bg-yellow-700' : 'bg-yellow-500', text: 'Important' },
    basse: { bg: darkMode ? 'bg-gray-600' : 'bg-gray-400', text: 'Utile' }
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-purple-600 to-indigo-600'} text-white`}>
        <h2 className="text-lg font-bold">📖 Aide & Glossaire</h2>
        <p className="text-sm opacity-80">Plus de 270 termes expliqués pour maîtriser les NAO et l'économie</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 flex-wrap">
        {[['glossaire', '📚 Glossaire'], ['indicateurs', '📊 Indicateurs'], ['sources', '🔗 Sources'], ['methodologie', '🔬 Méthodologie']].map(([id, label]) => (
          <button 
            key={id} 
            onClick={() => setOpenSection(id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${openSection === id ? 'bg-purple-600 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GLOSSAIRE */}
      {openSection === 'glossaire' && (
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
          {/* Filtres */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="🔍 Rechercher un terme..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
            />
            <select
              value={filtreCategorie}
              onChange={(e) => setFiltreCategorie(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="all">📁 Toutes catégories ({glossaire.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat} ({glossaire.filter(g => g.categorie === cat).length})</option>
              ))}
            </select>
            <select
              value={filtreImportance}
              onChange={(e) => setFiltreImportance(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="all">⭐ Toute importance</option>
              <option value="haute">⭐ Essentiels uniquement</option>
              <option value="moyenne">📌 Importants</option>
              <option value="basse">📎 Utiles</option>
            </select>
          </div>

          {/* Stats rapides */}
          <div className={`flex gap-4 mb-4 p-2 rounded-lg text-xs ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
            <span><strong>{glossaireFiltre.length}</strong> termes affichés</span>
            <span className="text-red-500">⭐ {glossaireFiltre.filter(g => g.importance === 'haute').length} essentiels</span>
            <span className="text-yellow-500">📌 {glossaireFiltre.filter(g => g.importance === 'moyenne').length} importants</span>
            <span>{Object.keys(glossaireParCategorie).length} catégories</span>
          </div>

          {/* Liste groupée par catégorie */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {Object.entries(glossaireParCategorie).sort().map(([categorie, termes]) => (
              <div key={categorie}>
                <h4 className={`font-bold text-sm mb-2 sticky top-0 py-1 ${darkMode ? 'bg-gray-800 text-purple-400' : 'bg-white text-purple-700'}`}>
                  {categorie} ({termes.length})
                </h4>
                <div className="space-y-2">
                  {termes.sort((a, b) => a.terme.localeCompare(b.terme)).map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border transition-all hover:scale-[1.01] ${importanceColors[item.importance]}`}
                    >
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <span className={`font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                          {item.terme}
                        </span>
                        <div className="flex gap-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg text-white ${importanceBadge[item.importance].bg}`}>
                            {importanceBadge[item.importance].text}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm mt-1 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.definition}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {glossaireFiltre.length === 0 && (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="text-4xl mb-2">🔍</div>
              <p>Aucun terme trouvé pour cette recherche</p>
              <button 
                onClick={() => { setRecherche(''); setFiltreCategorie('all'); setFiltreImportance('all'); }}
                className="mt-2 text-purple-500 hover:underline text-sm"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}

          <p className={`text-xs mt-4 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            💡 Astuce : Les termes ⭐ Essentiels sont ceux à maîtriser en priorité pour les NAO
          </p>
        </div>
      )}

      {/* INDICATEURS */}
      {openSection === 'indicateurs' && (
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
          <h3 className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📊 Comment lire les indicateurs</h3>
          
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} border`}>
            <h4 className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-800'}`}>🟢 Indicateurs positifs</h4>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              <li>• <b>PIB en hausse</b> → Croissance économique, plus de richesses à partager</li>
              <li>• <b>Salaires {">"} Inflation</b> → Gain de pouvoir d'achat</li>
              <li>• <b>Chômage en baisse</b> → Marché du travail favorable aux salariés</li>
            </ul>
          </div>

          <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border`}>
            <h4 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-800'}`}>🔴 Indicateurs d'alerte</h4>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              <li>• <b>Inflation {">"} Salaires</b> → Perte de pouvoir d'achat</li>
              <li>• <b>Défaillances en hausse</b> → Difficultés économiques des entreprises</li>
              <li>• <b>Taux de marge élevé</b> → Les profits augmentent plus que les salaires</li>
            </ul>
          </div>

          <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
            <h4 className={`font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>💡 Note de lecture</h4>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              <li>• <b>Inflation cumulée</b> → "Depuis 2022, les prix ont augmenté de X%, nos salaires doivent suivre"</li>
              <li>• <b>Partage VA</b> → "Le taux de marge est à X%, il y a de la place pour augmenter les salaires"</li>
              <li>• <b>Comparaison UE</b> → "En Allemagne, le SMIC est X% plus élevé"</li>
              <li>• <b>Tensions recrutement</b> → "X% des entreprises ont du mal à recruter, augmentez pour fidéliser"</li>
            </ul>
          </div>
        </div>
      )}

      {/* SOURCES */}
      {openSection === 'sources' && (
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
          <h3 className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🔗 Sources des données</h3>
          
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { nom: "INSEE", url: "https://www.insee.fr", desc: "PIB, inflation, emploi, salaires", color: "blue" },
              { nom: "DARES", url: "https://dares.travail-emploi.gouv.fr", desc: "Emploi, chômage, conditions de travail", color: "green" },
              { nom: "France Travail", url: "https://www.francetravail.fr/statistiques", desc: "Offres d'emploi, tensions métiers, BMO", color: "purple" },
              { nom: "URSSAF", url: "https://www.urssaf.fr", desc: "Cotisations, PPV, masse salariale", color: "orange" },
              { nom: "Banque de France", url: "https://www.banque-france.fr", desc: "Défaillances, crédit, conjoncture", color: "cyan" },
              { nom: "Légifrance", url: "https://www.legifrance.gouv.fr", desc: "Conventions collectives, textes de loi", color: "red" },
              { nom: "Ministère du Travail", url: "https://travail-emploi.gouv.fr", desc: "SMIC, comité de suivi branches", color: "indigo" },
              { nom: "Eurostat", url: "https://ec.europa.eu/eurostat", desc: "Comparaisons européennes", color: "yellow" }
            ].map((source, idx) => (
              <a 
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-xl border transition-colors ${darkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full bg-${source.color}-500`}></span>
                  <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{source.nom}</span>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{source.desc}</p>
              </a>
            ))}
          </div>

          <div className={`p-3 rounded-xl ${darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border`}>
            <p className={`text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
              ⚠️ <b>Note</b> : Les données sont mises à jour automatiquement via des API publiques. 
              Certaines données (conventions collectives) sont vérifiées manuellement.
            </p>
          </div>
        </div>
      )}

      {/* METHODOLOGIE */}
      {openSection === 'methodologie' && (
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
          <h3 className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🔬 Méthodologie</h3>
          
          <div className={`space-y-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📈 Pouvoir d'achat cumulé</h4>
              <p className="mt-1">Calculé comme l'écart cumulé entre l'évolution des salaires et l'inflation depuis 2019. Un chiffre négatif indique une perte de pouvoir d'achat.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🧮 Simulateur NAO</h4>
              <p className="mt-1">Les calculs du RGDU 2026 sont basés sur le décret n°2025-1446. Le taux de réduction suit la formule officielle avec P=1.75 et un plancher de 2%.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📋 Conformité SMIC</h4>
              <p className="mt-1">Une branche est "non conforme" si au moins un niveau de sa grille de classification est inférieur au SMIC en vigueur.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>💰 Coût employeur (Superbrut)</h4>
              <p className="mt-1">Inclut : maladie (13%), vieillesse (10.57%), allocations familiales (5.25%), chômage (4.25%), retraite complémentaire (~6%), FNAL, formation, AT/MP (~2%). Total ~43% avant réductions.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🔄 Fréquence de mise à jour</h4>
              <ul className="mt-1 space-y-1">
                <li>• <b>Quotidien</b> : données via API (inflation, emploi...)</li>
                <li>• <b>Trimestriel</b> : PIB, comptes nationaux</li>
                <li>• <b>Manuel</b> : conventions collectives (après revalorisations SMIC)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <p>Tableau de bord développé pour la CFTC • Données publiques • Open source</p>
        <p className="mt-1">💡 Suggestion ? Bug ? Contactez <a href="mailto:hspringragain@cftc.fr" className="underline">hspringragain@cftc.fr</a></p>
      </div>
    </div>
  );
}
