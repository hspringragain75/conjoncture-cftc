#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Générateur de rapport PDF pour les NAO - CFTC
Génère un PDF professionnel avec tous les arguments et données clés pour les négociations.

Usage:
    python generate_pdf_nao.py [data.json] [output.pdf]
    
Si aucun argument, utilise /mnt/user-data/public/data.json et génère rapport_nao.pdf
"""

import json
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    PageBreak, Image, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY


def load_data(filepath):
    """Charge les données JSON"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def create_styles():
    """Crée les styles personnalisés pour le rapport"""
    styles = getSampleStyleSheet()
    
    # Titre principal
    styles.add(ParagraphStyle(
        name='TitreRapport',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=20,
        alignment=TA_CENTER
    ))
    
    # Sous-titre
    styles.add(ParagraphStyle(
        name='SousTitre',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor('#475569'),
        spaceAfter=30,
        alignment=TA_CENTER
    ))
    
    # Titre de section
    styles.add(ParagraphStyle(
        name='TitreSection',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceBefore=20,
        spaceAfter=10,
        borderColor=colors.HexColor('#1e40af'),
        borderWidth=0,
        borderPadding=5
    ))
    
    # Titre de sous-section
    styles.add(ParagraphStyle(
        name='TitreSousSection',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=colors.HexColor('#334155'),
        spaceBefore=15,
        spaceAfter=8
    ))
    
    # Texte normal
    styles.add(ParagraphStyle(
        name='TexteNormal',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY
    ))
    
    # Argument NAO (encadré)
    styles.add(ParagraphStyle(
        name='ArgumentNAO',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1e3a8a'),
        backColor=colors.HexColor('#eff6ff'),
        borderColor=colors.HexColor('#3b82f6'),
        borderWidth=1,
        borderPadding=8,
        spaceBefore=5,
        spaceAfter=5
    ))
    
    # Chiffre clé
    styles.add(ParagraphStyle(
        name='ChiffreCle',
        parent=styles['Normal'],
        fontSize=18,
        textColor=colors.HexColor('#059669'),
        alignment=TA_CENTER,
        spaceBefore=5,
        spaceAfter=2
    ))
    
    # Label chiffre
    styles.add(ParagraphStyle(
        name='LabelChiffre',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#64748b'),
        alignment=TA_CENTER
    ))
    
    # Pied de page
    styles.add(ParagraphStyle(
        name='PiedPage',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94a3b8'),
        alignment=TA_CENTER
    ))
    
    return styles


def create_kpi_table(data_list, styles):
    """Crée un tableau de KPIs (chiffres clés)"""
    # data_list = [(valeur, label), ...]
    cells = []
    for val, label in data_list:
        cell_content = [
            Paragraph(f"<b>{val}</b>", styles['ChiffreCle']),
            Paragraph(label, styles['LabelChiffre'])
        ]
        cells.append(cell_content)
    
    # Créer le tableau
    n_cols = min(4, len(cells))
    rows = []
    for i in range(0, len(cells), n_cols):
        row = cells[i:i+n_cols]
        # Compléter si nécessaire
        while len(row) < n_cols:
            row.append(['', ''])
        rows.append(row)
    
    table = Table(rows, colWidths=[4.5*cm] * n_cols)
    table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    return table


def create_data_table(headers, rows, col_widths=None):
    """Crée un tableau de données"""
    data = [headers] + rows
    
    if col_widths is None:
        col_widths = [4*cm] * len(headers)
    
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        # En-tête
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        # Corps
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        # Bordures
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        # Padding
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        # Alternance couleurs
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    
    return table


def add_argument_box(story, title, arguments, styles):
    """Ajoute un encadré d'arguments NAO"""
    content = f"<b>💡 {title}</b><br/><br/>"
    for arg in arguments:
        content += f"• {arg}<br/>"
    
    story.append(Paragraph(content, styles['ArgumentNAO']))
    story.append(Spacer(1, 10))


def generate_rapport_nao(data, output_path):
    """Génère le rapport PDF complet"""
    
    styles = create_styles()
    
    # Créer le document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    story = []
    
    # ===== PAGE DE TITRE =====
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph("RAPPORT NAO", styles['TitreRapport']))
    story.append(Paragraph("Négociation Annuelle Obligatoire", styles['SousTitre']))
    story.append(Spacer(1, 1*cm))
    
    # Date et source
    date_maj = data.get('meta', {}).get('derniere_mise_a_jour', datetime.now().strftime('%Y-%m-%d'))
    story.append(Paragraph(f"<b>Données au {date_maj}</b>", styles['SousTitre']))
    story.append(Spacer(1, 2*cm))
    
    # KPIs principaux
    inflation = data.get('inflation', {}).get('taux_annuel', 1.3)
    smic = data.get('smic', {}).get('montant_net', 1443)
    
    # Chômage - prendre le dernier trimestre de la liste
    chomage_list = data.get('chomage', [])
    if isinstance(chomage_list, list) and chomage_list:
        chomage = chomage_list[-1].get('taux', 7.3)
        chomage_jeunes = chomage_list[-1].get('jeunes', 17.3)
    else:
        chomage = 7.3
        chomage_jeunes = 17.3
    
    kpis = [
        (f"{inflation}%", "Inflation"),
        (f"{smic}€", "SMIC net"),
        (f"{chomage}%", "Chômage"),
        (f"+2.5%", "Salaires prévus 2026")
    ]
    story.append(create_kpi_table(kpis, styles))
    
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("Document généré par le Dashboard NAO CFTC", styles['PiedPage']))
    story.append(PageBreak())
    
    # ===== SECTION 1: CONTEXTE ÉCONOMIQUE =====
    story.append(Paragraph("1. Contexte économique", styles['TitreSection']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1e40af')))
    story.append(Spacer(1, 10))
    
    # Prévisions
    prev = data.get('previsions', {})
    bdf = prev.get('banque_de_france', {})
    
    story.append(Paragraph("1.1 Prévisions macroéconomiques (Banque de France)", styles['TitreSousSection']))
    
    if bdf:
        headers = ['Indicateur', '2024', '2025', '2026', '2027']
        rows = [
            ['PIB (%)', str(bdf.get('pib_croissance', {}).get('2024', '-')),
             str(bdf.get('pib_croissance', {}).get('2025', '-')),
             str(bdf.get('pib_croissance', {}).get('2026', '-')),
             str(bdf.get('pib_croissance', {}).get('2027', '-'))],
            ['Inflation IPCH (%)', str(bdf.get('inflation_ipch', {}).get('2024', '-')),
             str(bdf.get('inflation_ipch', {}).get('2025', '-')),
             str(bdf.get('inflation_ipch', {}).get('2026', '-')),
             str(bdf.get('inflation_ipch', {}).get('2027', '-'))],
            ['Chômage (%)', str(bdf.get('taux_chomage', {}).get('2024', '-')),
             str(bdf.get('taux_chomage', {}).get('2025', '-')),
             str(bdf.get('taux_chomage', {}).get('2026', '-')),
             str(bdf.get('taux_chomage', {}).get('2027', '-'))],
            ['Salaires nominaux (%)', str(bdf.get('salaires_nominaux', {}).get('2024', '-')),
             str(bdf.get('salaires_nominaux', {}).get('2025', '-')),
             str(bdf.get('salaires_nominaux', {}).get('2026', '-')),
             str(bdf.get('salaires_nominaux', {}).get('2027', '-'))],
        ]
        story.append(create_data_table(headers, rows, [5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm]))
        story.append(Spacer(1, 15))
    
    # Arguments NAO prévisions
    if prev.get('arguments_nao'):
        add_argument_box(story, "Arguments NAO - Prévisions", prev['arguments_nao'][:5], styles)
    
    # ===== SECTION 2: INFLATION =====
    story.append(Paragraph("1.2 Évolution de l'inflation", styles['TitreSousSection']))
    
    hist = data.get('historique_5ans', {})
    if hist.get('inflation'):
        infl = hist['inflation']
        annees = hist.get('annees', [2020, 2021, 2022, 2023, 2024, 2025])
        headers = ['Année'] + [str(a) for a in annees]
        rows = [['Inflation (%)'] + [str(v) for v in infl.get('valeurs', [])]]
        story.append(create_data_table(headers, rows, [3*cm] + [2*cm]*len(annees)))
        story.append(Spacer(1, 10))
        
        # Inflation cumulée
        if hist.get('calculs_derives', {}).get('inflation_cumulee'):
            story.append(Paragraph(
                f"<b>Inflation cumulée 2020-2025 : {hist['calculs_derives']['inflation_cumulee']}%</b>",
                styles['TexteNormal']
            ))
    
    story.append(PageBreak())
    
    # ===== SECTION 2: SALAIRES =====
    story.append(Paragraph("2. Salaires et pouvoir d'achat", styles['TitreSection']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1e40af')))
    story.append(Spacer(1, 10))
    
    # SMIC
    smic_data = data.get('smic', {})
    story.append(Paragraph("2.1 SMIC", styles['TitreSousSection']))
    
    kpis_smic = [
        (f"{smic_data.get('montant_brut', 1823)}€", "SMIC brut"),
        (f"{smic_data.get('montant_net', 1443)}€", "SMIC net"),
        (f"{smic_data.get('taux_horaire', 12.02)}€", "Taux horaire"),
        (f"+{smic_data.get('evolution_depuis_2020', 17)}%", "Évol. depuis 2020")
    ]
    story.append(create_kpi_table(kpis_smic, styles))
    story.append(Spacer(1, 15))
    
    # Salaires médians
    story.append(Paragraph("2.2 Salaires médians par CSP", styles['TitreSousSection']))
    
    sal = data.get('salaires_medians', {})
    if sal.get('par_csp'):
        headers = ['CSP', 'Médiane (€)', 'Évolution']
        rows = [[c['csp'], f"{c['median']}€", f"+{c.get('evolution', '-')}%"] for c in sal['par_csp'][:5]]
        story.append(create_data_table(headers, rows, [6*cm, 4*cm, 4*cm]))
    
    # Arguments NAO salaires
    arguments_salaires = [
        f"Inflation cumulée depuis 2020 : {hist.get('calculs_derives', {}).get('inflation_cumulee', 14)}% - rattrapage nécessaire",
        f"SMIC revalorisé de {smic_data.get('evolution_depuis_2020', 17)}% depuis 2020",
        f"Prévision salaires 2026 : +2.5% (Banque de France)",
        "Écart salaire médian H/F : 14.9% - réduction à négocier",
        "Pouvoir d'achat en baisse pour les bas salaires depuis 2022"
    ]
    add_argument_box(story, "Arguments NAO - Salaires", arguments_salaires, styles)
    
    story.append(PageBreak())
    
    # ===== SECTION 3: EMPLOI =====
    story.append(Paragraph("3. Emploi et marché du travail", styles['TitreSection']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1e40af')))
    story.append(Spacer(1, 10))
    
    # Chômage
    story.append(Paragraph("3.1 Taux de chômage", styles['TitreSousSection']))
    
    # Utiliser les données déjà extraites
    kpis_chomage = [
        (f"{chomage}%", "Taux national"),
        (f"{chomage_jeunes}%", "Jeunes 15-24 ans"),
        (f"5.4%", "Seniors 50+"),
    ]
    story.append(create_kpi_table(kpis_chomage, styles))
    story.append(Spacer(1, 15))
    
    # Données régionales
    reg = data.get('donnees_regionales', {})
    if reg.get('regions'):
        story.append(Paragraph("3.2 Disparités régionales", styles['TitreSousSection']))
        headers = ['Région', 'Chômage', 'Salaire médian', 'Tensions']
        rows = [[r['nom'], f"{r['chomage']}%", f"{r['salaire_median']}€", f"{r['tensions']}%"] 
                for r in sorted(reg['regions'], key=lambda x: x['chomage'])[:8]]
        story.append(create_data_table(headers, rows, [5*cm, 2.5*cm, 3.5*cm, 2.5*cm]))
    
    story.append(PageBreak())
    
    # ===== SECTION 4: CONDITIONS DE TRAVAIL =====
    story.append(Paragraph("4. Conditions de travail", styles['TitreSection']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1e40af')))
    story.append(Spacer(1, 10))
    
    # Temps de travail
    tt = data.get('temps_travail', {})
    if tt:
        story.append(Paragraph("4.1 Temps de travail", styles['TitreSousSection']))
        kpis_tt = [
            (f"{tt.get('duree_travail', {}).get('duree_hebdo_habituelle', 37.1)}h", "Durée hebdo moyenne"),
            (f"{tt.get('temps_partiel', {}).get('taux_global_pct', 17.4)}%", "Temps partiel"),
            (f"48%", "Font des heures sup"),
        ]
        story.append(create_kpi_table(kpis_tt, styles))
        story.append(Spacer(1, 15))
    
    # Accidents du travail
    at = data.get('accidents_travail', {})
    if at:
        story.append(Paragraph("4.2 Santé et sécurité", styles['TitreSousSection']))
        kpis_at = [
            (f"{at.get('accidents_avec_arret', {}).get('total', 668510):,}".replace(',', ' '), "Accidents/an"),
            (f"{at.get('accidents_avec_arret', {}).get('indice_frequence', 31.4)}", "Indice fréquence"),
            (f"{at.get('accidents_mortels', {}).get('total', 738)}", "Accidents mortels"),
        ]
        story.append(create_kpi_table(kpis_at, styles))
    
    # Arguments NAO conditions
    if at.get('arguments_nao'):
        add_argument_box(story, "Arguments NAO - Santé et sécurité", at['arguments_nao'][:4], styles)
    
    story.append(PageBreak())
    
    # ===== SECTION 5: ÉGALITÉ ET PARTAGE DE LA VALEUR =====
    story.append(Paragraph("5. Égalité et partage de la valeur", styles['TitreSection']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1e40af')))
    story.append(Spacer(1, 10))
    
    # Égalité pro
    egapro = data.get('egalite_professionnelle', {})
    if egapro:
        story.append(Paragraph("5.1 Index égalité professionnelle (Egapro)", styles['TitreSousSection']))
        kpis_eg = [
            (f"{egapro.get('index_moyen', {}).get('valeur', 88)}/100", "Index moyen"),
            (f"{egapro.get('conformite', {}).get('pct_entreprises_conformes', 77)}%", "Entreprises conformes"),
            (f"{egapro.get('indicateurs', {}).get('ecart_remuneration_pct', 4.2)}%", "Écart rémunération"),
        ]
        story.append(create_kpi_table(kpis_eg, styles))
        story.append(Spacer(1, 15))
    
    # Épargne salariale
    es = data.get('epargne_salariale', {})
    if es:
        story.append(Paragraph("5.2 Épargne salariale et partage de la valeur", styles['TitreSousSection']))
        kpis_es = [
            (f"{es.get('couverture', {}).get('pct_salaries', 53.5)}%", "Salariés couverts"),
            (f"{es.get('montants', {}).get('total_distribue_mds', 21.7)} Mds€", "Total distribué"),
            (f"{es.get('montants', {}).get('moyenne_beneficiaire', 2750)}€", "Moyenne/bénéficiaire"),
        ]
        story.append(create_kpi_table(kpis_es, styles))
        
        if es.get('arguments_nao'):
            add_argument_box(story, "Arguments NAO - Partage de la valeur", es['arguments_nao'][:4], styles)
    
    story.append(PageBreak())
    
    # ===== SECTION 6: CONVENTIONS COLLECTIVES =====
    story.append(Paragraph("6. Conventions collectives", styles['TitreSection']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1e40af')))
    story.append(Spacer(1, 10))
    
    cc = data.get('conventions_collectives', {})
    if cc.get('branches'):
        story.append(Paragraph("6.1 Principales branches et conformité SMIC", styles['TitreSousSection']))
        
        headers = ['Branche', 'Effectifs', 'Min grille', 'Statut']
        rows = []
        for b in cc['branches'][:12]:
            statut = "⚠️ < SMIC" if b.get('min_grille', 0) < 1443 else "✓ OK"
            rows.append([
                b['nom'][:30],
                f"{b.get('effectifs', '-'):,}".replace(',', ' ') if isinstance(b.get('effectifs'), int) else str(b.get('effectifs', '-')),
                f"{b.get('min_grille', '-')}€",
                statut
            ])
        story.append(create_data_table(headers, rows, [6*cm, 3*cm, 2.5*cm, 2.5*cm]))
        story.append(Spacer(1, 10))
        
        # Alerte branches non conformes
        if cc.get('meta', {}).get('note'):
            story.append(Paragraph(
                f"<b>⚠️ Alerte :</b> {cc['meta']['note']}",
                styles['TexteNormal']
            ))
    
    story.append(PageBreak())
    
    # ===== SECTION 7: SYNTHÈSE ET RECOMMANDATIONS =====
    story.append(Paragraph("7. Synthèse et recommandations NAO", styles['TitreSection']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1e40af')))
    story.append(Spacer(1, 10))
    
    # Synthèse
    story.append(Paragraph("7.1 Points clés pour la négociation", styles['TitreSousSection']))
    
    points_cles = [
        f"<b>Inflation</b> : {inflation}% en 2025, cumulée {hist.get('calculs_derives', {}).get('inflation_cumulee', 14)}% depuis 2020",
        f"<b>Salaires prévus</b> : +2.5% en 2026 selon Banque de France",
        f"<b>Pouvoir d'achat</b> : rattrapage nécessaire pour les bas salaires",
        f"<b>Égalité H/F</b> : écart de rémunération de 4.2% à poste égal, 14.9% global",
        f"<b>Partage de la valeur</b> : 53.5% des salariés couverts, marge de progression",
        f"<b>Santé-sécurité</b> : 668 510 AT/an, vigilance sur certains secteurs",
    ]
    
    for point in points_cles:
        story.append(Paragraph(f"• {point}", styles['TexteNormal']))
        story.append(Spacer(1, 5))
    
    story.append(Spacer(1, 20))
    
    # Recommandations
    story.append(Paragraph("7.2 Revendications suggérées", styles['TitreSousSection']))
    
    revendications = [
        "<b>Augmentation générale</b> : au minimum inflation anticipée (1.4%) + rattrapage inflation passée",
        "<b>Augmentation ciblée</b> : coup de pouce pour les bas salaires (compression de la hiérarchie)",
        "<b>Prime de partage de la valeur (PPV)</b> : extension à tous les salariés",
        "<b>Égalité professionnelle</b> : plan de rattrapage des écarts de rémunération H/F",
        "<b>Temps de travail</b> : majoration des heures supplémentaires, compte épargne-temps",
        "<b>Télétravail</b> : indemnisation des frais, droit à la déconnexion",
        "<b>Formation</b> : accès équitable à la formation pour toutes les catégories",
    ]
    
    for rev in revendications:
        story.append(Paragraph(f"➤ {rev}", styles['TexteNormal']))
        story.append(Spacer(1, 5))
    
    # Pied de page final
    story.append(Spacer(1, 2*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1')))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} • Dashboard NAO CFTC • Contact : hspringragain@cftc.fr",
        styles['PiedPage']
    ))
    
    # Construire le PDF
    doc.build(story)
    print(f"✅ Rapport PDF généré : {output_path}")
    return output_path


def main():
    # Arguments
    if len(sys.argv) > 1:
        data_path = sys.argv[1]
    else:
        data_path = '/mnt/user-data/public/data.json'
    
    if len(sys.argv) > 2:
        output_path = sys.argv[2]
    else:
        output_path = '/mnt/user-data/outputs/rapport_nao.pdf'
    
    print(f"📄 Génération du rapport NAO PDF...")
    print(f"   Source : {data_path}")
    print(f"   Destination : {output_path}")
    print()
    
    # Charger les données
    data = load_data(data_path)
    
    # Générer le PDF
    generate_rapport_nao(data, output_path)


if __name__ == "__main__":
    main()
