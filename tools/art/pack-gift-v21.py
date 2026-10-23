from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,shutil
root=Path(__file__).resolve().parents[2]
source=root.parent/'v21-gift-frames';output=root/'dist/assets/gift-v21';output.mkdir(parents=True,exist_ok=True)
kinds=['star','bead','ring','ribbon','coil','sparkle','drop','popper','capsule'];manifest={'tile':160,'colors':['#FFCC32','#853DDD','#E94355','#367DD9','#CE36A6'],'assets':[]}
sheet=Image.new('RGB',(160*9,210*2),'#202734');draw=ImageDraw.Draw(sheet)
for i,kind in enumerate(kinds):
 frames=1 if kind in ['drop','bead','popper','capsule'] else 12
 for c in range(1 if kind in ['drop','popper','capsule'] else 5):
  atlas=Image.new('RGBA',(160*frames,160))
  for f in range(frames):
   frame=Image.open(source/f'{kind}-{c}-{f:02}.png').convert('RGBA');assert frame.getbbox();atlas.alpha_composite(frame,(160*f,0))
  file=output/f'{kind}-{c}.png';atlas.save(file,optimize=True);manifest['assets'].append({'file':file.name,'frames':frames,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
  if c==0:
   for row,frameIndex in enumerate([0,3 if frames>1 else 0]):
    im=Image.open(source/f'{kind}-{c}-{frameIndex:02}.png').convert('RGBA');sheet.paste(im,(i*160,row*210),im);draw.text((i*160+12,row*210+170),kind+' / '+str(frameIndex),fill='white')
manifest['launch']=json.loads((source/'launch-anchor.json').read_text())
(output/'manifest.json').write_text(json.dumps(manifest,indent=2));dest=root.parent/'gift-assets-v21-contact.png';sheet.save(dest)
# Intermediate renders stay outside the application / published tree.
for name in ['gift-frames','reference-v21']:
 p=root/'work'/name
 if p.exists():
  d=root.parent/('v21-'+name)
  if not d.exists():shutil.move(str(p),str(d))
print(json.dumps({'atlasFiles':len(manifest['assets']),'bytes':sum(x['bytes'] for x in manifest['assets']),'contact':str(dest)}))
