// Stub de 'fs' para Workers (EJS lo importa pero solo lo usa con renderFile, no con render())
export const readFileSync = () => '';
export const existsSync = () => false;
export const readdirSync = () => [];
export const writeFileSync = () => {};
export const unlinkSync = () => {};
export const mkdirSync = () => {};
export const statSync = () => ({ isFile: () => false, isDirectory: () => false });
const fs = { readFileSync, existsSync, readdirSync, writeFileSync, unlinkSync, mkdirSync, statSync };
export default fs;
