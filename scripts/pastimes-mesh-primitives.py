"""Cached Blender mesh primitives, avoiding a dependency-graph update per prop."""
primitive_meshes={}
def cached_object(key,name,vertices,faces,location,scale,color):
    if key not in primitive_meshes:
        mesh=bpy.data.meshes.new(name+' shared mesh');mesh.from_pydata(vertices,[],faces);mesh.materials.append(mat(color));mesh.use_fake_user=True;primitive_meshes[key]=mesh
    o=bpy.data.objects.new(name,primitive_meshes[key].copy());bpy.context.collection.objects.link(o);o.location=location;o.scale=scale
    return o

def box(name,loc,scale,color,bevel=0):
    vertices=[(x,y,z) for x in [-.5,.5] for y in [-.5,.5] for z in [-.5,.5]]
    faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
    o=cached_object(('box',color),name,vertices,faces,loc,scale,color)
    if bevel:
        # Bevel after scale for a consistent world-space cornice radius.
        o.data=o.data.copy();bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        m=o.modifiers.new('Rounded moulding','BEVEL');m.width=bevel;m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name);o.select_set(False)
    return o

def cyl(name,loc,r,depth,color,vertices=12):
    points=[(math.cos(j*math.tau/vertices),math.sin(j*math.tau/vertices),z) for z in [-.5,.5] for j in range(vertices)]
    faces=[tuple(range(vertices-1,-1,-1)),tuple(range(vertices,vertices*2))]
    faces.extend((j,(j+1)%vertices,(j+1)%vertices+vertices,j+vertices) for j in range(vertices))
    return cached_object(('cylinder',vertices,color),name,points,faces,loc,(r,r,depth),color)

def ball(name,loc,scale,color):
    key=('ico',color)
    if key not in primitive_meshes:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1)
        temporary=bpy.context.object;mesh=temporary.data;mesh.materials.append(mat(color));mesh.use_fake_user=True;primitive_meshes[key]=mesh
        bpy.data.objects.remove(temporary,do_unlink=True)
    o=bpy.data.objects.new(name,primitive_meshes[key].copy());bpy.context.collection.objects.link(o);o.location=loc;o.scale=scale
    return o
