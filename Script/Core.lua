local ____lualib = require("lualib_bundle")
local __TS__ObjectAssign = ____lualib.__TS__ObjectAssign
local __TS__NumberIsInteger = ____lualib.__TS__NumberIsInteger
local Error = ____lualib.Error
local RangeError = ____lualib.RangeError
local ReferenceError = ____lualib.ReferenceError
local SyntaxError = ____lualib.SyntaxError
local TypeError = ____lualib.TypeError
local URIError = ____lualib.URIError
local __TS__New = ____lualib.__TS__New
local __TS__ArrayFrom = ____lualib.__TS__ArrayFrom
local __TS__ArraySome = ____lualib.__TS__ArraySome
local __TS__ArrayForEach = ____lualib.__TS__ArrayForEach
local __TS__ArraySplice = ____lualib.__TS__ArraySplice
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArrayEvery = ____lualib.__TS__ArrayEvery
local __TS__ArrayIncludes = ____lualib.__TS__ArrayIncludes
local __TS__ArrayFindIndex = ____lualib.__TS__ArrayFindIndex
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local __TS__Class = ____lualib.__TS__Class
local ____exports = {}
local emptyCell, cloneCell, copyPosition, validatePowerOfTwo, randomIndex, linePositions, samePosition, runSplitPhase, runMovementAndDividerPhase, runMergePhase, runCompressPhase, collectTilePositions, buildMoveEvents, clearSplitProtection, sameBoard, EMPTY
local ____Config = require("Script.Config")
local NORMAL_PRESET = ____Config.NORMAL_PRESET
local UNDO_HISTORY_LIMIT = ____Config.UNDO_HISTORY_LIMIT
local ____ScoreManager = require("Script.ScoreManager")
local ScoreManager = ____ScoreManager.ScoreManager
local ____Json = require("Script.Json")
local decodeJson = ____Json.decodeJson
local encodeJson = ____Json.encodeJson
local ____Random = require("Script.Random")
local doraRandom = ____Random.doraRandom
function emptyCell(self)
    return EMPTY
end
function cloneCell(self, cell)
    if cell.kind == "EMPTY" then
        return emptyCell(nil)
    end
    if cell.kind == "DIVIDER" then
        return __TS__ObjectAssign({}, cell)
    end
    return __TS__ObjectAssign({}, cell, {createdBySplitThisMove = false})
end
function copyPosition(self, position)
    return {row = position.row, col = position.col}
end
function ____exports.indexOf(self, size, position)
    return position.row * size + position.col
end
function ____exports.positionOf(self, size, index)
    return {
        row = math.floor(index / size),
        col = index % size
    }
end
function ____exports.getCell(self, state, position)
    return state.cells[____exports.indexOf(nil, state.size, position) + 1]
end
function validatePowerOfTwo(self, value, label)
    if not __TS__NumberIsInteger(value) or value < 2 or value & value - 1 ~= 0 then
        error(
            __TS__New(Error, label .. " must be a power of two greater than 1"),
            0
        )
    end
end
function randomIndex(self, length, random)
    if length <= 0 then
        error(
            __TS__New(Error, "cannot choose from an empty list"),
            0
        )
    end
    return math.min(
        length - 1,
        math.floor(random(nil) * length)
    )
end
function linePositions(self, size, direction, line)
    local result = {}
    do
        local offset = 0
        while offset < size do
            if direction == "left" then
                result[#result + 1] = {row = line, col = offset}
            elseif direction == "right" then
                result[#result + 1] = {row = line, col = size - 1 - offset}
            elseif direction == "up" then
                result[#result + 1] = {row = offset, col = line}
            else
                result[#result + 1] = {row = size - 1 - offset, col = line}
            end
            offset = offset + 1
        end
    end
    return result
end
function samePosition(self, a, b)
    return a.row == b.row and a.col == b.col
end
--- Resolves one NUMBER hitting one DIVIDER. The NUMBER keeps its identity.
function ____exports.resolveDividerInteraction(self, moving, divider, position)
    local quotient = math.floor(moving.value / divider.divisor)
    local resultValue = quotient >= 1 and quotient or 0
    return {
        tile = resultValue > 0 and __TS__ObjectAssign({}, moving, {value = resultValue}) or nil,
        event = {
            position = copyPosition(nil, position),
            divisor = divider.divisor,
            originalValue = moving.value,
            resultValue = resultValue,
            tileId = moving.id,
            dividerTileId = divider.id
        }
    }
end
function runSplitPhase(self, state, direction, splitEvents)
    local size = state.size
    local initialEmpty = __TS__ArrayMap(
        state.cells,
        function(____, cell) return cell.kind == "EMPTY" end
    )
    if not __TS__ArraySome(
        initialEmpty,
        function(____, value) return value end
    ) then
        return
    end
    local originalNumberIds = __TS__ArrayMap(
        __TS__ArrayFilter(
            state.cells,
            function(____, cell) return cell.kind == "NUMBER" end
        ),
        function(____, cell) return cell.id end
    )
    do
        local line = 0
        while line < size do
            local positions = linePositions(nil, size, direction, line)
            local available = __TS__ArrayFilter(
                __TS__ArrayMap(
                    positions,
                    function(____, position, order) return {
                        position = position,
                        order = order,
                        consumed = not initialEmpty[____exports.indexOf(nil, size, position) + 1]
                    } end
                ),
                function(____, item) return not item.consumed end
            )
            for ____, source in ipairs(positions) do
                do
                    if __TS__ArrayEvery(
                        available,
                        function(____, item) return item.consumed end
                    ) then
                        break
                    end
                    local sourceIndex = ____exports.indexOf(nil, size, source)
                    local cell = state.cells[sourceIndex + 1]
                    if cell.kind ~= "NUMBER" or not __TS__ArrayIncludes(originalNumberIds, cell.id) then
                        goto __continue57
                    end
                    local sourceOrder = __TS__ArrayFindIndex(
                        positions,
                        function(____, position) return samePosition(nil, position, source) end
                    )
                    local destinationEntry = __TS__ArrayFind(
                        available,
                        function(____, item) return not item.consumed end
                    )
                    for ____, candidate in ipairs(available) do
                        if not candidate.consumed and math.abs(candidate.order - sourceOrder) < math.abs(destinationEntry.order - sourceOrder) then
                            destinationEntry = candidate
                        end
                    end
                    destinationEntry.consumed = true
                    local destination = destinationEntry.position
                    local destinationIndex = ____exports.indexOf(nil, size, destination)
                    local resultValue = cell.value == 1 and 0 or cell.value / 2
                    local event = {
                        source = copyPosition(nil, source),
                        destination = copyPosition(nil, destination),
                        originalValue = cell.value,
                        resultValue = resultValue,
                        sourceTileId = cell.id
                    }
                    if resultValue == 0 then
                        state.cells[sourceIndex + 1] = emptyCell(nil)
                    else
                        state.cells[sourceIndex + 1] = {kind = "NUMBER", id = cell.id, value = resultValue, createdBySplitThisMove = true}
                        local ____state_4, ____nextTileId_5 = state, "nextTileId"
                        local ____state_nextTileId_6 = ____state_4[____nextTileId_5]
                        ____state_4[____nextTileId_5] = ____state_nextTileId_6 + 1
                        local createdTileId = ____state_nextTileId_6
                        state.cells[destinationIndex + 1] = {kind = "NUMBER", id = createdTileId, value = resultValue, createdBySplitThisMove = true}
                        event.createdTileId = createdTileId
                    end
                    splitEvents[#splitEvents + 1] = event
                end
                ::__continue57::
            end
            line = line + 1
        end
    end
end
function runMovementAndDividerPhase(self, state, direction, dividerEvents)
    do
        local line = 0
        while line < state.size do
            local positions = linePositions(nil, state.size, direction, line)
            local tiles = {}
            for ____, position in ipairs(positions) do
                local cell = ____exports.getCell(nil, state, position)
                if cell.kind ~= "EMPTY" then
                    tiles[#tiles + 1] = {
                        tile = cell,
                        position = copyPosition(nil, position)
                    }
                end
            end
            local moved = {}
            local pendingDividers = {}
            for ____, item in ipairs(tiles) do
                do
                    if item.tile.kind == "DIVIDER" then
                        pendingDividers[#pendingDividers + 1] = item
                        goto __continue75
                    end
                    local number = item.tile
                    do
                        local index = #pendingDividers - 1
                        while index >= 0 and number do
                            local dividerItem = pendingDividers[index + 1]
                            local interaction = ____exports.resolveDividerInteraction(nil, number, dividerItem.tile, dividerItem.position)
                            dividerEvents[#dividerEvents + 1] = interaction.event
                            number = interaction.tile
                            index = index - 1
                        end
                    end
                    pendingDividers = {}
                    if number then
                        moved[#moved + 1] = number
                    end
                end
                ::__continue75::
            end
            __TS__ArrayForEach(
                pendingDividers,
                function(____, item)
                    local ____temp_7 = #moved + 1
                    moved[____temp_7] = item.tile
                    return ____temp_7
                end
            )
            __TS__ArrayForEach(
                positions,
                function(____, position)
                    state.cells[____exports.indexOf(nil, state.size, position) + 1] = emptyCell(nil)
                end
            )
            __TS__ArrayForEach(
                moved,
                function(____, tile, index)
                    state.cells[____exports.indexOf(nil, state.size, positions[index + 1]) + 1] = tile
                end
            )
            line = line + 1
        end
    end
end
function runMergePhase(self, state, direction, mergeEvents, dividerMergeEvents)
    local scoreDelta = 0
    do
        local line = 0
        while line < state.size do
            local positions = linePositions(nil, state.size, direction, line)
            local tiles = {}
            for ____, position in ipairs(positions) do
                local cell = ____exports.getCell(nil, state, position)
                if cell.kind ~= "EMPTY" then
                    tiles[#tiles + 1] = {
                        tile = cell,
                        position = copyPosition(nil, position)
                    }
                end
            end
            local merged = {}
            local cursor = 0
            while cursor < #tiles do
                local first = tiles[cursor + 1]
                local second = tiles[cursor + 1 + 1]
                if second ~= nil and first.tile.kind == "NUMBER" and second.tile.kind == "NUMBER" and first.tile.value == second.tile.value and not first.tile.createdBySplitThisMove and not second.tile.createdBySplitThisMove then
                    local resultValue = first.tile.value * 2
                    local ____state_8, ____nextTileId_9 = state, "nextTileId"
                    local ____state_nextTileId_10 = ____state_8[____nextTileId_9]
                    ____state_8[____nextTileId_9] = ____state_nextTileId_10 + 1
                    local resultTileId = ____state_nextTileId_10
                    local result = {kind = "NUMBER", id = resultTileId, value = resultValue, createdBySplitThisMove = false}
                    merged[#merged + 1] = {
                        tile = result,
                        position = copyPosition(nil, first.position)
                    }
                    mergeEvents[#mergeEvents + 1] = {
                        sources = {
                            copyPosition(nil, first.position),
                            copyPosition(nil, second.position)
                        },
                        destination = copyPosition(nil, first.position),
                        sourceTileIds = {first.tile.id, second.tile.id},
                        resultTileId = resultTileId,
                        resultValue = resultValue
                    }
                    scoreDelta = scoreDelta + resultValue
                    cursor = cursor + 2
                elseif second ~= nil and first.tile.kind == "DIVIDER" and second.tile.kind == "DIVIDER" and first.tile.divisor == second.tile.divisor then
                    local resultDivisor = first.tile.divisor * 2
                    local ____state_11, ____nextTileId_12 = state, "nextTileId"
                    local ____state_nextTileId_13 = ____state_11[____nextTileId_12]
                    ____state_11[____nextTileId_12] = ____state_nextTileId_13 + 1
                    local resultTileId = ____state_nextTileId_13
                    local result = {kind = "DIVIDER", id = resultTileId, divisor = resultDivisor}
                    merged[#merged + 1] = {
                        tile = result,
                        position = copyPosition(nil, first.position)
                    }
                    dividerMergeEvents[#dividerMergeEvents + 1] = {
                        sources = {
                            copyPosition(nil, first.position),
                            copyPosition(nil, second.position)
                        },
                        destination = copyPosition(nil, first.position),
                        sourceTileIds = {first.tile.id, second.tile.id},
                        resultTileId = resultTileId,
                        resultDivisor = resultDivisor
                    }
                    cursor = cursor + 2
                else
                    merged[#merged + 1] = first
                    cursor = cursor + 1
                end
            end
            __TS__ArrayForEach(
                positions,
                function(____, position)
                    state.cells[____exports.indexOf(nil, state.size, position) + 1] = emptyCell(nil)
                end
            )
            __TS__ArrayForEach(
                merged,
                function(____, item)
                    state.cells[____exports.indexOf(nil, state.size, item.position) + 1] = item.tile
                end
            )
            line = line + 1
        end
    end
    return scoreDelta
end
function runCompressPhase(self, state, direction)
    do
        local line = 0
        while line < state.size do
            local positions = linePositions(nil, state.size, direction, line)
            local tiles = {}
            for ____, position in ipairs(positions) do
                local cell = ____exports.getCell(nil, state, position)
                if cell.kind ~= "EMPTY" then
                    tiles[#tiles + 1] = {
                        tile = cell,
                        position = copyPosition(nil, position)
                    }
                end
            end
            __TS__ArrayForEach(
                positions,
                function(____, position)
                    state.cells[____exports.indexOf(nil, state.size, position) + 1] = emptyCell(nil)
                end
            )
            __TS__ArrayForEach(
                tiles,
                function(____, item, index)
                    local destination = positions[index + 1]
                    state.cells[____exports.indexOf(nil, state.size, destination) + 1] = item.tile
                end
            )
            line = line + 1
        end
    end
end
function collectTilePositions(self, state)
    local positions = {}
    __TS__ArrayForEach(
        state.cells,
        function(____, cell, index)
            if cell.kind ~= "EMPTY" then
                positions[#positions + 1] = {
                    tileId = cell.id,
                    position = ____exports.positionOf(nil, state.size, index)
                }
            end
        end
    )
    return positions
end
function buildMoveEvents(self, starts, state, mergeEvents, dividerMergeEvents)
    local result = {}
    local mergeStarts = __TS__ArrayMap(
        mergeEvents,
        function(____, event) return {tileId = event.resultTileId, position = event.destination} end
    )
    local dividerMergeStarts = __TS__ArrayMap(
        dividerMergeEvents,
        function(____, event) return {tileId = event.resultTileId, position = event.destination} end
    )
    for ____, ____end in ipairs(collectTilePositions(nil, state)) do
        local start = __TS__ArrayFind(
            starts,
            function(____, item) return item.tileId == ____end.tileId end
        ) or __TS__ArrayFind(
            mergeStarts,
            function(____, item) return item.tileId == ____end.tileId end
        ) or __TS__ArrayFind(
            dividerMergeStarts,
            function(____, item) return item.tileId == ____end.tileId end
        )
        if start and not samePosition(nil, start.position, ____end.position) then
            result[#result + 1] = {
                tileId = ____end.tileId,
                from = copyPosition(nil, start.position),
                to = copyPosition(nil, ____end.position)
            }
        end
    end
    return result
end
function clearSplitProtection(self, state)
    __TS__ArrayForEach(
        state.cells,
        function(____, cell)
            if cell.kind == "NUMBER" then
                cell.createdBySplitThisMove = false
            end
        end
    )
end
function sameBoard(self, a, b)
    if a.size ~= b.size then
        return false
    end
    do
        local index = 0
        while index < #a.cells do
            local left = a.cells[index + 1]
            local right = b.cells[index + 1]
            if left.kind ~= right.kind then
                return false
            end
            if left.kind == "NUMBER" and right.kind == "NUMBER" and left.value ~= right.value then
                return false
            end
            if left.kind == "DIVIDER" and right.kind == "DIVIDER" and left.divisor ~= right.divisor then
                return false
            end
            index = index + 1
        end
    end
    return true
end
function ____exports.spawnDivider(self, state, allowedDivisors, random)
    if random == nil then
        random = doraRandom
    end
    __TS__ArrayForEach(
        allowedDivisors,
        function(____, value) return validatePowerOfTwo(nil, value, "divider") end
    )
    local emptyIndices = {}
    __TS__ArrayForEach(
        state.cells,
        function(____, cell, index)
            if cell.kind == "EMPTY" then
                emptyIndices[#emptyIndices + 1] = index
            end
        end
    )
    if #emptyIndices == 0 or #allowedDivisors == 0 then
        return nil
    end
    local boardIndex = emptyIndices[randomIndex(nil, #emptyIndices, random) + 1]
    local divisor = allowedDivisors[randomIndex(nil, #allowedDivisors, random) + 1]
    local ____state_14, ____nextTileId_15 = state, "nextTileId"
    local ____state_nextTileId_16 = ____state_14[____nextTileId_15]
    ____state_14[____nextTileId_15] = ____state_nextTileId_16 + 1
    local tile = {kind = "DIVIDER", id = ____state_nextTileId_16, divisor = divisor}
    state.cells[boardIndex + 1] = tile
    return {
        position = ____exports.positionOf(nil, state.size, boardIndex),
        tileId = tile.id,
        tile = tile
    }
end
function ____exports.executeMove(self, original, direction, options)
    if options == nil then
        options = {}
    end
    local state = {
        size = original.size,
        cells = __TS__ArrayMap(
            original.cells,
            function(____, cell) return cloneCell(nil, cell) end
        ),
        nextTileId = original.nextTileId
    }
    local splitEvents = {}
    local mergeEvents = {}
    local dividerMergeEvents = {}
    local dividerEvents = {}
    local spawnEvents = {}
    runSplitPhase(nil, state, direction, splitEvents)
    local movementStarts = collectTilePositions(nil, state)
    runMovementAndDividerPhase(nil, state, direction, dividerEvents)
    runMergePhase(
        nil,
        state,
        direction,
        mergeEvents,
        dividerMergeEvents
    )
    runCompressPhase(nil, state, direction)
    local moveEvents = buildMoveEvents(
        nil,
        movementStarts,
        state,
        mergeEvents,
        dividerMergeEvents
    )
    local changed = not sameBoard(nil, original, state)
    if changed and options.spawnDividerAfterMove then
        local event = ____exports.spawnDivider(nil, state, options.allowedDivisors or ({}), options.random or doraRandom)
        if event then
            spawnEvents[#spawnEvents + 1] = event
        end
    end
    clearSplitProtection(nil, state)
    return {
        state = state,
        splitEvents = splitEvents,
        dividerEvents = dividerEvents,
        mergeEvents = mergeEvents,
        dividerMergeEvents = dividerMergeEvents,
        moveEvents = moveEvents,
        spawnEvents = spawnEvents,
        scoreDelta = 0,
        changed = changed
    }
end
function ____exports.hasAnyLegalMove(self, state)
    local directions = {"left", "right", "up", "down"}
    return __TS__ArraySome(
        directions,
        function(____, direction) return ____exports.executeMove(nil, state, direction).changed end
    )
end
do
    local ____Config = require("Script.Config")
    ____exports.NORMAL_PRESET = ____Config.NORMAL_PRESET
end
EMPTY = {kind = "EMPTY"}
function ____exports.createEmptyBoard(self, size)
    if not __TS__NumberIsInteger(size) or size < 2 then
        error(
            __TS__New(Error, "board size must be an integer >= 2"),
            0
        )
    end
    return {
        size = size,
        cells = __TS__ArrayFrom(
            {length = size * size},
            function() return emptyCell(nil) end
        ),
        nextTileId = 1
    }
end
function ____exports.validatePreset(self, preset)
    local capacity = preset.boardSize * preset.boardSize
    if #preset.initialValues == 0 then
        error(
            __TS__New(Error, "initialValues cannot be empty"),
            0
        )
    end
    if __TS__ArraySome(
        preset.initialValues,
        function(____, value) return not __TS__NumberIsInteger(value) or value < 1 end
    ) then
        error(
            __TS__New(Error, "initialValues must contain positive integers"),
            0
        )
    end
    if preset.initialTileCount < 0 or preset.initialTileCount > capacity - preset.minInitialEmptyCells then
        error(
            __TS__New(Error, "initialTileCount violates minInitialEmptyCells"),
            0
        )
    end
    if #preset.initialValues < preset.initialTileCount then
        error(
            __TS__New(Error, "initialValues must provide one configured value per initial tile"),
            0
        )
    end
    __TS__ArrayForEach(
        preset.allowedDivisors,
        function(____, value) return validatePowerOfTwo(nil, value, "divider") end
    )
    if not __TS__NumberIsInteger(preset.dividerSpawnInterval) or preset.dividerSpawnInterval < 1 then
        error(
            __TS__New(Error, "dividerSpawnInterval must be a positive integer"),
            0
        )
    end
    local previousStageMove = 0
    do
        local index = 0
        while index < #preset.endlessNumberStages do
            local stage = preset.endlessNumberStages[index + 1]
            if not __TS__NumberIsInteger(stage.fromMove) or stage.fromMove < 1 or stage.fromMove <= previousStageMove then
                error(
                    __TS__New(Error, "endlessNumberStages must be ordered by positive fromMove values"),
                    0
                )
            end
            if #stage.values == 0 or __TS__ArraySome(
                stage.values,
                function(____, value) return not __TS__NumberIsInteger(value) or value < 1 end
            ) then
                error(
                    __TS__New(Error, "endlessNumberStages must contain positive integer values"),
                    0
                )
            end
            previousStageMove = stage.fromMove
            index = index + 1
        end
    end
    if preset.targetRule == "ENDLESS" and (#preset.endlessNumberStages == 0 or preset.endlessNumberStages[1].fromMove ~= 1) then
        error(
            __TS__New(Error, "endless mode requires a number stage beginning at move 1"),
            0
        )
    end
end
function ____exports.endlessNumberPoolForMove(self, preset, moveCount)
    if #preset.endlessNumberStages == 0 then
        error(
            __TS__New(Error, "endless number stages are not configured"),
            0
        )
    end
    local values = preset.endlessNumberStages[1].values
    do
        local index = 1
        while index < #preset.endlessNumberStages do
            local stage = preset.endlessNumberStages[index + 1]
            if moveCount < stage.fromMove then
                break
            end
            values = stage.values
            index = index + 1
        end
    end
    return values
end
function ____exports.initializeBoard(self, preset, random)
    if preset == nil then
        preset = NORMAL_PRESET
    end
    if random == nil then
        random = doraRandom
    end
    ____exports.validatePreset(nil, preset)
    local state = ____exports.createEmptyBoard(nil, preset.boardSize)
    local available = __TS__ArrayFrom(
        {length = #state.cells},
        function(____, _, index) return index end
    )
    local valueDeck = {}
    do
        local index = 0
        while index < #preset.initialValues do
            valueDeck[#valueDeck + 1] = preset.initialValues[index + 1]
            index = index + 1
        end
    end
    do
        local count = 0
        while count < preset.initialTileCount do
            local slot = randomIndex(nil, #available, random)
            local index = __TS__ArraySplice(available, slot, 1)[1]
            local valueSlot = randomIndex(nil, #valueDeck, random)
            local value = __TS__ArraySplice(valueDeck, valueSlot, 1)[1]
            local ____state_cells_3 = state.cells
            local ____state_0, ____nextTileId_1 = state, "nextTileId"
            local ____state_nextTileId_2 = ____state_0[____nextTileId_1]
            ____state_0[____nextTileId_1] = ____state_nextTileId_2 + 1
            ____state_cells_3[index + 1] = {kind = "NUMBER", id = ____state_nextTileId_2, value = value, createdBySplitThisMove = false}
            count = count + 1
        end
    end
    return state
end
function ____exports.cloneBoard(self, state)
    return {
        size = state.size,
        cells = __TS__ArrayMap(
            state.cells,
            function(____, cell) return cell.kind == "EMPTY" and emptyCell(nil) or __TS__ObjectAssign({}, cell) end
        ),
        nextTileId = state.nextTileId
    }
end
function ____exports.serializeBoard(self, state)
    return encodeJson(nil, state)
end
function ____exports.restoreBoard(self, serialized)
    local parsed = decodeJson(nil, serialized)
    if not __TS__NumberIsInteger(parsed.size) or #parsed.cells ~= parsed.size * parsed.size then
        error(
            __TS__New(Error, "invalid saved board"),
            0
        )
    end
    __TS__ArrayForEach(
        parsed.cells,
        function(____, cell)
            if cell.kind == "NUMBER" and (not __TS__NumberIsInteger(cell.value) or cell.value < 1) then
                error(
                    __TS__New(Error, "invalid number tile in saved board"),
                    0
                )
            end
            if cell.kind == "DIVIDER" then
                validatePowerOfTwo(nil, cell.divisor, "saved divider")
            end
        end
    )
    return ____exports.cloneBoard(nil, parsed)
end
function ____exports.spawnNumber(self, state, numberPool, random)
    if random == nil then
        random = doraRandom
    end
    if #numberPool == 0 then
        return nil
    end
    local emptyIndices = {}
    __TS__ArrayForEach(
        state.cells,
        function(____, cell, index)
            if cell.kind == "EMPTY" then
                emptyIndices[#emptyIndices + 1] = index
            end
        end
    )
    if #emptyIndices == 0 then
        return nil
    end
    local boardIndex = emptyIndices[randomIndex(nil, #emptyIndices, random) + 1]
    local value = numberPool[randomIndex(nil, #numberPool, random) + 1]
    if not __TS__NumberIsInteger(value) or value < 1 then
        error(
            __TS__New(Error, "spawned number must be a positive integer"),
            0
        )
    end
    local ____state_17, ____nextTileId_18 = state, "nextTileId"
    local ____state_nextTileId_19 = ____state_17[____nextTileId_18]
    ____state_17[____nextTileId_18] = ____state_nextTileId_19 + 1
    local tile = {kind = "NUMBER", id = ____state_nextTileId_19, value = value, createdBySplitThisMove = false}
    state.cells[boardIndex + 1] = tile
    return {
        position = ____exports.positionOf(nil, state.size, boardIndex),
        tileId = tile.id,
        tile = tile
    }
end
____exports.NormalVictoryCondition = __TS__Class()
local NormalVictoryCondition = ____exports.NormalVictoryCondition
NormalVictoryCondition.name = "NormalVictoryCondition"
function NormalVictoryCondition.prototype.____constructor(self)
end
function NormalVictoryCondition.prototype.evaluate(self, state)
    local hasNumber = __TS__ArraySome(
        state.cells,
        function(____, cell) return cell.kind == "NUMBER" end
    )
    if not hasNumber then
        return "victory"
    end
    return ____exports.hasAnyLegalMove(nil, state) and "playing" or "defeat"
end
____exports.EndlessVictoryCondition = __TS__Class()
local EndlessVictoryCondition = ____exports.EndlessVictoryCondition
EndlessVictoryCondition.name = "EndlessVictoryCondition"
function EndlessVictoryCondition.prototype.____constructor(self)
end
function EndlessVictoryCondition.prototype.evaluate(self, state)
    return ____exports.hasAnyLegalMove(nil, state) and "playing" or "defeat"
end
____exports.GameSession = __TS__Class()
local GameSession = ____exports.GameSession
GameSession.name = "GameSession"
function GameSession.prototype.____constructor(self, preset, random, victoryCondition, initialState, options)
    if preset == nil then
        preset = NORMAL_PRESET
    end
    if random == nil then
        random = doraRandom
    end
    if victoryCondition == nil then
        victoryCondition = __TS__New(____exports.NormalVictoryCondition)
    end
    if options == nil then
        options = {}
    end
    self.moveCount = 0
    self.score = 0
    self.history = {}
    self.runStatus = "playing"
    self.preset = preset
    self.random = random
    self.state = initialState and ____exports.cloneBoard(nil, initialState) or ____exports.initializeBoard(nil, preset, random)
    self.mode = options.mode or "difficulty"
    local ____options_timed_20 = options.timed
    if ____options_timed_20 == nil then
        ____options_timed_20 = preset.defaultTimed
    end
    self.timed = ____options_timed_20
    self.scoreManager = options.scoreManager or __TS__New(ScoreManager)
    self.maxHistory = options.maxHistory or UNDO_HISTORY_LIMIT
    self.victoryCondition = (self.mode == "endless" or preset.targetRule == "ENDLESS") and __TS__New(____exports.EndlessVictoryCondition) or victoryCondition
    local initialStatus = self.victoryCondition:evaluate(self.state)
    self.runStatus = initialStatus == "playing" and "playing" or initialStatus
end
function GameSession.prototype.move(self, direction)
    if self.runStatus ~= "playing" then
        return ____exports.executeMove(nil, self.state, direction)
    end
    local before = encodeJson(nil, {state = self.state, moveCount = self.moveCount, score = self.score, runStatus = self.runStatus})
    local result = ____exports.executeMove(nil, self.state, direction)
    if result.changed then
        result.scoreDelta = self.scoreManager:calculate(result)
        local ____self_history_21 = self.history
        ____self_history_21[#____self_history_21 + 1] = before
        if #self.history > self.maxHistory then
            table.remove(self.history, 1)
        end
        local nextMoveCount = self.moveCount + 1
        if nextMoveCount % self.preset.dividerSpawnInterval == 0 then
            local divider = ____exports.spawnDivider(nil, result.state, self.preset.allowedDivisors, self.random)
            if divider then
                local ____result_spawnEvents_22 = result.spawnEvents
                ____result_spawnEvents_22[#____result_spawnEvents_22 + 1] = divider
            end
        end
        if self.mode == "endless" then
            local number = ____exports.spawnNumber(
                nil,
                result.state,
                ____exports.endlessNumberPoolForMove(nil, self.preset, nextMoveCount),
                self.random
            )
            if number then
                local ____result_spawnEvents_23 = result.spawnEvents
                ____result_spawnEvents_23[#____result_spawnEvents_23 + 1] = number
            end
        end
        self.state = result.state
        self.moveCount = self.moveCount + 1
        self.score = self.score + result.scoreDelta
        local evaluated = self.victoryCondition:evaluate(self.state)
        self.runStatus = evaluated == "playing" and "playing" or evaluated
    end
    return result
end
function GameSession.prototype.undo(self)
    local serialized = table.remove(self.history)
    if not serialized then
        return false
    end
    local snapshot = decodeJson(nil, serialized)
    self.state = ____exports.restoreBoard(
        nil,
        encodeJson(nil, snapshot.state)
    )
    self.moveCount = snapshot.moveCount
    self.score = snapshot.score
    self.runStatus = snapshot.runStatus
    return true
end
function GameSession.prototype.pause(self)
    if self.runStatus == "playing" then
        self.runStatus = "paused"
    end
end
function GameSession.prototype.resume(self)
    if self.runStatus == "paused" then
        self.runStatus = "playing"
    end
end
function GameSession.prototype.status(self)
    if self.runStatus == "paused" then
        return "playing"
    end
    return self.runStatus == "victory" and "victory" or (self.runStatus == "defeat" and "defeat" or "playing")
end
return ____exports
