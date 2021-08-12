// Dependencies
const os = require("os")
const udp = require("dgram")

// Utils
const utils = {
    dns: require("./utils/dns")
}

// Typings
require("./typings/index.typings")

/**
 * Resolve a Multicast-DNS addresses to local IPv4 addresses
 * @param {mDNSAddress} mDNSAddress Resolvable address
 * @param {DNSRecordType} type DNS Record types
 * @param {{ socket_type: udp.SocketType, multicast_ttl: Number, port: Number }} options Optional options
 * @returns {Promise<IPResolvable>}
 */
module.exports = async function (mDNSAddress, type, options) {
    if(!options) options = {}

    let subscription = null
    let memberships = {}

    const socket = udp.createSocket({
        type: options.socket_type || "udp4",
        reuseAddr: true
    })

    socket.on("error", err => {
        throw "Socket error: " + err.message
    })

    socket.on("message", (message, rinfo) => {
        // TODO: Decoding
        console.log("Message", message, rinfo)
    })

    socket.on("listening", () => {
        socket.setMulticastTTL(options.multicast_ttl || 255)
        socket.setMulticastLoopback(false)
        console.log("Listening")

        // Subscription
        const subscribe = async () => {
            const interfaces = []
            const OSInterfaces = os.networkInterfaces()
            for(const interface in OSInterfaces){
                for(const iface of OSInterfaces[interface]){
                    if(iface.family === "IPv4") interfaces.push(iface.address)
                }
            }
            // Subscribe to each interface
            for(const interface of interfaces){
                if(!memberships[interface]) {
                    try {
                        socket.addMembership("224.0.0.251", interface)
                    }
                    catch(e){
                        console.warn("Failed to subscribe to", interface)
                    }
                }
            }

            // Set default interface
            let defaultI = ""
            for(const interface in OSInterfaces){
                for(const iface of OSInterfaces[interface]){
                    if(iface.family === "IPv4" && !iface.internal){
                        if(os.platform() === "darwin" && interface === "en0"){
                            defaultI = iface.address
                            break
                        }
                    }
                }
            }
            if(defaultI === "") defaultI = "0.0.0.0"
            socket.setMulticastInterface(defaultI)
        }

        subscribe()
        subscription = setInterval(subscribe, 5000)

        // Now send the query
        // TODO: Add support for arrays
        const query = {
            questions: [{name: mDNSAddress, type: type || "ANY" }],
            type: "query",
            answers: [],
            authorities: [],
            additionals: []
        }
        socket.send(utils.dns.encode(query), 0, utils.dns.encode(query).length, 5353, "224.0.0.251")
        console.log("Query sent!")
    }) 

    socket.bind(options.port || 5353, "0.0.0.0")
}