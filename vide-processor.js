'use strict';

var fs = require('fs');
var exec = require('child_process').exec;
var uuid = require('node-uuid');
var videoFileExtension = '.webm';
var audioFileExtension = '.ogg';

module.exports = function (app) {

    app.ws('/', function (ws, req) {
        var fileName = uuid.v1();

        ws.on('message', function(data) {
        });
    });
};