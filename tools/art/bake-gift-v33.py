"""Reuse v32 materials; bake only the continuous S tube selected as shape 13."""
from pathlib import Path
base=Path(__file__).with_name('bake-gift-v32.py').read_text()
exec(base[:base.index("variants={'star':")])
out=Path(__file__).resolve().parents[2].parent/('v33-gift-'+profile+'-frames')
out.mkdir(parents=True,exist_ok=True)

def smooth_s():
 # One analytic centreline has a continuous tangent through the inflection.
 # The previous five AUTO handles introduced an abrupt change of curvature.
 cv=bpy.data.curves.new('Continuous S tube','CURVE')
 cv.dimensions='3D';cv.bevel_depth=.15;cv.bevel_resolution=8;cv.use_fill_caps=True
 sp=cv.splines.new('POLY');sp.points.add(255)
 for i,p in enumerate(sp.points):
  t=i/255;u=1-t
  # A single cubic, rather than joined curves, rounds both lobes smoothly.
  p.co=(.35*u**3-4.5*u*u*t+4.5*u*t*t-.35*t**3,0,.85*u**3+2.7*u*u*t-2.7*u*t*t-.85*t**3,1)
 o=bpy.data.objects.new('Smooth S tube',cv);s.collection.objects.link(o)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH')
 o=bpy.context.object
 for face in o.data.polygons:face.use_smooth=len(face.vertices)==4
 return o

variants={'wave':list(range(6))}
for ci in variants['wave']:
 o=smooth_s();o.data.materials.append(material)
 trio=(soft if profile=='soft' else candy if profile=='candy' else light)[ci]
 for e,h in zip(sorted(ramp.color_ramp.elements,key=lambda e:e.position),trio):e.color=linear(h)
 for f in range(4):
  o.rotation_euler=(math.radians(-8),math.radians(8),f/4*2*math.pi)
  s.render.filepath=str(out/f'wave-{ci}-{f:02}.png');bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(o,do_unlink=True)
(out/'variants.json').write_text(json.dumps(variants))
print('V33_COMPLETE',profile,flush=True)
