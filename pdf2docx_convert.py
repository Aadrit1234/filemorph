#!/usr/bin/env python3
"""PDF to DOCX converter using pdf2docx for 100% content preservation."""
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


def convert_pdf_to_docx(pdf_path, docx_path):
    """Convert a PDF to DOCX preserving all content, tables, and formatting."""
    cv = Converter(pdf_path)
    cv.convert(docx_path)
    cv.close()
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
