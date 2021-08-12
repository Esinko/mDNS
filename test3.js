const dns = require("dns")

dns.setServers(["224.0.0.251:5353"])

dns.resolve("38aac546-f8af-4649-8e63-d1806df2a488.local", "A", (err, address) => {
    console.log(address)
})