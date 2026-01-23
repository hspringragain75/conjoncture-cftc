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
- Prix carburants (API data.gouv.fr) - en temps réel

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
- Panier Familial CFTC (janvier - prix produits)
- Heures de travail (janvier - prix produits emblématiques)
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
    "chomage_jeunes": "001688537",
    
    # === EMPLOI ===
    "chomage_seniors": "001688530",           # Taux de chômage BIT 50 ans ou plus - CVS
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

def build_chomage_seniors_data():
    """
    Récupère le taux de chômage des 50 ans ou plus via API INSEE
    Série: 001688530 - Taux de chômage BIT 50+ - France métropolitaine - CVS
    """
    print("📊 Récupération du taux de chômage seniors (50+)...")
    
    # Données par défaut
    default_data = [
        {"trimestre": "T1 2023", "taux": 5.0},
        {"trimestre": "T2 2023", "taux": 5.1},
        {"trimestre": "T3 2023", "taux": 5.0},
        {"trimestre": "T4 2023", "taux": 4.9},
        {"trimestre": "T1 2024", "taux": 5.0},
        {"trimestre": "T2 2024", "taux": 5.1},
        {"trimestre": "T3 2024", "taux": 5.2},
        {"trimestre": "T4 2024", "taux": 5.2},
        {"trimestre": "T1 2025", "taux": 5.3},
        {"trimestre": "T2 2025", "taux": 5.4},
        {"trimestre": "T3 2025", "taux": 5.5},
    ]
    
    data = get_quarterly_values(SERIES_IDS["chomage_seniors"], 2023)
    
    if data:
        result = [{"trimestre": d['trimestre'], "taux": round(d['valeur'], 1)} for d in data]
        print(f"  ✓ {len(result)} trimestres récupérés")
        return result
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_data


def build_emploi_seniors_data():
    """
    Taux d'emploi des seniors (55-64 ans) - DONNÉES STATIQUES
    
    NOTE: Pas de série API trimestrielle disponible pour le taux d'emploi 55-64 ans.
    Données basées sur l'Enquête Emploi INSEE (publication annuelle).
    Source: INSEE - "Une photographie du marché du travail en 2024"
    À mettre à jour annuellement (publication mars/avril).
    """
    print("📊 Taux d'emploi seniors (55-64 ans) - données statiques INSEE...")
    
    # Données statiques basées sur INSEE Enquête Emploi
    # Source: https://www.insee.fr/fr/statistiques/8391807
    seniors_data = [
        {"trimestre": "T1 2023", "taux": 56.5},
        {"trimestre": "T2 2023", "taux": 57.0},
        {"trimestre": "T3 2023", "taux": 57.5},
        {"trimestre": "T4 2023", "taux": 58.4},
        {"trimestre": "T1 2024", "taux": 59.0},
        {"trimestre": "T2 2024", "taux": 59.6},
        {"trimestre": "T3 2024", "taux": 60.2},
        {"trimestre": "T4 2024", "taux": 60.4},  # Chiffre annuel 2024
        {"trimestre": "T1 2025", "taux": 60.8},
        {"trimestre": "T2 2025", "taux": 61.1},
        {"trimestre": "T3 2025", "taux": 61.5},  # Estimation
    ]
    
    print(f"  ✓ {len(seniors_data)} trimestres (données statiques)")
    return seniors_data


def build_emploi_seniors_detail(taux_actuel):
    """
    Données détaillées sur l'emploi des seniors (STATIQUE - mise à jour annuelle)
    Sources: INSEE Enquête Emploi 2024, DARES
    """
    print("📊 Données détaillées seniors (statique)...")
    
    detail = {
        # Taux d'emploi par tranche - INSEE 2024
        "taux_55_64": taux_actuel,
        "taux_55_59": 77.8,       # Stable, proche du taux 25-49 ans
        "taux_60_64": 38.9,       # En forte hausse (+3.4 pts en 2024, réforme retraites)
        
        # Chômage des seniors - DARES 2024
        "chomage_seniors": 5.2,   # Inférieur à la moyenne nationale (7.4%)
        
        # Évolution
        "evolution_1an": 1.9,     # Points de progression sur 1 an
        
        # Caractéristiques
        "duree_chomage_moyenne_mois": 18,
        "taux_temps_partiel": 25.5,
        "part_cdi": 89.2,
        
        # Comparaison UE - Eurostat 2024
        "comparaison_ue": {
            "france": taux_actuel,
            "allemagne": 72.3,
            "moyenne_ue": 65.2,
            "suede": 77.0,
            "pays_bas": 71.2,
            "italie": 57.3,
            "espagne": 55.8
        },
        
        # Source
        "sources": ["INSEE - Enquête Emploi 2024", "DARES - Tableau de bord seniors", "Eurostat"]
    }
    
    print(f"  ✓ Taux 55-59: {detail['taux_55_59']}%, 60-64: {detail['taux_60_64']}%")
    return detail


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
    
    # Données annuelles de référence (INSEE - Comptes nationaux)
    donnees_annuelles = [
        {"annee": "2019", "croissance": 1.8},
        {"annee": "2020", "croissance": -7.5},
        {"annee": "2021", "croissance": 6.4},
        {"annee": "2022", "croissance": 2.6},
        {"annee": "2023", "croissance": 1.1},
        {"annee": "2024", "croissance": 1.1},  # Chiffre officiel INSEE
        {"annee": "2025", "croissance": 0.8},  # Estimation
    ]
    
    default_pib = {
        "croissance_trim_actuel": 0.4,
        "croissance_annuelle": 1.1,  # 2024 officiel
        "trimestre": "T3 2025",
        "commentaire": "PIB volume trimestriel",
        "evolution": [
            {"trimestre": "T1 2022", "croissance": 0.5},
            {"trimestre": "T2 2022", "croissance": 0.4},
            {"trimestre": "T3 2022", "croissance": 0.6},
            {"trimestre": "T4 2022", "croissance": 0.1},
            {"trimestre": "T1 2023", "croissance": 0.0},
            {"trimestre": "T2 2023", "croissance": 0.7},
            {"trimestre": "T3 2023", "croissance": 0.1},
            {"trimestre": "T4 2023", "croissance": 0.1},
            {"trimestre": "T1 2024", "croissance": 0.3},
            {"trimestre": "T2 2024", "croissance": 0.2},
            {"trimestre": "T3 2024", "croissance": 0.4},
            {"trimestre": "T4 2024", "croissance": -0.1},
            {"trimestre": "T1 2025", "croissance": 0.2},
            {"trimestre": "T2 2025", "croissance": 0.3},
            {"trimestre": "T3 2025", "croissance": 0.4},
        ],
        "contributions": {
            "trimestre": "T3 2025",
            "demande_interieure": 0.3,
            "commerce_exterieur": 0.1,
            "stocks": -0.1
        },
        "annuel": donnees_annuelles
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
            
            print(f"  ✓ {len(evolution)} trimestres de PIB récupérés")
            return {
                "croissance_trim_actuel": latest['croissance'],
                "croissance_annuelle": 1.1,  # Toujours utiliser le chiffre officiel 2024
                "trimestre": latest['trimestre'],
                "commentaire": "PIB volume trimestriel - INSEE",
                "evolution": evolution,
                "contributions": default_pib['contributions'],
                "annuel": donnees_annuelles
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
# PANIER FAMILIAL CFTC & HEURES DE TRAVAIL
# À mettre à jour : chaque JANVIER (prix annuels)
# ============================================================================

def fetch_prix_carburants_api():
    """
    Récupère le prix moyen du SP95 via l'API data.gouv.fr (AUTOMATIQUE)
    Retourne le prix en €/L ou None si erreur
    """
    try:
        url = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?select=avg(sp95_prix)%20as%20prix_moyen&limit=1"
        req = urllib.request.Request(url, headers={'User-Agent': 'CFTC-Dashboard/2.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get('results') and len(data['results']) > 0:
                prix = data['results'][0].get('prix_moyen')
                if prix:
                    return round(prix / 1000, 3)  # Convertir millièmes en €/L
    except Exception as e:
        print(f"   ⚠️  Erreur API carburants: {e}")
    return None


def build_panier_familial_data():
    """
    Construit les données de l'Indice Panier Familial CFTC
    
    MISE À JOUR MANUELLE : Janvier de chaque année
    - Vérifier les prix des produits alimentaires (INSEE IPC)
    - Mettre à jour les tarifs énergie (CRE)
    - Actualiser les tarifs transports (RATP, SNCF)
    - Réviser les coûts famille (cantine, crèche)
    """
    print("   🧺 Construction du Panier Familial CFTC...")
    
    # Tenter de récupérer le prix essence en temps réel
    prix_essence_api = fetch_prix_carburants_api()
    prix_essence_2026 = prix_essence_api if prix_essence_api else 1.75
    print(f"      Prix essence SP95: {prix_essence_2026}€/L {'(API)' if prix_essence_api else '(manuel)'}")
    
    return {
        "lastUpdate": datetime.now().strftime("%B %Y"),
        "description": "Indice du coût de la vie pour les familles françaises",
        "familles_types": {
            "solo": "Parent solo + 1 enfant",
            "couple2": "Couple + 2 enfants"
        },
        "produits": [
            # ==================== ALIMENTATION ====================
            # Sources: INSEE IPC détaillé par produit
            {"id": "baguette", "nom": "Baguette tradition", "categorie": "Alimentation", "unite": "unité", "icon": "🥖",
             "prix": {2015: 0.87, 2018: 0.89, 2020: 0.90, 2022: 0.95, 2023: 1.07, 2024: 1.12, 2025: 1.15, 2026: 1.18},
             "quantiteMensuelle": {"solo": 15, "couple2": 45}, "source": "INSEE IPC"},
            {"id": "lait", "nom": "Lait demi-écrémé", "categorie": "Alimentation", "unite": "litre", "icon": "🥛",
             "prix": {2015: 0.76, 2018: 0.78, 2020: 0.79, 2022: 0.85, 2023: 1.02, 2024: 1.08, 2025: 1.05, 2026: 1.06},
             "quantiteMensuelle": {"solo": 6, "couple2": 20}, "source": "INSEE IPC"},
            {"id": "oeufs", "nom": "Œufs (x12)", "categorie": "Alimentation", "unite": "boîte", "icon": "🥚",
             "prix": {2015: 2.20, 2018: 2.35, 2020: 2.45, 2022: 2.75, 2023: 3.45, 2024: 3.60, 2025: 3.50, 2026: 3.55},
             "quantiteMensuelle": {"solo": 2, "couple2": 6}, "source": "INSEE IPC"},
            {"id": "pates", "nom": "Pâtes (500g)", "categorie": "Alimentation", "unite": "paquet", "icon": "🍝",
             "prix": {2015: 0.85, 2018: 0.88, 2020: 0.90, 2022: 1.05, 2023: 1.35, 2024: 1.28, 2025: 1.22, 2026: 1.20},
             "quantiteMensuelle": {"solo": 4, "couple2": 10}, "source": "INSEE IPC"},
            {"id": "poulet", "nom": "Poulet (kg)", "categorie": "Alimentation", "unite": "kg", "icon": "🍗",
             "prix": {2015: 6.50, 2018: 6.80, 2020: 7.10, 2022: 7.90, 2023: 9.20, 2024: 9.50, 2025: 9.30, 2026: 9.40},
             "quantiteMensuelle": {"solo": 2, "couple2": 5}, "source": "INSEE IPC"},
            {"id": "fruits", "nom": "Pommes (kg)", "categorie": "Alimentation", "unite": "kg", "icon": "🍎",
             "prix": {2015: 2.10, 2018: 2.25, 2020: 2.35, 2022: 2.55, 2023: 2.85, 2024: 2.95, 2025: 2.90, 2026: 2.95},
             "quantiteMensuelle": {"solo": 3, "couple2": 8}, "source": "INSEE IPC"},
            {"id": "fromage", "nom": "Emmental (250g)", "categorie": "Alimentation", "unite": "paquet", "icon": "🧀",
             "prix": {2015: 2.15, 2018: 2.25, 2020: 2.35, 2022: 2.60, 2023: 3.10, 2024: 3.25, 2025: 3.20, 2026: 3.25},
             "quantiteMensuelle": {"solo": 2, "couple2": 5}, "source": "INSEE IPC"},
            {"id": "cafe", "nom": "Café moulu (250g)", "categorie": "Alimentation", "unite": "paquet", "icon": "☕",
             "prix": {2015: 2.80, 2018: 2.90, 2020: 3.00, 2022: 3.40, 2023: 4.20, 2024: 4.50, 2025: 4.40, 2026: 4.45},
             "quantiteMensuelle": {"solo": 1, "couple2": 2}, "source": "INSEE IPC"},
            
            # ==================== ÉNERGIE ====================
            # Sources: data.gouv.fr (carburants), CRE (électricité, gaz)
            {"id": "essence", "nom": "Essence SP95", "categorie": "Énergie", "unite": "litre", "icon": "⛽",
             "prix": {2015: 1.25, 2018: 1.45, 2020: 1.30, 2022: 1.85, 2023: 1.92, 2024: 1.78, 2025: 1.72, 2026: prix_essence_2026},
             "quantiteMensuelle": {"solo": 40, "couple2": 80}, "source": "data.gouv.fr (API)", "automatisable": True},
            {"id": "electricite", "nom": "Électricité", "categorie": "Énergie", "unite": "kWh", "icon": "⚡",
             "prix": {2015: 0.145, 2018: 0.155, 2020: 0.165, 2022: 0.175, 2023: 0.225, 2024: 0.252, 2025: 0.255, 2026: 0.258},
             "quantiteMensuelle": {"solo": 150, "couple2": 350}, "source": "CRE"},
            {"id": "gaz", "nom": "Gaz naturel", "categorie": "Énergie", "unite": "kWh", "icon": "🔥",
             "prix": {2015: 0.055, 2018: 0.058, 2020: 0.062, 2022: 0.095, 2023: 0.105, 2024: 0.095, 2025: 0.088, 2026: 0.085},
             "quantiteMensuelle": {"solo": 200, "couple2": 450}, "source": "CRE"},
            
            # ==================== LOGEMENT ====================
            # Sources: INSEE (IRL), assureurs
            {"id": "loyer", "nom": "Loyer moyen", "categorie": "Logement", "unite": "m²", "icon": "🏠",
             "prix": {2015: 12.5, 2018: 13.2, 2020: 13.8, 2022: 14.5, 2023: 15.1, 2024: 15.6, 2025: 15.9, 2026: 16.2},
             "quantiteMensuelle": {"solo": 35, "couple2": 75}, "source": "INSEE/IRL"},
            {"id": "assurance_hab", "nom": "Assurance habitation", "categorie": "Logement", "unite": "mois", "icon": "🏡",
             "prix": {2015: 15, 2018: 16, 2020: 17, 2022: 19, 2023: 22, 2024: 24, 2025: 26, 2026: 28},
             "quantiteMensuelle": {"solo": 1, "couple2": 1}, "source": "Assureurs"},
            {"id": "eau", "nom": "Eau (m³)", "categorie": "Logement", "unite": "m³", "icon": "💧",
             "prix": {2015: 3.50, 2018: 3.70, 2020: 3.90, 2022: 4.10, 2023: 4.30, 2024: 4.50, 2025: 4.70, 2026: 4.85},
             "quantiteMensuelle": {"solo": 4, "couple2": 12}, "source": "Services des eaux"},
            
            # ==================== TRANSPORT ====================
            # Sources: RATP, IDFM, SNCF
            {"id": "metro", "nom": "Ticket métro/bus", "categorie": "Transport", "unite": "ticket", "icon": "🚇",
             "prix": {2015: 1.80, 2018: 1.90, 2020: 1.90, 2022: 2.10, 2023: 2.10, 2024: 2.15, 2025: 2.50, 2026: 2.50},
             "quantiteMensuelle": {"solo": 40, "couple2": 60}, "source": "RATP/Keolis"},
            {"id": "navigo", "nom": "Pass Navigo", "categorie": "Transport", "unite": "mois", "icon": "🚌",
             "prix": {2015: 70.0, 2018: 75.20, 2020: 75.20, 2022: 75.20, 2023: 84.10, 2024: 86.40, 2025: 88.80, 2026: 88.80},
             "quantiteMensuelle": {"solo": 1, "couple2": 2}, "source": "IDFM"},
            
            # ==================== FAMILLE ====================
            # Sources: CAF, communes, CSF
            {"id": "couches", "nom": "Couches (paquet 30)", "categorie": "Famille", "unite": "paquet", "icon": "👶",
             "prix": {2015: 9.50, 2018: 10.20, 2020: 10.80, 2022: 11.50, 2023: 13.20, 2024: 14.00, 2025: 14.50, 2026: 15.00},
             "quantiteMensuelle": {"solo": 0, "couple2": 4}, "source": "Relevé prix"},
            {"id": "cantine", "nom": "Cantine scolaire", "categorie": "Famille", "unite": "repas", "icon": "🍽️",
             "prix": {2015: 3.20, 2018: 3.45, 2020: 3.65, 2022: 3.90, 2023: 4.30, 2024: 4.60, 2025: 4.85, 2026: 5.00},
             "quantiteMensuelle": {"solo": 0, "couple2": 36}, "source": "Communes"},
            {"id": "creche", "nom": "Crèche (jour)", "categorie": "Famille", "unite": "jour", "icon": "🧒",
             "prix": {2015: 25, 2018: 28, 2020: 30, 2022: 33, 2023: 36, 2024: 38, 2025: 40, 2026: 42},
             "quantiteMensuelle": {"solo": 0, "couple2": 15}, "source": "CAF"},
            {"id": "rentree", "nom": "Fournitures scolaires", "categorie": "Famille", "unite": "an", "icon": "🎒",
             "prix": {2015: 180, 2018: 195, 2020: 210, 2022: 230, 2023: 255, 2024: 280, 2025: 300, 2026: 320},
             "quantiteMensuelle": {"solo": 0, "couple2": 0.33}, "source": "CSF/Familles de France"},
            {"id": "activites_enfants", "nom": "Activités extra-scolaires", "categorie": "Famille", "unite": "mois", "icon": "⚽",
             "prix": {2015: 40, 2018: 45, 2020: 50, 2022: 55, 2023: 60, 2024: 65, 2025: 70, 2026: 75},
             "quantiteMensuelle": {"solo": 0, "couple2": 1}, "source": "Estimation"},
            
            # ==================== SANTÉ ====================
            # Sources: DREES, Sécu
            {"id": "mutuelle", "nom": "Mutuelle familiale", "categorie": "Santé", "unite": "mois", "icon": "🏥",
             "prix": {2015: 95, 2018: 105, 2020: 115, 2022: 125, 2023: 140, 2024: 155, 2025: 165, 2026: 175},
             "quantiteMensuelle": {"solo": 0.5, "couple2": 1}, "source": "DREES"},
            {"id": "pharmacie", "nom": "Pharmacie (reste à charge)", "categorie": "Santé", "unite": "mois", "icon": "💊",
             "prix": {2015: 15, 2018: 16, 2020: 17, 2022: 18, 2023: 20, 2024: 22, 2025: 23, 2026: 24},
             "quantiteMensuelle": {"solo": 1, "couple2": 1}, "source": "Sécu"},
            
            # ==================== NUMÉRIQUE ====================
            # Sources: ARCEP, sites officiels
            {"id": "mobile", "nom": "Forfait mobile", "categorie": "Numérique", "unite": "mois", "icon": "📱",
             "prix": {2015: 25, 2018: 20, 2020: 15, 2022: 12, 2023: 12, 2024: 13, 2025: 14, 2026: 14},
             "quantiteMensuelle": {"solo": 1, "couple2": 2}, "source": "ARCEP"},
            {"id": "internet", "nom": "Box internet", "categorie": "Numérique", "unite": "mois", "icon": "📡",
             "prix": {2015: 35, 2018: 32, 2020: 30, 2022: 30, 2023: 32, 2024: 34, 2025: 35, 2026: 36},
             "quantiteMensuelle": {"solo": 1, "couple2": 1}, "source": "ARCEP"},
            {"id": "streaming", "nom": "Streaming (Netflix/Spotify)", "categorie": "Numérique", "unite": "mois", "icon": "🎬",
             "prix": {2015: 15, 2018: 18, 2020: 20, 2022: 22, 2023: 25, 2024: 28, 2025: 30, 2026: 32},
             "quantiteMensuelle": {"solo": 1, "couple2": 1}, "source": "Sites officiels"},
            
            # ==================== LOISIRS ====================
            # Sources: CNC, estimation
            {"id": "cinema", "nom": "Place de cinéma", "categorie": "Loisirs", "unite": "place", "icon": "🎥",
             "prix": {2015: 10.20, 2018: 10.80, 2020: 11.00, 2022: 11.50, 2023: 12.50, 2024: 13.50, 2025: 14.00, 2026: 14.50},
             "quantiteMensuelle": {"solo": 2, "couple2": 4}, "source": "CNC"},
            {"id": "sport", "nom": "Abonnement sport", "categorie": "Loisirs", "unite": "mois", "icon": "🏃",
             "prix": {2015: 30, 2018: 32, 2020: 35, 2022: 38, 2023: 42, 2024: 45, 2025: 48, 2026: 50},
             "quantiteMensuelle": {"solo": 0.5, "couple2": 0.5}, "source": "Estimation"},
            {"id": "livres", "nom": "Livres/Presse", "categorie": "Loisirs", "unite": "mois", "icon": "📚",
             "prix": {2015: 15, 2018: 16, 2020: 17, 2022: 18, 2023: 19, 2024: 20, 2025: 21, 2026: 22},
             "quantiteMensuelle": {"solo": 1, "couple2": 1}, "source": "Estimation"},
        ]
    }


def build_heures_travail_data():
    """
    Construit les données du calculateur "Heures de travail au SMIC"
    
    MISE À JOUR MANUELLE : Janvier de chaque année
    - Vérifier le SMIC horaire net (JO/Légifrance)
    - Actualiser les prix des produits emblématiques
    """
    print("   ⏱️  Construction des données Heures de Travail...")
    
    # SMIC horaire NET historique (source: Légifrance, URSSAF)
    # À METTRE À JOUR CHAQUE 1ER JANVIER
    smic_horaire_net = {
        2010: 6.96,
        2011: 7.06,
        2012: 7.26,
        2013: 7.39,
        2014: 7.46,
        2015: 7.58,
        2016: 7.64,
        2017: 7.72,
        2018: 7.83,
        2019: 7.94,
        2020: 8.03,
        2021: 8.11,
        2022: 8.58,
        2023: 8.92,
        2024: 9.22,
        2025: 9.40,
        2026: 9.52,  # À confirmer janvier 2026
    }
    
    return {
        "lastUpdate": datetime.now().strftime("%B %Y"),
        "description": "Combien d'heures au SMIC pour acheter...",
        "smic_horaire_net": smic_horaire_net,
        "produits": [
            # ==================== HIGH-TECH ====================
            {"id": "iphone", "nom": "iPhone (dernier modèle)", "categorie": "High-Tech", "icon": "📱",
             "prix": {2010: 629, 2012: 679, 2015: 749, 2018: 859, 2020: 909, 2022: 1019, 2024: 969, 2025: 1019, 2026: 1069},
             "source": "Apple.com"},
            {"id": "macbook", "nom": "MacBook Air", "categorie": "High-Tech", "icon": "💻",
             "prix": {2010: 999, 2012: 999, 2015: 999, 2018: 1199, 2020: 1129, 2022: 1199, 2024: 1199, 2025: 1249, 2026: 1299},
             "source": "Apple.com"},
            {"id": "samsung", "nom": "Samsung Galaxy (haut de gamme)", "categorie": "High-Tech", "icon": "📲",
             "prix": {2010: 499, 2012: 599, 2015: 699, 2018: 859, 2020: 909, 2022: 979, 2024: 899, 2025: 949, 2026: 999},
             "source": "Samsung.com"},
            {"id": "tv", "nom": "TV 55 pouces 4K", "categorie": "High-Tech", "icon": "📺",
             "prix": {2010: 2500, 2012: 1800, 2015: 900, 2018: 600, 2020: 500, 2022: 480, 2024: 450, 2025: 420, 2026: 400},
             "source": "Comparateurs"},
            {"id": "console", "nom": "Console de jeux (PS/Xbox)", "categorie": "High-Tech", "icon": "🎮",
             "prix": {2010: 299, 2012: 299, 2015: 399, 2018: 299, 2020: 499, 2022: 549, 2024: 449, 2025: 479, 2026: 499},
             "source": "Constructeurs"},
            {"id": "airpods", "nom": "Écouteurs sans fil", "categorie": "High-Tech", "icon": "🎧",
             "prix": {2018: 179, 2020: 279, 2022: 279, 2024: 249, 2025: 249, 2026: 249},
             "source": "Constructeurs"},
            
            # ==================== TRANSPORT ====================
            {"id": "plein", "nom": "Plein d'essence (50L)", "categorie": "Transport", "icon": "⛽",
             "prix": {2010: 65, 2012: 80, 2015: 62, 2018: 72, 2020: 65, 2022: 92, 2024: 89, 2025: 86, 2026: 88},
             "source": "data.gouv.fr"},
            {"id": "voiture", "nom": "Voiture neuve (citadine)", "categorie": "Transport", "icon": "🚗",
             "prix": {2010: 12000, 2012: 13000, 2015: 14000, 2018: 15500, 2020: 17000, 2022: 20000, 2024: 22000, 2025: 23000, 2026: 24000},
             "source": "Argus"},
            {"id": "voiture_occasion", "nom": "Voiture occasion (5 ans)", "categorie": "Transport", "icon": "🚙",
             "prix": {2010: 8000, 2012: 8500, 2015: 9000, 2018: 10000, 2020: 11000, 2022: 14000, 2024: 13000, 2025: 12500, 2026: 12000},
             "source": "La Centrale"},
            {"id": "velo_elec", "nom": "Vélo électrique", "categorie": "Transport", "icon": "🚲",
             "prix": {2010: 1200, 2012: 1300, 2015: 1400, 2018: 1600, 2020: 1800, 2022: 2000, 2024: 1800, 2025: 1700, 2026: 1600},
             "source": "Comparateurs"},
            
            # ==================== LOGEMENT ====================
            {"id": "loyer_mensuel", "nom": "Loyer mensuel moyen (T3)", "categorie": "Logement", "icon": "🏠",
             "prix": {2010: 620, 2012: 660, 2015: 700, 2018: 750, 2020: 800, 2022: 850, 2024: 920, 2025: 980, 2026: 1020},
             "source": "INSEE/Clameur"},
            {"id": "m2_achat", "nom": "Prix au m² (France moyenne)", "categorie": "Logement", "icon": "🏗️",
             "prix": {2010: 2800, 2012: 3100, 2015: 3200, 2018: 3500, 2020: 3800, 2022: 4200, 2024: 4000, 2025: 3900, 2026: 3850},
             "source": "Notaires de France"},
            {"id": "electromenager", "nom": "Lave-linge", "categorie": "Logement", "icon": "🧺",
             "prix": {2010: 450, 2012: 420, 2015: 400, 2018: 380, 2020: 350, 2022: 380, 2024: 400, 2025: 420, 2026: 430},
             "source": "Comparateurs"},
            {"id": "canape", "nom": "Canapé 3 places", "categorie": "Logement", "icon": "🛋️",
             "prix": {2010: 600, 2012: 650, 2015: 700, 2018: 750, 2020: 800, 2022: 900, 2024: 950, 2025: 1000, 2026: 1050},
             "source": "Enseignes ameublement"},
            
            # ==================== FAMILLE ====================
            {"id": "rentree_complete", "nom": "Rentrée scolaire (1 enfant)", "categorie": "Famille", "icon": "🎒",
             "prix": {2010: 280, 2012: 300, 2015: 320, 2018: 350, 2020: 380, 2022: 420, 2024: 470, 2025: 500, 2026: 530},
             "source": "CSF"},
            {"id": "vacances", "nom": "Vacances famille (1 semaine)", "categorie": "Famille", "icon": "🏖️",
             "prix": {2010: 1200, 2012: 1300, 2015: 1400, 2018: 1550, 2020: 1600, 2022: 1850, 2024: 2100, 2025: 2200, 2026: 2300},
             "source": "Observatoire tourisme"},
            {"id": "noel", "nom": "Cadeaux Noël (par enfant)", "categorie": "Famille", "icon": "🎄",
             "prix": {2010: 180, 2012: 190, 2015: 200, 2018: 220, 2020: 230, 2022: 250, 2024: 280, 2025: 300, 2026: 320},
             "source": "Études consommation"},
            {"id": "anniversaire", "nom": "Anniversaire enfant (fête)", "categorie": "Famille", "icon": "🎂",
             "prix": {2010: 150, 2012: 170, 2015: 190, 2018: 220, 2020: 250, 2022: 280, 2024: 320, 2025: 350, 2026: 380},
             "source": "Estimation"},
            {"id": "poussette", "nom": "Poussette (milieu de gamme)", "categorie": "Famille", "icon": "👶",
             "prix": {2010: 300, 2012: 320, 2015: 350, 2018: 380, 2020: 400, 2022: 450, 2024: 480, 2025: 500, 2026: 520},
             "source": "Comparateurs"},
            
            # ==================== ALIMENTATION ====================
            {"id": "caddie", "nom": "Caddie hebdo famille", "categorie": "Alimentation", "icon": "🛒",
             "prix": {2010: 120, 2012: 130, 2015: 135, 2018: 145, 2020: 155, 2022: 180, 2024: 195, 2025: 200, 2026: 210},
             "source": "INSEE"},
            {"id": "resto", "nom": "Restaurant (2 pers.)", "categorie": "Alimentation", "icon": "🍽️",
             "prix": {2010: 45, 2012: 50, 2015: 55, 2018: 60, 2020: 65, 2022: 75, 2024: 85, 2025: 90, 2026: 95},
             "source": "Estimation"},
            {"id": "mcdo", "nom": "Menu McDonald's", "categorie": "Alimentation", "icon": "🍔",
             "prix": {2010: 6.50, 2012: 7.00, 2015: 7.50, 2018: 8.00, 2020: 8.50, 2022: 9.50, 2024: 10.50, 2025: 11.00, 2026: 11.50},
             "source": "McDonald's"},
            
            # ==================== LOISIRS ====================
            {"id": "concert", "nom": "Concert / spectacle", "categorie": "Loisirs", "icon": "🎤",
             "prix": {2010: 45, 2012: 50, 2015: 55, 2018: 65, 2020: 70, 2022: 80, 2024: 95, 2025: 100, 2026: 110},
             "source": "Ticketmaster"},
            {"id": "festival", "nom": "Festival musique (3 jours)", "categorie": "Loisirs", "icon": "🎪",
             "prix": {2010: 120, 2012: 140, 2015: 160, 2018: 200, 2020: 220, 2022: 260, 2024: 300, 2025: 320, 2026: 350},
             "source": "Festivals"},
            {"id": "abonnement_streaming", "nom": "Abonnements streaming (an)", "categorie": "Loisirs", "icon": "🎬",
             "prix": {2012: 96, 2015: 120, 2018: 180, 2020: 240, 2022: 300, 2024: 360, 2025: 400, 2026: 440},
             "source": "Netflix/Disney/Spotify"},
            {"id": "sport_annuel", "nom": "Abonnement sport (an)", "categorie": "Loisirs", "icon": "🏋️",
             "prix": {2010: 350, 2012: 380, 2015: 400, 2018: 450, 2020: 480, 2022: 500, 2024: 540, 2025: 580, 2026: 620},
             "source": "Salles de sport"},
            {"id": "livre", "nom": "Livre (roman)", "categorie": "Loisirs", "icon": "📚",
             "prix": {2010: 18, 2012: 19, 2015: 20, 2018: 21, 2020: 22, 2022: 23, 2024: 24, 2025: 25, 2026: 26},
             "source": "Librairies"},
            {"id": "cinema_famille", "nom": "Cinéma famille (4 pers.)", "categorie": "Loisirs", "icon": "🎥",
             "prix": {2010: 36, 2012: 40, 2015: 42, 2018: 44, 2020: 46, 2022: 50, 2024: 54, 2025: 56, 2026: 58},
             "source": "CNC"},
            {"id": "parc_attractions", "nom": "Parc attractions (famille 4)", "categorie": "Loisirs", "icon": "🎢",
             "prix": {2010: 180, 2012: 200, 2015: 230, 2018: 270, 2020: 300, 2022: 350, 2024: 400, 2025: 420, 2026: 450},
             "source": "Parcs"},
            
            # ==================== SANTÉ ====================
            {"id": "lunettes", "nom": "Lunettes de vue", "categorie": "Santé", "icon": "👓",
             "prix": {2010: 350, 2012: 380, 2015: 400, 2018: 350, 2020: 300, 2022: 280, 2024: 250, 2025: 230, 2026: 220},
             "source": "Opticiens (100% santé)"},
            {"id": "dentiste", "nom": "Couronne dentaire", "categorie": "Santé", "icon": "🦷",
             "prix": {2010: 400, 2012: 450, 2015: 480, 2018: 500, 2020: 500, 2022: 500, 2024: 500, 2025: 500, 2026: 500},
             "source": "Dentistes (100% santé)"},
            {"id": "osteo", "nom": "Séance ostéopathe", "categorie": "Santé", "icon": "💆",
             "prix": {2010: 50, 2012: 55, 2015: 60, 2018: 65, 2020: 70, 2022: 75, 2024: 80, 2025: 85, 2026: 90},
             "source": "Praticiens"},
            
            # ==================== HABILLEMENT ====================
            {"id": "baskets", "nom": "Baskets (marque)", "categorie": "Habillement", "icon": "👟",
             "prix": {2010: 80, 2012: 90, 2015: 100, 2018: 110, 2020: 120, 2022: 130, 2024: 140, 2025: 150, 2026: 160},
             "source": "Enseignes sport"},
            {"id": "manteau", "nom": "Manteau hiver", "categorie": "Habillement", "icon": "🧥",
             "prix": {2010: 100, 2012: 110, 2015: 120, 2018: 130, 2020: 140, 2022: 160, 2024: 180, 2025: 190, 2026: 200},
             "source": "Enseignes"},
            {"id": "jeans", "nom": "Jean (marque moyenne)", "categorie": "Habillement", "icon": "👖",
             "prix": {2010: 60, 2012: 65, 2015: 70, 2018: 75, 2020: 80, 2022: 85, 2024: 90, 2025: 95, 2026: 100},
             "source": "Enseignes"},
        ]
    }




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
    chomage_seniors = build_chomage_seniors_data()  # Nouvelle série 001688530
    emploi_seniors = build_emploi_seniors_data()    # Données statiques taux d'emploi
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
    
    # === PANIER FAMILIAL CFTC (NOUVEAU) ===
    print()
    print("━" * 70)
    print("🧺 PANIER FAMILIAL & HEURES DE TRAVAIL")
    print("━" * 70)
    
    panier_familial = build_panier_familial_data()
    heures_travail = build_heures_travail_data()
    
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
    
    # ============================================================
    # SYSTÈME D'ALERTES - Nouveautés à afficher
    # ============================================================
    # Modifiez cette section quand vous mettez à jour des données importantes
    # Format: {"id": unique, "date": "YYYY-MM-DD", "type": "info|warning|success", "titre": "...", "message": "...", "onglet": "nom_onglet"}
    
    alertes_nouveautes = [
        {
            "id": "smic_2026",
            "date": "2026-01-01",
            "type": "success",
            "titre": "🎉 SMIC 2026",
            "message": "Le SMIC a été revalorisé de 2% au 1er janvier 2026. Nouveau montant net : 1 462€/mois.",
            "onglet": "salaires"
        },
        {
            "id": "chomage_t3_2025",
            "date": "2025-11-15",
            "type": "info",
            "titre": "📊 Chômage T3 2025",
            "message": "Taux de chômage T3 2025 : 7.4% (+0.1 point). Le chômage des jeunes reste élevé à 19.2%.",
            "onglet": "emploi"
        },
        {
            "id": "inflation_dec_2025",
            "date": "2025-12-15",
            "type": "success",
            "titre": "📉 Inflation en baisse",
            "message": "L'inflation annuelle est passée sous les 1.5% en décembre 2025. Bonne nouvelle pour le pouvoir d'achat !",
            "onglet": "inflation"
        },
        {
            "id": "previsions_bdf_2026",
            "date": "2025-12-18",
            "type": "info",
            "titre": "🔮 Prévisions Banque de France",
            "message": "Nouvelles projections : PIB +1.0% en 2026, inflation 1.4%, chômage 7.7%.",
            "onglet": "previsions"
        }
    ]
    
    # Assembler le JSON final
    data = {
        "last_updated": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "last_updated_iso": datetime.now().isoformat(),
        "contact": "hspringragain@cftc.fr",
        "alertes": alertes_nouveautes,
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
        "emploi_seniors": emploi_seniors,  # Taux d'emploi 55-64 (statique)
        "chomage_seniors": chomage_seniors,  # Taux de chômage 50+ (API INSEE 001688530)
        "emploi_seniors_detail": {
            # Taux d'emploi par tranche - INSEE 2024
            "taux_55_64": derniers_seniors.get("taux", 60.4),
            "taux_55_59": 77.8,       # Stable, proche du taux 25-49 ans
            "taux_60_64": 38.9,       # En forte hausse (+3.4 pts en 2024)
            
            # Chômage 50+ - API INSEE (série 001688530)
            "chomage_seniors": chomage_seniors[-1]["taux"] if chomage_seniors else 5.2,
            
            # Évolution
            "evolution_1an": 1.9,     # Points de progression taux emploi sur 1 an
            
            # Caractéristiques
            "duree_chomage_moyenne_mois": 18,
            "taux_temps_partiel": 25.5,
            
            # Comparaison UE - Eurostat 2024
            "comparaison_ue": {
                "france": derniers_seniors.get("taux", 60.4),
                "allemagne": 72.3,
                "moyenne_ue": 65.2,
                "suede": 77.0,
                "pays_bas": 71.2,
                "italie": 57.3,
                "espagne": 55.8
            },
            
            # Source
            "sources": ["INSEE - Enquête Emploi 2024", "INSEE - Série 001688530 (chômage 50+)", "Eurostat"]
        },
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
        
        # PANIER FAMILIAL CFTC (NOUVEAU)
        "panier_familial": panier_familial,
        "heures_travail": heures_travail,
        
        # ============================================================
        # SOURCES PAR ONGLET
        # ============================================================
        "sources_par_onglet": {
            "conjoncture": "INSEE - Comptes nationaux, Banque de France",
            "previsions": "Banque de France (projections macroéconomiques), INSEE (Note de conjoncture)",
            "evolutions": "INSEE - Comptes nationaux trimestriels, IPC, Enquête Emploi",
            "pouvoir_achat": "UNAF - Budgets types des familles, INSEE - IPC",
            "salaires": "INSEE - DADS, Base Tous Salariés, ACEMO",
            "emploi": "INSEE - Enquête Emploi, DARES - MMO, France Travail - BMO",
            "conditions_vie": "INSEE - IRL, Notaires de France, Prix des carburants (data.gouv)",
            "inflation": "INSEE - Indice des Prix à la Consommation (IPC)",
            "conventions": "Ministère du Travail - Suivi des salaires conventionnels, Légifrance",
            "comparaison_ue": "Eurostat - Statistiques structurelles sur les salaires",
            "territoires": "INSEE - Estimations d'emploi localisées, Enquête Emploi régionale"
        },
        
        # ============================================================
        # DONNÉES STATIQUES POUR ONGLETS SPÉCIALISÉS
        # ============================================================
        
        # PRÉVISIONS MACRO (Banque de France, INSEE)
        "previsions": {
            "banque_de_france": {
                "date_publication": "Décembre 2025",
                "pib_croissance": {"2024": 1.1, "2025": 0.9, "2026": 1.0, "2027": 1.3, "2028": 1.5},
                "inflation_ipch": {"2024": 2.4, "2025": 1.6, "2026": 1.4, "2027": 1.8, "2028": 1.8},
                "taux_chomage": {"2024": 7.4, "2025": 7.6, "2026": 7.7, "2027": 7.5, "2028": 7.3},
                "salaires_nominaux": {"2024": 3.2, "2025": 2.8, "2026": 2.5, "2027": 2.6, "2028": 2.7},
                "salaires_reels": {"2024": 0.8, "2025": 1.2, "2026": 1.1, "2027": 0.8, "2028": 0.9},
                "taux_epargne": {"2024": 17.6, "2025": 17.2, "2026": 16.8, "2027": 16.5, "2028": 16.2}
            },
            "insee": {
                "date_publication": "Décembre 2025",
                "pib_t1_2026": 0.3,
                "emploi_t1_2026": 0.1,
                "inflation_dec_2025": 1.4,
                "consommation_menages": 0.4
            },
            "consensus": {"pib_2026": 1.0, "inflation_2026": 1.5, "chomage_2026": 7.6},
            "sources": "Banque de France (Projections macroéconomiques), INSEE (Note de conjoncture)"
        },
        
        # DONNÉES RÉGIONALES (Territoires) - avec tensions et évol chômage
        "donnees_regionales": {
            "source": "INSEE T3 2025",
            "sources": "INSEE - Estimations d'emploi localisées, Taux de chômage localisés",
            "france_metro": {
                "taux_chomage": 7.4,
                "salaire_median_net": 2091,
                "taux_emploi": 68.4,
                "tensions_recrutement_pct": 61
            },
            "regions": [
                {"nom": "Île-de-France", "code": "IDF", "chomage": 6.8, "salaire_median": 2520, "emploi": 70.2, "population": 12.3, "tensions": 65, "evol_chomage": -0.3},
                {"nom": "Auvergne-Rhône-Alpes", "code": "ARA", "chomage": 6.4, "salaire_median": 2180, "emploi": 70.8, "population": 8.1, "tensions": 68, "evol_chomage": -0.2},
                {"nom": "Nouvelle-Aquitaine", "code": "NAQ", "chomage": 6.9, "salaire_median": 2010, "emploi": 67.5, "population": 6.0, "tensions": 58, "evol_chomage": 0.1},
                {"nom": "Occitanie", "code": "OCC", "chomage": 8.9, "salaire_median": 1980, "emploi": 65.2, "population": 6.0, "tensions": 55, "evol_chomage": 0.2},
                {"nom": "Hauts-de-France", "code": "HDF", "chomage": 9.2, "salaire_median": 1920, "emploi": 63.8, "population": 6.0, "tensions": 52, "evol_chomage": 0.3},
                {"nom": "Grand Est", "code": "GES", "chomage": 7.5, "salaire_median": 2020, "emploi": 66.9, "population": 5.5, "tensions": 60, "evol_chomage": 0.0},
                {"nom": "Provence-Alpes-Côte d'Azur", "code": "PAC", "chomage": 8.1, "salaire_median": 2080, "emploi": 64.5, "population": 5.1, "tensions": 57, "evol_chomage": 0.1},
                {"nom": "Pays de la Loire", "code": "PDL", "chomage": 5.8, "salaire_median": 2050, "emploi": 71.2, "population": 3.8, "tensions": 72, "evol_chomage": -0.4},
                {"nom": "Bretagne", "code": "BRE", "chomage": 5.9, "salaire_median": 2030, "emploi": 70.5, "population": 3.4, "tensions": 70, "evol_chomage": -0.3},
                {"nom": "Normandie", "code": "NOR", "chomage": 7.2, "salaire_median": 1980, "emploi": 66.8, "population": 3.3, "tensions": 58, "evol_chomage": 0.1},
                {"nom": "Bourgogne-Franche-Comté", "code": "BFC", "chomage": 6.5, "salaire_median": 1990, "emploi": 68.2, "population": 2.8, "tensions": 62, "evol_chomage": -0.1},
                {"nom": "Centre-Val de Loire", "code": "CVL", "chomage": 7.0, "salaire_median": 2010, "emploi": 67.5, "population": 2.6, "tensions": 59, "evol_chomage": 0.0},
                {"nom": "Corse", "code": "COR", "chomage": 7.3, "salaire_median": 1950, "emploi": 64.8, "population": 0.35, "tensions": 54, "evol_chomage": 0.2}
            ]
        },
        
        # CONVENTIONS COLLECTIVES - avec statistiques_branches
        "conventions_collectives": {
            "smic_reference": {
                "mensuel": 1426.30,
                "annuel": 17116,
                "date": "Janvier 2026"
            },
            "statistiques_branches": {
                "total_branches": 171,
                "branches_conformes": 142,
                "branches_non_conformes": 29,
                "pourcentage_non_conformes": 17
            },
            "branches": [
                {"id": "metallurgie", "nom": "Métallurgie", "idcc": "3248", "effectif": 1500000, "statut": "conforme",
                 "grille": [{"niveau": "A1", "coefficient": 135, "minimum_mensuel": 1480, "minimum_annuel": 17760},
                            {"niveau": "A2", "coefficient": 145, "minimum_mensuel": 1520, "minimum_annuel": 18240},
                            {"niveau": "B1", "coefficient": 155, "minimum_mensuel": 1580, "minimum_annuel": 18960},
                            {"niveau": "B2", "coefficient": 170, "minimum_mensuel": 1650, "minimum_annuel": 19800},
                            {"niveau": "C1", "coefficient": 190, "minimum_mensuel": 1750, "minimum_annuel": 21000}]},
                {"id": "commerce_detail", "nom": "Commerce de détail alimentaire", "idcc": "2216", "effectif": 180000, "statut": "non_conforme",
                 "grille": [{"niveau": "1A", "coefficient": 120, "minimum_mensuel": 1400, "minimum_annuel": 16800},
                            {"niveau": "1B", "coefficient": 125, "minimum_mensuel": 1410, "minimum_annuel": 16920},
                            {"niveau": "2A", "coefficient": 135, "minimum_mensuel": 1450, "minimum_annuel": 17400},
                            {"niveau": "2B", "coefficient": 145, "minimum_mensuel": 1500, "minimum_annuel": 18000}]},
                {"id": "hotellerie", "nom": "Hôtels, cafés, restaurants (HCR)", "idcc": "1979", "effectif": 750000, "statut": "conforme",
                 "grille": [{"niveau": "I-1", "coefficient": 100, "minimum_mensuel": 1450, "minimum_annuel": 17400},
                            {"niveau": "I-2", "coefficient": 110, "minimum_mensuel": 1480, "minimum_annuel": 17760},
                            {"niveau": "II-1", "coefficient": 120, "minimum_mensuel": 1520, "minimum_annuel": 18240},
                            {"niveau": "II-2", "coefficient": 130, "minimum_mensuel": 1580, "minimum_annuel": 18960}]},
                {"id": "batiment", "nom": "Bâtiment (ouvriers)", "idcc": "1597", "effectif": 520000, "statut": "conforme",
                 "grille": [{"niveau": "N1-P1", "coefficient": 150, "minimum_mensuel": 1520, "minimum_annuel": 18240},
                            {"niveau": "N1-P2", "coefficient": 170, "minimum_mensuel": 1580, "minimum_annuel": 18960},
                            {"niveau": "N2", "coefficient": 185, "minimum_mensuel": 1650, "minimum_annuel": 19800},
                            {"niveau": "N3-P1", "coefficient": 210, "minimum_mensuel": 1780, "minimum_annuel": 21360}]},
                {"id": "proprete", "nom": "Propreté (nettoyage)", "idcc": "3043", "effectif": 550000, "statut": "non_conforme",
                 "grille": [{"niveau": "AS1", "coefficient": 100, "minimum_mensuel": 1400, "minimum_annuel": 16800},
                            {"niveau": "AS2", "coefficient": 105, "minimum_mensuel": 1420, "minimum_annuel": 17040},
                            {"niveau": "AS3", "coefficient": 110, "minimum_mensuel": 1460, "minimum_annuel": 17520},
                            {"niveau": "AQS1", "coefficient": 118, "minimum_mensuel": 1510, "minimum_annuel": 18120}]},
                {"id": "securite", "nom": "Prévention et sécurité", "idcc": "1351", "effectif": 180000, "statut": "non_conforme",
                 "grille": [{"niveau": "I", "coefficient": 120, "minimum_mensuel": 1405, "minimum_annuel": 16860},
                            {"niveau": "II", "coefficient": 130, "minimum_mensuel": 1430, "minimum_annuel": 17160},
                            {"niveau": "III-1", "coefficient": 140, "minimum_mensuel": 1470, "minimum_annuel": 17640}]}
            ]
        },
        
        # ÉGALITÉ PROFESSIONNELLE - version complète
        "egalite_professionnelle": {
            "index_moyen_national": 88,
            "entreprises_conformes_pct": 77,
            "nombre_declarations": 31000,
            "repartition_notes": {"moins_de_75": 23, "entre_75_et_85": 35, "plus_de_85": 42},
            "par_taille": [
                {"taille": "50-250 salariés", "index_moyen": 86, "part_conformes": 72},
                {"taille": "251-999 salariés", "index_moyen": 88, "part_conformes": 79},
                {"taille": "1000+ salariés", "index_moyen": 91, "part_conformes": 88}
            ],
            "notes_lecture": [
                "📊 L'index moyen national est de 88/100 en 2025",
                "⚖️ 23% des entreprises sont sous le seuil légal de 75 points",
                "💰 L'écart de rémunération moyen reste de 4% à poste égal",
                "📈 Progression de 4 points depuis 2020 (84 → 88)"
            ],
            "sources": "Ministère du Travail - Index Egapro",
            "evolution": [{"annee": 2020, "index": 84}, {"annee": 2021, "index": 85}, {"annee": 2022, "index": 86}, {"annee": 2023, "index": 87}, {"annee": 2024, "index": 88}, {"annee": 2025, "index": 88}]
        },
        
        # ACCIDENTS DU TRAVAIL - version complète avec bonne structure
        "accidents_travail": {
            "total_national": {
                "accidents_avec_arret": 640000,
                "indice_frequence": 32.4,
                "indice_gravite": 1.3,
                "accidents_mortels": 738,
                "maladies_professionnelles": 47000,
                "evolution_vs_2019": -3.2
            },
            "par_secteur": [
                {"secteur": "BTP", "accidents": 85000, "part_pct": 13, "if": 52},
                {"secteur": "Industrie", "accidents": 120000, "part_pct": 19, "if": 28},
                {"secteur": "Transport/Logistique", "accidents": 75000, "part_pct": 12, "if": 45},
                {"secteur": "Commerce", "accidents": 95000, "part_pct": 15, "if": 24},
                {"secteur": "Services", "accidents": 180000, "part_pct": 28, "if": 18},
                {"secteur": "Santé/Action sociale", "accidents": 85000, "part_pct": 13, "if": 35}
            ],
            "notes_lecture": [
                "⚠️ 738 accidents mortels recensés en 2024",
                "📈 Indice de fréquence : 32.4 accidents pour 1000 salariés",
                "💰 Coût total AT/MP : 14.2 milliards d'euros par an",
                "🏗️ Le BTP reste le secteur le plus accidentogène (fréquence 52)"
            ],
            "sources": "CNAM-TS (Assurance Maladie), DARES"
        },
        # FORMATION PROFESSIONNELLE - DONNÉES CDC MonCompteFormation (28/12/2025)
        # ⚠️ MàJ trimestrielle manuelle via PPT Caisse des Dépôts
        "formation": {
            "source_cdc": "Caisse des Dépôts - Point utilisation MonCompteFormation au 28/12/2025",
            "date_mise_a_jour": "28/12/2025",
            
            # Données CPF actualisées
            "cpf": {
                "solde_moyen_euros": 1520,
                "titulaires_millions": 38,
                "participation_forfaitaire": 102.23,  # Indexé sur inflation : 100€ mai 2024 → 102,23€ janv. 2025
                
                # Historique des dossiers validés par année
                "historique_dossiers": [
                    {"annee": "2019-2020", "dossiers_millions": 1.18, "cout_mds": 1.44, "prix_moyen": 1215},
                    {"annee": "2021", "dossiers_millions": 2.35, "cout_mds": 3.17, "prix_moyen": 1350},
                    {"annee": "2022", "dossiers_millions": 2.09, "cout_mds": 3.00, "prix_moyen": 1438},
                    {"annee": "2023", "dossiers_millions": 1.45, "cout_mds": 2.26, "prix_moyen": 1559},
                    {"annee": "2024", "dossiers_millions": 1.49, "cout_mds": 2.36, "prix_moyen": 1587},
                    {"annee": "2025", "dossiers_millions": 1.33, "cout_mds": 2.36, "prix_moyen": 1776}
                ],
                
                # Cumul depuis lancement
                "cumul": {
                    "dossiers_millions": 9.89,
                    "cout_total_mds": 14.59,
                    "prix_moyen_global": 1476
                },
                
                # Données 2025 détaillées
                "dossiers_2025": 1330000,
                "cout_pedagogique_2025_mds": 2.36,
                "prix_moyen_2025": 1776,
                "taux_annulation_pct": 7.1,
                
                # Top formations demandées 2025
                "top_domaines": [
                    {"domaine": "Transport, manutention, magasinage", "part_pct": 39.8, "evolution": -4.6},
                    {"domaine": "Insertion sociale et professionnelle", "part_pct": 10.3, "evolution": -1.5},
                    {"domaine": "Langues vivantes", "part_pct": 10.3, "evolution": 0.7},
                    {"domaine": "Informatique, réseaux", "part_pct": 7.2, "evolution": 0.5},
                    {"domaine": "Coiffure, esthétique, services", "part_pct": 3.5, "evolution": 0.6},
                    {"domaine": "Sécurité, police, surveillance", "part_pct": 2.7, "evolution": 0.8}
                ],
                
                # Top certifications 2025
                "top_certifications": [
                    {"nom": "Permis de conduire B", "dossiers_k": 298.2, "cout_m": 330},
                    {"nom": "Bilan de compétences", "dossiers_k": 91.6, "cout_m": 190},
                    {"nom": "Accompagnement VAE", "dossiers_k": 36.2, "cout_m": 61},
                    {"nom": "Permis de conduire C", "dossiers_k": 29.8, "cout_m": 66},
                    {"nom": "Anglais professionnel (English 360)", "dossiers_k": 26.3, "cout_m": 66},
                    {"nom": "TOEIC", "dossiers_k": 24.2, "cout_m": 53},
                    {"nom": "CACES (chariots)", "dossiers_k": 21.4, "cout_m": 16},
                    {"nom": "Permis BE", "dossiers_k": 18.8, "cout_m": 19},
                    {"nom": "Excel bureautique", "dossiers_k": 15.6, "cout_m": 37}
                ]
            },
            
            # Portrait des stagiaires CPF
            "profil_stagiaires": {
                "annee": 2025,
                "statut": {
                    "demandeurs_emploi_pct": 43,
                    "salaries_pct": 57
                },
                "demandeurs_emploi": {
                    "dossiers_2025_k": 570,
                    "part_dossiers_pct": 42.8,
                    "cout_mds": 0.93,
                    "part_cout_pct": 39.4,
                    "financement": {
                        "france_competences_pct": 87.3,
                        "france_travail_pct": 5.4,
                        "autres_pct": 7.3
                    }
                },
                "genre": {"femmes_pct": 47, "hommes_pct": 53},
                "tranches_age": [
                    {"tranche": "16-25 ans", "pct": 15},
                    {"tranche": "26-35 ans", "pct": 32},
                    {"tranche": "36-45 ans", "pct": 26},
                    {"tranche": "46-55 ans", "pct": 17},
                    {"tranche": "56 ans et +", "pct": 9}
                ],
                "csp_salaries": {"non_cadres_pct": 79, "cadres_pct": 21},
                "niveau_diplome": [
                    {"niveau": "Bac+5 et plus", "pct": 16},
                    {"niveau": "Bac+3 et 4", "pct": 13},
                    {"niveau": "Bac+2", "pct": 13},
                    {"niveau": "Bac", "pct": 23},
                    {"niveau": "CAP, BEP", "pct": 22},
                    {"niveau": "Sans diplôme/Brevet", "pct": 13}
                ]
            },
            
            # CPF sur temps de travail
            "temps_travail": {
                "formations_sur_temps_travail_2024_pct": 17.4,
                "formations_sur_temps_travail_2025_pct": 20.0,
                "nb_formations_salaries_2025": 143992,
                "cout_formations_salaries_2025_m": 278.2,
                "dotation_entreprise_pct": 4.7,
                "top_formations_temps_travail": [
                    {"nom": "Permis B", "nb": 22304, "cout_m": 25},
                    {"nom": "Accompagnement VAE", "nb": 7984, "cout_m": 13},
                    {"nom": "Bilan de compétences", "nb": 7045, "cout_m": 15},
                    {"nom": "Permis C", "nb": 5115, "cout_m": 11},
                    {"nom": "TOEIC", "nb": 3069, "cout_m": 8}
                ]
            },
            
            # Financement CPF
            "financement": {
                "annee": 2025,
                "total_cout_mds": 2.21,
                "repartition": [
                    {"financeur": "France Compétences (droits CPF)", "part_pct": 91.7, "montant_m": 1950},
                    {"financeur": "Participation forfaitaire titulaire", "part_pct": 7.1, "montant_m": 156},
                    {"financeur": "France Travail", "part_pct": 2.1, "montant_m": 47},
                    {"financeur": "Régions et OPCO", "part_pct": 1.0, "montant_m": 22},
                    {"financeur": "Dotations entreprises", "part_pct": 1.2, "montant_m": 26}
                ],
                "participation_forfaitaire": {
                    "obligatoire_depuis": "2024-05-02",
                    "montant_euros": 102.23,
                    "montant_initial_mai_2024": 100,
                    "description": "Participation indexée sur l'inflation. 100€ en mai 2024, 102,23€ au 01/01/2025. Montant 2026 à préciser (loi de finances)"
                }
            },
            
            # Dotations employeurs
            "dotations_employeurs": {
                "dotations_creees": 48119,
                "beneficiaires": 133351,
                "montant_total_m": 309,
                "evolution_dossiers_2025": 12200,
                "montant_2025_m": 25.6
            },
            
            # Offre de formation disponible
            "offre": {
                "organismes_actifs": 14094,
                "certifications_disponibles": 3672,
                "formations_differentes": 185279,
                "sessions_disponibles": 878322,
                "part_sessions_distance_pct": 10.9,
                "prix_moyen_catalogue": 2435,
                "repartition_offre": [
                    {"domaine": "Transport", "part_pct": 33.6},
                    {"domaine": "Langues vivantes", "part_pct": 17.4},
                    {"domaine": "Autres", "part_pct": 49.0}
                ]
            },
            
            # Permis de conduire
            "permis_conduire": {
                "total_cumule_mds": 2.17,
                "permis_voiture_mds": 1.57,
                "permis_moto_m": 163,
                "organismes_permis": 3187,
                "organismes_moto": 1314,
                "dossiers_2025": 12139,
                "cout_2025_m": 23.4
            },
            
            # Qualité et évaluation
            "qualite": {
                "evaluations_totales": 816293,
                "dossiers_clotures_total": 8152649,
                "taux_evaluation_pct": 10,
                "note_moyenne_globale": 4.5,
                "note_moyenne_formations_actives": 4.7,
                "formations_evaluees_actives": 36364,
                "of_avec_evaluations": 10064
            },
            
            # Usage de la plateforme
            "usage_plateforme": {
                "visites_cumulees_2025_m": 70.9,
                "visites_cumulees_2024_m": 67.1,
                "part_site_web_pct": 84.9,
                "part_application_mobile_pct": 15.1,
                "delai_reponse_of_2j_pct": 72
            },
            
            # Taux d'accès (données DARES)
            "taux_acces": {
                "global": 42,
                "par_csp": [
                    {"csp": "Cadres", "taux": 62},
                    {"csp": "Professions intermédiaires", "taux": 52},
                    {"csp": "Employés", "taux": 38},
                    {"csp": "Ouvriers", "taux": 28}
                ]
            },
            
            # Alternance (données complémentaires)
            "alternance": {
                "contrats_apprentissage_2024": 920000,
                "total_alternants": 1050000,
                "taux_insertion_6mois": 72,
                "evolution_vs_2023": 8,
                "repartition_niveau": [
                    {"niveau": "CAP-BEP", "pct": 22},
                    {"niveau": "Bac Pro", "pct": 28},
                    {"niveau": "BTS-DUT", "pct": 25},
                    {"niveau": "Licence+", "pct": 25}
                ]
            },
            
            # Plan de formation entreprise
            "plan_formation": {
                "acces_formation_cadres_pct": 62,
                "acces_formation_ouvriers_pct": 28,
                "duree_moyenne_heures": 27,
                "budget_entreprises_mds": 32,
                "budget_moyen_par_salarie": 700
            },
            
            # Notes de lecture actualisées
            "notes_lecture": [
                "📊 43% des bénéficiaires CPF sont des demandeurs d'emploi en 2025 (vs 31% en 2023)",
                "💰 Participation forfaitaire CPF : 102,23€ depuis janvier 2025 (indexée sur l'inflation, montant 2026 à venir)",
                "⏰ 20% des formations CPF se font sur le temps de travail (vs 17.4% en 2024) → argument pour négocier !",
                "🚗 Le permis de conduire représente près de 40% des formations CPF",
                "📈 79% des salariés utilisant le CPF sont des non-cadres",
                "🏢 Taux d'accès à la formation : cadres 62% vs ouvriers 28% → inégalité persistante",
                "⭐ Note moyenne des formations : 4.7/5 (mais seulement 10% sont évaluées)"
            ],
            
            "sources": "Caisse des Dépôts (MonCompteFormation), France Compétences, DARES"
        },
        
                # ÉPARGNE SALARIALE - version complète avec bonne structure
        "epargne_salariale": {
            "couverture": {
                "salaries_couverts_pct": 52,
                "salaries_couverts_millions": 11.2,
                "entreprises_couvertes_pct": 22
            },
            "montants_totaux": {
                "primes_brutes_mds": 22.8,
                "participation_mds": 10.2,
                "interessement_mds": 12.6
            },
            "montants_moyens": {
                "participation": 1850,
                "interessement": 2100,
                "abondement_pee": 820
            },
            "encours": {
                "total_mds": 188,
                "pee_mds": 156,
                "perco_pereco_mds": 32,
                "evolution": [
                    {"annee": 2020, "encours": 145},
                    {"annee": 2021, "encours": 162},
                    {"annee": 2022, "encours": 158},
                    {"annee": 2023, "encours": 172},
                    {"annee": 2024, "encours": 182},
                    {"annee": 2025, "encours": 188}
                ]
            },
            "notes_lecture": [
                "💰 Participation moyenne versée : 1 850€ par bénéficiaire",
                "📈 Intéressement moyen : 2 100€ - 52% des salariés couverts",
                "🏦 Encours total de l'épargne salariale : 188 milliards d'euros",
                "📊 Progression de 29% des encours depuis 2020"
            ],
            "sources": "DARES, AFG (Association Française de la Gestion)"
        },
        
        # TEMPS DE TRAVAIL - version complète avec bonne structure
        "temps_travail": {
            "duree_travail": {
                "duree_hebdo_habituelle": 37.2,
                "duree_legale": 35,
                "duree_annuelle_effective": 1607,
                "heures_sup_trimestrielles_m": 185
            },
            "temps_partiel": {
                "taux_global_pct": 17.3,
                "taux_femmes": 26.5,
                "taux_hommes": 8.1,
                "temps_partiel_subi_pct": 24
            },
            "horaires_atypiques": {
                "travail_samedi_pct": 28,
                "travail_dimanche_pct": 12,
                "travail_soir_pct": 15,
                "travail_nuit_pct": 7
            },
            "teletravail": {
                "taux_salaries": 26,
                "jours_moyens_semaine": 1.8,
                "eligible_non_pratiquant_pct": 15
            },
            "repartition_duree": [
                {"tranche": "Moins de 30h", "pct": 12},
                {"tranche": "30-34h", "pct": 8},
                {"tranche": "35h", "pct": 32},
                {"tranche": "36-39h", "pct": 28},
                {"tranche": "40h et plus", "pct": 20}
            ],
            "notes_lecture": [
                "⏰ Temps partiel : 26.5% des femmes vs 8.1% des hommes",
                "🏠 Télétravail : 26% des salariés concernés",
                "💼 185 millions d'heures supplémentaires par trimestre",
                "⚖️ Durée hebdomadaire moyenne : 37.2 heures"
            ],
            "sources": "INSEE - Enquête Emploi, DARES"
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
    print("   │ 📅 Janvier   : Panier Familial CFTC (prix produits)        │")
    print("   │ 📅 Janvier   : Heures de travail (prix + SMIC horaire)     │")
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
    print("   │ 📅 Trimestriel: CPF/Formation (PPT Caisse des Dépôts)      │")
    print("   └─────────────────────────────────────────────────────────────┘")
    print()
    print("   🧺 PANIER FAMILIAL - Prix essence récupéré automatiquement (API)")
    print()
    print("📧 Contact : hspringragain@cftc.fr")
    print()


if __name__ == "__main__":
    main()
