import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, Cell, ReferenceLine } from 'recharts';


const C = { primary: '#1e40af', secondary: '#dc2626', tertiary: '#059669', quaternary: '#d97706', pink: '#db2777', purple: '#7c3aed', cyan: '#0891b2', gray: '#6b7280' };

// Configuration des couleurs pour les graphiques selon le mode
const getChartColors = (darkMode) => ({
  grid: darkMode ? '#374151' : '#e5e7eb',
  axis: darkMode ? '#9ca3af' : '#6b7280',
  text: darkMode ? '#e5e7eb' : '#374151',
  tooltipBg: darkMode ? '#1f2937' : '#ffffff',
  tooltipBorder: darkMode ? '#374151' : '#e5e7eb',
});

// Composant Tooltip personnalisé pour mode sombre
const CustomTooltip = ({ active, payload, label, darkMode, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  const colors = getChartColors(darkMode);
  return (
    <div style={{
      backgroundColor: colors.tooltipBg,
      border: `1px solid ${colors.tooltipBorder}`,
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: darkMode ? '0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <p style={{ color: colors.text, fontWeight: 600, marginBottom: 4, fontSize: 12 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontSize: 12, margin: '2px 0' }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('conjoncture');
  const [subTab, setSubTab] = useState('chomage');
  const [subTabVie, setSubTabVie] = useState('loyers');
  const [subTabConj, setSubTabConj] = useState('pib');
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
    fetch('./data.json')
      .then(r => { if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Chargement des données...</h2>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="text-center p-6">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-red-700 mb-2">Erreur de chargement</h2>
        <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error || "Données non disponibles"}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Réessayer</button>
      </div>
    </div>
  );

  const d = data;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`py-4 px-4 ${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-blue-800 to-blue-600'} text-white`}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">📊 Tableau de Bord Économique CFTC</h1>
            <div className="flex flex-wrap gap-x-4 text-sm mt-1">
              <span className={darkMode ? 'text-gray-400' : 'text-blue-200'}>Màj : {d.last_updated}</span>
              <span className={darkMode ? 'text-gray-300' : 'text-blue-100'}>📧 <a href={`mailto:${d.contact}`} className="underline hover:text-white">{d.contact}</a></span>
            </div>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-700 hover:bg-blue-800'}`}
            title={darkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          <Kpi label="PIB T3" value={`+${d.indicateurs_cles.croissance_pib}%`} color="green" darkMode={darkMode} tooltip="Croissance trimestrielle du Produit Intérieur Brut. Mesure la création de richesse du pays." sparklineData={d.sparklines?.pib || [0.3, 0.2, 0.4, 0.3, 0.5, 0.4]} />
          <Kpi label="Climat affaires" value={d.indicateurs_cles.climat_affaires} color="blue" darkMode={darkMode} tooltip="Indicateur INSEE de confiance des chefs d'entreprise. 100 = moyenne long terme." sparklineData={d.sparklines?.climat || [97, 99, 96, 97, 95, 96]} />
          <Kpi label="Chômage" value={`${d.indicateurs_cles.taux_chomage_actuel}%`} color="red" darkMode={darkMode} tooltip="Taux de chômage BIT (Bureau International du Travail). Part des actifs sans emploi cherchant un travail." sparklineData={d.sparklines?.chomage || [7.5, 7.4, 7.3, 7.4, 7.3, 7.4]} />
          <Kpi label="Inflation" value={`${d.indicateurs_cles.inflation_annuelle}%`} color="green" darkMode={darkMode} tooltip="Glissement annuel de l'IPC (Indice des Prix à la Consommation). Mesure la hausse des prix." sparklineData={d.sparklines?.inflation || [5.2, 4.0, 2.3, 1.8, 1.5, 1.4]} />
          <Kpi label="SMIC net" value={`${d.indicateurs_cles.smic_net}€`} color="blue" darkMode={darkMode} tooltip="Salaire Minimum Interprofessionnel de Croissance. Rémunération horaire minimum légale." sparklineData={d.sparklines?.smic || [1353, 1383, 1399, 1427, 1437, 1462]} />
          <Kpi label="Défaillances" value={`${(d.indicateurs_cles.defaillances_12m/1000).toFixed(1)}k`} color="orange" darkMode={darkMode} tooltip="Nombre d'entreprises en procédure collective sur 12 mois. Indicateur de santé économique." sparklineData={d.sparklines?.defaillances || [52, 55, 58, 62, 64, 66]} />
        </div>

        <div className={`flex flex-wrap gap-2 mb-4 border-b pb-3 overflow-x-auto ${darkMode ? 'border-gray-700' : ''}`}>
          {[['conjoncture','📈 Conjoncture'],['previsions','🔮 Prévisions'],['evolutions','📉 Évolutions'],['pouvoir_achat','💰 Pouvoir d\'achat'],['salaires','💵 Salaires'],['emploi','👥 Emploi'],['travail','⚙️ Travail'],['territoires','🗺️ Territoires'],['conditions_vie','🏠 Conditions vie'],['inflation','📊 Inflation'],['conventions','📋 Conventions'],['comparaison_ue','🇪🇺 Europe'],['simulateur','🧮 Simulateur NAO'],['aide','📖 Aide']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${tab === id ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>{label}</button>
          ))}
        </div>

        {tab === 'conjoncture' && <ConjonctureTab d={d} subTab={subTabConj} setSubTab={setSubTabConj} darkMode={darkMode} />}
        {tab === 'previsions' && <PrevisionsTab d={d} darkMode={darkMode} />}
        {tab === 'evolutions' && <EvolutionsTab d={d} darkMode={darkMode} />}
        {tab === 'comparaison_ue' && <ComparaisonUETab d={d} darkMode={darkMode} />}
        {tab === 'simulateur' && <SimulateurNAOTab d={d} darkMode={darkMode} />}
        {tab === 'pouvoir_achat' && <PouvoirAchatTab d={d} darkMode={darkMode} />}
        {tab === 'salaires' && <SalairesTab d={d} darkMode={darkMode} />}
        {tab === 'emploi' && <EmploiTab d={d} subTab={subTab} setSubTab={setSubTab} darkMode={darkMode} />}
        {tab === 'travail' && <TravailTab d={d} darkMode={darkMode} />}
        {tab === 'territoires' && <TerritoiresTab d={d} darkMode={darkMode} />}
        {tab === 'conditions_vie' && <ConditionsVieTab d={d} subTab={subTabVie} setSubTab={setSubTabVie} darkMode={darkMode} />}
        {tab === 'inflation' && <InflationTab d={d} darkMode={darkMode} />}
        {tab === 'conventions' && <ConventionsTab d={d} darkMode={darkMode} />}
        {tab === 'aide' && <AideTab darkMode={darkMode} />}
      </div>
    </div>
  );
}

// Mini sparkline SVG component
function Sparkline({data, color, darkMode}) {
  if (!data || data.length < 2) return null;
  
  const values = data.map(d => typeof d === 'object' ? d.value : d);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const width = 60;
  const height = 20;
  const padding = 2;
  
  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((v - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');
  
  const lastValue = values[values.length - 1];
  const prevValue = values[values.length - 2];
  const trend = lastValue > prevValue ? 'up' : lastValue < prevValue ? 'down' : 'stable';
  const strokeColor = color === 'green' ? '#22c55e' : color === 'red' ? '#ef4444' : color === 'orange' ? '#f97316' : '#3b82f6';
  
  return (
    <div className="flex items-center gap-1">
      <svg width={width} height={height} className="opacity-70">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          points={points}
        />
        <circle
          cx={padding + (width - 2 * padding)}
          cy={height - padding - ((lastValue - min) / range) * (height - 2 * padding)}
          r="2"
          fill={strokeColor}
        />
      </svg>
      <span className={`text-[10px] ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
        {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '●'}
      </span>
    </div>
  );
}

function Kpi({label, value, color, darkMode, tooltip, sparklineData}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = {
    green: darkMode ? 'bg-green-900/50 text-green-300 border-green-700' : 'bg-green-50 text-green-800 border-green-200',
    red: darkMode ? 'bg-red-900/50 text-red-300 border-red-700' : 'bg-red-50 text-red-800 border-red-200',
    orange: darkMode ? 'bg-orange-900/50 text-orange-300 border-orange-700' : 'bg-orange-50 text-orange-800 border-orange-200',
    blue: darkMode ? 'bg-blue-900/50 text-blue-300 border-blue-700' : 'bg-blue-50 text-blue-800 border-blue-200'
  };
  return (
    <div 
      className={`p-2 rounded border relative cursor-help ${colors[color]}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <p className="text-xs opacity-75 flex items-center gap-1">{label} {tooltip && <span className="text-[10px]">ⓘ</span>}</p>
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">{value}</p>
        {sparklineData && <Sparkline data={sparklineData} color={color} darkMode={darkMode} />}
      </div>
      {showTooltip && tooltip && (
        <div className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded shadow-lg text-xs w-52 ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-800 text-white'}`}>
          {tooltip}
          {sparklineData && (
            <div className="mt-1 pt-1 border-t border-gray-600 text-[10px] opacity-75">
              📈 Historique: {sparklineData.length} trimestres
            </div>
          )}
          <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${darkMode ? 'border-t-gray-700' : 'border-t-gray-800'}`}></div>
        </div>
      )}
    </div>
  );
}

function Card({title, children, darkMode}) {
  return <div className={`rounded-xl shadow p-4 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}><h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{title}</h3>{children}</div>;
}

// Props communes pour tous les graphiques en mode sombre
const useChartProps = (darkMode) => {
  const colors = getChartColors(darkMode);
  return {
    cartesianGrid: { strokeDasharray: "3 3", stroke: colors.grid },
    xAxis: { tick: { fill: colors.axis, fontSize: 10 }, axisLine: { stroke: colors.grid }, tickLine: { stroke: colors.grid } },
    yAxis: { tick: { fill: colors.axis, fontSize: 11 }, axisLine: { stroke: colors.grid }, tickLine: { stroke: colors.grid } },
    legend: { wrapperStyle: { fontSize: 10, color: colors.text } },
    tooltip: { 
      contentStyle: { 
        backgroundColor: colors.tooltipBg, 
        border: `1px solid ${colors.tooltipBorder}`,
        borderRadius: '8px',
        color: colors.text
      },
      labelStyle: { color: colors.text, fontWeight: 600 },
      itemStyle: { color: colors.text }
    }
  };
};

// NOUVEL ONGLET CONJONCTURE
function ConjonctureTab({d, subTab, setSubTab, darkMode}) {
  const chartProps = useChartProps(darkMode);
  
  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-1 p-2 rounded shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {[['pib','Croissance PIB'],['partage_va','⚖️ Partage VA'],['climat','Climat affaires'],['defaillances','Défaillances'],['investissement','Investissement']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-2 py-1 rounded text-xs font-medium ${subTab===id?'bg-indigo-600 text-white': darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'pib' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📈 Croissance trimestrielle du PIB (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={d.pib.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} />
              <YAxis domain={[-0.5, 1]} {...chartProps.yAxis} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke={darkMode ? '#6b7280' : C.gray} />
              <Bar dataKey="croissance" name="Croissance T/T-1">
                {d.pib.evolution.map((e, i) => <Cell key={i} fill={e.croissance >= 0 ? C.tertiary : C.secondary} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Situation actuelle" darkMode={darkMode}>
          <div className="space-y-3 p-2">
            <div className={`flex justify-between items-center p-3 rounded ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <span className={darkMode ? 'text-gray-300' : ''}>Croissance T3 2025</span>
              <span className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>+{d.pib.croissance_trim_actuel}%</span>
            </div>
            <div className={`flex justify-between items-center p-3 rounded ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <span className={darkMode ? 'text-gray-300' : ''}>Croissance annuelle 2024</span>
              <span className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>+{d.pib.croissance_annuelle}%</span>
            </div>
            <div className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
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
              <Bar dataKey="croissance">
                {d.pib.annuel.map((e, i) => <Cell key={i} fill={e.croissance >= 0 ? C.tertiary : C.secondary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {/* PARTAGE DE LA VALEUR AJOUTÉE */}
      {subTab === 'partage_va' && <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="⚖️ Partage de la VA des SNF (%)" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={d.partage_va.evolution}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="annee" {...chartProps.xAxis} />
                <YAxis domain={[20, 70]} {...chartProps.yAxis} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Legend {...chartProps.legend} />
                <Area dataKey="salaires" name="Part salaires" fill={C.primary} fillOpacity={0.3} stroke={C.primary} strokeWidth={2} />
                <Line dataKey="ebe" name="Part profits (EBE)" stroke={C.secondary} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="📊 Répartition actuelle (2024)" darkMode={darkMode}>
            <div className="space-y-3 p-2">
              <div className={`flex justify-between items-center p-3 rounded ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <span className={`font-medium ${darkMode ? 'text-gray-300' : ''}`}>Rémunération salariés</span>
                <span className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{d.partage_va.part_salaires_snf}%</span>
              </div>
              <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}>
                <span className="font-medium">Excédent Brut Exploitation</span>
                <span className="text-2xl font-bold text-red-600">{d.partage_va.part_ebe_snf}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">Impôts sur production</span>
                <span className="text-xl font-bold text-gray-600">{d.partage_va.part_impots_snf}%</span>
              </div>
            </div>
          </Card>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="📉 Taux de marge des SNF" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.partage_va.taux_marge_snf}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} />
                <YAxis {...chartProps.yAxis} domain={[28, 35]} fontSize={11} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Bar dataKey="taux" name="Taux de marge">
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
                <Bar dataKey="salaires" name="Salaires" fill={C.primary} />
                <Bar dataKey="ebe" name="Profits" fill={C.secondary} />
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

      {subTab === 'climat' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="🌡️ Climat des affaires et confiance des ménages" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.climat_affaires.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="mois" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} domain={[85, 105]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} />
              <Legend {...chartProps.legend} />
              <ReferenceLine y={100} stroke={C.gray} strokeDasharray="5 5" label={{value:"Moyenne", fontSize:9}} />
              <Line dataKey="climat" name="Climat affaires" stroke={C.primary} strokeWidth={2} />
              <Line dataKey="menages" name="Confiance ménages" stroke={C.quaternary} strokeWidth={2} />
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
              <Bar dataKey="climat" fill={C.primary}>
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

      {subTab === 'defaillances' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="⚠️ Défaillances d'entreprises (cumul 12 mois)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={d.defaillances.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="mois" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} domain={[40000, 70000]} fontSize={10} tickFormatter={v => `${v/1000}k`} />
              <Tooltip {...chartProps.tooltip} formatter={v => v.toLocaleString()} />
              <ReferenceLine y={d.defaillances.moyenne_2010_2019} stroke={C.quaternary} strokeDasharray="5 5" label={{value:"Moy. 2010-19", fontSize:8, fill:C.quaternary}} />
              <Area dataKey="cumul" fill={C.secondary} fillOpacity={0.2} stroke="none" />
              <Line dataKey="cumul" stroke={C.secondary} strokeWidth={2} dot={false} />
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
            <div className="bg-gray-50 p-3 rounded text-xs">
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

      {subTab === 'investissement' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📉 Investissement des entreprises (FBCF)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.investissement.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} />
              <YAxis {...chartProps.yAxis} domain={[-1, 1.5]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke={C.gray} />
              <Bar dataKey="variation" name="Variation T/T-1">
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
              <Bar dataKey="variation_an" name="Évolution annuelle">
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
      
      {d.sources_par_onglet?.conjoncture && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.conjoncture}</p>
      )}
    </div>
  );
}

// ONGLET COMPARAISON UE
function ComparaisonUETab({d, darkMode}) {
  const chartProps = useChartProps(darkMode);
  const [subTab, setSubTab] = useState('smic');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 bg-white p-2 rounded shadow-sm">
        {[['smic','💰 SMIC'],['chomage','👥 Chômage'],['partage_va','⚖️ Part salaires VA']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-2 py-1 rounded text-xs font-medium ${subTab===id?'bg-blue-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'smic' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="💰 Salaire minimum brut mensuel (€)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.comparaison_ue.smic_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 3000]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v.toLocaleString()}€`} />
              <Bar dataKey="smic" name="SMIC brut">
                {d.comparaison_ue.smic_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.primary : C.gray} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 En pouvoir d'achat (SPA)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.comparaison_ue.smic_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 2200]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v.toLocaleString()} SPA`} />
              <Bar dataKey="spa" name="Pouvoir d'achat réel">
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

      {subTab === 'chomage' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="👥 Taux de chômage (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.chomage_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 12]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
              <Bar dataKey="taux" name="Chômage total">
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
              <Bar dataKey="jeunes" name="-25 ans">
                {d.comparaison_ue.chomage_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.secondary : (e.jeunes > 15 ? C.quaternary : C.tertiary)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {subTab === 'partage_va' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="⚖️ Part des salaires dans la VA (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.part_salaires_va_ue} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[50, 65]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
              <ReferenceLine x={56.8} stroke={C.gray} strokeDasharray="5 5" />
              <Bar dataKey="part" name="Part salaires">
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
            <div className={`p-3 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded text-sm`}>
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
function SimulateurNAOTab({d, darkMode}) {
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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold">🧮 Simulateur NAO Complet</h2>
            <p className="text-sm opacity-80">Impact salarié + employeur avec exonérations</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRegime('2025')} className={`px-3 py-1 rounded text-sm ${regime === '2025' ? 'bg-white text-indigo-600 font-bold' : 'bg-indigo-500'}`}>2025 RGCP</button>
            <button onClick={() => setRegime('2026')} className={`px-3 py-1 rounded text-sm ${regime === '2026' ? 'bg-white text-indigo-600 font-bold' : 'bg-indigo-500'}`}>2026 RGDU</button>
          </div>
        </div>
      </div>

      <div className={`p-3 rounded-lg text-sm ${regime === '2026' ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
        {regime === '2026' ? (
          <span className="text-blue-700"><b>🆕 RGDU 2026</b> • Seuil <b>3 SMIC</b> • Minimum <b>2%</b> • Formule P=1.75</span>
        ) : (
          <span className="text-amber-700"><b>📜 RGCP 2025</b> • Seuil <b>1.6 SMIC</b> + Taux réduits maladie/famille</span>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Card title="👤 Salarié" darkMode={darkMode}>
          <div className="space-y-2">
            <select value={statut} onChange={e => setStatut(e.target.value)} className="w-full border rounded p-1.5 text-sm">
              <option value="non_cadre">🏢 Non-cadre (23%)</option>
              <option value="cadre">👔 Cadre (25%)</option>
              <option value="fonctionnaire">🏛️ Fonctionnaire (17%)</option>
            </select>
            <div>
              <input type="range" min="1200" max="6000" step="50" value={salaireBrut} onChange={e => setSalaireBrut(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-sm"><span className="font-bold text-blue-600">{salaireBrut}€</span><span className={darkMode ? "text-gray-400" : "text-gray-500"}>{(salaireBrut / SMIC).toFixed(2)} SMIC</span></div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <select value={situation} onChange={e => setSituation(e.target.value)} className="border rounded p-1 text-xs"><option value="seul">Seul</option><option value="couple">Couple</option></select>
              <select value={enfants} onChange={e => setEnfants(Number(e.target.value))} className="border rounded p-1 text-xs"><option value={0}>0 enf.</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3+</option></select>
            </div>
          </div>
        </Card>

        <Card title="🏭 Entreprise" darkMode={darkMode}>
          <div className="space-y-2">
            <select value={effectif} onChange={e => setEffectif(e.target.value)} className="w-full border rounded p-1.5 text-sm">
              <option value="moins50">&lt; 50 sal.</option><option value="plus50">≥ 50 sal.</option>
            </select>
            <div className="p-2 bg-gray-50 rounded text-xs space-y-1">
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
          <div className={`h-full flex flex-col justify-center items-center p-2 rounded ${pouvoirAchatPreserve ? 'bg-green-50' : 'bg-red-50'}`}>
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
          <div className={`p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded text-center mt-2`}><span className="text-xs">Gain annuel</span><p className="text-lg font-bold text-blue-600">+{Math.round(gainNetAnnuel).toLocaleString()}€</p></div>
        </Card>

        <Card title="🏛️ Prime activité" darkMode={darkMode}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className={`p-2 ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'} rounded text-center`}><p className="text-xs">Avant</p><p className="font-bold text-purple-600">{primeAct}€</p></div>
            <div className={`p-2 ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'} rounded text-center`}><p className="text-xs">Après</p><p className="font-bold text-purple-600">{primeNouv}€</p></div>
          </div>
          {pertePrime > 0 && <div className={`p-2 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded text-center mt-2 text-red-700 text-sm`}>⚠️ Perte: -{pertePrime}€/mois</div>}
        </Card>

        <Card title="✅ Bilan salarié" darkMode={darkMode}>
          <div className="p-3 bg-green-100 rounded text-center">
            <p className="text-xs">GAIN RÉEL</p>
            <p className="text-3xl font-bold text-green-600">+{Math.round(gainReel)}€/m</p>
            <p className="text-sm">+{Math.round(gainReelAn).toLocaleString()}€/an</p>
          </div>
        </Card>
      </div>

      <div className={`rounded-lg p-4 ${regime === '2026' ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
        <h3 className={`font-bold mb-3 ${regime === '2026' ? 'text-blue-800' : 'text-amber-800'}`}>🏭 Exonérations employeur - {regime === '2026' ? 'RGDU 2026' : 'RGCP 2025'}</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded p-3">
            <h4 className="font-semibold text-sm mb-2"><span className={`inline-block w-3 h-3 rounded-full mr-2 ${redActuelle.ok ? 'bg-green-500' : 'bg-red-500'}`}></span>{regime === '2026' ? 'RGDU' : 'Fillon'}</h4>
            <div className="text-xs space-y-1">
              <p>Seuil: ≤ <b>{regime === '2026' ? '3' : '1.6'} SMIC</b> ({Math.round(SMIC * (regime === '2026' ? 3 : 1.6))}€)</p>
              <p>Ratio: <b>{redActuelle.ratio.toFixed(2)} SMIC</b> {redActuelle.ok ? '✅' : '❌'}</p>
              <p>Coefficient: <b>{(redActuelle.coef * 100).toFixed(2)}%</b>{regime === '2026' && redActuelle.min && <span className="text-blue-600 ml-1">(min 2%)</span>}</p>
            </div>
            {regime === '2026' && <div className={`text-xs p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded my-2 font-mono`}>C = {T_MIN} + ({T_DELTA} × [(½)(3×SMIC/rém - 1)]^{P})</div>}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2 bg-gray-50 rounded text-center"><p className="text-xs text-gray-500">Actuel</p><p className="font-bold text-green-600">{redActuelle.mens}€/m</p><p className="text-xs">{redActuelle.an.toLocaleString()}€/an</p></div>
              <div className="p-2 bg-gray-50 rounded text-center"><p className="text-xs text-gray-500">Après</p><p className={`font-bold ${redNouvelle.ok ? 'text-green-600' : 'text-red-600'}`}>{redNouvelle.mens}€/m</p><p className="text-xs">{redNouvelle.an.toLocaleString()}€/an</p></div>
            </div>
            {perteRed > 0 && <p className="text-xs text-orange-600 mt-2 text-center">⚠️ Perte employeur: -{perteRed.toLocaleString()}€/an</p>}
          </div>

          <div className="bg-white rounded p-3">
            {regime === '2025' ? (
              <>
                <h4 className="font-semibold text-sm mb-2">Taux réduits maladie & famille</h4>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div><p className="font-medium">Maladie (7% vs 13%)</p><p className={darkMode ? "text-gray-400" : "text-gray-500"}>≤ 2.25 SMIC</p></div>
                    <span className={`px-2 py-1 rounded ${txRedAct?.okMal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{txRedAct?.okMal ? `✅ -${txRedAct.mal}€` : '❌'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div><p className="font-medium">Famille (3.45% vs 5.25%)</p><p className={darkMode ? "text-gray-400" : "text-gray-500"}>≤ 3.3 SMIC</p></div>
                    <span className={`px-2 py-1 rounded ${txRedAct?.okFam ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{txRedAct?.okFam ? `✅ -${txRedAct.fam}€` : '❌'}</span>
                  </div>
                </div>
                <div className={`mt-2 p-2 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded text-xs text-red-700`}>⚠️ Supprimés au 01/01/2026</div>
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

        <div className="mt-4 bg-white rounded p-3">
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

function PouvoirAchatTab({d, darkMode}) {
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
      <div className={`flex flex-wrap gap-1 p-2 rounded shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {[['general','📊 Général'],['budget','🧺 Budget UNAF'],['heures','⏱️ Heures de travail']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded text-sm font-medium ${subTab===id?'bg-orange-600 text-white': darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
        ))}
      </div>

      {/* ONGLET GÉNÉRAL */}
      {subTab === 'general' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📊 Inflation vs Salaires (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.inflation_salaires}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} /><YAxis {...chartProps.yAxis} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar dataKey="inflation" name="Inflation" fill={C.secondary} /><Bar dataKey="smic" name="SMIC" fill={C.primary} /><Bar dataKey="salaires_base" name="Salaires" fill={C.tertiary} /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Évolution cumulée (base 100)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}><LineChart data={d.pouvoir_achat_cumule}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="periode" {...chartProps.xAxis} /><YAxis {...chartProps.yAxis} domain={[98,120]} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Line dataKey="prix" name="Prix" stroke={C.secondary} strokeWidth={2} /><Line dataKey="smic" name="SMIC" stroke={C.primary} strokeWidth={2} /><Line dataKey="salaires" name="Salaires" stroke={C.tertiary} strokeWidth={2} /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="📋 Part salariés au SMIC" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><BarChart data={d.smic?.part_salaries || []}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} /><YAxis {...chartProps.yAxis} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} /><Bar dataKey="part" fill={C.quaternary}>{(d.smic?.part_salaries || []).map((e,i)=><Cell key={i} fill={e.part>15?C.secondary:C.quaternary}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
      </div>}

      {/* ONGLET BUDGET UNAF */}
      {subTab === 'budget' && <div className="space-y-4">
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-r from-orange-900 to-amber-900' : 'bg-gradient-to-r from-orange-500 to-amber-500'} text-white`}>
          <h2 className="text-lg font-bold">🧺 Budget-Type Familial (UNAF)</h2>
          <p className="text-sm opacity-90">Source officielle : <a href={budgetsUNAF.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">UNAF</a> • Données {budgetsUNAF.lastUpdate}</p>
          <p className="text-xs opacity-75 mt-1">{budgetsUNAF.description}</p>
        </div>

        {/* Sélecteurs */}
        <div className={`p-3 rounded-lg flex flex-wrap gap-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div>
            <label className={`text-xs font-medium block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Type de famille</label>
            <div className="flex gap-1">
              {Object.entries(budgetsUNAF.familles).map(([id, f]) => (
                <button key={id} onClick={() => setFamilleType(id)} className={`px-2 py-1.5 rounded text-xs ${familleType === id ? 'bg-orange-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {f.icon} {f.nom.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-xs font-medium block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Zone géographique</label>
            <div className="flex gap-1">
              {[['horsIdf', '🌳 Province'], ['idf', '🏙️ Île-de-France'], ['france', '🇫🇷 Moyenne France']].map(([id, label]) => (
                <button key={id} onClick={() => setZoneGeo(id)} className={`px-2 py-1.5 rounded text-xs ${zoneGeo === id ? 'bg-blue-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-orange-900/30 border border-orange-700' : 'bg-orange-50 border border-orange-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>Budget mensuel</p>
            <p className="text-3xl font-bold text-orange-500">{totalActuel.toLocaleString('fr-FR')}€</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{budgetsUNAF.familles[familleType]?.nom}</p>
          </div>
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-600'}`}>Équivalent SMIC</p>
            <p className={`text-3xl font-bold ${parseInt(partSmic) > 200 ? 'text-red-500' : 'text-orange-500'}`}>{partSmic}%</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>≈ {(totalActuel / smicNetMensuel).toFixed(1)} SMIC nets</p>
          </div>
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Évolution 2020→2025</p>
            <p className="text-3xl font-bold text-blue-500">+{evolution2020}%</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>+{(totalActuel - total2020).toLocaleString('fr-FR')}€/mois</p>
          </div>
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-purple-900/30 border border-purple-700' : 'bg-purple-50 border border-purple-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>Catégories UNAF</p>
            <p className="text-3xl font-bold text-purple-500">10</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>postes budgétaires</p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="📈 Évolution du budget 2020-2025" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={historiqueData}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="annee" {...chartProps.xAxis} />
                <YAxis {...chartProps.yAxis} domain={['dataMin - 300', 'dataMax + 200']} tickFormatter={v => `${v}€`} />
                <Tooltip {...chartProps.tooltip} formatter={(v) => [`${v.toLocaleString('fr-FR')}€`, 'Budget']} />
                <Bar dataKey="total" fill={C.primary} radius={[4, 4, 0, 0]}>
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
                <Bar dataKey="montant" radius={[0, 4, 4, 0]}>
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
                <div key={cat.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
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
          <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              💡 <strong>Source officielle :</strong> Ces données proviennent des <a href={budgetsUNAF.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">budgets-types UNAF</a>, 
              qui évaluent les dépenses nécessaires pour vivre décemment. Mis à jour mensuellement.
            </p>
          </div>
        </Card>
      </div>}

      {/* ONGLET HEURES DE TRAVAIL */}
      {subTab === 'heures' && <div className="space-y-4">
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-r from-blue-900 to-indigo-900' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white`}>
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
                className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 ' + (darkMode ? 'bg-blue-900/30 border-blue-500' : 'bg-blue-50 border-blue-300') : darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow'}`}>
                <div className="flex justify-between items-start">
                  <span className="text-2xl">{p.icon}</span>
                  {variation && <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${parseInt(variation) > 0 ? (darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-600') : (darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-600')}`}>{parseInt(variation) > 0 ? '+' : ''}{variation}%</span>}
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
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Heures de travail nécessaires</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={evolutionProduit}>
                    <CartesianGrid {...chartProps.cartesianGrid} />
                    <XAxis dataKey="annee" {...chartProps.xAxis} />
                    <YAxis {...chartProps.yAxis} />
                    <Tooltip {...chartProps.tooltip} formatter={v=>[`${v}h`, 'Heures']} />
                    <Bar dataKey="heures" fill={C.primary} radius={[4, 4, 0, 0]}>
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
                    <Line dataKey="prix" stroke={C.tertiary} strokeWidth={3} dot={{ fill: C.tertiary, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )}

        {!produitSelect && (
          <div className={`text-center p-8 rounded-xl border-2 border-dashed ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
            <p className="text-4xl mb-2">👆</p>
            <p>Cliquez sur un produit pour voir son évolution depuis 2010</p>
          </div>
        )}

        <div className={`p-3 rounded-lg text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
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

function SalairesTab({d, darkMode}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="💰 Salaire médian net" darkMode={darkMode}>
        <ResponsiveContainer width="100%" height={200}><BarChart data={d.salaire_median.evolution}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} /><YAxis {...chartProps.yAxis} domain={[1800,2300]} fontSize={11} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}€`} /><Bar dataKey="montant" fill={C.primary} /></BarChart></ResponsiveContainer>
        <p className="text-center text-xl font-bold text-green-600 mt-2">{d.salaire_median.montant_2024}€</p>
      </Card>
      <Card title="👫 Écart H/F (EQTP)" darkMode={darkMode}>
        <ResponsiveContainer width="100%" height={200}><LineChart data={d.ecart_hommes_femmes.evolution}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} /><YAxis {...chartProps.yAxis} domain={[10,20]} fontSize={11} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} /><Line dataKey="ecart" stroke={C.pink} strokeWidth={3} /></LineChart></ResponsiveContainer>
        <div className="flex justify-around text-xs mt-2"><div className="text-center"><span className={darkMode ? "text-gray-400" : "text-gray-500"}>Global</span><br/><b>{d.ecart_hommes_femmes.ecart_global}%</b></div><div className="text-center"><span className={darkMode ? "text-gray-400" : "text-gray-500"}>EQTP</span><br/><b className="text-pink-600">{d.ecart_hommes_femmes.ecart_eqtp}%</b></div><div className="text-center"><span className={darkMode ? "text-gray-400" : "text-gray-500"}>Poste égal</span><br/><b className="text-green-600">{d.ecart_hommes_femmes.ecart_poste_comparable}%</b></div></div>
      </Card>
      <Card title="🏭 Salaires par secteur" darkMode={darkMode}>
        <ResponsiveContainer width="100%" height={200}><BarChart data={d.salaires_secteur} layout="vertical"><CartesianGrid {...chartProps.cartesianGrid} /><XAxis {...chartProps.xAxis} type="number" fontSize={11} /><YAxis {...chartProps.yAxis} dataKey="secteur" type="category" width={70} fontSize={10} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}€`} /><Bar dataKey="salaire" fill={C.primary} /></BarChart></ResponsiveContainer>
      </Card>
      <Card title="🎁 PPV" darkMode={darkMode}>
        <div className="grid grid-cols-2 gap-2 p-2">
          <div className={`text-center p-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><p className="text-xs">Bénéf. 2023</p><p className="text-xl font-bold text-blue-600">{d.ppv.beneficiaires_2023}%</p></div>
          <div className={`text-center p-3 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}><p className="text-xs">Bénéf. 2024</p><p className="text-xl font-bold text-orange-600">{d.ppv.beneficiaires_2024}%</p></div>
          <div className={`text-center p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}><p className="text-xs">Montant moy.</p><p className="text-xl font-bold text-green-600">{d.ppv.montant_moyen}€</p></div>
          <div className="text-center p-3 bg-gray-50 rounded"><p className="text-xs">Total 2024</p><p className="text-xl font-bold">{d.ppv.montant_total_2024}Md€</p></div>
        </div>
      </Card>
      
      {d.sources_par_onglet?.salaires && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200 col-span-2">📚 Sources : {d.sources_par_onglet.salaires}</p>
      )}
    </div>
  );
}

function EmploiTab({d, subTab, setSubTab, darkMode}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 bg-white p-2 rounded shadow-sm">
        {[['chomage','Chômage'],['seniors','Seniors'],['contrats','Contrats'],['secteurs','Secteurs'],['recrutement','Recrutement'],['dynamique','Dynamique']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-2 py-1 rounded text-xs font-medium ${subTab===id?'bg-purple-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'chomage' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📉 Taux de chômage (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}><LineChart data={d.chomage}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} /><YAxis {...chartProps.yAxis} domain={[0,22]} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Line dataKey="taux" name="Ensemble" stroke={C.primary} strokeWidth={3} /><Line dataKey="jeunes" name="15-24 ans" stroke={C.secondary} strokeWidth={2} strokeDasharray="5 5" /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="📊 Dernières données" darkMode={darkMode}>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div className={`text-center p-4 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><p className="text-sm text-gray-600">Global</p><p className="text-3xl font-bold text-blue-600">{d.indicateurs_cles.taux_chomage_actuel}%</p></div>
            <div className={`text-center p-4 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}><p className="text-sm text-gray-600">Jeunes</p><p className="text-3xl font-bold text-red-600">{d.indicateurs_cles.taux_chomage_jeunes}%</p></div>
          </div>
        </Card>
      </div>}

      {subTab === 'seniors' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="👴 Taux d'emploi 55-64 ans" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}><ComposedChart data={d.emploi_seniors}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} /><YAxis {...chartProps.yAxis} domain={[55,65]} fontSize={11} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} /><Area dataKey="taux" fill={C.tertiary} fillOpacity={0.2} stroke="none" /><Line dataKey="taux" stroke={C.tertiary} strokeWidth={3} /></ComposedChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Contexte" darkMode={darkMode}><div className="p-4"><div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded mb-3`}><span>Taux actuel</span><span className="text-2xl font-bold text-green-600">{d.indicateurs_cles.taux_emploi_seniors}%</span></div></div></Card>
      </div>}

      {subTab === 'contrats' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📋 Répartition contrats" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.types_contrats}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar dataKey="cdi" name="CDI" stackId="a" fill={C.primary} /><Bar dataKey="cdd" name="CDD" stackId="a" fill={C.quaternary} /><Bar dataKey="interim" name="Intérim" stackId="a" fill={C.secondary} /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="📊 T3 2025" darkMode={darkMode}><div className="p-4 space-y-2">{(()=>{const l=d.types_contrats[d.types_contrats.length-1];return<><div className={`flex justify-between p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><span>CDI</span><b className="text-blue-600">{l.cdi}%</b></div><div className={`flex justify-between p-2 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}><span>CDD</span><b className="text-orange-600">{l.cdd}%</b></div><div className={`flex justify-between p-2 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}><span>Intérim</span><b className="text-red-600">{l.interim}%</b></div></>})()}</div></Card>
      </div>}

      {subTab === 'secteurs' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="🏭 Emploi par secteur (k)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.emploi_secteur.secteurs} layout="vertical"><CartesianGrid {...chartProps.cartesianGrid} /><XAxis {...chartProps.xAxis} type="number" fontSize={11} /><YAxis {...chartProps.yAxis} dataKey="secteur" type="category" width={110} fontSize={9} /><Tooltip {...chartProps.tooltip} /><Bar dataKey="emploi" fill={C.primary}>{d.emploi_secteur.secteurs.map((e,i)=><Cell key={i} fill={e.evolution_trim<0?C.secondary:C.tertiary}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Évolutions" darkMode={darkMode}><div className="p-2 space-y-1">{d.emploi_secteur.secteurs.map((s,i)=><div key={i} className="flex justify-between text-xs p-2 bg-gray-50 rounded"><span>{s.secteur}</span><span className={s.evolution_an>=0?'text-green-600':'text-red-600'}>{s.evolution_an>=0?'+':''}{s.evolution_an}%/an</span></div>)}</div></Card>
      </div>}

      {subTab === 'recrutement' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="🔴 Difficultés recrutement (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={200}><LineChart data={d.difficultes_recrutement}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} /><YAxis {...chartProps.yAxis} domain={[20,70]} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Line dataKey="construction" name="BTP" stroke={C.quaternary} strokeWidth={2} /><Line dataKey="industrie" name="Industrie" stroke={C.primary} strokeWidth={2} /><Line dataKey="services" name="Services" stroke={C.tertiary} strokeWidth={2} /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="⚠️ Métiers en tension" darkMode={darkMode}>
          <div className="overflow-x-auto max-h-48"><table className="w-full text-xs"><thead><tr className="bg-gray-100"><th className="text-left p-1">Métier</th><th className="p-1">%</th></tr></thead><tbody>{d.tensions_metiers.metiers_plus_tendus.slice(0,6).map((m,i)=><tr key={i} className="border-b"><td className="p-1">{m.metier}</td><td className="p-1 text-center"><span className={`px-1 py-0.5 rounded text-white text-xs ${m.difficulte>=80?'bg-red-600':'bg-orange-500'}`}>{m.difficulte}%</span></td></tr>)}</tbody></table></div>
        </Card>
      </div>}

      {subTab === 'dynamique' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📊 Créations/Destructions (k)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}><ComposedChart data={d.creations_destructions.donnees}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar dataKey="creations" name="Créations" fill={C.tertiary} /><Bar dataKey="destructions" name="Destructions" fill={C.secondary} /><Line dataKey="solde" name="Solde" stroke={C.primary} strokeWidth={3} /></ComposedChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Solde net" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.creations_destructions.donnees}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v>=0?'+':''}${v}k`} /><Bar dataKey="solde">{d.creations_destructions.donnees.map((e,i)=><Cell key={i} fill={e.solde>=0?C.tertiary:C.secondary}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
      </div>}
      
      {d.sources_par_onglet?.emploi && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.emploi}</p>
      )}
    </div>
  );
}

function ConditionsVieTab({d, subTab, setSubTab, darkMode}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 bg-white p-2 rounded shadow-sm">
        {[['loyers','Loyers (IRL)'],['immobilier','Prix immobilier'],['carburants','Carburants'],['effort','Taux d\'effort']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-2 py-1 rounded text-xs font-medium ${subTab===id?'bg-cyan-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'loyers' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📈 Indice de Référence des Loyers (IRL)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={d.irl.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} yAxisId="left" domain={[130,150]} fontSize={11} />
              <YAxis {...chartProps.yAxis} yAxisId="right" orientation="right" domain={[0,4]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} />
              <Legend {...chartProps.legend} />
              <Bar yAxisId="right" dataKey="glissement" name="Glissement %" fill={C.quaternary} />
              <Line yAxisId="left" dataKey="indice" name="Indice" stroke={C.primary} strokeWidth={2} />
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
            <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} p-3 rounded text-xs`}>
              <p className="font-semibold">💡 Impact loyer 800€</p>
              <p>Hausse max = <b>+{(800 * d.irl.glissement_annuel / 100).toFixed(0)}€/mois</b></p>
            </div>
          </div>
        </Card>
      </div>}

      {subTab === 'immobilier' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="🏠 Prix logements anciens" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={d.prix_immobilier.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} domain={[110,130]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} />
              <Area dataKey="indice" fill={C.primary} fillOpacity={0.2} stroke="none" />
              <Line dataKey="indice" stroke={C.primary} strokeWidth={2} />
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
              <Bar dataKey="prix_m2" fill={C.primary}>
                {d.prix_immobilier.par_zone.map((e,i)=><Cell key={i} fill={e.variation<0?C.secondary:C.tertiary}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {subTab === 'carburants' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="⛽ Prix carburants (€/L)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.carburants.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="mois" {...chartProps.xAxis} fontSize={8} />
              <YAxis {...chartProps.yAxis} domain={[1.5,2.0]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} />
              <Legend {...chartProps.legend} />
              <Line dataKey="gazole" name="Gazole" stroke={C.quaternary} strokeWidth={2} />
              <Line dataKey="sp95" name="SP95" stroke={C.tertiary} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="💰 Prix actuels" darkMode={darkMode}>
          <div className="p-4 space-y-3">
            <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}>
              <span>Gazole</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-orange-600">{d.carburants.gazole.prix}€/L</span>
                <span className={`text-xs ml-2 ${d.carburants.gazole.variation_an<0?'text-green-600':'text-red-600'}`}>{d.carburants.gazole.variation_an}%</span>
              </div>
            </div>
            <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}>
              <span>SP95</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-green-600">{d.carburants.sp95.prix}€/L</span>
                <span className={`text-xs ml-2 ${d.carburants.sp95.variation_an<0?'text-green-600':'text-red-600'}`}>{d.carburants.sp95.variation_an}%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>}

      {subTab === 'effort' && <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="🏠 Taux d'effort par statut" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.taux_effort.par_statut} layout="vertical">
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis {...chartProps.xAxis} type="number" domain={[0,50]} fontSize={11} />
                <YAxis {...chartProps.yAxis} dataKey="statut" type="category" width={120} fontSize={9} />
                <Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} />
                <Legend {...chartProps.legend} />
                <Bar dataKey="taux_median" name="Médian" fill={C.primary} />
                <Bar dataKey="taux_q1" name="25% + modestes" fill={C.secondary} />
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
                <Bar dataKey="taux" fill={C.quaternary}>
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

function InflationTab({d, darkMode}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="space-y-4">
      <Card title="📊 Inflation par poste (%)" darkMode={darkMode}>
        <ResponsiveContainer width="100%" height={280}><BarChart data={d.inflation_detail}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="poste" {...chartProps.xAxis} fontSize={11} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar dataKey="val2022" name="2022" fill={C.secondary} /><Bar dataKey="val2023" name="2023" fill={C.quaternary} /><Bar dataKey="val2024" name="2024" fill={C.tertiary} /></BarChart></ResponsiveContainer>
      </Card>
      <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} border-l-4 border-yellow-400 p-4 rounded`}><h3 className="font-semibold text-yellow-800">📖 Note de lecture</h3><ul className="mt-2 text-sm text-yellow-700 space-y-1"><li>• Alimentation : pic en 2023 (+11.8%), retour à la normale en 2024</li><li>• Services : hausse régulière (~2.7% par an)</li><li>• Loyers : progression continue (+2.8%)</li></ul></div>
      
      {d.sources_par_onglet?.inflation && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.inflation}</p>
      )}
    </div>
  );
}

// ONGLET CONVENTIONS COLLECTIVES
function ConventionsTab({d, darkMode}) {
  const [selectedBranche, setSelectedBranche] = useState(null);
  const [filter, setFilter] = useState('all');
  
  const cc = d.conventions_collectives;
  
  // Protection si données absentes
  if (!cc || !cc.branches || !cc.smic_reference) {
    return (
      <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} border border-yellow-200 rounded-lg p-6 text-center`}>
        <p className="text-yellow-800 text-lg">⚠️ Données des conventions collectives non disponibles</p>
        <p className="text-sm text-yellow-600 mt-2">Vérifiez que data.json contient la section "conventions_collectives"</p>
      </div>
    );
  }
  
  const SMIC = cc.smic_reference.mensuel;
  const SMIC_ANNUEL = cc.smic_reference.annuel;
  
  const branches = cc.branches.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'conforme') return b.statut === 'conforme';
    if (filter === 'non_conforme') return b.statut !== 'conforme';
    return true;
  });
  
  const countNonConformes = cc.branches.filter(b => b.statut !== 'conforme').length;
  
  const getNiveauxSousSmis = (branche) => {
    return branche.grille.filter(n => n.minimum_mensuel < SMIC).length;
  };
  
  const getEcartSmic = (minimum) => {
    return ((minimum - SMIC) / SMIC * 100).toFixed(1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4 rounded-xl">
        <h2 className="text-lg font-bold">📋 Comparateur Conventions Collectives</h2>
        <p className="text-sm opacity-80">Grilles de salaires minima par branche vs SMIC ({SMIC}€)</p>
      </div>

      {/* Statistiques globales */}
      <div className="grid md:grid-cols-4 gap-3">
        <div className={`p-4 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-lg text-center`}>
          <p className="text-3xl font-bold text-blue-600">{cc.statistiques_branches.total_branches}</p>
          <p className="text-sm text-gray-600">Branches suivies</p>
        </div>
        <div className={`p-4 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded-lg text-center`}>
          <p className="text-3xl font-bold text-green-600">{cc.statistiques_branches.branches_conformes}</p>
          <p className="text-sm text-gray-600">Conformes</p>
        </div>
        <div className={`p-4 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded-lg text-center`}>
          <p className="text-3xl font-bold text-red-600">{cc.statistiques_branches.branches_non_conformes}</p>
          <p className="text-sm text-gray-600">Non conformes</p>
        </div>
        <div className={`p-4 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded-lg text-center`}>
          <p className="text-3xl font-bold text-orange-600">{cc.statistiques_branches.pourcentage_non_conformes}%</p>
          <p className="text-sm text-gray-600">Taux non-conformité</p>
        </div>
      </div>

      {/* Alerte si branches non conformes */}
      {countNonConformes > 0 && (
        <div className={`${darkMode ? 'bg-red-900/30' : 'bg-red-50'} border-l-4 border-red-500 p-4 rounded`}>
          <h3 className="font-semibold text-red-800">⚠️ Alerte : {countNonConformes} branche(s) avec minima &lt; SMIC</h3>
          <p className="text-sm text-red-700 mt-1">
            Loi du 16 août 2022 : les branches ont <b>45 jours</b> pour ouvrir des négociations après une revalorisation du SMIC.
            En cas de carence persistante, risque de <b>fusion administrative</b> de la branche.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Toutes ({cc.branches.length})</button>
        <button onClick={() => setFilter('conforme')} className={`px-3 py-1 rounded text-sm ${filter === 'conforme' ? 'bg-green-600 text-white' : 'bg-white border'}`}>✅ Conformes</button>
        <button onClick={() => setFilter('non_conforme')} className={`px-3 py-1 rounded text-sm ${filter === 'non_conforme' ? 'bg-red-600 text-white' : 'bg-white border'}`}>❌ Non conformes</button>
      </div>

      {/* Liste des branches */}
      <div className="grid md:grid-cols-2 gap-3">
        {branches.map((branche, idx) => {
          const niveauxSousSmic = getNiveauxSousSmis(branche);
          const isSelected = selectedBranche === idx;
          
          return (
            <div key={idx} className={`bg-white rounded-lg border-2 ${branche.statut === 'conforme' ? 'border-green-200' : 'border-red-300'} overflow-hidden`}>
              <div 
                className="p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedBranche(isSelected ? null : idx)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{branche.nom}</h4>
                    <p className="text-xs text-gray-500">IDCC {branche.idcc} • {(branche.effectif/1000).toFixed(0)}k salariés</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${branche.statut === 'conforme' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {branche.statut === 'conforme' ? '✅ Conforme' : `❌ ${niveauxSousSmic} niveau(x) < SMIC`}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span>Min: <b>{branche.grille[0].minimum_mensuel}€</b></span>
                  <span>Max: <b>{branche.grille[branche.grille.length-1].minimum_mensuel}€</b></span>
                  <span className={darkMode ? "text-gray-400" : "text-gray-500"}>Màj: {branche.derniere_revalorisation}</span>
                </div>
                {branche.commentaire && (
                  <p className="text-xs text-gray-500 mt-1 italic">{branche.commentaire}</p>
                )}
              </div>
              
              {isSelected && (
                <div className="border-t bg-gray-50 p-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
                        <th className="text-left py-1">Niveau</th>
                        <th className="text-left">Intitulé</th>
                        <th className="text-right">Mensuel</th>
                        <th className="text-right">vs SMIC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branche.grille.map((niveau, i) => {
                        const ecart = getEcartSmic(niveau.minimum_mensuel);
                        const sousSmic = niveau.minimum_mensuel < SMIC;
                        return (
                          <tr key={i} className={sousSmic ? 'bg-red-50' : ''}>
                            <td className="py-1 font-mono">{niveau.niveau}</td>
                            <td className="truncate max-w-[150px]">{niveau.intitule}</td>
                            <td className={`text-right font-medium ${sousSmic ? 'text-red-600' : ''}`}>{niveau.minimum_mensuel}€</td>
                            <td className={`text-right ${ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {ecart >= 0 ? '+' : ''}{ecart}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {branche.source && (
                    <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-xs text-gray-500">Vérif. : {branche.date_verification || 'N/A'}</span>
                      <a href={branche.source} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">🔗 Voir sur Légifrance</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Encadré explicatif */}
      <div className={`${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} border border-blue-200 rounded-lg p-4`}>
        <h3 className="font-semibold text-blue-800 mb-2">📚 Comment lire ces données ?</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <b>Comparez</b> votre grille d'entreprise aux minima de branche</p>
          <p>• <b>Vérifiez</b> que votre employeur respecte les minima conventionnels</p>
          <p>• <b>Observez</b> en montrant l'écart avec le SMIC (+X% minimum requis)</p>
          <p>• <b>Signalez</b> les branches en retard : levier de pression syndicale</p>
        </div>
      </div>

      {/* Métadonnées et sources */}
      {cc.meta && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">📅 Informations sur les données</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <b>Dernière mise à jour :</b> {cc.meta.derniere_mise_a_jour}</p>
            <p>• <b>Prochaine vérification prévue :</b> {cc.meta.prochaine_verification}</p>
            <p>• <b>Branches affichées :</b> {cc.branches.length} / {cc.statistiques_branches?.total_branches || 171} (principales par effectifs)</p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">🔗 Sources officielles :</p>
            <div className="flex flex-wrap gap-2">
              <a href="https://travail-emploi.gouv.fr/dialogue-social/negociation-collective/" target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Ministère du Travail</a>
              <a href="https://www.legifrance.gouv.fr/liste/idcc" target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Légifrance</a>
              <a href="https://code.travail.gouv.fr/outils/convention-collective" target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Code du Travail Numérique</a>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Source : Comité de suivi des négociations salariales de branche ({cc.statistiques_branches?.date_comite_suivi || 'N/A'}) • SMIC au {cc.smic_reference.date}
      </p>
      
      {d.sources_par_onglet?.conventions && (
        <p className="text-xs text-gray-400 text-center mt-2">📚 Sources : {d.sources_par_onglet.conventions}</p>
      )}
    </div>
  );
}

// ==================== ONGLET ÉVOLUTIONS 5 ANS ====================
function EvolutionsTab({d, darkMode}) {
  const chartProps = useChartProps(darkMode);
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
      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-r from-indigo-900 to-purple-900' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white`}>
        <h2 className="text-lg font-bold">📉 Évolutions sur 5 ans (2020-2025)</h2>
        <p className="text-sm opacity-80">Visualisez les tendances économiques pour comprendre la conjoncture</p>
      </div>

      {/* Sélecteur de graphique */}
      <div className={`flex flex-wrap gap-2 p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
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
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${graphType === id ? 'bg-indigo-600 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
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
        <ResponsiveContainer width="100%" height={280}>
          {graphType === 'inflation_smic' && (
            <ComposedChart data={dataInflationSmic}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" {...chartProps.xAxis} />
              <YAxis {...chartProps.yAxis} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend {...chartProps.legend} />
              <Bar dataKey="inflation" name="Inflation annuelle" fill="#ef4444" />
              <Line type="monotone" dataKey="inflation_cum" name="Inflation cumulée" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="smic_evol" name="SMIC évolution" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
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
              <Line yAxisId="right" type="monotone" dataKey="taux_marge" name="Taux de marge SNF (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
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
              <Bar dataKey="pa_smic" name="Pouvoir d'achat SMIC">
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
              <Bar dataKey="defaillances" name="Défaillances (milliers)" fill="#ef4444" />
              <ReferenceLine y={42} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Niveau 2022', fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Card>

      {/* Encadré d'analyse */}
      <div className={`p-4 rounded-lg border ${darkMode ? 'bg-indigo-900/30 border-indigo-700' : 'bg-indigo-50 border-indigo-200'}`}>
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
    </div>
  );
}

// ==================== ONGLET TRAVAIL (Égalité, AT, Formation, Épargne, Temps) ====================
function TravailTab({d, darkMode}) {
  const chartProps = useChartProps(darkMode);
  const [activeSection, setActiveSection] = useState('egalite');
  
  const sections = [
    {id: 'egalite', label: '⚖️ Égalité pro', icon: '⚖️'},
    {id: 'accidents', label: '🚧 Accidents', icon: '🚧'},
    {id: 'formation', label: '📚 Formation', icon: '📚'},
    {id: 'epargne', label: '💰 Épargne', icon: '💰'},
    {id: 'temps', label: '⏰ Temps', icon: '⏰'}
  ];
  
  const egapro = d.egalite_professionnelle || {};
  const accidents = d.accidents_travail || {};
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
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
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
              <div className={`text-center p-3 rounded ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{egapro.index_moyen_national || 88}/100</div>
                <div className="text-sm text-gray-500">Index moyen national</div>
              </div>
              <div className={`text-center p-3 rounded ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{egapro.entreprises_conformes_pct || 77}%</div>
                <div className="text-sm text-gray-500">Entreprises ≥75 pts</div>
              </div>
              <div className={`text-center p-3 rounded ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{((egapro.nombre_declarations || 31000)/1000).toFixed(0)}k</div>
                <div className="text-sm text-gray-500">Déclarations</div>
              </div>
              <div className={`text-center p-3 rounded ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
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
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>📖 Note de lecture</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-purple-200' : 'text-purple-800'}`}>
              {(egapro.notes_lecture || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
            {egapro.sources && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">📚 Sources : {egapro.sources}</p>}
          </div>
        </div>
      )}
      
      {/* ACCIDENTS DU TRAVAIL */}
      {activeSection === 'accidents' && accidents && accidents.total_national && (
        <div className="space-y-4">
          <Card title="🚧 Accidents du Travail et Maladies Professionnelles" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className={`text-center p-3 rounded ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-red-300' : 'text-red-600'}`}>{(accidents.total_national.accidents_avec_arret/1000).toFixed(0)}k</div>
                <div className="text-sm text-gray-500">AT avec arrêt</div>
              </div>
              <div className={`text-center p-3 rounded ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{accidents.total_national.indice_frequence}</div>
                <div className="text-sm text-gray-500">IF / 1000 sal.</div>
              </div>
              <div className={`text-center p-3 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{accidents.total_national.accidents_mortels}</div>
                <div className="text-sm text-gray-500">AT mortels</div>
              </div>
              <div className={`text-center p-3 rounded ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{accidents.total_national.evolution_vs_2019}%</div>
                <div className="text-sm text-gray-500">vs 2019</div>
              </div>
            </div>
            
            {accidents.par_secteur && (
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
                      <tr key={i} className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} ${s.if > 40 ? (darkMode ? 'bg-red-900/20' : 'bg-red-50') : ''}`}>
                        <td className="p-2">{s.secteur}</td>
                        <td className="text-center p-2">{(s.accidents/1000).toFixed(0)}k</td>
                        <td className="text-center p-2">{s.part_pct}%</td>
                        <td className={`text-center p-2 font-semibold ${s.if > 40 ? (darkMode ? 'text-red-400' : 'text-red-600') : ''}`}>{s.if}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>📖 Note de lecture</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
              {(accidents.notes_lecture || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
            {accidents.sources && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">📚 Sources : {accidents.sources}</p>}
          </div>
        </div>
      )}
      
      {/* FORMATION PROFESSIONNELLE */}
      {activeSection === 'formation' && formation && (
        <div className="space-y-4">
          <Card title="📚 Compte Personnel de Formation (CPF)" darkMode={darkMode}>
            {formation.cpf && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className={`text-center p-3 rounded ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{formation.cpf.solde_moyen_euros}€</div>
                    <div className="text-sm text-gray-500">Solde moyen CPF</div>
                  </div>
                  <div className={`text-center p-3 rounded ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{(formation.cpf.formations_financees_2024/1000).toFixed(0)}k</div>
                    <div className="text-sm text-gray-500">Formations 2024</div>
                  </div>
                  <div className={`text-center p-3 rounded ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{formation.cpf.montant_moyen_formation}€</div>
                    <div className="text-sm text-gray-500">Coût moyen</div>
                  </div>
                  <div className={`text-center p-3 rounded ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{formation.cpf.taux_utilisation_pct}%</div>
                    <div className="text-sm text-gray-500">Taux utilisation</div>
                  </div>
                </div>
                
                {formation.cpf.top_formations && (
                  <div className="mb-4">
                    <h4 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : ''}`}>Top formations CPF</h4>
                    <div className="flex flex-wrap gap-2">
                      {formation.cpf.top_formations.map((f, i) => (
                        <span key={i} className={`px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          {f.nom} ({f.part_pct}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
          
          <Card title="🎓 Alternance & Apprentissage" darkMode={darkMode}>
            {formation.alternance && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{(formation.alternance.contrats_apprentissage_2024/1000).toFixed(0)}k</div>
                  <div className="text-sm text-gray-500">Apprentis 2024</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>{(formation.alternance.total_alternants/1000).toFixed(0)}k</div>
                  <div className="text-sm text-gray-500">Total alternants</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{formation.alternance.taux_insertion_6mois}%</div>
                  <div className="text-sm text-gray-500">Insertion 6 mois</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>+{formation.alternance.evolution_vs_2023}%</div>
                  <div className="text-sm text-gray-500">vs 2023</div>
                </div>
              </div>
            )}
          </Card>
          
          {formation.plan_formation && (
            <Card title="📋 Accès à la formation en entreprise" darkMode={darkMode}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formation.plan_formation.acces_formation_cadres_pct}%</div>
                  <div className="text-sm text-gray-500">Cadres formés</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-red-300' : 'text-red-600'}`}>{formation.plan_formation.acces_formation_ouvriers_pct}%</div>
                  <div className="text-sm text-gray-500">Ouvriers formés</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{formation.plan_formation.duree_moyenne_heures}h</div>
                  <div className="text-sm text-gray-500">Durée moyenne</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{formation.plan_formation.budget_moyen_par_salarie}€</div>
                  <div className="text-sm text-gray-500">Budget/salarié</div>
                </div>
              </div>
            </Card>
          )}
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>📖 Note de lecture</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
              {(formation.notes_lecture || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
            {formation.sources && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">📚 Sources : {formation.sources}</p>}
          </div>
        </div>
      )}
      
      {/* ÉPARGNE SALARIALE */}
      {activeSection === 'epargne' && epargne && (
        <div className="space-y-4">
          <Card title="💰 Épargne Salariale (Participation, Intéressement, PEE)" darkMode={darkMode}>
            {epargne.couverture && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{epargne.couverture.salaries_couverts_pct}%</div>
                  <div className="text-sm text-gray-500">Salariés couverts</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{epargne.couverture.salaries_couverts_millions}M</div>
                  <div className="text-sm text-gray-500">Bénéficiaires</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>{epargne.montants_totaux?.primes_brutes_mds}Md€</div>
                  <div className="text-sm text-gray-500">Total distribué</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{epargne.montants_totaux?.montant_moyen_beneficiaire}€</div>
                  <div className="text-sm text-gray-500">Moyenne/bénéficiaire</div>
                </div>
              </div>
            )}
            
            {epargne.dispositifs && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">Participation</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{epargne.dispositifs.participation?.montant_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.participation?.salaries_couverts_pct}% couverts</div>
                </div>
                <div className={`p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">Intéressement</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{epargne.dispositifs.interessement?.montant_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.interessement?.salaries_couverts_pct}% couverts</div>
                </div>
                <div className={`p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">PEE (abondement)</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{epargne.dispositifs.pee?.abondement_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.pee?.salaries_couverts_pct}% couverts</div>
                </div>
                <div className={`p-3 rounded border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">PERCO/PERCOL</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{epargne.dispositifs.perco_percol?.abondement_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.perco_percol?.salaries_couverts_pct}% couverts</div>
                </div>
              </div>
            )}
          </Card>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
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
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{temps.duree_travail.duree_hebdo_habituelle}h</div>
                  <div className="text-sm text-gray-500">Durée hebdo moyenne</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{temps.duree_travail.duree_legale}h</div>
                  <div className="text-sm text-gray-500">Durée légale</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{temps.duree_travail.duree_annuelle_effective}h</div>
                  <div className="text-sm text-gray-500">Durée annuelle</div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{temps.temps_partiel?.taux_global_pct}%</div>
                  <div className="text-sm text-gray-500">Temps partiel</div>
                </div>
              </div>
            )}
            
            {temps.horaires_atypiques && (
              <div className="mb-4">
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : ''}`}>Horaires atypiques</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className={`p-2 rounded text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="font-bold">{temps.horaires_atypiques.travail_samedi_pct}%</div>
                    <div className="text-xs text-gray-500">Samedi</div>
                  </div>
                  <div className={`p-2 rounded text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="font-bold">{temps.horaires_atypiques.travail_dimanche_pct}%</div>
                    <div className="text-xs text-gray-500">Dimanche</div>
                  </div>
                  <div className={`p-2 rounded text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="font-bold">{temps.horaires_atypiques.travail_soir_pct}%</div>
                    <div className="text-xs text-gray-500">Soir</div>
                  </div>
                  <div className={`p-2 rounded text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
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
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-cyan-900/20 border border-cyan-800' : 'bg-cyan-50 border border-cyan-200'}`}>
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

// ==================== ONGLET PRÉVISIONS ÉCONOMIQUES ====================
function PrevisionsTab({d, darkMode}) {
  const chartProps = useChartProps(darkMode);
  const prev = d.previsions || {};
  const bdf = prev.banque_de_france || {};
  const insee = prev.insee || {};
  
  return (
    <div className="space-y-4">
      {/* KPIs Prévisions 2026 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
          <div className={`text-3xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>+{bdf.pib_croissance?.['2026'] || 1.0}%</div>
          <div className="text-sm text-gray-500">PIB 2026</div>
          <div className="text-xs text-gray-400">Banque de France</div>
        </div>
        <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
          <div className={`text-3xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{bdf.inflation_ipch?.['2026'] || 1.4}%</div>
          <div className="text-sm text-gray-500">Inflation 2026</div>
          <div className="text-xs text-gray-400">IPCH</div>
        </div>
        <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
          <div className={`text-3xl font-bold ${darkMode ? 'text-red-300' : 'text-red-600'}`}>{bdf.taux_chomage?.['2026'] || 7.7}%</div>
          <div className="text-sm text-gray-500">Chômage 2026</div>
          <div className="text-xs text-gray-400">Taux BIT</div>
        </div>
        <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
          <div className={`text-3xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>+{bdf.salaires_nominaux?.['2026'] || 2.5}%</div>
          <div className="text-sm text-gray-500">Salaires 2026</div>
          <div className="text-xs text-gray-400">Nominaux</div>
        </div>
      </div>
      
      {/* Trajectoire pluriannuelle */}
      <Card title="🔮 Trajectoire macroéconomique (Banque de France déc. 2025)" darkMode={darkMode}>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : ''}`}>
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className="text-left p-2">Indicateur</th>
                <th className="text-center p-2">2024</th>
                <th className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/30">2025</th>
                <th className="text-center p-2 bg-green-100 dark:bg-green-900/30">2026</th>
                <th className="text-center p-2">2027</th>
                <th className="text-center p-2">2028</th>
              </tr>
            </thead>
            <tbody>
              <tr className={darkMode ? 'border-gray-700' : 'border-gray-200'}>
                <td className="p-2 font-medium">PIB (%)</td>
                <td className="text-center p-2">{bdf.pib_croissance?.['2024']}</td>
                <td className={`text-center p-2 ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} dark:bg-yellow-900/20`}>{bdf.pib_croissance?.['2025']}</td>
                <td className={`text-center p-2 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} dark:bg-green-900/20 font-bold`}>{bdf.pib_croissance?.['2026']}</td>
                <td className="text-center p-2">{bdf.pib_croissance?.['2027']}</td>
                <td className="text-center p-2">{bdf.pib_croissance?.['2028']}</td>
              </tr>
              <tr className={darkMode ? 'border-gray-700' : 'border-gray-200'}>
                <td className="p-2 font-medium">Inflation IPCH (%)</td>
                <td className="text-center p-2">{bdf.inflation_ipch?.['2024']}</td>
                <td className={`text-center p-2 ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} dark:bg-yellow-900/20`}>{bdf.inflation_ipch?.['2025']}</td>
                <td className={`text-center p-2 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} dark:bg-green-900/20 font-bold`}>{bdf.inflation_ipch?.['2026']}</td>
                <td className="text-center p-2">{bdf.inflation_ipch?.['2027']}</td>
                <td className="text-center p-2">{bdf.inflation_ipch?.['2028']}</td>
              </tr>
              <tr className={darkMode ? 'border-gray-700' : 'border-gray-200'}>
                <td className="p-2 font-medium">Chômage (%)</td>
                <td className="text-center p-2">{bdf.taux_chomage?.['2024']}</td>
                <td className={`text-center p-2 ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} dark:bg-yellow-900/20`}>{bdf.taux_chomage?.['2025']}</td>
                <td className={`text-center p-2 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} dark:bg-green-900/20 font-bold`}>{bdf.taux_chomage?.['2026']}</td>
                <td className="text-center p-2">{bdf.taux_chomage?.['2027']}</td>
                <td className="text-center p-2">{bdf.taux_chomage?.['2028']}</td>
              </tr>
              <tr className={darkMode ? 'border-gray-700' : 'border-gray-200'}>
                <td className="p-2 font-medium">Salaires nominaux (%)</td>
                <td className="text-center p-2">{bdf.salaires_nominaux?.['2024']}</td>
                <td className={`text-center p-2 ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} dark:bg-yellow-900/20`}>{bdf.salaires_nominaux?.['2025']}</td>
                <td className={`text-center p-2 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} dark:bg-green-900/20 font-bold`}>{bdf.salaires_nominaux?.['2026']}</td>
                <td className="text-center p-2">{bdf.salaires_nominaux?.['2027']}</td>
                <td className="text-center p-2">-</td>
              </tr>
              <tr className={darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}>
                <td className="p-2 font-medium">Dette publique (% PIB)</td>
                <td className="text-center p-2">{bdf.dette_publique_pct_pib?.['2024']}</td>
                <td className="text-center p-2">{bdf.dette_publique_pct_pib?.['2025']}</td>
                <td className="text-center p-2 font-bold">{bdf.dette_publique_pct_pib?.['2026']}</td>
                <td className="text-center p-2">{bdf.dette_publique_pct_pib?.['2027']}</td>
                <td className="text-center p-2">{bdf.dette_publique_pct_pib?.['2028']}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Comparaison des instituts */}
      {prev.comparaison_2026 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="📊 Prévisions PIB 2026" darkMode={darkMode}>
            <div className="space-y-2">
              {prev.comparaison_2026.pib?.map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm">{p.source}</span>
                  <span className={`font-bold ${p.valeur >= 1.0 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>
                    +{p.valeur}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
          
          <Card title="📊 Prévisions Inflation 2026" darkMode={darkMode}>
            <div className="space-y-2">
              {prev.comparaison_2026.inflation?.map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm">{p.source}</span>
                  <span className={`font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    {p.valeur}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      
      {/* Aléas */}
      {prev.aleas && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="⬇️ Risques baissiers" darkMode={darkMode}>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              {prev.aleas.baissiers?.map((a, i) => <li key={i}>• {a}</li>)}
            </ul>
          </Card>
          <Card title="⬆️ Facteurs haussiers" darkMode={darkMode}>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              {prev.aleas.haussiers?.map((a, i) => <li key={i}>• {a}</li>)}
            </ul>
          </Card>
        </div>
      )}
      
      {/* Note de lecture */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
        <h4 className={`font-semibold mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>📖 Note de lecture</h4>
        <ul className={`text-sm space-y-1 ${darkMode ? 'text-purple-200' : 'text-purple-800'}`}>
          <li>• Les prévisions de la Banque de France sont publiées chaque trimestre</li>
          <li>• L'INSEE publie ses projections conjoncturelles trimestrielles</li>
          <li>• Ces données reflètent un consensus des économistes à date</li>
        </ul>
        {prev.sources && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">📚 Sources : {prev.sources}</p>}
      </div>
    </div>
  );
}

// ==================== ONGLET TERRITOIRES ====================
function TerritoiresTab({d, darkMode}) {
  const chartProps = useChartProps(darkMode);
  const [sortBy, setSortBy] = useState('chomage');
  const [sortDir, setSortDir] = useState('asc');
  
  const reg = d.donnees_regionales || {};
  const regions = reg.regions || [];
  
  const sortedRegions = [...regions].sort((a, b) => {
    const val = sortDir === 'asc' ? 1 : -1;
    return (a[sortBy] - b[sortBy]) * val;
  });
  
  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };
  
  return (
    <div className="space-y-4">
      {/* KPIs France */}
      {reg.france_metro && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
            <div className={`text-3xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{reg.france_metro.taux_chomage}%</div>
            <div className="text-sm text-gray-500">Chômage France</div>
          </div>
          <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
            <div className={`text-3xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{reg.france_metro.salaire_median_net}€</div>
            <div className="text-sm text-gray-500">Salaire médian</div>
          </div>
          <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
            <div className={`text-3xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{reg.france_metro.tensions_recrutement_pct}%</div>
            <div className="text-sm text-gray-500">Tensions recrutement</div>
          </div>
        </div>
      )}
      
      {/* Tableau des régions */}
      <Card title="🗺️ Données par région métropolitaine" darkMode={darkMode}>
        <div className="mb-2 text-xs text-gray-500">Cliquez sur les en-têtes pour trier</div>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : ''}`}>
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className="text-left p-2">Région</th>
                <th className="text-center p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleSort('chomage')}>
                  Chômage {sortBy === 'chomage' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleSort('salaire_median')}>
                  Salaire médian {sortBy === 'salaire_median' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => handleSort('tensions')}>
                  Tensions {sortBy === 'tensions' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center p-2">Évol. chômage</th>
              </tr>
            </thead>
            <tbody>
              {sortedRegions.map((r, i) => (
                <tr key={i} className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} ${r.chomage > 8 ? (darkMode ? 'bg-red-900/20' : 'bg-red-50') : r.chomage < 6.5 ? (darkMode ? 'bg-green-900/20' : 'bg-green-50') : ''}`}>
                  <td className="p-2 font-medium">{r.nom}</td>
                  <td className={`text-center p-2 font-bold ${r.chomage > 8 ? (darkMode ? 'text-red-400' : 'text-red-600') : r.chomage < 6.5 ? (darkMode ? 'text-green-400' : 'text-green-600') : ''}`}>
                    {r.chomage}%
                  </td>
                  <td className={`text-center p-2 ${r.salaire_median > 2200 ? (darkMode ? 'text-green-400' : 'text-green-600') : r.salaire_median < 2020 ? (darkMode ? 'text-orange-400' : 'text-orange-600') : ''}`}>
                    {r.salaire_median}€
                  </td>
                  <td className={`text-center p-2 ${r.tensions > 62 ? (darkMode ? 'text-orange-400' : 'text-orange-600') : ''}`}>
                    {r.tensions}%
                  </td>
                  <td className="text-center p-2">
                    <span className={r.evolution_chomage > 0 ? 'text-red-500' : r.evolution_chomage < 0 ? 'text-green-500' : 'text-gray-400'}>
                      {r.evolution_chomage > 0 ? '+' : ''}{r.evolution_chomage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Classements */}
      {reg.classement_chomage && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card title="✅ Chômage le plus bas" darkMode={darkMode}>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              {reg.classement_chomage.plus_bas?.map((r, i) => <li key={i}>{i+1}. {r}</li>)}
            </ul>
          </Card>
          <Card title="💰 Salaires les plus hauts" darkMode={darkMode}>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              {reg.classement_salaires?.plus_haut?.map((r, i) => <li key={i}>{i+1}. {r}</li>)}
            </ul>
          </Card>
          <Card title="🔥 Tensions les plus fortes" darkMode={darkMode}>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
              {reg.classement_tensions?.plus_tendues?.map((r, i) => <li key={i}>{i+1}. {r}</li>)}
            </ul>
          </Card>
        </div>
      )}
      
      {/* DOM */}
      {reg.dom && reg.dom.length > 0 && (
        <Card title="🌴 Départements et Régions d'Outre-Mer" darkMode={darkMode}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {reg.dom.map((r, i) => (
              <div key={i} className={`p-3 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className="font-semibold text-sm">{r.nom}</div>
                <div className={`text-xl font-bold ${r.chomage > 15 ? (darkMode ? 'text-red-400' : 'text-red-600') : ''}`}>{r.chomage}%</div>
                <div className="text-xs text-gray-500">Tensions: {r.tensions}%</div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      <div className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        📚 Sources : INSEE (chômage T2 2025), INSEE (salaires 2023), DARES-BMO (tensions 2025)
      </div>
      
      {d.donnees_regionales?.sources && (
        <p className="text-xs text-gray-400 text-center mt-2">📚 Sources : {d.donnees_regionales.sources}</p>
      )}
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
    { terme: "Zone euro", definition: "20 pays de l'UE ayant adopté l'euro comme monnaie. Politique monétaire commune (BCE).", categorie: "Europe", importance: "basse" }
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
      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-purple-600 to-indigo-600'} text-white`}>
        <h2 className="text-lg font-bold">📖 Aide & Glossaire</h2>
        <p className="text-sm opacity-80">Plus de 120 termes expliqués pour maîtriser les NAO et l'économie</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 flex-wrap">
        {[['glossaire', '📚 Glossaire'], ['indicateurs', '📊 Indicateurs'], ['sources', '🔗 Sources'], ['methodologie', '🔬 Méthodologie']].map(([id, label]) => (
          <button 
            key={id} 
            onClick={() => setOpenSection(id)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${openSection === id ? 'bg-purple-600 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GLOSSAIRE */}
      {openSection === 'glossaire' && (
        <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
          {/* Filtres */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="🔍 Rechercher un terme..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className={`flex-1 min-w-[200px] px-3 py-2 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
            />
            <select
              value={filtreCategorie}
              onChange={(e) => setFiltreCategorie(e.target.value)}
              className={`px-3 py-2 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="all">📁 Toutes catégories ({glossaire.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat} ({glossaire.filter(g => g.categorie === cat).length})</option>
              ))}
            </select>
            <select
              value={filtreImportance}
              onChange={(e) => setFiltreImportance(e.target.value)}
              className={`px-3 py-2 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="all">⭐ Toute importance</option>
              <option value="haute">⭐ Essentiels uniquement</option>
              <option value="moyenne">📌 Importants</option>
              <option value="basse">📎 Utiles</option>
            </select>
          </div>

          {/* Stats rapides */}
          <div className={`flex gap-4 mb-4 p-2 rounded text-xs ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
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
                      className={`p-3 rounded-lg border transition-all hover:scale-[1.01] ${importanceColors[item.importance]}`}
                    >
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <span className={`font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                          {item.terme}
                        </span>
                        <div className="flex gap-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded text-white ${importanceBadge[item.importance].bg}`}>
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
        <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
          <h3 className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📊 Comment lire les indicateurs</h3>
          
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} border`}>
            <h4 className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-800'}`}>🟢 Indicateurs positifs</h4>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              <li>• <b>PIB en hausse</b> → Croissance économique, plus de richesses à partager</li>
              <li>• <b>Salaires {">"} Inflation</b> → Gain de pouvoir d'achat</li>
              <li>• <b>Chômage en baisse</b> → Marché du travail favorable aux salariés</li>
            </ul>
          </div>

          <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border`}>
            <h4 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-800'}`}>🔴 Indicateurs d'alerte</h4>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              <li>• <b>Inflation {">"} Salaires</b> → Perte de pouvoir d'achat</li>
              <li>• <b>Défaillances en hausse</b> → Difficultés économiques des entreprises</li>
              <li>• <b>Taux de marge élevé</b> → Les profits augmentent plus que les salaires</li>
            </ul>
          </div>

          <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
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
        <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
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
                className={`p-3 rounded-lg border transition-colors ${darkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full bg-${source.color}-500`}></span>
                  <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{source.nom}</span>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{source.desc}</p>
              </a>
            ))}
          </div>

          <div className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border`}>
            <p className={`text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
              ⚠️ <b>Note</b> : Les données sont mises à jour automatiquement via des API publiques. 
              Certaines données (conventions collectives) sont vérifiées manuellement.
            </p>
          </div>
        </div>
      )}

      {/* METHODOLOGIE */}
      {openSection === 'methodologie' && (
        <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
          <h3 className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🔬 Méthodologie</h3>
          
          <div className={`space-y-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📈 Pouvoir d'achat cumulé</h4>
              <p className="mt-1">Calculé comme l'écart cumulé entre l'évolution des salaires et l'inflation depuis 2019. Un chiffre négatif indique une perte de pouvoir d'achat.</p>
            </div>

            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🧮 Simulateur NAO</h4>
              <p className="mt-1">Les calculs du RGDU 2026 sont basés sur le décret n°2025-1446. Le taux de réduction suit la formule officielle avec P=1.75 et un plancher de 2%.</p>
            </div>

            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📋 Conformité SMIC</h4>
              <p className="mt-1">Une branche est "non conforme" si au moins un niveau de sa grille de classification est inférieur au SMIC en vigueur.</p>
            </div>

            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>💰 Coût employeur (Superbrut)</h4>
              <p className="mt-1">Inclut : maladie (13%), vieillesse (10.57%), allocations familiales (5.25%), chômage (4.25%), retraite complémentaire (~6%), FNAL, formation, AT/MP (~2%). Total ~43% avant réductions.</p>
            </div>

            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
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
