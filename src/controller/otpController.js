import nodemailer from 'nodemailer';
import crypto from 'crypto';

let otpStorage = {}; 

//configure

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'moccafasion@gmail.com',
        pass: 'medm uadx xzyg rqbu'
    }
});

const sendOTP = async (req, res) => {
    const { email } = req.body;
    const otp = crypto.randomInt(100000, 999999);
    const expirationTime = Date.now() + 15 * 60 * 1000; // 15 minutes in milliseconds

    otpStorage[email] = { otp, expirationTime }; // Store OTP and expiration time
    
    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Welcome to Mocca Fashion Hub',
        text: `Your OTP code is ${otp}. It expires in 15 minutes.`
    };

    // Send email
    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP email:', error);
        res.status(500).json({ message: 'Error sending OTP' });
    }
};
 


const verifyOTP = (req, res) => {
    const { email, otp } = req.body;

    if (otpStorage[email]) {
        const { otp: storedOtp, expirationTime } = otpStorage[email];

        if (Date.now() > expirationTime) {
            delete otpStorage[email]; // Remove expired OTP
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        if (storedOtp == otp) {
            delete otpStorage[email]; // OTP verified, remove it
            return res.status(200).json({ success: true, message: 'OTP verified successfully' });
        }
    }

    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
};


export { sendOTP, verifyOTP };
