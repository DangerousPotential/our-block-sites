"""Original low-poly Singapore dioramas. Run inside Blender through Blender MCP."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(globals().get('WORLD_PROJECT_ROOT', str(Path.cwd())))
OUT = ROOT / 'public/assets/worlds'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'art'
SOURCE.mkdir(exist_ok=True)
palette = {}
def mat(color):
    if color not in palette:
        m = bpy.data.materials.new(color)
        m.diffuse_color = (*tuple(int(color[i:i+2],16)/255 for i in (1,3,5)),1)
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = m.diffuse_color
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .82
        palette[color] = m
    return palette[color]
def box(name, loc, scale, color, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat(color))
    if bevel:
        mod=o.modifiers.new('Soft edges','BEVEL'); mod.width=bevel; mod.segments=2
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def cyl(name,loc,r,depth,color,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat(color)); return o
def ball(name,loc,scale,color):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat(color));return o
def beam(name,a,b,width,color):
    o=cyl(name,(Vector(a)+Vector(b))/2,width,(Vector(b)-Vector(a)).length,color,8)
    o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o
def text(body,loc,size=.22,color='#fff0ca'):
    bpy.ops.object.text_add(location=loc,rotation=(math.pi/2,0,0))
    o=bpy.context.object;o.name=body;o.data.body=body;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.002;o.data.materials.append(mat(color))
    bpy.ops.object.convert(target='MESH')
def roof(x,y,z,w,d,color):
    for side in [-1,1]:
        o=box('Pitched roof',(x+side*w/4,y,z),(w*.57,d,.13),color)
        o.rotation_euler[1]=side*math.radians(28)
def tree(x,y,palm=False):
    beam('Tree trunk',(x,y,.2),(x+.1,y,2.1),.12,'#73503c')
    if palm:
        for j in range(7):
            a=j*math.tau/7
            o=ball('Palm frond',(x+math.cos(a)*.5,y+math.sin(a)*.5,2.3),(.8,.18,.13),'#398459');o.rotation_euler[2]=a
    else:
        for dx,dy,dz in [(-.35,0,0),(.35,.1,.1),(0,-.15,.5)]:ball('Rain tree canopy',(x+dx,y+dy,2.1+dz),(.8,.7,.6),'#48895b')
def shophouse(x,y,color,label):
    box('Shophouse',(x,y,1.45),(1.7,1.8,2.5),color,.06)
    roof(x,y,2.92,1.9,2.05,'#aa503a')
    box('Five foot way',(x,y-1.15,.26),(1.85,.8,.12),'#e5cc9c')
    for dx in [-.66,.66]:box('Arcade column',(x+dx,y-1.35,.9),(.12,.12,1.3),'#f8e7cb')
    box('Shop window',(x,y-.92,.97),(1.15,.05,.72),'#284c50')
    for dx in [-.43,.43]:
        box('Timber shutters',(x+dx,y-.92,2.1),(.48,.08,.75),'#367572')
        for dz in [-.22,-.07,.08,.23]:box('Shutter louvre',(x+dx,y-.98,2.1+dz),(.46,.035,.035),'#b3d6bc')
    box('Shop sign',(x,y-1,1.51),(1.5,.08,.28),'#633e37')
    text(label,(x,y-1.05,1.45),.16)
def hdb(x,y,floors,color,label):
    w=3.7;h=floors*.62
    for dx in [-1.55,0,1.55]:box('Void deck pillar',(x+dx,y,.65),(.22,1.4,.9),'#eae0c8')
    box('HDB block',(x,y,1+h/2),(w,1.7,h),color,.04)
    for floor in range(floors):
        z=1.23+floor*.62
        box('Common corridor',(x,y-.91,z-.2),(w+.15,.34,.11),'#f8eed8')
        for dx in [-1.35,-.68,0,.68,1.35]:box('Apartment window',(x+dx,y-.865,z+.07),(.36,.04,.33),'#31535d')
    box('Block roof',(x,y,1+h+.12),(w+.2,1.9,.18),'#e5d3a7')
    box('Stair tower',(x+1.55,y+.3,1+h/2),(.55,1.8,h+.4),'#dc8966')
    text(label,(x-1.3,y-.98,h+.7),.36,'#473c39')
def hawker(x,y):
    box('Hawker centre',(x,y,.36),(4.8,2,.25),'#e1d3b3')
    for dx in [-2.1,-.7,.7,2.1]:box('Hawker column',(x+dx,y,1.05),(.1,1.5,1.5),'#6c6954')
    roof(x,y,1.94,5.1,2.3,'#d06645')
    for i,label in enumerate(['KOPI','NASI','PRATA','KUEH']):
        dx=x-1.8+i*1.2
        box('Stall counter',(dx,y-.85,.65),(1.08,.4,.7),['#d6ab43','#478b87','#cd7454','#729954'][i])
        text(label,(dx,y-1.07,1.3),.17)
        cyl('Kopi table',(dx,y-1.7,.56),.3,.09,'#d2b17c')
        cyl('Table leg',(dx,y-1.7,.34),.055,.4,'#5f6556')
def dragon(x,y):
    for j in range(8):
        ball('Dragon mosaic body',(x+j*.19,y,.7+math.sin(j*.45)*.28),(.24,.23,.23),'#dc8548')
    ball('Dragon head',(x+1.55,y,1.3),(.35,.3,.45),'#df934b')
    ball('Dragon eye',(x+1.58,y-.29,1.43),(.075,.035,.075),'#fff8dd')
    ball('Dragon pupil',(x+1.6,y-.32,1.43),(.035,.02,.04),'#273e4d')
    beam('Slide',(x+1.55,y,1),(x+2.2,y-.45,.27),.17,'#dfcbaa')
    for j in range(7):box('Mosaic tile',(x+j*.2,y-.23,.8),(.12,.04,.12),'#edce84')
def build(key):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    box('Island plinth',(0,0,-.3),(19,15,.8),'#325e58',.35)
    box('Neighbourhood ground',(0,0,.12),(18.7,14.7,.15),'#b4c889',.2)
    box('Courtyard',(0,0,.23),(13.9,10,.1),'#e7d7b4',.3)
    colors=['#e5b454','#4d9993','#c96956','#7eaa69']
    for i in range(22):
        a=math.tau*i/22+math.pi/2
        x,y=6.15*math.cos(a),4.15*math.sin(a)
        tile=box('Route tile %02d'%i,(x,y,.35),(1.14,.91,.15),colors[i%4],.1)
        tile.rotation_euler[2]=a+math.pi/2
        cyl('Tile stud',(x,y,.436),.09,.02,'#fff2cb')
    # A clear, identical walkable loop in every era; architecture stays outside it.
    shophouse(-6,-5.7,'#e7b165','KOPITIAM')
    shophouse(-4.15,-5.7,'#7daead','PROVISIONS')
    if key=='kampong':
        for x in [-1.8,1.1,4]:
            for dx in [-.8,.8]:box('Kampong stilts',(x+dx,-5.7,.5),(.14,1.4,.8),'#624f39')
            box('Timber kampong home',(x,-5.7,1.4),(2.2,1.6,1.7),'#cda16e')
            roof(x,-5.7,2.45,2.55,1.95,'#715c4b')
            box('Timber door',(x,-6.53,1.15),(.45,.05,1),'#584d40')
        for x in [-7.9,7.8]:
            for y in [-4,0,4]:tree(x,y,True)
        box('Community court',(0,0,.32),(4.4,2.5,.1),'#caaa76')
        beam('Washing line',(-1,0,1.5),(1.8,0,1.5),.025,'#66513a')
        for j in range(4):box('Laundry',(-.7+j*.6,0,1.2),(.36,.035,.5),colors[j])
        for x in [-2,2]:cyl('Water jar',(x,.7,.65),.25,.7,'#8a6450')
    else:
        hdb(-.9,-5.7,5 if key=='estate' else 7,'#edd1a1','128')
        hdb(4,-5.7,6 if key=='estate' else 8,'#c4d9cf','129')
        hawker(0,.1)
        dragon(-1.6,-2.7)
        for x in [-7.9,7.8]:
            for y in [-3,1,4.8]:tree(x,y)
        if key in ['town','garden']:
            for x in [-7,-3,1,5]:box('MRT viaduct pier',(x,6.3,1.1),(.25,.5,2),'#b6b8a5')
            box('MRT viaduct',(0,6.3,2.2),(17,1,.28),'#aab2a3')
            box('MRT train',(1,6.3,2.77),(4.8,.72,.75),'#e9e7d9',.15)
            box('Train red stripe',(1,5.93,2.6),(4.6,.035,.13),'#bb4c49')
            for x in [-.7,0,.7,1.4,2.1,2.8]:box('Train window',(x,5.92,2.87),(.48,.03,.24),'#375560')
        if key=='garden':
            for x in [-.9,4]:
                for dx in [-1,0,1]:box('Rooftop solar panel',(x+dx,-5.7,5.55 if x<0 else 6.17),(.8,1,.04),'#33596f')
            for x in [-3.7,3.7]:
                box('Community garden bed',(x,2.1,.5),(1,1.4,.35),'#91694d',.05)
                for dy in [-.4,0,.4]:ball('Garden herbs',(x,2.1+dy,.83),(.32,.25,.27),'#4b8e55')
            box('Cycling path',(0,5.3,.26),(16,.55,.035),'#b85e53')
    # Everyday cultural details: lanterns, coffee cups and provision baskets.
    for x in [-6.5,-5.5,-4.65,-3.65]:
        ball('Shop lantern',(x,-6.8,1.75),(.12,.12,.16),'#c74936')
        beam('Lantern tassel',(x,-6.8,1.62),(x,-6.8,1.49),.02,'#e5b454')
    for x in [-5.7,-4.1]:
        box('Provision crate',(x,-7,.4),(.45,.36,.28),'#a27743')
        for dx in [-.12,.1]:ball('Fruit',(x+dx,-7,.58),(.12,.12,.12),'#e6a136')
    if key!='kampong':
        for x in [-1.8,-.6,.6,1.8]:
            cyl('Kopi saucer',(x,-1.6,.62),.09,.025,'#eee8cb')
            cyl('Kopi cup',(x,-1.6,.69),.055,.12,'#f5efd7')
    for o in bpy.context.scene.objects:
        if o.name.startswith(('MRT ', 'Train ')):
            old_x=o.location.x
            o.location.x=-8.4-(o.location.y-6.3)
            o.location.y=old_x
            o.rotation_euler.z+=math.pi/2
    for x in [-4.3,4.3]:
        box('Bench',(x,0,.55),(1.1,.4,.12),'#956740',.04)
        box('Bench back',(x,.18,.85),(1.1,.08,.5),'#956740',.03)
    # Move the residential row behind the route to keep all player positions visible.
    for o in bpy.context.scene.objects:
        if o.location.y < -4.5 and abs(o.location.x) < 7:
            o.location.y += 11.4
    # Export merged material batches for fast browser rendering.
    bpy.ops.object.select_all(action='DESELECT')
    groups={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH':groups.setdefault(o.data.materials[0].name,[]).append(o)
    for name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'.glb')),export_format='GLB',use_selection=True)
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.72,.75,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
    bpy.ops.object.light_add(type='AREA',location=(-5,-6,14));bpy.context.object.data.energy=2300;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=8
    bpy.ops.object.camera_add(location=(19,-25,23))
    cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=25;scene.camera=cam
    scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100
    scene.render.filepath=str(OUT/(key+'.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(key+'.blend')))
    bpy.ops.render.render(write_still=True)
for era in ['kampong','estate','town','garden']:build(era)
print('SINGAPORE_WORLDS_COMPLETE')
