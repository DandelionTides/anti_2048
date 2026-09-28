local ____lualib = require("lualib_bundle")
local __TS__Class = ____lualib.__TS__Class
local __TS__New = ____lualib.__TS__New
local __TS__ArrayReduce = ____lualib.__TS__ArrayReduce
local ____exports = {}
____exports.DefaultScoreFormula = __TS__Class()
local DefaultScoreFormula = ____exports.DefaultScoreFormula
DefaultScoreFormula.name = "DefaultScoreFormula"
function DefaultScoreFormula.prototype.____constructor(self)
end
function DefaultScoreFormula.prototype.splitScore(self, event)
    return event.originalValue
end
function DefaultScoreFormula.prototype.dividerScore(self, _result)
    return 0
end
____exports.ScoreManager = __TS__Class()
local ScoreManager = ____exports.ScoreManager
ScoreManager.name = "ScoreManager"
function ScoreManager.prototype.____constructor(self, formula)
    if formula == nil then
        formula = __TS__New(____exports.DefaultScoreFormula)
    end
    self.formula = formula
end
function ScoreManager.prototype.calculate(self, result)
    return __TS__ArrayReduce(
        result.splitEvents,
        function(____, total, event) return total + self.formula:splitScore(event) end,
        0
    ) + self.formula:dividerScore(result)
end
return ____exports
