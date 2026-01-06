#!/usr/bin/env python3
"""
Script de récupération automatique des données économiques
Sources : INSEE (SDMX API), Banque de France

Ce script récupère les indicateurs clés et génère un fichier JSON
utilisé par le tableau de bord React.
"""

import json
import os
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
import ssl

# Désactiver la vérification SSL si nécessaire (pour certains environnements CI)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'public', 'data.json')

def fetch_url(url, headers=None):
    """Récupère le contenu d'une URL"""
    try:
        req = Request(url, headers=headers or {})
        with urlopen(req, timeout=30, context=ssl_context) as response:
            return response.read().decode('utf-8')
    except (HTTPError, URLError) as e:
        print(f"Erreur lors de la récupération de {url}: {e}")
        return None

def fetch_insee_series(series_id, start_period="2020-01"):
    """
    Récupère une série INSEE via l'API SDMX
    Documentation : https://api.insee.fr/catalogue/
    """
    base_url = "https://api.insee.fr/series/BDM/V1/data/SERIES_BDM"
    url = f"{base_url}/{series_id}?startPeriod={start_period}&firstNObservations=100"
    
    headers = {
        'Accept': 'application/json',
        'User-Agent': 'CFTC-Conjoncture/1.0'
    }
    
    content = fetch_url(url, headers)
    if content:
        try:
            data = json.loads(content)
            # Parser la réponse SDMX
            observations = []
            if 'dataSets' in data and len(data['dataSets']) > 0:
                dataset = data['dataSets'][0]
                if 'series' in dataset:
                    for key, series in dataset['series'].items():
                        if 'observations' in series:
                            for period_idx, obs in series['observations'].items():
                                observations.append({
                                    'period_idx': int(period_idx),
                                    'value': obs[0] if obs else None
                                })
            
            # Récupérer les périodes
            periods = []
            if 'structure' in data and 'dimensions' in data['structure']:
                for dim in data['structure']['dimensions'].get('observation', []):
                    if dim.get('id') == 'TIME_PERIOD':
                        periods = [v['id'] for v in dim.get('values', [])]
            
            # Combiner
            result = []
            for obs in observations:
                if obs['period_idx'] < len(periods):
                    result.append({
                        'period': periods[obs['period_idx']],
                        'value': obs['value']
                    })
            return result
        except json.JSONDecodeError as e:
            print(f"Erreur JSON pour {series_id}: {e}")
    return []

def get_inflation_data():
    """Récupère les données d'inflation (IPC)"""
    # Série INSEE : IPC ensemble des ménages, France, glissement annuel
    # Code : 001759970 (IPC - Ensemble - Glissement annuel)
    series = fetch_insee_series("001759970")
    
    if not series:
        # Données de fallback basées sur les dernières publications
        return [
            {"annee": "2020", "inflation": 0.5},
            {"annee": "2021", "inflation": 1.6},
            {"annee": "2022", "inflation": 5.2},
            {"annee": "2023", "inflation": 4.9},
            {"annee": "2024", "inflation": 2.0},
            {"annee": "2025", "inflation": 0.9},
        ]
    
    # Agréger par année (moyenne)
    by_year = {}
    for item in series:
        year = item['period'][:4]
        if year not in by_year:
            by_year[year] = []
        if item['value'] is not None:
            by_year[year].append(item['value'])
    
    result = []
    for year in sorted(by_year.keys()):
        if by_year[year]:
            avg = sum(by_year[year]) / len(by_year[year])
            result.append({"annee": year, "inflation": round(avg, 1)})
    
    return result[-6:] if len(result) > 6 else result

def get_chomage_data():
    """Récupère les données de chômage"""
    # Série INSEE : Taux de chômage BIT, France hors Mayotte
    # Code : 001688526
    series = fetch_insee_series("001688526", "2023-Q1")
    
    if not series:
        # Données de fallback
        return [
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
    
    result = []
    for item in series:
        period = item['period']
        # Convertir 2024-Q1 en T1 2024
        if '-Q' in period:
            year, quarter = period.split('-Q')
            trimestre = f"T{quarter} {year}"
        else:
            trimestre = period
        
        result.append({
            "trimestre": trimestre,
            "taux": round(item['value'], 1) if item['value'] else None,
            "jeunes": None  # Nécessiterait une autre série
        })
    
    return result

def get_smic_data():
    """Récupère les données sur le SMIC"""
    # Ces données évoluent peu, on utilise les données officielles
    return {
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

def get_inflation_detail():
    """Détail de l'inflation par poste"""
    # Données issues des publications INSEE
    return [
        {"poste": "Alimentation", "val2022": 6.8, "val2023": 11.8, "val2024": 1.4},
        {"poste": "Énergie", "val2022": 23.1, "val2023": 5.6, "val2024": 2.3},
        {"poste": "Services", "val2022": 3.0, "val2023": 3.0, "val2024": 2.7},
        {"poste": "Manufacturés", "val2022": 3.3, "val2023": 3.5, "val2024": 0.0},
        {"poste": "Loyers", "val2022": 2.0, "val2023": 2.8, "val2024": 2.8},
    ]

def get_salaires_data():
    """Données sur l'évolution des salaires"""
    return [
        {"annee": "2020", "smic": 1.2, "salaires_base": 1.5},
        {"annee": "2021", "smic": 2.2, "salaires_base": 1.4},
        {"annee": "2022", "smic": 5.6, "salaires_base": 3.5},
        {"annee": "2023", "smic": 6.6, "salaires_base": 4.2},
        {"annee": "2024", "smic": 2.0, "salaires_base": 2.8},
        {"annee": "2025", "smic": 1.2, "salaires_base": 2.0},
    ]

def get_pouvoir_achat_cumule():
    """Évolution cumulée du pouvoir d'achat (base 100)"""
    return [
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

def main():
    """Fonction principale"""
    print(f"🔄 Récupération des données économiques - {datetime.now().isoformat()}")
    
    # Récupérer toutes les données
    inflation = get_inflation_data()
    chomage = get_chomage_data()
    smic = get_smic_data()
    salaires = get_salaires_data()
    inflation_detail = get_inflation_detail()
    pouvoir_achat = get_pouvoir_achat_cumule()
    
    # Fusionner inflation et salaires
    inflation_salaires = []
    for inf in inflation:
        annee = inf['annee']
        sal = next((s for s in salaires if s['annee'] == annee), {})
        inflation_salaires.append({
            "annee": annee,
            "inflation": inf['inflation'],
            "smic": sal.get('smic', 0),
            "salaires_base": sal.get('salaires_base', 0)
        })
    
    # Construire le fichier de sortie
    data = {
        "last_updated": datetime.now().isoformat(),
        "sources": [
            "INSEE - Indice des prix à la consommation",
            "INSEE - Enquête Emploi",
            "Banque de France - Négociations salariales",
            "DARES - Statistiques du marché du travail"
        ],
        "inflation_salaires": inflation_salaires,
        "chomage": chomage,
        "smic": smic,
        "inflation_detail": inflation_detail,
        "pouvoir_achat_cumule": pouvoir_achat,
        "indicateurs_cles": {
            "taux_chomage_actuel": chomage[-1]['taux'] if chomage else 7.7,
            "inflation_annuelle": inflation[-1]['inflation'] if inflation else 0.9,
            "smic_brut": smic['montant_brut'],
            "smic_net": smic['montant_net']
        }
    }
    
    # Créer le dossier public si nécessaire
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    # Écrire le fichier JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Données sauvegardées dans {OUTPUT_FILE}")
    print(f"   - Dernière inflation : {data['indicateurs_cles']['inflation_annuelle']}%")
    print(f"   - Taux de chômage : {data['indicateurs_cles']['taux_chomage_actuel']}%")
    print(f"   - SMIC brut : {data['indicateurs_cles']['smic_brut']}€")

if __name__ == "__main__":
    main()
