import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_pdf_report(detection_data: dict, output_pdf_path: str):
    """
    Generate an executive-grade PDF Road Damage Assessment Report.
    """
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#0B132B'),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#4A5568'),
        spaceAfter=15
    )
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#1E6091'),
        spaceBefore=10,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#2D3748'),
        leading=13
    )

    elements = []

    # 1. Header Banner Table
    header_data = [
        [
            Paragraph("<b>RoadGuard AI</b><br/><font size=8 color='#64748B'>Intelligent Road Damage Detection & Monitoring System</font>", title_style),
            Paragraph(f"<b>OFFICIAL REPORT</b><br/><font size=8 color='#64748B'>Date: {detection_data.get('created_at', datetime.utcnow()).strftime('%Y-%m-%d %H:%M UTC')}<br/>Report ID: #RG-{detection_data.get('id', '001')}</font>", ParagraphStyle('HRight', parent=body_style, alignment=2))
        ]
    ]
    header_table = Table(header_data, colWidths=[340, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1E6091'), spaceAfter=12))

    # 2. Executive KPI Cards
    sev = detection_data.get('overall_severity', 'LOW')
    sev_color = colors.HexColor('#EF4444') if sev == 'HIGH' else (colors.HexColor('#F59E0B') if sev == 'MEDIUM' else colors.HexColor('#10B981'))

    kpi_data = [
        [
            Paragraph(f"<font size=8 color='#64748B'>TOTAL POTHOLES</font><br/><b><font size=16 color='#0B132B'>{detection_data.get('total_potholes', 0)}</font></b>", body_style),
            Paragraph(f"<font size=8 color='#64748B'>OVERALL SEVERITY</font><br/><b><font size=16 color='{sev_color.hexval()}'>{sev}</font></b>", body_style),
            Paragraph(f"<font size=8 color='#64748B'>AI CONFIDENCE</font><br/><b><font size=16 color='#0B132B'>{int(detection_data.get('confidence_score', 0) * 100)}%</font></b>", body_style),
            Paragraph(f"<font size=8 color='#64748B'>BREAKDOWN (H / M / L)</font><br/><b><font size=14 color='#0B132B'>{detection_data.get('high_severity', 0)} / {detection_data.get('medium_severity', 0)} / {detection_data.get('low_severity', 0)}</font></b>", body_style),
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[135, 135, 135, 135])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 12))

    # 3. Location Metadata
    lat = detection_data.get('latitude')
    lng = detection_data.get('longitude')
    loc_str = f"{lat:.6f}, {lng:.6f}" if lat is not None and lng is not None else "No GPS tagged (Manual assignment available)"
    loc_name = detection_data.get('location_name') or "Roadway Sector"

    meta_data = [
        [Paragraph("<b>Geo-Coordinates:</b>", body_style), Paragraph(loc_str, body_style)],
        [Paragraph("<b>Location Tag:</b>", body_style), Paragraph(loc_name, body_style)],
        [Paragraph("<b>Source Media:</b>", body_style), Paragraph(f"{detection_data.get('media_type', 'image').upper()} Scan ({detection_data.get('image_filename', 'N/A')})", body_style)],
    ]
    meta_table = Table(meta_data, colWidths=[120, 420])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # 4. Images Section (Side-by-Side if available)
    elements.append(Paragraph("Visual Evidence & AI Damage Annotation", section_heading))
    
    orig_path = detection_data.get('orig_image_path')
    proc_path = detection_data.get('proc_image_path')
    media_type = detection_data.get('media_type', 'image')

    img_cells = []
    col_widths = []

    # Valid image extensions for ReportLab
    image_exts = ('.jpg', '.jpeg', '.png', '.bmp')

    if orig_path and os.path.exists(orig_path) and orig_path.lower().endswith(image_exts):
        try:
            img_cells.append([
                Paragraph("<b>Raw Ingested Image</b>", body_style),
                RLImage(orig_path, width=255, height=160)
            ])
            col_widths.append(265)
        except Exception:
            pass

    if proc_path and os.path.exists(proc_path) and proc_path.lower().endswith(image_exts):
        try:
            label = "<b>AI Processed Detection (YOLOv8)</b>" if media_type != 'video' else "<b>Representative Video Keyframe (YOLOv8)</b>"
            img_cells.append([
                Paragraph(label, body_style),
                RLImage(proc_path, width=255, height=160)
            ])
            col_widths.append(265)
        except Exception:
            pass

    if img_cells:
        # Transpose so labels are on top and images below
        row0 = [cell[0] for cell in img_cells]
        row1 = [cell[1] for cell in img_cells]
        img_table = Table([row0, row1], colWidths=col_widths)
        img_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            ('TOPPADDING', (0, 1), (-1, 1), 2),
        ]))
        elements.append(img_table)

    elements.append(Spacer(1, 12))

    # 5. Pothole Inventory Table
    elements.append(Paragraph("Detected Pothole Inventory & Perspective Calibration", section_heading))
    details = detection_data.get('details', [])
    
    table_rows = [
        ["#", "Severity", "Confidence", "Est. Ø (cm)", "Cavity Depth", "Recommended Action"]
    ]

    if details:
        for i, item in enumerate(details, start=1):
            sev_item = item.get('severity', 'LOW')
            conf_pct = f"{int(item.get('confidence', 0) * 100)}%"
            diam = item.get('estimated_diameter_cm') or item.get('bounding_box', {}).get('estimated_diameter_cm', round(item.get('estimated_width_px', 0) * 0.25, 1))
            depth = item.get('depth_category') or item.get('bounding_box', {}).get('depth_category', 'Moderate (3-6 cm)')
            diam_str = f"~{int(diam)} cm"
            
            if sev_item == 'HIGH':
                action = "Emergency Asphalt Patching (24h)"
            elif sev_item == 'MEDIUM':
                action = "Scheduled Routine Resurfacing"
            else:
                action = "Quarterly Monitoring"

            table_rows.append([str(i), sev_item, conf_pct, diam_str, depth, action])
    else:
        table_rows.append(["-", "NONE", "100%", "0 cm", "Surface Intact", "Road surface clear; no immediate repair needed"])

    details_table = Table(table_rows, colWidths=[25, 65, 65, 75, 125, 185])
    details_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (5, 1), (5, -1), 'LEFT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 15))

    # 6. Maintenance Assessment & Disclaimer
    disclaimer_text = (
        "<b>Notice:</b> Severity classifications are calculated using optical bounding box heuristic models "
        "and computer vision relative area estimation. This digital report serves as an automated triage tool "
        "for municipal road authorities and should be validated with calibrated in-situ pavement profilometry."
    )
    elements.append(Paragraph(disclaimer_text, ParagraphStyle('Disc', parent=body_style, fontSize=7, leading=10, textColor=colors.HexColor('#64748B'))))

    doc.build(elements)
    return output_pdf_path
