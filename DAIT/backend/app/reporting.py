from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


def build_study_report_pdf(*, title: str, patient_lines: list[str], result_lines: list[str]) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 2 * cm
    c.setFont("Helvetica-Bold", 16)
    c.drawString(2 * cm, y, title)
    y -= 1.2 * cm

    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Patient")
    y -= 0.8 * cm
    c.setFont("Helvetica", 10)
    for line in patient_lines:
        c.drawString(2 * cm, y, line)
        y -= 0.55 * cm

    y -= 0.4 * cm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Results")
    y -= 0.8 * cm
    c.setFont("Helvetica", 10)
    for line in result_lines:
        if y < 2 * cm:
            c.showPage()
            y = height - 2 * cm
            c.setFont("Helvetica", 10)
        c.drawString(2 * cm, y, line)
        y -= 0.55 * cm

    c.showPage()
    c.save()
    return buffer.getvalue()

