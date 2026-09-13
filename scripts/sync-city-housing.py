"""Bounded native authoring update to existing editable scenes, without regenerating rides."""
import bpy,json,math,random
from pathlib import Path
ROOT=Path.cwd()
exec((ROOT/'scripts/build-worlds.py').read_text().split('def build(key):')[0])
def B(name,x,z,y,w,d,h,c):return box(name,(x,-z,y),(w,d,h),c)
exec((ROOT/'scripts/trip-city-kit.py').read_text())
for era in ['fair','town']:
    path=ROOT/'public/assets/trip'/f'{era}.json';meta=json.loads(path.read_text())
    if any(a.get('kind')=='housing' for a in meta['activities']):continue
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/trip'/f'{era}.blend'))
    palette.clear()
    for m in bpy.data.materials:
        if m.name.startswith('#') and len(m.name)==7:palette[m.name]=m
    before=set(bpy.context.scene.objects)
    def solid(x,z,w,d):meta['solids'].append({'x':x,'z':z,'w':w,'d':d})
    add_city_housing(era,solid,meta['activities'])
    groups={}
    for o in set(bpy.context.scene.objects)-before:
        if o.type=='MESH':groups.setdefault(o.data.materials[0].name,[]).append(o)
    for name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        bpy.context.object.name='Housing '+name
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/trip'/f'{era}.blend'))
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/trip'/f'{era}.glb'),export_format='GLB',export_yup=True)
    path.write_text(json.dumps(meta,indent=2))
    print('HOUSING COMPLETE',era,flush=True)
