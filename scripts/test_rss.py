#!/usr/bin/env python3
"""
Diagnostic des flux RSS — à lancer sur votre machine.
Affiche pour chaque source : statut HTTP, nb articles, et l'URL corrigée si besoin.

Usage : python3 test_rss.py
"""

import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
import re

# Sources mises à jour après diagnostic du 17/03/2026
# Institutions FR abandonnées : INSEE(500), DARES(SPA), BdF(404),
# MinTravail(SPA), FranceTravail(SPA), UNEDIC(404), CComptes(timeout),
# OFCE(404), LesEchos(403), OCDE(403)
SOURCES = [
    {"nom": "Le Monde Éco",       "url": "https://www.lemonde.fr/economie/rss_full.xml"},
    {"nom": "Le Monde Emploi",    "url": "https://www.lemonde.fr/emploi/rss_full.xml"},
    {"nom": "Libération Éco",     "url": "https://www.liberation.fr/arc/outboundfeeds/rss/category/economie/"},
    {"nom": "Le Figaro Éco",      "url": "https://www.lefigaro.fr/rss/figaro_economie.xml"},
    {"nom": "L'Humanité Social",  "url": "https://www.humanite.fr/rss.xml"},
    {"nom": "Terra Nova",         "url": "https://tnova.fr/feed/"},
    {"nom": "Institut Montaigne", "url": "https://www.institutmontaigne.org/rss.xml"},
    {"nom": "La Croix Social",    "url": "https://www.la-croix.com/rss/economie.rss"},
    {"nom": "Euractiv FR",        "url": "https://www.euractiv.fr/feed/"},
    {"nom": "Service-Public.fr",  "url": "https://www.service-public.fr/rss/particuliers.xml"},
    {"nom": "INSEE Données",      "url": "https://www.insee.fr/rss/donnees"},
    {"nom": "BNP Research",       "url": "https://economic-research.bnpparibas.com/RSS/fr-FR"},
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

def test_url(url):
    """Teste une URL RSS. Retourne (status, nb_articles, erreur)."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            raw = resp.read()
            encoding = resp.headers.get_content_charset() or "utf-8"
            content = raw.decode(encoding, errors="replace")

        # Compter les items/entries
        items  = len(re.findall(r'<item[\s>]', content, re.IGNORECASE))
        entries = len(re.findall(r'<entry[\s>]', content, re.IGNORECASE))
        nb = items + entries

        # Extraire le premier titre
        m = re.search(r'<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', content, re.DOTALL)
        premier_titre = m.group(1).strip()[:60] if m else "—"

        return status, nb, None, premier_titre

    except urllib.error.HTTPError as e:
        return e.code, 0, str(e), ""
    except urllib.error.URLError as e:
        return 0, 0, str(e.reason), ""
    except Exception as e:
        return 0, 0, str(e)[:80], ""


print("=" * 70)
print("🔍 DIAGNOSTIC FLUX RSS — CFTC Dashboard")
print("=" * 70)
print()

resultats_ok = []
resultats_ko = []

for source in SOURCES:
    nom = source["nom"]
    url = source["url"]

    print(f"📡 {nom}")
    print(f"   URL principale : {url}")

    status, nb, erreur, titre = test_url(url)

    if nb > 0:
        print(f"   ✅ OK — {nb} articles | Premier titre : {titre}")
        resultats_ok.append({"nom": nom, "url": url, "nb": nb})
    else:
        print(f"   ❌ KO — HTTP {status} | {erreur}")
        resultats_ko.append({"nom": nom, "url_principale": url})

    print()

# --- Résumé ---
print("=" * 70)
print(f"✅ Sources fonctionnelles : {len(resultats_ok)}/{len(SOURCES)}")
for r in resultats_ok:
    print(f"   · {r['nom']:25} {r['nb']:3} articles — {r['url']}")

print()
print(f"❌ Sources à corriger : {len(resultats_ko)}/{len(SOURCES)}")
for r in resultats_ko:
    print(f"   · {r['nom']:25} {r['url_principale']}")

# --- Générer le correctif fetch_data.py ---
if resultats_ok:
    print()
    print("=" * 70)
    print("📋 COPIER-COLLER ce bloc dans fetch_data.py (SOURCES = [...])")
    print("=" * 70)
    print()
    print("    SOURCES = [")
    COULEURS = {
        "Le Monde Éco":       ("#374151", "🌐", "Presse économique"),
        "Le Monde Emploi":    ("#1f2937", "💼", "Emploi & travail"),
        "Libération Éco":     ("#dc2626", "📰", "Presse économique"),
        "Le Figaro Éco":      ("#92400e", "📊", "Presse économique"),
        "L'Humanité Social":  ("#b91c1c", "✊", "Social & travail"),
        "Terra Nova":         ("#0369a1", "🔬", "Recherche politique"),
        "Institut Montaigne": ("#1d4ed8", "🏛️",  "Recherche économique"),
        "La Croix Social":    ("#065f46", "⚖️",  "Social & travail"),
        "Euractiv FR":        ("#0369a1", "🇪🇺", "Europe & politique"),
        "Service-Public.fr":  ("#1e40af", "🏛️",  "Droit & réglementation"),
        "INSEE Données":      ("#1e40af", "📊", "Statistiques nationales"),
        "BNP Research":       ("#16a34a", "🏦", "Conjoncture & finances"),
    }
    for r in resultats_ok:
        c, e, t = COULEURS.get(r["nom"], ("#6b7280", "📄", "Actualités"))
        print(f'        {{"nom": "{r["nom"]}", "url": "{r["url"]}", "couleur": "{c}", "emoji": "{e}", "tag": "{t}"}},')
    print("    ]")
