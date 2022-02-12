import assert from 'assert'
import ipaddr from 'ipaddr.js'

import { getNoProxy, matchDomain, matchNetwork, shouldProxy } from '../src/index.js'

describe('uses-proxy', function () {
  describe('getNoProxy', function () {
    it('should return no list if undefined', function () {
      const list = getNoProxy()
      assert.strictEqual(list, undefined)
    })

    it('should proxy all requests if "*"', function () {
      const list = getNoProxy('*')
      assert.strictEqual(list, undefined)
    })

    it('should proxy all requests if "*" is part of no_proxy', function () {
      const list = getNoProxy('localhost,127.0.0.1,*')
      assert.strictEqual(list, undefined)
    })

    it('should proxy all requests for *.tempuri.org', function () {
      const list = getNoProxy('*.tempuri.org')
      assert.deepStrictEqual(list, { values: ['.tempuri.org'], ranges: [] })
    })

    it('should create proxy list', function () {
      const list = getNoProxy('localhost,127.0.0.0/8,172.1.0.1,10.0.*,.tempuri.org,exact.com')
      assert.deepStrictEqual(list, {
        values: ['localhost', '.tempuri.org', 'exact.com'],
        ranges: [
          ipaddr.parseCIDR('127.0.0.0/8'),
          ipaddr.parseCIDR('172.1.0.1/32'),
          ipaddr.parseCIDR('10.0.0.0/16')
        ]
      })
    })
  })

  describe('matchDomain', function () {
    it('matchDomain', function () {
      const matches = matchDomain('.tempuri.org', 'sub.tempuri.org')
      assert.ok(matches)
    })

    it('no matchDomain', function () {
      const matches = matchDomain('.tempuri.org', 'sub.other.org')
      assert.ok(!matches)
    })

    it('shall not matchDomain if not exact subdomain', function () {
      const matches = matchDomain('tempuri.org', 'sub.tempuri.org')
      assert.ok(!matches)
    })

    it('shall matchDomain if same domain', function () {
      const matches = matchDomain('sub.tempuri.org', 'sub.tempuri.org')
      assert.ok(matches)
    })
  })

  describe('matchNetwork', function () {
    it('shall match network', function () {
      const range = ipaddr.parseCIDR('127.0.0.0/8')
      const addr = ipaddr.parse('127.0.0.1')
      const matches = matchNetwork(range, addr)
      assert.ok(matches)
    })

    it('shall not match network', function () {
      const range = ipaddr.parseCIDR('127.0.0.0/8')
      const addr = ipaddr.parse('128.0.0.1')
      const matches = matchNetwork(range, addr)
      assert.ok(!matches)
    })

    it('shall match ip', function () {
      const range = ipaddr.parseCIDR('127.0.0.0/32')
      const addr = ipaddr.parse('127.0.0.0')
      const matches = matchNetwork(range, addr)
      assert.ok(matches)
    })

    it('shall not match ip', function () {
      const range = ipaddr.parseCIDR('127.0.0.0/32')
      const addr = ipaddr.parse('127.0.0.1')
      const matches = matchNetwork(range, addr)
      assert.ok(!matches)
    })
  })

  describe('shouldProxy', function () {
    const matcher = shouldProxy({ proxyUri: 'http://localhost:8080', noProxy: 'localhost,127.0.0.0/8,172.1.0.1,10.1.*,.tempuri.org,*.bar' })
    const tests = [
      ['localhost', false],
      ['sub.tempuri.org', false],
      ['tempuri.org', true],
      ['foo.bar', false],
      ['.bar', false],
      ['127.4.0.1', false],
      ['128.0.0.1', true],
      ['172.1.0.1', false],
      ['172.1.0.2', true],
      ['172nonsense', true],
      [null, true]
    ]
    tests.forEach(([hostname, exp]) => {
      it('' + hostname, function () {
        assert.strictEqual(matcher(hostname), exp)
      })
    })

    it('empty list', function () {
      const matcher = shouldProxy({ proxyUri: 'http://localhost' })
      assert.strictEqual(matcher('foo.bar'), true)
    })

    it('no proxy at all', function () {
      const matcher = shouldProxy({})
      assert.strictEqual(matcher('foo.bar'), false)
    })
  })

  describe('usesProxy', function () {
    it('with https_proxy', async function () {
      process.env.http_proxy = ''
      process.env.https_proxy = 'https://localhost:8080'
      const { usesProxy } = await import('../src/index.js?x0')
      assert.deepStrictEqual(usesProxy(), {
        proxyUri: 'https://localhost:8080',
        protocol: 'https',
        noProxy: undefined
      })
    })

    it('with http_proxy', async function () {
      process.env.https_proxy = ''
      process.env.http_proxy = 'http://localhost:8080'
      const { usesProxy } = await import('../src/index.js?x1')
      assert.deepStrictEqual(usesProxy(), {
        proxyUri: 'http://localhost:8080',
        protocol: 'http',
        noProxy: undefined
      })
    })

    it('http_proxy comes before HTTP_PROXY', async function () {
      process.env.https_proxy = ''
      process.env.http_proxy = 'http://localhost:8080'
      process.env.HTTP_PROXY = 'http://foo.bar:8080'
      const { usesProxy } = await import('../src/index.js?x2')
      assert.deepStrictEqual(usesProxy(), {
        proxyUri: 'http://localhost:8080',
        protocol: 'http',
        noProxy: undefined
      })
    })

    it('with no_proxy', async function () {
      process.env.HTTP_PROXY = process.env.http_proxy = ''
      process.env.https_proxy = 'https://localhost:8080'
      process.env.no_proxy = 'localhost,.tempuri.org'
      const { usesProxy } = await import('../src/index.js?x3')
      assert.deepStrictEqual(usesProxy(), {
        proxyUri: 'https://localhost:8080',
        protocol: 'https',
        noProxy: 'localhost,.tempuri.org'
      })
    })
  })
})
