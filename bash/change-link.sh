#!/bin/bash

ap_list=(
		"jupiter1" "jupiter2"
		"earth1" "earth2"
		"moon1" "moon2"
)
ap_mac_list=(
		"20:00:00:00:00:10" "20:00:00:00:00:11" 
		"20:00:00:00:01:10" "20:00:00:00:01:11" 
		"20:00:00:00:02:10" "20:00:00:00:02:11"
)
ap_ip_list=(
		"10.0.10.1" "10.0.10.1"  
		"10.0.20.1" "10.0.20.1"  
		"10.0.30.1" "10.0.30.1" 
)



if [ $# -ne 2 ]; then
    echo "Usage: $0 dev_name network_number"
    echo "dev_name : wlan0 or wlan1"
    echo "network_name : 0 to 5" 
    echo "please check wpa_cli -i wlan1 list_networks"
    exit -1
fi


my_dev=$1 # wlan0 or wlan1

p_ap=${ap_list[$2]}
p_mac=${ap_mac_list[$2]}
p_ip=${ap_ip_list[$2]}


echo "device_select: ${my_dev}"
echo "network info:"
echo "\tssid: ${p_ap} ${p_ip}[${p_mac}]"


echo "wpa_cli -i ${my_dev} select_network $2"
echo "arp -i ${my_dev} -s ${p_ip} ${p_mac}"
echo "arp -i ${my_dev} -s 10.64.0.2 ${p_mac}"
echo "arping -w 0.05 -c 1 -f -I ${my_dev} ${p_ip}"

wpa_cli -i ${my_dev} select_network $2
arp -i ${my_dev} -s ${p_ip} ${p_mac}
arp -i ${my_dev} -s 10.64.0.2 ${p_mac}

arping -w 0.05 -c 1 -f -I ${my_dev} ${p_ip}
#ping -i 0.05 -c 80 -W 0.05 -w 4 ${p_ip}

