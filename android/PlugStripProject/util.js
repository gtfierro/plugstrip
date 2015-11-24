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
    request.open('POST', 'http://shell.storm.pm:8079/api/query', true);
    request.setRequestHeader("Content-type", "application/text");
    request.setRequestHeader("Accept", "application/json");
    request.send(query);
}

module.exports = util;
