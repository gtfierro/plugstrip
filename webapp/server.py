#!/usr/bin/env python
from flask import Flask
from flask import render_template
import requests

GILES_QUERY_ADDR = "http://52.23.239.48:8079/api/query"
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

@app.route('/plugstrips/<uuid>')
def plugPage(uuid):
    schedule = [
        {"time": "13:30", "action": "turn on"},
        {"time": "17:45", "action": "turn off"}
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

if __name__ == '__main__':
    app.run(debug=True)
