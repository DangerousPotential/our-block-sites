"""Run in an empty Blender session, with WORLD_PROJECT_ROOT set to the checkout."""
from pathlib import Path
root = Path(WORLD_PROJECT_ROOT)
# Reuse our original material/mesh helpers without rebuilding the board worlds.
exec((root/'scripts/build-worlds.py').read_text().split("for era in ['kampong'")[0])
OUT=root/'public/assets/activities';OUT.mkdir(parents=True,exist_ok=True)
def fresh():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    box('Stage base',(0,0,-.25),(15,11,.5),'#315e62',.2)
    box('Paving',(0,0,.04),(14.8,10.8,.1),'#e5cba0',.1)
def export(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True)
    bpy.ops.object.light_add(type='AREA',location=(-5,-5,12));bpy.context.object.data.energy=1800;bpy.context.object.data.size=8
    bpy.ops.object.camera_add(location=(13,-19,16));cam=bpy.context.object
    cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=20
    scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=16
    scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/('activity-'+name+'.blend')))
    bpy.ops.render.render(write_still=True)
fresh()
# Open-front kopitiam lets players see the seller, shelves, kettle and cups.
box('Coffee shop back wall',(0,3,1.7),(10,.2,3.5),'#73a3a0')
box('Tiled counter',(0,.3,.6),(5,.7,1.2),'#c48945',.06)
for x in [-2,-1,0,1,2]:
    box('Counter tile',(x,-.06,.65),(.94,.04,.8),'#ede3b8')
    cyl('Cup saucer',(x,.1,1.24),.18,.03,'#fff2d2')
    cyl('Kopi cup',(x,.1,1.37),.12,.23,'#ede9d3')
for x in [-3,3]:
    for y in [-2,-3.8]:
        cyl('Marble table',(x,y,.85),.65,.12,'#e9e1cf')
        cyl('Table base',(x,y,.45),.09,.8,'#496566')
        for dx in [-.85,.85]:cyl('Wood stool',(x+dx,y,.42),.22,.65,'#a76b41')
for x in [-3,-1,1,3]:
    box('Wall shelf',(x,2.75,1.5),(1.6,.4,.12),'#694a35')
    for dx in [-.45,0,.45]:cyl('Coffee tin',(x+dx,2.65,1.8),.15,.5,'#b46539')
cyl('Coffee urn',(-1.8,1.8,1),.4,1.8,'#a0b1aa')
beam('Coffee spout',(-1.8,1.8,.9),(-1.8,1.25,.85),.06,'#d0d5c5')
text('KOPI  /  TOAST  /  GOOD COMPANY',(0,2.85,2.7),.4)
export('kopi')
fresh()
for x,label,color in [(-4,'PANDAN','#528f64'),(0,'EGGS','#d7a54e'),(4,'COCONUT','#b96b43')]:
    box('Market counter',(x,1,.6),(2.8,1.4,1.2),color,.06)
    roof(x,1,2.6,3.2,2,'#c95c40')
    for dx in [-1.1,1.1]:box('Awning pole',(x+dx,1,1.6),(.1,.1,2.3),'#675b48')
    text(label,(x,.2,1.65),.3)
    for dx in [-.8,-.3,.3,.8]:ball(label,(x+dx,.7,1.4),(.22,.22,.2),color)
for x in [-6,6]:tree(x,-2)
export('market')
fresh()
box('Performance stage',(0,1,.4),(8,4,.8),'#b65c41',.1)
box('Theatre back',(0,3,2.4),(9,.3,4),'#274b59')
for x in [-3.7,3.7]:box('Red curtain',(x,2.6,2.1),(1.1,.3,3.5),'#b54848')
text('GAY WORLD',(0,2.75,3.5),.65,'#efd079')
text('AN EVENING TOGETHER',(0,2.74,2.9),.23)
for x in [-5,-3,-1,1,3,5]:
    ball('Festoon light',(x,-.1,3.5),(.12,.12,.12),'#f9d46e')
    for y in [-2,-3.4]:box('Audience bench',(x,y,.5),(1.4,.5,.18),'#ae8051')
for x in [-5.8,5.8]:box('Food stall',(x,1,.7),(1.3,2,1.4),'#59a39a')
export('stage')
fresh()
def point(t):return (5*math.cos(t),3*math.sin(t),1.3+.85*(1+math.sin(2*t)))
for i in range(96):
    t=i*math.tau/96;a=point(t);b=point(t+math.tau/96)
    for dx in [-.22,.22]:beam('Coaster rail',(a[0]+dx,a[1],a[2]),(b[0]+dx,b[1],b[2]),.045,'#c9503a')
    if i%4==0:
        beam('Track support',(a[0],a[1],.1),a,.07,'#4a807d')
        beam('Sleeper',(a[0]-.35,a[1],a[2]),(a[0]+.35,a[1],a[2]),.055,'#e5b05b')
box('CoasterCar',(0,0,0),(.85,1.2,.48),'#e8aa35',.12)
for x in [-2,2]:
    box('Ticket kiosk',(x,0,.65),(1.1,1,1.3),'#498e9a')
    roof(x,0,1.5,1.4,1.3,'#bc5748')
text('WONDERLAND',(0,4.4,2.9),.6,'#294b50')
export('coaster')
fresh()
dragon(-2,1)
for j in range(6):
    box('Hopscotch square',(-2+j*.75,-1.8,.12),(.65,.65,.07),['#d5aa59','#c87859'][j%2])
for x in [-5,5]:tree(x,2)
beam('Swing frame',(-3,2,.1),(-3,2,3),.09,'#5c9794')
beam('Swing frame',(3,2,.1),(3,2,3),.09,'#5c9794')
beam('Swing crossbar',(-3,2,3),(3,2,3),.1,'#5c9794')
for x in [-1,1]:
    beam('Swing chain',(x,2,3),(x,2,.8),.02,'#6b6861')
box('Swing seat',(0,2,.8),(2.1,.5,.12),'#bc7953')
export('playground')
fresh()
for x,label in [(-3,'PANDAN'),(0,'CHILLI'),(3,'GREENS')]:
    box('Raised bed',(x,.5,.45),(2.2,3,.7),'#956d4c',.07)
    box('Garden soil',(x,.5,.81),(2,2.8,.06),'#614f3b')
    for y in [-.4,.5,1.4]:
        for dx in [-.5,.5]:ball('Growing vegetables',(x+dx,y,1.04),(.35,.35,.4),'#57864b')
    text(label,(x,-1.05,.7),.26)
box('Community bench',(0,3.6,.65),(5,.5,.2),'#bd915d')
for x in [-6,6]:tree(x,2)
export('garden')
print('ACTIVITY_ASSETS_COMPLETE')
