import { useAuth } from "@/_core/hooks/useAuth";
import AppLogo from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const parsePropertyDescription = (description: string) => {
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
};

export default function Properties() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    city: "",
    propertyType: "" as "" | "apartment" | "house" | "condo" | "townhouse" | "studio",
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    bedrooms: undefined as number | undefined,
    isAvailable: true,
  });
  const [unitTypeFilter, setUnitTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "price_asc" | "price_desc">("relevance");

  const { data: properties, isLoading } = trpc.properties.search.useQuery({
    ...filters,
    propertyType: filters.propertyType || undefined,
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const processedProperties = (properties ?? [])
    .filter((property: any) => {
      if (!unitTypeFilter.trim()) return true;
      const parsed = parsePropertyDescription(property.description ?? "");
      return parsed.unitType.toLowerCase().includes(unitTypeFilter.trim().toLowerCase());
    })
    .sort((a: any, b: any) => {
      if (sortBy === "price_asc") return Number(a.pricePerNight) - Number(b.pricePerNight);
      if (sortBy === "price_desc") return Number(b.pricePerNight) - Number(a.pricePerNight);
      return 0;
    });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/30">
        <div className="container flex items-center justify-between py-6">
          <Link href="/">
            <div className="flex cursor-pointer items-center gap-2">
              <AppLogo compact markClassName="h-9 w-9" />
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost">Back to Home</Button>
            </Link>
            {(user?.role === "landlord" || user?.role === "admin") && (
              <Link href="/properties/new">
                <Button>List Property</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mb-12">
            <h1 className="mb-4 text-serif-display text-6xl font-bold md:text-7xl">Explore Properties</h1>
            <div className="h-0.5 w-12 bg-accent" />
          </div>

          <div className="mb-12 space-y-6 rounded-sm border border-border/50 bg-card p-6 text-card-foreground md:p-8">
            <h3 className="text-serif text-2xl font-light">Refine Your Search</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">City</label>
                <Input
                  placeholder="Enter city"
                  value={filters.city}
                  onChange={e => handleFilterChange("city", e.target.value)}
                  className="border-border bg-input"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Min Price</label>
                <Input
                  type="number"
                  placeholder="Min price"
                  value={filters.minPrice || ""}
                  onChange={e => handleFilterChange("minPrice", e.target.value ? Number(e.target.value) : undefined)}
                  className="border-border bg-input"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Max Price</label>
                <Input
                  type="number"
                  placeholder="Max price"
                  value={filters.maxPrice || ""}
                  onChange={e => handleFilterChange("maxPrice", e.target.value ? Number(e.target.value) : undefined)}
                  className="border-border bg-input"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Category</label>
                <select
                  value={filters.propertyType}
                  onChange={e => handleFilterChange("propertyType", e.target.value)}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-input px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                >
                  <option value="">All categories</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="studio">Studio</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Unit Type</label>
                <Input
                  placeholder="e.g. self contain"
                  value={unitTypeFilter}
                  onChange={e => setUnitTypeFilter(e.target.value)}
                  className="border-border bg-input"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bedrooms</label>
                <Input
                  type="number"
                  placeholder="Number of bedrooms"
                  value={filters.bedrooms || ""}
                  onChange={e => handleFilterChange("bedrooms", e.target.value ? Number(e.target.value) : undefined)}
                  className="border-border bg-input"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sort</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-input px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-accent" size={32} />
            </div>
          ) : processedProperties.length > 0 ? (
            <div className="space-y-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {processedProperties.length} Properties Found
              </p>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {processedProperties.map((property: any) => {
                  const parsed = parsePropertyDescription(property.description ?? "");
                  return (
                    <Link key={property.id} href={`/property/${property.id}`}>
                      <div className="flex h-full cursor-pointer flex-col space-y-4 rounded-sm border border-border/50 bg-card p-6 text-card-foreground transition-shadow hover:shadow-sm md:p-8">
                        <div className="flex aspect-video items-center justify-center rounded-sm bg-muted">
                          {property.images && property.images.length > 0 ? (
                            <img
                              src={property.images[0].url}
                              alt={property.title}
                              className="h-full w-full rounded-sm object-cover"
                            />
                          ) : (
                            <div className="text-4xl">Home</div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <h3 className="text-serif text-xl font-light">{property.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {property.city}, {property.state}
                          </p>
                          {property.propertyType && (
                            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                              {property.propertyType}
                            </p>
                          )}
                          {parsed.unitType && (
                            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                              {parsed.unitType}
                            </p>
                          )}
                          <p className="line-clamp-2 text-sm text-muted-foreground">{parsed.cleanDescription}</p>
                          {parsed.additionalNotes && (
                            <p className="line-clamp-1 text-xs text-muted-foreground/90">
                              Note: {parsed.additionalNotes}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Lease: {property.minLeaseMonths ?? 1}-{property.maxLeaseMonths ?? 12} months
                          </p>
                        </div>

                        <div className="space-y-3 border-t border-border/30 pt-4">
                          <div className="flex items-center justify-between">
                            <span className="editorial-label">
                              {property.bedrooms} Bed - {property.bathrooms} Bath
                            </span>
                            <span className="text-serif text-lg font-semibold">${property.pricePerNight}/month</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-12 text-center">
              <p className="text-lg text-muted-foreground">No properties found matching your criteria.</p>
              <Button
                onClick={() => {
                  setFilters({
                    city: "",
                    propertyType: "",
                    minPrice: undefined,
                    maxPrice: undefined,
                    bedrooms: undefined,
                    isAvailable: true,
                  });
                  setUnitTypeFilter("");
                  setSortBy("relevance");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
