import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
    console.error("Error: STRIPE_SECRET_KEY is not defined in functions/.env");
    process.exit(1);
}

const stripe = new Stripe(secretKey);

// ---------------------------------------------------------------------------
// 3 new products + prices
// ---------------------------------------------------------------------------
const newProducts = [
    {
        id: 'prod_zaps_taste',
        name: 'Taste Test',
        description: '15 Zaps creative booster. Try premium runs for less than a coffee.',
        amount: 199, // $1.99
        zaps: 15,
        priceId: 'price_taste_test',
    },
    {
        id: 'prod_zaps_mystic',
        name: 'Mystic Bulk',
        description: '2,500 Zaps creative booster. Best per-Zap rate for studios and teams.',
        amount: 9999, // $99.99
        zaps: 2500,
        priceId: 'price_mystic_bulk',
    },
    {
        id: 'prod_alchemist_quarterly',
        name: 'Alchemist Pro (Quarterly)',
        description: 'Alchemist Pro subscription billed every 3 months. Saves 17% vs monthly.',
        amount: 7500, // $75.00
        recurring: { interval: 'month', interval_count: 3 },
        zaps: null,
        priceId: 'price_alchemist_quarterly',
    },
];

// ---------------------------------------------------------------------------
// 2 new retention coupons
// 30% off for 3 months on subscription (one-time use per customer)
// 50% off for 1 month on subscription (one-time use per customer)
// ---------------------------------------------------------------------------
const newCoupons = [
    {
        id: 'retention_30_off_3mo',
        name: 'Retention - 30% off 3 months',
        percent_off: 30,
        duration: 'repeating',
        duration_in_months: 3,
        description: 'Retention offer applied at checkout to keep cancelling customers.',
    },
    {
        id: 'retention_50_off_1mo',
        name: 'Retention - 50% off 1 month',
        percent_off: 50,
        duration: 'once',
        // Note: duration_in_months is NOT allowed with duration: 'once'.
        // 'once' automatically applies to the next single invoice.
        description: 'Last-resort retention offer (50% off next month) for cancelling customers.',
    },
];

async function getOrCreateProduct(productData) {
    try {
        const product = await stripe.products.retrieve(productData.id);
        console.log(`Product "${productData.name}" (${product.id}) already exists.`);
        return product;
    } catch (err) {
        if (err.status === 404 || err.code === 'resource_missing') {
            console.log(`Creating product "${productData.name}"...`);
            return await stripe.products.create({
                id: productData.id,
                name: productData.name,
                description: productData.description,
            });
        }
        throw err;
    }
}

async function getOrCreatePrice(productId, amount, recurring = null) {
    const prices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 10,
    });

    const existingPrice = prices.data.find((p) =>
        p.unit_amount === amount &&
        ((!recurring && !p.recurring) || (recurring && p.recurring && p.recurring.interval === recurring.interval && p.recurring.interval_count === (recurring.interval_count || 1)))
    );

    if (existingPrice) {
        console.log(`  Price for product ${productId} with amount ${amount} already exists (${existingPrice.id}).`);
        return existingPrice;
    }

    console.log(`  Creating price for product ${productId} with amount ${amount}${recurring ? ` recurring ${recurring.interval_count || 1} ${recurring.interval}` : ''}...`);
    const priceParams = {
        product: productId,
        unit_amount: amount,
        currency: 'usd',
    };
    if (recurring) {
        priceParams.recurring = recurring;
    }
    return await stripe.prices.create(priceParams);
}

async function getOrCreateCoupon(couponData) {
    try {
        const coupon = await stripe.coupons.retrieve(couponData.id);
        console.log(`Coupon "${coupon.name}" (${coupon.id}) already exists.`);
        return coupon;
    } catch (err) {
        if (err.status === 404 || err.code === 'resource_missing') {
            console.log(`Creating coupon "${couponData.name}"...`);
            // Note: Stripe's coupons API does not accept a 'description' param
            // in this API version. The name is shown in the dashboard.
            return await stripe.coupons.create({
                id: couponData.id,
                name: couponData.name,
                percent_off: couponData.percent_off,
                duration: couponData.duration,
                duration_in_months: couponData.duration_in_months,
            });
        }
        throw err;
    }
}

async function main() {
    console.log(`Using Stripe key: ${secretKey.substring(0, 12)}... (${secretKey.startsWith('sk_live') ? 'LIVE' : 'TEST'}) mode\n`);

    const results = { products: {}, coupons: {} };

    // 1. Create the 3 new products + prices
    console.log('=== Creating new products ===');
    for (const prodData of newProducts) {
        const product = await getOrCreateProduct(prodData);
        const price = await getOrCreatePrice(product.id, prodData.amount, prodData.recurring || null);
        const key = prodData.priceId.replace('price_', '');
        results.products[key] = {
            productId: product.id,
            priceId: price.id,
            amount: prodData.amount,
            zaps: prodData.zaps,
            recurring: prodData.recurring || null,
        };
    }

    // 2. Create the 2 retention coupons
    console.log('\n=== Creating retention coupons ===');
    for (const couponData of newCoupons) {
        const coupon = await getOrCreateCoupon(couponData);
        results.coupons[couponData.id] = {
            id: coupon.id,
            name: coupon.name,
            percent_off: coupon.percent_off,
            duration: coupon.duration,
            duration_in_months: coupon.duration_in_months,
        };
    }

    // Print results
    console.log('\n=== Setup Complete ===');
    console.log(JSON.stringify(results, null, 2));

    // Write to JSON for codegen
    const outputPath = path.join(__dirname, 'stripe_setup_output.json');
    let existing = {};
    try {
        existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    } catch (e) {
        // file may not exist yet
    }
    const merged = { ...existing, ...results, _lastUpdated: new Date().toISOString() };
    fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
    console.log(`\nMerged results into ${outputPath}`);

    // Print the snippet to paste into billing.ts
    console.log('\n=== Paste into functions/src/handlers/billing.ts (ZAP_PACK_CATALOG) ===');
    console.log('taste:  { zaps: 15,   unitPriceCents: 199,  priceId: \'' + results.products.taste_test.priceId + '\', label: \'Taste Test\' },');
    console.log('mystic: { zaps: 2500, unitPriceCents: 9999, priceId: \'' + results.products.mystic_bulk.priceId + '\', label: \'Mystic Bulk\' },');
}

main().catch((err) => {
    console.error("Execution failed:", err);
    process.exit(1);
});
