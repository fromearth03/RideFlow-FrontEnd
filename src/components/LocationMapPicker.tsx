import { useEffect, useMemo, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LocationMapPickerProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  error?: string;
};

type GeocodingFeature = {
  id: string;
  place_name?: string;
  place_name_en?: string;
  text?: string;
  text_en?: string;
  center: [number, number];
};

const DEFAULT_CENTER: [number, number] = [73.49168, 30.8167];
const DEFAULT_ZOOM = 12;
const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '8FutMwkM2PmTepBqT3d4';
const MAP_STYLE_URL = `https://api.maptiler.com/maps/openstreetmap/style.json?key=${MAPTILER_API_KEY}`;

maptilersdk.config.apiKey = MAPTILER_API_KEY;

const getFeatureLabel = (feature: GeocodingFeature): string => {
  return feature.place_name_en || feature.place_name || feature.text_en || feature.text || '';
};

const reverseGeocode = async (lng: number, lat: number): Promise<string | null> => {
  const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_API_KEY}&language=en&limit=1`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { features?: GeocodingFeature[] };
  const firstFeature = data.features?.[0];
  if (!firstFeature) {
    return null;
  }

  return getFeatureLabel(firstFeature) || null;
};

export const LocationMapPicker = ({
  label,
  value,
  onChange,
  placeholder,
  error,
}: LocationMapPickerProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markerRef = useRef<maptilersdk.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  const [searchText, setSearchText] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodingFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionListOpen, setIsSuggestionListOpen] = useState(false);

  const trimmedSearchText = useMemo(() => searchText.trim(), [searchText]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setSearchText(value);
  }, [value]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maptilersdk.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    const marker = new maptilersdk.Marker({ color: '#2563eb' })
      .setLngLat(DEFAULT_CENTER)
      .addTo(map);

    map.on('click', async (event) => {
      const lng = event.lngLat.lng;
      const lat = event.lngLat.lat;
      marker.setLngLat([lng, lat]);
      map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14) });

      try {
        const englishAddress = await reverseGeocode(lng, lat);
        if (englishAddress) {
          setSearchText(englishAddress);
          onChangeRef.current(englishAddress);
          setSuggestions([]);
          setIsSuggestionListOpen(false);
        }
      } catch {
      }
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (trimmedSearchText.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const encoded = encodeURIComponent(trimmedSearchText);
        const url = `https://api.maptiler.com/geocoding/${encoded}.json?key=${MAPTILER_API_KEY}&language=en&limit=6&autocomplete=true`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const data = (await response.json()) as { features?: GeocodingFeature[] };
        setSuggestions(data.features ?? []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [trimmedSearchText]);

  const handleSelectSuggestion = (feature: GeocodingFeature) => {
    const selectedLabel = getFeatureLabel(feature);
    const [lng, lat] = feature.center;

    setSearchText(selectedLabel);
    onChangeRef.current(selectedLabel);
    setSuggestions([]);
    setIsSuggestionListOpen(false);

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    }

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: Math.max(mapRef.current.getZoom(), 14) });
    }
  };

  return (
    <div>
      <Label className="text-foreground">{label}</Label>
      <div className="relative mt-1">
        <Input
          type="text"
          value={searchText}
          required
          placeholder={placeholder}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSearchText(nextValue);
            onChangeRef.current(nextValue);
            setIsSuggestionListOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsSuggestionListOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setIsSuggestionListOpen(false), 120);
          }}
        />

        {isSuggestionListOpen && (isSearching || suggestions.length > 0) && (
          <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
            {isSearching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching places...</p>}
            {!isSearching && suggestions.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No suggestions found</p>
            )}
            {!isSearching &&
              suggestions.map((feature) => {
                const labelText = getFeatureLabel(feature);
                return (
                  <button
                    key={feature.id}
                    type="button"
                    className="w-full border-b border-border px-3 py-2 text-left text-sm text-foreground last:border-b-0 hover:bg-accent"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelectSuggestion(feature);
                    }}
                  >
                    {labelText}
                  </button>
                );
              })}
          </div>
        )}
      </div>

      <div className="mt-3 h-56 overflow-hidden rounded-md border border-border">
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
};
