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

SOURCES = [
    {"nom": "INSEE",              "url": "https://www.insee.fr/fr/rss/actu.xml"},
    {"nom": "DARES",              "url": "https://dares.travail-emploi.gouv.fr/rss.xml"},
    {"nom": "Banque de France",   "url": "https://www.banque-france.fr/rss/publications.xml"},
    {"nom": "Ministère Travail",  "url": "https://travail-emploi.gouv.fr/rss.xml"},
    {"nom": "Eurostat",           "url": "https://ec.europa.eu/eurostat/rss/fr/news-rss.xml"},
    {"nom": "France Travail",     "url": "https://www.francetravail.fr/accueil/rss/actualites.xml"},
    {"nom": "UNEDIC",             "url": "https://www.unedic.org/rss.xml"},
    {"nom": "Cour des comptes",   "url": "https://www.ccomptes.fr/fr/rss/publications"},
    {"nom": "OFCE",               "url": "https://www.ofce.sciences-po.fr/rss/blog.xml"},
    {"nom": "Les Échos",          "url": "https://www.lesechos.fr/rss/rss_une.xml"},
    {"nom": "Le Monde Éco",       "url": "https://www.lemonde.fr/economie/rss_full.xml"},
    {"nom": "OCDE",               "url": "https://www.oecd.org/fr/rss/actu.xml"},
]

# URLs alternatives à tester si la principale échoue
ALTERNATIVES = {
    "INSEE":            [
        "https://www.insee.fr/fr/statistiques/flux.rss",
        "https://www.insee.fr/fr/information/flux-rss",
    ],
    "DARES":            [
        "https://dares.travail-emploi.gouv.fr/publications/rss.xml",
        "https://travail-emploi.gouv.fr/rss/dares.xml",
    ],
    "Banque de France": [
        "https://www.banque-france.fr/rss/actualites.xml",
        "https://www.banque-france.fr/rss/communiques.xml",
        "https://www.banque-france.fr/fr/publications-et-statistiques/publications/rss.xml",
    ],
    "Ministère Travail":[
        "https://travail-emploi.gouv.fr/rss/actualites.xml",
        "https://travail-emploi.gouv.fr/rss/publications.xml",
    ],
    "Eurostat":         [
        "https://ec.europa.eu/eurostat/rss/news-rss.xml",
        "https://ec.europa.eu/eurostat/rss/en/news-rss.xml",
    ],
    "France Travail":   [
        "https://www.francetravail.fr/actualites/rss.xml",
        "https://www.pole-emploi.fr/rss/actualites.xml",
    ],
    "UNEDIC":           [
        "https://www.unedic.org/publications/rss",
        "https://www.unedic.org/actus/rss.xml",
    ],
    "Cour des comptes": [
        "https://www.ccomptes.fr/fr/flux-rss",
        "https://www.ccomptes.fr/rss.xml",
    ],
    "OFCE":             [
        "https://www.ofce.sciences-po.fr/rss.xml",
        "https://blog.ofce.sciences-po.fr/feed/",
        "https://www.ofce.sciences-po.fr/blog/feed/",
    ],
    "Les Échos":        [
        "https://www.lesechos.fr/rss/rss_finance.xml",
        "https://www.lesechos.fr/rss/rss_economie.xml",
        "https://services.lesechos.fr/rss/les-echos-economie.xml",
    ],
    "OCDE":             [
        "https://www.oecd.org/rss/publications.xml",
        "https://www.oecd-ilibrary.org/rss",
        "https://oecdinsights.org/feed/",
    ],
}

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

        # Tester les alternatives
        alternatives = ALTERNATIVES.get(nom, [])
        trouvee = False
        for alt_url in alternatives:
            alt_status, alt_nb, alt_err, alt_titre = test_url(alt_url)
            if alt_nb > 0:
                print(f"   ✅ ALTERNATIVE OK : {alt_url}")
                print(f"      → {alt_nb} articles | {alt_titre}")
                resultats_ok.append({"nom": nom, "url": alt_url, "nb": alt_nb})
                trouvee = True
                break
            else:
                print(f"   ⚠️  Alt KO ({alt_status}) : {alt_url}")

        if not trouvee:
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
        "INSEE":             ("#1e40af", "📊", "Statistiques nationales"),
        "DARES":             ("#065f46", "👥", "Emploi & travail"),
        "Banque de France":  ("#7c3aed", "🏦", "Conjoncture & finances"),
        "Ministère Travail": ("#b45309", "⚖️",  "Droit du travail"),
        "Eurostat":          ("#0369a1", "🇪🇺", "Comparaison européenne"),
        "France Travail":    ("#0891b2", "🎯", "Marché de l'emploi"),
        "UNEDIC":            ("#0f766e", "🛡️",  "Assurance chômage"),
        "Cour des comptes":  ("#dc2626", "⚖️",  "Finances publiques"),
        "OFCE":              ("#7e22ce", "🔬", "Recherche économique"),
        "Les Échos":         ("#ea580c", "📰", "Presse économique"),
        "Le Monde Éco":      ("#374151", "🌐", "Presse économique"),
        "OCDE":              ("#1d4ed8", "🌍", "Comparaisons internationales"),
    }
    for r in resultats_ok:
        c, e, t = COULEURS.get(r["nom"], ("#6b7280", "📄", "Actualités"))
        print(f'        {{"nom": "{r["nom"]}", "url": "{r["url"]}", "couleur": "{c}", "emoji": "{e}", "tag": "{t}"}},')
    print("    ]")
