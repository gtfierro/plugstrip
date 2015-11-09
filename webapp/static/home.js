$(document).ready(function() {
    $('tr.clickable').click(function() {
        location.href = "plugstrips/" + $(this).attr("id")
    });
});
