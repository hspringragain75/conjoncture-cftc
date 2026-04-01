import { useState } from 'react';
import { ComposedChart, BarChart, Bar, LineChart, Line, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, Area } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';
import BubbleSubTabs from '../components/BubbleSubTabs';
import BubbleStatBlock from '../components/BubbleStatBlock';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', pink: '#ec4899', purple: '#8b5cf6',
  cyan: '#06b6d4', gray: '#6b7280'
};

export default function PrevisionsTab({d, darkMode, fp={}}) {
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
  const driftAnalysis = cftc.drift_analysis || {};
  const backtesting = cftc.backtesting || {};
  const uncertaintyDecomp = cftc.uncertainty_decomposition || {};
  const calibrage = cftc.calibrage || {};
  const pouvoirAchatReel = smicCftc.pouvoir_achat_reel || {};

  const subTabs = [
    ['vue_ensemble', '📊 Vue d\'ensemble'],
    ['inflation', '📈 Inflation'],
    ['smic', '💰 SMIC'],
    ['chomage', '👥 Chômage'],
    ['scenarios', '🎯 Scénarios'],
    ['whatif', '🎲 What-if'],
    ['notes', '📝 Notes'],
    ['methodologie', '⚙️ Méthodo']
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
                    <p className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>
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
            <p className={`font-bold ${scenario.impact?.chomage_q4 > 8 ? 'text-red-500' : 'text-[#0d4093]'}`}>
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
              <div className={`text-3xl font-bold ${darkMode ? 'text-blue-300' : 'text-[#0d4093]'}`}>
                +{bdf.pib_croissance?.['2026'] ?? '—'}%
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PIB 2026</div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Source : Banque de France
              </div>
            </div>
          </div>

          {/* Dérive semaine précédente */}
          {driftAnalysis.disponible && (
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔄</span>
                <span className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Évolution vs semaine du {driftAnalysis.date_reference}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inflation</span>
                  <p className={`font-bold ${driftAnalysis.inflation?.derive_pt > 0 ? 'text-orange-500' : driftAnalysis.inflation?.derive_pt < 0 ? 'text-green-500' : darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {driftAnalysis.inflation?.direction}{driftAnalysis.inflation?.derive_pt !== null ? Math.abs(driftAnalysis.inflation?.derive_pt).toFixed(2) : '0'}pt
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{driftAnalysis.inflation?.precedent}% → {driftAnalysis.inflation?.actuel}%</p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chômage</span>
                  <p className={`font-bold ${driftAnalysis.chomage?.derive_pt > 0 ? 'text-red-500' : driftAnalysis.chomage?.derive_pt < 0 ? 'text-green-500' : darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {driftAnalysis.chomage?.direction}{driftAnalysis.chomage?.derive_pt !== null ? Math.abs(driftAnalysis.chomage?.derive_pt).toFixed(2) : '0'}pt
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{driftAnalysis.chomage?.precedent}% → {driftAnalysis.chomage?.actuel}%</p>
                </div>
                <div className={`col-span-2 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cause principale</span>
                  <p className={`text-sm font-medium mt-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{driftAnalysis.cause_principale}</p>
                  {driftAnalysis.energie_change && (
                    <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>⚡ Énergie : {driftAnalysis.energie_change}</p>
                  )}
                </div>
              </div>
            </div>
          )}

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
          {/* Backtesting */}
          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎯</span>
              <span className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Backtesting du modèle</span>
            </div>
            {backtesting.disponible ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Semaines archivées</span>
                  <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{backtesting.semaines_archivees}</p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Comparaisons évaluées</span>
                  <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{backtesting.comparaisons_evaluees ?? '—'}</p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>MAE inflation</span>
                  <p className={`font-bold text-lg ${backtesting.metriques?.inflation?.mae_pt < 0.3 ? 'text-green-500' : backtesting.metriques?.inflation?.mae_pt < 0.6 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {backtesting.metriques?.inflation?.mae_pt ? `${backtesting.metriques.inflation.mae_pt}pt` : '—'}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Biais</span>
                  <p className={`font-bold text-lg ${Math.abs(backtesting.metriques?.inflation?.biais_pt) < 0.1 ? 'text-green-500' : 'text-orange-500'}`}>
                    {backtesting.metriques?.inflation?.biais_pt ? `${backtesting.metriques.inflation.biais_pt > 0 ? '+' : ''}${backtesting.metriques.inflation.biais_pt}pt` : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {backtesting.message || `${backtesting.semaines_archivees ?? 0} / ${backtesting.semaines_necessaires ?? 26} semaines archivées`}
              </p>
            )}
          </div>
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
                  <p className={`font-bold ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>{inflationCftc.facteurs.cible_ajustee}%</p>
                </div>
              </div>
            </Card>
          )}
          
          {/* Asymétrie IC */}
          {inflationCftc.asymetrie_ic && (
            <Card title="📐 Asymétrie de l'intervalle de confiance" darkMode={darkMode}>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Queue haute (p50→p90)</span>
                  <p className="font-bold text-orange-500 text-xl mt-1">+{inflationCftc.asymetrie_ic.queue_haute}pt</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ratio asymétrie</span>
                  <p className={`font-bold text-xl mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>×{inflationCftc.asymetrie_ic.ratio}</p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>queue haute / basse</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Queue basse (p10→p50)</span>
                  <p className="font-bold text-green-500 text-xl mt-1">-{inflationCftc.asymetrie_ic.queue_basse}pt</p>
                </div>
              </div>
              <p className={`text-xs mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Distribution log-normale — les risques haussiers sont structurellement plus importants que les risques baissiers.
              </p>
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
          
          {/* Pouvoir d'achat réel */}
          {pouvoirAchatReel.hausse_reelle_p50_pct !== undefined && (
            <Card title="💡 Pouvoir d'achat SMIC réel (hausse nominale − inflation prévue)" darkMode={darkMode}>
              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Scénario bas</span>
                  <p className={`font-bold text-xl mt-1 ${pouvoirAchatReel.hausse_reelle_p10_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {pouvoirAchatReel.hausse_reelle_p10_pct > 0 ? '+' : ''}{pouvoirAchatReel.hausse_reelle_p10_pct}%
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{pouvoirAchatReel.gain_mensuel_brut_p10_euros > 0 ? '+' : ''}{pouvoirAchatReel.gain_mensuel_brut_p10_euros}€/mois</p>
                </div>
                <div className={`p-3 rounded-lg text-center border-2 ${pouvoirAchatReel.hausse_reelle_p50_pct >= 0 ? (darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-300') : (darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300')}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Scénario médian</span>
                  <p className={`font-bold text-xl mt-1 ${pouvoirAchatReel.hausse_reelle_p50_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {pouvoirAchatReel.hausse_reelle_p50_pct > 0 ? '+' : ''}{pouvoirAchatReel.hausse_reelle_p50_pct}%
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{pouvoirAchatReel.gain_mensuel_brut_p50_euros > 0 ? '+' : ''}{pouvoirAchatReel.gain_mensuel_brut_p50_euros}€/mois</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Scénario haut</span>
                  <p className={`font-bold text-xl mt-1 ${pouvoirAchatReel.hausse_reelle_p90_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {pouvoirAchatReel.hausse_reelle_p90_pct > 0 ? '+' : ''}{pouvoirAchatReel.hausse_reelle_p90_pct}%
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{pouvoirAchatReel.gain_mensuel_brut_p90_euros > 0 ? '+' : ''}{pouvoirAchatReel.gain_mensuel_brut_p90_euros}€/mois</p>
                </div>
              </div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{pouvoirAchatReel.interpretation}</p>
            </Card>
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
                  <p className={`font-bold ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>{chomageCftc.facteurs.cible_ajustee}%</p>
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
                      ? (darkMode ? 'bg-blue-900/30 border-2 border-[#0d4093]' : 'bg-blue-50 border-2 border-[#0d4093]')
                      : (darkMode ? 'bg-gray-800' : 'bg-gray-50')
                  }`}
                >
                  {config.highlight && (
                    <span className="absolute -top-3 right-4 text-xs px-3 py-1 bg-[#0d4093] text-white rounded-full">
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
                      <span className={`font-bold ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>{scenario.pib}</span>
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
                            : (darkMode ? 'bg-blue-900/20 border-[#0d4093]' : 'bg-blue-50 border-[#0d4093]')
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

      {/* ==================== MÉTHODOLOGIE ==================== */}
      {activeSubTab === 'methodologie' && (
        <>
          {/* Version et paramètres */}
          <Card title="⚙️ Paramètres du modèle v7" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Simulations</span>
                <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{methodology.simulations ?? 1000}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Corrélation Phillips (ρ)</span>
                <p className={`font-bold text-lg ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>{calibrage.phillips_correlation ?? '—'}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vol. inflation</span>
                <p className={`font-bold text-lg ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{calibrage.volatilites?.inflation ?? '—'}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vol. chômage</span>
                <p className={`font-bold text-lg ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{calibrage.volatilites?.chomage ?? '—'}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Réf. défaillances</span>
                <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{calibrage.defaillances_ref ? Math.round(calibrage.defaillances_ref).toLocaleString('fr-FR') : '—'}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{calibrage.defaillances_ref_label}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mean reversion K</span>
                <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{calibrage.mean_reversion_k ?? '—'}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Demi-vie signaux</span>
                <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{calibrage.signal_decay_lambda ? `${Math.round(0.693 / calibrage.signal_decay_lambda)}j` : '—'}</p>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Distribution</span>
                <p className={`font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Log-normale</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>offset = {calibrage.lognormal_offset ?? 3}</p>
              </div>
            </div>
          </Card>

          {/* Décomposition IC */}
          {uncertaintyDecomp.inflation && (
            <Card title="🔬 Décomposition de l'intervalle de confiance" darkMode={darkMode}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['inflation', 'chomage'].map(key => {
                  const unc = uncertaintyDecomp[key];
                  if (!unc) return null;
                  const sources = unc.sources || {};
                  const total = unc.ic_total_pts || 1;
                  return (
                    <div key={key}>
                      <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {key === 'inflation' ? '📈 Inflation' : '👥 Chômage'} — IC total : {unc.ic_total_pts}pt
                      </h4>
                      {Object.entries(sources).map(([srcKey, src]) => (
                        <div key={srcKey} className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{src.label}</span>
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{src.part_pct}%</span>
                          </div>
                          <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                              className={`h-2 rounded-full ${srcKey === 'volatilite_historique' ? 'bg-blue-500' : srcKey === 'signaux_marches' ? 'bg-orange-500' : 'bg-purple-500'}`}
                              style={{width: `${src.part_pct}%`}}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              {/* Contribution à la médiane */}
              <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Déplacement de la prévision centrale par les signaux</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Signaux marchés → inflation</span>
                    <p className={`font-bold ${uncertaintyDecomp.inflation?.contribution_mediane?.signaux_marches_pt > 0 ? 'text-orange-500' : uncertaintyDecomp.inflation?.contribution_mediane?.signaux_marches_pt < 0 ? 'text-green-500' : darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {uncertaintyDecomp.inflation?.contribution_mediane?.signaux_marches_pt > 0 ? '+' : ''}{uncertaintyDecomp.inflation?.contribution_mediane?.signaux_marches_pt ?? '—'}pt
                    </p>
                  </div>
                  <div>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Signaux marchés → chômage</span>
                    <p className={`font-bold ${uncertaintyDecomp.chomage?.contribution_mediane?.signaux_marches_pt > 0 ? 'text-red-500' : uncertaintyDecomp.chomage?.contribution_mediane?.signaux_marches_pt < 0 ? 'text-green-500' : darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {uncertaintyDecomp.chomage?.contribution_mediane?.signaux_marches_pt > 0 ? '+' : ''}{uncertaintyDecomp.chomage?.contribution_mediane?.signaux_marches_pt ?? '—'}pt
                    </p>
                  </div>
                </div>
              </div>
              <p className={`text-xs mt-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{uncertaintyDecomp.note}</p>
            </Card>
          )}

          {/* Nouveautés v7 */}
          {methodology.nouveautes_v7 && (
            <Card title="🆕 Nouveautés du modèle" darkMode={darkMode}>
              <ul className="space-y-2">
                {methodology.nouveautes_v7.map((item, idx) => (
                  <li key={idx} className={`flex items-start gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="text-green-500 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
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
