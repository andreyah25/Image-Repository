require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");

const app = express();



app.use(cors());
app.use(express.json());
app.use(
    "/design",
    express.static(
        path.join(__dirname, "../design")
    )
);

app.use(
    "/frontend-customer",
    express.static(
        path.join(__dirname, "../frontend-customer")
    )
);

app.use(
    "/frontend-admin",
    express.static(
        path.join(__dirname, "../frontend-admin")
    )
);
/* =========================================================
   ENVIRONMENT VARIABLES
========================================================= */

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const MAYA_PUBLIC_KEY = process.env.MAYA_PUBLIC_KEY;
const MAYA_SECRET_KEY = process.env.MAYA_SECRET_KEY;



const MAYA_CHECKOUT_URL =
    "https://pg-sandbox.paymaya.com/checkout/v1/checkouts";

const MAYA_PAYMENT_URL =
    "https://pg-sandbox.paymaya.com/payments/v1/payments";

/* =========================================================
   CLIENTS
========================================================= */

const resend = RESEND_API_KEY
    ? new Resend(RESEND_API_KEY)
    : null;

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);
app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "../frontend-customer/customer_homepage.html"
        )
    );
});
app.get("/booking", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "../frontend-customer/customer_booking.html"
        )
    );
});

app.get("/gallery", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "../frontend-customer/customer_gallery_view.html"
        )
    );
});

app.get("/gallery-request", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "../frontend-customer/customer_gallery_request.html"
        )
    );
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/health", (req, res) => {
    res.json({
        success: true,
        server: "online",
        maya: MAYA_PUBLIC_KEY
            ? "configured"
            : "not configured"
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

/* =========================================================
   MAYA HELPERS
========================================================= */

/*
    Maya Create Checkout uses the PUBLIC API KEY.

    Maya documentation:
    Create Checkout -> Public Key
*/
function mayaPublicAuth() {

    return Buffer
        .from(`${MAYA_PUBLIC_KEY}:`)
        .toString("base64");
}


/*
    Maya payment retrieval uses the SECRET API KEY.

    This is intentionally kept on the server.
    NEVER put MAYA_SECRET_KEY in your HTML/JavaScript.
*/
function mayaSecretAuth() {

    return Buffer
        .from(`${MAYA_SECRET_KEY}:`)
        .toString("base64");
}


/*
    Convert PHP values safely to numbers.
*/
function money(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return null;
    }

    return Number(number.toFixed(2));
}


/* =========================================================
   CREATE MAYA CHECKOUT
========================================================= */

app.post(
    "/api/maya/create-checkout",
    async (req, res) => {

        try {

            const {
                bookingId,
                amount,
                fullName,
                email,
                description
            } = req.body;

            /* -------------------------------------------------
               VALIDATION
            ------------------------------------------------- */

            if (
                !bookingId ||
                amount === undefined ||
                amount === null ||
                !email
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "bookingId, amount, and email are required."
                });
            }

            if (!MAYA_PUBLIC_KEY) {

                return res.status(500).json({
                    success: false,
                    message:
                        "MAYA_PUBLIC_KEY is not configured."
                });
            }

            const paymentAmount = money(amount);

            if (
                paymentAmount === null ||
                paymentAmount <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid payment amount."
                });
            }

            /* -------------------------------------------------
               VERIFY BOOKING EXISTS
            ------------------------------------------------- */

            const {
                data: booking,
                error: bookingError
            } = await supabase
                .from("bookings")
                .select("*")
                .eq("id", bookingId)
                .maybeSingle();

            if (bookingError) {

                console.error(
                    "Booking lookup error:",
                    bookingError
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to verify booking."
                });
            }

            if (!booking) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found."
                });
            }

            /* -------------------------------------------------
               PREVENT PAYMENT DUPLICATION
            ------------------------------------------------- */

            if (
                String(
                    booking.payment_status || ""
                ).toLowerCase() === "paid"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This booking has already been paid."
                });
            }

            /* -------------------------------------------------
               CREATE UNIQUE MAYA REFERENCE
            ------------------------------------------------- */

            const requestReferenceNumber =
                `CAPTURED-${bookingId}-${Date.now()}`
                    .slice(0, 36);

            /* -------------------------------------------------
               MAYA CHECKOUT DATA
            ------------------------------------------------- */

            const checkoutData = {

                totalAmount: {
                    value:
                        paymentAmount.toFixed(2),
                    currency: "PHP"
                },

                buyer: {

                    firstName:
                        fullName || "Customer",

                    email: email
                },

                items: [

                    {
                        name:
                            description ||
                            "Photography Session Reservation",

                        quantity: "1",

                        amount: {

                            value:
                                paymentAmount.toFixed(2),

                            currency: "PHP"
                        },

                        totalAmount: {

                            value:
                                paymentAmount.toFixed(2),

                            currency: "PHP"
                        }
                    }

                ],

             redirectUrl: {

    success:
        "https://captured-photo-studio.onrender.com/payment-success",

    failure:
        "https://captured-photo-studio.onrender.com/payment-failed",

    cancel:
        "https://captured-photo-studio.onrender.com/payment-cancelled"
},

                requestReferenceNumber,

                metadata: {

                    bookingId:
                        String(bookingId)
                }
            };

            console.log(
                "Creating Maya Checkout:",
                {
                    bookingId,
                    amount: paymentAmount,
                    requestReferenceNumber
                }
            );

            /* -------------------------------------------------
               CALL MAYA
            ------------------------------------------------- */

            const mayaResponse = await fetch(
                MAYA_CHECKOUT_URL,
                {

                    method: "POST",

                    headers: {

                        "Authorization":
                            `Basic ${mayaPublicAuth()}`,

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            checkoutData
                        )
                }
            );

            const mayaData =
                await mayaResponse.json();

            console.log(
                "Maya Checkout Response:",
                mayaData
            );

            /* -------------------------------------------------
               MAYA ERROR
            ------------------------------------------------- */

            if (!mayaResponse.ok) {

                return res.status(
                    mayaResponse.status
                ).json({

                    success: false,

                    message:
                        "Maya Checkout creation failed.",

                    maya:
                        mayaData
                });
            }

            /* -------------------------------------------------
               GET MAYA CHECKOUT ID
            ------------------------------------------------- */

            const checkoutId =
                mayaData.checkoutId ||
                mayaData.id;

            const redirectUrl =
                mayaData.redirectUrl;

            if (!checkoutId) {

                console.error(
                    "Maya did not return checkoutId:",
                    mayaData
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Maya did not return a checkout ID.",

                    maya:
                        mayaData
                });
            }

            if (!redirectUrl) {

                console.error(
                    "Maya did not return redirectUrl:",
                    mayaData
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Maya did not return a checkout URL.",

                    maya:
                        mayaData
                });
            }

            /* -------------------------------------------------
               SAVE MAYA REFERENCES TO BOOKING
               
               These columns need to exist:
                   maya_checkout_id
                   maya_request_reference
            ------------------------------------------------- */

            const {
                error: updateReferenceError
            } = await supabase
                .from("bookings")
                .update({

                    maya_checkout_id:
                        checkoutId,

                    maya_request_reference:
                        requestReferenceNumber,

                    payment_status:
                        "Pending",

                })
                .eq("id", bookingId);

            if (updateReferenceError) {

                console.error(
                    "Unable to save Maya references:",
                    updateReferenceError
                );

                /*
                    IMPORTANT:
                    The Maya checkout was created, but the
                    booking reference could not be saved.

                    We stop here rather than redirecting the
                    customer into a payment that we cannot
                    reliably associate with the booking.
                */

                return res.status(500).json({

                    success: false,

                    message:
                        "Maya checkout was created, but the booking could not be linked to the payment.",

                    error:
                        updateReferenceError.message
                });
            }

            /* -------------------------------------------------
               RETURN CHECKOUT INFORMATION
            ------------------------------------------------- */

            return res.json({

                success: true,

                checkoutId,

                redirectUrl,

                requestReferenceNumber
            });

        } catch (error) {

            console.error(
                "Maya Checkout Error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message
            });
        }
    }
);


/* =========================================================
   MAYA PAYMENT WEBHOOK
========================================================= */

/*
    IMPORTANT:

    Register this URL in Maya Manager:

    https://captured-photo-studio.onrender.com/api/maya/webhook

    Subscribe to:

        PAYMENT_SUCCESS
        PAYMENT_FAILED
        PAYMENT_EXPIRED
        PAYMENT_CANCELLED
*/
app.post(
    "/api/maya/webhook",
    async (req, res) => {

        /*
            Maya expects a quick 2xx response.

            We still process the payload here, but we return
            only after basic processing begins.
        */

        try {

            const payload = req.body || {};

            console.log(
                "===================================="
            );

            console.log(
                "MAYA WEBHOOK RECEIVED"
            );

            console.log(
                JSON.stringify(
                    payload,
                    null,
                    2
                )
            );

            console.log(
                "===================================="
            );

            /* -------------------------------------------------
               BASIC PAYLOAD VALUES
            ------------------------------------------------- */

            const paymentStatus =
                payload.paymentStatus ||
                payload.status;

            const paymentId =
                payload.id;

            const requestReferenceNumber =
                payload.requestReferenceNumber;

            const receiptNumber =
                payload.receiptNumber || null;

            /* -------------------------------------------------
               CHECK EVENT TYPE
            ------------------------------------------------- */

            if (!paymentStatus) {

                console.warn(
                    "Maya webhook has no paymentStatus."
                );

                return res.status(200).json({

                    success: true,

                    message:
                        "Webhook received without payment status."
                });
            }

            /* -------------------------------------------------
               FIND BOOKING
            ------------------------------------------------- */

            let booking = null;
            let bookingError = null;

            /*
                Primary lookup:
                Maya requestReferenceNumber
            */

            if (requestReferenceNumber) {

                const result =
                    await supabase
                        .from("bookings")
                        .select("*")
                        .eq(
                            "maya_request_reference",
                            requestReferenceNumber
                        )
                        .maybeSingle();

                booking =
                    result.data;

                bookingError =
                    result.error;
            }

            /*
                Fallback:
                Maya checkout/payment ID
            */

            if (
                !booking &&
                paymentId
            ) {

                const result =
                    await supabase
                        .from("bookings")
                        .select("*")
                        .eq(
                            "maya_checkout_id",
                            paymentId
                        )
                        .maybeSingle();

                booking =
                    result.data;

                bookingError =
                    result.error;
            }

            if (bookingError) {

                console.error(
                    "Webhook booking lookup error:",
                    bookingError
                );

                return res.status(200).json({

                    success: false,

                    message:
                        "Webhook received but booking lookup failed."
                });
            }

            if (!booking) {

                console.error(
                    "No booking found for Maya payment:",
                    {
                        paymentId,
                        requestReferenceNumber
                    }
                );

                /*
                    Return 200 so Maya doesn't keep retrying an
                    event that your system cannot correlate.
                */

                return res.status(200).json({

                    success: false,

                    message:
                        "No matching booking found."
                });
            }

            console.log(
                "Matched booking:",
                booking.id
            );

            /* =================================================
               PAYMENT SUCCESS
            ================================================= */

            if (
                paymentStatus ===
                "PAYMENT_SUCCESS"
            ) {

                /* ---------------------------------------------
                   CHECK ALREADY PAID
                --------------------------------------------- */

                if (
                    String(
                        booking.payment_status || ""
                    ).toLowerCase() === "paid"
                ) {

                    console.log(
                        "Booking already marked Paid:",
                        booking.id
                    );

                    return res.status(200).json({

                        success: true,

                        message:
                            "Payment already processed."
                    });
                }

                /* ---------------------------------------------
                   VERIFY PAYMENT AMOUNT
                --------------------------------------------- */

                const webhookAmount =
                    money(
                        payload.amount ??
                        payload.totalAmount?.value ??
                        payload.paymentDetails
                            ?.amount
                            ?.total
                            ?.value
                    );

                const bookingAmount =
                    money(
                        booking.downpayment_amount
                    );

                /*
                    If both amounts are available,
                    they must match.
                */

                if (
                    webhookAmount !== null &&
                    bookingAmount !== null &&
                    webhookAmount !== bookingAmount
                ) {

                    console.error(
                        "PAYMENT AMOUNT MISMATCH:",
                        {
                            bookingId:
                                booking.id,

                            expected:
                                bookingAmount,

                            received:
                                webhookAmount
                        }
                    );

                    return res.status(200).json({

                        success: false,

                        message:
                            "Payment amount mismatch."
                    });
                }

                /* ---------------------------------------------
                   UPDATE BOOKING AS PAID
                --------------------------------------------- */

                const {
                    data: updatedBooking,
                    error: updateError
                } = await supabase
                    .from("bookings")
                    .update({

                        payment_status:
                            "Paid",

                        /*
                            Keep admin approval separate.
                            Payment successful does NOT
                            automatically approve the booking.
                        */

                        status:
                            "Pending",

                        maya_payment_id:
                            paymentId,

                        maya_receipt_number:
                            receiptNumber,

                        payment_reference:
                            requestReferenceNumber

                    })
                    .eq(
                        "id",
                        booking.id
                    )
                    .select()
                    .single();

                if (updateError) {

                    console.error(
                        "Failed to mark booking Paid:",
                        updateError
                    );

                    return res.status(200).json({

                        success: false,

                        message:
                            "Payment received but booking update failed."
                    });
                }

                console.log(
                    "BOOKING MARKED AS PAID:",
                    updatedBooking.id
                );

                /* ---------------------------------------------
                   ADMIN NOTIFICATION
                   
                   THIS IS THE IMPORTANT PART.

                   The admin only receives the booking AFTER
                   PAYMENT_SUCCESS.
                --------------------------------------------- */

                const {
                    data: existingAdminNotification,
                    error:
                        notificationLookupError
                } = await supabase
                    .from("notifications")
                    .select("id")
                    .eq(
                        "booking_id",
                        booking.id
                    )
                    .eq(
                        "recipient",
                        "admin"
                    )
                    .eq(
                        "title",
                        "New Paid Booking Reservation"
                    )
                    .limit(1);

                if (notificationLookupError) {

                    console.error(
                        "Notification lookup error:",
                        notificationLookupError
                    );
                }

                /*
                    Only create notification if one doesn't
                    already exist.

                    This prevents duplicate notifications
                    if Maya sends the webhook more than once.
                */

                if (
                    !existingAdminNotification ||
                    existingAdminNotification.length === 0
                ) {

                    const {
                        error:
                            adminNotificationError
                    } = await supabase
                        .from("notifications")
                        .insert({

                            customer_id:
                                booking.customer_id,

                            booking_id:
                                booking.id,

                            recipient:
                                "admin",

                            title:
                                "New Paid Booking Reservation",

                            message:
                                `${booking.full_name} booked a session on ${booking.booking_date} at ${booking.booking_time}. Payment of ₱${bookingAmount?.toFixed(2) || "0.00"} was successful. Waiting for admin approval.`,

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
                            "ADMIN NOTIFICATION CREATED"
                        );
                    }
                }

                /* ---------------------------------------------
                   CUSTOMER NOTIFICATION
                --------------------------------------------- */

                const {
                    error:
                        customerNotificationError
                } = await supabase
                    .from("notifications")
                    .insert({

                        customer_id:
                            booking.customer_id,

                        booking_id:
                            booking.id,

                        recipient:
                            "customer",

                        title:
                            "Payment Successful",

                        message:
                            `Your ₱${bookingAmount?.toFixed(2) || "0.00"} reservation payment was successful. Your booking is now waiting for administrator approval.`,

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
                }

                console.log(
                    "PAYMENT SUCCESSFULLY PROCESSED:",
                    booking.id
                );

                return res.status(200).json({

                    success: true,

                    message:
                        "PAYMENT_SUCCESS processed.",

                    bookingId:
                        booking.id
                });
            }


            /* =================================================
               PAYMENT FAILED
            ================================================= */

            if (
                paymentStatus ===
                "PAYMENT_FAILED"
            ) {

                console.log(
                    "Payment failed:",
                    booking.id
                );

                await supabase
                    .from("bookings")
                    .update({

                        payment_status:
                            "Failed",

                        maya_payment_id:
                            paymentId,

                        payment_reference:
                            requestReferenceNumber

                    })
                    .eq(
                        "id",
                        booking.id
                    );

                return res.status(200).json({

                    success: true,

                    message:
                        "PAYMENT_FAILED processed."
                });
            }


            /* =================================================
               PAYMENT EXPIRED
            ================================================= */

            if (
                paymentStatus ===
                "PAYMENT_EXPIRED"
            ) {

                console.log(
                    "Payment expired:",
                    booking.id
                );

                await supabase
                    .from("bookings")
                    .update({

                        payment_status:
                            "Expired",

                        maya_payment_id:
                            paymentId,

                        payment_reference:
                            requestReferenceNumber

                    })
                    .eq(
                        "id",
                        booking.id
                    );

                return res.status(200).json({

                    success: true,

                    message:
                        "PAYMENT_EXPIRED processed."
                });
            }

            if (
                paymentStatus ===
                "PAYMENT_CANCELLED"
            ) {

                console.log(
                    "Payment cancelled:",
                    booking.id
                );

                await supabase
                    .from("bookings")
                    .update({

                        payment_status:
                            "Cancelled",

                        maya_payment_id:
                            paymentId,

                        payment_reference:
                            requestReferenceNumber

                    })
                    .eq(
                        "id",
                        booking.id
                    );

                return res.status(200).json({

                    success: true,

                    message:
                        "PAYMENT_CANCELLED processed."
                });
            }


            console.log(
                "Unhandled Maya payment status:",
                paymentStatus
            );

            return res.status(200).json({

                success: true,

                message:
                    `Webhook received: ${paymentStatus}`
            });

        } catch (error) {

            console.error(
                "Maya Webhook Error:",
                error
            );

            /*
                Maya retries failed webhook deliveries.
                For unexpected errors, return 500 so Maya can
                retry.
            */

            return res.status(500).json({

                success: false,

                message:
                    error.message
            });
        }
    }
);


app.get(
    "/api/maya/payment/:paymentId",
    async (req, res) => {

        try {

            const {
                paymentId
            } = req.params;

            if (!paymentId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment ID is required."
                });
            }

            if (!MAYA_SECRET_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "MAYA_SECRET_KEY is not configured."
                });
            }

            const response =
                await fetch(
                    `${MAYA_PAYMENT_URL}/${encodeURIComponent(paymentId)}`,
                    {

                        method: "GET",

                        headers: {

                            "Authorization":
                                `Basic ${mayaSecretAuth()}`,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            const data =
                await response.json();

            console.log(
                "Maya payment inquiry:",
                data
            );

            return res.status(
                response.status
            ).json({

                success:
                    response.ok,

                maya:
                    data
            });

        } catch (error) {

            console.error(
                "Maya payment inquiry error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message
            });
        }
    }
);

app.get("/payment-success", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "../frontend-customer/payment_successful.html"
        )
    );
});

app.get("/payment-failed", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "../frontend-customer/payment_failed.html"
        )
    );
});

app.get("/payment-cancelled", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "../frontend-customer/payment_cancelled.html"
        )
    );
});
app.listen(
    PORT,
    () => {

        console.log(
            "===================================="
        );

        console.log(
            "CAPTURED SERVER RUNNING"
        );

        console.log(
            `Server is running on port ${PORT}`
        );

        console.log(
            `Maya Public Key: ${
                MAYA_PUBLIC_KEY
                    ? "CONFIGURED"
                    : "NOT CONFIGURED"
            }`
        );

        console.log(
            `Maya Secret Key: ${
                MAYA_SECRET_KEY
                    ? "CONFIGURED"
                    : "NOT CONFIGURED"
            }`
        );

        console.log(
            `Resend API Key: ${
                RESEND_API_KEY
                    ? "CONFIGURED"
                    : "NOT CONFIGURED"
            }`
        );

        console.log(
            "Maya Webhook:"
        );

        console.log(
            "https://captured-photo-studio.onrender.com/api/maya/webhook"
        );

        console.log(
            "===================================="
        );
    }
);