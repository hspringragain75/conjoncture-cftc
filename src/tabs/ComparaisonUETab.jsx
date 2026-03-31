import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', cyan: '#06b6d4', gray: '#6b7280'
};

export default function ComparaisonUETab({d, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  const [subTab, setSubTab] = useState('smic');
  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-2`}>
        {[['smic','💰 SMIC'],['chomage','👥 Chômage'],['partage_va','⚖️ Part salaires VA']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${subTab===id?'bg-[#0d4093] text-white shadow-lg': darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'smic' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="💰 Salaire minimum brut mensuel (€)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.comparaison_ue.smic_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 3000]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v.toLocaleString()}€`} />
              <Bar radius={[6, 6, 0, 0]} dataKey="smic" name="SMIC brut">
                {d.comparaison_ue.smic_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.primary : C.gray} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 En pouvoir d'achat (SPA)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.comparaison_ue.smic_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 2200]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v.toLocaleString()} SPA`} />
              <Bar radius={[6, 6, 0, 0]} dataKey="spa" name="Pouvoir d'achat réel">
                {d.comparaison_ue.smic_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.tertiary : C.cyan} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <div className={`md:col-span-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} border-l-4 border-blue-400 p-4 rounded`}>
          <h3 className="font-semibold text-blue-800">💡 À retenir</h3>
          <ul className="mt-2 text-sm text-blue-700 space-y-1">
            <li>• France <b>6ᵉ rang UE</b> en SMIC brut (1 802€)</li>
            <li>• SMIC français <b>20% inférieur</b> au SMIC allemand</li>
            <li>• En pouvoir d'achat réel, l'Allemagne dépasse le Luxembourg</li>
          </ul>
        </div>
      </div>}

      {subTab === 'chomage' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="👥 Taux de chômage (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.chomage_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 12]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
              <Bar radius={[6, 6, 0, 0]} dataKey="taux" name="Chômage total">
                {d.comparaison_ue.chomage_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.secondary : (e.taux > 7 ? C.quaternary : C.tertiary)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="👶 Chômage des jeunes (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.chomage_europe} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[0, 28]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
              <Bar radius={[6, 6, 0, 0]} dataKey="jeunes" name="-25 ans">
                {d.comparaison_ue.chomage_europe.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.secondary : (e.jeunes > 15 ? C.quaternary : C.tertiary)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {subTab === 'partage_va' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="⚖️ Part des salaires dans la VA (%)" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.comparaison_ue.part_salaires_va_ue} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" domain={[50, 65]} fontSize={10} />
              <YAxis {...chartProps.yAxis} dataKey="pays" type="category" width={100} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v => `${v}%`} />
              <ReferenceLine x={56.8} stroke={C.gray} strokeDasharray="5 5" />
              <Bar radius={[6, 6, 0, 0]} dataKey="part" name="Part salaires">
                {d.comparaison_ue.part_salaires_va_ue.map((e, i) => <Cell key={i} fill={e.pays.includes('France') ? C.primary : (e.part > 56.8 ? C.tertiary : C.secondary)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Analyse" darkMode={darkMode}>
          <div className="space-y-3 p-2">
            <div className={`p-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}>
              <p className="text-sm">France</p>
              <p className="text-2xl font-bold text-[#0d4093]">57.8%</p>
            </div>
            <div className={`p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}>
              <p className="text-sm">Allemagne</p>
              <p className="text-2xl font-bold text-green-600">61.2%</p>
              <p className="text-xs text-gray-600">+3.4 pts vs France</p>
            </div>
            <div className={`p-3 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded-lg text-sm`}>
              <p className="font-medium text-red-800">📖 Note de lecture</p>
              <p className="text-red-700">En Allemagne, les salariés représentent <b>61.2%</b> de la valeur ajoutée contre 57.8% en France</p>
            </div>
          </div>
        </Card>
      </div>}
      
      {d.sources_par_onglet?.comparaison_ue && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.comparaison_ue}</p>
      )}
    </div>
  );
}
