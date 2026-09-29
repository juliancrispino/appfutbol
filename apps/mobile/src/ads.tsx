import { useEffect, useState } from 'react'
import { View } from 'react-native'
import mobileAds, { AdEventType, BannerAd, BannerAdSize, InterstitialAd } from 'react-native-google-mobile-ads'

const TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111'
const TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712'

let started = false

function ensureAds() {
  if (started) return
  started = true
  mobileAds()
    .initialize()
    .catch(() => {})
}

export function AdBanner() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureAds()
    setReady(true)
  }, [])

  if (!ready) return null
  return (
    <View>
      <BannerAd
        unitId={process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || TEST_BANNER}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  )
}

export function showMatchSavedAd() {
  try {
    ensureAds()
    const ad = InterstitialAd.createForAdRequest(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || TEST_INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
    })
    const loaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      loaded()
      failed()
      ad.show().catch(() => {})
    })
    const failed = ad.addAdEventListener(AdEventType.ERROR, () => {
      loaded()
      failed()
    })
    ad.load()
  } catch {
    // Guardar el partido no depende del anuncio.
  }
}
