from PyPDF2 import PdfReader
import re
p='''src/content/PDF/Advanced Rhythmic Systems for Techno, Ambient, Cinematic & IDM Music.pdf'''
r=PdfReader(p)
for i,pg in enumerate(r.pages, start=1):
    t=(pg.extract_text() or '')
    if i<8: continue
    for line in t.splitlines():
        s=line.strip()
        if re.match(r'^(\d+\.)', s):
            print(f'{i:02d}: {s}')
