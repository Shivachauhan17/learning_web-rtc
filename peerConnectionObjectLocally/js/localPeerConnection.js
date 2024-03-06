var localStream, localPeerConnection, remotePeerConnection;

var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");


var startButton = document.getElementById("startButton");
var callButton = document.getElementById("callButton");
var hangupButton = document.getElementById("hangupButton");

startButton.disabled = false;
callButton.disabled = true;
hangupButton.disabled = true;

startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;


function log(text) {
    console.log("At time: " + (performance.now() / 1000).toFixed(3) + " --> " 
    + text);
   }

function successCallback(stream){
    log("received local stream")

    localVideo.srcObject=stream
    localStream=stream
    callButton.disabled=false
}   

function start(){
    log("requesting local stream")
    startButton.disabled=true

    navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia ||
    navigator.mediaDevices.webkitGetUserMedia ||
    navigator.mediaDevices.mozGetUserMedia;

    navigator.mediaDevices.getUserMedia({audio:true,video:true})
        .then(successCallback)
        .catch(log)   
}

function call(){
    callButton.disabled=true;
    hangupButton.disabled=false
    log("starting call")


    var server=null;

    localPeerConnection=new RTCPeerConnection(server)
    log("Created local peer connection object localPeerConnection");
    
    localPeerConnection.onicecandidate = gotLocalIceCandidate;

    remotePeerConnection = new RTCPeerConnection(server);
    log("Created remote peer connection object remotePeerConnection");

    remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
    remotePeerConnection.onaddstream = gotRemoteStream;

    localStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localStream));
    log("Added localStream to localPeerConnection");
    localPeerConnection.createOffer().then(gotLocalDescription).catch(onSignalingError)
}

function onSignalingError(error){
    console.log('failed to create signaling message:\n'+ error.name)
}

function gotLocalDescription(description){
    localPeerConnection.setLocalDescription(description)
    log("offer from localPeerConnection \n"+description.sdp);

    remotePeerConnection.setRemoteDescription(description);

    remotePeerConnection.createAnswer().then(gotRemoteDescription).catch(onSignalingError)
}

function gotRemoteDescription(description){
    log("got remote description\n"+description.sdp)
    remotePeerConnection.setLocalDescription(description)
    localPeerConnection.setRemoteDescription(description)
}


function hangup(){
    log("Ending Call")
    if (localPeerConnection) {
        localPeerConnection.close();
        localPeerConnection = null;
    }
    if (remotePeerConnection) {
        remotePeerConnection.close();
        remotePeerConnection = null;
    }

    hangupButton.disabled=true
    callButton.disabled=false
}

function gotRemoteStream(event){
    remoteVideo.srcObject=event.stream
    log("Received remote stream:\n"+event.stream);

}

function gotLocalIceCandidate(event){
    if(event.candidate){
        remotePeerConnection.addIceCandidate(event.candidate)
        log("Local ICE candidate: \n" + event.candidate.candidate)
    }
    
}

function gotRemoteIceCandidate(event){
    if(event.candidate){
        localPeerConnection.addIceCandidate(event.candidate)
        log("Remote ICE candidate: \n " + event.candidate.candidate)
    }
}

