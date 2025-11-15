from PyPDF2 import PdfReader
p='''src/content/PDF/Advanced Rhythmic Systems for Techno, Ambient, Cinematic & IDM Music.pdf'''
r=PdfReader(p)
with open('tmp_advanced_rhythms.txt','w',encoding='utf-8') as f:
    for i,pg in enumerate(r.pages, start=1):
        f.write(f"\n--- PAGE {i} ---\n")
        t=(pg.extract_text() or '')
        f.write(t)
