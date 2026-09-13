"""Populated outer districts, with native open-front buildings and resident stories.
Positions, art, social performances and accessible meeting points share this source.
"""
def add_districts(era, solid, activities, tree_count=24):
    # Reuse the richer editable shop/interior kit from the earlier neighbourhood.
    kit=dict(globals())
    source=(ROOT/'scripts/build-neighbourhood.py').read_text()
    exec(source[source.index('def B('):source.index('def textures(')],kit)
    configs={
      'river':[
        ('Quayside kopi',-23,-16,'kopi','KOPI & KAYA','Morning shift is over. Sit down; I will pull you a fresh kopi.','The lighter sock is for tea. The dark one has earned its coffee stains.'),
        ('Boat repair yard',-23,-3,'repair','BOAT REPAIRS','Mind the wet paint! We are getting this boat ready for the next load.','Those spare planks are for the hull; the little tins hold caulking and paint.'),
        ('Five-foot-way traders',-23,13,'market','SUNDRY GOODS','Rice, soap, biscuits in tins—what does your household need today?','Bring the tin back when you finish. It is far too useful to throw away.'),
        ('Attap village',22,-16,'wash','KAMPONG HOMES','The washing is nearly dry. Come into the shade while I finish.','We keep our baskets and sandals on the raised verandah when it rains.'),
        ('Fishing hamlet',23,-2,'fishing','FISHING JETTY','We are mending the net before the next trip. Watch your feet around the ropes.','The small catch goes into these woven baskets. Some will be salted for later.'),
        ('Roadside supper',22,15,'serve','ROADSIDE HAWKERS','The wok is hot and the stools are out. Pull up a seat.','My neighbour sells drinks, so we send hungry and thirsty customers to each other.'),
        ('Village games',5,-22,'game','CHAPTEH CORNER','One more kick! Try to keep the feather off the ground.','We take turns in the shade after helping at home.'),
        ('Riverbank gardens',1,22,'garden','BACKYARD GARDENS','These pandan leaves are going into the kitchen later.','A little patch can give a family herbs, chillies and something to share.')],
      'fair':[
        ('Cinema street',-23,-16,'cinema','PICTURE PALACE','The next show starts soon. My friends are saving our seats.','We came for the cinema, but there is always time for supper afterwards.'),
        ('Games alley',-23,-3,'game','RING TOSS','Three rings, one steady hand. I nearly had that bottle!','The audience makes every little game feel like a grand contest.'),
        ('Supper street',-23,15,'serve','SATAY & KOPI','We are keeping the coals going for the late crowd.','The best part of a night out is arguing about what to eat together.'),
        ('Ticket arcade',23,-16,'market','TICKETS & TREATS','Keep your tickets safe. We are meeting the others by the lights.','Some friends want the rides; some only came for the music and food.'),
        ('Ferris-wheel garden',23,-1,'wheel','SKY WHEEL','I am waiting for my friends to come down. They waved from the top!','Meet us here after your ride. Nobody gets left behind.'),
        ('Dance pavilion',22,15,'dance','DANCE PAVILION','Listen for the beat. We have been practising this step all evening.','A band, a bright dance floor and your friends—that is our night sorted.'),
        ('Open-air stage',0,-22,'stage','EVENING REVUE','The musicians are warming up. There is room beside us.','We clap for the performers and keep an eye out for our friends in the crowd.'),
        ('Lantern promenade',0,22,'stroll','LANTERN WALK','We are taking the long way round before heading home.','Follow the lanterns; they lead back to the food stalls.')],
      'estate':[
        ('Neighbourhood school',-23,-16,'school','PRIMARY SCHOOL','School is out. We are waiting for our friends before walking home.','Someone always wants a detour past the playground.'),
        ('Morning wet market',-23,-2,'market','WET MARKET','Come early for the vegetables. I am sorting today\'s delivery.','Everyone has a favourite stall, and every stallholder knows somebody\'s auntie.'),
        ('Void-deck tables',-23,15,'chess','VOID DECK','This move needs a little thought. Stay and watch our game.','The table is never empty for long; somebody always brings a new story.'),
        ('Provision row',23,-16,'kopi','PROVISION & KOPI','There are biscuits in the tins and cold drinks in the fridge.','We will keep an eye on the children while they play nearby.'),
        ('Community court',23,-1,'badminton','BADMINTON COURT','Your side serves next! Watch out for the breeze.','We share the court and change teams when another neighbour arrives.'),
        ('Supper downstairs',23,15,'serve','COOKED FOOD','Dinner is nearly ready. Take a seat while I finish the order.','Afterwards we might join the neighbours watching television.'),
        ('Community club',0,-22,'dance','COMMUNITY CLUB','We are practising together before the evening class.','The hall is for everybody—games, classes and celebrations.'),
        ('Playground lane',0,22,'game','AFTER-SCHOOL GAMES','Last one across the chalk squares has to start the next round!','We meet downstairs when the afternoon gets cooler.')],
      'town':[
        ('Library lane',-23,-16,'read','BOOKS & READING','I found the book I wanted. We are comparing what to borrow next.','It is a good place to spend a quiet afternoon before the bus home.'),
        ('Computer café',-23,-2,'arcade2','CYBER KAKI','Our team is waiting for one more player. Pull up a chair.','We take turns at the machines, then compare scores over a drink.'),
        ('Coffee-shop supper',-23,15,'kopi','KOPI & TOAST','Your toast is coming. My friend is ordering at the next stall.','This table is where we catch up after school and work.'),
        ('Neighbourhood shops',23,-16,'market','HEARTLAND SHOPS','I only came for stationery, but everyone is stopping to chat.','The shopkeepers are getting ready for the evening crowd.'),
        ('Bus interchange',23,0,'bus','BUS INTERCHANGE','We are waiting together. Our bus should be the next one.','Tap your card when you board; I keep mine in the front pocket.'),
        ('Court after school',23,16,'badminton','AFTER SCHOOL','One more game before we head home. Can you keep score?','We put our bags along the edge so nobody trips over them.'),
        ('Station neighbourhood',0,-22,'commute2','MRT STATION','Everyone is heading somewhere. I am meeting a friend after work.','We chose the station because it is easy for both of us to get here.'),
        ('Evening plaza',0,22,'chess','NEIGHBOURHOOD PLAZA','We have been talking longer than we have been playing.','The shops are still open, so there is no hurry to leave.')],
      'garden':[
        ('Garden café',-23,-16,'kopi','GARDEN KOPI','A kopi break before we finish watering. Join us in the shade.','The garden gives us plenty to talk about, even when nothing is ready to harvest.'),
        ('Community workshop',-23,-2,'repair','REPAIR & SHARE','We are fixing this bicycle instead of replacing it.','Bring a tool, lend a hand, or just tell us what is rattling.'),
        ('Waterfront food street',-23,15,'serve','WATERFRONT SUPPER','We picked this table for the view. Food first, lights later.','Everyone ordered something different so we can share.'),
        ('Conservatory approach',23,-16,'garden','GARDEN WALK','We are checking the plants before the evening visitors arrive.','Look closely: the smallest leaves can be just as interesting as the skyline.'),
        ('Supertree lawn',23,-1,'show','LIGHT GARDEN','We are finding a spot together for the lights.','Put your phone away for one minute and look up with us.'),
        ('Waterfront art',23,16,'paint','WATERFRONT SKETCHES','Hold still, skyline! The light changes before I finish a line.','My friends draw the same view, but our pages never look alike.'),
        ('Skyline promenade',0,-23,'stroll','SKYLINE WALK','The train, the gardens, the towers—there is always something moving.','We are taking the scenic way back. Want to walk with us?'),
        ('Bay-side exercise',0,23,'exercise','BAY WALK','One slow stretch, then we walk another lap together.','There is no race. We are here for the breeze and the company.')]
    }
    # A cross-section of the city: replace duplicate retail with work and learning.
    replacements={
      'river':{0:('River trading office','office','TRADING & SHIPPING'),1:('River workshop','industry','BOAT & TIMBER WORKS'),6:('Village school','school','VILLAGE SCHOOL')},
      'fair':{3:('Jurong factory shift','industry','TEXTILE WORKS'),6:('Neighbourhood school','school','SCHOOL & CANTEEN'),7:('Shenton office quarter','office','SHENTON OFFICES')},
      'estate':{3:('Light-industry workshop','industry','ELECTRONICS WORKS'),6:('Banking district','office','CITY OFFICES')},
      'town':{0:('CBD lunch hour','office','CITY OFFICES'),3:('Industrial dispatch yard','industry','GOODS & LOGISTICS'),7:('School courtyard','school','SECONDARY SCHOOL')},
      'garden':{1:('Clean-tech workshop','industry','REPAIR & CLEAN TECH'),3:('School learning garden','school','SCHOOL & ECO GARDEN'),6:('Marina office quarter','office','MARINA OFFICES')}
    }
    lines={
      'school':('Wait for us after class! We are walking to the canteen together.','Exercise books away, then a game before we go home. Did you finish your homework?'),
      'industry':('The delivery is here. Help me check the boxes before our kopi break.','We work as a team: prepare the goods, check the order, then pass it to dispatch.'),
      'office':('Lunch break! Shall we meet the others at the hawker stalls?','The morning was busy. A walk and a meal with friends makes a good break.')
    }
    for index,(name,kind,sign) in replacements[era].items():
        old=configs[era][index];configs[era][index]=(name,old[1],old[2],kind,sign,*lines[kind])
    districts=[]
    night=era in ['fair','garden']
    # Continuous outer lanes join the old streets; no teleport destinations.
    for x in [-19.5,19.5]: B('Outer walking street',x,0,.075,2.2,49,.08,'#acb5a2' if not night else '#65827a')
    for z in [-19.5,19.5]: B('Outer walking street',0,z,.075,53,2.2,.08,'#acb5a2' if not night else '#65827a')
    def rich_shop(x,z,sign,color):
        before=set(bpy.context.scene.objects)
        kit['shop'](0,0,sign,color,'kopi' if 'KOPI' in sign else 'provision')
        # Transform the entire reusable kit, including cups, roof tiles and bicycle.
        for o in set(bpy.context.scene.objects)-before:
            o.location*=.55;o.location.x+=x;o.location.y-=z;o.scale*=.55
        solid(x,z,5,3.3)
    def table(x,z):kit['table'](x,z)
    def signpost(name,x,z):
        B('District sign post',x,z,1,.07,.08,2,'#496c62')
        B('Painted district sign',x,z,1.8,3.8,.12,.6,'#295951')
        label(name,x,z+.08,1.7,.2)
    for index,(name,x,z,kind,sign,greeting,detail) in enumerate(configs[era]):
        # South/east districts face inward; meet on a clear apron beside the facade.
        meet={'x':x,'z':z+3 if z<19 else z-3}
        if abs(x)>20:meet={'x':x-3.4 if x>0 else x+3.4,'z':z+2.5}
        districts.append({'name':name,'role':kind,**meet})
        B('District paved apron',x,z,.12,8,7,.1,'#8c756b' if night else '#d2c0a0')
        signpost(sign,x,z+3.1 if z<19 else z-3.1)
        if kind in ['school','industry','office']:
            city_building(kind,era,x,z,sign,solid)
        elif kind in ['kopi','serve','market','read','cinema','arcade2','repair']:
            rich_shop(x,z,sign,['#4caaa0','#e0b35e','#c77469','#81a6be'][index%4])
            if kind=='serve':
                for dz in [3.6,4.8]:
                    if z+dz<24:table(x-1,z+dz)
            if kind=='cinema':
                for j in range(15):ball('Cinema marquee light',(x-2.5+j*.35,-z-1.8,2.2),(.075,.075,.075),'#ffe1a1')
            if kind=='read':
                for j in range(14):B('Books on outdoor shelf',x-2+j*.27,z+2.4,1.2,.2,.32,.5,['#a74742','#d0b153','#437c88'][j%3])
            if kind=='repair':
                kit['bicycle'](x+2,z+2.6)
                B('Workshop bench',x-1,z+2.5,.8,2,.7,.2,'#9e744f')
                for j in range(5):B('Tools on workbench',x-1.7+j*.3,z+2.5,.94,.2,.08,.08,'#9facac')
            if kind=='arcade2':
                for j in range(3):
                    B('Computer desk',x-1.3+j*1.3,z+2.4,.65,1.1,.6,.12,'#b59570')
                    B('CRT computer monitor',x-1.3+j*1.3,z+2.3,1.02,.65,.35,.55,'#aeb6ac')
                    B('Computer screen',x-1.3+j*1.3,z+2.49,1.04,.52,.025,.38,'#53a8be')
        elif kind in ['wash','fishing']:
            B('Raised attap dwelling',x,z,1.8,4,3,2.3,'#b28a53');roof(x,-z,3.1,4.6,3.6,'#705638');solid(x,z,4.6,3.6)
            for dx in [-1.6,1.6]:B('Timber house stilts',x+dx,z,.5,.15,2.8,.8,'#735538')
            B('Verandah',x,z+2,.65,4.8,1.2,.15,'#977046')
            for j in range(5):
                if kind=='wash':B('Batik on bamboo line',x-1.5+j*.65,z+2.6,2,.5,.025,.85,['#a84f64','#4e9a99','#dfbc70'][j%3])
                else:cyl('Fishing baskets',(x-1.5+j*.65,-z-2.6,.45),.25,.55,'#b38d4e')
            if kind=='fishing':
                for j in range(10):beam('Net stretched to dry',(x-2+j*.42,-z-2.8,.8),(x-2+j*.42,-z-3.3,2),.012,'#cfc095')
        elif kind in ['game','badminton','exercise','chess']:
            B('Community court surface',x,z,.18,6,5,.08,'#539787' if era!='fair' else '#9b5871')
            for dx in [-2.8,2.8]:B('Court boundary',x+dx,z,.225,.04,4.5,.01,'#ece4bc')
            for dz in [-2.25,2.25]:B('Court boundary',x,z+dz,.225,5.6,.04,.01,'#ece4bc')
            if kind=='badminton':
                for dx in [-2.7,2.7]:B('Badminton post',x+dx,z,1,.05,.05,1.6,'#4b665c')
                for j in range(12):beam('Badminton net mesh',(x-2.7+j*.49,-z,.9),(x-2.7+j*.49,-z,1.7),.009,'#e6dcb9')
                for y in [.9,1.1,1.3,1.5,1.7]:beam('Badminton net cord',(x-2.7,-z,y),(x+2.7,-z,y),.009,'#e6dcb9')
            if kind=='chess':
                table(x,z)
                for j in range(16):cyl('Chess piece',(x-.35+(j%4)*.23,-z-.35+(j//4)*.23,1.08),.055,.16,'#c85642' if j<8 else '#33453c')
            if kind=='game':
                for j in range(7):B('Chalk game square',x+(j%2)*.6,z-1.5+(j//2)*.6,.24,.5,.5,.014,'#ece4bc')
        elif kind in ['dance','stage']:
            B('Performance floor',x,z,.4,6,4,.6,'#a05b6f');solid(x,z,6,4)
            for dx in [-2.7,2.7]:
                B('Stage speaker',x+dx,z,.9,.55,.55,1.2,'#263443')
                B('Stage lighting truss',x+dx,z-1.8,2.3,.1,.1,4.2,'#59776c')
            B('Performance backdrop',x,z-1.9,2,6,.14,3.5,'#683d68')
            for j in range(9):ball('Stage coloured lamp',(x-2.4+j*.6,-z+1.8,3.8),(.12,.12,.12),'#ffe1a1')
        elif kind=='wheel':
            # A fully modelled ferris wheel with independently moving gondolas.
            for dx in [-2.2,2.2]:beam('Ferris wheel A frame',(x+dx,-z,.2),(x,-z,4.5),.13,'#d59c64')
            for j in range(32):
                a=j*math.tau/32;b=(j+1)*math.tau/32
                beam('Ferris wheel rim',(x+3.5*math.cos(a),-z,4.5+3.5*math.sin(a)),(x+3.5*math.cos(b),-z,4.5+3.5*math.sin(b)),.075,'#edc978')
                if j%4==0:
                    beam('Ferris wheel spoke',(x,-z,4.5),(x+3.5*math.cos(a),-z,4.5+3.5*math.sin(a)),.04,'#96b8a8')
                    B('anim_gondola_'+str(j//4),x+3.5*math.cos(a),z,4.5+3.5*math.sin(a),.9,.8,.5,'#c86570')
            solid(x,z,7.5,1.5)
        elif kind in ['bus','commute2']:
            B('Transit shelter roof',x,z,3.4,6,3,.15,'#7aa49a')
            for dx in [-2.6,2.6]:B('Transit shelter support',x+dx,z,1.7,.12,.12,3.4,'#798e85')
            kit['seat'](x,z+1.4)
            B('Arrival display',x,z,2.7,2,.2,.6,'#244b50');label('NEXT SERVICE',x,z+.13,2.62,.15)
            if kind=='bus':
                B('Bus body',x,z-1,1.1,5,1.7,1.8,'#b65254');solid(x,z-1,5,1.7)
                for dx in [-1.8,-.9,0,.9,1.8]:B('Bus window',x+dx,z-.12,1.4,.65,.04,.6,'#365d70')
                for dx in [-1.7,1.7]:
                    o=cyl('Bus wheel',(x+dx,-z+.1,.45),.38,.12,'#2f3d3e');o.rotation_euler.x=math.pi/2
        elif kind in ['garden','show','paint','stroll']:
            for dx in [-2.5,2.5]:
                B('Raised flower border',x+dx,z,.35,1,4,.6,'#95765b')
                for j in range(6):
                    ball('Flowering border',(x+dx,-z-1.5+j*.6,.8),(.5,.5,.4),'#4f935e')
                    ball('Orchid bloom',(x+dx,-z-1.5+j*.6,1.12),(.15,.15,.16),['#d98cab','#e1ba55','#d6d3b3'][j%3])
            kit['seat'](x,z+1.4)
            if kind=='paint':
                for dx in [-1,1]:
                    beam('Artist easel',(x+dx-.3,-z,.2),(x+dx,-z,1.8),.04,'#9f794d')
                    B('Waterfront painting',x+dx,z,1.4,.75,.08,.8,'#79aaad')
        # Three/four residents at each outer destination, spread along the apron.
        motion={'kopi':'serve','market':'browse','cinema':'chat','school':'read','industry':'work','office':'chat','fishing':'work','wash':'work','repair':'work','read':'read','arcade2':'read','bus':'queue','commute2':'queue','chess':'chat','game':'exercise','badminton':'exercise','dance':'dance','stage':'dance','wheel':'wheel','garden':'work','show':'chat','paint':'work','stroll':'stroll','exercise':'exercise','serve':'serve'}[kind]
        activities.append({'kind':'district_'+motion,'x':meet['x'],'z':meet['z'],'count':4,'name':name,'dialogue':[greeting,detail],'center':{'x':x,'z':z}})
        for dx in [-3.6,3.6]:
            kit['pot'](x+dx,z+2.2 if z<19 else z-2.2)
        if night:
            for dx in [-3,0,3]:
                B('Street lantern post',x+dx,z+3,1.5,.07,.07,3,'#476762')
                ball('District lantern',(x+dx,-z-3,3.1),(.16,.16,.2),'#ffe1a1')
    # Loose trees and shrubs outside the walkable districts make a landscape, not a tray.
    for j in range(tree_count):
        a=j*math.tau/tree_count;x=34*math.cos(a);z=31*math.sin(a)
        kit['tree'](x,-z,era=='river')
    return districts
