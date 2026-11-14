#!/usr/bin/env python3
"""Generate 250 world tasks for the Fire Babys 3D arena. 5 categories x 50 tasks."""
import json

tasks = []
tid = 0
def add(cat, name, desc, event, target):
    global tid
    tid += 1
    tasks.append({
        "id": f"{cat[:3]}-{tid:03d}",
        "category": cat,
        "name": name,
        "desc": desc,
        "event": event,
        "target": target,
    })

# ---------- 1. WARRIOR (combat) : 50 tasks ----------
ko_tiers = [1,2,3,5,8,10,15,20,30,40,50,75,100,150,200]
for i, t in enumerate(ko_tiers):
    add("warrior", f"Knock Out {t} Foe{'s' if t>1 else ''}",
        f"Score {t} KO{'s' if t>1 else ''} in the arena.", "ko", t)
atk_tiers = [10,25,50,100,200,350,500,750,1000,1500,2500,4000]
for t in atk_tiers:
    add("warrior", f"Land {t} Attacks", f"Hit opponents with {t} attacks.", "attack", t)
blk_tiers = [5,10,25,50,75,100,150,250,400,600,900]
for t in blk_tiers:
    add("warrior", f"Block {t} Attacks", f"Block {t} incoming attacks.", "block", t)
dmg_tiers = [10,25,50,100,200,400,750,1200,2000]
for t in dmg_tiers:
    add("warrior", f"Deal {t} Damage", f"Deal {t} total damage to opponents.", "damage", t)
# warrior = 15+12+11+9 = 47, need 3 more
add("warrior", "First Blood", "Score your first KO.", "ko", 1)
add("warrior", "Untouchable", "Block 25 attacks without dying.", "block_streak", 25)
add("warrior", "Brawler", "Land 5000 attacks.", "attack", 5000)
# warrior total: 50

# ---------- 2. GUARDIAN (firefighting) : 50 tasks ----------
ext_tiers = [1,2,3,5,8,10,15,20,30,40,50,75,100,150,200,300,450,600,800,1000,1500,2000]
for t in ext_tiers:
    add("guardian", f"Extinguish {t} Fire{'s' if t>1 else ''}",
        f"Put out {t} burning fire{'s' if t>1 else ''}.", "extinguish", t)
extv_tiers = [1,5,10,25,50,100,200,350,500,750]
for t in extv_tiers:
    add("guardian", f"Versus Saver: {t}", f"Extinguish {t} fires in versus mode.", "extinguish_versus", t)
# guardian = 22+10 = 32, need 18 more
streak_tiers = [3,5,8,10,15,20,30,50]
for t in streak_tiers:
    add("guardian", f"Hot Streak {t}", f"Extinguish {t} fires without dying.", "extinguish_streak", t)
# guardian = 40, need 10 more
add("guardian", "Fire Chief", "Extinguish 3000 fires.", "extinguish", 3000)
add("guardian", "Inferno Tamer", "Extinguish 5000 fires.", "extinguish", 5000)
add("guardian", "First Rescue", "Extinguish your first fire.", "extinguish", 1)
add("guardian", "Decade of Duty", "Extinguish 10 fires in one match.", "extinguish_match", 10)
add("guardian", "Firestorm", "Extinguish 25 fires in one match.", "extinguish_match", 25)
add("guardian", "Blaze Runner", "Extinguish 50 fires in one match.", "extinguish_match", 50)
add("guardian", "Smoke Jumper", "Extinguish 100 fires without dying once.", "extinguish_streak", 100)
add("guardian", "Ember Guard", "Play 10 co-op firefighting sessions.", "coop_extinguish", 10)
add("guardian", "Aqua Ally", "Extinguish 250 fires in versus mode.", "extinguish_versus", 250)
add("guardian", "Living Legend", "Extinguish 10000 fires.", "extinguish", 10000)
# guardian total: 50

# ---------- 3. EXPLORER (movement/time) : 50 tasks ----------
dist_tiers = [100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000,1000000,2500000,5000000]
for t in dist_tiers:
    label = f"{t}m" if t < 1000 else f"{t//1000}km"
    add("explorer", f"Travel {label}", f"Travel {label} in the arena.", "distance", t)
jump_tiers = [10,25,50,100,200,350,500,750,1000,1500,2500,4000,6000,10000,15000]
for t in jump_tiers:
    add("explorer", f"Jump {t} Times", f"Jump {t} times.", "jump", t)
time_tiers = [5,10,15,30,45,60,90,120,180,240,360,480,600,900,1200,1800,2400,3600,5400,7200]
for t in time_tiers:
    label = f"{t} min" if t < 60 else f"{t//60} hr"
    add("explorer", f"Play {label}", f"Spend {label} in the arena.", "time_min", t)
# explorer = 15+15+20 = 50

# ---------- 4. CHAMPION (versus/co-op) : 50 tasks ----------
vp_tiers = [1,3,5,10,15,20,30,50,75,100,150,200,300,500,750]
for t in vp_tiers:
    add("champion", f"Play {t} Versus Match{'es' if t>1 else ''}",
        f"Complete {t} versus match{'es' if t>1 else ''}.", "versus_play", t)
vw_tiers = [1,2,3,5,8,10,15,20,30,40,50,75,100,150,200]
for t in vw_tiers:
    add("champion", f"Win {t} Versus Match{'es' if t>1 else ''}",
        f"Win {t} versus match{'es' if t>1 else ''}.", "versus_win", t)
coop_tiers = [1,3,5,10,20,30,50,75,100,150]
for t in coop_tiers:
    add("champion", f"Co-op {t} Session{'s' if t>1 else ''}",
        f"Complete {t} co-op session{'s' if t>1 else ''}.", "coop_play", t)
# champion = 15+15+10 = 40, need 10 more
ws_tiers = [2,3,4,5,6,8,10]
for t in ws_tiers:
    add("champion", f"Win Streak {t}", f"Win {t} versus matches in a row.", "win_streak", t)
add("champion", "Contender", "Win 300 versus matches.", "versus_win", 300)
add("champion", "Gladiator", "Play 1000 versus matches.", "versus_play", 1000)
add("champion", "Team Player", "Complete 250 co-op sessions.", "coop_play", 250)
# champion total: 50

# ---------- 5. LEGEND (epic mixed) : 50 tasks ----------
legend_tasks = [
    ("Rising Star", "KO 5 foes and extinguish 10 fires.", "mixed_ko5_ext10", 1),
    ("Double Duty", "Win a versus match and extinguish 20 fires in one day.", "mixed_win_ext20", 1),
    ("Marathoner", "Travel 10km and play 2 hours total.", "mixed_dist10k_time120", 1),
    ("Unstoppable", "Get a 5-KO streak.", "ko_streak", 5),
    ("Iron Wall", "Block 1000 attacks.", "block", 1000),
    ("Pyro Pro", "Extinguish 2500 fires.", "extinguish", 2500),
    ("Century Club", "Score 100 KOs.", "ko", 100),
    ("Veteran", "Play 100 hours in the arena.", "time_min", 6000),
    ("World Traveler", "Travel 100km.", "distance", 100000),
    ("Sky High", "Jump 25000 times.", "jump", 25000),
    ("Champion's Path", "Win 500 versus matches.", "versus_win", 500),
    ("Dedicated", "Complete 500 versus matches.", "versus_play", 500),
    ("Fire Master", "Extinguish 15000 fires.", "extinguish", 15000),
    ("Demolisher", "Deal 5000 damage.", "damage", 5000),
    ("Aggressor", "Land 10000 attacks.", "attack", 10000),
    ("Survivor", "Block 2000 attacks.", "block", 2000),
    ("Twin Terrors", "KO 250 foes.", "ko", 250),
    ("Inferno King", "Extinguish 25000 fires.", "extinguish", 25000),
    ("Unbreakable", "Get a 10-win streak.", "win_streak", 10),
    ("Explorer Elite", "Travel 500km.", "distance", 500000),
    ("Bounce Master", "Jump 50000 times.", "jump", 50000),
    ("War Machine", "Land 25000 attacks.", "attack", 25000),
    ("Aegis", "Block 5000 attacks.", "block", 5000),
    ("Annihilator", "Deal 15000 damage.", "damage", 15000),
    ("Conqueror", "Win 1000 versus matches.", "versus_win", 1000),
    ("Globe Trotter", "Travel 2500km.", "distance", 2500000),
    ("Everlasting", "Play 300 hours.", "time_min", 18000),
    ("KO Royalty", "Score 500 KOs.", "ko", 500),
    ("Flame Emperor", "Extinguish 50000 fires.", "extinguish", 50000),
    ("God of War", "Land 50000 attacks.", "attack", 50000),
    ("Perfect Guard", "Block 10000 attacks.", "block", 10000),
    ("Destroyer", "Deal 30000 damage.", "damage", 30000),
    ("Immortal", "Play 500 hours.", "time_min", 30000),
    ("Planet Walker", "Travel 5000km.", "distance", 5000000),
    ("Moon Jumper", "Jump 100000 times.", "jump", 100000),
    ("KO Deity", "Score 1000 KOs.", "ko", 1000),
    ("Eternal Flame", "Extinguish 100000 fires.", "extinguish", 100000),
    ("War God", "Land 100000 attacks.", "attack", 100000),
    ("Diamond Wall", "Block 25000 attacks.", "block", 25000),
    ("Obliterator", "Deal 75000 damage.", "damage", 75000),
    ("Mythic", "Win 2000 versus matches.", "versus_win", 2000),
    ("Time Lord", "Play 1000 hours.", "time_min", 60000),
    ("Universe Walker", "Travel 10000km.", "distance", 10000000),
    ("Star Leaper", "Jump 250000 times.", "jump", 250000),
    ("Titan Slayer", "Score 2500 KOs.", "ko", 2500),
    ("Sun Tamer", "Extinguish 250000 fires.", "extinguish", 250000),
    ("Ultimate Warrior", "Land 250000 attacks.", "attack", 250000),
    ("Adamant Shield", "Block 50000 attacks.", "block", 50000),
    ("World Ender", "Deal 150000 damage.", "damage", 150000),
    ("Eternal Champion", "Complete all 249 other tasks.", "all_tasks", 249),
]
for name, desc, event, target in legend_tasks:
    add("legend", name, desc, event, target)
# legend total: 50

print(f"Total tasks: {len(tasks)}")
cats = {}
for t in tasks:
    cats[t["category"]] = cats.get(t["category"], 0) + 1
print("By category:", cats)
assert len(tasks) == 250, f"Expected 250, got {len(tasks)}"
for c in ["warrior", "guardian", "explorer", "champion", "legend"]:
    assert cats[c] == 50, f"{c}: {cats[c]}"

with open("tasks-250.json", "w") as f:
    json.dump(tasks, f, indent=1)

# Also emit as JS
with open("tasks-250.js", "w") as f:
    f.write("/* Fire Babys 3D arena: 250 world tasks. Complete all -> Silver Armor (+20%). */\n")
    f.write("var FB_TASKS_250 = ")
    json.dump(tasks, f, indent=1)
    f.write(";\n")
print("Wrote tasks-250.json and tasks-250.js")
