'use strict';

var fs = require('fs');
var exec = require('child_process').exec;
var uuid = require('node-uuid');
var videoFileExtension = '.webm';
var blobs = [];
var filePath = './uploads/';

function writeOrAppendData(data, fileName, fileType, videoCounter, ws) {
    if (!fs.existsSync(filePath + fileName + fileType)) {
        console.log('writing original file');
        ws.send(JSON.stringify({fileName: fileName}));
        fs.writeFileSync(filePath + fileName + fileType, data);
        ws.send(JSON.stringify({ part: videoCounter, fileName:fileName }));
    } else {
        console.log('appending File')
        fs.appendFileSync(filePath + fileName + fileType, data);
        ws.send(JSON.stringify({ part: videoCounter, fileName:fileName }));
    }
}

function writeOrAppendData(fileName) {
    var file = filePath + fileName + videoFileExtension;
    var movFile = filePath + fileName + '.mov';
    var ffmpegcommand = 'ffmpeg -i' + file + '-c:v prores -c:a pcm_s16le ' + movFile;
    exec(ffmpegcommand, function (error, stdout, stderr) {
        if (error) {
            console.log(error);
        } else {
            uploadToYoutube(completedFileName, ws);
            var fileWithAudio = filePath + fileName + '-good-audio'+ videoFileExtension;
            var covnertBackCommand = 'ffmpeg -i' + movFile + fileWithAudio;
            exec(covnertBackCommand, function (error, stdout, stderr) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('compile finished');
                }
            });
        }
    });
};

module.exports = function (app) {
    var sockets = [];
    var conferences = {};

    function broadcast(data) {
        console.log('trying to broadcast data');
        console.log(data);
        console.log(sockets.length);
        sockets.forEach(function (socket) {
            socket.send(data);
        });
    };

    function allVideosRecorded(id) {
        allRecorded = true;
        conferences[id].forEach(function (file) {
            fileName = Object.keys(file)[0];
            if (file[fileName] === false) {
                allRecorded = false;
            }
        });
        return allRecorded;
    };

    function compileConferenceVideos(id) {
        conferences[id].forEach(function (file) {
            fileName = Object.keys(file)[0];
            fixWebmAudio(fileName);
        });
    }

    app.ws('/', function (ws, req) {
        sockets.push(ws);
        console.log('new connection established');
        var fileName = uuid.v1();
        var videoCounter = 0;
        var fileType = videoFileExtension;
        ws.on('message', function(data) {
            if (data instanceof Buffer) {
                console.log('got binary data');
                videoCounter++;
                console.log(fileType);
                writeOrAppendData(data, fileName, fileType, videoCounter, ws)
            } else if (JSON.parse(data).id && !JSON.parse(data).completedVideo) {
                var conferenceID = JSON.parse(data).id;
                var conferencePair = conferences[conferenceID];
                console.log(conferencePair);
                if (!conferencePair) {
                    conferences[conferenceID] = [{ fileName: false }];
                } else {
                    conferencePair.push({ fileName: false });
                }
            } else if (JSON.parse(data).id && JSON.parse(data).completedVideo) {
                var data = JSON.parse(data);
                conferencePair(data.id).forEach(function (participant) {
                    if (participant[completedVideo] === false) {
                        participant[completedVideo] = true;
                    }
                });
                if (allVideosRecorded(data.id)) {
                    compileConferenceVideos(data.id);
                }
            } else {
                console.log(JSON.parse(data));
                broadcast(data);
            }
        });
    });
};