#!/usr/bin/env python3
"""
🔮 Module de Prévisions Économiques CFTC v3.0
=============================================

APPROCHE : Ancrage sur les prévisions institutionnelles
--------------------------------------------------------
Plutôt que de "prédire" à partir de zéro, ce modèle :
1. S'ancre sur les prévisions Banque de France / INSEE (fiables)
2. Interpole mensuellement / trimestriellement
3. Applique les règles légales SMIC (certaines)
4. Génère des intervalles de confiance RÉALISTES

Cela garantit des résultats cohérents avec le consensus économique.
"""

import json
import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional

# ============================================================================
# CONFIGURATION - PARAMÈTRES RÉALISTES
# ============================================================================

# Volatilité typique (écart-type annualisé)
VOLATILITY = {
    'inflation': 0.4,    # ±0.4 pts sur un an (très stable en période normale)
    'chomage': 0.3,      # ±0.3 pts sur un an
    'pib': 0.5           # ±0.5 pts sur un an
}

# Seuil SMIC
SMIC_INFLATION_THRESHOLD = 2.0  # Revalorisation auto si +2%

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

def interpolate_monthly(start_value: float, end_value: float, months: int) -> List[float]:
    """Interpole linéairement entre deux valeurs sur N mois."""
    if months <= 1:
        return [end_value]
    step = (end_value - start_value) / months
    return [round(start_value + step * (i + 1), 2) for i in range(months)]


def calculate_confidence_bounds(
    predictions: List[float], 
    annual_volatility: float,
    confidence: float = 0.90  # 90% pour être plus serré
) -> tuple:
    """
    Calcule des intervalles de confiance RÉALISTES.
    L'incertitude croît avec √temps mais reste bornée.
    """
    z = 1.645  # 90% CI (plus serré que 95%)
    
    lower, upper = [], []
    for i, pred in enumerate(predictions):
        # Incertitude croît avec √mois, mais plafonnée
        months_ahead = i + 1
        uncertainty = annual_volatility * z * min(math.sqrt(months_ahead / 12), 1.5)
        
        # Bornes réalistes
        lower.append(round(max(pred - uncertainty, pred * 0.5), 1))
        upper.append(round(pred + uncertainty, 1))
    
    return lower, upper


def get_current_month_year():
    """Retourne le mois et l'année actuels."""
    now = datetime.now()
    return now.month, now.year


# ============================================================================
# PRÉVISIONS D'INFLATION - BASÉES SUR BANQUE DE FRANCE
# ============================================================================

def predict_inflation(
    current_inflation: float,
    bdf_forecast_2026: float,
    bdf_forecast_2027: float,
    horizon_months: int = 12
) -> Dict:
    """
    Prévision d'inflation ANCRÉE sur les projections Banque de France.
    
    Stratégie :
    - On part de l'inflation actuelle
    - On converge vers la prévision BDF de fin d'année
    - Puis vers celle de l'année suivante
    """
    month, year = get_current_month_year()
    
    # Mois restants jusqu'à fin 2026
    months_to_end_2026 = max(1, 12 - month + 1) if year == 2026 else 12
    
    # Interpolation vers la cible BDF
    predictions = []
    periods = []
    
    current = current_inflation
    target_2026 = bdf_forecast_2026 or 1.4  # Valeur par défaut BDF
    target_2027 = bdf_forecast_2027 or 1.6
    
    for i in range(horizon_months):
        # Avancer d'un mois
        month += 1
        if month > 12:
            month = 1
            year += 1
        
        periods.append(f"{year}-{month:02d}")
        
        # Déterminer la cible selon l'année
        if year <= 2026:
            target = target_2026
            progress = i / max(months_to_end_2026, 1)
        else:
            target = target_2027
            progress = (i - months_to_end_2026) / 12
        
        # Convergence progressive vers la cible
        progress = min(progress, 1.0)
        pred = current + (target - current) * (0.3 + 0.7 * progress)
        
        predictions.append(round(pred, 1))
        current = pred  # Pour continuité
    
    # Intervalles de confiance serrés
    lower, upper = calculate_confidence_bounds(predictions, VOLATILITY['inflation'])
    
    return {
        "predictions": predictions,
        "lower_bound": lower,
        "upper_bound": upper,
        "periods": periods,
        "confidence": 0.85,
        "sources": {
            "actuel": current_inflation,
            "bdf_2026": target_2026,
            "bdf_2027": target_2027
        },
        "methodology": "Interpolation vers prévisions Banque de France"
    }


# ============================================================================
# PRÉVISIONS CHÔMAGE - BASÉES SUR BANQUE DE FRANCE
# ============================================================================

def predict_unemployment(
    current_unemployment: float,
    bdf_forecast_2026: float,
    bdf_forecast_2027: float,
    horizon_quarters: int = 4
) -> Dict:
    """
    Prévision de chômage ANCRÉE sur les projections Banque de France.
    """
    month, year = get_current_month_year()
    
    # Déterminer le trimestre actuel
    current_quarter = (month - 1) // 3 + 1
    
    predictions = []
    periods = []
    
    current = current_unemployment
    target_2026 = bdf_forecast_2026 or 7.7
    target_2027 = bdf_forecast_2027 or 7.6
    
    q, y = current_quarter, year
    
    for i in range(horizon_quarters):
        q += 1
        if q > 4:
            q = 1
            y += 1
        
        periods.append(f"T{q} {y}")
        
        # Cible selon l'année
        target = target_2026 if y <= 2026 else target_2027
        
        # Convergence lente (chômage = inertie forte)
        progress = (i + 1) / horizon_quarters
        pred = current + (target - current) * progress * 0.8
        
        predictions.append(round(pred, 1))
        current = pred
    
    lower, upper = calculate_confidence_bounds(predictions, VOLATILITY['chomage'])
    
    return {
        "predictions": predictions,
        "lower_bound": lower,
        "upper_bound": upper,
        "periods": periods,
        "confidence": 0.82,
        "sources": {
            "actuel": current_unemployment,
            "bdf_2026": target_2026,
            "bdf_2027": target_2027
        },
        "methodology": "Interpolation vers prévisions Banque de France"
    }


# ============================================================================
# PRÉVISIONS SMIC - RÈGLES LÉGALES
# ============================================================================

def predict_smic(
    current_brut: float,
    current_net: float,
    last_reva_date: str,
    inflation_forecast: List[float],
    inflation_periods: List[str],
    bdf_inflation_2026: float,
    bdf_inflation_2027: float
) -> Dict:
    """
    Prévision SMIC basée sur les RÈGLES LÉGALES.
    
    Garanties :
    - Toujours une revalorisation au 1er janvier (certain)
    - Revalorisation = inflation prévue + marge (historiquement ~0.3-0.5%)
    """
    month, year = get_current_month_year()
    
    events = []
    running_brut = current_brut
    running_net = current_net
    
    # Prochaine revalorisation janvier
    next_january_year = year + 1 if month >= 1 else year
    
    # Estimation de la hausse basée sur l'inflation prévue BDF
    # Historiquement : SMIC = inflation + 0.3 à 0.5%
    base_inflation = bdf_inflation_2026 if next_january_year == 2026 else bdf_inflation_2027
    
    # Estimation prudente : inflation + 0.3% (hors coup de pouce)
    estimated_increase = round(max(1.0, base_inflation + 0.3), 1)
    
    new_brut = round(running_brut * (1 + estimated_increase / 100), 2)
    new_net = round(new_brut * 0.792, 2)  # Ratio net/brut standard
    
    events.append({
        "date": f"{next_january_year}-01-01",
        "type": "janvier",
        "probability": 1.0,
        "estimated_increase_pct": estimated_increase,
        "estimated_new_smic_brut": new_brut,
        "estimated_new_smic_net": new_net,
        "trigger": "Revalorisation annuelle obligatoire",
        "legal_basis": "Code du travail, art. L3231-5",
        "confidence": "haute",
        "details": {
            "base_inflation_bdf": base_inflation,
            "marge_estimee": round(estimated_increase - base_inflation, 1)
        }
    })
    
    running_brut = new_brut
    running_net = new_net
    
    # Vérifier si revalorisation automatique possible en cours d'année
    # (si inflation cumulée > 2% depuis dernière reva)
    cumul_inflation = sum(inflation_forecast[:6]) / 6 * 0.5  # Approximation 6 mois
    
    if cumul_inflation >= SMIC_INFLATION_THRESHOLD:
        # Possible revalorisation auto (mais rare)
        auto_date = f"{next_january_year}-07-01"  # Hypothèse juillet
        auto_increase = round(cumul_inflation, 1)
        
        events.append({
            "date": auto_date,
            "type": "automatique",
            "probability": 0.3,  # Peu probable en contexte inflation basse
            "estimated_increase_pct": auto_increase,
            "estimated_new_smic_brut": round(running_brut * (1 + auto_increase / 100), 2),
            "estimated_new_smic_net": round(running_brut * (1 + auto_increase / 100) * 0.792, 2),
            "trigger": f"Seuil 2% atteint (inflation cumulée {cumul_inflation:.1f}%)",
            "legal_basis": "Code du travail, art. L3231-5",
            "confidence": "basse"
        })
    
    # Calcul final sur 12 mois
    total_increase = ((running_brut / current_brut) - 1) * 100
    
    return {
        "current": {
            "brut": current_brut,
            "net": current_net,
            "horaire_brut": round(current_brut / 151.67, 2),
            "last_revalorisation": last_reva_date
        },
        "events": events,
        "forecast_12m": {
            "total_increase_pct": round(total_increase, 1),
            "final_smic_brut": round(running_brut, 2),
            "final_smic_net": round(running_net, 2)
        },
        "methodology": "Règles légales + inflation BDF"
    }


# ============================================================================
# GÉNÉRATION DES NOTES DE LECTURE (ex-arguments NAO)
# ============================================================================

def generate_notes_lecture(
    inflation_actuel: float,
    inflation_prev_6m: float,
    smic_events: List[Dict],
    chomage_actuel: float,
    chomage_prev: float,
    difficultes_recrutement: int,
    inflation_cumulee_2022: float = 12.0  # Environ 12% depuis 2022
) -> List[str]:
    """
    Génère des notes de lecture factuelles et sourcées.
    Format similaire aux autres notes du dashboard.
    """
    notes = []
    
    # Note 1 : Inflation
    tendance_inflation = "en hausse" if inflation_prev_6m > inflation_actuel else "stable" if abs(inflation_prev_6m - inflation_actuel) < 0.3 else "en baisse"
    notes.append(
        f"📈 Inflation prévue à 6 mois : {inflation_prev_6m}% ({tendance_inflation} vs {inflation_actuel}% actuel) — Source : modèle CFTC basé sur Banque de France"
    )
    
    # Note 2 : SMIC
    if smic_events:
        evt = smic_events[0]
        notes.append(
            f"💰 Prochaine revalorisation SMIC : {evt['date']} → {evt['estimated_new_smic_brut']:.0f}€ brut (+{evt['estimated_increase_pct']}%) — Obligatoire (Code du travail)"
        )
    
    # Note 3 : Chômage
    tendance_chomage = "hausse" if chomage_prev > chomage_actuel + 0.2 else "baisse" if chomage_prev < chomage_actuel - 0.2 else "stable"
    notes.append(
        f"👥 Chômage prévu : {chomage_prev}% (tendance {tendance_chomage}) — Le marché du travail reste tendu"
    )
    
    # Note 4 : Difficultés de recrutement
    notes.append(
        f"🏢 {difficultes_recrutement}% des entreprises déclarent des difficultés de recrutement — Argument pour négocier"
    )
    
    # Note 5 : Inflation cumulée (argument clé)
    notes.append(
        f"⚠️ Rappel : l'inflation cumulée depuis 2022 est d'environ {inflation_cumulee_2022}% — Les salaires doivent rattraper"
    )
    
    # Note 6 : Conseil pratique
    augmentation_mini = max(2.0, inflation_prev_6m + 0.5)
    notes.append(
        f"💡 Pour maintenir le pouvoir d'achat, une augmentation minimale de {augmentation_mini:.1f}% est recommandée"
    )
    
    return notes


# ============================================================================
# GÉNÉRATION DES SCÉNARIOS
# ============================================================================

def generate_scenarios(
    inflation_central: float,
    inflation_lower: float,
    inflation_upper: float,
    chomage_central: float,
    chomage_lower: float,
    chomage_upper: float,
    smic_increase: float,
    pib_bdf: float
) -> Dict:
    """Génère 3 scénarios cohérents."""
    
    return {
        "optimiste": {
            "inflation_12m": inflation_lower,
            "chomage_q4": chomage_lower,
            "smic_increase": f"+{round(smic_increase + 0.5, 1)}%",
            "pib": f"+{round(pib_bdf + 0.5, 1)}%",
            "hypotheses": "Baisse de l'énergie, reprise européenne, consommation soutenue"
        },
        "central": {
            "inflation_12m": inflation_central,
            "chomage_q4": chomage_central,
            "smic_increase": f"+{smic_increase}%",
            "pib": f"+{pib_bdf}%",
            "hypotheses": "Scénario Banque de France (décembre 2025)"
        },
        "pessimiste": {
            "inflation_12m": inflation_upper,
            "chomage_q4": chomage_upper,
            "smic_increase": f"+{max(1.0, round(smic_increase - 0.5, 1))}%",
            "pib": f"+{max(0.3, round(pib_bdf - 0.5, 1))}%",
            "hypotheses": "Tensions géopolitiques, hausse énergie, ralentissement mondial"
        }
    }


# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================

def generate_predictions_for_data(data: Dict) -> Dict:
    """
    Génère les prévisions CFTC v3 et les ajoute à data.
    """
    now = datetime.now()
    
    # === EXTRACTION DES DONNÉES ===
    indicateurs = data.get('indicateurs_cles', {})
    smic = data.get('smic', {})
    prev_bdf = data.get('previsions', {}).get('banque_de_france', {})
    
    # Valeurs actuelles
    inflation_actuel = indicateurs.get('inflation_annuelle', 1.5)
    chomage_actuel = indicateurs.get('taux_chomage_actuel', 7.5)
    difficultes_recrutement = indicateurs.get('difficultes_recrutement', 60)
    
    # Prévisions Banque de France
    bdf_inflation_2026 = prev_bdf.get('inflation_ipch', {}).get('2026', 1.4)
    bdf_inflation_2027 = prev_bdf.get('inflation_ipch', {}).get('2027', 1.6)
    bdf_chomage_2026 = prev_bdf.get('taux_chomage', {}).get('2026', 7.7)
    bdf_chomage_2027 = prev_bdf.get('taux_chomage', {}).get('2027', 7.6)
    bdf_pib_2026 = prev_bdf.get('pib_croissance', {}).get('2026', 1.0)
    
    # Conversion si string
    if isinstance(bdf_inflation_2026, str):
        bdf_inflation_2026 = float(bdf_inflation_2026)
    if isinstance(bdf_chomage_2026, str):
        bdf_chomage_2026 = float(bdf_chomage_2026)
    if isinstance(bdf_pib_2026, str):
        bdf_pib_2026 = float(bdf_pib_2026)
    
    # SMIC actuel
    current_smic_brut = smic.get('montant_brut', 1823.03)
    current_smic_net = smic.get('montant_net', 1443.11)
    last_reva = smic.get('date_vigueur', f"{now.year}-01-01")
    
    # === PRÉVISIONS ===
    
    # 1. Inflation
    inflation_pred = predict_inflation(
        current_inflation=inflation_actuel,
        bdf_forecast_2026=bdf_inflation_2026,
        bdf_forecast_2027=bdf_inflation_2027,
        horizon_months=12
    )
    
    # 2. Chômage
    chomage_pred = predict_unemployment(
        current_unemployment=chomage_actuel,
        bdf_forecast_2026=bdf_chomage_2026,
        bdf_forecast_2027=bdf_chomage_2027,
        horizon_quarters=4
    )
    
    # 3. SMIC
    smic_pred = predict_smic(
        current_brut=current_smic_brut,
        current_net=current_smic_net,
        last_reva_date=last_reva,
        inflation_forecast=inflation_pred['predictions'],
        inflation_periods=inflation_pred['periods'],
        bdf_inflation_2026=bdf_inflation_2026,
        bdf_inflation_2027=bdf_inflation_2027
    )
    
    # 4. Scénarios
    scenarios = generate_scenarios(
        inflation_central=inflation_pred['predictions'][-1],
        inflation_lower=inflation_pred['lower_bound'][-1],
        inflation_upper=inflation_pred['upper_bound'][-1],
        chomage_central=chomage_pred['predictions'][-1],
        chomage_lower=chomage_pred['lower_bound'][-1],
        chomage_upper=chomage_pred['upper_bound'][-1],
        smic_increase=smic_pred['events'][0]['estimated_increase_pct'] if smic_pred['events'] else 2.0,
        pib_bdf=bdf_pib_2026
    )
    
    # 5. Notes de lecture (remplace arguments NAO)
    notes_lecture = generate_notes_lecture(
        inflation_actuel=inflation_actuel,
        inflation_prev_6m=inflation_pred['predictions'][5] if len(inflation_pred['predictions']) > 5 else inflation_actuel,
        smic_events=smic_pred['events'],
        chomage_actuel=chomage_actuel,
        chomage_prev=chomage_pred['predictions'][-1] if chomage_pred['predictions'] else chomage_actuel,
        difficultes_recrutement=difficultes_recrutement
    )
    
    # === ASSEMBLAGE ===
    predictions = {
        "generated_at": now.isoformat(),
        "model_version": "CFTC v3.0",
        "horizon": "12 mois",
        
        "inflation": {
            "actuel": inflation_actuel,
            "prevision_6m": inflation_pred['predictions'][5] if len(inflation_pred['predictions']) > 5 else inflation_actuel,
            "prevision_12m": inflation_pred['predictions'][-1],
            "tendance": "hausse" if inflation_pred['predictions'][-1] > inflation_actuel + 0.2 else "baisse" if inflation_pred['predictions'][-1] < inflation_actuel - 0.2 else "stable",
            "confidence": inflation_pred['confidence'],
            "mensuel": inflation_pred,
            "insight": f"L'inflation devrait converger vers {bdf_inflation_2026}% fin 2026 (prévision Banque de France)."
        },
        
        "smic": smic_pred,
        
        "chomage": {
            "actuel": chomage_actuel,
            "prevision_q4": chomage_pred['predictions'][-1] if chomage_pred['predictions'] else chomage_actuel,
            "tendance": "hausse" if chomage_pred['predictions'][-1] > chomage_actuel + 0.2 else "baisse" if chomage_pred['predictions'][-1] < chomage_actuel - 0.2 else "stable",
            "confidence": chomage_pred['confidence'],
            "trimestriel": chomage_pred,
            "insight": f"Le chômage devrait rester autour de {bdf_chomage_2026}% en 2026 (prévision Banque de France)."
        },
        
        "scenarios": scenarios,
        
        "notes_lecture": notes_lecture,
        
        "sources": [
            "Banque de France - Projections macroéconomiques (décembre 2025)",
            "INSEE - Indices des prix à la consommation",
            "Code du travail - Articles L3231-4 à L3231-11 (SMIC)",
            "Modèle CFTC v3.0 - Interpolation et règles légales"
        ],
        
        "disclaimer": "Prévisions basées sur les projections Banque de France et les règles légales. Les données institutionnelles font référence."
    }
    
    return predictions


# ============================================================================
# MAIN
# ============================================================================

def main(data_path: str = "public/data.json", output_path: str = None):
    """Charge data.json, génère les prévisions v3, et sauvegarde."""
    
    print("🔮 Génération des prévisions CFTC v3.0...")
    
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    predictions = generate_predictions_for_data(data)
    data['previsions_cftc'] = predictions
    
    output = output_path or data_path
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Prévisions v3 ajoutées à {output}")
    
    # Résumé
    print("\n" + "=" * 60)
    print("🔮 RÉSUMÉ DES PRÉVISIONS CFTC v3.0")
    print("=" * 60)
    
    print(f"\n📈 INFLATION (source: Banque de France)")
    print(f"   Actuelle : {predictions['inflation']['actuel']}%")
    print(f"   Prévue 6 mois : {predictions['inflation']['prevision_6m']}%")
    print(f"   Prévue 12 mois : {predictions['inflation']['prevision_12m']}%")
    print(f"   IC 90% : [{predictions['inflation']['mensuel']['lower_bound'][-1]}% - {predictions['inflation']['mensuel']['upper_bound'][-1]}%]")
    
    print(f"\n💰 SMIC")
    if predictions['smic']['events']:
        evt = predictions['smic']['events'][0]
        print(f"   Prochaine reva : {evt['date']}")
        print(f"   Hausse : +{evt['estimated_increase_pct']}%")
        print(f"   Nouveau brut : {evt['estimated_new_smic_brut']:.2f}€")
    
    print(f"\n👥 CHÔMAGE (source: Banque de France)")
    print(f"   Actuel : {predictions['chomage']['actuel']}%")
    print(f"   Prévu Q4 : {predictions['chomage']['prevision_q4']}%")
    
    print(f"\n📝 NOTES DE LECTURE")
    for note in predictions['notes_lecture'][:3]:
        print(f"   • {note[:70]}...")
    
    print("\n" + "=" * 60)
    
    return data


if __name__ == "__main__":
    import sys
    data_path = sys.argv[1] if len(sys.argv) > 1 else "public/data.json"
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        main(data_path, output_path)
    except FileNotFoundError:
        print(f"❌ Fichier non trouvé : {data_path}")
        exit(1)
    except Exception as e:
        print(f"❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
        exit(1)
