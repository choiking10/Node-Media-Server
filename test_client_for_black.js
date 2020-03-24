
const EDGE_JUPITER_IP = "10.0.10.1";
const EDGE_EARTH_IP = "10.0.20.1";

const NodeRtmpClient = require('./node_rtmp_client');
const research_utils = require('./research_utils');

const poll_addr = "127.0.0.1";
const push_addr = "143.248.55.86";
const stream_key = "wins";

let pull_jupiter = new NodeRtmpClient(
    'rtmp://' + EDGE_JUPITER_IP + '/live/' + stream_key,
    "black_from_jupiter"
);

let pull_earth = new NodeRtmpClient(
    'rtmp://' + EDGE_EARTH_IP + '/live/' + stream_key,
    "black_from_earth"
);
// rtmp://143.248.55.86:31935/live/wins

//let rtmp_pushing_to_server_client = new NodeRtmpClient('rtmp://' + push_addr + '/live/' + stream_key);
//let rtmp_polling_from_server_client = new NodeRtmpClient('rtmp://' + push_addr + '/live/' + stream_key);
/*
* obs studio ->
* (node_rtmp_server local) ->
* rtmp_polling_client ->
* rtmp_pushing_to_server_client ->
* (node_rtmp_server remote) ->
* rtmp_polling_from_server_client
* */


async function run_pulling(pulling_client) {
    pulling_client.startPull();
    pulling_client.on('video', (videoData, timestamp) => {
        if(videoData != null)
            research_utils.appendLog(['black', timestamp, videoData.length], "black_pulling.csv");
        else
            research_utils.appendLog(['black', timestamp, "null"], "black_pulling.csv");

    });
}

run_pulling(pull_earth);
run_pulling(pull_jupiter);

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