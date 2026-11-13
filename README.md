# Novis Herbal — Premium Single-Vendor E-Commerce Platform

A production-ready, ultra-premium D2C Hair Care E-Commerce Web Application built with **React, Vite, TypeScript, Tailwind CSS, Node.js, Express, MongoDB Atlas, India Post / Courier Logistics Tracking, and WhatsApp Customer Alerts**.

---

## 🌟 Key Features Implemented

### 1. Public Customer Storefront
- **Luxury Botanical Aesthetic:** Forest emerald `#0B3B24`, champagne gold accents, Playfair Display typography, micro-interactions, and glassmorphism.
- **Dynamic Announcement Bar:** Real-time editable promotional alerts from Admin CMS.
- **Dynamic Hero Slider:** Managed via CMS with custom CTAs, badges, and images.
- **Hero Product Catalog:**
  1. **Novise Ayurvedic Hair Growth Oil (200 ML):** MRP ₹799 | Selling Price ₹399 (50% OFF)
  2. **Novise Anti-Dandruff & Clarifying Shampoo (250 ML):** MRP ₹599 | Selling Price ₹350 (41% OFF)
  3. **Novise Hair Regrowth & Anti-Dandruff Combo Pack:** MRP ₹1399 | Selling Price ₹599 (57% OFF - Save ₹800!)
- **Product Detail Page:**
  - Multi-image interactive gallery thumbnail selector with zoom.
  - Active botanical ingredients breakdown & how-to-use rituals.
  - Pincode delivery estimator & Cash on Delivery serviceability checker.
  - Customer review submission & rating breakdown.
- **Slide-out Cart Drawer:**
  - Free Express Shipping progress indicator (Free above ₹499).
  - Smart Combo Upsell banner ("Upgrade to Combo & Save ₹800").
  - Instant coupon validation (`NOVISE10`, `FIRST50`).
- **Complete Checkout Flow:**
  - Address validator with pincode and Indian states.
  - Dual payment modes: **Razorpay Online Payments (UPI, Cards, Netbanking)** and **Cash on Delivery (COD)**.
  - Server-side price tampering protection and real-time inventory decrement.
- **Consignment Tracking & My Orders:**
  - View order details, status timeline, courier partner (e.g. India Post), and consignment tracking number with 1-click copy & direct portal link.
- **WhatsApp Dispatch Alerts:**
  - Direct 1-click WhatsApp customer dispatch notification with tracking details.

---

### 2. Powerful Owner / Admin Control Panel
Access URL: `http://localhost:5173/` ➔ Click **Admin Portal** or navigate directly.
- **Default Master Admin Credentials:**
  - **Email:** `admin@novise.in`
  - **Password:** `Admin@Novise2026`
- **Dashboard & Analytics:**
  - Real-time revenue tracked, total orders, pending shipments, inventory health, and payment method split (COD vs Online).
- **Product & Inventory Management:**
  - Add, edit, delete, publish/unpublish products.
  - Full control over MRP, selling price, stock quantities, weight/dimensions for courier calculations, and image galleries.
  - Safety rule: If a product is linked to past orders, it is safely archived instead of hard-deleted.
- **Orders & Courier Fulfillment:**
  - Filter orders by status (`PLACED`, `CONFIRMED`, `PACKED`, `DISPATCHED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`).
  - Progress order lifecycle: Confirm ➔ Mark Packed ➔ **Add Courier Consignment ID (India Post, Delhivery, etc.)** ➔ 1-Click WhatsApp Customer Alert.
  - Generate & Print Shipping Labels and GST Tax Invoices.
  - **Audited Manual Overrides:** Change order/delivery status with mandatory audit log reason.
  - **Automatic Payment & Refund Sync:** Marking an order refunded automatically syncs payment and refund statuses.
- **Dynamic CMS Manager:**
  - Edit homepage banners and sliders without touching code.
  - Edit announcement bar text and visibility.
  - Update policy pages (About Us, Shipping, Refund & Cancellation, Privacy Policy, Terms).
  - Update contact information and social links.
- **Coupons & Promotions:**
  - Create percentage (%) or flat (₹) discount codes with min order limit and max discount cap.
- **Customer Reviews :**
  - Moderate and approve/hide customer reviews.

---

## 🚀 How to Run the Project

### 1. Backend Server (`server/`)
```bash
cd server
npm install
npm run seed     # Seeds Admin, Categories, 3 Products & Images, CMS, Coupons
node src/server.js
```
Runs at: `http://localhost:5000`

### 2. Frontend Client (`client/`)
```bash
cd client
npm install
npm run dev
```
Runs at: `http://localhost:5173`

---

## 🔐 Environment Variables

### Backend (`server/.env`)
- `PORT=5000`
- `MONGO_URI` (MongoDB Atlas URI)
- `JWT_SECRET`
- `ADMIN_EMAIL` & `ADMIN_PASSWORD`
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
- `DEFAULT_COURIER_NAME="India Post"`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

### Frontend (`client/.env`)
- `VITE_API_BASE_URL=http://localhost:5000/api`
- `VITE_SERVER_URL=http://localhost:5000`
- `VITE_RAZORPAY_KEY_ID=rzp_test_novise_sample_key`
- `VITE_BRAND_NAME="Novis Herbal"`
