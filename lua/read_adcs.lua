-- Code to read from the current and voltage ADCs
require "cord"

function compute_power_sample(current_reg, voltage_reg)
    cord.new(function()
        -- Read from current ADC
        local current_arr = current_reg:r(0x0, 2)
        local current_val = current_arr:get_as(storm.array.INT16_BE, 0)

        -- Read from voltage ADC
        --local voltage_arr = voltage_reg:r(0x0, 2)
        --local voltage_val = voltage_arr:get_as(storm.array.INT16_BE, 0)
        --local power = current_val * voltage_val
        print("Current ADC: " .. current_val)
    end)
end

cord.new(function()
    local Reg = require "i2creg"
    local CURRENT_ADDR = 0x90
    local VOLTAGE_ADDR = 0x96

    -- Initialize Current ADC in continuous mode
    local current_adc = Reg:new(storm.i2c.EXT, CURRENT_ADDR)

    current_adc:w(0x1, {0x04, 0x83})
    -- Initialize Voltage ADC in continuous mode
    local voltage_adc = Reg:new(storm.i2c.EXT, VOLTAGE_ADDR)
    voltage_adc:w(0x1, {0x04, 0x83})

    storm.os.invokePeriodically(1 * storm.os.SECOND, compute_power_sample, current_adc, voltage_adc)
end)

cord.enter_loop()
