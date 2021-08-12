require("../typings/util.dns.typings")
module.exports = {
    /**
     * Encode DNS packets. Note: Expects string as domain format
     * @param {mDNSAddress} string Domain name (in this case the multicast dns address)
     * @returns {DNSQueryPacket}
     */
    encode: function (string) {
        const buffer = Buffer.alloc(Buffer.byteLength(string) + 2)
        let offset = 0
        const list = string.split(".")

        for(const part of list){
            const length = buffer.write(part, offset + 1)
            buffer[offset] = length
            offset += length + 1
        }

        buffer[offset++] = 0
        return buffer
    }
}