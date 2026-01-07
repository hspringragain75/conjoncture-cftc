import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, Cell, ReferenceLine } from 'recharts';

const DATA = {
  "last_updated": "2026-01-07",
  "contact": "hspringragain@cftc.fr",
  "indicateurs_cles": { 
    "taux_chomage_actuel": 7.7, "taux_chomage_jeunes": 19.2, "taux_emploi_seniors": 62.0, 
    "inflation_annuelle": 0.9, "smic_net": 1443.11, "difficultes_recrutement": 61, 
    "irl_glissement": 0.87, "prix_gazole": 1.58, "taux_effort_locataires": 29.6,
    "croissance_pib": 0.5, "climat_affaires": 98, "defaillances_12m": 68227
  },
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
  },
  "irl": {
    "valeur_actuelle": 145.77, "glissement_annuel": 0.87, "trimestre": "T3 2025",
    "evolution": [
      { "trimestre": "T1 2022", "indice": 133.93, "glissement": 2.48 },
      { "trimestre": "T3 2022", "indice": 136.27, "glissement": 3.49 },
      { "trimestre": "T1 2023", "indice": 138.61, "glissement": 3.49 },
      { "trimestre": "T3 2023", "indice": 141.03, "glissement": 3.49 },
      { "trimestre": "T1 2024", "indice": 143.46, "glissement": 3.50 },
      { "trimestre": "T3 2024", "indice": 144.51, "glissement": 2.47 },
      { "trimestre": "T1 2025", "indice": 145.47, "glissement": 1.40 },
      { "trimestre": "T3 2025", "indice": 145.77, "glissement": 0.87 }
    ]
  },
  "prix_immobilier": {
    "indice_actuel": 116.2, "variation_trim": 1.0, "variation_an": -1.8, "transactions_annuelles": 880000,
    "evolution": [
      { "trimestre": "T1 2022", "indice": 124.5, "variation": 7.2 },
      { "trimestre": "T3 2022", "indice": 126.8, "variation": 6.1 },
      { "trimestre": "T1 2023", "indice": 124.2, "variation": -0.2 },
      { "trimestre": "T3 2023", "indice": 120.5, "variation": -5.0 },
      { "trimestre": "T1 2024", "indice": 117.8, "variation": -5.1 },
      { "trimestre": "T3 2024", "indice": 115.3, "variation": -4.3 },
      { "trimestre": "T1 2025", "indice": 116.2, "variation": -1.4 }
    ],
    "par_zone": [
      { "zone": "Paris", "prix_m2": 9450, "variation": -3.2 },
      { "zone": "Île-de-France", "prix_m2": 6220, "variation": -0.3 },
      { "zone": "Province", "prix_m2": 2650, "variation": 1.2 },
      { "zone": "France entière", "prix_m2": 3180, "variation": -0.5 }
    ]
  },
  "carburants": {
    "gazole": { "prix": 1.58, "variation_an": -0.6 },
    "sp95": { "prix": 1.72, "variation_an": -1.9 },
    "sp98": { "prix": 1.82, "variation_an": -1.5 },
    "evolution": [
      { "mois": "Jan 2023", "gazole": 1.85, "sp95": 1.82 },
      { "mois": "Avr 2023", "gazole": 1.78, "sp95": 1.88 },
      { "mois": "Juil 2023", "gazole": 1.72, "sp95": 1.85 },
      { "mois": "Oct 2023", "gazole": 1.88, "sp95": 1.92 },
      { "mois": "Jan 2024", "gazole": 1.72, "sp95": 1.78 },
      { "mois": "Juil 2024", "gazole": 1.68, "sp95": 1.75 },
      { "mois": "Oct 2024", "gazole": 1.62, "sp95": 1.72 },
      { "mois": "Jan 2025", "gazole": 1.65, "sp95": 1.78 },
      { "mois": "Oct 2025", "gazole": 1.58, "sp95": 1.72 }
    ]
  },
  "taux_effort": {
    "annee": 2023, "source": "INSEE enquête SRCV 2024",
    "par_statut": [
      { "statut": "Locataires secteur libre", "taux_median": 29.6, "taux_q1": 42.0 },
      { "statut": "Accédants propriété", "taux_median": 27.5, "taux_q1": 44.0 },
      { "statut": "Locataires HLM", "taux_median": 24.1, "taux_q1": 30.0 },
      { "statut": "Propriétaires", "taux_median": 10.0, "taux_q1": 15.0 }
    ],
    "par_revenu": [
      { "quartile": "Q1 (+ modestes)", "taux": 31.0 },
      { "quartile": "Q2", "taux": 22.0 },
      { "quartile": "Q3", "taux": 18.0 },
      { "quartile": "Q4 (+ aisés)", "taux": 14.1 }
    ],
    "evolution": [
      { "annee": "2001", "ensemble": 16.2, "locataires_libre": 23.8 },
      { "annee": "2006", "ensemble": 17.5, "locataires_libre": 25.2 },
      { "annee": "2013", "ensemble": 18.3, "locataires_libre": 28.6 },
      { "annee": "2017", "ensemble": 19.7, "locataires_libre": 28.6 },
      { "annee": "2023", "ensemble": 20.5, "locataires_libre": 29.6 }
    ]
  },
  // CONJONCTURE GÉNÉRALE (NOUVEAU)
  "pib": {
    "croissance_trim_actuel": 0.5, "croissance_annuelle": 1.1, "trimestre": "T3 2025",
    "evolution": [
      { "trimestre": "T1 2022", "croissance": 0.0 }, { "trimestre": "T2 2022", "croissance": 0.5 },
      { "trimestre": "T3 2022", "croissance": 0.2 }, { "trimestre": "T4 2022", "croissance": 0.1 },
      { "trimestre": "T1 2023", "croissance": 0.1 }, { "trimestre": "T2 2023", "croissance": 0.6 },
      { "trimestre": "T3 2023", "croissance": 0.0 }, { "trimestre": "T4 2023", "croissance": 0.0 },
      { "trimestre": "T1 2024", "croissance": 0.2 }, { "trimestre": "T2 2024", "croissance": 0.3 },
      { "trimestre": "T3 2024", "croissance": 0.4 }, { "trimestre": "T4 2024", "croissance": -0.1 },
      { "trimestre": "T1 2025", "croissance": 0.2 }, { "trimestre": "T2 2025", "croissance": 0.3 },
      { "trimestre": "T3 2025", "croissance": 0.5 }
    ],
    "contributions": { "trimestre": "T3 2025", "demande_interieure": 0.3, "commerce_exterieur": 0.9, "stocks": -0.6 },
    "annuel": [
      { "annee": "2019", "croissance": 1.8 }, { "annee": "2020", "croissance": -7.9 },
      { "annee": "2021", "croissance": 6.4 }, { "annee": "2022", "croissance": 2.6 },
      { "annee": "2023", "croissance": 1.1 }, { "annee": "2024", "croissance": 1.1 },
      { "annee": "2025", "croissance": 0.9 }
    ]
  },
  "climat_affaires": {
    "valeur_actuelle": 98, "confiance_menages": 92, "moyenne_long_terme": 100, "mois": "Nov 2025",
    "evolution": [
      { "mois": "Jan 2024", "climat": 99, "menages": 91 }, { "mois": "Avr 2024", "climat": 100, "menages": 90 },
      { "mois": "Juil 2024", "climat": 97, "menages": 92 }, { "mois": "Oct 2024", "climat": 97, "menages": 93 },
      { "mois": "Jan 2025", "climat": 95, "menages": 92 }, { "mois": "Avr 2025", "climat": 97, "menages": 91 },
      { "mois": "Juil 2025", "climat": 96, "menages": 93 }, { "mois": "Oct 2025", "climat": 97, "menages": 92 },
      { "mois": "Nov 2025", "climat": 98, "menages": 92 }
    ],
    "par_secteur": [
      { "secteur": "Industrie", "climat": 101 }, { "secteur": "Services", "climat": 98 },
      { "secteur": "Bâtiment", "climat": 96 }, { "secteur": "Commerce détail", "climat": 97 }
    ]
  },
  "defaillances": {
    "cumul_12_mois": 68227, "variation_an": 0.8, "mois": "Sep 2025", "moyenne_2010_2019": 58000,
    "evolution": [
      { "mois": "Jan 2023", "cumul": 42000 }, { "mois": "Avr 2023", "cumul": 47000 },
      { "mois": "Juil 2023", "cumul": 51000 }, { "mois": "Oct 2023", "cumul": 55000 },
      { "mois": "Jan 2024", "cumul": 57500 }, { "mois": "Avr 2024", "cumul": 60000 },
      { "mois": "Juil 2024", "cumul": 63500 }, { "mois": "Oct 2024", "cumul": 66000 },
      { "mois": "Jan 2025", "cumul": 66500 }, { "mois": "Avr 2025", "cumul": 67000 },
      { "mois": "Juil 2025", "cumul": 67600 }, { "mois": "Sep 2025", "cumul": 68227 }
    ],
    "par_secteur": [
      { "secteur": "Construction", "part": 21, "evolution": 5 },
      { "secteur": "Commerce", "part": 19, "evolution": 8 },
      { "secteur": "Héberg-resto", "part": 13, "evolution": 12 },
      { "secteur": "Services", "part": 28, "evolution": 6 },
      { "secteur": "Industrie", "part": 8, "evolution": 3 },
      { "secteur": "Autres", "part": 11, "evolution": 4 }
    ]
  },
  "investissement": {
    "fbcf_variation_trim": 0.4, "fbcf_variation_an": -1.5, "trimestre": "T3 2025",
    "taux_investissement": 25.2,
    "evolution": [
      { "trimestre": "T1 2023", "variation": 0.8 }, { "trimestre": "T2 2023", "variation": 0.5 },
      { "trimestre": "T3 2023", "variation": 1.0 }, { "trimestre": "T4 2023", "variation": -0.7 },
      { "trimestre": "T1 2024", "variation": 0.3 }, { "trimestre": "T2 2024", "variation": -0.2 },
      { "trimestre": "T3 2024", "variation": -0.3 }, { "trimestre": "T4 2024", "variation": -0.1 },
      { "trimestre": "T1 2025", "variation": -0.1 }, { "trimestre": "T2 2025", "variation": 0.0 },
      { "trimestre": "T3 2025", "variation": 0.4 }
    ],
    "par_type": [
      { "type": "Construction", "variation_an": -2.5 },
      { "type": "Équipements", "variation_an": -0.8 },
      { "type": "Info-communication", "variation_an": 5.0 },
      { "type": "Transport", "variation_an": -1.2 }
    ]
  }
};

const C = { primary: '#1e40af', secondary: '#dc2626', tertiary: '#059669', quaternary: '#d97706', pink: '#db2777', purple: '#7c3aed', cyan: '#0891b2', gray: '#6b7280' };

export default function App() {
  const [tab, setTab] = useState('conjoncture');
  const [subTab, setSubTab] = useState('chomage');
  const [subTabVie, setSubTabVie] = useState('loyers');
  const [subTabConj, setSubTabConj] = useState('pib');
  const d = DATA;

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
          {[['conjoncture','📈 Conjoncture'],['pouvoir_achat','💰 Pouvoir d\'achat'],['salaires','💵 Salaires'],['emploi','👥 Emploi'],['conditions_vie','🏠 Conditions vie'],['inflation','📊 Inflation']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap ${tab === id ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>{label}</button>
          ))}
        </div>

        {tab === 'conjoncture' && <ConjonctureTab d={d} subTab={subTabConj} setSubTab={setSubTabConj} />}
        {tab === 'pouvoir_achat' && <PouvoirAchatTab d={d} />}
        {tab === 'salaires' && <SalairesTab d={d} />}
        {tab === 'emploi' && <EmploiTab d={d} subTab={subTab} setSubTab={setSubTab} />}
        {tab === 'conditions_vie' && <ConditionsVieTab d={d} subTab={subTabVie} setSubTab={setSubTabVie} />}
        {tab === 'inflation' && <InflationTab d={d} />}
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
        {[['pib','Croissance PIB'],['climat','Climat affaires'],['defaillances','Défaillances'],['investissement','Investissement']].map(([id,label])=>(
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
