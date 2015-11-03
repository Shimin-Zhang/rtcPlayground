
(function () {
    var selfCandidates = [];
    var videoCounter = 0;
    var videoProcessed;
    var audioData;
    var stream;
    var connection;
    var recorder;
    var audioRecorder;
    var offerCreated;
    var pc;
    // null -> null
    function getVideoStream() {
        var config = { video: true, audio: true };
        navigator.mozGetUserMedia(config, function (s) {
            stream = s;
            document.getElementById('video-one').setAttribute('src', window.URL.createObjectURL(s));
            getRecorder();
            createPeerConnection();
        }, function () {
            document.getElementById('errors').innerHTML = 'Cannot get stream!';
        });
    };

    function getRecorder() {
        var options = { mimeType: 'video/webm' };
        var audioOptions = { mimeType: 'audio/ogg' };
        recorder = new MediaRecorder(stream, options);
        audioRecorder = new MediaRecorder(stream, audioOptions);
        recorder.ondataavailable = videoDataHandler;
        audioRecorder.ondataavailable = audioDataHandler;
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

    function audioDataHandler(event) {
        var reader = new FileReader();
        reader.readAsArrayBuffer(event.data);
        reader.onloadend = function (event) {
            console.log('audio file received');
            console.log(reader.result);
            console.log(videoProcessed);
            if (videoProcessed) {
                recordAudioData(reader.result);
            } else {
                audioData = reader.result;
            }
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
        } else if (message.part === videoCounter && recorder.state === 'inactive') {
            videoProcessed = true;
            if (audioData) {
                recordAudioData(audioData);
            }
        }
    };

    function recordAudioData(data) {
        connection.send(JSON.stringify({ recordAudio: true }));
        connection.send(data);
    };

    function createPeerConnection() {
        var rtcConfig = { iceServers: [
            { urls: ['stun:stun.l.google.com:19302'] },
            {
                credential: '369197e2-4a87-11e5-bcd9-6cbece04ef20',
                urls: ['turn:turn01.uswest.xirsys.com:443?transport=udp'],
                username: '1_36919724-4a87-11e5-8477-887f02eb962a'
            },
            {
                credential: '369197e2-4a87-11e5-bcd9-6cbece04ef20',
                urls: ['turn:turn01.uswest.xirsys.com:443?transport=tcp'],
                username: '1_36919724-4a87-11e5-8477-887f02eb962a'
            }
        ] };
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
        audioRecorder.start();
        recorder.start(3000);
    });

    var stopButton = document.getElementById('stop');
    stopButton.addEventListener('click', function (e) {
        audioRecorder.stop();
        recorder.stop();
    });

    var rtcButton = document.getElementById('webrtc');
    rtcButton.addEventListener('click', function (e) {
        createRTCOffer();
    });

    getVideoStream();
    getWebSocket();
})();