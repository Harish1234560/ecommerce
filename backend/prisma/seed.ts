// Seed / demo data. Everything here is sample content that the admin can edit or delete.
// Orders are created through the real order services so stock, payments and history stay consistent.
import bcrypt from 'bcryptjs';
import type { OrderStatus, Prisma } from '@prisma/client';
import { env } from '../src/config/env.js';
import { prisma } from '../src/database/prisma.js';
import { recalcRating } from '../src/services/catalog.service.js';
import { syncProductStock } from '../src/services/inventory.service.js';
import { adminUpdateStatus, cancelOrder, createOrder } from '../src/services/order.service.js';
import { confirmOnlinePayment } from '../src/services/payment.service.js';
import { completeRefund, requestReturn } from '../src/services/refund.service.js';
import { DEFAULT_SETTINGS, invalidateSettings } from '../src/services/settings.service.js';

const px = (id: number, w = 940, h = 650, ext = 'jpeg') =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.${ext}?auto=compress&cs=tinysrgb&h=${h}&w=${w}`;
const rupees = (n: number) => Math.round(n * 100);

interface SeedVariant { sku: string; size?: string; color?: string; stock: number }
interface SeedProduct {
  name: string; slug: string; sku: string; category: string; subcategory?: string; brand: string; description: string;
  price: number; discountPrice?: number; stock: number; threshold: number; tags: string[];
  featured?: boolean; best?: boolean; trending?: boolean; images: [number, string?][]; specs: [string, string][]; variants?: SeedVariant[];
}

const CATEGORIES = [
  { name: 'Fashion', slug: 'fashion', description: 'Everyday clothing with a modern fit — jackets, tees, shirts and denim.', image: 8146450, subs: ['Topwear', 'Bottomwear', 'Outerwear'] },
  { name: 'Electronics', slug: 'electronics', description: 'Audio, cameras and desk gear chosen for reliability.', image: 7989742, subs: ['Audio', 'Cameras', 'Accessories'] },
  { name: 'Home & Living', slug: 'home-living', description: 'Furniture and storage that make a house feel like home.', image: 11112735, subs: ['Seating', 'Storage'] },
  { name: 'Beauty', slug: 'beauty', description: 'Skincare essentials and gift sets.', image: 36339062, subs: ['Skincare', 'Gift Sets'] },
  { name: 'Footwear', slug: 'footwear', description: 'Sneakers for running, the gym and the street.', image: 1464625, subs: ['Sneakers'] },
  { name: 'Accessories', slug: 'accessories', description: 'Watches and bags that finish the look.', image: 6157411, subs: ['Watches', 'Bags'] },
];

const sizes = (base: string, list: [string, number][], color: string): SeedVariant[] =>
  list.map(([size, stock]) => ({ sku: `${base}-${size}`, size, color, stock }));

const PRODUCTS: SeedProduct[] = [
  { name: 'Classic Denim Jacket', slug: 'classic-denim-jacket', sku: 'FASH-DJ-001', category: 'fashion', subcategory: 'Outerwear', brand: 'DenimCo', price: 2499, discountPrice: 1799, stock: 0, threshold: 5, featured: true, best: true,
    description: 'Premium quality denim jacket with a classic fit. Made from 100% cotton denim for all-day comfort. Features a button-front closure, two chest pockets and adjustable cuffs.',
    tags: ['jacket', 'denim', 'unisex', 'blue'], images: [[38561616, 'Blue denim jacket']], specs: [['Material', '100% cotton denim'], ['Fit', 'Regular'], ['Care', 'Machine wash cold']],
    variants: sizes('FASH-DJ-001', [['M', 15], ['L', 12], ['XL', 10]], 'Blue') },
  { name: 'Casual Cotton T-Shirt', slug: 'casual-cotton-t-shirt', sku: 'FASH-TS-002', category: 'fashion', subcategory: 'Topwear', brand: 'TeeStyle', price: 699, discountPrice: 449, stock: 0, threshold: 10, featured: true, best: true, trending: true,
    description: 'Soft cotton t-shirt made for daily wear. Breathable fabric, crew neck and short sleeves. Holds its shape wash after wash.',
    tags: ['tshirt', 'cotton', 'casual'], images: [[8146450, 'Casual cotton t-shirt'], [13094187, 'Gray t-shirt']], specs: [['Material', '100% combed cotton'], ['Neck', 'Crew neck'], ['Sleeve', 'Short sleeve']],
    variants: [
      { sku: 'FASH-TS-002-M-GRY', size: 'M', color: 'Gray', stock: 40 }, { sku: 'FASH-TS-002-L-GRY', size: 'L', color: 'Gray', stock: 35 },
      { sku: 'FASH-TS-002-M-RED', size: 'M', color: 'Red', stock: 25 }, { sku: 'FASH-TS-002-L-RED', size: 'L', color: 'Red', stock: 20 },
    ] },
  { name: 'Premium Button-Up Shirt', slug: 'premium-button-up-shirt', sku: 'FASH-BS-003', category: 'fashion', subcategory: 'Topwear', brand: 'FormWear', price: 1299, discountPrice: 899, stock: 0, threshold: 8,
    description: 'Elegant button-up shirt crafted from a premium cotton blend. A tailored fit and durable stitching make it right for the office and formal occasions.',
    tags: ['shirt', 'formal', 'button-up'], images: [[13381986, 'Button-up shirt']], specs: [['Material', 'Cotton blend'], ['Fit', 'Tailored'], ['Occasion', 'Formal']],
    variants: sizes('FASH-BS-003', [['M', 20], ['L', 18], ['XL', 22]], 'Gray') },
  { name: 'Vintage Denim Jeans', slug: 'vintage-denim-jeans', sku: 'FASH-DJ-004', category: 'fashion', subcategory: 'Bottomwear', brand: 'DenimCo', price: 1899, discountPrice: 1349, stock: 0, threshold: 8, best: true,
    description: 'Vintage-wash denim jeans with a straight fit. Durable denim with a slight stretch for comfort, five-pocket design and zip fly.',
    tags: ['jeans', 'denim', 'vintage'], images: [[18533669, 'Vintage denim jeans'], [13632832, 'Denim detail']], specs: [['Material', '98% cotton, 2% elastane'], ['Fit', 'Straight'], ['Rise', 'Mid rise']],
    variants: sizes('FASH-DJ-004', [['30', 20], ['32', 25], ['34', 18], ['36', 17]], 'Blue') },

  { name: 'Wireless Noise-Cancelling Headphones', slug: 'wireless-noise-cancelling-headphones', sku: 'ELEC-HP-001', category: 'electronics', subcategory: 'Audio', brand: 'SoundMax', price: 4999, discountPrice: 3499, stock: 30, threshold: 8, featured: true, best: true, trending: true,
    description: 'Immerse yourself in pure audio with active noise cancellation. 40-hour battery life, Bluetooth 5.3 and soft protein-leather earcups. Includes USB-C fast charging.',
    tags: ['headphones', 'wireless', 'anc', 'bluetooth'], images: [[9058883, 'Black wireless headphones'], [3394650, 'White wireless headphones']], specs: [['Battery life', '40 hours'], ['Connectivity', 'Bluetooth 5.3'], ['Charging', 'USB-C fast charge'], ['Warranty', '1 year']] },
  { name: 'Compact Digital Camera', slug: 'compact-digital-camera', sku: 'ELEC-CAM-002', category: 'electronics', subcategory: 'Cameras', brand: 'PhotoPro', price: 12999, discountPrice: 9999, stock: 15, threshold: 5, featured: true, trending: true,
    description: '20MP compact digital camera with 4K video recording. 3-inch touchscreen, 10x optical zoom and built-in Wi-Fi for instant sharing. A capable travel companion.',
    tags: ['camera', 'digital', '4k', 'photography'], images: [[37796150, 'Compact digital camera']], specs: [['Sensor', '20 MP'], ['Video', '4K 30fps'], ['Zoom', '10x optical'], ['Warranty', '2 years']] },
  { name: 'Wireless Earbuds Pro', slug: 'wireless-earbuds-pro', sku: 'ELEC-EB-003', category: 'electronics', subcategory: 'Audio', brand: 'SoundMax', price: 2999, discountPrice: 1999, stock: 50, threshold: 10, best: true, trending: true,
    description: 'True wireless earbuds with active noise cancellation, touch controls and 30 hours of total battery with the charging case. IPX5 water resistance and dual microphones for clear calls.',
    tags: ['earbuds', 'wireless', 'anc'], images: [[33298190, 'Wireless earbuds']], specs: [['Battery life', '30 hours with case'], ['Water resistance', 'IPX5'], ['Microphones', 'Dual'], ['Warranty', '1 year']] },
  { name: 'Smart Laptop Stand', slug: 'smart-laptop-stand', sku: 'ELEC-LS-004', category: 'electronics', subcategory: 'Accessories', brand: 'DeskFlex', price: 1499, discountPrice: 999, stock: 4, threshold: 6,
    description: 'Aluminium laptop stand with adjustable height and an open design for airflow. Fits laptops from 11 to 17 inches and reduces neck strain.',
    tags: ['laptop', 'stand', 'ergonomic'], images: [[12880803, 'Laptop stand']], specs: [['Material', 'Aluminium alloy'], ['Compatibility', '11–17 inch laptops'], ['Adjustable', 'Yes']] },

  { name: 'Modern Accent Armchair', slug: 'modern-accent-armchair', sku: 'HOME-AC-001', category: 'home-living', subcategory: 'Seating', brand: 'HomeLuxe', price: 8999, discountPrice: 6499, stock: 20, threshold: 5, featured: true,
    description: 'Gray armchair with solid wooden legs. Upholstered in durable fabric with high-density foam cushioning — at home in a living room, bedroom or office.',
    tags: ['armchair', 'furniture', 'gray'], images: [[11112735, 'Gray accent armchair']], specs: [['Upholstery', 'Woven fabric'], ['Legs', 'Solid wood'], ['Assembly', 'Legs screw in, no tools']] },
  { name: 'Wooden Bookshelf', slug: 'wooden-bookshelf', sku: 'HOME-BS-002', category: 'home-living', subcategory: 'Storage', brand: 'HomeLuxe', price: 4999, discountPrice: 3499, stock: 25, threshold: 8, best: true,
    description: 'Five-tier bookshelf with a natural wood finish and a sturdy metal frame. Room for books, plants and decorative pieces.',
    tags: ['bookshelf', 'furniture', 'wood'], images: [[31338030, 'Wooden bookshelf']], specs: [['Tiers', '5'], ['Frame', 'Powder-coated metal'], ['Assembly', 'Required']] },
  { name: 'Minimalist Wooden Chair', slug: 'minimalist-wooden-chair', sku: 'HOME-WC-003', category: 'home-living', subcategory: 'Seating', brand: 'HomeLuxe', price: 3299, discountPrice: 2299, stock: 35, threshold: 10, trending: true,
    description: 'Scandinavian-style chair in solid oak with a natural finish and a white seat cushion. Suits a dining room or a home office.',
    tags: ['chair', 'wooden', 'minimalist'], images: [[35589991, 'Minimalist wooden chair']], specs: [['Material', 'Solid oak'], ['Cushion', 'Removable'], ['Max load', '120 kg']] },
  { name: 'Storage Cabinet', slug: 'storage-cabinet', sku: 'HOME-CB-004', category: 'home-living', subcategory: 'Storage', brand: 'HomeLuxe', price: 5999, discountPrice: 4199, stock: 0, threshold: 5,
    description: 'Versatile storage cabinet with slatted doors and wicker drawers. Organises any room and is made from responsibly sourced materials.',
    tags: ['cabinet', 'storage', 'furniture'], images: [[11112749, 'Storage cabinet']], specs: [['Doors', 'Slatted'], ['Drawers', '2 wicker'], ['Assembly', 'Required']] },

  { name: 'Luxury Face Cream', slug: 'luxury-face-cream', sku: 'BEAUTY-FC-001', category: 'beauty', subcategory: 'Skincare', brand: 'GlowLab', price: 1799, discountPrice: 1299, stock: 100, threshold: 20, featured: true, best: true, trending: true,
    description: 'Hydrating face cream with hyaluronic acid and vitamin E. Deeply moisturises and softens the look of fine lines. Suitable for all skin types. 50 ml jar.',
    tags: ['cream', 'skincare', 'anti-aging'], images: [[36339062, 'Luxury face cream']], specs: [['Volume', '50 ml'], ['Skin type', 'All'], ['Key ingredients', 'Hyaluronic acid, vitamin E']] },
  { name: 'Natural Skincare Set', slug: 'natural-skincare-set', sku: 'BEAUTY-SS-002', category: 'beauty', subcategory: 'Gift Sets', brand: 'GlowLab', price: 2499, discountPrice: 1749, stock: 60, threshold: 15, best: true,
    description: 'Complete skincare set with a charcoal face mask, cucumber soap and essential oils. Natural ingredients for healthy-looking skin.',
    tags: ['skincare', 'natural', 'charcoal'], images: [[18441533, 'Natural skincare set']], specs: [['Pieces', '4'], ['Skin type', 'All'], ['Cruelty free', 'Yes']] },
  { name: 'Vitamin C Serum', slug: 'vitamin-c-serum', sku: 'BEAUTY-VS-003', category: 'beauty', subcategory: 'Skincare', brand: 'GlowLab', price: 999, discountPrice: 699, stock: 150, threshold: 25, featured: true, trending: true,
    description: 'Brightening vitamin C serum with niacinamide. Helps even skin tone with a lightweight, fast-absorbing formula. 30 ml bottle.',
    tags: ['serum', 'vitamin-c', 'skincare'], images: [[4841273, 'Vitamin C serum']], specs: [['Volume', '30 ml'], ['Key ingredients', 'Vitamin C, niacinamide'], ['Use', 'Morning, before sunscreen']] },
  { name: 'Premium Skincare Gift Set', slug: 'premium-skincare-gift-set', sku: 'BEAUTY-GS-004', category: 'beauty', subcategory: 'Gift Sets', brand: 'GlowLab', price: 3999, discountPrice: 2799, stock: 40, threshold: 10,
    description: 'Skincare gift set with creams, toner and face wash in elegant packaging. Five full-size products — ready to gift.',
    tags: ['gift', 'skincare', 'luxury'], images: [[33538457, 'Skincare gift set']], specs: [['Pieces', '5 full-size'], ['Packaging', 'Gift box']] },

  { name: 'Sport Running Sneakers', slug: 'sport-running-sneakers', sku: 'FOOT-SN-001', category: 'footwear', subcategory: 'Sneakers', brand: 'StepUp', price: 2799, discountPrice: 1899, stock: 0, threshold: 6, featured: true, best: true, trending: true,
    description: 'Lightweight running sneakers with a breathable mesh upper and cushioned sole. Built for running, the gym and casual wear.',
    tags: ['sneakers', 'running', 'sports'], images: [[1464625, 'Running sneakers']], specs: [['Upper', 'Breathable mesh'], ['Sole', 'EVA cushioned'], ['Closure', 'Lace-up']],
    variants: sizes('FOOT-SN-001', [['7', 15], ['8', 20], ['9', 25], ['10', 30]], 'Black') },
  { name: 'Classic White Sneakers', slug: 'classic-white-sneakers', sku: 'FOOT-WS-002', category: 'footwear', subcategory: 'Sneakers', brand: 'StepUp', price: 3499, discountPrice: 2499, stock: 0, threshold: 6, best: true,
    description: 'Timeless white leather sneakers with black accents. Leather upper, rubber sole and a shape that goes with any outfit.',
    tags: ['sneakers', 'white', 'leather'], images: [[27298315, 'White leather sneakers']], specs: [['Upper', 'Leather'], ['Sole', 'Rubber'], ['Closure', 'Lace-up']],
    variants: sizes('FOOT-WS-002', [['7', 12], ['8', 15], ['9', 18], ['10', 20]], 'White') },
  { name: 'Yellow Statement Sneakers', slug: 'yellow-statement-sneakers', sku: 'FOOT-YS-003', category: 'footwear', subcategory: 'Sneakers', brand: 'StepUp', price: 2299, discountPrice: 1599, stock: 0, threshold: 5, trending: true,
    description: 'Bold yellow sneakers with a comfortable fit and durable construction. Adds a pop of colour to any outfit.',
    tags: ['sneakers', 'yellow', 'fashion'], images: [[11135667, 'Yellow sneakers']], specs: [['Upper', 'Canvas'], ['Sole', 'Rubber']],
    variants: sizes('FOOT-YS-003', [['8', 10], ['9', 12], ['10', 18]], 'Yellow') },
  { name: 'High-Top Canvas Sneakers', slug: 'high-top-canvas-sneakers', sku: 'FOOT-HT-004', category: 'footwear', subcategory: 'Sneakers', brand: 'StepUp', price: 1999, discountPrice: 1399, stock: 0, threshold: 6,
    description: 'Classic high-top canvas sneakers with a durable rubber sole, lace-up front and padded ankle support.',
    tags: ['sneakers', 'hightop', 'canvas'], images: [[27204251, 'High-top canvas sneakers']], specs: [['Upper', 'Canvas'], ['Ankle', 'Padded high-top']],
    variants: sizes('FOOT-HT-004', [['7', 15], ['8', 20], ['9', 18], ['10', 17]], 'Black') },

  { name: 'Luxury Automatic Watch', slug: 'luxury-automatic-watch', sku: 'ACC-WW-001', category: 'accessories', subcategory: 'Watches', brand: 'TimeLux', price: 7999, discountPrice: 5499, stock: 25, threshold: 5, featured: true, best: true, trending: true,
    description: 'Automatic wristwatch with a blue dial and stainless steel bracelet. Sapphire crystal glass, 50 m water resistance and an exhibition case back.',
    tags: ['watch', 'luxury', 'automatic'], images: [[6157411, 'Luxury automatic watch']], specs: [['Movement', 'Automatic'], ['Glass', 'Sapphire crystal'], ['Water resistance', '50 m'], ['Warranty', '2 years']] },
  { name: 'Leather Strap Chronograph', slug: 'leather-strap-chronograph', sku: 'ACC-LC-002', category: 'accessories', subcategory: 'Watches', brand: 'TimeLux', price: 4999, discountPrice: 3499, stock: 35, threshold: 8, best: true,
    description: 'Chronograph watch with a genuine leather strap, multiple sub-dials, date display and luminous hands. Water resistant to 30 m.',
    tags: ['watch', 'chronograph', 'leather'], images: [[6157408, 'Leather strap chronograph']], specs: [['Movement', 'Quartz chronograph'], ['Strap', 'Genuine leather'], ['Water resistance', '30 m']] },
  { name: 'Premium Leather Handbag', slug: 'premium-leather-handbag', sku: 'ACC-LH-003', category: 'accessories', subcategory: 'Bags', brand: 'BagLux', price: 5999, discountPrice: 3999, stock: 30, threshold: 8, featured: true, trending: true,
    description: 'Genuine leather handbag with gold-tone hardware. A spacious interior with multiple compartments for work or everyday use.',
    tags: ['handbag', 'leather', 'premium'], images: [[27046147, 'Premium leather handbag']], specs: [['Material', 'Genuine leather'], ['Compartments', '3'], ['Closure', 'Zip']] },
  { name: 'Leather Crossbody Bag', slug: 'leather-crossbody-bag', sku: 'ACC-CB-004', category: 'accessories', subcategory: 'Bags', brand: 'BagLux', price: 3499, stock: 45, threshold: 10,
    description: 'Leather crossbody bag with an adjustable strap, card slots and a zip pocket. Compact enough for hands-free days out.',
    tags: ['bag', 'crossbody', 'leather'], images: [[26965805, 'Leather crossbody bag']], specs: [['Material', 'Genuine leather'], ['Strap', 'Adjustable']] },
];

const CUSTOMERS = [
  { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', address: '14 Hill Road', street: 'Bandra West' },
  { name: 'Rahul Verma', email: 'rahul@example.com', phone: '9812345678', city: 'New Delhi', state: 'Delhi', pincode: '110017', address: 'B-42 Malviya Nagar', street: 'Shivalik Road' },
  { name: 'Anjali Gupta', email: 'anjali@example.com', phone: '9900112233', city: 'Bengaluru', state: 'Karnataka', pincode: '560034', address: '221 5th Block', street: 'Koramangala' },
  { name: 'Vikram Nair', email: 'vikram@example.com', phone: '9845012345', city: 'Kochi', state: 'Kerala', pincode: '682016', address: '8 Marine Drive', street: 'Shanmugham Road' },
  { name: 'Sneha Iyer', email: 'sneha@example.com', phone: '9790011223', city: 'Chennai', state: 'Tamil Nadu', pincode: '600020', address: '5 2nd Main Road', street: 'Adyar' },
];

const REVIEW_TEXTS: [number, string, string][] = [
  [5, 'Exactly as described', 'Quality is excellent and it arrived a day early. Packaging was neat. Would happily buy again.'],
  [5, 'Worth every rupee', 'Really impressed with the finish. Looks more premium than the price suggests.'],
  [4, 'Good value', 'Does what it promises. Delivery was quick and the product matches the photos.'],
  [4, 'Happy with the purchase', 'Good build quality overall. Took one star off because the box was slightly dented.'],
  [5, 'Great buy', 'Using it daily for two weeks now with no complaints. Recommended.'],
  [3, 'Decent', 'It is okay for the price. Not outstanding, but no real issues either.'],
  [5, 'Loved it', 'Bought it as a gift and it was a hit. Smooth ordering and delivery experience.'],
];

const ABOUT = {
  heroTitle: 'A shop built around things worth keeping',
  heroSubtitle: 'We are a small, independent store that picks every product by hand and stands behind each one.',
  story:
    'ShopHub started in 2019 as a single shelf of products we could not find good versions of anywhere else. We ordered samples, used them ourselves, and only listed what we would recommend to a friend. Today we serve customers across India from our Mumbai warehouse — still testing everything before it earns a place in the store.',
  mission: 'Make it easy to buy well-made everyday products at honest prices, with service that treats people the way we would want to be treated.',
  vision: 'To be the shop customers think of first when they want something they will not have to replace next year.',
  whyChooseUs: [
    { title: 'Hand-picked catalogue', text: 'A focused range instead of endless pages. Every product is tried and checked before it is listed.' },
    { title: 'Fair, transparent pricing', text: 'Prices include taxes. No surprise charges at checkout.' },
    { title: 'Fast, tracked delivery', text: 'Orders are packed within one working day and tracked to your door.' },
    { title: 'Easy returns', text: 'Changed your mind? Return eligible items within 7 days of delivery.' },
  ],
  qualityPromise: 'Each batch is inspected at our warehouse before it ships. If something arrives damaged or not as described, we replace it or refund you — your choice.',
  customerFirst: 'Real people answer our support line six days a week. When you write to us, you get a reply from someone empowered to fix the problem, not a script.',
  stats: [
    { label: 'Happy customers', value: '25,000+' },
    { label: 'Orders delivered', value: '60,000+' },
    { label: 'PIN codes served', value: '19,000+' },
    { label: 'Average rating', value: '4.6 / 5' },
  ],
  team: [
    { name: 'Harish Reddy', role: 'Founder & Owner' },
    { name: 'Operations team', role: 'Warehouse & dispatch, Mumbai' },
    { name: 'Customer care', role: 'Mon–Sat, 9 AM – 9 PM' },
  ],
  businessInfo: 'ShopHub is owned and operated as a single independent retail business. All products are sold and shipped directly by us.',
};

const PAGES: { slug: string; title: string; body: string; data?: object }[] = [
  { slug: 'about', title: 'About Us', body: '', data: ABOUT },
  {
    slug: 'return-policy',
    title: 'Return & Refund Policy',
    body: `## Returns
You can request a return within **7 days of delivery** from the order details page in your account.

- Items must be unused, with original tags and packaging.
- Beauty products can be returned only if the seal is unbroken.
- Once a return is approved we arrange a pickup from your delivery address.

## Refunds
- Prepaid orders are refunded to the original payment method once the returned item reaches our warehouse and passes inspection.
- Cash on Delivery orders are refunded by bank transfer or UPI.
- Refunds normally reflect within 5–7 business days after we initiate them.

## Cancellations
Orders can be cancelled from your account any time before they are shipped. If you already paid, the full amount is refunded.

## Damaged or wrong items
If your order arrives damaged or is not what you ordered, contact us within 48 hours with photos and we will replace it or refund you in full.`,
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    body: `## Shipping charges
- Standard shipping is charged per order and shown at checkout before you pay.
- Orders above the free-shipping threshold ship free.

## Delivery areas
We deliver across India. Enter your PIN code on any product page to check availability and the estimated delivery date.

## Processing time
Orders are packed and handed to the courier within **1 working day**.

## Estimated delivery
- Metro cities: 2–4 working days
- Rest of India: 4–7 working days
- Remote areas: up to 10 working days

## Cash on Delivery
COD is available on most PIN codes for orders up to the limit shown at checkout. Please keep the exact amount ready for the delivery partner.`,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    body: `## What we collect
- **Account details** — your name, email address and phone number.
- **Order details** — delivery addresses, the items you buy and your order history.
- **Payment references** — the payment status and transaction reference returned by our payment gateway.

We **never** see or store your card number, CVV or UPI PIN. Payments are handled entirely by our PCI-DSS compliant payment partner.

## How we use it
- To process and deliver your orders and keep you updated about them.
- To provide customer support.
- To send offers, only if you subscribe to them. You can unsubscribe at any time.

## Sharing
We share only what is necessary with delivery partners (name, address, phone) and our payment gateway. We do not sell your personal data.

## Security
Passwords are stored as salted hashes. Access to customer data is restricted to authorised staff.

## Your choices
You can update your profile and addresses from your account, or contact us to request deletion of your account and personal data.`,
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    body: `## Using this store
By placing an order you confirm that the information you provide is accurate and that you are authorised to use the chosen payment method.

## Products and pricing
- We try to display products and colours accurately; slight variations may occur between screens.
- Prices are in Indian Rupees and include applicable taxes unless stated otherwise.
- Prices and availability can change without notice. The price charged is the one shown at checkout when you place the order.

## Orders
We may cancel an order if a product is unavailable, if there is a pricing error, or if we suspect fraud. Any amount paid is refunded in full.

## Coupons
Coupons are subject to their stated conditions, cannot be combined and have no cash value.

## Returns and refunds
Returns, cancellations and refunds are governed by our Return & Refund Policy.

## Liability
To the extent permitted by law, our liability for any order is limited to the amount you paid for it.

## Contact
Questions about these terms? Reach us through the Contact page.`,
  },
];

const daysAgo = (n: number, hour = 11) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, (n * 17) % 60, 0, 0);
  return d;
};

async function main() {
  if ((await prisma.user.count()) > 0) {
    console.log('Database already contains data — skipping seed. Run `npm run db:reset` to start fresh.');
    return;
  }
  console.log('Seeding…');

  // ── Settings (email off while seeding so sample orders do not send mail) ──
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.storeSetting.create({ data: { key, value: key === 'notifications' ? { ...value, emailEnabled: false } : value } });
  }
  invalidateSettings();

  // ── Users ──
  const admin = await prisma.user.create({
    data: { name: 'Store Admin', email: env.SEED_ADMIN_EMAIL.toLowerCase(), role: 'ADMIN', passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12) },
  });
  const customerHash = await bcrypt.hash('Customer@123', 12);
  const customers: Prisma.UserGetPayload<{ include: { addresses: true } }>[] = [];
  for (const [i, c] of CUSTOMERS.entries()) {
    const user = await prisma.user.create({
      data: {
        name: c.name, email: c.email, phone: c.phone, passwordHash: customerHash, createdAt: daysAgo(70 - i * 9),
        cart: { create: {} }, wishlist: { create: {} },
        addresses: { create: { fullName: c.name, phone: c.phone, address: c.address, street: c.street, city: c.city, state: c.state, pincode: c.pincode, isDefault: true } },
      },
      include: { addresses: true },
    });
    customers.push(user);
  }

  // ── Catalogue ──
  const categoryBy = new Map<string, { id: string; subs: Map<string, string> }>();
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await prisma.category.create({
      data: {
        name: c.name, slug: c.slug, description: c.description, imageUrl: px(c.image, 500, 500), bannerUrl: px(c.image, 1400, 420), sortOrder: i + 1,
        subcategories: { create: c.subs.map((name, n) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), sortOrder: n })) },
      },
      include: { subcategories: true },
    });
    categoryBy.set(c.slug, { id: cat.id, subs: new Map(cat.subcategories.map((s) => [s.name, s.id])) });
  }

  const productBy = new Map<string, { id: string; variantIds: string[] }>();
  for (const [i, p] of PRODUCTS.entries()) {
    const cat = categoryBy.get(p.category)!;
    const price = rupees(p.price);
    const selling = rupees(p.discountPrice ?? p.price);
    const product = await prisma.product.create({
      data: {
        name: p.name, slug: p.slug, sku: p.sku, description: p.description, categoryId: cat.id, subcategoryId: p.subcategory ? cat.subs.get(p.subcategory) : null,
        brand: p.brand, tags: p.tags, price, discountPrice: p.discountPrice ? selling : null, sellingPrice: selling,
        discountPercent: Math.round(((price - selling) / price) * 100), specifications: p.specs.map(([label, value]) => ({ label, value })),
        featured: !!p.featured, isBestSeller: !!p.best, isTrending: !!p.trending, hasVariants: !!p.variants?.length, createdAt: daysAgo(80 - i * 2),
        images: { create: p.images.map(([id, alt], n) => ({ url: px(id, 940, 940, id === 33538457 ? 'png' : 'jpeg'), alt: alt ?? p.name, sortOrder: n, isPrimary: n === 0 })) },
        inventory: { create: { stock: p.variants?.length ? 0 : p.stock, lowStockThreshold: p.threshold } },
      },
      include: { inventory: true },
    });
    if (!p.variants?.length && p.stock > 0) {
      await prisma.inventoryTransaction.create({ data: { inventoryId: product.inventory[0]!.id, type: 'RESTOCK', quantity: p.stock, stockAfter: p.stock, note: 'Opening stock', adminId: admin.id } });
    }
    const variantIds: string[] = [];
    for (const v of p.variants ?? []) {
      const variant = await prisma.productVariant.create({
        data: { productId: product.id, sku: v.sku, size: v.size, color: v.color, inventory: { create: { productId: product.id, stock: v.stock, lowStockThreshold: p.threshold } } },
        include: { inventory: true },
      });
      await prisma.inventoryTransaction.create({ data: { inventoryId: variant.inventory!.id, type: 'RESTOCK', quantity: v.stock, stockAfter: v.stock, note: 'Opening stock', adminId: admin.id } });
      variantIds.push(variant.id);
    }
    await syncProductStock(prisma, product.id);
    productBy.set(p.slug, { id: product.id, variantIds });
  }

  // ── Tax rules & shipping zones ──
  await prisma.taxRule.createMany({
    data: [
      { name: 'GST 18% (standard)', rate: 18, isDefault: true },
      { name: 'GST 5% — Fashion', rate: 5, categoryId: categoryBy.get('fashion')!.id },
      { name: 'GST 12% — Footwear', rate: 12, categoryId: categoryBy.get('footwear')!.id },
    ],
  });
  await prisma.shippingZone.createMany({
    data: [
      { name: 'Metro cities', pincodePrefixes: ['110', '400', '560', '600', '700', '500'], fee: 4000, freeAbove: 50000, minDays: 2, maxDays: 4, codAvailable: true },
      { name: 'North-East & remote', pincodePrefixes: ['79', '78', '19', '744'], fee: 9000, freeAbove: 150000, minDays: 6, maxDays: 10, codAvailable: false },
    ],
  });

  // ── Coupons ──
  const nextYear = daysAgo(-365);
  await prisma.coupon.create({ data: { code: 'WELCOME10', description: '10% off your first order', discountType: 'PERCENTAGE', value: 10, minOrder: 50000, maxDiscount: 10000, usageLimit: 1000, perUserLimit: 1, startsAt: daysAgo(90), expiresAt: nextYear } });
  await prisma.coupon.create({ data: { code: 'FESTIVE20', description: '20% off festive orders above ₹1,000', discountType: 'PERCENTAGE', value: 20, minOrder: 100000, maxDiscount: 50000, usageLimit: 500, perUserLimit: 2, startsAt: daysAgo(30), expiresAt: daysAgo(-120) } });
  await prisma.coupon.create({ data: { code: 'FLAT100', description: 'Flat ₹100 off orders above ₹500', discountType: 'FIXED', value: 10000, minOrder: 50000, usageLimit: 2000, perUserLimit: 3, startsAt: daysAgo(90), expiresAt: nextYear } });
  await prisma.coupon.create({ data: { code: 'GLOW15', description: '15% off all Beauty products', discountType: 'PERCENTAGE', value: 15, minOrder: 0, maxDiscount: 30000, startsAt: daysAgo(10), expiresAt: daysAgo(-60), categories: { connect: { id: categoryBy.get('beauty')!.id } } } });
  await prisma.coupon.create({ data: { code: 'SUMMER25', description: 'Summer sale (ended)', discountType: 'PERCENTAGE', value: 25, minOrder: 0, startsAt: daysAgo(120), expiresAt: daysAgo(30), showOnOffers: false } });

  // ── Storefront content ──
  await prisma.banner.createMany({
    data: [
      { type: 'HERO', title: 'Big Sale — Up to 50% Off', subtitle: 'Fresh deals on fashion, electronics and more. Limited stock.', imageUrl: px(7987759, 1600, 800), ctaText: 'Shop Now', linkUrl: '/products?discount=20', sortOrder: 1 },
      { type: 'HERO', title: 'New Arrivals Are Here', subtitle: 'The latest in tech, style and home — picked by hand.', imageUrl: px(8346914, 1600, 800), ctaText: 'Explore', linkUrl: '/products?sort=newest', sortOrder: 2 },
      { type: 'PROMO', title: 'Festive Special', subtitle: 'Extra 20% off with code FESTIVE20', imageUrl: px(5650041, 1200, 500), ctaText: 'Grab the deal', linkUrl: '/offers', sortOrder: 1 },
    ],
  });
  await prisma.homepageSection.createMany({
    data: [
      { key: 'categories', title: 'Shop by Category', subtitle: 'Find what you need, faster', sortOrder: 1 },
      { key: 'featured', title: 'Featured Products', subtitle: 'Hand-picked by our team', sortOrder: 2 },
      { key: 'offers', title: 'Offers for You', subtitle: 'Apply these codes at checkout', sortOrder: 3 },
      { key: 'trending', title: 'Trending Now', subtitle: 'What everyone is looking at this week', sortOrder: 4 },
      { key: 'promo', title: 'Promotions', sortOrder: 5 },
      { key: 'bestsellers', title: 'Best Sellers', subtitle: 'Loved by our customers', sortOrder: 6 },
      { key: 'testimonials', title: 'What Our Customers Say', sortOrder: 7 },
      { key: 'newsletter', title: 'Stay in the Loop', subtitle: 'Get new arrivals and exclusive offers in your inbox.', sortOrder: 8 },
    ],
  });
  await prisma.testimonial.createMany({
    data: [
      { name: 'Priya S.', location: 'Mumbai', rating: 5, text: 'Lovely quality and it reached me in two days. This is my go-to store now.', sortOrder: 1 },
      { name: 'Rahul V.', location: 'New Delhi', rating: 5, text: 'Fair prices and helpful support. My return was picked up the next day without any fuss.', sortOrder: 2 },
      { name: 'Anjali G.', location: 'Bengaluru', rating: 4, text: 'The site is easy to use and checkout takes under a minute. Good range of products.', sortOrder: 3 },
    ],
  });
  for (const page of PAGES) await prisma.contentPage.create({ data: { slug: page.slug, title: page.title, body: page.body, data: page.data ?? {} } });

  // ── Sample orders, placed through the real order flow and then back-dated ──
  type Line = [slug: string, variantIndex: number | null, qty: number];
  const PATH: OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  let seq = 0;

  async function placeOrder(customerIndex: number, lines: Line[], method: 'COD' | 'ONLINE', ago: number, final: OrderStatus | 'CANCELLED', coupon?: string) {
    const user = customers[customerIndex]!;
    const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: user.id } });
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    for (const [slug, vi, quantity] of lines) {
      const p = productBy.get(slug)!;
      await prisma.cartItem.create({ data: { cartId: cart.id, productId: p.id, variantId: vi === null ? null : p.variantIds[vi]!, quantity } });
    }
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: coupon ?? null } });

    const order = await createOrder(user.id, { addressId: user.addresses[0]!.id, paymentMethod: method });
    seq++;
    if (method === 'ONLINE' && final !== 'PENDING') {
      await prisma.payment.create({ data: { orderId: order.id, gateway: 'MOCK', gatewayOrderId: `seed_order_${seq}`, amount: order.total, method: seq % 3 === 0 ? 'card' : 'upi' } });
      await confirmOnlinePayment({ gatewayOrderId: `seed_order_${seq}`, gatewayPaymentId: `seed_pay_${seq}`, amount: order.total, method: seq % 3 === 0 ? 'card' : 'upi', reference: `SEED${100000 + seq}` });
    }
    if (final === 'CANCELLED') {
      await cancelOrder(order.id, 'customer', 'Ordered by mistake');
    } else if (final !== 'PENDING') {
      const start = method === 'ONLINE' ? 1 : 0; // online orders are already CONFIRMED
      const end = PATH.indexOf(final);
      for (let i = start; i <= end; i++) {
        await adminUpdateStatus(order.id, { status: PATH[i]!, ...(PATH[i] === 'SHIPPED' ? { courier: 'BlueDart', trackingNumber: `BD${7000000 + seq}` } : {}) });
      }
    }

    // Back-date the order and spread its timeline over the following days.
    const placed = daysAgo(ago, 9 + (seq % 10));
    const history = await prisma.orderStatusHistory.findMany({ where: { orderId: order.id }, orderBy: { createdAt: 'asc' } });
    const stepHours = [0, 2, 20, 28, 52, 76, 100];
    let deliveredAt: Date | null = null;
    for (const [i, h] of history.entries()) {
      const at = new Date(Math.min(placed.getTime() + (stepHours[i] ?? 100 + i) * 3600_000, Date.now() - (history.length - i) * 60_000));
      await prisma.orderStatusHistory.update({ where: { id: h.id }, data: { createdAt: at } });
      if (h.status === 'DELIVERED') deliveredAt = at;
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { createdAt: placed, confirmedAt: final === 'PENDING' || final === 'CANCELLED' ? undefined : new Date(placed.getTime() + 2 * 3600_000), ...(deliveredAt ? { deliveredAt } : {}), expectedDelivery: new Date(placed.getTime() + 5 * 86_400_000) },
    });
    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { createdAt: placed } });
    await prisma.payment.updateMany({ where: { orderId: order.id, paidAt: { not: null } }, data: { paidAt: deliveredAt && method === 'COD' ? deliveredAt : placed } });
    await prisma.couponUsage.updateMany({ where: { orderId: order.id }, data: { createdAt: placed } });
    return order;
  }

  const plan: [number, Line[], 'COD' | 'ONLINE', number, OrderStatus | 'CANCELLED', string?][] = [
    [0, [['wireless-noise-cancelling-headphones', null, 1]], 'ONLINE', 58, 'DELIVERED', 'WELCOME10'],
    [1, [['classic-denim-jacket', 1, 1], ['casual-cotton-t-shirt', 0, 2]], 'COD', 55, 'DELIVERED'],
    [2, [['luxury-face-cream', null, 2], ['vitamin-c-serum', null, 1]], 'ONLINE', 52, 'DELIVERED'],
    [3, [['sport-running-sneakers', 2, 1]], 'ONLINE', 49, 'DELIVERED', 'FLAT100'],
    [4, [['luxury-automatic-watch', null, 1]], 'ONLINE', 46, 'DELIVERED'],
    [0, [['casual-cotton-t-shirt', 2, 3]], 'COD', 44, 'DELIVERED'],
    [1, [['wireless-earbuds-pro', null, 1], ['smart-laptop-stand', null, 1]], 'ONLINE', 41, 'DELIVERED'],
    [2, [['wooden-bookshelf', null, 1]], 'COD', 39, 'DELIVERED'],
    [3, [['vintage-denim-jeans', 1, 1], ['premium-button-up-shirt', 0, 1]], 'ONLINE', 36, 'DELIVERED', 'FESTIVE20'],
    [4, [['natural-skincare-set', null, 1]], 'COD', 34, 'CANCELLED'],
    [0, [['classic-white-sneakers', 1, 1]], 'ONLINE', 31, 'DELIVERED'],
    [1, [['leather-strap-chronograph', null, 1]], 'ONLINE', 29, 'DELIVERED'],
    [2, [['premium-leather-handbag', null, 1]], 'ONLINE', 27, 'DELIVERED'],
    [3, [['luxury-face-cream', null, 1], ['premium-skincare-gift-set', null, 1]], 'COD', 24, 'DELIVERED'],
    [4, [['wireless-noise-cancelling-headphones', null, 1]], 'ONLINE', 22, 'DELIVERED'],
    [0, [['minimalist-wooden-chair', null, 2]], 'ONLINE', 20, 'DELIVERED'],
    [1, [['sport-running-sneakers', 1, 1], ['casual-cotton-t-shirt', 1, 1]], 'COD', 18, 'DELIVERED'],
    [2, [['compact-digital-camera', null, 1]], 'ONLINE', 16, 'DELIVERED'],
    [3, [['vitamin-c-serum', null, 3]], 'ONLINE', 14, 'DELIVERED'],
    [4, [['classic-denim-jacket', 0, 1]], 'ONLINE', 12, 'CANCELLED'],
    [0, [['luxury-automatic-watch', null, 1], ['leather-crossbody-bag', null, 1]], 'ONLINE', 10, 'DELIVERED'],
    [1, [['modern-accent-armchair', null, 1]], 'ONLINE', 8, 'DELIVERED'],
    [2, [['wireless-earbuds-pro', null, 2]], 'COD', 6, 'DELIVERED'],
    [3, [['high-top-canvas-sneakers', 2, 1]], 'ONLINE', 5, 'DELIVERED'],
    [4, [['luxury-face-cream', null, 1]], 'COD', 4, 'DELIVERED'],
    [0, [['yellow-statement-sneakers', 1, 1]], 'ONLINE', 3, 'SHIPPED'],
    [1, [['vintage-denim-jeans', 2, 1]], 'COD', 2, 'PACKED'],
    [2, [['casual-cotton-t-shirt', 0, 2], ['classic-white-sneakers', 2, 1]], 'ONLINE', 1, 'CONFIRMED'],
    [3, [['wireless-noise-cancelling-headphones', null, 1]], 'ONLINE', 1, 'OUT_FOR_DELIVERY'],
    [4, [['wooden-bookshelf', null, 1]], 'COD', 0, 'PENDING'],
    [0, [['natural-skincare-set', null, 1]], 'COD', 0, 'PENDING'],
  ];

  const placed = [];
  for (const [c, lines, method, ago, final, coupon] of plan) placed.push({ order: await placeOrder(c, lines, method, ago, final, coupon), final, c });

  // One completed refund (the cancelled prepaid order) and one open return request.
  const refundRow = await prisma.refund.findFirst({ where: { type: 'CANCELLATION', status: 'APPROVED' } });
  if (refundRow) {
    await prisma.refund.update({ where: { id: refundRow.id }, data: { status: 'PROCESSING', processedAt: daysAgo(11), gatewayRefundId: 'seed_refund_1' } });
    await completeRefund(refundRow.id);
    await prisma.refund.update({ where: { id: refundRow.id }, data: { createdAt: daysAgo(12), completedAt: daysAgo(10) } });
  }
  const recentDelivered = placed.filter((p) => p.final === 'DELIVERED').at(-1);
  if (recentDelivered) {
    await requestReturn(recentDelivered.order.id, customers[recentDelivered.c]!.id, { reason: 'The jar arrived with a broken seal.' });
  }

  // ── Reviews: one per delivered product per customer, from the pool above ──
  const delivered = await prisma.orderItem.findMany({
    where: { order: { deliveredAt: { not: null } } },
    select: { productId: true, orderId: true, order: { select: { userId: true, deliveredAt: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const seen = new Set<string>();
  let r = 0;
  for (const item of delivered) {
    const key = `${item.productId}:${item.order.userId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (r % 5 === 4) { r++; continue; } // leave some products for the customer to review themselves
    const [rating, title, comment] = REVIEW_TEXTS[r % REVIEW_TEXTS.length]!;
    await prisma.review.create({
      data: { productId: item.productId, userId: item.order.userId, orderId: item.orderId, rating, title, comment, isVerified: true, status: 'APPROVED', createdAt: new Date(item.order.deliveredAt!.getTime() + 86_400_000) },
    });
    r++;
  }
  for (const p of productBy.values()) await recalcRating(prisma, p.id);

  // ── Support tickets ──
  await prisma.supportTicket.create({
    data: { userId: customers[1]!.id, name: customers[1]!.name, email: customers[1]!.email, phone: customers[1]!.phone, subject: 'Can I change the delivery address?', createdAt: daysAgo(2),
      messages: { create: { senderName: customers[1]!.name, message: 'I placed an order yesterday and would like it delivered to my office instead. Is that possible?', createdAt: daysAgo(2) } } },
  });
  await prisma.supportTicket.create({
    data: { name: 'Meera Joshi', email: 'meera@example.com', subject: 'Bulk order enquiry', status: 'IN_PROGRESS', createdAt: daysAgo(5),
      messages: { create: [
        { senderName: 'Meera Joshi', message: 'Do you offer discounts on bulk orders of 50+ t-shirts for a corporate event?', createdAt: daysAgo(5) },
        { senderName: 'Store Admin', fromAdmin: true, message: 'Hi Meera, yes we do. Could you share the sizes and colours you need so we can prepare a quote?', createdAt: daysAgo(4) },
      ] } },
  });

  // ── Wishlists ──
  for (const [i, slug] of ['compact-digital-camera', 'modern-accent-armchair', 'premium-leather-handbag'].entries()) {
    const wl = await prisma.wishlist.findUniqueOrThrow({ where: { userId: customers[i % 2]!.id } });
    await prisma.wishlistItem.create({ data: { wishlistId: wl.id, productId: productBy.get(slug)!.id } });
  }

  // Let the fire-and-forget notifications from the order flow settle, then tidy them up:
  // historic orders should not flood the inbox with "just now" notifications.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await prisma.notification.deleteMany({});
  await prisma.emailLog.deleteMany({});
  for (const p of placed.slice(-6)) {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: p.order.id } });
    await prisma.notification.create({
      data: {
        userId: order.userId, type: 'ORDER', title: `Order ${order.status.replaceAll('_', ' ').toLowerCase()}`,
        message: `Order ${order.orderNumber} is ${order.status.replaceAll('_', ' ').toLowerCase()}.`, link: `/account/orders/${order.id}`, createdAt: order.updatedAt,
      },
    });
  }
  for (const c of customers) {
    await prisma.notification.create({ data: { userId: c.id, type: 'OFFER', title: 'Festive offer: 20% off', message: 'Use code FESTIVE20 on orders above ₹1,000.', link: '/offers', createdAt: daysAgo(1) } });
  }
  await prisma.cartItem.deleteMany({});

  await prisma.storeSetting.update({ where: { key: 'notifications' }, data: { value: DEFAULT_SETTINGS.notifications } });
  invalidateSettings();

  console.log(`Seeded: ${PRODUCTS.length} products, ${CATEGORIES.length} categories, ${customers.length} customers, ${placed.length} orders.`);
  console.log(`  Admin login:    ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`);
  console.log('  Customer login: priya@example.com / Customer@123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
