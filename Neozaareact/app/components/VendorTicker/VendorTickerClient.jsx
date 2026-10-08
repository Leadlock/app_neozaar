'use client';
import dynamic from 'next/dynamic';

const VendorTicker = dynamic(() => import('./VendorTicker'), { ssr: false });

export default function VendorTickerClient() {
  return <VendorTicker />;
}
