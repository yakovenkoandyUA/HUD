export interface WayForPayConfig {
  merchantAccount: string
  merchantSecret: string
  merchantDomain: string
  returnUrl: string
  serviceUrl: string
}

export function getWayForPayConfig(): WayForPayConfig {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT
  const merchantSecret  = process.env.WAYFORPAY_MERCHANT_SECRET
  const merchantDomain  = process.env.WAYFORPAY_MERCHANT_DOMAIN
  const returnUrl       = process.env.WAYFORPAY_RETURN_URL
  const serviceUrl      = process.env.WAYFORPAY_SERVICE_URL

  const missing = [
    !merchantAccount && 'WAYFORPAY_MERCHANT_ACCOUNT',
    !merchantSecret  && 'WAYFORPAY_MERCHANT_SECRET',
    !merchantDomain  && 'WAYFORPAY_MERCHANT_DOMAIN',
    !returnUrl       && 'WAYFORPAY_RETURN_URL',
    !serviceUrl      && 'WAYFORPAY_SERVICE_URL',
  ].filter(Boolean)

  if (missing.length > 0) {
    throw new Error(`WayForPay config missing: ${missing.join(', ')}`)
  }

  return {
    merchantAccount: merchantAccount!,
    merchantSecret:  merchantSecret!,
    merchantDomain:  merchantDomain!,
    returnUrl:       returnUrl!,
    serviceUrl:      serviceUrl!,
  }
}
