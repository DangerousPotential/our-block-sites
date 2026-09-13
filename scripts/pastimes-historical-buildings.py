"""Reference-led landmark forms. See historical-reconstruction.md for evidence and limits."""
def cathay_1950s(x,z):
    plaster='#c7bca6';band='#b5ad9b';glass='#3b5554';marble='#263435'
    # NHB 2000-03733-271: broad high-rise slab behind a lower curved cinema frontage.
    B('Cathay high-rise main mass',x,z-1.6,7.5,6.9,2.9,10.8,plaster)
    for row in range(10):
        yy=2.5+row*.98
        box('Horizontal wraparound balcony',(x,-z+1.6,yy),(7.45,3.25,.13),band,.08)
        for col in range(9):
            xx=x-2.95+col*.735
            B('Tower recessed window',xx,z-.105,yy+.43,.42,.025,.43,glass)
            B('Window centre mullion',xx,z-.084,yy+.43,.027,.025,.43,plaster)
        for side in [-1,1]:
            for j in range(3):B('Tower side window',x+side*3.46,z-2.7+j*.85,yy+.43,.025,.43,.43,glass)
        # Balcony fronts flank the recessed central window bay visible in the photograph.
        for dx in [-2.05,2.05]:B('Balcony parapet',x+dx,z+.1,yy+.21,2.65,.12,.33,plaster)
    box('Tower upper cornice',(x,-z+1.6,12.75),(7.5,3.3,.24),band,.08)
    B('Central roof service tower',x,z-1.65,13.65,2.35,1.8,1.7,plaster)
    for xx in [-2.8,2.8]:rod('Rooftop flagpole',(x+xx,z-.5,12.8),(x+xx,z-.5,14.2),.025,DARK)
    # Three-storey curved lower wings, rather than a generic small cinema box.
    for side in [-1,1]:
        xx=x+side*2.45
        box('Curved cinema wing',(xx,-z-1.8,2.8),(2.85,2.7,4.6),plaster,.3)
        for yy in [1.8,3.05,4.3]:
            box('Curved frontage horizontal band',(xx,-z-1.8,yy),(3.03,2.82,.14),band,.2)
            for j in range(4):B('Cinema ribbon window',xx-.9+j*.6,z+3.165,yy+.35,.38,.03,.5,glass)
    # Central vertical sign is embedded in the front, sized below the rear tower.
    B('Cathay central vertical frontage',x,z+2.75,3.65,1.8,.42,6.8,plaster)
    for dx in [-.92,-.66,.66,.92]:B('Front vertical fluting',x+dx,z+3.01,3.8,.09,.14,6.1,band)
    B('Vertical sign dark backing',x,z+3.03,4.8,.68,.055,4.3,glass)
    for j,ch in enumerate('CATHAY'):S(ch,x,z+3.09,6.55-j*.65,.49,'#ffe1a1')
    # Evidence-backed interior palette: green floor, dark marble pillars, gold ceiling.
    B('Green-tiled cinema entrance',x,z+3.3,.29,6.7,1.1,.07,'#45685a')
    B('Gold entrance soffit',x,z+3.3,1.78,6.7,1.2,.09,'#a88c4d')
    for xx in [-2.7,-1.8,1.8,2.7]:
        B('Black marble entrance pillar',x+xx,z+3.45,.95,.19,.23,1.5,marble)
        sconce(x+xx,z+3.55,1.45)
    B('Entrance canopy fascia',x,z+3.87,1.78,6.9,.14,.32,plaster)
    S('PONTIANAK  1957',x,z+3.95,1.69,.24,DARK)
    imagepanel('Pontianak original poster',ART/'textures/pontianak-poster.png',x-2.1,z+3.26,1.05,.66,1.12)
    B('Recessed ticket window',x+.95,z+3.03,1.01,.72,.09,.72,WOOD)
    S('TICKETS',x+.95,z+3.1,1.32,.13,CREAM)
    for j in range(11):
        guest(x-2.6+j*.48,z+3.73,.25,.75)
    for j in range(21):bead('Canopy incandescent bulb',x-3+j*.3,z+3.8,1.57,.038)
    # Low neighbouring frontage gives the high-rise an urban scale reference.
    for xx in [x-4.2,x+4.2]:
        B('Low neighbouring stucco wall',xx,z+1.3,1.25,.5,2,2.1,band)
    glow(x,z+3.6,2.4,170)

def katong_1950s():
    # NAS 36621: long low changing block facing a broad seaside promenade.
    # Two rows of twenty dressing bays encode the documented forty rooms.
    B('Katong changing block',-13,5.95,.93,8.6,1.8,1.42,'#d3cfb8')
    B('Continuous shallow changing-block roof',-13,5.95,1.73,8.95,2.1,.18,'#7d8074')
    for row in [-1,1]:
        for j in range(20):
            xx=-17.05+j*.426;zz=5.95+row*.91
            B('Dressing-room door',xx,zz,.91,.31,.04,1.14,'#78867c')
            B('Changing block pier',xx-.2,zz,1.05,.055,.12,1.4,CREAM)
            for yy in [1.35,1.43,1.51]:B('Dressing-room ventilation',xx,zz+row*.025,yy,.27,.02,.025,DARK)
    B('Seafront promenade',-13.25,7.2,.24,9.5,.9,.18,'#b6af94')
    for j in range(7):
        xx=-17+j*1.2
        C('Promenade concrete seat pedestal',xx,7.1,.52,.15,.44,'#d3cfb8',8)
        B('Promenade concrete seat',xx,7.1,.78,.64,.28,.1,'#d3cfb8')
    # A small park identification plate replaces the invented illuminated attraction sign.
    B('Katong park identification',-17.15,5.0,1.1,.9,.1,.48,'#e0d5ba')
    S('KATONG PARK',-17.15,5.06,1.03,.12,DARK)
    B('Promenade eastern access path',-8.35,6.4,.24,.8,2.5,.18,'#b6af94')
    # About 45 by 30 metres; scale-compressed 3:2 enclosure in continuous seawater.
    for xx in [-16.5,-9.5]:
        B('Pagar side walkway',xx,9.6,.29,.8,4.2,.16,'#a19c84')
        for j in range(24):rod('Pagar timber pile',(xx,7.5+j*.2,-.1),(xx,7.5+j*.2,.4),.025,WOOD)
    B('Pagar seaward walkway',-13,12.1,.29,7.8,.8,.16,'#a19c84')
    for j in range(37):rod('Seaward pagar pile',(-16.5+j*.194,12.1,-.1),(-16.5+j*.194,12.1,.5),.025,WOOD)
    for xx in [-16.5,-9.5]:
        for j in range(10):rod('Pier rail upright',(xx,7.5+j*.51,.35),(xx,7.5+j*.51,.92),.025,CREAM)
        rod('Pier handrail',(xx,7.5,.92),(xx,12.1,.92),.025,CREAM)
    for j in range(15):rod('Promenade rail',(-17.6+j*.65,7.5,.32),(-17.6+j*.65,7.5,.92),.025,CREAM)
    rod('Promenade long handrail',(-17.6,7.5,.92),(-8.5,7.5,.92),.025,CREAM)
    for xx,zz in [(-15.5,9),(-13,10.4),(-11.2,9.2),(-14.7,11.4),(-12.2,8.5)]:
        bead('Bather head',xx,zz,.45,.17,'#b67b52')
        rod('Bather arms',(xx-.32,zz,.23),(xx+.32,zz,.23),.055,'#b67b52')
        curve('Bather ripple',[(xx+.35*math.cos(a),zz+.22*math.sin(a),.18) for a in [j*math.tau/20 for j in range(21)]],.014,'#95b6b9')
    for xx in [-16.4,-14.8,-12.3,-10.3]:guest(xx,7.05,.3,.7)
    for xx in [-15,-11]:
        for dx in [-.18,.18]:rod('Bathing ladder rail',(xx+dx,7.45,.6),(xx+dx,8,-.1),.025,CREAM)
        for zz in [7.6,7.75,7.9]:rod('Bathing ladder rung',(xx-.18,zz,.15),(xx+.18,zz,.15),.021,CREAM)
    glow(-13,6.7,2.6,65)

def rediffusion_shophouse():
    # Ordinary shophouse coffeeshop typology, not a fictional Rediffusion venue.
    # Upper floor/roof cut away towards the camera to expose the listening room.
    plaster='#c8c4ac';shutter='#55786b'
    B('Shophouse rear wall',0,9.1,2.8,6,.18,5.2,plaster)
    for side in [-1,1]:
        B('Shophouse party wall',side*2.95,11,2.8,.16,4,5.2,plaster)
        B('Five-foot-way column',side*2.75,13.25,1.7,.25,.25,3,plaster)
    B('Upper storey cutaway floor',0,9.6,3.12,5.8,1.0,.18,WOOD)
    B('Sheltered walkway lintel',0,13.25,3.1,5.9,.32,.22,plaster)
    for xx in [-1.9,0,1.9]:
        B('Upper window recess',xx,9.22,4.25,1.24,.05,1.5,DARK)
        for side in [-1,1]:
            B('Timber panelled shutter',xx+side*.33,9.28,4.25,.57,.075,1.42,shutter)
            for yy in [3.77,4.1,4.43,4.76]:B('Shutter horizontal louvre',xx+side*.33,9.33,yy,.49,.04,.035,CREAM)
        B('Upper window sill',xx,9.35,3.48,1.4,.25,.1,plaster)
    roof_tiles(0,9.5,5.7,6.35,1.15,'#92593e')
    for j in range(15):
        for k in range(10):B('Coffeeshop floor tile',-2.8+j*.4,9.4+k*.4,.3,.38,.38,.035,[CREAM,'#87795d'][(j+k)%2])
    B('Five-foot-way pavement',0,13.3,.24,6.3,.95,.12,'#ac9c7d')
    B('Coffee preparation counter',-2.1,10,.85,1.25,1.6,1.1,WOOD)
    B('Marble counter top',-2.1,10,1.44,1.35,1.7,.1,CREAM)
    for zz in [9.5,9.85,10.2]:
        C('Enamel coffee pot',-2.1,zz,1.65,.12,.35,'#a5b3a5',12)
        arc('Coffee pot handle',-2.1,zz,1.8,.16,.14,.018,DARK)
    S('KOPI  ·  TEH',-2.1,10.89,1.07,.14,CREAM)
    # The set and visible wiring are the historical identifying object.
    B('Rediffusion wired speaker',.1,9.34,2.24,1.2,.28,.85,WOOD)
    for j in range(9):B('Wired speaker grille',-.39+j*.12,9.49,2.25,.035,.035,.61,DARK)
    B('Speaker badge',.1,9.52,1.92,.68,.025,.14,GOLD)
    S('REDIFFUSION',.1,9.55,1.89,.08,DARK)
    curve('Rediffusion service cable',[(.7,9.4,2.4),(1.4,9.4,2.4),(1.4,9.4,3.0),(2.9,9.4,3.0)],.019,DARK)
    for xx,zz in [(-.7,11.1),(1.65,11.7)]:
        table(xx,zz)
        for dx,dz in [(-.7,0),(.7,0),(0,.7)]:
            woven_chair(xx+dx,zz+dz)
            guest(xx+dx,zz+dz,.18,.78)
    B('Wall calendar',1.9,9.23,2.15,.54,.04,.7,CREAM)
    S('1957',1.9,9.26,2.28,.14,RED)
    for row in range(4):
        for col in range(7):B('Calendar date mark',1.69+col*.067,9.27,2.15-row*.08,.018,.012,.025,DARK)
    # Modest pendant bulbs, rather than decorative amusement-park lantern strings.
    for xx in [-1.1,1.4]:
        rod('Pendant flex',(xx,10.8,3.08),(xx,10.8,2.77),.012,DARK)
        C('Enamel pendant shade',xx,10.8,2.73,.19,.07,CREAM,16)
        bead('Warm domestic bulb',xx,10.8,2.65,.08,'#ffe1a1')
    glow(0,11.1,2.7,145)

def bunga_tanjong_1950s():
    # NHB 1998-00219 (c.1950s): large arched bandstand, piano, suited band,
    # women seated in a row, timber dance floor and overhead globe lights.
    for j in range(28):B('Dance hall floorboard',-3.35+j*.25,0,.32,.23,5,.045,['#987247','#a78051','#8c683f'][j%3])
    B('Dance hall rear wall',0,-2.5,2.7,7.1,.18,5,CREAM)
    B('Raised orchestra platform',0,-1.6,.65,6.6,1.7,.6,WOOD)
    B('Bandstand painted backdrop',0,-2.37,2.35,6.4,.025,3.3,'#789394')
    for j in range(4):curve('Backdrop cloud motif',[(-2.8+j*.5,-2.32,2+j*.5),(-1+j*.4,-2.32,2.2+j*.5),(1+j*.3,-2.32,2+j*.5)],.06,'#bac7b6')
    for side in [-1,1]:
        B('Arched stage side pier',side*3.2,-1.6,1.65,.32,.32,2.8,CREAM)
        B('Hall side cutaway wall',side*3.45,0,1.25,.14,5,1.9,CREAM)
    arc('Broad proscenium arch',0,-1.6,1.7,6.4,3.3,.24,CREAM)
    arc('Stage arch inner trim',0,-1.43,1.72,5.95,3.05,.06,GOLD)
    for j in range(29):
        a=j*math.pi/28
        bead('Arch painted ornament',3.15*math.cos(a),-1.34,1.72+3.24*math.sin(a),.042,'#576849')
    for xx,word in [(-2.15,'FOXTROT'),(2.15,'BLUES')]:
        B('Dance rhythm board',xx,-1.3,4.45,1.05,.07,.35,CREAM);S(word,xx,-1.25,4.38,.16,DARK)
    # A small documented venue label on the bandstand, rather than an invented pavilion fascia.
    S('BUNGA TANJONG',0,-1.32,5.0,.28,DARK)
    # Grand piano and keyboard at the right of the orchestra platform.
    box('Grand piano body',(2.2,1.8,1.6),(1.2,1,.3),DARK,.22)
    B('Piano lid',2.2,-1.95,2.05,1.15,.09,.8,DARK)
    for j in range(15):B('Piano ivory key',1.66+j*.075,-1.24,1.64,.067,.24,.035,CREAM)
    for xx in [1.8,2.6]:rod('Piano leg',(xx,-1.7,.9),(xx,-1.7,1.48),.055,DARK)
    # Drum kit and double bass make this a bandstand, not an opera scene.
    o=C('Bass drum',0,-1.8,1.45,.45,.4,CREAM,24);o.rotation_euler.x=math.pi/2
    for xx in [-.6,.6]:
        C('Cymbal',xx,-1.7,1.9,.27,.025,GOLD,20);rod('Cymbal stand',(xx,-1.7,.95),(xx,-1.7,1.9),.019,DARK)
    ball('Double bass lower body',(-1.7,2.0,1.5),(.28,.12,.4),WOOD)
    ball('Double bass upper body',(-1.7,2.0,1.9),(.2,.11,.28),WOOD)
    rod('Double bass neck',(-1.7,-2,1.85),(-1.7,-2,2.8),.045,DARK)
    for dx in [-.035,0,.035]:rod('Double bass string',(-1.7+dx,-1.86,1.25),(-1.7+dx,-1.86,2.75),.004,GOLD)
    for xx in [-2.6,-1.65,-.8,.5,1.3,2.3]:
        guest(xx,-1.75,.86,.8,color=CREAM)
        B('Band bow tie',xx,-1.58,1.58,.12,.025,.055,DARK)
    for xx in [-2.6,-.8]:
        curve('Saxophone brass body',[(xx,-1.45,1.85),(xx-.1,-1.44,1.35),(xx+.15,-1.44,1.27),(xx+.25,-1.44,1.47)],.045,GOLD)
        C('Saxophone bell',xx+.25,-1.44,1.5,.09,.1,GOLD,12)
    # Waiting dance hostesses along the sides, opening the centre for partnered joget.
    for side in [-1,1]:
        for j in range(4):
            xx=side*2.8;zz=-.5+j*.7
            woven_chair(xx,zz);guest(xx,zz,.27,.75,color=CREAM)
            C('Hostess batik skirt',xx,zz,.57,.19,.47,['#aa775d','#8e7184','#697a5e'][j%3],12)
    for xx,zz,col in [(-.8,.5,'#c2838e'),(.25,.5,CREAM),(-.2,1.65,'#719282'),(.9,1.65,CREAM)]:guest(xx,zz,.33,.95,'dance',col)
    for xx in [-2.4,0,2.4]:
        curve('Pendant globe wire',[(xx,-.5,4.8),(xx,-.5,3.65)],.012,DARK)
        bead('Dance hall globe light',xx,-.5,3.55,.15,'#ffe1a1')
    for side in [-1,1]:
        for j in range(9):rod('Hall roof lattice',(side*3.45,-2.3+j*.5,4.5),(side*2.7,-1.9+j*.5,5.3),.025,WOOD)
    glow(0,-.7,3.2,190)

def badminton_entrance(x,z):
    # URA: projecting box entrance, inset concrete canopy, flag post,
    # streamlined fins and pre-cast ventilation panels.
    for side in [-1,1]:
        xx=x+side*3.2
        B('Hall front peripheral wing',xx,z+3.35,1.5,2.4,.55,2.5,CREAM)
        for row in range(3):
            for col in range(6):
                xx2=xx-.9+col*.36;yy=1.3+row*.28
                B('Precast ventilation opening',xx2,z+3.64,yy,.22,.02,.14,'#56665c')
        for yy in [2.4,2.75]:B('Streamlined concrete fin',xx,z+3.5,yy,2.6,.8,.095,CREAM)
    for dx in [-1.15,1.15]:B('Protruding entrance box pier',x+dx,z+3.8,1.5,.22,.7,2.5,CREAM)
    B('Protruding entrance box lintel',x,z+3.8,2.75,2.5,.7,.26,CREAM)
    B('Inset framed concrete canopy',x,z+3.75,2.3,2.16,.9,.12,'#b9b8a7')
    rod('Entrance concrete flag post',(x,z+3.8,2.88),(x,z+3.8,4.05),.045,CREAM)
    S('SINGAPORE BADMINTON HALL',x,z+3.93,2.64,.14,DARK)

def tiger_balm_1950s(x,z):
    # NHB 2000-05931: conical-hatted barefoot farmer; fallen wife with raised
    # leg/hand; child; buffalo; low scalloped wall and planted slope. No gateway.
    skin='#c59673';coat='#9caaa0';trousers='#425451';stone='#929588'
    for j in range(13):
        a=j*math.tau/13
        ball('Tableau undulating stone terrain',(x+math.cos(a)*2.7,-z-math.sin(a)*1.8,.5),(.85,.65,.35),stone)
    B('Garden planted rear slope',x,z-2,.75,6.6,1.5,.5,'#5a7046')
    for j in range(15):
        xx=x-3.2+j*.45
        B('Low white garden wall',xx,z-1.25,1,.44,.16,.6,CREAM)
        arc('Scalloped wall crest',xx,z-1.25,1.3,.44,.16,.055,CREAM)
    for j in range(13):
        xx=x-3+j*.5
        B('Rear retaining wall',xx,z-2.7,1.3,.5,.18,.75,CREAM)
        if j%2==0:B('Retaining wall crenellation',xx,z-2.7,1.82,.26,.18,.3,CREAM)
    # Farmer stands at the left, one hand at his shoulder and one offering balm.
    fx=x-1.7;fz=z+.25
    for dx in [-.23,.23]:
        rod('Farmer bare shin',(fx+dx,fz,.65),(fx+dx*.8,fz,1.35),.12,skin)
        ball('Farmer bare foot',(fx+dx,-fz-.13,.63),(.15,.27,.08),skin)
        rod('Farmer knee-length shorts',(fx+dx*.8,fz,1.3),(fx+dx*.65,fz,1.8),.2,trousers)
    ball('Farmer jacket',(fx,-fz,2.14),(.46,.3,.63),coat)
    for dx in [-.055,.055]:rod('Jacket placket',(fx+dx,fz+.305,1.65),(fx+dx,fz+.305,2.65),.012,DARK)
    for yy in [1.9,2.12,2.34,2.56]:B('Jacket frog fastening',fx,fz+.325,yy,.22,.025,.035,WOOD)
    ball('Farmer face',(fx,-fz,2.94),(.26,.23,.31),skin)
    C('Conical hat brim',fx,fz,3.24,.57,.045,'#c9b886',24)
    bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.57,radius2=.025,depth=.42,location=(fx,-fz,3.46))
    bpy.context.object.name='Farmer conical woven hat';bpy.context.object.data.materials.append(mat('#c9b886'))
    for j in range(16):
        a=j*math.tau/16;rod('Hat woven rib',(fx,fz,3.67),(fx+.55*math.cos(a),fz+.55*math.sin(a),3.25),.009,WOOD)
    rod('Farmer offering sleeve',(fx+.35,fz,2.4),(fx+.72,fz+.1,2.03),.14,coat)
    rod('Farmer offering forearm',(fx+.72,fz+.1,2.03),(fx+1.25,fz+.2,1.97),.09,skin)
    bead('Farmer open hand',fx+1.28,fz+.2,1.98,.12,skin)
    C('Tiger Balm ointment bottle',fx+1.32,fz+.2,2.1,.09,.2,CREAM,12)
    C('Ointment lid',fx+1.32,fz+.2,2.22,.095,.035,RED,12)
    rod('Farmer raised sleeve',(fx-.33,fz,2.44),(fx-.55,fz,2.62),.14,coat)
    rod('Farmer raised forearm',(fx-.55,fz,2.62),(fx-.18,fz+.07,2.85),.09,skin)
    rod('Shoulder pole',(fx-.7,fz-.13,2.78),(fx+.35,fz-.13,2.78),.04,WOOD)
    # Fallen wife: asymmetric, bent leg, raised hand and support arm on the rock.
    wx=x+.9;wz=z+.6
    ball('Wife seated hip',(wx,-wz,.8),(.43,.38,.3),trousers)
    o=ball('Wife leaning blouse',(wx-.08,-wz+.1,1.25),(.36,.26,.55),'#b9b7a4');o.rotation_euler.y=-.2
    ball('Wife upturned face',(wx-.2,-wz+.1,1.88),(.25,.23,.3),skin)
    ball('Wife tied hair',(wx-.2,-wz+.2,2.08),(.26,.24,.13),DARK)
    # One knee drawn up; the second leg rests across the rocky foreground.
    rod('Wife bent trouser thigh',(wx-.1,wz,.85),(wx-.25,wz+.32,1.25),.18,trousers)
    rod('Wife lowered shin',(wx-.25,wz+.32,1.25),(wx-.4,wz+.7,.6),.11,skin)
    ball('Wife grounded bare foot',(wx-.4,-wz-.8,.6),(.14,.24,.075),skin)
    rod('Wife lifted thigh',(wx+.1,wz,.87),(wx+.43,wz+.28,1.25),.18,trousers)
    rod('Wife raised bare leg',(wx+.43,wz+.28,1.25),(wx+.35,wz+.25,2.1),.11,skin)
    ball('Raised sole',(wx+.35,-wz-.29,2.15),(.13,.075,.23),skin)
    rod('Wife raised sleeve',(wx-.38,wz,1.48),(wx-.6,wz+.06,1.73),.12,'#b9b7a4')
    rod('Wife raised hand',(wx-.6,wz+.06,1.73),(wx-.82,wz+.08,1.92),.08,skin)
    rod('Wife supporting arm',(wx+.3,wz-.1,1.4),(wx+.66,wz-.12,.65),.11,'#b9b7a4')
    # Child behind her right shoulder.
    guest(x+2.2,z-.05,.6,.95,color='#c0b6a3')
    # Water buffalo in the background of the dated postcard.
    bx=x+1.7;bz=z-1.95
    ball('Buffalo broad body',(bx,-bz,1.6),(.8,.33,.48),'#717b72')
    bead('Buffalo head',bx-.75,bz+.04,1.56,.28,'#717b72')
    for xx in [-.5,.5]:
        for zz in [-.2,.2]:rod('Buffalo leg',(bx+xx,bz+zz,1.35),(bx+xx,bz+zz,.9),.07,'#717b72')
    for side in [-1,1]:curve('Buffalo curved horn',[(bx-.76,bz+side*.13,1.72),(bx-.9,bz+side*.34,1.87),(bx-.77,bz+side*.45,2.03)],.035,CREAM)
    # Small visitor-side identification, not a invented monumental garden gate.
    B('Garden exhibit marker',x-2.7,z+2.3,.8,1.5,.12,.55,CREAM)
    S('TIGER BALM',x-2.7,z+2.37,.86,.18,DARK)
    S('GARDENS',x-2.7,z+2.37,.66,.16,DARK)
    for dx in [-1.4,-.4,.8,1.8]:guest(x+dx,z+2.3,.25,.7)
    glow(x,z+.3,3.4,170)
