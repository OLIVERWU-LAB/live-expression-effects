"""Soft palette unchanged; candy exposure, roughness and clearcoat. Existing geometry."""
from pathlib import Path
base=Path(__file__).with_name('bake-gift-v32.py').read_text()
exec(base[:base.index("variants={'star':")].replace("profile=='candy'", "profile in ['candy','soft-candy']").replace("profile!='candy'", "profile not in ['candy','soft-candy']"))
smooth=Path(__file__).with_name('bake-gift-v33.py').read_text()
exec(smooth[smooth.index('def smooth_s():'):smooth.index("variants={'wave':")])
out=Path(__file__).resolve().parents[2].parent/('v35-gift-'+profile+'-frames')
out.mkdir(parents=True,exist_ok=True)
s.render.resolution_x=128;s.render.resolution_y=128
variants={'bead':[0,1,2,3,4,5],'twinkle':[0,1],'star':[0,3,4],'ring':[0,1],'ribbon':[0,1,2,3,4,5],'coil':[1,2],'sparkle':[0],'fourstar':[3,4],'cube':[1,3,5],'triangle':[0,4],'cylinder':[1],'wave':[3,4]}
start=time.time()
for kind,indices in variants.items():
 o=smooth_s() if kind=='wave' else make(kind);o.data.materials.append(material)
 for ci in indices:
  trio=soft[ci]
  for e,h in zip(sorted(ramp.color_ramp.elements,key=lambda e:e.position),trio):e.color=linear(h)
  frames=1 if kind in ['bead','twinkle'] else 24
  for f in range(frames):
   target=out/f'{kind}-{ci}-{f:02}.png'
   if target.exists():continue
   o.rotation_euler=(math.radians(15 if kind in ['cube','cylinder','triangle'] else -8),math.radians(8),f/frames*2*math.pi)
   s.render.filepath=str(target);bpy.ops.render.render(write_still=True)
  print('V35_PROGRESS',profile,kind,ci,round(time.time()-start,1),flush=True)
 bpy.data.objects.remove(o,do_unlink=True)
(out/'variants.json').write_text(json.dumps(variants));print('V35_COMPLETE',profile,flush=True)
