import React, { useState, memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

// GeoJSON des 13 régions métropolitaines françaises (2016)
const FRANCE_REGIONS_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { code: "44", nom: "Grand Est" },
      geometry: {
        type: "Polygon",
        coordinates: [[[7.6,49.1],[8.2,49],[7.5,48.1],[7.8,47.6],[7.5,47.4],[6.8,47.5],[6.1,47.2],[5.4,47.3],[4.8,47.8],[4.1,48.4],[4.0,48.9],[4.2,49.4],[4.8,49.8],[5.4,49.5],[6.1,49.5],[6.8,49.5],[7.6,49.1]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "32", nom: "Hauts-de-France" },
      geometry: {
        type: "Polygon",
        coordinates: [[[1.6,50.1],[2.5,51],[3.2,50.8],[4.0,50.0],[4.2,49.4],[4.0,48.9],[3.4,49.1],[2.8,49.4],[2.2,49.5],[1.7,49.9],[1.6,50.1]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "11", nom: "Île-de-France" },
      geometry: {
        type: "Polygon",
        coordinates: [[[1.5,49.1],[2.0,49.2],[2.6,49.1],[3.0,49.0],[3.4,48.9],[3.4,48.4],[3.0,48.1],[2.5,48.1],[1.8,48.2],[1.4,48.4],[1.4,48.8],[1.5,49.1]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "28", nom: "Normandie" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-1.9,49.7],[-1.1,49.7],[0.2,49.4],[0.8,49.4],[1.5,49.2],[1.7,49.0],[1.4,48.6],[0.9,48.4],[0.2,48.4],[-0.4,48.5],[-0.8,48.6],[-1.2,48.8],[-1.5,49.1],[-1.9,49.4],[-1.9,49.7]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "53", nom: "Bretagne" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-4.8,48.4],[-4.5,48.7],[-3.9,48.8],[-3.0,48.8],[-2.2,48.6],[-1.5,48.5],[-1.0,48.4],[-1.0,48.0],[-1.3,47.7],[-1.8,47.3],[-2.5,47.3],[-3.2,47.5],[-4.0,47.7],[-4.5,47.8],[-4.8,48.4]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "52", nom: "Pays de la Loire" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-1.0,48.4],[-0.4,48.5],[0.2,48.4],[0.5,48.2],[0.8,47.8],[0.8,47.3],[0.5,46.9],[0.0,46.7],[-0.5,46.5],[-1.0,46.5],[-1.5,46.8],[-2.0,47.0],[-2.3,47.2],[-1.8,47.5],[-1.3,47.8],[-1.0,48.0],[-1.0,48.4]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "24", nom: "Centre-Val de Loire" },
      geometry: {
        type: "Polygon",
        coordinates: [[[0.8,48.4],[1.4,48.4],[1.8,48.2],[2.5,48.1],[3.0,48.1],[3.2,47.8],[3.0,47.3],[2.8,46.8],[2.4,46.6],[1.8,46.6],[1.2,46.8],[0.8,47.0],[0.5,47.3],[0.5,47.8],[0.8,48.2],[0.8,48.4]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "27", nom: "Bourgogne-Franche-Comté" },
      geometry: {
        type: "Polygon",
        coordinates: [[[3.0,48.1],[3.4,48.4],[4.1,48.4],[4.8,47.8],[5.4,47.3],[6.1,47.2],[6.8,47.5],[7.0,47.2],[6.8,46.8],[6.2,46.4],[5.5,46.2],[5.0,46.3],[4.5,46.4],[4.0,46.6],[3.5,46.8],[3.0,47.3],[3.2,47.8],[3.0,48.1]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "75", nom: "Nouvelle-Aquitaine" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-1.5,46.8],[-1.0,46.5],[-0.5,46.5],[0.0,46.7],[0.5,46.9],[1.2,46.8],[1.8,46.6],[2.4,46.6],[2.8,46.2],[2.5,45.5],[2.2,45.0],[1.8,44.5],[1.2,44.2],[0.5,44.2],[-0.2,44.4],[-0.8,44.3],[-1.2,44.5],[-1.5,45.0],[-1.4,45.5],[-1.3,46.0],[-1.5,46.5],[-1.5,46.8]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "84", nom: "Auvergne-Rhône-Alpes" },
      geometry: {
        type: "Polygon",
        coordinates: [[[3.0,46.8],[3.5,46.8],[4.0,46.6],[4.5,46.4],[5.0,46.3],[5.5,46.2],[6.2,46.4],[6.8,46.2],[7.2,45.9],[7.0,45.5],[6.6,45.0],[6.2,44.7],[5.5,44.5],[4.8,44.4],[4.2,44.5],[3.8,44.8],[3.2,45.0],[2.8,45.5],[2.8,46.2],[3.0,46.8]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "76", nom: "Occitanie" },
      geometry: {
        type: "Polygon",
        coordinates: [[[0.5,44.2],[1.2,44.2],[1.8,44.5],[2.2,45.0],[2.5,45.5],[2.8,45.5],[3.2,45.0],[3.8,44.8],[4.2,44.5],[4.2,44.0],[4.0,43.5],[3.5,43.0],[3.0,42.5],[2.5,42.4],[2.0,42.4],[1.5,42.5],[1.0,42.7],[0.5,42.9],[0.0,43.2],[-0.3,43.5],[0.0,44.0],[0.5,44.2]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "93", nom: "Provence-Alpes-Côte d'Azur" },
      geometry: {
        type: "Polygon",
        coordinates: [[[4.2,44.5],[4.8,44.4],[5.5,44.5],[6.2,44.7],[6.6,45.0],[7.0,45.5],[7.5,44.2],[7.2,43.8],[7.0,43.5],[6.5,43.2],[6.0,43.0],[5.5,43.2],[5.0,43.3],[4.5,43.4],[4.2,43.5],[4.0,43.8],[4.2,44.2],[4.2,44.5]]]
      }
    },
    {
      type: "Feature",
      properties: { code: "94", nom: "Corse" },
      geometry: {
        type: "Polygon",
        coordinates: [[[9.5,43.0],[9.5,42.5],[9.4,42.0],[9.2,41.4],[9.0,41.4],[8.6,41.5],[8.6,42.0],[8.8,42.5],[9.0,42.8],[9.3,43.0],[9.5,43.0]]]
      }
    }
  ]
};

// Couleurs par région pour le thème CFTC
const REGION_COLORS = {
  "44": "#1e3a5f",
  "32": "#2d5a87",
  "11": "#c41e3a",
  "28": "#3d7ab5",
  "53": "#1a4d6e",
  "52": "#4a90c2",
  "24": "#5ba3d9",
  "27": "#2c5282",
  "75": "#1e4d2b",
  "84": "#3182ce",
  "76": "#9b2335",
  "93": "#2b6cb0",
  "94": "#285e61",
};

// Données simulées CFTC par région
const CFTC_DATA = {
  "44": { adherents: 12450, sections: 89, evolution: "+3.2%" },
  "32": { adherents: 18230, sections: 124, evolution: "+2.8%" },
  "11": { adherents: 45670, sections: 312, evolution: "+1.5%" },
  "28": { adherents: 8920, sections: 67, evolution: "+4.1%" },
  "53": { adherents: 11340, sections: 82, evolution: "+2.9%" },
  "52": { adherents: 9870, sections: 71, evolution: "+3.5%" },
  "24": { adherents: 7650, sections: 58, evolution: "+2.1%" },
  "27": { adherents: 10230, sections: 76, evolution: "+2.4%" },
  "75": { adherents: 15890, sections: 118, evolution: "+3.8%" },
  "84": { adherents: 28450, sections: 198, evolution: "+2.6%" },
  "76": { adherents: 14670, sections: 109, evolution: "+4.2%" },
  "93": { adherents: 19340, sections: 142, evolution: "+2.3%" },
  "94": { adherents: 2890, sections: 24, evolution: "+5.1%" },
};

// Tooltip
const Tooltip = memo(({ region, data, position }) => {
  if (!region) return null;
  
  return (
    <div
      style={{
        position: "fixed",
        left: position.x + 15,
        top: position.y - 10,
        background: "linear-gradient(135deg, #1a365d 0%, #2d3748 100%)",
        color: "#fff",
        padding: "16px 20px",
        borderRadius: "12px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
        zIndex: 1000,
        minWidth: "220px",
        fontFamily: "'DM Sans', sans-serif",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.1)",
        transform: "translateY(-50%)",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div style={{ 
        fontSize: "16px", 
        fontWeight: "700", 
        marginBottom: "12px",
        color: "#63b3ed",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        paddingBottom: "10px",
        letterSpacing: "0.02em"
      }}>
        {region}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#a0aec0", fontSize: "13px" }}>Adhérents</span>
          <span style={{ fontWeight: "600", fontSize: "15px", color: "#fff" }}>
            {data?.adherents?.toLocaleString('fr-FR') || '—'}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#a0aec0", fontSize: "13px" }}>Sections</span>
          <span style={{ fontWeight: "600", fontSize: "15px", color: "#fff" }}>
            {data?.sections || '—'}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#a0aec0", fontSize: "13px" }}>Évolution</span>
          <span style={{ 
            fontWeight: "600", 
            fontSize: "15px",
            color: data?.evolution?.startsWith('+') ? "#68d391" : "#fc8181"
          }}>
            {data?.evolution || '—'}
          </span>
        </div>
      </div>
    </div>
  );
});

// Légende
const Legend = memo(() => (
  <div style={{
    position: "absolute",
    bottom: "24px",
    left: "24px",
    background: "rgba(26, 54, 93, 0.95)",
    padding: "16px 20px",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    fontFamily: "'DM Sans', sans-serif",
    border: "1px solid rgba(255,255,255,0.1)",
  }}>
    <div style={{ 
      fontSize: "12px", 
      fontWeight: "700", 
      color: "#63b3ed",
      marginBottom: "12px",
      textTransform: "uppercase",
      letterSpacing: "0.1em"
    }}>
      Densité syndicale
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {[
        { color: "#c41e3a", label: "Très forte (> 40k)" },
        { color: "#2d5a87", label: "Forte (20k - 40k)" },
        { color: "#3d7ab5", label: "Moyenne (10k - 20k)" },
        { color: "#5ba3d9", label: "Modérée (< 10k)" },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ 
            width: "16px", 
            height: "16px", 
            background: color, 
            borderRadius: "4px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }} />
          <span style={{ color: "#e2e8f0", fontSize: "12px" }}>{label}</span>
        </div>
      ))}
    </div>
  </div>
));

// Stats Panel
const StatsPanel = memo(({ selectedRegion, data }) => {
  const totalAdherents = Object.values(CFTC_DATA).reduce((sum, r) => sum + r.adherents, 0);
  const totalSections = Object.values(CFTC_DATA).reduce((sum, r) => sum + r.sections, 0);
  
  return (
    <div style={{
      position: "absolute",
      top: "24px",
      right: "24px",
      background: "rgba(26, 54, 93, 0.95)",
      padding: "20px 24px",
      borderRadius: "12px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      fontFamily: "'DM Sans', sans-serif",
      border: "1px solid rgba(255,255,255,0.1)",
      minWidth: "200px",
    }}>
      <div style={{ 
        fontSize: "12px", 
        fontWeight: "700", 
        color: "#63b3ed",
        marginBottom: "16px",
        textTransform: "uppercase",
        letterSpacing: "0.1em"
      }}>
        {selectedRegion || "France entière"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <div style={{ color: "#a0aec0", fontSize: "11px", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total adhérents
          </div>
          <div style={{ color: "#fff", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.02em" }}>
            {selectedRegion ? data?.adherents?.toLocaleString('fr-FR') : totalAdherents.toLocaleString('fr-FR')}
          </div>
        </div>
        <div>
          <div style={{ color: "#a0aec0", fontSize: "11px", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sections actives
          </div>
          <div style={{ color: "#fff", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.02em" }}>
            {selectedRegion ? data?.sections : totalSections}
          </div>
        </div>
        {selectedRegion && (
          <div>
            <div style={{ color: "#a0aec0", fontSize: "11px", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Évolution annuelle
            </div>
            <div style={{ 
              color: data?.evolution?.startsWith('+') ? "#68d391" : "#fc8181", 
              fontSize: "24px", 
              fontWeight: "700" 
            }}>
              {data?.evolution}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// Fonction utilitaire pour éclaircir une couleur
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

// Composant principal
export default function App() {
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const getRegionData = (regionName) => {
    const feature = FRANCE_REGIONS_GEOJSON.features.find(f => f.properties.nom === regionName);
    return feature ? CFTC_DATA[feature.properties.code] : null;
  };

  return (
    <div 
      style={{
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Grille arrière-plan */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(99, 179, 237, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99, 179, 237, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "50px 50px",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <header style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "24px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 100,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: "32px",
            fontWeight: "800",
            background: "linear-gradient(135deg, #63b3ed 0%, #4fd1c5 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}>
            CFTC France
          </h1>
          <p style={{
            margin: "4px 0 0 0",
            color: "#64748b",
            fontSize: "14px",
            letterSpacing: "0.02em",
          }}>
            Carte interactive des régions • Données 2024
          </p>
        </div>
        
        <button
          onClick={() => setSelectedRegion(null)}
          style={{
            background: selectedRegion ? "rgba(99, 179, 237, 0.1)" : "rgba(99, 179, 237, 0.2)",
            border: "1px solid rgba(99, 179, 237, 0.3)",
            color: "#63b3ed",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s ease",
          }}
        >
          Vue nationale
        </button>
      </header>

      {/* Carte */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: "60px",
      }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            center: [2.5, 46.5],
            scale: 2800,
          }}
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "900px",
            maxHeight: "calc(100vh - 100px)",
          }}
        >
          <ZoomableGroup center={[2.5, 46.5]} zoom={1}>
            <Geographies geography={FRANCE_REGIONS_GEOJSON}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const regionCode = geo.properties.code;
                  const regionName = geo.properties.nom;
                  const isHovered = hoveredRegion === regionName;
                  const isSelected = selectedRegion === regionName;
                  const baseColor = REGION_COLORS[regionCode] || "#3d7ab5";
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setHoveredRegion(regionName)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => setSelectedRegion(isSelected ? null : regionName)}
                      style={{
                        default: {
                          fill: isSelected ? "#f6ad55" : baseColor,
                          stroke: "#1a365d",
                          strokeWidth: 1,
                          outline: "none",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                        },
                        hover: {
                          fill: isSelected ? "#ed8936" : lightenColor(baseColor, 20),
                          stroke: "#63b3ed",
                          strokeWidth: 2,
                          outline: "none",
                          cursor: "pointer",
                          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                        },
                        pressed: {
                          fill: "#f6ad55",
                          stroke: "#63b3ed",
                          strokeWidth: 2,
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      {hoveredRegion && (
        <Tooltip
          region={hoveredRegion}
          data={getRegionData(hoveredRegion)}
          position={mousePosition}
        />
      )}

      {/* Légende */}
      <Legend />

      {/* Stats */}
      <StatsPanel
        selectedRegion={selectedRegion}
        data={getRegionData(selectedRegion)}
      />

      {/* Footer */}
      <footer style={{
        position: "absolute",
        bottom: "24px",
        right: "24px",
        color: "#475569",
        fontSize: "11px",
        textAlign: "right",
      }}>
        <div>© CFTC 2024 • Confédération Française des Travailleurs Chrétiens</div>
        <div style={{ marginTop: "2px", opacity: 0.7 }}>Carte interactive des implantations régionales</div>
      </footer>

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-50%) translateX(-10px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
