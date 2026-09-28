export async function resolve(specifier, context, nextResolve) {
  if (specifier === "Dora") {
    return nextResolve(new URL("./Dora.mock.mjs", import.meta.url).href, context);
  }
  if (specifier.startsWith("Script/")) {
    return nextResolve(new URL(`../${specifier}.ts`, import.meta.url).href, context);
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-z0-9]+$/i.test(specifier)) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
