local phase = 0

function love.load()
  love.graphics.setBackgroundColor(0.96, 0.975, 0.995, 1)
end

function love.update(dt)
  phase = phase + dt * 0.35
end

function love.draw()
  local width, height = love.graphics.getDimensions()
  love.graphics.clear(0.96, 0.975, 0.995, 1)
  love.graphics.setLineWidth(1)
  for i = -8, 16 do
    local x = (i * 72 + phase * 30) % (width + 144) - 72
    love.graphics.setColor(0.38, 0.55, 0.76, 0.08)
    love.graphics.line(x, 0, x - height * 0.28, height)
  end
  love.graphics.setColor(0.35, 0.75, 0.66, 0.10)
  love.graphics.circle("fill", width * 0.2, height * 0.24, math.min(width, height) * 0.18)
  love.graphics.setColor(0.48, 0.38, 0.82, 0.08)
  love.graphics.circle("fill", width * 0.84, height * 0.70, math.min(width, height) * 0.24)
end
