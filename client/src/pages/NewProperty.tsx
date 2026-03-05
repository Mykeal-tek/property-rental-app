import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  BedDouble,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  ScrollText,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

type PropertyType = "apartment" | "house" | "condo" | "townhouse" | "studio";

type ImageInput = {
  url: string;
  caption: string;
};

type UnitTypeOption = (typeof unitTypeOptions)[number];

type NewPropertyFormState = {
  title: string;
  propertyType: PropertyType;
  unitType: UnitTypeOption;
  customUnitType: string;
  description: string;
  additionalNotes: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  pricePerNight: string;
  minLeaseMonths: string;
  maxLeaseMonths: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  maxGuests: string;
  amenities: string;
};

const unitTypeOptions = [
  "1 Bedroom Apartment",
  "2 Bedroom Apartment",
  "3 Bedroom Apartment",
  "1 Bedroom Self Contain",
  "2 Bedroom House",
  "3 Bedroom House",
  "4 Bedroom House",
  "Chamber and Hall",
  "Single Room",
  "Other",
] as const;

const leaseMonthOptions = Array.from({ length: 24 }, (_, i) => String(i + 1));

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-xl border border-border/60 bg-background/70 p-2">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div>
        <h2 className="text-xl font-semibold leading-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export default function NewProperty() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const createMutation = trpc.properties.create.useMutation();

  const [form, setForm] = useState<NewPropertyFormState>({
    title: "",
    propertyType: "apartment" as PropertyType,
    unitType: unitTypeOptions[0],
    customUnitType: "",
    description: "",
    additionalNotes: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    latitude: "",
    longitude: "",
    pricePerNight: "",
    minLeaseMonths: "1",
    maxLeaseMonths: "12",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    maxGuests: "",
    amenities: "",
  });
  const [images, setImages] = useState<ImageInput[]>([{ url: "", caption: "" }]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "landlord" && user.role !== "admin") {
      setLocation("/dashboard/tenant");
    }
  }, [loading, setLocation, user]);

  const canSubmit = useMemo(() => {
    const resolvedUnitType =
      form.unitType === "Other" ? form.customUnitType.trim() : form.unitType.trim();
    const pricePerMonth = Number(form.pricePerNight);
    const minLeaseMonths = Number(form.minLeaseMonths);
    const maxLeaseMonths = Number(form.maxLeaseMonths);
    return Boolean(
      !createMutation.isPending &&
        form.title.trim() &&
        resolvedUnitType &&
        form.description.trim() &&
        Number.isFinite(pricePerMonth) &&
        pricePerMonth > 0 &&
        Number.isInteger(minLeaseMonths) &&
        minLeaseMonths > 0 &&
        Number.isInteger(maxLeaseMonths) &&
        maxLeaseMonths >= minLeaseMonths
    );
  }, [
    createMutation.isPending,
    form.customUnitType,
    form.description,
    form.maxLeaseMonths,
    form.minLeaseMonths,
    form.pricePerNight,
    form.title,
    form.unitType,
  ]);

  const validImages = useMemo(() => images.filter(img => img.url.trim().length > 0), [images]);
  const monthlyPrice = Number(form.pricePerNight) || 0;
  const minMonths = Number(form.minLeaseMonths) || 0;
  const maxMonths = Number(form.maxLeaseMonths) || 0;
  const minTotal = monthlyPrice * minMonths;
  const maxTotal = monthlyPrice * maxMonths;

  const updateField = (key: keyof NewPropertyFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateImage = (index: number, key: keyof ImageInput, value: string) => {
    setImages(prev => prev.map((img, i) => (i === index ? { ...img, [key]: value } : img)));
  };

  const addImageField = () => setImages(prev => [...prev, { url: "", caption: "" }]);
  const removeImageField = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));
  const handleLocalImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const encoded = await Promise.all(
      fileArray.map(
        file =>
          new Promise<ImageInput>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") {
                resolve({ url: reader.result, caption: file.name });
              } else {
                reject(new Error("Unable to read image"));
              }
            };
            reader.onerror = () => reject(reader.error ?? new Error("Unable to read image"));
            reader.readAsDataURL(file);
          })
      )
    );
    setImages(prev => [...prev, ...encoded]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const pricePerNight = Number(form.pricePerNight);
      const bedrooms = Number(form.bedrooms);
      const bathrooms = Number(form.bathrooms);
      const maxGuests = Number(form.maxGuests);
      const minLeaseMonths = Number(form.minLeaseMonths);
      const maxLeaseMonths = Number(form.maxLeaseMonths);
      const squareFeet = form.squareFeet ? Number(form.squareFeet) : undefined;
      const latitude = form.latitude ? Number(form.latitude) : undefined;
      const longitude = form.longitude ? Number(form.longitude) : undefined;

      if (!Number.isFinite(pricePerNight) || pricePerNight <= 0) {
        setError("Price per month must be a positive number.");
        return;
      }
      if (!Number.isInteger(minLeaseMonths) || minLeaseMonths <= 0) {
        setError("Minimum lease months must be a positive whole number.");
        return;
      }
      if (!Number.isInteger(maxLeaseMonths) || maxLeaseMonths <= 0) {
        setError("Maximum lease months must be a positive whole number.");
        return;
      }
      if (minLeaseMonths > maxLeaseMonths) {
        setError("Minimum lease months cannot be greater than maximum lease months.");
        return;
      }
      if (!Number.isInteger(bedrooms) || bedrooms <= 0) {
        setError("Bedrooms must be a positive whole number.");
        return;
      }
      if (!Number.isFinite(bathrooms) || bathrooms <= 0) {
        setError("Bathrooms must be a positive number.");
        return;
      }
      if (!Number.isInteger(maxGuests) || maxGuests <= 0) {
        setError("Max guests must be a positive whole number.");
        return;
      }

      const parsedImages = validImages.map(img => ({
        url: img.url.trim(),
        caption: img.caption.trim() || undefined,
      }));

      const resolvedUnitType =
        form.unitType === "Other" ? form.customUnitType.trim() : form.unitType.trim();
      if (!resolvedUnitType) {
        setError("Please select or type a unit type.");
        return;
      }

      const amenities = form.amenities
        .split(",")
        .map(v => v.trim())
        .filter(Boolean);

      const compiledDescription = [
        form.description.trim(),
        `Unit Type: ${resolvedUnitType}`,
        form.additionalNotes.trim() ? `Additional Notes: ${form.additionalNotes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      await createMutation.mutateAsync({
        title: form.title.trim(),
        propertyType: form.propertyType,
        description: compiledDescription,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim(),
        latitude,
        longitude,
        pricePerNight,
        minLeaseMonths,
        maxLeaseMonths,
        bedrooms,
        bathrooms,
        squareFeet,
        amenities: amenities.length ? amenities : undefined,
        images: parsedImages.length ? parsedImages : undefined,
        maxGuests,
      });

      setSuccess("Property listed successfully.");
      setTimeout(() => {
        setLocation("/dashboard/landlord");
      }, 700);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || "Failed to list property";
      setError(message);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_500px_at_3%_-15%,rgba(229,57,53,0.1),transparent),radial-gradient(900px_400px_at_98%_0%,rgba(251,146,60,0.08),transparent)] py-8">
      <div className="container max-w-7xl">
        <Card className="mb-6 overflow-hidden rounded-2xl border-border/70 bg-card/85 p-0">
          <div className="grid gap-0 md:grid-cols-[1fr_auto]">
            <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.6),rgba(255,245,239,0.8))] p-6 md:p-8">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Landlord Workspace
              </p>
              <h1 className="text-serif-display text-5xl font-semibold leading-none md:text-6xl">List New Property</h1>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
                Publish apartments, full houses, and custom unit types with photos, precise location, and tenant-facing notes.
              </p>
            </div>
            <div className="flex items-center border-t border-border/60 p-6 md:border-l md:border-t-0">
              <Button variant="outline" onClick={() => setLocation("/dashboard/landlord")}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Card>

        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="rounded-2xl border-border/70 bg-card/90 p-6">
              <SectionHeader
                icon={ScrollText}
                title="Core Listing"
                subtitle="Define what this property is and how tenants should understand it."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Property Title</Label>
                  <Input id="title" value={form.title} onChange={e => updateField("title", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="propertyType">Category</Label>
                  <select
                    id="propertyType"
                    value={form.propertyType}
                    onChange={e => updateField("propertyType", e.target.value as PropertyType)}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House (Full House)</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="studio">Studio / Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="unitType">Unit Type (Tenant-visible)</Label>
                  <select
                    id="unitType"
                    value={form.unitType}
                    onChange={e => updateField("unitType", e.target.value)}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                  >
                    {unitTypeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                {form.unitType === "Other" && (
                  <div>
                    <Label htmlFor="customUnitType">Custom Unit Type</Label>
                    <Input
                      id="customUnitType"
                      placeholder="e.g. 5 bedroom villa, executive suite"
                      value={form.customUnitType}
                      onChange={e => updateField("customUnitType", e.target.value)}
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the property and key highlights."
                    value={form.description}
                    onChange={e => updateField("description", e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="additionalNotes">Additional Notes (Tenant-visible)</Label>
                  <Textarea
                    id="additionalNotes"
                    placeholder="Any extra rules, preferences, parking info, etc."
                    value={form.additionalNotes}
                    onChange={e => updateField("additionalNotes", e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border-border/70 bg-card/90 p-6">
              <SectionHeader
                icon={MapPin}
                title="Location"
                subtitle="Set where the property is located so tenants can discover it correctly."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={form.address} onChange={e => updateField("address", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={e => updateField("city", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="state">State / Region</Label>
                  <Input id="state" value={form.state} onChange={e => updateField("state", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="zipCode">Zip / Postal Code</Label>
                  <Input id="zipCode" value={form.zipCode} onChange={e => updateField("zipCode", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitude (optional)</Label>
                    <Input id="latitude" value={form.latitude} onChange={e => updateField("latitude", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude (optional)</Label>
                    <Input id="longitude" value={form.longitude} onChange={e => updateField("longitude", e.target.value)} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border-border/70 bg-card/90 p-6">
              <SectionHeader
                icon={Wallet}
                title="Pricing & Capacity"
                subtitle="Set monthly rent, lease term range, and occupancy limits."
              />
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="pricePerNight">Price Per Month</Label>
                  <Input id="pricePerNight" type="number" value={form.pricePerNight} onChange={e => updateField("pricePerNight", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="minLeaseMonths">Minimum Lease (Months)</Label>
                  <select
                    id="minLeaseMonths"
                    value={form.minLeaseMonths}
                    onChange={e => updateField("minLeaseMonths", e.target.value)}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                  >
                    {leaseMonthOptions.map(month => (
                      <option key={`min-${month}`} value={month}>
                        {month} month{month === "1" ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="maxLeaseMonths">Maximum Lease (Months)</Label>
                  <select
                    id="maxLeaseMonths"
                    value={form.maxLeaseMonths}
                    onChange={e => updateField("maxLeaseMonths", e.target.value)}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                  >
                    {leaseMonthOptions.map(month => (
                      <option key={`max-${month}`} value={month}>
                        {month} month{month === "1" ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input id="bedrooms" type="number" value={form.bedrooms} onChange={e => updateField("bedrooms", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input id="bathrooms" type="number" step="0.5" value={form.bathrooms} onChange={e => updateField("bathrooms", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="squareFeet">Square Feet (optional)</Label>
                  <Input id="squareFeet" type="number" value={form.squareFeet} onChange={e => updateField("squareFeet", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="maxGuests">Max Guests</Label>
                  <Input id="maxGuests" type="number" value={form.maxGuests} onChange={e => updateField("maxGuests", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="amenities">Amenities (comma separated)</Label>
                  <Input id="amenities" placeholder="WiFi, Parking, AC" value={form.amenities} onChange={e => updateField("amenities", e.target.value)} />
                </div>
                <div className="rounded-xl border border-border/70 bg-background/70 p-3 md:col-span-3">
                  <p className="text-sm font-medium">
                    Lease total range: ${minTotal.toLocaleString()} - ${maxTotal.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Calculated as monthly rent multiplied by minimum and maximum lease months.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border-border/70 bg-card/90 p-6">
              <SectionHeader
                icon={ImagePlus}
                title="Images"
                subtitle="Attach as many image URLs as needed. The first image appears as the cover."
              />
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{validImages.length} valid image(s)</p>
                <div className="flex gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent/5">
                    <ImagePlus className="h-4 w-4" />
                    Upload Images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => handleLocalImageFiles(e.target.files)}
                    />
                  </label>
                  <Button type="button" variant="outline" onClick={addImageField} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add URL
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {images.map((img, index) => (
                  <div key={index} className="grid gap-3 rounded-xl border border-border/60 bg-background/70 p-3 md:grid-cols-[1fr_220px_auto]">
                    <Input placeholder="Image URL" value={img.url} onChange={e => updateImage(index, "url", e.target.value)} />
                    <Input placeholder="Caption (optional)" value={img.caption} onChange={e => updateImage(index, "caption", e.target.value)} />
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={images.length === 1}
                      onClick={() => removeImageField(index)}
                      className="gap-1"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
            <Card className="rounded-2xl border-border/70 bg-card/95 p-5">
              <div className="mb-3 flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-accent" />
                <h3 className="text-lg font-semibold">Live Preview</h3>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-muted">
                {validImages[0]?.url ? (
                  <img
                    src={validImages[0].url}
                    alt="Listing preview"
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                    Cover image preview
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <p className="line-clamp-1 text-lg font-semibold">{form.title || "Untitled Property"}</p>
                <p className="line-clamp-1 text-sm text-muted-foreground">{form.city || "City"}, {form.state || "Region"}</p>
                {(form.unitType || form.customUnitType) && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {form.unitType === "Other" ? form.customUnitType || "Custom unit type" : form.unitType}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {form.bedrooms || "0"} bed - {form.bathrooms || "0"} bath - {form.maxGuests || "0"} guests
                </p>
                <p className="text-sm font-medium">
                  ${form.pricePerNight || "0"} / month
                </p>
                <p className="text-xs text-muted-foreground">
                  Lease: {form.minLeaseMonths} - {form.maxLeaseMonths} months
                </p>
                <p className="text-xs font-medium text-foreground/80">
                  Total range: ${minTotal.toLocaleString()} - ${maxTotal.toLocaleString()}
                </p>
              </div>
            </Card>

            {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            {success && <div className="rounded-md border border-green-400/40 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

            <Card className="rounded-2xl border-border/70 bg-card/95 p-5">
              <p className="text-sm text-muted-foreground">
                Tenants will see your custom unit type and additional notes directly in property cards.
              </p>
              <Button type="submit" disabled={!canSubmit} className="mt-4 w-full">
                {createMutation.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </span>
                ) : (
                  "Publish Property"
                )}
              </Button>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
