import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next 16 blocks dev-asset requests from hosts it does not recognise, which
  // stops the client bundle loading (and therefore all hydration) when the app
  // is opened on 127.0.0.1 or over the LAN rather than on `localhost`.
  // Development only — it has no effect on a production build.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.0.9'],
}

export default nextConfig
