require("dotenv").config();
console.log(process.env.RESEND_API_KEY);
const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
                <h2>Vanity Creation</h2>

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

app.listen(3000, () => {

    console.log("====================================");

    console.log("OTP SERVER RUNNING");

    console.log("http://localhost:3000");

    console.log("====================================");

});