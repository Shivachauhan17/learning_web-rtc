// Check for browser compatibility and get the appropriate getUserMedia method
navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia ||
    navigator.mediaDevices.webkitGetUserMedia ||
    navigator.mediaDevices.mozGetUserMedia;

// Check if getUserMedia is supported
if (navigator.mediaDevices.getUserMedia) {
    // Define constraints for the media stream (in this case, we want only video)
    var constraints = { video: true, audio: false };

    // Request the media stream
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            // Success callback: Display the stream in the video element
            var video = document.querySelector("video");
            video.srcObject = stream;
            video.play();
        })
        .catch(function(error) {
            // Error callback: Log the error to the console
            console.error('navigator.mediaDevices.getUserMedia error:', error);
        });
} else {
    console.error('getUserMedia is not supported in this browser');
}
