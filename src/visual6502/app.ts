
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var path = require('path');


app.use(express.static(__dirname + '/../../node_modules'));
app.use(express.static(__dirname + '/web'));

app.get('/', function(req: any, res: any) {
    res.sendFile(path.resolve(__dirname + '/web/index.html'));
});

server.listen(3000);
