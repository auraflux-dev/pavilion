/**
 * Apple / Google Wallet pass endpoint for the family Cove Digital Card.
 * Prefer Litecard (hosted signing + Square GAN barcode) when configured.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMemberSession } from '@/lib/auth-member'
import { coveDigitalCardScanPayload, ensureCoveFamilyCode } from '@/lib/cove-family-code'
import { listFamilyStudents, resolveFamilyGiftCard } from '@/lib/family-store-card'
import { getGiftCardBalance } from '@/lib/square'
import {
  appleWalletConfigured,
  buildCoveApplePass,
  buildCoveGoogleWalletUrl,
  googleWalletConfigured,
} from '@/lib/wallet/cove-pass'
import { ensureCoveLitecardPass, litecardConfigured } from '@/lib/wallet/litecard'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getMemberSession(req)
  if (!session?.email) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const platform = String(body.platform ?? 'auto').toLowerCase()
    const requested = String(body.code ?? '').replace(/\D/g, '')

    const { requireCoveUnlocked } = await import('@/lib/onboarding-checklist')
    const gate = await requireCoveUnlocked(session.email)
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.error, code: 'ONBOARDING_INCOMPLETE' },
        { status: 403 },
      )
    }

    const code = await ensureCoveFamilyCode(session.email)
    if (requested && requested !== code) {
      return NextResponse.json(
        { error: 'Code does not match your Cove Digital Card.' },
        { status: 400 },
      )
    }

    const family = await listFamilyStudents(session.email)
    const card = resolveFamilyGiftCard(family)
    let balance = card.balance
    if (card.gan) {
      try {
        balance = await getGiftCardBalance(card.gan)
      } catch {
        // keep CMS balance
      }
    }
    const payload = coveDigitalCardScanPayload({ gan: card.gan, coveFamilyCode: code })
    if (!payload || !card.gan) {
      return NextResponse.json(
        {
          error:
            'Load the Cove Digital Card first so a Square gift card number exists for Wallet / Stand.',
        },
        { status: 409 },
      )
    }

    // ── Litecard (preferred): they hold Apple/Google signing; barcode = Square GAN
    if (litecardConfigured()) {
      try {
        const primary = family[0]
        const links = await ensureCoveLitecardPass({
          parentEmail: session.email,
          gan: card.gan,
          balanceDollars: balance,
          firstName: primary?.firstName,
          lastName: primary?.lastName,
        })
        const preferGoogle = platform === 'google'
        const preferApple = platform === 'apple'
        let openUrl = links.welcomeUrl
        if (preferApple && links.appleLink) openUrl = links.appleLink
        else if (preferGoogle && links.googleLink) openUrl = links.googleLink
        else if (links.welcomeUrl) openUrl = links.welcomeUrl
        else if (links.appleLink) openUrl = links.appleLink
        else if (links.googleLink) openUrl = links.googleLink

        return NextResponse.json({
          ok: true,
          provider: 'litecard',
          code,
          payload,
          balance,
          litecard: {
            cardId: links.cardId,
            downloadId: links.downloadId,
            welcomeUrl: links.welcomeUrl,
            appleLink: links.appleLink,
            googleLink: links.googleLink,
          },
          walletUrl: openUrl,
          googleWalletUrl: links.googleLink || undefined,
          appleWalletUrl: links.appleLink || undefined,
        })
      } catch (err) {
        console.error('Litecard pass failed', err)
        // Fall through to DIY / Photos QR
      }
    }

    const wantApple =
      platform === 'apple' || (platform === 'auto' && appleWalletConfigured())
    const wantGoogle =
      platform === 'google' ||
      (platform === 'auto' && !wantApple && googleWalletConfigured())

    if (wantApple && appleWalletConfigured()) {
      try {
        const buf = await buildCoveApplePass({
          code,
          payload,
          parentEmail: session.email,
          balance,
        })
        return new NextResponse(new Uint8Array(buf), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.apple.pkpass',
            'Content-Disposition': `attachment; filename="shms-cove-${code}.pkpass"`,
            'Cache-Control': 'no-store',
          },
        })
      } catch (err) {
        console.error('Apple Wallet pass build failed', err)
        return NextResponse.json(
          {
            error: err instanceof Error ? err.message : 'Apple Wallet pass failed',
            hint: 'Check APPLE_WALLET_* certs in Vercel. You can still Save the QR to Photos.',
            code,
            payload,
            appleConfigured: true,
          },
          { status: 500 },
        )
      }
    }

    if (wantGoogle && googleWalletConfigured()) {
      try {
        const googleWalletUrl = await buildCoveGoogleWalletUrl({
          code,
          payload,
          parentEmail: session.email,
          balance,
        })
        return NextResponse.json({
          ok: true,
          code,
          payload,
          googleWalletUrl,
          balance,
        })
      } catch (err) {
        console.error('Google Wallet URL failed', err)
        return NextResponse.json(
          {
            error: err instanceof Error ? err.message : 'Google Wallet failed',
            hint: 'Check GOOGLE_WALLET_* env in Vercel. You can still Save the QR to Photos.',
            code,
            payload,
            googleConfigured: true,
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      ok: true,
      code,
      payload,
      balance,
      litecardConfigured: litecardConfigured(),
      appleConfigured: appleWalletConfigured(),
      googleConfigured: googleWalletConfigured(),
      hint: litecardConfigured()
        ? 'Litecard is configured but pass create failed — Save QR to Photos works at Square Stand.'
        : 'Add Litecard credentials (LITECARD_*) in Vercel for native Wallet. Until then, Save the QR to Photos — Square Stand scans the GAN.',
    })
  } catch (err) {
    console.error('/api/gift-card/wallet-pass', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Wallet pass unavailable' },
      { status: 500 },
    )
  }
}
