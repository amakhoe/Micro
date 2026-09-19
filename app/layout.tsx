import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Bayete Microcrédito',
  description: 'Sistema de gestão de microcrédito focado em pequenos empreendedores locais com cadastro de clientes, análise de crédito, pagamentos e relatórios.',
  openGraph: {
    title: 'Bayete Microcrédito',
    description: 'Sistema de gestão de microcrédito focado em pequenos empreendedores locais com cadastro de clientes, análise de crédito, pagamentos e relatórios.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bayete Microcrédito',
    description: 'Sistema de gestão de microcrédito focado em pequenos empreendedores locais com cadastro de clientes, análise de crédito, pagamentos e relatórios.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
