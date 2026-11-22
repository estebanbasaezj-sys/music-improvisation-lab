// Funciones que algunos celulares todavía no traen (iPhone con iOS 15.3 o anterior, Android con navegadores
// antiguos). Sin ellas la app se quedaba congelada al tocar el primer botón.

if (typeof globalThis.structuredClone !== 'function') {
  // el estado de la app es JSON puro (se guarda en localStorage), así que esta copia basta
  (globalThis as { structuredClone: unknown }).structuredClone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
}

if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  (crypto as { randomUUID: unknown }).randomUUID = () => {
    const b = new Uint8Array(16);
    if (typeof crypto.getRandomValues === 'function') crypto.getRandomValues(b);
    else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
}

export {};
