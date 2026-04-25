import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ActivityMapProps {
  records: any[];
}

export default function ActivityMap({ records }: ActivityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const gpsPoints = records.filter((r) => r.lat != null && r.lng != null);

  useEffect(() => {
    if (!mapRef.current || gpsPoints.length < 2) return;

    // Destruir mapa anterior se existir
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const coords: [number, number][] = gpsPoints.map((r) => [r.lat, r.lng]);

    const map = L.map(mapRef.current, { zoomControl: true });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    // Polyline do percurso
    const polyline = L.polyline(coords, {
      color: "#1D9E75",
      weight: 3,
      opacity: 0.8,
    }).addTo(map);

    // Marcador de início — círculo verde
    L.circleMarker(coords[0], {
      radius: 8,
      fillColor: "#1D9E75",
      color: "#fff",
      weight: 2,
      fillOpacity: 1,
    })
      .bindPopup("Início")
      .addTo(map);

    // Marcador de fim — círculo vermelho
    L.circleMarker(coords[coords.length - 1], {
      radius: 8,
      fillColor: "#E24B4A",
      color: "#fff",
      weight: 2,
      fillOpacity: 1,
    })
      .bindPopup("Fim")
      .addTo(map);

    // Colorir polyline por FC se disponível
    const withHr = gpsPoints.filter((r) => r.heart_rate != null);
    if (withHr.length > 10) {
      // Remover polyline simples e substituir por segmentos coloridos por FC
      map.removeLayer(polyline);
      const maxHr = Math.max(...withHr.map((r) => r.heart_rate));
      const minHr = Math.min(...withHr.map((r) => r.heart_rate));

      for (let i = 0; i < gpsPoints.length - 1; i++) {
        const r = gpsPoints[i];
        if (!r.heart_rate) continue;
        const ratio = (r.heart_rate - minHr) / (maxHr - minHr || 1);
        // Gradiente: azul (baixo) → verde → amarelo → vermelho (alto)
        const color =
          ratio < 0.33
            ? "#378ADD"
            : ratio < 0.66
            ? "#1D9E75"
            : ratio < 0.85
            ? "#EF9F27"
            : "#E24B4A";

        L.polyline(
          [
            [gpsPoints[i].lat, gpsPoints[i].lng],
            [gpsPoints[i + 1].lat, gpsPoints[i + 1].lng],
          ],
          { color, weight: 4, opacity: 0.85 }
        ).addTo(map);
      }
    }

    // Ajustar zoom para mostrar todo o percurso
    map.fitBounds(
      polyline.getBounds().isValid()
        ? polyline.getBounds()
        : L.latLngBounds(coords)
    );

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [gpsPoints.length]);

  if (gpsPoints.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg bg-muted/30 border border-dashed">
        <p className="text-sm text-muted-foreground">
          Dados de GPS não disponíveis para esta atividade
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        style={{ height: "320px", borderRadius: "12px", overflow: "hidden" }}
      />
      {/* Legenda de FC */}
      {gpsPoints.some((r) => r.heart_rate) && (
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Frequência cardíaca:</span>
          <div className="flex items-center gap-1">
            <div
              className="h-2 w-8 rounded"
              style={{
                background:
                  "linear-gradient(to right, #378ADD, #1D9E75, #EF9F27, #E24B4A)",
              }}
            />
          </div>
          <span>Baixa → Alta</span>
        </div>
      )}
    </div>
  );
}
