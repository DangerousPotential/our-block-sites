"""Five original, editable Singapore-inspired composites. Blender background entrypoint.
Exports geometry AND walk/board/NPC metadata from this same authoring source.
"""
import bpy, math, json, sys
import random
from pathlib import Path
ROOT = Path.cwd()
exec((ROOT/'scripts/build-worlds.py').read_text().split('def build(key):')[0])
base_mat=mat
def mat(color):
    m=base_mat(color)
    if not m.node_tree.nodes.get('Handmade surface'):
        rng=random.Random(color); image=bpy.data.images.new('Packed grain '+color,width=64,height=64)
        rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]; pixels=[]
        for y in range(64):
            for x in range(64):
                grain=rng.uniform(.91,1.06)*( .94 if y%16==0 else 1)
                pixels.extend([min(1,c*grain) for c in rgb]+[1])
        image.pixels.foreach_set(pixels);image.pack()
        node=m.node_tree.nodes.new('ShaderNodeTexImage');node.name='Handmade surface';node.image=image
        m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    return m
OUT=ROOT/'public/assets/trip'; OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'art/trip'; SOURCE.mkdir(parents=True,exist_ok=True)

def empty(name,x,z):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); o.location=(x,-z,.25); return o
def B(name,x,z,y,w,d,h,c): return box(name,(x,-z,y),(w,d,h),c)
def label(s,x,z,y,size=.4): text(s,(x,-z,y),size)
exec((ROOT/'scripts/trip-attractions.py').read_text())
exec((ROOT/'scripts/trip-districts.py').read_text())
exec((ROOT/'scripts/trip-city-kit.py').read_text())
def build_trip(key, export=True):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    night=key in ['fair','garden']; solids=[]; animated=[]
    ground={'river':'#b5b77c','fair':'#615064','estate':'#bfc591','town':'#a9bfba','garden':'#375958'}[key]
    # 56 x 52 = 2.02 times the previous 40 x 36 ground area.
    B('Continuous landscape',0,0,-.35,120,110,.6,ground)
    B('Walkable neighbourhood ground',0,0,0,56,52,.12,ground)
    cx,cz={'river':(5,2),'fair':(0,3),'estate':(0,0),'town':(-3,2),'garden':(3,3)}[key]
    B('Shared board and gathering courtyard',cx,cz,.09,10,7.5,.1,{'river':'#c7b77e','fair':'#7c526e','estate':'#d2aa82','town':'#85a9a4','garden':'#4f827b'}[key])
    for z in [-7,8]: B('Pedestrian lane',0,z,.07,37,1.4,.06,'#ad9e89' if key=='river' else '#8d9690')
    for x in [-6,7]: B('Connecting lane',x,0,.075,1.3,32,.06,'#bba98b' if key=='river' else '#b3b8a5')
    for i in range(12):
        B('Paving seam',cx-4.8+i*.88,cz,.147,.018,7.4,.01,'#bdb99a')
    for x in [-17,-13,-9,-5,-1,3,7,11,15,18]:
        for z in [-15.5,15.5] if key not in ['river','garden'] else [-15.5]:
            if key=='river' and x< -5: continue
            tree(x,-z,key=='river')
    for x,z in [(cx-3,cz),(cx+3,cz)]:
        cyl('Courtyard stone seat',(x,-z,.35),.5,.7,'#cbb893')
        cyl('Terracotta planter',(x,-z,.85),.38,.4,'#ac7955')
        for dx in [-.2,.2]: ball('Frangipani leaves',(x+dx,-z,1.15),(.4,.4,.35),'#6c9564')
        for dx in [-.15,.15]:ball('Frangipani bloom',(x+dx,-z-.2,1.3),(.1,.08,.08),'#f3dea4')
    def solid(x,z,w,d,padding=.28): solids.append({'x':x,'z':z,'w':w,'d':d,'padding':padding}); empty('collision_%d'%len(solids),x,z)
    def shop(x,z,c,s): shophouse(x,-z,c,s); solid(x,z,1.9,2)
    def block(x,z,f,c,n): hdb(x,-z,f,c,n); solid(x,z,4,2)
    def trees(points,palm=False):
        for x,z in points: tree(x,-z,palm)
    def train(z):
        B('Elevated railway',0,z,4.3,37,1.5,.3,'#bbc2bd')
        for x in range(-16,18,4): B('Railway pier',x,z,2,.3,.7,4,'#a8b1a9'); solid(x,z,.6,1)
        root=empty('anim_train',0,z); root.location.z=0
        parts=[B('Train carriage',0,z,4.9,6,1,1,'#f1e9d6'), B('Red livery',0,z+.51,4.7,5.9,.02,.18,'#cf584f')]
        for x in [-2.3,-1.4,-.5,.4,1.3,2.2]: parts.append(B('Train window',x,z+.52,5.1,.6,.02,.35,'#20384f'))
        bpy.context.view_layer.update()
        for o in parts: o.parent=root; o.matrix_parent_inverse=root.matrix_world.inverted()
        animated.append('anim_train')
    if key=='river':
        for j in range(23):
            z=-25+j*2.25; x=-10+math.sin((z+16)/2.25*.5)*1.6
            B('Singapore River water',x,z,.1,6,2.4,.15,'#427f86')
            solid(x,z,6,2.4)
            for dx in [-3.15,3.15]: B('Stone quay',x+dx,z,.23,.35,2.4,.35,'#817f67')
        for z in [-9,7]: B('Timber footbridge',-10,z,.42,11,1.5,.25,'#9b7950'); solids.append({'x':-10,'z':z,'w':11,'d':1.5,'bridge':True})
        for x,z in [(0,-11),(10,-10)]:
            B('Attap home',x,z,1.7,3,2.5,2.2,'#b89160'); roof(x,-z,3,3.5,3,'#746043'); solid(x,z,3.5,3)
            for dx in [-1.1,1.1]: B('House stilts',x+dx,z,.5,.15,2,.9,'#61503c')
            B('Wooden steps',x,z+1.7,.35,1,1,.4,'#8c724e')
            B('Open timber doorway',x,z+1.27,1.45,.65,.03,1.6,'#3c4536')
            for dx in [-.95,.95]:
                B('Kampong window',x+dx,z+1.28,2,.5,.03,.65,'#314a42')
                for dz in [-.2,0,.2]:B('Window louvre',x+dx,z+1.32,2+dz,.5,.04,.04,'#bea279')
            for j in range(11): B('Woven wall slat',x-1.4+j*.28,z+1.26,1.7,.025,.02,2,'#8c714f')
        for z in [-13,-3,11]: shop(-16,z,'#dfb27e','GODOWN')
        hawker(12,-11); solid(12,11,5,2.5)
        boat=B('anim_boat',-10,1,.6,2,3,.5,'#694b35'); animated.append(boat.name)
        trees([(16,-13),(15,0),(16,6),(-3,-14),(-2,12)],True)
        label('RIVER QUAY',-15,15,1); label('KAMPONG LANES',7,-14,1)
        npcs=[(-5,-7),(11,8),(8,-7),(0,-7)]
    elif key=='fair':
        for x in [-14,-6,10]: shop(x,-10,['#cc776b','#70a99e','#e0b75f'][int(x)%3],'KOPI' if x<0 else 'TICKETS')
        B('Theatre',-13,0,2.1,6,6,4,'#b86572'); solid(-13,0,6,6)
        B('Theatre canopy',-13,3.5,2.7,7,1.5,.4,'#e4b858'); label('GAY WORLD STAGE',-13,4.3,2.5,.32)
        for x in [-15,-13,-11]: B('Theatre door',x,3.02,1.1,1,.04,2,'#3c324d')
        for j in range(15):ball('Marquee bulb',(-16+j*.43,-4.25,2.85),(.07,.07,.07),'#ffe1a1')
        for x in [-5,5]: B('Gateway tower',x,13,2.5,1,1,5,'#c46267'); solid(x,13,1,1)
        B('Illuminated gateway',0,13,5,11,1,1,'#e7b859'); label('NIGHT AT THE WORLDS',0,13.6,4.9,.47)
        for j in range(48):
            a=j*math.tau/48; b=(j+1)*math.tau/48
            def rail(t): return (12+4*math.cos(t),-2-6*math.sin(t),2.3+1.2*math.sin(t*2))
            beam('Wonderland inspired coaster rail',rail(a),rail(b),.1,'#ecca72')
            if j%4==0:
                p=rail(a); beam('Coaster support',(p[0],p[1],.15),p,.12,'#78a5a0')
        cart=B('anim_coaster',16,2,2.5,1.2,1,.7,'#ed8b62'); animated.append(cart.name); solid(12,2,9,13)
        hawker(-8,-10); solid(-8,10,5,2.5)
        npcs=[(-9,4),(-5,-7),(-7,8),(7,-7)]
    elif key=='estate':
        for x,z,f in [(-12,-9,8),(-6,-12,6),(-14,5,7)]: block(x,z,f,'#ecd1a1' if x<0 else '#b9d1bb',str(120+f))
        # Late-1987 composite: the initial MRT system, not a later islandwide network.
        train(-16)
        dragon(10,-6); solid(11,6,3,2)
        hawker(-3,-11); solid(-3,11,5,2.5)
        shop(-12,11,'#83aba0','PROVISIONS')
        B('Communal TV cabinet',10,-5,1,1.8,.5,1.5,'#725341'); B('CRT screen',10,-4.73,1.2,1.3,.04,.8,'#81b0ab'); solid(10,-5,2,1)
        for x in [8,10,12]: B('TV stool',x,-2,.3,.6,.6,.6,'#c98e62')
        trees([(-17,-13),(16,12),(7,13),(-9,4)])
        npcs=[(-11,8),(10,-2),(9,6),(-3,8)]
    elif key=='town':
        train(-12)
        B('Neighbourhood mall',11,-3,3,9,7,6,'#d6d4b9'); solid(11,-3,9,7)
        for x in [8,10,12,14]: B('Mall glazing',x,.52,3,1.5,.05,4,'#476c7b')
        label('HEARTLAND MALL',11,1,5.3,.5)
        B('Regional library',-12,-5,2,6,6,4,'#d4a97c'); solid(-12,-5,6,6); label('LIBRARY',-12,-1.9,3,.55)
        for x in [-14,-12,-10]: B('Library window',x,-1.95,2,1.4,.03,1.5,'#587c81')
        for x in [5,10,15]: B('Bus shelter',x,11,2,4,3,.2,'#87a8a1'); B('Bus',x,11,.85,3,1.6,1.5,'#d15852'); solid(x,11,4,3)
        shop(-11,10,'#719b9c','CYBER KAKI'); shop(-7,11,'#d0b173','FOOD COURT')
        for z in [-8,-4,0,4,8]: B('Sheltered walkway',-6,z,2.5,2,4,.12,'#bec9c0')
        npcs=[(-3,-9),(-10,-.5),(-10,8),(-6,8)]
    else:
        train(-13)
        B('Waterfront water',0,15,.09,40,6,.1,'#294e6c'); solid(0,15,40,6)
        B('Promenade',0,10.8,.2,39,2,.25,'#bea98c')
        for x,z,f in [(-15,-10,8),(-16,-4,6)]: block(x,z,f,'#849f9c',str(200+f))
        for x,z in [(-12,1),(-9,5),(-4,-6),(10,7),(14,7)]:
            B('Raised community garden',x,z,.35,2.6,2,.6,'#856450'); solid(x,z,2.6,2)
            for dx in [-.8,0,.8]:
                for dz in [-.5,.5]: ball('Edible garden leaves',(x+dx,-z+dz,.85),(.4,.4,.4),'#5d9767')
        hawker(-9,-10); solid(-9,10,5,2.5)
        for x in range(-17,18,3):
            B('Promenade lamp',x,9,1.3,.08,.08,2.6,'#607f7a'); ball('Warm lantern',(x,-9,2.7),(.22,.22,.25),'#ffe1a1')
        trees([(-16,6),(-15,1),(-4,-8),(7,-7),(16,7)])
        npcs=[(-9,2),(5,9),(-1,8),(-7,8)]
    activities=add_attractions(key,solid,cx,cz,solids)
    districts=add_districts(key,solid,activities)
    add_city_housing(key,solid,activities)
    # Shared small prop kit; unique placements and architecture above.
    for i,(x,z) in enumerate(npcs):
        empty('npc_%d'%i,x,z)
        cyl('Kopi table',(x+.8,-z,.65),.45,.12,'#d5b58b')
        cyl('Coffee cup',(x+.8,-z,.8),.09,.18,'#f5e9ce')
        for dx in [-.35,.35]: B('Neighbour stool',x+dx,z+.9,.25,.4,.4,.5,'#ba7955')
        for j in range(3):
            B('Slatted timber crate',x+1.7,z-.5-j*.5,.25,.6,.4,.5,'#96724a')
            for k in range(3): ball('Market fruit',(x+1.55+k*.13,-z+.5+j*.5,.57),(.1,.1,.11),['#e4b856','#a5ad5a','#d27d53'][j])
        B('Neighbourhood bench seat',x-1.5,z+1.7,.55,1.8,.4,.13,'#93654a')
        for dx in [-.65,.65]: B('Bench leg',x-1.5+dx,z+1.7,.28,.1,.3,.5,'#526b61')
        if night:
            for j in range(3): ball('Festive lantern',(x-1+j,-z,3.2),(.16,.16,.21),'#eabd73')
            beam('Festive cable',(x-1.5,-z,3.5),(x+1.5,-z,3.5),.025,'#4b6059')
    x,z=npcs[{'river':1,'fair':2,'estate':0,'town':3,'garden':3}[key]]
    pot=cyl('anim_kopi_pot',(x+.5,-z,1.65),.14,.34,'#acb9b7');animated.append(pot.name)
    stream=cyl('anim_kopi_stream',(x+.7,-z,1.2),.025,.65,'#714832');animated.append(stream.name)
    board=[]
    for i in range(22):
        a=math.tau*i/22; x=cx+5.8*math.cos(a); z=cz+4.25*math.sin(a)
        empty('board_%02d'%i,x,z); board.append({'x':x,'z':z})
    empty('spawn',cx,cz)
    meta={'id':key,'bounds':{'x':27,'z':25},'groundSize':{'x':56,'z':52},'spawn':{'x':cx,'z':cz},'board':board,'npcs':[{'x':x,'z':z} for x,z in npcs],'solids':solids,'animated':animated,'activities':activities,'districts':districts}
    if not export:return meta
    (OUT/(key+'.json')).write_text(json.dumps(meta,indent=2))
    surface_details()
    # Consolidate static meshes by material to keep browser draw calls low.
    groups={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH' and not o.name.startswith('anim_') and not o.parent:
            material=o.data.materials[0].name if o.data.materials else 'none'; groups.setdefault(material,[]).append(o)
    for material,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join(); bpy.context.object.name='Architecture '+material
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(key+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'.glb')),export_format='GLB',export_yup=True)
    print('TRIP WORLD COMPLETE',key,flush=True)

selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['river','fair','estate','town','garden']
for key in selected:
    if key not in ['river','fair','estate','town','garden']: raise ValueError('Unknown era: '+key)
# The original district helpers above are retained by the integrated authoring
# pipeline. The normal entrypoint now builds that single world, never an annex.
exec((ROOT/'scripts/build-culture-worlds.py').read_text(), {'__name__':'__main__'})
