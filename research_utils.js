
var fs = require('fs');

function getTimestamp() {
    let ptime = new Date(Date.now());
    let year = ptime.getFullYear();
    let month = ptime.getMonth();
    let date = ptime.getDate();
    let hour = ptime.getHours();
    let min = ptime.getMinutes();
    let sec = ptime.getSeconds();
    return date + '/' + month + '/' + year + ' ' + hour + ':' + min + ':' + sec + " " + ptime.getMilliseconds();
}

function appendLog(data, filename="text.txt"){
    if (!Array.isArray(data)){
        data = [data]
    }
    data = [getTimestamp()].concat(data).concat('\n');
    fs.appendFile(filename, data.join(','), function(err) {

    });
}

module.exports = {
    getTimestamp: getTimestamp,
    appendLog: appendLog
};