var videoStream;
var recorder;
var isRecording = false;
var mediaSource = new MediaSource();
var sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vorbis,vp8"');

navigator.mozGetUserMedia({
    audio: true,
    video: true
}, function (stream) {
    videoStream = stream;
    document.getElementById('video').setAttribute('src', window.URL.createObjectURL(stream));
}, function (erro) {
    console.log('cannot open stream');
});

var videoDataHandler = function (event) {
    var reader = new FileReader();
    var blob = event.data;
    reader.readAsArrayBuffer(blob);
    document.getElementById('recorded-video').setAttribute('src', window.URL.createObjectURL(blob));
    reader.onloadend = function (event) {
        sourceBuffer.appendBuffer(fileReader.result);
        //document.getElementById('recorded-video').setAttribute('src', event.target.result);
    };
};

var createMediaPlayer = function () {
    recorder = new MediaRecorder(videoStream, {
        mimeType: 'video/webm'
    });
    recorder.ondataavailable = videoDataHandler;
};

var recordButton = document.getElementById('record');
recordButton.addEventListener('click', function (e) {
    isRecording = true;
    createMediaPlayer();
    recorder.start();
    var recordTimeout = function () {
        window.setTimeout(function () {
            recorder.requestData();
            if (isRecording) {
                recordTimeout();
            }
        }, 1000);
    };
    recordTimeout();
});
var stepButton = document.getElementById('stop');
stepButton.addEventListener('click', function (e) {
    isRecording = false;
    recorder.stop();
})