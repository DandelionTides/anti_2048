local ____lualib = require("lualib_bundle")
local __TS__Class = ____lualib.__TS__Class
local ____exports = {}
local ____Json = require("Script.Json")
local decodeJson = ____Json.decodeJson
local encodeJson = ____Json.encodeJson
____exports.SAVE_VERSION = 2
function ____exports.defaultSaveData(self)
    return {
        saveVersion = ____exports.SAVE_VERSION,
        volume = 0.8,
        endlessBestScore = 0,
        endlessHighestNumber = 0,
        difficultyRecords = {}
    }
end
____exports.SaveRepository = __TS__Class()
local SaveRepository = ____exports.SaveRepository
SaveRepository.name = "SaveRepository"
function SaveRepository.prototype.____constructor(self, storage)
    self.storage = storage
    self.data = self:read()
end
function SaveRepository.prototype.read(self)
    do
        local function ____catch()
            return true, ____exports.defaultSaveData(nil)
        end
        local ____try, ____hasReturned, ____returnValue = pcall(function()
            local content = self.storage:load()
            if not content then
                return true, ____exports.defaultSaveData(nil)
            end
            local parsed = decodeJson(nil, content)
            local defaults = ____exports.defaultSaveData(nil)
            return true, {
                saveVersion = ____exports.SAVE_VERSION,
                volume = type(parsed.volume) == "number" and math.max(
                    0,
                    math.min(1, parsed.volume)
                ) or defaults.volume,
                endlessBestScore = math.max(0, parsed.endlessBestScore or 0),
                endlessHighestNumber = math.max(0, parsed.endlessHighestNumber or 0),
                difficultyRecords = parsed.difficultyRecords or ({})
            }
        end)
        if not ____try then
            ____hasReturned, ____returnValue = ____catch()
        end
        if ____hasReturned then
            return ____returnValue
        end
    end
end
function SaveRepository.prototype.persist(self)
    self.data.saveVersion = ____exports.SAVE_VERSION
    return self.storage:save(encodeJson(nil, self.data))
end
function SaveRepository.prototype.setVolume(self, value)
    self.data.volume = math.max(
        0,
        math.min(1, value)
    )
    self:persist()
end
function SaveRepository.prototype.recordDifficulty(self, preset, score, timeMs)
    local previous = self.data.difficultyRecords[preset.id] or ({bestScore = 0})
    previous.bestScore = math.max(previous.bestScore, score)
    if timeMs ~= nil and (previous.bestTimeMs == nil or timeMs < previous.bestTimeMs) then
        previous.bestTimeMs = timeMs
    end
    self.data.difficultyRecords[preset.id] = previous
    self:persist()
end
function SaveRepository.prototype.recordEndless(self, score, highestNumber)
    self.data.endlessBestScore = math.max(self.data.endlessBestScore, score)
    self.data.endlessHighestNumber = math.max(self.data.endlessHighestNumber, highestNumber)
    self:persist()
end
return ____exports
