import { authFetch } from './api'

const API = (import.meta.env.VITE_API_URL as string | undefined ?? '').trim()

export type BillingInterval = 'month' | 'year'
export type PaidPlanId      = 'personal' | 'couple' | 'family'
export type BillingOrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'expired'

export interface CheckoutResponse {
  orderReference: string
  provider: 'wayforpay'
  payment: {
    type: 'wayforpay_hosted_form'
    actionUrl: string
    fields: Record<string, string | number | string[] | number[]>
  }
}

export interface BillingOrderStatusResponse {
  orderReference: string
  status:         BillingOrderStatus
  planId:         string
  interval:       BillingInterval
  amount:         number
  currency:       string
  expiresAt:      string
  paidAt:         string | null
}

export async function createBillingCheckout(
  planId: PaidPlanId,
  interval: BillingInterval,
): Promise<CheckoutResponse> {
  const res = await authFetch(`${API}/api/billing/checkout`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ planId, interval }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `Checkout failed (${res.status})`)
  }
  return res.json() as Promise<CheckoutResponse>
}

export async function getBillingOrderStatus(
  orderReference: string,
): Promise<BillingOrderStatusResponse> {
  const res = await authFetch(`${API}/api/billing/order/${encodeURIComponent(orderReference)}/status`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `Status fetch failed (${res.status})`)
  }
  return res.json() as Promise<BillingOrderStatusResponse>
}

/**
 * Dynamically creates a hidden HTML form and submits it to WayForPay hosted page.
 * All field values come from the backend-signed payload — never recalculated on frontend.
 */
export function submitWayForPayForm(
  actionUrl: string,
  fields: Record<string, string | number | string[] | number[]>,
): void {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = actionUrl
  form.style.display = 'none'

  for (const [key, value] of Object.entries(fields)) {
    // WayForPay expects array fields as repeated inputs with the same name (e.g. productName[])
    const values = Array.isArray(value) ? value : [value]
    for (const v of values) {
      const input = document.createElement('input')
      input.type  = 'hidden'
      input.name  = key
      input.value = String(v)
      form.appendChild(input)
    }
  }

  document.body.appendChild(form)
  form.submit()
}
