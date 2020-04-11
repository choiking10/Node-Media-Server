const NodeMediaServer = require('./');

const NodeRtmpClient = require('./node_rtmp_edge_change_client');
const research_utils = require('./research_utils');
const Logger = require('./node_core_logger');

const poll_addr = "127.0.0.1";
const push_addr = "127.0.0.1";
const stream_key = "wins2";
const changeAddr = [
    ["127.0.0.1", 1936],
    ["127.0.0.1", 1935]
];

let count = 0;
let rtmp_polling_client = new NodeRtmpClient(
    'rtmp://' + poll_addr + '/live/' + "wins",
    "my_id"
);
// rtmp://143.248.55.86:31935/live/wins

let rtmp_pushing_to_server_client = new NodeRtmpClient(
    'rtmp://' + push_addr + '/live/' + stream_key, "[BROADCASTER]");
let rtmp_polling_from_server_client = new NodeRtmpClient(
    'rtmp://' + push_addr + '/live/' + stream_key, "[VIEWER]");

/*
* obs studio ->
* (node_rtmp_server local) ->
* rtmp_polling_client ->
* (node_rtmp_server local) ->
* rtmp_pushing_to_server_client ->
* (node_rtmp_server remote) ->
* rtmp_polling_from_server_client
* */

rtmp_polling_client.on('video', (videoData, timestamp) => {
    // research_utils.appendLog([timestamp, 'rtmp_polling_client']);
    rtmp_pushing_to_server_client.pushVideo(videoData, timestamp);
    console.log( research_utils.getTimestamp() + rtmp_pushing_to_server_client.connection_id + " I send ["
        + rtmp_pushing_to_server_client.activeClient.info.port + "]" + timestamp +" length : " + videoData.length);
});
let timeoutId = -1;

setInterval(() => {
    if (timeoutId != -1) {
        clearTimeout(timeoutId);
    }
    let addr = changeAddr[count++ % changeAddr.length];
    rtmp_pushing_to_server_client.readyEdgeChange(addr[0], addr[1]);
    timeoutId = setTimeout(() => {rtmp_pushing_to_server_client.DoEdgeChange();}, 1000);
    console.log( research_utils.getTimestamp()  + rtmp_pushing_to_server_client.connection_id + " change addr! to " + [addr[0], addr[1]]);
}, 200000);

rtmp_polling_from_server_client.on('video', (videoData, timestamp) => {
    console.log( research_utils.getTimestamp() +  rtmp_polling_from_server_client.connection_id + " I recv ["
    + rtmp_polling_from_server_client.activeClient.info.port + "]" + timestamp +" length : " + videoData.length);
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

