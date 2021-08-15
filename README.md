# mDNS
Simple Node.Js library that utilizes only native Node.Js modules to resolve Multicast DNS addresses to normal IPv4 or IPv6 addresses.

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