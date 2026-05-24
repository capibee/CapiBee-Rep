import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, X, CheckSquare, Square, ScanEye, MapPin, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, useMapsLibrary, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { Business, BusinessCategory } from '../types';
import { COUNTRIES, COUNTRY_FLAGS, LOCATION_DATA } from '../constants';

const COUNTRY_CODES: Record<string, string> = {
  'Colombia': 'CO',
  'México': 'MX',
  'España': 'ES',
  'Estados Unidos': 'US',
  'Perú': 'PE',
  'Argentina': 'AR',
  'Venezuela': 'VE'
};

const normalizePhoneWithLib = (phoneStr: string, countryName?: string) => {
  if (!phoneStr) return '';
  const isoCode = countryName ? COUNTRY_CODES[countryName] : undefined;
  try {
    const parsed = isoCode 
      ? parsePhoneNumberFromString(phoneStr, isoCode as CountryCode)
      : parsePhoneNumberFromString(phoneStr);
    if (parsed && parsed.isValid()) {
      return parsed.number; // E.164 context, e.g., "+573214567890"
    }
  } catch (error) {
    console.warn("normalizePhoneWithLib parser error", error);
  }
  return phoneStr;
};

const cleanWebsite = (url: string) => {
  if (!url) return '';
  return url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').trim();
};

interface ScrapingModalProps {
  onClose: () => void;
  onConfirm: (leads: Partial<Business>[]) => void;
}

const SEARCH_SUGGESTIONS = [
  "Restaurantes", "Agencias de marketing", "Barberías", "Peluquerías", 
  "Tiendas de ropa", "Clínicas dentales", "Gimnasios", "Talleres mecánicos", "Hoteles", "Inmobiliarias",
  "Estudios de arquitectura", "Despachos de abogados", "Consultorios médicos", "Agencias de viajes",
  "Servicios de limpieza", "Floristerías", "Ferreterías", "Panaderías", "Cafeterías",
  "Supermercados", "Farmacias", "Ópticas", "Veterinarias", "Spas", "Tiendas de mascotas",
  "Academias de baile", "Centros de estética", "Talleres de motos", "Gestorías", "Asesorías",
  "Boutiques", "Joyerías", "Librerías", "Restaurantes veganos", "Pizzerías"
];

function ScrapingModalInner({ onClose, onConfirm }: ScrapingModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({lat: 20, lng: -40});
  const [mapZoom, setMapZoom] = useState(2);
  const [leadsCount, setLeadsCount] = useState<number>(10);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedLeads, setScrapedLeads] = useState<Partial<Business>[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  const [selectedLocation, setSelectedLocation] = useState<google.maps.LatLngLiteral | null>(null);

  const placesLib = useMapsLibrary('places');
  const autocompleteService = React.useRef<google.maps.places.AutocompleteService | null>(null);

  useEffect(() => {
    if (placesLib && !autocompleteService.current) {
      autocompleteService.current = new placesLib.AutocompleteService();
    }
  }, [placesLib]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setDynamicSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      if (autocompleteService.current) {
        autocompleteService.current.getQueryPredictions(
          { input: searchTerm },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              setDynamicSuggestions(predictions.map(p => p.description));
            } else {
              setDynamicSuggestions([]);
            }
          }
        );
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleCountryChange = (c: string) => {
    setCountry(c);
    setCity('');
    geocodeLocation(c, '');
  };

  const handleCityChange = (ci: string) => {
    setCity(ci);
    geocodeLocation(country, ci);
  };

  const geocodeLocation = (co: string, ci: string) => {
     if (!co && !ci) return;
     if (!window.google) return;
     const geocoder = new google.maps.Geocoder();
     const address = ci ? `${ci}, ${co}` : co;
     geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
           const loc = results[0].geometry.location;
           const newCenter = { lat: loc.lat(), lng: loc.lng() };
           setMapCenter(newCenter);
           setSelectedLocation(newCenter);
           setMapZoom(ci ? 12 : 5);
        }
     });
  };

  const handleScrape = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm || leadsCount <= 0) return;
    if (!selectedLocation) {
       setError("Por favor, selecciona una ubicación en el mapa interactivo haciendo clic sobre él.");
       return;
    }

    if (!placesLib) {
      setError("La librería Places de Google Maps no está lista o la API Key es inválida. Revisa los permisos y restricciones en Google Cloud Console.");
      return;
    }

    setIsScraping(true);
    setScrapedLeads([]);
    setSelectedIndices(new Set());
    setError(null);

    try {
      const query = searchTerm;
      
      // Use legacy PlacesService to support pagination (get up to 60 results)
    const fetchWithPagination = (): Promise<google.maps.places.PlaceResult[]> => {
      return new Promise((resolve) => {
        const dummy = document.createElement('div');
        const service = new google.maps.places.PlacesService(dummy);
        let allResults: google.maps.places.PlaceResult[] = [];
        
        const callback = (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus, pagination: google.maps.places.PlaceSearchPagination | null) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            allResults = [...allResults, ...results];
          }
          
          // Always fetch max results (up to 60) to ensure we can meet the requested count after filtering
          const targetCandidatesCount = 60;

          if (allResults.length < targetCandidatesCount && pagination && pagination.hasNextPage) {
            // Google requires a delay (usually 2s) before the next page token is active
            setTimeout(() => {
              pagination.nextPage();
            }, 2200);
          } else {
            resolve(allResults);
          }
        };
        
        const searchRequest: google.maps.places.TextSearchRequest = { query };
          if (selectedLocation) {
             searchRequest.location = selectedLocation;
          }
          service.textSearch(searchRequest, callback);
        });
      };

      const places = await fetchWithPagination();

      if (places && places.length > 0) {
        const savedBusinesses = localStorage.getItem('capibee_businesses');
        const existingBusinesses: Business[] = savedBusinesses ? JSON.parse(savedBusinesses) : [];
        
        const savedClients = localStorage.getItem('capibee_clientes');
        const existingClients: any[] = savedClients ? JSON.parse(savedClients) : [];
        
        const seenPhones = new Set<string>();
        const seenPlaceIds = new Set<string>();
        const seenWebsites = new Set<string>();

        existingBusinesses.forEach(b => {
          if (b.placeId) {
            seenPlaceIds.add(b.placeId.trim());
          }
          if (b.phone) {
            seenPhones.add(normalizePhoneWithLib(b.phone, b.country));
            seenPhones.add(b.phone.replace(/\D/g, '').slice(-10));
          }
          if (b.website) {
            seenWebsites.add(cleanWebsite(b.website));
          }
        });
        
        existingClients.forEach(c => {
          if (c.phone) {
            seenPhones.add(normalizePhoneWithLib(c.phone, c.country));
            seenPhones.add(c.phone.replace(/\D/g, '').slice(-10));
          }
        });

        const results: (Partial<Business> & { _distance?: number })[] = [];
        const dummy = document.createElement('div');
        const service = new google.maps.places.PlacesService(dummy);

        for (const placeCandidate of places) {
          if (placeCandidate.place_id && seenPlaceIds.has(placeCandidate.place_id.trim())) {
            console.log("Skipping duplicate Google place_id:", placeCandidate.place_id);
            continue;
          }
          
          // Need to fetch details for each place to get the phone number
          const fetchDetails = (placeId: string): Promise<google.maps.places.PlaceResult | null> => {
            return new Promise((resolve) => {
              service.getDetails({
                placeId: placeId,
                fields: ['name', 'formatted_phone_number', 'international_phone_number', 'formatted_address', 'types', 'address_components', 'rating', 'website', 'geometry', 'place_id']
              }, (result, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                  resolve(result);
                } else {
                  resolve(null);
                }
              });
            });
          };

          // Small delay between details calls to avoid OVER_QUERY_LIMIT
          if (places.indexOf(placeCandidate) > 0) {
             await new Promise(r => setTimeout(r, 200));
          }

          const place = await fetchDetails(placeCandidate.place_id!);
          if (!place || !place.geometry || !place.geometry.location) continue;

          // Filtro de calificación (3.0 o superior)
          if (place.rating !== undefined && place.rating < 3.0) continue;

          const rawPhone = place.international_phone_number || place.formatted_phone_number;
          if (!rawPhone) continue; // Skip if no phone (Mandatorio)
          
          const normalizedScrapedPhone = normalizePhoneWithLib(rawPhone, country);
          const simpleScrapedPhoneDigits = normalizedScrapedPhone.replace(/\D/g, '').slice(-10);

          if (seenPhones.has(normalizedScrapedPhone) || seenPhones.has(simpleScrapedPhoneDigits)) {
            console.log("Skipping duplicate Phone number:", normalizedScrapedPhone);
            continue;
          }

          const scrapedWebsite = place.website || '';
          if (scrapedWebsite) {
            const cleanedScrapedWebsite = cleanWebsite(scrapedWebsite);
            if (seenWebsites.has(cleanedScrapedWebsite)) {
              console.log("Skipping duplicate Website domain:", scrapedWebsite);
              continue;
            }
          }

          // Calculate distance using Haversine formula
          const lat1 = selectedLocation!.lat;
          const lng1 = selectedLocation!.lng;
          const lat2 = place.geometry.location.lat();
          const lng2 = place.geometry.location.lng();
          
          const R = 6371; // Radius of the earth in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;

          let parsedCity = 'Desconocida';
          let parsedCountry = 'Desconocido';
          let parsedState = '';
          const components = place.address_components || [];
          const cityComponent = components.find(cn => cn.types.includes('locality')) || components.find(cn => cn.types.includes('administrative_area_level_2'));
          const countryComponent = components.find(cn => cn.types.includes('country'));
          const stateComponent = components.find(cn => cn.types.includes('administrative_area_level_1'));
          parsedCity = cityComponent ? cityComponent.long_name : 'Desconocida';
          parsedCountry = countryComponent ? countryComponent.long_name : 'Desconocido';
          parsedState = stateComponent ? stateComponent.long_name : '';
          
          const types = (place.types || []).join(' ').toLowerCase();
          const nameLower = (place.name || '').toLowerCase();
          let category = BusinessCategory.SERVICES;
          
          if (types.includes('beauty') || types.includes('hair') || types.includes('spa') || types.includes('barber') || types.includes('salon') || nameLower.includes('barber') || nameLower.includes('peluqueria') || nameLower.includes('salon')) {
            category = BusinessCategory.BEAUTY;
          } else if (types.includes('restaurant') || types.includes('cafe') || (types.includes('bar') && !types.includes('barber')) || types.includes('food') || nameLower.includes('restaurante') || nameLower.includes('comida')) {
            category = BusinessCategory.RESTAURANT;
          } else if (types.includes('store') || types.includes('shop') || types.includes('market') || types.includes('supermarket') || types.includes('clothing') || nameLower.includes('tienda')) {
            category = BusinessCategory.RETAIL;
          } else if (types.includes('health') || types.includes('doctor') || types.includes('hospital') || types.includes('clinic') || types.includes('pharmacy') || nameLower.includes('salud') || nameLower.includes('clinica')) {
            category = BusinessCategory.HEALTH;
          } else if (types.includes('tech') || types.includes('electronics') || types.includes('software') || nameLower.includes('tech')) {
            category = BusinessCategory.TECH;
          } else if (types.includes('education') || types.includes('school') || types.includes('university') || types.includes('training')) {
            category = BusinessCategory.EDUCATION;
          } else if (types.includes('hotel') || types.includes('travel') || types.includes('tourism') || types.includes('lodging')) {
            category = BusinessCategory.HOSPITALITY;
          } else if (types.includes('bank') || types.includes('finance') || types.includes('accounting') || types.includes('insurance')) {
            category = BusinessCategory.FINANCE;
          } else if (types.includes('construction') || types.includes('real_estate') || types.includes('architect') || types.includes('contractor')) {
            category = BusinessCategory.CONSTRUCTION;
          } else if (types.includes('car') || types.includes('transport') || types.includes('logistics') || types.includes('delivery')) {
            category = BusinessCategory.TRANSPORTATION;
          }
          
          results.push({
            name: place.name || 'Desconocido',
            category: category,
            country: parsedCountry,
            city: parsedCity,
            state: parsedState,
            prefix: '',
            phone: normalizedScrapedPhone,
            whatsapp: '',
            status: 'Nuevo',
            responsibleName: '',
            address: place.formatted_address || '',
            website: scrapedWebsite,
            rating: place.rating,
            placeId: placeCandidate.place_id,
            _distance: distance,
          });
          
          if (results.length >= leadsCount) break;
        }

        if (results.length > 0) {
          // Sort by distance
          results.sort((a,b) => (a as any)._distance - (b as any)._distance);
          
          // Clean up temp distance
          const finalResults = results.map(r => {
             const result = {...r} as any;
             delete result._distance;
             return result;
          });

          setScrapedLeads(finalResults);
          setSelectedIndices(new Set(finalResults.map((_, i) => i)));
        } else {
          setError("No se encontraron resultados nuevos con número de teléfono que no existan previamente.");
        }
      } else {
        setError("No se encontraron resultados para la búsqueda.");
      }
    } catch (err: any) {
      console.error('Error fetching places:', err);
      setError("Error al buscar en Google Maps. " + (err.message || 'Revise que la Places API (New) esté habilitada.'));
    } finally {
      setIsScraping(false);
    }
  };

  const toggleSelect = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === scrapedLeads.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(scrapedLeads.map((_, i) => i)));
    }
  };

  const handleConfirm = () => {
    const selectedLeads = scrapedLeads.filter((_, i) => selectedIndices.has(i));
    onConfirm(selectedLeads);
  };

  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-slate-900 border-x-0 sm:border-2 border-amber-500/20 shadow-2xl rounded-none sm:rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh]"
      >
        <div className="px-5 sm:px-6 py-4 border-b border-amber-500/10 flex justify-between items-center bg-slate-950/80 shrink-0 sticky top-0 z-30">
          <h2 className="text-base sm:text-lg font-display font-black text-white flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
            <span className="tracking-widest uppercase">Módulo de Scraping</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-10 flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-slate-900">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 shrink-0">
            {/* Left Col: Map */}
            <div className="h-64 sm:h-[300px] bg-slate-950 border border-amber-900/50 rounded-xl overflow-hidden relative shadow-inner">
              <Map
                mapId="capibee-world-map"
                center={mapCenter}
                zoom={mapZoom}
                onCameraChanged={(ev) => {
                  setMapCenter(ev.detail.center);
                  setMapZoom(ev.detail.zoom);
                }}
                mapTypeId="roadmap"
                disableDefaultUI={false}
                className="w-full h-full"
                onClick={(e) => e.detail.latLng && setSelectedLocation(e.detail.latLng)}
              >
                {selectedLocation && typeof google !== 'undefined' && <AdvancedMarker position={selectedLocation} />}
              </Map>
              
              <div className="absolute inset-x-0 bottom-0 pointer-events-none p-3 bg-gradient-to-t from-black/80 to-transparent flex justify-center pb-6">
                 {selectedLocation ? (
                   <span className="text-white text-[11px] font-bold bg-amber-500/20 px-4 py-2 rounded-full border border-amber-500/50 backdrop-blur-sm shadow-xl flex items-center gap-2 relative z-[100]">
                      <MapPin size={14} className="text-amber-400" />
                      Ubicada: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                   </span>
                 ) : (
                   <span className="text-white/80 text-[11px] font-bold bg-black/50 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm shadow-xl flex items-center gap-2 relative z-[100] animate-pulse">
                      <ScanEye size={16} className="text-amber-400" />
                      Haz clic en mapa
                   </span>
                 )}
              </div>
            </div>

            {/* Right Col: Form */}
            <form onSubmit={handleScrape} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest">País</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-950 border border-amber-900/50 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 cursor-pointer text-xs font-medium shadow-inner disabled:opacity-50"
                    value={country}
                    onChange={e => handleCountryChange(e.target.value)}
                    disabled={isScraping}
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{COUNTRY_FLAGS[c]} {c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest">Ciudad</label>
                  <select 
                    disabled={!country || isScraping}
                    className="w-full px-4 py-3 bg-slate-950 border border-amber-900/50 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium shadow-inner"
                    value={city}
                    onChange={e => handleCityChange(e.target.value)}
                  >
                    <option value="" disabled>{country ? 'Todas' : '...'}</option>
                    {country && LOCATION_DATA[country]?.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2 relative">
                <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest">Término de búsqueda</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    required
                    type="text"
                    placeholder="Ej. Restaurantes, Agencias..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-amber-900/50 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-xs shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isScraping}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                </div>
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.ul 
                      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                      className="absolute top-[calc(100%+4px)] left-0 right-0 bg-slate-900 border border-amber-900/50 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar"
                    >
                      {(dynamicSuggestions.length > 0 ? dynamicSuggestions : SEARCH_SUGGESTIONS.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()))).map(s => (
                        <li 
                          key={s} 
                          className="px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-amber-400 cursor-pointer transition-colors"
                          onClick={() => {
                            setSearchTerm(s);
                            setShowSuggestions(false);
                          }}
                        >
                          {s}
                        </li>
                      ))}
                      {dynamicSuggestions.length === 0 && SEARCH_SUGGESTIONS.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                         <li className="px-4 py-3 text-xs text-slate-500 text-center italic">Sin sugerencias</li>
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest">Cantidad de números (Leads)</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-950 border border-amber-900/50 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium text-xs shadow-inner cursor-pointer"
                  value={leadsCount}
                  onChange={(e) => setLeadsCount(parseInt(e.target.value) || 10)}
                  disabled={isScraping}
                >
                  {[10, 20, 50].map(val => (
                    <option key={val} value={val}>{val} Leads</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isScraping || !searchTerm || !selectedLocation}
                className="w-full h-[50px] mt-auto bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black uppercase tracking-widest rounded-xl shadow-[0_4px_15px_rgba(245,158,11,0.2)] transition-all flex items-center justify-center gap-2"
              >
                {isScraping ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search size={16} strokeWidth={3} />
                    Extraer Leads
                  </>
                )}
              </button>
            </form>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold leading-relaxed flex items-start gap-3 shrink-0"
            >
               <span className="text-lg">⚠️</span>
               <div>{error}</div>
            </motion.div>
          )}

          <div className="flex-1 min-h-0 relative">
            {scrapedLeads.length > 0 && (
              <div className="mb-4 flex items-center justify-between sticky top-0 z-20 bg-slate-900 py-2 border-b border-amber-900/30">
                <button 
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest hover:text-amber-400 transition-colors"
                >
                  {selectedIndices.size === scrapedLeads.length ? <CheckSquare size={16} className="text-amber-400" /> : <Square size={16} />}
                  {selectedIndices.size === scrapedLeads.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{scrapedLeads.length} Resultados</span>
              </div>
            )}

            <div className="space-y-3 pb-24 sm:pb-4">
              {scrapedLeads.length > 0 ? (
                scrapedLeads.map((lead, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => toggleSelect(idx)}
                      className={`group relative bg-slate-950/40 border transition-all duration-200 cursor-pointer rounded-2xl p-4 sm:p-5 flex items-center gap-4 ${isSelected ? 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 'border-slate-800 hover:border-amber-900/50 hover:bg-slate-900/40'}`}
                    >
                      <div className="shrink-0 flex items-center justify-center">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-slate-950">
                            <CheckSquare size={14} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-slate-700 group-hover:border-amber-900 transition-colors" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <h4 className="font-bold text-slate-100 text-sm sm:text-base truncate">{lead.name}</h4>
                          <span className="shrink-0 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            {lead.category?.split(' ')[0]}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span className="text-amber-500">📞</span> {lead.phone}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-blue-500">📍</span> {lead.city}, {lead.country}
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-600 mt-2 truncate font-medium">{lead.address}</p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-600 text-center">
                  {isScraping ? (
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative">
                        <Loader2 size={48} className="animate-spin text-amber-500" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ScanEye size={18} className="text-amber-500/50" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-amber-500 font-black uppercase tracking-[0.2em] text-[10px]">Escaneando Google Maps</p>
                        <p className="text-xs font-medium max-w-[280px] leading-relaxed">Estamos localizando negocios que coincidan con tus criterios y verificando sus datos de contacto...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto border border-amber-900/20 group hover:border-amber-500/20 transition-colors">
                        <ScanEye size={36} className="opacity-20 group-hover:opacity-40 transition-opacity" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-slate-400 font-bold">Motor de Prospección Inactivo</p>
                        <p className="text-xs max-w-[300px] mx-auto leading-relaxed">Configura los filtros superiores para comenzar la extracción automatizada de nuevos leads comerciales.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 py-5 border-t border-amber-500/10 bg-slate-950/80 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4 sticky bottom-0 z-30">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <p className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-[0.1em] text-center sm:text-left whitespace-nowrap">
              {scrapedLeads.length > 0 ? (
                <span className="text-amber-400">{selectedIndices.size} leads para insertar</span>
              ) : (
                'Buscador listo'
              )}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3 bg-slate-800 text-slate-400 font-bold rounded-xl hover:text-white transition-all text-xs uppercase tracking-widest"
            >
              Cerrar
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIndices.size === 0 || isScraping}
              className="flex-1 sm:flex-none px-10 py-3 bg-yellow-400 disabled:opacity-30 disabled:grayscale hover:bg-yellow-300 text-slate-950 font-black uppercase tracking-widest rounded-xl shadow-[0_4px_20px_rgba(234,179,8,0.3)] transition-all text-xs"
            >
              Insertar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export default function ScrapingModal(props: ScrapingModalProps) {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-6 max-w-sm text-center shadow-xl">
          <h2 className="text-white font-bold mb-2">Maps API Key Required</h2>
          <p className="text-xs text-slate-300 mb-4">Please add a valid GOOGLE_MAPS_PLATFORM_KEY in the AI Studio Secrets panel to use the Scraping Module.</p>
          <button onClick={props.onClose} className="px-4 py-2 bg-slate-800 text-white rounded font-semibold hover:bg-slate-700 text-xs shadow">Close</button>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <ScrapingModalInner {...props} />
    </APIProvider>
  );
}
