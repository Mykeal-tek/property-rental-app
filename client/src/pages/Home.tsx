import { useAuth } from "@/_core/hooks/useAuth";
import AppLogo from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bath, BedDouble, MapPin, Sparkles, Star } from "lucide-react";
import { Link } from "wouter";

const images = {
  hero:
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=80",
  sideOne:
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?auto=format&fit=crop&w=1000&q=80",
  sideTwo:
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80",
  cardOne:
    "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=1200&q=80",
  cardTwo:
    "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1200&q=80",
  cardThree:
    "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1200&q=80",
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen p-3 md:p-5">
        <div className="min-h-[calc(100vh-1.5rem)] rounded-[2rem] border border-border/70 bg-card p-3 shadow-[0_30px_80px_rgba(0,0,0,0.16)] md:min-h-[calc(100vh-2.5rem)] md:p-5">
          <header className="mb-4 flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3 backdrop-blur md:px-6">
            <AppLogo markClassName="h-10 w-10" textClassName="hidden sm:block" />

            <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
              <Link href="/properties">Properties</Link>
              <Link href="/dashboard">Dashboard</Link>
              <a href="#featured">Featured</a>
            </nav>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <Button size="sm" variant="outline">Dashboard</Button>
                </Link>
                <span className="text-sm font-medium text-muted-foreground">{user?.name}</span>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm">Sign In</Button>
              </Link>
            )}
          </header>

          <section className="grid gap-4 md:grid-cols-[1.55fr_0.8fr]">
            <div className="group relative min-h-[calc(100vh-180px)] overflow-hidden rounded-3xl">
              <img
                src={images.hero}
                alt="Modern luxury home exterior"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
              <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-background/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Premium Rentals
              </div>
              <div className="absolute bottom-7 left-6 right-6 text-white md:left-8 md:right-8">
                <h1 className="max-w-3xl text-serif-display text-5xl font-bold leading-[0.98] md:text-7xl">
                  Find a place you will call home
                </h1>
                <p className="mt-3 max-w-xl text-sm text-white/85 md:text-base">
                  Discover refined apartments and houses with transparent pricing, verified hosts, and instant booking confidence.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/properties">
                    <Button className="bg-white text-black hover:bg-white/90">Browse Properties</Button>
                  </Link>
                  {!isAuthenticated && (
                    <Link href="/login">
                      <Button variant="outline" className="border-white/70 bg-transparent text-white hover:bg-white/10">
                        List Your Property
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="overflow-hidden rounded-3xl border-border/70 p-0">
                <img src={images.sideOne} alt="Living room interior" className="h-44 w-full object-cover" />
                <div className="space-y-2 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Featured Listing</p>
                  <p className="text-lg font-semibold">Azure Villa</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>East Legon, Accra</span>
                    <span className="font-semibold text-foreground">$270/month</span>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden rounded-3xl border-border/70 p-0">
                <img src={images.sideTwo} alt="Modern house with pool" className="h-44 w-full object-cover" />
                <div className="space-y-2 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Trusted Host</p>
                  <p className="text-lg font-semibold">4.9 Average Rating</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-current text-amber-500" />
                    <span>Verified by 1200+ tenant reviews</span>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          <section id="featured" className="mt-10">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Explore Collection</p>
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Homes Worth Viewing</h2>
              </div>
              <Link href="/properties">
                <Button variant="outline">View all</Button>
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: "Presidential Towers", city: "Airport Hills", price: "$185/month", beds: "2", baths: "2", image: images.cardOne },
                { title: "Marble Residency", city: "Cantonments", price: "$240/month", beds: "3", baths: "3", image: images.cardTwo },
                { title: "Skyline Nest", city: "East Legon", price: "$130/month", beds: "1", baths: "1", image: images.cardThree },
              ].map(card => (
                <Card key={card.title} className="group overflow-hidden rounded-2xl border-border/70 p-0">
                  <div className="overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{card.title}</h3>
                      <span className="text-sm font-semibold">{card.price}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{card.city}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" />{card.beds} Beds</span>
                      <span className="inline-flex items-center gap-1"><Bath className="h-4 w-4" />{card.baths} Baths</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
