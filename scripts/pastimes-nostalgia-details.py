"""Sculpted, original period-inspired props; no photographic garden billboards."""
def shade_tree(x,z,s=1):
    # Broad branching shade-tree silhouette, supported by period park photographs.
    # Species and exact planting position are intentionally not asserted.
    root=(x,z,.1)
    curve('Irregular shade tree trunk',[root,(x+.1*s,z,1.2*s),(x-.15*s,z+.1,2.8*s),(x+.1,z,4.2*s)],.18*s,'#63513d')
    for j in range(7):
        a=j*math.tau/7;xx=x+math.cos(a)*1.7*s;zz=z+math.sin(a)*1.45*s;yy=(3.6+rng.random()*.9)*s
        rod('Spreading shade branch',(x,z,2.3*s),(xx,zz,yy),.08*s,'#63513d')
        for k in range(5):
            dx=rng.uniform(-.7,.7)*s;dz=rng.uniform(-.6,.6)*s
            ball('Clustered broadleaf canopy',(xx+dx,-zz-dz,yy+rng.uniform(0,.5)*s),(.8*s,.65*s,.38*s),['#344d36','#455e39','#536b40','#697b49'][k%4])
    for j in range(7):
        a=j*math.tau/7
        rod('Exposed buttress root',(x,z,.4),(x+math.cos(a)*.55*s,z+math.sin(a)*.55*s,.12),.08*s,'#63513d')

def lantern(x,z,y=3.3):
    C('Paper lantern body',x,z,y,.16,.38,'#ffc776',12)
    for j in range(8):
        a=j*math.tau/8
        rod('Lantern rib',(x+.161*math.cos(a),z+.161*math.sin(a),y-.17),(x+.161*math.cos(a),z+.161*math.sin(a),y+.17),.009,RED)
    for yy in [y-.21,y+.21]:C('Lantern rim',x,z,yy,.13,.055,RED,12)
    rod('Lantern tassel',(x,z,y-.23),(x,z,y-.42),.018,RED)

def sculpted_family(x,z):
    # Freestanding interpretation of NHB 2000-05931: farmer offers ointment to wife.
    skin='#c99470';robe='#548a80';pink='#c87980'
    for j in range(15):
        a=j*math.tau/15
        ball('Tableau earth and rock',(x+math.cos(a)*2,-z-math.sin(a)*1.15,.7),(.55,.45,.4),['#9e997d','#afa78b','#7e8c71'][j%3])
    # Standing farmer, sculpted at twice visitor scale for readable gestures.
    fx=x-.85;fz=z-.15
    for dx in [-.23,.23]:
        rod('Farmer trouser',(fx+dx,fz,.85),(fx+dx*.7,fz,1.7),.19,'#384e57')
        ball('Farmer shoe',(fx+dx,-fz-.12,.87),(.2,.32,.13),DARK)
    ball('Farmer sculpted tunic',(fx,-fz,2.1),(.53,.35,.72),robe)
    for j in range(5):
        curve('Tunic carved fold',[(fx-.36+j*.18,fz+.3,1.5),(fx-.29+j*.145,fz+.36,2.15),(fx-.25+j*.125,fz+.27,2.58)],.016,'#376b64')
    bead('Farmer neck',fx,fz,2.8,.16,skin)
    ball('Farmer face',(fx,-fz,3.07),(.29,.25,.35),skin)
    ball('Farmer hair',(fx,-fz+.025,3.3),(.3,.25,.14),DARK)
    for dx in [-.1,.1]:bead('Sculpted eye',fx+dx,fz+.24,3.1,.027,DARK)
    bead('Sculpted nose',fx,fz+.28,3.03,.055,skin)
    # Offering arm reaches rightwards towards the seated wife.
    rod('Farmer sleeve',(fx+.38,fz,2.55),(fx+.8,fz+.3,2.25),.17,robe)
    rod('Farmer offering hand',(fx+.8,fz+.3,2.25),(fx+1.25,fz+.36,2.16),.115,skin)
    C('Ointment bottle',fx+1.28,fz+.36,2.31,.12,.25,'#ece1b4',16)
    C('Ointment red lid',fx+1.28,fz+.36,2.46,.13,.055,RED,16)
    rod('Farmer resting sleeve',(fx-.4,fz,2.55),(fx-.55,fz+.15,1.85),.15,robe)
    bead('Farmer resting hand',fx-.55,fz+.15,1.78,.13,skin)
    # Wife is seated, with one leg extended, rather than another generic standing NPC.
    wx=x+1;wz=z+.2
    ball('Wife seated skirt',(wx,-wz,1.15),(.58,.52,.42),pink)
    rod('Wife extended leg',(wx,wz+.25,1),(wx+.8,wz+.8,.78),.17,skin)
    ball('Wife shoe',(wx+.9,-wz-.85,.75),(.25,.22,.11),DARK)
    ball('Wife blouse',(wx,-wz,1.75),(.42,.3,.57),pink)
    ball('Wife face',(wx,-wz,2.42),(.26,.24,.32),skin)
    ball('Wife hair bun',(wx+.19,-wz+.1,2.61),(.2,.21,.18),DARK)
    ball('Wife hair',(wx,-wz+.06,2.64),(.28,.23,.12),DARK)
    for dx in [-.085,.085]:bead('Wife sculpted eye',wx+dx,wz+.235,2.45,.025,DARK)
    rod('Wife reaching sleeve',(wx-.32,wz,2),(wx-.53,wz+.14,2.15),.12,pink)
    rod('Wife reaching hand',(wx-.53,wz+.14,2.15),(x+.5,wz+.15,2.2),.08,skin)
    rod('Wife resting arm',(wx+.3,wz,1.98),(wx+.47,wz+.4,1.18),.11,pink)
    for j in range(4):curve('Skirt sculpted fold',[(wx-.35+j*.2,wz+.45,1.35),(wx-.3+j*.2,wz+.54,.95)],.018,'#914c61')
    # Small farm basket and hoe frame the scene, original interpretive props.
    C('Woven farm basket',x-1.8,z+.55,1,.3,.45,'#b18b52',16)
    for yy in [.8,.9,1,1.1,1.2]:
        curve('Basket woven band',[(x-1.8+.305*math.cos(a),z+.55+.305*math.sin(a),yy) for a in [j*math.tau/20 for j in range(21)]],.017,WOOD)
    rod('Farmer hoe handle',(x-1.6,z-.4,.8),(x-1.9,z-.4,2.5),.035,WOOD)
    B('Hoe metal blade',x-1.62,z-.37,.83,.5,.08,.16,DARK)

def garden_terrain(x,z):
    for side in [-1,1]:
        for j in range(15):
            xx=x+side*(2.25+rng.uniform(0,.75));zz=z-2.5+j*.32
            yy=.5+rng.uniform(0,.7)
            ball('Sculpted garden grotto rock',(xx,-zz,yy),(.42,.36,.55),['#88947a','#9c9f86','#b0ad93'][j%3])
        for j in range(10):
            xx=x+side*3;zz=z-2.2+j*.45
            for k in range(3):
                bead('Garden foliage',xx+rng.uniform(-.3,.3),zz,.8+rng.random()*.3,.23,['#486147','#617849','#7b8a4c'][k])
            for k in range(3):bead('Garden flower',xx+rng.uniform(-.25,.25),zz+rng.uniform(-.15,.15),1.14,.065,['#da987a','#e2bd65','#d18491'][k])
    for side in [-1,1]:
        xx=x+side*3.25
        for j in range(9):
            zz=z-2.4+j*.52
            C('Garden balustrade column',xx,zz,.7,.08,.8,CREAM,12)
            bead('Garden finial',xx,zz,1.16,.1,GOLD)
        rod('Garden boundary rail',(xx,z-2.6,1.05),(xx,z+1.9,1.05),.055,CREAM)
    for j in range(3):
        B('Garden entry stair',x,z+2.05+j*.27,.38-j*.075,4,.3,.15,'#b9a17d')

def woven_chair(x,z):
    for dx in [-.22,.22]:
        for dz in [-.2,.2]:rod('Rattan chair leg',(x+dx,z+dz,.2),(x+dx,z+dz,.75),.025,GOLD)
    B('Rattan seat',x,z,.73,.5,.48,.05,WOOD)
    arc('Rattan curved chair back',x,z-.21,.73,.46,.65,.03,GOLD)
    for j in range(5):rod('Rattan back weave',(x-.17+j*.085,z-.21,.76),(x-.17+j*.085,z-.21,1.2),.012,CREAM)

def street_lived_details():
    # Kept beside buildings, clear of the inter-attraction approaches.
    for x,z in [(-17.5,-11),(17.7,-11),(17,5),(-18,3.5)]:
        seat(x,z)
        for dx in [-.5,.5]:guest(x+dx,z,.2,.78)
    for x,z in [(-5,-12),(5,-11),(4,0),(-4,11)]:
        C('Fluted street bin',x,z,.55,.22,.7,TEAL,16)
        for j in range(10):
            a=j*math.tau/10
            rod('Bin timber slat',(x+.225*math.cos(a),z+.225*math.sin(a),.22),(x+.225*math.cos(a),z+.225*math.sin(a),.86),.014,GOLD)
    for x,z in [(-16,-5),(3,-5),(14,-5),(3,3),(9,8),(-3,14)]:
        guest(x,z,.2,.85)
        guest(x+.55,z+.15,.2,.61)
