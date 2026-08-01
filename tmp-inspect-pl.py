import fitz
import sys
sys.stdout.reconfigure(encoding="utf-8")

doc = fitz.open(r"c:\Users\Admin\Downloads\PVB_Packing List.pdf")
print("pages", len(doc))
for i, page in enumerate(doc):
    print(f"\n=== PAGE {i+1} size={page.rect} ===")
    blocks = page.get_text("dict")["blocks"]
    for b in blocks:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            spans = line.get("spans", [])
            text = "".join(s["text"] for s in spans).strip()
            if not text:
                continue
            s0 = spans[0]
            print(
                f"y={line['bbox'][1]:6.1f} x={line['bbox'][0]:6.1f} "
                f"w={line['bbox'][2]-line['bbox'][0]:6.1f} "
                f"size={s0['size']:4.1f} color={s0['color']:06x} "
                f"font={s0['font'][:32]:32s} | {text}"
            )
    out = rf"c:\Users\Admin\Desktop\Sagar\PVB\client\tmp-packing-list-p{i+1}.png"
    page.get_pixmap(matrix=fitz.Matrix(2.2, 2.2)).save(out)
    print("saved", out)
