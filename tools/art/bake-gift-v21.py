import bpy,math,sys,time,json
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
preview='--preview' in args
out=Path(__file__).resolve().parents[2].parent/'v21-gift-frames';out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=20;s.cycles.use_denoising=True;s.render.resolution_x=160;s.render.resolution_y=160;s.render.resolution_percentage=100;s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
s.view_settings.view_transform='Standard';s.view_settings.exposure=-.4
s.world.color=(.24,.24,.24)
# Three broad studio cards give the same light language to every object.
def area(name,loc,power,size,sy,color):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='RECTANGLE';data.size=size;data.size_y=sy;data.color=color;o=bpy.data.objects.new(name,data);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key softbox',(-3,-4,4),480,4,1.6,(1,.94,.84));area('Front fill',(3,-3,1),160,3,3,(.80,.90,1));area('Rim card',(2,2,3),550,2,4,(1,.90,1))
camera=bpy.data.cameras.new('Camera');co=bpy.data.objects.new('Camera',camera);s.collection.objects.link(co);co.location=(0,-6,.15);co.rotation_euler=(Vector((0,0,0))-co.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=2.9;s.camera=co
colors=['#FFCC32','#853DDD','#E94355','#367DD9','#CE36A6']
material=bpy.data.materials.new('Glazed soft plastic');material.use_nodes=True;bs=material.node_tree.nodes.get('Principled BSDF')
for k,v in {'Metallic':.08,'Roughness':.22,'IOR':1.47,'Coat Weight':.45,'Coat Roughness':.13,'Subsurface Weight':.045}.items():
 if k in bs.inputs:bs.inputs[k].default_value=v

def mesh(name,verts,faces):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);s.collection.objects.link(o)
 for f in me.polygons:f.use_smooth=True
 return o

def puff(name,points=5):
 verts=[];faces=[];N=72;M=34
 for j in range(M+1):
  phi=-math.pi/2+j/M*math.pi
  for i in range(N):
   a=i/N*math.pi*2+math.pi/2
   if points==5:
    step=math.pi/5;q=(a-math.pi/2)%(2*math.pi);k=int(q/step);aa=k*step;bb=aa+step;ra=1 if k%2==0 else .47;rb=.47 if k%2==0 else 1
    ax,ay=ra*math.cos(aa),ra*math.sin(aa);bx,by=rb*math.cos(bb),rb*math.sin(bb);ux,uy=math.cos(q),math.sin(q);r=(ax*by-ay*bx)/(ux*(by-ay)-uy*(bx-ax))
   else:r=(abs(math.cos(a))**.55+abs(math.sin(a))**.55)**(-1/.55)
   verts.append((r*math.cos(phi)*math.cos(a),-.34*math.sin(phi) if points==5 else -.22*math.sin(phi),r*math.cos(phi)*math.sin(a)))
 for j in range(M):
  for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
 return mesh(name,verts,faces)

def drop():
 vs=[];fs=[];N=64;M=40
 for j in range(M+1):
  t=j/M*math.pi;r=math.sin(t)*(.63-.26*math.cos(t));z=math.cos(t)*1.05
  for i in range(N):a=i/N*math.pi*2;vs.append((math.cos(a)*r,math.sin(a)*r,z))
 for j in range(M):
  for i in range(N):a=j*N+i;b=j*N+(i+1)%N;fs.append((a,a+N,b+N,b))
 return mesh('Drop',vs,fs)

def ribbon(tube=False):
 vs=[];fs=[];N=100;M=12 if tube else 2
 for j in range(N+1):
  t=j/N;a=t*math.pi*2.5;x=.38*math.sin(a);y=.26*math.cos(a);z=1.04-2.08*t
  for i in range(M):
   if tube:
    q=i/M*2*math.pi;vs.append((x+.115*math.cos(q),y+.115*math.sin(q),z))
   else:
    w=(i-.5)*.35;q=t*math.pi*3+.35;vs.append((x+w*math.cos(q),y+w*math.sin(q),z))
 for j in range(N):
  for i in range(M if tube else M-1):a=j*M+i;b=j*M+(i+1)%M;fs.append((a,b,b+M,a+M))
 o=mesh('Coil' if tube else 'Ribbon',vs,fs)
 if not tube:
  sol=o.modifiers.new('Thickness','SOLIDIFY');sol.thickness=.045;be=o.modifiers.new('Rounded edges','BEVEL');be.width=.022;be.segments=3
 return o

def make(kind):
 if kind=='star':return puff('Star',5)
 if kind=='sparkle':return puff('Sparkle',4)
 if kind=='drop':return drop()
 if kind in ['ribbon','coil']:return ribbon(kind=='coil')
 if kind=='bead':bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=.65)
 if kind=='ring':bpy.ops.mesh.primitive_torus_add(major_radius=.64,minor_radius=.16,major_segments=64,minor_segments=20,rotation=(math.pi/2,0,0))
 o=bpy.context.object
 for p in o.data.polygons:p.use_smooth=True
 # Apply the torus's orientation before yaw animation.
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
 return o
kinds=['star','drop','sparkle'] if preview else ['star','bead','ring','ribbon','coil','sparkle','drop']
frames=1 if preview else 12
start=time.time()
for kind in kinds:
 o=make(kind);o.data.materials.append(material)
 palette=['#72DCE9'] if kind=='drop' else colors[:1] if preview else colors
 for ci,color in enumerate(palette):
  rgb=[int(color[k:k+2],16)/255 for k in [1,3,5]];linear=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb];bs.inputs['Base Color'].default_value=(*linear,1)
  bs.inputs['Roughness'].default_value=.14 if kind=='drop' else .22
  for f in range(frames):
   o.rotation_euler=(math.radians(-8),0,f/frames*2*math.pi);s.render.filepath=str(out/f'{kind}-{ci}-{f:02}.png');bpy.ops.render.render(write_still=True)
  print('GIFT_BAKE',kind,ci,round(time.time()-start,1),flush=True)
 bpy.data.objects.remove(o,do_unlink=True)
print('GIFT_COMPLETE',round(time.time()-start,1),flush=True)

from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix

def plastic(name,color,rough=.24):
 m=material.copy();m.name=name;b=m.node_tree.nodes.get('Principled BSDF');rgb=[int(color[k:k+2],16)/255 for k in [1,3,5]];b.inputs['Base Color'].default_value=(*[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb],1);b.inputs['Roughness'].default_value=rough;return m

def render_fixed(name,objects,rotation=(0,0,0)):
 anchor=bpy.data.objects.new(name+' anchor',None);s.collection.objects.link(anchor)
 for o in objects:o.parent=anchor
 anchor.rotation_euler=rotation;bpy.context.view_layer.update()
 if name=='popper':
  uv=world_to_camera_view(s,co,anchor.matrix_world@Vector((0,0,.72)));(out/'launch-anchor.json').write_text(json.dumps({'mouth':[uv.x,1-uv.y],'heading':-.35}))
 s.render.filepath=str(out/f'{name}-0-00.png');bpy.ops.render.render(write_still=True)
 for o in objects:bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.objects.remove(anchor,do_unlink=True)

# Open, gently tapered party cone: diagonal purple/lavender bands, a real rim and hollow mouth.
vs=[];fs=[];N=96
for j in range(2):
 z=-.95 if j==0 else .72;rad=.025 if j==0 else .64
 for i in range(N):a=i/N*2*math.pi;vs.append((rad*math.cos(a),rad*math.sin(a),z))
for i in range(N):a=i;b=(i+1)%N;fs.append((a,b,b+N,a+N))
popper=mesh('Striped party cone',vs,fs);striped=plastic('Violet diagonal bands','#853DDD');nodes=striped.node_tree.nodes;links=striped.node_tree.links
tex=nodes.new('ShaderNodeTexCoord');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(tex.outputs['Generated'],sep.inputs[0]);mul=nodes.new('ShaderNodeMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=5.8;links.new(sep.outputs['Z'],mul.inputs[0]);xm=nodes.new('ShaderNodeMath');xm.operation='MULTIPLY';xm.inputs[1].default_value=.85;links.new(sep.outputs['X'],xm.inputs[0]);add=nodes.new('ShaderNodeMath');add.operation='ADD';links.new(mul.outputs[0],add.inputs[0]);links.new(xm.outputs[0],add.inputs[1]);fract=nodes.new('ShaderNodeMath');fract.operation='FRACT';links.new(add.outputs[0],fract.inputs[0]);gt=nodes.new('ShaderNodeMath');gt.operation='GREATER_THAN';gt.inputs[1].default_value=.52;links.new(fract.outputs[0],gt.inputs[0]);mix=nodes.new('ShaderNodeMixRGB');links.new(gt.outputs[0],mix.inputs[0]);
def linear(c):return tuple((v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4) for v in [int(c[i:i+2],16)/255 for i in [1,3,5]])+(1,)
mix.inputs[1].default_value=linear('#8135D2');mix.inputs[2].default_value=linear('#D2A9F4');links.new(mix.outputs[0],nodes.get('Principled BSDF').inputs['Base Color']);popper.data.materials.append(striped);popper.data.materials.append(plastic('Purple interior','#5721A0'));sol=popper.modifiers.new('Hollow wall','SOLIDIFY');sol.thickness=.045;sol.material_offset=1;sol.material_offset_rim=1;be=popper.modifiers.new('Soft edge','BEVEL');be.width=.018;be.segments=3
bpy.ops.mesh.primitive_torus_add(major_radius=.64,minor_radius=.025,major_segments=96,minor_segments=12,location=(0,0,.72));rim=bpy.context.object;rim.data.materials.append(plastic('Lilac mouth rim','#C19AEE'));[setattr(p,'use_smooth',True) for p in rim.data.polygons];render_fixed('popper',[popper,rim],(.48,-.35,0))
# A short rounded cylinder, ivory nose and gold barrel. No arrowhead.
objects=[];gold=plastic('Golden capsule','#FFCC32');ivory=plastic('Ivory nose','#FFF4C8')
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.25,depth=.64);o=bpy.context.object;o.data.materials.append(gold);objects.append(o)
for z,m in [(-.32,gold),(.32,ivory)]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=.25,location=(0,0,z));o=bpy.context.object;o.data.materials.append(m);objects.append(o)
for o in objects:
 for p in o.data.polygons:p.use_smooth=True
render_fixed('capsule',objects)
print('LAUNCH_ASSETS_COMPLETE',flush=True)
