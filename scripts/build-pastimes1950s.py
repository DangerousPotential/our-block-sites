"""Editable, original 1950s leisure models. Run Blender --background --python this file.
Existing worlds are never loaded or overwritten. Blender Z-up -> glTF Y-up.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
WORLD_PROJECT_ROOT=str(ROOT)
exec((ROOT/'scripts/build-worlds.py').read_text().split('def build(key):')[0])
OUT=ROOT/'public/assets/trip'; ART=ROOT/'art/pastimes1950s'
OUT.mkdir(parents=True,exist_ok=True); ART.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.edit.use_global_undo=False
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
exec((ROOT/'scripts/pastimes-mesh-primitives.py').read_text())
CREAM='#e5c998'; DARK='#28343e'; WOOD='#805338'; RED='#a9403a'; TEAL='#407776'; GOLD='#e6b568'
current=None; solids=[]; districts=[]; activities=[]; roots=[]
def B(n,x,z,y,w,d,h,c): return box(n,(x,-z,y),(w,d,h),c)
def S(t,x,z,y,size=.3,c=DARK): text(t,(x,-z,y),size,c)
def C(n,x,z,y,r,h,c,v=16): return cyl(n,(x,-z,y),r,h,c,v)
def rod(n,a,b,w,c): return beam(n,(a[0],-a[1],a[2]),(b[0],-b[1],b[2]),w,c)
def sign(t,x,z,y,w,size=.3):
    B(t+' signboard',x,z,y,w,.16,.7,RED); S(t,x,z+.09,y-.13,size,'#ffe1a1')
    for dx in range(int(w)+1):ball('Sign bulb',(x-w/2+dx,-z-.12,y-.4),(.065,.065,.065),'#ffe1a1')
def floor(x,z,w,d): B('Raised paved apron',x,z,.18,w,d,.24,'#ae967d')
def frame(x,z,w,h):
    for dx in [-w/2,w/2]: B('Timber post',x+dx,z,h/2,.14,.16,h,WOOD)
    B('Lintel',x,z,h,w+.2,.2,.2,WOOD)
def seat(x,z,y=.55):
    B('Timber bench',x,z,y,1.5,.45,.12,WOOD)
    B('Bench back',x,z-.18,y+.35,1.5,.1,.55,WOOD)
    for dx in [-.55,.55]:B('Bench leg',x+dx,z,y/2,.12,.3,y,WOOD)
def lamp(x,z):
    C('Lamp post',x,z,1.65,.065,3.1,DARK,8)
    ball('Warm lamp',(x,-z,3.23),(.17,.17,.24),'#ffe1a1')
    B('Lamp cap',x,z,3.48,.45,.45,.12,DARK)
def person(x,z,y=0,shirt=TEAL,scale=1):
    C('Resident torso',x,z,y+.65*scale,.18*scale,.43*scale,shirt,8)
    ball('Resident face',(x,-z,y+1.04*scale),(.18*scale,.17*scale,.21*scale),'#b67b52')
    ball('Resident hair',(x,-z+.035,y+1.18*scale),(.19*scale,.18*scale,.09*scale),DARK)
    for dx in [-.09,.09]:C('Resident trouser',x+dx*scale,z,y+.28*scale,.07*scale,.4*scale,DARK,8)
    for dx in [-.24,.24]:rod('Resident sleeve',(x+dx*scale,z,y+.83*scale),(x+dx*scale,z+.06,y+.5*scale),.065*scale,shirt)
def imagepanel(name,path,x,z,y,w,h):
    bpy.ops.mesh.primitive_plane_add(size=1,location=(x,-z,y),rotation=(math.pi/2,0,0))
    o=bpy.context.object;o.name=name;o.scale=(w,h,1)
    m=bpy.data.materials.new(name);m.use_nodes=True
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path),check_existing=True);tex.image.pack()
    m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85
    o.data.materials.append(m)
def begin(i,name,x,z,w,d,kind,lines,front=None):
    global before,current
    before=set(bpy.data.objects)
    current=bpy.data.objects.new('attraction_'+name,None);bpy.context.collection.objects.link(current);current['pastimeIndex']=i;roots.append(current)
    floor(x,z,w+1,d+1)
    solids.append(dict(x=x,z=z,w=w,d=d,padding=.15))
    p=dict(x=x,z=front if front is not None else z+d/2+1)
    districts.append(dict(**p,name=name.replace('-',' ').title(),role='pastime'))
    activities.append(dict(kind=kind,**p,count=4,name=name.replace('-',' ').title(),dialogue=lines,center=dict(x=x,z=z)))
def end():
    # Join static meshes within each attraction by material; preserve animated groups.
    objects=[o for o in bpy.data.objects if o not in before and o!=current]
    groups={}
    for o in objects:
        if o.type=='MESH' and not o.parent:groups.setdefault(o.data.materials[0].name,[]).append(o)
    for material,objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join()
        o=bpy.context.object;o.name=current.name+' '+material;o.parent=current
    print("Detail complete:",current.name,flush=True)
    for o in objects:
        try:
            if o.name in bpy.data.objects and not o.parent:o.parent=current
        except ReferenceError:pass
def animation_root(name,objects,origin):
    root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);root.location=(origin[0],-origin[1],origin[2])
    bpy.context.view_layer.update()
    for o in objects:o.parent=root;o.matrix_parent_inverse=root.matrix_world.inverted()
    return root

exec((ROOT/'scripts/pastimes-detail-helpers.py').read_text())
exec((ROOT/'scripts/pastimes-nostalgia-details.py').read_text())
exec((ROOT/'scripts/pastimes-historical-buildings.py').read_text())

# Ground, distinct paths and seawater. These remain outside attraction hit targets.
B('Dusk landscape',0,0,-.35,65,55,.5,'#685e70')
exec((ROOT/'scripts/pastimes-streets.py').read_text())
street_environment()
evening_hawker_cart(-5.4,14)
# Sea is inset within the map, continuous under the pagar, with a finished coastal edge.
B('Inset coastal water',-14.1,11.7,.12,12.2,9,.08,'#397c86')
for xx,zz,w,d in [(-20.3,11.7,.3,9.4),(-14.1,16.35,12.7,.3)]:
    B('Coastal map cut edge',xx,zz,-.12,w,d,.12,'#615548')
B('Landward seawall',-14.1,7.1,.19,12.2,.35,.32,'#b9a17d')
for j in range(32):B('Seawall stone joint',-20+j*.38,7.285,.23,.02,.018,.22,WOOD)
for j in range(18):
    xx=-19.7+j*.63
    ball('Foreshore stone',(xx,-7.55,.17),(.32,.27,.13),['#a09878','#8d9278','#b0a58a'][j%3])
# Water only: leave the promenade and U-shaped pagar deck navigable.
for xx,zz,ww,dd in [(-18.6,11.9,3.4,8.2),(-8.55,11.9,1.1,8.2),(-13,9.75,6.2,3.9),(-13,14.35,7.8,3.7)]:
    solids.append(dict(x=xx,z=zz,w=ww,d=dd,padding=0))

for x,z,scale in [(-18.6,-13.5,.85),(18.4,-13.3,.82),(18,12,.8),(-18.7,3,.9)]:shade_tree(x,z,scale)

# 1: Reference-led Cathay massing from NHB 2000-03733-271, 1950s.
begin(0,'cathay',-12,-10,8.6,7,'district_queue',['Pontianak is showing at Cathay in 1957.','The high-rise stands behind the cinema frontage.'])
cathay_1950s(-12,-10)
end()

# 2: exposed timber drum with rotating motorcyclist and rim spectators.
begin(1,'wall-of-death',0,-10,7,7,'district_stroll',['Look up at the rider inside the drum!','Great World had this extraordinary motorcycle attraction.'])
x,z=0,-10;r=3.1
for j in range(32):
    a=j*math.tau/32
    if math.sin(a)>.4:continue # front cutaway
    o=B('Timber stunt wall',x+r*math.cos(a),z+r*math.sin(a),2.3,.63,.16,4.4,WOOD);o.rotation_euler.z=-a-math.pi/2
    rod('Viewing rim',(x+r*math.cos(a),z+r*math.sin(a),4.7),(x+r*math.cos(a),z+r*math.sin(a),5.2),.04,DARK)
    if j%3==0:person(x+(r+.18)*math.cos(a),z+(r+.18)*math.sin(a),4.25,CREAM,.72)
exec((ROOT/'scripts/pastimes-great-world-gate.py').read_text())
great_world_gate()
exec((ROOT/'scripts/pastimes-wall-rider.py').read_text())
wall_rider(z)
# External gallery rings, vertical plank joints, stair and ticket hut.
for radius,yy in [(3.35,4.3),(3.45,4.7),(3.45,5.1)]:
    curve('Gallery rim rail',[(radius*math.cos(a),z+radius*math.sin(a),yy) for a in [math.pi*.12+j*math.pi*1.74/60 for j in range(61)]],.045,GOLD)
for j in range(50):
    a=j*math.tau/50
    if math.sin(a)>.4:continue
    rod('Timber drum plank joint',(3.13*math.cos(a),z+3.13*math.sin(a),.4),(3.13*math.cos(a),z+3.13*math.sin(a),4.4),.016,'#bd8c5b')
    if j%2==0:bead('Gallery bulb',3.18*math.cos(a),z+3.18*math.sin(a),4.35,.06)
for j in range(12):
    B('Spectator stair tread',-3.2,z+2.9-j*.3,.35+j*.32,.75,.32,.16,WOOD)
    if j%3==0:guest(-3.15,z+2.9-j*.3,.43+j*.32,.65)
rod('Stair handrail',(-3.6,z+3,.9),(-3.6,z-.7,4.85),.04,GOLD)
B('Stunt ticket hut',2.5,z+2.8,.65,1.25,.85,.9,RED)
for dx in [-.55,.55]:B('Ticket hut upright',2.5+dx,z+2.8,1.4,.07,.07,1.5,WOOD)
sign('TICKETS',2.5,z+3.25,2.15,1.45,.24)
notice('THRILLS|SKILL|COURAGE',-2.75,z+3.3,2,1)
bunting((-3.2,z-2.8,6),(3.2,z-2.8,6),11)
festoon((-3.3,z+3,5.6),(3.3,z+3,5.6),17)
for j in range(15):
    a=math.pi*.95+j*math.pi*.9/14
    guest(3.38*math.cos(a),z+3.38*math.sin(a),4.25,.72)

glow(0,z,3.2,200)

end()

# 3: Arched bandstand and timber dance hall, NHB 1998-00219.
begin(2,'bunga-tanjong',0,0,7,5,'district_dance',['The band plays at Bunga Tanjong in New World.','Dance partners take the floor for joget.'])
bunga_tanjong_1950s()
end()
# Stagger the collage so this tall arch does not hide Great World's entrance.
current.location.x = -4.5
solids[-1]['x'] -= 4.5
districts[-1]['x'] -= 4.5
activities[-1]['x'] -= 4.5
activities[-1]['center']['x'] -= 4.5

# 4: Grandstands and concrete fins of the Guillemard Road hall.
begin(3,'badminton',12,-10,9,7,'district_exercise',['The Thomas Cup is here in 1955.','The 1952 tournament was at Happy World.'])
x,z=12,-10
B('Hall rear wall',x,z-3.4,2.4,9,.2,4.6,CREAM)
for dx in [-4.4,4.4]:
    B('Hall side wall',x+dx,z,2.4,.2,7,4.6,CREAM)
    for zz in [-2,0,2]:B('Concrete fin',x+dx,z+zz,2.5,.4,.18,4.7,CREAM)
for zz in [-2.8,-1.4,0]:
    rod('Roof truss',(x-4.3,z+zz,4.7),(x,z+zz,5.8),.075,DARK)
    rod('Roof truss',(x,z+zz,5.8),(x+4.3,z+zz,4.7),.075,DARK)
B('Court',x,z,.35,4.7,5.8,.09,TEAL)
for dx in [-2.2,2.2]:B('Court line',x+dx,z,.405,.045,5.6,.012,CREAM)
for zz in [-2.8,0,2.8]:B('Court line',x,z+zz,.406,4.4,.045,.012,CREAM)
for dx in [-2.4,2.4]:C('Net pole',x+dx,z,1,.04,1.3,DARK,8)
for yy in [.5,.7,.9,1.1,1.3]:rod('Net cord',(x-2.4,z,yy),(x+2.4,z,yy),.012,CREAM)
for xx in range(-10,11):rod('Net cord',(x+xx*.23,z,.5),(x+xx*.23,z,1.3),.009,CREAM)
for side in [-1,1]:
    for row in range(2):
        xx=x+side*(3+row*.65);B('Tiered grandstand',xx,z,.55+row*.45,.55,5.8,.7+row*.6,WOOD)
        for zz in [-2,-.7,.7,2]:person(xx,z+zz,.85+row*.4,CREAM,.7)
badminton_entrance(x,z)
# Open roof has diagonal steel webs, louvres and championship banners.
for zz in [-2.8,-1.4,0]:
    rod('Truss lower tie',(x-4.3,z+zz,4.72),(x+4.3,z+zz,4.72),.045,DARK)
    for side in [-1,1]:
        for j in range(4):
            xx=j*1.05
            rod('Truss triangular web',(x+side*xx,z+zz,4.72),(x+side*(xx+.55),z+zz,5.8-(xx+.55)*.25),.033,DARK)
for xx in [-3.95,3.95]:
    for zz in [-2.1,-.8,.5,1.8]:
        for yy in [3.1,3.3,3.5,3.7]:B('Ventilation louvre',x+xx,z+zz,yy,.05,.85,.065,GOLD)
for xx in [-3.85,3.85]:
    B('Blue championship banner',x+xx,z+3.69,3.12,.5,.05,1.7,'#314e75')
    S('1955',x+xx,z+3.73,3.05,.17,CREAM)
for zz in [-1.8,1.8]:
    guest(x+.55,z+zz,.4,1,'dance',CREAM)
    arc('Badminton racket',x+1.22,z+zz,1.8,.45,.5,.021,CREAM)
    rod('Racket shaft',(x+1.22,z+zz,1.8),(x+.97,z+zz,1.45),.025,WOOD)
notice('THOMAS CUP|MALAYA|DENMARK',x-2.9,z+3.58,1.7,1.35)
for xx in [-3.5,3.5]:planter(x+xx,z+2.8,.42)
railing(x,z+3.25,4.8,.4,.7)

for side in [-1,1]:
    for row in range(3):
        for j in range(5):guest(x+side*(2.9+row*.27),z-2.1+j*.8,.6+row*.3,.65)

glow(x,z,4,220)

end()

# 5: Reference-led seafront promenade and low dressing block, NAS 36621.
begin(4,'katong',-13,9,7,5,'district_stroll',['The pagar extends into the sea.','Forty dressing rooms served the public bathing enclosure.'],front=8)
# The enclosure is not a solid building; water and changing rooms have separate bounds.
solids.pop()
districts[-1]['x']=-9.5
activities[-1]['x']=-9.5
for o in list(bpy.data.objects):
    if o not in before and o.name.startswith('Raised paved apron'):bpy.data.objects.remove(o,do_unlink=True)
katong_1950s()
solids.append(dict(x=-13,z=5.95,w=8.6,d=1.8,padding=.15))
end()

# 6: Farmer-family tableau following NHB 2000-05931, without an invented gateway.
begin(5,'tiger-balm',12,4,7,6,'district_browse',['These painted figures tell stories.','A 1950s postcard shows this farmer-and-wife scene.'])
tiger_balm_1950s(12,4)
end()

# 7: Everyday coffeeshop listening, with an exposed shophouse interior.
begin(6,'rediffusion',0,11,6,4,'district_chat',['The coffee shop shares a wired Rediffusion set.','Neighbours listen to songs and dialect stories over coffee.'])
rediffusion_shophouse()
end()



# Small period street details remain out of the walkable approaches.
for xx,zz in [(-18,-9),(18,3),(6,12)]:bicycle(xx,zz)
# Convert authored sRGB swatches to Blender's linear material space once.
for color,material in palette.items():
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    linear=[v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    material.diffuse_color=(*linear,1)
    material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*linear,1)
    if color in ['#807486','#847889','#887b8e','#8c7f92','#397c86']:
        material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.28
# Lamps retain emission in Blender and the exported materials.
for color in ['#ffe1a1','#ffc776']:
    bsdf=mat(color).node_tree.nodes['Principled BSDF']
    bsdf.inputs['Emission Color'].default_value=(1,.55,.17,1)
    bsdf.inputs['Emission Strength'].default_value=5

bsdf=mat('#dbe9d8').node_tree.nodes['Principled BSDF']
bsdf.inputs['Emission Color'].default_value=(.78,.88,1,1)
bsdf.inputs['Emission Strength'].default_value=3

# Batch static street geometry by material so paving detail does not add hundreds of draw calls.
scenery={}
for o in list(bpy.data.objects):
    if o.type=='MESH' and o.parent is None:
        scenery.setdefault(o.data.materials[0].name,[]).append(o)
for material,objects in scenery.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    bpy.context.object.name='Street scenery '+material

# Export individual components and combined world. Extras preserve picking identifiers.
for root in roots:
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
    for child in root.children_recursive:child.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(root.name+'.glb')),export_format='GLB',use_selection=True,export_extras=True)
meta=dict(id='pastimes',bounds=dict(x=20,z=16),groundSize=dict(x=42,z=35),spawn=dict(x=0,z=5),
    board=[dict(x=4*math.cos(j*math.tau/22),z=5+2*math.sin(j*math.tau/22)) for j in range(22)],
    npcs=[dict(x=-12,z=-5.5),dict(x=-4,z=3),dict(x=12,z=-5),dict(x=0,z=14)],
    solids=solids,animated=['anim_pastime_motorcycle'],districts=districts,activities=activities)
(OUT/'pastimes.json').write_text(json.dumps(meta,indent=2))
# A ready-to-render camera is saved with the editable scene.
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.12,.08,.22,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.3
bpy.ops.object.camera_add(location=(8,-38,28))
camera=bpy.context.object;camera.name='Overview camera';camera.rotation_euler=(Vector((0,0,3.6))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=59;scene.camera=camera
for name,loc,energy,size,color in [('Warm key',(-15,-12,28),3700,18,(1,.64,.32)),('Lavender fill',(10,8,22),3200,25,(.56,.6,1))]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.filepath=str(ART/'blender-overview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'singapore-at-play.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'pastimes.glb'),export_format='GLB',export_extras=True)
print('Exported seven attractions and 1950s world')

if '--no-render' not in __import__('sys').argv:
    bpy.ops.render.render(write_still=True)
