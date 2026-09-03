#!/usr/bin/env python3
"""PDF to DOCX converter using pdf2docx for 100% content preservation.
Post-processes the output to fix margins and common layout issues."""
import sys
import os

import warnings
warnings.filterwarnings('ignore')
import fitz  # suppress deprecation warning
import logging
logging.getLogger().setLevel(logging.CRITICAL)

try:
    from pdf2docx import Converter
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdf2docx", "-q"])
    from pdf2docx import Converter

try:
    from docx import Document
    from docx.shared import Cm, Pt, Emu
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-docx", "-q"])
    from docx import Document
    from docx.shared import Cm, Pt, Emu


def fix_docx_margins(docx_path, pdf_path):
    """Fix margins by reading original PDF page dimensions and setting appropriate DOCX margins."""
    try:
        # Get original PDF page info
        pdf_doc = fitz.open(pdf_path)
        page = pdf_doc[0]
        pdf_width_cm = page.rect.width / 72 * 2.54
        pdf_height_cm = page.rect.height / 72 * 2.54

        # Find actual content bounds from PDF
        blocks = page.get_text('blocks')
        if blocks:
            min_x = min(b[0] for b in blocks)
            max_x = max(b[2] for b in blocks)
            min_y = min(b[1] for b in blocks)
            max_x_full = max(b[2] for b in blocks)

            # Calculate margins from PDF content bounds
            left_margin_cm = max(1.0, min_x / 72 * 2.54)
            right_margin_cm = max(1.0, (pdf_width_cm * 72 - max_x_full) / 72 * 2.54)
            top_margin_cm = max(1.0, min_y / 72 * 2.54)
            bottom_margin_cm = max(1.5, (pdf_height_cm * 72 - max(b[3] for b in blocks)) / 72 * 2.54)

            # Cap margins to reasonable values
            left_margin_cm = min(left_margin_cm, 3.0)
            right_margin_cm = min(right_margin_cm, 3.0)
            top_margin_cm = min(top_margin_cm, 3.0)
            bottom_margin_cm = min(bottom_margin_cm, 3.0)
        else:
            left_margin_cm = 2.54
            right_margin_cm = 2.54
            top_margin_cm = 2.54
            bottom_margin_cm = 2.54

        pdf_doc.close()

        # Open DOCX and fix margins
        doc = Document(docx_path)
        for section in doc.sections:
            section.left_margin = Cm(left_margin_cm)
            section.right_margin = Cm(right_margin_cm)
            section.top_margin = Cm(top_margin_cm)
            section.bottom_margin = Cm(bottom_margin_cm)

            # Set page size to match PDF (A4 if close)
            if abs(pdf_width_cm - 21.0) < 1 and abs(pdf_height_cm - 29.7) < 1:
                section.page_width = Cm(21.0)
                section.page_height = Cm(29.7)

        # Fix font sizes - ensure minimum readable size
        for para in doc.paragraphs:
            for run in para.runs:
                if run.font.size and run.font.size < Pt(9):
                    run.font.size = Pt(11)

        # Fix empty/zero-width-space table cells
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip() in ('', '\u200b', '\u200c', '\u200d', '\ufeff'):
                        # Remove empty cells by clearing them
                        for p in cell.paragraphs:
                            p.clear()

        doc.save(docx_path)
        return True
    except Exception as e:
        print(f"Warning: margin fix failed: {e}", file=sys.stderr)
        return False


def convert_pdf_to_docx(pdf_path, docx_path):
    """Convert a PDF to DOCX preserving all content, tables, and formatting."""
    cv = Converter(pdf_path)
    cv.convert(docx_path)
    cv.close()

    # Fix margins and formatting
    fix_docx_margins(docx_path, pdf_path)

    return os.path.getsize(docx_path)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdf2docx_convert.py <input.pdf> <output.docx>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    docx_path = sys.argv[2]

    if not os.path.exists(pdf_path):
        print(f"Error: Input file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    try:
        size = convert_pdf_to_docx(pdf_path, docx_path)
        print(f"OK:{size}")
    except Exception as e:
        print(f"ERROR:{e}", file=sys.stderr)
        sys.exit(1)
