import Util from './util.js';
import subways from './subway.js'
const startX = 200;
const startY = 200;
const startDirection = 0;

let secretTextMode = false;

let games = {
    nunchi: {
        gameStarted: false,
        lastNum: 0,
        userChatted: [],
        users: {}
    },
    _369: {
        gameStarted: false,
        lastNum: 1,
        users: [],
        totalUserCount: 0,
    },
    tgod: {
        preparing: false,
        gameStarted: false,
        users: {},
        whoseTurn: '',
        number: null,
        preparedUserCount: 0,
        totalUserCount: 0
    },
    subway: {
        gameStarted: false,
        line: null,
        users: [],
        totalUserCount: 0,
    }
};

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
    if (!wsServerState.userPos[socketID]) return;
    delete wsServerState.userPos[socketID];
};

const nunchiInit = () => {
    games.nunchi.gameStarted = false;
    games.nunchi.lastNum = 0;
    games.nunchi.userChatted = [];
    games.nunchi.users = {};
};

const nunchiControl = (command, socket, wsServer, wsServerState) => {
    if (games.nunchi.gameStarted == true)
        if (command[1] == 'end') {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '게임을 강제 종료합니다.'
            });
            nunchiInit();
        } else
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '이미 게임중입니다.'
            });
    else if (
        wsServerState.users[wsServerState.socketToRoom[socket.id]].length <= 1
    )
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
            nickname: 'SYSTEM',
            text: '게임을 시작할 인원이 부족합니다.'
        });
    else {
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
            nickname: 'SYSTEM',
            text: '눈치게임을 시작합니다.'
        });
        games.nunchi.gameStarted = true;

        Object.keys(wsServerState.userPos).forEach(
            (key) =>
                (games.nunchi.users[
                    wsServerState.userPos[key].nickname
                ] = false)
        );
    }
};

const nunchiLogic = (msg, socket, wsServer, wsServerState) => {
    if (msg.text == games.nunchi.lastNum) {
        // 겹치는 번호
        if (games.nunchi.userChatted[games.nunchi.lastNum]) {
            games.nunchi.userChatted[games.nunchi.lastNum].push(msg.nickname);
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text:
                    games.nunchi.userChatted[games.nunchi.lastNum].join(', ') +
                    ' 당첨!'
            });
            nunchiInit();
        } else {
            // 정상
            games.nunchi.userChatted[games.nunchi.lastNum] = [msg.nickname];
            games.nunchi.lastNum += 1;
            if (games.nunchi.users[msg.nickname]) {
                // 일뻔
                wsServer
                    .in(wsServerState.socketToRoom[socket.id])
                    .emit('getChat', {
                        nickname: 'SYSTEM',
                        text: msg.nickname + ' 당첨!'
                    });
                nunchiInit();
            } else {
                games.nunchi.users[msg.nickname] = true;
                if (
                    games.nunchi.lastNum ==
                    wsServerState.users[wsServerState.socketToRoom[socket.id]]
                        .length -
                        1
                ) {
                    for (var key in games.nunchi.users) {
                        if (games.nunchi.users[key] == false) {
                            wsServer
                                .in(wsServerState.socketToRoom[socket.id])
                                .emit('getChat', {
                                    nickname: 'SYSTEM',
                                    text: key + ' 당첨!'
                                });
                            nunchiInit();
                            break;
                        }
                    }
                }
            }
        }
    } else {
        if (games.nunchi.userChatted[msg.text]) {
            games.nunchi.userChatted[msg.text].push(msg.nickname);
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text:
                    games.nunchi.userChatted[msg.text].join(', ') +
                    ' 둘이 한잔해~'
            });
            nunchiInit();
        } else {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: wsServerState.userPos[socket.id].nickname + ' 당첨!'
            });
            nunchiInit();
        }
    }
};

const _369Init = () => {
    games._369.gameStarted = false;
    games._369.lastNum = 1;
    games._369.users = [];
    games._369.totalUserCount = 0;
};

const _369Control = (command, socket, wsServer, wsServerState) => {
    if (games._369.gameStarted == true)
        if (command[1] == 'end') {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '게임을 강제 종료합니다.'
            });
            _369Init();
        } else
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '이미 게임중입니다.'
            });
    else {
        games._369.gameStarted = true;
        for (var i in wsServerState.userPos) {
            games._369.users.push(wsServerState.userPos[i].nickname);
        }
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
            nickname: 'SYSTEM',
            text: '369게임을 시작합니다.\n순서 : ' + games._369.users.join(', ')
        });
    }
};

const _369Logic = (msg, socket, wsServer, wsServerState) => {
    if (msg.text === _369GetAns(games._369.lastNum)) {
        if (
            games._369.users[
                (games._369.lastNum - 1) % games._369.users.length
            ] == msg.nickname
        ) {
            //정상
            games._369.lastNum += 1;
        } else {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: msg.nickname + ' 당첨!'
            });
            _369Init();
        }
    } else {
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
            nickname: 'SYSTEM',
            text: msg.nickname + ' 당첨!'
        });
        _369Init();
    }
};

const _369GetAns = (number) => {
    var clapcnt = 0;
    if (number / 10 === 3 || number / 10 === 6 || number / 10 === 9) {
        clapcnt += 1;
    }
    if (number % 10 === 3 || number % 10 === 6 || number % 10 === 9) {
        clapcnt += 1;
    }
    if (clapcnt) return '*'.repeat(clapcnt);
    return String(number);
};

const tgodInit = () => {
    games.tgod.preparing = false;
    games.tgod.gameStarted = false;
    games.tgod.users = {};
    games.tgod.whoseTurn = '';
    games.tgod.number = null;
    games.tgod.preparedUserCount = 0;
    games.tgod.totalUserCount = 0;
};

const tgodControl = (command, socket, wsServer, wsServerState) => {
    if (games.tgod.gameStarted == true || games.tgod.preparing == true)
        if (command[1] == 'end') {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '게임을 강제 종료합니다.'
            });
            tgodInit();
        } else
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '이미 게임중입니다.'
            });
    else {
        games.tgod.preparing = true;
        secretTextMode = true;

        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
            nickname: 'SYSTEM',
            text: 'The Game of Death 게임을 시작합니다. 잠시 서로의 채팅이 안보이게 됩니다. 지목할 상대의 닉네임을 적어주세요.'
        });

        games.tgod.whoseTurn = wsServerState.userPos[socket.id].nickname;
        games.tgod.totalUserCount =
            wsServerState.users[wsServerState.socketToRoom[socket.id]].length;

        Object.keys(wsServerState.userPos).forEach(
            (key) =>
                (games.tgod.users[wsServerState.userPos[key].nickname] = null)
        );
    }
};

const tgodLogic = (msg, socket, wsServer, wsServerState) => {
    if (games.tgod.preparing === true) {
        if (games.tgod.users[msg.nickname] != null) {
            wsServer.to(socket.id).emit('getChat', {
                nickname: 'SYSTEM',
                text: '이미 지목했습니다.'
            });
        } else if (!(msg.text in games.tgod.users)) {
            wsServer.to(socket.id).emit('getChat', {
                nickname: 'SYSTEM',
                text: '없는 사용자입니다.'
            });
        } else {
            games.tgod.users[msg.nickname] = msg.text;
            games.tgod.preparedUserCount += 1;
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text:
                    '지목 완료. (' +
                    games.tgod.preparedUserCount +
                    '/' +
                    games.tgod.totalUserCount +
                    ')'
            });

            if (games.tgod.preparedUserCount === games.tgod.totalUserCount) {
                games.tgod.preparing = false;
                games.tgod.gameStarted = true;

                wsServer
                    .in(wsServerState.socketToRoom[socket.id])
                    .emit('getChat', {
                        nickname: 'SYSTEM',
                        text: '지목이 완료되었습니다. 게임을 시작한 플레이어는 숫자를 입력해주세요 (0~999)'
                    });
            }
        }
    } else if (games.tgod.gameStarted === true) {
        if (games.tgod.whoseTurn !== msg.nickname) {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '게임을 시작한 플레이어가 입력해주세요.'
            });
        } else {
            const parsed = parseInt(msg.text, 10);
            if (isNaN(parsed) || parsed <= 0 || parsed > 999) {
                wsServer
                    .in(wsServerState.socketToRoom[socket.id])
                    .emit('getChat', {
                        nickname: 'SYSTEM',
                        text: '숫자를 다시 입력해주세요. (0~999)'
                    });
            } else {
                games.tgod.number = parsed;

                wsServer
                    .in(wsServerState.socketToRoom[socket.id])
                    .emit('getChat', {
                        nickname: 'SYSTEM',
                        text: '[결과]'
                    });

                for (; games.tgod.number > 0; ) {
                    wsServer
                        .in(wsServerState.socketToRoom[socket.id])
                        .emit('getChat', {
                            nickname: 'SYSTEM',
                            text:
                                games.tgod.whoseTurn +
                                '->' +
                                games.tgod.users[games.tgod.whoseTurn]
                        });
                    games.tgod.whoseTurn =
                        games.tgod.users[games.tgod.whoseTurn];
                    games.tgod.number -= 1;
                }

                wsServer
                    .in(wsServerState.socketToRoom[socket.id])
                    .emit('getChat', {
                        nickname: 'SYSTEM',
                        text: games.tgod.whoseTurn + ' 당첨!'
                    });
                tgodInit();
            }
        }
    }
};

const subwayInit = () => {
    gameStarted = false;
    line = null;
    users = [];
}

const subwayControl = (command, socket, wsServer, wsServerState) => {
    if (games.subway.gameStarted == true)
        if (command[1] == 'end') {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '게임을 강제 종료합니다.'
            });
            subwayInit();
        } else
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '이미 게임중입니다.'
            });
    else {
        games.subway.gameStarted = true;
        for (var i in wsServerState.userPos) {
            games.subway.users.push(wsServerState.userPos[i].nickname);
        }
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
            nickname: 'SYSTEM',
            text: '지하철 게임을 시작합니다.\n순서 : ' + games.subway.users.join(', ')
        });
    }
}

// const subwayLogic(msg, socket, wsServer, wsServerState) => {
//     wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
//         nickname: 'SYSTEM',
//         text: '지하철 게임을 시작합니다.\n순서 : ' + games.subway.users.join(', ')
//     });
//     if (GetAns(games._369.lastNum)) {
//         if (
//             games._369.users[
//                 (games._369.lastNum - 1) % games._369.users.length
//             ] == msg.nickname
//         ) {
//             //정상
//             games._369.lastNum += 1;
//         } else {
//             wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
//                 nickname: 'SYSTEM',
//                 text: msg.nickname + ' 당첨!'
//             });
//             _369Init();
//         }
//     } else {
//         wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
//             nickname: 'SYSTEM',
//             text: msg.nickname + ' 당첨!'
//         });
//         _369Init();
//     }
// }

export function wsService(wsServer, socket, wsServerState) {
    socket.on('joinRoom', (data) => {
        try {
            let allUsers = Util.getOtherUsersInRoom(
                data.id,
                data.roomID,
                wsServerState
            );

            wsServerState.userPos[socket.id] = {
                id: data.id,
                nickname: data.nickname,
                roomID: data.roomID,
                characterType: data.characterType,
                x: startX,
                y: startY,
                direction: startDirection
            };

            wsServer.to(socket.id).emit('allUsers', {
                users: allUsers,
                userPos: wsServerState.userPos
            });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('playerMovement', (playerMovement) => {
        const player = wsServerState.userPos[socket.id];
        if (!player) {
            // console.log('no such player : ', socket.id);
        } else {
            player['x'] = playerMovement.x;
            player['y'] = playerMovement.y;
            player['direction'] = playerMovement.direction; // up 3 down 0 left 1 right 2
        }

        // console.log("update Players Movement like : " , wsServerState.userPos);
        wsServer.emit('updatePlayersMovement', {
            userPos: wsServerState.userPos
        });
    });

    socket.on('sendChat', (msg) => {
        // chats.push(message);
        if (!secretTextMode)
            wsServer
                .in(wsServerState.socketToRoom[socket.id])
                .emit('getChat', msg);
        else wsServer.to(socket.id).emit('getChat', msg);

        if (msg.text && msg.text.charAt(0) == '/') {
            let command = msg.text.substring(1).split(' ');

            if (command[0] == 'nunchi') {
                nunchiControl(command, socket, wsServer, wsServerState);
            } else if (command[0] == '딸기당근') {

            } else if (command[0] == '369') {
                _369Control(command, socket, wsServer, wsServerState);
            } else if (command[0] == 'tgod') {
                tgodControl(command, socket, wsServer, wsServerState);
            }
        } else if (games.nunchi.gameStarted == true) {
            nunchiLogic(msg, socket, wsServer, wsServerState);
        } else if (games._369.gameStarted == true) {
            _369Logic(msg, socket, wsServer, wsServerState);
        } else if (
            games.tgod.preparing == true ||
            games.tgod.gameStarted == true
        ) {
            tgodLogic(msg, socket, wsServer, wsServerState);
        }
    });
}

export function disconnect(socket, roomID, wsServerState) {
    deleteUser(socket.id, roomID, wsServerState);
    deleteUserPos(socket.id, wsServerState);
    socket.broadcast.to(roomID).emit('userExit', { id: socket.id });
}
