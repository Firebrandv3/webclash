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
    }, 1000/60);
    
    //Start real time loop
    
    setInterval(function() {
        //Update world items
        
        items.updateMaps();
    }, 1000);
};

exports.savePermissions = function () 
{
    fs.writeFile('permissions.json', JSON.stringify(permissions, null, 1), 'utf8');
};

exports.addPlayer = function(socket)
{
    //Check if socket is valid
    
    if (socket.name === undefined)
        return;
    
    try {
        //Grab player stats and continue

        storage.load('stats', socket.name, function(player) {
            player.name = socket.name;
            player.character = game.characters[player.char_name];
            player.socket = socket;

            //Add player

            let id = game.players.length;
            game.players[id] = player;
            
            //Load current world

            game.loadMap(socket, player.map); 

            //Sync across server

            server.syncPlayer(id, socket, true);

            //Sync to player

            server.syncPlayer(id, socket, false);
            
            //Sync partial stats
            
            server.syncPlayerPartially(id, 'stats', socket, false);
            server.syncPlayerPartially(id, 'health', socket, false);  
            server.syncPlayerPartially(id, 'actions', socket, false);
            
            //Sync inventory
            for (let i = 0; i < game.players[id].inventory.length; i++)
                if (game.players[id].inventory[i] !== undefined)
                    server.syncInventoryItem(i, id, socket, false);
            
            //Sync equipment
            for (let equipment in game.players[id].equipment) {
                if (equipment !== undefined)
                    server.syncEquipmentItem(equipment, id, socket, false);
            };
            
            //Sync equipment to others
            
            server.syncPlayerPartially(id, 'equipment', socket, true);
        });
    }
    catch (err) {
        output.give('Could not add player: ' + err);
    }
};

exports.removePlayer = function(socket)
{
    //Check if socket is valid
    
    if (socket === undefined || socket.name === undefined)
        return;
    
    //Cycle through all players
    
    for (let i = 0; i < this.players.length; i++)
        if (this.players[i].name == socket.name) {
            //Remove from clients
            
            server.removePlayer(i, socket);
            
            //Release owned world items
            
            items.releaseWorldItemsFromOwner(tiled.getMapIndex(this.players[i].map), this.players[i].name);
            
            //Save player
            
            this.savePlayer(socket.name, this.players[i]);
            
            //Remove player entry
            
            this.players.splice(i, 1);
            
            break;
        }
};

exports.savePlayer = function(name, data, cb)
{
    let player = data;
    
    //Check if a new player data must be created
    if (player === undefined)
        player = {
            char_name: 'player',
            map: properties.startingMap,
            pos: { X: 0, Y: 0 },
            moving: false,
            direction: 0,
            health: { cur: 100, max: 100 },
            level: 1,
            stats: {
                exp: 0,
                attributes: {
                    power: 1,
                    toughness: 1,
                    vitality: 1,
                    agility: 1,
                    intelligence: 1,
                    wisdom: 1
                }
            },
            actions: [],
            equipment: {},
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
        level: player.level,
        stats: player.stats,
        actions: player.actions,
        inventory: player.inventory,
        equipment: player.equipment
    }, cb);
}

exports.damagePlayer = function(id, damage)
{
    //Add damage
    
    this.players[id].health.cur += damage;
    
    //Check if player should die
    
    if (this.players[id].health.cur <= 0)
    {
        //reset player pos, health and send
        //back to first map
        
        this.players[id].health.cur = this.players[id].health.max;
        
        server.syncPlayerPartially(id, 'health');
        
        this.players[id].pos.X = 0;
        this.players[id].pos.Y = 0;
        
        server.syncPlayerPartially(id, 'position');
         
        this.loadMap(this.players[id].socket, tiled.maps[0].name);
        
        return;
    }
    
    //Sync health

    server.syncPlayerPartially(id, 'health');
};

exports.addPlayerExperience = function(id, exp)
{
    //Add experience
    
    this.players[id].stats.exp += exp;
    
    //Check if should level up
    
    if (this.players[id].stats.exp >= exptable[this.players[id].level-1])
    {
        this.players[id].level++;
        this.players[id].stats.exp = 0;
    }
    
    //Sync to map
    
    server.syncPlayerPartially(id, 'level');
    
    //Sync to player
    
    server.syncPlayerPartially(id, 'stats', this.players[id].socket, false);
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
            if (i != id && this.players[id].map == this.players[i].map) 
                server.syncPlayer(i, socket, false);
}

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
    
    //Get player ID
    
    let id = this.getPlayerIndex(socket.name);
    if (id == -1)
        return;
    
    //Remove player from others on the
    //same map
    
    server.removePlayer(id, socket);
    
    //Leave old room, if it is available
    
    socket.leave(tiled.getMapIndex(game.players[id].map));
    
    //Set new map
    
    this.players[id].map = map;
    
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
        output.give(err);
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