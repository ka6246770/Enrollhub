// SEO + GEO: the route-level metadata controller for static pages. It renders
// no UI; `Seo` writes the tags into <head>. Dynamic offer pages opt out of this
// map and render their own <Seo> with live pay, location and closing-date data.

import { useLocation } from 'react-router-dom'
import { getRouteSeo, normalizePath } from '../config/route-seo.js'
import Seo from './Seo.jsx'

export function RouteSeo() {
  const { pathname } = useLocation()
  const path = normalizePath(pathname)
  const meta = getRouteSeo(path)

  if (!meta) return null

  const { schema, ...rest } = meta
  return (
    <Seo
      {...rest}
      path={path}
      schema={typeof schema === 'function' ? schema(path) : schema}
    />
  )
}

export default RouteSeo
