import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { Analytics } from '@vercel/analytics/next'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#020617" />
        <title>NeoLove – Assistant Relationnel</title>
        <meta name="description" content="Votre assistant intelligent pour des conversations qui marquent." />
      </Head>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}

