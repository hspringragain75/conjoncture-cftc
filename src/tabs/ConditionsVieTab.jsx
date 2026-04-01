import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
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
      <Card title="📊 Inflation par poste (%)" darkMode={darkMode} favoriId="inflation" isFavori={fp.isFavori?.("inflation")} toggleFavori={fp.toggleFavori}>
        <ResponsiveContainer width="100%" height={220}><BarChart data={d.inflation_detail}><CartesianGrid {...chartProps.cartesianGrid} /><XAxis dataKey="poste" {...chartProps.xAxis} fontSize={11} /><YAxis {...chartProps.yAxis} fontSize={11} /><Tooltip {...chartProps.tooltip} /><Legend {...chartProps.legend} /><Bar radius={[6, 6, 0, 0]} dataKey="val2022" name="2022" fill={C.secondary} /><Bar radius={[6, 6, 0, 0]} dataKey="val2023" name="2023" fill={C.quaternary} /><Bar radius={[6, 6, 0, 0]} dataKey="val2024" name="2024" fill={C.tertiary} /></BarChart></ResponsiveContainer>
      </Card>
      <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} border-l-4 border-yellow-400 p-4 rounded`}><h3 className="font-semibold text-yellow-800">📖 Note de lecture</h3><ul className="mt-2 text-sm text-yellow-700 space-y-1"><li>• Alimentation : pic en 2023 (+11.8%), retour à la normale en 2024</li><li>• Services : hausse régulière (~2.7% par an)</li><li>• Loyers : progression continue (+2.8%)</li></ul></div>
      
      {d.sources_par_onglet?.inflation && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200">📚 Sources : {d.sources_par_onglet.inflation}</p>
      )}
    </div>
  );
}
}
