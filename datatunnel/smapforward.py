import socket
import copy
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
voltageuuids = streams.get('voltageuuids', {})
currentuuids = streams.get('currentuuids', {})
paths = streams.get('paths', {})

server = "http://54.84.37.77:8079/add/plugstrip"
serverquery = "http://54.84.37.77:8079/api/query"

sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
sock.bind(("::", 5555))

payload = {
    "Metadata": {
        "SourceName": "IDD 2015",
        "Location": {
            "City": "Berkeley",
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
    mac = "00:12:6d:02:"+addr[-4:-2]+":"+addr[-2:]
    if mac not in stateuuids:
        stateuuids[mac] = str(uuid.uuid1())
    if mac not in poweruuids:
        poweruuids[mac] = str(uuid.uuid1())
    if mac not in voltageuuids:
        voltageuuids[mac] = str(uuid.uuid1())
    if mac not in currentuuids:
        currentuuids[mac] = str(uuid.uuid1())
    if mac not in paths:
        paths[mac] = "/plugstrip/strip"+str(len(paths))
    streams['stateuuids'] = stateuuids
    streams['poweruuids'] = poweruuids
    streams['voltageuuids'] = voltageuuids
    streams['currentuuids'] = currentuuids
    streams['paths'] = paths
    json.dump(streams, open('streams.json','w'))
    res = msgpack.unpackb(data)
    # {'current': 4, 'state': 0, 'voltage': 208, 'power': 832}
    current = float(res['current'])
    state = float(res['state'])
    voltage = float(res['voltage'])
    power = float(res['power'])
    path = paths[mac]
    print addr, mac, uuid.uuid3(namespace, mac)
    payload["Metadata"]["Plugstrip"] = str(uuid.uuid3(namespace, mac))
    payload["Metadata"]["Address"] = addr
    payload["Metadata"]["Port"] = 5555
    message = {}
    message[path+'/state'] = copy.deepcopy(payload)
    message[path+'/state']["uuid"] = stateuuids[mac]
    message[path+'/state']["Readings"] = [[int(time.time()), state]]
    message[path+'/state']["Properties"]["UnitofMeasure"] = "On/Off"
    message[path+'/state']["Metadata"]["Point"] = {}
    message[path+'/state']["Metadata"]["Point"]["Type"] = "Reading"
    message[path+'/state']["Metadata"]["Point"]["Measure"] = "State"

    message[path+'/power'] = copy.deepcopy(payload)
    message[path+'/power']["uuid"] = poweruuids[mac]
    message[path+'/power']["Readings"] = [[int(time.time()), power]]
    message[path+'/power']["Properties"]["UnitofMeasure"] = "W"
    message[path+'/power']["Metadata"]["Point"] = {}
    message[path+'/power']["Metadata"]["Point"]["Type"] = "Sensor"
    message[path+'/power']["Metadata"]["Point"]["Measure"] = "Power"

    message[path+'/voltage'] = copy.deepcopy(payload)
    message[path+'/voltage']["uuid"] = voltageuuids[mac]
    message[path+'/voltage']["Readings"] = [[int(time.time()), voltage]]
    message[path+'/voltage']["Properties"]["UnitofMeasure"] = "V"
    message[path+'/voltage']["Metadata"]["Point"] = {}
    message[path+'/voltage']["Metadata"]["Point"]["Type"] = "Sensor"
    message[path+'/voltage']["Metadata"]["Point"]["Measure"] = "Voltage"

    message[path+'/current'] = copy.deepcopy(payload)
    message[path+'/current']["uuid"] = currentuuids[mac]
    message[path+'/current']["Readings"] = [[int(time.time()), current]]
    message[path+'/current']["Properties"]["UnitofMeasure"] = "A"
    message[path+'/current']["Metadata"]["Point"] = {}
    message[path+'/current']["Metadata"]["Point"]["Type"] = "Sensor"
    message[path+'/current']["Metadata"]["Point"]["Measure"] = "Current"
    print message
    resp = requests.post(server, data=json.dumps(message))
    print resp.ok, resp.content

