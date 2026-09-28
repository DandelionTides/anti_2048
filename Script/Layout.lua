local ____exports = {}
--- Fixed portrait canvas used by every screen and hit target.
____exports.DESIGN_WIDTH = 720
____exports.DESIGN_HEIGHT = 1280
local function positive(self, value, fallback)
    return value > 0 and value or fallback
end
--- Maps Dora's logical safe area to Director.ui view coordinates, then fits one
-- fixed 720 x 1280 coordinate system inside it. No game-camera transform is
-- involved: drawing and touch nodes share the same UI-node transform.
function ____exports.fitPortraitCanvas(self, viewport)
    local viewWidth = positive(nil, viewport.viewWidth, ____exports.DESIGN_WIDTH)
    local viewHeight = positive(nil, viewport.viewHeight, ____exports.DESIGN_HEIGHT)
    local visualWidth = positive(nil, viewport.visualWidth, viewWidth)
    local visualHeight = positive(nil, viewport.visualHeight, viewHeight)
    local pixelX = viewWidth / visualWidth
    local pixelY = viewHeight / visualHeight
    local safeWidth = viewport.safeWidth > 0 and viewport.safeWidth <= visualWidth and viewport.safeWidth or visualWidth
    local safeHeight = viewport.safeHeight > 0 and viewport.safeHeight <= visualHeight and viewport.safeHeight or visualHeight
    local safeX = viewport.safeWidth > 0 and viewport.safeX or 0
    local safeY = viewport.safeHeight > 0 and viewport.safeY or 0
    local safeViewWidth = safeWidth * pixelX
    local safeViewHeight = safeHeight * pixelY
    local scale = math.min(safeViewWidth / ____exports.DESIGN_WIDTH, safeViewHeight / ____exports.DESIGN_HEIGHT)
    local centerOffsetX = (safeX + safeWidth / 2 - visualWidth / 2) * pixelX
    local centerOffsetY = (safeY + safeHeight / 2 - visualHeight / 2) * pixelY
    local backgroundScale = math.max(viewWidth / (____exports.DESIGN_WIDTH * scale), viewHeight / (____exports.DESIGN_HEIGHT * scale))
    return {
        scale = scale,
        rootX = centerOffsetX,
        rootY = centerOffsetY,
        backgroundScale = backgroundScale,
        safeViewWidth = safeViewWidth,
        safeViewHeight = safeViewHeight
    }
end
--- Converts a fixed-canvas coordinate to the centered Director.ui view space.
function ____exports.designToView(self, point, layout)
    return {x = layout.rootX + point.x * layout.scale, y = layout.rootY + point.y * layout.scale}
end
--- Converts a Director.ui view coordinate back to the fixed portrait canvas.
function ____exports.viewToDesign(self, point, layout)
    return {x = (point.x - layout.rootX) / layout.scale, y = (point.y - layout.rootY) / layout.scale}
end
return ____exports
