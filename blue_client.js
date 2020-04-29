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

const changeAddr = [
    [EDGE_JUPITER_IP, EDGE_JUPITER_PORT],
    [EDGE_JUPITER_IP, EDGE_JUPITER_PORT],
    [EDGE_EARTH_IP, EDGE_EARTH_PORT],
    [EDGE_EARTH_IP, EDGE_EARTH_PORT],
    [EDGE_MOON_IP, EDGE_MOON_PORT],
    [EDGE_MOON_IP, EDGE_MOON_PORT],
    [EDGE_MOON_IP, EDGE_MOON_PORT],
    [EDGE_EARTH_IP, EDGE_EARTH_PORT],
    [EDGE_EARTH_IP, EDGE_EARTH_PORT],
    [EDGE_JUPITER_IP, EDGE_JUPITER_PORT],
];

const candidateEdgesList = [
    [[EDGE_EARTH_IP, EDGE_EARTH_PORT],],
    [[EDGE_EARTH_IP, EDGE_EARTH_PORT],],
    [[EDGE_JUPITER_IP, EDGE_JUPITER_PORT],[EDGE_MOON_IP, EDGE_MOON_PORT],],
    [[EDGE_JUPITER_IP, EDGE_JUPITER_PORT],[EDGE_MOON_IP, EDGE_MOON_PORT],],
    [[EDGE_EARTH_IP, EDGE_EARTH_PORT],],
    [[EDGE_EARTH_IP, EDGE_EARTH_PORT],],
    [[EDGE_EARTH_IP, EDGE_EARTH_PORT],],
    [[EDGE_JUPITER_IP, EDGE_JUPITER_PORT],[EDGE_MOON_IP, EDGE_MOON_PORT],],
    [[EDGE_JUPITER_IP, EDGE_JUPITER_PORT],[EDGE_MOON_IP, EDGE_MOON_PORT],],
    [[EDGE_EARTH_IP, EDGE_EARTH_PORT],],
];
const netNumberList = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1]
const devName = [
    'wlan0',
    'wlan1'
];


let net_number = 0;
let timeoutId = -1;

const fromDev = devName[net_number % 2];
const toDev = devName[(net_number + 1) % 2];

const initHandOffSequence = [
    '/bin/bash bash/change-link.sh ' + devName[net_number % 2] + " " + netNumberList[net_number % 10],
    '/bin/bash bash/change-link.sh ' + devName[(net_number+1) % 2] + " " + netNumberList[(net_number+1) % 10],
    '/bin/bash bash/soft-handoff.sh ' + toDev + " " + fromDev + " " + netNumberList[net_number % 10],
];

let rtmp_polling_client = new NodeRtmpEdgeChangeClient(
    'rtmp://' + POLL_FROM_ME + '/live/wins',
    "blue_send"
);
let publisher = new NodeRtmpEdgeChangeClient('rtmp://' +
    changeAddr[Math.floor(net_number / 2) % changeAddr.length][0] + '/live/wins2', 'blue-publisher');

publisher.setEdgeChangeStrategy(1);

for(let cmd of initHandOffSequence) {
    if(!LOCAL_TEST) {
        exec(cmd);
    }
    console.log(cmd);
}

function handoff(network_number) {
    let from_net = network_number - 1;
    let to_net = network_number;
    let next_net = network_number + 1;

    let dev_from = devName[from_net % 2];
    let dev_to = devName[to_net % 2];
    let dev_next = devName[next_net % 2];

    from_net = netNumberList[from_net % 10];
    to_net = netNumberList[to_net % 10];
    next_net = netNumberList[next_net % 10];

    let linkChangeExec = "/bin/bash bash/change-link.sh " + dev_next + " " + next_net;
    let softHandoffExec = "/bin/bash bash/soft-handoff.sh " +  dev_from + " " +  dev_to + " "  + to_net;

    console.log(research_utils.getTimestampMicro() + " " + softHandoffExec);
    console.log(research_utils.getTimestampMicro() + " " + linkChangeExec);

    if(!LOCAL_TEST) {
        let output = exec(softHandoffExec);
        output.on('data', (data)=>{
            console.log(research_utils.getTimestampMicro() + " " + data);
        });
        exec(linkChangeExec);
    }
}


setInterval(() => {
    if (timeoutId != -1) {
        clearTimeout(timeoutId);
    }
    net_number += 1;
    handoff(net_number);
    setTimeout( () => {
    let candidateEdges = candidateEdgesList[(net_number-1) % candidateEdgesList.length];

    console.log(research_utils.getTimestamp()  + " " +
        publisher.connection_id + " try to change addr! to " + candidateEdges);

    
    if(!(changeAddr[net_number % changeAddr.length][0] == changeAddr[(net_number-1) % changeAddr.length][0] &&
       changeAddr[net_number % changeAddr.length][1] == changeAddr[(net_number-1) % changeAddr.length][1]) ){
        let [ip, port] = changeAddr[net_number % changeAddr.length];
        console.log(research_utils.getTimestamp()  +" " + net_number + " set ip and port " + ip + " " + port);
        publisher.setNextIpPort(ip, port);
    }
    publisher.readyEdgeChange(candidateEdges);
    }, 100);
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
