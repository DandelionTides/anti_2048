local ____exports = {}
--- Keep Lua floating-point values from rendering as labels such as "1.0".
function ____exports.integerText(self, value)
    return tostring(math.floor(value))
end
return ____exports
