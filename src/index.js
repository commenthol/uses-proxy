/**
 * @see https://about.gitlab.com/blog/2021/01/27/we-need-to-talk-no-proxy/
 */

import ipaddr from 'ipaddr.js'

/** @typedef {[ipaddr.IPv4 | ipaddr.IPv6, number]} IpRange */
/** @typedef {{values: string[], ranges: IpRange[]}} NoProxyList */
/** @typedef {ipaddr.IPv4 | ipaddr.IPv6} IpAddress */

/* eslint-disable camelcase */
const {
  http_proxy,
  HTTP_PROXY,
  https_proxy,
  HTTPS_PROXY,
  no_proxy,
  NO_PROXY
} = process.env

const proxyUri = http_proxy || HTTP_PROXY || https_proxy || HTTPS_PROXY
const protocol = http_proxy || HTTP_PROXY
  ? 'http'
  : https_proxy || HTTPS_PROXY
    ? 'https'
    : undefined
const noProxy = no_proxy || NO_PROXY
/* eslint-enable camelcase */

/**
 * @returns {{ proxyUri?: string, protocol?: 'https'|'http', noProxy?: string }}
 */
export function usesProxy () {
  return {
    proxyUri,
    protocol,
    noProxy
  }
}

/**
 * @param {string|string[]} noProxy
 * @returns {NoProxyList|undefined}
 */
export function getNoProxy (noProxy) {
  let list = []
  if (typeof noProxy === 'string') {
    list = noProxy.split(',')
  }
  if (list.includes('*') || !noProxy) {
    return
  }

  return list.map(item => {
    const range = getIpRange(item)
    if (range) {
      return {
        range
      }
    } else {
      if (item.indexOf('*.') === 0) {
        item = item.substring(1)
      }
      return {
        value: item
      }
    }
  }).filter(Boolean)
    .reduce((acc, cur) => {
      if (cur.value) {
        // @ts-ignore
        acc.values.push(cur.value)
      } else if (cur.range) {
        // @ts-ignore
        acc.ranges.push(cur.range)
      }
      return acc
    }, { values: [], ranges: [] })
}

/**
 * @param {string} ipRange
 * @returns {IpRange|null}
 */
const getIpRange = (ipRange) => {
  const CIDR_APPEND = ['', '0.0.0/8', '0.0/16', '0/24']
  const [ip, bits = 32] = ipRange.split('/')
  if (/^(\d{1,3}\.){1,3}\*$/.test(ip)) {
    const ipPart = ip.substring(0, ip.length - 1)
    const cidrPos = (ipPart.match(/\./g) || []).length
    return ipaddr.parseCIDR(`${ipPart}${CIDR_APPEND[cidrPos]}`)
  }
  if (!ipaddr.isValid(ip)) return null
  return ipaddr.parseCIDR(`${ip}/${bits}`)
}

/**
 * @param {string} ip
 * @returns {IpAddress|null}
 */
const parseIp = (ip) => {
  try {
    return ipaddr.parse(ip)
  } catch (e) {
    return null
  }
}

/**
 * @param {string} value
 * @param {string} hostname
 * @returns {boolean}
 */
export function matchDomain (value, hostname) {
  const index = (hostname || '').indexOf(value)
  return value[0] === '.'
    ? index >= 0 && value.length + index === hostname.length
    : index === 0
}

/**
 * @param {IpRange} range
 * @param {IpAddress} ipParsed
 * @returns {boolean}
 */
export function matchNetwork (range, ipParsed) {
  return ipParsed.match(...range)
}

/**
 * @param {object} param0
 * @param {string} param0.proxyUri
 * @param {string|string[]} param0.noProxy
 * @returns {(hostname: string)=> boolean}
 */
export function shouldProxy ({ proxyUri, noProxy }) {
  const list = getNoProxy(noProxy)
  const usesIps = list?.ranges.length

  return (hostname) => {
    if (!proxyUri) {
      return false
    }
    if (!list) { // proxy all requests
      return true
    }

    if (usesIps) {
      const ipParsed = (/(^\d|[:])/.test(hostname)) && parseIp(hostname)

      if (ipParsed) {
        // @ts-ignore
        for (const range of list.ranges) {
          if (matchNetwork(range, ipParsed)) {
            return false
          }
        }
        return true
      }
    }

    // @ts-ignore
    for (const value of list.values) {
      if (matchDomain(value, hostname)) {
        return false
      }
    }
    return true
  }
}
