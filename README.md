# mDNS

### Caution: At the moment this library contains a known bug regarding the decoding of certain DNS packages. This bug will be fixed once a complete fix can be created. This bug impacts responses/requests with multiple questions or answers. Thus it should not affect normal use of the library.

Simple Node.Js library that utilizes only native Node.Js modules to resolve Multicast DNS addresses to normal IPv4 or IPv6 addresses.
<br>This library was made to comply with changes made to the webRTC standard here: <a href="https://tools.ietf.org/id/draft-ietf-rtcweb-mdns-ice-candidates-02.html">Draft-ietf-rtcweb-mdns-ice-candidates-02</a>

# Example
Here is a simple example of how to use this library.
<br><i>(Do not forget to handle promise rejections)</i>

```js
(async () => {
    // Import library
    const resolve = require("./index.js")

    // Example usage
    const ip = await resolve("<domain>.local")
    console.log(ip)
})()
```

# License
```
See LICENSE file
```
