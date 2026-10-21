// Polyfill for CanvasRenderingContext2D.roundRect on older mobile browsers
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    var rad = typeof r === "number" ? r : 6;
    this.moveTo(x + rad, y);
    this.arcTo(x + w, y, x + w, y + h, rad);
    this.arcTo(x + w, y + h, x, y + h, rad);
    this.arcTo(x, y + h, x, y, rad);
    this.arcTo(x, y, x + w, y, rad);
    this.closePath();
    return this;
  };
}

/* ==========================================================================
   Ancient Arcane Bastion (古域魔陣：守護神殿) - Core 2.5D Engine (v1.4.2)
   - Procedural Figures for ALL 11 Monsters and Friendly Troops (No Circles!)
   - Town Hall (守護大本營) Defense & Defeat Mechanics
   - Dual Wall & Town Hall HP Bars and Real-Time Road Radar
   - Multi-Lane Challenging Wave Spawning & Monster Siege AI
   ========================================================================== */

window.GameEngine = {
  canvas: null,
  ctx: null,
  width: 2100,
  height: 1450,
  camera: { x: 0, y: 0, zoom: 1, userZoomMult: 0.85 },
  lastTime: 0,
  running: false,
  gameSpeed: 1,
  aiMode: 0, // 0 = Manual, 1 = Auto-Loot, 2 = Full Auto-Step
  isDefeated: false,
  gateBreached: false,
  roadEnemyCounts: { road_north: 0, road_center: 0, road_south: 0 },

  // Persistent Player State
  state: {
    gold: 220,
    mana: 45,
    souls: 4,
    divinity: 0,
    rebirthCount: 0,
    realmId: 1,
    wave: 1,
    maxWaveReached: 1,
    endlessMode: false,
    heroClassId: "archmage",
    heroLevel: 1,
    heroXp: 0,
    heroWeaponForgeLv: 0,
    townHallLevel: 1,
    unlockedZones: [0],
    unlockedBlueprints: ["bp_arcane_spire", "bp_knight_statue", "bp_flame_mage", "bp_guard_barracks"],
    pads: {},
    talents: {},
    equipped: { weapon: null, armor: null, ring: null, relic: null },
    inventory: [],
    questIndex: 0,
    totalKills: 0,
    totalGoldEarned: 220,
    playSeconds: 0,
    lastSaveTimestamp: Date.now()
  },

  hero: {
    x: 560,
    y: 520,
    vx: 0,
    vy: 0,
    radius: 20,
    facing: 1,
    atkTimer: 0,
    targetX: null,
    targetY: null,
    activePadId: null,
    animPhase: 0
  },

  wall: {
    hp: 850,
    maxHp: 850,
    x1: 350,
    y1: 1340,
    x2: 980,
    y2: 110
  },

  townHall: {
    x: 250,
    y: 540,
    hp: 1800,
    maxHp: 1800,
    radius: 46,
    flashTimer: 0,
    atkTimer: 0
  },

  waveState: {
    spawned: 0,
    toSpawn: 15,
    spawnTimer: 0,
    waveClearTimer: 0,
    bossActive: false
  },

  skills: [
    { id: "nova", name: "風暴吸金", cd: 0, maxCd: 10 },
    { id: "aegis", name: "聖光壁壘", cd: 0, maxCd: 16, buffTimer: 0 },
    { id: "meteor", name: "太古天隕", cd: 0, maxCd: 24 }
  ],

  enemies: [],
  allies: [],
  projectiles: [],
  lightningArcs: [],
  lootDrops: [],
  flyingCoins: [],
  particles: [],
  floatingTexts: [],
  burnZones: [],
  scenery: [],

  input: {
    keys: {},
    joyActive: false,
    joyStartX: 0,
    joyStartY: 0,
    joyCurX: 0,
    joyCurY: 0,
    joyDx: 0,
    joyDy: 0
  },

  init: function() {
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");

    if (window.GAME_DATA && window.GAME_DATA.mapConfig) {
      this.width = window.GAME_DATA.mapConfig.width || 2100;
      this.height = window.GAME_DATA.mapConfig.height || 1450;
      if (window.GAME_DATA.mapConfig.townHall) {
        this.townHall.x = window.GAME_DATA.mapConfig.townHall.x || 250;
        this.townHall.y = window.GAME_DATA.mapConfig.townHall.y || 540;
        this.townHall.radius = window.GAME_DATA.mapConfig.townHall.radius || 46;
      }
    }

    this.initDefaultPads();
    this.loadSave();
    this.generateScenery();
    this.recalcWallStats(true);
    this.setupWave(this.state.wave);
    this.bindInputs();
    this.handleResize();

    var self = this;
    window.addEventListener("resize", function() { self.handleResize(); });

    setInterval(function() {
      self.saveGame();
    }, 10000);

    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(function(ts) { self.loop(ts); });
  },

  initDefaultPads: function() {
    var self = this;
    if (!Array.isArray(this.state.unlockedBlueprints)) {
      this.state.unlockedBlueprints = [];
    }
    window.GAME_DATA.towerBlueprints.forEach(function(bp) {
      if (bp.unlockedByDefault && self.state.unlockedBlueprints.indexOf(bp.id) === -1) {
        self.state.unlockedBlueprints.push(bp.id);
      }
    });

    window.GAME_DATA.groundPads.forEach(function(p) {
      var existing = self.state.pads[p.id];
      var defaultBp = p.defaultBlueprint || "bp_arcane_spire";
      if (!existing) {
        var startLv = (p.id === "pad_FrostStatue" || p.id === "pad_HammerStatue" || p.id === "pad_TownHall") ? 1 : 0;
        self.state.pads[p.id] = {
          level: startLv,
          invested: 0,
          cooldown: 0,
          blueprintId: p.customizable ? defaultBp : null,
          atkTimer: 0
        };
      } else {
        if (p.customizable && !existing.blueprintId) {
          existing.blueprintId = defaultBp;
        }
      }
    });

    window.GAME_DATA.talents.forEach(function(t) {
      if (typeof self.state.talents[t.id] !== "number") {
        self.state.talents[t.id] = 0;
      }
    });
  },

  generateScenery: function() {
    this.scenery = [
      { x: 140, y: 180, kind: "tree", scale: 1.2 },
      { x: 460, y: 120, kind: "rune_tree", scale: 1.15 },
      { x: 740, y: 120, kind: "tree", scale: 1.1 },
      { x: 110, y: 940, kind: "tree", scale: 1.25 },
      { x: 310, y: 1120, kind: "rune_tree", scale: 1.15 },
      { x: 1080, y: 125, kind: "rune_tree", scale: 1.2 },
      { x: 1380, y: 115, kind: "tree", scale: 1.15 },
      { x: 1680, y: 120, kind: "tree", scale: 1.25 },
      { x: 1940, y: 140, kind: "rune_tree", scale: 1.2 },
      { x: 1220, y: 420, kind: "crystal_cluster", color: "#38bdf8", scale: 1.1 },
      { x: 1580, y: 460, kind: "tree", scale: 1.15 },
      { x: 1840, y: 480, kind: "crystal_cluster", color: "#d946ef", scale: 1.15 },
      { x: 1140, y: 810, kind: "tree", scale: 1.1 },
      { x: 1440, y: 780, kind: "crystal_cluster", color: "#a855f7", scale: 1.2 },
      { x: 1760, y: 820, kind: "rune_tree", scale: 1.2 },
      { x: 960, y: 1260, kind: "tree", scale: 1.25 },
      { x: 1320, y: 1280, kind: "rune_tree", scale: 1.15 },
      { x: 1680, y: 1310, kind: "crystal_cluster", color: "#38bdf8", scale: 1.15 },
      { x: 1950, y: 1290, kind: "tree", scale: 1.2 }
    ];
  },

  handleResize: function() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  getBlueprintById: function(bpId) {
    if (!bpId) return window.GAME_DATA.towerBlueprints[0];
    return window.GAME_DATA.towerBlueprints.find(function(b) { return b.id === bpId; }) || window.GAME_DATA.towerBlueprints[0];
  },

  getPadBlueprint: function(padDef) {
    if (!padDef || !padDef.customizable) return null;
    var st = this.state.pads[padDef.id];
    var bpId = (st && st.blueprintId) || padDef.defaultBlueprint || "bp_arcane_spire";
    return this.getBlueprintById(bpId);
  },

  isBlueprintUnlocked: function(bpId) {
    return this.state.unlockedBlueprints.indexOf(bpId) !== -1;
  },

  unlockBlueprint: function(bpId) {
    var bp = this.getBlueprintById(bpId);
    if (!bp) return false;
    if (this.isBlueprintUnlocked(bpId)) return true;
    var cost = bp.unlockCost || 0;
    var cur = bp.unlockCurrency || "gold";
    if (cur === "mana") {
      if (this.state.mana < cost) return false;
      this.state.mana -= cost;
    } else {
      if (this.state.gold < cost) return false;
      this.state.gold -= cost;
    }
    this.state.unlockedBlueprints.push(bpId);
    window.SoundEngine.playUpgradeComplete();
    this.saveGame();
    return true;
  },

  selectPadBlueprint: function(padId, bpId) {
    var pad = window.GAME_DATA.groundPads.find(function(p) { return p.id === padId; });
    if (!pad || !pad.customizable) return false;
    var bp = this.getBlueprintById(bpId);
    if (!bp) return false;

    if (!this.isBlueprintUnlocked(bpId)) {
      var ok = this.unlockBlueprint(bpId);
      if (!ok) return false;
    }

    var st = this.state.pads[padId];
    if (!st) return false;
    var prevBp = st.blueprintId;
    st.blueprintId = bpId;
    if (st.level === 0 && this.state.gold >= this.getPadCost(pad)) {
      this.spawnBurstParticles(pad.x, pad.y, bp.color || "#fde047", 18);
    } else if (prevBp !== bpId) {
      this.spawnBurstParticles(pad.x, pad.y, bp.color || "#38bdf8", 22);
      window.SoundEngine.playUpgradeComplete();
    }
    this.saveGame();
    return true;
  },

  getTacticalAdvice: function() {
    var self = this;
    var st = this.state;
    var w = st.wave;

    // 1. Town Hall under immediate attack
    if (this.townHall.hp < this.townHall.maxHp * 0.5) {
      return {
        urgency: "critical",
        icon: "🚨",
        title: "大本營告急！生命低於 50%！",
        reason: "魔物已突入內城！立即施放【聖光壁壘】修復大本營並回防！",
        targetPadId: "pad_TownHall",
        recBpId: null
      };
    }

    // 2. Wall HP warning
    if (this.wall.hp <= 0) {
      return {
        urgency: "critical",
        icon: "🚨",
        title: "城門防線已被攻破！",
        reason: "城門已洞開！踏上【城防要塞】或施放【聖光壁壘】緊急修補城防！",
        targetPadId: "pad_WallFortify",
        recBpId: null
      };
    }

    if (this.wall.hp / this.wall.maxHp < 0.45) {
      return {
        urgency: "high",
        icon: "🛡️",
        title: "城防耐久不足 45%！",
        reason: "敵人正在猛攻城門！建議踏上【城防要塞】修復城牆或派兵攔截。",
        targetPadId: "pad_WallFortify",
        recBpId: null
      };
    }

    // 3. Need Barracks
    var barracksBuilt = 0;
    window.GAME_DATA.groundPads.forEach(function(p) {
      if (!p.customizable) return;
      var pst = st.pads[p.id];
      if (pst && pst.level > 0) {
        var bp = self.getPadBlueprint(p);
        if (bp && bp.category === "barracks") barracksBuilt++;
      }
    });

    if (barracksBuilt === 0 && w >= 2) {
      var roadPlot = window.GAME_DATA.groundPads.find(function(p) {
        return p.customizable && st.unlockedZones.indexOf(p.zone) !== -1 && (!st.pads[p.id] || st.pads[p.id].level === 0 || p.id === "pad_InnerBarracksPlot");
      });
      return {
        urgency: "high",
        icon: "🛡️",
        title: "建造【鐵衛營】主動出城攔截",
        reason: "道路缺乏士兵阻截！在城門外或門前建造【鐵衛營】能擋住大批魔物。",
        targetPadId: roadPlot ? roadPlot.id : "pad_InnerBarracksPlot",
        recBpId: "bp_guard_barracks"
      };
    }

    // 4. Expansion
    var nextExpand = window.GAME_DATA.groundPads.find(function(p) {
      return p.type === "expand" && st.unlockedZones.indexOf(p.zone) !== -1 && (!st.pads[p.id] || st.pads[p.id].level === 0);
    });
    if (nextExpand && st.gold >= this.getPadRemaining(nextExpand) * 0.9) {
      return {
        urgency: "high",
        icon: "🔓",
        title: "可解鎖【" + nextExpand.name + "】",
        reason: "金幣充足！踏上帶鎖石陣擴展外圍戰場，建造更多防衛陣位。",
        targetPadId: nextExpand.id,
        recBpId: null
      };
    }

    // 5. Boss Wave Alert
    if (w % 5 === 4 || w % 5 === 0) {
      var bossPad = window.GAME_DATA.groundPads.find(function(p) {
        return p.customizable && st.unlockedZones.indexOf(p.zone) !== -1;
      });
      return {
        urgency: "boss",
        icon: "☄️",
        title: "預警：第 " + (w % 5 === 0 ? w : w + 1) + " 波巨型首領來襲！",
        reason: "強烈建議建造【星隕砲】或升級【奧術塔】破甲單體輸出！",
        targetPadId: bossPad ? bossPad.id : "pad_FrostStatue",
        recBpId: this.isBlueprintUnlocked("bp_star_cannon") ? "bp_star_cannon" : "bp_arcane_spire"
      };
    }

    return {
      urgency: "normal",
      icon: "⚔️",
      title: "防線巡邏中，出城迎擊魔物",
      reason: "可自由穿過北門或南門走向外圍古道，消滅魔物拾取金幣！",
      targetPadId: "pad_FrostStatue",
      recBpId: null
    };
  },

  getTalentVal: function(tid) {
    var lv = this.state.talents[tid] || 0;
    var def = window.GAME_DATA.talents.find(function(t) { return t.id === tid; });
    return def ? lv * def.effectPerLv : 0;
  },

  getEquipStat: function(statType) {
    var total = 0;
    var eq = this.state.equipped;
    ["weapon", "armor", "ring", "relic"].forEach(function(slot) {
      var item = eq[slot];
      if (item) {
        if (item.statType === statType) total += item.val;
        if (item.statType === "allMult") total += item.val;
      }
    });
    return total;
  },

  getDivinityMult: function() {
    return 1 + (this.state.divinity || 0) * 0.35;
  },

  getHeroDamage: function() {
    var cls = this.getCurrentHeroClass();
    var base = cls.baseDmg * (1 + (this.state.heroLevel - 1) * 0.22 + this.state.heroWeaponForgeLv * 0.18);
    var tMult = 1 + this.getTalentVal("t_hero_dmg");
    var eqMult = 1 + this.getEquipStat("heroDmg");
    return Math.round(base * tMult * eqMult * this.getDivinityMult());
  },

  getTowerDamage: function(padDef, level) {
    if (level <= 0) return 0;
    var bp = this.getPadBlueprint(padDef);
    var baseDmg = (bp && bp.baseDmg) ? bp.baseDmg : 26;
    var raw = baseDmg * Math.pow(1.28, level - 1);
    var tMult = 1 + this.getTalentVal("t_tower_dmg");
    var eqMult = 1 + this.getEquipStat("towerDmg");
    return Math.round(raw * tMult * eqMult * this.getDivinityMult());
  },

  getPadCost: function(padDef) {
    var st = this.state.pads[padDef.id] || { level: 0 };
    var discount = Math.min(0.45, this.getTalentVal("t_pad_discount"));
    var baseCost = padDef.baseCost || 40;
    var scale = padDef.costScale || 1.38;
    if (padDef.customizable) {
      var bp = this.getPadBlueprint(padDef);
      if (bp && bp.buildCostGold) baseCost = Math.max(baseCost, bp.buildCostGold);
    }
    var raw = baseCost * Math.pow(scale, st.level);
    return Math.max(5, Math.round(raw * (1 - discount)));
  },

  getPadRemaining: function(padDef) {
    var st = this.state.pads[padDef.id] || { level: 0, invested: 0 };
    return Math.max(0, this.getPadCost(padDef) - Math.floor(st.invested));
  },

  getCurrentHeroClass: function() {
    var id = this.state.heroClassId;
    return window.GAME_DATA.heroClasses.find(function(c) { return c.id === id; }) || window.GAME_DATA.heroClasses[0];
  },

  getCurrentRealm: function() {
    var id = this.state.realmId;
    return window.GAME_DATA.realms.find(function(r) { return r.id === id; }) || window.GAME_DATA.realms[0];
  },

  recalcWallStats: function(healFull) {
    var wallFortLv = (this.state.pads["pad_WallFortify"] && this.state.pads["pad_WallFortify"].level) || 0;
    var hallLv = (this.state.pads["pad_TownHall"] && this.state.pads["pad_TownHall"].level) || 1;
    this.state.townHallLevel = hallLv;

    var wallBase = 850 + wallFortLv * 320 + (this.state.realmId - 1) * 900;
    var wallMult = (1 + this.getTalentVal("t_wall_hp")) * (1 + this.getEquipStat("wallHp"));
    var newWallMax = Math.round(wallBase * wallMult);
    var wallRatio = this.wall.maxHp > 0 ? this.wall.hp / this.wall.maxHp : 1;
    this.wall.maxHp = newWallMax;
    this.wall.hp = healFull ? newWallMax : Math.min(newWallMax, Math.max(0, Math.round(newWallMax * wallRatio)));

    var hallBase = 1800 + (hallLv - 1) * 450 + (this.state.realmId - 1) * 1500;
    var hallMult = (1 + this.getTalentVal("t_wall_hp") * 0.8) * (1 + this.getEquipStat("wallHp") * 0.8);
    var newHallMax = Math.round(hallBase * hallMult);
    var hallRatio = this.townHall.maxHp > 0 ? this.townHall.hp / this.townHall.maxHp : 1;
    this.townHall.maxHp = newHallMax;
    this.townHall.hp = healFull ? newHallMax : Math.min(newHallMax, Math.max(1, Math.round(newHallMax * hallRatio)));

    this.gateBreached = (this.wall.hp <= 0);
  },

  isPointInsideFortress: function(x, y) {
    var wx = this.wall.x2 - this.wall.x1;
    var wy = this.wall.y2 - this.wall.y1;
    var cross = (x - this.wall.x1) * wy - (y - this.wall.y1) * wx;
    return cross > 0;
  },

  getNearestGatePoint: function(x, y) {
    var gNorth = { x: 780, y: 435 };
    var gSouth = { x: 565, y: 890 };
    var dN = Math.hypot(x - gNorth.x, y - gNorth.y);
    var dS = Math.hypot(x - gSouth.x, y - gSouth.y);
    return dN < dS ? gNorth : gSouth;
  },

  getSmartMovePoint: function(curX, curY, destX, destY) {
    var curInside = this.isPointInsideFortress(curX, curY);
    var destInside = this.isPointInsideFortress(destX, destY);
    if (curInside === destInside) {
      return { x: destX, y: destY };
    }
    var gate = this.getNearestGatePoint(curX, curY);
    var distToGate = Math.hypot(curX - gate.x, curY - gate.y);
    if (distToGate > 48) {
      return gate;
    }
    return { x: destX, y: destY };
  },

  resolveWallCollisions: function(entity, isHeroOrAlly) {
    var segments = (window.GAME_DATA.mapConfig && window.GAME_DATA.mapConfig.wallSegments) || [];
    var r = (entity.radius || 16) + 16;

    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      // Hero & Allies freely pass gates
      if (isHeroOrAlly && (seg.type === "gate" || seg.isGate)) continue;
      // When gate is breached, monsters can pass through gates too!
      if (!isHeroOrAlly && this.gateBreached && (seg.type === "gate" || seg.isGate)) continue;

      var sx = seg.x2 - seg.x1;
      var sy = seg.y2 - seg.y1;
      var len2 = sx * sx + sy * sy;
      if (len2 === 0) continue;

      var t = Math.max(0, Math.min(1, ((entity.x - seg.x1) * sx + (entity.y - seg.y1) * sy) / len2));
      var projX = seg.x1 + t * sx;
      var projY = seg.y1 + t * sy;
      var dx = entity.x - projX;
      var dy = entity.y - projY;
      var dist = Math.hypot(dx, dy);

      if (dist < r) {
        if (dist < 0.001) {
          dx = 0.65;
          dy = 0.75;
          dist = 1;
        }
        var overlap = r - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
      }
    }
  },

  setupWave: function(waveNum) {
    this.state.wave = waveNum;
    if (waveNum > this.state.maxWaveReached) {
      this.state.maxWaveReached = waveNum;
    }
    this.waveState.spawned = 0;
    this.waveState.toSpawn = 16 + Math.min(50, Math.floor(waveNum * 2.2));
    this.waveState.spawnTimer = 0.35;
    this.waveState.bossActive = (waveNum % 5 === 0);
    if (window.GameUI) window.GameUI.updateHUD();
  },

  spawnEnemy: function(forceBoss) {
    var realm = this.getCurrentRealm();
    var w = this.state.wave;
    var scale = realm.enemyMult * Math.pow(1.15, w - 1);

    var pool = ["cultist", "cultist", "skeleton_warrior", "shadow_imp"];
    if (w >= 3) pool.push("orc_warrior", "scorpion");
    if (w >= 5 || realm.id >= 2) pool.push("dark_mage");
    if (w >= 7 || realm.id >= 2) pool.push("stone_golem");
    if (realm.id >= 3 || w >= 12) pool.push("frost_wolf");
    if (realm.id >= 4 || w >= 18) pool.push("flame_demon");
    if (realm.id >= 5 || w >= 25) pool.push("void_reaver");

    var archId = forceBoss ? "realm_boss" : pool[Math.floor(Math.random() * pool.length)];
    var arch = window.GAME_DATA.bestiary.find(function(b) { return b.id === archId; }) || window.GAME_DATA.bestiary[0];

    var roads = (window.GAME_DATA.mapConfig && window.GAME_DATA.mapConfig.roads) || [];
    var roadIdx = 0;
    if (w >= 3) {
      roadIdx = Math.floor(Math.random() * roads.length);
    } else {
      roadIdx = Math.random() < 0.6 ? 0 : 1;
    }
    var road = roads[roadIdx] || roads[0];
    var startPt = (road && road.waypoints && road.waypoints[0]) ? road.waypoints[0] : { x: 1980, y: 680 };

    var hp = Math.round(45 * arch.hpMult * scale);
    var goldReward = Math.max(5, Math.round(arch.gold * realm.rewardMult * (1 + w * 0.12)));

    this.enemies.push({
      id: "en_" + Date.now() + "_" + Math.random(),
      archId: arch.id,
      name: forceBoss ? realm.bossName : arch.name,
      icon: arch.icon,
      isBoss: !!forceBoss,
      roadId: road ? road.id : "road_center",
      waypoints: road ? road.waypoints : [{ x: 1980, y: 680 }, { x: 780, y: 435 }, { x: 250, y: 540 }],
      wpIndex: 1,
      laneOffset: (Math.random() - 0.5) * 36,
      x: startPt.x + (Math.random() - 0.5) * 40,
      y: startPt.y + (Math.random() - 0.5) * 40,
      hp: hp,
      maxHp: hp,
      speed: arch.spd * (0.94 + Math.random() * 0.12),
      radius: forceBoss ? 36 : (arch.id === "orc_warrior" || arch.id === "stone_golem" ? 22 : 16),
      gold: goldReward,
      atkTimer: 0,
      slowTimer: 0,
      stunTimer: 0,
      flashTimer: 0,
      walkPhase: Math.random() * Math.PI * 2
    });
  },

  loop: function(timestamp) {
    if (!this.running) return;
    var rawDt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    var dt = rawDt * this.gameSpeed;

    this.update(dt, rawDt);
    this.render();

    var self = this;
    requestAnimationFrame(function(ts) { self.loop(ts); });
  },

  update: function(dt, rawDt) {
    if (this.isDefeated) return;

    this.state.playSeconds += rawDt;
    this.hero.animPhase += dt * 6;

    this.updateResourcesAndBuffs(dt);
    this.updateHeroMovement(dt);
    this.updateGroundLogoInteraction(dt);
    this.updateHeroAndTowersCombat(dt);
    this.updateAllies(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateLootAndFlyingCoins(dt);
    this.updateParticlesAndTexts(dt);

    if (window.GameUI) {
      window.GameUI.tickUI(rawDt);
    }
  },

  updateResourcesAndBuffs: function(dt) {
    var mineLv = (this.state.pads["pad_GoldMine"] && this.state.pads["pad_GoldMine"].level) || 0;
    var wellLv = (this.state.pads["pad_ManaWell"] && this.state.pads["pad_ManaWell"].level) || 0;
    var yieldMult = (1 + this.getTalentVal("t_mine_yield")) * this.getDivinityMult();

    if (mineLv > 0) {
      var goldPerSec = mineLv * 4.2 * yieldMult * this.getCurrentRealm().rewardMult;
      this.state.gold += goldPerSec * dt;
      this.state.totalGoldEarned += goldPerSec * dt;
    }
    if (wellLv > 0) {
      var manaPerSec = wellLv * 0.55 * yieldMult;
      this.state.mana += manaPerSec * dt;
    }

    var regenRate = this.getTalentVal("t_wall_regen");
    if (this.state.heroClassId === "paladin") regenRate += 0.008;
    if (regenRate > 0) {
      if (this.wall.hp < this.wall.maxHp && this.wall.hp > 0) {
        this.wall.hp = Math.min(this.wall.maxHp, this.wall.hp + this.wall.maxHp * regenRate * dt);
      }
      if (this.townHall.hp < this.townHall.maxHp && this.townHall.hp > 0) {
        this.townHall.hp = Math.min(this.townHall.maxHp, this.townHall.hp + this.townHall.maxHp * (regenRate * 0.7) * dt);
      }
    }

    if (this.townHall.flashTimer > 0) this.townHall.flashTimer -= dt;

    var cdMult = 1 + (this.state.heroClassId === "archmage" ? 0.25 : 0) + this.getTalentVal("t_skill_cd") + wellLv * 0.015;
    for (var i = 0; i < this.skills.length; i++) {
      var sk = this.skills[i];
      if (sk.cd > 0) sk.cd = Math.max(0, sk.cd - dt * cdMult);
      if (sk.buffTimer && sk.buffTimer > 0) sk.buffTimer = Math.max(0, sk.buffTimer - dt);
    }

    for (var b = this.burnZones.length - 1; b >= 0; b--) {
      this.burnZones[b].life -= dt;
      if (this.burnZones[b].life <= 0) this.burnZones.splice(b, 1);
    }

    for (var l = this.lightningArcs.length - 1; l >= 0; l--) {
      this.lightningArcs[l].life -= dt;
      if (this.lightningArcs[l].life <= 0) this.lightningArcs.splice(l, 1);
    }
  },

  updateHeroMovement: function(dt) {
    var cls = this.getCurrentHeroClass();
    var speed = cls.moveSpeed;
    var dx = 0;
    var dy = 0;

    var k = this.input.keys;
    if (k["KeyW"] || k["ArrowUp"]) dy -= 1;
    if (k["KeyS"] || k["ArrowDown"]) dy += 1;
    if (k["KeyA"] || k["ArrowLeft"]) dx -= 1;
    if (k["KeyD"] || k["ArrowRight"]) dx += 1;

    if (this.input.joyActive && (Math.abs(this.input.joyDx) > 0.05 || Math.abs(this.input.joyDy) > 0.05)) {
      dx = this.input.joyDx;
      dy = this.input.joyDy;
      this.hero.targetX = null;
      this.hero.targetY = null;
    }

    if (dx !== 0 || dy !== 0) {
      var len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      this.hero.x += dx * speed * dt;
      this.hero.y += dy * speed * dt;
      if (Math.abs(dx) > 0.05) this.hero.facing = dx > 0 ? 1 : -1;
      this.resolveWallCollisions(this.hero, true);
      this.clampHeroPosition();
      return;
    }

    if (this.aiMode > 0 && this.hero.targetX === null) {
      this.computeAiTarget();
    }

    if (this.hero.targetX !== null && this.hero.targetY !== null) {
      var movePt = this.getSmartMovePoint(this.hero.x, this.hero.y, this.hero.targetX, this.hero.targetY);
      var tx = movePt.x - this.hero.x;
      var ty = movePt.y - this.hero.y;
      var dist = Math.hypot(tx, ty);
      var finalDist = Math.hypot(this.hero.targetX - this.hero.x, this.hero.targetY - this.hero.y);
      if (finalDist > 8 && dist > 4) {
        this.hero.x += (tx / dist) * speed * dt;
        this.hero.y += (ty / dist) * speed * dt;
        if (Math.abs(tx) > 2) this.hero.facing = tx > 0 ? 1 : -1;
      } else {
        this.hero.targetX = null;
        this.hero.targetY = null;
      }
    }

    this.resolveWallCollisions(this.hero, true);
    this.clampHeroPosition();
  },

  clampHeroPosition: function() {
    this.hero.x = Math.max(60, Math.min(this.width - 60, this.hero.x));
    this.hero.y = Math.max(95, Math.min(this.height - 75, this.hero.y));
  },

  computeAiTarget: function() {
    var self = this;
    if (this.aiMode === 2) {
      var bestPad = null;
      var bestScore = Infinity;
      window.GAME_DATA.groundPads.forEach(function(p) {
        if (self.state.unlockedZones.indexOf(p.zone) === -1) return;
        var st = self.state.pads[p.id];
        if (!st || st.level >= p.maxLevel) return;
        if (st.cooldown && st.cooldown > 0) return;
        var rem = self.getPadRemaining(p);
        var avail = p.currency === "mana" ? self.state.mana : self.state.gold;
        if (avail >= rem) {
          var priority = (p.type === "expand" ? 0.1 : (st.level === 0 ? 0.3 : 1.0)) * rem;
          if (priority < bestScore) {
            bestScore = priority;
            bestPad = p;
          }
        }
      });
      if (bestPad) {
        this.hero.targetX = bestPad.x;
        this.hero.targetY = bestPad.y;
        return;
      }
    }

    if (this.lootDrops.length > 0) {
      var drop = this.lootDrops[0];
      this.hero.targetX = drop.x;
      this.hero.targetY = drop.y;
      return;
    }

    if (this.enemies.length > 0) {
      var en = this.enemies[0];
      this.hero.targetX = Math.max(250, Math.min(1850, en.x - 95));
      this.hero.targetY = Math.max(200, Math.min(1250, en.y));
    }
  },

  updateGroundLogoInteraction: function(dt) {
    var self = this;
    var activePad = null;

    window.GAME_DATA.groundPads.forEach(function(pad) {
      if (self.state.unlockedZones.indexOf(pad.zone) === -1) return;
      var st = self.state.pads[pad.id];
      if (st.cooldown && st.cooldown > 0) {
        st.cooldown = Math.max(0, st.cooldown - dt);
      }

      var dist = Math.hypot(self.hero.x - pad.x, self.hero.y - pad.y);
      if (dist < 56) {
        activePad = pad;
        if (st.level < pad.maxLevel && (!st.cooldown || st.cooldown <= 0)) {
          var cost = self.getPadCost(pad);
          var needed = cost - st.invested;
          var avail = pad.currency === "mana" ? self.state.mana : self.state.gold;

          if (avail >= 0.5 && needed > 0) {
            var speedMult = 1 + self.getTalentVal("t_step_speed");
            var transferRate = Math.max(30, cost * 1.55 * speedMult);
            var stepAmt = Math.min(avail, needed, transferRate * dt);

            if (stepAmt > 0) {
              if (pad.currency === "mana") {
                self.state.mana -= stepAmt;
              } else {
                self.state.gold -= stepAmt;
              }
              st.invested += stepAmt;

              if (Math.random() < 0.68) {
                self.spawnFlyingCoin(self.hero.x, self.hero.y - 16, pad.x, pad.y - 10, pad.currency);
                window.SoundEngine.playCoinFeed();
              }

              if (st.invested >= cost - 0.01) {
                st.invested = 0;
                st.level += 1;
                self.executePadActivation(pad, st);
              }
            }
          }
        }
      }
    });

    this.hero.activePadId = activePad ? activePad.id : null;
  },

  spawnFlyingCoin: function(sx, sy, tx, ty, currency) {
    this.flyingCoins.push({
      sx: sx + (Math.random() - 0.5) * 14,
      sy: sy,
      tx: tx + (Math.random() - 0.5) * 16,
      ty: ty,
      progress: 0,
      speed: 2.9 + Math.random() * 0.8,
      arcHeight: 46 + Math.random() * 26,
      currency: currency
    });
  },

  executePadActivation: function(pad, st) {
    this.spawnBurstParticles(pad.x, pad.y, pad.currency === "mana" ? "#38bdf8" : "#fbbf24", 28);

    if (pad.type === "town_hall") {
      window.SoundEngine.playUpgradeComplete();
      this.recalcWallStats(false);
      this.townHall.hp = Math.min(this.townHall.maxHp, this.townHall.hp + Math.round(this.townHall.maxHp * 0.45));
      this.addFloatingText(pad.x, pad.y - 45, "🏛️ 大本營升級 Lv." + st.level + "！", "#fde047", 18);
      if (window.GameUI) window.GameUI.showToast("🏛️ 守護大本營已升級至 Lv." + st.level + "！生命大幅提升！");
    } else if (pad.type === "expand") {
      window.SoundEngine.playExpand();
      if (this.state.unlockedZones.indexOf(pad.unlocksZone) === -1) {
        this.state.unlockedZones.push(pad.unlocksZone);
      }
      this.addFloatingText(pad.x, pad.y - 40, "🔓 領地擴張！", "#fde047", 20);
      if (window.GameUI) window.GameUI.showToast("✨ 成功擴建領地：" + pad.name + "！");
    } else if (pad.type === "wall") {
      window.SoundEngine.playUpgradeComplete();
      this.recalcWallStats(false);
      this.wall.hp = Math.min(this.wall.maxHp, this.wall.hp + Math.round(this.wall.maxHp * 0.5));
      this.gateBreached = false;
      this.addFloatingText(pad.x, pad.y - 35, "🛡️ 城防要塞強化 Lv." + st.level, "#22c55e", 16);
    } else if (pad.type === "forge") {
      window.SoundEngine.playUpgradeComplete();
      this.state.heroWeaponForgeLv += 1;
      this.spawnLootDrop(pad.x + (Math.random() - 0.5) * 55, pad.y + 35, "chest", 1);
      this.addFloatingText(pad.x, pad.y - 35, "⚒️ 鍛造成功！掉落寶箱", "#f43f5e", 16);
    } else if (pad.type === "shrine") {
      window.SoundEngine.playSkill();
      st.cooldown = 12;
      this.triggerCataclysm(true);
      this.addFloatingText(pad.x, pad.y - 40, "🌋 天罰神龕：太古流星雨！", "#f97316", 18);
    } else if (pad.type === "portal") {
      window.SoundEngine.playExpand();
      st.cooldown = 15;
      this.spawnEnemy(true);
      this.addFloatingText(pad.x, pad.y - 40, "⛩️ 遠古魔王降臨！", "#a855f7", 18);
      if (window.GameUI) window.GameUI.showToast("🐲 魔王降臨戰場！");
    } else {
      window.SoundEngine.playUpgradeComplete();
      var bp = pad.customizable ? this.getPadBlueprint(pad) : null;
      var dispName = bp ? bp.name : pad.name;
      var label = st.level === 1 ? "✨ 建造完成！" : "⬆️ 升級 Lv." + st.level;
      this.addFloatingText(pad.x, pad.y - 35, dispName + " " + label, "#fde047", 16);
      if (bp && bp.category === "barracks" && st.level === 1) {
        this.spawnBarracksTroop(pad, bp, st.level);
      }
    }

    this.checkQuestProgress();
    if (window.GameUI) window.GameUI.updateHUD();
  },

  updateHeroAndTowersCombat: function(dt) {
    var self = this;
    var cls = this.getCurrentHeroClass();
    var atkSpdMult = (1 + this.getTalentVal("t_atk_spd")) * (this.skills[1].buffTimer > 0 ? 1.8 : 1.0);

    // Hero Auto-Attack
    this.hero.atkTimer -= dt * atkSpdMult;
    if (this.hero.atkTimer <= 0 && this.enemies.length > 0) {
      var target = this.findNearestEnemy(this.hero.x, this.hero.y, cls.range + 60);
      if (target) {
        this.hero.atkTimer = cls.atkRate;
        this.hero.facing = target.x >= this.hero.x ? 1 : -1;
        var dmg = this.getHeroDamage();
        this.fireProjectile(this.hero.x, this.hero.y - 16, target, cls.projType, dmg, cls.color);
      }
    }

    // Town Hall Defensive Sacred Ballista (If enemies get close to inner courtyard)
    this.townHall.atkTimer = (this.townHall.atkTimer || 0) - dt;
    if (this.townHall.atkTimer <= 0 && this.enemies.length > 0) {
      var closeEnemy = this.findNearestEnemy(this.townHall.x, this.townHall.y, 650);
      if (closeEnemy) {
        this.townHall.atkTimer = 0.95;
        var hallDmg = Math.round(this.getHeroDamage() * 1.4);
        this.fireProjectile(this.townHall.x, this.townHall.y - 35, closeEnemy, "ballista", hallDmg, "#fde047");
      }
    }

    // Customizable Plots & Towers
    window.GAME_DATA.groundPads.forEach(function(pad) {
      var st = self.state.pads[pad.id];
      if (!st || st.level <= 0) return;

      st.atkTimer = (st.atkTimer || 0) - dt * atkSpdMult;
      if (st.atkTimer > 0) return;

      var originX = pad.towerX || pad.x;
      var originY = (pad.towerY || pad.y) - 30;

      if (pad.customizable) {
        var bp = self.getPadBlueprint(pad);
        if (!bp) return;

        if (bp.category === "tower") {
          var range = bp.range || 540;
          var tEnemy = self.findNearestEnemy(originX, originY, range);
          if (tEnemy) {
            st.atkTimer = bp.atkRate || 0.75;
            var tDmg = self.getTowerDamage(pad, st.level);

            if (bp.projKind === "frost") {
              for (var m = -1; m <= 1; m++) {
                self.fireProjectile(originX + m * 8, originY - 22, tEnemy, "frost", Math.round(tDmg * 0.55), bp.color, m * 0.14);
              }
            } else if (bp.projKind === "hammer") {
              self.lightningArcs.push({ x1: originX + 18, y1: originY - 12, x2: tEnemy.x, y2: tEnemy.y, color: "#38bdf8", life: 0.22 });
              self.fireProjectile(originX + 18, originY - 12, tEnemy, "hammer", tDmg, bp.color);
            } else {
              self.fireProjectile(originX, originY, tEnemy, bp.projKind, tDmg, bp.color);
            }
          }
        } else if (bp.category === "barracks") {
          st.atkTimer = Math.max(2.5, (bp.spawnInterval || 5.0) * Math.pow(0.97, st.level - 1));
          self.spawnBarracksTroop(pad, bp, st.level);
        }
      } else if (pad.type === "mine") {
        st.atkTimer = 4.5;
        var desiredSprites = Math.min(5, 1 + Math.floor(st.level / 5));
        var curSprites = self.allies.filter(function(a) { return a.kind === "sprite"; }).length;
        if (curSprites < desiredSprites) {
          self.spawnAlly("sprite", pad.x, pad.y, st.level, null);
        }
      }
    });
  },

  spawnBarracksTroop: function(pad, bp, level) {
    var maxCombatAllies = 24;
    var curCombat = this.allies.filter(function(a) { return a.kind !== "sprite"; }).length;
    if (curCombat >= maxCombatAllies) return;

    var count = bp.troopCount || 1;
    var tx = pad.towerX || pad.x;
    var ty = pad.towerY || pad.y;
    for (var i = 0; i < count; i++) {
      this.spawnAlly(bp.troopType || "guard", tx, ty, level, bp);
    }
  },

  findNearestEnemy: function(x, y, maxRange) {
    var best = null;
    var bestDist = maxRange || 9999;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      var d = Math.hypot(e.x - x, e.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  },

  fireProjectile: function(sx, sy, target, kind, dmg, color, angleOffset) {
    var angle = Math.atan2(target.y - sy, target.x - sx) + (angleOffset || 0);
    var count = kind === "multi_chakram" ? 3 : 1;
    for (var c = 0; c < count; c++) {
      var spread = count > 1 ? (c - 1) * 0.22 : 0;
      var a = angle + spread;
      this.projectiles.push({
        x: sx,
        y: sy,
        vx: Math.cos(a) * 530,
        vy: Math.sin(a) * 530,
        kind: kind,
        dmg: dmg,
        color: color,
        life: 1.8,
        pierce: (kind === "sword" || kind === "ballista" || kind === "sword_wave") ? 4 : 1,
        hitIds: {}
      });
    }
  },

  spawnAlly: function(kind, x, y, level, bp) {
    var powMult = (1 + this.getTalentVal("t_summon_pow")) * this.getDivinityMult();
    var baseHp = (bp && bp.troopHp) ? bp.troopHp : (kind === "cavalry" ? 380 : (kind === "golem" ? 750 : (kind === "archer" ? 160 : 220)));
    var baseDmg = (bp && bp.troopDmg) ? bp.troopDmg : (kind === "cavalry" ? 45 : (kind === "golem" ? 80 : (kind === "archer" ? 32 : 28)));
    var hp = Math.round(baseHp * Math.pow(1.22, level - 1) * powMult);
    var dmg = Math.round(baseDmg * Math.pow(1.22, level - 1) * powMult);

    this.allies.push({
      kind: kind,
      x: x + (Math.random() - 0.5) * 26,
      y: y + (Math.random() - 0.5) * 26,
      radius: kind === "golem" ? 22 : (kind === "cavalry" ? 18 : 14),
      hp: hp,
      maxHp: hp,
      dmg: dmg,
      attackRange: kind === "archer" ? 230 : 28,
      speed: kind === "sprite" ? 260 : (kind === "cavalry" ? 180 : (kind === "golem" ? 90 : 125)),
      atkTimer: 0,
      life: kind === "sprite" ? 999 : 35
    });
  },

  updateAllies: function(dt) {
    for (var i = this.allies.length - 1; i >= 0; i--) {
      var al = this.allies[i];
      al.life -= dt;
      if (al.hp <= 0 || al.life <= 0) {
        this.allies.splice(i, 1);
        continue;
      }

      if (al.kind === "sprite") {
        if (this.lootDrops.length > 0) {
          var drop = this.lootDrops[0];
          var dx = drop.x - al.x;
          var dy = drop.y - al.y;
          var d = Math.hypot(dx, dy);
          if (d > 14) {
            al.x += (dx / d) * al.speed * dt;
            al.y += (dy / d) * al.speed * dt;
          } else {
            this.collectLootDrop(0);
          }
        } else {
          var hx = 220 - al.x;
          var hy = 300 - al.y;
          var hd = Math.hypot(hx, hy);
          if (hd > 30) {
            al.x += (hx / hd) * al.speed * 0.6 * dt;
            al.y += (hy / hd) * al.speed * 0.6 * dt;
          }
        }
        continue;
      }

      if (al.kind === "cavalry") {
        for (var l = this.lootDrops.length - 1; l >= 0; l--) {
          if (Math.hypot(this.lootDrops[l].x - al.x, this.lootDrops[l].y - al.y) < 55) {
            this.collectLootDrop(l);
          }
        }
      }

      var target = this.findNearestEnemy(al.x, al.y, 1300);
      if (target) {
        var movePt = this.getSmartMovePoint(al.x, al.y, target.x, target.y);
        var ex = movePt.x - al.x;
        var ey = movePt.y - al.y;
        var ed = Math.hypot(ex, ey);
        var trueDist = Math.hypot(target.x - al.x, target.y - al.y);

        if (trueDist > target.radius + (al.attackRange || 24)) {
          if (ed > 1) {
            al.x += (ex / ed) * al.speed * dt;
            al.y += (ey / ed) * al.speed * dt;
          }
        } else {
          al.atkTimer -= dt;
          if (al.atkTimer <= 0) {
            al.atkTimer = al.kind === "archer" ? 0.55 : 0.70;
            if (al.kind === "archer") {
              this.fireProjectile(al.x, al.y - 10, target, "multi_chakram", al.dmg, "#22c55e");
            } else {
              this.damageEnemy(target, al.dmg, "#fde047", false);
              if (al.kind === "golem") {
                target.stunTimer = Math.max(target.stunTimer, 0.4);
              }
            }
          }
        }
      } else {
        var patrolPt = this.getSmartMovePoint(al.x, al.y, 920, 620);
        var px = patrolPt.x - al.x;
        var py = patrolPt.y - al.y;
        var pd = Math.hypot(px, py);
        if (pd > 45) {
          al.x += (px / pd) * al.speed * 0.65 * dt;
          al.y += (py / pd) * al.speed * 0.65 * dt;
        }
      }

      this.resolveWallCollisions(al, true);
    }
  },

  updateEnemies: function(dt) {
    if (this.waveState.spawned < this.waveState.toSpawn) {
      this.waveState.spawnTimer -= dt;
      if (this.waveState.spawnTimer <= 0) {
        var isLastAndBoss = (this.waveState.spawned === this.waveState.toSpawn - 1) && this.waveState.bossActive;
        this.spawnEnemy(isLastAndBoss);
        this.waveState.spawned++;
        this.waveState.spawnTimer = Math.max(0.25, 0.75 - this.state.wave * 0.012);
      }
    } else if (this.enemies.length === 0) {
      this.waveState.waveClearTimer += dt;
      if (this.waveState.waveClearTimer >= 1.2) {
        this.waveState.waveClearTimer = 0;
        var clearBonus = Math.round(35 * this.getCurrentRealm().rewardMult * (1 + this.state.wave * 0.25));
        this.state.gold += clearBonus;
        this.state.totalGoldEarned += clearBonus;
        this.addFloatingText(this.hero.x, this.hero.y - 50, "🎉 第 " + this.state.wave + " 波擊退！賞金 +" + clearBonus, "#fde047", 20);
        this.checkQuestProgress();
        this.setupWave(this.state.wave + 1);
      }
    }

    // Tally road enemy counts for the live radar
    var rNorth = 0, rCenter = 0, rSouth = 0;
    for (var k = 0; k < this.enemies.length; k++) {
      var rId = this.enemies[k].roadId;
      if (rId === "road_north") rNorth++;
      else if (rId === "road_center") rCenter++;
      else if (rId === "road_south") rSouth++;
    }
    this.roadEnemyCounts = { road_north: rNorth, road_center: rCenter, road_south: rSouth };

    for (var i = this.enemies.length - 1; i >= 0; i--) {
      var e = this.enemies[i];
      e.walkPhase = (e.walkPhase || 0) + dt * 8;
      if (e.flashTimer > 0) e.flashTimer -= dt;
      if (e.stunTimer > 0) {
        e.stunTimer -= dt;
        continue;
      }
      var spdMult = e.slowTimer > 0 ? 0.45 : 1.0;
      if (e.slowTimer > 0) e.slowTimer -= dt;

      for (var b = 0; b < this.burnZones.length; b++) {
        var bz = this.burnZones[b];
        if (Math.hypot(e.x - bz.x, e.y - bz.y) < bz.radius) {
          e.hp -= bz.dps * dt;
        }
      }

      if (e.hp <= 0) {
        this.killEnemy(i);
        continue;
      }

      // Check if intercepted by ally on the road
      var engagedAlly = null;
      for (var a = 0; a < this.allies.length; a++) {
        var al = this.allies[a];
        if (al.kind === "sprite") continue;
        if (Math.hypot(al.x - e.x, al.y - e.y) < e.radius + al.radius + 14) {
          engagedAlly = al;
          break;
        }
      }

      if (engagedAlly) {
        e.atkTimer -= dt;
        if (e.atkTimer <= 0) {
          e.atkTimer = 0.95;
          var aDmg = Math.max(6, Math.round(10 * this.getCurrentRealm().enemyMult * Math.pow(1.08, this.state.wave - 1)));
          engagedAlly.hp -= aDmg;
        }
        this.resolveWallCollisions(e, false);
        continue;
      }

      // If gates are intact, march toward the nearest gate
      // If gates are breached (wall.hp <= 0), march directly to Town Hall!
      var destX, destY;
      var wps = e.waypoints || [{ x: 780, y: 435 }, { x: 250, y: 540 }];

      if (!this.gateBreached) {
        var wpIdx = Math.min(wps.length - 2, e.wpIndex || 0);
        var wp = wps[wpIdx];
        destX = wp.x;
        destY = wp.y + (wpIdx < wps.length - 2 ? (e.laneOffset || 0) : 0);

        var dx = destX - e.x;
        var dy = destY - e.y;
        var distToWp = Math.hypot(dx, dy);

        if (wpIdx < wps.length - 2 && distToWp < 42) {
          e.wpIndex = wpIdx + 1;
        }

        // Distance to wall line
        var wx = this.wall.x2 - this.wall.x1;
        var wy = this.wall.y2 - this.wall.y1;
        var wLen2 = wx * wx + wy * wy;
        var t = Math.max(0.05, Math.min(0.95, ((e.x - this.wall.x1) * wx + (e.y - this.wall.y1) * wy) / wLen2));
        var wallPtX = this.wall.x1 + t * wx;
        var wallPtY = this.wall.y1 + t * wy;
        var distToWall = Math.hypot(e.x - wallPtX, e.y - wallPtY);

        if (distToWall > e.radius + 26) {
          if (distToWp > 1) {
            e.x += (dx / distToWp) * e.speed * spdMult * dt;
            e.y += (dy / distToWp) * e.speed * spdMult * dt;
          }
        } else {
          // Attacking the Wall & Gates
          e.atkTimer -= dt;
          if (e.atkTimer <= 0) {
            e.atkTimer = 1.0;
            var eDmg = Math.max(8, Math.round(14 * this.getCurrentRealm().enemyMult * Math.pow(1.09, this.state.wave - 1)));
            if (e.isBoss) eDmg *= 3.5;
            this.wall.hp = Math.max(0, this.wall.hp - eDmg);

            var thornsRatio = this.getTalentVal("t_wall_thorns") + ((this.state.pads["pad_WallFortify"] && this.state.pads["pad_WallFortify"].level) || 0) * 0.15;
            if (thornsRatio > 0) {
              this.damageEnemy(e, Math.round(this.getHeroDamage() * thornsRatio), "#38bdf8", false);
            }

            if (this.wall.hp <= 0) {
              this.wall.hp = 0;
              this.gateBreached = true;
              this.addFloatingText(e.x, e.y - 30, "🚨 城防失守！魔物突入大本營！", "#ef4444", 20);
              if (window.GameUI) {
                window.GameUI.showToast("🚨 警報：城門防線被攻破！魔物正突入大本營！");
              }
            }
          }
        }
      } else {
        // Gate is breached! March to Town Hall at (250, 540)
        destX = this.townHall.x;
        destY = this.townHall.y;

        var distToHall = Math.hypot(destX - e.x, destY - e.y);
        if (distToHall > e.radius + this.townHall.radius + 10) {
          var hdx = destX - e.x;
          var hdy = destY - e.y;
          var hdist = Math.hypot(hdx, hdy);
          e.x += (hdx / hdist) * e.speed * spdMult * dt;
          e.y += (hdy / hdist) * e.speed * spdMult * dt;
        } else {
          // Attacking Town Hall!
          e.atkTimer -= dt;
          if (e.atkTimer <= 0) {
            e.atkTimer = 0.95;
            var hDmg = Math.max(12, Math.round(18 * this.getCurrentRealm().enemyMult * Math.pow(1.09, this.state.wave - 1)));
            if (e.isBoss) hDmg *= 4;
            this.townHall.hp = Math.max(0, this.townHall.hp - hDmg);
            this.townHall.flashTimer = 0.14;
            this.spawnBurstParticles(this.townHall.x + (Math.random() - 0.5) * 35, this.townHall.y + (Math.random() - 0.5) * 35, "#ef4444", 8);

            if (this.townHall.hp <= 0) {
              this.townHall.hp = 0;
              this.triggerDefeat();
              return;
            }
          }
        }
      }

      this.resolveWallCollisions(e, false);
    }
  },

  triggerDefeat: function() {
    if (this.isDefeated) return;
    this.isDefeated = true;
    window.SoundEngine.playHit("hammer");
    if (window.GameUI) {
      window.GameUI.showDefeatModal();
    }
  },

  reviveFromDefeat: function() {
    this.isDefeated = false;
    this.recalcWallStats(true);
    this.enemies.forEach(function(e) {
      e.x += 280;
      e.y += 140;
      e.stunTimer = 3.0;
    });
    this.spawnBurstParticles(this.townHall.x, this.townHall.y, "#fde047", 50);
    window.SoundEngine.playSkill();
    if (window.GameUI) {
      window.GameUI.closeModal();
      window.GameUI.showToast("✨ 聖光降臨！大本營與城防已完全復甦！");
      window.GameUI.updateHUD();
    }
  },

  damageEnemy: function(enemy, rawDmg, color, canCrit) {
    var dmg = rawDmg;
    var isCrit = false;
    if (enemy.isBoss) {
      dmg = Math.round(dmg * (1 + this.getTalentVal("t_boss_slayer")));
    }
    if (canCrit !== false) {
      var critChance = 0.08 + this.getTalentVal("t_crit_chance");
      if (Math.random() < critChance) {
        isCrit = true;
        var critMult = 1.75 + (this.state.talents["t_crit_chance"] || 0) * 0.15;
        dmg = Math.round(dmg * critMult);
      }
    }
    enemy.hp -= dmg;
    enemy.flashTimer = 0.12;
    this.addFloatingText(
      enemy.x + (Math.random() - 0.5) * 16,
      enemy.y - enemy.radius - 8,
      (isCrit ? "💥" : "") + dmg,
      isCrit ? "#fde047" : (color || "#ffffff"),
      isCrit ? 15 : 12
    );
  },

  killEnemy: function(index) {
    var e = this.enemies[index];
    if (!e) return;
    this.enemies.splice(index, 1);

    this.state.totalKills++;
    this.state.heroXp += e.isBoss ? 45 : 6;
    var xpNeeded = this.state.heroLevel * 45;
    if (this.state.heroXp >= xpNeeded) {
      this.state.heroXp -= xpNeeded;
      this.state.heroLevel++;
      this.addFloatingText(this.hero.x, this.hero.y - 40, "🎉 英雄升級 Lv." + this.state.heroLevel + "！", "#38bdf8", 18);
      window.SoundEngine.playUpgradeComplete();
    }

    var goldMult = (1 + this.getTalentVal("t_gold_drop")) * (1 + this.getEquipStat("goldBonus")) * this.getDivinityMult();
    var totalGold = Math.max(3, Math.round(e.gold * goldMult));
    var coinPiles = e.isBoss ? 8 : (totalGold > 20 ? 3 : 2);
    var perCoin = Math.max(1, Math.round(totalGold / coinPiles));

    for (var c = 0; c < coinPiles; c++) {
      this.spawnLootDrop(
        e.x + (Math.random() - 0.5) * 38,
        e.y + (Math.random() - 0.5) * 32,
        "gold",
        perCoin
      );
    }

    var manaChance = 0.25 + this.getTalentVal("t_mana_drop") * 0.5;
    if (e.isBoss || Math.random() < manaChance) {
      var manaAmt = Math.max(1, Math.round((e.isBoss ? 15 : 2) * (1 + this.getTalentVal("t_mana_drop"))));
      this.spawnLootDrop(e.x + (Math.random() - 0.5) * 28, e.y + (Math.random() - 0.5) * 28, "mana", manaAmt);
    }

    if (e.isBoss || Math.random() < 0.05) {
      if (e.isBoss) {
        var soulGain = Math.max(1, Math.round(2 * this.getCurrentRealm().id));
        this.state.souls += soulGain;
        this.addFloatingText(e.x, e.y - 24, "🔮 靈魂結晶 +" + soulGain, "#d8b4fe", 16);
      }
      this.spawnLootDrop(e.x, e.y, "chest", 1);
    }

    this.spawnBurstParticles(e.x, e.y, "#38bdf8", e.isBoss ? 22 : 10);
  },

  updateProjectiles: function(dt) {
    for (var i = this.projectiles.length - 1; i >= 0; i--) {
      var p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (var j = this.enemies.length - 1; j >= 0; j--) {
        var e = this.enemies[j];
        if (p.hitIds[e.id]) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= e.radius + 15) {
          p.hitIds[e.id] = true;
          p.pierce--;
          window.SoundEngine.playHit(p.kind);

          if (p.kind === "frost") {
            e.slowTimer = 2.8;
            this.spawnBurstParticles(e.x, e.y, "#38bdf8", 8);
            this.damageEnemy(e, p.dmg, "#7dd3fc", true);
          } else if (p.kind === "hammer" || p.kind === "holy_hammer" || p.kind === "arcane_chain") {
            this.spawnBurstParticles(e.x, e.y, "#60a5fa", 12);
            var jumps = 0;
            for (var k = 0; k < this.enemies.length; k++) {
              var sub = this.enemies[k];
              if (Math.hypot(sub.x - e.x, sub.y - e.y) < 105) {
                if (jumps < 3 && sub.id !== e.id) {
                  this.lightningArcs.push({ x1: e.x, y1: e.y, x2: sub.x, y2: sub.y, color: "#93c5fd", life: 0.18 });
                  jumps++;
                }
                sub.stunTimer = Math.max(sub.stunTimer, 0.45);
                this.damageEnemy(sub, Math.round(p.dmg * 0.85), "#60a5fa", true);
              }
            }
          } else if (p.kind === "flame" || p.kind === "dragon") {
            this.burnZones.push({ x: e.x, y: e.y, radius: 68, dps: p.dmg * 0.45, life: 3.2 });
            this.spawnBurstParticles(e.x, e.y, "#f97316", 12);
            this.damageEnemy(e, p.dmg, "#fb923c", true);
          } else if (p.kind === "void") {
            for (var v = 0; v < this.enemies.length; v++) {
              var ve = this.enemies[v];
              var vDist = Math.hypot(ve.x - e.x, ve.y - e.y);
              if (vDist < 140 && vDist > 5) {
                ve.x += ((e.x - ve.x) / vDist) * 38;
                ve.y += ((e.y - ve.y) / vDist) * 38;
              }
            }
            this.damageEnemy(e, p.dmg + Math.round(e.maxHp * 0.03), "#c084fc", true);
          } else {
            this.damageEnemy(e, p.dmg, p.color, true);
          }

          if (e.hp <= 0) {
            this.killEnemy(j);
          }
          if (p.pierce <= 0) {
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  },

  spawnLootDrop: function(x, y, kind, amount) {
    if (this.lootDrops.length > 90 && kind === "gold") {
      this.lootDrops[0].amount += amount;
      return;
    }
    this.lootDrops.push({
      x: Math.max(80, Math.min(this.width - 80, x)),
      y: Math.max(110, Math.min(this.height - 90, y)),
      kind: kind,
      amount: amount,
      age: 0
    });
  },

  updateLootAndFlyingCoins: function(dt) {
    var cls = this.getCurrentHeroClass();
    var magnetRange = 115 * cls.magnetBonus * (1 + this.getTalentVal("t_magnet_rad"));

    for (var i = this.lootDrops.length - 1; i >= 0; i--) {
      var d = this.lootDrops[i];
      d.age += dt;
      var dist = Math.hypot(this.hero.x - d.x, this.hero.y - d.y);
      if (dist < magnetRange || d.age > 6.5) {
        var pullSpeed = d.age > 6.5 ? 540 : 400;
        var dx = this.hero.x - d.x;
        var dy = this.hero.y - d.y;
        var len = Math.max(1, Math.hypot(dx, dy));
        d.x += (dx / len) * pullSpeed * dt;
        d.y += (dy / len) * pullSpeed * dt;
        if (len < 24) {
          this.collectLootDrop(i);
        }
      }
    }

    for (var f = this.flyingCoins.length - 1; f >= 0; f--) {
      var fc = this.flyingCoins[f];
      fc.progress += fc.speed * dt;
      if (fc.progress >= 1) {
        this.flyingCoins.splice(f, 1);
      }
    }
  },

  collectLootDrop: function(index) {
    var d = this.lootDrops[index];
    if (!d) return;
    this.lootDrops.splice(index, 1);

    if (d.kind === "gold") {
      this.state.gold += d.amount;
      this.state.totalGoldEarned += d.amount;
      window.SoundEngine.playCoinPickup();
    } else if (d.kind === "mana") {
      this.state.mana += d.amount;
      this.addFloatingText(this.hero.x, this.hero.y - 28, "💎 +" + d.amount, "#38bdf8", 13);
      window.SoundEngine.playCoinPickup();
    } else if (d.kind === "chest") {
      var item = this.rollRandomEquipment();
      this.addFloatingText(this.hero.x, this.hero.y - 34, "🎁 獲得：" + item.name, item.color, 15);
      window.SoundEngine.playUpgradeComplete();
    }
  },

  rollRandomEquipment: function(minRarity) {
    var slots = ["weapon", "armor", "ring", "relic"];
    var slot = slots[Math.floor(Math.random() * slots.length)];
    var templates = window.GAME_DATA.equipTemplates[slot];
    var tmpl = templates[Math.floor(Math.random() * templates.length)];

    var rRoll = Math.random() + (this.state.realmId - 1) * 0.08 + Math.min(0.25, this.state.wave * 0.004);
    var tier = minRarity || 0;
    if (rRoll > 1.18) tier = Math.max(tier, 5);
    else if (rRoll > 0.98) tier = Math.max(tier, 4);
    else if (rRoll > 0.80) tier = Math.max(tier, 3);
    else if (rRoll > 0.55) tier = Math.max(tier, 2);
    else if (rRoll > 0.28) tier = Math.max(tier, 1);

    var rDef = window.GAME_DATA.rarities[tier];
    var item = {
      id: "eq_" + Date.now() + "_" + Math.floor(Math.random() * 9999),
      slot: slot,
      name: "【" + rDef.name + "】" + tmpl.name,
      icon: tmpl.icon,
      tier: tier,
      color: rDef.color,
      statType: tmpl.statType,
      val: Number((tmpl.baseVal * rDef.mult).toFixed(2))
    };

    var cur = this.state.equipped[slot];
    if (!cur || item.val > cur.val) {
      if (cur) this.state.inventory.push(cur);
      this.state.equipped[slot] = item;
      this.recalcWallStats(false);
    } else {
      this.state.inventory.push(item);
    }
    if (this.state.inventory.length > 36) {
      this.state.inventory.shift();
    }
    return item;
  },

  mergeAllInventory: function() {
    var mergedCount = 0;
    for (var t = 0; t < 5; t++) {
      var matching = this.state.inventory.filter(function(i) { return i.tier === t; });
      while (matching.length >= 3) {
        var toRemove = matching.splice(0, 3);
        var removeIds = toRemove.map(function(x) { return x.id; });
        this.state.inventory = this.state.inventory.filter(function(i) {
          return removeIds.indexOf(i.id) === -1;
        });
        this.rollRandomEquipment(t + 1);
        mergedCount++;
      }
    }
    return mergedCount;
  },

  castSkill: function(index) {
    var sk = this.skills[index];
    if (!sk || sk.cd > 0) return;
    sk.cd = sk.maxCd;
    window.SoundEngine.playSkill();

    if (sk.id === "nova") {
      this.spawnBurstParticles(this.hero.x, this.hero.y, "#38bdf8", 32);
      var dmg = this.getHeroDamage() * 4.5;
      for (var i = this.enemies.length - 1; i >= 0; i--) {
        if (Math.hypot(this.enemies[i].x - this.hero.x, this.enemies[i].y - this.hero.y) < 380) {
          this.damageEnemy(this.enemies[i], dmg, "#38bdf8", true);
          if (this.enemies[i].hp <= 0) this.killEnemy(i);
        }
      }
      for (var l = 0; l < this.lootDrops.length; l++) {
        this.lootDrops[l].age = 99;
      }
      this.addFloatingText(this.hero.x, this.hero.y - 45, "🌪️ 風暴吸金！", "#38bdf8", 18);
    } else if (sk.id === "aegis") {
      sk.buffTimer = 8.0;
      this.wall.hp = Math.min(this.wall.maxHp, this.wall.hp + Math.round(this.wall.maxHp * 0.45));
      this.townHall.hp = Math.min(this.townHall.maxHp, this.townHall.hp + Math.round(this.townHall.maxHp * 0.40));
      this.gateBreached = false;
      this.addFloatingText(this.hero.x, this.hero.y - 45, "🛡️ 聖光壁壘：大本營與城防修復！", "#fde047", 18);
    } else if (sk.id === "meteor") {
      this.triggerCataclysm(false);
    }
  },

  triggerCataclysm: function(fromShrine) {
    var dmg = this.getHeroDamage() * (fromShrine ? 9.0 : 6.5);
    for (var m = 0; m < 12; m++) {
      var mx = 650 + Math.random() * 1250;
      var my = 200 + Math.random() * 980;
      this.spawnBurstParticles(mx, my, "#38bdf8", 18);
      this.burnZones.push({ x: mx, y: my, radius: 85, dps: dmg * 0.25, life: 4.0 });
    }
    for (var i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].stunTimer = 1.8;
      this.damageEnemy(this.enemies[i], dmg, "#fb923c", true);
      if (this.enemies[i].hp <= 0) this.killEnemy(i);
    }
  },

  checkQuestProgress: function() {
    var q = window.GAME_DATA.quests[this.state.questIndex];
    if (!q) return;
    var done = false;
    var self = this;

    if (q.type === "pad_lv") {
      var st = this.state.pads[q.targetId];
      if (st && st.level >= q.goal) done = true;
    } else if (q.type === "wave") {
      if (this.state.wave > q.goal) done = true;
    } else if (q.type === "zone") {
      if (this.state.unlockedZones.indexOf(q.goal) !== -1) done = true;
    } else if (q.type === "any_tower_lv") {
      window.GAME_DATA.groundPads.forEach(function(p) {
        if (p.customizable && self.state.pads[p.id] && self.state.pads[p.id].level >= q.goal) {
          done = true;
        }
      });
    } else if (q.type === "any_troop_built") {
      window.GAME_DATA.groundPads.forEach(function(p) {
        if (p.customizable && self.state.pads[p.id] && self.state.pads[p.id].level >= q.goal) {
          var bp = self.getPadBlueprint(p);
          if (bp && bp.category === "barracks") done = true;
        }
      });
    } else if (q.type === "unlock_bp_count") {
      if (this.state.unlockedBlueprints.length >= q.goal) done = true;
    }

    if (done) {
      this.state.gold += q.rewardGold;
      this.state.mana += q.rewardMana;
      this.state.souls += q.rewardSoul;
      this.state.questIndex++;
      window.SoundEngine.playUpgradeComplete();
      if (window.GameUI) {
        window.GameUI.showToast("🏆 完成任務【" + q.title + "】！獲得 🪙" + q.rewardGold + " 💎" + q.rewardMana + " 🔮" + q.rewardSoul);
        window.GameUI.updateHUD();
      }
    }
  },

  changeRealm: function(newRealmId, isRebirth) {
    var startGold = 200 + this.getTalentVal("t_start_gold");
    this.state.realmId = newRealmId;
    this.state.wave = 1;
    this.state.gold = startGold;
    this.state.unlockedZones = [0];
    var self = this;
    window.GAME_DATA.groundPads.forEach(function(p) {
      var startLv = (p.id === "pad_FrostStatue" || p.id === "pad_HammerStatue" || p.id === "pad_TownHall") ? 1 : 0;
      var prevBp = (self.state.pads[p.id] && self.state.pads[p.id].blueprintId) || p.defaultBlueprint || "bp_arcane_spire";
      self.state.pads[p.id] = {
        level: startLv,
        invested: 0,
        cooldown: 0,
        blueprintId: p.customizable ? prevBp : null,
        atkTimer: 0
      };
    });
    this.enemies = [];
    this.projectiles = [];
    this.lootDrops = [];
    this.allies = [];
    this.burnZones = [];
    this.hero.x = 560;
    this.hero.y = 520;
    this.isDefeated = false;
    this.recalcWallStats(true);
    this.setupWave(1);
    this.saveGame();
    if (window.GameUI) {
      window.GameUI.updateHUD();
      window.GameUI.showToast(isRebirth ? "✨ 轉生成功！神性加成已提升！" : "🗺️ 已進入：" + this.getCurrentRealm().name);
    }
  },

  performRebirth: function() {
    var earnedSouls = Math.max(2, Math.floor(this.state.wave * 0.6 * this.state.realmId));
    var earnedDivinity = Math.max(1, Math.floor(this.state.wave / 5) * this.state.realmId);
    this.state.souls += earnedSouls;
    this.state.divinity += earnedDivinity;
    this.state.rebirthCount += 1;
    this.changeRealm(this.state.realmId, true);
  },

  spawnBurstParticles: function(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var spd = 40 + Math.random() * 140;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: color,
        size: 3 + Math.random() * 4,
        life: 0.45 + Math.random() * 0.35
      });
    }
  },

  addFloatingText: function(x, y, text, color, size) {
    if (this.floatingTexts.length > 35) this.floatingTexts.shift();
    this.floatingTexts.push({
      x: x,
      y: y,
      text: text,
      color: color || "#ffffff",
      size: size || 14,
      life: 1.05
    });
  },

  updateParticlesAndTexts: function(dt) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (var j = this.floatingTexts.length - 1; j >= 0; j--) {
      var ft = this.floatingTexts[j];
      ft.y -= 32 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(j, 1);
    }
  },

  saveGame: function() {
    try {
      this.state.lastSaveTimestamp = Date.now();
      localStorage.setItem("AAB_SAVE_V1", JSON.stringify(this.state));
    } catch (e) {}
  },

  loadSave: function() {
    try {
      var raw = localStorage.getItem("AAB_SAVE_V1");
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed.gold === "number") {
        for (var k in parsed) {
          if (Object.prototype.hasOwnProperty.call(parsed, k)) {
            this.state[k] = parsed[k];
          }
        }
        this.initDefaultPads();
        var elapsedSec = Math.floor((Date.now() - (this.state.lastSaveTimestamp || Date.now())) / 1000);
        if (elapsedSec > 60) {
          var cappedSec = Math.min(elapsedSec, 36000);
          var mineLv = Math.max(1, (this.state.pads["pad_GoldMine"] && this.state.pads["pad_GoldMine"].level) || 1);
          var offMult = (1 + this.getTalentVal("t_offline_gain")) * this.getDivinityMult();
          var offGold = Math.round(cappedSec * mineLv * 1.8 * offMult);
          var offMana = Math.round(cappedSec * 0.08 * offMult);
          this.state.gold += offGold;
          this.state.mana += offMana;
        }
      }
    } catch (e) {}
  },

  screenToWorld: function(clientX, clientY) {
    var rect = this.canvas.getBoundingClientRect();
    var sx = clientX - rect.left;
    var sy = clientY - rect.top;
    return {
      x: (sx - this.camera.x) / this.camera.zoom,
      y: (sy - this.camera.y) / this.camera.zoom
    };
  },

  bindInputs: function() {
    var self = this;
    window.addEventListener("keydown", function(e) {
      self.input.keys[e.code] = true;
    });
    window.addEventListener("keyup", function(e) {
      self.input.keys[e.code] = false;
    });

    this.canvas.addEventListener("wheel", function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.08 : 0.08;
      self.camera.userZoomMult = Math.max(0.55, Math.min(1.25, (self.camera.userZoomMult || 0.85) + delta));
    }, { passive: false });

    var startPointer = function(clientX, clientY) {
      window.SoundEngine.init();
      self.input.joyActive = true;
      self.input.joyStartX = clientX;
      self.input.joyStartY = clientY;
      self.input.joyCurX = clientX;
      self.input.joyCurY = clientY;
      self.input.joyDx = 0;
      self.input.joyDy = 0;
    };

    var movePointer = function(clientX, clientY) {
      if (!self.input.joyActive) return;
      self.input.joyCurX = clientX;
      self.input.joyCurY = clientY;
      var dx = clientX - self.input.joyStartX;
      var dy = clientY - self.input.joyStartY;
      var dist = Math.hypot(dx, dy);
      var maxR = 50;
      if (dist > 6) {
        var clamped = Math.min(dist, maxR) / maxR;
        self.input.joyDx = (dx / dist) * clamped;
        self.input.joyDy = (dy / dist) * clamped;
      } else {
        self.input.joyDx = 0;
        self.input.joyDy = 0;
      }
    };

    var endPointer = function(clientX, clientY) {
      if (!self.input.joyActive) return;
      var moved = Math.hypot(clientX - self.input.joyStartX, clientY - self.input.joyStartY);
      self.input.joyActive = false;
      self.input.joyDx = 0;
      self.input.joyDy = 0;

      if (moved < 14) {
        var pt = self.screenToWorld(clientX, clientY);
        self.hero.targetX = pt.x;
        self.hero.targetY = pt.y;
      }
    };

    this.canvas.addEventListener("mousedown", function(e) {
      startPointer(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", function(e) {
      movePointer(e.clientX, e.clientY);
    });
    window.addEventListener("mouseup", function(e) {
      endPointer(e.clientX, e.clientY);
    });

    this.canvas.addEventListener("touchstart", function(e) {
      if (e.touches.length > 0) {
        startPointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("touchmove", function(e) {
      if (self.input.joyActive && e.touches.length > 0) {
        movePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("touchend", function(e) {
      var t = e.changedTouches && e.changedTouches[0];
      endPointer(t ? t.clientX : self.input.joyCurX, t ? t.clientY : self.input.joyCurY);
    }, { passive: true });
  },

  // ================= 2.5D CEL-SHADED RENDERER =================
  render: function() {
    var ctx = this.ctx;
    var cw = this.canvas.width;
    var ch = this.canvas.height;
    var realm = this.getCurrentRealm();

    var scaleX = cw / 1350;
    var scaleY = ch / 920;
    var baseZoom = Math.max(scaleX, scaleY) * (this.camera.userZoomMult || 0.85);
    if (cw < 650) {
      baseZoom = Math.max(0.56, baseZoom);
    }
    this.camera.zoom = baseZoom;

    var targetCamX = cw * 0.5 - this.hero.x * baseZoom;
    var targetCamY = ch * 0.5 - this.hero.y * baseZoom;
    var minCamX = cw - this.width * baseZoom;
    var minCamY = ch - this.height * baseZoom;
    this.camera.x = Math.min(0, Math.max(minCamX, targetCamX));
    this.camera.y = Math.min(0, Math.max(minCamY, targetCamY));

    ctx.fillStyle = realm.groundColor;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    this.drawForestCourtyardAndThreeRoads(ctx, realm);
    this.drawTerritoryBoundaries(ctx);
    this.drawDungeonGateAndBraziers(ctx);
    this.drawBurnZones(ctx);
    this.drawRedesignedFortressWallAndGates(ctx, realm);
    this.drawTownHall(ctx);
    this.drawGroundLogosAndStatues(ctx);
    this.drawSceneryProps(ctx);
    this.drawLootDrops(ctx);
    this.drawAllies(ctx);
    this.drawEnemies(ctx);
    this.drawHero(ctx);
    this.drawProjectilesAndLightning(ctx);
    this.drawFlyingCoins(ctx);
    this.drawPointerHandOnQuestPad(ctx);
    this.drawParticlesAndTexts(ctx);

    ctx.restore();

    this.drawOffscreenThreatIndicators(ctx, cw, ch);
    this.drawTouchJoystick(ctx);
    if (this.isDefeated) {
      this.drawDefeatOverlay(ctx, cw, ch);
    }
  },

  drawForestCourtyardAndThreeRoads: function(ctx, realm) {
    ctx.fillStyle = realm.grassDark || "#3e7533";
    for (var gx = 60; gx < this.width; gx += 140) {
      for (var gy = 80; gy < this.height; gy += 140) {
        ctx.beginPath();
        ctx.ellipse(gx + (gy % 280 === 0 ? 35 : 0), gy, 38, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Inner Courtyard
    ctx.save();
    ctx.fillStyle = "rgba(148, 163, 152, 0.24)";
    ctx.beginPath();
    ctx.moveTo(60, 60);
    ctx.lineTo(940, 60);
    ctx.lineTo(940, 165);
    ctx.lineTo(185, 825);
    ctx.lineTo(60, 825);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3 Roads
    var roads = (window.GAME_DATA.mapConfig && window.GAME_DATA.mapConfig.roads) || [];
    roads.forEach(function(road) {
      var wps = road.waypoints;
      if (!wps || wps.length < 2) return;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.strokeStyle = realm.pathBorder || "#78532a";
      ctx.lineWidth = (road.width || 110) + 18;
      ctx.beginPath();
      ctx.moveTo(wps[0].x, wps[0].y);
      for (var i = 1; i < wps.length; i++) {
        ctx.lineTo(wps[i].x, wps[i].y);
      }
      ctx.stroke();

      ctx.strokeStyle = realm.pathColor || "#b58952";
      ctx.lineWidth = road.width || 110;
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.setLineDash([18, 22]);
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    });
  },

  drawDungeonGateAndBraziers: function(ctx) {
    var mineLv = (this.state.pads["pad_GoldMine"] && this.state.pads["pad_GoldMine"].level) || 0;
    var time = performance.now() * 0.006;

    ctx.save();
    ctx.translate(215, 215);

    ctx.fillStyle = "#68736b";
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-75, -65, 150, 105, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#94a398";
    ctx.beginPath();
    ctx.roundRect(-75, -65, 150, 28, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, -10, 32, Math.PI, 0, false);
    ctx.lineTo(32, 40);
    ctx.lineTo(-32, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#8c968e";
    ctx.fillRect(-44, 36, 88, 12);
    ctx.strokeRect(-44, 36, 88, 12);

    [-62, 62].forEach(function(bx) {
      ctx.fillStyle = "#78716c";
      ctx.fillRect(bx - 12, -10, 24, 38);
      ctx.strokeRect(bx - 12, -10, 24, 38);
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.arc(bx, -12, 15, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      var flicker = Math.sin(time + bx) * 3;
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(bx, -18, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(bx + flicker * 0.4, -22, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#fde047";
    ctx.font = "900 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    var txt = mineLv > 0 ? "🔥 地下金庫 Lv." + mineLv : "🔥 地下金庫";
    ctx.strokeText(txt, 0, -46);
    ctx.fillText(txt, 0, -46);

    ctx.restore();
  },

  // 2.5D Grand Castle Ramparts & Gatehouses
  drawRedesignedFortressWallAndGates: function(ctx, realm) {
    var wallLv = (this.state.pads["pad_WallFortify"] && this.state.pads["pad_WallFortify"].level) || 0;
    var hpPct = Math.max(0, Math.min(1, this.wall.hp / this.wall.maxHp));
    var segments = (window.GAME_DATA.mapConfig && window.GAME_DATA.mapConfig.wallSegments) || [];
    var turrets = (window.GAME_DATA.mapConfig && window.GAME_DATA.mapConfig.bastionTurrets) || [];
    var self = this;

    var wallBaseCol = wallLv >= 25 ? "#b45309" : (wallLv >= 10 ? "#334155" : "#4a544c");
    var wallTopCol = wallLv >= 25 ? "#fde047" : (wallLv >= 10 ? "#93c5fd" : (realm.wallTopColor || "#9ca898"));
    var trimCol = wallLv >= 25 ? "#fef08a" : (wallLv >= 10 ? "#38bdf8" : "#22c55e");

    segments.forEach(function(seg) {
      if (seg.type === "gate" || seg.isGate) {
        self.drawGatehouseArchway(ctx, seg, wallLv, hpPct);
      } else {
        self.drawSolidRampartSegment(ctx, seg, wallBaseCol, wallTopCol, trimCol, hpPct);
      }
    });

    turrets.forEach(function(t) {
      self.drawBastionTurret(ctx, t.x, t.y, wallLv, wallBaseCol, wallTopCol, trimCol);
    });

    // Wall HP Floating Bar
    var midX = 590;
    var midY = 475;
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.strokeStyle = this.gateBreached ? "#ef4444" : "#22c55e";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(midX - 95, midY - 14, 190, 24, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.gateBreached ? "#ef4444" : (hpPct > 0.4 ? "#22c55e" : "#f59e0b");
    ctx.beginPath();
    ctx.roundRect(midX - 91, midY - 10, 182 * hpPct, 16, 8);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 10.5px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    var hpStr = (this.gateBreached ? "🚨 城門已破！" : "🏰 城防要塞 ") + "(" + Math.ceil(this.wall.hp) + "/" + this.wall.maxHp + ")";
    ctx.strokeText(hpStr, midX, midY + 2);
    ctx.fillText(hpStr, midX, midY + 2);
    ctx.restore();
  },

  drawSolidRampartSegment: function(ctx, seg, baseCol, topCol, trimCol, hpPct) {
    var dx = seg.x2 - seg.x1;
    var dy = seg.y2 - seg.y1;
    var len = Math.hypot(dx, dy);
    var wallAng = Math.atan2(dy, dx);
    var steps = Math.max(3, Math.floor(len / 44));

    for (var s = 0; s <= steps; s++) {
      var t = s / steps;
      var bx = seg.x1 + dx * t;
      var by = seg.y1 + dy * t;

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(wallAng);

      ctx.fillStyle = "rgba(0,0,0,0.40)";
      ctx.beginPath();
      ctx.roundRect(-26, -18, 52, 36, 6);
      ctx.fill();

      ctx.fillStyle = baseCol;
      ctx.strokeStyle = "#141416";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-24, -22, 48, 44, 6);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(15, 23, 42, 0.48)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-22, -6); ctx.lineTo(22, -6);
      ctx.moveTo(-22, 10); ctx.lineTo(22, 10);
      ctx.stroke();

      ctx.fillStyle = topCol;
      ctx.strokeStyle = "#141416";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-26, -28, 52, 20, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = topCol;
      ctx.beginPath();
      ctx.roundRect(-14, -38, 28, 14, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-2, -35, 4, 8);

      ctx.fillStyle = trimCol;
      ctx.beginPath();
      ctx.arc(-8, -14, 4, 0, Math.PI * 2);
      ctx.arc(8, -14, 4, 0, Math.PI * 2);
      ctx.fill();

      if (hpPct < 0.65 && s % 2 === 1) {
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-8, -18);
        ctx.lineTo(2, -4);
        ctx.lineTo(-4, 12);
        ctx.stroke();
      }

      ctx.restore();
    }
  },

  drawGatehouseArchway: function(ctx, seg, wallLv, hpPct) {
    var midX = (seg.x1 + seg.x2) * 0.5;
    var midY = (seg.y1 + seg.y2) * 0.5;
    var dx = seg.x2 - seg.x1;
    var dy = seg.y2 - seg.y1;
    var gateLen = Math.hypot(dx, dy);
    var wallAng = Math.atan2(dy, dx);
    var time = performance.now() * 0.004;

    ctx.save();
    ctx.translate(midX, midY);

    // Roadbed through gate
    ctx.save();
    ctx.rotate(wallAng);

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(-gateLen * 0.5 - 6, -35, gateLen + 12, 70);

    var roadGrad = ctx.createLinearGradient(0, -35, 0, 35);
    roadGrad.addColorStop(0, "#a89f91");
    roadGrad.addColorStop(0.5, "#c4b5a0");
    roadGrad.addColorStop(1, "#8f8272");
    ctx.fillStyle = roadGrad;
    ctx.fillRect(-gateLen * 0.5, -32, gateLen, 64);

    // Green arrows if open, red warning if breached
    var arrowPhase = (time * 3) % 1;
    ctx.fillStyle = this.gateBreached ? "rgba(239, 68, 68, 0.85)" : "rgba(34, 197, 94, 0.75)";
    ctx.strokeStyle = this.gateBreached ? "#f87171" : "#4ade80";
    ctx.lineWidth = 2.5;

    for (var a = -2; a <= 2; a++) {
      var ax = a * 24;
      var ay = -12 + arrowPhase * 24;
      if (ay > -28 && ay < 28) {
        ctx.beginPath();
        ctx.moveTo(ax - 8, ay - 6);
        ctx.lineTo(ax, ay + 4);
        ctx.lineTo(ax + 8, ay - 6);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Twin Guard Towers
    var pierBaseCol = wallLv >= 25 ? "#b45309" : (wallLv >= 10 ? "#334155" : "#4c554e");
    var pierTopCol = wallLv >= 25 ? "#fde047" : (wallLv >= 10 ? "#93c5fd" : "#8c968e");

    [-gateLen * 0.5, gateLen * 0.5].forEach(function(pxOffset, idx) {
      ctx.save();
      ctx.rotate(wallAng);
      ctx.translate(pxOffset, 0);

      ctx.fillStyle = pierBaseCol;
      ctx.strokeStyle = "#141416";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-22, -28, 44, 56, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = pierTopCol;
      ctx.beginPath();
      ctx.roundRect(-25, -38, 50, 18, 5);
      ctx.fill();
      ctx.stroke();

      var bannerCol = idx === 0 ? "#2563eb" : "#dc2626";
      ctx.fillStyle = bannerCol;
      ctx.beginPath();
      ctx.moveTo(-7, -26);
      ctx.lineTo(7, -26);
      ctx.lineTo(7, 16);
      ctx.lineTo(0, 24);
      ctx.lineTo(-7, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });

    // Archway & Portcullis
    ctx.save();
    ctx.rotate(wallAng);
    ctx.fillStyle = pierTopCol;
    ctx.strokeStyle = "#141416";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-gateLen * 0.5 + 10, -56, gateLen - 20, 24, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(-10, -56, 20, 24);
    ctx.strokeRect(-10, -56, 20, 24);

    // Portcullis: Raised if open, broken/shattered if breached
    ctx.strokeStyle = this.gateBreached ? "#ef4444" : "#0f172a";
    ctx.lineWidth = 3;
    var portY = this.gateBreached ? 0 : -24;
    for (var gx = -gateLen * 0.5 + 24; gx <= gateLen * 0.5 - 24; gx += 16) {
      ctx.beginPath();
      ctx.moveTo(gx, -48);
      ctx.lineTo(gx, portY);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.strokeStyle = this.gateBreached ? "#ef4444" : "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-60, -78, 120, 20, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.gateBreached ? "#f87171" : "#4ade80";
    ctx.font = "900 10.5px Inter, sans-serif";
    ctx.textAlign = "center";
    var gateName = (seg.id === "gate_north" ? "⛩️ 北城門" : "⛩️ 南城門") + (this.gateBreached ? " (失守)" : " (通衢)");
    ctx.fillText(gateName, 0, -64);

    ctx.restore();
    ctx.restore();
  },

  drawBastionTurret: function(ctx, x, y, wallLv, baseCol, topCol, trimCol) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = baseCol;
    ctx.strokeStyle = "#141416";
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.roundRect(-26, -42, 52, 58, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = topCol;
    ctx.beginPath();
    ctx.roundRect(-30, -54, 60, 18, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = wallLv >= 25 ? "#b45309" : (wallLv >= 10 ? "#1e3a8a" : "#78350f");
    ctx.beginPath();
    ctx.moveTo(-24, -54);
    ctx.lineTo(0, -96);
    ctx.lineTo(24, -54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  },

  // ================= 2.5D TOWN HALL (大本營) =================
  drawTownHall: function(ctx) {
    var h = this.townHall;
    var hallLv = (this.state.pads["pad_TownHall"] && this.state.pads["pad_TownHall"].level) || 1;
    var hpPct = Math.max(0, Math.min(1, h.hp / h.maxHp));
    var time = performance.now() * 0.005;

    ctx.save();
    ctx.translate(h.x, h.y);

    // Ground Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 75, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // Battered Stone Plinth / Steps
    ctx.fillStyle = "#334155";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-65, -35, 130, 68, 10);
    ctx.fill();
    ctx.stroke();

    // Steps
    ctx.fillStyle = "#64748b";
    ctx.fillRect(-28, 22, 56, 14);
    ctx.strokeRect(-28, 22, 56, 14);

    // Main Keep Body
    ctx.fillStyle = h.flashTimer > 0 ? "#ffffff" : "#475569";
    ctx.beginPath();
    ctx.roundRect(-52, -72, 104, 82, 8);
    ctx.fill();
    ctx.stroke();

    // Ashlar grooves
    ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-50, -45); ctx.lineTo(50, -45);
    ctx.moveTo(-50, -18); ctx.lineTo(50, -18);
    ctx.stroke();

    // 4 Corner Turrets
    [[-48, -75], [48, -75], [-48, 0], [48, 0]].forEach(function(pos) {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(pos[0] - 12, pos[1] - 18, 24, 36, 5);
      ctx.fill();
      ctx.stroke();

      // Turret blue roofs
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath();
      ctx.moveTo(pos[0] - 14, pos[1] - 18);
      ctx.lineTo(pos[0], pos[1] - 42);
      ctx.lineTo(pos[0] + 14, pos[1] - 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold tip
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(pos[0], pos[1] - 44, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Central Grand Belfry / Clock Tower
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.roundRect(-24, -112, 48, 45, 6);
    ctx.fill();
    ctx.stroke();

    // Arched Belfry windows
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, -90, 8, Math.PI, 0, false);
    ctx.lineTo(8, -78);
    ctx.lineTo(-8, -78);
    ctx.closePath();
    ctx.fill();

    // Central Roof Spire
    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.moveTo(-26, -112);
    ctx.lineTo(0, -156);
    ctx.lineTo(26, -112);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Waving Royal Banner Flag
    var flagWave = Math.sin(time * 4) * 4;
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -156);
    ctx.lineTo(0, -185);
    ctx.stroke();

    ctx.fillStyle = "#dc2626";
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -185);
    ctx.lineTo(26 + flagWave, -175);
    ctx.lineTo(0, -165);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Arched Entrance Doors
    ctx.fillStyle = "#78350f";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 8, 16, Math.PI, 0, false);
    ctx.lineTo(16, 28);
    ctx.lineTo(-16, 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Sacred Sun-Shield
    var shieldPulse = 1 + Math.sin(time * 3) * 0.08;
    ctx.save();
    ctx.translate(0, -42);
    ctx.scale(shieldPulse, shieldPulse);
    ctx.fillStyle = "#fbbf24";
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#78350f";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⚜", 0, 4);
    ctx.restore();

    // Floating HP Bar & Label above Town Hall
    ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-85, -215, 170, 24, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hpPct > 0.4 ? "#f59e0b" : "#ef4444";
    ctx.beginPath();
    ctx.roundRect(-81, -211, 162 * hpPct, 16, 8);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 10.5px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    var hallText = "🏛️ 守護大本營 Lv." + hallLv + " (" + Math.ceil(h.hp) + "/" + h.maxHp + ")";
    ctx.strokeText(hallText, 0, -199);
    ctx.fillText(hallText, 0, -199);

    ctx.restore();
  },

  drawTerritoryBoundaries: function(ctx) {
    var zones = [
      { id: 1, label: "🔒 擴建北道 (踏上 EXPAND 陣位解鎖)", x: 240, y: 80, w: 1120, h: 170 },
      { id: 2, label: "🔒 擴建中路 (踏上 EXPAND 陣位解鎖)", x: 760, y: 270, w: 980, h: 420 },
      { id: 3, label: "🔒 擴建南道 (踏上 EXPAND 陣位解鎖)", x: 80, y: 690, w: 1380, h: 520 }
    ];
    var self = this;
    zones.forEach(function(z) {
      if (self.state.unlockedZones.indexOf(z.id) === -1) {
        ctx.save();
        ctx.fillStyle = "rgba(15, 23, 42, 0.44)";
        ctx.strokeStyle = "rgba(168, 85, 247, 0.65)";
        ctx.setLineDash([10, 8]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(z.x, z.y, z.w, z.h, 20);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fde047";
        ctx.font = "900 15px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3.5;
        ctx.strokeText(z.label, z.x + z.w / 2, z.y + z.h / 2);
        ctx.fillText(z.label, z.x + z.w / 2, z.y + z.h / 2);
        ctx.restore();
      }
    });
  },

  drawGroundLogosAndStatues: function(ctx) {
    var self = this;
    var time = performance.now() * 0.004;

    window.GAME_DATA.groundPads.forEach(function(pad) {
      if (self.state.unlockedZones.indexOf(pad.zone) === -1) return;
      if (pad.type === "town_hall") return; // Rendered as Keep

      var st = self.state.pads[pad.id] || { level: 0, invested: 0, cooldown: 0 };
      var cost = self.getPadCost(pad);
      var rem = self.getPadRemaining(pad);
      var avail = pad.currency === "mana" ? self.state.mana : self.state.gold;
      var canAfford = avail >= rem;
      var isStanding = self.hero.activePadId === pad.id;
      var isMax = st.level >= pad.maxLevel;
      var bp = pad.customizable ? self.getPadBlueprint(pad) : null;

      // Draw Tower / Barracks building
      if (pad.customizable && bp) {
        var tx = pad.towerX || pad.x;
        var ty = pad.towerY || (pad.y - 54);
        self.drawCelShadedTowerOrBarracks(ctx, pad, bp, st.level, tx, ty, time);
      }

      ctx.save();
      ctx.translate(pad.x, pad.y);

      if (isStanding || (canAfford && !isMax && pad.id === "pad_FrostStatue")) {
        var pulse = 1 + Math.sin(time * 2.2) * 0.06;
        ctx.save();
        ctx.scale(pulse, pulse * 0.82);
        var haloGrad = ctx.createRadialGradient(0, 0, 34, 0, 0, 62);
        haloGrad.addColorStop(0, "rgba(56, 189, 248, 0.85)");
        haloGrad.addColorStop(0.6, "rgba(34, 211, 238, 0.45)");
        haloGrad.addColorStop(1, "rgba(34, 211, 238, 0)");
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 62, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#67e8f9";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.scale(1, 0.82);

      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.arc(0, 5, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isStanding ? "#cbd5e1" : "#8c968e";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = pad.type === "expand" ? "#3b2d54" : (bp && bp.category === "barracks" ? "#1e3a2f" : "#2e2842");
      ctx.strokeStyle = "#1e1b4b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (st.invested > 0 && !isMax) {
        var prog = Math.min(1, st.invested / cost);
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.arc(0, 0, 40, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      var rawLabel = (bp ? bp.name : pad.name);
      ctx.font = "900 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3.2;
      ctx.fillStyle = "#ffffff";
      ctx.strokeText(rawLabel, 0, -4);
      ctx.fillText(rawLabel, 0, -4);

      if (!isMax) {
        var costStr = (st.cooldown && st.cooldown > 0) ? Math.ceil(st.cooldown) + "s" : (rem > 999 ? (rem / 1000).toFixed(1) + "k" : String(rem));
        ctx.fillStyle = pad.currency === "mana" ? "#c084fc" : "#fbbf24";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-14, 12, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = "900 11px Inter, sans-serif";
        ctx.fillStyle = canAfford ? "#fde047" : "#f87171";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText(costStr, 5, 16);
        ctx.fillText(costStr, 5, 16);
      } else {
        ctx.font = "900 10px Inter, sans-serif";
        ctx.fillStyle = "#4ade80";
        ctx.strokeText("MAX", 0, 14);
        ctx.fillText("MAX", 0, 14);
      }

      ctx.restore();
    });
  },

  drawCelShadedTowerOrBarracks: function(ctx, pad, bp, level, tx, ty, time) {
    ctx.save();
    ctx.translate(tx, ty);

    var kind = bp.projKind;
    if (kind === "frost") {
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.beginPath();
      ctx.ellipse(0, 22, 38, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = level >= 15 ? "#fde047" : "#8c968e";
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-28, -55, 56, 75, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = level > 0 ? "#38bdf8" : "#1e293b";
      ctx.beginPath();
      ctx.arc(0, -18, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#a3ad9e";
      ctx.beginPath();
      ctx.roundRect(-34, -68, 68, 18, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.moveTo(-26, -68);
      ctx.lineTo(0, -112);
      ctx.lineTo(14, -116);
      ctx.lineTo(26, -68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (kind === "hammer") {
      ctx.fillStyle = "#78827a";
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(-32, -8, 64, 32, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.roundRect(-16, -46, 32, 28, 6);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -56, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(-4, -70, 9, Math.PI * 0.8, Math.PI * 2.1);
      ctx.fill();
      ctx.stroke();
    } else if (bp.category === "barracks" && level > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.beginPath();
      ctx.ellipse(0, 14, 36, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#475569";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-28, -36, 56, 46, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = bp.color || "#22c55e";
      ctx.beginPath();
      ctx.moveTo(-34, -34);
      ctx.lineTo(0, -62);
      ctx.lineTo(34, -34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(0, 10, 12, Math.PI, 0, false);
      ctx.fill();

      ctx.font = "18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(bp.icon, 0, -38);
    } else if (level > 0) {
      ctx.save();
      ctx.translate(0, -28 + Math.sin(time * 2.5) * 2);
      ctx.fillStyle = bp.color || "#fde047";
      ctx.strokeStyle = "#1e1b4b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(bp.icon, 0, 7);
      ctx.restore();
    }

    ctx.restore();
  },

  drawSceneryProps: function(ctx) {
    var time = performance.now() * 0.003;
    this.scenery.forEach(function(s) {
      ctx.save();
      ctx.translate(s.x, s.y);
      var sc = s.scale || 1;
      ctx.scale(sc, sc);

      if (s.kind === "tree" || s.kind === "rune_tree") {
        ctx.fillStyle = "#78350f";
        ctx.strokeStyle = "#1c1917";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-12, -28, 24, 34, 4);
        ctx.fill();
        ctx.stroke();

        if (s.kind === "rune_tree") {
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(0, -10, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = "#2e6f28";
        ctx.beginPath();
        ctx.arc(0, -52, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#4d9e3f";
        ctx.beginPath();
        ctx.arc(-14, -60, 24, 0, Math.PI * 2);
        ctx.arc(14, -58, 24, 0, Math.PI * 2);
        ctx.arc(0, -72, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (s.kind === "crystal_cluster") {
        var glow = 0.85 + Math.sin(time * 2 + s.x) * 0.15;
        ctx.save();
        ctx.scale(glow, glow);
        ctx.fillStyle = s.color || "#d946ef";
        ctx.strokeStyle = "#1e1b4b";
        ctx.lineWidth = 2.8;

        ctx.beginPath();
        ctx.moveTo(-8, 4);
        ctx.lineTo(-10, -24);
        ctx.lineTo(0, -36);
        ctx.lineTo(10, -22);
        ctx.lineTo(8, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    });
  },

  drawHero: function(ctx) {
    var cls = this.getCurrentHeroClass();
    var h = this.hero;
    ctx.save();
    ctx.translate(h.x, h.y);

    // Sacred ground halo
    ctx.save();
    ctx.scale(1, 0.68);
    var grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 34);
    grad.addColorStop(0, "rgba(253, 224, 71, 0.35)");
    grad.addColorStop(0.75, "rgba(250, 204, 21, 0.75)");
    grad.addColorStop(1, "rgba(250, 204, 21, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (h.targetX !== null && h.targetY !== null) {
      ctx.save();
      ctx.strokeStyle = "rgba(253, 224, 71, 0.55)";
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(h.targetX - h.x, h.targetY - h.y);
      ctx.stroke();
      ctx.restore();
    }

    var bob = Math.sin(h.animPhase) * 2.5;
    ctx.save();
    ctx.scale(h.facing, 1);

    // Cape
    ctx.fillStyle = cls.capeColor || "#1d4ed8";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-13, -18 + bob);
    ctx.lineTo(13, -18 + bob);
    ctx.lineTo(17, 6 + bob);
    ctx.lineTo(-17, 6 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Body
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(-4, -16 + bob, 8, 21);

    // Head
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(0, -24 + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Beard
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(-9, -22 + bob);
    ctx.quadraticCurveTo(0, -6 + bob, 9, -22 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hat
    ctx.fillStyle = cls.hatColor || "#2563eb";
    ctx.beginPath();
    ctx.ellipse(0, -31 + bob, 17, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-12, -32 + bob);
    ctx.lineTo(2, -52 + bob);
    ctx.lineTo(12, -32 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Staff
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(14, 6 + bob);
    ctx.lineTo(18, -32 + bob);
    ctx.stroke();

    // Staff Gem
    ctx.fillStyle = "#38bdf8";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(18, -36 + bob, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.beginPath();
    ctx.roundRect(-26, -68 + bob, 52, 15, 7);
    ctx.fill();
    ctx.fillStyle = "#fde047";
    ctx.font = "900 9.5px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Lv." + this.state.heroLevel + " " + cls.name, 0, -57 + bob);

    ctx.restore();
  },

  // ================= PROCEDURAL MONSTER FIGURES (NO CIRCLES!) =================
  drawEnemies: function(ctx) {
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      var bob = Math.abs(Math.sin(e.walkPhase || 0)) * 3;
      var fTime = e.flashTimer > 0;
      ctx.save();
      ctx.translate(e.x, e.y);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, e.radius * 0.75, e.radius * 0.95, e.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;

      if (e.archId === "cultist") {
        // Goblin: Green body, pointy goblin ears, leather tunic, dagger
        ctx.fillStyle = fTime ? "#ffffff" : "#65a30d";
        // Torso & legs
        ctx.fillRect(-7, -4 - bob, 14, 14);
        ctx.strokeRect(-7, -4 - bob, 14, 14);
        // Tunic
        ctx.fillStyle = fTime ? "#ffffff" : "#78350f";
        ctx.fillRect(-6, -4 - bob, 12, 8);
        // Head
        ctx.fillStyle = fTime ? "#ffffff" : "#84cc16";
        ctx.beginPath();
        ctx.arc(0, -12 - bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Pointy ears
        ctx.beginPath();
        ctx.moveTo(-9, -14 - bob); ctx.lineTo(-19, -17 - bob); ctx.lineTo(-8, -9 - bob);
        ctx.moveTo(9, -14 - bob); ctx.lineTo(19, -17 - bob); ctx.lineTo(8, -9 - bob);
        ctx.fill();
        ctx.stroke();
        // Dagger in hand
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(8, -8 - bob, 10, 3);
        // Yellow eyes
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(-4, -14 - bob, 3, 3);
        ctx.fillRect(2, -14 - bob, 3, 3);

      } else if (e.archId === "skeleton_warrior") {
        // Skeleton: Bone torso, ribs, wooden shield, scimitar
        ctx.fillStyle = fTime ? "#ffffff" : "#cbd5e1";
        // Spine & pelvis
        ctx.fillRect(-3, -4 - bob, 6, 14);
        // Ribs
        ctx.fillRect(-8, -4 - bob, 16, 3);
        ctx.fillRect(-7, 1 - bob, 14, 3);
        // Skull
        ctx.fillStyle = fTime ? "#ffffff" : "#f8fafc";
        ctx.beginPath();
        ctx.roundRect(-9, -20 - bob, 18, 15, 4);
        ctx.fill();
        ctx.stroke();
        // Eye sockets
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-5, -16 - bob, 3.5, 4);
        ctx.fillRect(2, -16 - bob, 3.5, 4);
        // Shield on left arm
        ctx.fillStyle = "#78350f";
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-11, -2 - bob, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Scimitar on right arm
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(8, 0 - bob);
        ctx.quadraticCurveTo(16, -8 - bob, 14, -18 - bob);
        ctx.stroke();

      } else if (e.archId === "shadow_imp") {
        // Shadow Imp: Horned purple body, flapping bat wings, pitchfork
        var wingFlap = Math.sin(e.walkPhase * 1.5) * 6;
        ctx.fillStyle = fTime ? "#ffffff" : "#4c1d95";
        // Wings
        ctx.beginPath();
        ctx.moveTo(-6, -8 - bob);
        ctx.lineTo(-20, -18 - bob + wingFlap);
        ctx.lineTo(-12, 0 - bob);
        ctx.moveTo(6, -8 - bob);
        ctx.lineTo(20, -18 - bob - wingFlap);
        ctx.lineTo(12, 0 - bob);
        ctx.fill();
        ctx.stroke();
        // Body
        ctx.beginPath();
        ctx.roundRect(-8, -6 - bob, 16, 16, 4);
        ctx.fill();
        ctx.stroke();
        // Head
        ctx.beginPath();
        ctx.arc(0, -14 - bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Crimson horns
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.moveTo(-6, -20 - bob); ctx.lineTo(-12, -28 - bob); ctx.lineTo(-2, -22 - bob);
        ctx.moveTo(6, -20 - bob); ctx.lineTo(12, -28 - bob); ctx.lineTo(2, -22 - bob);
        ctx.fill();
        ctx.stroke();
        // Red eyes
        ctx.fillStyle = "#f43f5e";
        ctx.fillRect(-4, -15 - bob, 3, 3);
        ctx.fillRect(2, -15 - bob, 3, 3);

      } else if (e.archId === "orc_warrior") {
        // Orc Berserker: Broad muscular green brute with iron helmet & massive battleaxe
        ctx.fillStyle = fTime ? "#ffffff" : "#4d7c0f";
        // Massive shoulders and torso
        ctx.beginPath();
        ctx.roundRect(-14, -8 - bob, 28, 22, 6);
        ctx.fill();
        ctx.stroke();
        // Leather kilt / belt
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-12, 8 - bob, 24, 7);
        // Iron pauldron on shoulder
        ctx.fillStyle = "#475569";
        ctx.beginPath();
        ctx.arc(-14, -6 - bob, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Head with helmet
        ctx.fillStyle = fTime ? "#ffffff" : "#4d7c0f";
        ctx.beginPath();
        ctx.arc(0, -16 - bob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Iron brow helmet
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.arc(0, -19 - bob, 12, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Tusks
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(-5, -11 - bob); ctx.lineTo(-3, -17 - bob); ctx.lineTo(-1, -11 - bob);
        ctx.moveTo(1, -11 - bob); ctx.lineTo(3, -17 - bob); ctx.lineTo(5, -11 - bob);
        ctx.fill();
        // Red angry eyes
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-6, -17 - bob, 3, 2.5);
        ctx.fillRect(3, -17 - bob, 3, 2.5);
        // Massive two-bladed battleaxe
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(12, 10 - bob);
        ctx.lineTo(18, -26 - bob);
        ctx.stroke();
        ctx.fillStyle = "#94a3b8";
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(18, -22 - bob, 10, -Math.PI / 2, Math.PI / 2, false);
        ctx.arc(18, -22 - bob, 10, Math.PI / 2, -Math.PI / 2, false);
        ctx.fill();
        ctx.stroke();

      } else if (e.archId === "scorpion") {
        // Venom Scorpion: Golden chitin body, 6 scuttling legs, front pincers, arched tail with stinger
        var legWave = Math.sin(e.walkPhase * 2) * 4;
        ctx.fillStyle = fTime ? "#ffffff" : "#d97706";
        // 6 legs
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2.2;
        for (var lg = -1; lg <= 1; lg++) {
          ctx.beginPath();
          ctx.moveTo(-8, lg * 7 - bob);
          ctx.lineTo(-20, lg * 8 - bob + legWave * lg);
          ctx.lineTo(-22, lg * 9 + 6 - bob);
          ctx.moveTo(8, lg * 7 - bob);
          ctx.lineTo(20, lg * 8 - bob - legWave * lg);
          ctx.lineTo(22, lg * 9 + 6 - bob);
          ctx.stroke();
        }
        // Segmented oval body
        ctx.beginPath();
        ctx.ellipse(0, -2 - bob, 12, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Two front claws
        ctx.fillStyle = "#b45309";
        ctx.beginPath();
        ctx.arc(-11, 14 - bob, 5, 0, Math.PI * 2);
        ctx.arc(11, 14 - bob, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Arched stinger tail over back
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -14 - bob);
        ctx.quadraticCurveTo(8, -28 - bob, -2, -32 - bob);
        ctx.stroke();
        // Stinger tip & glowing venom drop
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(-2, -32 - bob, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(-5, -34 - bob, 3, 0, Math.PI * 2);
        ctx.fill();

      } else if (e.archId === "dark_mage") {
        // Dark Mage: Deep violet hooded cowl, glowing eyes, channeling hovering dark purple orb
        ctx.fillStyle = fTime ? "#ffffff" : "#312e81";
        // Robe skirt
        ctx.beginPath();
        ctx.moveTo(-11, -8 - bob);
        ctx.lineTo(11, -8 - bob);
        ctx.lineTo(14, 16 - bob);
        ctx.lineTo(-14, 16 - bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Hooded cowl
        ctx.fillStyle = fTime ? "#ffffff" : "#1e1b4b";
        ctx.beginPath();
        ctx.arc(0, -15 - bob, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Deep hood face shadow & glowing eyes
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(0, -14 - bob, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c084fc";
        ctx.fillRect(-4, -15 - bob, 2.5, 2.5);
        ctx.fillRect(2, -15 - bob, 2.5, 2.5);
        // Hovering dark orb between hands
        var orbPulse = Math.sin(e.walkPhase * 1.8) * 2;
        ctx.fillStyle = "#a855f7";
        ctx.beginPath();
        ctx.arc(0, 4 - bob + orbPulse, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#e9d5ff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

      } else if (e.archId === "stone_golem") {
        // Stone Golem: Heavy granite blocks, moss patches, glowing runic cyan core
        ctx.fillStyle = fTime ? "#ffffff" : "#64748b";
        // Chunky torso
        ctx.beginPath();
        ctx.roundRect(-16, -12 - bob, 32, 28, 6);
        ctx.fill();
        ctx.stroke();
        // Green moss
        ctx.fillStyle = "#84cc16";
        ctx.fillRect(-10, -8 - bob, 8, 4);
        ctx.fillRect(4, 2 - bob, 6, 5);
        // Glowing cyan runic chest core
        ctx.fillStyle = "#06b6d4";
        ctx.beginPath();
        ctx.arc(0, -1 - bob, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#a5f3fc";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Craggy block head
        ctx.fillStyle = fTime ? "#ffffff" : "#475569";
        ctx.beginPath();
        ctx.roundRect(-10, -26 - bob, 20, 14, 4);
        ctx.fill();
        ctx.stroke();
        // Glowing cyan eye slits
        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(-6, -21 - bob, 4, 2.5);
        ctx.fillRect(2, -21 - bob, 4, 2.5);
        // Heavy stone boulder fists
        ctx.fillStyle = "#475569";
        ctx.beginPath();
        ctx.roundRect(-22, -4 - bob, 8, 16, 4);
        ctx.roundRect(14, -4 - bob, 8, 16, 4);
        ctx.fill();
        ctx.stroke();

      } else if (e.archId === "frost_wolf") {
        // Frost Wolf: Icy light-blue quadruped wolf, 4 running paws, pointed ears, bushy tail
        var pawStride = Math.sin(e.walkPhase) * 6;
        ctx.fillStyle = fTime ? "#ffffff" : "#93c5fd";
        // 4 legs
        ctx.fillRect(-12 + pawStride, 4 - bob, 6, 12);
        ctx.fillRect(-6 - pawStride, 4 - bob, 6, 12);
        ctx.fillRect(4 + pawStride, 4 - bob, 6, 12);
        ctx.fillRect(10 - pawStride, 4 - bob, 6, 12);
        // Body
        ctx.beginPath();
        ctx.roundRect(-16, -8 - bob, 32, 16, 6);
        ctx.fill();
        ctx.stroke();
        // White chest fur
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(-4, -6 - bob, 10, 10);
        // Head & snout
        ctx.fillStyle = fTime ? "#ffffff" : "#93c5fd";
        ctx.beginPath();
        ctx.arc(14, -14 - bob, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Snout
        ctx.beginPath();
        ctx.moveTo(18, -16 - bob); ctx.lineTo(26, -12 - bob); ctx.lineTo(18, -8 - bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Pointed ears
        ctx.beginPath();
        ctx.moveTo(10, -21 - bob); ctx.lineTo(12, -28 - bob); ctx.lineTo(16, -20 - bob);
        ctx.fill();
        ctx.stroke();
        // Cold blue eye
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(16, -16 - bob, 3, 2.5);
        // Bushy tail
        ctx.fillStyle = "#93c5fd";
        ctx.beginPath();
        ctx.moveTo(-16, -4 - bob);
        ctx.lineTo(-28, -14 - bob);
        ctx.lineTo(-20, -2 - bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

      } else if (e.archId === "flame_demon") {
        // Flame Demon: Crimson winged demon, large ram horns, flaming core, claws
        var wingSpan = Math.sin(e.walkPhase * 1.5) * 6;
        ctx.fillStyle = fTime ? "#ffffff" : "#b91c1c";
        // Bat wings
        ctx.beginPath();
        ctx.moveTo(-10, -12 - bob);
        ctx.lineTo(-30, -26 - bob + wingSpan);
        ctx.lineTo(-18, 4 - bob);
        ctx.moveTo(10, -12 - bob);
        ctx.lineTo(30, -26 - bob - wingSpan);
        ctx.lineTo(18, 4 - bob);
        ctx.fill();
        ctx.stroke();
        // Muscular torso
        ctx.beginPath();
        ctx.roundRect(-14, -10 - bob, 28, 26, 6);
        ctx.fill();
        ctx.stroke();
        // Fiery chest core
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(0, 0 - bob, 7, 0, Math.PI * 2);
        ctx.fill();
        // Demon head
        ctx.fillStyle = fTime ? "#ffffff" : "#dc2626";
        ctx.beginPath();
        ctx.arc(0, -18 - bob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Black curved ram horns
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.moveTo(-8, -25 - bob); ctx.quadraticCurveTo(-20, -38 - bob, -12, -18 - bob);
        ctx.moveTo(8, -25 - bob); ctx.quadraticCurveTo(20, -38 - bob, 12, -18 - bob);
        ctx.fill();
        ctx.stroke();
        // Burning yellow eyes
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(-5, -19 - bob, 3, 3);
        ctx.fillRect(2, -19 - bob, 3, 3);

      } else if (e.archId === "void_reaver") {
        // Void Reaver: Floating dark purple alien entity with hovering scythes and shadow tendrils
        var floatBob = Math.sin(e.walkPhase) * 4;
        ctx.fillStyle = fTime ? "#ffffff" : "#581c87";
        // Floating mantle
        ctx.beginPath();
        ctx.moveTo(-16, -10 - floatBob);
        ctx.lineTo(16, -10 - floatBob);
        ctx.lineTo(18, 14 - floatBob);
        ctx.lineTo(-18, 14 - floatBob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Shadow tendrils
        ctx.strokeStyle = "#3b0764";
        ctx.lineWidth = 3;
        for (var td = -10; td <= 10; td += 10) {
          ctx.beginPath();
          ctx.moveTo(td, 14 - floatBob);
          ctx.quadraticCurveTo(td + Math.sin(e.walkPhase + td) * 5, 26 - floatBob, td, 32 - floatBob);
          ctx.stroke();
        }
        // Head cowl
        ctx.fillStyle = "#2e1065";
        ctx.beginPath();
        ctx.arc(0, -18 - floatBob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Neon cyan horizontal visor slit
        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(-7, -19 - floatBob, 14, 3);
        // Hovering crescent energy scythes
        ctx.fillStyle = "#a855f7";
        ctx.strokeStyle = "#e9d5ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-24, -4 - floatBob, 12, -Math.PI / 2, Math.PI / 2, false);
        ctx.arc(24, -4 - floatBob, 12, Math.PI / 2, -Math.PI / 2, false);
        ctx.fill();
        ctx.stroke();

      } else {
        // Realm Boss: Colossal Armored Demon Titan
        var bossBob = Math.sin(e.walkPhase * 0.8) * 3;
        ctx.fillStyle = fTime ? "#ffffff" : "#7f1d1d";
        // Massive shoulders and armor
        ctx.beginPath();
        ctx.roundRect(-24, -16 - bossBob, 48, 38, 8);
        ctx.fill();
        ctx.stroke();
        // Spiked pauldrons
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-28, -20 - bossBob, 12, 14);
        ctx.fillRect(16, -20 - bossBob, 12, 14);
        // Giant horned helm
        ctx.fillStyle = fTime ? "#ffffff" : "#991b1b";
        ctx.beginPath();
        ctx.arc(0, -28 - bossBob, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Huge horns
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.moveTo(-10, -38 - bossBob); ctx.lineTo(-26, -56 - bossBob); ctx.lineTo(-6, -34 - bossBob);
        ctx.moveTo(10, -38 - bossBob); ctx.lineTo(26, -56 - bossBob); ctx.lineTo(6, -34 - bossBob);
        ctx.fill();
        ctx.stroke();
        // Floating boss crown
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.moveTo(-12, -48 - bossBob);
        ctx.lineTo(-6, -56 - bossBob);
        ctx.lineTo(0, -48 - bossBob);
        ctx.lineTo(6, -56 - bossBob);
        ctx.lineTo(12, -48 - bossBob);
        ctx.lineTo(10, -42 - bossBob);
        ctx.lineTo(-10, -42 - bossBob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Glowing red eyes
        ctx.fillStyle = "#f43f5e";
        ctx.fillRect(-7, -29 - bossBob, 4, 3.5);
        ctx.fillRect(3, -29 - bossBob, 4, 3.5);
        // Huge greatsword
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(22, 18 - bossBob);
        ctx.lineTo(34, -40 - bossBob);
        ctx.stroke();
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(30, -38 - bossBob, 8, 8);
      }

      // Health Bar
      var w = e.isBoss ? 70 : 30;
      var pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(-w / 2, -e.radius - 24, w, 5);
      ctx.fillStyle = e.isBoss ? "#ef4444" : "#22c55e";
      ctx.fillRect(-w / 2, -e.radius - 24, w * pct, 5);

      ctx.restore();
    }
  },

  // ================= PROCEDURAL ALLIED FIGURES (NO CIRCLES!) =================
  drawAllies: function(ctx) {
    for (var i = 0; i < this.allies.length; i++) {
      var al = this.allies[i];
      ctx.save();
      ctx.translate(al.x, al.y);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 10, al.radius * 0.9, al.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.4;

      if (al.kind === "guard") {
        // Sanctum Guard: Silver plate armor, blue tabard, blue heater shield with golden cross, sword
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(-6, -5, 12, 15);
        ctx.strokeRect(-6, -5, 12, 15);
        // Blue tabard
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(-4, -5, 8, 12);
        // Helmet
        ctx.fillStyle = "#cbd5e1";
        ctx.beginPath();
        ctx.arc(0, -14, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Blue crest plume
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(-2, -22, 4, 8);
        // Heater shield with golden cross
        ctx.fillStyle = "#1d4ed8";
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-14, -12);
        ctx.lineTo(-4, -12);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-9, 8);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fde047";
        ctx.fillRect(-10, -9, 2, 8);
        ctx.fillRect(-13, -6, 8, 2);
        // Steel broadsword in right hand
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(6, 2);
        ctx.lineTo(16, -12);
        ctx.stroke();

      } else if (al.kind === "archer") {
        // Elf Ranger: Green hooded cloak, leather tunic, recurve bow with nocked arrow
        ctx.fillStyle = "#16a34a";
        // Cloak
        ctx.beginPath();
        ctx.moveTo(-8, -6);
        ctx.lineTo(8, -6);
        ctx.lineTo(11, 14);
        ctx.lineTo(-11, 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Pointed green hood
        ctx.beginPath();
        ctx.arc(0, -14, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Hood point
        ctx.beginPath();
        ctx.moveTo(-5, -20); ctx.lineTo(0, -25); ctx.lineTo(5, -20);
        ctx.fill();
        // Recurve bow
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(8, -4, 14, -Math.PI / 2.5, Math.PI / 2.5, false);
        ctx.stroke();
        // Bow string & arrow
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8, -16); ctx.lineTo(2, -4); ctx.lineTo(8, 8);
        ctx.moveTo(2, -4); ctx.lineTo(18, -4);
        ctx.stroke();

      } else if (al.kind === "cavalry") {
        // Royal Cavalry: Armored white warhorse, mounted knight with lance & pennant
        // Warhorse body
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.roundRect(-16, -4, 32, 16, 6);
        ctx.fill();
        ctx.stroke();
        // Horse neck & head
        ctx.beginPath();
        ctx.moveTo(12, -4);
        ctx.lineTo(22, -18);
        ctx.lineTo(26, -10);
        ctx.lineTo(16, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 4 horse legs
        ctx.fillRect(-12, 10, 4, 10);
        ctx.fillRect(-4, 10, 4, 10);
        ctx.fillRect(4, 10, 4, 10);
        ctx.fillRect(12, 10, 4, 10);
        // Mounted knight
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(-4, -18, 10, 14);
        ctx.strokeRect(-4, -18, 10, 14);
        // Knight helmet
        ctx.fillStyle = "#cbd5e1";
        ctx.beginPath();
        ctx.arc(1, -22, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Couched lance with fluttering pennant
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-6, -14);
        ctx.lineTo(28, -26);
        ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.moveTo(28, -26);
        ctx.lineTo(40, -22);
        ctx.lineTo(28, -18);
        ctx.closePath();
        ctx.fill();

      } else if (al.kind === "golem") {
        // Arcane Automaton: Brass clockwork titan with spinning gear fists and sun core
        ctx.fillStyle = "#d97706";
        ctx.beginPath();
        ctx.roundRect(-16, -12, 32, 26, 6);
        ctx.fill();
        ctx.stroke();
        // Sun-rune chest core
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Head
        ctx.fillStyle = "#b45309";
        ctx.beginPath();
        ctx.roundRect(-10, -24, 20, 12, 4);
        ctx.fill();
        ctx.stroke();
        // Visor eye
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-6, -20, 12, 3);
        // Heavy gear fists
        ctx.fillStyle = "#92400e";
        ctx.beginPath();
        ctx.arc(-18, 4, 7, 0, Math.PI * 2);
        ctx.arc(18, 4, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

      } else {
        // Sprite (Fairy): Tiny floating fairy with translucent wings & wand
        var fairyBob = Math.sin(performance.now() * 0.01) * 3;
        ctx.fillStyle = "#38bdf8";
        // Wings
        ctx.fillStyle = "rgba(186, 230, 253, 0.75)";
        ctx.beginPath();
        ctx.ellipse(-8, -10 + fairyBob, 8, 4, -0.4, 0, Math.PI * 2);
        ctx.ellipse(8, -10 + fairyBob, 8, 4, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Body & head
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(0, -6 + fairyBob, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Wand
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3, -4 + fairyBob);
        ctx.lineTo(10, -12 + fairyBob);
        ctx.stroke();
      }

      // Ally HP bar if damaged
      if (al.kind !== "sprite" && al.hp < al.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(-12, -26, 24, 4);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-12, -26, 24 * Math.max(0, al.hp / al.maxHp), 4);
      }

      ctx.restore();
    }
  },

  drawLootDrops: function(ctx) {
    for (var i = 0; i < this.lootDrops.length; i++) {
      var d = this.lootDrops[i];
      ctx.save();
      ctx.translate(d.x, d.y);
      if (d.kind === "gold") {
        ctx.fillStyle = "#facc15";
        ctx.strokeStyle = "#1c1917";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8.5, 6.5, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (d.kind === "mana") {
        ctx.fillStyle = "#38bdf8";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 9);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.font = "19px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎁", 0, 6);
      }
      ctx.restore();
    }
  },

  drawFlyingCoins: function(ctx) {
    for (var i = 0; i < this.flyingCoins.length; i++) {
      var fc = this.flyingCoins[i];
      var t = fc.progress;
      var cx = fc.sx + (fc.tx - fc.sx) * t;
      var cy = fc.sy + (fc.ty - fc.sy) * t - Math.sin(t * Math.PI) * fc.arcHeight;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = fc.currency === "mana" ? "#38bdf8" : "#fde047";
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  },

  drawBurnZones: function(ctx) {
    for (var i = 0; i < this.burnZones.length; i++) {
      var bz = this.burnZones[i];
      ctx.save();
      ctx.fillStyle = "rgba(249, 115, 22, 0.28)";
      ctx.strokeStyle = "rgba(251, 146, 60, 0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bz.x, bz.y, bz.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  },

  drawProjectilesAndLightning: function(ctx) {
    for (var l = 0; l < this.lightningArcs.length; l++) {
      var arc = this.lightningArcs[l];
      ctx.save();
      ctx.strokeStyle = arc.color || "#60a5fa";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(arc.x1, arc.y1);
      var midX = (arc.x1 + arc.x2) * 0.5 + (Math.random() - 0.5) * 26;
      var midY = (arc.y1 + arc.y2) * 0.5 + (Math.random() - 0.5) * 26;
      ctx.lineTo(midX, midY);
      ctx.lineTo(arc.x2, arc.y2);
      ctx.stroke();
      ctx.restore();
    }

    for (var i = 0; i < this.projectiles.length; i++) {
      var p = this.projectiles[i];
      var ang = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);

      var grad = ctx.createLinearGradient(-24, 0, 6, 0);
      grad.addColorStop(0, "rgba(56, 189, 248, 0)");
      grad.addColorStop(1, p.color || "#38bdf8");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-26, -5);
      ctx.lineTo(6, -7);
      ctx.lineTo(6, 7);
      ctx.lineTo(-26, 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = p.color || "#38bdf8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(2, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  },

  drawPointerHandOnQuestPad: function(ctx) {
    var adv = this.getTacticalAdvice();
    var targetPadId = (adv && adv.targetPadId) || "pad_FrostStatue";
    var pad = window.GAME_DATA.groundPads.find(function(p) { return p.id === targetPadId; }) || window.GAME_DATA.groundPads[0];
    if (!pad || this.state.unlockedZones.indexOf(pad.zone) === -1) return;

    var time = performance.now() * 0.005;
    var bounce = Math.sin(time * 2.2) * 8;

    ctx.save();
    ctx.translate(pad.x + 36 + bounce * 0.5, pad.y + 38 + bounce);
    ctx.rotate(-0.45);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(4, 6, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fed7aa";
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-8, -34, 15, 30, 7);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(-16, -12, 34, 28, 12);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  },

  // Directional Danger Indicators at Screen Edges
  drawOffscreenThreatIndicators: function(ctx, cw, ch) {
    var counts = this.roadEnemyCounts;
    var roadsInfo = [
      { id: "road_north", name: "北路", count: counts.road_north, screenX: cw * 0.5, screenY: 82, arrow: "▲" },
      { id: "road_center", name: "中路", count: counts.road_center, screenX: cw - 65, screenY: ch * 0.5, arrow: "▶" },
      { id: "road_south", name: "南路", count: counts.road_south, screenX: cw * 0.5, screenY: ch - 95, arrow: "▼" }
    ];

    roadsInfo.forEach(function(r) {
      if (r.count > 0) {
        ctx.save();
        ctx.fillStyle = "rgba(220, 38, 38, 0.92)";
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(r.screenX - 44, r.screenY - 14, 88, 26, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "900 11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(r.arrow + " " + r.name + " (" + r.count + ")", r.screenX, r.screenY + 4);
        ctx.restore();
      }
    });
  },

  drawParticlesAndTexts: function(ctx) {
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (var j = 0; j < this.floatingTexts.length; j++) {
      var ft = this.floatingTexts[j];
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.life));
      ctx.font = "900 " + ft.size + "px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.lineWidth = 3.5;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  },

  drawDefeatOverlay: function(ctx, cw, ch) {
    ctx.save();
    ctx.fillStyle = "rgba(10, 8, 20, 0.88)";
    ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = "#ef4444";
    ctx.font = "900 28px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    ctx.strokeText("💥 城池淪陷！守護大本營被摧毀！", cw / 2, ch / 2 - 50);
    ctx.fillText("💥 城池淪陷！守護大本營被摧毀！", cw / 2, ch / 2 - 50);

    ctx.fillStyle = "#fde047";
    ctx.font = "800 15px Inter, sans-serif";
    var sub = "堅守進度：第 " + this.state.wave + " 波 | 累計殲敵：" + this.state.totalKills + " 隻";
    ctx.strokeText(sub, cw / 2, ch / 2 - 15);
    ctx.fillText(sub, cw / 2, ch / 2 - 15);

    ctx.restore();
  },

  drawTouchJoystick: function(ctx) {
    if (!this.input.joyActive) return;
    ctx.save();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
    ctx.fillStyle = "rgba(15, 12, 28, 0.35)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.input.joyStartX, this.input.joyStartY, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    var knobX = this.input.joyStartX + this.input.joyDx * 48;
    var knobY = this.input.joyStartY + this.input.joyDy * 48;
    ctx.fillStyle = "rgba(251, 191, 36, 0.88)";
    ctx.beginPath();
    ctx.arc(knobX, knobY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};
