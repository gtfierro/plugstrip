var Input = ReactBootstrap.Input;
var Panel = ReactBootstrap.Panel;
var Glyphicon = ReactBootstrap.Glyphicon;

var Nav = ReactBootstrap.Nav;
var NavItem = ReactBootstrap.NavItem;

var ListGroup = ReactBootstrap.ListGroup;
var ListGroupItem = ReactBootstrap.ListGroupItem;

var Button = ReactBootstrap.Button;
var ButtonToolbar = ReactBootstrap.ButtonToolbar;
var ButtonGroup = ReactBootstrap.ButtonGroup;
var DropdownButton = ReactBootstrap.DropdownButton;
var MenuItem = ReactBootstrap.MenuItem;

// For republish mechanisms, we will often get arrays that look like
// [[1425582802,75],[1425582803,75]]. This fetches the most recent reading
// and returns it
var get_latest_reading = function(reading) {
    if (reading.length == 0) {
        return null;
    }
    return reading[reading.length-1][1];
}

String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

// convenience method for running AJAX POST
var run_query = function(q, succ, err) {
    $.ajax({
        url: '/query',
        datatype: 'json',
        type: 'POST',
        data: {query: q},
        success: succ.bind(this),
        error: err.bind(this)
    });
}

var run_dataquery = function(q, succ, err) {
    $.ajax({
        url: '/dataquery',
        datatype: 'json',
        type: 'POST',
        data: {query: q},
        success: succ.bind(this),
        error: err.bind(this)
    });
};

function makeProp(prop, value) {
  var obj = {}
  obj[prop] = value
  return obj
}

// get plotter permalink
function get_permalink(uuid, duration, succ, err) {
    $.ajax({
        url: '/permalink',
        datatype: 'json',
        type: 'POST',
        data: {uuid: uuid, duration: duration},
        success: succ.bind(this),
        error: err.bind(this)
    });
}

function list_dash_permalinks(succ, err) {
    $.ajax({
        url: '/dashpermalink/list',
        datatype: 'json',
        type: 'GET',
        success: succ.bind(this),
        error: err.bind(this)
    });
}

// save dashboard as permalink
function save_dash_permalink(query, succ, err) {
    $.ajax({
        url: '/dashpermalink',
        datatype: 'json',
        type: 'POST',
        data: {query: query},
        success: succ.bind(this),
        error: err.bind(this)
    });
}

function get_dash_permalink(pid, succ, err) {
    console.log('/dashpermalink/get/'+pid);
    $.ajax({
        url: '/dashpermalink/get/' + pid,
        type: 'GET',
        success: succ.bind(this),
        error: err.bind(this)
    });
}

var durationLookup = {
    'sec': 1e9,
    'min': 6e10,
    'hour': 3.6e12,
    'day': 8.64e13
}

function format_permalink(permalink) {
    return location.origin + "/index#" + permalink;
}
