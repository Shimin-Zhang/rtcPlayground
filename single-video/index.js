var videoStream;
var recorder;
var isRecording = false
var blobsArray = [];
// A quick demo to see how to best store video data from mediarecorder API as chunks to be transported and played back later.

navigator.mozGetUserMedia({
    audio: true,
    video: true
}, function (stream) {
    videoStream = stream;
    document.getElementById('video').setAttribute('src', window.URL.createObjectURL(stream));
}, function (erro) {
    console.log('cannot open stream');
});

function videoDataHandler (event) {
    BlobHandler(event);
};

// Concat and play videos as Blobs
// this works
function BlobHandler (event) {
    var blob = event.data;
    document.getElementById('blob-video').setAttribute('src', window.URL.createObjectURL(blob));
};

var createMediaPlayer = function () {
    window.recorder = new MediaRecorder(videoStream, {
        mimeType: 'video/webm'
    });
    window.recorder.ondataavailable = videoDataHandler;
};


var recordButton = document.getElementById('record');
recordButton.addEventListener('click', function (e) {
    isRecording = true;
    createMediaPlayer();
    window.recorder.start();
});

var stepButton = document.getElementById('stop');
stepButton.addEventListener('click', function (e) {
    isRecording = false;
    window.recorder.stop();
})