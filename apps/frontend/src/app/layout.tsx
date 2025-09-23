import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FundifyHub",
  description: "Finance Application Monorepo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}