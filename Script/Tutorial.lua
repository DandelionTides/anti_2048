local ____exports = {}
local ____Core = require("Script.Core")
local createEmptyBoard = ____Core.createEmptyBoard
____exports.TUTORIAL_LEVELS = {
    {
        id = 1,
        title = "滑动与拆解",
        shortDescription = "空位快照决定本步能拆几次",
        barrageMessages = {
            "滑动方向决定方块靠拢的一侧",
            "每步只使用滑动前已有的空位",
            "有空位时，数字先拆成两个一半",
            "本步新产生的空位不会再次使用",
            "数字 1 再拆解时会直接消失",
            "消除所有数字块即可完成教学"
        },
        objective = "通过连续拆解消除全部数字块",
        initialCells = {{row = 0, col = 0, kind = "NUMBER", value = 8}, {row = 1, col = 3, kind = "NUMBER", value = 4}, {row = 3, col = 0, kind = "NUMBER", value = 2}},
        allowedOperators = {},
        generationRules = {kind = "NONE"},
        goal = {clearNumbers = true}
    },
    {
        id = 2,
        title = "每步结算顺序",
        shortDescription = "数字先拆，路径符号由近到远触发",
        barrageMessages = {
            "每步先记录空位，再拆解数字",
            "数字移动时才会触发沿途符号",
            "同一路径按距离由近到远结算",
            "多个符号可在一次移动中连续触发",
            "运算结束后才进行同类合成与压缩",
            "场上没有数字块时立即通关"
        },
        objective = "观察多轮运算顺序并消除全部数字块",
        initialCells = {
            {row = 0, col = 0, kind = "NUMBER", value = 8},
            {row = 0, col = 1, kind = "MULTIPLIER", value = 2},
            {row = 0, col = 2, kind = "ROOT"},
            {row = 0, col = 3, kind = "DIVIDER", value = 2},
            {row = 2, col = 0, kind = "NUMBER", value = 4},
            {row = 3, col = 3, kind = "NUMBER", value = 2}
        },
        allowedOperators = {"DIVIDER", "MULTIPLIER", "ROOT"},
        generationRules = {kind = "OPERATORS", operatorInterval = 1, operatorSequence = {
            "DIVIDER",
            "MULTIPLIER",
            "ROOT",
            "DIVIDER",
            "ROOT",
            "MULTIPLIER"
        }},
        goal = {clearNumbers = true}
    },
    {
        id = 3,
        title = "合理使用除法块",
        shortDescription = "本关只出现除法块",
        barrageMessages = {
            "本关初始与生成都只有除法块",
            "数字碰到 ÷n 后执行整数除法",
            "除不尽时，计算结果会向下取整",
            "结果小于 1 时数字会直接消失",
            "除法块触发一次后消失，同值可合成",
            "消除全部数字块即可通关"
        },
        objective = "合理使用连续出现的除法块并消除数字",
        initialCells = {
            {row = 0, col = 0, kind = "NUMBER", value = 8},
            {row = 0, col = 1, kind = "DIVIDER", value = 2},
            {row = 0, col = 2, kind = "DIVIDER", value = 4},
            {row = 0, col = 3, kind = "NUMBER", value = 8},
            {row = 2, col = 0, kind = "NUMBER", value = 4},
            {row = 3, col = 3, kind = "NUMBER", value = 2}
        },
        allowedOperators = {"DIVIDER"},
        generationRules = {kind = "OPERATORS", operatorPool = {"DIVIDER"}, operatorInterval = 1, operatorSequence = {
            "DIVIDER",
            "DIVIDER",
            "DIVIDER",
            "DIVIDER",
            "DIVIDER"
        }},
        goal = {clearNumbers = true}
    },
    {
        id = 4,
        title = "关于乘法块",
        shortDescription = "本关只出现乘法和除法块",
        barrageMessages = {
            "本关只会出现乘法块与除法块",
            "×n 会放大数字，触发后立即消失",
            "÷n 会缩小数字，触发后立即消失",
            "相同乘法块相遇时可以合成",
            "乘除混排仍按实际移动路径结算",
            "符号可以留下；消除数字块即通关"
        },
        objective = "在乘除混排中消除全部数字块",
        initialCells = {
            {row = 0, col = 0, kind = "NUMBER", value = 4},
            {row = 0, col = 1, kind = "MULTIPLIER", value = 2},
            {row = 0, col = 2, kind = "DIVIDER", value = 4},
            {row = 0, col = 3, kind = "NUMBER", value = 8},
            {row = 2, col = 0, kind = "NUMBER", value = 2},
            {row = 3, col = 3, kind = "NUMBER", value = 1}
        },
        allowedOperators = {"DIVIDER", "MULTIPLIER"},
        generationRules = {kind = "OPERATORS", operatorPool = {"DIVIDER", "MULTIPLIER"}, operatorInterval = 1, operatorSequence = {
            "MULTIPLIER",
            "DIVIDER",
            "MULTIPLIER",
            "DIVIDER",
            "DIVIDER",
            "MULTIPLIER"
        }},
        goal = {clearNumbers = true}
    },
    {
        id = 5,
        title = "关于根号块",
        shortDescription = "本关只出现乘法和根号块",
        barrageMessages = {
            "本关只会出现乘法块与根号块",
            "×n 可以先把较小数字放大",
            "根号块触发一次后立即消失",
            "根号结果向下取到最接近的 2 次幂",
            "例如 √32 会得到 4，而不是 5",
            "符号可以留下；消除数字块即通关"
        },
        objective = "利用乘法与根号的组合消除数字",
        initialCells = {
            {row = 0, col = 0, kind = "NUMBER", value = 8},
            {row = 0, col = 1, kind = "MULTIPLIER", value = 2},
            {row = 0, col = 2, kind = "ROOT"},
            {row = 0, col = 3, kind = "NUMBER", value = 4},
            {row = 2, col = 0, kind = "NUMBER", value = 4},
            {row = 3, col = 3, kind = "NUMBER", value = 2}
        },
        allowedOperators = {"MULTIPLIER", "ROOT"},
        generationRules = {kind = "OPERATORS", operatorPool = {"MULTIPLIER", "ROOT"}, operatorInterval = 1, operatorSequence = {
            "MULTIPLIER",
            "ROOT",
            "ROOT",
            "MULTIPLIER",
            "ROOT",
            "MULTIPLIER"
        }},
        goal = {clearNumbers = true}
    },
    {
        id = 6,
        title = "关于饼干块",
        shortDescription = "从本关起才出现饼干块",
        barrageMessages = {
            "从本关开始会出现饼干块",
            "饼干经过一次滑动后一定消失",
            "刚拆出的数字撞到饼干会被挡住",
            "成功撞击会激活后续三步双倍得分",
            "双倍只影响拆解得分，不影响合成",
            "符号可以留下；消除数字块即通关"
        },
        objective = "体验饼干加成并消除全部数字块",
        initialCells = {{row = 0, col = 0, kind = "NUMBER", value = 8}, {row = 0, col = 1, kind = "COOKIE"}, {row = 2, col = 3, kind = "NUMBER", value = 4}, {row = 3, col = 0, kind = "NUMBER", value = 2}},
        allowedOperators = {"DIVIDER", "MULTIPLIER", "ROOT", "COOKIE"},
        generationRules = {kind = "OPERATORS", operatorPool = {"COOKIE"}, operatorInterval = 1, operatorSequence = {"COOKIE", "COOKIE", "COOKIE"}},
        goal = {clearNumbers = true}
    },
    {
        id = 7,
        title = "无尽生成机制",
        shortDescription = "采用无尽生成，坚持 60 步胜利",
        barrageMessages = {
            "本关使用与无尽模式相同的生成",
            "每次有效滑动只会生成一个方块",
            "生成时会随机选择数字块或符号块",
            "轮数越高，大数字出现概率缓慢上升",
            "乘除参数保持固定，不随轮数增强",
            "坚持完成 60 次有效滑动即可通关"
        },
        objective = "坚持完成 60 次有效滑动",
        initialCells = {{row = 0, col = 0, kind = "NUMBER", value = 8}, {row = 1, col = 3, kind = "NUMBER", value = 16}, {row = 2, col = 0, kind = "NUMBER", value = 8}, {row = 3, col = 3, kind = "NUMBER", value = 16}},
        allowedOperators = {"DIVIDER", "MULTIPLIER", "ROOT", "COOKIE"},
        generationRules = {kind = "ENDLESS"},
        goal = {targetMoves = 60}
    }
}
function ____exports.createTutorialBoard(self, level)
    local state = createEmptyBoard(nil, 4)
    for ____, spec in ipairs(level.initialCells) do
        local index = spec.row * state.size + spec.col
        if spec.kind == "NUMBER" then
            local ____state_cells_3 = state.cells
            local ____state_0, ____nextTileId_1 = state, "nextTileId"
            local ____state_nextTileId_2 = ____state_0[____nextTileId_1]
            ____state_0[____nextTileId_1] = ____state_nextTileId_2 + 1
            ____state_cells_3[index + 1] = {kind = "NUMBER", id = ____state_nextTileId_2, value = spec.value, createdBySplitThisMove = false}
        elseif spec.kind == "DIVIDER" then
            local ____state_cells_7 = state.cells
            local ____state_4, ____nextTileId_5 = state, "nextTileId"
            local ____state_nextTileId_6 = ____state_4[____nextTileId_5]
            ____state_4[____nextTileId_5] = ____state_nextTileId_6 + 1
            ____state_cells_7[index + 1] = {kind = "DIVIDER", id = ____state_nextTileId_6, divisor = spec.value}
        elseif spec.kind == "MULTIPLIER" then
            local ____state_cells_11 = state.cells
            local ____state_8, ____nextTileId_9 = state, "nextTileId"
            local ____state_nextTileId_10 = ____state_8[____nextTileId_9]
            ____state_8[____nextTileId_9] = ____state_nextTileId_10 + 1
            ____state_cells_11[index + 1] = {kind = "MULTIPLIER", id = ____state_nextTileId_10, factor = spec.value}
        elseif spec.kind == "ROOT" then
            local ____state_cells_15 = state.cells
            local ____state_12, ____nextTileId_13 = state, "nextTileId"
            local ____state_nextTileId_14 = ____state_12[____nextTileId_13]
            ____state_12[____nextTileId_13] = ____state_nextTileId_14 + 1
            ____state_cells_15[index + 1] = {kind = "ROOT", id = ____state_nextTileId_14}
        else
            local ____state_cells_19 = state.cells
            local ____state_16, ____nextTileId_17 = state, "nextTileId"
            local ____state_nextTileId_18 = ____state_16[____nextTileId_17]
            ____state_16[____nextTileId_17] = ____state_nextTileId_18 + 1
            ____state_cells_19[index + 1] = {kind = "COOKIE", id = ____state_nextTileId_18}
        end
    end
    return state
end
return ____exports
