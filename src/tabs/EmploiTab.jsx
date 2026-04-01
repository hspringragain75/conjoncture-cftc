import { useState } from 'react';
import { ComposedChart, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, Area } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';
import BubbleNote from '../components/BubbleNote';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', pink: '#ec4899', purple: '#8b5cf6',
  cyan: '#06b6d4', gray: '#6b7280'
};

export default function EmploiTab({d, subTab, setSubTab, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-2`}>
        {[['chomage','👥 Chômage'],['seniors','👴 Seniors'],['vacants','📋 Vacants'],['contrats','📝 Contrats'],['secteurs','🏢 Secteurs'],['recrutement','🎯 Recrutement'],['dynamique','📊 Dynamique']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${subTab===id?'bg-purple-600 text-white shadow-lg': darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'chomage' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📉 Taux de chômage (%)" darkMode={darkMode} favoriId="chomage" isFavori={fp.isFavori?.("chomage")} toggleFavori={fp.toggleFavori}>
          <ResponsiveContainer width="100%" height={180}><LineChart data={d.chomage}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} /><YAxis {...chartProps.yAxis} domain={[0,22]} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="taux" name="Ensemble" stroke={C.primary} strokeWidth={3} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="jeunes" name="15-24 ans" stroke={C.secondary} strokeWidth={2.5} strokeDasharray="5 5" /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="📊 Dernières données" darkMode={darkMode}>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div className={`text-center p-4 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><p className="text-sm text-gray-600">Global</p><p className="text-3xl font-bold text-[#0d4093]">{d.indicateurs_cles.taux_chomage_actuel}%</p></div>
            <div className={`text-center p-4 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}><p className="text-sm text-gray-600">Jeunes</p><p className="text-3xl font-bold text-red-600">{d.indicateurs_cles.taux_chomage_jeunes}%</p></div>
          </div>
        </Card>
      </div>}

      {subTab === 'seniors' && <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Graphique taux d'emploi 55-64 (données statiques) */}
          <Card title="👴 Taux d'emploi 55-64 ans (%)" darkMode={darkMode} favoriId="emploi_seniors" isFavori={fp.isFavori?.("emploi_seniors")} toggleFavori={fp.toggleFavori}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={d.emploi_seniors}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                <YAxis {...chartProps.yAxis} domain={[50, 65]} fontSize={11} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Area dataKey="taux" fill={C.tertiary} fillOpacity={0.2} stroke="none" />
                <Line strokeLinecap="round" strokeLinejoin="round" dataKey="taux" stroke={C.tertiary} strokeWidth={3} dot={{ fill: C.tertiary, strokeWidth: 2 }} />
                <ReferenceLine y={65.2} stroke={C.quaternary} strokeDasharray="5 5" label={{ value: 'Moy. UE', position: 'right', fontSize: 10, fill: C.quaternary }} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Source : INSEE Enquête Emploi (données statiques)</p>
          </Card>
          
          {/* Graphique taux de chômage 50+ (données API) */}
          <Card title="📉 Taux de chômage 50+ (%)" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={d.chomage_seniors}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                <YAxis {...chartProps.yAxis} domain={[3, 8]} fontSize={11} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Area dataKey="taux" fill={C.secondary} fillOpacity={0.2} stroke="none" />
                <Line strokeLinecap="round" strokeLinejoin="round" dataKey="taux" stroke={C.secondary} strokeWidth={3} dot={{ fill: C.secondary, strokeWidth: 2 }} />
                <ReferenceLine y={7.4} stroke={C.quaternary} strokeDasharray="5 5" label={{ value: 'Moy. nationale', position: 'right', fontSize: 10, fill: C.quaternary }} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Source : INSEE série 001688530 (API automatique)</p>
          </Card>
        </div>
        
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux d'emploi 55-64</p>
            <p className="text-2xl font-bold text-green-600">{d.emploi_seniors?.[d.emploi_seniors.length-1]?.taux || 60.4}%</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux d'emploi 60-64</p>
            <p className="text-2xl font-bold text-[#0d4093]">{d.emploi_seniors_detail?.taux_60_64 || 38.9}%</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chômage 50+ (API)</p>
            <p className="text-2xl font-bold text-orange-600">{d.chomage_seniors?.[d.chomage_seniors.length-1]?.taux || 5.2}%</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Évolution emploi /1 an</p>
            <p className="text-2xl font-bold text-purple-600">+{d.emploi_seniors_detail?.evolution_1an || 1.9} pts</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="🇪🇺 Comparaison européenne - Taux d'emploi 55-64 ans" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[
                {pays: '🇸🇪 Suède', taux: 77.0},
                {pays: '🇩🇪 Allemagne', taux: 72.3},
                {pays: '🇳🇱 Pays-Bas', taux: 71.2},
                {pays: '🇪🇺 Moy. UE', taux: 65.2},
                {pays: '🇫🇷 France', taux: d.emploi_seniors?.[d.emploi_seniors.length-1]?.taux || 60.4},
                {pays: '🇮🇹 Italie', taux: 57.3},
                {pays: '🇪🇸 Espagne', taux: 55.8},
              ]} layout="vertical">
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis {...chartProps.xAxis} type="number" domain={[0, 85]} fontSize={11} />
                <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={90} fontSize={10} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Bar radius={[6, 6, 0, 0]} dataKey="taux" fill={C.primary}>
                  {[0,1,2,3,4,5,6].map(i => (
                    <Cell key={i} fill={i === 4 ? C.tertiary : i === 3 ? C.quaternary : C.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          
          <Card title="📈 Évolution historique" darkMode={darkMode}>
            <div className="space-y-2 p-2">
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p className="font-semibold mb-2">Progression du taux d'emploi 55-64 ans :</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className="text-xs opacity-75">2010</span>
                    <p className="font-bold">39.7%</p>
                  </div>
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className="text-xs opacity-75">2015</span>
                    <p className="font-bold">48.7%</p>
                  </div>
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className="text-xs opacity-75">2020</span>
                    <p className="font-bold">53.8%</p>
                  </div>
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                    <span className="text-xs opacity-75">2025</span>
                    <p className="font-bold text-green-600">{d.indicateurs_cles.taux_emploi_seniors || 58.4}%</p>
                  </div>
                </div>
                <p className="text-xs mt-2 opacity-75">
                  📈 +{((d.emploi_seniors?.[d.emploi_seniors.length-1]?.taux || 60.4) - 39.7).toFixed(1)} points en 15 ans
                </p>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Note de lecture */}
        <div className={`p-4 rounded-xl border-l-4 border-green-500 ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
          <h4 className={`font-semibold mb-2 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>📖 Note de lecture</h4>
          <ul className={`text-sm space-y-1 ${darkMode ? 'text-green-200' : 'text-green-700'}`}>
            <li>• Le <b>taux d'emploi des 55-64 ans</b> mesure la part des personnes en emploi parmi cette tranche d'âge (données statiques INSEE)</li>
            <li>• Le <b>taux de chômage des 50+</b> est récupéré automatiquement via l'API INSEE (série 001688530)</li>
            <li>• La France a progressé de +21 pts depuis 2010 grâce aux réformes des retraites successives</li>
            <li>• Mais reste en-dessous de la moyenne européenne (65.2%) et loin de l'Allemagne (72%)</li>
            <li>• Le taux d'emploi chute fortement après 60 ans ({d.emploi_seniors_detail?.taux_60_64 || 38.9}%) : effet de l'âge légal de départ</li>
            <li>• Le chômage des 50+ ({d.chomage_seniors?.[d.chomage_seniors.length-1]?.taux || 5.2}%) est plus faible que la moyenne nationale (7.4%) mais la durée de chômage est plus longue (18 mois en moyenne)</li>
          </ul>
        </div>
      </div>}
      {subTab === 'vacants' && d.emplois_vacants && (
        <div className="space-y-4">
          {/* KPIs principaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Emplois vacants</p>
              <p className="text-2xl font-bold text-[#0d4093]">
                {d.emplois_vacants.emplois_vacants?.length > 0 
                  ? `${(d.emplois_vacants.emplois_vacants[d.emplois_vacants.emplois_vacants.length-1].valeur / 1000).toFixed(0)}k`
                  : 'N/A'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {d.emplois_vacants.emplois_vacants?.[d.emplois_vacants.emplois_vacants.length-1]?.trimestre}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Emplois occupés</p>
              <p className="text-2xl font-bold text-green-600">
                {d.emplois_vacants.emplois_occupes?.length > 0 
                  ? `${(d.emplois_vacants.emplois_occupes[d.emplois_vacants.emplois_occupes.length-1].valeur / 1000000).toFixed(1)}M`
                  : 'N/A'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {d.emplois_vacants.emplois_occupes?.[d.emplois_vacants.emplois_occupes.length-1]?.trimestre}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux de vacance</p>
              <p className="text-2xl font-bold text-orange-600">
                {d.emplois_vacants.taux_vacance?.length > 0 
                  ? `${d.emplois_vacants.taux_vacance[d.emplois_vacants.taux_vacance.length-1].taux}%`
                  : 'N/A'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {d.emplois_vacants.taux_vacance?.[d.emplois_vacants.taux_vacance.length-1]?.trimestre}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source</p>
              <p className="text-sm font-bold text-purple-600">{d.emplois_vacants.source || 'DARES'}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Màj : {d.emplois_vacants.derniere_maj}
              </p>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Graphique Emplois vacants */}
            <Card title="📋 Nombre d'emplois vacants" darkMode={darkMode}>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={d.emplois_vacants.emplois_vacants}>
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                  <YAxis 
                    {...chartProps.yAxis} 
                    fontSize={11}
                    tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    {...chartProps.tooltip} 
                    formatter={(v) => [`${v.toLocaleString()} postes`, 'Emplois vacants']}
                  />
                  <Area dataKey="valeur" fill={C.primary} fillOpacity={0.2} stroke="none" />
                  <Line 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    dataKey="valeur" 
                    stroke={C.primary} 
                    strokeWidth={3} 
                    dot={{ fill: C.primary, strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Postes à pourvoir avec recherche active de candidat
              </p>
            </Card>

            {/* Graphique Taux de vacance */}
            <Card title="📊 Taux d'emplois vacants (%)" darkMode={darkMode}>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={d.emplois_vacants.taux_vacance}>
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                  <YAxis 
                    {...chartProps.yAxis} 
                    domain={[0, 2.5]} 
                    fontSize={11}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    {...chartProps.tooltip} 
                    formatter={(v) => [`${v}%`, 'Taux de vacance']}
                  />
                  <ReferenceLine 
                    y={1.5} 
                    stroke={C.quaternary} 
                    strokeDasharray="5 5" 
                    label={{ value: 'Seuil tension', position: 'right', fontSize: 10, fill: C.quaternary }} 
                  />
                  <Area dataKey="taux" fill={C.secondary} fillOpacity={0.2} stroke="none" />
                  <Line 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    dataKey="taux" 
                    stroke={C.secondary} 
                    strokeWidth={3} 
                    dot={{ fill: C.secondary, strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Ratio emplois vacants / (vacants + occupés)
              </p>
            </Card>
          </div>

          {/* Graphique Emplois occupés */}
          <Card title="👥 Évolution des emplois occupés" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={d.emplois_vacants.emplois_occupes}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                <YAxis 
                  {...chartProps.yAxis} 
                  fontSize={11}
                  tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`}
                  domain={['dataMin - 500000', 'dataMax + 500000']}
                />
                <Tooltip 
                  {...chartProps.tooltip} 
                  formatter={(v) => [`${(v/1000000).toFixed(2)} millions`, 'Emplois occupés']}
                />
                <Area dataKey="valeur" fill={C.tertiary} fillOpacity={0.2} stroke="none" />
                <Line 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  dataKey="valeur" 
                  stroke={C.tertiary} 
                  strokeWidth={3} 
                  dot={{ fill: C.tertiary, strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Par secteur si disponible */}
          {d.emplois_vacants.par_secteur && d.emplois_vacants.par_secteur.length > 0 && (
            <Card title="🏢 Emplois vacants par secteur" darkMode={darkMode}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.emplois_vacants.par_secteur} layout="vertical">
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis 
                    {...chartProps.xAxis} 
                    type="number" 
                    fontSize={11}
                    tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    {...chartProps.yAxis} 
                    dataKey="secteur" 
                    type="category" 
                    width={140} 
                    fontSize={10} 
                  />
                  <Tooltip 
                    {...chartProps.tooltip} 
                    formatter={(v, name) => {
                      if (name === 'vacants') return [`${v.toLocaleString()} postes`, 'Emplois vacants'];
                      if (name === 'taux') return [`${v}%`, 'Taux de vacance'];
                      return [v, name];
                    }}
                  />
                  <Bar 
                    radius={[0, 6, 6, 0]} 
                    dataKey="vacants" 
                    fill={C.primary}
                  >
                    {d.emplois_vacants.par_secteur.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.taux > 2.5 ? C.secondary : entry.taux > 1.5 ? C.quaternary : C.primary} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                🔴 Taux &gt; 2.5% | 🟠 Taux &gt; 1.5% | 🔵 Taux normal
              </p>
            </Card>
          )}

          {/* Notes de lecture */}
          {d.emplois_vacants.notes_lecture && (
            <BubbleNote type="info" title="💡 Notes de lecture" darkMode={darkMode}>
              <ul className="space-y-1">
                {d.emplois_vacants.notes_lecture.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </BubbleNote>
          )}

          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} text-center`}>
            📚 Source : {d.emplois_vacants.source || 'DARES - Enquête ACEMO'}
          </p>
        </div>
      )}
      {subTab === 'contrats' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📋 Répartition contrats" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><BarChart data={d.types_contrats}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar radius={[6, 6, 0, 0]} dataKey="cdi" name="CDI" stackId="a" fill={C.primary} /><Bar radius={[6, 6, 0, 0]} dataKey="cdd" name="CDD" stackId="a" fill={C.quaternary} /><Bar radius={[6, 6, 0, 0]} dataKey="interim" name="Intérim" stackId="a" fill={C.secondary} /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="📊 T3 2025" darkMode={darkMode}><div className="p-4 space-y-2">{(()=>{const l=d.types_contrats[d.types_contrats.length-1];return<><div className={`flex justify-between p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><span>CDI</span><b className="text-[#0d4093]">{l.cdi}%</b></div><div className={`flex justify-between p-2 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}><span>CDD</span><b className="text-orange-600">{l.cdd}%</b></div><div className={`flex justify-between p-2 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}><span>Intérim</span><b className="text-red-600">{l.interim}%</b></div></>})()}</div></Card>
      </div>}

      {subTab === 'secteurs' && <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="🏭 Emploi par secteur (k)" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}><BarChart data={d.emploi_secteur.secteurs} layout="vertical"><CartesianGrid {...chartProps.cartesianGrid} /><XAxis {...chartProps.xAxis} type="number" fontSize={11} /><YAxis {...chartProps.yAxis} dataKey="secteur" type="category" width={130} fontSize={9} /><Tooltip {...chartProps.tooltip} formatter={(v) => [`${v.toLocaleString('fr-FR')} k`, 'Emplois salariés']} /><Bar radius={[0, 6, 6, 0]} dataKey="emploi" fill={C.primary}>{d.emploi_secteur.secteurs.map((e,i)=><Cell key={i} fill={e.evolution_trim<0?C.secondary:C.tertiary}/>)}</Bar></BarChart></ResponsiveContainer>
          </Card>
          <Card title="📈 Évolutions annuelles" darkMode={darkMode}>
            <div className="p-2 space-y-2">
              {d.emploi_secteur.secteurs.map((s,i)=>(
                <div key={i} className={`flex justify-between items-center text-xs p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{s.secteur}</span>
                  <div className="flex gap-2 text-right">
                    <span className={`font-mono ${s.evolution_trim>=0?'text-green-600':'text-red-500'}`}>{s.evolution_trim>=0?'+':''}{s.evolution_trim}%/trim</span>
                    <span className={`font-mono font-bold ${s.evolution_an>=0?'text-green-600':'text-red-500'}`}>{s.evolution_an>=0?'+':''}{s.evolution_an}%/an</span>
                  </div>
                </div>
              ))}
              <p className={`text-xs pt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Màj : {d.emploi_secteur.derniere_mise_a_jour || 'N/A'} · {d.emploi_secteur.source || 'INSEE CVS'}
              </p>
            </div>
          </Card>
        </div>
        {d.emploi_secteur.evolution_trimestrielle?.length > 0 && (
          <Card title={`📊 Évolution trimestrielle de l'emploi salarié (k) — jusqu'au ${d.emploi_secteur.derniere_mise_a_jour || ''}`} darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.emploi_secteur.evolution_trimestrielle}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
                <YAxis {...chartProps.yAxis} fontSize={10} domain={['auto','auto']} />
                <Tooltip {...chartProps.tooltip} formatter={(v) => v ? [`${v.toLocaleString('fr-FR')} k`, ''] : ['N/A','']} />
                <Legend {...chartProps.legend} />
                <Line strokeLinecap="round" strokeLinejoin="round" dataKey="industrie" name="Industrie" stroke={C.primary} strokeWidth={2} dot={false} />
                <Line strokeLinecap="round" strokeLinejoin="round" dataKey="construction" name="Construction" stroke={C.quaternary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>}

      {subTab === 'recrutement' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="🔴 Difficultés recrutement (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={200}><LineChart data={d.difficultes_recrutement}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} /><YAxis {...chartProps.yAxis} domain={[20,70]} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="construction" name="BTP" stroke={C.quaternary} strokeWidth={2.5} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="industrie" name="Industrie" stroke={C.primary} strokeWidth={2.5} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="services" name="Services" stroke={C.tertiary} strokeWidth={2.5} /></LineChart></ResponsiveContainer>
        </Card>
        <Card title="⚠️ Métiers en tension" darkMode={darkMode}>
          <div className="overflow-x-auto max-h-48"><table className="w-full text-xs"><thead><tr className="bg-gray-100"><th className="text-left p-1">Métier</th><th className="p-1">%</th></tr></thead><tbody>{d.tensions_metiers.metiers_plus_tendus.slice(0,6).map((m,i)=><tr key={i} className="border-b"><td className="p-1">{m.metier}</td><td className="p-1 text-center"><span className={`px-1 py-0.5 rounded-lg text-white text-xs ${m.difficulte>=80?'bg-red-600':'bg-orange-500'}`}>{m.difficulte}%</span></td></tr>)}</tbody></table></div>
        </Card>
      </div>}

      {subTab === 'dynamique' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📊 Créations/Destructions (k)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><ComposedChart data={d.creations_destructions.donnees}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar radius={[6, 6, 0, 0]} dataKey="creations" name="Créations" fill={C.tertiary} /><Bar radius={[6, 6, 0, 0]} dataKey="destructions" name="Destructions" fill={C.secondary} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="solde" name="Solde" stroke={C.primary} strokeWidth={3} /></ComposedChart></ResponsiveContainer>
        </Card>
        <Card title="📈 Solde net" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}><BarChart data={d.creations_destructions.donnees}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v>=0?'+':''}${v}k`} /><Bar radius={[6, 6, 0, 0]} dataKey="solde">{d.creations_destructions.donnees.map((e,i)=><Cell key={i} fill={e.solde>=0?C.tertiary:C.secondary}/>)}</Bar></BarChart></ResponsiveContainer>
        </Card>
      </div>}
      
      {d.sources_par_onglet?.emploi && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.emploi}</p>
      )}
    </div>
  );
}
