import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bath, BedDouble, MapPin, Users } from "lucide-react";
import { Link } from "wouter";

function parsePropertyDescription(description: string) {
  const unitTypeMatch = description.match(/Unit Type:\s*(.+)/i);
  const notesMatch = description.match(/Additional Notes:\s*(.+)/i);
  const cleanDescription = description
    .replace(/Unit Type:\s*.+/gi, "")
    .replace(/Additional Notes:\s*.+/gi, "")
    .trim();

  return {
    cleanDescription,
    unitType: unitTypeMatch?.[1]?.trim() ?? "",
    additionalNotes: notesMatch?.[1]?.trim() ?? "",
  };
}

export default function PropertyDetail(props: any) {
  const idParam = props?.params?.id;
  const propertyId = Number(idParam);
  const isValidId = Number.isFinite(propertyId) && propertyId > 0;

  const { data: property, isLoading } = trpc.properties.getById.useQuery(propertyId, {
    enabled: isValidId,
  });

  if (!isValidId) {
    return <div className="p-8 text-center text-muted-foreground">Invalid property id.</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading property details...</div>;
  }

  if (!property) {
    return <div className="p-8 text-center text-muted-foreground">Property not found.</div>;
  }

  const parsed = parsePropertyDescription(property.description ?? "");
  const images = Array.isArray(property.images) ? property.images : [];
  const leadImage = images[0]?.url;
  const minLeaseMonths = Number(property.minLeaseMonths ?? 1);
  const maxLeaseMonths = Number(property.maxLeaseMonths ?? 12);
  const monthlyPrice = Number(property.pricePerNight ?? 0);
  const minTotal = monthlyPrice * minLeaseMonths;
  const maxTotal = monthlyPrice * maxLeaseMonths;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-6xl">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/properties">
            <Button variant="outline">Back to Properties</Button>
          </Link>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {property.propertyType}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <Card className="overflow-hidden rounded-2xl border-border/60 p-0">
            <div className="h-[430px] bg-muted">
              {leadImage ? (
                <img src={leadImage} alt={property.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No property image
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-2xl border-border/60 p-5">
            <h1 className="text-3xl font-semibold">{property.title}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{property.address}, {property.city}, {property.state}</span>
            </div>
            {parsed.unitType && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent">{parsed.unitType}</p>
            )}

            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-border p-3">
                <div className="mb-1 flex items-center gap-1"><BedDouble className="h-4 w-4" /> Bedrooms</div>
                <p className="font-semibold">{property.bedrooms}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="mb-1 flex items-center gap-1"><Bath className="h-4 w-4" /> Bathrooms</div>
                <p className="font-semibold">{property.bathrooms}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="mb-1 flex items-center gap-1"><Users className="h-4 w-4" /> Guests</div>
                <p className="font-semibold">{property.maxGuests}</p>
              </div>
            </div>

            <p className="mt-5 text-2xl font-semibold">${property.pricePerNight}/month</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lease term: {minLeaseMonths} - {maxLeaseMonths} months
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Total range: ${minTotal.toLocaleString()} - ${maxTotal.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Zip code: {property.zipCode}</p>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="rounded-2xl border-border/60 p-5">
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{parsed.cleanDescription}</p>
            {parsed.additionalNotes && (
              <>
                <h3 className="mt-6 text-lg font-semibold">Additional Notes</h3>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{parsed.additionalNotes}</p>
              </>
            )}
          </Card>

          <Card className="rounded-2xl border-border/60 p-5">
            <h2 className="text-xl font-semibold">Amenities</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.isArray(property.amenities) && property.amenities.length > 0 ? (
                property.amenities.map((amenity: string) => (
                  <span key={amenity} className="rounded-full border border-border px-3 py-1 text-xs">
                    {amenity}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No amenities listed.</p>
              )}
            </div>

            {images.length > 1 && (
              <>
                <h3 className="mt-6 text-lg font-semibold">More Images</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {images.slice(1, 5).map((img: any, idx: number) => (
                    <img
                      key={`${img.url}-${idx}`}
                      src={img.url}
                      alt={img.caption || `Property image ${idx + 2}`}
                      className="h-28 w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
