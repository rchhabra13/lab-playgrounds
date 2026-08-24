import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Inference Lab · vLLM',description:'A local workspace for model experiments.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
