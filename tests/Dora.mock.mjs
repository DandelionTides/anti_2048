export const json = {
    encode(value) {
        try {
            return [JSON.stringify(value), undefined];
        }
        catch (error) {
            return [undefined, String(error)];
        }
    },
    decode(value) {
        try {
            return [JSON.parse(value), undefined];
        }
        catch (error) {
            return [undefined, String(error)];
        }
    },
};
export const App = {
    get rand() { return 2147483647; },
};
