import { useState } from 'react';
import { ComposedChart, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, Area } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';
import TimelineEvolutions from '../components/TimelineEvolutions';
import MemoireCrises from '../components/MemoireCrises';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', purple: '#8b5cf6', gray: '#6b7280'
};

export default function EvolutionsTab({d, darkMode, fp={}}) {
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
