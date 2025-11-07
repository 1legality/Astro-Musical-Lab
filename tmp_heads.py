from PyPDF2 import PdfReader
import re
p='''src/content/PDF/Advanced Rhythmic Systems for Techno, Ambient, Cinematic & IDM Music.pdf'''
r=PdfReader(p)
heads=[]
for i,pg in enumerate(r.pages):
    t=(pg.extract_text() or '')
    for line in t.splitlines():
        s=line.strip()
        if re.match(r'^(\d+\.|[A-Z][A-Za-z].*|[A-Z]{3,})', s):
            if len(s)>2:
                heads.append((i+1,s))
print('pages', len(r.pages))
for p,s in heads:
    print(f'{p:02d}: {s[:120]}')
