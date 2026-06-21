// Stub de 'path' para Workers
export const join = (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');
export const resolve = (...parts) => parts.filter(Boolean).join('/');
export const extname = (f) => { const i = (f || '').lastIndexOf('.'); return i >= 0 ? f.slice(i) : ''; };
export const basename = (f, ext) => { const b = (f || '').split('/').pop(); return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; };
export const dirname = (f) => (f || '').split('/').slice(0, -1).join('/') || '.';
export const normalize = (f) => f;
export const sep = '/';
const path = { join, resolve, extname, basename, dirname, normalize, sep };
export default path;
