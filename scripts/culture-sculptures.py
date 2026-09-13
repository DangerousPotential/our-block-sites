"""Continuous sculptural surfaces, using the approved hand-painted texture atlas.

Loaded by build-culture-worlds.py before its station builder registry.
"""

def sculpture_uv(obj, tile, x0, width, y0, height):
    uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='Continuous mosaic')
    depth0=min(v.co.y for v in obj.data.vertices)
    for face in obj.data.polygons:
        for index in face.loop_indices:
            v=obj.data.vertices[obj.data.loops[index].vertex_index].co
            # Project onto each face's dominant plane so the crown and tunnel
            # thickness retain mosaic cells instead of stretching into stripes.
            if abs(face.normal.z)>.65:
                u=(v.x-x0)/width;t=(v.y-depth0)/height
            elif abs(face.normal.x)>.75:
                u=(v.y-depth0)/width;t=(v.z-y0)/height
            else:
                u=(v.x-x0)/width;t=(v.z-y0)/height
            u=max(0,min(1,u));t=max(0,min(1,t))
            uv.data[index].uv=((tile%3+.02+u*.96)/3,(1-(tile%6)//3+.02+t*.96)/2)

def sculpted_oval(name,x,z,y,rx,rz,ry,color,tile=None):
    verts=[];faces=[];n=32;m=16
    power=.8 if name in ['Dragon upper muzzle','Dragon lower jaw'] else 1
    def rounded(v):return math.copysign(abs(v)**power,v)
    for j in range(m+1):
        t=math.pi*j/m
        for i in range(n):
            a=TAU*i/n
            verts.append((x+rx*rounded(math.sin(t)*math.cos(a)),-z+rz*rounded(math.sin(t)*math.sin(a)),y+ry*rounded(math.cos(t))))
    for j in range(m):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
    o=mesh(name,verts,faces,color,tile)
    for p in o.data.polygons:p.use_smooth=True
    if tile==11:
        # Weld the poles before unwrapping; spherical UVs pinch the mosaic into
        # radial streaks on the broad muzzle. Contiguous angle-limited islands
        # keep the ceramic cells square, with explicit seams between islands.
        bm=bmesh.new();bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
        bm.to_mesh(o.data);bm.free()
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.02)
        bpy.ops.uv.average_islands_scale()
        bpy.ops.object.mode_set(mode='OBJECT')
        uv=o.data.uv_layers.active
        area=0
        for face in o.data.polygons:
            points=[uv.data[loop].uv for loop in face.loop_indices]
            area+=abs(sum(p.x*points[(i+1)%len(points)].y-p.y*points[(i+1)%len(points)].x for i,p in enumerate(points)))/2
        density=math.sqrt(sum(p.area for p in o.data.polygons)/max(area,.0001))/3.2
        for loop in uv.data:loop.uv*=density
    elif tile is not None:sculpture_uv(o,tile,x-rx,rx*2,y-ry,ry*2)
    return o

def mosaic_arch(cx,rx,ry):
    # A watertight extruded annulus: the tunnel is actually open from both sides.
    n=48;verts=[];faces=[]
    for i in range(n+1):
        a=math.pi*i/n
        for radius,height,depth in [(rx,ry,-.15),(rx,ry,.85),(rx+.48,ry+.55,-.15),(rx+.48,ry+.55,.85)]:
            verts.append((cx+radius*math.cos(a),depth,.32+height*math.sin(a)))
    for i in range(n):
        k=4*i;faces.extend([(k,k+4,k+6,k+2),(k+1,k+3,k+7,k+5),(k+2,k+6,k+7,k+3),(k,k+1,k+5,k+4)])
    faces.extend([(0,2,3,1),(n*4,n*4+1,n*4+3,n*4+2)])
    o=mesh('Continuous mosaic dragon arch',verts,faces,'#e88632',11)
    uv=o.data.uv_layers.active
    distance=[0]
    for i in range(1,n+1):
        a=math.pi*i/n;b=math.pi*(i-1)/n
        distance.append(distance[-1]+math.hypot((rx+.48)*(math.cos(a)-math.cos(b)),(ry+.55)*(math.sin(a)-math.sin(b))))
    for i,face in enumerate(o.data.polygons):
        for loop in face.loop_indices:
            index=o.data.loops[loop].vertex_index;v=o.data.vertices[index].co
            if i<4*n and i%4 in [2,3]:
                # Extruded crown and tunnel follow actual arc length, with no
                # threshold changes between the side and top of the arch.
                u=distance[index//4];t=v.y+.15
            else:u=v.x-cx+rx+.48;t=v.z-.32
            uv.data[loop].uv=(u/3.2,t/3.2)
    for i in range(24):
        a=(i+.5)*math.pi/24
        o=B('Turquoise and ivory tunnel edging',cx+(rx+.05)*math.cos(a),.2,.32+(ry+.07)*math.sin(a),.17,.06,.25,TEAL if i%2 else CREAM)
        o.rotation_euler.y=math.pi/2-a
    count=9 if rx>1.2 else 7
    for i in range(1,count+1):
        a=i*math.pi/(count+1)
        x=cx+(rx+.48)*math.cos(a);y=.32+(ry+.55)*math.sin(a)
        # Broad ceramic fins follow the curve instead of standing like fence posts.
        nx,ny=math.cos(a)/(rx+.48),math.sin(a)/(ry+.55)
        length=math.hypot(nx,ny);nx/=length;ny/=length
        crest('Terracotta dragon crest',x,y,nx,ny,.35)

def crest(name,x,y,nx,ny,depth):
    profile=[(-.2,-.06),(.2,-.06),(.17,.25),(.06,.46),(-.07,.44),(-.18,.24)]
    verts=[(x-ny*t+nx*r,d,y+nx*t+ny*r) for d in [depth-.14,depth+.14] for t,r in profile]
    count=len(profile)
    faces=[tuple(reversed(range(count))),tuple(range(count,count*2))]
    faces.extend((i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count))
    return mesh(name,verts,faces,'#ce532e')

def dragon_neck():
    # A planted, curved neck: an ellipsoid pinches to a point at sand level.
    # Height, centre X, centre Z and the two section radii define the silhouette.
    sections=[(.28,-2.05,-.3,.56,.55),(.95,-2.08,-.3,.59,.55),
              (2.2,-2.35,-.3,.58,.55),(3.35,-2.5,-.2,.59,.57),
              (4.12,-2.5,-.03,.66,.6)]
    rings=[]
    for a,b in zip(sections,sections[1:]):
        for step in range(8):
            t=step/8;s=t*t*(3-2*t)
            rings.append((a[0]+(b[0]-a[0])*t,*[a[i]+(b[i]-a[i])*s for i in range(1,5)]))
    rings.append(sections[-1])
    n=32;verts=[];faces=[]
    for y,x,z,rx,rz in rings:
        verts.extend((x+rx*math.cos(TAU*i/n),-z+rz*math.sin(TAU*i/n),y) for i in range(n))
    for row in range(len(rings)-1):
        for i in range(n):
            a=row*n+i;b=row*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
    faces.extend([tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))])
    obj=mesh('Upright planted mosaic neck',verts,faces,'#e88632',11)
    uv=obj.data.uv_layers.active
    for face in obj.data.polygons:
        face.use_smooth=len(face.vertices)==4
        seam=any(v%n==n-1 for v in face.vertices) and any(v%n==0 for v in face.vertices)
        for loop in face.loop_indices:
            index=obj.data.loops[loop].vertex_index;v=obj.data.vertices[index].co
            if len(face.vertices)==4:
                column=index%n;u=1 if seam and column==0 else column/n
                uv.data[loop].uv=(u*TAU*.58/3.2,(v.z-.28)/3.2)
            else:uv.data[loop].uv=(v.x/3.2,v.y/3.2)

def dragon():
    # Rounded sand court and a raised cream curb, like the approved playground.
    boundary=[]
    for cx,cz,start in [(4.1,2.6,0),(-4.1,2.6,math.pi/2),(-4.1,-2.6,math.pi),(4.1,-2.6,math.pi*1.5)]:
        for i in range(9):
            a=start+i*math.pi/16;boundary.append((cx+1.4*math.cos(a),cz+1.4*math.sin(a)))
    sand=mesh('Rounded sand playground',[(x,-z,.31) for x,z in boundary],[tuple(reversed(range(len(boundary))))],'#dab57b',0)
    sculpture_uv(sand,0,-5.5,11,0,8)
    for i,(x,z) in enumerate(boundary):
        nx,nz=boundary[(i+1)%len(boundary)]
        beam('Rounded playground curb',(x,z,.3),(nx,nz,.3),.095,CREAM)
    mosaic_arch(.05,1.4,2.05)
    mosaic_arch(3.1,1.05,1.25)
    # The reference has an upright neck and a narrow, long jaw above its slide.
    dragon_neck()
    sculpted_oval('Dragon rounded brow',-2.5,-.03,4.12,.77,.67,.72,'#e88632',11)
    sculpted_oval('Dragon upper muzzle',-2.5,1.03,4.05,.72,1.23,.29,'#e88632',11)
    sculpted_oval('Dragon lower jaw',-2.5,1.01,2.91,.74,1.2,.14,'#e88632',11)
    sculpted_oval('Open mouth interior',-2.5,.98,3.02,.6,1.1,.055,'#77412b')
    for y,z in [(2.3,-.83),(2.9,-.83),(3.5,-.83),(4.12,-.66)]:
        # Back-of-neck fins connect the tall head silhouette to the body crests.
        fin=crest('Neck terracotta crest',-z,y,1,0,0)
        for vertex in fin.data.vertices:
            a,b,c=vertex.co;vertex.co=(-2.25+b,a,c)
    crest('Head crown crest',-2.5,4.64,0,1,.22)
    for side in [-1,1]:
        x=-2.5+side*.7
        sculpted_oval('Ivory eye surround',x,.2,4.28,.14,.34,.36,CREAM)
        sculpted_oval('Jade dragon eye',x+side*.09,.23,4.29,.09,.27,.28,'#516b2f')
        sculpted_oval('Dragon black pupil',x+side*.15,.3,4.3,.055,.17,.18,DARK)
        sculpted_oval('Eye glint',x+side*.19,.36,4.39,.028,.045,.045,CREAM)
        sculpted_oval('Dragon nostril',-2.5+side*.4,2.03,4.21,.11,.07,.08,DARK)
    for x in [-3.02,-2.76,-2.5,-2.24,-1.98]:
        for y,direction in [(3.81,-1),(3.04,1)]:
            z=2.03
            mesh('Ivory dragon tooth',[(x-.1,-z,y),(x+.1,-z,y),(x,-z-.06,y+direction*.25),(x,-z+.14,y)],[(0,1,2),(0,3,1),(0,2,3),(1,3,2)],CREAM)
    for side in [-1,1]:
        for z in [.65,1.05,1.45,1.8]:
            x=-2.5+side*.65
            for y,direction in [(3.81,-1),(3.04,1)]:
                mesh('Side dragon tooth',[(x,-z-.1,y),(x,-z+.1,y),(x,-z,y+direction*.25),(x-side*.14,-z,y)],[(0,1,2),(0,3,1),(0,2,3),(1,3,2)],CREAM)
    # Curved playground slide with a broad floor and raised safety cheeks.
    for side in [0,-1,1]:
        verts=[];faces=[]
        for i in range(33):
            t=i/32;z=1.3+2.45*t;y=2.96-2.62*(t*t*(3-2*t))
            if side==0:
                verts.extend([(-3.04,-z,y),(-1.96,-z,y)])
            else:
                x=-2.5+side*.62
                verts.extend([(x,-z,y),(x,-z,y+.25)])
        for i in range(32):faces.append((i*2,i*2+1,i*2+3,i*2+2))
        o=mesh('Curved slide bed' if side==0 else 'Raised slide cheek',verts,faces,RED if side==0 else GOLD)
        if side:
            for i in range(32):
                t=i/32;u=(i+1)/32
                beam('Ivory slide rim',(-2.5+side*.62,1.3+2.45*t,3.21-2.62*t*t*(3-2*t)),(-2.5+side*.62,1.3+2.45*u,3.21-2.62*u*u*(3-2*u)),.045,CREAM)
    for i in range(6):
        C('Coloured stepping stump',-.8+i*.75,2.6,.44,.18,.28,[TEAL,GOLD,RED][i%3])
    for i in range(7):B('Dragon climbing stair',-2.25,-2.3+i*.28,.38+i*.36,.8,.32,.16,CREAM)
    solid(.2,-.3,9,2)

base_cinema=cinema
def cinema():
    base_cinema()
    for x in [-3.55,-2.05]:
        B('Cinema glazed entrance door',x,2.79,1.57,1.35,.07,2.35,'#566966')
        for dx in [-.66,.66]:B('Brass door stile',x+dx,2.85,1.57,.045,.035,2.35,GOLD)
        B('Door transom',x,2.85,2.7,1.35,.035,.045,GOLD)
        B('Cinema brass door handle',x+.43,2.92,1.48,.035,.07,.44,GOLD)
    for x in [-5.2,-.4]:
        B('Framed matinee poster',x,3.08,2.1,.57,.05,1.5,GOLD)
        B('Painted matinee scene',x,3.12,2.1,.47,.02,1.38,CREAM,6)
    B('Ticket booth canopy',-4.5,3.3,2.05,1.8,1.45,.16,RED)
    for x in [-5.19,-3.81]:B('Ticket booth brass frame',x,3.87,1.53,.04,.04,.8,GOLD)
    B('Ticket transaction ledge',-4.5,3.94,1.26,1.65,.3,.08,GOLD)
    for z in [-1.8,-.3,1.2]:
        for x in [.25,1.75,3.25,4.75]:
            B('Auditorium upholstered cushion',x,z,.7,.72,.64,.24,'#813743')
            B('Auditorium upholstered seat back',x,z+.28,1.1,.76,.18,.78,'#813743')
            for dx in [-.42,.42]:B('Cinema seat armrest',x+dx,z,.92,.09,.66,.09,DARK)
    B('Auditorium upper cornice',2.65,-3.83,4.18,5.7,.52,.24,RED)
    for x in [.2,5.1]:B('Screen proscenium',x,-3.5,2.2,.18,.24,3.8,RED)

base_stage=stage
def stage(title,wayang=False):
    base_stage(title,wayang)
    for i in range(3):
        B('Performance entrance step',0,1.45-i*.28,.27+i*.11,8.5-i*.4,.7,.16,CREAM)
    for x in [-4.6,4.6]:
        B('Stage loudspeaker',x,.35,1.05,.65,.65,1.4,DARK)
        for y in [.75,1.32]:
            o=C('Speaker cone',x,.7,y,.23,.04,'#405361');o.rotation_euler.x=math.pi/2
    if not wayang:
        verts=[];faces=[]
        for i in range(125):
            x=-3.8+i*7.6/124;depth=2.78+.12*math.cos(i*math.pi/2)
            verts.extend([(x,depth,.86),(x,depth,3.68)])
        for i in range(124):faces.append((2*i,2*i+2,2*i+3,2*i+1))
        curtain=mesh('Illustrated velvet on folded curtain',verts,faces,RED,7)
        sculpture_uv(curtain,7,-3.8,7.6,.86,2.82)
    for i in range(31):
        x=-3.7+i*.247
        if wayang and abs(x)>2.6:
            C('Velvet curtain fold',x,-2.83,2.3,.14,2.75,'#96324a' if i%2 else '#742a42')
    if wayang:
        for x in [-5.05,5.05]:
            B('Opera gilded pillar inset',x,.2,2,.15,.035,2.8,GOLD)
            sculpted_oval('Red opera lantern',x,-1,3.25,.28,.28,.4,RED)
            for y in [2.85,3.65]:C('Lantern gold cap',x,-1,y,.17,.08,GOLD)
            beam('Lantern tassel',(x,-1,2.85),(x,-1,2.55),.028,GOLD)
        for i in range(25):
            x=-5.3+i*.44;y=4.64+(abs(x)/5.3)**3*.95
            beam('Curved opera roof tile ridge',(x,-4,y),(x,-1.6,y),.045,GOLD)
    else:
        for x in [-4.55,4.55]:
            for i in range(8):C('Stage vertical marquee bulb',x,.26,.7+i*.45,.065,.08,GOLD,glow=True)
        for i in range(19):C('Stage footlight garland',-4.05+i*.45,1.07,.77,.055,.07,GOLD,glow=True)

base_badminton=badminton
def badminton():
    base_badminton()
    for x in [-4.4,4.4]:
        beam('Hall eave girder',(x,-4.5,4.6),(x,4.5,4.6),.09,DARK)
        for i in range(6):
            z=-4.5+i*1.5
            beam('Hall longitudinal diagonal',(x,z,4.6),(x,z+1.5,3.9),.065,DARK)
            beam('Hall lower girder',(x,z,3.9),(x,z+1.5,3.9),.07,DARK)
    for z in [-4.5,4.5]:
        beam('Truss bottom chord',(-4.4,z,4.6),(4.4,z,4.6),.075,DARK)
        for x in [-3,-1.5,0,1.5,3]:
            beam('Triangular roof web',(x,z,4.6),(x+.6,z,5.8-abs(x+.6)*1.2/4.4),.05,DARK)
    for x in [-2,0,2]:
        beam('Lamp pendant',(x,-2.5,4.85),(x,-2.5,3.9),.025,DARK)
        C('Court pendant shade',x,-2.5,3.84,.25,.15,GOLD,glow=True)
    B('Hall rear masonry wall',0,-4.7,1.8,9.1,.2,3.1,CREAM,4)
    for x in [-3.4,3.4]:
        B('Court equipment cupboard',x,-4.48,1,.75,.3,1.3,TEAL)

base_lan=lan
def lan():
    base_lan()
    B('LAN cafe burgundy fascia',0,-1.9,3.5,11.4,.6,.85,'#69394f')
    sign('LAN CAFE',0,-1.56,3.53,9.2,'#69394f')
    for i in range(28):B('LAN cafe roof seam',-5.4+i*.4,-2.8,4.15,.39,1.5,.13,'#69394f')
    for x in [-5.25,5.25]:B('LAN front column',x,2.7,1.9,.28,.28,3.4,'#69394f')
    for x in [-3.8,-1.3,1.3,3.8]:
        B('Ivory CRT monitor casing',x,-1.15,1.57,.98,.58,.8,'#d7d2bc')
        B('CRT blue display',x,-.84,1.59,.76,.025,.54,'#5f9ec5',glow=True)
        for dx in [-.38,.38]:B('Plastic chair side',x+dx,.22,.7,.065,.4,1,CREAM)
        for dx in [-.24,0,.24]:B('Plastic chair slat',x+dx,.38,1,.07,.07,.65,CREAM)
    B('LAN software display',4.85,-3.24,1.8,1.1,.03,2.6,CREAM,9)

base_bowling=bowling
def bowling():
    base_bowling()
    for x in [-2.5,2.5]:
        for dx in [-1.2,-.6,0,.6,1.2]:B('Lane plank seam',x+dx,-.4,.362,.012,8.9,.006,'#bd8c58')
        B('Lane scoring console',x,3.7,1.3,.8,.48,.5,DARK)
        B('Lane scoring display',x,3.96,1.35,.65,.025,.34,TEAL,glow=True)
        for dx in [-1,0,1]:
            B('Bowling bench cushion',x+dx,5.1,.65,.78,.7,.2,RED)
            B('Bowling bench back',x+dx,5.42,1,.78,.15,.6,RED)
    for i in range(4):sculpted_oval('Ball return rack ball',0,2.5+i*.37,1.05,.17,.17,.17,[RED,TEAL,GOLD,DARK][i])
