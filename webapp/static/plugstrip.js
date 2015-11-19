$(document).ready(function() {
    $('#divHour').hide()
    $('#divMinute').hide()
    $('#divAction').hide()
    $('#bSaveEvent').hide()

    $('#bTurnOn').click(function() {
        $.ajax({data: "1", contentType: "text/plain", type: "POST"})
    });

    $('#bTurnOff').click(function() {
        $.ajax({data: "0", contentType: "text/plain", type: "POST"})
    });

    $('#bAddEvent').click(function() {
        $('#bAddEvent').hide()
        $('#divHour').show()
        $('#divMinute').show()
        $('#divAction').show()
        $('#bSaveEvent').show()
    });

    $('#bSaveEvent').click(function() {
        $('#bAddEvent').show()
        $('#divHour').hide()
        $('#divMinute').hide()
        $('#divAction').hide()
        $('#bSaveEvent').hide()

        var hour = $('#tHour').val()
        var minute = $('#tMinute').val()
        var turnOnStr = $('#sAction').val()
        var requestData = {
            "hour": hour,
            "minute": minute,
            "turnOn":  (turnOnStr === "Turn On")
        }
        var onSuccess = function(serverData, textStatus, request) {
            var htmlString = "<tr><td>" + hour + ":" + minute +
                    "</td><td>" + turnOnStr + "</td></tr>"
            $('#actuationEvents').append(htmlString)
        }

        var uuid = $('#uuid').val()
        $.ajax({url: uuid + "/schedule", data: JSON.stringify(requestData),
                contentType: "application/json", type: "POST", success: onSuccess})
        $('#bAddEvent').show()
        $('#divHour').hide()
        $('#divMinute').hide()
        $('#divAction').hide()
        $('#bSaveEvent').hide()
    });
});
