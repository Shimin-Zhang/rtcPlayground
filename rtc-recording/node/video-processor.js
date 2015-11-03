'use strict';

var fs = require('fs');
var exec = require('child_process').exec;
var uuid = require('node-uuid');
var videoFileExtension = '.webm';
var blobs = [];
function writeOrAppendData(data, fileName, ws) {

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
        ws.on('message', function(data) {
            if (data instanceof Buffer) {
                console.log('got binary data');
                writeOrAppendData(data, fileName, ws)
            } else {
                console.log(JSON.parse(data));
                broadcast(data);
            }
        });
    });
};