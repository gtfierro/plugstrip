#!/usr/bin/env python
from flask import Flask
from flask import render_template
from flask import request

import atexit
import contextlib
import datetime
import json
import os
import requests
import socket
import threading

GILES_QUERY_ADDR = "http://54.84.37.77:8079/api/query"
PLOTTER_ADDR = "http://54.84.37.77:3000"
app = Flask(__name__)
actuation_tasks = {}
actuation_tasks_lock = threading.Lock()

def issueSmapRequest(query_string):
    r = requests.post(GILES_QUERY_ADDR, data=query_string)
    r.raise_for_status()
    return r.json()

def getMaxPeak(plug_streams, uuid_to_names):
    reading_values = [ (x["uuid"], [ y[1] for y in x["Readings"] ]) for x in plug_streams ]
    peaks = [ (uuid, max(readings)) for (uuid, readings) in reading_values ]
    max_uuid, max_val = max(peaks, key=lambda x: x[1])
    return (uuid_to_names[max_uuid], max_val)

def getMaxTotal(plug_streams, uuid_to_names):
    reading_values = [ (x["uuid"], [ y[1] for y in x["Readings"] ]) for x in plug_streams ]
    totals = [ (uuid, sum(readings)) for (uuid, readings) in reading_values ]
    max_uuid, max_val = max(totals, key=lambda x: x[1])
    return (uuid_to_names[max_uuid], max_val)

def actuatePlug(addr, port, turn_on):
    with contextlib.closing(socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)) as sock:
        if turn_on:
            sock.sendto('1', (addr, port))
        else:
            sock.sendto('0', (addr, port))

def actuateAndReschedule(addr, port, turn_on):
    timer = threading.Timer(24 * 60 * 60, actuateAndReschedule, args=(addr, port, turn_on))
    timer.daemon = True
    timer.start()
    actuatePlug(addr, port, turn_on)

def generatePermalink(uuid):
    request_params = {
        "autoupdate": True,
        "axes": [{ "axisname": "Power Consumption (W)", "streams": [uuid], "scale": [0,5], "rightside": False }],
        "streams": [{ "stream": uuid, "color": "#0000FF" }],
        "window_type": "now",
        "window_width": 60 * 60 * 10e9, # One Hour in Nanoseconds
        "tz": "America/Los_Angeles"
    }

    r = requests.post(PLOTTER_ADDR + "/s3ui_permalink", data={"permalink_data": json.dumps(request_params)})
    r.raise_for_status()
    return r.text

def launchActuationCycle(addr, port, hour, minute, turn_on):
    global actuation_tasks
    global actuation_tasks_lock

    requested_time = datetime.time(hour, minute)
    now = datetime.datetime.today()
    requested_time_today = datetime.datetime.combine(datetime.date.today(), requested_time)
    if now < requested_time_today:
        # Scheduled time is later today
        delay = (requested_time_today - now).total_seconds()
    else:
        # Scheduled time won't occur again until tomorrow
        requested_time_tomorrow = requested_time_today + datetime.timedelta(days=1)
        delay = (requested_time_tomorrow - now).total_seconds()

    if turn_on:
        args = (addr, port, True)
    else:
        args = (addr, port, False)
    timer = threading.Timer(delay, actuateAndReschedule, args)
    timer.daemon = True
    timer.start()

    task = {"addr": addr, "port": port, "hour": hour, "minute": minute, "turnOn": turn_on}
    with actuation_tasks_lock:
        actuation_tasks.append(task)

def cancelActuationCycle(addr, port, hour, minute):
    global actuation_tasks
    global actuation_tasks_lock

    with actuation_tasks_lock:
        timer = actuation_tasks.pop((addr, port, hour, minute), None)
    if timer is not None:
        timer.cancel()
        return True
    else:
        return False

@atexit.register
def writeActuationSchedule():
    with actuation_tasks_lock:
        actuation_json = json.dumps(actuation_tasks)
    with open("actuation_tasks.json", 'w') as f:
        f.write(actuation_json)

@app.route('/')
def homePage():
    plug_data = issueSmapRequest('select * where Metadata/Type="plugstrip" and Path like "power$"')
    plugs = [ {"name": x["Metadata"]["Name"], "location": x["Metadata"]["Location"],
               "owner": x["Metadata"]["Owner"], "uuid": x["uuid"]} for x in plug_data ]
    uuid_to_names = { x["uuid"]: x["Metadata"]["Name"] for x in plug_data }

    hour_data = issueSmapRequest('select data in (now-1hour, now) where Metadata/Type="plugstrip" and Path like "power$"')
    if len(hour_data) == 0:
        max_hour_total = "No data found for last hour"
        max_hour_peak = "No data found for last hour"
    else:
        max_hour_total = "{}: {} W".format(*getMaxTotal(hour_data, uuid_to_names))
        max_hour_peak = "{}: {} W".format(*getMaxPeak(hour_data, uuid_to_names))

    day_data = issueSmapRequest('select data in (now-1day, now) where Metadata/Type="plugstrip" and Path like "power$"')
    if len(day_data) == 0:
        max_day_total = "No data found for last day"
        max_day_peak = "No data found for last day"
    else:
        max_day_total = "{}: {} W".format(*getMaxTotal(day_data, uuid_to_names))
        max_day_peak = "{}: {} W".format(*getMaxPeak(day_data, uuid_to_names))

    week_data =  issueSmapRequest('select data in (now-7days, now) where Metadata/Type="plugstrip" and Path like "power$"')
    if len(week_data) == 0:
        max_week_total = "No data found for last week"
        max_week_peak = "No data found for last week"
    else:
        max_week_total = "{}: {} W".format(*getMaxTotal(week_data, uuid_to_names))
        max_week_peak = "{}: {} W".format(*getMaxPeak(week_data, uuid_to_names))

    template_args = {
        "plugs": plugs,
        "max_hour_total": max_hour_total,
        "max_hour_peak": max_hour_peak,
        "max_day_total": max_day_total,
        "max_day_peak": max_day_peak,
        "max_week_total": max_week_total,
        "max_week_peak": max_week_peak
    }
    return render_template("home.html", **template_args)

@app.route('/plugstrips/<uuid>', methods=['GET'])
def plugPage(uuid):
    # Hard coded to demo the UI for now
    with actuation_tasks_lock:
        schedule = [ {"hour": hour, "minute": minute, "turn_on": turn_on}
                     for ((_, _, hour, minute), (turn_on, _)) in
                     actuation_tasks.iteritems() ]

    plug_info = issueSmapRequest('select * where uuid="{}" and Path like "power$"'.format(uuid))
    name = plug_info[0]["Metadata"]["Name"]
    location = plug_info[0]["Metadata"]["Location"]
    owner = plug_info[0]["Metadata"]["Owner"]

    hour_data = issueSmapRequest( 'select data in (now-1hour, now) where uuid="{}"'.format(uuid))
    hour_reading_values = [ reading[1] for reading in hour_data[0]["Readings"] ]
    hour_total = sum(hour_reading_values)
    hour_peak = max(hour_reading_values)

    day_data= issueSmapRequest('select data in (now-1day, now) where uuid="{}"'.format(uuid))
    day_reading_values = [ reading[1] for reading in day_data[0]["Readings"] ]
    day_total = sum(day_reading_values)
    day_peak = max(day_reading_values)

    week_data = issueSmapRequest('select data in (now-7days, now) where uuid="{}"'.format(uuid))
    week_reading_values = [ reading[1] for reading in week_data[0]["Readings"] ]
    week_total = sum(week_reading_values)
    week_peak = max(week_reading_values)

    permalink_code = generatePermalink(uuid)

    template_args = {
        "name": name,
        "uuid": uuid,
        "location": location,
        "owner": owner,
        "hour_total": hour_total,
        "day_total": day_total,
        "week_total": week_total,
        "hour_peak": hour_peak,
        "day_peak": day_peak,
        "week_peak": week_peak,
        "plot_url": "{}/?{}".format(PLOTTER_ADDR, permalink_code),
        "schedule": schedule
    }
    return render_template("plugstrip.html", **template_args)

@app.route('/plugstrips/<uuid>', methods=['POST'])
def handleActuation(uuid):
    plug_info = issueSmapRequest('select Metadata/Address, Metadata/Port where uuid="{}"'.format(uuid))
    addr = plug_info[0]["Metadata"]["Address"]
    port = int(plug_info[0]["Metadata"]["Port"])
    body = request.data
    if  body == '0':
        actuatePlug(addr, port, False)
        return "Actuation Completed", 201
    elif body == '1':
        actuatePlug(addr, port, True)
        return "Actuation Completed", 201
    else:
        return "Invalid Request", 400

@app.route('/plugstrips/<uuid>/schedule', methods=['POST'])
def addActuationEvent(uuid):
    plug_info = issueSmapRequest('select Metadata/Address, Metadata/Port where uuid="{}"'.format(uuid))
    addr = plug_info[0]["Metadata"]["Address"]
    port = int(plug_info[0]["Metadata"]["Port"])
    event = request.json
    print event
    launchActuationCycle(addr, port, int(event["hour"]), int(event["minute"]), event["turnOn"])
    return "Event Added", 201

@app.route('/plugstrips/<uuid>/schedule', methods=['DELETE'])
def removeActuationEvent(uuid):
    plug_info = issueSmapRequest('select Metadata/Address, Metadata/Port where uuid="{}"'.format(uuid))
    addr = plug_info[0]["Metadata"]["Address"]
    port = int(plug_info[0]["Metadata"]["Port"])
    event = request.json
    if cancelActuationCycle(addr, port, event["hour"], event["minute"]):
        return "Event Deleted", 204
    else:
        return "Event Does not Exist", 404

if __name__ == '__main__':
    if os.path.exists("actuation_tasks.json"):
        with open("actuation_tasks.json") as f:
            actuation_json = f.read()
        saved_tasks = json.loads(actuation_json)
        for task in saved_tasks:
            launchActuationCycle(task["addr"], task["port"], task["hour"],
                                 task["minute"], task["turnOn"])
    app.run(host='0.0.0.0', debug=True)
