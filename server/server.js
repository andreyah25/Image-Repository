require("dotenv").config();
//console.log(process.env.RESEND_API_KEY);
const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");


const app = express();

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "OTP server is running"
    });
});
const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const MAYA_PUBLIC_KEY = process.env.MAYA_PUBLIC_KEY;
const MAYA_SECRET_KEY = process.env.MAYA_SECRET_KEY;

const MAYA_CHECKOUT_URL =
    "https://pg-sandbox.paymaya.com/checkout/v1/checkouts";

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

        const otp = generateOTP();

        console.log("Generated OTP:", otp);

        // Remove old OTPs
        await supabase
            .from("otp_verifications")
            .delete()
            .eq("email", email);

        // Save new OTP
        const { error: dbError } = await supabase
            .from("otp_verifications")
            .insert({
                email,
                otp
            });

        if (dbError) {
            console.error(dbError);

            return res.status(500).json({
                success: false,
                message: dbError.message
            });
        }

        // Send Email
        const { error: emailError } = await resend.emails.send({

            from: "onboarding@resend.dev",

            to: email,

            subject: "Your Verification Code",

            html: `
                <h2>Captured Photo Studio</h2>

                <p>Your verification code is:</p>

                <h1>${otp}</h1>

                <p>This code expires in 5 minutes.</p>
            `

        });

        if (emailError) {

            console.error(emailError);

            return res.status(500).json({

                success: false,

                message: emailError.message

            });

        }

        res.json({

            success: true,

            message: "OTP Sent"

        });

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

});
app.post("/api/maya/create-checkout", async (req, res) => {

    try {

        const {
            bookingId,
            amount,
            fullName,
            email,
            description
        } = req.body;

        if (!bookingId || !amount || !email) {
            return res.status(400).json({
                success: false,
                message: "bookingId, amount, and email are required."
            });
        }

        if (!MAYA_PUBLIC_KEY) {
            return res.status(500).json({
                success: false,
                message: "MAYA_PUBLIC_KEY is not configured."
            });
        }

        const requestReferenceNumber =
            `CAPTURED-${bookingId}-${Date.now()}`.slice(0, 36);

        const checkoutData = {

            totalAmount: {
                value: Number(amount).toFixed(2),
                currency: "PHP"
            },

            buyer: {
                firstName: fullName || "Customer",
                email: email
            },

            items: [
                {
                    name: description || "Photography Session Reservation",
                    quantity: "1",
                    amount: {
                        value: Number(amount).toFixed(2),
                        currency: "PHP"
                    },
                    totalAmount: {
                        value: Number(amount).toFixed(2),
                        currency: "PHP"
                    }
                }
            ],

            redirectUrl: {

                success:
                    "https://captured-photo-studio.onrender.com/frontend-customer/payment_successful.html",

                failure:
                    "https://captured-photo-studio.onrender.com/frontend-customer/payment_failed.html",

                cancel:
                    "https://captured-photo-studio.onrender.com/frontend-customer/payment_cancelled.html"
            },

            requestReferenceNumber,

            metadata: {
                bookingId: bookingId
            }
        };

        const auth = Buffer
            .from(`${MAYA_PUBLIC_KEY}:`)
            .toString("base64");

        const mayaResponse = await fetch(
            MAYA_CHECKOUT_URL,
            {
                method: "POST",

                headers: {
                    "Authorization": `Basic ${auth}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(checkoutData)
            }
        );

        const mayaData = await mayaResponse.json();

        console.log("Maya response:", mayaData);

        if (!mayaResponse.ok) {

            return res.status(mayaResponse.status).json({
                success: false,
                message: "Maya Checkout creation failed.",
                maya: mayaData
            });

        }

        res.json({
            success: true,
            checkoutId: mayaData.checkoutId,
            redirectUrl: mayaData.redirectUrl,
            requestReferenceNumber
        });

    } catch (error) {

        console.error("Maya Checkout Error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {

    console.log("====================================");

    console.log("OTP SERVER RUNNING");

    console.log(`Server is running on port ${PORT}`);

    console.log("====================================");

});
