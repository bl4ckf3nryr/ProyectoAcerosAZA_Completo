/**
 * Utilidades de validación y formateo de RUT chileno (módulo 11) en JavaScript puro
 */
export function validarRutChileno(rutRaw) {
  if (!rutRaw || typeof rutRaw !== 'string') return false;

  const limpio = rutRaw.replace(/[\.\-\s]/g, '').toUpperCase();
  if (limpio.length < 8 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = suma % 11;
  const dvEsperado = 11 - resto;

  let dvCalculado = '';
  if (dvEsperado === 11) dvCalculado = '0';
  else if (dvEsperado === 10) dvCalculado = 'K';
  else dvCalculado = dvEsperado.toString();

  return dv === dvCalculado;
}

export function formatearRutChileno(rutRaw) {
  const limpio = rutRaw.replace(/[\.\-\s]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let formatted = '';
  let count = 0;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    formatted = cuerpo[i] + formatted;
    count++;
    if (count % 3 === 0 && i !== 0) {
      formatted = '.' + formatted;
    }
  }

  return `${formatted}-${dv}`;
}
