'use strict';

var fs = require('fs');
var exec = require('child_process').exec;
var uuid = require('node-uuid');
var videoFileExtension = '.webm';
var audioFileExtension = '.ogg';
var blobs = [];
function writeOrAppendData(data, fileName, fileType, videoCounter, ws) {
    var filePath = './uploads/';
    if (!fs.existsSync(filePath + fileName + fileType)) {
        console.log('writing original file');
        ws.send(JSON.stringify({fileName: fileName}));
        fs.writeFileSync(filePath + fileName + fileType, data);
        ws.send(JSON.stringify({ part: videoCounter }));
    } else {
        console.log('appending File')
        fs.appendFileSync(filePath + fileName + fileType, data);
        ws.send(JSON.stringify({ part: videoCounter }));
    }
}

module.exports = function (app) {
    var sockets = [];

    function broadcast(data) {
        console.log('trying to broadcast data');
        console.log(data);
        console.log(sockets.length);
        sockets.forEach(function (socket) {
            socket.send(data);
        });
    };

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
            } else if (JSON.parse(data).recordAudio) {
                console.log('audio file ex');
                fileType = audioFileExtension;
            } else {
                console.log(JSON.parse(data));
                broadcast(data);
            }
        });
    });
};