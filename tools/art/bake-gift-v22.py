import bpy,math,sys,time,json
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
preview='--preview' in args
out=Path(__file__).resolve().parents[2].parent/'v22-gift-frames';out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=20;s.cycles.use_denoising=True;s.render.resolution_x=160;s.render.resolution_y=160;s.render.resolution_percentage=100;s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
s.view_settings.view_transform='Standard';s.view_settings.exposure=-.4
s.world.color=(.24,.24,.24)
# Three broad studio cards give the same light language to every object.
def area(name,loc,power,size,sy,color):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='RECTANGLE';data.size=size;data.size_y=sy;data.color=color;o=bpy.data.objects.new(name,data);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key softbox',(-3,-4,4),480,4,1.6,(1,.94,.84));area('Front fill',(3,-3,1),160,3,3,(.80,.90,1));area('Rim card',(2,2,3),550,2,4,(1,.90,1))
camera=bpy.data.cameras.new('Camera');co=bpy.data.objects.new('Camera',camera);s.collection.objects.link(co);co.location=(0,-6,.15);co.rotation_euler=(Vector((0,0,0))-co.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=2.9;s.camera=co
colors=['#FFCC32','#853DDD','#E94355','#367DD9','#CE36A6','#EF8950']
material=bpy.data.materials.new('Glazed soft plastic');material.use_nodes=True;bs=material.node_tree.nodes.get('Principled BSDF')
for k,v in {'Metallic':.08,'Roughness':.22,'IOR':1.47,'Coat Weight':.45,'Coat Roughness':.13,'Subsurface Weight':.045}.items():
 if k in bs.inputs:bs.inputs[k].default_value=v

def mesh(name,verts,faces):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);s.collection.objects.link(o)
 for f in me.polygons:f.use_smooth=True
 return o

def puff(name,points=5,exponent=.55):
 verts=[];faces=[];N=72;M=34
 for j in range(M+1):
  phi=-math.pi/2+j/M*math.pi
  for i in range(N):
   a=i/N*math.pi*2+math.pi/2
   if points==5:
    step=math.pi/5;q=(a-math.pi/2)%(2*math.pi);k=int(q/step);aa=k*step;bb=aa+step;ra=1 if k%2==0 else .47;rb=.47 if k%2==0 else 1
    ax,ay=ra*math.cos(aa),ra*math.sin(aa);bx,by=rb*math.cos(bb),rb*math.sin(bb);ux,uy=math.cos(q),math.sin(q);r=(ax*by-ay*bx)/(ux*(by-ay)-uy*(bx-ax))
   else:r=(abs(math.cos(a))**exponent+abs(math.sin(a))**exponent)**(-1/exponent)
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
  t=j/N;a=t*math.pi*(5 if tube else 1.15);x=(.64 if tube else .28)*math.sin(a);y=(.36 if tube else .13)*math.cos(a);z=1.04-2.08*t
  for i in range(M):
   if tube:
    q=i/M*2*math.pi;vs.append((x+.165*math.cos(q),y+.165*math.sin(q),z))
   else:
    w=(i-.5)*.50;q=t*math.pi*.90+.35;vs.append((x+w*math.cos(q),y+w*math.sin(q),z))
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

# Match reference proportions with separate real geometry, rather than a star-only substitution.
base_make=make
def make(kind):
 if kind=='twinkle':return base_make('bead')
 if kind=='fourstar':return puff('Inflated fourpoint',4,.82)
 if kind=='coil':
  cv=bpy.data.curves.new('Round coil path','CURVE');cv.dimensions='3D';cv.bevel_depth=.18;cv.bevel_resolution=6;cv.use_fill_caps=True;sp=cv.splines.new('POLY');sp.points.add(159)
  for i,p in enumerate(sp.points):
   t=i/159;a=t*math.pi*4.4;p.co=(.54*math.sin(a),.36*math.cos(a),1.0-2*t,1)
  o=bpy.data.objects.new('Thick rounded coil',cv);s.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');return bpy.context.object
 if kind=='cube':
  bpy.ops.mesh.primitive_cube_add(size=1.35);o=bpy.context.object;be=o.modifiers.new('Soft corners','BEVEL');be.width=.17;be.segments=5;no=o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');return o
 if kind=='triangle':
  vs=[(-.78,-.20,-.50),(.78,-.20,-.50),(0,-.20,.85),(-.78,.20,-.50),(.78,.20,-.50),(0,.20,.85)];o=mesh('Triangular charm',vs,[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)]);be=o.modifiers.new('Rounded triangle','BEVEL');be.width=.12;be.segments=5;return o
 if kind=='cylinder':
  bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.32,depth=1.65);o=bpy.context.object;be=o.modifiers.new('Capsule bevel','BEVEL');be.width=.10;be.segments=5;return o
 if kind=='wave':
  cv=bpy.data.curves.new('Soft S curl','CURVE');cv.dimensions='3D';cv.bevel_depth=.15;cv.bevel_resolution=5;cv.resolution_u=32;sp=cv.splines.new('BEZIER');sp.bezier_points.add(4)
  for p,xyz in zip(sp.bezier_points,[(.35,0,.85),(-.30,.05,.48),(0,0,0),(.30,-.05,-.48),(-.35,0,-.85)]):p.co=xyz;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
  o=bpy.data.objects.new('S curl',cv);s.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');return bpy.context.object
 return base_make(kind)
assets={'star':[0,3,4],'bead':[0,1,2,3,4,5],'ring':[0,1],'ribbon':[0,1,2,3,4,5],'coil':[1,2],'sparkle':[0],'fourstar':[3,4],'cube':[1,3,5],'triangle':[0,4],'cylinder':[1],'wave':[3,4],'twinkle':[0,1]}
start=time.time()
for kind,variants in assets.items():
 o=make(kind);o.data.materials.append(material)
 for ci in variants:
  overrides={'star0':'#FFDA60','fourstar3':'#658AD9','fourstar4':'#DB4D95','cube3':'#65B9E9','cube5':'#ED936B','ring0':'#EFC76D','ring1':'#B45BDF','bead0':'#F1CE6D','bead2':'#DF6C71','bead3':'#5C9CD6','bead4':'#D74DAB','wave3':'#5485D0','wave4':'#DA51B6','coil1':'#9B31D8','coil2':'#D93E58','ribbon0':'#F1C650','ribbon1':'#9B43D9','cylinder1':'#7D3BD2'}
  color=(['#C32CFF','#83E7C3'][ci] if kind=='twinkle' else overrides.get(kind+str(ci),colors[ci]));rgb=[int(color[k:k+2],16)/255 for k in [1,3,5]];linear=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb];bs.inputs['Base Color'].default_value=(*linear,1);bs.inputs['Roughness'].default_value=.36 if kind=='twinkle' else .27
  frames=1 if kind in ['bead','twinkle'] else 12
  for f in range(frames):
   o.rotation_euler=(math.radians(15 if kind in ['cube','cylinder','triangle'] else -8),math.radians(8),f/frames*2*math.pi);s.render.filepath=str(out/f'{kind}-{ci}-{f:02}.png');bpy.ops.render.render(write_still=True)
  print('GIFT_V22',kind,ci,round(time.time()-start,1),flush=True)
 bpy.data.objects.remove(o,do_unlink=True)
(out/'variants.json').write_text(json.dumps(assets));print('V22_COMPLETE',flush=True)
