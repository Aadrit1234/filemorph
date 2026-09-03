#!/usr/bin/env python3
"""PDF to DOCX converter using pdf2docx for 100% content preservation.
Post-processes to remove excessive blank space from empty paragraphs."""
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
    from docx.shared import Cm, Pt
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-docx", "-q"])
    from docx import Document
    from docx.shared import Cm, Pt


def fix_docx_spacing(docx_path):
    """Remove excessive spacing from empty paragraphs that pdf2docx creates."""
    try:
        doc = Document(docx_path)
        fixed = 0

        for para in doc.paragraphs:
            if not para.text.strip():
                pf = para.paragraph_format
                # Remove excessive space_before on empty paragraphs
                if pf.space_before and pf.space_before > Cm(0.5):
                    pf.space_before = Cm(0)
                    fixed += 1
                if pf.space_after and pf.space_after > Cm(0.5):
                    pf.space_after = Cm(0)
                    fixed += 1
                # Remove spacing in paragraph style for empty paras
                if para.style and para.style.paragraph_format:
                    style_pf = para.style.paragraph_format
                    # Don't modify the style itself, just the instance

        doc.save(docx_path)
        return fixed
    except Exception as e:
        print(f"Warning: spacing fix failed: {e}", file=sys.stderr)
        return 0


def convert_pdf_to_docx(pdf_path, docx_path):
    """Convert a PDF to DOCX preserving all content, tables, and formatting."""
    cv = Converter(pdf_path)
    cv.convert(docx_path)
    cv.close()

    # Fix excessive blank space from empty paragraphs
    fixed = fix_docx_spacing(docx_path)
    if fixed > 0:
        print(f"  Fixed {fixed} empty paragraphs with excessive spacing", file=sys.stderr)

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
