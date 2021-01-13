
let LOCAL_TEST = false;

let EDGE_JUPITER_IP = "10.0.10.1";
let EDGE_JUPITER_PORT = 1935;


if(LOCAL_TEST) {
    EDGE_JUPITER_IP = "127.0.0.1";
    EDGE_JUPITER_PORT = 1935;
}
const NodeRtmpEdgeChangeClient = require('./node_rtmp_edge_change_client');
const stream_key = "wins2";


async function run_pulling() {
    let pull_jupiter = new NodeRtmpEdgeChangeClient(
        'rtmp://' + process.argv[2] + '/live/' + stream_key
    );
    pull_jupiter.on('video', (videoData, timestamp) => {

    });
    pull_jupiter.startPull();
}

async function run_multipolling() {
	let number = parseInt(process.argv[3]);
	for(let i = 0; i < number-1; i++) {
        //run_pulling();
		setTimeout(run_pulling, i * 100 + 1);
	}
}

run_multipolling();
run_pulling();
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
