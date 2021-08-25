require("../typings/util.dns.typings")

module.exports = {
    /**
     * DNS packet responses
     */
    responses: [
        // Known
        "SUCCESS",
        "FORMERR",
        "SERVFAIL",
        "NXDOMAIN",
        "NOTIMP",
        "REFUSED",
        "YXDOMAIN",
        "NXRRSET",
        "NOTAUTH",
        "NOTZONE",
        // Unknown
        "U11",
        "U12",
        "U13",
        "U14",
        "U15"
    ],

    /**
     * Supported question/answer types
     */
    supportedTypes: {
        "1": "A",
        "255": "ANY",
        "28": "AAAA"
    },

    /**
     * DNS classes
     */
    classes: [
        "IN",
        "CS",
        "CH",
        "HS",
        "ANY"
    ],

    /**
     * Encode a DNS packet. Note: Expects string as domain format
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
    },

    /**
     * Decode DNS answer/question/authority or additionals
     * @param {Buffer} buffer 
     * @param {number} InnerOffset 
     * @returns {DNSName}
     */
    decodeName: function (buffer, reference) {
        // Check for reference as the name
        if(buffer[0] >= 192){
            const start = buffer.readUInt16BE(0) - 49152 - 12
            const txt = this.decodeNameNew(reference.slice(start), reference)
            txt.size = 2
            return txt
        }

        let offset = 0
        let Length = buffer[offset]
        let skip = []
        ++offset
        let name = []
        for(let i = 0; i < Length; i++){
            if(skip.includes(i)) {
                name.push(".")
                continue
            }
            name.push(String.fromCharCode(buffer[offset + i]))
            if(Length === i + 1){
                // Can we continue reading more chunks?
                if(buffer.length > offset + i + 2){
                    // Is there a second chunk with valid text?
                    if(/[a-zA-Z0-9-_ ]/.test(String.fromCharCode(buffer[offset + i + 2]))){
                        // Found second chunk, read it
                        // We will increase name length and then skip the index where the chunk length is defined
                        Length += buffer[offset + i + 1] + 1
                        skip.push(i + 1)
                    }else if(buffer[offset + i + 1] >= 192){ // Does the name end with a reference?
                        // Find the start of the reference
                        const start = buffer.readUInt16BE(offset + i + 1) - 49152 - 12
                        // Get the reference text data (recursion)
                        const txt = this.decodeNameNew(reference.slice(start), reference)
                        name.push("." + txt.data)
                        ++offset
                    }
                }
            }
        }
        offset += Length + 1
        name = name.join("")
        return { data: name, size: offset }
    },

    /**
     * Decode IPv4 data
     * @param {buffer} buffer 
     * @returns {string}
     */
    decodeIPv4: function (buffer){
        let offset = 0
        offset = ~~offset
        return `${buffer[offset++]}.${buffer[offset++]}.${buffer[offset++]}.${buffer[offset]}`
    },

    /**
     * Decode IPv6 data
     * @param {buffer} buffer
     * @returns {string}
     */
    decodeIPv6: function (buffer){
        let offset = 0
        offset = ~~offset
        let result = ''
        for (let i = 0; i < 16; i += 2) {
            if (i !== 0) {
                result += ':'
            }
            result += (buffer[offset + i] << 8 | buffer[offset + i + 1]).toString(16)
        }
        return result
            .replace(/(^|:)0(:0)*:0(:|$)/, '$1::$3')
            .replace(/:{3,4}/, '::')
    },
    
    /**
     * Decode a DNS packet
     * @param {Buffer} inBuffer The raw socket data buffer
     * @returns {DNSDecoded}
     */
    decode: function (inBuffer){
        // --- Header ---
        const Header = {
            id: inBuffer.readUInt16BE(0),
            type: inBuffer.readUInt16BE(2) & (1 << 15) ? "response": "query",
            flags: inBuffer.readUInt16BE(2) & 32767,
            response: this.responses[parseInt(inBuffer.readUInt16BE(2) & 0xf)],
            // Leave flags at that
            questions: new Array(inBuffer.readUInt16BE(4)).length,
            answers: new Array(inBuffer.readUInt16BE(6)).length,
            authorities: new Array(inBuffer.readUInt16BE(8)).length,
            additionals: new Array(inBuffer.readUInt16BE(10)).length
        }
        inBuffer = inBuffer.slice(12)

        // Ignore queries for now
        if(Header.type === "query") return null

        // --- Question ---
        // Note:    This is often not used,
        //          but we will handle this regardless,
        //          because this might appear in an answer
        //          (and needs to be sliced off to read the answer).
        const Questions = []
        const QuestionReference = inBuffer.slice(0)
        for(let i = 0; i < Header.questions; i++){
            const InitialQuestion = {
                name: null,
                type: null,
                class: null
            }
            const decodedQuestionName = this.decodeName(inBuffer, QuestionReference)
            InitialQuestion.name = decodedQuestionName.data
            inBuffer = inBuffer.slice(decodedQuestionName.size) // Slice name
            InitialQuestion.type = this.supportedTypes[inBuffer.readUInt16BE(0)] || "Unknown"
            InitialQuestion.class = this.classes[inBuffer.readUInt16BE(2) - 1] || this.classes[this.classes.length - 1]
            inBuffer = inBuffer.slice(4) // Slice info
            Questions.push(InitialQuestion)
        }

        // --- Answer ---
        const Answers = []
        for(let i = 0; i < Header.answers; i++){
            const InitialAnswer = {
                name: null,
                type: null,
                ttl: null,
                class: null,
                flush: null,
                data: null
            }
            
            // Decode the name
            const decodedAnswerName = this.decodeName(inBuffer, QuestionReference)
            InitialAnswer.name = decodedAnswerName.data
            inBuffer = inBuffer.slice(decodedAnswerName.size) // Slice raw name data
            InitialAnswer.type = this.supportedTypes[inBuffer.readUInt16BE(0)]
    
            // Decode according to answer type
            if(!InitialAnswer.type) InitialAnswer.type = "Unknown"
            if(InitialAnswer.type !== "Unknown"){
                const tClass = inBuffer.readUInt16BE(2)
                InitialAnswer.ttl = inBuffer.readUInt32BE(4)
                InitialAnswer.class = this.classes[tClass - 1] || this.classes[this.classes.length-1]
                InitialAnswer.flush = !!(tClass & (1 << 15))
                inBuffer = inBuffer.slice(8) // Erm...?
    
                if(InitialAnswer.type === "A"){
                    inBuffer = inBuffer.slice(2)
                    const host = this.decodeIPv4(inBuffer)
                    InitialAnswer.data = host
                    inBuffer = inBuffer.slice(6) // IPv4 is 6 bytes
                }else if(InitialAnswer.type === "AAAA"){
                    inBuffer = inBuffer.slice(2)
                    const host = this.decodeIPv6(inBuffer)
                    InitialAnswer.data = host
                    inBuffer = inBuffer.slice(18) // IPv6 is 18 bytes
                }else {
                    // TODO: We should know how to calculate slice lengths for any type of answer
                    // Default
                    try {
                        const ULength = inBuffer.readUInt16BE(0)
                        const UData = inBuffer.slice(2, 2 + ULength)
                        InitialAnswer.data = UData
                        inBuffer = inBuffer.slice(ULength + 2)
                    }
                    catch(e){
                        InitialAnswer.data = null
                        console.warn("Failed to decode unknown answer type")
                    }
                }
                inBuffer = inBuffer.slice(8) // Slice 8 along the data part
            }
            Answers.push(InitialAnswer)
        }

        // After this, there are the authorities and additionals,
        // which we will not handle, as they are not required
        // for the purposes of this library
        
        return {
            header: Header,
            questions: Questions,
            answers: Answers
        }
    }
}