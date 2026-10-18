/** Resolves a file in public/ against the deploy base, so images load under a sub-path (e.g. GitHub Pages). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

/** The inverse of `asset`: the public path a resolved URL came from. */
export const publicPath = (src: string) =>
  src.startsWith(import.meta.env.BASE_URL) ? `/${src.slice(import.meta.env.BASE_URL.length)}` : src
