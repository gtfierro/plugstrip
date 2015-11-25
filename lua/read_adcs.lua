-- Code to read from the current and voltage ADCs
require "cord"

cord.new(function()
    local PORT = 3500
    local ADDRESS = ""
    local Reg = require "i2creg"

    local CURRENT_ADDR = 0x48
    local VOLTAGE_ADDR = 0x4B

    -- Initialize Current ADC in continuous mode
    local current_adc = Reg:new(storm.i2c.EXT, CURRENT_ADDR)
    current_adc:w(0x1, {0x04, 0x83})

    -- Initialize Voltage ADC in continuous mode
    local voltage_adc = Reg:new(storm.i2c.EXT, VOLTAGE_ADDR)
    voltage_adc:w(0x1, {0x04, 0x83})

    function read_current_sample()
        local result_arr = current_adc:r(0x0, 2)
        local result = storm.array.get_as(storm.array.INT16_BE, 0)
        return result
    end

    function read_voltage_sample()
        local result_arr = voltage_adc:r(0x0, 2)
        local result = storm.array.get_as(storm.array.INT16_BE, 0)
        return result
    end

    function compute_power_sample()
        local current_val = read_current_sample()
        local voltage_val = read_voltage_sample()
        local power_val = current_val * voltage_val
        print(power_val)
    end

    storm.os.invokePeriodically(5 * storm.os.SECOND, compute_power_sample)
end)
cord.enter_loop()
