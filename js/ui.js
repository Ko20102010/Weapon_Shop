/* ==========================================================================
   Ancient Arcane Bastion (古域魔陣：守護神殿) - Mobile UI, Modals & Defense Hub
   v1.4.1:
   - Step-On & Choose 10 Unlockable Towers/Barracks Picker on Context Card & Modal
   - Dual Defense Status (城防耐久 + 守護大本營 HP Bars) & Live 3-Road Threat Radar
   - Real-Time Arcane Tactical Advisor (軍師建議) Banner & One-Tap Action
   - Town Hall Management & Defense Overview Modal
   - Defeat / Citadel Breach Recovery Modal
   - Cleaned: No GitHub ZIP download or manual export string clutter
   ========================================================================== */

window.GameUI = {
  activeModal: null,
  uiTimer: 0,
  lastContextPadId: null,
  lastContextBpId: null,
  lastContextUnlockedCount: -1,

  init: function() {
    this.updateHUD();
    this.updateTopButtons();
  },

  tickUI: function(dt) {
    this.uiTimer += dt;
    if (this.uiTimer >= 0.15) {
      this.uiTimer = 0;
      this.updateHUD();
      this.updateContextCard();
      this.updateSkillCooldowns();
    }
  },

  formatNum: function(n) {
    var v = Math.floor(n);
    if (v >= 1000000) return (v / 1000000).toFixed(2) + "M";
    if (v >= 10000) return (v / 1000).toFixed(1) + "K";
    return String(v);
  },

  updateHUD: function() {
    var eng = window.GameEngine;
    if (!eng || !eng.state) return;
    var st = eng.state;

    // 1. Resources
    var elGold = document.getElementById("hud-gold");
    var elMana = document.getElementById("hud-mana");
    var elSoul = document.getElementById("hud-soul");
    if (elGold) elGold.textContent = this.formatNum(st.gold);
    if (elMana) elMana.textContent = this.formatNum(st.mana);
    if (elSoul) elSoul.textContent = this.formatNum(st.souls);

    // 2. Realm and Wave
    var realm = eng.getCurrentRealm();
    var elRealm = document.getElementById("hud-realm-name");
    var elWave = document.getElementById("hud-wave-num");
    if (elRealm) elRealm.textContent = realm.name;
    if (elWave) elWave.textContent = "第 " + st.wave + " / " + realm.wavesToClear + " 波";

    // 3. Dual Defense Status Bars: Wall & Town Hall
    var elWallText = document.getElementById("hud-wall-text");
    var elWallBar = document.getElementById("hud-wall-bar");
    if (elWallText && eng.wall) {
      elWallText.textContent = Math.ceil(eng.wall.hp) + "/" + eng.wall.maxHp;
    }
    if (elWallBar && eng.wall && eng.wall.maxHp > 0) {
      var wPct = Math.max(0, Math.min(100, Math.round((eng.wall.hp / eng.wall.maxHp) * 100)));
      elWallBar.style.width = wPct + "%";
      if (wPct < 30) {
        elWallBar.style.background = "linear-gradient(90deg, #ef4444, #f87171)";
      } else if (wPct < 60) {
        elWallBar.style.background = "linear-gradient(90deg, #f59e0b, #fbbf24)";
      } else {
        elWallBar.style.background = "linear-gradient(90deg, #0284c7, #38bdf8)";
      }
    }

    var elHallText = document.getElementById("hud-hall-text");
    var elHallBar = document.getElementById("hud-hall-bar");
    if (elHallText && eng.townHall) {
      elHallText.textContent = Math.ceil(eng.townHall.hp) + "/" + eng.townHall.maxHp;
    }
    if (elHallBar && eng.townHall && eng.townHall.maxHp > 0) {
      var hPct = Math.max(0, Math.min(100, Math.round((eng.townHall.hp / eng.townHall.maxHp) * 100)));
      elHallBar.style.width = hPct + "%";
      if (hPct < 30) {
        elHallBar.style.background = "linear-gradient(90deg, #ef4444, #f43f5e)";
      } else if (hPct < 60) {
        elHallBar.style.background = "linear-gradient(90deg, #f59e0b, #fbbf24)";
      } else {
        elHallBar.style.background = "linear-gradient(90deg, #059669, #22c55e)";
      }
    }

    // 4. Live 3-Road Threat Radar
    var elRadarText = document.getElementById("hud-radar-text");
    var elRadarDot = document.getElementById("hud-radar-dot");
    if (elRadarText) {
      var nCt = 0, cCt = 0, sCt = 0;
      eng.enemies.forEach(function(e) {
        if (e.roadId === "road_north") nCt++;
        else if (e.roadId === "road_south") sCt++;
        else cCt++;
      });
      var totalEnemies = nCt + cCt + sCt;
      var gateStatus = eng.wall.hp <= 0 ? " ⚠️ 城門失守!" : "";
      elRadarText.textContent = "⚔️ 軍情：北路 " + nCt + " | 中路 " + cCt + " | 南路 " + sCt + gateStatus;
      if (elRadarDot) {
        elRadarDot.style.background = totalEnemies > 10 || eng.wall.hp <= 0 ? "#ef4444" : "#22c55e";
      }
    }

    // 5. Quest Banner
    var q = window.GAME_DATA.quests[st.questIndex];
    var elQuest = document.getElementById("hud-quest-text");
    if (elQuest) {
      if (q) {
        elQuest.textContent = "🎯 主線 #" + q.id + "：" + q.title;
      } else {
        elQuest.textContent = "👑 已完成全部引導主線！挑戰五章古域與無盡深淵";
      }
    }

    // 6. Arcane Tactical Advisor Banner
    var adv = eng.getTacticalAdvice();
    var elAdv = document.getElementById("hud-advisor-text");
    if (elAdv && adv) {
      elAdv.textContent = "🧙‍♂️ 軍師建議：" + adv.title;
    }

    var dotTalent = document.getElementById("dot-talent");
    if (dotTalent) {
      dotTalent.style.display = st.souls >= 1 ? "block" : "none";
    }

    // 7. Check Defeat Condition (Town Hall fallen)
    if (eng.townHall && eng.townHall.hp <= 0 && this.activeModal !== "defeat") {
      this.openModal("defeat");
    }
  },

  updateContextCard: function() {
    var card = document.getElementById("pad-context-card");
    if (!card) return;
    var eng = window.GameEngine;
    var padId = eng.hero.activePadId;
    if (!padId) {
      card.classList.add("hidden");
      this.lastContextPadId = null;
      return;
    }
    var pad = window.GAME_DATA.groundPads.find(function(p) { return p.id === padId; });
    if (!pad) {
      card.classList.add("hidden");
      return;
    }
    var st = eng.state.pads[pad.id] || { level: 0, invested: 0 };
    var rem = eng.getPadRemaining(pad);
    var curIcon = pad.currency === "mana" ? "💎" : "🪙";
    var bp = pad.customizable ? eng.getPadBlueprint(pad) : null;

    card.classList.remove("hidden");
    var titleEl = document.getElementById("pad-context-title");
    var descEl = document.getElementById("pad-context-desc");
    if (titleEl) {
      var dispName = bp ? (bp.icon + " " + bp.name) : (pad.icon + " " + pad.name);
      titleEl.textContent = dispName + (pad.type === "expand" ? "" : " (Lv." + st.level + ")") + " — 剩餘 " + curIcon + rem;
    }
    if (descEl) {
      var adviceStr = bp ? ("💡 " + bp.adviceTag + " | " + bp.desc) : pad.desc;
      descEl.textContent = adviceStr;
    }

    // Render "Step on and Choose" 10-Tower Horizontal Chip Selector when standing on a customizable build plot!
    var pickerWrap = document.getElementById("pad-tower-picker");
    if (pickerWrap) {
      if (pad.customizable) {
        pickerWrap.style.display = "flex";
        var curBpId = (st && st.blueprintId) || pad.defaultBlueprint;
        var unlockedCount = eng.state.unlockedBlueprints.length;
        if (this.lastContextPadId !== pad.id || this.lastContextBpId !== curBpId || this.lastContextUnlockedCount !== unlockedCount) {
          this.lastContextPadId = pad.id;
          this.lastContextBpId = curBpId;
          this.lastContextUnlockedCount = unlockedCount;
          this.renderStepOnTowerPicker(pickerWrap, pad);
        }
      } else {
        pickerWrap.style.display = "none";
      }
    }
  },

  renderStepOnTowerPicker: function(container, pad) {
    var eng = window.GameEngine;
    var st = eng.state.pads[pad.id] || {};
    var curBpId = st.blueprintId || pad.defaultBlueprint;
    var adv = eng.getTacticalAdvice();

    var html = '';
    window.GAME_DATA.towerBlueprints.forEach(function(bp) {
      var unlocked = eng.isBlueprintUnlocked(bp.id);
      var selected = curBpId === bp.id;
      var isRec = adv && adv.recBpId === bp.id;
      var cIcon = bp.unlockCurrency === "mana" ? "💎" : "🪙";
      var clsName = "tower-chip" + (selected ? " active-chip" : "") + (!unlocked ? " locked-chip" : "");

      html += '<button class="' + clsName + '" onclick="window.uiChooseTowerOnPad(\'' + pad.id + '\', \'' + bp.id + '\')">';
      html += '<span>' + bp.icon + ' ' + bp.name + '</span>';
      if (!unlocked) {
        html += '<span style="color:#fde047;">🔒' + cIcon + bp.unlockCost + '</span>';
      } else if (selected) {
        html += '<span style="color:#4ade80;">✓駐守</span>';
      } else if (isRec) {
        html += '<span style="color:#38bdf8;">★推薦</span>';
      }
      html += '</button>';
    });
    container.innerHTML = html;
  },

  updateSkillCooldowns: function() {
    for (var i = 0; i < 3; i++) {
      var sk = window.GameEngine.skills[i];
      var cdEl = document.getElementById("skill-cd-" + i);
      if (cdEl && sk) {
        if (sk.cd > 0) {
          cdEl.style.display = "flex";
          cdEl.textContent = Math.ceil(sk.cd) + "s";
        } else {
          cdEl.style.display = "none";
        }
      }
    }
  },

  updateTopButtons: function() {
    var btnAi = document.getElementById("btn-ai-toggle");
    if (btnAi) {
      var labels = ["🤖 AI: 手動控制", "🤖 AI: 巡邏撿幣", "🤖 AI: 全自動踏陣"];
      btnAi.textContent = labels[window.GameEngine.aiMode] || labels[0];
      if (window.GameEngine.aiMode > 0) {
        btnAi.classList.add("active-toggle");
      } else {
        btnAi.classList.remove("active-toggle");
      }
    }

    var btnSpd = document.getElementById("btn-speed-toggle");
    if (btnSpd) {
      btnSpd.textContent = "⏩ " + window.GameEngine.gameSpeed + "x";
    }

    var btnZoom = document.getElementById("btn-zoom-toggle");
    if (btnZoom) {
      var zm = window.GameEngine.camera.userZoomMult || 0.85;
      btnZoom.textContent = zm < 0.72 ? "🔍 全景" : (zm > 0.95 ? "🔍 近景" : "🔍 標準");
    }

    var btnAudio = document.getElementById("btn-audio-toggle");
    if (btnAudio) {
      btnAudio.textContent = window.SoundEngine.muted ? "🔇 靜音" : "🔊 音效";
    }
  },

  showToast: function(msg) {
    var container = document.getElementById("toast-container");
    if (!container) return;
    var div = document.createElement("div");
    div.className = "toast-msg";
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(function() {
      if (div.parentNode) div.parentNode.removeChild(div);
    }, 2650);
  },

  // ================= MODAL DRAWER RENDERING =================
  openModal: function(tabName) {
    this.activeModal = tabName;
    var backdrop = document.getElementById("modal-backdrop");
    var titleEl = document.getElementById("modal-title");
    var bodyEl = document.getElementById("modal-body");
    if (!backdrop || !titleEl || !bodyEl) return;

    backdrop.classList.remove("hidden");

    if (tabName === "pads") {
      titleEl.innerHTML = "🔮 10大魔塔/兵營藍圖 & 建地總覽 (踏上自選建造)";
      this.renderPadsModal(bodyEl);
    } else if (tabName === "townhall") {
      titleEl.innerHTML = "🏛️ 守護大本營 (Citadel Hall) — 要塞防線中樞";
      this.renderTownHallModal(bodyEl);
    } else if (tabName === "hero") {
      titleEl.innerHTML = "⚔️ 英雄職業與遠古聖物鍛造";
      this.renderHeroModal(bodyEl);
    } else if (tabName === "talents") {
      titleEl.innerHTML = "🌟 太古星盤天賦樹 (永久加成)";
      this.renderTalentsModal(bodyEl);
    } else if (tabName === "realms") {
      titleEl.innerHTML = "🗺️ 古域五章領域與古神轉生";
      this.renderRealmsModal(bodyEl);
    } else if (tabName === "codex") {
      titleEl.innerHTML = "📖 戰役任務與魔物圖鑑 (10小時長線進度)";
      this.renderCodexModal(bodyEl);
    } else if (tabName === "defeat") {
      titleEl.innerHTML = "⚠️ 要塞淪陷 — 守護大本營被毀";
      this.renderDefeatModal(bodyEl);
    }
  },

  closeModal: function() {
    this.activeModal = null;
    var backdrop = document.getElementById("modal-backdrop");
    if (backdrop) backdrop.classList.add("hidden");
  },

  // 1. 10 Unlockable Tower/Barracks Blueprints + 20 Build Plots Overview Modal
  renderPadsModal: function(container) {
    var eng = window.GameEngine;
    var adv = eng.getTacticalAdvice();

    var html = '';
    // Section A: Real-Time Arcane Tactical Advisor Card
    if (adv) {
      html += '<div style="background:linear-gradient(135deg,rgba(12,74,110,0.92),rgba(30,27,75,0.95));border:1.5px solid #38bdf8;border-radius:14px;padding:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;">';
      html += '<div style="flex:1;min-width:220px;">';
      html += '<div style="font-weight:900;font-size:0.92rem;color:#fde047;">🧙‍♂️ 軍師即時戰術建議：' + adv.icon + ' ' + adv.title + '</div>';
      html += '<div style="font-size:0.76rem;color:#e0f2fe;margin-top:3px;">' + adv.reason + '</div>';
      html += '</div>';
      html += '<button class="btn-action" onclick="window.uiFollowAdvisor()">📍 採納建議並前往</button>';
      html += '</div>';
    }

    // Section B: 10 Unlockable Tower & Troop-Barracks Blueprints
    html += '<div style="font-weight:800;color:#fde047;font-size:0.9rem;margin-top:6px;">🏰 10 大魔塔與兵營藍圖 (解鎖後踏上任意建地即可切換建造！)</div>';
    html += '<div class="card-grid">';
    window.GAME_DATA.towerBlueprints.forEach(function(bp) {
      var unlocked = eng.isBlueprintUnlocked(bp.id);
      var cIcon = bp.unlockCurrency === "mana" ? "💎" : "🪙";
      var typeBadge = bp.category === "barracks" ? "🛡️ 兵營" : "⚡ 魔塔";

      html += '<div class="rpg-card ' + (unlocked ? 'unlocked' : '') + '">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<span style="font-weight:800;font-size:0.86rem;color:' + bp.color + ';">' + bp.icon + ' ' + bp.name + '</span>';
      html += '<span style="font-size:0.7rem;color:#cbd5e1;background:rgba(15,23,42,0.8);padding:2px 6px;border-radius:6px;">' + typeBadge + '</span>';
      html += '</div>';
      html += '<div style="font-size:0.72rem;color:#fde047;font-weight:700;">💡 ' + bp.adviceTag + '</div>';
      html += '<div style="font-size:0.73rem;color:#cbd5e1;min-height:32px;">' + bp.desc + '</div>';
      if (!unlocked) {
        html += '<button class="btn-action" onclick="window.uiUnlockBlueprint(\'' + bp.id + '\')">🔓 解鎖藍圖 (' + cIcon + bp.unlockCost + ')</button>';
      } else {
        html += '<div style="font-size:0.75rem;color:#4ade80;font-weight:800;">✅ 已解鎖 (踏上建地即可選用)</div>';
      }
      html += '</div>';
    });
    html += '</div>';

    // Section C: All 20 Map Pads across 4 Zones
    var zoneNames = [
      "🏛️ 核心聖殿區 (初始解鎖 — 含城門、大本營與內城建地)",
      "⚡ 北境古林與北路防線 (擴建 #1 — 含北路外圍攔截建地)",
      "☄️ 東翼王道交叉口 (擴建 #2 — 含中路雙側建地與天罰神龕)",
      "🐉 南境龍魂沼澤防線 (擴建 #3 — 含南路建地與魔王傳送門)"
    ];

    for (var z = 0; z < 4; z++) {
      var isUnlocked = eng.state.unlockedZones.indexOf(z) !== -1;
      html += '<div style="margin-top:10px;font-weight:800;color:' + (isUnlocked ? '#38bdf8' : '#94a3b8') + ';font-size:0.88rem;">' + zoneNames[z] + (isUnlocked ? ' ✅' : ' 🔒 (需先踏上擴建魔陣)') + '</div>';
      html += '<div class="card-grid">';

      window.GAME_DATA.groundPads.filter(function(p) { return p.zone === z; }).forEach(function(pad) {
        var st = eng.state.pads[pad.id] || { level: 0, invested: 0 };
        var rem = eng.getPadRemaining(pad);
        var cIcon = pad.currency === "mana" ? "💎" : "🪙";
        var isMax = st.level >= pad.maxLevel;
        var bp = pad.customizable ? eng.getPadBlueprint(pad) : null;

        html += '<div class="rpg-card ' + (st.level > 0 ? 'unlocked' : '') + '">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="font-weight:800;font-size:0.85rem;color:#f8fafc;">' + (bp ? bp.icon : pad.icon) + ' ' + pad.name + '</span>';
        html += '<span style="font-size:0.74rem;color:#38bdf8;font-weight:700;">' + (pad.type === "expand" ? (st.level > 0 ? "已擴建" : "未擴建") : "Lv." + st.level + "/" + pad.maxLevel) + '</span>';
        html += '</div>';

        if (pad.customizable && bp) {
          html += '<div style="font-size:0.74rem;color:#fde047;font-weight:700;">當前配置：' + bp.icon + ' ' + bp.name + '</div>';
          if (isUnlocked) {
            html += '<select style="background:#0f172a;color:#f8fafc;border:1px solid #fbbf24;border-radius:6px;padding:4px;font-size:0.73rem;" onchange="window.uiChooseTowerOnPad(\'' + pad.id + '\', this.value)">';
            window.GAME_DATA.towerBlueprints.forEach(function(optBp) {
              var optUnl = eng.isBlueprintUnlocked(optBp.id);
              var selAttr = (bp.id === optBp.id) ? 'selected' : '';
              html += '<option value="' + optBp.id + '" ' + selAttr + '>' + optBp.icon + ' ' + optBp.name + (optUnl ? ' (' + (optBp.category === 'barracks' ? '兵營' : '魔塔') + ')' : ' 🔒需解鎖') + '</option>';
            });
            html += '</select>';
          }
        } else {
          html += '<div style="font-size:0.73rem;color:#cbd5e1;min-height:28px;">' + pad.desc + '</div>';
        }

        if (isUnlocked && !isMax) {
          html += '<button class="btn-secondary" style="margin-top:4px;" onclick="window.uiNavigateToPad(\'' + pad.id + '\')">📍 導航踏陣 (' + cIcon + rem + ')</button>';
        } else if (isMax) {
          html += '<div style="font-size:0.75rem;color:#22c55e;font-weight:800;margin-top:4px;">✨ 已達最高等級</div>';
        }
        html += '</div>';
      });

      html += '</div>';
    }
    container.innerHTML = html;
  },

  // 2. Town Hall & Citadel Defense Hub Modal
  renderTownHallModal: function(container) {
    var eng = window.GameEngine;
    var st = eng.state;
    var hall = eng.townHall;
    var wall = eng.wall;
    var hallLv = (st.pads["pad_TownHall"] && st.pads["pad_TownHall"].level) || 1;
    var wallLv = (st.pads["pad_WallFortify"] && st.pads["pad_WallFortify"].level) || 0;

    var gateStatusText = wall.hp > 0 ? "🛡️ 堅固守護中 (魔物無法穿過城牆與城門)" : "💥 城門已被擊破！魔物正突入大本營！";
    var gateStatusColor = wall.hp > 0 ? "#4ade80" : "#ef4444";

    var html = '<div style="background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.92));border:2px solid #fbbf24;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div style="font-weight:900;font-size:1.05rem;color:#fde047;">🏛️ 守護大本營 Lv.' + hallLv + ' (Citadel Core)</div>';
    html += '<div style="font-size:0.8rem;color:#38bdf8;font-weight:800;">生命值：' + Math.ceil(hall.hp) + ' / ' + hall.maxHp + '</div>';
    html += '</div>';

    // Health Bars
    html += '<div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:0.74rem;color:#cbd5e1;margin-bottom:3px;"><span>大本營生命</span><span>' + Math.ceil(hall.hp) + '/' + hall.maxHp + '</span></div>';
    html += '<div class="hp-bar-track" style="height:10px;"><div class="hp-bar-fill hall-fill" style="width:' + Math.round((hall.hp / hall.maxHp) * 100) + '%;"></div></div>';
    html += '</div>';

    html += '<div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:0.74rem;color:#cbd5e1;margin-bottom:3px;"><span>城防城門耐久</span><span>' + Math.ceil(wall.hp) + '/' + wall.maxHp + '</span></div>';
    html += '<div class="hp-bar-track" style="height:10px;"><div class="hp-bar-fill wall-fill" style="width:' + Math.round((wall.hp / wall.maxHp) * 100) + '%;"></div></div>';
    html += '</div>';

    html += '<div style="font-size:0.78rem;color:' + gateStatusColor + ';font-weight:800;background:rgba(15,15,30,0.6);padding:6px 10px;border-radius:8px;">' + gateStatusText + '</div>';

    html += '<div style="font-size:0.76rem;color:#cbd5e1;line-height:1.45;">';
    html += '• <b>主城弩砲防禦</b>：大本營自帶遠古重裝弩砲，每秒向 650 射程內最近魔物射出貫穿重矢。<br/>';
    html += '• <b>防守規則</b>：只要南北雙城門與實體石牆耐久 > 0，怪物絕無法穿牆入城；城門若被擊破，魔物將長驅直入圍攻大本營！<br/>';
    html += '• <b>大本營淪陷</b>：若大本營生命歸零，城池宣告陷落，需施展太古轉生或祈禱聖光復原。';
    html += '</div>';

    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">';
    html += '<button class="btn-action" onclick="window.uiNavigateToPad(\'pad_TownHall\')">📍 導航前往【大本營】升級</button>';
    html += '<button class="btn-secondary" onclick="window.uiNavigateToPad(\'pad_WallFortify\')">🧱 導航前往【城防要塞】修復</button>';
    html += '<button class="btn-emerald" onclick="window.uiCastSkill(1)">🛡️ 施放【聖光壁壘】修補城防</button>';
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
  },

  // 3. Defeat / Citadel Breach Recovery Modal
  renderDefeatModal: function(container) {
    var eng = window.GameEngine;
    var pendingSouls = Math.max(2, Math.floor(eng.state.wave * 0.6 * eng.state.realmId));

    var html = '<div style="background:linear-gradient(135deg,rgba(88,28,40,0.95),rgba(32,15,25,0.98));border:2px solid #ef4444;border-radius:14px;padding:16px;text-align:center;display:flex;flex-direction:column;gap:12px;">';
    html += '<div style="font-size:2.2rem;">💀</div>';
    html += '<div style="font-weight:900;font-size:1.15rem;color:#fca5a5;">城池淪陷！守護大本營已被魔物攻陷</div>';
    html += '<div style="font-size:0.78rem;color:#fecdd3;line-height:1.5;">魔物大軍突破南北城門，守護大本營核心已遭摧毀！你可以選擇施展【聖堂守護重振】原地滿血復原並震退全場魔物，或者進行【太古神殿轉生】獲取靈魂結晶永久提升神性！</div>';

    html += '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:6px;">';
    html += '<button class="btn-action" style="padding:10px 18px;font-size:0.86rem;" onclick="window.uiReviveCitadel()">✨ 聖堂重振：滿血修復大本營與城防</button>';
    html += '<button class="btn-secondary" style="padding:10px 18px;font-size:0.86rem;" onclick="window.uiTriggerRebirth()">🔥 古神轉生 (+🔮' + pendingSouls + ' 結晶)</button>';
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
  },

  // 4. Hero Classes & Equipment Forge Modal
  renderHeroModal: function(container) {
    var eng = window.GameEngine;
    var st = eng.state;
    var forgeCost = Math.round(120 * Math.pow(1.25, st.heroWeaponForgeLv));

    var html = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;background:rgba(30,23,56,0.9);padding:10px 12px;border-radius:12px;border:1px solid rgba(251,191,36,0.35);">';
    html += '<div><div style="font-weight:800;color:#fde047;">🦸 英雄等級 Lv.' + st.heroLevel + ' | 基礎戰力傷害：' + eng.getHeroDamage() + '</div>';
    html += '<div style="font-size:0.76rem;color:#cbd5e1;">神爐強化等級：+' + st.heroWeaponForgeLv + ' | 神性傷害倍率：x' + eng.getDivinityMult().toFixed(2) + '</div></div>';
    html += '<div style="display:flex;gap:6px;">';
    html += '<button class="btn-action" onclick="window.uiForgeEquipment()">⚒️ 鍛造聖物 (🪙' + forgeCost + ')</button>';
    html += '<button class="btn-secondary" onclick="window.uiMergeInventory()">✨ 一鍵三合一升階</button>';
    html += '</div></div>';

    html += '<div style="font-weight:800;color:#38bdf8;font-size:0.88rem;margin-top:4px;">⚔️ 切換古域英雄職業 (隨時自由切換)</div>';
    html += '<div class="card-grid">';
    window.GAME_DATA.heroClasses.forEach(function(cls) {
      var active = st.heroClassId === cls.id;
      html += '<div class="rpg-card ' + (active ? 'unlocked' : '') + '">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<span style="font-weight:800;color:' + cls.color + ';">' + cls.icon + ' ' + cls.name + '</span>';
      html += '<span style="font-size:0.72rem;color:#cbd5e1;">' + cls.title + '</span></div>';
      html += '<div style="font-size:0.74rem;color:#cbd5e1;">' + cls.desc + '</div>';
      html += '<button class="btn-action" ' + (active ? 'disabled' : '') + ' onclick="window.uiSelectHeroClass(\'' + cls.id + '\')">' + (active ? '✅ 當前出戰中' : '切換出戰') + '</button>';
      html += '</div>';
    });
    html += '</div>';

    var slotLabels = { weapon: "🗡️ 武器", armor: "🛡️ 聖甲", ring: "💍 魔戒", relic: "🔮 古聖物" };
    var statLabels = { heroDmg: "英雄傷害", wallHp: "城防耐久", goldBonus: "金幣掉落", towerDmg: "神像傷害", allMult: "全屬性增幅" };
    html += '<div style="font-weight:800;color:#fde047;font-size:0.88rem;margin-top:6px;">👑 當前穿戴神裝 (自動穿戴最高階聖物)</div>';
    html += '<div class="card-grid">';
    ["weapon", "armor", "ring", "relic"].forEach(function(slot) {
      var item = st.equipped[slot];
      html += '<div class="rpg-card ' + (item && item.tier >= 4 ? 'mythic' : '') + '">';
      html += '<div style="font-size:0.75rem;color:#94a3b8;font-weight:700;">' + slotLabels[slot] + '</div>';
      if (item) {
        html += '<div style="font-weight:800;color:' + item.color + ';font-size:0.86rem;">' + item.icon + ' ' + item.name + '</div>';
        html += '<div style="font-size:0.76rem;color:#f8fafc;">' + statLabels[item.statType] + ' +' + Math.round(item.val * 100) + '%</div>';
      } else {
        html += '<div style="font-size:0.8rem;color:#64748b;">尚未穿戴 (踏上鐵匠神爐或打怪掉落)</div>';
      }
      html += '</div>';
    });
    html += '</div>';

    html += '<div style="font-weight:800;color:#cbd5e1;font-size:0.84rem;margin-top:4px;">🎒 聖物背包 (' + st.inventory.length + ' / 36) — 點擊裝備可手動穿戴，或點上方【一鍵三合一升階】</div>';
    if (st.inventory.length === 0) {
      html += '<div style="font-size:0.78rem;color:#64748b;padding:8px;">背包目前為空，擊敗首領或踏上北境【遠古鐵匠神爐陣】即可獲得裝備！</div>';
    } else {
      html += '<div class="card-grid">';
      st.inventory.forEach(function(item, idx) {
        html += '<div class="rpg-card" style="padding:8px;">';
        html += '<div style="font-weight:800;color:' + item.color + ';font-size:0.8rem;">' + item.icon + ' ' + item.name + '</div>';
        html += '<div style="font-size:0.72rem;color:#cbd5e1;">' + statLabels[item.statType] + ' +' + Math.round(item.val * 100) + '%</div>';
        html += '<button class="btn-secondary" style="margin-top:4px;padding:4px 8px;font-size:0.72rem;" onclick="window.uiEquipFromBag(' + idx + ')">穿戴</button>';
        html += '</div>';
      });
      html += '</div>';
    }

    container.innerHTML = html;
  },

  // 5. Permanent Astral Talent Tree Modal
  renderTalentsModal: function(container) {
    var eng = window.GameEngine;
    var st = eng.state;
    var branchTitles = {
      combat: "⚔️ 古域戰術系 (Combat Mastery)",
      economy: "🪙 煉金財富系 (Alchemy & Economy)",
      bastion: "🏰 神殿建築系 (Bastion Architecture)"
    };

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(30,23,56,0.9);padding:8px 12px;border-radius:10px;border:1px solid rgba(168,85,247,0.45);">';
    html += '<span style="font-weight:800;color:#e9d5ff;">🔮 可用靈魂結晶：' + Math.floor(st.souls) + ' (擊敗每 5 波首領、完成任務或古神轉生獲得)</span>';
    html += '</div>';

    ["combat", "economy", "bastion"].forEach(function(br) {
      html += '<div style="font-weight:800;color:#fde047;font-size:0.88rem;margin-top:6px;">' + branchTitles[br] + '</div>';
      html += '<div class="card-grid">';
      window.GAME_DATA.talents.filter(function(t) { return t.branch === br; }).forEach(function(tal) {
        var lv = st.talents[tal.id] || 0;
        var isMax = lv >= tal.maxLv;
        var cost = tal.baseCost + Math.floor(lv / 4);
        var canBuy = st.souls >= cost && !isMax;

        html += '<div class="rpg-card ' + (lv > 0 ? 'unlocked' : '') + '">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="font-weight:800;font-size:0.85rem;">' + tal.icon + ' ' + tal.name + '</span>';
        html += '<span style="font-size:0.75rem;color:#38bdf8;font-weight:700;">Lv.' + lv + '/' + tal.maxLv + '</span></div>';
        html += '<div style="font-size:0.73rem;color:#cbd5e1;">' + tal.desc + '</div>';
        html += '<button class="btn-action" ' + (canBuy ? '' : 'disabled') + ' onclick="window.uiUpgradeTalent(\'' + tal.id + '\')">' + (isMax ? '✨ 已滿級' : '升級 (🔮' + cost + ')') + '</button>';
        html += '</div>';
      });
      html += '</div>';
    });

    container.innerHTML = html;
  },

  // 6. Realms & Ascension Rebirth Modal
  renderRealmsModal: function(container) {
    var eng = window.GameEngine;
    var st = eng.state;
    var pendingSouls = Math.max(2, Math.floor(st.wave * 0.6 * st.realmId));
    var pendingDivinity = Math.max(1, Math.floor(st.wave / 5) * st.realmId);

    var html = '<div style="background:linear-gradient(135deg,rgba(58,28,96,0.92),rgba(24,18,48,0.95));border:1.5px solid #c084fc;border-radius:14px;padding:12px;">';
    html += '<div style="font-weight:800;font-size:0.95rem;color:#fde047;">✨ 太古神殿轉生 (Ascension Rebirth) — 已轉生 ' + st.rebirthCount + ' 次</div>';
    html += '<div style="font-size:0.78rem;color:#e9d5ff;margin:4px 0 8px 0;">重置當前章節波數與建築等級，保留所有【已解鎖 10 大魔塔藍圖、英雄等級、穿戴神裝、星盤天賦】，並立即獲得永久神性傷害與金幣倍率加成！</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;">';
    html += '<span style="font-size:0.8rem;font-weight:800;color:#38bdf8;">當前神性結晶：✨' + st.divinity + ' (全軍總倍率 x' + eng.getDivinityMult().toFixed(2) + ')</span>';
    html += '<button class="btn-action" ' + (st.wave >= 5 ? '' : 'disabled') + ' onclick="window.uiTriggerRebirth()">🔥 立即古神轉生 (+🔮' + pendingSouls + ' / +✨' + pendingDivinity + ')</button>';
    html += '</div></div>';

    html += '<div style="font-weight:800;color:#fde047;font-size:0.9rem;margin-top:6px;">🗺️ 五大古域戰役章節 (每章 50 波 + 領域首領 + 無盡深淵)</div>';
    html += '<div class="card-grid">';
    window.GAME_DATA.realms.forEach(function(r) {
      var isCur = st.realmId === r.id;
      html += '<div class="rpg-card ' + (isCur ? 'unlocked' : '') + '">';
      html += '<div style="font-weight:800;color:#fde047;font-size:0.88rem;">' + r.name + '</div>';
      html += '<div style="font-size:0.72rem;color:#38bdf8;">首領：' + r.bossName + '</div>';
      html += '<div style="font-size:0.73rem;color:#cbd5e1;">' + r.desc + '</div>';
      html += '<div style="font-size:0.73rem;color:#a7f3d0;">💰 金幣與戰利品倍率：x' + r.rewardMult + '</div>';
      html += '<button class="btn-secondary" ' + (isCur ? 'disabled' : '') + ' onclick="window.uiSelectRealm(' + r.id + ')">' + (isCur ? '📍 當前所在領域' : '🚀 傳送至此古域') + '</button>';
      html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
  },

  // 7. Quests & Bestiary Codex Modal
  renderCodexModal: function(container) {
    var eng = window.GameEngine;
    var st = eng.state;
    var playMin = Math.floor(st.playSeconds / 60);

    var html = '<div style="display:flex;flex-wrap:wrap;gap:12px;background:rgba(28,22,52,0.9);padding:10px 12px;border-radius:12px;border:1px solid rgba(56,189,248,0.4);">';
    html += '<div>🏆 累計擊殺魔物：<b>' + st.totalKills + '</b></div>';
    html += '<div>🪙 累計獲取金幣：<b>' + this.formatNum(st.totalGoldEarned) + '</b></div>';
    html += '<div>🌊 最高推進波數：<b>第 ' + st.maxWaveReached + ' 波</b></div>';
    html += '<div>🔓 已解鎖藍圖：<b>' + st.unlockedBlueprints.length + ' / 10</b></div>';
    html += '<div>⏱️ 遊玩時數：<b>' + playMin + ' 分鐘</b></div>';
    html += '</div>';

    html += '<div style="font-weight:800;color:#fde047;font-size:0.88rem;margin-top:4px;">🎯 戰役主線任務進度 (' + Math.min(st.questIndex, window.GAME_DATA.quests.length) + ' / ' + window.GAME_DATA.quests.length + ')</div>';
    html += '<div class="card-grid">';
    window.GAME_DATA.quests.forEach(function(q, idx) {
      var done = idx < st.questIndex;
      var isCur = idx === st.questIndex;
      html += '<div class="rpg-card ' + (done ? 'unlocked' : '') + '" style="opacity:' + (done ? '0.72' : '1') + ';">';
      html += '<div style="font-weight:800;font-size:0.82rem;color:' + (done ? '#22c55e' : (isCur ? '#fde047' : '#f8fafc')) + ';">' + (done ? '✅ ' : (isCur ? '🔥 ' : '⏳ ')) + '#' + q.id + ' ' + q.title + '</div>';
      html += '<div style="font-size:0.73rem;color:#cbd5e1;">獎勵：🪙' + q.rewardGold + ' | 💎' + q.rewardMana + ' | 🔮' + q.rewardSoul + '</div>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div style="font-weight:800;color:#38bdf8;font-size:0.88rem;margin-top:6px;">👹 古域魔物圖鑑 (Bestiary Codex)</div>';
    html += '<div class="card-grid">';
    window.GAME_DATA.bestiary.forEach(function(b) {
      html += '<div class="rpg-card">';
      html += '<div style="font-weight:800;color:#f8fafc;">' + b.icon + ' ' + b.name + '</div>';
      html += '<div style="font-size:0.72rem;color:#fde047;">生命倍率 x' + b.hpMult + ' | 移動速度 ' + b.spd + '</div>';
      html += '<div style="font-size:0.73rem;color:#cbd5e1;">' + b.desc + '</div>';
      html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
  }
};

// ================= GLOBAL HANDLERS FOR INLINE ONCLICK ATTRIBUTES =================
window.uiOpenModal = function(tab) {
  window.SoundEngine.init();
  window.GameUI.openModal(tab);
};

window.uiCloseModal = function() {
  window.GameUI.closeModal();
};

window.uiCastSkill = function(idx) {
  window.SoundEngine.init();
  window.GameEngine.castSkill(idx);
};

window.uiToggleAiMode = function() {
  window.SoundEngine.init();
  window.GameEngine.aiMode = (window.GameEngine.aiMode + 1) % 3;
  window.GameUI.updateTopButtons();
  var msgs = [
    "🕹️ 已切換為【手動控制】：使用觸控搖桿或點擊地面移動",
    "🤖 已開啟【AI 巡邏撿幣】：英雄將自動拾取戰利品並協防城門",
    "⚡ 已開啟【AI 全自動踏陣】：英雄將自動經由城門前往各建地升級與擴建！"
  ];
  window.GameUI.showToast(msgs[window.GameEngine.aiMode]);
};

window.uiToggleSpeed = function() {
  window.SoundEngine.init();
  var cur = window.GameEngine.gameSpeed;
  window.GameEngine.gameSpeed = cur === 1 ? 2 : (cur === 2 ? 3 : 1);
  window.GameUI.updateTopButtons();
  window.GameUI.showToast("⏩ 遊戲戰鬥速度已設為 " + window.GameEngine.gameSpeed + "x");
};

window.uiToggleZoom = function() {
  window.SoundEngine.init();
  var cur = window.GameEngine.camera.userZoomMult || 0.85;
  var next = cur > 0.95 ? 0.62 : (cur < 0.72 ? 0.85 : 1.08);
  window.GameEngine.camera.userZoomMult = next;
  window.GameUI.updateTopButtons();
  window.GameUI.showToast(next < 0.72 ? "🔍 已切換為【全景視野】：可一覽三路敵軍與外圍建地" : (next > 0.95 ? "🔍 已切換為【近景視野】" : "🔍 已切換為【標準視野】"));
};

window.uiToggleAudio = function() {
  var muted = window.SoundEngine.toggleMute();
  window.GameUI.updateTopButtons();
  window.GameUI.showToast(muted ? "🔇 已關閉音效與背景音樂" : "🔊 已開啟古域魔陣音效與背景音樂");
};

window.uiNavigateToPad = function(padId) {
  var pad = window.GAME_DATA.groundPads.find(function(p) { return p.id === padId; });
  if (pad) {
    window.GameEngine.hero.targetX = pad.x;
    window.GameEngine.hero.targetY = pad.y;
    window.GameUI.closeModal();
    window.GameUI.showToast("📍 英雄正經由城門前往【" + pad.name + "】！");
  }
};

window.uiFollowAdvisor = function() {
  window.SoundEngine.init();
  var adv = window.GameEngine.getTacticalAdvice();
  if (!adv) return;
  if (adv.recBpId && !window.GameEngine.isBlueprintUnlocked(adv.recBpId)) {
    window.GameEngine.unlockBlueprint(adv.recBpId);
  }
  if (adv.targetPadId && adv.recBpId) {
    var st = window.GameEngine.state.pads[adv.targetPadId];
    if (st && st.level === 0 && window.GameEngine.isBlueprintUnlocked(adv.recBpId)) {
      window.GameEngine.selectPadBlueprint(adv.targetPadId, adv.recBpId);
    }
  }
  if (adv.targetPadId) {
    window.uiNavigateToPad(adv.targetPadId);
  }
};

window.uiUnlockBlueprint = function(bpId) {
  window.SoundEngine.init();
  var bp = window.GameEngine.getBlueprintById(bpId);
  if (!bp) return;
  var ok = window.GameEngine.unlockBlueprint(bpId);
  if (ok) {
    window.GameUI.updateHUD();
    if (window.GameUI.activeModal === "pads") {
      window.GameUI.openModal("pads");
    }
    window.GameUI.showToast("🔓 成功解鎖藍圖【" + bp.icon + " " + bp.name + "】！踏上任意建地即可選用！");
  } else {
    var cIcon = bp.unlockCurrency === "mana" ? "💎" : "🪙";
    window.GameUI.showToast("⚠️ 資源不足！解鎖【" + bp.name + "】需要 " + cIcon + bp.unlockCost);
  }
};

window.uiChooseTowerOnPad = function(padId, bpId) {
  window.SoundEngine.init();
  var bp = window.GameEngine.getBlueprintById(bpId);
  if (!bp) return;
  var ok = window.GameEngine.selectPadBlueprint(padId, bpId);
  if (ok) {
    window.GameUI.lastContextBpId = null;
    window.GameUI.updateContextCard();
    window.GameUI.updateHUD();
    if (window.GameUI.activeModal === "pads") {
      window.GameUI.openModal("pads");
    }
    window.GameUI.showToast("🏰 已將此建地配置為【" + bp.icon + " " + bp.name + "】！");
  } else {
    var cIcon = bp.unlockCurrency === "mana" ? "💎" : "🪙";
    window.GameUI.showToast("⚠️ 解鎖【" + bp.name + "】需要 " + cIcon + bp.unlockCost + "！");
  }
};

window.uiSelectHeroClass = function(clsId) {
  window.GameEngine.state.heroClassId = clsId;
  window.GameEngine.saveGame();
  window.GameUI.openModal("hero");
  window.GameUI.showToast("⚔️ 已切換英雄職業！");
};

window.uiForgeEquipment = function() {
  var st = window.GameEngine.state;
  var cost = Math.round(120 * Math.pow(1.25, st.heroWeaponForgeLv));
  if (st.gold < cost) {
    window.GameUI.showToast("⚠️ 金幣不足！需要 🪙" + cost);
    return;
  }
  st.gold -= cost;
  st.heroWeaponForgeLv += 1;
  var item = window.GameEngine.rollRandomEquipment();
  window.SoundEngine.playUpgradeComplete();
  window.GameUI.openModal("hero");
  window.GameUI.updateHUD();
  window.GameUI.showToast("⚒️ 鍛造成功！獲得 " + item.name);
};

window.uiMergeInventory = function() {
  var count = window.GameEngine.mergeAllInventory();
  if (count > 0) {
    window.SoundEngine.playUpgradeComplete();
    window.GameUI.openModal("hero");
    window.GameUI.showToast("✨ 成功合成升階 " + count + " 件高階聖物！");
  } else {
    window.GameUI.showToast("ℹ️ 需要背包內有 3 件同品階裝備才可合成升階");
  }
};

window.uiEquipFromBag = function(bagIndex) {
  var st = window.GameEngine.state;
  var item = st.inventory[bagIndex];
  if (!item) return;
  st.inventory.splice(bagIndex, 1);
  var prev = st.equipped[item.slot];
  if (prev) st.inventory.push(prev);
  st.equipped[item.slot] = item;
  window.GameEngine.recalcWallStats(false);
  window.GameUI.openModal("hero");
  window.GameUI.showToast("👑 已穿戴 " + item.name);
};

window.uiUpgradeTalent = function(talId) {
  var st = window.GameEngine.state;
  var tal = window.GAME_DATA.talents.find(function(t) { return t.id === talId; });
  if (!tal) return;
  var lv = st.talents[talId] || 0;
  var cost = tal.baseCost + Math.floor(lv / 4);
  if (lv >= tal.maxLv || st.souls < cost) return;
  st.souls -= cost;
  st.talents[talId] = lv + 1;
  window.GameEngine.recalcWallStats(false);
  window.SoundEngine.playUpgradeComplete();
  window.GameUI.openModal("talents");
  window.GameUI.updateHUD();
};

window.uiSelectRealm = function(realmId) {
  window.GameEngine.changeRealm(realmId, false);
  window.GameUI.closeModal();
};

window.uiTriggerRebirth = function() {
  if (window.GameEngine.state.wave < 5) return;
  window.GameEngine.performRebirth();
  window.GameUI.closeModal();
};

window.uiReviveCitadel = function() {
  window.SoundEngine.init();
  var eng = window.GameEngine;
  if (!eng.townHall) return;
  eng.townHall.hp = eng.townHall.maxHp;
  eng.wall.hp = eng.wall.maxHp;
  // Knock back all enemies outside the fortress walls
  eng.enemies.forEach(function(e) {
    e.x += 260;
    e.y += (e.y < 700 ? -80 : 80);
    e.stunTimer = 2.5;
  });
  window.SoundEngine.playSkill();
  window.GameUI.closeModal();
  window.GameUI.updateHUD();
  window.GameUI.showToast("✨ 聖堂重振：大本營與城防滿血復原！魔物已遭震退！");
};
