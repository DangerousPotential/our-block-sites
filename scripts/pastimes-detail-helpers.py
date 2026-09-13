"""Detail vocabulary for the 1950s Blender scene; executed by its builder."""
import random
rng=random.Random(1957)
def bead(n,x,z,y,r=.065,c='#ffe1a1'):
    return ball(n,(x,-z,y),(r,r,r),c)
def curve(n,points,r,c,closed=False):
    data=bpy.data.curves.new(n,'CURVE');data.dimensions='3D';data.resolution_u=1
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for p,v in zip(spline.points,points):p.co=(v[0],-v[1],v[2],1)
    spline.use_cyclic_u=closed;data.bevel_depth=r;data.bevel_resolution=2
    o=bpy.data.objects.new(n,data);bpy.context.collection.objects.link(o);data.materials.append(mat(c))
    bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o

def trim(x,z,y,w,d,c=GOLD):
    for zz in [-d/2,d/2]:B('Moulded cornice',x,z+zz,y,w,.07,.08,c)
    for xx in [-w/2,w/2]:B('Moulded cornice',x+xx,z,y,.07,d,.08,c)
def railing(x,z,w,y=.4,h=.75,c=WOOD):
    for yy in [y+.12,y+h]:rod('Balustrade rail',(x-w/2,z,yy),(x+w/2,z,yy),.035,c)
    for i in range(int(w/.26)+1):rod('Turned baluster',(x-w/2+i*.26,z,y),(x-w/2+i*.26,z,y+h),.023,c)
def planter(x,z,s=.55,flowers=False):
    C('Terracotta pot',x,z,.42,s*.6,.65,WOOD,12)
    C('Pot rim',x,z,.74,s*.67,.1,GOLD,12)
    for j in range(7):
        a=j*math.tau/7;dx=math.cos(a)*s*.5;dz=math.sin(a)*s*.5
        rod('Leaf stem',(x,z,.7),(x+dx,z+dz,1.25),.02,'#47784f')
        o=ball('Glossy leaf',(x+dx,-z-dz,1.18),(.18,.08,.3),'#4b8052');o.rotation_euler=(.2,a,.3)
        if flowers:bead('Flower cluster',x+dx,z+dz,1.37,.12,['#d86880','#eed48f'][j%2])
def festoon(a,b,count=12):
    pts=[]
    for j in range(count+1):
        t=j/count;p=(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t-.4*math.sin(t*math.pi));pts.append(p)
        bead('Festoon bulb',*p,.065)
    curve('Festoon cable',pts,.014,DARK)
def bunting(a,b,count=9):
    curve('Bunting cord',[a,b],.015,WOOD)
    for j in range(count):
        t=(j+.5)/count;x=a[0]+(b[0]-a[0])*t;z=a[1]+(b[1]-a[1])*t;y=a[2]+(b[2]-a[2])*t
        mesh=bpy.data.meshes.new('Pennant');mesh.from_pydata([(x-.16,-z,y),(x+.16,-z,y),(x,-z,y-.42)],[],[(0,1,2)])
        o=bpy.data.objects.new('Triangular pennant',mesh);bpy.context.collection.objects.link(o);mesh.materials.append(mat([RED,GOLD,TEAL][j%3]))
guest_sequence=0
def guest(x,z,y=.25,scale=.85,pose='stand',color=None):
    global guest_sequence
    guest_sequence+=1
    general_visitor=color is None
    color=color or rng.choice([CREAM,TEAL,RED,'#eee0ca','#a1b8ae','#c2788c','#466477'])
    person(x,z,y,color,scale)
    # Hair, facial detail and articulated arms make the crowds legible up close.
    for dx in [-.065,.065]:bead('Eye',x+dx*scale,z+.163*scale,y+1.055*scale,.016*scale,DARK)
    if pose=='dance':
        for side in [-1,1]:
            rod('Dancer raised forearm',(x+side*.23*scale,z,y+.8*scale),(x+side*.58*scale,z+.03,y+1.04*scale),.052*scale,color)
            bead('Dancer hand',x+side*.61*scale,z+.03,y+1.06*scale,.063*scale,'#b67b52')
    # Everyday dress based on NHB 2011-02733, not random costume hats.
    # Floor performers and sports players keep unobstructed athletic silhouettes.
    if general_visitor and pose=='stand' and guest_sequence%3==0:
        C('Visitor calf-length skirt',x,z,y+.31*scale,.205*scale,.52*scale,color,12)
        for j in range(5):
            B('Visitor skirt woven band',x,z+.207*scale,y+(.1+j*.085)*scale,.34*scale,.012*scale,.018*scale,CREAM)
        ball('Visitor tied hair',(x,-z+.13*scale,y+1.16*scale),(.11*scale,.1*scale,.1*scale),DARK)
    else:
        for dx in [-.09,.09]:rod('Visitor shirt collar',(x+dx*scale,z+.172*scale,y+.87*scale),(x,z+.185*scale,y+.78*scale),.019*scale,CREAM)
        B('Visitor shirt placket',x,z+.18*scale,y+.66*scale,.012*scale,.015*scale,.23*scale,CREAM)
        B('Visitor trouser waistband',x,z+.13*scale,y+.43*scale,.29*scale,.04*scale,.04*scale,DARK)
    for dx in [-.09,.09]:
        ball('Visitor flat shoe',(x+dx*scale,-z-.04*scale,y+.08*scale),(.075*scale,.13*scale,.045*scale),DARK)
def sconce(x,z,y=2.7):
    B('Wall light mount',x,z,y,.14,.18,.28,DARK)
    bead('Wall lantern globe',x,z+.16,y,.14)
    C('Lantern cap',x,z+.16,y+.17,.16,.065,DARK,12)
def glow(x,z,y,power=70):
    bpy.ops.object.light_add(type='POINT',location=(x,-z,y))
    o=bpy.context.object;o.name='Warm attraction light';o.data.energy=power;o.data.color=(1,.56,.22);o.data.shadow_soft_size=.7
    # Runtime uses equivalent bounded lights rather than exporting every light.
def bicycle(x,z):
    for dx in [-.5,.5]:curve('Bicycle wheel',[(x+dx+.31*math.cos(a),z,.5+.31*math.sin(a)) for a in [j*math.tau/24 for j in range(24)]],.025,DARK,True)
    for a,b in [((-.5,.5),(0,.5)),((0,.5),(-.22,1)),((-.22,1),(-.5,.5)),((0,.5),(.5,.5)),((.5,.5),(.2,1)),((.2,1),(-.22,1))]:rod('Bicycle frame',(x+a[0],z,a[1]),(x+b[0],z,b[1]),.024,TEAL)
    B('Bicycle saddle',x-.2,z,1.05,.25,.2,.065,DARK);rod('Handlebar',(x+.2,z,1),(x+.3,z,1.2),.023,DARK)
def table(x,z,y=.85):
    C('Round timber table',x,z,y,.55,.1,WOOD,20);C('Table pedestal',x,z,y/2,.075,y,DARK,10)
    for dx,dz in [(-.22,0),(.23,.12)]:
        C('Porcelain cup',x+dx,z+dz,y+.12,.065,.12,CREAM,12)
        C('Cup saucer',x+dx,z+dz,y+.055,.1,.015,CREAM,12)
def roof_tiles(x,z,y,w,d,c=TEAL):
    roof(x,-z,y,w,d,c)
    for side in [-1,1]:
        for j in range(int(d/.16)+1):
            rod('Roof tile seam',(x,z-d/2+j*.16,y+.9),(x+side*w*.53,z-d/2+j*.16,y-.12),.018,DARK)
    rod('Roof ridge',(x,z-d/2,y+.94),(x,z+d/2,y+.94),.085,GOLD)
def arc(n,x,z,y,w,h,r,c):
    return curve(n,[(x+math.cos(math.pi-j*math.pi/24)*w/2,z,y+math.sin(math.pi-j*math.pi/24)*h) for j in range(25)],r,c)
def notice(t,x,z,y=1.4,w=.85):
    B('Framed notice',x,z,y,w,.12,1.3,WOOD);B('Notice paper',x,z+.065,y,w-.1,.025,1.18,CREAM)
    for i,line in enumerate(t.split('|')):S(line,x,z+.085,y+.35-i*.25,.16,DARK)
