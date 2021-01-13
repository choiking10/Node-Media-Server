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
		"10.0.10.1" "10.16.2.1"  
		"10.0.20.1" "10.32.2.1"  
		"10.0.30.1" "10.48.2.1" 
)

if [ $# -ne 3 ]; then
    echo "Usage: $0 dev_from dev_to network_number"
    echo "dev_from : wlan0 or wlan1"
    echo "dev_to : wlan1 or wlan0"
    echo "network_name : 0 to 5" 
    echo "please check wpa_cli -i wlan1 list_networks"
    exit -1
fi

dev_from=$1 # wlan1 or wlan0
dev_to=$2 # wlan0 or wlan1
p_ap=${ap_list[$3]}
p_mac=${ap_mac_list[$3]}
p_ip=${ap_ip_list[$3]}


echo "device_from: ${dev_from} device_to: ${dev_to}"
echo "network info:"
echo "\tssid: ${p_ap} ${p_ip}[${p_mac}]"

route add -net 10.0.0.0 netmask 255.0.0.0 dev $dev_to
route del -net 10.0.0.0 netmask 255.0.0.0 dev $dev_from

arp -i $dev_from -d 10.0.10.1
arp -i $dev_from -d 10.0.20.1

arp -i $dev_to -s 10.0.10.1 $p_mac
arp -i $dev_to -s 10.0.20.1 $p_mac

arping -w 0.05 -c 20 -f -I $dev_to $p_ip
