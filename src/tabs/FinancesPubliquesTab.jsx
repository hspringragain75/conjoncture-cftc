import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';

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

const safeArr = (v) => (Array.isArray(v) ? v : []);

export default function FinancesPubliquesTab({ d, darkMode, fp: favoriProps = {}, subTab, setSubTab }) {
  const chartProps = useChartProps(darkMode);
  const [localSubTab, setLocalSubTab] = useState('ensemble');

  const activeTab    = subTab     ?? localSubTab;
  const setActiveTab = setSubTab  ?? setLocalSubTab;

  const fp = (d?.finances_publiques != null && typeof d.finances_publiques === 'object')
    ? d.finances_publiques : {};
  const evo = (fp?.evolution != null && typeof fp.evolution === 'object')
    ? fp.evolution : {};

  const dette       = safeArr(evo.dette);
  const deficit     = safeArr(evo.deficit);
  const depenses    = safeArr(evo.depenses);
  const recettes    = safeArr(evo.recettes);
  const po          = safeArr(evo.prelevements_obligatoires);
  const chargeDette = safeArr(evo.charge_dette);
  const investPub   = safeArr(evo.investissement_public);
  const protSoc     = safeArr(evo.depenses_protection_sociale);
  const sante       = safeArr(evo.depenses_sante);
  const education   = safeArr(evo.depenses_education);

  // Consolidation vue ensemble
  const anneesEns = [...new Set([
    ...dette.map(e => e.annee), ...deficit.map(e => e.annee),
    ...depenses.map(e => e.annee), ...recettes.map(e => e.annee),
  ])].sort();
  const dDette   = Object.fromEntries(dette.map(e => [e.annee, e.valeur]));
  const dDeficit = Object.fromEntries(deficit.map(e => [e.annee, e.valeur]));
  const dDep     = Object.fromEntries(depenses.map(e => [e.annee, e.valeur]));
  const dRec     = Object.fromEntries(recettes.map(e => [e.annee, e.valeur]));
  const dPO      = Object.fromEntries(po.map(e => [e.annee, e.valeur]));
  const consolidee = anneesEns.map(a => ({
    annee: a,
    dette:    dDette[a]   ?? null,
    deficit:  dDeficit[a] ?? null,
    depenses: dDep[a]     ?? null,
    recettes: dRec[a]     ?? null,
    po:       dPO[a]      ?? null,
  }));

  // Consolidation dette
  const anneesDette = [...new Set([
    ...dette.map(e => e.annee), ...chargeDette.map(e => e.annee),
  ])].sort();
  const dCharge = Object.fromEntries(chargeDette.map(e => [e.annee, e.valeur]));
  const dInvest = Object.fromEntries(investPub.map(e => [e.annee, e.valeur]));
  const chartDette = anneesDette.map(a => ({
    annee: a,
    dette:          dDette[a]  ?? null,
    charge:         dCharge[a] ?? null,
    investissement: dInvest[a] ?? null,
  }));

  // Consolidation dépenses fonctionnelles
  const anneesFonc = [...new Set([
    ...protSoc.map(e => e.annee), ...sante.map(e => e.annee), ...education.map(e => e.annee),
  ])].sort();
  const dPS  = Object.fromEntries(protSoc.map(e => [e.annee, e.valeur]));
  const dSan = Object.fromEntries(sante.map(e => [e.annee, e.valeur]));
  const dEdu = Object.fromEntries(education.map(e => [e.annee, e.valeur]));
  const chartFonc = anneesFonc.map(a => ({
    annee: a,
    prot_soc:  dPS[a]  ?? null,
    sante:     dSan[a] ?? null,
    education: dEdu[a] ?? null,
  }));

  const dm = darkMode;
  const tx = dm ? 'text-gray-100' : 'text-gray-800';
  const ts = dm ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="space-y-4">
      {/* Sous-onglets — même pattern que ConjonctureTab */}
      <div className="flex flex-wrap gap-2">
        {[
          ['ensemble',    "🏛️ Vue d'ensemble"],
          ['dette',       '📈 Dette & charge'],
          ['depenses',    '💸 Dépenses État'],
          ['recettes',    '🧾 Recettes & PO'],
          ['secu',        '💊 Protection sociale'],
          ['cotisations', '👷 Cotisations'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === id
                ? 'bg-indigo-600 text-white shadow-lg'
                : dm ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{label}</button>
        ))}
      </div>

      {/* ── VUE D'ENSEMBLE ─────────────────────────────────────────────────── */}
      {activeTab === 'ensemble' && <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: '🏛️ Dette / PIB',       value: fp.dette_publique_pib,            danger: v => v > 100, warn: v => v > 80 },
            { label: '📉 Déficit / PIB',       value: fp.deficit_public_pib,            danger: v => v < -3,  warn: v => v < -1 },
            { label: '💸 Dépenses APU',        value: fp.depenses_apu_pib },
            { label: '🧾 Prél. obligatoires',  value: fp.prelevements_obligatoires_pib },
            { label: '📈 Charge dette',        value: fp.charge_dette_pib,             warn: v => v > 2 },
            { label: '🔨 Investissement pub.', value: fp.fbcf_apu_pib },
          ].map((k, i) => {
            const v = k.value;
            const s = v == null ? 'none' : k.danger?.(v) ? 'danger' : k.warn?.(v) ? 'warn' : 'ok';
            const badge = {
              danger: 'bg-red-100 text-red-700',
              warn:   'bg-orange-100 text-orange-700',
              ok:     'bg-green-100 text-green-700',
              none:   dm ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500',
            };
            return (
              <div key={i} className={`rounded-xl p-3 border ${dm ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-[10px] mb-1 ${ts}`}>{k.label}</p>
                <p className={`text-lg font-bold ${tx}`}>{v != null ? `${v}%` : '—'}</p>
                {v != null && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge[s]}`}>
                  {s === 'danger' ? '⚠️ Critique' : s === 'warn' ? '⚡ Vigilance' : '✓ Normal'}
                </span>}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="🏛️ Dette publique (% PIB)" darkMode={dm}>
            {consolidee.length === 0
              ? <p className={`text-sm text-center py-8 ${ts}`}>Données en cours de chargement…</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={consolidee}>
                    <defs>
                      <linearGradient id="gradDette" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.secondary} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.secondary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...chartProps.cartesianGrid} />
                    <XAxis dataKey="annee" {...chartProps.xAxis} />
                    <YAxis {...chartProps.yAxis} domain={['auto', 'auto']} unit="%" />
                    <Tooltip {...chartProps.tooltip} formatter={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                    <ReferenceLine y={60}  stroke="#ef4444" strokeDasharray="4 2" label={{ value: "60% Maastricht", fontSize: 9, fill: '#ef4444' }} />
                    <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "100%", fontSize: 9, fill: '#f59e0b' }} />
                    <Area type="monotone" dataKey="dette" name="Dette" stroke={C.secondary} fill="url(#gradDette)" strokeWidth={2} dot={false} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
            }
          </Card>

          <Card title="📉 Déficit public (% PIB)" darkMode={dm}>
            {consolidee.length === 0
              ? <p className={`text-sm text-center py-8 ${ts}`}>Données en cours de chargement…</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={consolidee.slice(-9)}>
                    <CartesianGrid {...chartProps.cartesianGrid} />
                    <XAxis dataKey="annee" {...chartProps.xAxis} />
                    <YAxis {...chartProps.yAxis} domain={['auto', 'auto']} unit="%" />
                    <Tooltip {...chartProps.tooltip} formatter={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                    <ReferenceLine y={-3} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "-3% règle UE", fontSize: 9, fill: '#ef4444' }} />
                    <ReferenceLine y={0} stroke={dm ? '#4b5563' : '#d1d5db'} />
                    <Bar dataKey="deficit" name="Déficit" radius={[4, 4, 0, 0]}>
                      {consolidee.slice(-9).map((e, i) => (
                        <Cell key={i} fill={e.deficit != null && e.deficit < -3 ? C.secondary : C.primary} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            }
          </Card>
        </div>

        <Card title="⚖️ Recettes vs Dépenses des APU (% PIB)" darkMode={dm}>
          {consolidee.length === 0
            ? <p className={`text-sm text-center py-8 ${ts}`}>Données en cours de chargement…</p>
            : <ResponsiveContainer width="100%" height={220}>
                <LineChart data={consolidee}>
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis dataKey="annee" {...chartProps.xAxis} />
                  <YAxis {...chartProps.yAxis} domain={['auto', 'auto']} unit="%" />
                  <Tooltip {...chartProps.tooltip} formatter={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                  <Legend {...chartProps.legend} />
                  <Line type="monotone" dataKey="depenses" name="Dépenses APU" stroke={C.secondary} strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="recettes" name="Recettes APU" stroke={C.tertiary} strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="po" name="Prél. obligatoires" stroke={C.primary} strokeWidth={2} dot={false} strokeDasharray="5 3" connectNulls />
                </LineChart>
              </ResponsiveContainer>
          }
          <p className={`text-[10px] mt-1 ${ts}`}>Source : INSEE Comptes APU • données documentées</p>
        </Card>

        {fp.notes_lecture?.length > 0 && (
          <div className={`${dm ? 'bg-blue-900/20' : 'bg-blue-50'} border-l-4 border-blue-400 p-4 rounded`}>
            {fp.notes_lecture.map((n, i) => <p key={i} className={`text-sm ${dm ? 'text-blue-200' : 'text-blue-700'}`}>{n}</p>)}
          </div>
        )}
      </div>}

      {/* ── DETTE & CHARGE ──────────────────────────────────────────────────── */}
      {activeTab === 'dette' && <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="🏛️ Trajectoire de la dette (% PIB)" darkMode={dm}>
            {chartDette.length === 0
              ? <p className={`text-sm text-center py-8 ${ts}`}>Données en cours de chargement…</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartDette}>
                    <defs>
                      <linearGradient id="gradDette2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.purple} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.purple} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...chartProps.cartesianGrid} />
                    <XAxis dataKey="annee" {...chartProps.xAxis} />
                    <YAxis {...chartProps.yAxis} domain={['auto', 'auto']} unit="%" />
                    <Tooltip {...chartProps.tooltip} formatter={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                    <ReferenceLine y={60}  stroke="#ef4444" strokeDasharray="4 2" label={{ value: "60% Maastricht", position: 'right', fontSize: 9, fill: '#ef4444' }} />
                    <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "100%", position: 'right', fontSize: 9, fill: '#f59e0b' }} />
                    <Area type="monotone" dataKey="dette" name="Dette" stroke={C.purple} fill="url(#gradDette2)" strokeWidth={2.5} dot={false} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
            }
          </Card>

          <Card title="⚡ Charge dette vs Investissement public (% PIB)" darkMode={dm}>
            {chartDette.length === 0
              ? <p className={`text-sm text-center py-8 ${ts}`}>Données en cours de chargement…</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartDette}>
                    <CartesianGrid {...chartProps.cartesianGrid} />
                    <XAxis dataKey="annee" {...chartProps.xAxis} />
                    <YAxis {...chartProps.yAxis} domain={['auto', 'auto']} unit="%" />
                    <Tooltip {...chartProps.tooltip} formatter={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                    <Legend {...chartProps.legend} />
                    <Line type="monotone" dataKey="charge" name="Charge intérêts" stroke={C.secondary} strokeWidth={2.5} dot={false} connectNulls />
                    <Line type="monotone" dataKey="investissement" name="Invest. public (FBCF APU)" stroke={C.cyan} strokeWidth={2} dot={false} strokeDasharray="5 3" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
            }
            <p className={`text-[10px] mt-1 ${ts}`}>Source : INSEE / PLF 2025</p>
          </Card>
        </div>

        <Card title="🇪🇺 Dette publique en Europe (% PIB — Eurostat 2024)" darkMode={dm}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={[
              { pays: 'Grèce',     taux: 161.9 }, { pays: 'Italie',    taux: 137.3 },
              { pays: 'France',    taux: 112.9 }, { pays: 'Belgique',  taux: 104.3 },
              { pays: 'Espagne',   taux: 101.9 }, { pays: 'Portugal',  taux: 100.0 },
              { pays: 'Zone euro', taux: 89.4  }, { pays: 'UE-27',     taux: 82.3  },
              { pays: 'Allemagne', taux: 62.4  }, { pays: 'Pays-Bas',  taux: 43.8  },
            ]} margin={{ top: 0, right: 50, left: 60, bottom: 0 }}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis type="number" unit="%" {...chartProps.xAxis} />
              <YAxis type="category" dataKey="pays" {...chartProps.yAxis} width={60} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
              <ReferenceLine x={60} stroke="#ef4444" strokeDasharray="4 2" />
              <Bar dataKey="taux" name="Dette % PIB" radius={[0, 4, 4, 0]}>
                {[161.9,137.3,112.9,104.3,101.9,100.0,89.4,82.3,62.4,43.8].map((v, i) => (
                  <Cell key={i} fill={i === 2 ? C.primary : v > 100 ? '#fca5a5' : i >= 6 ? C.gray : C.cyan} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className={`text-[10px] mt-1 ${ts}`}>Source : Eurostat 2024 provisoires • France en bleu</p>
        </Card>

        <div className={`${dm ? 'bg-red-900/20' : 'bg-red-50'} border-l-4 border-red-400 p-4 rounded`}>
          <ul className={`text-sm space-y-1 ${dm ? 'text-red-200' : 'text-red-700'}`}>
            <li>• La France dépasse le seuil de 100% du PIB depuis 2020 (Covid)</li>
            <li>• La charge de la dette atteint 2,4% du PIB en 2024 — en hausse avec les taux</li>
            <li>• L'investissement public (4% PIB) est désormais inférieur à la charge des intérêts</li>
          </ul>
        </div>
      </div>}

      {/* ── DÉPENSES ÉTAT ───────────────────────────────────────────────────── */}
      {activeTab === 'depenses' && <div className="space-y-4">
        <Card title="💸 Budget de l'État par mission (PLF 2025 — 492 Mds€)" darkMode={dm}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={[
              { mission: 'Enseignement scolaire',  mds: 63.7, pct: 12.9, evo:  3.2 },
              { mission: 'Charge de la dette',     mds: 61.8, pct: 12.6, evo: 18.0 },
              { mission: 'Défense',                mds: 50.5, pct: 10.3, evo:  6.0 },
              { mission: 'Rech. & ens. sup.',      mds: 32.5, pct:  6.6, evo:  2.1 },
              { mission: 'Solidarité & exclusion', mds: 30.2, pct:  6.1, evo:  4.5 },
              { mission: 'Sécurités',              mds: 25.8, pct:  5.2, evo:  2.8 },
              { mission: 'Travail & emploi',       mds: 22.1, pct:  4.5, evo: -2.0 },
              { mission: 'Écologie & énergie',     mds: 18.3, pct:  3.7, evo:  8.2 },
            ].sort((a, b) => b.mds - a.mds)} margin={{ top: 0, right: 80, left: 150, bottom: 0 }}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis type="number" unit=" Mds" {...chartProps.xAxis} />
              <YAxis type="category" dataKey="mission" {...chartProps.yAxis} width={148} />
              <Tooltip {...chartProps.tooltip} formatter={(v, n, p) => [`${v} Mds€ (${p.payload.pct}%) — ${p.payload.evo > 0 ? '+' : ''}${p.payload.evo}%`, n]} />
              <Bar dataKey="mds" name="Budget" radius={[0, 4, 4, 0]}>
                {[63.7,61.8,50.5,32.5,30.2,25.8,22.1,18.3].sort((a,b)=>b-a).map((_, i) => (
                  <Cell key={i} fill={[C.primary,C.secondary,C.purple,C.cyan,C.tertiary,C.quaternary,C.orange,'#16a34a'][i]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="📊 Dépenses publiques par fonction (% PIB — Eurostat COFOG)" darkMode={dm}>
          {chartFonc.length === 0
            ? <p className={`text-sm text-center py-8 ${ts}`}>Données en cours de chargement…</p>
            : <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartFonc}>
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis dataKey="annee" {...chartProps.xAxis} />
                  <YAxis {...chartProps.yAxis} domain={['auto', 'auto']} unit="%" />
                  <Tooltip {...chartProps.tooltip} formatter={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                  <Legend {...chartProps.legend} />
                  <Line type="monotone" dataKey="prot_soc" name="Protection sociale" stroke={C.secondary} strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="sante" name="Santé" stroke={C.tertiary} strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="education" name="Éducation" stroke={C.primary} strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
          }
        </Card>

        <div className={`${dm ? 'bg-blue-900/20' : 'bg-blue-50'} border-l-4 border-blue-400 p-4 rounded`}>
          <ul className={`text-sm space-y-1 ${dm ? 'text-blue-200' : 'text-blue-700'}`}>
            <li>• <strong>Protection sociale</strong> (24,5% PIB) : 1er poste, portée par le vieillissement</li>
            <li>• <strong>Charge de la dette</strong> (+18% en 2025) : hausse rapide avec la remontée des taux</li>
            <li>• La France est 2e en Europe pour les dépenses publiques en % du PIB</li>
          </ul>
        </div>
      </div>}

      {/* ── RECETTES & PO ───────────────────────────────────────────────────── */}
      {activeTab === 'recettes' && <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="🧾 Recettes fiscales de l'État (PLF 2025 — 387 Mds€)" darkMode={dm}>
            {(() => {
              const impots = [
                { name: 'TVA',           value: 176.5, color: C.primary },
                { name: 'IR',            value: 100.3, color: C.cyan },
                { name: 'IS',            value:  67.2, color: C.purple },
                { name: 'TICPE',         value:  16.8, color: C.quaternary },
                { name: 'Droits enreg.', value:  10.1, color: C.orange },
                { name: 'Autres',        value:  13.9, color: C.gray },
              ];
              return (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="45%" height={180}>
                    <PieChart>
                      <Pie data={impots} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2}>
                        {impots.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
                      </Pie>
                      <Tooltip {...chartProps.tooltip} formatter={v => `${v} Mds€`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {impots.map((im, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: im.color }} />
                          <span className={`text-xs ${tx}`}>{im.name}</span>
                        </div>
                        <span className={`text-xs font-semibold ${tx}`}>{im.value} Mds€</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </Card>

          <Card title="🇪🇺 Prélèvements obligatoires en Europe (% PIB — Eurostat 2024)" darkMode={dm}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart layout="vertical" data={[
                { pays: 'France',    taux: 43.5 }, { pays: 'Belgique',  taux: 43.3 },
                { pays: 'Danemark',  taux: 42.6 }, { pays: 'Autriche',  taux: 41.5 },
                { pays: 'Suède',     taux: 41.3 }, { pays: 'Italie',    taux: 41.0 },
                { pays: 'Zone euro', taux: 39.5 }, { pays: 'Allemagne', taux: 38.6 },
                { pays: 'Espagne',   taux: 37.8 }, { pays: 'Irlande',   taux: 26.5 },
              ]} margin={{ top: 0, right: 60, left: 65, bottom: 0 }}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis type="number" unit="%" domain={[25, 48]} {...chartProps.xAxis} />
                <YAxis type="category" dataKey="pays" {...chartProps.yAxis} width={65} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Bar dataKey="taux" name="PO % PIB" radius={[0, 4, 4, 0]}>
                  {[43.5,43.3,42.6,41.5,41.3,41.0,39.5,38.6,37.8,26.5].map((_, i) => (
                    <Cell key={i} fill={i === 0 ? C.primary : i === 6 ? C.gray : C.cyan} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {po.length > 0 && (
          <Card title="📈 Évolution des prélèvements obligatoires (% PIB)" darkMode={dm}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={po}>
                <defs>
                  <linearGradient id="gradPO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.primary} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="annee" {...chartProps.xAxis} />
                <YAxis {...chartProps.yAxis} domain={['auto', 'auto']} unit="%" />
                <Tooltip {...chartProps.tooltip} formatter={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                <Area type="monotone" dataKey="valeur" name="PO % PIB" stroke={C.primary} fill="url(#gradPO)" strokeWidth={2} dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        <div className={`${dm ? 'bg-amber-900/20' : 'bg-amber-50'} border-l-4 border-amber-400 p-4 rounded`}>
          <ul className={`text-sm space-y-1 ${dm ? 'text-amber-200' : 'text-amber-700'}`}>
            <li>• <strong>TVA</strong> : 1re recette fiscale (45,6% du total — 176,5 Mds€)</li>
            <li>• <strong>IS en baisse</strong> : reflux après les superprofits 2022-2023</li>
            <li>• La France reste le pays avec les prélèvements les plus élevés d'Europe</li>
          </ul>
        </div>
      </div>}

      {/* ── PROTECTION SOCIALE ──────────────────────────────────────────────── */}
      {activeTab === 'secu' && (() => {
        const branches = [
          { branche: 'Maladie',   s23: -10.8, s24: -13.3, s25: -15.0, color: C.secondary },
          { branche: 'Retraites', s23: -3.5,  s24: -4.2,  s25: -5.5,  color: C.purple },
          { branche: 'Famille',   s23: 1.8,   s24: 1.0,   s25: 0.5,   color: C.tertiary },
          { branche: 'AT-MP',     s23: 1.7,   s24: 1.5,   s25: 1.5,   color: C.quaternary },
        ];
        const historique = [
          {annee:'2019',solde:-1.5},{annee:'2020',solde:-38.7},{annee:'2021',solde:-24.3},
          {annee:'2022',solde:-19.6},{annee:'2023',solde:-10.8},{annee:'2024',solde:-15.0},
          {annee:'2025',solde:-18.5},
        ];
        const risques = [
          { name: 'Vieillesse-survie',  value: 388.0, color: C.purple },
          { name: 'Maladie-invalidité', value: 285.0, color: C.secondary },
          { name: 'Famille-maternité',  value:  70.0, color: C.tertiary },
          { name: 'Chômage',            value:  50.0, color: C.quaternary },
          { name: 'Dépendance',         value:  43.0, color: C.pink },
          { name: 'Pauvreté-exclusion', value:  32.0, color: C.orange },
        ];
        return (
          <div className="space-y-4">
            <Card title="💊 Soldes des branches Sécu (Mds€ — PLFSS 2025)" darkMode={dm}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {branches.map((b, i) => (
                  <div key={i} className={`rounded-xl p-3 border ${dm ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-xs font-semibold mb-2 ${tx}`}>{b.branche}</p>
                    {[['2023', b.s23], ['2024', b.s24], ['2025 (P)', b.s25]].map(([yr, val]) => (
                      <div key={yr} className="flex justify-between items-center">
                        <span className={`text-[10px] ${ts}`}>{yr}</span>
                        <span className={`text-xs font-bold ${val >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {val > 0 ? '+' : ''}{val} Mds
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={historique}>
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis dataKey="annee" {...chartProps.xAxis} />
                  <YAxis {...chartProps.yAxis} unit=" Mds" />
                  <Tooltip {...chartProps.tooltip} formatter={v => [`${v} Mds€`, 'Solde global']} />
                  <ReferenceLine y={0} stroke={dm ? '#4b5563' : '#d1d5db'} strokeWidth={2} />
                  <Bar dataKey="solde" name="Solde Sécu" radius={[4, 4, 0, 0]}>
                    {historique.map((s, i) => (
                      <Cell key={i} fill={s.solde < 0 ? C.secondary : C.tertiary} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="🛡️ Dépenses de protection sociale par risque (DREES 2023 — 939 Mds€)" darkMode={dm}>
              <div className="flex gap-4">
                <ResponsiveContainer width="40%" height={200}>
                  <PieChart>
                    <Pie data={risques} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                      {risques.map((r, i) => <Cell key={i} fill={r.color} fillOpacity={0.85} />)}
                    </Pie>
                    <Tooltip {...chartProps.tooltip} formatter={v => `${v} Mds€`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 justify-center flex flex-col">
                  {risques.map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className={`text-xs ${tx}`}>{r.name}</span>
                      </div>
                      <span className={`text-xs font-semibold ${tx}`}>{r.value} Mds€</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className={`${dm ? 'bg-purple-900/20' : 'bg-purple-50'} border-l-4 border-purple-400 p-4 rounded`}>
              <ul className={`text-sm space-y-1 ${dm ? 'text-purple-200' : 'text-purple-700'}`}>
                <li>• <strong>Maladie</strong> : déficit record attendu à -15 Mds€ en 2025</li>
                <li>• <strong>Retraites</strong> : le bénéfice de la réforme 2023 montera en charge progressivement</li>
                <li>• <strong>Dépendance</strong> : poste à plus forte croissance structurelle</li>
              </ul>
            </div>
          </div>
        );
      })()}

      {/* ── COTISATIONS ─────────────────────────────────────────────────────── */}
      {activeTab === 'cotisations' && (() => {
        // ⚠️ Les cotisations retraite complémentaire (T1/T2) s'appliquent sur des
        // tranches de salaire DIFFÉRENTES — elles ne s'additionnent PAS.
        // T1 = tranche ≤ 1 PMSS (3 925€/mois), T2 = tranche 1 à 8 PMSS
        // On présente les taux par tranche, pas un "total" trompeur.
        // Source : URSSAF, AGIRC-ARRCO, taux 2025

        // Cotisations s'appliquant sur la TOTALITÉ du salaire (ou sur tranche indiquée)
        const cotEmpBase = [
          { name: 'Maladie-maternité',     taux: 13.00, assiette: 'Totalité' },
          { name: 'Vieillesse plafonnée',  taux:  8.55, assiette: '≤ 1 PMSS (3 925€)' },
          { name: 'Vieillesse déplafonnée',taux:  1.90, assiette: 'Totalité' },
          { name: 'Alloc. familiales',     taux:  5.25, assiette: 'Totalité (3,45% si ≤ 3,5 SMIC)' },
          { name: 'AT-MP (moy. secteur)',  taux:  2.22, assiette: 'Totalité — variable' },
          { name: 'Chômage',               taux:  4.05, assiette: '≤ 4 PMSS' },
        ];
        // Retraite complémentaire AGIRC-ARRCO — taux PAR TRANCHE (non cumulables)
        const cotEmpRC = [
          { name: 'Retraite compl. T1 (patronal)', taux: 4.72, assiette: 'Tr. A ≤ 1 PMSS' },
          { name: 'Retraite compl. T2 (patronal)', taux: 12.95, assiette: 'Tr. B = 1 à 8 PMSS' },
          { name: 'CEG T1 (patronal)',             taux: 1.29, assiette: 'Tr. A ≤ 1 PMSS' },
          { name: 'CEG T2 (patronal)',             taux: 1.62, assiette: 'Tr. B = 1 à 8 PMSS' },
        ];

        const cotSalBase = [
          { name: 'Vieillesse plafonnée',  taux: 6.90, assiette: '≤ 1 PMSS' },
          { name: 'Vieillesse déplafonnée',taux: 0.40, assiette: 'Totalité' },
          { name: 'CSG déductible',        taux: 6.80, assiette: '98,25% salaire brut' },
          { name: 'CSG non déductible',    taux: 2.40, assiette: '98,25% salaire brut' },
          { name: 'CRDS',                  taux: 0.50, assiette: '98,25% salaire brut' },
        ];
        const cotSalRC = [
          { name: 'Retraite compl. T1 (salarial)', taux: 3.15, assiette: 'Tr. A ≤ 1 PMSS' },
          { name: 'Retraite compl. T2 (salarial)', taux: 8.64, assiette: 'Tr. B = 1 à 8 PMSS' },
          { name: 'CEG T1 (salarial)',             taux: 0.86, assiette: 'Tr. A ≤ 1 PMSS' },
          { name: 'CEG T2 (salarial)',             taux: 1.08, assiette: 'Tr. B = 1 à 8 PMSS' },
        ];

        // Exemples de charge réelle par niveau de salaire
        const exemples = [
          { profil: 'SMIC (≤ 1 PMSS)',  brut: 1802,  emp: 39.5, sal: 22.4, cout_total: Math.round(1802 * 1.395) },
          { profil: '2× PMSS',          brut: 7850,  emp: 43.2, sal: 24.8, cout_total: Math.round(7850 * 1.432) },
          { profil: 'Cadre 5× PMSS',    brut: 19625, emp: 44.1, sal: 25.5, cout_total: Math.round(19625 * 1.441) },
        ];

        const CotTable = ({ data, title, color }) => (
          <Card title={title} darkMode={dm}>
            <div className="space-y-1 mt-1">
              {data.map((c, i) => (
                <div key={i} className={`flex items-center justify-between py-1.5 border-b ${dm ? 'border-gray-700/50' : 'border-gray-100'}`}>
                  <div className="flex-1 min-w-0 pr-2">
                    <span className={`text-xs ${tx}`}>{c.name}</span>
                    <span className={`block text-[10px] ${ts}`}>{c.assiette}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-20 h-1.5 rounded-full ${dm ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(c.taux / 15 * 100, 100)}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-xs font-bold w-10 text-right" style={{ color }}>{c.taux}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );

        return (
          <div className="space-y-4">
            {/* Avertissement pédagogique */}
            <div className={`${dm ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-300'} border rounded-xl p-3`}>
              <p className={`text-xs font-semibold ${dm ? 'text-amber-300' : 'text-amber-800'}`}>⚠️ Comment lire ces taux</p>
              <p className={`text-xs mt-1 ${dm ? 'text-amber-200' : 'text-amber-700'}`}>
                Les cotisations retraite complémentaire (T1/T2) s'appliquent sur des <strong>tranches de salaire différentes</strong> — elles ne s'additionnent pas. T1 s'applique sur la partie ≤ 1 PMSS (3 925€/mois), T2 sur la partie entre 1 et 8 PMSS. Un salarié au SMIC ne paie que T1.
              </p>
            </div>

            {/* Cotisations sur assiette générale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CotTable data={cotEmpBase.sort((a,b) => b.taux - a.taux)} title="Cotisations employeur — base (totalité du salaire)" color={C.secondary} />
              <CotTable data={cotSalBase.sort((a,b) => b.taux - a.taux)} title="Cotisations salariales — base" color={C.primary} />
            </div>

            {/* Retraite complémentaire par tranche */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CotTable data={cotEmpRC} title="Retraite complémentaire AGIRC-ARRCO — part patronale (par tranche)" color={C.purple} />
              <CotTable data={cotSalRC} title="Retraite complémentaire AGIRC-ARRCO — part salariale (par tranche)" color={C.cyan} />
            </div>

            {/* Exemples de charge réelle */}
            <Card title="💡 Charge réelle selon le niveau de salaire (régime général 2025)" darkMode={dm}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs mt-2">
                  <thead>
                    <tr className={`${dm ? 'text-gray-400' : 'text-gray-500'}`}>
                      <th className="text-left pb-2 font-medium">Profil</th>
                      <th className="text-right pb-2 font-medium">Salaire brut</th>
                      <th className="text-right pb-2 font-medium">Charges pat.</th>
                      <th className="text-right pb-2 font-medium">Charges sal.</th>
                      <th className="text-right pb-2 font-medium">Coût total employeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exemples.map((e, i) => (
                      <tr key={i} className={`border-t ${dm ? 'border-gray-700' : 'border-gray-100'}`}>
                        <td className={`py-2 font-medium ${tx}`}>{e.profil}</td>
                        <td className={`py-2 text-right ${ts}`}>{e.brut.toLocaleString('fr-FR')} €</td>
                        <td className="py-2 text-right font-semibold text-red-500">≈ {e.emp}%</td>
                        <td className="py-2 text-right font-semibold text-blue-500">≈ {e.sal}%</td>
                        <td className="py-2 text-right font-semibold text-purple-500">{e.cout_total.toLocaleString('fr-FR')} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={`text-[10px] mt-3 ${ts}`}>
                Source : URSSAF 2025, AGIRC-ARRCO 2025 — Régime général, non-cadre. AT-MP taux moyen secteur. Alloc. familiales taux plein.
              </p>
            </Card>
          </div>
        );
      })()}

      <p className={`text-center text-[10px] ${ts}`}>
        Sources : INSEE Comptes APU • PLF 2025 • PLFSS 2025 • DREES • URSSAF 2025 • Eurostat
      </p>
    </div>
  );
}
