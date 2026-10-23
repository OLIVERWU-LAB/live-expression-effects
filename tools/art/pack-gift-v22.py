from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,shutil,ast
root=Path(__file__).resolve().parents[2];source=root.parent/'v22-gift-frames';output=root/'dist/assets/gift-v22';output.mkdir(parents=True,exist_ok=True)
for obsolete in output.glob('*.png'):obsolete.unlink()
variants=json.loads((source/'variants.json').read_text());m={'tile':160,'colors':['#FFCC32','#853DDD','#E94355','#367DD9','#CE36A6','#EF8950'],'twinkleColors':['#C32CFF','#83E7C3'],'variants':variants,'assets':[]}
tree=ast.parse((root/'tools/art/bake-gift-v22.py').read_text());m['surfaceColors']=next(ast.literal_eval(n.value) for n in ast.walk(tree) if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='overrides' for t in n.targets))
sheet=Image.new('RGB',(160*6,180*len(variants)),'#20242e');d=ImageDraw.Draw(sheet)
for row,(kind,colors) in enumerate(variants.items()):
 frames=1 if kind in ['bead','twinkle'] else 12
 for col,c in enumerate(colors):
  atlas=Image.new('RGBA',(160*frames,160))
  for f in range(frames):
   im=Image.open(source/f'{kind}-{c}-{f:02}.png').convert('RGBA');atlas.alpha_composite(im,(160*f,0))
  file=output/f'{kind}-{c}.png';atlas.save(file,optimize=True);im=Image.open(source/f'{kind}-{c}-00.png').convert('RGBA');sheet.paste(im,(col*160,row*180),im);d.text((col*160+5,row*180+160),kind+' '+str(c),fill='white')
  m['assets'].append({'file':file.name,'frames':frames,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
for kind in ['drop','popper','capsule']:
 file=output/f'{kind}-0.png';shutil.copy2(root/'dist/assets/gift-v21'/file.name,file);variants[kind]=[0];m['assets'].append({'file':file.name,'frames':1,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
m['launch']=json.loads((root/'dist/assets/gift-v21/manifest.json').read_text())['launch'];(output/'manifest.json').write_text(json.dumps(m,indent=2));sheet.save(root.parent/'gift-v22-materials.jpg');print(json.dumps({'files':len(m['assets']),'bytes':sum(a['bytes'] for a in m['assets'])}))
