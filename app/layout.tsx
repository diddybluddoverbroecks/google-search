import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Google',
  description: 'Google Search & Chat App',
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
