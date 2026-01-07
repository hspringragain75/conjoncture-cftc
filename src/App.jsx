import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, Cell } from 'recharts';

const DATA = {
  "last_updated": "2026-01-06",
  "indicateurs_cles": { "taux_chomage_actuel": 7.7, "taux_chomage_jeunes": 19.2, "taux_emploi_seniors": 62.0, "inflation_annuelle": 0.9, "smic_net": 1443.11, "difficultes_recrutement": 61 },
  "inflation_salaires": [
    { "annee": "2020", "inflation": 0.5, "smic": 1.2, "salaires_base": 1.5 },
    { "annee": "2021", "inflation": 1.6, "smic": 2.2, "salaires_base": 1.4 },
    { "annee": "2022", "inflation": 5.2, "smic": 5.6, "salaires_base": 3.5 },
    { "annee": "2023", "inflation": 4.9, "smic": 6.6, "salaires_base": 4.2 },
    { "annee": "2024", "inflation": 2.0, "smic": 2.0, "salaires_base": 2.8 },
    { "annee": "2025", "inflation": 0.9, "smic": 1.2, "salaires_base": 2.0 }
  ],
  "pouvoir_achat_cumule": [
    { "periode": "T4 2020", "smic": 100, "salaires": 100, "prix": 100 },
    { "periode": "T4 2021", "smic": 102.2, "salaires": 101.4, "prix": 102.5 },
    { "periode": "T4 2022", "smic": 108, "salaires": 105, "prix": 109 },
    { "periode": "T4 2023", "smic": 115, "salaires": 111, "prix": 115 },
    { "periode": "T4 2024", "smic": 117, "salaires": 115, "prix": 117 },
    { "periode": "T3 2025", "smic": 118, "salaires": 116.5, "prix": 117.5 }
  ],
  "chomage": [
    { "trimestre": "T1 2023", "taux": 7.1, "jeunes": 17.5 },
    { "trimestre": "T3 2023", "taux": 7.4, "jeunes": 17.6 },
    { "trimestre": "T1 2024", "taux": 7.5, "jeunes": 18.1 },
    { "trimestre": "T3 2024", "taux": 7.4, "jeunes": 18.3 },
    { "trimestre": "T1 2025", "taux": 7.4, "jeunes": 18.5 },
    { "trimestre": "T3 2025", "taux": 7.7, "jeunes": 19.2 }
  ],
  "smic": { "montant_brut": 1823.03, "montant_net": 1443.11, "part_salaries": [
    { "annee": "2019", "part": 12.0 }, { "annee": "2020", "part": 12.5 }, { "annee": "2021", "part": 13.4 },
    { "annee": "2022", "part": 14.5 }, { "annee": "2023", "part": 17.3 }, { "annee": "2024", "part": 14.6 }
  ]},
  "inflation_detail": [
    { "poste": "Alimentation", "val2022": 6.8, "val2023": 11.8, "val2024": 1.4 },
    { "poste": "Énergie", "val2022": 23.1, "val2023": 5.6, "val2024": 2.3 },
    { "poste": "Services", "val2022": 3.0, "val2023": 3.0, "val2024": 2.7 },
    { "poste": "Manufacturés", "val2022": 3.3, "val2023": 3.5, "val2024": 0.0 },
    { "poste": "Loyers", "val2022": 2.0, "val2023": 2.8, "val2024": 2.8 }
  ],
  "salaire_median": { "montant_2024": 2190, "evolution": [
    { "annee": "2019", "montant": 1940 }, { "annee": "2020", "montant": 1960 }, { "annee": "2021", "montant": 2010 },
    { "annee": "2022", "montant": 2090 }, { "annee": "2023", "montant": 2091 }, { "annee": "2024", "montant": 2190 }
  ]},
  "ecart_hommes_femmes": { "ecart_global": 22.2, "ecart_eqtp": 13.0, "ecart_poste_comparable": 4.0, "evolution": [
    { "annee": "2015", "ecart": 18.4 }, { "annee": "2017", "ecart": 16.6 }, { "annee": "2019", "ecart": 16.1 },
    { "annee": "2021", "ecart": 15.5 }, { "annee": "2023", "ecart": 14.2 }, { "annee": "2024", "ecart": 13.0 }
  ]},
  "salaires_secteur": [
    { "secteur": "Finance", "salaire": 4123 }, { "secteur": "Info-comm", "salaire": 3853 },
    { "secteur": "Industrie", "salaire": 3021 }, { "secteur": "Tertiaire", "salaire": 2705 },
    { "secteur": "BTP", "salaire": 2411 }, { "secteur": "Hôtellerie", "salaire": 1979 }
  ],
  "ppv": { "beneficiaires_2023": 23.1, "beneficiaires_2024": 14.6, "montant_total_2024": 3.4, "montant_moyen": 885 },
  "emploi_seniors": [
    { "trimestre": "T1 2023", "taux": 58.5 }, { "trimestre": "T3 2023", "taux": 59.2 },
    { "trimestre": "T1 2024", "taux": 60.1 }, { "trimestre": "T3 2024", "taux": 60.9 },
    { "trimestre": "T1 2025", "taux": 61.5 }, { "trimestre": "T3 2025", "taux": 62.0 }
  ],
  "types_contrats": [
    { "trimestre": "T1 2023", "cdi": 74.5, "cdd": 8.8, "interim": 2.2 },
    { "trimestre": "T3 2023", "cdi": 74.4, "cdd": 8.9, "interim": 2.0 },
    { "trimestre": "T1 2024", "cdi": 74.8, "cdd": 8.5, "interim": 1.9 },
    { "trimestre": "T3 2024", "cdi": 74.9, "cdd": 8.4, "interim": 1.8 },
    { "trimestre": "T1 2025", "cdi": 75.1, "cdd": 8.2, "interim": 1.7 },
    { "trimestre": "T3 2025", "cdi": 75.3, "cdd": 8.0, "interim": 1.6 }
  ],
  "difficultes_recrutement": [
    { "trimestre": "T1 2023", "industrie": 52, "services": 38, "construction": 65 },
    { "trimestre": "T3 2023", "industrie": 48, "services": 35, "construction": 60 },
    { "trimestre": "T1 2024", "industrie": 43, "services": 32, "construction": 55 },
    { "trimestre": "T3 2024", "industrie": 40, "services": 29, "construction": 50 },
    { "trimestre": "T1 2025", "industrie": 36, "services": 27, "construction": 46 },
    { "trimestre": "T3 2025", "industrie": 34, "services": 25, "construction": 44 }
  ],
  "emploi_secteur": { "derniere_mise_a_jour": "T3 2025", "secteurs": [
    { "secteur": "Tertiaire marchand", "emploi": 12850, "evolution_trim": -0.1, "evolution_an": -0.3 },
    { "secteur": "Tertiaire non march.", "emploi": 8420, "evolution_trim": 0.3, "evolution_an": 0.8 },
    { "secteur": "Industrie", "emploi": 3180, "evolution_trim": -0.1, "evolution_an": -0.3 },
    { "secteur": "Construction", "emploi": 1530, "evolution_trim": 0.0, "evolution_an": -1.3 },
    { "secteur": "Intérim", "emploi": 700, "evolution_trim": -0.6, "evolution_an": -2.9 }
  ]},
  "creations_destructions": { "source": "DARES MMO", "donnees": [
    { "trimestre": "T1 2024", "creations": 120, "destructions": 95, "solde": 25 },
    { "trimestre": "T2 2024", "creations": 115, "destructions": 100, "solde": 15 },
    { "trimestre": "T3 2024", "creations": 110, "destructions": 105, "solde": 5 },
    { "trimestre": "T4 2024", "creations": 105, "destructions": 110, "solde": -5 },
    { "trimestre": "T1 2025", "creations": 100, "destructions": 108, "solde": -8 },
    { "trimestre": "T2 2025", "creations": 102, "destructions": 105, "solde": -3 },
    { "trimestre": "T3 2025", "creations": 98, "destructions": 108, "solde": -10 }
  ]},
  "tensions_metiers": { "source": "France Travail BMO", "annee": 2025, "taux_difficultes_global": 61,
    "metiers_plus_tendus": [
      { "metier": "Aides à domicile", "difficulte": 85, "projets": 125000 },
      { "metier": "Couvreurs", "difficulte": 82, "projets": 18000 },
      { "metier": "Maçons", "difficulte": 79, "projets": 22000 },
      { "metier": "Aides-soignants", "difficulte": 78, "projets": 98000 },
      { "metier": "Conducteurs", "difficulte": 76, "projets": 52000 },
      { "metier": "Ingénieurs IT", "difficulte": 75, "projets": 45000 },
      { "metier": "Serveurs", "difficulte": 72, "projets": 95000 },
      { "metier": "Cuisiniers", "difficulte": 70, "projets": 68000 }
    ],
    "evolution": [
      { "annee": "2019", "taux": 50 }, { "annee": "2020", "taux": 40 }, { "annee": "2021", "taux": 45 },
      { "annee": "2022", "taux": 58 }, { "annee": "2023", "taux": 61 }, { "annee": "2024", "taux": 58 }, { "annee": "2025", "taux": 61 }
    ]
  }
};

const C = { primary: '#1e40af', secondary: '#dc2626', tertiary: '#059669', quaternary: '#d97706', pink: '#db2777' };

export default function App() {
  const [tab, setTab] = useState('pouvoir_achat');
  const [subTab, setSubTab] = useState('chomage');
  const d = DATA;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white py-4 px-4">
        <h1 className="text-xl font-bold">📊 Tableau de Bord Économique CFTC</h1>
        <p className="text-blue-200 text-sm">Màj : {d.last_updated}</p>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <Kpi label="Inflation" value={`${d.indicateurs_cles.inflation_annuelle}%`} color="green" />
          <Kpi label="Chômage" value={`${d.indicateurs_cles.taux_chomage_actuel}%`} color="red" />
          <Kpi label="SMIC net" value={`${d.indicateurs_cles.smic_net}€`} color="blue" />
          <Kpi label="Emploi seniors" value={`${d.indicateurs_cles.taux_emploi_seniors}%`} color="green" />
          <Kpi label="Tensions recrut." value={`${d.indicateurs_cles.difficultes_recrutement}%`} color="orange" />
        </div>

        <div className="flex flex-wrap gap-2 mb-4 border-b pb-3">
          {[['pouvoir_achat','💰 Pouvoir d\'achat'],['salaires','💵 Salaires'],['emploi','👥 Emploi'],['inflation','📈 Inflation']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded text-sm font-medium ${tab === id ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>{label}</button>
          ))}
        </div>

        {tab === 'pouvoir_achat' && (
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
        )}

        {tab === 'salaires' && (
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
        )}

        {tab === 'emploi' && (
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
              <Card title="📈 Contexte"><div className="p-4"><div className="flex justify-between items-center p-3 bg-green-50 rounded mb-3"><span>Taux actuel</span><span className="text-2xl font-bold text-green-600">{d.indicateurs_cles.taux_emploi_seniors}%</span></div><div className="bg-blue-50 p-3 rounded text-xs"><p className="font-semibold mb-1">📌 Points clés</p><ul className="space-y-1"><li>• Progression depuis réforme retraites 2023</li><li>• 55-59 ans : ~77% (proche UE)</li><li>• 60-64 ans : ~42% (vs 53% UE)</li></ul></div></div></Card>
            </div>}

            {subTab === 'contrats' && <div className="grid md:grid-cols-2 gap-4">
              <Card title="📋 Répartition contrats">
                <ResponsiveContainer width="100%" height={220}><BarChart data={d.types_contrats}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="trimestre" fontSize={8} /><YAxis fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:9}} /><Bar dataKey="cdi" name="CDI" stackId="a" fill={C.primary} /><Bar dataKey="cdd" name="CDD" stackId="a" fill={C.quaternary} /><Bar dataKey="interim" name="Intérim" stackId="a" fill={C.secondary} /></BarChart></ResponsiveContainer>
              </Card>
              <Card title="📊 T3 2025"><div className="p-4 space-y-2">{(()=>{const l=d.types_contrats[d.types_contrats.length-1];return<><div className="flex justify-between p-2 bg-blue-50 rounded"><span>CDI</span><b className="text-blue-600">{l.cdi}%</b></div><div className="flex justify-between p-2 bg-orange-50 rounded"><span>CDD</span><b className="text-orange-600">{l.cdd}%</b></div><div className="flex justify-between p-2 bg-red-50 rounded"><span>Intérim</span><b className="text-red-600">{l.interim}%</b></div><div className="flex justify-between p-2 bg-gray-50 rounded"><span>Autres</span><b>{(100-l.cdi-l.cdd-l.interim).toFixed(1)}%</b></div></>})()}</div></Card>
            </div>}

            {subTab === 'secteurs' && <div className="grid md:grid-cols-2 gap-4">
              <Card title="🏭 Emploi par secteur (k)">
                <ResponsiveContainer width="100%" height={220}><BarChart data={d.emploi_secteur.secteurs} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={11} /><YAxis dataKey="secteur" type="category" width={110} fontSize={9} /><Tooltip /><Bar dataKey="emploi" fill={C.primary}>{d.emploi_secteur.secteurs.map((e,i)=><Cell key={i} fill={e.evolution_trim<0?C.secondary:C.tertiary}/>)}</Bar></BarChart></ResponsiveContainer>
              </Card>
              <Card title="📈 Évolutions"><div className="p-2 space-y-1">{d.emploi_secteur.secteurs.map((s,i)=><div key={i} className="flex justify-between text-xs p-2 bg-gray-50 rounded"><span>{s.secteur}</span><span className={s.evolution_an>=0?'text-green-600':'text-red-600'}>{s.evolution_an>=0?'+':''}{s.evolution_an}%/an</span></div>)}</div></Card>
            </div>}

            {subTab === 'recrutement' && <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card title="🔴 Difficultés recrutement (%)">
                  <ResponsiveContainer width="100%" height={200}><LineChart data={d.difficultes_recrutement}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="trimestre" fontSize={8} /><YAxis domain={[20,70]} fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:9}} /><Line dataKey="construction" name="BTP" stroke={C.quaternary} strokeWidth={2} /><Line dataKey="industrie" name="Industrie" stroke={C.primary} strokeWidth={2} /><Line dataKey="services" name="Services" stroke={C.tertiary} strokeWidth={2} /></LineChart></ResponsiveContainer>
                </Card>
                <Card title="📈 Évolution tensions BMO">
                  <ResponsiveContainer width="100%" height={200}><ComposedChart data={d.tensions_metiers.evolution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="annee" fontSize={11} /><YAxis domain={[30,70]} fontSize={11} /><Tooltip formatter={v=>`${v}%`} /><Area dataKey="taux" fill={C.secondary} fillOpacity={0.2} stroke="none" /><Line dataKey="taux" stroke={C.secondary} strokeWidth={3} /></ComposedChart></ResponsiveContainer>
                </Card>
              </div>
              <Card title="⚠️ Métiers en tension (BMO 2025)">
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-100"><th className="text-left p-2">Métier</th><th className="p-2">Difficulté</th><th className="text-right p-2">Projets</th></tr></thead><tbody>{d.tensions_metiers.metiers_plus_tendus.map((m,i)=><tr key={i} className="border-b"><td className="p-2">{m.metier}</td><td className="p-2 text-center"><span className={`px-2 py-0.5 rounded text-white text-xs ${m.difficulte>=80?'bg-red-600':m.difficulte>=70?'bg-orange-500':'bg-yellow-500'}`}>{m.difficulte}%</span></td><td className="p-2 text-right text-gray-600">{m.projets.toLocaleString()}</td></tr>)}</tbody></table></div>
              </Card>
            </div>}

            {subTab === 'dynamique' && <div className="grid md:grid-cols-2 gap-4">
              <Card title="📊 Créations/Destructions (k)">
                <ResponsiveContainer width="100%" height={220}><ComposedChart data={d.creations_destructions.donnees}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="trimestre" fontSize={9} /><YAxis fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:9}} /><Bar dataKey="creations" name="Créations" fill={C.tertiary} /><Bar dataKey="destructions" name="Destructions" fill={C.secondary} /><Line dataKey="solde" name="Solde" stroke={C.primary} strokeWidth={3} /></ComposedChart></ResponsiveContainer>
              </Card>
              <Card title="📈 Solde net">
                <ResponsiveContainer width="100%" height={220}><BarChart data={d.creations_destructions.donnees}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="trimestre" fontSize={9} /><YAxis fontSize={11} /><Tooltip formatter={v=>`${v>=0?'+':''}${v}k`} /><Bar dataKey="solde">{d.creations_destructions.donnees.map((e,i)=><Cell key={i} fill={e.solde>=0?C.tertiary:C.secondary}/>)}</Bar></BarChart></ResponsiveContainer>
                <p className="text-xs text-gray-500 text-center">Source: {d.creations_destructions.source}</p>
              </Card>
            </div>}
          </div>
        )}

        {tab === 'inflation' && (
          <div className="space-y-4">
            <Card title="📊 Inflation par poste (%)">
              <ResponsiveContainer width="100%" height={280}><BarChart data={d.inflation_detail}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="poste" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend wrapperStyle={{fontSize:11}} /><Bar dataKey="val2022" name="2022" fill={C.secondary} /><Bar dataKey="val2023" name="2023" fill={C.quaternary} /><Bar dataKey="val2024" name="2024" fill={C.tertiary} /></BarChart></ResponsiveContainer>
            </Card>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded"><h3 className="font-semibold text-yellow-800">💡 Points négociation</h3><ul className="mt-2 text-sm text-yellow-700 space-y-1"><li>• Alimentation: pic 2023 (+11.8%), normalisation 2024</li><li>• Services: hausse régulière (~2.7%)</li><li>• Loyers: progression continue (+2.8%)</li></ul></div>
          </div>
        )}
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
