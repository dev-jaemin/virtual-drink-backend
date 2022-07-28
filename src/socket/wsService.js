import Util from './util.js';
import subways from './subwayData.js';
const startX = 100;
const startY = 100;
const startDirection = 0;

let secretTextMode = false;
let bgmNick = '';
var k = 0;

let games = {
    nunchi: {
        gameStarted: false,
        lastNum: 1,
        userChatted: [],
        users: {}
    },
    _369: {
        gameStarted: false,
        lastNum: 1,
        users: [],
        totalUserCount: 0
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
        lastNum: 1,
        users: [],
        totalUserCount: 0,
        startUser: null,
        stationCheck: {}
    }
};

const randomBgmEmit = (nick, socket, wsServer, wsServerState) => {
    let rand = Math.floor(Math.random() * 2); // 0~1
    bgmNick = (' ' + nick).slice(1);

    if(rand == 0){    
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
            nickname: 'SYSTEM',
            text: '누가 술을 마셔~'
        });
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: bgmNick + '이(가) 마셔~'
            });
        }, 1000);
        setTimeout(() => {
            k = 0;
            for (var i = 0; i < bgmNick.length; i += 1) {
                setTimeout(() => {
                    wsServer
                        .in(wsServerState.socketToRoom[socket.id])
                        .emit('getChat', {
                            nickname: 'SYSTEM',
                            text: bgmNick.charAt(k)
                        });
                    k += 1;
                }, Math.floor((3000 / bgmNick.length) * i));
            }
        }, 2000);
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '원~샷!'
            });
        }, 5000);
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '투~샷!'
            });
        }, 6000);
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: 'THREE~샷!'
            });
        }, 7000);
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '치키치키 예!'
            });
        }, 8000);
    } else if(rand == 1){
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
            nickname: 'SYSTEM',
            text: bgmNick + '당첨!'
        });
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '싶었어~'
            });
        }, 500);
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '싶었어~'
            });
        }, 1000);
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '마시고 싶었어~'
            });
        }, 1500);
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '고팠어~'
            });
        }, 2500);
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '고팠어~'
            });
        }, 3000);
        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '술이 고팠어~'
            });
        }, 3500);
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
    games.nunchi.lastNum = 1;
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
        wsServerState.users[wsServerState.socketToRoom[socket.id]] &&
        wsServerState.users[wsServerState.socketToRoom[socket.id]] <= 1
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
            randomBgmEmit(
                games.nunchi.userChatted[games.nunchi.lastNum].join(', '),
                socket,
                wsServer,
                wsServerState
            );

            nunchiInit();
        } else {
            // 정상
            games.nunchi.userChatted[games.nunchi.lastNum] = [msg.nickname];
            games.nunchi.lastNum += 1;
            if (games.nunchi.users[msg.nickname]) {
                // 일뻔

                randomBgmEmit(msg.nickname, socket, wsServer, wsServerState);
                nunchiInit();
            } else {
                games.nunchi.users[msg.nickname] = true;
                if (
                    games.nunchi.lastNum ==
                    wsServerState.users[wsServerState.socketToRoom[socket.id]]
                        .length
                ) {
                    for (var key in games.nunchi.users) {
                        if (games.nunchi.users[key] == false) {
                            randomBgmEmit(key, socket, wsServer, wsServerState);
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
            randomBgmEmit(
                wsServerState.userPos[socket.id].nickname,
                socket,
                wsServer,
                wsServerState
            );
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
            randomBgmEmit(msg.nickname, socket, wsServer, wsServerState);
            _369Init();
        }
    } else {
        randomBgmEmit(msg.nickname, socket, wsServer, wsServerState);
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

    secretTextMode = false;
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
            text: '아 신난다~ 아 재미난다~ 더 게임 오브 데스~!!'
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

                randomBgmEmit(
                    games.tgod.whoseTurn,
                    socket,
                    wsServer,
                    wsServerState
                );
                tgodInit();
            }
        }
    }
};

const subwayInit = () => {
    games.subway.gameStarted = false;
    games.subway.line = null;
    games.subway.lastNum = 1;
    games.subway.users = [];
    games.subway.totalUserCount = 0;
    games.subway.startUser = null;
    games.subway.stationCheck = {};
};

const subwayControl = (command, socket, wsServer, wsServerState) => {
    if (games.subway.gameStarted === true)
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

        games.subway.startUser = wsServerState.userPos[socket.id].nickname;
        games.subway.users.push(games.subway.startUser);

        for (var i in wsServerState.userPos) {
            if (games.subway.startUser !== wsServerState.userPos[i].nickname) {
                games.subway.users.push(wsServerState.userPos[i].nickname);
            }
        }
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
            nickname: 'SYSTEM',
            text: '지하철~~ 지하철~~ 지하철~~ 지하철~~'
        });

        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '순서 : ' + games.subway.users.join(', ')
            });
        }, 1000);

        setTimeout(() => {
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '몇 호선?? 몇 호선?? (1~9 사이의 숫자를 입력해주세요)'
            });
        }, 2000);
    }
};

const subwayLogic = (msg, socket, wsServer, wsServerState) => {
    if (games.subway.line === null) {
        if (games.subway.startUser !== msg.nickname) {
            console.log(games.subway.startUser, msg.nickname);
            wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                nickname: 'SYSTEM',
                text: '게임을 시작한 플레이어가 입력해주세요.'
            });
        } else {
            const parsed = parseInt(msg.text, 10);
            if (isNaN(parsed) || parsed < 1 || parsed > 9) {
                wsServer
                    .in(wsServerState.socketToRoom[socket.id])
                    .emit('getChat', {
                        nickname: 'SYSTEM',
                        text: '숫자를 다시 입력해주세요. (1~9)'
                    });
            } else {
                games.subway.line = parsed;

                wsServer
                    .in(wsServerState.socketToRoom[socket.id])
                    .emit('getChat', {
                        nickname: 'SYSTEM',
                        text:
                            games.subway.line +
                            '호선~~ ' +
                            games.subway.line +
                            '호선~~ ' +
                            games.subway.line +
                            '호선~~ ' +
                            games.subway.line +
                            '호선~~ '
                    });

                subways[games.subway.line].forEach(
                    (station) => (games.subway.stationCheck[station] = false)
                );
                // console.log(games.subway.stationCheck);
            }
        }
    } else {
        if (
            msg.nickname !==
                games.subway.users[
                    (games.subway.lastNum - 1) % games.subway.users.length
                ] ||
            !(msg.text in games.subway.stationCheck) ||
            games.subway.stationCheck[msg.text]
        ) {
            randomBgmEmit(msg.nickname, socket, wsServer, wsServerState);
            subwayInit();
        } else {
            games.subway.stationCheck[msg.text] = true;
            games.subway.lastNum += 1;
        }
    }
};

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
            } else if (command[0] == 'subway') {
                subwayControl(command, socket, wsServer, wsServerState);
            } else if (command[0] == 'help') {
                wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                    nickname: 'SYSTEM',
                    text: '[게임 목록]'
                });
                wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                    nickname: 'SYSTEM',
                    text: '> The Game of Death : [/tgod]'
                });
                wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                    nickname: 'SYSTEM',
                    text: '> 눈치 게임 : [/nunchi]'
                });
                wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                    nickname: 'SYSTEM',
                    text: '> 지하철 게임 : [/subway]'
                });
                wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {
                    nickname: 'SYSTEM',
                    text: '> 369 게임 : [/369]'
                });
            }
        } else if (games.nunchi.gameStarted === true) {
            nunchiLogic(msg, socket, wsServer, wsServerState);
        } else if (games._369.gameStarted === true) {
            _369Logic(msg, socket, wsServer, wsServerState);
        } else if (
            games.tgod.preparing === true ||
            games.tgod.gameStarted === true
        ) {
            tgodLogic(msg, socket, wsServer, wsServerState);
        } else if (games.subway.gameStarted === true) {
            subwayLogic(msg, socket, wsServer, wsServerState);
        }
    });
}

export function disconnect(socket, roomID, wsServerState) {
    deleteUser(socket.id, roomID, wsServerState);
    deleteUserPos(socket.id, wsServerState);
    socket.broadcast.to(roomID).emit('userExit', { id: socket.id });
}
