const POLL_FROM_ME = "127.0.0.1";
const EDGE_JUPITER_IP = "10.0.10.1";
const EDGE_EARTH_IP = "10.0.20.1";

const NodeRtmpClient = require('./node_rtmp_client');
const research_utils = require('./research_utils');


let rtmp_polling_client = new NodeRtmpClient(
    'rtmp://' + POLL_FROM_ME + '/live/wins',
    "blue_send"
);
let publish_to_jupiter = new NodeRtmpClient('rtmp://' +
    EDGE_JUPITER_IP + '/live/wins');
let publish_to_earth = new NodeRtmpClient('rtmp://' +
    EDGE_EARTH_IP + '/live/wins');


rtmp_polling_client.on('video', (videoData, timestamp) => {
    research_utils.appendLog(['jupiter', timestamp, videoData.length], "blue_publish.csv");
    publish_to_jupiter.pushVideo(videoData, timestamp);
    research_utils.appendLog(['earth', timestamp, videoData.length], "blue_publish.csv");
    publish_to_earth.pushVideo(videoData, timestamp);
    //rtmp_pushing_to_server_client.pushVideo(videoData, timestamp);
});

async function run_rtmp_polling_client() {
    rtmp_polling_client.startPull();
    console.log("rtmp_polling_client start");
}

async function run_publush(publish_client, tag) {
    publish_client.startPush();
    console.log(tag + "publish start");
}

run_publush(publish_to_earth, "earth");
run_publush(publish_to_jupiter, "jupiter");
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