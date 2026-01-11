import React, { useState, memo } from "react";

// Tracés SVG des 13 régions métropolitaines françaises (2016)
const REGIONS = [
  {
    code: "44",
    nom: "Grand Est",
    path: "M 390 95 L 420 85 L 455 90 L 480 100 L 485 130 L 475 165 L 460 195 L 440 210 L 410 205 L 375 195 L 345 180 L 320 155 L 310 125 L 320 100 L 345 85 L 370 90 Z",
  },
  {
    code: "32",
    nom: "Hauts-de-France",
    path: "M 240 55 L 275 35 L 310 30 L 340 45 L 355 70 L 345 85 L 320 100 L 310 125 L 290 115 L 260 105 L 235 95 L 220 75 L 230 60 Z",
  },
  {
    code: "11",
    nom: "Île-de-France",
    path: "M 235 120 L 265 115 L 290 115 L 310 125 L 320 155 L 305 175 L 280 185 L 250 180 L 225 165 L 220 140 L 225 125 Z",
  },
  {
    code: "28",
    nom: "Normandie",
    path: "M 95 75 L 130 65 L 170 70 L 205 80 L 230 95 L 235 120 L 225 145 L 200 165 L 165 175 L 125 170 L 95 155 L 75 130 L 70 100 L 80 80 Z",
  },
  {
    code: "53",
    nom: "Bretagne",
    path: "M 15 130 L 45 115 L 80 105 L 95 120 L 95 155 L 85 180 L 70 205 L 45 220 L 20 215 L 5 190 L 0 160 L 5 140 Z",
  },
  {
    code: "52",
    nom: "Pays de la Loire",
    path: "M 95 155 L 125 170 L 165 175 L 185 195 L 190 230 L 180 265 L 155 290 L 120 295 L 85 280 L 60 255 L 55 220 L 70 205 L 85 180 Z",
  },
  {
    code: "24",
    nom: "Centre-Val de Loire",
    path: "M 200 165 L 225 165 L 250 180 L 280 185 L 305 175 L 325 200 L 320 240 L 300 275 L 265 290 L 225 285 L 195 265 L 185 230 L 185 195 Z",
  },
  {
    code: "27",
    nom: "Bourgogne-Franche-Comté",
    path: "M 320 155 L 345 180 L 375 195 L 410 205 L 440 210 L 460 230 L 455 265 L 435 300 L 400 320 L 360 315 L 330 295 L 310 260 L 320 225 L 325 200 L 320 175 Z",
  },
  {
    code: "75",
    nom: "Nouvelle-Aquitaine",
    path: "M 120 295 L 155 290 L 180 300 L 225 310 L 260 330 L 280 370 L 270 420 L 245 465 L 200 490 L 150 485 L 105 460 L 80 420 L 75 370 L 85 325 L 100 300 Z",
  },
  {
    code: "84",
    nom: "Auvergne-Rhône-Alpes",
    path: "M 300 275 L 330 295 L 360 315 L 400 320 L 435 335 L 465 360 L 475 400 L 455 440 L 420 465 L 375 470 L 335 455 L 305 420 L 290 375 L 280 330 L 285 300 Z",
  },
  {
    code: "76",
    nom: "Occitanie",
    path: "M 150 485 L 200 490 L 245 465 L 280 450 L 305 420 L 335 455 L 355 490 L 350 530 L 320 560 L 275 575 L 225 570 L 180 555 L 145 530 L 130 500 L 140 485 Z",
  },
  {
    code: "93",
    nom: "Provence-Alpes-Côte d'Azur",
    path: "M 355 455 L 375 470 L 420 465 L 455 440 L 480 450 L 500 480 L 495 520 L 470 550 L 430 560 L 385 555 L 355 535 L 350 500 L 355 470 Z",
  },
  {
    code: "94",
    nom: "Corse",
    path: "M 540 485 L 550 500 L 555 540 L 545 580 L 530 605 L 515 600 L 510 560 L 515 520 L 525 495 L 535 485 Z",
  },
];

// Couleurs par région
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

// Données CFTC par région
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
        left: Math.min(position.x + 15, window.innerWidth - 250),
        top: position.y - 80,
        background: "linear-gradient(135deg, #1a365d 0%, #2d3748 100%)",
        color: "#fff",
        padding: "16px 20px",
        borderRadius: "12px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        zIndex: 1000,
        minWidth: "200px",
        fontFamily: "'DM Sans', sans-serif",
        border: "1px solid rgba(255,255,255,0.1)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: "15px",
          fontWeight: "700",
          marginBottom: "12px",
          color: "#63b3ed",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          paddingBottom: "10px",
        }}
      >
        {region}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#a0aec0", fontSize: "13px" }}>Adhérents</span>
          <span style={{ fontWeight: "600", fontSize: "14px" }}>
            {data?.adherents?.toLocaleString("fr-FR") || "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#a0aec0", fontSize: "13px" }}>Sections</span>
          <span style={{ fontWeight: "600", fontSize: "14px" }}>
            {data?.sections || "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#a0aec0", fontSize: "13px" }}>Évolution</span>
          <span
            style={{
              fontWeight: "600",
              fontSize: "14px",
              color: data?.evolution?.startsWith("+") ? "#68d391" : "#fc8181",
            }}
          >
            {data?.evolution || "—"}
          </span>
        </div>
      </div>
    </div>
  );
});

// Légende
const Legend = memo(() => (
  <div
    style={{
      position: "absolute",
      bottom: "24px",
      left: "24px",
      background: "rgba(26, 54, 93, 0.95)",
      padding: "16px 20px",
      borderRadius: "12px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      fontFamily: "'DM Sans', sans-serif",
      border: "1px solid rgba(255,255,255,0.1)",
    }}
  >
    <div
      style={{
        fontSize: "11px",
        fontWeight: "700",
        color: "#63b3ed",
        marginBottom: "12px",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
      }}
    >
      Densité syndicale
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {[
        { color: "#c41e3a", label: "Très forte (> 40k)" },
        { color: "#2d5a87", label: "Forte (20k - 40k)" },
        { color: "#3d7ab5", label: "Moyenne (10k - 20k)" },
        { color: "#5ba3d9", label: "Modérée (< 10k)" },
      ].map(({ color, label }) => (
        <div
          key={label}
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              background: color,
              borderRadius: "3px",
            }}
          />
          <span style={{ color: "#e2e8f0", fontSize: "11px" }}>{label}</span>
        </div>
      ))}
    </div>
  </div>
));

// Stats Panel
const StatsPanel = memo(({ selectedRegion, data }) => {
  const totalAdherents = Object.values(CFTC_DATA).reduce(
    (sum, r) => sum + r.adherents,
    0
  );
  const totalSections = Object.values(CFTC_DATA).reduce(
    (sum, r) => sum + r.sections,
    0
  );

  return (
    <div
      style={{
        position: "absolute",
        top: "100px",
        right: "24px",
        background: "rgba(26, 54, 93, 0.95)",
        padding: "20px 24px",
        borderRadius: "12px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        fontFamily: "'DM Sans', sans-serif",
        border: "1px solid rgba(255,255,255,0.1)",
        minWidth: "180px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: "700",
          color: "#63b3ed",
          marginBottom: "16px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {selectedRegion || "France entière"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <div
            style={{
              color: "#a0aec0",
              fontSize: "10px",
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Total adhérents
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: "26px",
              fontWeight: "700",
              letterSpacing: "-0.02em",
            }}
          >
            {selectedRegion
              ? data?.adherents?.toLocaleString("fr-FR")
              : totalAdherents.toLocaleString("fr-FR")}
          </div>
        </div>
        <div>
          <div
            style={{
              color: "#a0aec0",
              fontSize: "10px",
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Sections actives
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: "26px",
              fontWeight: "700",
              letterSpacing: "-0.02em",
            }}
          >
            {selectedRegion ? data?.sections : totalSections}
          </div>
        </div>
        {selectedRegion && (
          <div>
            <div
              style={{
                color: "#a0aec0",
                fontSize: "10px",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Évolution annuelle
            </div>
            <div
              style={{
                color: data?.evolution?.startsWith("+")
                  ? "#68d391"
                  : "#fc8181",
                fontSize: "22px",
                fontWeight: "700",
              }}
            >
              {data?.evolution}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// Fonction pour éclaircir une couleur
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
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
    const region = REGIONS.find((r) => r.nom === regionName);
    return region ? CFTC_DATA[region.code] : null;
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background:
          "linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Grille arrière-plan */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99, 179, 237, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 179, 237, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 100,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: "800",
              background: "linear-gradient(135deg, #63b3ed 0%, #4fd1c5 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
            }}
          >
            CFTC France
          </h1>
          <p
            style={{
              margin: "4px 0 0 0",
              color: "#64748b",
              fontSize: "13px",
              letterSpacing: "0.02em",
            }}
          >
            Carte interactive des régions • Données 2024
          </p>
        </div>

        <button
          onClick={() => setSelectedRegion(null)}
          style={{
            background: selectedRegion
              ? "rgba(99, 179, 237, 0.1)"
              : "rgba(99, 179, 237, 0.2)",
            border: "1px solid rgba(99, 179, 237, 0.3)",
            color: "#63b3ed",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
            transition: "all 0.2s ease",
          }}
        >
          Vue nationale
        </button>
      </header>

      {/* Carte SVG */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "40px",
        }}
      >
        <svg
          viewBox="-20 0 600 650"
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "700px",
            maxHeight: "calc(100vh - 80px)",
          }}
        >
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="8"
                floodColor="#000"
                floodOpacity="0.3"
              />
            </filter>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#shadow)">
            {REGIONS.map((region) => {
              const isHovered = hoveredRegion === region.nom;
              const isSelected = selectedRegion === region.nom;
              const baseColor = REGION_COLORS[region.code];

              return (
                <path
                  key={region.code}
                  d={region.path}
                  fill={
                    isSelected
                      ? "#f6ad55"
                      : isHovered
                      ? lightenColor(baseColor, 25)
                      : baseColor
                  }
                  stroke={isHovered || isSelected ? "#63b3ed" : "#1a365d"}
                  strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                  style={{
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    filter: isHovered ? "url(#glow)" : "none",
                  }}
                  onMouseEnter={() => setHoveredRegion(region.nom)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() =>
                    setSelectedRegion(
                      selectedRegion === region.nom ? null : region.nom
                    )
                  }
                />
              );
            })}
          </g>

          {/* Labels */}
          {REGIONS.filter((r) => !["11", "53", "94"].includes(r.code)).map(
            (region) => {
              const centers = {
                "44": { x: 390, y: 145 },
                "32": { x: 285, y: 70 },
                "28": { x: 150, y: 120 },
                "52": { x: 120, y: 230 },
                "24": { x: 255, y: 225 },
                "27": { x: 380, y: 245 },
                "75": { x: 170, y: 390 },
                "84": { x: 380, y: 380 },
                "76": { x: 260, y: 520 },
                "93": { x: 420, y: 505 },
              };
              const center = centers[region.code];
              if (!center) return null;

              return (
                <text
                  key={`label-${region.code}`}
                  x={center.x}
                  y={center.y}
                  textAnchor="middle"
                  style={{
                    fontSize: "10px",
                    fill: "rgba(255,255,255,0.6)",
                    fontWeight: "500",
                    pointerEvents: "none",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {region.nom.length > 15
                    ? region.nom.split("-")[0]
                    : region.nom}
                </text>
              );
            }
          )}
        </svg>
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

      {/* Stats Panel */}
      <StatsPanel
        selectedRegion={selectedRegion}
        data={getRegionData(selectedRegion)}
      />

      {/* Footer */}
      <footer
        style={{
          position: "absolute",
          bottom: "24px",
          right: "24px",
          color: "#475569",
          fontSize: "10px",
          textAlign: "right",
        }}
      >
        <div>
          © CFTC 2024 • Confédération Française des Travailleurs Chrétiens
        </div>
        <div style={{ marginTop: "2px", opacity: 0.7 }}>
          Carte interactive des implantations régionales
        </div>
      </footer>

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
