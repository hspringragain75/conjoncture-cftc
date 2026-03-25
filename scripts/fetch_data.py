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
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import os
import re

def normalize_zero(value):
    """Évite les -0.0 qui posent problème en JavaScript."""
    return 0.0 if value == 0 else value
# ============================================================================
# CONFIGURATION DES SÉRIES INSEE
# ============================================================================

INSEE_BASE_URL = "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM"
DARES_BASE_URL = "https://data.dares.travail-emploi.gouv.fr/api/explore/v2.1"

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
    
    # === EMPLOI PAR SECTEUR (séries CVS trimestrielles INSEE) ===
    "emploi_industrie":          "001577235",  # Emplois salariés - Industrie (B,C,D,E) - CVS
    "emploi_construction":       "001577236",  # Emplois salariés - Construction (F) - CVS
    "emploi_tertiaire_marchand": "001577237",  # Emplois salariés - Tertiaire marchand (G,H,I,J,K,L,M,N,R,S,T) - CVS
    "emploi_tertiaire_nonmarc":  "001796855",  # Emplois salariés - Tertiaire non marchand (O,Q) - CVS
    "emploi_interim":            "001694214",  # Emploi intérimaire
    
    # === SALAIRES ===
    "smb_ensemble": "001694074",       # Acemo - évolution SMB ensemble (remplace 001567234)
    "smb_industrie": "001694078",       # Acemo - évolution SMB industrie (remplace 001567236)
    "smb_construction": "001694082",    # Acemo - évolution SMB construction (remplace 001567238)
    "smb_tertiaire": "001694086",       # Acemo - évolution SMB tertiaire (remplace 001567240)
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

    # === CHÔMAGE DROM (taux localisés - source : INSEE BDM) ===
    # Séries vérifiées sur insee.fr/fr/statistiques/serie/XXXXXXXXX
    "chomage_guadeloupe": "010751337",        # Taux de chômage localisé - Guadeloupe (971)
    "chomage_martinique": "010751338",        # Taux de chômage localisé - Martinique (972)
    "chomage_guyane":     "010751339",        # Taux de chômage localisé - Guyane (973)
    "chomage_reunion":    "010751340",        # Taux de chômage localisé - La Réunion (974)
    # Mayotte : données annuelles uniquement (enquête Emploi démarrée jan. 2024)
    # → mise à jour manuelle recommandée
}


# ============================================================================
# FONCTION DE RÉCUPÉRATION DES DONNÉES DARES
# ============================================================================

def fetch_dares_dataset(dataset_id, limit=100):
    """
    Récupère les données d'un dataset DARES via l'API OpenDataSoft v2.1.
    URL exacte : /api/explore/v2.1/catalog/datasets/{id}/records?sort=-date
    """
    # sort=-date est la syntaxe correcte OpenDataSoft (pas order_by=date desc)
    url = f"{DARES_BASE_URL}/catalog/datasets/{dataset_id}/records?limit={limit}&sort=-date"

    try:
        req = urllib.request.Request(url, headers={
            "Accept":     "application/json",
            "User-Agent": "CFTC-Dashboard/2.0",
        })
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
            results = data.get("results", [])
            if results:
                print(f"  ✅ DARES {dataset_id}: {len(results)} enregistrements")
            return results if results else None
    except urllib.error.HTTPError as e:
        print(f"  ⚠️ HTTP {e.code} dataset DARES {dataset_id}")
        return None
    except urllib.error.URLError as e:
        print(f"  ⚠️ Réseau dataset DARES {dataset_id}: {e.reason}")
        return None
    except Exception as e:
        print(f"  ⚠️ Erreur dataset DARES {dataset_id}: {e}")
        return None


def fetch_dares_all_records(dataset_id):
    """
    Récupère TOUS les enregistrements d'un dataset DARES (avec pagination)
    
    Args:
        dataset_id: Identifiant du dataset DARES
    
    Returns:
        Liste complète des enregistrements
    """
    all_records = []
    offset = 0
    limit = 100
    
    while True:
        url = f"{DARES_BASE_URL}/catalog/datasets/{dataset_id}/records?limit={limit}&offset={offset}&order_by=date%20desc"
        
        try:
            req = urllib.request.Request(url, headers={
                'Accept': 'application/json',
                'User-Agent': 'CFTC-Dashboard/1.0'
            })
            
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode('utf-8'))
                records = data.get('results', [])
                
                if not records:
                    break
                
                all_records.extend(records)
                offset += limit
                
                # Sécurité : limite à 1000 enregistrements max
                if offset >= 1000:
                    break
                    
        except Exception as e:
            print(f"  ⚠️ Erreur pagination DARES: {e}")
            break
    
    return all_records


# ============================================================================
# CONSTRUCTION DES DONNÉES - EMPLOIS VACANTS DARES
# ============================================================================

def build_emplois_vacants_data():
    """
    Construit les données d'emplois vacants (brutes) depuis l'API DARES
    
    Datasets utilisés:
    - dares_emploivacants_brut_emploisvacants : Nombre d'emplois vacants
    - dares_emploivacants_brut_emploisoccupes : Nombre d'emplois occupés
    
    Retourne les données agrégées par trimestre pour l'ensemble des secteurs
    """
    print("📊 Récupération des données DARES - Emplois vacants...")
    
    # Données par défaut en cas d'échec API
    default_data = {
        "emplois_vacants": [
            {"trimestre": "T1 2023", "valeur": 355000, "secteur": "Ensemble"},
            {"trimestre": "T2 2023", "valeur": 360000, "secteur": "Ensemble"},
            {"trimestre": "T3 2023", "valeur": 352000, "secteur": "Ensemble"},
            {"trimestre": "T4 2023", "valeur": 348000, "secteur": "Ensemble"},
            {"trimestre": "T1 2024", "valeur": 342000, "secteur": "Ensemble"},
            {"trimestre": "T2 2024", "valeur": 338000, "secteur": "Ensemble"},
            {"trimestre": "T3 2024", "valeur": 335000, "secteur": "Ensemble"},
            {"trimestre": "T4 2024", "valeur": 330000, "secteur": "Ensemble"},
        ],
        "emplois_occupes": [
            {"trimestre": "T1 2023", "valeur": 20150000, "secteur": "Ensemble"},
            {"trimestre": "T2 2023", "valeur": 20200000, "secteur": "Ensemble"},
            {"trimestre": "T3 2023", "valeur": 20180000, "secteur": "Ensemble"},
            {"trimestre": "T4 2023", "valeur": 20220000, "secteur": "Ensemble"},
            {"trimestre": "T1 2024", "valeur": 20250000, "secteur": "Ensemble"},
            {"trimestre": "T2 2024", "valeur": 20280000, "secteur": "Ensemble"},
            {"trimestre": "T3 2024", "valeur": 20300000, "secteur": "Ensemble"},
            {"trimestre": "T4 2024", "valeur": 20320000, "secteur": "Ensemble"},
        ],
        "taux_vacance": [
            {"trimestre": "T1 2023", "taux": 1.76},
            {"trimestre": "T2 2023", "taux": 1.78},
            {"trimestre": "T3 2023", "taux": 1.74},
            {"trimestre": "T4 2023", "taux": 1.72},
            {"trimestre": "T1 2024", "taux": 1.69},
            {"trimestre": "T2 2024", "taux": 1.67},
            {"trimestre": "T3 2024", "taux": 1.65},
            {"trimestre": "T4 2024", "taux": 1.62},
        ]
    }
    
    # Récupération des emplois vacants
    vacants_raw = fetch_dares_dataset("dares_emploivacants_brut_emploisvacants", limit=100)
    occupes_raw = fetch_dares_dataset("dares_emploivacants_brut_emploisoccupes", limit=100)
    
    if not vacants_raw or not occupes_raw:
        print("  ⚠️ Utilisation des données par défaut")
        return default_data
    
    # Parser les données DARES emplois vacants
    def parse_dares_records(records, value_field=None):
        """
        Parse les enregistrements DARES emplois vacants.
        Champs réels du dataset dares_emploivacants_brut_emploisvacants :
          date (format YYYY-Qn), secteur_naf17, nombre_emplois_vacants
        Agrège par trimestre en ne gardant que la ligne "Ensemble"
        ou en sommant tous les secteurs si "Ensemble" absent.
        """
        by_trimestre = {}

        for record in records:
            # Date — format "2024-Q1" ou "2024-01-01"
            date = (record.get("date") or record.get("trimestre")
                    or record.get("periode") or record.get("annee_trimestre"))
            if not date:
                continue

            # Valeur — essayer tous les noms de champs possibles
            valeur = None
            for field in [value_field, "nombre_emplois_vacants", "emplois_vacants",
                          "nombre", "valeur", "effectif", "ev"]:
                if field and record.get(field) is not None:
                    try:
                        valeur = float(record[field])
                        break
                    except (ValueError, TypeError):
                        continue
            if valeur is None:
                continue

            # Convertir en libellé trimestre
            d = str(date)
            if "-Q" in d:
                year, q = d.split("-Q")
                trimestre = f"T{q} {year}"
            elif len(d) >= 7:
                year = d[:4]
                month = int(d[5:7])
                trimestre = f"T{(month-1)//3+1} {year}"
            else:
                trimestre = d

            # Secteur
            secteur = (record.get("secteur_naf17") or record.get("secteur")
                       or record.get("libelle_secteur") or "Ensemble")

            # Priorité à "Ensemble", sinon accumuler pour agréger
            if secteur.lower() in ("ensemble", "total", "all", "toutes activités"):
                by_trimestre[trimestre] = {
                    "trimestre": trimestre, "valeur": valeur, "secteur": "Ensemble"
                }
            elif trimestre not in by_trimestre:
                # Premier secteur rencontré — on accumulera
                by_trimestre[trimestre] = {
                    "trimestre": trimestre, "valeur": valeur, "secteur": "Agrégé", "_count": 1
                }
            elif by_trimestre[trimestre].get("secteur") == "Agrégé":
                by_trimestre[trimestre]["valeur"] += valeur
                by_trimestre[trimestre]["_count"] = by_trimestre[trimestre].get("_count", 1) + 1

        return sorted(by_trimestre.values(), key=lambda x: x["trimestre"])
    
    emplois_vacants = parse_dares_records(vacants_raw)
    emplois_occupes = parse_dares_records(occupes_raw)
    
    # Calculer le taux de vacance
    taux_vacance = []
    occupes_dict = {e['trimestre']: e['valeur'] for e in emplois_occupes}
    
    for ev in emplois_vacants:
        trimestre = ev['trimestre']
        if trimestre in occupes_dict:
            vacants = ev['valeur']
            occupes = occupes_dict[trimestre]
            taux = round((vacants / (vacants + occupes)) * 100, 2)
            taux_vacance.append({
                'trimestre': trimestre,
                'taux': taux
            })
    
    if emplois_vacants and emplois_occupes:
        print(f"  ✓ {len(emplois_vacants)} trimestres d'emplois vacants récupérés")
        print(f"  ✓ {len(emplois_occupes)} trimestres d'emplois occupés récupérés")
        return {
            "emplois_vacants": emplois_vacants,
            "emplois_occupes": emplois_occupes,
            "taux_vacance": taux_vacance
        }
    
    print("  ⚠️ Utilisation des données par défaut")
    return default_data


def build_emplois_vacants_par_secteur():
    """
    Récupère les emplois vacants détaillés par secteur NAF
    Utile pour analyser les tensions par secteur d'activité
    """
    print("📊 Récupération des emplois vacants par secteur...")
    
    default_secteurs = [
        {"secteur": "Industrie", "vacants": 45000, "taux": 1.2},
        {"secteur": "Construction", "vacants": 38000, "taux": 2.8},
        {"secteur": "Commerce", "vacants": 52000, "taux": 1.5},
        {"secteur": "Services aux entreprises", "vacants": 85000, "taux": 2.1},
        {"secteur": "Hébergement-restauration", "vacants": 42000, "taux": 3.5},
    ]
    
    records = fetch_dares_dataset("dares_emploivacants_brut_emploisvacants", limit=100)
    
    if not records:
        print("  ⚠️ Utilisation des données par défaut")
        return default_secteurs
    
    # Grouper par secteur (dernier trimestre disponible)
    secteurs = {}
    for record in records:
        secteur = record.get('secteur_naf17') or record.get('secteur')
        valeur = record.get('valeur') or record.get('nombre')
        
        if secteur and valeur and secteur.lower() not in ['ensemble', 'total']:
            if secteur not in secteurs:
                secteurs[secteur] = {'secteur': secteur, 'vacants': float(valeur)}
    
    result = list(secteurs.values())
    
    if result:
        print(f"  ✓ {len(result)} secteurs récupérés")
        return result
    
    return default_secteurs

# ============================================================================
# FONCTIONS DE RÉCUPÉRATION DES DONNÉES
# ============================================================================

def fetch_insee_series(series_id, start_period="2015"):
    """
    Récupère une série INSEE SDMX avec retry et délai anti-rate-limit.
    L'INSEE bloque les appels en rafale depuis GitHub Actions (connection reset).
    Solution : délai fixe de 3s avant chaque appel + 3 tentatives avec backoff.
    """
    import time as _time
    url = f"{INSEE_BASE_URL}/{series_id}?startPeriod={start_period}"
    headers = {
        "Accept": "application/vnd.sdmx.structurespecificdata+xml;version=2.1",
        "User-Agent": "CFTC-Dashboard/2.0",
    }
    timeouts = [10, 20, 30]
    delays   = [3, 6]  # pauses entre tentatives

    # Délai fixe avant chaque appel pour éviter le rate-limit INSEE (~20 req/min)
    _time.sleep(3)

    for attempt, timeout in enumerate(timeouts, 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                xml_data = response.read()
                result = parse_sdmx_response(xml_data)
                if result:
                    if attempt > 1:
                        print(f"  ✅ Série {series_id} obtenue à la tentative {attempt}")
                    return result
        except urllib.error.HTTPError as e:
            print(f"  ⚠️ HTTP {e.code} série {series_id} (tentative {attempt}/3)")
            if e.code in (400, 404, 410):
                break
        except urllib.error.URLError as e:
            reason = str(e.reason) if hasattr(e, "reason") else str(e)
            print(f"  ⚠️ Réseau série {series_id} (tentative {attempt}/3): {reason}")
        except Exception as e:
            print(f"  ⚠️ Erreur série {series_id} (tentative {attempt}/3): {e}")

        if attempt < len(timeouts):
            _time.sleep(delays[attempt - 1])

    print(f"  ⚠️ Série {series_id} indisponible après 3 tentatives — données par défaut")
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
# RÉCUPÉRATION AUTOMATIQUE DU CHÔMAGE DROM
# ============================================================================

def fetch_chomage_drom():
    """
    Récupère automatiquement le taux de chômage annuel pour les 4 DROM
    (Guadeloupe, Martinique, Guyane, La Réunion) via l'API INSEE SDMX.

    Séries vérifiées sur insee.fr :
      010751337 -> Guadeloupe
      010751338 -> Martinique
      010751339 -> Guyane
      010751340 -> La Réunion

    Mayotte : données annuelles uniquement depuis 2024, moins comparables
    -> maintenues en statique dans donnees_regionales.dom

    Retourne un dict { code_drom: {"chomage": float, "evol_chomage": float} }
    ou {} en cas d'échec (les valeurs statiques seront conservées).
    """
    print("🌴 Récupération chômage DROM (INSEE)...")

    drom_series = {
        "GP": SERIES_IDS["chomage_guadeloupe"],
        "MQ": SERIES_IDS["chomage_martinique"],
        "GF": SERIES_IDS["chomage_guyane"],
        "RE": SERIES_IDS["chomage_reunion"],
    }

    result = {}
    for code, series_id in drom_series.items():
        data = fetch_insee_series(series_id, start_period="2022")
        if not data:
            print(f"  ⚠️ Série {series_id} ({code}) non disponible, valeur statique conservée")
            continue

        # Récupérer les observations — les séries DOM sont annuelles (format YYYY)
        # Certaines peuvent aussi arriver en trimestriel : on fait la moyenne annuelle
        annual = {}
        for obs in data:
            period = obs["period"]
            if len(period) == 4 and period.isdigit():
                annual[period] = obs["value"]
            elif "-Q" in period:
                year = period[:4]
                if year not in annual:
                    annual[year] = []
                if isinstance(annual[year], list):
                    annual[year].append(obs["value"])

        # Finaliser les moyennes annuelles si trimestriel
        for year in list(annual.keys()):
            if isinstance(annual[year], list) and annual[year]:
                annual[year] = round(sum(annual[year]) / len(annual[year]), 1)

        sorted_years = sorted(annual.keys())
        if not sorted_years:
            print(f"  ⚠️ Aucune donnée annuelle pour {code}, valeur statique conservée")
            continue

        latest_year = sorted_years[-1]
        latest_val = round(annual[latest_year], 1)

        # Calcul de l'évolution vs année précédente
        evol = 0.0
        if len(sorted_years) >= 2:
            prev_val = annual[sorted_years[-2]]
            evol = round(latest_val - prev_val, 1)

        result[code] = {"chomage": latest_val, "evol_chomage": normalize_zero(evol)}
        print(f"  ✅ {code} : {latest_val}% (évol: {evol:+.1f} pts) [{latest_year}]")

    return result


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
        {"trimestre": "T1 2025", "taux": 4.6},
        {"trimestre": "T2 2025", "taux": 4.7},
        {"trimestre": "T3 2025", "taux": 5.0},
        {"trimestre": "T4 2025", "taux": 4.9},
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
        {"trimestre": "T4 2024", "taux": 60.4},
        {"trimestre": "T1 2025", "taux": 60.8},
        {"trimestre": "T2 2025", "taux": 61.1},
        {"trimestre": "T3 2025", "taux": 61.5},
        {"trimestre": "T4 2025", "taux": 61.7},  # Estimation (données statiques)
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
        {"trimestre": "T1 2025", "cdi": 83.6, "cdd": 5.1, "interim": 1.3},
        {"trimestre": "T2 2025", "cdi": 83.5, "cdd": 5.2, "interim": 1.3},
        {"trimestre": "T3 2025", "cdi": 83.6, "cdd": 5.1, "interim": 1.3},
        {"trimestre": "T4 2025", "cdi": 83.4, "cdd": 5.3, "interim": 1.3},
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
        {"trimestre": "T3 2024", "industrie": 40, "services": 30, "construction": 50},
        {"trimestre": "T4 2024", "industrie": 38, "services": 28, "construction": 48},
        {"trimestre": "T1 2025", "industrie": 36, "services": 27, "construction": 46},
        {"trimestre": "T2 2025", "industrie": 41, "services": 30, "construction": 49},
        {"trimestre": "T3 2025", "industrie": 40, "services": 30, "construction": 48},
        {"trimestre": "T4 2025", "industrie": 38, "services": 28, "construction": 45},
        {"trimestre": "T1 2026", "industrie": 39, "services": 29, "construction": 46},
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
    
    # Données en milliers d'emplois (base T4 2025)
    default_secteurs = {
        "derniere_mise_a_jour": "T4 2025",
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
            {"trimestre": "T4 2025", "industrie": 3178, "construction": 1528, "tertiaire": 21275, "interim": 698},
        ]
    }
    
    # Récupération des 4 secteurs — séries CVS trimestrielles INSEE
    emploi_industrie  = get_quarterly_values(SERIES_IDS["emploi_industrie"],         2023)
    emploi_constr     = get_quarterly_values(SERIES_IDS["emploi_construction"],       2023)
    emploi_terc_marc  = get_quarterly_values(SERIES_IDS["emploi_tertiaire_marchand"], 2023)
    emploi_terc_nmarc = get_quarterly_values(SERIES_IDS["emploi_tertiaire_nonmarc"],  2023)

    if emploi_industrie and emploi_constr and emploi_terc_marc:
        print(f"  ✓ Emploi salarié par secteur récupéré ({len(emploi_industrie)} trimestres)")

        # get_quarterly_values retourne [{trimestre, valeur}, ...]
        # Extraire les valeurs numériques et les libellés de trimestres
        def _vals(s):    return [p["valeur"] for p in s] if s else []
        def _trims(s):   return [p["trimestre"] for p in s] if s else []
        def _last(s):    return _vals(s)[-1] if s else 0
        def _evol_t(s):
            v = _vals(s)
            return round((v[-1]-v[-2])/v[-2]*100, 1) if len(v) >= 2 and v[-2] else 0
        def _evol_a(s):
            v = _vals(s)
            return round((v[-1]-v[-5])/v[-5]*100, 1) if len(v) >= 5 and v[-5] else 0

        nb = min(len(s) for s in [emploi_industrie, emploi_constr, emploi_terc_marc])
        v_ind  = _vals(emploi_industrie)
        v_con  = _vals(emploi_constr)
        v_tm   = _vals(emploi_terc_marc)
        v_tnm  = _vals(emploi_terc_nmarc) if emploi_terc_nmarc else []
        t_ind  = _trims(emploi_industrie)

        trimestres_hist = []
        for i in range(nb):
            tnm_v = v_tnm[i] if i < len(v_tnm) else 0
            trimestres_hist.append({
                "trimestre":    t_ind[i] if i < len(t_ind) else f"T{i%4+1} {2023+i//4}",
                "industrie":    round(v_ind[i] / 1000) if i < len(v_ind) and v_ind[i] else None,
                "construction": round(v_con[i] / 1000) if i < len(v_con) and v_con[i] else None,
                "tertiaire":    round((v_tm[i] + tnm_v) / 1000) if i < len(v_tm) and v_tm[i] else None,
                "interim":      None,
            })

        tnm_last = v_tnm[-1] if v_tnm else default_secteurs["secteurs"][1]["emploi"] * 1000
        last_trim = trimestres_hist[-1]["trimestre"] if trimestres_hist else "N/A"
        return {
            "derniere_mise_a_jour": last_trim,
            "secteurs": [
                {"secteur": "Industrie",             "emploi": round(_last(emploi_industrie) / 1000), "evolution_trim": _evol_t(emploi_industrie),  "evolution_an": _evol_a(emploi_industrie)},
                {"secteur": "Construction",           "emploi": round(_last(emploi_constr)    / 1000), "evolution_trim": _evol_t(emploi_constr),      "evolution_an": _evol_a(emploi_constr)},
                {"secteur": "Tertiaire marchand",     "emploi": round(_last(emploi_terc_marc) / 1000), "evolution_trim": _evol_t(emploi_terc_marc),   "evolution_an": _evol_a(emploi_terc_marc)},
                {"secteur": "Tertiaire non marchand", "emploi": round(tnm_last               / 1000), "evolution_trim": _evol_t(emploi_terc_nmarc) if emploi_terc_nmarc else 0, "evolution_an": _evol_a(emploi_terc_nmarc) if emploi_terc_nmarc else 0},
            ],
            "evolution_trimestrielle": trimestres_hist,
            "source": "INSEE - Emplois salariés trimestriels CVS",
        }
    else:
        print("  ⚠️ Emploi secteur : données par défaut")

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
        "valeur_actuelle": 145.78,
        "glissement_annuel": 0.79,
        "trimestre": "T4 2025",
        "evolution": [
            {"trimestre": "T1 2022", "indice": 133.93, "glissement": 2.48},
            {"trimestre": "T2 2022", "indice": 135.84, "glissement": 3.60},
            {"trimestre": "T3 2022", "indice": 136.27, "glissement": 3.49},
            {"trimestre": "T4 2022", "indice": 137.26, "glissement": 3.50},
            {"trimestre": "T1 2023", "indice": 138.61, "glissement": 3.49},
            {"trimestre": "T2 2023", "indice": 140.59, "glissement": 3.50},
            {"trimestre": "T3 2023", "indice": 141.03, "glissement": 3.49},
            {"trimestre": "T4 2023", "indice": 142.06, "glissement": 3.50},
            {"trimestre": "T1 2024", "indice": 143.46, "glissement": 3.50},
            {"trimestre": "T2 2024", "indice": 145.17, "glissement": 3.26},
            {"trimestre": "T3 2024", "indice": 144.51, "glissement": 2.47},
            {"trimestre": "T4 2024", "indice": 144.64, "glissement": 1.82},
            {"trimestre": "T1 2025", "indice": 145.47, "glissement": 1.40},
            {"trimestre": "T2 2025", "indice": 146.68, "glissement": 1.04},
            {"trimestre": "T3 2025", "indice": 145.77, "glissement": 0.87},
            {"trimestre": "T4 2025", "indice": 145.78, "glissement": 0.79},
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
        "indice_actuel": 128.5,
        "variation_trim": 0.7,
        "variation_an": -1.8,
        "transactions_annuelles": 880000,
        "evolution": [
            {"trimestre": "T1 2022", "indice": 124.5, "variation": 7.2},
            {"trimestre": "T3 2022", "indice": 126.8, "variation": 6.1},
            {"trimestre": "T1 2023", "indice": 124.2, "variation": -0.2},
            {"trimestre": "T3 2023", "indice": 120.5, "variation": -5.0},
            {"trimestre": "T1 2024", "indice": 117.8, "variation": -5.1},
            {"trimestre": "T3 2024", "indice": 115.3, "variation": -4.3},
            {"trimestre": "T4 2024", "indice": 126.3, "variation": -1.9},
            {"trimestre": "T1 2025", "indice": 126.5, "variation": 0.4},
            {"trimestre": "T2 2025", "indice": 126.5, "variation": 0.6},
            {"trimestre": "T3 2025", "indice": 128.5, "variation": 0.7},
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
    """
    Construit les données prix carburants avec historique QUOTIDIEN.

    Stratégie :
    - Base statique mensuelle (2023-2026) → toujours présente, assure la courbe
    - Flux annuel data.economie.gouv.fr   → remplace/complète avec données quotidiennes réelles
    - Flux instantané data.economie.gouv.fr → prix du jour en temps réel (toutes les 10 min)
    - Fallback séries INSEE mensuelles    → si flux annuel indisponible, complète la base statique
    """
    print("📊 Récupération des prix carburants (quotidien)...")

    BASE_URL   = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets"
    INSTANT_DS = "prix-des-carburants-en-france-flux-instantane-v2"
    ANNUEL_DS  = "prix-des-carburants-en-france-flux-annuel-v2"

    def safe_prix(val):
        if val is None:
            return None
        try:
            v = float(val)
            if v > 100:
                v = v / 1000
            return round(v, 3) if 0.5 <= v <= 5.0 else None
        except (TypeError, ValueError):
            return None

    def api_get(url):
        req = urllib.request.Request(url, headers={'User-Agent': 'CFTC-Dashboard/2.0', 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode('utf-8'))

    # ── BASE STATIQUE — toujours présente pour garantir la courbe ──
    # Historique mensuel 2023-2026 (moyenne nationale constatée)
    historique_statique = [
        {"date": "2023-01-01", "gazole": 1.850, "sp95": 1.820, "sp98": 1.920, "e10": 1.790},
        {"date": "2023-02-01", "gazole": 1.840, "sp95": 1.830, "sp98": 1.930, "e10": 1.800},
        {"date": "2023-03-01", "gazole": 1.820, "sp95": 1.860, "sp98": 1.960, "e10": 1.820},
        {"date": "2023-04-01", "gazole": 1.780, "sp95": 1.880, "sp98": 1.980, "e10": 1.840},
        {"date": "2023-05-01", "gazole": 1.740, "sp95": 1.870, "sp98": 1.970, "e10": 1.830},
        {"date": "2023-06-01", "gazole": 1.700, "sp95": 1.840, "sp98": 1.940, "e10": 1.800},
        {"date": "2023-07-01", "gazole": 1.720, "sp95": 1.850, "sp98": 1.950, "e10": 1.810},
        {"date": "2023-08-01", "gazole": 1.760, "sp95": 1.870, "sp98": 1.970, "e10": 1.830},
        {"date": "2023-09-01", "gazole": 1.830, "sp95": 1.900, "sp98": 2.000, "e10": 1.860},
        {"date": "2023-10-01", "gazole": 1.880, "sp95": 1.920, "sp98": 2.020, "e10": 1.880},
        {"date": "2023-11-01", "gazole": 1.790, "sp95": 1.890, "sp98": 1.990, "e10": 1.850},
        {"date": "2023-12-01", "gazole": 1.730, "sp95": 1.840, "sp98": 1.940, "e10": 1.800},
        {"date": "2024-01-01", "gazole": 1.720, "sp95": 1.780, "sp98": 1.880, "e10": 1.740},
        {"date": "2024-02-01", "gazole": 1.730, "sp95": 1.790, "sp98": 1.890, "e10": 1.750},
        {"date": "2024-03-01", "gazole": 1.740, "sp95": 1.800, "sp98": 1.900, "e10": 1.760},
        {"date": "2024-04-01", "gazole": 1.750, "sp95": 1.820, "sp98": 1.920, "e10": 1.780},
        {"date": "2024-05-01", "gazole": 1.740, "sp95": 1.820, "sp98": 1.920, "e10": 1.780},
        {"date": "2024-06-01", "gazole": 1.720, "sp95": 1.800, "sp98": 1.900, "e10": 1.760},
        {"date": "2024-07-01", "gazole": 1.680, "sp95": 1.750, "sp98": 1.850, "e10": 1.710},
        {"date": "2024-08-01", "gazole": 1.660, "sp95": 1.740, "sp98": 1.840, "e10": 1.700},
        {"date": "2024-09-01", "gazole": 1.640, "sp95": 1.730, "sp98": 1.830, "e10": 1.690},
        {"date": "2024-10-01", "gazole": 1.620, "sp95": 1.720, "sp98": 1.820, "e10": 1.680},
        {"date": "2024-11-01", "gazole": 1.610, "sp95": 1.710, "sp98": 1.810, "e10": 1.670},
        {"date": "2024-12-01", "gazole": 1.620, "sp95": 1.720, "sp98": 1.820, "e10": 1.680},
        {"date": "2025-01-01", "gazole": 1.650, "sp95": 1.780, "sp98": 1.880, "e10": 1.740},
        {"date": "2025-02-01", "gazole": 1.640, "sp95": 1.770, "sp98": 1.870, "e10": 1.730},
        {"date": "2025-03-01", "gazole": 1.630, "sp95": 1.760, "sp98": 1.860, "e10": 1.720},
        {"date": "2025-04-01", "gazole": 1.600, "sp95": 1.740, "sp98": 1.840, "e10": 1.700},
        {"date": "2025-05-01", "gazole": 1.590, "sp95": 1.730, "sp98": 1.830, "e10": 1.690},
        {"date": "2025-06-01", "gazole": 1.580, "sp95": 1.720, "sp98": 1.820, "e10": 1.680},
        {"date": "2025-07-01", "gazole": 1.580, "sp95": 1.700, "sp98": 1.800, "e10": 1.660},
        {"date": "2025-08-01", "gazole": 1.580, "sp95": 1.710, "sp98": 1.810, "e10": 1.670},
        {"date": "2025-09-01", "gazole": 1.590, "sp95": 1.720, "sp98": 1.820, "e10": 1.680},
        {"date": "2025-10-01", "gazole": 1.580, "sp95": 1.720, "sp98": 1.820, "e10": 1.680},
        {"date": "2025-11-01", "gazole": 1.590, "sp95": 1.720, "sp98": 1.820, "e10": 1.680},
        {"date": "2025-12-01", "gazole": 1.600, "sp95": 1.710, "sp98": 1.810, "e10": 1.670},
        {"date": "2026-01-01", "gazole": 1.620, "sp95": 1.710, "sp98": 1.810, "e10": 1.670},
        {"date": "2026-02-01", "gazole": 1.640, "sp95": 1.720, "sp98": 1.820, "e10": 1.680},
        {"date": "2026-03-01", "gazole": 1.650, "sp95": 1.720, "sp98": 1.820, "e10": 1.680},
    ]

    # Dictionnaire date → point pour fusion rapide
    evolution_dict = {p['date']: dict(p) for p in historique_statique}
    source_historique = "Valeurs statiques (base mensuelle)"
    granularite = "mensuel"

    # ── 1) FLUX ANNUEL — historique quotidien réel ──────────────────
    try:
        print("  → Flux annuel (historique quotidien)...")
        annee = datetime.now().year
        date_debut = f"{annee-1}-01-01"
        # avg()/group_by non supportés sur ce dataset → agréger côté Python
        url_annuel = (
            f"{BASE_URL}/{ANNUEL_DS}/records"
            f"?select=date%2Cgazole_prix%2Csp95_prix%2Csp98_prix%2Ce10_prix"
            f"&order_by=date%20asc"
            f"&limit=500"
            f"&where=date%3E%3D%27{date_debut}%27"
        )
        data_annuel = api_get(url_annuel)
        results = data_annuel.get('results', [])
        # Agréger par date (moyenne des stations)
        by_date = {}
        for row in results:
            date_clean = str(row.get('date', ''))[:10]
            if not date_clean:
                continue
            for key_in, key_out in [('sp95_prix','sp95'),('gazole_prix','gazole'),('sp98_prix','sp98'),('e10_prix','e10')]:
                v = safe_prix(row.get(key_in))
                if v:
                    if date_clean not in by_date:
                        by_date[date_clean] = {k: [] for k in ['sp95','gazole','sp98','e10']}
                    by_date[date_clean][key_out].append(v)
        nb = 0
        for date_clean, vals in sorted(by_date.items()):
            def avg(lst): return round(sum(lst)/len(lst), 3) if lst else None
            evolution_dict[date_clean] = {
                "date":   date_clean,
                "sp95":   avg(vals['sp95']),
                "gazole": avg(vals['gazole']),
                "sp98":   avg(vals['sp98']),
                "e10":    avg(vals['e10']),
            }
            nb += 1
        if nb > 0:
            source_historique = f"data.economie.gouv.fr (flux annuel — {nb} jours réels)"
            granularite = "quotidien"
            print(f"  ✓ {nb} jours réels intégrés dans l'historique")
    except Exception as e:
        print(f"  ⚠️ Flux annuel indisponible: {e}")

    # ── 2) FLUX INSTANTANÉ — prix du jour ───────────────────────────
    prix_jour = {}
    try:
        print("  → Flux instantané (prix du jour)...")
        url_instant = (
            f"{BASE_URL}/{INSTANT_DS}/records"
            f"?select="
            f"avg(sp95_prix)%20as%20sp95%2C"
            f"avg(gazole_prix)%20as%20gazole%2C"
            f"avg(sp98_prix)%20as%20sp98%2C"
            f"avg(e10_prix)%20as%20e10%2C"
            f"max(sp95_maj)%20as%20derniere_maj"
            f"&limit=1"
            f"&where=sp95_prix%20is%20not%20null"
        )
        data_instant = api_get(url_instant)
        if data_instant.get('results'):
            row = data_instant['results'][0]
            sp95_inst   = safe_prix(row.get('sp95'))
            gazole_inst = safe_prix(row.get('gazole'))
            sp98_inst   = safe_prix(row.get('sp98'))
            e10_inst    = safe_prix(row.get('e10'))
            maj         = str(row.get('derniere_maj', ''))[:16].replace('T', ' ')
            if sp95_inst:
                prix_jour = {"sp95": sp95_inst, "gazole": gazole_inst,
                             "sp98": sp98_inst or round(sp95_inst + 0.10, 3),
                             "e10": e10_inst, "derniere_maj": maj}
                aujourd_hui = datetime.now().strftime("%Y-%m-%d")
                evolution_dict[aujourd_hui] = {"date": aujourd_hui,
                    "gazole": gazole_inst, "sp95": sp95_inst,
                    "sp98": prix_jour["sp98"], "e10": e10_inst}
                if granularite != "quotidien":
                    granularite = "quotidien"
                    source_historique = "data.economie.gouv.fr (flux instantané)"
                print(f"  ✓ Prix du jour : SP95 {sp95_inst}€/L, Gazole {gazole_inst}€/L (màj {maj})")
    except Exception as e:
        print(f"  ⚠️ Flux instantané indisponible: {e}")

    # ── 3) FALLBACK INSEE — complète si pas de flux annuel ───────────
    if granularite == "mensuel":
        print("  → Fallback séries INSEE mensuelles...")
        try:
            gazole_insee = fetch_insee_series(SERIES_IDS["prix_gazole"], "2023")
            sp95_insee   = fetch_insee_series(SERIES_IDS["prix_sp95"],   "2023")
            if gazole_insee and sp95_insee:
                sp95_dict = {s['period']: s['value'] for s in sp95_insee}
                nb_insee = 0
                for g in gazole_insee:
                    period = g['period']
                    if period in sp95_dict:
                        date_key = f"{period}-01"
                        sp95_v = round(sp95_dict[period], 3)
                        evolution_dict[date_key] = {
                            "date":   date_key,
                            "gazole": round(g['value'], 3),
                            "sp95":   sp95_v,
                            "sp98":   round(sp95_v + 0.10, 3),
                            "e10":    None,
                        }
                        nb_insee += 1
                if nb_insee > 0:
                    source_historique = f"INSEE SDMX + base statique ({nb_insee} mois)"
                    print(f"  ✓ {nb_insee} mois INSEE intégrés")
        except Exception as e:
            print(f"  ⚠️ INSEE indisponible: {e}")

    # ── ASSEMBLAGE FINAL ────────────────────────────────────────────
    evolution = sorted(evolution_dict.values(), key=lambda x: x['date'])

    dernier = evolution[-1]
    prix_sp95   = prix_jour.get('sp95')   or dernier.get('sp95')   or 1.720
    prix_gazole = prix_jour.get('gazole') or dernier.get('gazole') or 1.650
    prix_sp98   = prix_jour.get('sp98')   or dernier.get('sp98')   or round(prix_sp95 + 0.10, 3)
    prix_e10    = prix_jour.get('e10')    or dernier.get('e10')    or round(prix_sp95 - 0.04, 3)

    def calc_var(key, prix_actuel, nb_points):
        pts = [e for e in evolution if e.get(key) is not None]
        if len(pts) < 2:
            return 0.0
        idx = max(0, len(pts) - nb_points)
        ref = pts[idx].get(key)
        if not ref:
            return 0.0
        return normalize_zero(round(((prix_actuel / ref) - 1) * 100, 1))

    # Nombre de points pour "1 semaine" et "1 an" selon granularité
    pts_sem = 7 if granularite == "quotidien" else 1
    pts_an  = 365 if granularite == "quotidien" else 12

    var_an_sp95    = calc_var('sp95',   prix_sp95,   pts_an)
    var_sem_sp95   = calc_var('sp95',   prix_sp95,   pts_sem)
    var_an_gazole  = calc_var('gazole', prix_gazole, pts_an)
    var_sem_gazole = calc_var('gazole', prix_gazole, pts_sem)

    derniere_donnee = prix_jour.get('derniere_maj') or dernier['date']

    # Graphique : tous les points si ≤ 90, sinon 1/semaine pour l'ancien + 60 derniers jours complets
    if len(evolution) <= 90:
        evolution_graph = evolution
    else:
        recent = evolution[-60:]
        older  = evolution[:-60][::7]
        evolution_graph = older + recent

    print(f"  ✓ Carburants : SP95 {prix_sp95}€/L (sem. {var_sem_sp95:+.1f}%, an {var_an_sp95:+.1f}%)")
    print(f"               Gazole {prix_gazole}€/L (sem. {var_sem_gazole:+.1f}%, an {var_an_gazole:+.1f}%)")
    print(f"  📅 {derniere_donnee} | {len(evolution_graph)} points | {granularite} | {source_historique}")

    return {
        "gazole": {"prix": prix_gazole, "variation_an": var_an_gazole, "variation_sem": var_sem_gazole},
        "sp95":   {"prix": prix_sp95,   "variation_an": var_an_sp95,   "variation_sem": var_sem_sp95},
        "sp98":   {"prix": prix_sp98,   "variation_an": var_an_sp95,   "variation_sem": var_sem_sp95},
        "e10":    {"prix": prix_e10,    "variation_an": calc_var('e10', prix_e10, pts_an),
                                        "variation_sem": calc_var('e10', prix_e10, pts_sem)},
        "evolution":       evolution_graph,
        "derniere_donnee": derniere_donnee,
        "source":          source_historique,
        "granularite":     granularite,
    }


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
        {"annee": "2025", "croissance": 0.9},  # Officiel INSEE (1ère estimation T4 2025, jan 2026)
    ]
    
    default_pib = {
        "croissance_trim_actuel": 0.7,
        "croissance_annuelle": 0.9,  # 2025 officiel (1ère estimation INSEE jan 2026)
        "trimestre": "T4 2025",
        "commentaire": "PIB volume trimestriel - glissement annuel",
        "evolution": [
            {"trimestre": "T2 2022", "croissance": 1.0},
            {"trimestre": "T3 2022", "croissance": 2.0},
            {"trimestre": "T4 2022", "croissance": 1.9},
            {"trimestre": "T1 2023", "croissance": 1.5},
            {"trimestre": "T2 2023", "croissance": 2.2},
            {"trimestre": "T3 2023", "croissance": 0.7},
            {"trimestre": "T4 2023", "croissance": 1.3},
            {"trimestre": "T1 2024", "croissance": 0.5},
            {"trimestre": "T2 2024", "croissance": 0.1},
            {"trimestre": "T3 2024", "croissance": 1.4},
            {"trimestre": "T4 2024", "croissance": 0.0},
            {"trimestre": "T1 2025", "croissance": 0.5},
            {"trimestre": "T2 2025", "croissance": 0.4},
            {"trimestre": "T3 2025", "croissance": 0.9},
            {"trimestre": "T4 2025", "croissance": 0.7},
        ],
        "contributions": {
            "trimestre": "T4 2025",
            "demande_interieure": 0.3,
            "commerce_exterieur": 0.0,
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
                croissance = normalize_zero(round(((d['valeur'] / prev) - 1) * 100, 1))
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
                "croissance_annuelle": 0.9,  # 2025 officiel (1ère estimation INSEE jan 2026)
                "trimestre": latest['trimestre'],
                "commentaire": "PIB volume trimestriel - glissement annuel - INSEE",
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
        "valeur_actuelle": 97,
        "confiance_menages": 91,
        "moyenne_long_terme": 100,
        "mois": "Fév 2026",
        "evolution": [
            {"mois": "Jan 2024", "climat": 100, "menages": 91},
            {"mois": "Avr 2024", "climat": 100, "menages": 90},
            {"mois": "Juil 2024", "climat": 94, "menages": 91},
            {"mois": "Oct 2024", "climat": 97, "menages": 93},
            {"mois": "Jan 2025", "climat": 95, "menages": 92},
            {"mois": "Avr 2025", "climat": 97, "menages": 91},
            {"mois": "Juil 2025", "climat": 96, "menages": 89},
            {"mois": "Oct 2025", "climat": 97, "menages": 90},
            {"mois": "Jan 2026", "climat": 99, "menages": 90},
            {"mois": "Fév 2026", "climat": 97, "menages": 91},
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
        "fbcf_variation_trim": 0.2,
        "fbcf_variation_an": -1.2,
        "trimestre": "T4 2025",
        "taux_investissement": 25.0,
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
            {"trimestre": "T4 2025", "variation": 0.2},  # Comptes nationaux INSEE T4 2025
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
    """Construit les données d'écart salarial H/F
    
    Dernière source officielle : INSEE Focus n°377, février 2026 (données 2024)
    - Écart global (tous temps) : 21,8%
    - Écart en EQTP : ~14%
    - Écart à poste comparable : 4%
    """
    print("📊 Récupération des données écart H/F...")
    
    default_evolution = [
        {"annee": "2015", "ecart": 18.4},
        {"annee": "2017", "ecart": 16.6},
        {"annee": "2019", "ecart": 16.1},
        {"annee": "2021", "ecart": 15.5},
        {"annee": "2022", "ecart": 14.9},
        {"annee": "2023", "ecart": 14.2},
        {"annee": "2024", "ecart": 14.0},
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
                "ecart_global": 21.8,
                "ecart_eqtp": evolution[-1]['ecart'] if evolution else 14.0,
                "ecart_poste_comparable": 4.0,
                "evolution": evolution
            }
    
    print("  ⚠️ Utilisation des données par défaut")
    return {
        "ecart_global": 21.8,
        "ecart_eqtp": 14.0,
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
        "commentaire": "Données confirmées par INSEE Première n°2079 (mars 2025). Données 2024 (exercice 2024) non encore publiées par l'Urssaf/INSEE au 16/03/2026 — à mettre à jour dès publication."
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
        "commentaire": "STATIQUE - Eurostat - données 1er semestre 2026 (publiées 30/01/2026)",
        "date_maj": "2026-01-01",
        "smic_europe": [
            # Données Eurostat 1er semestre 2026 (publication 30/01/2026) - SMIC brut mensuel en euros
            # Sources : https://www.touteleurope.eu/economie-et-social/le-salaire-minimum-en-europe/
            #           https://fr.euronews.com/business/2026/02/05/salaires-minimums-en-2026
            {"pays": "Luxembourg", "code": "LU", "smic": 2704, "spa": 2035},
            {"pays": "Irlande", "code": "IE", "smic": 2391, "spa": 1653},
            {"pays": "Allemagne", "code": "DE", "smic": 2343, "spa": 1989},
            {"pays": "Pays-Bas", "code": "NL", "smic": 2295, "spa": 1825},
            {"pays": "Belgique", "code": "BE", "smic": 2112, "spa": 1750},
            {"pays": "France", "code": "FR", "smic": 1823, "spa": 1580},
            {"pays": "Espagne", "code": "ES", "smic": 1323, "spa": 1350},
            {"pays": "Pologne", "code": "PL", "smic": 1130, "spa": 1420},
            {"pays": "Bulgarie", "code": "BG", "smic": 620, "spa": 886},
        ],
        "chomage_europe": [
            # Données Eurostat janvier 2026 (publiées mars 2026)
            {"pays": "Allemagne", "code": "DE", "taux": 4.0, "jeunes": 6.8},
            {"pays": "Pays-Bas", "code": "NL", "taux": 4.0, "jeunes": 9.2},
            {"pays": "Pologne", "code": "PL", "taux": 3.2, "jeunes": 10.5},
            {"pays": "France", "code": "FR", "taux": 7.7, "jeunes": 18.3},
            {"pays": "Italie", "code": "IT", "taux": 5.1, "jeunes": 20.6},
            {"pays": "Espagne", "code": "ES", "taux": 9.8, "jeunes": 23.4},
            {"pays": "UE-27", "code": "EU", "taux": 5.8, "jeunes": 15.1},
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
        "annee": 2026,
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
            "date_vigueur": "2026-01-01",
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
    
    Note: l'API peut renvoyer le prix en millièmes (ex: 1720 = 1.720€/L)
    ou directement en euros (ex: 1.72). La validation ci-dessous gère les deux cas.
    """
    try:
        url = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?select=avg(sp95_prix)%20as%20prix_moyen&limit=1"
        req = urllib.request.Request(url, headers={'User-Agent': 'CFTC-Dashboard/2.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get('results') and len(data['results']) > 0:
                prix = data['results'][0].get('prix_moyen')
                if prix:
                    # L'API retourne en millièmes si > 100, en euros sinon
                    if prix > 100:
                        prix_final = round(prix / 1000, 3)
                    else:
                        prix_final = round(prix, 3)
                    # Sanity check : un prix essence en France doit être entre 1.0 et 3.0 €/L
                    if 1.0 <= prix_final <= 3.0:
                        return prix_final
                    else:
                        print(f"   ⚠️  Prix essence API hors plage ({prix_final}€/L), ignoré")
                        return None
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
        2026: 9.52,  # Confirmé - SMIC net horaire au 1er janvier 2026
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

def build_alertes_automatiques(data_actuelle):
    """
    Génère automatiquement des alertes basées sur les données récupérées.
    
    Types d'alertes :
    - Nouvelles données trimestrielles/mensuelles disponibles
    - Variations significatives (chômage, inflation, PIB...)
    - Seuils dépassés (inflation > 2%, chômage > 8%, etc.)
    - Mises à jour importantes (SMIC, IRL, etc.)
    
    Args:
        data_actuelle: Dictionnaire contenant toutes les données récupérées
    
    Returns:
        Liste d'alertes au format [{id, date, type, titre, message, onglet}, ...]
    """
    from datetime import datetime, timedelta
    
    alertes = []
    today = datetime.now()
    date_str = today.strftime("%Y-%m-%d")
    
    # ========== ALERTES INFLATION ==========
    if 'inflation_salaires' in data_actuelle and data_actuelle['inflation_salaires']:
        derniere_inflation = data_actuelle['inflation_salaires'][-1]
        inflation_val = derniere_inflation.get('inflation', 0)
        annee = derniere_inflation.get('annee', '')
        
        # Alerte si inflation > 2%
        if inflation_val > 2:
            alertes.append({
                "id": f"inflation_elevee_{annee}",
                "date": date_str,
                "type": "warning",
                "titre": f"⚠️ Inflation {annee} : {inflation_val}%",
                "message": f"L'inflation reste au-dessus de la cible BCE (2%). Argument pour les NAO : les salaires doivent suivre.",
                "onglet": "inflation"
            })
        # Alerte si inflation < 1% (bonne nouvelle)
        elif inflation_val < 1.5:
            alertes.append({
                "id": f"inflation_maitrisee_{annee}",
                "date": date_str,
                "type": "success",
                "titre": f"📉 Inflation maîtrisée : {inflation_val}%",
                "message": f"L'inflation {annee} est sous contrôle. Le pouvoir d'achat se stabilise.",
                "onglet": "inflation"
            })
    
    # ========== ALERTES CHÔMAGE ==========
    if 'chomage' in data_actuelle and data_actuelle['chomage']:
        dernier_chomage = data_actuelle['chomage'][-1]
        taux = dernier_chomage.get('taux', 0)
        taux_jeunes = dernier_chomage.get('jeunes', 0)
        trimestre = dernier_chomage.get('trimestre', '')
        
        # Comparer avec le trimestre précédent si disponible
        if len(data_actuelle['chomage']) >= 2:
            precedent = data_actuelle['chomage'][-2]
            variation = taux - precedent.get('taux', taux)
            
            if variation >= 0.3:
                alertes.append({
                    "id": f"chomage_hausse_{trimestre.replace(' ', '_')}",
                    "date": date_str,
                    "type": "warning",
                    "titre": f"📈 Chômage en hausse : {taux}%",
                    "message": f"Le taux de chômage a augmenté de {variation:.1f} point(s) au {trimestre}.",
                    "onglet": "emploi"
                })
            elif variation <= -0.3:
                alertes.append({
                    "id": f"chomage_baisse_{trimestre.replace(' ', '_')}",
                    "date": date_str,
                    "type": "success",
                    "titre": f"📉 Chômage en baisse : {taux}%",
                    "message": f"Bonne nouvelle ! Le chômage a reculé de {abs(variation):.1f} point(s) au {trimestre}.",
                    "onglet": "emploi"
                })
        
        # Alerte chômage des jeunes élevé
        if taux_jeunes > 18:
            alertes.append({
                "id": f"chomage_jeunes_{trimestre.replace(' ', '_')}",
                "date": date_str,
                "type": "warning",
                "titre": f"🧑‍🎓 Chômage jeunes élevé : {taux_jeunes}%",
                "message": f"Le taux de chômage des 15-24 ans reste préoccupant ({trimestre}).",
                "onglet": "emploi"
            })
    
    # ========== ALERTES PIB ==========
    if 'pib' in data_actuelle and data_actuelle['pib']:
        croissance = data_actuelle['pib'].get('croissance_trim_actuel', 0)
        trimestre_pib = data_actuelle['pib'].get('trimestre', data_actuelle['pib'].get('dernier_trimestre', ''))
        
        if croissance < 0:
            alertes.append({
                "id": f"pib_negatif_{trimestre_pib.replace(' ', '_')}",
                "date": date_str,
                "type": "danger",
                "titre": f"🔴 PIB en recul : {croissance}%",
                "message": f"L'économie française se contracte au {trimestre_pib}. Vigilance sur l'emploi.",
                "onglet": "conjoncture"
            })
        elif croissance >= 0.5:
            alertes.append({
                "id": f"pib_dynamique_{trimestre_pib.replace(' ', '_')}",
                "date": date_str,
                "type": "success",
                "titre": f"📈 Croissance dynamique : +{croissance}%",
                "message": f"Le PIB progresse de {croissance}% au {trimestre_pib}. Argument pour des augmentations !",
                "onglet": "conjoncture"
            })
    
    # ========== ALERTES SMIC ==========
    if 'smic' in data_actuelle:
        smic_data = data_actuelle['smic']
        date_vigueur = smic_data.get('date_vigueur', '')
        montant_brut = smic_data.get('montant_brut', 0)
        
        # Vérifier si le SMIC a été revalorisé récemment (dans les 30 derniers jours)
        try:
            date_smic = datetime.strptime(date_vigueur, "%Y-%m-%d")
            if (today - date_smic).days <= 60:
                alertes.append({
                    "id": f"smic_{date_vigueur}",
                    "date": date_vigueur,
                    "type": "info",
                    "titre": f"💰 SMIC revalorisé",
                    "message": f"Nouveau SMIC brut : {montant_brut}€/mois depuis le {date_vigueur}. Vérifiez vos grilles !",
                    "onglet": "salaires"
                })
        except:
            pass
    
    # ========== ALERTES IRL ==========
    if 'irl' in data_actuelle:
        irl_data = data_actuelle['irl']
        glissement = irl_data.get('glissement_annuel', 0)
        
        if glissement > 3:
            alertes.append({
                "id": f"irl_hausse_{date_str}",
                "date": date_str,
                "type": "warning",
                "titre": f"🏠 IRL en hausse : +{glissement}%",
                "message": f"Les loyers peuvent augmenter jusqu'à {glissement}% à la date anniversaire du bail.",
                "onglet": "conditions_vie"
            })
    
    # ========== ALERTES DÉFAILLANCES ==========
    if 'defaillances' in data_actuelle:
        defaillances = data_actuelle['defaillances']
        cumul = defaillances.get('cumul_12_mois', 0)
        variation = defaillances.get('variation_annuelle', 0)
        
        if variation > 10:
            alertes.append({
                "id": f"defaillances_hausse_{date_str}",
                "date": date_str,
                "type": "warning",
                "titre": f"🏢 Défaillances : +{variation}%",
                "message": f"{cumul:,} défaillances sur 12 mois. Hausse significative à surveiller.",
                "onglet": "conjoncture"
            })
    
    # ========== ALERTES EMPLOIS VACANTS ==========
    if 'emplois_vacants_data' in data_actuelle and data_actuelle['emplois_vacants_data']:
        ev_data = data_actuelle['emplois_vacants_data']
        if 'taux_vacance' in ev_data and ev_data['taux_vacance']:
            dernier_taux = ev_data['taux_vacance'][-1]
            taux_vacance = dernier_taux.get('taux', 0)
            
            if taux_vacance > 2:
                alertes.append({
                    "id": f"tension_emploi_{date_str}",
                    "date": date_str,
                    "type": "info",
                    "titre": f"🎯 Tensions recrutement : {taux_vacance}%",
                    "message": "Le taux d'emplois vacants reste élevé. Les entreprises peinent à recruter.",
                    "onglet": "emploi"
                })
    
    # ========== ALERTE NOUVELLE MISE À JOUR ==========
    # Toujours ajouter une alerte indiquant la date de mise à jour
    alertes.append({
        "id": f"maj_{date_str}",
        "date": date_str,
        "type": "info",
        "titre": "🔄 Données actualisées",
        "message": f"Le tableau de bord a été mis à jour le {today.strftime('%d/%m/%Y à %H:%M')}.",
        "onglet": "conjoncture"
    })
    
    # Trier par date décroissante et limiter à 10 alertes max
    alertes = sorted(alertes, key=lambda x: x['date'], reverse=True)[:10]
    
    return alertes


def build_changelog():
    """
    Retourne l'historique des modifications du tableau de bord.
    À mettre à jour manuellement lors de changements importants.
    
    Format:
    - version: Numéro de version (ex: "2.1.0")
    - date: Date de la modification
    - type: "feature" | "fix" | "data" | "breaking"
    - titre: Titre court
    - description: Description détaillée
    """
    
    changelog = [
        {
            "version": "3.1.1",
            "date": "2026-03-24",
            "modifications": [
                {
                    "type": "breaking",
                    "titre": "Page de favoris",
                    "description": "Vous avez désormais une page de favoris avec la possibilité d'annoter les cartes, de les réorganiser, etc"
                }, 
                {
                    "type": "feature",
                    "titre": "Cartes mise en avant modifiables",
                    "description": "Les cartes de données mises en avant en haut de votre tableau de bord sont désormais modifiables afin que vous choisissiez vos données préférées"
                },                
                {
                    "type": "feature",
                    "titre": "Nouvelles données disponibles",
                    "description": "Données des marchés financiers actualisées avec des données issues des marchés des métaux. Remontée de données journalières sur les carburants"
                }
            ]
        },        
        {
            "version": "2.2.2",
            "date": "2026-03-18",
            "modifications": [
                {
                    "type": "feature",
                    "titre": "Comparaison par carte",
                    "description": "Dans l'onglet conjoncture, vous retrouverez un sous-onglet globe vous permettant de comparer des indicateurs à l'international"
                }, 
                {
                    "type": "feature",
                    "titre": "Fonction de recherche",
                    "description": "Barre de recherche dans le header du site pour retrouver plus vite un élément"
                },                
                {
                    "type": "feature",
                    "titre": "Mémoire des crises",
                    "description": "Dans la partie évolutions, vous pourrez vous documenter sur les crises économiques contemporaines et visualiser les évolution d'indicateurs essentiels"
                }
            ]
        },
        {
            "version": "2.2.1",
            "date": "2026-03-17",
            "modifications": [
                {
                    "type": "breaking",
                    "titre": "Outil de suivi de presse économique",
                    "description": "Intégration d'un bouton presse avec une remonté des derniers articles de presse liés à l'économie"
                },                
                {
                    "type": "feature",
                    "titre": "Carte des inégalités",
                    "description": "Une cartographie des inégalités est créée dans le sous-onglet territoires"
                }
            ]
        },
                {
            "version": "2.1.4",
            "date": "2026-03-10",
            "modifications": [
                {
                    "type": "feature",
                    "titre": "Données Outre-Mer onglet territoires",
                    "description": "Les données des Outre-Mer sont désormais intégrées dans la suite de l'onglet territoires"
                }
            ]
        },
        {
            "version": "2.1.3",
            "date": "2026-03-04",
            "modifications": [
                {
                    "type": "breaking",
                    "titre": "Données mises à jour tous les jours",
                    "description": "Les informations financières ayant besoin d'être actualisées régulièrement, le tableau de bord se mettra désormais à jour chaque jour à 6 h UTC"
                },
            ]
        },        
        {
            "version": "2.1.2",
            "date": "2026-03-03",
            "modifications": [
                {
                    "type": "feature",
                    "titre": "Sous-onglet march\u00e9s financiers",
                    "description": "Suite aux \u00e9v\u00e9nements au Moyen-Orient, il semble judicieux de pouvoir analyser les march\u00e9s financiers en intra-day. Retrouvez ces \u00e9l\u00e9ments dans la partie conjoncture, sous-onglet march\u00e9s financiers. Donn\u00e9es quotidiennes sur 1 an avec moyennes mobiles, variations multi-horizons et corr\u00e9lation inflation."
                },
            ]
        },
        {
            "version": "2.1.1",
            "date": "2026-02-12",
            "modifications": [
                {
                    "type": "feature",
                    "titre": "Analyse du traffic",
                    "description": "Connexion du tableau de bord avec google analytics pour analyser la navigation sur le site"
                },
            ]
        },
        {
            "version": "2.1.0",
            "date": "2026-01-28",
            "modifications": [
                {
                    "type": "breaking",
                    "titre": "Prévisions modèle Monte Carlo",
                    "description": "Utilisation d'un modèle Monte Carlo complexe pour les prévisions CFTC."
                },
                {
                    "type": "feature",
                    "titre": "Ajout des emplois vacants DARES",
                    "description": "Nouveau sous-onglet 'Vacants' dans Emploi avec données API DARES (emplois vacants, occupés, taux de vacance par secteur)."
                },
                {
                    "type": "feature",
                    "titre": "Alertes automatiques",
                    "description": "Les alertes sont maintenant générées automatiquement en fonction des variations des indicateurs (chômage, inflation, PIB...)."
                },
                {
                    "type": "feature",
                    "titre": "Changelog intégré",
                    "description": "Nouveau sous-onglet 'Mises à jour' dans l'aide pour suivre l'historique des modifications."
                }
            ]
        },
        {
            "version": "2.0.0",
            "date": "2026-01-19",
            "modifications": [
                {
                    "type": "feature",
                    "titre": "Refonte graphique",
                    "description": "Nouveau design 'Bulle' avec mode sombre, KPIs avec sparklines, et navigation améliorée."
                },
                {
                    "type": "feature",
                    "titre": "Conditions de vie",
                    "description": "Nouvel onglet avec IRL, prix immobilier, carburants et taux d'effort logement."
                },
                {
                    "type": "feature",
                    "titre": "Conjoncture générale",
                    "description": "PIB, climat des affaires, confiance des ménages, défaillances d'entreprises."
                },
                {
                    "type": "data",
                    "titre": "APIs automatiques",
                    "description": "Connexion aux APIs INSEE (SDMX), data.gouv.fr (carburants), DARES."
                }
            ]
        },
    ]
    return changelog

def build_marches_financiers_data():
    """
    Recupere les donnees des marches financiers avec granularite QUOTIDIENNE sur 1 an :
    - OAT 10 ans via FRED (daily), fallback BCE/SDW, fallback statique
    - Petrole Brent via Yahoo Finance
    - CAC 40 via Yahoo Finance
    Calcule: variations (jour/semaine/mois/YTD), moyennes mobiles (50j/200j),
    min/max sur 1 an, correlation avec l'inflation.
    """
    import ssl
    import re
    import math
    from datetime import datetime as dt_local, timedelta

    print("  \U0001f4ca March\u00e9s financiers (analyse quotidienne 1 an)...")

    def safe_urlopen(url, headers=None, timeout=15):
        req = urllib.request.Request(url)
        if headers:
            for k, v in headers.items():
                req.add_header(k, v)
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return urllib.request.urlopen(req, timeout=timeout, context=ctx)

    def fetch_yahoo_daily(symbol, period="1y", interval="1d"):
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={period}&interval={interval}"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            resp = safe_urlopen(url, headers=headers, timeout=20)
            data = json.loads(resp.read().decode("utf-8"))
            result = data["chart"]["result"][0]
            timestamps = result["timestamp"]
            closes = result["indicators"]["quote"][0]["close"]
            points = []
            for ts, c in zip(timestamps, closes):
                if c is None:
                    continue
                d = dt_local.fromtimestamp(ts)
                points.append({"date": d.strftime("%Y-%m-%d"), "valeur": round(c, 2)})
            return points
        except Exception as e:
            print(f"    Yahoo Finance {symbol} indisponible: {e}")
            return []

    def compute_moving_average(data, window):
        result = []
        vals = [p["valeur"] for p in data]
        for i in range(len(vals)):
            if i < window - 1:
                result.append(None)
            else:
                avg = sum(vals[i - window + 1:i + 1]) / window
                result.append(round(avg, 2))
        return result

    def compute_variations(data):
        if not data or len(data) < 2:
            return {"jour": 0, "semaine": 0, "mois": 0, "ytd": 0}
        dernier = data[-1]["valeur"]
        precedent = data[-2]["valeur"] if len(data) >= 2 else dernier
        var_jour = round((dernier / precedent - 1) * 100, 2) if precedent else 0
        idx_sem = max(0, len(data) - 6)
        var_sem = round((dernier / data[idx_sem]["valeur"] - 1) * 100, 2) if data[idx_sem]["valeur"] else 0
        idx_mois = max(0, len(data) - 23)
        var_mois = round((dernier / data[idx_mois]["valeur"] - 1) * 100, 2) if data[idx_mois]["valeur"] else 0
        annee_courante = dt_local.now().strftime("%Y")
        val_ytd = None
        for p in data:
            if p["date"].startswith(annee_courante):
                val_ytd = p["valeur"]
                break
        if val_ytd is None:
            val_ytd = data[0]["valeur"]
        var_ytd = round((dernier / val_ytd - 1) * 100, 2) if val_ytd else 0
        return {"jour": var_jour, "semaine": var_sem, "mois": var_mois, "ytd": var_ytd}

    def compute_min_max(data):
        if not data:
            return {"min": 0, "min_date": "", "max": 0, "max_date": ""}
        min_p = min(data, key=lambda x: x["valeur"])
        max_p = max(data, key=lambda x: x["valeur"])
        return {"min": min_p["valeur"], "min_date": min_p["date"], "max": max_p["valeur"], "max_date": max_p["date"]}

    def compute_correlation(series_a, series_b):
        if len(series_a) != len(series_b) or len(series_a) < 6:
            return None
        n = len(series_a)
        mean_a = sum(series_a) / n
        mean_b = sum(series_b) / n
        cov = sum((a - mean_a) * (b - mean_b) for a, b in zip(series_a, series_b)) / n
        std_a = math.sqrt(sum((a - mean_a) ** 2 for a in series_a) / n)
        std_b = math.sqrt(sum((b - mean_b) ** 2 for b in series_b) / n)
        if std_a == 0 or std_b == 0:
            return None
        return round(cov / (std_a * std_b), 3)

    def add_moving_averages(data):
        ma50 = compute_moving_average(data, 50)
        ma200 = compute_moving_average(data, 200)
        for i, p in enumerate(data):
            p["ma50"] = ma50[i]
            p["ma200"] = ma200[i]
        return data

    # =============================================
    # 1) OAT 10 ANS - FRED daily
    # =============================================
    oat_data = []
    oat_source = "N/A"

    one_year_ago = (dt_local.now() - timedelta(days=400)).strftime("%Y-%m-%d")

    # Source 1 : BCE data-api (nouvelle URL stable — remplace sdw-wsrest.ecb.europa.eu mort)
    try:
        print("    -> OAT 10 ans : BCE data-api...")
        bce_url = "https://data-api.ecb.europa.eu/service/data/IRS/M.FR.L.L40.CI.0000.EUR.N.Z?startPeriod=2025-01&format=csvdata"
        resp = safe_urlopen(bce_url, headers={"Accept": "text/csv"}, timeout=20)
        csv_text = resp.read().decode("utf-8")
        lines_bce = csv_text.strip().split("\n")
        if len(lines_bce) > 1:
            header = lines_bce[0].split(",")
            time_idx = next((i for i, h in enumerate(header) if "TIME_PERIOD" in h.upper()), None)
            val_idx  = next((i for i, h in enumerate(header) if "OBS_VALUE"   in h.upper()), None)
            if time_idx is not None and val_idx is not None:
                for line in lines_bce[1:]:
                    parts = line.split(",")
                    if len(parts) > max(time_idx, val_idx):
                        try:
                            v = float(parts[val_idx].strip().strip('"'))
                            d = parts[time_idx].strip().strip('"')
                            oat_data.append({"date": d, "valeur": round(v, 3)})
                        except (ValueError, TypeError):
                            pass
        if oat_data:
            oat_source = "BCE data-api (mensuel)"
            print(f"    OAT BCE: {len(oat_data)} points, dernier={oat_data[-1]['valeur']}% ({oat_data[-1]['date']})")
    except Exception as e:
        print(f"    BCE data-api indisponible: {e}")

    # Source 2 : Yahoo Finance ^TNX (US 10Y Treasury, proxy OAT FR)
    # ^TNX cote en dixièmes de % (ex: 42.5 = 4.25%). OAT FR ≈ TNX/10 - 1.2%
    if not oat_data:
        try:
            print("    -> OAT 10 ans : Yahoo ^TNX (proxy US 10Y)...")
            tnx_raw = fetch_yahoo_daily("%5ETNX", period="1y", interval="1d")
            if tnx_raw:
                oat_data = [
                    {"date": p["date"], "valeur": round(p["valeur"] / 10 - 1.2, 3)}
                    for p in tnx_raw if p["valeur"] / 10 - 1.2 > 0
                ]
                oat_source = "Yahoo ^TNX proxy (quotidien)"
                print(f"    OAT via TNX: {len(oat_data)} points, dernier={oat_data[-1]['valeur']}% ({oat_data[-1]['date']})")
        except Exception as e:
            print(f"    Yahoo TNX indisponible: {e}")

    # Source 3 : FRED série mensuelle OAT FR (nomenclature mise à jour)
    if not oat_data:
        try:
            print("    -> OAT 10 ans : FRED (IRLTLT01FRM156N)...")
            fred_url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id=IRLTLT01FRM156N&cosd={one_year_ago}"
            resp = safe_urlopen(fred_url, timeout=15)
            for line in resp.read().decode("utf-8").strip().split("\n")[1:]:
                parts = line.split(",")
                if len(parts) >= 2 and parts[1].strip() not in (".", ""):
                    try:
                        oat_data.append({"date": parts[0].strip(), "valeur": round(float(parts[1].strip()), 3)})
                    except (ValueError, TypeError):
                        pass
            if oat_data:
                oat_source = "FRED IRLTLT01FRM156N (mensuel)"
                print(f"    OAT FRED: {len(oat_data)} points, dernier={oat_data[-1]['valeur']}% ({oat_data[-1]['date']})")
        except Exception as e:
            print(f"    FRED IRLTLT01FRM156N indisponible: {e}")

    if not oat_data:
        print("    -> OAT 10 ans : fallback statique")
        oat_source = "Valeur statique (fallback)"
        base_date = dt_local.now() - timedelta(days=365)
        for i in range(0, 365, 1):
            d = base_date + timedelta(days=i)
            if d.weekday() < 5:
                v = 3.0 + 0.3 * math.sin(i / 60) + (i / 3650)
                oat_data.append({"date": d.strftime("%Y-%m-%d"), "valeur": round(v, 3)})

    # =============================================
    # 2) PETROLE BRENT - Yahoo Finance quotidien
    # =============================================
    brent_data = fetch_yahoo_daily("BZ%3DF", period="1y", interval="1d")
    brent_source = "Yahoo Finance" if brent_data else "N/A"

    if not brent_data:
        print("    -> Brent: tentative symbole alternatif CL=F (WTI)...")
        brent_data = fetch_yahoo_daily("CL%3DF", period="1y", interval="1d")
        if brent_data:
            brent_source = "Yahoo Finance (WTI proxy)"

    # Fallback 2 : FRED - serie DCOILBRENTEU (quotidien, gratuit, sans quota)
    if not brent_data:
        try:
            print("    -> Brent : fallback FRED (DCOILBRENTEU)...")
            one_year_ago = (dt_local.now() - timedelta(days=400)).strftime("%Y-%m-%d")
            fred_brent_url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU&cosd={one_year_ago}"
            resp = safe_urlopen(fred_brent_url, timeout=15)
            csv_text = resp.read().decode("utf-8")
            lines = csv_text.strip().split("\n")
            for line in lines[1:]:
                parts = line.split(",")
                if len(parts) >= 2 and parts[1].strip() not in (".", ""):
                    try:
                        v = float(parts[1].strip())
                        brent_data.append({"date": parts[0].strip(), "valeur": round(v, 2)})
                    except (ValueError, TypeError):
                        pass
            if brent_data:
                brent_source = "FRED/EIA (DCOILBRENTEU)"
                print(f"    Brent FRED: {len(brent_data)} points, dernier={brent_data[-1]['valeur']} USD ({brent_data[-1]['date']})")
        except Exception as e:
            print(f"    FRED Brent indisponible: {e}")

    # Fallback 3 : EIA API v2 (cle gratuite, quota genereux)
    if not brent_data:
        try:
            print("    -> Brent : fallback EIA API v2...")
            eia_url = "https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=DEMO_KEY&frequency=daily&data[0]=value&facets[series][]=RBRTE&sort[0][column]=period&sort[0][direction]=desc&length=365"
            resp = safe_urlopen(eia_url, timeout=15)
            eia_result = json.loads(resp.read().decode("utf-8"))
            if "response" in eia_result and "data" in eia_result["response"]:
                for item in reversed(eia_result["response"]["data"]):
                    try:
                        v = float(item["value"])
                        brent_data.append({"date": item["period"], "valeur": round(v, 2)})
                    except (ValueError, TypeError, KeyError):
                        pass
            if brent_data:
                brent_source = "EIA (API v2)"
                print(f"    Brent EIA: {len(brent_data)} points, dernier={brent_data[-1]['valeur']} USD ({brent_data[-1]['date']})")
        except Exception as e:
            print(f"    EIA API indisponible: {e}")

    # Fallback 4 : valeur statique (dernier recours)
    if not brent_data:
        print("    -> Brent : fallback statique")
        brent_source = "Valeur statique (fallback)"
        base_date = dt_local.now() - timedelta(days=365)
        for i in range(0, 365, 1):
            d = base_date + timedelta(days=i)
            if d.weekday() < 5:
                v = 72.0 + 10 * math.sin(i / 45) + (i / 500)
                brent_data.append({"date": d.strftime("%Y-%m-%d"), "valeur": round(v, 2)})
    elif len(brent_data) > 1:
        print(f"    Brent: {len(brent_data)} points, dernier={brent_data[-1]['valeur']} USD ({brent_data[-1]['date']})")

    # =============================================
    # 3) CAC 40 - Yahoo Finance quotidien
    # =============================================
    cac_data = fetch_yahoo_daily("%5EFCHI", period="1y", interval="1d")
    cac_source = "Yahoo Finance" if cac_data else "N/A"

    if not cac_data:
        print("    -> CAC 40 : fallback statique")
        cac_source = "Valeur statique (fallback)"
        base_date = dt_local.now() - timedelta(days=365)
        for i in range(0, 365, 1):
            d = base_date + timedelta(days=i)
            if d.weekday() < 5:
                v = 7500 + 500 * math.sin(i / 40) + i * 1.5
                cac_data.append({"date": d.strftime("%Y-%m-%d"), "valeur": round(v, 2)})
    else:
        print(f"    CAC 40: {len(cac_data)} points, dernier={cac_data[-1]['valeur']} pts ({cac_data[-1]['date']})")

    # =============================================
    # 4) EUR/USD - Yahoo Finance quotidien
    # =============================================
    eurusd_data = fetch_yahoo_daily("EURUSD%3DX", period="1y", interval="1d")
    eurusd_source = "Yahoo Finance" if eurusd_data else "N/A"

    if not eurusd_data:
        try:
            print("    -> EUR/USD : fallback FRED (DEXUSEU)...")
            one_year_ago = (dt_local.now() - timedelta(days=400)).strftime("%Y-%m-%d")
            fred_eur_url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id=DEXUSEU&cosd={one_year_ago}"
            resp = safe_urlopen(fred_eur_url, timeout=15)
            csv_text = resp.read().decode("utf-8")
            lines = csv_text.strip().split("\n")
            for line in lines[1:]:
                parts = line.split(",")
                if len(parts) >= 2 and parts[1].strip() not in (".", ""):
                    try:
                        v = float(parts[1].strip())
                        eurusd_data.append({"date": parts[0].strip(), "valeur": round(v, 4)})
                    except (ValueError, TypeError):
                        pass
            if eurusd_data:
                eurusd_source = "FRED (DEXUSEU)"
                print(f"    EUR/USD FRED: {len(eurusd_data)} points")
        except Exception as e:
            print(f"    FRED EUR/USD indisponible: {e}")

    if not eurusd_data:
        print("    -> EUR/USD : fallback statique")
        eurusd_source = "Valeur statique (fallback)"
        base_date = dt_local.now() - timedelta(days=365)
        for i in range(0, 365, 1):
            d = base_date + timedelta(days=i)
            if d.weekday() < 5:
                v = 1.08 + 0.04 * math.sin(i / 50)
                eurusd_data.append({"date": d.strftime("%Y-%m-%d"), "valeur": round(v, 4)})
    else:
        print(f"    EUR/USD: {len(eurusd_data)} points, dernier={eurusd_data[-1]['valeur']} ({eurusd_data[-1]['date']})")

    # =============================================
    # 5) OR - Yahoo Finance quotidien (GC=F)
    # =============================================
    or_data = fetch_yahoo_daily("GC%3DF", period="1y", interval="1d")
    or_source = "Yahoo Finance" if or_data else "N/A"

    if not or_data:
        try:
            print("    -> Or : fallback FRED (GOLDAMGBD228NLBM)...")
            one_year_ago = (dt_local.now() - timedelta(days=400)).strftime("%Y-%m-%d")
            fred_gold_url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id=GOLDAMGBD228NLBM&cosd={one_year_ago}"
            resp = safe_urlopen(fred_gold_url, timeout=15)
            csv_text = resp.read().decode("utf-8")
            lines = csv_text.strip().split("\n")
            for line in lines[1:]:
                parts = line.split(",")
                if len(parts) >= 2 and parts[1].strip() not in (".", ""):
                    try:
                        v = float(parts[1].strip())
                        or_data.append({"date": parts[0].strip(), "valeur": round(v, 2)})
                    except (ValueError, TypeError):
                        pass
            if or_data:
                or_source = "FRED (GOLDAMGBD228NLBM)"
                print(f"    Or FRED: {len(or_data)} points")
        except Exception as e:
            print(f"    FRED Or indisponible: {e}")

    if not or_data:
        print("    -> Or : fallback statique")
        or_source = "Valeur statique (fallback)"
        base_date = dt_local.now() - timedelta(days=365)
        for i in range(0, 365, 1):
            d = base_date + timedelta(days=i)
            if d.weekday() < 5:
                v = 2300 + 200 * math.sin(i / 60) + i * 0.5
                or_data.append({"date": d.strftime("%Y-%m-%d"), "valeur": round(v, 2)})
    else:
        print(f"    Or: {len(or_data)} points, dernier={or_data[-1]['valeur']} USD/oz ({or_data[-1]['date']})")

    # =============================================
    # 6) GAZ NATUREL TTF - Yahoo Finance (TTF=F)
    # =============================================
    gaz_data = fetch_yahoo_daily("TTF%3DF", period="1y", interval="1d")
    gaz_source = "Yahoo Finance (TTF)" if gaz_data else "N/A"

    if not gaz_data:
        # Fallback: Henry Hub via FRED (DHHNGSP) - reference US mais indicatif
        try:
            print("    -> Gaz : fallback FRED Henry Hub (DHHNGSP)...")
            one_year_ago = (dt_local.now() - timedelta(days=400)).strftime("%Y-%m-%d")
            fred_gas_url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id=DHHNGSP&cosd={one_year_ago}"
            resp = safe_urlopen(fred_gas_url, timeout=15)
            csv_text = resp.read().decode("utf-8")
            lines = csv_text.strip().split("\n")
            for line in lines[1:]:
                parts = line.split(",")
                if len(parts) >= 2 and parts[1].strip() not in (".", ""):
                    try:
                        v = float(parts[1].strip())
                        gaz_data.append({"date": parts[0].strip(), "valeur": round(v, 3)})
                    except (ValueError, TypeError):
                        pass
            if gaz_data:
                gaz_source = "FRED (Henry Hub)"
                print(f"    Gaz FRED: {len(gaz_data)} points")
        except Exception as e:
            print(f"    FRED Gaz indisponible: {e}")

    if not gaz_data:
        print("    -> Gaz naturel : fallback statique")
        gaz_source = "Valeur statique (fallback)"
        base_date = dt_local.now() - timedelta(days=365)
        for i in range(0, 365, 1):
            d = base_date + timedelta(days=i)
            if d.weekday() < 5:
                v = 35.0 + 15 * math.sin(i / 30) + (i / 300)
                gaz_data.append({"date": d.strftime("%Y-%m-%d"), "valeur": round(v, 2)})
    else:
        print(f"    Gaz naturel: {len(gaz_data)} points, dernier={gaz_data[-1]['valeur']} ({gaz_data[-1]['date']})")

    # =============================================
    # 7) BLE - Yahoo Finance (ZW=F)
    # =============================================
    ble_data = fetch_yahoo_daily("ZW%3DF", period="1y", interval="1d")
    ble_source = "Yahoo Finance" if ble_data else "N/A"

    if not ble_data:
        try:
            print("    -> Ble : fallback FRED (PWHEAMTUSDM) mensuel...")
            one_year_ago = (dt_local.now() - timedelta(days=400)).strftime("%Y-%m-%d")
            fred_wheat_url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id=PWHEAMTUSDM&cosd={one_year_ago}"
            resp = safe_urlopen(fred_wheat_url, timeout=15)
            csv_text = resp.read().decode("utf-8")
            lines = csv_text.strip().split("\n")
            for line in lines[1:]:
                parts = line.split(",")
                if len(parts) >= 2 and parts[1].strip() not in (".", ""):
                    try:
                        v = float(parts[1].strip())
                        ble_data.append({"date": parts[0].strip(), "valeur": round(v, 2)})
                    except (ValueError, TypeError):
                        pass
            if ble_data:
                ble_source = "FRED (prix mondial mensuel)"
                print(f"    Ble FRED: {len(ble_data)} points")
        except Exception as e:
            print(f"    FRED Ble indisponible: {e}")

    if not ble_data:
        print("    -> Ble : fallback statique")
        ble_source = "Valeur statique (fallback)"
        base_date = dt_local.now() - timedelta(days=365)
        for i in range(0, 365, 1):
            d = base_date + timedelta(days=i)
            if d.weekday() < 5:
                v = 550 + 80 * math.sin(i / 40)
                ble_data.append({"date": d.strftime("%Y-%m-%d"), "valeur": round(v, 2)})
    else:
        print(f"    Ble: {len(ble_data)} points, dernier={ble_data[-1]['valeur']} ({ble_data[-1]['date']})")

    # =============================================
    # 8b) MÉTAUX LME - Yahoo Finance quotidien
    #     Cuivre (HG=F), Aluminium (ALI=F), Zinc, Nickel
    # =============================================
    print("    -> Métaux LME : Yahoo Finance...")

    def fetch_lme_metal(symbol, fallback_vals, label):
        data = fetch_yahoo_daily(symbol, period="1y", interval="1d")
        if data:
            print(f"    {label}: {len(data)} points, dernier={data[-1]['valeur']} ({data[-1]['date']})")
            return data, "Yahoo Finance"
        print(f"    -> {label} : fallback statique")
        base_date = dt_local.now() - timedelta(days=365)
        result = []
        for i in range(0, 365, 1):
            d = base_date + timedelta(days=i)
            if d.weekday() < 5:
                base, amp, freq = fallback_vals
                v = base + amp * math.sin(i / freq)
                result.append({"date": d.strftime("%Y-%m-%d"), "valeur": round(v, 2)})
        return result, "Valeur statique (fallback)"

    # Cuivre : HG=F (CME/COMEX en cents/lb) — proxy LME cuivre
    cuivre_data, cuivre_source = fetch_lme_metal("HG%3DF", (420, 30, 45), "Cuivre")
    # Aluminium : ALI=F (COMEX en cents/lb) — proxy LME aluminium
    aluminium_data, aluminium_source = fetch_lme_metal("ALI%3DF", (100, 12, 50), "Aluminium")
    # Zinc : pas de contrat Yahoo dédié, fallback sur statique (LME ~2700 $/t)
    zinc_data, zinc_source = fetch_lme_metal("ZNC%3DF", (2700, 200, 40), "Zinc")
    # Nickel : Yahoo Finance a supprimé NI=F, LNI=F et NI%3DF
    # → FRED PNICKUSDM (LME Nickel USD/tonne mensuel, World Bank/IMF, stable)
    nickel_data = []
    nickel_source = "Valeur statique (fallback)"
    try:
        print("    -> Nickel : FRED (PNICKUSDM)...")
        nick_url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id=PNICKUSDM&cosd={one_year_ago}"
        resp_ni = safe_urlopen(nick_url, timeout=15)
        for line in resp_ni.read().decode("utf-8").strip().split("\n")[1:]:
            parts = line.split(",")
            if len(parts) >= 2 and parts[1].strip() not in (".", ""):
                try:
                    nickel_data.append({"date": parts[0].strip(), "valeur": round(float(parts[1].strip()), 2)})
                except (ValueError, TypeError):
                    pass
        if nickel_data:
            nickel_source = "FRED PNICKUSDM (mensuel)"
            print(f"    Nickel FRED: {len(nickel_data)} points, dernier={nickel_data[-1]['valeur']} USD/t ({nickel_data[-1]['date']})")
    except Exception as e:
        print(f"    FRED Nickel indisponible: {e}")
    if not nickel_data:
        nickel_data, nickel_source = fetch_lme_metal("NI=F", (15500, 800, 40), "Nickel (fallback statique)")

    # =============================================
    # 8) TAUX IMMOBILIER MOYEN - Historique mensuel
    #    Source: Banque de France / Observatoire Credit Logement
    # =============================================
    print("    -> Taux immobilier moyen (BdF / Observatoire Credit Logement)...")
    taux_immo_data = [
        {"date": "2022-01", "valeur": 1.12}, {"date": "2022-02", "valeur": 1.13},
        {"date": "2022-03", "valeur": 1.18}, {"date": "2022-04", "valeur": 1.27},
        {"date": "2022-05", "valeur": 1.38}, {"date": "2022-06", "valeur": 1.52},
        {"date": "2022-07", "valeur": 1.68}, {"date": "2022-08", "valeur": 1.82},
        {"date": "2022-09", "valeur": 1.98}, {"date": "2022-10", "valeur": 2.13},
        {"date": "2022-11", "valeur": 2.25}, {"date": "2022-12", "valeur": 2.34},
        {"date": "2023-01", "valeur": 2.59}, {"date": "2023-02", "valeur": 2.82},
        {"date": "2023-03", "valeur": 3.04}, {"date": "2023-04", "valeur": 3.15},
        {"date": "2023-05", "valeur": 3.28}, {"date": "2023-06", "valeur": 3.45},
        {"date": "2023-07", "valeur": 3.60}, {"date": "2023-08", "valeur": 3.72},
        {"date": "2023-09", "valeur": 3.83}, {"date": "2023-10", "valeur": 4.12},
        {"date": "2023-11", "valeur": 4.22}, {"date": "2023-12", "valeur": 4.20},
        {"date": "2024-01", "valeur": 4.17}, {"date": "2024-02", "valeur": 4.03},
        {"date": "2024-03", "valeur": 3.92}, {"date": "2024-04", "valeur": 3.83},
        {"date": "2024-05", "valeur": 3.73}, {"date": "2024-06", "valeur": 3.66},
        {"date": "2024-07", "valeur": 3.58}, {"date": "2024-08", "valeur": 3.52},
        {"date": "2024-09", "valeur": 3.45}, {"date": "2024-10", "valeur": 3.40},
        {"date": "2024-11", "valeur": 3.39}, {"date": "2024-12", "valeur": 3.30},
        {"date": "2025-01", "valeur": 3.32}, {"date": "2025-02", "valeur": 3.24},
        {"date": "2025-03", "valeur": 3.17}, {"date": "2025-04", "valeur": 3.12},
        {"date": "2025-05", "valeur": 3.10}, {"date": "2025-06", "valeur": 3.05},
        {"date": "2025-07", "valeur": 3.00}, {"date": "2025-08", "valeur": 3.01},
        {"date": "2025-09", "valeur": 3.04}, {"date": "2025-10", "valeur": 3.08},
        {"date": "2025-11", "valeur": 3.01}, {"date": "2025-12", "valeur": 3.10},
        {"date": "2026-01", "valeur": 3.20},
        {"date": "2026-02", "valeur": 3.25},
    ]
    taux_immo_source = "Banque de France / Observatoire Credit Logement"
    taux_immo_variations = {
        "mois": round(taux_immo_data[-1]["valeur"] - taux_immo_data[-2]["valeur"], 2) if len(taux_immo_data) >= 2 else 0,
        "trimestre": round(taux_immo_data[-1]["valeur"] - taux_immo_data[-4]["valeur"], 2) if len(taux_immo_data) >= 4 else 0,
        "an": round(taux_immo_data[-1]["valeur"] - taux_immo_data[-13]["valeur"], 2) if len(taux_immo_data) >= 13 else 0,
    }
    taux_immo_minmax = compute_min_max(taux_immo_data)
    print(f"    Taux immo: {len(taux_immo_data)} points, dernier={taux_immo_data[-1]['valeur']}% ({taux_immo_data[-1]['date']})")

    # =============================================
    # ANALYSES AVANCEES
    # =============================================
    oat_data = add_moving_averages(oat_data)
    brent_data = add_moving_averages(brent_data)
    cac_data = add_moving_averages(cac_data)
    eurusd_data = add_moving_averages(eurusd_data)
    or_data = add_moving_averages(or_data)
    gaz_data = add_moving_averages(gaz_data)
    ble_data = add_moving_averages(ble_data)
    cuivre_data = add_moving_averages(cuivre_data)
    aluminium_data = add_moving_averages(aluminium_data)
    zinc_data = add_moving_averages(zinc_data)
    nickel_data = add_moving_averages(nickel_data)

    oat_variations = compute_variations(oat_data)
    brent_variations = compute_variations(brent_data)
    cac_variations = compute_variations(cac_data)
    eurusd_variations = compute_variations(eurusd_data)
    or_variations = compute_variations(or_data)
    gaz_variations = compute_variations(gaz_data)
    ble_variations = compute_variations(ble_data)
    cuivre_variations = compute_variations(cuivre_data)
    aluminium_variations = compute_variations(aluminium_data)
    zinc_variations = compute_variations(zinc_data)
    nickel_variations = compute_variations(nickel_data)

    oat_minmax = compute_min_max(oat_data)
    brent_minmax = compute_min_max(brent_data)
    cac_minmax = compute_min_max(cac_data)
    eurusd_minmax = compute_min_max(eurusd_data)
    or_minmax = compute_min_max(or_data)
    gaz_minmax = compute_min_max(gaz_data)
    ble_minmax = compute_min_max(ble_data)
    cuivre_minmax = compute_min_max(cuivre_data)
    aluminium_minmax = compute_min_max(aluminium_data)
    zinc_minmax = compute_min_max(zinc_data)
    nickel_minmax = compute_min_max(nickel_data)

    # Correlation avec l'inflation (IPC mensuel)
    # Inflation mensuelle glissement annuel - données INSEE définitives
    # Source : https://www.insee.fr/fr/statistiques/8726461 (bilan annuel 2025)
    #          https://www.service-public.gouv.fr/particuliers/actualites/A15404 (jan 2026)
    inflation_mensuelle = [
        {"date": "2025-01", "valeur": 1.7}, {"date": "2025-02", "valeur": 0.8},
        {"date": "2025-03", "valeur": 0.8}, {"date": "2025-04", "valeur": 0.5},
        {"date": "2025-05", "valeur": 0.6}, {"date": "2025-06", "valeur": 0.7},
        {"date": "2025-07", "valeur": 0.9}, {"date": "2025-08", "valeur": 0.9},
        {"date": "2025-09", "valeur": 1.2}, {"date": "2025-10", "valeur": 0.9},
        {"date": "2025-11", "valeur": 0.9}, {"date": "2025-12", "valeur": 0.8},
        {"date": "2026-01", "valeur": 0.3}, {"date": "2026-02", "valeur": 0.8},
    ]

    def monthly_avg(daily_data):
        monthly = {}
        for p in daily_data:
            m = p["date"][:7]
            if m not in monthly:
                monthly[m] = []
            monthly[m].append(p["valeur"])
        return {m: round(sum(v)/len(v), 2) for m, v in monthly.items()}

    oat_monthly = monthly_avg(oat_data)
    brent_monthly = monthly_avg(brent_data)
    cac_monthly = monthly_avg(cac_data)
    eurusd_monthly = monthly_avg(eurusd_data)
    or_monthly = monthly_avg(or_data)
    gaz_monthly = monthly_avg(gaz_data)
    ble_monthly = monthly_avg(ble_data)
    infl_dict = {p["date"]: p["valeur"] for p in inflation_mensuelle}

    def corr_with_inflation(monthly_dict):
        common_months = sorted(set(monthly_dict.keys()) & set(infl_dict.keys()))
        if len(common_months) < 6:
            return None
        a = [monthly_dict[m] for m in common_months]
        b = [infl_dict[m] for m in common_months]
        return compute_correlation(a, b)

    corr_oat = corr_with_inflation(oat_monthly)
    corr_brent = corr_with_inflation(brent_monthly)
    corr_cac = corr_with_inflation(cac_monthly)
    corr_eurusd = corr_with_inflation(eurusd_monthly)
    corr_or = corr_with_inflation(or_monthly)
    corr_gaz = corr_with_inflation(gaz_monthly)
    corr_ble = corr_with_inflation(ble_monthly)

    correlations = {
        "oat_inflation": corr_oat,
        "brent_inflation": corr_brent,
        "cac_inflation": corr_cac,
        "eurusd_inflation": corr_eurusd,
        "or_inflation": corr_or,
        "gaz_inflation": corr_gaz,
        "ble_inflation": corr_ble,
        "inflation_data": inflation_mensuelle,
        "note": "Correlation de Pearson calculee sur les moyennes mensuelles communes (marche vs IPC glissement annuel)."
    }

    print(f"    Correlations inflation -> OAT:{corr_oat} Brent:{corr_brent} CAC:{corr_cac} EUR/USD:{corr_eurusd} Or:{corr_or} Gaz:{corr_gaz} Ble:{corr_ble}")

    oat_evolution_annuelle = [
        {"annee": 2015, "valeur": 0.84}, {"annee": 2016, "valeur": 0.47},
        {"annee": 2017, "valeur": 0.81}, {"annee": 2018, "valeur": 0.78},
        {"annee": 2019, "valeur": 0.13}, {"annee": 2020, "valeur": -0.15},
        {"annee": 2021, "valeur": 0.04}, {"annee": 2022, "valeur": 1.73},
        {"annee": 2023, "valeur": 3.12}, {"annee": 2024, "valeur": 2.98},
        {"annee": 2025, "valeur": 3.10}, {"annee": 2026, "valeur": 3.025},
    ]

    return {
        "oat_10ans": {
            "valeur": oat_data[-1]["valeur"] if oat_data else 3.15,
            "date": oat_data[-1]["date"] if oat_data else "N/A",
            "unite": "%", "source": oat_source,
            "nb_points": len(oat_data),
            "historique": oat_data,
            "evolution_annuelle": oat_evolution_annuelle,
            "variations": oat_variations,
            "min_max": oat_minmax,
            "note_lecture": "Le TEC-10 mesure le rendement des emprunts d'Etat francais a 10 ans. Un taux eleve rencherit le cout de la dette publique et impacte les taux de credit immobilier."
        },
        "petrole_brent": {
            "valeur": brent_data[-1]["valeur"] if brent_data else 73.50,
            "date": brent_data[-1]["date"] if brent_data else "N/A",
            "unite": "USD/baril", "source": brent_source,
            "nb_points": len(brent_data),
            "historique": brent_data,
            "variations": brent_variations,
            "min_max": brent_minmax,
            "note_lecture": "Le prix du Brent influence directement les couts de transport et d'energie, donc l'inflation et le pouvoir d'achat des salaries."
        },
        "cac40": {
            "valeur": cac_data[-1]["valeur"] if cac_data else 8120.43,
            "date": cac_data[-1]["date"] if cac_data else "N/A",
            "variation_jour_pct": cac_variations["jour"],
            "unite": "points", "source": cac_source,
            "nb_points": len(cac_data),
            "historique": cac_data,
            "variations": cac_variations,
            "min_max": cac_minmax,
            "note_lecture": "Le CAC 40 reflete la sante des 40 plus grandes entreprises francaises. Sa performance impacte l'interessement, la participation et l'epargne salariale."
        },
        "eurusd": {
            "valeur": eurusd_data[-1]["valeur"] if eurusd_data else 1.08,
            "date": eurusd_data[-1]["date"] if eurusd_data else "N/A",
            "unite": "EUR/USD", "source": eurusd_source,
            "nb_points": len(eurusd_data),
            "historique": eurusd_data,
            "variations": eurusd_variations,
            "min_max": eurusd_minmax,
            "note_lecture": "Le taux de change euro-dollar determine le prix de tout ce qui est importe en dollars : petrole, matieres premieres, electronique. Un euro faible rencherit les importations et alimente l'inflation."
        },
        "or": {
            "valeur": or_data[-1]["valeur"] if or_data else 2650.0,
            "date": or_data[-1]["date"] if or_data else "N/A",
            "unite": "USD/oz", "source": or_source,
            "nb_points": len(or_data),
            "historique": or_data,
            "variations": or_variations,
            "min_max": or_minmax,
            "note_lecture": "L'or est la valeur refuge par excellence. Sa hausse traduit une montee de l'incertitude economique ou geopolitique. Il sert aussi de protection contre l'inflation."
        },
        "gaz_naturel": {
            "valeur": gaz_data[-1]["valeur"] if gaz_data else 35.0,
            "date": gaz_data[-1]["date"] if gaz_data else "N/A",
            "unite": "EUR/MWh", "source": gaz_source,
            "nb_points": len(gaz_data),
            "historique": gaz_data,
            "variations": gaz_variations,
            "min_max": gaz_minmax,
            "note_lecture": "Le prix du gaz naturel (TTF europeen) impacte directement les factures de chauffage et d'electricite des menages, ainsi que les couts de production industrielle."
        },
        "ble": {
            "valeur": ble_data[-1]["valeur"] if ble_data else 550.0,
            "date": ble_data[-1]["date"] if ble_data else "N/A",
            "unite": "cents/boisseau", "source": ble_source,
            "nb_points": len(ble_data),
            "historique": ble_data,
            "variations": ble_variations,
            "min_max": ble_minmax,
            "note_lecture": "Le cours du ble est un indicateur avance des prix alimentaires. La France etant le premier producteur europeen, son evolution impacte a la fois les consommateurs et le secteur agricole."
        },
        "lme_cuivre": {
            "valeur": cuivre_data[-1]["valeur"] if cuivre_data else 420.0,
            "date": cuivre_data[-1]["date"] if cuivre_data else "N/A",
            "unite": "cts/lb", "source": cuivre_source,
            "nb_points": len(cuivre_data),
            "historique": cuivre_data,
            "variations": cuivre_variations,
            "min_max": cuivre_minmax,
            "note_lecture": "Le cuivre est le baromètre de l'activité industrielle mondiale ('Dr Copper'). Sa hausse signale une reprise économique, sa baisse anticipe un ralentissement. Utilisé massivement dans l'électrification et les énergies renouvelables."
        },
        "lme_aluminium": {
            "valeur": aluminium_data[-1]["valeur"] if aluminium_data else 100.0,
            "date": aluminium_data[-1]["date"] if aluminium_data else "N/A",
            "unite": "cts/lb", "source": aluminium_source,
            "nb_points": len(aluminium_data),
            "historique": aluminium_data,
            "variations": aluminium_variations,
            "min_max": aluminium_minmax,
            "note_lecture": "L'aluminium est très présent dans l'automobile, l'aéronautique et le packaging. Son prix dépend fortement du coût de l'énergie (électrolyse très énergivore), ce qui en fait un indicateur des coûts industriels."
        },
        "lme_zinc": {
            "valeur": zinc_data[-1]["valeur"] if zinc_data else 2700.0,
            "date": zinc_data[-1]["date"] if zinc_data else "N/A",
            "unite": "$/t", "source": zinc_source,
            "nb_points": len(zinc_data),
            "historique": zinc_data,
            "variations": zinc_variations,
            "min_max": zinc_minmax,
            "note_lecture": "Le zinc est principalement utilisé pour la galvanisation de l'acier (anticorrosion). Son prix reflète la demande de l'industrie de la construction et de l'automobile."
        },
        "lme_nickel": {
            "valeur": nickel_data[-1]["valeur"] if nickel_data else 16000.0,
            "date": nickel_data[-1]["date"] if nickel_data else "N/A",
            "unite": "$/t", "source": nickel_source,
            "nb_points": len(nickel_data),
            "historique": nickel_data,
            "variations": nickel_variations,
            "min_max": nickel_minmax,
            "note_lecture": "Le nickel est essentiel pour les aciers inoxydables et les batteries de véhicules électriques. Très sensible aux politiques d'exportation indonésiennes et à la demande de la transition énergétique."
        },
        "taux_immobilier": {
            "valeur": taux_immo_data[-1]["valeur"],
            "date": taux_immo_data[-1]["date"],
            "unite": "%", "source": taux_immo_source,
            "nb_points": len(taux_immo_data),
            "historique": taux_immo_data,
            "variations": taux_immo_variations,
            "min_max": taux_immo_minmax,
            "note_lecture": "Le taux moyen des credits immobiliers determine la capacite d'emprunt des menages. Une hausse de 1 point reduit le montant empruntable d'environ 10% a mensualite constante."
        },
        "correlations": correlations,
        "analyse": {
            "description": "Donnees quotidiennes sur 1 an avec moyennes mobiles 50j/200j, variations multi-horizons et correlation inflation. 12 indicateurs suivis (dont 4 métaux LME).",
            "periode": f"{oat_data[0]['date'] if oat_data else 'N/A'} - {oat_data[-1]['date'] if oat_data else 'N/A'}"
        },
        "sources": f"FRED ({oat_source}, Brent, EUR/USD, Or, Gaz), Yahoo Finance (CAC 40, matieres premieres, LME metaux), Banque de France (taux immo), INSEE (IPC)"
    }

def build_revue_presse():
    """
    Agrège les flux RSS des principales sources statistiques françaises et européennes.
    Retourne une liste d'articles triés par date (plus récent en premier).
    Nécessite un accès internet — en cas d'échec, retourne une liste vide avec message d'erreur.
    """

    # Sources vérifiées fonctionnelles — diagnostic GitHub Actions 17/03/2026
    SOURCES = [
        {
            "nom": "Le Monde Éco",
            "url": "https://www.lemonde.fr/economie/rss_full.xml",
            "couleur": "#374151",
            "emoji": "🌐",
            "tag": "Presse économique",
        },
        {
            "nom": "Le Monde Emploi",
            "url": "https://www.lemonde.fr/emploi/rss_full.xml",
            "couleur": "#1f2937",
            "emoji": "💼",
            "tag": "Emploi & travail",
        },
        {
            "nom": "Libération Éco",
            "url": "https://www.liberation.fr/arc/outboundfeeds/rss/category/economie/",
            "couleur": "#dc2626",
            "emoji": "📰",
            "tag": "Presse économique",
        },
        {
            "nom": "Le Figaro Éco",
            "url": "https://www.lefigaro.fr/rss/figaro_economie.xml",
            "couleur": "#92400e",
            "emoji": "📊",
            "tag": "Presse économique",
        },
        {
            "nom": "Terra Nova",
            "url": "https://tnova.fr/feed/",
            "couleur": "#0369a1",
            "emoji": "🔬",
            "tag": "Recherche politique",
        },
        {
            "nom": "Institut Montaigne",
            "url": "https://www.institutmontaigne.org/rss.xml",
            "couleur": "#1d4ed8",
            "emoji": "🏛️",
            "tag": "Recherche économique",
        },
        {
            "nom": "Euractiv FR",
            "url": "https://www.euractiv.fr/feed/",
            "couleur": "#0369a1",
            "emoji": "🇪🇺",
            "tag": "Europe & politique",
        },
    ]

    # Mots-clés pertinents pour les NAO / sujets syndicaux
    MOTS_CLES_NAO = [
        "salaire", "smic", "emploi", "chômage", "inflation", "pouvoir d'achat",
        "négociation", "convention", "branche", "rémunération", "cotisation",
        "retraite", "travail", "licenciement", "prime", "accord", "entreprise",
        "croissance", "pib", "conjoncture", "défaillance", "investissement",
        "productivité", "inégalité", "pauvreté", "logement", "loyer",
        # Nouvelles sources : assurance chômage, finances publiques, recherche
        "allocation", "indemnisation", "demandeur d'emploi", "formation",
        "apprentissage", "alternance", "recrutement", "tension", "vacants",
        "budget", "dette", "dépense publique", "fiscalité", "prélèvement",
        "réforme", "marché du travail", "compétitivité", "revenu", "panier",
    ]

    def nettoyer_html(texte):
        """Supprime les balises HTML et nettoie le texte."""
        if not texte:
            return ""
        texte = re.sub(r'<[^>]+>', ' ', texte)
        texte = re.sub(r'&amp;', '&', texte)
        texte = re.sub(r'&lt;', '<', texte)
        texte = re.sub(r'&gt;', '>', texte)
        texte = re.sub(r'&quot;', '"', texte)
        texte = re.sub(r'&nbsp;', ' ', texte)
        texte = re.sub(r'&#\d+;', ' ', texte)
        texte = re.sub(r'\s+', ' ', texte).strip()
        return texte[:300] if len(texte) > 300 else texte

    def parse_date(date_str):
        """Parse une date RSS en datetime, retourne None si échec."""
        if not date_str:
            return None
        formats = [
            "%a, %d %b %Y %H:%M:%S %z",
            "%a, %d %b %Y %H:%M:%S GMT",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except (ValueError, TypeError):
                continue
        return None

    def score_pertinence(titre, resume):
        """Calcule un score de pertinence NAO sur 10."""
        texte = (titre + " " + resume).lower()
        score = sum(1 for mot in MOTS_CLES_NAO if mot in texte)
        return min(score, 10)

    def fetch_rss(source):
        """Récupère et parse le flux RSS via regex — fiable sur CDATA, namespaces, tous formats."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
        }
        try:
            req = urllib.request.Request(source["url"], headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read()
                encoding = resp.headers.get_content_charset()
                if not encoding:
                    m = re.search(rb'encoding=["\']([^"\']+)["\']', raw[:200])
                    encoding = m.group(1).decode('ascii') if m else "utf-8"
                content = raw.decode(encoding, errors="replace")
        except Exception as e:
            print(f"  ⚠️  {source['nom']} : {str(e)[:80]}")
            return []

        def extract_tag(block, *tags):
            """Extrait le contenu d'un tag RSS/Atom, gère CDATA et namespaces."""
            for tag in tags:
                # Avec namespace optionnel : <tag>, <ns:tag>, <atom:tag>
                pattern = rf'<(?:[a-z]+:)?{tag}[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</(?:[a-z]+:)?{tag}>'
                m = re.search(pattern, block, re.DOTALL | re.IGNORECASE)
                if m:
                    return m.group(1).strip()
            return ""

        def extract_link(block):
            """Extrait le lien — gère <link>url</link> et <link href="url"/>."""
            # Atom : <link href="..." />
            m = re.search(r'<(?:[a-z]+:)?link[^>]+href=["\']([^"\']+)["\']', block, re.IGNORECASE)
            if m:
                return m.group(1).strip()
            # RSS : <link>url</link> ou <guid>url</guid>
            m = re.search(r'<(?:[a-z]+:)?link[^>]*>([^<]+)</(?:[a-z]+:)?link>', block, re.IGNORECASE)
            if m:
                return m.group(1).strip()
            m = re.search(r'<guid[^>]*>([^<]+)</guid>', block, re.IGNORECASE)
            if m:
                return m.group(1).strip()
            return ""

        # Découper en blocs <item> (RSS) ou <entry> (Atom)
        blocks = re.findall(r'<item[\s>].*?</item>', content, re.DOTALL | re.IGNORECASE)
        if not blocks:
            blocks = re.findall(r'<entry[\s>].*?</entry>', content, re.DOTALL | re.IGNORECASE)

        result = []
        for block in blocks[:20]:
            titre    = nettoyer_html(extract_tag(block, "title"))
            resume   = nettoyer_html(extract_tag(block, "description", "summary", "content"))
            lien     = extract_link(block)
            date_str = extract_tag(block, "pubDate", "published", "updated", "date")

            if not titre or len(titre) < 5:
                continue
            date_obj = parse_date(date_str)
            result.append({
                "source":     source["nom"],
                "couleur":    source["couleur"],
                "emoji":      source["emoji"],
                "tag":        source["tag"],
                "titre":      titre,
                "resume":     resume,
                "lien":       lien,
                "date_iso":   date_obj.isoformat() if date_obj else None,
                "date_fr":    date_obj.strftime("%d/%m/%Y") if date_obj else "Date inconnue",
                "pertinence": score_pertinence(titre, resume),
            })
        return result

    print()
    print("━" * 70)
    print("📰 REVUE DE PRESSE (flux RSS)")
    print("━" * 70)

    tous_articles = []
    for source in SOURCES:
        articles = fetch_rss(source)
        nb = len(articles)
        print(f"  {'✅' if nb > 0 else '⚠️ '} {source['nom']:25} → {nb} articles")
        tous_articles.extend(articles)

    # Trier par date décroissante (articles sans date à la fin)
    def sort_key(a):
        if a["date_iso"]:
            return a["date_iso"]
        return "0000-00-00"

    tous_articles.sort(key=sort_key, reverse=True)

    # Garder les 30 plus récents
    tous_articles = tous_articles[:30]

    # Séparer : à la une (pertinence >= 3) et autres
    a_la_une = [a for a in tous_articles if a["pertinence"] >= 3][:10]
    tous_   = tous_articles

    print(f"  📋 Total : {len(tous_articles)} articles | À la une NAO : {len(a_la_une)}")

    return {
        "derniere_maj": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "nb_sources":   len(SOURCES),
        "sources_noms": [s["nom"] for s in SOURCES],
        "a_la_une":     a_la_une,
        "tous":         tous_,
    }



# ============================================================================
# FONCTION À AJOUTER DANS fetch_data.py
# Remplace la section "conventions_collectives" statique dans main()
# ============================================================================


def build_conventions_collectives_enrichies(smic_net, smic_brut):
    """
    Construit la section conventions_collectives avec les 50 branches
    les plus importantes par effectif.
    
    Stratégie hybride :
    1. Tentative API data.travail.gouv.fr → effectifs + statut conformité en temps réel
    2. Fallback : base statique complète des 50 branches (vérifiée au 01/01/2026)
    
    Les grilles de salaires sont codées pour les 50 branches.
    Mise à jour nécessaire après chaque revalorisation du SMIC.
    """
    print("📋 Construction des conventions collectives enrichies...")

    # ─────────────────────────────────────────────────────────────
    # BASE COMPLÈTE : 50 branches avec grilles de salaires
    # Sources : Légifrance, DGT - Vérifiées au 01/01/2026
    # SMIC net référence : 1 443.11€ | SMIC brut : 1 823.03€
    # ─────────────────────────────────────────────────────────────
    BRANCHES_BASE = [
        {
            "idcc": "3248", "nom": "Métallurgie", "effectif": 1600000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "A1", "coefficient": 135, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "A2", "coefficient": 145, "minimum_mensuel": 1535, "minimum_annuel": 18420},
                {"niveau": "B1", "coefficient": 155, "minimum_mensuel": 1595, "minimum_annuel": 19140},
                {"niveau": "B2", "coefficient": 170, "minimum_mensuel": 1665, "minimum_annuel": 19980},
                {"niveau": "C1", "coefficient": 190, "minimum_mensuel": 1765, "minimum_annuel": 21180},
                {"niveau": "C2", "coefficient": 215, "minimum_mensuel": 1920, "minimum_annuel": 23040},
                {"niveau": "D1", "coefficient": 240, "minimum_mensuel": 2090, "minimum_annuel": 25080},
                {"niveau": "D2", "coefficient": 275, "minimum_mensuel": 2340, "minimum_annuel": 28080},
                {"niveau": "E1", "coefficient": 310, "minimum_mensuel": 2720, "minimum_annuel": 32640},
                {"niveau": "E2", "coefficient": 365, "minimum_mensuel": 3250, "minimum_annuel": 39000},
            ]
        },
        {
            "idcc": "1518", "nom": "Aide à domicile (employeurs particuliers)", "effectif": 1200000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau A", "coefficient": 1, "minimum_mensuel": 1470, "minimum_annuel": 17640},
                {"niveau": "Niveau B", "coefficient": 2, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "Niveau C", "coefficient": 3, "minimum_mensuel": 1520, "minimum_annuel": 18240},
                {"niveau": "Niveau D - Auxiliaire parentale", "coefficient": 4, "minimum_mensuel": 1580, "minimum_annuel": 18960},
                {"niveau": "Niveau E - Garde-malade", "coefficient": 5, "minimum_mensuel": 1680, "minimum_annuel": 20160},
            ]
        },
        {
            "idcc": "1979", "nom": "Hôtels, cafés, restaurants (HCR)", "effectif": 1200000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau I - Échelon 1", "coefficient": 100, "minimum_mensuel": 1461, "minimum_annuel": 17532},
                {"niveau": "Niveau I - Échelon 2", "coefficient": 105, "minimum_mensuel": 1478, "minimum_annuel": 17736},
                {"niveau": "Niveau II - Échelon 1", "coefficient": 110, "minimum_mensuel": 1495, "minimum_annuel": 17940},
                {"niveau": "Niveau II - Échelon 2", "coefficient": 115, "minimum_mensuel": 1525, "minimum_annuel": 18300},
                {"niveau": "Niveau III - Échelon 1", "coefficient": 120, "minimum_mensuel": 1560, "minimum_annuel": 18720},
                {"niveau": "Niveau III - Échelon 2", "coefficient": 130, "minimum_mensuel": 1620, "minimum_annuel": 19440},
                {"niveau": "Niveau IV - Échelon 1", "coefficient": 145, "minimum_mensuel": 1730, "minimum_annuel": 20760},
                {"niveau": "Niveau IV - Échelon 2", "coefficient": 160, "minimum_mensuel": 1870, "minimum_annuel": 22440},
                {"niveau": "Niveau V", "coefficient": 185, "minimum_mensuel": 2150, "minimum_annuel": 25800},
            ]
        },
        {
            "idcc": "1486", "nom": "Bureaux d'études techniques (SYNTEC)", "effectif": 850000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Employé - Position 1.1", "coefficient": 240, "minimum_mensuel": 1856, "minimum_annuel": 22272},
                {"niveau": "Employé - Position 1.2", "coefficient": 270, "minimum_mensuel": 2087, "minimum_annuel": 25044},
                {"niveau": "Technicien - Position 2.1", "coefficient": 310, "minimum_mensuel": 2396, "minimum_annuel": 28752},
                {"niveau": "Technicien - Position 2.2", "coefficient": 355, "minimum_mensuel": 2745, "minimum_annuel": 32940},
                {"niveau": "Technicien - Position 2.3", "coefficient": 400, "minimum_mensuel": 3093, "minimum_annuel": 37116},
                {"niveau": "Cadre - Position 3.1", "coefficient": 450, "minimum_mensuel": 3479, "minimum_annuel": 41748},
                {"niveau": "Cadre - Position 3.2", "coefficient": 600, "minimum_mensuel": 4638, "minimum_annuel": 55656},
                {"niveau": "Cadre - Position 3.3", "coefficient": 700, "minimum_mensuel": 5413, "minimum_annuel": 64956},
            ]
        },
        {
            "idcc": "2402", "nom": "Travail temporaire (intérim)", "effectif": 700000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau I - Échelon 1", "coefficient": 100, "minimum_mensuel": 1467, "minimum_annuel": 17604},
                {"niveau": "Niveau I - Échelon 2", "coefficient": 105, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "Niveau II - Échelon 1", "coefficient": 115, "minimum_mensuel": 1530, "minimum_annuel": 18360},
                {"niveau": "Niveau II - Échelon 2", "coefficient": 125, "minimum_mensuel": 1580, "minimum_annuel": 18960},
                {"niveau": "Niveau III", "coefficient": 145, "minimum_mensuel": 1700, "minimum_annuel": 20400},
                {"niveau": "Niveau IV", "coefficient": 175, "minimum_mensuel": 1950, "minimum_annuel": 23400},
                {"niveau": "Niveau V", "coefficient": 220, "minimum_mensuel": 2400, "minimum_annuel": 28800},
            ]
        },
        {
            "idcc": "1090", "nom": "Commerce à prédominance alimentaire (GMS)", "effectif": 760000, "statut": "conforme",
            "derniere_revalorisation": "Juin 2025",
            "grille": [
                {"niveau": "Niveau 1", "coefficient": 100, "minimum_mensuel": 1487, "minimum_annuel": 17844},
                {"niveau": "Niveau 2A", "coefficient": 106, "minimum_mensuel": 1510, "minimum_annuel": 18120},
                {"niveau": "Niveau 2B", "coefficient": 112, "minimum_mensuel": 1535, "minimum_annuel": 18420},
                {"niveau": "Niveau 3A", "coefficient": 120, "minimum_mensuel": 1580, "minimum_annuel": 18960},
                {"niveau": "Niveau 3B", "coefficient": 130, "minimum_mensuel": 1645, "minimum_annuel": 19740},
                {"niveau": "Niveau 4", "coefficient": 150, "minimum_mensuel": 1790, "minimum_annuel": 21480},
                {"niveau": "Niveau 5", "coefficient": 175, "minimum_mensuel": 2020, "minimum_annuel": 24240},
                {"niveau": "Niveau 6 (cadre)", "coefficient": 210, "minimum_mensuel": 2380, "minimum_annuel": 28560},
            ]
        },
        {
            "idcc": "3043", "nom": "Propreté et services associés", "effectif": 550000, "statut": "non_conforme",
            "derniere_revalorisation": "Novembre 2025",
            "grille": [
                {"niveau": "AS1", "coefficient": 100, "minimum_mensuel": 1427, "minimum_annuel": 17124},
                {"niveau": "AS2", "coefficient": 104, "minimum_mensuel": 1436, "minimum_annuel": 17232},
                {"niveau": "AS3", "coefficient": 108, "minimum_mensuel": 1450, "minimum_annuel": 17400},
                {"niveau": "AQS1", "coefficient": 115, "minimum_mensuel": 1471, "minimum_annuel": 17652},
                {"niveau": "AQS2", "coefficient": 120, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "AQS3", "coefficient": 130, "minimum_mensuel": 1540, "minimum_annuel": 18480},
                {"niveau": "Chef d'équipe", "coefficient": 150, "minimum_mensuel": 1670, "minimum_annuel": 20040},
                {"niveau": "Agent de maîtrise", "coefficient": 185, "minimum_mensuel": 1960, "minimum_annuel": 23520},
            ]
        },
        {
            "idcc": "1459", "nom": "Nettoyage industriel", "effectif": 420000, "statut": "non_conforme",
            "derniere_revalorisation": "Novembre 2025",
            "grille": [
                {"niveau": "AS - Échelon 1", "coefficient": 100, "minimum_mensuel": 1427, "minimum_annuel": 17124},
                {"niveau": "AS - Échelon 2", "coefficient": 104, "minimum_mensuel": 1438, "minimum_annuel": 17256},
                {"niveau": "AQS - Échelon 1", "coefficient": 110, "minimum_mensuel": 1456, "minimum_annuel": 17472},
                {"niveau": "AQS - Échelon 2", "coefficient": 118, "minimum_mensuel": 1478, "minimum_annuel": 17736},
                {"niveau": "Chef d'équipe", "coefficient": 140, "minimum_mensuel": 1585, "minimum_annuel": 19020},
                {"niveau": "Agent de maîtrise", "coefficient": 175, "minimum_mensuel": 1860, "minimum_annuel": 22320},
            ]
        },
        {
            "idcc": "1996", "nom": "Transports routiers et auxiliaires", "effectif": 430000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Groupe 2 (conducteurs)", "coefficient": 138, "minimum_mensuel": 1502, "minimum_annuel": 18024},
                {"niveau": "Groupe 3 (longue distance)", "coefficient": 150, "minimum_mensuel": 1565, "minimum_annuel": 18780},
                {"niveau": "Groupe 4", "coefficient": 162, "minimum_mensuel": 1635, "minimum_annuel": 19620},
                {"niveau": "Groupe 5", "coefficient": 175, "minimum_mensuel": 1720, "minimum_annuel": 20640},
                {"niveau": "Groupe 6", "coefficient": 195, "minimum_mensuel": 1850, "minimum_annuel": 22200},
                {"niveau": "Groupe 7", "coefficient": 220, "minimum_mensuel": 2040, "minimum_annuel": 24480},
                {"niveau": "Groupe 8", "coefficient": 260, "minimum_mensuel": 2360, "minimum_annuel": 28320},
                {"niveau": "Groupe 9 (cadres)", "coefficient": 320, "minimum_mensuel": 2870, "minimum_annuel": 34440},
            ]
        },
        {
            "idcc": "2941", "nom": "Aide, soins et services à domicile (BAD)", "effectif": 380000, "statut": "conforme",
            "derniere_revalorisation": "Octobre 2025",
            "grille": [
                {"niveau": "Catégorie A - Degré 1", "coefficient": 257, "minimum_mensuel": 1480, "minimum_annuel": 17760},
                {"niveau": "Catégorie A - Degré 2", "coefficient": 262, "minimum_mensuel": 1510, "minimum_annuel": 18120},
                {"niveau": "Catégorie B - Degré 1", "coefficient": 275, "minimum_mensuel": 1560, "minimum_annuel": 18720},
                {"niveau": "Catégorie B - Degré 2", "coefficient": 285, "minimum_mensuel": 1620, "minimum_annuel": 19440},
                {"niveau": "Catégorie C - Degré 1", "coefficient": 315, "minimum_mensuel": 1790, "minimum_annuel": 21480},
                {"niveau": "Catégorie C - Degré 2", "coefficient": 340, "minimum_mensuel": 1930, "minimum_annuel": 23160},
                {"niveau": "Catégorie D", "coefficient": 395, "minimum_mensuel": 2240, "minimum_annuel": 26880},
                {"niveau": "Catégorie E", "coefficient": 466, "minimum_mensuel": 2640, "minimum_annuel": 31680},
            ]
        },
        {
            "idcc": "3239", "nom": "Banque", "effectif": 390000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau A - Échelon 1", "coefficient": 230, "minimum_mensuel": 1800, "minimum_annuel": 21600},
                {"niveau": "Niveau A - Échelon 2", "coefficient": 255, "minimum_mensuel": 1970, "minimum_annuel": 23640},
                {"niveau": "Niveau B", "coefficient": 290, "minimum_mensuel": 2230, "minimum_annuel": 26760},
                {"niveau": "Niveau C", "coefficient": 340, "minimum_mensuel": 2600, "minimum_annuel": 31200},
                {"niveau": "Niveau D", "coefficient": 405, "minimum_mensuel": 3070, "minimum_annuel": 36840},
                {"niveau": "Niveau E", "coefficient": 500, "minimum_mensuel": 3790, "minimum_annuel": 45480},
                {"niveau": "Niveau F (cadres supérieurs)", "coefficient": 620, "minimum_mensuel": 4690, "minimum_annuel": 56280},
            ]
        },
        {
            "idcc": "2120", "nom": "Commerce non alimentaire (détail et gros)", "effectif": 310000, "statut": "conforme",
            "derniere_revalorisation": "Juillet 2025",
            "grille": [
                {"niveau": "Niveau 1", "coefficient": 100, "minimum_mensuel": 1475, "minimum_annuel": 17700},
                {"niveau": "Niveau 2", "coefficient": 107, "minimum_mensuel": 1505, "minimum_annuel": 18060},
                {"niveau": "Niveau 3", "coefficient": 117, "minimum_mensuel": 1555, "minimum_annuel": 18660},
                {"niveau": "Niveau 4", "coefficient": 130, "minimum_mensuel": 1640, "minimum_annuel": 19680},
                {"niveau": "Niveau 5", "coefficient": 150, "minimum_mensuel": 1790, "minimum_annuel": 21480},
                {"niveau": "Niveau 6 (cadre)", "coefficient": 185, "minimum_mensuel": 2140, "minimum_annuel": 25680},
            ]
        },
        {
            "idcc": "1597", "nom": "Bâtiment (ouvriers)", "effectif": 520000, "statut": "conforme",
            "derniere_revalorisation": "Avril 2025",
            "grille": [
                {"niveau": "N1 - P1", "coefficient": 150, "minimum_mensuel": 1535, "minimum_annuel": 18420},
                {"niveau": "N1 - P2", "coefficient": 170, "minimum_mensuel": 1595, "minimum_annuel": 19140},
                {"niveau": "N1 - P3", "coefficient": 185, "minimum_mensuel": 1655, "minimum_annuel": 19860},
                {"niveau": "N2 - P1", "coefficient": 200, "minimum_mensuel": 1740, "minimum_annuel": 20880},
                {"niveau": "N2 - P2", "coefficient": 210, "minimum_mensuel": 1790, "minimum_annuel": 21480},
                {"niveau": "N3 - P1", "coefficient": 230, "minimum_mensuel": 1905, "minimum_annuel": 22860},
                {"niveau": "N3 - P2", "coefficient": 250, "minimum_mensuel": 2050, "minimum_annuel": 24600},
                {"niveau": "N4 (maître ouvrier)", "coefficient": 270, "minimum_mensuel": 2240, "minimum_annuel": 26880},
            ]
        },
        {
            "idcc": "1605", "nom": "Bâtiment (ETAM)", "effectif": 280000, "statut": "conforme",
            "derniere_revalorisation": "Avril 2025",
            "grille": [
                {"niveau": "E1", "coefficient": 155, "minimum_mensuel": 1535, "minimum_annuel": 18420},
                {"niveau": "E2", "coefficient": 165, "minimum_mensuel": 1590, "minimum_annuel": 19080},
                {"niveau": "E3", "coefficient": 180, "minimum_mensuel": 1660, "minimum_annuel": 19920},
                {"niveau": "T1", "coefficient": 200, "minimum_mensuel": 1760, "minimum_annuel": 21120},
                {"niveau": "T2", "coefficient": 220, "minimum_mensuel": 1880, "minimum_annuel": 22560},
                {"niveau": "T3", "coefficient": 250, "minimum_mensuel": 2060, "minimum_annuel": 24720},
                {"niveau": "AM1", "coefficient": 280, "minimum_mensuel": 2280, "minimum_annuel": 27360},
                {"niveau": "AM2", "coefficient": 320, "minimum_mensuel": 2570, "minimum_annuel": 30840},
            ]
        },
        {
            "idcc": "2216", "nom": "Commerce de détail alimentaire (spécialisé)", "effectif": 450000, "statut": "non_conforme",
            "derniere_revalorisation": "Octobre 2025",
            "grille": [
                {"niveau": "Niveau 1A", "coefficient": 100, "minimum_mensuel": 1420, "minimum_annuel": 17040},
                {"niveau": "Niveau 1B", "coefficient": 104, "minimum_mensuel": 1435, "minimum_annuel": 17220},
                {"niveau": "Niveau 2A", "coefficient": 110, "minimum_mensuel": 1460, "minimum_annuel": 17520},
                {"niveau": "Niveau 2B", "coefficient": 118, "minimum_mensuel": 1495, "minimum_annuel": 17940},
                {"niveau": "Niveau 3A", "coefficient": 130, "minimum_mensuel": 1560, "minimum_annuel": 18720},
                {"niveau": "Niveau 3B", "coefficient": 145, "minimum_mensuel": 1680, "minimum_annuel": 20160},
                {"niveau": "Niveau 4 (encadrement)", "coefficient": 170, "minimum_mensuel": 1890, "minimum_annuel": 22680},
            ]
        },
        {
            "idcc": "0803", "nom": "Restauration rapide", "effectif": 220000, "statut": "non_conforme",
            "derniere_revalorisation": "Septembre 2025",
            "grille": [
                {"niveau": "Niveau I - Échelon 1", "coefficient": 100, "minimum_mensuel": 1435, "minimum_annuel": 17220},
                {"niveau": "Niveau I - Échelon 2", "coefficient": 103, "minimum_mensuel": 1450, "minimum_annuel": 17400},
                {"niveau": "Niveau II - Échelon 1", "coefficient": 107, "minimum_mensuel": 1465, "minimum_annuel": 17580},
                {"niveau": "Niveau II - Échelon 2", "coefficient": 112, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "Niveau III", "coefficient": 125, "minimum_mensuel": 1570, "minimum_annuel": 18840},
                {"niveau": "Niveau IV (encadrement)", "coefficient": 145, "minimum_mensuel": 1720, "minimum_annuel": 20640},
                {"niveau": "Niveau V (direction)", "coefficient": 175, "minimum_mensuel": 2020, "minimum_annuel": 24240},
            ]
        },
        {
            "idcc": "2098", "nom": "Hospitalisation privée (FHP)", "effectif": 250000, "statut": "conforme",
            "derniere_revalorisation": "Juillet 2025",
            "grille": [
                {"niveau": "Filière soins - Niveau 1", "coefficient": 215, "minimum_mensuel": 1520, "minimum_annuel": 18240},
                {"niveau": "Filière soins - Niveau 2", "coefficient": 235, "minimum_mensuel": 1640, "minimum_annuel": 19680},
                {"niveau": "Filière soins - Niveau 3 (IDE)", "coefficient": 265, "minimum_mensuel": 1830, "minimum_annuel": 21960},
                {"niveau": "Filière soins - Niveau 4", "coefficient": 305, "minimum_mensuel": 2100, "minimum_annuel": 25200},
                {"niveau": "Filière admin - Niveau 1", "coefficient": 210, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "Filière admin - Niveau 3", "coefficient": 255, "minimum_mensuel": 1750, "minimum_annuel": 21000},
                {"niveau": "Cadre - Niveau 1", "coefficient": 420, "minimum_mensuel": 2890, "minimum_annuel": 34680},
            ]
        },
        {
            "idcc": "1501", "nom": "Travaux publics (ouvriers)", "effectif": 180000, "statut": "conforme",
            "derniere_revalorisation": "Avril 2025",
            "grille": [
                {"niveau": "Niveau 1 - Position 1", "coefficient": 100, "minimum_mensuel": 1540, "minimum_annuel": 18480},
                {"niveau": "Niveau 1 - Position 2", "coefficient": 107, "minimum_mensuel": 1580, "minimum_annuel": 18960},
                {"niveau": "Niveau 2 - Position 1", "coefficient": 115, "minimum_mensuel": 1640, "minimum_annuel": 19680},
                {"niveau": "Niveau 2 - Position 2", "coefficient": 125, "minimum_mensuel": 1720, "minimum_annuel": 20640},
                {"niveau": "Niveau 3 - Position 1", "coefficient": 138, "minimum_mensuel": 1840, "minimum_annuel": 22080},
                {"niveau": "Niveau 3 - Position 2", "coefficient": 155, "minimum_mensuel": 2010, "minimum_annuel": 24120},
                {"niveau": "Niveau 4 (chef d'équipe)", "coefficient": 180, "minimum_mensuel": 2260, "minimum_annuel": 27120},
            ]
        },
        {
            "idcc": "1404", "nom": "Animation (associations)", "effectif": 180000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Groupe A - Animateur", "coefficient": 265, "minimum_mensuel": 1479, "minimum_annuel": 17748},
                {"niveau": "Groupe B - Animateur technique", "coefficient": 300, "minimum_mensuel": 1535, "minimum_annuel": 18420},
                {"niveau": "Groupe C - Coordinateur", "coefficient": 360, "minimum_mensuel": 1750, "minimum_annuel": 21000},
                {"niveau": "Groupe D - Directeur adjoint", "coefficient": 440, "minimum_mensuel": 2090, "minimum_annuel": 25080},
                {"niveau": "Groupe E - Directeur", "coefficient": 520, "minimum_mensuel": 2460, "minimum_annuel": 29520},
                {"niveau": "Groupe F - Directeur régional", "coefficient": 650, "minimum_mensuel": 3060, "minimum_annuel": 36720},
            ]
        },
        {
            "idcc": "1351", "nom": "Prévention et sécurité privée", "effectif": 180000, "statut": "non_conforme",
            "derniere_revalorisation": "Septembre 2025",
            "grille": [
                {"niveau": "Niveau I - Agent", "coefficient": 100, "minimum_mensuel": 1425, "minimum_annuel": 17100},
                {"niveau": "Niveau II - Agent qualifié", "coefficient": 108, "minimum_mensuel": 1450, "minimum_annuel": 17400},
                {"niveau": "Niveau III - Agent chef", "coefficient": 118, "minimum_mensuel": 1478, "minimum_annuel": 17736},
                {"niveau": "Niveau IV - Chef de poste", "coefficient": 130, "minimum_mensuel": 1520, "minimum_annuel": 18240},
                {"niveau": "Niveau V - Chef d'équipe", "coefficient": 150, "minimum_mensuel": 1650, "minimum_annuel": 19800},
                {"niveau": "Niveau VI - Agent de maîtrise", "coefficient": 185, "minimum_mensuel": 1940, "minimum_annuel": 23280},
            ]
        },
        {
            "idcc": "2569", "nom": "Services de l'automobile (garages)", "effectif": 165000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau I - Échelon A", "coefficient": 100, "minimum_mensuel": 1477, "minimum_annuel": 17724},
                {"niveau": "Niveau I - Échelon B", "coefficient": 105, "minimum_mensuel": 1500, "minimum_annuel": 18000},
                {"niveau": "Niveau II - Échelon A", "coefficient": 112, "minimum_mensuel": 1540, "minimum_annuel": 18480},
                {"niveau": "Niveau II - Échelon B", "coefficient": 122, "minimum_mensuel": 1600, "minimum_annuel": 19200},
                {"niveau": "Niveau III - Échelon A", "coefficient": 137, "minimum_mensuel": 1700, "minimum_annuel": 20400},
                {"niveau": "Niveau III - Échelon B", "coefficient": 155, "minimum_mensuel": 1850, "minimum_annuel": 22200},
                {"niveau": "Niveau IV (TAM)", "coefficient": 190, "minimum_mensuel": 2150, "minimum_annuel": 25800},
                {"niveau": "Niveau V (cadres)", "coefficient": 250, "minimum_mensuel": 2780, "minimum_annuel": 33360},
            ]
        },
        {
            "idcc": "0736", "nom": "Hospitalisation privée à but non lucratif (FEHAP)", "effectif": 160000, "statut": "conforme",
            "derniere_revalorisation": "Juin 2025",
            "grille": [
                {"niveau": "Groupe 3 (aide-soignant)", "coefficient": 212, "minimum_mensuel": 1480, "minimum_annuel": 17760},
                {"niveau": "Groupe 4", "coefficient": 228, "minimum_mensuel": 1570, "minimum_annuel": 18840},
                {"niveau": "Groupe 5", "coefficient": 248, "minimum_mensuel": 1690, "minimum_annuel": 20280},
                {"niveau": "Groupe 6 (infirmier)", "coefficient": 280, "minimum_mensuel": 1900, "minimum_annuel": 22800},
                {"niveau": "Groupe 7 (cadre santé)", "coefficient": 320, "minimum_mensuel": 2150, "minimum_annuel": 25800},
                {"niveau": "Groupe 8 (cadre supérieur)", "coefficient": 390, "minimum_mensuel": 2620, "minimum_annuel": 31440},
                {"niveau": "Groupe 9 (directeur)", "coefficient": 500, "minimum_mensuel": 3360, "minimum_annuel": 40320},
            ]
        },
        {
            "idcc": "2596", "nom": "Immobilier (agents, syndics, administrateurs)", "effectif": 150000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Employé - Niveau 1", "coefficient": 100, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "Employé - Niveau 2", "coefficient": 110, "minimum_mensuel": 1560, "minimum_annuel": 18720},
                {"niveau": "Agent qualifié - Niveau 3", "coefficient": 125, "minimum_mensuel": 1680, "minimum_annuel": 20160},
                {"niveau": "TAM - Niveau 4", "coefficient": 145, "minimum_mensuel": 1870, "minimum_annuel": 22440},
                {"niveau": "Cadre - Niveau 5", "coefficient": 175, "minimum_mensuel": 2240, "minimum_annuel": 26880},
                {"niveau": "Cadre confirmé - Niveau 6", "coefficient": 220, "minimum_mensuel": 2790, "minimum_annuel": 33480},
            ]
        },
        {
            "idcc": "2150", "nom": "Industrie chimique", "effectif": 175000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "TAM - Groupe 4", "coefficient": 100, "minimum_mensuel": 1497, "minimum_annuel": 17964},
                {"niveau": "TAM - Groupe 5", "coefficient": 113, "minimum_mensuel": 1610, "minimum_annuel": 19320},
                {"niveau": "TAM - Groupe 6", "coefficient": 128, "minimum_mensuel": 1760, "minimum_annuel": 21120},
                {"niveau": "TAM - Groupe 7", "coefficient": 148, "minimum_mensuel": 1980, "minimum_annuel": 23760},
                {"niveau": "Cadre - Groupe 8", "coefficient": 175, "minimum_mensuel": 2310, "minimum_annuel": 27720},
                {"niveau": "Cadre - Groupe 9", "coefficient": 215, "minimum_mensuel": 2820, "minimum_annuel": 33840},
                {"niveau": "Cadre - Groupe 10", "coefficient": 270, "minimum_mensuel": 3540, "minimum_annuel": 42480},
            ]
        },
        {
            "idcc": "0787", "nom": "Boulangerie-pâtisserie artisanale", "effectif": 145000, "statut": "non_conforme",
            "derniere_revalorisation": "Octobre 2025",
            "grille": [
                {"niveau": "Ouvrier - Échelon 1", "coefficient": 100, "minimum_mensuel": 1430, "minimum_annuel": 17160},
                {"niveau": "Ouvrier - Échelon 2", "coefficient": 104, "minimum_mensuel": 1445, "minimum_annuel": 17340},
                {"niveau": "Ouvrier qualifié - Échelon 1", "coefficient": 109, "minimum_mensuel": 1462, "minimum_annuel": 17544},
                {"niveau": "Ouvrier qualifié - Échelon 2", "coefficient": 115, "minimum_mensuel": 1485, "minimum_annuel": 17820},
                {"niveau": "Ouvrier hautement qualifié", "coefficient": 126, "minimum_mensuel": 1535, "minimum_annuel": 18420},
                {"niveau": "Chef d'équipe confirmé", "coefficient": 145, "minimum_mensuel": 1690, "minimum_annuel": 20280},
            ]
        },
        {
            "idcc": "3131", "nom": "Télécommunications", "effectif": 130000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau 1 - Classe 1", "coefficient": 100, "minimum_mensuel": 1510, "minimum_annuel": 18120},
                {"niveau": "Niveau 2 - Classe 1", "coefficient": 115, "minimum_mensuel": 1640, "minimum_annuel": 19680},
                {"niveau": "Niveau 2 - Classe 2", "coefficient": 130, "minimum_mensuel": 1790, "minimum_annuel": 21480},
                {"niveau": "Niveau 3 - Classe 1", "coefficient": 155, "minimum_mensuel": 2040, "minimum_annuel": 24480},
                {"niveau": "Niveau 3 - Classe 2", "coefficient": 185, "minimum_mensuel": 2390, "minimum_annuel": 28680},
                {"niveau": "Cadre - Niveau 4", "coefficient": 230, "minimum_mensuel": 2940, "minimum_annuel": 35280},
                {"niveau": "Cadre supérieur - Niveau 5", "coefficient": 310, "minimum_mensuel": 3950, "minimum_annuel": 47400},
            ]
        },
        {
            "idcc": "1285", "nom": "Commerce de détail habillement et textile", "effectif": 120000, "statut": "non_conforme",
            "derniere_revalorisation": "Septembre 2025",
            "grille": [
                {"niveau": "Niveau 1", "coefficient": 100, "minimum_mensuel": 1425, "minimum_annuel": 17100},
                {"niveau": "Niveau 2", "coefficient": 106, "minimum_mensuel": 1445, "minimum_annuel": 17340},
                {"niveau": "Niveau 3", "coefficient": 113, "minimum_mensuel": 1468, "minimum_annuel": 17616},
                {"niveau": "Niveau 4", "coefficient": 123, "minimum_mensuel": 1500, "minimum_annuel": 18000},
                {"niveau": "Niveau 5 (adjoint)", "coefficient": 140, "minimum_mensuel": 1600, "minimum_annuel": 19200},
                {"niveau": "Niveau 6 (responsable)", "coefficient": 165, "minimum_mensuel": 1800, "minimum_annuel": 21600},
            ]
        },
        {
            "idcc": "0650", "nom": "Pharmacie d'officine", "effectif": 105000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau I", "coefficient": 100, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "Niveau II", "coefficient": 112, "minimum_mensuel": 1600, "minimum_annuel": 19200},
                {"niveau": "Niveau III", "coefficient": 128, "minimum_mensuel": 1740, "minimum_annuel": 20880},
                {"niveau": "Niveau IV", "coefficient": 150, "minimum_mensuel": 1950, "minimum_annuel": 23400},
                {"niveau": "Niveau V (préparateur)", "coefficient": 180, "minimum_mensuel": 2240, "minimum_annuel": 26880},
                {"niveau": "Niveau VI (pharmacien adjoint)", "coefficient": 250, "minimum_mensuel": 3020, "minimum_annuel": 36240},
            ]
        },
        {
            "idcc": "0095", "nom": "Commerce de gros (alimentaire, boissons)", "effectif": 95000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Employé - Niveau 1", "coefficient": 100, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "Employé qualifié - Niveau 2", "coefficient": 113, "minimum_mensuel": 1580, "minimum_annuel": 18960},
                {"niveau": "Technicien - Niveau 3", "coefficient": 130, "minimum_mensuel": 1720, "minimum_annuel": 20640},
                {"niveau": "TAM - Niveau 4", "coefficient": 155, "minimum_mensuel": 1960, "minimum_annuel": 23520},
                {"niveau": "Cadre - Niveau 5", "coefficient": 195, "minimum_mensuel": 2450, "minimum_annuel": 29400},
            ]
        },
        {
            "idcc": "2609", "nom": "Coiffure et esthétique", "effectif": 95000, "statut": "non_conforme",
            "derniere_revalorisation": "Novembre 2025",
            "grille": [
                {"niveau": "Employé qualifié - Échelon 1", "coefficient": 100, "minimum_mensuel": 1430, "minimum_annuel": 17160},
                {"niveau": "Employé qualifié - Échelon 2", "coefficient": 105, "minimum_mensuel": 1448, "minimum_annuel": 17376},
                {"niveau": "Collaborateur technique", "coefficient": 115, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "Responsable technique", "coefficient": 135, "minimum_mensuel": 1590, "minimum_annuel": 19080},
                {"niveau": "Directeur technique", "coefficient": 160, "minimum_mensuel": 1870, "minimum_annuel": 22440},
            ]
        },
        {
            "idcc": "1483", "nom": "Mutualité", "effectif": 90000, "statut": "conforme",
            "derniere_revalorisation": "Juillet 2025",
            "grille": [
                {"niveau": "Classe 1", "coefficient": 100, "minimum_mensuel": 1505, "minimum_annuel": 18060},
                {"niveau": "Classe 2", "coefficient": 115, "minimum_mensuel": 1640, "minimum_annuel": 19680},
                {"niveau": "Classe 3", "coefficient": 135, "minimum_mensuel": 1850, "minimum_annuel": 22200},
                {"niveau": "Classe 4", "coefficient": 160, "minimum_mensuel": 2120, "minimum_annuel": 25440},
                {"niveau": "Classe 5", "coefficient": 200, "minimum_mensuel": 2590, "minimum_annuel": 31080},
                {"niveau": "Classe 6 (cadres supérieurs)", "coefficient": 260, "minimum_mensuel": 3310, "minimum_annuel": 39720},
            ]
        },
        {
            "idcc": "2511", "nom": "Sport (associations et clubs)", "effectif": 70000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Groupe 1 - Degré 1", "coefficient": 100, "minimum_mensuel": 1480, "minimum_annuel": 17760},
                {"niveau": "Groupe 2 - Degré 1", "coefficient": 115, "minimum_mensuel": 1580, "minimum_annuel": 18960},
                {"niveau": "Groupe 3 - Éducateur", "coefficient": 135, "minimum_mensuel": 1720, "minimum_annuel": 20640},
                {"niveau": "Groupe 4 - Éducateur spécialisé", "coefficient": 160, "minimum_mensuel": 1990, "minimum_annuel": 23880},
                {"niveau": "Groupe 5 - Cadre technique", "coefficient": 200, "minimum_mensuel": 2450, "minimum_annuel": 29400},
                {"niveau": "Groupe 6 - Directeur", "coefficient": 260, "minimum_mensuel": 3150, "minimum_annuel": 37800},
            ]
        },
        {
            "idcc": "2264", "nom": "Distribution directe", "effectif": 75000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau 1 - Échelon A", "coefficient": 100, "minimum_mensuel": 1472, "minimum_annuel": 17664},
                {"niveau": "Niveau 1 - Échelon B", "coefficient": 106, "minimum_mensuel": 1500, "minimum_annuel": 18000},
                {"niveau": "Niveau 2", "coefficient": 115, "minimum_mensuel": 1545, "minimum_annuel": 18540},
                {"niveau": "Niveau 3 (encadrement)", "coefficient": 135, "minimum_mensuel": 1680, "minimum_annuel": 20160},
                {"niveau": "Niveau 4 (cadre)", "coefficient": 170, "minimum_mensuel": 2040, "minimum_annuel": 24480},
            ]
        },
        {
            "idcc": "1424", "nom": "Cabinets médicaux", "effectif": 65000, "statut": "non_conforme",
            "derniere_revalorisation": "Octobre 2025",
            "grille": [
                {"niveau": "Employé - Échelon 1", "coefficient": 100, "minimum_mensuel": 1425, "minimum_annuel": 17100},
                {"niveau": "Employé - Échelon 2", "coefficient": 104, "minimum_mensuel": 1440, "minimum_annuel": 17280},
                {"niveau": "Employé qualifié - Échelon 3", "coefficient": 110, "minimum_mensuel": 1462, "minimum_annuel": 17544},
                {"niveau": "Secrétaire médicale qualifiée", "coefficient": 120, "minimum_mensuel": 1495, "minimum_annuel": 17940},
                {"niveau": "Assistante médicale", "coefficient": 135, "minimum_mensuel": 1590, "minimum_annuel": 19080},
                {"niveau": "Responsable cabinet", "coefficient": 165, "minimum_mensuel": 1870, "minimum_annuel": 22440},
            ]
        },
        {
            "idcc": "0292", "nom": "Plasturgie", "effectif": 115000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Ouvrier - Niveau 1", "coefficient": 120, "minimum_mensuel": 1485, "minimum_annuel": 17820},
                {"niveau": "Ouvrier qualifié - Niveau 2", "coefficient": 132, "minimum_mensuel": 1555, "minimum_annuel": 18660},
                {"niveau": "Ouvrier qualifié - Niveau 3", "coefficient": 147, "minimum_mensuel": 1650, "minimum_annuel": 19800},
                {"niveau": "TAM - Niveau 4", "coefficient": 166, "minimum_mensuel": 1790, "minimum_annuel": 21480},
                {"niveau": "TAM - Niveau 5", "coefficient": 192, "minimum_mensuel": 2020, "minimum_annuel": 24240},
                {"niveau": "Cadre - Niveau 6", "coefficient": 230, "minimum_mensuel": 2420, "minimum_annuel": 29040},
                {"niveau": "Cadre supérieur - Niveau 7", "coefficient": 290, "minimum_mensuel": 3050, "minimum_annuel": 36600},
            ]
        },
        {
            "idcc": "0044", "nom": "Industries alimentaires diverses", "effectif": 85000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Ouvrier - Niveau 1", "coefficient": 100, "minimum_mensuel": 1490, "minimum_annuel": 17880},
                {"niveau": "Ouvrier qualifié - Niveau 2", "coefficient": 112, "minimum_mensuel": 1575, "minimum_annuel": 18900},
                {"niveau": "Ouvrier très qualifié - Niveau 3", "coefficient": 128, "minimum_mensuel": 1700, "minimum_annuel": 20400},
                {"niveau": "TAM - Niveau 4", "coefficient": 150, "minimum_mensuel": 1900, "minimum_annuel": 22800},
                {"niveau": "Cadre - Niveau 5", "coefficient": 200, "minimum_mensuel": 2520, "minimum_annuel": 30240},
            ]
        },
        {
            "idcc": "2691", "nom": "Paysagistes (entreprises du paysage)", "effectif": 55000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Ouvrier - Niveau 1", "coefficient": 100, "minimum_mensuel": 1495, "minimum_annuel": 17940},
                {"niveau": "Ouvrier qualifié - Niveau 2", "coefficient": 111, "minimum_mensuel": 1565, "minimum_annuel": 18780},
                {"niveau": "Ouvrier qualifié - Niveau 3", "coefficient": 124, "minimum_mensuel": 1655, "minimum_annuel": 19860},
                {"niveau": "Chef d'équipe - Niveau 4", "coefficient": 141, "minimum_mensuel": 1790, "minimum_annuel": 21480},
                {"niveau": "Chef de chantier - Niveau 5", "coefficient": 164, "minimum_mensuel": 2020, "minimum_annuel": 24240},
                {"niveau": "Cadre - Niveau 6", "coefficient": 210, "minimum_mensuel": 2590, "minimum_annuel": 31080},
            ]
        },
        {
            "idcc": "0675", "nom": "Papiers-cartons (transformation)", "effectif": 55000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau I", "coefficient": 100, "minimum_mensuel": 1492, "minimum_annuel": 17904},
                {"niveau": "Niveau II", "coefficient": 112, "minimum_mensuel": 1580, "minimum_annuel": 18960},
                {"niveau": "Niveau III", "coefficient": 127, "minimum_mensuel": 1700, "minimum_annuel": 20400},
                {"niveau": "Niveau IV (TAM)", "coefficient": 148, "minimum_mensuel": 1920, "minimum_annuel": 23040},
                {"niveau": "Niveau V (cadres)", "coefficient": 185, "minimum_mensuel": 2380, "minimum_annuel": 28560},
                {"niveau": "Niveau VI (cadres supérieurs)", "coefficient": 250, "minimum_mensuel": 3150, "minimum_annuel": 37800},
            ]
        },
        {
            "idcc": "3016", "nom": "Organismes de formation professionnelle", "effectif": 55000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau 1 - Échelon 1", "coefficient": 100, "minimum_mensuel": 1510, "minimum_annuel": 18120},
                {"niveau": "Niveau 1 - Échelon 2", "coefficient": 108, "minimum_mensuel": 1570, "minimum_annuel": 18840},
                {"niveau": "Niveau 2 - Échelon 1", "coefficient": 120, "minimum_mensuel": 1680, "minimum_annuel": 20160},
                {"niveau": "Niveau 2 - Échelon 2", "coefficient": 135, "minimum_mensuel": 1840, "minimum_annuel": 22080},
                {"niveau": "Niveau 3 (formateur)", "coefficient": 160, "minimum_mensuel": 2100, "minimum_annuel": 25200},
                {"niveau": "Niveau 4 (responsable)", "coefficient": 205, "minimum_mensuel": 2650, "minimum_annuel": 31800},
            ]
        },
        {
            "idcc": "2148", "nom": "Agences générales d'assurances", "effectif": 40000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Classe A1", "coefficient": 100, "minimum_mensuel": 1510, "minimum_annuel": 18120},
                {"niveau": "Classe A2", "coefficient": 112, "minimum_mensuel": 1610, "minimum_annuel": 19320},
                {"niveau": "Classe B1", "coefficient": 130, "minimum_mensuel": 1790, "minimum_annuel": 21480},
                {"niveau": "Classe B2", "coefficient": 155, "minimum_mensuel": 2060, "minimum_annuel": 24720},
                {"niveau": "Classe C (cadre)", "coefficient": 190, "minimum_mensuel": 2490, "minimum_annuel": 29880},
                {"niveau": "Classe D (cadre supérieur)", "coefficient": 250, "minimum_mensuel": 3240, "minimum_annuel": 38880},
            ]
        },
        {
            "idcc": "0016", "nom": "Transports aériens (personnel au sol)", "effectif": 45000, "statut": "conforme",
            "derniere_revalorisation": "Juillet 2025",
            "grille": [
                {"niveau": "Catégorie 1 - Échelon 1", "coefficient": 100, "minimum_mensuel": 1530, "minimum_annuel": 18360},
                {"niveau": "Catégorie 2", "coefficient": 115, "minimum_mensuel": 1650, "minimum_annuel": 19800},
                {"niveau": "Catégorie 3 (technicien)", "coefficient": 135, "minimum_mensuel": 1840, "minimum_annuel": 22080},
                {"niveau": "Catégorie 4 (TAM)", "coefficient": 165, "minimum_mensuel": 2140, "minimum_annuel": 25680},
                {"niveau": "Catégorie 5 (cadre)", "coefficient": 220, "minimum_mensuel": 2790, "minimum_annuel": 33480},
                {"niveau": "Catégorie 6 (cadre supérieur)", "coefficient": 310, "minimum_mensuel": 3920, "minimum_annuel": 47040},
            ]
        },
        {
            "idcc": "0158", "nom": "Imprimerie de labeur et industries graphiques", "effectif": 43000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Ouvrier - Niveau 1", "coefficient": 100, "minimum_mensuel": 1498, "minimum_annuel": 17976},
                {"niveau": "Ouvrier qualifié - Niveau 2", "coefficient": 113, "minimum_mensuel": 1590, "minimum_annuel": 19080},
                {"niveau": "Ouvrier très qualifié - Niveau 3", "coefficient": 130, "minimum_mensuel": 1720, "minimum_annuel": 20640},
                {"niveau": "TAM - Niveau 4", "coefficient": 152, "minimum_mensuel": 1930, "minimum_annuel": 23160},
                {"niveau": "Cadre - Niveau 5", "coefficient": 190, "minimum_mensuel": 2390, "minimum_annuel": 28680},
            ]
        },
        {
            "idcc": "0979", "nom": "Hôtellerie de plein air (camping)", "effectif": 38000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Niveau 1 - Échelon 1", "coefficient": 100, "minimum_mensuel": 1478, "minimum_annuel": 17736},
                {"niveau": "Niveau 1 - Échelon 2", "coefficient": 105, "minimum_mensuel": 1500, "minimum_annuel": 18000},
                {"niveau": "Niveau 2 - Échelon 1", "coefficient": 112, "minimum_mensuel": 1535, "minimum_annuel": 18420},
                {"niveau": "Niveau 2 - Échelon 2", "coefficient": 122, "minimum_mensuel": 1590, "minimum_annuel": 19080},
                {"niveau": "Niveau 3", "coefficient": 140, "minimum_mensuel": 1720, "minimum_annuel": 20640},
                {"niveau": "Cadre - Niveau 4", "coefficient": 180, "minimum_mensuel": 2150, "minimum_annuel": 25800},
            ]
        },
        {
            "idcc": "3230", "nom": "Acteurs du lien social et familial (ELISFA)", "effectif": 25000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Groupe A - Degré 1", "coefficient": 257, "minimum_mensuel": 1480, "minimum_annuel": 17760},
                {"niveau": "Groupe B - Degré 1", "coefficient": 285, "minimum_mensuel": 1600, "minimum_annuel": 19200},
                {"niveau": "Groupe C - Degré 1", "coefficient": 330, "minimum_mensuel": 1800, "minimum_annuel": 21600},
                {"niveau": "Groupe D", "coefficient": 390, "minimum_mensuel": 2100, "minimum_annuel": 25200},
                {"niveau": "Groupe E (direction)", "coefficient": 480, "minimum_mensuel": 2560, "minimum_annuel": 30720},
            ]
        },
        {
            "idcc": "1258", "nom": "Textiles artificiels et synthétiques", "effectif": 35000, "statut": "conforme",
            "derniere_revalorisation": "Juillet 2025",
            "grille": [
                {"niveau": "Ouvrier - Échelon 1", "coefficient": 100, "minimum_mensuel": 1480, "minimum_annuel": 17760},
                {"niveau": "Ouvrier qualifié - Échelon 2", "coefficient": 112, "minimum_mensuel": 1560, "minimum_annuel": 18720},
                {"niveau": "Ouvrier hautement qualifié - Échelon 3", "coefficient": 128, "minimum_mensuel": 1670, "minimum_annuel": 20040},
                {"niveau": "TAM - Échelon 4", "coefficient": 150, "minimum_mensuel": 1880, "minimum_annuel": 22560},
                {"niveau": "Cadre - Échelon 5", "coefficient": 200, "minimum_mensuel": 2480, "minimum_annuel": 29760},
            ]
        },
        {
            "idcc": "1043", "nom": "Commerce succursaliste de la chaussure", "effectif": 28000, "statut": "conforme",
            "derniere_revalorisation": "Juillet 2025",
            "grille": [
                {"niveau": "Vendeur - Niveau 1", "coefficient": 100, "minimum_mensuel": 1480, "minimum_annuel": 17760},
                {"niveau": "Vendeur qualifié - Niveau 2", "coefficient": 110, "minimum_mensuel": 1545, "minimum_annuel": 18540},
                {"niveau": "Chef de rayon - Niveau 3", "coefficient": 125, "minimum_mensuel": 1660, "minimum_annuel": 19920},
                {"niveau": "Responsable adjoint - Niveau 4", "coefficient": 150, "minimum_mensuel": 1890, "minimum_annuel": 22680},
                {"niveau": "Directeur de magasin - Niveau 5", "coefficient": 190, "minimum_mensuel": 2360, "minimum_annuel": 28320},
            ]
        },
        {
            "idcc": "2785", "nom": "Avocats (salariés et collaborateurs)", "effectif": 30000, "statut": "non_conforme",
            "derniere_revalorisation": "Juin 2025",
            "grille": [
                {"niveau": "Collaborateur - Tranche A", "coefficient": 100, "minimum_mensuel": 1430, "minimum_annuel": 17160},
                {"niveau": "Collaborateur - Tranche B", "coefficient": 115, "minimum_mensuel": 1495, "minimum_annuel": 17940},
                {"niveau": "Collaborateur confirmé", "coefficient": 140, "minimum_mensuel": 1650, "minimum_annuel": 19800},
                {"niveau": "Juriste senior", "coefficient": 180, "minimum_mensuel": 2100, "minimum_annuel": 25200},
                {"niveau": "Avocat associé salarié", "coefficient": 250, "minimum_mensuel": 2900, "minimum_annuel": 34800},
            ]
        },
        {
            "idcc": "0086", "nom": "Navigation fluviale", "effectif": 12000, "statut": "conforme",
            "derniere_revalorisation": "Janvier 2026",
            "grille": [
                {"niveau": "Matelot - Classe 1", "coefficient": 100, "minimum_mensuel": 1510, "minimum_annuel": 18120},
                {"niveau": "Matelot qualifié - Classe 2", "coefficient": 115, "minimum_mensuel": 1650, "minimum_annuel": 19800},
                {"niveau": "Patron - Classe 3", "coefficient": 140, "minimum_mensuel": 1920, "minimum_annuel": 23040},
                {"niveau": "Capitaine - Classe 4", "coefficient": 175, "minimum_mensuel": 2290, "minimum_annuel": 27480},
            ]
        },
    ]

    # ─────────────────────────────────────────────────────────────
    # Tentative API data.travail.gouv.fr pour enrichir les effectifs
    # et le statut de conformité en temps réel
    # ─────────────────────────────────────────────────────────────
    api_updates = {}
    try:
        BASE_API = "https://data.travail.gouv.fr/api/explore/v2.1/catalog/datasets"
        DATASET  = "conventions-collectives-nationales"
        url = (
            f"{BASE_API}/{DATASET}/records"
            f"?select=idcc,intitule,effectif,statut_conformite_smic"
            f"&order_by=effectif%20desc"
            f"&limit=200"
        )
        req = urllib.request.Request(url, headers={
            "Accept": "application/json",
            "User-Agent": "CFTC-Dashboard/2.0"
        })
        with urllib.request.urlopen(req, timeout=20) as response:
            data_api = json.loads(response.read().decode("utf-8"))
            for r in data_api.get("results", []):
                raw_idcc = r.get("idcc")
                if not raw_idcc:
                    continue
                idcc = str(raw_idcc).zfill(4)
                effectif = r.get("effectif")
                if effectif:
                    try:
                        effectif = int(effectif)
                    except Exception:
                        effectif = None
                statut_raw = (r.get("statut_conformite_smic") or "").lower()
                statut = "conforme" if "conforme" in statut_raw and "non" not in statut_raw else "non_conforme"
                api_updates[idcc] = {"effectif": effectif, "statut": statut}
        print(f"  ✅ API data.travail.gouv.fr : {len(api_updates)} branches mises à jour")
    except Exception as e:
        print(f"  ⚠️ API data.travail.gouv.fr indisponible ({e}) — effectifs statiques utilisés")

    # Appliquer les mises à jour de l'API sur la base statique
    branches_finales = []
    for branch in BRANCHES_BASE:
        entry = dict(branch)
        if entry["idcc"] in api_updates:
            upd = api_updates[entry["idcc"]]
            if upd.get("effectif"):
                entry["effectif"] = upd["effectif"]
            entry["statut"] = upd["statut"]
        entry["id"] = f"branch_{entry['idcc']}"
        entry["source"] = f"https://www.legifrance.gouv.fr/search/result?query=idcc+{entry['idcc']}"
        branches_finales.append(entry)

    # Trier par effectif décroissant
    branches_finales.sort(key=lambda x: x.get("effectif") or 0, reverse=True)

    nb_non_conformes = sum(1 for b in branches_finales if b.get("statut") == "non_conforme")
    total_effectif   = sum(b.get("effectif") or 0 for b in branches_finales)

    print(f"  ✅ {len(branches_finales)} branches prêtes · {nb_non_conformes} non conformes · {total_effectif/1e6:.1f}M salariés couverts")

    return {
        "smic_reference": {
            "mensuel":      smic_net,
            "mensuel_brut": smic_brut,
            "annuel":       round(smic_net * 12),
            "date":         "Janvier 2026",
        },
        "statistiques_branches": {
            "total_branches":            171,
            "branches_affichees":        len(branches_finales),
            "branches_conformes":        len(branches_finales) - nb_non_conformes,
            "branches_non_conformes":    nb_non_conformes,
            "pourcentage_non_conformes": round(nb_non_conformes / max(len(branches_finales), 1) * 100),
            "source_statistiques":       "DGT - Comité de suivi des branches (2025)",
            "total_effectif_couvert":    total_effectif,
        },
        "branches": branches_finales,
        "meta": {
            "derniere_mise_a_jour":  datetime.now().strftime("%Y-%m-%d"),
            "prochaine_verification": "Juillet 2026",
            "source_effectifs":      "DGT/DARES via API data.travail.gouv.fr + base statique",
            "methodologie":          "50 branches classées par effectif. Grilles vérifiées au 01/01/2026. Effectifs et conformité mis à jour automatiquement via API.",
        },
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
    emplois_vacants_data = build_emplois_vacants_data() # --- EMPLOIS VACANTS DARES ---
    chomage_drom = fetch_chomage_drom()  # Chômage DROM automatisé (GP, MQ, GF, RE)
    
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
    marches_financiers = build_marches_financiers_data()
    
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
        {"periode": "T4 2025", "smic": 118.2, "salaires": 117.0, "prix": 117.6},
    ]
    
    inflation_detail = [
        # val2025 : données INSEE définitives moyennes annuelles (publication janvier 2026)
        # Source : https://www.insee.fr/fr/statistiques/8726461
        {"poste": "Alimentation", "val2022": 6.8, "val2023": 11.8, "val2024": 1.4, "val2025": 1.2},
        {"poste": "Énergie", "val2022": 23.1, "val2023": 5.6, "val2024": 2.3, "val2025": -5.6},
        {"poste": "Services", "val2022": 3.0, "val2023": 3.0, "val2024": 2.7, "val2025": 2.3},
        {"poste": "Manufacturés", "val2022": 3.3, "val2023": 3.5, "val2024": 0.0, "val2025": -0.3},
        {"poste": "Loyers", "val2022": 2.0, "val2023": 2.8, "val2024": 2.8, "val2025": 2.3},
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

    # Dictionnaire temporaire pour passer aux alertes
    data_pour_alertes = {
        "inflation_salaires": inflation_salaires,
        "chomage": chomage,
        "pib": pib,
        "smic": smic,
        "irl": irl,
        "defaillances": defaillances,
        "emplois_vacants": emplois_vacants_data,
    }
    
    alertes_auto = build_alertes_automatiques(data_pour_alertes)
    changelog = build_changelog()
    revue_presse = build_revue_presse()
    # Assembler le JSON final
    data = {
        "last_updated": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "last_updated_iso": datetime.now().isoformat(),
        "contact": "hspringragain@cftc.fr",
        "alertes": alertes_auto,
        "changelog": changelog,
        "revue_presse": revue_presse,
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
        "emplois_vacants": emplois_vacants_data,
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
        "marches_financiers": marches_financiers,
        
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
            "conjoncture": "INSEE - Comptes nationaux, Banque de France, FRED (OAT, Brent), Yahoo Finance (CAC 40), EIA",
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
            ],
            "dom": [
                {
                    "nom": "Guadeloupe",
                    "code": "GP",
                    "emoji": "🌺",
                    "chomage": 16.3,
                    "salaire_median": 1820,
                    "emploi": 55.2,
                    "population": 0.385,
                    "tensions": 38,
                    "evol_chomage": -0.4,
                    "note": "Taux de chômage des jeunes : ~43%"
                },
                {
                    "nom": "Martinique",
                    "code": "MQ",
                    "emoji": "🌴",
                    "chomage": 13.7,
                    "salaire_median": 1840,
                    "emploi": 56.8,
                    "population": 0.349,
                    "tensions": 40,
                    "evol_chomage": 1.3,
                    "note": "Taux de chômage des jeunes : ~40%"
                },
                {
                    "nom": "Guyane",
                    "code": "GF",
                    "emoji": "🌿",
                    "chomage": 16.7,
                    "salaire_median": 1750,
                    "emploi": 48.3,
                    "population": 0.300,
                    "tensions": 32,
                    "evol_chomage": -0.1,
                    "note": "Population en forte croissance (+3%/an)"
                },
                {
                    "nom": "La Réunion",
                    "code": "RE",
                    "emoji": "🏝️",
                    "chomage": 16.2,
                    "salaire_median": 1860,
                    "emploi": 54.1,
                    "population": 0.885,
                    "tensions": 42,
                    "evol_chomage": -1.2,
                    "note": "Plus grand territoire ultramarin en population"
                },
                {
                    "nom": "Mayotte",
                    "code": "YT",
                    "emoji": "🌊",
                    "chomage": 30.0,
                    "salaire_median": 1426,
                    "emploi": 38.5,
                    "population": 0.321,
                    "tensions": 28,
                    "evol_chomage": 0.5,
                    "note": "Département le plus jeune et le plus pauvre de France"
                }
            ]
        },
        
        # CONVENTIONS COLLECTIVES - top 50 par effectif (automatique)
        "conventions_collectives": build_conventions_collectives_enrichies(
            smic_net=smic["montant_net"],
            smic_brut=smic["montant_brut"]
        ),
        
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

        # ACCIDENTS DU TRAVAIL - Données 2024 officielles CNAM
        # Source : Caisse nationale de l'Assurance Maladie – Risques professionnels
        # Rapport annuel 2024 (édition novembre 2025)
        "accidents_travail": {
            "annee": 2024,
            "source": "CNAM - Risques professionnels, Rapport annuel 2024 (édition novembre 2025)",
            
            "total_national": {
                "accidents_avec_arret": 549614,
                "indice_frequence": 26.4,  # IF pour 1000 salariés
                "accidents_mortels": 759,
                "evolution_mortels_pct": 8.2,  # +8.2% vs 2023
                "tendance_accidents": "baisse",
                "tendance_gravite": "hausse"
            },
            
            # Répartition par sexe et âge
            "demographie": {
                "hommes_pct": 62,
                "femmes_pct": 38,
                "tranche_pic": "30-39 ans",
                "tranche_elevee": "40-49 ans"
            },
            
            # Causes principales
            "causes": {
                "manutention_manuelle_pct": 50,
                "chutes_plain_pied_pct": 15,
                "chutes_hauteur_pct": 12,
                "outillage_pct": 8,
                "autres_pct": 15
            },
            
            # Par CTN (Comité Technique National) - Données 2024
            "par_ctn": [
                {
                    "ctn": "A",
                    "secteur": "Métallurgie",
                    "accidents": 40161,
                    "evolution_pct": -1.0,
                    "if": 22.6,
                    "commentaire": "Baisse des accidents malgré hausse des effectifs (+2.2%)"
                },
                {
                    "ctn": "B",
                    "secteur": "BTP",
                    "accidents": 72633,
                    "evolution_pct": -5.4,
                    "if": 38.1,
                    "commentaire": "IF au plus bas depuis 20 ans, perd sa place de secteur le plus accidentogène"
                },
                {
                    "ctn": "C",
                    "secteur": "Transports, Eau, Gaz, Électricité",
                    "accidents": 85150,
                    "evolution_pct": -0.5,
                    "if": 36.6,
                    "commentaire": None
                },
                {
                    "ctn": "D",
                    "secteur": "Services, Commerces, Alimentation",
                    "accidents": 93735,
                    "evolution_pct": -0.9,
                    "if": 32.5,
                    "commentaire": None
                },
                {
                    "ctn": "E",
                    "secteur": "Chimie, Caoutchouc, Plasturgie",
                    "accidents": 8551,
                    "evolution_pct": 3.3,
                    "if": 19.8,
                    "commentaire": "Hausse tirée par industrie pharmaceutique (+20% IF)"
                },
                {
                    "ctn": "F",
                    "secteur": "Bois, Ameublement, Textile",
                    "accidents": 14363,
                    "evolution_pct": -7.7,
                    "if": 33.3,
                    "commentaire": "Plus forte baisse, niveau proche de 2020"
                },
                {
                    "ctn": "G",
                    "secteur": "Commerce non alimentaire",
                    "accidents": 41677,
                    "evolution_pct": 0.1,
                    "if": 17.6,
                    "commentaire": None
                },
                {
                    "ctn": "H",
                    "secteur": "Banques, Assurances, Services I",
                    "accidents": 36773,
                    "evolution_pct": 7.2,
                    "if": 7.8,
                    "commentaire": "Plus forte hausse (+7.2%), mais IF le plus faible"
                },
                {
                    "ctn": "I",
                    "secteur": "Intérim, Santé, Action sociale",
                    "accidents": 156571,
                    "evolution_pct": -1.2,
                    "if": 39.8,
                    "commentaire": "Plus gros volume, devient le secteur avec l'IF le plus élevé (dépasse BTP)"
                }
            ],
            
            # Ancienne structure pour compatibilité (simplifiée)
            "par_secteur": [
                {"secteur": "Intérim/Santé/Social", "accidents": 156571, "part_pct": 28, "if": 39.8},
                {"secteur": "Services/Commerce/Alim.", "accidents": 93735, "part_pct": 17, "if": 32.5},
                {"secteur": "Transports/Eau/Gaz", "accidents": 85150, "part_pct": 15, "if": 36.6},
                {"secteur": "BTP", "accidents": 72633, "part_pct": 13, "if": 38.1},
                {"secteur": "Commerce non alim.", "accidents": 41677, "part_pct": 8, "if": 17.6},
                {"secteur": "Métallurgie", "accidents": 40161, "part_pct": 7, "if": 22.6},
                {"secteur": "Banques/Assurances", "accidents": 36773, "part_pct": 7, "if": 7.8},
                {"secteur": "Autres (Bois, Chimie...)", "accidents": 22914, "part_pct": 4, "if": 25.0}
            ],
            
            "notes_lecture": [
                "📉 549 614 accidents du travail en 2024 : la baisse se poursuit",
                "⚠️ 759 décès reconnus (+8.2% vs 2023) : la gravité augmente",
                "📊 Indice de fréquence : 26.4 AT pour 1 000 salariés (tous secteurs)",
                "🏥 Le secteur Intérim/Santé/Social devient le plus accidentogène (IF 39.8), dépassant le BTP (38.1)",
                "👷 La manutention manuelle est à l'origine de 50% des accidents",
                "👨 62% des AT concernent les hommes, pic chez les 30-39 ans"
            ]
        },
         # MALADIES PROFESSIONNELLES - Données 2024 officielles CNAM
        # Source : Caisse nationale de l'Assurance Maladie – Risques professionnels
        # Rapport annuel 2024 (édition novembre 2025)
        "maladies_professionnelles": {
            "annee": 2024,
            "source": "CNAM - Risques professionnels, Rapport annuel 2024 (édition novembre 2025)",
            
            "total": 50598,
            "evolution_pct": 6.7,
            
            # Répartition par sexe
            "demographie": {
                "femmes_pct": 52,
                "hommes_pct": 48,
                "commentaire": "Les CTN à forte prédominance féminine (CTN D, CTN I) et exposés aux gestes répétitifs contribuent à la majorité féminine"
            },
            
            # Types de maladies
            "types": {
                "tms_pct": 87,  # Troubles musculo-squelettiques (tableau 57)
                "amiante_pct": 5,
                "surdite_pct": 2,
                "autres_pct": 6
            },
            
            # Par CTN (Comité Technique National) - Données 2024
            "par_ctn": [
                {
                    "ctn": "D",
                    "secteur": "Services, Commerces, Alimentation",
                    "mp": 10557,
                    "evolution_pct": 5.8,
                    "commentaire": "Grande distribution, gestes répétitifs"
                },
                {
                    "ctn": "I",
                    "secteur": "Santé, Nettoyage, Intérim",
                    "mp": 10383,
                    "evolution_pct": 6.1,
                    "commentaire": "Forte prédominance féminine"
                },
                {
                    "ctn": "B",
                    "secteur": "Bâtiment et Travaux Publics",
                    "mp": 7238,
                    "evolution_pct": 4.5,
                    "commentaire": None
                },
                {
                    "ctn": "A",
                    "secteur": "Métallurgie",
                    "mp": 6237,
                    "evolution_pct": 8.1,
                    "commentaire": None
                },
                {
                    "ctn": "C",
                    "secteur": "Transports, Eau, Gaz, Électricité",
                    "mp": 3968,
                    "evolution_pct": 9.6,
                    "commentaire": None
                },
                {
                    "ctn": "G",
                    "secteur": "Commerce non alimentaire",
                    "mp": 3169,
                    "evolution_pct": 12.7,
                    "commentaire": "Plus forte hausse"
                },
                {
                    "ctn": "F",
                    "secteur": "Bois, Ameublement, Papier-Carton",
                    "mp": 2569,
                    "evolution_pct": 3.8,
                    "commentaire": None
                },
                {
                    "ctn": "H",
                    "secteur": "Banques, Assurances, Services I",
                    "mp": 2250,
                    "evolution_pct": 12.3,
                    "commentaire": None
                },
                {
                    "ctn": "E",
                    "secteur": "Chimie, Caoutchouc, Plasturgie",
                    "mp": 1671,
                    "evolution_pct": 8.9,
                    "commentaire": None
                }
            ],
            
            "notes_lecture": [
                "📈 50 598 maladies professionnelles reconnues en 2024 (+6.7% vs 2023)",
                "👩 52% des MP touchent les femmes — lié aux gestes répétitifs (TMS)",
                "🏥 Les TMS (tableau 57) représentent 87% des maladies professionnelles",
                "📊 Les secteurs Services (CTN D et I) concentrent 41% des MP",
                "⚠️ Plus fortes hausses : Commerce non alim. (+12.7%) et Banques (+12.3%)"
            ]
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
                    "description": "Participation indexée sur l'inflation. 100€ en mai 2024, 102,23€ au 01/01/2026."
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
                "interessement_mds": 12.6,
                "montant_moyen_beneficiaire": 2050  # Moyenne participation+intéressement par bénéficiaire (DARES)
            },
            "montants_moyens": {
                "participation": 1850,
                "interessement": 2100,
                "abondement_pee": 820
            },
            "dispositifs": {
                "participation": {
                    "montant_moyen": 1850,
                    "salaries_couverts_pct": 45
                },
                "interessement": {
                    "montant_moyen": 2100,
                    "salaries_couverts_pct": 38
                },
                "pee": {
                    "abondement_moyen": 820,
                    "salaries_couverts_pct": 52
                },
                "perco_percol": {
                    "abondement_moyen": 650,
                    "salaries_couverts_pct": 18
                }
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

    # === MERGE AUTOMATIQUE : chômage DROM depuis API INSEE ===
    # On met à jour les champs "chomage" et "evol_chomage" des territoires
    # pour lesquels l'API a retourné des données (GP, MQ, GF, RE).
    # En cas d'échec API, les valeurs statiques du dict ci-dessus sont conservées.
    if chomage_drom:
        for territoire in data["donnees_regionales"]["dom"]:
            code = territoire.get("code")
            if code in chomage_drom:
                territoire["chomage"] = chomage_drom[code]["chomage"]
                territoire["evol_chomage"] = chomage_drom[code]["evol_chomage"]
        print(f"  🌴 Chômage DROM mis à jour pour : {', '.join(chomage_drom.keys())}")
    else:
        print("  ⚠️ Chômage DROM : API indisponible, valeurs statiques conservées")

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
    print("   │              → Confirmé : 1 823,03€ brut / 1 443,11€ net ✅ │")
    print("   │ 📅 Janvier   : Barèmes simulateur NAO (CAF/URSSAF)         │")
    print("   │ 📅 Janvier   : Panier Familial CFTC (prix produits)        │")
    print("   │ 📅 Janvier   : Heures de travail (prix + SMIC horaire)     │")
    print("   │ 📅 Mars      : PPV (données Urssaf exercice 2024)          │")
    print("   │              → ⏳ Non encore publiées au 16/03/2026        │")
    print("   │ 📅 Mars      : Écart H/F à poste comparable (INSEE Focus)  │")
    print("   │              → Focus n°377 publié (fév. 2026) - données 2024 ✅│")
    print("   │ 📅 Avril     : Tensions métiers (enquête BMO France Travail)│")
    print("   │ 📅 Avril     : Taux d'effort logement (enquête SRCV)       │")
    print("   │ 📅 Juillet   : Comparaison UE (Eurostat semestriel)        │")
    print("   │              → Données jan 2026 (Eurostat 30/01/2026) ✅   │")
    print("   │ 📅 Trimestriel: Créations/destructions emploi (DARES MMO)  │")
    print("   │              → T4 2025 non encore publié ⏳                │")
    print("   │ 📅 Trimestriel: Prix immobilier par zone (Notaires-INSEE)  │")
    print("   │ 📅 Trimestriel: PIB (Comptes nationaux ~45j après trim.)   │")
    print("   │              → T4 2025 : +0.7% g.a., annuel 2025 : +0.9% ✅│")
    print("   │ 📅 Trimestriel: Investissement FBCF (Comptes nationaux)    │")
    print("   │              → FBCF T4 2025 : +0.2% T/T ✅                │")
    print("   │ 📅 Mensuel   : Taux crédit immo (Observatoire CL/CSA)      │")
    print("   │              → Fév 2026 : 3.25% (+5pdb) ✅                 │")
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
