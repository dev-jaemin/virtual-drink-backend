

export default (wsServer, socket, wsServerState) => {
    socket.on('playerMovement', (playerMovement) => {
        const player = wsServerState.userPos[socket.id];
        if(!player) {
            console.log("no such player : ", socket.id);
        } else{
            player['x'] = playerMovement.x;
            player['y'] = playerMovement.y;
            player['direction'] = playerMovement.direction; // up 3 down 0 left 1 right 2
        }
        
        // console.log("update Players Movement like : " , wsServerState.userPos);
        wsServer
            .emit('updatePlayersMovement', {
                userPos : wsServerState.userPos
            });
    });

    socket.on('sendChat', (msg) => {
        // let message = socket.nickname + ': ' + msg;
        // chats.push(message);
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', msg);
    });
};


