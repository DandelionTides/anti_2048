local ____exports = {}
local ____Dora = require("Dora")
local App = ____Dora.App
local UINT32_MAX = 4294967295
function ____exports.doraRandom(self)
    return App.rand / UINT32_MAX
end
return ____exports
