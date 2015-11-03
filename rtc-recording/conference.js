
(function () {
    var selfCandidates = [];
    // null -> null
    function getVideoStream() {
        var config = { video: true };
        navigator.mozGetUserMedia(config, function (stream) {
            window.stream = stream;
            document.getElementById('video-one').setAttribute('src', window.URL.createObjectURL(stream));
            getRecorder();
            createPeerConnection();
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

    // nul -> websoketConnection
    function getWebSocket() {
        var websocketEndpoint = 'ws://localhost:9000';
        window.connection = new WebSocket(websocketEndpoint);
        window.connection.binaryType = 'arraybuffer';
        window.connection.onmessage = function (message) {
            handleSocketMessage(message);
        }
    };

    function handleSocketMessage(message) {
        var message = JSON.parse(message.data);
        console.log(message);
        if (!window.offerCreated && message.type === 'offer') {
            console.log('got offer');
            var sessionDescription = new window.mozRTCSessionDescription(message.sessionDescription);
            window.pc.setRemoteDescription(sessionDescription, createRTCAnswer, function (error) {
                console.log('cannot set remote description');
            });
        } else if (window.offerCreated && message.type === 'answer') {
            console.log('got answer');
            var sessionDescription = new window.mozRTCSessionDescription(message.sessionDescription);
            window.pc.setRemoteDescription(sessionDescription, function () {
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
                window.pc.addIceCandidate(candidate);
            }
        }
    }

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
        window.pc = new window.mozRTCPeerConnection(rtcConfig);
        window.pc.addStream(window.stream);
        window.pc.onicecandidate = handleIceCandidate;
        window.pc.onaddstream = handleRemoteStreamAdded;
        window.pc.onremovestream = handleRemoteStreamRemoved;
    };

    function handleIceCandidate(event) {
        console.log('handleIceCandidate event: ', event);
        if (event.candidate) {
              window.connection.send(JSON.stringify({
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
        window.pc.createAnswer(
            function (sessionDescription) {
                window.pc.setLocalDescription(sessionDescription,
                    function () {
                        var message = { sessionDescription: sessionDescription, type: 'answer' }
                        window.connection.send(JSON.stringify(message));
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
        console.log(window.pc);
        window.pc.createOffer(
            function (sessionDescription) {
                console.log(sessionDescription);
                window.pc.setLocalDescription(sessionDescription, function () {
                    var message = { sessionDescription: sessionDescription, type: 'offer' }
                    window.connection.send(JSON.stringify(message));
                    window.offerCreated = true;
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
        window.recorder.start(3000);
    });

    var stopButton = document.getElementById('stop');
    stopButton.addEventListener('click', function (e) {
        window.recorder.stop();
    });

    var rtcButton = document.getElementById('webrtc');
    rtcButton.addEventListener('click', function (e) {
        createRTCOffer();
    });

    getVideoStream();
    getWebSocket();
})();