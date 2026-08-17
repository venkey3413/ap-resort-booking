const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS is not set — emails will fail to send. Check your .env file.');
}
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendInvoiceEmail(booking, type = 'resort') {
    console.log('📧 Attempting to send email to:', booking.email);
    try {
        let invoiceHTML;
        
        if (type === 'food') {
            // Food order invoice
            const itemsList = booking.items.map(item => 
                `<tr><td>${item.name}</td><td>${item.quantity}</td><td>₹${item.price}</td><td>₹${item.price * item.quantity}</td></tr>`
            ).join('');
            
            invoiceHTML = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://vizagresortbooking.in/cropped_circle_image.png" alt="My Food - Vizag Resort Booking" style="max-width: 150px; height: auto;">
                    </div>
                    <h2 style="color: #333; text-align: center;">Food Order Confirmation</h2>
                    
                    <p>Dear Customer,</p>
                    
                    <p>Thank you for your food order! Your order has been confirmed and will be delivered within Your Delivery slot time.</p>
                    
                    <p><strong>Order Details:</strong></p>
                    
                    <p><strong>Order ID:</strong> ${booking.orderId}</p>
                    <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
                    <p><strong>Resort:</strong> ${booking.resortName}</p>
                    <p><strong>Guest Name:</strong> ${booking.customerName}</p>
                    <p><strong>Phone:</strong> ${booking.phone}</p>
                    <p><strong>Order Date:</strong> ${new Date(booking.orderDate).toLocaleDateString()}</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Price</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList}
                        </tbody>
                    </table>
                    
                    <p><strong>Subtotal:</strong> ₹${booking.subtotal}</p>
                    <p><strong>Delivery Fee:</strong> ₹${booking.deliveryFee}</p>
                    <p><strong>Total Amount:</strong> ₹${booking.total}</p>
                    <p><strong>Payment Method:</strong> ${booking.paymentMethod?.toUpperCase()}</p>
                    ${booking.transactionId ? `<p><strong>Transaction ID:</strong> ${booking.transactionId}</p>` : ''}
                    
                    <p>Your food will be delivered to your resort location within Your Delivery slot time.</p>
                    
                    <p>For any queries, please contact us at vizagresortbooking@gmail.com</p>
                    
                    <p>Thank you for choosing My Food!</p>
                    
                    <p>Best regards,<br>
                    My Food Team<br>
                    🌐 <a href="https://vizagresortbooking.in/food" style="color: #667eea;">https://vizagresortbooking.in/food</a></p>
                </div>
            `;
        } else if (type === 'food_cancelled') {
            // Food order cancellation email
            const itemsList = booking.items.map(item => 
                `<tr><td>${item.name}</td><td>${item.quantity}</td><td>₹${item.price}</td><td>₹${item.price * item.quantity}</td></tr>`
            ).join('');
            
            invoiceHTML = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://vizagresortbooking.in/cropped_circle_image.png" alt="My Food - Vizag Resort Booking" style="max-width: 150px; height: auto;">
                    </div>
                    <h2 style="color: #dc3545; text-align: center;">Food Order Cancelled</h2>
                    
                    <p>Dear ${booking.customerName},</p>
                    
                    <p>We regret to inform you that your food order has been cancelled.</p>
                    
                    <p><strong>Cancelled Order Details:</strong></p>
                    
                    <p><strong>Order ID:</strong> ${booking.orderId}</p>
                    <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
                    <p><strong>Resort:</strong> ${booking.resortName}</p>
                    <p><strong>Phone:</strong> ${booking.phone}</p>
                    <p><strong>Order Date:</strong> ${new Date(booking.orderDate).toLocaleDateString()}</p>
                    <p><strong>Cancelled Date:</strong> ${new Date(booking.cancelledAt).toLocaleDateString()}</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Price</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList}
                        </tbody>
                    </table>
                    
                    <p><strong>Subtotal:</strong> ₹${booking.subtotal}</p>
                    <p><strong>Delivery Fee:</strong> ₹${booking.deliveryFee}</p>
                    <p><strong>Total Amount:</strong> ₹${booking.total}</p>
                    
                    <p style="color: #dc3545; font-weight: bold;">If you made any payment, it will be refunded within 3-5 business days.</p>
                    
                    <p>For any queries, please contact us at vizagresortbooking@gmail.com</p>
                    
                    <p>We apologize for any inconvenience caused.</p>
                    
                    <p>Best regards,<br>
                    My Food Team<br>
                    🌐 <a href="https://vizagresortbooking.in/food" style="color: #667eea;">https://vizagresortbooking.in/food</a></p>
                </div>
            `;
        } else if (type === 'email_otp') {
            // Email OTP verification
            invoiceHTML = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://vizagresortbooking.in/cropped_circle_image.png" alt="Vizag Resort Booking" style="max-width: 150px; height: auto;">
                    </div>
                    <h2 style="color: #333; text-align: center;">Email Verification</h2>
                    
                    <p>Dear Customer,</p>
                    
                    <p>Please use the following OTP to verify your email address for booking:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background: #f8f9fa; border: 2px solid #007bff; border-radius: 10px; padding: 20px; display: inline-block;">
                            <h1 style="color: #007bff; font-size: 2.5rem; margin: 0; letter-spacing: 5px; font-family: monospace;">${booking.otp}</h1>
                        </div>
                    </div>
                    
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This OTP is valid for 10 minutes only</li>
                        <li>Do not share this OTP with anyone</li>
                        <li>Use this OTP to complete your booking verification</li>
                    </ul>
                    
                    <p>If you didn't request this OTP, please ignore this email.</p>
                    
                    <p>Thank you for choosing Vizag Resort Booking!</p>
                    
                    <p>Best regards,<br>
                    Vizag Resort Booking Team<br>
                    🌐 <a href="https://vizagresortbooking.in" style="color: #667eea;">https://vizagresortbooking.in</a></p>
                </div>
            `;
        } else {
            // Resort booking invoice
            const bookingId = booking.booking_reference || `RB${String(booking.id).padStart(6, '0')}`;
            
            invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    
                    <!-- Header with Logo and Brand -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a5fa8 0%, #0a7a5a 100%); padding: 40px 30px; text-align: center;">
                            <img src="https://vizagresortbooking.in/logo.png" alt="VshakaGo" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #ffffff; margin-bottom: 15px;" />
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">VshakaGo</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 0.5px;">RESORT BOOKING CONFIRMED</p>
                        </td>
                    </tr>
                    
                    <!-- Success Badge -->
                    <tr>
                        <td style="padding: 30px 30px 20px 30px; text-align: center;">
                            <div style="display: inline-block; background: #dcfce7; color: #16a34a; padding: 10px 24px; border-radius: 50px; font-weight: 600; font-size: 14px;">
                                ✅ Booking Confirmed
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 0 30px 20px 30px;">
                            <p style="color: #1e293b; font-size: 16px; line-height: 1.6; margin: 0;">Dear <strong>${booking.guest_name}</strong>,</p>
                            <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 12px 0 0 0;">We are delighted to confirm your booking with <strong>${booking.resort_name}</strong>. Your reservation is secured and we look forward to welcoming you!</p>
                        </td>
                    </tr>
                    
                    <!-- Booking Details Card -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="color: #1e293b; font-size: 16px; font-weight: 700; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">📋 Booking Details</h3>
                                        
                                        <table width="100%" cellpadding="8" cellspacing="0">
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Booking ID:</td>
                                                <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0; font-family: monospace;">${bookingId}</td>
                                            </tr>
                                            <tr style="border-top: 1px solid #e2e8f0;">
                                                <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Guest Name:</td>
                                                <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${booking.guest_name}</td>
                                            </tr>
                                            <tr style="border-top: 1px solid #e2e8f0;">
                                                <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Resort:</td>
                                                <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${booking.resort_name}</td>
                                            </tr>
                                            <tr style="border-top: 1px solid #e2e8f0;">
                                                <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Check-in:</td>
                                                <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${new Date(booking.check_in).toLocaleDateString('en-IN', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})}</td>
                                            </tr>
                                            <tr style="border-top: 1px solid #e2e8f0;">
                                                <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Check-out:</td>
                                                <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${new Date(booking.check_out).toLocaleDateString('en-IN', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})}</td>
                                            </tr>
                                            <tr style="border-top: 1px solid #e2e8f0;">
                                                <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Number of Guests:</td>
                                                <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${booking.guests} ${booking.guests > 1 ? 'Guests' : 'Guest'}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    ${booking.qr_code ? `
                    <!-- QR Code Section -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border-radius: 12px; border: 2px solid #0ea5e9;">
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <h3 style="color: #0c4a6e; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">🎫 Your Entry Ticket</h3>
                                        <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5;">Show this QR code at resort entry for quick check-in</p>
                                        
                                        <div style="background: #ffffff; display: inline-block; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                            <img src="cid:qrcode" alt="Booking QR Code" style="width: 220px; height: 220px; display: block;" />
                                        </div>
                                        
                                        <div style="margin-top: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px;">
                                            <p style="color: #dc2626; font-size: 13px; font-weight: 600; margin: 0; line-height: 1.5;">⚠️ Important: Do not share this QR code with anyone</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}
                    
                    <!-- Check-in Policy -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: #fffbeb; border-radius: 12px; border: 1px solid #fde047;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="color: #854d0e; font-size: 15px; font-weight: 700; margin: 0 0 12px 0;">📌 Check-in Policy</h3>
                                        <table width="100%" cellpadding="6" cellspacing="0">
                                            <tr>
                                                <td style="color: #78350f; font-size: 14px;">🕐 Check-in Time:</td>
                                                <td style="color: #854d0e; font-size: 14px; font-weight: 600; text-align: right;">11:00 AM</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #78350f; font-size: 14px;">🕘 Check-out Time:</td>
                                                <td style="color: #854d0e; font-size: 14px; font-weight: 600; text-align: right;">9:00 AM</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #78350f; font-size: 14px;">🪪 Required:</td>
                                                <td style="color: #854d0e; font-size: 14px; font-weight: 600; text-align: right;">Valid ID Proof</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Food Order CTA -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px; text-align: center;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; border: 1px solid #86efac;">
                                <tr>
                                    <td style="padding: 24px; text-align: center;">
                                        <p style="color: #166534; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">🍽️ Pre-order your meals!</p>
                                        <p style="color: #15803d; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">Order delicious food to be delivered at your resort</p>
                                        <a href="https://vizagresortbooking.in/food/" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">Order Food Now</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Contact & Support -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 20px; background: #f8fafc; border-radius: 12px; text-align: center;">
                                        <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0;">Need help? We're here for you!</p>
                                        <p style="color: #1e293b; font-size: 14px; margin: 0;">
                                            📧 <a href="mailto:vizagresortbooking@gmail.com" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">vizagresortbooking@gmail.com</a><br/>
                                            📱 <a href="https://wa.me/918341674465" style="color: #16a34a; text-decoration: none; font-weight: 600;">WhatsApp Support</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #1e293b; padding: 30px; text-align: center;">
                            <img src="https://vizagresortbooking.in/logo.png" alt="VshakaGo" style="width: 50px; height: 50px; border-radius: 50%; margin-bottom: 12px; opacity: 0.9;" />
                            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">VshakaGo</p>
                            <p style="color: #64748b; font-size: 12px; margin: 0 0 12px 0;">Your trusted resort booking partner</p>
                            <a href="https://vizagresortbooking.in" style="color: #0ea5e9; text-decoration: none; font-size: 13px; font-weight: 600;">🌐 vizagresortbooking.in</a>
                            <p style="color: #475569; font-size: 11px; margin: 16px 0 0 0; line-height: 1.5;">© 2024 VshakaGo. All rights reserved.<br/>This is an automated email. Please do not reply.</p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `;
        }

        const path = require('path');
        const fs = require('fs');
        
        // Try to attach PDF, but don't fail if missing
        const pdfPath = path.join(__dirname, 'bookings-public', 'Cancellation & terms and conditions.pdf');
        const attachments = [];
        
        if (fs.existsSync(pdfPath)) {
            attachments.push({
                filename: 'Terms and Conditions.pdf',
                path: pdfPath
            });
            console.log('📎 PDF attachment added');
        } else {
            console.log('⚠️ PDF not found, sending email without attachment');
        }
        
        const subject = type === 'food' ? 'Food Order Confirmation – My Food' : 
                        type === 'food_cancelled' ? 'Food Order Cancelled – My Food' : 
                        type === 'email_otp' ? 'Email Verification OTP – Vizag Resort Booking' :
                        'Booking Confirmation – VshakaGo';
        
        const mailOptions = {
            from: `"VshakaGo Resort Booking" <${process.env.EMAIL_USER}>`,
            to: booking.email,
            subject: subject,
            html: invoiceHTML,
            attachments: type === 'resort' ? attachments : [] // Only attach PDF for resort bookings
        };
        
        // Add QR code as embedded attachment for resort bookings
        if (type === 'resort' && booking.qr_code) {
            // Convert base64 to buffer
            const base64Data = booking.qr_code.replace(/^data:image\/png;base64,/, '');
            const qrBuffer = Buffer.from(base64Data, 'base64');
            
            mailOptions.attachments.push({
                filename: 'qr-code.png',
                content: qrBuffer,
                cid: 'qrcode' // Content ID for embedding in HTML
            });
        }

        await transporter.sendMail(mailOptions);
        console.log(`📧 Invoice email sent successfully to ${booking.email}`);
        return true;
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        console.error('Full error:', error);
        return false;
    }
}

module.exports = { sendInvoiceEmail };
