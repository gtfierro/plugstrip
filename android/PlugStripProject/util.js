'use strict';

var util = {};

util.QuerySmap = function(query, success, error) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = (e) => {
        if (request.readyState !== 4) {
            return;
        }

        if (request.status == 200) {
            console.log(request.responseText);
            success(JSON.parse(request.responseText))
        } else {
            console.warn('error');
            console.log(request);
            error(request);
        }
    };
    request.open('POST', 'http://plugstrip.cal-sdb.org:8079/api/query', true);
    request.setRequestHeader("Content-type", "application/text");
    request.setRequestHeader("Accept", "application/json");
    request.send(query);
}

// if val is in array, puts it to the front, otherwise adds it to the front
util.PopOrAddToFront = function(arr, val) {
    if (arr.indexOf(val) == -1) {
        arr.unshift(val);
    } else {
        arr.splice(arr.indexOf(val), 1);
        arr.unshift(val);
    }
    return val;
}

module.exports = util;
