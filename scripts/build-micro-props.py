"""Small original Blender prop library for resident performance choreography.
Local Blender Z is up; glTF exports to game Y-up. No changes to world geometry.
"""
import bpy, math
from pathlib import Path
ROOT=Path.cwd()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
def material(color):
    if color not in materials:
        m=bpy.data.materials.new(str(color));m.diffuse_color=(*color,1);m.use_nodes=True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.7
        materials[color]=m
    return materials[color]
cream=(.95,.83,.57);metal=(.28,.34,.34);wood=(.38,.19,.08);white=(.9,.92,.85);orange=(.95,.30,.035);green=(.18,.47,.16)
parts=[]
def finish(o,color):
    o.data.materials.append(material(color));parts.append(o);return o
def box(p,s,c):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s;return finish(o,c)
def sphere(p,r,c):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=r,location=p);return finish(bpy.context.object,c)
def cylinder(p,r,h,c):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=h,location=p);return finish(bpy.context.object,c)
def ring(p,r,t,c):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=20,minor_segments=6,location=p);return finish(bpy.context.object,c)
def rod(a,b,r,c):
    from mathutils import Vector
    delta=Vector(b)-Vector(a);o=cylinder((Vector(a)+Vector(b))/2,r,delta.length,c);o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o
def prop(name,build):
    parts.clear();build();bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
def ball():
    sphere((0,0,0),.23,orange)
    for axis in range(3):
        o=ring((0,0,0),.232,.012,wood)
        if axis:o.rotation_euler[axis-1]=math.pi/2
def wok():
    cylinder((0,0,.0),.4,.1,metal);ring((0,0,.07),.4,.055,metal)
    rod((.3,0,0),(.85,0,.1),.04,wood)
def noodles():
    for j in range(6):
        for k in range(8):
            a=k*.6;b=(k+1)*.6;r=.08+j*.025
            rod((r*math.cos(a),r*math.sin(a),j*.015),(r*math.cos(b),r*math.sin(b),j*.015),.018,cream)
    for x,y in [(-.1,0),(.1,.1),(0,-.1)]:box((x,y,.12),(.08,.09,.035),green)
def pot():
    cylinder((0,0,.12),.18,.27,metal);ring((0,0,.28),.18,.035,white)
    rod((.12,0,.2),(.42,0,.3),.045,metal)
    o=ring((-.19,0,.12),.12,.025,metal);o.rotation_euler.x=math.pi/2
def bowl():
    cylinder((0,0,.05),.2,.1,white);ring((0,0,.11),.22,.04,white);cylinder((0,0,.12),.17,.012,cream)
def racket():
    rod((0,0,0),(0,0,.38),.026,wood)
    o=ring((0,0,.57),.19,.025,metal);o.rotation_euler.x=math.pi/2
    for d in [-.1,0,.1]:
        rod((d,0,.41),(d,0,.73),.006,white);rod((-.16,0,.57+d),(.16,0,.57+d),.006,white)
def book():
    for side in [-1,1]:
        o=box((side*.16,0,.02),(.31,.34,.05),(.24,.49,.55));o.rotation_euler.y=side*.18
        for j in range(4):box((side*.16,-.11+j*.07,.06),(.23,.013,.008),white)
def fish():
    o=sphere((0,0,0),.14,(.48,.72,.76));o.scale=(1.6,.5,.65)
    box((-.24,0,0),(.12,.04,.2),(.48,.72,.76));sphere((.14,-.06,.03),.023,metal)
prop('micro_ball',ball)
prop('micro_wok',wok)
prop('micro_noodles',noodles)
prop('micro_pot',pot)
prop('micro_bowl',bowl)
prop('micro_ladle',lambda:(rod((0,0,0),(0,0,.55),.02,wood),sphere((0,0,.6),.1,metal)))
prop('micro_chopsticks',lambda:(rod((-.025,0,0),(-.05,0,.38),.012,wood),rod((.025,0,0),(.05,0,.38),.012,wood)))
prop('micro_burner',lambda:(box((0,0,-.1),(.85,.65,.15),metal),ring((0,0,.02),.27,.04,orange),*[box((x,y,-.43),(.055,.055,.7),metal) for x in [-.32,.32] for y in [-.23,.23]]))
prop('micro_steam',lambda:sphere((0,0,0),.11,(.75,.83,.83)))
prop('micro_stream',lambda:cylinder((0,0,0),.018,1,wood))
prop('micro_drop',lambda:sphere((0,0,0),.04,(.24,.67,.8)))
prop('micro_racket',racket)
prop('micro_shuttle',lambda:(sphere((0,0,0),.06,cream),*[rod((0,0,0),(.12*math.cos(j),.12*math.sin(j),.22),.025,white) for j in range(6)]))
prop('micro_book',book)
prop('micro_page',lambda:box((.14,0,0),(.27,.3,.012),cream))
prop('micro_bottle',lambda:(cylinder((0,0,.16),.09,.32,green),cylinder((0,0,.38),.045,.15,green),cylinder((0,0,.47),.05,.03,cream)))
prop('micro_fish',fish)
prop('micro_rod',lambda:rod((0,0,0),(.7,0,1.4),.018,wood))
prop('micro_hammer',lambda:(rod((0,0,0),(0,0,.32),.03,wood),box((0,0,.36),(.32,.09,.09),metal)))
prop('micro_brush',lambda:(rod((0,0,0),(0,0,.35),.016,wood),box((0,0,.4),(.07,.035,.1),(.82,.35,.45))))
prop('micro_cloth',lambda:box((0,0,0),(.5,.035,.55),(.71,.22,.38)))
prop('micro_piece',lambda:(cylinder((0,0,.035),.09,.07,wood),sphere((0,0,.11),.07,orange)))
prop('micro_basket',lambda:(box((0,0,.1),(.45,.32,.2),wood),*[sphere((-.14+i*.14,0,.24),.085,green) for i in range(3)]))
prop('micro_ticket',lambda:box((0,0,0),(.22,.015,.13),cream))
prop('micro_mic',lambda:(rod((0,0,0),(0,0,.28),.025,metal),sphere((0,0,.32),.06,white)))
prop('micro_hand',lambda:sphere((0,0,0),.065,cream))
prop('micro_ring',lambda:ring((0,0,0),.17,.025,orange))
def satchel():
    box((0,0,.08),(.38,.14,.35),(.20,.34,.49))
    box((0,-.085,.04),(.31,.05,.15),(.3,.48,.61))
    for dx in [-.11,.11]:rod((dx,0,.22),(dx,0,.34),.02,wood)
    rod((-.11,0,.34),(.11,0,.34),.02,wood)
def briefcase():
    box((0,0,0),(.48,.13,.3),wood)
    rod((-.09,0,.16),(-.09,0,.25),.02,metal);rod((.09,0,.16),(.09,0,.25),.02,metal)
    rod((-.09,0,.25),(.09,0,.25),.02,metal)
    for dx in [-.13,.13]:box((dx,-.07,.05),(.04,.02,.06),cream)
def parcel():
    box((0,0,.14),(.45,.4,.3),(.66,.46,.25))
    box((0,0,.295),(.06,.41,.012),cream);box((0,-.205,.14),(.06,.012,.3),cream)
    box((.13,-.21,.17),(.13,.014,.1),white)
prop('micro_satchel',satchel)
prop('micro_briefcase',briefcase)
prop('micro_parcel',parcel)
def flag_emblem():
    # Crescent and five stars on the red half of the school flag, not a plain bicolour.
    for i in range(18):
        a=math.radians(55+i*250/18);b=math.radians(55+(i+1)*250/18)
        rod((-.19+.075*math.cos(a),0,.075*math.sin(a)),(-.19+.075*math.cos(b),0,.075*math.sin(b)),.003+.01*math.sin(math.pi*(i+.5)/18),white)
    for j in range(5):
        a=math.pi/2+j*math.tau/5;cx=-.065+math.cos(a)*.05;cz=math.sin(a)*.05
        verts=[(cx+math.cos(math.pi/2+k*math.pi/5)*(.018 if k%2==0 else .007),0,cz+math.sin(math.pi/2+k*math.pi/5)*(.018 if k%2==0 else .007)) for k in range(10)]
        mesh=bpy.data.meshes.new('Flag star');mesh.from_pydata(verts,[],[tuple(range(10))]);mesh.update()
        o=bpy.data.objects.new('Flag star',mesh);bpy.context.collection.objects.link(o);finish(o,white)
prop('micro_flag_emblem',flag_emblem)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/trip/micro-props.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/trip/micro-props.glb'),export_format='GLB',export_yup=True)
print('MICRO PROPS COMPLETE',flush=True)
