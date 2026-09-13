"""Blender-native connected neighbourhoods; coordinates below use game x/z.
Run in a fresh Blender scene. Original geometry and packed texture maps.
"""
from pathlib import Path
import random
root=Path(WORLD_PROJECT_ROOT)
exec((root/'scripts/build-worlds.py').read_text().split("for era in ['kampong'")[0])
OUT=root/'public/assets/neighbourhood'; OUT.mkdir(parents=True,exist_ok=True)
random.seed(87)

def B(n,x,z,y,w,d,h,c,bevel=.03):return box(n,(x,-z,y),(w,d,h),c,bevel)
def C(n,x,z,y,r,h,c):return cyl(n,(x,-z,y),r,h,c)
def S(n,x,z,y,s,c):return ball(n,(x,-z,y),s,c)
def T(label,x,z,y,size=.35,c='#fff1c7'):text(label,(x,-z,y),size,c)
def shade(x,z,w,d,c):roof(x,-z,3.25,w,d,c)
def tree(x,y,palm=False):
    beam('Rain tree trunk',(x,y,.1),(x,y,3.4),.2,'#795d40')
    for dx,dy,h in [(-1,0,3.7),(1,.2,3.8),(0,-.8,4.1),(0,.6,4.8)]:
        beam('Spreading branch',(x,y,2.8),(x+dx,y+dy,h),.1,'#795d40')
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(x+dx,y+dy,h))
        o=bpy.context.object;o.name='Leafy rain tree canopy';o.scale=(1.7,1.5,1.1);o.data.materials.append(mat('#4d885c' if not palm else '#39805b'))

def pot(x,z):
    C('Terracotta flowerpot',x,z,.35,.3,.6,'#b86b4c')
    for a in range(5):
        q=a*math.tau/5;S('Pandan leaves',x+math.cos(q)*.2,z+math.sin(q)*.2,.8,(.12,.16,.55),'#457c4f')
def seat(x,z):
    B('Timber bench',x,z,.55,1.8,.55,.15,'#936a43')
    B('Bench backrest',x,z-.23,.95,1.8,.1,.6,'#ae8057')
    for dx in [-.65,.65]:B('Bench iron legs',x+dx,z,.25,.12,.4,.5,'#355a58')
def table(x,z):
    C('Marble kopi tabletop',x,z,.95,.63,.13,'#f0e6d1')
    C('Cast iron table pedestal',x,z,.48,.09,.9,'#33595a')
    for dx,dz in [(-.9,0),(.9,0),(0,.9)]:C('Kopitiam stool',x+dx,z+dz,.48,.23,.6,'#a77649')
    for dx in [-.22,.22]:
        C('Enamel cup',x+dx,z,1.12,.09,.18,'#ece3c5')
        C('Kopi surface',x+dx,z,1.215,.071,.008,'#513a28')
    B('Kaya toast',x,z+.25,1.05,.3,.22,.055,'#d6a652')
def bicycle(x,z):
    for dx in [-.5,.5]:
        bpy.ops.mesh.primitive_torus_add(major_radius=.35,minor_radius=.045,major_segments=16,minor_segments=6,location=(x+dx,-z,.45),rotation=(math.pi/2,0,0))
        bpy.context.object.name='Bicycle wheel';bpy.context.object.data.materials.append(mat('#355355'))
    for a,b in [((x-.5,-z,.45),(x,-z,1)),((x+.5,-z,.45),(x,-z,1)),((x-.5,-z,.45),(x+.5,-z,.45))]:beam('Bicycle frame',a,b,.045,'#b95846')
def shop(x,z,label,c,kind='kopi'):
    B('Shop floor',x,z,.17,9,6,.3,'#c9b18b')
    B('Plaster back wall',x,z-2.8,2.7,9,.22,5.4,c)
    for dx in [-4.4,4.4]:B('Party wall',x+dx,z,2.5,.18,6,5,c)
    B('Upper storey',x,z,4.05,9,5.9,2.3,c)
    for dx in [-3,0,3]:
        B('Teal shutters',x+dx,z+3.01,4.2,1.8,.12,1.55,'#397e76')
        for dz in range(7):B('Louvred shutter slat',x+dx,z+3.09,3.56+dz*.2,1.7,.04,.06,'#98b69a',0)
        B('Arcade column',x+dx,z+3.45,1.4,.23,.23,2.8,'#eee0b8')
    roof(x,-z,5.55,9.7,6.8,'#b95b42')
    for i in range(29):
        dx=-4.2+i*.3;h=6.77-abs(dx)*.53
        beam('Terracotta tile ridge',(x+dx,-z-3.15,h),(x+dx,-z+3.15,h),.055,'#cf8660')
    B('Timber signboard',x,z+3.15,2.8,8.2,.17,.6,'#285e58')
    T(label,x,z+3.27,2.61,.49)
    B('Tiled five foot way',x,z+3.65,.13,9.5,1.5,.14,'#c7d2b4')
    for dx in [-3,0,3]:
        B('Shop counter',x+dx,z+1,.67,2.3,.85,1.3,'#b48452')
        for k in range(4):
            C('Biscuit tin' if kind!='kopi' else 'Coffee tin',x+dx-.75+k*.5,z+.85,1.53,.16,.4,['#d8af58','#b75d43','#438c83'][k%3])
    if kind=='kopi':
        C('Coffee urn',x-2,z,.95,.4,1.8,'#899f97')
        for dx in [-2.3,2.3]:table(x+dx,z+5.4)
    else:
        for dx in [-2,0,2]:
            B('Provision crate',x+dx,z+4.8,.38,1.2,.8,.6,'#9c744c')
            for j in range(4):S('Oranges',x+dx-.4+j*.25,z+4.8,.76,(.14,.14,.14),'#dca84c')
    for dx in [-4.4,4.4]:pot(x+dx,z+4.7)
    B('Paper calendar',x+4.25,z+2.8,1.8,.3,.03,.48,'#e4d9b8')
    bicycle(x-4,z+6)
def stall(x,z,label,c):
    B('Market terrazzo counter',x,z,.65,3,1.5,1.3,c)
    for dx in [-1.4,1.4]:B('Stall poles',x+dx,z,1.6,.1,.1,3,'#5a7566')
    roof(x,-z,3,3.5,2.2,'#c56b4e')
    for dx in [-1.2,-.4,.4,1.2]:
        B('Striped fabric awning',x+dx,z+.8,2.55,.4,.9,.12,'#efd6a2',0)
    T(label,x,z+.9,2.06,.29,'#2c5149')
    for dx in [-.9,-.3,.3,.9]:
        B('Wicker basket',x+dx,z+.1,1.37,.5,.7,.18,'#b78c53')
        for dz in [-.15,.15]:S(label+' produce',x+dx,z+dz,1.55,(.16,.17,.2),c)
def textures():
    # Packed UV albedo maps created inside Blender, not unsupported shader-only noise.
    for c,m in palette.items():
        base=[int(c[i:i+2],16)/255 for i in (1,3,5)]
        image=bpy.data.images.new('Handcrafted surface '+c,64,64)
        pixels=[]
        for y in range(64):
            for x in range(64):
                f=1+random.uniform(-.075,.075)
                if x%32<1 or y%32<1:f*=.8
                pixels.extend([min(1,v*f) for v in base]+[1])
        image.pixels=pixels;image.pack()
        node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
        m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
def build_walk(era):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    B('Continuous neighbourhood terrain',0,0,-.4,110,110,.7,'#789761',0)
    B('East west pedestrian street',0,1,.02,64,7,.12,'#dbcaa5',0)
    B('North south pedestrian street',0,0,.025,6,64,.12,'#d7c5a5',0)
    for x in [-19,19]:B('Side lane',x,0,.035,4,51,.12,'#cdbb95',0)
    for z in [-17,17]:B('Cross lane',0,z,.045,60,4,.12,'#d4c29c',0)
    for x in range(-29,30,2):
        for z in [-2.7,4.7]:B('Kerb stone',x,z,.1,1.95,.2,.2,'#e2d1ab',0)
    shop(-10,-10,'KOPI & TOAST','#e5c689')
    shop(10,-10,'PROVISION SHOP','#82b3a0','provision')
    C('AnimatedCoffeePot',-12,-7.8,1.9,.22,.5,'#759d94')
    C('AnimatedCoffeeStream',-11.75,-7.55,1.5,.035,.7,'#6e4227')
    C('AnimatedCoffeeCup',-11.75,-7.55,1.2,.16,.25,'#efe1be')
    for i in range(3):S('AnimatedSteam'+str(i),-11.75,-7.55,1.6+i*.2,(.08,.08,.12),'#e4dfbd')
    for x,label,c in [(-12,'PANDAN','#59894e'),(-8,'EGGS','#d1b471'),(-4,'COCONUT','#a8794b')]:stall(x,11,label,c)
    for dx in [-12,-8]:table(dx,7)
    # Open-front hawker row with real cooking utensils and tiled counters.
    for x,label,c in [(5,'NASI','#73a892'),(9,'PRATA','#d3a957'),(13,'KUEH','#ba7059')]:stall(x,11,label,c)
    for x in [5,9,13]:
        table(x,7)
        C('Cooking wok',x,10.5,1.5,.36,.12,'#3c5653')
        for dz in [0,.3]:B('Banana leaf plate',x+.8,11+dz,1.35,.4,.22,.02,'#5f8950')
    B('TV room platform',9,21,.1,11,5,.2,'#c4ba91')
    B('TV room back wall',9,16,1.5,11,.2,3,'#d6b27c')
    B('Television wooden cabinet',9,17,1.4,2.5,.7,1.7,'#78543a')
    B('AnimatedTVScreen',9,17.39,1.5,1.9,.05,1.18,'#6cb1b7')
    for dx in [-.4,.4]:beam('TV antenna',(9, -17,2.3),(9+dx,-17,3),.018,'#57695b')
    for x in [6,9,12]:seat(x,19)
    T('OUR EVENING TOGETHER',9,16.2,2.6,.34,'#496450')
    # Dragon playground and shaded public sitting area west of the shops.
    B('Rubber playground',-25,9,.05,9,12,.15,'#c49b66')
    dragon(-27,-10)
    for j in range(7):
        B('Hopscotch chalk',-26+j*.65,7,.15,.52,.6,.04,'#e9debc',0)
        T(str(j+1),-26+j*.65,7,.2,.2,'#816e4f')
    for x in [-28,-22]:seat(x,14)
    # Community garden, patterned paths, water tap and letterboxes.
    for x in [23,27]:
        for z in [6,10,14]:
            B('Raised garden bed',x,z,.4,2.6,2.5,.7,'#aa7951')
            B('Garden soil',x,z,.77,2.4,2.3,.08,'#63533a')
            for dx in [-.6,0,.6]:S('Vegetable leaves',x+dx,z,.98,(.3,.7,.35),'#487f50')
    C('Water standpipe',21,5,.7,.08,1.4,'#6b8d87')
    seat(25,18)
    for i in range(5):
        B('Letterbox',3.5+i*.45,-3,.8,.4,.35,.65,'#c67953')
        B('Letter slot',3.5+i*.45,-2.81,.97,.24,.025,.045,'#3b5a52',0)
    for x,z in [(-3,-5),(3,5),(-18,-4),(18,5),(-18,17),(18,-17)]:
        beam('Street lamp',(x,-z,0),(x,-z,3.7),.075,'#416c60')
        S('Warm lamp globe',x,z,3.8,(.24,.24,.3),'#f2d59a')
    for x in [-15,-11,-7,7,11,15]:
        beam('Laundry poles',(x,22,1),(x,22,3),.04,'#99855b')
        for i in range(3):B('Hanging laundry',x+i*.45,-22,2.2,.34,.05,.65,['#e4caaa','#8fb6b3','#ca8063'][i],0)
    for x in range(-30,31,6):
        for z in [-28,25]:tree(x,-z,palm=(era=='kampong'))
    for x,z in [(-17,-12),(17,-12),(-30,0),(30,0),(-17,12),(17,12),(-5,22),(5,22)]:tree(x,-z)
    if era=='kampong':
        for x in [-12,0,12]:
            B('Timber kampong home',x,-24,2,7,5,3,'#a78357');roof(x,24,3.9,7.5,5.7,'#9b6246')
            for dx in [-2,0,2]:B('House stilts',x+dx,-24,.6,.2,4.5,1.2,'#72563f')
    else:
        for x,c in [(-12,'#d9b87f'),(0,'#c88a69'),(12,'#a5bba0')]:
            before=set(bpy.data.objects);hdb(x,24,5 if era=='estate' else 7,c,'87')
            for o in set(bpy.data.objects)-before:o.scale*=1.9;o.location.x=x+(o.location.x-x)*1.9;o.location.y=24+(o.location.y-24)*1.9
    if era in ['kampong','estate']:
        B('Gay World stage',-25,-10,.45,8,7,.9,'#a66e4f')
        B('Theatre backdrop',-25,-13,2.5,8,.2,4,'#325f63')
        for x in [-28,-22]:B('Velvet curtain',x,-12.8,2.5,1.2,.2,3.8,'#a74f43')
        T('GAY WORLD',-25,-12.6,3.5,.53)
        for x in [-28,-25,-22]:seat(x,-4.5)
    else:
        shop(-25,-10,'COMMUNITY CLUB','#d1b390','provision')
    if era=='estate':
        B('AnimatedCoasterCar',29,-10,2.5,.95,1.35,.5,'#dfad50',.1)
        B('AnimatedCoasterCarTwo',29,-10,2.5,.95,1.35,.5,'#c9684c',.1)
        for i in range(64):
            a=i*math.tau/64;b=(i+1)*math.tau/64
            def p(t):return (25+4*math.cos(t),10-3*math.sin(t),1.5+.7*(1+math.sin(t*2)))
            beam('Wonderland coaster rail',p(a),p(b),.08,'#bb6047')
            if i%4==0:beam('Coaster support',(p(a)[0],p(a)[1],.1),p(a),.075,'#5a9c91')
        T('WONDERLAND',25,-14,3.6,.45,'#315950')
    else:
        B('Neighbourhood library',25,-10,1.7,8,6,3.4,'#c1bb8b');roof(25,10,3.6,8.5,6.5,'#b76b4c');T('READING ROOM',25,-6.9,2.1,.4,'#305d58')
    if era in ['town','garden']:
        for x in range(-25,26,8):B('MRT viaduct pillar',x,-18,2,.5,.8,4,'#c7c1a6')
        B('MRT viaduct',0,-18,4.2,62,2,.4,'#bcbda9')
        for x in [-6,0,6]:
            B('AnimatedMRTCarriage',x,-18,5,5.8,1.8,1.5,'#dde0c4')
            B('AnimatedMRTWindows',x,-16.99,5.2,5.5,.04,.5,'#3d7076')
            B('AnimatedMRTStripe',x,-16.98,4.75,5.5,.05,.14,'#c83b4b')
    if era=='garden':
        for x in [-12,0,12]:B('Solar panel',x,-24,10,5,2,.12,'#385e6c')
    for x,z in [(-16,0),(16,0),(-3,16),(3,-16)]:
        B('Drain cover',x,z,.1,1.1,.6,.08,'#526d5b',0)
        for i in range(6):B('Drain grate slot',x-.45+i*.18,z,.15,.05,.5,.025,'#344e40',0)
    for x in range(-14,15,2):
        S('Lantern',x,-3,3.4,(.16,.16,.24),['#c26848','#dfb95b'][x%3==0])
    # Bake simple repeatable material textures and merge geometry by material.
    exec((root/'scripts/detail-neighbourhood.py').read_text().split('# REFINEMENT_RUN')[0],globals())
    add_detail(era)
    if not any(m.node_tree.nodes.get('Image Texture') for m in palette.values()):textures()
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith('Animated')]
    groups={}
    for o in meshes:groups.setdefault(o.data.materials[0].name,[]).append(o)
    for objs in groups.values():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/(era+'.glb')),export_format='GLB',use_selection=True)
    bpy.ops.object.light_add(type='AREA',location=(-10,-15,25));bpy.context.object.data.energy=3500;bpy.context.object.data.size=15
    bpy.ops.object.light_add(type='SUN',location=(0,0,15));bpy.context.object.data.energy=2;bpy.context.object.rotation_euler=(.4,-.5,-.3)
    bpy.ops.object.camera_add(location=(14,-27,24));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=48
    scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.world.color=(.45,.5,.4)
    scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/('neighbourhood-'+era+'.blend')))
    scene.render.filepath=str(OUT/(era+'.png'));bpy.ops.render.render(write_still=True)
    print('WALK_WORLD_DONE',era)
for era in globals().get('WALK_ERAS',['estate','kampong','town','garden']):build_walk(era)
