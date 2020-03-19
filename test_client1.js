const NodeMediaServer = require('./');

const NodeRtmpClient = require('./node_rtmp_client');
const research_utils = require('./research_utils');

const poll_addr = "127.0.0.1";
const push_addr = "143.248.55.86";
const stream_key = "wins";

let rtmp_polling_client = new NodeRtmpClient('rtmp://' + poll_addr + '/live/' + stream_key);
let rtmp_pushing_to_server_client = new NodeRtmpClient('rtmp://' + push_addr + '/live/' + stream_key);
let rtmp_polling_from_server_client = new NodeRtmpClient('rtmp://' + push_addr + '/live/' + stream_key);
/*
* obs studio ->
* (node_rtmp_server local) ->
* rtmp_polling_client ->
* rtmp_pushing_to_server_client ->
* (node_rtmp_server remote) ->
* rtmp_polling_from_server_client
* */

rtmp_polling_client.on('video', (videoData, timestamp) => {
    research_utils.appendLog([timestamp, 'rtmp_polling_client']);
    rtmp_pushing_to_server_client.pushVideo(videoData, timestamp);
});
rtmp_polling_from_server_client.on('video', (videoData, timestamp) => {
    research_utils.appendLog(
        [timestamp, 'rtmp_polling_from_server_client']
    );
});

async function run_rtmp_polling_client() {
    rtmp_polling_client.startPull();
}
async function run_rtmp_pushing_to_server_client() {
    rtmp_pushing_to_server_client.startPush();
}
async function run_rtmp_polling_from_server_client() {
    rtmp_polling_from_server_client.startPull();
}

run_rtmp_polling_client();
run_rtmp_pushing_to_server_client();
run_rtmp_polling_from_server_client();
