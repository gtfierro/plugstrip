require "cord"
sh = require "stormsh"

-- set the IO pin
storm.io.set_mode(storm.io.OUTPUT, storm.io.D8)

state = 0 -- starts as off
serverip = "2001:470:1f04:113::2" -- ec2 server
serverport = 5555


connect = function(connect)
    print("connected?", connect)
    storm.bl.notify(char_handle, state)
end

actuate = function(val)
    print("actuating from",val)
    if (val == 0) or (val == "0") or (string.byte(val) == 0) or (string.byte(val) == 48) then
        storm.io.set(0, storm.io.D8)
        state = 0
    else
        storm.io.set(1, storm.io.D8)
        state = 1
    end
    sendstate()
end

socket = storm.net.udpsocket(5555, actuate)

onready = function()
    print("ready!")
    handle = storm.bl.addservice(0xb00c)
    char_handle = storm.bl.addcharacteristic(handle, 0xb00d, actuate)
end

sendstate = function()
    storm.net.sendto(socket, state, serverip, serverport)
end

-- enable bluetooth
storm.bl.enable("gabeplug", connect, onready)

storm.os.invokePeriodically(2*storm.os.SECOND, function()
    sendstate()
end)


-- start a coroutine that provides a REPL
sh.start()

-- enter the main event loop. This puts the processor to sleep
-- in between events
cord.enter_loop()
