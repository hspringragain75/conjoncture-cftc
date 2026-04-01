import { useState } from 'react';
import { ComposedChart, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, Area, PieChart, Pie } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', pink: '#ec4899', purple: '#8b5cf6',
  cyan: '#06b6d4', gray: '#6b7280'
};

export default function TravailTab({d, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  const [activeSection, setActiveSection] = useState('egalite');
  
  const sections = [
    {id: 'egalite', label: '⚖️ Égalité pro', icon: '⚖️'},
    {id: 'accidents', label: '🚧 Accidents', icon: '🚧'},
    {id: 'maladies', label: '🏥 Maladies pro', icon: '🏥'},
    {id: 'formation', label: '📚 Formation', icon: '📚'},
    {id: 'epargne', label: '💰 Épargne', icon: '💰'},
    {id: 'temps', label: '⏰ Temps', icon: '⏰'}
  ];
  
  const egapro = d.egalite_professionnelle || {};
  const accidents = d.accidents_travail || {};
  const maladies_pro = d.maladies_professionnelles || {};
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
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
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
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{egapro.index_moyen_national || 88}/100</div>
                <div className="text-sm text-gray-500">Index moyen national</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{egapro.entreprises_conformes_pct || 77}%</div>
                <div className="text-sm text-gray-500">Entreprises ≥75 pts</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-[#0d4093]'}`}>{((egapro.nombre_declarations || 31000)/1000).toFixed(0)}k</div>
                <div className="text-sm text-gray-500">Déclarations</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
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
          
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>📖 Note de lecture</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-purple-200' : 'text-purple-800'}`}>
              {(egapro.notes_lecture || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
            {egapro.sources && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">📚 Sources : {egapro.sources}</p>}
          </div>
        </div>
      )}
      
      {/* ACCIDENTS DU TRAVAIL - Données 2024 CNAM */}
      {activeSection === 'accidents' && accidents && accidents.total_national && (
        <div className="space-y-4">
          {/* En-tête avec source */}
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                🚧 Accidents du Travail {accidents.annee || 2024}
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {accidents.source || 'CNAM - Risques professionnels'}
              </span>
            </div>
          </div>

          {/* KPIs principaux */}
          <Card title="📊 Chiffres clés nationaux" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                  {accidents.total_national.accidents_avec_arret?.toLocaleString() || '549 614'}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>AT avec arrêt</div>
                {accidents.total_national.tendance_accidents && (
                  <div className="text-xs text-green-500 mt-1">📉 Tendance : {accidents.total_national.tendance_accidents}</div>
                )}
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                  {accidents.total_national.indice_frequence}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>IF / 1 000 salariés</div>
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {accidents.total_national.accidents_mortels}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Décès reconnus</div>
                {accidents.total_national.evolution_mortels_pct && (
                  <div className="text-xs text-red-500 mt-1">⚠️ +{accidents.total_national.evolution_mortels_pct}% vs 2023</div>
                )}
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-blue-300' : 'text-[#0d4093]'}`}>
                  {accidents.causes?.manutention_manuelle_pct || 50}%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manutention manuelle</div>
                <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>Cause n°1</div>
              </div>
            </div>

            {/* Démographie */}
            {accidents.demographie && (
              <div className={`p-3 rounded-xl mb-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                  <span>👨 <b>{accidents.demographie.hommes_pct}%</b> hommes</span>
                  <span>👩 <b>{accidents.demographie.femmes_pct}%</b> femmes</span>
                  <span>📊 Pic : <b>{accidents.demographie.tranche_pic}</b></span>
                </div>
              </div>
            )}
          </Card>

          {/* Tableau par CTN */}
          {accidents.par_ctn && (
            <Card title="📋 Détail par secteur (CTN) - 2024" darkMode={darkMode}>
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : ''}`}>
                  <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                    <tr>
                      <th className="text-left p-2">CTN</th>
                      <th className="text-left p-2">Secteur</th>
                      <th className="text-center p-2">Accidents</th>
                      <th className="text-center p-2">Évolution</th>
                      <th className="text-center p-2">IF*</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {accidents.par_ctn.map((s, i) => (
                      <tr key={i} className={`${s.if >= 38 ? (darkMode ? 'bg-red-900/20' : 'bg-red-50') : ''}`}>
                        <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{s.ctn}</td>
                        <td className="p-2">
                          <div className="font-medium">{s.secteur}</div>
                          {s.commentaire && (
                            <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{s.commentaire}</div>
                          )}
                        </td>
                        <td className="text-center p-2 font-medium">{s.accidents?.toLocaleString()}</td>
                        <td className={`text-center p-2 font-semibold ${s.evolution_pct > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {s.evolution_pct > 0 ? '+' : ''}{s.evolution_pct}%
                        </td>
                        <td className={`text-center p-2 font-bold ${s.if >= 38 ? (darkMode ? 'text-red-400' : 'text-red-600') : ''}`}>
                          {s.if}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                * IF = Indice de Fréquence (nombre d'accidents avec arrêt pour 1 000 salariés)
              </p>
            </Card>
          )}

          {/* Tableau simplifié si pas de CTN */}
          {!accidents.par_ctn && accidents.par_secteur && (
            <Card title="📋 Répartition par secteur" darkMode={darkMode}>
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
                      <tr key={i} className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} ${s.if > 38 ? (darkMode ? 'bg-red-900/20' : 'bg-red-50') : ''}`}>
                        <td className="p-2">{s.secteur}</td>
                        <td className="text-center p-2">{s.accidents?.toLocaleString()}</td>
                        <td className="text-center p-2">{s.part_pct}%</td>
                        <td className={`text-center p-2 font-semibold ${s.if > 38 ? (darkMode ? 'text-red-400' : 'text-red-600') : ''}`}>{s.if}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          
          {/* Notes de lecture */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>📖 Notes de lecture</h4>
            <ul className={`text-sm space-y-2 ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
              {(accidents.notes_lecture || []).map((note, i) => (
                <li key={i} className={`p-2 rounded-lg ${darkMode ? 'bg-red-900/30' : 'bg-red-100/50'}`}>{note}</li>
              ))}
            </ul>
            <p className={`text-xs mt-3 pt-2 border-t ${darkMode ? 'border-red-800 text-gray-400' : 'border-red-200 text-gray-500'}`}>
              📚 Source : {accidents.source || 'CNAM - Risques professionnels, Rapport annuel 2024'}
            </p>
          </div>
        </div>
      )}

      {/* MALADIES PROFESSIONNELLES - Données 2024 CNAM */}
      {activeSection === 'maladies' && (
        <div className="space-y-4">
          {/* En-tête avec source */}
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-purple-900/20 border border-purple-800/50' : 'bg-purple-50 border border-purple-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                🏥 Maladies Professionnelles 2024
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                CNAM - Risques professionnels, Rapport annuel 2024
              </span>
            </div>
          </div>

          {/* KPIs principaux */}
          <Card title="📊 Chiffres clés nationaux" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                  {maladies_pro.total?.toLocaleString() || '50 598'}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>MP reconnues</div>
                <div className="text-xs text-red-500 mt-1">📈 +6.7% vs 2023</div>
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}>
                  52%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Femmes</div>
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-blue-300' : 'text-[#0d4093]'}`}>
                  48%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hommes</div>
              </div>
              <div className={`text-center p-4 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                <div className={`text-3xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                  87%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>TMS (tableau 57)</div>
                <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>Cause n°1</div>
              </div>
            </div>

            {/* Alerte sur la répartition H/F */}
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-pink-900/20 border border-pink-800/50' : 'bg-pink-50 border border-pink-200'}`}>
              <p className={`text-sm ${darkMode ? 'text-pink-200' : 'text-pink-800'}`}>
                <b>👩 Majorité féminine :</b> Les secteurs à forte prédominance féminine (grande distribution CTN D, santé/nettoyage CTN I) 
                et exposés aux gestes répétitifs contribuent fortement à la majorité féminine dans les MP.
              </p>
            </div>
          </Card>

          {/* Tableau par CTN */}
          <Card title="📋 Maladies Professionnelles par secteur (CTN) - 2024" darkMode={darkMode}>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : ''}`}>
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className="text-left p-2">CTN</th>
                    <th className="text-left p-2">Secteur</th>
                    <th className="text-center p-2">MP (1er règlement)</th>
                    <th className="text-center p-2">Évolution</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  <tr className={darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>D</td>
                    <td className="p-2">
                      <div className="font-medium">Services, Commerces, Alimentation</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Grande distribution, gestes répétitifs</div>
                    </td>
                    <td className="text-center p-2 font-bold">10 557</td>
                    <td className="text-center p-2 font-semibold text-red-500">+5.8%</td>
                  </tr>
                  <tr className={darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>I</td>
                    <td className="p-2">
                      <div className="font-medium">Santé, Nettoyage, Intérim</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Forte prédominance féminine</div>
                    </td>
                    <td className="text-center p-2 font-bold">10 383</td>
                    <td className="text-center p-2 font-semibold text-red-500">+6.1%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>B</td>
                    <td className="p-2">
                      <div className="font-medium">Bâtiment et Travaux Publics</div>
                    </td>
                    <td className="text-center p-2 font-medium">7 238</td>
                    <td className="text-center p-2 font-semibold text-red-500">+4.5%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>A</td>
                    <td className="p-2">
                      <div className="font-medium">Métallurgie</div>
                    </td>
                    <td className="text-center p-2 font-medium">6 237</td>
                    <td className="text-center p-2 font-semibold text-red-500">+8.1%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>C</td>
                    <td className="p-2">
                      <div className="font-medium">Transports, Eau, Gaz, Électricité</div>
                    </td>
                    <td className="text-center p-2 font-medium">3 968</td>
                    <td className="text-center p-2 font-semibold text-red-500">+9.6%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>G</td>
                    <td className="p-2">
                      <div className="font-medium">Commerce non alimentaire</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Plus forte hausse</div>
                    </td>
                    <td className="text-center p-2 font-medium">3 169</td>
                    <td className="text-center p-2 font-semibold text-red-500">+12.7%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>F</td>
                    <td className="p-2">
                      <div className="font-medium">Bois, Ameublement, Papier-Carton</div>
                    </td>
                    <td className="text-center p-2 font-medium">2 569</td>
                    <td className="text-center p-2 font-semibold text-red-500">+3.8%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>H</td>
                    <td className="p-2">
                      <div className="font-medium">Banques, Assurances, Services I</div>
                    </td>
                    <td className="text-center p-2 font-medium">2 250</td>
                    <td className="text-center p-2 font-semibold text-red-500">+12.3%</td>
                  </tr>
                  <tr>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>E</td>
                    <td className="p-2">
                      <div className="font-medium">Chimie, Caoutchouc, Plasturgie</div>
                    </td>
                    <td className="text-center p-2 font-medium">1 671</td>
                    <td className="text-center p-2 font-semibold text-red-500">+8.9%</td>
                  </tr>
                </tbody>
                <tfoot className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                  <tr className="font-bold">
                    <td className="p-2" colSpan="2">Total Régime Général</td>
                    <td className="text-center p-2">50 598</td>
                    <td className="text-center p-2 text-red-500">+6.7%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
          
          {/* Notes de lecture */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>📖 Notes de lecture</h4>
            <ul className={`text-sm space-y-2 ${darkMode ? 'text-purple-200' : 'text-purple-800'}`}>
              <li className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100/50'}`}>
                📈 En 2024, le nombre total de MP augmente dans <b>presque tous les secteurs</b> (+6.7% global)
              </li>
              <li className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100/50'}`}>
                🏥 Les secteurs des services (CTN D et I) et du BTP (CTN B) sont les plus impactés en <b>volume</b>
              </li>
              <li className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100/50'}`}>
                📊 Les CTN G (Commerce non alim.) et H (Banques/Assurances) affichent les plus fortes <b>hausses</b> (+12%)
              </li>
              <li className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100/50'}`}>
                👩 Les TMS (troubles musculo-squelettiques) représentent <b>87%</b> des MP — touchant majoritairement les femmes
              </li>
            </ul>
            <p className={`text-xs mt-3 pt-2 border-t ${darkMode ? 'border-purple-800 text-gray-400' : 'border-purple-200 text-gray-500'}`}>
              📚 Source : CNAM - Risques professionnels, Rapport annuel 2024 (édition novembre 2025)
            </p>
          </div>
        </div>
      )}
      
      {/* FORMATION PROFESSIONNELLE - VERSION ENRICHIE CDC */}
      {activeSection === 'formation' && formation && (
        <div className="space-y-4">
          
          {/* CHIFFRES CLÉS CPF - Timeline et KPIs */}
          <Card title="📊 MonCompteFormation - Chiffres Clés 2025" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-[#0d4093]'}`}>
                  {formation.cpf?.cumul?.dossiers_millions || '9.89'}M
                </div>
                <div className="text-xs text-gray-500">Dossiers depuis 2019</div>
              </div>
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                  {formation.cpf?.cumul?.cout_total_mds || '14.59'}Md€
                </div>
                <div className="text-xs text-gray-500">Coût pédagogique cumulé</div>
              </div>
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                  {formation.cpf?.prix_moyen_2025 || '1 776'}€
                </div>
                <div className="text-xs text-gray-500">Prix moyen 2025</div>
              </div>
              <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                  {formation.cpf?.dossiers_2025 ? (formation.cpf.dossiers_2025/1000000).toFixed(2) + 'M' : '1.33M'}
                </div>
                <div className="text-xs text-gray-500">Dossiers validés 2025</div>
              </div>
            </div>
            
            {/* Timeline historique */}
            {formation.cpf?.historique_dossiers && (
              <div className="mt-4">
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>📈 Évolution annuelle des dossiers CPF</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={formation.cpf.historique_dossiers}>
                    <CartesianGrid {...chartProps.cartesianGrid} />
                    <XAxis dataKey="annee" {...chartProps.xAxis} />
                    <YAxis yAxisId="left" {...chartProps.yAxis} tickFormatter={(v) => `${v}M`} />
                    <YAxis yAxisId="right" orientation="right" {...chartProps.yAxis} tickFormatter={(v) => `${v}€`} />
                    <Tooltip {...chartProps.tooltip} formatter={(value, name) => {
                      if (name === 'dossiers_millions') return [`${value}M dossiers`, 'Dossiers'];
                      if (name === 'prix_moyen') return [`${value}€`, 'Prix moyen'];
                      return [value, name];
                    }} />
                    <Bar yAxisId="left" dataKey="dossiers_millions" fill={C.primary} radius={[4, 4, 0, 0]} name="Dossiers (M)" />
                    <Line yAxisId="right" type="monotone" dataKey="prix_moyen" stroke={C.secondary} strokeWidth={2} dot={{ r: 4 }} name="Prix moyen (€)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* PROFIL DES STAGIAIRES - Salariés vs DE */}
          <Card title="👥 Qui utilise le CPF en 2025 ?" darkMode={darkMode}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Répartition Salariés / DE */}
              <div>
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Statut des bénéficiaires</h4>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={darkMode ? 'text-blue-300' : 'text-[#0d4093]'}>Salariés</span>
                      <span className="font-bold">{formation.profil_stagiaires?.statut?.salaries_pct || 57}%</span>
                    </div>
                    <div className={`h-4 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div className="h-full bg-[#0d4093] rounded-full" style={{width: `${formation.profil_stagiaires?.statut?.salaries_pct || 57}%`}}></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={darkMode ? 'text-orange-300' : 'text-orange-600'}>Demandeurs d'emploi</span>
                      <span className="font-bold">{formation.profil_stagiaires?.statut?.demandeurs_emploi_pct || 43}%</span>
                    </div>
                    <div className={`h-4 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div className="h-full bg-orange-500 rounded-full" style={{width: `${formation.profil_stagiaires?.statut?.demandeurs_emploi_pct || 43}%`}}></div>
                    </div>
                  </div>
                </div>
                <p className={`text-xs mt-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  ⚠️ Part des DE en forte hausse : 31% en 2023 → 43% en 2025
                </p>
              </div>
              
              {/* Répartition par âge */}
              <div>
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Répartition par âge</h4>
                {formation.profil_stagiaires?.tranches_age?.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs w-20 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.tranche}</span>
                    <div className={`flex-1 h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full ${i === 1 ? 'bg-green-500' : i === 2 ? 'bg-[#0d4093]' : 'bg-gray-400'}`}
                        style={{width: `${t.pct * 3}%`}}
                      ></div>
                    </div>
                    <span className={`text-xs font-bold w-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* CSP et Diplômes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-300/30">
              <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                  {formation.profil_stagiaires?.csp_salaries?.non_cadres_pct || 79}%
                </div>
                <div className="text-xs text-gray-500">Non-cadres</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formation.profil_stagiaires?.csp_salaries?.cadres_pct || 21}%
                </div>
                <div className="text-xs text-gray-500">Cadres</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}>
                  {formation.profil_stagiaires?.genre?.femmes_pct || 47}%
                </div>
                <div className="text-xs text-gray-500">Femmes</div>
              </div>
              <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>
                  {formation.profil_stagiaires?.genre?.hommes_pct || 53}%
                </div>
                <div className="text-xs text-gray-500">Hommes</div>
              </div>
            </div>
          </Card>

          {/* TOP FORMATIONS DEMANDÉES */}
          <Card title="🎯 Top des formations demandées en 2025" darkMode={darkMode}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Top domaines */}
              <div>
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Par domaine</h4>
                {formation.cpf?.top_domaines?.slice(0, 5).map((d, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'} title={d.domaine}>
                        {d.domaine.length > 30 ? d.domaine.substring(0, 30) + '...' : d.domaine}
                      </span>
                      <span className="font-bold">{d.part_pct}%</span>
                    </div>
                    <div className={`h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full ${
                          i === 0 ? 'bg-[#0d4093]' : 
                          i === 1 ? 'bg-green-500' : 
                          i === 2 ? 'bg-purple-500' : 
                          i === 3 ? 'bg-orange-500' : 'bg-pink-500'
                        }`}
                        style={{width: `${d.part_pct * 2.5}%`}}
                      ></div>
                    </div>
                  </div>
                ))}
                <p className={`text-xs mt-2 ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>
                  🚗 Transport/Permis = 40% des formations !
                </p>
              </div>
              
              {/* Top certifications */}
              <div>
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Top certifications</h4>
                <div className="space-y-2">
                  {formation.cpf?.top_certifications?.slice(0, 5).map((c, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? 'bg-yellow-500 text-white' : 
                          i === 1 ? 'bg-gray-400 text-white' : 
                          i === 2 ? 'bg-orange-600 text-white' : 
                          `${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`
                        }`}>{i + 1}</span>
                        <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {c.nom.length > 25 ? c.nom.substring(0, 25) + '...' : c.nom}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{c.dossiers_k}k</div>
                        <div className="text-[10px] text-gray-500">{c.cout_m}M€</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* CPF SUR TEMPS DE TRAVAIL - Argument NAO */}
          <Card title="⏰ Formation sur temps de travail - Argument NAO !" darkMode={darkMode}>
            <div className={`p-3 rounded-xl mb-4 ${darkMode ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                  {formation.temps_travail?.formations_sur_temps_travail_2025_pct || 20}%
                </div>
                <div>
                  <div className={`font-semibold ${darkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>
                    des formations CPF sur temps de travail
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    vs {formation.temps_travail?.formations_sur_temps_travail_2024_pct || 17.4}% en 2024 → Tendance à la hausse !
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-blue-300' : 'text-[#0d4093]'}`}>
                  {(formation.temps_travail?.nb_formations_salaries_2025 / 1000).toFixed(0) || 144}k
                </div>
                <div className="text-xs text-gray-500">Formations salariés</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                  {formation.temps_travail?.cout_formations_salaries_2025_m || 278}M€
                </div>
                <div className="text-xs text-gray-500">Coût pédagogique</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                  {formation.temps_travail?.dotation_entreprise_pct || 4.7}%
                </div>
                <div className="text-xs text-gray-500">Avec dotation entreprise</div>
              </div>
            </div>
            
            <div className={`mt-3 p-2 rounded-lg text-xs ${darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              💡 <strong>Argument NAO :</strong> "Seulement 20% des formations CPF se font sur le temps de travail. 
              L'entreprise peut abonder le CPF et accorder du temps de formation pour faciliter la montée en compétences."
            </div>
          </Card>

          {/* FINANCEMENT CPF */}
          <Card title="💰 Financement du CPF - Qui paie ?" darkMode={darkMode}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Répartition */}
              <div>
                <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Répartition des financeurs</h4>
                {formation.financement?.repartition?.map((f, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                        {f.financeur.length > 35 ? f.financeur.substring(0, 35) + '...' : f.financeur}
                      </span>
                      <span className="font-bold">{f.part_pct}%</span>
                    </div>
                    <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className={`h-full rounded-full ${
                          i === 0 ? 'bg-[#0d4093]' : 
                          i === 1 ? 'bg-red-500' : 
                          i === 2 ? 'bg-green-500' : 
                          i === 3 ? 'bg-purple-500' : 'bg-orange-500'
                        }`}
                        style={{width: `${f.part_pct}%`}}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Participation forfaitaire */}
              <div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-300'}`}>
                  <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                    ⚠️ Participation forfaitaire obligatoire
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                      {formation.financement?.participation_forfaitaire?.montant_euros || 102.23}€
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                      <p>Depuis janv. 2026</p>
                      <p>Indexé sur l'inflation</p>
                    </div>
                  </div>
                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    100€ en mai 2024 → 102,23€ en 2026. 
                  </p>
                </div>
                
                <div className={`mt-3 p-2 rounded-lg text-xs ${darkMode ? 'bg-green-900/20 text-green-300' : 'bg-green-50 text-green-700'}`}>
                  💡 <strong>Conseil :</strong> L'employeur peut prendre en charge cette participation via une dotation CPF !
                </div>
              </div>
            </div>
          </Card>

          {/* OFFRE DE FORMATION */}
          <Card title="🏫 L'offre de formation disponible" darkMode={darkMode}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  {(formation.offre?.organismes_actifs / 1000).toFixed(1) || 14.1}k
                </div>
                <div className="text-xs text-gray-500">Organismes actifs</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>
                  {(formation.offre?.certifications_disponibles / 1000).toFixed(1) || 3.7}k
                </div>
                <div className="text-xs text-gray-500">Certifications</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                  {(formation.offre?.sessions_disponibles / 1000).toFixed(0) || 878}k
                </div>
                <div className="text-xs text-gray-500">Sessions disponibles</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                  {formation.offre?.part_sessions_distance_pct || 10.9}%
                </div>
                <div className="text-xs text-gray-500">À distance</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Prix moyen au catalogue : <span className="font-bold">{formation.offre?.prix_moyen_catalogue || 2435}€</span>
              </div>
              <div className={`flex items-center gap-1 text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                ⭐ Note moyenne : <span className="font-bold">{formation.qualite?.note_moyenne_formations_actives || 4.7}/5</span>
              </div>
            </div>
          </Card>

          {/* ALTERNANCE & APPRENTISSAGE */}
          <Card title="🎓 Alternance & Apprentissage" darkMode={darkMode}>
            {formation.alternance && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{(formation.alternance.contrats_apprentissage_2024/1000).toFixed(0)}k</div>
                  <div className="text-sm text-gray-500">Apprentis 2024</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>{(formation.alternance.total_alternants/1000).toFixed(0)}k</div>
                  <div className="text-sm text-gray-500">Total alternants</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{formation.alternance.taux_insertion_6mois}%</div>
                  <div className="text-sm text-gray-500">Insertion 6 mois</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>+{formation.alternance.evolution_vs_2023}%</div>
                  <div className="text-sm text-gray-500">vs 2023</div>
                </div>
              </div>
            )}
          </Card>
          
          {/* ACCÈS À LA FORMATION - Inégalités */}
          {formation.taux_acces && (
            <Card title="📋 Inégalités d'accès à la formation" darkMode={darkMode}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Taux d'accès par CSP</h4>
                  {formation.taux_acces.par_csp?.map((c, i) => (
                    <div key={i} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{c.csp}</span>
                        <span className={`font-bold ${c.taux >= 50 ? 'text-green-500' : c.taux >= 35 ? 'text-yellow-500' : 'text-red-500'}`}>{c.taux}%</span>
                      </div>
                      <div className={`h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className={`h-full rounded-full ${c.taux >= 50 ? 'bg-green-500' : c.taux >= 35 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{width: `${c.taux}%`}}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                  <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>⚠️ Écart persistant</h4>
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>62%</div>
                      <div className="text-xs text-gray-500">Cadres</div>
                    </div>
                    <div className={`text-2xl ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>vs</div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>28%</div>
                      <div className="text-xs text-gray-500">Ouvriers</div>
                    </div>
                  </div>
                  <p className={`text-xs mt-2 ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                    💡 Argument NAO : Demandez un plan de formation ciblé pour réduire ces inégalités !
                  </p>
                </div>
              </div>
            </Card>
          )}
          
          {/* NOTES DE LECTURE */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>📖 Note de lecture</h4>
            <ul className={`text-sm space-y-1 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
              {(formation.notes_lecture || []).map((arg, i) => <li key={i}>• {arg}</li>)}
            </ul>
            {formation.sources && <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">📚 Sources : {formation.sources}</p>}
            {formation.source_cdc && <p className="text-xs text-gray-500">📅 Données CDC : {formation.date_mise_a_jour}</p>}
          </div>
        </div>
      )}


            {/* ÉPARGNE SALARIALE */}
      {activeSection === 'epargne' && epargne && (
        <div className="space-y-4">
          <Card title="💰 Épargne Salariale (Participation, Intéressement, PEE)" darkMode={darkMode}>
            {epargne.couverture && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{epargne.couverture.salaries_couverts_pct}%</div>
                  <div className="text-sm text-gray-500">Salariés couverts</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-[#0d4093]'}`}>{epargne.couverture.salaries_couverts_millions}M</div>
                  <div className="text-sm text-gray-500">Bénéficiaires</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>{epargne.montants_totaux?.primes_brutes_mds}Md€</div>
                  <div className="text-sm text-gray-500">Total distribué</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{epargne.montants_totaux?.montant_moyen_beneficiaire}€</div>
                  <div className="text-sm text-gray-500">Moyenne/bénéficiaire</div>
                </div>
              </div>
            )}
            
            {epargne.dispositifs && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">Participation</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{epargne.dispositifs.participation?.montant_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.participation?.salaries_couverts_pct}% couverts</div>
                </div>
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">Intéressement</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>{epargne.dispositifs.interessement?.montant_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.interessement?.salaries_couverts_pct}% couverts</div>
                </div>
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">PEE (abondement)</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{epargne.dispositifs.pee?.abondement_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.pee?.salaries_couverts_pct}% couverts</div>
                </div>
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="text-sm font-semibold mb-1">PERCO/PERCOL</div>
                  <div className={`text-xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{epargne.dispositifs.perco_percol?.abondement_moyen}€</div>
                  <div className="text-xs text-gray-500">{epargne.dispositifs.perco_percol?.salaries_couverts_pct}% couverts</div>
                </div>
              </div>
            )}
          </Card>
          
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
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
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-[#0d4093]'}`}>{temps.duree_travail.duree_hebdo_habituelle}h</div>
                  <div className="text-sm text-gray-500">Durée hebdo moyenne</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{temps.duree_travail.duree_legale}h</div>
                  <div className="text-sm text-gray-500">Durée légale</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{temps.duree_travail.duree_annuelle_effective}h</div>
                  <div className="text-sm text-gray-500">Durée annuelle</div>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>{temps.temps_partiel?.taux_global_pct}%</div>
                  <div className="text-sm text-gray-500">Temps partiel</div>
                </div>
              </div>
            )}
            
            {temps.horaires_atypiques && (
              <div className="mb-4">
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : ''}`}>Horaires atypiques</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="font-bold">{temps.horaires_atypiques.travail_samedi_pct}%</div>
                    <div className="text-xs text-gray-500">Samedi</div>
                  </div>
                  <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="font-bold">{temps.horaires_atypiques.travail_dimanche_pct}%</div>
                    <div className="text-xs text-gray-500">Dimanche</div>
                  </div>
                  <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="font-bold">{temps.horaires_atypiques.travail_soir_pct}%</div>
                    <div className="text-xs text-gray-500">Soir</div>
                  </div>
                  <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
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
          
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-cyan-900/20 border border-cyan-800' : 'bg-cyan-50 border border-cyan-200'}`}>
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
