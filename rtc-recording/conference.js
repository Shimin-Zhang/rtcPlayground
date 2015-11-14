
(function () {
    var selfCandidates = [];
    var videoCounter = 0;
    var stream;
    var connection;
    var recorder;
    var offerCreated;
    var pc;
    var CONFERENCE_ID = 'conference-one';
    // null -> null
    function getVideoStream() {
        var config = { video: true, audio: true };
        navigator.mediaDevices.getUserMedia(config)
        .then(function (s) {
            stream = s;
            document.getElementById('video-one').setAttribute('src', window.URL.createObjectURL(s));
            getRecorder();
            createPeerConnection();
        });
    };

    function getRecorder() {
        var options = { mimeType: 'video/webm' };
        recorder = new MediaRecorder(stream, options);
        recorder.ondataavailable = videoDataHandler;
    };

    function videoDataHandler(event) {
        var reader = new FileReader();
        reader.readAsArrayBuffer(event.data);
        videoCounter++;
        reader.onloadend = function (event) {
            console.log(reader.result);
            connection.send(reader.result);
        };
    };

    function getWebSocket() {
        var websocketEndpoint = 'ws://localhost:9000';
        connection = new WebSocket(websocketEndpoint);
        connection.binaryType = 'arraybuffer';
        connection.onmessage = function (message) {
            handleSocketMessage(message);
        }
    };

    function setConferenceID(id) {
        connection.send(JSON.stringify({
            id: id
        }));
    }

    function handleSocketMessage(message) {
        var message = JSON.parse(message.data);
        console.log(message);
        if (!offerCreated && message.type === 'offer') {
            console.log('got offer');
            var sessionDescription = new window.mozRTCSessionDescription(message.sessionDescription);
            pc.setRemoteDescription(sessionDescription, createRTCAnswer, function (error) {
                console.log('cannot set remote description');
            });
        } else if (offerCreated && message.type === 'answer') {
            console.log('got answer');
            var sessionDescription = new window.mozRTCSessionDescription(message.sessionDescription);
            pc.setRemoteDescription(sessionDescription, function () {
                console.log('created remote description');
            }, function (error) {
                console.log(error);
                console.log('cannot set remote description');
            });
        } else if (message.type === 'candidate') {
            if (selfCandidates.indexOf(message.candidate) === -1) {
                var candidate = new window.mozRTCIceCandidate({
                  sdpMLineIndex: message.label,
                  candidate: message.candidate
                });
                pc.addIceCandidate(candidate);
            }
        } else if (message.type === 'start-recording') {
            console.log('starting to record');
            recorder.start(3000);
        } else if (message.type === 'stop-recording') {
            console.log('stop recording');
            recorder.stop();
        } else if (message.part === videoCounter && recorder.state === 'inactive') {
            console.log('sending over complete video message')
            connection.send(JSON.stringify({
                completedVideo: message.fileName,
                id: CONFERENCE_ID
            }));
        }
    };

    function createPeerConnection() {
        var rtcConfig = { iceServers: [
            { urls: ['stun:stun.l.google.com:19302'] },
        ]};
        pc = new window.mozRTCPeerConnection(rtcConfig);
        pc.addStream(stream);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
    };

    function handleIceCandidate(event) {
        console.log('handleIceCandidate event: ', event);
        if (event.candidate) {
              connection.send(JSON.stringify({
                  type: 'candidate',
                  label: event.candidate.sdpMLineIndex,
                  id: event.candidate.sdpMid,
                  candidate: event.candidate.candidate
              }));
              selfCandidates.push(event.candidate.candidate);
        } else {
            console.log('end of candidates');
        }
    };

    function handleRemoteStreamAdded(event) {
        document.getElementById('video-two').setAttribute('src',
            window.URL.createObjectURL(event.stream));
        console.log('handleRemoteStream');
        setConferenceID(CONFERENCE_ID);
    };

    function handleRemoteStreamRemoved() {
        console.log('handleRemoteStreamRemoved');
    };

    function createRTCAnswer() {
        var rtcConstraints = {
            'OfferToReceiveAudio':true,
            'OfferToReceiveVideo':true
        };
        pc.createAnswer(
            function (sessionDescription) {
                pc.setLocalDescription(sessionDescription,
                    function () {
                        var message = { sessionDescription: sessionDescription, type: 'answer' }
                        connection.send(JSON.stringify(message));
                    },
                    function (error) {
                        console.log('cannot set local description');
                    }
                );
            },
            function (error) {
                console.log('cannot create answer');
            },
            rtcConstraints
        );
    };

    function createRTCOffer() {
        var rtcConstraints = {
            'OfferToReceiveAudio':true,
            'OfferToReceiveVideo':true
        };
        console.log('creating offer');
        pc.createOffer(
            function (sessionDescription) {
                console.log(sessionDescription);
                pc.setLocalDescription(sessionDescription, function () {
                    var message = { sessionDescription: sessionDescription, type: 'offer' }
                    connection.send(JSON.stringify(message));
                    offerCreated = true;
                }, function (error) {
                    console.log('cannot set local description');
                    return;
                })
            },
            function (error) {
                console.log(error);
                console.log('cannot create offer');
                return;
            },
            rtcConstraints
        );
    };

    var startButton = document.getElementById('record');
    startButton.addEventListener('click', function (e) {
        connection.send(JSON.stringify({ type: 'start-recording' }));
    });

    var stopButton = document.getElementById('stop');
    stopButton.addEventListener('click', function (e) {
        connection.send(JSON.stringify({ type: 'stop-recording' }));
    });

    var rtcButton = document.getElementById('webrtc');
    rtcButton.addEventListener('click', function (e) {
        createRTCOffer();
    });

    getVideoStream();
    getWebSocket();
})();