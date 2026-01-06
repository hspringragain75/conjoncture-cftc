import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart, Cell, PieChart, Pie } from 'recharts';

const ConjonctureCFTC = () => {
  const [activeTab, setActiveTab] = useState('pouvoir_achat');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('./data.json')
      .then(res => {
        if (!res.ok) throw new Error('Données non disponibles');
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur chargement données:', err);
        setError(err.message);
        setLoading(false);
        setData(getDefaultData());
      });
  }, []);

  const getDefaultData = () => ({
    last_updated: new Date().toISOString(),
    inflation_salaires: [
      { annee: '2020', inflation: 0.5, smic: 1.2, salaires_base: 1.5 },
      { annee: '2021', inflation: 1.6, smic: 2.2, salaires_base: 1.4 },
      { annee: '2022', inflation: 5.2, smic: 5.6, salaires_base: 3.5 },
      { annee: '2023', inflation: 4.9, smic: 6.6, salaires_base: 4.2 },
      { annee: '2024', inflation: 2.0, smic: 2.0, salaires_base: 2.8 },
      { annee: '2025', inflation: 0.9, smic: 1.2, salaires_base: 2.0 },
    ],
    pouvoir_achat_cumule: [
      { periode: 'T4 2020', smic: 100, salaires: 100, prix: 100 },
      { periode: 'T2 2021', smic: 101, salaires: 100.5, prix: 101 },
      { periode: 'T4 2021', smic: 102.2, salaires: 101.4, prix: 102.5 },
      { periode: 'T2 2022', smic: 105, salaires: 103, prix: 106 },
      { periode: 'T4 2022', smic: 108, salaires: 105, prix: 109 },
      { periode: 'T2 2023', smic: 112, salaires: 108, prix: 113 },
      { periode: 'T4 2023', smic: 115, salaires: 111, prix: 115 },
      { periode: 'T2 2024', smic: 116, salaires: 113, prix: 116 },
      { periode: 'T4 2024', smic: 117, salaires: 115, prix: 117 },
      { periode: 'T3 2025', smic: 118, salaires: 116.5, prix: 117.5 },
    ],
    chomage: [
      { trimestre: 'T1 2023', taux: 7.1, jeunes: 17.5 },
      { trimestre: 'T2 2023', taux: 7.2, jeunes: 17.0 },
      { trimestre: 'T3 2023', taux: 7.4, jeunes: 17.6 },
      { trimestre: 'T4 2023', taux: 7.5, jeunes: 17.6 },
      { trimestre: 'T1 2024', taux: 7.5, jeunes: 18.1 },
      { trimestre: 'T2 2024', taux: 7.3, jeunes: 17.7 },
      { trimestre: 'T3 2024', taux: 7.4, jeunes: 18.3 },
      { trimestre: 'T4 2024', taux: 7.3, jeunes: 19.0 },
      { trimestre: 'T1 2025', taux: 7.4, jeunes: 18.5 },
      { trimestre: 'T2 2025', taux: 7.5, jeunes: 18.8 },
      { trimestre: 'T3 2025', taux: 7.7, jeunes: 19.2 },
    ],
    smic: {
      montant_brut: 1823.03,
      montant_net: 1443.11,
      taux_horaire: 12.02,
      date_vigueur: "2026-01-01",
      evolution_depuis_2020: 17,
      part_salaries: [
        { annee: '2019', part: 12.0 },
        { annee: '2020', part: 12.5 },
        { annee: '2021', part: 13.4 },
        { annee: '2022', part: 14.5 },
        { annee: '2023', part: 17.3 },
        { annee: '2024', part: 14.6 },
      ]
    },
    inflation_detail: [
      { poste: 'Alimentation', val2022: 6.8, val2023: 11.8, val2024: 1.4 },
      { poste: 'Énergie', val2022: 23.1, val2023: 5.6, val2024: 2.3 },
      { poste: 'Services', val2022: 3.0, val2023: 3.0, val2024: 2.7 },
      { poste: 'Manufacturés', val2022: 3.3, val2023: 3.5, val2024: 0.0 },
      { poste: 'Loyers', val2022: 2.0, val2023: 2.8, val2024: 2.8 },
    ],
    indicateurs_cles: {
      taux_chomage_actuel: 7.7,
      inflation_annuelle: 0.9,
      smic_brut: 1823.03,
      smic_net: 1443.11
    },
    // Nouvelles données
    salaire_median: {
      montant_2024: 2190,
      montant_2023: 2091,
      montant_2022: 2090,
      evolution: [
        { annee: '2019', montant: 1940 },
        { annee: '2020', montant: 1960 },
        { annee: '2021', montant: 2010 },
        { annee: '2022', montant: 2090 },
        { annee: '2023', montant: 2091 },
        { annee: '2024', montant: 2190 },
      ]
    },
    ecart_hommes_femmes: {
      ecart_global: 22.2,
      ecart_eqtp: 13.0,
      ecart_poste_comparable: 4.0,
      evolution: [
        { annee: '2015', ecart: 18.4 },
        { annee: '2017', ecart: 16.6 },
        { annee: '2019', ecart: 16.1 },
        { annee: '2021', ecart: 15.5 },
        { annee: '2022', ecart: 14.9 },
        { annee: '2023', ecart: 14.2 },
        { annee: '2024', ecart: 13.0 },
      ]
    },
    salaires_secteur: [
      { secteur: 'Services financiers', salaire: 4123, evolution: 0.5 },
      { secteur: 'Info-communication', salaire: 3853, evolution: 0.8 },
      { secteur: 'Industrie', salaire: 3021, evolution: 1.1 },
      { secteur: 'Tertiaire (moyenne)', salaire: 2705, evolution: 0.7 },
      { secteur: 'Construction', salaire: 2411, evolution: 0.4 },
      { secteur: 'Héberg.-restauration', salaire: 1979, evolution: 0.9 },
    ],
    ppv: {
      beneficiaires_2023: 23.1,
      beneficiaires_2024: 14.6,
      montant_total_2023: 5.3,
      montant_total_2024: 3.4,
      montant_moyen: 885,
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  const TabButton = ({ id, label, active }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  const StatCard = ({ title, value, subtitle, trend, color = 'blue' }) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      red: 'bg-red-50 border-red-200',
      orange: 'bg-orange-50 border-orange-200',
      purple: 'bg-purple-50 border-purple-200',
    };
    return (
      <div className={`p-4 rounded-xl border-2 ${colors[color]}`}>
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        {trend !== undefined && (
          <p className={`text-xs mt-2 font-medium ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)} pts sur 1 an
          </p>
        )}
      </div>
    );
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const lastChomage = data.chomage[data.chomage.length - 1];
  const lastChomageJeunes = data.chomage.find(c => c.jeunes)?.jeunes || 19.2;

  // Couleurs pour les graphiques
  const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">CFTC</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Note de Conjoncture Économique</h1>
              <p className="text-gray-500">Données clés pour les salariés</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Mise à jour automatique</p>
            <p>{formatDate(data.last_updated)}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⚠️ Données hors ligne utilisées. {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton id="pouvoir_achat" label="💰 Pouvoir d'achat" active={activeTab === 'pouvoir_achat'} />
          <TabButton id="salaires_egalite" label="👫 Salaires & Égalité" active={activeTab === 'salaires_egalite'} />
          <TabButton id="emploi" label="👥 Emploi & Chômage" active={activeTab === 'emploi'} />
          <TabButton id="inflation" label="📊 Détail Inflation" active={activeTab === 'inflation'} />
        </div>

        {/* Contenu - Pouvoir d'achat */}
        {activeTab === 'pouvoir_achat' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                title="SMIC brut mensuel" 
                value={`${data.smic.montant_brut.toLocaleString('fr-FR')} €`}
                subtitle="Au 1er janvier 2026"
                color="blue"
              />
              <StatCard 
                title="Inflation 2025" 
                value={`${data.indicateurs_cles.inflation_annuelle} %`}
                subtitle="Moyenne annuelle"
                color="green"
              />
              <StatCard 
                title="Hausse SMIC 2021-2025" 
                value={`+${data.smic.evolution_depuis_2020} %`}
                subtitle="vs +15% pour les prix"
                color="blue"
              />
              <StatCard 
                title="Salariés au SMIC" 
                value={`${data.smic.part_salaries[data.smic.part_salaries.length - 1]?.part || 14.6} %`}
                subtitle="En 2024"
                color="orange"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Inflation vs Évolution des salaires
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Évolution annuelle en % — Le SMIC a globalement suivi l'inflation
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data.inflation_salaires}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${value}%`]}
                  />
                  <Legend />
                  <Bar dataKey="inflation" name="Inflation" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="smic" name="SMIC" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="salaires_base" name="Salaires de base" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Évolution cumulée depuis fin 2020
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Base 100 au T4 2020
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.pouvoir_achat_cumule}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="periode" tick={{ fontSize: 10 }} />
                  <YAxis domain={[98, 120]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="prix" name="Prix (IPC)" fill="#fecaca" stroke="#ef4444" fillOpacity={0.4} />
                  <Line type="monotone" dataKey="smic" name="SMIC" stroke="#2563eb" strokeWidth={3} />
                  <Line type="monotone" dataKey="salaires" name="Salaires négociés" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-4">
              <h3 className="font-bold text-blue-800">📌 Point clé pour les négociations</h3>
              <p className="text-sm text-blue-700 mt-2">
                Entre 2021 et 2025, le SMIC a progressé de <strong>+17%</strong> contre <strong>+15%</strong> pour les prix. 
                Le pouvoir d'achat des salariés au SMIC a donc été préservé. En revanche, les salaires médians n'ont 
                progressé que de <strong>+12 à 13%</strong>, entraînant une compression de l'échelle salariale.
              </p>
            </div>
          </div>
        )}

        {/* NOUVEL ONGLET - Salaires & Égalité */}
        {activeTab === 'salaires_egalite' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                title="Salaire médian 2024" 
                value="2 190 €"
                subtitle="Net mensuel EQTP"
                color="blue"
              />
              <StatCard 
                title="Salaire moyen 2024" 
                value="2 733 €"
                subtitle="Net mensuel EQTP"
                color="blue"
              />
              <StatCard 
                title="Écart H/F (EQTP)" 
                value="13 %"
                subtitle="En défaveur des femmes"
                color="purple"
              />
              <StatCard 
                title="PPV : bénéficiaires" 
                value="14,6 %"
                subtitle="2024 (vs 23,1% en 2023)"
                color="orange"
              />
            </div>

            {/* Salaire médian évolution */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Évolution du salaire médian
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Salaire net mensuel en EQTP — 50% des salariés gagnent moins
              </p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.salaire_median?.evolution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
                  <YAxis domain={[1800, 2300]} tick={{ fontSize: 12 }} unit=" €" />
                  <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v) => `${v} €`} />
                  <Bar dataKey="montant" name="Salaire médian" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Écart Hommes/Femmes */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Écart de salaire Femmes / Hommes
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Écart en % à temps de travail identique (EQTP) — Tendance à la baisse
              </p>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.ecart_hommes_femmes?.evolution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
                  <YAxis domain={[10, 20]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v) => `${v}%`} />
                  <ReferenceLine y={13} stroke="#22c55e" strokeDasharray="5 5" label={{ value: '2024', fontSize: 10, fill: '#22c55e' }} />
                  <Line type="monotone" dataKey="ecart" name="Écart F/H" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
              
              {/* Décomposition de l'écart */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">22 %</p>
                  <p className="text-xs text-gray-600">Écart global (tous temps de travail)</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">13 %</p>
                  <p className="text-xs text-gray-600">À temps de travail égal (EQTP)</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">4 %</p>
                  <p className="text-xs text-gray-600">À poste comparable</p>
                </div>
              </div>
            </div>

            {/* Salaires par secteur */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Salaire moyen par secteur d'activité
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Salaire net mensuel EQTP en 2024
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.salaires_secteur || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" domain={[0, 4500]} unit=" €" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="secteur" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v) => `${v.toLocaleString('fr-FR')} €`} />
                  <Bar dataKey="salaire" name="Salaire moyen" radius={[0, 6, 6, 0]}>
                    {(data.salaires_secteur || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Prime de Partage de la Valeur */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Prime de Partage de la Valeur (PPV)
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Recul important en 2024 suite aux changements de régime fiscal
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[
                      { annee: '2023', beneficiaires: 23.1, montant: 5.3 },
                      { annee: '2024', beneficiaires: 14.6, montant: 3.4 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8 }} />
                      <Bar dataKey="beneficiaires" name="% bénéficiaires" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center space-y-3">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Montant moyen versé</p>
                    <p className="text-xl font-bold text-purple-700">885 €</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Total versé en 2024</p>
                    <p className="text-xl font-bold text-gray-700">3,4 Mds €</p>
                    <p className="text-xs text-gray-500">vs 5,3 Mds € en 2023</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Encadrés */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-purple-50 border-l-4 border-purple-600 rounded-r-xl p-4">
                <h3 className="font-bold text-purple-800">👫 Égalité salariale</h3>
                <p className="text-sm text-purple-700 mt-2">
                  L'écart salarial F/H continue de se réduire (<strong>-5 pts en 10 ans</strong>). 
                  À poste comparable, il n'est plus que de 4%. Mais les femmes restent 
                  sous-représentées parmi les 1% les mieux payés (<strong>24%</strong> seulement).
                </p>
              </div>
              <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-xl p-4">
                <h3 className="font-bold text-orange-800">⚠️ PPV en recul</h3>
                <p className="text-sm text-orange-700 mt-2">
                  La prime de partage de la valeur a fortement reculé en 2024 : 
                  <strong> -8,5 pts</strong> de bénéficiaires. La fin de l'exonération totale 
                  pour les entreprises de 50+ salariés explique ce repli.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contenu - Emploi */}
        {activeTab === 'emploi' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                title="Taux de chômage" 
                value={`${lastChomage?.taux || 7.7} %`}
                subtitle={lastChomage?.trimestre || 'T3 2025'}
                trend={0.3}
                color="red"
              />
              <StatCard 
                title="Chômage des jeunes" 
                value={`${lastChomageJeunes} %`}
                subtitle="15-24 ans"
                color="orange"
              />
              <StatCard 
                title="Taux d'emploi" 
                value="69,5 %"
                subtitle="Plus haut depuis 1975"
                color="green"
              />
              <StatCard 
                title="Emplois CDI" 
                value="51,2 %"
                subtitle="Record historique"
                color="blue"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Évolution du taux de chômage
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                En % de la population active
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data.chomage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="trimestre" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" domain={[6, 10]} tick={{ fontSize: 12 }} unit="%" />
                  <YAxis yAxisId="right" orientation="right" domain={[15, 22]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={7.1} stroke="#22c55e" strokeDasharray="5 5" />
                  <Bar yAxisId="left" dataKey="taux" name="Taux global" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="jeunes" name="Jeunes (15-24 ans)" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Part des salariés au SMIC
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.smic.part_salaries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 20]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: 8 }} />
                  <Bar dataKey="part" name="Part au SMIC" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-xl p-4">
              <h3 className="font-bold text-orange-800">⚠️ Point de vigilance</h3>
              <p className="text-sm text-orange-700 mt-2">
                Le chômage des <strong>jeunes (15-24 ans)</strong> reste élevé à près de 19%. 
                Le recul de l'apprentissage et le ralentissement des créations d'emploi pèsent sur cette tranche d'âge.
              </p>
            </div>
          </div>
        )}

        {/* Contenu - Inflation */}
        {activeTab === 'inflation' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard 
                title="Inflation globale 2024" 
                value="2,0 %"
                subtitle="Après 4,9% en 2023"
                color="green"
              />
              <StatCard 
                title="Alimentation 2024" 
                value="+1,4 %"
                subtitle="Après +11,8% en 2023"
                color="green"
              />
              <StatCard 
                title="Services 2024" 
                value="+2,7 %"
                subtitle="Reste dynamique"
                color="orange"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Inflation par poste de dépense
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.inflation_detail} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" domain={[-5, 25]} unit="%" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="poste" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="val2022" name="2022" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="val2023" name="2023" fill="#f97316" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="val2024" name="2024" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Chronologie de la vague inflationniste
              </h2>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="space-y-6 ml-10">
                  <div className="relative">
                    <div className="absolute -left-8 w-4 h-4 rounded-full bg-yellow-500"></div>
                    <p className="text-sm font-bold text-gray-800">Fin 2021 — Début de la hausse</p>
                    <p className="text-xs text-gray-500">Reprise post-Covid, tensions sur les chaînes d'approvisionnement</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-8 w-4 h-4 rounded-full bg-red-500"></div>
                    <p className="text-sm font-bold text-gray-800">2022 — Pic de l'énergie (+23%)</p>
                    <p className="text-xs text-gray-500">Guerre en Ukraine, flambée du gaz et de l'électricité</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-8 w-4 h-4 rounded-full bg-orange-500"></div>
                    <p className="text-sm font-bold text-gray-800">2023 — Pic alimentaire (+11,8%)</p>
                    <p className="text-xs text-gray-500">Transmission des coûts énergétiques à l'agroalimentaire</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-8 w-4 h-4 rounded-full bg-green-500"></div>
                    <p className="text-sm font-bold text-gray-800">2024-2025 — Retour à la normale</p>
                    <p className="text-xs text-gray-500">Inflation sous 2%, baisse des prix de l'énergie</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border-l-4 border-green-600 rounded-r-xl p-4">
              <h3 className="font-bold text-green-800">✅ Bonne nouvelle</h3>
              <p className="text-sm text-green-700 mt-2">
                L'inflation est revenue à <strong>0,9%</strong> en 2025. Les hausses de salaires négociées 
                dépassent désormais l'inflation, permettant des <strong>gains de pouvoir d'achat réels</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Sources : INSEE, Banque de France, DARES, Urssaf</p>
          <p className="mt-1">Données mises à jour automatiquement chaque semaine</p>
        </div>
      </div>
    </div>
  );
};

export default ConjonctureCFTC;
