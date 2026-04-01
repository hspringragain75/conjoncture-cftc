import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', purple: '#8b5cf6', cyan: '#06b6d4', gray: '#6b7280'
};

export default function TerritoiresTab({d, darkMode}) {
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
