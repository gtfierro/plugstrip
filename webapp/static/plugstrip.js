$(document).ready(function() {
    $('#divHour').hide()
    $('#divMinute').hide()
    $('#divAction').hide()
    $('#bSaveEvent').hide()

    $('#bViewPlot').click(function() {
        // This is hard-coded for now
        location.href = "http://52.23.239.48:3000/?o96JsTm433cfS4GJn"
    });

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

        // Quick hack to demo UI
        var htmlString = "<tr><td>" + $('#tHour').val() + ":" + $('#tMinute').val() +
                "</td><td>" + $('#sAction').val() + "</td></tr>"
        $('#actuationEvents').append(htmlString)
    });
});
