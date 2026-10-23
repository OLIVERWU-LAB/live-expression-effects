from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[2]
profile='soft-candy'
source=root.parent/('v35-gift-'+profile+'-frames');variants=json.loads((source/'variants.json').read_text())
output=root/'dist/assets/gift-v35'/profile;output.mkdir(parents=True,exist_ok=True);assets=[]
for kind,colors in variants.items():
 for color in colors:
  frames=1 if kind in ['bead','twinkle'] else 24
  atlas=Image.new('RGBA',(128*frames,128))
  for f in range(frames):atlas.alpha_composite(Image.open(source/f'{kind}-{color}-{f:02}.png').convert('RGBA'),(128*f,0))
  target=output/f'{kind}-{color}.png';atlas.save(target,optimize=True)
  assets.append({'file':target.name,'frames':frames,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
(output/'manifest.json').write_text(json.dumps({'profile':profile,'palette':'soft','renderSettings':'candy','tile':128,'assets':assets},indent=2))
print(profile,len(assets),sum(a['bytes'] for a in assets))
