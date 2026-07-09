import dns from 'dns'

// ── Disposable / throwaway email domains ──────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  // Guerrilla Mail family
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.de',
  'guerrillamail.info', 'guerrillamail.biz', 'guerrillamailblock.com',
  'grr.la', 'sharklasers.com', 'spam4.me',

  // Mailinator family
  'mailinator.com', 'mailinator2.com', 'mailinator.net', 'maildrop.cc',
  'mailnull.com', 'mailnesia.com', 'mailscrap.com', 'mail4trash.com',
  'maileater.com', 'mail-temporaire.fr',

  // Temp Mail / 10 Minute Mail family
  'temp-mail.org', 'tempmail.com', 'tempr.email', 'tempemail.com', 'tempe-mail.com',
  'tempemail.co.za', 'temporarymail.com', 'throwaway.email', 'throwam.com',
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemail.de',
  '10minutemail.co.uk', '10minutemail.us', '10minutemail.be', '10minutemail.cf',
  '10minutemail.ga', '10minutemail.gq', '10minutemail.ml', '10minutemail.tk',
  '20minutemail.com', '20minutemail.it',

  // Trash Mail family
  'trashmail.at', 'trashmail.com', 'trashmail.io', 'trashmail.me',
  'trashmail.net', 'trashmail.org', 'trashmail.xyz',
  'trashdevil.com', 'trashdevil.de',
  'mytrashmail.com', 'crapmail.org',

  // Yopmail
  'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
  'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf',

  // Discard / Dispostable
  'discard.email', 'discardmail.com', 'discardmail.de',
  'dispostable.com',

  // Spam* family
  'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'spamfree24.org', 'spamfree.eu', 'spamhereplease.com',
  'spamthisplease.com', 'spamavert.com', 'spamoff.de',
  'spamgoe.com', 'spamhole.com', 'spambox.us', 'spambox.org',
  'spambob.com', 'spamdog.com', 'spamify.com', 'spam4.me',
  'spam.la', 'spam.su', 'spamobox.com', 'spamstack.net',
  'putthisinyourspamdatabase.com',

  // Fake / Hide mail
  'fakeinbox.com', 'fakeinbox.net', 'fakemail.net',
  'hidemail.de', 'hidemail.us',
  'proxymail.eu', 'rcpt.at',

  // Jetable family
  'jetable.net', 'jetable.org', 'jetable.pp.ua',

  // Getonemail / Getnada
  'getonemail.com', 'getnada.com', 'getnada.net',

  // Mohmal / Mailexpire
  'mohmal.com', 'mailexpire.com', 'mailzilla.com',
  'mailnew.com',

  // Misc popular ones
  'bugmenot.com', 'binkmail.com', 'bobmail.info',
  'notsharingmy.info', 'fuxwithme.com',
  'rmqkr.net', 'drdrb.net', 'soodonims.com',
  'opsins.com', 'junk1.club', 'dakode.com',
  'spamevader.com', 'filzmail.com',

  // Inboxbear / Owlymail / Luxusmail
  'inboxbear.com', 'owlymail.com', 'luxusmail.org',

  // Emailondeck
  'emailondeck.com',

  // Cock.li (common throwaway)
  'cock.li', 'airmail.cc', 'waifu.club', 'hitler.rocks',
  'yandere.club', 'cum.sb', 'horsefucker.org',

  // Others
  'dodgit.com', 'spamevader.com', 'spamgoe.com',
  'e4ward.com', 'meltmail.com', 'thankyou2010.com',
  'throwam.com', 'kurzepost.de', 'objectmail.com',
  'ownmail.net', 'petml.com', 'postthis.to',
  'reconmail.com', 'sandelf.de', 'schafmail.de',
  'skeefmail.com', 'slopsbox.com', 'slushmail.com',
  'smashmail.de', 'smwg.info', 'sofimail.com',
  'sogetthis.com', 'soodonims.com', 'stop-my-spam.com',
  'supergreatmail.com', 'suremail.info', 'sweetxxx.de',
  'tafmail.com', 'tagyourself.com', 'tefl.ro', 'tele2.nl',
  'teleworm.com', 'teleworm.us', 'tempalias.com',
  'tempinbox.co.uk', 'tempinbox.com', 'tempsky.com',
  'thaiphoon.com', 'thecloudindex.com', 'thismail.net',
  'throwam.com', 'tmail.com', 'tmailinator.com',
  'toiea.com', 'tradermail.info', 'trash2009.com',
  'trash2010.com', 'trashcanmail.com', 'trashmail.at',
  'trillianpro.com', 'turual.com', 'twinmail.de',
  'tyldd.com', 'uggsrock.com', 'uroid.com',
  'venompen.com', 'wam.co.za', 'webemail.me',
  'webm4il.info', 'weg-werf-email.de', 'wegwerf-emails.de',
  'wegwerfadresse.de', 'wegwerfemail.de', 'wegwerfemail.net',
  'wegwerfemail.org', 'wetrainbayarea.com', 'wilemail.com',
  'willselfdestruct.com', 'winemaven.info', 'wronghead.com',
  'wuzupmail.net', 'www.e4ward.com', 'xagloo.com',
  'xemaps.com', 'xents.com', 'xmaily.com', 'xoxy.net',
  'xyzfree.net', 'yapped.net', 'yeah.net',
  'yep.it', 'yogamaven.com', 'yopmail.gq',
  'yourdomain.com', 'yuurok.com', 'z1p.biz',
  'za.com', 'zippymail.info', 'zoaxe.com',
  'zoemail.net', 'zoemail.org', 'zomg.info',

  // Ukrainian-specific fake domains
  'ukrlist.com',
])

// ── MX record check ───────────────────────────────────────────────────────────

export async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const records = await Promise.race([
      dns.promises.resolveMx(domain),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 4000)),
    ])
    // timeout → null → allow (don't block on DNS slowness)
    if (records === null) return true
    return records.length > 0
  } catch {
    // ENODATA / ENOTFOUND → domain has no MX → reject
    // Other DNS errors → allow (don't block on infrastructure issues)
    return false
  }
}

// ── Combined validator ────────────────────────────────────────────────────────

export async function validateEmailDomain(email: string): Promise<string | null> {
  const domain = email.toLowerCase().split('@')[1]
  if (!domain) return 'Невалідний email'

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return 'Одноразові поштові адреси не підтримуються'
  }

  const mx = await hasMxRecord(domain)
  if (!mx) return 'Цей email домен не приймає пошту — перевірте адресу'

  return null
}
