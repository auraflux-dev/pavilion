'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className="relative flex items-center justify-center px-4 py-2.5 text-white text-sm font-medium"
      style={{ backgroundColor: '#085508' }}
      role="banner"
    >
      <p className="text-center pr-8 leading-relaxed">
        Join your WhatsApp parent group:{' '}
        <a href="https://u345601.ct.sendgrid.net/ls/click?upn=u001.paU4U0F-2BFgHrcb1wbOPv-2FQDw500ISwfc41VAhCV2pOf0s7LU7CzjHHgxf1piscT03VfAGMtJUKorJQLvubICcbImVM6FobAuJAkkIsjbxw7wHf914EK5vqRprpKrvBevGlPnNTq53DPP-2FB5-2FnFytolE8QGU24GCqUVJF6IGPEYyrwrOWusSxxJH7RnR-2F1TAOyc3BiQACuoZ8G50wL-2FjNKABdS6HrwzKeBBRtt5gjhm9byBTwvuwaLRDZi6lhVunogxEPkBsxYwHA7qm5lMCopZuc-2BYPFbiVrefsTtHSQYvpFQRhkqKlvFwdtW42eHVExkTFQSWY1OnGWDIuT5jCskr3J7sZYmxdwf71sA0UXQauD3V1KIa3EUkPmAUwwyUOh0Fev1t-2BGb5op7BLf4F2AACQyX0lGTPMyB-2BiBatmBEHVxE8IjwMq1oYyoDADrAEdYavKy7uNczRMW7k2-2FNDdWXxhq6OTLWUJ-2BkTOLD4nnLVGBDThCroBr8Ae98p-2F-2FDyIEUn9S7wkeGwMCd24nXig4t8fWVdQxDiUDYDQp6R2B3I5qiRHrjI9Ne7JBNmS8m8ZpssC-2Bvrpl4Yg3KvFPLmXQqOT4fH7GtPamNNKVXBjFAZE-3DzJJ2_cFjCzFrpjdiMerga4PMoxINvpmfSA8EbsXEwqV5PS70iw6qIiXDYoWAl6KAYB4G2Q2Qn6U-2FSZINFWvmLovgUDzzznyp5WPSE8vfHwxR9W0jK5pIQpddgvWDncpISgZFlDROjcsjPUkaJxCcgZy-2FBREcHISDN6eriL-2BRQjGrb2-2Bwk7m1CbaiHvhvlXd4k52vMLxl3XZwJkPo-2BxB1xrMfofeZCOO5K07LH-2FTJriIQaT6s1lbiKBe5-2BTTfYAZFFaHXLSsXxABRqxtcYgruHb0bZkeMKBh33tgoyI5usWtsgRB0-3D" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:opacity-80">6th Grade</a>
        <span className="mx-1.5 opacity-40">·</span>
        <a href="https://u345601.ct.sendgrid.net/ls/click?upn=u001.paU4U0F-2BFgHrcb1wbOPv-2FQDw500ISwfc41VAhCV2pOf0s7LU7CzjHHgxf1piscT03VfAGMtJUKorJQLvubICcbImVM6FobAuJAkkIsjbxw5P4288h-2B10Rv9QtaoiU92hDPWA5ycVlMbSfpirBadG-2F-2FjyvDho1CN7bGx8Ow2SMuaOBs9Y71ypFQUMkzdqyBLBLSPzEiHZng2tUN2xBKyA2s-2F-2BH56vh2M72dxBwbOJIAQvdcOGs1afGPDJtql80G6GCirdA4L5MgDCNFn3sNZuSmFggPWuUSgYsPYaR33bIIPe-2Bmhfvg-2Fyn1vf-2FaFltzpuZn3-2Bcxxf5O9ulIL8B-2B6D8esriE93p4ab1HZkB9IWokL7fnhPqaCUGKd0qnxlAu9S0TPtaznNxH5pMSrkexPdyaS-2F34a-2BiRfPbp7DfuGbvbSYqTcsv2z-2BoHrF0YAXuT-2FrT0gUznIpfipbp0cW9jaaHuiKsrUitY1GnKZvNCofA-2F5U9TUmfhVtAtYtDWticm0gARd8Bo2Fc50LOC-2FeiH-2FZgS3qoQtxhtDoAzNLbmuZP7YKS9SdzcUttY9zO3dRjMt8uryWVDu-2BaQaLiy1RvTf0RoX2L3PyZgqAvk1YS2FLjUk-3Da9Lq_cFjCzFrpjdiMerga4PMoxINvpmfSA8EbsXEwqV5PS70iw6qIiXDYoWAl6KAYB4G2Q2Qn6U-2FSZINFWvmLovgUDzzznyp5WPSE8vfHwxR9W0jK5pIQpddgvWDncpISgZFlDROjcsjPUkaJxCcgZy-2FBREcHISDN6eriL-2BRQjGrb2-2BzaLmUwnlCdkUFBd7hJyxo8BMlE1SpmkJpVOf7X5K7OPnlceWcAW6mCE7BlfBoMDKVPycByxG6OFbT4P-2BWfLO250yzzdwqFes6VBI-2B1kI7kdhtpANDszMBmjHOwVD9MK80-3D" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:opacity-80">7th Grade</a>
        <span className="mx-1.5 opacity-40">·</span>
        <a href="https://u345601.ct.sendgrid.net/ls/click?upn=u001.paU4U0F-2BFgHrcb1wbOPv-2FQDw500ISwfc41VAhCV2pOf0s7LU7CzjHHgxf1piscT03VfAGMtJUKorJQLvubICcbImVM6FobAuJAkkIsjbxw54VCIy3PABIW0WZyYSzMX-2BVqOBZq1pudOdsclmMfREFj0A12mlo5rPxbCVauGhkRjeOTlCGm8NNGh4Vho85PeIBS6LGb9rUZq7Dh94-2BfWjYORvtZBOB3EZ1Y0G0YU0bhbl61bm4xITxoHQZR2TSbieHMsq01w6h-2BcyJ2uOUcjUR-2FQAgb5G-2BLyaJg7DkblRNzixU4cURpCta9NC-2FBZvUkihHd38zNs6ZDAHF4sI0AMKyVzLn-2F3YB4jxjUaSaKQL-2FsN62xJxpSPEsWI7HX63-2BRWSWEXTACBG-2Fd8jcRhCFzqlGQklNcHJokq-2F-2FepjNJQVft8TBzaIcVKNMP9Y4tH7Tlq9oL9JjKyjObqhmQeJgtHxVtmo0aFFB-2FgXWPafTk7I1MYv9GDg17BrBupb-2FY9Xni48K5WhXdbA396ReAmaIHc5JjBzJ4NKomkpjLHaN-2B1pnyn4U1ZJq-2BHoEvci8k4N-2Bti8HBWa-2BcKN-2Bg0eJt-2BgjdlH3auNEd7scV-2FlY3rX-2FYg7RDU-3Dvk0y_cFjCzFrpjdiMerga4PMoxINvpmfSA8EbsXEwqV5PS70iw6qIiXDYoWAl6KAYB4G2Q2Qn6U-2FSZINFWvmLovgUDzzznyp5WPSE8vfHwxR9W0jK5pIQpddgvWDncpISgZFlDROjcsjPUkaJxCcgZy-2FBREcHISDN6eriL-2BRQjGrb2-2BwNxsbeSquOdFYpUi7QMfglGKnOW-2BudiJ6Sam7tsj5k-2BudjxT9Vurw8U1LSiIjoGSnb1-2FlYD5NpZis-2FhsH4gAdPNMJ7ZrGl22S4FNVveSoLEsHSnb9H1vp0a29rxW0koSU-3D" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:opacity-80">8th Grade</a>
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
