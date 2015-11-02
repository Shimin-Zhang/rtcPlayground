'use strict';

var fs = require('fs');
var exec = require('child_process').exec;
var uuid = require('node-uuid');
var videoFileExtension = '.webm';
var audioFileExtension = '.ogg';
var fileName;
var blobs = [];
function writeOrAppendData(data, ws) {
    var filePath = './uploads/';
    if (!fileName) {
        fileName = uuid.v1();
        console.log('writing original file');
        ws.send(fileName);
        // var fileBuffer = new Uint8Array(data);
        fs.writeFileSync(filePath + fileName + videoFileExtension, data);
    } else {
        console.log('appending File')
        fs.appendFileSync(filePath + fileName + videoFileExtension, data);
    }
}

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

module.exports = function (app) {
    app.ws('/', function (ws, req) {
        ws.on('message', function(data) {
        console.log(data);
        if (data instanceof Buffer)
            console.log('got binary data');
            writeOrAppendData(data, ws)
        });
    });
};