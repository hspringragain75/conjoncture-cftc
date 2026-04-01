import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', cyan: '#06b6d4', gray: '#6b7280'
};

export default function PouvoirAchatTab({d, darkMode, fp={}}) {
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
      <div className={`flex flex-wrap gap-2`}>
        {[['general','📊 Général'],['budget','🧺 Budget UNAF'],['heures','⏱️ Heures de travail']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${subTab===id?'bg-orange-600 text-white shadow-lg': darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {/* ONGLET GÉNÉRAL */}
      {subTab === 'general' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📊 Inflation vs Salaires (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><BarChart data={d.inflation_salaires}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} /><YAxis {...chartProps.yAxis} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar radius={[6, 6, 0, 0]} dataKey="inflation" name="Inflation" fill={C.secondary} /><Bar radius={[6, 6, 0, 0]} dataKey="smic" name="SMIC" fill={C.primary} /><Bar radius={[6, 6, 0, 0]} dataKey="salaires_base" name="Salaires" fill={C.tertiary} /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Évolution cumulée (base 100)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><LineChart data={d.pouvoir_achat_cumule}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="periode" {...chartProps.xAxis} /><YAxis {...chartProps.yAxis} domain={[98,120]} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="prix" name="Prix" stroke={C.secondary} strokeWidth={2.5} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="smic" name="SMIC" stroke={C.primary} strokeWidth={2.5} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="salaires" name="Salaires" stroke={C.tertiary} strokeWidth={2.5} /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="📋 Part salariés au SMIC" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><BarChart data={d.smic?.part_salaries || []}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} /><YAxis {...chartProps.yAxis} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} /><Bar radius={[6, 6, 0, 0]} dataKey="part" fill={C.quaternary}>{(d.smic?.part_salaries || []).map((e,i)=><Cell key={i} fill={e.part>15?C.secondary:C.quaternary}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
      </div>}

      {/* ONGLET BUDGET UNAF */}
      {subTab === 'budget' && <div className="space-y-4">
        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-orange-900 to-amber-900' : 'bg-gradient-to-r from-orange-500 to-amber-500'} text-white`}>
          <h2 className="text-lg font-bold">🧺 Budget-Type Familial (UNAF)</h2>
          <p className="text-sm opacity-90">Source officielle : <a href={budgetsUNAF.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">UNAF</a> • Données {budgetsUNAF.lastUpdate}</p>
          <p className="text-xs opacity-75 mt-1">{budgetsUNAF.description}</p>
        </div>

        {/* Sélecteurs */}
        <div className={`p-3 rounded-xl flex flex-wrap gap-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div>
            <label className={`text-xs font-medium block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Type de famille</label>
            <div className="flex gap-1">
              {Object.entries(budgetsUNAF.familles).map(([id, f]) => (
                <button key={id} onClick={() => setFamilleType(id)} className={`px-2 py-1.5 rounded-lg text-xs ${familleType === id ? 'bg-orange-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {f.icon} {f.nom.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-xs font-medium block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Zone géographique</label>
            <div className="flex gap-1">
              {[['horsIdf', '🌳 Province'], ['idf', '🏙️ Île-de-France'], ['france', '🇫🇷 Moyenne France']].map(([id, label]) => (
                <button key={id} onClick={() => setZoneGeo(id)} className={`px-2 py-1.5 rounded-lg text-xs ${zoneGeo === id ? 'bg-[#0d4093] text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-orange-900/30 border border-orange-700' : 'bg-orange-50 border border-orange-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>Budget mensuel</p>
            <p className="text-3xl font-bold text-orange-500">{totalActuel.toLocaleString('fr-FR')}€</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{budgetsUNAF.familles[familleType]?.nom}</p>
          </div>
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-600'}`}>Équivalent SMIC</p>
            <p className={`text-3xl font-bold ${parseInt(partSmic) > 200 ? 'text-red-500' : 'text-orange-500'}`}>{partSmic}%</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>≈ {(totalActuel / smicNetMensuel).toFixed(1)} SMIC nets</p>
          </div>
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-[#0d4093]'}`}>Évolution 2020→2025</p>
            <p className="text-3xl font-bold text-[#0d4093]">+{evolution2020}%</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>+{(totalActuel - total2020).toLocaleString('fr-FR')}€/mois</p>
          </div>
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-purple-900/30 border border-purple-700' : 'bg-purple-50 border border-purple-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>Catégories UNAF</p>
            <p className="text-3xl font-bold text-purple-500">10</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>postes budgétaires</p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="📈 Évolution du budget 2020-2025" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={historiqueData}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="annee" {...chartProps.xAxis} />
                <YAxis {...chartProps.yAxis} domain={['dataMin - 300', 'dataMax + 200']} tickFormatter={v => `${v}€`} />
                <Tooltip {...chartProps.tooltip} formatter={(v) => [`${v.toLocaleString('fr-FR')}€`, 'Budget']} />
                <Bar radius={[6, 6, 0, 0]} dataKey="total" fill={C.primary}>
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
                <Bar radius={[6, 6, 0, 0]} dataKey="montant">
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
                <div key={cat.id} className={`p-3 rounded-xl border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
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
          <div className={`mt-4 p-3 rounded-xl ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              💡 <strong>Source officielle :</strong> Ces données proviennent des <a href={budgetsUNAF.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">budgets-types UNAF</a>, 
              qui évaluent les dépenses nécessaires pour vivre décemment. Mis à jour mensuellement.
            </p>
          </div>
        </Card>
      </div>}

      {/* ONGLET HEURES DE TRAVAIL */}
      {subTab === 'heures' && <div className="space-y-4">
        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-blue-900 to-indigo-900' : 'bg-gradient-to-r from-[#0d4093] to-indigo-600'} text-white`}>
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
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'ring-2 ring-[#0d4093] ' + (darkMode ? 'bg-blue-900/30 border-[#0d4093]' : 'bg-blue-50 border-blue-300') : darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow'}`}>
                <div className="flex justify-between items-start">
                  <span className="text-2xl">{p.icon}</span>
                  {variation && <span className={`text-xs px-1.5 py-0.5 rounded-lg font-medium ${parseInt(variation) > 0 ? (darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-600') : (darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-600')}`}>{parseInt(variation) > 0 ? '+' : ''}{variation}%</span>}
                </div>
                <p className={`text-xs font-medium mt-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{p.nom}</p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{p.prix?.[anneeActuelle]?.toLocaleString('fr-FR')}€</p>
                <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <p className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>{heures}h</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>au SMIC en {anneeActuelle}</p>
                </div>
              </div>
            );
          })}
        </div>

        {produitSelect && evolutionProduit.length > 0 && (
          <Card title={`📈 Évolution : ${produitSelect.icon} ${produitSelect.nom}`} darkMode={darkMode}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Heures de travail nécessaires</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={evolutionProduit}>
                    <CartesianGrid {...chartProps.cartesianGrid} />
                    <XAxis dataKey="annee" {...chartProps.xAxis} />
                    <YAxis {...chartProps.yAxis} />
                    <Tooltip {...chartProps.tooltip} formatter={v=>[`${v}h`, 'Heures']} />
                    <Bar radius={[6, 6, 0, 0]} dataKey="heures" fill={C.primary}>
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
                    <Line strokeLinecap="round" strokeLinejoin="round" dataKey="prix" stroke={C.tertiary} strokeWidth={3} dot={{ fill: C.tertiary, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )}

        {!produitSelect && (
          <div className={`text-center p-8 rounded-2xl border-2 border-dashed ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
            <p className="text-4xl mb-2">👆</p>
            <p>Cliquez sur un produit pour voir son évolution depuis 2010</p>
          </div>
        )}

        <div className={`p-3 rounded-xl text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
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
  
