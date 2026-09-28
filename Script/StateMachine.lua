local ____lualib = require("lualib_bundle")
local __TS__Class = ____lualib.__TS__Class
local ____exports = {}
____exports.ScreenStateMachine = __TS__Class()
local ScreenStateMachine = ____exports.ScreenStateMachine
ScreenStateMachine.name = "ScreenStateMachine"
function ScreenStateMachine.prototype.____constructor(self)
    self.current = "MAIN_MENU"
    self.previous = "MAIN_MENU"
end
function ScreenStateMachine.prototype.go(self, next)
    if next == self.current then
        return
    end
    self.previous = self.current
    self.current = next
end
return ____exports
