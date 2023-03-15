
export const isServer = "Deno" in globalThis
export const isClient = !isServer
