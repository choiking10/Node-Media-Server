#!/bin/bash

route add -net 10.0.0.0 netmask 255.0.0.0 dev wlan1
route del -net 10.0.0.0 netmask 255.0.0.0 dev wlan0

arp -i wlan0 -d 10.0.10.1
arp -i wlan0 -d 10.0.20.1

arp -i wlan1 -s 10.0.10.1 20:00:00:00:00:10
arp -i wlan1 -s 10.0.20.1 20:00:00:00:00:10

arping -w 0.05 -c 1 -I wlan1 10.16.1.1

