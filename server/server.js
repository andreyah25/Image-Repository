const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

const app = express();

const allowedOrigins = [
    "https://captured-admin-studio.onrender.com",
    "https://captured-photo-studio.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.error("CORS blocked origin:", origin);
        return callback(new Error("Not allowed by CORS"));
    },
    methods: [
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],
    allowedHeaders: [
        "Accept",
        "Authorization",
        "Content-Type",
        "apikey",
        "x-client-info",
        "x-supabase-api-version"
    ],
    optionsSuccessStatus: 204
};

// IMPORTANT: CORS must run before your API routes.
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
// Preserve the PayMongo webhook raw body.
app.use(express.json({
    verify: (req, res, buffer) => {
        if (
            req.originalUrl.split("?")[0] ===
            "/api/paymongo/webhook"
        ) {
            req.rawBody = Buffer.from(buffer);
        }
    }
}));

app.use((req, res, next) => {
    console.log(
        "REQUEST:",
        req.method,
        req.originalUrl,
        "ORIGIN:",
        req.headers.origin
    );
    next();
});

app.use(express.static(path.join(__dirname, "..")));


const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;


// Booking webhook secret
const PAYMONGO_BOOKING_WEBHOOK_SECRET =
    process.env.PAYMONGO_BOOKING_WEBHOOK_SECRET;

// Existing webhook secret
const PAYMONGO_WEBHOOK_SECRET =
    process.env.PAYMONGO_WEBHOOK_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    console.error("Missing required Supabase environment variables:", {
        SUPABASE_URL: Boolean(SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE_ROLE_KEY),
        SUPABASE_ANON_KEY: Boolean(SUPABASE_ANON_KEY)
    });

    process.exit(1);
}

const resend = RESEND_API_KEY
    ? new Resend(RESEND_API_KEY)
    : null;
const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);

const loginAuthClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

app.get("/admin", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_dashboard.html")
    );
});
app.get("/admin/dashboard", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_dashboard.html")
    );
});
app.get("/admin/login", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_login.html")
    );
});
app.get("/admin/forgot-password", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_forgotpw.html")
    );
});

app.get("/admin/verification", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "verification_code.html")
    );
});

app.get("/admin/clients", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_client.html")
    );
});

app.get("/admin/repository", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_repository.html")
    );
});

app.get("/admin/payments", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_payment.html")
    );
});

app.get("/admin/archives", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_archives.html")
    );
});

app.get("/admin/packages", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_packages.html")
    );
});

app.get("/admin/profile", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_profile.html")
    );
});

app.get("/admin/settings", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_settings.html")
    );
});
app.get("/admin/auth-callback", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "auth_callback.html")
    );
});
app.get("/admin/customer-folders", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_customer_folders.html")
    );
});
app.get("/admin/access-request", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-admin", "admin_client_access_request.html")
    );
});
// CUSTOMER PAGES

app.get("/home", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-customer", "customer_homepage.html")
    );
});
app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "..",
            "frontend-customer",
            "customer_homepage.html"
        )
    );
});
app.get("/booking", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-customer", "customer_booking.html")
    );
});

app.get("/booking-success", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-customer", "customer_booking_success.html")
    );
});

app.get("/booking-cancelled", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-customer", "customer_booking_cancel.html")
    );
});

app.get("/gallery", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "frontend-customer", "customer_gallery_view.html")
    );
});
app.get("/gallery-requests", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "..",
            "frontend-customer",
            "customer_gallery_request.html"
        )
    );
});

async function compressImage(inputBuffer) {
    return await sharp(inputBuffer)
        .rotate()
        .resize({
            width: 2000,
            height: 2000,
            fit: "inside",
            withoutEnlargement: true
        })
        .webp({
            quality: 78,
            effort: 4
        })
        .toBuffer();
}


module.exports = { compressImage };

const ML_SERVICE_URL =
    process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

async function runArchiveAndCompression(session) {
    const response = await fetch(
        `${ARCHIVE_API_BASE_URL}/api/admin/archive/old-folders`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({})
        }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            result.message ||
            result.error ||
            `Archive request failed (${response.status}).`
        );
    }

    console.log("Archive and compression results:", result);

    if (result.errors?.length) {
        console.error("Some folders could not be processed:", result.errors);
        alert(
            `${result.foldersArchived} folder(s) archived. ` +
            `${result.errors.length} folder(s) failed. ` +
            "Check the browser console for details."
        );
    } else if (result.foldersArchived > 0) {
        console.log(
            `Archived ${result.foldersArchived} folder(s); ` +
            `created ${result.photosCompressed} compressed photo(s).`
        );
    }

    return result;
}


async function requireStaff(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Missing authorization token."
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Missing authorization token."
            });
        }

        // Verify the supplied token explicitly.
        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser(token);

        if (userError || !user) {
            console.error("Authentication error:", {
                message: userError?.message,
                status: userError?.status,
                code: userError?.code
            });

            return res.status(401).json({
                success: false,
                error: "Invalid or expired session."
            });
        }

        // Use the service-role client for the profile lookup.
        const {
            data: profile,
            error: profileError
        } = await supabaseAdmin
            .from("staff_profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Staff profile lookup error:", profileError);

            return res.status(500).json({
                success: false,
                error: "Unable to verify staff profile."
            });
        }

        if (!profile) {
            return res.status(403).json({
                success: false,
                error: "Staff profile not found."
            });
        }

        const role = String(profile.role || "")
            .trim()
            .toLowerCase();

        const status = String(profile.status || "")
            .trim()
            .toLowerCase();

        if (!["admin", "staff"].includes(role)) {
            return res.status(403).json({
                success: false,
                error: "This account is not authorized to access the staff panel."
            });
        }

        if (profile.verified !== true) {
            return res.status(403).json({
                success: false,
                error: "This account has not been verified."
            });
        }

        if (status !== "active") {
            return res.status(403).json({
                success: false,
                error: "This account is not active."
            });
        }

        req.authUser = user;
        req.profile = profile;

        return next();

    } catch (error) {
        console.error("Staff authorization error:", error);

        return res.status(500).json({
            success: false,
            error: "Authorization check failed."
        });
    }
}


async function requireAdmin(req, res, next) {
    try {
        // Verify the session and staff profile first.
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Missing authorization token."
            });
        }

        const token = authHeader.slice(7).trim();

        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: "Invalid or expired session."
            });
        }

        const { data: profile, error: profileError } =
            await supabaseAdmin
                .from("staff_profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) {
            console.error("Admin profile lookup error:", profileError);

            return res.status(500).json({
                success: false,
                error: "Unable to verify staff profile."
            });
        }

        if (!profile) {
            return res.status(403).json({
                success: false,
                error: "Staff profile not found."
            });
        }

        const role = String(profile.role || "")
            .trim()
            .toLowerCase();

        const status = String(profile.status || "")
            .trim()
            .toLowerCase();

        if (profile.verified !== true || status !== "active") {
            return res.status(403).json({
                success: false,
                error: "Staff account is not verified or active."
            });
        }

        if (role !== "admin") {
            return res.status(403).json({
                success: false,
                error: "Administrator access required."
            });
        }

        req.authUser = user;
        req.profile = profile;

        return next();
    } catch (error) {
        console.error("Admin authorization error:", error);

        return res.status(500).json({
            success: false,
            error: "Authorization check failed."
        });
    }
}
app.get(
    "/api/admin/bookings",
    requireStaff,
    async (req, res) => {
        console.log("📋 BOOKINGS ROUTE REACHED");
        console.log("Authenticated profile:", {
            role: req.profile?.role,
            verified: req.profile?.verified,
            status: req.profile?.status
        });

        try {
            const { data: bookings, error } = await supabase
                .from("bookings")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("ADMIN BOOKINGS QUERY ERROR:", error);

                return res.status(500).json({
                    success: false,
                    error: "Failed to load bookings."
                });
            }

            return res.status(200).json({
                success: true,
                count: bookings?.length || 0,
                bookings: bookings || []
            });
        } catch (error) {
            console.error("Admin bookings API error:", error);

            return res.status(500).json({
                success: false,
                error: "Internal server error."
            });
        }
    }
);


const ARCHIVE_PHOTO_BUCKET = "repository-photos";
const ARCHIVE_AFTER_DAYS = 7; // Local testing only

app.post(
    "/api/admin/archive/old-folders",
    requireAdmin,
    async (req, res) => {
        const results = {
            foldersArchived: 0,
            photosCompressed: 0,
            photosSkipped: 0,
            errors: []
        };

        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - ARCHIVE_AFTER_DAYS);

            const { data: folders, error: foldersError } =
                await supabaseAdmin
                    .from("repository_client_links")
                    .select("id, created_at, is_archived")
                    .eq("is_archived", false)
                    .lte("created_at", cutoff.toISOString());

            if (foldersError) throw foldersError;

            for (const folder of folders || []) {
                try {
                    const { data: photos, error: photosError } =
                        await supabaseAdmin
                            .from("repository_photos")
                            .select(
                                "id, repository_id, storage_path, compressed_storage_path, compression_status, is_archived"
                            )
                            .eq("repository_id", folder.id);

                    if (photosError) throw photosError;

                    // Do not archive this folder if any photo fails processing.
                    for (const photo of photos || []) {
                       if (
                                photo.compressed_storage_path &&
                                photo.compression_status === "completed"
                            ) {
                                results.photosSkipped++;
                                continue;
                            }

                        if (!photo.storage_path) {
                            throw new Error(
                                `Photo ${photo.id} has no original storage path.`
                            );
                        }

                        const { data: originalFile, error: downloadError } =
                            await supabaseAdmin.storage
                                .from(ARCHIVE_PHOTO_BUCKET)
                                .download(photo.storage_path);

                        if (downloadError || !originalFile) {
                            throw new Error(
                                `Cannot download photo ${photo.id}: ${
                                    downloadError?.message || "File not found"
                                }`
                            );
                        }

                        const originalBuffer = Buffer.from(
                            await originalFile.arrayBuffer()
                        );

                        const compressedBuffer = await sharp(originalBuffer)
                            .rotate()
                            .resize({
                                width: 2000,
                                height: 2000,
                                fit: "inside",
                                withoutEnlargement: true
                            })
                            .webp({
                                quality: 78,
                                effort: 4
                            })
                            .toBuffer();

                        const compressedPath =
                            `${folder.id}/compressed/${photo.id}.webp`;

                        const { error: uploadError } =
                            await supabaseAdmin.storage
                                .from(ARCHIVE_PHOTO_BUCKET)
                                .upload(compressedPath, compressedBuffer, {
                                    contentType: "image/webp",
                                    cacheControl: "3600",
                                    upsert: true
                                });

                        if (uploadError) throw uploadError;

                        const { error: updatePhotoError } =
                            await supabaseAdmin
                                .from("repository_photos")
                                .update({
                                    compressed_storage_path: compressedPath,
                                    compressed_file_size: compressedBuffer.length,
                                    compressed_size_bytes: compressedBuffer.length,
                                    compression_format: "webp",
                                    compression_status: "completed"
                                })
                                .eq("id", photo.id);

                        if (updatePhotoError) {
                            // Avoid leaving an orphaned compressed file.
                            await supabaseAdmin.storage
                                .from(ARCHIVE_PHOTO_BUCKET)
                                .remove([compressedPath]);

                            throw updatePhotoError;
                        }

                        results.photosCompressed++;
                    }

                    const archiveTime = new Date().toISOString();

                    // Archive photos only after all required conversions succeed.
                    const { error: archivePhotosError } =
                        await supabaseAdmin
                            .from("repository_photos")
                            .update({
                                is_archived: true,
                                archived_at: archiveTime
                            })
                            .eq("repository_id", folder.id);

                    if (archivePhotosError) throw archivePhotosError;

                    const { error: archiveFolderError } =
                        await supabaseAdmin
                            .from("repository_client_links")
                            .update({
                                is_archived: true,
                                archived_at: archiveTime
                            })
                            .eq("id", folder.id)
                            .eq("is_archived", false);

                    if (archiveFolderError) throw archiveFolderError;

                    results.foldersArchived++;

                    console.log(
                        `Archived folder ${folder.id}; photos processed successfully.`
                    );
                } catch (folderError) {
                    console.error(
                        `Folder ${folder.id} was not fully archived:`,
                        folderError
                    );

                    results.errors.push({
                        folderId: folder.id,
                        message: folderError.message || String(folderError)
                    });
                }
            }

            return res.json({
                success: results.errors.length === 0,
                cutoff: cutoff.toISOString(),
                ...results
            });
        } catch (error) {
            console.error("Automatic archive/compression failed:", error);

            return res.status(500).json({
                success: false,
                message: error.message || "Archiving failed.",
                ...results
            });
        }
    }
);

app.post("/api/admin/login", async (req, res) => {
    try {
        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const password = String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required."
            });
        }

        const { data: attempt, error: attemptError } =
            await supabaseAdmin
                .from("admin_login_attempts")
                .select("*")
                .eq("email", email)
                .maybeSingle();

        if (attemptError) {
            console.error("LOGIN ATTEMPT CHECK:", attemptError);
            return res.status(500).json({
                success: false,
                error: "Unable to process login."
            });
        }

        if (
            attempt?.locked_until &&
            new Date(attempt.locked_until).getTime() > Date.now()
        ) {
            const seconds = Math.ceil(
                (new Date(attempt.locked_until).getTime() - Date.now()) / 1000
            );

            return res.status(429).json({
                success: false,
                locked: true,
                retryAfter: seconds,
                error: `Too many failed attempts. Try again in ${seconds} seconds.`
            });
        }

        if (attempt?.locked_until) {
            await supabaseAdmin
                .from("admin_login_attempts")
                .delete()
                .eq("email", email);
        }

        const { data, error } =
            await loginAuthClient.auth.signInWithPassword({
                email,
                password
            });

        if (error || !data.user || !data.session) {
            const failedAttempts = attempt?.locked_until
                ? 1
                : (attempt?.failed_attempts || 0) + 1;

            const isLocked = failedAttempts >= 3;

            const { error: saveError } = await supabaseAdmin
                .from("admin_login_attempts")
                .upsert({
                    email,
                    failed_attempts: failedAttempts,
                    locked_until: isLocked
                        ? new Date(Date.now() + 60 * 1000).toISOString()
                        : null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: "email"
                });

            if (saveError) {
                console.error("SAVE LOGIN ATTEMPT:", saveError);
                return res.status(500).json({
                    success: false,
                    error: "Unable to process login."
                });
            }

            if (isLocked) {
                return res.status(429).json({
                    success: false,
                    locked: true,
                    retryAfter: 60,
                    error: "Three failed attempts. Login is locked for 1 minute."
                });
            }

            return res.status(401).json({
                success: false,
                error: `Invalid email or password. Attempt ${failedAttempts} of 3.`
            });
        }

        const { data: profile, error: profileError } =
            await supabaseAdmin
                .from("staff_profiles")
                .select("*")
                .eq("id", data.user.id)
                .maybeSingle();

       
if (profileError) {
    console.error("STAFF PROFILE LOOKUP ERROR:", profileError);

    await loginAuthClient.auth.signOut();

    return res.status(500).json({
        success: false,
        error: "Unable to verify your staff account. Please try again."
    });
}

if (!profile) {
    await loginAuthClient.auth.signOut();

    return res.status(403).json({
        success: false,
        error: "Staff profile not found. Please contact your administrator."
    });
}

console.log("LOGIN PROFILE DEBUG:", {
    authenticatedUserId: data.user.id,
    authenticatedEmail: data.user.email,
    profileId: profile.id,
    profileEmail: profile.email,
    role: profile.role,
    verified: profile.verified,
    status: profile.status
});

const staffRole = String(profile.role || "").trim().toLowerCase();
const staffStatus = String(profile.status || "").trim().toLowerCase();

if (!["admin", "staff"].includes(staffRole)) {
    await loginAuthClient.auth.signOut();

    return res.status(403).json({
        success: false,
        error: "Your account does not have an authorized staff role."
    });
}

if (profile.verified !== true) {
    await loginAuthClient.auth.signOut();

    return res.status(403).json({
        success: false,
        error: "Account not verified."
    });
}

if (staffStatus !== "active") {
    await loginAuthClient.auth.signOut();

    return res.status(403).json({
        success: false,
        error: "Your staff account is inactive. Please contact your administrator."
    });
}


        const { error: clearError } = await supabaseAdmin
            .from("admin_login_attempts")
            .delete()
            .eq("email", email);

        if (clearError) {
            console.error("CLEAR LOGIN ATTEMPTS:", clearError);
        }
 try {
            await recordStaffActivity({
                staffId: data.user.id,
                action: "LOGIN",
                module: "Authentication",
                page: "Admin Login",
                details: `Successful login for ${email}`
            });
        } catch (activityError) {
            console.error(
                "RECORD LOGIN ACTIVITY ERROR:",
                activityError
            );
        }
        return res.json({
            success: true,
            user: data.user,
            session: data.session,
            profile
        });

    } catch (error) {
        console.error("ADMIN LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "An unexpected login error occurred."
        });
    }
});

async function recordStaffActivity({
    staffId,
    action,
    module = null,
    page = null,
    details = null
}) {
    try {

        const {
            data: staff,
            error: staffError
        } = await supabaseAdmin
            .from("staff_profiles")
            .select(`
                id,
                full_name,
                email
            `)
            .eq("id", staffId)
            .maybeSingle();

        if (staffError || !staff) {
            console.warn(
                "Unable to load staff for activity log:",
                staffError
            );
            return;
        }

        const {
            error
        } = await supabaseAdmin
            .from("staff_activity_logs")
            .insert({
                staff_id: staff.id,
                staff_name: staff.full_name,
                staff_email: staff.email,
                action,
                module,
                page,
                details
            });

        if (error) {
            console.warn(
                "Staff activity log error:",
                error
            );
        }

    } catch (error) {

        console.warn(
            "Staff activity logging failed:",
            error
        );

    }
}
app.post(
    "/api/admin/staff/presence/offline",
    requireStaff,
    async (req, res) => {

        try {

            const staffId =
                req.authUser.id;

            const now =
                new Date().toISOString();

            const {
                error
            } = await supabaseAdmin
                .from("staff_presence")
                .upsert(
                    {
                        staff_id: staffId,
                        is_online: false,
                        last_active_at: now,
                        updated_at: now
                    },
                    {
                        onConflict: "staff_id"
                    }
                );

            if (error) {

                console.error(
                    "STAFF OFFLINE UPDATE ERROR:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: "Unable to update staff status."
                });
            }

            await recordStaffActivity({
                staffId,
                action: "Logout",
                module: "Admin System",
                page: "Admin System"
            });

            return res.json({
                success: true
            });

        } catch (error) {

            console.error(
                "STAFF OFFLINE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error: "Unable to update staff status."
            });
        }
    }
);
app.post(
    "/api/admin/staff/activity",
    requireStaff,
    async (req, res) => {

        try {

            const staffId =
                req.authUser.id;

            const action =
                String(
                    req.body?.action ||
                    "Accessed"
                ).trim();

            const module =
                String(
                    req.body?.module ||
                    ""
                ).trim();

            const page =
                String(
                    req.body?.page ||
                    ""
                ).trim();

            const details =
                String(
                    req.body?.details ||
                    ""
                ).trim();

            await recordStaffActivity({
                staffId,
                action,
                module:
                    module || null,
                page:
                    page || null,
                details:
                    details || null
            });

            return res.json({
                success: true
            });

        } catch (error) {

            console.error(
                "STAFF ACTIVITY API ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error: "Unable to record staff activity."
            });
        }
    }
);
async function requireStaffPresence(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.substring(7)
            : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Authentication required."
            });
        }

        const {
            data: { user },
            error: userError
        } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: "Invalid or expired session."
            });
        }

        const {
            data: profile,
            error: profileError
        } = await supabaseAdmin
            .from("staff_profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError || !profile) {
            return res.status(403).json({
                success: false,
                error: "Staff profile not found."
            });
        }

        req.authUser = user;
        req.profile = profile;

        next();

    } catch (error) {
        console.error("STAFF PRESENCE AUTH ERROR:", error);

        return res.status(401).json({
            success: false,
            error: "Authentication failed."
        });
    }
}
app.post(
    "/api/admin/staff/presence",
    requireStaffPresence,
    async (req, res) => {

        try {

            const staffId =
                req.authUser.id;

            const staffName =
                req.profile.full_name || "";

            const staffEmail =
                req.profile.email || "";

            const currentPage =
                String(
                    req.body?.page || ""
                ).trim();


            const now =
                new Date().toISOString();


            // Check whether this staff account already
            // has a presence record.

            const {
                data: existingPresence,
                error: lookupError
            } = await supabaseAdmin
                .from("staff_presence")
                .select(`
                    staff_id,
                    is_online,
                    session_started_at
                `)
                .eq("staff_id", staffId)
                .maybeSingle();


            if (lookupError) {

                console.error(
                    "STAFF PRESENCE LOOKUP ERROR:",
                    lookupError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to check staff presence."
                });

            }
            if (!existingPresence) {

                const {
                    error: insertError
                } = await supabaseAdmin
                    .from("staff_presence")
                    .insert({

                        staff_id:
                            staffId,

                        is_online:
                            true,

                        last_active_at:
                            now,

                        current_page:
                            currentPage || null,

                        session_started_at:
                            now,

                        updated_at:
                            now

                    });


                if (insertError) {

                    console.error(
                        "STAFF PRESENCE INSERT ERROR:",
                        insertError
                    );

                    return res.status(500).json({
                        success: false,
                        error:
                            "Unable to start staff presence."
                    });

                }


                await recordStaffActivity({

                    staffId:
                        staffId,

                    staffName:
                        staffName,

                    staffEmail:
                        staffEmail,

                    action:
                        "Online",

                    module:
                        "Admin System",

                    page:
                        currentPage,

                    details:
                        "Staff account became online."

                });


            } else {
                const {
                    error: updateError
                } = await supabaseAdmin
                    .from("staff_presence")
                    .update({

                        is_online:
                            true,

                        last_active_at:
                            now,

                        current_page:
                            currentPage || null,

                        updated_at:
                            now

                    })
                    .eq(
                        "staff_id",
                        staffId
                    );


                if (updateError) {

                    console.error(
                        "STAFF PRESENCE UPDATE ERROR:",
                        updateError
                    );

                    return res.status(500).json({
                        success: false,
                        error:
                            "Unable to update staff presence."
                    });

                }


                // If the previous state was offline,
                // record that the staff member came back online.

                if (
                    existingPresence.is_online === false
                ) {

                    await recordStaffActivity({

                        staffId:
                            staffId,

                        staffName:
                            staffName,

                        staffEmail:
                            staffEmail,

                        action:
                            "Online",

                        module:
                            "Admin System",

                        page:
                            currentPage,

                        details:
                            "Staff account became online again."

                    });

                }

            }


            return res.json({

                success:
                    true,

                online:
                    true,

                last_active_at:
                    now

            });


        } catch (error) {

            console.error(
                "STAFF PRESENCE ERROR:",
                error
            );

            return res.status(500).json({

                success:
                    false,

                error:
                    "Server error while updating staff presence."

            });

        }

    }
);


app.post(
    "/api/admin/staff/presence/offline",
    requireAdmin,
    async (req, res) => {

        try {

            const staffId =
                req.authUser.id;

            const staffName =
                req.profile.full_name || "";

            const staffEmail =
                req.profile.email || "";


            const now =
                new Date().toISOString();


            const {
                data: existingPresence,
                error: lookupError
            } = await supabaseAdmin
                .from("staff_presence")
                .select(`
                    staff_id,
                    is_online
                `)
                .eq(
                    "staff_id",
                    staffId
                )
                .maybeSingle();


            if (lookupError) {

                console.error(
                    "OFFLINE PRESENCE LOOKUP ERROR:",
                    lookupError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to check staff presence."
                });

            }


            const {
                error: updateError
            } = await supabaseAdmin
                .from("staff_presence")
                .upsert({

                    staff_id:
                        staffId,

                    is_online:
                        false,

                    last_active_at:
                        now,

                    current_page:
                        null,

                    updated_at:
                        now

                }, {
                    onConflict:
                        "staff_id"
                });


            if (updateError) {

                console.error(
                    "MARK OFFLINE ERROR:",
                    updateError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to mark staff offline."
                });

            }


            if (
                existingPresence?.is_online === true
            ) {

                await recordStaffActivity({

                    staffId:
                        staffId,

                    staffName:
                        staffName,

                    staffEmail:
                        staffEmail,

                    action:
                        "Offline",

                    module:
                        "Admin System",

                    page:
                        null,

                    details:
                        "Staff account went offline."

                });

            }


            return res.json({

                success:
                    true,

                online:
                    false

            });


        } catch (error) {

            console.error(
                "STAFF OFFLINE ERROR:",
                error
            );

            return res.status(500).json({

                success:
                    false,

                error:
                    "Server error while marking staff offline."

            });

        }

    }
);

app.post(
    "/api/admin/staff/activity",
    requireAdmin,
    async (req, res) => {

        try {

            const staffId =
                req.authUser.id;

            const staffName =
                req.profile.full_name || "";

            const staffEmail =
                req.profile.email || "";


            const action =
                String(
                    req.body?.action || "Accessed"
                ).trim();

            const moduleName =
                String(
                    req.body?.module || ""
                ).trim();

            const pageName =
                String(
                    req.body?.page || ""
                ).trim();

            const details =
                String(
                    req.body?.details || ""
                ).trim();


            await recordStaffActivity({

                staffId:
                    staffId,

                staffName:
                    staffName,

                staffEmail:
                    staffEmail,

                action:
                    action,

                module:
                    moduleName || null,

                page:
                    pageName || null,

                details:
                    details || null

            });


            return res.json({

                success:
                    true

            });


        } catch (error) {

            console.error(
                "STAFF ACTIVITY ERROR:",
                error
            );

            return res.status(500).json({

                success:
                    false,

                error:
                    "Server error while recording staff activity."

            });

        }

    }
);
app.post("/api/admin/staff/create", requireAdmin, async (req, res) => {
    try {
        const { fullName, password } = req.body;
        const email = String(req.body.email || "").trim().toLowerCase();

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                error: "Full name, email, and password are required."
            });
        }

        // Check if this email already exists in staff_profiles
        const { data: existingProfile, error: existingProfileError } =
            await supabase
                .from("staff_profiles")
                .select("id, email")
                .ilike("email", email)
                .maybeSingle();

        if (existingProfileError) {
            console.error("Existing profile check error:", existingProfileError);

            return res.status(500).json({
                success: false,
                error: existingProfileError.message
            });
        }

        if (existingProfile) {
            return res.status(400).json({
                success: false,
                error: "A staff profile with this email already exists."
            });
        }

        // Create Supabase Auth account
        const {
            data: authData,
            error: authError
        } = await supabase.auth.admin.createUser({
                 email,
                 password,
                 email_confirm: true,
                    user_metadata: {
                       full_name: fullName
    }
});

        if (authError) {
            console.error("Auth user creation error:", authError);

            return res.status(400).json({
                success: false,
                error: authError.message
            });
        }

        const staffUser = authData.user;

        console.log("Created Auth user:", staffUser.id);
        const {
            data: autoCreatedProfile,
            error: profileCheckError
        } = await supabase
            .from("staff_profiles")
            .select("id, email, full_name, role, status")
            .eq("id", staffUser.id)
            .maybeSingle();

        if (profileCheckError) {
            console.error("Profile check error:", profileCheckError);

            // Roll back Auth account
            await supabase.auth.admin.deleteUser(staffUser.id);

            return res.status(500).json({
                success: false,
                error: profileCheckError.message
            });
        }

        let profileError = null;

        if (autoCreatedProfile) {
            
            console.log(
                "Profile was automatically created by handle_new_user(). Updating it..."
            );

            const { error } = await supabase
                .from("staff_profiles")
                .update({
                    full_name: fullName,
                    email,
                    role: "staff",
                    verified: true,
                    status: "Active",
                    updated_at: new Date().toISOString()
                })
                .eq("id", staffUser.id);

            profileError = error;

        } else {

    console.log(
        "No automatic profile found. Creating staff profile manually..."
    );

    const {
        error: manualProfileError
    } = await supabase
        .from("staff_profiles")
        .insert({
            id: staffUser.id,
            full_name: fullName,
            email: email,
            role: "staff",
            verified: true,
            status: "Active",
            updated_at: new Date().toISOString()
        });

    if (manualProfileError) {

        console.error(
            "Staff profile creation error:",
            manualProfileError
        );

        await supabase.auth.admin.deleteUser(
            staffUser.id
        );

        return res.status(500).json({
            success: false,
            error: manualProfileError.message
        });
    }
}
    
        if (profileError) {
            console.error("Staff profile error:", profileError);

            // Roll back Auth account
            await supabase.auth.admin.deleteUser(staffUser.id);

            return res.status(500).json({
                success: false,
                error: profileError.message
            });
        }

        console.log("Staff account created successfully:", staffUser.id);

        return res.status(201).json({
            success: true,
            message: "Staff account created successfully.",
            staff: {
                id: staffUser.id,
                full_name: fullName,
                email,
                role: "staff",
                status: "Active"
            }
        });

    } catch (error) {
        console.error("Create staff unexpected error:", error);

        return res.status(500).json({
            success: false,
            error: error.message || "Failed to create staff account."
        });
    }
});
app.get(
    "/api/admin/staff",
    requireAdmin,
    async (req, res) => {

        try {

            const {
                data: staffList,
                error: staffError
            } = await supabaseAdmin
                .from("staff_profiles")
                .select(`
                    id,
                    full_name,
                    email,
                    role,
                    status,
                    avatar_url
                `)
                .order("full_name", {
                    ascending: true
                });


            if (staffError) {

                console.error(
                    "Staff list error:",
                    staffError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load staff list."
                });
            }

            const {
                data: presenceList,
                error: presenceError
            } = await supabaseAdmin
                .from("staff_presence")
                .select(`
                    staff_id,
                    is_online,
                    last_active_at,
                    current_page,
                    session_started_at,
                    updated_at
                `);


            if (presenceError) {

                console.error(
                    "Staff presence list error:",
                    presenceError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load staff presence."
                });
            }

            const presenceMap =
                new Map(
                    (presenceList || []).map(
                        presence => [
                            presence.staff_id,
                            presence
                        ]
                    )
                );
            const now =
                Date.now();

            const ONLINE_TIMEOUT =
                90 * 1000; // 90 seconds


            const staffWithPresence =
                (staffList || []).map(
                    staff => {

                        const presence =
                            presenceMap.get(
                                staff.id
                            );


                        let isOnline = false;


                        if (
                            presence &&
                            presence.is_online === true &&
                            presence.last_active_at
                        ) {

                            const lastActive =
                                new Date(
                                    presence.last_active_at
                                ).getTime();


                            if (
                                !Number.isNaN(lastActive) &&
                                (now - lastActive) <=
                                    ONLINE_TIMEOUT
                            ) {

                                isOnline = true;

                            }

                        }


                        return {

                            ...staff,

                            is_online:
                                isOnline,

                            last_active_at:
                                presence?.last_active_at ||
                                null,

                            current_page:
                                presence?.current_page ||
                                null,

                            session_started_at:
                                presence?.session_started_at ||
                                null,

                            updated_at:
                                presence?.updated_at ||
                                null

                        };

                    }
                );
            console.log(
                "STAFF LIST WITH PRESENCE:",
                staffWithPresence
            );


            return res.json({

                success:
                    true,

                staff:
                    staffWithPresence

            });


        } catch (error) {

            console.error(
                "Get staff error:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Server error while loading staff."

            });

        }

    }
);
app.get(
    "/api/admin/staff/activity-logs",
    requireAdmin,
    async (req, res) => {

        try {

            const staffId =
                String(
                    req.query.staff_id ||
                    ""
                ).trim();

            let query =
                supabaseAdmin
                    .from("staff_activity_logs")
                    .select(`
                        id,
                        staff_id,
                        staff_name,
                        staff_email,
                        action,
                        module,
                        page,
                        details,
                        created_at
                    `)
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    )
                    .limit(200);

            if (staffId) {

                query =
                    query.eq(
                        "staff_id",
                        staffId
                    );
            }

            const {
                data: logs,
                error
            } = await query;

            if (error) {

                console.error(
                    "STAFF ACTIVITY LOGS ERROR:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load staff activity logs."
                });
            }

            return res.json({

                success:
                    true,

                logs:
                    logs || []

            });

        } catch (error) {

            console.error(
                "GET STAFF LOGS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Unable to load staff activity logs."
            });
        }
    }
);
app.delete(
    "/api/admin/staff/:staffId",
    requireAdmin,
    async (req, res) => {
        try {
            const { staffId } = req.params;

            console.log("====================================");
            console.log("DELETE STAFF ACCOUNT");
            console.log("STAFF ID:", staffId);
            console.log("ADMIN ID:", req.authUser.id);
            console.log("====================================");

            if (!staffId) {
                return res.status(400).json({
                    success: false,
                    error: "Staff ID is required."
                });
            }

            // Prevent admin from deleting themselves
            if (staffId === req.authUser.id) {
                return res.status(400).json({
                    success: false,
                    error: "You cannot delete your own account."
                });
            }
            const {
                data: staff,
                error: staffError
            } = await supabaseAdmin
                .from("staff_profiles")
                .select("id, full_name, email, role, status")
                .eq("id", staffId)
                .maybeSingle();

            if (staffError) {
                console.error(
                    "STAFF PROFILE ERROR:",
                    staffError
                );

                return res.status(500).json({
                    success: false,
                    error: staffError.message
                });
            }

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    error: "Staff account not found."
                });
            }

            console.log("TARGET STAFF:", staff);

            if (
                staff.role &&
                staff.role.toLowerCase() === "admin"
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Administrator accounts cannot be deleted."
                });
            }
            console.log(
                "Disabling Auth account:",
                staffId
            );

            const {
                data: disabledUser,
                error: disableError
            } = await supabaseAdmin.auth.admin.updateUserById(
                staffId,
                {
                    ban_duration: "876000h"
                }
            );

            if (disableError) {

                console.error(
                    "AUTH ACCOUNT DISABLE ERROR:",
                    disableError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        disableError.message ||
                        "Unable to disable staff authentication account."
                });
            }

            console.log(
                "AUTH ACCOUNT DISABLED:",
                disabledUser?.user?.id
            );
            const {
                error: historyError
            } = await supabaseAdmin
                .from("login_history")
                .delete()
                .eq("staff_id", staffId);

            if (historyError) {

                console.warn(
                    "LOGIN HISTORY CLEANUP ERROR:",
                    historyError
                );

            }
            const {
                error: profileDeleteError
            } = await supabaseAdmin
                .from("staff_profiles")
                .delete()
                .eq("id", staffId);

            if (profileDeleteError) {

                console.error(
                    "STAFF PROFILE DELETE ERROR:",
                    profileDeleteError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Account was disabled, but the staff profile could not be removed: " +
                        profileDeleteError.message
                });
            }

            console.log(
                "STAFF PROFILE REMOVED:",
                staffId
            );

            console.log(
                "STAFF ACCOUNT SUCCESSFULLY REMOVED FROM SYSTEM"
            );

            return res.json({
                success: true,
                message:
                    "Staff account deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE STAFF ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error?.message ||
                    "Unable to delete staff account."
            });
        }
    }
);
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Captured server is running"
    });
});
app.get("/health", (req, res) => {
    res.json({
        success: true,
        server: "online"
    });
});

function generateOTP() {
    return Math.floor(
        100000 + Math.random() * 900000
    ).toString();
}

app.post(
    "/api/admin/staff/:staffId/signout",
    requireAdmin,
    async (req, res) => {

        try {

            console.log("======================================");
            console.log("ADMIN STAFF SIGN OUT REQUEST");
            console.log("TARGET STAFF ID:", req.params.staffId);

            const { staffId } = req.params;
            if (!staffId) {
                return res.status(400).json({
                    success: false,
                    error: "Staff account ID is required."
                });
            }

            if (staffId === req.authUser.id) {
                return res.status(400).json({
                    success: false,
                    error:
                        "You cannot sign out your own account using this button."
                });
            }
            const {
                data: targetStaff,
                error: targetError
            } = await supabaseAdmin
                .from("staff_profiles")
                .select(`
                    id,
                    full_name,
                    email,
                    role
                `)
                .eq("id", staffId)
                .maybeSingle();

            if (targetError) {

                console.error(
                    "TARGET STAFF LOOKUP ERROR:",
                    targetError
                );

                return res.status(500).json({
                    success: false,
                    error: targetError.message
                });
            }

            if (!targetStaff) {

                return res.status(404).json({
                    success: false,
                    error: "Selected staff account was not found."
                });
            }

            console.log(
                "TARGET STAFF:",
                targetStaff.full_name,
                targetStaff.email
            );
            const signOutTime =
                new Date().toISOString();

            const {
                error: updateError
            } = await supabaseAdmin
                .from("staff_profiles")
                .update({
                    force_signout_at: signOutTime
                })
                .eq("id", staffId);

            if (updateError) {

                console.error(
                    "FORCE SIGN OUT DATABASE ERROR:",
                    updateError
                );

                return res.status(500).json({
                    success: false,
                    error: updateError.message
                });
            }

            console.log(
                "STAFF FORCE SIGN OUT SET:",
                targetStaff.email,
                signOutTime
            );

const { error: activityError } = await supabaseAdmin
    .from("staff_activity_logs")
    .insert({
        staff_id: targetStaff.id,
        staff_name: targetStaff.full_name || targetStaff.email,
        staff_email: targetStaff.email,
        role: targetStaff.role || "staff",
        action: "LOGOUT",
        details: {
            reason: "FORCED_SIGNOUT",
            initiated_by: req.authUser.id
        }
    });

if (activityError) {
    console.error("FORCED LOGOUT ACTIVITY ERROR:", activityError);
} else {
    console.log("FORCED LOGOUT ACTIVITY RECORDED:", targetStaff.email);
}

            console.log("======================================");

            return res.json({
                success: true,
                message:
                    `${targetStaff.full_name || targetStaff.email} has been signed out successfully.`,
                staff: {
                    id: targetStaff.id,
                    full_name: targetStaff.full_name,
                    email: targetStaff.email
                }
            });

        } catch (error) {

            console.error(
                "ADMIN STAFF SIGN OUT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Internal server error."
            });
        }
    }
);
app.post("/send-otp", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        if (!resend) {
            return res.status(500).json({
                success: false,
                message: "RESEND_API_KEY is not configured."
            });
        }

        const otp = generateOTP();

        console.log("Generated OTP:", otp);

        const { error: deleteError } = await supabase
            .from("otp_verifications")
            .delete()
            .eq("email", email);

        if (deleteError) {
            console.error(
                "Delete old OTP error:",
                deleteError
            );
        }
        const { error: dbError } = await supabase
            .from("otp_verifications")
            .insert({
                email,
                otp
            });

        if (dbError) {

            console.error(
                "OTP database error:",
                dbError
            );

            return res.status(500).json({
                success: false,
                message: dbError.message
            });
        }

        const { error: emailError } =
            await resend.emails.send({

                from: RESEND_FROM_EMAIL,

                to: [email],

                subject:
                    "Your Verification Code",

                html: `
                    <div style="font-family: Arial, sans-serif;">
                        <h2>Captured Photo Studio</h2>

                        <p>Your verification code is:</p>
                        <h1>${otp}</h1>

                        <p>
                            This code expires in 5 minutes.
                        </p>
                    </div>
                `
            });

        if (emailError) {

            console.error(
                "Resend error:",
                emailError
            );

            return res.status(500).json({
                success: false,
                message: emailError.message
            });
        }

        return res.json({
            success: true,
            message: "OTP Sent"
        });

    } catch (error) {

        console.error(
            "OTP server error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});



function money(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return null;
    }

    return Number(number.toFixed(2));
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function validateEmail(email) {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if(!emailPattern.test(normalizedEmail)) {
        return null;
    }
    return normalizedEmail;
}
app.post("/send-booking-confirmation", async (req, res) => {
    try {
        const {
            email,
            name,
            bookingId,
            bookingDate,
            bookingTime,
            sessionType,
            totalPrice,
            downpaymentAmount,
            remainingBalance,
            galleryLink
        } = req.body;

                    
            const recipientEmail = validateEmail(email);

            if (!recipientEmail) {
                return res.status(400).json({
                    success: false,
                    message: "A valid customer email address is required."
                });
            }

            if (!resend || !RESEND_FROM_EMAIL) {
                return res.status(500).json({
                    success: false,
                    message: "Email service or sender address is not configured."
                });
            }

           // console.log("BOOKING CONFIRMATION RECIPIENT:", recipientEmail);
            
            const safeGalleryLink = galleryLink
                ? escapeHtml(galleryLink)
                : "";
        const formattedDate = bookingDate
            ? new Date(`${bookingDate}T00:00:00`).toLocaleDateString(
                "en-US",
                {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            )
            : "-";

        const formattedTime = bookingTime
            ? new Date(`1970-01-01T${bookingTime}`).toLocaleTimeString(
                "en-US",
                {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                }
            )
            : "-";

        const { data, error } = await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: [recipientEmail],
            subject: "Booking Confirmation - Captured Photography Studio",
            html: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:650px;margin:auto;">
                    <h2 style="color:#639A88;">
                        Booking Confirmed
                    </h2>

                    <p>
                        Hello ${escapeHtml(name) || "Customer"},
                    </p>

                    <p>
                        Your booking request has been confirmed by Captured Photography Studio. 
                    </p>
                    <p>
                        We're excited to capture your special moments and make your photography experience memorable.                    </p>
                    <div style="background:#f6f8f7;padding:20px;border-radius:10px;margin:20px 0;">
                        <p><strong>Booking ID:</strong> ${escapeHtml(bookingId) || "-"}</p>
                        <p><strong>Session:</strong> ${escapeHtml(sessionType) || "-"}</p>
                        <p><strong>Date:</strong> ${escapeHtml(formattedDate)}</p>
                        <p><strong>Time:</strong> ${escapeHtml(formattedTime)}</p>
                        <p><strong>Total Price:</strong> ₱${Number(totalPrice || 0).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}</p>
                        <p><strong>Downpayment:</strong> ₱${Number(downpaymentAmount || 0).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}</p>
                        <p><strong>Remaining Balance:</strong> ₱${Number(remainingBalance || 0).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}</p>
                    </div>

                  ${
                        safeGalleryLink
                            ? `
                                <p>Your customer gallery access link is available below:</p>
                                <p>
                                    <a href="${safeGalleryLink}"
                                    style="display:inline-block;padding:12px 20px;background:#639A88;color:white;text-decoration:none;border-radius:6px;">
                                        Open Customer Gallery
                                    </a>
                                </p>
                            `
                            : ""
                    }

                    <p>
                        Please keep this email for your booking records.
                    </p>

                    <p>
                        Thank you for choosing Captured Photography Studio.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error("RESEND CONFIRMATION ERROR:", error);

            return res.status(500).json({
                success: false,
                message: error.message || "Failed to send booking confirmation email."
            });
        }

        return res.json({
            success: true,
            message: "Booking confirmation email sent successfully.",
            data
        });

    } catch (error) {
        console.error("SEND BOOKING CONFIRMATION ERROR:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to send booking confirmation email."
        });
    }
});
app.post("/send-gallery-ready", async (req, res) => {
    try {
        const {
            email,
            name,
            bookingId,
            sessionType,
            galleryLink
        } = req.body;

        if (!email || !galleryLink) {
            return res.status(400).json({
                success: false,
                message: "Email and gallery link are required."
            });
        }

        if (!process.env.RESEND_API_KEY ||
            !process.env.RESEND_FROM_EMAIL) {
            console.error(
                "Missing Resend environment configuration."
            );

            return res.status(500).json({
                success: false,
                message: "Email service is not configured."
            });
        }

        // Panatilihin dito ang kasalukuyan mong
        // Resend email-sending implementation.

    } catch (error) {
        console.error("SEND GALLERY READY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send gallery-ready email."
        });
    }
});


app.post("/send-booking-rejection", async (req, res) => {
    try {
        const {
            email,
            name,
            bookingId,
            bookingDate,
            bookingTime,
            sessionType,
            rejectionReason
        } = req.body;

        const recipientEmail = validateEmail(email);

        if (!recipientEmail) {
            return res.status(400).json({
                success: false,
                message: "A valid customer email address is required."
            });
        }

        console.log("BOOKING REJECTION RECIPIENT:", recipientEmail);
        // Validate Resend configuration
        if (!resend) {
            console.error("RESEND ERROR: Resend is not initialized.");
            return res.status(500).json({
                success: false,
                message: "Email service is not configured."
            });
        }

        if (!RESEND_FROM_EMAIL) {
            console.error("RESEND ERROR: RESEND_FROM_EMAIL is missing.");
            return res.status(500).json({
                success: false,
                message: "Email sender is not configured."
            });
        }

        const formattedDate = bookingDate
            ? new Date(`${bookingDate}T00:00:00`).toLocaleDateString(
                "en-US",
                {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            )
            : "-";

        const formattedTime = bookingTime
            ? new Date(`1970-01-01T${bookingTime}`).toLocaleTimeString(
                "en-US",
                {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                }
            )
            : "-";

        console.log("Sending rejection email...");
        console.log("To:", recipientEmail);
        console.log("From:", RESEND_FROM_EMAIL);
        console.log("Booking ID:", bookingId);

        const { data, error } = await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: [recipientEmail],
            subject: "Booking Request Update - Captured Photography Studio",
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: auto;">

                    <h2 style="color:#639A88;">
                        Booking Request Update
                    </h2>

                    <p>
                        Hello ${name || "Customer"},
                    </p>

                    <p>
                        We are sorry to inform you that your booking request could not be accepted at this time.
                    </p>

                    <div style="background:#f6f8f7;padding:20px;border-radius:10px;margin:20px 0;">
                        <p>
                            <strong>Booking ID:</strong>
                            ${bookingId || "-"}
                        </p>

                        <p>
                            <strong>Session:</strong>
                            ${sessionType || "-"}
                        </p>

                        <p>
                            <strong>Date:</strong>
                            ${formattedDate}
                        </p>

                        <p>
                            <strong>Time:</strong>
                            ${formattedTime}
                        </p>
                    </div>

                    <div style="background:#fff4f4;border-left:4px solid #c94c4c;padding:15px;margin:20px 0;">
                        <strong>Reason for rejection:</strong>

                        <p style="margin-bottom:0;">
                            ${rejectionReason || "No reason was provided."}
                        </p>
                    </div>

                    <p>
                        If you have any questions regarding this booking,
                        please contact Captured Photography Studio.
                    </p>

                    <p>
                        Thank you for understanding.
                    </p>

                </div>
            `
        });

        if (error) {
            console.error("RESEND REJECTION ERROR:", error);

            return res.status(500).json({
                success: false,
                message: error.message || "Failed to send rejection email."
            });
        }

        console.log(
            "Booking rejection email sent successfully:",
            data?.id
        );

        return res.json({
            success: true,
            message: "Booking rejection email sent successfully.",
            data
        });

    } catch (error) {
        console.error(
            "SEND BOOKING REJECTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to send rejection email."
        });
    }
});
app.post("/api/paymongo/create-checkout", async (req, res) => {

    try {

   const {
    customer_id,
    full_name,
    email,
    contact_number,
    booking_date,
    booking_time,
    session_type,
    notes,
    payment_method,
    total_price,
    downpayment_amount,
    backdrops,
    addons,
    booking_duration
} = req.body;
       
 const missingFields = [];

if (!full_name || !String(full_name).trim()) {
    missingFields.push("full_name");
}

if (!email || !String(email).trim()) {
    missingFields.push("email");
}

if (!contact_number || !String(contact_number).trim()) {
    missingFields.push("contact_number");
}

if (!booking_date || !String(booking_date).trim()) {
    missingFields.push("booking_date");
}

if (!booking_time || !String(booking_time).trim()) {
    missingFields.push("booking_time");
}

if (!session_type || !String(session_type).trim()) {
    missingFields.push("session_type");
}

if (missingFields.length > 0) {
    console.log("❌ Missing required fields:", missingFields);
    console.log("📦 Received request body:", req.body);

    return res.status(400).json({
        success: false,
        error: "Missing required booking information.",
        missing_fields: missingFields
    });
}


        if (payment_method !== "PayMongo") {

            return res.status(400).json({
                success: false,
                error: "Invalid payment method."
            });

        }
const totalPrice = Number(total_price);
const downpayment = Number(downpayment_amount);

if (
    !Number.isFinite(totalPrice) ||
    totalPrice <= 0
) {
    return res.status(400).json({
        success: false,
        error: "Invalid total booking price."
    });
}

if (
    !Number.isFinite(downpayment) ||
    downpayment <= 0 ||
    downpayment > totalPrice
) {
    return res.status(400).json({
        success: false,
        error: "Invalid down payment amount."
    });
}

const remainingBalance = Number(
    (totalPrice - downpayment).toFixed(2)
);

const amountInCentavos =
    Math.round(downpayment * 100);
        const selectedBackdrops =
            Array.isArray(backdrops)
                ? backdrops
                : [];

        const selectedAddons =
            Array.isArray(addons)
                ? addons
                : [];

        const duration = Number(booking_duration);

            if (!Number.isFinite(duration) || duration <= 0) {
             return res.status(400).json({
              success: false,
              error: "Invalid booking duration."
              });         
            }           

        const bookingReference =
            `CAPTURED-${Date.now()}-${crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase()}`;


        console.log(
            "Payment reference:",
            bookingReference
        );


        const {
            data: existingBookings,
            error: existingBookingError
        } = await supabase
            .from("bookings")
            .select(`
                id,
                booking_date,
                booking_time,
                status,
                payment_status,
                session_type,
                addons,
                booking_duration
            `)
            .eq("booking_date", booking_date);


        if (existingBookingError) {

            console.error(
                "Existing booking check error:",
                existingBookingError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to check booking availability."
            });

        }
        function timeToMinutes(time) {

            const [hours, minutes] =
                String(time)
                    .slice(0, 5)
                    .split(":")
                    .map(Number);

            return (hours * 60) + minutes;
        }
        const requestedStart =
            timeToMinutes(booking_time);

       const BOOKING_PREPARATION_TIME = 5;

const requestedEnd =
    requestedStart + duration + BOOKING_PREPARATION_TIME;

        const conflictingBooking =
            (existingBookings || []).find(booking => {

                const status =
                    (booking.status || "")
                        .toLowerCase()
                        .trim();

                const paymentStatus =
                    (booking.payment_status || "")
                        .toLowerCase()
                        .trim();

                if (
                    status === "cancelled" ||
                    status === "canceled" ||
                    status === "rejected" ||
                    status === "declined"
                ) {
                    return false;
                }
                if (
                    status === "cancelled" ||
                    status === "canceled" ||
                    status === "rejected" ||
                    status === "declined" ||
                    paymentStatus === "payment failed"
                ) {
                    return false;
                }
              const existingDuration =
    Number(booking.booking_duration);

if (!Number.isFinite(existingDuration) || existingDuration <= 0) {
    return false;
}

                const existingStart =
                    timeToMinutes(
                        booking.booking_time
                    );


              const existingEnd =
    existingStart +
    existingDuration +
    BOOKING_PREPARATION_TIME;


                return (
                    requestedStart < existingEnd &&
                    requestedEnd > existingStart
                );

            });


        if (conflictingBooking) {

            console.log(
                "Booking conflict:",
                conflictingBooking.id
            );

            return res.status(409).json({
                success: false,
                error:
                    "This time slot is no longer available. Please select another time."
            });

        }
    const bookingDataToSave = {
    customer_id: customer_id || null,
    full_name: String(full_name).trim(),
    contact_number: String(contact_number).trim(),
    email: String(email).trim(),
    booking_date,
    booking_time,
    session_type,
    notes: notes || null,
    payment_method: "PayMongo",
    total_price: Number(totalPrice.toFixed(2)),
    downpayment_amount: Number(downpayment.toFixed(2)),
    remaining_balance: Number(remainingBalance.toFixed(2)),
    payment_status: "Down Payment",
    status: "Down Payment",
    backdrops: selectedBackdrops,
    addons: selectedAddons,
    booking_duration: duration
};

const {
    data: pendingCheckout,
    error: pendingCheckoutError
} = await supabase
    .from("pending_booking_checkouts")
    .insert({
        booking_reference: bookingReference,
        customer_id: customer_id || null,
        booking_data: bookingDataToSave,
        expected_amount_centavos: amountInCentavos,
        payment_status: "Pending Payment"
    })
    .select()
    .single();

if (pendingCheckoutError) {
    console.error(
        "Failed to create pending checkout:",
        pendingCheckoutError
    );

    return res.status(500).json({
        success: false,
        error: "Unable to prepare the payment checkout."
    });
}

console.log(
    "Temporary checkout created:",
    pendingCheckout.id
);
   const response = await fetch(
    "https://api.paymongo.com/v1/checkout_sessions",
    {
        method: "POST",
        headers: {
            "Authorization":
                `Basic ${Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString("base64")}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            data: {
                attributes: {
                    line_items: [
                        {
                            currency: "PHP",
                            amount: amountInCentavos,
                            name: `Reservation Down Payment - ${session_type}`,
                            quantity: 1
                        }
                    ],
                    payment_method_types: ["qrph"],
                    billing: {
                        name: full_name,
                        email: email,
                        phone: contact_number
                    },
                    description:
                        `Reservation down payment - ${session_type} - ${booking_date} ${booking_time}`,
                    reference_number: bookingReference,
                    metadata: {
                        pending_checkout_id: String(pendingCheckout.id),
                        booking_reference: bookingReference
                    },
                    send_email_receipt: true,
                    show_description: true,
                    success_url:
                        `${process.env.FRONTEND_URL}/frontend-customer/customer_booking.html?reference=${encodeURIComponent(bookingReference)}`,
                    cancel_url:
                        `${process.env.FRONTEND_URL}/frontend-customer/customer_payment_cancelled.html?reference=${encodeURIComponent(bookingReference)}`
                }
            }
        })
    }
);

const paymongoData = await response.json();

console.log("PAYMONGO HTTP STATUS:", response.status);
console.log("PAYMONGO HTTP OK:", response.ok);
console.log(
    "PAYMONGO RESPONSE:",
    JSON.stringify(paymongoData, null, 2)
);


if (!response.ok) {
    console.error("PayMongo API error:", paymongoData);

    // No final booking exists yet.
    // Keep the checkout record for troubleshooting.
    await supabase
        .from("pending_booking_checkouts")
        .update({
            payment_status: "Payment Failed"
        })
        .eq("id", pendingCheckout.id)
        .neq("payment_status", "Paid");

    return res.status(502).json({
        success: false,
        error: "PayMongo checkout creation failed.",
        message:
            paymongoData?.errors?.[0]?.detail ||
            paymongoData?.message ||
            "Unable to create PayMongo checkout."
    });
}

const checkoutSession = paymongoData?.data;
const checkoutUrl = checkoutSession?.attributes?.checkout_url;

if (!checkoutUrl || !checkoutSession?.id) {
    console.error(
        "PayMongo did not return a valid checkout URL or session ID."
    );

   if (pendingCheckout?.id) {
  await supabase
    .from("pending_booking_checkouts")
    .update({
      payment_status: "Payment Failed"
    })
    .eq("id", pendingCheckout.id)
    .neq("payment_status", "Paid");
}

    return res.status(502).json({
        success: false,
        error: "PayMongo did not return a valid checkout session."
    });
}

const {
    error: updatePendingError
} = await supabase
    .from("pending_booking_checkouts")
    .update({
        checkout_session_id: checkoutSession.id
    })
    .eq("id", pendingCheckout.id);

if (updatePendingError) {
    console.error(
        "Failed to save PayMongo checkout ID:",
        updatePendingError
    );

    return res.status(500).json({
        success: false,
        error: "Unable to save the PayMongo checkout reference."
    });
}


console.log("PayMongo checkout successfully created.");

return res.json({
    success: true,
    pending_checkout_id: pendingCheckout.id,
    checkout_url: checkoutUrl,
    checkout_session_id: checkoutSession.id,
    reference: bookingReference
});


    }
    catch (error) {

        console.error(
            "Create PayMongo checkout error:",
            error
        );

        return res.status(500).json({

            success:
                false,

            error:
                "Internal server error.",

            message:
                error.message

        });

    }

});

app.post("/api/paymongo/webhook", async (req, res) => {
    try {
       console.log("PAYMONGO WEBHOOK RECEIVED:", {
    receivedAt: new Date().toISOString(),
    eventType: req.body?.data?.attributes?.type,
    reference:
        req.body?.data?.attributes?.data?.attributes?.reference_number,
    checkoutSessionId:
        req.body?.data?.attributes?.data?.id
});
        const event = req.body;
        const signatureHeader =
            req.headers["paymongo-signature"];
const webhookSecret =
    process.env.PAYMONGO_BOOKING_WEBHOOK_SECRET ||
    process.env.PAYMONGO_WEBHOOK_SECRET;
        if (
            !signatureHeader ||
            !req.rawBody ||
            !webhookSecret
        ) {
            console.error(
                "Missing signature, raw body, or webhook secret."
            );

            return res.status(400).json({
                success: false,
                error: "Unable to verify PayMongo webhook."
            });
        }

        const signatureParts = signatureHeader
            .split(",")
            .map(part => part.trim());

        const timestampPart = signatureParts.find(
            part => part.startsWith("t=")
        );

        const testSignaturePart = signatureParts.find(
            part => part.startsWith("te=")
        );

        const liveSignaturePart = signatureParts.find(
            part => part.startsWith("li=")
        );

        const timestamp = timestampPart
            ? timestampPart.slice(2)
            : null;

        const isLiveMode =
    event?.data?.attributes?.data?.attributes?.livemode === true;
        const receivedSignature = isLiveMode
            ? liveSignaturePart?.slice(3)
            : testSignaturePart?.slice(3);

        if (!timestamp || !receivedSignature) {
            return res.status(400).json({
                success: false,
                error: "Invalid PayMongo signature format."
            });
        }

        const signedPayload = Buffer.concat([
            Buffer.from(`${timestamp}.`, "utf8"),
            req.rawBody
        ]);

        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(signedPayload)
            .digest("hex");

        const receivedBuffer = Buffer.from(
            receivedSignature,
            "hex"
        );

        const expectedBuffer = Buffer.from(
            expectedSignature,
            "hex"
        );

        const signatureIsValid =
            receivedBuffer.length > 0 &&
            receivedBuffer.length === expectedBuffer.length &&
            crypto.timingSafeEqual(
                receivedBuffer,
                expectedBuffer
            );

        if (!signatureIsValid) {
            console.error(
                "PayMongo webhook signature verification failed."
            );

            return res.status(400).json({
                success: false,
                error: "Invalid webhook signature."
            });
        }

        console.log(
            "PayMongo webhook signature verified."
        );

        // =========================================
        // 2. READ EVENT DETAILS
        // =========================================
        const eventType =
            event?.data?.attributes?.type;

        const resource =
            event?.data?.attributes?.data;

        const checkoutSessionId =
            resource?.id || null;

        const attributes =
            resource?.attributes || {};

        if (
            eventType !== "checkout_session.payment.paid" &&
            eventType !== "checkout_session.payment.failed"
        ) {
            console.log(
                "Ignoring unrelated PayMongo event:",
                eventType
            );

            return res.status(200).json({
                success: true,
                message: "Event ignored."
            });
        }

        const reference =
            attributes?.reference_number ||
            attributes?.metadata?.booking_reference ||
            null;

        if (!reference && !checkoutSessionId) {
            return res.status(400).json({
                success: false,
                error: "Missing checkout reference and session ID."
            });
        }

        console.log("Webhook event:", eventType);
        console.log("Reference:", reference);
        console.log("Checkout session:", checkoutSessionId);

        let pendingCheckout = null;

        if (reference) {
            const {
                data,
                error
            } = await supabase
                .from("pending_booking_checkouts")
                .select("*")
                .eq("booking_reference", reference)
                .maybeSingle();

            if (error) {
                console.error(
                    "Temporary checkout lookup failed:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: "Unable to retrieve pending checkout."
                });
            }

            pendingCheckout = data;
        }

        if (!pendingCheckout && checkoutSessionId) {
            const {
                data,
                error
            } = await supabase
                .from("pending_booking_checkouts")
                .select("*")
                .eq("checkout_session_id", checkoutSessionId)
                .maybeSingle();

            if (error) {
                console.error(
                    "Checkout session lookup failed:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: "Unable to retrieve checkout session."
                });
            }

            pendingCheckout = data;
        }

        if (!pendingCheckout) {
            console.error(
                "No matching temporary checkout found."
            );

            return res.status(404).json({
                success: false,
                error: "Pending checkout not found."
            });
        }

        if (
            pendingCheckout.checkout_session_id &&
            checkoutSessionId &&
            pendingCheckout.checkout_session_id !== checkoutSessionId
        ) {
            console.error(
                "Checkout session ID does not match temporary checkout."
            );

            return res.status(400).json({
                success: false,
                error: "Checkout session mismatch."
            });
        }

        const bookingData =
            pendingCheckout.booking_data;

        if (
            !bookingData ||
            typeof bookingData !== "object"
        ) {
            console.error(
                "Temporary checkout has invalid booking data."
            );

            return res.status(500).json({
                success: false,
                error: "Pending booking details are invalid."
            });
        }
        if (
            eventType === "checkout_session.payment.failed"
        ) {
            const {
                error
            } = await supabase
                .from("pending_booking_checkouts")
                .update({
                    payment_status: "Payment Failed"
                })
                .eq("id", pendingCheckout.id)
                .neq("payment_status", "Paid");

            if (error) {
                console.error(
                    "Failed to update temporary checkout:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: "Unable to record failed payment."
                });
            }

            console.log(
                "Payment failed. No final booking was created."
            );

            return res.status(200).json({
                success: true,
                message: "Failed payment event processed."
            });
        }

const payments = Array.isArray(attributes?.payments)
    ? attributes.payments
    : [];

console.log("PAYMONGO CHECKOUT PAYMENT DETAILS:", {
    eventType,
    checkoutSessionId,
    reference,
    payments: payments.map(p => ({
        id: p.id,
        status: p.attributes?.status,
        amount: p.attributes?.amount,
        currency: p.attributes?.currency,
        paid_at: p.attributes?.paid_at
    }))
});

// Select the payment PayMongo actually marked as paid.
const payment = payments.find(
    p => String(p.attributes?.status || "").toLowerCase() === "paid"
);

if (!payment) {
    console.error(
        "No payment with status 'paid' was found in the webhook."
    );

    return res.status(200).json({
        success: true,
        payment_verified: false,
        message: "Waiting for a confirmed paid transaction."
    });
}

const paymentId = payment.id;


        const paidAmountCentavos =
            Number(payment?.attributes?.amount);

        const expectedAmountCentavos =
            Number(
                pendingCheckout.expected_amount_centavos
            );

        const paymentCurrency = String(
            payment?.attributes?.currency || ""
        ).toUpperCase();

        if (!paymentId) {
            console.error(
                "Paid event does not contain a payment ID."
            );

            return res.status(400).json({
                success: false,
                error: "Payment ID is missing."
            });
        }

        if (
            !Number.isSafeInteger(paidAmountCentavos) ||
            !Number.isSafeInteger(expectedAmountCentavos) ||
            expectedAmountCentavos <= 0 ||
            paidAmountCentavos !== expectedAmountCentavos
        ) {
            console.error(
                "Payment amount does not match checkout amount.",
                {
                    paidAmountCentavos,
                    expectedAmountCentavos
                }
            );

            return res.status(400).json({
                success: false,
                error: "Payment amount verification failed."
            });
        }

        if (paymentCurrency !== "PHP") {
            console.error(
                "Unexpected payment currency:",
                paymentCurrency
            );

            return res.status(400).json({
                success: false,
                error: "Payment currency verification failed."
            });
        }

        const totalBookingAmount =
            Number(bookingData.total_price) || 0;

        const downPaymentAmount =
            Number(bookingData.downpayment_amount) || 0;

        if (
            totalBookingAmount <= 0 ||
            downPaymentAmount <= 0 ||
            downPaymentAmount > totalBookingAmount ||
            Math.round(downPaymentAmount * 100) !== expectedAmountCentavos
        ) {
            return res.status(400).json({
                success: false,
                error: "Booking amount verification failed."
            });
        }

       
        // Save the payment only after PayMongo verification succeeds.
        const paidAt =
            payment?.attributes?.paid_at
                ? new Date(
                    payment.attributes.paid_at * 1000
                ).toISOString()
                : new Date().toISOString();

        const { data: updatedCheckout, error: updateError } =
            await supabase
                .from("pending_booking_checkouts")
                .update({
                    payment_status: "Paid",
                    paid_at: paidAt,
                    paymongo_payment_id: paymentId,
                    checkout_session_id:
                        checkoutSessionId ||
                        pendingCheckout.checkout_session_id
                })
                .eq("id", pendingCheckout.id)
                .select()
                .single();

        if (updateError || !updatedCheckout) {
            console.error("Could not save verified PayMongo payment:", {
                reference: pendingCheckout.booking_reference,
                checkoutId: pendingCheckout.id,
                error: updateError
            });

            return res.status(500).json({
                success: false,
                error: "Payment was received but could not be recorded."
            });
        }

        console.log("PAYMENT VERIFIED:", {
            reference: updatedCheckout.booking_reference,
            paymentId: updatedCheckout.paymongo_payment_id,
            checkoutSessionId: updatedCheckout.checkout_session_id,
            paymentStatus: updatedCheckout.payment_status,
            paidAt: updatedCheckout.paid_at
        });


        return res.status(200).json({
            success: true,
            message: "Payment verified. Awaiting customer booking confirmation."
        });
      
   } catch (error) {
    console.error("PayMongo webhook processing error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
    });

    return res.status(500).json({
        success: false,
        error: "Internal webhook processing error.",
        message: error.message
    });
}
});

async function reconcilePayMongoCheckout(checkout) {
    const secretKey = process.env.PAYMONGO_SECRET_KEY;

    if (!secretKey) {
        throw new Error("PAYMONGO_SECRET_KEY is not configured.");
    }

    if (!checkout?.checkout_session_id) {
        console.log("Reconciliation skipped: no Checkout Session ID.");
        return checkout;
    }

    // Retrieve the session directly from PayMongo.
    const response = await fetch(
        `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(
            checkout.checkout_session_id
        )}`,
        {
            method: "GET",
            headers: {
                Authorization:
                    `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
                Accept: "application/json"
            }
        }
    );

    const result = await response.json();

    if (!response.ok) {
        console.error("PayMongo Checkout Session retrieval failed:", {
            status: response.status,
            message: result?.errors?.[0]?.detail || "Request failed"
        });

        throw new Error("Unable to verify Checkout Session with PayMongo.");
    }

    const session = result?.data;
    const attributes = session?.attributes || {};

    if (session?.id !== checkout.checkout_session_id) {
        throw new Error("PayMongo returned a different Checkout Session.");
    }

    // Do not allow a session for a different booking to be used.
    const sessionReference = String(
        attributes.reference_number ||
        attributes.metadata?.booking_reference ||
        ""
    ).trim();

    if (
        sessionReference &&
        sessionReference !== checkout.booking_reference
    ) {
        throw new Error("PayMongo reference does not match this booking.");
    }

    const payments = Array.isArray(attributes.payments)
        ? attributes.payments
        : [];

    const paidPayment = payments.find(
        payment =>
            String(payment?.attributes?.status || "").toLowerCase() === "paid"
    );

    // A successful API request does not mean payment was successful.
    if (!paidPayment) {
        console.log("PayMongo has not confirmed a paid transaction:", {
            reference: checkout.booking_reference,
            checkoutSessionId: session?.id,
            paymentStatuses: payments.map(payment => ({
                id: payment?.id,
                status: payment?.attributes?.status
            }))
        });

        return checkout;
    }

    const paymentAttributes = paidPayment.attributes || {};
    const paymentId = paidPayment.id;
    const paidAmount = Number(paymentAttributes.amount);
    const expectedAmount = Number(checkout.expected_amount_centavos);
    const currency = String(paymentAttributes.currency || "").toUpperCase();

    if (!paymentId) {
        throw new Error("Verified PayMongo payment has no payment ID.");
    }

    if (
        !Number.isSafeInteger(paidAmount) ||
        !Number.isSafeInteger(expectedAmount) ||
        expectedAmount <= 0 ||
        paidAmount !== expectedAmount
    ) {
        throw new Error("PayMongo payment amount does not match the booking.");
    }

    if (currency !== "PHP") {
        throw new Error("PayMongo payment currency is not PHP.");
    }

    // Also validate the saved booking's downpayment amount.
    const bookingData = checkout.booking_data || {};
    const downpayment = Number(bookingData.downpayment_amount);
    const totalPrice = Number(bookingData.total_price);

    if (
        !Number.isFinite(downpayment) ||
        !Number.isFinite(totalPrice) ||
        downpayment <= 0 ||
        totalPrice <= 0 ||
        downpayment > totalPrice ||
        Math.round(downpayment * 100) !== expectedAmount
    ) {
        throw new Error("Saved booking amounts do not match the payment.");
    }

    // PayMongo timestamps are normally Unix seconds.
    const rawPaidAt = paymentAttributes.paid_at;
    const paidAt = rawPaidAt
        ? (
            typeof rawPaidAt === "number" ||
            /^\d+$/.test(String(rawPaidAt))
        )
            ? new Date(Number(rawPaidAt) * 1000).toISOString()
            : new Date(rawPaidAt).toISOString()
        : null;

    if (!paidAt || !Number.isFinite(Date.parse(paidAt))) {
        throw new Error("PayMongo did not return a valid payment timestamp.");
    }

    const { data: updatedCheckout, error } = await supabase
        .from("pending_booking_checkouts")
        .update({
            payment_status: "Paid",
            paymongo_payment_id: paymentId,
            checkout_session_id: session.id,
            paid_at: paidAt
        })
        .eq("id", checkout.id)
        .select("*")
        .single();

    if (error || !updatedCheckout) {
        console.error("Failed to save reconciled payment:", error);
        throw new Error("Verified payment could not be saved to the database.");
    }

    console.log("PAYMENT VERIFIED VIA RECONCILIATION:", {
        reference: updatedCheckout.booking_reference,
        checkoutSessionId: updatedCheckout.checkout_session_id,
        paymentId: updatedCheckout.paymongo_payment_id,
        paidAt: updatedCheckout.paid_at
    });

    return updatedCheckout;
}

app.get("/api/paymongo/booking-status/:reference", async (req, res) => {
    try {
        const reference = String(req.params.reference || "").trim();

        if (!reference) {
            return res.status(400).json({
                success: false,
                error: "Booking reference is required."
            });
        }

        const { data: foundCheckout, error: checkoutError } =
            await supabase
                .from("pending_booking_checkouts")
                .select("*")
                .eq("booking_reference", reference)
                .maybeSingle();

        if (checkoutError) throw checkoutError;

        if (!foundCheckout) {
            return res.status(404).json({
                success: false,
                error: "Booking reference not found."
            });
        }

        let checkout = foundCheckout;

       if (
    checkout.checkout_session_id &&
    (
        String(checkout.payment_status || "").toLowerCase() !== "paid" ||
        !checkout.paymongo_payment_id ||
        !checkout.paid_at
    )
) {
    try {
        checkout = await reconcilePayMongoCheckout(checkout);
    } catch (reconcileError) {
        console.error("Payment reconciliation error:", {
            reference,
            message: reconcileError.message
        });
    }
}

        // A database status alone is not sufficient proof of payment.
        const paymentVerified =
            String(checkout.payment_status || "").trim().toLowerCase() === "paid" &&
            Boolean(checkout.paymongo_payment_id) &&
            Boolean(checkout.checkout_session_id) &&
            Boolean(checkout.paid_at);

        if (checkout.final_booking_id) {
            const { data: booking, error: bookingError } = await supabase
                .from("bookings")
                .select("*")
                .eq("id", checkout.final_booking_id)
                .maybeSingle();

            if (bookingError) throw bookingError;

            if (booking) {
                return res.json({
                    success: true,
                    paid: paymentVerified,
                    payment_verified: paymentVerified,
                    customer_confirmed: true,
                    booking_id: booking.id,
                    booking
                });
            }
        }

        const bookingData = checkout.booking_data || {};

        return res.json({
            success: true,
            paid: paymentVerified,
            payment_verified: paymentVerified,
            customer_confirmed: false,
            booking: {
                ...bookingData,
                reference: checkout.booking_reference,
                payment_status: paymentVerified
                    ? "Paid"
                    : checkout.payment_status || "Pending",
                paymongo_paid_at: checkout.paid_at || null
            }
        });
    } catch (error) {
        console.error("Booking status lookup error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to retrieve booking status."
        });
    }
});

app.post("/api/paymongo/confirm-booking", async (req, res) => {
    try {
        const reference = String(req.body.reference || "").trim();

        if (!reference) {
            return res.status(400).json({
                success: false,
                error: "Booking reference is required."
            });
        }

        const { data: checkout, error: checkoutError } = await supabase
            .from("pending_booking_checkouts")
            .select("*")
            .eq("booking_reference", reference)
            .maybeSingle();

        if (checkoutError) throw checkoutError;

        if (!checkout) {
            return res.status(404).json({
                success: false,
                error: "Booking reference not found."
            });
        }

        // Require verified payment before finalizing the booking.
        if (
            String(checkout.payment_status || "").trim().toLowerCase() !== "paid" ||
            !checkout.paymongo_payment_id ||
            !checkout.checkout_session_id ||
            !checkout.paid_at
        ) {
            return res.status(409).json({
                success: false,
                error: "Payment has not been verified. Please wait for PayMongo confirmation."
            });
        }

        const bookingData = checkout.booking_data || {};
        const totalPrice = Number(bookingData.total_price);
        const downpaymentAmount = Number(bookingData.downpayment_amount);
        const expectedAmountCentavos = Number(
            checkout.expected_amount_centavos
        );

        if (
            !Number.isFinite(totalPrice) ||
            !Number.isFinite(downpaymentAmount) ||
            !Number.isSafeInteger(expectedAmountCentavos) ||
            totalPrice <= 0 ||
            downpaymentAmount <= 0 ||
            downpaymentAmount > totalPrice ||
            Math.round(downpaymentAmount * 100) !== expectedAmountCentavos
        ) {
            return res.status(400).json({
                success: false,
                error: "Booking amount does not match the verified payment."
            });
        }

   let booking = null;
let bookingCreatedNow = false;
let bookingRecovered = false;

        // Reuse the booking if this checkout has already been finalized.
        if (checkout.final_booking_id) {
            const { data, error } = await supabase
                .from("bookings")
                .select("*")
                .eq("id", checkout.final_booking_id)
                .maybeSingle();

            if (error) throw error;
            booking = data;
        }
// Recover an existing booking if the checkout link was not saved.
                if (!booking) {
                    const { data: existingBooking, error: existingBookingError } =
                        await supabase
                            .from("bookings")
                            .select("*")
                            .eq("paymongo_reference", reference)
                            .maybeSingle();

                    if (existingBookingError) throw existingBookingError;
                if (existingBooking) {
                    booking = existingBooking;
                    bookingRecovered = true;

                    const { error: relinkError } = await supabase
                        .from("pending_booking_checkouts")
                        .update({ final_booking_id: booking.id })
                        .eq("id", checkout.id);

                    if (relinkError) throw relinkError;
                }
                }

// Create only if no booking was found.
if (!booking) {
   const finalBookingData = {
    ...bookingData,

    // Payment confirmation
    payment_method: "PayMongo",
    payment_status: "Paid",
    admin_note: "Downpayment Paid",

    // Booking status remains pending admin approval
    status: "Pending",

    // Payment details
    downpayment_amount: downpaymentAmount,
    paymongo_reference: reference,
    paymongo_reference_number: reference,
    paymongo_checkout_id: checkout.checkout_session_id,
    paymongo_payment_id: checkout.paymongo_payment_id,
    paymongo_paid_at: checkout.paid_at,

    // Remaining balance
    remaining_balance: Number(
        (totalPrice - downpaymentAmount).toFixed(2)
    )
};

    // Keep your existing insert, checkout-linking, and error-handling
    // code here.

            const { data: createdBooking, error: createError } =
                await supabase
                    .from("bookings")
                    .insert(finalBookingData)
                    .select()
                    .single();

            if (createError) {
                console.error("Failed to create final booking:", {
                    message: createError.message,
                    code: createError.code,
                    details: createError.details,
                    hint: createError.hint
                });

                return res.status(500).json({
                    success: false,
                    error: "Unable to save the booking. Please check the server logs."
                });
            }

            booking = createdBooking;
            bookingCreatedNow = true;

            // Link the checkout to the newly created booking.
            const { data: linkedCheckout, error: checkoutUpdateError } =
                await supabase
                    .from("pending_booking_checkouts")
                    .update({ final_booking_id: booking.id })
                    .eq("id", checkout.id)
                    .select("id, final_booking_id")
                    .single();

            if (checkoutUpdateError || !linkedCheckout) {
                console.error("Failed to link checkout to booking:", {
                    checkoutId: checkout.id,
                    bookingId: booking.id,
                    message: checkoutUpdateError?.message,
                    code: checkoutUpdateError?.code,
                    details: checkoutUpdateError?.details
                });

                return res.status(500).json({
                    success: false,
                    error:
                        "Your booking was saved, but finalization failed. Please contact the studio before trying again."
                });
            }
        }

        // Record the payment once.
        const { data: existingPayment, error: paymentLookupError } =
            await supabase
                .from("payments")
                .select("id")
                .eq("paymongo_payment_id", checkout.paymongo_payment_id)
                .maybeSingle();

        if (paymentLookupError) throw paymentLookupError;

        if (!existingPayment) {
          const { error: paymentInsertError } = await supabase
    .from("payments")
    .insert({
        customer_id: booking.customer_id || null,
        booking_id: booking.id,
        gallery_access_request_id: null,
        client_name: booking.full_name,
        email: booking.email || null,

        amount: Number(booking.downpayment_amount),
        payment_method: "PayMongo",
        status: "Paid",
        payment_type: "Booking",
        payment_date: checkout.paid_at,

        paymongo_payment_id: checkout.paymongo_payment_id,
        paymongo_checkout_id: checkout.checkout_session_id,
        payment_reference: reference
    });

if (paymentInsertError) {
    console.error("Failed to record downpayment:", {
        message: paymentInsertError.message,
        code: paymentInsertError.code,
        details: paymentInsertError.details,
        hint: paymentInsertError.hint
    });

    throw paymentInsertError;
}
        }

        const peso = amount =>
            Number(amount || 0).toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

        // Notify admin only for a newly created booking.
        if (bookingCreatedNow) {
            const { error: notificationError } = await supabase
                .from("notifications")
                .insert({
                    recipient: "admin",
                    title: "New Paid Booking — Awaiting Admin Confirmation",
                    message:
                        `${booking.full_name} submitted a booking and paid the downpayment.\n\n` +
                        `Date: ${booking.booking_date}\n` +
                        `Time: ${booking.booking_time}\n` +
                        `Session: ${booking.session_type}\n` +
                        `Total: ₱${peso(booking.total_price)}\n` +
                        `Downpayment Paid: ₱${peso(booking.downpayment_amount)}\n` +
                        `Remaining Balance: ₱${peso(booking.remaining_balance)}\n` +
                        `Payment Status: Paid\n` +
                        `Booking Status: Pending Admin Confirmation`,
                    is_read: false
                });

            if (notificationError) {
                console.error("Admin dashboard notification error:", notificationError);
            }
        }

        // Send the admin email only if it has not already been sent.
        if (bookingCreatedNow && !checkout.admin_email_sent) {
            if (!resend || !RESEND_FROM_EMAIL || !ADMIN_NOTIFICATION_EMAIL) {
                console.error(
                    "Admin email not sent: configure RESEND_API_KEY, RESEND_FROM_EMAIL and ADMIN_NOTIFICATION_EMAIL."
                );
            } else {
                try {
                    const emailResult = await resend.emails.send({
                        from: RESEND_FROM_EMAIL,
                        to: [ADMIN_NOTIFICATION_EMAIL],
                        subject: "New Paid Booking — Captured Photography Studio",
                        html: `
                            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
                                <h2>New Paid Booking Reservation</h2>
                                <p>The customer has submitted a booking for admin review.</p>
                                <p><strong>Customer:</strong> ${escapeHtml(booking.full_name || "")}</p>
                                <p><strong>Email:</strong> ${escapeHtml(booking.email || "")}</p>
                                <p><strong>Contact:</strong> ${escapeHtml(booking.contact_number || "")}</p>
                                <p><strong>Date:</strong> ${escapeHtml(booking.booking_date || "")}</p>
                                <p><strong>Time:</strong> ${escapeHtml(booking.booking_time || "")}</p>
                                <p><strong>Session:</strong> ${escapeHtml(booking.session_type || "")}</p>
                                <p><strong>Total:</strong> ₱${peso(booking.total_price)}</p>
                                <p><strong>Downpayment PAID:</strong> ₱${peso(booking.downpayment_amount)}</p>
                                <p><strong>Remaining balance:</strong> ₱${peso(booking.remaining_balance)}</p>
                                <p><strong>Payment reference:</strong> ${escapeHtml(reference)}</p>
                                <p><strong>Booking status:</strong> Pending admin confirmation</p>
                            </div>
                        `
                    });

                    if (emailResult.error) {
                        console.error("Admin booking email error:", emailResult.error);
                    } else {
                        const { error: emailFlagError } = await supabase
                            .from("pending_booking_checkouts")
                            .update({ admin_email_sent: true })
                            .eq("id", checkout.id);

                        if (emailFlagError) {
                            console.error("Could not save admin email status:", emailFlagError);
                        }
                    }
                } catch (emailError) {
                    // Email failure must not undo a successfully saved booking.
                    console.error("Admin booking email failed:", emailError);
                }
            }
        }

        return res.json({
            success: true,
            customer_confirmed: true,
            booking_id: booking.id,
            payment_status: "Paid",
            booking_status: booking.status,
            message:
                "Your booking has been submitted successfully. Please wait for admin confirmation."
        });
    } catch (error) {
        console.error("Customer booking confirmation error:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            stack: error.stack
        });

        return res.status(500).json({
            success: false,
            error: "Unable to complete your booking. Please try again or contact the studio."
        });
    }
});
app.get("/api/bookings/availability", async (req, res) => {

    try {

        const bookingDate =
            String(req.query.date || "").trim();


        if (!bookingDate) {

            return res.status(400).json({
                success: false,
                error: "Booking date is required."
            });

        }

        const {
            data: bookings,
            error
        } = await supabase
            .from("bookings")
            .select(`
                booking_time,
                booking_duration,
                session_type,
                addons,
                status,
                payment_status
            `)
            .eq(
                "booking_date",
                bookingDate
            );


        if (error) {

            console.error(
                "Availability booking query error:",
                error
            );

            return res.status(500).json({
                success: false,
                error: "Unable to check booking availability.",
                message: error.message
            });

        }
        const activeBookings =
            (bookings || []).filter(
                booking => {

                    const status =
                        String(
                            booking.status || ""
                        )
                        .toLowerCase()
                        .trim();


                    const paymentStatus =
                        String(
                            booking.payment_status || ""
                        )
                        .toLowerCase()
                        .trim();


                    if (
                        status === "cancelled" ||
                        status === "canceled" ||
                        status === "rejected" ||
                        status === "declined"
                    ) {

                        return false;

                    }


                    if (
                        paymentStatus === "cancelled" ||
                        paymentStatus === "canceled" ||
                        paymentStatus === "rejected" ||
                        paymentStatus === "declined" ||
                        paymentStatus === "payment failed"
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        const PACKAGE_DURATIONS = {

            basic_1: 15,

            basic_2: 20,

            basic_3: 20,

            group_package: 60,

            classic_1: 60,

            classic_2: 60,

            classic_3: 70,

            kids: 50,

            pre_birthday: 50,

            theme_holiday: 35,

            maternity: 50

        };

        function getBookingDuration(booking) {

            const savedDuration =
                Number(
                    booking.booking_duration
                );


            if (
                Number.isFinite(savedDuration) &&
                savedDuration > 0
            ) {

                return savedDuration;

            }


            const sessionType =
                String(
                    booking.session_type || ""
                )
                .trim()
                .toLowerCase();


            let duration =
                PACKAGE_DURATIONS[
                    sessionType
                ] || 0;
            const addons =
                Array.isArray(
                    booking.addons
                )
                    ? booking.addons
                    : [];


            for (
                const addon
                of addons
            ) {

                if (!addon) {
                    continue;
                }


                const key =
                    String(
                        addon.key || ""
                    )
                    .trim()
                    .toLowerCase();


                const quantity =
                    Number(
                        addon.quantity
                    ) || 1;


                if (
                    key ===
                    "photographer_15"
                ) {

                    duration +=
                        15 *
                        quantity;

                }


                if (
                    key ===
                    "photographer_30"
                ) {

                    duration +=
                        30 *
                        quantity;

                }

            }


            return duration;

        }
        const availability =
            activeBookings
                .map(
                    booking => {

                        const duration =
                            getBookingDuration(
                                booking
                            );


                        if (
                            !booking.booking_time ||
                            duration <= 0
                        ) {

                            return null;

                        }


                        return {

                            booking_time:
                                booking.booking_time,

                            booking_duration:
                                duration

                        };

                    }
                )
                .filter(
                    Boolean
                );


        console.log(
            "===================================="
        );

        console.log(
            "BOOKING AVAILABILITY API"
        );

        console.log(
            "Date:",
            bookingDate
        );

        console.log(
            "Total bookings:",
            availability.length
        );

        console.log(
            "Availability:",
            availability
        );

        console.log(
            "===================================="
        );


        return res.json({

            success:
                true,

            booking_date:
                bookingDate,

            bookings:
                availability

        });


    } catch (error) {

        console.error(
            "Booking availability API error:",
            error
        );


        return res.status(500).json({

            success:
                false,

            error:
                "Internal server error.",

            message:
                error.message

        });

    }

});

app.get(
    "/api/admin/bookings",
    requireStaff,
    async (req, res) => {
        try {
            console.log("✅ BOOKINGS ROUTE REACHED", {
                path: req.originalUrl,
                role: req.profile?.role,
                userId: req.authUser?.id
            });

            console.log("====================================");
            console.log("📋 LOADING ALL BOOKINGS FOR ADMIN");
            console.log("====================================");

            // Keep the rest of your existing route unchanged.

            const { data: bookings, error } = await supabase
                .from("bookings")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error(
                    "❌ ADMIN BOOKINGS QUERY ERROR:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: "Failed to load bookings."
                });
            }

            // Log all bookings returned by Supabase
            console.log(
                "✅ Total bookings found:",
                bookings?.length || 0
            );

            console.log(
                "📋 Booking statuses:",
                (bookings || []).map(booking => ({
                    id: booking.id,
                    name: booking.full_name,
                    email: booking.email,
                    date: booking.booking_date,
                    time: booking.booking_time,
                    status: booking.status,
                    payment_status: booking.payment_status,
                    paymongo_reference: booking.paymongo_reference,
                    paymongo_checkout_id: booking.paymongo_checkout_id,
                    paymongo_payment_id: booking.paymongo_payment_id,
                    created_at: booking.created_at
                }))
            );

            return res.status(200).json({
                success: true,
                count: bookings?.length || 0,
                bookings: bookings || []
            });

        } catch (error) {
            console.error(
                "❌ Admin bookings API error:",
                error
            );

            return res.status(500).json({
                success: false,
                error: "Internal server error.",
                message: error.message
            });
        }
    }
);

app.delete(
    "/api/admin/bookings/:id",
    requireStaff,
    async (req, res) => {

        try {

            const bookingId =
                String(req.params.id || "").trim();

            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    error: "Booking ID is required."
                });
            }

            const {
                data: booking,
                error: bookingError
            } = await supabase
                .from("bookings")
                .select("id, full_name, status")
                .eq("id", bookingId)
                .single();

            if (bookingError || !booking) {

                return res.status(404).json({
                    success: false,
                    error: "Booking was not found."
                });

            }

            const status =
                String(booking.status || "")
                    .trim()
                    .toLowerCase();
                    console.log(
                        "DELETE BOOKING STATUS:",
                        booking.status,
                        "NORMALIZED:",
                        status
                    );
          if (
                    status !== "rejected" &&
                    status !== "cancelled"
                ) {
                    return res.status(403).json({
                        success: false,
                        error: "Only rejected or cancelled bookings can be deleted."
                    });
                }
             const {
                error: notificationDeleteError
            } = await supabase
                .from("notifications")
                .delete()
                .eq("booking_id", bookingId);

            if (notificationDeleteError) {

                console.error(
                    "Notification cleanup error:",
                    notificationDeleteError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to clean related notifications.",
                    message:
                        notificationDeleteError.message
                });

            }

            const {
                error: repositoryDeleteError
            } = await supabase
                .from("repository_client_links")
                .delete()
                .eq("booking_id", bookingId);

            if (repositoryDeleteError) {

                console.error(
                    "Repository cleanup error:",
                    repositoryDeleteError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to clean related repository data.",
                    message:
                        repositoryDeleteError.message
                });

            }

            const {
                error: deleteError
            } = await supabase
                .from("bookings")
                .delete()
                .eq("id", bookingId);

            if (deleteError) {

                console.error(
                    "Rejected booking deletion error:",
                    deleteError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to delete the rejected booking.",
                    message:
                        deleteError.message
                });

            }

            return res.status(200).json({
                success: true,
                message:
                    `${booking.full_name || "Customer"}'s rejected booking was deleted successfully.`
            });

        } catch (error) {

            console.error(
                "DELETE REJECTED BOOKING ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error: "Internal server error.",
                message: error.message
            });

        }
    }
);
app.post(
    "/api/gallery-access/request",
    async (req, res) => {

        try {


            const {
                email,
                fullName,
                bookingDate
            } = req.body;

            if (
                !email ||
                !fullName ||
                !bookingDate
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Email, full name, and booking date are required."
                });

            }


            const normalizedEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            const normalizedName =
                String(fullName)
                    .trim()
                    .replace(/\s+/g, " ")
                    .toLowerCase();

            const normalizedDate =
                String(bookingDate)
                    .substring(0, 10);


            console.log("EMAIL:", normalizedEmail);
            console.log("FULL NAME:", normalizedName);
            console.log("BOOKING DATE:", normalizedDate);


            /* =====================================================
               2. FIND COMPLETED BOOKING
            ===================================================== */

            const {
                data: bookings,
                error: bookingError
            } = await supabase
                .from("bookings")
                .select("*")
                .ilike(
                    "email",
                    normalizedEmail
                )
                .eq(
                    "status",
                    "Completed"
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


            if (bookingError) {

                console.error(
                    "BOOKING LOOKUP ERROR:",
                    bookingError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to verify your booking."
                });

            }


            console.log(
                "COMPLETED BOOKINGS FOUND:",
                bookings?.length || 0
            );


            const booking =
                (bookings || []).find(
                    candidate => {

                        const candidateName =
                            String(
                                candidate.full_name || ""
                            )
                                .trim()
                                .replace(/\s+/g, " ")
                                .toLowerCase();


                        const candidateDate =
                            String(
                                candidate.booking_date || ""
                            )
                                .substring(0, 10);


                        console.log(
                            "COMPARING:",
                            candidateName,
                            candidateDate
                        );


                        return (
                            candidateName ===
                            normalizedName
                            &&
                            candidateDate ===
                            normalizedDate
                        );

                    }
                );


            if (!booking) {

                console.log(
                    "NO MATCHING COMPLETED BOOKING"
                );

                return res.status(404).json({
                    success: false,
                    error:
                        "We could not find a completed booking matching your email, full name, and booking date."
                });

            }


            console.log(
                "BOOKING VERIFIED:",
                booking.id
            );


            /* =====================================================
               4. FIND REPOSITORY
            ===================================================== */

            const {
                data: repository,
                error: repositoryError
            } = await supabase
                .from("repository_client_links")
                .select("*")
                .eq(
                    "booking_id",
                    booking.id
                )
                .maybeSingle();


            if (repositoryError) {

                console.error(
                    "REPOSITORY LOOKUP ERROR:",
                    repositoryError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to find your photo gallery."
                });

            }


            if (!repository) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Your booking was found, but your photo folder has not been created yet."
                });

            }


            console.log(
                "REPOSITORY VERIFIED:",
                repository.id
            );

            const {
                data: previousRequests,
                error: previousRequestsError
            } = await supabase
                .from("gallery_access_requests")
                .select("*")
                .eq(
                    "booking_id",
                    booking.id
                )
                .ilike(
                    "customer_email",
                    normalizedEmail
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


            if (previousRequestsError) {

                console.error(
                    "PREVIOUS REQUEST LOOKUP ERROR:",
                    previousRequestsError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to check your previous gallery requests."
                });

            }


            const allRequests =
                previousRequests || [];


            console.log(
                "EXISTING REQUESTS:",
                allRequests
            );

            const pendingRequest =
                allRequests.find(
                    request =>
                        String(
                            request.status || ""
                        ).toLowerCase() ===
                        "pending"
                );


            if (pendingRequest) {

                return res.status(409).json({

                    success: false,

                    error:
                        `Your gallery access request #${pendingRequest.request_number} is already pending. Please wait for the admin to approve it.`,

                    request:
                        pendingRequest

                });

            }
            const requestNumbers =
                allRequests
                    .map(
                        request =>
                            Number(
                                request.request_number
                            )
                    )
                    .filter(
                        number =>
                            Number.isFinite(number) &&
                            number > 0
                    );


            const highestRequestNumber =
                requestNumbers.length > 0
                    ? Math.max(
                        ...requestNumbers
                    )
                    : 0;


            const finalRequestNumber =
                highestRequestNumber + 1;


            console.log(
                "PREVIOUS REQUEST NUMBERS:",
                requestNumbers
            );

            console.log(
                "HIGHEST REQUEST NUMBER:",
                highestRequestNumber
            );

            console.log(
                "NEW REQUEST NUMBER:",
                finalRequestNumber
            );

       const MAX_GALLERY_REQUESTS = 3;

            if (
                finalRequestNumber > MAX_GALLERY_REQUESTS
            ) {

                return res.status(409).json({

                    success: false,

                    error:
                        "You have already used all three gallery access requests for this booking."

                });

            }


                let finalAccessType;
                let finalPaymentRequired;


                if (
                    finalRequestNumber === 1
                ) {

                    finalAccessType =
                        "free";

                    finalPaymentRequired =
                        false;

                }
                else {

                    const previousRequest =
                        allRequests.find(
                            request =>
                                Number(
                                    request.request_number
                                ) === finalRequestNumber - 1
                        );


                    if (
                        !previousRequest
                    ) {

                        return res.status(409).json({

                            success: false,

                            error:
                                `The previous gallery access request #${finalRequestNumber - 1} could not be found.`

                        });

                    }

                    if (
                        previousRequest.access_expires_at
                    ) {

                        const expiresAt =
                            new Date(
                                previousRequest.access_expires_at
                            );


                        if (
                            expiresAt > new Date()
                        ) {

                            return res.status(409).json({

                                success: false,

                                error:
                                    "You already have an active gallery access."

                            });

                        }

                    }
                    finalAccessType =
                        "paid";

                    finalPaymentRequired =
                        true;

                }
                            const requestId =
                crypto.randomUUID();


            const requestData = {

                id:
                    requestId,

                customer_id:
                    null,

                customer_email:
                    normalizedEmail,

                booking_id:
                    booking.id,

                repository_id:
                    repository.id,

                request_number:
                    finalRequestNumber,

                access_type:
                    finalAccessType,

                payment_required:
                    finalPaymentRequired,

                payment_status:
                    finalPaymentRequired
                        ? "unpaid"
                        : "not_required",

                status:
                    "pending"

            };


            console.log(
                "INSERTING GALLERY REQUEST:",
                requestData
            );


            const {
                data: newRequest,
                error: requestError
            } =
                await supabase
                    .from(
                        "gallery_access_requests"
                    )
                    .insert(
                        requestData
                    )
                    .select("*")
                    .single();


            if (requestError) {

                console.error(
                    "GALLERY REQUEST INSERT ERROR:",
                    requestError
                );

                return res.status(500).json({

                    success: false,

                    error:
                        "Unable to create your gallery access request.",

                    details:
                        requestError.message

                });

            }


            console.log(
                "GALLERY REQUEST CREATED:",
                newRequest.id
            );
            const {
                error: notificationError
            } =
                await supabase
                    .from("notifications")
                    .insert({

                        recipient:
                            "admin",

                        booking_id:
                            booking.id,

                        title:
                            finalRequestNumber === 1
                                ? "New FREE Gallery Access Request"
                                : "New PAID Gallery Access Request",

                        message:
                            `${fullName.trim()} (${normalizedEmail}) requested gallery access for booking ${booking.id}. Request #${finalRequestNumber}. ${finalPaymentRequired
                                ? "₱100 payment will be required for downloads."
                                : "First access is free for 24 hours."
                            }`,

                        is_read:
                            false

                    });


            if (notificationError) {

                console.error(
                    "ADMIN NOTIFICATION ERROR:",
                    notificationError
                );

            }
            return res.status(201).json({

                success:
                    true,

                request:
                    newRequest

            });

        }

        catch (error) {

            console.error(
                "GALLERY ACCESS REQUEST SERVER ERROR:",
                error
            );

            return res.status(500).json({

                success:
                    false,

                error:
                    "An unexpected error occurred while creating your gallery access request."

            });

        }

    }
);

app.get("/api/gallery-access/test", (req, res) => {
    res.json({
        success: true,
        message: "Gallery access route is loaded"
    });
});
app.get("/api/gallery-access/request/:requestId", async (req, res) => {
    try {
        const { requestId } = req.params;

        console.log("========== CHECK GALLERY ACCESS REQUEST ==========");
        console.log("REQUEST ID:", requestId);

        if (!requestId) {
            return res.status(400).json({
                success: false,
                error: "Request ID is required."
            });
        }
        const { data: request, error } = await supabase
            .from("gallery_access_requests")
            .select("*")
            .eq("id", requestId)
            .maybeSingle();

        if (error) {
            console.error("ERROR CHECKING GALLERY REQUEST:", error);

            return res.status(500).json({
                success: false,
                error: "Unable to check gallery access request.",
                details: error.message
            });
        }

        if (!request) {
            return res.status(404).json({
                success: false,
                error: "Gallery access request not found."
            });
        }

        console.log("GALLERY REQUEST FOUND:", request);
        console.log("REQUEST STATUS:", request.status);

        // If approved, get the repository separately.
        let repository = null;

        if (
            request.status === "approved" &&
            request.repository_id
        ) {
            const { data: repositoryData, error: repositoryError } =
                await supabase
                    .from("repository_client_links")
                    .select("*")
                    .eq("id", request.repository_id)
                    .maybeSingle();

            if (repositoryError) {
                console.error(
                    "ERROR GETTING REPOSITORY:",
                    repositoryError
                );
            } else {
                repository = repositoryData;
            }
        }

        return res.json({
            success: true,
            request,
            repository
        });

    } catch (error) {
        console.error(
            "CHECK GALLERY REQUEST UNEXPECTED ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Unable to check gallery access request.",
            details: error.message
        });
    }
});
app.get("/api/gallery-access/open/:requestId", async (req, res) => {
    try {
        const requestId = String(req.params.requestId || "").trim();

        if (!requestId) {
            return res.status(400).json({
                success: false,
                error: "Gallery request ID is required."
            });
        }

        // Get the approved access request
        const { data: accessRequest, error: requestError } =
            await supabase
                .from("gallery_access_requests")
                .select(`
                    id,
                    booking_id,
                    repository_id,
                    status,
                    request_number,
                    payment_required,
                    payment_confirmed,
                    payment_status,
                    access_started_at,
                    access_granted_at,
                    access_expires_at
                `)
                .eq("id", requestId)
                .maybeSingle();

        if (requestError) {
            console.error("Gallery request lookup error:", requestError);

            return res.status(500).json({
                success: false,
                error: "Unable to verify gallery request."
            });
        }

        if (!accessRequest) {
            return res.status(404).json({
                success: false,
                error: "Gallery access request not found."
            });
        }

        if (
            String(accessRequest.status || "").toLowerCase() !==
            "approved"
        ) {
            return res.status(403).json({
                success: false,
                error: "Gallery access has not been approved."
            });
        }

        // Request #2 and #3 require payment
        const requestNumber =
            Number(accessRequest.request_number || 0);

        if (requestNumber >= 2) {
            const paymentConfirmed =
                accessRequest.payment_confirmed === true;

            const paymentPaid =
                String(accessRequest.payment_status || "").toLowerCase() ===
                "paid";

            if (!paymentConfirmed || !paymentPaid) {
                return res.status(403).json({
                    success: false,
                    error: "Payment is required before accessing this gallery."
                });
            }
        }

        // Verify expiration
        if (accessRequest.access_expires_at) {
            const expiresAt =
                new Date(accessRequest.access_expires_at);

            if (
                Number.isNaN(expiresAt.getTime()) ||
                new Date() >= expiresAt
            ) {
                return res.status(403).json({
                    success: false,
                    error: "Your gallery access has expired."
                });
            }
        }

        // Get the repository token
        const { data: repository, error: repositoryError } =
            await supabase
                .from("repository_client_links")
                .select(`
                    id,
                    booking_id,
                    access_token
                `)
                .eq("id", accessRequest.repository_id)
                .eq("booking_id", accessRequest.booking_id)
                .maybeSingle();

        if (repositoryError) {
            console.error(
                "Gallery repository lookup error:",
                repositoryError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to open gallery."
            });
        }

        if (!repository) {
            return res.status(404).json({
                success: false,
                error: "Gallery repository not found."
            });
        }

        return res.json({
            success: true,

            token: repository.access_token,

            request: {
                id: accessRequest.id,
                booking_id: accessRequest.booking_id,
                repository_id: accessRequest.repository_id,
                request_number: accessRequest.request_number,
                payment_required:
                    accessRequest.payment_required,
                payment_confirmed:
                    accessRequest.payment_confirmed,
                payment_status:
                    accessRequest.payment_status,
                access_started_at:
                    accessRequest.access_started_at ||
                    accessRequest.access_granted_at,
                access_expires_at:
                    accessRequest.access_expires_at
            }
        });

    } catch (error) {
        console.error(
            "Gallery open authorization error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Unable to open gallery."
        });
    }
});
app.get("/api/gallery-access/photo/:photoId", async (req, res) => {
    try {
        const photoId =
            String(req.params.photoId || "").trim();

        const token =
            String(req.query.token || "").trim();

        if (!photoId || !token) {
            return res.status(400).json({
                success: false,
                error: "Photo access information is required."
            });
        }

        // 1. Find the repository belonging to this token
        const {
            data: repository,
            error: repositoryError
        } = await supabase
            .from("repository_client_links")
            .select(`
                id,
                booking_id,
                access_token
            `)
            .eq("access_token", token)
            .maybeSingle();

        if (repositoryError) {
            console.error(
                "Photo repository lookup error:",
                repositoryError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to verify gallery access."
            });
        }

        if (!repository) {
            return res.status(403).json({
                success: false,
                error: "Invalid gallery access."
            });
        }

        // 2. Find the photo ONLY inside this repository
        const {
            data: photo,
            error: photoError
        } = await supabase
            .from("repository_photos")
            .select(`
                id,
                repository_id,
                storage_path,
                original_name,
                mime_type
            `)
            .eq("id", photoId)
            .eq("repository_id", repository.id)
            .maybeSingle();

        if (photoError) {
            console.error(
                "Photo lookup error:",
                photoError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to locate photo."
            });
        }

        if (!photo) {
            return res.status(404).json({
                success: false,
                error: "Photo not found."
            });
        }

        if (!photo.storage_path) {
            return res.status(404).json({
                success: false,
                error: "Photo storage path is missing."
            });
        }

        // 3. Find an approved gallery access request
        const {
            data: accessRequests,
            error: requestError
        } = await supabase
            .from("gallery_access_requests")
            .select(`
                id,
                booking_id,
                repository_id,
                status,
                request_number,
                payment_required,
                payment_confirmed,
                payment_status,
                access_started_at,
                access_granted_at,
                access_expires_at
            `)
            .eq("repository_id", repository.id)
            .eq("booking_id", repository.booking_id)
            .eq("status", "approved")
            .order("request_number", {
                ascending: false
            });

        if (requestError) {
            console.error(
                "Gallery access request lookup error:",
                requestError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to verify gallery access."
            });
        }

        const now = new Date();

        // 4. Find the currently active request
        const activeRequest =
            (accessRequests || []).find(request => {
                const requestNumber =
                    Number(request.request_number || 0);

                // Paid requests require payment
                if (requestNumber >= 2) {
                    const paid =
                        request.payment_confirmed === true &&
                        String(
                            request.payment_status || ""
                        ).toLowerCase() === "paid";

                    if (!paid) {
                        return false;
                    }
                }

                // Check expiration
                if (request.access_expires_at) {
                    const expiresAt =
                        new Date(
                            request.access_expires_at
                        );

                    if (
                        Number.isNaN(
                            expiresAt.getTime()
                        ) ||
                        now >= expiresAt
                    ) {
                        return false;
                    }
                }

                return true;
            });

        if (!activeRequest) {
            return res.status(403).json({
                success: false,
                error:
                    "Your gallery access is not currently active."
            });
        }

        // 5. Generate a SHORT-LIVED signed URL
        const {
            data: signedUrlData,
            error: signedUrlError
        } = await supabase.storage
            .from("client-photos")
            .createSignedUrl(
                photo.storage_path,
                60
            );

        if (
            signedUrlError ||
            !signedUrlData?.signedUrl
        ) {
            console.error(
                "Signed photo URL error:",
                signedUrlError
            );

            return res.status(500).json({
                success: false,
                error:
                    "Unable to generate secure photo access."
            });
        }

        // 6. Redirect to the temporary signed URL
        return res.redirect(
            signedUrlData.signedUrl
        );

    } catch (error) {
        console.error(
            "Secure photo download error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                "Unable to securely access the photo."
        });
    }
});
app.post("/api/gallery-access/create-payment", async (req, res) => {

    try {

        const {
            requestId
        } = req.body;

        if (!requestId) {

            return res.status(400).json({
                success: false,
                message: "Gallery access request ID is required."
            });
        }
        const {
            data: accessRequest,
            error: requestError
        } = await supabase
            .from("gallery_access_requests")
            .select(`
                id,
                customer_email,
                booking_id,
                repository_id,
                status,
                request_number,
                payment_required,
                payment_confirmed,
                payment_status
            `)
            .eq("id", requestId)
            .maybeSingle();

        if (requestError) {

            console.error(
                "Gallery payment request lookup error:",
                requestError
            );

            return res.status(500).json({
                success: false,
                message: "Unable to verify gallery access request."
            });
        }

        if (!accessRequest) {

            return res.status(404).json({
                success: false,
                message: "Gallery access request was not found."
            });
        }
        if (accessRequest.status !== "approved") {

            return res.status(400).json({
                success: false,
                message: "This gallery access request is not approved."
            });
        }

        if (Number(accessRequest.request_number || 1) < 2) {

            return res.status(400).json({
                success: false,
                message: "The first gallery access request is free."
            });
        }

        if (accessRequest.payment_confirmed === true) {

            return res.status(400).json({
                success: false,
                message: "This gallery access has already been paid."
            });
        }
        const amount =
            Number(
                process.env.GALLERY_ACCESS_AMOUNT || 1
            );

        if (!amount || amount <= 0) {

            return res.status(500).json({
                success: false,
                message: "Gallery access payment amount is not configured."
            });
        }

        const referenceNumber =
    `GALLERY-${accessRequest.id}`;

// Get the repository belonging to this gallery request
const { data: repository, error: repositoryError } =
    await supabase
        .from("repository_client_links")
        .select(`
            id,
            booking_id,
            access_token
        `)
        .eq("id", accessRequest.repository_id)
        .eq("booking_id", accessRequest.booking_id)
        .maybeSingle();

if (repositoryError) {
    console.error(
        "Gallery repository lookup error:",
        repositoryError
    );

    return res.status(500).json({
        success: false,
        message: "Unable to verify gallery repository."
    });
}

        if (!repository) {
            return res.status(404).json({
                success: false,
                message: "Gallery repository was not found."
            });
        }

        const frontendUrl =
            process.env.FRONTEND_URL ||
            "http://localhost:5500";

        const galleryUrl =
            `${frontendUrl}/gallery` +
            `?token=${encodeURIComponent(
                repository.access_token
            )}` +
            `&email=${encodeURIComponent(
                accessRequest.customer_email || ""
            )}` +
            `&payment=success` +
            `&request=${encodeURIComponent(
                accessRequest.id
            )}`;

        const paymongoResponse =
            await fetch(
                "https://api.paymongo.com/v2/checkout_sessions",
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            "Basic " +
                            Buffer.from(
                                `${process.env.PAYMONGO_SECRET_KEY}:`
                            ).toString("base64"),

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        data: {

                            attributes: {

                                line_items: [
                                    {
                                        name:
                                            "Gallery Access",

                                        amount:
                                            amount * 100,

                                        currency:
                                            "PHP",

                                        quantity:
                                            1
                                    }
                                ],

                                payment_method_types: [
                                    "card",
                                    "gcash",
                                    "qrph"
                                ],

                                description:
                                    `Gallery access payment for ${accessRequest.customer_email}`,

                                reference_number:
                                    referenceNumber,

                                send_email_receipt:
                                    true,

                                billing: {
                                    email:
                                        accessRequest.customer_email
                                },

                                success_url:
                                    galleryUrl,

                                cancel_url:
                                    galleryUrl
                            }
                        }
                    })
                }
            );

        const paymongoData =
            await paymongoResponse.json();

        if (!paymongoResponse.ok) {

            console.error(
                "PayMongo create checkout error:",
                paymongoData
            );

            return res.status(
                paymongoResponse.status
            ).json({
                success: false,
                message:
                    paymongoData?.errors?.[0]?.detail ||
                    "Unable to create PayMongo checkout."
            });
        }

        const checkoutSession =
            paymongoData?.data;

        const checkoutUrl =
            checkoutSession?.attributes?.checkout_url;

        if (!checkoutUrl) {

            console.error(
                "PayMongo did not return checkout URL:",
                paymongoData
            );

            return res.status(500).json({
                success: false,
                message:
                    "PayMongo did not return a checkout URL."
            });
        }

        console.log(
            "Gallery PayMongo checkout created:",
            checkoutSession.id
        );

        return res.json({

            success: true,

            checkoutUrl:

                checkoutUrl,

            checkoutSessionId:
                checkoutSession.id,

            referenceNumber:
                referenceNumber,

            amount:
                amount
        });

    }

    catch (error) {

        console.error(
            "Gallery payment creation error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to start gallery payment."
        });
    }
});
app.post("/api/paymongo/gallery-webhook", async (req, res) => {
    try {
        console.log("====================================");
        console.log("PAYMONGO GALLERY WEBHOOK RECEIVED");
        console.log("====================================");

        const event = req.body?.data;

        if (!event) {
            console.error(
                "Gallery webhook: No event data."
            );

            return res.status(200).json({
                received: true
            });
        }

        const eventType =
            event?.attributes?.type;

        const session =
            event?.attributes?.data;

        const attributes =
            session?.attributes || {};

        console.log(
            "GALLERY PAYMONGO EVENT:",
            eventType
        );

        console.log(
            "GALLERY CHECKOUT SESSION:",
            session?.id
        );

        if (
            eventType !==
            "checkout_session.payment.paid"
        ) {
            console.log(
                "Ignoring gallery event:",
                eventType
            );

            return res.status(200).json({
                received: true
            });
        }

        const referenceNumber =
            attributes?.reference_number;

        console.log(
            "GALLERY REFERENCE:",
            referenceNumber
        );

        if (!referenceNumber) {
            console.error(
                "Gallery payment has no reference number."
            );

            return res.status(200).json({
                received: true
            });
        }

        if (
            !referenceNumber.startsWith("GALLERY-")
        ) {
            console.log(
                "Ignoring non-gallery payment:",
                referenceNumber
            );

            return res.status(200).json({
                received: true
            });
        }

        const requestId =
            referenceNumber.replace(
                "GALLERY-",
                ""
            );

        console.log(
            "GALLERY REQUEST ID:",
            requestId
        );

        const {
            data: accessRequest,
            error: requestError
        } = await supabase
            .from("gallery_access_requests")
            .select(`
                id,
                booking_id,
                repository_id,
                customer_email,
                status,
                request_number,
                payment_required,
                payment_confirmed,
                payment_status,
                paid_at
            `)
            .eq("id", requestId)
            .maybeSingle();

        if (requestError) {
            console.error(
                "Gallery request lookup error:",
                requestError
            );

            return res.status(500).json({
                received: false,
                error: "Gallery request lookup failed."
            });
        }

        if (!accessRequest) {
            console.error(
                "Gallery access request not found:",
                requestId
            );

            return res.status(200).json({
                received: true
            });
        }

        if (
            Number(
                accessRequest.request_number || 1
            ) < 2
        ) {
            return res.status(200).json({
                received: true
            });
        }

        if (
            accessRequest.payment_required !== true
        ) {
            return res.status(200).json({
                received: true
            });
        }

        if (
            accessRequest.payment_confirmed === true &&
            String(
                accessRequest.payment_status || ""
            ).toLowerCase() === "paid"
        ) {
            return res.status(200).json({
                received: true
            });
        }

        const paidAt = new Date();

        const expiresAt =
            new Date(
                paidAt.getTime() +
                3 * 24 * 60 * 60 * 1000
            );

        const archiveAt =
            new Date(
                expiresAt.getTime() +
                24 * 60 * 60 * 1000
            );

        const {
            error: updateError
        } = await supabase
            .from("gallery_access_requests")
            .update({
                payment_confirmed: true,
                payment_status: "paid",
                paid_at: paidAt.toISOString(),
                access_started_at: paidAt.toISOString(),
                access_granted_at: paidAt.toISOString(),
                access_expires_at: expiresAt.toISOString(),
                expires_at: expiresAt.toISOString(),
                archive_at: archiveAt.toISOString(),
                is_expired: false
            })
            .eq("id", requestId);

        if (updateError) {
            console.error(
                "Gallery payment database update error:",
                updateError
            );

            return res.status(500).json({
                received: false,
                error: "Unable to update gallery payment."
            });
        }

        console.log("====================================");
        console.log("GALLERY PAYMENT CONFIRMED");
        console.log("REQUEST:", requestId);
        console.log(
            "PAYMONGO SESSION:",
            session?.id
        );
        console.log(
            "REFERENCE:",
            referenceNumber
        );
        console.log(
            "PAID AT:",
            paidAt.toISOString()
        );
        console.log("====================================");

        return res.status(200).json({
            received: true
        });

    } catch (error) {
        console.error(
            "Gallery PayMongo webhook error:",
            error
        );

        return res.status(500).json({
            received: false,
            error: "Gallery webhook processing failed."
        });
    }
});
app.get("/api/gallery-access/payment-status/:requestId", async (req, res) => {
    try {
        const { requestId } = req.params;
        const token = String(req.query.token || "").trim();

        console.log("====================================");
        console.log("CHECK GALLERY PAYMENT STATUS");
        console.log("REQUEST ID:", requestId);
        console.log("TOKEN EXISTS:", !!token);
        console.log("====================================");

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: "Gallery request ID is required."
            });
        }

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Gallery token is required."
            });
        }

        const {
            data: accessRequest,
            error: requestError
        } = await supabase
            .from("gallery_access_requests")
            .select(`
                id,
                booking_id,
                repository_id,
                status,
                request_number,
                payment_required,
                payment_confirmed,
                payment_status,
                paid_at,
                access_started_at,
                access_granted_at,
                access_expires_at,
                expires_at,
                is_expired
            `)
            .eq("id", requestId)
            .maybeSingle();

        if (requestError) {
            console.error(
                "PAYMENT STATUS REQUEST ERROR:",
                requestError
            );

            return res.status(500).json({
                success: false,
                message: "Unable to check gallery payment."
            });
        }

        if (!accessRequest) {
            return res.status(404).json({
                success: false,
                message: "Gallery access request not found."
            });
        }

        const {
            data: repository,
            error: repositoryError
        } = await supabase
            .from("repository_client_links")
            .select(`
                id,
                booking_id,
                access_token
            `)
            .eq("id", accessRequest.repository_id)
            .eq("booking_id", accessRequest.booking_id)
            .maybeSingle();

        if (repositoryError) {
            console.error(
                "PAYMENT STATUS REPOSITORY ERROR:",
                repositoryError
            );

            return res.status(500).json({
                success: false,
                message: "Unable to verify gallery token."
            });
        }

        if (!repository) {
            return res.status(403).json({
                success: false,
                message: "Gallery repository not found."
            });
        }

        if (
            String(repository.access_token || "") !== token
        ) {
            return res.status(403).json({
                success: false,
                message: "Invalid gallery token."
            });
        }

        const paymentConfirmed =
            accessRequest.payment_confirmed === true &&
            String(
                accessRequest.payment_status || ""
            ).toLowerCase() === "paid";

        console.log(
            "PAYMENT CONFIRMED:",
            paymentConfirmed
        );

        console.log(
            "PAYMENT STATUS:",
            accessRequest.payment_status
        );

        console.log(
            "PAID AT:",
            accessRequest.paid_at
        );

        return res.json({
            success: true,
            paymentConfirmed,
            paymentStatus:
                accessRequest.payment_status ||
                "unpaid",
            paidAt:
                accessRequest.paid_at ||
                null,
            accessExpiresAt:
                accessRequest.access_expires_at ||
                accessRequest.expires_at ||
                null,
            request: accessRequest
        });

    } catch (error) {
        console.error(
            "PAYMENT STATUS UNEXPECTED ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to check gallery payment."
        });
    }
});
app.post(
    "/api/gallery-access/send-approved-email/:requestId",
    async (req, res) => {

        try {

            const { requestId } = req.params;

            if (!requestId) {
                return res.status(400).json({
                    success: false,
                    error: "Missing request ID."
                });
            }

            const {
                data: request,
                error: requestError
            } = await supabaseAdmin
                .from("gallery_access_requests")
                .select("*")
                .eq("id", requestId)
                .single();

            if (requestError) {
                console.error(
                    "Gallery access request error:",
                    requestError
                );

                return res.status(404).json({
                    success: false,
                    error: "Gallery access request was not found."
                });
            }

            if (!request) {
                return res.status(404).json({
                    success: false,
                    error: "Gallery access request was not found."
                });
            }

            if (request.status !== "approved") {
                return res.status(400).json({
                    success: false,
                    error: "This gallery access request is not approved."
                });
            }

            let repository = null;

            // First use repository_id saved on the request
            if (request.repository_id) {

                const {
                    data: repositoryData,
                    error: repositoryError
                } = await supabaseAdmin
                    .from("repository_client_links")
                    .select("*")
                    .eq("id", request.repository_id)
                    .single();

                if (repositoryError) {
                    console.error(
                        "Repository lookup error:",
                        repositoryError
                    );

                    return res.status(404).json({
                        success: false,
                        error: "Gallery repository was not found."
                    });
                }

                repository = repositoryData;
            }

            if (!repository && request.booking_id) {

                const {
                    data: repositoryData,
                    error: repositoryError
                } = await supabaseAdmin
                    .from("repository_client_links")
                    .select("*")
                    .eq("booking_id", request.booking_id)
                    .maybeSingle();

                if (repositoryError) {
                    console.error(
                        "Repository booking lookup error:",
                        repositoryError
                    );

                    return res.status(500).json({
                        success: false,
                        error: "Could not find the gallery repository."
                    });
                }

                repository = repositoryData;
            }

            if (!repository) {
                return res.status(404).json({
                    success: false,
                    error: "No gallery repository exists for this booking."
                });
            }

            let booking = null;
            let bookingCreatedNow = false;
            let bookingRecovered = false;

            if (request.booking_id) {

                const {
                    data: bookingData,
                    error: bookingError
                } = await supabaseAdmin
                    .from("bookings")
                    .select("*")
                    .eq("id", request.booking_id)
                    .single();

                if (bookingError) {
                    console.error(
                        "Booking lookup error:",
                        bookingError
                    );
                } else {
                    booking = bookingData;
                }
            }

            const customerEmail =
                request.customer_email ||
                booking?.email ||
                null;

            if (!customerEmail) {
                return res.status(400).json({
                    success: false,
                    error: "Customer email is missing."
                });
            }


            const CUSTOMER_FRONTEND_URL =
                "https://captured-photo-studio.onrender.com";

            const galleryLink =
            CUSTOMER_FRONTEND_URL +
            "/gallery?token=" +
            encodeURIComponent(repository.access_token) +
            "&request=" +
            encodeURIComponent(requestId);

            const emailResponse = await resend.emails.send({

                from: "Captured Photography Studio <onboarding@resend.dev>",

                to: [customerEmail],

                subject: "Your Captured Photography Studio Gallery",

                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">

                        <h2>Your Gallery Access Has Been Approved</h2>

                        <p>
                            Your gallery access request has been approved.
                        </p>

                        <p>
                            You can access your gallery using the button below:
                        </p>

                        <p>
                            <a
                                href="${galleryLink}"
                                style="
                                    display:inline-block;
                                    padding:12px 18px;
                                    background:#639A88;
                                    color:#ffffff;
                                    text-decoration:none;
                                    border-radius:6px;
                                    font-weight:bold;
                                "
                            >
                                Open My Gallery
                            </a>
                        </p>

                        <p>
                            You may also open this link directly:
                        </p>

                        <p style="word-break:break-all;">
                            ${galleryLink}
                        </p>

                        ${
                            Number(request.request_number) >= 2
                                ? `
                                    <p>
                                        This is a subsequent gallery access request.
                                        Any required access payment will be handled
                                        through the gallery.
                                    </p>
                                `
                                : ""
                        }

                        <p>
                            Captured Photography Studio
                        </p>

                    </div>
                `

            });

            if (emailResponse.error) {

                console.error(
                    "Resend email error:",
                    emailResponse.error
                );

                return res.status(500).json({
                    success: false,
                    error: emailResponse.error.message ||
                        "Failed to send gallery email."
                });
            }

            console.log(
                "Gallery email sent:",
                customerEmail
            );

            console.log(
                "Gallery link:",
                galleryLink
            );

            console.log(
                "Repository ID:",
                repository.id
            );

            console.log(
                "Repository token:",
                repository.access_token
            );

            return res.json({
                success: true,
                email: customerEmail,
                galleryLink: galleryLink,
                repositoryId: repository.id
            });

        } catch (error) {

            console.error(
                "SEND APPROVED GALLERY EMAIL ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                error: error.message ||
                    "Failed to send gallery access email."
            });
        }
    }
);
app.get("/api/gallery-access/photos", async (req, res) => {
    try {
        const token = String(req.query.token || "").trim();

        const requestId = String(
            req.query.request ||
            req.query.requestId ||
            ""
        ).trim();

        console.log("====================================");
        console.log("GALLERY PHOTOS REQUEST");
        console.log("TOKEN:", token ? "EXISTS" : "MISSING");
        console.log("REQUEST ID:", requestId);
        console.log("====================================");

        if (!token || !requestId) {
            return res.status(400).json({
                success: false,
                error: "Gallery token and request ID are required."
            });
        }

        const {
            data: accessRequest,
            error: requestError
        } = await supabase
            .from("gallery_access_requests")
            .select(`
                id,
                booking_id,
                repository_id,
                customer_email,
                status,
                request_number,
                payment_required,
                payment_confirmed,
                payment_status,
                access_started_at,
                access_granted_at,
                access_expires_at,
                paid_at,
                expires_at,
                archive_at,
                is_expired
            `)
            .eq("id", requestId)
            .maybeSingle();

        if (requestError) {
            console.error(
                "GALLERY REQUEST LOOKUP ERROR:",
                requestError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to verify gallery access."
            });
        }

        if (!accessRequest) {
            return res.status(404).json({
                success: false,
                error: "Gallery access request not found."
            });
        }

        if (
            String(accessRequest.status || "").toLowerCase() !==
            "approved"
        ) {
            return res.status(403).json({
                success: false,
                error: "Gallery access has not been approved."
            });
        }

        const {
            data: repository,
            error: repositoryError
        } = await supabase
            .from("repository_client_links")
            .select(`
                id,
                booking_id,
                access_token
            `)
            .eq("id", accessRequest.repository_id)
            .eq("booking_id", accessRequest.booking_id)
            .maybeSingle();

        if (repositoryError) {
            console.error(
                "GALLERY REPOSITORY LOOKUP ERROR:",
                repositoryError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to verify gallery repository."
            });
        }

        if (!repository) {
            return res.status(404).json({
                success: false,
                error: "Gallery repository not found."
            });
        }

        if (
            String(repository.access_token || "") !== token
        ) {
            return res.status(403).json({
                success: false,
                error: "Invalid gallery access token."
            });
        }

        if (accessRequest.access_expires_at) {
            const expiresAt = new Date(
                accessRequest.access_expires_at
            );

            if (Number.isNaN(expiresAt.getTime())) {
                return res.status(403).json({
                    success: false,
                    error: "Gallery expiration date is invalid."
                });
            }

            if (new Date() >= expiresAt) {
                return res.status(403).json({
                    success: false,
                    error: "Your gallery access has expired."
                });
            }
        }

        const requestNumber = Number(
            accessRequest.request_number || 1
        );

        const paymentRequired =
            accessRequest.payment_required === true;

        const paymentConfirmed =
            accessRequest.payment_confirmed === true;

        const paymentPaid =
            String(
                accessRequest.payment_status || ""
            ).toLowerCase() === "paid";

        const fullQuality =
            requestNumber === 1 ||
            (
                requestNumber >= 2 &&
                (
                    !paymentRequired ||
                    (
                        paymentConfirmed &&
                        paymentPaid
                    )
                )
            );
                const {
                    data: booking,
                    error: bookingError
                } = await supabase
                    .from("bookings")
                    .select(`
                        id,
                        customer_id,
                        full_name,
                        email,
                        booking_date,
                        booking_time,
                        session_type,
                        total_price
                    `)
                    .eq("id", accessRequest.booking_id)
                    .maybeSingle();

                if (bookingError) {
                    console.error(
                        "GALLERY BOOKING LOOKUP ERROR:",
                        bookingError
                    );
                }


        const {
            data: photos,
            error: photosError
        } = await supabase
            .from("repository_photos")
            .select(`
                id,
                repository_id,
                storage_path,
                original_name,
                mime_type,
                detected_objects,
                created_at
            `)
            .eq("repository_id", repository.id)
            .order("created_at", {
                ascending: true
            });

        if (photosError) {
            console.error(
                "GALLERY PHOTOS LOOKUP ERROR:",
                photosError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to load gallery photos."
            });
        }

        const processedPhotos = [];

        for (const photo of photos || []) {
            let previewUrl = null;
            let imageUrl = null;

            if (photo.storage_path) {
                if (fullQuality) {
                    const {
                        data: signedImage,
                        error: signedImageError
                    } = await supabase.storage
                        .from("client-photos")
                        .createSignedUrl(
                            photo.storage_path,
                            3600
                        );

                    if (signedImageError) {
                        console.error(
                            "FULL IMAGE SIGNED URL ERROR:",
                            signedImageError
                        );
                    } else {
                        imageUrl =
                            signedImage?.signedUrl || null;

                        previewUrl =
                            imageUrl;
                    }
                } else {
                    const {
                        data: signedPreview,
                        error: signedPreviewError
                    } = await supabase.storage
                        .from("client-photos")
                        .createSignedUrl(
                            photo.storage_path,
                            3600,
                            {
                                transform: {
                                    width: 800,
                                    height: 800,
                                    resize: "contain",
                                    quality: 40
                                }
                            }
                        );

                    if (signedPreviewError) {
                        console.error(
                            "PREVIEW SIGNED URL ERROR:",
                            signedPreviewError
                        );
                    } else {
                        previewUrl =
                            signedPreview?.signedUrl || null;
                    }
                }
            }

            processedPhotos.push({
                id: photo.id,
                repository_id: photo.repository_id,
                storage_path: photo.storage_path,
                original_name: photo.original_name,
                mime_type: photo.mime_type,
                detected_objects: photo.detected_objects,
                created_at: photo.created_at,
                preview_url: previewUrl,
                image_url: imageUrl
            });
        }

        console.log(
            "GALLERY PHOTOS FOUND:",
            processedPhotos.length
        );

        console.log(
            "GALLERY FULL QUALITY:",
            fullQuality
        );

        console.log(
            "GALLERY PAYMENT CONFIRMED:",
            paymentConfirmed
        );

        console.log(
            "GALLERY PAYMENT STATUS:",
            accessRequest.payment_status
        );

        return res.json({
            success: true,

            request: {
                id: accessRequest.id,
                booking_id: accessRequest.booking_id,
                repository_id: accessRequest.repository_id,
                customer_email: accessRequest.customer_email,
                request_number: accessRequest.request_number,
                payment_required:
                    accessRequest.payment_required,
                payment_confirmed:
                    accessRequest.payment_confirmed,
                payment_status:
                    accessRequest.payment_status,
                access_started_at:
                    accessRequest.access_started_at ||
                    accessRequest.access_granted_at,
                access_expires_at:
                    accessRequest.access_expires_at,
                paid_at:
                    accessRequest.paid_at
            },

            booking: booking || null,

            repository: {
                id: repository.id,
                booking_id: repository.booking_id
            },

            fullQuality,

            previewMode: !fullQuality,

            photos: processedPhotos
        });

    } catch (error) {
        console.error(
            "GALLERY PHOTOS SERVER ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Unable to load gallery photos."
        });
    }
});

app.get("/api/gallery-access/current-request", async (req, res) => {
    try {
        const token = String(req.query.token || "").trim();

        if (!token) {
            return res.status(400).json({
                success: false,
                error: "Gallery token is required."
            });
        }

        const { data: repository, error: repositoryError } =
            await supabase
                .from("repository_client_links")
                .select("id, booking_id, access_token")
                .eq("access_token", token)
                .maybeSingle();

        if (repositoryError) {
            console.error("CURRENT GALLERY REPOSITORY ERROR:", repositoryError);
            return res.status(500).json({
                success: false,
                error: "Unable to verify gallery link."
            });
        }

        if (!repository) {
            return res.status(404).json({
                success: false,
                error: "Gallery link is invalid."
            });
        }

        const { data: requests, error: requestError } =
            await supabase
                .from("gallery_access_requests")
                .select(`
                    id,
                    booking_id,
                    repository_id,
                    customer_email,
                    status,
                    request_number,
                    payment_required,
                    payment_confirmed,
                    payment_status,
                    access_started_at,
                    access_granted_at,
                    access_expires_at
                `)
                .eq("repository_id", repository.id)
                .eq("booking_id", repository.booking_id)
                .order("request_number", { ascending: false })
                .order("created_at", { ascending: false })
                .limit(1);

        if (requestError) {
            console.error("CURRENT GALLERY REQUEST ERROR:", requestError);
            return res.status(500).json({
                success: false,
                error: "Unable to check gallery request."
            });
        }

        const request = requests?.[0] || null;

        if (!request) {
            return res.json({
                success: true,
                hasRequest: false
            });
        }

        const expiresAt = request.access_expires_at
            ? new Date(request.access_expires_at)
            : null;

        const expired = expiresAt
            ? Number.isNaN(expiresAt.getTime()) || new Date() >= expiresAt
            : false;

        return res.json({
            success: true,
            hasRequest: true,
            request,
            expired
        });
    } catch (error) {
        console.error("CURRENT GALLERY REQUEST ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to check gallery request."
        });
    }
});

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log("====================================");
        console.log("CAPTURED SERVER RUNNING");
        console.log(`Port: ${PORT}`);
        console.log(`Resend API Key: ${RESEND_API_KEY ? "CONFIGURED" : "NOT CONFIGURED"}`);
        console.log(`PayMongo Secret Key: ${PAYMONGO_SECRET_KEY ? "CONFIGURED" : "NOT CONFIGURED"}`);
        console.log(`PayMongo Webhook Secret: ${PAYMONGO_WEBHOOK_SECRET ? "CONFIGURED" : "NOT CONFIGURED"}`);
        console.log("====================================");
    }
);
