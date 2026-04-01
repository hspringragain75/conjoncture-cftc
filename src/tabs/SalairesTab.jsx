import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', pink: '#ec4899', gray: '#6b7280'
};

export default function SalairesTab({d, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      <Card title="💰 Salaire médian net" darkMode={darkMode} favoriId="salaire_median" isFavori={fp.isFavori?.("salaire_median")} toggleFavori={fp.toggleFavori}>
        <ResponsiveContainer width="100%" height={200}><BarChart data={d.salaire_median.evolution}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} /><YAxis {...chartProps.yAxis} domain={[1800,2300]} fontSize={11} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}€`} /><Bar radius={[6, 6, 0, 0]} dataKey="montant" fill={C.primary} /></BarChart></ResponsiveContainer>
        <p className="text-center text-xl font-bold text-green-600 mt-2">{d.salaire_median.montant_2024}€</p>
      </Card>
      <Card title="👫 Écart H/F (EQTP)" darkMode={darkMode}>
        <ResponsiveContainer width="100%" height={200}><LineChart data={d.ecart_hommes_femmes.evolution}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} /><YAxis {...chartProps.yAxis} domain={[10,20]} fontSize={11} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} /><Line strokeLinecap="round" strokeLinejoin="round" dataKey="ecart" stroke={C.pink} strokeWidth={3} /></LineChart></ResponsiveContainer>
        <div className="flex justify-around text-xs mt-2"><div className="text-center"><span className={darkMode ? "text-gray-400" : "text-gray-500"}>Global</span><br/><b>{d.ecart_hommes_femmes.ecart_global}%</b></div><div className="text-center"><span className={darkMode ? "text-gray-400" : "text-gray-500"}>EQTP</span><br/><b className="text-pink-600">{d.ecart_hommes_femmes.ecart_eqtp}%</b></div><div className="text-center"><span className={darkMode ? "text-gray-400" : "text-gray-500"}>Poste égal</span><br/><b className="text-green-600">{d.ecart_hommes_femmes.ecart_poste_comparable}%</b></div></div>
      </Card>
      <Card title="🏭 Salaires par secteur" darkMode={darkMode} favoriId="ecart_hf" isFavori={fp.isFavori?.("ecart_hf")} toggleFavori={fp.toggleFavori}>
        <ResponsiveContainer width="100%" height={200}><BarChart data={d.salaires_secteur} layout="vertical"><CartesianGrid {...chartProps.cartesianGrid} /><XAxis {...chartProps.xAxis} type="number" fontSize={11} /><YAxis {...chartProps.yAxis} dataKey="secteur" type="category" width={70} fontSize={10} /><Tooltip {...chartProps.tooltip} formatter={v=>`${v}€`} /><Bar radius={[6, 6, 0, 0]} dataKey="salaire" fill={C.primary} /></BarChart></ResponsiveContainer>
      </Card>
      <Card title="🎁 PPV" darkMode={darkMode}>
        <div className="grid grid-cols-2 gap-2 p-2">
          <div className={`text-center p-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}><p className="text-xs">Bénéf. 2023</p><p className="text-xl font-bold text-[#0d4093]">{d.ppv.beneficiaires_2023}%</p></div>
          <div className={`text-center p-3 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}><p className="text-xs">Bénéf. 2024</p><p className="text-xl font-bold text-orange-600">{d.ppv.beneficiaires_2024}%</p></div>
          <div className={`text-center p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}><p className="text-xs">Montant moy.</p><p className="text-xl font-bold text-green-600">{d.ppv.montant_moyen}€</p></div>
          <div className={`text-center p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}><p className="text-xs">Total 2024</p><p className="text-xl font-bold">{d.ppv.montant_total_2024}Md€</p></div>
        </div>
      </Card>
      
      {d.sources_par_onglet?.salaires && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200 col-span-2">📚 Sources : {d.sources_par_onglet.salaires}</p>
      )}
    </div>
  );
}
