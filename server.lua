local radios = {}
RegisterNetEvent("carRadio:playForOccupants")
AddEventHandler("carRadio:playForOccupants", function(vehicleNetId, videoID, volume)
    local vehicle = NetworkGetEntityFromNetworkId(vehicleNetId)
    for _, playerId in ipairs(GetPlayers()) do
        local ped = GetPlayerPed(playerId)
        if IsPedInVehicle(ped, vehicle, false) then
            TriggerClientEvent("carRadio:playVideo", playerId, videoID, volume)
        end
    end
end)

RegisterNetEvent("carRadio:stop")
AddEventHandler("carRadio:stop", function(vehicle)
    local netId = NetworkGetNetworkIdFromEntity(vehicle)
    radios[netId] = nil
    TriggerClientEvent("carRadio:stop", -1, netId)
end)

RegisterNetEvent("carRadio:setVolume")
AddEventHandler("carRadio:setVolume", function(vehicle, volume)
    local netId = NetworkGetNetworkIdFromEntity(vehicle)
    if radios[netId] then
        radios[netId].volume = volume
        TriggerClientEvent("carRadio:setVolume", -1, netId, volume)
    end
end)

