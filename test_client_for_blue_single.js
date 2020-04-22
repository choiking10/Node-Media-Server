const exec = require('child_process').exec;



let POLL_FROM_ME = "127.0.0.1";
let EDGE_JUPITER_IP = "10.0.10.1";
let EDGE_EARTH_IP = "10.0.20.1";
let EDGE_JUPITER_PORT = 1935;
let EDGE_EARTH_PORT = 1935;

if(LOCAL_TEST) {
    EDGE_JUPITER_IP = "127.0.0.1";
    EDGE_EARTH_IP = "127.0.0.1";
    EDGE_JUPITER_PORT = 1935;
    EDGE_EARTH_PORT = 1936;
}

const NodeRtmpEdgeChangeClient = require('./node_rtmp_edge_change_client');
const research_utils = require('./research_utils');
const changeAddr = [
    [EDGE_EARTH_IP, EDGE_JUPITER_PORT],
    [EDGE_JUPITER_IP, EDGE_EARTH_PORT]
];
const handOffScript = [
    'sh bash/route_to_earth.sh',
    'sh bash/route_to_jupiter.sh'
];

const STRATEGY_DO_YOUR_SELF = 0;
const STRATEGY_HARD_HAND_OFF = 1;
const STRATEGY_AFTER_FIXED_TIME = 2;
const STRATEGY_BEFORE_I_FRAME = 3;
const STRATEGY_AFTER_I_FRAME = 4;


let rtmp_polling_client = new NodeRtmpEdgeChangeClient(
    'rtmp://' + POLL_FROM_ME + '/live/wins',
    "blue_send"
);
let publisher = new NodeRtmpEdgeChangeClient('rtmp://' +
    changeAddr[1][0] + '/live/wins2', 'blue-publisher');

let count = 0;
let timeoutId = -1;

publisher.setEdgeChangeStrategy(parseInt(process.argv[2]));

setInterval(() => {
    if (timeoutId != -1) {
        clearTimeout(timeoutId);
    }
    exec(handOffScript[count]);
    let addr = changeAddr[count++ % changeAddr.length];
    console.log( research_utils.getTimestamp()  + " " +
        publisher.connection_id + " try to change addr! to " + [addr[0], addr[1]]);

    publisher.readyEdgeChange(addr[0], addr[1]);
}, 20000);


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