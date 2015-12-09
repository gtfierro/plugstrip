require "cord"

-- Destination for reporting data
local GILES_PORT = 5555
local GILES_ADDR = "2001:470:1f04:113::2"

-- IO pin to actuate relay
storm.io.set_mode(storm.io.OUTPUT, storm.io.D8)
storm.io.set(0, storm.io.D8)
state = 0

connect = function(connect)
    print("connected?", connect)
    storm.bl.notify(char_handle, state)
    storm.bl.notify(uuid_handle, storm.os.getmacstring())
end

actuate = function(val)
    print("actuating from",val)
    if (val == 0) or (val == "0") or (string.byte(val) == 0) or (string.byte(val) == 48) then
        storm.io.set(0, storm.io.D8)
        storm.bl.notify(char_handle, 0)
        state = 0
    else
        storm.io.set(1, storm.io.D8)
        storm.bl.notify(char_handle, 1)
        state = 1
    end
    reportdata()
end

socket = storm.net.udpsocket(5555, actuate)

onready = function()
    print("ready!")
    handle = storm.bl.addservice(0xb00c)
    char_handle = storm.bl.addcharacteristic(handle, 0xb00d, actuate)
    uuid_handle = storm.bl.addcharacteristic(handle, 0xb00e, function() end)
end

-- Enable Bluetooth
storm.bl.enable("gabeplug", connect, onready)
print("Bluetooth Enabled!")

function reportdata(current_reg, voltage_reg)
    cord.new(function()
        -- Read from current ADC
        local current_arr = current_reg:r(0x0, 2)
        local current_val = current_arr:get_as(storm.array.INT16_BE, 0)

        -- Read from voltage ADC
        local voltage_arr = voltage_reg:r(0x0, 2)
        local voltage_val = voltage_arr:get_as(storm.array.INT16_BE, 0)

        local power_val = current_val * voltage_val
        print("Current:", current_val)
        print("Voltage:", voltage_val)
        print("Power:", power_val)

        local report_data = {voltage = voltage_val, current = current_val,
                              power = power_val, state = state}
        local packed_data = storm.mp.pack(report_data)
        storm.net.sendto(socket, packed_data, GILES_ADDR, GILES_PORT)
    end)
end

cord.new(function()
    local Reg = require "i2creg"
    local CURRENT_ADDR = 0x90
    local VOLTAGE_ADDR = 0x96

    -- Initialize Voltage ADC in continuous mode
    local voltage_adc = Reg:new(storm.i2c.EXT, VOLTAGE_ADDR)
    voltage_adc:w(0x1, {0x04, 0x83})
    print("Configured Voltage ADC")

    -- Initialize Current ADC in continuous mode
    local current_adc = Reg:new(storm.i2c.EXT, CURRENT_ADDR)
    current_adc:w(0x1, {0x04, 0x83})
    print("Configured Current ADC")

    storm.os.invokePeriodically(1 * storm.os.SECOND, reportdata, current_adc, voltage_adc)
end)

cord.enter_loop()
