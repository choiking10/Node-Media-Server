#!/bin/bash

route add -net 10.0.0.0 netmask 255.0.0.0 dev wlan0
route del -net 10.0.0.0 netmask 255.0.0.0 dev wlan1

arp -i wlan1 -d  10.0.10.1
arp -i wlan1 -d 10.0.20.1

arp -i wlan0 -s 10.0.10.1 20:00:00:00:01:10
arp -i wlan0 -s 10.0.20.1 20:00:00:00:01:10

arping -w 0.05 -c 1 -I wlan0 10.32.1.1
