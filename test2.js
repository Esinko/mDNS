var mdns = require('multicast-dns')()

mdns.on('response', function(response) {
  console.log('got a response packet:', response)
})

mdns.on('query', function(query) {
  console.log('got a query packet:', query)
})

// lets query for an A record for 'brunhilde.local'
mdns.query({
  questions:[{
    name: '38aac546-f8af-4649-8e63-d1806df2a488.local',
    type: 'A'
  }]
})