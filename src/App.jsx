import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, Cell, ReferenceLine } from 'recharts';


const C = { primary: '#1e40af', secondary: '#dc2626', tertiary: '#059669', quaternary: '#d97706', pink: '#db2777', purple: '#7c3aed', cyan: '#0891b2', gray: '#6b7280' };

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
          <Kpi label="PIB T3" value={`+${d.indicateurs_cles.croissance_pib}%`} color="green" darkMode={darkMode} tooltip="Croissance trimestrielle du Produit Intérieur Brut. Mesure la création de richesse du pays." />
          <Kpi label="Climat affaires" value={d.indicateurs_cles.climat_affaires} color="blue" darkMode={darkMode} tooltip="Indicateur INSEE de confiance des chefs d'entreprise. 100 = moyenne long terme." />
          <Kpi label="Chômage" value={`${d.indicateurs_cles.taux_chomage_actuel}%`} color="red" darkMode={darkMode} tooltip="Taux de chômage BIT (Bureau International du Travail). Part des actifs sans emploi cherchant un travail." />
          <Kpi label="Inflation" value={`${d.indicateurs_cles.inflation_annuelle}%`} color="green" darkMode={darkMode} tooltip="Glissement annuel de l'IPC (Indice des Prix à la Consommation). Mesure la hausse des prix." />
          <Kpi label="SMIC net" value={`${d.indicateurs_cles.smic_net}€`} color="blue" darkMode={darkMode} tooltip="Salaire Minimum Interprofessionnel de Croissance. Rémunération horaire minimum légale." />
          <Kpi label="Défaillances" value={`${(d.indicateurs_cles.defaillances_12m/1000).toFixed(1)}k`} color="orange" darkMode={darkMode} tooltip="Nombre d'entreprises en procédure collective sur 12 mois. Indicateur de santé économique." />
        </div>

        <div className={`flex flex-wrap gap-2 mb-4 border-b pb-3 overflow-x-auto ${darkMode ? 'border-gray-700' : ''}`}>
          {[['conjoncture','📈 Conjoncture'],['evolutions','📉 Évolutions'],['pouvoir_achat','💰 Pouvoir d\'achat'],['salaires','💵 Salaires'],['emploi','👥 Emploi'],['travail','⚙️ Travail'],['conditions_vie','🏠 Conditions vie'],['inflation','📊 Inflation'],['conventions','📋 Conventions'],['comparaison_ue','🇪🇺 Europe'],['simulateur','🧮 Simulateur NAO'],['aide','📖 Aide']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${tab === id ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>{label}</button>
          ))}
        </div>

        {tab === 'conjoncture' && <ConjonctureTab d={d} subTab={subTabConj} setSubTab={setSubTabConj} darkMode={darkMode} />}
        {tab === 'evolutions' && <EvolutionsTab d={d} darkMode={darkMode} />}
        {tab === 'comparaison_ue' && <ComparaisonUETab d={d} darkMode={darkMode} />}
        {tab === 'simulateur' && <SimulateurNAOTab d={d} darkMode={darkMode} />}
        {tab === 'pouvoir_achat' && <PouvoirAchatTab d={d} darkMode={darkMode} />}
        {tab === 'salaires' && <SalairesTab d={d} darkMode={darkMode} />}
        {tab === 'emploi' && <EmploiTab d={d} subTab={subTab} setSubTab={setSubTab} darkMode={darkMode} />}
        {tab === 'travail' && <TravailTab d={d} darkMode={darkMode} />}
        {tab === 'conditions_vie' && <ConditionsVieTab d={d} subTab={subTabVie} setSubTab={setSubTabVie} darkMode={darkMode} />}
        {tab === 'inflation' && <InflationTab d={d} darkMode={darkMode} />}
        {tab === 'conventions' && <ConventionsTab d={d} darkMode={darkMode} />}
        {tab === 'aide' && <AideTab darkMode={darkMode} />}
      </div>
    </div>
  );
}

function Kpi({label, value, color, darkMode, tooltip}) {
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
      <p className="text-lg font-bold">{value}</p>
      {showTooltip && tooltip && (
        <div className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded shadow-lg text-xs w-48 ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-800 text-white'}`}>
          {tooltip}
          <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${darkMode ? 'border-t-gray-700' : 'border-t-gray-800'}`}></div>
        </div>
      )}
    </div>
  );
}

function Card({title, children, darkMode}) {
  return <div className={`rounded-xl shadow p-4 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}><h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{title}</h3>{children}</div>;
}

// NOUVEL ONGLET CONJONCTURE
function ConjonctureTab({d, subTab, setSubTab, darkMode}) {
  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-1 p-2 rounded shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {[['pib','Croissance PIB'],['partage_va','⚖️ Partage VA'],['climat','Climat affaires'],['defaillances','Défaillances'],['investissement','Investissement']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-2 py-1 rounded text-xs font-medium ${subTab===id?'bg-indigo-600 text-white': darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'pib' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📈 Croissance trimestrielle du PIB (%)">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={d.pib.evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="trimestre" fontSize={8} />
              <YAxis domain={[-0.5, 1]} fontSize={11} />
              <Tooltip formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke={C.gray} />
              <Bar dataKey="croissance" name="Croissance T/T-1">
                {d.pib.evolution.map((e, i) => <Cell key={i} fill={e.croissance >= 0 ? C.tertiary : C.secondary} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Situation actuelle">
          <div className="space-y-3 p-2">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span>Croissance T3 2025</span>
              <span className="text-2xl font-bold text-green-600">+{d.pib.croissance_trim_actuel}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span>Croissance annuelle 2024</span>
              <span className="text-xl font-bold text-blue-600">+{d.pib.croissance_annuelle}%</span>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-semibold text-sm mb-2">Contributions T3 2025 :</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span>Demande intérieure</span><span className="text-green-600">+{d.pib.contributions.demande_interieure} pt</span></div>
                <div className="flex justify-between"><span>Commerce extérieur</span><span className="text-green-600">+{d.pib.contributions.commerce_exterieur} pt</span></div>
                <div className="flex justify-between"><span>Stocks</span><span className="text-red-600">{d.pib.contributions.stocks} pt</span></div>
              </div>
            </div>
          </div>
        </Card>
        <Card title="📈 Croissance annuelle">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.pib.annuel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="annee" fontSize={11} />
              <YAxis domain={[-10, 8]} fontSize={11} />
              <Tooltip formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke={C.gray} />
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
          <Card title="⚖️ Partage de la VA des SNF (%)">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={d.partage_va.evolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="annee" fontSize={10} />
                <YAxis domain={[20, 70]} fontSize={11} />
                <Tooltip formatter={v => `${v}%`} />
                <Legend wrapperStyle={{fontSize:10}} />
                <Area dataKey="salaires" name="Part salaires" fill={C.primary} fillOpacity={0.3} stroke={C.primary} strokeWidth={2} />
                <Line dataKey="ebe" name="Part profits (EBE)" stroke={C.secondary} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="📊 Répartition actuelle (2024)">
            <div className="space-y-3 p-2">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="font-medium">Rémunération salariés</span>
                <span className="text-2xl font-bold text-blue-600">{d.partage_va.part_salaires_snf}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
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
          <Card title="📉 Taux de marge des SNF">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.partage_va.taux_marge_snf}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="annee" fontSize={11} />
                <YAxis domain={[28, 35]} fontSize={11} />
                <Tooltip formatter={v => `${v}%`} />
                <Bar dataKey="taux" name="Taux de marge">
                  {d.partage_va.taux_marge_snf.map((e, i) => <Cell key={i} fill={e.taux > 32 ? C.secondary : C.quaternary} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="🏭 Par secteur (% VA)">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.partage_va.par_secteur} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 70]} fontSize={10} />
                <YAxis dataKey="secteur" type="category" width={90} fontSize={9} />
                <Tooltip formatter={v => `${v}%`} />
                <Legend wrapperStyle={{fontSize:9}} />
                <Bar dataKey="salaires" name="Salaires" fill={C.primary} />
                <Bar dataKey="ebe" name="Profits" fill={C.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <h3 className="font-semibold text-red-800">💡 Arguments pour les NAO</h3>
          <ul className="mt-2 text-sm text-red-700 space-y-1">
            <li>• La part des salaires a baissé de <b>10 points</b> depuis 1980 (de 68% à 58%)</li>
            <li>• Le taux de marge des entreprises reste élevé : <b>32.5%</b> en 2024</li>
            <li>• Il y a des marges de manœuvre pour augmenter les salaires !</li>
          </ul>
        </div>
      </div>}

      {subTab === 'climat' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="🌡️ Climat des affaires et confiance des ménages">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.climat_affaires.evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" fontSize={9} />
              <YAxis domain={[85, 105]} fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{fontSize:10}} />
              <ReferenceLine y={100} stroke={C.gray} strokeDasharray="5 5" label={{value:"Moyenne", fontSize:9}} />
              <Line dataKey="climat" name="Climat affaires" stroke={C.primary} strokeWidth={2} />
              <Line dataKey="menages" name="Confiance ménages" stroke={C.quaternary} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Par secteur (Nov 2025)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.climat_affaires.par_secteur} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[90, 105]} fontSize={11} />
              <YAxis dataKey="secteur" type="category" width={80} fontSize={10} />
              <Tooltip />
              <ReferenceLine x={100} stroke={C.gray} strokeDasharray="5 5" />
              <Bar dataKey="climat" fill={C.primary}>
                {d.climat_affaires.par_secteur.map((e, i) => <Cell key={i} fill={e.climat >= 100 ? C.tertiary : C.quaternary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="text-center p-2 bg-blue-50 rounded">
              <p className="text-xs">Climat affaires</p>
              <p className="text-xl font-bold text-blue-600">{d.climat_affaires.valeur_actuelle}</p>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded">
              <p className="text-xs">Confiance ménages</p>
              <p className="text-xl font-bold text-orange-600">{d.climat_affaires.confiance_menages}</p>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">Moyenne long terme = 100</p>
        </Card>
      </div>}

      {subTab === 'defaillances' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="⚠️ Défaillances d'entreprises (cumul 12 mois)">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={d.defaillances.evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" fontSize={9} />
              <YAxis domain={[40000, 70000]} fontSize={10} tickFormatter={v => `${v/1000}k`} />
              <Tooltip formatter={v => v.toLocaleString()} />
              <ReferenceLine y={d.defaillances.moyenne_2010_2019} stroke={C.quaternary} strokeDasharray="5 5" label={{value:"Moy. 2010-19", fontSize:8, fill:C.quaternary}} />
              <Area dataKey="cumul" fill={C.secondary} fillOpacity={0.2} stroke="none" />
              <Line dataKey="cumul" stroke={C.secondary} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Situation actuelle">
          <div className="space-y-3 p-2">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded">
              <span>Cumul 12 mois</span>
              <span className="text-2xl font-bold text-red-600">{d.defaillances.cumul_12_mois.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
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
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
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
        <Card title="📉 Investissement des entreprises (FBCF)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.investissement.evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="trimestre" fontSize={8} />
              <YAxis domain={[-1, 1.5]} fontSize={11} />
              <Tooltip formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke={C.gray} />
              <Bar dataKey="variation" name="Variation T/T-1">
                {d.investissement.evolution.map((e, i) => <Cell key={i} fill={e.variation >= 0 ? C.tertiary : C.secondary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Par type d'investissement">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.investissement.par_type} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[-5, 6]} fontSize={11} />
              <YAxis dataKey="type" type="category" width={100} fontSize={9} />
              <Tooltip formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine x={0} stroke={C.gray} />
              <Bar dataKey="variation_an" name="Évolution annuelle">
                {d.investissement.par_type.map((e, i) => <Cell key={i} fill={e.variation_an >= 0 ? C.tertiary : C.secondary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="text-center p-2 bg-blue-50 rounded">
              <p className="text-xs">Taux invest.</p>
              <p className="text-xl font-bold text-blue-600">{d.investissement.taux_investissement}%</p>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded">
              <p className="text-xs">Évolution an.</p>
              <p className="text-xl font-bold text-orange-600">{d.investissement.fbcf_variation_an}%</p>
            </div>
          </div>
        </Card>
        <div className="md:col-span-2">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <h3 className="font-semibold text-yellow-800">💡 Points clés investissement</h3>
            <ul className="mt-2 text-sm text-yellow-700 space-y-1">
              <li>• Rebond de l'investissement au T3 2025 (+0.4%) après plusieurs trimestres de baisse</li>
              <li>• Construction toujours en recul (-2.5% sur l'année)</li>
              <li>• Investissement numérique (info-comm) reste dynamique (+5%)</li>
            </ul>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ONGLET COMPARAISON UE
function ComparaisonUETab({d, darkMode}) {
  const [subTab, setSubTab] = useState('smic');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 bg-white p-2 rounded shadow-sm">
        {[['smic','💰 SMIC'],['chomage','👥 Chômage'],['partage_va','⚖️ Part salaires VA']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-2 py-1 rounded text-xs font-medium ${subTab===id?'bg-blue-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'smic' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="💰 Salaire minimum brut mensuel (€)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.comparaison_ue.smic_europe} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 3000]} fontSize={10} />
              <YAxis dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip formatter={v => `${v.toLocaleString()}€`} />
              <Bar dataKey="smic" name="SMIC brut">
                {d.comparaison_ue.smic_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.primary : C.gray} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 En pouvoir d'achat (SPA)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.comparaison_ue.smic_europe} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 2200]} fontSize={10} />
              <YAxis dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip formatter={v => `${v.toLocaleString()} SPA`} />
              <Bar dataKey="spa" name="Pouvoir d'achat réel">
                {d.comparaison_ue.smic_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.tertiary : C.cyan} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <div className="md:col-span-2 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <h3 className="font-semibold text-blue-800">💡 À retenir</h3>
          <ul className="mt-2 text-sm text-blue-700 space-y-1">
            <li>• France <b>6ᵉ rang UE</b> en SMIC brut (1 802€)</li>
            <li>• SMIC français <b>20% inférieur</b> au SMIC allemand</li>
            <li>• En pouvoir d'achat réel, l'Allemagne dépasse le Luxembourg</li>
          </ul>
        </div>
      </div>}

      {subTab === 'chomage' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="👥 Taux de chômage (%)">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.chomage_europe} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 12]} fontSize={10} />
              <YAxis dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="taux" name="Chômage total">
                {d.comparaison_ue.chomage_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.secondary : (e.taux > 7 ? C.quaternary : C.tertiary)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="👶 Chômage des jeunes (%)">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.chomage_europe} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 28]} fontSize={10} />
              <YAxis dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="jeunes" name="-25 ans">
                {d.comparaison_ue.chomage_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.secondary : (e.jeunes > 15 ? C.quaternary : C.tertiary)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {subTab === 'partage_va' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="⚖️ Part des salaires dans la VA (%)">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.part_salaires_va_ue} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[50, 65]} fontSize={10} />
              <YAxis dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip formatter={v => `${v}%`} />
              <ReferenceLine x={56.8} stroke={C.gray} strokeDasharray="5 5" />
              <Bar dataKey="part" name="Part salaires">
                {d.comparaison_ue.part_salaires_va_ue.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.primary : (e.part > 56.8 ? C.tertiary : C.secondary)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Analyse">
          <div className="space-y-3 p-2">
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm">France</p>
              <p className="text-2xl font-bold text-blue-600">57.8%</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-sm">Allemagne</p>
              <p className="text-2xl font-bold text-green-600">61.2%</p>
              <p className="text-xs text-gray-600">+3.4 pts vs France</p>
            </div>
            <div className="p-3 bg-red-50 rounded text-sm">
              <p className="font-medium text-red-800">💡 Argument clé</p>
              <p className="text-red-700">En Allemagne, les salariés captent <b>3.4 points de plus</b> de la richesse créée !</p>
            </div>
          </div>
        </Card>
      </div>}
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
        <Card title="👤 Salarié">
          <div className="space-y-2">
            <select value={statut} onChange={e => setStatut(e.target.value)} className="w-full border rounded p-1.5 text-sm">
              <option value="non_cadre">🏢 Non-cadre (23%)</option>
              <option value="cadre">👔 Cadre (25%)</option>
              <option value="fonctionnaire">🏛️ Fonctionnaire (17%)</option>
            </select>
            <div>
              <input type="range" min="1200" max="6000" step="50" value={salaireBrut} onChange={e => setSalaireBrut(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-sm"><span className="font-bold text-blue-600">{salaireBrut}€</span><span className="text-gray-500">{(salaireBrut / SMIC).toFixed(2)} SMIC</span></div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <select value={situation} onChange={e => setSituation(e.target.value)} className="border rounded p-1 text-xs"><option value="seul">Seul</option><option value="couple">Couple</option></select>
              <select value={enfants} onChange={e => setEnfants(Number(e.target.value))} className="border rounded p-1 text-xs"><option value={0}>0 enf.</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3+</option></select>
            </div>
          </div>
        </Card>

        <Card title="🏭 Entreprise">
          <div className="space-y-2">
            <select value={effectif} onChange={e => setEffectif(e.target.value)} className="w-full border rounded p-1.5 text-sm">
              <option value="moins50">&lt; 50 sal.</option><option value="plus50">≥ 50 sal.</option>
            </select>
            <div className="p-2 bg-gray-50 rounded text-xs space-y-1">
              {regime === '2026' ? (<><div className="flex justify-between"><span>Tmin</span><span>{T_MIN}</span></div><div className="flex justify-between"><span>Tdelta</span><span>{T_DELTA}</span></div><div className="flex justify-between"><span>Max</span><span className="font-bold">{COEF_MAX}</span></div></>) : (<div className="flex justify-between"><span>Param T</span><span className="font-bold">{T_2025}</span></div>)}
            </div>
          </div>
        </Card>

        <Card title="📈 Négociation">
          <div className="space-y-2">
            <div><input type="range" min="0" max="10" step="0.5" value={augmentation} onChange={e => setAugmentation(Number(e.target.value))} className="w-full" /><div className="text-center font-bold text-green-600 text-xl">+{augmentation}%</div></div>
            <div><input type="range" min="0" max="8" step="0.1" value={inflation} onChange={e => setInflation(Number(e.target.value))} className="w-full" /><div className="text-center text-orange-600 text-sm">Inflation: {inflation}%</div></div>
          </div>
        </Card>

        <Card title="⚡ Réel">
          <div className={`h-full flex flex-col justify-center items-center p-2 rounded ${pouvoirAchatPreserve ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-3xl font-bold ${augReelle >= 0 ? 'text-green-600' : 'text-red-600'}`}>{augReelle >= 0 ? '+' : ''}{augReelle.toFixed(1)}%</p>
            <p className="text-xs">{pouvoirAchatPreserve ? '✅ OK' : '❌ Perte'}</p>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card title="💰 Salaire">
          <table className="w-full text-sm"><tbody>
            <tr><td>Brut</td><td className="text-right">{salaireBrut}€</td><td className="text-right text-green-600">{Math.round(nouveauBrut)}€</td><td className="text-right text-green-600">+{Math.round(nouveauBrut - salaireBrut)}€</td></tr>
            <tr><td>Net</td><td className="text-right">{Math.round(salaireNet)}€</td><td className="text-right text-green-600">{Math.round(nouveauNet)}€</td><td className="text-right text-green-600">+{Math.round(gainNetMensuel)}€</td></tr>
          </tbody></table>
          <div className="p-2 bg-blue-50 rounded text-center mt-2"><span className="text-xs">Gain annuel</span><p className="text-lg font-bold text-blue-600">+{Math.round(gainNetAnnuel).toLocaleString()}€</p></div>
        </Card>

        <Card title="🏛️ Prime activité">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-purple-50 rounded text-center"><p className="text-xs">Avant</p><p className="font-bold text-purple-600">{primeAct}€</p></div>
            <div className="p-2 bg-purple-50 rounded text-center"><p className="text-xs">Après</p><p className="font-bold text-purple-600">{primeNouv}€</p></div>
          </div>
          {pertePrime > 0 && <div className="p-2 bg-red-50 rounded text-center mt-2 text-red-700 text-sm">⚠️ Perte: -{pertePrime}€/mois</div>}
        </Card>

        <Card title="✅ Bilan salarié">
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
            {regime === '2026' && <div className="text-xs p-2 bg-blue-50 rounded my-2 font-mono">C = {T_MIN} + ({T_DELTA} × [(½)(3×SMIC/rém - 1)]^{P})</div>}
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
                    <div><p className="font-medium">Maladie (7% vs 13%)</p><p className="text-gray-500">≤ 2.25 SMIC</p></div>
                    <span className={`px-2 py-1 rounded ${txRedAct?.okMal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{txRedAct?.okMal ? `✅ -${txRedAct.mal}€` : '❌'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div><p className="font-medium">Famille (3.45% vs 5.25%)</p><p className="text-gray-500">≤ 3.3 SMIC</p></div>
                    <span className={`px-2 py-1 rounded ${txRedAct?.okFam ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{txRedAct?.okFam ? `✅ -${txRedAct.fam}€` : '❌'}</span>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">⚠️ Supprimés au 01/01/2026</div>
              </>
            ) : (
              <>
                <h4 className="font-semibold text-sm mb-2">🆕 Nouveautés RGDU 2026</h4>
                <div className="text-xs space-y-2">
                  <div className="p-2 bg-green-50 rounded"><p className="font-medium text-green-700">✅ Seuil étendu à 3 SMIC</p><p className="text-gray-600">Plus de salariés éligibles</p></div>
                  <div className="p-2 bg-green-50 rounded"><p className="font-medium text-green-700">✅ Minimum garanti 2%</p><p className="text-gray-600">Toujours au moins 2% si &lt; 3 SMIC</p></div>
                  <div className="p-2 bg-blue-50 rounded"><p className="font-medium text-blue-700">📐 Dégressivité lissée (P=1.75)</p><p className="text-gray-600">Moins de trappe à bas salaires</p></div>
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
              <tr className="border-t bg-orange-50 font-bold"><td className="py-2">SUPERBRUT (coût total)</td><td className="text-right">{coutAct.total.toLocaleString()}€</td><td className="text-right">{coutNouv.total.toLocaleString()}€</td><td className="text-right text-orange-600">+{surcout}€/m</td></tr>
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
        <div className="p-3 bg-red-50 rounded"><p className="font-semibold text-red-800 text-sm">📈 Inflation cumulée</p><p className="text-2xl font-bold text-red-600">+12%</p><p className="text-xs text-red-700">2022-2024</p></div>
        <div className="p-3 bg-blue-50 rounded"><p className="font-semibold text-blue-800 text-sm">⚖️ Partage VA</p><p className="text-2xl font-bold text-blue-600">32.5%</p><p className="text-xs text-blue-700">taux de marge</p></div>
        <div className="p-3 bg-green-50 rounded"><p className="font-semibold text-green-800 text-sm">🇪🇺 vs Allemagne</p><p className="text-2xl font-bold text-green-600">-20%</p><p className="text-xs text-green-700">SMIC français</p></div>
        <div className="p-3 bg-purple-50 rounded"><p className="font-semibold text-purple-800 text-sm">💰 Cette demande</p><p className="text-2xl font-bold text-purple-600">+{Math.round(gainReel)}€</p><p className="text-xs text-purple-700">net réel/mois</p></div>
      </div>

      <p className="text-xs text-gray-400 text-center">⚠️ Simulation indicative - {regime === '2026' ? 'RGDU décret n°2025-1446' : 'RGCP 2025'}. Prime activité: caf.fr</p>
    </div>
  );
}

function PouvoirAchatTab({d, darkMode}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="📊 Inflation vs Salaires (%)">
        <ResponsiveContainer width="100%" height={220}><BarChart data={d.inflation_salaires}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="annee" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:10}} /><Bar dataKey="inflation" name="Inflation" fill={C.secondary} /><Bar dataKey="smic" name="SMIC" fill={C.primary} /><Bar dataKey="salaires_base" name="Salaires" fill={C.tertiary} /></BarChart></ResponsiveContainer>
      </Card>
      <Card title="📈 Évolution cumulée (base 100)">
        <ResponsiveContainer width="100%" height={220}><LineChart data={d.pouvoir_achat_cumule}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="periode" fontSize={9} /><YAxis domain={[98,120]} fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:10}} /><Line dataKey="prix" name="Prix" stroke={C.secondary} strokeWidth={2} /><Line dataKey="smic" name="SMIC" stroke={C.primary} strokeWidth={2} /><Line dataKey="salaires" name="Salaires" stroke={C.tertiary} strokeWidth={2} /></LineChart></ResponsiveContainer>
      </Card>
      <Card title="📋 Part salariés au SMIC">
        <ResponsiveContainer width="100%" height={180}><BarChart data={d.smic.part_salaries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="annee" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={v=>`${v}%`} /><Bar dataKey="part" fill={C.quaternary}>{d.smic.part_salaries.map((e,i)=><Cell key={i} fill={e.part>15?C.secondary:C.quaternary}/>)}</Bar></BarChart></ResponsiveContainer>
      </Card>
    </div>
  );
}

function SalairesTab({d, darkMode}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="💰 Salaire médian net">
        <ResponsiveContainer width="100%" height={200}><BarChart data={d.salaire_median.evolution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="annee" fontSize={11} /><YAxis domain={[1800,2300]} fontSize={11} /><Tooltip formatter={v=>`${v}€`} /><Bar dataKey="montant" fill={C.primary} /></BarChart></ResponsiveContainer>
        <p className="text-center text-xl font-bold text-green-600 mt-2">{d.salaire_median.montant_2024}€</p>
      </Card>
      <Card title="👫 Écart H/F (EQTP)">
        <ResponsiveContainer width="100%" height={200}><LineChart data={d.ecart_hommes_femmes.evolution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="annee" fontSize={11} /><YAxis domain={[10,20]} fontSize={11} /><Tooltip formatter={v=>`${v}%`} /><Line dataKey="ecart" stroke={C.pink} strokeWidth={3} /></LineChart></ResponsiveContainer>
        <div className="flex justify-around text-xs mt-2"><div className="text-center"><span className="text-gray-500">Global</span><br/><b>{d.ecart_hommes_femmes.ecart_global}%</b></div><div className="text-center"><span className="text-gray-500">EQTP</span><br/><b className="text-pink-600">{d.ecart_hommes_femmes.ecart_eqtp}%</b></div><div className="text-center"><span className="text-gray-500">Poste égal</span><br/><b className="text-green-600">{d.ecart_hommes_femmes.ecart_poste_comparable}%</b></div></div>
      </Card>
      <Card title="🏭 Salaires par secteur">
        <ResponsiveContainer width="100%" height={200}><BarChart data={d.salaires_secteur} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={11} /><YAxis dataKey="secteur" type="category" width={70} fontSize={10} /><Tooltip formatter={v=>`${v}€`} /><Bar dataKey="salaire" fill={C.primary} /></BarChart></ResponsiveContainer>
      </Card>
      <Card title="🎁 PPV">
        <div className="grid grid-cols-2 gap-2 p-2">
          <div className="text-center p-3 bg-blue-50 rounded"><p className="text-xs">Bénéf. 2023</p><p className="text-xl font-bold text-blue-600">{d.ppv.beneficiaires_2023}%</p></div>
          <div className="text-center p-3 bg-orange-50 rounded"><p className="text-xs">Bénéf. 2024</p><p className="text-xl font-bold text-orange-600">{d.ppv.beneficiaires_2024}%</p></div>
          <div className="text-center p-3 bg-green-50 rounded"><p className="text-xs">Montant moy.</p><p className="text-xl font-bold text-green-600">{d.ppv.montant_moyen}€</p></div>
          <div className="text-center p-3 bg-gray-50 rounded"><p className="text-xs">Total 2024</p><p className="text-xl font-bold">{d.ppv.montant_total_2024}Md€</p></div>
        </div>
      </Card>
    </div>
  );
}

function EmploiTab({d, subTab, setSubTab, darkMode}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 bg-white p-2 rounded shadow-sm">
        {[['chomage','Chômage'],['seniors','Seniors'],['contrats','Contrats'],['secteurs','Secteurs'],['recrutement','Recrutement'],['dynamique','Dynamique']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-2 py-1 rounded text-xs font-medium ${subTab===id?'bg-purple-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'chomage' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📉 Taux de chômage (%)">
          <ResponsiveContainer width="100%" height={220}><LineChart data={d.chomage}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="trimestre" fontSize={9} /><YAxis domain={[0,22]} fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:10}} /><Line dataKey="taux" name="Ensemble" stroke={C.primary} strokeWidth={3} /><Line dataKey="jeunes" name="15-24 ans" stroke={C.secondary} strokeWidth={2} strokeDasharray="5 5" /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="📊 Dernières données">
          <div className="grid grid-cols-2 gap-4 p-4">
            <div className="text-center p-4 bg-blue-50 rounded"><p className="text-sm text-gray-600">Global</p><p className="text-3xl font-bold text-blue-600">{d.indicateurs_cles.taux_chomage_actuel}%</p></div>
            <div className="text-center p-4 bg-red-50 rounded"><p className="text-sm text-gray-600">Jeunes</p><p className="text-3xl font-bold text-red-600">{d.indicateurs_cles.taux_chomage_jeunes}%</p></div>
          </div>
        </Card>
      </div>}

      {subTab === 'seniors' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="👴 Taux d'emploi 55-64 ans">
          <ResponsiveContainer width="100%" height={220}><ComposedChart data={d.emploi_seniors}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="trimestre" fontSize={9} /><YAxis domain={[55,65]} fontSize={11} /><Tooltip formatter={v=>`${v}%`} /><Area dataKey="taux" fill={C.tertiary} fillOpacity={0.2} stroke="none" /><Line dataKey="taux" stroke={C.tertiary} strokeWidth={3} /></ComposedChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Contexte"><div className="p-4"><div className="flex justify-between items-center p-3 bg-green-50 rounded mb-3"><span>Taux actuel</span><span className="text-2xl font-bold text-green-600">{d.indicateurs_cles.taux_emploi_seniors}%</span></div></div></Card>
      </div>}

      {subTab === 'contrats' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📋 Répartition contrats">
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.types_contrats}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="trimestre" fontSize={8} /><YAxis fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:9}} /><Bar dataKey="cdi" name="CDI" stackId="a" fill={C.primary} /><Bar dataKey="cdd" name="CDD" stackId="a" fill={C.quaternary} /><Bar dataKey="interim" name="Intérim" stackId="a" fill={C.secondary} /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="📊 T3 2025"><div className="p-4 space-y-2">{(()=>{const l=d.types_contrats[d.types_contrats.length-1];return<><div className="flex justify-between p-2 bg-blue-50 rounded"><span>CDI</span><b className="text-blue-600">{l.cdi}%</b></div><div className="flex justify-between p-2 bg-orange-50 rounded"><span>CDD</span><b className="text-orange-600">{l.cdd}%</b></div><div className="flex justify-between p-2 bg-red-50 rounded"><span>Intérim</span><b className="text-red-600">{l.interim}%</b></div></>})()}</div></Card>
      </div>}

      {subTab === 'secteurs' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="🏭 Emploi par secteur (k)">
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.emploi_secteur.secteurs} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={11} /><YAxis dataKey="secteur" type="category" width={110} fontSize={9} /><Tooltip /><Bar dataKey="emploi" fill={C.primary}>{d.emploi_secteur.secteurs.map((e,i)=><Cell key={i} fill={e.evolution_trim<0?C.secondary:C.tertiary}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Évolutions"><div className="p-2 space-y-1">{d.emploi_secteur.secteurs.map((s,i)=><div key={i} className="flex justify-between text-xs p-2 bg-gray-50 rounded"><span>{s.secteur}</span><span className={s.evolution_an>=0?'text-green-600':'text-red-600'}>{s.evolution_an>=0?'+':''}{s.evolution_an}%/an</span></div>)}</div></Card>
      </div>}

      {subTab === 'recrutement' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="🔴 Difficultés recrutement (%)">
          <ResponsiveContainer width="100%" height={200}><LineChart data={d.difficultes_recrutement}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="trimestre" fontSize={8} /><YAxis domain={[20,70]} fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:9}} /><Line dataKey="construction" name="BTP" stroke={C.quaternary} strokeWidth={2} /><Line dataKey="industrie" name="Industrie" stroke={C.primary} strokeWidth={2} /><Line dataKey="services" name="Services" stroke={C.tertiary} strokeWidth={2} /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="⚠️ Métiers en tension">
          <div className="overflow-x-auto max-h-48"><table className="w-full text-xs"><thead><tr className="bg-gray-100"><th className="text-left p-1">Métier</th><th className="p-1">%</th></tr></thead><tbody>{d.tensions_metiers.metiers_plus_tendus.slice(0,6).map((m,i)=><tr key={i} className="border-b"><td className="p-1">{m.metier}</td><td className="p-1 text-center"><span className={`px-1 py-0.5 rounded text-white text-xs ${m.difficulte>=80?'bg-red-600':'bg-orange-500'}`}>{m.difficulte}%</span></td></tr>)}</tbody></table></div>
        </Card>
      </div>}

      {subTab === 'dynamique' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📊 Créations/Destructions (k)">
          <ResponsiveContainer width="100%" height={220}><ComposedChart data={d.creations_destructions.donnees}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="trimestre" fontSize={9} /><YAxis fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:9}} /><Bar dataKey="creations" name="Créations" fill={C.tertiary} /><Bar dataKey="destructions" name="Destructions" fill={C.secondary} /><Line dataKey="solde" name="Solde" stroke={C.primary} strokeWidth={3} /></ComposedChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Solde net">
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.creations_destructions.donnees}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="trimestre" fontSize={9} /><YAxis fontSize={11} /><Tooltip formatter={v=>`${v>=0?'+':''}${v}k`} /><Bar dataKey="solde">{d.creations_destructions.donnees.map((e,i)=><Cell key={i} fill={e.solde>=0?C.tertiary:C.secondary}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
      </div>}
    </div>
  );
}

function ConditionsVieTab({d, subTab, setSubTab, darkMode}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 bg-white p-2 rounded shadow-sm">
        {[['loyers','Loyers (IRL)'],['immobilier','Prix immobilier'],['carburants','Carburants'],['effort','Taux d\'effort']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-2 py-1 rounded text-xs font-medium ${subTab===id?'bg-cyan-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'loyers' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="📈 Indice de Référence des Loyers (IRL)">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={d.irl.evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="trimestre" fontSize={9} />
              <YAxis yAxisId="left" domain={[130,150]} fontSize={11} />
              <YAxis yAxisId="right" orientation="right" domain={[0,4]} fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{fontSize:10}} />
              <Bar yAxisId="right" dataKey="glissement" name="Glissement %" fill={C.quaternary} />
              <Line yAxisId="left" dataKey="indice" name="Indice" stroke={C.primary} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Situation actuelle">
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span>IRL actuel</span><span className="text-2xl font-bold text-blue-600">{d.irl.valeur_actuelle}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span>Glissement annuel</span><span className="text-2xl font-bold text-green-600">+{d.irl.glissement_annuel}%</span>
            </div>
            <div className="bg-yellow-50 p-3 rounded text-xs">
              <p className="font-semibold">💡 Impact loyer 800€</p>
              <p>Hausse max = <b>+{(800 * d.irl.glissement_annuel / 100).toFixed(0)}€/mois</b></p>
            </div>
          </div>
        </Card>
      </div>}

      {subTab === 'immobilier' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="🏠 Prix logements anciens">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={d.prix_immobilier.evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="trimestre" fontSize={9} />
              <YAxis domain={[110,130]} fontSize={11} />
              <Tooltip />
              <Area dataKey="indice" fill={C.primary} fillOpacity={0.2} stroke="none" />
              <Line dataKey="indice" stroke={C.primary} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="💰 Prix/m² par zone">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.prix_immobilier.par_zone} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={11} />
              <YAxis dataKey="zone" type="category" width={80} fontSize={10} />
              <Tooltip formatter={v=>`${v.toLocaleString()}€/m²`} />
              <Bar dataKey="prix_m2" fill={C.primary}>
                {d.prix_immobilier.par_zone.map((e,i)=><Cell key={i} fill={e.variation<0?C.secondary:C.tertiary}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {subTab === 'carburants' && <div className="grid md:grid-cols-2 gap-4">
        <Card title="⛽ Prix carburants (€/L)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.carburants.evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" fontSize={8} />
              <YAxis domain={[1.5,2.0]} fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{fontSize:10}} />
              <Line dataKey="gazole" name="Gazole" stroke={C.quaternary} strokeWidth={2} />
              <Line dataKey="sp95" name="SP95" stroke={C.tertiary} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="💰 Prix actuels">
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
              <span>Gazole</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-orange-600">{d.carburants.gazole.prix}€/L</span>
                <span className={`text-xs ml-2 ${d.carburants.gazole.variation_an<0?'text-green-600':'text-red-600'}`}>{d.carburants.gazole.variation_an}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
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
          <Card title="🏠 Taux d'effort par statut">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.taux_effort.par_statut} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0,50]} fontSize={11} />
                <YAxis dataKey="statut" type="category" width={120} fontSize={9} />
                <Tooltip formatter={v=>`${v}%`} />
                <Legend wrapperStyle={{fontSize:9}} />
                <Bar dataKey="taux_median" name="Médian" fill={C.primary} />
                <Bar dataKey="taux_q1" name="25% + modestes" fill={C.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="📊 Par revenu">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.taux_effort.par_revenu}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quartile" fontSize={9} />
                <YAxis domain={[0,35]} fontSize={11} />
                <Tooltip formatter={v=>`${v}%`} />
                <Bar dataKey="taux" fill={C.quaternary}>
                  {d.taux_effort.par_revenu.map((e,i)=><Cell key={i} fill={e.taux>25?C.secondary:C.quaternary}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>}
    </div>
  );
}

function InflationTab({d, darkMode}) {
  return (
    <div className="space-y-4">
      <Card title="📊 Inflation par poste (%)">
        <ResponsiveContainer width="100%" height={280}><BarChart data={d.inflation_detail}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="poste" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:11}} /><Bar dataKey="val2022" name="2022" fill={C.secondary} /><Bar dataKey="val2023" name="2023" fill={C.quaternary} /><Bar dataKey="val2024" name="2024" fill={C.tertiary} /></BarChart></ResponsiveContainer>
      </Card>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded"><h3 className="font-semibold text-yellow-800">💡 Points négociation</h3><ul className="mt-2 text-sm text-yellow-700 space-y-1"><li>• Alimentation: pic 2023 (+11.8%), normalisation 2024</li><li>• Services: hausse régulière (~2.7%)</li><li>• Loyers: progression continue (+2.8%)</li></ul></div>
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
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
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
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-3xl font-bold text-blue-600">{cc.statistiques_branches.total_branches}</p>
          <p className="text-sm text-gray-600">Branches suivies</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center">
          <p className="text-3xl font-bold text-green-600">{cc.statistiques_branches.branches_conformes}</p>
          <p className="text-sm text-gray-600">Conformes</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg text-center">
          <p className="text-3xl font-bold text-red-600">{cc.statistiques_branches.branches_non_conformes}</p>
          <p className="text-sm text-gray-600">Non conformes</p>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg text-center">
          <p className="text-3xl font-bold text-orange-600">{cc.statistiques_branches.pourcentage_non_conformes}%</p>
          <p className="text-sm text-gray-600">Taux non-conformité</p>
        </div>
      </div>

      {/* Alerte si branches non conformes */}
      {countNonConformes > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
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
                  <span className="text-gray-500">Màj: {branche.derniere_revalorisation}</span>
                </div>
                {branche.commentaire && (
                  <p className="text-xs text-gray-500 mt-1 italic">{branche.commentaire}</p>
                )}
              </div>
              
              {isSelected && (
                <div className="border-t bg-gray-50 p-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500">
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">📚 Comment utiliser ces données en NAO ?</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <b>Comparez</b> votre grille d'entreprise aux minima de branche</p>
          <p>• <b>Vérifiez</b> que votre employeur respecte les minima conventionnels</p>
          <p>• <b>Argumentez</b> en montrant l'écart avec le SMIC (+X% minimum requis)</p>
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
    </div>
  );
}

// ==================== ONGLET ÉVOLUTIONS 5 ANS ====================
function EvolutionsTab({d, darkMode}) {
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
        <p className="text-sm opacity-80">Visualisez les tendances économiques pour argumenter en NAO</p>
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
              <XAxis dataKey="annee" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="inflation" name="Inflation annuelle" fill="#ef4444" />
              <Line type="monotone" dataKey="inflation_cum" name="Inflation cumulée" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="smic_evol" name="SMIC évolution" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          )}
          {graphType === 'chomage' && (
            <LineChart data={dataChomage}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis domain={[6, 9]} stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="chomage" name="Taux de chômage (%)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} />
              <ReferenceLine y={7.3} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Plus bas 2022-23', fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
            </LineChart>
          )}
          {graphType === 'salaires' && (
            <LineChart data={dataSalaires}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis domain={[1100, 2400]} stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} formatter={(v) => `${v}€`} />
              <Legend />
              <Line type="monotone" dataKey="smic_net" name="SMIC net" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="median" name="Salaire médian" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          )}
          {graphType === 'pib' && (
            <ComposedChart data={dataPIB}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis yAxisId="left" domain={[-10, 10]} stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis yAxisId="right" orientation="right" domain={[25, 40]} stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Bar yAxisId="left" dataKey="pib" name="Croissance PIB (%)" fill="#22c55e" />
              <Line yAxisId="right" type="monotone" dataKey="taux_marge" name="Taux de marge SNF (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              <ReferenceLine yAxisId="left" y={0} stroke="#6b7280" />
            </ComposedChart>
          )}
          {graphType === 'pouvoir_achat' && (
            <BarChart data={dataPouvoirAchat}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="annee" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis domain={[-3, 3]} stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} formatter={(v) => `${v > 0 ? '+' : ''}${v}%`} />
              <Legend />
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
              <XAxis dataKey="annee" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} formatter={(v) => `${v.toFixed(0)}k`} />
              <Legend />
              <Bar dataKey="defaillances" name="Défaillances (milliers)" fill="#ef4444" />
              <ReferenceLine y={42} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Niveau 2022', fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Card>

      {/* Encadré d'analyse */}
      <div className={`p-4 rounded-lg border ${darkMode ? 'bg-indigo-900/30 border-indigo-700' : 'bg-indigo-50 border-indigo-200'}`}>
        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>💡 Points clés pour les NAO</h3>
        <div className={`text-sm space-y-2 ${darkMode ? 'text-indigo-200' : 'text-indigo-700'}`}>
          {graphType === 'inflation_smic' && (
            <>
              <p>• <b>Inflation cumulée 2020-2025 : +15.9%</b> - Les prix ont fortement augmenté</p>
              <p>• <b>SMIC +17.1%</b> sur la même période - Le SMIC a compensé l'inflation</p>
              <p>• <b>Argument</b> : "Les salaires hors SMIC n'ont pas suivi la même dynamique"</p>
            </>
          )}
          {graphType === 'chomage' && (
            <>
              <p>• <b>Chômage stable autour de 7.3-7.7%</b> depuis 2022</p>
              <p>• <b>Plus bas historique depuis 1982</b> atteint fin 2022 (7.1%)</p>
              <p>• <b>Argument</b> : "Le marché du travail reste tendu, les entreprises doivent fidéliser"</p>
            </>
          )}
          {graphType === 'salaires' && (
            <>
              <p>• <b>SMIC net : +17%</b> en 5 ans (1219€ → 1426€)</p>
              <p>• <b>Salaire médian : +16%</b> en 5 ans (1940€ → 2250€)</p>
              <p>• <b>Argument</b> : "L'écart SMIC-médian s'est réduit, les salariés qualifiés rattrapent leur retard"</p>
            </>
          )}
          {graphType === 'pib' && (
            <>
              <p>• <b>Rebond 2021 (+6.4%)</b> après la chute COVID de 2020 (-7.5%)</p>
              <p>• <b>Taux de marge SNF ~32%</b> - reste élevé historiquement</p>
              <p>• <b>Argument</b> : "Les marges des entreprises permettent des hausses de salaires"</p>
            </>
          )}
          {graphType === 'pouvoir_achat' && (
            <>
              <p>• <b>Pouvoir d'achat SMIC préservé</b> grâce aux revalorisations automatiques</p>
              <p>• <b>2021 et 2024 légèrement négatifs</b> - rattrapage l'année suivante</p>
              <p>• <b>Argument</b> : "Les salariés au-dessus du SMIC ont perdu en pouvoir d'achat"</p>
            </>
          )}
          {graphType === 'defaillances' && (
            <>
              <p>• <b>Explosion des défaillances</b> : 32k (2020) → 68k (2025)</p>
              <p>• <b>Rattrapage post-COVID</b> des entreprises "zombies" maintenues artificiellement</p>
              <p>• <b>Argument</b> : "Contexte économique difficile, mais les entreprises saines peuvent augmenter"</p>
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
        Sources : INSEE, Ministère du Travail, Banque de France • Données 2025 : estimations/provisoires
      </p>
    </div>
  );
}

// ==================== ONGLET TRAVAIL (Égalité, AT, Formation, Épargne, Temps) ====================
function TravailTab({d, darkMode}) {
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
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>💡 Arguments NAO - Égalité professionnelle</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-purple-200' : 'text-purple-800'}`}>
              {(egapro.arguments_nao || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
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
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>💡 Arguments NAO - Santé/Sécurité</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
              {(accidents.arguments_nao || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
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
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>💡 Arguments NAO - Formation</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
              {(formation.arguments_nao || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
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
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>💡 Arguments NAO - Épargne salariale</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
              {(epargne.arguments_nao || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
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
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>💡 Arguments NAO - Temps de travail</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-cyan-200' : 'text-cyan-800'}`}>
              {(temps.arguments_nao || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== ONGLET AIDE / GLOSSAIRE ====================
function AideTab({darkMode}) {
  const [openSection, setOpenSection] = useState('glossaire');
  
  const glossaire = [
    { terme: "SMIC", definition: "Salaire Minimum Interprofessionnel de Croissance. Salaire horaire minimum légal en France, revalorisé chaque année au 1er janvier (et parfois en cours d'année si l'inflation dépasse 2%).", categorie: "Salaires" },
    { terme: "SMH", definition: "Salaire Minimum Hiérarchique. Salaire minimum fixé par une convention collective pour chaque niveau de classification. Doit être ≥ SMIC.", categorie: "Salaires" },
    { terme: "Superbrut", definition: "Coût total employeur = Salaire brut + Cotisations patronales. C'est le vrai coût d'un salarié pour l'entreprise.", categorie: "Salaires" },
    { terme: "NAO", definition: "Négociation Annuelle Obligatoire. Obligation pour les entreprises de négocier chaque année sur les salaires, le temps de travail et le partage de la valeur.", categorie: "Négociation" },
    { terme: "IDCC", definition: "Identifiant de Convention Collective. Numéro à 4 chiffres qui identifie chaque convention collective (ex: 3248 = Métallurgie).", categorie: "Conventions" },
    { terme: "CCN", definition: "Convention Collective Nationale. Accord négocié entre syndicats et patronat qui fixe les règles d'une branche professionnelle.", categorie: "Conventions" },
    { terme: "RGDU", definition: "Réduction Générale Dégressive Unifiée. Nouveau dispositif 2026 remplaçant la réduction Fillon. Exonération de cotisations patronales jusqu'à 3 SMIC.", categorie: "Cotisations" },
    { terme: "Réduction Fillon", definition: "Ancien nom de la réduction générale de cotisations patronales (avant 2026). S'appliquait jusqu'à 1.6 SMIC.", categorie: "Cotisations" },
    { terme: "PMSS", definition: "Plafond Mensuel de la Sécurité Sociale. Seuil utilisé pour calculer certaines cotisations (4 005€ en 2026).", categorie: "Cotisations" },
    { terme: "CSG", definition: "Contribution Sociale Généralisée. Prélèvement sur les revenus finançant la Sécurité sociale (9.2% sur salaires).", categorie: "Cotisations" },
    { terme: "CRDS", definition: "Contribution au Remboursement de la Dette Sociale. Prélèvement de 0.5% finançant la dette de la Sécu.", categorie: "Cotisations" },
    { terme: "IRL", definition: "Indice de Référence des Loyers. Indice INSEE servant de base à la révision annuelle des loyers.", categorie: "Indicateurs" },
    { terme: "IPC", definition: "Indice des Prix à la Consommation. Mesure l'évolution du niveau général des prix (inflation).", categorie: "Indicateurs" },
    { terme: "PIB", definition: "Produit Intérieur Brut. Valeur totale de la production de biens et services d'un pays.", categorie: "Indicateurs" },
    { terme: "Partage de la VA", definition: "Répartition de la Valeur Ajoutée entre salaires, profits et impôts. Indicateur clé du partage des richesses.", categorie: "Indicateurs" },
    { terme: "EBE", definition: "Excédent Brut d'Exploitation. Profit de l'entreprise avant impôts, intérêts et amortissements.", categorie: "Indicateurs" },
    { terme: "Taux de marge", definition: "EBE / Valeur Ajoutée. Mesure la part des profits dans la richesse créée par l'entreprise.", categorie: "Indicateurs" },
    { terme: "PPV", definition: "Prime de Partage de la Valeur (ex-Prime Macron). Prime exonérée de cotisations jusqu'à certains plafonds.", categorie: "Primes" },
    { terme: "Intéressement", definition: "Prime liée aux performances de l'entreprise, définie par accord. Exonérée de cotisations.", categorie: "Primes" },
    { terme: "Participation", definition: "Part des bénéfices redistribuée aux salariés. Obligatoire dans les entreprises de +50 salariés.", categorie: "Primes" },
    { terme: "ETAM", definition: "Employés, Techniciens et Agents de Maîtrise. Catégorie de salariés non-cadres.", categorie: "Classification" },
    { terme: "Cadre", definition: "Salarié exerçant des fonctions d'encadrement ou d'expertise. Cotise à l'AGIRC-ARRCO.", categorie: "Classification" },
    { terme: "Coefficient", definition: "Nombre attribué à chaque niveau de classification, servant à calculer le salaire minimum.", categorie: "Classification" },
    { terme: "DARES", definition: "Direction de l'Animation de la Recherche, des Études et des Statistiques. Service statistique du Ministère du Travail.", categorie: "Sources" },
    { terme: "INSEE", definition: "Institut National de la Statistique et des Études Économiques. Produit les données économiques officielles.", categorie: "Sources" },
    { terme: "URSSAF", definition: "Union de Recouvrement des cotisations de Sécurité Sociale. Collecte les cotisations sociales.", categorie: "Organismes" },
    { terme: "France Travail", definition: "Nouveau nom de Pôle Emploi depuis 2024. Service public de l'emploi.", categorie: "Organismes" },
    { terme: "DGT", definition: "Direction Générale du Travail. Administration centrale du Ministère du Travail.", categorie: "Organismes" }
  ];

  const categories = [...new Set(glossaire.map(g => g.categorie))];
  const [filtreCategorie, setFiltreCategorie] = useState('all');
  const [recherche, setRecherche] = useState('');

  const glossaireFiltre = glossaire.filter(g => {
    const matchCategorie = filtreCategorie === 'all' || g.categorie === filtreCategorie;
    const matchRecherche = recherche === '' || 
      g.terme.toLowerCase().includes(recherche.toLowerCase()) || 
      g.definition.toLowerCase().includes(recherche.toLowerCase());
    return matchCategorie && matchRecherche;
  });

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-purple-600 to-indigo-600'} text-white`}>
        <h2 className="text-lg font-bold">📖 Aide & Glossaire</h2>
        <p className="text-sm opacity-80">Comprendre les termes et indicateurs du tableau de bord</p>
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
              <option value="all">Toutes catégories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {glossaireFiltre.map((item, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-start gap-2">
                  <span className={`font-bold ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>{item.terme}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{item.categorie}</span>
                </div>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.definition}</p>
              </div>
            ))}
          </div>
          <p className={`text-xs mt-3 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{glossaireFiltre.length} terme(s) affiché(s)</p>
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
            <h4 className={`font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>💡 Arguments NAO</h4>
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
