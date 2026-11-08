import Stripe from 'stripe'
import { env, stripeEnabled } from '../config/env.js'

/** Cliente de Stripe (null si STRIPE_SECRET_KEY no está configurada). */
export const stripe = stripeEnabled ? new Stripe(env.stripe.secretKey) : null
