# Actuation and Scheduling REST API

Currently, each plug is identified by the UUID of its energy consumption stream on Giles.

## Actuating a Plug
Any plug can be remotely actuated via the REST API.

URL: `POST /plugstrips/<uuid>`

Expected Content Type: `text/plain`

Body: `1` or `0`

`<uuid>` is the UUID of the plug's energy consumption Giles stream.

The request body should be `1` to turn the plug on and `0` to turn the plug off.

Returns status code `201` if the body is properly formed and an actuation signal is successfully sent, `400` if the request was improperly formed, or `404` if the UUID does not correspond to a known plugstrip.

## Scheduling a Recurring Actuation Event
Currently, there is support for scheduling a recurring actuation event. The event is assigned a particular trigger time, and it will repeat every 24 hours.

URL: `POST /plugstrips/<uuid>/schedule`

Expected Content Type: `application/json`

Body: A JSON object containing the following fields.
  1. `hour`: The hour at which the actuation should occur. Must be between 0 and 23, inclusive.
  2. `minute`: The minute at which the actuation should occur. Must be beetween 0 and 59, inlcusive.
  3. `turnOn`: Must be `true` if the plug is to be turned on, and `false` if the plug is to be turned off.

The body of a request that schedules a plug to turn on at noon would be:
```json
{ "hour": 12, "minute": 0, "turnOn": true}
```

`<uuid`> is the UUID of the plug's energy consumption Giles stream.

Returns status code `201` if the event was successfully scheduled, `400` if the request was improperly formed, and `404` if the UUID does not correspond to a known plugstrip.

## Removing a Recurring Actuation Event
Removing a recurring event is very similar to scheduling an event.

URL: `DELETE /plugstrips/<uuid>/schedule`

Expected Content Type: `application/json`

Body: A JSON object containing the following fields.
  1. `hour`: The hour at which the actuation is scheduled to occur. Must be between 0 and 23, inclusive.
  2. `minute`: The minute at which the actuation is scheduled to occur. Must be beetween 0 and 59, inlcusive.
  3. `turnOn`: Must be `true` if the plug is to be turned on, and `false` if the plug is to be turned off.

The body of a request that deletes a scheduled event to turn on a plug on at noon would be:
```json
{ "hour": 12, "minute": 0, "turnOn": true}
```

`<uuid>` is the UUID of the plug's energy consumption Giles stream.

Returns status code `204` if the event was successfully deleted, `400` if the request was improperly formed, and `404` if the UUID does not correspond to a known plugstrip.

Note: _It is a bit strange to have a `DELETE` request with a body. This will probably be changed when support for creating multiple distinct schedules for a device is added._