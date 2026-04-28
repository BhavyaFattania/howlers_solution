"use client";
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON, Marker } from "react-leaflet";
import L from "leaflet";
import type { Need } from "@/lib/types";
import { URGENCY_COLOR } from "@/lib/utils";

// Avoid default-marker icon resolution issues
const homeIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:9999px;background:#1a73e8;border:2px solid #fff;box-shadow:0 0 0 1px #1a73e8"></div>`,
});

export function MissionMap({
  needs,
  center = [23.03, 72.59],
  zoom = 11,
  crisisGeo,
  onPinClick,
  homes,
}: {
  needs: Pick<Need, "id" | "title" | "urgency" | "geo_lat" | "geo_lng" | "state">[];
  center?: [number, number];
  zoom?: number;
  crisisGeo?: GeoJSON.GeoJsonObject | null;
  onPinClick?: (id: string) => void;
  homes?: { id: string; lat: number; lng: number; name: string }[];
}) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {crisisGeo && (
        <GeoJSON
          data={crisisGeo}
          style={{ color: "#dc2626", weight: 2, fillColor: "#dc2626", fillOpacity: 0.15 }}
        />
      )}
      {homes?.map((h) => (
        <Marker key={`h-${h.id}`} position={[h.lat, h.lng]} icon={homeIcon}>
          <Tooltip>{h.name}</Tooltip>
        </Marker>
      ))}
      {needs.map((n) =>
        n.geo_lat != null && n.geo_lng != null ? (
          <CircleMarker
            key={n.id}
            center={[n.geo_lat, n.geo_lng]}
            radius={9}
            pathOptions={{
              color: URGENCY_COLOR[n.urgency] ?? "#64748b",
              weight: 2,
              fillColor: URGENCY_COLOR[n.urgency] ?? "#94a3b8",
              fillOpacity: 0.7,
            }}
            eventHandlers={{ click: () => onPinClick?.(n.id) }}
          >
            <Tooltip direction="top">
              <div className="text-xs">
                <div className="font-semibold">{n.title}</div>
                <div className="capitalize">{n.urgency} · {n.state}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ) : null
      )}
    </MapContainer>
  );
}
