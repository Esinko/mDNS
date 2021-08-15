/**
 * mDNS-resolve
 * By: @Esinko 15.8.2021
 * License: Apache 2.0 (See LICENSE)
 */
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
    return new Promise((resolve, reject) => {
        if(!options) options = {}

        let subscription = null
        let finalized = false
        let memberships = []

        // Timeout for query
        const timeout = setTimeout(async () => {
            if(!finalized) reject("Query timeout")
            finalized = true
        }, options.timeout || 30000)

        // Create UDP socket
        const socket = udp.createSocket({
            type: options.socket_type || "udp4",
            reuseAddr: true
        })

        socket.on("message", (message) => {
            const packet = utils.dns.decode(message)
            if(packet !== null && packet.header.response === "SUCCESS" && packet.header.answers > 0){
                for(const answer of packet.answers){
                    if(answer.name === mDNSAddress){
                        clearInterval(subscription)
                        clearTimeout(timeout)
                        socket.close(() => {
                            if(!finalized) resolve(answer.data)
                            finalized = true
                        })
                        break
                    }
                }
            }
        })

        socket.on("listening", () => {
            socket.setMulticastTTL(options.multicast_ttl || 255)
            socket.setMulticastLoopback(false)

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
                    if(!memberships.includes(interface)) {
                        try {
                            socket.addMembership("224.0.0.251", interface)
                            memberships.push(interface)
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
        }) 

        socket.on("error", (e) => {
            clearInterval(subscription)
            if(!finalized) reject(e)
            finalized = true
        })

        socket.bind(options.port || 5353, "0.0.0.0")
    })
}