// Guards every admin route. The session is created by routes/auth.js.
export function requireAdmin(req, res, next) {
  if (req.session?.admin) return next()
  return res.status(401).json({ message: 'Sign in to continue.' })
}
