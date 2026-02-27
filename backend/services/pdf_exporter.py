import os
from io import BytesIO
from fpdf import FPDF
from services.analyzer import ThreatReport

class PDFReport(FPDF):
    def header(self):
        # Logo or Title
        self.set_font('Helvetica', 'B', 20)
        self.set_text_color(0, 51, 102) # Dark blue
        self.cell(0, 10, 'AI SOC Analyst - Threat Report', ln=True, align='C')
        self.ln(5)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

    def chapter_title(self, title):
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(255, 255, 255)
        self.set_fill_color(0, 102, 204) # Blue background
        self.cell(0, 10, f' {title} ', 0, 1, 'L', fill=True)
        self.ln(4)

    def chapter_body(self, body):
        self.set_font('Helvetica', '', 11)
        self.set_text_color(0, 0, 0)
        # Using multi_cell for text wrapping
        # Decode and handle string safely
        safe_body = str(body).encode('latin-1', 'replace').decode('latin-1')
        self.multi_cell(0, 6, safe_body)
        self.ln(6)


def generate_pdf_report(report: ThreatReport) -> BytesIO:
    """Generate a PDF document from the ThreatReport."""
    pdf = PDFReport()
    pdf.add_page()
    
    # Overview / Verdict Section
    pdf.set_font('Helvetica', 'B', 16)
    score = report.threat_score
    if score >= 70:
        pdf.set_text_color(204, 0, 0) # Red
        verdict = "MALICIOUS"
    elif score >= 40:
        pdf.set_text_color(204, 153, 0) # Orange
        verdict = "SUSPICIOUS"
    else:
        pdf.set_text_color(0, 153, 51) # Green
        verdict = "CLEAN"
        
    pdf.cell(0, 10, f"Verdict: {verdict} (Score: {score}/100)", ln=True, align='L')
    pdf.ln(5)
    
    # 1. Technical Analysis
    pdf.chapter_title('Technical Analysis')
    pdf.chapter_body(report.technical_analysis)
    
    # 2. Psychological Analysis
    pdf.chapter_title('Psychological Analysis')
    pdf.chapter_body(report.psychological_analysis)
    
    # 3. Indicators of Compromise
    pdf.chapter_title('Indicators of Compromise (IoCs)')
    if report.iocs:
        ioc_text = "\n".join(f"- {ioc}" for ioc in report.iocs)
        pdf.chapter_body(ioc_text)
    else:
        pdf.chapter_body("No actionable IoCs were extracted.")
        
    # 4. OSINT Results
    pdf.chapter_title('OSINT Results')
    if report.osint_results:
        for osint in report.osint_results:
            pdf.set_font('Helvetica', 'B', 11)
            pdf.cell(0, 6, f"Source: {osint.source} | Target: {osint.target}", ln=True)
            pdf.set_font('Helvetica', '', 10)
            
            # Simple summary of findings
            data = osint.data
            summary = []
            if "error" in data:
                summary.append(f"Error: {data['error']}")
            else:
                if 'malicious' in data:
                    summary.append(f"Malicious Flags: {data['malicious']}")
                if 'abuseConfidenceScore' in data:
                    summary.append(f"Abuse Confidence: {data['abuseConfidenceScore']}%")
                if 'critical' in data:
                    summary.append(f"Critical Findings: {data['critical']}")
            
            if not summary:
                pdf.cell(0, 6, "  No significant threat indicators found.", ln=True)
            else:
                for line in summary:
                    pdf.cell(0, 6, f"  - {line}", ln=True)
            pdf.ln(4)
    else:
        pdf.chapter_body("No OSINT results available.")
        
    # 5. Remediation (Optional, since it's XML)
    if score >= 40 and report.remediation_script:
        pdf.add_page()
        pdf.chapter_title('Automated Remediation (Palo Alto XML)')
        pdf.set_font('Courier', '', 9)
        pdf.set_fill_color(240, 240, 240)
        
        script_safe = str(report.remediation_script).encode('latin-1', 'replace').decode('latin-1')
        pdf.multi_cell(0, 5, script_safe, fill=True)
        pdf.ln(5)

    buffer = BytesIO()
    try:
        # Support for older PyFPDF 1.7.2 which returns a string
        pdf_bytes = pdf.output(dest='S')
    except Exception:
        # Support for newer fpdf2 which returns a bytearray
        pdf_bytes = pdf.output()
        
    if isinstance(pdf_bytes, str):
        pdf_bytes = pdf_bytes.encode('latin-1')
        
    buffer.write(pdf_bytes)
    buffer.seek(0)
    
    return buffer
