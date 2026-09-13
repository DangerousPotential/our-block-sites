"""Native Blender attraction kit. Coordinates are shared with ambient performers.
Executed in build-trip-worlds.py's namespace; all geometry is editable in .blend.
"""
def add_attractions(key, solid, cx, cz, solids_for_details):
    activities=[]
    def activity(kind,x,z,count=4):
        activities.append({'kind':kind,'x':x,'z':z,'count':count})
    def ring(name,x,z,y,r,color):
        for j in range(32):
            a=j*math.tau/32;b=(j+1)*math.tau/32
            beam(name,(x+r*math.cos(a),-z+r*math.sin(a),y),(x+r*math.cos(b),-z+r*math.sin(b),y),.045,color)
    def market(x,z,fish=False):
        for i in range(3):
            px=x+(i-1)*2.5
            B('Tiled wet market counter',px,z,.6,2,1.1,1.1,'#edf0d1')
            B('Terrazzo countertop',px,z,1.18,2.15,1.2,.12,'#a6b7ac')
            for dx in [-.9,.9]:B('Market canopy post',px+dx,z,1.6,.09,.09,3.2,'#6b7366')
            for j in range(8):B('Striped canvas awning',px-.94+j*.27,z,3.15,.27,2.1,.12,'#df644d' if j%2 else '#f2d6a3')
            for a in range(5):
                for b in range(2):
                    if fish:
                        ball('Fresh silver fish',(px-.7+a*.33,-z-.3+b*.5,1.3),(.2,.09,.06),'#9fbec4')
                    else:ball('Chillies limes and aubergines',(px-.7+a*.33,-z-.3+b*.5,1.34),(.14,.14,.13),['#d94736','#7baf48','#734f83'][i])
            cyl('Weighing scale pan',(px+.65,-z,1.58),.22,.05,'#b2c6be')
            B('Scale base',px+.65,z,1.35,.26,.24,.3,'#467c74')
            solid(px,z,2,1.1)
        label('FRESH FISH' if fish else 'PASAR',x,z+.7,2.65,.3)
        activity('market',x,z+1.8,6)
    # Dense planted edges and lived-in details frame, but never block, the board loop.
    for j in range(32):
        a=j*math.tau/32; x=cx+7.4*math.cos(a);z=cz+5.9*math.sin(a)
        if abs(x)>18 or abs(z)>16:continue
        if any(abs(x-s['x'])<s['w']/2+.5 and abs(z-s['z'])<s['d']/2+.5 for s in solids_for_details):continue
        for k in range(2):
            ball('Hibiscus hedge',(x+k*.22,-z,.35),(.45,.38,.4),'#3d8059')
            if j%2==0:ball('Hibiscus flower',(x+k*.22,-z-.25,.6),(.08,.08,.1),'#e98177')
        if j%5==0:tree(x,-z,key=='river')
    if key in ['fair','garden']:
        for z in [cz-3,cz+3]:
            beam('Festoon lighting cable',(cx-5,-z,3.5),(cx+5,-z,3.5),.016,'#465f5b')
            for j in range(15):ball('Warm festoon light',(cx-4.8+j*.68,-z,3.5),(.07,.07,.09),'#ffe1a1')
    # A small social game occupies the open heart, not another empty plaza.
    activity('play',cx,cz,5)
    ball('anim_play_ball',(cx,-cz,.5),(.17,.17,.17),'#e6b34c')
    for j in range(6):
        B('Hopscotch chalk',cx-1.3+(j%2)*.65,cz-1.5+(j//2)*.65,.16,.55,.55,.012,'#e8e1ba')
    if key=='river':
        market(13,14,True)
        # Working riverbank jetty, drying nets and baskets.
        for j in range(13):B('Jetty plank',-5.7,1+j*.32,.42,3,.28,.16,'#957047')
        for z in [1,4.8]:
            for x in [-7,-4.5]:B('Jetty pile',x,z,.2,.2,.2,1.8,'#69503d')
        for j in range(9):
            beam('Fishing net warp',(-7+j*.28,-1.5,.65),(-7+j*.28,-4,1.65),.014,'#cdbb87')
            beam('Fishing net weft',(-7,-1.5-j*.28,.65+j*.11),(-4.76,-1.5-j*.28,.65+j*.11),.014,'#cdbb87')
        for z in [2,3.5]:cyl('Woven catch basket',(-4.4,-z,.65),.32,.45,'#b79257')
        activity('fish',-5,3,3)
        # Pedalled trishaw (hand-pulled rickshaws were abolished in 1947).
        root=empty('anim_trishaw',0,-4);root.location=(0,0,0)
        before=set(bpy.context.scene.objects)
        B('Trishaw passenger seat',0,0,.8,1.1,1.1,.18,'#a94436')
        B('Trishaw seat back',0,-.5,1.15,1.1,.15,.8,'#a94436')
        B('Trishaw canvas shade',0,0,2,1.4,1.4,.12,'#e8cc80')
        for x in [-.6,.6]:B('Trishaw roof strut',x,-.5,1.4,.055,.055,1.1,'#635445')
        for x,z in [(-.65,0),(.65,0),(0,1.5)]:
            wheel=cyl('Trishaw spoked wheel',(x,-z,.42),.42,.08,'#283d40',20);wheel.rotation_euler.y=math.pi/2
        beam('Cycle frame',(0,-.6,.7),(0,-1.5,.7),.045,'#4c8a79')
        for o in set(bpy.context.scene.objects)-before:o.parent=root
        activity('trishaw',4,-4,2)
    elif key=='fair':
        # A rotating carousel with individual horses and riders.
        x,z=-1,-9
        cyl('Carousel platform',(x,-z,.35),2.1,.5,'#bc6359',32)
        cyl('Carousel crown',(x,-z,3.5),2.4,.22,'#e6b853',32)
        roof(x,-z,3.8,4.7,4.7,'#b94961')
        B('Carousel mast',x,z,1.8,.3,.3,3.2,'#e6ba69')
        solid(x,z,4.5,4.5)
        for j in range(6):
            a=j*math.tau/6;px=x+1.5*math.cos(a);pz=z+1.5*math.sin(a)
            beam('Carousel brass pole',(px,-pz,.5),(px,-pz,3.4),.045,'#efd288')
            horse=empty('anim_horse_'+str(j),0,0);horse.location=(px,-pz,1.2)
            ball('Carousel horse body',(0,0,0),(.48,.2,.26),'#f0d9ab').parent=horse
            ball('Horse head',(.3,0,.35),(.15,.17,.3),'#f0d9ab').parent=horse
            for dx in [-.3,.3]:beam('Horse legs',(dx,0,0),(dx-.1,0,-.45),.07,'#f0d9ab').parent=horse
        activity('carousel',x,z,6)
        # Open-air getai stage and audience, distinct from the theatre building.
        B('Getai stage',-14,10,.55,5,3,.9,'#793e66');solid(-14,10,5,3)
        B('Stage curtain',-14,8.5,2.1,5,.15,3,'#a4355c')
        for x in [-16,-12]:B('Speaker stack',x,10,1.25,.65,.65,1.5,'#29394c')
        label('LIVE TONIGHT',-14,8.7,3.3,.32)
        activity('stage',-14,12.4,5)
        activity('coaster',12,2,4)
    elif key=='estate':
        market(0,-7)
        activity('tv',10,-1.7,5)
        activity('slide',10,6,4)
        # Clothes lines and void-deck everyday detail.
        for x in [-16,-10]:
            for z in [-6,-3]:B('Laundry pole',x,z,1.3,.07,.07,2.6,'#797d69')
            beam('Bamboo laundry line',(x,6,2.5),(x,3,2.5),.03,'#a99564')
            for j in range(5):B('Drying batik cloth',x,-5.7+j*.5,2,.04,.4,.8,['#cd715d','#4e929a','#e1b852'][j%3])
    elif key=='town':
        activity('commute',-1,-9.5,6)
        activity('arcade',3,8,4)
        for x in [1,2.2,3.4,4.6]:
            B('Arcade cabinet',x,6.7,.85,.85,.8,1.7,'#715491')
            B('Arcade glowing screen',x,7.12,1.15,.65,.025,.65,'#72d2ca')
            B('Arcade control deck',x,7.3,.75,.8,.4,.12,'#df7f68')
            ball('Joystick',(x,-7.4,.9),(.05,.05,.1),'#e9c764')
            solid(x,6.7,.85,.8)
        for x in [-3,0,3]:
            B('Station fare gate',x,-10.7,.65,.45,1.2,1.3,'#a5b4ad')
            B('Card reader',x,-10.5,1.33,.32,.35,.05,'#60b5a3')
    else:
        # Recognisable 2010+ skyline, deliberately not used in the 2005 world.
        for x in [-10,-5,0]:
            B('Marina Bay Sands tower',x,-17,6.5,2.3,3,13,'#abc8cc')
            for floor in range(22):
                B('Hotel balcony ribbon',x,-15.46,.6+floor*.56,2.4,.1,.09,'#e3dfb9')
            for dx in [-.7,0,.7]:B('Hotel vertical glazing',x+dx,-15.39,6.5,.26,.02,12,'#477e91')
        B('SkyPark boat deck',-5,-17,13.3,15.5,3.6,.65,'#d8cba9')
        for x in [-12.7,2.7]:ball('SkyPark curved bow',(x,17,13.3),(1.5,1.8,.33),'#d8cba9')
        B('SkyPark infinity pool',-5,-16.5,13.65,10,1,.08,'#55c5d0')
        for x in [-10,-7,-4,-1]:ball('SkyPark rooftop trees',(x,17.5,14),(.5,.5,.65),'#599063')
        solid(-5,-17,18,4)
        for x,z,h in [(10,-5,6),(15,0,5),(14,-7,7)]:
            cyl('Supertree trunk',(x,-z,h/2),.3,h,'#935776')
            for j in range(12):
                a=j*math.tau/12
                beam('Supertree branching ribs',(x,-z,h*.35),(x+2*math.cos(a),-z+2*math.sin(a),h),.055,'#c777a8')
            ring('Luminous Supertree crown',x,z,h,2,'#eabd73')
            ring('Supertree inner crown',x,z,h-.5,1.35,'#9bc7b9')
            solid(x,z,.8,.8)
        # Glass conservatory ribs instead of an opaque placeholder dome.
        for z,r in [(-9,2.4),(-14,2.8)]:
            for j in range(9):
                x=15+(j-4)*.48
                for k in range(12):
                    a=k*math.pi/12;b=(k+1)*math.pi/12
                    beam('Conservatory glass rib',(x,-z+r*math.cos(a),.3+r*math.sin(a)),(x,-z+r*math.cos(b),.3+r*math.sin(b)),.04,'#a6d8d2')
            solid(15,z,4.5,r*2)
        activity('garden',-9,3,4)
        activity('show',5,10,6)
    for i,a in enumerate(activities):
        x,z=a['x'],a['z']
        if a['kind']=='market':
            basket=cyl('anim_basket_'+str(i),(x,-z,1),.26,.3,'#b88b53')
        if a['kind']=='fish':
            for j in range(3):
                beam('Bamboo fishing rod',(x,-z-j*.65,.9),(x-2.5,-z-j*.65,1.8),.028,'#c7a66c')
                beam('Fishing line',(x-2.5,-z-j*.65,1.8),(x-2.5,-z-j*.65,.18),.009,'#e5d9b2')
        if a['kind']=='garden':
            cyl('anim_watering_can',(x,-z,1),.18,.28,'#d9b65c')
    return activities
