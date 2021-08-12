require("../typings/util.dns.typings")
module.exports = {
    /**
     * Encode DNS packets. Note: Expects string as domain format
     * @param {mDNSAddress} string Domain name (in this case the multicast dns address)
     * @returns {DNSQueryPacket}
     */
    encode: function (obj) {
        const buffer = []

        // --- Header ---
        const Header = {
            flags: (obj.flags || 0) & 32767,
            type: 0, // 0 For query,
            size: 12
        }

        // Header buffer
        const HeaderBuffer = Buffer.alloc(Header.size)      // Initial buffer
        HeaderBuffer.writeUInt16BE(0, 0)                    // ID (none)
        HeaderBuffer.writeUInt16BE(Header.flags, 2)         // Flags
        HeaderBuffer.writeUInt16BE(obj.questions.length, 4) // Number of questions
        HeaderBuffer.writeUInt16BE(0, 6)                    // Number of answers (none)
        HeaderBuffer.writeUInt16BE(0, 8)                    // Authorities (not supported)
        HeaderBuffer.writeUInt16BE(0, 10)                   // Additionals (not supported)

        buffer.push(HeaderBuffer) // Push to buffer list

        // --- Questions ---
        // Encode each entry
        for(const question of obj.questions){
            // Formatting
            question.name = question.name.replace(/^\.|\.$/gm, "")

            const QuestionBuffer = Buffer.alloc(Buffer.byteLength(question.name) + 2 + 4) // Name + 00 + 0000
            let InnerOffset = 0

            // Name
            for(const part of question.name.split(".")){
                const length = QuestionBuffer.write(part, InnerOffset + 1)
                QuestionBuffer[InnerOffset] = length
                InnerOffset += length + 1
            }

            QuestionBuffer[InnerOffset++] = 0

            // Settings
            QuestionBuffer.writeUInt16BE(1, InnerOffset)     // Type (A)
            QuestionBuffer.writeUInt16BE(1, InnerOffset + 2) // Class (IN)

            // Push
            buffer.push(QuestionBuffer)
        }

        // Join buffers and return it
        return Buffer.concat(buffer)
    }
}