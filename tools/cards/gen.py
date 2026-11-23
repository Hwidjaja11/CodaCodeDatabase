import json, re, html, sys
import os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import barcode_numbers as bn
from reportlab.graphics.barcode import createBarcodeDrawing
from reportlab.graphics import renderSVG

people, codes = bn.load()   # same data + same number rules as the website
C = {"Music": "#8cc0f2", "Art": "#c7a6ee", "Ideas": "#f8d986", "Writing": "#90ddb6", "Programming": "#aab9cd", "QA": "#f5a9c9"}
EXEC = "#f2a48c"

def barcode(value, W=440, H=64):
    d = createBarcodeDrawing("Code128", value=value, barHeight=60, barWidth=1.4, humanReadable=False, quiet=True)
    svg = renderSVG.drawToString(d)
    svg = re.sub(r"<\?xml[^>]*>|<!DOCTYPE[^>]*>", "", svg)
    return re.sub(r"<svg[^>]*>", f'<svg id="bars" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {d.width} {d.height}" '
                  f'width="{W}" height="{H}" preserveAspectRatio="none">', svg, count=1)

def card(i, p):
    name = p["name"].replace(" (Alias)", ""); alias = "(Alias)" in p["name"]
    depts = p["departments"]; num = bn.barcode_number(p, codes); cid = bn.grouped(num)
    stripe = (f'<i style="background:{EXEC}"></i>' if p.get("all") else "") + "".join(f'<i style="background:{C[d]}"></i>' for d in depts)
    dots = ""
    if p.get("all"):
        dots += f'<span><b style="background:{EXEC}"></b>All Departments</span>'
    for d in depts:
        dots += f'<span><b style="background:{C[d]}"></b>{d}</span>'
    level = f'<div class="level">EXECUTIVE LEVEL {p["rank"]}</div>' if p["rank"] else ""
    roles = " · ".join(html.escape(r) for r in p["roles"])
    sub = f'<div class="alias">(Alias)</div>' if alias else ""
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{width:1012px;height:638px;background:transparent;font-family:'Times New Roman','Liberation Serif',serif;color:#1d1d1d}}
.card{{width:1012px;height:638px;display:flex;border-radius:30px;background:#fff;border:2px solid #e6e6e6;overflow:hidden}}
.stripe{{width:26px;display:flex;flex-direction:column}} .stripe i{{flex:1}}
.main{{flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:36px 48px 34px 46px}}
.top{{display:flex;justify-content:space-between;align-items:flex-start}}
.logo{{height:126px;display:block}}
.meta{{text-align:right;font-size:23px;letter-spacing:.3em;color:#888;font-weight:700;padding-top:4px}}
.level{{margin-top:8px;color:#e58f72;letter-spacing:.18em;font-size:21px}}
h1{{font-size:78px;line-height:1;font-weight:700;letter-spacing:.005em}}
.alias{{margin-top:4px;font-size:22px;font-style:italic;color:#777}}
.roles{{margin-top:12px;font-size:26px;color:#555;line-height:1.3;max-width:none}}
.bottom{{display:flex;justify-content:space-between;align-items:flex-end}}
.depts{{display:flex;flex-wrap:wrap;gap:10px 26px;max-width:400px;font-size:23px}}
.depts span{{display:flex;align-items:center;gap:9px}} .depts b{{width:15px;height:15px;border-radius:50%;display:block}}
.code{{text-align:center}} #bars{{display:block}}
.id{{margin-top:6px;font-size:20px;letter-spacing:.2em;font-weight:700;color:#333}}
</style></head><body><div class="card"><div class="stripe">{stripe}</div>
<div class="main">
<div class="top"><img class="logo" src="logo.png"><div class="meta">STUDIO ID{level}</div></div>
<div><h1>{html.escape(name)}</h1>{sub}<div class="roles">{roles}</div></div>
<div class="bottom"><div class="depts">{dots}</div><div class="code">{barcode(num)}<div class="id">{cid}</div></div></div>
</div></div></body></html>"""

for i, p in enumerate(people):
    open(f"card{i+1}.html", "w").write(card(i, p))
print(len(people), "cards written")
