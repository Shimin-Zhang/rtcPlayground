var videoStream;
var recorder;
var isRecording = false;
var chunkArray = [];
var blobDataArray = [];
var blobsArray = [];
var videoNum = 1;
var blobNum = 1;
var binaryNum = 1;
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

var videoDataHandler = function (event) {
    dataURLHandler(event);
    BlobHandler(event);
    binaryBlobHandler(event);
};

// Concat and play videos as base 64 DataURL
// this does not work
dataURLHandler = function (event) {
    var reader = new FileReader();
    reader.readAsDataURL(event.data);
    reader.onloadend = function (event) {
        document.getElementById('recorded-video-' + videoNum).setAttribute('src', reader.result);
        chunkArray.push(reader.result);
        if (videoNum === 2) {
            var one = chunkArray[0];
            var two = chunkArray[1].split(',').pop();
            document.getElementById('recorded-video-combined').setAttribute('src', one + two);
        }
        videoNum++;
    };
};

// Concat and play videos as Blobs
// this works
BlobHandler = function (event) {
    var blob = event.data;
    blobsArray.push(blob);
    document.getElementById('blob-video-' + blobNum).setAttribute('src', window.URL.createObjectURL(blob));
    if (blobNum === 2) {
        var combinedBlob = new Blob(blobsArray, { type: 'video/webm'});
        document.getElementById('blob-video-combined').setAttribute('src', window.URL.createObjectURL(combinedBlob));
    }
    blobNum++;
};


// Store Blob as strings to be revived as Blobs later
// this does not work
binaryBlobHandler = function (event) {
    var reader = new FileReader();
    var buffer = new ArrayBuffer(event.data.getSize);
    reader.readAsBinaryString(event.data);
    reader.onloadend = function (event) {
        blobDataArray.push(reader.result);
        if (videoNum === 2) {
            var blobOne = new Blob(blobDataArray[0], { type: 'video/webm'});
            var blobTwo = new Blob([blobDataArray[1], { type: 'video/webm'});
            var blobCombined = new Blob([blobOne, blobTwo], {type: 'video/webm'})
            document.getElementById('revived-blob-video-combined').setAttribute('src', window.URL.createObjectURL(blobCombined));
        }
        binaryNum++;
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
    //Per https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/ondataavailable
    // should produce n millisecond long video blob
    recorder.start(3000);
});

var stepButton = document.getElementById('stop');
stepButton.addEventListener('click', function (e) {
    isRecording = false;
    recorder.stop();
})