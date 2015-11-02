(function () {

    // null -> videoStream
    function getVideoStream() {
        var config = { video: true };
        navigator.mozGetUserMedia(config, function (stream) {
            window.stream = stream;
            document.getElementsByTagName('video')[0].setAttribute('src', window.URL.createObjectURL(stream));
            getRecorder();
        }, function () {
            document.getElementById('errors').innerHTML = 'Cannot get stream!';
        });
    };

    function getWebSocket() {
        var websocketEndpoint = 'ws://localhost:7000';
        window.connection = new WebSocket(websocketEndpoint);
        window.connection.binaryType = 'arraybuffer';
        window.connection.onmessage = function (message) {
            console.log(message);
            window.fileName = message.data;
            console.log(window.fileName);
        }
    };

    function getRecorder() {
        var options = { mimeType: 'video/webm' };
        window.recorder = new MediaRecorder(window.stream, options);
        window.recorder.ondataavailable = videoDataHandler;
    };

    function videoDataHandler(event) {
        var reader = new FileReader();
        reader.readAsArrayBuffer(event.data);
        reader.onloadend = function (event) {
            /* var file = {
                dataURL: reader.result
            };
            if (window.fileName) {
                file.fileName = window.fileName;
            } */
            console.log(reader.result);
            console.log(reader.result.byteLength);
            window.connection.send(reader.result);
        };
    };

    var startButton = document.getElementById('record');
    startButton.addEventListener('click', function (e) {
        window.recorder.start(2000);
    });

    var stopButton = document.getElementById('stop');
    stopButton.addEventListener('click', function (e) {
        window.recorder.stop();
    });

    getVideoStream();
    getWebSocket();
})();