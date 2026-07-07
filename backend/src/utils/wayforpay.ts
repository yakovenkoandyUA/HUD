import { createHmac, timingSafeEqual } from 'crypto'
import type { IBillingOrder } from '../models/BillingOrder'
import type { IUser } from '../models/User'
import type { WayForPayConfig } from '../config/wayforpay'
import type { PaidPlanId, BillingInterval } from '../config/pricing'

const WAYFORPAY_ACTION_URL = 'https://secure.wayforpay.com/pay'

const PRODUCT_NAMES: Record<PaidPlanId, Record<BillingInterval, string>> = {
  personal: {
    month: 'MIMIR Personal Memory — 1 month',
    year:  'MIMIR Personal Memory — 1 year',
  },
  couple: {
    month: 'MIMIR Shared Life — 1 month',
    year:  'MIMIR Shared Life — 1 year',
  },
  family: {
    month: 'MIMIR Family Chronicle — 1 month',
    year:  'MIMIR Family Chronicle — 1 year',
  },
}

export interface WayForPayCheckoutPayload {
  merchantAccount:    string
  merchantDomainName: string
  orderReference:     string
  orderDate:          number
  amount:             number
  currency:           'UAH'
  productName:        string[]
  productPrice:       number[]
  productCount:       number[]
  returnUrl:          string
  serviceUrl:         string
  merchantSignature:  string
}

/**
 * Converts kopecks to UAH with up to 2 decimal places (no trailing zeros).
 * WayForPay expects decimal UAH, not integer kopecks.
 */
function kopecksToUah(kopecks: number): number {
  return Math.round(kopecks) / 100
}

/**
 * Computes HMAC-MD5 signature over the semicolon-joined signature string.
 * Field order must match WayForPay docs exactly.
 */
export function signWayForPayRequest(
  fields: string[],
  merchantSecret: string,
): string {
  const message = fields.join(';')
  return createHmac('md5', merchantSecret).update(message).digest('hex')
}

/**
 * Builds a signed WayForPay hosted payment payload for a pending BillingOrder.
 * Amount is taken from the BillingOrder (backend-authoritative), never from frontend.
 */
export function buildWayForPayCheckoutPayload(
  order: IBillingOrder,
  _user: IUser,
  config: WayForPayConfig,
): { actionUrl: string; fields: WayForPayCheckoutPayload } {
  const orderDate   = Math.floor(Date.now() / 1000)
  const amountUah   = kopecksToUah(order.amount)
  const productName = PRODUCT_NAMES[order.planId][order.interval]
  const returnUrl   = `${config.returnUrl}?orderReference=${order.orderReference}`
  const serviceUrl  = config.serviceUrl

  // Signature field order per WayForPay docs:
  // merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;productName[0];productCount[0];productPrice[0]
  const signatureFields = [
    config.merchantAccount,
    config.merchantDomain,
    order.orderReference,
    String(orderDate),
    String(amountUah),
    order.currency,
    productName,
    '1',
    String(amountUah),
  ]

  const merchantSignature = signWayForPayRequest(signatureFields, config.merchantSecret)

  const fields: WayForPayCheckoutPayload = {
    merchantAccount:    config.merchantAccount,
    merchantDomainName: config.merchantDomain,
    orderReference:     order.orderReference,
    orderDate,
    amount:             amountUah,
    currency:           'UAH',
    productName:        [productName],
    productPrice:       [amountUah],
    productCount:       [1],
    returnUrl,
    serviceUrl,
    merchantSignature,
  }

  return { actionUrl: WAYFORPAY_ACTION_URL, fields }
}

// ── Callback verification ─────────────────────────────────────────────────────

export interface WayForPayCallbackPayload {
  merchantAccount:    string
  orderReference:     string
  merchantSignature:  string
  amount:             number      // UAH decimal, e.g. 149
  currency:           string
  authCode:           string
  cardPan:            string
  transactionStatus:  string      // 'Approved' | 'Declined' | 'Expired' | 'Refunded' | 'Voided' | 'InProcessing' | 'WaitingAuthComplete'
  reasonCode:         number
  reason:             string
  createdDate:        number      // Unix timestamp
  processingDate:     number      // Unix timestamp
  cardType?:          string
  issuerBankCountry?: string
  issuerBankName?:    string
  fee?:               number
  paymentSystem?:     string
  [key: string]:      unknown
}

/**
 * Verifies WayForPay callback signature using constant-time comparison.
 * Signature fields order per WayForPay docs:
 * merchantAccount;orderReference;amount;currency;authCode;cardPan;transactionStatus;reasonCode
 */
export function verifyWayForPayCallback(
  payload: WayForPayCallbackPayload,
  merchantSecret: string,
): boolean {
  const signatureFields = [
    payload.merchantAccount,
    payload.orderReference,
    String(payload.amount),
    payload.currency,
    payload.authCode   ?? '',
    payload.cardPan    ?? '',
    payload.transactionStatus,
    String(payload.reasonCode ?? ''),
  ]
  const expected = signWayForPayRequest(signatureFields, merchantSecret)
  const provided  = payload.merchantSignature ?? ''

  // timingSafeEqual requires same-length buffers
  if (expected.length !== provided.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
}

export interface WayForPayAcceptResponse {
  orderReference: string
  status:         'accept'
  time:           number
  signature:      string
}

/**
 * Builds the signed accept response that WayForPay requires after a processed callback.
 * Without this response WayForPay will retry the callback for up to 4 days.
 * Signature fields: merchantAccount;orderReference;status;time
 */
export function buildWayForPayAcceptResponse(
  orderReference: string,
  merchantAccount: string,
  merchantSecret:  string,
): WayForPayAcceptResponse {
  const time      = Math.floor(Date.now() / 1000)
  const status    = 'accept' as const
  const signature = signWayForPayRequest(
    [merchantAccount, orderReference, status, String(time)],
    merchantSecret,
  )
  return { orderReference, status, time, signature }
}
