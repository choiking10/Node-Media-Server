#!/bin/bash

scp -o StrictHostKeyChecking=no -P 2223 -r wins@143.248.55.86:~/yh/Node-Media-Server/log/* ../used/
scp -o StrictHostKeyChecking=no -r wins@143.248.55.86:~/yh/Node-Media-Server/log/* ../used/
#scp -o StrictHostKeyChecking=no -P 10011 -r wins@143.248.55.86:~/yh/nms/Node-Media-Server/log/* ../used/
#scp -o StrictHostKeyChecking=no -P 10012 -r wins@143.248.55.86:~/yh/nms/Node-Media-Server/log/* ../used/
#scp -o StrictHostKeyChecking=no -P 10013 -r wins@143.248.55.86:~/yh/nms/Node-Media-Server/log/* ../used/
