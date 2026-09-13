"""Editable, activity-led additions to Our Block. Run Blender -b --python this file.

Coordinates below use game x/y(height)/z. Attractions occupy infill spaces in
the complete original neighbourhoods. Stations remain selectable.
"""
import bpy, bmesh, math, json, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path.cwd()
OUT = ROOT / 'public/assets/culture'
ART = ROOT / 'art/culture'
OUT.mkdir(parents=True, exist_ok=True)
ART.mkdir(parents=True, exist_ok=True)
TAU = math.tau
CREAM='#f0d6a3'; RED='#b94b4f'; TEAL='#4d999e'; DARK='#253947'; GOLD='#e6ab53'
materials={}
atlas=None
detail_atlas=None
owner=None
origin=(0,0)
solids=[]
station_scale=1
exec((ROOT/'scripts/culture-materials.py').read_text())

def material(color, tile=None, glow=False):
    key=f'{color}:{tile}:{glow}'
    if key not in materials:
        m=bpy.data.materials.new(('light_' if glow else 'culture_')+key)
        m.use_nodes=True
        rgb=tuple((int(color[i:i+2],16)/255)**2.2 for i in (1,3,5))
        node=m.node_tree.nodes.get('Principled BSDF')
        node.inputs['Base Color'].default_value=(*rgb,1)
        node.inputs['Roughness'].default_value=.18 if tile==1 else .68
        if tile is not None:
            tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=mosaic_image if tile==11 else detail_atlas if tile>=6 else atlas
            m.node_tree.links.new(tex.outputs['Color'],node.inputs['Base Color'])
            connect_surface_maps(m,node,tile)
        if glow:
            node.inputs['Emission Color'].default_value=(*rgb,1)
            node.inputs['Emission Strength'].default_value=2
        materials[key]=m
    return materials[key]

def mesh(name, verts, faces, color, tile=None, glow=False):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material(color,tile,glow))
    if owner: obj.parent=owner
    if tile is not None:
        uv=data.uv_layers.new(name='Surface atlas')
        for face in data.polygons:
            for i,index in enumerate(face.loop_indices):
                u,v=[(0,0),(1,0),(1,1),(0,1)][i%4]
                uv.data[index].uv=((tile%3+.02+u*.96)/3,(1-(tile%6)//3+.02+v*.96)/2)
    return obj

def B(name,x,z,y,w,d,h,c=CREAM,tile=None,glow=False):
    # Cube face order also supplies a complete atlas UV for each side.
    verts=[(a*w/2,b*d/2,c0*h/2) for a,b,c0 in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    o=mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],c,tile,glow)
    if min(w,d,h)>.12 and max(w,d,h)<20:
        bm=bmesh.new();bm.from_mesh(o.data)
        bmesh.ops.bevel(bm,geom=list(bm.edges),offset=min(.06,min(w,d,h)*.18),segments=2,affect='EDGES')
        bm.to_mesh(o.data);bm.free()
    o.location=(x,-z,y);return o

def C(name,x,z,y,r,h,c=CREAM,n=16,glow=False):
    verts=[(r*math.cos(i*TAU/n),r*math.sin(i*TAU/n),v*h/2) for v in [-1,1] for i in range(n)]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o=mesh(name,verts,faces,c,glow=glow);o.location=(x,-z,y);return o

def ball(name,x,z,y,r,c):
    # Faceted low-poly sphere, intentionally matching the existing city props.
    verts=[(0,0,r),(0,0,-r)]+[(math.cos(i*TAU/8)*r,math.sin(i*TAU/8)*r,0) for i in range(8)]
    o=mesh(name,verts,[(0,2+i,2+(i+1)%8) for i in range(8)]+[(1,2+(i+1)%8,2+i) for i in range(8)],c)
    o.location=(x,-z,y);return o

def beam(name,a,b,r,c=CREAM):
    va,vb=Vector((a[0],-a[1],a[2])),Vector((b[0],-b[1],b[2]))
    mid=(va+vb)/2
    o=C(name,mid.x,-mid.y,mid.z,r,(vb-va).length,c,8)
    o.rotation_euler=(vb-va).to_track_quat('Z','Y').to_euler();return o

def sign(body,x,z,y,w=5,c=DARK):
    B('Sign backing',x,z,y,w,.16,.95,c)
    bpy.ops.object.text_add(location=(x,-z-.09,y-.25),rotation=(math.pi/2,0,0))
    o=bpy.context.object;o.name='Sign '+body;o.data.body=body;o.data.align_x='CENTER';o.data.size=min(.78,w/max(len(body),1)*1.5);o.data.extrude=.005;o.data.materials.append(material(DARK if c in [CREAM,GOLD] else CREAM))
    bpy.ops.object.convert(target='MESH')
    if owner:o.parent=owner

def group(name,x=0,z=0,y=0):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=(x,-z,y)
    if owner:o.parent=owner
    return o

def dynamic(name,o):
    o.name='motion_'+owner['stationId']+'_'+name
    return o

def ribbon(name,points,width,color):
    verts=[]
    for i,(x,z) in enumerate(points):
        before=points[max(0,i-1)];after=points[min(len(points)-1,i+1)]
        dx,dz=after[0]-before[0],after[1]-before[1];length=math.hypot(dx,dz) or 1
        for side in [-1,1]:verts.append((x+side*dz/length*width/2,-z+side*dx/length*width/2,.211))
    return mesh(name,verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(points)-1)],color)

def solid(x,z,w,d):
    solids.append(dict(x=origin[0]+x*station_scale,z=origin[1]+z*station_scale,w=w*station_scale,d=d*station_scale,padding=.2*station_scale))

def room(title,w=10,d=7,c=TEAL,roof=True):
    B('Raised threshold',0,0,.25,w,d,.1,'#c0a987' if ERA in ['estate','river'] else '#8b7b91',0 if ERA in ['estate','river'] else 2 if ERA=='town' else 1)
    B('Cutaway rear wall',0,-d/2,2,w,.25,3.5,CREAM,4);solid(0,-d/2,w,.25)
    B('Side wall',-w/2,-.5,1.6,.22,d-1,2.7,c);solid(-w/2,-.5,.22,d-1)
    for x in [-w/2,w/2]:B('Front post',x,d/2,1.6,.18,.18,2.7,c);solid(x,d/2,.18,.18)
    if roof:B('Partial roof',0,-d/2+.5,4,w+.4,1.7,.18,c,5 if ERA in ['river','estate'] else None)
    sign(title,0,-d/2+.17,3.25,w*.76,c)

def stool(x,z,c=RED):
    C('Stool',x,z,.63,.3,.13,c);C('Stool leg',x,z,.4,.1,.45,DARK)

def table(x,z,food=False):
    C('Round table',x,z,1.05,.85,.13,CREAM);C('Table pedestal',x,z,.65,.12,.8,DARK);solid(x,z,1.5,1.5)
    for dx,dz in [(-1.1,0),(1.1,0),(0,1.1)]:stool(x+dx,z+dz)
    if food:
        C('Hotpot',x,z,1.25,.37,.25,DARK);C('Broth',x,z,1.39,.31,.02,GOLD)
        for dx,dz in [(-.55,0),(.55,0),(0,.55)]:C('Bowl',x+dx,z+dz,1.17,.13,.12,CREAM)
        dynamic('steam',ball('Steam',x,z,1.75,.18,CREAM))

def monitor(x,z,modern=False):
    B('Computer tower',x+.55,z,.6,.3,.6,.65,DARK)
    B('Desk',x,z,1.05,1.8,.9,.12,CREAM,3)
    B('CRT housing' if not modern else 'Display',x,z-.15,1.55,.85,.55 if not modern else .12,.72,DARK)
    B('Luminous screen',x,z+.14,1.57,.67,.025,.49,TEAL,glow=True)
    for j in range(3):B('Screen pixels',x-.2+j*.18,z+.16,1.55,.1,.02,.08,GOLD,glow=True)
    B('Keyboard',x-.15,z+.3,1.14,.65,.25,.045,DARK)
    C('Mouse',x+.5,z+.28,1.15,.1,.05,RED)
    stool(x,z+1)

def food(title,kind):
    if kind=='satay':
        B('Hawker paving',0,0,.25,12,8,.1,CREAM,0)
        for x,c in [(-3,RED),(3,TEAL)]:
            C('Umbrella pole',x,-1.8,2,.065,3.5,DARK)
            for i in range(12):
                a=i*TAU/12;b=(i+1)*TAU/12
                mesh('Striped umbrella',[(x,1.8,4),(x+2.5*math.cos(a),1.8+2.5*math.sin(a),3.1),(x+2.5*math.cos(b),1.8+2.5*math.sin(b),3.1)],[(0,1,2)],CREAM if i%2 else c)
        sign(title,0,-3.7,2.7,7,RED)
    else:
        room('STEAMBOAT' if kind=='steamboat' else title,11,7,TEAL if kind=='kopi' else RED,False)
        for i in range(28):B('Corrugated food shelter roof',-5.4+i*.4,-1.8,4.1,.39,3.5,.12,TEAL if kind=='kopi' else '#76868d')
        for x in [-5.3,5.3]:B('Food shelter column',x,3,2,.14,.14,3.6,DARK)
        for x in range(-5,6):C('Food shelter bulb',x,-.05,3.9,.08,.15,GOLD,glow=True)
    B('Food counter',0,-1.6,.85,8,1.1,1.2,TEAL);solid(0,-1.6,8,1.1)
    B('Hand-painted hawker details',0,-3.32,2.1,6.8,.025,2,CREAM,10)
    for x in [-3,-1,1,3]:
        C('Serving plate',x,-1.4,1.52,.3,.04,CREAM)
        for j in [-.14,.14]:ball('Food',x+j,-1.4,1.65,.14,GOLD)
    for x in [-2.4,2.4]:table(x,1.3,kind=='steamboat')
    if kind in ['satay','hawker']:
        B('Charcoal brazier',3,0,1,1.9,.65,.3,DARK)
        for i in range(7):
            beam('Satay skewer',(2.3+i*.23,-.4,1.22),(2.3+i*.23,.55,1.22),.025,CREAM)
            B('Grilled satay',2.3+i*.23,0,1.26,.12,.44,.1,RED)
    dynamic('pour',C('Coffee pot',-3,-1.6,2,.22,.5,DARK))
    dynamic('stream',C('Long coffee stream',-3,-1.5,1.8,.035,.6,GOLD,8))
    if kind=='kopi':
        for x in [-1,1]:B('Toast stack',x,-1.4,1.69,.4,.4,.22,GOLD)

def cinema():
    room('CINEMA',11,8,RED,False)
    # The stepped entrance and open auditorium read together from the overview.
    for i,w in enumerate([5.8,4.2,2.7]):B('Art Deco crown',-2.8,2.7,4.15+i*.45,w,.45,.5,CREAM)
    for x in [-5.2,-.4]:
        B('Cinema facade pilaster',x,2.7,2.3,.8,.6,4.1,CREAM,4)
        B('Facade red inset',x,3.03,2.4,.36,.03,2.8,RED);solid(x,2.7,.8,.6)
    B('Cinema facade lintel',-2.8,2.7,3.65,5.6,.6,1,CREAM,4)
    B('Cinema marquee',-2.8,3.05,4.1,6.1,1.3,.9,CREAM)
    sign('CINEMA',-2.8,3.74,4.15,5.7,RED)
    B('Cinema screen',2.5,-3.65,2.35,4.8,.06,3.25,DARK)
    picture=dynamic('projection',B('Projected river film',2.5,-3.60,2.35,4.4,.03,3.3,CREAM))
    if (OUT/'cinema-film.png').exists():
        image=bpy.data.images.load(str(OUT/'cinema-film.png'),check_existing=True);image.pack()
        film=bpy.data.materials.new('Original river film');film.use_nodes=True
        tex=film.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        node=film.node_tree.nodes.get('Principled BSDF');node.inputs['Emission Strength'].default_value=.8
        film.node_tree.links.new(tex.outputs['Color'],node.inputs['Base Color']);film.node_tree.links.new(tex.outputs['Color'],node.inputs['Emission Color'])
        picture.data.materials.clear();picture.data.materials.append(film)
        uv=picture.data.uv_layers.new(name='Film frame')
        for face in picture.data.polygons:
            for index in face.loop_indices:
                v=picture.data.vertices[picture.data.loops[index].vertex_index].co
                uv.data[index].uv=(v.x/4.4+.5,v.z/3.3+.5)
    B('Ticket booth',-4.5,3.3,1.05,1.5,1.1,1.6,GOLD);solid(-4.5,3.3,1.5,1.1)
    sign('TICKETS',-4.5,3.95,2.2,2,RED)
    for i in range(12):C('Marquee bulb',-5.55+i*.5,3.8,3.65,.075,.13,GOLD,glow=True)

def stage(title,wayang=False):
    room(title,11,7,RED,False)
    B('Performance platform',0,-1,.6,9,3.5,.65,CREAM,3);solid(0,-1,9,3.5)
    for x in [-4,4]:B('Gathered curtain',x,-2.8,2.25,1,.45,3,RED)
    B('Stage backdrop',0,-3.1,2.1,7,.1,2.5,CREAM,6 if wayang else 7)
    for x in [-2.5,0,2.5]:
        if wayang:
            beam('Ornate roof sweep',(x-1.3,-3.3,4.1),(x,-3.3,4.7),.12,GOLD)
            beam('Ornate roof sweep',(x,-3.3,4.7),(x+1.3,-3.3,4.1),.12,GOLD)
        else:
            C('Microphone stand',x,-.3,1.4,.04,1.3,DARK)
            dynamic('spotlight',B('Stage footlight',x,1,1,.45,.3,.2,GOLD,glow=True))
    for x in [-3,0,3]:B('Audience bench',x,2.5,.6,2,.6,.3,CREAM,3)
    for x in [-5,-4.2,4.2,5]:
        h=4.7-abs(x)*.14
        B('Stepped stage facade',x,-.1,h/2,.65,.5,h,CREAM,4)
    if wayang:
        for side in [-1,1]:
            for i in range(8):B('Sweeping opera roof',side*(i*.63),-2.8,4.6+(i/7)**3*.9,.7,2.6,.14,RED,5)
        sign('WAYANG',0,-1.42,4.4,6,CREAM)
    elif ERA=='fair':
        for i,w in enumerate([8,6,4,2]):B('Song stage crown',0,-3.4,4+i*.42,w,.5,.45,CREAM)
        sign('GAY WORLD',0,-.1,4.15,8,RED)
        for x in range(-4,5):C('Marquee glow',x,.08,3.72,.07,.1,GOLD,glow=True)
    else:
        B('Contemporary stage canopy',0,-1.4,4.3,11.5,3,.16,TEAL)
        sign('LIVE AT THE BLOCK',0,-.1,3.9,8,DARK)
        for x in [-3,0,3]:C('Stage downlight',x,-1,4.1,.14,.1,GOLD,glow=True)

def rides():
    C('Cup ride platform',-2,0,.35,3.3,.25,TEAL,32);solid(-2,0,6.4,6.4)
    for i in range(36):
        a=i*TAU/36;C('Roundabout rim bulb',-2+3.2*math.cos(a),3.2*math.sin(a),.53,.065,.1,GOLD,glow=True)
    for x in [-5.8,6.7]:
        for z in [-4.5+i*.6 for i in range(16)]:B('Wonderland fence picket',x,z,.85,.09,.09,1.2,CREAM)
        for y in [.55,1.3]:beam('Wonderland fence rail',(x,-4.5,y),(x,4.5,y),.045,CREAM)
    for x in [-5.8+i*.6 for i in range(22)]:
        if abs(x)>1.5:B('Wonderland front fence',x,4.5,.85,.08,.08,1.2,CREAM)
    g=group('motion_'+owner['stationId']+'_cups',-2,0,.5)
    for i in range(5):
        a=i*TAU/5;x=math.cos(a)*2;z=math.sin(a)*2
        for obj in [C('Spinning cup',x,z,.55,.73,.85,[RED,GOLD,TEAL][i%3]),C('Cup interior',x,z,.99,.58,.025,DARK),C('Cup saucer',x,z,.12,.84,.08,CREAM)]:obj.parent=g
        for j in range(10):
            a0=j*TAU/10;o=B('Cup painted stripe',x+.72*math.cos(a0),z+.72*math.sin(a0),.55,.09,.09,.77,CREAM);o.parent=g
    # Separate compact coaster, with paired continuous rails and a real cart.
    for side in [-.28,.28]:
        for i in range(48):
            a=i*TAU/48;b=(i+1)*TAU/48
            p=lambda t:(4+(2+side)*math.cos(t),(3+side)*math.sin(t),1.6+.6*math.sin(t*2))
            beam('Coaster rail',p(a),p(b),.065,RED)
    for i in range(10):
        a=i*TAU/10;x=4+2*math.cos(a);z=3*math.sin(a)
        beam('Coaster support',(x,z,.2),(x,z,1.6+.6*math.sin(a*2)),.07,TEAL)
    dynamic('coaster',B('Coaster carriage',6,0,1.9,.8,.85,.4,GOLD))
    solid(4,0,4.7,6.7);sign('WONDERLAND',0,-4.2,3.5,7,RED)
    for x in [-5,5]:B('Ride gateway post',x,-4.3,2.1,.35,.35,4,CREAM)
    for x in range(-5,6):ball('Ride festoon',x,-4.4,4.4+.25*math.cos(x*.4),.11,GOLD)
    for i in range(5):
        a=i*TAU/5
        g0=group('Cup handle',-2+math.cos(a)*2,math.sin(a)*2,1)
        # Parent handles to the turntable so the whole ride moves together.
        g0.parent=g;g0.location=(math.cos(a)*2+.55,-math.sin(a)*2,.4)
        for j in range(12):
            t=j*TAU/12;u=(j+1)*TAU/12
            o=beam('Cup handle',(.23*math.cos(t),0,.23*math.sin(t)),(.23*math.cos(u),0,.23*math.sin(u)),.05,CREAM);o.parent=g0

def badminton():
    B('Badminton court',0,0,.26,8,10,.07,TEAL)
    for x in [-3.4,3.4]:B('Court sideline',x,0,.31,.045,9,.01,CREAM)
    for z in [-4.5,-1.5,1.5,4.5]:B('Court line',0,z,.31,6.8,.045,.01,CREAM)
    for x in [-3.6,3.6]:beam('Net post',(x,0,.2),(x,0,1.8),.05,DARK)
    for y in [.7,.95,1.2,1.45,1.7]:beam('Net weave',(-3.6,0,y),(3.6,0,y),.012,CREAM)
    for x in range(-3,4):beam('Net weave',(x,0,.7),(x,0,1.7),.012,CREAM)
    for z in [-4.5,4.5]:
        for x in [-4.4,4.4]:beam('Hall column',(x,z,.2),(x,z,4.6),.09,RED)
        beam('Open roof truss',(-4.4,z,4.6),(0,z,5.8),.08,RED);beam('Open roof truss',(0,z,5.8),(4.4,z,4.6),.08,RED)
    dynamic('shuttle',ball('Shuttlecock',0,-2,2.5,.12,CREAM))
    sign('BADMINTON',0,-4.7,4.4,6,RED)
    B('Hall partial metal roof',0,-4.2,5.05,9.2,2,.12,TEAL)
    for x in [-4.3,4.3]:B('Court side bench',x,1,.6,.5,3,.25,CREAM,3)

def carnival():
    room('RING TOSS  /  SHOOTING',12,6,TEAL)
    for x in [-3,3]:
        B('Booth counter',x,0,1.05,5,1.1,1.2,RED);solid(x,0,5,1.1)
        for dx in [-1.5,0,1.5]:
            C('Bottle target',x+dx,-.1,1.9,.16,.7,GOLD)
            ball('Prize toy',x+dx,-2.5,2.2,.32,[TEAL,RED,GOLD][int(dx+2)%3])
    # Torus built as rails, so the thrown object is recognizably a ring.
    g=group('motion_'+owner['stationId']+'_ring',-3,2,1.5)
    for i in range(16):
        a=i*TAU/16;b=(i+1)*TAU/16
        o=beam('Toss ring',(.32*math.cos(a),.32*math.sin(a),0),(.32*math.cos(b),.32*math.sin(b),0),.035,CREAM);o.parent=g
    B('Gallery rifle',3,1,1.4,.18,1,.18,DARK)
    for i in range(16):B('Striped carnival awning',-5.65+i*.75,-.5,3.55,.75,5,.14,CREAM if i%2 else RED)
    for x in range(-5,6):C('Booth light',x,2,3.3,.07,.1,GOLD,glow=True)

def voiddeck():
    for x in [-5,0,5]:B('Void deck pillar',x,-1,2,.4,5,3.6,CREAM);solid(x,-1,.4,5)
    B('One corridor fragment',0,-2.4,4,11,2.2,.3,CREAM)
    B('Corridor rear wall',0,-3.4,4.7,11,.2,1.3,CREAM)
    for x in range(-5,6):B('Corridor baluster',x,-1.25,4.55,.06,.06,1,RED)
    B('Corridor handrail',0,-1.25,5,11,.1,.08,RED)
    for x in [-3,-1,2,4]:B('Laundry',x,-1.2,4.5,.65,.04,.75,[GOLD,TEAL,RED,CREAM][x%4])
    B('TV stand',-2,-1,.7,2,1,1,CREAM,3)
    B('Communal CRT',-2,-1,1.6,1.5,.8,1,DARK)
    dynamic('projection',B('Television picture',-2,-.58,1.6,1.2,.03,.72,TEAL,glow=True))
    B('Watching bench',-2,2,.6,3,.5,.3,RED)
    table(2.7,0)
    for i in range(8):
        for j in range(8):B('Chess square',2.25+i*.12,-.45+j*.12,1.13,.12,.12,.02,CREAM if (i+j)%2 else DARK)
    for i in range(4):C('Chess piece',2.35+i*.2,-.35,1.27,.055,.24,RED)
    sign('DOWNSTAIRS',0,-3.6,5.5,6,TEAL)

def provisions():
    room('PROVISION SHOP',10,7,TEAL)
    B('Original illustrated provision shelves',0,-3.32,1.95,8,.035,2.9,CREAM,8)
    for i in range(16):B('Striped provision awning',-4.7+i*.62,-.6,3.35,.62,3,.12,CREAM if i%2 else TEAL)
    for y in [1,1.8,2.6]:
        B('Timber shelf',0,-2.7,y,8,.65,.1,CREAM,3)
        for j in range(11):C('Sweet jar',-3.5+j*.7,-2.6,y+.23,.19,.4,[GOLD,RED,TEAL][j%3])
    B('Shop counter',0,.6,1,7,1,1.3,CREAM,3);solid(0,.6,7,1)
    C('Weighing scale pan',-1,.6,1.85,.45,.09,TEAL);B('Scale',-1,.6,1.55,.5,.5,.35,RED)
    for x in [-3,3]:
        B('Biscuit tin',x,0,1.9,.7,.7,.5,GOLD)
        for z in [2,3]:B('Wooden crate',x,z,.5,1.1,.8,.5,CREAM,3)

def trades():
    room('BARBER  /  COBBLER',11,7,TEAL)
    B('Barber mirror',-2.5,-3.25,2,2,.05,1.6,'#a5c9c7')
    B('Barber chair',-2.5,-.5,.9,1.1,1.3,.5,RED);B('Chair back',-2.5,-1,1.4,1.1,.15,1,RED)
    C('Barber pole',-4.5,3,1.9,.17,1.8,CREAM)
    for y in [1.2,1.6,2,2.4]:C('Red pole stripe',-4.5,3,y,.18,.16,RED)
    B('Cobbler bench',2.5,-1,.95,3,1.5,.15,CREAM,3);solid(2.5,-1,3,1.5)
    for x in [1.5,2.5,3.5]:B('Shoe and sole',x,-1,1.15,.42,.75,.25,DARK)
    dynamic('hammer',B('Cobbler hammer',2.5,-.8,1.8,.55,.2,.2,DARK))
    dynamic('scissors',B('Barber scissors',-2.2,-.5,2.1,.5,.1,.08,CREAM))

def games():
    B('Play court',0,0,.24,10,7,.08,TEAL)
    for i in range(8):
        x=(-.45 if i%3==0 else .45 if i%3==1 else 0)-2
        z=-2.5+i*.6
        for dx in [-.43,.43]:B('Hopscotch chalk',x+dx,z,.29,.025,.58,.012,CREAM)
        for dz in [-.29,.29]:B('Hopscotch chalk',x,z+dz,.29,.86,.025,.012,CREAM)
    for i in range(12):ball('Glass marble',2+math.cos(i)*.8,math.sin(i)*.8,.32,.07,[TEAL,RED,GOLD][i%3])
    dynamic('chapteh',C('Chapteh feathers',1,1,1,.1,.4,RED,6))
    sign('ONE MORE ROUND',0,-3.5,1.8,7,TEAL)

def mrt():
    B('Station platform',0,0,.7,12,5,1,CREAM);solid(0,0,12,5)
    for x in [-5,0,5]:B('Platform pillar',x,-1.8,2.4,.2,.2,3.4,TEAL)
    B('Station canopy fragment',0,-1.5,4.1,12,2,.2,TEAL)
    for z in [2,2.25]:B('Yellow safety line',0,z,1.22,11,.08,.02,GOLD)
    g=group('motion_'+owner['stationId']+'_train',0,-1.8,1.5)
    for o in [B('Early MRT train',0,0,1,9,1.7,1.8,CREAM),B('Train red stripe',0,.88,.8,9,.025,.25,RED)]:o.parent=g
    for x in [-3,-1.5,0,1.5,3]:
        o=B('Train window',x,.88,1.3,1,.025,.55,DARK);o.parent=g
    sign('MRT  /  1987',0,2.4,2.1,5,TEAL)

def lan():
    room('ONE MORE GAME',11,7,TEAL)
    for x in [-3.8,-1.3,1.3,3.8]:monitor(x,-1)
    B('Cash counter',-3,2.7,.95,3,1,1.4,RED);solid(-3,2.7,3,1)
    sign('LAN  /  $2 PER HOUR',0,-3.4,2.65,7,DARK)
    for x in [-3.8,-1.3,1.3,3.8]:dynamic('pixel',B('Game indicator',x,-.83,1.7,.12,.03,.12,GOLD,glow=True))

def arcade():
    room('ARCADE',12,8,'#82589a')
    for x in [-5.8,5.8]:B('Arcade neon edge',x,3.9,1.9,.065,.065,3.2,'#c980ff',glow=True)
    for x in [-3,3]:
        B('Arcade cabinet',x,-2,1.3,2,1.3,2,DARK);solid(x,-2,2,1.3)
        B('Cabinet screen',x,-1.31,1.8,1.5,.03,1,TEAL,glow=True)
        if x<0:
            for dx in [-.65,.65]:
                for dz in [-.65,.65]:dynamic('pad',B('Dance arrow',x+dx,.7+dz,.35,1.15,1.15,.15,RED if dx==dz else TEAL,glow=True))
            for dx in [-1.3,1.3]:beam('Dance rail',(x+dx,2,.4),(x+dx,2,1.6),.06,CREAM)
            beam('Dance rail',(x-1.3,2,1.6),(x+1.3,2,1.6),.06,CREAM)
        else:
            for dx in [-.55,.65]:
                stool(x+dx,1,RED);C('Steering wheel',x+dx,-.6,1.1,.25,.08,DARK)
            B('Racing bonnet',x,0,.6,2,2,.3,RED)

def bowling():
    room('BOWL',11,11,TEAL)
    for x in [-2.5,2.5]:
        B('Bowling lane',x,-.4,.3,3.7,9,.1,CREAM,3)
        for dx in [-2,2]:B('Ball gutter',x+dx,-.4,.32,.25,9,.08,DARK)
        B('Foul line',x,3.2,.37,3.7,.1,.02,RED)
        for row in range(4):
            for j in range(row+1):
                px=x+(j-row/2)*.45;pz=-3.5-row*.35
                pin=group('motion_'+owner['stationId']+'_pin',px,pz,.68)
                for o in [C('Bowling pin',0,0,0,.12,.65,CREAM,10),C('Pin red neck',0,0,.15,.125,.08,RED)]:o.parent=pin
        dynamic('ball',ball('Bowling ball',x,2.5,.62,.28,TEAL))
    B('Ball return',0,3.5,.65,.55,2,.65,DARK);solid(0,3.5,.55,2)

def stadium():
    B('Pitch fragment',0,1,.24,11,7,.08,'#689a88')
    for x in [-5,5]:B('Touch line',x,1,.29,.06,6,.01,CREAM)
    B('Centre line',0,1,.29,10,.06,.01,CREAM)
    for i in range(4):
        verts=[]
        for j in range(34):
            a=-1.12+j*2.24/33
            for r,y in [(4.7+i*.62,.25),(5.38+i*.62,.25),(4.7+i*.62,.75+i*.43),(5.38+i*.62,.75+i*.43)]:verts.append((math.sin(a)*r,-1.2+math.cos(a)*r,y))
        faces=[]
        for j in range(33):
            n=j*4;faces.extend([(n+2,n+6,n+7,n+3),(n,n+4,n+6,n+2),(n+1,n+3,n+7,n+5)])
        mesh('Continuous curved stadium tier',verts,faces,CREAM)
        for j in range(17):
            a=-1.05+j*2.1/16;r=5+i*.62
            x=math.sin(a)*r;z=1.2-math.cos(a)*r
            o=B('Grandstand seat',x,z,.87+i*.43,.57,.45,.15,RED);o.rotation_euler.z=-a
            o=B('Grandstand seat back',x+math.sin(a)*.23,z-math.cos(a)*.23,1.1+i*.43,.57,.08,.4,RED);o.rotation_euler.z=-a
            if i==3:
                o=B('Stadium outer parapet',x+math.sin(a)*.4,z-math.cos(a)*.4,2.7,.96,.24,1.5,CREAM);o.rotation_euler.z=-a
    solid(0,-4.8,11,3.5)
    for side in [-1,1]:
        for j in range(5):
            x=side*(3.7+j*.22);z=-2+j*.75
            B('Stadium entrance stair',x,z,.35+j*.08,.8,.7,.15,CREAM)
    for x in [-5.4,5.4]:
        beam('Floodlight mast',(x,-3,.2),(x,-3,6),.09,DARK)
        for dx in [-.4,0,.4]:B('Floodlight',x+dx,-2.95,6,.3,.18,.4,CREAM,glow=True)
    for x in [-1.5,1.5]:beam('Goal post',(x,-1.8,.2),(x,-1.8,2),.04,CREAM)
    beam('Goal crossbar',(-1.5,-1.8,2),(1.5,-1.8,2),.04,CREAM)
    dynamic('football',ball('Football',0,2,.45,.23,CREAM))
    sign('MATCH DAY',0,-5.3,3,6,RED)

def photo():
    B('Music shop floor',2.6,0,.25,6.5,7,.1,CREAM,2)
    B('Music shop rear',2.6,-3.4,2,6.5,.2,3.5,CREAM,4);solid(2.6,-3.4,6.5,.2)
    B('Illustrated comics and records',2.6,-3.26,1.85,6.1,.035,2.9,CREAM,9)
    for x in [-.65,5.85]:B('Music shop column',x,2.7,1.9,.18,.18,3.3,TEAL)
    B('Music shop roof',2.6,-1.6,3.9,6.8,3.5,.16,TEAL)
    sign('MUSIC & COMICS',2.6,.2,3.3,6.5,TEAL)
    for i in range(10):B('Music shop striped awning',-.4+i*.65,1.1,3.15,.65,1.8,.1,CREAM if i%2 else TEAL)
    B('Photo booth',-3,-1,1.7,3,3,2.9,GOLD);solid(-3,-1,3,3)
    sign('PHOTO',-3,.58,2.9,2.9,CREAM)
    B('Photo curtain',-3,.53,1.7,2,.05,2.4,DARK)
    B('Photo screen',-1.47,-1,1.9,.035,1,.8,TEAL,glow=True)
    dynamic('flash',B('Photo flash',-1.45,-1,2.7,.04,.5,.15,CREAM,glow=True))
    for y in [.7,1.4,2.1]:
        B('Music shelf',2.7,-2.7,y,4.5,.6,.1,CREAM,3)
        for j in range(12):B('Comics and CDs',.8+j*.35,-2.65,y+.23,.25,.35,.4,[RED,GOLD,TEAL,CREAM][j%4])
    B('Listening counter',2.5,.5,1,3,1,1.4,TEAL);solid(2.5,.5,3,1)
    for x in [1.5,3.5]:C('Listening headphones',x,.5,1.9,.27,.12,DARK)

def jetty():
    B('Working river',0,0,.17,12,9,.12,TEAL)
    for x in [-4,0,4]:B('Timber jetty',x,0,.35,1.5,8,.22,CREAM,3)
    for x in [-4,0,4]:
        for z in [-3,3]:C('Jetty bollard',x,z,.65,.13,.7,DARK)
    g=group('motion_'+owner['stationId']+'_boat',2,0,.4)
    for o in [B('Bumboat hull',0,0,.3,2,5,.55,RED),B('Boat cabin',0,-1,1.1,1.6,1.7,1.2,CREAM),B('Cabin roof',0,-1,1.8,2,2,.15,DARK)]:o.parent=g
    for x in [-4,0]:
        for z in [-2,0,2]:B('Cargo crate',x,z,.9,1,1,.8,CREAM,3)
    solid(0,0,12,8);sign('RIVER LANDING',0,-4.5,3,7,DARK)

def wash():
    room('KAMPONG YARD',10,7,CREAM)
    for x in [-3.5,3.5]:beam('Laundry post',(x,0,.2),(x,0,3),.06,DARK)
    beam('Washing line',(-3.5,0,2.8),(3.5,0,2.8),.018,DARK)
    for i in range(7):dynamic('laundry',B('Drying laundry',-2.8+i*.9,0,2.3,.65,.035,.9,[RED,TEAL,CREAM,GOLD][i%4]))
    for x in [-3,0,3]:C('Wash basin',x,2,.5,.6,.45,TEAL)
    C('Standpipe',-4,1,1,.08,1.5,DARK);beam('Tap',(-4,1,1.7),(-3.6,1,1.7),.07,DARK)

def trishaw():
    room('TRISHAW & REPAIRS',10,7,RED)
    for z in [-1,1.4]:
        for x in [-1.2,1.2]:
            o=C('Trishaw wheel',x,z,.75,.6,.12,DARK);o.rotation_euler[1]=math.pi/2
    B('Passenger bench',0,-.8,1.1,2,1,.5,RED)
    B('Trishaw shade',0,-.8,2.6,2.5,1.6,.12,CREAM,5)
    for x in [-1,1]:beam('Canopy support',(x,-1,1),(x,-1,2.6),.05,DARK)
    beam('Pedal frame',(0,0,.7),(0,2,.7),.07,TEAL)
    solid(0,0,3,4)
    B('Repair bench',3,-2,1,2,1,.2,CREAM,3)
    dynamic('hammer',B('Repair tool',3,-2,1.6,.55,.2,.2,DARK))

def arts():
    room('OPEN STUDIO',11,7,TEAL)
    for x in [-3,0,3]:
        beam('Easel',(x-.5,-1,.2),(x,-1,2.8),.055,CREAM)
        beam('Easel',(x+.5,-1,.2),(x,-1,2.8),.055,CREAM)
        B('Canvas',x,-.95,2,1.5,.08,1.5,CREAM)
        for i in range(4):B('Painted colour',x-.5+i*.32,-.89,2+math.sin(i)*.2,.25,.02,.6,[RED,TEAL,GOLD,DARK][i])
    table(0,2)
    dynamic('brush',B('Paintbrush',0,1.8,1.5,.06,.8,.06,RED))

def skate():
    B('Urban skate plaza',0,0,.24,11,8,.1,CREAM,2)
    for x in [-4,4]:
        for i in range(8):B('Quarter pipe step',x,-2+i*.4,.4+(7-i)**2*.04,2,.45,.25,TEAL)
    beam('Grind rail',(-2,0,.9),(2,0,.9),.07,RED)
    for x in [-2,2]:beam('Rail leg',(x,0,.2),(x,0,.9),.06,RED)
    dynamic('skate',B('Skateboard',0,2,.4,.6,1.5,.1,DARK))
    sign('AFTER HOURS',0,-4,2.8,6,TEAL)

STATIONS={
 'fair': [('cinema','Picture palace','A ticket, a red seat, and the lights going down.','Watch the matinee','cinema'),('song','Song stage','Live songs beneath the lights of the amusement worlds.','Catch the chorus','song'),('rides','Wonderland rides','Spinning cups beside a small, swooping coaster.','Take a spin','rides'),('badminton','Badminton hall','One more rally under the open roof trusses.','Serve the shuttle','badminton'),('carnival','Carnival booths','Bottle targets, small prizes and a hopeful throw.','Toss a ring','carnival'),('wayang','Wayang stage','A bright backdrop, a small stage, an evening performance.','Watch the performance','wayang'),('satay','Satay & kopi','Charcoal skewers and a long coffee pour after the show.','Order supper','satay')],
 'estate':[('voiddeck','Downstairs at the block','Communal television, corridor laundry and a chess table.','Watch together','voiddeck'),('provisions','Provision shop','Sweet jars, biscuit tins and a familiar weighing scale.','Pick a treat','provisions'),('mrt','The first train rides','A short platform and the red-striped trains of a new journey.','Watch the train arrive','mrt'),('dragon','Dragon playground','Mosaic curves, climbing steps and the slide everyone races for.','Take the slide','dragon'),('trades','Barber & cobbler','A trim on one side; a carefully repaired sole on the other.','See the craft','trades'),('games','Five more minutes','Hopscotch, marbles and keeping the chapteh in the air.','Keep it up','games'),('kopi','Kopi downstairs','Toast, soft eggs and a coffee pulled through the afternoon.','Pour a kopi','kopi')],
 'town':[('lan','One more game','Four CRTs, the keyboard clatter and the last round before supper.','Start a round','lan'),('arcade','Arcade after school','Dance arrows and side-by-side racing cabinets.','Hit the next beat','arcade'),('bowling','At the lanes','Polished boards, the rolling ball and a clatter of pins.','Roll a ball','bowling'),('stadium','Match day','A fragment of the old stands, floodlights and a familiar cheer.','Take a shot','stadium'),('photo','Photo, music & comics','A curtain booth, listening counter and shelves worth browsing.','Take a photo','photo'),('steamboat','Supper under the roof','Simmering broth, shared bowls and a table that lingers.','Share the hotpot','steamboat')],
 'river':[('jetty','River landing','Cargo crates and a working bumboat at the timber jetty.','Watch the boat unload','jetty'),('provisions','Five-foot-way trade','Provision jars and daily necessities at the counter.','Visit the counter','provisions'),('wayang','Street performance','Neighbours gather around a small opera stage.','Stay for the show','wayang'),('wash','Kampong washing yard','A standpipe, basins and bright laundry in the breeze.','Pause in the yard','wash'),('trishaw','Trishaw & repairs','A passenger carriage, a repair bench and well-used tools.','Watch a repair','trishaw'),('games','Games on the ground','Marbles and a feathered chapteh on a shared patch of ground.','Join a round','games'),('hawker','Roadside supper','Food at a small counter, coffee and places to sit together.','Order at the stall','hawker')],
 'garden':[('arts','Open studio','Easels, paint and making something together after work.','Watch the brushwork','arts'),('skate','After-hours skate plaza','Concrete ramps, a rail and a board in motion.','Watch the run','skate'),('stage','Neighbourhood stage','A small contemporary performance beneath warm lights.','Hear the set','song'),('badminton','Evening doubles','A court, a shuttle and the last rally of the evening.','Serve the shuttle','badminton'),('photo','Listening & little finds','Music, comics and a keepsake from the photo booth.','Take a photo','photo'),('steamboat','Supper together','A hotpot table beside the evening promenade.','Share the hotpot','steamboat'),('kopi','The familiar counter','Coffee and toast still bring people to the same table.','Pour a kopi','kopi')]
}
exec((ROOT/'scripts/culture-sculptures.py').read_text())
exec((ROOT/'scripts/culture-interiors.py').read_text())
BUILDERS=dict(cinema=cinema,song=lambda:stage('SONGS AT THE WORLDS'),wayang=lambda:stage('WAYANG',True),rides=rides,badminton=badminton,carnival=carnival,dragon=dragon,voiddeck=voiddeck,provisions=provisions,trades=trades,games=games,mrt=mrt,lan=lan,arcade=arcade,bowling=bowling,stadium=stadium,photo=photo,jetty=jetty,wash=wash,trishaw=trishaw,arts=arts,skate=skate)
for k,title in [('kopi','KOPI & TOAST'),('satay','SATAY & KOPI'),('steamboat','SUPPER TOGETHER'),('hawker','ROADSIDE HAWKER')]:BUILDERS[k]=lambda k=k,title=title:food(title,k)

def restore_original(era):
    """Re-run the entire original authoring function, including its central landmarks."""
    legacy={}
    exec((ROOT/'scripts/build-trip-worlds.py').read_text().split('selected=sys.argv')[0],legacy)
    def legacy_material(o,c):
        o.data.materials.clear();o.data.materials.append(legacy['mat'](c))
        if not o.data.uv_layers:
            uv=o.data.uv_layers.new(name='Packed surface')
            for f in o.data.polygons:
                for i,j in enumerate(f.loop_indices):uv.data[j].uv=[(0,0),(1,0),(1,1),(0,1)][i%4]
        return o
    def legacy_box(name,loc,scale,c,bevel=0):return legacy_material(B(name,loc[0],-loc[1],loc[2],*scale,c),c)
    def legacy_cyl(name,loc,r,depth,c,vertices=12):return legacy_material(C(name,loc[0],-loc[1],loc[2],r,depth,c,vertices),c)
    def legacy_ball(name,loc,scale,c):
        data=bpy.data.meshes.new(name);bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=1,radius=1);bm.to_mesh(data);bm.free()
        o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.scale=scale
        return legacy_material(o,c)
    legacy.update(box=legacy_box,cyl=legacy_cyl,ball=legacy_ball)
    original_tree=legacy['tree']
    def infill_tree(x,y,palm=False):
        # Keep original architecture; avoid trees growing through the new interiors.
        if any(abs(x-sx)<4.1 and abs(-y-sz)<3.5 for sx,sz in CULTURE_POSITIONS[era]):return
        if era=='fair' and x in [-17,-13] and abs(y+15.5)<.01:
            # Keep these trees along the same edge, beyond the audience sightline.
            y=-18.3
        return original_tree(x,y,palm)
    legacy['tree']=infill_tree
    add_districts=legacy['add_districts']
    legacy['add_districts']=lambda key,solid,activities:add_districts(key,solid,activities,tree_count=8)
    meta=legacy['build_trip'](era,export=False)
    original_objects=list(bpy.context.scene.objects)
    if era=='fair':
        # Reuse the original getai as the expanded performance's foundation.
        # Its curtain now sits behind the new folds, not across the audience view.
        curtain=bpy.data.objects.get('Stage curtain')
        if curtain:
            curtain.location=(-14,-8.04,1.82)
            curtain.dimensions.z=1.64
        title=bpy.data.objects.get('LIVE TONIGHT')
        if title:
            title.location=(-14,-11.53,.55);title.scale*=.8
    for o in original_objects[:]:
        if o.name.startswith(('Hibiscus hedge','Hibiscus flower')) and any(abs(o.location.x-sx)<4.1 and abs(-o.location.y-sz)<3.5 for sx,sz in CULTURE_POSITIONS[era]):
            original_objects.remove(o);bpy.data.objects.remove(o,do_unlink=True)
    legacy['surface_details'](original_objects)
    original=group('original_world')
    landmark_names=['Attap home','Singapore River water','Timber footbridge','Theatre','Illuminated gateway','Wonderland inspired coaster rail','Carousel platform','Getai stage','HDB block','Communal TV cabinet','Tiled wet market counter','Elevated railway','Neighbourhood mall','Regional library','Bus shelter','Marina Bay Sands tower','SkyPark boat deck','Supertree trunk','Conservatory glass rib','Waterfront water','Raised community garden']
    original['preservedLandmarks']={name:sum(o.name.split('.')[0]==name for o in original_objects) for name in landmark_names}
    original['sourceRevision']='a234102'
    for o in original_objects:
        if o.parent is None:o.parent=original
    return meta

CULTURE_POSITIONS={
  'fair':[(-11,-15),(-14,10),(11,-16),(14,14),(-1,17),(-1,-17),(-8,17)],
  'estate':[(-12,-3),(2,-12),(12,-12),(0,2),(13,13),(-11,17),(2,16)],
  'town':[(-12,2),(-12,16),(-11,-17),(10,5),(10,17),(0,17)],
  'river':[(-10,-17),(2,13),(15,3),(2,-18),(14,-17),(-1,18),(14,-4)],
  'garden':[(-14,4.5),(0,-7),(13,3.5),(-14,21),(6,-8.5),(11,21),(3,10.5)]
}

def build(era):
    global owner,origin,solids,ERA,atlas,detail_atlas,station_scale
    ERA=era;owner=None;origin=(0,0);solids=[];station_scale=1
    materials.clear()
    decor_materials.clear()
    print('RESTORING '+era+' complete original world',flush=True)
    meta=restore_original(era)
    solids=list(meta['solids'])
    atlas=bpy.data.images.load(str(OUT/'reference-surfaces.png'),check_existing=True);atlas.pack()
    detail_atlas=bpy.data.images.load(str(OUT/'interior-details.png'),check_existing=True);detail_atlas.pack()
    prepare_surface_maps()
    tile=1 if era=='fair' else 2 if era in ['town','garden'] else 0
    base={'fair':'#62566e','estate':'#c6a875','town':'#607985','river':'#b7a181','garden':'#526a76'}[era]
    B('Atmospheric ground beyond the original neighbourhood',0,0,-.1,180,180,.1,base)
    ground_vertices=[];ground_faces=[]
    for ix in range(24):
        for iz in range(24):
            x=-84+ix*7;z=-78+iz*6.5;n=len(ground_vertices)
            ground_vertices.extend([(x,-z,.065),(x+7,-z,.065),(x+7,-z-6.5,.065),(x,-z-6.5,.065)])
            ground_faces.append((n+3,n+2,n+1,n))
    mesh('Original neighbourhood surface',ground_vertices,ground_faces,base,tile)
    # Original streets, rivers, waterfront, buildings and courtyard remain in place.
    sites=[]
    positions=CULTURE_POSITIONS[era]
    for i,(sid,title,description,action,kind) in enumerate(STATIONS[era]):
        x,z=positions[i];origin=(x,z);station_scale=.6
        if era=='garden' and sid=='skate':station_scale=.5
        owner=group('station_'+sid);owner['stationId']=sid
        BUILDERS[kind]()
        # All native components remain grouped by destination for picking and editing.
        elevation=.46 if era=='fair' and sid=='song' else .1
        owner.location=(x,-z,elevation);owner.scale=(station_scale,)*3
        entrance=dict(x=x,z=z+6*station_scale)
        if era=='river' and sid=='jetty':entrance=dict(x=-4.5,z=-17)
        if era=='fair' and sid=='carnival':entrance=dict(x=3.5,z=20)
        if era=='town' and sid=='steamboat':entrance=dict(x=4,z=18.5)
        if era=='garden' and sid=='stage':entrance=dict(x=17.2,z=6.5)
        if era=='garden' and sid=='kopi':entrance=dict(x=7.2,z=10.5)
        if era=='garden' and sid in ['badminton','steamboat']:entrance=dict(x=x+4.2,z=21)
        sites.append(dict(id=sid,title=title,description=description,action=action,kind=kind,x=x,z=z,scale=station_scale,elevation=elevation,entrance=entrance,focus=dict(x=x,z=z+.5*station_scale),duration=7 if kind!='rides' else 10))
        owner=None
        C('Entrance marker',entrance['x'],entrance['z'],.19,.3,.025,GOLD)
        if era in ['fair','garden','town']:
            for dx in [-5.5*station_scale,5.5*station_scale]:
                beam('Street lamp',(x+dx,z+5*station_scale,.2),(x+dx,z+5*station_scale,2.5),.045,DARK)
                C('Warm lamp',x+dx,z+5*station_scale,2.5,.16,.18,GOLD,glow=True)
    # A small number of accents, leaving the stage floor to the attractions.
    for x,z in [(-7,-17),(18,10)]:
        beam('Accent tree',(x,z,.2),(x,z,2.5),.12,DARK)
        ball('Sparse canopy',x,z,3.1,1.1,'#759786')
    if era=='fair':
        for z in [-7,8]:
            for x in range(-24,25,3):
                y=4.5-.7*math.cos(x/24*math.pi/2)
                C('String light',x,z,y,.1,.17,GOLD,glow=True)
                if x<24:beam('Festoon cable',(x,z,y),(x+3,z,4.5-.7*math.cos((x+3)/24*math.pi/2)),.012,DARK)
    meta['solids']=solids
    # Batch within each selectable station and material. Moving parts stay distinct.
    groups={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH' and not o.name.startswith(('motion_','anim_')) and not (o.parent and o.parent.name.startswith(('motion_','anim_'))):
            key=(o.parent.name if o.parent else '',o.data.materials[0].name)
            groups.setdefault(key,[]).append(o)
    for (parent,matname),objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        objects[0].name=(parent or 'landscape')+'_'+matname
    print('EXPORTING '+era,flush=True)
    prepare_export_images()
    bpy.data.orphans_purge(do_recursive=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/trip'/(era+'.blend')))
    export_native_world(era)
    (ROOT/'public/assets/trip'/(era+'.json')).write_text(json.dumps(meta,indent=2))
    return dict(stations=sites,solids=solids,spawn=meta['spawn'],center=dict(x=0,z=0),bounds=meta['bounds'])

selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(STATIONS)
worlds=json.loads((OUT/'worlds.json').read_text()) if (OUT/'worlds.json').exists() else {}
for era in selected:
    if era not in STATIONS:raise ValueError('Unknown era: '+era)
    if era == 'river':
        # Preserve the explicitly selected published scene, byte for byte.
        import subprocess
        for relative in ['art/trip/river.blend', 'public/assets/trip/river.glb', 'public/assets/trip/river.json']:
            (ROOT/relative).write_bytes(subprocess.check_output(['git', 'show', 'a234102:'+relative], cwd=ROOT))
        worlds.pop('river', None)
        continue
    worlds[era]=build(era)
(OUT/'worlds.json').write_text(json.dumps(worlds,indent=2))
print('CULTURE_WORLDS_COMPLETE')
