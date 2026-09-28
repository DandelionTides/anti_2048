import { createEmptyBoard, getCell } from "../Script/Core.ts";
function validateDivisor(value) {
    if (!Number.isInteger(value) || value < 2 || (value & (value - 1)) !== 0) {
        throw new Error("divider must be a power of two greater than 1");
    }
}
export function boardFromRows(rows) {
    const size = rows.length;
    if (size < 2 || rows.some(row => row.length !== size))
        throw new Error("rows must form a square board");
    const state = createEmptyBoard(size);
    for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
            const value = rows[row][col];
            if (value === null || value === 0)
                continue;
            const index = row * size + col;
            if (typeof value === "number") {
                state.cells[index] = { kind: "NUMBER", id: state.nextTileId++, value, createdBySplitThisMove: false };
            }
            else {
                const divisor = Number(value.slice(1));
                validateDivisor(divisor);
                state.cells[index] = { kind: "DIVIDER", id: state.nextTileId++, divisor };
            }
        }
    }
    return state;
}
export function boardToRows(state) {
    const rows = [];
    for (let row = 0; row < state.size; row += 1) {
        const values = [];
        for (let col = 0; col < state.size; col += 1) {
            const cell = getCell(state, { row, col });
            values.push(cell.kind === "EMPTY" ? null : cell.kind === "NUMBER" ? cell.value : `÷${cell.divisor}`);
        }
        rows.push(values);
    }
    return rows;
}
