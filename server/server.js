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
   BASIC SERVER CHECK
========================================================= */

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
            total_amount,
            downpayment_amount
        } = req.body;


        /* =====================================================
           1. VALIDATE BOOKING INFORMATION
        ===================================================== */

        if (
            !customer_id ||
            !full_name ||
            !email ||
            !contact_number ||
            !booking_date ||
            !booking_time ||
            !session_type ||
            !downpayment_amount
        ) {

            return res.status(400).json({
                success: false,
                error: "Missing required booking information."
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


        /* =====================================================
           3. VALIDATE DOWN PAYMENT
        ===================================================== */

        const amount = Number(downpayment_amount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return res.status(400).json({
                success: false,
                error: "Invalid down payment amount."
            });

        }


        const amountInCentavos =
            Math.round(amount * 100);


        /* =====================================================
           4. GENERATE INTERNAL PAYMENT REFERENCE
        ===================================================== */

        const bookingReference =
            `CAPTURED-${Date.now()}-${crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase()}`;


        console.log(
            "Payment reference:",
            bookingReference
        );


        /* =====================================================
           5. CHECK WHETHER TIME SLOT IS ALREADY BOOKED
        ===================================================== */

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
                payment_status
            `)
            .eq("booking_date", booking_date)
            .eq("booking_time", booking_time);


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
                    paymentStatus === "cancelled" ||
                    paymentStatus === "rejected"
                ) {
                    return false;
                }


                return true;

            });


        if (conflictingBooking) {

            return res.status(409).json({
                success: false,
                error: "This time slot is no longer available. Please select another time."
            });

        }


        /* =====================================================
           6. CREATE BOOKING FIRST
        ===================================================== */

        const {
            data: bookingData,
            error: bookingError
        } = await supabase
            .from("bookings")
            .insert({

                customer_id:
                    customer_id,

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

                downpayment_amount:
                    amount,

                payment_status:
                    "Pending Payment",

                status:
                    "Pending",

                paymongo_reference:
                    bookingReference

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



        const paymongoResponse =
            await fetch(
                "https://api.paymongo.com/v1/checkout_sessions",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

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

            send_email_receipt:
                true,

            show_description:
                true,

            success_url:
                `${process.env.FRONTEND_URL}/frontend-customer/customer_payment_success.html?reference=${encodeURIComponent(bookingReference)}`,

            cancel_url:
                `${process.env.FRONTEND_URL}/frontend-customer/customer_payment_cancelled.html?reference=${encodeURIComponent(bookingReference)}`

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

            success: false,

            error:
                "Internal server error.",

            message:
                error.message

        });

    }

});

app.post("/api/paymongo/webhook", async (req, res) => {

    try {const signatureHeader = req.headers["paymongo-signature"];

if (!signatureHeader) {
    console.error("Missing PayMongo signature.");
    return res.status(400).json({
        success: false,
        error: "Missing PayMongo signature."
    });
}

const parts = signatureHeader.split(",");

const signatureData = {};

for (const part of parts) {
    const [key, value] = part.split("=");

    if (key && value) {
        signatureData[key] = value;
    }
}

const timestamp = signatureData.t;
const testSignature = signatureData.te;
const liveSignature = signatureData.li;

const signature = liveSignature || testSignature;

if (!timestamp || !signature) {
    console.error("Invalid PayMongo signature.");
    return res.status(400).json({
        success: false,
        error: "Invalid PayMongo signature."
    });
}

const payload = `${timestamp}.${req.rawBody.toString("utf8")}`;

const expectedSignature = crypto
    .createHmac(
        "sha256",
        PAYMONGO_WEBHOOK_SECRET
    )
    .update(payload)
    .digest("hex");

if (
    !crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
    )
) {
    console.error("Invalid PayMongo webhook signature.");

    return res.status(400).json({
        success: false,
        error: "Invalid webhook signature."
    });
}

console.log("PayMongo webhook signature verified.");

        console.log("====================================");
        console.log("PAYMONGO WEBHOOK RECEIVED");
        console.log("====================================");

        const event = req.body;

        console.log(
            "PayMongo webhook:",
            JSON.stringify(event, null, 2)
        );

        /* =====================================================
           1. GET EVENT INFORMATION
        ===================================================== */

        const eventType = event?.data?.attributes?.type;

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
           2. ONLY PROCESS PAYMENT EVENTS
        ===================================================== */

        if (
            eventType !== "checkout_session.payment.paid" &&
            eventType !== "checkout_session.payment.failed"
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


       const reference =
    attributes?.reference_number ||
    attributes?.metadata?.booking_reference ||
    null;

console.log(
    "Detected booking reference:",
    reference
);

        console.log(
            "Detected booking reference:",
            reference
        );


        /* =====================================================
           4. FIND BOOKING
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
           5. FALLBACK: FIND BY CHECKOUT SESSION ID
        ===================================================== */

        if (!booking && checkoutSessionId) {

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
           6. BOOKING NOT FOUND
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
           7. PAYMENT SUCCESS
        ===================================================== */

        if (
            eventType ===
            "checkout_session.payment.paid"
        ) {

            console.log(
                "PAYMENT SUCCESSFUL"
            );


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
            paidAt

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


            /* =================================================
               CUSTOMER NOTIFICATION
            ================================================= */

            const {
                error: customerNotificationError
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
                        `Your ₱${Number(
                            booking.downpayment_amount
                        ).toFixed(2)} reservation payment was successful. Your booking is now awaiting admin confirmation.`,

                    is_read:
                        false

                });


            if (customerNotificationError) {

                console.error(
                    "Customer notification error:",
                    customerNotificationError
                );

            }


            /* =================================================
               ADMIN NOTIFICATION
            ================================================= */

            const {
                error: adminNotificationError
            } = await supabase
                .from("notifications")
                .insert({

                    recipient:
                        "admin",

                    title:
                        "New Paid Booking Reservation",

                    message:
                        `${booking.full_name} has successfully paid the ₱${Number(
                            booking.downpayment_amount
                        ).toFixed(2)} reservation fee for ${booking.booking_date} at ${booking.booking_time}.`,

                    is_read:
                        false

                });


            if (adminNotificationError) {

                console.error(
                    "Admin notification error:",
                    adminNotificationError
                );

            }


            console.log(
                "Booking marked as PAID."
            );

        }


        /* =====================================================
           8. PAYMENT FAILED
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
               CUSTOMER NOTIFICATION
            ================================================= */

            const {
                error: notificationError
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
                        "Your reservation payment was not completed. Please create a new booking if you would like to reserve another schedule.",

                    is_read:
                        false

                });


            if (notificationError) {

                console.error(
                    "Payment failed notification error:",
                    notificationError
                );

            }


            console.log(
                "Booking marked as PAYMENT FAILED."
            );

        }


        /* =====================================================
           9. TELL PAYMONGO WEBHOOK WAS RECEIVED
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
            `Resend API Key: ${
                RESEND_API_KEY
                    ? "CONFIGURED"
                    : "NOT CONFIGURED"
            }`
        );
        console.log(
            "===================================="
        );
    }
);