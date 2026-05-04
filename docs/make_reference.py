"""
Creates a reference.docx with DIT University capstone formatting:
  - Times New Roman 12pt body
  - 1.5 line spacing
  - Margins: Top 3cm | Bottom 3cm | Left 4cm | Right 2cm
  - Headings: Times New Roman Bold
Then used by pandoc as --reference-doc to generate the final report.
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_LINE_SPACING, WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import subprocess, os, sys

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))
REF_DOCX  = os.path.join(DOCS_DIR, "reference.docx")
IN_MD     = os.path.join(DOCS_DIR, "CAPSTONE_REPORT.md")
OUT_DOCX  = os.path.join(DOCS_DIR, "CAPSTONE_REPORT.docx")
OUT_PDF   = os.path.join(DOCS_DIR, "CAPSTONE_REPORT.pdf")

def set_margins(doc, top_cm, bottom_cm, left_cm, right_cm):
    for section in doc.sections:
        section.top_margin    = Cm(top_cm)
        section.bottom_margin = Cm(bottom_cm)
        section.left_margin   = Cm(left_cm)
        section.right_margin  = Cm(right_cm)

def set_paragraph_format(style, size_pt=12, bold=False,
                          space_before=0, space_after=6,
                          line_spacing=1.5, color=None):
    font = style.font
    font.name = "Times New Roman"
    font.size = Pt(size_pt)
    font.bold = bold
    if color:
        font.color.rgb = RGBColor(*color)
    pf = style.paragraph_format
    pf.space_before = Pt(space_before)
    pf.space_after  = Pt(space_after)
    pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    pf.line_spacing      = line_spacing

# ── Build reference.docx ────────────────────────────────────────────────────
doc = Document()

# Margins: Top 3cm | Bottom 3cm | Left 4cm | Right 2cm
set_margins(doc, top_cm=3, bottom_cm=3, left_cm=4, right_cm=2)

# Default / Normal style
normal = doc.styles["Normal"]
set_paragraph_format(normal, size_pt=12, line_spacing=1.5, space_after=6)

# Heading 1
h1 = doc.styles["Heading 1"]
set_paragraph_format(h1, size_pt=16, bold=True, space_before=24, space_after=12, line_spacing=1.0)

# Heading 2
h2 = doc.styles["Heading 2"]
set_paragraph_format(h2, size_pt=14, bold=True, space_before=18, space_after=8, line_spacing=1.0)

# Heading 3
h3 = doc.styles["Heading 3"]
set_paragraph_format(h3, size_pt=13, bold=True, space_before=12, space_after=6, line_spacing=1.0)

# Heading 4
try:
    h4 = doc.styles["Heading 4"]
    set_paragraph_format(h4, size_pt=12, bold=True, space_before=8, space_after=4, line_spacing=1.0)
except:
    pass

# Block Text (for code blocks / verbatim)
try:
    bt = doc.styles["Block Text"]
    bt.font.name = "Courier New"
    bt.font.size = Pt(10)
except:
    pass

doc.save(REF_DOCX)
print(f"✅ reference.docx saved → {REF_DOCX}")

# ── Run pandoc: md → docx ─────────────────────────────────────────────────
print("▶ Converting CAPSTONE_REPORT.md → CAPSTONE_REPORT.docx …")
result = subprocess.run(
    [
        "pandoc",
        IN_MD,
        "--reference-doc", REF_DOCX,
        "--toc", "--toc-depth=3",
        "-o", OUT_DOCX,
    ],
    capture_output=True, text=True
)
if result.returncode != 0:
    print("❌ pandoc error:", result.stderr)
    sys.exit(1)
print(f"✅ CAPSTONE_REPORT.docx saved → {OUT_DOCX}")

# ── Use Microsoft Word (AppleScript) to export PDF ───────────────────────
print("▶ Opening in Microsoft Word to export PDF …")
applescript = f'''
tell application "Microsoft Word"
    set theDoc to open "{OUT_DOCX}"
    set pdfPath to "{OUT_PDF}"
    save as theDoc file name pdfPath file format format PDF
    close theDoc saving no
end tell
'''
result2 = subprocess.run(["osascript", "-e", applescript], capture_output=True, text=True)
if result2.returncode != 0:
    print("⚠️  Word AppleScript error:", result2.stderr.strip())
    print("   PDF not generated. Open CAPSTONE_REPORT.docx in Word and File → Save as PDF manually.")
else:
    print(f"✅ CAPSTONE_REPORT.pdf saved → {OUT_PDF}")

print("\nDone.")
