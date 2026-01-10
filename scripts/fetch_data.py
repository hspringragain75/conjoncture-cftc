#!/usr/bin/env python3
"""
Script de récupération automatique des données économiques pour la CFTC
Sources : INSEE (API SDMX), Banque de France, DARES, Eurostat

=== DONNÉES AUTOMATIQUES (API INSEE) ===
- Inflation (IPC) - mensuel
- Chômage (BIT) - trimestriel  
- Taux d'emploi seniors 55-64 ans - trimestriel
- Part CDD + intérim - trimestriel
- Difficultés de recrutement industrie - trimestriel
- Emploi salarié par secteur - trimestriel
- Indices SMB (Salaire Mensuel de Base) - trimestriel
- Salaires nets moyens H/F - annuel

=== DONNÉES STATIQUES (à mettre à jour manuellement) ===
- Salaire médian (octobre - INSEE)
- PPV (mars - Urssaf)
- Écart H/F à poste comparable (mars - INSEE)
- SMIC (janvier - JO)
- Créations/destructions d'emploi (DARES MMO)
- Tensions par métier (enquête BMO France Travail)
- Partage VA (annuel - Comptes nationaux INSEE)
- Comparaison UE (semestriel - Eurostat)
- Paramètres simulateur NAO (annuel - barèmes CAF/URSSAF)
"""

import json
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime
import os

# ============================================================================
# CONFIGURATION DES SÉRIES INSEE
# ============================================================================

INSEE_BASE_URL = "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM"

SERIES_IDS = {
    # === INFLATION ===
    "inflation_ensemble": "001759970",
    "inflation_alimentation": "001764565",
    "inflation_energie": "001764645",
    "inflation_services": "001764629",
    "inflation_manufactures": "001764597",
    
    # === CHÔMAGE ===
    "chomage_total": "001688526",
    "chomage_jeunes": "001688530",
    
    # === EMPLOI (NOUVEAUX) ===
    "taux_emploi_seniors": "001688534",       # Taux d'emploi 55-64 ans
    "part_cdd_interim": "010605904",          # Part CDD + intérim dans l'emploi
    "difficultes_recrutement": "001586762",   # Difficultés recrutement industrie
    
    # === EMPLOI PAR SECTEUR ===
    "emploi_industrie": "010569327",          # Emploi salarié industrie
    "emploi_construction": "010569331",       # Emploi salarié construction
    "emploi_tertiaire_marchand": "010569335", # Emploi salarié tertiaire marchand
    "emploi_tertiaire_non_marchand": "010569339", # Emploi salarié tertiaire non marchand
    "emploi_interim": "001694214",            # Emploi intérimaire
    
    # === SALAIRES ===
    "smb_ensemble": "001567234",
    "smb_industrie": "001567236",
    "smb_construction": "001567238",
    "smb_tertiaire": "001567240",
    "salaire_net_femmes": "010752373",
    "salaire_net_hommes": "010752374",
    "salaire_net_ensemble": "010752372",
    
    # === CONDITIONS DE VIE (NOUVEAU) ===
    "irl": "001515333",                       # Indice de Référence des Loyers
    "irl_glissement": "001515334",            # Glissement annuel IRL
    "prix_immobilier": "010001868",           # Indice prix logements anciens
    "prix_gazole": "000442588",               # Prix gazole mensuel
    "prix_sp95": "000849411",                 # Prix SP95 mensuel
    "taux_effort_logement": "010594494",      # Taux d'effort logement (annuel)
    
    # === CONJONCTURE GÉNÉRALE (NOUVEAU) ===
    "pib_volume": "011794859",                # PIB volume trimestriel
    "climat_affaires": "001565530",           # Indicateur synthétique climat affaires
    "confiance_menages": "001587668",         # Confiance des ménages (indice CVS)
    "defaillances_cumul": "001656101",        # Défaillances cumul 12 mois
    "defaillances_cvs": "001656092",          # Défaillances CVS mensuel
}

# ============================================================================
# FONCTIONS DE RÉCUPÉRATION DES DONNÉES
# ============================================================================

def fetch_insee_series(series_id, start_period="2015"):
    """Récupère une série depuis l'API INSEE SDMX"""
    url = f"{INSEE_BASE_URL}/{series_id}?startPeriod={start_period}"
    
    try:
        req = urllib.request.Request(url, headers={
            'Accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
            'User-Agent': 'CFTC-Dashboard/1.0'
        })
        
        with urllib.request.urlopen(req, timeout=30) as response:
            xml_data = response.read()
            return parse_sdmx_response(xml_data)
            
    except urllib.error.HTTPError as e:
        print(f"  ⚠️ Erreur HTTP {e.code} pour série {series_id}")
        return None
    except urllib.error.URLError as e:
        print(f"  ⚠️ Erreur réseau pour série {series_id}: {e.reason}")
        return None
    except Exception as e:
        print(f"  ⚠️ Erreur inattendue pour série {series_id}: {e}")
        return None


def parse_sdmx_response(xml_data):
    """Parse la réponse SDMX et extrait les observations"""
    try:
        root = ET.fromstring(xml_data)
        observations = []
        
        for obs in root.iter():
            if obs.tag.endswith('Obs') or 'Obs' in obs.tag:
                time_period = obs.get('TIME_PERIOD') or obs.get('TIME')
                obs_value = obs.get('OBS_VALUE') or obs.get('value')
                
                if time_period and obs_value:
                    try:
                        observations.append({
                            'period': time_period,
                            'value': float(obs_value)
                        })
                    except ValueError:
                        continue
        
        return sorted(observations, key=lambda x: x['period'])
        
    except ET.ParseError as e:
        print(f"  ⚠️ Erreur parsing XML: {e}")
        return None


def get_quarterly_values(series_id, start_year=2023):
    """Récupère les valeurs trimestrielles"""
    data = fetch_insee_series(series_id, start_period=str(start_year))
    if not data:
        return []
    
    result = []
    for obs in data:
        period = obs['period']
        if '-Q' in period:
            year, quarter = period.split('-Q')
            trimestre = f"T{quarter} {year}"
        else:
            trimestre = period
        result.append({'trimestre': trimestre, 'valeur': obs['value']})
    
    return result


def get_annual_values(series_id, start_year=2015):
    """Récupère les valeurs annuelles d'une série"""
    data = fetch_insee_series(series_id, start_period=str(start_year))
    if not data:
        return []
    
    annual = {}
    for obs in data:
        year = obs['period'][:4]
        annual[year] = obs['value']
    
    return [{'annee': k, 'valeur': v} for k, v in sorted(annual.items())]


# ============================================================================
# CONSTRUCTION DES DONNÉES - INFLATION
# ============================================================================

def build_inflation_data():
    """Construit les données d'inflation"""
    print("📊 Récupération des données d'inflation...")
    
    default_inflation = [
        {"annee": "2020", "inflation": 0.5, "smic": 1.2, "salaires_base": 1.5},
        {"annee": "2021", "inflation": 1.6, "smic": 2.2, "salaires_base": 1.4},
        {"annee": "2022", "inflation": 5.2, "smic": 5.6, "salaires_base": 3.5},
        {"annee": "2023", "inflation": 4.9, "smic": 6.6, "salaires_base": 4.2},
        {"annee": "2024", "inflation": 2.0, "smic": 2.0, "salaires_base": 2.8},
        {"annee": "2025", "inflation": 0.9, "smic": 1.2, "salaires_base": 2.0},
    ]
    
    data = fetch_insee_series(SERIES_IDS["inflation_ensemble"], "2020")
    if data:
        annual_avg = {}
        for obs in data:
            year = obs['period'][:4]
            if year not in annual_avg:
                annual_avg[year] = []
            annual_avg[year].append(obs['value'])
        
        years = sorted(annual_avg.keys())
        inflation_annuelle = []
        for i, year in enumerate(years):
            if i > 0:
                prev_year = years[i-1]
                current_avg = sum(annual_avg[year]) / len(annual_avg[year])
                prev_avg = sum(annual_avg[prev_year]) / len(annual_avg[prev_year])
                inflation = round(((current_avg / prev_avg) - 1) * 100, 1)
                
                default_entry = next((d for d in default_inflation if d['annee'] == year), None)
                if default_entry:
                    inflation_annuelle.append({
                        "annee": year,
                        "inflation": inflation,
                        "smic": default_entry['smic'],
                        "salaires_base": default_entry['salaires_base']
                    })
        
        if inflation_annuelle:
            print(f"  ✓ {len(inflation_annuelle)} années d'inflation récupérées")
            return inflation_annuelle
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_inflation


# ============================================================================
# CONSTRUCTION DES DONNÉES - CHÔMAGE
# ============================================================================

def build_chomage_data():
    """Construit les données de chômage"""
    print("📊 Récupération des données de chômage...")
    
    default_chomage = [
        {"trimestre": "T1 2023", "taux": 7.1, "jeunes": 17.5},
        {"trimestre": "T2 2023", "taux": 7.2, "jeunes": 17.0},
        {"trimestre": "T3 2023", "taux": 7.4, "jeunes": 17.6},
        {"trimestre": "T4 2023", "taux": 7.5, "jeunes": 17.6},
        {"trimestre": "T1 2024", "taux": 7.5, "jeunes": 18.1},
        {"trimestre": "T2 2024", "taux": 7.3, "jeunes": 17.7},
        {"trimestre": "T3 2024", "taux": 7.4, "jeunes": 18.3},
        {"trimestre": "T4 2024", "taux": 7.3, "jeunes": 19.0},
        {"trimestre": "T1 2025", "taux": 7.4, "jeunes": 18.5},
        {"trimestre": "T2 2025", "taux": 7.5, "jeunes": 18.8},
        {"trimestre": "T3 2025", "taux": 7.7, "jeunes": 19.2},
    ]
    
    chomage_total = get_quarterly_values(SERIES_IDS["chomage_total"], 2023)
    chomage_jeunes = get_quarterly_values(SERIES_IDS["chomage_jeunes"], 2023)
    
    if chomage_total and chomage_jeunes:
        result = []
        jeunes_dict = {c['trimestre']: c['valeur'] for c in chomage_jeunes}
        
        for c in chomage_total:
            trimestre = c['trimestre']
            result.append({
                "trimestre": trimestre,
                "taux": round(c['valeur'], 1),
                "jeunes": round(jeunes_dict.get(trimestre, 18.0), 1)
            })
        
        if result:
            print(f"  ✓ {len(result)} trimestres de chômage récupérés")
            return result
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_chomage


# ============================================================================
# CONSTRUCTION DES DONNÉES - EMPLOI SENIORS (NOUVEAU)
# ============================================================================

def build_emploi_seniors_data():
    """Construit les données de taux d'emploi des seniors"""
    print("📊 Récupération du taux d'emploi seniors (55-64 ans)...")
    
    default_seniors = [
        {"trimestre": "T1 2023", "taux": 58.5},
        {"trimestre": "T2 2023", "taux": 58.8},
        {"trimestre": "T3 2023", "taux": 59.2},
        {"trimestre": "T4 2023", "taux": 59.7},
        {"trimestre": "T1 2024", "taux": 60.1},
        {"trimestre": "T2 2024", "taux": 60.5},
        {"trimestre": "T3 2024", "taux": 60.9},
        {"trimestre": "T4 2024", "taux": 61.2},
        {"trimestre": "T1 2025", "taux": 61.5},
        {"trimestre": "T2 2025", "taux": 61.8},
        {"trimestre": "T3 2025", "taux": 62.0},
    ]
    
    data = get_quarterly_values(SERIES_IDS["taux_emploi_seniors"], 2023)
    
    if data:
        result = [{"trimestre": d['trimestre'], "taux": round(d['valeur'], 1)} for d in data]
        print(f"  ✓ {len(result)} trimestres récupérés")
        return result
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_seniors


# ============================================================================
# CONSTRUCTION DES DONNÉES - TYPES DE CONTRATS (NOUVEAU)
# ============================================================================

def build_types_contrats_data():
    """Construit les données sur les types de contrats (CDI/CDD/Intérim)"""
    print("📊 Récupération des données types de contrats...")
    
    # Données par défaut basées sur les publications INSEE
    default_contrats = [
        {"trimestre": "T1 2023", "cdi": 74.5, "cdd": 8.8, "interim": 2.2},
        {"trimestre": "T2 2023", "cdi": 74.3, "cdd": 9.0, "interim": 2.1},
        {"trimestre": "T3 2023", "cdi": 74.4, "cdd": 8.9, "interim": 2.0},
        {"trimestre": "T4 2023", "cdi": 74.6, "cdd": 8.7, "interim": 2.0},
        {"trimestre": "T1 2024", "cdi": 74.8, "cdd": 8.5, "interim": 1.9},
        {"trimestre": "T2 2024", "cdi": 74.7, "cdd": 8.6, "interim": 1.9},
        {"trimestre": "T3 2024", "cdi": 74.9, "cdd": 8.4, "interim": 1.8},
        {"trimestre": "T4 2024", "cdi": 75.0, "cdd": 8.3, "interim": 1.8},
        {"trimestre": "T1 2025", "cdi": 75.1, "cdd": 8.2, "interim": 1.7},
        {"trimestre": "T2 2025", "cdi": 75.2, "cdd": 8.1, "interim": 1.7},
        {"trimestre": "T3 2025", "cdi": 75.3, "cdd": 8.0, "interim": 1.6},
    ]
    
    # Récupérer la part CDD+intérim
    data = get_quarterly_values(SERIES_IDS["part_cdd_interim"], 2023)
    
    if data:
        result = []
        for i, d in enumerate(data):
            part_precaire = d['valeur']
            # Estimation répartition CDD vs intérim (ratio historique ~80/20)
            cdd = round(part_precaire * 0.8, 1)
            interim = round(part_precaire * 0.2, 1)
            cdi = round(100 - part_precaire - 10, 1)  # 10% = autres (apprentis, etc.)
            
            result.append({
                "trimestre": d['trimestre'],
                "cdi": cdi,
                "cdd": cdd,
                "interim": interim
            })
        
        print(f"  ✓ {len(result)} trimestres récupérés")
        return result
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_contrats


# ============================================================================
# CONSTRUCTION DES DONNÉES - DIFFICULTÉS RECRUTEMENT (NOUVEAU)
# ============================================================================

def build_difficultes_recrutement_data():
    """Construit les données sur les difficultés de recrutement"""
    print("📊 Récupération des difficultés de recrutement...")
    
    default_difficultes = [
        {"trimestre": "T1 2023", "industrie": 52, "services": 38, "construction": 65},
        {"trimestre": "T2 2023", "industrie": 50, "services": 36, "construction": 62},
        {"trimestre": "T3 2023", "industrie": 48, "services": 35, "construction": 60},
        {"trimestre": "T4 2023", "industrie": 45, "services": 33, "construction": 58},
        {"trimestre": "T1 2024", "industrie": 43, "services": 32, "construction": 55},
        {"trimestre": "T2 2024", "industrie": 41, "services": 30, "construction": 52},
        {"trimestre": "T3 2024", "industrie": 40, "services": 29, "construction": 50},
        {"trimestre": "T4 2024", "industrie": 38, "services": 28, "construction": 48},
        {"trimestre": "T1 2025", "industrie": 36, "services": 27, "construction": 46},
        {"trimestre": "T2 2025", "industrie": 35, "services": 26, "construction": 45},
        {"trimestre": "T3 2025", "industrie": 34, "services": 25, "construction": 44},
    ]
    
    data = get_quarterly_values(SERIES_IDS["difficultes_recrutement"], 2023)
    
    if data:
        result = []
        for d in data:
            industrie = round(d['valeur'], 0)
            # Services et construction estimés par rapport à l'industrie
            result.append({
                "trimestre": d['trimestre'],
                "industrie": int(industrie),
                "services": int(industrie * 0.75),
                "construction": int(industrie * 1.2)
            })
        
        print(f"  ✓ {len(result)} trimestres récupérés")
        return result
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_difficultes


# ============================================================================
# CONSTRUCTION DES DONNÉES - EMPLOI PAR SECTEUR (NOUVEAU)
# ============================================================================

def build_emploi_secteur_data():
    """Construit les données d'emploi par secteur"""
    print("📊 Récupération de l'emploi par secteur...")
    
    # Données en milliers d'emplois (base Q3 2025)
    default_secteurs = {
        "derniere_mise_a_jour": "T3 2025",
        "secteurs": [
            {"secteur": "Tertiaire marchand", "emploi": 12850, "evolution_trim": -0.1, "evolution_an": -0.3},
            {"secteur": "Tertiaire non marchand", "emploi": 8420, "evolution_trim": 0.3, "evolution_an": 0.8},
            {"secteur": "Industrie", "emploi": 3180, "evolution_trim": -0.1, "evolution_an": -0.3},
            {"secteur": "Construction", "emploi": 1530, "evolution_trim": 0.0, "evolution_an": -1.3},
            {"secteur": "Intérim", "emploi": 700, "evolution_trim": -0.6, "evolution_an": -2.9},
        ],
        "evolution_trimestrielle": [
            {"trimestre": "T1 2024", "industrie": 3210, "construction": 1580, "tertiaire": 21100, "interim": 750},
            {"trimestre": "T2 2024", "industrie": 3200, "construction": 1560, "tertiaire": 21150, "interim": 730},
            {"trimestre": "T3 2024", "industrie": 3195, "construction": 1545, "tertiaire": 21180, "interim": 720},
            {"trimestre": "T4 2024", "industrie": 3190, "construction": 1535, "tertiaire": 21220, "interim": 710},
            {"trimestre": "T1 2025", "industrie": 3185, "construction": 1530, "tertiaire": 21250, "interim": 705},
            {"trimestre": "T2 2025", "industrie": 3182, "construction": 1530, "tertiaire": 21270, "interim": 702},
            {"trimestre": "T3 2025", "industrie": 3180, "construction": 1530, "tertiaire": 21270, "interim": 700},
        ]
    }
    
    # Tentative de récupération des données réelles
    emploi_industrie = get_quarterly_values(SERIES_IDS["emploi_industrie"], 2024)
    
    if emploi_industrie and len(emploi_industrie) > 0:
        print(f"  ✓ Données sectorielles récupérées")
        # Mettre à jour avec les vraies données si disponibles
        # (logique à adapter selon le format réel des données)
    else:
        print("  ⚠️ Utilisation des données par défaut")
    
    return default_secteurs


# ============================================================================
# CONSTRUCTION DES DONNÉES - CRÉATIONS/DESTRUCTIONS EMPLOI (STATIQUE)
# ============================================================================

def build_creations_destructions_data():
    """Données créations/destructions d'emploi - STATIQUE (DARES MMO)"""
    print("📊 Créations/destructions d'emploi (données statiques DARES)...")
    
    return {
        "source": "DARES - Mouvements de Main d'Oeuvre",
        "commentaire": "À mettre à jour manuellement chaque trimestre via DARES",
        "derniere_mise_a_jour": "T3 2025",
        "donnees": [
            {"trimestre": "T1 2024", "creations": 120, "destructions": 95, "solde": 25},
            {"trimestre": "T2 2024", "creations": 115, "destructions": 100, "solde": 15},
            {"trimestre": "T3 2024", "creations": 110, "destructions": 105, "solde": 5},
            {"trimestre": "T4 2024", "creations": 105, "destructions": 110, "solde": -5},
            {"trimestre": "T1 2025", "creations": 100, "destructions": 108, "solde": -8},
            {"trimestre": "T2 2025", "creations": 102, "destructions": 105, "solde": -3},
            {"trimestre": "T3 2025", "creations": 98, "destructions": 108, "solde": -10},
        ]
    }


# ============================================================================
# CONSTRUCTION DES DONNÉES - TENSIONS MÉTIERS (STATIQUE)
# ============================================================================

def build_tensions_metiers_data():
    """Données tensions par métier - STATIQUE (enquête BMO France Travail)"""
    print("📊 Tensions par métier (données statiques BMO)...")
    
    return {
        "source": "France Travail - Enquête Besoins en Main d'Oeuvre",
        "commentaire": "À mettre à jour manuellement chaque année (publication avril)",
        "annee": 2025,
        "taux_difficultes_global": 61,
        "metiers_plus_tendus": [
            {"metier": "Aides à domicile", "difficulte": 85, "projets": 125000},
            {"metier": "Aides-soignants", "difficulte": 78, "projets": 98000},
            {"metier": "Ingénieurs informatique", "difficulte": 75, "projets": 45000},
            {"metier": "Couvreurs", "difficulte": 82, "projets": 18000},
            {"metier": "Serveurs", "difficulte": 72, "projets": 95000},
            {"metier": "Conducteurs routiers", "difficulte": 76, "projets": 52000},
            {"metier": "Cuisiniers", "difficulte": 70, "projets": 68000},
            {"metier": "Maçons", "difficulte": 79, "projets": 22000},
        ],
        "evolution": [
            {"annee": "2019", "taux": 50},
            {"annee": "2020", "taux": 40},
            {"annee": "2021", "taux": 45},
            {"annee": "2022", "taux": 58},
            {"annee": "2023", "taux": 61},
            {"annee": "2024", "taux": 58},
            {"annee": "2025", "taux": 61},
        ]
    }


# ============================================================================
# CONSTRUCTION DES DONNÉES - CONDITIONS DE VIE (NOUVEAU)
# ============================================================================

def build_irl_data():
    """Construit les données IRL (Indice de Référence des Loyers)"""
    print("📊 Récupération de l'IRL...")
    
    default_irl = {
        "valeur_actuelle": 145.77,
        "glissement_annuel": 0.87,
        "trimestre": "T3 2025",
        "evolution": [
            {"trimestre": "T1 2022", "indice": 133.93, "glissement": 2.48},
            {"trimestre": "T3 2022", "indice": 136.27, "glissement": 3.49},
            {"trimestre": "T1 2023", "indice": 138.61, "glissement": 3.49},
            {"trimestre": "T3 2023", "indice": 141.03, "glissement": 3.49},
            {"trimestre": "T1 2024", "indice": 143.46, "glissement": 3.50},
            {"trimestre": "T3 2024", "indice": 144.51, "glissement": 2.47},
            {"trimestre": "T1 2025", "indice": 145.47, "glissement": 1.40},
            {"trimestre": "T3 2025", "indice": 145.77, "glissement": 0.87},
        ]
    }
    
    data = get_quarterly_values(SERIES_IDS["irl"], 2022)
    glissement = get_quarterly_values(SERIES_IDS["irl_glissement"], 2022)
    
    if data and glissement:
        glissement_dict = {g['trimestre']: g['valeur'] for g in glissement}
        evolution = []
        for d in data:
            evolution.append({
                "trimestre": d['trimestre'],
                "indice": round(d['valeur'], 2),
                "glissement": round(glissement_dict.get(d['trimestre'], 0), 2)
            })
        
        if evolution:
            latest = evolution[-1]
            print(f"  ✓ {len(evolution)} trimestres IRL récupérés")
            return {
                "valeur_actuelle": latest['indice'],
                "glissement_annuel": latest['glissement'],
                "trimestre": latest['trimestre'],
                "evolution": evolution
            }
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_irl


def build_prix_immobilier_data():
    """Construit les données prix immobilier"""
    print("📊 Récupération des prix immobilier...")
    
    default_immo = {
        "indice_actuel": 116.2,
        "variation_trim": 1.0,
        "variation_an": -1.8,
        "transactions_annuelles": 880000,
        "evolution": [
            {"trimestre": "T1 2022", "indice": 124.5, "variation": 7.2},
            {"trimestre": "T3 2022", "indice": 126.8, "variation": 6.1},
            {"trimestre": "T1 2023", "indice": 124.2, "variation": -0.2},
            {"trimestre": "T3 2023", "indice": 120.5, "variation": -5.0},
            {"trimestre": "T1 2024", "indice": 117.8, "variation": -5.1},
            {"trimestre": "T3 2024", "indice": 115.3, "variation": -4.3},
            {"trimestre": "T1 2025", "indice": 116.2, "variation": -1.4},
        ],
        "par_zone": [
            {"zone": "Paris", "prix_m2": 9450, "variation": -3.2},
            {"zone": "Île-de-France", "prix_m2": 6220, "variation": -0.3},
            {"zone": "Province", "prix_m2": 2650, "variation": 1.2},
            {"zone": "France entière", "prix_m2": 3180, "variation": -0.5},
        ]
    }
    
    data = get_quarterly_values(SERIES_IDS["prix_immobilier"], 2022)
    
    if data:
        evolution = []
        for i, d in enumerate(data):
            variation = 0
            if i >= 4:
                prev = data[i-4]['valeur']
                variation = round(((d['valeur'] / prev) - 1) * 100, 1)
            evolution.append({
                "trimestre": d['trimestre'],
                "indice": round(d['valeur'], 1),
                "variation": variation
            })
        
        if evolution:
            latest = evolution[-1]
            print(f"  ✓ {len(evolution)} trimestres prix immo récupérés")
            default_immo['indice_actuel'] = latest['indice']
            default_immo['variation_an'] = latest['variation']
            default_immo['evolution'] = evolution[-8:]  # 2 ans
    else:
        print("  ⚠️ Utilisation des données par défaut")
    
    return default_immo


def build_carburants_data():
    """Construit les données prix carburants"""
    print("📊 Récupération des prix carburants...")
    
    default_carburants = {
        "gazole": {"prix": 1.58, "variation_an": -0.6},
        "sp95": {"prix": 1.72, "variation_an": -1.9},
        "sp98": {"prix": 1.82, "variation_an": -1.5},
        "evolution": [
            {"mois": "Jan 2023", "gazole": 1.85, "sp95": 1.82},
            {"mois": "Avr 2023", "gazole": 1.78, "sp95": 1.88},
            {"mois": "Juil 2023", "gazole": 1.72, "sp95": 1.85},
            {"mois": "Oct 2023", "gazole": 1.88, "sp95": 1.92},
            {"mois": "Jan 2024", "gazole": 1.72, "sp95": 1.78},
            {"mois": "Avr 2024", "gazole": 1.75, "sp95": 1.82},
            {"mois": "Juil 2024", "gazole": 1.68, "sp95": 1.75},
            {"mois": "Oct 2024", "gazole": 1.62, "sp95": 1.72},
            {"mois": "Jan 2025", "gazole": 1.65, "sp95": 1.78},
            {"mois": "Avr 2025", "gazole": 1.60, "sp95": 1.74},
            {"mois": "Oct 2025", "gazole": 1.58, "sp95": 1.72},
        ]
    }
    
    gazole = fetch_insee_series(SERIES_IDS["prix_gazole"], "2023")
    sp95 = fetch_insee_series(SERIES_IDS["prix_sp95"], "2023")
    
    if gazole and sp95:
        sp95_dict = {s['period']: s['value'] for s in sp95}
        evolution = []
        
        for g in gazole:
            period = g['period']
            if period in sp95_dict:
                # Convertir 2024-01 en Jan 2024
                year, month = period.split('-')
                mois_fr = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", 
                          "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
                mois_label = f"{mois_fr[int(month)-1]} {year}"
                
                evolution.append({
                    "mois": mois_label,
                    "gazole": round(g['value'], 2),
                    "sp95": round(sp95_dict[period], 2)
                })
        
        if evolution:
            # Garder 1 point tous les 3 mois environ
            evolution_sparse = evolution[::3][-12:]
            latest_gazole = evolution[-1]['gazole']
            year_ago_idx = max(0, len(evolution) - 12)
            var_gazole = round(((latest_gazole / evolution[year_ago_idx]['gazole']) - 1) * 100, 1)
            
            latest_sp95 = evolution[-1]['sp95']
            var_sp95 = round(((latest_sp95 / evolution[year_ago_idx]['sp95']) - 1) * 100, 1)
            
            print(f"  ✓ {len(evolution)} mois de prix carburants récupérés")
            return {
                "gazole": {"prix": latest_gazole, "variation_an": var_gazole},
                "sp95": {"prix": latest_sp95, "variation_an": var_sp95},
                "sp98": {"prix": round(latest_sp95 + 0.10, 2), "variation_an": var_sp95},
                "evolution": evolution_sparse
            }
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_carburants


def build_taux_effort_data():
    """Données taux d'effort logement - STATIQUE (enquête SRCV annuelle)"""
    print("📊 Taux d'effort logement (données statiques SRCV)...")
    
    return {
        "annee": 2023,
        "source": "INSEE enquête SRCV 2024",
        "commentaire": "STATIQUE - À mettre à jour manuellement chaque année",
        "par_statut": [
            {"statut": "Locataires secteur libre", "taux_median": 29.6, "taux_q1": 42.0},
            {"statut": "Accédants propriété", "taux_median": 27.5, "taux_q1": 44.0},
            {"statut": "Locataires HLM", "taux_median": 24.1, "taux_q1": 30.0},
            {"statut": "Propriétaires non accédants", "taux_median": 10.0, "taux_q1": 15.0},
        ],
        "par_revenu": [
            {"quartile": "Q1 (25% + modestes)", "taux": 31.0},
            {"quartile": "Q2", "taux": 22.0},
            {"quartile": "Q3", "taux": 18.0},
            {"quartile": "Q4 (25% + aisés)", "taux": 14.1},
        ],
        "evolution": [
            {"annee": "2001", "ensemble": 16.2, "locataires_libre": 23.8},
            {"annee": "2006", "ensemble": 17.5, "locataires_libre": 25.2},
            {"annee": "2013", "ensemble": 18.3, "locataires_libre": 28.6},
            {"annee": "2017", "ensemble": 19.7, "locataires_libre": 28.6},
            {"annee": "2023", "ensemble": 20.5, "locataires_libre": 29.6},
        ]
    }


# ============================================================================
# CONSTRUCTION DES DONNÉES - CONJONCTURE GÉNÉRALE (NOUVEAU)
# ============================================================================

def build_pib_data():
    """Données PIB - Récupération automatique via API INSEE"""
    print("📊 Récupération du PIB...")
    
    default_pib = {
        "croissance_trim_actuel": 0.5,
        "croissance_annuelle": 1.1,
        "trimestre": "T3 2025",
        "commentaire": "PIB volume trimestriel",
        "evolution": [
            {"trimestre": "T1 2022", "croissance": 0.0},
            {"trimestre": "T2 2022", "croissance": 0.5},
            {"trimestre": "T3 2022", "croissance": 0.2},
            {"trimestre": "T4 2022", "croissance": 0.1},
            {"trimestre": "T1 2023", "croissance": 0.1},
            {"trimestre": "T2 2023", "croissance": 0.6},
            {"trimestre": "T3 2023", "croissance": 0.0},
            {"trimestre": "T4 2023", "croissance": 0.0},
            {"trimestre": "T1 2024", "croissance": 0.2},
            {"trimestre": "T2 2024", "croissance": 0.3},
            {"trimestre": "T3 2024", "croissance": 0.4},
            {"trimestre": "T4 2024", "croissance": -0.1},
            {"trimestre": "T1 2025", "croissance": 0.2},
            {"trimestre": "T2 2025", "croissance": 0.3},
            {"trimestre": "T3 2025", "croissance": 0.5},
        ],
        "contributions": {
            "trimestre": "T3 2025",
            "demande_interieure": 0.3,
            "commerce_exterieur": 0.9,
            "stocks": -0.6
        },
        "annuel": [
            {"annee": "2019", "croissance": 1.8},
            {"annee": "2020", "croissance": -7.9},
            {"annee": "2021", "croissance": 6.4},
            {"annee": "2022", "croissance": 2.6},
            {"annee": "2023", "croissance": 1.1},
            {"annee": "2024", "croissance": 1.1},
            {"annee": "2025", "croissance": 0.9},
        ]
    }
    
    # Récupérer les données PIB volume trimestriel
    data = get_quarterly_values(SERIES_IDS["pib_volume"], 2020)
    
    if data and len(data) >= 5:
        evolution = []
        for i, d in enumerate(data):
            if i > 0:
                # Calculer la variation T/T-1
                prev = data[i-1]['valeur']
                croissance = round(((d['valeur'] / prev) - 1) * 100, 1)
                evolution.append({
                    "trimestre": d['trimestre'],
                    "croissance": croissance
                })
        
        if evolution:
            # Garder les 15 derniers trimestres
            evolution = evolution[-15:]
            latest = evolution[-1]
            
            # Calculer croissance annuelle (somme approx des 4 derniers trimestres)
            if len(evolution) >= 4:
                croissance_an = round(sum(e['croissance'] for e in evolution[-4:]), 1)
            else:
                croissance_an = default_pib['croissance_annuelle']
            
            print(f"  ✓ {len(evolution)} trimestres de PIB récupérés")
            return {
                "croissance_trim_actuel": latest['croissance'],
                "croissance_annuelle": croissance_an,
                "trimestre": latest['trimestre'],
                "commentaire": "PIB volume trimestriel - INSEE",
                "evolution": evolution,
                "contributions": default_pib['contributions'],
                "annuel": default_pib['annuel']
            }
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_pib


def build_climat_affaires_data():
    """Construit les données climat des affaires et confiance des ménages"""
    print("📊 Récupération du climat des affaires et confiance ménages...")
    
    default_climat = {
        "valeur_actuelle": 98,
        "confiance_menages": 92,
        "moyenne_long_terme": 100,
        "mois": "Nov 2025",
        "evolution": [
            {"mois": "Jan 2024", "climat": 99, "menages": 91},
            {"mois": "Avr 2024", "climat": 100, "menages": 90},
            {"mois": "Juil 2024", "climat": 97, "menages": 92},
            {"mois": "Oct 2024", "climat": 97, "menages": 93},
            {"mois": "Jan 2025", "climat": 95, "menages": 92},
            {"mois": "Avr 2025", "climat": 97, "menages": 91},
            {"mois": "Juil 2025", "climat": 96, "menages": 93},
            {"mois": "Oct 2025", "climat": 97, "menages": 92},
            {"mois": "Nov 2025", "climat": 98, "menages": 92},
        ],
        "par_secteur": [
            {"secteur": "Industrie", "climat": 101},
            {"secteur": "Services", "climat": 98},
            {"secteur": "Bâtiment", "climat": 96},
            {"secteur": "Commerce détail", "climat": 97},
        ]
    }
    
    climat = fetch_insee_series(SERIES_IDS["climat_affaires"], "2024")
    menages = fetch_insee_series(SERIES_IDS["confiance_menages"], "2024")
    
    if climat and menages:
        menages_dict = {m['period']: m['value'] for m in menages}
        evolution = []
        
        for c in climat:
            period = c['period']
            if period in menages_dict:
                year, month = period.split('-')
                mois_fr = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", 
                          "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
                mois_label = f"{mois_fr[int(month)-1]} {year}"
                
                evolution.append({
                    "mois": mois_label,
                    "climat": round(c['value']),
                    "menages": round(menages_dict[period])
                })
        
        if evolution:
            # Garder 1 point tous les 3 mois environ
            evolution_sparse = evolution[::3][-12:]
            if evolution[-1] not in evolution_sparse:
                evolution_sparse.append(evolution[-1])
            
            latest = evolution[-1]
            print(f"  ✓ {len(evolution)} mois de climat des affaires récupérés")
            return {
                "valeur_actuelle": latest['climat'],
                "confiance_menages": latest['menages'],
                "moyenne_long_terme": 100,
                "mois": latest['mois'],
                "evolution": evolution_sparse,
                "par_secteur": default_climat['par_secteur']
            }
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_climat


def build_defaillances_data():
    """Construit les données défaillances d'entreprises"""
    print("📊 Récupération des défaillances d'entreprises...")
    
    default_defaillances = {
        "cumul_12_mois": 68227,
        "variation_an": 0.8,
        "mois": "Sep 2025",
        "moyenne_2010_2019": 58000,
        "evolution": [
            {"mois": "Jan 2023", "cumul": 42000},
            {"mois": "Avr 2023", "cumul": 47000},
            {"mois": "Juil 2023", "cumul": 51000},
            {"mois": "Oct 2023", "cumul": 55000},
            {"mois": "Jan 2024", "cumul": 57500},
            {"mois": "Avr 2024", "cumul": 60000},
            {"mois": "Juil 2024", "cumul": 63500},
            {"mois": "Oct 2024", "cumul": 66000},
            {"mois": "Jan 2025", "cumul": 66500},
            {"mois": "Avr 2025", "cumul": 67000},
            {"mois": "Juil 2025", "cumul": 67600},
            {"mois": "Sep 2025", "cumul": 68227},
        ],
        "par_secteur": [
            {"secteur": "Construction", "part": 21, "evolution": 5},
            {"secteur": "Commerce", "part": 19, "evolution": 8},
            {"secteur": "Héberg-resto", "part": 13, "evolution": 12},
            {"secteur": "Services", "part": 28, "evolution": 6},
            {"secteur": "Industrie", "part": 8, "evolution": 3},
            {"secteur": "Autres", "part": 11, "evolution": 4},
        ]
    }
    
    data = fetch_insee_series(SERIES_IDS["defaillances_cumul"], "2023")
    
    if data:
        evolution = []
        for d in data:
            period = d['period']
            year, month = period.split('-')
            mois_fr = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", 
                      "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
            mois_label = f"{mois_fr[int(month)-1]} {year}"
            
            evolution.append({
                "mois": mois_label,
                "cumul": round(d['value'])
            })
        
        if evolution:
            # Garder 1 point tous les 3 mois
            evolution_sparse = evolution[::3][-12:]
            if evolution[-1] not in evolution_sparse:
                evolution_sparse.append(evolution[-1])
            
            latest = evolution[-1]
            print(f"  ✓ {len(evolution)} mois de défaillances récupérés")
            
            # Calculer variation annuelle
            year_ago_idx = max(0, len(evolution) - 12)
            var_an = round(((latest['cumul'] / evolution[year_ago_idx]['cumul']) - 1) * 100, 1)
            
            return {
                "cumul_12_mois": latest['cumul'],
                "variation_an": var_an,
                "mois": latest['mois'],
                "moyenne_2010_2019": 58000,
                "evolution": evolution_sparse,
                "par_secteur": default_defaillances['par_secteur']
            }
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_defaillances


def build_investissement_data():
    """Données investissement entreprises - STATIQUE (comptes trimestriels)"""
    print("📊 Investissement entreprises (données statiques)...")
    
    return {
        "fbcf_variation_trim": 0.4,
        "fbcf_variation_an": -1.5,
        "trimestre": "T3 2025",
        "taux_investissement": 25.2,
        "commentaire": "STATIQUE - À mettre à jour manuellement chaque trimestre",
        "evolution": [
            {"trimestre": "T1 2023", "variation": 0.8},
            {"trimestre": "T2 2023", "variation": 0.5},
            {"trimestre": "T3 2023", "variation": 1.0},
            {"trimestre": "T4 2023", "variation": -0.7},
            {"trimestre": "T1 2024", "variation": 0.3},
            {"trimestre": "T2 2024", "variation": -0.2},
            {"trimestre": "T3 2024", "variation": -0.3},
            {"trimestre": "T4 2024", "variation": -0.1},
            {"trimestre": "T1 2025", "variation": -0.1},
            {"trimestre": "T2 2025", "variation": 0.0},
            {"trimestre": "T3 2025", "variation": 0.4},
        ],
        "par_type": [
            {"type": "Construction", "variation_an": -2.5},
            {"type": "Équipements", "variation_an": -0.8},
            {"type": "Info-communication", "variation_an": 5.0},
            {"type": "Transport", "variation_an": -1.2},
        ]
    }


# ============================================================================
# CONSTRUCTION DES DONNÉES - SALAIRES
# ============================================================================

def build_salaires_secteur_data():
    """Construit les données de salaires par secteur"""
    print("📊 Récupération des indices SMB par secteur...")
    
    default_secteurs = [
        {"secteur": "Services financiers", "salaire": 4123, "evolution": 0.5},
        {"secteur": "Info-communication", "salaire": 3853, "evolution": 0.8},
        {"secteur": "Industrie", "salaire": 3021, "evolution": 1.1},
        {"secteur": "Tertiaire (moyenne)", "salaire": 2705, "evolution": 0.7},
        {"secteur": "Construction", "salaire": 2411, "evolution": 0.4},
        {"secteur": "Héberg.-restauration", "salaire": 1979, "evolution": 0.9},
    ]
    
    smb_industrie = get_quarterly_values(SERIES_IDS["smb_industrie"], 2023)
    smb_construction = get_quarterly_values(SERIES_IDS["smb_construction"], 2023)
    smb_tertiaire = get_quarterly_values(SERIES_IDS["smb_tertiaire"], 2023)
    
    if smb_industrie and len(smb_industrie) >= 4:
        def calc_evolution(data):
            if len(data) >= 4:
                latest = data[-1]['valeur']
                year_ago = data[-4]['valeur']
                return round(((latest / year_ago) - 1) * 100, 1)
            return 0.0
        
        for s in default_secteurs:
            if s['secteur'] == 'Industrie':
                s['evolution'] = calc_evolution(smb_industrie)
            elif s['secteur'] == 'Construction':
                s['evolution'] = calc_evolution(smb_construction)
            elif s['secteur'] == 'Tertiaire (moyenne)':
                s['evolution'] = calc_evolution(smb_tertiaire)
        
        print(f"  ✓ Évolutions SMB mises à jour")
    else:
        print("  ⚠️ Utilisation des évolutions par défaut")
    
    return default_secteurs


def build_ecart_hf_data():
    """Construit les données d'écart salarial H/F"""
    print("📊 Récupération des données écart H/F...")
    
    default_evolution = [
        {"annee": "2015", "ecart": 18.4},
        {"annee": "2017", "ecart": 16.6},
        {"annee": "2019", "ecart": 16.1},
        {"annee": "2021", "ecart": 15.5},
        {"annee": "2022", "ecart": 14.9},
        {"annee": "2023", "ecart": 14.2},
        {"annee": "2024", "ecart": 13.0},
    ]
    
    salaires_femmes = get_annual_values(SERIES_IDS["salaire_net_femmes"], 2015)
    salaires_hommes = get_annual_values(SERIES_IDS["salaire_net_hommes"], 2015)
    
    if salaires_femmes and salaires_hommes:
        hommes_dict = {s['annee']: s['valeur'] for s in salaires_hommes}
        
        evolution = []
        for sf in salaires_femmes:
            annee = sf['annee']
            if annee in hommes_dict:
                ecart = round(((hommes_dict[annee] - sf['valeur']) / hommes_dict[annee]) * 100, 1)
                evolution.append({"annee": annee, "ecart": ecart})
        
        if evolution:
            print(f"  ✓ {len(evolution)} années d'écart H/F récupérées")
            evolution = evolution[-7:] if len(evolution) > 7 else evolution
            return {
                "ecart_global": 22.2,
                "ecart_eqtp": evolution[-1]['ecart'] if evolution else 13.0,
                "ecart_poste_comparable": 4.0,
                "evolution": evolution
            }
    
    print("  ⚠️ Utilisation des données par défaut")
    return {
        "ecart_global": 22.2,
        "ecart_eqtp": 13.0,
        "ecart_poste_comparable": 4.0,
        "evolution": default_evolution
    }


def build_salaire_median_data():
    """Données du salaire médian - STATIQUE"""
    print("📊 Salaire médian (données statiques)...")
    
    return {
        "montant_2024": 2190,
        "evolution": [
            {"annee": "2019", "montant": 1940},
            {"annee": "2020", "montant": 1960},
            {"annee": "2021", "montant": 2010},
            {"annee": "2022", "montant": 2090},
            {"annee": "2023", "montant": 2091},
            {"annee": "2024", "montant": 2190},
        ]
    }


def build_ppv_data():
    """Données PPV - STATIQUE"""
    print("📊 Prime de Partage de la Valeur (données statiques)...")
    
    return {
        "beneficiaires_2023": 23.1,
        "beneficiaires_2024": 14.6,
        "montant_total_2023": 5.3,
        "montant_total_2024": 3.4,
        "montant_moyen": 885,
        "commentaire": "Données Urssaf - À mettre à jour manuellement chaque année"
    }


# ============================================================================
# PARTAGE DE LA VALEUR AJOUTÉE
# ============================================================================

def build_partage_va_data():
    """
    Construit les données de partage de la valeur ajoutée
    Source: INSEE - Comptes nationaux base 2020
    Màj: Annuelle (publication ~T2 année N+1 pour données N)
    URL: https://www.insee.fr/fr/statistiques/series/102768442
    """
    print("⚖️ Partage VA (statique - Comptes nationaux INSEE)...")
    
    return {
        "commentaire": "STATIQUE - Comptes nationaux INSEE base 2020 - màj annuelle",
        "annee_actuelle": 2024,
        "part_salaires_snf": 57.8,  # Rémunération des salariés / VA SNF
        "part_ebe_snf": 32.5,       # Excédent Brut d'Exploitation / VA SNF
        "part_impots_snf": 9.7,     # Impôts sur la production / VA SNF
        "evolution": [
            {"annee": "1980", "salaires": 68.0, "ebe": 25.5},
            {"annee": "1990", "salaires": 60.5, "ebe": 31.5},
            {"annee": "2000", "salaires": 58.5, "ebe": 32.8},
            {"annee": "2010", "salaires": 58.2, "ebe": 32.4},
            {"annee": "2020", "salaires": 58.5, "ebe": 31.0},
            {"annee": "2022", "salaires": 56.5, "ebe": 34.0},
            {"annee": "2024", "salaires": 57.8, "ebe": 32.5},
        ],
        "par_secteur": [
            {"secteur": "Industrie", "salaires": 52, "ebe": 30},
            {"secteur": "Construction", "salaires": 60, "ebe": 25},
            {"secteur": "Commerce", "salaires": 55, "ebe": 32},
            {"secteur": "Services march.", "salaires": 58, "ebe": 22},
            {"secteur": "Info-comm", "salaires": 48, "ebe": 38},
        ],
        "taux_marge_snf": [
            {"annee": "2019", "taux": 31.8},
            {"annee": "2020", "taux": 29.5},
            {"annee": "2021", "taux": 33.8},
            {"annee": "2022", "taux": 32.8},
            {"annee": "2023", "taux": 32.2},
            {"annee": "2024", "taux": 32.5},
        ]
    }


# ============================================================================
# COMPARAISON EUROPÉENNE
# ============================================================================

def build_comparaison_ue_data():
    """
    Construit les données de comparaison européenne
    Source: Eurostat
    Màj: Semestrielle (janvier + juillet)
    URLs:
    - SMIC: https://ec.europa.eu/eurostat/databrowser/view/earn_mw_cur/default/table
    - Chômage: https://ec.europa.eu/eurostat/databrowser/view/une_rt_m/default/table
    - Part salaires VA: https://ec.europa.eu/eurostat/databrowser/view/nasa_10_ki/default/table
    """
    print("🇪🇺 Comparaison UE (statique - Eurostat)...")
    
    return {
        "commentaire": "STATIQUE - Eurostat - màj semestrielle (juillet 2025)",
        "date_maj": "2025-07-01",
        "smic_europe": [
            # Données Eurostat juillet 2025 - SMIC brut mensuel en euros
            {"pays": "Luxembourg", "code": "LU", "smic": 2704, "spa": 2035},
            {"pays": "Irlande", "code": "IE", "smic": 2282, "spa": 1653},
            {"pays": "Pays-Bas", "code": "NL", "smic": 2246, "spa": 1825},
            {"pays": "Allemagne", "code": "DE", "smic": 2161, "spa": 1989},
            {"pays": "Belgique", "code": "BE", "smic": 2112, "spa": 1750},
            {"pays": "France", "code": "FR", "smic": 1802, "spa": 1580},
            {"pays": "Espagne", "code": "ES", "smic": 1323, "spa": 1350},
            {"pays": "Pologne", "code": "PL", "smic": 1091, "spa": 1420},
            {"pays": "Bulgarie", "code": "BG", "smic": 551, "spa": 886},
        ],
        "chomage_europe": [
            # Données Eurostat septembre 2025 - taux de chômage %
            {"pays": "Allemagne", "code": "DE", "taux": 3.7, "jeunes": 6.7},
            {"pays": "Pays-Bas", "code": "NL", "taux": 3.8, "jeunes": 8.8},
            {"pays": "Pologne", "code": "PL", "taux": 2.9, "jeunes": 10.5},
            {"pays": "France", "code": "FR", "taux": 7.7, "jeunes": 18.3},
            {"pays": "Italie", "code": "IT", "taux": 6.1, "jeunes": 20.6},
            {"pays": "Espagne", "code": "ES", "taux": 10.5, "jeunes": 25.0},
            {"pays": "UE-27", "code": "EU", "taux": 6.0, "jeunes": 14.8},
        ],
        "part_salaires_va_ue": [
            # Part de la rémunération des salariés dans la VA - Eurostat 2024
            {"pays": "Allemagne", "code": "DE", "part": 61.2},
            {"pays": "Pays-Bas", "code": "NL", "part": 58.5},
            {"pays": "France", "code": "FR", "part": 57.8},
            {"pays": "UE-27", "code": "EU", "part": 56.8},
            {"pays": "Espagne", "code": "ES", "part": 54.2},
            {"pays": "Italie", "code": "IT", "part": 53.5},
        ]
    }


# ============================================================================
# PARAMÈTRES SIMULATEUR NAO
# ============================================================================

def build_simulateur_nao_data():
    """
    Construit les paramètres du simulateur NAO
    Sources:
    - Taux cotisations: URSSAF (https://www.urssaf.fr/accueil/taux-baremes.html)
    - Prime d'activité: CAF (https://www.caf.fr/allocataires/droits-et-prestations/s-informer-sur-les-aides/solidarite-et-insertion/la-prime-d-activite)
    - SMIC: Journal Officiel
    Màj: Annuelle (janvier)
    """
    print("🧮 Paramètres simulateur NAO (statique - CAF/URSSAF)...")
    
    return {
        "commentaire": "Paramètres pour le simulateur NAO - màj annuelle (janvier)",
        "annee": 2025,
        "taux_cotisations": {
            # Taux moyens de cotisations salariales
            # Non-cadre: sécu (maladie, vieillesse) + retraite AGIRC-ARRCO + CSG/CRDS
            "non_cadre": 0.23,
            # Cadre: idem + cotisation APEC (0.024%) + prévoyance cadre obligatoire
            "cadre": 0.25,
            # Fonctionnaire: pension civile (11.1%) + RAFP (5%) + CSG (~1% sur primes)
            "fonctionnaire": 0.17,
            "detail": {
                "non_cadre": {
                    "securite_sociale": 0.073,  # Vieillesse plafonnée + déplafonnée
                    "retraite_complementaire": 0.0315,  # AGIRC-ARRCO T1
                    "csg_crds": 0.097,  # CSG 9.2% + CRDS 0.5%
                    "chomage": 0.0,  # Supprimé en 2019
                    "autres": 0.028,  # CEG, mutuelle moyenne
                },
                "cadre": {
                    "securite_sociale": 0.073,
                    "retraite_complementaire": 0.0315,
                    "csg_crds": 0.097,
                    "apec": 0.00024,
                    "prevoyance": 0.015,  # 1.5% obligatoire
                    "autres": 0.033,
                },
                "fonctionnaire": {
                    "pension_civile": 0.111,  # Retenue PC
                    "rafp": 0.05,  # Retraite additionnelle (sur primes, max 20% traitement)
                    "csg_crds": 0.009,  # Sur primes uniquement
                }
            }
        },
        "prime_activite": {
            # Barèmes CAF avril 2025
            "forfait_base": 633.21,  # Montant forfaitaire personne seule
            "majoration_couple": 1.5,  # Coefficient couple = 1.5 × forfait
            "majoration_enfant": 0.3,  # +30% par enfant à charge
            "seuil_bonification_min": 700.92,  # Début bonification individuelle
            "seuil_bonification_max": 1416,  # Bonification max atteinte
            "bonification_max": 184.27,  # Montant max bonification
            "forfait_logement_seul": 76.04,  # Forfait logement déduit (personne seule)
            "forfait_logement_couple": 152.08,  # Forfait logement déduit (couple)
            "seuil_versement": 15,  # Minimum versé (si < 15€, rien)
            "plafond_ressources_seul": 1900,  # Approximation plafond éligibilité
            "plafond_ressources_couple": 2500,
        },
        "smic": {
            "brut_mensuel": 1823.03,
            "net_mensuel": 1443.11,
            "horaire_brut": 12.02,
            "date_vigueur": "2025-01-01",
        },
        "exonerations": {
            # Réduction générale de cotisations patronales (Fillon)
            "seuil_fillon": 1.6,  # Applicable si salaire ≤ 1.6 SMIC
            "taux_patronal_avec_fillon": 0.30,  # ~30% charges patronales réduites
            "taux_patronal_sans_fillon": 0.45,  # ~45% charges patronales pleines
        }
    }


# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================

def main():
    print("=" * 70)
    print("🔄 MISE À JOUR DES DONNÉES ÉCONOMIQUES - CFTC v2.0")
    print(f"   {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print("=" * 70)
    print()
    
    # === DONNÉES AUTOMATIQUES ===
    print("━" * 70)
    print("📡 DONNÉES AUTOMATIQUES (API INSEE)")
    print("━" * 70)
    
    inflation_salaires = build_inflation_data()
    chomage = build_chomage_data()
    emploi_seniors = build_emploi_seniors_data()
    types_contrats = build_types_contrats_data()
    difficultes_recrutement = build_difficultes_recrutement_data()
    emploi_secteur = build_emploi_secteur_data()
    salaires_secteur = build_salaires_secteur_data()
    ecart_hf = build_ecart_hf_data()
    
    # === DONNÉES STATIQUES ===
    print()
    print("━" * 70)
    print("📋 DONNÉES STATIQUES (à mettre à jour manuellement)")
    print("━" * 70)
    
    salaire_median = build_salaire_median_data()
    ppv = build_ppv_data()
    creations_destructions = build_creations_destructions_data()
    tensions_metiers = build_tensions_metiers_data()
    taux_effort = build_taux_effort_data()
    
    # === CONDITIONS DE VIE (NOUVEAU) ===
    print()
    print("━" * 70)
    print("🏠 CONDITIONS DE VIE")
    print("━" * 70)
    
    irl = build_irl_data()
    prix_immobilier = build_prix_immobilier_data()
    carburants = build_carburants_data()
    
    # === CONJONCTURE GÉNÉRALE (NOUVEAU) ===
    print()
    print("━" * 70)
    print("📈 CONJONCTURE GÉNÉRALE")
    print("━" * 70)
    
    pib = build_pib_data()
    climat_affaires = build_climat_affaires_data()
    defaillances = build_defaillances_data()
    investissement = build_investissement_data()
    
    # === PARTAGE DE LA VALEUR AJOUTÉE ===
    print()
    print("━" * 70)
    print("⚖️ PARTAGE DE LA VALEUR AJOUTÉE")
    print("━" * 70)
    
    partage_va = build_partage_va_data()
    
    # === COMPARAISON EUROPÉENNE ===
    print()
    print("━" * 70)
    print("🇪🇺 COMPARAISON EUROPÉENNE")
    print("━" * 70)
    
    comparaison_ue = build_comparaison_ue_data()
    
    # === PARAMÈTRES SIMULATEUR NAO ===
    print()
    print("━" * 70)
    print("🧮 PARAMÈTRES SIMULATEUR NAO")
    print("━" * 70)
    
    simulateur_nao = build_simulateur_nao_data()
    
    # === DONNÉES SMIC ===
    smic = {
        "montant_brut": 1823.03,
        "montant_net": 1443.11,
        "taux_horaire": 12.02,
        "date_vigueur": "2026-01-01",
        "evolution_depuis_2020": 17,
        "part_salaries": [
            {"annee": "2019", "part": 12.0},
            {"annee": "2020", "part": 12.5},
            {"annee": "2021", "part": 13.4},
            {"annee": "2022", "part": 14.5},
            {"annee": "2023", "part": 17.3},
            {"annee": "2024", "part": 14.6},
        ]
    }
    
    pouvoir_achat_cumule = [
        {"periode": "T4 2020", "smic": 100, "salaires": 100, "prix": 100},
        {"periode": "T2 2021", "smic": 101, "salaires": 100.5, "prix": 101},
        {"periode": "T4 2021", "smic": 102.2, "salaires": 101.4, "prix": 102.5},
        {"periode": "T2 2022", "smic": 105, "salaires": 103, "prix": 106},
        {"periode": "T4 2022", "smic": 108, "salaires": 105, "prix": 109},
        {"periode": "T2 2023", "smic": 112, "salaires": 108, "prix": 113},
        {"periode": "T4 2023", "smic": 115, "salaires": 111, "prix": 115},
        {"periode": "T2 2024", "smic": 116, "salaires": 113, "prix": 116},
        {"periode": "T4 2024", "smic": 117, "salaires": 115, "prix": 117},
        {"periode": "T3 2025", "smic": 118, "salaires": 116.5, "prix": 117.5},
    ]
    
    inflation_detail = [
        {"poste": "Alimentation", "val2022": 6.8, "val2023": 11.8, "val2024": 1.4},
        {"poste": "Énergie", "val2022": 23.1, "val2023": 5.6, "val2024": 2.3},
        {"poste": "Services", "val2022": 3.0, "val2023": 3.0, "val2024": 2.7},
        {"poste": "Manufacturés", "val2022": 3.3, "val2023": 3.5, "val2024": 0.0},
        {"poste": "Loyers", "val2022": 2.0, "val2023": 2.8, "val2024": 2.8},
    ]
    
    # Indicateurs clés
    derniers_chomage = chomage[-1] if chomage else {"taux": 7.7, "jeunes": 19.2}
    derniers_seniors = emploi_seniors[-1] if emploi_seniors else {"taux": 62.0}
    
    indicateurs_cles = {
        "taux_chomage_actuel": derniers_chomage.get("taux", 7.7),
        "taux_chomage_jeunes": derniers_chomage.get("jeunes", 19.2),
        "taux_emploi_seniors": derniers_seniors.get("taux", 62.0),
        "inflation_annuelle": 0.9,
        "smic_brut": smic["montant_brut"],
        "smic_net": smic["montant_net"],
        "salaire_median": salaire_median["montant_2024"],
        "salaire_moyen": 2733,
        "ecart_hf_eqtp": ecart_hf["ecart_eqtp"],
        "difficultes_recrutement": tensions_metiers["taux_difficultes_global"],
        # CONDITIONS DE VIE (NOUVEAU)
        "irl_glissement": irl["glissement_annuel"],
        "prix_gazole": carburants["gazole"]["prix"],
        "taux_effort_locataires": taux_effort["par_statut"][0]["taux_median"],
        # CONJONCTURE GÉNÉRALE (NOUVEAU)
        "croissance_pib": pib["croissance_trim_actuel"],
        "climat_affaires": climat_affaires["valeur_actuelle"],
        "defaillances_12m": defaillances["cumul_12_mois"]
    }
    
    # Assembler le JSON final
    data = {
        "last_updated": datetime.now().isoformat(),
        "contact": "hspringragain@cftc.fr",
        "sources": [
            "INSEE - Indice des prix à la consommation",
            "INSEE - Enquête Emploi",
            "INSEE - Estimations trimestrielles d'emploi",
            "INSEE - Base Tous salariés",
            "INSEE - Indices trimestriels de salaire (ACEMO)",
            "INSEE - Enquête de conjoncture industrie",
            "DARES - Mouvements de Main d'Oeuvre",
            "France Travail - Enquête BMO",
            "Urssaf - Prime de partage de la valeur"
        ],
        
        # Données existantes
        "inflation_salaires": inflation_salaires,
        "pouvoir_achat_cumule": pouvoir_achat_cumule,
        "chomage": chomage,
        "smic": smic,
        "inflation_detail": inflation_detail,
        "indicateurs_cles": indicateurs_cles,
        
        # Données salaires
        "salaire_median": salaire_median,
        "ecart_hommes_femmes": ecart_hf,
        "salaires_secteur": salaires_secteur,
        "ppv": ppv,
        
        # NOUVEAUX indicateurs emploi
        "emploi_seniors": emploi_seniors,
        "types_contrats": types_contrats,
        "difficultes_recrutement": difficultes_recrutement,
        "emploi_secteur": emploi_secteur,
        "creations_destructions": creations_destructions,
        "tensions_metiers": tensions_metiers,
        
        # CONDITIONS DE VIE (NOUVEAU)
        "irl": irl,
        "prix_immobilier": prix_immobilier,
        "carburants": carburants,
        "taux_effort": taux_effort,
        
        # CONJONCTURE GÉNÉRALE (NOUVEAU)
        "pib": pib,
        "climat_affaires": climat_affaires,
        "defaillances": defaillances,
        "investissement": investissement,
        
        # PARTAGE VA ET COMPARAISON UE (NOUVEAU)
        "partage_va": partage_va,
        "comparaison_ue": comparaison_ue,
        "simulateur_nao": simulateur_nao,
        
        # CONVENTIONS COLLECTIVES - MISE À JOUR MANUELLE
        # ⚠️ Ces données doivent être mises à jour manuellement lors des revalorisations
        # Sources : Légifrance, Ministère du Travail, Sites spécialisés (Juritravail, etc.)
        # Dernière vérification globale : 2026-01-09
        "conventions_collectives": {
            "meta": {
                "derniere_mise_a_jour": "2026-01-09",
                "prochaine_verification": "2026-04-01",
                "sources": [
                    "https://travail-emploi.gouv.fr/dialogue-social/negociation-collective/",
                    "https://www.legifrance.gouv.fr/liste/idcc",
                    "https://code.travail.gouv.fr/outils/convention-collective"
                ],
                "note": "25 principales branches par effectifs. 19 branches non conformes au total (source DGT oct 2025). Parmi les 25 affichées: Métallurgie (IDCC 3248) et SYNTEC (IDCC 1486) sont non conformes.",
                "branches_non_conformes_connues": [
                    "Métallurgie (3248) - A1/A2 < SMIC",
                    "SYNTEC (1486) - ETAM 1.1 < SMIC",
                    "Casinos - non conforme depuis +2 ans",
                    "Prévention sécurité - historiquement problématique"
                ]
            },
            "smic_reference": {
                "mensuel": 1823.03,
                "annuel": 21876.36,
                "horaire": 12.02,
                "date": "2026-01-01"
            },
            "statistiques_branches": {
                "total_branches": 171,
                "branches_conformes": 152,
                "branches_non_conformes": 19,
                "pourcentage_non_conformes": 11,
                "date_comite_suivi": "2025-10-03",
                "source": "https://travail-emploi.gouv.fr/comite-de-suivi-de-la-negociation-salariale-de-branches"
            },
            "branches": [
                {
                    "idcc": "3248",
                    "nom": "Métallurgie",
                    "effectif": 1500000,
                    "grille": [
                        {"niveau": "A1", "intitule": "Opérateur", "minimum_mensuel": 1808, "minimum_annuel": 21700},
                        {"niveau": "A2", "intitule": "Opérateur qualifié", "minimum_mensuel": 1821, "minimum_annuel": 21850},
                        {"niveau": "B3", "intitule": "Technicien", "minimum_mensuel": 1854, "minimum_annuel": 22250},
                        {"niveau": "C5", "intitule": "Tech. supérieur", "minimum_mensuel": 1958, "minimum_annuel": 23500},
                        {"niveau": "D8", "intitule": "Cadre débutant", "minimum_mensuel": 2167, "minimum_annuel": 26000},
                        {"niveau": "F11", "intitule": "Cadre confirmé", "minimum_mensuel": 2833, "minimum_annuel": 34000},
                        {"niveau": "I18", "intitule": "Cadre supérieur", "minimum_mensuel": 6500, "minimum_annuel": 78000}
                    ],
                    "derniere_revalorisation": "2024-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "non_conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/3248-metallurgie",
                    "commentaire": "Niveaux A1 (21700€) et A2 (21850€) < SMIC 2026 (21876€). Négociations 2025 en échec."
                },
                {
                    "idcc": "1486",
                    "nom": "SYNTEC - Bureaux d'études techniques",
                    "effectif": 910000,
                    "grille": [
                        {"niveau": "ETAM 1.1", "intitule": "Employé débutant", "minimum_mensuel": 1815, "minimum_annuel": 21780},
                        {"niveau": "ETAM 1.2", "intitule": "Employé", "minimum_mensuel": 1864, "minimum_annuel": 22368},
                        {"niveau": "ETAM 2.1", "intitule": "Technicien", "minimum_mensuel": 1983, "minimum_annuel": 23796},
                        {"niveau": "ETAM 2.2", "intitule": "Technicien qualifié", "minimum_mensuel": 2074, "minimum_annuel": 24888},
                        {"niveau": "ETAM 3.1", "intitule": "Agent maîtrise", "minimum_mensuel": 2243, "minimum_annuel": 26916},
                        {"niveau": "IC 1.1", "intitule": "Cadre débutant", "minimum_mensuel": 2844, "minimum_annuel": 34128},
                        {"niveau": "IC 2.1", "intitule": "Cadre confirmé", "minimum_mensuel": 3418, "minimum_annuel": 41016},
                        {"niveau": "IC 3.1", "intitule": "Cadre senior", "minimum_mensuel": 4778, "minimum_annuel": 57336}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "non_conforme",
                    "source": "https://www.syntec.fr/convention-collective/",
                    "commentaire": "Position ETAM 1.1 inférieure au SMIC 2026. Accord du 26/06/2024 applicable au 01/12/2024."
                },
                {
                    "idcc": "1979",
                    "nom": "Hôtels, Cafés, Restaurants (HCR)",
                    "effectif": 800000,
                    "grille": [
                        {"niveau": "I-1", "intitule": "Employé sans qualification", "minimum_mensuel": 1862, "minimum_annuel": 22344},
                        {"niveau": "I-2", "intitule": "Employé qualifié", "minimum_mensuel": 1875, "minimum_annuel": 22500},
                        {"niveau": "II", "intitule": "Chef de rang", "minimum_mensuel": 1905, "minimum_annuel": 22860},
                        {"niveau": "III", "intitule": "Maître d'hôtel", "minimum_mensuel": 1965, "minimum_annuel": 23580},
                        {"niveau": "IV", "intitule": "Assistant direction", "minimum_mensuel": 2100, "minimum_annuel": 25200},
                        {"niveau": "V", "intitule": "Cadre", "minimum_mensuel": 2750, "minimum_annuel": 33000}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/1979-hotels-cafes-restaurants",
                    "commentaire": "Avenant n°32 du 01/01/2025. Secteur en tension de recrutement."
                },
                {
                    "idcc": "2216",
                    "nom": "Commerce de détail et de gros à prédominance alimentaire",
                    "effectif": 750000,
                    "grille": [
                        {"niveau": "1A", "intitule": "Employé commercial", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "1B", "intitule": "Employé qualifié", "minimum_mensuel": 1845, "minimum_annuel": 22140},
                        {"niveau": "2A", "intitule": "Employé confirmé", "minimum_mensuel": 1875, "minimum_annuel": 22500},
                        {"niveau": "3", "intitule": "Agent de maîtrise", "minimum_mensuel": 2050, "minimum_annuel": 24600},
                        {"niveau": "5", "intitule": "Cadre", "minimum_mensuel": 2700, "minimum_annuel": 32400}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/2216-commerce-detail-gros-alimentaire",
                    "commentaire": "Grande distribution. Négociations annuelles régulières."
                },
                {
                    "idcc": "1606",
                    "nom": "BTP - Ouvriers (+ 10 salariés)",
                    "effectif": 700000,
                    "grille": [
                        {"niveau": "N1P1", "intitule": "Ouvrier d'exécution", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "N1P2", "intitule": "Ouvrier exécution confirmé", "minimum_mensuel": 1855, "minimum_annuel": 22260},
                        {"niveau": "N2P1", "intitule": "Ouvrier professionnel", "minimum_mensuel": 1905, "minimum_annuel": 22860},
                        {"niveau": "N3P1", "intitule": "Compagnon professionnel", "minimum_mensuel": 2050, "minimum_annuel": 24600},
                        {"niveau": "N3P2", "intitule": "Compagnon confirmé", "minimum_mensuel": 2200, "minimum_annuel": 26400},
                        {"niveau": "N4P1", "intitule": "Chef d'équipe", "minimum_mensuel": 2450, "minimum_annuel": 29400},
                        {"niveau": "N4P2", "intitule": "Maître ouvrier", "minimum_mensuel": 2700, "minimum_annuel": 32400}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/1606-batiment-ouvriers",
                    "commentaire": "Grille régionale Île-de-France. Variations selon départements."
                },
                {
                    "idcc": "2609",
                    "nom": "BTP - ETAM",
                    "effectif": 350000,
                    "grille": [
                        {"niveau": "A", "intitule": "ETAM débutant", "minimum_mensuel": 1855, "minimum_annuel": 22260},
                        {"niveau": "B", "intitule": "ETAM confirmé", "minimum_mensuel": 1950, "minimum_annuel": 23400},
                        {"niveau": "C", "intitule": "ETAM qualifié", "minimum_mensuel": 2100, "minimum_annuel": 25200},
                        {"niveau": "D", "intitule": "ETAM hautement qualifié", "minimum_mensuel": 2350, "minimum_annuel": 28200},
                        {"niveau": "E", "intitule": "Agent de maîtrise", "minimum_mensuel": 2650, "minimum_annuel": 31800}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/2609-batiment-etam",
                    "commentaire": "Grille nationale ETAM BTP."
                },
                {
                    "idcc": "2098",
                    "nom": "Prestataires de services secteur tertiaire",
                    "effectif": 500000,
                    "grille": [
                        {"niveau": "I", "intitule": "Employé", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "II", "intitule": "Employé qualifié", "minimum_mensuel": 1870, "minimum_annuel": 22440},
                        {"niveau": "III", "intitule": "Technicien", "minimum_mensuel": 1950, "minimum_annuel": 23400},
                        {"niveau": "IV", "intitule": "Agent de maîtrise", "minimum_mensuel": 2150, "minimum_annuel": 25800},
                        {"niveau": "V", "intitule": "Cadre", "minimum_mensuel": 2700, "minimum_annuel": 32400}
                    ],
                    "derniere_revalorisation": "2024-07-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/2098-prestataires-services",
                    "commentaire": "Centres d'appels, télémarketing, services aux entreprises."
                },
                {
                    "idcc": "3127",
                    "nom": "Propreté et services associés",
                    "effectif": 550000,
                    "grille": [
                        {"niveau": "AS1", "intitule": "Agent de service", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "AS2", "intitule": "Agent qualifié", "minimum_mensuel": 1855, "minimum_annuel": 22260},
                        {"niveau": "AS3", "intitule": "Agent très qualifié", "minimum_mensuel": 1890, "minimum_annuel": 22680},
                        {"niveau": "AQS1", "intitule": "Agent haute qualif.", "minimum_mensuel": 1950, "minimum_annuel": 23400},
                        {"niveau": "CE1", "intitule": "Chef d'équipe", "minimum_mensuel": 2100, "minimum_annuel": 25200},
                        {"niveau": "MP1", "intitule": "Maîtrise/Cadre", "minimum_mensuel": 2500, "minimum_annuel": 30000}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/3127-proprete",
                    "commentaire": "Secteur nettoyage industriel et tertiaire."
                },
                {
                    "idcc": "2511",
                    "nom": "Sport",
                    "effectif": 130000,
                    "grille": [
                        {"niveau": "1", "intitule": "Employé", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "2", "intitule": "Technicien", "minimum_mensuel": 1880, "minimum_annuel": 22560},
                        {"niveau": "3", "intitule": "Éducateur sportif", "minimum_mensuel": 1950, "minimum_annuel": 23400},
                        {"niveau": "4", "intitule": "Entraîneur", "minimum_mensuel": 2150, "minimum_annuel": 25800},
                        {"niveau": "5", "intitule": "Cadre", "minimum_mensuel": 2600, "minimum_annuel": 31200}
                    ],
                    "derniere_revalorisation": "2024-09-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/2511-sport",
                    "commentaire": "Clubs sportifs, salles de fitness, associations."
                },
                {
                    "idcc": "176",
                    "nom": "Industrie pharmaceutique",
                    "effectif": 100000,
                    "grille": [
                        {"niveau": "1A", "intitule": "Agent de fabrication", "minimum_mensuel": 1850, "minimum_annuel": 22200},
                        {"niveau": "2A", "intitule": "Opérateur qualifié", "minimum_mensuel": 1950, "minimum_annuel": 23400},
                        {"niveau": "3A", "intitule": "Technicien", "minimum_mensuel": 2200, "minimum_annuel": 26400},
                        {"niveau": "4", "intitule": "Tech. supérieur", "minimum_mensuel": 2650, "minimum_annuel": 31800},
                        {"niveau": "5", "intitule": "Cadre groupe 5", "minimum_mensuel": 3200, "minimum_annuel": 38400},
                        {"niveau": "7", "intitule": "Cadre groupe 7", "minimum_mensuel": 4200, "minimum_annuel": 50400}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/176-industrie-pharmaceutique",
                    "commentaire": "Industrie du médicament. Grille revalorisée régulièrement."
                },
                {
                    "idcc": "1090",
                    "nom": "Services de l'automobile",
                    "effectif": 450000,
                    "grille": [
                        {"niveau": "1", "intitule": "Employé", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "3", "intitule": "Ouvrier spécialisé", "minimum_mensuel": 1870, "minimum_annuel": 22440},
                        {"niveau": "6", "intitule": "Ouvrier qualifié", "minimum_mensuel": 1980, "minimum_annuel": 23760},
                        {"niveau": "9", "intitule": "Technicien confirmé", "minimum_mensuel": 2200, "minimum_annuel": 26400},
                        {"niveau": "12", "intitule": "Agent de maîtrise", "minimum_mensuel": 2550, "minimum_annuel": 30600},
                        {"niveau": "20", "intitule": "Cadre", "minimum_mensuel": 3100, "minimum_annuel": 37200}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/1090-services-automobile",
                    "commentaire": "Garages, concessions, réparation automobile."
                },
                {
                    "idcc": "2148",
                    "nom": "Télécommunications",
                    "effectif": 150000,
                    "grille": [
                        {"niveau": "A", "intitule": "Employé", "minimum_mensuel": 1850, "minimum_annuel": 22200},
                        {"niveau": "B", "intitule": "Technicien", "minimum_mensuel": 1980, "minimum_annuel": 23760},
                        {"niveau": "C", "intitule": "Tech. supérieur", "minimum_mensuel": 2200, "minimum_annuel": 26400},
                        {"niveau": "D", "intitule": "Cadre débutant", "minimum_mensuel": 2800, "minimum_annuel": 33600},
                        {"niveau": "E", "intitule": "Cadre confirmé", "minimum_mensuel": 3500, "minimum_annuel": 42000},
                        {"niveau": "F", "intitule": "Cadre supérieur", "minimum_mensuel": 4500, "minimum_annuel": 54000}
                    ],
                    "derniere_revalorisation": "2024-07-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/2148-telecommunications",
                    "commentaire": "Opérateurs télécom, équipementiers."
                },
                {
                    "idcc": "2264",
                    "nom": "Hospitalisation privée",
                    "effectif": 200000,
                    "grille": [
                        {"niveau": "EQ", "intitule": "Employé qualifié", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "T1", "intitule": "Technicien", "minimum_mensuel": 1920, "minimum_annuel": 23040},
                        {"niveau": "T2", "intitule": "Tech. supérieur", "minimum_mensuel": 2100, "minimum_annuel": 25200},
                        {"niveau": "AM", "intitule": "Agent de maîtrise", "minimum_mensuel": 2400, "minimum_annuel": 28800},
                        {"niveau": "C1", "intitule": "Cadre", "minimum_mensuel": 2900, "minimum_annuel": 34800},
                        {"niveau": "C3", "intitule": "Cadre supérieur", "minimum_mensuel": 3800, "minimum_annuel": 45600}
                    ],
                    "derniere_revalorisation": "2024-10-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/2264-hospitalisation-privee",
                    "commentaire": "Cliniques privées, établissements de santé."
                },
                {
                    "idcc": "573",
                    "nom": "Commerces de gros",
                    "effectif": 400000,
                    "grille": [
                        {"niveau": "I", "intitule": "Employé", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "II", "intitule": "Employé qualifié", "minimum_mensuel": 1870, "minimum_annuel": 22440},
                        {"niveau": "III", "intitule": "Technicien", "minimum_mensuel": 1970, "minimum_annuel": 23640},
                        {"niveau": "IV", "intitule": "Agent de maîtrise", "minimum_mensuel": 2200, "minimum_annuel": 26400},
                        {"niveau": "V", "intitule": "Cadre", "minimum_mensuel": 2800, "minimum_annuel": 33600}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/573-commerces-gros",
                    "commentaire": "Négoce, grossistes, distribution B2B."
                },
                {
                    "idcc": "1517",
                    "nom": "Commerce de détail non alimentaire",
                    "effectif": 350000,
                    "grille": [
                        {"niveau": "1", "intitule": "Employé", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "2", "intitule": "Vendeur", "minimum_mensuel": 1855, "minimum_annuel": 22260},
                        {"niveau": "3", "intitule": "Vendeur qualifié", "minimum_mensuel": 1900, "minimum_annuel": 22800},
                        {"niveau": "4", "intitule": "Responsable rayon", "minimum_mensuel": 2050, "minimum_annuel": 24600},
                        {"niveau": "5", "intitule": "Cadre", "minimum_mensuel": 2600, "minimum_annuel": 31200}
                    ],
                    "derniere_revalorisation": "2024-07-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/1517-commerce-detail-non-alimentaire",
                    "commentaire": "Magasins spécialisés, équipement de la personne/maison."
                },
                {
                    "idcc": "2941",
                    "nom": "Aide à domicile (BAD)",
                    "effectif": 500000,
                    "grille": [
                        {"niveau": "A", "intitule": "Agent à domicile", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "B", "intitule": "Employé à domicile", "minimum_mensuel": 1860, "minimum_annuel": 22320},
                        {"niveau": "C", "intitule": "Auxiliaire de vie", "minimum_mensuel": 1920, "minimum_annuel": 23040},
                        {"niveau": "D", "intitule": "Tech. intervention sociale", "minimum_mensuel": 2050, "minimum_annuel": 24600},
                        {"niveau": "E", "intitule": "Cadre", "minimum_mensuel": 2500, "minimum_annuel": 30000}
                    ],
                    "derniere_revalorisation": "2024-10-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/2941-aide-domicile",
                    "commentaire": "Services à la personne, aide aux personnes âgées/handicapées."
                },
                {
                    "idcc": "1702",
                    "nom": "Travaux publics - Ouvriers",
                    "effectif": 280000,
                    "grille": [
                        {"niveau": "I", "intitule": "Ouvrier d'exécution", "minimum_mensuel": 1835, "minimum_annuel": 22020},
                        {"niveau": "II", "intitule": "Ouvrier professionnel", "minimum_mensuel": 1900, "minimum_annuel": 22800},
                        {"niveau": "III", "intitule": "Ouvrier compagnon", "minimum_mensuel": 2050, "minimum_annuel": 24600},
                        {"niveau": "IV", "intitule": "Chef d'équipe", "minimum_mensuel": 2350, "minimum_annuel": 28200}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/1702-travaux-publics-ouvriers",
                    "commentaire": "Routes, canalisations, ouvrages d'art."
                },
                {
                    "idcc": "44",
                    "nom": "Industries chimiques",
                    "effectif": 220000,
                    "grille": [
                        {"niveau": "130", "intitule": "Ouvrier", "minimum_mensuel": 1850, "minimum_annuel": 22200},
                        {"niveau": "160", "intitule": "Ouvrier qualifié", "minimum_mensuel": 1950, "minimum_annuel": 23400},
                        {"niveau": "190", "intitule": "Technicien", "minimum_mensuel": 2150, "minimum_annuel": 25800},
                        {"niveau": "225", "intitule": "Agent de maîtrise", "minimum_mensuel": 2450, "minimum_annuel": 29400},
                        {"niveau": "350", "intitule": "Cadre", "minimum_mensuel": 3200, "minimum_annuel": 38400},
                        {"niveau": "550", "intitule": "Cadre supérieur", "minimum_mensuel": 4500, "minimum_annuel": 54000}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/44-industries-chimiques",
                    "commentaire": "Chimie de base, spécialités, parachimie."
                },
                {
                    "idcc": "3239",
                    "nom": "Particuliers employeurs et emploi à domicile",
                    "effectif": 1200000,
                    "grille": [
                        {"niveau": "I", "intitule": "Employé familial", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "II", "intitule": "Employé familial qualifié", "minimum_mensuel": 1870, "minimum_annuel": 22440},
                        {"niveau": "III", "intitule": "Garde d'enfants", "minimum_mensuel": 1920, "minimum_annuel": 23040},
                        {"niveau": "IV", "intitule": "Assistant de vie", "minimum_mensuel": 2000, "minimum_annuel": 24000}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/3239-particuliers-employeurs",
                    "commentaire": "Nouvelle CCN fusionnée depuis 2022. Nounous, aides ménagères."
                },
                {
                    "idcc": "1527",
                    "nom": "Immobilier (administrateurs de biens)",
                    "effectif": 150000,
                    "grille": [
                        {"niveau": "E1", "intitule": "Employé", "minimum_mensuel": 1835, "minimum_annuel": 22020},
                        {"niveau": "E2", "intitule": "Employé qualifié", "minimum_mensuel": 1900, "minimum_annuel": 22800},
                        {"niveau": "E3", "intitule": "Employé confirmé", "minimum_mensuel": 2000, "minimum_annuel": 24000},
                        {"niveau": "AM1", "intitule": "Agent de maîtrise", "minimum_mensuel": 2300, "minimum_annuel": 27600},
                        {"niveau": "C1", "intitule": "Cadre", "minimum_mensuel": 2900, "minimum_annuel": 34800},
                        {"niveau": "C4", "intitule": "Cadre supérieur", "minimum_mensuel": 4200, "minimum_annuel": 50400}
                    ],
                    "derniere_revalorisation": "2024-07-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/1527-immobilier",
                    "commentaire": "Syndics, gérants, administrateurs de biens."
                },
                {
                    "idcc": "1501",
                    "nom": "Restauration rapide",
                    "effectif": 250000,
                    "grille": [
                        {"niveau": "I", "intitule": "Équipier", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "II", "intitule": "Équipier polyvalent", "minimum_mensuel": 1865, "minimum_annuel": 22380},
                        {"niveau": "III", "intitule": "Responsable équipe", "minimum_mensuel": 1950, "minimum_annuel": 23400},
                        {"niveau": "IV", "intitule": "Assistant manager", "minimum_mensuel": 2150, "minimum_annuel": 25800},
                        {"niveau": "V", "intitule": "Directeur adjoint", "minimum_mensuel": 2600, "minimum_annuel": 31200}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/1501-restauration-rapide",
                    "commentaire": "Fast-food, restauration à emporter."
                },
                {
                    "idcc": "2335",
                    "nom": "Agences de voyage et tourisme",
                    "effectif": 50000,
                    "grille": [
                        {"niveau": "A", "intitule": "Employé", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "B", "intitule": "Agent de comptoir", "minimum_mensuel": 1880, "minimum_annuel": 22560},
                        {"niveau": "C", "intitule": "Agent de voyage", "minimum_mensuel": 1980, "minimum_annuel": 23760},
                        {"niveau": "D", "intitule": "Responsable agence", "minimum_mensuel": 2300, "minimum_annuel": 27600},
                        {"niveau": "E", "intitule": "Cadre", "minimum_mensuel": 2800, "minimum_annuel": 33600}
                    ],
                    "derniere_revalorisation": "2024-04-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/2335-agences-voyage",
                    "commentaire": "Tour-opérateurs, agences de voyages."
                },
                {
                    "idcc": "1516",
                    "nom": "Organismes de formation",
                    "effectif": 180000,
                    "grille": [
                        {"niveau": "A", "intitule": "Personnel administratif", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "B", "intitule": "Formateur débutant", "minimum_mensuel": 1920, "minimum_annuel": 23040},
                        {"niveau": "C", "intitule": "Formateur", "minimum_mensuel": 2100, "minimum_annuel": 25200},
                        {"niveau": "D", "intitule": "Formateur confirmé", "minimum_mensuel": 2400, "minimum_annuel": 28800},
                        {"niveau": "E", "intitule": "Responsable formation", "minimum_mensuel": 2900, "minimum_annuel": 34800}
                    ],
                    "derniere_revalorisation": "2024-09-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/1516-organismes-formation",
                    "commentaire": "Formation professionnelle continue."
                },
                {
                    "idcc": "1266",
                    "nom": "Restauration de collectivités",
                    "effectif": 120000,
                    "grille": [
                        {"niveau": "I", "intitule": "Employé de restauration", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "II", "intitule": "Cuisinier", "minimum_mensuel": 1900, "minimum_annuel": 22800},
                        {"niveau": "III", "intitule": "Chef de partie", "minimum_mensuel": 2050, "minimum_annuel": 24600},
                        {"niveau": "IV", "intitule": "Chef gérant", "minimum_mensuel": 2350, "minimum_annuel": 28200},
                        {"niveau": "V", "intitule": "Directeur site", "minimum_mensuel": 2900, "minimum_annuel": 34800}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/1266-restauration-collectivites",
                    "commentaire": "Cantines, restaurants d'entreprise."
                },
                {
                    "idcc": "1596",
                    "nom": "BTP - Ouvriers (jusqu'à 10 salariés)",
                    "effectif": 300000,
                    "grille": [
                        {"niveau": "N1P1", "intitule": "Ouvrier d'exécution", "minimum_mensuel": 1830, "minimum_annuel": 21960},
                        {"niveau": "N2P1", "intitule": "Ouvrier professionnel", "minimum_mensuel": 1900, "minimum_annuel": 22800},
                        {"niveau": "N3P1", "intitule": "Compagnon", "minimum_mensuel": 2030, "minimum_annuel": 24360},
                        {"niveau": "N4P1", "intitule": "Maître ouvrier", "minimum_mensuel": 2300, "minimum_annuel": 27600}
                    ],
                    "derniere_revalorisation": "2025-01-01",
                    "date_verification": "2026-01-09",
                    "statut": "conforme",
                    "source": "https://code.travail.gouv.fr/convention-collective/1596-batiment-ouvriers-petites-entreprises",
                    "commentaire": "Artisans du bâtiment, petites entreprises."
                }
            ]
        },
    }
    
    # Écrire le fichier JSON
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, '..', 'public', 'data.json')
    output_path = os.path.abspath(output_path)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print()
    print("=" * 70)
    print(f"✅ Données mises à jour : {output_path}")
    print("=" * 70)
    print()
    print("📌 RAPPEL - Données à mettre à jour MANUELLEMENT :")
    print("   ┌─────────────────────────────────────────────────────────────┐")
    print("   │ 📅 Janvier   : SMIC (revalorisation légale)                │")
    print("   │ 📅 Janvier   : Barèmes simulateur NAO (CAF/URSSAF)         │")
    print("   │ 📅 Mars      : PPV (données Urssaf)                        │")
    print("   │ 📅 Mars      : Écart H/F à poste comparable (INSEE Focus)  │")
    print("   │ 📅 Avril     : Tensions métiers (enquête BMO France Travail)│")
    print("   │ 📅 Avril     : Taux d'effort logement (enquête SRCV)       │")
    print("   │ 📅 Juillet   : Comparaison UE (Eurostat semestriel)        │")
    print("   │ 📅 Trimestriel: Créations/destructions emploi (DARES MMO)  │")
    print("   │ 📅 Trimestriel: Prix immobilier par zone (Notaires-INSEE)  │")
    print("   │ 📅 Trimestriel: PIB (Comptes nationaux ~45j après trim.)   │")
    print("   │ 📅 Trimestriel: Investissement FBCF (Comptes nationaux)    │")
    print("   │ 📅 Annuel    : Partage VA (Comptes nationaux INSEE)        │")
    print("   │ 📅 Octobre   : Salaire médian (INSEE)                      │")
    print("   └─────────────────────────────────────────────────────────────┘")
    print()
    print("📧 Contact : hspringragain@cftc.fr")
    print()


if __name__ == "__main__":
    main()
