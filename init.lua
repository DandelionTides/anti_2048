local ____lualib = require("lualib_bundle")
local __TS__New = ____lualib.__TS__New
local __TS__ArrayMap = ____lualib.__TS__ArrayMap
local __TS__ArrayForEach = ____lualib.__TS__ArrayForEach
local __TS__ArrayFind = ____lualib.__TS__ArrayFind
local __TS__ArraySome = ____lualib.__TS__ArraySome
local __TS__ArrayFilter = ____lualib.__TS__ArrayFilter
local __TS__ArrayReduce = ____lualib.__TS__ArrayReduce
local ____exports = {}
local rectangle, makeText, addText, addButton, addPanel, clearScreen, go, renderHeader, renderMainMenu, renderModeSelect, renderDifficultySelect, renderTimerSelect, renderRules, renderSettings, boardMetrics, positionToPoint, tileColor, createTile, addSplitOneGhosts, addMergeGhosts, addDividerGhosts, addDividerMergeGhosts, renderBoard, renderPlaying, renderPause, highestNumber, recordOutcome, renderOutcome, renderScreen, startGame, pauseGame, resumeGame, undoMove, finishMove, attemptMove, BOARD_WIDTH, BOARD_CENTER_Y, CELL_GAP, SWIPE_THRESHOLD, ANIMATION_TIME, FONT, COLORS, saves, audio, root, screenLayer, boardLayer, animationLayer, screens, rulesReturnState, pendingMode, pendingPreset, session, gameTimer, inputLocked, swipeStart, gestureSurface, timerLabel, recordedOutcome
local ____Dora = require("Dora")
local App = ____Dora.App
local ClipNode = ____Dora.ClipNode
local Color = ____Dora.Color
local Content = ____Dora.Content
local Director = ____Dora.Director
local DrawNode = ____Dora.DrawNode
local Ease = ____Dora.Ease
local Label = ____Dora.Label
local LoveNode = ____Dora.LoveNode
local Move = ____Dora.Move
local Node = ____Dora.Node
local Opacity = ____Dora.Opacity
local Scale = ____Dora.Scale
local Spawn = ____Dora.Spawn
local Size = ____Dora.Size
local Vec2 = ____Dora.Vec2
local View = ____Dora.View
local sleep = ____Dora.sleep
local ____Core = require("Script.Core")
local GameSession = ____Core.GameSession
local ____Config = require("Script.Config")
local DIFFICULTY_PRESETS = ____Config.DIFFICULTY_PRESETS
local ENDLESS_PRESET = ____Config.ENDLESS_PRESET
local ____GameTimer = require("Script.GameTimer")
local GameTimer = ____GameTimer.GameTimer
local formatTime = ____GameTimer.formatTime
local ____RuleContent = require("Script.RuleContent")
local RULE_SECTIONS = ____RuleContent.RULE_SECTIONS
local ____SaveData = require("Script.SaveData")
local SaveRepository = ____SaveData.SaveRepository
local ____StateMachine = require("Script.StateMachine")
local ScreenStateMachine = ____StateMachine.ScreenStateMachine
local ____Random = require("Script.Random")
local doraRandom = ____Random.doraRandom
local ____AudioManager = require("Script.AudioManager")
local AudioManager = ____AudioManager.AudioManager
local ____Display = require("Script.Display")
local integerText = ____Display.integerText
local ____Layout = require("Script.Layout")
local DESIGN_HEIGHT = ____Layout.DESIGN_HEIGHT
local DESIGN_WIDTH = ____Layout.DESIGN_WIDTH
local fitPortraitCanvas = ____Layout.fitPortraitCanvas
function rectangle(self, width, height, color, borderColor)
    local draw = DrawNode()
    local hw = width / 2
    local hh = height / 2
    draw:drawPolygon(
        {
            Vec2(-hw, -hh),
            Vec2(hw, -hh),
            Vec2(hw, hh),
            Vec2(-hw, hh)
        },
        color,
        borderColor and 3 or 0,
        borderColor or color
    )
    return draw
end
function makeText(self, text, size, color, width, alignment)
    if color == nil then
        color = COLORS.ink
    end
    if alignment == nil then
        alignment = "Center"
    end
    local label = Label(FONT, size, true)
    if not label then
        return nil
    end
    label.text = text
    label.color = color
    label.alignment = alignment
    if width ~= nil then
        label.textWidth = width
    end
    label.anchor = alignment == "Left" and Vec2(0, 0.5) or Vec2(0.5, 0.5)
    return label
end
function addText(self, parent, text, size, x, y, color, width, alignment)
    if color == nil then
        color = COLORS.ink
    end
    if alignment == nil then
        alignment = "Center"
    end
    local label = makeText(
        nil,
        text,
        size,
        color,
        width,
        alignment
    )
    if not label then
        return nil
    end
    label.position = Vec2(x, y)
    label:addTo(parent)
    return label
end
function addButton(self, parent, text, x, y, onTap, options)
    if options == nil then
        options = {}
    end
    local width = options.width or 470
    local height = options.height or 86
    local button = Node()
    button.position = Vec2(x, y)
    button.size = Size(width, height)
    button.anchor = Vec2(0.5, 0.5)
    button.touchEnabled = true
    button.swallowTouches = true
    local contentX = width / 2
    local contentY = height / 2
    local face = rectangle(nil, width, height, options.color or COLORS.primary)
    face.position = Vec2(contentX, contentY)
    face:addTo(button)
    addText(
        nil,
        button,
        text,
        options.fontSize or 30,
        contentX,
        contentY,
        COLORS.white
    )
    button:onTapBegan(function()
        button.scaleX = 0.97
        button.scaleY = 0.97
    end)
    button:onTapEnded(function()
        button.scaleX = 1
        button.scaleY = 1
    end)
    button:onTapped(function()
        if inputLocked then
            return
        end
        audio:playUi()
        onTap(nil)
    end)
    button:addTo(parent)
    return button
end
function addPanel(self, parent, width, height, x, y)
    local panel = Node()
    panel.position = Vec2(x, y)
    rectangle(
        nil,
        width,
        height,
        COLORS.panel,
        Color(4292469229)
    ):addTo(panel)
    panel:addTo(parent)
    return panel
end
function clearScreen(self)
    screenLayer:removeAllChildren()
    boardLayer:removeAllChildren()
    animationLayer:removeAllChildren()
    gestureSurface = nil
    timerLabel = nil
end
function go(self, state)
    screens:go(state)
    renderScreen(nil)
end
function renderHeader(self, title, back)
    addText(
        nil,
        screenLayer,
        title,
        46,
        0,
        525
    )
    if back then
        addButton(
            nil,
            screenLayer,
            "‹ 返回",
            -255,
            530,
            back,
            {width = 150, height = 64, color = COLORS.secondary, fontSize = 24}
        )
    end
end
function renderMainMenu(self)
    addText(
        nil,
        screenLayer,
        "反 2048",
        72,
        0,
        330
    )
    addText(
        nil,
        screenLayer,
        "把数字拆回空白",
        28,
        0,
        252,
        COLORS.muted
    )
    addButton(
        nil,
        screenLayer,
        "开始游戏",
        0,
        65,
        function() return go(nil, "MODE_SELECT") end
    )
    addButton(
        nil,
        screenLayer,
        "规则",
        0,
        -55,
        function()
            rulesReturnState = "MAIN_MENU"
            go(nil, "RULES")
        end,
        {color = COLORS.secondary}
    )
    addButton(
        nil,
        screenLayer,
        "设置 ⚙",
        255,
        525,
        function() return go(nil, "SETTINGS") end,
        {width = 170, height = 64, color = COLORS.secondary, fontSize = 23}
    )
    addText(
        nil,
        screenLayer,
        "每一步，只生成规则允许的方块",
        21,
        0,
        -430,
        COLORS.muted
    )
end
function renderModeSelect(self)
    renderHeader(
        nil,
        "选择模式",
        function() return go(nil, "MAIN_MENU") end
    )
    addButton(
        nil,
        screenLayer,
        "难度模式",
        0,
        145,
        function() return go(nil, "DIFFICULTY_SELECT") end
    )
    addText(
        nil,
        screenLayer,
        "拆完所有 NUMBER 即通关",
        22,
        0,
        82,
        COLORS.muted
    )
    addButton(
        nil,
        screenLayer,
        "无尽模式",
        0,
        -85,
        function()
            pendingMode = "endless"
            pendingPreset = ENDLESS_PRESET
            go(nil, "TIMER_SELECT")
        end,
        {color = COLORS.divider}
    )
    addText(
        nil,
        screenLayer,
        "每步补充数字 · 数值随步数提升 · 每 2 步生成 Divider",
        20,
        0,
        -148,
        COLORS.muted,
        650
    )
end
function renderDifficultySelect(self)
    renderHeader(
        nil,
        "选择难度",
        function() return go(nil, "MODE_SELECT") end
    )
    __TS__ArrayForEach(
        DIFFICULTY_PRESETS,
        function(____, preset, index)
            local y = 240 - index * 190
            local initialTotal = __TS__ArrayReduce(
                preset.initialValues,
                function(____, sum, value) return sum + value end,
                0
            )
            local difficultySummary = ((((("初始 " .. integerText(nil, preset.initialTileCount)) .. " 块 · 总和 ") .. integerText(nil, initialTotal)) .. " · 数字 ") .. integerText(
                nil,
                math.min(table.unpack(preset.initialValues))
            )) .. "–" .. integerText(
                nil,
                math.max(table.unpack(preset.initialValues))
            )
            addButton(
                nil,
                screenLayer,
                preset.name,
                0,
                y,
                function()
                    pendingMode = "difficulty"
                    pendingPreset = preset
                    go(nil, "TIMER_SELECT")
                end,
                {color = index == 0 and Color(4283873690) or (index == 1 and COLORS.primary or Color(4293036641))}
            )
            addText(
                nil,
                screenLayer,
                difficultySummary,
                18,
                0,
                y - 62,
                COLORS.muted,
                650
            )
        end
    )
end
function renderTimerSelect(self)
    renderHeader(
        nil,
        "是否计时",
        function() return go(nil, pendingMode == "endless" and "MODE_SELECT" or "DIFFICULTY_SELECT") end
    )
    addText(
        nil,
        screenLayer,
        (pendingMode == "endless" and "无尽模式" or pendingPreset.name .. "难度") .. " · 棋盘规则不受计时影响",
        23,
        0,
        350,
        COLORS.muted
    )
    addButton(
        nil,
        screenLayer,
        "计时",
        0,
        100,
        function() return startGame(nil, true) end
    )
    addButton(
        nil,
        screenLayer,
        "不计时",
        0,
        -30,
        function() return startGame(nil, false) end,
        {color = COLORS.secondary}
    )
    addText(
        nil,
        screenLayer,
        "暂停和规则页面不会累计时间",
        21,
        0,
        -165,
        COLORS.muted
    )
end
function renderRules(self)
    renderHeader(
        nil,
        "规则",
        function() return go(nil, rulesReturnState) end
    )
    local viewportHeight = 900
    local stencil = rectangle(nil, 660, viewportHeight, COLORS.white)
    local viewport = ClipNode(stencil)
    viewport.position = Vec2(0, -35)
    local content = Node()
    content:addTo(viewport)
    local y = 405
    __TS__ArrayForEach(
        RULE_SECTIONS,
        function(____, section)
            addText(
                nil,
                content,
                section.title,
                24,
                -310,
                y,
                COLORS.primary,
                620,
                "Left"
            )
            local body = addText(
                nil,
                content,
                section.body,
                19,
                -310,
                y - 30,
                COLORS.ink,
                620,
                "Left"
            )
            if body then
                body.anchor = Vec2(0, 1)
            end
            y = y - (48 + section.lines * 24)
        end
    )
    local maxScroll = math.max(0, -410 - y)
    local lastY = 0
    local dragSurface = Node()
    dragSurface.position = Vec2(0, -35)
    dragSurface.size = Size(660, viewportHeight)
    dragSurface.anchor = Vec2(0.5, 0.5)
    dragSurface.touchEnabled = true
    dragSurface.swallowTouches = true
    dragSurface:onTapBegan(function(touch)
        if touch.first then
            lastY = touch.location.y
        end
    end)
    dragSurface:onTapMoved(function(touch)
        if not touch.first or maxScroll <= 0 then
            return
        end
        local nextY = math.max(
            0,
            math.min(maxScroll, content.y + touch.location.y - lastY)
        )
        content.y = nextY
        lastY = touch.location.y
    end)
    viewport:addTo(screenLayer)
    dragSurface:addTo(screenLayer, 1)
    if maxScroll > 0 then
        addText(
            nil,
            screenLayer,
            "上下拖动查看完整规则",
            18,
            0,
            -535,
            COLORS.muted
        )
    end
end
function renderSettings(self)
    renderHeader(
        nil,
        "设置",
        function() return go(nil, "MAIN_MENU") end
    )
    local panel = addPanel(
        nil,
        screenLayer,
        610,
        260,
        0,
        130
    )
    addText(
        nil,
        panel,
        "总音量",
        28,
        -235,
        75,
        COLORS.ink,
        470,
        "Left"
    )
    local valueText = addText(
        nil,
        panel,
        tostring(math.floor(saves.data.volume * 100 + 0.5)) .. "%",
        24,
        225,
        75,
        COLORS.muted
    )
    local slider = Node()
    slider.position = Vec2(0, -20)
    slider.size = Size(520, 100)
    slider.anchor = Vec2(0.5, 0.5)
    slider.touchEnabled = true
    slider.swallowTouches = true
    local sliderWidth = 520
    local sliderHeight = 100
    local trackWidth = 480
    local trackLeft = (sliderWidth - trackWidth) / 2
    local trackY = sliderHeight / 2
    local track = rectangle(
        nil,
        trackWidth,
        14,
        Color(4291417573)
    )
    track.position = Vec2(sliderWidth / 2, trackY)
    track:addTo(slider)
    local fill = rectangle(nil, 480, 14, COLORS.primary)
    fill.position = Vec2(trackLeft, trackY)
    fill:addTo(slider)
    local knob = rectangle(
        nil,
        36,
        54,
        COLORS.primary,
        COLORS.white
    )
    knob.position = Vec2(trackLeft, trackY)
    knob:addTo(slider)
    local function updateSlider(____, localX, persist)
        local volume = math.max(
            0,
            math.min(1, (localX - trackLeft) / trackWidth)
        )
        knob.x = trackLeft + volume * trackWidth
        knob.y = trackY
        fill.scaleX = volume
        fill.x = trackLeft + volume * trackWidth / 2
        fill.y = trackY
        audio:setVolume(volume)
        if valueText then
            valueText.text = tostring(math.floor(volume * 100 + 0.5)) .. "%"
        end
        if persist then
            saves:setVolume(volume)
        end
    end
    updateSlider(nil, trackLeft + saves.data.volume * trackWidth, false)
    slider:onTapBegan(function(touch) return updateSlider(nil, touch.location.x, false) end)
    slider:onTapMoved(function(touch) return updateSlider(nil, touch.location.x, false) end)
    slider:onTapEnded(function(touch)
        updateSlider(nil, touch.location.x, true)
        audio:playUi()
    end)
    slider:addTo(panel)
    addText(
        nil,
        screenLayer,
        "设置会保存到本机，下次启动自动恢复。",
        21,
        0,
        -90,
        COLORS.muted
    )
end
function boardMetrics(self, size)
    return {cellSize = (BOARD_WIDTH - CELL_GAP * (size + 1)) / size}
end
function positionToPoint(self, position, size)
    local ____boardMetrics_result_0 = boardMetrics(nil, size)
    local cellSize = ____boardMetrics_result_0.cellSize
    local left = -BOARD_WIDTH / 2 + CELL_GAP + cellSize / 2
    local top = BOARD_CENTER_Y + BOARD_WIDTH / 2 - CELL_GAP - cellSize / 2
    return Vec2(left + position.col * (cellSize + CELL_GAP), top - position.row * (cellSize + CELL_GAP))
end
function tileColor(self, cell)
    if cell.kind == "DIVIDER" then
        return COLORS.divider
    end
    if cell.kind == "EMPTY" then
        return COLORS.slot
    end
    local colors = {
        4293451765,
        4292340991,
        4292408293,
        4294963141,
        4294958283,
        4294954968,
        4291684328,
        4292337151
    }
    local level = math.min(
        #colors - 1,
        math.floor(math.log(cell.value) / math.log(2))
    )
    return Color(colors[math.max(0, level) + 1])
end
function createTile(self, cell, position, result)
    if cell.kind == "EMPTY" or not session then
        return nil
    end
    local ____boardMetrics_result_1 = boardMetrics(nil, session.state.size)
    local cellSize = ____boardMetrics_result_1.cellSize
    local tile = Node()
    local finalPoint = positionToPoint(nil, position, session.state.size)
    tile.position = finalPoint
    rectangle(
        nil,
        cellSize,
        cellSize,
        tileColor(nil, cell),
        cell.kind == "DIVIDER" and COLORS.dividerInner or nil
    ):addTo(tile)
    if cell.kind == "DIVIDER" then
        rectangle(
            nil,
            cellSize - 20,
            cellSize - 20,
            COLORS.dividerInner,
            COLORS.white
        ):addTo(tile)
    end
    addText(
        nil,
        tile,
        cell.kind == "NUMBER" and integerText(nil, cell.value) or "÷" .. integerText(nil, cell.divisor),
        cell.kind == "DIVIDER" and 38 or 46,
        0,
        0,
        cell.kind == "DIVIDER" and COLORS.white or COLORS.ink
    )
    if result then
        local movement = __TS__ArrayFind(
            result.moveEvents,
            function(____, event) return event.tileId == cell.id end
        )
        local createdBySplit = __TS__ArrayFind(
            result.splitEvents,
            function(____, event) return event.createdTileId == cell.id end
        )
        local sourceSplit = __TS__ArrayFind(
            result.splitEvents,
            function(____, event) return event.sourceTileId == cell.id and event.resultValue > 0 end
        )
        local merge = __TS__ArrayFind(
            result.mergeEvents,
            function(____, event) return event.resultTileId == cell.id end
        )
        local dividerMerge = __TS__ArrayFind(
            result.dividerMergeEvents,
            function(____, event) return event.resultTileId == cell.id end
        )
        local spawned = __TS__ArraySome(
            result.spawnEvents,
            function(____, event) return event.tileId == cell.id end
        )
        local start = movement and positionToPoint(nil, movement.from, session.state.size) or (createdBySplit and positionToPoint(nil, createdBySplit.source, session.state.size) or finalPoint)
        if movement or createdBySplit then
            tile.position = start
            if merge or dividerMerge or createdBySplit or sourceSplit then
                tile.scaleX = 0.72
                tile.scaleY = 0.72
                tile:perform(Spawn(
                    Move(ANIMATION_TIME, start, finalPoint, Ease.OutQuad),
                    Scale(ANIMATION_TIME, 0.72, 1, Ease.OutBack)
                ))
            else
                tile:perform(Move(ANIMATION_TIME, start, finalPoint, Ease.OutQuad))
            end
        elseif merge or dividerMerge or spawned then
            tile.scaleX = 0.55
            tile.scaleY = 0.55
            tile.opacity = spawned and 0 or 1
            tile:perform(Spawn(
                Scale(ANIMATION_TIME, 0.55, 1, Ease.OutBack),
                Opacity(ANIMATION_TIME, tile.opacity, 1)
            ))
        end
    end
    return tile
end
function addSplitOneGhosts(self, result)
    if not session then
        return
    end
    local ____boardMetrics_result_2 = boardMetrics(nil, session.state.size)
    local cellSize = ____boardMetrics_result_2.cellSize
    __TS__ArrayForEach(
        __TS__ArrayFilter(
            result.splitEvents,
            function(____, event) return event.originalValue == 1 end
        ),
        function(____, event)
            local ghost = Node()
            ghost.position = positionToPoint(nil, event.source, session.state.size)
            local one = {kind = "NUMBER", id = -1, value = 1, createdBySplitThisMove = false}
            rectangle(
                nil,
                cellSize,
                cellSize,
                tileColor(nil, one)
            ):addTo(ghost)
            addText(
                nil,
                ghost,
                "1",
                46,
                0,
                0
            )
            ghost:perform(Spawn(
                Scale(ANIMATION_TIME, 1, 0.25, Ease.OutQuad),
                Opacity(ANIMATION_TIME, 1, 0)
            ))
            ghost:addTo(animationLayer)
        end
    )
end
function addMergeGhosts(self, result)
    if not session then
        return
    end
    local ____boardMetrics_result_3 = boardMetrics(nil, session.state.size)
    local cellSize = ____boardMetrics_result_3.cellSize
    __TS__ArrayForEach(
        result.mergeEvents,
        function(____, event)
            local finalMove = __TS__ArrayFind(
                result.moveEvents,
                function(____, move) return move.tileId == event.resultTileId end
            )
            local destination = positionToPoint(nil, finalMove and finalMove.to or event.destination, session.state.size)
            __TS__ArrayForEach(
                event.sources,
                function(____, source)
                    local ghost = Node()
                    local start = positionToPoint(nil, source, session.state.size)
                    ghost.position = start
                    local value = event.resultValue / 2
                    local number = {kind = "NUMBER", id = -1, value = value, createdBySplitThisMove = false}
                    rectangle(
                        nil,
                        cellSize,
                        cellSize,
                        tileColor(nil, number)
                    ):addTo(ghost)
                    addText(
                        nil,
                        ghost,
                        integerText(nil, value),
                        46,
                        0,
                        0
                    )
                    ghost:perform(Spawn(
                        Move(ANIMATION_TIME, start, destination, Ease.OutQuad),
                        Opacity(ANIMATION_TIME, 0.9, 0)
                    ))
                    ghost:addTo(animationLayer)
                end
            )
        end
    )
end
function addDividerGhosts(self, result)
    if not session then
        return
    end
    local ____boardMetrics_result_6 = boardMetrics(nil, session.state.size)
    local cellSize = ____boardMetrics_result_6.cellSize
    __TS__ArrayForEach(
        result.dividerEvents,
        function(____, event)
            local ghost = Node()
            ghost.position = positionToPoint(nil, event.position, session.state.size)
            rectangle(
                nil,
                cellSize,
                cellSize,
                COLORS.divider,
                COLORS.dividerInner
            ):addTo(ghost)
            rectangle(
                nil,
                cellSize - 20,
                cellSize - 20,
                COLORS.dividerInner,
                COLORS.white
            ):addTo(ghost)
            addText(
                nil,
                ghost,
                "÷" .. integerText(nil, event.divisor),
                38,
                0,
                0,
                COLORS.white
            )
            addText(
                nil,
                ghost,
                (integerText(nil, event.originalValue) .. "→") .. integerText(nil, event.resultValue),
                18,
                0,
                -cellSize * 0.3,
                COLORS.white
            )
            ghost:perform(Spawn(
                Scale(ANIMATION_TIME, 1, 0.3, Ease.OutQuad),
                Opacity(ANIMATION_TIME, 1, 0)
            ))
            ghost:addTo(animationLayer)
        end
    )
end
function addDividerMergeGhosts(self, result)
    if not session then
        return
    end
    local ____boardMetrics_result_7 = boardMetrics(nil, session.state.size)
    local cellSize = ____boardMetrics_result_7.cellSize
    __TS__ArrayForEach(
        result.dividerMergeEvents,
        function(____, event)
            local finalMove = __TS__ArrayFind(
                result.moveEvents,
                function(____, move) return move.tileId == event.resultTileId end
            )
            local destination = positionToPoint(nil, finalMove and finalMove.to or event.destination, session.state.size)
            __TS__ArrayForEach(
                event.sources,
                function(____, source)
                    local ghost = Node()
                    local start = positionToPoint(nil, source, session.state.size)
                    ghost.position = start
                    rectangle(
                        nil,
                        cellSize,
                        cellSize,
                        COLORS.divider,
                        COLORS.dividerInner
                    ):addTo(ghost)
                    rectangle(
                        nil,
                        cellSize - 20,
                        cellSize - 20,
                        COLORS.dividerInner,
                        COLORS.white
                    ):addTo(ghost)
                    addText(
                        nil,
                        ghost,
                        "÷" .. integerText(nil, event.resultDivisor / 2),
                        38,
                        0,
                        0,
                        COLORS.white
                    )
                    ghost:perform(Spawn(
                        Move(ANIMATION_TIME, start, destination, Ease.OutQuad),
                        Opacity(ANIMATION_TIME, 0.9, 0)
                    ))
                    ghost:addTo(animationLayer)
                end
            )
        end
    )
end
function renderBoard(self, result)
    if not session then
        return
    end
    boardLayer:removeAllChildren()
    animationLayer:removeAllChildren()
    local boardBack = rectangle(nil, BOARD_WIDTH, BOARD_WIDTH, COLORS.board)
    boardBack.position = Vec2(0, BOARD_CENTER_Y)
    boardBack:addTo(boardLayer)
    local ____boardMetrics_result_10 = boardMetrics(nil, session.state.size)
    local cellSize = ____boardMetrics_result_10.cellSize
    do
        local row = 0
        while row < session.state.size do
            do
                local col = 0
                while col < session.state.size do
                    local position = {row = row, col = col}
                    local slot = rectangle(nil, cellSize, cellSize, COLORS.slot)
                    slot.position = positionToPoint(nil, position, session.state.size)
                    slot:addTo(boardLayer)
                    local tile = createTile(nil, session.state.cells[row * session.state.size + col + 1], position, result)
                    if tile then
                        tile:addTo(boardLayer)
                    end
                    col = col + 1
                end
            end
            row = row + 1
        end
    end
    if result then
        addSplitOneGhosts(nil, result)
        addDividerGhosts(nil, result)
        addMergeGhosts(nil, result)
        addDividerMergeGhosts(nil, result)
    end
    local surface = Node()
    surface.position = Vec2(0, BOARD_CENTER_Y)
    surface.size = Size(BOARD_WIDTH, BOARD_WIDTH)
    surface.anchor = Vec2(0.5, 0.5)
    surface.touchEnabled = not inputLocked
    surface.swallowTouches = true
    surface:onTapFilter(function(touch)
        if not touch.first or inputLocked then
            touch.enabled = false
        end
    end)
    surface:onTapBegan(function(touch)
        swipeStart = touch.location
    end)
    surface:onTapEnded(function(touch)
        if not swipeStart or inputLocked or screens.current ~= "PLAYING" then
            return
        end
        local dx = touch.location.x - swipeStart.x
        local dy = touch.location.y - swipeStart.y
        swipeStart = nil
        if math.max(
            math.abs(dx),
            math.abs(dy)
        ) < SWIPE_THRESHOLD then
            return
        end
        if math.abs(dx) > math.abs(dy) then
            attemptMove(nil, dx > 0 and "right" or "left")
        else
            attemptMove(nil, dy > 0 and "up" or "down")
        end
    end)
    surface:addTo(boardLayer, 100)
    gestureSurface = surface
end
function renderPlaying(self, result)
    if not session then
        return
    end
    local modeName = session.mode == "endless" and "无尽模式" or session.preset.name .. "难度"
    addText(
        nil,
        screenLayer,
        modeName,
        25,
        -320,
        540,
        COLORS.ink,
        270,
        "Left"
    )
    addButton(
        nil,
        screenLayer,
        "撤销",
        150,
        540,
        undoMove,
        {width = 130, height = 60, color = COLORS.secondary, fontSize = 22}
    )
    addButton(
        nil,
        screenLayer,
        "暂停",
        285,
        540,
        pauseGame,
        {width = 120, height = 60, color = COLORS.secondary, fontSize = 22}
    )
    addText(
        nil,
        screenLayer,
        "分数 " .. integerText(nil, session.score),
        24,
        -320,
        475,
        COLORS.primary,
        250,
        "Left"
    )
    addText(
        nil,
        screenLayer,
        "移动 " .. integerText(nil, session.moveCount),
        24,
        -35,
        475,
        COLORS.ink,
        200,
        "Left"
    )
    if session.timed and gameTimer then
        timerLabel = addText(
            nil,
            screenLayer,
            "本局用时 " .. formatTime(nil, gameTimer.milliseconds),
            20,
            -320,
            425,
            COLORS.muted,
            640,
            "Left"
        )
    end
    renderBoard(nil, result)
    addText(
        nil,
        screenLayer,
        "在棋盘上滑动 · 键盘方向键 / WASD",
        20,
        0,
        -455,
        COLORS.muted
    )
end
function renderPause(self)
    if not session then
        return
    end
    addText(
        nil,
        screenLayer,
        "已暂停",
        52,
        0,
        350
    )
    addText(
        nil,
        screenLayer,
        ((session.mode == "endless" and "无尽模式" or session.preset.name) .. " · 分数 ") .. integerText(nil, session.score),
        24,
        0,
        285,
        COLORS.muted
    )
    addButton(
        nil,
        screenLayer,
        "继续",
        0,
        100,
        resumeGame
    )
    addButton(
        nil,
        screenLayer,
        "规则",
        0,
        -20,
        function()
            rulesReturnState = "PAUSED"
            go(nil, "RULES")
        end,
        {color = COLORS.secondary}
    )
    addButton(
        nil,
        screenLayer,
        "返回主菜单",
        0,
        -140,
        function() return go(nil, "MAIN_MENU") end,
        {color = COLORS.danger}
    )
end
function highestNumber(self)
    if not session then
        return 0
    end
    return __TS__ArrayReduce(
        session.state.cells,
        function(____, highest, cell) return cell.kind == "NUMBER" and math.max(highest, cell.value) or highest end,
        0
    )
end
function recordOutcome(self)
    if not session or recordedOutcome then
        return
    end
    recordedOutcome = true
    local time = session.timed and gameTimer and gameTimer.milliseconds or nil
    if session.mode == "endless" then
        saves:recordEndless(
            session.score,
            highestNumber(nil)
        )
    elseif session.runStatus == "victory" then
        saves:recordDifficulty(session.preset, session.score, time)
    end
end
function renderOutcome(self, victory)
    if not session then
        return
    end
    recordOutcome(nil)
    addText(
        nil,
        screenLayer,
        victory and "通关！" or (session.mode == "endless" and "无尽结束" or "无法继续"),
        58,
        0,
        390,
        victory and Color(4282624389) or COLORS.danger
    )
    local panel = addPanel(
        nil,
        screenLayer,
        560,
        320,
        0,
        125
    )
    addText(
        nil,
        panel,
        "最终分数  " .. integerText(nil, session.score),
        30,
        0,
        95,
        COLORS.primary
    )
    addText(
        nil,
        panel,
        "移动次数  " .. integerText(nil, session.moveCount),
        25,
        0,
        35
    )
    if session.mode == "endless" then
        addText(
            nil,
            panel,
            "最高数字  " .. integerText(
                nil,
                highestNumber(nil)
            ),
            25,
            0,
            -25
        )
    end
    addText(
        nil,
        panel,
        session.timed and gameTimer and "完成时间  " .. formatTime(nil, gameTimer.milliseconds) or "本局未计时",
        23,
        0,
        -85,
        COLORS.muted
    )
    addButton(
        nil,
        screenLayer,
        "再来一局",
        0,
        -160,
        function() return startGame(nil, session.timed) end
    )
    addButton(
        nil,
        screenLayer,
        "返回主菜单",
        0,
        -270,
        function() return go(nil, "MAIN_MENU") end,
        {color = COLORS.secondary}
    )
end
function renderScreen(self, result)
    clearScreen(nil)
    if screens.current == "MAIN_MENU" then
        renderMainMenu(nil)
    elseif screens.current == "MODE_SELECT" then
        renderModeSelect(nil)
    elseif screens.current == "DIFFICULTY_SELECT" then
        renderDifficultySelect(nil)
    elseif screens.current == "TIMER_SELECT" then
        renderTimerSelect(nil)
    elseif screens.current == "RULES" then
        renderRules(nil)
    elseif screens.current == "SETTINGS" then
        renderSettings(nil)
    elseif screens.current == "PLAYING" then
        renderPlaying(nil, result)
    elseif screens.current == "PAUSED" then
        renderPause(nil)
    elseif screens.current == "VICTORY" then
        renderOutcome(nil, true)
    elseif screens.current == "GAME_OVER" then
        renderOutcome(nil, false)
    end
end
function startGame(self, timed)
    session = __TS__New(
        GameSession,
        pendingPreset,
        doraRandom,
        nil,
        nil,
        {mode = pendingMode, timed = timed}
    )
    gameTimer = __TS__New(GameTimer, timed)
    gameTimer:start()
    recordedOutcome = false
    inputLocked = false
    screens:go("PLAYING")
    renderScreen(nil)
end
function pauseGame(self)
    if session and not inputLocked then
        session:pause()
        if gameTimer ~= nil then
            gameTimer:pause()
        end
        go(nil, "PAUSED")
    end
end
function resumeGame(self)
    if session then
        session:resume()
        if gameTimer ~= nil then
            gameTimer:resume()
        end
        go(nil, "PLAYING")
    end
end
function undoMove(self)
    if session and not inputLocked and screens.current == "PLAYING" and session:undo() then
        renderScreen(nil)
    end
end
function finishMove(self)
    if not session then
        return
    end
    inputLocked = false
    root.keyboardEnabled = true
    if session.runStatus == "victory" then
        if gameTimer ~= nil then
            gameTimer:stop()
        end
        audio:playVictory()
        go(nil, "VICTORY")
    elseif session.runStatus == "defeat" then
        if gameTimer ~= nil then
            gameTimer:stop()
        end
        audio:playGameOver()
        go(nil, "GAME_OVER")
    else
        renderScreen(nil)
    end
end
function attemptMove(self, direction)
    if not session or inputLocked or screens.current ~= "PLAYING" or session.runStatus ~= "playing" then
        return
    end
    local result = session:move(direction)
    if not result.changed then
        return
    end
    inputLocked = true
    if gestureSurface then
        gestureSurface.touchEnabled = false
    end
    root.keyboardEnabled = false
    audio:playMove(result)
    renderScreen(nil, result)
    root:once(function()
        sleep(ANIMATION_TIME + 0.04)
        if (session and session.runStatus) == "playing" and #result.spawnEvents > 0 then
            audio:playSpawn()
        end
        finishMove(nil)
    end)
end
BOARD_WIDTH = 640
BOARD_CENTER_Y = -55
CELL_GAP = 12
SWIPE_THRESHOLD = 44
ANIMATION_TIME = 0.18
FONT = "sarasa-mono-sc-regular"
local SAVE_FILE = Content.writablePath .. "/anti-2048-save-v2.json"
COLORS = {
    ink = Color(4280561735),
    muted = Color(4285496465),
    panel = Color(4294309883),
    board = Color(4292863729),
    slot = Color(4293784055),
    primary = Color(4283404264),
    secondary = Color(4287670215),
    danger = Color(4293164166),
    divider = Color(4285945558),
    dividerInner = Color(4290621168),
    white = Color(4294967295)
}
Director.clearColor = Color(4294310398)
local storage = {
    load = function() return Content:exist(SAVE_FILE) and Content:load(SAVE_FILE) or nil end,
    save = function(____, content) return Content:save(SAVE_FILE, content) end
}
saves = __TS__New(SaveRepository, storage)
audio = __TS__New(AudioManager)
audio:setVolume(saves.data.volume)
local background = LoveNode("LovePreview/main.lua")
if background then
    background.size = Size(DESIGN_WIDTH, DESIGN_HEIGHT)
    background.anchor = Vec2(0.5, 0.5)
    background:addTo(Director.ui, -100)
end
root = Node()
root:addTo(Director.ui)
root.keyboardEnabled = true
root.anchor = Vec2.zero
screenLayer = Node()
screenLayer:addTo(root)
boardLayer = Node()
boardLayer:addTo(root)
animationLayer = Node()
animationLayer:addTo(root)
screens = __TS__New(ScreenStateMachine)
rulesReturnState = "MAIN_MENU"
pendingMode = "difficulty"
pendingPreset = DIFFICULTY_PRESETS[2]
inputLocked = false
recordedOutcome = false
root:onKeyDown(function(key)
    if key == "Left" or key == "A" then
        attemptMove(nil, "left")
    elseif key == "Right" or key == "D" then
        attemptMove(nil, "right")
    elseif key == "Up" or key == "W" then
        attemptMove(nil, "up")
    elseif key == "Down" or key == "S" then
        attemptMove(nil, "down")
    end
end)
root:onUpdate(function()
    if screens.current == "PLAYING" and gameTimer then
        gameTimer:update(App.deltaTime)
        if timerLabel then
            timerLabel.text = "本局用时 " .. formatTime(nil, gameTimer.milliseconds)
        end
    end
    return false
end)
local function updateLayout(self)
    local safe = App.safeArea
    local visual = App.visualSize
    local fit = fitPortraitCanvas(nil, {
        viewWidth = View.size.width,
        viewHeight = View.size.height,
        visualWidth = visual.width,
        visualHeight = visual.height,
        safeX = safe.x,
        safeY = safe.y,
        safeWidth = safe.width,
        safeHeight = safe.height
    })
    root.scaleX = fit.scale
    root.scaleY = fit.scale
    root.position = Vec2(fit.rootX, fit.rootY)
    if background then
        background.position = Vec2.zero
        background.scaleX = fit.backgroundScale * fit.scale
        background.scaleY = fit.backgroundScale * fit.scale
    end
end
Director.ui:onAppChange(function(settingName)
    if settingName == "Size" then
        updateLayout(nil)
    end
end)
updateLayout(nil)
renderScreen(nil)
return ____exports
