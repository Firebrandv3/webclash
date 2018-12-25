const player = {
    instantiate: function(name) {
        let go = new lx.GameObject(undefined, 0, 0, 0, 0);
        
        go.SetTopDownController(.25, .25, 0)
          .Loops(player.update)
          .Focus();
        
        go.name = name;
        go._direction = 0;
        go._moving = false;
        
        game.players.push(go.Show(3));  
    },
    setCollider: function(collider) {
        game.players[game.player].ApplyCollider(
            new lx.Collider(
                collider.x, 
                collider.y, 
                collider.width, 
                collider.height, 
                false
            )
        );  
    },
    update: function() {
        if (this.MaxVelocity() == 0)
            this.MaxVelocity((this.Size().W+this.Size().H)/50);
        
        if (this.MOVEMENT.VX != 0 || this.MOVEMENT.VY != 0) {
            var oldDir = this._direction;
            
            if (this.MOVEMENT.VX < 0)
                this._direction = 1;
            else if (this.MOVEMENT.VX > 0)
                this._direction = 2;
            else if (this.MOVEMENT.VY > 0)
                this._direction = 0;
            else if (this.MOVEMENT.VY < 0)
                this._direction = 3;   
            
            if (oldDir != this._direction)
                player.sync('direction');
            
            if (!game.players[game.player]._moving) {
                game.players[game.player]._moving = true;
                
                player.sync('moving');
            }
            
            player.sync('position');
        } else {         
            if (game.players[game.player]._moving) {
                game.players[game.player]._moving = false;
                
                player.sync('moving');
            }
        }
        
        animation.animateMoving(this);
    },
    sync: function(type)
    {
        let data = {};
        
        switch(type)
        {
            case 'moving':
                data.moving = game.players[game.player]._moving;
                break;
            case 'position':
                data.pos = game.players[game.player].Position();
                break;
            case 'direction':
                data.direction = game.players[game.player]._direction;
                break;
        }
        
        socket.emit('CLIENT_PLAYER_UPDATE', data);
    }
};