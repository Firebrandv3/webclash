exports.handleSocket = function(socket)
{
    //If the connected socket is not playing,
    //send to the landing page (login)
    
    if (socket.playing == undefined || !socket.playing)
        socket.emit('REQUEST_LANDING');
    
    //Send client name
    
    socket.emit('UPDATE_CLIENT_NAME', properties.clientName);
    
    //Disconnect event listener
    
    socket.on('disconnect', function() {
        if (socket.playing) {
            //Remove player
            
            game.removePlayer(socket);
            
            //Output
            
            output.give('User \'' + socket.name + '\' has logged out.');
        }
    });
    
    //Socket event listeners
    
    socket.on('CLIENT_LOGIN', function(data, callback) {
        //Check if valid package
        
        if (data === undefined || data.name === undefined)
            return;
        
        //Grab entry with username
        
        let pass = databases.accounts(data.name).get('pass', undefined);
        
        //Check if username exists
        
        if (pass === undefined)
        {
            callback('none');
            return;
        }
        
        //Check if password matches
        
        if (pass != data.pass)
        {
            callback('wrong');
            return;
        }
        
        //Check if already logged in
        
        if (socket.playing)
        {
            callback('loggedin');
            return;
        }
        
        //Output
        
        output.give('User \'' + data.name + '\' has logged in.');
        
        //Set variables
        
        socket.name = data.name;
        
        //Request game page
        
        socket.emit('REQUEST_GAME');
    });
    
    socket.on('CLIENT_REGISTER', function(data, callback) {
        //Check if valid package
        
        if (data === undefined || data.name === undefined)
            return;
        
        //Check if account already exists
        
        if (databases.accounts(data.name).has('pass'))
        {
            callback('taken');
            return;
        }
        
        //Insert account
        
        databases.accounts(data.name).set('pass', data.pass);
        
        //Insert default stats
        
        databases.stats(data.name).set('map', 0);
        databases.stats(data.name).set('pos', { X: 0, Y: 0 });
        databases.stats(data.name).set('movement', { VX: 0, VY: 0 });
        databases.stats(data.name).set('direction', 0);
        databases.stats(data.name).set('char_name', 'player');

        //Save databases
        
        databases.accounts.save();
        databases.stats.save();
        
        //Ouput
        
        output.give('New user \'' + data.name + '\' created.');
        
        //Set variables
        
        socket.name = data.name;
        
        //Request game page
        
        socket.emit('REQUEST_GAME');
    });
    
    socket.on('CLIENT_JOIN_GAME', function() {
        //Check if client is already playing
        
        if (socket.playing != undefined && socket.playing)
            return;
        
        //Send standard data

        for (let i = 0; i < game.players.length; i++)
            server.syncPlayer(i, socket, false);
        
        //Add client as player
        
        game.addPlayer(socket);

        //Set playing

        socket.playing = true;
    });
    
    socket.on('CLIENT_PLAYER_UPDATE', function(data) {
        //Check if valid player
        
        if (socket.playing === undefined || !socket.playing)
            return;
        
        //Get player id
        
        let id = game.getPlayerIndex(socket.name);
        
        //Check if valid player id
        
        if (id == -1)
            return;
        
        //Check data
        
        let type = '';
        
        if (data.movement !== undefined) {
            game.players[id].movement = data.movement;
            type = 'movement';
        }
        if (data.pos !== undefined) {
            game.players[id].pos = data.pos;
            return;
        }
        
        //Sync across all
        
        if (type.length > 0)
            server.syncPlayerPartially(id, type, socket, true);
    });
};

//Sync player partially function, if socket is undefined it will be globally emitted

exports.syncPlayerPartially = function(id, type, socket, broadcast)
{
    let data = {
        name: game.players[id].name
    };

    switch (type)
    {
        case 'position':
            data.pos = game.players[id].pos;
            break;
        case 'movement':
            data.movement = game.players[id].movement;
            break;
        case 'direction':
            data.direction = game.players[id].direction;
            break;
        case 'character':
            data.character = game.players[id].character;
            break;
    }
    
    if (socket === undefined) 
        io.sockets.emit('GAME_PLAYER_UPDATE', data);
    else {
        if (broadcast === undefined || !broadcast) {
            if (socket.name == data.name)
                data.isPlayer = true;
            
            socket.emit('GAME_PLAYER_UPDATE', data);
        }
        else
            socket.broadcast.emit('GAME_PLAYER_UPDATE', data);
    }
};

//Sync whole player function, if socket is undefined it will be globally emitted

exports.syncPlayer = function(id, socket, broadcast)
{
    this.syncPlayerPartially(id, 'position', socket, broadcast);
    this.syncPlayerPartially(id, 'movement', socket, broadcast);
    this.syncPlayerPartially(id, 'direction', socket, broadcast);
    this.syncPlayerPartially(id, 'character', socket, broadcast);
};

//Sync player remove function, will be broadcast by default

exports.removePlayer = function(id, socket)
{
    //Check if valid
    
    if (socket === undefined || socket.name === undefined)
        return;
    
    //Broadcast player removal
    
    socket.broadcast.emit('GAME_PLAYER_UPDATE', { name: socket.name, remove: true });
}