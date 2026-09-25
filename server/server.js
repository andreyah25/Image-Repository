const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const corsOptions = {
    origin: [
        "https://captured-photo-studio.onrender.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],
    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ],
    credentials: false
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

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

app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl === "/api/paymongo/webhook") {
            req.rawBody = buf;
        }
    }
}));
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;

const resend = RESEND_API_KEY
    ? new Resend(RESEND_API_KEY)
    : null;
const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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
async function requireAdmin(req, res, next) {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Missing authorization token."
            });
        }

        const token = authHeader.replace("Bearer ", "").trim();

        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser(token);

        if (userError || !user) {

            console.error(
                "Authentication error:",
                userError
            );

            return res.status(401).json({
                success: false,
                error: "Invalid or expired session."
            });
        }

        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("staff_profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {

            console.error(
                "Staff profile lookup error:",
                profileError
            );

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

        if (profile.role !== "admin") {

            return res.status(403).json({
                success: false,
                error: "Administrator access required."
            });
        }

        if (
            profile.status &&
            profile.status.toLowerCase() !== "active"
        ) {

            return res.status(403).json({
                success: false,
                error: "This account is not active."
            });
        }

        req.authUser = user;
        req.profile = profile;

        next();

    } catch (error) {

        console.error(
            "Admin authorization error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Authorization check failed."
        });
    }
}
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
    requireAdmin,
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
    requireAdmin,
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
async function recordStaffActivity({
    staffId,
    staffName,
    staffEmail,
    action,
    module = null,
    page = null,
    details = null
}) {

    try {

        const {
            error
        } = await supabaseAdmin
            .from("staff_activity_logs")
            .insert({
                staff_id: staffId,
                staff_name: staffName,
                staff_email: staffEmail,
                action: action,
                module: module,
                page: page,
                details: details
            });

        if (error) {

            console.error(
                "STAFF ACTIVITY LOG ERROR:",
                error
            );

        }

    } catch (error) {

        console.error(
            "STAFF ACTIVITY EXCEPTION:",
            error
        );

    }

}
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


            // ------------------------------------------------
            // FIRST HEARTBEAT / NEW SESSION
            // ------------------------------------------------

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

                // ------------------------------------------------
                // EXISTING SESSION
                // ------------------------------------------------

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

        // ----------------------------------------------------
        // IMPORTANT:
        // handle_new_user() may have already created the profile
        // ----------------------------------------------------

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

            // ------------------------------------------------
            // GET STAFF PROFILES
            // ------------------------------------------------

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


            // ------------------------------------------------
            // GET STAFF PRESENCE
            // ------------------------------------------------

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


            // ------------------------------------------------
            // MAP PRESENCE BY STAFF ID
            // ------------------------------------------------

            const presenceMap =
                new Map(
                    (presenceList || []).map(
                        presence => [
                            presence.staff_id,
                            presence
                        ]
                    )
                );


            // ------------------------------------------------
            // COMBINE STAFF + PRESENCE
            // ------------------------------------------------

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


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

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

            // ------------------------------------------------
            // GET STAFF PROFILE
            // ------------------------------------------------

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

            // ------------------------------------------------
            // PROTECT ADMIN ACCOUNTS
            // ------------------------------------------------

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

            // ------------------------------------------------
            // DISABLE SUPABASE AUTH ACCOUNT
            // ------------------------------------------------

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

            // ------------------------------------------------
            // DELETE LOGIN HISTORY
            // ------------------------------------------------

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

            // ------------------------------------------------
            // DELETE STAFF PROFILE
            // ------------------------------------------------

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

            // --------------------------------------------------
            // VALIDATE STAFF ID
            // --------------------------------------------------

            if (!staffId) {
                return res.status(400).json({
                    success: false,
                    error: "Staff account ID is required."
                });
            }

            // --------------------------------------------------
            // PREVENT ADMIN FROM SIGNING THEMSELVES OUT
            // --------------------------------------------------

            if (staffId === req.authUser.id) {
                return res.status(400).json({
                    success: false,
                    error:
                        "You cannot sign out your own account using this button."
                });
            }

            // --------------------------------------------------
            // GET TARGET STAFF
            // --------------------------------------------------

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

            // --------------------------------------------------
            // FORCE SIGN OUT
            // --------------------------------------------------

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

        /* -------------------------------------------------
           REMOVE OLD OTP
        ------------------------------------------------- */

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

                from: "onboarding@resend.dev",

                to: email,

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

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Customer email is required."
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

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: [email],
            subject: "Booking Confirmation - Captured Photography Studio",
            html: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:650px;margin:auto;">
                    <h2 style="color:#639A88;">
                        Booking Confirmed
                    </h2>

                    <p>
                        Hello ${name || "Customer"},
                    </p>

                    <p>
                        Your booking request has been confirmed by Captured Photography Studio.
                    </p>

                    <div style="background:#f6f8f7;padding:20px;border-radius:10px;margin:20px 0;">
                        <p><strong>Booking ID:</strong> ${bookingId || "-"}</p>
                        <p><strong>Session:</strong> ${sessionType || "-"}</p>
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Time:</strong> ${formattedTime}</p>
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
                        galleryLink
                            ? `
                                <p>
                                    Your customer gallery access link is available below:
                                </p>

                                <p>
                                    <a
                                        href="${galleryLink}"
                                        style="display:inline-block;padding:12px 20px;background:#639A88;color:white;text-decoration:none;border-radius:6px;"
                                    >
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

        // Validate customer email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Customer email is required."
            });
        }

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
        console.log("To:", email);
        console.log("From:", RESEND_FROM_EMAIL);
        console.log("Booking ID:", bookingId);

        const { data, error } = await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: [email],
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
        console.log("====================================");
        console.log("CREATE PAYMONGO CHECKOUT");
        console.log("====================================");

        console.log("Received booking data:", {
            customer_id,
            full_name,
            email,
            contact_number,
            booking_date,
            booking_time,
            session_type,
            payment_method,
            total_price,
            downpayment_amount,
            backdrops,
            addons,
            booking_duration
        });

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


        /* =====================================================
           2. VALIDATE PAYMENT METHOD
        ===================================================== */

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

console.log("====================================");
console.log("PAYMENT CALCULATION");
console.log("====================================");
console.log("Total Price:", totalPrice);
console.log("Down Payment:", downpayment);
console.log("Remaining Balance:", remainingBalance);
console.log("PayMongo Amount:", amountInCentavos);
console.log("====================================");



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


        console.log("Selected backdrops:", selectedBackdrops);
        console.log("Selected add-ons:", selectedAddons);
        console.log("Booking duration:", duration);


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


     const {
    data: bookingData,
    error: bookingError
} = await supabase
    .from("bookings")
    .insert({

        customer_id:
            customer_id || null,

        full_name:
            full_name,

        contact_number:
            contact_number,

        email:
            email,

        booking_date:
            booking_date,

        booking_time:
            booking_time,

        session_type:
            session_type,

        notes:
            notes || null,

        payment_method:
            "PayMongo",

        total_price:
            Number(totalPrice.toFixed(2)),

        downpayment_amount:
            Number(downpayment.toFixed(2)),

        remaining_balance:
            Number(remainingBalance.toFixed(2)),

        // IMPORTANT: correct column name
        payment_status:
            "Pending Payment",
status:
    "Pending Payment",

        paymongo_reference:
            bookingReference,

        backdrops:
            selectedBackdrops,

        addons:
            selectedAddons,

        booking_duration:
            duration

    })
    .select()
    .single();


        if (bookingError) {

            console.error(
                "Booking creation error:",
                bookingError
            );

            return res.status(500).json({
                success: false,
                error: "Unable to create booking.",
                message: bookingError.message
            });

        }


        console.log(
            "Booking created:",
            bookingData.id
        );

  

   const paymongoResponse = await fetch(
    "https://api.paymongo.com/v1/checkout_sessions",
    {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "Authorization":
                `Basic ${Buffer.from(
                    process.env.PAYMONGO_SECRET_KEY + ":"
                ).toString("base64")}`
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

                    payment_method_types: [
                        "qrph"
                    ],

                    billing: {
                        name: full_name,
                        email: email,
                        phone: contact_number
                    },

                    description:
                        `Reservation down payment - ${session_type} - ${booking_date} ${booking_time}`,

                    reference_number: bookingReference,

                    metadata: {
                        booking_id: String(bookingData.id),
                        booking_reference: bookingReference
                    },

                    send_email_receipt: true,

                    show_description: true,

                    success_url:
                        `${process.env.FRONTEND_URL}/frontend-customer/customer_payment_success.html?reference=${encodeURIComponent(
                            bookingReference
                        )}`,

                    cancel_url:
                        `${process.env.FRONTEND_URL}/frontend-customer/customer_payment_cancelled.html?reference=${encodeURIComponent(
                            bookingReference
                        )}`
                }
            }
        })
    }
);

      const paymongoData =
    await paymongoResponse.json();

console.log(
    "PAYMONGO HTTP STATUS:",
    paymongoResponse.status
);

console.log(
    "PAYMONGO HTTP OK:",
    paymongoResponse.ok
);

console.log(
    "PAYMONGO RESPONSE:",
    JSON.stringify(
        paymongoData,
        null,
        2
    )
);


        console.log(
            "PayMongo response:",
            JSON.stringify(
                paymongoData,
                null,
                2
            )
        );


        if (!paymongoResponse.ok) {

            console.error(
                "PayMongo API error:",
                paymongoData
            );


            await supabase
                .from("bookings")
                .update({

                    status:
                        "Cancelled",

                    payment_status:
                        "Payment Failed"

                })
                .eq(
                    "id",
                    bookingData.id
                );


            return res.status(
                paymongoResponse.status
            ).json({

                success: false,

                error:
                    "PayMongo checkout creation failed.",

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
                "PayMongo did not return checkout URL."
            );


            await supabase
                .from("bookings")
                .update({

                    status:
                        "Cancelled",

                    payment_status:
                        "Payment Failed"

                })
                .eq(
                    "id",
                    bookingData.id
                );


            return res.status(500).json({

                success: false,

                error:
                    "PayMongo did not return a checkout URL."

            });

        }



        const {
            error: updateBookingError
        } = await supabase
            .from("bookings")
            .update({

                paymongo_checkout_id:
                    checkoutSession.id

            })
            .eq(
                "id",
                bookingData.id
            );


        if (updateBookingError) {

            console.error(
                "Failed to save PayMongo checkout ID:",
                updateBookingError
            );

        }


        console.log(
            "PayMongo checkout successfully created."
        );

        console.log(
            "Checkout URL:",
            checkoutUrl
        );


        return res.json({

            success:
                true,

            booking_id:
                bookingData.id,

            checkout_url:
                checkoutUrl,

            checkout_session_id:
                checkoutSession.id,

            reference:
                bookingReference

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

        /* =====================================================
           1. VERIFY PAYMONGO WEBHOOK SIGNATURE
        ===================================================== */

        const signatureHeader =
            req.headers["paymongo-signature"];

        if (!signatureHeader) {

            console.error(
                "Missing PayMongo webhook signature."
            );

            return res.status(400).json({
                success: false,
                error: "Missing webhook signature."
            });

        }

        const signatureParts =
            signatureHeader
                .split(",");

        const timestampPart =
            signatureParts
                .find(part => part.startsWith("t="));

        const testSignaturePart =
            signatureParts
                .find(part => part.startsWith("te="));

        const liveSignaturePart =
            signatureParts
                .find(part => part.startsWith("li="));

        const timestamp =
            timestampPart
                ? timestampPart.replace("t=", "")
                : null;

        const receivedSignature =
            liveSignaturePart
                ? liveSignaturePart.replace("li=", "")
                : testSignaturePart
                    ? testSignaturePart.replace("te=", "")
                    : null;

        if (!timestamp || !receivedSignature) {

            console.error(
                "Invalid PayMongo signature format."
            );

            return res.status(400).json({
                success: false,
                error: "Invalid webhook signature."
            });

        }


        const rawBody =
            req.rawBody ||
            JSON.stringify(req.body);


        const signedPayload =
            `${timestamp}.${rawBody}`;


        const expectedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.PAYMONGO_WEBHOOK_SECRET
                )
                .update(signedPayload)
                .digest("hex");


       const receivedBuffer =
    Buffer.from(
        receivedSignature,
        "utf8"
    );

const expectedBuffer =
    Buffer.from(
        expectedSignature,
        "utf8"
    );

if (
    receivedBuffer.length !==
        expectedBuffer.length ||
    !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
    )
) {

    console.error(
        "Invalid PayMongo webhook signature."
    );

    return res.status(400).json({
        success: false,
        error:
            "Invalid webhook signature."
    });

}


        console.log(
            "PayMongo webhook signature verified."
        );


        console.log("====================================");
        console.log("PAYMONGO WEBHOOK RECEIVED");
        console.log("====================================");


        const event =
            req.body;


        console.log(
            "PayMongo webhook:",
            JSON.stringify(event, null, 2)
        );


        /* =====================================================
           2. GET EVENT INFORMATION
        ===================================================== */

        const eventType =
            event?.data?.attributes?.type;


        const resource =
            event?.data?.attributes?.data;


        const checkoutSessionId =
            resource?.id;


        const attributes =
            resource?.attributes || {};


        console.log(
            "Event type:",
            eventType
        );


        console.log(
            "Checkout session ID:",
            checkoutSessionId
        );


        /* =====================================================
           3. ONLY PROCESS PAYMENT EVENTS
        ===================================================== */

        if (
            eventType !==
                "checkout_session.payment.paid" &&
            eventType !==
                "checkout_session.payment.failed"
        ) {

            console.log(
                "Webhook event ignored:",
                eventType
            );

            return res.json({
                success: true,
                message: "Event ignored."
            });

        }


        /* =====================================================
           4. GET BOOKING REFERENCE
        ===================================================== */

        const reference =
            attributes?.reference_number ||
            attributes?.metadata?.booking_reference ||
            null;


        console.log(
            "Detected booking reference:",
            reference
        );


        /* =====================================================
           5. FIND BOOKING BY REFERENCE
        ===================================================== */

        let booking = null;


        if (reference) {

            const {
                data,
                error
            } = await supabase
                .from("bookings")
                .select("*")
                .eq(
                    "paymongo_reference",
                    reference
                )
                .maybeSingle();


            if (error) {

                console.error(
                    "Booking lookup error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: "Unable to find booking."
                });

            }


            booking = data;

        }

        if (
            !booking &&
            checkoutSessionId
        ) {

            const {
                data,
                error
            } = await supabase
                .from("bookings")
                .select("*")
                .eq(
                    "paymongo_checkout_id",
                    checkoutSessionId
                )
                .maybeSingle();


            if (error) {

                console.error(
                    "Checkout ID lookup error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: "Unable to find booking."
                });

            }


            booking = data;

        }

        if (!booking) {

            console.error(
                "No booking found for PayMongo webhook."
            );

            return res.status(404).json({
                success: false,
                error: "Booking not found."
            });

        }


        console.log(
            "Booking found:",
            booking.id
        );

if (
    booking.paymongo_checkout_id &&
    checkoutSessionId &&
    booking.paymongo_checkout_id !== checkoutSessionId
) {

    console.error(
        "❌ PAYMONGO CHECKOUT SESSION DOES NOT MATCH BOOKING."
    );

    console.error({
        bookingId:
            booking.id,

        databaseCheckoutId:
            booking.paymongo_checkout_id,

        webhookCheckoutId:
            checkoutSessionId
    });

    return res.status(400).json({
        success: false,
        error:
            "PayMongo checkout session does not match this booking."
    });

}

console.log(
    "PayMongo checkout session verified for booking."
);

        if (
            eventType ===
            "checkout_session.payment.paid"
        ) {

            console.log(
                "PAYMENT SUCCESSFUL"
            );

const payment =
    Array.isArray(attributes?.payments)
        ? attributes.payments[0]
        : null;

const paymentId =
    payment?.id || null;

console.log("====================================");
console.log("PAYMONGO PAYMENT INFORMATION");
console.log("====================================");

console.log(
    "Payment ID:",
    paymentId
);

console.log(
    "Payment object:",
    JSON.stringify(
        payment,
        null,
        2
    )
);

console.log("====================================");


/* =================================================
   VERIFY PAYMENT EXISTS
================================================= */

if (!paymentId) {

    console.error(
        "❌ PAYMONGO WEBHOOK HAS NO PAYMENT ID."
    );

    return res.status(400).json({
        success: false,
        error:
            "No PayMongo payment was found in the webhook."
    });

}

const paymongoPaidAmountCentavos =
    Number(
        payment?.attributes?.amount
    );

const requiredDownpaymentCentavos =
    Math.round(
        Number(
            booking.downpayment_amount
        ) * 100
    );

console.log("====================================");
console.log("PAYMENT AMOUNT VERIFICATION");
console.log("====================================");

console.log(
    "Booking ID:",
    booking.id
);

console.log(
    "Required downpayment:",
    requiredDownpaymentCentavos,
    "centavos"
);

console.log(
    "PayMongo paid amount:",
    paymongoPaidAmountCentavos,
    "centavos"
);

console.log("====================================");


if (
    !Number.isFinite(
        paymongoPaidAmountCentavos
    )
) {

    console.error(
        "❌ INVALID PAYMONGO PAYMENT AMOUNT."
    );

    return res.status(400).json({
        success: false,
        error:
            "Invalid PayMongo payment amount."
    });

}


if (
    paymongoPaidAmountCentavos <
    requiredDownpaymentCentavos
) {

    console.error(
        "❌ PAYMENT AMOUNT IS LESS THAN REQUIRED DOWNPAYMENT."
    );

    console.error({
        bookingId:
            booking.id,

        requiredDownpaymentCentavos,

        paymongoPaidAmountCentavos
    });

    return res.status(400).json({
        success: false,
        error:
            "Payment amount is less than the required downpayment."
    });

}

const referenceNumber =
    attributes?.reference_number ||
    reference ||
    null;



const paidAt =
    payment?.attributes?.paid_at
        ? new Date(
            payment.attributes.paid_at * 1000
        ).toISOString()
        : new Date().toISOString();



const totalBookingAmount =
    Number(
        booking.total_price
    ) || 0;

const downPaymentAmount =
    Number(
        booking.downpayment_amount
    ) || 0;

const remainingBalance =
    Math.max(
        0,
        Number(
            (
                totalBookingAmount -
                downPaymentAmount
            ).toFixed(2)
        )
    );


console.log("====================================");
console.log("FINAL PAYMENT CALCULATION");
console.log("====================================");

console.log(
    "Total booking amount:",
    totalBookingAmount
);

console.log(
    "Downpayment:",
    downPaymentAmount
);

console.log(
    "Remaining balance:",
    remainingBalance
);

console.log("====================================");


/* =================================================
   PREVENT DUPLICATE PAYMENT PROCESSING
================================================= */

if (
    String(
        booking.payment_status || ""
    )
        .trim()
        .toLowerCase() === "paid"
) {

    console.log(
        "Booking is already marked as Paid."
    );

    return res.json({
        success: true,
        message:
            "Payment was already processed."
    });

}


const {
    data: updatedBooking,
    error: updateError
} = await supabase
    .from("bookings")
    .update({

        payment_status:
            "Paid",

        status:
            "Pending",

        paymongo_payment_id:
            paymentId,

        paymongo_reference_number:
            referenceNumber,

        paymongo_paid_at:
            paidAt,

        remaining_balance:
            remainingBalance

    })
    .eq(
        "id",
        booking.id
    )
    .select()
    .single();


if (updateError) {

    console.error(
        "❌ FAILED TO UPDATE BOOKING AFTER PAYMENT."
    );

    console.error(
        updateError
    );

    return res.status(500).json({
        success: false,
        error:
            "Payment was received but booking could not be updated."
    });

}


if (!updatedBooking) {

    console.error(
        "❌ BOOKING UPDATE RETURNED NO RECORD."
    );

    return res.status(500).json({
        success: false,
        error:
            "Booking update could not be verified."
    });

}


console.log("====================================");
console.log("✅ BOOKING PAYMENT VERIFIED");
console.log("====================================");

console.log(
    "Booking ID:",
    updatedBooking.id
);

console.log(
    "Payment Status:",
    updatedBooking.payment_status
);

console.log(
    "Booking Status:",
    updatedBooking.status
);

console.log(
    "PayMongo Payment ID:",
    updatedBooking.paymongo_payment_id
);

console.log(
    "Paid At:",
    updatedBooking.paymongo_paid_at
);

console.log("====================================");

     
            if (booking.customer_id) {

                const {
                    error:
                        customerNotificationError
                } = await supabase
                    .from("notifications")
                    .insert({

                        customer_id:
                            booking.customer_id,

                        recipient:
                            "customer",

                        title:
                            "Payment Successful",

                        message:
                            `Your payment was successful.

Booking Date: ${booking.booking_date || "N/A"}
Booking Time: ${booking.booking_time || "N/A"}

Total Booking Amount: ₱${totalBookingAmount.toLocaleString(
                                "en-PH",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}

Down Payment Paid: ₱${downPaymentAmount.toLocaleString(
                                "en-PH",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}

Remaining Balance: ₱${remainingBalance.toLocaleString(
                                "en-PH",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}

Your booking is now awaiting admin confirmation.`,

                        is_read:
                            false

                    });


                if (
                    customerNotificationError
                ) {

                    console.error(
                        "Customer notification error:",
                        customerNotificationError
                    );

                } else {

                    console.log(
                        "Customer notification created successfully."
                    );

                }

            } else {

                console.log(
                    "Guest booking detected. Customer notification skipped."
                );

            }


            const paymentAmount =
                downPaymentAmount;


            const paymentMethod =
                booking.payment_method ||
                "PayMongo";


            let existingPayment = null;


            if (paymentId) {

                const {
                    data,
                    error:
                        existingPaymentError
                } = await supabase
                    .from("payments")
                    .select("id")
                    .eq(
                        "paymongo_payment_id",
                        paymentId
                    )
                    .maybeSingle();


                if (existingPaymentError) {

                    console.error(
                        "Payment duplicate check error:",
                        existingPaymentError
                    );

                } else {

                    existingPayment =
                        data;

                }

            }


            if (!existingPayment) {

                const {
                    error:
                        paymentInsertError
                } = await supabase
                    .from("payments")
                    .insert({

                        customer_id:
                            booking.customer_id ||
                            null,

                        booking_id:
                            booking.id,

                        gallery_access_request_id:
                            null,

                        client_name:
                            booking.full_name,

                        email:
                            booking.email ||
                            null,

                        amount:
                            paymentAmount,

                        payment_method:
                            paymentMethod,

                        status:
                            "Paid",

                        payment_type:
                            "Booking",

                        payment_date:
                            paidAt,

                        paymongo_payment_id:
                            paymentId,

                        paymongo_checkout_id:
                            checkoutSessionId,

                        payment_reference:
                            referenceNumber

                    });


                if (paymentInsertError) {

                    console.error(
                        "Failed to create payment record:",
                        paymentInsertError
                    );

                } else {

                    console.log(
                        "Payment successfully recorded in payments table."
                    );

                }

            } else {

                console.log(
                    "Payment already exists. Duplicate record skipped:",
                    paymentId
                );

            }

            const adminPaymentMethod =
                String(
                    booking.payment_method ||
                    "PayMongo"
                )
                    .trim()
                    .toLowerCase() ===
                    "paymongo"
                    ? "QR Ph"
                    : booking.payment_method ||
                      "N/A";


            const {
                error:
                    adminNotificationError
            } = await supabase
                .from("notifications")
                .insert({

                    recipient:
                        "admin",

                    title:
                        "New Paid Booking Reservation",

                    message:
                        `${booking.full_name || "A customer"} booked a ${booking.session_type || "Photography Session"}.

Booking Date: ${booking.booking_date || "N/A"}
Booking Time: ${booking.booking_time || "N/A"}

Total Booking Amount: ₱${totalBookingAmount.toLocaleString(
                            "en-PH",
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }
                        )}

Down Payment Paid: ₱${downPaymentAmount.toLocaleString(
                            "en-PH",
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }
                        )}

Remaining Balance: ₱${remainingBalance.toLocaleString(
                            "en-PH",
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }
                        )}

Payment Method: ${adminPaymentMethod}
Payment Status: Paid`,

                    is_read:
                        false

                });


            if (adminNotificationError) {

                console.error(
                    "Admin notification error:",
                    adminNotificationError
                );

            } else {

                console.log(
                    "Detailed admin booking notification created successfully."
                );

            }


            console.log(
                "Booking marked as PAID."
            );

        }


        /* =====================================================
           9. PAYMENT FAILED
        ===================================================== */

        if (
            eventType ===
            "checkout_session.payment.failed"
        ) {

            console.log(
                "PAYMENT FAILED"
            );


            const {
                error: updateError
            } = await supabase
                .from("bookings")
                .update({

                    payment_status:
                        "Payment Failed",

                    status:
                        "Cancelled"

                })
                .eq(
                    "id",
                    booking.id
                );


            if (updateError) {

                console.error(
                    "Failed to update failed booking:",
                    updateError
                );

                return res.status(500).json({
                    success: false,
                    error: "Failed to update booking."
                });

            }

            if (booking.customer_id) {

                const {
                    error:
                        notificationError
                } = await supabase
                    .from("notifications")
                    .insert({

                        customer_id:
                            booking.customer_id,

                        recipient:
                            "customer",

                        title:
                            "Payment Failed",

                        message:
                            `Your reservation payment was not completed.

Booking Date: ${booking.booking_date || "N/A"}
Booking Time: ${booking.booking_time || "N/A"}

Total Booking Amount: ₱${(
                                Number(
                                    booking.total_price
                                ) || 0
                            ).toLocaleString(
                                "en-PH",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}

The booking has been cancelled. Please create a new booking if you would like to reserve another schedule.`,

                        is_read:
                            false

                    });


                if (notificationError) {

                    console.error(
                        "Payment failed notification error:",
                        notificationError
                    );

                } else {

                    console.log(
                        "Payment failed notification created successfully."
                    );

                }

            } else {

                console.log(
                    "Guest booking detected. Payment-failed customer notification skipped."
                );

            }

        }


        /* =====================================================
           10. TELL PAYMONGO WEBHOOK WAS RECEIVED
        ===================================================== */

        return res.json({

            success:
                true,

            message:
                "Webhook processed successfully."

        });

    }
    catch (error) {

        console.error(
            "PayMongo webhook error:",
            error
        );

        return res.status(500).json({

            success:
                false,

            error:
                error.message

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


        /* =====================================================
           GET BOOKINGS FOR SELECTED DATE
           
           Server uses SUPABASE SERVICE ROLE KEY,
           so this is not blocked by customer RLS.
        ===================================================== */

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


        /* =====================================================
           ONLY RETURN ACTIVE BOOKINGS

           We do NOT return customer names, emails,
           phone numbers, payment references, etc.
        ===================================================== */

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


        /* =====================================================
           CALCULATE LEGACY BOOKING DURATION
        ===================================================== */

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


            /* =================================================
               ADD PHOTOGRAPHER ADD-ON TIME
            ================================================= */

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
    requireAdmin,
    async (req, res) => {

        try {

            console.log("====================================");
            console.log("📋 LOADING ALL BOOKINGS FOR ADMIN");
            console.log("====================================");

            const {
                data: bookings,
                error
            } = await supabase
                .from("bookings")
                .select("*")
                .order("booking_date", {
                    ascending: true
                })
                .order("booking_time", {
                    ascending: true
                });

            if (error) {

                console.error(
                    "❌ Admin bookings query error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error: "Unable to load bookings.",
                    message: error.message
                });
            }

            console.log(
                "✅ Total bookings found:",
                bookings?.length || 0
            );

            console.log(
                "Booking IDs:",
                (bookings || []).map(
                    booking => booking.id
                )
            );

            console.log(
                "Booking statuses:",
                (bookings || []).map(
                    booking => ({
                        id: booking.id,
                        name: booking.full_name,
                        date: booking.booking_date,
                        time: booking.booking_time,
                        status: booking.status,
                        payment_status: booking.payment_status
                    })
                )
            );

            console.log("====================================");

            return res.status(200).json({

                success: true,

                count:
                    bookings?.length || 0,

                bookings:
                    bookings || []

            });

        } catch (error) {

            console.error(
                "❌ Admin bookings API error:",
                error
            );

            return res.status(500).json({

                success: false,

                error:
                    "Internal server error.",

                message:
                    error.message

            });
        }
    }
);


app.get("/api/customer/bookings", async (req, res) => {

    try {

        const customerId = String(
            req.query.customer_id || ""
        ).trim();

        const email = String(
            req.query.email || ""
        ).trim().toLowerCase();

        if (!customerId && !email) {

            return res.status(400).json({
                success: false,
                error: "Customer ID or email is required."
            });

        }

        let query = supabase
            .from("bookings")
            .select(`
                id,
                customer_id,
                full_name,
                contact_number,
                email,
                booking_date,
                booking_time,
                session_type,
                notes,
                status,
                created_at,
                payment_method,
                downpayment_amount,
                payment_status,
                payment_reference,
                total_price,
                remaining_balance,
                full_payment_amount,
                final_payment_amount,
                confirmed_at,
                rejection_reason,
                paymongo_checkout_id,
                paymongo_payment_id,
                paymongo_reference_number,
                paymongo_paid_at,
                paymongo_reference,
                backdrops,
                addons,
                booking_duration,
                is_archived
            `)
            .eq("is_archived", false);

        if (customerId) {

            query = query.eq(
                "customer_id",
                customerId
            );

        } else {

            query = query.ilike(
                "email",
                email
            );

        }

        const {
            data: bookings,
            error
        } = await query
            .order("booking_date", {
                ascending: true
            })
            .order("booking_time", {
                ascending: true
            });

        if (error) {

            console.error(
                "Customer bookings query error:",
                error
            );

            return res.status(500).json({
                success: false,
                error: "Unable to load customer bookings.",
                message: error.message
            });

        }

        console.log(
            "Customer bookings loaded:",
            bookings?.length || 0
        );

        return res.json({

            success: true,

            count:
                bookings?.length || 0,

            bookings:
                bookings || []

        });

    } catch (error) {

        console.error(
            "Customer bookings API error:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                "Internal server error.",

            message:
                error.message

        });

    }

});
app.post(
    "/api/gallery-access/request",
    async (req, res) => {

        try {

            console.log("========================================");
            console.log("CUSTOMER GALLERY ACCESS REQUEST");
            console.log("========================================");


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

// =====================================================
// PAYMONGO GALLERY ACCESS WEBHOOK
// =====================================================
app.post("/api/paymongo/gallery-webhook", async (req, res) => {

    try {

        console.log("====================================");
        console.log("PAYMONGO GALLERY WEBHOOK RECEIVED");
        console.log("====================================");


        if (!event) {

            console.error("Gallery webhook: No event data.");

            return res.status(200).json({
                received: true
            });
        }
        const event = req.body?.data;

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

        // Only process successful gallery payments
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

        console.log(
            "GALLERY REQUEST FOUND:",
            accessRequest
        );

        if (
            Number(
                accessRequest.request_number || 1
            ) < 2
        ) {

            console.log(
                "Ignoring payment for first gallery request:",
                requestId
            );

            return res.status(200).json({
                received: true
            });
        }

        if (
            accessRequest.payment_required !== true
        ) {

            console.log(
                "Payment is not required:",
                requestId
            );

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

            console.log(
                "Gallery payment already confirmed:",
                requestId
            );

            return res.status(200).json({
                received: true
            });
        }

        // ---------------------------------------------
        // Set access dates
        // ---------------------------------------------

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

                paid_at:
                    paidAt.toISOString(),

                access_started_at:
                    paidAt.toISOString(),

                access_granted_at:
                    paidAt.toISOString(),

                access_expires_at:
                    expiresAt.toISOString(),

                expires_at:
                    expiresAt.toISOString(),

                archive_at:
                    archiveAt.toISOString(),

                is_expired: false

            })
            .eq(
                "id",
                requestId
            );

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
        const token = req.query.token;

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

        // ---------------------------------------------
        // Load gallery access request
        // ---------------------------------------------
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
                    paid_at,
                    access_started_at,
                    access_expires_at,
                    expires_at,
                    is_expired
                `)
                .eq("id", requestId)
                .maybeSingle();

        if (requestError) {

            console.error(
                "PAYMENT STATUS: Request query error:",
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

        // ---------------------------------------------
        // Verify repository token
        // ---------------------------------------------
        const { data: repositoryLink, error: linkError } =
            await supabase
                .from("repository_client_links")
                .select(`
                    id,
                    booking_id,
                    repository_id,
                    access_token
                `)
                .eq("repository_id", accessRequest.repository_id)
                .eq("access_token", token)
                .maybeSingle();

        if (linkError) {

            console.error(
                "PAYMENT STATUS: Repository link error:",
                linkError
            );

            return res.status(500).json({
                success: false,
                message: "Unable to verify gallery token."
            });

        }

        if (!repositoryLink) {

            return res.status(403).json({
                success: false,
                message: "Invalid gallery token."
            });

        }

        // ---------------------------------------------
        // Return payment status
        // ---------------------------------------------
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

            paymentConfirmed:

                paymentConfirmed,

            paymentStatus:
                accessRequest.payment_status || "unpaid",

            paidAt:
                accessRequest.paid_at || null,

            accessExpiresAt:
                accessRequest.access_expires_at ||
                accessRequest.expires_at ||
                null,

            request: accessRequest

        });

    } catch (error) {

        console.error(
            "PAYMENT STATUS: Unexpected error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to check payment status."
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

        const token =
            String(req.query.token || "").trim();

        const requestId =
            String(
                req.query.request ||
                req.query.requestId ||
                ""
            ).trim();

        console.log(
            "===================================="
        );

        console.log(
            "GALLERY PHOTOS REQUEST"
        );

        console.log(
            "TOKEN:",
            token ? "EXISTS" : "MISSING"
        );

        console.log(
            "REQUEST ID:",
            requestId
        );

        console.log(
            "===================================="
        );

        if (!token || !requestId) {

            return res.status(400).json({
                success: false,
                error:
                    "Gallery token and request ID are required."
            });

        }

        // ============================================
        // 1. FIND THE GALLERY ACCESS REQUEST
        // ============================================

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
                error:
                    "Unable to verify gallery access."
            });

        }

        if (!accessRequest) {

            return res.status(404).json({
                success: false,
                error:
                    "Gallery access request not found."
            });

        }

        // ============================================
        // 2. REQUEST MUST BE APPROVED
        // ============================================

        if (
            String(accessRequest.status || "")
                .toLowerCase() !== "approved"
        ) {

            return res.status(403).json({
                success: false,
                error:
                    "Gallery access has not been approved."
            });

        }

        // ============================================
        // 3. GET REPOSITORY
        // ============================================

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
            .eq(
                "id",
                accessRequest.repository_id
            )
            .eq(
                "booking_id",
                accessRequest.booking_id
            )
            .maybeSingle();

        if (repositoryError) {

            console.error(
                "GALLERY REPOSITORY LOOKUP ERROR:",
                repositoryError
            );

            return res.status(500).json({
                success: false,
                error:
                    "Unable to verify gallery repository."
            });

        }

        if (!repository) {

            return res.status(404).json({
                success: false,
                error:
                    "Gallery repository not found."
            });

        }

        // ============================================
        // 4. VERIFY TOKEN
        // ============================================

        if (
            String(repository.access_token || "") !==
            token
        ) {

            return res.status(403).json({
                success: false,
                error:
                    "Invalid gallery access token."
            });

        }

        // ============================================
        // 5. CHECK EXPIRATION
        // ============================================

        if (accessRequest.access_expires_at) {

            const expiresAt =
                new Date(
                    accessRequest.access_expires_at
                );

            if (
                Number.isNaN(
                    expiresAt.getTime()
                )
            ) {

                return res.status(403).json({
                    success: false,
                    error:
                        "Gallery expiration date is invalid."
                });

            }

            if (new Date() >= expiresAt) {

                return res.status(403).json({
                    success: false,
                    error:
                        "Your gallery access has expired."
                });

            }

        }

        // ============================================
        // 6. CHECK PAYMENT FOR REQUEST #2+
        // ============================================

        const requestNumber =
            Number(
                accessRequest.request_number || 1
            );

        if (requestNumber >= 2) {

            const paymentConfirmed =
                accessRequest.payment_confirmed === true;

            const paymentPaid =
                String(
                    accessRequest.payment_status || ""
                ).toLowerCase() === "paid";

            if (
                !paymentConfirmed ||
                !paymentPaid
            ) {

                console.log(
                    "Gallery payment required:",
                    requestId
                );

                return res.status(403).json({
                    success: false,
                    error:
                        "Payment is required before accessing this gallery.",
                    paymentRequired: true,
                    paymentConfirmed:
                        paymentConfirmed,
                    paymentStatus:
                        accessRequest.payment_status
                });

            }

        }

        // ============================================
        // 7. GET BOOKING
        // ============================================

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
                session_type,
                package_name,
                total_price
            `)
            .eq(
                "id",
                accessRequest.booking_id
            )
            .maybeSingle();

        if (bookingError) {

            console.error(
                "GALLERY BOOKING LOOKUP ERROR:",
                bookingError
            );

        }

        // ============================================
        // 8. GET PHOTOS
        // ============================================

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
            .eq(
                "repository_id",
                repository.id
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );

        if (photosError) {

            console.error(
                "GALLERY PHOTOS LOOKUP ERROR:",
                photosError
            );

            return res.status(500).json({
                success: false,
                error:
                    "Unable to load gallery photos."
            });

        }

        // ============================================
        // 9. RETURN GALLERY DATA
        // ============================================

        console.log(
            "GALLERY PHOTOS FOUND:",
            photos?.length || 0
        );

        return res.json({

            success: true,

            request: {

                id:
                    accessRequest.id,

                booking_id:
                    accessRequest.booking_id,

                repository_id:
                    accessRequest.repository_id,

                customer_email:
                    accessRequest.customer_email,

                request_number:
                    accessRequest.request_number,

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

            booking:
                booking || null,

            repository: {

                id:
                    repository.id,

                booking_id:
                    repository.booking_id

            },

            photos:
                photos || []

        });

    }

    catch (error) {

        console.error(
            "GALLERY PHOTOS SERVER ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                "Unable to load gallery photos."

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
