/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessCategory } from './types';

export const BUSINESS_CATEGORIES = Object.values(BusinessCategory);

export const COLORS = {
  yellow: '#facc15', // yellow-400
  darkGreen: '#022c22', // amber-950 (Geometric Balance primary)
};

export const ADMIN_PASSWORD = 'password123';

export const LOCATION_DATA: Record<string, string[]> = {
  'Colombia': ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Santa Marta', 'Pereira', 'Manizales', 'Cúcuta', 'Ibagué', 'Pasto', 'Villavicencio', 'Montería', 'Neiva', 'Armenia', 'Popayán', 'Sincelejo', 'Valledupar', 'Tunja'],
  'México': ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Zapopan', 'Mérida', 'Cancún', 'Querétaro', 'Toluca', 'San Luis Potosí', 'Aguascalientes', 'Hermosillo', 'Mexicali', 'Saltillo', 'Cuernavaca', 'Tuxtla Gutiérrez', 'Durango'],
  'España': ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas de Gran Canaria', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Hospitalet de Llobregat', 'Vitoria-Gasteiz', 'A Coruña', 'Elche', 'Granada'],
  'Estados Unidos': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Philadelphia', 'Phoenix', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'San Francisco', 'Columbus', 'Fort Worth', 'Charlotte', 'Detroit', 'El Paso', 'Seattle'],
  'Perú': ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Iquitos', 'Piura', 'Cusco', 'Chimbote', 'Huancayo', 'Tacna', 'Juliaca', 'Ica', 'Callao', 'Sullana', 'Pucallpa', 'Ayacucho', 'Cajamarca', 'Huánuco', 'Tarapoto', 'Tumbes'],
  'Argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan', 'Resistencia', 'Neuquén', 'Corrientes', 'Avellaneda', 'Quilmes', 'Lanús', 'Bahía Blanca', 'San Salvador de Jujuy', 'Posadas', 'Paraná'],
  'Venezuela': ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'San Cristóbal', 'Barcelona', 'Maturín', 'Ciudad Guayana', 'Mérida', 'Cumaná', 'Barinas', 'Puerto La Cruz', 'Cabimas', 'Coro', 'Guanare', 'Los Teques', 'San Felipe', 'San Fernando de Apure', 'Trujillo']
};

export const COUNTRIES = Object.keys(LOCATION_DATA);

export const COUNTRY_FLAGS: Record<string, string> = {
  'Colombia': '🇨🇴',
  'México': '🇲🇽',
  'España': '🇪🇸',
  'Estados Unidos': '🇺🇸',
  'Perú': '🇵🇪',
  'Argentina': '🇦🇷',
  'Venezuela': '🇻🇪'
};
