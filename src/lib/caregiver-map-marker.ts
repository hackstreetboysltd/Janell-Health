/** Escape text for Leaflet divIcon HTML. */
export function escapeMarkerHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function caregiverMapMarkerIcon(
  fullName: string,
  phone: string,
  selected: boolean,
) {
  const name = escapeMarkerHtml(fullName);
  const tel = escapeMarkerHtml(phone || "—");
  const border = selected ? "#2F5D4A" : "rgba(20,32,26,0.12)";
  const shadow = selected
    ? "0 4px 14px rgba(47,93,74,0.28)"
    : "0 2px 8px rgba(20,32,26,0.12)";

  return {
    className: "caregiver-map-marker-icon",
    html: `
      <div class="caregiver-map-marker">
        <div class="caregiver-map-marker-pin" aria-hidden="true"></div>
        <div class="caregiver-map-marker-card" style="border-color:${border};box-shadow:${shadow}">
          <span class="caregiver-map-marker-name">${name}</span>
          <span class="caregiver-map-marker-phone">${tel}</span>
        </div>
      </div>
    `,
    iconSize: [168, 44] as [number, number],
    iconAnchor: [10, 44] as [number, number],
  };
}
