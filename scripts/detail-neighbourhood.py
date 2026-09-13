"""Additional native Blender street furniture and courtyard finishes."""
def add_detail(era):
    for x in [-10,10]:
        B('Terracotta courtyard',x,-4.8,.09,10,3,.12,'#d0aa7a',0)
        for i in range(20):
            for j in range(6):
                if (i+j)%2==0:B('Patterned ceramic tile',x-4.75+i*.5,-6.05+j*.5,.16,.47,.47,.015,'#8dad95',0)
    B('Street kopi cart',-10,-5.4,.65,1.8,.75,1.15,'#558b7e')
    B('Kopi cart marble top',-10,-5.4,1.25,1.95,.9,.13,'#e7d8b5')
    T('KOPI',-10,-4.96,.6,.3)
    for x in [-10.7,-9.3]:C('Coffee cart wheel',x,-5.4,.17,.15,.15,'#456b5b')
    for x in [-30,30]:
        for z in [-21,-12,-3,6,15,24]:
            B('Park boundary planter',x,z,.4,1.5,3,.65,'#b98c60')
            for dz in [-.8,0,.8]:S('Flowering hedge',x,z+dz,1,(.8,.7,.65),'#528b58')
    for x in [-37,37,-44,44]:
        for z in range(-33,34,10):tree(x,-z)
    for x in range(-30,31,8):
        for z in [-38,34]:tree(x,-z)
    for x,z in [(-4,-16),(4,16),(-18,2),(18,-1)]:
        B('Neighbourhood noticeboard',x,z,1.65,1.5,.16,1.25,'#527d64')
        for dx,c in [(-.42,'#e9cfa0'),(0,'#d58a66'),(.42,'#b8c69b')]:B('Community poster',x+dx,z+.095,1.7,.34,.025,.8,c,0)
        for dx in [-.6,.6]:B('Noticeboard posts',x+dx,z,.6,.1,.1,1.2,'#847448')
    # Every era has a visible coffee service on the open pavement.
    for name,x,z in [('AnimatedCoffeePot',-10,-5.4),('AnimatedCoffeeCup',-9.75,-5.3),('AnimatedCoffeeStream',-9.75,-5.3)]:
        o=bpy.data.objects.get(name)
        if o:o.location.x=x;o.location.y=-z
    if era=='estate':
        for i in range(96):
            a=i*math.tau/96;b=(i+1)*math.tau/96
            def rail(t,r):return (25+(4+r)*math.cos(t),10-(3+r)*math.sin(t),1.5+.7*(1+math.sin(t*2)))
            beam('Twin coaster rail',rail(a,.3),rail(b,.3),.06,'#d49255')
            if i%2==0:beam('Coaster track sleeper',rail(a,-.1),rail(a,.4),.04,'#5c8d75')
        B('Ride station deck',25,-5.5,.3,5,1.5,.5,'#bb9462')
        for x in [22.5,27.5]:
            B('Entrance gate post',x,-4.8,1.8,.2,.2,3.5,'#759c7c')
        B('Wonderland entrance sign',25,-4.8,3.4,5.3,.25,.65,'#cf9853')
        T('WONDERLAND',25,-4.61,3.23,.34,'#315a4b')
        stall(21,-4.6,'TICKETS','#639885')
        for x in [23,26,29]:seat(x,-16)
    # Convert added furniture into shared material batches for efficient rendering.
    groups={}
    for o in bpy.context.scene.objects:
        if o.type=='MESH' and not o.name.startswith('Animated'):groups.setdefault(o.data.materials[0].name,[]).append(o)
    for objs in groups.values():
        if len(objs)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join()

# REFINEMENT_RUN
from pathlib import Path
root=Path(WORLD_PROJECT_ROOT)
exec((root/'scripts/build-neighbourhood.py').read_text().split('def build_walk(era):')[0])
for era in ['estate','kampong','town','garden']:
    bpy.ops.wm.open_mainfile(filepath=str(root/'art'/('neighbourhood-'+era+'.blend')))
    palette.clear()
    # Move the existing TV set to face the camera and the audience.
    for name,dz in [('TV room back wall',7),('Television wooden cabinet',5),('TV antenna',5),('OUR EVENING TOGETHER',6.6)]:
        o=bpy.data.objects.get(name)
        if o:o.location.y+=dz
    screen=bpy.data.objects.get('AnimatedTVScreen')
    if screen:screen.location.y=-17.39
    add_detail(era)
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type=='MESH':o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(root/'public/assets/neighbourhood'/(era+'.glb')),export_format='GLB',use_selection=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'art'/('neighbourhood-'+era+'.blend')))
    bpy.context.scene.render.filepath=str(root/'public/assets/neighbourhood'/(era+'.png'))
    bpy.context.scene.cycles.samples=8
    bpy.ops.render.render(write_still=True)
    print('DETAIL_DONE',era)
