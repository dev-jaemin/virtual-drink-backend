import Util from "./util.js";


const startX = 200;
const startY = 200;
const startDirection = 0;

let games = {
    nunchi : {
        gameStarted : false,
        lastNum : 0,
        userChatted : [],
        users : {},
    }
}

const deleteUser = (socketID, roomID, wsServerState) => {
    if (!wsServerState.users[roomID]) return;
    wsServerState.users[roomID] = wsServerState.users[roomID].filter(
        (user) => user.id !== socketID
    );
    if (wsServerState.users[roomID].length === 0) {
        delete wsServerState.users[roomID];
    }
    delete wsServerState.socketToRoom[socketID];
};

const deleteUserPos = (socketID, wsServerState) => {
    if(!wsServerState.userPos[socketID]) return;
    delete wsServerState.userPos[socketID];
};

const nunchiInit = () => {
    games.nunchi.gameStarted = false;
    games.nunchi.lastNum = 0;
    games.nunchi.userChatted = [];
    games.nunchi.users = {};
}

const nunchiControl = (socket, wsServer, wsServerState) => {
    if( games.nunchi.gameStarted == true )
        if(command[1] == 'end'){
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {nickname: 'SYSTEM', text: '게임을 강제 종료합니다.'});
            nunchiInit();
        }
        else wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {nickname: 'SYSTEM', text: '이미 게임중입니다.'});
    else if( wsServerState.users[wsServerState.socketToRoom[socket.id]].length <= 1 )
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {nickname: 'SYSTEM', text: '게임을 시작할 인원이 부족합니다.'});
    else{
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {nickname: 'SYSTEM', text: '눈치게임을 시작합니다.'});
        games.nunchi.gameStarted = true;

        Object.keys(wsServerState.userPos).forEach((key) => (games.nunchi.users[wsServerState.userPos[key].nickname] = false));
    }
}

const nunchiLogic = (socket, wsServer, wsServerState) => {
    if(msg.text == games.nunchi.lastNum){ // 겹치는 번호
        if(games.nunchi.userChatted[games.nunchi.lastNum]){
            games.nunchi.userChatted[games.nunchi.lastNum].push(wsServerState.userPos[socket.id].nickname);
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {nickname: 'SYSTEM', text: "[!]"+games.nunchi.userChatted[games.nunchi.lastNum].join(', ')+' 당첨!'});
            nunchiInit();
        }
        else{ // 정상
            games.nunchi.userChatted[games.nunchi.lastNum] = [wsServerState.userPos[socket.id].nickname];
            games.nunchi.lastNum += 1;
            if (games.nunchi.users[wsServerState.userPos[socket.id].nickname]){
                wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {nickname: 'SYSTEM', text: "[!]"+wsServerState.userPos[socket.id].nickname+' 당첨!'});
                nunchiInit();
            }
            else {
                games.nunchi.users[wsServerState.userPos[socket.id].nickname] = true;
                if (games.nunchi.lastNum == wsServerState.users[wsServerState.socketToRoom[socket.id]].length - 1 ){
                    for(var key in games.nunchi.users){
                        if(games.nunchi.users[key] == false){
                            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {nickname: 'SYSTEM', text: "[!]"+key+' 당첨!'});
                            nunchiInit();
                            break;
                        }
                    }
                }
            }
        }
    } else{
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {nickname: 'SYSTEM', text: "[!]"+wsServerState.userPos[socket.id].nickname+' 당첨!'});
        nunchiInit();
    }
}

export function wsService (wsServer, socket, wsServerState) {
    socket.on('joinRoom', (data) => {
        try {
            let allUsers = Util.getOtherUsersInRoom(data.id, data.roomID, wsServerState);

            wsServerState.userPos[socket.id] = {
                id : data.id,
                nickname : data.nickname,
                roomID : data.roomID,
                characterType : data.characterType,
                x : startX,
                y : startY,
                direction : startDirection,
            }
            
            wsServer.to(socket.id).emit('allUsers', { users: allUsers, userPos: wsServerState.userPos });

        } catch (error) {
            console.log(error);
        }
    });
    
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
        // chats.push(message);
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', msg);

        if(msg.text && msg.text.charAt(0)=='/'){
            let command = msg.text.substring(1).split(' ');

            if(command[0] == 'nunchi' && command.length == 1){
                nunchiControl(socket, wsServer, wsServerState);
            }
        }
        else if(games.nunchi.gameStarted == true){
            nunchiLogic(socket, wsServer, wsServerState);
        }
    });
};

export function disconnect(socket, roomID, wsServerState){
    deleteUser(socket.id, roomID, wsServerState);
    deleteUserPos(socket.id, wsServerState);
    socket.broadcast.to(roomID).emit('userExit', { id: socket.id });
}