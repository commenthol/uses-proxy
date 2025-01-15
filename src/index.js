/**
 * @see https://about.gitlab.com/blog/2021/01/27/we-need-to-talk-no-proxy/
 */

import ipaddr from 'ipaddr.js'

/** @typedef {[ipaddr.IPv4 | ipaddr.IPv6, number]} IpRange */
/** @typedef {{values?: string[], ranges?: IpRange[], all?: boolean}} NoProxyList */
/** @typedef {ipaddr.IPv4 | ipaddr.IPv6} IpAddress */

const { http_proxy, HTTP_PROXY, https_proxy, HTTPS_PROXY, no_proxy, NO_PROXY } =
  process.env

const proxyUri = http_proxy || HTTP_PROXY || https_proxy || HTTPS_PROXY
const protocol =
  http_proxy || HTTP_PROXY
    ? 'http'
    : https_proxy || HTTPS_PROXY
      ? 'https'
      : undefined
const noProxy = no_proxy || NO_PROXY

/**
 * @returns {{ proxyUri?: string, protocol?: 'https'|'http', noProxy?: string }}
 */
export function usesProxy() {
  return {
    proxyUri,
    protocol,
    noProxy
  }
}

/**
 * @param {string|string[]} [noProxy]
 * @returns {NoProxyList|undefined}
 */
export function getNoProxy(noProxy) {
  if (!noProxy) {
    return
  }

  let list = []
  if (typeof noProxy === 'string') {
    list = noProxy.split(',').map((m) => m.trim())
  }
  if (list.includes('*')) {
    return { all: true }
  }

  const values = new Set()
  const ranges = new Set()

  for (const item of list) {
    const range = getIpRange(item)
    if (range) {
      ranges.add(range)
      continue
    }
    let _item = item
    if (item.startsWith('*.')) {
      _item = item.slice(2)
    } else if (item.startsWith('.')) {
      _item = item.slice(1)
    }
    if (_item.length) {
      values.add(_item)
    }
  }

  if (!values.size && !ranges.size) {
    return
  }

  return {
    values: [...values],
    ranges: [...ranges]
  }
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
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    return null
  }
}

/**
 * @param {string} value
 * @param {string} hostname
 * @returns {boolean}
 */
export const matchDomain = (value, hostname) => hostname.endsWith(value)

/**
 * @param {IpRange} range
 * @param {IpAddress} ipParsed
 * @returns {boolean}
 */
export const matchNetwork = (range, ipParsed) => ipParsed.match(...range)

/**
 * @param {object} param0
 * @param {string} [param0.proxyUri]
 * @param {string|string[]} [param0.noProxy]
 * @returns {(hostname: string)=> boolean}
 */
export function shouldProxy({ proxyUri = '', noProxy = '' } = {}) {
  const list = getNoProxy(noProxy)
  const usesIps = list?.ranges?.length

  return (hostname) => {
    if (!list) {
      // proxy all requests
      return true
    }
    if (!hostname || !proxyUri || list.all) {
      // no proxy all requests
      return false
    }

    if (usesIps) {
      const ipParsed = /(^\d|[:])/.test(hostname) && parseIp(hostname)

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

    // @ts-expect-error
    for (const value of list.values) {
      if (matchDomain(value, hostname)) {
        return false
      }
    }
    return true
  }
}
