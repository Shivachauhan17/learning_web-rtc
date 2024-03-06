
var sendChannel, receiveChannel;

var startButton = document.getElementById("startButton");
var sendButton = document.getElementById("sendButton");
var closeButton = document.getElementById("closeButton");


startButton.disabled = false;
sendButton.disabled = true;
closeButton.disabled = true;

startButton.onclick = createConnection;
sendButton.onclick = sendData;
closeButton.onclick = closeDataChannels;


function log(text) {
    console.log("At time: " + (performance.now() / 1000).toFixed(3) +
    " --> " + text);
   }

function createConnection(){
    var servers=null
    var pc_constraints={
        'optional':[
            {
                'DtlsSrtpKeyAgreement':true
            }
        ]
    }    

    localPeerConnection=new RTCPeerConnection(servers,pc_constraints)
    log("Created local peer connection object, with Data Channel");
    try{

        sendChannel=localPeerConnection.createDataChannel("sendDataChannel",{reliable:true})
        log('Created reliable send data channel');
    }
    catch(e){
        alert('Failed to create data channel')
        log('createDataChannel() failed with following message:'+e.message)
    }


    localPeerConnection.onicecandidate=gotLocalCandidate;
    sendChannel.onopen=handleSendChannelStateChange
    sendChannel.onclose=handleSendChannelStateChange

    window.remotePeerConnection=new RTCPeerConnection(servers,pc_constraints)
    log('Created remote peer connection object, with DataChannel')

    remotePeerConnection.onicecandidate=gotRemoteIceCandidate
    remotePeerConnection.ondatachannel=gotReceiveChannel

    localPeerConnection.createOffer().then(gotLocalDescription).catch(onSignalingError)

    startButton.disabled=true
    closeButton.disabled=false

}


function onSignalingError(error){
    console.log('Failed to create signaling message:'+error.name)
}

function sendData(){
    var data=document.getElementById("dataChannelSend").value
    sendChannel.send(data)
    log('sent data:'+data)
}

function closeDataChannels(){
    log('closing data channels')
    sendChannel.close()
    log('Closed data channel with label:'+sendChannel.label)
    receiveChannel.close()
    log('Closed data Channel with label'+receiveChannel.label)

    localPeerConnection.close()
    remotePeerConnection.close()

    localPeerConnection=null
    remotePeerConnection=null

    log('Closed peer connections')
    startButton.disabled = false;
    sendButton.disabled = true;
    closeButton.disabled = true;
    dataChannelSend.value = "";
    dataChannelReceive.value = "";
    dataChannelSend.disabled = true;
    dataChannelSend.placeholder = "1: Press Start; 2: Enter text; \
    3: Press Send.";

}

function gotLocalDescription(desc){
    localPeerConnection.setLocalDescription(desc)
    log('local peer conection description',desc.sdp)
    remotePeerConnection.setRemoteDescription(desc)
    remotePeerConnection.createAnswer().then(gotRemoteDescription).catch(onSignalingError)
}

function gotRemoteDescription(desc){
    remotePeerConnection.setLocalDescription(desc)
    log('Answer from remotePeerConnection \n'+desc.sdp)
    localPeerConnection.setRemoteDescription(desc)
}

function gotLocalCandidate(event){
    if(event.candidate){
        remotePeerConnection.addIceCandidate(event.candidate)
        log('Local Ice candidate\n'+event.candidate.candidate)
    }
}

function gotRemoteIceCandidate(event){
    if(event.candidate){
        localPeerConnection.addIceCandidate(event.candidate)
        log('Remote Ice candidate\n'+event.candidate.candidate)
    }
}

function gotReceiveChannel(event){
    log('Receive Channel Callback: event-->'+event)

    receiveChannel=event.channel

    receiveChannel.onopen=handleReceiveChannelStateChange
    receiveChannel.onmessage=handleMessage
    receiveChannel.onclose=handleReceiveChannelStateChange

}

function handleMessage(event){
    log('Receive message'+event.data)
    document.getElementById('dataChannelReceive').value=event.data;
    document.getElementById('dataChannelSend').value=''
}


function handleSendChannelStateChange(){
    var readyState=sendChannel.readyState
    log('send Channel state is:'+readyState)
    if(readyState=='open'){
        dataChannelSend.disabled=false
        dataChannelSend.focus()
        dataChannelSend.placeholder=""

        sendButton.disabled=false
        closeButton.disabled=false

    }
    else{
        dataChannelSend.disabled=true
        sendButton.disabled=true
        closeButton.disabled=true
    }
}


function handleReceiveChannelStateChange(){
    var readyState=receiveChannel.readyState
    log('receive channel state is'+readyState)
}