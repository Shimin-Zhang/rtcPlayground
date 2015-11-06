'use strict';

var fs = require('fs');
var exec = require('child_process').exec;
var uuid = require('node-uuid');
var videoFileExtension = '.webm';
var blobs = [];
function writeOrAppendData(data, fileName, ws) {
    var filePath = './uploads/';
    if (!fs.existsSync(filePath + fileName + videoFileExtension)) {
        console.log('writing original file');
        ws.send(fileName);
        fs.writeFileSync(filePath + fileName + videoFileExtension, data);
    } else {
        console.log('appending File')
        fs.appendFileSync(filePath + fileName + videoFileExtension, data);
    }
}

module.exports = function (app) {
    app.ws('/', function (ws, req) {
        var fileName = uuid.v1();
        console.log('new connection established');
        ws.on('message', function(data) {
            if (data instanceof Buffer) {
                console.log('got binary data');
                writeOrAppendData(data, fileName, ws);
            }
        });
        ws.send(fileName);
    });
};