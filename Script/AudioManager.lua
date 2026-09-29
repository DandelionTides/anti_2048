local ____lualib = require("lualib_bundle")
local __TS__Class = ____lualib.__TS__Class
local __TS__ArraySome = ____lualib.__TS__ArraySome
local ____exports = {}
local ____Dora = require("Dora")
local Audio = ____Dora.Audio
local SFX = {
    ui = "Audio/ui.wav",
    move = "Audio/move.wav",
    split = "Audio/split.wav",
    merge = "Audio/merge.wav",
    divider = "Audio/divider.wav",
    spawn = "Audio/spawn.wav",
    victory = "Audio/victory.wav",
    gameOver = "Audio/game-over.wav"
}
____exports.AudioManager = __TS__Class()
local AudioManager = ____exports.AudioManager
AudioManager.name = "AudioManager"
function AudioManager.prototype.____constructor(self)
    self.volume = 1
end
function AudioManager.prototype.setVolume(self, value)
    self.volume = math.max(
        0,
        math.min(1, value)
    )
    Audio.globalVolume = self.volume
end
function AudioManager.prototype.playUi(self)
    self:play(SFX.ui)
end
function AudioManager.prototype.playSpawn(self)
    self:play(SFX.spawn)
end
function AudioManager.prototype.playVictory(self)
    self:play(SFX.victory)
end
function AudioManager.prototype.playGameOver(self)
    self:play(SFX.gameOver)
end
function AudioManager.prototype.playMove(self, result)
    if #result.dividerEvents > 0 or #result.multiplierEvents > 0 or #result.rootEvents > 0 or __TS__ArraySome(
        result.cookieEvents,
        function(____, event) return event.triggered end
    ) then
        self:play(SFX.divider)
    elseif #result.splitEvents > 0 then
        self:play(SFX.split)
    elseif #result.mergeEvents > 0 or #result.dividerMergeEvents > 0 or #result.multiplierMergeEvents > 0 then
        self:play(SFX.merge)
    else
        self:play(SFX.move)
    end
end
function AudioManager.prototype.play(self, filename)
    if self.volume > 0.001 then
        Audio:play(filename, false)
    end
end
return ____exports
