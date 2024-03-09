'use strict';

navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia ||
    navigator.mediaDevices.webkitGetUserMedia ||
    navigator.mediaDevices.mozGetUserMedia;

window.onbeforeunload = function(e) {
    hangup(); // Call the hangup() function when the page is about to be unloaded
};
    

var sendChannel, receiveChannel;

var sendButton = document.getElementById("sendButton");
var sendTextarea = document.getElementById("dataChannelSend");
var receiveTextarea = document.getElementById("dataChannelReceive");

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

sendButton.onclick = sendData;

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;

var localStream;
var remoteStream;

var pc;
var pc_config={iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ]}

var pc_constraints = {
    'optional': [
    {'DtlsSrtpKeyAgreement': true}
    ]};

var sdpConstraints = {};

var room = prompt('Enter room name:');

var socket = io.connect("http://localhost:8001");


if(room!==''){
    console.log('create or join room',room)
    socket.emit('create or join',room)
}


var constraints={video:true,audio:true}

function handleUserMedia(stream){
    localStream=stream
    localVideo.srcObject=stream
    console.log('adding local stream')
    sendMessage('got user media')
}


function handleUserMediaError(error){
    console.log('navigator.getUserMedia error: ', error);
   }


socket.on('created',function(room){
    console.log('created room'+room)
    isInitiator=true
    navigator.mediaDevices.getUserMedia(constraints)
        .then(handleUserMedia)
        .catch(handleUserMediaError)
    console.log('Getting user media with constraints', constraints);
    checkAndStart();
})


socket.on('full',function(room){
    console.log('Room'+room+'is full')
})


socket.on('join',function(room){
    console.log('Another peer made a request to join room ' + room);
    console.log('This peer is the initiator of room ' + room + '!');

    isChannelReady=true
})

socket.on('joined',function(room){
    console.log('This peer has joined room ' + room);
    isChannelReady = true;
    navigator.mediaDevices.getUserMedia(constraints)
        .then(handleUserMedia)
        .catch(handleUserMediaError)
    console.log('Getting user media with constraints', constraints);
})


socket.on('log',function(array){
    console.log.apply(console,array)
})


socket.on('message',function(message){
    console.log('Received message:', message);
    if (message === 'got user media') {
        checkAndStart();
    }
    else if (message.type === 'offer') {
        if (!isInitiator && !isStarted) {
            checkAndStart();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
    } 
    else if(message.type==='answer' && isStarted){
        pc.setRemoteDescription(message)
    }
    else if(message.type === 'candidate' && isStarted){
        var candidate= new RTCIceCandidate({sdpMLineIndex:message.label,
            candidate:message.candidate});
        pc.addIceCandidate(candidate)
    }
    else if(message==='bye' && isStarted){
        handleRemoteHangup()
    }
})


function sendMessage(message){
    console.log('Sending message',message)
    socket.emit('message',message)
}

function checkAndStart(){
    if(!isStarted && typeof localStream!=='undefined' && isChannelReady){
        createPeerConnection()
    console.log(" i am under check and start and this isInitiator valie",isInitiator)
    isStarted=true
    if(isInitiator){
        doCall()
    }
}
}

function createPeerConnection(){
    try{
        pc=new RTCPeerConnection(pc_config,pc_constraints)        
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        pc.onicecandidate=handleIceCandidate
        console.log('Created RTCPeerConnnection with:\n' +
        ' config: \'' + JSON.stringify(pc_config) + '\';\n' +
        ' constraints: \'' + JSON.stringify(pc_constraints) + '\'.');
    }
    catch(e){
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;


    if(isInitiator){
        try{
            sendChannel = pc.createDataChannel("sendDataChannel",
            {reliable: true});
            trace('Created send data channel');
            sendChannel.onopen = handleSendChannelStateChange;
            sendChannel.onmessage = handleMessage;
            sendChannel.onclose = handleSendChannelStateChange;
        }
        catch(e){
            alert('Failed to create data channel. ');
            trace('createDataChannel() failed with exception: ' + e.message);
        }
    }else{
        pc.ondatachannel = gotReceiveChannel;
    }
}

function sendData(){
    var data=sendTextarea.value
    if(isInitiator)sendChannel.send(data)
    else receiveChannel.send(data)
    trace('Sent data'+data)
}

function gotReceiveChannel(event){
    trace('Receive Channel Callback')
    receiveChannel=event.channel
    receiveChannel.onmessage=handleMessage
    receiveChannel.onopen=handleReceiveChannelStateChange
    receiveChannel.onclose=handleReceiveChannelStateChange
}

function handleMessage(event){
    trace('Received message')
    receiveTextarea.value += event.data + '\n';
}

function handleSendChannelStateChange(){
    var readyState=sendChannel.readyState
    trace('Send Channel state is:'+readyState)
    if(readyState==='open'){
        sendTextarea.focus()
        sendTextarea.disabled=false
        sendTextarea.placeholder=""
        sendButton.disabled = false;
    }
    else{
        sendTextarea.disabled=true
        sendButton.disabled=true
    }
}

function handleReceiveChannelStateChange() {
    var readyState = receiveChannel.readyState;
    trace('Receive channel state is: ' + readyState);

    if(readyState==='open'){
        sendTextarea.focus()
        sendTextarea.disabled=false
        sendTextarea.placeholder=""
        sendButton.disabled = false;
    }
    else{
        sendTextarea.disabled=true
        sendButton.disabled=true
    }
}

function handleIceCandidate(event){
    console.log('handleIceCandidate event: ', event);
    if(event.candidate){
        sendMessage({
            type:'candidate',
            label:event.candidate.sdpMLineIndex,
            id:event.candidate.sdpMid,
            candidate:event.candidate.candidate
        })
    }
    else{
        console.log('End of candidates')
    }
}


function doCall(){
    console.log('Creating Offer...')
    pc.createOffer(sdpConstraints).then(setLocalAndSendMessage).catch(onSignalingError)
}

function onSignalingError(){
    console.log('Failed to create signaling message : ' + error.name);
}

function doAnswer(){
    console.log('Sending answer to peer.');
    pc.createAnswer(sdpConstraints).then(setLocalAndSendMessage).catch(onSignalingError)
}

function setLocalAndSendMessage(sessionDescription){
    pc.setLocalDescription(sessionDescription)
    sendMessage(sessionDescription)
}

function handleRemoteStreamAdded(){
    console.log('Remote stream added.');
    attachMediaStream(remoteVideo, event.stream);
    console.log('Remote stream attached!!.');
    remoteStream = event.stream;
}

function hangup(){
    console.log('Hanging up')
    stop()
    sendMessage('bye')
}

function handleRemoteHangup(){
    console.log('Session terminated')
    stop()
    isInitiator=true
}


function stop(){
    isStarted=false
    if(sendChannel) sendChannel.close()
    if(receiveChannel) receiveChannel.clos()
    if(pc) pc.close()
    pc=null
    sendButton.disabled=true
}


