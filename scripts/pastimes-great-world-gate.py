"""Great World entrance silhouette: NAS 148032, Wong Kwan, c.1950.
Compressed exhibit arrangement; the ride's real position behind this gate is unknown.
"""
def great_world_gate(z=-6.65):
    stone='#d2cbbb'; trimcolor='#b3ad9b'; ink='#343d39'
    # Low connecting wings and two gated side portals flank an open central portal.
    for side in [-1,1]:
        B('Great World low wing',side*1.91,z,.75,1.36,.28,1.02,stone)
        B('Great World wing cornice',side*1.91,z,1.31,1.48,.38,.13,trimcolor)
        for dx in [-.42,.1,.45]:
            B('Great World wing vent',side*1.91+dx,z+.15,.94,.23,.025,.095,ink)
        for dx in [-.52,.52]:
            B('Great World side portal pier',side*2.95+dx,z,.91,.17,.4,1.45,stone)
        B('Great World side portal lintel',side*2.95,z,1.64,1.22,.42,.16,stone)
        # Shallow triangular pediment visible over the side entrances.
        rod('Great World side pediment',(side*2.95-.61,z,1.72),(side*2.95,z,1.89),.035,trimcolor)
        rod('Great World side pediment',(side*2.95,z,1.89),(side*2.95+.61,z,1.72),.035,trimcolor)
        for i in range(9):
            B('Great World gate upright',side*2.95-.42+i*.105,z+.04,.86,.024,.045,1.25,ink)
        for y in [.43,.84,1.25]:B('Great World gate cross rail',side*2.95,z+.04,y,.9,.045,.025,ink)
    for dx in [-.83,.83]:
        B('Great World central entrance pier',dx,z,.93,.22,.42,1.5,stone)
        B('Great World pier cap',dx,z,1.72,.31,.48,.12,trimcolor)
    B('Great World central name panel',0,z,1.97,1.96,.38,.45,stone)
    # Traditional characters run right-to-left in the photograph.
    bpy.ops.object.text_add(location=(0,-z-.205,1.84),rotation=(math.pi/2,0,0))
    lettering=bpy.context.object;lettering.name='Great World traditional entrance lettering'
    lettering.data.body='場藝遊界世大';lettering.data.align_x='CENTER';lettering.data.size=.26
    lettering.data.font=bpy.data.fonts.load('/System/Library/Fonts/STHeiti Medium.ttc')
    lettering.data.extrude=.003;lettering.data.materials.append(mat(ink))
    bpy.ops.object.convert(target='MESH')
    # Tall narrow vertical sign and unflagged finial, rather than an invented marquee.
    B('Great World vertical sign spine',0,z-.07,3.2,.31,.27,2.12,stone)
    B('Great World spine cap',0,z-.07,4.3,.37,.32,.1,trimcolor)
    for i,ch in enumerate('GREATWORLD'):
        S(ch,0,z+.08,4.05-i*.185,.18,ink)
    rod('Great World finial',(0,z-.07,4.33),(0,z-.07,4.94),.015,trimcolor)
    for height in [2.12,2.23,2.34]:
        curve('Great World curved metal band',[(xx,z-.05,height+.43*math.sqrt(max(0,1-(xx/1.14)**2))) for xx in [-1.14+j*2.28/32 for j in range(33)]],.012,trimcolor)
        for side in [-1,1]:rod('Great World horizontal metal band',(side*1.14,z-.05,height),(side*2.45,z-.05,height),.012,trimcolor)
