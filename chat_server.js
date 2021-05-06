
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const research_utils = require('./research_utils');
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
setInterval(()=>io.emit('chat message', "test"), 200);
io.on('connection', (socket) => {
        console.log('a user connected');
            socket.on('chat message', (msg) => {
                        io.emit('chat message', msg);
                                console.log(research_utils.getTimestampMicro() + " " + msg)
                                        });
                socket.on('disconnect', () => {
                            console.log('user disconnected');
                                });
});
http.listen(3000, () => {
        console.log('Connected at 3000');
});
