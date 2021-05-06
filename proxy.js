const exec = require('child_process').exec;

const research_utils = require('./research_utils');
const NodeRtmpEdgeChangeClient = require('./node_rtmp_edge_change_client');

const STRATEGY_DO_YOUR_SELF = 0;
const STRATEGY_HARD_HAND_OFF = 1;
const STRATEGY_AFTER_FIXED_TIME = 2;
const STRATEGY_BEFORE_I_FRAME = 3;
const STRATEGY_AFTER_I_FRAME = 4;

const NUMBER_OF_NETWORK = 6;

const LOCAL_TEST = false;

let POLL_FROM_ME = "127.0.0.1";
let EDGE_JUPITER_IP = "10.0.10.1";
let EDGE_EARTH_IP = "10.0.20.1";
let EDGE_MOON_IP = "10.0.30.1";
let EDGE_JUPITER_PORT = 1935;
let EDGE_EARTH_PORT = 1935;
let EDGE_MOON_PORT = 1935;

if(LOCAL_TEST) {
    EDGE_JUPITER_IP = "127.0.0.1";
    EDGE_EARTH_IP = "127.0.0.1";
    EDGE_MOON_IP = "127.0.0.1";
    EDGE_JUPITER_PORT = 1935;
    EDGE_EARTH_PORT = 1936;
    EDGE_MOON_PORT = 1937;
}


let net_number = 0;
let timeoutId = -1;

let rtmp_polling_client = new NodeRtmpEdgeChangeClient(
    'rtmp://' + POLL_FROM_ME + '/live/wins2',
    "blue_send"
);
let publisher = new NodeRtmpEdgeChangeClient('rtmp://' +
    EDGE_EARTH_IP + '/live/proxy', 'blue-publisher');

publisher.setEdgeChangeStrategy(2);

setTimeout(() => {
    if (timeoutId != -1) {
        clearTimeout(timeoutId);
    }

    publisher.setNextIpPort(EDGE_EARTH_IP, 1935);
    publisher.readyEdgeChange([[EDGE_EARTH_IP, 1935]]);

}, 3000000000);


rtmp_polling_client.on('video', (videoData, timestamp) => {
    publisher.pushVideo(videoData, timestamp);
});

async function run_rtmp_polling_client() {
    rtmp_polling_client.startPull();
    console.log("rtmp_polling_client start");
}

async function run_publush(publish_client) {
    publish_client.startPush();
}

run_publush(publisher);
run_rtmp_polling_client();

// rtmp://143.248.55.86:31935/live/wins

//
//let rtmp_polling_from_server_client = new NodeRtmpClient('rtmp://' + push_addr + '/live/' + stream_key);
/*
* obs studio ->
* (node_rtmp_server local) ->
* rtmp_polling_client ->
* rtmp_pushing_to_server_client ->
* (node_rtmp_server remote) ->
* rtmp_polling_from_server_client
* */

/*
rtmp_polling_from_server_client.on('video', (videoData, timestamp) => {
    research_utils.appendLog(
        [timestamp, 'rtmp_polling_from_server_client']
    );

});

async function run_rtmp_pushing_to_server_client() {
    rtmp_pushing_to_server_client.startPush();
}
async function run_rtmp_polling_from_server_client() {
    rtmp_polling_from_server_client.startPull();
}

run_rtmp_polling_client();
run_rtmp_pushing_to_server_client();
run_rtmp_polling_from_server_client();
*/
