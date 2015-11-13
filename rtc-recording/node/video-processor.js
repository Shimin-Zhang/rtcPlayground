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

function fixWebmAudio(fileName, callback) {
    var file = filePath + fileName + videoFileExtension;
    var movFile = filePath + fileName + '.mov';
    var ffmpegcommand = 'ffmpeg -i ' + file + ' -c:v prores -c:a pcm_s16le ' + movFile;
    exec(ffmpegcommand, { maxBuffer: 20000 * 1024 }, function (error, stdout, stderr) {
        if (error) {
            console.log(error);
        } else {
            callback();
        }
    });
};

function concatVideoes(fileNames) {
    console.log('trying to concat videoes');
    var ffmpegcommand = 'ffmpeg -i ' + filePath + fileNames[0] + '.mov' +' -i ' + filePath + fileNames[1] + '.mov' + ' -filter_complex "[0:v]scale=iw/2:ih/2,pad=2*iw:ih[left];[1:v]scale=iw/2:ih/2[right];[left][right]overlay=w[out];[0:a][1:a]amerge=inputs=2[a]" -map "[out]" -map "[a]" ' + filePath + 'concated-videos' + videoFileExtension;
    exec(ffmpegcommand, { maxBuffer: 20000 * 1024 }, function (error, stdout, stderr) {
        if (error) {
            console.log(error);
        } else {
            console.log('concat finished');
        }
    });

};

module.exports = function (app) {
    var sockets = [];
    var conferences = {};

    function broadcast(data) {
        console.log('trying to broadcast data');
        console.log(data);
        sockets.forEach(function (socket) {
            socket.send(data);
        });
    };

    function allVideosRecorded(id) {
        var allRecorded = true;
        conferences[id].forEach(function (file) {
            var fileName = Object.keys(file)[0];
            if (file[fileName] === false) {
                allRecorded = false;
            }
        });
        return allRecorded;
    };

    function compileConferenceVideos(id) {
        var counter = 0;
        var fileNames = [];
        function callback() {
            counter += 1;
            console.log('compile conferece counter ' + counter);
            if (counter === 2) {
                concatVideoes(fileNames);
            }
        }
        conferences[id].forEach(function (file) {
            var fileName = Object.keys(file)[0];
            fileNames.push(fileName);
            fixWebmAudio(fileName, callback);
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
                writeOrAppendData(data, fileName, fileType, videoCounter, ws)
            } else  {
                var data = JSON.parse(data);
                console.log(data);
                if (data.id && !data.completedVideo) {
                    var conferenceID = data.id;
                    var conferencePair = conferences[conferenceID];
                    console.log(conferencePair);
                    if (!conferencePair) {
                        var obj = {};
                        obj[fileName] = false;
                        conferences[conferenceID] = [obj];
                    } else {
                        var obj = {};
                        obj[fileName] = false;
                        conferencePair.push(obj);
                    }
                } else if (data.id && data.completedVideo) {
                    conferences[data.id].forEach(function (participant) {
                        if (participant[fileName] === false) {
                            participant[fileName] = true;
                        }
                    });
                    console.log(conferences);
                    if (allVideosRecorded(data.id)) {
                        console.log('trying to compile video')
                        compileConferenceVideos(data.id);
                    }
                } else {
                    console.log(data);
                    broadcast(JSON.stringify(data));
                }
            }
        });
    });
};