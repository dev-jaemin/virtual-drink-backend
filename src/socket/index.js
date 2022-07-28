import { wsService, disconnect as wsServiceDisconnect } from './wsService.js';
import { webRTC, disconnect as webRTCDisconnect } from './webRTC.js';

let wsServerState = {
    receiverPCs: {},
    senderPCs: {},
    users: {},
    socketToRoom: {},
    userPos: {},
    chats: []
};

export default (wsServer, socket) => {
    socket.on('disconnect', () => {
        try {
            let roomID = wsServerState.socketToRoom[socket.id];

            webRTCDisconnect(socket, wsServerState);
            wsServiceDisconnect(socket, roomID, wsServerState);
        } catch (error) {
            console.log(error);
        }
    });

    webRTC(wsServer, socket, wsServerState);
    wsService(wsServer, socket, wsServerState);
};
