var mdns = require('multicast-dns')()

function query(mdns_ip){
    return new Promise((resolve, reject)=>{
        mdns.on('response', function(response) {
            console.log(response)
            if(response.rcode === 'NOERROR'){
                resolve(response.answers[0].data)
                mdns.destroy()
            } else {
                reject(response.rcode)
                mdns.destroy()
            }
        })
        
        mdns.query({
          questions:[{
            name: mdns_ip,
            type: 'A'
          }]
        })
    })
}
// Run tests
//mdns.encode()

// lets query for an A record for 'brunhilde.local'
query("38aac546-f8af-4649-8e63-d1806df2a488.local")