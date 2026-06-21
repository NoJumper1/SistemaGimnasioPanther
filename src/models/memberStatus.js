import dayjs from 'dayjs';

/**
 * Calcula el estado de un socio a partir de su suscripción más reciente.
 *
 * @param {{ end_date: string } | null | undefined} latestSubscription
 *   La suscripción con end_date más reciente del socio, o null/undefined si no tiene ninguna.
 * @param {string} [today] - fecha de referencia en formato YYYY-MM-DD (por defecto, hoy). Útil para pruebas.
 * @returns {{ status: 'activo' | 'caducado' | 'sin_suscripcion', endDate: string | null }}
 */
function getMemberStatus(latestSubscription, today = dayjs().format('YYYY-MM-DD')) {
  if (!latestSubscription) {
    return { status: 'sin_suscripcion', endDate: null };
  }

  const endDate = latestSubscription.end_date;
  const isActive = dayjs(endDate).isSame(today, 'day') || dayjs(endDate).isAfter(today, 'day');

  return {
    status: isActive ? 'activo' : 'caducado',
    endDate,
  };
}

const STATUS_LABELS = {
  activo: 'Vigente',
  caducado: 'Vencida',
  sin_suscripcion: 'Sin suscripción',
};

const STATUS_BADGE_CLASSES = {
  activo: 'bg-success',
  caducado: 'bg-danger',
  sin_suscripcion: 'bg-secondary',
};

export { getMemberStatus, STATUS_LABELS, STATUS_BADGE_CLASSES };
