import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, Cell, ReferenceLine, PieChart, Pie } from 'recharts';
import SparklineBars from './components/SparklineBars';
import Card from './components/Card';
import FavoriButton from './components/FavoriButton';
import BubbleKpi from './components/BubbleKpi';
import BubbleNavTabs from './components/BubbleNavTabs';
import BubbleStatBlock from './components/BubbleStatBlock';
import BubbleProgressBar from './components/BubbleProgressBar';
import { useChartProps } from './hooks/useChartProps';
import useFavoris from './hooks/useFavoris';
import { buildCatalogue } from './utils/catalogue';
import HeaderKpiConfigModal from './components/HeaderKpiConfigModal';
import FavorisTab from './tabs/FavorisTab';
import BubbleSubTabs from './components/BubbleSubTabs';
import BubbleNote from './components/BubbleNote';
import useHeaderKpis from './hooks/useHeaderKpis';
import ConjonctureTab from './tabs/ConjonctureTab';
import ComparaisonUETab from './tabs/ComparaisonUETab';
import SimulateurNAOTab from './tabs/SimulateurNAOTab';
import PouvoirAchatTab from './tabs/PouvoirAchatTab';
import SalairesTab from './tabs/SalairesTab';
import EmploiTab from './tabs/EmploiTab';
import ConditionsVieTab from './tabs/ConditionsVieTab';
import InflationTab from './tabs/InflationTab';
import ConventionsTab from './tabs/ConventionsTab';
import TimelineEvolutions from './components/TimelineEvolutions';
import MemoireCrises from './components/MemoireCrises';
import EvolutionsTab from './tabs/EvolutionsTab';
import TravailTab from './tabs/TravailTab';
import PrevisionsTab from './tabs/PrevisionsTab';

// ============================================================================
// TABLEAU DE BORD ÉCONOMIQUE CFTC - STYLE "BULLE" MODERNISÉ
// ============================================================================

// CSS pour masquer la scrollbar tout en gardant le scroll
const scrollbarHideStyle = `
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  @keyframes pulseAlerte {
    0%, 100% { border-left-color: #ef4444; opacity: 1; }
    50%       { border-left-color: #fca5a5; opacity: 0.75; }
  }
  .carte-alerte { animation: pulseAlerte 1.2s ease-in-out infinite; }
  .group-hover-opacity:hover .show-on-hover { opacity: 1 !important; }
`;

// Palette de couleurs modernisée (style bulle)
const C = { 
  primary: '#3b82f6',   // Bleu plus vif
  secondary: '#ef4444', // Rouge vif
  tertiary: '#22c55e',  // Vert vif
  quaternary: '#f59e0b', // Orange/Ambre
  pink: '#ec4899', 
  purple: '#8b5cf6', 
  cyan: '#06b6d4', 
  gray: '#6b7280' 
};

// ==================== COMPOSANT PRINCIPAL APP ====================
export default function App() {
  const [data, setData] = useState(null);
  const [modalTab, setModalTab] = useState('miseajour'); // 'nouveautes' ou 'miseajour'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('favoris');
  const [subTab, setSubTab] = useState('chomage');
  const [subTabVie, setSubTabVie] = useState('loyers');
  const [subTabConj, setSubTabConj] = useState('pib');
  const [showAlertes, setShowAlertes] = useState(false);
  const [showPresse, setShowPresse] = useState(false);
  const [alertesNonLues, setAlertesNonLues] = useState([]);
  const { favoris, toggleFavori, isFavori, setSeuil, getSeuil, setNote, getNote, isEnAlerte } = useFavoris();
  const { headerKpis, toggleHeaderKpi } = useHeaderKpis();
  const [showHeaderConfig, setShowHeaderConfig] = useState(false);
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
    let premierChargement = true;
    const loadData = () => {
      fetch('./data.json')
        .then(r => { if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`); return r.json(); })
        .then(d => { 
          setData(d); 
          setLoading(false);
          if (d.alertes && d.alertes.length > 0) {
            const alertesLues = JSON.parse(localStorage.getItem('alertesLues') || '[]');
            const nonLues = d.alertes.filter(a => !alertesLues.includes(a.id));
            setAlertesNonLues(nonLues);
            // N'ouvrir le pop-up automatiquement qu'au premier chargement,
            // pas lors des refreshs automatiques toutes les 5 minutes
            if (nonLues.length > 0 && premierChargement) {
              setShowAlertes(true);
            }
          }
          premierChargement = false;
        })
        .catch(e => { setError(e.message); setLoading(false); });
    };
    loadData();
    // Rafraîchissement automatique toutes les 5 minutes
    const refreshInterval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Écran de chargement style bulle
  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`text-center p-8 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#0d4093] mx-auto mb-4"></div>
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Chargement des données...</h2>
      </div>
    </div>
  );

  // Écran d'erreur style bulle
  if (error || !data) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`text-center p-8 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Erreur de chargement</h2>
        <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error || "Données non disponibles"}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-[#0d4093] text-white rounded-xl hover:bg-[#0a3278] transition font-medium"
        >
          Réessayer
        </button>
      </div>
    </div>
  );

  const d = data;

  const marquerAlertesLues = () => {
    if (d.alertes) {
      const toutesLesIds = d.alertes.map(a => a.id);
      localStorage.setItem('alertesLues', JSON.stringify(toutesLesIds));
      setAlertesNonLues([]);
    }
    setShowAlertes(false);
  };

  const allerVersOnglet = (onglet) => {
    setTab(onglet);
    setShowAlertes(false);
  };

  const tabs = [
    ['favoris','⭐ Mon tableau de bord'],
    ['conjoncture','📈 Conjoncture'],
    ['previsions','🔮 Prévisions'],
    ['evolutions','📉 Évolutions'],
    ['pouvoir_achat','💰 Pouvoir d\'achat'],
    ['salaires','💵 Salaires'],
    ['emploi','👥 Emploi'],
    ['travail','⚙️ Travail'],
    ['territoires','🗺️ Territoires'],
    ['conditions_vie','🏠 Conditions'],
    ['inflation','📊 Inflation'],
    ['conventions','📋 Conventions'],
    ['comparaison_ue','🇪🇺 Europe'],
    ['simulateur','🧮 Simulateur'],
    ['aide','📖 Aide']
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <style>{scrollbarHideStyle}</style>
      
      {/* ==================== MODAL ALERTES AVEC ONGLETS ==================== */}
      {showAlertes && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAlertes(false)}>
          <div 
            className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-5 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                    🔔
                  </div>
                  <div>
                    <h2 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Quoi de neuf ?</h2>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {modalTab === 'nouveautes' 
                        ? `${alertesNonLues.length} notification${alertesNonLues.length > 1 ? 's' : ''}` 
                        : 'Historique des versions'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAlertes(false)}
                  className={`p-2 rounded-xl transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Onglets */}
            <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setModalTab('nouveautes')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  modalTab === 'nouveautes'
                    ? darkMode ? 'text-blue-400' : 'text-[#0d4093]'
                    : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  📢 Nouveautés
                  {alertesNonLues.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {alertesNonLues.length}
                    </span>
                  )}
                </span>
                {modalTab === 'nouveautes' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d4093]"></div>
                )}
              </button>
              <button
                onClick={() => setModalTab('miseajour')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  modalTab === 'miseajour'
                    ? darkMode ? 'text-blue-400' : 'text-[#0d4093]'
                    : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  🔄 Mises à jour
                </span>
                {modalTab === 'miseajour' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d4093]"></div>
                )}
              </button>
            </div>
            
            {/* Contenu - Onglet Nouveautés */}
            {modalTab === 'nouveautes' && (
              <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                {alertesNonLues.length > 0 ? (
                  alertesNonLues.map(alerte => {
                    const typeConfig = {
                      success: {
                        bg: darkMode ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200',
                        icon: '✅'
                      },
                      warning: {
                        bg: darkMode ? 'bg-orange-900/30 border-orange-800' : 'bg-orange-50 border-orange-200',
                        icon: '⚠️'
                      },
                      danger: {
                        bg: darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200',
                        icon: '🔴'
                      },
                      info: {
                        bg: darkMode ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200',
                        icon: 'ℹ️'
                      }
                    };
                    const config = typeConfig[alerte.type] || typeConfig.info;
                    
                    return (
                      <div 
                        key={alerte.id}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${config.bg}`}
                        onClick={() => allerVersOnglet(alerte.onglet)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {config.icon} {alerte.titre}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                            {alerte.date}
                          </span>
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {alerte.message}
                        </p>
                        <p className="text-xs text-[#0d4093] mt-2">👆 Cliquer pour voir les détails</p>
                      </div>
                    );
                  })
                ) : (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="font-medium">Vous êtes à jour !</p>
                    <p className="text-sm mt-1">Aucune nouvelle notification</p>
                  </div>
                )}
              </div>
            )}

            {/* Contenu - Onglet Mises à jour (Changelog) */}
            {modalTab === 'miseajour' && (
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {d.changelog && d.changelog.length > 0 ? (
                  <div className="space-y-4">
                    {d.changelog.map((release, idx) => (
                      <div key={idx} className={`${idx !== 0 ? 'pt-4 border-t ' + (darkMode ? 'border-gray-700' : 'border-gray-200') : ''}`}>
                        {/* En-tête version */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${
                            idx === 0 
                              ? 'bg-[#0d4093] text-white' 
                              : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            v{release.version}
                          </span>
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(release.date).toLocaleDateString('fr-FR', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          {idx === 0 && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] rounded-full font-medium">
                              ACTUELLE
                            </span>
                          )}
                        </div>
                        
                        {/* Liste des modifications */}
                        <div className="space-y-2 pl-2">
                          {release.modifications.map((mod, modIdx) => {
                            const typeEmoji = {
                              feature: '✨',
                              fix: '🔧',
                              data: '📊',
                              breaking: '⚠️'
                            };
                            
                            return (
                              <div key={modIdx} className="flex items-start gap-2">
                                <span>{typeEmoji[mod.type] || '•'}</span>
                                <div>
                                  <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    {mod.titre}
                                  </span>
                                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {' — '}{mod.description}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="text-4xl mb-2">📝</div>
                    <p>Aucun historique disponible</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Footer */}
            <div className={`px-4 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              {modalTab === 'nouveautes' && alertesNonLues.length > 0 ? (
                <button 
                  onClick={marquerAlertesLues}
                  className="w-full py-3 bg-[#0d4093] hover:bg-[#0a3278] text-white rounded-xl font-medium transition"
                >
                  ✓ Tout marquer comme lu
                </button>
              ) : (
                <button 
                  onClick={() => setShowAlertes(false)}
                  className={`w-full py-3 rounded-xl font-medium transition ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== PANNEAU LATÉRAL REVUE DE PRESSE ==================== */}
      {showPresse && (
        <>
          {/* Fond semi-transparent cliquable */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowPresse(false)}
          />
          {/* Panneau glissant depuis la droite */}
          <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 flex flex-col shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
            style={{ animation: 'slideInRight 0.25s ease-out' }}>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

            {/* Header panneau */}
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div>
                <h2 className={`font-black text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>📰 Revue de presse</h2>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {d?.revue_presse?.derniere_maj ? `Màj ${d.revue_presse.derniere_maj}` : 'Relancez fetch_data.py'}
                </p>
              </div>
              <button onClick={() => setShowPresse(false)}
                className={`p-2 rounded-xl text-lg leading-none ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                ✕
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {!d?.revue_presse ? (
                <div className={`rounded-2xl p-8 text-center ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                  <div className="text-4xl mb-3">📡</div>
                  <p className="text-sm font-medium mb-1">Données non disponibles</p>
                  <p className="text-xs">Relancez <code className={`px-1 py-0.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>fetch_data.py</code> pour récupérer les flux RSS.</p>
                </div>
              ) : (
                <PanneauPresseContenu rp={d.revue_presse} darkMode={darkMode} />
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== HEADER STYLE BULLE ==================== */}
      <header className={`px-4 py-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className={`flex justify-between items-center p-4 rounded-2xl shadow-lg ${
            darkMode 
              ? 'bg-gradient-to-r from-blue-900/80 to-blue-800/80' 
              : 'bg-gradient-to-r from-[#0d4093] to-[#0a3278]'
          }`}>
            <div className="flex items-center gap-3">
              <img
                src="data:image/png;base64,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"
                alt="Logo CFTC"
                className="h-10 sm:h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white">
                  Tableau de Bord Économique CFTC
                </h1>
                <p className={`text-xs sm:text-sm ${darkMode ? 'text-blue-300' : 'text-blue-100'}`}>
                  Màj : {d.last_updated} • <a href={`mailto:${d.contact}`} className="underline hover:text-white">{d.contact}</a>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <SearchBar d={d} darkMode={darkMode} onNavigate={(newTab) => setTab(newTab)} />
              <button 
                onClick={() => setShowAlertes(true)}
                className={`relative p-2.5 sm:p-3 rounded-xl transition-all duration-200 ${
                  darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                🔔
                {alertesNonLues.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
                    {alertesNonLues.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowPresse(true)}
                className={`relative p-2.5 sm:p-3 rounded-xl transition-all duration-200 ${
                  darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30'
                }`}
                title="Revue de presse"
              >
                📰
                {d?.revue_presse?.a_la_une?.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {d.revue_presse.a_la_une.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2.5 sm:p-3 rounded-xl transition-all duration-200 ${
                  darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ==================== CONTENU PRINCIPAL ==================== */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        
        {/* ==================== KPIs STYLE BULLE PERSONNALISABLES ==================== */}
        {showHeaderConfig && (
          <HeaderKpiConfigModal
            d={d} darkMode={darkMode}
            headerKpis={headerKpis}
            toggleHeaderKpi={toggleHeaderKpi}
            onClose={() => setShowHeaderConfig(false)}
          />
        )}
        <div className="mb-4 sm:mb-6">
          <div className={`grid gap-2 sm:gap-3`} style={{ gridTemplateColumns: `repeat(${headerKpis.length}, minmax(0, 1fr))` }}>
            {(() => {
              const catalogue = buildCatalogue(d);
              return headerKpis.map(id => {
                const ind = catalogue.find(i => i.id === id);
                if (!ind) return null;
                return (
                  <BubbleKpi
                    key={id}
                    label={ind.label}
                    value={ind.getValue(d)}
                    status={ind.getStatus(d)}
                    darkMode={darkMode}
                    tooltip={ind.tooltip}
                    sparklineData={ind.getSparkline ? ind.getSparkline(d) : undefined}
                    invertTrend={!!ind.invertTrend}
                  />
                );
              });
            })()}
          </div>
          {/* Bouton config discret */}
          <div className="flex justify-end mt-1.5">
            <button
              onClick={() => setShowHeaderConfig(true)}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg transition-all ${
                darkMode ? 'text-gray-600 hover:text-gray-400 hover:bg-gray-800' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
              }`}
            >
              ⚡ Personnaliser ces indicateurs
            </button>
          </div>
        </div>

        {/* ==================== NAVIGATION STYLE BULLE ==================== */}
        <BubbleNavTabs 
          tabs={tabs}
          activeTab={tab}
          setActiveTab={setTab}
          darkMode={darkMode}
        />

        {/* ==================== CONTENU DES ONGLETS ==================== */}
        <div className="mt-4 sm:mt-6">
          {(() => {
            const fp = { toggleFavori, isFavori };
            return <>
              {tab === 'favoris' && <FavorisTab d={d} darkMode={darkMode} favoris={favoris} toggleFavori={toggleFavori} isFavori={isFavori} setSeuil={setSeuil} getSeuil={getSeuil} setNote={setNote} getNote={getNote} isEnAlerte={isEnAlerte} />}
              {tab === 'conjoncture' && <ConjonctureTab d={d} subTab={subTabConj} setSubTab={setSubTabConj} darkMode={darkMode} fp={fp} />}
              {tab === 'previsions' && <PrevisionsTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'evolutions' && <EvolutionsTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'comparaison_ue' && <ComparaisonUETab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'simulateur' && <SimulateurNAOTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'pouvoir_achat' && <PouvoirAchatTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'salaires' && <SalairesTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'emploi' && <EmploiTab d={d} subTab={subTab} setSubTab={setSubTab} darkMode={darkMode} fp={fp} />}
              {tab === 'travail' && <TravailTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'territoires' && <TerritoiresTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'conditions_vie' && <ConditionsVieTab d={d} subTab={subTabVie} setSubTab={setSubTabVie} darkMode={darkMode} fp={fp} />}
              {tab === 'inflation' && <InflationTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'conventions' && <ConventionsTab d={d} darkMode={darkMode} fp={fp} />}
              {tab === 'aide' && <AideTab darkMode={darkMode} />}
            </>;
          })()}
        </div>

        {/* ==================== FOOTER ==================== */}
        <footer className={`mt-8 text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <p>Tableau de bord développé pour la CFTC • Données publiques • Open source</p>
          <p className="mt-1">💡 Suggestion ? Bug ? <a href={`mailto:${d.contact}`} className="underline">{d.contact}</a></p>
        </footer>
      </main>
    </div>
  );
}

// ==================== ONGLET TERRITOIRES ====================
// ==================== NOUVEAU COMPOSANT TERRITOIRES ====================
// Remplacer le composant TerritoiresTab existant par celui-ci

function TerritoiresTab({d, darkMode}) {
  const [subMapTab, setSubMapTab] = useState('carte');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [metric, setMetric] = useState('chomage');
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [mapPaths, setMapPaths] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const reg = d.donnees_regionales || {};
  const regions = reg.regions || [];
  const france = reg.france_metro || {};

  // Mapping des codes INSEE vers nos codes
  const codeMapping = {
    '11': 'IDF', '24': 'CVL', '27': 'BFC', '28': 'NOR', '32': 'HDF',
    '44': 'GES', '52': 'PDL', '53': 'BRE', '75': 'NAQ', '76': 'OCC',
    '84': 'ARA', '93': 'PAC', '94': 'COR'
  };

  // Charger les données GeoJSON au montage
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        // Charger depuis le CDN jsdelivr (miroir de GitHub)
        const response = await fetch('https://cdn.jsdelivr.net/gh/gregoiredavid/france-geojson@master/regions-version-simplifiee.geojson');
        const geojson = await response.json();
        
        // Projection simple pour convertir lat/lon en coordonnées SVG
        const width = 300;
        const height = 340;
        const centerLon = 2.5;
        const centerLat = 46.5;
        const scale = 2400;
        
        const project = (lon, lat) => {
          const x = (lon - centerLon) * Math.cos(centerLat * Math.PI / 180) * scale / 100 + width / 2;
          const y = -(lat - centerLat) * scale / 100 + height / 2 - 20;
          return [x, y];
        };
        
        // Convertir les coordonnées en path SVG
        const coordsToPath = (coords) => {
          if (!coords || coords.length === 0) return '';
          
          // Gérer les MultiPolygon et Polygon
          const rings = coords[0][0] && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0]) 
            ? coords.flat() // MultiPolygon
            : coords; // Polygon
          
          return rings.map(ring => {
            if (!Array.isArray(ring)) return '';
            return ring.map((coord, i) => {
              if (!Array.isArray(coord) || coord.length < 2) return '';
              const [x, y] = project(coord[0], coord[1]);
              return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            }).join(' ') + ' Z';
          }).join(' ');
        };
        
        // Calculer le centroïde
        const getCentroid = (coords) => {
          const rings = coords[0][0] && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])
            ? coords[0] // Premier polygone du MultiPolygon
            : coords;
          
          const ring = rings[0];
          if (!ring) return { x: 150, y: 170 };
          
          let sumX = 0, sumY = 0, count = 0;
          ring.forEach(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
              const [x, y] = project(coord[0], coord[1]);
              sumX += x;
              sumY += y;
              count++;
            }
          });
          
          return count > 0 ? { x: sumX / count, y: sumY / count } : { x: 150, y: 170 };
        };
        
        // Générer les paths pour chaque région
        const paths = {};
        geojson.features.forEach(feature => {
          const inseeCode = feature.properties.code;
          const ourCode = codeMapping[inseeCode];
          if (ourCode && feature.geometry && feature.geometry.coordinates) {
            paths[ourCode] = {
              path: coordsToPath(feature.geometry.coordinates),
              centroid: getCentroid(feature.geometry.coordinates),
              nom: feature.properties.nom
            };
          }
        });
        
        setMapPaths(paths);
        setLoading(false);
      } catch (error) {
        console.error('Erreur chargement GeoJSON:', error);
        setLoading(false);
      }
    };
    
    loadGeoJSON();
  }, []);
  
  // Couleurs pour les métriques
  const getColor = (region, metricType, isDark) => {
    const val = metricType === 'chomage' ? region.chomage :
                metricType === 'salaire' ? region.salaire_median :
                region.tensions;
    
    if (metricType === 'chomage') {
      if (val < 6.5) return isDark ? '#22c55e' : '#16a34a';
      if (val < 7.5) return isDark ? '#eab308' : '#ca8a04';
      if (val < 8.5) return isDark ? '#f97316' : '#ea580c';
      return isDark ? '#ef4444' : '#dc2626';
    } else if (metricType === 'salaire') {
      if (val >= 2200) return isDark ? '#22c55e' : '#16a34a';
      if (val >= 2050) return isDark ? '#3b82f6' : '#2563eb';
      if (val >= 1980) return isDark ? '#eab308' : '#ca8a04';
      return isDark ? '#f97316' : '#ea580c';
    } else {
      if (val >= 68) return isDark ? '#f97316' : '#ea580c';
      if (val >= 60) return isDark ? '#eab308' : '#ca8a04';
      return isDark ? '#3b82f6' : '#2563eb';
    }
  };
  
  const getMetricLabel = (type) => {
    switch(type) {
      case 'chomage': return 'Taux de chômage';
      case 'salaire': return 'Salaire médian';
      case 'tensions': return 'Tensions recrutement';
      default: return '';
    }
  };
  
  const getMetricValue = (region, type) => {
    switch(type) {
      case 'chomage': return `${region.chomage}%`;
      case 'salaire': return `${region.salaire_median}€`;
      case 'tensions': return `${region.tensions}%`;
      default: return '';
    }
  };
  
  const sortedByMetric = [...regions].sort((a, b) => {
    const va = metric === 'chomage' ? a.chomage : metric === 'salaire' ? a.salaire_median : a.tensions;
    const vb = metric === 'chomage' ? b.chomage : metric === 'salaire' ? b.salaire_median : b.tensions;
    return va - vb;
  });
  
  const displayRegion = selectedRegion || hoveredRegion;
  const getRegionByCode = (code) => regions.find(r => r.code === code);
  
  return (
    <div className="space-y-4">
      {/* Sous-navigation */}
      <div className="flex gap-2 flex-wrap">
        {[['carte', '🗺️ Carte régionale'], ['chaleur', '🌡️ Inégalités']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubMapTab(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              subMapTab === id
                ? 'bg-cyan-600 text-white shadow-lg'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >{label}</button>
        ))}
      </div>

      {/* Vue Inégalités */}
      {subMapTab === 'chaleur' && <HeatmapRegionSecteur d={d} darkMode={darkMode} />}

      {/* Vue Carte régionale (existante) */}
      {subMapTab === 'carte' && <>

      {/* En-tête avec KPIs France */}
      <div className="grid grid-cols-3 gap-3">
        <div 
          className={`relative overflow-hidden text-center p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
            metric === 'chomage' 
              ? (darkMode ? 'bg-[#0d4093]/40 ring-2 ring-blue-400' : 'bg-blue-100 ring-2 ring-[#0d4093]') 
              : (darkMode ? 'bg-gray-800/60 hover:bg-gray-700/60' : 'bg-white/80 hover:bg-gray-50')
          } backdrop-blur-sm shadow-lg`}
          onClick={() => setMetric('chomage')}
        >
          <div className="absolute inset-0 opacity-10">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-[#0d4093]'}`}></div>
          </div>
          <div className={`relative text-3xl font-black ${
            metric === 'chomage' 
              ? (darkMode ? 'text-blue-300' : 'text-blue-700')
              : (darkMode ? 'text-gray-300' : 'text-gray-700')
          }`}>
            {france.taux_chomage}%
          </div>
          <div className={`relative text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Chômage France
          </div>
          {metric === 'chomage' && (
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${darkMode ? 'bg-blue-400' : 'bg-[#0d4093]'}`}></div>
          )}
        </div>
        
        <div 
          className={`relative overflow-hidden text-center p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
            metric === 'salaire' 
              ? (darkMode ? 'bg-emerald-600/40 ring-2 ring-emerald-400' : 'bg-emerald-100 ring-2 ring-emerald-500') 
              : (darkMode ? 'bg-gray-800/60 hover:bg-gray-700/60' : 'bg-white/80 hover:bg-gray-50')
          } backdrop-blur-sm shadow-lg`}
          onClick={() => setMetric('salaire')}
        >
          <div className="absolute inset-0 opacity-10">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${darkMode ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
          </div>
          <div className={`relative text-3xl font-black ${
            metric === 'salaire' 
              ? (darkMode ? 'text-emerald-300' : 'text-emerald-700')
              : (darkMode ? 'text-gray-300' : 'text-gray-700')
          }`}>
            {france.salaire_median_net}€
          </div>
          <div className={`relative text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Salaire médian
          </div>
          {metric === 'salaire' && (
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${darkMode ? 'bg-emerald-400' : 'bg-emerald-600'}`}></div>
          )}
        </div>
        
        <div 
          className={`relative overflow-hidden text-center p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
            metric === 'tensions' 
              ? (darkMode ? 'bg-amber-600/40 ring-2 ring-amber-400' : 'bg-amber-100 ring-2 ring-amber-500') 
              : (darkMode ? 'bg-gray-800/60 hover:bg-gray-700/60' : 'bg-white/80 hover:bg-gray-50')
          } backdrop-blur-sm shadow-lg`}
          onClick={() => setMetric('tensions')}
        >
          <div className="absolute inset-0 opacity-10">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${darkMode ? 'bg-amber-400' : 'bg-amber-500'}`}></div>
          </div>
          <div className={`relative text-3xl font-black ${
            metric === 'tensions' 
              ? (darkMode ? 'text-amber-300' : 'text-amber-700')
              : (darkMode ? 'text-gray-300' : 'text-gray-700')
          }`}>
            {france.tensions_recrutement_pct}%
          </div>
          <div className={`relative text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Tensions recrutement
          </div>
          {metric === 'tensions' && (
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${darkMode ? 'bg-amber-400' : 'bg-amber-600'}`}></div>
          )}
        </div>
      </div>
      
      {/* Carte interactive + Détails région */}
      <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-800/80' : 'bg-white'} shadow-xl`}>
        <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <span className="text-xl">🗺️</span>
            <span>{getMetricLabel(metric)} par région</span>
          </h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Cliquez sur une région pour voir les détails
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row">
          {/* Carte SVG */}
          <div className="flex-1 p-4">
            <div className="relative w-full max-w-xl mx-auto">
              {loading ? (
                <div className={`flex items-center justify-center h-80 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-[#0d4093] border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p>Chargement de la carte...</p>
                  </div>
                </div>
              ) : (
              <svg 
                viewBox="0 0 300 340" 
                className="w-full h-auto"
                style={{ filter: darkMode ? 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' : 'drop-shadow(0 4px 20px rgba(0,0,0,0.15))' }}
              >
                {/* Définitions pour les effets */}
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
                  </filter>
                </defs>
                
                {/* Fond de la carte */}
                <rect 
                  x="0" y="0" width="300" height="340" 
                  fill={darkMode ? '#1f2937' : '#f8fafc'} 
                  rx="12"
                />
                
                {/* Mer/Océan autour de la France */}
                <rect 
                  x="5" y="5" width="290" height="330" 
                  fill={darkMode ? '#1e3a5f' : '#dbeafe'} 
                  rx="8"
                  opacity="0.3"
                />
                
                {/* Régions */}
                {mapPaths && Object.entries(mapPaths).map(([code, data]) => {
                  const region = getRegionByCode(code);
                  if (!region || !data.path) return null;
                  
                  const isSelected = selectedRegion?.code === code;
                  const isHovered = hoveredRegion?.code === code;
                  const color = getColor(region, metric, darkMode);
                  
                  return (
                    <g key={code}>
                      <path
                        d={data.path}
                        fill={color}
                        stroke={darkMode ? '#1f2937' : '#ffffff'}
                        strokeWidth={isSelected || isHovered ? 2 : 1}
                        filter={isSelected ? 'url(#glow)' : isHovered ? 'url(#shadow)' : 'none'}
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: (selectedRegion && !isSelected && !isHovered) ? 0.6 : 1
                        }}
                        onClick={() => setSelectedRegion(isSelected ? null : region)}
                        onMouseEnter={() => setHoveredRegion(region)}
                        onMouseLeave={() => setHoveredRegion(null)}
                      />
                      
                      {/* Valeur affichée sur la région */}
                      <text
                        x={data.centroid.x}
                        y={data.centroid.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize={code === 'IDF' || code === 'COR' ? '7' : '8'}
                        fontWeight="bold"
                        style={{ 
                          pointerEvents: 'none',
                          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                        }}
                      >
                        {getMetricValue(region, metric)}
                      </text>
                    </g>
                  );
                })}
                
                {/* Tooltip au survol */}
                {hoveredRegion && !selectedRegion && mapPaths?.[hoveredRegion.code] && (
                  <g>
                    <rect
                      x={(mapPaths[hoveredRegion.code]?.centroid?.x || 0) - 45}
                      y={(mapPaths[hoveredRegion.code]?.centroid?.y || 0) - 26}
                      width="90"
                      height="16"
                      rx="4"
                      fill={darkMode ? '#374151' : '#1f2937'}
                      opacity="0.95"
                    />
                    <text
                      x={mapPaths[hoveredRegion.code]?.centroid?.x || 0}
                      y={(mapPaths[hoveredRegion.code]?.centroid?.y || 0) - 15}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="7"
                      fontWeight="600"
                    >
                      {hoveredRegion.nom}
                    </text>
                  </g>
                )}
                
                {/* Titre de la carte */}
                <text
                  x="150"
                  y="332"
                  textAnchor="middle"
                  fill={darkMode ? '#6b7280' : '#9ca3af'}
                  fontSize="8"
                >
                  France métropolitaine
                </text>
              </svg>
              )}
            </div>
            
            {/* Légende */}
            <div className={`flex flex-wrap justify-center gap-3 mt-4 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {metric === 'chomage' && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#22c55e' : '#16a34a'}}></span> &lt;6.5%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#facc15' : '#ca8a04'}}></span> 6.5-7.5%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#f97316' : '#ea580c'}}></span> 7.5-8.5%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#ef4444' : '#dc2626'}}></span> &gt;8.5%
                  </span>
                </>
              )}
              {metric === 'salaire' && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#22c55e' : '#16a34a'}}></span> ≥2200€
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#3b82f6' : '#2563eb'}}></span> 2050-2200€
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#facc15' : '#ca8a04'}}></span> 1980-2050€
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#f97316' : '#ea580c'}}></span> &lt;1980€
                  </span>
                </>
              )}
              {metric === 'tensions' && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#3b82f6' : '#2563eb'}}></span> &lt;60%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#facc15' : '#ca8a04'}}></span> 60-68%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded" style={{backgroundColor: darkMode ? '#f97316' : '#ea580c'}}></span> &gt;68%
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Panel détails */}
          <div className={`lg:w-80 p-4 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
            {displayRegion ? (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {displayRegion.nom}
                  </h4>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Population: {displayRegion.population}M habitants
                  </p>
                </div>
                
                {/* Métriques détaillées */}
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chômage</span>
                      <span className={`text-xl font-bold ${
                        displayRegion.chomage < 6.5 ? 'text-green-500' :
                        displayRegion.chomage < 7.5 ? 'text-yellow-500' :
                        displayRegion.chomage < 8.5 ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {displayRegion.chomage}%
                      </span>
                    </div>
                    <div className={`mt-2 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          displayRegion.chomage < 6.5 ? 'bg-green-500' :
                          displayRegion.chomage < 7.5 ? 'bg-yellow-500' :
                          displayRegion.chomage < 8.5 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(displayRegion.chomage / 12) * 100}%` }}
                      ></div>
                    </div>
                    <div className={`text-xs mt-1 ${displayRegion.evol_chomage > 0 ? 'text-red-400' : displayRegion.evol_chomage < 0 ? 'text-green-400' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                      {displayRegion.evol_chomage > 0 ? '↗' : displayRegion.evol_chomage < 0 ? '↘' : '→'} {displayRegion.evol_chomage > 0 ? '+' : ''}{displayRegion.evol_chomage} pts vs trim. préc.
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Salaire médian</span>
                      <span className={`text-xl font-bold ${
                        displayRegion.salaire_median >= 2200 ? 'text-green-500' :
                        displayRegion.salaire_median >= 2050 ? 'text-[#0d4093]' :
                        displayRegion.salaire_median >= 1980 ? 'text-yellow-500' : 'text-orange-500'
                      }`}>
                        {displayRegion.salaire_median}€
                      </span>
                    </div>
                    <div className={`mt-2 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          displayRegion.salaire_median >= 2200 ? 'bg-green-500' :
                          displayRegion.salaire_median >= 2050 ? 'bg-[#0d4093]' :
                          displayRegion.salaire_median >= 1980 ? 'bg-yellow-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${((displayRegion.salaire_median - 1800) / 800) * 100}%` }}
                      ></div>
                    </div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {displayRegion.salaire_median > france.salaire_median_net 
                        ? `+${displayRegion.salaire_median - france.salaire_median_net}€ vs France` 
                        : displayRegion.salaire_median < france.salaire_median_net 
                          ? `${displayRegion.salaire_median - france.salaire_median_net}€ vs France`
                          : '= moyenne France'}
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tensions recrutement</span>
                      <span className={`text-xl font-bold ${
                        displayRegion.tensions >= 68 ? 'text-orange-500' :
                        displayRegion.tensions >= 60 ? 'text-yellow-500' : 'text-[#0d4093]'
                      }`}>
                        {displayRegion.tensions}%
                      </span>
                    </div>
                    <div className={`mt-2 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          displayRegion.tensions >= 68 ? 'bg-orange-500' :
                          displayRegion.tensions >= 60 ? 'bg-yellow-500' : 'bg-[#0d4093]'
                        }`}
                        style={{ width: `${displayRegion.tensions}%` }}
                      ></div>
                    </div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {displayRegion.tensions}% des recrutements difficiles
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux d'emploi</span>
                      <span className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        {displayRegion.emploi}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <div className="text-4xl mb-3">👆</div>
                <p className="text-sm">Sélectionnez une région sur la carte pour voir ses détails</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Classement horizontal */}
      <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-800/80' : 'bg-white'} shadow-xl p-4`}>
        <h3 className={`font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          📊 Classement {getMetricLabel(metric)}
        </h3>
        <div className="space-y-2">
          {sortedByMetric.map((region, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedByMetric.length - 1;
            const color = getColor(region, metric, darkMode);
            const val = metric === 'chomage' ? region.chomage : 
                       metric === 'salaire' ? region.salaire_median : region.tensions;
            const maxVal = metric === 'chomage' ? 10 : metric === 'salaire' ? 2600 : 75;
            const minVal = metric === 'chomage' ? 5 : metric === 'salaire' ? 1900 : 50;
            const width = ((val - minVal) / (maxVal - minVal)) * 100;
            
            return (
              <div 
                key={region.code}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${
                  darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                } ${selectedRegion?.code === region.code ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
                onClick={() => setSelectedRegion(selectedRegion?.code === region.code ? null : region)}
              >
                <div className={`w-6 text-center font-bold text-sm ${
                  (metric === 'chomage' && isFirst) || (metric !== 'chomage' && isLast) 
                    ? 'text-green-500' 
                    : (metric === 'chomage' && isLast) || (metric !== 'chomage' && isFirst)
                      ? 'text-red-500'
                      : (darkMode ? 'text-gray-500' : 'text-gray-400')
                }`}>
                  {index + 1}
                </div>
                <div className={`w-32 truncate text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {region.nom}
                </div>
                <div className="flex-1">
                  <div className={`h-6 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div 
                      className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, Math.max(10, width))}%`,
                        backgroundColor: color
                      }}
                    >
                      <span className="text-white text-xs font-bold drop-shadow">
                        {getMetricValue(region, metric)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* DROM-COM section */}
      {reg.dom && reg.dom.length > 0 && (
        <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-gray-800/80' : 'bg-white'} shadow-xl`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50'}`}>
            <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <span className="text-xl">🌴</span>
              <span>Outre-Mer (DROM)</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-normal ${darkMode ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
                {reg.dom.length} territoires
              </span>
            </h3>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Guadeloupe • Martinique • Guyane • La Réunion • Mayotte
            </p>
          </div>

          {/* Bandeau comparatif métropole */}
          <div className={`px-4 py-2 ${darkMode ? 'bg-gray-900/40' : 'bg-gray-50'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className={`font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>🇫🇷 France métro :</span>
              <span className={darkMode ? 'text-blue-300' : 'text-[#0d4093]'}>Chômage : <b>{france.taux_chomage}%</b></span>
              <span className={darkMode ? 'text-green-300' : 'text-green-600'}>Salaire médian : <b>{france.salaire_median_net}€</b></span>
              <span className={darkMode ? 'text-purple-300' : 'text-purple-600'}>Taux emploi : <b>{france.taux_emploi}%</b></span>
            </div>
          </div>

          {/* Cartes DROM */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {reg.dom.map((r, i) => {
              const chomageColor = r.chomage > 20 ? 'text-red-500' : r.chomage > 15 ? 'text-orange-500' : 'text-yellow-500';
              const chomageBarColor = r.chomage > 20 ? 'bg-red-500' : r.chomage > 15 ? 'bg-orange-500' : 'bg-yellow-500';
              const ecartSalaire = r.salaire_median - france.salaire_median_net;
              const ecartEmploi = (r.emploi - france.taux_emploi).toFixed(1);
              
              return (
                <div 
                  key={i} 
                  className={`rounded-2xl overflow-hidden border transition-all hover:scale-[1.02] hover:shadow-lg ${
                    darkMode ? 'bg-gray-900/60 border-gray-700 hover:border-cyan-700' : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100 hover:border-cyan-300'
                  }`}
                >
                  {/* En-tête territoire */}
                  <div className={`px-3 py-2 border-b ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white/60 border-cyan-100'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{r.emoji || '🌴'}</span>
                      <div>
                        <div className={`font-bold text-sm leading-tight ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{r.nom}</div>
                        <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{r.population}M hab.</div>
                      </div>
                    </div>
                  </div>

                  {/* Métriques */}
                  <div className="p-3 space-y-2">
                    {/* Chômage */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chômage</span>
                        <span className={`text-base font-black ${chomageColor}`}>{r.chomage}%</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div className={`h-full rounded-full ${chomageBarColor}`} style={{width: `${Math.min(100,(r.chomage/35)*100)}%`}}></div>
                      </div>
                      <div className={`text-[10px] mt-0.5 ${r.evol_chomage > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {r.evol_chomage > 0 ? '↗' : '↘'} {r.evol_chomage > 0 ? '+' : ''}{r.evol_chomage} pts vs trim. préc. · <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>+{(r.chomage - france.taux_chomage).toFixed(1)} pts vs métropole</span>
                      </div>
                    </div>

                    {/* Salaire médian */}
                    <div className={`flex justify-between items-center p-2 rounded-lg ${darkMode ? 'bg-gray-800/60' : 'bg-white/70'}`}>
                      <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Salaire médian</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${ecartSalaire >= 0 ? 'text-green-500' : 'text-orange-500'}`}>{r.salaire_median}€</span>
                        <div className={`text-[10px] ${ecartSalaire >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                          {ecartSalaire >= 0 ? '+' : ''}{ecartSalaire}€ vs métro
                        </div>
                      </div>
                    </div>

                    {/* Taux d'emploi */}
                    <div className={`flex justify-between items-center p-2 rounded-lg ${darkMode ? 'bg-gray-800/60' : 'bg-white/70'}`}>
                      <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux d'emploi</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{r.emploi}%</span>
                        <div className={`text-[10px] ${parseFloat(ecartEmploi) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {parseFloat(ecartEmploi) >= 0 ? '+' : ''}{ecartEmploi} pts vs métro
                        </div>
                      </div>
                    </div>

                    {/* Tensions recrutement */}
                    <div className={`flex justify-between items-center p-2 rounded-lg ${darkMode ? 'bg-gray-800/60' : 'bg-white/70'}`}>
                      <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tensions recruit.</span>
                      <span className={`text-sm font-bold ${r.tensions < 40 ? 'text-[#0d4093]' : r.tensions < 55 ? 'text-yellow-500' : 'text-orange-500'}`}>{r.tensions}%</span>
                    </div>

                    {/* Note contextuelle */}
                    {r.note && (
                      <div className={`text-[10px] italic px-2 py-1.5 rounded-lg ${darkMode ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
                        💡 {r.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Note de bas */}
          <div className={`px-4 pb-3 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            📚 Sources : INSEE – Taux de chômage localisés (T3 2025), Estimations d'emploi localisées 2024
          </div>
        </div>
      )}
      
      <div className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        📚 Sources : INSEE (chômage T3 2025), INSEE (salaires 2024), DARES-BMO (tensions 2025)
      </div>
      </>}
    </div>
  );
}

// ==================== BARRE DE RECHERCHE HEADER ====================
function SearchBar({ d, darkMode, onNavigate }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = React.useRef(null);
  const containerRef = React.useRef(null);

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Index ──────────────────────────────────────────────────────────────────
  const index = React.useMemo(() => {
    if (!d) return [];
    const ic = d.indicateurs_cles || {};
    const items = [];
    const add = (label, valeur, onglet, keywords = [], sparkline = null) =>
      items.push({ label, valeur, onglet, keywords: [label.toLowerCase(), ...keywords], sparkline });

    add('Taux de chômage', `${ic.taux_chomage_actuel}%`, 'emploi', ['chomage','unemployment','bit'], d.sparklines?.chomage);
    add('Chômage des jeunes', `${ic.taux_chomage_jeunes}%`, 'emploi', ['jeunes','youth','15-24'], d.sparklines?.chomage);
    add('Taux emploi seniors', `${ic.taux_emploi_seniors}%`, 'emploi', ['seniors','55-64']);
    add('Inflation annuelle', `${ic.inflation_annuelle}%`, 'inflation', ['inflation','ipc','prix'], d.sparklines?.inflation);
    add('SMIC brut mensuel', `${ic.smic_brut}€`, 'simulateur', ['smic','minimum','smig'], d.sparklines?.smic);
    add('SMIC net mensuel', `${ic.smic_net}€`, 'simulateur', ['smic net','minimum net'], d.sparklines?.smic);
    add('Salaire médian', `${ic.salaire_median}€`, 'salaires', ['median','médian','rémunération']);
    add('Salaire moyen', `${ic.salaire_moyen}€`, 'salaires', ['moyen','rémunération moyenne']);
    add('Écart salarial H/F', `${ic.ecart_hf_eqtp}%`, 'salaires', ['inégalité','femmes','hommes','égalité','hf']);
    add('Difficultés recrutement', `${ic.difficultes_recrutement}%`, 'emploi', ['recrutement','tension','recruter']);
    add('IRL (glissement)', `+${ic.irl_glissement}%`, 'conditions_vie', ['irl','loyer','indice loyer']);
    add('Prix du gazole', `${ic.prix_gazole}€/L`, 'conditions_vie', ['gazole','diesel','carburant']);
    add('Taux effort locataires', `${ic.taux_effort_locataires}%`, 'conditions_vie', ['effort','logement','loyer']);
    add('Croissance PIB', `+${ic.croissance_pib}%`, 'conjoncture', ['pib','croissance','gdp']);
    add('Climat des affaires', `${ic.climat_affaires}`, 'conjoncture', ['climat','confiance','insee']);
    add('Défaillances entreprises', `${(ic.defaillances_12m/1000).toFixed(1)}k`, 'conjoncture', ['défaillances','faillites','liquidation']);

    const pva = d.partage_va || {};
    add('Part salaires dans la VA', `${pva.part_salaires_snf}%`, 'conjoncture', ['valeur ajoutée','va','partage']);
    add('Taux de marge EBE', `${pva.part_ebe_snf}%`, 'conjoncture', ['marge','ebe','profits','bénéfices']);

    (d.salaires_secteur || []).forEach(s =>
      add(`Salaire — ${s.secteur}`, `${s.salaire.toLocaleString('fr-FR')}€`, 'salaires',
        ['salaire', s.secteur.toLowerCase(), 'secteur']));

    (d.comparaison_ue?.smic_europe || []).forEach(p =>
      add(`SMIC ${p.pays}`, `${p.smic.toLocaleString('fr-FR')}€`, 'comparaison_ue',
        ['europe','ue', p.pays.toLowerCase(), 'smic europe']));

    const cc = d.conventions_collectives || {};
    add('Branches non conformes SMIC',
      `${cc.statistiques_branches?.branches_non_conformes}/${cc.statistiques_branches?.total_branches}`,
      'conventions', ['convention','branche','smic','conformité','minima']);
    (cc.branches || []).forEach(b =>
      add(`CCN — ${b.nom}`, b.statut === 'conforme' ? '✅' : '❌', 'conventions',
        ['convention','ccn', b.nom.toLowerCase(), `idcc ${b.idcc}`]));

    const carb = d.carburants || {};
    if (carb.sp95) add('SP95', `${carb.sp95.prix}€/L`, 'conditions_vie', ['sp95','essence','carburant']);
    add('PPV (montant moyen)', `${(d.ppv||{}).montant_moyen}€`, 'salaires', ['ppv','prime macron','partage valeur']);

    return items;
  }, [d]);

  // ── Recherche fuzzy ────────────────────────────────────────────────────────
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return [];
    return index.map(item => {
      const hay = item.keywords.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const lab = item.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let score = 0;
      if (lab.startsWith(q)) score = 100;
      else if (lab.includes(q)) score = 60;
      else if (hay.includes(q)) score = 30;
      else if (q.split(' ').filter(Boolean).every(w => hay.includes(w))) score = 10;
      return { ...item, score };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
  }, [query, index]);

  useEffect(() => { setSelected(0); }, [results]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, results.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)); }
    if (e.key === 'Enter' && results[selected]) { onNavigate(results[selected].onglet); setOpen(false); setQuery(''); }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
  };

  const LABELS = {
    conjoncture:'📈 Conjoncture', previsions:'🔮 Prévisions', evolutions:'📉 Évolutions',
    pouvoir_achat:"💰 Pouvoir d'achat", salaires:'💵 Salaires', emploi:'👥 Emploi',
    travail:'⚙️ Travail', territoires:'🗺️ Territoires', conditions_vie:'🏠 Conditions',
    inflation:'📊 Inflation', conventions:'📋 Conventions', comparaison_ue:'🇪🇺 Europe',
    simulateur:'🧮 Simulateur',
  };

  // Sparkline SVG
  const Spark = ({ data, active }) => {
    if (!data || data.length < 2) return null;
    const vals = data.map(v => typeof v === 'object' ? v.value : v);
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const w = 44, h = 16, p = 1;
    const pts = vals.map((v, i) => {
      const x = p + (i/(vals.length-1))*(w-2*p);
      const y = h - p - ((v-min)/range)*(h-2*p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const color = active ? '#60a5fa' : '#6b7280';
    return (
      <svg width={w} height={h}>
        <polyline fill="none" stroke={color} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" points={pts} />
      </svg>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
        open
          ? darkMode ? 'bg-white/20 ring-2 ring-white/30' : 'bg-white/30 ring-2 ring-white/50'
          : darkMode ? 'bg-white/10 hover:bg-white/15' : 'bg-white/20 hover:bg-white/25'
      }`}>
        <span className="text-white/70 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Rechercher..."
          className="bg-transparent outline-none text-white placeholder-white/50 text-xs w-32 sm:w-44"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }}
            className="text-white/50 hover:text-white text-sm leading-none">✕</button>
        )}
      </div>

      {/* Dropdown résultats */}
      {open && results.length > 0 && (
        <div className={`absolute top-full mt-2 right-0 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden z-50 ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          {results.map((r, i) => (
            <button key={i}
              onClick={() => { onNavigate(r.onglet); setOpen(false); setQuery(''); }}
              onMouseEnter={() => setSelected(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selected
                  ? darkMode ? 'bg-blue-900/60' : 'bg-blue-50'
                  : darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
              } ${i > 0 ? (darkMode ? 'border-t border-gray-800' : 'border-t border-gray-100') : ''}`}>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {r.label}
                  </span>
                  <span className={`text-sm font-black shrink-0 ${
                    i === selected ? (darkMode ? 'text-blue-300' : 'text-[#0d4093]') : (darkMode ? 'text-white' : 'text-gray-900')
                  }`}>
                    {r.valeur}
                  </span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 inline-block ${
                  darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                }`}>
                  {LABELS[r.onglet] || r.onglet}
                </span>
              </div>

              {r.sparkline && <Spark data={r.sparkline} active={i === selected} />}
            </button>
          ))}

          <div className={`px-4 py-1.5 text-[10px] flex justify-between ${
            darkMode ? 'border-t border-gray-800 text-gray-600' : 'border-t border-gray-100 text-gray-400'
          }`}>
            <span>↑↓ naviguer · ↵ ouvrir</span>
            <span>{index.length} indicateurs</span>
          </div>
        </div>
      )}
    </div>
  );
}


// ==================== CONTENU PANNEAU PRESSE ====================
function PanneauPresseContenu({ rp, darkMode }) {
  const [filtre, setFiltre] = useState('tous');
  const [sourceFiltre, setSourceFiltre] = useState('Toutes');

  const sources = ['Toutes', ...(rp.sources_noms || [])];
  const articles = filtre === 'une' ? (rp.a_la_une || []) : (rp.tous || []);
  const articlesFiltres = articles.filter(a =>
    sourceFiltre === 'Toutes' || a.source === sourceFiltre
  );

  return (
    <>
      {/* Filtres */}
      <div className="flex gap-1.5 flex-wrap">
        {[['une','⭐ À la une'],['tous','📋 Tous']].map(([id, label]) => (
          <button key={id} onClick={() => setFiltre(id)}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
              filtre === id
                ? 'bg-[#0d4093] text-white'
                : darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
        <select value={sourceFiltre} onChange={e => setSourceFiltre(e.target.value)}
          className={`ml-auto px-2 py-1 rounded-xl text-xs border ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}>
          {sources.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Articles */}
      {articlesFiltres.length === 0 ? (
        <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Aucun article disponible
        </div>
      ) : articlesFiltres.map((a, i) => (
        <a key={i} href={a.lien} target="_blank" rel="noopener noreferrer"
          className={`flex gap-3 p-3.5 rounded-2xl border transition-all hover:shadow-md group ${
            darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
          <div className="w-1 shrink-0 rounded-full self-stretch" style={{ backgroundColor: a.couleur }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-sm">{a.emoji}</span>
              <span className="text-[11px] font-bold" style={{ color: a.couleur }}>{a.source}</span>
              <span className={`text-[10px] ml-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{a.date_fr}</span>
            </div>
            <p className={`text-xs font-semibold leading-snug mb-1 group-hover:underline ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              {a.titre}
            </p>
            {a.resume && (
              <p className={`text-[11px] leading-relaxed line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {a.resume}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className={`w-1.5 h-1.5 rounded-full ${
                    j < Math.ceil(a.pertinence / 2) ? 'bg-[#0d4093]' : darkMode ? 'bg-gray-600' : 'bg-gray-200'
                  }`} />
                ))}
              </div>
              <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>pertinence NAO</span>
              <span className={`text-[10px] ml-auto ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>Lire →</span>
            </div>
          </div>
        </a>
      ))}

      <p className={`text-[10px] text-center pb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        📡 Flux RSS officiels · {rp.nb_sources} sources · {rp.tous?.length || 0} articles
      </p>
    </>
  );
}

// ==================== HEATMAP RÉGION × SECTEUR ====================
function HeatmapRegionSecteur({ d, darkMode }) {

  const [metrique, setMetrique] = React.useState('precarite');
  const [cellActive, setCellActive] = React.useState(null);
  const [regionFocus, setRegionFocus] = React.useState(null);
  const [secteurFocus, setSecteurFocus] = React.useState(null);

  const regions = d.donnees_regionales?.regions ?? [];
  const SMIC_NET = d.indicateurs_cles?.smic_net ?? 1443;
  const INFLATION_CUM = 15.9;

  const secteursBase = d.salaires_secteur ?? [];
  const emploiSecteurs = d.emploi_secteur?.secteurs ?? [];
  const vaParSecteur = d.partage_va?.par_secteur ?? [];
  const defaillancesParSecteur = d.defaillances?.par_secteur ?? [];

  const matchEmploi = (nom) => {
    if (nom.includes('Industrie'))    return emploiSecteurs.find(e => e.secteur === 'Industrie');
    if (nom.includes('Construction')) return emploiSecteurs.find(e => e.secteur === 'Construction');
    return emploiSecteurs.find(e => e.secteur === 'Tertiaire marchand');
  };
  const matchVA = (nom) => {
    if (nom.includes('Industrie'))    return vaParSecteur.find(v => v.secteur === 'Industrie');
    if (nom.includes('Construction')) return vaParSecteur.find(v => v.secteur === 'Construction');
    if (nom.includes('Info'))         return vaParSecteur.find(v => v.secteur === 'Info-comm');
    if (nom.includes('financier'))    return vaParSecteur.find(v => v.secteur === 'Services march.');
    return vaParSecteur.find(v => v.secteur === 'Commerce');
  };
  const matchDef = (nom) => {
    if (nom.includes('Industrie'))    return defaillancesParSecteur.find(v => v.secteur === 'Industrie');
    if (nom.includes('Construction')) return defaillancesParSecteur.find(v => v.secteur === 'Construction');
    if (nom.includes('Héberg'))       return defaillancesParSecteur.find(v => v.secteur === 'Héberg-resto');
    return defaillancesParSecteur.find(v => v.secteur === 'Services');
  };

  const secteurs = secteursBase.map(s => ({
    nom: s.secteur, salaire: s.salaire, evolSal: s.evolution,
    evolEmploi: matchEmploi(s.secteur)?.evolution_an ?? null,
    partSalVA:  matchVA(s.secteur)?.salaires ?? null,
    ebe:        matchVA(s.secteur)?.ebe ?? null,
    defEvol:    matchDef(s.secteur)?.evolution ?? null,
  }));

  const metriques = [
    {
      id: 'precarite', label: '🔴 Risque précarité',
      desc: 'Combine chômage régional élevé et salaire sectoriel bas — identifie les situations cumulant les difficultés.',
      score: (r, s) => {
        const chomNorm = (r.chomage - 5.8) / (9.2 - 5.8);
        const salNorm  = 1 - (s.salaire - 1979) / (4123 - 1979);
        return chomNorm * 0.55 + salNorm * 0.45;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Faible', '30–55 Modéré', '55–75 Élevé', '> 75 Critique'],
    },
    {
      id: 'pouvoir_achat', label: '💰 Pression pouvoir d\'achat',
      desc: `Salaire sectoriel rapporté à l'inflation cumulée ${INFLATION_CUM}% depuis 2020 et au SMIC. Plus c'est rouge, plus le salarié est sous pression.`,
      score: (r, s) => {
        const proxSmic  = Math.max(0, Math.min(1, 1 - (s.salaire - SMIC_NET) / (4123 - SMIC_NET)));
        const chomFaible = 1 - (r.chomage - 5.8) / (9.2 - 5.8);
        return proxSmic * 0.7 + chomFaible * 0.3;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Confortable', '30–55 Tendu', '55–75 Sous pression', '> 75 Critique'],
    },
    {
      id: 'levier_nego', label: '🎯 Levier de négociation',
      desc: 'Tensions de recrutement × taux de marge EBE — zones où l\'employeur a les moyens d\'augmenter ET en a besoin pour recruter.',
      invertColor: true,
      score: (r, s) => {
        const tensionsNorm = (r.tensions - 52) / (72 - 52);
        const ebeNorm      = s.ebe != null ? (s.ebe - 22) / (38 - 22) : 0.5;
        return tensionsNorm * 0.5 + ebeNorm * 0.5;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Faible levier', '30–55 Modéré', '55–75 Bon levier', '> 75 Fort levier'],
    },
    {
      id: 'fragilite_eco', label: '⚠️ Fragilité économique',
      desc: 'Chômage régional + emploi en recul sectoriel + défaillances en hausse — zones à risque de licenciements.',
      score: (r, s) => {
        const chomNorm   = (r.chomage - 5.8) / (9.2 - 5.8);
        const evolEmploi = s.evolEmploi != null ? Math.max(0, -s.evolEmploi) / 3 : 0.3;
        const defScore   = s.defEvol != null ? Math.min(1, s.defEvol / 15) : 0.3;
        return chomNorm * 0.4 + evolEmploi * 0.35 + defScore * 0.25;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Stable', '30–55 Vigilance', '55–75 Fragile', '> 75 Très fragile'],
    },
  ];

  const metriqueActive = metriques.find(m => m.id === metrique);

  const scoreToColor = (score, invert = false, alpha = 0.88) => {
    const palettes = [
      [[34,197,94],[234,179,8],[249,115,22],[239,68,68]],
      [[239,68,68],[249,115,22],[234,179,8],[34,197,94]],
    ];
    const pal = invert ? palettes[1] : palettes[0];
    const idx = score < 0.35 ? 0 : score < 0.6 ? 1 : score < 0.8 ? 2 : 3;
    const [r, g, b] = pal[idx];
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const scoreToLabel = (score, invert = false) => {
    const eff = invert ? 1 - score : score;
    if (eff < 0.35) return { txt: 'Faible',   emoji: '🟢' };
    if (eff < 0.6)  return { txt: 'Modéré',   emoji: '🟡' };
    if (eff < 0.8)  return { txt: 'Élevé',    emoji: '🟠' };
    return                  { txt: 'Critique', emoji: '🔴' };
  };

  const matrice = regions.map(r => secteurs.map(s => metriqueActive.score(r, s)));
  const moyRegion  = regions.map((_, ri) => matrice[ri].reduce((a, b) => a + b, 0) / secteurs.length);
  const moySecteur = secteurs.map((_, si) => matrice.reduce((sum, row) => sum + row[si], 0) / regions.length);
  const regionsTriees = [...regions].map((r, ri) => ({ ...r, _ri: ri, moy: moyRegion[ri] })).sort((a, b) => b.moy - a.moy);

  const cellInfo = cellActive != null ? (() => {
    const { ri, si } = cellActive;
    const r = regions[ri], s = secteurs[si];
    const score = matrice[ri][si];
    const label = scoreToLabel(score, metriqueActive.invertColor);
    const args = [];
    if (metrique === 'precarite') {
      args.push(`Chômage de ${r.chomage}% dans ${r.nom} — parmi les ${r.chomage > 7.5 ? 'plus élevés' : 'plus faibles'} de France`);
      args.push(`Salaire médian de ${s.salaire.toLocaleString('fr-FR')}€ dans ${s.nom} — seulement +${s.salaire - SMIC_NET}€ au-dessus du SMIC net`);
      if (r.chomage > 7.5 && s.salaire < 2500) args.push(`Situation cumulée : insécurité de l'emploi ET salaires bas → priorité syndicale`);
    } else if (metrique === 'pouvoir_achat') {
      args.push(`Avec ${INFLATION_CUM}% d'inflation cumulée depuis 2020, un salaire de ${s.salaire.toLocaleString('fr-FR')}€ perd réellement en pouvoir d'achat`);
      args.push(`Marge au-dessus du SMIC net : +${s.salaire - SMIC_NET}€ — ${s.salaire - SMIC_NET < 400 ? 'très faible, argument fort pour revalorisation' : 'marge existante mais insuffisante'}`);
    } else if (metrique === 'levier_nego') {
      args.push(`Tensions de recrutement : ${r.tensions}% dans ${r.nom} — l'employeur a besoin de fidéliser`);
      if (s.ebe) args.push(`Taux de marge EBE : ${s.ebe}% de la VA — les marges existent pour augmenter les salaires`);
      args.push(`Argument clé : "Vous ne trouvez pas à recruter à ces salaires, c'est le marché qui parle"`);
    } else if (metrique === 'fragilite_eco') {
      args.push(`Chômage régional : ${r.chomage}% — ${r.chomage > 8 ? 'contexte difficile, vigilance sur les emplois' : 'marché relativement sain'}`);
      if (s.evolEmploi != null) args.push(`Emploi sectoriel : ${s.evolEmploi >= 0 ? '+' : ''}${s.evolEmploi}%/an — ${s.evolEmploi < 0 ? 'recul préoccupant' : 'dynamique positive'}`);
      if (s.defEvol != null) args.push(`Défaillances dans ce secteur : +${s.defEvol}% — ${s.defEvol > 8 ? 'signal d\'alarme' : 'évolution contenue'}`);
    }
    return { r, s, score, label, args };
  })() : null;

  return (
    <div className="space-y-5 mt-2">

      {/* Sélecteur de métrique */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {metriques.map(m => (
          <button key={m.id} onClick={() => { setMetrique(m.id); setCellActive(null); }}
            className={`text-left p-3 rounded-2xl border text-xs transition-all duration-200 ${
              metrique === m.id
                ? 'ring-2 ring-rose-500 ' + (darkMode ? 'bg-rose-900/40 border-rose-700 text-white' : 'bg-rose-50 border-rose-300 text-rose-900')
                : darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}>
            <div className="font-semibold mb-0.5">{m.label}</div>
            <div className={`leading-tight ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} style={{fontSize:'10px'}}>
              {m.desc.slice(0, 62)}…
            </div>
          </button>
        ))}
      </div>

      {/* Description + légende */}
      <div className={`p-3 rounded-xl text-xs ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
        <strong>{metriqueActive.label} :</strong> {metriqueActive.desc}
      </div>
      <div className="flex flex-wrap gap-3 items-center text-xs">
        <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Légende :</span>
        {metriqueActive.legende.map((l, i) => {
          const scores = [0.15, 0.47, 0.68, 0.9];
          return (
            <span key={i} className="flex items-center gap-1 font-medium" style={{color: scoreToColor(scores[i], metriqueActive.invertColor, 1)}}>
              <span className="w-3 h-3 rounded" style={{backgroundColor: scoreToColor(scores[i], metriqueActive.invertColor, 0.85)}}></span>
              {l}
            </span>
          );
        })}
        <span className={`ml-auto italic ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} style={{fontSize:'10px'}}>
          Cliquez sur une cellule pour les arguments de négociation
        </span>
      </div>

      {/* Heatmap */}
      <div className={`rounded-2xl overflow-hidden shadow-xl ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{minWidth:560}}>
            <thead>
              <tr>
                <th className={`sticky left-0 z-20 p-3 text-left border-b border-r text-xs font-semibold ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  Région ↓ / Secteur →
                </th>
                {secteurs.map((s, si) => (
                  <th key={si}
                    onClick={() => setSecteurFocus(secteurFocus === si ? null : si)}
                    className={`p-2 text-center border-b cursor-pointer transition-colors ${
                      secteurFocus === si
                        ? darkMode ? 'bg-indigo-900/50 border-indigo-700' : 'bg-indigo-50 border-indigo-300'
                        : darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className={`text-[10px] font-semibold leading-tight ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {s.nom.length > 12 ? s.nom.slice(0,11)+'…' : s.nom}
                    </div>
                    <div className={`text-[9px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {s.salaire.toLocaleString('fr-FR')}€
                    </div>
                    <div className="mt-1 mx-auto h-1.5 rounded-full overflow-hidden w-10" style={{backgroundColor: darkMode ? '#374151' : '#e5e7eb'}}>
                      <div className="h-full rounded-full" style={{width:`${moySecteur[si]*100}%`, backgroundColor: scoreToColor(moySecteur[si], metriqueActive.invertColor, 1)}}/>
                    </div>
                  </th>
                ))}
                <th className={`p-2 text-center border-b border-l text-[10px] font-semibold ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  Score moy.
                </th>
              </tr>
            </thead>
            <tbody>
              {regionsTriees.map(({ _ri: ri, ...region }, rowIdx) => {
                const isRegFocus = regionFocus === ri;
                const rowBg = darkMode
                  ? isRegFocus ? 'bg-indigo-900/30' : rowIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/40'
                  : isRegFocus ? 'bg-indigo-50' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
                return (
                  <tr key={ri} className={`${rowBg} transition-colors`}>
                    <td
                      onClick={() => setRegionFocus(regionFocus === ri ? null : ri)}
                      className={`sticky left-0 z-10 p-2 border-r cursor-pointer ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${rowBg}`}>
                      <div className={`text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {region.nom.length > 20 ? region.nom.slice(0,19)+'…' : region.nom}
                      </div>
                      <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Chôm. {region.chomage}% · {region.salaire_median?.toLocaleString('fr-FR')}€
                      </div>
                    </td>
                    {secteurs.map((s, si) => {
                      const score = matrice[ri][si];
                      const isActive = cellActive?.ri === ri && cellActive?.si === si;
                      const isFaded  = (regionFocus != null && regionFocus !== ri) || (secteurFocus != null && secteurFocus !== si);
                      return (
                        <td key={si} className="p-1">
                          <div
                            onClick={() => setCellActive(isActive ? null : { ri, si })}
                            className={`flex items-center justify-center rounded-xl cursor-pointer font-bold text-white transition-all duration-150 select-none ${
                              isActive ? 'ring-2 ring-white ring-offset-1 scale-110 z-10 relative shadow-lg' : 'hover:scale-105'
                            } ${isFaded ? 'opacity-25' : ''}`}
                            style={{height:44, backgroundColor: scoreToColor(score, metriqueActive.invertColor), fontSize:11}}>
                            {metriqueActive.format(score)}
                          </div>
                        </td>
                      );
                    })}
                    <td className={`p-1 border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="mx-auto rounded-xl flex items-center justify-center font-bold text-white text-xs"
                        style={{height:44, width:52, backgroundColor: scoreToColor(moyRegion[ri], metriqueActive.invertColor, 0.75)}}>
                        {(moyRegion[ri]*100).toFixed(0)}
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className={`border-t ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'}`}>
                <td className={`sticky left-0 z-10 p-2 text-xs font-semibold ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  Moy. secteur
                </td>
                {secteurs.map((_, si) => (
                  <td key={si} className="p-1">
                    <div className="mx-auto rounded-xl flex items-center justify-center font-bold text-white text-xs"
                      style={{height:32, backgroundColor: scoreToColor(moySecteur[si], metriqueActive.invertColor, 0.65)}}>
                      {(moySecteur[si]*100).toFixed(0)}
                    </div>
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Panneau détail cellule */}
      {cellInfo && (
        <div className={`rounded-2xl p-5 border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} shadow-xl`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className={`font-black text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {cellInfo.r.nom} <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>×</span> {cellInfo.s.nom}
              </h4>
              <p className="text-sm mt-0.5" style={{color: scoreToColor(cellInfo.score, metriqueActive.invertColor, 1)}}>
                {cellInfo.label.emoji} {cellInfo.label.txt} — Score {metriqueActive.format(cellInfo.score)}
              </p>
            </div>
            <button onClick={() => setCellActive(null)}
              className={`p-2 rounded-xl text-lg leading-none ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>✕</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Chômage',        val: `${cellInfo.r.chomage}%`,                              icon: '📉' },
              { label: 'Salaire sect.',  val: `${cellInfo.s.salaire.toLocaleString('fr-FR')}€`,     icon: '💰' },
              { label: 'Tensions recrut.', val: `${cellInfo.r.tensions}%`,                           icon: '🎯' },
              { label: 'Taux marge EBE', val: cellInfo.s.ebe != null ? `${cellInfo.s.ebe}%` : '—', icon: '📊' },
            ].map((kpi, i) => (
              <div key={i} className={`p-3 rounded-xl text-center ${darkMode ? 'bg-gray-700/60' : 'bg-gray-100'}`}>
                <div className="text-lg">{kpi.icon}</div>
                <div className={`text-sm font-bold mt-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{kpi.val}</div>
                <div className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{kpi.label}</div>
              </div>
            ))}
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              💬 Arguments pour la négociation — {cellInfo.r.nom} / {cellInfo.s.nom}
            </p>
            <ul className={`text-xs space-y-2 ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
              {cellInfo.args.map((arg, i) => (
                <li key={i} className="flex gap-2"><span className="shrink-0 opacity-60">▸</span><span>{arg}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Top 5 priorités */}
      <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h4 className={`font-bold text-sm mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          🔴 Top 5 situations à traiter en priorité
        </h4>
        <div className="space-y-2">
          {(() => {
            const all = [];
            regions.forEach((r, ri) => secteurs.forEach((s, si) => { all.push({ r, s, score: matrice[ri][si] }); }));
            return all.sort((a, b) => b.score - a.score).slice(0, 5).map((item, i) => (
              <div key={i} className={`flex items-center justify-between gap-3 p-2.5 rounded-xl text-xs ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{backgroundColor: scoreToColor(item.score, metriqueActive.invertColor)}}>
                    {i+1}
                  </span>
                  <span className={`font-semibold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.r.nom}</span>
                  <span className={`shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>×</span>
                  <span className={`truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.s.nom}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`hidden sm:inline ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chôm. {item.r.chomage}% · {item.s.salaire.toLocaleString('fr-FR')}€
                  </span>
                  <span className="font-bold px-2 py-0.5 rounded-lg text-white text-[11px]"
                    style={{backgroundColor: scoreToColor(item.score, metriqueActive.invertColor)}}>
                    {metriqueActive.format(item.score)}
                  </span>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Guide formateur */}
      <div className={`p-4 rounded-xl text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
        <strong className={darkMode ? 'text-gray-300' : 'text-gray-700'}>🎓 Guide formateur :</strong>
        {' '}Commencez par <em>Risque précarité</em> pour une vue d'ensemble. Utilisez <em>Levier de négociation</em> pour cibler où l'employeur a les moyens d'augmenter. Cliquez sur une région ou un secteur pour filtrer. Cliquez sur une cellule pour les arguments prêts à l'emploi.
      </div>

      <p className={`text-xs text-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        📚 Sources : INSEE (chômage, salaires T3 2025) · DARES-BMO (tensions 2025) · Banque de France (défaillances) · INSEE comptes nationaux (partage VA)
      </p>
    </div>
  );
}

// ==================== ONGLET GLOBE ÉCONOMIQUE ====================
function GlobeTab({ darkMode }) {
  const canvasRef = React.useRef(null);
  const [indicateur, setIndicateur] = React.useState('chomage');
  const [pays, setPays] = React.useState(null);
  const [rotation, setRotation] = React.useState([0, 0]);
  const [geoData, setGeoData] = React.useState(null);
  const isDragging = React.useRef(false);
  const lastPos = React.useRef([0, 0]);
  const rotRef = React.useRef([0, 0]);
  const velRef = React.useRef([0, 0]);
  const rafRef = React.useRef(null);
  const dRef = React.useRef(null);
  const projRef = React.useRef(null);

  const PAYS_DATA = {
    'France':{'iso':'FRA',chomage:7.7,inflation:0.9,pib:1.1,smic:1802,gini:31.5},
    'Germany':{'iso':'DEU',chomage:3.4,inflation:2.2,pib:-0.2,smic:2054,gini:31.7},
    'Spain':{'iso':'ESP',chomage:11.6,inflation:2.8,pib:3.2,smic:1323,gini:33.0},
    'Italy':{'iso':'ITA',chomage:6.2,inflation:1.1,pib:0.7,smic:null,gini:34.8},
    'Netherlands':{'iso':'NLD',chomage:3.7,inflation:2.7,pib:0.9,smic:2070,gini:28.2},
    'Belgium':{'iso':'BEL',chomage:5.5,inflation:3.1,pib:1.4,smic:2070,gini:27.2},
    'Sweden':{'iso':'SWE',chomage:8.5,inflation:1.7,pib:0.5,smic:null,gini:27.6},
    'Poland':{'iso':'POL',chomage:2.9,inflation:4.7,pib:2.9,smic:925,gini:30.2},
    'Portugal':{'iso':'PRT',chomage:6.4,inflation:2.3,pib:2.1,smic:1020,gini:33.5},
    'Greece':{'iso':'GRC',chomage:11.0,inflation:3.0,pib:2.3,smic:910,gini:32.9},
    'Austria':{'iso':'AUT',chomage:5.3,inflation:2.9,pib:-1.0,smic:null,gini:30.8},
    'Switzerland':{'iso':'CHE',chomage:2.6,inflation:1.1,pib:1.3,smic:null,gini:33.5},
    'Norway':{'iso':'NOR',chomage:3.9,inflation:3.1,pib:0.8,smic:null,gini:26.1},
    'Denmark':{'iso':'DNK',chomage:2.6,inflation:2.4,pib:1.5,smic:null,gini:28.3},
    'Finland':{'iso':'FIN',chomage:7.5,inflation:0.5,pib:-1.0,smic:null,gini:27.7},
    'Romania':{'iso':'ROU',chomage:5.6,inflation:5.6,pib:2.0,smic:760,gini:34.8},
    'Hungary':{'iso':'HUN',chomage:4.1,inflation:3.7,pib:0.6,smic:701,gini:28.0},
    'Czechia':{'iso':'CZE',chomage:2.6,inflation:2.0,pib:1.2,smic:870,gini:25.3},
    'United States of America':{'iso':'USA',chomage:4.1,inflation:2.9,pib:2.8,smic:1160,gini:41.5},
    'Canada':{'iso':'CAN',chomage:6.8,inflation:1.8,pib:1.3,smic:1580,gini:33.3},
    'Brazil':{'iso':'BRA',chomage:6.2,inflation:4.8,pib:3.1,smic:325,gini:52.0},
    'Mexico':{'iso':'MEX',chomage:2.8,inflation:4.2,pib:1.5,smic:270,gini:45.4},
    'Argentina':{'iso':'ARG',chomage:7.0,inflation:118.0,pib:-1.7,smic:320,gini:42.0},
    'Chile':{'iso':'CHL',chomage:8.6,inflation:4.5,pib:2.3,smic:540,gini:44.9},
    'Colombia':{'iso':'COL',chomage:9.5,inflation:5.2,pib:1.7,smic:310,gini:54.8},
    'China':{'iso':'CHN',chomage:5.0,inflation:0.3,pib:5.0,smic:360,gini:38.2},
    'Japan':{'iso':'JPN',chomage:2.5,inflation:2.8,pib:0.1,smic:1020,gini:32.9},
    'South Korea':{'iso':'KOR',chomage:3.0,inflation:2.3,pib:2.1,smic:1480,gini:31.4},
    'India':{'iso':'IND',chomage:7.8,inflation:4.9,pib:6.8,smic:120,gini:35.7},
    'Indonesia':{'iso':'IDN',chomage:4.8,inflation:2.8,pib:5.1,smic:230,gini:38.2},
    'Turkey':{'iso':'TUR',chomage:8.5,inflation:47.0,pib:3.2,smic:630,gini:41.9},
    'Vietnam':{'iso':'VNM',chomage:2.1,inflation:3.6,pib:7.1,smic:200,gini:36.1},
    'Thailand':{'iso':'THA',chomage:1.1,inflation:0.4,pib:2.7,smic:310,gini:36.4},
    'South Africa':{'iso':'ZAF',chomage:33.5,inflation:4.4,pib:0.8,smic:310,gini:63.0},
    'Nigeria':{'iso':'NGA',chomage:5.0,inflation:28.0,pib:3.2,smic:55,gini:35.1},
    'Morocco':{'iso':'MAR',chomage:13.0,inflation:0.9,pib:3.6,smic:310,gini:39.5},
    'Egypt':{'iso':'EGY',chomage:6.7,inflation:26.0,pib:4.2,smic:115,gini:31.5},
    'Australia':{'iso':'AUS',chomage:4.0,inflation:2.4,pib:1.5,smic:2070,gini:34.3},
    'New Zealand':{'iso':'NZL',chomage:4.7,inflation:2.2,pib:0.5,smic:1790,gini:33.9},
    'Russia':{'iso':'RUS',chomage:2.4,inflation:8.5,pib:3.6,smic:220,gini:36.0},
    'Ukraine':{'iso':'UKR',chomage:18.0,inflation:12.0,pib:4.5,smic:210,gini:26.6},
    'Saudi Arabia':{'iso':'SAU',chomage:7.7,inflation:1.5,pib:0.8,smic:null,gini:null},
  };

  const INDICATEURS = [
    {id:'chomage',  label:'Taux de chômage (%)',    unite:'%',  lowGood:true,  pal:['#22c55e','#86efac','#fde68a','#f97316','#dc2626']},
    {id:'inflation',label:'Inflation (%)',           unite:'%',  lowGood:true,  pal:['#22c55e','#86efac','#fde68a','#f97316','#dc2626']},
    {id:'pib',      label:'Croissance PIB (%)',      unite:'%',  lowGood:false, pal:['#dc2626','#f97316','#fde68a','#86efac','#22c55e']},
    {id:'smic',     label:'Salaire minimum (€)',     unite:'€',  lowGood:false, pal:['#dc2626','#f97316','#fde68a','#86efac','#22c55e']},
    {id:'gini',     label:'Inégalités (Gini)',       unite:'',   lowGood:true,  pal:['#22c55e','#86efac','#fde68a','#f97316','#dc2626']},
  ];
  const indDef = INDICATEURS.find(i => i.id === indicateur);

  const getColor = React.useCallback((val, indId) => {
    if (val === null || val === undefined) return darkMode ? '#374151' : '#d1d5db';
    const def = INDICATEURS.find(i => i.id === indId);
    const vals = Object.values(PAYS_DATA).map(p => p[indId]).filter(v => v != null);
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const t = Math.max(0, Math.min(1, (val - min) / range));
    const p = def.pal;
    const idx = t * (p.length - 1);
    const i0 = Math.floor(idx), i1 = Math.min(i0+1, p.length-1);
    const frac = idx - i0;
    const h = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
    const c0 = h(p[i0]), c1 = h(p[i1]);
    const r = Math.round(c0[0]+(c1[0]-c0[0])*frac);
    const g = Math.round(c0[1]+(c1[1]-c0[1])*frac);
    const b = Math.round(c0[2]+(c1[2]-c0[2])*frac);
    return `rgb(${r},${g},${b})`;
  }, [indicateur, darkMode]);

  const [loadError, setLoadError] = React.useState(null);

  // Charger D3 + topojson + GeoJSON
  useEffect(() => {
    const loadAll = async () => {
      // 1. Charger D3
      if (!window.d3) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
          s.onload = res;
          s.onerror = () => rej(new Error('D3 non chargé'));
          document.head.appendChild(s);
        });
      }

      // 2. Charger topojson-client (nécessaire pour d3.feature → topo.feature)
      if (!window.topojson) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js';
          s.onload = res;
          s.onerror = () => rej(new Error('topojson non chargé'));
          document.head.appendChild(s);
        });
      }

      // 3. Charger le GeoJSON — essayer plusieurs URLs
      const URLS = [
        'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
        'https://unpkg.com/world-atlas@2/countries-110m.json',
        'https://raw.githubusercontent.com/topojson/world-atlas/master/countries-110m.json',
      ];

      let topo = null;
      for (const url of URLS) {
        try {
          const res = await fetch(url);
          if (res.ok) { topo = await res.json(); break; }
        } catch { continue; }
      }

      if (!topo) throw new Error('Impossible de charger les données cartographiques');

      // Convertir TopoJSON → GeoJSON avec topojson-client
      const geo = window.topojson.feature(topo, topo.objects.countries);

      // Injecter les noms via la map ISO numérique → nom
      // (world-atlas utilise des IDs ISO 3166-1 numérique)
      const ID_TO_NAME = {
        '004':'Afghanistan','008':'Albania','012':'Algeria','024':'Angola','032':'Argentina',
        '036':'Australia','040':'Austria','050':'Bangladesh','056':'Belgium','064':'Bhutan',
        '068':'Bolivia','076':'Brazil','100':'Bulgaria','116':'Cambodia','120':'Cameroon',
        '124':'Canada','144':'Sri Lanka','152':'Chile','156':'China','170':'Colombia',
        '180':'Dem. Rep. Congo','188':'Costa Rica','191':'Croatia','192':'Cuba','203':'Czechia',
        '208':'Denmark','218':'Ecuador','818':'Egypt','231':'Ethiopia','246':'Finland',
        '250':'France','276':'Germany','288':'Ghana','300':'Greece','320':'Guatemala',
        '332':'Haiti','340':'Honduras','348':'Hungary','356':'India','360':'Indonesia',
        '364':'Iran','368':'Iraq','372':'Ireland','376':'Israel','380':'Italy',
        '388':'Jamaica','392':'Japan','400':'Jordan','398':'Kazakhstan','404':'Kenya',
        '410':'South Korea','408':'North Korea','414':'Kuwait','418':'Laos','422':'Lebanon',
        '434':'Libya','442':'Luxembourg','484':'Mexico','504':'Morocco','508':'Mozambique',
        '524':'Nepal','528':'Netherlands','554':'New Zealand','566':'Nigeria','578':'Norway',
        '586':'Pakistan','591':'Panama','600':'Paraguay','604':'Peru','608':'Philippines',
        '616':'Poland','620':'Portugal','630':'Puerto Rico','642':'Romania','643':'Russia',
        '682':'Saudi Arabia','686':'Senegal','694':'Sierra Leone','703':'Slovakia','706':'Somalia',
        '710':'South Africa','724':'Spain','729':'Sudan','752':'Sweden','756':'Switzerland',
        '760':'Syria','764':'Thailand','792':'Turkey','800':'Uganda','804':'Ukraine',
        '784':'United Arab Emirates','826':'United Kingdom','840':'United States of America',
        '858':'Uruguay','860':'Uzbekistan','862':'Venezuela','704':'Vietnam','887':'Yemen',
        '894':'Zambia','716':'Zimbabwe',
      };
      geo.features.forEach(f => {
        if (!f.properties) f.properties = {};
        f.properties.name = ID_TO_NAME[String(f.id).padStart(3,'0')] || String(f.id);
      });

      setGeoData(geo);
    };

    loadAll().catch(e => {
      console.error('Globe:', e);
      setLoadError(e.message);
    });
  }, []);

  // Dessiner le globe
  const draw = React.useCallback(() => {
    if (!canvasRef.current || !geoData || !window.d3) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const R = Math.min(W, H) / 2 - 10;
    const d3 = window.d3;
    dRef.current = d3;

    const [rx, ry] = rotRef.current;
    const proj = d3.geoOrthographic()
      .scale(R)
      .translate([W/2, H/2])
      .rotate([rx, ry, 0])
      .clipAngle(90);
    projRef.current = proj;
    const path = d3.geoPath(proj, ctx);

    ctx.clearRect(0, 0, W, H);

    // Océan
    ctx.beginPath();
    ctx.arc(W/2, H/2, R, 0, 2*Math.PI);
    ctx.fillStyle = darkMode ? '#0f172a' : '#1e40af';
    ctx.fill();

    // Halo (atmosphère)
    const grad = ctx.createRadialGradient(W/2, H/2, R*0.92, W/2, H/2, R*1.05);
    grad.addColorStop(0, 'rgba(100,160,255,0.0)');
    grad.addColorStop(1, 'rgba(100,160,255,0.18)');
    ctx.beginPath();
    ctx.arc(W/2, H/2, R*1.05, 0, 2*Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();

    // Pays
    const nameById = {};
    geoData.features.forEach(f => {
      nameById[f.id] = f.properties?.name || f.id;
    });

    // Construire lookup par nom GeoJSON → données
    geoData.features.forEach(f => {
      const nomGeo = f.properties?.name || '';
      const data = PAYS_DATA[nomGeo];
      const val = data ? data[indicateur] : null;
      const color = getColor(val, indicateur);

      ctx.beginPath();
      path(f);
      ctx.fillStyle = color;
      ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.5;
      ctx.fill();
      ctx.stroke();
    });

    // Graticule (lignes de latitude/longitude)
    const graticule = d3.geoGraticule()();
    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Bordure du globe
    ctx.beginPath();
    ctx.arc(W/2, H/2, R, 0, 2*Math.PI);
    ctx.strokeStyle = darkMode ? 'rgba(100,160,255,0.3)' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

  }, [geoData, indicateur, darkMode, getColor]);

  useEffect(() => { draw(); }, [draw]);

  // Resize canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const el = canvasRef.current.parentElement;
    const resize = () => {
      canvasRef.current.width  = el.clientWidth;
      canvasRef.current.height = el.clientHeight;
      draw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  // Animation inertie
  useEffect(() => {
    const animate = () => {
      if (!isDragging.current) {
        velRef.current[0] *= 0.96;
        velRef.current[1] *= 0.96;
        // Rotation automatique douce
        velRef.current[0] += 0.08;
        rotRef.current[0] += velRef.current[0] * 0.1;
        rotRef.current[1] += velRef.current[1] * 0.1;
        draw();
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Drag
  const onMouseDown = e => {
    isDragging.current = true;
    velRef.current = [0, 0];
    lastPos.current = [e.clientX, e.clientY];
  };
  const onMouseMove = e => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current[0];
    const dy = e.clientY - lastPos.current[1];
    lastPos.current = [e.clientX, e.clientY];
    velRef.current = [dx, dy];
    rotRef.current[0] += dx * 0.3;
    rotRef.current[1] -= dy * 0.3;
    rotRef.current[1] = Math.max(-90, Math.min(90, rotRef.current[1]));
    draw();
  };
  const onMouseUp = e => {
    isDragging.current = false;
    // Détecter clic sur un pays
    if (!projRef.current || !geoData || !window.d3) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const coords = projRef.current.invert([px, py]);
    if (!coords) return;
    const d3 = window.d3;
    const found = geoData.features.find(f => d3.geoContains(f, coords));
    if (found) {
      const nom = found.properties?.name || '';
      const data = PAYS_DATA[nom];
      if (data) setPays({ nom, data });
    }
  };

  // Touch support
  const onTouchStart = e => { const t = e.touches[0]; onMouseDown({clientX:t.clientX,clientY:t.clientY}); };
  const onTouchMove  = e => { e.preventDefault(); const t = e.touches[0]; onMouseMove({clientX:t.clientX,clientY:t.clientY}); };
  const onTouchEnd   = e => { const t = e.changedTouches[0]; onMouseUp({clientX:t.clientX,clientY:t.clientY}); };

  return (
    <div className="space-y-4">
      <div className={`p-5 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-blue-900 to-indigo-900' : 'bg-gradient-to-r from-[#0d4093] to-indigo-600'} text-white`}>
        <h2 className="text-xl font-black">🌍 Globe économique mondial</h2>
        <p className="text-sm opacity-80 mt-1">Visualisez les indicateurs économiques pays par pays · Faites tourner le globe</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {INDICATEURS.map(ind => (
          <button key={ind.id} onClick={() => { setIndicateur(ind.id); setPays(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              indicateur === ind.id
                ? 'bg-[#0d4093] text-white shadow-lg'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}>
            {ind.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Globe */}
        <div className={`lg:col-span-2 rounded-2xl overflow-hidden relative ${darkMode ? 'bg-gray-950' : 'bg-slate-800'}`}
          style={{height:'480px'}}>
          {!geoData && !loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 text-sm gap-2">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
              Chargement de la carte…
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <div className="text-3xl">🌐</div>
              <p className="text-white/60 text-sm">Carte indisponible — vérifiez votre connexion</p>
              <button onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-[#0d4093] text-white text-xs rounded-xl hover:bg-[#0a3278]">
                Réessayer
              </button>
            </div>
          )}
          <canvas ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={() => { isDragging.current = false; }}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          />
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-white/30 text-xs">🖱️ Glisser pour tourner · Cliquer sur un pays</span>
          </div>
        </div>

        {/* Panneau */}
        <div className="space-y-3">
          {/* Légende */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{indDef.label}</p>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{indDef.lowGood ? '✅' : '❌'}</span>
              <div className="flex-1 h-3 rounded-full" style={{background:`linear-gradient(to right,${indDef.pal.join(',')})`}} />
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{indDef.lowGood ? '❌' : '✅'}</span>
            </div>
            <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Gris = données non disponibles
            </div>
          </div>

          {/* Fiche pays */}
          {pays ? (
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <h3 className={`font-black text-lg mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pays.nom}</h3>
              <div className="space-y-2">
                {INDICATEURS.map(ind => {
                  const val = pays.data[ind.id];
                  if (val == null) return null;
                  const color = getColor(val, ind.id);
                  return (
                    <div key={ind.id} className={`flex justify-between py-1 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{ind.label.split(' (')[0]}</span>
                      <span className="text-sm font-bold" style={{color}}>{val}{ind.unite}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl p-6 text-center ${darkMode ? 'bg-gray-800 text-gray-500' : 'bg-white text-gray-400'} shadow`}>
              <div className="text-3xl mb-2">🌍</div>
              <p className="text-sm">Cliquez sur un pays pour ses données</p>
            </div>
          )}

          {/* Top 5 */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>🏆 Top 5 — {indDef.label.split(' (')[0]}</p>
            {Object.entries(PAYS_DATA)
              .filter(([,d]) => d[indicateur] != null)
              .sort(([,a],[,b]) => indDef.lowGood ? a[indicateur]-b[indicateur] : b[indicateur]-a[indicateur])
              .slice(0,5)
              .map(([nom,data],i) => (
                <div key={nom} className={`flex justify-between items-center py-1 ${i<4?(darkMode?'border-b border-gray-700':'border-b border-gray-100'):''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-4 ${darkMode?'text-gray-500':'text-gray-400'}`}>{i+1}</span>
                    <span className={`text-xs ${darkMode?'text-gray-300':'text-gray-600'}`}>{nom}</span>
                  </div>
                  <span className="text-xs font-bold" style={{color:getColor(data[indicateur],indicateur)}}>
                    {data[indicateur]}{indDef.unite}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <p className={`text-xs text-center ${darkMode?'text-gray-600':'text-gray-400'}`}>
        📚 Sources : FMI, OCDE, Eurostat, Banque mondiale — Données 2024-2025 · {Object.keys(PAYS_DATA).length} pays · Carte GeoJSON Natural Earth
      </p>
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
    { terme: "Zone euro", definition: "20 pays de l'UE ayant adopté l'euro comme monnaie. Politique monétaire commune (BCE).", categorie: "Europe", importance: "basse" },

    // ===== MACROÉCONOMIE =====
    { terme: "PIB", definition: "Produit Intérieur Brut. Valeur totale des biens et services produits sur le territoire en un an. Principal indicateur de la taille d'une économie.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "PNB", definition: "Produit National Brut. Comme le PIB mais mesure la production des résidents français, y compris à l'étranger. Peu utilisé aujourd'hui.", categorie: "Macroéconomie", importance: "basse" },
    { terme: "Croissance économique", definition: "Variation du PIB en volume sur une période. Une croissance positive signifie une hausse de la production. Négative = récession.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Récession", definition: "Deux trimestres consécutifs de croissance négative. Entraîne généralement hausse du chômage et baisse de l'investissement.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Stagflation", definition: "Situation rare combinant stagnation économique (chômage élevé) et inflation forte. Vécu en France lors du choc pétrolier de 1973.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Déflation", definition: "Baisse généralisée et durable des prix. Paradoxalement néfaste: les ménages reportent leurs achats, l'économie se contracte (spirale déflationniste).", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Désinflation", definition: "Ralentissement de l'inflation: les prix continuent d'augmenter mais moins vite. Différent de la déflation.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Productivité", definition: "Rapport entre la production et les facteurs utilisés (travail, capital). Productivité du travail = PIB / heures travaillées. Clé pour la compétitivité.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Cycle économique", definition: "Alternance de phases d'expansion (croissance) et de contraction (récession). Durée moyenne : 7-10 ans. Théorisé par Juglar, Kondratiev.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Politique monétaire", definition: "Action de la banque centrale sur la masse monétaire et les taux d'intérêt pour influencer l'activité économique et l'inflation.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Politique budgétaire", definition: "Action de l'État via ses dépenses et ses recettes fiscales pour influencer l'activité économique. Peut être expansive ou restrictive.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Politique d'austérité", definition: "Réduction des dépenses publiques et/ou hausse des impôts pour réduire le déficit. Controversée: peut aggraver la récession.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Déficit public", definition: "Excédent des dépenses de l'État sur ses recettes. Exprimé en % du PIB. Critère de Maastricht: < 3% du PIB.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Dette publique", definition: "Cumul des déficits passés. France: ~110% du PIB en 2025. Critère de Maastricht: < 60% du PIB.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Taux directeur", definition: "Taux d'intérêt fixé par la banque centrale auquel les banques commerciales empruntent. Influence tous les autres taux de l'économie.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Quantitative Easing (QE)", definition: "Politique non-conventionnelle: la banque centrale achète des actifs (obligations) pour injecter des liquidités dans l'économie. Utilisé massivement post-2008.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Balance commerciale", definition: "Différence entre exportations et importations. Excédentaire si on exporte plus qu'on importe. France: déficitaire depuis 2004.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Compétitivité", definition: "Capacité d'une entreprise ou d'un pays à maintenir ou accroître ses parts de marché. Compétitivité-prix (coûts) vs compétitivité hors-prix (qualité, innovation).", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Indicateur avancé", definition: "Indicateur qui prédit l'évolution économique future: commandes industrielles, confiance des ménages, prix des matières premières.", categorie: "Macroéconomie", importance: "basse" },
    { terme: "Pouvoir d'achat", definition: "Quantité de biens et services qu'un revenu permet d'acheter. Évolue selon l'écart entre hausse des revenus et inflation.", categorie: "Macroéconomie", importance: "haute" },

    // ===== FINANCE ET MARCHÉS =====
    { terme: "CAC 40", definition: "Principal indice boursier français: les 40 plus grandes capitalisations de la Bourse de Paris. Créé en 1987, base 1000.", categorie: "Finance", importance: "moyenne" },
    { terme: "Obligations", definition: "Titres de dette émis par l'État ou les entreprises. L'acheteur prête de l'argent et reçoit des intérêts (coupon). Moins risqués que les actions.", categorie: "Finance", importance: "moyenne" },
    { terme: "Taux d'intérêt", definition: "Prix de l'argent emprunté, exprimé en %. Taux directeur (BCE), taux d'emprunt immobilier, taux de rémunération de l'épargne.", categorie: "Finance", importance: "haute" },
    { terme: "Spread", definition: "Écart entre deux taux d'intérêt. Ex: spread OAT-Bund = différence entre taux d'emprunt français et allemand. Mesure la confiance des marchés.", categorie: "Finance", importance: "basse" },
    { terme: "OAT", definition: "Obligation Assimilable du Trésor. Titre de dette émis par l'État français pour financer son déficit. Référence pour les taux longs en France.", categorie: "Finance", importance: "basse" },
    { terme: "Livret A", definition: "Compte d'épargne réglementé, défiscalisé, garanti par l'État. Taux fixé par la Banque de France (2,4% en 2025). Plafond: 22 950€.", categorie: "Finance", importance: "moyenne" },
    { terme: "PEA", definition: "Plan d'Épargne en Actions. Enveloppe fiscalement avantageuse pour investir en actions européennes. Exonération d'impôt après 5 ans.", categorie: "Finance", importance: "basse" },
    { terme: "Assurance-vie", definition: "Premier produit d'épargne français (1 900 Mds€). Fiscalité avantageuse après 8 ans. Fonds euros (garanti) + unités de compte (risqués).", categorie: "Finance", importance: "moyenne" },
    { terme: "Capital-risque", definition: "Investissement dans des jeunes entreprises innovantes à fort potentiel mais risque élevé. Moteur de la création de startups.", categorie: "Finance", importance: "basse" },
    { terme: "Hedge fund", definition: "Fonds d'investissement spéculatif utilisant des stratégies complexes (vente à découvert, effet de levier). Peu régulés, réservés aux investisseurs institutionnels.", categorie: "Finance", importance: "basse" },
    { terme: "Krach boursier", definition: "Chute brutale et massive des cours boursiers (-20% en peu de temps). Exemples: 1929, 1987, 2000, 2008. Souvent déclenchés par une panique collective.", categorie: "Finance", importance: "moyenne" },
    { terme: "Bulle spéculative", definition: "Hausse excessive des prix d'un actif déconnectée des fondamentaux économiques. Finit toujours par éclater. Ex: tulipes (1637), immobilier US (2006).", categorie: "Finance", importance: "moyenne" },
    { terme: "Dividende", definition: "Part des bénéfices d'une entreprise distribuée à ses actionnaires. Controversé: certains jugent qu'il capte de la valeur au détriment des salariés.", categorie: "Finance", importance: "moyenne" },
    { terme: "Rachat d'actions", definition: "L'entreprise rachète ses propres actions pour les annuler, augmentant la valeur des actions restantes. Alternative au dividende, fiscal plus avantageux.", categorie: "Finance", importance: "basse" },

    // ===== IMMOBILIER =====
    { terme: "IRL", definition: "Indice de Référence des Loyers. Calculé par l'INSEE chaque trimestre sur base de l'inflation. Plafonne les révisions de loyers en France.", categorie: "Immobilier", importance: "haute" },
    { terme: "ICC", definition: "Indice du Coût de la Construction. Publié par l'INSEE, sert à réviser certains baux commerciaux.", categorie: "Immobilier", importance: "basse" },
    { terme: "PTZ", definition: "Prêt à Taux Zéro. Aide de l'État pour les primo-accédants sous conditions de ressources. Ne finance qu'une partie du bien.", categorie: "Immobilier", importance: "moyenne" },
    { terme: "Taux d'effort", definition: "Part du revenu consacrée au logement. Seuil critique: 33% (banques) ou 40% (réalité pour les ménages modestes). En hausse depuis 2000.", categorie: "Immobilier", importance: "haute" },
    { terme: "Bulle immobilière", definition: "Hausse des prix de l'immobilier déconnectée des revenus et des fondamentaux. France: prix/revenus au plus haut historique dans les grandes villes.", categorie: "Immobilier", importance: "moyenne" },
    { terme: "DALO", definition: "Droit Au Logement Opposable. Permet aux mal-logés de faire valoir leur droit à un logement devant les tribunaux si l'État ne le leur fournit pas.", categorie: "Immobilier", importance: "basse" },
    { terme: "HLM/HJS", definition: "Habitation à Loyer Modéré. Logement social dont le loyer est plafonné en fonction des ressources. 5,4 millions de logements en France, 2,5M sur liste d'attente.", categorie: "Immobilier", importance: "moyenne" },
    { terme: "Encadrement des loyers", definition: "Dispositif limitant les loyers à un plafond dans certaines zones tendues (Paris, Lyon, Bordeaux...). Contesté par les propriétaires.", categorie: "Immobilier", importance: "moyenne" },

    // ===== DROIT DU TRAVAIL =====
    { terme: "Licenciement économique", definition: "Rupture du contrat de travail pour motif économique: difficultés économiques, mutations technologiques, cessation d'activité. Procédure stricte.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Licenciement pour faute", definition: "Rupture du contrat pour faute simple (insuffisance professionnelle), faute grave (pas de préavis), ou faute lourde (intention de nuire).", categorie: "Droit du travail", importance: "haute" },
    { terme: "Rupture conventionnelle", definition: "Rupture du contrat d'un commun accord. Salarié touche les allocations chômage. +500 000 par an en France. Contestée car peut dissimuler un licenciement.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Préavis", definition: "Délai entre notification de la rupture et fin effective du contrat. Varie selon l'ancienneté et la catégorie. Peut être inexécuté (indemnité compensatrice).", categorie: "Droit du travail", importance: "haute" },
    { terme: "Indemnité de licenciement", definition: "Indemnité légale minimum: 1/4 de mois de salaire par année d'ancienneté (jusqu'à 10 ans), 1/3 au-delà. La convention peut prévoir plus.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Barème Macron", definition: "Plafonnement des dommages-intérêts en cas de licenciement sans cause réelle (1 mois/an d'ancienneté, max 20 mois). Critiqué pour son effet dissuasif sur les recours.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Période d'essai", definition: "Période initiale du contrat permettant à chacun d'évaluer l'autre. CDI: 2 mois ouvriers, 3 mois agents de maîtrise, 4 mois cadres. Renouvelable une fois.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Clause de non-concurrence", definition: "Clause interdisant au salarié de travailler chez un concurrent après son départ. Doit être limitée en zone, durée et activité, et être compensée financièrement.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Harcèlement moral", definition: "Agissements répétés dégradant les conditions de travail, portant atteinte aux droits et à la dignité, altérant la santé. Définition: L.1152-1 Code du travail.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Discrimination au travail", definition: "Traitement défavorable basé sur un critère prohibé (sexe, âge, origine, syndicat, grossesse...). 25 critères protégés. Sanction pénale + civile.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Obligation de sécurité", definition: "L'employeur a une obligation de résultat sur la sécurité physique et mentale des salariés. La faute inexcusable engage sa responsabilité aggravée.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Document unique (DUERP)", definition: "Document Unique d'Évaluation des Risques Professionnels. Obligatoire pour tout employeur, mis à jour annuellement et après tout accident.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Inaptitude professionnelle", definition: "Constat médical du médecin du travail qu'un salarié ne peut plus occuper son poste. L'employeur doit rechercher un reclassement avant de licencier.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Plan de Sauvegarde de l'Emploi (PSE)", definition: "Obligatoire pour les licenciements collectifs de +10 salariés dans une entreprise de +50 salariés. Doit inclure des mesures de reclassement.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Accord de performance collective", definition: "Accord permettant de modifier durée du travail ou rémunération pour préserver l'emploi. Le salarié refusant peut être licencié (motif sui generis).", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Télétravail", definition: "Travail effectué hors des locaux de l'employeur, via les technologies. Droit ouvert depuis 2017, généralisé par le Covid. Accord ou charte nécessaire.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Droit à la déconnexion", definition: "Droit pour le salarié de ne pas être connecté aux outils numériques professionnels en dehors de ses horaires. Doit faire l'objet d'une charte ou d'un accord.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Forfait jours", definition: "Convention individuelle de forfait pour cadres autonomes: 218 jours/an max. Pas d'heures supplémentaires mais repos obligatoires. Fait l'objet de contentieux.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Astreinte", definition: "Période où le salarié doit rester disponible sans être sur son lieu de travail. Compensée financièrement même si aucune intervention n'a lieu.", categorie: "Droit du travail", importance: "basse" },
    { terme: "Portabilité des droits", definition: "Conservation des droits à la prévoyance et mutuelle pendant 12 mois max après rupture du contrat. Financée par les anciens collègues via la mutualisation.", categorie: "Droit du travail", importance: "basse" },

    // ===== PROTECTION SOCIALE ÉLARGIE =====
    { terme: "APA", definition: "Allocation Personnalisée d'Autonomie. Aide aux personnes âgées dépendantes (GIR 1 à 4) pour financer les soins à domicile ou en établissement.", categorie: "Protection sociale", importance: "basse" },
    { terme: "MDPH", definition: "Maison Départementale des Personnes Handicapées. Attribue les droits liés au handicap: AAH, RQTH, PCH, carte mobilité inclusion.", categorie: "Protection sociale", importance: "basse" },
    { terme: "AAH", definition: "Allocation aux Adultes Handicapés. Revenu de substitution pour les personnes handicapées ne pouvant pas travailler. ~1 000€/mois.", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "RSA", definition: "Revenu de Solidarité Active. Minimum social garantissant un revenu aux personnes sans ressources ou à faibles ressources (~635€/mois personne seule). Géré par les départements.", categorie: "Protection sociale", importance: "haute" },
    { terme: "Prime d'activité", definition: "Complément de revenu pour les travailleurs modestes. Versée par la CAF, cumulable avec un salaire. Environ 4 millions de bénéficiaires.", categorie: "Protection sociale", importance: "haute" },
    { terme: "APL", definition: "Aide Personnalisée au Logement. Aide de la CAF pour réduire le loyer ou les mensualités. Versée directement au bailleur dans la plupart des cas.", categorie: "Protection sociale", importance: "haute" },
    { terme: "Minimum vieillesse (ASPA)", definition: "Allocation de Solidarité aux Personnes Agées. Revenu minimum garanti aux retraités ayant une retraite insuffisante (~916€/mois en 2025).", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "Complémentaire santé obligatoire", definition: "Depuis 2016, l'employeur doit proposer une mutuelle à tous ses salariés et financer 50% de la cotisation.", categorie: "Protection sociale", importance: "haute" },

    // ===== EMPLOI ÉLARGI =====
    { terme: "NEET", definition: "Not in Education, Employment or Training. Jeunes ni en emploi, ni en études, ni en formation. En France: ~12% des 15-29 ans.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Halo du chômage", definition: "Personnes proches du chômage mais non comptées dans le taux BIT: découragés, disponibles mais ne cherchant plus, cherchant mais pas disponibles.", categorie: "Emploi", importance: "moyenne" },
    { terme: "SAS (Travail saisonnier)", definition: "Contrat de travail pour des activités saisonnières (agriculture, tourisme). Permet les CDD successifs sans délai de carence.", categorie: "Emploi", importance: "basse" },
    { terme: "Portage salarial", definition: "Forme hybride entre salariat et indépendance. Une entreprise de portage emploie le consultant qui facture ses clients. Il bénéficie de la protection salariale.", categorie: "Emploi", importance: "basse" },
    { terme: "Groupement d'employeurs", definition: "Structure permettant à plusieurs PME de partager des salariés à temps partiel. Évite le travail précaire tout en offrant de la flexibilité aux employeurs.", categorie: "Emploi", importance: "basse" },
    { terme: "Emplois francs", definition: "Aide à l'embauche pour les personnes résidant dans les quartiers prioritaires de la politique de la ville (QPV). 5 000€/an sur 3 ans pour un CDI.", categorie: "Emploi", importance: "basse" },
    { terme: "Contrat de professionnalisation", definition: "Alternance combinant formation et travail en entreprise pour adultes (+ de 26 ans) ou jeunes. Salaire: 55 à 100% du SMIC selon l'âge et le diplôme.", categorie: "Emploi", importance: "moyenne" },
    { terme: "CEJ", definition: "Contrat d'Engagement Jeune. Accompagnement intensif des jeunes NEET vers l'emploi (15h+ activités/semaine). Allocation allant jusqu'à 528€/mois.", categorie: "Emploi", importance: "basse" },

    // ===== INDICATEURS ÉCONOMIQUES =====
    { terme: "Taux d'épargne", definition: "Part du revenu disponible non consommée. Élevé en France (~17%). Monte en période d'incertitude (épargne de précaution).", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Confiance des ménages", definition: "Indicateur INSEE mensuel mesurant l'optimisme/pessimisme des ménages sur leur situation financière et l'économie. Prédit la consommation.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "PMI", definition: "Purchasing Managers Index. Enquête mensuelle auprès des directeurs achats. Au-dessus de 50 = expansion, en dessous = contraction. Indicateur avancé.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "ISM", definition: "Institute for Supply Management. Équivalent américain du PMI, très suivi par les marchés financiers.", categorie: "Indicateurs", importance: "basse" },
    { terme: "IPC", definition: "Indice des Prix à la Consommation. Mesure l'inflation ressentie par les ménages. Panier de référence de ~300 produits et services mis à jour annuellement.", categorie: "Indicateurs", importance: "haute" },
    { terme: "IPCH", definition: "Indice des Prix à la Consommation Harmonisé. Version européenne de l'IPC, permettant des comparaisons entre pays de la zone euro.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Déflateur du PIB", definition: "Mesure de l'inflation basée sur l'ensemble de la production (vs panier de consommation pour l'IPC). Utilisé pour calculer le PIB en volume.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Taux de marge", definition: "Excédent Brut d'Exploitation (EBE) / Valeur Ajoutée. Mesure la part de la richesse produite captée par le capital. France: ~32,5% en 2024.", categorie: "Indicateurs", importance: "haute" },
    { terme: "GFCF", definition: "Formation Brute de Capital Fixe. Mesure l'investissement des entreprises, ménages et administrations. Indicateur de la capacité productive future.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Taux d'emploi", definition: "Part de la population en âge de travailler (15-64 ans) ayant un emploi. Objectif UE: 78% en 2030. France: ~69%.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Enquête ACEMO", definition: "Enquête sur l'Activité et les Conditions d'EMploi de la main-d'Œuvre. Source DARES pour les statistiques sur les salaires et le temps de travail.", categorie: "Indicateurs", importance: "basse" },

    // ===== PARTAGE DE LA VALEUR =====
    { terme: "Valeur ajoutée (VA)", definition: "Richesse créée par une entreprise = Production - Consommations intermédiaires. Se partage entre salaires, cotisations, impôts, amortissements et profits.", categorie: "Partage VA", importance: "haute" },
    { terme: "EBE (Excédent Brut d'Exploitation)", definition: "Part de la VA restant à l'entreprise après paiement des salaires et impôts de production. Finance l'investissement, la dette et les dividendes.", categorie: "Partage VA", importance: "haute" },
    { terme: "Taux de profit", definition: "Rapport entre le profit et le capital investi. Indicateur de la rentabilité du capital. En hausse depuis les années 1980.", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Coût du travail", definition: "Total des dépenses liées à l'emploi: salaire brut + cotisations patronales - aides de l'État. France: parmi les plus élevés d'Europe mais compensé par la productivité.", categorie: "Partage VA", importance: "haute" },
    { terme: "Part salariale", definition: "Part des salaires (+ cotisations) dans la valeur ajoutée. En France: ~58%. En baisse de ~10 points depuis 1980 au profit du capital.", categorie: "Partage VA", importance: "haute" },
    { terme: "Coefficient de Gini", definition: "Mesure les inégalités de revenus: 0 = égalité parfaite, 1 = inégalité maximale. France: 0,29 (relativement égalitaire vs 0,41 aux USA).", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Rapport D9/D1", definition: "Rapport entre le 9ème décile et le 1er décile de salaires. Mesure l'écart entre hauts et bas salaires. France: D9/D1 ≈ 2,9 (relativement faible).", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Top 1%", definition: "Les 1% les plus riches. En France, leur part dans les revenus est passée de ~7% (1980) à ~10-11% (2024). Moins extrême qu'aux USA (~20%).", categorie: "Partage VA", importance: "moyenne" },

    // ===== IRP ET REPRÉSENTATION =====
    { terme: "Procès-verbal de carence", definition: "Document constatant qu'aucun candidat ne s'est présenté aux élections CSE. L'employeur est dispensé d'organiser de nouvelles élections pendant 4 ans.", categorie: "IRP", importance: "basse" },
    { terme: "Base de données économiques (BDES/BDESE)", definition: "Base de Données Économiques Sociales et Environnementales. Mise à disposition du CSE pour l'exercice de ses missions. Contenu défini par accord ou décret.", categorie: "IRP", importance: "haute" },
    { terme: "Consultation récurrente", definition: "3 consultations annuelles obligatoires du CSE: orientations stratégiques, situation économique et financière, politique sociale.", categorie: "IRP", importance: "haute" },
    { terme: "Droit d'alerte économique", definition: "Possibilité pour le CSE de demander des informations à l'employeur en cas de préoccupation sur la situation économique de l'entreprise.", categorie: "IRP", importance: "haute" },
    { terme: "Droit d'alerte sociale", definition: "Le CSE peut alerter l'employeur et l'inspecteur du travail sur toute atteinte aux droits des personnes ou tout fait contraire aux réglementations.", categorie: "IRP", importance: "haute" },
    { terme: "Commission de suivi", definition: "Instance paritaire créée par un accord pour surveiller son application. Obligatoire pour certains accords collectifs (participation, intéressement...).", categorie: "IRP", importance: "basse" },
    { terme: "RSS", definition: "Représentant Syndical au Comité Social et Économique. Désigné par les OS dans les entreprises >500 salariés. Assiste aux séances du CSE sans voix délibérative.", categorie: "IRP", importance: "basse" },

    // ===== EUROPE ÉLARGI =====
    { terme: "Fonds structurels (FSE+)", definition: "Fonds Social Européen Plus. Finance la formation, l'emploi et l'inclusion en Europe. La France bénéficie de ~5 Mds€ sur 2021-2027.", categorie: "Europe", importance: "basse" },
    { terme: "Semestre européen", definition: "Cycle annuel de coordination des politiques économiques entre les États membres. La Commission émet des recommandations sur les budgets nationaux.", categorie: "Europe", importance: "basse" },
    { terme: "Mécanisme Européen de Stabilité (MES)", definition: "Fonds de secours pour les États de la zone euro en difficulté financière. A aidé Grèce, Irlande, Portugal, Espagne, Chypre post-2010.", categorie: "Europe", importance: "basse" },
    { terme: "Pacte de stabilité et de croissance", definition: "Règles budgétaires de l'UE: déficit <3% du PIB, dette <60%. Suspendu pendant le Covid, réformé en 2024 pour plus de flexibilité.", categorie: "Europe", importance: "moyenne" },
    { terme: "ETUI", definition: "European Trade Union Institute. Centre de recherche de la CES (Confédération Européenne des Syndicats). Produit des études sur le droit social européen.", categorie: "Europe", importance: "basse" },
    { terme: "Comité d'entreprise européen (CEE)", definition: "Instance de représentation des salariés dans les multinationales opérant dans 2+ pays de l'UE avec >1000 salariés au total.", categorie: "Europe", importance: "moyenne" },

    // ===== ENVIRONNEMENT ET TRANSITION =====
    { terme: "Taxe carbone", definition: "Prélèvement sur les émissions de CO₂. En France via la contribution énergie-climat. Objectif: inciter à réduire les émissions et financer la transition.", categorie: "Environnement", importance: "moyenne" },
    { terme: "Marché carbone (ETS)", definition: "Système d'échange de quotas d'émissions européen. Les entreprises polluantes doivent acheter des droits à polluer. Prix: ~60-90€/tonne CO₂.", categorie: "Environnement", importance: "basse" },
    { terme: "Emplois verts", definition: "Emplois contribuant à réduire l'impact environnemental. En forte croissance: énergies renouvelables, rénovation thermique, transports durables.", categorie: "Environnement", importance: "basse" },
    { terme: "Devoir de vigilance", definition: "Loi 2017 obligeant les grandes entreprises françaises à identifier et prévenir les risques sociaux et environnementaux de leurs filiales et sous-traitants.", categorie: "Environnement", importance: "moyenne" },
    { terme: "Bilan carbone (bilan GES)", definition: "Inventaire des émissions de gaz à effet de serre d'une organisation. Obligatoire pour les entreprises >500 salariés tous les 4 ans.", categorie: "Environnement", importance: "basse" },

    // ===== NUMÉRIQUE ET FUTUR DU TRAVAIL =====
    { terme: "Plateforme (travail)", definition: "Modèle d'entreprise utilisant une application pour mettre en relation des travailleurs indépendants avec des clients (Uber, Deliveroo). Statut juridique contesté.", categorie: "Numérique", importance: "haute" },
    { terme: "Ubérisation", definition: "Transformation d'un secteur par des plateformes numériques remplaçant des emplois salariés par du travail indépendant. Désintermédie et flexibilise.", categorie: "Numérique", importance: "haute" },
    { terme: "IA et emploi", definition: "Les études divergent: l'IA détruirait 30% des emplois actuels (McKinsey) mais en créerait autant. Les emplois routiniers (bureau, logistique) sont les plus exposés.", categorie: "Numérique", importance: "haute" },
    { terme: "Revenu universel de base (RUB)", definition: "Allocation versée à tous les citoyens sans condition. Expérimenté en Finlande (2017-2018), Écosse, Espagne. Débat sur son financement et ses effets sur l'offre de travail.", categorie: "Numérique", importance: "basse" },
    { terme: "Semaine de 4 jours", definition: "Organisation du travail sur 4 jours au lieu de 5, sans réduction de salaire. Expérimentée dans plusieurs pays (Islande, Belgique, UK). Résultats positifs sur le bien-être.", categorie: "Numérique", importance: "moyenne" },
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
      <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-purple-600 to-indigo-600'} text-white`}>
        <h2 className="text-lg font-bold">📖 Aide & Glossaire</h2>
        <p className="text-sm opacity-80">Plus de 270 termes expliqués pour maîtriser les NAO et l'économie</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 flex-wrap">
        {[['glossaire', '📚 Glossaire'], ['indicateurs', '📊 Indicateurs'], ['sources', '🔗 Sources'], ['methodologie', '🔬 Méthodologie']].map(([id, label]) => (
          <button 
            key={id} 
            onClick={() => setOpenSection(id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${openSection === id ? 'bg-purple-600 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GLOSSAIRE */}
      {openSection === 'glossaire' && (
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
          {/* Filtres */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="🔍 Rechercher un terme..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
            />
            <select
              value={filtreCategorie}
              onChange={(e) => setFiltreCategorie(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="all">📁 Toutes catégories ({glossaire.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat} ({glossaire.filter(g => g.categorie === cat).length})</option>
              ))}
            </select>
            <select
              value={filtreImportance}
              onChange={(e) => setFiltreImportance(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="all">⭐ Toute importance</option>
              <option value="haute">⭐ Essentiels uniquement</option>
              <option value="moyenne">📌 Importants</option>
              <option value="basse">📎 Utiles</option>
            </select>
          </div>

          {/* Stats rapides */}
          <div className={`flex gap-4 mb-4 p-2 rounded-lg text-xs ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
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
                      className={`p-3 rounded-xl border transition-all hover:scale-[1.01] ${importanceColors[item.importance]}`}
                    >
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <span className={`font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                          {item.terme}
                        </span>
                        <div className="flex gap-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg text-white ${importanceBadge[item.importance].bg}`}>
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
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
          <h3 className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📊 Comment lire les indicateurs</h3>
          
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} border`}>
            <h4 className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-800'}`}>🟢 Indicateurs positifs</h4>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              <li>• <b>PIB en hausse</b> → Croissance économique, plus de richesses à partager</li>
              <li>• <b>Salaires {">"} Inflation</b> → Gain de pouvoir d'achat</li>
              <li>• <b>Chômage en baisse</b> → Marché du travail favorable aux salariés</li>
            </ul>
          </div>

          <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border`}>
            <h4 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-800'}`}>🔴 Indicateurs d'alerte</h4>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              <li>• <b>Inflation {">"} Salaires</b> → Perte de pouvoir d'achat</li>
              <li>• <b>Défaillances en hausse</b> → Difficultés économiques des entreprises</li>
              <li>• <b>Taux de marge élevé</b> → Les profits augmentent plus que les salaires</li>
            </ul>
          </div>

          <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
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
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
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
                className={`p-3 rounded-xl border transition-colors ${darkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full bg-${source.color}-500`}></span>
                  <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{source.nom}</span>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{source.desc}</p>
              </a>
            ))}
          </div>

          <div className={`p-3 rounded-xl ${darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border`}>
            <p className={`text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
              ⚠️ <b>Note</b> : Les données sont mises à jour automatiquement via des API publiques. 
              Certaines données (conventions collectives) sont vérifiées manuellement.
            </p>
          </div>
        </div>
      )}

      {/* METHODOLOGIE */}
      {openSection === 'methodologie' && (
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
          <h3 className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🔬 Méthodologie</h3>
          
          <div className={`space-y-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📈 Pouvoir d'achat cumulé</h4>
              <p className="mt-1">Calculé comme l'écart cumulé entre l'évolution des salaires et l'inflation depuis 2019. Un chiffre négatif indique une perte de pouvoir d'achat.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🧮 Simulateur NAO</h4>
              <p className="mt-1">Les calculs du RGDU 2026 sont basés sur le décret n°2025-1446. Le taux de réduction suit la formule officielle avec P=1.75 et un plancher de 2%.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📋 Conformité SMIC</h4>
              <p className="mt-1">Une branche est "non conforme" si au moins un niveau de sa grille de classification est inférieur au SMIC en vigueur.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>💰 Coût employeur (Superbrut)</h4>
              <p className="mt-1">Inclut : maladie (13%), vieillesse (10.57%), allocations familiales (5.25%), chômage (4.25%), retraite complémentaire (~6%), FNAL, formation, AT/MP (~2%). Total ~43% avant réductions.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
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
