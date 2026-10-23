from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[2]
for profile in ['light','soft','candy']:
 source=root.parent/('v33-gift-'+profile+'-frames')
 output=root/'dist/assets/gift-v33'/profile;output.mkdir(parents=True,exist_ok=True);assets=[]
 for color in range(6):
  atlas=Image.new('RGBA',(640,160))
  for f in range(4):atlas.alpha_composite(Image.open(source/f'wave-{color}-{f:02}.png').convert('RGBA'),(160*f,0))
  target=output/f'wave-{color}.png';atlas.save(target,optimize=True)
  assets.append({'file':target.name,'frames':4,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 (output/'manifest.json').write_text(json.dumps({'profile':profile,'tile':160,'assets':assets},indent=2))
 print(profile,len(assets),sum(a['bytes'] for a in assets))
