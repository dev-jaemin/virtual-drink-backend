import wrtc from 'wrtc';
import Util from './util.js';

const pc_config = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun3.l.google.com:19302',
                'stun:stun4.l.google.com:19302'
            ]
        }
    ]
};

const createReceiverPeerConnection = (socketID, socket, roomID, wsServerState) => {
    const pc = new wrtc.RTCPeerConnection(pc_config);

    if (wsServerState.receiverPCs[socketID])
        wsServerState.receiverPCs[socketID] = pc;
    else
        wsServerState.receiverPCs = {
            ...wsServerState.receiverPCs,
            [socketID]: pc
        };

    pc.onicecandidate = (e) => {
        //console.log(`socketID: ${socketID}'s receiverPeerConnection icecandidate`);

        if (e.candidate !== null) {
            socket.to(socketID).emit('getSenderCandidate', {
                candidate: e.candidate
            });
        }
    };

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    };

    pc.ontrack = (e) => {
        if (wsServerState.users[roomID]) {
            if (!Util.isIncluded(wsServerState.users[roomID], socketID)) {
                wsServerState.users[roomID].push({
                    id: socketID,
                    stream: e.streams[0]
                });
            } else return;
        } else {
            wsServerState.users[roomID] = [
                {
                    id: socketID,
                    stream: e.streams[0]
                }
            ];
        }
        let others = Util.getOtherUsersInRoom(socketID, roomID, wsServerState);
        others = others.filter((soc) => socketID !== soc.id);
        others = others.forEach((soc) => (socket.to(soc.id).emit('userEnter', { id: socketID })));
        // socket.to(roomID).emit('userEnter', { id: socketID });
    };

    return pc;
};

const createSenderPeerConnection = (
    receiverSocketID,
    senderSocketID,
    socket,
    roomID,
    wsServerState
) => {
    const pc = new wrtc.RTCPeerConnection(pc_config);

    if (wsServerState.senderPCs[senderSocketID]) {
        // wsServerState.senderPCs 바꿔버리는 쪽으로 업데이트
        wsServerState.senderPCs[senderSocketID] = wsServerState.senderPCs[
            senderSocketID
        ].filter((user) => user.id !== receiverSocketID);
        wsServerState.senderPCs[senderSocketID].push({
            id: receiverSocketID,
            pc: pc
        });
    }
    // wsServerState.senderPCs = {
    //     ...wsServerState.senderPCs,
    //     [senderSocketID]: [{ id: receiverSocketID, pc: pc }]
    // };
    else
        wsServerState.senderPCs[senderSocketID] = [
            { id: receiverSocketID, pc: pc }
        ];

    pc.onicecandidate = (e) => {
        // console.log(`socketID: ${receiverSocketID}'s senderPeerConnection icecandidate`);
        if (e.candidate !== null) {
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

    const sendUser = wsServerState.users[roomID].filter(
        (user) => user.id === senderSocketID
    )[0];
    sendUser.stream.getTracks().forEach((track) => {
        pc.addTrack(track, sendUser.stream);
    });

    return pc;
};

const closeReceiverPC = (socketID, wsServerState) => {
    if (!wsServerState.receiverPCs[socketID]) return;

    wsServerState.receiverPCs[socketID].close();
    delete wsServerState.receiverPCs[socketID];
};

const closeSenderPCs = (socketID, wsServerState) => {
    if (!wsServerState.senderPCs[socketID]) return;

    wsServerState.senderPCs[socketID].forEach((senderPC) => {
        senderPC.pc.close();
        if (wsServerState.senderPCs[senderPC.id] === undefined) return; // 이걸 넣어준 이유
        const eachSenderPC = wsServerState.senderPCs[senderPC.id].filter(
            (sPC) => sPC.id === socketID
        )[0];
        if (!eachSenderPC) return;
        eachSenderPC.pc.close();
        wsServerState.senderPCs[senderPC.id] = wsServerState.senderPCs[
            senderPC.id
        ].filter((sPC) => sPC.id !== socketID);
    });

    delete wsServerState.senderPCs[socketID];
};


export function webRTC (wsServer, socket, wsServerState) {

    socket.on('receiverOffer', async (data) => {
        try {
            let pc = createSenderPeerConnection(
                data.receiverSocketID, // 자기 socket id
                data.senderSocketID, // 보내주는 애들 socket id
                wsServer,
                data.roomID,
                wsServerState
            );
            await pc.setRemoteDescription(data.sdp);
            let sdp = await pc.createAnswer({
                offerToReceiveAudio: false, // 원래 false
                offerToReceiveVideo: false // 원래 false
            });
            // 아래에서 맨앞의 await를 지웠음
            pc.setLocalDescription(sdp);
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
            const senderPC = wsServerState.senderPCs[
                data.senderSocketID
            ].filter((sPC) => sPC.id === data.receiverSocketID)[0];
    
            await senderPC.pc.addIceCandidate(
                new wrtc.RTCIceCandidate(data.candidate)
            );
        } catch (error) {
            console.error(error);
        }
    });
    
    socket.on('senderOffer', async (data) => {
        try {
            wsServerState.socketToRoom[data.senderSocketID] = data.roomID;
            let pc = createReceiverPeerConnection(
                data.senderSocketID,
                wsServer, // socket이었는데 wsServer같아서 바꿈
                data.roomID,
                wsServerState
            );
            await pc.setRemoteDescription(data.sdp);
            let sdp = await pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            // 아래에서 맨앞의 await를 지웠음
            pc.setLocalDescription(sdp);
            socket.join(data.roomID);
            wsServer.to(data.senderSocketID).emit('getSenderAnswer', { sdp });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('senderCandidate', async (data) => {
        try {
            let pc = wsServerState.receiverPCs[data.senderSocketID];
            await pc.addIceCandidate(new wrtc.RTCIceCandidate(data.candidate));
        } catch (error) {
            console.log(error);
        }
    });
}

export function disconnect (socket, wsServerState) {
    closeReceiverPC(socket.id, wsServerState);
    closeSenderPCs(socket.id, wsServerState);
}
