
export default {
    getOtherUsersInRoom : (socketID, roomID, wsServerState) => {
        let allUsers = [];

        if (!wsServerState.users[roomID] || wsServerState.users[roomID].length <= 1) return allUsers;
        allUsers = wsServerState.users[roomID]
            .filter((user) => user.id !== socketID)
            .map((otherUser) => ({ id: otherUser.id }));

        return allUsers;
    },

    isIncluded : (array, id) => array.some((item) => item.id === id),

    sendSysChat : (socket, wsServer, wsServerState) => {
        wsServer.in(wsServerState.socketToRoom[socket.id]).emit('getChat', {nickname: 'SYSTEM', text: "[!]"+wsServerState.userPos[socket.id].nickname+' 당첨!'});
    }
}

