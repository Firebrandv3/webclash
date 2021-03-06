const ui = {
    initialize: function()
    {
        cache.progress.create();

        this.controller.create();

        this.actionbar.create();
        this.dialog.create();
        this.loot.create();
        this.inventory.create();
        this.equipment.create();
        this.status.create();
        this.settings.create();
        this.profile.create();
        this.journal.create();
        this.chat.create();

        lx.Loops(this.floaties.update);
    },
    controller:
    {
        size: 120,
        create: function() {
            let div = document.createElement('div');
            div.id = 'joypad_border';
            div.style = 'border: 1px solid whitesmoke; border-radius: 50%; position: absolute; top: 100%; left: 100%; width: ' + this.size + 'px; height: ' + this.size + 'px; transform: translate(-100%, -100%); margin-top: -15px; margin-left: -15px; box-shadow: inset 0px 1px 1px rgba(0,0,0,0.45); pointer-events: auto; overflow: hidden;';

            let joypad = document.createElement('div');
            joypad.id = 'joypad';
            joypad.style = 'position: absolute; transform: translate(-50%, -50%); background-color: rgba(175, 175, 175, .85); border: 1px solid whitesmoke; border-radius: 50%; width: ' + this.size/3 + 'px; height: ' + this.size/3 + 'px; box-shadow: 0px 1px 1px rgba(0,0,0,0.45);';

            div.setAttribute('ontouchstart', 'ui.controller.canFace = true;');
            div.setAttribute('ontouchend', 'ui.controller.face(event);');

            joypad.setAttribute('ontouchmove', 'ui.controller.move(event);');
            joypad.setAttribute('ontouchend', 'ui.controller.reset();');

            div.appendChild(joypad);
            view.dom.append(div);

            this.reset();
        },
        face: function(e) {
            if (!this.canFace)
                return;

            let border = document.getElementById('joypad_border');

            let delta = {
                x: Math.round(e.changedTouches[0].pageX+border.offsetWidth/2)-border.offsetLeft,
                y: Math.round(e.changedTouches[0].pageY+border.offsetHeight/2)-border.offsetTop
            };

            if (Math.abs(delta.x) > Math.abs(delta.y)) {
                if (delta.x < 0)
                    player.forceFrame.start(1);
                else if (delta.x > 0)
                    player.forceFrame.start(2);
            }
            else {
                if (delta.y < 0)
                    player.forceFrame.start(3);
                else if (delta.y > 0)
                    player.forceFrame.start(0);
            }

            player.sync('direction');
        },
        move: function(e) {
            e.preventDefault();
            this.canFace = false;

            let border = document.getElementById('joypad_border'),
                joypad = document.getElementById('joypad');

            let delta = {
                x: Math.round(e.touches[0].pageX+border.offsetWidth)-border.offsetLeft,
                y: Math.round(e.touches[0].pageY+border.offsetHeight)-border.offsetTop
            };

            let done = false;

            if (delta.x >= 0 && delta.x <= border.offsetWidth) {
                joypad.style.left = delta.x + 'px';

                done = true;
            }
            if (delta.y >= 0 && delta.y <= border.offsetHeight) {
                joypad.style.top = delta.y + 'px';

                done = true;
            }

            if (!done)
                return;

            this.clearMovementKeys();

            if (delta.x < this.size/3)
                lx.CONTEXT.CONTROLLER.KEYS['a'] = true;
            else if (delta.x > this.size*(2/3))
                lx.CONTEXT.CONTROLLER.KEYS['d'] = true;

            if (delta.y < this.size/3)
                lx.CONTEXT.CONTROLLER.KEYS['w'] = true;
            else if (delta.y > this.size*(2/3))
                lx.CONTEXT.CONTROLLER.KEYS['s'] = true;
        },
        reset: function() {
            let el = document.getElementById('joypad');

            el.style.top = this.size/2 + 'px';
            el.style.left = this.size/2 + 'px';

            this.clearMovementKeys();
        },
        clearMovementKeys: function() {
            lx.CONTEXT.CONTROLLER.KEYS['w'] =
            lx.CONTEXT.CONTROLLER.KEYS['a'] =
            lx.CONTEXT.CONTROLLER.KEYS['s'] =
            lx.CONTEXT.CONTROLLER.KEYS['d'] =
                false;

            if (game.players[game.player] != undefined)
                game.players[game.player].Movement(0, 0);
        }
    },
    fullscreen:
    {
        lastTap: 0,
        append: function() {
            lx.CONTEXT.CANVAS.addEventListener('touchend', function(event) {
                let currentTime = new Date().getTime(),
                    tapLength = currentTime - ui.fullscreen.lastTap;

                if (tapLength < 500 && tapLength > 0) {
                    ui.fullscreen.request();

                    event.preventDefault();
                }

                ui.fullscreen.lastTap = currentTime;
            });
        },
        request: function() {
            let isInFullScreen = (document.fullscreenElement && document.fullscreenElement !== null) ||
                                 (document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
                                 (document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
                                 (document.msFullscreenElement && document.msFullscreenElement !== null);

            let el = document.documentElement;

            if (isInFullScreen)
                return;

            let rfs = el.requestFullscreen
                    || el.webkitRequestFullscreen
                    || el.mozRequestFullScreen
                    || el.msRequestFullscreen;

            if (typeof rfs != "undefined" && rfs)
                rfs.call(el);
        }
    },
    chat:
    {
        cache: [],
        create: function() {
            if (this.dom !== undefined)
                if (this.dom.box.parentNode !== undefined &&
                    this.dom.box.parentNode !== null) {
                    this.dom.box.parentNode.removeChild(this.dom.box);

                    this.dom = undefined;
                };

            view.dom.innerHTML +=
                '<div id="chat_box" style="position: absolute; top: 15px; left: 15px; width: 180px; height: 155px; pointer-events: auto; ">' +
                    '<input id="chat_box_message" type="text" style="width: 180px;"></input>' +
                    '<div id="chat_box_content" style="position: relative; overflow-y: auto; width: auto; height: auto; max-height: 139px;"></div>' +
                '</div>';

            this.dom = {
                box: document.getElementById('chat_box'),
                content: document.getElementById('chat_box_content'),
                message: document.getElementById('chat_box_message')
            };

            this.dom.message.addEventListener('keydown', function(e) {
                if (e.keyCode == 13)
                    ui.chat.sendMessage();
            });
        },
        timeformat: function() {
            return '(' + new Date().toString().substr(16, 5) + ') ';
        },
        clear: function() {
            if (this.dom === undefined)
                return;

            this.dom.content.innerHTML = '';
        },
        addMessage: function(content) {
            if (this.dom === undefined)
                return;

            this.cache.push('<font style="display: inline;" class="info">' + this.timeformat() + content + '</font><br>');

            if (this.cache.length > 12)
                this.cache.splice(0, 1);

            this.dom.content.innerHTML = this.cache.join('');

            this.dom.content.scrollTo(0, this.dom.content.scrollHeight);
        },
        sendMessage: function() {
            if (this.dom === undefined ||
                this.dom.message.value.length == 0)
                return;

            socket.emit('CLIENT_NEW_CHAT', this.dom.message.value);

            this.dom.message.value = '';
        },
        isTyping: function() {
            return false;
        }
    },
    dialog:
    {
        showing: false,
        create: function()
        {
            view.dom.innerHTML +=
                '<div id="dialog_box" class="box" style="visibility: hidden; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: auto; min-width: 260px; max-width: 340px; height: auto; max-height: 100%; text-align: center; padding: 0px;">' +
                    '<p id="dialog_box_content" style="position: relative; left: 5%; top: 2px; white-space: pre-wrap; overflow-y: auto; overflow-x: hidden; width: 90%; font-size: 14px; margin-bottom: 15px;"></p>' +
                    '<hr style="position: relative; top: -5px; padding: 0px; border: 0; width: 90%; border-bottom: 1px solid whitesmoke;"/>' +
                    '<div id="dialog_box_options" style="position: relative; left: 5%; top: -8px; width: 90%; white-space: normal;"></div>' +
                '</div>';
        },
        startDialog: function(npc, name, dialog)
        {
            let start = -1;

            for (let i = 0; i < dialog.length; i++)
                    if (dialog[i].entry) {
                        start = i;

                        break;
                    }

            if (start == -1)
                return;

            this.cur = dialog;
            this.npc = npc;
            this.name = name;

            this.setDialog(start);
        },
        setDialog: function(id, name_override)
        {
            if (this.cur[id].isEvent)
            {
                socket.emit('CLIENT_DIALOG_EVENT', {
                    npc: this.npc,
                    id: id
                }, function(data) {
                    if (data.quest == undefined) {
                        let next = (data.result ? 0 : 1);

                        if (ui.dialog.cur[id].options[next].next == -1)
                            ui.dialog.hideDialog();
                        else
                            ui.dialog.setDialog(ui.dialog.cur[id].options[next].next);
                    } else {
                        if (player.quests[data.quest.name] == undefined)
                            data.quest.options = [
                                { text: 'Accept', next: 'accept', actual_next: ui.dialog.cur[id].options[0].next },
                                { text: 'Decline', next: -1 }
                            ];
                        else
                            data.quest.options = [
                                { text: 'Exit', next: -1 }
                            ];

                        ui.dialog.cur[id] = data.quest;

                        let minLevel = '';
                        if (data.quest.minLevel > 0)
                            minLevel = ' (Lv. ' + data.quest.minLevel + ')';

                        ui.dialog.setDialog(id, data.quest.name + minLevel);
                    }
                });

                return;
            }

            let contentEl = document.getElementById('dialog_box_content'),
                optionsEl = document.getElementById('dialog_box_options');

            contentEl.innerHTML = '<b>' + this.name + '</b><br>';

            if (this.cur[id].portrait != undefined)
                contentEl.innerHTML += '<img src="' + this.cur[id].portrait + '" class="portrait"/><br>';
            else
                contentEl.innerHTML += '<br>';

            contentEl.innerHTML += this.cur[id].text;
            optionsEl.innerHTML = '';

            this.cur[id].options.forEach(function(option) {
                let cb = '';

                if (!isNaN(option.next)) {
                    //Normal dialog option

                    cb = 'ui.dialog.hideDialog()';

                    if (option.next != -1)
                        cb = 'ui.dialog.setDialog(' + option.next + ')';
                } else {
                    //Quest/unique dialog option

                    if (option.next == 'accept')
                        cb = 'player.acceptQuest(' + ui.dialog.npc + ', ' + id + ');';

                    if (option.actual_next == -1)
                        cb += 'ui.dialog.hideDialog()';
                    else
                        cb += 'ui.dialog.setDialog(' + option.actual_next + ');';
                }

                optionsEl.innerHTML += '<button class="link_button" style="margin-left: 0px;" onclick="' + cb + '">[ ' + option.text + ' ]</button>';
            });

            document.getElementById('dialog_box').style.visibility = 'visible';

            if (this.mouse == undefined && !isNaN(this.npc))
                this.mouse = lx.GAME.ADD_EVENT('mousebutton', 0, function(data) {
                    if (data.state == 0)
                        return;

                    lx.StopMouse(0);

                    ui.dialog.hideDialog();
                });
        },
        hideDialog: function() {
            document.getElementById('dialog_box').style.visibility = 'hidden';

            lx.GAME.CLEAR_EVENT('mousebutton', 0, this.mouse);

            this.mouse = undefined;
        }
    },
    actionbar:
    {
        cooldowns: [],
        create: function() {
            if (this.slots !== undefined)
                return;

            this.slots = [];

            let r = '<div id="actionbar_box" style="position: absolute; top: 100%; transform: translate(0, -100%); margin-top: -15px; left: 15px; pointer-events: auto;">';

            for (let i = 0; i < 7; i++)
            {
                this.slots[i] = 'actionbar_slot' + i;

                let size = 24;

                if (i < 2)
                    size = 32;

                r += '<div class="slot" style="width: ' + size + 'px; height: ' + size + 'px;" ontouchstart="player.performAction(' + i + ');" id="' + this.slots[i] + '"></div>';
            }

            view.dom.innerHTML += r;
        },
        reload: function() {
            if (this.slots === undefined)
                return;

            for (let i = 0; i < this.slots.length; i++) {
                if (document.getElementById(this.slots[i]) == undefined)
                    continue;

                document.getElementById(this.slots[i]).innerHTML = '';
            }

            for (let a = 0; a < player.actions.length; a++)
                if (player.actions[a] != undefined)
                    this.reloadAction(a);
        },
        reloadAction: function(a) {
            if (player.actions[a] == undefined) {
                document.getElementById(this.slots[a]).innerHTML = '';

                return;
            }

            let uses = '', usesContent = '∞';
            if (player.actions[a].uses != undefined)
                usesContent = player.actions[a].uses + '/' + player.actions[a].max;

            uses = '<font class="info" style="position: absolute; top: 100%; margin-top: -15px; margin-left: -6px; font-size: 10px; text-shadow: 0px 0px 1px rgba(0,0,0,1); width: 100%; text-align: right;">' + usesContent + '</font>';

            let size = 24;

            if (a < 2)
                size = 32;

            document.getElementById(this.slots[a]).innerHTML =
                '<img src="' + player.actions[a].src + '" style="position: absolute; top: 4px; left: 4px; width: ' + size + 'px; height: ' + size + 'px;"/>' + uses;
        },
        setCooldown: function(slot) {
            if (this.slots === undefined)
                return;

            //Get slot element

            let el = document.getElementById(this.slots[slot]);

            //Remove cooldown element, just to be sure

            ui.actionbar.removeCooldown(slot);

            //Create cooldown element

            let cd = document.createElement('div');
            cd.id = this.slots[slot] + '_cooldown';
            cd.classList.add('cooldown');

            //Add time label to cooldown element

            let cdTime = document.createElement('p');

            cdTime.classList.add('info');
            cdTime.style.fontSize = '10px';
            cdTime.style.position = 'relative';
            cdTime.style.top = '9px';
            cdTime.style.left = '4px';

            cd.appendChild(cdTime);

            //Append cooldown elements

            el.appendChild(cd);

            //Add to cooldowns

            this.cooldowns[slot] = player.actions[slot].cooldown;

            //Create loop

            let cdLoopID = lx.GAME.ADD_LOOPS(function() {
                 if (player.actions[slot] == undefined) {
                     ui.actionbar.cooldowns[slot] = undefined;
                     ui.actionbar.removeCooldown(slot);

                     lx.GAME.LOOPS[cdLoopID] = undefined;

                     return;
                 }

                 cd.style.width = (ui.actionbar.cooldowns[slot]/player.actions[slot].cooldown)*100 + '%';

                 let time = ui.actionbar.cooldowns[slot]/60;
                 if (time > 1)
                     time = Math.round(time);
                 else
                     time = time.toFixed(1);

                 cdTime.innerHTML = time + 's';

                 if (ui.actionbar.cooldowns[slot] <= 0) {
                     ui.actionbar.cooldowns[slot] = undefined;
                     ui.actionbar.removeCooldown(slot);

                     lx.GAME.LOOPS[cdLoopID] = undefined;
                 } else
                     ui.actionbar.cooldowns[slot]--;
            });
        },
        removeCooldown: function(slot) {
            if (this.slots === undefined)
                return;

            let cd = document.getElementById(this.slots[slot] + '_cooldown');

            if (cd != undefined)
                cd.remove();
        }
    },
    inventory:
    {
        showingContext: false,
        size: {
            width: 4,
            height: 5
        },
        create: function() {
            if (this.slots !== undefined)
                return;

            this.slots = [];

            view.dom.innerHTML +=
                '<div id="inventory_box" style="position: absolute; top: 15px; left: 100%; margin-left: -15px; transform: translate(-100%, 0); width: 45%; height: 48px; pointer-events: auto; overflow-x: auto; white-space: nowrap;">' +
                    '<div id="inventory_box_content" style="position: absolute; top: 0px; left: 0px; width: auto; height: auto; white-space: nowrap;" ontouchmove="ui.inventory.move();" ontouchend="ui.inventory.removeBox();"></div>' +
                '</div>';

            for (let y = 0; y < this.size.height; y++)
                for (let x = 0; x < this.size.width; x++) {
                    let i = (y*this.size.width+x);

                    document.getElementById('inventory_box_content').innerHTML +=
                        '<div class="slot" style="display: flex-inline; width: 24px; height: 24px;" id="inventory_slot' + i + '" oncontextmenu="ui.inventory.displayContext(' + i + ')" ontouchend="ui.inventory.useItem(' + i + ')">' +
                        '</div>';

                    this.slots[i] = 'inventory_slot' + i;
                }

            view.dom.innerHTML +=
                '<font id="gold_label" class="info" style="font-size: 11px; color: yellow; position: absolute; left: 100%; top: 62px; margin-left: -20px; transform: translate(-100%, 0); width: auto; text-align: right; white-space: nowrap;">0 Gold</font>';

            this.reload();
        },
        move: function() {
            let content = document.getElementById('inventory_box_content'),
                box = document.getElementById('inventory_box');

            let currentItem = Math.round(-box.scrollLeft / (box.offsetWidth-content.offsetWidth) * (this.size.width*this.size.height));
            if (currentItem > this.size.width*this.size.height-1)
                currentItem = this.size.width*this.size.height-1;

            this.displayBox(currentItem, box.offsetLeft-box.offsetWidth, box.offsetTop+40);
        },
        reload: function() {
            if (this.slots === undefined)
                return;

            for (let i = 0; i < this.slots.length; i++) {
                document.getElementById(this.slots[i]).innerHTML = '';

                this.reloadItem(i);
            }
        },
        reloadItem: function(slot) {
            if (document.getElementById(this.slots[slot]) == undefined)
                return;

            let indicator = '<font style="font-size: 8px; position: absolute; top: 1px; left: 1px;">' + (slot+1) + '</font>';

            document.getElementById(this.slots[slot]).style.backgroundColor = '';

            if (player.inventory[slot] !== undefined) {
                document.getElementById(this.slots[slot]).innerHTML =
                    indicator + '<img src="' + player.inventory[slot].source + '" style="pointer-events: none; position: absolute; top: 4px; left: 4px; width: 24px; height: 24px;"/>';

                document.getElementById(this.slots[slot]).style.border = '1px solid ' + this.getItemColor(player.inventory[slot].rarity);

                if (player.inventory[slot].minLevel !== 0 &&
                    player.inventory[slot].minLevel > game.players[game.player]._level)
                    document.getElementById(this.slots[slot]).style.backgroundColor = '#ff6666';
            }
            else {
                document.getElementById(this.slots[slot]).innerHTML = indicator;

                document.getElementById(this.slots[slot]).style.border = '1px solid gray';
            }
        },
        setGold: function(gold) {
            document.getElementById('gold_label').innerHTML = gold + ' Gold';
        },
        useItem: function(slot) {
            if (player.inventory[slot] !== undefined &&
                !this.showingContext) {
                //Grab sounds

                let sounds = player.inventory[slot].sounds;

                //Send to server

                socket.emit('CLIENT_USE_ITEM', player.inventory[slot].name, function(valid) {
                    if (valid) {
                        //Play item sound if possible

                        if (sounds != undefined) {
                           let sound = audio.getRandomSound(sounds);

                           if (sound != undefined)
                              audio.playSound(sound);
                        }

                        //Remove box

                        ui.inventory.removeBox();

                        //Remove context menu

                        ui.inventory.removeContext();
                    }
                });
            }
        },
        dropItem: function(slot) {
            if (player.inventory[slot] !== undefined) {
                //Play item sound if possible

                if (player.inventory[slot].sounds != undefined) {
                   let sound = audio.getRandomSound(player.inventory[slot].sounds);

                   if (sound != undefined)
                      audio.playSound(sound);
                }

                //Send to server

                socket.emit('CLIENT_DROP_ITEM', slot);

                //Remove box

                ui.inventory.removeContext();
            }
        },
        displayBox: function(slot, x, y) {
            //Element

            let el = document.getElementById('displayBox'),
                context_el = document.getElementById('contextBox');

            if (el != undefined ||
                context_el != undefined) {
                if (el._slot !== slot)
                    this.removeBox();
                else
                    return;
            }

            //Check if valid

            if (player.inventory[slot] === undefined && player.equipment[slot] === undefined)
                return;

            //Item

            let item = player.inventory[slot],
                isEquipment = false;

            if (item === undefined) {
                item = player.equipment[slot];

                isEquipment = true;
            }

            //Highlight slot

            if (item.minLevel > game.players[game.player]._level)
                document.getElementById(this.slots[slot]).style.backgroundColor = '#ffb3b3';
            else
                document.getElementById(this.slots[slot]).style.backgroundColor = 'rgba(215, 215, 215, .85)';

            //Color

            let color = this.getItemColor(item.rarity);
            let note = '';

            if (item.minLevel == undefined ||
                item.minLevel === 0 ||
                game.players[game.player]._level >= item.minLevel) {
                if (item.type === 'consumable' ||
                    item.type === 'dialog')
                    note = '(Click to use)';

                if (item.type === 'equipment') {
                    if (player.equipment[slot] === undefined)
                        note = '(Click to equip)';
                    else
                        note = '(Click to unequip)';
                }
            }

            //Action

            let action = '',
                actionName = '',
                actionDps = '';

            if (item.type === 'consumable' &&
                item.consumableAction.length > 0) {
                actionName = '<b>' + item.consumableAction + '</b>';
                actionDps = '<br>' + item.consumableActionUses + ' Uses';
            }
            if (item.type === 'equipment' &&
                item.equippableAction.length > 0) {
                actionName = '<b>' + item.equippableAction + '</b>';

                if (isEquipment)
                    actionDps = '<br>DPS: ' + game.calculateDamagePerSecond(item.scaling);
                else
                    actionDps = '<br>DPS: ' + game.calculateDamagePerSecond(item.scaling, item.stats);
            }

            if (actionName !== '')
                action = '<div class="inner-box" style="width: auto; height: auto; position: relative; top: 4px; margin-bottom: 5px; padding: 2px;">' +
                            '<img class="thumb" src="' + item.actionIcon + '" style="display: inline-block; margin-left: -4px;"/>' +
                            '<p class="info" style="text-align: left; font-size: 11px; display: inline-block; margin: 0px; margin-left: 4px; margin-top: -1px;">' + actionName + actionDps + '</p>' +
                         '</div>';

            //Stats

            let stats = '<div style="position: relative; top: 3px;">';

            if (item.type === 'consumable') {
                if (item.heal > 0)
                    stats += '<p class="info" style="font-size: 11px;">+' + item.heal + ' Health</p>';
                if (item.mana > 0)
                    stats += '<p class="info" style="font-size: 11px;">+' + item.mana + ' Mana</p>';
                if (item.gold > 0)
                    stats += '<p class="info" style="font-size: 11px;">+' + item.gold + ' Gold</p>';
            }

            if (item.type === 'equipment' &&
                item.stats != undefined) {
                if (item.stats.power > 0)
                    stats += '<p class="info" style="font-size: 11px;">+' + item.stats.power + ' Power</p>';
                if (item.stats.intelligence > 0)
                    stats += '<p class="info" style="font-size: 11px;">+' + item.stats.intelligence + ' Intelligence</p>';
                if (item.stats.toughness > 0)
                    stats += '<p class="info" style="font-size: 11px;">+' + item.stats.toughness + ' Toughness</p>';
                if (item.stats.vitality > 0)
                    stats += '<p class="info" style="font-size: 11px;">+' + item.stats.vitality + ' Vitality</p>';
                if (item.stats.wisdom > 0)
                    stats += '<p class="info" style="font-size: 11px;">+' + item.stats.wisdom + ' Wisdom</p>';
                if (item.stats.agility > 0)
                    stats += '<p class="info" style="font-size: 11px;">+' + item.stats.agility + ' Agility</p>';
            }

            stats + '</div>';

            //Item type

            let type = item.type;

            if (item.type === 'equipment')
                type = item.equippable;

            //Create displaybox

            let displayBox = document.createElement('div');

            displayBox.id = 'displayBox';
            displayBox.classList.add('box');
            displayBox.style = 'position: absolute; top: ' + y + 'px; left: ' + x + 'px; min-width: 120px; max-width: 160px; width: auto; padding: 4px; padding-bottom: 8px; height: auto; text-align: center;';
            displayBox.innerHTML =
                    '<font class="header" style="font-size: 14px; color: ' + color + ';">' + item.name + '</font><br>' +
                    '<font class="info" style="font-size: 10px;">' + (item.minLevel > 0 ? ' lvl ' + item.minLevel + ' ' : '') + type + '</font><br>' +
                    action +
                    '<font class="info" style="position: relative; top: 4px;">' + item.description + '</font><br>' +
                    stats +
                    (note !== '' ? '<font class="info" style="font-size: 11px; margin-top: 5px;">' + note + '</font><br>' : '') +
                    '<font class="info" style="font-size: 10px; color: yellow;">' + item.value + ' Gold</font><br>';

            displayBox._slot = slot;
            displayBox._minLevel = item.minLevel;

            //Append

            view.dom.appendChild(displayBox);
        },
        removeBox: function() {
            let el = document.getElementById('displayBox');

            if (el == null)
                return;

            if (el._minLevel > game.players[game.player]._level)
                document.getElementById(this.slots[el._slot]).style.backgroundColor = '#ff6666';
            else
                document.getElementById(this.slots[el._slot]).style.backgroundColor = 'rgba(175, 175, 175, .85)';

            el.remove();
        },
        displayContext: function(slot) {
            if (player.inventory[slot] === undefined && player.equipment[slot] === undefined)
                return;

            //Set context boolean to true

            this.showingContext = true;

            //Element

            let el = document.getElementById('contextBox');

            if (el != undefined)
                this.removeContext();

            //Item

            let item = player.inventory[slot];

            if (item === undefined)
                item = player.equipment[slot];

            //Hide displaybox

            this.removeBox();

            //Show context menu

            let contextBox = document.createElement('div');

            contextBox.id = 'contextBox';
            contextBox.classList.add('box');
            contextBox.style = 'position: absolute; width: 70px; padding: 4px; height: auto; text-align: center;';
            contextBox.innerHTML =
                    '<button style="width: 90%; height: 20px; font-size: 12px;" onclick="ui.inventory.useItem(' + slot + ')">Use</button>' +
                    '<button style="width: 90%; height: 20px; font-size: 12px; margin-top: 5px;" onclick="ui.inventory.dropItem(' + slot + ')">Drop</button>';

            //Set on mouse leave event handler

            contextBox.setAttribute('onmouseleave', 'ui.inventory.removeContext()');

            //Append

            view.dom.appendChild(contextBox);

            //Set position

            contextBox.style.left = lx.CONTEXT.CONTROLLER.MOUSE.POS.X-contextBox.offsetWidth/2 + 'px';
            contextBox.style.top = lx.CONTEXT.CONTROLLER.MOUSE.POS.Y+8 + 'px';
        },
        removeContext: function() {
            if (document.getElementById('contextBox') == null)
                return;

            //Set context boolean to true

            this.showingContext = false;

            //Remove context

            document.getElementById('contextBox').remove();
        },
        getItemColor: function(rarity) {
            let color = 'gray';

            switch (rarity)
            {
                case 'common':
                    color = 'silver';
                    break;
                case 'uncommon':
                    color = 'lightgreen';
                    break;
                case 'rare':
                    color = 'dodgerblue';
                    break;
                case 'exotic':
                    color = 'yellow';
                    break;
                case 'legendary':
                    color = 'magenta';
                    break;
            }

            return color;
        }
    },
    equipment:
    {
        create: function() {
            if (this.slots !== undefined)
                return;

            this.slots = [
                'equipmentbar_slot0',
                'equipmentbar_slot1',
                'equipmentbar_slot2',
                'equipmentbar_slot3',
                'equipmentbar_slot4',
                'equipmentbar_slot5',
                'equipmentbar_slot6'
            ];

            for (let i = 0; i < this.slots.length; i++) {
                let equippable = this.getEquippableAtIndex(i);

                document.getElementById('inventory_box_content').innerHTML += '<div class="slot" id="' + this.slots[i] + '" style="display: flex-inline; width: 24px; height: 24px;" ontouchend="player.unequip(\'' + equippable + '\')"></div>';
            }

            this.reload();
        },
        reload: function() {
            if (this.slots === undefined)
                return;

            for (let i = 0; i < this.slots.length; i++)
                document.getElementById(this.slots[i]).innerHTML = '';

            this.reloadEquipment('main');
            this.reloadEquipment('offhand');
            this.reloadEquipment('head');
            this.reloadEquipment('torso');
            this.reloadEquipment('hands');
            this.reloadEquipment('legs');
            this.reloadEquipment('feet');
        },
        reloadEquipment: function(equippable) {
            let slot = this.getEquippableIndex(equippable);

            if (slot == -1)
                return;

            let indicator = '<p style="position: absolute; left: 2px; top: 2px; color: #373737; opacity: .85; font-size: 7px; width: 100%; margin: 0px;">' + equippable + '</p>';

            if (player.equipment[equippable] !== undefined) {
                document.getElementById(this.slots[slot]).innerHTML =
                    indicator + '<img src="' + player.equipment[equippable].source + '" style="pointer-events: none; position: absolute; top: 4px; left: 4px; width: 24px; height: 24px;"/>';

                document.getElementById(this.slots[slot]).style.border = '1px solid ' + ui.inventory.getItemColor(player.equipment[equippable].rarity);
            }
            else {
                document.getElementById(this.slots[slot]).innerHTML = indicator;

                document.getElementById(this.slots[slot]).style.border = '1px solid gray';
            }
        },
        getEquippableIndex: function(equippable) {
            switch (equippable)
            {
                case 'head':
                    return 0;
                case 'torso':
                    return 1;
                case 'hands':
                    return 2;
                case 'legs':
                    return 3;
                case 'feet':
                    return 4;
                case 'main':
                    return 5;
                case 'offhand':
                    return 6;
            }

            return -1;
        },
        getEquippableAtIndex: function(index) {
            switch (index) {
                case 0:
                    return 'head';
                case 1:
                    return 'torso';
                case 2:
                    return 'hands';
                case 3:
                    return 'legs';
                case 4:
                    return 'feet';
                case 5:
                    return 'main';
                case 6:
                    return 'offhand';
            }
        }
    },
    status:
    {
        create: function() {
            view.dom.innerHTML +=
                '<div id="status_box" style="position: absolute; top: 100%; left: 100%; margin-top: -34px; margin-left: -' + (ui.controller.size+30) + 'px; transform: translate(-100%, -100%); width: 20%; height: auto;">' +
                    '<div id="status_health_box" class="bar" style="text-align: center; height: 9px; margin-top: 0px;">' +
                        '<div id="status_health" class="bar_content" style="background-color: #E87651; width: 100%;"></div>' +
                        '<p id="status_health_text" class="info" style="transform: translate(0, -90%); margin: 0; font-size: 9px;"></p>' +
                    '</div>' +
                    '<div id="status_mana_box" class="bar" style="text-align: center; height: 9px; margin-top: 2px;">' +
                        '<div id="status_mana" class="bar_content" style="background-color: #2B92ED; width: 100%;"></div>' +
                        '<p id="status_mana_text" class="info" style="transform: translate(0, -90%); margin: 0; font-size: 9px;"></p>' +
                    '</div>' +
                    '<div id="status_exp_box" class="bar" style="text-align: center; height: 9px; margin-top: 2px;">' +
                        '<div id="status_exp" class="bar_content" style="background-color: #BF4CE6; width: 100%;"></div>' +
                        '<p id="status_exp_text" class="info" style="transform: translate(0, -90%); margin: 0; font-size: 9px;"></p>' +
                    '</div>' +
                    '<div style="transform: translate(-50%, 0); position: absolute; left: 50%; pointer-events: auto;">' +
                        '<a class="link" onclick="ui.profile.show()" style="font-size: 10px; margin: 0px 7px 0px 7px;">Profile</a>' +
                        '<a class="link" onclick="ui.journal.show()" style="font-size: 10px; margin: 0px 7px 0px 7px;">Journal</a>' +
                        '<a class="link" onclick="ui.settings.show()" style="font-size: 10px; margin: 0px 7px 0px 7px;">Settings</a>' +
                    '</div>' +
                '</div>';
        },
        setHealth: function(value, max) {
            let el = document.getElementById('status_health'),
                t_el = document.getElementById('status_health_text');

            el.style.width = (value/max)*100 + '%';

            t_el.innerHTML = value;
        },
        setMana: function(value, max) {
            let el = document.getElementById('status_mana'),
                t_el = document.getElementById('status_mana_text');

            el.style.width = (value/max)*100 + '%';

            t_el.innerHTML = value;
        },
        setExperience: function(value, max) {
            let el = document.getElementById('status_exp'),
                t_el = document.getElementById('status_exp_text');

            el.style.width = (value/max)*100 + '%';

            t_el.innerHTML = value;
        }
    },
    loot:
    {
        items: [],
        create: function() {
            view.dom.innerHTML +=
                '<div id="loot_box" class="box" style="visibility: hidden; position: absolute; top: 50%; left: 25%; transform: translate(-50%, -50%); width: auto; max-width: 120px; height: auto; text-align: center; padding-top: 1px; padding-bottom: 1px;">' +
                    '<p class="info" style="font-size: 12px; margin: 2px;">Loot</p>' +
                    '<div id="loot_box_content" style="text-align: left;"></div>' +
                    '<p class="link" onclick="ui.loot.hide()" style="font-size: 11px; color: red;">Close</p>'
                '</div>';
        },
        reset: function() {
            //Reset loot items

            this.items = [];

            //Hide loot box

            this.hide();
        },
        add: function(data) {
            //Check if item has already been added to the loot box

            if (this.items[data.id] !== undefined)
                return;

            //Get DOM elements

            let el = document.getElementById('loot_box'),
                el_content = document.getElementById('loot_box_content');

            //Check if valid

            if (el === undefined ||
                el_content === undefined)
                return;

            //Set item

            this.items[data.id] = data;

            //Add to DOM loot box content

            el_content.innerHTML +=
                '<div class="slot" id="loot_slot' + data.id + '" style="width: 24px; height: 24px; border: 1px solid ' + ui.inventory.getItemColor(data.rarity) + ';" onclick="ui.loot.pickup(' + data.id + ')">' +
                    '<img src="' + data.source + '" style="pointer-events: none; position: absolute; top: 4px; left: 4px; width: 24px; height: 24px;"/>' +
                '</div>';

            //Show loot box

            this.show();
        },
        pickup: function(id) {
            //Check if valid

            if (this.items[id] === undefined)
                return;

            //Emit pickup request

            socket.emit('CLIENT_PICKUP_ITEM', id);
        },
        remove: function(id) {
            //Check if valid

            if (this.items[id] === undefined)
                return;

            //Get DOM elements

            let el = document.getElementById('loot_box_content'),
                slot_el = document.getElementById('loot_slot' + id);

            //Check if DOM elements are valid

            if (el === undefined ||
                slot_el === undefined)
                return;

            //Remove slot element

            el.removeChild(slot_el);

            //Remove possible loot item

            this.items[id] = undefined;

            //Check if loot box should be hidden

            let count = 0;
            for (let i = 0; i < this.items.length; i++)
                if (this.items[i] === undefined)
                    count++;

            if (count === this.items.length)
                this.reset();
        },
        show: function() {
            //Show the loot box if it is available

            let el = document.getElementById('loot_box');

            if (el === undefined)
                return;

            //Set visibility

            el.style.visibility = 'visible';
        },
        hide: function() {
            //Hide the loot box if it is available

            let el = document.getElementById('loot_box'),
                el_content = document.getElementById('loot_box_content');

            if (el === undefined ||
                el_content === undefined)
                return;

            //Clear all items

            el_content.innerHTML = '';

            this.items = [];

            //Set visibility

            el.style.visibility = 'hidden';
        }
    },
    settings:
    {
        visible: false,
        hasChanged: false,
        create: function() {
            view.dom.innerHTML +=
                '<div id="settings_box" class="box" style="visibility: hidden; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: auto; width: auto; height: auto; text-align: center; padding: 0px;">' +
                    '<p class="info" style="font-size: 15px; padding-bottom: 6px;"><b>Settings</b></p>' +

                    '<p class="info" style="font-size: 13px;"><b>Audio</b></p>' +

                    '<p class="info" style="font-size: 13px; margin: 0px;" id="settings_audio_mainVolume_text">Main </p>' +
                    '<input type="range" min="0" max="100" id="settings_audio_mainVolume" onchange="ui.settings.changeAudioValue(event)"/>' +
                    '<p class="info" style="font-size: 13px; margin: 0px;" id="settings_audio_musicVolume_text">Music </p>' +
                    '<input type="range" min="0" max="100" id="settings_audio_musicVolume" onchange="ui.settings.changeAudioValue(event)"/>' +
                    '<p class="info" style="font-size: 13px; margin: 0px;" id="settings_audio_soundVolume_text">Sound </p>' +
                    '<input type="range" min="0" max="100" id="settings_audio_soundVolume" onchange="ui.settings.changeAudioValue(event)"/>' +

                    '<p class="link" onclick="ui.settings.hide()" style="font-size: 12px; color: red; padding-top: 4px;">Close</p>' +
                '</div>';
        },
        loadFromSettings: function(settings) {
            //Audio values

            document.getElementById('settings_audio_mainVolume').value = settings.audio.main;
            document.getElementById('settings_audio_musicVolume').value = settings.audio.music;
            document.getElementById('settings_audio_soundVolume').value = settings.audio.sound;

            this.changeAudioValue({
                target: document.getElementById('settings_audio_musicVolume')
            });
            this.changeAudioValue({
                target: document.getElementById('settings_audio_soundVolume')
            });
            this.changeAudioValue({
                target: document.getElementById('settings_audio_mainVolume')
            });
        },
        changeAudioValue: function(data) {
            let val = Math.round(data.target.value),
                text = document.getElementById(data.target.id+'_text');

            text = text.innerHTML.substr(0, text.innerHTML.indexOf(' '));

            this.hasChanged = true;

            switch (text) {
                case 'Main':
                    audio.setMainVolume(val/100);
                    break;
                case 'Music':
                    audio.setBGMVolume(val/100);
                    break;
                case 'Sound':
                    audio.setSoundVolume(val/100);
                    break;
            }

            document.getElementById(data.target.id+'_text').innerHTML = text + ' (' + val + ')';
        },
        show: function() {
            if (tiled.loading || this.visible) {
                this.hide();

                return;
            }

            ui.profile.hide();
            ui.journal.hide();

            lx.CONTEXT.CONTROLLER.TARGET = undefined;

            if (this.mouse == undefined)
                this.mouse = lx.GAME.ADD_EVENT('mousebutton', 0, function(data) {
                    if (data.state == 0)
                        return;

                    lx.StopMouse(0);

                    ui.settings.hide();
                });

            document.getElementById('settings_box').style.visibility = 'visible';

            this.hasChanged = false;
            this.visible = true;
        },
        hide: function() {
            lx.CONTEXT.CONTROLLER.TARGET = game.players[game.player];

            lx.GAME.CLEAR_EVENT('mousebutton', 0, this.mouse);

            this.mouse = undefined;

            document.getElementById('settings_box').style.visibility = 'hidden';

            this.visible = false;

            if (this.hasChanged)
                socket.emit('CLIENT_USER_SETTINGS', {
                    audio: {
                        main: audio.actualMainVolume*100,
                        music: audio.actualBGMVolume*100,
                        sound: audio.actualSoundVolume*100
                    }
                });
        }
    },
    profile:
    {
        attributes: [
            'Power',
            'Agility',
            'Intelligence',
            'Toughness',
            'Vitality',
            'Wisdom'
        ],
        visible: false,
        create: function() {
            let html =
                '<div id="profile_box" class="box" style="visibility: hidden; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: auto; height: auto; text-align: center; padding: 4px 12px 4px 12px;">' +
                    '<p class="info" style="font-size: 15px; padding-bottom: 6px;"><b>Profile</b></p>' +
                    '<p class="info" id="profile_level" style="font-size: 14px;"></p>' +
                    '<p class="info" id="profile_points" style="font-size: 12px; padding-bottom: 6px;"></p>';

            for (let a = 0; a < this.attributes.length; a++)
                html += '<p id="profile_stat_' + this.attributes[a].toLowerCase() + '" class="info"></p>';

            view.dom.innerHTML += html + '<p class="link" onclick="ui.profile.hide()" style="font-size: 12px; color: red; padding-top: 4px;">Close</p></div>';
        },
        reloadLevel: function(level) {
            document.getElementById('profile_level').innerHTML = 'Level ' + level;
        },
        reloadPoints: function() {
            document.getElementById('profile_points').innerHTML = '(Available points: ' + player.points + ')';

            if (player.attributes != undefined)
                this.reloadAttributes();
        },
        reloadAttributes: function() {
            let showButtons = false;

            if (player.points > 0)
                showButtons = true;

            for (let a = 0; a < this.attributes.length; a++)
                this.reloadAttribute(this.attributes[a], showButtons);
        },
        reloadAttribute: function(attribute, show_button) {
            let el = document.getElementById('profile_stat_' + attribute.toLowerCase());

            el.innerHTML = attribute + ': ' + player.attributes[attribute.toLowerCase()];

            if (show_button)
                el.innerHTML += ' <button onclick="ui.profile.incrementAttribute(\'' + attribute.toLowerCase() + '\');" style="width: 18px; height: 18px; padding: 0px;">+</button>';
        },
        incrementAttribute: function(attribute) {
            if (player.points == 0)
                return;

            socket.emit('CLIENT_INCREMENT_ATTRIBUTE', attribute);
        },
        show: function() {
            if (this.visible) {
                this.hide();

                return;
            }

            ui.settings.hide();
            ui.journal.hide();

            lx.CONTEXT.CONTROLLER.TARGET = undefined;

            if (this.mouse == undefined)
                this.mouse = lx.GAME.ADD_EVENT('mousebutton', 0, function(data) {
                    if (data.state == 0)
                        return;

                    lx.StopMouse(0);

                    ui.profile.hide();
                });

            document.getElementById('profile_box').style.visibility = 'visible';

            this.visible = true;
        },
        hide: function() {
            lx.CONTEXT.CONTROLLER.TARGET = game.players[game.player];

            lx.GAME.CLEAR_EVENT('mousebutton', 0, this.mouse);

            this.mouse = undefined;

            document.getElementById('profile_box').style.visibility = 'hidden';

            this.visible = false;
        }
    },
    journal:
    {
        create: function() {
            view.dom.innerHTML +=
                '<div id="journal_box" class="box" style="text-align: center; visibility: hidden; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: auto; height: auto; max-height: 240px; overflow-y: auto;">' +
                '</div>';
        },
        reload: function() {
            let done = false;

            document.getElementById('journal_box').innerHTML = '<p class="info" style="font-size: 15px; padding-bottom: 6px;"><b>Journal</b></p>';

            for (let quest in player.quests) {
                document.getElementById('journal_box').appendChild(ui.quests.generateQuestDom(quest, player.quests[quest], true));

                done = true;
            }

            if (!done)
                document.getElementById('journal_box').innerHTML += '<p class="info">No quests available.</p>';
        },
        show: function() {
            if (this.visible) {
                this.hide();

                return;
            }

            this.reload();

            ui.profile.hide();
            ui.settings.hide();

            lx.CONTEXT.CONTROLLER.TARGET = undefined;

            if (this.mouse == undefined)
                this.mouse = lx.GAME.ADD_EVENT('mousebutton', 0, function(data) {
                    if (data.state == 0)
                        return;

                    lx.StopMouse(0);

                    ui.journal.hide();
                });

            document.getElementById('journal_box').style.visibility = 'visible';

            this.visible = true;
        },
        hide: function() {
            lx.CONTEXT.CONTROLLER.TARGET = game.players[game.player];

            lx.GAME.CLEAR_EVENT('mousebutton', 0, this.mouse);

            this.mouse = undefined;

            document.getElementById('journal_box').style.visibility = 'hidden';

            this.visible = false;
        },
        abandon: function(name) {
            socket.emit('CLIENT_ABANDON_QUEST', name, function() {
                delete player.quests[name];

                ui.chat.addMessage('Abandoned "' + name + '".');

                ui.journal.reload();
                ui.quests.reload();
            });
        }
    },
    quests:
    {
        generateQuestDom: function(name, quest, full) {
            let result = document.createElement('div'),
                progress = '',
                objectives = quest.objectives;

            for (let i = 0; i <= quest.id; i++) {
                let objective = objectives[i],
                    objective_result = '';

                switch (objective.type) {
                    case 'kill':
                        objective = objective.killObjective;
                        objective_result = objective.cur + '/' + objective.amount + ' ' + objective.npc + (objective.amount === 1 ? '' : 's');
                        break;
                    case 'gather':
                        objective = objective.gatherObjective;
                        objective_result = objective.cur + '/' + objective.amount + ' ' + objective.item + (objective.amount === 1 ? '' : 's');
                        break;
                }

                if (i != quest.id)
                    objective_result = '<del>' + objective_result + '</del><br>';

                progress += objective_result;
            }

            let padding = '2px 6px 2px 6px;';

            if (full)
                padding = '2px 14px 2px 14px;';

            result.id = 'quests_content';
            result.classList.add('content');
            result.style = 'width: auto; height: auto; padding: ' + padding;

            result.innerHTML +=
                    '<p class="info"><b>' + name + '</b></p>' +
                    '<p class="info" style="font-size: 11px;">' + progress + '</p>';

            if (full) {
                result.innerHTML +=
                    '<hr style="padding: 0px; border: 0; width: 90%; border-bottom: 1px solid whitesmoke; margin: 2px;"/>';

                //Abandon option

                let abandon_option = document.createElement('a');
                abandon_option.style = 'font-size: 11px; color: #ff3333; padding: 2px;';
                abandon_option.classList.add('link');
                abandon_option.innerHTML = 'Abandon';

                abandon_option.addEventListener('click', function() {
                    ui.journal.abandon(name);
                });

                result.appendChild(abandon_option);
            }

            return result;
        },
        reload: function() {
            //...
        }
    },
    floaties:
    {
        buffer: [],
        add: function(uitext, duration)
        {
            this.buffer.push({
                uitext: uitext.Show(),
                movement: {
                    x: 0,
                    y: -.35,
                    dy: .05
                },
                cur: duration
            });
        },
        update: function()
        {
            for (let i = 0; i < ui.floaties.buffer.length; i++)
            {
                ui.floaties.buffer[i].uitext.Position().X += ui.floaties.buffer[i].movement.x;
                ui.floaties.buffer[i].uitext.Position().Y += ui.floaties.buffer[i].movement.y;

                ui.floaties.buffer[i].cur--;
                ui.floaties.buffer[i].movement.y += ui.floaties.buffer[i].movement.dy;

                if (ui.floaties.buffer[i].cur <= 0)
                {
                    ui.floaties.buffer[i].uitext.Hide();

                    ui.floaties.buffer.splice(i, 1);
                }
            }
        },
        experienceFloaty: function(target, delta)
        {
            let t = new lx.UIText(
                delta,
                Math.random()*target.Size().W,
                Math.random()*target.Size().H,
                15,
                '#BF4CE6'
            );

            t.Follows(target);
            t.Alignment('center');
            t.SHADOW = true;

            this.add(t, 32);
        },
        damageFloaty: function(target, delta)
        {
            let t = new lx.UIText(
                delta,
                Math.random()*target.Size().W,
                Math.random()*target.Size().H,
                14,
                '#FF4242'
            );

            t.Follows(target);
            t.Alignment('center');
            t.SHADOW = true;

            this.add(t, 32);
        },
        missFloaty: function(target, delta)
        {
            let t = new lx.UIText(
                delta,
                Math.random()*target.Size().W,
                Math.random()*target.Size().H,
                14,
                'silver'
            );

            t.Follows(target);
            t.Alignment('center');
            t.SHADOW = true;

            this.add(t, 32);
        },
        healFloaty: function(target, delta)
        {
            let t = new lx.UIText(
                delta,
                Math.random()*target.Size().W,
                Math.random()*target.Size().H,
                15,
                '#8cff66'
            );

            t.Follows(target);
            t.Alignment('center');
            t.SHADOW = true;

            this.add(t, 32);
        }
    }
};
