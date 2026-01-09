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

  useEffect(() => {
    fetch('./data.json')
      .then(r => { if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Chargement des données...</h2>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-6">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-red-700 mb-2">Erreur de chargement</h2>
        <p className="text-gray-600 mb-4">{error || "Données non disponibles"}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Réessayer</button>
      </div>
    </div>
  );

  const d = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white py-4 px-4">
        <h1 className="text-xl font-bold">📊 Tableau de Bord Économique CFTC</h1>
        <div className="flex flex-wrap justify-between items-center text-sm mt-1">
          <span className="text-blue-200">Màj : {d.last_updated}</span>
          <span className="text-blue-100">📧 Contact : <a href={`mailto:${d.contact}`} className="underline hover:text-white">{d.contact}</a></span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          <Kpi label="PIB T3" value={`+${d.indicateurs_cles.croissance_pib}%`} color="green" />
          <Kpi label="Climat affaires" value={d.indicateurs_cles.climat_affaires} color="blue" />
          <Kpi label="Chômage" value={`${d.indicateurs_cles.taux_chomage_actuel}%`} color="red" />
          <Kpi label="Inflation" value={`${d.indicateurs_cles.inflation_annuelle}%`} color="green" />
          <Kpi label="SMIC net" value={`${d.indicateurs_cles.smic_net}€`} color="blue" />
          <Kpi label="Défaillances" value={`${(d.indicateurs_cles.defaillances_12m/1000).toFixed(1)}k`} color="orange" />
        </div>

        <div className="flex flex-wrap gap-2 mb-4 border-b pb-3 overflow-x-auto">
          {[['conjoncture','📈 Conjoncture'],['pouvoir_achat','💰 Pouvoir d\'achat'],['salaires','💵 Salaires'],['emploi','👥 Emploi'],['conditions_vie','🏠 Conditions vie'],['inflation','📊 Inflation'],['conventions','📋 Conventions'],['comparaison_ue','🇪🇺 Europe'],['simulateur','🧮 Simulateur NAO']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap ${tab === id ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>{label}</button>
          ))}
        </div>

        {tab === 'conjoncture' && <ConjonctureTab d={d} subTab={subTabConj} setSubTab={setSubTabConj} />}
        {tab === 'comparaison_ue' && <ComparaisonUETab d={d} />}
        {tab === 'simulateur' && <SimulateurNAOTab d={d} />}
        {tab === 'pouvoir_achat' && <PouvoirAchatTab d={d} />}
        {tab === 'salaires' && <SalairesTab d={d} />}
        {tab === 'emploi' && <EmploiTab d={d} subTab={subTab} setSubTab={setSubTab} />}
        {tab === 'conditions_vie' && <ConditionsVieTab d={d} subTab={subTabVie} setSubTab={setSubTabVie} />}
        {tab === 'inflation' && <InflationTab d={d} />}
        {tab === 'conventions' && <ConventionsTab d={d} />}
      </div>
    </div>
  );
}

function Kpi({label, value, color}) {
  const colors = {green:'bg-green-50 text-green-800 border-green-200', red:'bg-red-50 text-red-800 border-red-200', orange:'bg-orange-50 text-orange-800 border-orange-200', blue:'bg-blue-50 text-blue-800 border-blue-200'};
  return <div className={`p-2 rounded border ${colors[color]}`}><p className="text-xs opacity-75">{label}</p><p className="text-lg font-bold">{value}</p></div>;
}

function Card({title, children}) {
  return <div className="bg-white rounded-xl shadow p-4 border"><h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>{children}</div>;
}

// NOUVEL ONGLET CONJONCTURE
function ConjonctureTab({d, subTab, setSubTab}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 bg-white p-2 rounded shadow-sm">
        {[['pib','Croissance PIB'],['partage_va','⚖️ Partage VA'],['climat','Climat affaires'],['defaillances','Défaillances'],['investissement','Investissement']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-2 py-1 rounded text-xs font-medium ${subTab===id?'bg-indigo-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
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
function ComparaisonUETab({d}) {
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
function SimulateurNAOTab({d}) {
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
  
  // ========== COÛT EMPLOYEUR ==========
  const coutEmpl = (brut) => {
    const txBase = regime === '2026' ? 0.47 : 0.45;
    const chargesBrutes = brut * txBase;
    const red = calcul(brut);
    const txRed = regime === '2025' ? calcTauxReduits(brut) : { total: 0 };
    const reductions = red.mens + txRed.total;
    const chargesNettes = chargesBrutes - reductions;
    return { brut, chargesBrutes: Math.round(chargesBrutes), redPrinc: red.mens, redTx: txRed.total, chargesNettes: Math.round(chargesNettes), total: Math.round(brut + chargesNettes), txEff: ((chargesNettes / brut) * 100).toFixed(1) };
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
          <h4 className="font-semibold text-sm mb-2">📊 Coût employeur</h4>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b"><th className="text-left py-1"></th><th className="text-right">Avant</th><th className="text-right">Après</th><th className="text-right">Δ</th></tr></thead>
            <tbody>
              <tr><td>Brut</td><td className="text-right">{coutAct.brut}€</td><td className="text-right">{coutNouv.brut}€</td><td className="text-right text-orange-600">+{coutNouv.brut - coutAct.brut}€</td></tr>
              <tr><td>Charges brutes ({regime === '2026' ? '47' : '45'}%)</td><td className="text-right">{coutAct.chargesBrutes}€</td><td className="text-right">{coutNouv.chargesBrutes}€</td><td></td></tr>
              <tr className="text-green-600"><td>- {regime === '2026' ? 'RGDU' : 'Fillon'}</td><td className="text-right">-{coutAct.redPrinc}€</td><td className="text-right">-{coutNouv.redPrinc}€</td><td></td></tr>
              {regime === '2025' && <tr className="text-green-600"><td>- Taux réduits</td><td className="text-right">-{coutAct.redTx}€</td><td className="text-right">-{coutNouv.redTx}€</td><td></td></tr>}
              <tr className="border-t"><td>Charges nettes</td><td className="text-right">{coutAct.chargesNettes}€</td><td className="text-right">{coutNouv.chargesNettes}€</td><td className="text-right text-gray-500">{coutAct.txEff}%→{coutNouv.txEff}%</td></tr>
              <tr className="border-t bg-orange-50 font-bold"><td className="py-2">COÛT TOTAL</td><td className="text-right">{coutAct.total.toLocaleString()}€</td><td className="text-right">{coutNouv.total.toLocaleString()}€</td><td className="text-right text-orange-600">+{surcout}€/m</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2 text-center">Surcoût annuel: <b className="text-orange-600">+{(surcout * 12).toLocaleString()}€</b></p>
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

function PouvoirAchatTab({d}) {
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

function SalairesTab({d}) {
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

function EmploiTab({d, subTab, setSubTab}) {
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

function ConditionsVieTab({d, subTab, setSubTab}) {
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

function InflationTab({d}) {
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
function ConventionsTab({d}) {
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

      <p className="text-xs text-gray-400 text-center">
        Source : Comité de suivi des négociations salariales de branche ({cc.statistiques_branches.date_comite_suivi}) • SMIC au {cc.smic_reference.date}
      </p>
    </div>
  );
}
