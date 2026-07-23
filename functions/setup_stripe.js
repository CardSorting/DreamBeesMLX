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

const subscriptionProducts = [
  {
    id: 'prod_alchemist_pro',
    name: 'Alchemist Pro',
    description: 'Unlimited generations and turbo speed for daily creators.',
    amount: 2900, // $29.00
    recurring: { interval: 'month' },
    tier: 'pro'
  },
  {
    id: 'prod_architect_pro',
    name: 'Architect Pro',
    description: 'API access, commercial license, and dedicated GPU for teams at scale.',
    amount: 9900, // $99.00
    recurring: { interval: 'month' },
    tier: 'architect'
  }
];

const oneTimeProducts = [
  {
    id: 'prod_zaps_50',
    name: 'Starter Pack',
    description: '50 Zaps creative booster.',
    amount: 499, // $4.99
    zaps: 50
  },
  {
    id: 'prod_zaps_120',
    name: 'Pro Booster',
    description: '120 Zaps creative booster.',
    amount: 999, // $9.99
    zaps: 120
  },
  {
    id: 'prod_zaps_300',
    name: 'Studio Vault',
    description: '300 Zaps creative booster.',
    amount: 1999, // $19.99
    zaps: 300
  },
  {
    id: 'prod_zaps_900',
    name: 'Infinite Source',
    description: '900 Zaps creative booster.',
    amount: 4999, // $49.99
    zaps: 900
  }
];

async function getOrCreateProduct(productData) {
  try {
    const product = await stripe.products.retrieve(productData.id);
    console.log(`Product "${productData.name}" already exists (${product.id}).`);
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
  // Search for an existing price with this product and amount
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 10
  });

  const existingPrice = prices.data.find(p => 
    p.unit_amount === amount && 
    ((!recurring && !p.recurring) || (recurring && p.recurring && p.recurring.interval === recurring.interval))
  );

  if (existingPrice) {
    console.log(`Price for product ${productId} with amount ${amount} already exists (${existingPrice.id}).`);
    return existingPrice;
  }

  console.log(`Creating price for product ${productId} with amount ${amount}...`);
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

async function main() {
  console.log("Using Stripe Secret Key:", secretKey.substring(0, 12) + "...");
  
  const results = {
    subscriptions: {},
    payments: {}
  };

  // 1. Process Subscription Plans
  for (const prodData of subscriptionProducts) {
    const product = await getOrCreateProduct(prodData);
    const price = await getOrCreatePrice(product.id, prodData.amount, prodData.recurring);
    results.subscriptions[prodData.tier] = {
      productId: product.id,
      priceId: price.id,
      amount: prodData.amount
    };
  }

  // 2. Process One-Time Packs
  for (const prodData of oneTimeProducts) {
    const product = await getOrCreateProduct(prodData);
    const price = await getOrCreatePrice(product.id, prodData.amount, null);
    results.payments[prodData.zaps] = {
      productId: product.id,
      priceId: price.id,
      amount: prodData.amount
    };
  }

  console.log("\n--- Setup Complete! ---");
  console.log(JSON.stringify(results, null, 2));

  // Write results to JSON for verification and codegen
  fs.writeFileSync(path.join(__dirname, 'stripe_setup_output.json'), JSON.stringify(results, null, 2));
  console.log("Wrote mapping to functions/stripe_setup_output.json");
}

main().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
