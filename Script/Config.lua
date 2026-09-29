local ____lualib = require("lualib_bundle")
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local ____exports = {}
____exports.EASY_PRESET = {
    id = "easy",
    name = "简单",
    boardSize = 4,
    initialTileCount = 8,
    initialValues = {
        4,
        4,
        4,
        4,
        8,
        8,
        16,
        16
    },
    minInitialEmptyCells = 4,
    allowedDivisors = {2, 4},
    allowedMultipliers = {2, 4},
    operatorPool = {
        "DIVIDER",
        "DIVIDER",
        "MULTIPLIER",
        "ROOT",
        "COOKIE"
    },
    operatorSpawnInterval = 2,
    endlessNumberChance = 0.6,
    defaultTimed = false,
    targetRule = "CLEAR_ALL_NUMBERS",
    endlessNumberStages = {}
}
____exports.NORMAL_PRESET = {
    id = "normal",
    name = "普通",
    boardSize = 4,
    initialTileCount = 10,
    initialValues = {
        4,
        4,
        4,
        4,
        8,
        8,
        16,
        16,
        32,
        32
    },
    minInitialEmptyCells = 4,
    allowedDivisors = {2, 4, 8},
    allowedMultipliers = {2, 4},
    operatorPool = {
        "DIVIDER",
        "DIVIDER",
        "MULTIPLIER",
        "MULTIPLIER",
        "ROOT",
        "COOKIE"
    },
    operatorSpawnInterval = 2,
    endlessNumberChance = 0.6,
    defaultTimed = false,
    targetRule = "CLEAR_ALL_NUMBERS",
    endlessNumberStages = {}
}
____exports.HARD_PRESET = {
    id = "hard",
    name = "困难",
    boardSize = 4,
    initialTileCount = 12,
    initialValues = {
        8,
        8,
        8,
        8,
        16,
        16,
        16,
        16,
        32,
        32,
        32,
        64
    },
    minInitialEmptyCells = 4,
    allowedDivisors = {2, 4, 8, 16},
    allowedMultipliers = {2, 4},
    operatorPool = {
        "DIVIDER",
        "DIVIDER",
        "MULTIPLIER",
        "MULTIPLIER",
        "ROOT",
        "COOKIE"
    },
    operatorSpawnInterval = 2,
    endlessNumberChance = 0.6,
    defaultTimed = true,
    targetRule = "CLEAR_ALL_NUMBERS",
    endlessNumberStages = {}
}
____exports.ENDLESS_PRESET = __TS__ObjectAssign({}, ____exports.NORMAL_PRESET, {id = "endless", name = "无尽", targetRule = "ENDLESS", endlessNumberStages = {
    {fromMove = 1, values = {
        1,
        1,
        1,
        2,
        2,
        4
    }},
    {fromMove = 30, values = {
        1,
        2,
        2,
        4,
        4,
        8,
        8
    }},
    {fromMove = 70, values = {
        2,
        4,
        4,
        8,
        8,
        16,
        16,
        16
    }},
    {fromMove = 120, values = {
        4,
        8,
        8,
        16,
        16,
        32,
        32,
        32,
        32
    }},
    {fromMove = 190, values = {
        8,
        16,
        16,
        32,
        32,
        64,
        64,
        64,
        64,
        64
    }},
    {fromMove = 280, values = {
        16,
        32,
        32,
        64,
        64,
        128,
        128,
        128,
        128,
        128,
        128
    }},
    {fromMove = 400, values = {
        32,
        64,
        64,
        128,
        128,
        256,
        256,
        256,
        256,
        256,
        256,
        256
    }}
}})
____exports.DIFFICULTY_PRESETS = {____exports.EASY_PRESET, ____exports.NORMAL_PRESET, ____exports.HARD_PRESET}
____exports.UNDO_HISTORY_LIMIT = 10
return ____exports
