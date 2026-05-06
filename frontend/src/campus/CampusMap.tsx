import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import type { BuildingListDto, MarkerDto } from "../api/CampusApiService.js";

const CENTER: [number, number] = [59.8774, 30.2193];

function markerColor(category: string): string {
  switch (category) {
    case "FOOD":
      return "#ea580c";
    case "QUIET":
      return "#0d9488";
    case "STUDY":
      return "#2563eb";
    case "RELAX":
      return "#7c3aed";
    default:
      return "#64748b";
  }
}

type Props = {
  buildings: BuildingListDto[];
  markers: MarkerDto[];
};

export function CampusMap({ buildings, markers }: Props) {
  const pinned = buildings.filter((b) => b.lat != null && b.lng != null);

  return (
    <div className="campus-map">
      <MapContainer center={CENTER} zoom={16} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {pinned.map((b) => (
          <CircleMarker
            key={b.id}
            center={[b.lat!, b.lng!]}
            radius={9}
            pathOptions={{ color: "#1d4ed8", fillColor: "#93c5fd", fillOpacity: 0.95, weight: 2 }}
          >
            <Popup>
              <strong>{b.name}</strong>
              <br />
              <Link to={`/campus/${b.slug}`}>Этажи</Link>
            </Popup>
          </CircleMarker>
        ))}
        {markers.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={7}
            pathOptions={{
              color: markerColor(m.category),
              fillColor: markerColor(m.category),
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{m.title}</strong>
              <div className="muted" style={{ fontSize: "0.8rem" }}>
                {m.category}
              </div>
              {m.description ? <div style={{ marginTop: 6 }}>{m.description}</div> : null}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
