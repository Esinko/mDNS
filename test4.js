(async () => {
    const dns = require("./node_modules/dns-packet")
    const my_dns = require("./utils/dns")

    const encodeThis = {
        questions: [ { name: '38aac546-f8af-4649-8e63-d1806df2a488.local', type: 'A' } ],
        type: 'query',
        answers: [],
        authorities: [],
        additionals: []
    }

    //const name = dns.name.encode(encodeThis.questions[0].name)
    const og = await dns.encode(encodeThis)
    const new_ = my_dns.encode(encodeThis)


    console.log(og.toString("hex") + "\n" + new_.toString("hex"))
})()