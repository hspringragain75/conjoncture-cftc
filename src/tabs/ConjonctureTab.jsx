import React from 'react';
import { ComposedChart, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, Area } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';
import GlobeTab from './GlobeTab';

const C = {
  primary: '#3b82f6',
  secondary: '#ef4444',
  tertiary: '#22c55e',
  quaternary: '#f59e0b',
  pink: '#ec4899',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  gray: '#6b7280'
};

export default function ConjonctureTab({d, subTab, setSubTab, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  
  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-2`}>
        {[['pib','📈 Croissance PIB'],['partage_va','⚖️ Partage VA'],['climat','🌡️ Climat affaires'],['defaillances','🏭 Défaillances'],['investissement','📉 Investissement'],['marches','💹 Marchés financiers'],['globe','🌍 Globe économique']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${subTab===id?'bg-indigo-600 text-white shadow-lg': darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'pib' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📈 Croissance trimestrielle du PIB (%)" darkMode={darkMode} favoriId="pib_trim" isFavori={fp.isFavori?.("pib_trim")} toggleFavori={fp.toggleFavori}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={d.pib.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} />
              <YAxis domain={[-0.5, 1]} {...chartProps.yAxis} />
              <Tooltip {...chartProps.tooltip} formatter={v => {
                const val = Math.abs(v) < 0.05 ? 0 : v;
                return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
              }} />
              <ReferenceLine y={0} stroke={darkMode ? '#6b7280' : C.gray} />
              <Bar radius={[6, 6, 0, 0]} dataKey="croissance" name="Croissance T/T-1">
                {d.pib.evolution.map((e, i) => <Cell key={i} fill={e.croissance > -0.05 ? C.tertiary : C.secondary} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Situation actuelle" darkMode={darkMode}>
          <div className="space-y-3 p-2">
            <div className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <span className={darkMode ? 'text-gray-300' : ''}>Croissance T3 2025</span>
              <span className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>+{d.pib.croissance_trim_actuel}%</span>
            </div>
            <div className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <span className={darkMode ? 'text-gray-300' : ''}>Croissance annuelle 2024</span>
              <span className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>+{d.pib.croissance_annuelle}%</span>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
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
              <Bar radius={[6, 6, 0, 0]} dataKey="croissance">
                {d.pib.annuel.map((e, i) => <Cell key={i} fill={e.croissance >= 0 ? C.tertiary : C.secondary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {/* PARTAGE DE LA VALEUR AJOUTÉE */}
      {subTab === 'partage_va' && <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="⚖️ Partage de la VA des SNF (%)" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={d.partage_va.evolution}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="annee" {...chartProps.xAxis} />
                <YAxis domain={[20, 70]} {...chartProps.yAxis} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Legend {...chartProps.legend} />
                <Area dataKey="salaires" name="Part salaires" fill={C.primary} fillOpacity={0.3} stroke={C.primary} strokeWidth={2.5} />
                <Line strokeLinecap="round" strokeLinejoin="round" dataKey="ebe" name="Part profits (EBE)" stroke={C.secondary} strokeWidth={2.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="📊 Répartition actuelle (2024)" darkMode={darkMode}>
            <div className="space-y-3 p-2">
              <div className={`flex justify-between items-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <span className={`font-medium ${darkMode ? 'text-gray-300' : ''}`}>Rémunération salariés</span>
                <span className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>{d.partage_va.part_salaires_snf}%</span>
              </div>
              <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded`}>
                <span className="font-medium">Excédent Brut Exploitation</span>
                <span className="text-2xl font-bold text-red-600">{d.partage_va.part_ebe_snf}%</span>
              </div>
              <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                <span className="font-medium">Impôts sur production</span>
                <span className="text-xl font-bold text-gray-600">{d.partage_va.part_impots_snf}%</span>
              </div>
            </div>
          </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="📉 Taux de marge des SNF" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.partage_va.taux_marge_snf}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} />
                <YAxis {...chartProps.yAxis} domain={[28, 35]} fontSize={11} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Bar radius={[6, 6, 0, 0]} dataKey="taux" name="Taux de marge">
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
                <Bar radius={[6, 6, 0, 0]} dataKey="salaires" name="Salaires" fill={C.primary} />
                <Bar radius={[6, 6, 0, 0]} dataKey="ebe" name="Profits" fill={C.secondary} />
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

      {subTab === 'climat' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="🌡️ Climat des affaires et confiance des ménages" darkMode={darkMode} favoriId="climat_affaires" isFavori={fp.isFavori?.("climat_affaires")} toggleFavori={fp.toggleFavori}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={d.climat_affaires.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="mois" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} domain={[85, 105]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} />
              <Legend {...chartProps.legend} />
              <ReferenceLine y={100} stroke={C.gray} strokeDasharray="5 5" label={{value:"Moyenne", fontSize:9}} />
              <Line strokeLinecap="round" strokeLinejoin="round" dataKey="climat" name="Climat affaires" stroke={C.primary} strokeWidth={2.5} />
              <Line strokeLinecap="round" strokeLinejoin="round" dataKey="menages" name="Confiance ménages" stroke={C.quaternary} strokeWidth={2.5} />
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
              <Bar radius={[6, 6, 0, 0]} dataKey="climat" fill={C.primary}>
                {d.climat_affaires.par_secteur.map((e, i) => <Cell key={i} fill={e.climat >= 100 ? C.tertiary : C.quaternary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className={`text-center p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}>
              <p className="text-xs">Climat affaires</p>
              <p className="text-xl font-bold text-[#0d4093]">{d.climat_affaires.valeur_actuelle}</p>
            </div>
            <div className={`text-center p-2 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}>
              <p className="text-xs">Confiance ménages</p>
              <p className="text-xl font-bold text-orange-600">{d.climat_affaires.confiance_menages}</p>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">Moyenne long terme = 100</p>
        </Card>
      </div>}

      {subTab === 'defaillances' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="⚠️ Défaillances d'entreprises (cumul 12 mois)" darkMode={darkMode} favoriId="defaillances" isFavori={fp.isFavori?.("defaillances")} toggleFavori={fp.toggleFavori}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={d.defaillances.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="mois" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} domain={[40000, 70000]} fontSize={10} tickFormatter={v => `${v/1000}k`} />
              <Tooltip {...chartProps.tooltip} formatter={v => v.toLocaleString()} />
              <ReferenceLine y={d.defaillances.moyenne_2010_2019} stroke={C.quaternary} strokeDasharray="5 5" label={{value:"Moy. 2010-19", fontSize:8, fill:C.quaternary}} />
              <Area dataKey="cumul" fill={C.secondary} fillOpacity={0.2} stroke="none" />
              <Line strokeLinecap="round" strokeLinejoin="round" dataKey="cumul" stroke={C.secondary} strokeWidth={2.5} dot={false} />
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
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded-xl text-xs`}>
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

      {subTab === 'investissement' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📉 Investissement des entreprises (FBCF)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.investissement.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={8} />
              <YAxis {...chartProps.yAxis} domain={[-1, 1.5]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke={C.gray} />
              <Bar radius={[6, 6, 0, 0]} dataKey="variation" name="Variation T/T-1">
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
              <Bar radius={[6, 6, 0, 0]} dataKey="variation_an" name="Évolution annuelle">
                {d.investissement.par_type.map((e, i) => <Cell key={i} fill={e.variation_an >= 0 ? C.tertiary : C.secondary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className={`text-center p-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}>
              <p className="text-xs">Taux invest.</p>
              <p className="text-xl font-bold text-[#0d4093]">{d.investissement.taux_investissement}%</p>
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
      

      {/* MARCHES FINANCIERS - 8 indicateurs, analyse quotidienne */}
      {subTab === 'marches' && d.marches_financiers && (() => {
        const mf = d.marches_financiers;
        const VariationBadge = ({val}) => {
          if (val === undefined || val === null) return null;
          const color = val >= 0 ? 'text-green-600' : 'text-red-600';
          const bg = val >= 0 ? 'bg-green-50' : 'bg-red-50';
          const darkColor = val >= 0 ? 'text-green-400' : 'text-red-400';
          const darkBg = val >= 0 ? 'bg-green-900/30' : 'bg-red-900/30';
          return <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? `${darkBg} ${darkColor}` : `${bg} ${color}`} font-medium`}>{val >= 0 ? '+' : ''}{val}%</span>;
        };
        const VariationsRow = ({variations, label}) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</span>
            <div className="flex gap-1.5 items-center">
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>1J</span><VariationBadge val={variations?.jour} />
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>1S</span><VariationBadge val={variations?.semaine} />
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>1M</span><VariationBadge val={variations?.mois} />
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>YTD</span><VariationBadge val={variations?.ytd} />
            </div>
          </div>
        );
        const ImmoVariationsRow = ({variations}) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Var.</span>
            <div className="flex gap-1.5 items-center">
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>1M</span><VariationBadge val={variations?.mois ? variations.mois * 100 : null} />
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>3M</span><VariationBadge val={variations?.trimestre ? variations.trimestre * 100 : null} />
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>1A</span><VariationBadge val={variations?.an ? variations.an * 100 : null} />
            </div>
          </div>
        );
        const MinMaxBar = ({minMax, unite}) => {
          if (!minMax) return null;
          return (
            <div className={`flex items-center gap-2 text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
              <span className="text-red-500 font-medium">Min: {minMax.min}{unite}</span>
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>({minMax.min_date})</span>
              <span className="mx-1">|</span>
              <span className="text-green-500 font-medium">Max: {minMax.max}{unite}</span>
              <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>({minMax.max_date})</span>
            </div>
          );
        };
        const CorrBadge = ({val, label}) => {
          if (val === null || val === undefined) return <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{label}: N/A</span>;
          const absVal = Math.abs(val);
          const strength = absVal > 0.7 ? 'Forte' : absVal > 0.4 ? 'Mod.' : 'Faible';
          const dir = val > 0 ? '+' : '-';
          const color = absVal > 0.7 ? (val > 0 ? 'text-green-600' : 'text-red-600') : 'text-yellow-600';
          return <span className={`text-[10px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}: <span className={color}>{dir}{absVal} ({strength})</span></span>;
        };
        const thin = (arr, maxPts=250) => {
          if (!arr || arr.length <= maxPts) return arr || [];
          const step = Math.ceil(arr.length / maxPts);
          const result = arr.filter((_, i) => i % step === 0);
          if (result[result.length-1] !== arr[arr.length-1]) result.push(arr[arr.length-1]);
          return result;
        };
        const KpiCard = ({data, label, unite, color, bgClass, borderClass, badgeClass, textClass, format}) => {
          if (!data) return null;
          const val = format ? format(data.valeur) : data.valeur;
          return (
            <div className={`p-2.5 rounded-2xl border overflow-hidden ${darkMode ? bgClass : bgClass.replace('/20','/10')} ${darkMode ? borderClass : borderClass}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
                <span className={`text-[8px] px-1 py-0.5 rounded-lg truncate max-w-[70px] ${badgeClass}`}>{data.source?.split('(')[0]?.trim()?.slice(0,15)}</span>
              </div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className={`text-lg font-bold leading-tight ${textClass}`}>{val}</span>
                {unite && <span className={`text-[10px] font-medium ${textClass} opacity-70`}>{unite}</span>}
              </div>
              <span className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{data.date}</span>
              {data.variations && <VariationsRow variations={data.variations} label="" />}
              <MinMaxBar minMax={data.min_max} unite={unite ? ` ${unite.replace('USD/','').replace('EUR/','').replace('cents/','')}` : ''} />
            </div>
          );
        };
        const MiniChart = ({title, data, color, unite, yDomain}) => (
          <Card title={title} darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={thin(data)}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="date" {...chartProps.xAxis} tickFormatter={v => v?.slice(5)} interval={Math.floor((data?.length||50)/5)} />
                <YAxis {...chartProps.yAxis} domain={yDomain || ['auto', 'auto']} />
                <Tooltip {...chartProps.tooltip} labelFormatter={v => `Date: ${v}`} formatter={(v,n) => [v != null ? `${typeof v==='number' ? v.toLocaleString('fr-FR') : v}${n==='valeur' && unite ? ' '+unite : ''}` : '-', n==='valeur'?title.split(' -')[0]:n==='ma50'?'MA50':'MA200']} />
                <Area dataKey="valeur" fill={color} fillOpacity={0.08} stroke="none" />
                <Line dataKey="valeur" stroke={color} strokeWidth={1.5} dot={false} name="valeur" />
                <Line dataKey="ma50" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="4 2" name="ma50" />
                <Line dataKey="ma200" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="8 3" name="ma200" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        );
        return <div className="space-y-4">

        {/* Section 1: Indices & Taux */}
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Indices & Taux</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'oat_10ans', favId: 'oat_10ans', data: mf.oat_10ans, label: 'OAT 10 ans', unite: '%', bgClass: 'bg-purple-900/20', borderClass: 'border-purple-800/50', badgeClass: darkMode ? 'bg-purple-800/50 text-purple-300' : 'bg-purple-100 text-purple-600', textClass: darkMode ? 'text-purple-400' : 'text-purple-700' },
            { key: 'cac40', favId: 'cac40', data: mf.cac40, label: 'CAC 40', unite: 'pts', bgClass: 'bg-blue-900/20', borderClass: 'border-blue-800/50', badgeClass: darkMode ? 'bg-blue-800/50 text-blue-300' : 'bg-blue-100 text-[#0d4093]', textClass: darkMode ? 'text-blue-400' : 'text-blue-700', format: v => v?.toLocaleString('fr-FR') },
            { key: 'eurusd', favId: 'eurusd', data: mf.eurusd, label: 'EUR/USD', unite: '', bgClass: 'bg-cyan-900/20', borderClass: 'border-cyan-800/50', badgeClass: darkMode ? 'bg-cyan-800/50 text-cyan-300' : 'bg-cyan-100 text-cyan-600', textClass: darkMode ? 'text-cyan-400' : 'text-cyan-700' },
          ].map(({ key, favId, data, label, unite, bgClass, borderClass, badgeClass, textClass, format }) => (
            <div key={key} className="relative group">
              <KpiCard data={data} label={label} unite={unite} color="" bgClass={bgClass} borderClass={borderClass} badgeClass={badgeClass} textClass={textClass} format={format} />
              <button onClick={() => fp.toggleFavori?.(favId)} title={fp.isFavori?.(favId) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={`absolute top-1.5 right-1.5 text-xs rounded p-0.5 transition-all ${fp.isFavori?.(favId) ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400'}`}>
                {fp.isFavori?.(favId) ? '★' : '☆'}
              </button>
            </div>
          ))}
          {mf.taux_immobilier && <div className="relative group">
            <div className={`p-2.5 rounded-2xl border overflow-hidden ${darkMode ? 'bg-pink-900/20 border-pink-800/50' : 'bg-pink-50/50 border-pink-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Taux immo.</span>
                <span className={`text-[8px] px-1 py-0.5 rounded-lg ${darkMode ? 'bg-pink-800/50 text-pink-300' : 'bg-pink-100 text-pink-600'}`}>BdF/OCL</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-lg font-bold leading-tight ${darkMode ? 'text-pink-400' : 'text-pink-700'}`}>{mf.taux_immobilier.valeur}%</span>
              </div>
              <span className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{mf.taux_immobilier.date}</span>
              {mf.taux_immobilier.variations && <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {mf.taux_immobilier.variations.mois != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${mf.taux_immobilier.variations.mois <= 0 ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')} font-medium`}>1M: {mf.taux_immobilier.variations.mois > 0 ? '+' : ''}{mf.taux_immobilier.variations.mois} pts</span>}
                {mf.taux_immobilier.variations.an != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${mf.taux_immobilier.variations.an <= 0 ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')} font-medium`}>1A: {mf.taux_immobilier.variations.an > 0 ? '+' : ''}{mf.taux_immobilier.variations.an} pts</span>}
              </div>}
              <MinMaxBar minMax={mf.taux_immobilier.min_max} unite="%" />
            </div>
            <button onClick={() => fp.toggleFavori?.('taux_immo')} title={fp.isFavori?.('taux_immo') ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className={`absolute top-1.5 right-1.5 text-xs rounded p-0.5 transition-all ${fp.isFavori?.('taux_immo') ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400'}`}>
              {fp.isFavori?.('taux_immo') ? '★' : '☆'}
            </button>
          </div>}
        </div>

        {/* Section 2: Matieres premieres & Energie */}
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mati&egrave;res premi&egrave;res & &Eacute;nergie</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'brent', favId: 'brent', data: mf.petrole_brent, label: 'Brent', unite: '$/b', bgClass: 'bg-amber-900/20', borderClass: 'border-amber-800/50', badgeClass: darkMode ? 'bg-amber-800/50 text-amber-300' : 'bg-amber-100 text-amber-600', textClass: darkMode ? 'text-amber-400' : 'text-amber-700' },
            { key: 'gaz', favId: 'gaz_naturel', data: mf.gaz_naturel, label: 'Gaz (TTF)', unite: '', bgClass: 'bg-orange-900/20', borderClass: 'border-orange-800/50', badgeClass: darkMode ? 'bg-orange-800/50 text-orange-300' : 'bg-orange-100 text-orange-600', textClass: darkMode ? 'text-orange-400' : 'text-orange-700' },
            { key: 'or', favId: 'or', data: mf.or, label: 'Or', unite: '$/oz', bgClass: 'bg-yellow-900/20', borderClass: 'border-yellow-800/50', badgeClass: darkMode ? 'bg-yellow-800/50 text-yellow-300' : 'bg-yellow-100 text-yellow-600', textClass: darkMode ? 'text-yellow-400' : 'text-yellow-700', format: v => v?.toLocaleString('fr-FR') },
            { key: 'ble', favId: 'ble', data: mf.ble, label: 'Blé', unite: 'cts/bu', bgClass: 'bg-lime-900/20', borderClass: 'border-lime-800/50', badgeClass: darkMode ? 'bg-lime-800/50 text-lime-300' : 'bg-lime-100 text-lime-600', textClass: darkMode ? 'text-lime-400' : 'text-lime-700' },
          ].map(({ key, favId, data, label, unite, bgClass, borderClass, badgeClass, textClass, format }) => (
            <div key={key} className="relative group">
              <KpiCard data={data} label={label} unite={unite} color="" bgClass={bgClass} borderClass={borderClass} badgeClass={badgeClass} textClass={textClass} format={format} />
              <button onClick={() => fp.toggleFavori?.(favId)} title={fp.isFavori?.(favId) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={`absolute top-1.5 right-1.5 text-xs rounded p-0.5 transition-all ${fp.isFavori?.(favId) ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400'}`}>
                {fp.isFavori?.(favId) ? '★' : '☆'}
              </button>
            </div>
          ))}
        </div>

        {/* Section 2b: Métaux LME */}
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>M&eacute;taux LME</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: 'cuivre', favId: 'lme_cuivre', data: mf.lme_cuivre, label: 'Cuivre', unite: 'cts/lb', bgClass: 'bg-orange-900/20', borderClass: 'border-orange-800/50', badgeClass: darkMode ? 'bg-orange-800/50 text-orange-300' : 'bg-orange-100 text-orange-600', textClass: darkMode ? 'text-orange-400' : 'text-orange-700' },
            { key: 'alu', favId: 'lme_aluminium', data: mf.lme_aluminium, label: 'Aluminium', unite: 'cts/lb', bgClass: 'bg-slate-900/20', borderClass: 'border-slate-800/50', badgeClass: darkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-slate-100 text-slate-600', textClass: darkMode ? 'text-slate-400' : 'text-slate-600' },
            { key: 'zinc', favId: 'lme_zinc', data: mf.lme_zinc, label: 'Zinc', unite: '$/t', bgClass: 'bg-teal-900/20', borderClass: 'border-teal-800/50', badgeClass: darkMode ? 'bg-teal-800/50 text-teal-300' : 'bg-teal-100 text-teal-600', textClass: darkMode ? 'text-teal-400' : 'text-teal-700', format: v => v?.toLocaleString('fr-FR') },
            { key: 'nickel', favId: 'lme_nickel', data: mf.lme_nickel, label: 'Nickel', unite: '$/t', bgClass: 'bg-emerald-900/20', borderClass: 'border-emerald-800/50', badgeClass: darkMode ? 'bg-emerald-800/50 text-emerald-300' : 'bg-emerald-100 text-emerald-600', textClass: darkMode ? 'text-emerald-400' : 'text-emerald-700', format: v => v?.toLocaleString('fr-FR') },
          ].map(({ key, favId, data, label, unite, bgClass, borderClass, badgeClass, textClass, format }) => (
            <div key={key} className="relative group">
              <KpiCard data={data} label={label} unite={unite} color="" bgClass={bgClass} borderClass={borderClass} badgeClass={badgeClass} textClass={textClass} format={format} />
              <button onClick={() => fp.toggleFavori?.(favId)} title={fp.isFavori?.(favId) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={`absolute top-1.5 right-1.5 text-xs rounded p-0.5 transition-all ${fp.isFavori?.(favId) ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-400'}`}>
                {fp.isFavori?.(favId) ? '★' : '☆'}
              </button>
            </div>
          ))}
        </div>

        {/* Graphiques principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MiniChart title="OAT 10 ans - Quotidien" data={mf.oat_10ans?.historique} color={C.purple} unite="%" />
          <MiniChart title="CAC 40 - Quotidien" data={mf.cac40?.historique} color={C.primary} unite="pts" />
          <MiniChart title="Brent - Quotidien" data={mf.petrole_brent?.historique} color={C.quaternary} unite="$/b" />
          <MiniChart title="EUR/USD - Quotidien" data={mf.eurusd?.historique} color="#06b6d4" unite="" />
          <MiniChart title="Or - Quotidien" data={mf.or?.historique} color="#eab308" unite="$/oz" />
          <MiniChart title="Gaz naturel - Quotidien" data={mf.gaz_naturel?.historique} color="#f97316" unite="" />
          <MiniChart title="Bl&eacute; - Quotidien" data={mf.ble?.historique} color="#84cc16" unite="cts/bu" />
          <MiniChart title="Cuivre LME - Quotidien" data={mf.lme_cuivre?.historique} color="#f97316" unite="cts/lb" />
          <MiniChart title="Aluminium LME - Quotidien" data={mf.lme_aluminium?.historique} color="#94a3b8" unite="cts/lb" />
          <MiniChart title="Zinc LME - Quotidien" data={mf.lme_zinc?.historique} color="#14b8a6" unite="$/t" />
          <MiniChart title="Nickel LME - Quotidien" data={mf.lme_nickel?.historique} color="#10b981" unite="$/t" />

          {/* Taux immobilier - mensuel */}
          {mf.taux_immobilier?.historique && <Card title="Taux immobilier moyen - Mensuel" darkMode={darkMode} favoriId="taux_immo" isFavori={fp.isFavori?.("taux_immo")} toggleFavori={fp.toggleFavori}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={mf.taux_immobilier.historique}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="date" {...chartProps.xAxis} interval={Math.floor(mf.taux_immobilier.historique.length / 6)} />
                <YAxis {...chartProps.yAxis} domain={[0, 5]} />
                <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
                <Area dataKey="valeur" fill="#ec4899" fillOpacity={0.1} stroke="none" />
                <Line dataKey="valeur" stroke="#ec4899" strokeWidth={2} dot={{ r: 2, fill: '#ec4899' }} name="Taux moyen" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>}
        </div>

        {/* Correlations & Analyses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card title="Corr&eacute;lations march&eacute;s / inflation" darkMode={darkMode}>
            <div className="space-y-2 p-1">
              {mf.correlations && <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Coefficient de Pearson (mensuel)</p>
                <div className="grid grid-cols-2 gap-1">
                  <CorrBadge val={mf.correlations.oat_inflation} label="OAT vs IPC" />
                  <CorrBadge val={mf.correlations.brent_inflation} label="Brent vs IPC" />
                  <CorrBadge val={mf.correlations.cac_inflation} label="CAC vs IPC" />
                  <CorrBadge val={mf.correlations.eurusd_inflation} label="EUR/USD vs IPC" />
                  <CorrBadge val={mf.correlations.or_inflation} label="Or vs IPC" />
                  <CorrBadge val={mf.correlations.gaz_inflation} label="Gaz vs IPC" />
                  <CorrBadge val={mf.correlations.ble_inflation} label="Bl&eacute; vs IPC" />
                </div>
                <p className={`text-[9px] mt-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'} italic`}>{mf.correlations.note}</p>
              </div>}
            </div>
          </Card>

          <Card title="Notes de lecture" darkMode={darkMode}>
            <div className="space-y-2 p-1 max-h-80 overflow-y-auto">
              {[
                {key: 'oat_10ans', label: 'OAT 10 ans', bgLight: 'bg-purple-50', bgDark: 'bg-purple-900/20', txtLight: 'text-purple-700', txtDark: 'text-purple-300'},
                {key: 'petrole_brent', label: 'Brent', bgLight: 'bg-amber-50', bgDark: 'bg-amber-900/20', txtLight: 'text-amber-700', txtDark: 'text-amber-300'},
                {key: 'cac40', label: 'CAC 40', bgLight: 'bg-blue-50', bgDark: 'bg-blue-900/20', txtLight: 'text-blue-700', txtDark: 'text-blue-300'},
                {key: 'eurusd', label: 'EUR/USD', bgLight: 'bg-cyan-50', bgDark: 'bg-cyan-900/20', txtLight: 'text-cyan-700', txtDark: 'text-cyan-300'},
                {key: 'or', label: 'Or', bgLight: 'bg-yellow-50', bgDark: 'bg-yellow-900/20', txtLight: 'text-yellow-700', txtDark: 'text-yellow-300'},
                {key: 'gaz_naturel', label: 'Gaz naturel', bgLight: 'bg-orange-50', bgDark: 'bg-orange-900/20', txtLight: 'text-orange-700', txtDark: 'text-orange-300'},
                {key: 'ble', label: 'Bl\u00e9', bgLight: 'bg-lime-50', bgDark: 'bg-lime-900/20', txtLight: 'text-lime-700', txtDark: 'text-lime-300'},
                {key: 'taux_immobilier', label: 'Taux immobilier', bgLight: 'bg-pink-50', bgDark: 'bg-pink-900/20', txtLight: 'text-pink-700', txtDark: 'text-pink-300'},
                {key: 'lme_cuivre', label: 'Cuivre LME', bgLight: 'bg-orange-50', bgDark: 'bg-orange-900/20', txtLight: 'text-orange-700', txtDark: 'text-orange-300'},
                {key: 'lme_aluminium', label: 'Aluminium LME', bgLight: 'bg-slate-50', bgDark: 'bg-slate-900/20', txtLight: 'text-slate-700', txtDark: 'text-slate-300'},
                {key: 'lme_zinc', label: 'Zinc LME', bgLight: 'bg-teal-50', bgDark: 'bg-teal-900/20', txtLight: 'text-teal-700', txtDark: 'text-teal-300'},
                {key: 'lme_nickel', label: 'Nickel LME', bgLight: 'bg-emerald-50', bgDark: 'bg-emerald-900/20', txtLight: 'text-emerald-700', txtDark: 'text-emerald-300'},
              ].map(({key, label, bgLight, bgDark, txtLight, txtDark}) => mf[key]?.note_lecture && (
                <div key={key} className={`p-2 rounded-lg ${darkMode ? bgDark : bgLight}`}>
                  <p className={`text-[11px] font-semibold ${darkMode ? txtDark : txtLight}`}>{label}</p>
                  <p className={`text-[11px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{mf[key].note_lecture}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* OAT long terme */}
        {mf.oat_10ans?.evolution_annuelle && <Card title="OAT 10 ans - Taux moyen annuel (contexte long terme)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={mf.oat_10ans.evolution_annuelle}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartProps.xAxis} />
              <YAxis {...chartProps.yAxis} domain={[-0.5, 4]} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v >= 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke={darkMode ? '#6b7280' : C.gray} />
              <Area dataKey="valeur" fill={C.purple} fillOpacity={0.15} stroke="none" />
              <Line dataKey="valeur" stroke={C.purple} strokeWidth={2.5} dot={{ r: 3, fill: C.purple }} name="OAT 10 ans" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>}

        {/* Guide de lecture */}
        <div className={`${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'} border-l-4 border-indigo-400 p-4 rounded`}>
          <h3 className={`font-semibold text-sm ${darkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>Guide de lecture</h3>
          <div className={`mt-2 text-xs ${darkMode ? 'text-indigo-200' : 'text-indigo-700'} space-y-1`}>
            <p><b>Courbes :</b> trait plein = cours, <span className="text-yellow-500">tirets jaunes</span> = MA50 (tendance court terme), <span className="text-red-500">tirets rouges</span> = MA200 (tendance long terme)</p>
            <p><b>Signaux :</b> MA50 croise MA200 vers le haut = signal haussier ("golden cross"), vers le bas = signal baissier ("death cross")</p>
            <p><b>Variations :</b> 1J = 1 jour, 1S = 1 semaine, 1M = 1 mois, YTD = depuis le 1er janvier</p>
            <p><b>12 indicateurs suivis :</b> OAT, CAC 40, EUR/USD, Taux immobilier, Brent, Gaz TTF, Or, Bl&eacute; + <b>4 m&eacute;taux LME :</b> Cuivre, Aluminium, Zinc, Nickel</p>
            {mf.analyse?.periode && <p><b>P&eacute;riode :</b> {mf.analyse.periode}</p>}
          </div>
        </div>
      </div>;
      })()}


      {subTab === 'globe' && <GlobeTab darkMode={darkMode} />}

      {d.sources_par_onglet?.conjoncture && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.conjoncture}</p>
      )}
    </div>
  );
}
