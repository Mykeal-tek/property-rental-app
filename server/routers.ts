import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import {
  findLocalByEmail,
  createLocalUser,
} from "./localDb";
import {
  createFirebaseOAuthUser,
  createFirebaseUser,
  findFirebaseUserByEmail,
  isFirebaseAuthEnabled,
  isFirebaseNotReadyError,
  updateFirebaseUserPasswordHash,
  updateFirebaseUserLastSignedIn,
} from "./firebaseDb";
import { hashPasswordSync, verifyPassword } from "./authPassword";
import { ENV } from "./_core/env";
import { verifyGoogleIdToken } from "./googleAuth";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/\d/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    signup: publicProcedure
      .input(z.object({
        email: z.string().email("Invalid email"),
        password: passwordSchema,
        name: z.string().min(1, "Name is required"),
        role: z.enum(["landlord", "tenant"], "Invalid role"),
      }))
      .mutation(async ({ ctx, input }) => {
        const normalizedEmail = input.email.trim().toLowerCase();

        if (isFirebaseAuthEnabled()) {
          try {
            const existingFirebaseUser = await findFirebaseUserByEmail(normalizedEmail);
            if (existingFirebaseUser) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Email already registered",
              });
            }

            const createdFirebaseUser = await createFirebaseUser(
              normalizedEmail,
              input.name,
              input.role,
              input.password
            );

            if (!createdFirebaseUser) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Unable to create Firebase account",
              });
            }

            return {
              success: true,
              message: "Account created successfully. Please log in.",
            };
          } catch (error) {
            if (!isFirebaseNotReadyError(error)) {
              throw error;
            }
            console.warn("[Signup] Firebase unavailable; falling back to local auth store.");
          }
        }

        const existingLocalUser = findLocalByEmail(normalizedEmail);
        if (existingLocalUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already registered",
          });
        }

        // Keep credentials in local store so email/password login works in all environments.
        const createdLocalUser = createLocalUser(
          normalizedEmail,
          input.name,
          input.role,
          input.password
        );

        // Best-effort profile upsert for deployments with a configured database.
        try {
          if (ENV.databaseUrl) {
            const existingDbUser = await db.getUserByEmail(normalizedEmail);
            if (existingDbUser) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Email already registered",
              });
            }

            await db.upsertUser({
              openId: createdLocalUser.openId,
              name: input.name,
              email: normalizedEmail,
              role: input.role,
              loginMethod: "email",
            });
          }
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          // If DB sync fails, account is still valid in local credentials store.
          console.warn("[Signup Warning] Failed to sync user to DB:", error);
        }

        return {
          success: true,
          message: "Account created successfully. Please log in.",
        };
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("Invalid email"),
          password: z.string().min(1, "Password required"),
          role: z.enum(["landlord", "tenant"], "Invalid role"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const normalizedEmail = input.email.trim().toLowerCase();

        let user:
          | {
              openId: string;
              role: "user" | "admin" | "landlord" | "tenant";
              passwordHash?: string;
              password?: string;
            }
          | null = null;

        if (isFirebaseAuthEnabled()) {
          try {
            user = await findFirebaseUserByEmail(normalizedEmail);
          } catch (error) {
            if (!isFirebaseNotReadyError(error)) {
              throw error;
            }
            console.warn("[Login] Firebase unavailable; falling back to local auth store.");
            user = findLocalByEmail(normalizedEmail) ?? null;
          }
        } else {
          user = findLocalByEmail(normalizedEmail) ?? null;
        }

        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }

        const isValid = user.passwordHash
          ? verifyPassword(input.password, user.passwordHash)
          : !!user.password && user.password === input.password;

        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }

        // Upgrade legacy plaintext password records in place.
        if (!user.passwordHash && user.password) {
          const newHash = hashPasswordSync(user.password);
          user.passwordHash = newHash;
          user.password = undefined;
          if (user.openId.startsWith("firebase_")) {
            await updateFirebaseUserPasswordHash(user.openId, newHash);
          }
        }

        if (user.role !== input.role && user.role !== "admin") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `This account is registered as ${user.role}. Please sign in as ${user.role}.`,
          });
        }

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, user.openId, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        if (isFirebaseAuthEnabled()) {
          try {
            await updateFirebaseUserLastSignedIn(user.openId);
          } catch (error) {
            if (!isFirebaseNotReadyError(error)) {
              throw error;
            }
          }
        }
        return { success: true, message: "Logged in" };
      }),
    google: publicProcedure
      .input(
        z.object({
          credential: z.string().min(1, "Missing Google credential"),
          role: z.enum(["landlord", "tenant"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let profile;
        try {
          profile = await verifyGoogleIdToken(input.credential);
        } catch {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Google authentication failed. Please try again.",
          });
        }

        let user:
          | {
              openId: string;
              role: "user" | "admin" | "landlord" | "tenant";
            }
          | null = null;

        if (isFirebaseAuthEnabled()) {
          try {
            user = await findFirebaseUserByEmail(profile.email);
          } catch (error) {
            if (!isFirebaseNotReadyError(error)) {
              throw error;
            }
          }
        }

        if (!user) {
          user = findLocalByEmail(profile.email) ?? null;
        }

        const isNewUser = !user;

        if (!user) {
          if (!input.role) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Select a role to complete Google sign up.",
            });
          }

          if (isFirebaseAuthEnabled()) {
            const createdFirebaseUser = await createFirebaseOAuthUser(
              profile.email,
              profile.name,
              input.role
            );

            if (!createdFirebaseUser) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Email already registered",
              });
            }

            user = createdFirebaseUser;
          } else {
            const randomPassword = randomBytes(32).toString("hex");
            user = createLocalUser(profile.email, profile.name, input.role, randomPassword);

            try {
              if (ENV.databaseUrl) {
                await db.upsertUser({
                  openId: user.openId,
                  name: profile.name,
                  email: profile.email,
                  role: input.role,
                  loginMethod: "google",
                });
              }
            } catch (error) {
              console.warn("[Google Signup Warning] Failed to sync user to DB:", error);
            }
          }
        }

        if (input.role && user.role !== input.role && user.role !== "admin") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `This account is registered as ${user.role}. Please continue as ${user.role}.`,
          });
        }

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, user.openId, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        if (isFirebaseAuthEnabled()) {
          try {
            await updateFirebaseUserLastSignedIn(user.openId);
          } catch (error) {
            if (!isFirebaseNotReadyError(error)) {
              throw error;
            }
          }
        }

        return {
          success: true,
          isNewUser,
        } as const;
      }),
  }),

  // ============ PROPERTY ROUTES ============
  properties: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        zipCode: z.string().min(1),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        pricePerNight: z.number().positive(),
        minLeaseMonths: z.number().int().positive(),
        maxLeaseMonths: z.number().int().positive(),
        bedrooms: z.number().int().positive(),
        bathrooms: z.number().positive(),
        squareFeet: z.number().int().optional(),
        propertyType: z.enum(["apartment", "house", "condo", "townhouse", "studio"]),
        amenities: z.array(z.string()).optional(),
        images: z.array(z.object({
          url: z.string(),
          caption: z.string().optional(),
        })).optional(),
        maxGuests: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "landlord" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.minLeaseMonths > input.maxLeaseMonths) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Minimum lease months cannot be greater than maximum lease months.",
          });
        }
        return await db.createProperty({
          ...input,
          landlordId: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        pricePerNight: z.number().optional(),
        minLeaseMonths: z.number().int().positive().optional(),
        maxLeaseMonths: z.number().int().positive().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        amenities: z.array(z.string()).optional(),
        images: z.array(z.object({
          url: z.string(),
          caption: z.string().optional(),
        })).optional(),
        isAvailable: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input.id);
        if (!property) throw new TRPCError({ code: "NOT_FOUND" });
        if (property.landlordId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (
          input.minLeaseMonths !== undefined &&
          input.maxLeaseMonths !== undefined &&
          input.minLeaseMonths > input.maxLeaseMonths
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Minimum lease months cannot be greater than maximum lease months.",
          });
        }
        const { id, ...updateData } = input;
        return await db.updateProperty(id, updateData);
      }),

    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getPropertyById(input);
      }),

    getByLandlord: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPropertiesByLandlord(ctx.user.id);
      }),

    search: publicProcedure
      .input(z.object({
        city: z.string().optional(),
        propertyType: z.enum(["apartment", "house", "condo", "townhouse", "studio"]).optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        isAvailable: z.boolean().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.searchProperties(input);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input);
        if (!property) throw new TRPCError({ code: "NOT_FOUND" });
        if (property.landlordId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.deleteProperty(input);
      }),
  }),

  // ============ BOOKING ROUTES ============
  bookings: router({
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        checkInDate: z.date(),
        checkOutDate: z.date(),
        numberOfGuests: z.number().int().positive(),
        totalPrice: z.number().positive(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const property = await db.getPropertyById(input.propertyId);
        if (!property) throw new TRPCError({ code: "NOT_FOUND" });

        return await db.createBooking({
          ...input,
          tenantId: ctx.user.id,
          landlordId: property.landlordId,
          status: "pending",
        });
      }),

    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getBookingById(input);
      }),

    getTenant: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getBookingsByTenant(ctx.user.id);
      }),

    getLandlord: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getBookingsByLandlord(ctx.user.id);
      }),

    approve: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
        if (booking.landlordId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.updateBooking(input, { status: "approved" });
      }),

    reject: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
        if (booking.landlordId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.updateBooking(input, { status: "rejected" });
      }),
  }),

  // ============ PAYMENT ROUTES ============
  payments: router({
    create: protectedProcedure
      .input(z.object({
        bookingId: z.number(),
        amount: z.number().positive(),
        depositAmount: z.number().positive(),
        paymentType: z.enum(["deposit", "full_payment", "partial_payment"]),
        paymentMethod: z.enum(["bank_transfer", "mobile_money"]),
        paymentReference: z.string().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
        if (booking.tenantId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const payment = await db.createPayment({
          ...input,
          status: "completed",
          paidDate: new Date(),
          // Reuse this optional field to keep lightweight manual method/reference metadata.
          stripePaymentIntentId: `${input.paymentMethod}:${input.paymentReference ?? "n/a"}`,
        });

        await db.createNotification({
          userId: booking.landlordId,
          type: "payment_due",
          title: "Payment Received",
          message: `${ctx.user.name ?? "A tenant"} paid $${input.amount} via ${input.paymentMethod.replace("_", " ")} for booking #${booking.id}.`,
          relatedId: input.bookingId,
          relatedType: "booking",
        });

        return payment;
      }),

    getByBooking: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getPaymentsByBooking(input);
      }),
    getLandlord: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "landlord" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getPaymentsByLandlord(ctx.user.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
        stripePaymentIntentId: z.string().optional(),
        stripeChargeId: z.string().optional(),
        paidDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updateData } = input;
        return await db.updatePayment(id, updateData);
      }),
  }),

  // ============ COMPLAINT ROUTES ============
  complaints: router({
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        bookingId: z.number(),
        title: z.string().min(1),
        description: z.string().min(1),
        category: z.enum(["damage", "cleanliness", "maintenance", "safety", "other"]),
        severity: z.enum(["low", "medium", "high"]),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
        if (booking.tenantId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.createComplaint({
          ...input,
          tenantId: ctx.user.id,
          landlordId: booking.landlordId,
          status: "open",
        });
      }),

    getByProperty: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getComplaintsByProperty(input);
      }),

    getByLandlord: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getComplaintsByLandlord(ctx.user.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
        resolution: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updateData } = input;
        return await db.updateComplaint(id, updateData);
      }),
  }),

  // ============ FAVORITE ROUTES ============
  favorites: router({
    add: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        return await db.addFavorite(ctx.user.id, input);
      }),

    remove: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        return await db.removeFavorite(ctx.user.id, input);
      }),

    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getFavoritesByTenant(ctx.user.id);
      }),
  }),

  // ============ REVIEW ROUTES ============
  reviews: router({
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        bookingId: z.number(),
        rating: z.number().int().min(1).max(5),
        title: z.string().min(1),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
        if (booking.tenantId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.createReview({
          ...input,
          tenantId: ctx.user.id,
        });
      }),

    getByProperty: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getReviewsByProperty(input);
      }),
  }),

  // ============ NOTIFICATION ROUTES ============
  notifications: router({
    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getNotificationsByUser(ctx.user.id);
      }),

    markAsRead: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        return await db.markNotificationAsRead(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
