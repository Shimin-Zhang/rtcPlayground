'use strict';

// setup default env variables
var path = require('path');
var express = require('express');
var expressWss = require('express-ws')(express());

var appWs = expressWss.app;

appWs.use('/uploads',express.static('./uploads'));

require('./video-processor')(appWs);

var port = Number(process.env.PORT || 7000);

appWs.listen(port, function () {
    console.log('Listening on port:' + port);
});
