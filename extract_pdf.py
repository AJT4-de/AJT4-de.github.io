from pdfminer.high_level import extract_text
import sys
from pathlib import Path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: extract_pdf.py <input.pdf> <output.txt>")
        sys.exit(1)
    inp = Path(sys.argv[1])
    out = Path(sys.argv[2])
    text = extract_text(str(inp))
    out.write_text(text, encoding="utf-8")
    print(f"Wrote {len(text)} chars to {out}")
