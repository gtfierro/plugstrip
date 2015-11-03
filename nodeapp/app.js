// dependencies
var express = require('express');
var path = require('path');
var WebSocket = require('ws');
var _ = require('underscore');
var config = require('./config');
var moment = require('moment');
var exphbs  = require('express-handlebars');
var http = require('http');
var request = require('request');
var bodyParser = require('body-parser');
var dgram = require('dgram');

// server setup
var app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(express.static('public'))
app.use(express.static('node_modules'))
app.use(bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));


app.get('/', function(req, res) {
    res.render('index', {layout: false});
});

app.get('/index', function(req, res) {
    res.render('index', {layout: false});
});

var s = dgram.createSocket('udp6');
s.bind(5555);

app.get('/on', function(req, res) {
    var msg = new Buffer("1");
    s.send(msg, 0, 1, 5555, "2001:470:4112:2:212:6d02::f00f", function(err) {
        console.error(err);
    });
    res.end();
});

app.get('/off', function(req, res) {
    var msg = new Buffer("0");
    s.send(msg, 0, 1, 5555, "2001:470:4112:2:212:6d02::f00f", function(err) {
        console.error(err);
    });
    res.end();
});

var server = app.listen(config.port, config.host);
console.log('Server listening on port '+config.port);

// keep track of mapping from subscriptions to the queries for those subscriptions
var wsconns = {};

// socket.io setup
var io = require('socket.io')(server);

console.log(config);

// socket.io triggers (server <-> clients/reactjs)
io.on('connection', function (socket) {
    console.log('New client connected!');

    // listen for a new subscription
    socket.on('new subscribe', function(msg) {

        // check if we already have a websocket for that connection.
        // If we already do, ignore.
        if (!_.has(wsconns, msg)) {
            console.log('new subscribe req', msg);

            // create a websocket for that subscription
            wsconns[msg] = new WebSocket(config.wsArchiverUrl+'/republish');

            // on opening the websocket, send the query message
            wsconns[msg].on('open', function open() {
                var sendmsg;
                if (msg.length > 0) {
                    sendmsg = msg;
                }
                console.log("SUBSCRIBE TO", sendmsg);
                wsconns[msg].send(sendmsg);
                console.log('opened', sendmsg);
            });

            // when we receive a message from the server, emit the result
            // back to each of the clients
            wsconns[msg].on('message', function(data, flags) {
                io.emit(msg, JSON.parse(data));
            });

            wsconns[msg].on('close', function() {
                console.log('disconnected!');
            });
        }
    });
});
