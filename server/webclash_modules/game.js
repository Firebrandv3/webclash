//Game module for WebClash

const fs = require('fs');

exports.players = [];
exports.characters = [];

exports.playerConstraints = {
    inventory_size: 20
};

exports.startLoop = function()
{
    //Start game logics loop

    setInterval(function() {
        //Update NPCs

        npcs.updateMaps();

        //Update action cooldowns

        actions.updateCooldowns();

        //Update action projectiles

        actions.updateProjectiles();
    }, 1000/60);

    //Start real time loop

    setInterval(function() {
        //Update world items

        items.updateMaps();

        //Update players

        game.updatePlayers();
    }, 1000);
};

exports.savePermissions = function ()
{
    fs.writeFile('permissions.json', JSON.stringify(permissions, null, 1), 'utf8', function(err) {
        if (err)
            throw err;
    });
};

exports.addPlayer = function(socket)
{
    //Check if socket is valid

    if (socket.name === undefined)
        return;

    try {
        //Grab user data, player stats

        storage.load('accounts', socket.name, function(user_data) {
            //Sync user settings if they exist

            if (user_data.settings != null)
                socket.emit('GAME_USER_SETTINGS', user_data.settings);

            storage.load('stats', socket.name, function(player) {
                player.name = socket.name;
                player.character = game.characters[player.char_name];
                player.socket = socket;

                player.map_id = tiled.getMapIndex(player.map);

                //Add player

                let id = game.players.length;
                game.players[id] = player;

                //Calculate stat attributes

                game.calculatePlayerStats(id);

                //Load current world

                game.loadMap(socket, player.map);

                //Sync across server

                server.syncPlayer(id, socket, true);

                //Sync to player

                server.syncPlayer(id, socket, false);

                //Sync partial stats

                server.syncPlayerPartially(id, 'exp', socket, false);
                server.syncPlayerPartially(id, 'points', socket, false);
                server.syncPlayerPartially(id, 'attributes', socket, false);
                server.syncPlayerPartially(id, 'health', socket, false);
                server.syncPlayerPartially(id, 'mana', socket, false);
                server.syncPlayerPartially(id, 'actions', socket, false);
                server.syncPlayerPartially(id, 'quests', socket, false);
                server.syncPlayerPartially(id, 'gold', socket, false);

                //Sync inventory

                for (let i = 0; i < game.players[id].inventory.length; i++)
                    if (game.players[id].inventory[i] != undefined)
                        server.syncInventoryItem(i, id, socket, false);

                //Sync equipment

                for (let equipment in game.players[id].equipment) {
                    if (equipment != undefined)
                        server.syncEquipmentItem(equipment, id, socket, false);
                };

                //Sync equipment to others

                server.syncPlayerPartially(id, 'equipment', socket, true);
            });
        });
    }
    catch (err) {
        output.giveError('Could not add player: ', err);
    }
};

exports.removePlayer = function(socket)
{
    try {
        //Check if socket is valid

        if (socket === undefined || socket.name === undefined)
            return;

         //Get player index

        let id = game.getPlayerIndex(socket.name);

        //Check if valid

        if (id === -1)
            return;

        //Remove NPC targets

        npcs.removeNPCTargets(this.players[id].map_id, id, true);

        //Remove from clients

        server.removePlayer(id, socket);

        //Release owned world items

        items.releaseWorldItemsFromOwner(this.players[id].map_id, this.players[id].name);

        //Save player

        this.savePlayer(socket.name, this.players[id]);

        //Remove player entry

        this.players.splice(id, 1);
    }
    catch (err) {
        output.giveError('Could not remove player: ', err);
    }
};

exports.updatePlayers = function()
{
    //Cycle through all players

    for (let p = 0; p < this.players.length; p++) {
        //Regenerate stats if on a protected map

        switch (tiled.getMapType(this.players[p].map)) {
            case 'protected': //Protected -> Regenerate players stats (health, mana, etc.)
                this.regeneratePlayer(p);
                break;
            case 'hostile': //Hostile -> NPCs will attack players within a range
                //...
                break;
        };
    }
};

exports.saveAllPlayers = function(callback)
{
    //Save all players recursively

    let id = -1;

    let cb = () => {
        id++;

        if (id >= game.players.length) {
            //Output

            if (id !== -1)
                output.give('Saved ' + id + ' players.');

            //Execute callback

            if (callback !== undefined)
                callback();
        }
        else
            game.savePlayer(game.players[id].name, game.players[id], cb);
    };

    cb();
};

exports.savePlayer = function(name, data, cb)
{
    let player = data;

    //Check if a new player data must be created

    if (player === undefined)
        player = {
            char_name: properties.playerCharacter,
            map: properties.startingMap,
            pos: { X: 0, Y: 0 },
            moving: false,
            direction: 0,
            health: { cur: 100, max: 100 },
            mana: { cur: 100, max: 100 },
            level: 1,
            stats: {
                exp: 0,
                points: 0,
                attributes: {
                    power: 1,
                    toughness: 1,
                    vitality: 1,
                    agility: 1,
                    intelligence: 1,
                    wisdom: 1
                }
            },
            gvars: {},
            actions: [],
            equipment: {},
            quests: {},
            inventory: properties.playerStartingItems,
            gold: 0
        };

    //Save player data

    storage.save('stats', name, {
        map: player.map,
        char_name: player.char_name,
        pos: player.pos,
        moving: player.moving,
        direction: player.direction,
        health: player.health,
        mana: player.mana,
        gold: player.gold,
        level: player.level,
        stats: player.stats,
        actions: player.actions,
        inventory: player.inventory,
        equipment: player.equipment,
        quests: player.quests,
        gvars: player.gvars
    }, cb);
};

exports.saveUserSettings = function(name, settings)
{
    storage.saveAttributes('accounts', name, {
        settings: settings
    });
};

exports.damagePlayer = function(id, damage)
{
    //Subtract toughness from damage

    damage += this.players[id].attributes.toughness-1;

    if (damage >= 0)
        damage = 0;

    //Add damage

    this.players[id].health.cur += damage;

    //Check if player should die

    if (this.players[id].health.cur <= 0)
    {
        //reset player pos, health and send
        //back to first map

        this.players[id].health.cur = this.players[id].health.max;

        server.syncPlayerPartially(id, 'health');

        if (this.players[id].map !== properties.startingMap)
            this.loadMap(this.players[id].socket, properties.startingMap);

        this.players[id].pos.X = 0;
        this.players[id].pos.Y = 0;

        server.syncPlayerPartially(id, 'position');

        return true;
    }

    //Sync health

    server.syncPlayerPartially(id, 'health');

    //Return false

    return false;
};

exports.healPlayer = function(id, heal)
{
    //Add damage

    this.players[id].health.cur += heal;

    //Check if player health is capped

    if (this.players[id].health.cur > this.players[id].health.max)
        this.players[id].health.cur = this.players[id].health.max;

    //Sync health

    server.syncPlayerPartially(id, 'health');
};

exports.regeneratePlayer = function(id)
{
    //Regenerate health if possible

    if (this.players[id].health.cur < this.players[id].health.max) {
        this.players[id].health.cur++;

        server.syncPlayerPartially(id, 'health');
    };

    //Regenerate mana if possible

    if (this.players[id].mana.cur < this.players[id].mana.max) {
        this.players[id].mana.cur++;

        server.syncPlayerPartially(id, 'mana', this.players[id].socket, false);
    };

    //...
};

exports.deltaManaPlayer = function(id, delta)
{
    //Add delta

    this.players[id].mana.cur += delta;

    //Check if player mana is capped

    if (this.players[id].mana.cur > this.players[id].mana.max)
        this.players[id].mana.cur = this.players[id].mana.max;
    else if (this.players[id].mana.cur < 0)
        this.players[id].mana.cur = 0;

    //Sync mana

    server.syncPlayerPartially(id, 'mana', this.players[id].socket, false);
};

exports.deltaGoldPlayer = function(id, delta)
{
    //Check if possible

    if (this.players[id].gold+delta < 0)
        return false;

    //Add delta

    this.players[id].gold += delta;

    //Sync gold

    server.syncPlayerPartially(id, 'gold', this.players[id].socket, false);

    //Return true

    return true;
};

exports.addPlayerExperience = function(id, exp)
{
    //Add experience

    this.players[id].stats.exp += exp;

    //Check if should level up

    if (this.players[id].stats.exp >= exptable[this.players[id].level-1])
    {
        //Level up and reset xp

        this.players[id].stats.exp = this.players[id].stats.exp-exptable[this.players[id].level-1];
        this.players[id].level++;

        //Give one player point to spend

        this.players[id].stats.points++;

        //Restore health and other stats if possible

        if (this.players[id].health.cur < this.players[id].health.max) {
            this.players[id].health.cur = this.players[id].health.max;

            server.syncPlayerPartially(id, 'health', this.players[id].socket, false);
        }
        if (this.players[id].mana.cur < this.players[id].mana.max) {
            this.players[id].mana.cur = this.players[id].mana.max;

            server.syncPlayerPartially(id, 'mana', this.players[id].socket, false);
        }

        //Sync to map (and player)

        server.syncPlayerPartially(id, 'level');

        //Sync to player

        server.syncPlayerPartially(id, 'points', this.players[id].socket, false);
    }

    //Sync to player

    server.syncPlayerPartially(id, 'exp', this.players[id].socket, false);
};

exports.incrementPlayerAttribute = function(id, attribute)
{
    //Check if player is eligible for an attribute increment

    if (this.players[id].stats.points <= 0)
        return;

    //Check if stat is valid

    if (this.players[id].stats.attributes[attribute] == undefined)
        return;

    //Increment attribute

    this.players[id].stats.attributes[attribute]++;

    //Decrement amount of points

    this.players[id].stats.points--;

    //Calculate new stats and sync

    this.calculatePlayerStats(id, true);

    //Sync new amount of points

    server.syncPlayerPartially(id, 'points', this.players[id].socket, false);
};

exports.calculatePlayerStats = function(id, sync)
{
    //Check if sync is undefined

    if (sync == undefined)
        sync = false;

    //Grab base attributes

    const result = {
        power: this.players[id].stats.attributes.power,
        intelligence: this.players[id].stats.attributes.intelligence,
        toughness: this.players[id].stats.attributes.toughness,
        vitality: this.players[id].stats.attributes.vitality,
        wisdom: this.players[id].stats.attributes.wisdom,
        agility: this.players[id].stats.attributes.agility
    };

    //Add stats based on equipment

    for (let equippable in this.players[id].equipment) {
        if (equippable == undefined ||
            this.players[id].equipment[equippable] == undefined)
            continue;

        let item = items.getItem(this.players[id].equipment[equippable]);

        if (item.stats != undefined) {
            if (item.stats.power > 0)
                result.power += item.stats.power;
            if (item.stats.intelligence > 0)
                result.intelligence += item.stats.intelligence;
            if (item.stats.toughness > 0)
                result.toughness += item.stats.toughness;
            if (item.stats.vitality > 0)
                result.vitality += item.stats.vitality;
            if (item.stats.wisdom > 0)
                result.wisdom += item.stats.wisdom;
            if (item.stats.agility > 0)
                result.agility += item.stats.agility;
        }
    }

    //Set the attributes property

    this.players[id].attributes = result;

    //Handle each attribute accordingly

    //Vitality attribute - max health

    const oldHealth = this.players[id].health.max;
    this.players[id].health.max = 90 + 10 * result.vitality;

    if (this.players[id].health.cur >= this.players[id].health.max)
        this.players[id].health.cur = this.players[id].health.max;

    if (oldHealth !== this.players[id].health.max && sync)
        server.syncPlayerPartially(id, 'health');

    //Wisdom attribute - max mana

    const oldMana = this.players[id].mana.max;
    this.players[id].mana.max = 90 + 10 * result.wisdom;

    if (this.players[id].mana.cur >= this.players[id].mana.max)
        this.players[id].mana.cur = this.players[id].mana.max;

    if (oldMana !== this.players[id].mana.max && sync)
        server.syncPlayerPartially(id, 'mana', this.players[id].socket, false);

    //Sync to player if sync is true

    if (result !== this.players[id].stats.attributes && sync)
        server.syncPlayerPartially(id, 'attributes', this.players[id].socket, false);
};

exports.getPlayerIndex = function(name)
{
    for (let i = 0; i < this.players.length; i++)
        if (this.players[i].name == name)
            return i;

    return -1;
};

exports.sendPlayers = function(socket)
{
    //Check if valid

    if (socket === undefined || socket.name === undefined)
        return;

    //Get player id

    let id = this.getPlayerIndex(socket.name);

    //Check if valid player

    if (id == -1)
        return;

    //Send all players in the same map

    for (let i = 0; i < this.players.length; i++)
            if (i != id && this.players[id].map === this.players[i].map)
                server.syncPlayer(i, socket, false);
}

exports.setPlayerTilePosition = function(socket, id, map, x, y)
{
    //Calculate actual position

    if (x != undefined)
        this.players[id].pos.X = (x-tiled.maps[map].width/2+.5)*tiled.maps[map].tilewidth-game.players[id].character.width/2;

    if (y != undefined)
        this.players[id].pos.Y = (y-tiled.maps[map].height/2)*tiled.maps[map].tileheight-game.players[id].character.height/2;

    //Sync to players on the same map

    server.syncPlayerPartially(id, 'position');
};

exports.setPlayerGlobalVariable = function(id, name, value)
{
    //Set player global variable

    game.players[id].gvars[name] = value;
};

exports.getPlayerGlobalVariable = function(id, name)
{
    //Return player global variable

    return game.players[id].gvars[name];
};

exports.loadMap = function(socket, map)
{
    //Check if valid

    if (socket.name === undefined)
        return;

    //Get map ID

    let map_id = tiled.getMapIndex(map);

    //Check if valid

    if (map_id == -1 || tiled.maps[map_id] === undefined) {
        output.give('Map with name \'' + map + '\' does not exist.');

        return;
    }

    //Get player id

    let id = this.getPlayerIndex(socket.name);

    //Check if valid player

    if (id == -1)
        return;

    //Remove player from others on the
    //same map

    server.removePlayer(id, socket);

    //Leave old room, if it is available

    socket.leave(game.players[id].map_id);

    //Set new map

    this.players[id].map = map;
    this.players[id].map_id = map_id;

    //Join map specific room

    socket.join(map_id);

    //Send the corresponding map

    socket.emit('GAME_MAP_UPDATE', tiled.maps[map_id]);

    //Send player to all players in the same map

    server.syncPlayer(id, socket, true);

    //Send all players in the same map

    this.sendPlayers(socket);

    //Send all NPCs in the same map

    npcs.sendMap(map_id, socket);

    //Send all items in the same map

    items.sendMap(map_id, socket);
};

exports.loadAllCharacters = function(cb)
{
    let location = 'characters';

    fs.readdir(location, (err, files) => {
        let count = 0;

        files.forEach(file => {
            game.characters[file.substr(0, file.lastIndexOf('.'))] = game.loadCharacter(location + '/' + file);

            count++;
        });

        output.give('Loaded ' + count + ' character(s).');

        if (cb !== undefined)
            cb();
    });
};

exports.loadCharacter = function(location)
{
    try {
        return JSON.parse(fs.readFileSync(location, 'utf-8'));
    }
    catch (err)
    {
        output.giveError('Could not load character: ', err);
    }
};

exports.calculateFace = function(pos, width, height, direction)
{
    let point = {
        X: pos.X,
        Y: pos.Y
    };

    //Get supposed pos based on direction

    switch (direction)
    {
        case 0:
            point.Y += height;
            break;
        case 1:
            point.X -= width;
            break;
        case 2:
            point.X += width;
            break;
        case 3:
            point.Y -= height;
            break;
    };

    return point;
};
