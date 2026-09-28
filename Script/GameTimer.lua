local ____lualib = require("lualib_bundle")
local __TS__Class = ____lualib.__TS__Class
local __TS__SetDescriptor = ____lualib.__TS__SetDescriptor
local ____exports = {}
____exports.GameTimer = __TS__Class()
local GameTimer = ____exports.GameTimer
GameTimer.name = "GameTimer"
function GameTimer.prototype.____constructor(self, enabled)
    self.elapsedMs = 0
    self.running = false
    self.enabled = enabled
end
function GameTimer.prototype.start(self)
    if self.enabled then
        self.running = true
    end
end
function GameTimer.prototype.pause(self)
    self.running = false
end
function GameTimer.prototype.resume(self)
    if self.enabled then
        self.running = true
    end
end
function GameTimer.prototype.stop(self)
    self.running = false
end
function GameTimer.prototype.update(self, deltaSeconds)
    if self.running and deltaSeconds > 0 then
        self.elapsedMs = self.elapsedMs + deltaSeconds * 1000
    end
end
__TS__SetDescriptor(
    GameTimer.prototype,
    "milliseconds",
    {get = function(self)
        return math.floor(self.elapsedMs)
    end},
    true
)
function ____exports.formatTime(self, milliseconds)
    local totalSeconds = math.max(
        0,
        math.floor(milliseconds / 1000)
    )
    local hours = math.floor(totalSeconds / 3600)
    local minutes = math.floor(totalSeconds % 3600 / 60)
    local seconds = totalSeconds % 60
    local function pad(____, value, width)
        local text = tostring(value)
        while #text < width do
            text = "0" .. text
        end
        return text
    end
    return (((pad(nil, hours, 2) .. ":") .. pad(nil, minutes, 2)) .. ":") .. pad(nil, seconds, 2)
end
return ____exports
