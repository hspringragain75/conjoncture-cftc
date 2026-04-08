import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, Cell, PieChart, Pie
} from 'recharts';
import Card from '../components/Card';
import BubbleKpi from '../components/BubbleKpi';
import BubbleSubTabs from '../components/BubbleSubTabs';
import BubbleNote from '../components/BubbleNote';

// ============================================================================
// ONGLET FINANCES PUBLIQUES & SOCIALES — CFTC Dashboard
// ============================================================================

const C = {
  primary:    '#3b82f6',
  secondary:  '#ef4444',
  tertiary:   '#22c55e',
  quaternary: '#f59e0b',
  pink:       '#ec4899',
  purple:     '#8b5cf6',
  cyan:       '#06b6d4',
  orange:     '#f97316',
  gray:       '#6b7280',
};

// Helper défensif — garantit toujours un vrai tableau, quoi que retourne l'API
const safeArr = (v) => (Array.isArray(v) ? v : []);

// Tooltip personnalisé réutilisable (même style que les autres tabs)
const TooltipBulle = ({ active, payload, label, suffix = '%', darkMode }) => {
  if (!active) return null;
  const safePayload = Array.isArray(payload) ? payload : [];
  if (safePayload.length === 0) return null;
  return (
    <div className={`px-3 py-2 rounded-xl shadow-lg text-xs border ${
      darkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
    }`}>
      <p className="font-semibold mb-1">{label}</p>
      {safePayload.map((p, i) => (
        <p key={i} style={{ color: p?.color }}>
          {p?.name} : <strong>{typeof p?.value === 'number' ? p.value.toFixed(1) : p?.value}{suffix}</strong>
        </p>
      ))}
    </div>
  );
};

// Badge coloré selon valeur (rouge si dépasse seuil)
function Badge({ val, seuil, suffixe = '%', invertColor = false }) {
  if (val == null) return <span className="text-gray-400 text-sm">—</span>;
  const bad = invertColor ? val < seuil : val > seuil;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
      bad ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    }`}>
      {val > 0 && !invertColor ? '+' : ''}{val}{suffixe}
    </span>
  );
}

// ─── SOUS-ONGLET : VUE D'ENSEMBLE ────────────────────────────────────────────
function VueEnsemble({ fp, darkMode }) {
  const evo = (fp?.evolution && typeof fp.evolution === 'object') ? fp.evolution : {};
  const dette    = safeArr(evo.dette);
  const deficit  = safeArr(evo.deficit);
  const depenses = safeArr(evo.depenses);
  const recettes = safeArr(evo.recettes);
  const po       = safeArr(evo.prelevements_obligatoires);

  // Fusion en une seule série pour le graphique consolidé
  const annees = [...new Set([
    ...dette.map(d => d.annee),
    ...deficit.map(d => d.annee),
    ...depenses.map(d => d.annee),
    ...recettes.map(d => d.annee),
  ])].sort();

  const detteDict   = Object.fromEntries(dette.map(d => [d.annee, d.valeur]));
  const deficitDict = Object.fromEntries(deficit.map(d => [d.annee, d.valeur]));
  const depDict     = Object.fromEntries(depenses.map(d => [d.annee, d.valeur]));
  const recDict     = Object.fromEntries(recettes.map(d => [d.annee, d.valeur]));
  const poDict      = Object.fromEntries(po.map(d => [d.annee, d.valeur]));

  const consolidee = annees.map(a => ({
    annee:    a,
    dette:    detteDict[a]   ?? null,
    deficit:  deficitDict[a] ?? null,
    depenses: depDict[a]     ?? null,
    recettes: recDict[a]     ?? null,
    po:       poDict[a]      ?? null,
  }));

  // KPIs courants
  const anneeRef = fp?.annee_reference;
  const kpis = [
    {
      label: '🏛️ Dette / PIB',
      value: fp?.dette_publique_pib != null ? `${fp.dette_publique_pib}%` : '—',
      status: fp?.dette_publique_pib > 100 ? 'danger' : fp?.dette_publique_pib > 80 ? 'warning' : 'ok',
      tooltip: `Critère Maastricht : 60% max • Données ${anneeRef || ''}`,
    },
    {
      label: '📉 Déficit / PIB',
      value: fp?.deficit_public_pib != null ? `${fp.deficit_public_pib}%` : '—',
      status: fp?.deficit_public_pib < -3 ? 'danger' : fp?.deficit_public_pib < -1 ? 'warning' : 'ok',
      tooltip: `Règle UE : -3% max • Données ${anneeRef || ''}`,
    },
    {
      label: '💸 Dépenses APU',
      value: fp?.depenses_apu_pib != null ? `${fp.depenses_apu_pib}%` : '—',
      status: 'info',
      tooltip: `% du PIB • 2e rang UE • Données ${anneeRef || ''}`,
    },
    {
      label: '🧾 Prélèvements oblig.',
      value: fp?.prelevements_obligatoires_pib != null ? `${fp.prelevements_obligatoires_pib}%` : '—',
      status: 'info',
      tooltip: `% du PIB • Données ${anneeRef || ''}`,
    },
    {
      label: '📈 Charge dette',
      value: fp?.charge_dette_pib != null ? `${fp.charge_dette_pib}%` : '—',
      status: fp?.charge_dette_pib > 2 ? 'warning' : 'ok',
      tooltip: `Intérêts de la dette / PIB • Données ${anneeRef || ''}`,
    },
    {
      label: '🔨 Investissement pub.',
      value: fp?.fbcf_apu_pib != null ? `${fp.fbcf_apu_pib}%` : '—',
      status: 'info',
      tooltip: `FBCF des APU / PIB • Données ${anneeRef || ''}`,
    },
  ];

  const dmClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const dmSub   = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {kpis.map((k, i) => (
          <BubbleKpi
            key={i}
            label={k.label}
            value={k.value}
            status={k.status}
            darkMode={darkMode}
            tooltip={k.tooltip}
          />
        ))}
      </div>

      {/* Graphique dette + déficit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card darkMode={darkMode} className="p-4">
          <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
            🏛️ Dette publique <span className={dmSub}>(% PIB)</span>
          </h3>
          {consolidee.length === 0 ? (
            <p className={`text-sm text-center py-8 ${dmSub}`}>Données en cours de chargement…</p>
          ) : (
          <div style={{width:"100%",overflowX:"hidden"}}>
            <AreaChart width={800} height={200} data={consolidee} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradDette" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.secondary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="annee" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} unit="%" />
              <Tooltip content={<TooltipBulle suffix="%" darkMode={darkMode} />} />
              <ReferenceLine y={60}  stroke="#ef4444" strokeDasharray="4 2" label={{ value: "60% Maastricht", fontSize: 9, fill: '#ef4444' }} />
              <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "100%", fontSize: 9, fill: '#f59e0b' }} />
              <Area type="monotone" dataKey="dette" name="Dette" stroke={C.secondary} fill="url(#gradDette)" strokeWidth={2} dot={false} connectNulls />
            </AreaChart>
          </div>
          )}
        </Card>

        <Card darkMode={darkMode} className="p-4">
          <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
            📉 Déficit public <span className={dmSub}>(capacité de financement APU, % PIB)</span>
          </h3>
          {consolidee.length === 0 ? (
            <p className={`text-sm text-center py-8 ${dmSub}`}>Données en cours de chargement…</p>
          ) : (
          <div style={{width:"100%",overflowX:"hidden"}}>
            <BarChart width={800} height={200} data={consolidee.slice(-8)} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="annee" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} unit="%" />
              <ReferenceLine y={-3} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "-3% règle UE", fontSize: 9, fill: '#ef4444' }} />
              <ReferenceLine y={0} stroke={darkMode ? '#4b5563' : '#d1d5db'} />
              <Bar dataKey="deficit" name="Déficit" radius={[4, 4, 0, 0]}>
                {consolidee.slice(-8).map((e, i) => (
                  <Cell key={i} fill={e.deficit < -3 ? C.secondary : C.primary} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </div>
          )}
        </Card>
      </div>

      {/* Recettes vs Dépenses */}
      <Card darkMode={darkMode} className="p-4">
        <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
          ⚖️ Recettes vs Dépenses des APU <span className={dmSub}>(% PIB)</span>
        </h3>
        {consolidee.length === 0 ? (
          <p className={`text-sm text-center py-8 ${dmSub}`}>Données en cours de chargement…</p>
        ) : (
        <div style={{width:"100%",overflowX:"hidden"}}>
          <LineChart width={800} height={220} data={consolidee} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
            <XAxis dataKey="annee" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} unit="%" />
            <Tooltip content={<TooltipBulle suffix="%" darkMode={darkMode} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="depenses" name="Dépenses APU" stroke={C.secondary} strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="recettes" name="Recettes APU" stroke={C.tertiary} strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="po" name="Prél. obligatoires" stroke={C.primary} strokeWidth={2} dot={false} strokeDasharray="5 3" connectNulls />
          </LineChart>
        </div>
        )}
        <p className={`text-[10px] mt-1 ${dmSub}`}>Source : INSEE — Comptes des APU (API BDM)</p>
      </Card>

      {/* Notes de lecture */}
      {Array.isArray(fp?.notes_lecture) && fp.notes_lecture.length > 0 && (
        <BubbleNote darkMode={darkMode}>
          {fp.notes_lecture.map((n, i) => <p key={i}>{n}</p>)}
        </BubbleNote>
      )}
    </div>
  );
}

// ─── SOUS-ONGLET : DETTE & CHARGE ────────────────────────────────────────────
function DetteCharge({ fp, darkMode }) {
  const evo = (fp?.evolution && typeof fp.evolution === 'object') ? fp.evolution : {};
  const dette       = safeArr(evo.dette);
  const chargeDette = safeArr(evo.charge_dette);
  const invPub      = safeArr(evo.investissement_public);

  // Fusion dette + charge
  const annees = [...new Set([...dette.map(d => d.annee), ...chargeDette.map(d => d.annee)])].sort();
  const detteD  = Object.fromEntries(dette.map(d => [d.annee, d.valeur]));
  const chargeD = Object.fromEntries(chargeDette.map(d => [d.annee, d.valeur]));
  const invD    = Object.fromEntries(invPub.map(d => [d.annee, d.valeur]));

  const chartData = annees.map(a => ({
    annee: a, dette: detteD[a] ?? null, charge: chargeD[a] ?? null, investissement: invD[a] ?? null,
  }));

  const dmClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const dmSub   = darkMode ? 'text-gray-400' : 'text-gray-500';
  const dmCard  = darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Évolution dette */}
        <Card darkMode={darkMode} className="p-4">
          <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
            🏛️ Trajectoire de la dette <span className={dmSub}>(% PIB depuis 2015)</span>
          </h3>
          {chartData.length === 0 ? (
            <p className={`text-sm text-center py-8 ${dmSub}`}>Données en cours de chargement…</p>
          ) : (
          <div style={{width:"100%",overflowX:"hidden"}}>
            <AreaChart width={800} height={220} data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradDette2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.purple} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.purple} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="annee" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <YAxis domain={['auto', 'auto']} unit="%" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <Tooltip content={<TooltipBulle suffix="%" darkMode={darkMode} />} />
              <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 2"
                label={{ value: "60% Maastricht", position: 'right', fontSize: 9, fill: '#ef4444' }} />
              <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 2"
                label={{ value: "100%", position: 'right', fontSize: 9, fill: '#f59e0b' }} />
              <Area type="monotone" dataKey="dette" name="Dette" stroke={C.purple} fill="url(#gradDette2)" strokeWidth={2.5} dot={false} connectNulls />
            </AreaChart>
          </div>
          )}
        </Card>

        {/* Charge de la dette vs Investissement public */}
        <Card darkMode={darkMode} className="p-4">
          <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
            ⚡ Charge dette vs Investissement public <span className={dmSub}>(% PIB)</span>
          </h3>
          {chartData.length === 0 ? (
            <p className={`text-sm text-center py-8 ${dmSub}`}>Données en cours de chargement…</p>
          ) : (
          <div style={{width:"100%",overflowX:"hidden"}}>
            <LineChart width={800} height={220} data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="annee" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} unit="%" />
              <Tooltip content={<TooltipBulle suffix="%" darkMode={darkMode} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="charge" name="Charge intérêts" stroke={C.secondary} strokeWidth={2.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="investissement" name="Invest. public (FBCF APU)" stroke={C.cyan} strokeWidth={2} dot={false} strokeDasharray="5 3" connectNulls />
            </LineChart>
          </div>
          )}
          <p className={`text-[10px] mt-1 ${dmSub}`}>Source : INSEE API BDM</p>
        </Card>
      </div>

      {/* Comparaison UE dette */}
      <Card darkMode={darkMode} className="p-4">
        <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
          🇪🇺 Dette publique en Europe <span className={dmSub}>(% PIB — Eurostat 2024 provisoires)</span>
        </h3>
        {(() => {
          const pays = [
            { pays: 'Grèce',     code: 'GR', taux: 161.9 },
            { pays: 'Italie',    code: 'IT', taux: 137.3 },
            { pays: 'France',    code: 'FR', taux: 112.9 },
            { pays: 'Belgique',  code: 'BE', taux: 104.3 },
            { pays: 'Espagne',   code: 'ES', taux: 101.9 },
            { pays: 'Portugal',  code: 'PT', taux: 100.0 },
            { pays: 'Zone euro', code: 'EA', taux: 89.4 },
            { pays: 'UE-27',     code: 'EU', taux: 82.3 },
            { pays: 'Allemagne', code: 'DE', taux: 62.4 },
            { pays: 'Pays-Bas',  code: 'NL', taux: 43.8 },
          ];
          return (
            <div style={{width:"100%",overflowX:"hidden"}}>
              <BarChart width={800} height={220} data={pays} layout="vertical" margin={{ top: 0, right: 50, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} horizontal={false} />
                <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                <YAxis type="category" dataKey="pays" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} width={58} />
                <Tooltip content={<TooltipBulle suffix="%" darkMode={darkMode} />} />
                <ReferenceLine x={60} stroke="#ef4444" strokeDasharray="4 2" />
                <Bar dataKey="taux" name="Dette % PIB" radius={[0, 4, 4, 0]}>
                  {pays.map((p, i) => (
                    <Cell key={i} fill={
                      p.code === 'FR' ? C.primary :
                      p.taux > 100 ? '#fca5a5' :
                      p.code === 'EA' || p.code === 'EU' ? C.gray : C.cyan
                    } fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </div>
          );
        })()}
        <p className={`text-[10px] mt-1 ${dmSub}`}>Source : Eurostat 2024 provisoires • France en bleu</p>
      </Card>

      <BubbleNote darkMode={darkMode}>
        <p>📈 <strong>Charge des intérêts</strong> : 2e poste budgétaire de l'État en 2025 (61,8 Mds€, +18% vs 2024). La hausse des taux depuis 2022 alourdit structurellement la contrainte budgétaire.</p>
        <p>🔨 <strong>Investissement public</strong> : ~4% du PIB — parmi les plus élevés de l'UE, mais sous pression face à la consolidation budgétaire.</p>
      </BubbleNote>
    </div>
  );
}

// ─── SOUS-ONGLET : DÉPENSES DE L'ÉTAT ────────────────────────────────────────
function DepensesEtat({ fp, darkMode }) {
  const evo = (fp?.evolution && typeof fp.evolution === 'object') ? fp.evolution : {};
  const sante     = safeArr(evo.depenses_sante);
  const education = safeArr(evo.depenses_education);
  const protSoc   = safeArr(evo.depenses_protection_sociale);

  const dmClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const dmSub   = darkMode ? 'text-gray-400' : 'text-gray-500';

  // Missions PLF 2025 — données statiques (issues du module Python)
  const missions = [
    { mission: 'Enseignement scolaire',       mds: 63.7,  pct: 12.9, evolution_pct:  3.2, emoji: '🏫' },
    { mission: 'Charge de la dette',          mds: 61.8,  pct: 12.6, evolution_pct: 18.0, emoji: '💸' },
    { mission: 'Défense',                     mds: 50.5,  pct: 10.3, evolution_pct:  6.0, emoji: '🛡️' },
    { mission: 'Recherche & ensup.',           mds: 32.5,  pct:  6.6, evolution_pct:  2.1, emoji: '🔬' },
    { mission: 'Solidarité & exclusion',      mds: 30.2,  pct:  6.1, evolution_pct:  4.5, emoji: '🤝' },
    { mission: 'Sécurités',                   mds: 25.8,  pct:  5.2, evolution_pct:  2.8, emoji: '🚔' },
    { mission: 'Écologie & énergie',          mds: 18.3,  pct:  3.7, evolution_pct:  8.2, emoji: '🌿' },
    { mission: 'Travail & emploi',            mds: 22.1,  pct:  4.5, evolution_pct: -2.0, emoji: '💼' },
    { mission: 'Justice',                     mds: 12.2,  pct:  2.5, evolution_pct:  5.5, emoji: '⚖️' },
    { mission: 'Transports',                  mds:  9.6,  pct:  2.0, evolution_pct:  1.8, emoji: '🚆' },
  ];

  // Fusion sante + education pour graphe temporel
  const annees = [...new Set([...sante.map(d => d.annee), ...education.map(d => d.annee)])].sort();
  const santeD  = Object.fromEntries(sante.map(d => [d.annee, d.valeur]));
  const eduD    = Object.fromEntries(education.map(d => [d.annee, d.valeur]));
  const psD     = Object.fromEntries(protSoc.map(d => [d.annee, d.valeur]));

  const chartFonc = annees.map(a => ({
    annee: a, sante: santeD[a] ?? null, education: eduD[a] ?? null, prot_soc: psD[a] ?? null,
  }));

  return (
    <div className="space-y-4">
      {/* Top missions PLF */}
      <Card darkMode={darkMode} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-semibold ${dmClass}`}>
            📋 Budget de l'État par mission <span className={dmSub}>(PLF 2025 — Mds€)</span>
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
            Total 492 Mds€
          </span>
        </div>
        <div style={{width:"100%",overflowX:"hidden"}}>
          <BarChart width={800} height={260} data={[...missions].sort((a, b) => b.mds - a.mds)} layout="vertical"
            margin={{ top: 0, right: 80, left: 140, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} horizontal={false} />
            <XAxis type="number" unit=" Mds" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
            <YAxis type="category" dataKey="mission" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} width={136} />
            <Tooltip formatter={(v, n, p) => [`${v} Mds€ (${p.payload.evolution_pct > 0 ? '+' : ''}${p.payload.evolution_pct}%)`, n]} />
            <Bar dataKey="mds" name="Budget (Mds€)" radius={[0, 4, 4, 0]}>
              {[...missions].sort((a, b) => b.mds - a.mds).map((m, i) => (
                <Cell key={i} fill={
                  m.mission.includes('dette') ? C.secondary :
                  m.mission.includes('Défense') ? C.purple :
                  m.mission.includes('Enseignement') ? C.primary :
                  C.cyan
                } fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </div>
        <p className={`text-[10px] mt-1 ${dmSub}`}>Source : PLF 2025 — budget.gouv.fr • Données statiques (màj oct.)</p>
      </Card>

      {/* Évolution dépenses fonctionnelles */}
      <Card darkMode={darkMode} className="p-4">
        <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
          📊 Dépenses publiques par fonction <span className={dmSub}>(% PIB — API INSEE)</span>
        </h3>
        {chartFonc.length === 0 ? (
          <p className={`text-sm text-center py-8 ${dmSub}`}>Données en cours de chargement…</p>
        ) : (
        <div style={{width:"100%",overflowX:"hidden"}}>
          <LineChart width={800} height={200} data={chartFonc} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
            <XAxis dataKey="annee" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} unit="%" />
            <Tooltip content={<TooltipBulle suffix="%" darkMode={darkMode} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="prot_soc" name="Protection sociale" stroke={C.secondary} strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="sante" name="Santé" stroke={C.tertiary} strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="education" name="Éducation" stroke={C.primary} strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </div>
        )}

        {/* Tableau récap évolution missions */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {missions.filter(m => Math.abs(m.evolution_pct) >= 4).map((m, i) => (
            <div key={i} className={`rounded-xl p-3 border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-lg mb-0.5">{m.emoji}</p>
              <p className={`text-xs font-medium truncate ${dmClass}`}>{m.mission}</p>
              <p className={`text-lg font-bold mt-1 ${m.evolution_pct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {m.evolution_pct > 0 ? '+' : ''}{m.evolution_pct}%
              </p>
              <p className={`text-[10px] ${dmSub}`}>{m.mds} Mds€</p>
            </div>
          ))}
        </div>
      </Card>

      <BubbleNote darkMode={darkMode}>
        <p>💸 <strong>Remboursement de la dette</strong> : +18% en 2025 — dépasse pour la 1re fois le budget de la Défense en progression.</p>
        <p>🌿 <strong>Écologie & énergie</strong> : +8,2% — principale hausse structurelle hors dette.</p>
        <p>💼 <strong>Travail & emploi</strong> : -2% — réduction des aides à l'apprentissage et à l'alternance.</p>
      </BubbleNote>
    </div>
  );
}

// ─── SOUS-ONGLET : RECETTES & PRÉLÈVEMENTS ───────────────────────────────────
function RecettesPrelevements({ fp, darkMode }) {
  const evo = (fp?.evolution && typeof fp.evolution === 'object') ? fp.evolution : {};
  const po = safeArr(evo.prelevements_obligatoires);

  const dmClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const dmSub   = darkMode ? 'text-gray-400' : 'text-gray-500';

  // Recettes fiscales PLF 2025
  const impots = [
    { impot: 'TVA',              mds: 176.5, pct: 45.6, evolution_pct:  2.5, color: C.primary },
    { impot: 'IR',               mds: 100.3, pct: 25.9, evolution_pct:  4.1, color: C.cyan },
    { impot: 'IS',               mds:  67.2, pct: 17.4, evolution_pct: -5.2, color: C.purple },
    { impot: 'TICPE',            mds:  16.8, pct:  4.3, evolution_pct: -1.0, color: C.quaternary },
    { impot: 'Droits enreg.',    mds:  10.1, pct:  2.6, evolution_pct: -3.5, color: C.orange },
    { impot: 'IFI',              mds:   2.2, pct:  0.6, evolution_pct:  8.0, color: C.pink },
    { impot: 'Autres',           mds:  13.9, pct:  3.6, evolution_pct:  1.0, color: C.gray },
  ];

  // Comparaison PO UE
  const poUE = [
    { pays: 'Danemark',  code: 'DK', taux: 46.5 },
    { pays: 'Belgique',  code: 'BE', taux: 44.0 },
    { pays: 'France',    code: 'FR', taux: 43.5 },
    { pays: 'Italie',    code: 'IT', taux: 42.3 },
    { pays: 'Allemagne', code: 'DE', taux: 40.8 },
    { pays: 'Zone euro', code: 'EA', taux: 40.6 },
    { pays: 'Pays-Bas',  code: 'NL', taux: 39.2 },
    { pays: 'Espagne',   code: 'ES', taux: 38.5 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart recettes fiscales */}
        <Card darkMode={darkMode} className="p-4">
          <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
            🧾 Recettes fiscales de l'État <span className={dmSub}>(PLF 2025 — 387 Mds€ total)</span>
          </h3>
          <div className="flex items-center gap-4">
            <div style={{width:"100%",overflowX:"hidden"}}>
              <PieChart width={500} height={180}>
                <Pie data={impots} dataKey="mds" nameKey="impot" cx="50%" cy="50%"
                  outerRadius={75} innerRadius={40} paddingAngle={2}>
                  {impots.map((im, i) => <Cell key={i} fill={im.color} fillOpacity={0.85} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} Mds€`]} />
              </PieChart>
            </div>
            <div className="flex-1 space-y-1">
              {impots.map((im, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: im.color }} />
                    <span className={`text-xs ${dmClass}`}>{im.impot}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-medium ${dmClass}`}>{im.mds} Mds</span>
                    <span className={`text-[10px] ${im.evolution_pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {im.evolution_pct > 0 ? '+' : ''}{im.evolution_pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className={`text-[10px] mt-2 ${dmSub}`}>Source : DGFiP — PLF 2025 • Données statiques (màj oct.)</p>
        </Card>

        {/* Comparaison PO UE */}
        <Card darkMode={darkMode} className="p-4">
          <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
            🇪🇺 Prélèvements obligatoires en Europe <span className={dmSub}>(% PIB — Eurostat 2024)</span>
          </h3>
          <div style={{width:"100%",overflowX:"hidden"}}>
            <BarChart width={800} height={200} data={poUE} layout="vertical" margin={{ top: 0, right: 60, left: 65, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} horizontal={false} />
              <XAxis type="number" unit="%" domain={[35, 50]} tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <YAxis type="category" dataKey="pays" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} width={63} />
              <Tooltip content={<TooltipBulle suffix="%" darkMode={darkMode} />} />
              <Bar dataKey="taux" name="PO % PIB" radius={[0, 4, 4, 0]}>
                {poUE.map((p, i) => (
                  <Cell key={i} fill={p.code === 'FR' ? C.primary : p.code === 'EA' ? C.gray : C.cyan} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </Card>
      </div>

      {/* Évolution PO dans le temps */}
      {po.length > 0 && (
        <Card darkMode={darkMode} className="p-4">
          <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
            📈 Évolution des prélèvements obligatoires <span className={dmSub}>(% PIB — API INSEE)</span>
          </h3>
          <div style={{width:"100%",overflowX:"hidden"}}>
            <AreaChart width={800} height={180} data={po} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPO" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="annee" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <YAxis domain={['auto', 'auto']} unit="%" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
              <Tooltip content={<TooltipBulle suffix="%" darkMode={darkMode} />} />
              <Area type="monotone" dataKey="valeur" name="PO % PIB" stroke={C.primary} fill="url(#gradPO)" strokeWidth={2} dot={false} connectNulls />
            </AreaChart>
          </div>
        </Card>
      )}

      <BubbleNote darkMode={darkMode}>
        <p>📊 <strong>TVA</strong> : 1re recette fiscale (45,6% du total — 176,5 Mds€). Stable malgré la conjoncture.</p>
        <p>📉 <strong>IS en baisse (-5,2%)</strong> : reflux après les superprofits 2022-2023. La France reste attractive fiscalement pour les entreprises vs moyenne UE.</p>
        <p>🇫🇷 <strong>3e rang UE pour les PO</strong> : après le Danemark et la Belgique — prélèvements élevés mais finançant un modèle social parmi les plus développés.</p>
      </BubbleNote>
    </div>
  );
}

// ─── SOUS-ONGLET : PROTECTION SOCIALE & SÉCU ─────────────────────────────────
function ProtectionSociale({ fp, darkMode }) {
  const dmClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const dmSub   = darkMode ? 'text-gray-400' : 'text-gray-500';

  // Données DREES protection sociale (statiques)
  const risques = [
    { risque: 'Vieillesse-survie',          mds: 388.0, pct: 41.3, pct_pib: 13.7, evolution: 4.8,  emoji: '👴', color: C.purple },
    { risque: 'Maladie-invalidité',         mds: 285.0, pct: 30.4, pct_pib: 10.0, evolution: 3.2,  emoji: '🏥', color: C.secondary },
    { risque: 'Famille-maternité',          mds:  70.0, pct:  7.5, pct_pib:  2.5, evolution: 1.8,  emoji: '👨‍👩‍👧', color: C.tertiary },
    { risque: 'Chômage',                    mds:  50.0, pct:  5.3, pct_pib:  1.8, evolution: -3.5, emoji: '💼', color: C.quaternary },
    { risque: 'Dépendance',                 mds:  43.0, pct:  4.6, pct_pib:  1.5, evolution: 6.2,  emoji: '🧓', color: C.pink },
    { risque: 'Pauvreté-exclusion',         mds:  32.0, pct:  3.4, pct_pib:  1.1, evolution: 5.0,  emoji: '🤝', color: C.orange },
    { risque: 'Formation professionnelle',  mds:  35.0, pct:  3.6, pct_pib:  1.2, evolution: 2.8,  emoji: '📚', color: C.cyan },
    { risque: 'Logement',                   mds:  18.5, pct:  2.0, pct_pib:  0.7, evolution: 0.5,  emoji: '🏠', color: '#94a3b8' },
    { risque: 'Accidents du travail',       mds:  17.5, pct:  1.9, pct_pib:  0.6, evolution: 2.0,  emoji: '⚠️', color: '#fb923c' },
  ];

  // Soldes branches Sécu (PLFSS 2025)
  const branches = [
    { branche: 'Maladie', solde_2023: -10.8, solde_2024: -13.3, solde_2025: -15.0, emoji: '🏥', color: C.secondary },
    { branche: 'Retraites', solde_2023: -3.5, solde_2024: -4.2, solde_2025: -5.5, emoji: '👴', color: C.purple },
    { branche: 'Famille', solde_2023: 1.8, solde_2024: 1.0, solde_2025: 0.5, emoji: '👨‍👩‍👧', color: C.tertiary },
    { branche: 'AT-MP', solde_2023: 1.7, solde_2024: 1.5, solde_2025: 1.5, emoji: '⚠️', color: C.quaternary },
  ];

  const soldesTotalHistorique = [
    { annee: '2019', solde: -1.5 }, { annee: '2020', solde: -38.7 },
    { annee: '2021', solde: -24.3 }, { annee: '2022', solde: -19.6 },
    { annee: '2023', solde: -10.8 }, { annee: '2024', solde: -15.0 },
    { annee: '2025', solde: -18.5 },
  ];

  return (
    <div className="space-y-4">
      {/* Soldes des branches Sécu */}
      <Card darkMode={darkMode} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-semibold ${dmClass}`}>
            💊 Soldes des branches de la Sécurité Sociale <span className={dmSub}>(Mds€ — PLFSS 2025)</span>
          </h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700`}>
            Solde global : -18,5 Mds€
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {branches.map((b, i) => (
            <div key={i} className={`rounded-xl p-3 border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-xl mb-1">{b.emoji}</p>
              <p className={`text-xs font-semibold ${dmClass}`}>{b.branche}</p>
              <div className="mt-2 space-y-0.5">
                {[['2023', b.solde_2023], ['2024', b.solde_2024], ['2025 (P)', b.solde_2025]].map(([yr, val]) => (
                  <div key={yr} className="flex justify-between items-center">
                    <span className={`text-[10px] ${dmSub}`}>{yr}</span>
                    <span className={`text-xs font-bold ${val >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {val > 0 ? '+' : ''}{val} Mds
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{width:"100%",overflowX:"hidden"}}>
          <BarChart width={800} height={160} data={soldesTotalHistorique} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#f0f0f0'} />
            <XAxis dataKey="annee" tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} />
            <YAxis tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }} unit=" Mds" />
            <Tooltip formatter={(v) => [`${v} Mds€`, 'Solde global']} />
            <ReferenceLine y={0} stroke={darkMode ? '#4b5563' : '#d1d5db'} strokeWidth={2} />
            <Bar dataKey="solde" name="Solde Sécu" radius={[4, 4, 0, 0]}>
              {soldesTotalHistorique.map((s, i) => (
                <Cell key={i} fill={s.solde < 0 ? C.secondary : C.tertiary} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </div>
        <p className={`text-[10px] mt-1 ${dmSub}`}>Source : PLFSS 2025 — CCSS • Données statiques (màj oct.)</p>
      </Card>

      {/* Dépenses par risque */}
      <Card darkMode={darkMode} className="p-4">
        <h3 className={`text-sm font-semibold mb-3 ${dmClass}`}>
          🛡️ Dépenses de protection sociale par risque <span className={dmSub}>(DREES 2023 — 939 Mds€ total)</span>
        </h3>
        <div className="flex gap-4">
          <div style={{width:"100%",overflowX:"hidden"}}>
            <PieChart width={500} height={200}>
              <Pie data={risques} dataKey="mds" nameKey="risque" cx="50%" cy="50%"
                outerRadius={80} innerRadius={45} paddingAngle={2}>
                {risques.map((r, i) => <Cell key={i} fill={r.color} fillOpacity={0.85} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v} Mds€`]} />
            </PieChart>
          </div>
          <div className="flex-1 space-y-1.5">
            {risques.map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                  <span className={`text-xs ${dmClass}`}>{r.emoji} {r.risque}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold ${dmClass}`}>{r.pct}%</span>
                  <span className={`text-[10px] ${r.evolution < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {r.evolution > 0 ? '+' : ''}{r.evolution}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className={`text-[10px] mt-2 ${dmSub}`}>Source : DREES — Comptes de la protection sociale 2023</p>
      </Card>

      <BubbleNote darkMode={darkMode}>
        <p>💊 <strong>Maladie</strong> : déficit record attendu à -15 Mds€ en 2025. L'ONDAM 2025 est fixé à +3,3% (264 Mds€).</p>
        <p>👴 <strong>Retraites</strong> : le bénéfice budgétaire de la réforme 2023 (report à 64 ans) montera en charge progressivement — les économies plein régime sont attendues d'ici 2030.</p>
        <p>🧓 <strong>Dépendance</strong> : +6,2% — poste à plus forte croissance structurelle. La réforme annoncée reste en suspens.</p>
      </BubbleNote>
    </div>
  );
}

// ─── SOUS-ONGLET : COTISATIONS ────────────────────────────────────────────────
function Cotisations({ darkMode }) {
  const dmClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const dmSub   = darkMode ? 'text-gray-400' : 'text-gray-500';
  const dmCard  = darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200';

  const cotEmployeur = [
    { cotisation: 'Maladie-maternité',          taux: 13.0,  assiette: 'Totalité' },
    { cotisation: 'Vieillesse plafonnée',        taux:  8.55, assiette: '≤ PMSS (3 925€)' },
    { cotisation: 'Vieillesse déplafonnée',      taux:  1.9,  assiette: 'Totalité' },
    { cotisation: 'Allocations familiales',      taux:  5.25, assiette: 'Totalité' },
    { cotisation: 'AT-MP (moyenne secteur)',     taux:  2.22, assiette: 'Totalité (variable)' },
    { cotisation: 'Chômage (part patron.)',       taux:  4.05, assiette: 'Tr. A + B' },
    { cotisation: 'Retraite complémentaire T1',  taux:  4.72, assiette: 'Tr. A (≤ PMSS)' },
    { cotisation: 'Retraite complémentaire T2',  taux: 12.95, assiette: 'Tr. B (1-3 PMSS)' },
  ];

  const cotSalarial = [
    { cotisation: 'Vieillesse plafonnée',         taux:  6.9,  assiette: '≤ PMSS' },
    { cotisation: 'Vieillesse déplafonnée',       taux:  0.4,  assiette: 'Totalité' },
    { cotisation: 'Retraite complémentaire T1',   taux:  3.15, assiette: 'Tr. A' },
    { cotisation: 'Retraite complémentaire T2',   taux:  8.64, assiette: 'Tr. B' },
    { cotisation: 'CSG déductible',               taux:  6.8,  assiette: '98,25% salaire brut' },
    { cotisation: 'CSG non déductible',           taux:  2.4,  assiette: '98,25% salaire brut' },
    { cotisation: 'CRDS',                         taux:  0.5,  assiette: '98,25% salaire brut' },
    { cotisation: 'CEG (AGIRC-ARRCO)',            taux:  0.86, assiette: 'Tr. A + B' },
  ];

  const totalEmployeur = cotEmployeur.reduce((s, c) => s + c.taux, 0).toFixed(2);
  const totalSalarial  = cotSalarial.reduce((s, c) => s + c.taux, 0).toFixed(2);

  const barEmployeur = [...cotEmployeur].sort((a, b) => b.taux - a.taux);
  const barSalarial  = [...cotSalarial].sort((a, b) => b.taux - a.taux);

  const CotTable = ({ items, title, total, color }) => (
    <Card darkMode={darkMode} className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${dmClass}`}>{title}</h3>
        <span className={`text-sm font-bold px-2 py-0.5 rounded-full`} style={{ backgroundColor: color + '20', color }}>
          ≈ {total}%
        </span>
      </div>
      <div className="space-y-1">
        {items.map((c, i) => (
          <div key={i} className={`flex items-center justify-between py-1 border-b ${darkMode ? 'border-gray-700/50' : 'border-gray-100'}`}>
            <div className="flex-1 min-w-0 pr-2">
              <span className={`text-xs ${dmClass}`}>{c.cotisation}</span>
              <span className={`block text-[10px] ${dmSub}`}>{c.assiette}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-1.5 rounded-full" style={{ width: `${Math.min(c.taux / 15 * 100, 100)}%`, backgroundColor: color }} />
              </div>
              <span className={`text-xs font-bold w-10 text-right`} style={{ color }}>{c.taux}%</span>
            </div>
          </div>
        ))}
      </div>
      <p className={`text-[10px] mt-2 ${dmSub}`}>Source : URSSAF 2025 — Non-cadre du secteur privé</p>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* KPIs clés */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '🏢 Charges patron.', value: `≈ ${totalEmployeur}%`, sub: 'du salaire brut', color: C.secondary },
          { label: '👷 Charges salar.', value: `≈ ${totalSalarial}%`, sub: 'du salaire brut', color: C.primary },
          { label: '💡 CSG totale', value: '9,7%', sub: 'sur 98,25% brut', color: C.purple },
          { label: '🏦 PMSS 2025', value: '3 925€', sub: '/mois • 47 100€/an', color: C.cyan },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl p-3 border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-xs ${dmSub} mb-1`}>{k.label}</p>
            <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className={`text-[10px] ${dmSub}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CotTable items={barEmployeur} title="💼 Part patronale (non-cadre)" total={totalEmployeur} color={C.secondary} />
        <CotTable items={barSalarial}  title="👷 Part salariale (non-cadre)"  total={totalSalarial}  color={C.primary}   />
      </div>

      <BubbleNote darkMode={darkMode}>
        <p>⚠️ <strong>AT-MP</strong> : taux variable selon le secteur — de ~0,7% (bureaux) à plus de 10% (BTP, mines). Le taux affiché est une moyenne sectorielle.</p>
        <p>💡 <strong>CSG</strong> : 1er prélèvement social en volume. Prélevée à la source depuis 2019. Partiellement déductible de l'IR.</p>
        <p>🏦 <strong>PMSS 2025</strong> : 3 925 €/mois. Sert de plafond de référence pour les cotisations vieillesse, retraite complémentaire et prévoyance.</p>
      </BubbleNote>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL EXPORT
// ============================================================================

export default function FinancesPubliquesTab({ d, darkMode, fp: favoriProps, subTab: subTabProp, setSubTab: setSubTabProp }) {
  const [subTabLocal, setSubTabLocal] = useState('ensemble');

  // Compatibilité : sous-onglet géré en prop (App.jsx) ou en local
  const subTab    = subTabProp    ?? subTabLocal;
  const setSubTab = setSubTabProp ?? setSubTabLocal;

  const fp = d?.finances_publiques && typeof d.finances_publiques === 'object'
    ? d.finances_publiques
    : {};

  const sousOnglets = [
    { id: 'ensemble',    label: '🏛️ Vue d\'ensemble' },
    { id: 'dette',       label: '📈 Dette & charge' },
    { id: 'depenses',    label: '💸 Dépenses État' },
    { id: 'recettes',    label: '🧾 Recettes & PO' },
    { id: 'secu',        label: '💊 Protection sociale' },
    { id: 'cotisations', label: '👷 Cotisations' },
  ];

  const dmSub = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="space-y-4">
      {/* Sous-onglets */}
      <BubbleSubTabs
        tabs={sousOnglets}
        activeTab={subTab}
        setActiveTab={setSubTab}
        darkMode={darkMode}
      />

      {/* Contenu */}
      {subTab === 'ensemble'    && <VueEnsemble        fp={fp} darkMode={darkMode} />}
      {subTab === 'dette'       && <DetteCharge        fp={fp} darkMode={darkMode} />}
      {subTab === 'depenses'    && <DepensesEtat       fp={fp} darkMode={darkMode} />}
      {subTab === 'recettes'    && <RecettesPrelevements fp={fp} darkMode={darkMode} />}
      {subTab === 'secu'        && <ProtectionSociale  fp={fp} darkMode={darkMode} />}
      {subTab === 'cotisations' && <Cotisations            darkMode={darkMode} />}

      {/* Source globale */}
      <p className={`text-center text-[10px] ${dmSub}`}>
        Sources : INSEE API BDM (comptes APU) • PLF 2025 (budget.gouv.fr) • PLFSS 2025 • DREES • URSSAF 2025 • Eurostat
      </p>
    </div>
  );
}
