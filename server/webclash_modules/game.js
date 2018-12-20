exports.players = [];

exports.addPlayer = function(socket)
{
    //Check if socket is valid
    
    if (socket.name == undefined)
        return;
    
    //Grab player stats
    
    let player = databases.stats(socket.name).object();
    player.name = socket.name;
    
    //Add player
    
    this.players.push(player);
    
    //Sync across server
    
    server.syncPlayer(this.players.length-1, socket, true);
    
    //Sync to player
    
    server.syncPlayer(this.players.length-1, socket, false);
};

exports.removePlayer = function(socket)
{
    //Check if socket is valid
    
    if (socket === undefined || socket.name === undefined)
        return;
    
    //Cycle through all players
    
    for (let i = 0; i < this.players.length; i++)
        if (this.players[i].name == socket.name) {
            this.players.splice(i, 1);
            
            break;
        }
    
    //Notify others
    
    server.removePlayer(this.players.length-1, socket);
};

exports.getPlayerIndex = function(name)
{
    for (let i = 0; i < this.players.length; i++)
        if (this.players[i].name == name)
            return i;
    
    return -1;
}