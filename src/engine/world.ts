import { UserProfile, WorldState } from '../types';

export interface PlaceOption {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export function suggestPlaces(user: UserProfile): PlaceOption[] {
  const city = user.useFictionalCity ? 'Ciudad Aurora' : user.city || 'tu ciudad';
  const age = user.age;
  const occ = (user.occupation || '').toLowerCase();
  const student = age < 23 || occ.includes('estudi') || occ.includes('coleg') || occ.includes('univers');
  const works = occ.includes('trabaj') || occ.includes('oficin') || age >= 23;

  const pool: PlaceOption[] = [];

  if (student) {
    pool.push({
      id: 'biblioteca',
      name: 'La biblioteca del barrio',
      description: `Un lugar silencioso en ${city}, con mesas largas y ventanales. Es fácil coincidir si estudias.`,
      emoji: '📚',
    });
    pool.push({
      id: 'cafeteria',
      name: 'Cafetería cerca del campus',
      description: 'Música baja, olor a café y gente con audífonos. Un punto de encuentro natural.',
      emoji: '☕',
    });
  }
  if (works) {
    pool.push({
      id: 'parque',
      name: 'El parque a la salida del trabajo',
      description: 'Bancas, árboles y gente corriendo. Un respiro antes de volver a casa.',
      emoji: '🌳',
    });
  }
  pool.push({
    id: 'tienda',
    name: 'Una tienda pequeña de discos y libros',
    description: 'Estanterías apretadas y un dueño que no molesta. Se puede pasar horas ahí.',
    emoji: '💿',
  });
  pool.push({
    id: 'cancha',
    name: 'La cancha del barrio',
    description: 'Ruido de pelota, risas y un banco donde sentarse a mirar.',
    emoji: '🏀',
  });
  pool.push({
    id: 'mirador',
    name: 'Un mirador con vista a la ciudad',
    description: 'Se llega caminando. Al atardecer se llena de gente callada.',
    emoji: '🌇',
  });

  return pool.slice(0, 3);
}

export function createWorld(place: PlaceOption, user: UserProfile): WorldState {
  const weathers: WorldState['weather'][] = ['soleado', 'nublado', 'lluvia', 'frio', 'calor'];
  return {
    placeId: place.id,
    placeName: place.name,
    placeDescription: place.description,
    weather: weathers[Math.floor(Math.random() * weathers.length)],
    dayIndex: 0,
    startedAt: Date.now(),
  };
}

export const WEATHER_LABEL: Record<WorldState['weather'], string> = {
  soleado: 'Soleado',
  nublado: 'Nublado',
  lluvia: 'Lluvia',
  frio: 'Frío',
  calor: 'Calor',
};

export const WEATHER_EMOJI: Record<WorldState['weather'], string> = {
  soleado: '☀️',
  nublado: '☁️',
  lluvia: '🌧️',
  frio: '❄️',
  calor: '🔥',
};

export function dayNumber(world: WorldState | null): number {
  if (!world) return 0;
  return Math.floor((Date.now() - world.startedAt) / 86400000);
}

export function fictionalCityName(seed: number): string {
  const a = ['Aurora', 'Lumen', 'Vela', 'Nara', 'Sora', 'Mira'];
  const b = ['del Valle', 'de la Costa', 'Alta', 'Baja', 'del Lago'];
  return `${a[Math.abs(seed) % a.length]} ${b[Math.abs(seed + 3) % b.length]}`;
}
