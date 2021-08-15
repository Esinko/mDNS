// TODO: Move to using @properties
/**
 * @typedef {string} mDNSAddress Standard mDNS address ending with .local
 */

/**
 * @typedef {Buffer} DNSQueryPacket Standard DNS Query packet
 */

/**
 * @typedef {{ size: number, data: string }} DNSName DNS name decoder function output format
 */

/**
 * @typedef {{ id: number, type: "query"|"response", flags: number, questions: number, authorities: number, additionals: number, response: string, answers: number }} DNSHeaderDecoded DNS header decoded
 */

/**
 * @typedef {{ name: string, type: string, class: string }} DNSQuestion
 */

/**
 * @typedef {{ name: string, type: string, ttl: number, class: string, flush: boolean, data: string }} DNSAnswer
 */

/**
 * @typedef {{ header: DNSHeaderDecoded, questions: DNSQuestion[], answers: DNSAnswer[] }} DNSDecoded Decoded DNS response packet
 */