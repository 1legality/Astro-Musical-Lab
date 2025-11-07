from PyPDF2 import PdfReader
p='''src/content/PDF/Sequencer_16Step_Rhythms_Complete_Guide.pdf'''
r=PdfReader(p)
print('pages', len(r.pages))
for i,pg in enumerate(r.pages, start=1):
    t=(pg.extract_text() or '')
    print(f"\n--- PAGE {i} ---\n{t}")
    if i>=10:
        break
