#!/usr/bin/env python3
"""
Script de récupération automatique des données économiques pour la CFTC
Sources : INSEE (API SDMX), Banque de France

Données récupérées automatiquement :
- Inflation (IPC) - mensuel
- Chômage (BIT) - trimestriel  
- SMIC - mis à jour lors des revalorisations
- Indices SMB (Salaire Mensuel de Base) par secteur - trimestriel
- Salaires nets moyens H/F - annuel (octobre)

Données statiques (à mettre à jour manuellement 1x/an) :
- Salaire médian
- PPV (Prime de Partage de la Valeur)
- Écart H/F à poste comparable
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

# Séries pour l'inflation et indicateurs existants
SERIES_IDS = {
    # Inflation
    "inflation_ensemble": "001759970",      # IPC ensemble des ménages
    "inflation_alimentation": "001764565",  # IPC Alimentation
    "inflation_energie": "001764645",       # IPC Énergie  
    "inflation_services": "001764629",      # IPC Services
    "inflation_manufactures": "001764597",  # IPC Produits manufacturés
    
    # Chômage
    "chomage_total": "001688526",           # Taux de chômage BIT ensemble
    "chomage_jeunes": "001688530",          # Taux de chômage 15-24 ans
    
    # Indices de salaire (SMB trimestriel)
    "smb_ensemble": "001567234",            # SMB ensemble secteur privé
    "smb_industrie": "001567236",           # SMB industrie
    "smb_construction": "001567238",        # SMB construction
    "smb_tertiaire": "001567240",           # SMB tertiaire
    
    # Salaires nets moyens annuels (séries longues)
    "salaire_net_femmes": "010752373",      # Salaire net moyen femmes temps complet
    "salaire_net_hommes": "010752374",      # Salaire net moyen hommes temps complet
    "salaire_net_ensemble": "010752372",    # Salaire net moyen ensemble temps complet
    
    # Salaires par CSP
    "salaire_cadres": "010752376",          # Salaire net moyen cadres
    "salaire_ouvriers": "010752380",        # Salaire net moyen ouvriers
    "salaire_employes": "010752379",        # Salaire net moyen employés
    "salaire_prof_int": "010752378",        # Salaire net moyen professions intermédiaires
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
        
        # Namespace SDMX
        ns = {
            'message': 'http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message',
            'generic': 'http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/structurespecific'
        }
        
        observations = []
        
        # Chercher les observations dans différentes structures possibles
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


def get_latest_value(series_id):
    """Récupère la dernière valeur d'une série"""
    data = fetch_insee_series(series_id, start_period="2020")
    if data and len(data) > 0:
        return data[-1]
    return None


def get_annual_values(series_id, start_year=2015):
    """Récupère les valeurs annuelles d'une série"""
    data = fetch_insee_series(series_id, start_period=str(start_year))
    if not data:
        return []
    
    # Filtrer pour ne garder que les données annuelles ou la dernière de chaque année
    annual = {}
    for obs in data:
        year = obs['period'][:4]
        annual[year] = obs['value']
    
    return [{'annee': k, 'valeur': v} for k, v in sorted(annual.items())]


def get_quarterly_values(series_id, start_year=2023):
    """Récupère les valeurs trimestrielles"""
    data = fetch_insee_series(series_id, start_period=str(start_year))
    if not data:
        return []
    
    result = []
    for obs in data:
        period = obs['period']
        # Convertir format YYYY-QN en "TN YYYY"
        if '-Q' in period:
            year, quarter = period.split('-Q')
            trimestre = f"T{quarter} {year}"
        else:
            trimestre = period
        result.append({'trimestre': trimestre, 'valeur': obs['value']})
    
    return result


# ============================================================================
# CONSTRUCTION DES DONNÉES
# ============================================================================

def build_inflation_data():
    """Construit les données d'inflation"""
    print("📊 Récupération des données d'inflation...")
    
    # Données annuelles d'inflation
    inflation_annuelle = []
    
    # Valeurs par défaut si l'API échoue
    default_inflation = [
        {"annee": "2020", "inflation": 0.5, "smic": 1.2, "salaires_base": 1.5},
        {"annee": "2021", "inflation": 1.6, "smic": 2.2, "salaires_base": 1.4},
        {"annee": "2022", "inflation": 5.2, "smic": 5.6, "salaires_base": 3.5},
        {"annee": "2023", "inflation": 4.9, "smic": 6.6, "salaires_base": 4.2},
        {"annee": "2024", "inflation": 2.0, "smic": 2.0, "salaires_base": 2.8},
        {"annee": "2025", "inflation": 0.9, "smic": 1.2, "salaires_base": 2.0},
    ]
    
    # Essayer de récupérer les données réelles
    data = fetch_insee_series(SERIES_IDS["inflation_ensemble"], "2020")
    if data:
        # Calculer les moyennes annuelles
        annual_avg = {}
        for obs in data:
            year = obs['period'][:4]
            if year not in annual_avg:
                annual_avg[year] = []
            annual_avg[year].append(obs['value'])
        
        # Calculer le glissement annuel moyen
        years = sorted(annual_avg.keys())
        for i, year in enumerate(years):
            if i > 0:
                prev_year = years[i-1]
                current_avg = sum(annual_avg[year]) / len(annual_avg[year])
                prev_avg = sum(annual_avg[prev_year]) / len(annual_avg[prev_year])
                inflation = round(((current_avg / prev_avg) - 1) * 100, 1)
                
                # Trouver les données SMIC et salaires correspondantes
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
    
    # Récupérer les indices SMB pour calculer les évolutions
    smb_industrie = get_quarterly_values(SERIES_IDS["smb_industrie"], 2023)
    smb_construction = get_quarterly_values(SERIES_IDS["smb_construction"], 2023)
    smb_tertiaire = get_quarterly_values(SERIES_IDS["smb_tertiaire"], 2023)
    
    if smb_industrie and len(smb_industrie) >= 4:
        # Calculer l'évolution sur un an pour chaque secteur
        def calc_evolution(data):
            if len(data) >= 4:
                latest = data[-1]['valeur']
                year_ago = data[-4]['valeur'] if len(data) >= 4 else data[0]['valeur']
                return round(((latest / year_ago) - 1) * 100, 1)
            return 0.0
        
        evol_industrie = calc_evolution(smb_industrie)
        evol_construction = calc_evolution(smb_construction)
        evol_tertiaire = calc_evolution(smb_tertiaire)
        
        # Mettre à jour les évolutions
        for s in default_secteurs:
            if s['secteur'] == 'Industrie':
                s['evolution'] = evol_industrie
            elif s['secteur'] == 'Construction':
                s['evolution'] = evol_construction
            elif s['secteur'] == 'Tertiaire (moyenne)':
                s['evolution'] = evol_tertiaire
        
        print(f"  ✓ Évolutions SMB mises à jour (Industrie: {evol_industrie}%, Construction: {evol_construction}%, Tertiaire: {evol_tertiaire}%)")
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
            # Garder les dernières années
            evolution = evolution[-7:] if len(evolution) > 7 else evolution
            return {
                "ecart_global": 22.2,  # Valeur statique (tous temps de travail)
                "ecart_eqtp": evolution[-1]['ecart'] if evolution else 13.0,
                "ecart_poste_comparable": 4.0,  # Valeur statique
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
    """Données du salaire médian - STATIQUE (à mettre à jour manuellement)"""
    print("📊 Salaire médian (données statiques)...")
    
    return {
        "montant_2024": 2190,
        "montant_2023": 2091,
        "montant_2022": 2090,
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
    """Données PPV - STATIQUE (à mettre à jour manuellement via Urssaf)"""
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
# FONCTION PRINCIPALE
# ============================================================================

def main():
    print("=" * 60)
    print("🔄 MISE À JOUR DES DONNÉES ÉCONOMIQUES - CFTC")
    print(f"   {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print("=" * 60)
    print()
    
    # Construire toutes les données
    inflation_salaires = build_inflation_data()
    chomage = build_chomage_data()
    salaires_secteur = build_salaires_secteur_data()
    ecart_hf = build_ecart_hf_data()
    salaire_median = build_salaire_median_data()
    ppv = build_ppv_data()
    
    # Données statiques
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
    
    # Indicateurs clés (dernières valeurs)
    derniers_chomage = chomage[-1] if chomage else {"taux": 7.7, "jeunes": 19.2}
    
    indicateurs_cles = {
        "taux_chomage_actuel": derniers_chomage.get("taux", 7.7),
        "inflation_annuelle": 0.9,  # À mettre à jour
        "smic_brut": smic["montant_brut"],
        "smic_net": smic["montant_net"],
        "salaire_median": salaire_median["montant_2024"],
        "salaire_moyen": 2733,
        "ecart_hf_eqtp": ecart_hf["ecart_eqtp"]
    }
    
    # Salaires par CSP
    salaires_csp = [
        {"categorie": "Cadres", "salaire": 4812, "evolution_reelle": 0.1},
        {"categorie": "Prof. intermédiaires", "salaire": 2633, "evolution_reelle": -0.1},
        {"categorie": "Employés", "salaire": 1941, "evolution_reelle": 0.4},
        {"categorie": "Ouvriers", "salaire": 2051, "evolution_reelle": 1.1},
    ]
    
    # Assembler le JSON final
    data = {
        "last_updated": datetime.now().isoformat(),
        "sources": [
            "INSEE - Indice des prix à la consommation",
            "INSEE - Enquête Emploi",
            "INSEE - Base Tous salariés",
            "INSEE - Indices trimestriels de salaire (ACEMO)",
            "Banque de France - Négociations salariales",
            "DARES - Statistiques du marché du travail",
            "Urssaf - Prime de partage de la valeur"
        ],
        "inflation_salaires": inflation_salaires,
        "pouvoir_achat_cumule": pouvoir_achat_cumule,
        "chomage": chomage,
        "smic": smic,
        "inflation_detail": inflation_detail,
        "indicateurs_cles": indicateurs_cles,
        "salaire_median": salaire_median,
        "ecart_hommes_femmes": ecart_hf,
        "salaires_secteur": salaires_secteur,
        "salaires_csp": salaires_csp,
        "ppv": ppv
    }
    
    # Écrire le fichier JSON
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, '..', 'public', 'data.json')
    output_path = os.path.abspath(output_path)
    
    # S'assurer que le dossier existe
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print()
    print("=" * 60)
    print(f"✅ Données mises à jour : {output_path}")
    print("=" * 60)
    print()
    print("📌 RAPPEL - Données à mettre à jour MANUELLEMENT (1x/an) :")
    print("   - Salaire médian (octobre, publication INSEE)")
    print("   - PPV (mars, données Urssaf)")
    print("   - Écart H/F à poste comparable (mars, INSEE Focus)")
    print("   - SMIC (janvier, revalorisation légale)")
    print()


if __name__ == "__main__":
    main()
