import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ComposedChart, Area } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', cyan: '#06b6d4', gray: '#6b7280'
};

export default function ConditionsVieTab({d, subTab, setSubTab, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap gap-2`}>
        {[['loyers','🏠 Loyers (IRL)'],['immobilier','🏗️ Prix immobilier'],['carburants','⛽ Carburants'],['effort','💸 Taux d\'effort']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${subTab===id?'bg-cyan-600 text-white shadow-lg': darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'loyers' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="📈 Indice de Référence des Loyers (IRL)" darkMode={darkMode} favoriId="irl" isFavori={fp.isFavori?.("irl")} toggleFavori={fp.toggleFavori}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={d.irl.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} yAxisId="left" domain={[130,150]} fontSize={11} />
              <YAxis {...chartProps.yAxis} yAxisId="right" orientation="right" domain={[0,4]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} />
              <Legend {...chartProps.legend} />
              <Bar yAxisId="right" dataKey="glissement" name="Glissement %" fill={C.quaternary} />
              <Line yAxisId="left" dataKey="indice" name="Indice" stroke={C.primary} strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="📊 Situation actuelle" darkMode={darkMode}>
          <div className="p-4 space-y-3">
            <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}>
              <span>IRL actuel</span><span className="text-2xl font-bold text-[#0d4093]">{d.irl.valeur_actuelle}</span>
            </div>
            <div className={`flex justify-between items-center p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}>
              <span>Glissement annuel</span><span className="text-2xl font-bold text-green-600">+{d.irl.glissement_annuel}%</span>
            </div>
            <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} p-3 rounded-lg text-xs`}>
              <p className="font-semibold">💡 Impact loyer 800€</p>
              <p>Hausse max = <b>+{(800 * d.irl.glissement_annuel / 100).toFixed(0)}€/mois</b></p>
            </div>
          </div>
        </Card>
      </div>}

      {subTab === 'immobilier' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card title="🏠 Prix logements anciens" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={d.prix_immobilier.evolution}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="trimestre" {...chartProps.xAxis} fontSize={9} />
              <YAxis {...chartProps.yAxis} domain={[110,130]} fontSize={11} />
              <Tooltip {...chartProps.tooltip} />
              <Area dataKey="indice" fill={C.primary} fillOpacity={0.2} stroke="none" />
              <Line strokeLinecap="round" strokeLinejoin="round" dataKey="indice" stroke={C.primary} strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="💰 Prix/m² par zone" darkMode={darkMode}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d.prix_immobilier.par_zone} layout="vertical">
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis {...chartProps.xAxis} type="number" fontSize={11} />
              <YAxis {...chartProps.yAxis} dataKey="zone" type="category" width={80} fontSize={10} />
              <Tooltip {...chartProps.tooltip} formatter={v=>`${v.toLocaleString()}€/m²`} />
              <Bar radius={[6, 6, 0, 0]} dataKey="prix_m2" fill={C.primary}>
                {d.prix_immobilier.par_zone.map((e,i)=><Cell key={i} fill={e.variation<0?C.secondary:C.tertiary}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {subTab === 'carburants' && (() => {
        const carb = d.carburants;
        const granularite = carb.granularite || 'mensuel';
        const estQuotidien = granularite === 'quotidien';
        const formatXAxis = (val) => {
          if (!val) return '';
          if (estQuotidien && val.includes('-')) {
            const [y, m, j] = val.split('-');
            return `${j}/${m}`;
          }
          return val.length > 8 ? val.slice(0, 6) : val;
        };
        const varColor = (v) => v != null && v < 0 ? 'text-green-600' : 'text-red-600';
        const CarburantRow = ({ label, data, color, bgLight, bgDark }) => (
          <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? bgDark : bgLight}`}>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
            <div className="text-right">
              <span className="text-xl font-bold" style={{color}}>{data?.prix}€/L</span>
              <div className="flex gap-2 justify-end mt-0.5">
                {data?.variation_sem != null && <span className={`text-[10px] font-medium ${varColor(data.variation_sem)}`}>sem. {data.variation_sem > 0 ? '+' : ''}{data.variation_sem}%</span>}
                {data?.variation_an != null && <span className={`text-[10px] font-medium ${varColor(data.variation_an)}`}>an {data.variation_an > 0 ? '+' : ''}{data.variation_an}%</span>}
              </div>
            </div>
          </div>
        );
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Card title={`⛽ Prix carburants — ${estQuotidien ? 'Historique quotidien' : 'Historique mensuel'}`} darkMode={darkMode} favoriId="gazole" isFavori={fp.isFavori?.("gazole")} toggleFavori={fp.toggleFavori}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={carb.evolution}>
                  <CartesianGrid {...chartProps.cartesianGrid} />
                  <XAxis dataKey={estQuotidien ? 'date' : 'mois'} {...chartProps.xAxis} fontSize={8} tickFormatter={formatXAxis} interval={estQuotidien ? Math.floor((carb.evolution?.length || 30) / 6) : 'preserveStartEnd'} />
                  <YAxis {...chartProps.yAxis} domain={['auto', 'auto']} fontSize={11} tickFormatter={v => `${v}€`} />
                  <Tooltip {...chartProps.tooltip} labelFormatter={v => estQuotidien ? v : v} formatter={(v, n) => [`${v}€/L`, n]} />
                  <Legend {...chartProps.legend} />
                  <Line strokeLinecap="round" strokeLinejoin="round" dataKey="gazole" name="Gazole" stroke={C.quaternary} strokeWidth={2} dot={false} />
                  <Line strokeLinecap="round" strokeLinejoin="round" dataKey="sp95" name="SP95" stroke={C.tertiary} strokeWidth={2} dot={false} />
                  {carb.evolution?.some(e => e.e10) && <Line strokeLinecap="round" strokeLinejoin="round" dataKey="e10" name="E10" stroke={C.primary} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />}
                </LineChart>
              </ResponsiveContainer>
              <p className={`text-[10px] px-4 pb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{carb.source} · Dernière donnée : {carb.derniere_donnee}</p>
            </Card>
            <Card title={`💰 Prix du ${estQuotidien ? carb.derniere_donnee?.slice(0,10) || 'jour' : carb.derniere_donnee || 'mois'}`} darkMode={darkMode}>
              <div className="p-3 space-y-2">
                <CarburantRow label="Gazole" data={carb.gazole} color="#d97706" bgLight="bg-orange-50" bgDark="bg-orange-900/30" />
                <CarburantRow label="SP95" data={carb.sp95} color="#16a34a" bgLight="bg-green-50" bgDark="bg-green-900/30" />
                <CarburantRow label="SP98" data={carb.sp98} color="#2563eb" bgLight="bg-blue-50" bgDark="bg-blue-900/30" />
                {carb.e10?.prix && <CarburantRow label="E10" data={carb.e10} color="#7c3aed" bgLight="bg-purple-50" bgDark="bg-purple-900/30" />}
                <p className={`text-[10px] pt-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{estQuotidien ? '📡 Données temps réel · Moyenne nationale toutes stations' : '📅 Données mensuelles INSEE · Fallback'}</p>
              </div>
            </Card>
          </div>
        );
      })()}

      {subTab === 'effort' && <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card title="🏠 Taux d'effort par statut" darkMode={darkMode} favoriId="taux_effort_logement" isFavori={fp.isFavori?.("taux_effort_logement")} toggleFavori={fp.toggleFavori}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.taux_effort.par_statut} layout="vertical">
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis {...chartProps.xAxis} type="number" domain={[0,50]} fontSize={11} />
                <YAxis {...chartProps.yAxis} dataKey="statut" type="category" width={120} fontSize={9} />
                <Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} />
                <Legend {...chartProps.legend} />
                <Bar radius={[6, 6, 0, 0]} dataKey="taux_median" name="Médian" fill={C.primary} />
                <Bar radius={[6, 6, 0, 0]} dataKey="taux_q1" name="25% + modestes" fill={C.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="📊 Par revenu" darkMode={darkMode}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.taux_effort.par_revenu}>
                <CartesianGrid {...chartProps.cartesianGrid} />
                <XAxis dataKey="quartile" {...chartProps.xAxis} fontSize={9} />
                <YAxis {...chartProps.yAxis} domain={[0,35]} fontSize={11} />
                <Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} />
                <Bar radius={[6, 6, 0, 0]} dataKey="taux" fill={C.quaternary}>
                  {d.taux_effort.par_revenu.map((e,i)=><Cell key={i} fill={e.taux>25?C.secondary:C.quaternary}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>}

      {d.sources_par_onglet?.conditions_vie && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.conditions_vie}</p>
      )}
    </div>
  );
}
