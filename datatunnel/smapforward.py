import socket
import time
import msgpack
import random
import json
import requests
import uuid
import os

namespace = uuid.UUID('9e7440b8-92fc-11e5-8bb3-0cc47a0f7eea')

if os.path.exists('streams.json'):
    streams = json.load(open('streams.json'))
else:
    streams = {}

stateuuids = streams.get('stateuuids', {})
poweruuids = streams.get('poweruuids', {})
paths = streams.get('paths', {})

server = "http://localhost:8079/add/apikey"

sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
sock.bind(("::", 5555))

payload = {
    "Metadata": {
        "SourceName": "IDD 2015",
        "Location": {
            "City": "Berkeley",
            "Building": "Jacobs",
        },
	"Type": "plugstrip",
    },
    "Properties": {
        "Timezone": "America/Los_Angeles",
        "ReadingType": "double",
        "UnitofMeasure": "On/Off",
        "UnitofTime": "s",
        "StreamType": "numeric"
    },
}

while True:
    data, addr = sock.recvfrom(1024)
    addr=addr[0]
    if addr not in stateuuids:
        stateuuids[addr] = str(uuid.uuid1())
    if addr not in poweruuids:
        poweruuids[addr] = str(uuid.uuid1())
    if addr not in paths:
        paths[addr] = "/plugstrip/strip"+str(len(paths)+1)
    streams['stateuuids'] = stateuuids
    streams['poweruuids'] = poweruuids
    streams['paths'] = paths
    json.dump(streams, open('streams.json','w'))
    print addr, data
    res = msgpack.unpackb(data)
    data = res['val']
    mac = res['mac']
    path = paths[addr]
    print uuid.uuid3(namespace, mac)
    message = {}
    message[path+'/state'] = payload.copy()
    message[path+'/state']["uuid"] = stateuuids[addr]
    message[path+'/state']["Readings"] = [[int(time.time()), int(data)]]
    message[path+'/state']["Metadata"]["Point"] = {}
    message[path+'/state']["Metadata"]["Point"]["Type"] = "Reading"
    message[path+'/state']["Metadata"]["Point"]["Measure"] = "State"

    message[path+'/power'] = payload.copy()
    message[path+'/power']["uuid"] = poweruuids[addr]
    message[path+'/power']["Readings"] = [[int(time.time()), 4.5*int(data)+random.random()*0.5*int(data)]]
    message[path+'/power']["Properties"]["UnitofMeasure"] = "W"
    message[path+'/power']["Metadata"]["Point"] = {}
    message[path+'/power']["Metadata"]["Point"]["Type"] = "Sensor"
    message[path+'/power']["Metadata"]["Point"]["Measure"] = "Power"
    print message
    resp = requests.post(server, data=json.dumps(message))
    print resp.ok, resp.content

