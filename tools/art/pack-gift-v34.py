from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[2]
for profile in ['light','soft','candy']:
 source=root.parent/('v34-gift-'+profile+'-frames');variants=json.loads((source/'variants.json').read_text())
 output=root/'dist/assets/gift-v34'/profile;output.mkdir(parents=True,exist_ok=True);assets=[]
 for kind,colors in variants.items():
  for color in colors:
   atlas=Image.new('RGBA',(128*24,128))
   for f in range(24):atlas.alpha_composite(Image.open(source/f'{kind}-{color}-{f:02}.png').convert('RGBA'),(128*f,0))
   target=output/f'{kind}-{color}.png';atlas.save(target,optimize=True)
   assets.append({'file':target.name,'frames':24,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 (output/'manifest.json').write_text(json.dumps({'profile':profile,'tile':128,'assets':assets},indent=2))
 print(profile,len(assets),sum(a['bytes'] for a in assets))
