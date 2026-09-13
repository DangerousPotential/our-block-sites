"""Reference-specific fittings for the native cinema and LAN cafe.

Loaded after the sculpture overrides; every object remains inside its original
selectable station. Printed art and lighting are packed into the same GLB.
"""
decor_materials={}

def printed_material(filename,emission=0):
    key=(filename,emission)
    if key not in decor_materials:
        source=bpy.data.images.load(str(OUT/filename),check_existing=True)
        image=source.copy();w,h=image.size
        size=576 if h>w else 512
        image.scale(round(w*size/max(w,h)),round(h*size/max(w,h)));image.pack()
        m=bpy.data.materials.new('culture_print_'+filename);m.use_nodes=True
        node=m.node_tree.nodes.get('Principled BSDF')
        node.inputs['Roughness'].default_value=.26 if emission else .78
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        m.node_tree.links.new(tex.outputs['Color'],node.inputs['Base Color'])
        if emission:
            m.node_tree.links.new(tex.outputs['Color'],node.inputs['Emission Color'])
            node.inputs['Emission Strength'].default_value=emission
        decor_materials[key]=m
    return decor_materials[key]

def printed_panel(name,x,z,y,w,h,filename,emission=0,curved=False):
    nx,ny=(12,9) if curved else (1,1)
    vertices=[];faces=[]
    for j in range(ny+1):
        for i in range(nx+1):
            u=i/nx;v=j/ny
            bulge=.035*math.sin(math.pi*u)*math.sin(math.pi*v) if curved else 0
            vertices.append((x+(u-.5)*w,-z-bulge,y+(v-.5)*h))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
    o=mesh(name,vertices,faces,CREAM)
    o.data.materials.clear();o.data.materials.append(printed_material(filename,emission))
    uv=o.data.uv_layers.new(name='Full printed artwork')
    for face in o.data.polygons:
        face.use_smooth=curved
        for loop in face.loop_indices:
            index=o.data.loops[loop].vertex_index
            uv.data[loop].uv=((index%(nx+1))/nx,(index//(nx+1))/ny)
    return o

def remove_station_parts(prefixes):
    # Only the active new attraction's placeholder fittings are replaced.
    # Original neighbourhood objects have another parent and cannot match.
    for o in list(owner.children):
        if any(o.name.startswith(prefix) for prefix in prefixes):bpy.data.objects.remove(o,do_unlink=True)

def fixture(name,x,z,y,intensity,color,distance=7,target=None,cone=90):
    light=bpy.data.lights.new(name,'SPOT' if target else 'POINT')
    light.color=tuple((int(color[i:i+2],16)/255)**2.2 for i in [1,3,5])
    # glTF SPEC mode converts omnidirectional W to cd. Account for the parent
    # station's scale so native and browser falloff use the same scene units.
    light.energy=intensity*station_scale**2*4*math.pi/683
    light.shadow_soft_size=.2
    light.use_custom_distance=True;light.cutoff_distance=distance*station_scale
    o=bpy.data.objects.new('fixture_'+owner['stationId']+'_'+name,light)
    bpy.context.collection.objects.link(o);o.parent=owner;o.location=(x,-z,y)
    if target:
        tx,tz,ty=target
        o.rotation_euler=(Vector((tx,-tz,ty))-o.location).to_track_quat('-Z','Y').to_euler()
        light.spot_size=math.radians(cone);light.spot_blend=.6
    owner['authoredLighting']=True
    return o

def cable(name,points,r=.018,color=DARK):
    for a,b in zip(points,points[1:]):beam(name,a,b,r,color)

def fitted_letters(body,x,z,y,width,height,color):
    bpy.ops.object.text_add(location=(x,-z,y-height*.35),rotation=(math.pi/2,0,0))
    o=bpy.context.object;o.name='Fitted lettering '+body
    o.data.body=body;o.data.align_x='CENTER';o.data.size=min(height,width/max(1,len(body))/.7);o.data.extrude=.002
    o.data.materials.append(material(color));bpy.ops.object.convert(target='MESH');o.parent=owner

base_fitted_lan=lan
def lan():
    base_fitted_lan()
    remove_station_parts(['CRT housing','Luminous screen','Screen pixels','Keyboard','Mouse','Computer tower','Desk','CRT blue display','Ivory CRT monitor casing','Stool','Plastic chair','LAN software display'])
    ivory='#e6e2cf';charcoal='#354249'
    # Dark wainscot, timber shelf edges and the original software artwork turn
    # the blank back wall into the dense, familiar room in the concept.
    B('LAN lower timber wall',0,-3.28,.96,10.4,.16,1.3,'#644b45',3)
    for x in [-4.9,-.05,4.9]:B('LAN wall pilaster',x,-3.13,2.1,.09,.08,2.9,ivory)
    for x in [-3,2.5]:
        B('Software shelving carcass',x,-3.02,2.1,3.7,.42,1.8,'#574840')
        B('Painted software spines',x,-2.78,2.1,3.5,.025,1.64,CREAM,9)
        for y in [1.23,1.79,2.36,2.98]:B('Software shelf lip',x,-2.74,y,3.8,.11,.045,ivory)
    for x in [-3.8,-1.3,1.3,3.8]:
        B('Rounded laminate computer desk',x,-.9,1.05,2.04,1.38,.12,CREAM,3)
        for dx in [-.86,.86]:
            for z in [-1.44,-.39]:B('Computer desk steel leg',x+dx,z,.65,.07,.07,.8,charcoal)
        B('Bevelled CRT casing',x,-1.18,1.62,1.05,.74,.84,ivory)
        B('CRT rear taper',x,-1.64,1.61,.73,.25,.6,'#babdab')
        B('CRT base pedestal',x,-1.15,1.17,.48,.42,.12,'#aeb19f')
        B('CRT bezel shadow',x,-.795,1.66,.85,.045,.66,'#5b625d')
        printed_panel('Curved game phosphor',x,-.765,1.67,.8,.6,'lan-game-screen.png',.52,True)
        for dx in [.26,.35]:C('CRT brightness button',x+dx,-.77,1.26,.025,.03,charcoal)
        C('CRT green power LED',x+.43,-.76,1.26,.018,.025,'#97d57a',glow=True)
        B('Keyboard ivory chassis',x-.06,-.48,1.15,.89,.28,.065,ivory)
        for row in range(4):
            for col in range(11):B('Individual keyboard key',x-.435+col*.075,-.575+row*.057,1.19,.06,.045,.025,'#8f9688' if col>8 else '#d8dacb')
        B('Keyboard spacebar',x-.09,-.35,1.193,.31,.042,.022,'#d8dacb')
        B('Mouse mat',x+.69,-.46,1.12,.38,.37,.012,charcoal)
        sculpted_oval('Two button mouse',x+.69,-.47,1.18,.09,.14,.055,ivory)
        beam('Mouse button seam',(x+.69,-.49,1.235),(x+.69,-.6,1.21),.006,charcoal)
        cable('Mouse cord',[(x+.69,-.59,1.2),(x+.7,-.8,1.17),(x+.9,-.92,1.16),(x+.87,-1.48,1.14)])
        cable('Keyboard cord',[(x-.06,-.62,1.16),(x-.35,-.75,1.13),(x-.45,-1.45,1.14)])
        B('Vented PC tower',x+.58,-1.03,.65,.39,.67,.82,ivory)
        for y in [.43,.48,.53,.58]:B('PC intake grille',x+.58,-.686,y,.27,.018,.017,charcoal)
        for y in [.83,.93]:B('CD drive slot',x+.58,-.682,y,.28,.019,.025,charcoal)
        C('Tower activity lamp',x+.7,-.67,.69,.017,.024,'#94bf6a',glow=True)
        for dx in [-.72,.72]:
            B('Desktop speaker cabinet',x+dx,-1.27,1.33,.19,.21,.4,charcoal)
            cone=C('Speaker cloth grille',x+dx,-1.153,1.35,.064,.02,'#667275');cone.rotation_euler.x=math.pi/2
        B('Moulded plastic chair seat',x,.29,.65,.82,.75,.13,ivory)
        for dx in [-.34,.34]:
            for z in [.02,.57]:B('Plastic chair foot',x+dx,z,.39,.07,.08,.46,ivory)
        B('Plastic chair back surround',x,.63,1.03,.82,.09,.68,ivory)
        for dx in [-.25,-.125,0,.125,.25]:B('Chair back open slot',x+dx,.688,1.05,.057,.012,.43,'#596a61')
        # Drinks and headphones make each seat read as a used workstation.
        C('Soft drink can',x+.91,-.57,1.29,.072,.28,RED)
        C('Drink can aluminium lid',x+.91,-.57,1.438,.069,.012,'#c5cec7')
        for i in range(14):
            a=math.pi*i/14;b=math.pi*(i+1)/14
            beam('Headset padded band',(x-.72+.18*math.cos(a),-.39,1.16+.22*math.sin(a)),(x-.72+.18*math.cos(b),-.39,1.16+.22*math.sin(b)),.025,charcoal)
        for dx in [-.18,.18]:B('Headset ear pad',x-.72+dx,-.39,1.16,.07,.13,.12,charcoal)
    B('Cash counter timber top',-3,2.7,1.72,3.16,1.1,.1,CREAM,3)
    B('Till body',-3.5,2.65,1.98,.64,.58,.48,ivory)
    B('Till readout',-3.5,2.956,2.07,.42,.018,.13,'#477e73',glow=True)
    B('Counter rate card frame',-2.25,2.88,2.04,.54,.08,.61,ivory)
    fitted_letters('$2 / HR',-2.25,2.94,2.1,.45,.14,DARK)
    for x in [-3,3]:
        B('Warm desk tube casing',x,-1.71,3.01,3.8,.2,.12,ivory)
        B('Fluorescent diffuser',x,-1.63,2.94,3.6,.16,.045,'#ffdc99',glow=True)
    fixture('desk_left',-2.5,-.6,2.72,24,'#ffdeb1',6,(-2.5,-.3,.6),110)
    fixture('desk_right',2.5,-.6,2.72,24,'#ffdeb1',6,(2.5,-.3,.6),110)
    fixture('screens',0,-.7,1.75,2.2,'#80bfff',5)

base_fitted_cinema=cinema
def cinema():
    base_fitted_cinema()
    remove_station_parts(['Painted matinee scene','Framed matinee poster','Ticket booth brass frame'])
    # Dark acoustic lining gives the projected film a proper auditorium rather
    # than an outdoor screen in front of the original cream wall.
    B('Auditorium dark rear lining',2.5,-3.44,2.43,5.72,.11,3.76,'#382f3b')
    for x in [-.18,5.23]:B('Auditorium side acoustic pilaster',x,-2.1,2,.14,2.7,3.2,'#523641')
    # The screen remains just in front of the new lining.
    for o in owner.children:
        if o.name.startswith(('Cinema screen','motion_'+owner['stationId']+'_projection')):o.location.y-=.31
    B('Auditorium carpet',2.6,-.1,.315,5.68,6.24,.025,'#592f3a')
    for z in [-1.8,-.3,1.2]:
        for x in [.25,1.75,3.25,4.75]:
            B('Seat stitched centre',x,z+.395,1.1,.57,.028,.54,'#a15359')
            for dx in [-.42,.42]:
                C('Seat cup holder',x+dx,z+.12,.99,.075,.05,DARK)
                B('Seat pedestal',x+dx*.65,z,.48,.075,.3,.3,DARK)
    # Warm cream marquee, ruby letters and thin brass ribs match the reference.
    remove_station_parts(['Sign CINEMA'])
    face=B('Cinema luminous marquee face',-2.8,3.844,4.15,5.73,.045,.78,'#ffe4ac',glow=True)
    face.data.materials[0]=face.data.materials[0].copy()
    face.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.55
    for y in [3.8,3.94,4.36,4.51]:B('Marquee brass ruled edge',-2.8,3.88,y,5.72,.025,.018,'#bb884d')
    bpy.ops.object.text_add(location=(-2.8,-3.89,3.94),rotation=(math.pi/2,0,0))
    title=bpy.context.object;title.name='Cinema ruby marquee lettering';title.data.body='CINEMA';title.data.align_x='CENTER';title.data.size=.61;title.data.space_character=1.25;title.data.extrude=.006
    title.data.materials.append(material('#ae353c'));bpy.ops.object.convert(target='MESH');title.parent=owner
    for x in [-5.2,-.4]:
        B('Poster gilded outer frame',x,3.125,2.12,.68,.06,1.04,GOLD)
        printed_panel('Original matinee poster',x,3.164,2.12,.62,.93,'cinema-poster.png')
        B('Poster light shade',x,3.22,2.74,.7,.19,.07,DARK)
        B('Poster warm strip',x,3.27,2.696,.56,.11,.025,'#ffe1a5',glow=True)
    # An actual recessed booth window with a half-height cash counter.
    remove_station_parts(['Ticket booth','Ticket transaction ledge','Sign TICKETS'])
    for o in list(owner.children):
        if o.name.startswith('Sign backing') and abs(o.location.x+4.5)<.01 and abs(o.location.z-2.2)<.01:bpy.data.objects.remove(o,do_unlink=True)
    B('Ticket booth red cabinet',-4.5,3.46,.91,1.5,.97,1.23,RED)
    B('Ticket booth brass countertop',-4.5,3.46,1.55,1.66,1.13,.085,GOLD)
    for x in [-5.19,-3.81]:B('Ticket booth window mullion',x,3.91,1.97,.055,.065,.78,GOLD)
    B('Ticket booth glazed rear',-4.5,2.94,1.97,1.35,.045,.76,'#5e7169')
    B('Ticket booth canopy restored',-4.5,3.46,2.42,1.85,1.35,.16,RED)
    fitted_letters('TICKETS',-4.5,4.15,2.43,1.65,.18,CREAM)
    for x in [-4.95,-4.25]:B('Ticket booklet',x,3.57,1.635,.25,.31,.06,CREAM)
    B('Cash drawer slot',-4.5,3.956,1.14,.65,.015,.035,DARK)
    for x in [-5.12,-3.88]:B('Booth brass cabinet inset',x,3.956,.91,.025,.016,.8,GOLD)
    fixture('marquee',-2.8,5.35,3.3,16,'#ffcc86',7,(-2.8,3.1,1.8),100)
    fixture('poster',-5.05,4.7,2.9,5,'#ffe3ad',3.4,(-5.05,3.17,1.9),70)
    fixture('film',2.5,-2.88,2.6,4,'#cadbff',4.5)

def cabinet_shell(name,x,width,color):
    # A real stepped side profile: recessed CRT, projecting control deck and
    # deep plinth. Front/rear surfaces share this section, not a cuboid proxy.
    profile=[(-2.65,.34),(-1.05,.34),(-1.05,1.1),(-.82,1.24),(-.82,1.4),(-1.35,1.57),(-1.35,2.63),(-1.12,2.76),(-1.12,2.95),(-2.65,2.95)]
    n=len(profile)
    vertices=[(x+dx,-z,y) for dx in [-width/2,width/2] for z,y in profile]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    return mesh(name,vertices,faces,color)

def arcade():
    room('ARCADE',12,8,'#82589a')
    for x in [-5.8,5.8]:B('Arcade neon edge',x,3.9,1.9,.065,.065,3.2,'#c980ff',glow=True)
    remove_station_parts(['Partial roof','Side wall','Sign ARCADE'])
    purple='#755080';ink='#273441';silver='#a8b8bf';amber='#dfa14b'
    B('Arcade cutaway side parapet',-6,-.5,.96,.22,7,1.4,purple)
    B('Arcade rear roof strip',0,-3.25,4,12.4,1.7,.18,purple)
    for i in range(32):B('Arcade corrugated roof rib',-6.05+i*.39,-3.25,4.12,.055,1.7,.055,'#8d6b9b')
    B('Arcade front neon fascia',0,-2.35,3.48,11.8,.18,.75,purple)
    fitted_letters('ARCADE',0,-2.24,3.56,5.4,.55,'#ffdba5')
    B('Arcade cyan eave tube',0,-2.23,3.04,11.5,.045,.045,'#72dce7',glow=True)
    # The dance machine has two flanking speaker towers and a raised, bolted
    # four-panel steel deck with shaped illuminated arrow inserts.
    cabinet_shell('Dance machine stepped cabinet',-3,2.45,ink)
    solid(-3,-1.74,3.21,1.83)
    B('Dance screen bezel',-3,-1.305,2.09,1.79,.075,1.33,'#141c2b')
    printed_panel('Rhythm CRT picture',-3,-1.259,2.1,1.6,1.2,'arcade-dance-screen.png',.48,True)
    B('Dance cabinet header',-3,-1.08,2.83,2.42,.09,.18,'#82d1df',glow=True)
    for x in [-4.43,-1.57]:
        B('Dance speaker tower',x,-1.98,1.53,.35,1.32,2.38,purple)
        B('Speaker tower neon strip',x,-1.305,1.53,.055,.025,2.2,'#cd78e9',glow=True)
        for y in [.69,1.12]:
            speaker=C('Dance bass driver',x,-1.26,y,.13,.045,ink);speaker.rotation_euler.x=math.pi/2
    B('Dance steel platform',-3,.73,.37,2.95,2.95,.16,silver)
    for dx in [-.7,.7]:
        for dz in [-.7,.7]:
            x=-3+dx;z=.73+dz
            B('Dance panel rubber gasket',x,z,.46,1.36,1.36,.035,ink)
            panel=dynamic('pad',B('Dance illuminated panel',x,z,.489,1.25,1.25,.018,'#755298' if dx==dz else '#377990',glow=True))
            angle=math.atan2(dz,dx)-math.pi/2
            outline=[(-.15,-.38),(.15,-.38),(.15,.03),(.37,.03),(0,.41),(-.37,.03),(-.15,.03)]
            verts=[]
            for px,pz in outline:
                rx=px*math.cos(angle)-pz*math.sin(angle);rz=px*math.sin(angle)+pz*math.cos(angle)
                verts.append((x+rx,-z-rz,.506))
            mesh('Translucent arrow insert',verts,[tuple(reversed(range(7)))],'#ef8fde' if dx==dz else '#8af1de',glow=True)
            for sx in [-.56,.56]:
                for sz in [-.56,.56]:C('Dance panel bolt',x+sx,z+sz,.51,.023,.012,silver)
    for x in [-4.4,-1.6]:beam('Dance safety rail upright',(x,2.13,.44),(x,2.13,1.64),.055,silver)
    beam('Dance safety rail crossbar',(-4.4,2.13,1.64),(-1.6,2.13,1.64),.055,silver)
    # Separate driving machines each have a full 4:3 picture, steering wheel,
    # dashboard, shifter, pedals and a contoured red bucket seat.
    for x in [1.45,4.05]:
        cabinet_shell('Driving cabinet stepped shell',x,2.18,ink)
        solid(x,-1.74,2.18,1.83)
        solid(x,1.03,1.08,1.32)
        for dx in [-1.04,1.04]:B('Driving cabinet amber cheek',x+dx,-1.6,2.14,.12,.62,1.58,amber)
        B('Driving screen surround',x,-1.3,2.12,1.91,.07,1.43,'#141c2b')
        printed_panel('Racing CRT picture',x,-1.255,2.12,1.72,1.29,'arcade-racing-screen.png',.45,True)
        B('Driving machine amber header',x,-1.068,2.84,2.13,.09,.18,amber)
        B('Driving cockpit chassis',x,.02,.44,2.12,3.05,.26,ink)
        B('Dashboard padded lip',x,-.72,1.29,1.99,.3,.15,'#4c5661')
        for dx in [-.69,.69]:
            for y in [.67,.84]:
                speaker=C('Driving bass speaker',x+dx,-1.017,y,.105,.04,'#65747e');speaker.rotation_euler.x=math.pi/2
        # Wheel lies on a raked plane, with a real open centre and spokes.
        wheel_z=.45
        wheel_center=(x,wheel_z,1.31)
        beam('Steering column',(x,-.72,1.18),(x,wheel_z,1.28),.055,ink)
        for i in range(32):
            a=TAU*i/32;b=TAU*(i+1)/32
            beam('Driving wheel rim',(x+.31*math.cos(a),wheel_z+.16*math.sin(a),1.31+.24*math.sin(a)),(x+.31*math.cos(b),wheel_z+.16*math.sin(b),1.31+.24*math.sin(b)),.039,ink)
        for a in [math.pi/2,math.pi*7/6,math.pi*11/6]:beam('Steering wheel spoke',wheel_center,(x+.29*math.cos(a),wheel_z+.15*math.sin(a),1.31+.225*math.sin(a)),.025,silver)
        sculpted_oval('Steering wheel centre',x,wheel_z,1.31,.10,.055,.08,ink)
        B('Gear shift housing',x+.77,-.22,1.01,.27,.41,.38,amber)
        beam('Gear lever',(x+.77,-.22,1.2),(x+.77,-.17,1.4),.025,silver)
        ball('Gear lever knob',x+.77,-.17,1.42,.068,ink)
        for dx in [-.21,.21]:
            pedal=B('Driving pedal',x+dx,-.32,.69,.17,.32,.055,silver);pedal.rotation_euler.x=-.35
            for dz in [-.10,0,.1]:B('Pedal grip groove',x+dx,-.32+dz,.729,.15,.018,.008,ink)
        B('Bucket seat black pedestal',x,1.03,.62,.75,.77,.34,ink)
        B('Bucket seat red cushion',x,1.01,.85,.98,.94,.22,RED)
        back=B('Contoured racing seat back',x,1.48,1.35,1.08,.23,1.17,RED);back.rotation_euler.x=.10
        B('Seat stitched inset',x,1.332,1.35,.76,.035,.91,'#823942')
        for dx in [-.49,.49]:B('Bucket seat side bolster',x+dx,1.08,1.02,.17,.97,.39,RED)
        B('Racing seat headrest',x,1.50,1.92,.73,.25,.23,RED)
        B('Coin acceptor bezel',x+.71,-.983,1.04,.21,.026,.29,silver)
        B('Coin slot',x+.71,-.96,1.09,.10,.02,.018,ink)
    # Reference-specific surrounding fittings help the attraction read as a
    # small neighbourhood arcade rather than two machines on an empty slab.
    B('Arcade low timber bench',2.9,3.08,.73,3.3,.63,.12,CREAM,3)
    for x in [1.6,4.2]:B('Arcade bench support',x,3.08,.49,.12,.48,.43,ink)
    B('Arcade change machine',5.37,1.9,1.04,.56,.61,1.47,silver)
    B('Change machine front',5.37,2.22,1.09,.44,.027,1.1,ink)
    B('Change machine illuminated display',5.37,2.247,1.39,.30,.024,.19,'#9cd9cb',glow=True)
    fitted_letters('TOKENS',5.37,2.25,1.78,.52,.105,CREAM)
    fixture('dance_neon',-3,-.45,2.78,5,'#c68cec',4.5)
    fixture('racing_screens',2.7,-.3,2.77,4,'#7fd9e8',4.5)
    fixture('entry',0,2.5,3.2,12,'#ffd7a5',6,(0,.6,.5),110)

def getai_marquee():
    # Physical sign and individual letters follow the same bowed frontage.
    remove_station_parts(['Sign backing','Sign GAY WORLD','Sign SONGS AT THE WORLDS',
                          'Marquee glow','Song stage crown'])
    curve=lambda x:.08+.55*(1-(x/4.1)**2)
    rise=lambda x:4.32+.12*(1-(x/4.1)**2)
    verts=[];faces=[]
    for i in range(49):
        x=-4.1+i*8.2/48
        for depth,height in [(-.18,-.46),(.18,-.46),(.18,.46),(-.18,.46)]:
            verts.append((x,-curve(x)-depth,rise(x)+height))
    for i in range(48):
        for j in range(4):faces.append((i*4+j,(i+1)*4+j,(i+1)*4+(j+1)%4,i*4+(j+1)%4))
    faces.extend([(3,2,1,0),(192,193,194,195)])
    mesh('Bowed getai marquee',verts,faces,'#a32e49')
    for y in [-.39,.39]:
        for i in range(48):
            a=-4.1+i*8.2/48;b=a+8.2/48
            beam('Marquee gold rolled edge',(a,curve(a)+.2,rise(a)+y),(b,curve(b)+.2,rise(b)+y),.036,GOLD)
    for i in range(25):
        x=-3.95+i*7.9/24
        C('Getai warm marquee bulb',x,curve(x)+.16,rise(x)-.57,.065,.12,GOLD,glow=True)
    for i,char in enumerate('GAY WORLD'):
        if char==' ':continue
        x=-2.64+i*.66
        bpy.ops.object.text_add(location=(x,-curve(x)-.215,rise(x)-.24),rotation=(math.pi/2,0,math.atan(1.1*x/4.1**2)))
        o=bpy.context.object;o.name='Getai marquee letter '+char;o.parent=owner
        o.data.body=char;o.data.align_x='CENTER';o.data.size=.73;o.data.extrude=.009
        o.data.materials.append(material('#ffce86',glow=True));bpy.ops.object.convert(target='MESH')
    for x in [-3.9,-2.6,-1.3,0,1.3,2.6,3.9]:
        h=5.25+.9*(1-abs(x)/3.9)
        B('Getai stepped crown pier',x,-.16,(h+4.75)/2,1.17,.38,h-4.75,CREAM,4)
        B('Getai crown red inset',x,.044,(h+4.83)/2,.69,.028,h-4.83,'#b94b4f')
    for x in [-4.62,4.62]:
        B('Getai music plaque',x,.26,4.24,.78,.3,1.12,'#9b345d')
        for dx in [-.17,.17]:
            beam('Neon music stem',(x+dx,.435,4.12),(x+dx,.435,4.54),.025,'#ffb3e4')
            o=C('Neon note head',x+dx-.07,.444,4.1,.10,.025,'#ffb3e4',glow=True);o.rotation_euler.x=math.pi/2
        beam('Neon music crossbar',(x-.17,.435,4.54),(x+.17,.435,4.61),.033,'#ffb3e4')

def getai_step(index):
    top=(.8-index*.2-.46)/.6
    half=4.25+index*.16
    verts=[];faces=[]
    for i in range(33):
        x=-half+i*half/16
        front=2.75+index*.36+.28*math.cos(x/half*math.pi/2)
        for z,y in [(front-.52,top-.24),(front,top-.24),(front,top),(front-.52,top)]:
            verts.append((x,-z,y))
    for i in range(32):
        for j in range(4):faces.append((i*4+j,(i+1)*4+j,(i+1)*4+(j+1)%4,i*4+(j+1)%4))
    faces.extend([(3,2,1,0),(128,129,130,131)])
    mesh('Bowed getai audience stair',verts,faces,'#cd9c8b' if index%2 else '#edc9a0')

lit_base_stage=stage
def stage(title,wayang=False):
    lit_base_stage(title,wayang)
    if ERA=='fair' and not wayang:
        # The original 5 × 3 getai platform remains beneath the larger timber
        # floor, and its speaker stacks are the speakers for this one stage.
        remove_station_parts(['Performance platform','Performance entrance step',
                              'Stage loudspeaker','Speaker cone','Audience bench'])
        B('Integrated getai timber floor',0,-.125,.6,9,5.25,.65,CREAM,3)
        for x in [-5.35,5.35]:
            B('Stage wing footing',x,-1.55,-.18,.55,4,.9,CREAM,4)
        B('Rear stage footing',0,-3.5,-.18,11,.4,.9,CREAM,4)
        for x in [-4.65,4.65]:
            B('Getai singer portrait frame',x,.31,2.25,.99,.07,1.44,GOLD)
            printed_panel('Getai singer portrait',x,.36,2.25,.9,1.35,'song-stage-portrait.png')
        getai_marquee()
        for i in range(3):getai_step(i)
        for x in [-3,0,3]:
            B('Audience bench seat',x,7.5,.15,2.3,.6,.2,CREAM,3)
            for dx in [-.85,.85]:
                B('Audience bench foot',x+dx,7.5,-.12,.14,.5,.5,DARK)
    for x in [-2.8,2.8]:
        # Housings and apertures sit below the proscenium, aimed at the floor.
        beam('Stage lighting barrel',(x,.15,3.48),(x,-.1,3.24),.15,DARK)
        C('Stage lamp lens',x,-.1,3.22,.12,.035,GOLD,glow=True)
        fixture('stage_left' if x<0 else 'stage_right',x,-.1,3.18,28,
                '#ffd398' if wayang or x<0 else '#ffbce8',6,(x*.42,-1,.95),72)
    fixture('stage_footlights',0,.9,1.18,3,'#ffd298',4)

lit_base_badminton=badminton
def badminton():
    lit_base_badminton()
    for x in [-2,0,2]:
        fixture('court_'+str(x),x,-2.5,3.72,23,'#ffe1ad',7,(x,-.5,.3),105)
