import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import Button from '@material-ui/core/Button';
import CallEndIcon from '@material-ui/icons/CallEnd';

const Container = styled.div`
    padding: 20px;
    display: flex;
    height: 100vh;
    width: 90%;
    margin: auto;
    flex-wrap: wrap;
`;

const StyledVideo = styled.video`
    height: 50vh;
    width: 45vw;
    margin-top: 100px;
    margin-left: 30px;
`;

const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
    }, []);

    return (
        <StyledVideo playsInline autoPlay ref={ref} />
    );
}


const videoConstraints = {
    height: window.innerHeight / 2,
    width: window.innerWidth / 2
};

const Room = (props) => {
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const roomID = props.match.params.roomID;

    useEffect(() => {
        socketRef.current = io.connect("/");
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
            userVideo.current.srcObject = stream;
            socketRef.current.emit("join room", roomID);
            socketRef.current.on("all users", users => {
                const peers = [];
                users.forEach(userID => {
                    const peer = createPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    })
                    peers.push(peer);
                })
                setPeers(peers);
            })

            socketRef.current.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })

                setPeers(users => [...users, peer]);
            });

            socketRef.current.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });
        })
    }, []);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal);

        return peer;
    }

    return (
        <div style={{
          position: 'absolute',
          left: 8,
          width: '100vw',
          height: '100vh',
          margin: '-20px -8px 0px -8px',
          background: 'linear-gradient(90deg, rgba(2,0,36,1) 2%, rgba(85,9,121,1) 50%, rgba(130,0,255,1) 100%)'}}
        >
            <div style={{ margin: 'auto', display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
              <StyledVideo muted ref={userVideo} autoPlay playsInline />
              {peers.map((peer, index) => {
                  return (
                      <Video key={index} peer={peer} />
                  );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
              <Button onClick={() => {
                setPeers([])
                props.history.push('/')
              }} style={{ backgroundColor: 'crimson', color: 'white' }}>
                End this call<CallEndIcon />
              </Button>
            </div>
        </div>
    );
};

export default Room;
