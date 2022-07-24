import wrtc from 'wrtc';

let receiverPCs = {};
let senderPCs = {};
let users = {};
let socketToRoom = {};

const pc_config = {
    iceServers: [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
        {
            urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
                "stun:stun4.l.google.com:19302",
              ],
        }
    ]
};

const isIncluded = (array, id) => array.some((item) => item.id === id);

const createReceiverPeerConnection = (socketID, socket, roomID) => {
    const pc = new wrtc.RTCPeerConnection(pc_config);

    if (receiverPCs[socketID]) receiverPCs[socketID] = pc;
    else receiverPCs = { ...receiverPCs, [socketID]: pc };

    pc.onicecandidate = (e) => {
        //console.log(`socketID: ${socketID}'s receiverPeerConnection icecandidate`);
        
        if(e.candidate !== null){
            socket.to(socketID).emit('getSenderCandidate', {
                candidate: e.candidate
            });
        }
    };

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    };

    pc.ontrack = (e) => {
        if (users[roomID]) {
            if (!isIncluded(users[roomID], socketID)) {
                users[roomID].push({
                    id: socketID,
                    stream: e.streams[0]
                });
            } else return;
        } else {
            users[roomID] = [
                {
                    id: socketID,
                    stream: e.streams[0]
                }
            ];
        }
        socket.to(roomID).emit('userEnter', { id: socketID });
    };

    return pc;
};

const createSenderPeerConnection = (
    receiverSocketID,
    senderSocketID,
    socket,
    roomID
) => {
    const pc = new wrtc.RTCPeerConnection(pc_config);

    if (senderPCs[senderSocketID]) { // senderPCs 바꿔버리는 쪽으로 업데이트
        senderPCs[senderSocketID] = senderPCs[senderSocketID].filter(
            (user) => user.id !== receiverSocketID
        );
        senderPCs[senderSocketID].push({ id: receiverSocketID, pc: pc });
    } else
        // senderPCs = {
        //     ...senderPCs,
        //     [senderSocketID]: [{ id: receiverSocketID, pc: pc }]
        // };
        senderPCs[senderSocketID] = [{ id: receiverSocketID, pc: pc }];

    pc.onicecandidate = (e) => {
        // console.log(`socketID: ${receiverSocketID}'s senderPeerConnection icecandidate`);
        if(e.candidate !== null){
            socket.to(receiverSocketID).emit('getReceiverCandidate', {
            // socket.emit('getReceiverCandidate', { // 땜빵용
                id: senderSocketID,
                candidate: e.candidate
            });
        }
    };

    pc.oniceconnectionstatechange = (e) => {
        // console.log(e);
    };

    const sendUser = users[roomID].filter(
        (user) => user.id === senderSocketID
    )[0];
    sendUser.stream.getTracks().forEach((track) => {
        pc.addTrack(track, sendUser.stream);
    });

    return pc;
};

const getOtherUsersInRoom = (socketID, roomID) => {
    let allUsers = [];

    if (!users[roomID]) return allUsers;

    allUsers = users[roomID]
        .filter((user) => user.id !== socketID)
        .map((otherUser) => ({ id: otherUser.id }));

    return allUsers;
};

const deleteUser = (socketID, roomID) => {
    if (!users[roomID]) return;
    users[roomID] = users[roomID].filter((user) => user.id !== socketID);
    if (users[roomID].length === 0) {
        delete users[roomID];
    }
    delete socketToRoom[socketID];
};

const closeReceiverPC = (socketID) => {
    if (!receiverPCs[socketID]) return;

    receiverPCs[socketID].close();
    delete receiverPCs[socketID];
};

const closeSenderPCs = (socketID) => {
    if (!senderPCs[socketID]) return;

    senderPCs[socketID].forEach((senderPC) => {
        senderPC.pc.close();
        if(senderPCs[senderPC.id] === undefined) return; // 이걸 넣어준 이유
        const eachSenderPC = senderPCs[senderPC.id].filter(
            (sPC) => sPC.id === socketID
        )[0];
        if (!eachSenderPC) return;
        eachSenderPC.pc.close();
        senderPCs[senderPC.id] = senderPCs[senderPC.id].filter(
            (sPC) => sPC.id !== socketID
        );
    });

    delete senderPCs[socketID];
};

export default (wsServer, socket) => {
    socket.on('joinRoom', (data) => {
        try {
            let allUsers = getOtherUsersInRoom(data.id, data.roomID);
            wsServer.to(data.id).emit('allUsers', { users: allUsers });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('senderOffer', async (data) => {
        try {
            socketToRoom[data.senderSocketID] = data.roomID;
            let pc = createReceiverPeerConnection(
                data.senderSocketID,
                wsServer, // socket이었는데 wsServer같아서 바꿈
                data.roomID
            );
            await pc.setRemoteDescription(data.sdp);
            let sdp = await pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(sdp);
            socket.join(data.roomID);
            wsServer.to(data.senderSocketID).emit('getSenderAnswer', { sdp });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('senderCandidate', async (data) => {
        try {
            let pc = receiverPCs[data.senderSocketID];
            await pc.addIceCandidate(new wrtc.RTCIceCandidate(data.candidate));
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('receiverOffer', async (data) => {
        try {
            let pc = createSenderPeerConnection(
                data.receiverSocketID, // 자기 socket id
                data.senderSocketID,   // 보내주는 애들 socket id
                wsServer,       
                data.roomID
            );
            console.log("pcpcpc : ", pc);
            await pc.setRemoteDescription(data.sdp);
            let sdp = await pc.createAnswer({
                offerToReceiveAudio: false, // 원래 false
                offerToReceiveVideo: false  // 원래 false
            });
            await pc.setLocalDescription(sdp);
            wsServer.to(data.receiverSocketID).emit('getReceiverAnswer', {
                id: data.senderSocketID,
                sdp
            });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('receiverCandidate', async (data) => {
        try {
            const senderPC = senderPCs[data.senderSocketID].filter(
                (sPC) => sPC.id === data.receiverSocketID
            )[0];
            
            await senderPC.pc.addIceCandidate(
                new wrtc.RTCIceCandidate(data.candidate)
            );
        } catch (error) {
            console.error(error);
        }
    });

    socket.on('disconnect', () => {
        try {
            let roomID = socketToRoom[socket.id];

            deleteUser(socket.id, roomID);
            closeReceiverPC(socket.id);
            closeSenderPCs(socket.id);

            socket.broadcast.to(roomID).emit('userExit', { id: socket.id });
        } catch (error) {
            console.log(error);
        }
    });

    // setInterval(function() {
    //     console.log("\nsenderPCs ]] ", senderPCs,
    //                // "\nreceiverPCs ]] ", receiverPCs,
    //                 "\nusers ]] ", users,
    //                 "\nsocketToRoom ]] ", socketToRoom,
    //             );
    // }, 3000);
};
