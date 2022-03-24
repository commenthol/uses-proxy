# uses-proxy

> Check if a url shall be proxied through a http(s) proxy

Implements the recommendations from https://about.gitlab.com/blog/2021/01/27/we-need-to-talk-no-proxy/

Detects and uses `http(s)_proxy` and `no_proxy` environment variables.

- Environment variables lowercase precedence. `no_proxy` comes before `NO_PROXY`
- Matches suffixes
- Does not strip leading `.`
- `*` matches all hosts
- No support for regexes.
- Supports CIDR Blocks
- Does not match loopback IPs

# usage

```
npm i no-proxy-env
```

```js
import { usesProxy, shouldProxy } from 'uses-proxy'
const {
  proxyUri, // proxy uri from https_proxy, http_proxy, ...
  protocol, // used protocol of proxy
  noProxy  // no_proxy env var content
} = usesProxy()

const matcher = shouldProxy({
  proxyUri,
  noProxy: noProxy || 'localhost,.tempuri.org'
})

matcher('localhost') // >> false
matcher('test.com') // >> true
matcher('test.tempuri.org') // >> false
matcher('tempuri.org') // >> true
```

# license

MIT licensed
