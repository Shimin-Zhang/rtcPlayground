(function () {
    function getVideoStream() {
        var config = { video: true };
        var userstream;
        navigator.mozGetUserMedia(config, function (stream) {
            window.stream = stream;
            document.getElementsByTagName('video')[0].setAttribute('src', window.URL.createObjectURL(stream));
            getRecorder();
        }, function () {
            document.getElementById('errors').innerHTML = 'Cannot get stream!';
        });
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
            console.log(reader.result);
            window.connection.send(reader.result);
        };
    };

    function getWebSocket() {
        var websocketEndpoint = 'ws://localhost:7000';
        window.connection = new WebSocket(websocketEndpoint);
        window.connection.binaryType = 'arraybuffer';
        window.connection.onmessage = function (message) {
            window.fileName = message.data;
        }
    };

    var startButton = document.getElementById('record');
    startButton.addEventListener('click', function (e) {
        window.recorder.start(3000);
    });

    var stopButton = document.getElementById('stop');
    stopButton.addEventListener('click', function (e) {
        window.recorder.stop();
    });

    getVideoStream();
    getWebSocket();
})();