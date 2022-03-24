/**
 * @returns {{ proxyUri?: string, protocol?: 'https'|'http', noProxy?: string }}
 */
export function usesProxy(): {
    proxyUri?: string;
    protocol?: 'https' | 'http';
    noProxy?: string;
};
/**
 * @param {string|string[]} [noProxy]
 * @returns {NoProxyList|undefined}
 */
export function getNoProxy(noProxy?: string | string[] | undefined): NoProxyList | undefined;
/**
 * @param {string} value
 * @param {string} hostname
 * @returns {boolean}
 */
export function matchDomain(value: string, hostname: string): boolean;
/**
 * @param {IpRange} range
 * @param {IpAddress} ipParsed
 * @returns {boolean}
 */
export function matchNetwork(range: IpRange, ipParsed: IpAddress): boolean;
/**
 * @param {object} param0
 * @param {string} [param0.proxyUri]
 * @param {string|string[]} [param0.noProxy]
 * @returns {(hostname: string)=> boolean}
 */
export function shouldProxy({ proxyUri, noProxy }?: {
    proxyUri?: string | undefined;
    noProxy?: string | string[] | undefined;
}): (hostname: string) => boolean;
export type IpRange = [ipaddr.IPv4 | ipaddr.IPv6, number];
export type NoProxyList = {
    values: string[];
    ranges: [ipaddr.IPv4 | ipaddr.IPv6, number][];
};
export type IpAddress = ipaddr.IPv4 | ipaddr.IPv6;
declare const proxyUri: string | undefined;
declare const protocol: "http" | "https" | undefined;
declare const noProxy: string | undefined;
import ipaddr from "ipaddr.js";
export {};
