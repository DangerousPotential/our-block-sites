"""Period-informed surroundings; spatial collage, not a surveyed street plan.
References and limits: art/pastimes1950s/research/surroundings.md.
"""
def road_lamp(x,z):
    # Prinsep Street photo labelled 1955, Michael King credit, reproduced by
    # Remember Singapore: pale shaft, braced curved arm, suspended globe.
    concrete='#c1c0ad'
    C('Pale street lamp plinth',x,z,.4,.14,.65,concrete,12)
    C('Pale street lamp standard',x,z,2.05,.09,3.5,concrete,12)
    curve('Curved concrete lamp arm',[(x,z,3.68),(x,z,4.0),(x+.12,z,4.19),(x+.34,z,4.3),(x+.65,z,4.31)],.065,concrete)
    curve('Lamp arm supporting brace',[(x,z,3.87),(x+.23,z,4.12),(x+.65,z,4.23)],.035,concrete)
    C('Pendant lamp socket',x+.65,z,4.22,.06,.18,DARK,12)
    ball('Hanging street lamp globe',(x+.65,-z,4.08),(.12,.12,.18),'#dbe9d8')
    C('Globe upper collar',x+.65,z,4.24,.105,.045,concrete,12)
    bpy.ops.object.light_add(type='POINT',location=(x+.65,-z,3.95))
    o=bpy.context.object;o.name='Soft white street lamp';o.data.energy=30;o.data.color=(.78,.88,1);o.data.shadow_soft_size=.7

def slat_bench(x,z):
    for j in range(4):B('Bench individual timber seat slat',x,z-.22+j*.145,.57,1.65,.115,.08,WOOD)
    for j in range(3):B('Bench individual timber back slat',x,z-.27,.83+j*.16,1.65,.07,.115,WOOD)
    for dx in [-.62,.62]:
        rod('Bench iron support',(x+dx,z-.2,.14),(x+dx,z-.25,1.2),.045,DARK)
        rod('Bench iron front leg',(x+dx,z+.2,.14),(x+dx,z+.18,.63),.05,DARK)
        rod('Bench curved arm',(x+dx,z-.22,.98),(x+dx,z+.26,.85),.04,DARK)

def clothed_resident(x,z,kind=0):
    skin=['#bb825d','#976848','#d2a27a'][kind%3];cloth=['#ddd3b3','#79888a','#ad7969','#8b9d7c'][kind%4]
    # Distinct everyday silhouettes: collared shirts/trousers, blouse/skirt,
    # patterned sarong and blouse, and school-age shorts. No universal straw hats.
    person(x,z,.14,cloth,.9)
    if kind%4 in [1,2]:
        C('Calf length skirt or sarong',x,z,.47,.215,.52,['#6e716c','#7c5860'][kind%2],12)
        for j in range(5):
            B('Woven skirt horizontal motif',x,z+.21,.27+j*.085,.36,.012,.018,'#cfb28e')
        ball('Tied hair bun',(x,-z+.14,1.22),(.12,.1,.12),DARK)
    else:
        for dx in [-.08,.08]:
            rod('Open shirt collar',(x+dx,z+.17,.99),(x,z+.19,.89),.025,CREAM)
        B('Shirt button placket',x,z+.173,.79,.014,.016,.25,CREAM)
        B('High trouser waistband',x,z+.15,.58,.29,.04,.045,DARK)
    for dx in [-.08,.08]:ball('Flat shoes',(x+dx,-z-.05,.18),(.07,.14,.055),DARK)

def saloon(x,z,color):
    # Unbranded rounded postwar saloon; no unsupported make/model attribution.
    ball('Rounded saloon lower body',(x,-z,.65),(1.65,.67,.4),color)
    B('Saloon sill',x,z,.51,2.9,1.2,.23,color)
    ball('Rounded saloon roof',(x-.1,-z,1.1),(.85,.59,.44),color)
    for side in [-1,1]:
        for dx in [-.47,.27]:
            B('Saloon side window',x+dx,z+side*.562,1.15,.57,.025,.38,'#50676a')
        B('Window centre pillar',x-.1,z+side*.585,1.15,.055,.04,.44,color)
        B('Chrome door handle',x+.17,z+side*.62,.87,.17,.025,.025,'#bcb9a8')
        for dx in [-1.05,1.05]:
            o=C('Saloon tyre',x+dx,z+side*.65,.43,.34,.16,DARK,20);o.rotation_euler.x=math.pi/2
            o=C('Saloon chrome hubcap',x+dx,z+side*.75,.43,.17,.025,'#bcb9a8',16);o.rotation_euler.x=math.pi/2
    for dx in [-1.58,1.58]:B('Saloon chrome bumper',x+dx,z,.47,.1,1.25,.1,'#bcb9a8')
    for dz in [-.4,.4]:ball('Saloon round headlamp',(x+1.55,-z-dz,.76),(.07,.12,.12),'#ffe1a1')
    for dz in [-.25,-.12,0,.12,.25]:B('Saloon radiator grille',x+1.64,z+dz,.65,.025,.04,.28,'#bcb9a8')
    solids.append(dict(x=x,z=z,w=3.4,d=1.5,padding=.12))

def trishaw(x,z):
    bicycle(x-.45,z)
    B('Trishaw passenger footboard',x+.65,z,.35,.85,1.1,.12,WOOD)
    B('Trishaw upholstered passenger seat',x+.65,z-.18,.75,.8,.55,.18,'#824e3d')
    B('Trishaw seat back',x+.65,z-.42,1,.8,.12,.55,'#824e3d')
    for dx in [.2,1.1]:
        rod('Trishaw hood support',(x+dx,z-.42,.7),(x+dx,z-.5,1.9),.035,DARK)
    B('Trishaw fabric hood',x+.65,z-.05,1.91,1.05,1.1,.09,'#af9c75')
    for zz in [-.45,.45]:
        arc('Trishaw passenger wheel',x+1.15,z+zz,.15,.62,.62,.035,DARK)
    clothed_resident(x-.45,z,0)
    solids.append(dict(x=x+.3,z=z,w=2,d=1.5,padding=.1))

def street_environment():
    B('Concrete footpath base',0,0,.02,42,35,.12,'#aa9f87')
    # Road through the urban frontage, with a lane down the eastern edge.
    B('Worn asphalt cinema street',0,-3.55,.11,41,3.4,.05,'#555950')
    B('Worn asphalt side street',18.65,5,.112,3.1,19.9,.05,'#555950')
    for z in [-5.38,-1.72]:
        for j in range(51):B('Concrete roadside kerbstone',-20+j*.8,z,.18,.77,.16,.2,'#b9af97')
        B('Open roadside drain channel',0,z+.2,.115,40,.19,.045,'#514b40')
        for x in [-12,0,12]:B('Footbridge over roadside drain',x,z+.2,.17,1.7,.5,.1,'#b4aa94')
    for j in range(23):B('Eastern roadside kerb',16.95,-3.8+j*.85,.18,.16,.81,.2,'#b9af97')
    # Shallow seams in concrete walks, unlike the previous decorative purple grid.
    for j in range(23):
        x=-20+j*1.7
        B('Concrete walk expansion joint',x,-.75,.105,.015,1.35,.005,'#807862')
        B('Concrete promenade expansion joint',x,15.5,.105,.015,2.1,.005,'#807862')
    # Sand/gravel park margins and irregular grass patches contain bare space.
    for x,z,w,d in [(-12,1.6,12,3.4),(12,11.6,7.7,5.8),(-18.7,-10,3.2,10),(18.3,-12,3.5,7)]:
        B('Park earth border',x,z,.115,w,d,.045,'#8d8060')
        B('Park grass inset',x,z,.14,w-.3,d-.3,.035,'#64754b')
        for j in range(45):
            xx=x+rng.uniform(-w*.46,w*.46);zz=z+rng.uniform(-d*.46,d*.46)
            rod('Grass tuft',(xx,zz,.16),(xx+.03,zz,.22),.015,'#879064')
    # Graveled approaches framing the garden rather than a showroom apron.
    for xx in [7.3,16.1]:B('Garden gravel path',xx,5,.15,.9,9.3,.05,'#b9aa86')
    for j in range(18):
        xx=8.7+j*.41
        ball('Garden border shrub',(xx,-10,.35),(.27,.31,.24),'#566d43')
    # Utility wires are urban street context, separate from amusement festoons.
    for xx in [-19.2,5.6,19.4]:
        C('Timber utility pole',xx,-6,2.8,.085,5.5,'#6e5b45',10)
        B('Utility cross arm',xx,-6,5.35,1.2,.09,.09,DARK)
        for dx in [-.45,.45]:C('Porcelain wire insulator',xx+dx,-6,5.48,.065,.13,CREAM,10)
    for a,b in [(-19.2,5.6),(5.6,19.4)]:
        for dx in [-.45,.45]:curve('Sagging overhead service wire',[(a+dx,-6,5.5),((a+b)/2+dx,-6,5),(b+dx,-6,5.5)],.011,DARK)
    for x,z in [(-18,-4),(-6,-4),(7,-4),(18,-4),(-6,7),(6,7),(18,11),(-18,-15)]:road_lamp(x,z)
    for x,z in [(-17,2.3),(-10,2.3),(11,13),(14,13)]:slat_bench(x,z)
    saloon(-9,-3.55,'#343f3f');saloon(10,-3.55,'#936b51')
    trishaw(-17.7,-.8)
    for j,(x,z) in enumerate([(-14,-.8),(-12,-.8),(-7,-.8),(5,-.8),(13,-.8),(15,-.8),(-16,3.5),(-10,3.5),(9,12),(14,12),(5,13),(-5,10)]):clothed_resident(x,z,j)
    # Simple metal swing and seesaw documented at Katong, not later mosaic playgrounds.
    for xx in [-15.8,-13.8]:
        for zz in [.2,1.6]:rod('Park swing A-frame',(xx,zz,.2),(xx,.9,2.2),.045,DARK)
    rod('Park swing top bar',(-15.8,.9,2.2),(-13.8,.9,2.2),.05,DARK)
    for xx in [-15.35,-14.25]:
        for dx in [-.2,.2]:rod('Swing chain',(xx+dx,.9,2.2),(xx+dx,1,.65),.015,DARK)
        B('Timber swing seat',xx,1,.65,.5,.25,.06,WOOD)
    B('Seesaw timber beam',-10,.9,.52,2.2,.25,.09,WOOD)
    C('Seesaw central pivot',-10,.9,.35,.15,.45,DARK,10)
    solids.append(dict(x=-14.8,z=.9,w=2.3,d=1.8,padding=.1))
    solids.append(dict(x=-10,z=.9,w=2.4,d=.6,padding=.1))

def evening_hawker_cart(x,z):
    # NHB 'Singapore's Hawker Culture', c.1950 photograph XXXX-15575:
    # cooking beneath hanging kerosene pressure lamps. This is a type study.
    for dx in [-.7,.7]:
        o=C('Hawker cart iron wheel',x+dx,z,.43,.3,.1,DARK,20);o.rotation_euler.x=math.pi/2
    B('Hawker cart timber body',x,z,.85,1.8,.85,.8,WOOD)
    B('Hawker cart metal worktop',x,z,1.28,1.95,.95,.07,'#afa994')
    for j in range(8):B('Cart timber panel joint',x-.8+j*.23,z+.435,.85,.02,.012,.65,'#5c4433')
    for dx in [-.85,.85]:rod('Hawker lamp hanging frame',(x+dx,z,1.25),(x+dx,z,2.45),.035,WOOD)
    rod('Hawker lamp crossbar',(x-.95,z,2.45),(x+.95,z,2.45),.04,WOOD)
    for dx in [-.65,.65]:
        rod('Pressure lamp suspension',(x+dx,z,2.45),(x+dx,z,2.28),.014,DARK)
        C('Pressure lamp fuel tank',x+dx,z,1.89,.11,.13,'#a7976f',16)
        C('Pressure lamp luminous mantle',x+dx,z,2.08,.065,.23,'#ffe1a1',12)
        C('Pressure lamp ventilator hood',x+dx,z,2.25,.14,.07,'#6e7967',16)
        for side in [-1,1]:rod('Pressure lamp guard',(x+dx+side*.09,z,1.95),(x+dx+side*.09,z,2.23),.01,DARK)
    C('Hawker cooking pot',x-.42,z,1.46,.22,.3,'#a9a393',16)
    C('Cooking pot lid',x-.42,z,1.63,.23,.03,'#c3bca6',16)
    bead('Cooking pot lid handle',x-.42,z,1.69,.055,DARK)
    for j in range(3):
        C('Stacked ceramic bowl',x+.35,z+.1,1.35+j*.065,.13,.075,CREAM,16)
    C('Utensil cylinder',x+.68,z-.18,1.45,.085,.26,'#9b8162',12)
    for j in range(5):rod('Bamboo utensil',(x+.65+j*.018,z-.18,1.45),(x+.65+j*.018,z-.18,1.78),.008,WOOD)
    guest(x,z-.65,.15,.85,color=CREAM)
    glow(x,z,2.0,35)
    solids.append(dict(x=x,z=z,w=2.1,d=1.4,padding=.15))
