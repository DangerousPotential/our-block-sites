"""Wall-riding mechanics, not a portrait of a documented Great World performer."""
def wall_rider(z):
    from mathutils import Matrix
    start=set(bpy.data.objects)
    # Build a seated rider and unbranded motorcycle on a local horizontal plane,
    # then bank the assembly inward against the drum's vertical riding surface.
    for xx in [-.53,.53]:
        o=C('Motorcycle tyre',xx,0,.29,.29,.11,DARK,24);o.rotation_euler.x=math.pi/2
        for side in [-1,1]:
            curve('Motorcycle wheel rim',[(xx+.23*math.cos(a),side*.06,.29+.23*math.sin(a)) for a in [j*math.tau/24 for j in range(25)]],.015,'#aaa994')
            for j in range(12):
                a=j*math.tau/12
                rod('Motorcycle spoke',(xx,side*.062,.29),(xx+.23*math.cos(a),side*.062,.29+.23*math.sin(a)),.008,'#aaa994')
    for a,b in [((-.53,0,.29),(-.16,0,.66)),((-.53,0,.29),(.1,0,.29)),((-.16,0,.66),(.1,0,.29)),((-.16,0,.66),(.32,0,.64)),((.32,0,.64),(.53,0,.29))]:rod('Motorcycle tubular frame',a,b,.033,RED)
    ball('Motorcycle fuel tank',(.03,0,.68),(.26,.12,.105),RED)
    B('Motorcycle engine casing',0,0,.4,.3,.23,.22,'#777b77')
    for j in range(5):B('Engine cooling fin',0,0,.34+j*.035,.34,.25,.015,'#aba994')
    B('Motorcycle sprung saddle',-.27,0,.76,.33,.25,.07,'#493c32')
    for side in [-1,1]:
        rod('Motorcycle front fork',(.53,side*.06,.29),(.31,side*.06,.82),.025,'#aaa994')
        rod('Motorcycle handlebar',(.31,side*.04,.82),(.26,side*.2,.88),.023,DARK)
        rod('Motorcycle foot peg',(-.06,0,.32),(-.06,side*.22,.32),.02,DARK)
    rod('Motorcycle exhaust',(-.49,-.15,.22),(.18,-.15,.22),.027,'#aaa994')
    # Bent hips, knees, elbows and hands on bars replace the standing figurine.
    skin='#b67b52';shirt=CREAM
    rod('Rider forward-leaning torso',(-.27,0,.83),(-.08,0,1.16),.13,shirt)
    ball('Rider head',(.0,0,1.32),(.13,.12,.16),skin)
    ball('Rider short hair',(-.025,.01,1.44),(.13,.12,.07),DARK)
    for side in [-1,1]:
        rod('Rider bent thigh',(-.28,side*.09,.8),(.02,side*.2,.56),.067,DARK)
        rod('Rider lower leg',(.02,side*.2,.56),(-.1,side*.21,.34),.058,DARK)
        B('Rider boot',-.04,side*.21,.31,.22,.1,.075,DARK)
        rod('Rider sleeve',(-.08,side*.11,1.1),(.06,side*.18,.94),.055,shirt)
        rod('Rider forearm',(.06,side*.18,.94),(.26,side*.2,.88),.04,skin)
    assembly=[o for o in bpy.data.objects if o not in start]
    bpy.context.view_layer.update()
    bank=Matrix.Translation((0,-(z+2.97),3.15)) @ Matrix.Rotation(math.radians(-75),4,'X')
    for o in assembly:o.matrix_world=bank @ o.matrix_world
    bpy.context.view_layer.update()
    return animation_root('anim_pastime_motorcycle',assembly,(0,z,0))
