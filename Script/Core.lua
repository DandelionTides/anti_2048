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
local emptyCell, cloneCell, copyPosition, validatePowerOfTwo, randomIndex, linePositions, samePosition, runSplitPhase, runMovementAndOperatorPhase, runMergePhase, runCompressPhase, collectTilePositions, buildMoveEvents, clearSplitProtection, sameBoard, EMPTY
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
    if cell.kind ~= "NUMBER" then
        return __TS__ObjectAssign({}, cell)
    end
    return __TS__ObjectAssign({}, cell, {createdBySplitThisMove = false, cookieBlockedThisMove = false})
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
function ____exports.resolveMultiplierInteraction(self, moving, multiplier, position)
    local resultValue = moving.value * multiplier.factor
    return {
        tile = __TS__ObjectAssign({}, moving, {value = resultValue}),
        event = {
            position = copyPosition(nil, position),
            factor = multiplier.factor,
            originalValue = moving.value,
            resultValue = resultValue,
            tileId = moving.id,
            multiplierTileId = multiplier.id
        }
    }
end
function ____exports.floorPowerOfTwo(self, value)
    if value < 1 then
        return 0
    end
    local result = 1
    while result * 2 <= value do
        result = result * 2
    end
    return result
end
function ____exports.resolveRootInteraction(self, moving, root, position)
    local resultValue = ____exports.floorPowerOfTwo(
        nil,
        math.sqrt(moving.value)
    )
    return {
        tile = __TS__ObjectAssign({}, moving, {value = resultValue}),
        event = {
            position = copyPosition(nil, position),
            originalValue = moving.value,
            resultValue = resultValue,
            tileId = moving.id,
            rootTileId = root.id
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
                        goto __continue79
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
                ::__continue79::
            end
            line = line + 1
        end
    end
end
function runMovementAndOperatorPhase(self, state, direction, dividerEvents, multiplierEvents, rootEvents, cookieEvents)
    do
        local line = 0
        while line < state.size do
            local positions = linePositions(nil, state.size, direction, line)
            local tiles = {}
            do
                local order = 0
                while order < #positions do
                    local position = positions[order + 1]
                    local cell = ____exports.getCell(nil, state, position)
                    if cell.kind ~= "EMPTY" then
                        tiles[#tiles + 1] = {
                            tile = cell,
                            position = copyPosition(nil, position),
                            order = order
                        }
                        if cell.kind == "COOKIE" then
                            cookieEvents[#cookieEvents + 1] = {
                                position = copyPosition(nil, position),
                                cookieTileId = cell.id,
                                triggered = false
                            }
                        end
                    end
                    order = order + 1
                end
            end
            local moved = __TS__ArrayFrom(
                {length = state.size},
                function() return emptyCell(nil) end
            )
            local writeCursor = 0
            local pendingDividers = {}
            local function place(____, tile, minimumIndex)
                if minimumIndex == nil then
                    minimumIndex = writeCursor
                end
                local index = math.max(writeCursor, minimumIndex)
                while index < #moved and moved[index + 1].kind ~= "EMPTY" do
                    index = index + 1
                end
                if index < #moved then
                    moved[index + 1] = tile
                    writeCursor = index + 1
                end
            end
            local function placePendingPrefix(____, endExclusive)
                do
                    local index = 0
                    while index < endExclusive do
                        local tile = pendingDividers[index + 1].tile
                        if tile.kind ~= "COOKIE" then
                            place(nil, tile)
                        end
                        index = index + 1
                    end
                end
            end
            for ____, item in ipairs(tiles) do
                do
                    if item.tile.kind ~= "NUMBER" then
                        pendingDividers[#pendingDividers + 1] = item
                        goto __continue106
                    end
                    local number = item.tile
                    local resolvedOrBlocked = false
                    do
                        local index = #pendingDividers - 1
                        while index >= 0 and number do
                            local operatorItem = pendingDividers[index + 1]
                            local operator = operatorItem.tile
                            if operator.kind == "COOKIE" then
                                if number.createdBySplitThisMove then
                                    local cookieEvent = __TS__ArrayFind(
                                        cookieEvents,
                                        function(____, event) return event.cookieTileId == operator.id end
                                    )
                                    if cookieEvent then
                                        cookieEvent.triggered = true
                                        cookieEvent.blockedTileId = number.id
                                    end
                                    placePendingPrefix(nil, index)
                                    number = __TS__ObjectAssign({}, number, {cookieBlockedThisMove = true})
                                    place(nil, number, operatorItem.order + 1)
                                    resolvedOrBlocked = true
                                    break
                                end
                            elseif operator.kind == "DIVIDER" then
                                local interaction = ____exports.resolveDividerInteraction(nil, number, operator, operatorItem.position)
                                dividerEvents[#dividerEvents + 1] = interaction.event
                                number = interaction.tile
                                if not number then
                                    placePendingPrefix(nil, index)
                                    resolvedOrBlocked = true
                                end
                            elseif operator.kind == "MULTIPLIER" then
                                local interaction = ____exports.resolveMultiplierInteraction(nil, number, operator, operatorItem.position)
                                multiplierEvents[#multiplierEvents + 1] = interaction.event
                                number = interaction.tile
                            elseif operator.kind == "ROOT" then
                                local interaction = ____exports.resolveRootInteraction(nil, number, operator, operatorItem.position)
                                rootEvents[#rootEvents + 1] = interaction.event
                                number = interaction.tile
                            end
                            index = index - 1
                        end
                    end
                    pendingDividers = {}
                    if number and not resolvedOrBlocked then
                        place(nil, number)
                    end
                end
                ::__continue106::
            end
            placePendingPrefix(nil, #pendingDividers)
            __TS__ArrayForEach(
                positions,
                function(____, position)
                    state.cells[____exports.indexOf(nil, state.size, position) + 1] = emptyCell(nil)
                end
            )
            do
                local index = 0
                while index < #moved do
                    state.cells[____exports.indexOf(nil, state.size, positions[index + 1]) + 1] = moved[index + 1]
                    index = index + 1
                end
            end
            line = line + 1
        end
    end
end
function runMergePhase(self, state, direction, mergeEvents, dividerMergeEvents, multiplierMergeEvents)
    local scoreDelta = 0
    do
        local line = 0
        while line < state.size do
            local positions = linePositions(nil, state.size, direction, line)
            local starts = {0}
            do
                local index = 1
                while index < #positions do
                    local cell = ____exports.getCell(nil, state, positions[index + 1])
                    if cell.kind == "NUMBER" and cell.cookieBlockedThisMove then
                        starts[#starts + 1] = index
                    end
                    index = index + 1
                end
            end
            do
                local segmentIndex = 0
                while segmentIndex < #starts do
                    local start = starts[segmentIndex + 1]
                    local ____end = segmentIndex + 1 < #starts and starts[segmentIndex + 1 + 1] or #positions
                    local tiles = {}
                    do
                        local order = start
                        while order < ____end do
                            local position = positions[order + 1]
                            local cell = ____exports.getCell(nil, state, position)
                            if cell.kind ~= "EMPTY" then
                                tiles[#tiles + 1] = {
                                    tile = cell,
                                    position = copyPosition(nil, position),
                                    order = order
                                }
                            end
                            order = order + 1
                        end
                    end
                    local merged = {}
                    local cursor = 0
                    while cursor < #tiles do
                        local first = tiles[cursor + 1]
                        local second = tiles[cursor + 1 + 1]
                        local destination = positions[start + #merged + 1]
                        if second ~= nil and first.tile.kind == "NUMBER" and second.tile.kind == "NUMBER" and first.tile.value == second.tile.value and not first.tile.createdBySplitThisMove and not second.tile.createdBySplitThisMove then
                            local resultValue = first.tile.value * 2
                            local ____state_7, ____nextTileId_8 = state, "nextTileId"
                            local ____state_nextTileId_9 = ____state_7[____nextTileId_8]
                            ____state_7[____nextTileId_8] = ____state_nextTileId_9 + 1
                            local resultTileId = ____state_nextTileId_9
                            merged[#merged + 1] = {kind = "NUMBER", id = resultTileId, value = resultValue, createdBySplitThisMove = false}
                            mergeEvents[#mergeEvents + 1] = {
                                sources = {
                                    copyPosition(nil, first.position),
                                    copyPosition(nil, second.position)
                                },
                                destination = copyPosition(nil, destination),
                                sourceTileIds = {first.tile.id, second.tile.id},
                                resultTileId = resultTileId,
                                resultValue = resultValue
                            }
                            scoreDelta = scoreDelta + resultValue
                            cursor = cursor + 2
                        elseif second ~= nil and first.tile.kind == "DIVIDER" and second.tile.kind == "DIVIDER" and first.tile.divisor == second.tile.divisor then
                            local resultDivisor = first.tile.divisor * 2
                            local ____state_10, ____nextTileId_11 = state, "nextTileId"
                            local ____state_nextTileId_12 = ____state_10[____nextTileId_11]
                            ____state_10[____nextTileId_11] = ____state_nextTileId_12 + 1
                            local resultTileId = ____state_nextTileId_12
                            merged[#merged + 1] = {kind = "DIVIDER", id = resultTileId, divisor = resultDivisor}
                            dividerMergeEvents[#dividerMergeEvents + 1] = {
                                sources = {
                                    copyPosition(nil, first.position),
                                    copyPosition(nil, second.position)
                                },
                                destination = copyPosition(nil, destination),
                                sourceTileIds = {first.tile.id, second.tile.id},
                                resultTileId = resultTileId,
                                resultDivisor = resultDivisor
                            }
                            cursor = cursor + 2
                        elseif second ~= nil and first.tile.kind == "MULTIPLIER" and second.tile.kind == "MULTIPLIER" and first.tile.factor == second.tile.factor then
                            local resultFactor = first.tile.factor * 2
                            local ____state_13, ____nextTileId_14 = state, "nextTileId"
                            local ____state_nextTileId_15 = ____state_13[____nextTileId_14]
                            ____state_13[____nextTileId_14] = ____state_nextTileId_15 + 1
                            local resultTileId = ____state_nextTileId_15
                            merged[#merged + 1] = {kind = "MULTIPLIER", id = resultTileId, factor = resultFactor}
                            multiplierMergeEvents[#multiplierMergeEvents + 1] = {
                                sources = {
                                    copyPosition(nil, first.position),
                                    copyPosition(nil, second.position)
                                },
                                destination = copyPosition(nil, destination),
                                sourceTileIds = {first.tile.id, second.tile.id},
                                resultTileId = resultTileId,
                                resultFactor = resultFactor
                            }
                            cursor = cursor + 2
                        else
                            merged[#merged + 1] = first.tile
                            cursor = cursor + 1
                        end
                    end
                    do
                        local order = start
                        while order < ____end do
                            state.cells[____exports.indexOf(nil, state.size, positions[order + 1]) + 1] = emptyCell(nil)
                            order = order + 1
                        end
                    end
                    do
                        local index = 0
                        while index < #merged do
                            state.cells[____exports.indexOf(nil, state.size, positions[start + index + 1]) + 1] = merged[index + 1]
                            index = index + 1
                        end
                    end
                    segmentIndex = segmentIndex + 1
                end
            end
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
            local starts = {0}
            do
                local index = 1
                while index < #positions do
                    local cell = ____exports.getCell(nil, state, positions[index + 1])
                    if cell.kind == "NUMBER" and cell.cookieBlockedThisMove then
                        starts[#starts + 1] = index
                    end
                    index = index + 1
                end
            end
            do
                local segmentIndex = 0
                while segmentIndex < #starts do
                    local start = starts[segmentIndex + 1]
                    local ____end = segmentIndex + 1 < #starts and starts[segmentIndex + 1 + 1] or #positions
                    local tiles = {}
                    do
                        local order = start
                        while order < ____end do
                            local cell = ____exports.getCell(nil, state, positions[order + 1])
                            if cell.kind ~= "EMPTY" then
                                tiles[#tiles + 1] = cell
                            end
                            state.cells[____exports.indexOf(nil, state.size, positions[order + 1]) + 1] = emptyCell(nil)
                            order = order + 1
                        end
                    end
                    do
                        local index = 0
                        while index < #tiles do
                            state.cells[____exports.indexOf(nil, state.size, positions[start + index + 1]) + 1] = tiles[index + 1]
                            index = index + 1
                        end
                    end
                    segmentIndex = segmentIndex + 1
                end
            end
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
function buildMoveEvents(self, starts, state, mergeEvents, dividerMergeEvents, multiplierMergeEvents)
    local result = {}
    local mergeStarts = __TS__ArrayMap(
        mergeEvents,
        function(____, event) return {tileId = event.resultTileId, position = event.destination} end
    )
    local dividerMergeStarts = __TS__ArrayMap(
        dividerMergeEvents,
        function(____, event) return {tileId = event.resultTileId, position = event.destination} end
    )
    local multiplierMergeStarts = __TS__ArrayMap(
        multiplierMergeEvents,
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
        ) or __TS__ArrayFind(
            multiplierMergeStarts,
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
                cell.cookieBlockedThisMove = false
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
            if left.kind == "MULTIPLIER" and right.kind == "MULTIPLIER" and left.factor ~= right.factor then
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
    local ____state_16, ____nextTileId_17 = state, "nextTileId"
    local ____state_nextTileId_18 = ____state_16[____nextTileId_17]
    ____state_16[____nextTileId_17] = ____state_nextTileId_18 + 1
    local tile = {kind = "DIVIDER", id = ____state_nextTileId_18, divisor = divisor}
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
    local multiplierMergeEvents = {}
    local dividerEvents = {}
    local multiplierEvents = {}
    local rootEvents = {}
    local cookieEvents = {}
    local spawnEvents = {}
    runSplitPhase(nil, state, direction, splitEvents)
    local movementStarts = collectTilePositions(nil, state)
    runMovementAndOperatorPhase(
        nil,
        state,
        direction,
        dividerEvents,
        multiplierEvents,
        rootEvents,
        cookieEvents
    )
    runMergePhase(
        nil,
        state,
        direction,
        mergeEvents,
        dividerMergeEvents,
        multiplierMergeEvents
    )
    runCompressPhase(nil, state, direction)
    local moveEvents = buildMoveEvents(
        nil,
        movementStarts,
        state,
        mergeEvents,
        dividerMergeEvents,
        multiplierMergeEvents
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
        multiplierEvents = multiplierEvents,
        rootEvents = rootEvents,
        cookieEvents = cookieEvents,
        mergeEvents = mergeEvents,
        dividerMergeEvents = dividerMergeEvents,
        multiplierMergeEvents = multiplierMergeEvents,
        moveEvents = moveEvents,
        spawnEvents = spawnEvents,
        scoreDelta = 0,
        scoreMultiplier = 1,
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
    __TS__ArrayForEach(
        preset.allowedMultipliers,
        function(____, value) return validatePowerOfTwo(nil, value, "multiplier") end
    )
    if #preset.operatorPool == 0 then
        error(
            __TS__New(Error, "operatorPool cannot be empty"),
            0
        )
    end
    if not __TS__NumberIsInteger(preset.operatorSpawnInterval) or preset.operatorSpawnInterval < 1 then
        error(
            __TS__New(Error, "operatorSpawnInterval must be a positive integer"),
            0
        )
    end
    if preset.endlessNumberChance < 0 or preset.endlessNumberChance > 1 then
        error(
            __TS__New(Error, "endlessNumberChance must be between 0 and 1"),
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
            if cell.kind == "MULTIPLIER" then
                validatePowerOfTwo(nil, cell.factor, "saved multiplier")
            end
            if cell.kind ~= "EMPTY" and not __TS__NumberIsInteger(cell.id) then
                error(
                    __TS__New(Error, "invalid tile id in saved board"),
                    0
                )
            end
        end
    )
    return ____exports.cloneBoard(nil, parsed)
end
function ____exports.spawnMultiplier(self, state, allowedMultipliers, random)
    if random == nil then
        random = doraRandom
    end
    __TS__ArrayForEach(
        allowedMultipliers,
        function(____, value) return validatePowerOfTwo(nil, value, "multiplier") end
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
    if #emptyIndices == 0 or #allowedMultipliers == 0 then
        return nil
    end
    local boardIndex = emptyIndices[randomIndex(nil, #emptyIndices, random) + 1]
    local factor = allowedMultipliers[randomIndex(nil, #allowedMultipliers, random) + 1]
    local ____state_19, ____nextTileId_20 = state, "nextTileId"
    local ____state_nextTileId_21 = ____state_19[____nextTileId_20]
    ____state_19[____nextTileId_20] = ____state_nextTileId_21 + 1
    local tile = {kind = "MULTIPLIER", id = ____state_nextTileId_21, factor = factor}
    state.cells[boardIndex + 1] = tile
    return {
        position = ____exports.positionOf(nil, state.size, boardIndex),
        tileId = tile.id,
        tile = tile
    }
end
function ____exports.spawnRoot(self, state, random)
    if random == nil then
        random = doraRandom
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
    local ____state_22, ____nextTileId_23 = state, "nextTileId"
    local ____state_nextTileId_24 = ____state_22[____nextTileId_23]
    ____state_22[____nextTileId_23] = ____state_nextTileId_24 + 1
    local tile = {kind = "ROOT", id = ____state_nextTileId_24}
    state.cells[boardIndex + 1] = tile
    return {
        position = ____exports.positionOf(nil, state.size, boardIndex),
        tileId = tile.id,
        tile = tile
    }
end
function ____exports.spawnCookie(self, state, random)
    if random == nil then
        random = doraRandom
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
    local ____state_25, ____nextTileId_26 = state, "nextTileId"
    local ____state_nextTileId_27 = ____state_25[____nextTileId_26]
    ____state_25[____nextTileId_26] = ____state_nextTileId_27 + 1
    local tile = {kind = "COOKIE", id = ____state_nextTileId_27}
    state.cells[boardIndex + 1] = tile
    return {
        position = ____exports.positionOf(nil, state.size, boardIndex),
        tileId = tile.id,
        tile = tile
    }
end
function ____exports.spawnOperator(self, state, preset, operatorPool, random)
    if operatorPool == nil then
        operatorPool = preset.operatorPool
    end
    if random == nil then
        random = doraRandom
    end
    if #operatorPool == 0 then
        return nil
    end
    local kind = operatorPool[randomIndex(nil, #operatorPool, random) + 1]
    if kind == "DIVIDER" then
        return ____exports.spawnDivider(nil, state, preset.allowedDivisors, random)
    end
    if kind == "MULTIPLIER" then
        return ____exports.spawnMultiplier(nil, state, preset.allowedMultipliers, random)
    end
    if kind == "ROOT" then
        return ____exports.spawnRoot(nil, state, random)
    end
    return ____exports.spawnCookie(nil, state, random)
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
    local ____state_28, ____nextTileId_29 = state, "nextTileId"
    local ____state_nextTileId_30 = ____state_28[____nextTileId_29]
    ____state_28[____nextTileId_29] = ____state_nextTileId_30 + 1
    local tile = {kind = "NUMBER", id = ____state_nextTileId_30, value = value, createdBySplitThisMove = false}
    state.cells[boardIndex + 1] = tile
    return {
        position = ____exports.positionOf(nil, state.size, boardIndex),
        tileId = tile.id,
        tile = tile
    }
end
function ____exports.spawnEndlessTile(self, state, preset, moveCount, operatorPool, numberChance, random)
    if operatorPool == nil then
        operatorPool = preset.operatorPool
    end
    if numberChance == nil then
        numberChance = preset.endlessNumberChance
    end
    if random == nil then
        random = doraRandom
    end
    if random(nil) < numberChance then
        return ____exports.spawnNumber(
            nil,
            state,
            ____exports.endlessNumberPoolForMove(nil, preset, moveCount),
            random
        )
    end
    return ____exports.spawnOperator(
        nil,
        state,
        preset,
        operatorPool,
        random
    )
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
    self.scoreMultiplierMovesRemaining = 0
    self.tutorialProgress = {
        splitEvents = 0,
        dividerEvents = 0,
        multiplierEvents = 0,
        rootEvents = 0,
        cookieTriggers = 0,
        doubledMoves = 0
    }
    self.history = {}
    self.runStatus = "playing"
    self.preset = preset
    self.random = random
    self.state = initialState and ____exports.cloneBoard(nil, initialState) or ____exports.initializeBoard(nil, preset, random)
    self.mode = options.mode or "difficulty"
    local ____options_timed_31 = options.timed
    if ____options_timed_31 == nil then
        ____options_timed_31 = preset.defaultTimed
    end
    self.timed = ____options_timed_31
    self.scoreManager = options.scoreManager or __TS__New(ScoreManager)
    self.maxHistory = options.maxHistory or UNDO_HISTORY_LIMIT
    self.generationRules = options.generationRules or (self.mode == "endless" and ({kind = "ENDLESS"}) or (self.mode == "tutorial" and ({kind = "NONE"}) or ({kind = "OPERATORS", operatorInterval = preset.operatorSpawnInterval})))
    self.tutorialGoal = options.tutorialGoal
    self.victoryCondition = (self.mode == "endless" or preset.targetRule == "ENDLESS") and __TS__New(____exports.EndlessVictoryCondition) or victoryCondition
    local initialStatus = self.mode == "tutorial" and self.tutorialGoal and (self:meetsTutorialGoal() and "victory" or (____exports.hasAnyLegalMove(nil, self.state) and "playing" or "defeat")) or self.victoryCondition:evaluate(self.state)
    self.runStatus = initialStatus == "playing" and "playing" or initialStatus
end
function GameSession.prototype.move(self, direction)
    if self.runStatus ~= "playing" then
        return ____exports.executeMove(nil, self.state, direction)
    end
    local before = encodeJson(nil, {
        state = self.state,
        moveCount = self.moveCount,
        score = self.score,
        scoreMultiplierMovesRemaining = self.scoreMultiplierMovesRemaining,
        tutorialProgress = self.tutorialProgress,
        runStatus = self.runStatus
    })
    local result = ____exports.executeMove(nil, self.state, direction)
    if result.changed then
        result.scoreMultiplier = self.scoreMultiplierMovesRemaining > 0 and 2 or 1
        result.scoreDelta = self.scoreManager:calculate(result) * result.scoreMultiplier
        local ____self_history_32 = self.history
        ____self_history_32[#____self_history_32 + 1] = before
        if #self.history > self.maxHistory then
            table.remove(self.history, 1)
        end
        local nextMoveCount = self.moveCount + 1
        if self.scoreMultiplierMovesRemaining > 0 then
            self.scoreMultiplierMovesRemaining = self.scoreMultiplierMovesRemaining - 1
            local ____self_tutorialProgress_33, ____doubledMoves_34 = self.tutorialProgress, "doubledMoves"
            ____self_tutorialProgress_33[____doubledMoves_34] = ____self_tutorialProgress_33[____doubledMoves_34] + 1
        end
        local ____self_tutorialProgress_35, ____splitEvents_36 = self.tutorialProgress, "splitEvents"
        ____self_tutorialProgress_35[____splitEvents_36] = ____self_tutorialProgress_35[____splitEvents_36] + #result.splitEvents
        local ____self_tutorialProgress_37, ____dividerEvents_38 = self.tutorialProgress, "dividerEvents"
        ____self_tutorialProgress_37[____dividerEvents_38] = ____self_tutorialProgress_37[____dividerEvents_38] + #result.dividerEvents
        local ____self_tutorialProgress_39, ____multiplierEvents_40 = self.tutorialProgress, "multiplierEvents"
        ____self_tutorialProgress_39[____multiplierEvents_40] = ____self_tutorialProgress_39[____multiplierEvents_40] + #result.multiplierEvents
        local ____self_tutorialProgress_41, ____rootEvents_42 = self.tutorialProgress, "rootEvents"
        ____self_tutorialProgress_41[____rootEvents_42] = ____self_tutorialProgress_41[____rootEvents_42] + #result.rootEvents
        local ____self_tutorialProgress_43, ____cookieTriggers_44 = self.tutorialProgress, "cookieTriggers"
        ____self_tutorialProgress_43[____cookieTriggers_44] = ____self_tutorialProgress_43[____cookieTriggers_44] + #__TS__ArrayFilter(
            result.cookieEvents,
            function(____, event) return event.triggered end
        )
        local interval = self.generationRules.operatorInterval or self.preset.operatorSpawnInterval
        if self.generationRules.kind == "OPERATORS" and nextMoveCount % interval == 0 then
            local sequence = self.generationRules.operatorSequence
            local sequenceIndex = math.floor(nextMoveCount / interval) - 1
            local scheduledKind = sequence and sequence[sequenceIndex + 1]
            local shouldSpawn = sequence == nil or scheduledKind ~= nil and __TS__ArraySome(
                result.state.cells,
                function(____, cell) return cell.kind == "NUMBER" end
            )
            if shouldSpawn then
                local operator = ____exports.spawnOperator(
                    nil,
                    result.state,
                    self.preset,
                    scheduledKind == nil and (self.generationRules.operatorPool or self.preset.operatorPool) or ({scheduledKind}),
                    self.random
                )
                if operator then
                    local ____result_spawnEvents_47 = result.spawnEvents
                    ____result_spawnEvents_47[#____result_spawnEvents_47 + 1] = operator
                end
            end
        elseif self.generationRules.kind == "ENDLESS" then
            local tile = ____exports.spawnEndlessTile(
                nil,
                result.state,
                self.preset,
                nextMoveCount,
                self.generationRules.operatorPool or self.preset.operatorPool,
                self.generationRules.endlessNumberChance or self.preset.endlessNumberChance,
                self.random
            )
            if tile then
                local ____result_spawnEvents_48 = result.spawnEvents
                ____result_spawnEvents_48[#____result_spawnEvents_48 + 1] = tile
            end
        end
        self.state = result.state
        self.moveCount = self.moveCount + 1
        self.score = self.score + result.scoreDelta
        if __TS__ArraySome(
            result.cookieEvents,
            function(____, event) return event.triggered end
        ) then
            self.scoreMultiplierMovesRemaining = 3
        end
        if self.mode == "tutorial" and self.tutorialGoal then
            if self:meetsTutorialGoal() then
                self.runStatus = "victory"
            else
                self.runStatus = ____exports.hasAnyLegalMove(nil, self.state) and "playing" or "defeat"
            end
        else
            local evaluated = self.victoryCondition:evaluate(self.state)
            self.runStatus = evaluated == "playing" and "playing" or evaluated
        end
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
    self.scoreMultiplierMovesRemaining = snapshot.scoreMultiplierMovesRemaining or 0
    self.tutorialProgress = snapshot.tutorialProgress or ({
        splitEvents = 0,
        dividerEvents = 0,
        multiplierEvents = 0,
        rootEvents = 0,
        cookieTriggers = 0,
        doubledMoves = 0
    })
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
function GameSession.prototype.meetsTutorialGoal(self)
    local goal = self.tutorialGoal
    if not goal then
        return false
    end
    return (goal.clearNumbers == nil or __TS__ArrayEvery(
        self.state.cells,
        function(____, cell) return cell.kind ~= "NUMBER" end
    )) and (goal.targetMoves == nil or self.moveCount >= goal.targetMoves) and (goal.splitEvents == nil or self.tutorialProgress.splitEvents >= goal.splitEvents) and (goal.dividerEvents == nil or self.tutorialProgress.dividerEvents >= goal.dividerEvents) and (goal.multiplierEvents == nil or self.tutorialProgress.multiplierEvents >= goal.multiplierEvents) and (goal.rootEvents == nil or self.tutorialProgress.rootEvents >= goal.rootEvents) and (goal.cookieTriggers == nil or self.tutorialProgress.cookieTriggers >= goal.cookieTriggers) and (goal.doubledMoves == nil or self.tutorialProgress.doubledMoves >= goal.doubledMoves)
end
return ____exports
