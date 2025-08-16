local radioKey = 246 -- Y
local currentCar = nil
local menuOpen = false
local lastVideo = nil
local lastVolume = 50
local lastTime = 0

-- Open menu
CreateThread(function()
    while true do
        Wait(0)
        local ped = PlayerPedId()
        if IsControlJustReleased(0, radioKey) and IsPedInAnyVehicle(ped, false) then
            currentCar = GetVehiclePedIsIn(ped, false)
            menuOpen = true
            SetNuiFocus(true, true)
            SendNUIMessage({ action = "open" })
        end
    end
end)

-- Track vehicle occupancy
CreateThread(function()
    while true do
        Wait(250)
        if currentCar then
            local inVehicle = IsPedInVehicle(PlayerPedId(), currentCar, false)
            SendNUIMessage({ action = "updateVehicleState", inVehicle = inVehicle })

            if inVehicle and not menuOpen then
                menuOpen = true
                TriggerServerEvent('carRadio:requestSync', NetworkGetNetworkIdFromEntity(currentCar))
            elseif not inVehicle then
                menuOpen = false
                SetNuiFocus(false, false)
            end
        end
    end
end)

-- NUI callbacks
RegisterNUICallback("playVideo", function(data, cb)
    if currentCar then
        lastVideo = data.videoID
        lastVolume = tonumber(data.volume) or 50
        lastTime = 0
        TriggerServerEvent('carRadio:playVideo', NetworkGetNetworkIdFromEntity(currentCar), data.videoID, lastVolume, lastTime)
    end
    cb("ok")
end)

RegisterNUICallback("stopVideo", function(data, cb)
    if currentCar then
        TriggerServerEvent('carRadio:stopVideo', NetworkGetNetworkIdFromEntity(currentCar))
    end
    lastVideo = nil
    lastTime = 0
    cb("ok")
end)

RegisterNUICallback("releaseFocus", function(data, cb)
    menuOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = "close" })
    cb("ok")
end)

RegisterNUICallback("setVolume", function(data, cb)
    lastVolume = tonumber(data.volume) or lastVolume
    SendNUIMessage({ action = "setVolume", volume = data.volume })
    cb("ok")
end)

RegisterNUICallback("seekVideo", function(data, cb)
    lastTime = data.time
    SendNUIMessage({ action = "seekVideo", time = data.time })
    cb("ok")
end)

-- Server sync events
RegisterNetEvent('carRadio:syncPlay')
AddEventHandler('carRadio:syncPlay', function(videoID, volume, startTime)
    lastVideo = videoID
    lastVolume = volume
    lastTime = startTime
    SendNUIMessage({ action = "playVideo", videoID = videoID, volume = volume, startTime = startTime })
end)

RegisterNetEvent('carRadio:syncStop')
AddEventHandler('carRadio:syncStop', function()
    lastVideo = nil
    lastTime = 0
    SendNUIMessage({ action = "stopVideo" })
end)
