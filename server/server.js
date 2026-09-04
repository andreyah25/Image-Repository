require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");

const app = express();


app.use(cors());
app.use( express.json({
        verify: (req, res, buf) => {
            if (req.originalUrl === "/api/paymongo/webhook") {
                req.rawBody = buf;
            }
        }
    })
);

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;


const resend = RESEND_API_KEY
    ? new Resend(RESEND_API_KEY)
    : null;

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);
/* =========================================================
   ADMIN AUTHORIZATION
========================================================= */

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

         const { error: profileError } = await supabase
    .from("staff_profiles")
    .update({
        full_name: fullName,
        email: email,
        role: "staff",
        status: "Active",
        updated_at: new Date().toISOString()
    })
    .eq("id", staffUser.id);

if (profileError) {
    console.error("Staff profile update error:", profileError);

    await supabase.auth.admin.deleteUser(staffUser.id);

    return res.status(500).json({
        success: false,
        error: profileError.message
    });
}   

            profileError = error;
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
                error
            } = await supabase
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

            if (error) {

                console.error(
                    "Staff list error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to load staff list."
                });
            }

            return res.json({

                success:
                    true,

                staff:
                    staffList || []

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


app.delete(
    "/api/admin/staff/:staffId",
    requireAdmin,
    async (req, res) => {

        try {

            const {
                staffId
            } = req.params;

            if (!staffId) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Staff ID is required."
                });
            }

            /* ---------------------------------------------
               GET TARGET STAFF
            --------------------------------------------- */

            const {
                data: staff,
                error: staffError
            } =
                await supabase
                    .from("staff_profiles")
                    .select("*")
                    .eq("id", staffId)
                    .maybeSingle();

            if (staffError) {

                console.error(
                    "Staff lookup error:",
                    staffError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to find staff account."
                });
            }

            if (!staff) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Staff account not found."
                });
            }

            /* ---------------------------------------------
               NEVER DELETE ADMIN THROUGH STAFF ROUTE
            --------------------------------------------- */

            if (staff.role === "admin") {

                return res.status(403).json({
                    success: false,
                    error:
                        "The administrator account cannot be deleted here."
                });
            }

            /* ---------------------------------------------
               DELETE LOGIN HISTORY FIRST
            --------------------------------------------- */

            const {
                error: historyError
            } =
                await supabase
                    .from("login_history")
                    .delete()
                    .eq("staff_id", staffId);

            if (historyError) {

                console.error(
                    "Login history deletion error:",
                    historyError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to remove staff login history."
                });
            }

            /* ---------------------------------------------
               DELETE AUTH USER
            --------------------------------------------- */

            const {
                error: authError
            } =
                await supabase.auth.admin.deleteUser(
                    staffId
                );

            if (authError) {

                console.error(
                    "Auth user deletion error:",
                    authError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Unable to delete staff authentication account."
                });
            }

            /* ---------------------------------------------
               DELETE STAFF PROFILE
            --------------------------------------------- */

            const {
                error: profileError
            } =
                await supabase
                    .from("staff_profiles")
                    .delete()
                    .eq("id", staffId);

            if (profileError) {

                console.error(
                    "Staff profile deletion error:",
                    profileError
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Auth account deleted, but staff profile could not be removed."
                });
            }

            console.log(
                "Staff account deleted:",
                staff.email
            );

            return res.json({

                success:
                    true,

                message:
                    "Staff account deleted successfully."

            });

        } catch (error) {

            console.error(
                "Delete staff error:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Server error while deleting staff."
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
/* =========================================================
   OTP
========================================================= */

function generateOTP() {
    return Math.floor(
        100000 + Math.random() * 900000
    ).toString();
}

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

        /* -------------------------------------------------
           SAVE NEW OTP
        ------------------------------------------------- */

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

        /* -------------------------------------------------
           SEND EMAIL
        ------------------------------------------------- */

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
/* =========================================================
   BOOKING CONFIRMATION EMAIL
========================================================= */

app.post("/send-payment-confirmation", async (req, res) => {

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

        const totalPrice =
            Number(total_price) || 0;

        const downpaymentAmount =
            Number(downpayment_amount) || 0;

        const remainingBalance =
            Math.max(
                0,
                totalPrice - downpaymentAmount
            );

        console.log("====================================");
        console.log("BOOKING CONFIRMATION EMAIL");
        console.log("====================================");

        console.log("Email:", email);
        console.log("Name:", full_name);
        console.log("Booking Date:", booking_date);
        console.log("Booking Time:", booking_time);
        console.log("Session Type:", session_type);
        console.log("Total Price:", totalPrice);
        console.log("Down Payment:", downpaymentAmount);
        console.log("Remaining Balance:", remainingBalance);

        if (!email || !String(email).trim()) {
            return res.status(400).json({
                success: false,
                error: "Customer email is required."
            });
        }

        if (!resend) {
            return res.status(500).json({
                success: false,
                error: "RESEND_API_KEY is not configured."
            });
        }

        const fromEmail =
            process.env.RESEND_FROM_EMAIL ||
            "onboarding@resend.dev";

        /*
         * Use the values already stored in the database.
         */
        const total = Number(totalPrice) || 0;
        const downpayment = Number(downpaymentAmount) || 0;
        const balance = Number(remainingBalance) || 0;

        const formatPeso = (amount) =>
            `₱${amount.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;

        const { data, error } =
            await resend.emails.send({

                from: fromEmail,

                to: [String(email).trim()],

                subject:
                    "Booking Confirmed - Captured Photography Studio",

                html: `
                    <div style="
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: auto;
                        padding: 30px;
                        color: #333;
                        line-height: 1.6;
                    ">

                        <h2 style="
                            margin-bottom: 20px;
                            color: #222;
                        ">
                            Captured Photography Studio
                        </h2>

                        <h3 style="
                            color: #222;
                        ">
                            Your Booking Has Been Confirmed!
                        </h3>

                        <p>
                            Hi ${full_name || "Customer"},
                        </p>

                        <p>
                            Your photography session booking has
                            been successfully confirmed by our admin.
                        </p>

                        <!-- BOOKING DETAILS -->

                        <div style="
                            background: #f5f5f5;
                            padding: 20px;
                            margin: 20px 0;
                            border-radius: 8px;
                        ">

                            <h3 style="
                                margin-top: 0;
                            ">
                                Booking Details
                            </h3>

                            <p>
                                <strong>Session:</strong>
                                ${session_type || "Photography Session"}
                            </p>

                            <p>
                                <strong>Date:</strong>
                                ${booking_date || "N/A"}
                            </p>

                            <p>
                                <strong>Time:</strong>
                                ${booking_time || "N/A"}
                            </p>

                        </div>

                        <!-- PAYMENT DETAILS -->

                        <div style="
                            border: 1px solid #ddd;
                            padding: 20px;
                            margin: 20px 0;
                            border-radius: 8px;
                        ">

                            <h3 style="
                                margin-top: 0;
                            ">
                                Payment Details
                            </h3>

                            <p>
                                <strong>Total Booking Amount:</strong>
                                ${formatPeso(total)}
                            </p>

                            <p>
                                <strong>Down Payment Paid:</strong>
                                ${formatPeso(downpayment)}
                            </p>

                            <hr style="
                                border: none;
                                border-top: 1px solid #ddd;
                                margin: 15px 0;
                            ">

                            <p style="
                                font-size: 20px;
                                margin-bottom: 0;
                            ">
                                <strong>Remaining Balance:</strong>
                                ${formatPeso(balance)}
                            </p>

                        </div>

                        ${
                            balance > 0
                                ? `
                                    <div style="
                                        background: #fff8e1;
                                        border-left: 4px solid #f0ad00;
                                        padding: 15px;
                                        margin: 20px 0;
                                    ">
                                        <strong>
                                            Remaining Balance
                                        </strong>

                                        <p style="margin-bottom: 0;">
                                            Please settle your remaining
                                            balance of
                                            <strong>
                                                ${formatPeso(balance)}
                                            </strong>
                                            according to the payment
                                            instructions provided by
                                            Captured Photography Studio.
                                        </p>
                                    </div>
                                `
                                : `
                                    <div style="
                                        background: #e8f5e9;
                                        border-left: 4px solid #43a047;
                                        padding: 15px;
                                        margin: 20px 0;
                                    ">
                                        <strong>
                                            Fully Paid
                                        </strong>

                                        <p style="margin-bottom: 0;">
                                            Your booking has been fully paid.
                                            No remaining balance is due.
                                        </p>
                                    </div>
                                `
                        }

                        <p>
                            Please make sure to arrive on time for
                            your scheduled photography session.
                        </p>

                        <p>
                            Thank you for choosing
                            <strong>
                                Captured Photography Studio
                            </strong>.
                        </p>

                        <p>
                            We look forward to seeing you!
                        </p>

                        <hr style="
                            border: none;
                            border-top: 1px solid #ddd;
                            margin-top: 30px;
                        ">

                        <p style="
                            font-size: 12px;
                            color: #777;
                        ">
                            This is an automated booking confirmation
                            email from Captured Photography Studio.
                        </p>

                    </div>
                `
            });

        if (error) {

            console.error(
                "Resend booking confirmation error:",
                error
            );

            return res.status(500).json({
                success: false,
                error: "Failed to send confirmation email.",
                message:
                    error.message || "Resend failed."
            });
        }

        console.log(
            "Confirmation email successfully sent:",
            data?.id
        );

        return res.json({
            success: true,
            message:
                "Booking confirmation email sent successfully.",
            email_id:
                data?.id || null
        });

    } catch (error) {

        console.error(
            "Booking confirmation email error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Internal server error.",
            message: error.message
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


        /* =====================================================
           1. VALIDATE BOOKING INFORMATION
        ===================================================== */

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


        /* =====================================================
           8. CREATE BOOKING
        ===================================================== */

        const {
            data: bookingData,
            error: bookingError
        } = await supabase
            .from("bookings")
            .insert({

                /*
                 * Guest booking:
                 * customer_id can be NULL.
                 */
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

               payment_method: "PayMongo",
total_price: Number(totalPrice.toFixed(2)),

downpayment_amount:
    Number(downpayment.toFixed(2)),

remaining_balance:
    Number(remainingBalance.toFixed(2)),

payment_status: "Pending Payment",

                status:
                    "Pending",

                paymongo_reference:
                    bookingReference,

                /* ---------------------------------------------
                   NEW FIELDS
                --------------------------------------------- */

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
    "https://api.paymongo.com/v2/checkout_sessions",
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

                            name:
                                `Reservation Down Payment - ${session_type}`,

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

                    reference_number:
                        bookingReference,

                    metadata: {
                        booking_id:
                            String(bookingData.id),

                        booking_reference:
                            bookingReference
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


        if (
            !crypto.timingSafeEqual(
                Buffer.from(receivedSignature),
                Buffer.from(expectedSignature)
            )
        ) {

            console.error(
                "Invalid PayMongo webhook signature."
            );

            return res.status(400).json({
                success: false,
                error: "Invalid webhook signature."
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


        /* =====================================================
           6. FALLBACK: FIND BY CHECKOUT SESSION ID
        ===================================================== */

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


        /* =====================================================
           7. BOOKING NOT FOUND
        ===================================================== */

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


        /* =====================================================
           8. PAYMENT SUCCESS
        ===================================================== */

        if (
            eventType ===
            "checkout_session.payment.paid"
        ) {

            console.log(
                "PAYMENT SUCCESSFUL"
            );


            /* =================================================
               PAYMENT INFORMATION
            ================================================= */

            const payment =
                attributes?.payments?.[0];


            const paymentId =
                payment?.id || null;


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


            /* =================================================
               CALCULATE PAYMENT AMOUNTS
            ================================================= */

            const totalBookingAmount =
                Number(
                    booking.total_price
                ) || 0;


            const downPaymentAmount =
                Number(
                    booking.downpayment_amount
                ) || 0;


            const remainingBalance =
                booking.remaining_balance !== null &&
                booking.remaining_balance !== undefined
                    ? Number(
                        booking.remaining_balance
                    ) || 0
                    : Math.max(
                        0,
                        totalBookingAmount -
                        downPaymentAmount
                    );


            /* =================================================
               UPDATE BOOKING
            ================================================= */

            const {
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
                        Number(
                            remainingBalance.toFixed(2)
                        )

                })
                .eq(
                    "id",
                    booking.id
                );


            if (updateError) {

                console.error(
                    "Failed to update paid booking:",
                    updateError
                );

                return res.status(500).json({
                    success: false,
                    error: "Failed to update booking."
                });

            }


            console.log(
                "Booking payment status updated to Paid."
            );


            /* =================================================
               CUSTOMER NOTIFICATION
            ================================================= */

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


            /* =================================================
               RECORD PAYMENT IN PAYMENTS TABLE
            ================================================= */

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


            /* =================================================
               ADMIN NOTIFICATION
               DETAILED BOOKING INFORMATION
            ================================================= */

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


            /* =================================================
               CUSTOMER PAYMENT FAILED NOTIFICATION
            ================================================= */

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


        /* =====================================================
           PACKAGE DURATIONS
           
           Used only for older bookings where
           booking_duration is NULL.
        ===================================================== */

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


        /* =====================================================
           RETURN ONLY DATA NEEDED BY CUSTOMER BOOKING PAGE
        ===================================================== */

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
