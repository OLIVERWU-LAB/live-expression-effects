from pathlib import Path
from PIL import Image
import json,hashlib,shutil
root=Path(__file__).resolve().parents[2]
for profile in ['light','soft','candy']:
 source=root.parent/('v32-gift-'+profile+'-frames');variants=json.loads((source/'variants.json').read_text());output=root/'dist/assets/gift-v32'/profile;output.mkdir(parents=True,exist_ok=True);assets=[]
 for kind,colors in variants.items():
  frames=1 if kind in ['bead','twinkle'] else 4
  for color in colors:
   atlas=Image.new('RGBA',(160*frames,160))
   for f in range(frames):atlas.alpha_composite(Image.open(source/f'{kind}-{color}-{f:02}.png').convert('RGBA'),(160*f,0))
   target=output/f'{kind}-{color}.png';atlas.save(target,optimize=True);assets.append({'file':target.name,'frames':frames,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 for kind in ['drop','capsule','popper']:
  target=output/f'{kind}-0.png';shutil.copy2(root/'dist/assets/gift-v22'/target.name,target);assets.append({'file':target.name,'frames':1,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 (output/'manifest.json').write_text(json.dumps({'profile':profile,'tile':160,'assets':assets},indent=2));print(profile,len(assets),sum(a['bytes'] for a in assets))
