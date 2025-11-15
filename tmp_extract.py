from PyPDF2 import PdfReader
p='''src/content/PDF/Advanced Rhythmic Systems for Techno, Ambient, Cinematic & IDM Music.pdf'''
r=PdfReader(p)
print('pages', len(r.pages))
for i,pg in enumerate(r.pages):
    t=pg.extract_text() or ''
    print('--- PAGE', i+1, '---')
    print(t)
    if i>8:
        break
