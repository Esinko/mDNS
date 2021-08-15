(async () => {
    // Import library
    const resolve = require("./index.js")

    // Example usage
    const ip = await resolve("<domain>.local")
    console.log(ip)
})()