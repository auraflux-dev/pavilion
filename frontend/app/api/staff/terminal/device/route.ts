/**
 * GET  /api/staff/terminal/device. Paired device + active pairing code
 * POST /api/staff/terminal/device. { action: 'pair' } create device code
 *      { action: 'refresh', deviceCodeId? } poll pairing; save deviceId when PAIRED
 *      { action: 'clear' } forget saved device
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  createTerminalDeviceCode,
  getTerminalDeviceCode,
} from '@/lib/square-terminal'
import {
  getSavedTerminalDeviceCodeId,
  getSavedTerminalDeviceId,
  saveTerminalDeviceCodeId,
  saveTerminalDeviceId,
} from '@/lib/staff/terminal-sales'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { upsertSiteSetting } from '@/lib/staff/cms-catalog'

export const dynamic = 'force-dynamic'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['retail', 'admin'])) return null
  return session
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const deviceId = await getSavedTerminalDeviceId()
    const deviceCodeId = await getSavedTerminalDeviceCodeId()
    let pairing: Awaited<ReturnType<typeof getTerminalDeviceCode>> = null
    if (deviceCodeId) {
      pairing = await getTerminalDeviceCode(deviceCodeId)
      if (pairing?.status === 'PAIRED' && pairing.deviceId) {
        await saveTerminalDeviceId(pairing.deviceId)
      }
    }
    return NextResponse.json({
      ok: true,
      deviceId: pairing?.deviceId || deviceId || null,
      paired: Boolean(pairing?.deviceId || deviceId),
      pairing: pairing
        ? {
            id: pairing.id,
            code: pairing.code,
            status: pairing.status,
            deviceId: pairing.deviceId,
            pairBy: pairing.pairBy,
            name: pairing.name,
          }
        : null,
      hint: 'On the Square Terminal: More → Settings → Device → change mode / Sign in with code, then enter the pairing code.',
    })
  } catch (err) {
    console.error('terminal device GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load Terminal device' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? 'pair').trim()

    if (action === 'clear') {
      await upsertSiteSetting('squareTerminalDeviceId', '')
      await upsertSiteSetting('squareTerminalDeviceCodeId', '')
      return NextResponse.json({ ok: true, deviceId: null, paired: false })
    }

    if (action === 'refresh') {
      const deviceCodeId =
        String(body.deviceCodeId ?? '').trim() || (await getSavedTerminalDeviceCodeId())
      if (!deviceCodeId) {
        return NextResponse.json({ error: 'No pairing code to refresh' }, { status: 400 })
      }
      const pairing = await getTerminalDeviceCode(deviceCodeId)
      if (!pairing) return NextResponse.json({ error: 'Pairing code not found' }, { status: 404 })
      if (pairing.status === 'PAIRED' && pairing.deviceId) {
        await saveTerminalDeviceId(pairing.deviceId)
        await saveTerminalDeviceCodeId(pairing.id)
      }
      return NextResponse.json({
        ok: true,
        paired: pairing.status === 'PAIRED' && Boolean(pairing.deviceId),
        deviceId: pairing.deviceId,
        pairing,
      })
    }

    // pair (default)
    const pairing = await createTerminalDeviceCode('SHMS In-person sales')
    await saveTerminalDeviceCodeId(pairing.id)
    return NextResponse.json({
      ok: true,
      paired: false,
      deviceId: null,
      pairing,
      instructions: [
        'On the Square Terminal open Settings → Device code / Change mode for Terminal API.',
        `Enter code ${pairing.code}`,
        'Return here and tap Refresh pairing. Then Charge on Terminal will send the amount to the device.',
      ],
    })
  } catch (err) {
    console.error('terminal device POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terminal pairing failed' },
      { status: 500 },
    )
  }
}
