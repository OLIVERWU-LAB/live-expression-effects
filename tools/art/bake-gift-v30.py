"""Re-render existing 3D gift geometry with original geometry with a modestly brighter original and two reference materials."""
import bpy,math,sys,time,json
from pathlib import Path
base=Path(__file__).with_name('bake-gift-v22.py').read_text()
exec(base[:base.index("assets={'star':")])
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
profile=args[0] if args else 'soft'
out=Path(__file__).resolve().parents[2].parent/('v30-gift-'+profile+'-frames');out.mkdir(parents=True,exist_ok=True)
s.render.engine='BLENDER_EEVEE';s.render.resolution_percentage=100;s.render.resolution_x=160;s.render.resolution_y=160;s.view_settings.exposure=(-.55 if profile=='candy' else -.40 if profile=='soft' else -.30)
s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True
for o in s.objects:
 if o.type=='LIGHT':o.data.energy*=.8
area('Broad shadow fill',(0,-4,-3),65,5,5,(1,1,1))
nt=material.node_tree;bs=nt.nodes.get('Principled BSDF')
for k,v in {'Metallic':.02,'Roughness':.30 if profile!='candy' else .14,'Coat Weight':.30 if profile!='candy' else .65,'Coat Roughness':.18 if profile!='candy' else .08,'Subsurface Weight':.025}.items():
 if k in bs.inputs:bs.inputs[k].default_value=v
tex=nt.nodes.new('ShaderNodeTexCoord');sep=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(tex.outputs['Generated'],sep.inputs[0])
ramp=nt.nodes.new('ShaderNodeValToRGB');nt.links.new(sep.outputs['Z'],ramp.inputs[0]);nt.links.new(ramp.outputs['Color'],bs.inputs['Base Color']);ramp.color_ramp.interpolation='EASE'
mid=ramp.color_ramp.elements.new(.5)
linear=lambda h:tuple((v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4) for v in [int(h[k:k+2],16)/255 for k in [1,3,5]])+(1,)
soft=[['#FFD43C','#FFE46B','#FFA431'],['#B75DF3','#4B72EB','#23DFAC'],['#FF654A','#FF647E','#F64DBB'],['#639CEC','#47D7E3','#9263E7'],['#B467EC','#ED48DA','#FF775C'],['#FF9967','#FFB553','#FF739A']]
candy=[['#FFB900','#FFE027','#FF8A08'],['#8A26E0','#D32CE9','#F85ABE'],['#FF3B0C','#FF7708','#FFD500'],['#308CEC','#55BCFA','#8555DE'],['#ED08D7','#FF21A7','#FF78B8'],['#FF610F','#FF9B0D','#FFD51D']]
light=[['#FFD44F']*3,['#9855DE']*3,['#F15E70']*3,['#518FDC']*3,['#D951B7']*3,['#F69B66']*3]
variants={'star':[0,3,4],'bead':[0,1,2,3,4,5],'ring':[0,1],'ribbon':[0,1,2,3,4,5],'coil':[1,2],'sparkle':[0],'fourstar':[3,4],'cube':[1,3,5],'triangle':[0,4],'cylinder':[1],'wave':[3,4],'twinkle':[0,1]}
if '--probe' in args:variants={'coil':[1]}
start=time.time()
for kind,indices in variants.items():
 o=make(kind);o.data.materials.append(material)
 for ci in indices:
  trio=(soft if profile=='soft' else candy if profile=='candy' else light)[ci]
  for e,h in zip(sorted(ramp.color_ramp.elements,key=lambda e:e.position),trio):e.color=linear(h)
  frames=1 if kind in ['bead','twinkle'] else 4
  for f in range(frames):
   o.rotation_euler=(math.radians(15 if kind in ['cube','cylinder','triangle'] else -8),math.radians(8),f/frames*2*math.pi);s.render.filepath=str(out/f'{kind}-{ci}-{f:02}.png');bpy.ops.render.render(write_still=True)
  print('V30',profile,kind,ci,round(time.time()-start,2),flush=True)
 bpy.data.objects.remove(o,do_unlink=True)
(out/'variants.json').write_text(json.dumps(variants));print('V30_COMPLETE',profile,flush=True)
