local ____lualib = require("lualib_bundle")
local Error = ____lualib.Error
local RangeError = ____lualib.RangeError
local ReferenceError = ____lualib.ReferenceError
local SyntaxError = ____lualib.SyntaxError
local TypeError = ____lualib.TypeError
local URIError = ____lualib.URIError
local __TS__New = ____lualib.__TS__New
local ____exports = {}
local ____Dora = require("Dora")
local json = ____Dora.json
function ____exports.encodeJson(self, value)
    local encoded, ____error = json.encode(value)
    if encoded == nil then
        error(
            __TS__New(Error, ____error or "JSON encode failed"),
            0
        )
    end
    return encoded
end
function ____exports.decodeJson(self, value)
    local decoded, ____error = json.decode(value)
    if decoded == nil then
        error(
            __TS__New(Error, ____error or "JSON decode failed"),
            0
        )
    end
    return decoded
end
return ____exports
