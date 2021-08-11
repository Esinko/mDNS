// Dependencies
const dns = require("dns")
const udp = require("dgram")

// Utils
const utils = {
    dns: require("./utils/dns")
}

// Typings
require("./typings/index.typings")

/**
 * Resolve a Multicast-DNS addresses to local IPv4 addresses
 * @param {IPResolvable} mDNSAddress Resolvable address
 * @param {DNSRecordType} type DNS Record types
 * @param {{ socket_type: udp.SocketType, multicast_ttl: Number, port: Number }} options Optional options
 */
module.exports = async function (mDNSAddress, type, options) {
    if(!options) options = {}

    const socket = udp.createSocket({
        type: options.socket_type || "udp4",
        reuseAddr: true
    })

    socket.on("error", err => {
        throw "Socket error: " + err.message
    })

    socket.on("message", (message, rinfo) => {
        console.log("Message", message, rinfo)
    })

    socket.on("listening", () => {
        socket.setMulticastTTL(options.multicast_ttl || 255)
        socket.setMulticastLoopback(true)
        console.log("Listening")

        // Now send the query
        // TODO: Add support for arrays
        const query = {
            type: "query",
            questions: [{name: mDNSAddress, type: type || "ANY" }]
        }

        socket.send(utils.dns.encode(query.questions[0].name), 0, utils.dns.encode(query.questions[0].name).length, 5353, "224.0.0.251")
    }) 

    socket.bind(options.port || 5353)
}