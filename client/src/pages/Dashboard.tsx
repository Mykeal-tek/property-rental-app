import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  Bell,
  Building2,
  CalendarCheck2,
  ClipboardList,
  Clock3,
  Heart,
  Home,
  LogOut,
  MessageSquareWarning,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type DashboardRole = "landlord" | "tenant";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/90 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
        <div className="rounded-xl border border-border/60 bg-background/70 p-2">
          <Icon className="h-4 w-4 text-accent" />
        </div>
      </div>
      <p className="text-3xl font-semibold leading-none text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </Card>
  );
}

function LandlordDashboard() {
  const utils = trpc.useUtils();
  const { data: properties } = trpc.properties.getByLandlord.useQuery();
  const { data: bookings } = trpc.bookings.getLandlord.useQuery();
  const { data: complaints } = trpc.complaints.getByLandlord.useQuery();
  const { data: notifications } = trpc.notifications.getAll.useQuery();
  const { data: payments } = trpc.payments.getLandlord.useQuery();
  const approveBooking = trpc.bookings.approve.useMutation({
    onSuccess: async () => {
      await utils.bookings.getLandlord.invalidate();
    },
  });
  const rejectBooking = trpc.bookings.reject.useMutation({
    onSuccess: async () => {
      await utils.bookings.getLandlord.invalidate();
    },
  });
  const updateComplaint = trpc.complaints.update.useMutation({
    onSuccess: async () => {
      await utils.complaints.getByLandlord.invalidate();
    },
  });

  const propertyList = properties ?? [];
  const bookingList = bookings ?? [];
  const complaintList = complaints ?? [];
  const notificationList = notifications ?? [];
  const paymentList = payments ?? [];

  const pendingBookings = bookingList.filter((b: any) => b.status === "pending");
  const openComplaints = complaintList.filter((c: any) => c.status === "open" || c.status === "in_progress");
  const unreadCount = notificationList.filter((n: any) => !n.isRead).length;
  const activeBookings = bookingList.filter((b: any) => b.status !== "cancelled" && b.status !== "rejected");

  const propertyInsights = propertyList.map((property: any) => {
    const bookingsForProperty = activeBookings.filter((b: any) => b.propertyId === property.id);
    const complaintsForProperty = complaintList.filter((c: any) => c.propertyId === property.id);
    const tenantCount = new Set(bookingsForProperty.map((b: any) => b.tenantId)).size;
    const firstImage = Array.isArray(property.images) && property.images.length > 0 ? property.images[0]?.url : null;

    return {
      ...property,
      tenantCount,
      complaintCount: complaintsForProperty.length,
      activeBookingCount: bookingsForProperty.length,
      firstImage,
    };
  });

  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  const rentDueSoon = bookingList
    .filter((b: any) => b.status === "approved")
    .filter((b: any) => {
      const dueDate = new Date(b.checkInDate);
      return dueDate >= now && dueDate <= nextWeek;
    })
    .sort((a: any, b: any) => +new Date(a.checkInDate) - +new Date(b.checkInDate))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Listings"
          value={propertyList.length}
          subtitle="Properties under management"
          icon={Building2}
        />
        <StatCard
          title="Total Tenants"
          value={new Set(activeBookings.map((b: any) => b.tenantId)).size}
          subtitle="Across all active bookings"
          icon={Home}
        />
        <StatCard
          title="Pending Bookings"
          value={pendingBookings.length}
          subtitle="Requests awaiting action"
          icon={ClipboardList}
        />
        <StatCard
          title="Open Complaints"
          value={openComplaints.length}
          subtitle="Tenant issues to resolve"
          icon={MessageSquareWarning}
        />
        <StatCard
          title="Unread Alerts"
          value={unreadCount}
          subtitle="Notifications"
          icon={Bell}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3 rounded-2xl border-border/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Per Property Overview</h3>
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Portfolio Life</span>
          </div>
          <div className="space-y-3">
            {propertyInsights.slice(0, 6).map((property: any) => (
              <div
                key={property.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{property.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {property.city}, {property.state}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold">{property.tenantCount} tenant(s)</p>
                  <p className="text-muted-foreground">{property.complaintCount} complaint(s)</p>
                  <p className="text-muted-foreground">{property.activeBookingCount} active booking(s)</p>
                </div>
              </div>
            ))}
            {propertyInsights.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No property data yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2 rounded-2xl border-border/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Rent Due This Week</h3>
            <Clock3 className="h-4 w-4 text-accent" />
          </div>
          <div className="space-y-3">
            {rentDueSoon.map((booking: any) => (
              <div key={booking.id} className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                <p className="text-sm font-medium">Booking #{booking.id}</p>
                <p className="text-xs text-muted-foreground">
                  Due by {new Date(booking.checkInDate).toLocaleDateString()} - ${booking.totalPrice}
                </p>
              </div>
            ))}
            {rentDueSoon.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No rent due in the next 7 days.
              </p>
            )}
          </div>
          <Link href="/properties/new">
            <Button className="mt-5 w-full">Add Property</Button>
          </Link>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">All Rented Properties</h3>
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Images and Details</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {propertyInsights.map((property: any) => (
            <div key={property.id} className="overflow-hidden rounded-2xl border border-border/60 bg-background/60">
              <div className="h-40 w-full bg-muted">
                {property.firstImage ? (
                  <img src={property.firstImage} alt={property.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No image provided
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <p className="text-sm font-semibold">{property.title}</p>
                <p className="text-xs text-muted-foreground">{property.city}, {property.state}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{property.description}</p>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span>{property.tenantCount} tenant(s)</span>
                  <span>{property.complaintCount} complaint(s)</span>
                  <span>${property.pricePerNight}/month</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {propertyInsights.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No listed properties yet. Use "Add Property" to create one.
          </p>
        )}
      </Card>

      <Card className="rounded-2xl border-border/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Payment History</h3>
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tenant Payments</span>
        </div>
        <div className="space-y-3">
          {paymentList.slice(0, 10).map((payment: any) => {
            const [methodRaw, referenceRaw] = String(payment.stripePaymentIntentId ?? "bank_transfer:n/a").split(":");
            const methodLabel = methodRaw === "mobile_money" ? "Mobile Money" : "Bank Transfer";
            return (
              <div key={payment.id} className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Payment #{payment.id}</p>
                    <p className="text-xs text-muted-foreground">
                      Booking #{payment.bookingId} - {methodLabel}
                      {referenceRaw && referenceRaw !== "n/a" ? ` - Ref: ${referenceRaw}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${payment.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.paidDate
                        ? new Date(payment.paidDate).toLocaleDateString()
                        : new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {paymentList.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No payments received yet.
            </p>
          )}
        </div>
      </Card>

      {openComplaints.length > 0 && (
        <Card className="rounded-2xl border-border/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-accent" />
            <h3 className="text-xl font-semibold">Recent Tenant Complaints</h3>
          </div>
          <div className="space-y-3">
            {openComplaints.slice(0, 5).map((complaint: any) => (
              <div key={complaint.id} className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                <p className="text-sm font-medium">{complaint.title}</p>
                <p className="text-xs text-muted-foreground">
                  Severity: {complaint.severity} - Status: {complaint.status}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {complaint.status !== "in_progress" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateComplaint.mutate({ id: complaint.id, status: "in_progress" })}
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {complaint.status !== "resolved" && (
                    <Button
                      size="sm"
                      onClick={() => updateComplaint.mutate({ id: complaint.id, status: "resolved" })}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="rounded-2xl border-border/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Pending Booking Requests</h3>
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Approve or Reject</span>
        </div>
        <div className="space-y-3">
          {pendingBookings.slice(0, 8).map((booking: any) => (
            <div key={booking.id} className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Booking #{booking.id}</p>
                  <p className="text-xs text-muted-foreground">
                    Check-in: {new Date(booking.checkInDate).toLocaleDateString()} - ${booking.totalPrice}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={approveBooking.isPending || rejectBooking.isPending}
                    onClick={() => rejectBooking.mutate(booking.id)}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={approveBooking.isPending || rejectBooking.isPending}
                    onClick={() => approveBooking.mutate(booking.id)}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {pendingBookings.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No pending bookings at the moment.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function TenantDashboard() {
  const utils = trpc.useUtils();
  const { data: bookings } = trpc.bookings.getTenant.useQuery();
  const { data: favorites } = trpc.favorites.getAll.useQuery();
  const { data: notifications } = trpc.notifications.getAll.useQuery();
  const { data: discover } = trpc.properties.search.useQuery({ isAvailable: true, limit: 6 });
  const payMutation = trpc.payments.create.useMutation({
    onSuccess: async () => {
      await utils.notifications.getAll.invalidate();
    },
  });

  const bookingList = bookings ?? [];
  const favoriteList = favorites ?? [];
  const discoverList = discover ?? [];
  const notificationList = notifications ?? [];
  const payableBookings = bookingList.filter((b: any) => b.status === "approved" || b.status === "pending");
  const [paymentAmountByBooking, setPaymentAmountByBooking] = useState<Record<number, string>>({});
  const [paymentMethodByBooking, setPaymentMethodByBooking] = useState<Record<number, "bank_transfer" | "mobile_money">>({});
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const activeTrips = bookingList.filter((b: any) => b.status === "approved" || b.status === "pending");
  const unreadCount = notificationList.filter((n: any) => !n.isRead).length;

  const handlePay = async (booking: any) => {
    setPaymentError("");
    setPaymentMessage("");
    const amountInput = paymentAmountByBooking[booking.id] ?? String(booking.totalPrice);
    const amount = Number(amountInput);
    const method = paymentMethodByBooking[booking.id] ?? "bank_transfer";

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }

    try {
      await payMutation.mutateAsync({
        bookingId: booking.id,
        amount,
        depositAmount: amount,
        paymentType: "full_payment",
        paymentMethod: method,
        paymentReference: `${method}-${Date.now()}`,
      });
      setPaymentMessage(`Payment submitted successfully for booking #${booking.id}.`);
    } catch (err: any) {
      setPaymentError(err?.message || err?.data?.message || "Payment failed.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Trips"
          value={activeTrips.length}
          subtitle="Pending or approved bookings"
          icon={CalendarCheck2}
        />
        <StatCard
          title="Saved Homes"
          value={favoriteList.length}
          subtitle="Favorites in your list"
          icon={Heart}
        />
        <StatCard
          title="Discover Picks"
          value={discoverList.length}
          subtitle="Available properties right now"
          icon={Search}
        />
        <StatCard
          title="Unread Alerts"
          value={unreadCount}
          subtitle="New notifications"
          icon={Bell}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3 rounded-2xl border-border/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Your Bookings</h3>
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tenant View</span>
          </div>
          <div className="space-y-3">
            {bookingList.slice(0, 6).map((booking: any) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">Booking #{booking.id}</p>
                  <p className="text-xs text-muted-foreground">
                    Guests: {booking.numberOfGuests} - Status: {booking.status}
                  </p>
                </div>
                <span className="text-sm font-semibold">${booking.totalPrice}</span>
              </div>
            ))}
            {bookingList.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                You do not have bookings yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2 rounded-2xl border-border/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Recommended Homes</h3>
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="space-y-3">
            {discoverList.slice(0, 5).map((property: any) => (
              <div key={property.id} className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                <p className="text-sm font-medium">{property.title}</p>
                <p className="text-xs text-muted-foreground">
                  {property.city}, {property.state} - ${property.pricePerNight}/month
                </p>
              </div>
            ))}
            {discoverList.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No recommendations yet.
              </p>
            )}
          </div>
          <Link href="/properties">
            <Button className="mt-5 w-full" variant="outline">
              Explore All Properties
            </Button>
          </Link>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Make Payment</h3>
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bank or Mobile Money</span>
        </div>
        <div className="space-y-3">
          {payableBookings.map((booking: any) => (
            <div key={booking.id} className="rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Booking #{booking.id}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {booking.status} - Default amount: ${booking.totalPrice}
                  </p>
                </div>
                <span className="text-sm font-semibold">${booking.totalPrice}</span>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_200px_auto]">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmountByBooking[booking.id] ?? booking.totalPrice}
                  onChange={e =>
                    setPaymentAmountByBooking(prev => ({ ...prev, [booking.id]: e.target.value }))
                  }
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                />
                <select
                  value={paymentMethodByBooking[booking.id] ?? "bank_transfer"}
                  onChange={e =>
                    setPaymentMethodByBooking(prev => ({
                      ...prev,
                      [booking.id]: e.target.value as "bank_transfer" | "mobile_money",
                    }))
                  }
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
                <Button
                  size="sm"
                  disabled={payMutation.isPending}
                  onClick={() => handlePay(booking)}
                >
                  Pay
                </Button>
              </div>
            </div>
          ))}
          {payableBookings.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No payable bookings yet.
            </p>
          )}
        </div>
        {paymentMessage && (
          <p className="mt-3 text-sm text-green-700">{paymentMessage}</p>
        )}
        {paymentError && (
          <p className="mt-3 text-sm text-destructive">{paymentError}</p>
        )}
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const routeRole = useMemo<DashboardRole | null>(() => {
    if (location.startsWith("/dashboard/landlord")) return "landlord";
    if (location.startsWith("/dashboard/tenant")) return "tenant";
    return null;
  }, [location]);

  const userRole = user?.role === "landlord" || user?.role === "tenant" ? user.role : null;
  const activeRole = routeRole ?? userRole;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLocation("/login");
      return;
    }

    if (routeRole && user.role !== routeRole && user.role !== "admin") {
      setLocation(user.role === "tenant" ? "/dashboard/tenant" : "/dashboard/landlord");
      return;
    }

    if (!routeRole) {
      if (user.role === "tenant") setLocation("/dashboard/tenant");
      if (user.role === "landlord" || user.role === "admin") setLocation("/dashboard/landlord");
    }
  }, [loading, routeRole, setLocation, user]);

  if (loading || !user || !activeRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(1200px_480px_at_10%_-10%,rgba(232,121,249,0.08),transparent),radial-gradient(900px_420px_at_95%_10%,rgba(251,146,60,0.10),transparent)]">
      <div className="container py-6">
        <header className="mb-7 rounded-2xl border border-border/70 bg-card/85 p-4 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-accent p-2 text-accent-foreground">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Afie Wura Workspace</p>
                <h2 className="text-2xl font-semibold">
                  {activeRole === "landlord" ? "Landlord Dashboard" : "Tenant Dashboard"}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {user.role === "admin" && (
                <Link href={activeRole === "landlord" ? "/dashboard/tenant" : "/dashboard/landlord"}>
                  <Button variant="outline" className="gap-2">
                    <UserRound className="h-4 w-4" />
                    Switch to {activeRole === "landlord" ? "Tenant" : "Landlord"} view
                  </Button>
                </Link>
              )}
              <Link href="/properties">
                <Button variant="outline">Properties</Button>
              </Link>
              {(activeRole === "landlord" || user.role === "admin") && (
                <Link href="/properties/new">
                  <Button variant="outline">Add Property</Button>
                </Link>
              )}
              <Button onClick={logout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          {activeRole === "landlord" ? <LandlordDashboard /> : <TenantDashboard />}
        </div>
      </div>
    </div>
  );
}
