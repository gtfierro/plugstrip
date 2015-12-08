$(document).ready(function() {
    $('#divHour').hide()
    $('#divMinute').hide()
    $('#divAction').hide()
    $('#bSaveEvent').hide()
    $('#bCancel').hide()
    $('.deleteCell').hide()

    $('#addEventForm').validate({
        rules: {
            hour: {
                required: true,
                number: true,
                range: [0, 23]
            },

            minute: {
                required: true,
                number: true,
                range: [0, 59]
            }
        }
    })

    var plugState = $('#plugState').text()
    if (plugState === "Off") {
        $('#plugState').css('color', 'red')
        $('#bTurnOff').hide()
    } else if (plugState === "On") {
        $('#plugState').css('color', 'green')
        $('#bTurnOn').hide()
    } else {
        $('#plugstate').css('color', 'gray')
    }

    $('#bTurnOn').click(function() {
        $.ajax({data: "1", contentType: "text/plain", type: "POST"}).done(
            function(data, text, jqXHR) {
                if (jqXHR.status === 201) {
                    $('#bTurnOn').hide()
                    $('#bTurnOff').show()
                }
            }
        )
    })

    $('#bTurnOff').click(function() {
        $.ajax({data: "0", contentType: "text/plain", type: "POST"}).done(
            function(data, text, jqXHR) {
                if (jqXHR.status === 201) {
                    $('#bTurnOff').hide()
                    $('#bTurnOn').show()
                }
            }
        )
    })

    $('#bAddEvent').click(function() {
        $('#bAddEvent').hide()
        $('#bDelEvent').hide()
        $('#divHour').show()
        $('#divMinute').show()
        $('#divAction').show()
        $('#bSaveEvent').show()
        $('#bCancel').show()
    })

    $('#bDelEvent').click(function() {
        $('#bAddEvent').hide()
        $('#bDelEvent').hide()
        $('.deleteCell').show()
        $('#bCancel').show()
    })

    $('#bCancel').click(function() {
        $('#divHour').hide()
        $('#divMinute').hide()
        $('#divAction').hide()
        $('#bSaveEvent').hide()
        $('.deleteCell').hide()
        $('#bCancel').hide()
        $('#bAddEvent').show()
        $('#bDelEvent').show()
    })

    $('#bSaveEvent').click(function() {
        if ($('#addEventForm').valid()) {
            var hour = $('#tHour').val()
            var hourVal = parseInt(hour)
            var minute = $('#tMinute').val()
            var minuteVal = parseInt(minute)
            if (minuteVal < 10 && minute.length < 2) {
                minute = "0" + minute
            }
            var turnOnStr = $('#sAction').val()
            var requestData = {
                "hour": hourVal,
                "minute": minuteVal,
                "turnOn":  (turnOnStr === "Turn On")
            }
            var onSuccess = function(serverData, textStatus, request) {
                var htmlString = "<tr class='clickable'>" +
                                     "<td class='deleteCell'><button type='button'" +
                                         "class='btn btn-danger tableDelBtn'>Remove Event</button></td>" +
                                     "<td>" + hour + ":" + minute + "</td>" +
                                     "<td>" + turnOnStr + "</td>" +
                                 "</tr>"
                $('#actuationEvents').append(htmlString)
                $('.deleteCell').hide()
            }

            var uuid = $('#uuid').val()
            $.ajax({url: uuid + "/schedule", data: JSON.stringify(requestData),
                    contentType: "application/json", type: "POST", success: onSuccess})
            $('#bAddEvent').show()
            $('#bDelEvent').show()
            $('#divHour').hide()
            $('#divMinute').hide()
            $('#divAction').hide()
            $('#bSaveEvent').hide()
            $('#bCancel').hide()
        }
    })

    $('#actuationEvents').on('click', '.tableDelBtn', function() {
        var time = $(this).parent().next().text().split(':')
        var turnOnStr = $(this).parent().next().next().text()
        var hour = time[0]
        var minute = time[1]

        var requestData = {
            "hour": parseInt(hour),
            "minute": parseInt(minute),
            "turnOn": turnOnStr === "Turn On"
        }
        var target = $(this)
        var uuid = $('#uuid').val()
        $.ajax({url: uuid + "/schedule", data: JSON.stringify(requestData),
                contentType: "application/json", type: "DELETE"}).done(
            function(data, textStatus, jqXHR) {
                // jQuery doesn't like 204 response code for normal success callback
                if (jqXHR.status === 204) {
                    target.parent().parent().remove()
                }
            })
        $('.deleteCell').hide()
        $('#bCancel').hide()
        $('#bAddEvent').show()
        $('#bDelEvent').show()
    })
})
