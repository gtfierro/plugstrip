#!/usr/bin/env python
from flask import Flask
from flask import render_template
from flask import request
import contextlib
import datetime
import requests
import socket
import threading

GILES_QUERY_ADDR = "http://52.23.239.48:8079/api/query"
PLUG_ADDR = '2001:470:83ae:2:212:6d02::f00f'
PLUG_PORT = 5555
app = Flask(__name__)

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

# IP and port hardcoded for now
def actuatePlug(addr, port, turn_on):
    with contextlib.closing(socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)) as sock:
        if turn_on:
            sock.sendto('1', (addr, port))
        else:
            sock.sendto('0', (addr, port))

def actuateAndReschedule(addr, port, turn_on):
    timer = threading.Timer(24 * 60 * 60, actuateAndReschedule, args=(addr, port, turn_on))
    timer.start()
    actuatePlug(addr, port, turn_on)

@app.route('/')
def homePage():
    plug_data = issueSmapRequest('select * where Metadata/Type="plugstrip" and Path like "power$"')
    plugs = [ {"name": x["Metadata"]["Name"], "location": x["Metadata"]["Location"],
               "owner": x["Metadata"]["Owner"], "uuid": x["uuid"]} for x in plug_data ]
    uuid_to_names = { x["uuid"]: x["Metadata"]["Name"] for x in plug_data }

    hour_data = issueSmapRequest('select data in (now-1hour, now) where Metadata/Type="plugstrip" and Path like "power$"')
    max_hour_total = "{}: {} W".format(*getMaxTotal(hour_data, uuid_to_names))
    max_hour_peak = "{}: {} W".format(*getMaxPeak(hour_data, uuid_to_names))

    day_data = issueSmapRequest('select data in (now-1day, now) where Metadata/Type="plugstrip" and Path like "power$"')
    max_day_total = "{}: {} W".format(*getMaxTotal(day_data, uuid_to_names))
    max_day_peak = "{}: {} W".format(*getMaxPeak(day_data, uuid_to_names))

    week_data =  issueSmapRequest('select data in (now-7days, now) where Metadata/Type="plugstrip" and Path like "power$"')
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
    schedule = [
        {"time": "13:30", "action": "Turn On"},
        {"time": "17:45", "action": "Turn Off"}
    ]

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

    template_args = {
        "name": name,
        "location": location,
        "owner": owner,
        "hour_total": hour_total,
        "day_total": day_total,
        "week_total": week_total,
        "hour_peak": hour_peak,
        "day_peak": day_peak,
        "week_peak": week_peak,
        "schedule": schedule
    }
    return render_template("plugstrip.html", **template_args)

@app.route('/plugstrips/<uuid>', methods=['POST'])
def handleActuation(uuid):
    # Hard code these for now
    body = request.data
    if  body == '0':
        actuatePlug(PLUG_ADDR, PLUG_PORT, False)
    else:
        actuatePlug(PLUG_ADDR, PLUG_PORT, True)
    return body

@app.route('/plugstrips/<uuid>/schedule', methods=['POST'])
def addActuationEvent(uuid):
    event = request.json()
    now = datetime.datetime.today()
    requested_time = datetime.time(event["hour"], event["minute"])

    requested_time_today = datetime.combine(datetime.date.today(), requested_time)
    if now < requested_time_today:
        # Scheduled time is later today
        delay = (requested_time_today - now).total_seconds()
    else:
        # Schedule time won't occur again until tomorrow
        requested_time_tomorrow = requested_time_today + datetime.timedelta(days=1)
        delay = (requested_time_tomorrow - now).total_seconds()

    if event["action"].lower() == "on":
        args = (PLUG_ADDR, PLUG_PORT, True)
    else:
        args = (PLUG_ADDR, PLUG_PORT, False)
    timer = threading.Timer(delay, actuateAndReschedule, args)
    timer.start()
    return 201

if __name__ == '__main__':
    app.run(debug=True)
