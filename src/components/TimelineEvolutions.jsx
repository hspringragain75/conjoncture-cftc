import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';

export default function TimelineEvolutions({ d, darkMode }) {
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
            <div className={`text-xl font-black ${bilanPA >= 0 ? 'text-[#0d4093]' : 'text-orange-500'}`}>
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

        <p className={`text-xs mt-3 ${bilanPA >= 0 ? 'text-[#0d4093]' : 'text-orange-500'} font-medium`}>
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
