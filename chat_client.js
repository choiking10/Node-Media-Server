
const io = require('socket.io-client');
socket = io.connect('http://10.0.10.1:3000');
const research_utils = require('./research_utils');

const readline = require("readline");
const rl = readline.createInterface({
        input: process.stdin,
            output: process.stdout
});

rl.on("line", function(line) {
        socket.emit('chat message', research_utils.getTimestampMicro() + ":" + line);

}).on("close", function() {
        process.exit();
});

socket.on('chat message', (msg) => {
        let delay = research_utils.getTimestampMicro() - parseInt(msg.split(':')[0]);
 //           console.log(delay + "ms " + msg.split(':')[1]);
});
